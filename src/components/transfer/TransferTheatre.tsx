import React from 'react';
import type { Club, ManagerFace, Player } from '../../types';
import { Crest } from '../assets/Crest';
import { avatarParts, BASE_PALETTES, playerFaceFromSeed, playerFaceSeed, presetFace, type FaceLike, type KitPalettes } from '../assets/kit';
import { transferDialogueHash, transferRevealForGen, type TransferReveal } from '../../data/transferPresentation';
import type { TransferSpeaker, TransferVoiceLine } from '../../data/transferVoices';
import './transferTheatre.css';

type TheatreMode = 'seller' | 'player' | 'reveal';

const Puppet: React.FC<{ face: FaceLike; palette?: KitPalettes; talking: boolean; label: string }> = ({ face, palette, talking, label }) => {
  const layers = avatarParts(face, palette ?? BASE_PALETTES);
  return (
    <div className={`transfer-puppet${talking ? ' is-talking' : ''}`} aria-label={label}>
      <svg viewBox="18 7 92 121" aria-hidden="true" focusable="false">
        <g dangerouslySetInnerHTML={{ __html: layers.neck + layers.outfit }} />
        <g className="transfer-puppet__head">
          <g dangerouslySetInnerHTML={{ __html: layers.hairBack + layers.head + layers.beard + layers.eyes + layers.features + layers.hair + layers.glasses }} />
          <ellipse className="transfer-puppet__mouth" cx="64" cy="74" rx="3.1" ry="2.0" fill="#6b302b" />
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
  const opponentFace = mode === 'seller'
    ? presetFace(transferDialogueHash(seller?.id ?? 'representative') % 6)
    : playerFaceFromSeed(playerFaceSeed(player.id));
  const opponentPalette = mode === 'seller' ? BASE_PALETTES : palette;
  const opponentSpeaker: TransferSpeaker = mode === 'seller' ? 'representative' : 'player';
  const title = mode === 'seller' ? 'KULÜP GÖRÜŞMESİ' : mode === 'player' ? 'OYUNCUYLA GÖRÜŞME' : reveal === 'star' ? 'YILDIZ TANITIMI' : reveal === 'stadium' ? 'STADYUM TANITIMI' : 'BASIN TANITIMI';
  const venue = mode !== 'reveal' ? (seller?.name ?? 'Serbest oyuncu') : reveal === 'press' ? 'Basın odası' : club.stadium;
  const style = { '--transfer-club': club.color1, '--transfer-trim': club.color2 } as React.CSSProperties;
  return (
    <div className={`transfer-theatre transfer-theatre--${scene}`} style={style} data-testid="transfer-theatre" data-scene={scene} aria-label={`${title}: ${venue}`}>
      <div className="transfer-theatre__veil" aria-hidden="true" />
      {(scene === 'stadium' || scene === 'star') && <div className="transfer-theatre__stadium-lights" aria-hidden="true" />}
      {scene === 'star' && <div className="transfer-theatre__confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>}
      <div className="transfer-theatre__heading">
        <div><div className="transfer-theatre__eyebrow">{title}</div><div className="transfer-theatre__venue">{venue}</div></div>
        <span className="transfer-theatre__crest"><Crest club={club} size={35} /></span>
      </div>
      <div className="transfer-theatre__actors">
        <div className="transfer-theatre__actor">
          <Puppet face={managerFace} talking={speaking === 'manager'} label={manager.name || 'Menajer'} />
          <span>MENAJER</span>
        </div>
        {mode === 'reveal' && <Shirt club={club} player={player} />}
        <div className="transfer-theatre__actor">
          <Puppet face={opponentFace} palette={opponentPalette} talking={speaking === opponentSpeaker} label={mode === 'seller' ? 'Kulüp temsilcisi' : player.name} />
          <span>{mode === 'seller' ? 'TEMSİLCİ' : 'OYUNCU'}</span>
        </div>
      </div>
      <div className="transfer-theatre__foot" aria-hidden="true" />
      <div className="transfer-theatre__caption">
        <span>{mode === 'reveal' ? 'HOŞ GELDİN' : mode === 'seller' ? 'TRANSFER MASASI' : 'SÖZLEŞME MASASI'}</span>
        <strong>{player.name}</strong>
        <small>{player.ratings.gen} GEN · {player.age} yaş</small>
      </div>
    </div>
  );
};

const SPEAKER_LABEL: Record<TransferSpeaker, string> = { manager: 'Menajer', representative: 'Kulüp temsilcisi', player: 'Oyuncu', announcer: 'Sunucu' };
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
