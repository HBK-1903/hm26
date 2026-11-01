// Only served by the Vite development server for browser QA; not bundled into the PWA.
import React from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import { FORMATION_SLOTS } from '../src/engine/profiles';
import { PhaserPitch, PitchScene, type PitchPresentationState, type TeamDots } from '../src/components/assets/PhaserPitch';

function team(side: 'home' | 'away', formation: '4-1-4-1' | '4-4-2'): TeamDots {
  return {
    side, formation, color1: side === 'home' ? '#d33128' : '#305dd4', color2: '#fff0d4', width: 50, defLine: 'normal', pressing: side === 'away',
    players: FORMATION_SLOTS[formation].map((group, index) => ({ id: `${side}-${index}`, name: `${side} ${index}`, kitNumber: index + 1, group, fitness: 85, rating: 6.5, yellow: 0, red: 0 })),
  };
}
const home = team('home', '4-1-4-1');
const away = team('away', '4-4-2');
const initial: PitchPresentationState = {
  home, away, runtime: { x: 20, y: 82, z: 0, owner: 'home', ownerId: 'home-8', activeIds: ['home-8'] },
  heatPoints: [], heatEnabled: false, heatTeam: 'all', paused: true, completed: false, reduceMotion: false, stepMs: 260,
};
let reactSet: React.Dispatch<React.SetStateAction<PitchPresentationState>>;
function ReactHarness() {
  const [state, setState] = React.useState(initial);
  reactSet = setState;
  return <PhaserPitch event={null} homeDots={state.home} awayDots={state.away} runtime={state.runtime} paused={state.paused}
    completed={state.completed} reduceMotion={state.reduceMotion} stepMs={state.stepMs} />;
}
createRoot(document.getElementById('react-pitch')!).render(<ReactHarness />);

let state = structuredClone(initial);
const scene = new PitchScene((created) => {
  created.game.events.emit('pitchstate', state, true);
  (window as any).__pitchReady = true;
});
const game = new Phaser.Game({
  type: Phaser.AUTO, width: 320, height: 440, parent: 'controlled-pitch', transparent: true,
  scene: [scene], fps: { target: 60, smoothStep: true },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: 320, height: 440 },
  render: { antialias: true, roundPixels: false },
});
(window as any).__pitchFixture = {
  update(patch: Partial<PitchPresentationState>) {
    state = { ...state, ...patch, runtime: patch.runtime ? { ...state.runtime!, ...patch.runtime } : state.runtime };
    game.events.emit('pitchstate', state, false);
  },
  event(event: unknown) { game.events.emit('posevent', event); },
  reactUpdate(patch: Partial<PitchPresentationState>) { reactSet((current) => ({ ...current, ...patch })); },
  resize(width: number, height: number) {
    const parent = document.getElementById('controlled-pitch')!;
    parent.style.width = `${width}px`; parent.style.height = `${height}px`;
    game.scale.setParentSize(width, height);
  },
  resizeReact(width: number, height: number) {
    const parent = document.getElementById('react-pitch')!;
    parent.style.width = `${width}px`; parent.style.height = `${height}px`;
  },
  snapshot() {
    const internal = scene as any;
    const sprites: Record<string, { x: number; y: number; target: { x: number; y: number } }> = {};
    for (const [id, sprite] of internal.spriteById) sprites[id] = { x: sprite.x, y: sprite.y, target: sprite.getData('target') };
    return {
      sprites, count: Object.keys(sprites).length, ball: { ...internal.ballGround }, ballY: internal.ball.y,
      ballDetail: { x: internal.ballDetail.x, y: internal.ballDetail.y, rotation: internal.ballDetail.rotation },
      goalNets: [...internal.cueObjects].filter((cue: any) => cue.getData('cueKind') === 'goal-net').map((cue: any) => ({ side: cue.getData('goalSide'), y: cue.getData('goalY') })),
      targetKey: internal.ballTargetKey, cinematic: internal.cinematic, paused: scene.sys.isPaused(),
      reduced: internal.reduceMotion, cueCount: internal.cueObjects.size, trailAlpha: internal.trail.alpha,
      cameraZoom: scene.cameras.main.zoom, width: scene.scale.width, height: scene.scale.height,
      runtime: structuredClone(state.runtime),
    };
  },
};
