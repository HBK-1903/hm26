export interface HighlightPoint { x: number; y: number }

/** Sample the drawn line between recorded zones, not an invented player or match event. */
export function pointOnHighlightPath(path: readonly HighlightPoint[] | null, progress: number): HighlightPoint | null {
  if (!path?.length) return null;
  if (path.length === 1) return { ...path[0] };
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const lengths = path.slice(1).map((point, index) => Math.hypot(point.x - path[index].x, point.y - path[index].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return { ...path[path.length - 1] };
  let distance = t * total;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index];
    if (length > 0 && distance <= length) {
      const fraction = distance / length;
      return {
        x: path[index].x + (path[index + 1].x - path[index].x) * fraction,
        y: path[index].y + (path[index + 1].y - path[index].y) * fraction,
      };
    }
    distance -= length;
  }
  return { ...path[path.length - 1] };
}
