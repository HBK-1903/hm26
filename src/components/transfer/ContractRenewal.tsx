import React, { useEffect, useRef, useState } from 'react';
import type { Player } from '../../types';
import { RENEWAL_YEARS, renewalBonus, renewalDemand, renewalToneHints } from '../../data/contractNegotiation';
import type { TransferTone } from '../../data/transferPresentation';
import { managerRenewalLine, playerRenewalLine, renewalSignedLine, signingReadyLine } from '../../data/transferVoices';
import { useGame, type RenewalQuote } from '../../store/game';
import { PlayerPortrait } from '../assets/Portrait';
import { Btn } from '../ui/kit';
import { TransferSubtitle, TransferTheatre } from './TransferTheatre';
import { CinematicLayout, resetCinematicScroll, type CameraCue } from '../cinematic/Cinematic';
import { transferVoiceVolume, useTransferSpeech } from './useTransferSpeech';

type Stage = 'offer' | 'response' | 'review' | 'signed';
type Agreement = { years: number; wage: number; tone: TransferTone; quote: RenewalQuote };
const TONES: { value: TransferTone; label: string }[] = [
  { value: 'calm', label: 'Sakin' }, { value: 'witty', label: 'Esprili' }, { value: 'firm', label: 'Sert' },
];
const money = (n: number) => `₺${n.toFixed(3)}M`;

/** Negotiation state stays in the scene. Only a separate final signature changes the career. */
export const ContractRenewal: React.FC<{ player: Player; onClose: () => void }> = ({ player, onClose }) => {
  const g = useGame();
  const voice = useTransferSpeech();
  const [stage, setStage] = useState<Stage>('offer');
  const [years, setYears] = useState<number>(3);
  const [wage, setWage] = useState(() => renewalDemand(player.wage));
  const [tone, setTone] = useState<TransferTone | null>(null);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [signed, setSigned] = useState<RenewalQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sent = useRef(false);
  const signedOnce = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const key = `${g.career.seed}|${g.career.day}|${player.id}`;
  const minimum = Math.max(0, Math.floor(player.wage * 0.75));
  const maximum = Math.max(minimum + 1, renewalDemand(player.wage), Math.ceil(renewalDemand(player.wage) * 1.6));
  const bonus = renewalBonus(player.wage);
  const canAfford = g.budget.tb >= bonus;

  useEffect(() => { resetCinematicScroll(stageRef.current); }, [stage]);

  const editOffer = (useDemand = false) => {
    if (useDemand && agreement?.quote.demand !== undefined) setWage(agreement.quote.demand);
    sent.current = false;
    setAgreement(null);
    setError(null);
    voice.clear();
    setStage('offer');
  };
  const sendOffer = () => {
    if (!tone || sent.current) return;
    sent.current = true;
    setError(null);
    const quote = g.quoteRenewal(player.id, years, { wage, tone });
    if (!quote.ok) { sent.current = false; setError(quote.reason ?? 'Teklif değerlendirilemedi.'); return; }
    setAgreement({ years, wage, tone, quote });
    voice.play(playerRenewalLine(!!quote.accepted, key));
    setStage('response');
  };
  const sign = () => {
    if (!agreement || signedOnce.current) return;
    signedOnce.current = true;
    setError(null);
    const terms = { wage: agreement.wage, tone: agreement.tone };
    const fresh = g.quoteRenewal(player.id, agreement.years, terms);
    if (!fresh.ok || !fresh.accepted) {
      signedOnce.current = false;
      setError(fresh.reason ?? `Oyuncunun güncel beklentisi ₺${fresh.demand}B/ay. Teklifi yeniden düzenle.`);
      return;
    }
    if (fresh.bonus !== agreement.quote.bonus || fresh.budgetAfter !== agreement.quote.budgetAfter || fresh.demand !== agreement.quote.demand) {
      signedOnce.current = false;
      setAgreement({ ...agreement, quote: fresh });
      setError('Mali koşullar değişti. Güncel rakamları inceleyip yeniden imzala.');
      return;
    }
    const result = g.renewContract(player.id, agreement.years, terms);
    if (!result.ok) { signedOnce.current = false; setError(result.reason ?? 'Sözleşme imzalanamadı.'); return; }
    setSigned(result);
    voice.play(renewalSignedLine(key));
    setStage('signed');
  };
  const facts = (quote: RenewalQuote, completed = false) => <div className="transfer-facts" data-testid="renewal-facts">
    <div><span>Süre</span><strong>{quote.years} yıl</strong></div>
    <div><span>Yeni maaş</span><strong>₺{quote.wage}B/ay</strong></div>
    <div><span>İmza bonusu</span><strong>{money(quote.bonus ?? 0)}</strong></div>
    <div><span>{completed ? 'Kalan bütçe' : 'İmza sonrası bütçe'}</span><strong>{money(quote.budgetAfter ?? 0)}</strong></div>
  </div>;

  const significantResponse = (stage === 'response' || stage === 'review' || stage === 'signed') && voice.lastLine?.speaker === 'player';
  const firmReply = stage === 'offer' && tone === 'firm' && voice.lastLine?.speaker === 'manager';
  const cameraCue: CameraCue = significantResponse || firmReply
    ? { key: `${stage}:${voice.lastLine!.id}`, target: firmReply ? 'manager' : 'opponent' } : null;
  const scene = <TransferTheatre mode="renewal" player={player} club={g.myClub} seller={g.myClub} manager={g.career.manager}
    speaking={voice.speaking} cinematic cameraCue={cameraCue} beat={stage} />;
  const subtitle = <TransferSubtitle line={voice.lastLine} muted={voice.muted} systemMuted={transferVoiceVolume() <= 0}
    onReplay={() => { if (voice.lastLine) voice.play(voice.lastLine); }} onSkip={voice.stop} onToggle={voice.toggle} />;
  return <CinematicLayout ref={stageRef} testId="renewal-flow" stage={stage} scene={scene} subtitle={subtitle}>
    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold tracking-wide text-secondary" aria-label="Sözleşme görüşmesi adımları">
      <span className={stage === 'offer' ? 'text-amber' : ''}>01 TEKLİF</span><span>—</span>
      <span className={stage === 'response' ? 'text-amber' : ''}>02 OYUNCU YANITI</span><span>—</span>
      <span className={stage === 'review' || stage === 'signed' ? 'text-amber' : ''}>03 İMZA</span>
    </div>
    {error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-danger text-[12px]">{error}</p>}

    {stage === 'offer' && <div className="space-y-4">
      <div className="bg-base rounded-xl p-3 flex items-center gap-3">
        <PlayerPortrait player={player} size={44} />
        <div className="flex-1 min-w-0"><div className="text-primary font-bold truncate">{player.name}</div><div className="text-secondary text-[11px]">{player.ratings.gen} GEN · POT {Number.isFinite(player.potential) ? player.potential : '—'} · {player.contractYears ?? 3} yıl kaldı</div></div>
        <div className="text-right"><div className="m26-overline">Mevcut</div><div className="num text-amber font-bold">₺{player.wage}B/ay</div></div>
      </div>
      <p className="text-secondary text-[12px] leading-relaxed">Süre ve maaşı belirle, oyuncuyla görüş. Şartlar kabul edilse bile sözleşme yalnızca son imzanla değişir.</p>
      <div><div className="m26-overline mb-2">Yeni sözleşme süresi</div><div className="grid grid-cols-3 gap-2" role="group" aria-label="Yeni sözleşme süresi">
        {RENEWAL_YEARS.map((value) => <button type="button" key={value} aria-pressed={years === value} onClick={() => setYears(value)}
          className={`min-h-touch rounded-lg text-[12px] font-bold border ${years === value ? 'bg-amber text-base border-amber' : 'bg-base text-secondary border-line'}`}>{value} yıl</button>)}
      </div></div>
      <div>
        <div className="flex justify-between text-[13px] mb-1.5"><label htmlFor="renewal-wage" className="text-primary font-semibold">Aylık maaş teklifi</label><span className="num text-amber font-bold">₺{wage}B/ay</span></div>
        <input id="renewal-wage" data-testid="renewal-wage" type="range" min={minimum} max={maximum} step="1" value={wage} onChange={(event) => setWage(+event.target.value)} className="w-full accent-amber h-6" />
        <p className="text-secondary text-[11.5px]">Başlangıç beklentisi ₺{renewalDemand(player.wage)}B/ay · mevcut maaş ₺{player.wage}B/ay. Üslup yalnızca küçük bir fark yaratabilir.</p>
      </div>
      <div className="transfer-facts">
        <div><span>İmza bonusu</span><strong>{money(bonus)}</strong></div>
        <div><span>Aylık fark</span><strong>{wage >= player.wage ? '+' : '−'}₺{Math.abs(wage - player.wage)}B/ay</strong></div>
      </div>
      {!canAfford && <p role="status" className="text-danger text-[12px]">İmza bonusu için bütçe yetersiz; {money(bonus)} gerekli.</p>}
      <div><h3 className="text-primary text-[14px] font-bold mb-2">Oyuncuya ne söyleyeceksin?</h3>
        <div className="transfer-replies" role="group" aria-label="Sözleşme görüşmesi cevapları">
          {TONES.map(({ value, label }) => {
            const line = managerRenewalLine(value, key);
            return <button type="button" key={value} className="transfer-reply" aria-pressed={tone === value} data-testid={`renewal-reply-${value}`}
              onClick={() => { setTone(value); setError(null); voice.play(line); }}>
              <span className="transfer-reply__tone block">{label}</span><span className="transfer-reply__label">“{line.text}”</span>
              <span className="transfer-reply__hint">{renewalToneHints(player.wage, value).join(' · ')}</span>
            </button>;
          })}
        </div>
      </div>
      <Btn variant="amber" testId="renewal-send" className="w-full" disabled={!tone || !canAfford} onClick={sendOffer}>Teklifi Oyuncuya Sun</Btn>
      <Btn variant="secondary" className="w-full" onClick={onClose}>Vazgeç · Değişiklik Yapma</Btn>
    </div>}

    {stage === 'response' && agreement && <div className="space-y-3">
      <div role="status" className={`rounded-xl border p-3 text-[13px] leading-relaxed ${agreement.quote.accepted ? 'border-ok/40 bg-ok/10 text-ok' : 'border-warn/40 bg-warn/10 text-warn'}`}>
        {agreement.quote.accepted ? `${player.name}, ₺${agreement.wage}B/ay teklifini kabul etti. Henüz imza atılmadı.` : `${player.name} bu teklifi kabul etmedi; bu görüşmede en az ₺${agreement.quote.demand}B/ay bekliyor.`}
      </div>
      {agreement.quote.accepted
        ? <Btn variant="amber" testId="renewal-review" className="w-full" onClick={() => { voice.play(signingReadyLine); setStage('review'); }}>Sözleşmeyi Gözden Geçir</Btn>
        : <Btn variant="amber" testId="renewal-match-demand" className="w-full" onClick={() => editOffer(true)}>Beklentiyi Teklife Taşı</Btn>}
      <Btn variant="secondary" testId="renewal-edit" className="w-full" onClick={() => editOffer()}>Teklifi Düzenle</Btn>
      <Btn variant="secondary" className="w-full" onClick={onClose}>Vazgeç · Değişiklik Yapma</Btn>
    </div>}

    {stage === 'review' && agreement && <div className="space-y-3">
      <div className="rounded-xl border border-line bg-surface p-3 space-y-3">
        <h3 className="font-display text-primary text-[17px] font-bold">İmza öncesi son kontrol</h3>
        <p className="text-secondary text-[12px]">{player.name} · {g.myClub.name}</p>
        {facts(agreement.quote)}
        <p className="text-muted text-[11px]">Maaş aylık bordroya yansır. İmza bonusu bir kez bütçeden düşer; onaylamadan hiçbir şey değişmez.</p>
      </div>
      <Btn variant="amber" testId="renewal-sign" className="w-full" onClick={sign}>Sözleşmeyi İmzala</Btn>
      <Btn variant="secondary" testId="renewal-review-edit" className="w-full" onClick={() => editOffer()}>Teklifi Düzenle</Btn>
      <Btn variant="secondary" className="w-full" onClick={onClose}>Vazgeç · Değişiklik Yapma</Btn>
    </div>}

    {stage === 'signed' && signed && <div className="space-y-3" data-testid="renewal-complete">
      <div className="rounded-xl border border-ok/40 bg-ok/10 p-3 space-y-3">
        <div className="text-ok font-display text-[18px] font-bold">{player.name} · sözleşme yenilendi</div>
        <p className="text-secondary text-[12px]">İmza atıldı; oyuncu kulüpte kalıyor.</p>
        {facts(signed, true)}
      </div>
      <Btn variant="amber" className="w-full" onClick={onClose}>Sözleşmelere Dön</Btn>
    </div>}
  </CinematicLayout>;
};
