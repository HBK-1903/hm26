export interface EngineConfig {
  readonly version: string;
  readonly rngVersion: 'rng-bundle-v1';
  readonly clock: {
    /** Regulation length of one half, in match seconds; stoppage rules are a later wave. */
    readonly halfLengthSeconds: number;
  };
  readonly substitutions: {
    readonly maxPerTeam: number;
    readonly windowsPerTeam: number;
    readonly halftimeWindowFree: boolean;
  };
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = Object.freeze({
  version: 'match-core-1.0.0',
  rngVersion: 'rng-bundle-v1',
  clock: Object.freeze({ halfLengthSeconds: 45 * 60 }),
  substitutions: Object.freeze({ maxPerTeam: 5, windowsPerTeam: 3, halftimeWindowFree: true }),
});

export function validateEngineConfig(config: EngineConfig): void {
  if (!config.version.trim()) throw new Error('EngineConfig requires a version.');
  if (config.rngVersion !== 'rng-bundle-v1') throw new Error(`Unsupported RNG version: ${String(config.rngVersion)}.`);
  if (!Number.isInteger(config.clock.halfLengthSeconds) || config.clock.halfLengthSeconds <= 0) throw new Error('Half length must be a positive integer number of seconds.');
  if (!Number.isInteger(config.substitutions.maxPerTeam) || config.substitutions.maxPerTeam < 0) throw new Error('Invalid maximum substitutions.');
  if (!Number.isInteger(config.substitutions.windowsPerTeam) || config.substitutions.windowsPerTeam < 0) throw new Error('Invalid substitution windows.');
}
