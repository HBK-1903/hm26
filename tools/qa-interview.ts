// HM26 — Maç sonu röportaj QA: içerik bütünlüğü, sonuç bağlamı, kültür etkisi ve
// 0-100 sınırlaması (yeni kalıcı şema alanı eklenmediği için etki yalnızca mevcut alanlarda).
// Çalıştırma: npm run qa:interview
import {
  buildPostMatchInterview,
  applyInterviewEffect,
  outcomeOfResult,
  INTERVIEW_DECLINE_ID,
  INTERVIEW_INBOX_TITLE,
} from '../src/data/interview';
import type { OffPitchCulture } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const culture = (over: Partial<OffPitchCulture>): OffPitchCulture => ({
  fanTrust: 70, communityTrust: 60, discipline: 65, ultrasHeat: 40,
  chairmanName: 'Başkan', chairmanStyle: 'patient', nemesisClubId: null, honors: [], ...over,
});

// ——— İçerik bütünlüğü: üç senaryonun her birinde 3 geçerli seçenek ———
for (const outcome of ['win', 'draw', 'loss'] as const) {
  const iv = buildPostMatchInterview(outcome, 'Rakip SK');
  check(`${outcome}: başlık ve soru dolu`, iv.headline.length > 5 && iv.question.includes('Rakip SK') && iv.options.length === 3);
  const ids = iv.options.map((o) => o.id);
  check(`${outcome}: seçenek id'leri benzersiz`, new Set(ids).size === 3);
  check(`${outcome}: tüm seçeneklerde etiket, detay ve röportaj sözü var`, iv.options.every((o) => o.label.length > 3 && o.detail.length > 8 && o.quote.length > 12));
  check(`${outcome}: tüm etkiler küçük ölçekli (|delta| <= 6)`, iv.options.every((o) =>
    Object.values(o.effect).every((v) => typeof v === 'number' && Math.abs(v) <= 6)));
  check(`${outcome}: her seçenek en az bir kültür alanını etkiliyor`, iv.options.every((o) => Object.keys(o.effect).length >= 1));
}

// Senaryolar arası seçenek id'leri çakışmıyor (hangisi seçildiği ayırt edilebilmeli)
{
  const all = ['win', 'draw', 'loss'].flatMap((o) => buildPostMatchInterview(o, 'R').options.map((x) => x.id));
  check('Dokuz seçeneğin dokuz farklı id’si var', new Set(all).size === 9);
}

// ——— outcomeOfResult: ev/deplasman ve skor kombinasyonları ———
{
  check('Evde galibiyet win', outcomeOfResult('ben', 'ben', 'rakip', 2, 0) === 'win');
  check('Deplasmanda galibiyet win', outcomeOfResult('ben', 'rakip', 'ben', 1, 3) === 'win');
  check('Beraberlik draw (ev)', outcomeOfResult('ben', 'ben', 'rakip', 1, 1) === 'draw');
  check('Beraberlik draw (deplasman)', outcomeOfResult('ben', 'rakip', 'ben', 0, 0) === 'draw');
  check('Evde mağlubiyet loss', outcomeOfResult('ben', 'ben', 'rakip', 0, 2) === 'loss');
  check('Deplasmanda mağlubiyet loss', outcomeOfResult('ben', 'rakip', 'ben', 2, 1) === 'loss');
}

// ——— applyInterviewEffect: clamp ve değişmezler ———
{
  const win = buildPostMatchInterview('win', 'R');
  const praise = win.options[0]; // fanTrust +3, discipline +1
  const applied = applyInterviewEffect(culture({ fanTrust: 99, discipline: 100 }), praise.effect);
  check('Üst sınır 100’e kırpılıyor', applied.fanTrust === 100 && applied.discipline === 100);

  const loss = buildPostMatchInterview('loss', 'R');
  const fury = loss.options[2]; // ultrasHeat +6, discipline -2, fanTrust -2
  const floored = applyInterviewEffect(culture({ fanTrust: 1, discipline: 0, ultrasHeat: 0 }), fury.effect);
  check('Alt sınır 0’a kırpılıyor', floored.fanTrust === 0 && floored.discipline === 0 && floored.ultrasHeat === 6);

  const untouched = applyInterviewEffect(culture({}), {});
  check('Boş etki değerleri değiştirmiyor', untouched.fanTrust === 70 && untouched.discipline === 65 && untouched.ultrasHeat === 40 && untouched.communityTrust === 60);

  const c = culture({});
  const r = applyInterviewEffect(c, fury.effect);
  check('Orijinal kültür nesnesi değişmiyor (immutable)', c.fanTrust === 70 && c.discipline === 65 && c.ultrasHeat === 40);
  check('Topluluk güveni röportajdan etkilenmiyor', r.communityTrust === 60);
  check('Onur listesi ve başkan korunuyor', r.honors.length === 0 && r.chairmanName === 'Başkan');
}

// ——— Sabitler ———
{
  check('Reddetme id sabiti tanımlı', INTERVIEW_DECLINE_ID === 'decline');
  check('Inbox başlık sabiti tanımlı', INTERVIEW_INBOX_TITLE === 'Maç sonu röportajı');
  const winQuotes = buildPostMatchInterview('win', 'R').options.map((o) => o.quote);
  check('Sözler cümle sonu noktasıyla bitiyor', winQuotes.every((q) => q.endsWith('.')));
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nROPORTAJ-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
