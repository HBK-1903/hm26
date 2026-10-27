import type { CoreMatchEvent, MatchSide, MatchStatSummary, PlayerMatchStats, SideMatchStats } from './types';

const EPSILON = 1e-9;
const SIDES: readonly MatchSide[] = ['home', 'away'];

interface ShotLedgerEntry {
  side: MatchSide;
  shotType: string;
  shooterId: string;
  outcome?: 'goal' | 'save' | 'blocked' | 'off_target' | 'woodwork';
  goalkeeperId?: string;
  keeperOfRecordId?: string;
  goalConfirmed: boolean;
  goalDisallowed: boolean;
}

const emptySide = (): SideMatchStats => ({
  goals: 0, shots: 0, shotsOnTarget: 0, saves: 0, shotsSaved: 0,
  blockedShots: 0, offTargetShots: 0, woodworkShots: 0, disallowedShots: 0,
  unresolvedShots: 0, xg: 0, yellowCards: 0, redCards: 0,
  foulsCommitted: 0, corners: 0, freeKicks: 0, penalties: 0,
  possessionSeconds: 0, possessionPct: 0,
});
const emptyPlayer = (): PlayerMatchStats => ({ goals: 0, assists: 0, shots: 0, saves: 0, yellowCards: 0, redCards: 0 });
const opponent = (side: MatchSide): MatchSide => side === 'home' ? 'away' : 'home';
const ensurePlayer = (players: Record<string, PlayerMatchStats>, id: string): PlayerMatchStats => players[id] ??= emptyPlayer();
const assertUnit = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be a finite probability in [0, 1].`);
};

/**
 * Rebuilds match statistics solely from the domain EventLog.
 * VAR-overturned goals do not count as goals or shots on target; their xG
 * remains recorded because the attempt occurred before the review decision.
 */
export function reduceMatchEvents(events: readonly CoreMatchEvent[], final = false): MatchStatSummary {
  const stats: MatchStatSummary = {
    home: emptySide(), away: emptySide(), players: {}, totalPossessionSeconds: 0,
  };
  const shots = new Map<string, ShotLedgerEntry>();
  const foulSides = new Map<string, { side: MatchSide; restartType: 'free_kick' | 'penalty' }>();
  const foulsWithRestart = new Set<string>();
  const seenEventIds = new Set<string>();
  let previousSecond = -1;

  for (const event of events) {
    // Replaying/delivering the same event twice is idempotent.
    if (seenEventIds.has(event.id)) continue;
    seenEventIds.add(event.id);
    if (!event.id || !Number.isInteger(event.second) || event.second < previousSecond) throw new Error('EventLog IDs/timestamps must be valid and chronological.');
    previousSecond = event.second;

    switch (event.type) {
      case 'SHOT': {
        if (!event.shotId || !event.shooterId || shots.has(event.shotId)) throw new Error(`Duplicate or incomplete shot event: ${event.shotId || event.id}.`);
        assertUnit(event.xg, 'xG'); assertUnit(event.pGoal, 'pGoal');
        assertUnit(event.pSave, 'pSave'); assertUnit(event.pBlocked, 'pBlocked');
        assertUnit(event.pOffTarget, 'pOffTarget'); assertUnit(event.pWoodwork, 'pWoodwork');
        if (Math.abs(event.xg - event.pGoal) > EPSILON) throw new Error('xG must equal the shot model pGoal.');
        const probabilityTotal = event.pGoal + event.pSave + event.pBlocked + event.pOffTarget + event.pWoodwork;
        if (Math.abs(probabilityTotal - 1) > EPSILON) throw new Error(`Shot outcome probabilities must sum to 1 (got ${probabilityTotal}).`);
        shots.set(event.shotId, { side: event.side, shotType: event.shotType, shooterId: event.shooterId, goalConfirmed: false, goalDisallowed: false });
        const side = stats[event.side]; side.shots++; side.xg += event.xg; side.unresolvedShots++;
        ensurePlayer(stats.players, event.shooterId).shots++;
        break;
      }
      case 'SHOT_RESOLVED': {
        const shot = shots.get(event.shotId);
        if (!shot || shot.outcome || shot.goalDisallowed) throw new Error(`Shot outcome has no unique preceding attempt: ${event.shotId}.`);
        shot.outcome = event.outcome;
        if (event.goalkeeperId) shot.goalkeeperId = event.goalkeeperId;
        if (event.keeperOfRecordId) shot.keeperOfRecordId = event.keeperOfRecordId;
        if (event.outcome === 'save') {
          const attack = stats[shot.side], defence = stats[opponent(shot.side)];
          attack.shotsOnTarget++; attack.shotsSaved++; attack.unresolvedShots--;
          defence.saves++;
          // Aktif GK yoksa kurtarış yine takımın birincil kaleci karnesine işlenir
          const keeperId = event.keeperOfRecordId ?? event.goalkeeperId ?? shot.keeperOfRecordId;
          if (keeperId) ensurePlayer(stats.players, keeperId).saves++;
        } else if (event.outcome === 'blocked') {
          const side = stats[shot.side]; side.blockedShots++; side.unresolvedShots--;
        } else if (event.outcome === 'off_target') {
          const side = stats[shot.side]; side.offTargetShots++; side.unresolvedShots--;
        } else if (event.outcome === 'woodwork') {
          const side = stats[shot.side]; side.woodworkShots++; side.unresolvedShots--;
        }
        // A provisional goal remains unresolved until GOAL_CONFIRMED or GOAL_DISALLOWED.
        break;
      }
      case 'GOAL_CONFIRMED': {
        const shot = shots.get(event.shotId);
        if (!shot || shot.outcome !== 'goal' || shot.goalConfirmed || shot.goalDisallowed || shot.side !== event.side) throw new Error(`Confirmed goal must reference a matching, reviewed goal shot: ${event.shotId}.`);
        shot.goalConfirmed = true;
        const side = stats[event.side]; side.goals++; side.shotsOnTarget++; side.unresolvedShots--;
        ensurePlayer(stats.players, event.scorerId).goals++;
        if (event.assisterId && event.assisterId !== event.scorerId) ensurePlayer(stats.players, event.assisterId).assists++;
        break;
      }
      case 'GOAL_DISALLOWED': {
        const shot = shots.get(event.shotId);
        if (!shot || shot.outcome !== 'goal' || shot.goalConfirmed || shot.goalDisallowed || shot.side !== event.side) throw new Error(`Disallowed goal must reference an unconfirmed goal shot: ${event.shotId}.`);
        shot.goalDisallowed = true;
        const side = stats[event.side]; side.disallowedShots++; side.unresolvedShots--;
        break;
      }
      case 'FOUL_CALLED':
        foulSides.set(event.id, { side: event.side, restartType: event.restartType });
        stats[opponent(event.side)].foulsCommitted++;
        break;
      case 'RESTART_AWARDED': {
        if (!event.takerId || !event.refereeId || (!event.sourceFoulEventId && !event.sourceShotId) || (event.sourceFoulEventId && event.sourceShotId)) throw new Error('Restart requires an assigned taker, referee and exactly one source.');
        if (event.sourceFoulEventId) {
          const foul = foulSides.get(event.sourceFoulEventId);
          if (!foul || foul.side !== event.side || foul.restartType !== event.restartType || foulsWithRestart.has(event.sourceFoulEventId)) throw new Error('Foul restart must match one preceding foul decision.');
          foulsWithRestart.add(event.sourceFoulEventId);
        } else {
          const shot = shots.get(event.sourceShotId!);
          if (event.restartType !== 'corner' || !shot || shot.side !== event.side || !['blocked', 'save'].includes(shot.outcome ?? '')) throw new Error('Corner restart must follow a saved or blocked shot by the awarded side.');
        }
        if (event.restartType === 'corner') stats[event.side].corners++;
        else if (event.restartType === 'free_kick') stats[event.side].freeKicks++;
        else stats[event.side].penalties++;
        break;
      }
      case 'POSSESSION_ENDED': {
        if (!Number.isFinite(event.durationSeconds) || event.durationSeconds < 0) throw new Error('Possession duration must be non-negative.');
        stats[event.side].possessionSeconds += event.durationSeconds;
        stats.totalPossessionSeconds += event.durationSeconds;
        break;
      }
      case 'YELLOW_CARD':
        stats[event.side].yellowCards++;
        ensurePlayer(stats.players, event.playerId).yellowCards++;
        break;
      case 'RED_CARD':
        stats[event.side].redCards++;
        ensurePlayer(stats.players, event.playerId).redCards++;
        break;
      case 'KICK_OFF': case 'HALF_TIME': case 'FULL_TIME': case 'REFEREE_ASSIGNED': case 'INJURY': case 'SUBSTITUTION': case 'TACTIC_CHANGE':
      case 'VAR_REVIEW_STARTED': case 'VAR_DECISION': case 'TOUCHLINE_INSTRUCTION':
        break;
      default: {
        const neverEvent: never = event;
        throw new Error(`Unhandled match event: ${JSON.stringify(neverEvent)}`);
      }
    }
  }

  if (stats.totalPossessionSeconds > 0) {
    stats.home.possessionPct = Math.round(stats.home.possessionSeconds / stats.totalPossessionSeconds * 1000) / 10;
    stats.away.possessionPct = Math.round((100 - stats.home.possessionPct) * 10) / 10;
  } else {
    stats.home.possessionPct = 50; stats.away.possessionPct = 50;
  }

  assertMatchStatInvariants(stats);
  if (final) {
    const orphanedFouls = [...foulSides.keys()].filter((eventId) => !foulsWithRestart.has(eventId));
    if (orphanedFouls.length) throw new Error(`Final EventLog has fouls without an awarded restart: ${orphanedFouls.join(', ')}.`);
    const unfinished = [...shots.entries()].filter(([, shot]) => !shot.goalConfirmed && !shot.goalDisallowed && (!shot.outcome || shot.outcome === 'goal'));
    if (unfinished.length) throw new Error(`Final EventLog has unresolved shots: ${unfinished.map(([id]) => id).join(', ')}.`);
    if (stats.home.unresolvedShots || stats.away.unresolvedShots) throw new Error('Final EventLog has unresolved shot attempts.');
  }
  return stats;
}

/** Runtime assertions suitable for unit tests and development builds. */
export function assertMatchStatInvariants(stats: MatchStatSummary): void {
  for (const side of SIDES) {
    const own = stats[side], other = stats[opponent(side)];
    if (own.goals > own.shotsOnTarget || own.shotsOnTarget > own.shots) throw new Error(`${side}: goals ≤ shotsOnTarget ≤ shots invariant failed.`);
    if (own.shotsOnTarget !== own.goals + own.shotsSaved) throw new Error(`${side}: shotsOnTarget must equal goals + shotsSaved.`);
    const classifiedShots = own.goals + own.shotsSaved + own.blockedShots + own.offTargetShots + own.woodworkShots + own.disallowedShots + own.unresolvedShots;
    if (own.shots !== classifiedShots) throw new Error(`${side}: shot outcome accounting invariant failed (${own.shots} != ${classifiedShots}).`);
    if (Math.abs(own.saves - other.shotsSaved) > EPSILON) throw new Error(`${side}: keeper saves must equal the opponent's saved shots.`);
    if (own.foulsCommitted < 0 || own.corners < 0 || own.freeKicks < 0 || own.penalties < 0) throw new Error(`${side}: foul/restart counters cannot be negative.`);
    if (own.possessionPct < 0 || own.possessionPct > 100) throw new Error(`${side}: possession percentage is out of range.`);
  }
  if (stats.totalPossessionSeconds > 0 && Math.abs(stats.home.possessionPct + stats.away.possessionPct - 100) > 0.11) throw new Error('Possession percentages must sum to 100 (within rounding tolerance).');
  for (const [playerId, row] of Object.entries(stats.players)) {
    if (!playerId || row.goals < 0 || row.assists < 0 || row.shots < 0 || row.saves < 0 || row.yellowCards < 0 || row.redCards < 0) throw new Error(`Invalid player stat row: ${playerId}.`);
  }
}
