// HM26 §15.1 — Toplu simülasyon denge testi (seedli tekrarlanabilir)
// Çalıştır: npx --yes tsx tools/masssim.ts
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { simulateMatch, aiDefaultTactic, Weather } from '../src/engine/engine';
import { TacticPlan, Club as ClubType } from '../src/types';

const WORLD_SEED = 20260803;

interface Bucket { games: number; goals: number; homeWins: number; draws: number; awayWins: number; host: string; up: string; reds: number; cards: number; pens: number; xgH: number; xgA: number; }

function bucket(): Bucket { return { games: 0, goals: 0, homeWins: 0, draws: 0, awayWins: 0, host: '', up: '', reds: 0, cards: 0, pens: 0, xgH: 0, xgA: 0 }; }

function runPair(ha: ClubType, hb: ClubType, seed: number, label: string, weather: Weather, stats: Record<string, Bucket>) {
  const sq1 = genSquad(ha, WORLD_SEED);
  const sq2 = genSquad(hb, WORLD_SEED);
  const tac1: TacticPlan = aiDefaultTactic(ha, hb, hb.strength);
  const tac2 = aiDefaultTactic(hb, ha, ha.strength);
  const res = simulateMatch({ homeClub: ha, awayClub: hb, homeSquad: sq1, awaySquad: sq2, homeTactic: tac1, awayTactic: tac2, seed, goalPace: 'dengeli', randomness: 'normal', weather });
  const K = `${label}`;
  stats[K] = stats[K] ?? bucket();
  stats[K].games++;
  stats[K].goals += res.stats.hg + res.stats.ag;
  if (res.stats.hg > res.stats.ag) stats[K].homeWins++;
  else if (res.stats.hg === res.stats.ag) stats[K].draws++;
  else stats[K].awayWins++;
  stats[K].reds += res.stats.redH + res.stats.redA;
  stats[K].cards += res.stats.yellowH + res.stats.yellowA;
  stats[K].xgH += res.stats.xgH; stats[K].xgA += res.stats.xgA;
}

const stats: Record<string, Bucket> = {};
const valid = (c: ClubType) => c.strength >= 40 && c.strength <= 95;

// 1.000 Miras Zirve (güçlü) — eşit iki kulüp
const zirveA = CLUBS.filter((c) => c.league === 'zirve' && valid(c));
const zirveB = CLUBS.filter((c) => c.league === 'zirve' && valid(c));
for (let i = 0; i < 1000; i++) {
  runPair(zirveA[i % zirveA.length], zirveB[(i + 7) % zirveB.length], WORLD_SEED + i * 991, 'zirve', i % 9 === 0 ? 'yagmur' : i % 11 === 0 ? 'sicak' : 'acik', stats);
}

// 1.000 Geçit Ulusal (orta)
const gecitA = CLUBS.filter((c) => c.league === 'gecit');
const gecitB = CLUBS.filter((c) => c.league === 'gecit');
for (let i = 0; i < 1000; i++) {
  runPair(gecitA[i % gecitA.length], gecitB[(i + 5) % gecitB.length], WORLD_SEED + 5000 + i * 991, 'gecit', i % 7 === 0 ? 'rüzgar' : 'acik', stats);
}

// 1.000 Kök Bölge (alt)
const kokA = CLUBS.filter((c) => c.league === 'kok');
const kokB = CLUBS.filter((c) => c.league === 'kok');
for (let i = 0; i < 1000; i++) {
  runPair(kokA[i % kokA.length], kokB[(i + 3) % kokB.length], WORLD_SEED + 9000 + i * 991, 'kok', i % 8 === 0 ? 'kotuZemin' : 'acik', stats);
}

// 500 kupa eşleşmesi (favori alt-lig)
for (let i = 0; i < 500; i++) {
  const fav = zirveA[i % zirveA.length];
  const dog = kokB[(i + 11) % kokB.length];
  runPair(fav, dog, WORLD_SEED + 13000 + i * 991, 'kupa', 'acik', stats);
}

// 500 alt lig kupa sürprizi ev sahibi senaryosu
for (let i = 0; i < 500; i++) {
  const fav = zirveB[i % zirveB.length];
  const dog = kokA[(i + 13) % kokA.length];
  runPair(dog, fav, WORLD_SEED + 16300 + i * 991, 'kupaEv', 'acik', stats); // ev = alt
}

// Rapor
console.log('\n=== HM26 §15.1 Toplu Simülasyon Raporu ===\n');
console.log('Kadro gücü etkisi, ev sahibi avantajı, gol dağılımı ve alt-lig sürpriz oranı');
console.log('—'.repeat(72));
for (const [k, b] of Object.entries(stats)) {
  const avg = b.goals / b.games;
  const hPct = ((b.homeWins / b.games) * 100).toFixed(1);
  const dPct = ((b.draws / b.games) * 100).toFixed(1);
  const aPct = ((b.awayWins / b.games) * 100).toFixed(1);
  const xgh = (b.xgH / b.games).toFixed(2); const xga = (b.xgA / b.games).toFixed(2);
  console.log(`${k.padEnd(8)} | n=${b.games} | ort. gol ${avg.toFixed(2)} | xG ${xgh}–${xga} | ev ${hPct}% ber ${dPct}% dep ${aPct}% | sarı/maç ${(b.cards / b.games).toFixed(2)} kırmızı/maç ${(b.reds / b.games).toFixed(2)}`);
}
console.log('—'.repeat(72));
console.log('Not: hedef davranışlar\n - Güçlü takım uzun vadeli kazanır\n - Ev sahibi ortalama hafif üstün\n - Kupa sürpriz düşük ama sıfır değil\n - Kırmızı kart ~%10–20 maçta');
