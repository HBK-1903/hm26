// Isolated visual/test fixture. Production uses MatchPrep and the player's actual first XI.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { ArrivalScene } from '../src/components/match/ArrivalScene';
import { clubById } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { autoLineup } from '../src/engine/profiles';

const query = new URLSearchParams(location.search);
const home = clubById(query.get('home') ?? 'sakarya_vadi');
const away = clubById('denizli_yesilova');
const team = query.get('side') === 'home' ? home : away;
const allPlayers = autoLineup(genSquad(team, 12345), '4-2-3-1').slots.map((slot) => slot.player);
const countParam = query.get('players');
const count = countParam === null ? 11 : Math.max(0, Math.min(11, Number(countParam) || 0));
const players = allPlayers.slice(0, count);
document.documentElement.classList.add(query.get('theme') === 'dark' ? 'm26-dark' : 'm26-light');
(window as any).__arrivalFixturePlayers = players.map((player) => ({ id: player.id, name: player.name }));

createRoot(document.getElementById('root')!).render(
  <main style={{ maxWidth: 650, margin: '0 auto', padding: '20px 14px 36px', color: 'var(--c-primary)', background: 'var(--c-bg)', minHeight: '100vh' }}>
    <h1 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Stadyuma Geliş</h1>
    <p style={{ fontSize: 11, color: 'var(--c-secondary)', marginBottom: 12 }}>Örnek maç günü sahnesi · Oyunda gerçek fikstürün ve ilk 11’in kullanılır</p>
    <ArrivalScene home={home} away={away} team={team} day={12} players={players} reducedMotion={query.get('reduce') === '1'} />
  </main>,
);
