// HM26 — UI/UX §5.9 Piyasa (Aşama 2: gerçek dünya kadrolarından piyasa + gelen teklifler + sözleşmeler + transfer geçmişi)
import React, { useMemo, useRef, useState } from 'react';
import { useGame } from '../store/game';
import { Card, Badge, Btn, Sheet, Seg, useToast } from '../components/ui/kit';
import { GameIcon, ICONS } from '../components/icons';
import { PlayerPortrait } from '../components/assets/Portrait';
import { Crest } from '../components/assets/Crest';
import { clubById, clubByIdSafe } from '../data/clubs';
import { genFreeAgent, playerValue } from '../data/gen';
import { resolveMarketShortlist, selectClubOpportunities } from '../data/marketOpportunities';
import { FOREIGN_QUOTA } from '../data/market';
import { inWindow } from '../data/calendar';
import { counterCashAsk, respondToSellerOffer, sellOnCredit, transferLeakRisk, transferOfferLeaks } from '../data/transferNegotiation';
import { Player, Screen } from '../types';

const G_SHORT: Record<string, string> = { GK: 'Kaleci', CB: 'Stoper', FB: 'Bek', WB: 'Kanat Bek', DM: 'D.O.S', CM: 'M.O.S', AM: 'O.O.S', WG: 'Kanat', ST: 'Santrfor' };

export const MarketScreen: React.FC<{ go?: (s: Screen) => void }> = ({ go }) => {
  const g = useGame();
  const [tab, setTab] = useState('firsat');
  const short = g.career.pending.marketShortlist ?? [];
  const [offer, setOffer] = useState<Player | null>(null);
  const [search, setSearch] = useState('');
  const [posF, setPosF] = useState('all');
  const [budgetOnly, setBudgetOnly] = useState(false);
  // v0.9.9: oyuncu arama değer/serbest filtreleri
  const [freeOnly, setFreeOnly] = useState(false);
  const [valF, setValF] = useState('all'); // all | u1 | 1_3 | 3p (₺M)
  const [moreOpen, setMoreOpen] = useState(false);
  const openOffers = g.incomingOffers.filter((o) => o.state === 'open').length;
  const { show, ToastView } = useToast();

  const wageUseB = g.mySquad.reduce((x, p) => x + p.wage, 0); // ₺B/ay
  const wageCapB = Math.round(((g.myClub.wageBudget + (g.budget?.wbExtra ?? 0)) * 1000)); // ₺B/ay tavan
  const wageHeadroomB = wageCapB - wageUseB;
  const inWin = inWindow(g.career.day);
  const cycle = g.career.settings.marketRefresh === 'sakin' ? 30 : g.career.settings.marketRefresh === 'yogun' ? 7 : 14;

  // §11.1: refresh bazında seed'li tarama; kulüp başına en fazla bir hedef ve çevrimler arasında rotasyon.
  const market = useMemo(() => {
    const cycleNo = Math.floor(g.career.day / cycle);
    const pool: { p: Player; reason: string; league: string; rankScore: number }[] = [];
    const reasons = ['Kadro ihtiyacına uygun fırsat', 'Yükselen potansiyel — gelişim odaklı', 'Sözleşme sonu yaklaşıyor, bedel uygun', 'Bölgesel ekiple yakından izleniyor', 'Fiyat/değer oranı güçlü', 'Kulübü dinlemeye açık'];
    const clubPicks = selectClubOpportunities({ seed: g.career.seed, cycleNo, ownClubId: g.career.clubId, squads: g.squads });
    clubPicks.forEach(({ player: p, clubId, rankScore }) => {
      const league = clubByIdSafe(clubId)?.league ?? g.myLeague;
      const value = playerValue(p, league);
      if (value > g.budget.tb * 4.5) return;
      const reason = p.potential - p.ratings.gen >= 6 ? reasons[1] : (p.contractYears ?? 3) <= 1 ? reasons[2] : reasons[(rankScore | 0) % reasons.length];
      pool.push({ p, reason, league, rankScore });
    });
    // Gerçek Bosman oyuncuları korunur, fakat Fırsatlar listesinde tek kaynaktan yığılmayı önlemek için az sayıda gösterilir.
    (g.squads['FA'] ?? []).slice(0, 5).forEach((p, index) => {
      if (pool.some((item) => item.p.id === p.id)) return;
      pool.push({ p, reason: 'Bosman: sözleşmesi bitti — bedelsiz', league: g.myLeague, rankScore: p.ratings.gen * 0.6 + 12 - index });
    });
    // Serbest oyuncu arşivi de genişletildi; her yenilemede oyuncu profilleri değişir, shortlist snapshot'ları etkilenmez.
    for (let i = 0; i < 12; i++) {
      const fa = genFreeAgent(g.career.seed + cycleNo * 977, g.myLeague, i, 'free');
      if (pool.some((item) => item.p.id === fa.id)) continue;
      pool.push({ p: fa, reason: i < 3 ? 'Menajeri agresif satıyor — bedelsiz' : 'Serbest statüden anında katılabilir', league: g.myLeague, rankScore: fa.ratings.gen * 0.6 + (i % 5) * 2 });
    }
    return pool.sort((a, b) => b.rankScore - a.rankScore || a.p.id.localeCompare(b.p.id)).slice(0, 64);
  }, [g.squads, g.career.seed, g.career.day, g.career.clubId, g.budget.tb, g.myLeague, cycle]);

  const priceOf = (p: Player) => (p.id.startsWith('fa_') || p.clubId === 'FA' ? 0 : playerValue(p, clubByIdSafe(p.clubId)?.league ?? g.myLeague));
  const nextRefresh = cycle - (g.career.day % cycle);

  const toggleShort = (player: Player) => {
    const id = player.id;
    const adding = !short.includes(id);
    const nextIds = adding ? [...short, id] : short.filter((candidate) => candidate !== id);
    const snapshots = g.career.pending.marketShortlistPlayers ?? [];
    const nextSnapshots = adding
      ? [...snapshots.filter((candidate) => candidate.id !== id), g.playerOf(id) ?? player]
      : snapshots.filter((candidate) => candidate.id !== id);
    g.updateMarketShortlist(nextIds, nextSnapshots);
  };

  const isFreeP = (p: Player) => p.id.startsWith('fa_') || p.clubId === 'FA';
  const priceOk = (p: Player) => {
    const v = priceOf(p);
    if (freeOnly && !isFreeP(p)) return false;
    if (valF === 'u1' && v > 1) return false;
    if (valF === '1_3' && !(v > 1 && v <= 3)) return false;
    if (valF === '3p' && v <= 3) return false;
    return true;
  };

  const matchSearch = (p: Player) =>
    (posF === 'all' || p.group === posF) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (clubByIdSafe(p.clubId)?.name ?? (isFreeP(p) ? 'serbest bosman' : '')).toLowerCase().includes(search.toLowerCase()));

  const filtered = market.filter((m) => matchSearch(m.p) && priceOk(m.p));
  const savedShortlistPlayers = g.career.pending.marketShortlistPlayers ?? [];
  const shortlistRows = resolveMarketShortlist(short, savedShortlistPlayers, (id) => g.playerOf(id) ?? market.find((item) => item.p.id === id)?.p ?? null)
    .map((player) => ({ p: player, reason: market.find((item) => item.p.id === player.id)?.reason ?? 'Kalıcı kısa liste hedefi' }));

  const Row: React.FC<{ m: { p: Player; reason: string } }> = ({ m }) => {
    const price = priceOf(m.p);
    const isFree = m.p.id.startsWith('fa_') || m.p.clubId === 'FA';
    const seller = isFree ? null : clubByIdSafe(m.p.clubId) ?? null;
    const onLoanNow = g.loans?.some((l) => l.playerId === m.p.id);
    const inShort = short.includes(m.p.id);
    const alreadyOwn = g.mySquad.some((player) => player.id === m.p.id);
    const IStar = inShort ? ICONS.starF : ICONS.star;
    return (
      <article className="bg-surface border border-line rounded-xl p-3">
        <div className="flex items-start gap-2.5">
          <span className="w-[36px] h-[39px] rounded-lg overflow-hidden border border-line/60 bg-elevated shrink-0"><PlayerPortrait player={m.p} size={36} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-primary text-[13px] font-bold truncate flex items-center gap-1">{m.p.name}{m.p.important && <span className="text-amber text-[10px]" title="Önemli oyuncu">★</span>}</div>
            <div className="text-muted text-[9.5px] mt-0.5 truncate flex items-center gap-1">
              {seller && <Crest club={seller} size={11} />}
              <span className="truncate">{m.p.clubId === 'FA' ? '🔓 Bosman' : seller ? seller.name : 'Serbest'} · {G_SHORT[m.p.group] ?? m.p.group} · {m.p.age} yaş</span>
            </div>
            <div className="text-muted text-[9.5px] mt-0.5">{m.p.foreign ? 'Yabancı oyuncu' : 'Yerli oyuncu'}{onLoanNow ? ' · 🔁 kiralık' : ''}</div>
            <div className="text-amber/90 text-[10px] mt-1 leading-snug">⚑ {m.reason}</div>
          </div>
          <div className="shrink-0 flex flex-col items-center">
            <span className="w-[38px] min-h-[38px] rounded-lg bg-amber/10 border border-amber/25 flex flex-col items-center justify-center">
              <span className="num text-[15px] font-extrabold text-amber leading-none">{m.p.ratings.gen}</span>
              <span className="text-[7px] text-muted mt-0.5">GEN</span>
            </span>
            {m.p.potential - m.p.ratings.gen >= 5 && <span className="text-ok text-[8px] mt-1 num">POT {m.p.potential}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-line/60 mt-2.5 pt-2">
          <span className="flex-1 min-w-0">
            <span className="block text-muted text-[8.5px] uppercase">Piyasa değeri</span>
            <span className="num text-primary font-extrabold text-[14px]">{isFree ? 'Bedelsiz' : `₺${price.toFixed(2).replace('.', ',')}M`}</span>
          </span>
          <button onClick={() => toggleShort(m.p)} aria-pressed={inShort} aria-label={inShort ? 'Kısa listeden çıkar' : 'Kısa listeye ekle'}
            className={`min-w-[44px] min-h-[44px] rounded-lg border flex items-center justify-center ${inShort ? 'text-amber bg-amber/10 border-amber/50' : 'text-muted border-line'}`}>
            <span className="w-[18px] h-[18px] inline-block">{IStar ? <IStar /> : null}</span>
          </button>
          <Btn variant="amber" className="!min-h-[44px] !text-[11.5px] !px-3.5" onClick={() => setOffer(m.p)}
            disabled={alreadyOwn || (!!seller && !inWin) || !!onLoanNow}>
            {alreadyOwn ? 'Kadromuzda' : onLoanNow ? 'Kiralıkta' : seller && !inWin ? 'Pencere Kapalı' : 'Teklif'}
          </Btn>
          {seller && !alreadyOwn && !onLoanNow && inWin && (
            <Btn variant="secondary" className="!min-h-[44px] !text-[12px] !px-3"
              onClick={() => { const r = g.loanIn(m.p); show(r.ok ? `🔁 ${m.p.name} sezon sonuna dek kiralandı` : (r.reason ?? 'Kiralanamadı'), r.ok ? 'ok' : 'warn'); }}>
              🔁
            </Btn>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-bold text-[22px] tracking-tight">Piyasa</h1>
          <span className={`text-[10px] font-bold border rounded-md px-2 py-1 ${inWin ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-warn/10 border-warn/40 text-warn'}`}>{inWin ? 'Pencere açık' : 'Pencere kapalı · yalnız serbest'}</span>
        </div>
        <p className="text-muted text-[11px] mt-0.5">Transfer fırsatları · yenilenme: <b className="text-amber num">{nextRefresh}g</b></p>
      </div>

      <div className="mx-4 mb-2.5 flex items-center justify-between bg-surface border border-line rounded-lg px-3 py-2.5">
        <div>
          <div className="text-muted text-[8.5px] uppercase tracking-[0.1em] font-extrabold mb-0.5">Transfer bütçesi</div>
          <div className="num text-primary font-extrabold text-[18px] leading-none">₺{g.budget.tb.toFixed(1)}M</div>
        </div>
        <span className="text-[10px] font-bold border border-line rounded-md px-2 py-1 text-muted" title="TFF 2026-27 kuralı: kadrodaki toplam yabancı sınırı">Yabancı: <b className="text-info num">{g.mySquad.filter((x) => x.foreign).length}/{FOREIGN_QUOTA[g.myLeague] ?? 8}</b></span>
      </div>

      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Piyasa sekmeleri">
        {([['firsat', 'Fırsatlar'], ['ara', 'Oyuncu Ara'], ['kisa', `Kısa Liste${short.length ? ` · ${short.length}` : ''}`]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`shrink-0 min-h-[44px] px-3 rounded-lg text-[11px] font-bold border ${tab === v ? 'text-amber border-amber/60 bg-amber/10' : 'text-muted border-line bg-surface'}`}>{l}</button>
        ))}
        <button onClick={() => setMoreOpen(true)} className={`shrink-0 min-h-[44px] px-3 rounded-lg text-[11px] font-bold border ${['gelen', 'sozlesme', 'gecmis'].includes(tab) ? 'text-amber border-amber/60 bg-amber/10' : 'text-muted border-line bg-surface'}`}>Diğer{openOffers ? ` ●${openOffers}` : ''}</button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 space-y-2.5">
        {['gelen', 'sozlesme', 'gecmis'].includes(tab) && (
          <button onClick={() => setTab('firsat')} className="text-amber text-[11px] font-bold min-h-[36px]">‹ Ana piyasaya dön</button>
        )}
        {(tab === 'firsat' || tab === 'ara') && (
          <div className="flex items-center justify-between">
            <span className="text-muted text-[10.5px]">{(tab === 'firsat' ? market.filter((m) => !budgetOnly || priceOf(m.p) <= g.budget.tb).slice(0, 8) : filtered.filter((m) => !budgetOnly || priceOf(m.p) <= g.budget.tb)).length} oyuncu</span>
            <button onClick={() => setBudgetOnly(!budgetOnly)} aria-pressed={budgetOnly} className={`min-h-[36px] px-2.5 rounded-md border text-[10px] font-bold ${budgetOnly ? 'text-amber border-amber bg-amber/10' : 'text-muted border-line'}`}>Değeri ≤ bütçe {budgetOnly ? '✓' : ''}</button>
          </div>
        )}
        {tab === 'firsat' && (
          <>
            {market.filter((m) => !budgetOnly || priceOf(m.p) <= g.budget.tb).slice(0, 8).length === 0 && (
              <div className="text-muted text-center py-8 border border-dashed border-line rounded-xl text-[12px] leading-relaxed">Bu yenilemede bütçene uygun tarama yok.<br />Filtreleri gevşetmeyi dene.</div>
            )}
            {market.filter((m) => !budgetOnly || priceOf(m.p) <= g.budget.tb).slice(0, 8).map((m) => <Row key={m.p.id} m={m} />)}
          </>
        )}
        {tab === 'ara' && (
          <>
            <div className="space-y-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Oyuncu veya kulüp adı ara…" className="w-full bg-surface border border-line rounded-xl px-4 min-h-touch text-primary text-[14px] focus:outline-none focus:border-amber placeholder:text-muted" />
              <Seg options={[{ v: 'all', label: 'Tümü' }, { v: 'GK', label: 'KL' }, { v: 'CB', label: 'STP' }, { v: 'CM', label: 'MO' }, { v: 'WG', label: 'KNT' }, { v: 'ST', label: 'SN' }]} value={posF} onChange={setPosF} />
              {/* v0.9.9: değer aralığı + serbest filtresi */}
              <Seg options={[{ v: 'all', label: 'Değer: Tümü' }, { v: 'u1', label: '≤₺1M' }, { v: '1_3', label: '₺1–3M' }, { v: '3p', label: '₺3M+' }]} value={valF} onChange={setValF} />
              <div className="flex gap-1.5 flex-wrap">
                <button data-filter="free" onClick={() => setFreeOnly(!freeOnly)} aria-pressed={freeOnly}
                  className={`min-h-[36px] px-2.5 rounded-md border text-[10.5px] font-bold ${freeOnly ? 'text-amber border-amber bg-amber/10' : 'text-muted border-line bg-surface'}`}>
                  🔓 Serbest / Bosman {freeOnly ? '✓' : ''}
                </button>
                <button data-filter="budget" onClick={() => setBudgetOnly(!budgetOnly)} aria-pressed={budgetOnly}
                  className={`min-h-[36px] px-2.5 rounded-md border text-[10.5px] font-bold ${budgetOnly ? 'text-amber border-amber bg-amber/10' : 'text-muted border-line bg-surface'}`}>
                  Değeri ≤ bütçe {budgetOnly ? '✓' : ''}
                </button>
                {(freeOnly || valF !== 'all' || budgetOnly) && (
                  <button onClick={() => { setFreeOnly(false); setValF('all'); setBudgetOnly(false); }}
                    className="min-h-[36px] px-2.5 rounded-md border border-line text-[10.5px] font-bold text-muted">Filtreleri temizle ✕</button>
                )}
              </div>
            </div>
            {filtered.filter((m) => !budgetOnly || priceOf(m.p) <= g.budget.tb).length === 0 && <div className="text-muted text-center py-8 border border-dashed border-line rounded-xl text-[12px] leading-relaxed">Bu kriterde piyasada oyuncu yok.</div>}
            {filtered.filter((m) => !budgetOnly || priceOf(m.p) <= g.budget.tb).map((m) => <Row key={m.p.id} m={m} />)}
          </>
        )}
        {tab === 'kisa' && (shortlistRows.length === 0
          ? <div className="text-muted text-center py-8 border border-dashed border-line rounded-xl text-[12px] leading-relaxed">Bu görünümde oyuncu yok.<br />Bir oyuncuyu ★ ile eklediğinde pazar yenilense ve uygulama yeniden açılsa bile burada kalır.</div>
          : shortlistRows.map((m) => <Row key={m.p.id} m={m} />))}
        {tab === 'gelen' && <IncomingOffers />}
        {tab === 'sozlesme' && <Contracts />}
        {tab === 'gecmis' && <TransferHistory />}
      </div>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Diğer piyasa bölümleri">
        <div className="pb-2">
          {([['gelen', `Gelen Teklifler${openOffers ? ` · ${openOffers}` : ''}`], ['sozlesme', 'Sözleşmeler'], ['gecmis', 'Transfer Geçmişi']] as const).map(([v, l]) => (
            <button key={v} onClick={() => { setTab(v); setMoreOpen(false); }} className="w-full min-h-[48px] flex items-center gap-3 text-left text-[13.5px] text-primary border-b border-line/40 last:border-0">
              <span className="w-5 h-5 inline-block text-secondary">{(() => { const I = ICONS.market; return I ? <I /> : null; })()}</span>
              <span className="flex-1">{l}</span>
              <span className="w-4 h-4 inline-block text-muted">{(() => { const I = ICONS.chevron; return I ? <I /> : null; })()}</span>
            </button>
          ))}
          <p className="text-muted text-[10.5px] leading-snug mt-3">Dar ekranda sekme kalabalığını azaltmak için tek menüde toplanır.</p>
        </div>
      </Sheet>

      <Sheet open={!!offer} onClose={() => setOffer(null)} title="Transfer Görüşmesi">
        {offer && (
          <OfferFlow
            p={offer}
            price={priceOf(offer)}
            tb={g.budget.tb}
            wageHeadroom={wageHeadroomB}
            inWindow={inWin || offer.id.startsWith('fa_') || offer.clubId === 'FA'}
            onDone={(ok, msg) => { show(msg, ok ? 'ok' : 'warn'); if (ok) setOffer(null); }}
            onHome={go ? () => go('hub') : undefined}
            buy={g.buyPlayer}
          />
        )}
      </Sheet>
      {ToastView}
    </div>
  );
};

// ── Gelen Teklifler sekmesi (§11.3): AI kulüpten kendi oyuncuna ──
const IncomingOffers: React.FC = () => {
  const g = useGame();
  const [counter, setCounter] = useState<string | null>(null);
  const [counterFee, setCounterFee] = useState(0);
  const { show, ToastView } = useToast();
  const open = g.incomingOffers.filter((o) => o.state === 'open');
  const closed = g.incomingOffers.filter((o) => o.state !== 'open').slice(0, 10);

  return (
    <div className="space-y-2.5">
      {open.length === 0 && (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">📬</div>
          <div className="text-primary font-bold">Açık teklif yok</div>
          <p className="text-secondary text-[12.5px] mt-1.5 leading-snug">AI kulüpler pencere içinde izledikleri oyunculara teklif gönderir. Satışa koyduğun oyuncular daha hızlı ilgi çeker.</p>
        </div>
      )}
      {open.map((o) => {
        const p = g.playerOf(o.playerId);
        if (!p) return null;
        const buyer = clubById(o.fromClubId);
        const value = playerValue(p, g.myLeague);
        const fair = o.fee >= value * 0.9;
        return (
          <Card key={o.id} accent={fair ? 'var(--c-ok)' : 'var(--c-warn)'}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-elevated border border-line"><PlayerPortrait player={p} size={44} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-primary font-bold text-[14px] truncate">{p.name}</div>
                <div className="text-secondary text-[11.5px] mt-0.5">{G_SHORT[p.group]} · {p.ratings.gen} GEN · değer ₺{value}M</div>
                <div className="flex items-center gap-1.5 mt-1.5 text-[12px]">
                  <Crest club={buyer} size={14} /><span className="text-secondary">{buyer.name}</span>
                  <span className="num text-amber font-bold ml-auto">₺{o.fee.toFixed(1)}M</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-muted">Süre: {o.expiresDay - g.career.day > 0 ? `${o.expiresDay - g.career.day} gün kaldı` : 'bugün son gün'}</span>
              <Badge kind={fair ? 'ok' : 'warn'}>{fair ? '✓ makul teklif' : '⚠ değerinin altında'}</Badge>
            </div>
            {counter === o.id ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex justify-between text-[12.5px] mb-1"><span className="text-primary font-semibold">Karşı teklif bedeli</span><span className="num text-amber font-bold">₺{counterFee.toFixed(1)}M</span></div>
                  <input type="range" min={o.fee} max={Math.max(o.fee * 2, value * 1.8)} step={0.1} value={counterFee} onChange={(e) => setCounterFee(+e.target.value)} className="w-full accent-amber h-6" />
                  <div className="text-muted text-[10.5px]">{counterFee <= o.fee * 1.25 ? 'Neredeyse kesin kabul' : counterFee <= o.fee * 1.6 ? 'Riskli — pazarlık payı yüksek' : 'Muhtemel ret'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Btn variant="secondary" onClick={() => setCounter(null)}>Geri</Btn>
                  <Btn variant="amber" onClick={() => { g.respondOffer(o.id, false, counterFee); setCounter(null); show('Karşı teklif gönderildi — yanıt anında işlendi.', 'ok'); }}>Karşı Teklifi Gönder</Btn>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Btn variant="amber" className="!min-h-[40px] !text-[12px]" onClick={() => { g.respondOffer(o.id, true); show(`${p.name} satıldı → ₺${o.fee.toFixed(1)}M bütçeye eklendi.`, 'ok'); }}>Kabul Et</Btn>
                <Btn variant="secondary" className="!min-h-[40px] !text-[12px]" onClick={() => { setCounter(o.id); setCounterFee(Math.round(o.fee * 1.25 * 10) / 10); }}>Pazarlık</Btn>
                <Btn variant="secondary" className="!min-h-[40px] !text-[12px] text-danger" onClick={() => { g.respondOffer(o.id, false); show('Teklif reddedildi.', 'ok'); }}>Reddet</Btn>
              </div>
            )}
          </Card>
        );
      })}
      {closed.length > 0 && (
        <>
          <div className="text-[11px] text-muted uppercase tracking-wide pt-2">Kapalı teklifler</div>
          {closed.map((o) => {
            const p = g.playerOf(o.playerId);
            return (
              <div key={o.id} className="bg-base/60 border border-line/40 rounded-lg px-3 py-2 flex items-center justify-between text-[12px]">
                <span className="text-secondary">{p?.name ?? 'Oyuncu'} ← {clubById(o.fromClubId).short}</span>
                <Badge kind={o.state === 'accepted' ? 'ok' : 'muted'}>{o.state === 'accepted' ? `Satıldı ₺${o.fee.toFixed(1)}M` : o.state === 'expired' ? 'Süresi doldu' : 'Reddedildi'}</Badge>
              </div>
            );
          })}
        </>
      )}
      {ToastView}
    </div>
  );
};

// ── Sözleşmeler (§11.4 gerçek yenileme) ──
const Contracts: React.FC = () => {
  const g = useGame();
  const { show, ToastView } = useToast();
  const [confirm, setConfirm] = useState<Player | null>(null);
  const squad = [...g.mySquad].sort((a, b) => (a.contractYears ?? 3) - (b.contractYears ?? 3));

  return (
    <div className="space-y-2">
      <p className="text-[11.5px] text-muted leading-snug">Sözleşmesi son 2 yıla giren oyuncular gözden geçirilebilir. Yenileme imza bonusu (≈6 aylık maaş) ve %15 maaş artışı gerektirir; süre en az 3 yıl olur.</p>
      {squad.map((p) => {
        const cy = p.contractYears ?? 3;
        const expiring = cy <= 1;
        return (
          <Card key={p.id} className="!p-3" accent={expiring ? 'var(--c-danger)' : cy <= 2 ? 'var(--c-warn)' : undefined}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-elevated border border-line"><PlayerPortrait player={p} size={40} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-primary text-[13.5px] font-bold truncate">{p.name}</div>
                <div className="text-muted text-[11px] mt-0.5">{G_SHORT[p.group]} · ₺{p.wage}B/ay · {p.age} yaş</div>
              </div>
              <div className="text-right shrink-0">
                <Badge kind={expiring ? 'danger' : cy <= 2 ? 'warn' : 'muted'}>{cy <= 0 ? 'Sözleşme bitti!' : `${cy} yıl`}</Badge>
                {cy <= 2 && (
                  <Btn variant="secondary" className="!min-h-[36px] !px-3 !text-[11.5px] mt-1.5 w-full" onClick={() => setConfirm(p)}>Yenile</Btn>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Sözleşme Yenileme">
        {confirm && (
          <div className="space-y-3">
            <div className="bg-base rounded-xl p-3 flex items-center gap-3">
              <PlayerPortrait player={confirm} size={42} />
              <div>
                <div className="text-primary font-bold">{confirm.name}</div>
                <div className="text-secondary text-[12px]">{G_SHORT[confirm.group]} · {confirm.ratings.gen} GEN</div>
              </div>
            </div>
            {[3, 4, 5].map((y) => {
              const cost = Math.round(confirm.wage * 6) / 1000;
              const afford = g.budget.tb >= cost;
              return (
                <Btn key={y} variant={y === 3 ? 'amber' : 'secondary'} className="w-full justify-between" disabled={!afford}
                  onClick={() => { const r = g.renewContract(confirm.id, y); if (r.ok) { show(`${confirm.name} ile ${y} yıl uzatıldı ✓`, 'ok'); setConfirm(null); } else show(r.reason ?? 'İşlem yapılamadı.', 'warn'); }}>
                  <span>{y} yıllık sözleşme</span><span className="num">₺{cost.toFixed(1)}M bonus</span>
                </Btn>
              );
            })}
            <p className="text-muted text-[11px] leading-snug">Maaş %15 artar. Sözleşmesi bitmiş oyuncu sezon sonunda serbest kalabilir — fırsatları kaçırma.</p>
          </div>
        )}
      </Sheet>
      {ToastView}
    </div>
  );
};

// ── Transfer Geçmişi (§11.5) ──
const TransferHistory: React.FC = () => {
  const g = useGame();
  const log = g.transferLog;
  return (
    <div className="space-y-2">
      {log.length === 0 && <p className="text-center text-secondary text-sm py-8">Bu kariyerde henüz transfer yok — ilk transferin burada arşivlenecek.</p>}
      {log.slice(0, 40).map((t) => (
        <div key={t.id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[12px] ${t.kind === 'in' ? 'border-ok/40 bg-ok/5' : t.kind === 'out' ? 'border-danger/40 bg-danger/5' : 'border-line/40 bg-base'}`}>
          <GameIcon id={t.kind === 'youth' ? 'sprout' : 'market'} className="w-5 h-5 text-secondary" />
          <div className="flex-1 min-w-0">
            <div className="text-primary font-bold truncate">{t.playerName} <span className="text-muted font-normal">· {G_SHORT[t.group]} · {t.age}y</span></div>
            <div className="text-secondary text-[12px] mt-0.5">{t.fromClubId && clubByIdSafe(t.fromClubId) ? clubByIdSafe(t.fromClubId)!.short : 'Serbest'} → {clubByIdSafe(t.toClubId)?.short ?? t.toClubId} · S{t.seasonNo} Gün {t.day}</div>
            {(t.exchangePlayerName || t.sellOnPct || (t.sellOnPaid ?? 0) > 0) && <div className="text-muted text-[11px] mt-0.5">{t.exchangePlayerName ? `Takas: ${t.exchangePlayerName} · ` : ''}{t.sellOnPct ? `gelecek satış %${t.sellOnPct} · ` : ''}{(t.sellOnPaid ?? 0) > 0 ? `önceki kulüplere ₺${t.sellOnPaid!.toFixed(2)}M pay` : ''}</div>}
          </div>
          <span className={`num font-bold ${t.kind === 'out' ? 'text-ok' : 'text-amber'}`}>{t.fee > 0 ? `₺${t.fee.toFixed(1)}M` : '—'}</span>
        </div>
      ))}
    </div>
  );
};

// ── Wave 11: yüz yüze transfer masası, sabır/şart/sızıntı ve kayıtlı imza ──
const OfferFlow: React.FC<{
  p: Player; price: number; tb: number; wageHeadroom: number; inWindow: boolean;
  onDone: (ok: boolean, msg: string) => void;
  buy: (p: Player, fee: number, wage: number, years?: number, status?: 'rotasyon' | 'ilk11' | 'yildiz', swapPlayerId?: string, sellOnPct?: number) => { ok: boolean; reason?: string };
  onHome?: () => void;
}> = ({ p, price, tb, wageHeadroom, inWindow, onDone, buy, onHome }) => {
  const g = useGame();
  const seller = p.id.startsWith('fa_') || p.clubId === 'FA' ? null : clubByIdSafe(p.clubId);
  const [fee, setFee] = useState(Math.round(price * 10) / 10);
  const [swapId, setSwapId] = useState('');
  const swapPlayer = swapId ? g.mySquad.find((x) => x.id === swapId) ?? null : null;
  const swapVal = swapPlayer ? Math.round(playerValue(swapPlayer, g.myLeague) * 0.85 * 10) / 10 : 0;
  const swapOptions = g.mySquad.filter((x) => !x.id.startsWith('fa_') && (x.injuredDays ?? 0) === 0)
    .sort((a, b) => playerValue(b, g.myLeague) - playerValue(a, g.myLeague));
  const [years, setYears] = useState<2 | 3 | 4 | 5>(3);
  const [status, setStatus] = useState<'rotasyon' | 'ilk11' | 'yildiz'>(p.ratings.gen >= 72 ? 'yildiz' : 'ilk11');
  const [wage, setWage] = useState(() => Math.round(p.wage * (p.ratings.gen >= 72 ? 1.22 : 1.08)));
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [sellerAsk, setSellerAsk] = useState(Math.round(price * 1.2 * 100) / 100);
  const [patience, setPatience] = useState(3);
  const [round, setRound] = useState(0);
  const [sellerAgreed, setSellerAgreed] = useState(!seller);
  const [sellerWalked, setSellerWalked] = useState(false);
  const [leaked, setLeaked] = useState(false);
  const [sellOnPct, setSellOnPct] = useState(0);
  const [signedFee, setSignedFee] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const guard = <T extends unknown[]>(fn: (...a: T) => void) => (...a: T) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { fn(...a); } finally { setTimeout(() => { busyRef.current = false; setBusy(false); }, 700); }
  };

  const STATUS_MUL = { rotasyon: 0.95, ilk11: 1.08, yildiz: 1.22 };
  const FEE_F = { rotasyon: 0.88, ilk11: 0.92, yildiz: 0.98 };
  const YEAR_MUL: Record<number, number> = { 2: 1.10, 3: 1.0, 4: 0.97, 5: 0.95 };
  const demandWage = Math.round(p.wage * STATUS_MUL[status] * YEAR_MUL[years] * (leaked ? 1.05 : 1));
  const playerOk = wage >= demandWage;
  const wageBreach = wage > wageHeadroom;
  const sellOnValue = seller ? sellOnCredit(price, sellOnPct) : 0;
  const offerValue = fee + swapVal + sellOnValue;
  const floor = Math.round(price * 0.92 * 100) / 100;
  const fair = seller ? offerValue >= sellerAsk : fee >= price * FEE_F[status];
  const counterFee = counterCashAsk(sellerAsk, swapVal, sellOnValue);
  const leakRisk = transferLeakRisk({ playerGen: p.ratings.gen, price, offerValue, round: round + 1 });

  const sendOffer = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    if (seller) {
      const response = respondToSellerOffer({ price, currentAsk: sellerAsk, floor, patience, offerValue });
      setSellerAsk(response.ask);
      setPatience(response.patience);
      setSellerAgreed(response.outcome === 'accept');
      setSellerWalked(response.outcome === 'walk');
    } else {
      setSellerAgreed(true);
    }
    if (!leaked && transferOfferLeaks({ seed: g.career.seed, day: g.career.day, playerId: p.id, round: nextRound, risk: leakRisk })) {
      setLeaked(true);
      const id = `transfer-leak-${p.id}-${g.career.day}`;
      g.setInbox((messages) => messages.some((item) => item.id === id) ? messages : [{
        id, kind: 'transfer', title: 'Pazarlık basına sızdı',
        body: `Basın, ${seller?.short ?? 'kulüpler'} arasında ${p.name} için görüşme yapıldığını öğrendi. Oyuncunun ücret beklentisi güncellendi; yeni teklifinde %5 daha yüksek maaş talep ediyor.`,
        day: g.career.day, read: false,
      }, ...messages]);
    }
    setStage(1);
  };

  const signDeal = (finalFee: number) => {
    const result = buy(p, finalFee, wage, years, status, swapPlayer?.id, seller ? sellOnPct : 0);
    if (!result.ok) { onDone(false, result.reason ?? 'İmza tamamlanamadı.'); return; }
    setSignedFee(finalFee);
    setStage(2);
  };

  const playerLabel = status === 'yildiz' ? 'Yıldız' : status === 'ilk11' ? 'İlk 11' : 'Rotasyon';
  const sceneHeader = (eyebrow: string, title: string, icon: string) => (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-base p-3">
      <span className="w-9 h-9 rounded-xl bg-amber/10 text-amber flex items-center justify-center"><GameIcon id={icon} className="w-5 h-5" /></span>
      <div><div className="m26-overline">{eyebrow}</div><h3 className="font-display text-primary text-[17px] font-bold">{title}</h3></div>
    </div>
  );

  return (
    <div className="m26-in space-y-4">
      <div className="bg-base rounded-xl p-3 flex items-center gap-3">
        <PlayerPortrait player={p} size={48} />
        <div className="flex-1 min-w-0">
          <div className="text-primary font-bold truncate">{p.name}</div>
          <div className="text-secondary text-[12px] mt-0.5 flex items-center gap-1">
            {seller && <Crest club={seller} size={14} />}{seller?.name ?? 'Serbest oyuncu'} · {p.ratings.gen} GEN · {p.age} yaş
          </div>
        </div>
        <div className="text-right"><div className="m26-overline">Piyasa</div><div className="num text-amber font-bold">₺{price.toFixed(1)}M</div></div>
      </div>
      {!inWindow && <div role="alert" className="bg-danger/10 border border-danger/40 rounded-xl p-3 text-[12.5px] text-danger font-semibold">Pencere kapalı — kulüplü oyuncu alınamaz.</div>}

      {stage === 0 && (
        <div className="space-y-4">
          {sceneHeader('Transfer masası', seller ? `${seller.short} ile şartları belirle` : 'Serbest oyuncu', 'market')}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line bg-surface p-3"><div className="m26-overline">Satıcı beklentisi</div><div className="num text-primary font-bold mt-1">₺{sellerAsk.toFixed(1)}M</div></div>
            <div className="rounded-xl border border-line bg-surface p-3"><div className="m26-overline">Senin toplam teklifin</div><div className="num text-primary font-bold mt-1">₺{offerValue.toFixed(1)}M</div></div>
          </div>
          <div>
            <div className="flex justify-between text-[13px] mb-1.5"><span className="text-primary font-semibold">Nakit bonservis</span><span className={`num font-bold ${fee > tb ? 'text-danger' : 'text-amber'}`}>₺{fee.toFixed(1)}M</span></div>
            <input aria-label="Nakit bonservis teklifi" type="range" min={Math.min(Math.max(0.3, price * 0.65), Math.max(tb, 1))} max={Math.max(Math.min(Math.max(tb, 1), price * 1.6), Math.min(Math.max(0.3, price * 0.65), Math.max(tb, 1)))} step={0.1} value={fee} onChange={(e) => setFee(+e.target.value)} className="w-full accent-amber h-6" />
            <div className="text-secondary text-[12px] leading-relaxed">Değer ₺{price.toFixed(1)}M · {fee > tb ? 'Bütçe aşılıyor' : fair ? 'Teklif masada kabul edilebilir' : 'Satıcıdan karşı teklif gelebilir'} · TB ₺{tb.toFixed(1)}M</div>
            <div className={`text-[12px] mt-1 font-semibold ${tb - fee >= 0 ? 'text-ok' : 'text-danger'}`}>Teklif sonrası bütçe: ₺{(tb - fee).toFixed(1)}M</div>
          </div>

          {!!seller && (
            <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
              <div className="m26-overline">Oyuncu + nakit takası</div>
              <select aria-label="Takas oyuncusu" value={swapId} onChange={(e) => setSwapId(e.target.value)} className="w-full min-h-touch bg-base border border-line rounded-lg px-2.5 text-[12.5px] text-primary">
                <option value="">Oyuncu ekleme — yalnız nakit</option>
                {swapOptions.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.group} · takas değeri ₺{(playerValue(x, g.myLeague) * 0.85).toFixed(1)}M</option>)}
              </select>
              {swapPlayer && <p className="text-secondary text-[12px] leading-relaxed">{swapPlayer.name}, {seller.short} kadrosuna geçer; %85 takas değeri ₺{swapVal.toFixed(1)}M sayılır.</p>}
              <div>
                <div className="m26-overline mb-2">Sonraki satış payı</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {([0, 10, 15, 20, 25] as const).map((pct) => <button type="button" key={pct} aria-pressed={sellOnPct === pct} onClick={() => setSellOnPct(pct)} className={`min-h-touch rounded-lg border text-[12px] font-bold ${sellOnPct === pct ? 'bg-amber text-base border-amber' : 'bg-base text-secondary border-line'}`}>{pct}%</button>)}
                </div>
                <p className="text-secondary text-[12px] mt-1.5 leading-relaxed">{sellOnPct ? `İlerideki satış bedelinin %${sellOnPct}’i satıcı kulübe gider; bu şarta karşılık satıcı bugünkü pazarlıkta yaklaşık ₺${sellOnValue.toFixed(2)}M kredi sayar.` : 'Satış payı yok. Bu madde yalnızca oyunculu kulüp transferinde sunulur.'}</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between text-[13px] mb-1.5"><span className="text-primary font-semibold">Aylık maaş</span><span className="num text-amber font-bold">₺{wage}B</span></div>
            <input aria-label="Aylık maaş teklifi" type="range" min={p.wage} max={p.wage * 2.5} step={1} value={wage} onChange={(e) => setWage(+e.target.value)} className="w-full accent-amber h-6" />
            <div className="text-secondary text-[12px]">Oyuncu taban talebi ₺{p.wage}B/ay · bütçe tavanı ₺{wageHeadroom}B/ay</div>
          </div>

          <div>
            <div className="m26-overline mb-2">Sözleşme süresi</div>
            <div className="grid grid-cols-4 gap-1.5">{([2, 3, 4, 5] as const).map((year) => <button type="button" key={year} aria-pressed={years === year} onClick={() => { setYears(year); setWage(Math.max(p.wage, Math.round(p.wage * STATUS_MUL[status] * YEAR_MUL[year] * (leaked ? 1.05 : 1)))); }} className={`min-h-touch rounded-lg text-[12px] font-bold border ${years === year ? 'bg-amber text-base border-amber' : 'bg-base text-secondary border-line'}`}>{year} yıl</button>)}</div>
          </div>

          <div>
            <div className="m26-overline mb-2">Oyuncu rolü</div>
            <div className="grid grid-cols-3 gap-1.5">{([['rotasyon', 'Rotasyon'], ['ilk11', 'İlk 11'], ['yildiz', 'Yıldız']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setWage(Math.max(p.wage, Math.round(p.wage * STATUS_MUL[value] * YEAR_MUL[years] * (leaked ? 1.05 : 1)))); }} className={`min-h-touch rounded-lg text-[12px] font-bold border ${status === value ? 'bg-amber text-base border-amber' : 'bg-base text-secondary border-line'}`}>{label}</button>)}</div>
            <p className="text-secondary text-[12px] mt-1.5 leading-relaxed">Yıldız rolü ilk 11 süresi sözüyle kaydedilir. Maaş talebi role ve süreye göre değişir.</p>
          </div>

          <div className={`rounded-xl p-3 text-[12.5px] border ${playerOk ? 'bg-ok/10 border-ok/40 text-ok' : 'bg-warn/10 border-warn/40 text-warn'}`}>
            {playerOk ? `Oyuncu tarafı uygun · beklenen en az ₺${demandWage}B/ay` : `Oyuncu en az ₺${demandWage}B/ay bekliyor; şu an ₺${wage}B sunuluyor.`}
          </div>
          {wageBreach && <p role="alert" className="text-danger text-[12px] text-center">Maaş bütçesi aşılıyor — Kulüp → Finans bölümünden tavanı yükselt.</p>}
          <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-[12px] text-secondary"><span>Basına sızma riski</span><b className={leakRisk >= 30 ? 'text-warn' : 'text-ok'}>%{leakRisk}</b></div>
          <Btn variant="amber" className="w-full" disabled={busy || fee > tb || !inWindow || wageBreach} onClick={guard(sendOffer)}>Teklifi Masaya Koy</Btn>
        </div>
      )}

      {stage === 1 && (
        <div className="space-y-4">
          {sceneHeader('Yüz yüze görüşme', sellerWalked ? 'Temsilci masadan kalktı' : sellerAgreed ? 'Kulüpler el sıkıştı' : 'Karşı teklif geldi', sellerWalked ? 'info' : sellerAgreed ? 'check' : 'market')}
          {seller && <div className="flex items-center gap-3 rounded-xl bg-surface p-3"><Crest club={seller} size={36} /><div className="flex-1"><div className="text-primary font-bold">{seller.name} temsilcisi</div><div className="text-secondary text-[12px]">Pazarlık turu {round} · sabır {patience}/3</div></div><div className="flex gap-1" aria-label={`Satıcı sabrı ${patience} / 3`}>{[0, 1, 2].map((index) => <span key={index} className={`w-2.5 h-2.5 rounded-full ${index < patience ? 'bg-ok' : 'bg-line'}`} />)}</div></div>}
          <div className="rounded-xl border border-line bg-base p-3 space-y-2 text-[12.5px]">
            <div className="flex justify-between"><span className="text-secondary">Nakit teklif</span><b className="num text-primary">₺{fee.toFixed(1)}M</b></div>
            {swapPlayer && <div className="flex justify-between"><span className="text-secondary">Oyuncu takası</span><b className="text-primary truncate ml-2">{swapPlayer.name} · ₺{swapVal.toFixed(1)}M</b></div>}
            {sellOnPct > 0 && <div className="flex justify-between"><span className="text-secondary">Gelecek satış payı</span><b className="text-primary">%{sellOnPct}</b></div>}
            <div className="h-px bg-line" />
            <div className="flex justify-between"><span className="text-secondary">Masadaki toplam değer</span><b className="num text-amber">₺{offerValue.toFixed(1)}M</b></div>
          </div>
          {leaked && <div role="status" className="rounded-lg bg-warn/10 border border-warn/40 p-3 text-warn text-[12px]">Görüşme basına sızdı. Oyuncunun maaş talebi %5 yükseldi; haber gelen kutuna düştü.</div>}
          {sellerWalked ? (
            <div className="space-y-3"><p className="text-secondary text-[13px] leading-relaxed">Teklif, kulübün son rezervasyon değerinin altında kaldı. Bu görüşme kapandı; yeni bir deneme için masayı yeniden aç.</p><div className="grid grid-cols-2 gap-2"><Btn variant="secondary" onClick={() => onDone(false, 'Görüşme sonlandırıldı.')}>Vazgeç</Btn><Btn variant="amber" onClick={() => { setRound(0); setPatience(3); setSellerAsk(Math.round(price * 1.2 * 100) / 100); setSellerWalked(false); setSellerAgreed(false); setStage(0); }}>Yeni Görüşme</Btn></div></div>
          ) : sellerAgreed ? (
            <div className="space-y-3"><div className="rounded-lg bg-ok/10 border border-ok/40 p-3 text-ok text-[13px]">Kulüp şartları kabul etti. {playerOk ? 'Oyuncu da maaş ve rolü kabul ediyor.' : `Oyuncu en az ₺${demandWage}B/ay istiyor; sözleşme şartlarını düzenle.`}</div><Btn variant="amber" className="w-full" disabled={busy || !playerOk || wageBreach || fee > tb} onClick={guard(() => signDeal(fee))}>Sözleşmeyi İmzala</Btn><Btn variant="secondary" className="w-full" onClick={() => setStage(0)}>Şartları Gözden Geçir</Btn></div>
          ) : (
            <div className="space-y-3"><div className="rounded-lg bg-warn/10 border border-warn/40 p-3"><div className="text-warn font-bold text-[13px]">Satıcının karşı teklifi: ₺{sellerAsk.toFixed(1)}M toplam değer</div><p className="text-secondary text-[12px] mt-1">Bu tutar takas oyuncusu ve satış payı düşüldükten sonra ₺{counterFee.toFixed(1)}M nakde karşılık gelir. Sabır göstergesi: {patience}/3.</p></div><Btn variant="amber" className="w-full" disabled={busy || counterFee > tb || !playerOk || wageBreach} onClick={guard(() => signDeal(counterFee))}>Karşı Teklifi Kabul Et · Sözleşmeyi İmzala</Btn><Btn variant="secondary" className="w-full" onClick={() => setStage(0)}>Şartları Yeniden Düzenle</Btn></div>
          )}
        </div>
      )}

      {stage === 2 && (
        <div className="space-y-4 text-center">
          {sceneHeader('Transfer tamamlandı', 'İmza atıldı', 'check')}
          <div className="rounded-2xl border border-ok/40 bg-ok/10 p-4">
            <div className="flex items-center justify-center gap-3"><PlayerPortrait player={{ ...p, clubId: g.myClub.id }} size={58} /><div className="text-left"><div className="text-ok font-display text-[18px] font-bold">{p.name}</div><div className="text-secondary text-[12px]">{seller?.name ?? 'Serbest statü'} → {g.myClub.name}</div></div></div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-left">
              <div className="rounded-lg bg-base/70 p-2"><div className="m26-overline">Nakit</div><div className="num text-primary font-bold">₺{signedFee.toFixed(1)}M</div></div>
              <div className="rounded-lg bg-base/70 p-2"><div className="m26-overline">Maaş / süre</div><div className="num text-primary font-bold">₺{wage}B · {years} yıl</div></div>
              <div className="rounded-lg bg-base/70 p-2"><div className="m26-overline">Oyuncu rolü</div><div className="text-primary font-bold">{playerLabel}</div></div>
              <div className="rounded-lg bg-base/70 p-2"><div className="m26-overline">Geri alım</div><div className="text-primary font-bold">Yok</div></div>
            </div>
            {swapPlayer && <p className="text-secondary text-[12px] mt-3">Takas: {swapPlayer.name} → {seller?.short ?? 'satıcı kulüp'}.</p>}
            {sellOnPct > 0 && <p className="text-secondary text-[12px] mt-2">Sonraki satışta % {sellOnPct} pay, {seller?.short ?? 'satıcı kulüp'} lehine kaydedildi.</p>}
            <p className="text-muted text-[11px] mt-2">Şartlar transfer geçmişine işlendi ve kariyer kaydına eklendi.</p>
          </div>
          <Btn variant="amber" className="w-full min-h-touch" onClick={() => { onDone(true, `${p.name} kadroya katıldı.`); onHome?.(); }}>Ana Merkeze Dön</Btn>
          <Btn variant="secondary" className="w-full" onClick={() => onDone(true, `${p.name} kadroya katıldı.`)}>Piyasada Kal</Btn>
        </div>
      )}
    </div>
  );
};
