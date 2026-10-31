// Historical import path retained for Wave-3 consumers; core-only callers can
// import replaySimulation directly from replayCore without loading an adapter.
export { matchReplayHash, replaySimulation, type ReplayVerification } from './replayCore';
export { replayMatch } from '../adapters/replay';
