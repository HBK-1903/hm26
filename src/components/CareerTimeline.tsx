import React, { useMemo, useState } from 'react';
import type { Career, MatchArchiveEntry, TransferLogEntry } from '../types';
import { buildCareerTimeline, type CareerMoment } from '../data/careerTimeline';
import { clubByIdSafe } from '../data/clubs';
import { COMP_LABEL } from '../data/newsroom';
import './careerTimeline.css';

type Filter = 'all' | CareerMoment['kind'];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' }, { id: 'trophy', label: 'Kupalar' },
  { id: 'match', label: 'Maçlar' }, { id: 'transfer', label: 'Transferler' },
];
const clubName = (id: string | null) => !id || id === 'FA' || id === 'free' ? 'Serbest oyuncu' : clubByIdSafe(id)?.name ?? 'Kulüp bilgisi yok';
const feeText = (fee: unknown) => typeof fee === 'number' && Number.isFinite(fee) && fee >= 0
  ? `₺${fee.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M` : 'Bedel kaydı yok';

const Moment: React.FC<{ moment: CareerMoment; unknownSeason?: boolean }> = ({ moment, unknownSeason }) => {
  const when = moment.kind === 'trophy' ? 'Günü kaydedilmedi' : `Gün ${moment.day}${unknownSeason ? ' · Sezon bilgisi yok' : ''}`;
  return <li className={`career-moment career-moment--${moment.kind}`} data-testid="career-moment" data-moment-kind={moment.kind}>
    <span className="career-moment__marker" aria-hidden="true">{moment.kind === 'trophy' ? '★' : moment.kind === 'match' ? '●' : '↗'}</span>
    <div className="career-moment__card">
      <div className="career-moment__date">{when} <span>{moment.kind === 'trophy' ? 'BAŞARI' : moment.kind === 'match' ? moment.reason.toLocaleUpperCase('tr-TR') : moment.transfer.kind === 'youth' ? 'ALTYAPI' : moment.transfer.kind === 'out' ? 'GİDEN TRANSFER' : 'GELEN TRANSFER'}</span></div>
      {moment.kind === 'trophy' && <><strong>{moment.trophy.title}</strong><p>{moment.trophy.season || 'Sezon bilgisi yok'}</p></>}
      {moment.kind === 'match' && <><strong>{clubName(moment.report.homeId)} <b>{moment.report.hg}–{moment.report.ag}</b> {clubName(moment.report.awayId)}</strong><p>{COMP_LABEL[moment.report.comp] ?? 'Kayıtlı maç'}</p></>}
      {moment.kind === 'transfer' && <><strong>{moment.transfer.playerName}</strong><p>{moment.transfer.kind === 'youth' ? 'Altyapı' : clubName(moment.transfer.fromClubId)} → {clubName(moment.transfer.toClubId)}</p><small>{feeText(moment.transfer.fee)}{moment.transfer.exchangePlayerName ? ` · Takas: ${moment.transfer.exchangePlayerName}` : ''}</small></>}
    </div>
  </li>;
};

export const CareerTimeline: React.FC<{
  seasonNo: number; day: number; reports?: readonly MatchArchiveEntry[]; transfers?: readonly TransferLogEntry[];
  trophies?: Career['trophyCabinet'];
}> = (props) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState(false);
  const timeline = useMemo(() => buildCareerTimeline(props), [props.seasonNo, props.day, props.reports, props.transfers, props.trophies]);
  const accepts = (moment: CareerMoment) => filter === 'all' || moment.kind === filter;
  const count = timeline.chapters.reduce((n, chapter) => n + chapter.dated.filter(accepts).length + chapter.undated.filter(accepts).length, 0) + timeline.unplaced.filter(accepts).length;
  let remaining = expanded ? Number.POSITIVE_INFINITY : 12;
  const chapters = timeline.chapters.map((chapter) => {
    const dated = chapter.dated.filter(accepts).slice(0, remaining); remaining -= dated.length;
    const undated = chapter.undated.filter(accepts).slice(0, remaining); remaining -= undated.length;
    return { ...chapter, dated, undated };
  }).filter((chapter) => chapter.dated.length || chapter.undated.length);
  const unplaced = timeline.unplaced.filter(accepts).slice(0, remaining);
  return <section className="career-story" data-testid="career-timeline" aria-label="Kariyer hikâyesi">
    <header className="career-story__header">
      <span>HM26 · KARİYER ARŞİVİ</span>
      <h2>Kariyer <em>Hikâyesi</em></h2>
      <p>Maçlar, transferler ve kazanılan kupalar. Hepsi kendi kariyerinden.</p>
    </header>
    <div className="career-story__filters" role="group" aria-label="Kariyer hikâyesi filtresi">
      {FILTERS.map(({ id, label }) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => { setFilter(id); setExpanded(false); }}>{label}</button>)}
    </div>
    {!count ? <p className="career-story__empty">{timeline.total ? 'Bu bölümde henüz kayıt yok.' : 'Henüz hikâyeye eklenmiş bir maç, transfer veya kupa yok. Kariyer ilerledikçe burada görünecek.'}</p> : <div className="career-story__chapters">
      {chapters.map((chapter) => <section className="career-chapter" key={chapter.seasonNo}>
        <h3><span>SEZON</span> {chapter.label}</h3>
        {chapter.dated.length > 0 && <ol className="career-chapter__list">{chapter.dated.map((moment) => <Moment key={moment.key} moment={moment} />)}</ol>}
        {chapter.undated.length > 0 && <div className="career-chapter__unknown"><p>Bu başarıların günü kaydedilmedi; diğer olaylarla kesin sırası bilinmiyor.</p><ol className="career-chapter__list">{chapter.undated.map((moment) => <Moment key={moment.key} moment={moment} />)}</ol></div>}
      </section>)}
      {unplaced.length > 0 && <section className="career-chapter"><h3>Sezonu bilinmeyen kayıtlar</h3><p className="career-chapter__disclaimer">Sezon kaydı olmadığı için bu olaylar diğer sezonlarla sıralanmıyor.</p><ol className="career-chapter__list">{unplaced.map((moment) => <Moment key={moment.key} moment={moment} unknownSeason />)}</ol></section>}
      {!expanded && count > 12 && <button type="button" className="career-story__more" onClick={() => setExpanded(true)}>Tüm kayıtları göster · {count}</button>}
      {expanded && count > 12 && <button type="button" className="career-story__more" onClick={() => setExpanded(false)}>Daha az göster</button>}
    </div>}
    <footer>Öne çıkan maçlar ile en eski ve en yeni arşiv kaydı gösterilir. Maç arşivi son 256 karşılaşmayla sınırlıdır.</footer>
  </section>;
};
