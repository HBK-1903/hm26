import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { autoLineup, teamProfile } from '../src/engine/profiles';
import { MatchSession } from '../src/engine/session';
import { aiDefaultTactic, chooseAiTactic } from '../src/engine/tactics';

let failures = 0;
const check = (name: string, pass: boolean, detail: string) => {
  console.log(`${pass ? '✅' : '❌'} ${name} | ${detail}`);
  if (!pass) failures++;
};
const strong = CLUBS.reduce((best, club) => club.strength > best.strength ? club : best, CLUBS[0]);
const weak = CLUBS.reduce((best, club) => club.strength < best.strength ? club : best, CLUBS[0]);
const WORLD = 20260803;

// Relative club quality is authoritative even when legacy call sites pass the opponent's strength.
{
  const favorite = aiDefaultTactic(strong, weak, weak.strength);
  const underdog = aiDefaultTactic(weak, strong, strong.strength);
  check('AI baseline accounts for actual club strength', favorite.formation === '4-3-3' && underdog.formation === '4-4-2'
    && underdog.plan === 'hizliKontra' && underdog.passRisk === 'direct', `favorite=${favorite.formation}/${favorite.plan} underdog=${underdog.formation}/${underdog.plan}`);
}

// Scoreline utility: chase when behind, protect a late lead, and discount all-out press when tired.
{
  const trailing = chooseAiTactic(strong, weak, { minute: 80, goalsFor: 0, goalsAgainst: 1, averageFitness: 90 });
  const protecting = chooseAiTactic(strong, weak, { minute: 80, goalsFor: 1, goalsAgainst: 0, averageFitness: 90 });
  const tired = chooseAiTactic(strong, weak, { minute: 80, goalsFor: 0, goalsAgainst: 1, averageFitness: 35 });
  const tied = chooseAiTactic(strong, weak, { minute: 55, goalsFor: 0, goalsAgainst: 0, averageFitness: 90 });
  check('AI utility adapts to score urgency and fitness', trailing.plan === 'yuksekPres' && trailing.defLine === 'high'
    && protecting.plan === 'dusukBlok' && protecting.tempo === 'low'
    && tired.plan === 'dengeli' && tired.press === 'high'
    && tied.plan === 'dengeli' && tied.name === 'AI: Dengeli',
    `behind=${trailing.name}/${trailing.plan} lead=${protecting.name}/${protecting.plan} tired=${tired.name}/${tired.plan} tied=${tied.plan}`);
}

// Tactical instructions must causally alter the matching team-profile channels.
{
  const squad = genSquad(strong, WORLD);
  const baseline = aiDefaultTactic(strong, weak);
  const slots = autoLineup(squad, baseline.formation).slots;
  const ctx = { home: true, derby: false };
  const base = teamProfile(slots, baseline, ctx);
  const wing = teamProfile(slots, { ...baseline, plan: 'kanat', direction: 'left', width: 78, fbAdvanced: true }, ctx);
  const central = teamProfile(slots, { ...baseline, direction: 'center' }, ctx);
  const pressing = teamProfile(slots, { ...baseline, plan: 'yuksekPres', press: 'high' }, ctx);
  const direct = teamProfile(slots, { ...baseline, passRisk: 'direct' }, ctx);
  const causal = wing.wideAttack > base.wideAttack && central.centralAttack > base.centralAttack
    && pressing.press > base.press && direct.transition > base.transition;
  check('Width, focus, press and pass risk have causal profile effects', causal,
    `wide=${base.wideAttack.toFixed(2)}→${wing.wideAttack.toFixed(2)} central=${base.centralAttack.toFixed(2)}→${central.centralAttack.toFixed(2)} press=${base.press.toFixed(2)}→${pressing.press.toFixed(2)} transition=${base.transition.toFixed(2)}→${direct.transition.toFixed(2)}`);
}

// Live AI sides adapt only at defined late-match decision bands; the manager-controlled side is untouched.
{
  let found: { seed: number; events: string; minutes: number } | null = null;
  for (let seed = 880100; seed < 880140 && !found; seed++) {
    const session = new MatchSession({
      homeClub: strong, awayClub: weak, homeSquad: genSquad(strong, WORLD), awaySquad: genSquad(weak, WORLD),
      homeTactic: aiDefaultTactic(strong, weak), awayTactic: aiDefaultTactic(weak, strong),
      seed, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
    });
    session.finishNow();
    const changes = session.getCoreEvents().filter((event) => event.type === 'TACTIC_CHANGE');
    if (changes.length) found = { seed, events: changes.map((event) => `${event.side}:${event.tacticId}`).join(','), minutes: changes.map((event) => event.minute).join(',') };
    if (changes.some((event) => event.side === 'home')) found = { seed: -1, events: 'manager-side-overridden', minutes: 'invalid' };
  }
  check('MatchSession logs deterministic AI tactic changes without overriding the user side', !!found && found.seed > 0
    && !found.events.includes('manager-side-overridden')
    && found.minutes.split(',').every((value) => [65, 66, 80, 81].includes(Number(value))),
    found ? `seed=${found.seed} changes=${found.events} minutes=${found.minutes}` : 'no AI tactical switch in deterministic fixture sweep');
}

console.log(`\nMATCH-CORE-WAVE8: ${failures ? `${4 - failures} passed, ${failures} failed` : '4/4'}`);
if (failures) process.exit(1);
