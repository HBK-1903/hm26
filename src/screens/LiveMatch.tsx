// HM26 v0.9.11 — TV yayın skorbug, Phaser saha motoru, canlı telemetri ve kenar yönetimi.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DemoFixture, TacticPlan, TableRow } from '../types';
import type { EngineShot, MatchStats } from '../engine/engine';
import type { HeatPoint, PitchEvent, PitchRuntime, TeamDots } from '../components/assets/PhaserPitch';
import { pitchTeamColors } from '../components/assets/pitchPresentation';
import { toStadiumPoint } from '../engine/pitch-ai';
import { useGame, DemoMatchResult, DemoMatchEvent } from '../store/game';
import { MatchSession, TeamTalkChoice } from '../engine/session';
import { makeLiveCheckpoint, type LiveMatchCheckpoint } from '../engine/liveCheckpoint';
import { registerManagerYellow } from '../engine/discipline';
import { buildEngineInput, matchEventsToDemo } from '../engine/adapter';
import { aiDefaultTactic } from '../engine/tactics';
import { PresentationSpeed, presentationDelayMs, projectLiveMatch } from '../engine/adapters/liveProjection';
import { buildXgTimeline } from '../engine/analytics';
import { coachNoteAt, nextCoachCheckpoint } from '../engine/matchDay';
import { tacticalFamiliarity } from '../engine/tacticsStudio';
import { LIVE_CONSOLE_TABS } from './liveMatchConsole';
import type { ConsoleTab } from './liveMatchConsole';
import { clubById as clubByIdLive } from '../data/clubs';
import { Btn, Badge, Sheet } from '../components/ui/kit';
import { Crest } from '../components/assets/Crest';
import { GameIcon, ICONS } from '../components/icons';
import { clubById } from '../data/clubs';
import { MatchReport } from './MatchReport';
import { PostMatchInterview } from './PostMatchInterview';
import type { InterviewOption } from '../data/interview';
import { Suspense } from 'react';
import { lazyWithRecovery } from '../utils/lazyWithRecovery';
import { PitchFallback } from '../components/assets/PitchFallback';
import { audio } from '../audio/engine';
import { reactionFromBatch, recentLiveReactions, type LiveReaction } from '../engine/liveReaction';
import { isRedCard } from '../engine/matchPresentation';
import { LiveAtmosphere } from '../components/match/LiveAtmosphere';
// Phaser 1MB+ — yalnızca maçta yüklenir (§1.3 Hafif prensibi: ana pakette tutmaz)
const PhaserPitch = lazyWithRecovery(
  () => import('../components/assets/PhaserPitch').then((m) => ({ default: m.PhaserPitch })),
  'phaser-pitch',
  PitchFallback,
);

// SPEC (24 Eki): Dikey Saha Model A — motor bölge koordinatlarıyla birebir aynı kaynak
const ZONES: Record<string, { x: number; y: number }> = {
  'L-D': { x: 20, y: 82 }, 'C-D': { x: 50, y: 84 }, 'R-D': { x: 80, y: 82 },
  'L-M': { x: 20, y: 50 }, 'C-M': { x: 50, y: 50 }, 'R-M': { x: 80, y: 50 },
  'L-A': { x: 22, y: 18 }, 'C-A': { x: 50, y: 15 }, 'R-A': { x: 78, y: 18 },
};

export const LiveMatch: React.FC<{ fixture: DemoFixture; tacticIdx?: number; checkpoint?: LiveMatchCheckpoint; restoredSession?: MatchSession; onExit: () => void; onSaved?: () => void; onEndDay?: () => void }> = ({ fixture, tacticIdx = 0, checkpoint, restoredSession, onExit, onSaved, onEndDay }) => {
  const g = useGame();
  const savedView = checkpoint?.view;
  // Aşama 3 MOTOR §6.2: Maç artık önceden simüle edilmiyor — MatchSession gerçek zamanlı ilerliyor
  const sessionRef = useRef<MatchSession | null>(restoredSession ?? null);
  const [eventsShown, setEventsShown] = useState<DemoMatchEvent[]>(() => savedView?.events ?? []);
  const [finResult, setFinResult] = useState<DemoMatchResult | null>(null);
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState<PresentationSpeed>(savedView?.speed ?? 'x2');
  const [paused, setPaused] = useState(savedView?.paused ?? false);
  // Picker-induced pauses must not undo an explicit pause. If a checkpoint
  // reopens an already-visible picker, keep its saved paused state safely.
  const pausedBeforePicker = useRef(savedView?.paused ?? false);
  const [activeTab, setActiveTab] = useState<ConsoleTab>(savedView?.activeTab ?? 'pitch');
  const [pitchView, setPitchView] = useState<'pitch' | 'atmosphere'>(savedView?.pitchView ?? 'pitch');
  const [reaction, setReaction] = useState<{ cue: LiveReaction; sequence: number } | null>(null);
  const reactionSeen = useRef(0);
  const reactionSequence = useRef(0);
  const [heatEnabled, setHeatEnabled] = useState(savedView?.heatEnabled ?? false);
  const [heatTeam, setHeatTeam] = useState<'all' | 'home' | 'away'>(savedView?.heatTeam ?? 'all');
  const [heatSamples, setHeatSamples] = useState<HeatPoint[]>(() => savedView?.heatSamples ?? []);
  const [showTouchline, setShowTouchline] = useState(savedView?.showTouchline ?? false);
  const [showTeamTalk, setShowTeamTalk] = useState(savedView?.showTeamTalk ?? false);
  const [hapticsEnabled, setHapticsEnabled] = useState(() => { try { return localStorage.getItem('m26_match_haptics') !== 'off'; } catch { return true; } });
  const [crowdShoutUsed, setCrowdShoutUsed] = useState(savedView?.crowdShoutUsed ?? false);
  const [decision, setDecision] = useState<DemoMatchEvent | null>(savedView?.decision ?? null);
  const [showSubPicker, setShowSubPicker] = useState(savedView?.showSubPicker ?? false);
  const [showTacticPicker, setShowTacticPicker] = useState(savedView?.showTacticPicker ?? false);
  // Akış: canlı maç → kullanıcı isteğiyle röportaj → maç sonu analizi.
  const [phase, setPhase] = useState<'live' | 'interview' | 'report'>(savedView?.phase ?? 'live');
  const interviewChoiceRef = useRef<InterviewOption | null>(savedView?.interviewChoice ?? null);
  const feedRef = useRef<HTMLDivElement>(null);
  const managerSuspendedRef = useRef<boolean | null>(savedView?.managerSuspendedAtStart ?? null);
  const [managerCards, setManagerCards] = useState(savedView?.managerCards ?? 0);
  const [checkpointReady, setCheckpointReady] = useState(false);
  const [checkpointError, setCheckpointError] = useState(false);
  const [checkpointRetry, setCheckpointRetry] = useState(0);
  const [commitBusy, setCommitBusy] = useState(false);
  const commitBusyRef = useRef(false);
  const resultCommitted = useRef(false);
  // Maç döngüsü beklenmedik bir hatayla donarsa kullanıcıyı ekranda kilitlememek için kurtarma durumu
  const [loopError, setLoopError] = useState<unknown>(null);
  const lastDecisionShown = useRef(savedView?.lastDecisionShown ?? '');
  const lastAudioEvent = useRef<DemoMatchEvent | null>(null);
  const teamTalkPromptShown = useRef(savedView?.teamTalkPromptShown ?? false);
  // Dalga 5: antrenör notu kontrol noktaları (45/75/90) her maçta bir kez düşer
  const coachFiredRef = useRef<Set<number>>(new Set(savedView?.coachFired ?? []));
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(media.matches);
    update();
    if (media.addEventListener) media.addEventListener('change', update);
    else media.addListener?.(update);
    return () => { if (media.removeEventListener) media.removeEventListener('change', update); else media.removeListener?.(update); };
  }, []);
  const reducedMotion = !!g.career.settings.reduceMotion || systemReducedMotion;
  if (managerSuspendedRef.current === null) managerSuspendedRef.current = (g.career.managerSuspendedMatches ?? 0) > 0;
  const managerSuspendedAtStart = managerSuspendedRef.current;

  const mySide: 'home' | 'away' = fixture.homeId === g.myClub.id ? 'home' : 'away';
  if (!sessionRef.current) {
    const homeId = fixture.homeId, awayId = fixture.awayId;
    const seed = 20260803 + fixture.day * 101 + homeId.length * 13;
    const homeClub = clubByIdLive(homeId), awayClub = clubByIdLive(awayId);
    const myTactic = g.tactics[tacticIdx] ?? g.tactics[0] ?? aiDefaultTactic(mySide === 'home' ? homeClub : awayClub, mySide === 'home' ? awayClub : homeClub);
    sessionRef.current = new MatchSession(buildEngineInput({
      homeClub, awayClub,
      homeSquad: g.squads[homeId] ?? [], awaySquad: g.squads[awayId] ?? [],
      // Kullanıcının planı deplasmanda rakibe değil kendi takımına uygulanır.
      homeTactic: mySide === 'home' ? myTactic : aiDefaultTactic(homeClub, awayClub),
      awayTactic: mySide === 'away' ? myTactic : undefined,
      seed,
      settings: g.career.settings,
      derby: clubByIdLive(homeId).derby === awayId,
      userSide: mySide, // Dalga 5: AI otomatik değişiklik kullanıcı tarafına karışmaz
      challengeClubId: g.career.clubId,
      challengePoints: g.career.manager.challengePoints,
      riskIds: g.riskPlayIds ?? [], // v0.9.9: iğneyle oynatma onaylılar kadroya alınır
    }));
  }
  const session = sessionRef.current;

  // Persist each rendered boundary (including pending decisions and commands)
  // before allowing the next simulation step. A failed or conflicting write
  // freezes play instead of pretending that the latest point is safe.
  useLayoutEffect(() => {
    let active = true;
    setCheckpointReady(false);
    try {
      const next = makeLiveCheckpoint(session, fixture, g.seasonNo, tacticIdx, {
        events: eventsShown, speed, paused, activeTab, pitchView, heatEnabled, heatTeam, heatSamples,
        showTouchline, showTeamTalk, teamTalkPromptShown: teamTalkPromptShown.current, crowdShoutUsed,
        decision, lastDecisionShown: lastDecisionShown.current, showSubPicker, showTacticPicker,
        coachFired: [...coachFiredRef.current], phase, interviewChoice: interviewChoiceRef.current,
        managerSuspendedAtStart, managerCards,
      });
      void g.saveLiveCheckpoint(next).then((saved) => {
        if (!active) return;
        setCheckpointError(!saved);
        setCheckpointReady(saved);
      }).catch(() => { if (active) { setCheckpointError(true); setCheckpointReady(false); } });
    } catch (error) {
      console.error('[hm26] canlı maç kaydı oluşturulamadı:', error);
      setCheckpointError(true);
    }
    return () => { active = false; };
    // g's action is stable; depending on the provider object would save forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fixture, tacticIdx, tick, eventsShown, speed, paused, activeTab, pitchView, heatEnabled, heatTeam, heatSamples, showTouchline, showTeamTalk, crowdShoutUsed, decision, showSubPicker, showTacticPicker, phase, managerCards, checkpointRetry]);

  const projection = projectLiveMatch(session);
  const done = projection.status === 'complete';
  const clockMinute = projection.clock.minute;
  const clockSecond = projection.clock.second;

  // Dalga 5: maç içi teknik direktör notları — sunum katmanı, motor sonucuna karışmaz
  useEffect(() => {
    const cp = nextCoachCheckpoint(clockMinute);
    if (cp === null || coachFiredRef.current.has(cp)) return;
    coachFiredRef.current.add(cp);
    const slots = session.getSlots(mySide);
    const meanFitness = slots.length ? slots.reduce((x, s) => x + s.liveFitness, 0) / slots.length : 100;
    const reds = slots.filter((s) => s.sentOff).length;
    const plan = g.tactics[tacticIdx] ?? g.tactics[0];
    const fam = tacticalFamiliarity(plan);
    const myGoals = mySide === 'home' ? projection.score.home : projection.score.away;
    const oppGoals = mySide === 'home' ? projection.score.away : projection.score.home;
    const note = coachNoteAt({
      checkpoint: cp, myGoals, oppGoals,
      familiarityPercent: fam.percent, stamped: !!plan.familiarityFormation,
      meanFitness, reds,
    });
    if (note) {
      setEventsShown((ev) => [...ev, { minute: clockMinute, side: mySide, kind: 'coach', text: note.text }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockMinute]);
  const liveStats: MatchStats = projection.stats;
  const gh = projection.score.home, ga = projection.score.away;
  // Son 5 dakikanın topa sahip olma, pres kazanımı, şut ve xG bileşimi.
  const momentum = projection.momentum;
  const currentEvent = eventsShown[eventsShown.length - 1];
  const lastGoal = [...eventsShown].reverse().find((e) => e.kind === 'goal');
  // Keep several recent real cues visible even when one simulation step contains
  // more than one notable event or playback is too fast for every animation.
  const recentReactions = useMemo(() => recentLiveReactions(eventsShown, mySide, fixture.homeId, fixture.awayId),
    [eventsShown, mySide, fixture.homeId, fixture.awayId]);
  // Read only newly displayed real events, including a final batch that also
  // contains the whistle. The scene freezes at full time but retains that cue.
  useEffect(() => {
    if (eventsShown.length < reactionSeen.current) reactionSeen.current = 0;
    const fresh = eventsShown.slice(reactionSeen.current);
    reactionSeen.current = eventsShown.length;
    const cue = reactionFromBatch(fresh, mySide, fixture.homeId, fixture.awayId);
    if (cue) setReaction({ cue, sequence: ++reactionSequence.current });
  }, [eventsShown, mySide, fixture.homeId, fixture.awayId]);
  useEffect(() => {
    if (!reaction || paused || done) return;
    const timeout = window.setTimeout(() => setReaction(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [reaction, paused, done]);
  const pitchRuntime: PitchRuntime = projection.ball;
  const playerRating = (slot: any) => {
    const row = liveStats.playerRows?.[slot.player.id];
    const raw = (row?.rating ?? 6.2) - (slot.liveFitness < 40 ? 0.45 : slot.liveFitness < 55 ? 0.2 : 0) - (slot.yellows ? 0.15 : 0);
    return Math.max(5, Math.min(10, Math.round(raw * 10) / 10));
  };
  const buildDots = (side: 'home' | 'away'): TeamDots => {
    const teamTactic = session.getTactic(side);
    const c = clubById(side === 'home' ? fixture.homeId : fixture.awayId);
    const shout = session.getTouchlineState(side);
    return {
      side, formation: teamTactic?.formation ?? '4-4-2',
      color1: c.color1, color2: c.color2, width: teamTactic?.width ?? 55,
      defLine: teamTactic?.defLine ?? 'normal',
      pressing: (teamTactic?.press === 'high' || shout.pumpActive) && pitchRuntime.owner !== side,
      players: session.getSlots(side).map((slot: any, i: number) => ({
        id: slot.player.id, name: slot.player.name, kitNumber: slot.player.kitNumber ?? i + 1, group: slot.slotGroup,
        fitness: slot.liveFitness, rating: playerRating(slot), yellow: slot.yellows,
        red: liveStats.playerRows?.[slot.player.id]?.red ?? 0, sentOff: slot.sentOff, injured: slot.injured,
      })),
    };
  };
  const homeDots = buildDots('home'), awayDots = buildDots('away');
  const touchline = session.getTouchlineState(mySide);

  // §6.1 Maç hızı yalnızca sunum hızı — motor her adımda tam possession hesaplar
  // §15.1: maç başında tribün başlatılar, bitince durdurulur (derbi ilk önce)
  React.useEffect(() => {
    audio.unlock();
    const isDerby = (clubById(fixture.homeId).derby === fixture.awayId || clubById(fixture.awayId).derby === fixture.homeId);
    if (!session.done) audio.startCrowd(isDerby);
    if (!checkpoint) audio.play('whistle-start');
    return () => { audio.stopCrowd(); };
  }, []);

  // Maç sonucu rapor formatına çevirir — normal bitiş ve kurtarma yolu aynı eşlemi kullanır
  const buildFinResult = (rr: ReturnType<typeof session.toResult>): DemoMatchResult => ({
    homeId: fixture.homeId, awayId: fixture.awayId, hg: rr.stats.hg, ag: rr.stats.ag,
    events: matchEventsToDemo(rr.events), // son düdük ve kurtarma dahil oturumun gerçek olayları
    xgHome: rr.stats.xgH, xgAway: rr.stats.xgA, posHome: rr.stats.posH,
    shotsH: rr.stats.shotsH, shotsA: rr.stats.shotsA, shotsOnH: rr.stats.onH, shotsOnA: rr.stats.onA,
    insights: rr.insights,
    // Dalga 2 (§5-D): gerçek istatistikler + vuruş haritası + karne
    cornersH: rr.stats.cornersH, cornersA: rr.stats.cornersA, foulsH: rr.stats.foulsH, foulsA: rr.stats.foulsA,
    yellowH: rr.stats.yellowH, yellowA: rr.stats.yellowA, redH: rr.stats.redH, redA: rr.stats.redA,
    savesH: rr.stats.savesH, savesA: rr.stats.savesA,
    wideH: rr.stats.wideAttH, wideA: rr.stats.wideAttA, centralH: rr.stats.centralAttH, centralA: rr.stats.centralAttA,
    pressWinsH: rr.stats.pressWinsH, pressWinsA: rr.stats.pressWinsA,
    shotsLog: rr.shotsLog.map((s) => { const z = ZONES[s.zone] ?? ZONES['C-M']; return s.side === 'home' ? { minute: s.minute, side: s.side, x: z.x, y: z.y, xg: s.xg, outcome: s.outcome } : { minute: s.minute, side: s.side, x: 100 - z.x, y: 96 - z.y, xg: s.xg, outcome: s.outcome }; }),
    playerRows: JSON.parse(JSON.stringify(rr.stats.playerRows)),
    injuries: rr.injuries.map((injury) => ({ ...injury })),
    suspensions: rr.suspensions.map((suspension) => ({ ...suspension })),
    ...(rr.referee ? { referee: { label: rr.referee.label, strictness: rr.referee.strictness } } : {}),
  });
  const finalizeFromSession = () => setFinResult(buildFinResult(session.toResult()));

  useEffect(() => {
    if (paused || done || !checkpointReady || checkpointError) return;
    const t = setTimeout(() => {
      try {
        const fresh = session.step();
        // Bir adım devre düdüğüyle birlikte başka olaylar da üretebilir; son satıra bakmak düdüğü kaçırır.
        if (fresh.some((event) => event.kind === 'half' && event.minute === 45)) audio.play('whistle-half');
        const ballSample = session.getBallState();
        const heatPoint = toStadiumPoint(ballSample.owner, { x: ballSample.x, y: ballSample.y });
        setHeatSamples((previous) => [...previous, { ...heatPoint, side: ballSample.owner }].slice(-1200));
        if (fresh.length) setEventsShown((ev) => [...ev, ...matchEventsToDemo(fresh)]);
        // React state is only a render trigger; score, clock and stats are read from the engine projection.
        setTick((prev) => prev + 1);
        if (session.done) finalizeFromSession();
      } catch (err) {
        // Tek bir adımın patlaması tüm maç döngüsünü sessizce dondurmasın: dur ve kullanıcıya kurtarma ver
        console.error('[hm26] canlı maç adımı hatası:', err);
        setPaused(true);
        setLoopError(err);
      }
    }, presentationDelayMs(speed));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, paused, done, speed, checkpointReady, checkpointError]);

  // Kurtarma: motoru kalan dakikaları simüle ederek güvenle bitir ve rapora geç
  const recoverMatch = () => {
    try {
      const seenEngineEvents = session.getEvents().length;
      session.finishNow();
      // Recovery can simulate most of a match in one go; keep the visible feed in sync too.
      const remainingEvents = session.getEvents().slice(seenEngineEvents);
      if (remainingEvents.length) setEventsShown((shown) => [...shown, ...matchEventsToDemo(remainingEvents)]);
      finalizeFromSession();
      setLoopError(null);
    } catch (err) {
      // Motor da bitiremezse kullanıcıyı ekran başında kilitleme: maçtan güvenli çıkış
      console.error('[hm26] maç kurtarma başarısız:', err);
      onExit();
    }
  };

  // Garanti: motor tamam dediği halde sonuç nesnesi herhangi bir nedenle üretilmediyse burada üret
  useEffect(() => {
    if (done && !finResult) {
      try { finalizeFromSession(); } catch (err) { console.error('[hm26] sonuç üretme hatası:', err); setLoopError(err); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // v0.9.9: akış açılış satırı — 'Maç başladı' kurucuya itilir ama step() onu hiç döndürmezdi (akış bomboş başlıyordu)
  useEffect(() => {
    const start = session.getEvents();
    if (start.length) setEventsShown((ev) => ev.length ? ev : matchEventsToDemo(start));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ses ve haptik profilleri; sistem/oyun azaltılmış hareket ayarı titreşimi ve kamera efektlerini kapatır.
  useEffect(() => {
    const e = currentEvent;
    if (!e || lastAudioEvent.current === e) return;
    lastAudioEvent.current = e;
    const vibrate = (pattern: number | number[]) => {
      if (!hapticsEnabled || reducedMotion || typeof navigator === 'undefined' || !navigator.vibrate) return;
      try { navigator.vibrate(pattern); } catch { /* platform unsupported: silent fallback */ }
    };
    if (e.kind === 'goal') { audio.play('goal'); vibrate([90, 40, 160, 50, 220]); }
    if (e.anim?.eventType === 'line_clearance') vibrate([80, 40, 150]);
    if (e.kind === 'card') { audio.play('card'); vibrate(45); }
    if (e.kind === 'var') { audio.play('var'); vibrate([30, 80, 30]); }
    if (e.kind === 'injury') vibrate([35, 75, 35]);
    if (e.kind === 'save') { audio.pulseCrowd(0.6); vibrate(25); }
    if (e.anim?.eventType === 'woodwork') { audio.play('woodwork'); vibrate(60); }
    if (e.anim?.eventType === 'volley') { audio.play('nudge'); if (e.kind !== 'goal') vibrate(25); }
    if (e.anim?.eventType === 'shot' && e.kind !== 'goal' && e.kind !== 'save') { audio.play('nudge'); vibrate(25); }
    if (e.kind === 'half' && e.minute >= 90) { audio.play('whistle-end'); audio.stopCrowd(); }
  }, [currentEvent, hapticsEnabled, reducedMotion]);


  useEffect(() => { feedRef.current?.scrollTo?.({ top: feedRef.current.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' }); }, [eventsShown.length, activeTab, reducedMotion]);

  // VAR/kart ve kullanıcı tarafı sakatlıklarında karar; devrede tek seferlik team talk.
  useEffect(() => {
    if (paused || done || decision) return;
    const last = currentEvent;
    if (last) {
      // Injury events also describe a player's return from treatment. Only an
      // actually injured, active roster slot needs a new manager decision.
      const injuredSlot = last.kind === 'injury' && last.side === mySide && last.playerId
        ? session.getSlots(mySide).find((slot) => slot.player.id === last.playerId)
        : undefined;
      const needsDecision = last.kind === 'card' || last.kind === 'var' || !!injuredSlot?.injured;
      const key = `${last.minute}:${last.kind}:${last.text}`;
      if (needsDecision && lastDecisionShown.current !== key) {
        lastDecisionShown.current = key;
        setPaused(true); setDecision(last); return;
      }
    }
    // Devre düdüğü bir step() partisinin ortasında kalabilir. Önceki karar varsa
    // kapandıktan sonra da 45' düdüğünü bulup konuşmayı tam bir kez aç.
    if (!teamTalkPromptShown.current && eventsShown.some((event) => event.kind === 'half' && event.minute === 45)) {
      teamTalkPromptShown.current = true; setPaused(true); setShowTeamTalk(true);
    }
  }, [eventsShown, currentEvent, paused, done, decision, mySide]);

  const checkpointNotice = <div data-testid="live-checkpoint-status" role={checkpointError ? 'alert' : 'status'} className={`shrink-0 px-3 py-1 text-[10px] ${checkpointError ? 'bg-danger/15 text-danger' : 'bg-base text-muted'}`}>
    {checkpointError ? <>Maçın son durumu kaydedilemedi; akış durduruldu. Yenilersen son güvenli noktaya dönersin. <button type="button" className="min-h-[32px] underline font-bold" onClick={() => setCheckpointRetry((n) => n + 1)}>Tekrar dene</button></> : checkpointReady ? 'Maç ilerlemesi kaydedildi.' : 'Maç ilerlemesi kaydediliyor…'}
  </div>;

  // Not: düdükten sonra otomatik geçiş YOK. Kullanıcı ekranı incelemeye devam eder.
  if (phase === 'interview' && finResult) {
    return <div className="h-full min-h-0 flex flex-col">{checkpointNotice}<div className="flex-1 min-h-0"><PostMatchInterview result={finResult} fixture={fixture} onChoose={(opt) => { interviewChoiceRef.current = opt; setPhase('report'); }} /></div></div>;
  }
  if (phase === 'report' && finResult) {
    const finish = async (endDay: boolean) => {
      if (commitBusyRef.current || (!resultCommitted.current && (!checkpointReady || checkpointError))) return;
      commitBusyRef.current = true; setCommitBusy(true);
      try {
        if (!resultCommitted.current) {
          // Result, discipline, injury risk and checkpoint removal are one career snapshot.
          g.playLeagueMatch(fixture, finResult, tacticIdx, interviewChoiceRef.current ?? undefined, { managerCards, managerSuspendedAtStart });
          resultCommitted.current = true;
        }
        const saved = await g.saveNow();
        if (saved) { if (endDay && onEndDay) onEndDay(); else (onSaved ?? onExit)(); }
      } finally { commitBusyRef.current = false; setCommitBusy(false); }
    };
    return <div className="h-full min-h-0 flex flex-col">{checkpointNotice}{commitBusy && <div role="status" className="px-3 text-[11px] text-amber">Sonuç kaydediliyor…</div>}<div className="flex-1 min-h-0"><MatchReport
      result={finResult}
      fixture={fixture}
      saveDisabled={commitBusy || (!resultCommitted.current && (!checkpointReady || checkpointError))}
      onDone={() => { void finish(false); }}
      onEndDay={onEndDay ? () => { void finish(true); } : undefined}
    /></div></div>;
  }

  const home = clubById(fixture.homeId);
  const away = clubById(fixture.awayId);
  const pitchColors = pitchTeamColors(homeDots, awayDots);
  const derbyMatch = home.derby === fixture.awayId || away.derby === fixture.homeId;
  const scorerName = lastGoal?.scorerId ? g.playerOf(lastGoal.scorerId)?.name : null;
  const assisterName = lastGoal?.assisterId ? g.playerOf(lastGoal.assisterId)?.name : null;

  const pitchEvent: PitchEvent | null = currentEvent ? {
    path: currentEvent.path as any, kind: (['goal', 'save', 'card', 'var'].includes(currentEvent.kind) ? currentEvent.kind : 'chance') as PitchEvent['kind'],
    side: currentEvent.side, color: currentEvent.kind === 'card' ? (isRedCard(currentEvent) ? '#ef4444' : '#f3c64e') : undefined,
    actors: currentEvent.anim?.actors ?? currentEvent.visualActors ?? pitchRuntime.activeIds,
    actionType: currentEvent.anim?.eventType ?? currentEvent.visualEvent ?? (derbyMatch && currentEvent.kind === 'card' ? 'brawl' : undefined),
    highBall: pitchRuntime.z > 0, minute: currentEvent.minute, sequence: eventsShown.length, reduceMotion: reducedMotion, brawl: derbyMatch && currentEvent.kind === 'card',
  } : null;
  const Pitch = (
    <div className="relative w-full mx-auto flex justify-center">
      <div className="relative w-full max-w-[330px] h-[40vh] min-h-[290px] max-h-[360px] rounded-2xl overflow-hidden border border-[#55765d] shadow-[0_12px_35px_rgba(0,0,0,.28)]">
        <Suspense fallback={<div className="w-full h-full rounded-2xl bg-[#234d32] animate-pulse" />}>
          <PhaserPitch event={pitchEvent} homeDots={homeDots} awayDots={awayDots} runtime={pitchRuntime} momentum={momentum} heatPoints={heatSamples} heatEnabled={heatEnabled} heatTeam={heatTeam}
            paused={paused || done} completed={done} reduceMotion={reducedMotion} stepMs={presentationDelayMs(speed)} />
        </Suspense>
        <div className="absolute top-1.5 left-2 flex gap-2 rounded-md bg-[#102219]/85 px-1.5 py-1 text-[8px] font-black text-[#fff8e5] pointer-events-none" aria-label={`Sahadaki takım renkleri: ${home.short} ve ${away.short}${pitchColors.alternateAway ? ', deplasman ikinci forması' : ''}`}>
          {([[home.short, pitchColors.home], [away.short, pitchColors.away]] as const).map(([name, color], index) => <span key={`${name}-${index}`} className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full border" style={{ background: color.fill, borderColor: color.outline }} />{name}</span>)}
        </div>
        {paused && !done && <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none"><Badge kind="warn">DURAKLATILDI</Badge></div>}
      </div>
    </div>
  );

  // v0.9.9: eski maxHeight:210 buton şeridinin üstüne taşıyordu ve tam-akış modunda ekran bomboş kalıyordu
  // → akış artık kendisine ayrılan dikey alanın tamamını doldurur, mod daraltmasına göre pencere açılır
  const Feed = (
    <div ref={feedRef} className="h-full w-full overflow-y-auto no-scrollbar" role="log" aria-live="polite" aria-label="Maç olay akışı">
      <div className="space-y-1.5">
        {eventsShown.slice(-40).map((e, i) => (
          e.kind === 'coach' ? (
            <div key={`${e.minute}-${i}`} data-coach-note className="flex gap-2 text-[12px] leading-snug m26-in bg-info/10 border border-info/40 rounded-lg px-2.5 py-2">
              <span className="num shrink-0 w-8 text-info font-bold">{e.minute}'</span>
              <span className="flex-1">
                <span className="inline-block text-[8.5px] font-black tracking-wider bg-info/25 text-info rounded px-1 py-px mr-1.5 align-middle">TD</span>
                <span className="text-primary/95 align-middle">{e.text}</span>
              </span>
            </div>
          ) : (
          <div key={`${e.minute}-${i}`} className={`flex gap-2 text-[12px] leading-snug m26-in ${e.kind === 'goal' ? 'bg-amber/15 border border-amber/50 rounded-lg px-2 py-1.5' : e.kind === 'half' ? 'text-muted' : ''}`}>
            <span className={`num shrink-0 w-8 ${e.kind === 'goal' ? 'text-amber font-bold' : 'text-muted'}`}>{e.minute}'</span>
            <span className={e.kind === 'goal' ? 'text-amber font-bold flex-1' : e.kind === 'save' ? 'text-info' : e.kind === 'card' ? 'text-warn' : e.kind === 'var' ? 'text-special' : 'text-primary/90'}>{e.text}</span>
          </div>
          )
        ))}
        {eventsShown.length === 0 && <div className="text-muted text-[11.5px] italic px-1 py-2">Yayın bağlanıyor — ilk gelişme bir dakika içinde akışa düşer…</div>}
        {!done && !paused && eventsShown.length > 0 && <div className="text-muted text-[11px] italic px-1">…canlı yayın devam ediyor</div>}
      </div>
    </div>
  );

  const quickMentality = (kind: 'protect' | 'balanced' | 'attack' | 'allin') => {
    const base = g.tactics[tacticIdx] ?? g.tactics[0] ?? aiDefaultTactic(clubByIdLive(g.myClub.id), clubByIdLive(mySide === 'home' ? fixture.awayId : fixture.homeId));
    const patch: Partial<TacticPlan> = kind === 'protect'
      ? { name: 'Skoru Koru', plan: 'dusukBlok', press: 'low', tempo: 'low', defLine: 'deep', passRisk: 'safe', fbAdvanced: false }
      : kind === 'balanced' ? { name: 'Dengeli', plan: 'dengeli', press: 'mid', tempo: 'mid', defLine: 'normal', passRisk: 'mid' }
      : kind === 'attack' ? { name: 'Hücum', plan: 'kanat', press: 'high', tempo: 'high', defLine: 'high', passRisk: 'direct', fbAdvanced: true }
      : { name: 'Tam Hücum', plan: 'yuksekPres', press: 'high', tempo: 'high', defLine: 'high', passRisk: 'direct', fbAdvanced: true };
    session.queueTactic(mySide, { ...base, ...patch });
    setEventsShown((ev) => [...ev, { minute: session.getMinute(), side: mySide, kind: 'info', text: `Kenar komutu: ${patch.name} zihniyetine geçiş istendi.` }]);
    setPaused(false);
    setTick((v) => v + 1);
  };
  const triggerShout = (command: 'pump' | 'cool') => {
    const r = session.useShout(mySide, command); if (!r.ok) return;
    setEventsShown((ev) => [...ev, { minute: session.getMinute(), side: mySide, kind: 'info', text: command === 'pump' ? 'Kenardan: Yüklenin! Pres ve tempo 15 dakika yükseldi; kondisyon kaybı arttı.' : 'Kenardan: Tempoyu düşürün. Güvenli pas ve kontrollü oyun devrede.' }]);
    setTick((v) => v + 1);
  };
  let projectedDiscipline = { managerYellowCards: g.career.managerYellowCards ?? 0, managerSuspendedMatches: g.career.managerSuspendedMatches ?? 0 };
  for (let i = 0; i < managerCards; i++) projectedDiscipline = registerManagerYellow(projectedDiscipline.managerYellowCards, projectedDiscipline.managerSuspendedMatches);
  const triggerProtest = () => {
    const r = session.protest(mySide); if (!r.ok) return;
    // Keep cards inside the checkpoint until the result is atomically committed;
    // replaying a protest must not apply the career penalty a second time.
    const discipline = r.carded ? registerManagerYellow(projectedDiscipline.managerYellowCards, projectedDiscipline.managerSuspendedMatches) : null;
    if (r.carded) setManagerCards((count) => count + 1);
    const text = r.carded ? discipline?.banned ? 'Menajer ikinci sarısını gördü; sonraki maçta teknik alanda bulunamayacak.' : 'Hakem itiraz nedeniyle menajere sarı kart gösterdi.' : 'İtirazın ardından takımın hırsı ve mücadele gücü yükseldi.';
    setEventsShown((ev) => [...ev, { minute: r.minute, side: mySide, kind: r.carded ? 'card' : 'info', text }]);
    setTick((v) => v + 1);
  };
  const triggerCrowd = () => {
    if (mySide !== 'home' || crowdShoutUsed || done) return;
    setCrowdShoutUsed(true); audio.pulseCrowd(1);
    setEventsShown((ev) => [...ev, { minute: session.getMinute(), side: mySide, kind: 'info', text: 'Tribünü ateşledin — stadyum atmosferi yükseldi.' }]);
  };
  const resolveTeamTalk = (choice: TeamTalkChoice) => {
    if (!session.applyTeamTalk(mySide, choice)) return;
    const text = choice === 'fight' ? 'Devre arası: hırslı konuşma seçildi; baskı ve son bölge etkinliği yükseldi.' : choice === 'calm' ? 'Devre arası: sakin konuşma seçildi; pas ve oyun kurma desteği yükseldi.' : 'Devre arası: menajer sessiz kaldı.';
    setEventsShown((ev) => [...ev, { minute: 45, side: mySide, kind: 'info', text }]);
    setShowTeamTalk(false); setPaused(false); setTick((v) => v + 1);
  };
  const waitForInjuryReturn = () => {
    if (!decision?.playerId || !session.waitForInjuredPlayer(decision.playerId)) { setDecision(null); setPaused(false); return; }
    setEventsShown((ev) => [...ev, { minute: session.getMinute(), side: decision.side, kind: 'info', playerId: decision.playerId, text: 'Tedavi kararı: iki maç dakikası 10 kişi beklenecek.' }]);
    setDecision(null); setPaused(false); setTick((v) => v + 1);
  };
  const tiredAny = !done && clockMinute >= 60 && session.getSlots(mySide).some((s) => s.slotGroup !== 'GK' && s.liveFitness < 62);
  const Controls = (
    <div className="flex flex-col gap-1.5">
      {tiredAny && session.subsLeft(mySide) > 0 && session.windowsLeft(mySide) > 0 && <button onClick={() => { pausedBeforePicker.current = paused; setPaused(true); setShowSubPicker(true); }} className="w-full min-h-[44px] bg-[#523f1e] border border-[#d3a64b] text-[#f7d782] rounded-xl px-3 text-[11.5px] font-bold text-left">⚠ Kondisyon düşük (dk {clockMinute}) — akıllı değişiklik önerisi</button>}
      <div className="grid grid-cols-2 gap-1.5">
        <Btn variant="secondary" className="!min-h-[44px] !px-2 !text-[11px]" onClick={() => { pausedBeforePicker.current = paused; setPaused(true); setShowSubPicker(true); }} disabled={done || session.subsLeft(mySide) <= 0 || session.windowsLeft(mySide) <= 0} aria-label="Oyuncu değişikliği">⇄ Değişiklik · {session.subsLeft(mySide)} hak</Btn>
        <Btn variant="secondary" className="!min-h-[44px] !px-2 !text-[11px]" onClick={() => { pausedBeforePicker.current = paused; setPaused(true); setShowTacticPicker(true); }} disabled={done}>Plan değiştir</Btn>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => triggerShout('pump')} disabled={done || managerSuspendedAtStart || touchline.pumpCooldown > 0} className="min-h-[44px] rounded-xl border border-[#9e6b2b] bg-[#463519] text-[#ffe09b] text-[10px] font-bold disabled:opacity-45" aria-label="Yüksek pres talimatı">⚡ {touchline.pumpActive ? `Yüksek pres ${touchline.pumpRemaining}′` : 'Yüklenin'}{touchline.pumpCooldown > 0 ? ` · ${touchline.pumpCooldown}′` : ' · 15′'}</button>
        <button onClick={() => triggerShout('cool')} disabled={done || managerSuspendedAtStart || touchline.coolCooldown > 0} className="min-h-[44px] rounded-xl border border-[#4a7083] bg-[#203d49] text-[#c5eaff] text-[10px] font-bold disabled:opacity-45" aria-label="Tempoyu düşür talimatı">◌ {touchline.coolActive ? `Kontrollü oyun ${touchline.coolRemaining}′` : 'Tempoyu düşür'}{touchline.coolCooldown > 0 ? ` · ${touchline.coolCooldown}′` : ' · 15′'}</button>
        <button onClick={triggerProtest} disabled={done || managerSuspendedAtStart || !touchline.protestAvailable} className="min-h-[44px] rounded-xl border border-[#815b42] bg-[#392a22] text-[#ffceb0] text-[10px] font-bold disabled:opacity-45" aria-label="Aleyhte hakem kararına itiraz">🗣 {managerSuspendedAtStart ? 'Menajer cezalı' : touchline.protestCooldown ? `İtiraz · ${touchline.protestCooldown}′` : touchline.protestAvailable ? 'İtiraz et' : 'Karar bekleniyor'}</button>
        <button onClick={triggerCrowd} disabled={done || mySide !== 'home' || crowdShoutUsed} className="min-h-[44px] rounded-xl border border-[#586d8a] bg-[#233449] text-[#d5e7ff] text-[10px] font-bold disabled:opacity-45" aria-label="Tribünü ateşle">🔥 {mySide !== 'home' ? 'Ev sahibi komutu' : crowdShoutUsed ? 'Tribün ateşlendi' : 'Tribünü ateşle'}</button>
      </div>
      <div className="grid grid-cols-4 gap-1" aria-label="Hızlı zihniyet seçimi">
        {([['protect', 'Skoru koru'], ['balanced', 'Dengeli'], ['attack', 'Hücum'], ['allin', 'Tam hücum']] as const).map(([key, label]) => <button key={key} onClick={() => quickMentality(key)} disabled={done || managerSuspendedAtStart} className="min-h-[44px] rounded-lg border border-line bg-surface text-primary text-[10px] font-bold disabled:opacity-45">{label}</button>)}
      </div>
      <button type="button" role="switch" aria-checked={hapticsEnabled} aria-label="Maç haptikleri" onClick={() => setHapticsEnabled((enabled) => { const next = !enabled; try { localStorage.setItem('m26_match_haptics', next ? 'on' : 'off'); } catch { /* storage optional */ } return next; })} className="min-h-[44px] rounded-xl border border-line bg-surface px-3 text-left text-[10px] text-primary">📳 Haptikler {hapticsEnabled ? 'Açık' : 'Kapalı'}{reducedMotion ? ' · Azaltılmış hareket ayarı titreşimi engelliyor' : ''}</button>
      {projectedDiscipline.managerYellowCards > 0 && <div className="text-[10px] text-[#f4d079] px-1">Menajer kartı: 🟨 {projectedDiscipline.managerYellowCards}/2 — ikinci sarı sonraki maç tribünü demek.</div>}
      {managerSuspendedAtStart && <div className="text-[10px] text-[#f4d079] px-1">Menajer tribünde: kenar komutları devre dışı.</div>}
    </div>
  );

  const shotLog = session.getShotsLog();
  const leagueId = fixture.league ?? g.myLeague;
  const baseTable: TableRow[] = g.table?.[leagueId] ?? [];
  const oldPosition = new Map(baseTable.map((row, index) => [row.clubId, index + 1]));
  const projectedTable = baseTable.map((row) => ({ ...row }));
  if (fixture.comp === 'lig' && !fixture.played) {
    const homeRow = projectedTable.find((row) => row.clubId === fixture.homeId);
    const awayRow = projectedTable.find((row) => row.clubId === fixture.awayId);
    if (homeRow && awayRow) {
      homeRow.p++; homeRow.gf += gh; homeRow.ga += ga;
      awayRow.p++; awayRow.gf += ga; awayRow.ga += gh;
      if (gh > ga) { homeRow.w++; homeRow.pts += 3; awayRow.l++; }
      else if (gh < ga) { awayRow.w++; awayRow.pts += 3; homeRow.l++; }
      else { homeRow.d++; homeRow.pts++; awayRow.d++; awayRow.pts++; }
    }
  }
  projectedTable.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  const wideH = liveStats.wideAttH, wideA = liveStats.wideAttA;
  const centralH = liveStats.centralAttH, centralA = liveStats.centralAttA;
  const shotChannels = (side: 'home' | 'away') => {
    const own = shotLog.filter((shot) => shot.side === side);
    const count = { left: 0, center: 0, right: 0 };
    for (const shot of own) { if (shot.zone.startsWith('L-')) count.left++; else if (shot.zone.startsWith('R-')) count.right++; else count.center++; }
    const total = own.length || 1;
    return { ...count, leftPct: Math.round(count.left / total * 100), centerPct: Math.round(count.center / total * 100), rightPct: Math.round(count.right / total * 100), total: own.length };
  };
  const confirmLiveSub = (outId: string, inId: string) => {
    const accepted = session.queueSub(mySide, outId, inId);
    if (accepted) {
      setEventsShown((ev) => [...ev, { minute: session.getMinute(), side: mySide, kind: 'sub', text: 'Değişiklik sıraya alındı; motor uygun ilk durakta uygulayacak.' }]);
      // Inline substitutions should not restart a match the user paused.
      setActiveTab('pitch'); setTick((v) => v + 1);
    } else {
      setEventsShown((ev) => [...ev, { minute: session.getMinute(), side: mySide, kind: 'info', text: 'Değişiklik alınamadı: hak, durak veya oyuncu uygunluğunu kontrol et.' }]);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col safe-t safe-b bg-base">
      {checkpointNotice}
      {/* Persistent broadcast scorebug */}
      <header className="px-2.5 pt-2 pb-2 border-b border-line/60 bg-[#111b16] shrink-0 sticky top-0 z-20" aria-label="Sabit maç skorbordu">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <Crest club={home} size={25} />
            <span className="text-[9px] font-black truncate max-w-[34px]" style={{ color: home.color1 }}>{home.short}</span>
            <div className="num text-[#fffaf0] font-black text-[21px] min-w-[47px] text-center">{gh}<span className="text-[#a9b4aa] mx-0.5">–</span>{ga}</div>
            <span className="text-[9px] font-black truncate max-w-[34px]" style={{ color: away.color1 }}>{away.short}</span>
            <Crest club={away} size={25} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="text-right leading-tight min-w-[41px]" role="timer" aria-label={`Maç dakikası ${clockMinute}, saniye ${clockSecond}`}>
              <div className="num text-[#fff3d0] font-black text-[13px]">{done ? 'MS' : `${clockMinute}:${String(clockSecond).padStart(2, '0')}`}</div>
              <div className="text-[7px] text-[#a9b4aa] font-bold">{clockMinute < 45 ? '1. YARI' : clockMinute === 45 ? 'DEVRE' : clockMinute < 90 ? '2. YARI' : 'UZATMA'}</div>
            </div>
            {!done && <span className="hidden sm:flex items-center gap-1 rounded-full px-1.5 py-1 bg-[#5d2824] text-[#ffd8ce] text-[8px] font-black"><i className="w-1.5 h-1.5 rounded-full bg-[#ff6958] animate-pulse" />CANLI</span>}
            {!done && <div className="flex gap-0.5" role="group" aria-label="Maç oynatma hızı">
              {(['x1', 'x2', 'x4'] as const).map((v) => <button key={v} onClick={() => setSpeed(v)} aria-pressed={speed === v} aria-label={`${v.slice(1)} kat hız`} className={`min-w-[27px] min-h-[34px] rounded-md text-[9px] font-black num ${speed === v ? 'bg-[#66502b] text-[#ffe09b]' : 'bg-[#202e24] text-[#d6e2d3]'}`}>{v === 'x1' ? '1×' : v === 'x2' ? '2×' : '4×'}</button>)}
              <button onClick={() => setPaused((value) => !value)} disabled={done} aria-label={paused ? 'Maça devam et' : 'Maçı duraklat'} className="min-w-[30px] min-h-[34px] rounded-md bg-[#202e24] text-[#f4f0df] text-[12px]">{paused ? '▶' : '⏸'}</button>
            </div>}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 mt-1.5 text-center">
          {([['xG', liveStats.xgH.toFixed(2), liveStats.xgA.toFixed(2)], ['ŞUT', liveStats.shotsH, liveStats.shotsA], ['İSABET', liveStats.onH, liveStats.onA], ['KORNER', liveStats.cornersH, liveStats.cornersA]] as const).map(([label, hVal, aVal]) => <div key={label} className="rounded-md bg-[#1d2b23] px-1 py-1 text-[8px]"><div className="text-[#adb9ae] font-bold tracking-wider">{label}</div><div className="num text-[#faf5ea] font-bold">{hVal}<span className="text-[#738078] mx-0.5">–</span>{aVal}</div></div>)}
        </div>
      </header>
      {loopError !== null && (
        <div role="alert" className="px-3 py-2.5 bg-[#3a1d1d] border-b border-[#ef6b6b]/60 shrink-0">
          <p className="text-[#ffd9d9] text-[11px] font-bold mb-2">Maç akışı beklenmedik bir sorun nedeniyle durdu. Maç kaybolmadan buradan bitirebilirsin.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setLoopError(null); setPaused(false); setTick((p) => p + 1); }} className="min-h-touch rounded-lg bg-[#2c3d33] text-[#e8f0e9] text-[11px] font-bold">Tekrar Dene</button>
            <button type="button" onClick={recoverMatch} className="min-h-touch rounded-lg bg-[#b78b3d] text-[#14100a] text-[11px] font-black">Maçı Güvenli Bitir</button>
          </div>
        </div>
      )}
      {lastGoal && <div role="status" aria-live="polite" className={`px-3 py-1.5 bg-[#44351b] border-b border-[#b78b3d]/50 flex items-center gap-2 shrink-0 ${reducedMotion ? '' : 'm26-in'}`}>
        <span className="text-[#ffe09b] text-[9px] font-black uppercase shrink-0">⚽ GOL · {lastGoal.minute}′</span>
        <span className="text-[#fff5d9] text-[10px] font-semibold truncate">{scorerName ?? lastGoal.text}{assisterName ? <span className="text-[#dccb9d] font-normal"> · Asist: {assisterName}</span> : null}</span>
      </div>}
      <div className="px-3 py-1.5 bg-[#171f1a] border-b border-line/50 shrink-0" aria-label="Son beş dakika momentum">
        <div className="flex items-center justify-between text-[9px] font-black tracking-wider mb-1"><span className="text-[#c4d6c6]">SON 5 DK · BASKI</span><span style={{ color: home.color1 }}>{home.short} %{momentum}</span><span style={{ color: away.color1 }}>{away.short} %{100 - momentum}</span></div>
        <div className="h-2 rounded-full overflow-hidden bg-[#25332a] flex border border-[#405246]"><div className="h-full transition-all duration-700" style={{ width: `${momentum}%`, background: home.color1 }} /><div className="h-full transition-all duration-700" style={{ width: `${100 - momentum}%`, background: away.color1 }} /></div>
      </div>

      <main className="flex-1 min-h-0 overflow-hidden">
        <section id={`match-panel-${activeTab}`} role="tabpanel" aria-label={LIVE_CONSOLE_TABS.find((tab) => tab.id === activeTab)?.label} className="h-full min-h-0 overflow-y-auto no-scrollbar">
          {activeTab === 'pitch' && <div className="relative min-h-full px-3 pt-2 pb-3 flex flex-col items-center gap-2">
            <div className="w-full max-w-[330px] grid grid-cols-2 gap-1 rounded-xl border border-line bg-[#17251d] p-1" role="group" aria-label="Saha görünümü">
              <button type="button" onClick={() => setPitchView('pitch')} aria-pressed={pitchView === 'pitch'} className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg text-[10.5px] font-bold ${pitchView === 'pitch' ? 'bg-[#354a39] text-[#f6dfaa]' : 'text-[#c2d0c2]'}`}><span className="w-3.5 h-3.5"><ICONS.ball /></span>Saha</button>
              <button type="button" onClick={() => setPitchView('atmosphere')} aria-pressed={pitchView === 'atmosphere'} className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg text-[10.5px] font-bold ${pitchView === 'atmosphere' ? 'bg-[#354a39] text-[#f6dfaa]' : 'text-[#c2d0c2]'}`}><span className="w-3.5 h-3.5"><ICONS.squad /></span>Kulübe & Tribün{reaction && <span className="text-[#f6cf78]" aria-label="Yeni tepki">●</span>}</button>
            </div>
            {pitchView === 'pitch' ? Pitch : <LiveAtmosphere club={g.myClub} manager={g.career.manager} bench={session.getBench(mySide)} managerSuspended={managerSuspendedAtStart}
              reaction={reaction?.cue ?? null} recentReactions={recentReactions} reactionSequence={reaction?.sequence ?? reactionSequence.current} paused={paused} done={done} reducedMotion={reducedMotion} />}
            {pitchView === 'pitch' && currentEvent && <div className="w-full max-w-[330px] rounded-lg border border-[#53665a] bg-[#1a2720] px-2.5 py-1.5 text-[10.5px] leading-snug text-[#f4f2e8]"><span className="num font-black text-[#f2cf70] mr-1.5">{currentEvent.minute}′</span>{currentEvent.text}</div>}
            {pitchView === 'pitch' && <div className="w-full max-w-[330px] flex gap-2 items-center">
              <button onClick={() => setHeatEnabled((value) => !value)} aria-pressed={heatEnabled} className={`min-h-[44px] flex-1 rounded-xl border px-3 text-[11px] font-bold ${heatEnabled ? 'border-[#d18d51] bg-[#46351f] text-[#ffe0a0]' : 'border-line bg-surface text-primary'}`}>🔥 {heatEnabled ? 'Isı Haritası Açık' : 'Isı Haritası'}</button>
              <label className="min-h-[44px] flex items-center gap-1 rounded-xl border border-line bg-surface px-2 text-[9px] text-secondary">Takım
                <select value={heatTeam} onChange={(event) => setHeatTeam(event.target.value as 'all' | 'home' | 'away')} aria-label="Isı haritası takım filtresi" className="max-w-[82px] bg-transparent text-primary text-[10px]">
                  <option value="all">İkisi</option><option value="home">{home.short}</option><option value="away">{away.short}</option>
                </select>
              </label>
            </div>}
          </div>}

          {activeTab === 'ratings' && <div className="p-3 space-y-3">
            <div className="flex items-end justify-between gap-2"><div><h2 className="text-primary font-black text-sm">Canlı Reytingler & Karne</h2><p className="text-muted text-[10px]">Sahadaki 22 oyuncu · O maç notu · kondisyon canlıdır</p></div><span className="text-[9px] text-muted">Şut · gol · asist · kart</span></div>
            {(['home', 'away'] as const).map((side) => {
              const club = side === 'home' ? home : away;
              const slots = session.getSlots(side);
              return <section key={side} aria-label={`${club.name} oyuncu karnesi`} className="rounded-xl border border-line bg-surface overflow-hidden">
                <h3 className="px-2.5 py-2 text-[11px] font-black border-b border-line" style={{ color: club.color1 }}>{club.short} · {club.name}</h3>
                <div className="divide-y divide-line/60">
                  {slots.map((slot: any) => {
                    const row = liveStats.playerRows?.[slot.player.id];
                    const rating = playerRating(slot);
                    return <div key={slot.player.id} className={`grid grid-cols-[minmax(0,1fr)_42px_72px] gap-2 items-center px-2.5 py-2 min-h-[48px] ${slot.sentOff ? 'opacity-50' : ''}`}>
                      <div className="min-w-0"><div className="text-[11px] font-bold text-primary truncate">{slot.player.name} <span className="text-muted font-normal">{slot.slotGroup}{slot.sentOff ? ' · Kırmızı kart' : slot.injured ? ' · Tedavi kenarında' : ''}</span></div><div className="text-[9px] text-muted">Şut {row?.shots ?? 0} · Gol {row?.g ?? 0} · Asist {row?.a ?? 0}{slot.yellows ? ' · 🟨' : ''}{row?.red ? ' · 🟥' : ''}</div></div>
                      <b className={`num text-center text-[13px] ${rating >= 7 ? 'text-[#f5cf72]' : rating < 5.8 ? 'text-[#f0a08b]' : 'text-primary'}`} aria-label={`Reyting ${rating.toFixed(1)}`}>{rating.toFixed(1)}</b>
                      <div><div className="flex justify-between text-[8px] text-muted"><span>Kond.</span><b className="num text-primary">{Math.round(slot.liveFitness)}%</b></div><div className="h-1.5 rounded-full bg-[#26342b] overflow-hidden"><div className={`h-full ${slot.liveFitness < 50 ? 'bg-[#d87b58]' : 'bg-[#6eab75]'}`} style={{ width: `${Math.max(0, Math.min(100, slot.liveFitness))}%` }} /></div></div>
                    </div>;
                  })}
                </div>
              </section>;
            })}
          </div>}

          {activeTab === 'subs' && <div className="p-3">
            <div className="mb-2"><h2 className="text-primary font-black text-sm">Oyuncu Değişikliği</h2><p className="text-muted text-[10px]">Kalan hak {session.subsLeft(mySide)} · Kullanılabilir durak {session.windowsLeft(mySide)} · Motor değişikliği uygun ilk durakta uygular.</p></div>
            <SubPickerFlow slots={session.getSlots(mySide)} bench={session.getBench(mySide)} subsLeft={session.subsLeft(mySide)} windowsLeft={session.windowsLeft(mySide)} playerRows={liveStats.playerRows} onConfirm={confirmLiveSub} onCancel={() => setActiveTab('pitch')} />
          </div>}

          {activeTab === 'analysis' && <div className="p-3 space-y-3">
            <div><h2 className="text-primary font-black text-sm">Analiz & Şut Haritası</h2><p className="text-muted text-[10px]">Her nokta motorun gerçek şut günlüğünden çizilir; yönler saha koordinatında normalize edilir.</p></div>
            <XgTimeline shots={shotLog} homeColor={home.color1} awayColor={away.color1} homeShort={home.short} awayShort={away.short} />
            <LiveShotMap shots={shotLog} />
            <div className="rounded-xl border border-line bg-surface p-3">
              <h3 className="text-[11px] text-primary font-bold mb-2">Şut kanalı · sol / merkez / sağ</h3>
              {(['home', 'away'] as const).map((side) => {
                const club = side === 'home' ? home : away;
                const c = shotChannels(side);
                return <div key={side} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-[9px] text-secondary"><span>{club.short}</span><span>Sol {c.leftPct}% · Merkez {c.centerPct}% · Sağ {c.rightPct}% <span className="text-muted">({c.total} şut)</span></span></div>
                  <div className="h-2 rounded-full overflow-hidden bg-[#26342b] flex mt-1"><div className="bg-[#6c9f72]" style={{ width: `${c.leftPct}%` }} /><div className="bg-[#d6b463]" style={{ width: `${c.centerPct}%` }} /><div className="bg-[#789fc1]" style={{ width: `${c.rightPct}%` }} /></div>
                </div>;
              })}
            </div>
            <div className="rounded-xl border border-line bg-surface p-3">
              <h3 className="text-[11px] text-primary font-bold mb-2">Kanat / merkez atakları · motor sayacı</h3>
              {(['home', 'away'] as const).map((side) => {
                const club = side === 'home' ? home : away;
                const wide = side === 'home' ? wideH : wideA;
                const center = side === 'home' ? centralH : centralA;
                const total = wide + center;
                const wingPct = total ? Math.round(wide / total * 100) : 0;
                return <div key={side} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-[9px] text-secondary"><span>{club.short}</span><span>Kanat {wingPct}% · Merkez {100 - wingPct}% <span className="text-muted">({total} hücum)</span></span></div>
                  <div className="h-2 rounded-full overflow-hidden bg-[#26342b] flex mt-1"><div style={{ width: `${wingPct}%`, background: club.color1 }} /><div style={{ width: `${100 - wingPct}%`, background: club.color2 }} /></div>
                </div>;
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-surface border border-line p-2"><div className="text-[9px] text-muted">İsabetli şut</div><b className="num text-primary">{liveStats.onH} – {liveStats.onA}</b></div>
              <div className="rounded-lg bg-surface border border-line p-2"><div className="text-[9px] text-muted">Beklenen gol</div><b className="num text-primary">{liveStats.xgH.toFixed(2)} – {liveStats.xgA.toFixed(2)}</b></div>
            </div>
          </div>}

          {activeTab === 'table' && <div className="p-3">
            <div className="flex justify-between items-end mb-2"><div><h2 className="text-primary font-black text-sm">Canlı Puan Durumu</h2><p className="text-muted text-[10px]">{fixture.comp === 'lig' ? 'Mevcut skor tabloya geçici olarak uygulanır.' : 'Bu karşılaşma lig puanlarını değiştirmez; güncel lig tablosu gösterilir.'}</p></div><Badge kind="info">KAYDEDİLMEDİ</Badge></div>
            <div className="rounded-xl border border-line overflow-hidden bg-surface">
              {projectedTable.map((row, index) => {
                const old = oldPosition.get(row.clubId) ?? index + 1;
                const movement = old - (index + 1);
                const club = clubById(row.clubId);
                const isMatchClub = row.clubId === fixture.homeId || row.clubId === fixture.awayId;
                return <div key={row.clubId} className={`grid grid-cols-[28px_minmax(0,1fr)_30px_30px_30px_32px_38px] gap-1 items-center px-2 py-2 border-b border-line/50 text-[10px] ${isMatchClub ? 'bg-[#2b3528] font-bold' : ''}`}>
                  <b className="num text-muted">{index + 1}</b><span className="truncate text-primary">{club.short} <span className="text-muted font-normal">{club.name}</span></span><span className="num text-center text-muted">{row.p}</span><span className="num text-center text-muted">{row.gf}:{row.ga}</span><span className="num text-center text-muted">{row.w}-{row.d}-{row.l}</span><b className="num text-center text-primary">{row.pts}</b><span className={`text-right text-[9px] ${movement > 0 ? 'text-[#88cf91]' : movement < 0 ? 'text-[#eea385]' : 'text-muted'}`}>{movement > 0 ? `▲${movement}` : movement < 0 ? `▼${Math.abs(movement)}` : '—'}</span>
                </div>;
              })}
            </div>
            <p className="mt-2 text-[9px] text-muted">Sıra değişimi yalnızca bu ekranda hesaplanır. Maç tamamlanıp sonuç onaylanmadan kariyer tablosuna yazılmaz.</p>
          </div>}

          {activeTab === 'feed' && <div className="h-full min-h-0 p-3"><div className="h-full rounded-xl border border-line bg-surface p-2">{Feed}</div></div>}
        </section>
      </main>

      <nav className="match-console shrink-0 border-t border-line bg-[#111b16] px-1.5 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))]" role="tablist" aria-label="Maç konsolu sekmeleri">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {LIVE_CONSOLE_TABS.map((tab) => <button key={tab.id} id={`match-tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`match-panel-${tab.id}`} aria-label={tab.label} title={tab.label} onClick={() => setActiveTab(tab.id)} className={`shrink-0 min-w-[59px] min-h-[48px] px-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 border text-[10px] font-bold ${activeTab === tab.id ? 'bg-[#2b3b2f] border-[#9fbc77] text-[#f5e4ae]' : 'bg-transparent border-transparent text-[#c3cfc4]'}`}><GameIcon id={tab.icon} className="w-4 h-4" /><span>{tab.short}</span></button>)}
        </div>
      </nav>

      <footer className="shrink-0 px-3 py-2 bg-[#111b16] border-t border-line/50">
        {!done ? (
          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-2 text-muted text-[10px] leading-tight font-bold" aria-live="polite">
              <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-danger animate-pulse" />
              <span>Maç canlı · Düdükten sonra röportaja sen geçersin</span>
            </div>
            <button type="button" onClick={() => setShowTouchline(true)} className="shrink-0 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-[#c19245] bg-[#463519] text-[#ffe09b] text-[10px] leading-tight font-black px-2.5" aria-label="Kenar Talimatı"><span className="w-4 h-4" aria-hidden="true"><ICONS.tactics /></span><span>Kenar<br />Talimatı</span></button>
          </div>
        ) : (
          <Btn variant="amber" className="w-full !min-h-[46px] !text-[11px]" onClick={() => { if (!finResult) finalizeFromSession(); setPhase('interview'); }}>Maç Sonu Röportajına Geç →</Btn>
        )}
      </footer>

      <Sheet open={showTouchline} onClose={() => setShowTouchline(false)} title="Kenar Talimatı">
        <div className="m26-in"><p className="text-muted text-[10px] mb-3">Hız, zihniyet ve saha kenarı komutları burada. Motor sonucu tek başına belirler; bu panel yalnızca talimat gönderir.</p>{Controls}<Btn variant="secondary" className="w-full mt-3" onClick={() => setShowTouchline(false)}>Kapat</Btn></div>
      </Sheet>
      <Sheet open={showTeamTalk} onClose={() => resolveTeamTalk('quiet')} title="Devre Arası · Soyunma Odası">
        <div className={reducedMotion ? '' : 'm26-in'}>
          <div className="rounded-xl border border-line bg-surface p-3 mb-3 text-[11px] text-secondary">İlk yarı {gh}–{ga} bitti. Seçimini ikinci yarı boyunca bir kez uygularız; sessiz kalmak da geçerli bir seçim.</div>
          <div className="space-y-2">
            <button onClick={() => resolveTeamTalk('fight')} className="w-full min-h-[56px] rounded-xl border border-[#9f6b45] bg-[#422e25] px-3 py-2 text-left text-[#ffe2bd]"><b className="block text-[12px]">🔥 Hırs ver</b><span className="text-[10px] opacity-85">Baskı, geçiş ve son bölge etkinliği artar; daha riskli oyun.</span></button>
            <button onClick={() => resolveTeamTalk('calm')} className="w-full min-h-[56px] rounded-xl border border-[#557a81] bg-[#20373b] px-3 py-2 text-left text-[#d6f4f1]"><b className="block text-[12px]">🧠 Sakinleştir</b><span className="text-[10px] opacity-85">Oyun kurma ve orta saha pas akışı desteklenir.</span></button>
            <button onClick={() => resolveTeamTalk('quiet')} className="w-full min-h-[48px] rounded-xl border border-line bg-surface px-3 text-left text-primary text-[11px]">Sessiz kal — ek taktik etkisi yok</button>
          </div>
        </div>
      </Sheet>
      {/* Maç sonu: mevcut rapor ve sonuç akışı */}
      <Sheet open={showTacticPicker} onClose={() => { setShowTacticPicker(false); setPaused(pausedBeforePicker.current); }} title="Plan Geçişi">
        <div className="m26-in space-y-2">
          {g.tactics.map((t) => <button key={t.id} onClick={() => { session.queueTactic(mySide, t); setShowTacticPicker(false); setShowTouchline(false); setPaused(pausedBeforePicker.current); setTick((v) => v + 1); }} className="w-full text-left rounded-xl bg-surface border border-line p-3 min-h-[48px] hover:border-amber/50 transition-colors"><div className="text-primary font-bold text-[13px]">{t.name}</div><div className="text-muted text-[11px] mt-0.5">{t.formation} · {t.plan} · Pres {t.press}</div></button>)}
          <Btn variant="secondary" className="w-full" onClick={() => { setShowTacticPicker(false); setPaused(pausedBeforePicker.current); }}>Devam Et</Btn>
        </div>
      </Sheet>
      <Sheet open={showSubPicker} onClose={() => { setShowSubPicker(false); setPaused(pausedBeforePicker.current); }} title="Oyuncu Değişikliği">
        <SubPickerFlow slots={session.getSlots(mySide)} bench={session.getBench(mySide)} subsLeft={session.subsLeft(mySide)} windowsLeft={session.windowsLeft(mySide)} playerRows={liveStats.playerRows} onConfirm={(outId, inId) => {
          const ok = session.queueSub(mySide, outId, inId);
          setShowSubPicker(false);
          if (!ok) {
            const notice: DemoMatchEvent = { minute: session.getMinute(), text: 'Değişiklik uygun değil (hak bitti veya maç sonu)', kind: 'info' };
            setEventsShown((events) => [...events, notice]); setDecision(notice); setPaused(true);
          } else { setPaused(pausedBeforePicker.current); setTick((v) => v + 1); }
        }} onCancel={() => { setShowSubPicker(false); setPaused(pausedBeforePicker.current); }} />
      </Sheet>
      <Sheet open={!!decision} onClose={() => { if (decision?.kind === 'injury') waitForInjuryReturn(); else { setDecision(null); setPaused(false); } }} title={decision?.kind === 'injury' ? 'Sakatlık Kararı' : decision?.kind === 'var' ? 'VAR İncelemesi' : 'Karar Anı'}>
        {decision && <div className={reducedMotion ? '' : 'm26-in'}>
          <div className={`rounded-xl p-3.5 border ${decision.kind === 'card' ? 'bg-warn/10 border-warn/40' : decision.kind === 'injury' ? 'bg-[#44351b] border-[#ba8b47]' : 'bg-info/10 border-info/40'}`}>
            <div className="text-amber font-bold text-[14px]">{decision.minute}' — {decision.text}</div>
            <p className="text-primary/95 text-[12px] leading-snug mt-1.5">{decision.kind === 'injury' ? 'Karar penceresi açıkken maç saati durur. Beklersen takım iki maç dakikası 10 kişi kalır; oyuncu tedavi sonrası daha düşük kondisyonla döner.' : decision.kind === 'card' ? 'Kart ve dizilişini gözden geçir. Değişiklik hakkı IFAB sınırları içinde korunur.' : decision.kind === 'var' ? 'Motor kararı önceden vermiştir; bu inceleme sunum katmanıdır ve skoru tekrar hesaplamaz.' : 'Kritik pozisyon: oyuncu/saha düzenini gözden geçir.'}</p>
          </div>
          {decision.kind === 'injury' ? <div className="grid grid-cols-1 gap-2 mt-3">
            <Btn variant="amber" disabled={!decision.playerId} onClick={waitForInjuryReturn}>⏱ Dönüşünü bekle · 2′ 10 kişi</Btn>
            <Btn variant="secondary" disabled={session.subsLeft(mySide) <= 0 || session.windowsLeft(mySide) <= 0} onClick={() => { setDecision(null); pausedBeforePicker.current = false; setShowSubPicker(true); }}>Oyuncuyu hemen değiştir · {session.subsLeft(mySide)} hak</Btn>
          </div> : <div className="grid grid-cols-2 gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setDecision(null); pausedBeforePicker.current = false; setShowSubPicker(true); }}>Oyuncu Değişikliği ({session.subsLeft(mySide)}/5)</Btn>
            <Btn variant="amber" onClick={() => { setDecision(null); setPaused(false); }}>Devam Et</Btn>
          </div>}
        </div>}
      </Sheet>
    </div>
  );
};


const SubPickerFlow: React.FC<{
  slots: any[]; bench: any[]; subsLeft: number; windowsLeft: number; playerRows: MatchStats['playerRows'];
  onConfirm: (outId: string, inId: string) => void; onCancel: () => void;
}> = ({ slots, bench, subsLeft, windowsLeft, playerRows, onConfirm, onCancel }) => {
  const [outId, setOutId] = useState<string | null>(null);
  const [inId, setInId] = useState<string | null>(null);
  const rating = (s: any) => Math.max(5, Math.min(10, (playerRows[s.player.id]?.rating ?? 6.2) - (s.liveFitness < 40 ? .45 : s.liveFitness < 55 ? .2 : 0) - (s.yellows ? .15 : 0)));
  const recOut = slots.filter((s) => !s.sentOff && s.slotGroup !== 'GK').sort((a, b) => (rating(a) + a.liveFitness / 100 - (a.yellows ? .2 : 0)) - (rating(b) + b.liveFitness / 100 - (b.yellows ? .2 : 0)))[0];
  const recIn = recOut && bench.slice().sort((a, b) => {
    const score = (p: any) => (p.group === recOut.slotGroup || p.secondary?.includes(recOut.slotGroup) ? 1.2 : 0) + (p.ratings?.gen ?? 50) / 100 + (p.fitness ?? 50) / 250;
    return score(b) - score(a);
  })[0];
  const applySuggestion = () => { if (recOut && recIn) { setOutId(recOut.player.id); setInId(recIn.id); } };
  return (
    <div className="m26-in">
      <div className="text-[11px] text-muted">Değişiklik hakkı: <b className="text-primary">{subsLeft}</b> · Kullanılabilir durak: <b className="text-primary">{windowsLeft}</b> · Reyting, kondisyon, mevki ve kartlar canlı.</div>
      {recOut && recIn && <button onClick={applySuggestion} className="w-full min-h-[48px] mt-2 rounded-xl border border-[#6b7748] bg-[#27331e] text-left px-3 py-2 text-[11px] text-[#f4efcf]"><b>✨ Akıllı öneri:</b> {recOut.player.name.split(' ').slice(-1)[0]} (%{Math.round(recOut.liveFitness)}, {rating(recOut).toFixed(1)}) → {recIn.name.split(' ').slice(-1)[0]} ({recIn.group}, O{recIn.ratings.gen})</button>}
      <div className="mt-3">
        <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Sahada</div>
        <div className="grid grid-cols-2 gap-1">
          {slots.filter((s) => !s.sentOff).map((s) => (
            <button key={s.player.id} onClick={() => setOutId(s.player.id)}
              className={`text-left rounded-lg px-2.5 py-2 min-h-[48px] text-[11px] border ${outId === s.player.id ? 'bg-[#4b351c] border-[#d1a454] text-[#ffe0a0] font-bold' : 'bg-surface border-line text-primary'}`}>
              {s.player.name.split(' ').slice(-1)[0]} <span className="text-muted text-[9.5px]">{s.slotGroup} · O{rating(s).toFixed(1)} · %{Math.round(s.liveFitness)} {s.yellows ? '🟨' : ''}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Yedek</div>
        <div className="grid grid-cols-2 gap-1">
          {bench.map((p) => (
            <button key={p.id} onClick={() => setInId(p.id)}
              className={`text-left rounded-lg px-2.5 py-2 min-h-[48px] text-[11px] border ${inId === p.id ? 'bg-[#213c4a] border-[#75b7d4] text-[#c9edff] font-bold' : 'bg-surface border-line text-primary'}`}>
              {p.name.split(' ').slice(-1)[0]} <span className="text-muted text-[9.5px]">{p.group} · O{p.ratings.gen} · %{Math.round(p.fitness ?? 100)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Btn variant="secondary" onClick={onCancel}>İptal</Btn>
        <Btn variant="amber" disabled={!outId || !inId || subsLeft <= 0 || windowsLeft <= 0} onClick={() => outId && inId && onConfirm(outId, inId)}>Onayla</Btn>
      </div>
    </div>
  );
};

// Dalga 1: kümülatif xG zaman çizelgesi — saf motor şut günlüğünden, SVG/CSS (ek kütüphane yok)
const XgTimeline: React.FC<{ shots: EngineShot[]; homeColor: string; awayColor: string; homeShort: string; awayShort: string }> = ({ shots, homeColor, awayColor, homeShort, awayShort }) => {
  const points = buildXgTimeline(shots);
  const last = points[points.length - 1];
  const W = 300;
  const H = 104;
  const PAD_X = 10;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 18;
  const maxMinute = Math.max(90, last.minute);
  const maxXg = Math.max(0.5, last.home, last.away);
  const x = (minute: number) => PAD_X + (minute / maxMinute) * (W - PAD_X * 2);
  const y = (v: number) => H - PAD_BOTTOM - (v / maxXg) * (H - PAD_TOP - PAD_BOTTOM);
  const line = (key: 'home' | 'away') => points.map((p) => `${x(p.minute).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const gridVals = [0, 0.5, 1].filter((v) => v <= maxXg + 0.01);
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[11px] text-primary font-bold">Kümülatif xG akışı</h3>
        <div className="flex items-center gap-2.5 text-[10px] font-bold">
          <span style={{ color: homeColor }}>● {homeShort} {last.home.toFixed(2)}</span>
          <span style={{ color: awayColor }}>● {awayShort} {last.away.toFixed(2)}</span>
        </div>
      </div>
      {points.length < 2
        ? <div className="h-[104px] flex items-center justify-center text-muted text-[10.5px]">İlk şuttan sonra çizgi belirir</div>
        : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Kümülatif xG: ${homeShort} ${last.home.toFixed(2)}, ${awayShort} ${last.away.toFixed(2)}`}>
            {gridVals.map((v) => (
              <g key={v}>
                <line x1={PAD_X} x2={W - PAD_X} y1={y(v)} y2={y(v)} stroke="var(--c-line, #33403a)" strokeWidth="0.6" strokeDasharray="3 3" />
                <text x={W - PAD_X} y={y(v) - 2} textAnchor="end" fontSize="7" fill="var(--c-muted, #8a968d)">{v}</text>
              </g>
            ))}
            <polyline points={line('home')} fill="none" stroke={homeColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={line('away')} fill="none" stroke={awayColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {points.slice(1).map((p, i) => (
              <g key={i}>
                <circle cx={x(p.minute)} cy={y(p.home)} r="2.2" fill={homeColor} />
                <circle cx={x(p.minute)} cy={y(p.away)} r="2.2" fill={awayColor} />
              </g>
            ))}
            <text x={PAD_X} y={H - 4} fontSize="7.5" fill="var(--c-muted, #8a968d)">0'</text>
            <text x={W - PAD_X} y={H - 4} textAnchor="end" fontSize="7.5" fill="var(--c-muted, #8a968d)">{maxMinute}'</text>
          </svg>
        )}
    </div>
  );
};

const LiveShotMap: React.FC<{ shots: EngineShot[] }> = ({ shots }) => {
  const colorFor = (outcome: EngineShot['outcome']) => outcome === 'goal' ? '#f5cf72' : outcome === 'save' ? '#74c8f5' : outcome === 'clearance' ? '#f0e7d0' : outcome === 'woodwork' ? '#fb7185' : '#c3cbc2';
  return <div className="rounded-xl border border-line bg-surface p-2.5">
    <div className="flex justify-between text-[9px] text-muted mb-1"><span>ŞUT KONUMU</span><span>{shots.length} şut</span></div>
    <svg viewBox="0 0 100 100" role="img" aria-label={`Canlı şut haritası, ${shots.length} şut; home üst yarıya, away alt yarıya çizilir.`} className="block w-full max-w-[360px] h-[300px] mx-auto rounded-lg bg-[#245438]">
      <rect x="4" y="3" width="92" height="94" rx="2" fill="#2a6842" stroke="#e4eadc" strokeWidth=".7" />
      <line x1="4" y1="50" x2="96" y2="50" stroke="#dce8d9" strokeWidth=".55" />
      <circle cx="50" cy="50" r="8" fill="none" stroke="#dce8d9" strokeWidth=".55" /><circle cx="50" cy="50" r=".7" fill="#e4eadc" />
      <rect x="27" y="3" width="46" height="15" fill="none" stroke="#e4eadc" strokeWidth=".55" /><rect x="37" y="3" width="26" height="6" fill="none" stroke="#e4eadc" strokeWidth=".45" />
      <rect x="27" y="82" width="46" height="15" fill="none" stroke="#e4eadc" strokeWidth=".55" /><rect x="37" y="91" width="26" height="6" fill="none" stroke="#e4eadc" strokeWidth=".45" />
      {shots.map((shot, index) => {
        const zone = ZONES[shot.zone] ?? ZONES['C-M'];
        const x = shot.side === 'away' ? 100 - zone.x : zone.x;
        const y = shot.side === 'away' ? 100 - zone.y : zone.y;
        return <g key={`${shot.minute}-${shot.side}-${index}`}><circle cx={x} cy={y} r={1.65 + Math.min(1.2, shot.xg)} fill={colorFor(shot.outcome)} stroke="#15241a" strokeWidth=".55"><title>{`${shot.minute}′ · ${shot.side === 'home' ? 'Ev sahibi' : 'Deplasman'} · ${shot.outcome} · xG ${shot.xg.toFixed(2)}`}</title></circle></g>;
      })}
    </svg>
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-[9px] text-secondary" aria-label="Şut haritası açıklaması">
      {([['#f5cf72', 'Gol'], ['#74c8f5', 'Kurtarış'], ['#f0e7d0', 'Çizgiden çıkarılan'], ['#c3cbc2', 'Dışarı / iptal']] as const).map(([color, label]) => <span key={label} className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: color }} />{label}</span>)}
    </div>
  </div>;
};

