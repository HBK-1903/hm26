// Wave 7 focused referee, card, foul/restart, set-piece taker and reducer-chain checks.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, type MatchInput } from '../src/engine/engine';
import { autoLineup, isActiveOnPitch } from '../src/engine/profiles';
import { MatchSession } from '../src/engine/session';
import { EventLog } from '../src/engine/core/eventLog';
import { reduceMatchEvents } from '../src/engine/core/statReducer';
import { assignReferee, refereeCardProbability, refereePenaltyProbability } from '../src/engine/referee';
import { selectSetPieceTaker, type SetPieceRole } from '../src/engine/setPieces';

const home = CLUBS[0], away = CLUBS[12];
const baseInput: MatchInput = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 83001), awaySquad: genSquad(away, 83002),
  homeTactic: aiDefaultTactic(home, away, away.strength),
  awayTactic: aiDefaultTactic(away, home, home.strength),
  seed: 83003, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
};
const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

{
  const refs = Array.from({ length: 30 }, (_, i) => assignReferee(83000 + i));
  const stable = refs.every((ref, i) => JSON.stringify(ref) === JSON.stringify(assignReferee(83000 + i)));
  const styles = new Set(refs.map((ref) => ref.strictness));
  const bounds = refs.every((ref) => refereeCardProbability(0.4, ref) >= 0 && refereeCardProbability(0.4, ref) <= 0.6 && refereePenaltyProbability(0.3, ref) >= 0 && refereePenaltyProbability(0.3, ref) <= 0.5);
  check('Referee assignment and decision modifiers are deterministic, bounded and varied', stable && styles.size === 3 && bounds, `stable=${stable} styles=${[...styles].join(',')} bounds=${bounds}`);
}

{
  const lineup = autoLineup(baseInput.homeSquad, baseInput.homeTactic.formation).slots;
  const assigned = lineup.find((slot) => slot.slotGroup === 'ST')!;
  const setPieces = { captain: null, penalty: assigned.player.id, cornerL: assigned.player.id, cornerR: assigned.player.id, fkShort: assigned.player.id, fkLong: assigned.player.id };
  const roles: SetPieceRole[] = ['penalty', 'cornerL', 'cornerR', 'fkShort', 'fkLong'];
  const assignedAll = roles.every((role) => {
    const choice = selectSetPieceTaker(lineup, setPieces, role);
    return choice?.slot.player.id === assigned.player.id && choice.selection === 'assigned';
  });
  assigned.injured = true;
  const fallback = selectSetPieceTaker(lineup, setPieces, 'penalty');
  check('Configured set-piece takers are honored; injured/dismissed assignments fall back to an eligible player', assignedAll && !!fallback && fallback.selection === 'fallback' && fallback.slot.player.id !== assigned.player.id && isActiveOnPitch(fallback.slot), `assignedAll=${assignedAll} fallback=${fallback?.slot.player.id ?? 'none'} active=${!!fallback && isActiveOnPitch(fallback.slot)}`);
}

{
  const homeStarter = autoLineup(baseInput.homeSquad, baseInput.homeTactic.formation).slots.find((slot) => slot.slotGroup === 'ST')!;
  const awayStarter = autoLineup(baseInput.awaySquad, baseInput.awayTactic!.formation).slots.find((slot) => slot.slotGroup === 'ST')!;
  const homeSetPieces = { captain: null, penalty: homeStarter.player.id, cornerL: homeStarter.player.id, cornerR: homeStarter.player.id, fkShort: homeStarter.player.id, fkLong: homeStarter.player.id };
  const awaySetPieces = { captain: null, penalty: awayStarter.player.id, cornerL: awayStarter.player.id, cornerR: awayStarter.player.id, fkShort: awayStarter.player.id, fkLong: awayStarter.player.id };
  const configuredInput: MatchInput = {
    ...baseInput,
    homeTactic: { ...baseInput.homeTactic, plan: 'yuksekPres', press: 'high', tempo: 'high', passRisk: 'direct', width: 68, fbAdvanced: true, setPieces: homeSetPieces },
    awayTactic: { ...baseInput.awayTactic!, plan: 'yuksekPres', press: 'high', tempo: 'high', passRisk: 'direct', width: 68, fbAdvanced: true, setPieces: awaySetPieces },
  }; 
  const seenRestarts = new Set<string>();
  const seenShotTypes = new Set<string>();
  const seenCards = new Set<string>();
  let sawFoul = false, allChainsValid = true, allTakersEligible = true, allStatsReconciled = true, matches = 0;
  const rosterIds = new Set([...baseInput.homeSquad, ...baseInput.awaySquad].map((player) => player.id));

  for (let seed = 83010; seed < 83610 && !(seenRestarts.has('corner') && seenRestarts.has('free_kick') && seenRestarts.has('penalty') && seenShotTypes.has('free_kick') && seenShotTypes.has('corner') && seenCards.has('YELLOW_CARD')); seed++) {
    const session = new MatchSession({ ...configuredInput, seed });
    const result = session.finishNow();
    const events = session.getCoreEvents();
    const summary = reduceMatchEvents(events, true);
    const refereeAssignments = events.filter((event) => event.type === 'REFEREE_ASSIGNED');
    if (refereeAssignments.length !== 1 || refereeAssignments[0]?.type !== 'REFEREE_ASSIGNED' || refereeAssignments[0].refereeId !== session.getReferee().id) allChainsValid = false;
    matches++;
    for (const event of events) {
      if (event.type === 'FOUL_CALLED') {
        sawFoul = true;
        const restartIndex = events.findIndex((candidate) => candidate.type === 'RESTART_AWARDED' && candidate.sourceFoulEventId === event.id);
        const restart = restartIndex >= 0 ? events[restartIndex] : undefined;
        if (!restart || restart.type !== 'RESTART_AWARDED' || restart.second !== event.second || restart.restartType !== event.restartType || restart.side !== event.side || restart.refereeId !== session.getReferee().id) allChainsValid = false;
      }
      if (event.type === 'RESTART_AWARDED') {
        seenRestarts.add(event.restartType);
        const roleConfig = event.side === 'home' ? homeSetPieces : awaySetPieces;
        if (!rosterIds.has(event.takerId) || (event.takerSelection === 'assigned' && !Object.values(roleConfig).includes(event.takerId))) allTakersEligible = false;
        if (event.restartType === 'penalty') {
          const attempt = events.find((candidate) => candidate.type === 'SHOT' && candidate.shotType === 'penalty' && candidate.second === event.second && candidate.side === event.side && candidate.shooterId === event.takerId);
          if (!attempt) allChainsValid = false;
        }
        if (event.restartType === 'free_kick') {
          const attempt = events.find((candidate) => candidate.type === 'SHOT' && candidate.shotType === 'free_kick' && candidate.second === event.second && candidate.side === event.side);
          // A free kick need not be taken as a direct shot, but every direct attempt must use the assigned taker.
          if (attempt && attempt.type === 'SHOT' && attempt.shooterId !== event.takerId) allChainsValid = false;
        }
        if (event.restartType === 'corner') {
          const source = events.find((candidate) => candidate.type === 'SHOT' && candidate.shotId === event.sourceShotId);
          const restartIndex = events.indexOf(event);
          const cornerAttempt = events.slice(restartIndex + 1).find((candidate) => candidate.type === 'SHOT' && candidate.shotType === 'corner' && candidate.second === event.second && candidate.side === event.side);
          if (!source || source.type !== 'SHOT' || source.side !== event.side || !cornerAttempt || cornerAttempt.type !== 'SHOT' || cornerAttempt.shooterId !== event.takerId) allChainsValid = false;
        }
      }
      if (event.type === 'SHOT') seenShotTypes.add(event.shotType);
      if (event.type === 'YELLOW_CARD' || event.type === 'RED_CARD') {
        seenCards.add(event.type);
        if (!rosterIds.has(event.playerId) || event.refereeId !== session.getReferee().id) allChainsValid = false;
      }
      if (event.type === 'FOUL_CALLED' || event.type === 'RESTART_AWARDED') {
        if (event.refereeId !== session.getReferee().id) allChainsValid = false;
      }
    }
    allStatsReconciled &&= summary.home.foulsCommitted === result.stats.foulsH
      && summary.away.foulsCommitted === result.stats.foulsA
      && summary.home.corners === result.stats.cornersH && summary.away.corners === result.stats.cornersA
      && summary.home.yellowCards === result.stats.yellowH && summary.away.yellowCards === result.stats.yellowA
      && summary.home.redCards === result.stats.redH && summary.away.redCards === result.stats.redA
      && summary.home.freeKicks === events.filter((event) => event.type === 'RESTART_AWARDED' && event.side === 'home' && event.restartType === 'free_kick').length
      && summary.away.freeKicks === events.filter((event) => event.type === 'RESTART_AWARDED' && event.side === 'away' && event.restartType === 'free_kick').length
      && summary.home.penalties === events.filter((event) => event.type === 'RESTART_AWARDED' && event.side === 'home' && event.restartType === 'penalty').length
      && summary.away.penalties === events.filter((event) => event.type === 'RESTART_AWARDED' && event.side === 'away' && event.restartType === 'penalty').length;
  }
  const complete = sawFoul && seenRestarts.has('corner') && seenRestarts.has('free_kick') && seenRestarts.has('penalty') && seenShotTypes.has('free_kick') && seenShotTypes.has('corner') && seenCards.has('YELLOW_CARD');
  check('Foul→restart→shot/card chains and event-derived foul/corner/card stats reconcile', complete && allChainsValid && allTakersEligible && allStatsReconciled, `matches=${matches} restarts=${[...seenRestarts].join(',')} shots=${[...seenShotTypes].join(',')} cards=${[...seenCards].join(',')} chains=${allChainsValid} takers=${allTakersEligible} stats=${allStatsReconciled}`);
}

{
  const log = new EventLog('wave7-card-ledger');
  log.append({ type: 'KICK_OFF', side: 'home', second: 0, minute: 0 });
  log.append({ type: 'YELLOW_CARD', side: 'away', playerId: 'away-player', refereeId: 'referee-balanced', second: 100, minute: 2 });
  log.append({ type: 'YELLOW_CARD', side: 'away', playerId: 'away-player', refereeId: 'referee-balanced', second: 900, minute: 15 });
  log.append({ type: 'RED_CARD', side: 'away', playerId: 'away-player', reason: 'second_yellow', refereeId: 'referee-balanced', second: 900, minute: 15 });
  log.append({ type: 'RED_CARD', side: 'home', playerId: 'home-player', reason: 'direct', refereeId: 'referee-balanced', second: 1400, minute: 23 });
  const summary = reduceMatchEvents(log.readAll(), true);
  const cardsReconcile = summary.away.yellowCards === 2 && summary.away.redCards === 1
    && summary.players['away-player'].yellowCards === 2 && summary.players['away-player'].redCards === 1
    && summary.home.redCards === 1 && summary.players['home-player'].redCards === 1;
  check('Reducer counts second-yellow and direct-red decisions at team and player level', cardsReconcile, `away=Y${summary.away.yellowCards}/R${summary.away.redCards} player=Y${summary.players['away-player'].yellowCards}/R${summary.players['away-player'].redCards} directR=${summary.home.redCards}`);
}

for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-WAVE7: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
