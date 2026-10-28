// HM26 — UI/UX §5.12 Maç Hazırlığı kontrol listesi
import React, { useState } from 'react';
import { Screen } from '../types';
import { useGame } from '../store/game';
import { Card, Btn, Badge, Sheet } from '../components/ui/kit';
import { Crest } from '../components/assets/Crest';
import { GameIcon } from '../components/icons';
import { clubById } from '../data/clubs';
import { GAME_PLANS } from '../data/meta';
import { autoXI } from '../data/gen';
import { DemoMatchResult } from '../store/game';
import { LiveMatch } from './LiveMatch';
import { buildMatchBrief, type NoteTone } from '../engine/matchDay';
import { buildMatchdayAtmosphere } from '../engine/atmosphere';
import { normalizeClubCulture } from '../data/culture';
import { headToHead } from '../engine/teamInsights';
import { COMP_LABEL } from '../data/newsroom';


export const MatchPrep: React.FC<{ go: (s: Screen) => void }> = ({ go }) => {
  const g = useGame();
  const next = g.nextFixture;
  const [prepared, setPrepared] = useState<Set<string>>(new Set(['tactic', 'xi']));
  const [started, setStarted] = useState(false);
  const [activeTacticIdx, setActiveTacticIdx] = useState(0);   // P2 (SPEC Böl.I/7): 5 plan slotu seçilebilir
  const [quick, setQuick] = useState<DemoMatchResult | null>(null);
  if (!next) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 text-accent"><GameIcon id={('comps') as string} className="w-full h-full" /></div>
        <div className="text-primary font-bold">Planlanmış maç yok</div>
        <p className="text-secondary text-[13px] mt-2">Fikstür sonu yaklaştıkça ya da kupa kuralarında yeni resmî maçlar oluşur. Lig ekranından dünyayı izleyebilirsin.</p>
        <Btn variant="secondary" className="mt-5 w-full" onClick={() => go('hub')}>Ana Merkez'e Dön</Btn>
      </div>
    );
  }
  // BUG B FIX: Oyuncu ancak maç günü sahaya çıkar (kgun === fixture.day); erken günlerde hazırlık listesi görünür ama Maça Başla engellenir
  const isMatchday = next.day === g.career.day;
  const daysLeft = next.day - g.career.day;
  if (started && !isMatchday) setStarted(false); // güvenlik: eski state
  if (started) return <LiveMatch fixture={next} tacticIdx={activeTacticIdx} onExit={() => setStarted(false)} onSaved={() => { setStarted(false); go('hub'); }} />;

  // Dalga 1 (v0.5): işsiz menajer maç merkezine giremez
  if (g.career.jobSearch) {
    return (
      <div className="h-full overflow-y-auto no-scrollbar p-4 flex flex-col items-center justify-center text-center">
        <Card className="!border-danger/60">
          <div className="text-danger text-[12px] uppercase tracking-wide font-bold">İşsizsin</div>
          <div className="text-primary font-bold text-[15px] mt-2">Sözleşmen feshedildi — bu kulübün maçlarını artık AI yönetiyor.</div>
          <p className="text-secondary text-[12.5px] mt-2 leading-snug">Kariyerin burada bitmiyor: Ana Merkez'deki {g.career.jobSearch.offers.length} tekliften birini imzala; günler serbestçe ilerler.</p>
          <Btn variant="amber" className="w-full mt-4 !min-h-touch" onClick={() => go('hub')}>İş Tekliflerine Dön</Btn>
        </Card>
      </div>
    );
  }

  const home = clubById(next.homeId);
  const away = clubById(next.awayId);
  const mine = g.myClub.id === home.id ? home : away;
  const isHome = mine.id === home.id;
  const xi = autoXI(g.mySquad, g.tactics[0].formation);
  const xiList = [...xi.gk, ...xi.defShape, ...xi.fbWb, ...xi.dm, ...xi.cm, ...xi.am, ...xi.wg, ...xi.st];
  const avgFitness = Math.round(xiList.reduce((x, p) => x + p.fitness, 0) / Math.max(1, xiList.length));
  const riskCount = xiList.filter((p) => p.fitness < 60 || p.injuredDays > 0).length;
  const checklist: { id: string; ok: boolean; title: string; sub: string }[] = [
    { id: 'squadOk', ok: riskCount === 0, title: 'İlk 11 tamamlandı ve sağlıklı', sub: riskCount ? `${riskCount} oyuncu yüksek risk taşıyor` : `${xiList.length}/11 hazır · ort. kondisyon ${avgFitness}` },
    { id: 'bench', ok: xi.bench.length >= 5, title: 'Yedekler seçildi', sub: `${xi.bench.length} yedek (5 değişiklik hakkı)` },
    { id: 'fitness', ok: avgFitness >= 75, title: 'Kondisyon incelendi', sub: `Ortalama ${avgFitness}% ${avgFitness >= 75 ? '— hazır' : '— rotasyon önerilebilir'}` },
    { id: 'report', ok: prepared.has('report'), title: 'Rakip raporu okundu', sub: `${away.name === mine.name ? home.name : away.name} analizi hazır` },
    { id: 'tactic', ok: true, title: 'Taktik planı seçildi', sub: `${g.tactics[activeTacticIdx]?.name ?? g.tactics[0].name} · ${g.tactics[activeTacticIdx]?.formation ?? g.tactics[0].formation} · ${GAME_PLANS.find((p) => p.id === (g.tactics[activeTacticIdx] ?? g.tactics[0]).plan)!.name}` },
    { id: 'setpieces', ok: prepared.has('setpieces'), title: 'Duran top kullananlar atandı', sub: 'Kaptan/penaltı/korner listelendi' },
  ];
  const ready = checklist.filter((c) => c.ok).length;

  // QA-GAP (design): forma çakışması kontrolü — iki ana renk RGB uzayında yakınsa ve ev renkleri rakibin
  // ikinci rengine de yakınsa ayrıştırma riski var → deplasman forması önerisi
  const hexRgb = (h: string): [number, number, number] => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const cDist = (a: string, b: string) => { const [r1, g1, b1] = hexRgb(a); const [r2, g2, b2] = hexRgb(b); return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2); };
  const kitClash = cDist(home.color1, away.color1) < 85 && cDist(home.color2, away.color1) < 85;

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-6">
      {/* Rakip afişi */}
      <div className="relative h-40 shrink-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${home.color1}26, transparent 50%, ${away.color1}26)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-base to-transparent" />
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-6">
          <div className="text-center">
            <Crest club={home} size={58} className="mx-auto" variant="full" />
            <div className="text-primary text-[12px] font-bold mt-1.5 max-w-[90px] truncate">{home.short}</div>
          </div>
          <div className="text-center">
            <div className="text-muted text-[10px] uppercase tracking-wide">{home.stadium}</div>
            <div className="num text-primary font-display text-2xl">VS</div>
          </div>
          <div className="text-center">
            <Crest club={away} size={58} className="mx-auto" variant="full" />
            <div className="text-primary text-[12px] font-bold mt-1.5 max-w-[90px] truncate">{away.short}</div>
          </div>
        </div>
      </div>

      {kitClash && (
        <div className="px-4 mt-2"><div className="bg-warn/10 border border-warn/40 rounded-xl px-3 py-2 text-[12px] text-warn">Forma çakışması riski: ana renkler çok yakın ({home.color1.toUpperCase()} ≈ {away.color1.toUpperCase()}). Deplasman takımı alternatif formayla çıkar.</div></div>
      )}

      <div className="px-4 space-y-2.5 mt-1">
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted uppercase tracking-wide">Maç Hazırlığı Kontrol Listesi</div>
          <Badge kind={ready === checklist.length ? 'ok' : 'warn'}>{ready}/{checklist.length} tamam</Badge>
        </div>
        {checklist.map((c) => (
          <Card key={c.id} className="!p-3" accent={c.ok ? 'var(--c-ok)' : 'var(--c-warn)'}>
            <div className="flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-primary text-[13.5px] font-bold flex items-center gap-1.5">
                  <span className={c.ok ? 'text-ok' : 'text-warn'}>{c.ok ? '✓' : '!'}</span>{c.title}
                </div>
                <div className={`text-[11.5px] mt-0.5 ${c.ok ? 'text-secondary' : 'text-warn'}`}>{c.sub}</div>
              </div>
              {!c.ok && (c.id === 'report' || c.id === 'setpieces') && (
                <Btn variant="secondary" className="!min-h-[38px] !px-3 !text-[11.5px] shrink-0" onClick={() => setPrepared((s) => new Set([...s, c.id]))}>{c.id === 'report' ? 'Raporu Aç' : 'Ata'}</Btn>
              )}
            </div>
          </Card>
        ))}

        {/* Dalga 5: Teknik Direktör Notu — gerçek veriden brifing (yeni şema yok, arşiv yoksa form yorumu yok) */}
        {(() => {
          const tac = g.tactics[activeTacticIdx] ?? g.tactics[0];
          const briefXi = autoXI(g.mySquad, tac.formation);
          const briefList = [...briefXi.gk, ...briefXi.defShape, ...briefXi.fbWb, ...briefXi.dm, ...briefXi.cm, ...briefXi.am, ...briefXi.wg, ...briefXi.st];
          const opp = isHome ? away : home;
          const brief = buildMatchBrief({
            myClub: { short: mine.short, strength: mine.strength },
            oppClub: { short: opp.short, strength: opp.strength },
            plan: tac, xi: briefList, squad: g.mySquad,
            reports: g.matchReports ?? [], isHome,
          });
          const toneCls: Record<NoteTone, string> = {
            ok: 'border-ok/45 bg-ok/10 text-ok',
            warn: 'border-warn/45 bg-warn/10 text-warn',
            danger: 'border-danger/45 bg-danger/10 text-danger',
            info: 'border-info/45 bg-info/10 text-info',
          };
          return (
            <Card className="!p-3" >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px]">📋</span>
                <div className="text-[12px] text-muted uppercase tracking-[0.08em]">Teknik Direktör Notu</div>
              </div>
              <p className="text-primary text-[12.5px] font-bold leading-snug mb-2">{brief.headline}</p>
              <div className="space-y-1.5" data-testid="td-brief">
                {brief.notes.map((n, i) => (
                  <div key={`${n.tag}-${i}`} className={`rounded-lg border px-2.5 py-1.5 flex gap-2 items-start ${toneCls[n.tone]}`} data-brief-tone={n.tone}>
                    <span className="text-[9px] font-black tracking-wider shrink-0 mt-0.5 opacity-80">{n.tag}</span>
                    <span className="text-[11.5px] leading-snug text-secondary flex-1">{n.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Dalga 7: maç günü atmosferi — gerçek kültür/fikstür verisinden tribün hissi */}
        {(() => {
          const opp = isHome ? away : home;
          const clubCulture = normalizeClubCulture(g.career.culture, g.career.seed, g.career.clubId, mine.rivalIds ?? []);
          const isDerby = (home.rivalIds ?? []).includes(away.id) || home.derby === away.id;
          const isNemesis = clubCulture.nemesisClubId === opp.id;
          const atm = buildMatchdayAtmosphere({
            isHome, isDerby, isNemesis, oppShort: opp.short, stadium: home.stadium, culture: clubCulture,
          });
          const toneCls: Record<string, string> = {
            ok: 'border-ok/45 bg-ok/10 text-ok',
            info: 'border-info/45 bg-info/10 text-info',
            warn: 'border-warn/45 bg-warn/10 text-warn',
            danger: 'border-danger/45 bg-danger/10 text-danger',
          };
          return (
            <Card className="!p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px]">🏟️</span>
                <div className="text-[12px] text-muted uppercase tracking-[0.08em]">Maç Günü Atmosferi</div>
              </div>
              <p className="text-primary text-[12.5px] font-bold leading-snug mb-2">{atm.headline}</p>
              <div className="space-y-1.5" data-testid="atmosphere-card">
                {atm.lines.map((l, i) => (
                  <div key={`${l.tag}-${i}`} className={`rounded-lg border px-2.5 py-1.5 flex gap-2 items-start ${toneCls[l.tone]}`} data-atm-tone={l.tone}>
                    <span className="text-[9px] font-black tracking-wider shrink-0 mt-0.5 opacity-80">{l.tag}</span>
                    <span className="text-[11.5px] leading-snug text-secondary flex-1">{l.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Birebir eşleşme geçmişi (H2H) — yalnız gerçek arşiv, veri yoksa dürüst boş durum */}
        {(() => {
          const oppId = isHome ? away.id : home.id;
          const h2h = headToHead(g.matchReports ?? [], mine.id, oppId, 5);
          return (
            <Card className="!p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px]">🤝</span>
                <div className="text-[12px] text-muted uppercase tracking-[0.08em]">Birebir Geçmiş · {away.short} ile</div>
              </div>
              <div data-testid="h2h-card">
                {h2h.played === 0 ? (
                  <p className="text-muted text-[12px]">Bu rakiple kayıtlı karşılaşma yok — ilk maçın ardından geçmiş burada belirir.</p>
                ) : (
                  <div>
                    <div className="grid grid-cols-4 gap-1.5 text-center mb-2.5">
                      {[
                        [`${h2h.played}`, 'Maç'],
                        [`${h2h.wins}-${h2h.draws}-${h2h.losses}`, 'G-B-M'],
                        [`${h2h.gf}:${h2h.ga}`, 'Gol'],
                        [`${h2h.xgf.toFixed(1)}-${h2h.xga.toFixed(1)}`, 'xG'],
                      ].map(([v, l]) => (
                        <div key={l} className="bg-base/70 rounded-lg py-1.5">
                          <div className="num text-primary font-extrabold text-[14px]">{v}</div>
                          <div className="text-muted text-[9px] uppercase">{l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1" data-testid="h2h-meetings">
                      {h2h.meetings.map((m, i) => (
                        <div key={`${m.day}-${i}`} data-testid="h2h-meeting"
                          className={`flex items-center gap-2 rounded-lg bg-base/60 px-2.5 py-1.5 text-[11px] ${m.result === 'W' ? 'text-ok' : m.result === 'L' ? 'text-danger' : 'text-muted'}`}>
                          <span className="w-9 shrink-0 text-muted">{COMP_LABEL[m.comp]}</span>
                          <span className="w-4 shrink-0 text-muted">{m.isHome ? 'E' : 'D'}</span>
                          <span className="flex-1 num font-extrabold text-right">{m.gf}–{m.ga}</span>
                          <span className="num text-muted w-16 text-right">xG {m.xgf.toFixed(1)}-{m.xga.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })()}

        {/* §13.2 rakip analizi mini raporu */}
        <Card>
          <div className="text-[12px] text-muted uppercase tracking-[0.08em]">Rakip Analizi</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2.5">
            {(() => {
              const opp = isHome ? away : home;
              return [
                ['Güçlü alan', opp.strength >= 70 ? 'Hücum kalitesi' : 'Savunma disiplin'],
                ['Zayıf alan', opp.strength >= 70 ? 'Deplasman formu' : 'Bitiricilik'],
                ['Son biçim', 'G─B─M'],
                ['Öne çıkan', g.squads[opp.id]?.sort((a, b) => b.ratings.gen - a.ratings.gen)[0]?.name.split(' ').slice(-1)[0] ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-base/70 rounded-lg p-2.5">
                  <div className="text-muted text-[9.5px] uppercase">{k}</div>
                  <div className="text-primary text-[13px] font-bold mt-0.5 truncate">{v}</div>
                </div>
              ));
            })()}
          </div>
          <p className="text-info text-[11.5px] mt-2.5">Öneri: Rakip {(isHome ? away : home).strength} gücünde — {g.tactics[0].plan === 'dusukBlok' ? 'Düşük Blok doğru eşleşme.' : 'Dengeli çıkış savunma arkasını korur.'}</p>
        </Card>

        {/* P2: Plan Seçici — 5 taktik yuvası aktif */}
        <Card className="!p-2.5">
          <div className="text-[12px] text-muted uppercase tracking-[0.08em] mb-2">Plân Seçimi (onaylayarak başla)</div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {g.tactics.map((tac, idx) => (
              <button key={tac.id} onClick={() => setActiveTacticIdx(idx)}
                className={`px-3 py-2 rounded-lg text-[11.5px] font-bold border shrink-0 transition ${activeTacticIdx === idx ? 'bg-accent text-[var(--c-on-accent)] border-transparent' : 'bg-surface text-secondary border-line'}`}>
                {tac.name} ({tac.formation})
              </button>
            ))}
          </div>
          {/* Dalga 1 (v0.5): seçili planın maç merkezi özeti */}
          {(() => {
            const tac = g.tactics[activeTacticIdx] ?? g.tactics[0];
            if (!tac) return null;
            const planName = GAME_PLANS.find((p) => p.id === tac.plan)?.name ?? tac.plan;
            const tl = { low: 'düşük', mid: 'orta', high: 'yüksek' } as const;
            const dl = { deep: 'derin', normal: 'normal', high: 'ileri' } as const;
            return (
              <div className="mt-2 text-[11px] text-muted leading-snug">
                Maça çıkacak: <b className="text-primary">{tac.formation}</b> · {planName} · pres {tl[tac.press]} · tempo {tl[tac.tempo]} · genişlik {tac.width} · hat {dl[tac.defLine]}
                {tac.customLineup?.length ? <span className="text-amber"> · manuel 11</span> : null}
              </div>
            );
          })()}
        </Card>
        <div className="sticky bottom-2 pt-2 pb-1 space-y-2">
          <Btn variant="amber" className="w-full !min-h-[52px] text-[15px]" disabled={!isMatchday} onClick={() => isMatchday && setStarted(true)}>
            {isMatchday ? 'Maça Başla' : `Maç için ${daysLeft} gün kaldı`}
          </Btn>
          <Btn variant="secondary" className="w-full !min-h-touch" disabled={!isMatchday} onClick={() => isMatchday && setQuick(g.playLeagueMatch({ ...next }))}>
            Simüle Et (hızlı sonuç)
          </Btn>
          {!isMatchday && <p className="text-warn text-[11.5px] text-center mt-1">Maç günleri takvimde işaretli — günü ilerletmek için Ana Merkez'den "Sonraki Gün"e dokun.</p>}
          <p className="text-center text-muted text-[11px]">Canlı yönetim önerilir — hızlı simülasyon sonucu anında işler ve sezona yansır.</p>
        </div>
      </div>

      {quick && (
        <Sheet open onClose={() => { setQuick(null); go('hub'); }} title="Hızlı Simülasyon Sonucu">
          <div className="text-center pb-2">
            <div className="font-display text-3xl text-primary">
              {clubById(quick.homeId).short} <span className="text-amber">{quick.hg}–{quick.ag}</span> {clubById(quick.awayId).short}
            </div>
            <div className="text-muted text-[12px] mt-1">xG {quick.xgHome.toFixed(2)}–{quick.xgAway.toFixed(2)} · Sonuç sezona ve tabloya işlendi</div>
            <p className="text-secondary text-[12.5px] mt-3 leading-snug">{quick.insights[0]}</p>
            <Btn variant="amber" className="w-full mt-4" onClick={() => { setQuick(null); go('hub'); }}>Ana Merkez'e Dön</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
};
