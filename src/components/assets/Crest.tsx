// HM26 — kulüp arması: gömülü PNG (assets-inbox paketi, v0.9.8) varsa <img>, yoksa özgün geometrik SVG fallback (§2.3 lisans ilkesine tam uyumlu)
import React from 'react';
import { Club } from '../../types';
import { CREST_FULL, CREST_COMPACT, crestSrc } from '../../data/assetManifest';

const SHAPES = ['shield', 'diamond', 'circle', 'hex'] as const;
function shapeFor(id: string): (typeof SHAPES)[number] {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SHAPES[h % SHAPES.length];
}

export const Crest: React.FC<{ club: Club | null | undefined; size?: number; className?: string; variant?: 'compact' | 'full' }> = ({ club, size = 40, className, variant = 'compact' }) => {
  // Görseller statik listeden bilinir; yüklenemezse (bozuk kayıt vb.) prosedürel çizime düşer
  const [imgFailed, setImgFailed] = React.useState(false);
  React.useEffect(() => { setImgFailed(false); }, [club?.id, variant]);
  const hasPng = !!club?.id && (variant === 'full' ? CREST_FULL[club.id] : CREST_COMPACT[club.id]);
  // FIX P0: kayıpta bulunamayan kulüp (ör. serbest oyuncu clubId:"free") çökmez — yer tutucu çizer
  if (club && club.color1 && hasPng && !imgFailed) {
    return (
      <img
        src={crestSrc(club.id, variant)}
        width={size} height={size} alt={`${club.name} arması`} draggable={false}
        loading="lazy" decoding="async"
        onError={() => setImgFailed(true)}
        className={`shrink-0 select-none object-contain ${variant === 'compact' ? 'rounded-full' : 'rounded-xl'} ${className ?? ''}`}
      />
    );
  }
  // FIX P0: kayıpta bulunamayan kulüp (ör. serbest oyuncu clubId:"free") çökmez — yer tutucu çizer
  if (!club || !club.color1) {
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="Serbest oyuncu"
           className={`shrink-0 ${className ?? ''}`}>
        <circle cx="32" cy="32" r="30" fill="var(--c-elevated)" stroke="var(--c-line)" strokeWidth="2" strokeDasharray="4 4" />
        <text x="32" y="38" textAnchor="middle" fill="#9CADBA" fontSize="18" fontFamily="ui-monospace, monospace">SV</text>
      </svg>
    );
  }
  const shape = shapeFor(club.id);
  const c1 = club.color1; const c2 = club.color2; const c3 = club.color3 ?? '';
  // v0.9.6: sabit liste yerine WCAG göreli parlaklık — logo paketinin tüm yeni renkleri için deterministik kontrast
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  };
  const isLight = (hex: string) => lum(hex) > 0.35;
  const txt = isLight(c2) ? c1 : c2;
  // dış kontur: vurgu rengi varsa ve metinden/beden renginden yeterince ayrılıyorsa vurgu; yoksa metin
  const outline = c3 && c3 !== c1 && c3 !== c2 && Math.abs(lum(c3) - lum(c1)) > 0.08 ? c3 : txt;
  const clipId = `crest-${club.id}-${size}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 ${className ?? ''}`} aria-label={`${club.name} arması`} role="img">
      <defs><clipPath id={clipId}>
        {shape === 'shield' && <path d="M32 3 L57 10 v22 c0 14-11 24-25 29 C18 56 7 46 7 32 V10 Z" />}
        {shape === 'diamond' && <path d="M32 2 L62 32 L32 62 L2 32 Z" />}
        {shape === 'circle' && <circle cx="32" cy="32" r="29" />}
        {shape === 'hex' && <path d="M32 3 L57 17 V47 L32 61 L7 47 V17 Z" />}
      </clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="64" height="64" fill={c1} />
        <rect y="32" width="64" height="32" fill={c2} opacity="0.92" />
        <rect x="28" width="8" height="64" fill={c2} opacity="0.55" />
        <circle cx="32" cy="30" r="13" fill="none" stroke={txt} strokeWidth="2.4" opacity="0.9" />
        <circle cx="32" cy="30" r="3.2" fill={txt} />
      </g>
      {shape === 'shield' && <path d="M32 3 L57 10 v22 c0 14-11 24-25 29 C18 56 7 46 7 32 V10 Z" fill="none" stroke={outline} strokeWidth="2.4" opacity="0.92" />}
      {shape === 'diamond' && <path d="M32 2 L62 32 L32 62 L2 32 Z" fill="none" stroke={outline} strokeWidth="2.4" opacity="0.92" />}
      {shape === 'circle' && <circle cx="32" cy="32" r="29" fill="none" stroke={outline} strokeWidth="2.4" opacity="0.92" />}
      {shape === 'hex' && <path d="M32 3 L57 17 V47 L32 61 L7 47 V17 Z" fill="none" stroke={outline} strokeWidth="2.4" opacity="0.92" />}
      <text x="32" y="53" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize="13" fill={txt}>{club.short}</text>
    </svg>
  );
};
