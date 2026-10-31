// Deterministic checkpoint/replay tests against the production engine, not a mock.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, type MatchInput, type SubManager } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { liveSessionHash, makeLiveCheckpoint, restoreLiveCheckpoint, validLiveCheckpoint, type LiveMatchViewState } from '../src/engine/liveCheckpoint';
import { deterministicReplayHash } from '../src/engine/core/commandLog';
import type { DemoFixture } from '../src/types';

let passed = 0, failed = 0;
const check = (name: string, ok: unknown, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const copy = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));
const home = CLUBS[0], away = CLUBS[12];
const fixture: DemoFixture = { day: 3, round: 1, homeId: home.id, awayId: away.id, comp: 'lig', played: false };
const view: LiveMatchViewState = {
  events: [], speed: 'x2', paused: true, activeTab: 'pitch', pitchView: 'pitch', heatEnabled: false, heatTeam: 'all', heatSamples: [],
  showTouchline: false, showTeamTalk: false, teamTalkPromptShown: false, crowdShoutUsed: false, decision: null, lastDecisionShown: '',
  showSubPicker: false, showTacticPicker: false, coachFired: [], phase: 'live', interviewChoice: null, managerSuspendedAtStart: false, managerCards: 0,
};
function input(seed: number): MatchInput {
  return { homeClub: home, awayClub: away, homeSquad: genSquad(home, 45001), awaySquad: genSquad(away, 45002), homeTactic: aiDefaultTactic(home, away), awayTactic: aiDefaultTactic(away, home), seed, goalPace: 'dengeli', randomness: 'normal', userSide: 'home' };
}
const checkpoint = (s: MatchSession, v = view) => copy(makeLiveCheckpoint(s, fixture, 1, 0, v));

{
  const original = new MatchSession(input(45003));
  const first = original.getSlots('home').find((slot) => slot.slotGroup !== 'GK')!;
  const substitute = original.getBench('home')[0];
  const accepted = original.queueTactic('home', { ...original.getTactic('home'), tempo: 'high' }) && original.queueSub('home', first.player.id, substitute.id) && original.useShout('home', 'pump').ok;
  const cp = checkpoint(original);
  const restored = restoreLiveCheckpoint(cp, 1, home.id, 3);
  check('Sıfırıncı adımda kabul edilen bekleyen taktik, değişiklik ve talimat korunur', accepted && cp.step === 0 && cp.commands.length === 3 && liveSessionHash(original) === liveSessionHash(restored));
  original.step(); restored.step();
  check('Bekleyen değişiklik ve taktik bir sonraki gerçek motor sınırında aynı uygulanır', liveSessionHash(original) === liveSessionHash(restored) && original.getSlots('home').some((slot) => slot.player.id === substitute.id));
  for (let i = 0; i < 15; i++) original.step();
  original.queueTactic('home', { ...original.getTactic('home'), width: 42 });
  const atTarget = checkpoint(original);
  const targetReplay = restoreLiveCheckpoint(atTarget, 1, home.id, 3);
  check('Hedef adımın kendisinde verilen normal komut da kaybolmaz', atTarget.commands.at(-1)?.issuedAtStep === atTarget.step && liveSessionHash(original) === liveSessionHash(targetReplay));
  original.finishNow(); targetReplay.finishNow();
  check('Yeniden kurulan maçın kalanı aynı skor, oyuncu istatistiği ve olayları üretir', JSON.stringify(original.toResult()) === JSON.stringify(targetReplay.toResult()));
  const finished = checkpoint(original, { ...view, phase: 'interview' });
  check('Son düdükteki maç yeniden kurulur, otomatik röportaja geçmez', restoreLiveCheckpoint(finished, 1, home.id, 3).done && finished.view.phase === 'interview');
  check('Kariyer, gün, sezon, checksum ve komut bozulması sessizce kabul edilmez', throws(() => restoreLiveCheckpoint(atTarget, 2, home.id, 3)) && throws(() => restoreLiveCheckpoint(atTarget, 1, away.id, 4)) && !validLiveCheckpoint({ ...atTarget, step: atTarget.step + 1 }) && !validLiveCheckpoint({ ...atTarget, commands: [] }));
  const altered = copy(atTarget); altered.stateHash = '00000000';
  const { checksum: _old, ...body } = altered; altered.checksum = deterministicReplayHash(body);
  check('Checksum doğru olsa bile motor çıktısı uyuşmayan tekrar açıkça reddedilir', throws(() => restoreLiveCheckpoint(altered, 1, home.id, 3)));
  const wrongSide = copy(atTarget); wrongSide.input.userSide = 'away';
  const { checksum: _wrongSideChecksum, ...wrongSideBody } = wrongSide; wrongSide.checksum = deterministicReplayHash(wrongSideBody);
  check('Menajer tarafı kariyer kulübüyle uyuşmayan maç geri açılmaz', validLiveCheckpoint(wrongSide) && throws(() => restoreLiveCheckpoint(wrongSide, 1, home.id, 3)));

  const mutations: ((cp: any) => void)[] = [
    (cp) => { cp.view.events = [null]; },
    (cp) => { cp.view.events = [{ minute: 1, kind: 'goal', text: 'bozuk', path: 123 }]; },
    (cp) => { cp.view.heatSamples = [{ x: 1, y: null, side: 'home' }]; },
    (cp) => { cp.view.activeTab = 'invalid'; },
    (cp) => { cp.view.paused = 'true'; },
    (cp) => { cp.view.decision = { minute: 5, kind: 'injury', text: 'olmayan olay' }; },
    (cp) => { cp.view.interviewChoice = { id: 'x', label: 'x', detail: 'x', quote: 'x', effect: { fanTrust: 999 } }; },
    (cp) => { cp.fixture.played = true; },
    (cp) => { cp.fixture.comp = 'bozuk'; },
    (cp) => { cp.input.schema = 'bozuk'; },
    (cp) => { cp.input.homeSquad = null; },
    (cp) => { cp.commands[0].payload = null; cp.commandHash = deterministicReplayHash(cp.commands); },
    (cp) => { cp.commands[0].issuedAtStep = 999; cp.commandHash = deterministicReplayHash(cp.commands); },
  ];
  let rejected = 0;
  for (const mutate of mutations) {
    const bad: any = copy(atTarget); mutate(bad);
    const { checksum: _checksum, ...body } = bad; bad.checksum = deterministicReplayHash(body);
    if (!validLiveCheckpoint(bad)) rejected++;
  }
  check('Checksum yeniden hesaplansa da bozuk olay, ekran, karar ve komut verileri reddedilir', rejected === mutations.length, `${rejected}/${mutations.length}`);
}

{
  let carded: MatchSession | undefined;
  for (let seed = 56000; seed < 56100 && !carded; seed++) {
    const match = new MatchSession(input(seed));
    while (!match.done && !carded) {
      match.step();
      if (!match.done && match.getTouchlineState('home').protestAvailable) {
        if (match.protest('home').carded) carded = match;
      }
    }
  }
  if (carded) {
    const cp = checkpoint(carded, { ...view, managerCards: 1 });
    const restored = restoreLiveCheckpoint(cp, 1, home.id, 3);
    const bad = checkpoint(carded, { ...view, managerCards: 0 });
    check('Gerçek kartlı itiraz yeniden oynatılır ve menajer kartı motorla çapraz doğrulanır', liveSessionHash(restored) === liveSessionHash(carded) && throws(() => restoreLiveCheckpoint(bad, 1, home.id, 3)), `seed=${cp.input.seed}`);
  } else check('Gerçek kartlı itiraz test senaryosu bulundu', false);
}

{
  let session!: MatchSession;
  let calls = 0;
  const manager: SubManager = {
    takeTacticRequest(side) { if (side === 'home' && ++calls === 2) return { plan: { ...input(1).homeTactic, width: 40 } }; return null; },
    takeSubRequest(side) { if (side !== 'home' || calls !== 2) return null; const out = session.getSlots('home').find((slot) => slot.slotGroup !== 'GK'); const sub = session.getBench('home')[0]; return out && sub ? { outId: out.player.id, inId: sub.id } : null; },
  };
  session = new MatchSession({ ...input(45003), subMgr: manager });
  for (let i = 0; i < 8; i++) session.step();
  session.queueTactic('home', { ...session.getTactic('home'), tempo: 'high' });
  const cp = checkpoint(session);
  const restored = restoreLiveCheckpoint(cp, 1, home.id, 3);
  check('Eski sınır komutları ve aynı adımdaki yeni komutlar birlikte yeniden oynatılır', cp.commands.some((c) => c.payload.source === 'legacy-boundary') && liveSessionHash(session) === liveSessionHash(restored));
}

{
  let cases = 0, bad = 0, talks = 0;
  for (let seed = 55000; seed < 55040; seed++) {
    const original = new MatchSession(input(seed));
    while (!original.done) {
      original.step();
      if (!original.done && original.getMinute() >= 45 && original.getMinute() <= 46 && !talksForSession(original)) {
        if (original.applyTeamTalk('home', 'calm')) talks++;
      }
      if (original.getStepCount() % 11 !== 0 && !original.done) continue;
      cases++;
      try { const restored = restoreLiveCheckpoint(checkpoint(original), 1, home.id, 3); if (liveSessionHash(original) !== liveSessionHash(restored)) bad++; }
      catch { bad++; }
    }
  }
  check('40 farklı maçta devre dahil yüzlerce ara adım ve son düdük doğrulanır', cases > 200 && bad === 0 && talks > 0, `${cases} checkpoint, ${talks} devre konuşması, ${bad} hata`);
}
function talksForSession(s: MatchSession) { return s.getCommandLog().some((c) => c.type === 'TEAM_TALK'); }

console.log(`\n${passed}/${passed + failed} canlı checkpoint motor kontrolü geçti.`);
if (failed) process.exitCode = 1;
