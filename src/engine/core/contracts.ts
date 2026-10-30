// Shared match-domain contracts. No UI, timer, browser or store dependencies.
import type { ZoneId } from '../zones';
import type { NarrationEvent } from '../narrate';
import type { RefereeProfile } from '../referee';
import type { AiDecisionTrace } from './types';

export type Weather = 'acik' | 'yagmur' | 'sicak' | 'rüzgar' | 'kotuZemin';

export type MatchAnimationType = 'routine' | 'dangerous_attack' | 'shot' | 'goal' | 'card' | 'injury' | 'var' | 'substitution' | 'tactic' | 'halftime' | 'fulltime' | 'save' | 'line_clearance' | 'free_kick' | 'brawl' | 'woodwork' | 'volley';

export interface MatchStateEvent extends NarrationEvent {
  anim?: {
    eventType: MatchAnimationType;
    attackingTeamId?: string;
    path?: ZoneId[];
    actors?: string[];
    outcome?: string;
  };
  shotsAfter?: { h: number; a: number };
}

export interface MatchStats {
  hg: number; ag: number;
  xgH: number; xgA: number;
  shotsH: number; shotsA: number;
  onH: number; onA: number;
  posH: number;                            // %
  cornersH: number; cornersA: number;
  foulsH: number; foulsA: number;
  yellowH: number; yellowA: number;
  redH: number; redA: number;
  savesH: number; savesA: number;
  possessionCount: number;
  /** kanal buluşma sayıları */
  wideAttH: number; wideAttA: number; centralAttH: number; centralAttA: number;
  pressWinsH: number; pressWinsA: number;
  /** §13.2 oyuncu istatistikleri */
  playerRows: Record<string, { min: number; g: number; a: number; shots: number; saves: number; yellow: number; red: number; posGroup: string; endFit: number; rating: number; conceded: number }>; // v0.9.5: conceded = GK gol yeme
}

/** Dalga 5: IFAB 2022 kalıcı kuralı — takım başına 5 değişiklik hakkı, en fazla 3 durakta (devre arası serbest) */
export interface IfabSubState {
  subsLeft: Record<'home' | 'away', number>;
  windowsLeft: Record<'home' | 'away', number>;
  windowsUsed: Record<'home' | 'away', number>;
}

/** Dalga 2 (§5-D): şut günlüğü satırı — maç sonu vuruş haritası için */
export interface EngineShot {
  minute: number;
  side: 'home' | 'away';
  zone: ZoneId;
  xg: number;
  outcome: 'goal' | 'save' | 'miss' | 'clearance' | 'woodwork';
}

export interface MatchResult {
  seed: number;
  stats: MatchStats;
  events: MatchStateEvent[];
  insights: string[];
  shotsLog: EngineShot[];
  /** Maçta sakatlanan oyuncular: { playerId, days } */
  injuries: { playerId: string; days: number }[];
  /** Kırmızı kart → maç cezası */
  suspensions: { playerId: string; matches: number }[];
  referee?: RefereeProfile;
  /** QA/audit telemetry for the non-user AI's two in-match plan decisions. */
  aiDecisionTraces?: AiDecisionTrace[];
}

