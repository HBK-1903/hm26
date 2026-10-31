// QA-only entry point using the real IndexedDB provider and application shell.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { GameProvider, useGame } from '../src/store/game';
import { readSave, parseImportFile, exportSaveFile } from '../src/store/persist';
import { AppShell } from '../src/screens/Shell';
import type { Screen } from '../src/types';
import { MatchSession } from '../src/engine/session';
import { buildEngineInput, matchEventsToDemo } from '../src/engine/adapter';
import { aiDefaultTactic } from '../src/engine/tactics';
import { clubById } from '../src/data/clubs';
import { makeLiveCheckpoint, type LiveMatchViewState } from '../src/engine/liveCheckpoint';
import { deterministicReplayHash } from '../src/engine/core/commandLog';

const career: any = {
  slot: 1, manager: { name: 'Canlı QA', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 45 },
  clubId: 'denizli_yesilova', seed: 12345, day: 6, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: true, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};
function Shell() {
  const g = useGame();
  const [pendingScreen, setPendingScreen] = React.useState<Screen | null>(null);
  (window as any).__liveStore = {
    snapshot: () => g.snapshotForBackup(),
    save: () => g.saveNow(),
    read: () => readSave(g.career.slot),
    restore: (blob: any) => g.restoreBackup(blob),
    corruptCheckpointHash: (file: { blob: { liveMatchCheckpoint: Record<string, unknown> } }) => {
      const checkpoint = file.blob.liveMatchCheckpoint;
      checkpoint.stateHash = '00000000';
      const { checksum: _old, ...body } = checkpoint;
      checkpoint.checksum = deterministicReplayHash(body);
      return file;
    },
    // Generate real motor events, then use the production checkpoint API and UI
    // to exercise rare decision windows without fabricating a simulation result.
    seedDecision: async (kind: 'injury' | 'var') => {
      const fixture = g.nextFixture;
      if (!fixture || fixture.day !== g.career.day) throw new Error('No match today');
      const home = clubById(fixture.homeId), away = clubById(fixture.awayId);
      const side = fixture.homeId === g.career.clubId ? 'home' : 'away';
      for (let seed = 61000; seed < 61500; seed++) {
        const session = new MatchSession(buildEngineInput({ homeClub: home, awayClub: away,
          homeSquad: g.squads[home.id], awaySquad: g.squads[away.id],
          homeTactic: side === 'home' ? g.tactics[0] : aiDefaultTactic(home, away), awayTactic: side === 'away' ? g.tactics[0] : undefined,
          seed, settings: g.career.settings, derby: home.derby === away.id, userSide: side,
          challengeClubId: g.career.clubId, challengePoints: g.career.manager.challengePoints, riskIds: g.riskPlayIds ?? [] }));
        while (!session.done) {
          const fresh = session.step();
          const last = matchEventsToDemo(fresh).at(-1);
          const injured = last?.kind === 'injury' && last.side === side && last.playerId && session.getSlots(side).some((slot) => slot.player.id === last.playerId && slot.injured);
          if (session.done || !last || (kind === 'injury' ? !injured : last.kind !== 'var')) continue;
          const events = matchEventsToDemo(session.getEvents());
          const view: LiveMatchViewState = { events, speed: 'x4', paused: true, activeTab: 'pitch', pitchView: 'pitch', heatEnabled: false, heatTeam: 'all', heatSamples: [],
            showTouchline: false, showTeamTalk: false, teamTalkPromptShown: events.some((event) => event.kind === 'half' && event.minute === 45), crowdShoutUsed: false,
            decision: last, lastDecisionShown: `${last.minute}:${last.kind}:${last.text}`, showSubPicker: false, showTacticPicker: false,
            coachFired: [], phase: 'live', interviewChoice: null, managerSuspendedAtStart: false, managerCards: 0 };
          const cp = makeLiveCheckpoint(session, fixture, g.seasonNo, 0, view);
          if (!await g.saveLiveCheckpoint(cp)) throw new Error('Could not save decision');
          return { seed, step: cp.step, decision: last };
        }
      }
      throw new Error(`No real ${kind} found`);
    },
    exportRoundTrip: async () => {
      const existing = await readSave(g.career.slot);
      if (!existing) throw new Error('No saved slot');
      return parseImportFile(await exportSaveFile(g.snapshotForBackup(), existing.meta).text()).blob;
    },
  };
  return <AppShell pendingScreen={pendingScreen} setPendingScreen={setPendingScreen} />;
}
if (!location.hash) history.replaceState({ hm26s: 'matchPrep' }, '', '#matchPrep');
const saved = await readSave(1);
createRoot(document.getElementById('root')!).render(
  <GameProvider career={saved?.blob.career ?? career} snapshot={saved?.blob} initialUpdatedAt={saved?.meta.updatedAt}><Shell /></GameProvider>,
);
