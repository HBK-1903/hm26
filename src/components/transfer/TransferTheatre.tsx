import React from 'react';
import type { Club, ManagerFace, Player } from '../../types';
import { Crest } from '../assets/Crest';
import { avatarParts, BASE_PALETTES, extendPalettes, normalizeFace, playerFaceFromSeed, playerFaceSeed, presetFace, type FaceLike, type KitPalettes } from '../assets/kit';
import { useCinematicShot, type CameraCue } from '../cinematic/Cinematic';
import { SceneBackdrop, type SceneAtmosphere } from '../cinematic/SceneBackdrop';
import { BroadcastCrew } from '../cinematic/BroadcastCrew';
import { transferDialogueHash, transferRevealForGen, type TransferReveal } from '../../data/transferPresentation';
import type { TransferSpeaker, TransferVoiceLine } from '../../data/transferVoices';
import './transferTheatre.css';

type TheatreMode = 'seller' | 'buyer' | 'player' | 'renewal' | 'reveal';

type PuppetGesture = 'rest' | 'microphone';

/** The familiar portrait keeps a simple head-and-shoulders silhouette.
 * The interviewer alone holds a microphone; players need no drawn arms. */
export const CinematicPuppet: React.FC<{
  face: FaceLike; palette?: KitPalettes; talking: boolean; label: string;
  side: 'manager' | 'opponent'; decorative?: boolean; gesture?: PuppetGesture;
  microphoneTarget?: 'reporter' | 'manager';
}> = ({ face, palette, talking, label, side, decorative = false, gesture = 'rest', microphoneTarget = 'reporter' }) => {
  const colors = extendPalettes(palette ?? BASE_PALETTES);
  const normalized = normalizeFace(face, colors);
  const skin = colors.skin[normalized.skin];
  const sleeve = colors.suit[normalized.suit];
  const layers = avatarParts(face, palette ?? BASE_PALETTES);
  return (
    <div className={`transfer-puppet transfer-puppet--${side}${talking ? ' is-talking' : ''}`} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined} data-talking={talking}>
      <svg viewBox="12 7 104 143" aria-hidden="true" focusable="false">
        <g className="transfer-puppet__torso">
          <path d="M51 89H77Q98 92 104 108L101 146Q64 153 27 146L24 108Q30 92 51 89Z" fill={sleeve} stroke="#314a40" strokeWidth="1.3" />
          <g dangerouslySetInnerHTML={{ __html: layers.neck + layers.outfit }} />
          <path d="M34 137Q64 143 94 137" fill="none" stroke="#ffffff" strokeOpacity=".12" strokeWidth="1.3" />
        </g>
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
        {gesture === 'microphone' && <g className="transfer-puppet__mic-arm" data-testid="interview-microphone" data-target={microphoneTarget}>
          <path d="M31 103Q18 109 11 97L2 87" fill="none" stroke={sleeve} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 91L0 86" fill="none" stroke="#e6ddc5" strokeWidth="7" />
          <path d="M3 87L-17 70" fill="none" stroke="#253a38" strokeWidth="6" strokeLinecap="round" />
          <path d="M-10 75L-5 79" fill="none" stroke="#ddc796" strokeWidth="5" />
          <ellipse cx="-20" cy="67" rx="7" ry="8" transform="rotate(-48 -20 67)" fill="#6e8780" stroke="#233b37" strokeWidth="2" />
          <circle cx="2" cy="87" r="5" fill={skin} stroke="#604a3b" strokeWidth="1" />
        </g>}
      </svg>
    </div>
  );
};

/** Only the pen and paper move. The signature is revealed directly beneath
 * the nib, with no detached hand or player arm in the illustration. */
const SigningAction: React.FC = () => {
  const inkId = `signing-ink-${React.useId().replace(/:/g, '')}`;
  return <svg className="transfer-theatre__signing" data-testid="signing-illustration" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
    <defs><clipPath id={inkId}><rect className="transfer-signing__ink-reveal" data-testid="signing-ink-reveal" x="33.5" y="48" width="53" height="14" /></clipPath></defs>
    <g className="transfer-signing__paper">
      <rect x="13" y="17" width="96" height="55" rx="3" fill="#30473e" opacity=".3" />
      <rect x="11" y="15" width="96" height="55" rx="3" fill="#f5ecd4" stroke="#a39372" strokeWidth="1.8" />
      <path d="M20 25H96M20 32H92M20 39H76" stroke="#c0b69d" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 63H94" stroke="#c6bba2" strokeWidth="1" />
      <path data-testid="signing-ink" d="M34 58L39 55L43 58L47 53L51 58L55 55L59 58L64 55L70 57L77 53L86 52" fill="none" stroke="#4e4a38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#${inkId})`} />
    </g>
    <g className="transfer-signing__pen" data-testid="signing-pen">
      <g className="transfer-signing__lift">
        <path d="M35 56L52 27" fill="none" stroke="#203936" strokeWidth="5" strokeLinecap="round" />
        <path d="M38 51L41 46M49 32L51 29" fill="none" stroke="#e1bd72" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M41 45L50 30" fill="none" stroke="#7b9a8b" strokeWidth="1" strokeLinecap="round" />
        <path d="M34 58l1-5 3 2Z" fill="#cba85f" stroke="#30473e" strokeWidth=".8" />
        <circle data-testid="signing-pen-tip" cx="34" cy="58" r=".7" fill="#4e4a38" />
      </g>
    </g>
  </svg>;
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
  cinematic?: boolean;
  cameraCue?: CameraCue;
  beat?: string;
  /** Sale and transfer both sign with the player, but have different surroundings. */
  signingContext?: 'transfer' | 'sale';
}> = ({ mode, player, club, seller, manager, speaking, cinematic = false, cameraCue = null, beat, signingContext = 'transfer' }) => {
  const reveal: TransferReveal = transferRevealForGen(player.ratings.gen);
  const scene = mode === 'reveal' ? reveal : 'negotiation';
  const signing = scene === 'negotiation' && beat === 'signed';
  // A short detail shot accompanies the actual signature or presentation, then
  // returns to the wide two-person view. It never advances the user's decision.
  const sceneCue: CameraCue = beat === 'signed' && scene === 'negotiation'
    ? { key: `sign:${mode}:${signingContext}:${player.id}`, target: 'table' }
    : mode === 'reveal' ? { key: `reveal:${reveal}:${player.id}`, target: 'opponent' } : null;
  const shot = useCinematicShot(cinematic ? (sceneCue ?? cameraCue) : null);
  const atmosphere: SceneAtmosphere = mode === 'reveal' ? reveal
    : beat === 'signed' ? (mode === 'renewal' ? 'sign-renewal' : signingContext === 'sale' ? 'sign-sale' : 'sign-transfer')
    : mode === 'seller' ? 'club' : mode === 'buyer' ? 'sale' : mode;
  const playerClub = mode === 'reveal' ? club : seller;
  const palette: KitPalettes = playerClub ? { ...BASE_PALETTES, suit: [playerClub.color1], accent: [playerClub.color2] } : BASE_PALETTES;
  const managerFace = manager.face ?? presetFace(manager.portrait);
  const isRepresentative = mode === 'seller' || mode === 'buyer';
  const opponentFace = isRepresentative
    ? presetFace(transferDialogueHash(seller?.id ?? 'representative') % 6)
    : playerFaceFromSeed(playerFaceSeed(player.id));
  const opponentPalette = isRepresentative ? BASE_PALETTES : palette;
  const opponentSpeaker: TransferSpeaker = isRepresentative ? 'representative' : 'player';
  const title = beat === 'signed' && mode !== 'reveal' ? 'İMZA MASASI' : mode === 'seller' ? 'KULÜP GÖRÜŞMESİ' : mode === 'buyer' ? 'SATIŞ GÖRÜŞMESİ' : mode === 'renewal' ? 'SÖZLEŞME YENİLEME' : mode === 'player' ? 'OYUNCUYLA GÖRÜŞME' : reveal === 'star' ? 'YILDIZ TANITIMI' : reveal === 'stadium' ? 'STADYUM TANITIMI' : 'BASIN TANITIMI';
  const venue = mode !== 'reveal' ? (seller?.name ?? 'Serbest oyuncu') : reveal === 'press' ? 'Basın odası' : club.stadium;
  const style = { '--transfer-club': club.color1, '--transfer-trim': club.color2 } as React.CSSProperties;
  return (
    <div className={`transfer-theatre transfer-theatre--${scene}${cinematic ? ' transfer-theatre--cinematic' : ''}`} style={style} data-testid="transfer-theatre" data-scene={scene} data-atmosphere={atmosphere} data-speaking={speaking ?? 'none'} data-shot={shot} data-beat={beat ?? 'idle'} aria-label={`${title}: ${venue}`}>
      <div className="transfer-theatre__world">
        <SceneBackdrop atmosphere={atmosphere} primary={club.color1} trim={club.color2} />
        <div className="transfer-theatre__veil" aria-hidden="true" />
        {(scene === 'stadium' || scene === 'star') && <><div className="transfer-theatre__stadium-lights" aria-hidden="true" /><div className="transfer-theatre__flags" aria-hidden="true"><i /><i /><i /><i /></div></>}
        {scene === 'press' && <><div className="transfer-theatre__press-light" aria-hidden="true" /><BroadcastCrew className="transfer-theatre__crew" /></>}
        {scene === 'negotiation' && <div className="transfer-theatre__desk" aria-hidden="true"><i /><b /><em /><strong />{signing && <SigningAction />}</div>}
        {scene === 'star' && <div className="transfer-theatre__confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>}
        <div className="transfer-theatre__actors">
          <div className={`transfer-theatre__actor${speaking === 'manager' ? ' is-speaking' : ''}`}>
            <CinematicPuppet face={managerFace} talking={speaking === 'manager'} label={manager.name || 'Menajer'} side="manager" />
            {speaking === 'manager' && <div className="transfer-theatre__voice-meter" aria-hidden="true"><i /><i /><i /></div>}
            <span>MENAJER</span>
          </div>
          {mode === 'reveal' && <Shirt club={club} player={player} />}
          <div className={`transfer-theatre__actor${speaking === opponentSpeaker ? ' is-speaking' : ''}`}>
            <CinematicPuppet face={opponentFace} palette={opponentPalette} talking={speaking === opponentSpeaker} label={isRepresentative ? 'Kulüp temsilcisi' : player.name} side="opponent" />
            {speaking === opponentSpeaker && <div className="transfer-theatre__voice-meter" aria-hidden="true"><i /><i /><i /></div>}
            <span>{isRepresentative ? 'TEMSİLCİ' : 'OYUNCU'}</span>
          </div>
        </div>
        {scene === 'press' && <div className="transfer-theatre__press-mics" aria-hidden="true"><i /><i /><i /></div>}
      </div>
      <div className="transfer-theatre__heading">
        <div><div className="transfer-theatre__eyebrow">{title}</div><div className="transfer-theatre__venue">{venue}</div></div>
        <span className="transfer-theatre__crest"><Crest club={club} size={35} /></span>
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
      <CinematicPuppet face={face} palette={speaking === 'player' ? palette : BASE_PALETTES} talking label="" side={speaking === 'manager' ? 'manager' : 'opponent'} decorative />
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
