import React from 'react';
import type { TransferLogEntry } from '../types';
import { clubByIdSafe } from '../data/clubs';
import { COMP_LABEL } from '../data/newsroom';
import type { WeeklyIssue, WeeklyMatch } from '../data/weeklyPaper';
import { Crest } from './assets/Crest';
import './weeklyPaper.css';

const clubName = (id: string) => clubByIdSafe(id)?.name ?? 'Kulüp bilgisi yok';
const clubShort = (id: string) => clubByIdSafe(id)?.short ?? '—';
const fromName = (transfer: TransferLogEntry) => transfer.kind === 'youth' ? 'Altyapı'
  : !transfer.fromClubId || transfer.fromClubId === 'FA' || transfer.fromClubId === 'free' ? 'Serbest oyuncu' : clubName(transfer.fromClubId);
const feeText = (fee: unknown) => typeof fee === 'number' && Number.isFinite(fee) && fee >= 0
  ? `₺${fee.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M` : '—';

function leadTitle(match: WeeklyMatch, myClubId: string): string {
  const myHome = match.homeId === myClubId;
  const own = myHome || match.awayId === myClubId;
  if (!own) return 'Haftanın skorları sahadan';
  const gf = myHome ? match.hg : match.ag, ga = myHome ? match.ag : match.hg;
  if (gf > ga) return 'Galibiyet manşette';
  if (gf < ga) return 'Mağlubiyet manşette';
  return 'Eşitlik manşette';
}

const ScoreLine: React.FC<{ match: WeeklyMatch }> = ({ match }) => <div className="paper-score-row" data-testid="weekly-score" data-match-id={match.id}>
  <span className="paper-score-row__date">Gün {match.day}<small>{COMP_LABEL[match.comp] ?? 'Maç'}</small></span>
  <span className="paper-score-row__teams">{clubName(match.homeId)} <span>—</span> {clubName(match.awayId)}</span>
  <strong className="paper-score-row__score">{match.hg}–{match.ag}</strong>
</div>;

const TransferLine: React.FC<{ transfer: TransferLogEntry }> = ({ transfer }) => <div className="paper-transfer-row" data-testid="weekly-transfer" data-transfer-id={transfer.id}>
  <div className="paper-transfer-row__date">GÜN {transfer.day} <span>{transfer.kind === 'youth' ? 'ALTYAPI' : transfer.kind === 'out' ? 'GİDEN' : 'GELEN'}</span></div>
  <strong>{transfer.playerName}</strong>
  <div>{fromName(transfer)} → {clubName(transfer.toClubId)}</div>
  <small>{transfer.kind === 'youth' ? 'Kayıtlı imza bedeli' : 'Kayıtlı transfer bedeli'}: {feeText(transfer.fee)}{transfer.exchangePlayerName ? ` · Takas: ${transfer.exchangePlayerName}` : ''}</small>
</div>;

export const WeeklyPaper: React.FC<{ issue: WeeklyIssue; myClubId: string }> = ({ issue, myClubId }) => {
  const { lead } = issue;
  const displayed = issue.matches.slice(0, 6);
  return <article className="weekly-paper" data-testid="weekly-paper" aria-label="Haftanın futbol gazetesi">
    <header className="weekly-paper__masthead">
      <div className="weekly-paper__edition"><span>HM26 · FUTBOL GAZETESİ</span><span>SEZON {issue.seasonNo} / GÜN {issue.toDay}</span></div>
      <div className="weekly-paper__name">SAHA <em>POSTASI</em></div>
      <div className="weekly-paper__strap"><span>SKOR · TRANSFER · FORM</span><span>GÜN {issue.fromDay}–{issue.toDay}</span></div>
    </header>

    <section className="weekly-paper__cover" aria-label="Haftanın manşeti">
      <div className="weekly-paper__cover-image" aria-hidden="true" />
      <div className="weekly-paper__cover-content">
        <span className="weekly-paper__eyebrow">HAFTANIN MANŞETİ · TEYİTLİ KAYIT</span>
        {lead.kind === 'match' ? <>
          <h2>{leadTitle(lead.match, myClubId)}</h2>
          <div className="weekly-paper__cover-score">
            <Crest club={clubByIdSafe(lead.match.homeId)} size={34} />
            <span>{clubShort(lead.match.homeId)}</span><strong>{lead.match.hg}–{lead.match.ag}</strong><span>{clubShort(lead.match.awayId)}</span>
            <Crest club={clubByIdSafe(lead.match.awayId)} size={34} />
          </div>
          <p>{clubName(lead.match.homeId)} — {clubName(lead.match.awayId)}<br />{COMP_LABEL[lead.match.comp] ?? 'Maç'} · Gün {lead.match.day}</p>
        </> : lead.kind === 'transfer' ? <>
          <h2>Transfer defteri açıldı</h2>
          <div className="weekly-paper__cover-transfer"><Crest club={clubByIdSafe(lead.transfer.toClubId)} size={39} /><strong>{lead.transfer.playerName}</strong></div>
          <p>{fromName(lead.transfer)} → {clubName(lead.transfer.toClubId)}<br />Gün {lead.transfer.day} · Kayıtlı bedel {feeText(lead.transfer.fee)}</p>
        </> : <>
          <h2>İlk haber bekleniyor</h2>
          <p>Bu aralıkta kayıtlı maç sonucu veya transfer yok. Yeni gelişmeler olduğunda gazete burada dolacak.</p>
        </>}
      </div>
    </section>

    <div className="weekly-paper__body">
      <div className="paper-section-heading"><span>01 / SAHADA</span><strong>Haftanın sonuçları</strong><b>{issue.matches.length} MAÇ</b></div>
      {issue.matches.length === 0 ? <p className="paper-empty">Bu gün aralığında kayıtlı, skoru belli bir maç yok.</p> : <>
        {displayed.map((match) => <ScoreLine key={match.id} match={match} />)}
        {issue.matches.length > displayed.length && <details className="paper-more"><summary>Diğer {issue.matches.length - displayed.length} sonucu göster</summary>{issue.matches.slice(displayed.length).map((match) => <ScoreLine key={match.id} match={match} />)}</details>}
      </>}

      <div className="paper-section-heading"><span>02 / PİYASADA</span><strong>Transfer defteri</strong><b>{issue.transfers.length} KAYIT</b></div>
      {issue.transfers.length === 0 ? <p className="paper-empty">Bu gün aralığında kulüp transfer kaydı yok.</p> : issue.transfers.map((transfer, index) => <TransferLine key={transfer.id || `${transfer.playerName}-${index}`} transfer={transfer} />)}

      <div className="paper-section-heading"><span>03 / KULÜBÜN</span><strong>Son maç formu</strong><b>BU SEZON</b></div>
      {issue.form.length === 0 ? <p className="paper-empty">Bu sezon takımın için kayıtlı sonuç henüz yok.</p> : <>
        <div className="paper-form" aria-label="Takımın bu sezon son beş maçının kaydedilmiş skorları">
          {issue.form.map((match) => <div key={match.id} className={`paper-form__item paper-form__item--${match.result}`} title={`${clubName(match.homeId)} ${match.hg}–${match.ag} ${clubName(match.awayId)} · Gün ${match.day}`}>
            <b>{match.result}</b><small>{match.homeId === myClubId ? clubShort(match.awayId) : clubShort(match.homeId)}</small><span>{match.hg}–{match.ag}</span>
          </div>)}
        </div>
        <p className="paper-caption">En fazla son 5 karşılaşmanın kayıtlı skoru, eskiden yeniye. G: galibiyet · B: beraberlik · M: mağlubiyet. Penaltı atışları skor şeridine dahil değildir.</p>
      </>}
      {issue.crossesUnknownSeasonBoundary && <p className="paper-boundary" data-testid="weekly-boundary-note">Önceki sezonun bitiş günü kaydedilmediğinden bu sayı yalnızca yeni sezonun {issue.toDay} gününü kapsar; önceki sezon kayıtları tahminle eklenmez.</p>}
      {!issue.crossesUnknownSeasonBoundary && issue.toDay < 7 && <p className="paper-boundary">Kariyerin başlangıcından bu yana {issue.toDay} gün kapsanıyor.</p>}
      <p className="paper-footer">Yalnız kayıtlı sonuçlar ve transferler · Oyun motorunu etkilemez</p>
    </div>
  </article>;
};
