// A live match is stored as its immutable starting input and deterministic command
// ledger, not as serialized private RNG/functions. UI-only decisions travel with it.
import type { DemoFixture } from '../types';
import type { DemoMatchEvent } from '../store/game';
import type { InterviewOption } from '../data/interview';
import type { HeatPoint } from '../components/assets/PhaserPitch';
import type { ConsoleTab } from '../screens/liveMatchConsole';
import type { PresentationSpeed } from './adapters/liveProjection';
import type { SimulationInput } from './core/simulationInput';
import type { MatchCommand } from './core/input';
import { deterministicReplayHash } from './core/commandLog';
import { MatchSession } from './session';

export interface LiveMatchViewState {
  events: DemoMatchEvent[];
  speed: PresentationSpeed;
  paused: boolean;
  activeTab: ConsoleTab;
  pitchView: 'pitch' | 'atmosphere';
  heatEnabled: boolean;
  heatTeam: 'all' | 'home' | 'away';
  heatSamples: HeatPoint[];
  showTouchline: boolean;
  showTeamTalk: boolean;
  teamTalkPromptShown: boolean;
  crowdShoutUsed: boolean;
  decision: DemoMatchEvent | null;
  lastDecisionShown: string;
  showSubPicker: boolean;
  showTacticPicker: boolean;
  coachFired: number[];
  phase: 'live' | 'interview' | 'report';
  interviewChoice: InterviewOption | null;
  managerSuspendedAtStart: boolean;
  managerCards: number;
}

export interface LiveMatchCheckpoint {
  schema: 'hm26-live-checkpoint-v1';
  fixture: DemoFixture;
  seasonNo: number;
  tacticIdx: number;
  input: SimulationInput;
  step: number;
  commands: readonly MatchCommand[];
  commandHash: string;
  stateHash: string;
  view: LiveMatchViewState;
  checksum: string;
}

const jsonCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isText = (value: unknown) => typeof value === 'string' && value.length <= 4000;
const optionalText = (value: unknown) => value === undefined || isText(value);
const stringList = (value: unknown) => Array.isArray(value) && value.length <= 100 && value.every(isText);
const optionalStringList = (value: unknown) => value === undefined || stringList(value);
const isMatchEvent = (value: unknown): value is DemoMatchEvent => {
  if (!isObject(value) || typeof value.minute !== 'number' || !Number.isFinite(value.minute) || !isText(value.text) ||
      !['info', 'goal', 'card', 'chance', 'save', 'var', 'sub', 'half', 'injury', 'coach'].includes(value.kind as string) ||
      (value.side !== undefined && value.side !== 'home' && value.side !== 'away') ||
      !optionalStringList(value.path) || !optionalStringList(value.visualActors) ||
      !optionalText(value.playerId) || !optionalText(value.scorerId) || !optionalText(value.assisterId) || !optionalText(value.visualEvent)) return false;
  if (value.anim !== undefined) {
    if (!isObject(value.anim) || !isText(value.anim.eventType) || !optionalText(value.anim.attackingTeamId) ||
        !optionalText(value.anim.outcome) || !optionalStringList(value.anim.path) || !optionalStringList(value.anim.actors)) return false;
  }
  return true;
};
const isInterviewChoice = (value: unknown): value is InterviewOption => {
  if (!isObject(value) || !isText(value.id) || !isText(value.label) || !isText(value.detail) || !isText(value.quote) || !isObject(value.effect)) return false;
  return Object.entries(value.effect).every(([key, amount]) => ['fanTrust', 'discipline', 'ultrasHeat'].includes(key) &&
    typeof amount === 'number' && Number.isFinite(amount) && Math.abs(amount) <= 10);
};

/** Check a broad set of observable simulation state as well as the command log. */
export function liveSessionHash(session: MatchSession): string {
  return deterministicReplayHash(jsonCopy({
    step: session.getStepCount(), elapsed: session.getElapsedSeconds(), done: session.done,
    stats: session.getStats(), events: session.getEvents(), coreEvents: session.getCoreEvents(),
    ball: session.getBallState(), momentum: session.getMomentum(), shots: session.getShotsLog(),
    homeSlots: session.getSlots('home'), awaySlots: session.getSlots('away'),
    homeBench: session.getBench('home'), awayBench: session.getBench('away'),
    homeTactic: session.getTactic('home'), awayTactic: session.getTactic('away'),
    homeProfile: session.getTeamProfile('home'), awayProfile: session.getTeamProfile('away'),
    homeTouchline: session.getTouchlineState('home'), awayTouchline: session.getTouchlineState('away'),
    subs: [session.subsLeft('home'), session.subsLeft('away')], windows: [session.windowsLeft('home'), session.windowsLeft('away')],
    weather: session.getWeather(), referee: session.getReferee(), ai: session.getAiDecisionTraces(),
    ...(session.done ? { result: session.toResult() } : {}),
  }));
}

export function makeLiveCheckpoint(session: MatchSession, fixture: DemoFixture, seasonNo: number, tacticIdx: number, view: LiveMatchViewState): LiveMatchCheckpoint {
  const body = jsonCopy({
    schema: 'hm26-live-checkpoint-v1' as const, fixture, seasonNo, tacticIdx,
    input: session.getSimulationInput(), step: session.getStepCount(), commands: session.getCommandLog(),
    commandHash: session.getCommandLogHash(), stateHash: liveSessionHash(session), view,
  });
  return { ...body, checksum: deterministicReplayHash(body) };
}

/** Validate untrusted backup/IndexedDB data before trying to reconstruct it. */
export function validLiveCheckpoint(value: unknown): value is LiveMatchCheckpoint {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const cp = value as LiveMatchCheckpoint;
    if (cp.schema !== 'hm26-live-checkpoint-v1' || !cp.fixture || !cp.input || !cp.view ||
        !Number.isSafeInteger(cp.seasonNo) || cp.seasonNo < 1 || !Number.isSafeInteger(cp.tacticIdx) || cp.tacticIdx < 0 || cp.tacticIdx > 4 ||
        !Number.isSafeInteger(cp.step) || cp.step < 0 || cp.step > 500 || !Array.isArray(cp.commands) || cp.commands.length > 1000 ||
        !cp.commands.every((command, index) => isObject(command) && isText(command.id) &&
          typeof command.issuedAtStep === 'number' && Number.isSafeInteger(command.issuedAtStep) && command.issuedAtStep >= 0 && command.issuedAtStep <= cp.step &&
          typeof command.issuedAtSecond === 'number' && Number.isSafeInteger(command.issuedAtSecond) && command.issuedAtSecond >= 0 &&
          (command.side === 'home' || command.side === 'away') && typeof command.type === 'string' && ['TACTIC_CHANGE', 'SUB_REQUEST', 'TOUCHLINE_SHOUT', 'PROTEST', 'TEAM_TALK', 'WAIT_INJURED'].includes(command.type) && isObject(command.payload) &&
          (index === 0 || ((cp.commands[index - 1].issuedAtStep ?? -1) <= (command.issuedAtStep as number) && cp.commands[index - 1].issuedAtSecond <= (command.issuedAtSecond as number)))) ||
        typeof cp.checksum !== 'string' || typeof cp.commandHash !== 'string' || typeof cp.stateHash !== 'string' ||
        !Array.isArray(cp.view.events) || cp.view.events.length > 5000 || !cp.view.events.every(isMatchEvent) ||
        !Array.isArray(cp.view.heatSamples) || cp.view.heatSamples.length > 1200 || !cp.view.heatSamples.every((point) => isObject(point) && typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.y === 'number' && Number.isFinite(point.y) && (point.side === 'home' || point.side === 'away')) ||
        !Array.isArray(cp.view.coachFired) || cp.view.coachFired.some((minute) => ![45, 75, 90].includes(minute)) ||
        !Number.isSafeInteger(cp.view.managerCards) || cp.view.managerCards < 0 || cp.view.managerCards > 100 ||
        !['live', 'interview', 'report'].includes(cp.view.phase) || !['x1', 'x2', 'x4'].includes(cp.view.speed) ||
        !['pitch', 'ratings', 'subs', 'analysis', 'table', 'feed'].includes(cp.view.activeTab) ||
        !['pitch', 'atmosphere'].includes(cp.view.pitchView) || !['all', 'home', 'away'].includes(cp.view.heatTeam) ||
        ![cp.view.paused, cp.view.heatEnabled, cp.view.showTouchline, cp.view.showTeamTalk, cp.view.teamTalkPromptShown, cp.view.crowdShoutUsed, cp.view.showSubPicker, cp.view.showTacticPicker, cp.view.managerSuspendedAtStart].every((flag) => typeof flag === 'boolean') ||
        !isText(cp.view.lastDecisionShown) || (cp.view.decision !== null && (!isMatchEvent(cp.view.decision) || !['card', 'var', 'injury', 'info'].includes(cp.view.decision.kind) || !cp.view.paused || !cp.view.events.some((event) => event.minute === cp.view.decision?.minute && event.kind === cp.view.decision?.kind && event.text === cp.view.decision?.text))) ||
        (cp.view.interviewChoice !== null && !isInterviewChoice(cp.view.interviewChoice)) ||
        !Number.isSafeInteger(cp.fixture.day) || cp.fixture.day < 1 || cp.fixture.played !== false ||
        !['lig', 'hazirlik', 'kupa', 'kupa-ko', 'intl-grup', 'intl-ko'].includes(cp.fixture.comp) ||
        cp.input.schema !== 'hm26-simulation-v1' || !isText(cp.input.matchId) || !cp.input.matchId || !Number.isSafeInteger(cp.input.seed) ||
        !Array.isArray(cp.input.homeSquad) || !Array.isArray(cp.input.awaySquad) || cp.input.homeSquad.length > 100 || cp.input.awaySquad.length > 100 ||
        (cp.input.userSide !== 'home' && cp.input.userSide !== 'away') ||
        cp.input.homeClub?.id !== cp.fixture.homeId || cp.input.awayClub?.id !== cp.fixture.awayId || cp.fixture.homeId === cp.fixture.awayId) return false;
    const { checksum, ...body } = cp;
    return deterministicReplayHash(jsonCopy(body)) === checksum && deterministicReplayHash(cp.commands) === cp.commandHash;
  } catch { return false; }
}

/** A mismatch is an error, never a reason to silently start a different match. */
export function restoreLiveCheckpoint(cp: LiveMatchCheckpoint, seasonNo: number, clubId: string, day: number): MatchSession {
  if (!validLiveCheckpoint(cp) || cp.seasonNo !== seasonNo || cp.fixture.day !== day ||
      (cp.fixture.homeId !== clubId && cp.fixture.awayId !== clubId)) throw new Error('Kayıtlı maç bu kariyerle eşleşmiyor veya bozuk.');
  const mySide = cp.fixture.homeId === clubId ? 'home' : 'away';
  if (cp.input.userSide !== mySide) throw new Error('Kayıtlı maçın menajer tarafı kariyerle eşleşmiyor.');
  const session = MatchSession.restore(cp.input, cp.commands, cp.step);
  const cardedProtests = session.getEvents().filter((event) => event.side === mySide && event.text === 'Kenardan itiraz! Hakem menajere sarı kart gösterdi.').length;
  if (session.getCommandLogHash() !== cp.commandHash || liveSessionHash(session) !== cp.stateHash || cp.view.managerCards !== cardedProtests ||
      (cp.view.phase !== 'live' && !session.done)) throw new Error('Kayıtlı maçın tekrar doğrulaması başarısız oldu.');
  return session;
}
