// HM26 Aşama 4 — Sezon Sonu / Kupa / Yükselme Sinematiği (§A4)
// Renkli konfeti, sahne kareleri, sezon özeti, ses: celebrate/heartbreak (WebAudio)
import React, { useEffect, useRef, useState } from 'react';
import { SeasonRecord, Club } from '../types';
import { SeasonAwards } from '../data/awards';
import { Crest } from '../components/assets/Crest';
import { GameIcon } from '../components/icons';
import { Btn } from '../components/ui/kit';
import { audio } from '../audio/engine';
import { clubById, clubByIdSafe } from '../data/clubs';
import { useGame } from '../store/game';
import { useReducedMotion } from '../components/useReducedMotion';
import './seasonFinale.css';

interface ConfettiSpec { x: number; y: number; vy: number; vx: number; rot: number; vr: number; color: string; shape: number }

export const SeasonFinale: React.FC<{
  record: SeasonRecord;           // bu sezonun satırı
  myClub: Club;
  championId: string;
  cupWinnerId: string | null;
  promoted: boolean; relegated: boolean; champion: boolean; cupWon: boolean;
  awards?: SeasonAwards | null;   // Dalga 4: sezon ödül töreni
  onDone: () => void;
}> = ({ record, myClub, championId, cupWinnerId, promoted, relegated, champion, cupWon, awards, onDone }) => {
  const g = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [moreResults, setMoreResults] = useState(false);
  const big = champion || cupWon || promoted;
  const maxPhase = awards ? 4 : 3;
  const reduce = useReducedMotion(g.career.settings.reduceMotion);
  const [phase, setPhase] = useState(() => reduce ? maxPhase : 0); // intro → table → champions → awards → summary

  useEffect(() => {
    audio.unlock();
    audio.play(big ? 'celebrate' : relegated ? 'heartbreak' : 'nudge');
  }, []);
  useEffect(() => {
    if (reduce) { setPhase(maxPhase); return; }
    if (phase >= maxPhase) return;
    const timer = window.setTimeout(() => setPhase((p) => Math.min(maxPhase, p + 1)), big ? 1400 : 1100);
    return () => window.clearTimeout(timer);
  }, [big, maxPhase, phase, reduce]);

  // One scrollable region keeps long awards and the manual exit reachable on small phones.
  useEffect(() => {
    const scroll = scrollRef.current, content = contentRef.current;
    if (!scroll || !content) return;
    const update = () => setMoreResults(scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 2);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(scroll); observer?.observe(content);
    scroll.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => { observer?.disconnect(); scroll.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [phase, awards]);

  // Decorative only: bounded particle count, CSS-pixel sizing and no work in a hidden tab.
  useEffect(() => {
    if (!big || reduce) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const colors = [myClub.color1, myClub.color2, '#f0c976', '#f3f1ea'];
    let w = 0, h = 0, raf = 0, last = 0;
    const size = () => {
      w = c.clientWidth; h = c.clientHeight;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const pieces: ConfettiSpec[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * w, y: -20 + Math.random() * h * 0.4,
      vy: 1.2 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 1.2,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.floor(Math.random() * 3),
    }));
    const step = (now: number) => {
      const delta = last ? Math.min(40, now - last) / (1000 / 60) : 1;
      last = now;
      ctx.clearRect(0, 0, w, h);
      pieces.forEach((p) => {
        p.y += p.vy * delta; p.x += p.vx * delta; p.rot += p.vr * delta;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-3, -2, 6, 4);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(3, 3); ctx.lineTo(-3, 3); ctx.fill(); }
        ctx.restore();
      });
      raf = window.requestAnimationFrame(step);
    };
    const visibility = () => {
      window.cancelAnimationFrame(raf); last = 0;
      if (!document.hidden) raf = window.requestAnimationFrame(step);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(size);
    observer?.observe(c);
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => { window.cancelAnimationFrame(raf); observer?.disconnect(); window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', visibility); };
  }, [big, reduce, myClub.color1, myClub.color2]);

  const champ = clubById(championId);
  const cup = cupWinnerId ? clubById(cupWinnerId) : null;
  const trophy = cupWon
    ? "Miras Kupası"
    : promoted
      ? "Yükselme"
      : relegated
        ? "Düşüş"
        : `Lig ${record.rank}.`;

  const finaleText = champion
    ? "Şampiyonluk başarısı kariyer CV'ne yazıldı. Detaylar kulüp arşivinde."
    : cupWon
      ? "Kupa zaferi — kupa odası yeni satırla güncellendi."
      : promoted
        ? "Yükselme! Yeni ligde yeni hedefler — yönetim brifingi geldi."
        : relegated
          ? "Düşüş zordur. Yeniden yapılanma zamanı — yönetimden brifing geldi."
          : "Sezon kapanışı tamamlandı. Kamp ve transfer dönemi açıldı.";

  return (
    <div className={`season-finale h-full relative flex flex-col safe-t safe-b bg-base${reduce ? ' is-reduced' : ''}`} data-testid="season-finale" data-motion={reduce ? 'reduced' : 'full'} data-phase={phase}>
      {big && !reduce && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />}
      <div ref={scrollRef} className="season-finale__scroll flex-1 min-h-0 overflow-y-auto relative z-10" role="region" aria-label="Sezon sonuçları" tabIndex={0}>
        <div ref={contentRef} className="season-finale__content min-h-full flex flex-col justify-center px-5 py-4 text-center">
        <div className={`season-finale__emblem${big ? ' is-celebration' : ''}`} aria-hidden="true">
          <span className="season-finale__emblem-ring" /><span className="season-finale__emblem-crest"><Crest club={myClub} size={46} /></span>
          {big && <span className="season-finale__emblem-mark">{champion || cupWon ? '★' : '↑'}</span>}
        </div>
        <div className="m26-in">
          <div className="text-[12px] uppercase tracking-[0.08em] tracking-widest text-muted">SEZON KAPANDI</div>
          <div className="font-display text-primary text-2xl mt-1">{record.season}</div>
        </div>

        {phase >= 1 && (
          <div className="mt-5 flex items-center justify-center gap-3 m26-in">
            <Crest club={myClub} size={54} />
            <div className="text-left">
              <div className="num font-display text-primary text-xl leading-none">#{record.rank}</div>
              <div className="text-muted text-[11px] mt-0.5">{record.pts} puan · kupa: {record.cup}</div>
            </div>
          </div>
        )}

        {phase >= 2 && (
          <div className="mt-5 rounded-2xl border border-line bg-surface px-4 py-4 m26-in">
            <div className="text-[10px] uppercase tracking-widest text-muted">ŞAMPİYON</div>
            <div className="mt-1.5 flex items-center gap-2">
              <Crest club={champ} size={30} />
              <div className="text-primary font-bold text-[14px]">{champ.name}</div>
            </div>
            {cup && (
              <>
                <div className="text-[10px] uppercase tracking-widest text-muted mt-3">MİRAS KUPASI</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Crest club={cup} size={30} />
                  <div className="text-primary font-bold text-[14px]">{cup.name}</div>
                </div>
              </>
            )}
          </div>
        )}

        {phase >= 3 && awards && (
          <div className="mt-5 m26-in rounded-2xl border border-line bg-surface px-4 py-3 text-left">
            <div className="flex items-center justify-center gap-2 m26-overline"><GameIcon id="comps" className="w-4 h-4 text-amber" />Sezon Ödülleri</div>
            {([
              { icon: 'ball', title: 'Gol Kralı', list: awards.scorer, accent: 'text-amber' },
              { icon: 'chart', title: 'Asist Kralı', list: awards.assist, accent: 'text-info' },
              { icon: 'star', title: 'Yılın Oyuncusu', list: awards.mvp, accent: 'text-ok' },
              { icon: 'sprout', title: 'Yılın Genci', list: awards.young, accent: 'text-special' },
            ] as const).map(({ icon, title, list, accent }) => (
              list.length > 0 && (
                <div key={title} className="mt-3">
                  <div className={`flex items-center gap-2 text-[12px] font-bold ${accent}`}><GameIcon id={icon} className="w-4 h-4" />{title}</div>
                  {list.map((r, i) => {
                    const p = g.playerOf(r.playerId);
                    const cl = clubByIdSafe(r.clubId);
                    if (!cl) return null;
                    const mine = r.clubId === myClub.id;
                    return (
                      <div key={r.playerId} className={`flex items-center gap-2 mt-1.5 rounded-lg px-2 py-1.5 ${i === 0 ? 'bg-elevated border border-line' : 'opacity-80'} ${mine ? 'ring-1 ring-amber' : ''}`}>
                        <span className={`num text-[12px] font-bold w-4 ${i === 0 ? 'text-amber' : 'text-muted'}`}>{i + 1}</span>
                        <Crest club={cl} size={16} />
                        <span className="text-primary text-[12.5px] font-semibold truncate flex-1">{p?.name ?? 'Oyuncu'}{mine ? ' ★' : ''}</span>
                        <span className="num text-secondary text-[11px]">{r.display}</span>
                      </div>
                    );
                  })}
                </div>
              )
            ))}
          </div>
        )}

        {phase >= (awards ? 4 : 3) && (
          <div className="mt-5 m26-in">
            <div className={`inline-block rounded-xl px-5 py-3 border text-[15px] font-bold ${
              champion || cupWon
                ? 'bg-amber/15 border-amber text-amber'
                : promoted
                  ? 'bg-ok/15 border-ok text-ok'
                  : relegated
                    ? 'bg-danger/15 border-danger text-danger'
                    : 'bg-surface border-line text-primary'
            }`}>
              {trophy}
            </div>
            <p className="text-secondary text-[12.5px] mt-3 leading-snug">{finaleText}</p>
          </div>
        )}
        </div>
      </div>

      <div className="shrink-0 px-5 pb-5">
        {moreResults && <div className="season-finale__scroll-hint" aria-hidden="true">↓ Tüm sonuçlar için kaydır</div>}
        <Btn variant="amber" className="w-full !min-h-[48px]" onClick={onDone}>Kariyere Dön</Btn>
      </div>
    </div>
  );
};
