import React, { useEffect, useMemo, useState } from 'react';
import type { Club } from '../../types';
import type { DemoMatchEvent } from '../../store/game';
import { makeHighlightReel, type HighlightKind } from '../../engine/highlights';
import { Crest } from '../assets/Crest';
import './matchHighlights.css';

const LABELS: Record<HighlightKind, string> = {
  goal: 'GOL', chance: 'POZİSYON', save: 'KURTARIŞ', card: 'KART', sub: 'DEĞİŞİKLİK', injury: 'SAKATLIK', var: 'VAR',
};
const SYMBOLS: Record<HighlightKind, string> = { goal: '●', chance: '◆', save: '◈', card: '▣', sub: '↔', injury: '+', var: '▧' };

/** User-controlled replay of the engine's recorded facts, not a second simulation. */
export const MatchHighlights: React.FC<{
  home: Club; away: Club; homeGoals: number; awayGoals: number;
  events: readonly DemoMatchEvent[]; archived?: boolean; reduceMotion?: boolean;
}> = ({ home, away, homeGoals, awayGoals, events, archived = false, reduceMotion = false }) => {
  const reel = useMemo(() => makeHighlightReel(events, homeGoals, awayGoals, { homeId: home.id, awayId: away.id }), [events, homeGoals, awayGoals, home.id, away.id]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const selected = reel.moments[Math.min(index, reel.moments.length - 1)];
  const last = reel.moments.length - 1;

  useEffect(() => { setIndex(0); setPlaying(false); }, [reel]);
  useEffect(() => {
    if (!playing) return;
    if (index >= last) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setIndex((i) => Math.min(i + 1, last)), 2600);
    return () => window.clearTimeout(timer);
  }, [index, last, playing]);
  const goTo = (next: number) => { setPlaying(false); setIndex(Math.max(0, Math.min(last, next))); };
  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (index >= last) setIndex(0);
    setPlaying(true);
  };
  const score = selected?.score;
  const team = selected?.side === 'home' ? home : selected?.side === 'away' ? away : null;
  const coordinates = selected?.path;
  const points = coordinates?.map((point) => `${point.x},${point.y}`).join(' ') ?? '';

  return <section className="highlights" data-testid="match-highlights" data-playing={playing ? 'true' : 'false'} data-reduce-motion={reduceMotion ? 'true' : 'false'}>
    <div className="highlights__stage" data-testid="highlights-stage">
      <div className="highlights__stage-shade" />
      <div className="highlights__topline"><span>HM26 · MAÇ ÖZETİ</span><span>{selected ? `${selected.minute}′` : 'MAÇ SONU'}</span></div>
      <div className="highlights__scoreboard" data-testid="highlights-score">
        <div className="highlights__team"><Crest club={home} size={26} /><span>{home.short}</span></div>
        <div className="highlights__score"><small>{score ? 'OLAY ANI' : 'MAÇ SONU'}</small><strong>{score ? score.home : homeGoals}–{score ? score.away : awayGoals}</strong></div>
        <div className="highlights__team highlights__team--away"><span>{away.short}</span><Crest club={away} size={26} /></div>
      </div>
      <div className="highlights__pitch">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={coordinates ? 'Bu olayda kaydedilen top yolu' : 'Bu olay için konum kaydı yok'}>
          <defs><linearGradient id="highlight-pitch" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#33724c" /><stop offset="1" stopColor="#174a38" /></linearGradient></defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#highlight-pitch)" />
          {[0, 20, 40, 60, 80].map((y) => <rect key={y} x="0" y={y} width="100" height="10" fill="#ffffff" opacity=".045" />)}
          <g fill="none" stroke="#d9f1df" strokeWidth=".7" opacity=".8">
            <rect x="3" y="3" width="94" height="94" /><line x1="3" y1="50" x2="97" y2="50" /><circle cx="50" cy="50" r="11" />
            <rect x="29" y="3" width="42" height="16" /><rect x="38" y="3" width="24" height="6" />
            <rect x="29" y="81" width="42" height="16" /><rect x="38" y="91" width="24" height="6" />
          </g>
          {coordinates && <g key={index} className="highlights__route" data-testid="highlights-route" data-points={points}>
            {coordinates.length > 1 && <polyline points={points} fill="none" stroke="#0b241b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity=".65" />}
            {coordinates.length > 1 && <polyline className="highlights__route-line" points={points} fill="none" stroke={selected?.pathSide === 'away' ? '#83d8ff' : '#ffde7e'} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" pathLength="100" />}
            {coordinates.map((point, i) => <circle key={i} cx={point.x} cy={point.y} r={i === coordinates.length - 1 ? 2.5 : 1.25} fill={i === coordinates.length - 1 ? '#fff' : selected?.pathSide === 'away' ? '#83d8ff' : '#ffde7e'} stroke="#123927" strokeWidth=".65" />)}
          </g>}
        </svg>
      </div>
      {selected && <div className="highlights__stage-label"><span>{LABELS[selected.kind]}</span><b>{team?.short ?? 'TAKIM BİLGİSİ YOK'}</b></div>}
    </div>

    {archived && <p className="highlights__note">Arşivde olay türü ve dakika saklanır; özgün anlatım ve konum kaydı saklanmaz.</p>}
    {!reel.scoreIsComplete && <p className="highlights__note" data-testid="highlights-score-note">Gol olayları sonuçla tam eşleşmediği için yalnız maç sonu skoru gösteriliyor.</p>}
    {!selected ? <div className="highlights__empty" data-testid="highlights-empty">Bu maç için gösterilebilecek olay kaydı yok.</div> : <>
      <div className="highlights__event" data-testid="highlight-event" data-acting-side={selected.side ?? 'unknown'} data-path-side={selected.pathSide ?? 'unknown'} aria-live="polite">
        <div className="highlights__event-meta"><span>{selected.minute}′ · {LABELS[selected.kind]}</span><span>{team?.name ?? 'Takım bilgisi yok'}</span></div>
        <p>{selected.text}</p>
        {selected.kind === 'save' && coordinates && selected.pathSide && <div className="highlights__missing" data-testid="highlight-attacking-route">Top yolu: {selected.pathSide === 'home' ? home.name : away.name} hücumu.</div>}
        {!coordinates && <div className="highlights__missing" data-testid="highlight-no-position">Bu anın konum kaydı yok.</div>}
      </div>
      <div className="highlights__controls" role="group" aria-label="Özet oynatma kontrolleri">
        <button type="button" data-testid="highlight-previous" disabled={index === 0} onClick={() => goTo(index - 1)} aria-label="Önceki olay">‹ <span>Önceki</span></button>
        <button type="button" data-testid="highlight-play" className="highlights__play" disabled={last <= 0} onClick={togglePlay} aria-label={playing ? 'Özeti duraklat' : index >= last && last > 0 ? 'Özeti baştan oynat' : 'Özeti oynat'}>{playing ? 'Ⅱ Duraklat' : index >= last && last > 0 ? '▶ Baştan' : '▶ Oynat'}</button>
        <button type="button" data-testid="highlight-next" disabled={index >= last} onClick={() => goTo(index + 1)} aria-label="Sonraki olay"><span>Sonraki</span> ›</button>
      </div>
      <div className="highlights__timeline-label"><span>MAÇIN ANLARI</span><span>{index + 1} / {reel.moments.length}</span></div>
      <div className="highlights__timeline" role="group" aria-label="Öne çıkan olaylar">
        {reel.moments.map((moment, i) => <button type="button" key={i} data-testid="highlight-timeline-item" aria-pressed={i === index}
          aria-label={`${moment.minute}. dakika ${LABELS[moment.kind]}${moment.side ? ` ${moment.side === 'home' ? home.short : away.short}` : ''}`}
          onClick={() => goTo(i)}><b>{SYMBOLS[moment.kind]}</b><span>{moment.minute}′</span></button>)}
      </div>
      <p className="highlights__note">Saha çizimi yalnızca maç motorunun kaydettiği bölgeleri gösterir. Oynatma sen başlatmadıkça ilerlemez.</p>
    </>}
  </section>;
};
