import { DEFAULT_ENGINE_CONFIG, validateEngineConfig, type EngineConfig } from './config';
import { EventLog } from './eventLog';
import { normalizeMatchInput, type MatchInput, type NormalizedMatchInput, type PlayerSnapshot, type TeamSnapshot } from './input';
import { RngBundle, type RngBundleSnapshot } from './rng';
import type { CoreMatchEvent } from './types';

export type MatchPhase = 'PRE_MATCH' | 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FINISHED';
export type PlayerMatchStatus = 'on_pitch' | 'bench' | 'subbed_off' | 'sent_off' | 'injured_out' | 'unavailable';

export interface PlayerMatchState {
  readonly playerId: string;
  status: PlayerMatchStatus;
  enteredAtSecond?: number;
  leftAtSecond?: number;
  readonly fitnessStart: number;
  fitnessCurrent: number;
  exertion: number;
  yellowCards: number;
  redCard: boolean;
}

export interface TeamMatchState {
  readonly clubId: string;
  readonly lineup: readonly { readonly slotId: string; readonly position: string; readonly playerId: string }[];
  readonly bench: readonly string[];
  readonly players: Record<string, PlayerMatchState>;
  tacticId: string;
}

export interface MatchCoreState {
  phase: MatchPhase;
  clockSeconds: number;
  score: { home: number; away: number };
  home: TeamMatchState;
  away: TeamMatchState;
  rngState: RngBundleSnapshot;
}

function runtimePlayer(player: PlayerSnapshot, status: PlayerMatchStatus): PlayerMatchState {
  return {
    playerId: player.id, status,
    enteredAtSecond: status === 'on_pitch' ? 0 : undefined,
    fitnessStart: player.fitness, fitnessCurrent: player.fitness, exertion: 0,
    yellowCards: 0, redCard: false,
  };
}

function makeTeamState(team: TeamSnapshot): TeamMatchState {
  const players: Record<string, PlayerMatchState> = {};
  for (const slot of team.lineup) players[slot.player.id] = runtimePlayer(slot.player, 'on_pitch');
  for (const player of team.bench) players[player.id] = runtimePlayer(player, 'bench');
  return {
    clubId: team.clubId,
    lineup: team.lineup.map((slot) => ({ slotId: slot.slotId, position: slot.position, playerId: slot.player.id })),
    bench: team.bench.map((player) => player.id),
    players,
    tacticId: team.tactic.id,
  };
}

function cloneState(state: MatchCoreState): MatchCoreState {
  const cloneTeam = (team: TeamMatchState): TeamMatchState => ({
    ...team,
    lineup: team.lineup.map((slot) => ({ ...slot })),
    bench: [...team.bench],
    players: Object.fromEntries(Object.entries(team.players).map(([id, player]) => [id, { ...player }])),
  });
  return {
    ...state,
    score: { ...state.score },
    home: cloneTeam(state.home), away: cloneTeam(state.away),
    rngState: { ...state.rngState, states: { ...state.rngState.states } },
  };
}

function copyConfig(config: EngineConfig): EngineConfig {
  return Object.freeze({
    ...config,
    clock: Object.freeze({ ...config.clock }),
    substitutions: Object.freeze({ ...config.substitutions }),
  });
}

/**
 * Deterministic MatchCore shell. Wave 2 establishes validated snapshots,
 * explicit state and phase transitions; possession/shot generation is added
 * in later waves. This class has no React, Phaser, DOM, timer, or storage code.
 */
export class MatchCore {
  readonly input: NormalizedMatchInput;
  readonly config: EngineConfig;
  private readonly rng: RngBundle;
  private readonly eventLog: EventLog;
  private state: MatchCoreState;

  constructor(input: MatchInput, config: EngineConfig = DEFAULT_ENGINE_CONFIG) {
    validateEngineConfig(config);
    if (input.engineConfigVersion !== config.version) throw new Error(`MatchInput config ${input.engineConfigVersion} does not match EngineConfig ${config.version}.`);
    this.input = normalizeMatchInput(input);
    this.config = copyConfig(config);
    this.rng = new RngBundle(this.input.seed);
    this.eventLog = new EventLog(this.input.matchId);
    this.state = {
      phase: 'PRE_MATCH', clockSeconds: 0, score: { home: 0, away: 0 },
      home: makeTeamState(this.input.home), away: makeTeamState(this.input.away),
      rngState: this.rng.snapshot(),
    };
  }

  getState(): MatchCoreState { return cloneState(this.state); }
  getEvents(): readonly CoreMatchEvent[] { return this.eventLog.readAll(); }
  getRngSnapshot(): RngBundleSnapshot { return this.rng.snapshot(); }

  start(): CoreMatchEvent {
    if (this.state.phase !== 'PRE_MATCH') throw new Error('Match can only start once from PRE_MATCH.');
    this.state.phase = 'FIRST_HALF';
    return this.eventLog.append({ type: 'KICK_OFF', side: 'home', second: 0, minute: 0 });
  }

  /** Advance to an absolute elapsed match second; calls stop at the half-time boundary. */
  advanceTo(targetSecond: number): readonly CoreMatchEvent[] {
    if (!Number.isInteger(targetSecond) || targetSecond < this.state.clockSeconds) throw new Error('Target match second must be an integer and cannot move backwards.');
    if (this.state.phase !== 'FIRST_HALF' && this.state.phase !== 'SECOND_HALF') throw new Error(`Clock cannot advance during ${this.state.phase}.`);
    const before = this.eventLog.length;
    const half = this.config.clock.halfLengthSeconds;
    const full = half * 2;

    if (this.state.phase === 'FIRST_HALF') {
      if (targetSecond > half) throw new Error('Advance to half-time first, then explicitly resume the second half.');
      this.state.clockSeconds = targetSecond;
      if (targetSecond === half) {
        this.state.phase = 'HALF_TIME';
        this.eventLog.append({ type: 'HALF_TIME', second: half, minute: Math.floor(half / 60) });
      }
    } else {
      if (targetSecond > full) throw new Error('Target exceeds configured full-time.');
      this.state.clockSeconds = targetSecond;
      if (targetSecond === full) {
        this.state.phase = 'FINISHED';
        this.eventLog.append({ type: 'FULL_TIME', second: full, minute: Math.floor(full / 60) });
      }
    }
    return this.eventLog.readAll().slice(before);
  }

  resumeSecondHalf(): CoreMatchEvent {
    if (this.state.phase !== 'HALF_TIME') throw new Error('Second half can only resume from HALF_TIME.');
    const half = this.config.clock.halfLengthSeconds;
    this.state.phase = 'SECOND_HALF';
    return this.eventLog.append({ type: 'KICK_OFF', side: 'away', second: half, minute: Math.floor(half / 60) });
  }

}
