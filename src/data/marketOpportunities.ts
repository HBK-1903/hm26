// Seeded, cycle-varying one-target-per-club market discovery.
import type { Player } from '../types';
import { mulberry32 } from './gen';

export interface MarketOpportunityCandidate { player: Player; clubId: string; rankScore: number }

function hashId(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function resolveMarketShortlist(playerIds: string[], snapshots: Player[], liveLookup: (playerId: string) => Player | null): Player[] {
  const saved = new Map(snapshots.map((player) => [player.id, player]));
  return [...new Set(playerIds)].flatMap((id) => {
    const player = liveLookup(id) ?? saved.get(id);
    return player ? [player] : [];
  });
}

export function selectClubOpportunities(input: {
  seed: number;
  cycleNo: number;
  ownClubId: string;
  squads: Record<string, Player[]>;
  chance?: number;
}): MarketOpportunityCandidate[] {
  const out: MarketOpportunityCandidate[] = [];
  const chance = Math.max(0, Math.min(1, input.chance ?? 0.48));
  Object.entries(input.squads).sort(([a], [b]) => a.localeCompare(b)).forEach(([clubId, squad]) => {
    if (clubId === input.ownClubId || clubId === 'FA' || squad.length === 0) return;
    const cycleSalt = Math.imul((input.cycleNo + 1) >>> 0, 0x9e3779b1);
    const rng = mulberry32((input.seed ^ hashId(clubId) ^ cycleSalt) >>> 0);
    if (rng() > chance) return;
    const candidates = [...squad].sort((a, b) => b.ratings.gen - a.ratings.gen || a.id.localeCompare(b.id)).slice(0, Math.min(12, squad.length));
    const player = candidates[Math.floor(rng() * candidates.length)];
    if (!player) return;
    const potentialRoom = Math.max(0, player.potential - player.ratings.gen);
    const rankScore = player.ratings.gen * 0.6 + potentialRoom * 0.35 + rng() * 35;
    out.push({ player, clubId, rankScore });
  });
  return out.sort((a, b) => b.rankScore - a.rankScore || a.clubId.localeCompare(b.clubId));
}
