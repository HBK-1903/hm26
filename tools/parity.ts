// Motor ↔ MatchSession parity testi (aynı seed → aynı davranış dağılımı)
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';

const WORLD_SEED = 20260803;
const A = CLUBS.filter((c) => c.league === 'gecit').slice(0, 8);
let G = 0, H = 0, D = 0, away = 0;
for (let i = 0; i < 300; i++) {
  const c1 = A[i % A.length], c2 = A[(i + 3) % A.length];
  const sess = new MatchSession({
    homeClub: c1, awayClub: c2,
    homeSquad: genSquad(c1, WORLD_SEED), awaySquad: genSquad(c2, WORLD_SEED),
    homeTactic: aiDefaultTactic(c1, c2, c2.strength), awayTactic: aiDefaultTactic(c2, c1, c1.strength),
    seed: WORLD_SEED + i * 991, goalPace: 'dengeli', randomness: 'normal',
  });
  const r = sess.finishNow();
  G += r.stats.hg + r.stats.ag;
  if (r.stats.hg > r.stats.ag) H++; else if (r.stats.hg === r.stats.ag) D++; else away++;
}
console.log(`MatchSession parity: n=300 | avgG ${(G / 300).toFixed(2)} | ev ${(H / 300 * 100).toFixed(1)}% ber ${(D / 300 * 100).toFixed(1)}% dep ${(away / 300 * 100).toFixed(1)}%`);
