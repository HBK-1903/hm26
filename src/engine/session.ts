// HM26 Maç Motoru §6.2 — Canlı maç oturumu (dakika-dakika stepper)
// Aynı motor çekirdeğiyle çalışır; her adımda UI'a olay paketleri döner.
// Kullanıcı bu oturuma Sub/Taktik komutları bırakabilir (§11).

import { LineupSlot, tickFatigue, isActiveOnPitch, resolveKeeper } from './profiles';
import { PossessionContext, pickSlot, resolvePossessionOwner, resolveStartZone, runPossession } from './possession';
import { narrate, shotVisualCue } from './narrate';
import { aiDefaultTactic, chooseAiTacticDecision } from './tactics';
import type { MatchInput, MatchResult, MatchStateEvent, MatchStats, Weather, EngineShot } from './engine';
import { buildInsights } from './insights';
import { autoLineup, teamProfile, TeamMatchProfile } from './profiles';
import { Player, TacticPlan } from '../types';
import { ZoneId, ZONE_XY } from './zones';
import { goalLineClearanceCandidate } from './pitch-ai';
import { MatchCommandLog } from './core/commandLog';
import { EventLog } from './core/eventLog';
import { assertMatchStatInvariants, reduceMatchEvents } from './core/statReducer';
import type { MatchCommand } from './core/input';
import type { AiDecisionTrace, CoreMatchEvent, MatchSide, ShotOutcome, ShotType } from './core/types';
import { makeShotProbabilities, sampleShotOutcome, type ShotProbabilitySet } from './core/shotModel';
import { assignReferee, refereeCardProbability, refereePenaltyProbability, type RefereeProfile } from './referee';
import { selectSetPieceTaker, type SetPieceRole } from './setPieces';

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


export interface LiveBallState { x: number; y: number; z: number; zone: ZoneId; owner: 'home' | 'away'; ownerId: string | null; activeIds: string[]; path: ZoneId[] }
export type TouchlineCommand = 'pump' | 'cool';
export type TeamTalkChoice = 'fight' | 'calm' | 'quiet';
export interface TouchlineState { pumpCooldown: number; coolCooldown: number; pumpRemaining: number; coolRemaining: number; pumpActive: boolean; coolActive: boolean; protestCooldown: number; protestAvailable: boolean }
interface PlayerClock { playedSeconds: number; activeSinceSecond: number | null; fitnessCurrent: number }

export class MatchSession {
  private input: MatchInput;
  private readonly matchId: string;
  private readonly commandLog: MatchCommandLog;
  private readonly coreEventLog: EventLog;
  private readonly referee: RefereeProfile;
  private shotSequence = 0;
  private stepCount = 0;
  private rng: () => number;
  private goalPaceMul: number;
  private jitter: number;
  private weather: Weather;
  private homeLine: { slots: LineupSlot[]; bench: Player[] };
  private awayLine: { slots: LineupSlot[]; bench: Player[] };
  private homeTactic: TacticPlan;
  private awayTactic: TacticPlan;
  private homeProf: TeamMatchProfile;
  private awayProf: TeamMatchProfile;
  private stats: MatchStats;
  private events: MatchStateEvent[] = [];
  private injuries: { playerId: string; days: number }[] = [];
  private injuryReturnAt = new Map<string, number>();
  private playerClocks = new Map<string, PlayerClock>();
  private shotsLog: EngineShot[] = []; // Dalga 2 (§5-D şut haritası)
  private suspensions: { playerId: string; matches: number }[] = [];
  private teamTalkChoice: Record<'home' | 'away', TeamTalkChoice | null> = { home: null, away: null };
  private teamTalkUsed: Record<'home' | 'away', boolean> = { home: false, away: false };
  private minute = 0;
  private clockSec = 0;
  private endMinute: number;
  private subs = { home: 5, away: 5 };
  private subWindows = { home: 3, away: 3 };               // Dalga 5 (IFAB): takım başına 3 durak; 45. dk serbest
  private htReached = false;
  private htWindowOpen = false;
  private riskIds: Set<string> = new Set();
  private protestWindowUntil = { home: -1, away: -1 };
  private lastProtestMinute = { home: -99, away: -99 };
  private protestBoostUntil = { home: -1, away: -1 };
  private shoutAvailableAt = { home: { pump: 0, cool: 0 }, away: { pump: 0, cool: 0 } };
  private shoutActiveUntil = { home: { pump: -1, cool: -1 }, away: { pump: -1, cool: -1 } };
  private momentumHistory: { minute: number; owner: 'home' | 'away'; pressWin: 'home' | 'away' | null; shot: boolean; xg: number }[] = [];
  private ballZone: ZoneId = 'C-M';
  private ballOwner: 'home' | 'away' = 'home';
  private ballOwnerId: string | null = null;
  private ballHeight = 0;
  private ballPath: ZoneId[] = ['C-M'];
  private ballActorIds: string[] = [];
  private lastSubMinute = { home: -1, away: -1 };
  private pendingSubs: Partial<Record<'home' | 'away', { outId: string; inId: string; halfTime: boolean }[]>> = {};
  private pendingTactics: Partial<Record<'home' | 'away', TacticPlan>> = {};
  private aiTacticDecisionBand: Record<'home' | 'away', number> = { home: 0, away: 0 };
  private aiDecisionTraces: AiDecisionTrace[] = [];
  done = false;

  constructor(input: MatchInput) {
    this.input = input;
    this.matchId = `legacy-${input.homeClub.id}-${input.awayClub.id}-${input.seed >>> 0}`;
    this.commandLog = new MatchCommandLog(this.matchId);
    this.coreEventLog = new EventLog(this.matchId);
    this.referee = assignReferee(input.seed);
    this.coreEventLog.append({ type: 'KICK_OFF', side: 'home', second: 0, minute: 0 });
    this.coreEventLog.append({ type: 'REFEREE_ASSIGNED', refereeId: this.referee.id, strictness: this.referee.strictness, second: 0, minute: 0 });
    this.rng = mulberry32(input.seed);
    this.goalPaceMul = input.goalPace === 'dusuk' ? 0.85 : input.goalPace === 'yuksek' ? 1.18 : 1.0;
    this.jitter = input.randomness === 'low' ? 2 : input.randomness === 'high' ? 8 : 5;
    this.weather = input.weather ?? (['acik', 'acik', 'acik', 'yagmur', 'sicak', 'rüzgar'] as Weather[])[Math.floor(this.rng() * 6)];
    this.endMinute = 90 + Math.floor(this.rng() * 6);

    this.homeTactic = input.homeTactic;
    this.awayTactic = input.awayTactic ?? aiDefaultTactic(input.awayClub, input.homeClub, input.homeClub.strength);
    const riskSet = new Set(input.riskIds ?? []);
    this.riskIds = riskSet;
    this.homeLine = autoLineup(input.homeSquad, this.homeTactic.formation, input.homeTactic.customLineup, riskSet);
    this.awayLine = autoLineup(input.awaySquad, this.awayTactic.formation, input.awayTactic?.customLineup, riskSet);
    // v0.9.9: iğneyle oynatılanlar %50 kondisyonla başlar (types.ts canPlayWithRisk yorumu)
    for (const l of [this.homeLine, this.awayLine]) for (const sl of l.slots) if (sl && riskSet.has(sl.player.id)) sl.liveFitness = Math.min(50, sl.liveFitness ?? sl.player.fitness);
    this.homeProf = teamProfile(this.homeLine.slots, this.homeTactic, { home: true, derby: !!input.derby });
    this.awayProf = teamProfile(this.awayLine.slots, this.awayTactic, { home: false, derby: !!input.derby });
    for (const line of [this.homeLine, this.awayLine]) {
      for (const slot of line.slots) this.playerClocks.set(slot.player.id, { playedSeconds: 0, activeSinceSecond: 0, fitnessCurrent: slot.liveFitness });
      for (const player of line.bench) this.playerClocks.set(player.id, { playedSeconds: 0, activeSinceSecond: null, fitnessCurrent: player.fitness });
    }

    this.stats = {
      hg: 0, ag: 0, xgH: 0, xgA: 0, shotsH: 0, shotsA: 0, onH: 0, onA: 0,
      posH: 50, cornersH: 0, cornersA: 0, foulsH: 0, foulsA: 0, yellowH: 0, yellowA: 0, redH: 0, redA: 0,
      savesH: 0, savesA: 0, possessionCount: 0,
      wideAttH: 0, wideAttA: 0, centralAttH: 0, centralAttA: 0, pressWinsH: 0, pressWinsA: 0,
      playerRows: {},
    };
    for (const s of [...this.homeLine.slots, ...this.awayLine.slots]) {
      const row = { min: 0, g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0, posGroup: s.slotGroup, endFit: s.liveFitness, rating: 6.0 + Math.min(2.0, (s.player.ratings.gen - 60) / 20) * 0.8, conceded: 0 };
      this.stats.playerRows[s.player.id] = row;
    }
    const refereeTone = this.referee.strictness === 'strict' ? 'katı' : this.referee.strictness === 'lenient' ? 'yumuşak' : 'dengeli';
    this.events.push({ minute: 0, text: `Maç başladı — ${input.homeClub.name} ${this.homeTactic.name} ile sahada. Hakem: ${this.referee.label} (${refereeTone}).`, kind: 'info' });
  }

  private startPlayerClock(slot: LineupSlot, second: number): void {
    const clock = this.playerClocks.get(slot.player.id) ?? { playedSeconds: 0, activeSinceSecond: null, fitnessCurrent: slot.liveFitness };
    if (clock.activeSinceSecond === null) clock.activeSinceSecond = second;
    clock.fitnessCurrent = slot.liveFitness;
    this.playerClocks.set(slot.player.id, clock);
  }

  private stopPlayerClock(slot: LineupSlot, second: number): void {
    const clock = this.playerClocks.get(slot.player.id) ?? { playedSeconds: 0, activeSinceSecond: null, fitnessCurrent: slot.liveFitness };
    if (clock.activeSinceSecond !== null) {
      clock.playedSeconds += Math.max(0, second - clock.activeSinceSecond);
      clock.activeSinceSecond = null;
    }
    clock.fitnessCurrent = slot.liveFitness;
    this.playerClocks.set(slot.player.id, clock);
  }

  private syncPlayerFitness(): void {
    for (const slot of [...this.homeLine.slots, ...this.awayLine.slots]) {
      const clock = this.playerClocks.get(slot.player.id);
      if (clock) clock.fitnessCurrent = slot.liveFitness;
    }
  }

  private applyFatigueForElapsedSeconds(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;
    const deltaMinutes = deltaSeconds / 60;
    const elapsedMinutes = this.clockSec / 60;
    tickFatigue(this.homeLine.slots, this.homeTactic, elapsedMinutes, this.stats.hg > this.stats.ag, 0,
      this.homeTactic.press === 'high' || this.shoutActiveUntil.home.pump >= this.minute,
      this.weather === 'sicak', this.shoutActiveUntil.home.pump >= this.minute ? 1.5 : 1, deltaMinutes);
    tickFatigue(this.awayLine.slots, this.awayTactic, elapsedMinutes, this.stats.ag > this.stats.hg, 0,
      this.awayTactic.press === 'high' || this.shoutActiveUntil.away.pump >= this.minute,
      this.weather === 'sicak', this.shoutActiveUntil.away.pump >= this.minute ? 1.5 : 1, deltaMinutes);
    this.syncPlayerFitness();
  }

  /** Whether the team has a substitution right and a remaining opportunity (or is at half-time). */
  canQueueSub(owner: 'home' | 'away'): boolean {
    const queued = this.pendingSubs[owner]?.length ?? 0;
    return !this.done && this.subs[owner] > queued
      && (this.subWindows[owner] > 0 || this.lastSubMinute[owner] === this.minute || this.htWindowOpen);
  }

  /** §11.1 — Queue only a legal player exchange; apply it at the next simulation boundary. */
  queueSub(owner: 'home' | 'away', outId: string, inId: string): boolean {
    if (!this.canQueueSub(owner)) return false;
    const line = owner === 'home' ? this.homeLine : this.awayLine;
    const outgoing = line.slots.find((slot) => slot.player.id === outId);
    const incoming = line.bench.find((player) => player.id === inId);
    if (!outgoing || outgoing.sentOff || !incoming) return false;
    const halfTime = this.htWindowOpen;
    const queue = this.pendingSubs[owner] ?? [];
    if (queue.some((request) => request.outId === outId || request.inId === inId)) return false;
    queue.push({ outId, inId, halfTime });
    this.pendingSubs[owner] = queue;
    this.recordCommand(owner, 'SUB_REQUEST', { outId, inId, halfTime });
    return true;
  }

  /** §5.3 — Taktik geçişi komutu (2-4 possession içinde devreye girer) */
  queueTactic(owner: 'home' | 'away', plan: TacticPlan): boolean {
    if (this.done) return false;
    this.pendingTactics[owner] = plan;
    this.recordCommand(owner, 'TACTIC_CHANGE', { plan });
    return true;
  }

  private recordCommand(side: 'home' | 'away', type: MatchCommand['type'], payload: Record<string, unknown>): void {
    this.commandLog.append({ issuedAtSecond: this.clockSec, issuedAtStep: this.stepCount, side, type, payload });
  }

  private applyAiTactics(fresh: MatchStateEvent[]): void {
    const decisionBand = this.minute >= 80 ? 80 : this.minute >= 65 ? 65 : 0;
    if (!decisionBand) return;
    for (const side of ['home', 'away'] as const) {
      if (this.input.userSide === side || this.aiTacticDecisionBand[side] >= decisionBand) continue;
      this.aiTacticDecisionBand[side] = decisionBand;
      const home = side === 'home';
      const club = home ? this.input.homeClub : this.input.awayClub;
      const opponent = home ? this.input.awayClub : this.input.homeClub;
      const line = home ? this.homeLine : this.awayLine;
      const current = home ? this.homeTactic : this.awayTactic;
      const averageFitness = line.slots.filter(isActiveOnPitch).reduce((sum, slot, _, active) => sum + slot.liveFitness / Math.max(1, active.length), 0);
      const opponentChallengePoints = this.input.challengeClubId && club.id !== this.input.challengeClubId
        ? this.input.challengePoints : undefined;
      const recentWindow = this.momentumHistory.filter((entry) => entry.minute >= this.minute - 10);
      const recentXgFor = recentWindow.filter((entry) => entry.owner === side).reduce((sum, entry) => sum + entry.xg, 0);
      const recentXgAgainst = recentWindow.filter((entry) => entry.owner !== side).reduce((sum, entry) => sum + entry.xg, 0);
      const decision = chooseAiTacticDecision(club, opponent, {
        minute: this.minute,
        goalsFor: home ? this.stats.hg : this.stats.ag,
        goalsAgainst: home ? this.stats.ag : this.stats.hg,
        averageFitness,
        challengePoints: opponentChallengePoints,
        xgFor: home ? this.stats.xgH : this.stats.xgA,
        xgAgainst: home ? this.stats.xgA : this.stats.xgH,
        recentXgFor, recentXgAgainst,
        wideAttacksFor: home ? this.stats.wideAttH : this.stats.wideAttA,
        wideAttacksAgainst: home ? this.stats.wideAttA : this.stats.wideAttH,
        centralAttacksFor: home ? this.stats.centralAttH : this.stats.centralAttA,
        centralAttacksAgainst: home ? this.stats.centralAttA : this.stats.centralAttH,
        redCardsFor: home ? this.stats.redH : this.stats.redA,
        redCardsAgainst: home ? this.stats.redA : this.stats.redH,
      });
      const next = decision.tactic;
      this.aiDecisionTraces.push(decision.trace);
      const tacticalShape = (plan: TacticPlan) => [plan.formation, plan.plan, plan.press, plan.tempo, plan.direction, plan.defLine, plan.passRisk, plan.width, plan.fbAdvanced].join('|');
      if (tacticalShape(current) === tacticalShape(next)) continue;
      if (home) this.homeTactic = next; else this.awayTactic = next;
      this.coreEventLog.append({ type: 'TACTIC_CHANGE', side, tacticId: next.id, decisionTrace: decision.trace, second: Math.max(0, Math.floor(this.clockSec)), minute: Math.floor(this.minute) });
      fresh.push({ minute: this.minute, side, text: `${club.short}: ${next.name} planına geçti.`, kind: 'info' });
    }
  }

  getStepCount(): number { return this.stepCount; }
  getCommandLog(): readonly MatchCommand[] { return this.commandLog.readAll(); }
  getCommandLogHash(): string { return this.commandLog.hash(); }
  getCoreEvents(): readonly CoreMatchEvent[] { return this.coreEventLog.readAll(); }
  getAiDecisionTraces(): readonly AiDecisionTrace[] { return this.aiDecisionTraces.map((trace) => ({ ...trace, utilities: { ...trace.utilities } })); }
  getReferee(): Readonly<RefereeProfile> { return this.referee; }

  getMinute(): number { return Math.min(this.minute, this.endMinute); }
  getSecond(): number { return this.clockSec % 60; }
  getElapsedSeconds(): number { return this.clockSec; }
  getStats(): MatchStats { return { ...this.stats }; }
  getBallState(): LiveBallState {
    const p = ZONE_XY[this.ballZone] ?? ZONE_XY['C-M'];
    return { x: p.x, y: p.y, z: this.ballHeight, zone: this.ballZone, owner: this.ballOwner, ownerId: this.ballOwnerId, activeIds: [...this.ballActorIds], path: [...this.ballPath] };
  }
  getMomentum(): number {
    const recent = this.momentumHistory.filter((x) => x.minute >= this.minute - 5);
    if (recent.length < 2) return 50;
    const count = (side: 'home' | 'away', key: 'owner' | 'pressWin') => recent.filter((x) => x[key] === side).length;
    const hPoss = count('home', 'owner') / recent.length, aPoss = count('away', 'owner') / recent.length;
    const hPress = count('home', 'pressWin'), aPress = count('away', 'pressWin');
    const hShots = recent.filter((x) => x.owner === 'home' && x.shot).length, aShots = recent.filter((x) => x.owner === 'away' && x.shot).length;
    const hXg = recent.filter((x) => x.owner === 'home').reduce((n, x) => n + x.xg, 0), aXg = recent.filter((x) => x.owner === 'away').reduce((n, x) => n + x.xg, 0);
    return Math.max(0, Math.min(100, Math.round((50 + (hPoss - aPoss) * 22) * 0.46 + (50 + (hPress - aPress) * 10) * 0.27 + (50 + (hShots - aShots) * 6 + (hXg - aXg) * 10) * 0.27)));
  }
  getTouchlineState(side: 'home' | 'away'): TouchlineState {
    return { pumpCooldown: Math.max(0, this.shoutAvailableAt[side].pump - this.minute), coolCooldown: Math.max(0, this.shoutAvailableAt[side].cool - this.minute), pumpRemaining: Math.max(0, this.shoutActiveUntil[side].pump - this.minute), coolRemaining: Math.max(0, this.shoutActiveUntil[side].cool - this.minute), pumpActive: this.shoutActiveUntil[side].pump >= this.minute, coolActive: this.shoutActiveUntil[side].cool >= this.minute, protestCooldown: Math.max(0, this.lastProtestMinute[side] + 10 - this.minute), protestAvailable: this.protestWindowUntil[side] >= this.minute && this.lastProtestMinute[side] + 10 <= this.minute };
  }
  useShout(side: 'home' | 'away', command: TouchlineCommand): { ok: boolean; until: number } {
    if (this.done || this.shoutAvailableAt[side][command] > this.minute) return { ok: false, until: this.shoutAvailableAt[side][command] };
    this.shoutAvailableAt[side][command] = this.minute + 10; this.shoutActiveUntil[side][command] = this.minute + 15;
    this.recordCommand(side, 'TOUCHLINE_SHOUT', { command });
    const text = command === 'pump' ? 'Yüklenin! Pres ve tempo yükseldi; kondisyon tüketimi 1,5×.' : 'Tempoyu düşürün. Güvenli pas ve kontrollü oyun 15 dakika aktif.';
    this.events.push({ minute: this.minute, side, text, kind: 'info' });
    return { ok: true, until: this.minute + 15 };
  }
  canProtest(side: 'home' | 'away'): boolean { return this.getTouchlineState(side).protestAvailable && !this.done; }
  /** v0.9.9: kurucuda yayınlanan açılış olayı (step() yalnızca fresh döndürür; akış ilk saniyede boş kalmasın) */
  getEvents(): MatchStateEvent[] { return [...this.events]; }
  getWeather(): Weather { return this.weather; }
  /** Live HUD data — read-only snapshots; these accessors do not advance the match. */
  getShotsLog(): EngineShot[] { return this.shotsLog.map((shot) => ({ ...shot })); }
  getTactic(side: 'home' | 'away'): TacticPlan { return side === 'home' ? this.homeTactic : this.awayTactic; }
  getSlots(side: 'home' | 'away'): LineupSlot[] { return side === 'home' ? this.homeLine.slots : this.awayLine.slots; }
  /** Apply a single halftime instruction to the second-half live team profile. */
  applyTeamTalk(side: 'home' | 'away', choice: TeamTalkChoice): boolean {
    if (this.done || this.minute < 45 || this.minute > 46 || this.teamTalkUsed[side]) return false;
    this.teamTalkUsed[side] = true;
    this.teamTalkChoice[side] = choice;
    this.recordCommand(side, 'TEAM_TALK', { choice });
    const text = choice === 'fight' ? 'Devre arası konuşması: takımın hırsı ve baskısı yükseldi.' : choice === 'calm' ? 'Devre arası konuşması: takım sakinleşti, pas oyununa odaklandı.' : 'Devre arası: menajer sessiz kaldı.';
    this.events.push({ minute: 45, side, text, kind: 'info' });
    return true;
  }
  /** Keep the injured player out for two match minutes, then permit a return at reduced fitness. */
  waitForInjuredPlayer(playerId: string): boolean {
    if (this.done) return false;
    const slot = [...this.homeLine.slots, ...this.awayLine.slots].find((candidate) => candidate.player.id === playerId && candidate.injured && !candidate.sentOff);
    if (!slot || this.injuryReturnAt.has(playerId)) return false;
    this.injuryReturnAt.set(playerId, this.clockSec + 120);
    this.stopPlayerClock(slot, this.clockSec);
    const side = slot.player.clubId === this.input.homeClub.id ? 'home' : 'away';
    this.recordCommand(side, 'WAIT_INJURED', { playerId });
    this.events.push({ minute: this.minute, text: `${slot.player.name}: tedavi için iki dakika kenarda; takım geçici olarak 10 kişi.`, kind: 'injury', playerId });
    return true;
  }
  getBench(side: 'home' | 'away'): Player[] { return side === 'home' ? this.homeLine.bench : this.awayLine.bench; }
  subsLeft(side: 'home' | 'away'): number { return this.subs[side]; }
  windowsLeft(side: 'home' | 'away'): number { return this.subWindows[side]; }

  private resolveRestartShot(args: {
    side: MatchSide; zone: ZoneId; taker: LineupSlot; keeper?: LineupSlot;
    shotType: 'free_kick' | 'penalty' | 'corner'; rawGoalProbability: number; saveShare: number; fresh: MatchStateEvent[];
  }): { shotId: string; outcome: ShotOutcome } {
    const probabilities = makeShotProbabilities(args.rawGoalProbability, { saveShare: args.saveShare, woodworkShare: 0.02 });
    const outcome = sampleShotOutcome(this.rng(), probabilities);
    if (args.side === 'home') { this.stats.shotsH++; this.stats.xgH += probabilities.pGoal; }
    else { this.stats.shotsA++; this.stats.xgA += probabilities.pGoal; }
    this.stats.playerRows[args.taker.player.id].shots++;
    const shotId = this.recordShotFact({
      // Core log yalnız sahadaki aktörleri yazar: GK tedavi/kırmızı kart nedeniyle dışarıdaysa aktör kimliği yok;
      // istatistiksel sorumluluk ise birincil GK slotunda kalır (keeperOfRecordId).
      side: args.side, shooterId: args.taker.player.id,
      goalkeeperId: args.keeper && isActiveOnPitch(args.keeper) ? args.keeper.player.id : undefined,
      keeperOfRecordId: args.keeper?.player.id,
      shotType: args.shotType, zone: args.zone, probabilities, outcome,
    });
    const signal = this.momentumHistory[this.momentumHistory.length - 1];
    if (signal) { signal.shot = true; signal.xg += probabilities.pGoal; }
    const defendingSide = args.side === 'home' ? 'away' : 'home';
    const shotOutcome = outcome === 'blocked' ? 'clearance' : outcome === 'off_target' ? 'miss' : outcome;
    this.shotsLog.push({ minute: this.minute, side: args.side, zone: args.zone, xg: probabilities.pGoal, outcome: shotOutcome });
    if (outcome === 'goal') {
      this.stats[args.side === 'home' ? 'hg' : 'ag']++;
      if (args.side === 'home') this.stats.onH++; else this.stats.onA++;
      const scorer = this.stats.playerRows[args.taker.player.id]; scorer.g++; scorer.rating += 0.8;
      if (args.keeper) this.stats.playerRows[args.keeper.player.id].conceded++;
      args.fresh.push({ minute: this.minute, side: args.side, text: `GOOOL! ${args.taker.player.name} ${args.shotType === 'penalty' ? 'penaltıyı' : args.shotType === 'corner' ? 'korneri' : 'serbest vuruşu'} gole çevirdi.`, kind: 'goal', scorerId: args.taker.player.id });
    } else if (outcome === 'save') {
      if (args.side === 'home') { this.stats.onH++; this.stats.savesA++; } else { this.stats.onA++; this.stats.savesH++; }
      if (args.keeper) { this.stats.playerRows[args.keeper.player.id].saves++; this.stats.playerRows[args.keeper.player.id].rating += 0.1; }
      args.fresh.push({ minute: this.minute, side: defendingSide, text: `${args.keeper?.player.name ?? 'Kaleci'} ${args.shotType === 'penalty' ? 'penaltıyı' : args.shotType === 'corner' ? 'korneri' : 'serbest vuruşu'} kurtardı.`, kind: 'save', playerId: args.keeper?.player.id });
    } else if (outcome === 'woodwork') {
      args.fresh.push({ minute: this.minute, side: args.side, text: `${args.taker.player.name} ${args.shotType === 'penalty' ? 'penaltıyı' : args.shotType === 'corner' ? 'korneri' : 'serbest vuruşu'} direğe gönderdi.`, kind: 'info' });
    } else if (outcome === 'blocked') {
      args.fresh.push({ minute: this.minute, side: args.side, text: `${args.taker.player.name} vuruşu savunmadan döndü.`, kind: 'danger' });
    } else {
      args.fresh.push({ minute: this.minute, side: args.side, text: `${args.taker.player.name} vuruşu kaleyi bulmadı.`, kind: 'info' });
    }
    return { shotId, outcome };
  }

  private awardCorner(side: MatchSide, slots: LineupSlot[], tactic: TacticPlan, zone: ZoneId, sourceShotId: string, fresh: MatchStateEvent[]): boolean {
    const role: SetPieceRole = zone.startsWith('L-') ? 'cornerL' : 'cornerR';
    const taker = selectSetPieceTaker(slots, tactic.setPieces, role);
    if (!taker) return false;
    this.coreEventLog.append({
      type: 'RESTART_AWARDED', side, restartType: 'corner', takerId: taker.slot.player.id,
      takerSelection: taker.selection, refereeId: this.referee.id, sourceShotId,
      second: Math.max(0, Math.floor(this.clockSec)), minute: Math.floor(this.minute),
    });
    if (side === 'home') this.stats.cornersH++; else this.stats.cornersA++;
    fresh.push({ minute: this.minute, side, text: `Korner: ${taker.slot.player.name} topun başında.`, kind: 'corner', playerId: taker.slot.player.id });
    const attackingProfile = side === 'home' ? this.homeProf : this.awayProf;
    const defendingProfile = side === 'home' ? this.awayProf : this.homeProf;
    const defendingSlots = side === 'home' ? this.awayLine.slots : this.homeLine.slots;
    const keeper = resolveKeeper(defendingSlots);
    const setXG = Math.max(0.015, Math.min(0.09, 0.035 + (attackingProfile.setAtt - defendingProfile.setDef) * 0.001));
    const rawGoalProbability = Math.max(0.01, Math.min(0.5, setXG * 0.7 * this.goalPaceMul));
    this.resolveRestartShot({ side, zone, taker: taker.slot, keeper, shotType: 'corner', rawGoalProbability, saveShare: keeper ? 0.35 : 0, fresh });
    return true;
  }

  private recordShotFact(args: {
    side: MatchSide; shooterId: string; assisterId?: string; goalkeeperId?: string; keeperOfRecordId?: string;
    shotType: ShotType; zone?: string; probabilities: ShotProbabilitySet; outcome: ShotOutcome;
    varReviewed?: boolean; varDecision?: 'confirmed' | 'overturned';
  }): string {
    const shotId = `${this.matchId}:shot:${String(++this.shotSequence).padStart(6, '0')}`;
    const second = Math.max(0, Math.floor(this.clockSec));
    const minute = Math.max(0, Math.floor(this.minute));
    this.coreEventLog.append({
      type: 'SHOT', side: args.side, shotId, shooterId: args.shooterId,
      ...(args.assisterId ? { assisterId: args.assisterId } : {}),
      ...(args.goalkeeperId ? { goalkeeperId: args.goalkeeperId } : {}),
      ...(args.keeperOfRecordId ? { keeperOfRecordId: args.keeperOfRecordId } : {}),
      shotType: args.shotType, ...(args.zone ? { zone: args.zone } : {}),
      xg: args.probabilities.pGoal, pGoal: args.probabilities.pGoal,
      pSave: args.probabilities.pSave, pBlocked: args.probabilities.pBlocked,
      pOffTarget: args.probabilities.pOffTarget, pWoodwork: args.probabilities.pWoodwork,
      second, minute,
    });
    this.coreEventLog.append({
      type: 'SHOT_RESOLVED', shotId, outcome: args.outcome,
      ...(args.goalkeeperId && args.outcome === 'save' ? { goalkeeperId: args.goalkeeperId } : {}),
      ...(args.keeperOfRecordId && args.outcome === 'save' ? { keeperOfRecordId: args.keeperOfRecordId } : {}),
      second, minute,
    });
    if (args.outcome === 'goal') {
      if (args.varReviewed) {
        const decision = args.varDecision ?? 'confirmed';
        this.coreEventLog.append({ type: 'VAR_REVIEW_STARTED', side: args.side, shotId, reason: decision === 'overturned' ? 'offside' : 'goal', second, minute });
        this.coreEventLog.append({ type: 'VAR_DECISION', side: args.side, shotId, decision, second, minute });
      }
      if (args.varDecision === 'overturned') {
        this.coreEventLog.append({ type: 'GOAL_DISALLOWED', side: args.side, shotId, reason: 'offside', second, minute });
      } else {
        this.coreEventLog.append({ type: 'GOAL_CONFIRMED', side: args.side, shotId, scorerId: args.shooterId, ...(args.assisterId ? { assisterId: args.assisterId } : {}), second, minute });
      }
    }
    return shotId;
  }

  private assertShotStatsMatchCore(): void {
    const summary = reduceMatchEvents(this.coreEventLog.readAll(), true);
    assertMatchStatInvariants(summary);
    if (summary.totalPossessionSeconds !== this.clockSec) throw new Error(`Possession time must cover the full simulated clock (${summary.totalPossessionSeconds}/${this.clockSec}).`);
    this.stats.posH = Math.round(summary.home.possessionPct);
    for (const [side, fouls, corners, yellows, reds] of [
      ['home', this.stats.foulsH, this.stats.cornersH, this.stats.yellowH, this.stats.redH],
      ['away', this.stats.foulsA, this.stats.cornersA, this.stats.yellowA, this.stats.redA],
    ] as const) {
      const derived = summary[side];
      if (derived.foulsCommitted !== fouls || derived.corners !== corners || derived.yellowCards !== yellows || derived.redCards !== reds) {
        throw new Error(`Restart/referee stat mismatch for ${side}: fouls ${derived.foulsCommitted}/${fouls}, corners ${derived.corners}/${corners}, yellow ${derived.yellowCards}/${yellows}, red ${derived.redCards}/${reds}.`);
      }
    }
    for (const [side, score, shots, onTarget, saves, xg] of [
      ['home', this.stats.hg, this.stats.shotsH, this.stats.onH, this.stats.savesH, this.stats.xgH],
      ['away', this.stats.ag, this.stats.shotsA, this.stats.onA, this.stats.savesA, this.stats.xgA],
    ] as const) {
      const derived = summary[side];
      if (derived.goals !== score || derived.shots !== shots || derived.shotsOnTarget !== onTarget || derived.saves !== saves || Math.abs(derived.xg - xg) > 1e-8) {
        throw new Error(`Shot ledger/stat mismatch for ${side}: goals ${derived.goals}/${score}, shots ${derived.shots}/${shots}, SOT ${derived.shotsOnTarget}/${onTarget}, saves ${derived.saves}/${saves}, xG ${derived.xg}/${xg}.`);
      }
    }
    // The reducer is the final source of truth for all shot-derived team/player fields.
    this.stats.hg = summary.home.goals; this.stats.ag = summary.away.goals;
    this.stats.shotsH = summary.home.shots; this.stats.shotsA = summary.away.shots;
    this.stats.onH = summary.home.shotsOnTarget; this.stats.onA = summary.away.shotsOnTarget;
    this.stats.savesH = summary.home.saves; this.stats.savesA = summary.away.saves;
    this.stats.xgH = summary.home.xg; this.stats.xgA = summary.away.xg;
    this.stats.foulsH = summary.home.foulsCommitted; this.stats.foulsA = summary.away.foulsCommitted;
    this.stats.cornersH = summary.home.corners; this.stats.cornersA = summary.away.corners;
    this.stats.yellowH = summary.home.yellowCards; this.stats.yellowA = summary.away.yellowCards;
    this.stats.redH = summary.home.redCards; this.stats.redA = summary.away.redCards;
    for (const [playerId, row] of Object.entries(this.stats.playerRows)) {
      const derived = summary.players[playerId] ?? { goals: 0, assists: 0, shots: 0, saves: 0, yellowCards: 0, redCards: 0 };
      if (row.g !== derived.goals || row.a !== derived.assists || row.shots !== derived.shots || row.saves !== derived.saves || row.yellow !== derived.yellowCards || row.red !== derived.redCards) {
        throw new Error(`Player shot ledger/stat mismatch for ${playerId}.`);
      }
      row.g = derived.goals; row.a = derived.assists; row.shots = derived.shots; row.saves = derived.saves; row.yellow = derived.yellowCards; row.red = derived.redCards;
    }
  }

  /** Tek possession'lık oyun ilerletir — canlı izleme için UI bunu periyodik çağırır */
  step(): MatchStateEvent[] {
    if (this.done) return [];
    this.stepCount++;
    const fresh: MatchStateEvent[] = [];

    const previousSecond = this.clockSec;
    if (this.htWindowOpen) this.htWindowOpen = false;
    const stepSeconds = 30 + Math.floor(this.rng() * 70);
    const fullTimeSecond = this.endMinute * 60;
    this.clockSec = Math.min(fullTimeSecond, previousSecond + stepSeconds);
    const elapsedSeconds = this.clockSec - previousSecond;
    this.minute = Math.floor(this.clockSec / 60);

    if (!this.htReached && previousSecond < 45 * 60 && this.clockSec >= 45 * 60) {
      this.coreEventLog.append({ type: 'HALF_TIME', second: 45 * 60, minute: 45 });
      this.coreEventLog.append({ type: 'KICK_OFF', side: 'away', second: 45 * 60, minute: 45 });
      fresh.push({ minute: 45, text: 'İlk yarı sona erdi.', kind: 'half' });
      this.htReached = true;
      this.htWindowOpen = true;
    }
    this.applyFatigueForElapsedSeconds(elapsedSeconds);
    if (this.clockSec >= fullTimeSecond) {
      if (elapsedSeconds > 0) this.coreEventLog.append({ type: 'POSSESSION_ENDED', side: this.ballOwner, durationSeconds: elapsedSeconds, second: this.clockSec, minute: this.endMinute });
      this.finish();
      return [{ minute: this.endMinute, text: 'Maç sona erdi.', kind: 'half' }];
    }

    for (const [playerId, returnSecond] of this.injuryReturnAt) {
      if (this.clockSec < returnSecond) continue;
      const slot = [...this.homeLine.slots, ...this.awayLine.slots].find((candidate) => candidate.player.id === playerId);
      if (slot) {
        slot.injured = false; slot.liveFitness = Math.max(45, slot.liveFitness);
        this.startPlayerClock(slot, this.clockSec);
        fresh.push({ minute: this.minute, side: slot.player.clubId === this.input.homeClub.id ? 'home' : 'away', text: `${slot.player.name} tedavi sonrası oyuna döndü.`, kind: 'injury', playerId });
      }
      this.injuryReturnAt.delete(playerId);
    }

    // Compatibility adapter: legacy SubManager commands are polled at the same boundaries as before.
    for (const side of ['home', 'away'] as const) {
      if (!this.pendingTactics[side]) {
        const tacticRequest = this.input.subMgr?.takeTacticRequest(side);
        if (tacticRequest) this.pendingTactics[side] = tacticRequest.plan;
      }
    }

    // §5.3 taktik aktarımı (uygulanma 2-4 possession)
    for (const side of ['home', 'away'] as const) {
      const pending = this.pendingTactics[side];
      if (pending) {
        const outPhase = this.minute >= 0;
        if (outPhase) {
          if (side === 'home') { this.homeTactic = pending; this.homeProf = teamProfile(this.homeLine.slots, this.homeTactic, { home: true, derby: !!this.input.derby }); }
          else { this.awayTactic = pending; this.awayProf = teamProfile(this.awayLine.slots, this.awayTactic, { home: false, derby: !!this.input.derby }); }
          this.pendingTactics[side] = undefined;
          fresh.push({ minute: this.minute, text: `${side === 'home' ? this.input.homeClub.short : this.input.awayClub.short}: ${pending.name} planına geçildi.`, kind: 'info', side });
        }
      }
    }
    this.applyAiTactics(fresh);

    // Değişiklik — IFAB: 5 hak, 3 durak (devre arası 45 serbest; aynı dakikadaki ardışık istekler durak saymaz)
    for (const side of ['home', 'away'] as const) {
      if (!(this.pendingSubs[side]?.length) && this.minute % 2 === 0) {
        const request = this.input.subMgr?.takeSubRequest(side);
        if (request) this.pendingSubs[side] = [{ ...request, halfTime: this.htWindowOpen }];
      }
      const requests = this.pendingSubs[side] ?? [];
      if (requests.length) {
        const line = side === 'home' ? this.homeLine : this.awayLine;
        for (const req of requests) {
          const outIdx = line.slots.findIndex((s) => s.player.id === req.outId);
          const inP = line.bench.find((p) => p.id === req.inId);
          const windowNeeded = !req.halfTime && this.lastSubMinute[side] !== this.minute;
          if (outIdx >= 0 && inP && !line.slots[outIdx].sentOff && this.subs[side] > 0 && !(windowNeeded && this.subWindows[side] <= 0)) {
            const old = line.slots[outIdx];
            this.stopPlayerClock(old, this.clockSec);
            const incoming: LineupSlot = { player: inP, slotGroup: old.slotGroup, liveFitness: inP.fitness, yellows: 0, subMinute: this.clockSec / 60, offs: { g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0 } };
            line.slots[outIdx] = incoming;
            this.startPlayerClock(incoming, this.clockSec);
            line.bench = line.bench.filter((p) => p.id !== inP.id);
            this.subs[side]--;
            if (windowNeeded) { this.subWindows[side]--; this.lastSubMinute[side] = this.minute; }
            this.stats.playerRows[inP.id] = { min: 0, g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0, posGroup: old.slotGroup, endFit: incoming.liveFitness, rating: 6.4, conceded: 0 };
            const profUpdate = side === 'home' ? () => { this.homeProf = teamProfile(this.homeLine.slots, this.homeTactic, { home: true, derby: !!this.input.derby }); } : () => { this.awayProf = teamProfile(this.awayLine.slots, this.awayTactic, { home: false, derby: !!this.input.derby }); };
            profUpdate();
            fresh.push({ minute: this.minute, side, text: `Değişiklik: ${old.player.name} ≠ ${inP.name} oyunda. (${5 - this.subs[side]}/5 · durak ${3 - this.subWindows[side]}/3)`, kind: 'sub' });
          } else if (windowNeeded && this.subWindows[side] <= 0) {
            fresh.push({ minute: this.minute, side, text: 'IFAB kuralı: değişiklik durakları doldu (3/3) — işlem iptal.', kind: 'info' });
          }
        }
        this.pendingSubs[side] = undefined;
      }
    }

    // Dalga 5: AI otomatik değişiklik — 62/72/82. dakika civarı yorgun (<62) oyuncu tazelenir (eş güç ±5, kullanıcı tarafına karışmaz)
    if (this.minute >= 61 && this.rng() < 0.06) {
      for (const side of ['home', 'away'] as const) {
        if (this.input.userSide && side === this.input.userSide) continue; // kullanıcı tarafına AI karışmaz
        const line = side === 'home' ? this.homeLine : this.awayLine;
        if (this.subs[side] <= 0 || line.bench.length === 0 || (this.subWindows[side] <= 0 && this.lastSubMinute[side] !== this.minute)) continue;
        const tired = line.slots.filter((s) => !s.sentOff && !s.injured && s.slotGroup !== 'GK' && s.liveFitness < 62).sort((a, b) => a.liveFitness - b.liveFitness)[0];
        if (!tired) continue;
        const repl = line.bench.filter((p) => p.group === tired.slotGroup || p.secondary.includes(tired.slotGroup)).sort((a, b) => b.ratings.gen - a.ratings.gen)[0];
        if (!repl || repl.ratings.gen < tired.player.ratings.gen - 5) continue;
        const outIdx = line.slots.findIndex((s) => s.player.id === tired.player.id);
        this.stopPlayerClock(tired, this.clockSec);
        const incoming: LineupSlot = { player: repl, slotGroup: tired.slotGroup, liveFitness: repl.fitness, yellows: 0, subMinute: this.clockSec / 60, offs: { g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0 } };
        line.slots[outIdx] = incoming;
        this.startPlayerClock(incoming, this.clockSec);
        line.bench = line.bench.filter((p) => p.id !== repl.id);
        this.subs[side]--;
        if (this.lastSubMinute[side] !== this.minute) { this.subWindows[side]--; this.lastSubMinute[side] = this.minute; }
        this.stats.playerRows[repl.id] = { min: 0, g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0, posGroup: tired.slotGroup, endFit: incoming.liveFitness, rating: 6.4, conceded: 0 };
        if (side === 'home') this.homeProf = teamProfile(this.homeLine.slots, this.homeTactic, { home: true, derby: !!this.input.derby });
        else this.awayProf = teamProfile(this.awayLine.slots, this.awayTactic, { home: false, derby: !!this.input.derby });
        fresh.push({ minute: this.minute, side, text: `Teknik direktör kararı: ${tired.player.name} ≠ ${repl.name} oyunda.`, kind: 'sub' });
      }
    }

    // Profiller her adımda kondisyonu ve aktif kenar talimatlarını yansıtır.
    this.homeProf = teamProfile(this.homeLine.slots, this.homeTactic, { home: true, derby: !!this.input.derby });
    this.awayProf = teamProfile(this.awayLine.slots, this.awayTactic, { home: false, derby: !!this.input.derby });
    const applyTalk = (side: 'home' | 'away') => {
      const profile = side === 'home' ? this.homeProf : this.awayProf;
      const choice = this.teamTalkChoice[side];
      if (choice === 'fight') { profile.transition *= 1.08; profile.finalThird *= 1.08; profile.press *= 1.04; }
      if (choice === 'calm') { profile.buildUp *= 1.08; profile.midfield *= 1.06; }
    };
    applyTalk('home'); applyTalk('away');
    for (const side of ['home', 'away'] as const) {
      const prof = side === 'home' ? this.homeProf : this.awayProf;
      if (this.shoutActiveUntil[side].pump >= this.minute) { prof.press = Math.min(100, prof.press * 1.25); prof.transition = Math.min(100, prof.transition * 1.25); }
      if (this.shoutActiveUntil[side].cool >= this.minute) prof.buildUp = Math.min(100, prof.buildUp * 1.08);
      if (this.protestBoostUntil[side] >= this.minute) { prof.midfield = Math.min(100, prof.midfield + 15); prof.press = Math.min(100, prof.press + 15); prof.transition = Math.min(100, prof.transition + 15); }
    }

    // Possession döngüsü (§6.3)
    const ctx: PossessionContext = {
      minute: this.minute, homeScore: this.stats.hg, awayScore: this.stats.ag,
      rng: this.rng, jitter: this.jitter, goalPaceMul: this.goalPaceMul, weather: this.weather,
    };
    const owner = resolvePossessionOwner(this.homeProf, this.awayProf, ctx);
    const att = owner === 'home' ?
      { prof: this.homeProf, tac: this.homeTactic, slots: this.homeLine.slots, club: this.input.homeClub, side: 'home' as const, defs: this.awayLine.slots, bench: this.homeLine.bench } :
      { prof: this.awayProf, tac: this.awayTactic, slots: this.awayLine.slots, club: this.input.awayClub, side: 'away' as const, defs: this.homeLine.slots, bench: this.awayLine.bench };
    const defTac = owner === 'home' ? this.awayTactic : this.homeTactic;
    const wonByPress = this.rng() < Math.max(0, Math.min(0.35, (att.prof.press - (owner === 'home' ? this.awayProf : this.homeProf).buildUp) * 0.003 + 0.08));
    const start = resolveStartZone(att.prof, this.rng, wonByPress);

    this.stats.possessionCount++;
    const pumpActive = this.shoutActiveUntil[owner].pump >= this.minute;
    const coolActive = this.shoutActiveUntil[owner].cool >= this.minute;
    const liveTac = pumpActive ? { ...att.tac, press: 'high' as const, tempo: 'high' as const } : coolActive ? { ...att.tac, passRisk: 'safe' as const, tempo: 'low' as const } : att.tac;
    const pos = runPossession(owner, start, att.prof, owner === 'home' ? this.awayProf : this.homeProf, liveTac, defTac, att.slots, att.defs, ctx);
    const holder = pos.ballHolder?.player.id ?? pos.chain[pos.chain.length - 1]?.toId ?? pos.chain[pos.chain.length - 1]?.fromId ?? null;
    this.ballOwner = owner; this.ballOwnerId = holder; this.ballZone = pos.end; this.ballPath = [...pos.path];
    this.ballActorIds = [...new Set(pos.chain.flatMap((x) => [x.fromId, x.toId].filter((id): id is string => !!id)))];
    const lastIntent = pos.chain[pos.chain.length - 1]?.intent;
    this.ballHeight = ['cross', 'long', 'distribute'].includes(lastIntent ?? '') ? 24 : pos.outcome === 'shot' ? 12 : 0;
    const pressWinner = pos.outcome === 'dangerous' ? (owner === 'home' ? 'away' : 'home') : null;
    this.momentumHistory.push({ minute: this.minute, owner, pressWin: pressWinner, shot: pos.outcome === 'shot', xg: pos.outcome === 'shot' ? pos.xgPotential : 0 });
    this.momentumHistory = this.momentumHistory.filter((x) => x.minute >= this.minute - 8).slice(-120);

    const narrCtx = { rng: this.rng, weather: this.weather, homeClub: this.input.homeClub, awayClub: this.input.awayClub, jitter: this.jitter };

    if (pos.outcome === 'shot') {
      const shooter = pos.ballHolder ?? pickSlot(att.slots, pos.end, true);
      if (!shooter) throw new Error('A shot outcome requires an available shooter.');
      const keeperSlot = resolveKeeper(att.defs);
      const attackerEff = (shooter.player.ratings.att + shooter.player.ratings.fiz) / 2;
      const keeperEff = keeperSlot ? (keeperSlot.player.ratings.kal ?? keeperSlot.player.ratings.gen) : 50;
      const attachShotPresentation = (outcome: 'goal' | 'save' | 'miss') => {
        const event = fresh[fresh.length - 1];
        if (!event) return;
        const cue = shotVisualCue(this.input.seed, this.minute, shooter.player.id, pos.end, outcome, pos.chain.some((step) => step.intent === 'cross'));
        event.anim = { eventType: cue ?? 'shot', attackingTeamId: att.club.id, path: pos.path, actors: [shooter.player.id], outcome };
        if (cue) {
          event.visualEvent = cue;
          event.visualActors = [shooter.player.id];
          event.text += cue === 'woodwork' ? ' Direğe çarpıp geri döndü!' : ' Vole vuruşu!';
        }
      };

      const weatherXF = this.weather === 'yagmur' ? 0.97 : 1;
      const finAdj = Math.max(0.75, Math.min(1.3, 0.55 + attackerEff / 160));
      const kpAdj = Math.max(0.7, Math.min(1.25, 1.35 - keeperEff / 160));
      const defProfM = owner === 'home' ? this.awayProf : this.homeProf;
      const matchQ = (att.prof.raw.baseQuality + defProfM.raw.baseQuality) / 2;
      const chaosAdj = 1 + Math.max(0, (62 - matchQ) * 0.038);
      const rawGoalProbability = Math.max(0.01, Math.min(0.72, pos.xgPotential * 0.90 * finAdj * kpAdj * chaosAdj * weatherXF));
      const clearanceCandidate = pos.end.endsWith('-A') ? goalLineClearanceCandidate(att.defs) : null;
      const probabilities = makeShotProbabilities(rawGoalProbability, {
        goalLineClearanceChance: clearanceCandidate?.chance ?? 0,
        saveShare: 0.52,
        woodworkShare: 0.02,
      });
      const outcome = sampleShotOutcome(this.rng(), probabilities);
      if (owner === 'home') { this.stats.shotsH++; this.stats.xgH += probabilities.pGoal; }
      else { this.stats.shotsA++; this.stats.xgA += probabilities.pGoal; }
      this.stats.playerRows[shooter.player.id].shots++;
      const signal = this.momentumHistory[this.momentumHistory.length - 1];
      if (signal) signal.xg = probabilities.pGoal;
      const assisterId = pos.lastPasser?.player.id !== shooter.player.id ? pos.lastPasser?.player.id : undefined;
      const record = (resolved: ShotOutcome, varReviewed = false, varDecision?: 'confirmed' | 'overturned') => this.recordShotFact({
        side: owner, shooterId: shooter.player.id, assisterId,
        // Aktör kimliği yalnız aktif GK için; istatistiksel sorumluluk birincil GK slotunda kalır
        goalkeeperId: keeperSlot && isActiveOnPitch(keeperSlot) ? keeperSlot.player.id : undefined,
        keeperOfRecordId: keeperSlot?.player.id,
        shotType: 'open_play', zone: pos.end, probabilities, outcome: resolved, varReviewed, varDecision,
      });

      if (outcome === 'goal') {
        const varReviewed = this.rng() < 0.09;
        const onside = !varReviewed || this.rng() < 0.8;
        record('goal', varReviewed, onside ? 'confirmed' : 'overturned');
        if (!onside) {
          this.shotsLog.push({ minute: this.minute, side: owner, zone: pos.end, xg: probabilities.pGoal, outcome: 'miss' });
          fresh.push({ minute: this.minute, side: owner, text: varReviewed ? 'VAR kararı: gol iptal (ofsayt).' : 'Gol iptal edildi.', kind: 'var', shotsAfter: { h: this.stats.shotsH, a: this.stats.shotsA } });
        } else {
          this.stats[owner === 'home' ? 'hg' : 'ag']++;
          if (owner === 'home') this.stats.onH++; else this.stats.onA++;
          if (keeperSlot) this.stats.playerRows[keeperSlot.player.id].conceded++;
          const scorer = this.stats.playerRows[shooter.player.id]; scorer.g++; scorer.rating += 0.8;
          if (assisterId) { const assister = this.stats.playerRows[assisterId]; assister.a++; assister.rating += 0.4; }
          this.shotsLog.push({ minute: this.minute, side: owner, zone: pos.end, xg: probabilities.pGoal, outcome: 'goal' });
          narrate(fresh, pos, att.club, shooter, this.minute, 'goal', narrCtx);
          attachShotPresentation('goal');
        }
      } else if (outcome === 'save') {
        const shotId = record('save');
        if (owner === 'home') { this.stats.onH++; this.stats.savesA++; } else { this.stats.onA++; this.stats.savesH++; }
        if (keeperSlot) { this.stats.playerRows[keeperSlot.player.id].saves++; this.stats.playerRows[keeperSlot.player.id].rating += 0.1; }
        this.shotsLog.push({ minute: this.minute, side: owner, zone: pos.end, xg: probabilities.pGoal, outcome: 'save' });
        narrate(fresh, pos, att.club, shooter, this.minute, 'save', narrCtx, keeperSlot);
        attachShotPresentation('save');
        if (this.rng() < 0.12) this.awardCorner(owner, att.slots, att.tac, pos.end, shotId, fresh);
      } else if (outcome === 'blocked') {
        const shotId = record('blocked');
        if (!clearanceCandidate) throw new Error('Blocked-shot probability requires a goal-line clearance defender.');
        this.shotsLog.push({ minute: this.minute, side: owner, zone: pos.end, xg: probabilities.pGoal, outcome: 'clearance' });
        fresh.push({ minute: this.minute, side: owner, text: `İNANILMAZ MÜDAHALE! ${clearanceCandidate.slot.player.name} topu çizgi üzerinden kornere gönderdi!`, kind: 'danger', path: pos.path, anim: { eventType: 'line_clearance', attackingTeamId: att.club.id, path: pos.path, actors: [shooter.player.id, clearanceCandidate.slot.player.id], outcome: 'clearance' } });
        this.awardCorner(owner, att.slots, att.tac, pos.end, shotId, fresh);
      } else if (outcome === 'woodwork') {
        record('woodwork');
        this.shotsLog.push({ minute: this.minute, side: owner, zone: pos.end, xg: probabilities.pGoal, outcome: 'woodwork' });
        narrate(fresh, pos, att.club, shooter, this.minute, 'miss', narrCtx);
        attachShotPresentation('miss');
      } else {
        record('off_target');
        this.shotsLog.push({ minute: this.minute, side: owner, zone: pos.end, xg: probabilities.pGoal, outcome: 'miss' });
        narrate(fresh, pos, att.club, shooter, this.minute, 'miss', narrCtx);
        attachShotPresentation('miss');
      }
    } else if (pos.outcome === 'foul') {
      const cardedSide = owner === 'home' ? 'away' : 'home';
      this.protestWindowUntil[cardedSide] = Math.max(this.protestWindowUntil[cardedSide], this.minute + 2);
      if (owner === 'home') this.stats.foulsA++; else this.stats.foulsH++;
      if (this.rng() < 0.55) narrate(fresh, pos, att.club, null, this.minute, 'foulTxt', narrCtx);

      const inAttackingThird = pos.end.endsWith('-A');
      const penaltyAwarded = inAttackingThird && this.rng() < refereePenaltyProbability(0.08, this.referee);
      const restartType: 'free_kick' | 'penalty' = penaltyAwarded ? 'penalty' : 'free_kick';
      const setPieceRole: SetPieceRole = penaltyAwarded ? 'penalty' : inAttackingThird ? 'fkShort' : 'fkLong';
      const selectedTaker = selectSetPieceTaker(att.slots, att.tac.setPieces, setPieceRole);
      if (!selectedTaker) throw new Error(`A ${restartType} requires an available taker.`);
      const foulEvent = this.coreEventLog.append({
        type: 'FOUL_CALLED', side: owner, ...(pos.fouler ? { foulerId: pos.fouler.player.id } : {}),
        ...(pos.fouled ? { fouledId: pos.fouled.player.id } : {}), restartType, refereeId: this.referee.id,
        second: Math.max(0, Math.floor(this.clockSec)), minute: Math.floor(this.minute),
      });
      this.coreEventLog.append({
        type: 'RESTART_AWARDED', side: owner, restartType, takerId: selectedTaker.slot.player.id,
        takerSelection: selectedTaker.selection, refereeId: this.referee.id, sourceFoulEventId: foulEvent.id,
        second: Math.max(0, Math.floor(this.clockSec)), minute: Math.floor(this.minute),
      });
      fresh.push({ minute: this.minute, side: owner, text: penaltyAwarded ? `Hakem penaltı verdi — ${selectedTaker.slot.player.name} beyaz noktada.` : `Hakem serbest vuruş verdi — ${selectedTaker.slot.player.name} kullanacak.`, kind: 'info', path: pos.path, playerId: selectedTaker.slot.player.id });

      const keeper = resolveKeeper(att.defs);
      if (penaltyAwarded) {
        const shooterEff = (selectedTaker.slot.player.ratings.att + selectedTaker.slot.player.ratings.fiz) / 2;
        const keeperEff = keeper ? (keeper.player.ratings.kal ?? keeper.player.ratings.gen) : 50;
        const conversion = Math.max(0.62, Math.min(0.86, 0.76 + (shooterEff - keeperEff) * 0.002));
        const result = this.resolveRestartShot({ side: owner, zone: pos.end, taker: selectedTaker.slot, keeper, shotType: 'penalty', rawGoalProbability: conversion, saveShare: keeper ? 0.72 : 0, fresh });
        if (result.outcome === 'save' && this.rng() < 0.06) this.awardCorner(owner, att.slots, att.tac, pos.end, result.shotId, fresh);
      } else if (inAttackingThird && this.rng() < 0.35) {
        const setXG = Math.max(0.015, Math.min(0.09, 0.035 + (att.prof.setAtt - (owner === 'home' ? this.awayProf : this.homeProf).setDef) * 0.001));
        const rawGoalProbability = Math.max(0.01, Math.min(0.5, setXG * 0.7 * this.goalPaceMul));
        const result = this.resolveRestartShot({ side: owner, zone: pos.end, taker: selectedTaker.slot, keeper, shotType: 'free_kick', rawGoalProbability, saveShare: keeper ? 0.35 : 0, fresh });
        if (result.outcome === 'save' && this.rng() < 0.12) this.awardCorner(owner, att.slots, att.tac, pos.end, result.shotId, fresh);
      }

      const baseCardProbability = Math.min(0.5, (liveTac.press === 'high' ? 0.15 : 0.085) + (this.weather === 'yagmur' ? 0.02 : 0) + (coolActive ? 0.03 : 0));
      if (this.rng() < refereeCardProbability(baseCardProbability, this.referee)) {
        const eligibleDefenders = att.defs.filter(isActiveOnPitch);
        const culprit = pos.fouler && isActiveOnPitch(pos.fouler) ? pos.fouler : eligibleDefenders[Math.floor(this.rng() * Math.min(6, eligibleDefenders.length))];
        if (culprit && isActiveOnPitch(culprit)) {
          const directRed = this.rng() < this.referee.directRedChance;
          if (directRed) {
            culprit.sentOff = true;
            this.stopPlayerClock(culprit, this.clockSec);
            if (cardedSide === 'home') this.stats.redH++; else this.stats.redA++;
            this.stats.playerRows[culprit.player.id].red++;
            this.coreEventLog.append({ type: 'RED_CARD', side: cardedSide, playerId: culprit.player.id, reason: 'direct', refereeId: this.referee.id, second: Math.max(0, Math.floor(this.clockSec)), minute: Math.floor(this.minute) });
            this.suspensions.push({ playerId: culprit.player.id, matches: 3 });
            fresh.push({ minute: this.minute, side: cardedSide, text: `Direkt kırmızı kart! ${culprit.player.name} oyun dışı.`, kind: 'card', playerId: culprit.player.id, anim: { eventType: 'card', outcome: 'red-direct' } });
          } else {
            culprit.yellows++;
            if (cardedSide === 'home') this.stats.yellowH++; else this.stats.yellowA++;
            this.stats.playerRows[culprit.player.id].yellow++;
            this.coreEventLog.append({ type: 'YELLOW_CARD', side: cardedSide, playerId: culprit.player.id, refereeId: this.referee.id, second: Math.max(0, Math.floor(this.clockSec)), minute: Math.floor(this.minute) });
            if (culprit.yellows >= 2) {
              culprit.sentOff = true;
              this.stopPlayerClock(culprit, this.clockSec);
              if (cardedSide === 'home') this.stats.redH++; else this.stats.redA++;
              this.stats.playerRows[culprit.player.id].red++;
              this.coreEventLog.append({ type: 'RED_CARD', side: cardedSide, playerId: culprit.player.id, reason: 'second_yellow', refereeId: this.referee.id, second: Math.max(0, Math.floor(this.clockSec)), minute: Math.floor(this.minute) });
              this.suspensions.push({ playerId: culprit.player.id, matches: 1 });
              fresh.push({ minute: this.minute, side: cardedSide, text: `İkinci sarı → kırmızı! ${culprit.player.name} oyun dışı.`, kind: 'card', playerId: culprit.player.id, anim: { eventType: 'card', outcome: 'red' } });
              if (cardedSide === 'away') fresh.push({ minute: this.minute + 1, side: 'neutral' as 'home', text: 'Teknik direktör savunmayı sıkılaştırdı.', kind: 'info' });
            } else {
              fresh.push({ minute: this.minute, side: cardedSide, text: `Sarı kart: ${culprit.player.name}.`, kind: 'card', playerId: culprit.player.id, anim: { eventType: 'card', outcome: 'yellow' } });
            }
          }
        }
      }
    } else if (pos.outcome === 'turnover' && this.rng() < 0.3) {
      narrate(fresh, pos, att.club, null, this.minute, 'loss', narrCtx);
    } else if (pos.outcome === 'dangerous') {
      if (owner === 'home') this.stats.pressWinsA++; else this.stats.pressWinsH++;
      narrate(fresh, pos, att.club, null, this.minute, 'dangerous', narrCtx);
    } else if (pos.outcome === 'recycle' && this.rng() < 0.5) {
      narrate(fresh, pos, att.club, null, this.minute, 'buildup', narrCtx);
    } else if (pos.outcome === 'time' && this.rng() < 0.4) {
      narrate(fresh, pos, att.club, null, this.minute, 'time', narrCtx);
    }

    // Canlı yaralanma (§10.2)
    if (this.rng() < 0.008 * this.goalPaceMul) {
      const injSide: 'home' | 'away' = this.rng() < 0.5 ? 'home' : 'away';
      const line = injSide === 'home' ? this.homeLine : this.awayLine;
      const eligibleVictims = line.slots.filter(isActiveOnPitch);
      const vic = eligibleVictims[Math.floor(this.rng() * eligibleVictims.length)];
      if (vic && !vic.injured && !vic.sentOff) {
        const severity = this.rng() < 0.6 ? 'hafif' : this.rng() < 0.75 ? 'orta' : 'ağır';
        const days = severity === 'hafif' ? 3 + Math.floor(this.rng() * 10) : severity === 'orta' ? 14 + Math.floor(this.rng() * 30) : 60 + Math.floor(this.rng() * 120);
        vic.injured = true;
        vic.liveFitness = Math.min(vic.liveFitness, 30);
        this.stopPlayerClock(vic, this.clockSec);
        this.injuries.push({ playerId: vic.player.id, days });
        if (this.input.userSide !== injSide) this.injuryReturnAt.set(vic.player.id, this.clockSec + 120);
        fresh.push({ minute: this.minute, side: injSide, text: `Sakatlık: ${vic.player.name} oyuna devam edemiyor (${severity}).`, kind: 'injury', playerId: vic.player.id, anim: { eventType: 'injury', attackingTeamId: injSide === 'home' ? this.input.homeClub.id : this.input.awayClub.id, actors: [vic.player.id], outcome: severity } });
      }
    }

    this.coreEventLog.append({ type: 'POSSESSION_ENDED', side: owner, durationSeconds: elapsedSeconds, second: this.clockSec, minute: this.minute });
    fresh.forEach((e) => this.events.push(e));
    return fresh;
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    for (const slot of [...this.homeLine.slots, ...this.awayLine.slots]) this.stopPlayerClock(slot, this.clockSec);
    for (const [playerId, row] of Object.entries(this.stats.playerRows)) {
      const clock = this.playerClocks.get(playerId);
      row.min = clock ? Math.round(clock.playedSeconds / 60) : 0;
      row.endFit = clock ? Math.round(clock.fitnessCurrent * 10) / 10 : 0;
    }
    this.events.push({ minute: this.endMinute, text: 'Maç sona erdi.', kind: 'half' });
    this.coreEventLog.append({ type: 'FULL_TIME', second: Math.max(0, Math.floor(this.clockSec)), minute: this.endMinute });
    this.assertShotStatsMatchCore();
  }

  /** v0.9.11 — İtiraz yalnız aleyhte karar penceresinde açılır. */
  protest(side: 'home' | 'away'): { ok: boolean; carded: boolean; minute: number; reason?: string } {
    if (this.done) return { ok: false, carded: false, minute: this.minute, reason: 'Maç sona erdi.' };
    if (this.protestWindowUntil[side] < this.minute) return { ok: false, carded: false, minute: this.minute, reason: 'İtiraz için aleyhte hakem kararı bekleniyor.' };
    if (this.lastProtestMinute[side] + 10 > this.minute) return { ok: false, carded: false, minute: this.minute, reason: `${this.lastProtestMinute[side] + 10 - this.minute} dakika soğuma süresi var.` };
    this.lastProtestMinute[side] = this.minute; this.protestWindowUntil[side] = -1; this.protestBoostUntil[side] = this.minute + 10;
    this.recordCommand(side, 'PROTEST', {});
    const prof = side === 'home' ? this.homeProf : this.awayProf;
    prof.midfield = Math.min(100, prof.midfield + 15); prof.press = Math.min(100, prof.press + 15); prof.transition = Math.min(100, prof.transition + 15);
    const carded = this.rng() < 0.08;
    this.events.push({ minute: this.minute, side, text: carded ? 'Kenardan itiraz! Hakem menajere sarı kart gösterdi.' : 'Kenardan itiraz! Takımın mücadele gücü yükseldi.', kind: carded ? 'card' : 'info' });
    return { ok: true, carded, minute: this.minute };
  }
  protestLeft(side: 'home' | 'away'): boolean { return this.canProtest(side); }

  /** Tam maç sonucu (LiveMatch raporu için) — bitene kadar step() eder */
  finishNow(): MatchResult {
    while (!this.done) this.step();
    return this.toResult();
  }

  toResult(): MatchResult {
    if (!this.done) throw new Error('Maç bitmemiş — finishNow() çağır');
    const stats = { ...this.stats };
    const insights = buildInsights(stats, { home: this.input.homeClub, away: this.input.awayClub }, this.weather, {
      homeProf: this.homeProf, awayProf: this.awayProf, homeTac: this.homeTactic, awayTac: this.awayTactic,
    });
    return { seed: this.input.seed, stats, events: this.events, insights, injuries: this.injuries, suspensions: this.suspensions, shotsLog: this.shotsLog, referee: this.referee, aiDecisionTraces: [...this.aiDecisionTraces] };
  }
}
