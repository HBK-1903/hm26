// Browser-only QA fixture: real GameProvider, OfferFlow and match-context interview.
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { GameProvider, useGame } from '../src/store/game';
import { clubById } from '../src/data/clubs';
import type { Career, DemoFixture } from '../src/types';
import type { InterviewOption } from '../src/data/interview';
import { CinematicOverlay } from '../src/components/cinematic/Cinematic';
import { OfferFlow } from '../src/screens/Market';
import { PostMatchInterview } from '../src/screens/PostMatchInterview';
import { audio } from '../src/audio/engine';

const career = {
  slot: 3, manager: { name: 'Sahne Menajeri', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
} as Career;
const home = clubById(career.clubId), away = clubById('sakarya_vadi');
const fixture: DemoFixture = { round: 1, day: 1, homeId: home.id, awayId: away.id, played: true, hg: 2, ag: 1, comp: 'lig' };

function Fixture() {
  const g = useGame();
  const [open, setOpen] = useState<'transfer' | 'interview' | null>(null);
  const [selected, setSelected] = useState<InterviewOption | null | undefined>(undefined);
  const [, renderAudio] = useState(0);
  const result = useMemo(() => ({ ...g.buildDemoMatch(home.id, away.id, g.tactics[0].name), hg: 2, ag: 1,
    xgHome: 1.1, xgAway: 1.0, redH: 1, redA: 0, events: [] }), []);
  const player = g.squads[away.id][0];
  (window as any).__cinematicFixture = {
    snapshot: () => g.snapshotForBackup(),
    lastChoice: () => selected,
    setVolume: (volume: number) => { audio.setPrefs({ master: volume }); renderAudio((n) => n + 1); },
  };
  return <main style={{ padding: 20 }}>
    <h1>HM26 sahne QA</h1>
    <button data-testid="fixture-open-transfer" type="button" onClick={() => setOpen('transfer')}>Transfer görüşmesini aç</button>
    <button data-testid="fixture-open-interview" type="button" onClick={() => { setSelected(undefined); setOpen('interview'); }}>Röportajı aç</button>
    <CinematicOverlay open={open === 'transfer'} title="Transfer Görüşmesi" onClose={() => setOpen(null)} reducedMotion={g.career.settings.reduceMotion}>
      {open === 'transfer' && <OfferFlow p={player} price={1} tb={10} wageHeadroom={50000} inWindow buy={g.buyPlayer}
        onDone={() => setOpen(null)} onCancel={() => setOpen(null)} />}
    </CinematicOverlay>
    <CinematicOverlay open={open === 'interview'} title="Maç Sonu Röportajı" reducedMotion={g.career.settings.reduceMotion}>
      {open === 'interview' && <PostMatchInterview result={result} fixture={fixture} onChoose={(option) => { setSelected(option); setOpen(null); }} />}
    </CinematicOverlay>
  </main>;
}
document.documentElement.classList.add('m26-light');
createRoot(document.getElementById('root')!).render(<GameProvider career={career}><Fixture /></GameProvider>);
