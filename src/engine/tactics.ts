import type { Club, TacticPlan } from '../types';
import type { AiDecisionTrace } from './core/types';

/** Shared opponent tactic selection for live and instant simulations. */
export function aiDefaultTactic(club: Club, opp: Club, _legacyStrength?: number): TacticPlan {
  // Use actual club-vs-opponent strength; older callers passed either side's strength here.
  const stronger = club.strength >= opp.strength;
  return {
    id: `ai-${club.id}`, name: 'AI Planı',
    formation: stronger ? '4-3-3' : '4-4-2',
    plan: stronger ? 'dengeli' : 'hizliKontra',
    press: stronger ? 'mid' : 'low',
    tempo: 'mid',
    direction: 'balanced',
    defLine: stronger ? 'normal' : 'deep',
    passRisk: stronger ? 'mid' : 'direct',
    width: 50,
    fbAdvanced: stronger,
    midLine: 'mid',
    strikerSupport: 'mid',
    setPieces: { captain: null, penalty: null, cornerL: null, cornerR: null, fkShort: null, fkLong: null },
  };
}

export interface AiTacticContext {
  minute: number;
  goalsFor: number;
  goalsAgainst: number;
  averageFitness?: number;
  /** Opponent AI responsiveness from the user's career difficulty (0–100). */
  challengePoints?: number;
  xgFor?: number; xgAgainst?: number;
  recentXgFor?: number; recentXgAgainst?: number;
  wideAttacksFor?: number; wideAttacksAgainst?: number;
  centralAttacksFor?: number; centralAttacksAgainst?: number;
  redCardsFor?: number; redCardsAgainst?: number;
}

/** Maps career challenge points to a bounded, pre-match AI response factor (0.8–1.2). */
export function aiChallengeResponsiveness(challengePoints?: number): number {
  if (challengePoints === undefined || !Number.isFinite(challengePoints)) return 1;
  const normalized = Math.max(0, Math.min(100, challengePoints));
  return 0.8 + normalized * 0.004;
}

export type AiTacticUtility = 'protect' | 'balanced' | 'positive' | 'all_out';
interface Candidate { style: AiTacticUtility; aggression: number; baseUtility: number; tactic: TacticPlan }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: number | undefined, fallback = 0) => Number.isFinite(value) ? value! : fallback;

export interface AiTacticDecision { tactic: TacticPlan; trace: AiDecisionTrace }

/**
 * Deterministic utility choice for a non-user-managed side. The trace contains only
 * match-derived context and its utility inputs; no presentation state or hidden rolls.
 */
export function chooseAiTacticDecision(club: Club, opponent: Club, context: AiTacticContext): AiTacticDecision {
  const base = aiDefaultTactic(club, opponent);
  const minute = clamp(finite(context.minute), 0, 120);
  const goalsFor = finite(context.goalsFor), goalsAgainst = finite(context.goalsAgainst);
  const fitness = clamp(finite(context.averageFitness, 100), 0, 100);
  const xgFor = Math.max(0, finite(context.xgFor)), xgAgainst = Math.max(0, finite(context.xgAgainst));
  const recentXgFor = Math.max(0, finite(context.recentXgFor)), recentXgAgainst = Math.max(0, finite(context.recentXgAgainst));
  const wideAttacksFor = Math.max(0, finite(context.wideAttacksFor)), wideAttacksAgainst = Math.max(0, finite(context.wideAttacksAgainst));
  const centralAttacksFor = Math.max(0, finite(context.centralAttacksFor)), centralAttacksAgainst = Math.max(0, finite(context.centralAttacksAgainst));
  const redCardsFor = Math.max(0, finite(context.redCardsFor)), redCardsAgainst = Math.max(0, finite(context.redCardsAgainst));
  const challengeFactor = aiChallengeResponsiveness(context.challengePoints);
  const strengthEdge = club.strength - opponent.strength;
  const channelThreat = clamp(((wideAttacksAgainst + centralAttacksAgainst) - (wideAttacksFor + centralAttacksFor)) / 20, -1, 1);
  const redDisadvantage = clamp(redCardsFor - redCardsAgainst, -1, 1);
  const threatSignal = clamp((xgAgainst - xgFor) * 0.06 + (recentXgAgainst - recentXgFor) * 0.12 + channelThreat * 0.06 + redDisadvantage * 0.1, -0.45, 0.45);
  const contextFactor = clamp(1 + threatSignal, 0.55, 1.45);
  const decisionFactor = challengeFactor * contextFactor;
  const chaseUrgency = Math.min(1, Math.max(0, (minute - 48) / 37)) * Math.min(2, Math.max(0, goalsAgainst - goalsFor)) * decisionFactor;
  const protectUrgency = Math.min(1, Math.max(0, (minute - 58) / 30)) * Math.min(2, Math.max(0, goalsFor - goalsAgainst)) * decisionFactor;
  const pressCost = Math.max(0, 70 - fitness) * 0.12;

  const candidates: Candidate[] = [
    {
      style: 'protect', aggression: -0.8, baseUtility: strengthEdge < -8 ? 0.3 : -0.1,
      tactic: { ...base, plan: 'dusukBlok', press: 'low', tempo: 'low', defLine: 'deep', passRisk: 'safe', width: 44, fbAdvanced: false },
    },
    {
      style: 'balanced', aggression: 0, baseUtility: Math.abs(strengthEdge) <= 8 ? 1.1 : strengthEdge > 8 ? 0.9 : 0.55,
      tactic: { ...base },
    },
    {
      style: 'positive', aggression: 0.55, baseUtility: strengthEdge > 8 ? 0.45 : 0.2,
      tactic: { ...base, plan: 'dengeli', press: 'high', tempo: 'high', defLine: 'normal', passRisk: 'direct', width: 58, fbAdvanced: true },
    },
    {
      style: 'all_out', aggression: 1, baseUtility: -1.15,
      tactic: { ...base, plan: 'yuksekPres', press: 'high', tempo: 'high', defLine: 'high', passRisk: 'direct', width: 66, fbAdvanced: true },
    },
  ];
  const utility = (candidate: Candidate): number => candidate.baseUtility
    + candidate.aggression * chaseUrgency * 6.2
    - candidate.aggression * protectUrgency * 7.2
    - (candidate.aggression > 0 ? pressCost * candidate.aggression : 0);
  const utilities = Object.fromEntries(candidates.map((candidate) => [candidate.style, utility(candidate)])) as Record<AiTacticUtility, number>;
  candidates.sort((a, b) => utilities[b.style] - utilities[a.style]);
  const chosen = candidates[0];
  const labels: Record<AiTacticUtility, string> = {
    protect: 'Skoru Koru', balanced: 'Dengeli', positive: 'Önde Baskı', all_out: 'Tam Hücum',
  };
  const tactic = { ...chosen.tactic, id: `ai-${club.id}-${chosen.style}`, name: `AI: ${labels[chosen.style]}` };
  const trace: AiDecisionTrace = {
    minute, scoreFor: goalsFor, scoreAgainst: goalsAgainst,
    xgFor, xgAgainst, recentXgFor, recentXgAgainst,
    wideAttacksFor, wideAttacksAgainst, centralAttacksFor, centralAttacksAgainst,
    redCardsFor, redCardsAgainst, averageFitness: fitness,
    challengePoints: context.challengePoints ?? null, challengeFactor, threatSignal,
    chosen: chosen.style, utilities,
  };
  return { tactic, trace };
}

/** Compatibility wrapper for callers that need only the selected plan. */
export function chooseAiTactic(club: Club, opponent: Club, context: AiTacticContext): TacticPlan {
  return chooseAiTacticDecision(club, opponent, context).tactic;
}
