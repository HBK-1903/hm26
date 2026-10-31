// The background AI fixture simulator produces a score, not a minute-by-minute
// match. Define its participants explicitly: the available starting XI selected
// by the same lineup rule as the match engine. It does not simulate substitutions
// or invent ratings/cards. Old fixtures have no lineup evidence and are not rebuilt.
import type { Formation, Player } from '../types';
import type { StatLine } from '../data/awards';
import { autoLineup } from './profiles';

export type AiStatLine = StatLine & { conceded?: number; cleanSheets?: number; saves?: number };
export type AiStats = Record<string, AiStatLine>;

export function aiStartingPlayers(squad: Player[], formation: Formation): Player[] {
  return autoLineup(squad, formation).slots.map((slot) => slot.player);
}

function attackingOrder(players: readonly Player[]): Player[] {
  const weight = (player: Player) => player.group === 'ST' ? 4 : player.group === 'WG' ? 3 : player.group === 'AM' ? 2.5 : player.group === 'CM' ? 1.5 : 0.8;
  return [...players].sort((a, b) => weight(b) * b.ratings.gen - weight(a) * a.ratings.gen);
}

/** Draw the international score sheet once, so its scorers match season totals. */
export function aiGoalScorers(players: readonly Player[], goals: number, rng: () => number, hadSquad = players.length > 0): Player[] {
  if (goals <= 0 || !hadSquad) return [];
  const weighted = attackingOrder(players);
  const result: Player[] = [];
  for (let i = 0; i < Math.min(6, goals); i++) {
    const roll = rng();
    if (weighted.length) result.push(weighted[Math.floor(roll ** 2 * Math.min(8, weighted.length))]);
  }
  return result;
}

/**
 * One appearance per selected participant, including in a 0–0; goals/assists
 * only go to participants. The legacy score RNG's draw count is preserved for
 * existing league/international fixtures, even when no eligible XI remains.
 */
export function recordAiMatch(
  stats: AiStats, clubId: string, players: readonly Player[], goals: number,
  rng: () => number, hadSquad = players.length > 0, scorers?: readonly Player[],
): AiStats {
  const out = { ...stats };
  // Imported IDs are data, even when they happen to be object prototype names.
  const get = (id: string) => Object.prototype.hasOwnProperty.call(out, id) ? out[id] : undefined;
  const put = (id: string, row: AiStatLine) => Object.defineProperty(out, id, { value: row, writable: true, enumerable: true, configurable: true });
  const uniquePlayers = [...new Map(players.map((player) => [player.id, player])).values()];
  const participantIds = new Set(uniquePlayers.map((player) => player.id));
  for (const player of uniquePlayers) {
    const prev = get(player.id) ?? { playerId: player.id, clubId, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 0, apps: 0 };
    put(player.id, { ...prev, clubId, apps: prev.apps + 1 });
  }
  if (goals <= 0 || !hadSquad) return out;
  const weighted = attackingOrder(uniquePlayers);
  for (let i = 0; i < goals; i++) {
    // International scorers were already drawn above; still consume this draw
    // to preserve the established score/penalty RNG stream for later fixtures.
    const scorerRoll = rng();
    const hasAssist = rng() < 0.65;
    const assistRoll = hasAssist ? rng() : 0;
    if (!weighted.length) continue;
    const scorer = scorers?.[i] ?? weighted[Math.floor(scorerRoll ** 2 * Math.min(8, weighted.length))];
    const prev = get(scorer.id);
    if (!participantIds.has(scorer.id) || !prev) continue; // supplied scorers must actually be in this XI
    put(scorer.id, { ...prev, goals: prev.goals + 1 });
    if (hasAssist) {
      const assister = weighted[Math.floor(assistRoll ** 1.5 * Math.min(10, weighted.length))];
      if (assister.id !== scorer.id) {
        const pa = get(assister.id);
        if (pa) put(assister.id, { ...pa, assists: pa.assists + 1 });
      }
    }
  }
  return out;
}
