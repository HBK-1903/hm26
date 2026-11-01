// HM26 — UI/UX §5.9 Piyasa (Aşama 2: gerçek dünya kadrolarından piyasa + gelen teklifler + sözleşmeler + transfer geçmişi)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../store/game';
import { Card, Badge, Btn, Sheet, Seg, useToast } from '../components/ui/kit';
import { ExpandableRecords } from '../components/ui/ExpandableRecords';
import { GameIcon, ICONS } from '../components/icons';
import { PlayerPortrait } from '../components/assets/Portrait';
import { Crest } from '../components/assets/Crest';
import { clubById, clubByIdSafe } from '../data/clubs';
import { playerValue } from '../data/gen';
import { marketSearchPlayers, resolveMarketShortlist, selectClubOpportunities } from '../data/marketOpportunities';
import { currentMarketFreeAgents, marketRefreshDays } from '../data/playerComparison';
import { ComparisonDesk } from '../components/players/ComparisonDesk';
import { FOREIGN_QUOTA } from '../data/market';
import { inWindow } from '../data/calendar';
import { counterCashAsk, sellOnCredit, transferLeakRisk, transferOfferLeaks } from '../data/transferNegotiation';
import { playerToneHints, respondToPlayerWithTone, respondToSellerWithTone, sellerToneHints, transferRevealForGen, type PlayerToneResult, type TransferTone } from '../data/transferPresentation';
import { managerTransferLine, playerTransferLine, sellerTransferLine, signedTransferLine, signingReadyLine, transferAnnouncement, transferLeakLine } from '../data/transferVoices';
import { TransferSubtitle, TransferTheatre } from '../components/transfer/TransferTheatre';
import { CinematicLayout, CinematicOverlay, resetCinematicScroll, type CameraCue } from '../components/cinematic/Cinematic';
import { SaleFlow } from '../components/transfer/SaleFlow';
import { ContractRenewal } from '../components/transfer/ContractRenewal';
import { transferVoiceVolume, useTransferSpeech } from '../components/transfer/useTransferSpeech';
import { audio } from '../audio/engine';
import { type Club, type IncomingOffer, Player, Screen } from '../types';

const G_SHORT: Record<string, string> = { GK: 'Kaleci', CB: 'Stoper', FB: 'Bek', WB: 'Kanat Bek', DM: 'D.O.S', CM: 'M.O.S', AM: 'O.O.S', WG: 'Kanat', ST: 'Santrfor' };

// Stable rows retain keyboard focus when the shortlist changes; memoization also
// avoids repainting dozens of portraits for unrelated filter changes.
const MarketPlayerRow = React.memo(function MarketPlayerRow({ player, reason, price, inShort, alreadyOwn, onLoanNow, inWindow, onShort, onOffer, onLoan, onCompare }: {
  player: Player; reason: string; price: number; inShort: boolean; alreadyOwn: boolean; onLoanNow: boolean; inWindow: boolean;
  onShort: (player: Player) => void; onOffer: (player: Player) => void; onLoan: (player: Player) => void; onCompare: (player: Player) => void;
}) {
  const isFree = player.id.startsWith('fa_') || player.clubId === 'FA';
  const seller = isFree ? null : clubByIdSafe(player.clubId) ?? null;
  const IStar = inShort ? ICONS.starF : ICONS.star;
  return (
    <article className="bg-surface border border-line rounded-xl p-3" data-testid="market-player" data-player-id={player.id} data-position={player.group}>
      <div className="flex items-start gap-2.5">
        <span className="w-[36px] h-[39px] rounded-lg overflow-hidden border border-line/60 bg-elevated shrink-0"><PlayerPortrait player={player} size={36} /></span>
        <div className="flex-1 min-w-0">
          <div className="text-primary text-[13px] font-bold truncate flex items-center gap-1">{player.name}{player.important && <span className="text-amber text-[10px]" title="Önemli oyuncu">★</span>}</div>
          <div className="text-muted text-[9.5px] mt-0.5 truncate flex items-center gap-1">
            {seller && <Crest club={seller} size={11} />}
            <span className="truncate">{player.clubId === 'FA' ? '🔓 Bosman' : seller ? seller.name : 'Serbest'} · {G_SHORT[player.group] ?? player.group} · {player.age} yaş</span>
          </div>
          <div className="text-muted text-[9.5px] mt-0.5">{player.foreign ? 'Yabancı oyuncu' : 'Yerli oyuncu'}{onLoanNow ? ' · 🔁 kiralık' : ''}</div>
          <div className="text-amber/90 text-[10px] mt-1 leading-snug">⚑ {reason}</div>
        </div>
        <div className="shrink-0 flex flex-col items-center">
          <span className="w-[38px] min-h-[38px] rounded-lg bg-amber/10 border border-amber/25 flex flex-col items-center justify-center">
            <span className="num text-[15px] font-extrabold text-amber leading-none">{player.ratings.gen}</span>
            <span className="text-[7px] text-muted mt-0.5">GEN</span>
          </span>
          <span className="text-secondary text-[10px] font-bold mt-1 num" aria-label={`Potansiyel ${Number.isFinite(player.potential) ? player.potential : 'bilinmiyor'}`}>
            POT {Number.isFinite(player.potential) ? player.potential : '—'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-line/60 mt-2.5 pt-2">
        <span className="flex-1 min-w-0">
          <span className="block text-muted text-[8.5px] uppercase">Piyasa değeri</span>
          <span className="num text-primary font-extrabold text-[14px]">{isFree ? 'Bedelsiz' : `₺${price.toFixed(2).replace('.', ',')}M`}</span>
        </span>
        <button onClick={() => onShort(player)} aria-pressed={inShort} aria-label={inShort ? 'Kısa listeden çıkar' : 'Kısa listeye ekle'}
          className={`min-w-[44px] min-h-[44px] rounded-lg border flex items-center justify-center ${inShort ? 'text-amber bg-amber/10 border-amber/50' : 'text-muted border-line'}`}>
          <span className="w-[18px] h-[18px] inline-block">{IStar ? <IStar /> : null}</span>
        </button>
        <Btn variant="amber" className="!min-h-[44px] !text-[11.5px] !px-3.5" onClick={() => onOffer(player)}
          disabled={alreadyOwn || (!!seller && !inWindow) || onLoanNow}>
          {alreadyOwn ? 'Kadromuzda' : onLoanNow ? 'Kiralıkta' : seller && !inWindow ? 'Pencere Kapalı' : 'Teklif'}
        </Btn>
        {seller && !alreadyOwn && !onLoanNow && inWindow && (
          <Btn variant="secondary" className="!min-h-[44px] !text-[12px] !px-3" onClick={() => onLoan(player)}>🔁</Btn>
        )}
      </div>
      <button type="button" onClick={() => onCompare(player)} aria-label={`${player.name} karşılaştır`}
        className="mt-2 w-full min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg border border-line bg-base/60 text-secondary text-[11px] font-bold"><GameIcon id="market" className="w-4 h-4" />Oyuncuyu karşılaştır</button>
    </article>
  );
});

// Turkish and ASCII spellings should find the same name (e.g. Işık / isik).
const searchKey = (value: string) => value.trim().toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');

export const MarketScreen: React.FC<{ go?: (s: Screen) => void }> = ({ go }) => {
  const g = useGame();
  const [tab, setTab] = useState('firsat');
  const short = g.career.pending.marketShortlist ?? [];
  const [offer, setOffer] = useState<Player | null>(null);
  const [search, setSearch] = useState('');
  const [searchLimit, setSearchLimit] = useState(24);
  const [posF, setPosF] = useState('all');
  const [budgetOnly, setBudgetOnly] = useState(false);
  // v0.9.9: oyuncu arama değer/serbest filtreleri
  const [freeOnly, setFreeOnly] = useState(false);
  const [valF, setValF] = useState('all'); // all | u1 | 1_3 | 3p (₺M)
  const [moreOpen, setMoreOpen] = useState(false);
  const [compare, setCompare] = useState<Player | 'empty' | null>(null);
  const openOffers = g.incomingOffers.filter((o) => o.state === 'open').length;
  const { show, ToastView } = useToast();

  const wageUseB = g.mySquad.reduce((x, p) => x + p.wage, 0); // ₺B/ay
  const wageCapB = Math.round(((g.myClub.wageBudget + (g.budget?.wbExtra ?? 0)) * 1000)); // ₺B/ay tavan
  const wageHeadroomB = wageCapB - wageUseB;
  const inWin = inWindow(g.career.day);
  const cycle = marketRefreshDays(g.career.settings.marketRefresh);

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
    currentMarketFreeAgents(g.career.seed, cycleNo, g.myLeague).forEach((fa, i) => {
      if (pool.some((item) => item.p.id === fa.id)) return;
      pool.push({ p: fa, reason: i < 3 ? 'Menajeri agresif satıyor — bedelsiz' : 'Serbest statüden anında katılabilir', league: g.myLeague, rankScore: fa.ratings.gen * 0.6 + (i % 5) * 2 });
    });
    return pool.sort((a, b) => b.rankScore - a.rankScore || a.p.id.localeCompare(b.p.id)).slice(0, 64);
  }, [g.squads, g.career.seed, g.career.day, g.career.clubId, g.budget.tb, g.myLeague, cycle]);

  const priceOf = (p: Player) => (p.id.startsWith('fa_') || p.clubId === 'FA' ? 0 : playerValue(p, clubByIdSafe(p.clubId)?.league ?? g.myLeague));
  const nextRefresh = cycle - (g.career.day % cycle);

  const toggleShort = useCallback((player: Player) => {
    const id = player.id;
    const adding = !short.includes(id);
    const nextIds = adding ? [...short, id] : short.filter((candidate) => candidate !== id);
    const snapshots = g.career.pending.marketShortlistPlayers ?? [];
    const nextSnapshots = adding
      ? [...snapshots.filter((candidate) => candidate.id !== id), g.playerOf(id) ?? player]
      : snapshots.filter((candidate) => candidate.id !== id);
    g.updateMarketShortlist(nextIds, nextSnapshots);
  }, [short, g.career.pending.marketShortlistPlayers, g.playerOf, g.updateMarketShortlist]);

  const isFreeP = (p: Player) => p.id.startsWith('fa_') || p.clubId === 'FA';
  const priceOk = (p: Player) => {
    const v = priceOf(p);
    if (freeOnly && !isFreeP(p)) return false;
    if (valF === 'u1' && v > 1) return false;
    if (valF === '1_3' && !(v > 1 && v <= 3)) return false;
    if (valF === '3p' && v <= 3) return false;
    return true;
  };

  const searchTerm = searchKey(search);
  const matchSearch = (p: Player) =>
    (posF === 'all' || p.group === posF) &&
    (searchKey(p.name).includes(searchTerm) || searchKey(clubByIdSafe(p.clubId)?.name ?? (isFreeP(p) ? 'serbest bosman' : '')).includes(searchTerm));

  // Discovery opportunities remain curated; search covers the entire current
  // world and cycle's free agents, including players outside that small pool.
  const searchPool = useMemo(() => {
    const candidates = marketSearchPlayers(g.squads, g.career.clubId, currentMarketFreeAgents(g.career.seed, Math.floor(g.career.day / cycle), g.myLeague));
    const opportunities = new Map(market.map((item) => [item.p.id, item]));
    return candidates.map((p) => opportunities.get(p.id) ?? { p, reason: isFreeP(p) ? 'Serbest oyuncu' : 'Kulüp kadrosundaki oyuncu' });
  }, [g.squads, g.career.clubId, g.career.seed, g.career.day, g.myLeague, cycle, market]);
  const filtered = searchPool.filter((m) => matchSearch(m.p) && priceOk(m.p));
  const visibleSearch = filtered.filter((m) => !budgetOnly || priceOf(m.p) <= g.budget.tb);
  const visibleOpportunities = market.filter((m) => !budgetOnly || priceOf(m.p) <= g.budget.tb).slice(0, 8);
  const filtersActive = !!searchTerm || posF !== 'all' || valF !== 'all' || freeOnly || budgetOnly;
  useEffect(() => { setSearchLimit(24); }, [search, posF, valF, freeOnly, budgetOnly]);
  const resetFilters = () => { setSearch(''); setPosF('all'); setValF('all'); setFreeOnly(false); setBudgetOnly(false); };
  const savedShortlistPlayers = g.career.pending.marketShortlistPlayers ?? [];
  const shortlistRows = resolveMarketShortlist(short, savedShortlistPlayers, (id) => g.playerOf(id) ?? market.find((item) => item.p.id === id)?.p ?? null)
    .map((player) => ({ p: player, reason: market.find((item) => item.p.id === player.id)?.reason ?? 'Kalıcı kısa liste hedefi' }));

  const loanPlayer = useCallback((player: Player) => {
    const result = g.loanIn(player);
    show(result.ok ? `🔁 ${player.name} sezon sonuna dek kiralandı` : (result.reason ?? 'Kiralanamadı'), result.ok ? 'ok' : 'warn');
  }, [g.loanIn, show]);
  const ownIds = useMemo(() => new Set(g.mySquad.map((player) => player.id)), [g.mySquad]);
  const loanIds = useMemo(() => new Set((g.loans ?? []).map((loan) => loan.playerId)), [g.loans]);
  const renderRow = (m: { p: Player; reason: string }) => <MarketPlayerRow key={m.p.id}
    player={m.p} reason={m.reason} price={priceOf(m.p)} inShort={short.includes(m.p.id)}
    alreadyOwn={ownIds.has(m.p.id)} onLoanNow={loanIds.has(m.p.id)} inWindow={inWin}
    onShort={toggleShort} onOffer={setOffer} onLoan={loanPlayer} onCompare={setCompare} />;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-bold text-[22px] tracking-tight">Piyasa</h1>
          <span className={`text-[10px] font-bold border rounded-md px-2 py-1 ${inWin ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-warn/10 border-warn/40 text-warn'}`}>{inWin ? 'Pencere açık' : 'Pencere kapalı · yalnız serbest'}</span>
        </div>
        <p className="text-muted text-[11px] mt-0.5">Transfer fırsatları · yenilenme: <b className="text-amber num">{nextRefresh}g</b></p>
        <button type="button" onClick={() => setCompare('empty')} className="w-full mt-2 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-amber/35 bg-amber/5 text-amber text-[11.5px] font-bold"><GameIcon id="market" className="w-4 h-4" />Oyuncu Karşılaştırma Masası</button>
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
            {visibleOpportunities.map(renderRow)}
            {visibleOpportunities.length === 0 && <p className="text-secondary text-[12px] text-center py-5">Bu bütçeyle eşleşen fırsat yok. Bütçe filtresini kapatmayı deneyebilirsin.</p>}
          </>
        )}
        {tab === 'ara' && (
          <>
            <div className="space-y-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Oyuncu veya kulüp ara" placeholder="Oyuncu veya kulüp adı ara…" className="w-full bg-surface border border-line rounded-xl px-4 min-h-touch text-primary text-[14px] focus:outline-none focus:border-amber placeholder:text-muted" />
              <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Mevki filtresi">
                {([['all', 'Tümü'], ['GK', 'KL'], ['CB', 'STP'], ['FB', 'BEK'], ['WB', 'KBEK'], ['DM', 'DOS'], ['CM', 'MO'], ['AM', 'OOS'], ['WG', 'KNT'], ['ST', 'SN']] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={posF === value} aria-label={value === 'all' ? 'Tüm mevkiler' : G_SHORT[value]}
                    onClick={() => setPosF(value)} className={`min-h-[36px] rounded-lg border text-[10px] font-bold ${posF === value ? 'bg-amber/15 border-amber/60 text-amber' : 'border-line bg-surface text-secondary'}`}>{label}</button>
                ))}
              </div>
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
                {filtersActive && (
                  <button onClick={resetFilters}
                    className="min-h-[36px] px-2.5 rounded-md border border-line text-[10.5px] font-bold text-muted">Filtreleri temizle ✕</button>
                )}
              </div>
            </div>
            <p className="text-muted text-[10.5px] leading-snug">Arama, diğer kulüplerin tüm güncel kadrolarını ve serbest oyuncuları kapsar.</p>
            {visibleSearch.length === 0 && <div className="text-muted text-center py-8 border border-dashed border-line rounded-xl text-[12px] leading-relaxed">Bu kriterde piyasada oyuncu yok. Aramayı veya filtreleri değiştirmeyi dene.</div>}
            {visibleSearch.slice(0, searchLimit).map(renderRow)}
            {visibleSearch.length > searchLimit && <button type="button" onClick={() => setSearchLimit((limit) => limit + 24)} className="w-full min-h-touch rounded-xl border border-amber/50 bg-amber/10 text-amber text-[12px] font-bold">
              Daha fazla oyuncu göster · {Math.min(searchLimit, visibleSearch.length)}/{visibleSearch.length}
            </button>}
          </>
        )}
        {tab === 'kisa' && (shortlistRows.length === 0
          ? <div className="text-muted text-center py-8 border border-dashed border-line rounded-xl text-[12px] leading-relaxed">Bu görünümde oyuncu yok.<br />Bir oyuncuyu ★ ile eklediğinde pazar yenilense ve uygulama yeniden açılsa bile burada kalır.</div>
          : shortlistRows.map(renderRow))}
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

      <CinematicOverlay open={!!offer} onClose={() => setOffer(null)} title="Transfer Görüşmesi" reducedMotion={g.career.settings.reduceMotion}>
        {offer && (
          <OfferFlow
            p={offer}
            price={priceOf(offer)}
            tb={g.budget.tb}
            wageHeadroom={wageHeadroomB}
            inWindow={inWin || offer.id.startsWith('fa_') || offer.clubId === 'FA'}
            onDone={(ok, msg) => { show(msg, ok ? 'ok' : 'warn'); if (ok) setOffer(null); }}
            onCancel={() => setOffer(null)}
            onHome={go ? () => go('hub') : undefined}
            buy={g.buyPlayer}
          />
        )}
      </CinematicOverlay>
      {compare !== null && <ComparisonDesk initialPlayer={compare === 'empty' ? null : compare} onClose={() => setCompare(null)} />}
      {ToastView}
    </div>
  );
};

// ── Gelen Teklifler sekmesi (§11.3): AI kulüpten kendi oyuncuna ──
const IncomingOffers: React.FC = () => {
  const g = useGame();
  const [activeSale, setActiveSale] = useState<{ offer: IncomingOffer; player: Player; buyer: Club } | null>(null);
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
        const buyer = clubByIdSafe(o.fromClubId);
        if (!buyer) return null;
        const value = playerValue(p, g.myLeague);
        const fair = o.fee >= value * 0.9;
        return (
          <Card key={o.id} accent={fair ? 'var(--c-ok)' : 'var(--c-warn)'}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-elevated border border-line"><PlayerPortrait player={p} size={44} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-primary font-bold text-[14px] truncate">{p.name}</div>
                <div className="text-secondary text-[11.5px] mt-0.5">{G_SHORT[p.group]} · {p.ratings.gen} GEN · POT {Number.isFinite(p.potential) ? p.potential : '—'} · değer ₺{value}M</div>
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
            <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
              <Btn variant="amber" testId={`sale-open-${o.id}`} className="!min-h-[44px] !text-[12px]" onClick={() => setActiveSale({ offer: o, player: p, buyer })}>Görüşmeyi Aç</Btn>
              <Btn variant="secondary" className="!min-h-[44px] !text-[12px] text-danger" onClick={() => {
                const result = g.respondOffer(o.id, false);
                show(result.ok ? 'Teklif reddedildi.' : result.reason ?? 'Teklif işlenemedi.', result.ok ? 'ok' : 'warn');
              }}>Reddet</Btn>
            </div>
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
                <span className="text-secondary">{p?.name ?? 'Oyuncu'} ← {clubByIdSafe(o.fromClubId)?.short ?? 'Kulüp'}</span>
                <Badge kind={o.state === 'accepted' ? 'ok' : 'muted'}>{o.state === 'accepted' ? `Satıldı ₺${o.fee.toFixed(1)}M` : o.state === 'expired' ? 'Geçersiz / süresi doldu' : 'Reddedildi'}</Badge>
              </div>
            );
          })}
        </>
      )}
      <CinematicOverlay open={!!activeSale} onClose={() => setActiveSale(null)} title="Oyuncu Satışı Görüşmesi" reducedMotion={g.career.settings.reduceMotion}>
        {activeSale && <SaleFlow key={activeSale.offer.id} offer={activeSale.offer} player={activeSale.player} buyer={activeSale.buyer} onClose={() => setActiveSale(null)} />}
      </CinematicOverlay>
      {ToastView}
    </div>
  );
};

// ── Sözleşmeler (§11.4 gerçek yenileme) ──
const Contracts: React.FC = () => {
  const g = useGame();
  const [confirm, setConfirm] = useState<Player | null>(null);
  const squad = [...g.mySquad].sort((a, b) => (a.contractYears ?? 3) - (b.contractYears ?? 3));

  return (
    <div className="space-y-2">
      <p className="text-[11.5px] text-muted leading-snug">Son 2 yılına giren kendi oyuncularınla sözleşme görüşmesi yapabilirsin. Başlangıç beklentisi mevcut maaşın %15 üzeridir; imza bonusu mevcut maaşın 6 ayıdır.</p>
      {squad.map((p) => {
        const cy = p.contractYears ?? 3;
        const expiring = cy <= 1;
        const loaned = (g.loans ?? []).some((loan) => loan.playerId === p.id);
        return (
          <Card key={p.id} className="!p-3" accent={expiring ? 'var(--c-danger)' : cy <= 2 ? 'var(--c-warn)' : undefined}>
            <div className="flex items-center gap-3" data-testid="contract-player" data-player-id={p.id}>
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-elevated border border-line"><PlayerPortrait player={p} size={40} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-primary text-[13.5px] font-bold truncate">{p.name}</div>
                <div className="text-muted text-[11px] mt-0.5">{G_SHORT[p.group]} · {p.ratings.gen} GEN · POT {Number.isFinite(p.potential) ? p.potential : '—'} · ₺{p.wage}B/ay · {p.age} yaş</div>
              </div>
              <div className="text-right shrink-0">
                <Badge kind={expiring ? 'danger' : cy <= 2 ? 'warn' : 'muted'}>{cy <= 0 ? 'Sözleşme bitti!' : `${cy} yıl`}</Badge>
                {loaned ? <div className="text-muted text-[10px] mt-1">Kiralık</div> : cy <= 2 && (
                  <Btn variant="secondary" className="!min-h-[36px] !px-3 !text-[11.5px] mt-1.5 w-full" onClick={() => setConfirm(p)}>Yenile</Btn>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      <CinematicOverlay open={!!confirm} onClose={() => setConfirm(null)} title="Sözleşme Yenileme" reducedMotion={g.career.settings.reduceMotion}>
        {confirm && <ContractRenewal key={confirm.id} player={confirm} onClose={() => setConfirm(null)} />}
      </CinematicOverlay>
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
      <ExpandableRecords items={log} preview={40} label="Transfer geçmişi" testId="transfer-history-list" className="space-y-2" rowKey={(t) => t.id} render={(t) => (
        <div data-testid="transfer-history-row" className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[12px] ${t.kind === 'in' ? 'border-ok/40 bg-ok/5' : t.kind === 'out' ? 'border-danger/40 bg-danger/5' : 'border-line/40 bg-base'}`}>
          <GameIcon id={t.kind === 'youth' ? 'sprout' : 'market'} className="w-5 h-5 text-secondary" />
          <div className="flex-1 min-w-0">
            <div className="text-primary font-bold truncate">{t.playerName} <span className="text-muted font-normal">· {G_SHORT[t.group]} · {t.age}y</span></div>
            <div className="text-secondary text-[12px] mt-0.5">{t.fromClubId && clubByIdSafe(t.fromClubId) ? clubByIdSafe(t.fromClubId)!.short : 'Serbest'} → {clubByIdSafe(t.toClubId)?.short ?? t.toClubId} · S{t.seasonNo} Gün {t.day}</div>
            {(t.exchangePlayerName || t.sellOnPct || (t.sellOnPaid ?? 0) > 0) && <div className="text-muted text-[11px] mt-0.5">{t.exchangePlayerName ? `Takas: ${t.exchangePlayerName} · ` : ''}{t.sellOnPct ? `gelecek satış %${t.sellOnPct} · ` : ''}{(t.sellOnPaid ?? 0) > 0 ? `önceki kulüplere ₺${t.sellOnPaid!.toFixed(2)}M pay` : ''}</div>}
          </div>
          <span className={`num font-bold ${t.kind === 'out' ? 'text-ok' : 'text-amber'}`}>{t.fee > 0 ? `₺${t.fee.toFixed(1)}M` : '—'}</span>
        </div>
      )} />
    </div>
  );
};

// Hareketli transfer masası: sahne durumları yalnız bu açık görüşmenin belleğinde tutulur.
type OfferStage = 'offer' | 'seller' | 'player' | 'review' | 'signed';
type PlayerStatus = 'rotasyon' | 'ilk11' | 'yildiz';
const TONES: { value: TransferTone; label: string }[] = [
  { value: 'calm', label: 'Sakin' }, { value: 'witty', label: 'Esprili' }, { value: 'firm', label: 'Sert' },
];
const STATUS_MUL: Record<PlayerStatus, number> = { rotasyon: 0.95, ilk11: 1.08, yildiz: 1.22 };
const YEAR_MUL: Record<number, number> = { 2: 1.10, 3: 1.0, 4: 0.97, 5: 0.95 };

export const OfferFlow: React.FC<{
  p: Player; price: number; tb: number; wageHeadroom: number; inWindow: boolean;
  onDone: (ok: boolean, msg: string) => void;
  onCancel: () => void;
  buy: (p: Player, fee: number, wage: number, years?: number, status?: PlayerStatus, swapPlayerId?: string, sellOnPct?: number) => { ok: boolean; reason?: string };
  onHome?: () => void;
}> = ({ p, price, tb, wageHeadroom, inWindow, onDone, onCancel, buy, onHome }) => {
  const g = useGame();
  const seller = p.id.startsWith('fa_') || p.clubId === 'FA' ? null : clubByIdSafe(p.clubId) ?? null;
  const voice = useTransferSpeech();
  const [stage, setStage] = useState<OfferStage>('offer');
  const [fee, setFee] = useState(Math.round(price * 10) / 10);
  const [swapId, setSwapId] = useState('');
  const [sellOnPct, setSellOnPct] = useState(0);
  const [years, setYears] = useState<2 | 3 | 4 | 5>(3);
  const [status, setStatus] = useState<PlayerStatus>(p.ratings.gen >= 72 ? 'yildiz' : 'ilk11');
  const [wage, setWage] = useState(() => Math.round(p.wage * (p.ratings.gen >= 72 ? 1.22 : 1.08)));
  const [sellerAsk, setSellerAsk] = useState(Math.round(price * 1.2 * 100) / 100);
  const [patience, setPatience] = useState(3);
  const [round, setRound] = useState(0);
  const [sellerAgreed, setSellerAgreed] = useState(false);
  const [sellerWalked, setSellerWalked] = useState(false);
  const [sellerDiscount, setSellerDiscount] = useState(0);
  const [sellerExtraPatience, setSellerExtraPatience] = useState(false);
  const [sellerTone, setSellerTone] = useState<TransferTone | null>(null);
  const [playerTone, setPlayerTone] = useState<TransferTone | null>(null);
  const [triedPlayerTones, setTriedPlayerTones] = useState<TransferTone[]>([]);
  const [playerDiscount, setPlayerDiscount] = useState(0);
  const [playerRound, setPlayerRound] = useState(0);
  const [playerResponse, setPlayerResponse] = useState<PlayerToneResult | null>(null);
  const [agreedFee, setAgreedFee] = useState<number | null>(null);
  const [leaked, setLeaked] = useState(false);
  const [signedFee, setSignedFee] = useState(0);
  const [signedSwap, setSignedSwap] = useState<Player | null>(null);
  const [signedBudget, setSignedBudget] = useState(0);
  const [signedWageRoom, setSignedWageRoom] = useState(0);
  const [showReveal, setShowReveal] = useState(false);
  const sellerSubmitted = useRef(false);
  const playerSubmitted = useRef(false);
  const signedOnce = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const crowdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalSquad = useRef(g.mySquad);
  useEffect(() => { resetCinematicScroll(stageRef.current); }, [stage, showReveal]);
  useEffect(() => () => { if (crowdTimer.current) clearTimeout(crowdTimer.current); audio.stopCrowd(); }, []);

  const swapPlayer = swapId ? g.mySquad.find((x) => x.id === swapId) ?? null : null;
  const swapVal = swapPlayer ? Math.round(playerValue(swapPlayer, g.myLeague) * 0.85 * 10) / 10 : 0;
  const swapOptions = g.mySquad.filter((x) => !x.id.startsWith('fa_') && (x.injuredDays ?? 0) === 0 && !g.loans?.some((loan) => loan.playerId === x.id))
    .sort((a, b) => playerValue(b, g.myLeague) - playerValue(a, g.myLeague));
  const sellOnValue = seller ? sellOnCredit(price, sellOnPct) : 0;
  const offerValue = fee + swapVal + sellOnValue;
  const floor = Math.round(price * 0.92 * 100) / 100;
  const counterFee = counterCashAsk(sellerAsk, swapVal, sellOnValue);
  const leakRisk = transferLeakRisk({ playerGen: p.ratings.gen, price, offerValue, round: round + 1 });
  const demandBase = Math.round(p.wage * STATUS_MUL[status] * YEAR_MUL[years] * (leaked ? 1.05 : 1));
  const cappedPlayerDiscount = Math.min(playerDiscount, Math.floor(demandBase * 0.03));
  const demandWage = demandBase - cappedPlayerDiscount;
  const wageBreach = wage > wageHeadroom;
  const quotaTeam = swapPlayer ? g.mySquad.filter((x) => x.id !== swapPlayer.id) : g.mySquad;
  const foreignCount = quotaTeam.filter((x) => x.foreign).length;
  const quota = FOREIGN_QUOTA[g.myLeague] ?? 8;
  const quotaBreach = !!p.foreign && foreignCount >= quota;
  const squadFull = g.mySquad.length >= 30 && !swapPlayer;
  const playerLabel = status === 'yildiz' ? 'Yıldız' : status === 'ilk11' ? 'İlk 11' : 'Rotasyon';
  const reveal = transferRevealForGen(p.ratings.gen);
  const voiceKey = `${g.career.seed}|${g.career.day}|${p.id}`;
  const sellerInput = { price, currentAsk: sellerAsk, floor, patience, offerValue, usedDiscount: sellerDiscount,
    usedExtraPatience: sellerExtraPatience, seed: g.career.seed, day: g.career.day, playerId: p.id, round: round + 1 };
  const subtitle = <TransferSubtitle line={voice.lastLine} muted={voice.muted} systemMuted={transferVoiceVolume() <= 0}
    onReplay={() => { if (voice.lastLine) voice.play(voice.lastLine); }} onSkip={voice.stop}
    onToggle={() => { if (!voice.muted) { if (crowdTimer.current) clearTimeout(crowdTimer.current); audio.stopCrowd(); } voice.toggle(); }} />;
  const theatreMode = stage === 'signed' && showReveal ? 'reveal' : stage === 'seller' || (stage === 'offer' && !!seller) ? 'seller' : 'player';
  const significantResponse = voice.lastLine && ((stage === 'seller' && voice.lastLine.speaker === 'representative')
    || (stage === 'player' && !!playerResponse && voice.lastLine.speaker === 'player')
    || (stage === 'review' && voice.lastLine.speaker === 'player'));
  const firmReply = voice.lastLine?.speaker === 'manager' && ((stage === 'offer' && sellerTone === 'firm') || (stage === 'player' && playerTone === 'firm'));
  const cameraCue: CameraCue = significantResponse || firmReply
    ? { key: `${stage}:${voice.lastLine!.id}:${round}:${playerRound}`, target: firmReply ? 'manager' : 'opponent' } : null;
  const theatre = <TransferTheatre mode={theatreMode} player={p} club={g.myClub} seller={seller} manager={g.career.manager}
    speaking={voice.speaking} cinematic cameraCue={cameraCue} beat={stage} />;
  const clearPlayerResponse = () => { setPlayerResponse(null); setPlayerTone(null); playerSubmitted.current = false; voice.clear(); };
  const goOffer = () => { sellerSubmitted.current = false; setSellerTone(null); setAgreedFee(null); voice.clear(); setStage('offer'); };
  const goPlayer = (finalFee: number) => { setAgreedFee(finalFee); clearPlayerResponse(); setStage('player'); };

  const sendOffer = () => {
    if (sellerSubmitted.current || !inWindow || fee > tb || (seller && !sellerTone)) return;
    sellerSubmitted.current = true;
    const nextRound = round + 1;
    setRound(nextRound);
    if (seller && sellerTone) {
      const response = respondToSellerWithTone({ ...sellerInput, tone: sellerTone });
      setSellerAsk(response.ask);
      setPatience(response.patience);
      setSellerAgreed(response.outcome === 'accept');
      setSellerWalked(response.outcome === 'walk');
      setSellerDiscount(response.usedDiscount);
      setSellerExtraPatience(response.usedExtraPatience);
      voice.play(sellerTransferLine(response.outcome, `${voiceKey}|seller|${nextRound}`));
      setStage('seller');
    } else {
      setAgreedFee(0);
      voice.clear();
      setStage('player');
    }
    if (!leaked && transferOfferLeaks({ seed: g.career.seed, day: g.career.day, playerId: p.id, round: nextRound, risk: leakRisk })) {
      setLeaked(true);
      const id = `transfer-leak-${p.id}-${g.career.day}`;
      g.setInbox((messages) => messages.some((item) => item.id === id) ? messages : [{
        id, kind: 'transfer', title: 'Pazarlık basına sızdı',
        body: seller
          ? `Basın, ${seller.short} ile ${p.name} için görüşme yapıldığını öğrendi. Oyuncunun ücret beklentisi güncellendi; yeni teklifinde %5 daha yüksek maaş talep ediyor.`
          : `Basın, serbest oyuncu ${p.name} ile görüşme yapıldığını öğrendi. Oyuncunun ücret beklentisi güncellendi; yeni teklifinde %5 daha yüksek maaş talep ediyor.`,
        day: g.career.day, read: false,
      }, ...messages]);
    }
  };
  const sendPlayerOffer = () => {
    if (playerSubmitted.current || !playerTone || wageBreach || agreedFee === null) return;
    playerSubmitted.current = true;
    const response = respondToPlayerWithTone({ baseDemand: demandBase, offeredWage: wage, usedDiscount: playerDiscount,
      tone: playerTone, alreadyTried: triedPlayerTones.includes(playerTone), seed: g.career.seed, day: g.career.day, playerId: p.id });
    setTriedPlayerTones((prior) => prior.includes(playerTone) ? prior : [...prior, playerTone]);
    setPlayerDiscount(response.usedDiscount);
    setPlayerRound((prior) => prior + 1);
    setPlayerResponse(response);
    setPlayerTone(null);
    voice.play(playerTransferLine(response.accepted, `${voiceKey}|player|${playerRound + 1}`));
  };
  const signDeal = () => {
    if (signedOnce.current || agreedFee === null || !playerResponse?.accepted || wageBreach || quotaBreach || squadFull || !inWindow || agreedFee > tb) return;
    signedOnce.current = true;
    const result = buy(p, agreedFee, wage, years, status, swapPlayer?.id, seller ? sellOnPct : 0);
    if (!result.ok) { signedOnce.current = false; onDone(false, result.reason ?? 'İmza tamamlanamadı.'); return; }
    setSignedFee(agreedFee);
    setSignedSwap(swapPlayer);
    setSignedBudget(Math.round((tb - agreedFee) * 10) / 10);
    setSignedWageRoom(wageHeadroom - wage + (swapPlayer?.wage ?? 0));
    setShowReveal(false);
    setStage('signed');
    voice.play(signedTransferLine(voiceKey));
    if (!voice.muted) { audio.unlock(); audio.play('click'); }
  };
  const openReveal = () => {
    if (showReveal) return;
    voice.stop();
    setShowReveal(true);
    if (!voice.muted) {
      audio.unlock(); audio.play('celebrate');
      if (reveal !== 'press') { audio.startCrowd(); crowdTimer.current = setTimeout(() => audio.stopCrowd(), 6000); }
    }
  };
  const newMeeting = () => {
    setRound(0); setPatience(3); setSellerAsk(Math.round(price * 1.2 * 100) / 100);
    setSellerWalked(false); setSellerAgreed(false); setSellerDiscount(0); setSellerExtraPatience(false);
    goOffer();
  };
  const samePosition = originalSquad.current.filter((candidate) => candidate.group === p.group);
  const bestPositionGen = samePosition.length ? Math.max(...samePosition.map((candidate) => candidate.ratings.gen)) : null;
  const leakNotice = leaked && <div role="status" className="rounded-lg bg-warn/10 border border-warn/40 p-3 text-warn text-[12px]">Görüşme basına sızdı; oyuncunun temel maaş beklentisi %5 arttı. <button type="button" className="font-bold underline" onClick={() => voice.play(transferLeakLine)}>Sızıntı haberini dinle</button></div>;
  const replyChoices = (phase: 'seller' | 'player') => {
    const selected = phase === 'seller' ? sellerTone : playerTone;
    return <div className="transfer-replies" role="group" aria-label={phase === 'seller' ? 'Kulüp görüşmesi cevapları' : 'Oyuncu görüşmesi cevapları'}>
      {TONES.map(({ value, label }) => {
        const line = managerTransferLine(value, phase, `${voiceKey}|${phase}|${phase === 'seller' ? round + 1 : playerRound + 1}`);
        const hints = phase === 'seller' ? sellerToneHints(sellerInput, value) : playerToneHints(demandBase, cappedPlayerDiscount, value, triedPlayerTones.includes(value));
        return <button type="button" key={value} className="transfer-reply" aria-pressed={selected === value} data-testid={`transfer-reply-${phase}-${value}`} onClick={() => {
          if (phase === 'seller') setSellerTone(value);
          else { setPlayerTone(value); playerSubmitted.current = false; }
          voice.play(line);
        }}><span className="transfer-reply__tone block">{label}</span><span className="transfer-reply__label">“{line.text}”</span><span className="transfer-reply__hint">{hints.join(' · ')}</span></button>;
      })}
    </div>;
  };
  const termsFacts = (finalFee: number) => <div className="transfer-facts">
    <div><span>Nakit bonservis</span><strong>{!seller ? 'Bedelsiz · ₺0M' : `₺${finalFee.toFixed(2)}M`}</strong></div>
    <div><span>Aylık maaş</span><strong>₺{wage}B / ay</strong></div>
    <div><span>Süre / rol</span><strong>{years} yıl · {playerLabel}</strong></div>
    <div><span>Sabit maaş toplamı</span><strong>₺{(wage * 12 * years / 1000).toFixed(2)}M</strong></div>
  </div>;

  return <CinematicLayout ref={stageRef} testId="transfer-flow" stage={stage} scene={theatre} subtitle={subtitle}>
    <div className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-secondary" aria-label="Görüşme adımları">
      <span className={stage === 'offer' || stage === 'seller' ? 'text-amber' : ''}>01 {seller ? 'KULÜP' : 'SERBEST'}</span><span>—</span>
      <span className={stage === 'player' ? 'text-amber' : ''}>02 OYUNCU</span><span>—</span>
      <span className={stage === 'review' || stage === 'signed' ? 'text-amber' : ''}>03 İMZA</span>
    </div>
    {!inWindow && <div role="alert" className="bg-danger/10 border border-danger/40 rounded-xl p-3 text-[12.5px] text-danger font-semibold">Pencere kapalı — kulüplü oyuncu alınamaz.</div>}

    {stage === 'offer' && <div className="space-y-4">
      <div className="bg-base rounded-xl p-3 flex items-center gap-3">
        <PlayerPortrait player={p} size={44} /><div className="flex-1 min-w-0"><div className="text-primary font-bold truncate">{p.name}</div><div className="text-secondary text-[12px]">{seller?.name ?? 'Serbest oyuncu'} · {p.ratings.gen} GEN · {p.age} yaş</div></div>
        <div className="text-right"><div className="m26-overline">Piyasa</div><div className="num text-amber font-bold">₺{price.toFixed(1)}M</div></div>
      </div>
      {seller ? <>
        <div className="transfer-facts"><div><span>Satıcı beklentisi</span><strong>₺{sellerAsk.toFixed(2)}M</strong></div><div><span>Toplam teklif değeri</span><strong>₺{offerValue.toFixed(2)}M</strong></div></div>
        <div>
          <div className="flex justify-between text-[13px] mb-1.5"><span className="text-primary font-semibold">Nakit bonservis</span><span className={`num font-bold ${fee > tb ? 'text-danger' : 'text-amber'}`}>₺{fee.toFixed(2)}M</span></div>
          <input aria-label="Nakit bonservis teklifi" type="range" min={0} max={Math.max(1, price * 1.6, tb)} step={0.1} value={fee} onChange={(e) => { setFee(+e.target.value); setSellerTone(null); voice.clear(); }} className="w-full accent-amber h-6" />
          <div className="text-secondary text-[12px] leading-relaxed">{fee > tb ? 'Bütçe aşılıyor' : offerValue >= sellerAsk ? 'Toplam teklif satıcı beklentisine ulaşıyor' : 'Satıcıdan karşı teklif gelebilir'} · Transfer bütçesi ₺{tb.toFixed(1)}M</div>
          <div className={`text-[12px] mt-1 font-semibold ${tb - fee >= 0 ? 'text-ok' : 'text-danger'}`}>Teklif sonrası bütçe: ₺{(Math.round((tb - fee) * 10) / 10).toFixed(1)}M</div>
        </div>
        <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
          <div className="m26-overline">Oyuncu + nakit takası</div>
          <select aria-label="Takas oyuncusu" value={swapId} onChange={(e) => { setSwapId(e.target.value); setSellerTone(null); voice.clear(); }} className="w-full min-h-touch bg-base border border-line rounded-lg px-2.5 text-[12.5px] text-primary">
            <option value="">Oyuncu ekleme — yalnız nakit</option>
            {swapOptions.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.group} · takas değeri ₺{(playerValue(x, g.myLeague) * 0.85).toFixed(1)}M</option>)}
          </select>
          {swapPlayer && <p className="text-secondary text-[12px] leading-relaxed">{swapPlayer.name}, {seller.short} kadrosuna geçer; ₺{swapVal.toFixed(1)}M takas değeri sayılır.</p>}
          <div><div className="m26-overline mb-2">Sonraki satış payı</div><div className="grid grid-cols-5 gap-1.5">{([0, 10, 15, 20, 25] as const).map((pct) => <button type="button" key={pct} aria-pressed={sellOnPct === pct} onClick={() => { setSellOnPct(pct); setSellerTone(null); voice.clear(); }} className={`min-h-touch rounded-lg border text-[12px] font-bold ${sellOnPct === pct ? 'bg-amber text-base border-amber' : 'bg-base text-secondary border-line'}`}>{pct}%</button>)}</div>
            <p className="text-secondary text-[12px] mt-1.5 leading-relaxed">{sellOnPct ? `İlerideki satış bedelinin %${sellOnPct}’i satıcıya gider; bugün yaklaşık ₺${sellOnValue.toFixed(2)}M pazarlık kredisi sayılır.` : 'Satış payı yok. Bu madde yalnızca kulüplü oyuncu transferinde sunulur.'}</p>
          </div>
        </div>
        <div><h3 className="text-primary text-[14px] font-bold mb-2">Masada ne söyleyeceksin?</h3>{replyChoices('seller')}<p className="text-muted text-[11px] mt-2">İndirimler görüşme boyunca oyuncu değerinin toplam %3’üyle sınırlı; en fazla bir ek sabır kaybı olabilir.</p></div>
      </> : <div className="rounded-xl bg-ok/10 border border-ok/40 p-3 text-ok text-[13px] font-semibold">Serbest oyuncu: kulüp bonservisi veya takas yok. Doğrudan sözleşme görüşmesine geç.</div>}
      <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-[12px] text-secondary"><span>Basına sızma riski</span><b className={leakRisk >= 30 ? 'text-warn' : 'text-ok'}>%{leakRisk}</b></div>
      <Btn variant="amber" testId="transfer-send-seller" className="w-full" disabled={fee > tb || !inWindow || (!!seller && !sellerTone)} onClick={sendOffer}>{seller ? 'Teklifi Masaya Koy' : 'Oyuncuyla Görüşmeye Başla'}</Btn>
    </div>}

    {stage === 'seller' && <div className="space-y-4">
      {seller && <div className="flex items-center gap-3 rounded-xl bg-surface p-3"><Crest club={seller} size={36} /><div className="flex-1"><div className="text-primary font-bold">{seller.name} temsilcisi</div><div className="text-secondary text-[12px]">Pazarlık turu {round} · sabır {patience}/3</div></div><div className="flex gap-1" aria-label={`Satıcı sabrı ${patience} / 3`}>{[0, 1, 2].map((index) => <span key={index} className={`w-2.5 h-2.5 rounded-full ${index < patience ? 'bg-ok' : 'bg-line'}`} />)}</div></div>}
      <div className="transfer-facts"><div><span>Nakit teklif</span><strong>₺{fee.toFixed(2)}M</strong></div><div><span>Masadaki toplam değer</span><strong>₺{offerValue.toFixed(2)}M</strong></div></div>
      {swapPlayer && <p className="text-secondary text-[12px]">Takas: {swapPlayer.name} · ₺{swapVal.toFixed(1)}M. {sellOnPct > 0 ? `Satış payı: %${sellOnPct}.` : ''}</p>}
      {!swapPlayer && sellOnPct > 0 && <p className="text-secondary text-[12px]">Sonraki satış payı: %{sellOnPct}.</p>}
      {leakNotice}
      {sellerWalked ? <div className="space-y-3"><p className="text-secondary text-[13px] leading-relaxed">Kulüp bu şartlarda masadan kalktı. Yeni bir görüşme açabilir veya vazgeçebilirsin.</p><div className="grid grid-cols-2 gap-2"><Btn variant="secondary" onClick={onCancel}>Vazgeç</Btn><Btn variant="amber" onClick={newMeeting}>Yeni Görüşme</Btn></div></div>
        : sellerAgreed ? <div className="space-y-3"><div className="rounded-lg bg-ok/10 border border-ok/40 p-3 text-ok text-[13px]">Kulüp şartları kabul etti. Transfer henüz tamamlanmadı; sırada oyuncunun sözleşmesi var.</div><Btn variant="amber" testId="transfer-meet-player" className="w-full" onClick={() => goPlayer(fee)}>Oyuncuyla Görüş</Btn><Btn variant="secondary" className="w-full" onClick={goOffer}>Kulüp Şartlarını Düzenle</Btn></div>
        : <div className="space-y-3"><div className="rounded-lg bg-warn/10 border border-warn/40 p-3"><div className="text-warn font-bold text-[13px]">Satıcının karşı teklifi: ₺{sellerAsk.toFixed(2)}M toplam değer</div><p className="text-secondary text-[12px] mt-1">Takas ve satış payı düşüldüğünde nakit ₺{counterFee.toFixed(2)}M. Sabır: {patience}/3.</p>{counterFee > tb && <p role="alert" className="text-danger text-[12px] mt-1">Karşı teklif transfer bütçesini aşıyor.</p>}</div><Btn variant="amber" testId="transfer-accept-counter" className="w-full" disabled={counterFee > tb || !inWindow} onClick={() => goPlayer(counterFee)}>Karşı Teklifi Kabul Et · Oyuncuyla Görüş</Btn><Btn variant="secondary" className="w-full" onClick={goOffer}>Şartları Yeniden Düzenle</Btn></div>}
    </div>}

    {stage === 'player' && <div className="space-y-4">
      {leakNotice}
      <div className="rounded-xl border border-line bg-surface p-3 text-[12px] text-secondary">{seller ? `${seller.name} ile nakit ₺${(agreedFee ?? 0).toFixed(2)}M üzerinde anlaşıldı.` : 'Serbest oyuncu ile sözleşme görüşmesi · bonservis ₺0M.'} İmza henüz atılmadı.</div>
      <div><div className="flex justify-between text-[13px] mb-1.5"><span className="text-primary font-semibold">Aylık maaş teklifi</span><span className="num text-amber font-bold">₺{wage}B</span></div>
        <input aria-label="Aylık maaş teklifi" type="range" min={p.wage} max={Math.max(p.wage, Math.ceil(p.wage * 2.5))} step={1} value={wage} onChange={(e) => { setWage(+e.target.value); clearPlayerResponse(); }} className="w-full accent-amber h-6" />
        <div className="text-secondary text-[12px]">Oyuncunun güncel beklentisi ₺{demandWage}B/ay · bütçe tavanı ₺{wageHeadroom}B/ay</div>
      </div>
      <div><div className="m26-overline mb-2">Sözleşme süresi</div><div className="grid grid-cols-4 gap-1.5">{([2, 3, 4, 5] as const).map((year) => <button type="button" key={year} aria-pressed={years === year} onClick={() => { setYears(year); setWage(Math.max(p.wage, Math.round(p.wage * STATUS_MUL[status] * YEAR_MUL[year] * (leaked ? 1.05 : 1)))); clearPlayerResponse(); }} className={`min-h-touch rounded-lg text-[12px] font-bold border ${years === year ? 'bg-amber text-base border-amber' : 'bg-base text-secondary border-line'}`}>{year} yıl</button>)}</div></div>
      <div><div className="m26-overline mb-2">Oyuncu rolü</div><div className="grid grid-cols-3 gap-1.5">{([['rotasyon', 'Rotasyon'], ['ilk11', 'İlk 11'], ['yildiz', 'Yıldız']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setWage(Math.max(p.wage, Math.round(p.wage * STATUS_MUL[value] * YEAR_MUL[years] * (leaked ? 1.05 : 1)))); clearPlayerResponse(); }} className={`min-h-touch rounded-lg text-[12px] font-bold border ${status === value ? 'bg-amber text-base border-amber' : 'bg-base text-secondary border-line'}`}>{label}</button>)}</div><p className="text-secondary text-[12px] mt-1.5 leading-relaxed">Yıldız rolü 10 maçlık süre sözüyle kaydedilir. Maaş talebi role ve süreye göre değişir.</p></div>
      {wageBreach && <p role="alert" className="text-danger text-[12px]">Maaş bütçesi aşılıyor — Kulüp → Finans bölümünden tavanı yükselt.</p>}
      {playerResponse && <div role="status" className={`rounded-xl p-3 text-[12.5px] border ${playerResponse.accepted ? 'bg-ok/10 border-ok/40 text-ok' : 'bg-warn/10 border-warn/40 text-warn'}`}>{playerResponse.accepted ? `Oyuncu ₺${wage}B/ay teklifini kabul etti. İmzadan önce sözleşmeyi inceleyebilirsin.` : `Oyuncu şu anda en az ₺${playerResponse.demand}B/ay bekliyor; teklifini veya rolü gözden geçir.`}</div>}
      {playerResponse?.accepted ? <Btn variant="amber" testId="transfer-review" className="w-full" onClick={() => { voice.play(signingReadyLine); setStage('review'); }}>Sözleşmeyi Gözden Geçir</Btn> : <>
        <div><h3 className="text-primary text-[14px] font-bold mb-2">Oyuncuya ne söyleyeceksin?</h3>{replyChoices('player')}<p className="text-muted text-[11px] mt-2">Her üslup bir kez etkili olabilir; toplam ücret indirimi beklentinin en fazla %3’üdür.</p></div>
        <Btn variant="amber" testId="transfer-send-player" className="w-full" disabled={!playerTone || wageBreach} onClick={sendPlayerOffer}>Sözleşme Teklifini Sun</Btn>
      </>}
      {seller && <Btn variant="secondary" className="w-full" onClick={goOffer}>Kulüp Şartlarına Dön</Btn>}
    </div>}

    {stage === 'review' && agreedFee !== null && <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-3 space-y-3"><h3 className="font-display text-primary text-[17px] font-bold">İmza öncesi son kontrol</h3><p className="text-secondary text-[12px]">{p.name} · {seller?.name ?? 'Serbest statü'} → {g.myClub.name}</p>{termsFacts(agreedFee)}
        {swapPlayer && <p className="text-secondary text-[12px]">Takas: {swapPlayer.name} → {seller?.name}.</p>}{sellOnPct > 0 && <p className="text-secondary text-[12px]">Sonraki satıştan %{sellOnPct} satıcı kulübe.</p>}
        <p className="text-secondary text-[12px]">İmzadan sonra transfer bütçesi: ₺{(Math.round((tb - agreedFee) * 10) / 10).toFixed(1)}M · Yabancı kadrosu (takas sonrası): {foreignCount}/{quota}.</p>
        <p className="text-muted text-[11px]">İmzaya basmadan oyuncu kadroya eklenmez ve transfer bütçesi düşmez.</p>
      </div>
      {quotaBreach && <p role="alert" className="text-danger text-[12px]">Yabancı kotası dolu ({foreignCount}/{quota}). Bir yabancıyla yolları ayır veya yabancı oyuncu takas et.</p>}
      {squadFull && <p role="alert" className="text-danger text-[12px]">Kadro üst sınırı 30. Önce satış yap veya takasla yer aç.</p>}
      {wageBreach && <p role="alert" className="text-danger text-[12px]">Maaş bütçesi aşılıyor.</p>}
      <Btn variant="amber" testId="transfer-sign" className="w-full" disabled={quotaBreach || squadFull || wageBreach || agreedFee > tb || !inWindow} onClick={signDeal}>Sözleşmeyi İmzala</Btn>
      <Btn variant="secondary" className="w-full" onClick={() => { clearPlayerResponse(); setStage('player'); }}>Oyuncu Şartlarını Düzenle</Btn>
      {seller && <Btn variant="secondary" className="w-full" onClick={goOffer}>Kulüp Şartlarını Düzenle</Btn>}
    </div>}

    {stage === 'signed' && !showReveal && <div className="space-y-4" data-testid="transfer-signing">
      <div className="rounded-2xl border border-ok/40 bg-ok/10 p-4 space-y-3">
        <div className="text-ok font-display text-[18px] font-bold">{p.name} · sözleşme imzalandı</div>
        <p className="text-secondary text-[12px]">İmza atıldı, oyuncu kadroya katıldı. Tanıtıma ne zaman geçeceğine sen karar verirsin.</p>
        {termsFacts(signedFee)}
        <div className="transfer-facts"><div><span>Kalan transfer bütçesi</span><strong>₺{signedBudget.toFixed(1)}M</strong></div><div><span>Kalan maaş alanı</span><strong>₺{signedWageRoom}B / ay</strong></div></div>
        {signedSwap && <p className="text-secondary text-[12px]">Takas: {signedSwap.name} → {seller?.short ?? 'satıcı kulüp'}.</p>}
      </div>
      <Btn variant="amber" testId="transfer-open-reveal" className="w-full" onClick={openReveal}>Tanıtıma Geç →</Btn>
    </div>}
    {stage === 'signed' && showReveal && <div className="space-y-4" data-testid="transfer-complete" data-reveal-tier={reveal}>
      <div className="rounded-2xl border border-ok/40 bg-ok/10 p-4 space-y-3">
        <div className="flex items-center gap-3"><PlayerPortrait player={{ ...p, clubId: g.myClub.id }} size={52} /><div><div className="text-ok font-display text-[18px] font-bold">{p.name} · imza atıldı</div><div className="text-secondary text-[12px]">{seller?.name ?? 'Serbest statü'} → {g.myClub.name}</div></div></div>
        {termsFacts(signedFee)}
        <div className="transfer-facts"><div><span>Kalan transfer bütçesi</span><strong>₺{signedBudget.toFixed(1)}M</strong></div><div><span>Kalan maaş alanı</span><strong>₺{signedWageRoom}B / ay</strong></div></div>
        <div className="rounded-lg bg-base/70 p-2"><div className="m26-overline">Geri alım</div><div className="text-primary font-bold">Yok</div></div>
        {signedSwap && <p className="text-secondary text-[12px]">Takas: {signedSwap.name} → {seller?.short ?? 'satıcı kulüp'}.</p>}
        {sellOnPct > 0 && <p className="text-secondary text-[12px]">Sonraki satışta %{sellOnPct} pay {seller?.short ?? 'satıcı kulüp'} lehine kaydedildi.</p>}
        <p className="text-secondary text-[12px]">Görüşme öncesinde {G_SHORT[p.group] ?? p.group} bölgesinde {samePosition.length} oyuncu vardı{bestPositionGen === null ? '.' : `; en yüksek güç ${bestPositionGen} GEN idi.`}</p>
        <p className="text-muted text-[11px]">Transfer, maaş ve sözleşme süresi kariyer kaydına işlendi.</p>
      </div>
      <Btn variant="secondary" testId="transfer-announcement" className="w-full" onClick={() => voice.play(transferAnnouncement(reveal, voiceKey))}>🎙 Tanıtım Anonsunu Dinle</Btn>
      <Btn variant="amber" className="w-full min-h-touch" onClick={() => { onDone(true, `${p.name} kadroya katıldı.`); onHome?.(); }}>Ana Merkeze Dön</Btn>
      <Btn variant="secondary" className="w-full" onClick={() => onDone(true, `${p.name} kadroya katıldı.`)}>Piyasada Kal</Btn>
    </div>}
  </CinematicLayout>;
};
