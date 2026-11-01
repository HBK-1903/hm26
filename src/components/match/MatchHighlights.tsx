import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Club } from '../../types';
import type { DemoMatchEvent } from '../../store/game';
import { makeHighlightReel, type HighlightKind } from '../../engine/highlights';
import { Crest } from '../assets/Crest';
import { useReducedMotion } from '../useReducedMotion';
import { pointOnHighlightPath, type HighlightPoint } from './highlightMotion';
import './matchHighlights.css';

const LABELS: Record<HighlightKind, string> = {
  goal: 'GOL', chance: 'POZİSYON', save: 'KURTARIŞ', card: 'KART', sub: 'DEĞİŞİKLİK', injury: 'SAKATLIK', var: 'VAR',
};
const SYMBOLS: Record<HighlightKind, string> = { goal: '●', chance: '◆', save: '◈', card: '▣', sub: '↔', injury: '+', var: '▧' };

const ROUTE_DURATION_MS = 1500;

/** A visual trace of saved zones. Pause freezes both the line and the marker. */
const HighlightRoute: React.FC<{ path: HighlightPoint[]; color: string; playing: boolean; reduced: boolean }> = ({ path, color, playing, reduced }) => {
  const [progress, setProgress] = useState(playing && !reduced && path.length > 1 ? 0 : 1);
  const progressRef = useRef(0);
  const started = useRef(false);
  useEffect(() => {
    if (reduced) { progressRef.current = 1; setProgress(1); return; }
    if (!playing || path.length < 2) return;
    if (!started.current) { started.current = true; progressRef.current = 0; setProgress(0); }
    if (progressRef.current >= 1) return;
    const start = window.performance.now() - progressRef.current * ROUTE_DURATION_MS;
    let frame = 0;
    let lastPaint = 0;
    const tick = (now: number) => {
      const next = Math.min(1, Math.max(0, (now - start) / ROUTE_DURATION_MS));
      progressRef.current = next;
      // Thirty updates a second are enough for this small diagram on a phone.
      if (now - lastPaint >= 32 || next === 1) { setProgress(next); lastPaint = now; }
      if (next < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, reduced, path.length]);
  const shown = reduced ? 1 : progress;
  const marker = pointOnHighlightPath(path, shown);
  const points = path.map((point) => `${point.x},${point.y}`).join(' ');
  return <g className="highlights__route" data-testid="highlights-route" data-points={points} data-progress={shown.toFixed(3)}>
    {path.length > 1 && <polyline points={points} fill="none" stroke="#0b241b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity=".65" />}
    {path.length > 1 && <polyline className="highlights__route-line" points={points} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - shown)} />}
    {path.map((point, i) => <circle key={i} cx={point.x} cy={point.y} r={i === path.length - 1 ? 2.5 : 1.25} fill={i === path.length - 1 ? '#fff' : color} stroke="#123927" strokeWidth=".65" />)}
    {marker && <g className="highlights__route-ball" data-testid="highlight-ball" data-x={marker.x.toFixed(3)} data-y={marker.y.toFixed(3)} transform={`translate(${marker.x} ${marker.y})`}>
      <circle r="2.4" fill="#fff8e8" stroke="#182e23" strokeWidth=".6" /><path d="M-1-1 1-.9 1 .7 0 1.3 -1 .5Z" fill="#294238" />
    </g>}
  </g>;
};

/** User-controlled replay of the engine's recorded facts, not a second simulation. */
export const MatchHighlights: React.FC<{
  home: Club; away: Club; homeGoals: number; awayGoals: number;
  events: readonly DemoMatchEvent[]; archived?: boolean; reduceMotion?: boolean;
}> = ({ home, away, homeGoals, awayGoals, events, archived = false, reduceMotion = false }) => {
  const reduced = useReducedMotion(reduceMotion);
  const reel = useMemo(() => makeHighlightReel(events, homeGoals, awayGoals, { homeId: home.id, awayId: away.id }), [events, homeGoals, awayGoals, home.id, away.id]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const selected = reel.moments[Math.min(index, reel.moments.length - 1)];
  const last = reel.moments.length - 1;

  useEffect(() => { setIndex(0); setPlaying(false); }, [reel]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (!playing) return;
    // Let the final recorded route finish before stopping; never leave the screen.
    const timer = index >= last
      ? window.setTimeout(() => setPlaying(false), ROUTE_DURATION_MS + 200)
      : window.setTimeout(() => setIndex((i) => Math.min(i + 1, last)), 2600);
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

  return <section className="highlights" data-testid="match-highlights" data-playing={playing ? 'true' : 'false'} data-reduce-motion={reduced ? 'true' : 'false'}>
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
          {coordinates && <HighlightRoute key={`${index}:${coordinates.map((p) => `${p.x},${p.y}`).join(';')}`} path={coordinates} color={selected?.pathSide === 'away' ? '#83d8ff' : '#ffde7e'} playing={playing} reduced={reduced} />}
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
      <p className="highlights__note">Topun çizimi yalnızca kaydedilen bölgeler arasındaki temsili rotadır. Oynatma sen başlatmadıkça ilerlemez; maçın sonucunu değiştirmez.</p>
    </>}
  </section>;
};
