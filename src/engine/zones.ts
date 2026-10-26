// HM26 Maç Motoru §3.1 — 9 bölgeli saha modeli
// L/C/R yatay bant, D/M/A dikey üçlü. D = kendi savunma üçlüsü, A = rakip kale önü.

export type ZoneId =
  | 'L-D' | 'C-D' | 'R-D'
  | 'L-M' | 'C-M' | 'R-M'
  | 'L-A' | 'C-A' | 'R-A';

export type LaneId = 'L' | 'C' | 'R';
export type BandId = 'D' | 'M' | 'A';

export const ALL_ZONES: ZoneId[] = ['L-D', 'C-D', 'R-D', 'L-M', 'C-M', 'R-M', 'L-A', 'C-A', 'R-A'];

// Dalga 2 (§5-D şut haritası): dikey saha yüzde koordinatı (0-100) — ev sahibi üstte (y küçük) hücum eder
// SPEC (24 Eki): Dikey Saha — Model A. viewBox 100×130 normalize yüzde koordinat.
// Üst (y küçük) = rakip kale / hücum bölgesi; alt (y büyük) = kendi kalemiz.
export const ZONE_XY: Record<ZoneId, { x: number; y: number }> = {
  'L-D': { x: 20, y: 82 }, 'C-D': { x: 50, y: 84 }, 'R-D': { x: 80, y: 82 },
  'L-M': { x: 20, y: 50 }, 'C-M': { x: 50, y: 50 }, 'R-M': { x: 80, y: 50 },
  'L-A': { x: 22, y: 18 }, 'C-A': { x: 50, y: 15 }, 'R-A': { x: 78, y: 18 },
};

export const laneOf = (z: ZoneId): LaneId => z[0] as LaneId;
export const bandOf = (z: ZoneId): BandId => z[2] as BandId;

/** Komşuluk: aynı bantta komşu şerit veya aynı şeritte komşu bant */
export function neighbors(z: ZoneId): ZoneId[] {
  const laneX = { L: 0, C: 1, R: 2 } as const;
  const bandY = { D: 0, M: 1, A: 2 } as const;
  const x = laneX[laneOf(z)];
  const y = bandY[bandOf(z)];
  const out: ZoneId[] = [];
  const lanes: LaneId[] = ['L', 'C', 'R'];
  const bands: BandId[] = ['D', 'M', 'A'];
  for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
    if (dx === 0 && dy === 0) continue;
    if (Math.abs(dx) + Math.abs(dy) > 1) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx > 2 || ny < 0 || ny > 2) continue;
    out.push(`${lanes[nx]}-${bands[ny]}` as ZoneId);
  }
  return out;
}

/** Hücum yönündeki (A'ya doğru) komşular */
export function forwardNeighbors(z: ZoneId): ZoneId[] {
  return neighbors(z).filter((n) => {
    const order = { D: 0, M: 1, A: 2 } as const;
    return order[bandOf(n)] >= order[bandOf(z)];
  });
}
