// QA only: production provider, tactics, match lineup and league table.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { GameProvider, useGame } from '../src/store/game';
import { readSave } from '../src/store/persist';
import { TacticsScreen } from '../src/screens/Tactics';
import { CompsScreen } from '../src/screens/Comps';
import { StatsHub } from '../src/screens/StatsHub';
import { SquadScreen } from '../src/screens/Squad';
import { NewsroomScreen } from '../src/screens/Newsroom';
import { autoLineup } from '../src/engine/profiles';
import { boardToEngine, engineToBoard } from '../src/engine/lineupOrder';
import { clubById } from '../src/data/clubs';
import { MarketScreen } from '../src/screens/Market';
import { MatchSession } from '../src/engine/session';
import { buildEngineInput } from '../src/engine/adapter';
import { aiDefaultTactic } from '../src/engine/tactics';
import { selectClubOpportunities } from '../src/data/marketOpportunities';
import { marketRefreshDays } from '../src/data/playerComparison';

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
    if (scenario === 'longname') plan.name = 'ÇokUzunPlanAdı'.repeat(12);
    if (scenario === 'duplicate') {
      const duplicate = squad.find((p) => !board.includes(p.id))!;
      snapshot.extraSquads[g.career.clubId] = [duplicate];
      (window as any).__duplicatePlayer = duplicate.id;
    }
    if (scenario === 'stale' || scenario === 'stale-tired') {
      plan.customLineup = [...board];
      plan.customLineup[0] = 'sold-player-not-in-squad';
      plan.customLineup[1] = board[2]; // duplicate/stale saved lineup
      plan.customBench = [board[2], 'sold-player-not-in-squad', xi.bench[0]?.id, xi.bench[0]?.id];
      if (scenario === 'stale-tired') {
        snapshot.playerPatch[board[2]!] = { ...snapshot.playerPatch[board[2]!], fitness: 50 };
        (window as any).__tiredDuplicate = board[2];
      }
    }
    if (scenario === 'unavailable' || scenario === 'risk') {
      const reserves = squad.filter((p) => !board.includes(p.id));
      snapshot.playerPatch[reserves[0].id] = { ...snapshot.playerPatch[reserves[0].id], injuredDays: 20 };
      snapshot.playerPatch[reserves[1].id] = { ...snapshot.playerPatch[reserves[1].id], suspendedMatches: 2 };
      if (scenario === 'risk') snapshot.riskPlayIds = [reserves[0].id];
      (window as any).__injuredIds = [reserves[0].id, reserves[1].id];
    }
    if (scenario === 'clinic-short') {
      const player = squad.find((p) => p.group !== 'GK')!;
      snapshot.playerPatch[player.id] = { ...snapshot.playerPatch[player.id], injuredDays: 5, injury: { type: 'adale_gerilmesi', name: 'Adale gerilmesi', daysRemaining: 5, severity: 'hafif', canPlayWithRisk: true } };
      snapshot.riskPlayIds = [player.id];
      (window as any).__clinicPlayerId = player.id;
    }
    if (scenario === 'bench-risk') {
      const reserves = squad.filter((p) => !board.includes(p.id));
      snapshot.playerPatch[reserves[0].id] = { ...snapshot.playerPatch[reserves[0].id], injuredDays: 20, injury: { type: 'adale_gerilmesi', name: 'Adale gerilmesi', daysRemaining: 20, severity: 'orta', canPlayWithRisk: true } };
      snapshot.playerPatch[reserves[1].id] = { ...snapshot.playerPatch[reserves[1].id], suspendedMatches: 2 };
      snapshot.playerPatch[reserves[2].id] = { ...snapshot.playerPatch[reserves[2].id], fitness: 20 };
      (window as any).__benchRiskIds = reserves.slice(0, 3).map((p) => p.id);
    }
    if (scenario === 'ratings' || scenario === 'ratings3') {
      // Only two/three detailed reports have ratings; the remaining AI apps do not.
      const player = squad.find((p) => p.group !== 'GK')!;
      const ratedGames = scenario === 'ratings3' ? 3 : 2;
      snapshot.playerStats = { [player.id]: { playerId: player.id, clubId: g.career.clubId, apps: 12, goals: 1, assists: 1, yellows: 0, reds: 0, ratingSum: ratedGames * 7 } };
      snapshot.matchReports = Array.from({ length: ratedGames }, (_, i) => ({  id: `qa-rating-${i}`, day: 10 + i, seasonNo: 1, comp: 'lig', homeId: g.career.clubId, awayId: 'ist_halic', hg: 0, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0, playerRows: { [player.id]: { min: 90, g: 0, a: 0, yellow: 0, red: 0, rating: 7, posGroup: player.group } }, playerClubIds: { [player.id]: g.career.clubId } }));
      (window as any).__ratingPlayer = player.id;
    }
    if (scenario === 'archive-seasons') {
      const player = squad.find((p) => p.group !== 'GK')!;
      const row = (rating: number) => ({ min: 90, g: 0, a: 0, yellow: 0, red: 0, rating, posGroup: player.group });
      const common = { id: 'same-fixture', comp: 'lig', homeId: g.career.clubId, awayId: 'ist_halic', xgHome: 1, xgAway: 1, foulsHome: 1, foulsAway: 2, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0, events: [], playerClubIds: { [player.id]: g.career.clubId } };
      snapshot.career.day = 13; snapshot.career.week = 2; snapshot.seasonNo = 2;
      snapshot.matchReports = [
        { ...common, seasonNo: 2, day: 12, hg: 2, ag: 0, referee: { label: 'Yeni Hakem', strictness: 'balanced' }, playerRows: { [player.id]: row(6.1) } },
        { ...common, id: 'old-final', seasonNo: 1, day: 300, hg: 0, ag: 1, referee: { label: 'Eski Final Hakemi', strictness: 'strict' }, playerRows: {} },
        { ...common, seasonNo: 1, day: 12, hg: 0, ag: 2, referee: { label: 'Eski Hakem', strictness: 'balanced' }, playerRows: { [player.id]: row(9.9) } },
      ];
      (window as any).__archivePlayer = player.name;
    }
    if (scenario === 'history') {
      snapshot.matchReports = Array.from({ length: 25 }, (_, i) => ({
        id: `history-report-${i}`, day: i + 1, seasonNo: 1, comp: 'lig', homeId: i === 24 ? 'ist_halic' : g.career.clubId, awayId: i === 24 ? 'ist_bogaz' : 'ist_halic',
        hg: i % 3, ag: 0, xgHome: 1, xgAway: 0.5, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0,
        events: [], playerRows: {}, playerClubIds: {},
      }));
      snapshot.transferLog = Array.from({ length: 55 }, (_, i) => ({ id: `history-transfer-${i}`, playerName: `Tarihi Oyuncu ${i}`, group: 'CM', age: 25, kind: 'in', fromClubId: 'ist_halic', toClubId: g.career.clubId, seasonNo: 1, day: i + 1, fee: 1 }));
      snapshot.internationalArchive = Array.from({ length: 9 }, (_, i) => ({ seasonNo: i + 1, cupId: 'champions', champion: 'ist_halic', runnerUp: 'ist_bogaz', participants: ['ist_halic', 'ist_bogaz'] }));
    }
    // Deterministic, nonzero table/form data for every league without playing matches.
    for (const league of Object.keys(snapshot.table)) {
      snapshot.table[league] = snapshot.table[league].map((row: any, i: number) => ({ ...row, p: 10 + i, w: 8, d: 1, l: 1 + i, gf: 20 + i, ga: 10 + i * 2, pts: 25 }));
    }
    const marked: Record<string, number> = {};
    snapshot.fixtures = snapshot.fixtures.map((f: any) => {
      if (marked[f.league] >= (scenario === 'history' ? 50 : 18)) return f;
      marked[f.league] = (marked[f.league] ?? 0) + 1;
      return { ...f, played: true, hg: marked[f.league] % 3, ag: (marked[f.league] + 1) % 3 };
    });
    ready(snapshot);
  }, []);
  return <div>Hazırlanıyor…</div>;
}
function Screens() {
  const g = useGame();
  const [screen, setScreen] = React.useState<'tactics' | 'comps' | 'stats' | 'squad' | 'market' | 'newsroom'>('tactics');
  (window as any).__rosterRead = () => readSave(g.career.slot);
  (window as any).__rosterModel = () => {
    const plan = g.tactics[0];
    const engine = autoLineup(g.mySquad, plan.formation, plan.customLineup?.length === 11 ? boardToEngine(plan.formation, plan.customLineup) : undefined, new Set(g.riskPlayIds ?? []), plan.customBench);
    return {
      squad: g.mySquad.map((p) => ({ id: p.id, name: p.name, group: p.group, injuredDays: p.injuredDays, suspendedMatches: p.suspendedMatches })),
      lineup: engineToBoard(plan.formation, engine.slots.map((slot) => slot.player.id)),
      matchBench: engine.bench.map((p) => p.id), formation: plan.formation,
      table: Object.fromEntries(Object.entries(g.table).map(([league, rows]) => [league, rows.map((row) => ({ ...row, name: clubById(row.clubId).name, short: clubById(row.clubId).short }))])),
      fixtures: g.fixtures.filter((f) => f.league === g.myLeague).map((f) => ({ ...f, homeName: clubById(f.homeId).name, awayName: clubById(f.awayId).name })),
      cupGroups: Object.fromEntries(Object.entries(g.cup.groups).map(([group, ids]) => [group, ids.map((id) => clubById(id).name)])),
      internationalGroups: Object.fromEntries(Object.entries(g.international.cups[0].groups).map(([group, ids]) => [group, ids.map((id) => clubById(id).name)])),
    };
  };
  (window as any).__rosterSnapshot = () => JSON.stringify(g.snapshotForBackup());
  (window as any).__rosterSetRisk = (id: string, on: boolean) => g.setRiskPlay(id, on);
  (window as any).__rosterLiveBench = () => {
    const home = g.myClub, away = clubById('ist_halic');
    const session = new MatchSession(buildEngineInput({ homeClub: home, awayClub: away, homeSquad: g.mySquad, awaySquad: g.squads[away.id], homeTactic: g.tactics[0], seed: 9931, settings: g.career.settings, userSide: 'home', riskIds: g.riskPlayIds ?? [] }));
    return session.getBench('home').map((p) => p.id);
  };
  (window as any).__rosterQuickCheck = () => {
    const fx = g.nextFixture!;
    const home = clubById(fx.homeId), away = clubById(fx.awayId);
    const input = buildEngineInput({ homeClub: { ...home, league: g.leagueOf[home.id] ?? home.league }, awayClub: { ...away, league: g.leagueOf[away.id] ?? away.league },
      homeSquad: g.squads[home.id], awaySquad: g.squads[away.id], homeTactic: home.id === g.myClub.id ? g.tactics[0] : aiDefaultTactic(home, away),
      awayTactic: away.id === g.myClub.id ? g.tactics[0] : undefined, seed: g.career.seed + home.id.length * 13 + away.id.length * 17 + g.career.day * 101,
      settings: g.career.settings, derby: home.derby === away.id || away.derby === home.id, challengeClubId: g.career.clubId, challengePoints: g.career.manager.challengePoints, riskIds: g.riskPlayIds ?? [] });
    const session = new MatchSession(input); const bench = session.getBench(home.id === g.myClub.id ? 'home' : 'away').map((p) => p.id);
    const result = session.finishNow(), quick = g.buildDemoMatch(home.id, away.id, g.tactics[0].name, 0);
    return { bench, sameScore: quick.hg === result.stats.hg && quick.ag === result.stats.ag, samePlayerRows: JSON.stringify(quick.playerRows) === JSON.stringify(result.stats.playerRows) };
  };
  (window as any).__marketModel = () => {
    const own = new Set(g.mySquad.map((p) => p.id));
    const cycle = marketRefreshDays(g.career.settings.marketRefresh);
    const opportunities = new Set(selectClubOpportunities({ squads: g.squads, ownClubId: g.career.clubId, seed: g.career.seed, cycleNo: Math.floor(g.career.day / cycle) }).map((item) => item.player.id));
    const target = Object.values(g.squads).flat().find((p) => !own.has(p.id) && !opportunities.has(p.id));
    return { target, totalWorld: new Set(Object.entries(g.squads).filter(([id]) => id !== g.career.clubId).flatMap(([, list]) => list.filter((p) => !own.has(p.id)).map((p) => p.id))).size };
  };
  return <div style={{ height: '100dvh', maxWidth: 430, margin: 'auto', display: 'flex', flexDirection: 'column' }}>
    <nav style={{ display: 'flex', gap: 10, padding: '6px', overflowX: 'auto', background: 'var(--c-elevated)' }}>
      <button onClick={() => setScreen('tactics')}>Test: Taktik</button><button onClick={() => setScreen('comps')}>Test: Müsabaka</button>
      <button onClick={() => setScreen('stats')}>Test: İstatistik</button><button onClick={() => setScreen('newsroom')}>Test: Basın</button><button onClick={() => setScreen('squad')}>Test: Kadro</button><button onClick={() => setScreen('market')}>Test: Piyasa</button>
    </nav>
    <div style={{ flex: 1, minHeight: 0 }}>
      {screen === 'tactics' ? <TacticsScreen /> : screen === 'comps' ? <CompsScreen /> : screen === 'stats' ? <StatsHub /> : screen === 'newsroom' ? <NewsroomScreen /> : screen === 'market' ? <MarketScreen /> : <SquadScreen goXI={() => setScreen('tactics')} />}
    </div>
  </div>;
}
function App() {
  const [snapshot, setSnapshot] = React.useState<any>(null);
  return snapshot ? <GameProvider key="fixture" career={snapshot.career} snapshot={snapshot}><Screens /></GameProvider> : <GameProvider key="seed" career={career}><Seed ready={setSnapshot} /></GameProvider>;
}
createRoot(document.getElementById('root')!).render(<App />);
