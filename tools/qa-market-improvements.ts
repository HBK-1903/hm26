// Market diversification, expanded scouting and durable shortlist focused checks.
import { readFileSync } from 'node:fs';
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { resolveMarketShortlist, selectClubOpportunities } from '../src/data/marketOpportunities';
import type { Player } from '../src/types';

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });
const squads: Record<string, Player[]> = {};
CLUBS.slice(0, 12).forEach((club, index) => { squads[club.id] = genSquad(club, 260001 + index); });

{
  const first = selectClubOpportunities({ seed: 260050, cycleNo: 0, ownClubId: CLUBS[0].id, squads });
  const repeated = selectClubOpportunities({ seed: 260050, cycleNo: 0, ownClubId: CLUBS[0].id, squads });
  const rotated = selectClubOpportunities({ seed: 260050, cycleNo: 1, ownClubId: CLUBS[0].id, squads });
  const uniqueClub = new Set(first.map((item) => item.clubId)).size === first.length;
  const noOwn = first.every((item) => item.clubId !== CLUBS[0].id);
  const deterministic = JSON.stringify(first.map((item) => [item.clubId, item.player.id])) === JSON.stringify(repeated.map((item) => [item.clubId, item.player.id]));
  const rotation = first.some((item) => !rotated.some((candidate) => candidate.clubId === item.clubId && candidate.player.id === item.player.id));
  check('One seed-stable target per seller club; refresh cycle rotates the clubs/players offered', first.length >= 3 && uniqueClub && noOwn && deterministic && rotation,
    `cycle0=${first.length}; unique source clubs=${uniqueClub}; deterministic=${deterministic}; rotated=${rotation}`);
}

{
  const saved = genSquad(CLUBS[0], 260071)[0];
  const savedGeneratedFreeAgent = { ...genSquad(CLUBS[1], 260072)[1], id: 'fa_saved_agent', clubId: 'FA' };
  const replacement = { ...saved, name: `${saved.name} Updated`, form: Math.min(99, saved.form + 1) };
  const resolved = resolveMarketShortlist([saved.id, savedGeneratedFreeAgent.id, saved.id], [saved, savedGeneratedFreeAgent], (id) => id === saved.id ? replacement : null);
  check('Shortlist preserves player snapshot across refreshed pools and prefers current live player state', resolved.length === 2
    && resolved[0].name === replacement.name && resolved[1].id === savedGeneratedFreeAgent.id && resolved[1].clubId === 'FA',
    `rows=${resolved.length}; live=${resolved[0]?.name === replacement.name}; generated snapshot=${resolved[1]?.id}`);
}

{
  const store = readFileSync(new URL('../src/store/game.tsx', import.meta.url), 'utf8');
  const market = readFileSync(new URL('../src/screens/Market.tsx', import.meta.url), 'utf8');
  const types = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');
  const hub = readFileSync(new URL('../src/screens/Hub.tsx', import.meta.url), 'utf8');
  const inbox = readFileSync(new URL('../src/screens/Inbox.tsx', import.meta.url), 'utf8');
  const persistence = store.includes('marketShortlistPlayers') && store.includes('updateMarketShortlist')
    && store.includes('stateRef.current = next; setSt(next)') && types.includes('marketShortlistPlayers?: Player[]');
  const diversityAndSize = market.includes('selectClubOpportunities(') && market.includes('.slice(0, 64)')
    && !market.includes('p.id.length * 97') && market.includes('resolveMarketShortlist(');
  const pressRoomRoutes = hub.includes("go('newsroom')") && hub.includes('Manşetler · Saha Defteri')
    && !hub.includes("go('inbox')") && inbox.includes('Basın Odası · Saha Defteri') && inbox.includes("go('newsroom')");
  check('Store migration persists shortlist snapshots; hub shortcut goes to headlines and inbox links to press room', persistence && diversityAndSize && pressRoomRoutes,
    `persistent shortlist=${persistence}; diversified/64-player search=${diversityAndSize}; press-room links=${pressRoomRoutes}`);
}

for (const result of results) console.log(`${result.pass ? '✅' : '❌'} ${result.name} | ${result.detail}`);
console.log(`\nMARKET-IMPROVEMENTS: ${results.filter((result) => result.pass).length}/${results.length}`);
if (results.some((result) => !result.pass)) process.exit(1);
