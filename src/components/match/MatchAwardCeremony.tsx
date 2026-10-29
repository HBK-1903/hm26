import React, { useEffect } from 'react';
import type { MatchAward } from '../../data/matchAward';
import { matchAwardLine } from '../../data/matchAward';
import { clubByIdSafe } from '../../data/clubs';
import { avatarParts, playerFaceFromSeed, playerFaceSeed } from '../assets/kit';
import type { Club, Player } from '../../types';
import { useReducedMotion } from '../useReducedMotion';
import { useTransferSpeech } from '../transfer/useTransferSpeech';
import './matchAward.css';

// Portre kitiyle aynı gerçek oyuncu yüzü, maçtaki kulübün formasıyla tam gövde.
const AwardPlayer: React.FC<{ player: Player; club?: Club }> = ({ player, club }) => {
  const layers = avatarParts(playerFaceFromSeed(playerFaceSeed(player.id)));
  const primary = club?.color1 ?? '#446453', trim = club?.color2 ?? '#f0e7cd';
  return <svg viewBox="0 0 128 172" className="match-award__portrait" role="img" aria-label={`${player.name} ödül töreninde`} data-player-id={player.id}>
    <ellipse cx="64" cy="165" rx="38" ry="5" fill="#061910" opacity=".35" />
    <path d="M43 124h42l-3 22H46Z" fill="#253d39" /><path d="M48 145l-3 17M80 145l3 17" stroke="#e4d7bf" strokeWidth="10" strokeLinecap="round" /><path d="M42 164h13M75 164h13" stroke="#1b302a" strokeWidth="6" strokeLinecap="round" />
    <path d="M40 91Q27 90 20 103L14 124l13 5 9-16v28h56v-28l9 16 13-5-6-21q-7-13-20-12Z" fill={primary} stroke="#20362e" strokeWidth="2" />
    <path d="M19 119l10 4M99 123l10-4M37 118h54" stroke={trim} strokeWidth="5" opacity=".9" /><circle cx="27" cy="130" r="5" fill="#d6a07e" /><circle cx="101" cy="130" r="5" fill="#d6a07e" />
    <g dangerouslySetInnerHTML={{ __html: layers.neck }} /><path d="M51 89q13 13 26 0" fill="none" stroke={trim} strokeWidth="4" />
    <g dangerouslySetInnerHTML={{ __html: layers.hairBack + layers.head + layers.beard + layers.eyes + layers.features + layers.mouth + layers.hair + layers.glasses }} />
    {player.kitNumber && <text x="64" y="133" fill={trim} textAnchor="middle" fontSize="13" fontWeight="900">{player.kitNumber}</text>}
  </svg>;
};

export const MatchAwardCeremony: React.FC<{ award: MatchAward; reducedMotion: boolean; onClose: () => void }> = ({ award, reducedMotion, onClose }) => {
  const reduce = useReducedMotion(reducedMotion);
  const speech = useTransferSpeech();
  const line = matchAwardLine(award.id);
  const club = clubByIdSafe(award.clubId);
  useEffect(() => { speech.play(line); return () => speech.stop(); }, [line.id]); // User explicitly opened the ceremony.
  const row = award.row;
  const stats = [row.g > 0 ? `${row.g} gol` : null, row.a > 0 ? `${row.a} asist` : null, row.saves > 0 ? `${row.saves} kurtarış` : null, `${row.min} dakika`].filter(Boolean).join(' · ');
  return <section className={`match-award${reduce ? ' is-reduced' : ''}`} data-testid="match-award" data-player-id={award.id} data-motion={reduce ? 'reduced' : 'full'} aria-label="Maçın adamı ödül töreni">
    <div className="match-award__stage">
      <div className="match-award__lights" aria-hidden="true" /><div className="match-award__stands" aria-hidden="true" />
      <div className="match-award__confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--award-i': index } as React.CSSProperties} />)}</div>
      <div className="match-award__heading"><span>MAÇIN YILDIZI</span><b>ÖDÜL TÖRENİ</b></div>
      <div className="match-award__winner">
        {award.player ? <AwardPlayer player={award.player} club={club} /> : <div className="match-award__unknown" aria-label="Oyuncu portresi yok">★</div>}
        <svg className="match-award__cup" viewBox="0 0 80 105" role="img" aria-label="Maçın adamı ödülü"><path d="M20 11h40v26q0 18-20 23Q20 55 20 37Z" fill="#e1b45a" stroke="#fff2ba" strokeWidth="3"/><path d="M20 17H8v8q0 21 17 21M60 17h12v8q0 21-17 21" fill="none" stroke="#e1b45a" strokeWidth="6"/><path d="M40 59v19M26 91h28M30 81h20" stroke="#e1b45a" strokeWidth="7" strokeLinecap="round"/><path d="m40 20 3 7 8 .7-6 5 2 8-7-4-7 4 2-8-6-5 8-.7Z" fill="#fff3cc" /></svg>
      </div>
      <div className="match-award__podium"><span>{club?.name ?? 'Kulüp bilgisi yok'}</span><strong>{award.player?.name ?? 'Oyuncu bilgisi yok'}</strong><b>★ {row.rating.toFixed(2)} MAÇ PUANI</b></div>
    </div>
    <div className="match-award__caption"><b>STADYUM ANONSU</b><p>“{line.text}”</p></div>
    <p className="match-award__stats">{stats} · Oyuncu adı ve puanı gerçek maç raporundan alınır.</p>
    <div className="match-award__controls"><button type="button" onClick={() => speech.play(line)} disabled={speech.muted}>{speech.speaking ? 'Anonsu Yeniden Çal' : 'Anonsu Çal'}</button><button type="button" onClick={speech.toggle}>{speech.muted ? 'Tören Sesini Aç' : 'Tören Sesini Kapat'}</button><button type="button" onClick={onClose}>Töreni Kapat</button></div>
    <p className="match-award__note">Anons ana ses ve efekt ayarlarına uyar. Oyuncu adı ekranda gösterilir; ses engellenirse altyazı kullanılabilir.</p>
  </section>;
};
