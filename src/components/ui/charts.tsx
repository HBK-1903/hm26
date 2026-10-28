// HM26 — Mini grafik bileşenleri. Yalnız gerçek verilmiş noktaları çizer;
// tek nokta veya boş dizide dürüst empty state gösterilir, uydurma çizgi yok.
import React from 'react';
import type { XgTrendPoint } from '../../engine/teamInsights';

const W = 300;
const H = 96;
const PAD_X = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 18;

const ratingColor = (r: number) => (r >= 8 ? 'var(--c-ok, #6fbf73)' : r >= 7 ? '#f59e0b' : r >= 6.2 ? 'var(--c-info, #5eb6d6)' : 'var(--c-danger, #e07a6b)');

/** Oyuncunun son maç reytingleri için tek serili mini çizgi (en eski → en yeni). */
export const RatingSparkline: React.FC<{ ratings: number[] }> = ({ ratings }) => {
  if (!ratings.length) {
    return <div className="h-[96px] flex items-center justify-center text-muted text-[10.5px]">Reyting verisi birikince çizgi belirir</div>;
  }
  const lo = Math.min(...ratings);
  const hi = Math.max(...ratings);
  // Sabit bant: tek değerli/çok dar aralıklarda anlamlı ölçek kalsın
  const min = Math.max(4, lo - 0.4);
  const max = Math.min(10, hi + 0.4);
  const span = Math.max(0.8, max - min);
  const x = (i: number) => (ratings.length === 1 ? W / 2 : PAD_X + (i / (ratings.length - 1)) * (W - PAD_X * 2));
  const y = (v: number) => H - PAD_BOTTOM - ((v - min) / span) * (H - PAD_TOP - PAD_BOTTOM);
  const line = ratings.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Son ${ratings.length} maç reytingi: ${ratings.map((r) => r.toFixed(1)).join(', ')}`}>
      <line x1={PAD_X} x2={W - PAD_X} y1={y(7)} y2={y(7)} stroke="var(--c-line, #33403a)" strokeWidth="0.6" strokeDasharray="3 3" />
      <text x={W - PAD_X} y={y(7) - 2} textAnchor="end" fontSize="7" fill="var(--c-muted, #8a968d)">7.0 eşiği</text>
      {ratings.length > 1 && <polyline points={line} fill="none" stroke="var(--c-amber, #d3a64b)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      {ratings.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3.2" fill={ratingColor(v)} stroke="#111b16" strokeWidth="0.8" />
          <text x={x(i)} y={H - 5} textAnchor="middle" fontSize="7.5" fill="var(--c-muted, #8a968d)">{v.toFixed(1)}</text>
        </g>
      ))}
    </svg>
  );
};

/** Takımın maç maç xG (beklenen) ve gerçek gol performansı. */
export const XgTrendChart: React.FC<{ points: XgTrendPoint[]; oppShort: (id: string) => string }> = ({ points, oppShort }) => {
  if (points.length < 2) {
    return <div className="h-[96px] flex items-center justify-center text-muted text-[10.5px]">En az iki maç oynanınca trend çizgisi belirir</div>;
  }
  const maxV = Math.max(1, ...points.flatMap((p) => [p.xgf, p.gf, p.xga, p.ga]));
  const x = (i: number) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const y = (v: number) => H - PAD_BOTTOM - (v / maxV) * (H - PAD_TOP - PAD_BOTTOM);
  const poly = (key: keyof Pick<XgTrendPoint, 'xgf' | 'gf' | 'xga' | 'ga'>) =>
    points.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const series: { key: keyof Pick<XgTrendPoint, 'xgf' | 'gf' | 'xga' | 'ga'>; label: string; color: string; dash?: string }[] = [
    { key: 'xgf', label: 'Beklenen gol (xG)', color: '#d3a64b' },
    { key: 'gf', label: 'Atılan gol', color: 'var(--c-ok, #6fbf73)' },
    { key: 'xga', label: 'Beklenen yenilen (xGA)', color: '#7d8fa3' },
    { key: 'ga', label: 'Yenilen gol', color: 'var(--c-danger, #e07a6b)' },
  ];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Maç maç xG ve gol trendi, ${points.length} maç`}>
        {[0, 0.5, 1].filter((v) => v <= maxV).map((v) => (
          <g key={v}>
            <line x1={PAD_X} x2={W - PAD_X} y1={y(v)} y2={y(v)} stroke="var(--c-line, #33403a)" strokeWidth="0.6" strokeDasharray="3 3" />
            <text x={W - PAD_X} y={y(v) - 2} textAnchor="end" fontSize="7" fill="var(--c-muted, #8a968d)">{v}</text>
          </g>
        ))}
        {series.map((s) => (
          <polyline key={s.key} points={poly(s.key)} fill="none" stroke={s.color} strokeWidth={s.key === 'xgf' || s.key === 'gf' ? 2 : 1.4}
            strokeDasharray={s.key === 'xga' || s.key === 'ga' ? '4 3' : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={H - 5} textAnchor="middle" fontSize="7" fill="var(--c-muted, #8a968d)">
            {`${p.isHome ? '' : 'D'}${oppShort(p.oppClubId)?.slice(0, 4) ?? ''}`}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[9.5px] font-bold text-secondary">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: s.color }} />{s.label}
          </span>
        ))}
      </div>
    </div>
  );
};
