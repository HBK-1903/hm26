// HM26 — UI/UX §5.4 Ana Merkez (v0.7.0: UI Prototip düzeni — kulüp başlığı, maç kartı, metrik grid, kompakt kartlar)
import React, { useState } from 'react';
import { Screen } from '../types';
import { useGame, dayToDate } from '../store/game';
import { Card, Btn, Badge, Sheet } from '../components/ui/kit';
import { Crest } from '../components/assets/Crest';
import { GameIcon } from '../components/icons';
import { clubById, LEAGUES } from '../data/clubs';
import { InstallBanner } from '../components/ui/InstallBanner';
import { opponentScout } from '../engine/scout';

export const Hub: React.FC<{ go: (s: Screen) => void; onOpenWeekly?: () => void }> = ({ go, onOpenWeekly }) => {
  const g = useGame();
  const [trainingOpen, setTrainingOpen] = useState(false);
  const next = g.nextFixture;
  const opponent = next ? clubById(next.homeId === g.myClub.id ? next.awayId : next.homeId) : null;
  const daysLeft = next ? Math.max(0, next.day - g.career.day) : 0;
  const isMatchday = daysLeft === 0 && !!next;
  // Rakibin gerçek lig verisi: son 5 maç formu ve lig sırası (yalnız oynanmış fikstürler)
  const oppScout = opponent ? opponentScout(g.fixtures, opponent.id, g.table[g.leagueOf[opponent.id]] ?? []) : null;
  const squadFitRate = Math.round(g.mySquad.filter((p) => p.injuredDays === 0 && p.suspendedMatches === 0).length / Math.max(1, g.mySquad.length) * 100);
  const wageRatio = (() => {
    const totalWageM = g.mySquad.reduce((x, p) => x + (p.wage ?? 0), 0) / 1000;
    const capM = g.myClub.wageBudget + (g.budget?.wbExtra ?? 0);
    return Math.min(100, Math.round((totalWageM / capM) * 100));
  })();
  const priority = g.inbox.find((m) => m.kind === 'kritik' && !m.read) ?? g.inbox.find((m) => !m.read);
  const tf = g.career.trainingFocus ?? { area: 'Teknik' as const, intensity: 'normal' as const, sinceDay: 1 };
  const tlvl = (g.career.clubFacilities ?? g.myClub.facilities).training;

  const Icon = ({ id, className }: { id: string; className?: string }) => <GameIcon id={id} className={className ?? 'w-4 h-4'} />;

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="px-4 pt-4 pb-6 space-y-3">
        {/* Dalga 1 (v0.5): İşsizlik — kovulma sonrası iş teklifleri en üstte bloklar */}
        {g.career.jobSearch && (() => {
          const js = g.career.jobSearch!;
          return (
            <Card accent="var(--c-danger)" className="m26-in !border-danger/60">
              <div className="text-[11px] text-danger uppercase tracking-wide font-bold">İşsizsin — {js.reason}</div>
              <div className="text-primary text-[14px] font-bold mt-1.5">Kariyer devam ediyor: {js.offers.length} kulüp teklif verdi</div>
              <div className="space-y-2 mt-2.5">
                {js.offers.map((cid) => {
                  const c = clubById(cid);
                  return (
                    <div key={cid} className="flex items-center gap-2.5 bg-surface rounded-xl px-3 py-2 border border-line">
                      <Crest club={c} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="text-primary text-[12.5px] font-bold truncate">{c.name}</div>
                        <div className="text-muted text-[10.5px]">{LEAGUES[c.league].short} · Güç {c.strength} · TB ₺{c.transferBudget}M</div>
                      </div>
                      <Btn variant="amber" className="!min-h-[38px] !px-3 !text-[12px]" onClick={() => { const r = g.acceptJob(cid); if (!r.ok) alert(r.reason ?? 'Teklif kabul edilemedi'); }}>İmzala</Btn>
                    </div>
                  );
                })}
              </div>
              <p className="text-muted text-[11px] mt-2">İmzayana dek kulübün maçları AI'ya devredilir — gün ilerletilebilir, dünya durmaz.</p>
            </Card>
          );
        })()}

        {/* Prototip §club-heading: arma + kulüp adı + tarih */}
        <div className="flex items-center gap-3 m26-in">
          <Crest club={g.myClub} size={39} />
          <div className="min-w-0">
            <h1 className="text-primary font-display font-bold text-[22px] tracking-tight leading-tight truncate">{g.myClub.name}</h1>
            <p className="text-muted text-[10.5px] mt-0.5">{dayToDate(g.career.day)} · Sezon {g.seasonNo} {LEAGUES[g.myLeague].short}</p>
          </div>
        </div>

        {/* 1. Günün Önceliği */}
        <Card accent={priority?.kind === 'kritik' ? 'var(--c-danger)' : 'var(--c-accent)'} className="m26-in">
          <div className="m26-overline">Günün Önceliği</div>
          {priority ? (
            <>
              <div className="text-primary font-bold text-[15px] mt-1.5">{priority.title}</div>
              <p className="text-secondary text-[12.5px] leading-snug mt-1 line-clamp-2">{priority.body}</p>
              <div className="flex gap-2 mt-3">
                <Btn variant="amber" className="flex-1 !min-h-touch !text-[13px]" onClick={() => go(priority.kind === 'transfer' || priority.kind === 'yonetim' ? 'club' : 'inbox')}>Şimdi İncele</Btn>
                <Btn variant="secondary" className="!min-h-touch !text-[13px] !px-3" onClick={() => g.setInbox((ms) => ms.map((m) => (m.id === priority.id ? { ...m, read: true } : m)))}>Sonra</Btn>
              </div>
            </>
          ) : (
            <div className="text-primary text-[14px] mt-1.5 py-1">Zorunlu karar yok — kulüp bugün ritminde. ✓</div>
          )}
        </Card>

        {/* Dalga 7: PWA kurulum daveti */}
        <InstallBanner />

        {/* Prototip §match-card: altın çentik + VS düzeni */}
        <div className="relative overflow-hidden bg-surface border border-line rounded-card p-3.5 m26-in" aria-label="Yaklaşan maç">
          <span className="absolute left-0 top-[17px] bottom-[17px] w-[3px] bg-amber rounded-r" />
          <div className="flex items-center justify-between">
            <span className="text-amber text-[12px] font-extrabold tracking-[0.08em] uppercase">Yaklaşan Maç</span>
            {next && (
              <span className={`text-[10px] font-bold border rounded-md px-1.5 py-0.5 ${isMatchday ? 'bg-amber/10 border-amber/40 text-amber' : 'bg-ok/10 border-ok/30 text-ok'}`}>
                {isMatchday ? 'Maç günü' : `${daysLeft} gün kaldı`}
              </span>
            )}
          </div>
          {next && opponent ? (
            <>
              <p className="text-center text-muted text-[10.5px] mt-2">{dayToDate(next.day)} · {LEAGUES[g.myLeague].name}</p>
              <div className="grid grid-cols-[1fr_38px_1fr] items-center mt-1.5">
                <div className="text-center">
                  <Crest club={clubById(next.homeId)} size={36} className="mx-auto" />
                  <div className="text-[11px] text-primary font-bold leading-tight mt-1 min-h-[28px]">{clubById(next.homeId).short}</div>
                </div>
                <div className="text-muted text-center text-[16px]">—</div>
                <div className="text-center">
                  <Crest club={clubById(next.awayId)} size={36} className="mx-auto" />
                  <div className="text-[11px] text-primary font-bold leading-tight mt-1 min-h-[28px]">{clubById(next.awayId).short}</div>
                </div>
              </div>
              <p className="text-center text-muted text-[10.5px] mt-1">{clubById(next.homeId).stadium} · {next.homeId === g.myClub.id ? 'Ev sahibi' : 'Deplasman'}</p>
              <div className="mt-2 flex items-center gap-1.5 justify-center flex-wrap">
                <Badge kind={oppScout && oppScout.form.length ? 'info' : 'muted'}>
                  Rakip lig formu: {oppScout && oppScout.form.length ? oppScout.form.map((r) => (r === 'W' ? 'G' : r === 'D' ? 'B' : 'M')).join('─') : '—'}
                </Badge>
                {oppScout && oppScout.rank !== null && <Badge kind="muted">Lig sırası: {oppScout.rank}</Badge>}
                <Badge kind="muted">Rakip güç: {opponent.strength}</Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn variant="secondary" className="flex-1 !min-h-[42px] !text-[12px]" onClick={() => go('matchPrep')}>Rakip Analizi</Btn>
                <Btn variant="amber" className="flex-1 !min-h-[42px] !text-[12px]" onClick={() => go('matchPrep')}>Maç Merkezine Git</Btn>
              </div>
            </>
          ) : (
            <div className="text-secondary text-[13px] py-2 mt-1">Planlanmış resmî maç yok.</div>
          )}
        </div>

        {/* Prototip §metrics: 2x2 — TB / sezon hedefi / maaş barı / kadro barı */}
        <div className="grid grid-cols-2 gap-2 m26-in" aria-label="Kulüp özeti">
          <button onClick={() => go('club')} className="text-left bg-surface border border-line rounded-card px-3 py-2.5 min-h-[64px]">
            <div className="text-muted text-[10px] mb-1">Transfer bütçesi</div>
            <div className="num text-primary font-extrabold text-[19px] leading-none">₺{(g.budget?.tb ?? g.myClub.transferBudget).toFixed(1)}<span className="text-muted text-[11px] font-normal"> M</span></div>
          </button>
          <button onClick={() => go('comps')} className="text-left bg-surface border border-line rounded-card px-3 py-2.5 min-h-[64px]">
            <div className="text-muted text-[10px] mb-1">Sezon hedefi</div>
            <div className="text-primary font-extrabold text-[17px] leading-tight mt-0.5">{g.myClub.boardGoal}</div>
          </button>
          <button onClick={() => go('club')} className="text-left bg-surface border border-line rounded-card px-3 py-2.5 min-h-[64px]">
            <div className="text-muted text-[10px] mb-1 flex items-center justify-between"><span>Maaş kullanımı</span></div>
            <div className="num text-primary font-extrabold text-[19px] leading-none">%{wageRatio}</div>
            <div className="h-[3px] bg-line rounded-full mt-2 overflow-hidden"><span className={`block h-full rounded-full ${wageRatio > 90 ? 'bg-warn' : 'bg-ok'}`} style={{ width: `${wageRatio}%` }} /></div>
          </button>
          <button onClick={() => go('squad')} className="text-left bg-surface border border-line rounded-card px-3 py-2.5 min-h-[64px]">
            <div className="text-muted text-[10px] mb-1">Kadro uygunluğu</div>
            <div className="num text-primary font-extrabold text-[19px] leading-none">%{squadFitRate}</div>
            <div className="h-[3px] bg-line rounded-full mt-2 overflow-hidden"><span className="block h-full bg-ok rounded-full" style={{ width: `${squadFitRate}%` }} /></div>
          </button>
        </div>

        {/* Dalga 7: Kadro üst sınırı uyarısı */}
        {(() => {
          const n = g.mySquad.length;
          if (n < 28) return null;
          const hard = n >= 30;
          return (
            <button onClick={() => go('market')} className="w-full text-left m26-in">
              <div className={`rounded-card border px-3.5 py-2.5 text-[12.5px] font-semibold ${hard ? 'bg-danger/15 border-danger/60 text-danger' : 'bg-warn/10 border-warn/50 text-warn'}`}>
                {hard ? '⛔ Kadro üst sınırına ulaşıldı (30/30).' : `⚠ Kadro doluyor (${n}/30).`} Yeni transfer için önce oyuncu sat ya da kirala →
              </div>
            </button>
          );
        })()}

        {/* Revir + cezalı şeritleri */}
        {(() => {
          const sus = g.mySquad.filter((p) => p.suspendedMatches > 0);
          if (!sus.length) return null;
          return (
            <Card className="m26-in !border-danger/50">
              <div className="m26-overline !text-danger">🟨 Cezalılar ({sus.length})</div>
              <div className="space-y-1 mt-1.5">
                {sus.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[12px]">
                    <span className="w-4 h-4 text-danger">■</span>
                    <span className="text-primary font-semibold flex-1">{p.name.split(' ').slice(-1)[0]}</span>
                    <span className="text-danger num font-bold">{Math.max(1, Math.round(p.suspendedMatches))} maç</span>
                  </div>
                ))}
                {sus.length > 4 && <div className="text-muted text-[11px]">+{sus.length - 4} diğer</div>}
              </div>
            </Card>
          );
        })()}
        {(() => {
          const inj = g.mySquad.filter((p) => p.injuredDays > 0);
          if (!inj.length) return null;
          return (
            <Card className="m26-in !border-warn/50">
              <div className="text-[12px] text-warn uppercase tracking-[0.08em] font-bold">Revir ({inj.length})</div>
              <div className="space-y-1 mt-1.5">
                {inj.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[12px]">
                    <span className="w-4 h-4 text-warn">•</span>
                    <span className="text-primary font-semibold flex-1">{p.name.split(' ').slice(-1)[0]}</span>
                    <span className="text-secondary text-[11px]">{p.injury?.name ?? 'Sakatlık'}</span>
                    <span className="text-warn num font-bold">{p.injury?.daysRemaining ?? p.injuredDays} gün</span>
                  </div>
                ))}
                {inj.length > 4 && <div className="text-muted text-[11px]">+{inj.length - 4} diğer</div>}
              </div>
            </Card>
          );
        })()}

        {/* Prototip §compact tap-cards: antrenman + manşet kısayolu */}
        {!g.career.jobSearch && (
          <button onClick={() => setTrainingOpen(true)} className="w-full text-left bg-surface border border-line rounded-card p-3 flex items-center gap-2.5 m26-in">
            <span className="w-9 h-9 rounded-lg border border-line bg-amber/5 flex items-center justify-center text-amber shrink-0"><Icon id="tactics" className="w-[18px] h-[18px]" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-primary text-[12.5px] font-bold">Haftalık antrenman</span>
              <span className="block text-muted text-[10.5px] mt-0.5">{tf.area} · {tf.intensity === 'hafif' ? 'Hafif' : tf.intensity === 'yogun' ? 'Yoğun' : 'Normal'} · Tesis {tlvl}/5</span>
            </span>
            <Icon id="settings" className="w-4 h-4 text-muted" />
          </button>
        )}
        <button type="button" onClick={() => onOpenWeekly ? onOpenWeekly() : go('newsroom')} data-testid="hub-weekly-paper"
          className="w-full min-h-[72px] text-left rounded-card border border-[#bd9a5c] overflow-hidden relative flex items-center gap-3 px-3 py-2.5"
          style={{ background: "linear-gradient(90deg,rgba(20,36,25,.97),rgba(20,36,25,.72)),url('/assets/transfer/stadium.webp') center/cover" }}>
          <span className="w-10 h-10 rounded-lg border border-[#cfb57f]/70 bg-[#e9ddc1] flex items-center justify-center text-[#4a3d29] shrink-0" aria-hidden="true"><span className="w-5 h-5"><Icon id="news" className="w-5 h-5" /></span></span>
          <span className="flex-1 min-w-0"><span className="block text-[#e1c992] text-[9px] font-black tracking-wider">YENİ SAYI · GÜN {g.career.day}</span><span className="block text-[#fff6df] text-[13px] font-bold">Haftanın Futbol Gazetesi</span><span className="block text-[#e1dccd] text-[10px]">Sonuçlar · transferler · form</span></span>
          <span className="text-[#f5d690] font-black" aria-hidden="true">→</span>
        </button>
        <button onClick={() => go('newsroom')} className="w-full text-left bg-surface border border-line rounded-card p-3 flex items-center gap-2.5 m26-in">
          <span className="w-9 h-9 rounded-lg border border-line bg-amber/5 flex items-center justify-center text-amber shrink-0"><Icon id="news" className="w-[18px] h-[18px]" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-primary text-[12.5px] font-bold">Manşetler · Saha Defteri</span>
            <span className="block text-muted text-[10.5px] mt-0.5">{g.matchReports?.[0] ? `Son teyitli maç: ${clubById(g.matchReports[0].homeId).short} ${g.matchReports[0].hg}–${g.matchReports[0].ag} ${clubById(g.matchReports[0].awayId).short}` : 'Maç manşetleri, lig nabzı ve haftanın 11’i'}</span>
          </span>
          <span className="text-[10px] font-bold bg-amber/10 border border-amber/40 text-amber rounded-md px-1.5 py-0.5 shrink-0">Aç →</span>
        </button>

        {/* Diğer Gelişmeler */}
        <Card className="m26-in">
          <div className="m26-overline mb-2">Diğer Gelişmeler</div>
          {[
            ['chart', 'Rakip raporu maç haftasında otomatik düşecek.'],
            ['club', g.career.pending.activeProject ? 'Aktif tesis projesi yürüyor — Kulüp ekranından izleyebilirsin.' : 'Yönetim tesis/stadyum proje talebine açık.'],
            ['market', `Piyasa ritmi Dengeli seçildi — sıradaki güncelleme ${6 - (g.career.day % 7)} gün sonra.`],
          ].map(([i, t]) => (
            <div key={t} className="flex items-start gap-2.5 py-1.5 text-[12.5px] text-secondary leading-snug">
              <Icon id={i as string} className="w-4 h-4 mt-0.5 text-muted" /><span>{t}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Prototip §training sheet: uzun ayar ana ekrandan panele taşındı */}
      <Sheet open={trainingOpen} onClose={() => setTrainingOpen(false)} title="Haftalık Antrenman">
        <div className="space-y-4 pb-2">
          <p className="text-muted text-[12px] leading-relaxed">Pazartesi sabahı işlenir: gençler (&lt;24) odak alanında hızlanır; yoğun tempo fitness bedeli getirir, tesis seviyesi verimi büyütür.</p>
          <div>
            <div className="text-[12px] font-bold text-primary mb-2">Antrenman odağı</div>
            <div className="flex gap-1.5 flex-wrap">
              {(['Teknik', 'Hücum', 'Defans', 'Fizik', 'Zekâ'] as const).map((a) => (
                <button key={a} onClick={() => g.setTrainingFocus({ ...tf, area: a, sinceDay: g.career.day })}
                  className={`px-3 min-h-[42px] rounded-lg text-[12px] font-bold border transition ${tf.area === a ? 'bg-amber text-base border-amber' : 'bg-surface text-secondary border-line'}`}>{a}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold text-primary mb-2">Yoğunluk</div>
            <div className="flex gap-1.5">
              {(['hafif', 'normal', 'yogun'] as const).map((iv) => (
                <button key={iv} onClick={() => g.setTrainingFocus({ ...tf, intensity: iv, sinceDay: g.career.day })}
                  className={`flex-1 min-h-[42px] rounded-lg text-[12px] font-bold border transition ${tf.intensity === iv ? 'bg-amber text-base border-amber' : 'bg-surface text-secondary border-line'}`}>
                  {iv === 'hafif' ? 'Hafif' : iv === 'normal' ? 'Normal' : 'Yoğun'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-muted text-[10.5px] leading-snug border-l-2 border-amber bg-amber/5 rounded px-3 py-2.5">Tesis: {tlvl}/5 — tesis yatırımı antrenman verimini büyütür (Kulüp › Tesisler).</p>
          <Btn variant="amber" className="w-full" onClick={() => setTrainingOpen(false)}>Özeti güncelle ✓</Btn>
        </div>
      </Sheet>
    </div>
  );
};