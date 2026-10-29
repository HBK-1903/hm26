import React from 'react';
import type { Club, ManagerFace, Player } from '../../types';
import { Crest } from '../assets/Crest';
import { avatarParts, BASE_PALETTES, playerFaceFromSeed, playerFaceSeed, presetFace, type FaceLike, type KitPalettes } from '../assets/kit';
import { transferDialogueHash, transferRevealForGen, type TransferReveal } from '../../data/transferPresentation';
import type { TransferSpeaker, TransferVoiceLine } from '../../data/transferVoices';
import './transferTheatre.css';

type TheatreMode = 'seller' | 'buyer' | 'player' | 'renewal' | 'reveal';

const Puppet: React.FC<{ face: FaceLike; palette?: KitPalettes; talking: boolean; label: string; side: 'manager' | 'opponent'; decorative?: boolean }> = ({ face, palette, talking, label, side, decorative = false }) => {
  const layers = avatarParts(face, palette ?? BASE_PALETTES);
  return (
    <div className={`transfer-puppet transfer-puppet--${side}${talking ? ' is-talking' : ''}`} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined} data-talking={talking}>
      <svg viewBox="18 7 92 121" aria-hidden="true" focusable="false">
        <g className="transfer-puppet__torso" dangerouslySetInnerHTML={{ __html: layers.neck + layers.outfit }} />
        <g className="transfer-puppet__head">
          <g className="transfer-puppet__expression">
            <g dangerouslySetInnerHTML={{ __html: layers.hairBack + layers.head + layers.beard }} />
            <g className="transfer-puppet__eyes" dangerouslySetInnerHTML={{ __html: layers.eyes }} />
            <g dangerouslySetInnerHTML={{ __html: layers.features }} />
            <g className="transfer-puppet__closed-mouth" dangerouslySetInnerHTML={{ __html: layers.mouth }} />
            <g className="transfer-puppet__open-mouth">
              <ellipse cx="64" cy="73.8" rx="4.1" ry="2.65" fill="#54241f" />
              <path d="M60.8 73.1Q64 74 67.2 73.1" fill="none" stroke="#f3ded1" strokeWidth=".8" strokeLinecap="round" />
              <path d="M62 75.1Q64 74.2 66 75.1" fill="none" stroke="#d57b73" strokeWidth=".8" strokeLinecap="round" />
            </g>
            <g dangerouslySetInnerHTML={{ __html: layers.hair + layers.glasses }} />
          </g>
        </g>
      </svg>
    </div>
  );
};

const Shirt: React.FC<{ club: Club; player: Player }> = ({ club, player }) => (
  <div className="transfer-theatre__shirt" aria-label={`${club.name} renklerinde forma`}>
    <svg viewBox="0 0 100 115" aria-hidden="true" focusable="false">
      <path d="M27 8 39 3 Q50 14 61 3 L73 8 92 27 82 44 73 38 76 109 H24 L27 38 18 44 8 27Z" fill={club.color1} stroke="rgba(255,255,255,.62)" strokeWidth="2" />
      <path d="M39 4 Q50 19 61 4 L57 3 Q50 11 43 3Z" fill={club.color2} />
      <path d="M27 35 20 39 14 29 M73 35 80 39 86 29 M28 99H72" fill="none" stroke={club.color2} strokeWidth="4" opacity=".85" />
      {Number.isInteger(player.kitNumber) && (player.kitNumber ?? 0) >= 1 && (player.kitNumber ?? 0) <= 99 && (
        <text x="50" y="77" textAnchor="middle" fill={club.color2} stroke="rgba(0,0,0,.6)" strokeWidth="1" paintOrder="stroke" fontSize="29" fontWeight="900">{player.kitNumber}</text>
      )}
    </svg>
  </div>
);

export const TransferTheatre: React.FC<{
  mode: TheatreMode;
  player: Player;
  club: Club;
  seller: Club | null;
  manager: { name: string; portrait: number; face?: ManagerFace | null };
  speaking: TransferSpeaker | null;
}> = ({ mode, player, club, seller, manager, speaking }) => {
  const reveal: TransferReveal = transferRevealForGen(player.ratings.gen);
  const scene = mode === 'reveal' ? reveal : 'negotiation';
  const playerClub = mode === 'reveal' ? club : seller;
  const palette: KitPalettes = playerClub ? { ...BASE_PALETTES, suit: [playerClub.color1], accent: [playerClub.color2] } : BASE_PALETTES;
  const managerFace = manager.face ?? presetFace(manager.portrait);
  const isRepresentative = mode === 'seller' || mode === 'buyer';
  const opponentFace = isRepresentative
    ? presetFace(transferDialogueHash(seller?.id ?? 'representative') % 6)
    : playerFaceFromSeed(playerFaceSeed(player.id));
  const opponentPalette = isRepresentative ? BASE_PALETTES : palette;
  const opponentSpeaker: TransferSpeaker = isRepresentative ? 'representative' : 'player';
  const title = mode === 'seller' ? 'KULÜP GÖRÜŞMESİ' : mode === 'buyer' ? 'SATIŞ GÖRÜŞMESİ' : mode === 'renewal' ? 'SÖZLEŞME YENİLEME' : mode === 'player' ? 'OYUNCUYLA GÖRÜŞME' : reveal === 'star' ? 'YILDIZ TANITIMI' : reveal === 'stadium' ? 'STADYUM TANITIMI' : 'BASIN TANITIMI';
  const venue = mode !== 'reveal' ? (seller?.name ?? 'Serbest oyuncu') : reveal === 'press' ? 'Basın odası' : club.stadium;
  const style = { '--transfer-club': club.color1, '--transfer-trim': club.color2 } as React.CSSProperties;
  return (
    <div className={`transfer-theatre transfer-theatre--${scene}`} style={style} data-testid="transfer-theatre" data-scene={scene} data-speaking={speaking ?? 'none'} aria-label={`${title}: ${venue}`}>
      <div className="transfer-theatre__veil" aria-hidden="true" />
      {(scene === 'stadium' || scene === 'star') && <div className="transfer-theatre__stadium-lights" aria-hidden="true" />}
      {scene === 'star' && <div className="transfer-theatre__confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>}
      <div className="transfer-theatre__heading">
        <div><div className="transfer-theatre__eyebrow">{title}</div><div className="transfer-theatre__venue">{venue}</div></div>
        <span className="transfer-theatre__crest"><Crest club={club} size={35} /></span>
      </div>
      <div className="transfer-theatre__actors">
        <div className={`transfer-theatre__actor${speaking === 'manager' ? ' is-speaking' : ''}`}>
          <Puppet face={managerFace} talking={speaking === 'manager'} label={manager.name || 'Menajer'} side="manager" />
          <span>MENAJER</span>
        </div>
        {mode === 'reveal' && <Shirt club={club} player={player} />}
        <div className={`transfer-theatre__actor${speaking === opponentSpeaker ? ' is-speaking' : ''}`}>
          <Puppet face={opponentFace} palette={opponentPalette} talking={speaking === opponentSpeaker} label={isRepresentative ? 'Kulüp temsilcisi' : player.name} side="opponent" />
          <span>{isRepresentative ? 'TEMSİLCİ' : 'OYUNCU'}</span>
        </div>
      </div>
      <div className="transfer-theatre__foot" aria-hidden="true" />
      <div className="transfer-theatre__caption">
        <span>{mode === 'reveal' ? 'HOŞ GELDİN' : mode === 'buyer' ? 'SATIŞ MASASI' : mode === 'seller' ? 'TRANSFER MASASI' : 'SÖZLEŞME MASASI'}</span>
        <strong>{player.name}</strong>
        <small>{player.ratings.gen} GEN · {player.age} yaş</small>
      </div>
    </div>
  );
};

const SPEAKER_LABEL: Record<TransferSpeaker, string> = { manager: 'Menajer', representative: 'Kulüp temsilcisi', player: 'Oyuncu', announcer: 'Sunucu' };

/** On a long mobile form, keep the actual speaker visible without scrolling the user's choices. */
export const TransferSpeechCue: React.FC<{
  player: Player; club: Club; seller: Club | null;
  manager: { name: string; portrait: number; face?: ManagerFace | null };
  mode: TheatreMode; speaking: TransferSpeaker | null; line: TransferVoiceLine | null; onSkip: () => void;
}> = ({ player, club, seller, manager, mode, speaking, line, onSkip }) => {
  if (!speaking || !line || speaking !== line.speaker) return null;
  const characterClub = mode === 'reveal' ? club : seller;
  const palette: KitPalettes = characterClub ? { ...BASE_PALETTES, suit: [characterClub.color1], accent: [characterClub.color2] } : BASE_PALETTES;
  const face = speaking === 'manager' ? manager.face ?? presetFace(manager.portrait)
    : speaking === 'representative' ? presetFace(transferDialogueHash(seller?.id ?? 'representative') % 6)
      : playerFaceFromSeed(playerFaceSeed(player.id));
  return <div className="transfer-floating-cue__card" data-testid="transfer-speaking-cue" data-speaker={speaking}>
    {speaking === 'announcer' ? <div className="transfer-floating-cue__announcer" aria-hidden="true">🎙</div> : <div className="transfer-floating-cue__portrait">
      <Puppet face={face} palette={speaking === 'player' ? palette : BASE_PALETTES} talking label="" side={speaking === 'manager' ? 'manager' : 'opponent'} decorative />
    </div>}
    <div className="transfer-floating-cue__copy"><b>{SPEAKER_LABEL[speaking]}</b><span>{line.text}</span></div>
    <button type="button" onClick={onSkip} aria-label="Konuşmayı atla">×</button>
  </div>;
};

export const TransferSubtitle: React.FC<{ line: TransferVoiceLine | null; muted: boolean; systemMuted: boolean; onReplay: () => void; onSkip: () => void; onToggle: () => void }> = ({ line, muted, systemMuted, onReplay, onSkip, onToggle }) => (
  <div className="transfer-dialogue" data-testid="transfer-subtitle">
    <div className="transfer-dialogue__top">
      <span>{line ? SPEAKER_LABEL[line.speaker] : 'SES VE ALTYAZI'}</span>
      <div>
        {line && <><button type="button" onClick={onReplay} aria-label="Son repliği tekrar dinle">↻ Dinle</button><button type="button" onClick={onSkip} aria-label="Repliği atla">Atla</button></>}
        <button type="button" onClick={onToggle} aria-pressed={muted} aria-label={muted ? 'Transfer sesini aç' : 'Transfer sesini kapat'}>{muted ? '🔇 Ses kapalı' : '🔊 Ses açık'}</button>
      </div>
    </div>
    <p aria-live="polite">{line ? `“${line.text}”` : 'Bir cevap seçtiğinde menajerin konuşur; replikler yazıyla da görünür.'}</p>
    {systemMuted && <small className="text-muted text-[10px]">Ana ses veya efektler ayarlardan kapalı; altyazılar açık.</small>}
  </div>
);
