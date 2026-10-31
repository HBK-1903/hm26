// QA only: production provider, tactics, match lineup and league table.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { GameProvider, useGame } from '../src/store/game';
import { TacticsScreen } from '../src/screens/Tactics';
import { CompsScreen } from '../src/screens/Comps';
import { StatsHub } from '../src/screens/StatsHub';
import { SquadScreen } from '../src/screens/Squad';
import { autoLineup } from '../src/engine/profiles';
import { boardToEngine, engineToBoard } from '../src/engine/lineupOrder';
import { clubById } from '../src/data/clubs';

const query = new URLSearchParams(location.search);
const scenario = query.get('scenario') ?? 'normal';
document.documentElement.classList.add(query.get('theme') === 'dark' ? 'm26-dark' : 'm26-light');
const career: any = {
  slot: 1, manager: { name: 'QA Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 45 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};
function Seed({ ready }: { ready: (snapshot: any) => void }) {
  const g = useGame();
  React.useEffect(() => {
    const snapshot: any = g.snapshotForBackup();
    // Real player-club overrides mimic two arrivals, making a 24-player squad.
    const arrivals = [...g.squads['ist_halic']].sort((a, b) => a.ratings.gen - b.ratings.gen).slice(0, 2);
    for (const player of arrivals) snapshot.playerClub[player.id] = g.career.clubId;
    const squad = [...g.mySquad, ...arrivals.map((p) => ({ ...p, clubId: g.career.clubId }))];
    const plan = snapshot.tactics[0];
    const xi = autoLineup(squad, plan.formation);
    const board = engineToBoard(plan.formation, xi.slots.map((slot) => slot.player.id));
    if (scenario === 'duplicate') {
      const duplicate = squad.find((p) => !board.includes(p.id))!;
      snapshot.extraSquads[g.career.clubId] = [duplicate];
      (window as any).__duplicatePlayer = duplicate.id;
    }
    if (scenario === 'stale') {
      plan.customLineup = [...board];
      plan.customLineup[0] = 'sold-player-not-in-squad';
      plan.customLineup[1] = board[2]; // duplicate/stale saved lineup
      plan.customBench = [board[2], 'sold-player-not-in-squad', xi.bench[0]?.id, xi.bench[0]?.id];
    }
    if (scenario === 'unavailable' || scenario === 'risk') {
      const reserves = squad.filter((p) => !board.includes(p.id));
      snapshot.playerPatch[reserves[0].id] = { ...snapshot.playerPatch[reserves[0].id], injuredDays: 20 };
      snapshot.playerPatch[reserves[1].id] = { ...snapshot.playerPatch[reserves[1].id], suspendedMatches: 2 };
      if (scenario === 'risk') snapshot.riskPlayIds = [reserves[0].id];
      (window as any).__injuredIds = [reserves[0].id, reserves[1].id];
    }
    if (scenario === 'ratings' || scenario === 'ratings3') {
      // Only two/three detailed reports have ratings; the remaining AI apps do not.
      const player = squad.find((p) => p.group !== 'GK')!;
      const ratedGames = scenario === 'ratings3' ? 3 : 2;
      snapshot.playerStats = { [player.id]: { playerId: player.id, clubId: g.career.clubId, apps: 12, goals: 1, assists: 1, yellows: 0, reds: 0, ratingSum: ratedGames * 7 } };
      snapshot.matchReports = Array.from({ length: ratedGames }, (_, i) => ({  id: `qa-rating-${i}`, day: 10 + i, seasonNo: 1, comp: 'lig', homeId: g.career.clubId, awayId: 'ist_halic', hg: 0, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0, playerRows: { [player.id]: { min: 90, g: 0, a: 0, yellow: 0, red: 0, rating: 7, posGroup: player.group } }, playerClubIds: { [player.id]: g.career.clubId } }));
      (window as any).__ratingPlayer = player.id;
    }
    // Deterministic, nonzero table/form data for every league without playing matches.
    for (const league of Object.keys(snapshot.table)) {
      snapshot.table[league] = snapshot.table[league].map((row: any, i: number) => ({ ...row, p: 10 + i, w: 8, d: 1, l: 1 + i, gf: 20 + i, ga: 10 + i * 2, pts: 25 }));
    }
    const marked: Record<string, number> = {};
    snapshot.fixtures = snapshot.fixtures.map((f: any) => {
      if (marked[f.league] >= 18) return f;
      marked[f.league] = (marked[f.league] ?? 0) + 1;
      return { ...f, played: true, hg: marked[f.league] % 3, ag: (marked[f.league] + 1) % 3 };
    });
    ready(snapshot);
  }, []);
  return <div>Hazırlanıyor…</div>;
}
function Screens() {
  const g = useGame();
  const [screen, setScreen] = React.useState<'tactics' | 'comps' | 'stats' | 'squad'>('tactics');
  (window as any).__rosterModel = () => {
    const plan = g.tactics[0];
    const engine = autoLineup(g.mySquad, plan.formation, plan.customLineup?.length === 11 ? boardToEngine(plan.formation, plan.customLineup) : undefined, new Set(g.riskPlayIds ?? []), plan.customBench);
    return {
      squad: g.mySquad.map((p) => ({ id: p.id, name: p.name, group: p.group, injuredDays: p.injuredDays, suspendedMatches: p.suspendedMatches })),
      lineup: engineToBoard(plan.formation, engine.slots.map((slot) => slot.player.id)),
      matchBench: engine.bench.map((p) => p.id), formation: plan.formation,
      table: Object.fromEntries(Object.entries(g.table).map(([league, rows]) => [league, rows.map((row) => ({ ...row, name: clubById(row.clubId).name, short: clubById(row.clubId).short }))])),
    };
  };
  (window as any).__rosterSnapshot = () => JSON.stringify(g.snapshotForBackup());
  return <div style={{ height: '100dvh', maxWidth: 430, margin: 'auto', display: 'flex', flexDirection: 'column' }}>
    <nav style={{ display: 'flex', gap: 10, padding: '6px', background: 'var(--c-elevated)' }}>
      <button onClick={() => setScreen('tactics')}>Test: Taktik</button><button onClick={() => setScreen('comps')}>Test: Müsabaka</button>
      <button onClick={() => setScreen('stats')}>Test: İstatistik</button><button onClick={() => setScreen('squad')}>Test: Kadro</button>
    </nav>
    <div style={{ flex: 1, minHeight: 0 }}>
      {screen === 'tactics' ? <TacticsScreen /> : screen === 'comps' ? <CompsScreen /> : screen === 'stats' ? <StatsHub /> : <SquadScreen goXI={() => setScreen('tactics')} />}
    </div>
  </div>;
}
function App() {
  const [snapshot, setSnapshot] = React.useState<any>(null);
  return snapshot ? <GameProvider key="fixture" career={snapshot.career} snapshot={snapshot}><Screens /></GameProvider> : <GameProvider key="seed" career={career}><Seed ready={setSnapshot} /></GameProvider>;
}
createRoot(document.getElementById('root')!).render(<App />);
