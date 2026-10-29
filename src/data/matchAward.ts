import type { Player } from '../types';
import type { DemoMatchResult, EngineRow } from '../store/game';
import type { TransferVoiceLine } from './transferVoices';

export interface MatchAward { id: string; player: Player | null; clubId: string; row: EngineRow }
/** Maç raporunun mevcut puan/gol/asist/şut/kimlik eşitlik sırasını paylaşır. */
export function selectMatchAward(result: Pick<DemoMatchResult, 'playerRows'>, clubOfPlayer: (id: string) => string | null, playerOf: (id: string) => Player | null): MatchAward | null {
  const rows = Object.entries(result.playerRows ?? {}).filter(([id]) => !!clubOfPlayer(id));
  rows.sort((x, y) => y[1].rating - x[1].rating || y[1].g - x[1].g || y[1].a - x[1].a || y[1].shots - x[1].shots || x[0].localeCompare(y[0]));
  const best = rows[0];
  if (!best) return null;
  const clubId = clubOfPlayer(best[0]);
  return clubId ? { id: best[0], player: playerOf(best[0]), clubId, row: best[1] } : null;
}

// Dinamik oyuncu adı ve puanı ekranda ayrı gösterilir; ses ve altyazı birebir aynı genel anonslardır.
export const MATCH_AWARD_LINES: readonly TransferVoiceLine[] = [
  { id: 'award-1', speaker: 'announcer', src: '/assets/match/voice/award-1.mp3', text: 'Ve şimdi maçın yıldızı! Sahanın en iyisini alkışlarla ödül kürsüsüne davet ediyoruz.' },
  { id: 'award-2', speaker: 'announcer', src: '/assets/match/voice/award-2.mp3', text: 'Alkışlar maçın oyuncusuna! Bugün sahada fark yaratan isim, ödülünü almak üzere aramızda.' },
];
export function matchAwardLine(playerId: string): TransferVoiceLine {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) hash = (Math.imul(hash, 31) + playerId.charCodeAt(i)) >>> 0;
  return MATCH_AWARD_LINES[hash % MATCH_AWARD_LINES.length];
}
