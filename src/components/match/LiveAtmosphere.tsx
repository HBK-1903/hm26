import React from 'react';
import type { Club, ManagerFace, Player } from '../../types';
import type { LiveReaction } from '../../engine/liveReaction';
import { avatarParts, BASE_PALETTES, playerFaceFromSeed, playerFaceSeed, presetFace, type FaceLike, type KitPalettes } from '../assets/kit';
import { Crest } from '../assets/Crest';
import './liveAtmosphere.css';

const Person: React.FC<{ face: FaceLike; palette?: KitPalettes; name: string; roleLabel: string; index: number; manager?: boolean; suspended?: boolean }> = ({ face, palette, name, roleLabel, index, manager, suspended }) => {
  const layers = avatarParts(face, palette ?? BASE_PALETTES);
  const shortName = name.trim().split(/\s+/).slice(-1)[0] || roleLabel;
  return <div className={`live-atmosphere__person${manager ? ' live-atmosphere__person--manager' : ''}${suspended ? ' live-atmosphere__person--stands' : ''}`}
    style={{ '--person-index': index } as React.CSSProperties} role="img" aria-label={`${roleLabel}: ${name}`}>
    <svg viewBox="0 0 128 132" aria-hidden="true" focusable="false">
      <g className="live-atmosphere__arm live-atmosphere__arm--left"><path d="M37 98 Q24 98 18 77" fill="none" stroke={manager ? '#25394a' : 'var(--crowd-club)'} strokeWidth="11" strokeLinecap="round" /><circle cx="18" cy="77" r="5" fill="#d79a73" /></g>
      <g className="live-atmosphere__arm live-atmosphere__arm--right"><path d="M91 98 Q104 98 110 77" fill="none" stroke={manager ? '#25394a' : 'var(--crowd-club)'} strokeWidth="11" strokeLinecap="round" /><circle cx="110" cy="77" r="5" fill="#d79a73" /></g>
      <g dangerouslySetInnerHTML={{ __html: layers.neck + layers.outfit }} />
      <g className="live-atmosphere__head" dangerouslySetInnerHTML={{ __html: layers.hairBack + layers.head + layers.beard + layers.eyes + layers.features + layers.mouth + layers.hair + layers.glasses }} />
    </svg>
    <span aria-hidden="true">{manager ? roleLabel : shortName}</span>
  </div>;
};

export const LiveAtmosphere: React.FC<{
  club: Club;
  manager: { name: string; portrait: number; face?: ManagerFace | null };
  bench: Player[];
  managerSuspended: boolean;
  reaction: LiveReaction | null;
  recentReactions?: readonly LiveReaction[];
  reactionSequence: number;
  paused: boolean;
  done: boolean;
  reducedMotion: boolean;
}> = ({ club, manager, bench, managerSuspended, reaction, recentReactions = [], reactionSequence, paused, done, reducedMotion }) => {
  const visibleBench = bench.slice(0, 3);
  const style = { '--crowd-club': club.color1, '--crowd-trim': club.color2 } as React.CSSProperties;
  const frozen = paused || done;
  const mood = reaction?.mood ?? 'idle';
  const teamPalette: KitPalettes = { ...BASE_PALETTES, suit: [club.color1], accent: [club.color2] };
  return <div className="live-atmosphere-wrap" data-testid="live-atmosphere" data-reaction={reaction?.event.kind ?? 'idle'}
    data-reaction-side={reaction?.eventSide ?? 'unknown'} data-mood={mood} data-motion={reducedMotion ? 'reduced' : frozen ? 'paused' : 'full'}>
    <div key={reactionSequence} className={`live-atmosphere live-atmosphere--${mood}${frozen ? ' is-paused' : ''}${reducedMotion ? ' is-reduced' : ''}`} style={style}>
      <div className="live-atmosphere__light" aria-hidden="true" />
      <div className="live-atmosphere__heading"><div><span>CANLI YAYIN</span><strong>KULÜBE & TRİBÜN</strong></div><Crest club={club} size={29} /></div>
      <div className="live-atmosphere__crowd" aria-hidden="true">{Array.from({ length: 20 }, (_, index) => <i key={index} style={{ '--fan-index': index } as React.CSSProperties}><b /></i>)}</div>
      <div className="live-atmosphere__banner" aria-hidden="true"><span>{club.short}</span><i /> TARAFTAR BÖLÜMÜ</div>
      <Person face={manager.face ?? presetFace(manager.portrait)} name={manager.name || 'Menajer'} roleLabel={managerSuspended ? 'MENAJER · TRİBÜNDE' : 'MENAJER'} index={0} manager suspended={managerSuspended} />
      {visibleBench.map((player, index) => <Person key={player.id} face={playerFaceFromSeed(playerFaceSeed(player.id))} palette={teamPalette} name={player.name} roleLabel="YEDEK" index={index + 1} />)}
      {bench.length === 0 && <span className="live-atmosphere__no-bench">Kayıtlı yedek yok</span>}
      <div className="live-atmosphere__bottom"><b>{reaction ? reaction.title : 'MAÇ TAKİP EDİLİYOR'}</b><span>{reaction ? `${reaction.event.minute}′` : 'CANLI'}</span></div>
    </div>
    <div className="live-atmosphere__event" aria-live="polite" aria-atomic="true">
      {reaction ? <><b>{reaction.event.minute}′ · {reaction.title}</b><span>{reaction.event.text}</span></> : <><b>Kenarda gözler sahada</b><span>Gerçek gol, kurtarış ve kartlarda kulübe ile tribün tepki verir.</span></>}
    </div>
    {visibleBench.length > 0 && <div className="live-atmosphere__bench-list" role="group" aria-label="Sahnede görünen yedekler">
      <b>SAHNEDEKİ YEDEKLER</b><span>{visibleBench.map((player) => player.name).join(' · ')}</span>
    </div>}
    <details className="live-atmosphere__history" data-testid="live-reaction-history">
      <summary><span>Son tepkiler</span><b>{recentReactions.length} olay</b></summary>
      {recentReactions.length ? <ol>{recentReactions.map((cue, index) => <li key={index}>
        <b>{cue.event.minute}′ · {cue.title}</b><span>{cue.event.text}</span>
      </li>)}</ol> : <p>Henüz gol, kurtarış veya kart yok.</p>}
    </details>
    <p className="live-atmosphere__note">{managerSuspended ? 'Cezalı menajer maçı tribünden takip ediyor. ' : ''}{frozen ? 'Maç durduğu için sahne de durur. ' : ''}Tepkiler yalnızca görseldir; skoru etkilemez.</p>
  </div>;
};
