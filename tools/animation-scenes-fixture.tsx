// Development-only showcase and browser fixture. The game passes its own career and match data.
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { GameProvider, useGame, type DemoMatchEvent } from '../src/store/game';
import type { Career } from '../src/types';
import { clubById } from '../src/data/clubs';
import { TrainingGround } from '../src/components/TrainingGround';
import { TRAINING_AREAS, type TrainingArea, type TrainingIntensity } from '../src/data/training';
import { TransferTheatre } from '../src/components/transfer/TransferTheatre';
import type { TransferSpeaker } from '../src/data/transferVoices';
import { LiveAtmosphere } from '../src/components/match/LiveAtmosphere';
import { liveReactionForEvent } from '../src/engine/liveReaction';
import { MatchAwardCeremony } from '../src/components/match/MatchAwardCeremony';
import { selectMatchAward } from '../src/data/matchAward';
import { MatchHighlights } from '../src/components/match/MatchHighlights';
import { SeasonFinale } from '../src/screens/SeasonFinale';

const career = {
  slot: 3, manager: { name: 'Örnek Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
} as Career;
const home = clubById(career.clubId), away = clubById('sakarya_vadi');
const moments: DemoMatchEvent[] = [
  { minute: 12, kind: 'goal', side: 'home', text: 'Örnek ev sahibi golü.', path: ['L-D', 'L-M', 'C-M', 'C-A'] },
  { minute: 36, kind: 'save', side: 'away', text: 'Örnek kurtarış.', playerId: 'example-keeper', path: ['L-D', 'C-M'] },
  { minute: 61, kind: 'card', side: 'away', text: 'Örnek kart; konum kaydı yok.' },
  { minute: 80, kind: 'goal', side: 'away', text: 'Örnek deplasman golü.', path: ['L-D', 'C-M', 'C-A'] },
];
const reactionEvents: Record<string, DemoMatchEvent | null> = {
  idle: null,
  ownGoal: moments[0],
  awayGoal: moments[3],
  save: { minute: 22, kind: 'save', side: 'home', playerId: 'example-keeper', text: 'Örnek kurtarış.' },
  card: { minute: 29, kind: 'card', side: 'home', text: 'Örnek kart.' },
  cancelled: { minute: 51, kind: 'goal', side: 'home', text: 'Örnek gol iptal edildi.' },
};
const query = new URLSearchParams(location.search);
const scenes = [
  ['training', 'Antrenman'], ['transfer', 'Transfer'], ['atmosphere', 'Kulübe & tribün'],
  ['award', 'Maçın yıldızı'], ['highlights', 'Maç özeti'], ['finale', 'Sezon finali'],
] as const;
type Scene = typeof scenes[number][0];

function Showcase() {
  const g = useGame();
  const [scene, setScene] = useState<Scene>(scenes.some(([id]) => id === query.get('scene')) ? query.get('scene') as Scene : 'training');
  const [dark, setDark] = useState(query.get('theme') === 'dark');
  const [reduced, setReduced] = useState(false);
  const [area, setArea] = useState<TrainingArea>('Teknik');
  const [intensity, setIntensity] = useState<TrainingIntensity>('normal');
  const [players, setPlayers] = useState(3);
  const [gen, setGen] = useState(85);
  const [transferMode, setTransferMode] = useState<'seller' | 'reveal'>('reveal');
  const [speaker, setSpeaker] = useState<TransferSpeaker | null>(null);
  const [reactionKind, setReactionKind] = useState('idle');
  const [sequence, setSequence] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [bench, setBench] = useState(3);
  const [outcome, setOutcome] = useState<'champion' | 'promoted' | 'relegated' | 'ordinary'>('champion');
  const [finaleDone, setFinaleDone] = useState(false);
  const [awardClosed, setAwardClosed] = useState(false);
  const [shortHighlights, setShortHighlights] = useState(false);
  const highlightEvents = useMemo(() => shortHighlights ? [moments[0], moments[3]] : moments, [shortHighlights]);
  const result = useMemo(() => g.buildDemoMatch(home.id, away.id, g.tactics[0].name), []);
  const award = selectMatchAward(result, g.clubOfPlayer, g.playerOf);
  const samplePlayer = g.mySquad[0];
  const previewPlayer = { ...samplePlayer, ratings: { ...samplePlayer.ratings, gen } };
  const reaction = reactionEvents[reactionKind] ? liveReactionForEvent(reactionEvents[reactionKind]!, 'home', home.id, away.id) : null;
  const list = g.mySquad.slice(0, 3).map((p, i) => ({ playerId: p.id, clubId: home.id, value: 10 - i, display: `${10 - i}` }));
  const awards = { scorer: list, assist: list, mvp: list, young: list };
  const setMotion = (value: boolean) => {
    setReduced(value);
    document.documentElement.classList.toggle('m26-rm', value);
    g.setCareer((current) => ({ ...current, settings: { ...current.settings, reduceMotion: value } }));
  };
  const setTheme = (value: boolean) => {
    setDark(value);
    document.documentElement.classList.toggle('m26-dark', value);
    document.documentElement.classList.toggle('m26-light', !value);
  };
  return <main style={{ maxWidth: 650, margin: '0 auto', padding: '16px 12px 28px', color: 'var(--c-primary)', background: 'var(--c-base)', minHeight: '100vh' }}>
    <header style={{ marginBottom: 10 }}><h1 style={{ fontSize: 18, fontWeight: 900 }}>HM26 · Animasyonlar</h1><p style={{ fontSize: 11, color: 'var(--c-secondary)' }}>Örnek sahneler · Oyunda kendi kariyerin ve gerçek maç verilerin kullanılır</p></header>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
      <label style={{ fontSize: 10, fontWeight: 800 }}>SAHNE <select data-testid="fixture-scene" value={scene} onChange={(e) => { setScene(e.target.value as Scene); setFinaleDone(false); setAwardClosed(false); }} style={selectStyle}>{scenes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'end', gap: 8, fontSize: 10, fontWeight: 800 }}>
        <label><input data-testid="fixture-dark" type="checkbox" checked={dark} onChange={(e) => setTheme(e.target.checked)} /> Koyu</label>
        <label><input data-testid="fixture-reduce" type="checkbox" checked={reduced} onChange={(e) => setMotion(e.target.checked)} /> Az hareket</label>
      </div>
    </div>
    {scene === 'training' && <><div style={controlsStyle}>
      <label>Odak <select data-testid="fixture-area" value={area} onChange={(e) => setArea(e.target.value as TrainingArea)} style={selectStyle}>{TRAINING_AREAS.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Yoğunluk <select data-testid="fixture-intensity" value={intensity} onChange={(e) => setIntensity(e.target.value as TrainingIntensity)} style={selectStyle}><option value="hafif">Hafif</option><option value="normal">Normal</option><option value="yogun">Yoğun</option></select></label>
      <label>Oyuncu <select data-testid="fixture-players" value={players} onChange={(e) => setPlayers(Number(e.target.value))} style={selectStyle}>{[3, 2, 1, 0].map((n) => <option key={n}>{n}</option>)}</select></label>
    </div><TrainingGround club={home} squad={g.mySquad.slice(0, players)} focus={{ area, intensity, sinceDay: 1 }} level={home.facilities.training} reducedMotion={reduced} /></>}
    {scene === 'transfer' && <><div style={controlsStyle}>
      <label>Sahne <select data-testid="fixture-transfer-mode" value={transferMode} onChange={(e) => setTransferMode(e.target.value as 'seller' | 'reveal')} style={selectStyle}><option value="reveal">Tanıtım</option><option value="seller">Görüşme</option></select></label>
      <label>GEN <select data-testid="fixture-gen" value={gen} onChange={(e) => setGen(Number(e.target.value))} style={selectStyle}>{[79, 80, 84, 85].map((n) => <option key={n}>{n}</option>)}</select></label>
      <label>Konuşmacı <select data-testid="fixture-speaker" value={speaker ?? 'none'} onChange={(e) => setSpeaker(e.target.value === 'none' ? null : e.target.value as TransferSpeaker)} style={selectStyle}><option value="none">Yok</option><option value="manager">Menajer</option><option value="player">Oyuncu</option><option value="representative">Temsilci</option></select></label>
    </div><TransferTheatre mode={transferMode} player={previewPlayer} club={home} seller={away} manager={career.manager} speaking={speaker} /></>}
    {scene === 'atmosphere' && <><div style={controlsStyle}>
      <label>Örnek olay <select data-testid="fixture-reaction" value={reactionKind} onChange={(e) => { setReactionKind(e.target.value); setSequence((x) => x + 1); }} style={selectStyle}><option value="idle">Bekleme</option><option value="ownGoal">Takımımız gol</option><option value="awayGoal">Rakip gol</option><option value="save">Kurtarış</option><option value="card">Kart</option><option value="cancelled">İptal gol</option></select></label>
      <label>Yedek <select data-testid="fixture-bench" value={bench} onChange={(e) => setBench(Number(e.target.value))} style={selectStyle}>{[3, 2, 1, 0].map((n) => <option key={n}>{n}</option>)}</select></label>
      <div><label><input data-testid="fixture-paused" type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} /> Duraklat</label><br /><label><input data-testid="fixture-done" type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} /> Son düdük</label><br /><label><input data-testid="fixture-suspended" type="checkbox" checked={suspended} onChange={(e) => setSuspended(e.target.checked)} /> Cezalı menajer</label></div>
    </div><LiveAtmosphere club={home} manager={career.manager} bench={g.mySquad.slice(0, bench)} managerSuspended={suspended} reaction={reaction} reactionSequence={sequence} paused={paused} done={done} reducedMotion={reduced} /></>}
    {scene === 'award' && (award && !awardClosed ? <MatchAwardCeremony award={award} reducedMotion={reduced} onClose={() => setAwardClosed(true)} /> : <p data-testid="fixture-award-closed">Tören kapatıldı.</p>)}
    {scene === 'highlights' && <><label style={{ display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 800 }}><input data-testid="fixture-short-highlights" type="checkbox" checked={shortHighlights} onChange={(e) => setShortHighlights(e.target.checked)} /> İki olaylık örnek</label><MatchHighlights home={home} away={away} homeGoals={1} awayGoals={1} events={highlightEvents} reduceMotion={reduced} /></>}
    {scene === 'finale' && <><div style={controlsStyle}><label>Örnek sonuç <select data-testid="fixture-outcome" value={outcome} onChange={(e) => { setOutcome(e.target.value as typeof outcome); setFinaleDone(false); }} style={selectStyle}><option value="champion">Şampiyon</option><option value="promoted">Yükselme</option><option value="relegated">Düşüş</option><option value="ordinary">Normal sezon</option></select></label></div>
      {finaleDone ? <p data-testid="fixture-finale-closed">Kariyere dönüldü.</p> : <div style={{ height: 'min(700px, calc(100dvh - 165px))', minHeight: 380, border: '1px solid var(--c-line)', borderRadius: 12, overflow: 'hidden' }}>
        <SeasonFinale key={outcome} record={{ season: '2026–27', clubId: home.id, leagueId: home.league, rank: outcome === 'champion' ? 1 : outcome === 'promoted' ? 2 : outcome === 'relegated' ? 12 : 6, pts: 58, cup: 'Çeyrek final' }} myClub={home} championId={outcome === 'champion' ? home.id : away.id} cupWinnerId={away.id} champion={outcome === 'champion'} cupWon={false} promoted={outcome === 'promoted'} relegated={outcome === 'relegated'} awards={awards} onDone={() => setFinaleDone(true)} />
      </div>}</>}
  </main>;
}
const selectStyle: React.CSSProperties = { display: 'block', width: '100%', minHeight: 38, border: '1px solid var(--c-line)', borderRadius: 8, background: 'var(--c-surface)', color: 'var(--c-primary)', padding: '4px 6px', fontSize: 12 };
const controlsStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 7, marginBottom: 10, fontSize: 10, fontWeight: 800 };
document.documentElement.classList.add(query.get('theme') === 'dark' ? 'm26-dark' : 'm26-light');
createRoot(document.getElementById('root')!).render(<GameProvider career={career}><Showcase /></GameProvider>);
