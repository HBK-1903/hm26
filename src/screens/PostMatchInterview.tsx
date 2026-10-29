// HM26 — Maç sonu flash röportaj ekranı. Son düdükten sonra kullanıcı düğmeyle açar;
// seçim maç kaydıyla birlikte store'a iletilir (yeni kalıcı alan yok).
import React from 'react';
import { DemoFixture } from '../types';
import { useGame, DemoMatchResult } from '../store/game';
import { Crest } from '../components/assets/Crest';
import { clubById } from '../data/clubs';
import { buildPostMatchInterviewWithContext, outcomeOfResult, INTERVIEW_DECLINE_ID, type InterviewOption } from '../data/interview';
import { detectInterviewContext } from '../engine/interviewContext';
import { compactMatchEvents } from '../engine/matchEvents';
import { normalizeMyMatches } from '../engine/teamInsights';

export const PostMatchInterview: React.FC<{
  result: DemoMatchResult;
  fixture: DemoFixture;
  onChoose: (option: InterviewOption | null) => void;
}> = ({ result, onChoose }) => {
  const g = useGame();
  const home = clubById(result.homeId);
  const away = clubById(result.awayId);
  const mine = result.homeId === g.myClub.id ? 'home' : 'away';
  const opponent = mine === 'home' ? away : home;
  const outcome = outcomeOfResult(g.myClub.id, result.homeId, result.awayId, result.hg, result.ag);
  // Bağlam sezimi: olay akışı, kırmızı kart, xG sapması, derbi ve önceki sonuçlardan tema seçilir
  const priorOutcomes = normalizeMyMatches(g.matchReports ?? [], g.myClub.id, g.seasonNo).map((m) =>
    m.result === 'W' ? 'win' : m.result === 'D' ? 'draw' : 'loss');
  const isDerby = (g.myClub.rivalIds ?? []).includes(opponent.id) || g.myClub.derby === opponent.id;
  const ctx = detectInterviewContext({
    myClubId: g.myClub.id,
    homeId: result.homeId,
    awayId: result.awayId,
    hg: result.hg,
    ag: result.ag,
    xgHome: result.xgHome,
    xgAway: result.xgAway,
    redsHome: result.redH,
    redsAway: result.redA,
    isDerby,
    events: compactMatchEvents(result.events ?? []),
    priorOutcomes,
  });
  const interview = buildPostMatchInterviewWithContext(ctx, opponent.short ?? opponent.name);
  const resTxt = outcome === 'win' ? 'Galibiyet' : outcome === 'draw' ? 'Beraberlik' : 'Mağlubiyet';
  const resColor = outcome === 'win' ? 'var(--c-ok)' : outcome === 'draw' ? 'var(--c-warn)' : 'var(--c-danger)';

  return (
    <div className="h-full min-h-0 flex flex-col safe-t safe-b bg-base" data-testid="post-match-interview">
      <header className="shrink-0 px-4 pt-6 pb-4 text-center border-b border-line/60">
        <div className="text-[10px] text-amber uppercase tracking-[0.18em] font-black">Flash Röportaj</div>
        <div className="mt-3 inline-flex items-center gap-3 bg-surface border border-line rounded-2xl px-5 py-3">
          <Crest club={home} size={34} />
          <div>
            <div className="num text-primary font-display text-2xl leading-none">{result.hg}–{result.ag}</div>
            <div className="text-[10px] font-bold mt-1" style={{ color: resColor }}>{resTxt}</div>
          </div>
          <Crest club={away} size={34} />
        </div>
        <h1 className="text-primary font-black text-[17px] mt-4">{interview.headline}</h1>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4">
        <div className="rounded-xl border border-line bg-surface p-3.5 mb-4 m26-in">
          <div className="flex items-start gap-2">
            <span className="text-amber text-lg leading-none mt-0.5">🎙</span>
            <p className="text-secondary text-[13px] leading-snug flex-1">{interview.question}</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {interview.options.map((opt, i) => (
            <button
              key={opt.id}
              data-testid={`interview-option-${i}`}
              onClick={() => onChoose(opt)}
              className="w-full min-h-[64px] text-left rounded-xl border border-line bg-elevated hover:border-amber/50 active:bg-[#2b3528] transition-colors px-3.5 py-3"
            >
              <div className="text-primary font-bold text-[13.5px]">{opt.label}</div>
              <div className="text-muted text-[11px] mt-1 leading-snug">{opt.detail}</div>
            </button>
          ))}
        </div>
        <button
          data-testid={INTERVIEW_DECLINE_ID}
          onClick={() => onChoose(null)}
          className="w-full min-h-[44px] mt-1 text-muted text-[12px] font-bold hover:text-primary transition-colors"
        >
          Röportaj vermeden geç →
        </button>
      </main>
    </div>
  );
};
