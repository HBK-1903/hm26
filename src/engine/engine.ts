// Public compatibility facade for callers of the historical engine API.
// All actual live and instant simulation is executed by the same core.
import type { Club, Player, TacticPlan } from '../types';
import { MatchSession } from './session';
import type { Weather } from './core/contracts';
export type { Weather, MatchAnimationType, MatchStateEvent, MatchStats, IfabSubState, EngineShot, MatchResult } from './core/contracts';
export { aiDefaultTactic } from './tactics';

// customLineup'a yer: home/away için 11-dizili id listesi (export engine'den yuvaya eğer)
export interface MatchInput {
  /** Dalga 5: kullanıcı tarafı (canlı maç) — AI otomatik değişikliği bu tarafa karışmaz */
  userSide?: 'home' | 'away';
  /** Career difficulty is a pre-match AI tactical-responsiveness input, never a post-match score edit. */
  challengeClubId?: string;
  challengePoints?: number;
  /** v0.9.9 iğneyle oynatma: riskli sakatla kadroya alınan oyuncu id'leri (kullanıcı tarafı) */
  riskIds?: string[];
  homeClub: Club;
  awayClub: Club;
  homeSquad: Player[];
  awaySquad: Player[];
  /** Kullanıcı tarafı (ev ise home tactic = kullanıcı) veya AI varsayılanı */
  homeTactic: TacticPlan;
  awayTactic?: TacticPlan;         // yoksa genel profilden üretilir
  seed: number;
  /** FAZ 2: kullanıcı elle dizdiği İlk 11 id'leri (boş yuvalar null) — autoLineup'a direktif */                    // maç seed
  derby?: boolean;
  cup?: boolean;                   // kupa = hafif strateji farkı
  goalPace: 'dusuk' | 'dengeli' | 'yuksek';
  randomness: 'low' | 'normal' | 'high';
  weather?: Weather;
  subMgr?: SubManager;             // maç-içi değişiklik/taktik komutları
}

/** Maç-içi müdahale arayüzü — kullanıcı LiveMatch'ten bağlar */
export interface SubManager {
  /** Değişiklik isteği kuyruğu (sıradaki uygun durakta işlenir) */
  takeSubRequest(owner: 'home' | 'away'): { outId: string; inId: string } | null;
  /** Taktik plan geçişi isteği (§5.3) */
  takeTacticRequest(owner: 'home' | 'away'): { plan: TacticPlan } | null;
}

/** Instant fixtures run the same simulation core as the live adapter. */
export function simulateMatch(input: MatchInput): import('./core/contracts').MatchResult {
  return new MatchSession(input).finishNow();
}
