import React, { useEffect, useId, useRef, useState } from 'react';
import type { Club, Player } from '../../types';
import { useReducedMotion } from '../useReducedMotion';
import { ARRIVAL_DURATION, ARRIVAL_PASSENGERS, arrivalFrame, type ArrivalPassengerFrame } from './arrivalTimeline';
import './arrivalScene.css';

const Fan: React.FC<{ x: number; y: number; index: number; color: string; trim: string; time: number }> = ({ x, y, index, color, trim, time }) => {
  const wave = Math.sin(time / 410 + index * .8) * (index % 2 ? 5 : 7);
  return <g transform={`translate(${x} ${y})`}>
    <g className="arrival-fan" data-testid="arrival-fan" data-wave={wave.toFixed(2)} transform={`rotate(${wave} 0 16)`}>
      <circle cy="-12" r="7" fill={['#e3b58c', '#bd8469', '#edc9a3'][index % 3]} />
      <path d="M-9-4Q0-8 9-4L12 15H-12Z" fill={color} stroke="#385248" strokeWidth="1" />
      <path d="M-8 0l-9-11M8 0l9-11" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <path d="M-17-13Q0-10 17-13" fill="none" stroke={trim} strokeWidth="5" strokeLinecap="round" />
      <path d="M-13-13v4m6-3v4m6-4v4m6-4v4m6-4v4" stroke="#fff4da" strokeWidth="1" opacity=".65" />
    </g>
  </g>;
};

const Passenger: React.FC<{ frame: ArrivalPassengerFrame; club: Club; player: Player }> = ({ frame, club, player }) => {
  const { index, progress, opacity, x, y, scale, stride, bounce } = frame;
  return <g data-testid="arrival-passenger" data-player-id={player.id} data-progress={progress.toFixed(3)} opacity={opacity.toFixed(3)} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`}>
    <title>{player.name}</title>
    <ellipse rx="11" ry="3" fill="#203b35" opacity=".24" />
    <g transform={`translate(0 ${-bounce.toFixed(2)})`}>
      <g transform={`rotate(${stride.toFixed(2)} -4 -7)`}><path d="M-4-8l-3 8" stroke="#263e43" strokeWidth="5" strokeLinecap="round" /><path d="M-9 1h5" stroke="#172d2c" strokeWidth="3" strokeLinecap="round" /></g>
      <g transform={`rotate(${(-stride).toFixed(2)} 4 -7)`}><path d="M4-8l3 8" stroke="#263e43" strokeWidth="5" strokeLinecap="round" /><path d="M5 1h5" stroke="#172d2c" strokeWidth="3" strokeLinecap="round" /></g>
      <path d="M-9-24Q0-28 9-24l2 17h-22Z" fill={club.color1} stroke="#263e3a" strokeWidth="1" />
      <path d="M-8-19H8" stroke={club.color2} strokeWidth="3" /><circle cx="4" cy="-22" r="1.4" fill={club.color2} />
      <g transform={`rotate(${(-stride * .65).toFixed(2)} -9 -22)`}><path d="M-9-22l-4 10" stroke={club.color1} strokeWidth="4" strokeLinecap="round" /><circle cx="-13" cy="-12" r="2" fill={index % 3 === 1 ? '#b97858' : '#d9a57e'} /></g>
      <g transform={`rotate(${(stride * .65).toFixed(2)} 9 -22)`}><path d="M9-22l4 10" stroke={club.color1} strokeWidth="4" strokeLinecap="round" /><circle cx="13" cy="-12" r="2" fill={index % 3 === 1 ? '#b97858' : '#d9a57e'} /></g>
      <circle cy="-33" r="7" fill={index % 3 === 1 ? '#b97858' : '#d9a57e'} /><path d="M-7-35q7-7 14 0v2q-7-4-14 0Z" fill={index % 2 ? '#2f302b' : '#5c4535'} />
    </g>
  </g>;
};

export const ArrivalScene: React.FC<{ home: Club; away: Club; team: Club; day: number; players: Player[]; reducedMotion: boolean }> = ({ home, away, team, day, players, reducedMotion }) => {
  const reduce = useReducedMotion(reducedMotion);
  const initial = reduce ? ARRIVAL_DURATION : 0;
  const elapsedRef = useRef(initial);
  const [elapsed, setElapsed] = useState(initial);
  const [playing, setPlaying] = useState(!reduce);
  const [playbackId, setPlaybackId] = useState(0);
  const id = useId().replace(/:/g, '');
  const gradientId = `arrival-sky-${id}`;
  const gateClipId = `arrival-gate-${id}`;
  const setTime = (value: number) => { elapsedRef.current = value; setElapsed(value); };
  useEffect(() => {
    if (reduce) { elapsedRef.current = ARRIVAL_DURATION; setElapsed(ARRIVAL_DURATION); setPlaying(false); }
  }, [reduce]);
  useEffect(() => {
    if (!playing || reduce || typeof window.requestAnimationFrame !== 'function') return;
    const start = window.performance.now() - elapsedRef.current;
    let frame = 0;
    let lastRender = 0;
    const tick = (now: number) => {
      const next = Math.min(ARRIVAL_DURATION, Math.max(0, now - start));
      // One shared clock, capped at ~30 renders/sec for narrower/older devices.
      if (next === ARRIVAL_DURATION || now - lastRender >= 1000 / 30) {
        elapsedRef.current = next;
        setElapsed(next);
        lastRender = now;
      }
      if (next < ARRIVAL_DURATION) frame = window.requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, reduce, playbackId]);
  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => document.removeEventListener('visibilitychange', stopWhenHidden);
  }, []);

  const shown = players.slice(0, ARRIVAL_PASSENGERS);
  const frame = arrivalFrame(elapsed, shown.length);
  const { time, t, journey, busX, busBounce, wheelAngle, barrier, door, gate, zoom, cameraX, cameraY, viewWidth, viewHeight, passengers, chapter, phase, detail } = frame;
  const flagWave = Math.sin(time / 650) * 3;
  const cloudDrift = Math.sin(time / 7500) * 12;
  const flash = Math.pow(Math.max(0, Math.sin(time / 980)), 12) * .65;
  const celebration = Math.max(0, Math.min(1, (t - .12) / .05, (.7 - t) / .08));
  const securityWave = Math.sin(time / 400) * barrier * 2;
  const braking = t >= .25 && t < .42;
  const indicator = t >= .20 && t < .43 && Math.sin(time / 450) > 0;
  const chapters = ['YOLDA', 'KAPI', shown.length ? 'İNİŞ' : 'BEKLE', 'GİRİŞ'];

  return <section className="arrival" data-testid="arrival-scene" data-motion={reduce ? 'reduced' : playing ? 'playing' : 'paused'} data-phase={phase} aria-label="Maç günü geliş sahnesi">
    <div className={`arrival__stage${!playing ? ' is-paused' : ''}${reduce ? ' is-reduced' : ''}`} style={{ '--arrival-primary': team.color1, '--arrival-trim': team.color2 } as React.CSSProperties}>
      <div className="arrival__heading"><div><span>MAÇ GÜNÜ · GÜN {day}</span><strong>{home.stadium}</strong></div><b>{team.short}</b></div>
      <svg viewBox={`${cameraX.toFixed(2)} ${cameraY.toFixed(2)} ${viewWidth.toFixed(2)} ${viewHeight.toFixed(2)}`} data-testid="arrival-camera" data-zoom={zoom.toFixed(3)} role="img" aria-label={`${team.name} takım otobüsü ${home.stadium} önünde`}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a5c9c9" /><stop offset="1" stopColor="#e6e4c9" /></linearGradient><clipPath id={gateClipId}><path d="M497 247v-52q0-15 15-15h34q15 0 15 15v52Z" /></clipPath></defs>
        <rect width="640" height="340" fill={`url(#${gradientId})`} />
        <circle cx="510" cy="47" r="25" fill="#f4e5b6" opacity=".65" />
        <g transform={`translate(${cloudDrift.toFixed(2)} 0)`} fill="#f5f3df" opacity=".7"><ellipse cx="82" cy="48" rx="36" ry="9"/><ellipse cx="103" cy="40" rx="20" ry="11"/><ellipse cx="269" cy="62" rx="29" ry="7"/><ellipse cx="286" cy="56" rx="16" ry="9"/></g>
        <path d="M0 153L67 122l65 24 72-37 83 35 76-34 70 31 68-28 139 43v74H0Z" fill="#8eafa5" />
        <g fill="#71988e" opacity=".8"><rect x="0" y="108" width="35" height="105"/><rect x="42" y="118" width="32" height="95"/><rect x="82" y="98" width="27" height="115"/><rect x="119" y="124" width="31" height="89"/><rect x="158" y="112" width="32" height="101"/></g>
        <g fill="#dce2cb" opacity=".38">{[10, 48, 88, 125, 164].map((x, i) => <g key={x}>{[0, 1, 2].map((row) => <rect key={row} x={x} y={134 + row * 16 - (i % 2) * 8} width="5" height="6" rx="1" />)}</g>)}</g>
        <g stroke="#607e72" strokeWidth="4"><path d="M297 129V54m292 75V54"/><path d="M284 56h26m266 0h26"/></g>
        <g fill="#e9ecd5" stroke="#648276" strokeWidth="2"><rect x="283" y="48" width="28" height="10" rx="2"/><rect x="575" y="48" width="28" height="10" rx="2"/></g>

        {/* Stadium belongs to the real home side even on an away day. */}
        <path d="M218 129Q409 61 622 129v118H218Z" fill="#718e84" stroke="#405e55" strokeWidth="3" />
        <path d="M208 131Q410 50 631 131l-8 15Q410 91 216 146Z" fill={home.color1} stroke="#35554c" strokeWidth="3" />
        <path d="M240 148Q410 105 598 148v78H240Z" fill="#dde1ce" />
        <path d="M241 149Q410 110 597 149" fill="none" stroke={home.color2} strokeWidth="7" />
        {[252, 290, 328, 366, 404, 442, 480, 518, 556, 594].map((x) => <path key={x} d={`M${x} 151v75`} stroke="#9bb0a2" strokeWidth="4" />)}
        <path d="M239 191h359M238 224h360" stroke="#b9c9b9" strokeWidth="3" />
        <g fill="#6b8d82" opacity=".75">{[258, 295, 332, 369, 406, 443, 568].map((x) => <rect key={x} x={x} y="162" width="24" height="21" rx="2" />)}</g>
        <g fill={home.color1}><path d="M258 193h25v25h-25zM333 193h25v25h-25zM408 193h25v25h-25z" opacity=".75" /></g>
        <g stroke="#516a5b" strokeWidth="3"><path d="M277 123V79M579 123V79"/></g>
        <path d={`M279 81q15 ${-7 + flagWave} 31 0v17q-16 ${-7 - flagWave} -31 0Z`} fill={home.color1} stroke="#4f6f62" strokeWidth="1" />
        <path d={`M581 81q15 ${-7 - flagWave} 31 0v17q-16 ${-7 + flagWave} -31 0Z`} fill={home.color2} stroke="#4f6f62" strokeWidth="1" />
        <rect x="475" y="154" width="110" height="17" rx="4" fill="#f6ead0" stroke="#668376" strokeWidth="1" />
        <text x="530" y="166" textAnchor="middle" fill="#304a3d" fontSize="9" fontWeight="900" letterSpacing="1">STADYUM GİRİŞİ</text>
        <path d="M488 247v-54q0-21 21-21h40q21 0 21 21v54Z" fill="#304b43" stroke="#28463c" strokeWidth="3" />
        <path d="M497 247v-52q0-15 15-15h34q15 0 15 15v52Z" fill="#1c3730" />
        <g data-testid="arrival-stadium-gate" data-open={gate.toFixed(2)} clipPath={`url(#${gateClipId})`}>
          <rect x={497 - gate * 32} y="179" width="32" height="70" fill="#496c5c" stroke="#739187" strokeWidth="2" />
          <rect x={529 + gate * 32} y="179" width="32" height="70" fill="#496c5c" stroke="#739187" strokeWidth="2" />
          <path d="M498 220h62" stroke="#77968a" strokeWidth="2" opacity={1 - gate} />
        </g>
        <path d="M491 247h77l9 8h-95Z" fill="#ced6bd" /><path d="M497 251h63" stroke="#819c8e" strokeWidth="1.5" />
        <g transform="translate(606 198)"><path d="M0 44V0" stroke="#536e60" strokeWidth="4"/><path d="M-12 0h24l-5-9H-7Z" fill="#e7d7ac" stroke="#627d6b" strokeWidth="2"/><circle cy="-2" r="3" fill="#fff4cb"/></g>

        <path d="M0 243h640v32H0Z" fill="#b6c0ad" /><path d="M0 250h640M0 271h640" stroke="#e4dcc2" strokeWidth="4" />
        <path d="M0 275h640v65H0Z" fill="#82928b" /><path d="M0 320h640" stroke="#e2dcc6" strokeWidth="3" strokeDasharray="38 24" opacity=".8" />
        <g fill="#e4e0c9" opacity=".7"><path d="M381 289h17l-8 18h-18ZM407 289h17l-8 18h-18ZM433 289h17l-8 18h-18ZM459 289h17l-8 18h-18Z" /></g>
        <path d="M0 259h253" stroke="#687e6f" strokeWidth="3" />
        <g>{Array.from({ length: 9 }, (_, index) => <Fan key={index} x={20 + index * 28} y={236 + (index % 2) * 3} index={index} color={team.color1} trim={team.color2} time={time} />)}</g>
        {celebration > 0 && <g data-testid="arrival-confetti">{Array.from({ length: 12 }, (_, index) => {
          const fall = (time / 4200 + index * .173) % 1;
          const x = 17 + index * 19 + Math.sin(time / 600 + index) * 5;
          const y = 120 + fall * 105;
          return <rect key={index} x={x.toFixed(1)} y={y.toFixed(1)} width="3" height="6" rx="1" fill={index % 2 ? team.color1 : team.color2} opacity={(celebration * Math.sin(fall * Math.PI) * .85).toFixed(2)} transform={`rotate(${(fall * 180 + index * 20).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`} />;
        })}</g>}
        <path d="M0 251h260M0 262h260M14 247v19M74 247v19M134 247v19M194 247v19M254 247v19" fill="none" stroke="#d8ddca" strokeWidth="4" />
        <rect x="32" y="251" width="106" height="17" rx="3" fill={team.color1} stroke="#e5e1cb" strokeWidth="2" /><text x="85" y="262.5" fill="#fff9e7" stroke="#263e35" strokeWidth=".6" paintOrder="stroke" textAnchor="middle" fontSize="8" fontWeight="900">HAYDİ {team.short}!</text>

        {/* The barrier opens before the coach reaches it. */}
        <g transform="translate(418 254)"><rect x="-5" y="-13" width="11" height="19" rx="2" fill="#dfc36f" stroke="#4c695c" strokeWidth="2" /><circle cx="0" cy="-11" r="3" fill={barrier > .9 ? '#70c990' : '#e98467'} />
          <g data-testid="arrival-barrier" data-open={barrier.toFixed(2)} transform={`rotate(${(barrier * 72).toFixed(2)} 0 -10)`}><path d="M0-10h-70" stroke="#f5edd8" strokeWidth="7" strokeLinecap="round" /><path d="M-13-10h-11m-12 0h-11m-12 0h-8" stroke="#d56c58" strokeWidth="7" /></g>
        </g>
        <g transform="translate(448 248)"><circle cy="-29" r="7" fill="#d5a17b"/><path d="M-8-22h16l3 20h-22Z" fill="#e6c35f" stroke="#426053" strokeWidth="1"/><path d="M-7-17H7" stroke="#fff2c0" strokeWidth="3"/><path d="M-5-2l-2 8M5-2l2 8" stroke="#2b4140" strokeWidth="4" strokeLinecap="round"/><path d={`M8-19l${(8 + barrier * 2).toFixed(1)} ${(-4 - barrier * 7 + securityWave).toFixed(1)}`} stroke="#e6c35f" strokeWidth="4" strokeLinecap="round"/></g>
        <g transform="translate(467 249)"><circle cy="-29" r="6" fill="#c99070"/><path d="M-8-22h16l2 20h-20Z" fill="#526961"/><path d="M-5-2l-2 8M5-2l2 8" stroke="#304740" strokeWidth="4" strokeLinecap="round"/><path d="M-7-18l-7-6" stroke="#526961" strokeWidth="4" strokeLinecap="round"/><rect x="-19" y="-29" width="9" height="7" rx="1" fill="#253d38"/><circle cx="-15" cy="-25.5" r="2" fill="#a6c8bd"/><circle data-testid="arrival-camera-flash" cx="-21" cy="-27" r="7" fill="#fff8d2" opacity={flash.toFixed(2)} /></g>
        <path d="M586 271l7-18 7 18Z" fill="#d98251" stroke="#f6e1bb" strokeWidth="2" /><path d="M589 263h8" stroke="#f8e7ca" strokeWidth="2" />

        {/* Coach position, wheels, lights and door are all tied to scene time. */}
        <g transform={`translate(${busX.toFixed(2)} ${busBounce.toFixed(2)})`} data-testid="arrival-bus" data-x={busX.toFixed(2)} data-door={door.toFixed(2)} data-journey={journey.toFixed(3)}>
          {journey > .01 && journey < .96 && <g fill="#e2e8d6" opacity={(.32 * (1 - journey)).toFixed(2)}><circle cx="-4" cy="254" r="6"/><circle cx="-14" cy="250" r="4"/><circle cx="-23" cy="254" r="3"/></g>}
          <ellipse cx="127" cy="269" rx="128" ry="9" fill="#263d38" opacity=".25" />
          <path d="M13 185Q20 175 40 175H207Q224 175 232 189l15 35v34H8v-59q0-9 5-14Z" fill={team.color1} stroke="#273f39" strokeWidth="3" />
          <path d="M13 224h232v20H13Z" fill={team.color2} opacity=".9" /><path d="M11 255h234" stroke="#273f39" strokeWidth="6" />
          <path d="M28 182h129v32H21v-23q0-9 7-9Z" fill="#365f67" stroke="#274b4b" strokeWidth="2" />
          <path d="M26 185h125" stroke="#c6e1d4" strokeWidth="2" opacity=".7" />
          {[54, 89, 124].map((x) => <path key={x} d={`M${x} 183v30`} stroke="#95bdb7" strokeWidth="2" />)}
          {[40, 76, 112, 145].map((x, i) => <g key={x} opacity=".6"><circle cx={x} cy={194 + i % 2} r="5" fill="#caa886"/><path d={`M${x - 8} 211q0-13 8-13t8 13`} fill="#274a4d" /></g>)}
          <path d="M192 182h17q11 0 15 12l7 20h-39Z" fill="#365f67" stroke="#274b4b" strokeWidth="2" /><path d="M201 184l13 27M216 189l11 20" stroke="#b5d5cd" strokeWidth="2" opacity=".6" />
          <circle cx="201" cy="199" r="5" fill="#cba987" opacity=".75" /><path d="M194 211q0-10 7-10t8 10" fill="#274a4d" />
          <path d="M230 196h9v12" fill="none" stroke="#304a42" strokeWidth="3" strokeLinecap="round" /><path d="M214 212l13-2" stroke="#203f3b" strokeWidth="2" />
          <rect x="27" y="229" width="121" height="13" rx="4" fill="#213c35" opacity=".84" /><text x="87.5" y="238" fill="#fff6de" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing=".3">{team.short} · TAKIM OTOBÜSÜ</text>
          <circle cx="147" cy="236" r="8" fill="#f3ead3" stroke="#314c41" strokeWidth="1.5" /><text x="147" y="239" fill="#263f35" fontSize="6" fontWeight="900" textAnchor="middle">{team.short}</text>
          <path d="M22 249h41m8 0h39m9 0h36" stroke="#29443c" strokeWidth="1.5" opacity=".65" />
          <rect x="162" y="180" width="25" height="76" rx="2" fill="#263f3d" />
          <rect x={165 - door * 8} y="182" width={9 - door * 7} height="68" rx="1" fill="#a9c7be" /><rect x={175 + door * 8} y="182" width={9 - door * 7} height="68" rx="1" fill="#a9c7be" />
          {door > .3 && <path d="M164 253h21l5 5h-30Z" fill="#dbd3b5" stroke="#405c50" strokeWidth="1" />}
          {[51, 199].map((x) => <g key={x} data-testid="arrival-wheel" data-angle={wheelAngle.toFixed(2)} transform={`translate(${x} 259) rotate(${wheelAngle.toFixed(2)})`}><circle r="16" fill="#273c38" stroke="#d1d5bf" strokeWidth="3" /><circle r="8" fill="#bac6b9" /><path d="M-7 0H7M0-7V7" stroke="#526e63" strokeWidth="2" /><circle r="2" fill="#edf0dc" /></g>)}
          <rect x="239" y="224" width="8" height="8" rx="2" fill="#ffefb3" /><path d="M247 223l24-8v22l-24-5Z" fill="#fff1b9" opacity={journey < 1 ? '.19' : '.08'} />
          <rect x="8" y="226" width="6" height="11" rx="1" fill={braking ? '#ff695b' : '#9d554b'} />
          <circle data-testid="arrival-indicator" cx="241" cy="239" r="3" fill="#ffd16c" opacity={indicator ? 1 : .25} />
        </g>
        {passengers.map((passenger) => <Passenger key={`${shown[passenger.index].id}-${passenger.index}`} frame={passenger} player={shown[passenger.index]} club={team} />)}
      </svg>
      <div className="arrival__stage-footer"><b>TAKIMIN VARIŞI</b><span>{home.short} – {away.short}</span></div>
    </div>
    <div className="arrival__status" aria-live="polite"><strong>{phase}</strong><span>{detail}</span><small>{team.name} · {home.stadium}</small></div>
    <ol className="arrival__chapters" aria-label="Geliş aşamaları">{chapters.map((label, index) => <li key={label} className={index === chapter ? 'is-current' : index < chapter ? 'is-complete' : ''} aria-current={index === chapter ? 'step' : undefined}><span>{index + 1}</span><b>{label}</b></li>)}</ol>
    <label className="arrival__scrub"><span>Sahne zamanı</span><input type="range" min="0" max="1000" value={Math.round(t * 1000)} onChange={(event) => { setPlaying(false); setTime(Number(event.currentTarget.value) / 1000 * ARRIVAL_DURATION); }} aria-label="Geliş sahnesi zamanı" aria-valuetext={`${Math.round(t * 100)}%, ${phase}`} /><small>{Math.round(t * 100)}%</small></label>
    <div className="arrival__controls"><button type="button" disabled={reduce || elapsed >= ARRIVAL_DURATION} onClick={() => setPlaying((value) => !value)}>{playing ? 'Durdur' : 'Devam Et'}</button><button type="button" disabled={reduce} onClick={() => { setTime(0); setPlaybackId((value) => value + 1); setPlaying(true); }}>Yeniden Oynat</button></div>
    {shown.length > 0 ? <p className="arrival__players"><b>SEÇİLİ İLK 11’DEN</b> {shown.map((player) => player.name).join(' · ')}</p> : <p className="arrival__players">İlk 11’den sahnede gösterilecek oyuncu bulunmuyor.</p>}
    <p className="arrival__note">{reduce ? 'Azaltılmış hareket açık; sabit kareyi sürgüyle seçebilirsin. ' : ''}Geliş sahnesi yalnızca görseldir. Maça geçişi sen başlatırsın.</p>
  </section>;
};
