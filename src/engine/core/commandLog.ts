import type { MatchCommand } from './input';

export type MatchCommandDraft = Omit<MatchCommand, 'id' | 'issuedAtStep'> & { readonly issuedAtStep: number };

function stableValue(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`).join(',')}}`;
}

function cloneFreeze(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error('Match command payload must be JSON-like.');
    // Match JSON object semantics: optional undefined properties are omitted.
    // The tactics screen uses them when returning to an automatic lineup.
    const copied = Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cloneFreeze(item)]));
    return Object.freeze(copied);
  }
  throw new Error('Match command payload must be JSON-like.');
}

/** Stable, serializable command ledger. IDs and hashes never use wall-clock time. */
export class MatchCommandLog {
  private readonly commands: MatchCommand[] = [];
  private lastSecond = -1;
  private lastStep = -1;

  constructor(readonly matchId: string) {
    if (!matchId.trim()) throw new Error('MatchCommandLog requires a non-empty matchId.');
  }

  append(draft: MatchCommandDraft): MatchCommand {
    if (!Number.isInteger(draft.issuedAtSecond) || draft.issuedAtSecond < 0 || draft.issuedAtSecond < this.lastSecond) throw new Error('Match commands must be chronological non-negative seconds.');
    if (!Number.isInteger(draft.issuedAtStep) || draft.issuedAtStep < 0 || draft.issuedAtStep < this.lastStep) throw new Error('Match command steps must be chronological non-negative integers.');
    const sequence = this.commands.length + 1;
    const id = `${this.matchId}:cmd:${String(sequence).padStart(6, '0')}`;
    const payload = cloneFreeze(draft.payload) as Readonly<Record<string, unknown>>;
    const command = Object.freeze({ ...draft, id, payload });
    this.commands.push(command);
    this.lastSecond = draft.issuedAtSecond;
    this.lastStep = draft.issuedAtStep;
    return command;
  }

  readAll(): readonly MatchCommand[] { return this.commands.slice(); }

  /** FNV-1a 32-bit hash of canonical command JSON; suitable for replay identity checks. */
  hash(): string {
    const text = stableValue(this.commands);
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}

/** Hash arbitrary JSON-compatible replay output using canonical key ordering. */
export function deterministicReplayHash(value: unknown): string {
  const text = stableValue(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
