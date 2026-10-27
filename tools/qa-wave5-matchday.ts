// HM26 — Dalga 5 Maç Günü QA: brifing üretimi (sahte veri yasağı) ve antrenör notu kuralları.
// Çalıştırma: npm run qa:wave5
import { buildMatchBrief, coachNoteAt, nextCoachCheckpoint, type BriefInput } from '../src/engine/matchDay';
import type { MatchArchiveEntry, Player, TacticPlan } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const mkPlayer = (over: Partial<Player>): Player => ({
  id: over.id ?? 'p_x', clubId: 'c', name: over.name ?? 'Ali Test', age: 24, group: 'CM', side: 'ANY',
  secondary: [], ratings: { gen: 70, tek: 70, att: 70, def: 70, fiz: 70, men: 70 },
  form: 60, fitness: 90, sharpness: 70, potential: 75, wage: 100, foreign: false,
  injuredDays: 0, suspendedMatches: 0, ...over,
}) as Player;

const plan = (over: Partial<TacticPlan>): TacticPlan => ({
  id: 't1', name: 'Plan A', formation: '4-3-3', plan: 'dengeli',
  press: 'mid', tempo: 'mid', direction: 'balanced', defLine: 'mid', passRisk: 'balanced',
  width: 50, fbAdvanced: false, midLine: 'mid', strikerSupport: 'mid',
  setPieces: { captain: null, penalty: null, cornerL: null, cornerR: null, fkShort: null, fkLong: null },
  ...over,
});

const club = (short: string, strength: number) => ({ short, strength }) as BriefInput['myClub'];
const report = (id: string, rating: number, day: number): MatchArchiveEntry => ({
  id: `m${day}`, day, seasonNo: 1, comp: 'lig', homeId: 'c', awayId: 'x', hg: 1, ag: 1,
  xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0,
  playerRows: { [id]: { min: 90, g: 0, a: 0, yellow: 0, red: 0, rating, posGroup: 'CM' } }, playerClubIds: {},
});

const baseInput = (over: Partial<BriefInput>): BriefInput => ({
  myClub: club('Yeşilova', 65),
  oppClub: club('Rakip', 66),
  plan: plan({}),
  xi: Array.from({ length: 11 }, (_, i) => mkPlayer({ id: `xi${i}`, fitness: 90 })),
  squad: Array.from({ length: 14 }, (_, i) => mkPlayer({ id: `sq${i}`, fitness: 88 })),
  reports: [],
  isHome: true,
  ...over,
});

// ——— buildMatchBrief ———
{
  const b = buildMatchBrief(baseInput({}));
  check('Başlık rakip ve ev/deplasman bağlamı taşıyor', b.headline.includes('Rakip') && b.headline.includes('Evinde'), b.headline);
  check('Eşleşme notu denk güç metnini veriyor (fark 1)', b.notes.some((n) => n.tag === 'EŞLEŞME' && n.text.includes('Güç farkı yalnızca 1 puan')) && b.headline.includes('denk güçte'));
  check('Damgasız plan uyum notu nötr ve info tonunda', b.notes.some((n) => n.tag === 'UYUM' && n.tone === 'info' && n.text.includes('nötr')));
  check('Tam formda XI → ok tonlu kondisyon notu', b.notes.some((n) => n.tag === 'KONDİSYON' && n.tone === 'ok'));
  check('Arşiv yokken FORMDA/FORMSUZ notu üretilmez (sahte veri yok)', !b.notes.some((n) => n.tag === 'FORMDA' || n.tag === 'FORMSUZ'));
  check('Sakatlık yokken EKSIK notu yok', !b.notes.some((n) => n.tag === 'EKSIK'));
  check('Deterministik: aynı girdi aynı çıktı', JSON.stringify(buildMatchBrief(baseInput({}))) === JSON.stringify(b));
}

{
  const strong = buildMatchBrief(baseInput({ myClub: club('Yeşilova', 78), oppClub: club('Zayıf', 55) }));
  check('Güç farkı lehte olunca favori metni', strong.notes.some((n) => n.tag === 'EŞLEŞME' && n.text.includes('favori')));
  const weak = buildMatchBrief(baseInput({ myClub: club('Yeşilova', 50), oppClub: club('Dev', 72) }));
  const eş = weak.notes.find((n) => n.tag === 'EŞLEŞME');
  check('Güç farkı aleyhte olunca warn tonu ve kontra vurgusu', eş?.tone === 'warn' && eş.text.includes('kontra'));
}

{
  const fresh = buildMatchBrief(baseInput({ plan: plan({ familiarityFormation: '4-3-3', familiarityMatches: 0 }) }));
  const u = fresh.notes.find((n) => n.tag === 'UYUM');
  check('Taze damgalı plan warn ve −2.0 etkisi gösteriyor', u?.tone === 'warn' && u.text.includes('−2.0') && u.text.includes('alışma'), u?.text);
  const seasoned = buildMatchBrief(baseInput({ plan: plan({ familiarityFormation: '4-3-3', familiarityMatches: 13 }) }));
  const u2 = seasoned.notes.find((n) => n.tag === 'UYUM');
  check('13 maçlık plan ok tonu ve +1.9 etkisi', u2?.tone === 'ok' && u2.text.includes('+1.9'), u2?.text);
}

{
  const xi = Array.from({ length: 11 }, (_, i) => mkPlayer({ id: `xi${i}`, fitness: i === 0 ? 55 : i === 1 ? 70 : 90 }));
  const b = buildMatchBrief(baseInput({ xi }));
  const k = b.notes.find((n) => n.tag === 'KONDİSYON');
  check('Kritik kondisyonlu oyuncu danger notu üretir ve isim geçer', k?.tone === 'danger' && k.text.includes(xi[0].name.split(' ').slice(-1)[0]), k?.text);
  const amberOnly = Array.from({ length: 11 }, (_, i) => mkPlayer({ id: `xi${i}`, fitness: i === 0 ? 70 : 90 }));
  const b2 = buildMatchBrief(baseInput({ xi: amberOnly }));
  check('Yalnız amber varken warn tonu', b2.notes.find((n) => n.tag === 'KONDİSYON')?.tone === 'warn');
}

{
  const injured = mkPlayer({ id: 'inj1', name: 'Sakat Yıldız', injuredDays: 4 });
  const suspended = mkPlayer({ id: 'sus1', name: 'Cezalı Bek', suspendedMatches: 1 });
  const b = buildMatchBrief(baseInput({ squad: [...baseInput({}).squad, injured, suspended] }));
  const e = b.notes.find((n) => n.tag === 'EKSIK');
  check('Sakat/cezalılar danger EKSIK notunda toplanır', e?.tone === 'danger' && e.text.includes('2 oyuncu'), e?.text);
}

{
  const hot = mkPlayer({ id: 'xi0', name: 'Formda Kanat' });
  const cold = mkPlayer({ id: 'xi1', name: 'Silik Forvet' });
  const reports = [
    report('xi0', 7.8, 3), report('xi0', 7.6, 2),
    report('xi1', 6.0, 3), report('xi1', 6.2, 2), report('xi1', 6.1, 1),
  ];
  const b = buildMatchBrief(baseInput({ reports, xi: [hot, cold, ...baseInput({}).xi.slice(2)] }));
  check('Gerçek reytingi yüksek oyuncuya FORMDA notu', b.notes.some((n) => n.tag === 'FORMDA' && n.text.includes('Formda Kanat') && n.text.includes('7.7')));
  check('Düşük reytingli oyuncuya FORMSUZ notu', b.notes.some((n) => n.tag === 'FORMSUZ' && n.text.includes('Silik Forvet') && n.text.includes('6.1')));
  const crowded = buildMatchBrief(baseInput({
    xi: [mkPlayer({ id: 'xi0', fitness: 50 }), ...baseInput({}).xi.slice(1)],
    squad: [...baseInput({}).squad, mkPlayer({ id: 'zz', injuredDays: 2 })],
    plan: plan({ familiarityFormation: '4-3-3', familiarityMatches: 0 }),
    reports,
  }));
  check('Not sayısı tavanı 6', crowded.notes.length <= 6, `${crowded.notes.length}`);
}

// ——— nextCoachCheckpoint ———
{
  check('Dakika aralıkları doğru eşlenir',
    nextCoachCheckpoint(44) === null && nextCoachCheckpoint(45) === 45 && nextCoachCheckpoint(74) === 45
    && nextCoachCheckpoint(75) === 75 && nextCoachCheckpoint(89) === 75 && nextCoachCheckpoint(90) === 90 && nextCoachCheckpoint(96) === 90);
}

// ——— coachNoteAt ———
const ctx = (over: Partial<Parameters<typeof coachNoteAt>[0]>): Parameters<typeof coachNoteAt>[0] => ({
  checkpoint: 45, myGoals: 0, oppGoals: 1, familiarityPercent: 60, stamped: true, meanFitness: 80, reds: 0, ...over,
});

{
  const low = coachNoteAt(ctx({}));
  check('Devrede geride + düşük uyum: warn ve kontra cümlesi', low?.tone === 'warn' && low.text.includes('kontra'), low?.text);
  const noStamp = coachNoteAt(ctx({ stamped: false }));
  check('Damgasız planda uyum cümlesi eklenmez', noStamp?.tone === 'warn' && !noStamp.text.includes('kontra'));
  const red = coachNoteAt(ctx({ reds: 1 }));
  check('Kırmızı kart önceliği danger', red?.tone === 'danger' && red.text.includes('disiplin'));
  const aheadFit = coachNoteAt(ctx({ myGoals: 1, oppGoals: 0, familiarityPercent: 90 }));
  check('Önde + formda: ok notu', aheadFit?.tone === 'ok' && aheadFit.text.includes('İyi yarı'));
  const aheadTired = coachNoteAt(ctx({ myGoals: 1, oppGoals: 0, meanFitness: 60 }));
  check('Önde + yorgun: warn ve kondisyon yüzdesi', aheadTired?.tone === 'warn' && aheadTired.text.includes('%60'));
  const levelLow = coachNoteAt(ctx({ myGoals: 1, oppGoals: 1 }));
  check('Beraber + düşük uyum: uyum uyarısı', levelLow?.tone === 'warn' && levelLow.text.includes('%60'));
  const levelNeutral = coachNoteAt(ctx({ myGoals: 1, oppGoals: 1, stamped: false }));
  check('Beraber + nötr: info ve duran top vurgusu', levelNeutral?.tone === 'info' && levelNeutral.text.includes('duran top'));
}

{
  check('75. dakika geride: her zaman warn', coachNoteAt(ctx({ checkpoint: 75 }))?.tone === 'warn');
  check('75. dakika önde + formda: sessiz (null)', coachNoteAt(ctx({ checkpoint: 75, myGoals: 2, oppGoals: 0, meanFitness: 85 })) === null);
  check('75. dakika beraber + formda: sessiz (null)', coachNoteAt(ctx({ checkpoint: 75, myGoals: 1, oppGoals: 1, meanFitness: 85 })) === null);
  const tired = coachNoteAt(ctx({ checkpoint: 75, myGoals: 1, oppGoals: 1, meanFitness: 60 }));
  check('75. dakika beraber + yorgun: yedek uyarısı', tired?.tone === 'warn' && tired.text.includes('yedek'));
  const protect = coachNoteAt(ctx({ checkpoint: 75, myGoals: 1, oppGoals: 0, meanFitness: 55 }));
  check('75. dakika önde + çok yorgun: skoru koru', protect?.tone === 'warn' && protect.text.includes('skoru koru'));
}

{
  const win = coachNoteAt(ctx({ checkpoint: 90, myGoals: 2, oppGoals: 0, familiarityPercent: 90 }));
  check('Maç sonu galibiyet: ok + yüksek uyum kuyruğu', win?.tone === 'ok' && win.text.includes('Galibiyet') && win.text.includes('uyum'));
  const loss = coachNoteAt(ctx({ checkpoint: 90, myGoals: 0, oppGoals: 1, familiarityPercent: 60 }));
  check('Maç sonu mağlubiyet: warn + düşük uyum kuyruğu', loss?.tone === 'warn' && loss.text.includes('Mağlubiyet') && loss.text.includes('uyum'));
  const draw = coachNoteAt(ctx({ checkpoint: 90, myGoals: 1, oppGoals: 1, stamped: false }));
  check('Maç sonu beraberlik: info, uyum kuyruğu yok', draw?.tone === 'info' && draw.text.includes('Beraberlik') && !draw.text.includes('uyum'));
  check('Tüm notlar TD NOTU rozeti taşır', [win, loss, draw].every((n) => n?.tag === 'TD NOTU'));
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nDALGA5-MACGUNU-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
