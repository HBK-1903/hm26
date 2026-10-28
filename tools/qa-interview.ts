// HM26 — Maç sonu röportaj QA: içerik bütünlüğü, sonuç bağlamı, kültür etkisi ve
// 0-100 sınırlaması (yeni kalıcı şema alanı eklenmediği için etki yalnızca mevcut alanlarda).
// Çalıştırma: npm run qa:interview
import {
  buildPostMatchInterview,
  buildPostMatchInterviewWithContext,
  buildThemedInterview,
  applyInterviewEffect,
  outcomeOfResult,
  interviewToneOfQuote,
  INTERVIEW_DECLINE_ID,
  INTERVIEW_INBOX_TITLE,
} from '../src/data/interview';
import { detectInterviewContext } from '../src/engine/interviewContext';
import type { OffPitchCulture } from '../src/types';
import type { InterviewTheme } from '../src/engine/interviewContext';
import type { CompactMatchEvent } from '../src/types';

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

// ——— Temalı kataloglar: 9 temanın tüm uygun kombinasyonları aynı sıkı sözleşmeye uyar ———
const THEMES: Exclude<InterviewTheme, 'classic'>[] = ['comeback', 'collapse', 'derby', 'redcard', 'var', 'xg-over', 'xg-under', 'late', 'streak'];
const themedIds: string[] = [];
const themedQuotes: string[] = [];
for (const theme of THEMES) {
  for (const outcome of ['win', 'draw', 'loss'] as const) {
    const iv = buildThemedInterview(theme, outcome, 'Rakip SK');
    if (!iv) { check(`${theme}/${outcome}: kombinasyon yoksa null (klasiğe düşer)`, true); continue; }
    check(`${theme}/${outcome}: soru rakip kısa adını içerir`, iv.question.includes('Rakip SK'));
    check(`${theme}/${outcome}: 3 seçenek ve benzersiz tema önekli id`, iv.options.length === 3
      && iv.options.every((o) => o.id.startsWith(`${theme}-`)) && new Set(iv.options.map((o) => o.id)).size === 3);
    check(`${theme}/${outcome}: sözler noktayla biter ve etiket/detay dolu`, iv.options.every((o) =>
      o.quote.endsWith('.') && o.label.length > 3 && o.detail.length > 8 && o.quote.length > 12));
    check(`${theme}/${outcome}: etkiler |delta| <= 6 ve en az 1 alan`, iv.options.every((o) =>
      Object.keys(o.effect).length >= 1 && Object.values(o.effect).every((v) => typeof v === 'number' && Math.abs(v) <= 6)));
    themedIds.push(...iv.options.map((o) => o.id));
    themedQuotes.push(...iv.options.map((o) => o.quote));
  }
}
check('Temalı id’ler birbirleriyle ve klasik 9 id ile çakışmaz',
  new Set(themedIds).size === themedIds.length
  && !themedIds.some((id) => ['win-praise', 'win-ambition', 'win-critical', 'draw-calm', 'draw-own', 'draw-angry', 'loss-account', 'loss-loyal', 'loss-fury'].includes(id)));
check('Temalı sözler klasik sözlerle çakışmaz',
  !themedQuotes.some((q) => ['win', 'draw', 'loss'].some((o) => buildPostMatchInterview(o, 'R').options.some((x) => x.quote === q))));

// ——— Söz kaydı: temalı her söz interviewToneOfQuote ile geriye çözülür ———
{
  const resolved = themedQuotes.map((q) => interviewToneOfQuote(q));
  check('Temalı sözlerin tamamı kayıttan geriye çözülür', resolved.every(Boolean));
  check('Klasik sözler hâlâ çözülüyor (geriye uyum)',
    buildPostMatchInterview('win', 'R').options.every((o) => interviewToneOfQuote(o.quote)?.optionId === o.id));
  check('Bilinmeyen söz null döner', interviewToneOfQuote('Bu söz hiçbir katalogda yok.') === null);
}

// ——— Bağlam sezimi: kanıt önceliği ve classic fallback ———
const baseInput = {
  myClubId: 'ben', homeId: 'ben', awayId: 'rakip', hg: 1, ag: 0,
  xgHome: 1.0, xgAway: 0.9, redsHome: 0, redsAway: 0, isDerby: false,
};
const ev = (list: CompactMatchEvent[]): CompactMatchEvent[] => list;
{
  check('Kanıtsız düz galibiyet classic döner', detectInterviewContext({ ...baseInput }).theme === 'classic');
  check('İlk golü yiyip kazanmak comeback', detectInterviewContext({
    ...baseInput, hg: 2, ag: 1, events: ev([[12, 0, 1], [40, 0, 0], [70, 0, 0]]),
  }).theme === 'comeback');
  check('İlk golü atıp berabere kalmak collapse', detectInterviewContext({
    ...baseInput, hg: 1, ag: 1, events: ev([[10, 0, 0], [80, 0, 1]]),
  }).theme === 'collapse');
  check('Comeback derbiden öncelikli', detectInterviewContext({
    ...baseInput, hg: 2, ag: 1, isDerby: true, events: ev([[9, 0, 1], [40, 0, 0], [88, 0, 0]]),
  }).theme === 'comeback');
  check('Derbi kanıtı derby temasını seçer', detectInterviewContext({
    ...baseInput, isDerby: true, events: ev([[55, 0, 0]]),
  }).theme === 'derby');
  check('Kendi kırmızı kartın redcard', detectInterviewContext({
    ...baseInput, redsHome: 1,
  }).theme === 'redcard');
  check('VAR olayı var temasını seçer', detectInterviewContext({
    ...baseInput, events: ev([[40, 5, 2], [60, 0, 0]]),
  }).theme === 'var');
  check('xG +2 fark xg-over', detectInterviewContext({
    ...baseInput, hg: 3, ag: 1, xgHome: 1.0, xgAway: 0.5,
  }).theme === 'xg-over');
  check('xG -2 fark xg-under', detectInterviewContext({
    ...baseInput, hg: 0, ag: 0, xgHome: 2.2, xgAway: 0.4,
  }).theme === 'xg-under');
  check('76+ kendi galibiyet golü late', detectInterviewContext({
    ...baseInput, events: ev([[82, 0, 0]]),
  }).theme === 'late');
  check('Üst üste 3 aynı sonuç streak (düşük öncelikli kanıt yokken)', detectInterviewContext({
    ...baseInput, priorOutcomes: ['win', 'win'],
  }).theme === 'streak');
  check('İki maçlık seri streak tetiklemez', detectInterviewContext({
    ...baseInput, priorOutcomes: ['win'],
  }).theme === 'classic');
  const ctx = detectInterviewContext({ ...baseInput, hg: 2, ag: 1, events: ev([[12, 0, 1], [40, 0, 0], [70, 0, 0]]) });
  check('Bağlam outcome’u skorla tutarlı', ctx.outcome === 'win' && ctx.evidence.firstGoalSide === 'opp');
  check('Deplasman taraf hesabı doğru (ilk gol opp)', detectInterviewContext({
    myClubId: 'ben', homeId: 'rakip', awayId: 'ben', hg: 1, ag: 2,
    xgHome: 1.0, xgAway: 1.2, redsHome: 0, redsAway: 0, isDerby: false,
    events: ev([[15, 0, 0], [45, 0, 1], [75, 0, 1]]),
  }).theme === 'comeback');
}

// ——— Dağıtıcı: classic fallback ve temalı diyalog ———
{
  const classic = buildPostMatchInterviewWithContext(detectInterviewContext({ ...baseInput }), 'Rakip SK');
  check('Classic bağlam klasik diyaloğu açar', classic.options[0].id === 'win-praise');
  const themedCtx = detectInterviewContext({ ...baseInput, events: ev([[82, 0, 0]]) });
  const themedIv = buildPostMatchInterviewWithContext(themedCtx, 'Rakip SK');
  check('Late bağlamı temalı diyaloğu açar', themedIv.options.every((o) => o.id.startsWith('late-')) && themedIv.question.includes('Rakip SK'));
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nROPORTAJ-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
