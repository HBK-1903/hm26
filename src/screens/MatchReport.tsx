// HM26 — UI/UX §5.15 Maç Sonu Analizi + §13 Maç Motoru istatistikleri
import React, { useState } from 'react';
import { DemoFixture } from '../types';
import { useGame, DemoMatchResult } from '../store/game';
import { Card, Btn, Seg, Sheet } from '../components/ui/kit';
import { MatchHighlights } from '../components/match/MatchHighlights';
import { MatchAwardCeremony } from '../components/match/MatchAwardCeremony';
import { selectMatchAward } from '../data/matchAward';
import { Crest } from '../components/assets/Crest';
import { clubById } from '../data/clubs';
import { expectedMatchPoints } from '../engine/analytics';

export const MatchReport: React.FC<{ result: DemoMatchResult; fixture: DemoFixture; onDone: () => void; onEndDay?: () => void }> = ({ result, onDone, onEndDay }) => {
  const g = useGame();
  const home = clubById(result.homeId);
  const away = clubById(result.awayId);
  const [tab, setTab] = useState<'ozet' | 'istatistik' | 'analiz' | 'karne' | 'events'>('ozet');
  const [eventView, setEventView] = useState<'all' | 'important'>('all');
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const mine = result.homeId === g.myClub.id ? 'home' : 'away';
  const opponent = mine === 'home' ? away : home;
  const events = result.events ?? [];
  const importantKinds = new Set(['goal', 'card', 'save', 'var', 'sub', 'injury', 'half']);
  const visibleEvents = eventView === 'all' ? events : events.filter((event) => importantKinds.has(event.kind));
  const myXg = mine === 'home' ? result.xgHome : result.xgAway;
  const oppXg = mine === 'home' ? result.xgAway : result.xgHome;
  const resTxt = result.hg === result.ag ? 'Beraberlik' : (mine === 'home') === result.hg > result.ag ? 'Galibiyet' : 'Mağlubiyet';
  const resColor = resTxt === 'Galibiyet' ? 'var(--c-ok)' : resTxt === 'Beraberlik' ? 'var(--c-warn)' : 'var(--c-danger)';

  const myPoss = mine === 'home' ? result.posHome : 100 - result.posHome;
  const oppPoss = 100 - myPoss;
  // Dalga 2 (§5-D): gerçek sayaçlar — sahte tahminler kaldırıldı
  const rows = result.playerRows ?? {};
  const myRows = Object.entries(rows).filter(([id]) => g.clubOfPlayer(id) === g.myClub.id);
  const oppRows = Object.entries(rows).filter(([id]) => g.clubOfPlayer(id) && g.clubOfPlayer(id) !== g.myClub.id);
  const award = selectMatchAward(result, g.clubOfPlayer, g.playerOf);
  const motmName = award ? (award.player?.name ?? 'Oyuncu') : '—';
  const corridor = (wide: number, central: number) => {
    const tot = Math.max(1, wide + central);
    return { c: Math.round((central / tot) * 100), w: Math.round((wide / tot) * 100) };
  };
  const myCorridor = corridor(mine === 'home' ? result.wideH : result.wideA, mine === 'home' ? result.centralH : result.centralA);
  const oppCorridor = corridor(mine === 'home' ? result.wideA : result.wideH, mine === 'home' ? result.centralA : result.centralH);
  // Maçın xG çiftinden Poisson beklentisi (mevcut arşiv alanları, yeni şema yok)
  const expectation = expectedMatchPoints(result.xgHome, result.xgAway);
  const myXp = mine === 'home' ? expectation.homeXp : expectation.awayXp;
  const myWinP = mine === 'home' ? expectation.pHomeWin : expectation.pAwayWin;
  const oppWinP = mine === 'home' ? expectation.pAwayWin : expectation.pHomeWin;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const actualPts = result.hg === result.ag ? 1 : (mine === 'home' ? result.hg > result.ag : result.ag > result.hg) ? 3 : 0;

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar safe-t">
        <div className="relative pt-8 pb-6 text-center">
          <div className="text-[11px] text-muted uppercase tracking-wide">Maç Sonu Analizi</div>
          <div className="mt-3 inline-flex items-center gap-3 bg-surface border border-line rounded-2xl px-5 py-3">
            <Crest club={home} size={36} />
            <div>
              <div className="num text-primary font-display text-3xl leading-none">{result.hg}–{result.ag}</div>
              <div className="text-[10px] font-bold mt-1" style={{ color: resColor }}>{resTxt}</div>
            </div>
            <Crest club={away} size={36} />
          </div>
          <div className="text-secondary text-[12px] mt-3">{home.name} vs {away.name} · {home.stadium}</div>
          <div className="mt-2 inline-flex items-center gap-2 bg-elevated border border-line rounded-full px-3 py-1">
            <span className="text-muted text-[11px]">Maçın Adamı:</span>
            <span className="text-amber font-bold text-[12px]">{motmName} ★ {award ? award.row.rating.toFixed(2) : ''}</span>
          </div>
          {award && !awardOpen && <div className="px-4 mt-3"><Btn variant="secondary" testId="open-match-award" className="w-full !text-[12px]" onClick={() => setAwardOpen(true)}>Maçın Adamı Törenini İzle</Btn></div>}
        </div>

        <div className="px-4 pb-4">
          {award && awardOpen && <div className="mb-3"><MatchAwardCeremony award={award} reducedMotion={g.career.settings.reduceMotion} onClose={() => setAwardOpen(false)} /></div>}
          <Seg ariaLabel="Maç raporu sekmeleri" className="[&>button]:text-[11px]" options={[{ v: 'ozet', label: 'Özet' }, { v: 'istatistik', label: 'İstatistik' }, { v: 'analiz', label: 'Analiz' }, { v: 'karne', label: 'Karneler' }, { v: 'events', label: 'Olaylar' }]} value={tab} onChange={(v) => setTab(v as any)} />

          {tab === 'ozet' && (
            <div className="mt-4 space-y-2.5 m26-in">
              <Card className="!p-3" accent="var(--c-accent)">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0"><div className="font-display text-primary font-bold text-[14px]">Öne Çıkan Anlar</div><p className="text-muted text-[11px] mt-0.5">Gerçek maç olaylarını sahada incele.</p></div>
                  <Btn variant="amber" testId="open-highlights" onClick={() => setHighlightsOpen(true)}>Özeti İzle</Btn>
                </div>
              </Card>
              <Card accent={resColor}>
                <div className="text-[12px] text-muted uppercase tracking-[0.08em]">Ana İçgörüler</div>
                <div className="space-y-2 mt-2.5">
                  {result.insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 text-[13px] text-primary/95 leading-snug">
                      <span className="text-amber mt-0.5">◆</span>{ins}
                    </div>
                  ))}
                </div>
              </Card>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: 'xG (Takımım)', v: myXg.toFixed(2), c: 'var(--c-ok)' },
                  { k: 'xG (Rakip)', v: oppXg.toFixed(2), c: 'var(--c-danger)' },
                  { k: 'Topa Sahip Olma', v: `${mine === 'home' ? result.posHome : 100 - result.posHome}%`, c: 'var(--c-info)' },
                ].map((x) => (
                  <Card key={x.k} className="!p-2.5 text-center">
                    <div className="num text-lg font-bold" style={{ color: x.c }}>{x.v}</div>
                    <div className="text-muted text-[9px] uppercase mt-0.5 leading-tight">{x.k}</div>
                  </Card>
                ))}
              </div>
              <Card>
                <div data-testid="xpts-card">
                <div className="text-[11px] text-muted uppercase tracking-[0.08em]">Beklenen Puan (xPTS)</div>
                <div className="flex items-end justify-between mt-1.5">
                  <div>
                    <div className="num text-primary font-display text-2xl leading-none">{myXp.toFixed(2)}</div>
                    <div className="text-muted text-[10px] mt-0.5">3 üzerinden beklenti</div>
                  </div>
                  <div className="text-right text-[11px] text-secondary leading-relaxed">
                    <div><span className="text-ok font-bold">{pct(myWinP)}</span> galibiyet · <span className="text-muted font-bold">{pct(expectation.pDraw)}</span> beraberlik · <span className="text-danger font-bold">{pct(oppWinP)}</span> mağlubiyet</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-line/50 text-[10.5px] text-muted flex justify-between">
                  <span>Maçtan alınan gerçek puan: <b className="text-amber num">{actualPts}</b></span>
                  <span className={actualPts + 0.5 < myXp ? 'text-danger' : actualPts - 0.5 > myXp ? 'text-ok' : 'text-muted'}>
                    {actualPts > myXp ? 'Beklenti üstü' : actualPts < myXp ? 'Beklenti altı' : 'Beklentiye yakın'}
                  </span>
                </div>
                </div>
              </Card>
              <Btn variant="secondary" className="w-full" onClick={() => setTab('istatistik')}>Ayrıntılı Analizi Aç →</Btn>
            </div>
          )}

          {tab === 'istatistik' && (
            <Card className="mt-4 m26-in">
              <div className="text-[11px] text-muted uppercase mb-2.5">Takım İstatistikleri (motor ölçümü)</div>
              {([
                ['Şut', mine === 'home' ? result.shotsH : result.shotsA, mine === 'home' ? result.shotsA : result.shotsH],
                ['İsabet', mine === 'home' ? result.shotsOnH : result.shotsOnA, mine === 'home' ? result.shotsOnA : result.shotsOnH],
                ['Topa Sahip Olma', myPoss + '%', oppPoss + '%'],
                ['xG', myXg.toFixed(2), oppXg.toFixed(2)],
                ['Korner', mine === 'home' ? result.cornersH : result.cornersA, mine === 'home' ? result.cornersA : result.cornersH],
                ['Faul', mine === 'home' ? result.foulsH : result.foulsA, mine === 'home' ? result.foulsA : result.foulsH],
                ['Sarı Kart', mine === 'home' ? result.yellowH : result.yellowA, mine === 'home' ? result.yellowA : result.yellowH],
                ['Kırmızı Kart', mine === 'home' ? result.redH : result.redA, mine === 'home' ? result.redA : result.redH],
                ['Kaleci Kurtarışı', mine === 'home' ? result.savesH : result.savesA, mine === 'home' ? result.savesA : result.savesH],
                ['Presle Kazanım', mine === 'home' ? result.pressWinsH : result.pressWinsA, mine === 'home' ? result.pressWinsA : result.pressWinsH],
              ] as [string, any, any][]).map(([k, h, a]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-line/40 last:border-0">
                  <span className="num text-ok font-bold text-[13px] w-14 text-right">{h}</span>
                  <span className="text-secondary text-[12px] flex-1 text-center">{k}</span>
                  <span className="num text-danger font-bold text-[13px] w-14">{a}</span>
                </div>
              ))}
              <div className="text-muted text-[10.5px] mt-2 text-center">Sütunlar: Takımım ↔ Rakip · Tüm değerler maç motoru ölçümüdür</div>
            </Card>
          )}

          {tab === 'analiz' && (
            <div className="mt-4 space-y-2.5 m26-in">
              <Card>
                <div className="text-[11px] text-muted uppercase mb-2">Vuruş Haritası</div>
                <svg viewBox="0 0 100 100" className="w-full rounded-xl border border-line" style={{ background: 'linear-gradient(180deg, #1b3a2a 0%, #16301f 100%)' }}>
                  {/* saha çizgileri */}
                  <rect x="1" y="1" width="98" height="98" fill="none" stroke="rgba(250,245,234,0.35)" strokeWidth="0.8" />
                  <line x1="1" y1="50" x2="99" y2="50" stroke="rgba(250,245,234,0.35)" strokeWidth="0.8" />
                  <circle cx="50" cy="50" r="9" fill="none" stroke="rgba(250,245,234,0.35)" strokeWidth="0.8" />
                  <rect x="30" y="1" width="40" height="12" fill="none" stroke="rgba(250,245,234,0.35)" strokeWidth="0.8" />
                  <rect x="40" y="1" width="20" height="5" fill="none" stroke="rgba(250,245,234,0.35)" strokeWidth="0.8" />
                  <rect x="30" y="87" width="40" height="12" fill="none" stroke="rgba(250,245,234,0.35)" strokeWidth="0.8" />
                  <rect x="40" y="94" width="20" height="5" fill="none" stroke="rgba(250,245,234,0.35)" strokeWidth="0.8" />
                  {/* şut noktaları — yarıçap xG ile orantılı */}
                  {(result.shotsLog ?? []).map((s, i) => {
                    const r = Math.min(3.2, 1.4 + s.xg * 9);
                    const fill = s.outcome === 'goal' ? '#f59e0b' : s.outcome === 'save' ? '#38bdf8' : s.outcome === 'clearance' ? '#d9e9b4' : s.outcome === 'woodwork' ? '#fb7185' : 'rgba(250,245,234,0.14)';
                    const stroke = s.outcome === 'goal' ? '#fff' : s.outcome === 'save' ? '#0ea5e9' : s.outcome === 'clearance' ? '#88a15a' : s.outcome === 'woodwork' ? '#be123c' : 'rgba(250,245,234,0.45)';
                    return <circle key={i} cx={s.x} cy={s.y} r={r} fill={fill} stroke={stroke} strokeWidth={s.outcome === 'miss' ? 0.7 : 0.9} fillOpacity={s.outcome === 'miss' ? 0.6 : 0.92} />;
                  })}
                </svg>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 text-[10.5px] text-secondary">
                  <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-white/70" /> Gol ({(result.shotsLog ?? []).filter((s) => s.outcome === 'goal').length})</span>
                  <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Kurtarış/İsabet ({(result.shotsLog ?? []).filter((s) => s.outcome === 'save').length})</span>
                  <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#d9e9b4]" /> Çizgiden çıkarılan ({(result.shotsLog ?? []).filter((s) => s.outcome === 'clearance').length})</span>
                  <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#fb7185]" /> Direk ({(result.shotsLog ?? []).filter((s) => s.outcome === 'woodwork').length})</span>
                  <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full border border-white/50 bg-white/10" /> Kaçan ({(result.shotsLog ?? []).filter((s) => s.outcome === 'miss').length})</span>
                </div>
                <div className="text-muted text-[10px] text-center mt-1">Üst yarı: {home.short ?? home.name} hücumu · Alt yarı: {away.short ?? away.name} hücumu · Nokta boyutu = xG</div>
              </Card>
              <Card>
                <div className="text-[11px] text-muted uppercase mb-2">Koridor Payı (motor ölçümü)</div>
                {[
                  { label: 'Takımım', c: myCorridor.c, w: myCorridor.w, color: 'var(--c-accent, #7C4D2E)' },
                  { label: 'Rakip', c: oppCorridor.c, w: oppCorridor.w, color: '#5C6B57' },
                ].map((row) => (
                  <div key={row.label} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between text-[11px] text-secondary mb-1"><span>{row.label}</span><span className="num">Merkez %{row.c} · Kanat %{row.w}</span></div>
                    <div className="h-2.5 rounded-full overflow-hidden flex">
                      <div style={{ width: row.c + '%', background: 'var(--c-accent, #7C4D2E)' }} />
                      <div style={{ width: row.w + '%', background: '#38bdf8' }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted mt-0.5"><span>■ Merkez</span><span>Kanat ■</span></div>
                  </div>
                ))}
              </Card>
              <p className="text-secondary text-[12px] leading-snug">Teknik Not: {result.insights[0]}</p>
            </div>
          )}

          {tab === 'karne' && (
            <div className="mt-4 space-y-2.5 m26-in">
              {[
                { title: `Takımım — ${g.myClub.short ?? g.myClub.name}`, rows: myRows, accent: 'var(--c-ok)' },
                { title: `Rakip — ${opponent.short ?? opponent.name}`, rows: oppRows, accent: 'var(--c-danger)' },
              ].map((block) => (
                <Card key={block.title}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] uppercase font-bold" style={{ color: block.accent }}>{block.title}</div>
                    <div className="text-muted text-[9px]">dk · G-A · şut · kart · kurtarış</div>
                  </div>
                  {block.rows.sort((x, y) => y[1].rating - x[1].rating).map(([pid, r]) => {
                    const p = g.playerOf(pid);
                    const rc = r.rating >= 8 ? 'var(--c-ok)' : r.rating >= 7 ? '#f59e0b' : r.rating >= 6.2 ? 'var(--c-info)' : 'var(--c-danger)';
                    return (
                      <div key={pid} className="flex items-center gap-2 py-1.5 border-b border-line/40 last:border-0">
                        <span className="num text-[10px] text-muted w-8">{r.min}'</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-primary truncate font-semibold">{p?.name ?? 'Oyuncu'} <span className="text-muted text-[10px] font-normal">({r.posGroup})</span></div>
                          <div className="text-[10px] text-secondary">
                            {r.g > 0 && <span className="text-amber font-bold mr-1.5">{r.g} ⚽</span>}
                            {r.a > 0 && <span className="text-amber mr-1.5">{r.a} asist</span>}
                            {r.shots > 0 && <span className="mr-1.5">{r.shots} şut</span>}
                            {r.saves > 0 && <span className="text-info mr-1.5">{r.saves} kurtarış</span>}
                            {r.yellow > 0 && <span className="inline-block w-1.5 h-2 rounded-sm bg-[#f5d020] align-middle mr-1" />}
                            {r.red > 0 && <span className="inline-block w-1.5 h-2 rounded-sm bg-[#d92323] align-middle mr-1" />}
                          </div>
                        </div>
                        <span className="num text-[12px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: rc, border: `1px solid ${rc}` }}>{r.rating.toFixed(1)}</span>
                      </div>
                    );
                  })}
                  {block.rows.length === 0 && <div className="text-muted text-[12px]">Oynayan oyuncu yok.</div>}
                </Card>
              ))}
            </div>
          )}

          {tab === 'events' && (
            <Card className="mt-4 m26-in">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[11px] text-muted uppercase">Maç Olay Akışı</div>
                <span className="text-muted text-[10px] num">{visibleEvents.length} olay</span>
              </div>
              <Seg ariaLabel="Maç olayı filtresi" options={[{ v: 'all', label: 'Tüm olaylar' }, { v: 'important', label: 'Önemli anlar' }]} value={eventView} onChange={(value) => setEventView(value as 'all' | 'important')} />
              <div className="space-y-2 mt-3" data-testid="match-report-events">
                {visibleEvents.map((e, i) => (
                  <div key={i} data-testid="match-report-event" className="flex items-start gap-2 text-[12px] leading-snug border-b border-line/40 pb-2 last:border-0">
                    <span className="num text-muted shrink-0 w-8">{e.minute}'</span>
                    <span className={`flex-1 ${e.kind === 'goal' ? 'text-amber font-bold' : e.kind === 'save' ? 'text-info' : e.kind === 'card' ? 'text-warn' : 'text-primary/85'}`}>{e.text}</span>
                    {e.side && <span className="text-muted text-[9px] font-bold shrink-0">{e.side === 'home' ? home.short : away.short}</span>}
                  </div>
                ))}
                {visibleEvents.length === 0 && <p className="text-secondary text-[12px] leading-relaxed py-2">{events.length === 0 ? 'Bu maç için olay kaydı bulunmuyor.' : 'Bu filtrede önemli olay bulunmuyor.'}</p>}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Sheet open={highlightsOpen} onClose={() => setHighlightsOpen(false)} title="Öne Çıkan Anlar" tall>
        {highlightsOpen && <MatchHighlights home={home} away={away} homeGoals={result.hg} awayGoals={result.ag} events={events} reduceMotion={g.career.settings.reduceMotion} />}
      </Sheet>
      {/* Keep both actions inside the content area, above the shell navigation. */}
      <div className="shrink-0 px-4 py-3 border-t border-line/50 bg-base" data-testid="match-report-footer">
        <div className="space-y-2">
          {onEndDay && (
            <Btn variant="amber" testId="end-day-after-match" className="w-full !min-h-[50px]" onClick={onEndDay}>Kaydet ve Günü Bitir →</Btn>
          )}
          <Btn variant={onEndDay ? 'secondary' : 'amber'} className="w-full !min-h-[46px]" onClick={onDone}>Sonucu Kaydet — Ana Merkez</Btn>
        </div>
      </div>
    </div>
  );
};
