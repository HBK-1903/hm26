// HM26 — stilize özgün portreler (SVG; gerçek yüz/fotoğraf kullanılmaz)
// v0.9.0: Karakter & Simge Kiti v1 kaynak entegrasyonu — katmanlı avatar üretimi src/components/assets/kit.ts'ten.
import React from 'react';
import { Player, ManagerFace } from '../../types';
import { clubByIdSafe } from '../../data/clubs';
import { avatarInner, extendPalettes, normalizeFace, presetFace, playerFaceFromSeed, playerFaceSeed, BASE_PALETTES } from './kit';

const PALETTES = extendPalettes(BASE_PALETTES);

// ── Oyuncu portresi: deterministik FNV-1a seed, forma renkleri kulüpten ───────────
export const PlayerPortrait: React.FC<{ player: Player; size?: number; className?: string }> = ({ player, size = 44, className }) => {
  // Serbest oyuncu (clubId='free') → nötr forma renkleri
  const club = clubByIdSafe(player.clubId) ?? ({ color1: '#2F5D3A', color2: '#E5E7EB' } as { color1: string; color2: string });
  const palette = { ...PALETTES, suit: [club.color1], accent: [club.color2] };
  const face = playerFaceFromSeed(playerFaceSeed(player.id));
  const inner = React.useMemo(
    () => avatarInner(face, palette),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player.id, club.color1, club.color2],
  );
  return (
    <svg
      viewBox="0 0 128 128" width={size} height={size}
      className={`shrink-0 ${className ?? ''}`} role="img" aria-label={player.name}
      data-hm26-player-avatar="v1" data-player-id={player.id}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
};

// ── Menajer portresi: 6 öncül veya özel yüz (career.manager.face) ────────────────
const svgProps = (size: number, selected: boolean, accent: string): Record<string, unknown> => ({
  viewBox: '0 0 128 128', width: size, height: size, role: 'img',
  'aria-label': 'Menajer portresi',
  'data-hm26-avatar': 'v1',
  style: selected ? { filter: `drop-shadow(0 0 8px ${accent})` } : { filter: 'drop-shadow(0 1px 2px #0002)' },
});

export const ManagerPortrait: React.FC<{ index: number; size?: number; selected?: boolean; face?: ManagerFace | null }> = ({ index, size = 64, selected, face }) => {
  const conf = face ?? presetFace(index);
  const norm = normalizeFace(conf, PALETTES);
  const accent = PALETTES.accent[norm.accent];
  const inner = React.useMemo(() => avatarInner(conf, BASE_PALETTES), [
    norm.skin, norm.hairColor, norm.hairStyle, norm.suit, norm.accent,
    norm.beard, norm.beardStyle, norm.eyeStyle, norm.eyeColor, norm.outfit, norm.glasses,
  ]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <svg
      {...svgProps(size, !!selected, accent)}
      data-hair-style={norm.hairStyle} data-eye-style={norm.eyeStyle} data-eye-color={norm.eyeColor} data-outfit={norm.outfit}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
};

// Sihirbaz editörü için genişletilmiş paletler (genişlikler: skin 9, hairColor 10, suit 10, accent 9)
export const MANAGER_FACE_PALETTE = {
  skin: PALETTES.skin,
  hairColor: PALETTES.hairColor,
  suit: PALETTES.suit,
  accent: PALETTES.accent,
};
