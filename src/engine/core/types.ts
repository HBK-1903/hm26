// HM26 MatchCore foundation — UI/framework-independent domain contracts.
// Domain events record resolved facts; rendering/audio must consume projections only.

export type MatchSide = 'home' | 'away';
export type ShotType = 'open_play' | 'counter' | 'corner' | 'free_kick' | 'penalty';
export type ShotOutcome = 'goal' | 'save' | 'blocked' | 'off_target' | 'woodwork';
export type InjuryStatus = 'minor_continues' | 'limited' | 'must_leave';

export interface MatchEventBase<TType extends string> {
  readonly id: string;
  readonly type: TType;
  /** Elapsed match seconds; monotonically non-decreasing inside an EventLog. */
  readonly second: number;
  /** Display minute, derived by the engine (includes stoppage-time convention). */
  readonly minute: number;
}

export type MatchEvent<TType extends string, TPayload extends object = object> =
  MatchEventBase<TType> & Readonly<TPayload>;

export type KickOffEvent = MatchEvent<'KICK_OFF', { side: MatchSide }>;
export type HalfTimeEvent = MatchEvent<'HALF_TIME'>;
export type FullTimeEvent = MatchEvent<'FULL_TIME'>;
export type PossessionEndedEvent = MatchEvent<'POSSESSION_ENDED', { side: MatchSide; durationSeconds: number }>;

/** A shot attempt records the exact probability used by the engine; xG must equal pGoal. */
export type ShotAttemptEvent = MatchEvent<'SHOT', {
  side: MatchSide;
  shotId: string;
  shooterId: string;
  assisterId?: string;
  /** Sahanın aktif kalecisi — oyuncu çekirdek log aktörü (sağlık/kart dışındaysa yazılmaz). */
  goalkeeperId?: string;
  /** İstatistiksel kaleci slotu — GK saha dışında olsa bile kurtarış/gol yeme kendi karnesine işlenir. */
  keeperOfRecordId?: string;
  shotType: ShotType;
  zone?: string;
  xg: number;
  pGoal: number;
  pSave: number;
  pBlocked: number;
  pOffTarget: number;
  pWoodwork: number;
}>;

/** Resolution is a separate fact so provisional goals can be reviewed before confirmation. */
export type ShotResolvedEvent = MatchEvent<'SHOT_RESOLVED', {
  shotId: string;
  outcome: ShotOutcome;
  goalkeeperId?: string;
  keeperOfRecordId?: string;
}>;
export type GoalConfirmedEvent = MatchEvent<'GOAL_CONFIRMED', {
  side: MatchSide;
  shotId: string;
  scorerId: string;
  assisterId?: string;
}>;
export type GoalDisallowedEvent = MatchEvent<'GOAL_DISALLOWED', {
  side: MatchSide;
  shotId: string;
  reason: 'offside' | 'foul' | 'handball' | 'other';
}>;

export type RefereeAssignedEvent = MatchEvent<'REFEREE_ASSIGNED', { refereeId: string; strictness: 'lenient' | 'balanced' | 'strict' }>;
export type FoulCalledEvent = MatchEvent<'FOUL_CALLED', { side: MatchSide; foulerId?: string; fouledId?: string; restartType: 'free_kick' | 'penalty'; refereeId: string }>;
export type RestartAwardedEvent = MatchEvent<'RESTART_AWARDED', { side: MatchSide; restartType: 'corner' | 'free_kick' | 'penalty'; takerId: string; takerSelection: 'assigned' | 'fallback'; refereeId: string; sourceFoulEventId?: string; sourceShotId?: string }>;
export type YellowCardEvent = MatchEvent<'YELLOW_CARD', { side: MatchSide; playerId: string; refereeId?: string }>;
export type RedCardEvent = MatchEvent<'RED_CARD', { side: MatchSide; playerId: string; reason: 'direct' | 'second_yellow'; refereeId?: string }>;
export type InjuryEvent = MatchEvent<'INJURY', { side: MatchSide; playerId: string; status: InjuryStatus; days?: number }>;
export type SubstitutionEvent = MatchEvent<'SUBSTITUTION', { side: MatchSide; playerOutId: string; playerInId: string }>;
export interface AiDecisionTrace {
  minute: number; scoreFor: number; scoreAgainst: number;
  xgFor: number; xgAgainst: number; recentXgFor: number; recentXgAgainst: number;
  wideAttacksFor: number; wideAttacksAgainst: number; centralAttacksFor: number; centralAttacksAgainst: number;
  redCardsFor: number; redCardsAgainst: number; averageFitness: number;
  challengePoints: number | null; challengeFactor: number; threatSignal: number;
  chosen: 'protect' | 'balanced' | 'positive' | 'all_out';
  utilities: Record<'protect' | 'balanced' | 'positive' | 'all_out', number>;
}
export type TacticChangeEvent = MatchEvent<'TACTIC_CHANGE', { side: MatchSide; tacticId: string; decisionTrace?: AiDecisionTrace }>;
export type VarReviewStartedEvent = MatchEvent<'VAR_REVIEW_STARTED', { side: MatchSide; shotId?: string; reason: 'goal' | 'penalty' | 'red_card' | 'offside' }>;
export type VarDecisionEvent = MatchEvent<'VAR_DECISION', { side: MatchSide; shotId?: string; decision: 'confirmed' | 'overturned' }>;
export type TouchlineInstructionEvent = MatchEvent<'TOUCHLINE_INSTRUCTION', { side: MatchSide; instruction: string; durationSeconds: number }>;

export type CoreMatchEvent =
  | KickOffEvent
  | HalfTimeEvent
  | FullTimeEvent
  | PossessionEndedEvent
  | ShotAttemptEvent
  | ShotResolvedEvent
  | GoalConfirmedEvent
  | GoalDisallowedEvent
  | RefereeAssignedEvent
  | FoulCalledEvent
  | RestartAwardedEvent
  | YellowCardEvent
  | RedCardEvent
  | InjuryEvent
  | SubstitutionEvent
  | TacticChangeEvent
  | VarReviewStartedEvent
  | VarDecisionEvent
  | TouchlineInstructionEvent;

/** Event payload without its deterministic id; EventLog assigns the id. */
type WithoutId<T> = T extends { readonly id: string } ? Omit<T, 'id'> : never;
export type MatchEventDraft = WithoutId<CoreMatchEvent>;

export interface SideMatchStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  /** Saves made by this side's goalkeeper. */
  saves: number;
  /** This side's shots saved by the opposing goalkeeper. */
  shotsSaved: number;
  blockedShots: number;
  offTargetShots: number;
  woodworkShots: number;
  disallowedShots: number;
  unresolvedShots: number;
  xg: number;
  yellowCards: number;
  redCards: number;
  foulsCommitted: number;
  corners: number;
  freeKicks: number;
  penalties: number;
  possessionSeconds: number;
  possessionPct: number;
}

export interface PlayerMatchStats {
  goals: number;
  assists: number;
  shots: number;
  saves: number;
  yellowCards: number;
  redCards: number;
}

export interface MatchStatSummary {
  home: SideMatchStats;
  away: SideMatchStats;
  players: Record<string, PlayerMatchStats>;
  totalPossessionSeconds: number;
}
