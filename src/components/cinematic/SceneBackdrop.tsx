import React from 'react';
import './sceneBackdrop.css';

/** Flat, game-themed scenery: the same simple shapes and palette as the team bus.
 * These illustrations are decorative; clubs, people and decisions come from game data. */
export type SceneAtmosphere =
  | 'club' | 'player' | 'sale' | 'renewal'
  | 'sign-transfer' | 'sign-sale' | 'sign-renewal'
  | 'press' | 'stadium' | 'star' | 'interview';

type Colors = { primary: string; trim: string };
const edge = '#48665a';

const Floor: React.FC<{ color?: string }> = ({ color = '#a9bca7' }) => <>
  <rect y="252" width="640" height="88" fill={color} />
  <path d="M0 255H640M0 292H640" fill="none" stroke="#e7e2ca" strokeWidth="3" opacity=".65" />
</>;
const Plant: React.FC<{ x: number; y: number }> = ({ x, y }) => <g transform={`translate(${x} ${y})`}>
  <path d="M-12 0h24l-4 18H-8Z" fill="#c78864" stroke={edge} strokeWidth="2" />
  <path d="M0 0v-30M0-13q-17-2-18-17 15 0 18 12M0-20q15-3 17-17-14 0-17 12" fill="#70998a" stroke={edge} strokeWidth="3" strokeLinecap="round" />
</g>;
const ShirtIcon: React.FC<Colors & { x: number; y: number; scale?: number }> = ({ x, y, scale = 1, primary, trim }) => <g transform={`translate(${x} ${y}) scale(${scale})`}>
  <path d="M-17-26l10-5q7 8 14 0l10 5 11 13-9 8-6-5 2 40h-30l2-40-6 5-9-8Z" fill={primary} stroke={edge} strokeWidth="2.5" strokeLinejoin="round" />
  <path d="M-6-30q6 7 12 0M-13 8h26" fill="none" stroke={trim} strokeWidth="4" />
  <circle cx="7" cy="-13" r="3" fill={trim} />
</g>;
const Window: React.FC<{ x: number; y: number }> = ({ x, y }) => <g transform={`translate(${x} ${y})`}>
  <rect width="116" height="104" rx="4" fill="#f0ead4" stroke={edge} strokeWidth="4" />
  <rect x="6" y="6" width="104" height="92" fill="#a5c9c9" />
  <circle cx="81" cy="24" r="11" fill="#f1e1ae" />
  <path d="M6 70l22-17 25 15 19-13 38 16v27H6Z" fill="#83a79b" />
  <path d="M58 6v92M6 53h104" fill="none" stroke="#e9eee0" strokeWidth="4" />
</g>;
const Shield: React.FC<Colors & { x: number; y: number; scale?: number }> = ({ x, y, scale = 1, primary, trim }) => <g transform={`translate(${x} ${y}) scale(${scale})`}>
  <path d="M0-25l23 7v19q0 18-23 28Q-23 19-23 1v-19Z" fill={primary} stroke={edge} strokeWidth="3" />
  <path d="M-14 0h28M0-16v30" stroke={trim} strokeWidth="5" opacity=".9" />
</g>;

const ClubRoom: React.FC<Colors> = ({ primary, trim }) => <>
  <rect width="640" height="340" fill="#d7e2d2" />
  <path d="M0 27H640M0 240H640" stroke="#92aa9a" strokeWidth="7" />
  <Window x={72} y={61} />
  <g transform="translate(224 42)">
    <rect width="195" height="121" rx="7" fill="#f2e9d0" stroke={edge} strokeWidth="4" />
    <rect x="9" y="9" width="177" height="103" rx="3" fill="#759889" />
    <path d="M31 81l37-33 33 15 40-34" fill="none" stroke="#e9e9cf" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <g fill="#f2d483"><circle cx="31" cy="81" r="5"/><circle cx="68" cy="48" r="5"/><circle cx="101" cy="63" r="5"/><circle cx="141" cy="29" r="5"/></g>
  </g>
  <rect x="466" y="70" width="112" height="109" rx="4" fill="#d0b892" stroke={edge} strokeWidth="4" />
  <path d="M466 123h112M501 70v109M540 70v109" stroke="#8b8068" strokeWidth="3" />
  <g fill="#f3e4c6"><rect x="476" y="83" width="9" height="30" rx="2"/><rect x="487" y="79" width="8" height="34" rx="2"/><rect x="511" y="132" width="15" height="29" rx="2"/></g>
  <Shield x={552} y={98} scale={.42} primary={primary} trim={trim} />
  <Floor /><Plant x={560} y={234} />
</>;

const PlayerLounge: React.FC<Colors> = ({ primary, trim }) => <>
  <rect width="640" height="340" fill="#c5dbcf" />
  <path d="M0 34H640M0 239H640" stroke="#93b0a1" strokeWidth="7" />
  <rect x="62" y="52" width="137" height="176" rx="7" fill="#e5ddc5" stroke={edge} strokeWidth="4" />
  <path d="M109 52v176M154 52v176M62 177h137" stroke="#a4b49f" strokeWidth="3" />
  <circle cx="98" cy="119" r="3" fill={edge}/><circle cx="145" cy="119" r="3" fill={edge}/><circle cx="189" cy="119" r="3" fill={edge}/>
  <rect x="245" y="45" width="175" height="131" rx="7" fill="#f3e9d0" stroke={edge} strokeWidth="4" />
  <rect x="253" y="53" width="159" height="115" fill="#a7cdca" />
  <path d="M253 131q39-35 79-7t80-10v54H253Z" fill="#84aa95" />
  <path d="M253 149h159M332 53v115" stroke="#edf0df" strokeWidth="4" />
  <g transform="translate(487 55)"><rect width="73" height="113" rx="5" fill="#eee5cc" stroke={edge} strokeWidth="4" /><ShirtIcon x={36} y={56} scale={.72} primary={primary} trim={trim} /></g>
  <Floor color="#b8c4ac" /><path d="M67 244h110v10H67zM77 254v17m90-17v17" stroke={edge} strokeWidth="5" fill="#be9b72" /><Plant x={548} y={233} />
</>;

const SaleOffice: React.FC<Colors> = ({ primary, trim }) => <>
  <rect width="640" height="340" fill="#c6d8d0" />
  <rect x="0" y="22" width="640" height="14" fill="#789b8e" />
  <g transform="translate(72 74)"><rect width="111" height="143" rx="5" fill="#d9c8aa" stroke={edge} strokeWidth="4" /><path d="M0 49h111M0 97h111" stroke={edge} strokeWidth="3"/><g fill="#f1e4c7"><rect x="12" y="12" width="24" height="29" rx="2"/><rect x="42" y="13" width="21" height="28" rx="2"/><rect x="18" y="61" width="35" height="28" rx="2"/><rect x="63" y="109" width="29" height="29" rx="2"/></g></g>
  <g transform="translate(227 43)"><rect width="195" height="131" rx="7" fill="#f2ead4" stroke={edge} strokeWidth="4" />
    <path d="M38 45h105l-16-14m16 14-16 14M155 91H50l16-14M50 91l16 14" fill="none" stroke="#739c8d" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="39" cy="45" r="14" fill={primary} stroke={edge} strokeWidth="2" /><circle cx="155" cy="91" r="14" fill={trim} stroke={edge} strokeWidth="2" />
  </g>
  <rect x="469" y="62" width="91" height="168" rx="4" fill="#e5ddc5" stroke={edge} strokeWidth="4" /><rect x="480" y="75" width="69" height="69" fill="#abc9bd" /><circle cx="540" cy="180" r="4" fill={edge} />
  <Floor color="#a9c0b4" /><Plant x={570} y={235} />
</>;

const RenewalRoom: React.FC<Colors> = ({ primary, trim }) => <>
  <rect width="640" height="340" fill="#d7dfc9" />
  <path d="M0 28H640M0 236H640" stroke="#a9bea2" strokeWidth="6" />
  <g transform="translate(252 38)"><rect width="137" height="151" rx="8" fill="#f1e7cb" stroke={edge} strokeWidth="4" /><rect x="9" y="9" width="119" height="133" rx="3" fill="#a8c4ae" /><ShirtIcon x={68} y={74} scale={1.05} primary={primary} trim={trim} /></g>
  <g transform="translate(68 73)"><rect width="128" height="17" rx="3" fill="#b19470" stroke={edge} strokeWidth="2" /><rect x="11" y="-21" width="37" height="21" rx="3" fill="#f4e8cd" stroke={edge} strokeWidth="2" /><path d="M62 0v-30h42V0" fill="#f3e8cf" stroke={edge} strokeWidth="2"/><path d="M68-22h30M68-14h30" stroke="#a4b99d" strokeWidth="3" /></g>
  <Window x={452} y={57} />
  <path d="M79 188q42-16 91 0v25q-49-15-91 0Z" fill={primary} stroke={edge} strokeWidth="2" /><path d="M86 201q39-10 78 0" fill="none" stroke={trim} strokeWidth="6" />
  <Floor color="#b2c3a9" /><Plant x={563} y={232} />
</>;

const SigningRoom: React.FC<Colors & { kind: 'sign-transfer' | 'sign-sale' | 'sign-renewal' }> = ({ kind, primary, trim }) => {
  const wall = kind === 'sign-sale' ? '#d6ddd0' : kind === 'sign-renewal' ? '#d7e4ce' : '#e9ddc2';
  return <>
    <rect width="640" height="340" fill={wall} />
    <path d="M0 30H640M0 238H640" stroke="#b3c3ac" strokeWidth="7" />
    <g transform="translate(255 38)"><rect width="130" height="157" rx="7" fill="#f9efd8" stroke={edge} strokeWidth="4" />
      <path d="M26 42h78M26 62h78M26 82h62" stroke="#b3bea6" strokeWidth="5" strokeLinecap="round" />
      <path d="M34 125q18-16 28-3t24-4" fill="none" stroke="#9c7655" strokeWidth="4" strokeLinecap="round" />
      <circle cx="99" cy="125" r="16" fill={primary} stroke={edge} strokeWidth="2" /><path d="M91 125l6 6 11-13" fill="none" stroke={trim} strokeWidth="3" strokeLinecap="round" />
    </g>
    {kind === 'sign-transfer' && <><rect x="83" y="75" width="112" height="128" rx="5" fill="#f3e8ce" stroke={edge} strokeWidth="4" /><ShirtIcon x={139} y={135} scale={.85} primary={primary} trim={trim} /></>}
    {kind === 'sign-sale' && <g transform="translate(80 75)"><rect width="118" height="128" rx="5" fill="#f2e9d2" stroke={edge} strokeWidth="4" /><path d="M21 64h68l-20-19m20 19L69 83" fill="none" stroke="#8aa998" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="29" cy="64" r="12" fill={primary} stroke={edge} strokeWidth="2" /></g>}
    {kind === 'sign-renewal' && <g transform="translate(82 75)"><rect width="116" height="128" rx="5" fill="#f2e9d2" stroke={edge} strokeWidth="4" /><Shield x={58} y={63} scale={1.1} primary={primary} trim={trim} /><path d="M19 107q40-15 79 0" fill="none" stroke="#b49569" strokeWidth="5" strokeLinecap="round" /></g>}
    <Window x={453} y={61} /><Floor color="#bdc5ac" /><Plant x={559} y={232} />
  </>;
};

const PressRoom: React.FC<Colors> = ({ primary, trim }) => <>
  <rect width="640" height="340" fill="#b8d1c1" />
  <rect x="82" y="37" width="476" height="190" rx="8" fill="#f1e8d0" stroke={edge} strokeWidth="4" />
  {[0, 1, 2].map((row) => [0, 1, 2, 3, 4, 5, 6].map((col) => <g key={`${row}-${col}`}>
    <rect x={91 + col * 64} y={46 + row * 57} width="64" height="57" fill={(row + col) % 2 ? primary : '#e9e4cb'} opacity={(row + col) % 2 ? '.8' : '1'} />
    <path d={`M${123 + col * 64} ${61 + row * 57}l10 5v8q0 9-10 13-10-4-10-13v-8Z`} fill={(row + col) % 2 ? trim : '#8db09d'} stroke={edge} strokeWidth="1.5" />
  </g>))}
  <g fill="#e8d19b" stroke={edge} strokeWidth="2"><path d="M145 20h55l-5 13h-45Z"/><path d="M440 20h55l-5 13h-45Z"/></g>
  <path d="M156 33l-30 78 70-2-9-76M455 33l-10 76 70 2-30-78" fill="#fff2bc" opacity=".24" />
  <Floor color="#91ad9f" />
</>;

const Stadium: React.FC<Colors & { star: boolean }> = ({ primary, trim, star }) => <>
  <rect width="640" height="340" fill={star ? '#799c99' : '#a5c9c9'} />
  {!star && <circle cx="520" cy="45" r="22" fill="#f1e4b5" opacity=".9" />}
  {star && <><circle cx="520" cy="43" r="18" fill="#e9e6cf" opacity=".8" /><g fill="#f2dfa5"><circle cx="81" cy="37" r="2"/><circle cx="178" cy="51" r="2"/><circle cx="396" cy="31" r="2"/></g></>}
  <path d="M20 135Q320 34 620 135v126H20Z" fill={star ? '#536f69' : '#799c8d'} stroke={edge} strokeWidth="4" />
  <path d="M14 137Q320 27 626 137l-9 15Q320 68 23 152Z" fill={primary} stroke={edge} strokeWidth="4" />
  {star && <g>
    {/* A second, larger stand and a gold rim make the star presentation distinct. */}
    <path d="M14 126Q320 7 626 126l-7 16Q320 53 21 142Z" fill="#8aa99a" stroke={edge} strokeWidth="3" />
    <path d="M18 126Q320 9 622 126" fill="none" stroke="#efd383" strokeWidth="6" />
    {Array.from({ length: 17 }, (_, i) => <circle key={i} cx={65 + i * 32} cy={67 + Math.abs(8 - i) * 6.6} r="3" fill={i % 2 ? trim : '#f1e4b9'} />)}
  </g>}
  <path d="M32 158q288-78 576 0v62H32Z" fill={star ? '#6a8d7d' : '#9bb8a3'} />
  {[0, 1, 2].map((row) => <g key={row} fill={row % 2 ? trim : '#e8e0c5'} opacity=".85">{Array.from({ length: 19 }, (_, i) => <circle key={i} cx={50 + i * 30} cy={165 + row * 16 + Math.abs(9 - i) * 1.2} r="3.2" />)}</g>)}
  <path d="M32 218Q320 244 608 218v45H32Z" fill={primary} stroke={edge} strokeWidth="3" />
  <path d="M32 236q288 26 576 0" fill="none" stroke={trim} strokeWidth="7" />
  <path d="M0 263q320-37 640 0v77H0Z" fill="#7eac83" /><path d="M0 305q320-25 640 0" fill="none" stroke="#dce9cf" strokeWidth="3" opacity=".8" />
  <g stroke={edge} strokeWidth="4" fill="#ebebd1"><path d="M100 128V43M540 128V43"/><rect x="80" y="34" width="40" height="12" rx="2"/><rect x="520" y="34" width="40" height="12" rx="2"/></g>
  {star && <><path d="M75 46l-34 112 90-1-29-111M525 46l-29 111 90 1-34-112" fill="#fff1b2" opacity=".22" /><path d="M302 41l6 14h15l-12 9 4 15-13-9-13 9 4-15-12-9h15Z" fill="#efd383" stroke={edge} strokeWidth="2" /></>}
</>;

const InterviewTunnel: React.FC<Colors> = ({ primary, trim }) => <>
  <rect width="640" height="340" fill="#b9cec2" />
  <path d="M0 0h640l-77 70H77Z" fill="#91afa0" /><path d="M0 0v269l205-50V75L77 70ZM640 0v269l-205-50V75l128-5Z" fill="#dbe2cf" stroke={edge} strokeWidth="3" />
  <path d="M205 219V82q0-25 25-25h180q25 0 25 25v137Z" fill="#5c8272" stroke={edge} strokeWidth="4" />
  <path d="M223 217V89q0-15 15-15h164q15 0 15 15v128Z" fill="#a7c8bd" />
  <path d="M223 153q98-30 194 0v64H223Z" fill="#7fa787" /><path d="M223 180h194M320 150v67" stroke="#e9edd9" strokeWidth="3" />
  <g transform="translate(48 95)"><rect width="115" height="112" rx="4" fill="#efe8d1" stroke={edge} strokeWidth="3" />{[0, 1, 2].map((row) => [0, 1, 2].map((col) => <rect key={`${row}-${col}`} x={7 + col * 34} y={7 + row * 32} width="34" height="32" fill={(row + col) % 2 ? primary : '#d9dfca'} />))}</g>
  <path d="M472 107h112v83H472Z" fill="#8fae9d" stroke={edge} strokeWidth="3" /><path d="M487 126h82M487 143h82M487 160h82" stroke="#dce4d0" strokeWidth="4" />
  <path d="M0 269l205-50h230l205 50v71H0Z" fill="#9aac9d" /><path d="M205 219L84 340M435 219l121 121" fill="none" stroke="#cbd6c1" strokeWidth="3" />
  <path d="M284 28h72l-5 13h-62Z" fill="#ece9d1" stroke={edge} strokeWidth="2" /><path d="M320 41v14" stroke={edge} strokeWidth="3" />
  <path d="M487 190h83" stroke={trim} strokeWidth="6" />
</>;

export const SceneBackdrop: React.FC<{ atmosphere: SceneAtmosphere; primary: string; trim: string }> = ({ atmosphere, primary, trim }) => {
  const colors = { primary, trim };
  let art: React.ReactNode;
  switch (atmosphere) {
    case 'club': art = <ClubRoom {...colors} />; break;
    case 'player': art = <PlayerLounge {...colors} />; break;
    case 'sale': art = <SaleOffice {...colors} />; break;
    case 'renewal': art = <RenewalRoom {...colors} />; break;
    case 'sign-transfer': case 'sign-sale': case 'sign-renewal': art = <SigningRoom {...colors} kind={atmosphere} />; break;
    case 'press': art = <PressRoom {...colors} />; break;
    case 'stadium': case 'star': art = <Stadium {...colors} star={atmosphere === 'star'} />; break;
    case 'interview': art = <InterviewTunnel {...colors} />; break;
  }
  return <svg className="scene-backdrop" data-testid="scene-backdrop" data-atmosphere={atmosphere}
    viewBox="0 0 640 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">{art}</svg>;
};
