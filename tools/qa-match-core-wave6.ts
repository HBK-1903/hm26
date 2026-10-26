// Wave 6 focused match availability, injury decision and IFAB substitution checks.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, type MatchInput } from '../src/engine/engine';
import { autoLineup, isActiveOnPitch, teamProfile } from '../src/engine/profiles';
import { MatchSession } from '../src/engine/session';
import { pickSlot, runPossession } from '../src/engine/possession';

const home = CLUBS[0], away = CLUBS[12];
const baseInput: MatchInput = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 82001), awaySquad: genSquad(away, 82002),
  homeTactic: aiDefaultTactic(home, away, away.strength),
  awayTactic: aiDefaultTactic(away, home, home.strength),
  seed: 82003, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
};
const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
function rngFor(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

{
  const homeLine = autoLineup(baseInput.homeSquad, baseInput.homeTactic.formation);
  const awayLine = autoLineup(baseInput.awaySquad, baseInput.awayTactic!.formation);
  const unavailable = new Set<string>();
  const homeKeeper = homeLine.slots.find((slot) => slot.slotGroup === 'GK')!;
  const awayKeeper = awayLine.slots.find((slot) => slot.slotGroup === 'GK')!;
  const homeForward = homeLine.slots.find((slot) => slot.slotGroup === 'ST')!;
  const awayForward = awayLine.slots.find((slot) => slot.slotGroup === 'ST')!;
  homeKeeper.sentOff = true; awayKeeper.injured = true;
  homeForward.injured = true; awayForward.sentOff = true;
  for (const slot of [homeKeeper, awayKeeper, homeForward, awayForward]) unavailable.add(slot.player.id);
  const homeProfile = teamProfile(homeLine.slots, baseInput.homeTactic, { home: true, derby: false });
  const awayProfile = teamProfile(awayLine.slots, baseInput.awayTactic!, { home: false, derby: false });
  const allAttackUnavailable = homeLine.slots.filter((slot) => ['ST', 'AM', 'WG'].includes(slot.slotGroup));
  const priorInjuryState = new Map(allAttackUnavailable.map((slot) => [slot.player.id, !!slot.injured]));
  for (const slot of allAttackUnavailable) slot.injured = true;
  const noForwardSelector = pickSlot(homeLine.slots, 'C-A', true) === null;
  for (const slot of allAttackUnavailable) slot.injured = priorInjuryState.get(slot.player.id) ?? false;
  let actorTraceClean = true;
  const rng = rngFor(82004);
  for (let i = 0; i < 90; i++) {
    const zone = (['C-D', 'C-M', 'C-A'] as const)[i % 3];
    const pos = runPossession('home', zone, homeProfile, awayProfile, baseInput.homeTactic, baseInput.awayTactic!, homeLine.slots, awayLine.slots, {
      minute: 28, homeScore: 0, awayScore: 0, rng, jitter: 5, goalPaceMul: 1, weather: 'acik',
    });
    const ids = [...pos.chain.flatMap((step) => [step.fromId, step.toId].filter((id): id is string => !!id)),
      ...[pos.ballHolder, pos.lastPasser, pos.dispossessedBy, pos.fouler, pos.fouled].filter((slot) => !!slot).map((slot) => slot!.player.id)];
    if (ids.some((id) => unavailable.has(id))) actorTraceClean = false;
  }
  const profileSlots = homeLine.slots.map((slot) => ({ ...slot, player: { ...slot.player, fitness: 80 } }));
  const lowFitness = profileSlots.find((slot) => slot.slotGroup !== 'GK')!;
  lowFitness.player.fitness = 20;
  const meanBeforeDismissal = teamProfile(profileSlots, baseInput.homeTactic, { home: true, derby: false }).raw.meanFitness;
  lowFitness.sentOff = true;
  const meanAfterDismissal = teamProfile(profileSlots, baseInput.homeTactic, { home: true, derby: false }).raw.meanFitness;
  check('One shared active-player rule excludes injured and dismissed players from profiles and actor selectors', noForwardSelector && actorTraceClean && meanAfterDismissal > meanBeforeDismissal && !isActiveOnPitch(homeKeeper) && !isActiveOnPitch(awayKeeper), `noForward=${noForwardSelector} traceClean=${actorTraceClean} meanFitness=${meanBeforeDismissal.toFixed(1)}→${meanAfterDismissal.toFixed(1)}`);
}

{
  const session = new MatchSession({ ...baseInput, seed: 82010 });
  const excluded = new Set<string>();
  for (const side of ['home', 'away'] as const) {
    const slots = session.getSlots(side);
    const keeper = slots.find((slot) => slot.slotGroup === 'GK')!;
    const forward = slots.find((slot) => slot.slotGroup === 'ST')!;
    if (side === 'home') keeper.sentOff = true; else keeper.injured = true;
    if (side === 'home') forward.injured = true; else forward.sentOff = true;
    excluded.add(keeper.player.id); excluded.add(forward.player.id);
  }
  let clean = true;
  while (!session.done) {
    session.step();
    if (session.getBallState().activeIds.some((id) => excluded.has(id))) clean = false;
  }
  const shotEvents = session.getCoreEvents().filter((event) => event.type === 'SHOT');
  const shotActorIds = shotEvents.flatMap((event) => [event.shooterId, event.assisterId, event.goalkeeperId].filter((id): id is string => !!id));
  if (shotActorIds.some((id) => excluded.has(id))) clean = false;
  check('Production MatchSession never records an injured/sent-off player as a possession or shot actor', clean, `excluded=${excluded.size} coreShots=${shotEvents.length} allActorsActive=${clean}`);
}

{
  const session = new MatchSession({ ...baseInput, seed: 82020 });
  const outgoing = session.getSlots('home').find((slot) => slot.slotGroup !== 'GK')!;
  const incoming = session.getBench('home')[0];
  outgoing.sentOff = true;
  const dismissedRejected = !session.queueSub('home', outgoing.player.id, incoming.id);
  outgoing.sentOff = false;
  const invalidIdsRejected = !session.queueSub('home', 'missing-player', incoming.id) && !session.queueSub('home', outgoing.player.id, 'missing-bench-player');
  const accepted = session.queueSub('home', outgoing.player.id, incoming.id);
  const duplicateRejected = !session.queueSub('home', outgoing.player.id, session.getBench('home')[1].id);
  session.step();
  const applied = session.getSlots('home').some((slot) => slot.player.id === incoming.id);
  check('Sub requests validate both squads, reject dismissed/duplicate participants and apply one legal exchange', dismissedRejected && invalidIdsRejected && accepted && duplicateRejected && applied && session.subsLeft('home') === 4 && session.windowsLeft('home') === 2, `dismissedRejected=${dismissedRejected} invalidRejected=${invalidIdsRejected} accepted=${accepted} duplicateRejected=${duplicateRejected} applied=${applied} rights=${session.subsLeft('home')} windows=${session.windowsLeft('home')}`);
}

{
  const session = new MatchSession({ ...baseInput, seed: 82030 });
  let normalSubstitutions = 0;
  let lastSubMinute = -1;
  let normalWindowsUsed = true;
  for (let window = 0; window < 3; window++) {
    const targetMinute = window === 0 ? 0 : lastSubMinute + 3;
    while (session.getMinute() < targetMinute && !session.done) session.step();
    const outgoing = session.getSlots('home').find((slot) => slot.slotGroup !== 'GK' && isActiveOnPitch(slot));
    const incoming = session.getBench('home')[0];
    const queued = !!outgoing && !!incoming && session.queueSub('home', outgoing.player.id, incoming.id);
    const events = session.step();
    normalSubstitutions += events.filter((event) => event.side === 'home' && event.kind === 'sub').length;
    lastSubMinute = session.getMinute();
    if (!queued || session.windowsLeft('home') !== 2 - window) normalWindowsUsed = false;
  }
  while (session.getMinute() === lastSubMinute && !session.done) session.step();
  const outOfWindowRejected = !session.queueSub('home', session.getSlots('home').find((slot) => slot.slotGroup !== 'GK')!.player.id, session.getBench('home')[0].id);
  while (session.getMinute() < 45 && !session.done) session.step();
  const slotsAtBreak = session.getSlots('home').filter((slot) => slot.slotGroup !== 'GK' && isActiveOnPitch(slot));
  const benchAtBreak = session.getBench('home');
  const htA = slotsAtBreak[0], htB = slotsAtBreak[1];
  const halfTimeFirst = !!htA && !!benchAtBreak[0] && session.queueSub('home', htA.player.id, benchAtBreak[0].id);
  const halfTimeSecond = !!htB && !!benchAtBreak[1] && session.queueSub('home', htB.player.id, benchAtBreak[1].id);
  const sixthRejected = !session.queueSub('home', slotsAtBreak[2]?.player.id ?? '', benchAtBreak[2]?.id ?? '');
  const halfEvents = session.step();
  const halfApplied = halfEvents.filter((event) => event.side === 'home' && event.kind === 'sub').length;
  const legalFiveApplied = normalSubstitutions === 3 && halfApplied === 2 && session.subsLeft('home') === 0 && session.windowsLeft('home') === 0;
  check('IFAB 5-right/3-window limit counts one opportunity for bundled changes and keeps half-time free', normalWindowsUsed && outOfWindowRejected && halfTimeFirst && halfTimeSecond && sixthRejected && legalFiveApplied, `normal=${normalSubstitutions} windows=${normalWindowsUsed ? '3/3' : 'invalid'} outsideRejected=${outOfWindowRejected} halfTime=${halfApplied}/2 rights=${session.subsLeft('home')} windowsLeft=${session.windowsLeft('home')} sixthRejected=${sixthRejected}`);
}

{
  const session = new MatchSession({ ...baseInput, seed: 82040 });
  const player = session.getSlots('home').find((slot) => slot.slotGroup !== 'GK')!;
  player.injured = true; player.liveFitness = 30;
  const startSecond = session.getElapsedSeconds();
  const accepted = session.waitForInjuredPlayer(player.player.id);
  const duplicateRejected = !session.waitForInjuredPlayer(player.player.id);
  let returned = false, stayedOutOfActorChain = true;
  for (let i = 0; i < 8 && !returned && !session.done; i++) {
    const events = session.step();
    if (player.injured && session.getBallState().activeIds.includes(player.player.id)) stayedOutOfActorChain = false;
    returned = events.some((event) => event.playerId === player.player.id && event.text.includes('tedavi sonrası oyuna döndü'));
  }
  const elapsedReturn = session.getElapsedSeconds() - startSecond;
  check('Injury wait is one-shot, keeps the player out for at least 120 seconds, then restores active fitness', accepted && duplicateRejected && returned && stayedOutOfActorChain && elapsedReturn >= 120 && player.liveFitness >= 45, `accepted=${accepted} duplicateRejected=${duplicateRejected} returned=${returned} actorExcluded=${stayedOutOfActorChain} wait=${elapsedReturn}s fitness=${player.liveFitness}`);
}

for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-WAVE6: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
