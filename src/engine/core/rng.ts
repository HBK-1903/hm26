// Independent deterministic streams: UI/presentation draws cannot shift football outcomes.

export const RNG_STREAM_NAMES = ['flow', 'duel', 'shot', 'referee', 'injury', 'ai', 'presentation'] as const;
export type RngStreamName = typeof RNG_STREAM_NAMES[number];

export interface RngBundleSnapshot {
  readonly version: 'rng-bundle-v1';
  readonly masterSeed: number;
  readonly states: Readonly<Record<RngStreamName, number>>;
}

function hashSeed(seed: number, label: string): number {
  const value = `${seed >>> 0}:${label}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}

/** Small, serializable PRNG stream; no Math.random or wall-clock inputs. */
export class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('RNG seed must be a uint32.');
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  snapshot(): number { return this.state >>> 0; }
  restore(state: number): void {
    if (!Number.isInteger(state) || state < 0 || state > 0xffffffff) throw new Error('RNG state must be a uint32.');
    this.state = state >>> 0;
  }
}

export class RngBundle {
  readonly masterSeed: number;
  private readonly streams: Record<RngStreamName, DeterministicRng>;

  constructor(masterSeed: number) {
    if (!Number.isInteger(masterSeed) || masterSeed < 0 || masterSeed > 0xffffffff) throw new Error('Master seed must be a uint32.');
    this.masterSeed = masterSeed >>> 0;
    this.streams = Object.fromEntries(RNG_STREAM_NAMES.map((name) => [name, new DeterministicRng(hashSeed(this.masterSeed, name))])) as Record<RngStreamName, DeterministicRng>;
  }

  static fromSnapshot(snapshot: RngBundleSnapshot): RngBundle {
    if (snapshot.version !== 'rng-bundle-v1') throw new Error(`Unsupported RNG bundle version: ${String(snapshot.version)}.`);
    const bundle = new RngBundle(snapshot.masterSeed);
    for (const name of RNG_STREAM_NAMES) bundle.streams[name].restore(snapshot.states[name]);
    return bundle;
  }

  next(stream: RngStreamName): number { return this.streams[stream].next(); }

  snapshot(): RngBundleSnapshot {
    const states = Object.fromEntries(RNG_STREAM_NAMES.map((name) => [name, this.streams[name].snapshot()])) as Record<RngStreamName, number>;
    return Object.freeze({ version: 'rng-bundle-v1', masterSeed: this.masterSeed, states: Object.freeze(states) });
  }
}
