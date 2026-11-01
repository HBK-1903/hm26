// HM26 — Maç sonu röportajı; gerçek sonuç ve mevcut klasik sözler kullanılır.
// Seçilen cevap yalnızca kullanıcının devam düğmesiyle maç raporuna aktarılır.
import React, { useEffect, useRef, useState } from 'react';
import { DemoFixture } from '../types';
import { useGame, DemoMatchResult } from '../store/game';
import { clubById } from '../data/clubs';
import { buildPostMatchInterviewWithContext, outcomeOfResult, INTERVIEW_DECLINE_ID, type InterviewOption } from '../data/interview';
import { detectInterviewContext } from '../engine/interviewContext';
import { compactMatchEvents } from '../engine/matchEvents';
import { normalizeMyMatches } from '../engine/teamInsights';
import { Btn } from '../components/ui/kit';
import { CinematicLayout, CinematicActionGuard, resetCinematicScroll, type CameraCue } from '../components/cinematic/Cinematic';
import { InterviewTheatre } from '../components/cinematic/InterviewTheatre';
import { useLocalTurkishSpeech } from '../components/cinematic/useLocalTurkishSpeech';
import { transferVoiceVolume } from '../components/transfer/useTransferSpeech';

export const PostMatchInterview: React.FC<{
  result: DemoMatchResult;
  fixture: DemoFixture;
  onChoose: (option: InterviewOption | null) => void;
}> = ({ result, onChoose }) => {
  const g = useGame();
  const speech = useLocalTurkishSpeech();
  const [selection, setSelection] = useState<{ result: DemoMatchResult; option: InterviewOption } | null>(null);
  const selected = selection?.result === result ? selection.option : null;
  const rootRef = useRef<HTMLDivElement>(null);
  const home = clubById(result.homeId);
  const away = clubById(result.awayId);
  const mine = result.homeId === g.myClub.id ? 'home' : 'away';
  const opponent = mine === 'home' ? away : home;
  const outcome = outcomeOfResult(g.myClub.id, result.homeId, result.awayId, result.hg, result.ag);
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
  const line = selected?.quote ?? interview.question;
  const lineSpeaker = selected ? 'manager' : 'reporter';
  const cameraCue: CameraCue = selected
    ? { key: `answer:${selected.id}`, target: 'manager' }
    : { key: `question:${interview.question}`, target: 'opponent' };
  const systemMuted = transferVoiceVolume() <= 0;

  useEffect(() => {
    resetCinematicScroll(rootRef.current);
    if (selected) rootRef.current?.querySelector<HTMLButtonElement>('[data-testid="interview-continue"]')?.focus();
  }, [selected]);

  const scene = <InterviewTheatre home={home} away={away} homeGoals={result.hg} awayGoals={result.ag}
    manager={g.career.manager} speaking={speech.speaking} cameraCue={cameraCue} />;
  const subtitle = <div className="interview-subtitle" data-testid="interview-subtitle">
    <div className="interview-subtitle__top"><b>{selected ? 'MENAJER' : 'MUHABİR'}</b>
      <button type="button" onClick={() => speech.speaking ? speech.stop() : speech.play(line, lineSpeaker)}
        disabled={!speech.available || systemMuted} aria-label={speech.speaking ? 'Konuşmayı durdur' : 'Bu repliği dinle'}>
        {speech.speaking ? 'Durdur' : '🔊 Dinle'}
      </button>
    </div>
    <p aria-live="polite">“{line}”</p>
    {systemMuted ? <small>Ana ses veya efektler kapalı; altyazı açık.</small>
      : !speech.available && <small>Türkçe cihaz sesi yok; altyazı açık.</small>}
  </div>;

  return <CinematicLayout ref={rootRef} testId="post-match-interview" stage={selected ? 'answer' : 'question'} scene={scene} subtitle={subtitle}>
    <div>
      <div className="text-[10px] text-amber uppercase tracking-[0.16em] font-black">Flash Röportaj · {resTxt}</div>
      <h1 className="text-primary font-black text-[17px] mt-2">{interview.headline}</h1>
    </div>
    {!selected ? <>
      <p className="text-secondary text-[12px] leading-relaxed">Nasıl cevap vermek istersin? Seçtiğin söz önce sahnede görünür.</p>
      <div className="space-y-2.5" role="group" aria-label="Röportaj cevapları">
        {interview.options.map((opt, i) => <button key={opt.id} type="button" data-testid={`interview-option-${i}`}
          className="interview-choice" onClick={() => { setSelection({ result, option: opt }); speech.play(opt.quote, 'manager'); }}>
          <strong>{opt.label}</strong><span>{opt.detail}</span>
        </button>)}
      </div>
      <button type="button" data-testid={INTERVIEW_DECLINE_ID} onClick={() => { speech.stop(); onChoose(null); }}
        className="w-full min-h-[44px] text-muted text-[12px] font-bold underline">Röportaj vermeden geç →</button>
    </> : <>
      <div className="interview-answer" data-testid="interview-answer">
        <span>SEÇTİĞİN CEVAP</span><h3>{selected.label}</h3><p>{selected.detail}</p>
      </div>
      <CinematicActionGuard><Btn variant="amber" testId="interview-continue" className="w-full" onClick={() => { speech.stop(); onChoose(selected); }}>Maç Sonu Analizine Geç →</Btn></CinematicActionGuard>
      <Btn variant="secondary" testId="interview-change" className="w-full" onClick={() => { speech.stop(); setSelection(null); }}>Cevabı Değiştir</Btn>
    </>}
  </CinematicLayout>;
};
