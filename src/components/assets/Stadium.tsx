// HM26 — özgün vektör stadyum/şehir silüeti (kulüp renkleriyle tonlanır)
import React from 'react';
import { Club } from '../../types';

export const StadiumArt: React.FC<{ club: Club; className?: string }> = ({ club, className }) => {
  const c1 = club.color1; const c2 = club.color2;
  return (
    <svg viewBox="0 0 360 150" className={className} role="img" aria-label={`${club.stadium} illüstrasyonu`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`sky-${club.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A1B2C" /><stop offset="1" stopColor="#122238" />
        </linearGradient>
        <linearGradient id={`beam-${club.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} stopOpacity="0.35" /><stop offset="1" stopColor={c1} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="360" height="150" fill={`url(#sky-${club.id})`} />
      {/* projektör hüzmeleri */}
      <path d="M60 14 L10 130 h100 Z" fill={`url(#beam-${club.id})`} />
      <path d="M300 14 L250 130 h100 Z" fill={`url(#beam-${club.id})`} opacity="0.8" />
      {/* şehir silüeti */}
      <g fill="#182C43">
        <rect x="8" y="86" width="18" height="44" /><rect x="30" y="96" width="14" height="34" />
        <rect x="48" y="78" width="16" height="52" /><rect x="296" y="88" width="18" height="42" />
        <rect x="318" y="74" width="14" height="56" /><rect x="336" y="94" width="16" height="36" />
      </g>
      {/* stadyum kase */}
      <path d="M52 118 Q180 84 308 118 L308 130 L52 130 Z" fill="#0E1A2B" />
      <path d="M52 118 Q180 84 308 118" fill="none" stroke={c1} strokeWidth="2.4" opacity="0.95" />
      <path d="M64 119 Q180 92 296 119" fill="none" stroke={c2} strokeWidth="1.2" opacity="0.6" />
      {/* tribün noktaları */}
      <g fill={c1} opacity="0.5">{Array.from({ length: 22 }).map((_, i) => (
        <circle key={i} cx={72 + i * 10.2} cy={120.5 + Math.sin(i / 3) * 1.4} r="1.1" />
      ))}</g>
      {/* projektör direkleri */}
      <g stroke="#24384F" strokeWidth="3"><path d="M60 14 v104" /><path d="M300 14 v104" /></g>
      <g fill="#F3F1EA"><rect x="48" y="8" width="24" height="9" rx="3" /><rect x="288" y="8" width="24" height="9" rx="3" /></g>
      <g fill={c2} opacity="0.9"><circle cx="54" cy="12.5" r="1.6" /><circle cx="60" cy="12.5" r="1.6" /><circle cx="66" cy="12.5" r="1.6" /><circle cx="294" cy="12.5" r="1.6" /><circle cx="300" cy="12.5" r="1.6" /><circle cx="306" cy="12.5" r="1.6" /></g>
    </svg>
  );
};

export const KitDot: React.FC<{ color1: string; color2: string; size?: number; label?: string }> = ({ color1, color2, size = 34, label }) => (
  <svg viewBox="0 0 34 42" width={size} height={size * 1.235} role="img" aria-label="forma işareti">
    <path d="M10 8 L5 12 L3 20 L8 21 L10 17 V38 H24 V17 L26 21 L31 20 L29 12 L24 8 L20 8 C20 11 14 11 14 8 Z" fill={color1} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
    <rect x="10" y="24" width="14" height="4" fill={color2} opacity="0.9" />
    {label && <text x="17" y="35.4" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight="bold" fontSize="9" fill={color2}>{label}</text>}
  </svg>
);
