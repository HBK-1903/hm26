import type { Player, PlayerInjury } from '../types';

/** Only facts emitted by the match engine are carried over; no diagnosis is guessed. */
export interface MatchHealthEvidence {
  injuries?: readonly { playerId: string; days: number }[];
  suspensions?: readonly { playerId: string; matches: number }[];
  events?: readonly { kind: string; playerId?: string; anim?: { eventType: string; outcome?: string } }[];
}

/**
 * Apply recorded medical/card outcomes to the managed squad after normal match
 * recovery. Other clubs use the separate AI calendar and must not acquire bans
 * here that their calendar cannot serve. Never invent an injury body part or
 * permission to play through it; older results may contain no evidence at all.
 */
export function applyMatchHealthEvidence(
  squad: readonly Player[],
  existing: Record<string, Partial<Player>>,
  evidence: MatchHealthEvidence,
): { patches: Record<string, Partial<Player>>; notes: string[] } {
  const players = new Map(squad.map((player) => [player.id, player]));
  const patches = { ...existing };
  const notes: string[] = [];
  const severityQueues = new Map<string, string[]>();
  for (const event of evidence.events ?? []) {
    if (event.kind !== 'injury' || !event.playerId || event.anim?.eventType !== 'injury') continue;
    const queue = severityQueues.get(event.playerId) ?? [];
    queue.push(event.anim.outcome ?? '');
    severityQueues.set(event.playerId, queue);
  }
  for (const record of evidence.injuries ?? []) {
    const player = players.get(record.playerId);
    const rawSeverity = severityQueues.get(record.playerId)?.shift();
    if (!player || !Number.isSafeInteger(record.days) || record.days < 1) continue;
    const previous = patches[player.id] ?? {};
    const currentDays = previous.injuredDays ?? player.injuredDays ?? 0;
    // A second injury in the same match must never shorten an existing one.
    if (record.days > currentDays) {
      const severity: PlayerInjury['severity'] = rawSeverity === 'hafif' || rawSeverity === 'orta' ? rawSeverity : rawSeverity === 'ağır' ? 'ciddi' : 'bilinmiyor';
      const injury: PlayerInjury = { type: 'bilinmeyen', name: 'Maç sakatlığı (türü bilinmiyor)', daysRemaining: record.days, severity, canPlayWithRisk: false };
      patches[player.id] = { ...previous, injuredDays: record.days, injury };
    }
    notes.push(`${player.name}: ${Math.max(currentDays, record.days)} gün sakat`);
  }
  for (const record of evidence.suspensions ?? []) {
    const player = players.get(record.playerId);
    if (!player || !Number.isSafeInteger(record.matches) || record.matches < 1) continue;
    const previous = patches[player.id] ?? {};
    const matches = Math.max(previous.suspendedMatches ?? player.suspendedMatches ?? 0, record.matches);
    patches[player.id] = { ...previous, suspendedMatches: matches };
    notes.push(`${player.name}: ${matches} maç cezalı`);
  }
  return { patches, notes };
}
