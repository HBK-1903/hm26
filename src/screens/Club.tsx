// HM26 — UI/UX §5.10 Kulüp Merkezi + §12 tesis/finans
import { GameIcon } from '../components/icons';
import React, { useState } from 'react';
import { useGame } from '../store/game';
import { Card, Badge, Btn, Sheet, useToast } from '../components/ui/kit';
import { StadiumArt } from '../components/assets/Stadium';
import { FACILITY_TIERS } from '../data/meta';
import { archiveSummary } from '../data/history';
import { clubById } from '../data/clubs';
import { academyIntakeExpired, academySigningFeeM, evaluateAcademySigning } from '../data/academy';
import { assessFfp, normalizeClubCulture, type CultureChoice } from '../data/culture';

type FacKind = 'training' | 'health' | 'academy' | 'analysis' | 'stadium';
const FAC_META: Record<FacKind, { icon: string; name: string; effect: string }> = {
  training: { icon: 'gym', name: 'Antrenman Tesisi', effect: 'Haftalık gelişim ve forma verimliliği' },
  health: { icon: 'medical', name: 'Sağlık Tesisi', effect: 'Sakatlık riski ve toparlanma süresi' },
  academy: { icon: 'sprout', name: 'Akademi', effect: '2–6 aday sayısı ve kalite dağılımı' },
  analysis: { icon: 'chart', name: 'Analiz Birimi', effect: 'Piyasa önerileri + rakip raporu kalitesi' },
  stadium: { icon: 'club', name: 'Stadyum', effect: 'Kapasite, maç günü geliri, konfor' },
};

export const ClubScreen: React.FC = () => {
  const g = useGame();
  const c = g.myClub;
  const facilities = g.career.clubFacilities ?? c.facilities;
  const [tab, setTab] = useState('genel');
  const [project, setProject] = useState<FacKind | null>(null);
  const [moveTb, setMoveTb] = useState(0); // Dalga 9: TB→maaş aktarım miktarı
  const { show: showToast, ToastView } = useToast();

  const wageUse = g.mySquad.reduce((x, p) => x + p.wage, 0) / 1000; // ₺M/ay
  const wbExtra = g.budget?.wbExtra ?? 0;            // Dalga 9: TB'den aktarılan aylık maaş payı
  const wageCap = c.wageBudget + wbExtra;            // efektif aylık maaş tavanı
  const wagePct = Math.min(99, Math.round((wageUse / wageCap) * 100));
  const budgetRequestId = `board-budget-request-${g.career.clubId}-${g.career.day}`;
  const budgetRequested = g.inbox.some((message) => message.id === budgetRequestId);
  const trust = g.career.boardConfidence ?? 70;
  const projectInfo = g.career.pending.activeProject;
  const culture = normalizeClubCulture(g.career.culture, g.career.seed, g.career.clubId, c.rivalIds ?? []);
  const seasonTransfers = g.transferLog.filter((entry) => entry.seasonNo === g.seasonNo);
  const transferSpend = seasonTransfers.filter((entry) => entry.kind === 'in').reduce((sum, entry) => sum + entry.fee, 0);
  const transferIncome = seasonTransfers.filter((entry) => entry.kind === 'out').reduce((sum, entry) => sum + entry.fee, 0);
  const netTransfer = transferSpend - transferIncome;
  const ffp = assessFfp({ payrollM: wageUse, wageCapM: wageCap, transferSpendM: transferSpend, transferIncomeM: transferIncome, baseBudgetM: c.transferBudget });

  return (
    <div className="h-full flex flex-col">
      <div className="relative h-32 shrink-0 overflow-hidden">
        <StadiumArt club={c} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-base to-transparent" />
        <div className="absolute bottom-2.5 left-4">
          <div className="text-primary font-display text-lg">Kulüp Merkezi</div>
          <div className="text-secondary text-[11.5px]">{c.stadium} · {c.capacity.toLocaleString('tr-TR')} kapasite · Est. {c.founded}</div>
        </div>
      </div>
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {([['genel', 'Genel'], ['finans', 'Finans'], ['kultur', 'Kültür'], ['tesis', 'Tesisler'], ['akademi', 'Akademi'], ['arsiv', 'Arşiv']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`shrink-0 min-h-touch px-3 rounded-xl text-[12px] font-bold border ${tab === v ? 'bg-amber text-base border-amber' : 'bg-surface text-secondary border-line'}`}>{l}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
        {tab === 'genel' && (
          <div className="space-y-2.5 m26-in">
            <Card>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[12px] text-muted uppercase tracking-[0.08em]">Yönetim Güveni</div>
                  <div className="num text-2xl font-bold text-ok mt-1">{trust}<span className="text-muted text-xs">/100</span></div>
                </div>
                <Badge kind="info">Sezon Hedefi: {c.boardGoal}</Badge>
              </div>
              <div className="h-2 bg-base rounded-full mt-3 overflow-hidden"><div className="h-full bg-ok rounded-full" style={{ width: `${trust}%` }} /></div>
              <p className="text-muted text-[11px] mt-2">Güven öncelikle lig hedefi, kupa, derbi ve form serisiyle değişir.</p>
            </Card>
            <div className="grid grid-cols-2 gap-2.5">
              <Card accent="var(--c-accent)"><div className="text-muted text-[12px] uppercase tracking-[0.08em]">Transfer Bütçesi</div><div className="num text-amber text-xl font-bold mt-1">₺{(g.budget?.tb ?? c.transferBudget).toFixed(1)}M</div></Card>
              <Card accent="var(--c-info)"><div className="text-muted text-[12px] uppercase tracking-[0.08em]">Maaş Bütçesi/ay</div><div className="num text-xl font-bold mt-1 text-info">₺{(c.wageBudget + (g.budget?.wbExtra ?? 0)).toFixed(2)}M</div></Card>
            </div>
            <Card>
              <div className="text-[11px] text-muted uppercase mb-1.5">Aktif Proje</div>
              {projectInfo ? (
                <div className="flex items-center justify-between">
                  <div><div className="text-primary font-bold text-[14px]">{projectInfo.fromTo}</div><div className="text-secondary text-[12px] mt-0.5">Kalan: {projectInfo.daysLeft} gün</div></div>
                  <Badge kind="warn">Sürüyor</Badge>
                </div>
              ) : (
                <div className="text-secondary text-[13px]">Aktif proje yok — Tesisler sekmesinden tek proje başlatabilirsin.</div>
              )}
            </Card>
          </div>
        )}

        {tab === 'finans' && (
          <div className="space-y-2.5 m26-in">
            <Card>
              <div className="flex justify-between text-[12.5px] mb-1.5"><span className="text-primary font-semibold">Maaş Kullanımı</span><span className={`num font-bold ${wagePct > 85 ? 'text-danger' : wagePct > 70 ? 'text-warn' : 'text-ok'}`}>%{wagePct}</span></div>
              <div className="h-2.5 bg-base rounded-full overflow-hidden"><div className={`h-full rounded-full ${wagePct > 85 ? 'bg-danger' : 'bg-ok'}`} style={{ width: `${wagePct}%` }} /></div>
              <div className="text-muted text-[11px] mt-1.5">Kullanılan: ₺{wageUse.toFixed(2)}M / ay · Bütçe: ₺{wageCap.toFixed(2)}M{g.budget?.wbExtra ? ' (+TB aktarımı)' : ''}</div>
            </Card>
            <Card className="!p-0 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">Gerçekleşen sezon hareketleri</div>
              <div className="px-4 py-1 text-[10.5px] text-muted border-b border-line/40">Yalnız kayıtlardaki gerçek kalemler; tahmini gelir kalemi gösterilmez.</div>
              {[
                ['Aylık maaş yükü', `−₺${wageUse.toFixed(2)}M`, 'var(--c-danger)', `${g.mySquad.length} futbolcu · tavan ₺${wageCap.toFixed(2)}M`],
                ['Transfer harcaması', `−₺${transferSpend.toFixed(2)}M`, 'var(--c-danger)', `${seasonTransfers.filter((e) => e.kind === 'in').length} oyuncu`],
                ['Transfer geliri', `+₺${transferIncome.toFixed(2)}M`, 'var(--c-ok)', `${seasonTransfers.filter((e) => e.kind === 'out').length} satış`],
                ['Net transfer harcaması', `${netTransfer >= 0 ? '−' : '+'}₺${Math.abs(transferSpend - transferIncome).toFixed(2)}M`, (transferSpend - transferIncome) > 0 ? 'var(--c-warn)' : 'var(--c-ok)', 'FFP hesabına giren kalem'],
                ['Kalan transfer bütçesi', `₺${(g.budget?.tb ?? c.transferBudget).toFixed(1)}M`, 'var(--c-special)', 'sezon içi kullanılabilir'],
              ].map(([k, v, col, sub]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 border-b border-line/40 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold truncate">{k}</div>
                    <div className="text-[10px] text-muted">{sub}</div>
                  </div>
                  <span className="num text-[13.5px] font-extrabold shrink-0" style={{ color: col as string }}>{v}</span>
                </div>
              ))}
            </Card>
            <Card>
              <div className="text-primary text-[13px] font-bold">Bütçe Aktarımı: Transfer → Maaş</div>
              <p className="text-secondary text-[12px] mt-1 leading-snug">₺1M transfer bedeli = <b className="text-amber">+₺0,05M/ay</b> maaş payı (20 ay vade dengesi). Aktarım tek yön; bankaya dönmez.</p>
              <div className="flex items-center gap-2 mt-2.5">
                <input type="range" min={0} max={Math.min(5, Math.max(0, (g.budget?.tb ?? 0) - 1))} step={0.1} value={moveTb}
                  onChange={(e) => setMoveTb(+e.target.value)} className="w-full accent-amber h-6" disabled={(g.budget?.tb ?? 0) <= 1} />
              </div>
              <div className="flex justify-between text-[11.5px] mt-1">
                <span className="text-primary font-semibold">−₺{moveTb.toFixed(1)}M TB</span>
                <span className="text-info font-bold">+₺{(moveTb * 0.05).toFixed(2)}M/ay maaş</span>
              </div>
              <Btn variant="amber" className="w-full mt-2 !text-[12.5px]" disabled={moveTb <= 0 || (g.budget?.tb ?? 0) < moveTb} onClick={() => {
                g.setBudget((b) => ({ tb: Math.round((b.tb - moveTb) * 10) / 10, wbExtra: Math.round(((b.wbExtra ?? 0) + moveTb * 0.05) * 1000) / 1000 }));
                g.setInbox((ms) => [...ms, { id: `fx-${g.career.day}-${Date.now() % 997}`, kind: 'yonetim', title: 'Bütçe aktarımı onaylandı', body: `₺${moveTb.toFixed(1)}M transfer bütçesinden aylık maaş payına +₺${(moveTb * 0.05).toFixed(2)}M aktarıldı (20 ay vade). Yeni maaş tavanı: ₺${(wageCap + moveTb * 0.05).toFixed(2)}M/ay.`, day: g.career.day, read: false }]);
                setMoveTb(0);
              }}>Aktarımı Onayla</Btn>
            </Card>
            <Card className="border-dashed">
              <div className="text-primary text-[13px] font-bold">Yönetimden ek bütçe talebi</div>
              <p className="text-secondary text-[12px] mt-1.5 leading-snug">Bu talep şu anda bütçeyi değiştirmez. Gönderdiğinde yönetimin ek kaynak açmadığı yanıtı gelen kutuna gelir.</p>
              <Btn variant="secondary" className="w-full mt-3 !text-[12.5px]" disabled={budgetRequested} onClick={() => g.setInbox((ms) => ms.some((message) => message.id === budgetRequestId) ? ms : [...ms, { id: budgetRequestId, kind: 'yonetim', title: 'Bütçe talebi yanıtlandı', body: `Aylık maaş kullanımı %${wagePct}. Yönetim şu anda ek bütçe açmıyor; mevcut bütçe değişmedi.`, day: g.career.day, read: false }])}>{budgetRequested ? 'Bugün Yanıtlandı' : 'Talep Gönder'}</Btn>
            </Card>
          </div>
        )}

        {tab === 'kultur' && (
          <div className="space-y-2.5 m26-in">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-primary text-[15px] font-bold">Kulüp kültürü</div><div className="text-secondary text-[12px] mt-1">Başkan {culture.chairmanName} · {({ patient: 'sabırlı', ambitious: 'iddialı', pragmatic: 'pragmatik', community: 'toplum odaklı' } as const)[culture.chairmanStyle]}</div></div>
                <Badge kind={ffp.status === 'clear' ? 'ok' : ffp.status === 'watch' ? 'warn' : 'danger'}>FFP · {ffp.status === 'clear' ? 'Uyumlu' : ffp.status === 'watch' ? 'İzlemede' : 'İhlal riski'}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {([
                  ['Taraftar güveni', culture.fanTrust, 'var(--c-accent)'],
                  ['Toplum bağı', culture.communityTrust, 'var(--c-info)'],
                  ['Disiplin', culture.discipline, 'var(--c-ok)'],
                  ['Tribün tansiyonu', culture.ultrasHeat, 'var(--c-danger)'],
                ] as const).map(([label, value, color]) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11.5px] mb-1"><span className="text-secondary">{label}</span><span className="num text-primary font-bold">{value}/100</span></div>
                    <div className="h-1.5 rounded-full bg-base overflow-hidden"><div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} /></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-xl bg-base p-2.5"><div className="text-muted text-[10px] uppercase">Maaş / tavan</div><div className="num text-primary text-[13px] font-bold mt-1">%{Math.round(ffp.payrollRatio * 100)}</div></div>
                <div className="rounded-xl bg-base p-2.5"><div className="text-muted text-[10px] uppercase">Net harcama / sezon</div><div className="num text-primary text-[13px] font-bold mt-1">₺{ffp.netSpendM.toFixed(2)}M <span className="text-muted font-normal">(%{Math.round(ffp.netSpendRatio * 100)})</span></div></div>
              </div>
              <p className="text-muted text-[10.5px] mt-2">FFP yalnız bu kariyerdeki kadro maaşlarını ve sezon içi transfer kayıtlarını kullanır.</p>
            </Card>

            {g.career.pendingCultureIssue ? (() => {
              const issue = g.career.pendingCultureIssue!;
              const options: { choice: CultureChoice; label: string; note: string; cost: number }[] = issue.kind === 'scandal'
                ? [{ choice: 'stand_by', label: 'Oyuncuların arkasında dur', note: 'Tribün desteği korunur; kamuoyu ve yönetim baskısı büyüyebilir.', cost: 0 }, { choice: 'apologize', label: 'Özür ve bağımsız disiplin planı', note: 'Toplum güveni ve disiplin toparlanır.', cost: 0.12 }]
                : issue.kind === 'discipline'
                  ? [{ choice: 'stand_by', label: 'Oyuncunun yanında dur', note: 'Taraftar desteği yükselir; disiplin baskısı sürer.', cost: 0 }, { choice: 'apologize', label: 'Özür ve disiplin planı', note: 'Toplum güveni ve disiplin artar.', cost: 0.08 }]
                  : issue.kind === 'community'
                  ? [{ choice: 'open_day', label: 'Akademi sahasını aç', note: 'Toplum ve taraftar bağı güçlenir.', cost: 0.12 }, { choice: 'defer', label: 'Etkinliği ertele', note: 'Bütçe korunur, topluluk güveni azalır.', cost: 0 }]
                  : issue.kind === 'ultras'
                    ? [{ choice: 'meet_ultras', label: 'Tribün temsilcileriyle görüş', note: 'Tansiyon düşer; güven toparlanır.', cost: 0.10 }, { choice: 'firm_statement', label: 'Sert açıklama yap', note: 'Yönetim kararlılığı artar; tribün tansiyonu yükselir.', cost: 0 }]
                    : [{ choice: 'audit', label: 'Bağımsız mali denetim', note: 'Uyum planı kayda geçer; yönetim güveni artar.', cost: 0.15 }, { choice: 'appeal', label: 'Kurula itiraz et', note: 'Taraftara güven mesajı; yönetim güveninde risk.', cost: 0 }];
              return <Card accent="var(--c-warn)">
                <div className="flex items-center justify-between gap-2"><div className="text-primary font-bold text-[14px]">{issue.headline}</div><Badge kind="warn">Karar bekliyor</Badge></div>
                <p className="text-secondary text-[12px] leading-relaxed mt-1.5">{issue.body}</p>
                <div className="mt-3 space-y-2">{options.map((option) => (
                  <div key={option.choice} className="rounded-xl border border-line bg-base/60 p-2.5">
                    <div className="text-primary text-[12.5px] font-bold">{option.label}</div><div className="text-muted text-[11px] mt-0.5">{option.note}{option.cost > 0 ? ` · ₺${option.cost.toFixed(2)}M` : ' · Ücretsiz'}</div>
                    <Btn variant="secondary" className="w-full mt-2 !min-h-[38px] !text-[12px]" disabled={g.budget.tb < option.cost} onClick={() => { const result = g.resolveCultureIssue(issue.id, option.choice); if (result.ok) showToast('Kulüp kültürü kararı uygulandı.', 'ok'); else showToast(result.reason ?? 'Karar uygulanamadı.', 'warn'); }}>{g.budget.tb < option.cost ? 'Bütçe yetersiz' : 'Bu kararı uygula'}</Btn>
                  </div>
                ))}</div>
              </Card>;
            })() : <Card className="border-dashed"><div className="text-primary font-bold text-[13px]">Bekleyen kulüp kararı yok</div><p className="text-secondary text-[12px] mt-1">Taraftar, toplum, disiplin ve mali uyum gelişmeleri kaydedildikçe burada karar seçenekleri açılır.</p></Card>}

            <Card>
              <div className="flex items-center justify-between"><div className="text-primary text-[13px] font-bold">Sezon onurları</div><Badge kind="info">{culture.honors.length}</Badge></div>
              {culture.honors.length ? <div className="mt-2 space-y-1.5">{[...culture.honors].reverse().slice(0, 8).map((honor) => <div key={honor.id} className="flex justify-between gap-2 rounded-lg bg-base px-2.5 py-2"><span className="text-primary text-[12px] font-semibold">✦ {honor.title}</span><span className="text-muted text-[10px] shrink-0">S{honor.seasonNo} · G{honor.earnedDay}</span></div>)}</div> : <p className="text-secondary text-[12px] mt-2">Henüz kulüp kültürü onuru kazanılmadı.</p>}
              {culture.nemesisClubId && <p className="text-muted text-[11px] mt-2">Son derbi rekabeti: <b className="text-amber">{clubById(culture.nemesisClubId).short}</b></p>}
              {(g.career.cultureHistory ?? []).length > 0 && <p className="text-muted text-[10.5px] mt-2">Karar arşivi: {g.career.cultureHistory!.length} kayıt</p>}
            </Card>
          </div>
        )}

        {tab === 'tesis' && (
          <div className="space-y-2.5 m26-in">
            {(Object.keys(FAC_META) as FacKind[]).map((k) => {
              const lvl = k === 'stadium' ? Math.min(4, Math.round(c.capacity / 10000) + 1) : facilities[k as keyof typeof facilities];
              const nextTier = lvl < 5 ? FACILITY_TIERS[lvl - 1] : null;
              const isActive = projectInfo?.kind === k;
              const anyActive = !!projectInfo;
              return (
                <Card key={k} accent={isActive ? 'var(--c-warn)' : undefined} className="!p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 inline-block text-secondary"><GameIcon id={FAC_META[k].icon} className="w-full h-full" /></span>
                      <div>
                        <div className="text-primary font-bold text-[14px]">{FAC_META[k].name}</div>
                        <div className="text-muted text-[11px] mt-0.5">{FAC_META[k].effect}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`num text-xl font-bold ${lvl >= 4 ? 'text-ok' : 'text-amber'}`}>{lvl}<span className="text-muted text-[11px]">/5</span></div>
                      {isActive && <Badge kind="warn">Sürüyor</Badge>}
                    </div>
                  </div>
                  {isActive && <div className="mt-2 text-warn text-[12px]">“{projectInfo!.fromTo}” — bitmesine {projectInfo!.daysLeft} gün.</div>}
                  {!isActive && nextTier && (
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-secondary text-[12px]">₺{(k === 'stadium' ? nextTier.cost * 1.5 : nextTier.cost).toFixed(1)}M · {k === 'stadium' ? Math.round(nextTier.days * 1.5) : nextTier.days} gün · <span className="text-muted">{nextTier.note}</span></div>
                      <Btn variant="secondary" className="!min-h-[38px] !px-3 !text-[12px]" disabled={anyActive} onClick={() => setProject(k)}>{anyActive ? 'Kilitli' : 'Proje'}</Btn>
                    </div>
                  )}
                  {!nextTier && <div className="text-ok text-[12px] mt-2">✓ Maksimum seviye</div>}
                  {anyActive && !isActive && nextTier && <div className="text-muted text-[10.5px] mt-1.5">Aynı anda yalnızca bir proje.</div>}
                </Card>
              );
            })}
          </div>
        )}

        {tab === 'akademi' && (
          <div className="space-y-2.5 m26-in">
            <Card>
              <div className="flex justify-between"><span className="text-primary font-bold">Akademi Seviyesi</span><span className="num text-amber font-bold text-lg">{facilities.academy}/5</span></div>
              <p className="text-secondary text-[12px] mt-2 leading-relaxed">Her sezon günü 8'de <b>2–6 genç</b> belirli bir kariyer seed’iyle üretilir; tesis seviyesi sayıyı ve potansiyel tavanını yükseltir. Sözleşme penceresi 10 gün; kayıt bedeli transfer bütçesinden, maaş aylık ücret tavanından karşılanır.</p>
            </Card>
            {/* Dalga 1 (v0.5): Akademi günü — aday listesi + sözleşme/pass kararı */}
            {(() => {
              const intake = g.career.academyIntake;
              if (intake && intake.candidates.length) {
                const decided = intake.signed.length + intake.passed.length;
                return (
                  <Card>
                    <div className="flex items-center justify-between">
                      <div className="text-primary text-[13px] font-bold">Akademi sınıfı · Gün {intake.day}</div>
                      <div className="flex items-center gap-1.5"><Badge kind={decided === intake.candidates.length ? 'ok' : 'warn'}>{decided}/{intake.candidates.length}</Badge><Badge kind={academyIntakeExpired(intake, g.career.day) ? 'danger' : 'info'}>{academyIntakeExpired(intake, g.career.day) ? 'Kapandı' : `${Math.max(0, (intake.expiresDay ?? intake.day + 10) - g.career.day)}g kaldı`}</Badge></div>
                    </div>
                    <div className="mt-2.5 space-y-2">
                      {intake.candidates.map((p) => {
                        const signed = intake.signed.includes(p.id);
                        const passed = intake.passed.includes(p.id);
                        const expired = academyIntakeExpired(intake, g.career.day);
                        const level = intake.academyLevel ?? facilities.academy;
                        const decision = evaluateAcademySigning({ player: p, academyLevel: level, transferBudgetM: g.budget.tb, currentMonthlyWage: wageUse * 1000, monthlyWageCap: wageCap * 1000, rosterSize: g.mySquad.length });
                        const fee = intake.signingFees?.[p.id] ?? academySigningFeeM(p, level);
                        return (
                          <div key={p.id} className={`rounded-xl border px-3 py-2.5 ${signed ? 'border-ok/40 bg-ok/5' : passed ? 'border-line opacity-55' : 'border-line bg-surface'}`}>
                            <div className="flex items-center justify-between gap-2 text-[12.5px]">
                              <span className="text-primary font-semibold truncate">{p.name} <span className="text-muted">({p.age}) · {p.group}</span></span>
                              <span className="flex gap-1 shrink-0"><Badge kind="info">GEN {p.ratings.gen}</Badge><Badge kind="ok">POT {p.potential}</Badge></span>
                            </div>
                            <div className="text-secondary text-[12px] mt-1">Potansiyel farkı +{p.potential - p.ratings.gen} · Maaş ₺{p.wage}B/ay · Kayıt ₺{fee.toFixed(2)}M</div>
                            {!signed && !passed && !expired && (
                              <div className="mt-2 space-y-1.5">
                                <div className="flex gap-2">
                                  <Btn variant="amber" disabled={!decision.ok} className="flex-1 !text-[12px]" onClick={() => { const result = g.signAcademyCandidate(p.id); if (result.ok) showToast(`${p.name} imzalandı · ₺${fee.toFixed(2)}M kayıt bedeli.`, 'ok'); else showToast(result.reason ?? 'Sözleşme başarısız.', 'warn'); }}>İmzala · ₺{fee.toFixed(2)}M</Btn>
                                  <Btn variant="secondary" className="!text-[12px] !px-3" onClick={() => g.passAcademyCandidate(p.id)}>Pas geç</Btn>
                                </div>
                                {!decision.ok && <p className="text-danger text-[11.5px]" role="status">{decision.reason}</p>}
                              </div>
                            )}
                            {signed && <div className="text-ok text-[12px] mt-1.5 font-semibold">Kadroya katıldı · 4 yıl · kayıt bedeli ₺{fee.toFixed(2)}M</div>}
                            {passed && <div className="text-muted text-[12px] mt-1.5">Geçildi</div>}
                            {!signed && !passed && expired && <div className="text-danger text-[12px] mt-1.5">Teklif süresi doldu — aday başka kulübe yöneldi.</div>}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-muted text-[12px] mt-2.5 leading-relaxed">Kayıt bedeli transfer bütçesinden, maaş kulübün aylık ücret tavanından düşer. Kadro limiti 30; imzalanan genç 4 yıllık kontrat ve transfer geçmişiyle kaydedilir. Kararsız adayların penceresi 10 günde kapanır.</p>
                  </Card>
                );
              }
              return (
                <Card className="border-dashed">
                  <div className="text-primary text-[13px] font-bold">Bir sonraki akademi günü</div>
                  <p className="text-secondary text-[12px] mt-2 leading-snug">Temmuz'un 2. Pazartesi (sezon günü 8). Akademi seviyesi {facilities.academy}/5 → <b>{1 + facilities.academy} aday</b> bekleniyor.</p>
                  <div className="mt-2.5 space-y-2">
                    {g.mySquad.filter((p) => p.age <= 20).slice(0, 4).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[12.5px]">
                        <span className="text-primary font-semibold">{p.name} <span className="text-muted">({p.age})</span></span>
                        <Badge kind="ok">Pot: {p.potential}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })()}
          </div>
        )}

        {tab === 'arsiv' && (
          <div className="space-y-2.5 m26-in">
            {/* Sistem F: Kupa Müzesi */}
            <Card>
              <div className="text-[12px] text-muted uppercase tracking-[0.08em]">Kupa Müzesi (bu kariyer)</div>
              {(() => { const trophies = g.career.trophyCabinet ?? [];
                if (!trophies.length) return <p className="text-secondary text-[12.5px] mt-2">Henüz gümüş yok — ilk kupa hedefin kartında yanıp sönüyor.</p>;
                return (
                  <div className="flex gap-2 flex-wrap mt-2.5">
                    {trophies.map((t, i) => (
                      <div key={i} className={`px-3 py-2 rounded-xl border text-center min-w-[110px] ${t.type === 'lig' ? 'border-ok/60 bg-ok/10' : t.type === 'kupa' ? 'border-accent/60 bg-accent/10' : 'border-info/60 bg-info/10'}`}>
                        <div className="w-6 h-6 mx-auto mb-1 text-accent"><GameIcon id={('comps') as string} className="w-full h-full" /></div>
                        <div className="text-primary text-[11px] font-bold">{t.season}</div>
                        <div className="text-secondary text-[10px]">{t.title}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>
            {/* Sistem F: Teknik Direktör istatistikleri */}
            <Card>
              <div className="text-[12px] text-muted uppercase tracking-[0.08em]">Teknik Direktör Karnesi</div>
              {(() => {
                const meId = g.career.clubId;
                const mine = [
                  ...g.fixtures.filter((f) => f.played && (f.homeId === meId || f.awayId === meId)),
                  ...g.friendlies.filter((f) => f.played && (f.homeId === meId || f.awayId === meId)),
                ];
                const W = mine.filter((f) => (f.homeId === g.myClub.id ? f.hg! > f.ag! : f.ag! > f.hg!)).length;
                const D = mine.filter((f) => f.hg === f.ag).length;
                const L = mine.length - W - D;
                const winPct = mine.length ? Math.round(W / mine.length * 100) : 0;
                const gf = mine.reduce((x, f) => x + (f.homeId === g.myClub.id ? f.hg! : f.ag!), 0);
                const ga = mine.reduce((x, f) => x + (f.homeId === g.myClub.id ? f.ag! : f.hg!), 0);
                const spent = g.transferLog.filter((t) => t.kind === 'in').reduce((x, t) => x + t.fee, 0);
                const earned = g.transferLog.filter((t) => t.kind === 'out').reduce((x, t) => x + t.fee, 0);
                return (
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                    {[['Maç', mine.length], ['Galibiyet %', winPct], ['G / B / M', `${W}–${D}–${L}`], ['Atılan / Yenilen', `${gf} / ${ga}`],
                      ['Transfer harcaması', `₺${spent.toFixed(1)}M`], ['Satış geliri', `₺${earned.toFixed(1)}M`],
                      ['Sezon', `${g.seasonNo}`], ['Sırada gün', g.career.day]]
                      .map(([k, v]) => (
                        <div key={String(k)} className="bg-base/70 rounded-lg p-2.5">
                          <div className="text-muted text-[10px] uppercase tracking-wide">{k}</div>
                          <div className="num text-primary font-bold text-[14px] mt-0.5">{String(v)}</div>
                        </div>
                      ))}
                  </div>
                );
              })()}
              {(() => {
                const meId = g.career.clubId;
                const mine = [
                  ...g.fixtures.filter((f) => f.played && (f.homeId === meId || f.awayId === meId)),
                  ...g.friendlies.filter((f) => f.played && (f.homeId === meId || f.awayId === meId)),
                ];
                const bigWin = mine.map((f) => ({ f, d: Math.abs((f.hg ?? 0) - (f.ag ?? 0)) })).sort((a, b) => b.d - a.d)[0];
                const won = bigWin && ((bigWin.f.homeId === g.myClub.id && bigWin.f.hg! > bigWin.f.ag!) || (bigWin.f.awayId === g.myClub.id && bigWin.f.ag! > bigWin.f.hg!));
                if (!bigWin || !won) return null;
                return <p className="text-secondary text-[11.5px] mt-2.5">En farklı galibiyet: <b className="text-ok">{clubById(bigWin.f.homeId).short} {bigWin.f.hg}–{bigWin.f.ag} {clubById(bigWin.f.awayId).short}</b></p>;
              })()}
            </Card>
            <Card><div className="text-[12px] text-muted uppercase tracking-[0.08em]">Kuruluş Hikâyesi</div><p className="text-primary/95 text-[13px] leading-snug mt-2">{c.story} Kulüp {c.founded} yılında {c.city} sokaklarında kuruldu; {c.stadium} bugün kalbin atışı.</p></Card>
            {/* Aşama 4: kulüp arşivi — seed'li gerçekçi tarih tablosu (1980+) */}
            {(() => { const arc = archiveSummary(c);
              return (
                <>
                  <Card>
                    <div className="text-[11px] text-muted uppercase mb-2">Tarihte Ski Müdiri</div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      {[['Şampiyonluk', arc.titles], ['Yükselme', arc.promotions], ['Düşüş', arc.relegations]].map(([k, v]) => (
                        <div key={k as string} className="bg-base rounded-xl p-2">
                          <div className="num text-amber font-bold text-[16px]">{v}</div>
                          <div className="text-muted text-[9.5px] uppercase">{k}</div>
                        </div>
                      ))}
                    </div>
                    {arc.longestRun !== '—' && <p className="text-amber/90 text-[11.5px] mt-2 italic">✦ {arc.longestRun}</p>}
                    {arc.bestYear && <p className="text-secondary text-[11.5px] mt-1.5">En parlak sezon: <b className="text-primary">{arc.bestYear.year}</b> — {arc.bestYear.pts}p, {arc.bestYear.rank}. sıra</p>}
                    {c.derby && <p className="text-muted text-[11.5px] mt-2">Derbi/rekabet: <b className="text-amber">{c.derby}</b></p>}
                  </Card>
                  <Card>
                    <div className="text-[11px] text-muted uppercase mb-2">Arşiv Tabloları (1980 – 2025)</div>
                    <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1">
                      {arc.rows.map((r) => (
                        <div key={r.year} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11.5px] ${r.rank === 1 ? 'bg-amber/10 border border-amber/30' : 'bg-base/60'}`}>
                          <span className="text-secondary num w-10">{r.year}</span>
                          <span className="text-primary font-semibold flex-1">{r.rank}. · {r.pts}p {r.note && <span className="text-muted ml-1">{r.note}</span>}</span>
                          <span className="text-muted text-[10px]">{r.league === 'zirve' ? 'Zv' : r.league === 'gecit' ? 'Gc' : 'Kö'}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              ); })()}
          </div>
        )}
      </div>

      <Sheet open={!!project} onClose={() => setProject(null)} title={`${project ? FAC_META[project].name : ''} Proje Onayı`}>
        {project && (() => {
          const lvl = project === 'stadium' ? Math.min(4, Math.round(c.capacity / 10000) + 1) : facilities[project as keyof typeof facilities];
          const t = FACILITY_TIERS[lvl - 1];
          const stadium = project === 'stadium';
          const cost = stadium ? t.cost * 1.5 : t.cost;
          const days = stadium ? Math.round(t.days * 1.5) : t.days;
          return (
            <div className="m26-in">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-base rounded-xl p-3 text-center"><div className="text-muted text-[10px] uppercase">Maliyet</div><div className="num text-amber text-lg font-bold">₺{cost.toFixed(1)}M</div></div>
                <div className="bg-base rounded-xl p-3 text-center"><div className="text-muted text-[10px] uppercase">Süre</div><div className="num text-lg font-bold text-primary">{days} gün</div></div>
              </div>
              <div className="text-secondary text-[12.5px] leading-snug mb-3">
                <b className="text-primary">Somut etki:</b> {FAC_META[project].effect}. {lvl}→{lvl + 1} geçişi “{t.note}” getirir.
                {project === 'health' && lvl === 3 && <div className="mt-2 text-info text-[12px]">Örnek şeffaf etki: sakatlık dönüşü %10 hızlanır, ağır sakatlık riski %4 düşer, yoğun antrenman sonrası toparlanma %6 hızlanır.</div>}
              </div>
              <div className={`flex items-center gap-2 text-[12px] mb-4 ${c.transferBudget >= cost ? 'text-ok' : 'text-danger'}`}>
                {g.budget.tb >= cost ? `✓ Bütçe yeterli (kalan ₺${(g.budget.tb - cost).toFixed(1)}M)` : '✕ Transfer bütçesi yetersiz — yönetim talebi gerekebilir.'}
              </div>
              <Btn variant="amber" className="w-full" disabled={g.budget.tb < cost} onClick={() => {
                // P1 (SPEC Böl.I/3): maliyet DİNAMİK bütçeden kesilir
                g.setBudget((b) => ({ tb: Math.round((b.tb - cost) * 10) / 10 }));
                g.setCareer((cc) => ({ ...cc, pending: { ...cc.pending, activeProject: { kind: project, daysLeft: days, fromTo: `${FAC_META[project].name} ${lvl}→${lvl + 1}` } } }));
                g.setInbox((ms) => [{ id: `prj-${g.career.day}-${project}`, kind: 'yonetim', title: `${FAC_META[project].name} yatırımı başladı`, body: `Seviye ${lvl}→${lvl + 1}. Maliyet: ₺${cost.toFixed(1)}M kasadan kesildi. Süre: ${days} gün.`, day: g.career.day, read: false } as never, ...ms]);
                g.setInbox((ms) => [...ms, { id: `prj-${Date.now()}`, kind: 'yonetim', title: 'Proje başlatıldı', body: `${FAC_META[project].name} ${lvl}→${lvl + 1}: ₺${cost.toFixed(1)}M, ${days} gün. Takvim işlendi.`, day: g.career.day, read: false }]);
                setProject(null);
              }}>Başlatmayı Onayla</Btn>
            </div>
          );
        })()}
      </Sheet>
    </div>
  );
};

