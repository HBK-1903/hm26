// Deterministic pre/post-refactor fingerprint. Keep this separate from statistical balance.
import { writeFileSync } from 'node:fs';
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic } from '../src/engine/tactics';
import { MatchSession } from '../src/engine/session';
import { deterministicReplayHash } from '../src/engine/core/commandLog';
import type { MatchInput, Weather } from '../src/engine/engine';

const weather: Weather[] = ['acik', 'yagmur', 'sicak', 'rüzgar', 'kotuZemin'];
const squads = new Map(CLUBS.map((club) => [club.id, genSquad(club, 82091)]));
const hashes: string[] = [];
for (let i = 0; i < 96; i++) {
  const home = CLUBS[i % CLUBS.length], away = CLUBS[(i * 7 + 13) % CLUBS.length];
  if (home.id === away.id) continue;
  const input: MatchInput = {
    homeClub: home, awayClub: away, homeSquad: squads.get(home.id)!, awaySquad: squads.get(away.id)!,
    homeTactic: aiDefaultTactic(home, away), awayTactic: aiDefaultTactic(away, home),
    seed: 70121 + i * 7919, weather: weather[i % weather.length],
    goalPace: (['dusuk', 'dengeli', 'yuksek'] as const)[i % 3], randomness: (['low', 'normal', 'high'] as const)[i % 3],
    derby: i % 2 === 0, userSide: i % 2 === 0 ? 'home' : 'away', challengeClubId: home.id, challengePoints: (i * 19) % 101,
  };
  const session = new MatchSession(input);
  const side = input.userSide!;
  if (i % 3 === 0) {
    session.queueTactic(side, { ...(side === 'home' ? input.homeTactic : input.awayTactic!), tempo: 'high' });
    session.useShout(side, 'pump');
  }
  for (let step = 0; !session.done; step++) {
    if (step === 12 && i % 2 === 0) {
      const outgoing = session.getSlots(side).find((slot) => slot.slotGroup !== 'GK');
      const incoming = session.getBench(side)[0];
      if (outgoing && incoming) session.queueSub(side, outgoing.player.id, incoming.id);
    }
    if (session.getMinute() >= 45 && session.getMinute() <= 46 && i % 4 === 0) session.applyTeamTalk(side, 'calm');
    session.step();
  }
  hashes.push(deterministicReplayHash({ result: session.toResult(), commands: session.getCommandLog(), events: session.getCoreEvents() }));
}
const result = { count: hashes.length, hash: deterministicReplayHash(hashes), hashes };
if (process.env.HM26_FINGERPRINT_FILE) writeFileSync(process.env.HM26_FINGERPRINT_FILE, JSON.stringify(result, null, 2));
console.log(`MATCH-FINGERPRINT: ${result.count} maç · ${result.hash}`);
