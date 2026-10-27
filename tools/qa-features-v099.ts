// HM26 v0.9.10 — sağlık/rehberlik/takas/itiraz özellikleri için saf çekirdek QA
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { autoLineup } from '../src/engine/profiles';
import { CLINIC_COST_M, clinicRemainingDays, needleOutcome } from '../src/engine/medical';
import { readFileSync } from 'node:fs';
import { consumeManagerBan, registerManagerYellow } from '../src/engine/discipline';

const out: { name: string; pass: boolean; detail: string }[] = [];
const ok = (name: string, pass: boolean, detail: string) => out.push({ name, pass, detail });
const seed = 931004;
const home = CLUBS[0], away = CLUBS[12];
const squad = genSquad(home, seed);
const opponent = genSquad(away, seed + 3);
const tactic = aiDefaultTactic(home, away, away.strength);

// F1/F2: riskli sakat, onaysızken seçilemez; onayla hem auto hem özel 11'de seçilebilir.
{
  const candidate = squad.filter((p) => p.group !== 'GK').sort((a, b) => b.ratings.gen - a.ratings.gen)[0];
  candidate.injuredDays = 12;
  candidate.injury = { type: 'adale_gerilmesi', name: 'Adale Gerilmesi', daysRemaining: 12, severity: 'hafif', canPlayWithRisk: true };
  const normal = autoLineup(squad, tactic.formation);
  const allowed = autoLineup(squad, tactic.formation, undefined, new Set([candidate.id]));
  const normalExcludes = !normal.slots.some((s) => s.player.id === candidate.id);
  const riskIncludes = allowed.slots.some((s) => s.player.id === candidate.id);
  const custom = normal.slots.map((s) => s.player.id);
  custom[0] = candidate.id;
  const forced = autoLineup(squad, tactic.formation, custom, new Set([candidate.id]));
  const forcedIncludes = forced.slots.some((s) => s.player.id === candidate.id);
  ok('Needle roster gate', normalExcludes && riskIncludes && forcedIncludes,
    `unapproved=${!normalExcludes ? 'unexpectedly played' : 'excluded'} approved=${riskIncludes} customXI=${forcedIncludes}`);
}

// F3: kliniğin para/gün hesabı açıkça test edilir; 14 günden az kalmış sakatlık iyileşir.
{
  const pass = CLINIC_COST_M === 0.3 && clinicRemainingDays(30) === 16 && clinicRemainingDays(14) === 0 && clinicRemainingDays(5) === 0;
  ok('European clinic cost + day arithmetic', pass,
    `cost=₺${CLINIC_COST_M}M(₺300.000) · 30→${clinicRemainingDays(30)}g · 14→${clinicRemainingDays(14)}g · 5→${clinicRemainingDays(5)}g`);
}

// F4: iğne kumarı sabit seed'de tekrarlanabilir; büyük N'de %25 civarı.
{
  let count = 0;
  for (let i = 0; i < 4000; i++) {
    const a = needleOutcome(seed + i), b = needleOutcome(seed + i);
    if (a.aggravated) count++;
    if (a.aggravated !== b.aggravated || a.extraDays !== b.extraDays) throw new Error('needleOutcome deterministic değil');
    if (a.aggravated && (a.extraDays < 14 || a.extraDays > 42)) throw new Error('nüks ek günü 14–42 aralığı dışında');
  }
  const rate = count / 4000;
  ok('Needle reinjury chance and range', rate > 0.23 && rate < 0.27, `nüks=${(rate * 100).toFixed(2)}% (${count}/4000), ek gün 14–42`);
}

// F5: protest requires an adverse decision, grants a +15 profile boost, and commands enforce 10-minute cooldown.
{
  const sess = new MatchSession({ homeClub: home, awayClub: away, homeSquad: squad, awaySquad: opponent, homeTactic: tactic, seed: seed + 10, goalPace: 'dengeli', randomness: 'normal', userSide: 'home' });
  const prof = sess as unknown as { homeProf: { midfield: number }; protestWindowUntil: { home: number } };
  const blocked = sess.protest('home');
  const before = prof.homeProf.midfield;
  prof.protestWindowUntil.home = sess.getMinute() + 2; // adverse referee call opens a short protest window
  const first = sess.protest('home');
  const after = prof.homeProf.midfield;
  const second = sess.protest('home');
  const shout = sess.useShout('home', 'pump');
  const shoutAgain = sess.useShout('home', 'pump');
  const touchline = sess.getTouchlineState('home');
  const pass = !blocked.ok && first.ok && typeof first.carded === 'boolean' && !second.ok && Math.abs(after - Math.min(100, before + 15)) < 1e-6 && shout.ok && !shoutAgain.ok && touchline.pumpActive && touchline.pumpCooldown === 10;
  ok('Adverse-call protest + touchline cooldown', pass, `without-call=${blocked.ok} protest=${first.ok}/${second.ok} midfield=${before.toFixed(1)}→${after.toFixed(1)} pump=${shout.ok}/${shoutAgain.ok} cd=${touchline.pumpCooldown}`);
}

// F6: Phaser'ın canlı kullanacağı saha koordinatı, top sahibi ve hareketli momentum deterministik aralıkta kalır.
{
  const sess = new MatchSession({ homeClub: home, awayClub: away, homeSquad: squad, awaySquad: opponent, homeTactic: tactic, seed: seed + 11, goalPace: 'dengeli', randomness: 'normal', userSide: 'home' });
  for (let i = 0; i < 18; i++) sess.step();
  const ball = sess.getBallState(), momentum = sess.getMomentum();
  const pass = ball.x >= 0 && ball.x <= 100 && ball.y >= 0 && ball.y <= 100 && ball.z >= 0 && (ball.owner === 'home' || ball.owner === 'away') && ball.path.length > 0 && momentum >= 0 && momentum <= 100 && sess.getSecond() >= 0 && sess.getSecond() < 60;
  ok('Live pitch telemetry + five-minute momentum', pass, `ball=${ball.zone}@${ball.x.toFixed(0)},${ball.y.toFixed(0)} z${ball.z} owner=${ball.owner} actors=${ball.activeIds.length} momentum=${momentum}`);
}

// F7: deterministic ceza alanı penaltısında savunma takımı karar anında itiraz penceresi alır.
{
  const ph = genSquad(home, 445), pa = genSquad(away, 446);
  let found: { session: MatchSession; event: ReturnType<MatchSession['step']>[number] } | null = null;
  for (let matchSeed = 99525; matchSeed < 99725 && !found; matchSeed++) {
    const sess = new MatchSession({ homeClub: home, awayClub: away, homeSquad: ph, awaySquad: pa, homeTactic: tactic, seed: matchSeed, goalPace: 'dengeli', randomness: 'normal', userSide: 'home' });
    for (let i = 0; i < 120 && !found; i++) {
      const penalty = sess.step().find((e) => e.text.startsWith('Hakem penaltı verdi'));
      if (penalty) found = { session: sess, event: penalty };
    }
  }
  const defending = found?.event.side === 'home' ? 'away' : 'home';
  const pass = !!found && found.session.canProtest(defending);
  ok('Penalty decision opens adverse-side protest window', pass, found ? `min=${found.event.minute} attacking=${found.event.side} defending-protest=${pass}` : 'no penalty in deterministic fixture seed window');
}

// F8: two manager cautions in-season trigger a one-match ban, consumed once at full time.
{
  const first = registerManagerYellow(0, 0);
  const second = registerManagerYellow(first.managerYellowCards, first.managerSuspendedMatches);
  const consumed = consumeManagerBan(second.managerSuspendedMatches, true);
  const notConsumed = consumeManagerBan(second.managerSuspendedMatches, false);
  const pass = first.managerYellowCards === 1 && !first.banned && second.banned && second.managerYellowCards === 0 && second.managerSuspendedMatches === 1 && consumed === 0 && notConsumed === 1;
  ok('Manager cautions → one-match ban + kickoff consumption', pass, `first=${first.managerYellowCards}/ban:${first.banned} second=${second.managerYellowCards}/ban:${second.banned} matches=${second.managerSuspendedMatches} consumed=${consumed}`);
}

// Static integration guards: keep store/market UI contracts from silently disappearing.
{
  const store = readFileSync(new URL('../src/store/game.tsx', import.meta.url), 'utf8');
  const market = readFileSync(new URL('../src/screens/Market.tsx', import.meta.url), 'utf8');
  const squadUI = readFileSync(new URL('../src/screens/Squad.tsx', import.meta.url), 'utf8');
  const live = readFileSync(new URL('../src/screens/LiveMatch.tsx', import.meta.url), 'utf8');
  const pass = /clinicTreat/.test(store) && /CLINIC_COST_M/.test(store) && /setMentor/.test(store) && /playerClub: \{ \.\.\.cur\.playerClub, \[p\.id\]: myId/.test(store) && /aria-label="Takas oyuncusu"/.test(market) && /Sağlık & Rehberlik/.test(squadUI) && /session\.protest\(mySide\)/.test(live) && /recordManagerYellow/.test(store) && /managerSuspendedMatches/.test(store);
  ok('UI/store wiring: clinic, mentor, trade, protest, manager discipline', pass, `clinic=${/clinicTreat/.test(store)} mentor=${/setMentor/.test(store)} swap=${/aria-label="Takas oyuncusu"/.test(market)} protest=${/session\.protest\(mySide\)/.test(live)} managerBan=${/managerSuspendedMatches/.test(store)}`);
}

for (const r of out) console.log(`${r.pass ? '✅' : '❌'} ${r.name} | ${r.detail}`);
const failed = out.filter((r) => !r.pass);
console.log(`\n${out.length} test · ${failed.length} başarısız`);
if (failed.length) process.exit(1);
