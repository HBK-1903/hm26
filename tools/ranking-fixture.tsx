// QA-only: real GameProvider/screens with deterministic synthetic statistics and archives.
// Nothing in this fixture is included in the production build or written to a real career.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { GameProvider, useGame } from '../src/store/game';
import { StatsHub } from '../src/screens/StatsHub';
import { CompsScreen } from '../src/screens/Comps';
import { clubByIdSafe } from '../src/data/clubs';
import { buildFairPlayTable, buildRefereeProfile } from '../src/engine/analytics';
import { injuryTally } from '../src/engine/matchEvents';
import oldBackup from './fixtures/save-v2-original.json';

const scenario = new URLSearchParams(location.search).get('scenario') ?? 'full';
const theme = new URLSearchParams(location.search).get('theme') ?? 'light';
document.documentElement.classList.add(theme === 'dark' ? 'm26-dark' : 'm26-light');

const career: any = {
  slot: 1,
  manager: { name: 'QA Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 45 },
  clubId: 'denizli_yesilova', seed: 12345, day: 80, week: 12,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

function Seed({ ready }: { ready: (snapshot: any) => void }) {
  const g = useGame();
  const gRef = React.useRef(g);
  gRef.current = g;
  React.useEffect(() => {
    if (scenario === 'played') {
      // No pre-filled stats: let the production match engine and provider create them.
      let cancelled = false;
      const play = (attempt: number) => {
        const fx = gRef.current.nextFixture;
        if (!fx) throw new Error('QA gerçek maç fikstürü bulunamadı');
        gRef.current.playLeagueMatch({ ...fx });
        window.setTimeout(() => {
          if (cancelled) return;
          const current = gRef.current;
          const rows = Object.values(current.playerStats ?? {}).filter((row) => row.apps > 0 && row.goals > 0)
            .sort((a, b) => b.goals - a.goals || b.apps - a.apps || a.playerId.localeCompare(b.playerId));
          if (!rows.length && attempt < 3) { play(attempt + 1); return; }
          (window as any).__rankingFixture = {
            scenario, reports: current.matchReports.length,
            statsGoals: rows.map((row) => current.playerOf(row.playerId)?.name ?? `Oyuncu #${row.playerId.slice(0, 4)}`),
          };
          ready(current.snapshotForBackup());
        }, 120);
      };
      play(0);
      return () => { cancelled = true; };
    }
    if (scenario === 'legacy') {
      // The repository's unmodified export was produced by the actual v2 application.
      (window as any).__rankingFixture = { scenario, version: oldBackup.blob.version };
      ready(oldBackup.blob);
      return;
    }
    const snapshot: any = g.snapshotForBackup();
    if (scenario === 'empty') {
      (window as any).__rankingFixture = { scenario };
      ready(snapshot);
      return;
    }
    const leaguePlayers = (league: string, count: number) => Object.entries(g.leagueOf)
      .filter(([, value]) => value === league)
      .flatMap(([clubId]) => (g.squads[clubId] ?? []).map((player) => ({ player, clubId })))
      .slice(0, count);
    const main = leaguePlayers(g.myLeague, scenario === 'small' ? 2 : scenario === 'large' ? 200 : 40);
    const other = leaguePlayers('zirve', scenario === 'small' ? 0 : scenario === 'large' ? 100 : 12);
    const longName = 'Ahmet Uzunsoyadıbüyükşampiyonlarından Birincioğlu';
    snapshot.playerPatch[main[0].player.id] = { ...snapshot.playerPatch[main[0].player.id], name: longName };
    const playerStats: Record<string, any> = {};
    const add = (items: typeof main, base: number) => items.forEach(({ player, clubId }, i) => {
      const apps = i === 0 ? 2 : 3 + (i % 3);
      const tiedIndex = i === 10 ? 9 : i;
      playerStats[player.id] = {
        playerId: player.id, clubId, goals: base - tiedIndex, assists: tiedIndex + 1, apps,
        ratingSum: apps * (6 + tiedIndex / 100), yellows: i % 3 === 2 ? 0 : i + 1, reds: 0,
        cleanSheets: player.group === 'GK' ? i + 1 : 0, conceded: player.group === 'GK' ? 2 : 0,
        saves: player.group === 'GK' ? 20 + i : 0,
      };
    });
    add(main, 200);
    add(other, 100);
    if (scenario !== 'small') {
      // Old snapshots can contain records for departed/unknown players and clubs.
      playerStats.legacy_player = { playerId: 'legacy_player', clubId: 'legacy_club', goals: 1, assists: 0, apps: 1, ratingSum: 0, yellows: 0, reds: 0 };
    }
    snapshot.playerStats = playerStats;

    const rivals = g.table[g.myLeague].map((row) => row.clubId).filter((id) => id !== g.career.clubId);
    const injured = g.mySquad.slice(0, 8);
    const reportCount = scenario === 'small' ? 1 : 8;
    const reports = Array.from({ length: reportCount }, (_, i) => ({
      id: `qa-ranking-${i}`, day: 30 + i, seasonNo: 1, comp: 'lig', homeId: g.career.clubId, awayId: rivals[i],
      hg: 1, ag: 0, xgHome: 1.5, xgAway: 0.8,
      foulsHome: 2, foulsAway: i + 1, yellowsHome: 1, yellowsAway: i % 3, redsHome: 0, redsAway: 0,
      playerRows: {}, playerClubIds: {},
      ...(scenario === 'small' ? {} : {
        referee: { label: `Hakem ${String(i + 1).padStart(2, '0')}`, strictness: 'balanced' },
        events: i === 0 ? injured.map((player, j) => [j + 1, 6, 0, player.id]) : [],
      }),
    }));
    snapshot.matchReports = reports;
    if (scenario !== 'small') {
      let marked = 0;
      snapshot.fixtures = snapshot.fixtures.map((fixture: any) => {
        if (fixture.comp !== 'lig' || fixture.league !== g.myLeague || marked++ >= 6) return fixture;
        return { ...fixture, played: true, hg: 1, ag: 0, xgHome: 1.5, xgAway: 0.8 };
      });
      const cup = snapshot.international.cups.find((candidate: any) => candidate.id === 'champions');
      const international = cup.qualifiers.flatMap(({ clubId }: any) => (g.squads[clubId] ?? []).map((player) => ({ player, clubId }))).slice(0, 12);
      cup.scorers = Object.fromEntries(international.map(({ player, clubId }: any, i: number) => [player.id, { playerId: player.id, clubId, goals: 12 - (i === 10 ? 9 : i) }]));
      (window as any).__rankingInternational = (Object.values(cup.scorers) as any[])
        .sort((a, b) => b.goals - a.goals || a.playerId.localeCompare(b.playerId))
        .map((row) => snapshot.playerPatch[row.playerId]?.name ?? g.playerOf(row.playerId)?.name ?? row.playerId);
    }

    const label = (row: any) => snapshot.playerPatch[row.playerId]?.name ?? g.playerOf(row.playerId)?.name ?? `Oyuncu #${row.playerId.slice(0, 4)}`;
    const rows = Object.values(playerStats) as any[];
    const statsGoals = [...rows].filter((r) => r.apps > 0 && r.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.apps - a.apps || a.playerId.localeCompare(b.playerId)).map(label);
    const statsAssists = [...rows].filter((r) => r.apps > 0 && r.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.apps - a.apps || a.playerId.localeCompare(b.playerId)).map(label);
    const statsRatings = [...rows].filter((r) => r.apps >= 3)
      .sort((a, b) => (b.ratingSum / b.apps) - (a.ratingSum / a.apps) || b.apps - a.apps || a.playerId.localeCompare(b.playerId)).map(label);
    const hotheads = [...rows].filter((r) => r.apps > 0 && r.yellows + r.reds > 0)
      .sort((a, b) => (b.yellows + b.reds * 3) - (a.yellows + a.reds * 3) || a.playerId.localeCompare(b.playerId)).map(label);
    const gentlemen = [...rows].filter((r) => r.apps >= 5 && r.yellows + r.reds === 0)
      .sort((a, b) => (b.ratingSum / b.apps) - (a.ratingSum / a.apps) || b.apps - a.apps || a.playerId.localeCompare(b.playerId)).map(label);
    const leagueRows = (league: string) => rows.filter((r) => g.leagueOf[r.clubId] === league);
    const leagueGoals = (league: string) => [...leagueRows(league)].sort((a, b) => b.goals - a.goals).map(label);
    const leagueAssists = [...leagueRows(g.myLeague)].sort((a, b) => b.assists - a.assists).map(label);
    const leagueRatings = [...leagueRows(g.myLeague)].filter((r) => r.apps >= 3).sort((a, b) => (b.ratingSum / b.apps) - (a.ratingSum / a.apps)).map(label);
    const fairPlay = buildFairPlayTable(reports as any, 1).map((row) => clubByIdSafe(row.clubId)?.name ?? row.clubId);
    const referees = buildRefereeProfile(reports as any, g.career.clubId).map((row) => row.label);
    const injuries = injuryTally(reports as any, g.career.clubId).map((row) => g.playerOf(row.playerId)?.name ?? 'Oyuncu');
    (window as any).__rankingFixture = {
      scenario, statsGoals, statsAssists, statsRatings, hotheads, gentlemen, leagueGoals: leagueGoals(g.myLeague), otherLeagueGoals: leagueGoals('zirve'),
      leagueAssists, leagueRatings, excludedUnderThree: longName, longName,
      goalTie: main.slice(9, 11).map(({ player }) => player.name),
      injuries, referees, fairPlay,
      leagueClubs: g.table[g.myLeague].map((row) => clubByIdSafe(row.clubId)?.name ?? row.clubId),
      international: (window as any).__rankingInternational ?? [],
    };
    ready(snapshot);
  }, []);
  return <div>QA verileri hazırlanıyor…</div>;
}

function Screens() {
  const game = useGame();
  const [, forceRender] = React.useState(0);
  (window as any).__rankingSnapshot = () => JSON.stringify(game.snapshotForBackup());
  (window as any).__rankingRerender = () => forceRender((revision) => revision + 1);
  const [screen, setScreen] = React.useState<'stats' | 'comps'>('stats');
  return <div style={{ height: '100dvh', maxWidth: 430, margin: 'auto', display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', gap: 12, padding: '6px 12px', background: 'var(--c-elevated)' }}>
      <button type="button" onClick={() => setScreen('stats')}>Test: İstatistik</button>
      <button type="button" onClick={() => setScreen('comps')}>Test: Müsabakalar</button>
    </div>
    <div style={{ flex: 1, minHeight: 0 }}>{screen === 'stats' ? <StatsHub /> : <CompsScreen />}</div>
  </div>;
}
function App() {
  const [snapshot, setSnapshot] = React.useState<any>(null);
  if (!snapshot) return <GameProvider key="seed" career={career}><Seed ready={setSnapshot} /></GameProvider>;
  return <GameProvider key="fixture" career={snapshot.career} snapshot={snapshot}><Screens /></GameProvider>;
}
createRoot(document.getElementById('root')!).render(<App />);
