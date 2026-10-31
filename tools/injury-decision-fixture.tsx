// QA-only fixture: drive the real LiveMatch UI with a deterministic injury/return.
// The injected adapter state is not shipped in the application or written to saves.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { GameProvider } from '../src/store/game';
import { LiveMatch } from '../src/screens/LiveMatch';
import { MatchSession } from '../src/engine/session';

const side: 'home' | 'away' = new URLSearchParams(location.search).get('side') === 'away' ? 'away' : 'home';
const clubId = 'denizli_yesilova';
const rivalId = 'ist_halic';
let phase: 'none' | 'injured' | 'waiting' | 'returned' = 'none';
let playerId = '', steps = 0, waitCalls = 0, allowReturn = false;

const originalSlots = MatchSession.prototype.getSlots;
MatchSession.prototype.getSlots = function fixtureSlots(which) {
  return originalSlots.call(this, which).map((slot) => which === side && slot.player.id === playerId
    ? { ...slot, injured: phase === 'injured' || phase === 'waiting' }
    : slot);
};
MatchSession.prototype.waitForInjuredPlayer = function fixtureWait(id) {
  if (id !== playerId || phase !== 'injured') return false;
  waitCalls++;
  phase = 'waiting';
  return true;
};
const originalStep = MatchSession.prototype.step;
MatchSession.prototype.step = function fixtureStep() {
  const events = originalStep.call(this);
  steps++;
  if (phase === 'none' && steps === 5) {
    const slot = this.getSlots(side).find((candidate) => candidate.slotGroup !== 'GK');
    if (!slot) throw new Error('QA fixture has no outfield player');
    playerId = slot.player.id;
    phase = 'injured';
    events.push({ minute: this.getMinute(), side, kind: 'injury', playerId, text: 'QA: oyuncu sakatlandı.' });
  } else if (phase === 'waiting' && allowReturn) {
    phase = 'returned';
    events.push({ minute: this.getMinute(), side, kind: 'injury', playerId, text: 'QA: oyuncu tedaviden döndü.' });
  }
  return events;
};

(window as any).__injuryFixture = {
  state: () => ({ phase, waitCalls, steps }),
  allowReturn: () => { allowReturn = true; },
};
const career: any = {
  slot: 1,
  manager: { name: 'QA Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 45 },
  clubId, seed: 12345, day: 6, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};
const fixture: any = { round: 1, homeId: side === 'home' ? clubId : rivalId, awayId: side === 'home' ? rivalId : clubId, played: false, day: 6, comp: 'hazirlik' };
createRoot(document.getElementById('root')!).render(
  <GameProvider career={career}><div style={{ height: '100dvh' }}><LiveMatch fixture={fixture} onExit={() => {}} /></div></GameProvider>,
);
