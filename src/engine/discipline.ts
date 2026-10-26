// HM26 v0.9.11 — pure manager discipline rules (easy to exercise independently of React/store UI).
export interface ManagerDisciplineResult { managerYellowCards: number; managerSuspendedMatches: number; banned: boolean }

/** Two cautions in a season clear the card counter and impose one touchline ban. */
export function registerManagerYellow(managerYellowCards = 0, managerSuspendedMatches = 0): ManagerDisciplineResult {
  const count = Math.max(0, managerYellowCards) + 1;
  const banned = count >= 2;
  return {
    managerYellowCards: banned ? 0 : count,
    managerSuspendedMatches: banned ? Math.max(1, managerSuspendedMatches) : Math.max(0, managerSuspendedMatches),
    banned,
  };
}

/** A suspension is consumed only if the manager was already banned at kickoff. */
export function consumeManagerBan(matches = 0, wasSuspendedAtKickoff: boolean): number {
  return wasSuspendedAtKickoff ? Math.max(0, matches - 1) : Math.max(0, matches);
}
