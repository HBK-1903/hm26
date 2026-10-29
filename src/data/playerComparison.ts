// The comparison desk is a read-only view of existing squads and the current market.
import type { LeagueId, Player } from '../types';
import { genFreeAgent } from './gen';
import { resolveMarketShortlist } from './marketOpportunities';
import { clubByIdSafe } from './clubs';

export function marketRefreshDays(refresh: string | undefined): number {
  return refresh === 'sakin' ? 30 : refresh === 'yogun' ? 7 : 14;
}

/** The same seeded free-agent identities used by the active market cycle. */
export function currentMarketFreeAgents(seed: number, cycleNo: number, league: LeagueId): Player[] {
  return Array.from({ length: 12 }, (_, index) => genFreeAgent(seed + cycleNo * 977, league, index, 'free'));
}

export function comparisonCandidates(input: {
  squads: Record<string, Player[]>;
  ownClubId: string;
  seed: number;
  cycleNo: number;
  league: LeagueId;
  shortlistIds?: string[];
  shortlistSnapshots?: Player[];
  initial?: Player | null;
}): Player[] {
  const byId = new Map<string, Player>();
  const add = (player: Player | null | undefined) => {
    if (player?.id && !byId.has(player.id)) byId.set(player.id, player);
  };
  // Current ownership and player patches always beat a market/shortlist snapshot.
  (input.squads[input.ownClubId] ?? []).forEach(add);
  Object.values(input.squads).forEach((squad) => squad.forEach(add));
  currentMarketFreeAgents(input.seed, input.cycleNo, input.league).forEach(add);
  resolveMarketShortlist(input.shortlistIds ?? [], input.shortlistSnapshots ?? [], (id) => byId.get(id) ?? null).forEach(add);
  add(input.initial);
  return [...byId.values()];
}

export const comparisonSearchKey = (value: string): string => value.trim().toLocaleLowerCase('tr')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');

export function comparisonClubName(player: Player): string {
  if (player.clubId === 'free' || player.clubId === 'FA') return 'Serbest oyuncu';
  return clubByIdSafe(player.clubId)?.name ?? 'Kulüp bilgisi yok';
}

const POSITION: Record<string, string> = {
  GK: 'Kaleci', CB: 'Stoper', FB: 'Bek', WB: 'Kanat bek', DM: 'Defansif orta saha',
  CM: 'Merkez orta saha', AM: 'Ofansif orta saha', WG: 'Kanat', ST: 'Santrfor',
};
const numeric = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const numberText = (value: unknown): string => {
  const n = numeric(value);
  return n === null ? '—' : n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
};

/** Missing legacy fields are displayed as unknown, not converted to a guessed zero. */
export function comparisonValues(player: Player | null): string[] {
  if (!player) return Array(7).fill('—');
  const wage = numeric(player.wage);
  const fitness = numeric(player.fitness);
  return [
    numberText(player.ratings?.gen), numberText(player.potential), numberText(player.age),
    wage === null ? '—' : `₺${numberText(wage)} bin/ay`,
    fitness === null ? '—' : `%${numberText(fitness)}`,
    POSITION[player.group] ?? (player.group || '—'), comparisonClubName(player),
  ];
}
