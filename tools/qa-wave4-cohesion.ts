// HM26 — Dalga 4 Uyum Motor Etkisi QA: cohesionFactor saf kuralı, teamProfile kanalları,
// simulateMatch duman testi ve AI/eski kayıt nötrlük garantisi.
// Çalıştırma: npm run qa:wave4
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { simulateMatch, aiDefaultTactic } from '../src/engine/engine';
import { autoLineup, teamProfile } from '../src/engine/profiles';
import {
  cohesionFactor, cohesionEffectPct, tacticalFamiliarity,
  COHESION_MIN, COHESION_MAX, COHESION_CHANNELS,
} from '../src/engine/tacticsStudio';
import type { TacticPlan } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const plan = (over: Partial<TacticPlan>): TacticPlan => ({
  id: 't1', name: 'Plan A', formation: '4-3-3', plan: 'dengeli',
  press: 'mid', tempo: 'mid', direction: 'balanced', defLine: 'mid', passRisk: 'balanced',
  width: 50, fbAdvanced: false, midLine: 'mid', strikerSupport: 'mid',
  setPieces: { captain: null, penalty: null, cornerL: null, cornerR: null, fkShort: null, fkLong: null },
  ...over,
});

// ——— cohesionFactor saf kural ———
{
  check('Damgasız plan (eski kayıt/AI/maçsız) nötrdür', cohesionFactor(plan({})) === 1);
  const fresh = plan({ familiarityFormation: '4-3-3', familiarityMatches: 0 });
  check('Yeni damgalı plan %60 → 0.98 çarpan', cohesionFactor(fresh) === 0.98 && tacticalFamiliarity(fresh).percent === 60);
  const seven = plan({ familiarityFormation: '4-3-3', familiarityMatches: 7 });
  check('7 maç sonra uyum %81 → çarpan 1.001', cohesionFactor(seven) === 1.001);
  const capped = plan({ familiarityFormation: '4-3-3', familiarityMatches: 99 });
  check('Tavan uyum %99 → 1.019 çarpan', cohesionFactor(capped) === 1.019 && tacticalFamiliarity(capped).percent === 99);
  const switched = plan({ formation: '3-5-2', familiarityFormation: '4-3-3', familiarityMatches: 13 });
  check('Formasyon değişince çarpan tabana döner (0.98)', cohesionFactor(switched) === 0.98);
  const f = cohesionFactor(plan({ familiarityFormation: '4-3-3', familiarityMatches: 1000 }));
  check('Çarpan her zaman sınırlar içinde', f >= COHESION_MIN && f <= COHESION_MAX, `f=${f}`);
  check('Etki kanalları tam olarak pas/top kontrolü üçlüsü', COHESION_CHANNELS.join(',') === 'buildUp,midfield,transition');
}

// ——— cohesionEffectPct ekran metni ———
{
  check('Nötr planda etiket yok', cohesionEffectPct(plan({})) === null);
  check('Düşük uyum etiketi −2.0', cohesionEffectPct(plan({ familiarityFormation: '4-3-3', familiarityMatches: 0 })) === '−2.0');
  check('Yüksek uyum etiketi +1.9', cohesionEffectPct(plan({ familiarityFormation: '4-3-3', familiarityMatches: 13 })) === '+1.9');
}

// ——— teamProfile entegrasyonu (gerçek kadro) ———
const club = CLUBS.find((c) => c.id === 'denizli_yesilova') ?? CLUBS[0];
const rival = CLUBS.find((c) => c.id !== club.id && c.league === club.league) ?? CLUBS[1];
const squad = genSquad(club, 4242);
const base = aiDefaultTactic(club, rival, rival.strength);
const line = autoLineup(squad, base.formation).slots;
check('AI taktiği uyum damgası taşımaz (denge korunur)', cohesionFactor(base) === 1);

const lowPlan: TacticPlan = { ...base, familiarityFormation: base.formation, familiarityMatches: 0 };
const highPlan: TacticPlan = { ...base, familiarityFormation: base.formation, familiarityMatches: 13 };
const pLegacy = teamProfile(line, base, { home: true, derby: false });
const pLow = teamProfile(line, lowPlan, { home: true, derby: false });
const pHigh = teamProfile(line, highPlan, { home: true, derby: false });

{
  check('Yüksek uyum pas kanallarını düşük uyuma göre güçlendirir (buildUp)', pHigh.buildUp > pLow.buildUp);
  check('Yüksek uyum midfield kanalını güçlendirir', pHigh.midfield > pLow.midfield);
  check('Yüksek uyum transition kanalını güçlendirir', pHigh.transition > pLow.transition);
  const ratio = pHigh.buildUp / pLow.buildUp;
  check('Etki büyüklüğü ince ayar aralığında (~%4 fark)', ratio > 1.03 && ratio < 1.05, `ratio=${ratio.toFixed(4)}`);
  check('Kaleci kanalı dokunulmaz', pHigh.keeper === pLow.keeper);
  check('Duran top kanalları dokunulmaz', pHigh.setAtt === pLow.setAtt && pHigh.setDef === pLow.setDef);
  check('Savunma bloku ve pres dokunulmaz', pHigh.block === pLow.block && pHigh.press === pLow.press);
  check('Nötr çarpan eski profili birebir korur (buildUp)', pLegacy.buildUp === teamProfile(line, { ...base }, { home: true, derby: false }).buildUp);
  check('Ham özet de uyum etkisini yansıtır', pHigh.raw.baseQuality > pLow.raw.baseQuality);
}

// ——— simulateMatch duman + yön eğilimi ———
{
  const awayTac = aiDefaultTactic(rival, club, club.strength);
  let xgLowSum = 0, xgHighSum = 0, valid = true;
  const SEEDS = 40;
  for (let i = 0; i < SEEDS; i++) {
    const seed = 9000 + i * 37;
    const rLow = simulateMatch({ homeClub: club, awayClub: rival, homeSquad: squad, awaySquad: genSquad(rival, 777), homeTactic: lowPlan, awayTactic: awayTac, seed, goalPace: 'dengeli', randomness: 'normal' });
    const rHigh = simulateMatch({ homeClub: club, awayClub: rival, homeSquad: squad, awaySquad: genSquad(rival, 777), homeTactic: highPlan, awayTactic: awayTac, seed, goalPace: 'dengeli', randomness: 'normal' });
    if (![rLow.stats.hg, rLow.stats.ag, rHigh.stats.hg, rHigh.stats.ag].every((n) => Number.isFinite(n) && n >= 0)) valid = false;
    if (!(rLow.stats.xgH >= 0 && rHigh.stats.xgH >= 0)) valid = false;
    xgLowSum += rLow.stats.xgH;
    xgHighSum += rHigh.stats.xgH;
  }
  check('40 tohumda iki senaryo da geçerli maç üretiyor', valid);
  const meanLow = xgLowSum / SEEDS, meanHigh = xgHighSum / SEEDS;
  check('Yüksek uyum ortalama xG’de belirgin gerileme yaratmıyor (yön eğilimi)', meanHigh >= meanLow * 0.95, `low=${meanLow.toFixed(3)} high=${meanHigh.toFixed(3)}`);
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nDALGA4-UYUM-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
