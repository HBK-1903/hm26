import { calculateRolePosition, type PitchPoint } from '../../engine/pitch-ai';
import type { PositionGroup } from '../../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type PitchSwatch = { fill: string; outline: string; number: string };
const rgb = (hex: string): [number, number, number] => {
  const valid = /^#[\da-f]{6}$/i.test(hex) ? hex : '#233b32';
  return [1, 3, 5].map((i) => parseInt(valid.slice(i, i + 2), 16)) as [number, number, number];
};
const colorDistance = (a: string, b: string) => {
  const x = rgb(a), y = rgb(b);
  return Math.sqrt(((x[0] - y[0]) ** 2 * 2 + (x[1] - y[1]) ** 2 * 4 + (x[2] - y[2]) ** 2 * 3) / 9);
};
const swatch = (fill: string, outline: string): PitchSwatch => {
  const [r, g, b] = rgb(fill);
  const light = (r * 299 + g * 587 + b * 114) / 1000 > 150;
  return { fill, outline: colorDistance(fill, outline) < 35 ? (light ? '#25382e' : '#f8f1db') : outline, number: light ? '#182c24' : '#fffdf2' };
};

/** Similar kits use the away club's actual secondary colour, not two indistinguishable discs. */
export function pitchTeamColors(home: { color1: string; color2: string }, away: { color1: string; color2: string }): { home: PitchSwatch; away: PitchSwatch; alternateAway: boolean } {
  const alternateAway = colorDistance(home.color1, away.color1) < 55;
  let awayFill = alternateAway ? away.color2 : away.color1;
  if (alternateAway && colorDistance(home.color1, awayFill) < 55) {
    // Old palettes may not have a contrasting second colour either.
    awayFill = colorDistance(home.color1, '#f6eedb') >= 55 ? '#f6eedb' : '#25394a';
  }
  return {
    home: swatch(home.color1, home.color2),
    away: swatch(awayFill, alternateAway ? away.color1 : away.color2),
    alternateAway,
  };
}

/**
 * Positions follow FORMATION_SLOTS in the match engine, not simply left-to-right
 * rows: for example a 4-4-2 has two central midfielders before its two wingers.
 * Coordinates are attack-relative and never affect the simulated match.
 */
export function pitchFormationSlots(formation: string, width: number, defLine: 'deep' | 'normal' | 'high'): PitchPoint[] {
  const widthFactor = 0.55 + (clamp(Number.isFinite(width) ? width : 50, 0, 100) / 100) * 0.85;
  const line = defLine === 'deep' ? 82 : defLine === 'high' ? 62 : 74;
  const backFour: PitchPoint[] = [20, 40, 60, 80].map((x) => ({ x, y: line - 3 }));
  const pair = (y: number): PitchPoint[] => [{ x: 39, y }, { x: 61, y }];
  const keeper = { x: 50, y: 92 };
  let slots: PitchPoint[];
  switch (formation) {
    case '4-3-3':
      slots = [keeper, ...backFour, { x: 34, y: line - 22 }, { x: 50, y: line - 18 }, { x: 66, y: line - 22 }, { x: 20, y: line - 46 }, { x: 50, y: line - 52 }, { x: 80, y: line - 46 }];
      break;
    case '4-2-3-1':
      slots = [keeper, ...backFour, ...pair(line - 16), { x: 40, y: line - 32 }, { x: 80, y: line - 33 }, { x: 60, y: line - 32 }, { x: 50, y: line - 56 }];
      break;
    case '4-1-4-1':
      slots = [keeper, ...backFour, { x: 50, y: line - 16 }, ...pair(line - 27), { x: 20, y: line - 27 }, { x: 80, y: line - 27 }, { x: 50, y: line - 54 }];
      break;
    case '3-5-2':
      slots = [keeper, ...[30, 50, 70].map((x) => ({ x, y: line - 6 })), { x: 18, y: line - 27 }, { x: 82, y: line - 27 }, { x: 36, y: line - 27 }, { x: 50, y: line - 21 }, { x: 64, y: line - 27 }, ...pair(line - 52)];
      break;
    case '5-3-2':
      slots = [keeper, ...[33, 50, 67].map((x) => ({ x, y: line - 4 })), { x: 16, y: line - 4 }, { x: 84, y: line - 4 }, { x: 34, y: line - 26 }, { x: 50, y: line - 21 }, { x: 66, y: line - 26 }, ...pair(line - 52)];
      break;
    case '4-4-2':
    default: // An older/unknown formation still gets a safe, complete shape.
      slots = [keeper, ...backFour, ...pair(line - 24), { x: 20, y: line - 24 }, { x: 80, y: line - 24 }, ...pair(line - 52)];
      break;
  }
  return slots.map(({ x, y }) => ({ x: clamp(50 + (x - 50) * widthFactor, 8, 92), y: clamp(y, 6, 94) }));
}

/** A role-aware target based only on the engine's real ball/actor snapshot. */
export function pitchPlayerTarget(
  group: PositionGroup, side: 'home' | 'away', attacking: boolean,
  base: PitchPoint, ball: PitchPoint, onBall: boolean, actionActor: boolean,
): PitchPoint {
  const position = calculateRolePosition(group, side, attacking, base, ball);
  if (onBall) {
    // The actual ball holder moves toward the ball; keep a keeper within their area.
    if (group === 'GK') return {
      x: clamp(ball.x, 34, 66),
      y: side === 'home' ? clamp(ball.y + 2, 80, 94) : clamp(ball.y - 2, 6, 20),
    };
    return { x: clamp(ball.x, 6, 94), y: clamp(ball.y + (side === 'home' ? 2.5 : -2.5), 6, 94) };
  }
  if (!actionActor || group === 'GK') return position;
  // A participant offers a little support rather than every player chasing the ball.
  return {
    x: clamp(position.x + clamp((ball.x - position.x) * 0.12, -5, 5), 8, 92),
    y: clamp(position.y + clamp((ball.y - position.y) * 0.12, -5, 5), 6, 94),
  };
}

/** Keep animation length tied to the selected presentation cadence. */
export function pitchTransitionMs(stepMs: number): number {
  return clamp(Math.round((Number.isFinite(stepMs) ? stepMs : 260) * 0.86), 70, 550);
}
