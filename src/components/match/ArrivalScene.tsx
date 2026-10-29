import React, { useEffect, useRef, useState } from 'react';
import type { Club, Player } from '../../types';
import { useReducedMotion } from '../useReducedMotion';
import './arrivalScene.css';

const LENGTH = 14000;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const v = clamp(n); return v * v * (3 - 2 * v); };

const Fan: React.FC<{ x: number; y: number; index: number; color: string; trim: string }> = ({ x, y, index, color, trim }) => <g transform={`translate(${x} ${y})`}>
  <g className="arrival-fan" style={{ '--fan-delay': `${index * -.23}s` } as React.CSSProperties}>
    <circle cy="-13" r="7" fill={index % 3 === 0 ? '#e3b58c' : index % 3 === 1 ? '#c98e70' : '#ebc89e'} />
    <path d="M-9-4Q0-8 9-4L12 15H-12Z" fill={color} />
    <path d="M-8 0l-9-11M8 0l9-11" stroke={color} strokeWidth="5" strokeLinecap="round" />
    <path d="M-17-13Q0-10 17-13" fill="none" stroke={trim} strokeWidth="5" strokeLinecap="round" />
  </g>
</g>;
const Passenger: React.FC<{ x: number; y: number; club: Club; index: number; walking: boolean; playerId: string }> = ({ x, y, club, index, walking, playerId }) => <g data-testid="arrival-passenger" data-player-id={playerId} transform={`translate(${x} ${y})`}>
  <ellipse cy="24" rx="12" ry="3" fill="#102321" opacity=".35" />
  <g className={walking ? 'arrival-passenger is-walking' : 'arrival-passenger'} style={{ '--passenger-delay': `${index * -.25}s` } as React.CSSProperties}>
    <path className="arrival-passenger__legs" d="M-4 10l-4 12M4 10l4 12" fill="none" stroke="#263e43" strokeWidth="5" strokeLinecap="round" />
    <path d="M-10-5Q0-9 10-5l2 16h-24Z" fill={club.color1} stroke="#263a38" strokeWidth="1" />
    <path d="M-7 0H7" stroke={club.color2} strokeWidth="3" />
    <path d="M-10-2l-4 10M10-2l4 10" fill="none" stroke={club.color1} strokeWidth="4" strokeLinecap="round" />
    <circle cy="-14" r="7" fill={index === 1 ? '#b97858' : '#d9a57e'} /><path d="M-7-16q7-7 14 0" fill="#493c33" />
  </g>
</g>;

export const ArrivalScene: React.FC<{ home: Club; away: Club; team: Club; day: number; players: Player[]; reducedMotion: boolean }> = ({ home, away, team, day, players, reducedMotion }) => {
  const reduce = useReducedMotion(reducedMotion);
  const initial = reduce ? LENGTH : 0;
  const elapsedRef = useRef(initial);
  const [elapsed, setElapsed] = useState(initial);
  const [playing, setPlaying] = useState(!reduce);
  const setTime = (value: number) => { elapsedRef.current = value; setElapsed(value); };
  useEffect(() => {
    if (reduce) { elapsedRef.current = LENGTH; setElapsed(LENGTH); setPlaying(false); }
  }, [reduce]);
  useEffect(() => {
    if (!playing || reduce || typeof window.requestAnimationFrame !== 'function') return;
    const start = window.performance.now() - elapsedRef.current;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(LENGTH, Math.max(0, now - start));
      elapsedRef.current = next;
      setElapsed(next);
      if (next < LENGTH) frame = window.requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, reduce]);
  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => document.removeEventListener('visibilitychange', stopWhenHidden);
  }, []);
  const t = elapsed / LENGTH;
  const journey = smooth(t / .39);
  const busX = -260 + 370 * journey;
  const bob = t < .39 ? Math.sin(elapsed / 120) * 1.5 * (1 - journey) : 0;
  const door = smooth((t - .41) / .08);
  const stage = t < .2 ? 'Takım otobüsü yolda' : t < .4 ? 'Stadyum kapısına yaklaşıyor' : t < .5 ? 'Otobüs durdu, kapılar açılıyor' : t < .88 ? 'Oyuncular stadyuma yürüyor' : 'Takım stadyum girişinde';
  const shown = players.slice(0, 3);
  return <section className="arrival" data-testid="arrival-scene" data-motion={reduce ? 'reduced' : playing ? 'playing' : 'paused'} data-phase={stage} aria-label="Maç günü geliş sahnesi">
    <div className={`arrival__stage${!playing ? ' is-paused' : ''}${reduce ? ' is-reduced' : ''}`} style={{ '--arrival-primary': team.color1, '--arrival-trim': team.color2, '--stadium-primary': home.color1, '--stadium-trim': home.color2 } as React.CSSProperties}>
      <div className="arrival__heading"><div><span>MAÇ GÜNÜ · GÜN {day}</span><strong>{home.stadium}</strong></div><b>{team.short}</b></div>
      <svg viewBox="0 0 640 290" role="img" aria-label={`${team.name} takım otobüsü ${home.stadium} önünde`}>
        <rect width="640" height="290" fill="#b5d4cf" /><path d="M0 151L75 121l60 22 72-35 83 32 76-31 70 31 68-28 136 40v63H0Z" fill="#8eafa5" />
        <g fill="#749a90" opacity=".7"><rect x="8" y="92" width="35" height="75"/><rect x="50" y="108" width="26" height="62"/><rect x="96" y="90" width="25" height="80"/><rect x="161" y="112" width="30" height="58"/></g>
        <g className="arrival-cloud" fill="#f1f1df" opacity=".75"><ellipse cx="90" cy="45" rx="38" ry="10"/><ellipse cx="110" cy="37" rx="22" ry="12"/><ellipse cx="265" cy="56" rx="33" ry="9"/></g>
        <path d="M218 114Q408 47 616 114v89H218Z" fill="#718d86" stroke="#405f56" strokeWidth="3" />
        <path d="M207 118Q410 44 627 118l-7 14Q410 78 215 132Z" fill={home.color1} stroke="#35554c" strokeWidth="3" />
        <path d="M238 132Q410 87 600 132v50H238Z" fill="#dddfcc" /><path d="M242 133Q410 93 595 133" fill="none" stroke={home.color2} strokeWidth="7" />
        {[254, 293, 332, 371, 410, 449, 488, 527, 566].map((x) => <path key={x} d={`M${x} 132v48`} stroke="#94a99b" strokeWidth="4" />)}
        <rect x="485" y="143" width="72" height="65" rx="26" fill="#304a43" /><path d="M495 204v-34a26 26 0 0 1 52 0v34" fill="#1d3832" /><path d="M521 145v59" stroke="#78928a" strokeWidth="2" />
        <rect x="450" y="122" width="140" height="17" rx="4" fill="#f6e9cd" /><text x="520" y="134" textAnchor="middle" fill="#304a3d" fontSize="10" fontWeight="900">STADYUM GİRİŞİ</text>
        <g className="arrival-flags"><path d="M279 99V56M576 99V56" stroke="#516a5b" strokeWidth="3"/><path d="M280 58q15-7 30 0v15q-15-7-30 0Z" fill={home.color1}/><path d="M577 58q15-7 30 0v15q-15-7-30 0Z" fill={home.color2}/></g>
        <rect y="205" width="640" height="85" fill="#8c9890" /><path d="M0 208h640" stroke="#e5d7b6" strokeWidth="7"/><path d="M0 263h640" stroke="#e4dfc9" strokeWidth="3" strokeDasharray="35 25" opacity=".75" />
        <g opacity=".95">{Array.from({ length: 9 }, (_, i) => <Fan key={i} x={25 + i * 29} y={198 + (i % 2) * 3} index={i} color={team.color1} trim={team.color2} />)}</g>
        <path d="M0 218h276M0 229h276M15 214v19M75 214v19M135 214v19M195 214v19M255 214v19" fill="none" stroke="#d7d4c1" strokeWidth="4" />
        <g transform={`translate(${busX} ${bob})`} data-testid="arrival-bus" data-x={busX.toFixed(1)} data-door={door.toFixed(2)}>
          <ellipse cx="128" cy="250" rx="126" ry="9" fill="#263d38" opacity=".3" />
          <path d="M15 172Q24 164 41 164H209Q225 164 231 177l14 36v28H9v-55q0-9 6-14Z" fill={team.color1} stroke="#263b38" strokeWidth="3" />
          <path d="M13 214h230v19H13Z" fill={team.color2} opacity=".84" /><path d="M18 237h220" stroke="#263b38" strokeWidth="5" />
          <path d="M29 174h129v30H21v-21q0-9 8-9Z" fill="#315963" stroke="#243d40" strokeWidth="2" />
          {[54, 90, 126].map((x) => <path key={x} d={`M${x} 175v28`} stroke="#94b9b6" strokeWidth="2" />)}
          <path d="M190 174h19q10 0 14 12l6 18h-39Z" fill="#315963" stroke="#243d40" strokeWidth="2" />
          <path d="M205 177l13 25" stroke="#a9cecc" strokeWidth="2" opacity=".6" />
          <text x="94" y="226" fill="#182d2b" fontSize="12" fontWeight="900" textAnchor="middle">{team.short} · TAKIM OTOBÜSÜ</text>
          <rect x="161" y="172" width="25" height="65" rx="2" fill="#233c3b" />
          <rect x={164 - door * 9} y="174" width={9 - door * 7} height="59" rx="1" fill="#95b7b2" /><rect x={175 + door * 9} y="174" width={9 - door * 7} height="59" rx="1" fill="#95b7b2" />
          {door > .35 && <path d="M164 235h19l4 5h-27Z" fill="#d4c9a6" />}
          {[51, 197].map((x) => <g key={x} transform={`translate(${x} 241) rotate(${journey * 950})`}><circle r="15" fill="#253936" stroke="#bfc5af" strokeWidth="3" /><circle r="7" fill="#b7c1b4" /><path d="M-6 0H6M0-6V6" stroke="#4b645a" strokeWidth="2" /></g>)}
          <rect x="237" y="212" width="7" height="7" rx="2" fill="#ffedaa" className={t < .4 ? 'arrival-headlight' : ''} /><rect x="9" y="218" width="5" height="9" rx="1" fill={t >= .30 && t < .5 ? '#ff6957' : '#a74d41'} />
          {t > .30 && t < .48 && <circle className="arrival-indicator" cx="236" cy="226" r="3" fill="#ffd16c" />}
        </g>
        {shown.map((player, i) => {
          const walk = clamp((t - (.51 + i * .085)) / .27);
          if (walk <= 0) return null;
          return <Passenger key={player.id} playerId={player.id} x={busX + 174 + walk * (207 - i * 28)} y={218 + (i % 2) * 3 - Math.sin(walk * Math.PI) * 4} club={team} index={i} walking={walk < 1 && playing && !reduce} />;
        })}
        <g transform="translate(564 195)"><circle cy="-12" r="7" fill="#d3a17c"/><path d="M-9-3h18l2 20h-22Z" fill="#eac65f"/><path d="M-7 17l-2 8M7 17l2 8" stroke="#2b4140" strokeWidth="4"/></g>
        <path d="M580 228l7-17 7 17Z" fill="#db9254" stroke="#f7e4c2" strokeWidth="2" />
      </svg>
      <div className="arrival__stage-footer"><b>{stage}</b><span>{home.short} – {away.short}</span></div>
    </div>
    <div className="arrival__status" aria-live="polite"><strong>{stage}</strong><span>{team.name} · {home.stadium}</span></div>
    <label className="arrival__scrub"><span>Sahne zamanı</span><input type="range" min="0" max="1000" value={Math.round(t * 1000)} onChange={(event) => { setPlaying(false); setTime(Number(event.currentTarget.value) / 1000 * LENGTH); }} aria-label="Geliş sahnesi zamanı" /><small>{Math.round(t * 100)}%</small></label>
    <div className="arrival__controls"><button type="button" disabled={reduce || elapsed >= LENGTH} onClick={() => setPlaying((value) => !value)}>{playing ? 'Durdur' : 'Devam Et'}</button><button type="button" disabled={reduce} onClick={() => { setTime(0); setPlaying(true); }}>Yeniden Oynat</button></div>
    {shown.length > 0 && <p className="arrival__players"><b>SEÇİLİ İLK 11’DEN</b> {shown.map((player) => player.name).join(' · ')}</p>}
    <p className="arrival__note">{reduce ? 'Azaltılmış hareket açık; sahnenin son karesi gösteriliyor. ' : ''}Geliş sahnesi yalnızca görseldir. Maça geçişi sen başlatırsın.</p>
  </section>;
};
