// Production simulation isolation, adapter parity and deterministic replay.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, simulateMatch, type MatchInput, type SubManager } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { toSimulationInput } from '../src/engine/adapters/simulationInput';
import { SimulationCore } from '../src/engine/core/simulation';
import { replaySimulation } from '../src/engine/core/replayCore';
import { deterministicReplayHash } from '../src/engine/core/commandLog';

let passed = 0, failed = 0;
const check = (name: string, condition: unknown, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const clone = <T>(input: T): T => JSON.parse(JSON.stringify(input));
const home = CLUBS[0], away = CLUBS[12];
const input: MatchInput = { homeClub: home, awayClub: away, homeSquad: genSquad(home, 45001), awaySquad: genSquad(away, 45002), homeTactic: aiDefaultTactic(home, away), awayTactic: aiDefaultTactic(away, home), seed: 45003, goalPace: 'dengeli', randomness: 'normal', userSide: 'home' };

// Traverse actual runtime imports, not the old Wave-2 skeleton or the compatibility facade.
const seen = new Set<string>();
const violations: string[] = [];
function inspect(file: string) {
  if (seen.has(file)) return;
  seen.add(file);
  const source = readFileSync(file, 'utf8');
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (/\b(?:window|document|localStorage|indexedDB|setTimeout|setInterval|requestAnimationFrame)\b|Math\.random\s*\(|Date\.now\s*\(/.test(withoutComments)) violations.push(`${file}: browser/time/random global`);
  for (const line of source.split('\n')) {
    if (/^\s*import\s+type\b/.test(line)) continue;
    const match = line.match(/^\s*(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/);
    if (!match) continue;
    const path = match[1];
    if (!path.startsWith('.')) { violations.push(`${file}: ${path}`); continue; }
    const candidate = resolve(dirname(file), path);
    if (/\/(?:screens|store|components|adapters)\//.test(candidate) || /\/(?:session|engine)$/.test(candidate)) { violations.push(`${file}: ${path}`); continue; }
    const dependency = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}/index.ts`].find(existsSync);
    if (!dependency) violations.push(`${file}: missing ${path}`); else inspect(dependency);
  }
}
inspect(resolve('src/engine/core/simulation.ts')); inspect(resolve('src/engine/core/replayCore.ts'));
check('Çalışan simülasyon ve tekrar oynatma React/DOM, depolama ve gerçek saatten bağımsızdır', typeof (globalThis as any).window === 'undefined' && violations.length === 0, `${seen.size} dosya; ${violations.join(' | ') || 'yasak bağımlılık yok'}`);

{
  const mutable = clone(input);
  const original = clone(mutable);
  const core = new SimulationCore(toSimulationInput(mutable));
  const snapshot = core.getInput();
  const before = snapshot.homeSquad[0].ratings.gen;
  mutable.homeSquad[0].ratings.gen = 1;
  mutable.homeTactic.width = 1;
  mutable.homeClub.name = 'Dışarıdan değişti';
  check('Üretim girdisi callback içermeyen sürümlü, derin kopya ve dondurulmuş bir anlık görüntüdür', snapshot.schema === 'hm26-simulation-v1' && !('subMgr' in snapshot) && Object.isFrozen(snapshot) && Object.isFrozen(snapshot.homeSquad[0].ratings) && snapshot.homeSquad[0].ratings.gen === before && snapshot.homeTactic.width === original.homeTactic.width && snapshot.homeClub.name === original.homeClub.name);
  check('Kaynak veri sonradan değişse de aynı maç sonucu korunur', JSON.stringify(core.finishNow()) === JSON.stringify(new SimulationCore(toSimulationInput(original)).finishNow()));
  const draft = toSimulationInput(original);
  check('Bozuk şema, aynı rakip, geçersiz seed ve callback içeren çekirdek girdi reddedilir', throws(() => new SimulationCore({ ...draft, schema: 'wrong' } as any)) && throws(() => new SimulationCore({ ...draft, awayClub: draft.homeClub })) && throws(() => new SimulationCore({ ...draft, seed: NaN })) && throws(() => new SimulationCore({ ...draft, callback: () => {} } as any)));
}

{
  const core = new SimulationCore(toSimulationInput(input));
  const slot = core.getSlots('home')[0]; const oldFitness = slot.liveFitness;
  slot.liveFitness = 0; slot.sentOff = true; if (slot.offs) slot.offs.g = 99;
  const bench = core.getBench('home'); const benchCount = bench.length; bench.splice(0, bench.length);
  const tactic = core.getTactic('home'); tactic.width = 1;
  const stats = core.getStats(); stats.playerRows[slot.player.id].g = 99;
  const event = core.getEvents()[0]; event.text = 'Dışarıdan değişiklik';
  check('Kadro, yedek, taktik, istatistik ve sunum görünümü motorun iç durumunu değiştiremez', core.getSlots('home')[0].liveFitness === oldFitness && !core.getSlots('home')[0].sentOff && core.getBench('home').length === benchCount && core.getTactic('home').width !== 1 && core.getStats().playerRows[slot.player.id].g === 0 && core.getEvents()[0].text !== event.text);
  try { (core as any).done = true; } catch { /* readonly property in strict mode */ }
  check('Dış kod bitiş durumunu elle değiştiremez', !core.done);
  const started = core.beginStep();
  const wrongOrderRejected = started.ready && throws(() => core.completeStep()) && throws(() => core.beginStep());
  if (started.ready) { core.applyTacticsBoundary(); core.applySubstitutionBoundary('home'); core.applySubstitutionBoundary('away'); core.completeStep(); }
  check('Çekirdek işlem sınırlarını sıra dışı veya yinelenen adımlara karşı korur', wrongOrderRejected);
  core.finishNow();
  const first = core.toResult();
  first.stats.hg = 999; first.events[0].text = 'Bozuldu';
  const after = core.toResult();
  const beforeExtraStep = core.getCoreEvents().length;
  check('Son düdük tek kez üretilir; sonrasında adım/komut etkisiz ve sonuç görünümü ayrıdır', core.done && core.step().length === 0 && !core.queueTactic('home', input.homeTactic) && core.getCoreEvents().length === beforeExtraStep && core.getCoreEvents().filter((e) => e.type === 'FULL_TIME').length === 1 && after.stats.hg !== 999 && after.events[0].text !== 'Bozuldu');
}

{
  const core = new SimulationCore(toSimulationInput(input));
  const live = new MatchSession(input);
  const coreResult = core.finishNow(), liveResult = live.finishNow(), quickResult = simulateMatch(input);
  check('Doğrudan çekirdek, canlı oturum ve hızlı maç aynı sonucu ve olay günlüğünü üretir', JSON.stringify(coreResult) === JSON.stringify(liveResult) && JSON.stringify(liveResult) === JSON.stringify(quickResult) && JSON.stringify(core.getCoreEvents()) === JSON.stringify(live.getCoreEvents()), `hash=${deterministicReplayHash(coreResult)}`);
}

{
  const original = new MatchSession(input);
  const tactic = clone(input.homeTactic); tactic.tempo = 'high';
  const queued = original.queueTactic('home', tactic);
  tactic.tempo = 'low'; // changing the source after acceptance must not change the replay
  original.useShout('home', 'pump');
  const outgoing = original.getSlots('home').find((slot) => slot.slotGroup !== 'GK')!;
  const incoming = original.getBench('home')[0];
  const substituted = original.queueSub('home', outgoing.player.id, incoming.id);
  original.finishNow();
  const replay = replaySimulation(original.getSimulationInput(), original.getCommandLog());
  check('Kaydedilmiş kullanıcı komutları çekirdekte hem sonucu hem tüm olay günlüğünü tekrarlatır', queued && substituted && JSON.stringify(replay.result) === JSON.stringify(original.toResult()) && JSON.stringify(replay.events) === JSON.stringify(original.getCoreEvents()) && replay.commandHash === original.getCommandLogHash());
  check('Komut saati/sonrası bozulursa sessizce farklı tekrar yapılmaz', throws(() => replaySimulation(original.getSimulationInput(), original.getCommandLog().map((command, index) => index ? command : { ...command, issuedAtSecond: 999 }))) && throws(() => replaySimulation(original.getSimulationInput(), original.getCommandLog().map((command) => ({ ...command, issuedAtStep: 999 })) )));
}

{
  // The tactics screen deliberately clears these optional properties when the
  // user switches back to automatic selection or changes formation.
  const optionalPlan = { ...input.homeTactic, customLineup: undefined, customBench: undefined };
  const live = new MatchSession({ ...input, homeTactic: optionalPlan });
  let accepted = false, replayed = false;
  try {
    accepted = live.queueTactic('home', { ...optionalPlan, tempo: 'high' });
    live.finishNow();
    const commands = clone(live.getCommandLog()); // exercise a real JSON round trip
    const replay = replaySimulation(live.getSimulationInput(), commands);
    replayed = JSON.stringify(replay.result) === JSON.stringify(live.toResult()) && JSON.stringify(replay.events) === JSON.stringify(live.getCoreEvents());
  } catch { /* reported as a failed regression, not an uncaught test abort */ }
  check('Otomatik 11/formasyon sonrası isteğe bağlı boş taktik alanları canlı komutu ve JSON tekrarını bozmaz', accepted && replayed);
  const invalid = new MatchSession(input);
  check('Komutta fonksiyon veya geçersiz sayı hâlâ reddedilir ve deftere yazılmaz', throws(() => invalid.queueTactic('home', { ...optionalPlan, extra: () => {} } as any)) && throws(() => invalid.queueTactic('home', { ...optionalPlan, width: NaN })) && invalid.getCommandLog().length === 0);
}

{
  let session!: MatchSession; let tacticCalls = 0, subCalls = 0;
  const manager: SubManager = {
    takeTacticRequest(side) { if (side === 'home' && ++tacticCalls === 2) return { plan: { ...input.homeTactic, tempo: 'high' } }; return null; },
    takeSubRequest(side) {
      if (side !== 'home') return null;
      if (++subCalls === 1) return { outId: 'missing', inId: 'missing' }; // old adapter consumed invalid requests too
      if (subCalls === 2) { const out = session.getSlots(side).find((slot) => slot.slotGroup !== 'GK'); const sub = session.getBench(side)[0]; if (out && sub) return { outId: out.player.id, inId: sub.id }; }
      return null;
    },
  };
  session = new MatchSession({ ...input, subMgr: manager });
  session.useShout('home', 'pump');
  session.finishNow();
  const commands = session.getCommandLog();
  const legacy = commands.filter((command) => command.payload.source === 'legacy-boundary');
  const replay = replaySimulation(session.getSimulationInput(), commands);
  check('Eski SubManager sınırları çekirdek dışında çalışır; taktik ve geçerli/geçersiz değişiklik istekleri kaydedilip tekrarlanır', legacy.some((c) => c.type === 'TACTIC_CHANGE') && legacy.filter((c) => c.type === 'SUB_REQUEST').length === 2 && JSON.stringify(replay.result) === JSON.stringify(session.toResult()) && JSON.stringify(replay.events) === JSON.stringify(session.getCoreEvents()));
}

console.log(`\n${passed}/${passed + failed} üretim maç çekirdeği kontrolü geçti.`);
if (failed) process.exitCode = 1;
