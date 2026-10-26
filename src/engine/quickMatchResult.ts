// Quick-match path: adapt only the confirmed engine result; never post-edit the score.
import { matchEngineToDemo } from './adapter';
import { simulateMatch, type MatchInput } from './engine';

export function buildQuickMatchResult(input: MatchInput, homeId: string, awayId: string) {
  const result = matchEngineToDemo(simulateMatch(input));
  result.homeId = homeId;
  result.awayId = awayId;
  return result;
}
