import React, { useState } from 'react';
import type { Club, Player } from '../types';
import type { TrainingFocus } from '../data/training';
import { PlayerPortrait } from './assets/Portrait';
import { useReducedMotion } from './useReducedMotion';
import './trainingGround.css';

const DRILLS: Record<TrainingFocus['area'], { label: string; desc: string }> = {
  Teknik: { label: 'TOPLA SLALOM', desc: 'Top sürme ve koniler arasında kontrol' },
  Hücum: { label: 'ŞUT ÇALIŞMASI', desc: 'Hücum koşusu ve kaleye bitiriş' },
  Defans: { label: 'SAVUNMA HATTI', desc: 'Pozisyon alma ve topun önünü kapatma' },
  Fizik: { label: 'MEKİK KOŞUSU', desc: 'Tekrarlı koşu ve dayanıklılık' },
  Zekâ: { label: 'PAS ÜÇGENİ', desc: 'Pas seçenekleri ve saha görüşü' },
};
const average = (players: Player[], key: 'fitness' | 'form') => {
  const values = players.map((player) => player[key]).filter((n) => typeof n === 'number' && Number.isFinite(n));
  return values.length ? Math.round(values.reduce((sum, n) => sum + n, 0) / values.length) : null;
};
const value = (n: number | null | undefined) => typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : '—';
const intensityLabel = { hafif: 'Hafif', normal: 'Normal', yogun: 'Yoğun' } as const;
const duration = { hafif: '4.8s', normal: '3.2s', yogun: '2s' } as const;

const Trainee: React.FC<{ x: number; y: number; number: number; className: string; club: Club }> = ({ x, y, number, className, club }) => <g transform={`translate(${x} ${y})`}>
  <g className={`training-actor ${className}`}>
    <ellipse cx="0" cy="31" rx="17" ry="5" fill="#122d24" opacity=".35" />
    <g className="training-actor__legs" stroke="#dfd4bd" strokeWidth="5" strokeLinecap="round"><path d="M-6 16l-3 12" /><path d="M6 16l3 12" /></g>
    <path d="M-12 -7Q0 -13 12 -7L15 17H-15Z" fill={club.color1} stroke="#24382d" strokeWidth="1.5" />
    <path d="M-13 -3l-7 11M13 -3l7 11" fill="none" stroke={club.color2} strokeWidth="4" strokeLinecap="round" />
    <circle cy="-17" r="10" fill="#d7a17c" stroke="#5b4538" strokeWidth="1" /><path d="M-9 -20q8-10 18 0" fill="#463b34" />
    <text x="0" y="10" fill={club.color2} textAnchor="middle" fontSize="11" fontWeight="900">{number}</text>
  </g>
</g>;

export const TrainingGround: React.FC<{ club: Club; squad: Player[]; focus: TrainingFocus; level: number; reducedMotion: boolean }> = ({ club, squad, focus, level, reducedMotion }) => {
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion(reducedMotion);
  const available = squad.filter((player) => !(player.injuredDays > 0));
  const visible = available.slice(0, 3);
  const injured = squad.length - available.length;
  const drill = DRILLS[focus.area] ?? DRILLS.Teknik;
  const fit = average(squad, 'fitness'), form = average(squad, 'form');
  return <section className="training-ground" data-testid="training-ground" data-area={focus.area} data-intensity={focus.intensity} data-motion={reduce ? 'reduced' : paused ? 'paused' : 'full'} aria-label="Antrenman tesisi">
    <div className={`training-ground__stage${paused ? ' is-paused' : ''}${reduce ? ' is-reduced' : ''}`} style={{ '--drill-time': duration[focus.intensity] ?? '3.2s' } as React.CSSProperties}>
      <div className="training-ground__heading"><div><span>TESİS {level}/5 · {intensityLabel[focus.intensity]}</span><strong>{drill.label}</strong></div><div className="training-ground__badge">{club.short}</div></div>
      <svg className="training-ground__pitch" viewBox="0 0 640 250" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <rect width="640" height="250" fill="#456d51" /><path d="M0 25h640M0 75h640M0 125h640M0 175h640M0 225h640" stroke="#5c8563" strokeWidth="25" opacity=".45" />
        <path d="M18 13H622V237H18ZM320 13v224M320 75a50 50 0 1 0 0 100a50 50 0 1 0 0-100M18 72h65v106H18M622 72h-65v106h65" fill="none" stroke="#d8e2be" strokeWidth="2" opacity=".52" />
        <path d="M594 77h27v95h-27M594 77l-12 10v75l12 10" fill="#ebede1" fillOpacity=".13" stroke="#dbe5d0" strokeWidth="3" />
        <g className="training-props training-props--cones" fill="#e9aa56" stroke="#f6e7c2" strokeWidth="1.5">{[215, 275, 335, 395].map((x, i) => <path key={x} d={`M${x} ${i % 2 ? 171 : 115}l-8 16h16Z`} />)}</g>
        <g className="training-props training-props--lanes" stroke="#f1d394" strokeWidth="3" strokeDasharray="9 8"><path d="M105 100h400M105 180h400" /></g>
        <g className="training-props training-props--triangle" fill="none" stroke="#f1d394" strokeWidth="3" strokeDasharray="8 7"><path d="M145 162L320 65 470 158Z" /></g>
        <g className="training-props training-props--defence" fill="none" stroke="#f0d092" strokeWidth="4" strokeDasharray="8 8"><path d="M380 62v133" /></g>
        {visible[0] && <Trainee x={135} y={142} number={1} className="training-actor--one" club={club} />}
        {visible[1] && <Trainee x={310} y={82} number={2} className="training-actor--two" club={club} />}
        {visible[2] && <Trainee x={450} y={158} number={3} className="training-actor--three" club={club} />}
        {visible.length > 0 && <g transform="translate(170 170)"><g className="training-ground__ball"><circle r="8" fill="#f7f4e6" stroke="#28372f" strokeWidth="2" /><path d="M-3-3l6 1 1 5-5 3-4-5Z" fill="#354a3d" /></g></g>}
      </svg>
      <div className="training-ground__stage-caption">{drill.desc}</div>
    </div>
    <div className="training-ground__controls"><span>{reduce ? 'Azaltılmış hareket açık' : paused ? 'Canlandırma duraklatıldı' : 'Seçili odağın canlandırması'}</span><button type="button" onClick={() => setPaused((p) => !p)} disabled={reduce}>{paused ? 'Devam' : 'Durdur'}</button></div>
    <div className="training-ground__metrics"><div><strong>{value(fit)}</strong><span>KADRO KONDİSYONU</span></div><div><strong>{value(form)}</strong><span>KADRO FORMU</span></div><div><strong>{available.length}</strong><span>SAĞLIKLI OYUNCU</span></div></div>
    <div className="training-ground__roster"><b>SAHADAKİ OYUNCULAR</b>{visible.length ? visible.map((player, index) => <div key={player.id} className="training-ground__player" data-testid="training-player" data-player-id={player.id}>
      <span className="training-ground__number">{index + 1}</span><PlayerPortrait player={player} size={30} /><span className="training-ground__player-name">{player.name}</span><span>KON <b>{value(player.fitness)}</b><br />FORM <b>{value(player.form)}</b></span>
    </div>) : <p>Sahada gösterilecek sağlıklı oyuncu yok.</p>}</div>
    <p className="training-ground__note">{injured > 0 ? `${injured} sakat oyuncu sahne dışında. ` : ''}Canlandırma görseldir; seçili antrenman normal gününde işlenir.</p>
  </section>;
};
