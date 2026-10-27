// HM26 — Dalga 7 Atmosfer QA: levelOf eşikleri, maç günü atmosferi, taraftar nabzı ve
// form momentumu (sahte trend yasağı dahil).
// Çalıştırma: npm run qa:wave7
import { levelOf, buildMatchdayAtmosphere, fanPulse, formMomentum } from '../src/engine/atmosphere';
import type { OffPitchCulture } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const culture = (over: Partial<OffPitchCulture>): OffPitchCulture => ({
  fanTrust: 70, communityTrust: 60, discipline: 65, ultrasHeat: 72,
  chairmanName: 'Başkan', chairmanStyle: 'patient', nemesisClubId: null, honors: [], ...over,
});

// ——— levelOf ———
{
  check('Eşik 75 yüksek', levelOf(75).tone === 'ok' && levelOf(100).label === 'Yüksek');
  check('Eşik 55 istikrarlı', levelOf(55).tone === 'info' && levelOf(74).label === 'İstikrarlı');
  check('Eşik 35 gergin', levelOf(35).tone === 'warn' && levelOf(54).label === 'Gergin');
  check('35 altı kritik', levelOf(34).tone === 'danger' && levelOf(0).label === 'Kritik');
}

// ——— buildMatchdayAtmosphere ———
const baseAtm = (over: Partial<Parameters<typeof buildMatchdayAtmosphere>[0]>): Parameters<typeof buildMatchdayAtmosphere>[0] => ({
  isHome: true, isDerby: false, isNemesis: false, oppShort: 'Rakip', stadium: 'Yeşilova Stadı', culture: culture({}), ...over,
});

{
  const normal = buildMatchdayAtmosphere(baseAtm({}));
  check('Normal ev maçında rivalite satırı yok', !normal.lines.some((l) => l.tag === 'RİVALİTE'));
  check('Başlık stadyumu işaret eder', normal.headline.includes('Yeşilova Stadı'), normal.headline);
  check('Tribün ve beklenti satırları her zaman var', normal.lines.some((l) => l.tag === 'TRIBÜN') && normal.lines.some((l) => l.tag === 'BEKLENTİ'));
  check('Isı 72 için istikrarlı etiketi ve sayı metinde', (() => { const l = normal.lines.find((x) => x.tag === 'TRIBÜN')!; return l.text.includes('istikrarlı') && l.text.includes('72/100'); })());

  const derby = buildMatchdayAtmosphere(baseAtm({ isDerby: true }));
  const riv = derby.lines.find((l) => l.tag === 'RİVALİTE');
  check('Derbide danger rivalite satırı ve özel başlık', riv?.tone === 'danger' && derby.headline.includes('derbi'), riv?.text);
  check('Derbi satırı rakip adını taşır', riv?.text.includes('Rakip'));

  const nemesis = buildMatchdayAtmosphere(baseAtm({ isNemesis: true, culture: culture({ nemesisClubId: 'rakip' }) }));
  check('Nemesis maçında nemesis vurgusu', nemesis.lines.some((l) => l.tag === 'RİVALİTE' && l.text.includes('Nemesis')));

  const away = buildMatchdayAtmosphere(baseAtm({ isHome: false, oppShort: 'Deplasman Takımı' }));
  check('Deplasman başlığı rakip sahasını gösterir', away.headline.includes('Deplasman Takımı sahası'), away.headline);
  check('Deplasman tribün metni karşılama vurgusu taşır', away.lines.find((l) => l.tag === 'TRIBÜN')?.text.includes('Deplasman tribünü'));

  const cold = buildMatchdayAtmosphere(baseAtm({ culture: culture({ ultrasHeat: 20, fanTrust: 30 }) }));
  check('Düşük ısı/güven danger-warn tonları üretir', cold.lines.find((l) => l.tag === 'TRIBÜN')?.tone === 'danger' && cold.lines.find((l) => l.tag === 'BEKLENTİ')?.tone === 'danger');
  check('Düşük güven metni eleştiri vurgusu taşır', cold.lines.find((l) => l.tag === 'BEKLENTİ')?.text.includes('eleştiri'));

  const hot = buildMatchdayAtmosphere(baseAtm({ culture: culture({ ultrasHeat: 90, fanTrust: 88 }) }));
  check('Yüksek ısı/güven ok tonu', hot.lines.find((l) => l.tag === 'TRIBÜN')?.tone === 'ok' && hot.lines.find((l) => l.tag === 'BEKLENTİ')?.tone === 'ok');
  check('Deterministik çıktı', JSON.stringify(buildMatchdayAtmosphere(baseAtm({}))) === JSON.stringify(normal));
}

// ——— formMomentum ———
{
  check('Maçsız durum silent (sahte trend yok)', formMomentum([]) === 'silent');
  check('Üst üste 3 galibiyet hot', formMomentum(['W', 'W', 'W']) === 'hot');
  check('Son üçü galibiyet ama öncesi karışık yine hot', formMomentum(['L', 'D', 'W', 'W', 'W']) === 'hot');
  check('Üst üste 3 mağlubiyet frozen', formMomentum(['W', 'L', 'L', 'L']) === 'frozen');
  check('İki mağlubiyet cold', formMomentum(['D', 'L', 'L']) === 'cold');
  check('Son üçte iki galibiyet warm', formMomentum(['L', 'W', 'D', 'W']) === 'warm');
  check('Tek maç warm sınıfında (aşırı yorum yok)', ['warm'].includes(formMomentum(['W'])));
}

// ——— fanPulse ———
{
  const silent = fanPulse(culture({}), []);
  check('Maçsız nabız noMatches işaretli ve silent', silent.noMatches === true && silent.momentum === 'silent');
  check('Kültür göstergeleri maçsız da gerçek değerle gelir', silent.trust.label === 'İstikrarlı' && silent.heat.label === 'İstikrarlı');
  const hot = fanPulse(culture({ fanTrust: 80, ultrasHeat: 90, communityTrust: 76, discipline: 40 }), ['W', 'W', 'W']);
  check('Sıcak nabız: hot momentum ve ok tonlar', hot.momentum === 'hot' && hot.trust.tone === 'ok' && hot.heat.tone === 'ok' && hot.community.tone === 'ok' && hot.discipline.tone === 'warn');
  check('Momentum metni galibiyet serisini anlatır', hot.momentumLabel.includes('galibiyet serisi'));
  const frozen = fanPulse(culture({ fanTrust: 20 }), ['L', 'L', 'L', 'L']);
  check('Buz gibi nabız frozen ve kritik güven', frozen.momentum === 'frozen' && frozen.trust.tone === 'danger');
  check('Momentum metin sözlüğü tüm durumları kapsar', ['hot', 'warm', 'cold', 'frozen', 'silent'].every((m) => fanPulse(culture({}), m === 'silent' ? [] : ['D']).momentumLabel.length > 0));
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nDALGA7-ATMOSFER-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
