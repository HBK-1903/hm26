import type { MatchSide } from './types';

export type CorePosition = 'GK' | 'CB' | 'FB' | 'WB' | 'DM' | 'CM' | 'AM' | 'WG' | 'ST';
export type CoreWeather = 'clear' | 'rain' | 'hot' | 'wind' | 'poor_pitch';
export type CorePlan = 'balanced' | 'possession' | 'high_press' | 'fast_counter' | 'wide' | 'low_block';
export type CoreBand = 'low' | 'medium' | 'high';

export interface PlayerAttributes {
  readonly technique: number;
  readonly attack: number;
  readonly defense: number;
  readonly physical: number;
  readonly intelligence: number;
  readonly goalkeeping: number;
}

export interface PlayerSnapshot {
  readonly id: string;
  readonly name: string;
  readonly preferredPositions: readonly CorePosition[];
  readonly attributes: PlayerAttributes;
  readonly form: number;
  readonly fitness: number;
  readonly sharpness: number;
  readonly injuredDays: number;
  readonly suspendedMatches: number;
  readonly foot: 'left' | 'right' | 'both';
}

export interface LineupSlotSnapshot {
  readonly slotId: string;
  readonly position: CorePosition;
  readonly role?: string;
  readonly duty?: 'defend' | 'support' | 'attack';
  readonly player: PlayerSnapshot;
}

export interface TacticSnapshot {
  readonly id: string;
  readonly name: string;
  readonly formation: string;
  readonly plan: CorePlan;
  readonly press: CoreBand;
  readonly tempo: CoreBand;
  readonly direction: 'left' | 'center' | 'right' | 'balanced';
  readonly defensiveLine: 'deep' | 'normal' | 'high';
  readonly passRisk: CoreBand;
  readonly width: number;
  readonly roles?: Readonly<Record<string, string>>;
  readonly duties?: Readonly<Record<string, 'defend' | 'support' | 'attack'>>;
}

export interface TeamSnapshot {
  readonly clubId: string;
  readonly name: string;
  readonly strength: number;
  readonly lineup: readonly LineupSlotSnapshot[];
  readonly bench: readonly PlayerSnapshot[];
  readonly tactic: TacticSnapshot;
}

export interface MatchEnvironment {
  readonly homeAdvantage: number;
  readonly weather: CoreWeather;
  readonly pitchCondition: number;
  readonly derby: boolean;
  readonly difficultyProfileId: string;
  readonly worldVarianceProfileId: string;
}

export interface CompetitionRules {
  readonly id: string;
  readonly kind: 'league' | 'cup' | 'friendly' | 'international_cup';
}

export interface MatchCommand {
  readonly id: string;
  readonly issuedAtSecond: number;
  /** Session step boundary at which the command was accepted; used for deterministic replay. */
  readonly issuedAtStep?: number;
  readonly side: MatchSide;
  readonly type: 'TACTIC_CHANGE' | 'SUB_REQUEST' | 'TOUCHLINE_SHOUT' | 'PROTEST' | 'TEAM_TALK' | 'WAIT_INJURED';
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface MatchInput {
  readonly engineVersion: string;
  readonly engineConfigVersion: string;
  readonly matchId: string;
  readonly seed: number;
  readonly competition: CompetitionRules;
  readonly environment: MatchEnvironment;
  readonly home: TeamSnapshot;
  readonly away: TeamSnapshot;
  readonly userSide?: MatchSide;
  readonly commandLog?: readonly MatchCommand[];
}

export type NormalizedMatchInput = MatchInput & { readonly commandLog: readonly MatchCommand[] };

function assertRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be in [${min}, ${max}].`);
}
function assertNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} cannot be empty.`);
}
function clonePlayer(player: PlayerSnapshot): PlayerSnapshot {
  return {
    ...player,
    preferredPositions: [...player.preferredPositions],
    attributes: { ...player.attributes },
  };
}
function cloneCommandValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Command payload numbers must be finite.');
    return value;
  }
  if (Array.isArray(value)) return value.map(cloneCommandValue);
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error('Command payload must contain only plain JSON-like values.');
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cloneCommandValue(item)]));
  }
  throw new Error('Command payload must contain only JSON-like values.');
}
function cloneCommandPayload(payload: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return cloneCommandValue(payload) as Readonly<Record<string, unknown>>;
}
function cloneTactic(tactic: TacticSnapshot): TacticSnapshot {
  return {
    ...tactic,
    roles: tactic.roles ? { ...tactic.roles } : undefined,
    duties: tactic.duties ? { ...tactic.duties } : undefined,
  };
}
function cloneTeam(team: TeamSnapshot): TeamSnapshot {
  return {
    ...team,
    lineup: team.lineup.map((slot) => ({ ...slot, player: clonePlayer(slot.player) })),
    bench: team.bench.map(clonePlayer),
    tactic: cloneTactic(team.tactic),
  };
}
function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key]);
  return value;
}

function validatePlayer(player: PlayerSnapshot, label: string): void {
  assertNonEmpty(player.id, `${label}.id`); assertNonEmpty(player.name, `${label}.name`);
  if (!player.preferredPositions.length) throw new Error(`${label} must have at least one preferred position.`);
  for (const [key, value] of Object.entries(player.attributes)) assertRange(value, 0, 100, `${label}.attributes.${key}`);
  assertRange(player.form, 0, 100, `${label}.form`);
  assertRange(player.fitness, 0, 100, `${label}.fitness`);
  assertRange(player.sharpness, 0, 100, `${label}.sharpness`);
  if (!Number.isInteger(player.injuredDays) || player.injuredDays < 0) throw new Error(`${label}.injuredDays must be a non-negative integer.`);
  if (!Number.isInteger(player.suspendedMatches) || player.suspendedMatches < 0) throw new Error(`${label}.suspendedMatches must be a non-negative integer.`);
}

function validateTeam(team: TeamSnapshot, label: string, globalPlayerIds: Set<string>): void {
  assertNonEmpty(team.clubId, `${label}.clubId`); assertNonEmpty(team.name, `${label}.name`);
  assertRange(team.strength, 0, 100, `${label}.strength`);
  if (team.lineup.length !== 11) throw new Error(`${label}.lineup must contain exactly 11 slots.`);
  if (team.lineup.filter((slot) => slot.position === 'GK').length !== 1) throw new Error(`${label}.lineup must have exactly one goalkeeper slot.`);
  const slotIds = new Set<string>();
  const allPlayers = [...team.lineup.map((slot) => slot.player), ...team.bench];
  for (const slot of team.lineup) {
    assertNonEmpty(slot.slotId, `${label}.slotId`);
    if (slotIds.has(slot.slotId)) throw new Error(`${label} has duplicate lineup slot ${slot.slotId}.`);
    slotIds.add(slot.slotId);
  }
  for (const player of allPlayers) {
    validatePlayer(player, `${label}.player[${player.id}]`);
    if (globalPlayerIds.has(player.id)) throw new Error(`Player ID must be unique across both squads: ${player.id}.`);
    globalPlayerIds.add(player.id);
  }
  for (const slot of team.lineup) {
    if (!slot.player.preferredPositions.includes(slot.position) && !slot.player.preferredPositions.some((p) => slot.position === 'FB' && p === 'WB' || slot.position === 'WB' && p === 'FB')) {
      throw new Error(`${label}: ${slot.player.id} is not compatible with slot ${slot.slotId} (${slot.position}).`);
    }
  }
  if (team.tactic.roles && Object.keys(team.tactic.roles).some((slotId) => !slotIds.has(slotId))) throw new Error(`${label}.tactic.roles references an unknown slot.`);
  if (team.tactic.duties && Object.keys(team.tactic.duties).some((slotId) => !slotIds.has(slotId))) throw new Error(`${label}.tactic.duties references an unknown slot.`);
  assertNonEmpty(team.tactic.id, `${label}.tactic.id`); assertNonEmpty(team.tactic.formation, `${label}.tactic.formation`);
  assertRange(team.tactic.width, 0, 100, `${label}.tactic.width`);
}

/** Validate and deep-copy an input snapshot so later UI/save mutations cannot affect a running match. */
export function normalizeMatchInput(input: MatchInput): NormalizedMatchInput {
  assertNonEmpty(input.engineVersion, 'engineVersion'); assertNonEmpty(input.engineConfigVersion, 'engineConfigVersion');
  assertNonEmpty(input.matchId, 'matchId'); assertNonEmpty(input.competition.id, 'competition.id');
  if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff) throw new Error('Match seed must be a uint32.');
  if (input.home.clubId === input.away.clubId) throw new Error('Home and away clubs must be different.');
  assertRange(input.environment.homeAdvantage, -100, 100, 'environment.homeAdvantage');
  assertRange(input.environment.pitchCondition, 0, 100, 'environment.pitchCondition');
  assertNonEmpty(input.environment.difficultyProfileId, 'environment.difficultyProfileId');
  assertNonEmpty(input.environment.worldVarianceProfileId, 'environment.worldVarianceProfileId');

  const ids = new Set<string>();
  validateTeam(input.home, 'home', ids); validateTeam(input.away, 'away', ids);
  const commandLog = [...(input.commandLog ?? [])].map((command) => ({ ...command, payload: cloneCommandPayload(command.payload) }));
  const commandIds = new Set<string>();
  let previousSecond = -1;
  let previousStep = -1;
  for (const command of commandLog) {
    assertNonEmpty(command.id, 'command.id');
    if (commandIds.has(command.id)) throw new Error(`Duplicate match command ID: ${command.id}.`);
    commandIds.add(command.id);
    if (!Number.isInteger(command.issuedAtSecond) || command.issuedAtSecond < 0 || command.issuedAtSecond < previousSecond) throw new Error('Match commands must have chronological non-negative integer timestamps.');
    if (command.issuedAtStep !== undefined) {
      if (!Number.isInteger(command.issuedAtStep) || command.issuedAtStep < 0 || command.issuedAtStep < previousStep) throw new Error('Match command steps must be chronological non-negative integers.');
      previousStep = command.issuedAtStep;
    }
    previousSecond = command.issuedAtSecond;
  }

  const normalized: NormalizedMatchInput = {
    ...input,
    competition: { ...input.competition },
    environment: { ...input.environment },
    home: cloneTeam(input.home),
    away: cloneTeam(input.away),
    commandLog,
  };
  return deepFreeze(normalized);
}
