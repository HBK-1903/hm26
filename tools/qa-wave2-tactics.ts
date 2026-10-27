// HM26 — Dalga 2 Taktik Stüdyosu QA: saf kurallar (mevki uyumu, kondisyon halkası, taktiksel uyum).
// Çalıştırma: npx tsx tools/qa-wave2-tactics.ts
import {
  canSlotGroup, fitnessRing, tacticalFamiliarity, bumpFamiliarity,
  FAMILIARITY_BASE, FAMILIARITY_CAP, FAMILIARITY_PER_MATCH,
} from '../src/engine/tacticsStudio';
import type { Player, TacticPlan } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const player = (group: Player['group'], secondary: string[] = []): Pick<Player, 'group' | 'secondary'> => ({ group, secondary });

// ——— canSlotGroup ———
{
  check('GK yuvası yalnız kaleci kabul eder', canSlotGroup('GK', player('GK')) && !canSlotGroup('GK', player('CB')));
  check('Kaleci yalnız GK yuvasına girebilir', !canSlotGroup('CB', player('GK')));
  check('Asıl mevki eşleşmesi geçer', canSlotGroup('ST', player('ST')));
  check('Birleşik grup token eşleşmesi geçer (FB/WB)', canSlotGroup('FB/WB', player('WB')));
  check('Yan mevki (secondary) ile eşleşme geçer', canSlotGroup('DM/CM', player('CM', ['DM'])));
  check('Uyumsuz mevki reddedilir', !canSlotGroup('WG', player('CB')));
}

// ——— fitnessRing ———
{
  check('%100 yeşil, titreşim yok', fitnessRing(100).tone === 'green' && !fitnessRing(100).pulse);
  check('Eşik %80 yeşil', fitnessRing(80).tone === 'green');
  check('%79 sarı', fitnessRing(79).tone === 'amber' && !fitnessRing(79).pulse);
  check('Eşik %60 sarı', fitnessRing(60).tone === 'amber');
  check('%59 kırmızı ve titreşimli', fitnessRing(59).tone === 'red' && fitnessRing(59).pulse);
  check('%0 kırmızı', fitnessRing(0).tone === 'red');
}

// ——— tacticalFamiliarity ———
{
  const legacyPlan = { formation: '4-3-3' } as TacticPlan; // eski kayıt: alanlar yok
  const f0 = tacticalFamiliarity(legacyPlan);
  check('Eski kayıt taban uyumla başlar', f0.percent === FAMILIARITY_BASE && f0.matches === 0 && f0.fresh, `${f0.percent}/${f0.matches}`);

  const plan = { ...legacyPlan, familiarityFormation: '4-3-3' as const, familiarityMatches: 4 };
  const f4 = tacticalFamiliarity(plan);
  check('4 maç sonra uyum 60+4×3=72', f4.percent === 72 && f4.matches === 4 && !f4.fresh);

  const changed = { ...plan, formation: '3-5-2' as const }; // sayaç hâlâ 4-3-3'e ait
  const fc = tacticalFamiliarity(changed);
  check('Formasyon değişince uyum tabana döner', fc.percent === FAMILIARITY_BASE && fc.matches === 0 && fc.fresh);

  const many = tacticalFamiliarity({ formation: '4-3-3', familiarityFormation: '4-3-3', familiarityMatches: 40 } as TacticPlan);
  check('Uyum tavanı %99', many.percent === FAMILIARITY_CAP);
  check('Artış kuralı sabitleri tutarlı (3/maç)', FAMILIARITY_PER_MATCH === 3);
}

// ——— bumpFamiliarity ———
{
  const base = { formation: '4-3-3' } as TacticPlan;
  const b1 = bumpFamiliarity(base);
  check('İlk maç sayacı 1’e kurar ve formasyonu damgalar', b1.familiarityMatches === 1 && b1.familiarityFormation === '4-3-3');

  const plan1: TacticPlan = { ...base, ...b1 } as TacticPlan;
  const b2 = bumpFamiliarity(plan1);
  check('Aynı formasyonda sayaç artar', b2.familiarityMatches === 2);

  const switched: TacticPlan = { ...plan1, formation: '5-3-2' } as TacticPlan;
  const b3 = bumpFamiliarity(switched);
  check('Formasyon değişmişse sayaç 1’e döner', b3.familiarityMatches === 1 && b3.familiarityFormation === '5-3-2');

  // uçtan uca: taban → 13 maç → tavan
  let p: TacticPlan = { formation: '4-4-2' } as TacticPlan;
  for (let i = 0; i < 13; i++) p = { ...p, ...bumpFamiliarity(p) } as TacticPlan;
  check('13 maç sonunda tavan uyum', tacticalFamiliarity(p).percent === FAMILIARITY_CAP && tacticalFamiliarity(p).matches === 13);
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nDALGA2-TAKTIK-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
