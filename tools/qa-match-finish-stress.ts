// HM26 — maç bitiş stres testi: çok sayıda oturum gerçek kullanıcı etkileşimleriyle
// (değişiklik, taktik değişimi, kenar komutu, itiraz, devre arası konuşması, sakatlık bekleme)
// sonuna kadar sürülür; hata fırlatan veya sonsuza kalan oturum canlı maçın donmasının
// kök nedenidir. Çalıştırma: npx tsx tools/qa-match-finish-stress.ts
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { projectLiveMatch } from '../src/engine/adapters/liveProjection';

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

type Mode = 'plain' | 'interactive';

function runOne(homeIdx: number, awayIdx: number, seed: number, mode: Mode): { ok: boolean; reason?: string; steps: number } {
  const home = CLUBS[homeIdx];
  const away = CLUBS[awayIdx];
  const input = {
    homeClub: home, awayClub: away,
    homeSquad: genSquad(home, seed + 1), awaySquad: genSquad(away, seed + 2),
    homeTactic: aiDefaultTactic(home, away, away.strength),
    awayTactic: aiDefaultTactic(away, home, home.strength),
    seed, goalPace: 'dengeli' as const, randomness: 'normal' as const, userSide: 'home' as const,
    derby: home.derby === away.id,
    challengeClubId: home.id, challengePoints: 0, riskIds: [],
  };
  const session = new MatchSession(input);
  const MAX_STEPS = 500;
  let steps = 0;
  try {
    while (!session.done && steps < MAX_STEPS) {
      steps++;
      const minute = session.getMinute();
      if (mode === 'interactive') {
        // devre arası penceresinde tek seferlik konuşma
        if (minute >= 45 && minute <= 46) session.applyTeamTalk('home', 'fight');
        // periyodik kenar komutları
        if (steps % 9 === 0) session.useShout('home', 'pump');
        if (steps % 13 === 0) session.useShout('home', 'cool');
        // itiraz penceresi açılırsa değerlendir
        if (session.canProtest('home')) session.protest('home');
        // değişiklik haklarını zorla (3 durak)
        if (steps === 60 || steps === 120 || steps === 200) {
          const slots = session.getSlots('home');
          const bench = session.getBench('home');
          const out = slots.find((s) => s.slotGroup !== 'GK' && !s.sentOff && !s.injured);
          const inP = bench[0];
          if (out && inP) session.queueSub('home', out.player.id, inP.id);
        }
        // sakatlık olaylarında bekle kararı
        const injured = [...session.getSlots('home'), ...session.getSlots('away')].find((s) => s.injured);
        if (injured) session.waitForInjuredPlayer(injured.player.id);
      }
      session.step();
      const proj = projectLiveMatch(session);
      if (proj.status === 'complete' && !session.done) return { ok: false, reason: 'projection complete while session not done', steps };
    }
    if (!session.done) return { ok: false, reason: `step sınırı (${MAX_STEPS}) aşıldı, maç tamamlanmadı`, steps };
    const result = session.toResult();
    if (result.stats.hg < 0 || result.stats.ag < 0) return { ok: false, reason: 'negatif skor', steps };
    return { ok: true, steps };
  } catch (err) {
    return { ok: false, reason: `${(err as Error).name}: ${(err as Error).message}`, steps };
  }
}

// 1) Tüm kulüp çifti örneklemesi: 36 kulüp × rotasyonlu rakip, farklı seed'ler
let failures = 0;
let totalSteps = 0;
const N = 72;
const firstFailures: string[] = [];
for (let i = 0; i < N; i++) {
  const homeIdx = i % CLUBS.length;
  const awayIdx = (i * 7 + 5) % CLUBS.length;
  if (homeIdx === awayIdx) continue;
  const mode: Mode = i % 2 === 0 ? 'interactive' : 'plain';
  const r = runOne(homeIdx, awayIdx, 20260803 + i * 137, mode);
  totalSteps += r.steps;
  if (!r.ok) {
    failures++;
    if (firstFailures.length < 8) firstFailures.push(`${CLUBS[homeIdx].id} vs ${CLUBS[awayIdx].id} [${mode}] adım ${r.steps}: ${r.reason}`);
  }
}
check(`${N} oturum hatasız ve sınırlı adımda tamamlanıyor (etkileşimli + sade)`, failures === 0,
  failures === 0 ? `${N}/${N} tamam · ort. ${Math.round(totalSteps / N)} adım` : `${failures} başarısız → ${firstFailures.join(' | ')}`);

// 2) Aynı çift, yakın seed'ler (kullanıcının aynı maçı tekrar oynaması benzeri)
let seedFail = 0;
const seedErrs: string[] = [];
for (let k = 0; k < 24; k++) {
  const r = runOne(3, 17, 99000 + k * 11, k % 3 === 0 ? 'interactive' : 'plain');
  if (!r.ok) { seedFail++; if (seedErrs.length < 5) seedErrs.push(`seed ${99000 + k * 11}: ${r.reason}`); }
}
check('Yakın seed kuşağı altında maç sonu invariant’ları tutuyor', seedFail === 0,
  seedFail === 0 ? '24/24 tamam' : `${seedFail} başarısız → ${seedErrs.join(' | ')}`);

for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name} | ${r.detail}`);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length} test · ${failed} başarısız`);
process.exit(failed ? 1 : 0);
