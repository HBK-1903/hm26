import type { Formation } from '../types';

// Saved custom lineups have always followed the visual tactics board's slot order.
// The match engine groups some positions in a different order. Translate only at
// the boundary so existing saves keep their original on-screen positions.
const ENGINE_FROM_BOARD: Record<Formation, readonly number[]> = {
  '4-3-3':   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  '4-2-3-1': [0, 1, 2, 3, 4, 5, 6, 7, 9, 8, 10],
  '4-4-2':   [0, 1, 2, 3, 4, 6, 7, 5, 8, 9, 10],
  '4-1-4-1': [0, 1, 2, 3, 4, 5, 7, 8, 6, 9, 10],
  '3-5-2':   [0, 1, 2, 3, 4, 8, 5, 6, 7, 9, 10],
  '5-3-2':   [0, 2, 3, 4, 1, 5, 6, 7, 8, 9, 10],
};

/** IDs in persisted/visual board order → engine's slot order. */
export function boardToEngine<T>(formation: Formation, board: readonly T[]): T[] {
  if (board.length !== 11) return [...board];
  return ENGINE_FROM_BOARD[formation].map((boardIndex) => board[boardIndex]);
}

/** Engine slots → the original visual/persisted board order, preserving empty slots. */
export function engineToBoard<T>(formation: Formation, engine: readonly T[]): (T | null)[] {
  const board: (T | null)[] = Array(11).fill(null);
  ENGINE_FROM_BOARD[formation].forEach((boardIndex, engineIndex) => {
    board[boardIndex] = engine[engineIndex] ?? null;
  });
  return board;
}

export function engineSlotForBoard(formation: Formation, boardIndex: number): number {
  return ENGINE_FROM_BOARD[formation].indexOf(boardIndex);
}
