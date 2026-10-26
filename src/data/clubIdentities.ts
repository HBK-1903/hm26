// HM26 — v0.9.6 Logo Paketi (02. revizyon) kimlik adaptörü
// Kaynak: uploads/club-identities.js + kulup-logolari.json (yalnızca kimlik/renk verisi — svg/ ve svg_kucuk/ dosyaları pakette yer almadı;
// ta ki dosyalar ekleninceye kadar armalar Crest.tsx ile prosedürel çizilir. Burada yalnızca TEK doğruluk kaynağı tutulur.)
import { CLUBS, clubById } from './clubs';

export interface ClubIdentity {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  /** Paket SVG dosya yolu (kaynak dizine göre; içerik henüz yüklenmedi) */
  svg: string;
  compactSvg: string;
}

// İçeriği kulup-logolari.json'dan doğrulanmış, in-kaynak hafif kopya (id → renk sabiti)
export const CLUB_IDENTITIES: Record<string, ClubIdentity> = Object.fromEntries(
  CLUBS.map((c) => [c.id, {
    name: c.name,
    primary: c.color1,
    secondary: c.color2,
    accent: c.color3 ?? '',
    svg: `svg/${c.id}.svg`,
    compactSvg: `svg_kucuk/${c.id}.svg`,
  }]),
);

/** Tek doğruluk kontrolü — qa9-logopack bunu koşar */
export const identityConsistent = (): boolean =>
  Object.entries(CLUB_IDENTITIES).every(([id, i]) => {
    const c = clubById(id);
    return !!c && c.name === i.name && c.color1 === i.primary && c.color2 === i.secondary && (c.color3 ?? '') === i.accent;
  });
