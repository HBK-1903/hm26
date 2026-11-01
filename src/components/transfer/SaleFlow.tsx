import React, { useEffect, useRef, useState } from 'react';
import type { Club, IncomingOffer, Player } from '../../types';
import { clubByIdSafe } from '../../data/clubs';
import { playerValue } from '../../data/gen';
import { calculateSellOnSettlement, normalizeSellOnClauses } from '../../data/transferNegotiation';
import { saleToneHints } from '../../data/saleNegotiation';
import { transferRevealForGen, type TransferTone } from '../../data/transferPresentation';
import { buyerTransferLine, managerSaleLine, signedTransferLine, transferAnnouncement } from '../../data/transferVoices';
import { useGame, type IncomingOfferResponse } from '../../store/game';
import { audio } from '../../audio/engine';
import { PlayerPortrait } from '../assets/Portrait';
import { Btn } from '../ui/kit';
import { TransferSubtitle, TransferTheatre } from './TransferTheatre';
import { CinematicLayout, preventAccidentalDoubleClick, resetCinematicScroll, type CameraCue } from '../cinematic/Cinematic';
import { transferVoiceVolume, useTransferSpeech } from './useTransferSpeech';

type SaleStage = 'offer' | 'response' | 'review' | 'signed' | 'declined';
type Agreement = { fee: number; counter: boolean; tone: TransferTone };
const TONES: { value: TransferTone; label: string }[] = [
  { value: 'calm', label: 'Sakin' }, { value: 'witty', label: 'Esprili' }, { value: 'firm', label: 'Sert' },
];
const money = (value: number) => `₺${value.toFixed(2)}M`;

/** The conversation lives only while the scene is open; the sale has a separate final authorization. */
export const SaleFlow: React.FC<{ offer: IncomingOffer; player: Player; buyer: Club; onClose: () => void }> = ({ offer, player, buyer, onClose }) => {
  const g = useGame();
  const voice = useTransferSpeech();
  const [stage, setStage] = useState<SaleStage>('offer');
  const [fee, setFee] = useState(() => Math.max(offer.fee, Math.round(offer.fee * 1.25 * 100) / 100));
  const [tone, setTone] = useState<TransferTone | null>(null);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [signed, setSigned] = useState<IncomingOfferResponse | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sent = useRef(false);
  const signedOnce = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const crowdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reveal = transferRevealForGen(player.ratings.gen);
  const key = `${g.career.seed}|${offer.id}|${player.id}`;
  const marketValue = playerValue(player, g.myLeague);
  const maxFee = Math.max(offer.fee, Math.ceil(Math.max(offer.fee * 2, marketValue * 1.8) * 100) / 100);
  const settlement = agreement ? calculateSellOnSettlement(agreement.fee, normalizeSellOnClauses(g.sellOnClauses)[player.id] ?? []) : null;
  const previewBudget = settlement ? Math.round((g.budget.tb + settlement.retainedFee) * 100) / 100 : g.budget.tb;

  useEffect(() => { resetCinematicScroll(stageRef.current); }, [stage, showReveal]);
  useEffect(() => () => { if (crowdTimer.current) clearTimeout(crowdTimer.current); audio.stopCrowd(); }, []);

  const theatreMode = stage === 'signed' ? (showReveal ? 'reveal' : 'player') : 'buyer';
  const sceneClub = stage === 'signed' && showReveal ? buyer : g.myClub;
  const subtitle = <TransferSubtitle line={voice.lastLine} muted={voice.muted} systemMuted={transferVoiceVolume() <= 0}
    onReplay={() => { if (voice.lastLine) voice.play(voice.lastLine); }} onSkip={voice.stop}
    onToggle={() => { if (!voice.muted) { if (crowdTimer.current) clearTimeout(crowdTimer.current); audio.stopCrowd(); } voice.toggle(); }} />;
  const chooseOffer = (counter: boolean) => {
    if (sent.current || !tone) return;
    sent.current = true;
    setError(null);
    if (counter) {
      // The store decides both preview and final outcome with the same deterministic rule.
      // An accepted preview is not a transfer; an actual rejection closes the offer.
      const result = g.respondOffer(offer.id, false, fee, { tone, previewCounter: true });
      if (!result.ok) { sent.current = false; setError(result.reason ?? 'Teklif değerlendirilemedi.'); return; }
      if (result.outcome === 'rejected') {
        voice.play(buyerTransferLine(false, key));
        setStage('declined');
        return;
      }
      if (result.outcome !== 'counter-accepted' || result.fee === undefined) {
        sent.current = false; setError('Alıcının yanıtı doğrulanamadı.'); return;
      }
      setAgreement({ fee: result.fee, counter: true, tone });
    } else {
      setAgreement({ fee: offer.fee, counter: false, tone });
    }
    voice.play(buyerTransferLine(true, key));
    setStage('response');
  };
  const editOffer = () => { sent.current = false; setAgreement(null); setError(null); voice.clear(); setStage('offer'); };
  const confirmSale = () => {
    if (!agreement || signedOnce.current) return;
    signedOnce.current = true;
    setError(null);
    const result = agreement.counter
      ? g.respondOffer(offer.id, false, agreement.fee, { tone: agreement.tone })
      : g.respondOffer(offer.id, true);
    if (!result.ok) { signedOnce.current = false; setError(result.reason ?? 'Satış tamamlanamadı.'); return; }
    // A stale counter may legitimately be rejected during final validation; never call it a sale.
    if (result.outcome === 'rejected') { voice.play(buyerTransferLine(false, key)); setStage('declined'); return; }
    if (result.outcome !== 'accepted' || !result.settlement || result.budgetAfter === undefined) {
      signedOnce.current = false; setError('Satış sonucu doğrulanamadı.'); return;
    }
    setSigned(result);
    setShowReveal(false);
    setStage('signed');
    voice.play(signedTransferLine(key));
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

  const breakdown = (gross: number, paid: number, net: number, budget: number, complete = false) => <div className="transfer-facts">
    <div><span>Brüt satış bedeli</span><strong>{money(gross)}</strong></div>
    <div><span>Önceki satış payları</span><strong>−{money(paid)}</strong></div>
    <div><span>Bütçeye net {complete ? 'giren' : 'girecek'}</span><strong>{money(net)}</strong></div>
    <div><span>Satış sonrası bütçe</span><strong>{money(budget)}</strong></div>
  </div>;

  const significantResponse = (stage === 'response' || stage === 'declined') && voice.lastLine?.speaker === 'representative';
  const firmReply = stage === 'offer' && tone === 'firm' && voice.lastLine?.speaker === 'manager';
  const cameraCue: CameraCue = significantResponse || firmReply
    ? { key: `${stage}:${voice.lastLine!.id}`, target: firmReply ? 'manager' : 'opponent' } : null;
  const scene = <TransferTheatre mode={theatreMode} player={player} club={sceneClub} seller={buyer} manager={g.career.manager}
    speaking={voice.speaking} cinematic cameraCue={cameraCue} beat={stage} />;
  return <CinematicLayout ref={stageRef} testId="sale-flow" stage={stage} scene={scene} subtitle={subtitle}>
    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold tracking-wide text-secondary" aria-label="Satış görüşmesi adımları">
      <span className={stage === 'offer' ? 'text-amber' : ''}>01 GÖRÜŞME</span><span>—</span>
      <span className={stage === 'response' || stage === 'declined' ? 'text-amber' : ''}>02 ALICI YANITI</span><span>—</span>
      <span className={stage === 'review' || stage === 'signed' ? 'text-amber' : ''}>03 SATIŞ ONAYI</span>
    </div>
    {error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-danger text-[12px]">{error}</p>}

    {stage === 'offer' && <div className="space-y-4">
      <div className="bg-base rounded-xl p-3 flex items-center gap-3">
        <PlayerPortrait player={player} size={44} />
        <div className="flex-1 min-w-0"><div className="text-primary font-bold truncate">{player.name}</div><div className="text-secondary text-[12px]">{g.myClub.name} → {buyer.name}</div></div>
        <div className="text-right"><div className="m26-overline">Gelen teklif</div><div className="num text-amber font-bold">{money(offer.fee)}</div></div>
      </div>
      <p className="text-secondary text-[12px] leading-relaxed">Alıcıyla görüş veya karşı teklif ver. Satış, alıcı kabul etse bile yalnızca son onayınla gerçekleşir.</p>
      <div>
        <div className="flex justify-between text-[13px] mb-1.5"><label htmlFor="sale-counter-fee" className="text-primary font-semibold">Karşı teklif bedeli</label><span className="num text-amber font-bold">{money(fee)}</span></div>
        <input id="sale-counter-fee" aria-label="Karşı teklif bedeli" type="range" min={offer.fee} max={maxFee} step="0.01" value={fee} onChange={(event) => setFee(+event.target.value)} className="w-full accent-amber h-6" />
        <p className="text-secondary text-[11.5px]">{fee <= offer.fee * 1.25 ? 'Gelen teklife yakın; ret riski düşük.' : !offer.negotiable ? 'Alıcı daha yüksek bedelle pazarlığa açık değil.' : fee <= offer.fee * 1.6 ? 'Riskli: alıcı kabul edebilir veya masadan kalkabilir.' : 'Bu bedelde alıcının masadan kalkma riski çok yüksek.'}</p>
      </div>
      <div><h3 className="text-primary text-[14px] font-bold mb-2">Alıcıya ne söyleyeceksin?</h3>
        <div className="transfer-replies" role="group" aria-label="Satış görüşmesi cevapları">
          {TONES.map(({ value, label }) => {
            const line = managerSaleLine(value, key);
            return <button type="button" key={value} className="transfer-reply" aria-pressed={tone === value} data-testid={`sale-reply-${value}`}
              onClick={() => { setTone(value); setError(null); voice.play(line); }}>
              <span className="transfer-reply__tone block">{label}</span><span className="transfer-reply__label">“{line.text}”</span>
              <span className="transfer-reply__hint">{saleToneHints(value).join(' · ')}</span>
            </button>;
          })}
        </div>
        <p className="text-muted text-[11px] mt-2">Üslup yalnız karşı teklifin sınırdaki yanıtını küçük ölçüde etkiler; gelen teklifin kabulünü değiştirmez.</p>
      </div>
      <Btn variant="amber" testId="sale-original" className="w-full" disabled={!tone} onClick={() => chooseOffer(false)}>Gelen Teklifle Devam Et</Btn>
      <Btn variant="secondary" testId="sale-counter" className="w-full" disabled={!tone} onClick={() => chooseOffer(true)}>Karşı Teklifi Gönder</Btn>
      <Btn variant="secondary" className="w-full" onClick={onClose}>Vazgeç · Teklif Açık Kalsın</Btn>
    </div>}

    {stage === 'response' && agreement && <div className="space-y-3">
      <div role="status" className="rounded-xl border border-ok/40 bg-ok/10 p-3 text-[13px] leading-relaxed text-ok">{buyer.name} {money(agreement.fee)} bedeli kabul etti. Oyuncu henüz satılmadı.</div>
      <Btn variant="amber" testId="sale-review" className="w-full" onClick={() => { voice.clear(); setStage('review'); }}>Satış Koşullarını İncele</Btn>
      <Btn variant="secondary" className="w-full" onClick={editOffer}>Koşulları Yeniden Düzenle</Btn>
      <Btn variant="secondary" className="w-full" onClick={onClose}>Vazgeç · Teklif Açık Kalsın</Btn>
    </div>}

    {stage === 'review' && agreement && settlement && <div className="space-y-3">
      <div className="rounded-xl border border-line bg-surface p-3 space-y-3">
        <h3 className="font-display text-primary text-[17px] font-bold">Satış öncesi son kontrol</h3>
        <p className="text-secondary text-[12px]">{player.name} · {g.myClub.name} → {buyer.name}</p>
        {breakdown(agreement.fee, settlement.totalPaid, settlement.retainedFee, previewBudget)}
        {settlement.payouts.map((row, index) => <p key={`${row.clubId}-${index}`} className="text-secondary text-[11px]">{clubByIdSafe(row.clubId)?.name ?? row.clubId}: %{row.pct} · {money(row.amount)}</p>)}
        <p className="text-muted text-[11px]">Onaylamadan oyuncu kadrodan ayrılmaz ve bütçe değişmez.</p>
      </div>
      <Btn variant="amber" testId="sale-confirm" className="w-full" onClick={confirmSale}>Satışı Onayla</Btn>
      <Btn variant="secondary" className="w-full" onClick={editOffer}>Koşulları Yeniden Düzenle</Btn>
      <Btn variant="secondary" className="w-full" onClick={onClose}>Vazgeç · Teklif Açık Kalsın</Btn>
    </div>}

    {stage === 'declined' && <div className="space-y-3">
      <div role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-warn text-[13px] leading-relaxed">{buyer.name} karşı teklifi reddetti ve masadan kalktı. Teklif kapandı; satış yapılmadı.</div>
      <Btn variant="amber" className="w-full" onClick={onClose}>Piyasaya Dön</Btn>
    </div>}

    {stage === 'signed' && !showReveal && signed?.settlement && signed.fee !== undefined && signed.budgetAfter !== undefined && <div className="space-y-3" data-testid="sale-signing">
      <div className="rounded-xl border border-ok/40 bg-ok/10 p-3 space-y-3">
        <div className="text-ok font-display text-[18px] font-bold">{player.name} · satış imzalandı</div>
        <p className="text-secondary text-[12px]">Satış tamamlandı; alıcı kulübün tanıtımına sen hazır olduğunda geç.</p>
        {breakdown(signed.fee, signed.settlement.totalPaid, signed.settlement.retainedFee, signed.budgetAfter, true)}
      </div>
      <div onClickCapture={preventAccidentalDoubleClick}><Btn variant="amber" testId="sale-open-reveal" className="w-full" onClick={openReveal}>Tanıtıma Geç →</Btn></div>
    </div>}
    {stage === 'signed' && showReveal && signed?.settlement && signed.fee !== undefined && signed.budgetAfter !== undefined && <div className="space-y-3" data-testid="sale-complete" data-reveal-tier={reveal}>
      <div className="rounded-xl border border-ok/40 bg-ok/10 p-3 space-y-3">
        <div className="text-ok font-display text-[18px] font-bold">{player.name} · satış tamamlandı</div>
        <p className="text-secondary text-[12px]">{g.myClub.name} → {buyer.name} · tanıtım {buyer.name} tarafından yapılıyor.</p>
        {breakdown(signed.fee, signed.settlement.totalPaid, signed.settlement.retainedFee, signed.budgetAfter, true)}
        <p className="text-muted text-[11px]">Oyuncu, satış bedeli ve önceki kulüplere ödenen pay kariyer kaydına işlendi.</p>
      </div>
      <Btn variant="secondary" testId="sale-announcement" className="w-full" onClick={() => voice.play(transferAnnouncement(reveal, key))}>🎙 Tanıtım Anonsunu Dinle</Btn>
      <Btn variant="amber" className="w-full" onClick={onClose}>Piyasaya Dön</Btn>
    </div>}
  </CinematicLayout>;
};
