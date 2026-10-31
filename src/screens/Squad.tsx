// HM26 — UI/UX §5.6 Kadro + §5.7 Hızlı/Tam Profil
import React, { useMemo, useState } from 'react';
import { Player } from '../types';
import { useGame } from '../store/game';
import { Card, Badge, Sheet, Btn, RatingChip, useToast, useFocusTrap } from '../components/ui/kit';
import { GameIcon, ICONS } from '../components/icons';
import { PlayerPortrait } from '../components/assets/Portrait';
import { ComparisonDesk } from '../components/players/ComparisonDesk';
import { autoLineup, FORMATION_SLOTS } from '../engine/profiles';
import { engineToBoard } from '../engine/lineupOrder';
import { Crest } from '../components/assets/Crest';
import { clubById } from '../data/clubs';
import { fitnessBreakdown, formTrend, recentRatings, rotationAdvice, type FormTrend } from '../engine/squadInsights';
import { playerMatchLog, summarizePlayerLog, ratingTrend } from '../engine/playerInsights';
import { seasonRatings } from '../engine/seasonRatings';
import { RatingSparkline } from '../components/ui/charts';
import { COMP_LABEL } from '../data/newsroom';

const G_LABEL: Record<string, string> = { GK: 'Kaleci', CB: 'Stoper', FB: 'Bek', WB: 'Kanat Bek', DM: 'D.O. Saha', CM: 'M. Orta Saha', AM: 'H. Orta Saha', WG: 'Kanat', ST: 'Santrfor' };
const G_GROUP: Record<string, string> = { GK: 'GK', CB: 'DF', FB: 'DF', WB: 'DF', DM: 'MF', CM: 'MF', AM: 'MF', WG: 'FW', ST: 'FW' };

const FORM_TIER = (f: number) => (f >= 85 ? ['Çok İyi', 'ok'] : f >= 65 ? ['İyi', 'info'] : f >= 50 ? ['Orta', 'warn'] : ['Zayıf', 'danger']) as [string, 'ok' | 'info' | 'warn' | 'danger'];

export const SquadScreen: React.FC<{ goXI: (p: Player) => void }> = ({ goXI }) => { // v0.9.7: zorunlu — 'İlk 11'e Al' her zaman yuva atama akışını başlatır
  const g = useGame();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('gen');
  const [search, setSearch] = useState('');
  // The desk is intentionally collapsed on entry so the squad remains usable on small screens.
  const [rotationOpen, setRotationOpen] = useState(false);
  const [quick, setQuick] = useState<Player | null>(null);
  const [compare, setCompare] = useState<Player | 'empty' | null>(null);
  const [mentorSel, setMentorSel] = useState('');
  const [full, setFull] = useState<Player | null>(null);
  const fullTrapRef = useFocusTrap<HTMLDivElement>(!!full);
  const { show, ToastView } = useToast();
  const ratings = useMemo(() => seasonRatings(g.playerStats ?? {}, g.matchReports ?? [], g.seasonNo), [g.playerStats, g.matchReports, g.seasonNo]);

  const list = useMemo(() => {
    let arr = [...g.mySquad];
    if (filter !== 'all') arr = arr.filter((p) => G_GROUP[p.group] === filter);
    const q = search.trim().toLocaleLowerCase('tr');
    if (q) arr = arr.filter((p) => p.name.toLocaleLowerCase('tr').includes(q));
    arr.sort((a, b) => (sort === 'gen' ? b.ratings.gen - a.ratings.gen : sort === 'age' ? a.age - b.age : sort === 'form' ? b.form - a.form : b.ratings.gen - a.ratings.gen));
    return arr;
  }, [g.mySquad, filter, sort, search]);

  const avgGen = Math.round(g.mySquad.reduce((x, p) => x + p.ratings.gen, 0) / Math.max(1, g.mySquad.length));
  const riskCount = g.mySquad.filter((p) => p.fitness < 60 || p.injuredDays > 0 || p.suspendedMatches > 0).length;
  // Jr-09/QA: Ana Plan'ın aktif ilk 11 + yedek kimlikleri (kadro kartında XI / YDK rozeti)
  const plan0 = g.tactics[0];
  const xiAuto = useMemo(() => autoLineup(g.mySquad, plan0.formation, undefined, new Set(g.riskPlayIds ?? [])), [g.mySquad, plan0.formation, g.riskPlayIds]);
  const xiAutoIds = useMemo(() => xiAuto.slots.map((slot) => slot.player.id), [xiAuto]);
  const xiIds = useMemo(() => new Set(((plan0.customLineup && plan0.customLineup.length === 11 ? plan0.customLineup : xiAutoIds).filter(Boolean) as string[])), [plan0.customLineup, xiAutoIds]);
  const benchIds = useMemo(() => new Set(plan0.customBench?.length ? plan0.customBench : g.mySquad.filter((p) => !xiIds.has(p.id)).sort((a, b) => b.ratings.gen - a.ratings.gen).slice(0, 6).map((p) => p.id)), [plan0.customBench, g.mySquad, xiIds]);
  // Dalga 3: kadro içgörüleri — tamamen mevcut veri/maç arşivinden türetilir (yeni şema yok)
  const breakdown = useMemo(() => fitnessBreakdown(g.mySquad), [g.mySquad]);
  const xiSlots = useMemo(() => {
    if (!plan0.customLineup || plan0.customLineup.length !== 11) {
      return xiAuto.slots.map((slot) => ({ playerId: slot.player.id, slotGroup: slot.slotGroup }));
    }
    const boardGroups = engineToBoard(plan0.formation, FORMATION_SLOTS[plan0.formation]);
    // Preserve original board indices even when a manual lineup contains empty slots.
    return plan0.customLineup.flatMap((id, i) => id ? [{ playerId: id, slotGroup: boardGroups[i] ?? 'CM' }] : []);
  }, [plan0.customLineup, plan0.formation, xiAuto]);
  const advice = useMemo(() => rotationAdvice({ squad: g.mySquad, xi: xiSlots, reports: g.matchReports ?? [] }), [g.mySquad, xiSlots, g.matchReports]);
  const trendById = useMemo(() => {
    const m = new Map<string, FormTrend>();
    for (const p of g.mySquad) m.set(p.id, formTrend(recentRatings(p.id, g.matchReports ?? [])));
    return m;
  }, [g.mySquad, g.matchReports]);
  const squadById = useMemo(() => new Map(g.mySquad.map((p) => [p.id, p])), [g.mySquad]);
  // Dalga 6: rol sıralaması (genel güç azalan) — dakika memnuniyeti için
  const rankById = useMemo(() => {
    const m = new Map<string, number>();
    [...g.mySquad].sort((a, b) => b.ratings.gen - a.ratings.gen).forEach((p, i) => m.set(p.id, i));
    return m;
  }, [g.mySquad]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0"><h1 className="text-primary font-bold text-[22px] tracking-tight">Kadro</h1>
            <p className="text-muted text-[11px] mt-0.5">{g.myClub.name} · Oyuncularını tanı</p></div>
          <button type="button" onClick={() => setCompare('empty')} className="shrink-0 min-h-[44px] flex items-center gap-1.5 rounded-xl border border-amber/35 bg-amber/5 px-3 text-amber text-[11px] font-bold"><GameIcon id="market" className="w-4 h-4" />Karşılaştır</button>
        </div>
        <div className="grid grid-cols-3 bg-surface border border-line rounded-xl py-2.5 mb-2">
          <div className="text-center border-r border-line/60"><div className="num text-primary font-extrabold text-[18px]">{g.mySquad.length}</div><div className="text-muted text-[9px] mt-0.5">OYUNCU</div></div>
          <div className="text-center border-r border-line/60"><div className="num text-amber font-extrabold text-[18px]">{avgGen}</div><div className="text-muted text-[9px] mt-0.5">ORT. GENEL</div></div>
          <div className="text-center"><div className={`num font-extrabold text-[18px] ${riskCount ? 'text-warn' : 'text-ok'}`}>{riskCount}</div><div className="text-muted text-[9px] mt-0.5">RİSK</div></div>
        </div>
        {/* Dalga 3: kondisyon dağılımı bandı */}
        <div className="mb-3" data-testid="fitness-breakdown">
          <div className="flex h-2 rounded-full overflow-hidden bg-base border border-line/60">
            {breakdown.total > 0 && (
              <>
                <div style={{ width: `${(breakdown.green / breakdown.total) * 100}%`, background: '#4ade80' }} data-fit-seg="green" />
                <div style={{ width: `${(breakdown.amber / breakdown.total) * 100}%`, background: '#f3c64e' }} data-fit-seg="amber" />
                <div style={{ width: `${(breakdown.red / breakdown.total) * 100}%`, background: '#ef4444' }} data-fit-seg="red" />
              </>
            )}
          </div>
          <div className="flex justify-between mt-1 text-[9.5px] font-bold">
            <span className="text-ok">● Formda {breakdown.green}</span>
            <span className="text-amber">● Yorgun {breakdown.amber}</span>
            <span className="text-danger">● Riskli {breakdown.red}</span>
          </div>
        </div>
        {/* Dalga 3: rotasyon masası — yalnız gerçek sinyaller; veri yoksa sakin durum metni */}
        <div className="mb-3 rounded-xl border border-line bg-surface overflow-hidden" data-testid="rotation-desk">
          <button type="button" onClick={() => setRotationOpen((open) => !open)} aria-expanded={rotationOpen} aria-controls="rotation-desk-content"
            className="w-full min-h-touch px-3 flex items-center justify-between gap-2 text-left">
            <span className="text-[10.5px] font-extrabold tracking-[0.08em] text-primary">ROTASYON MASASI</span>
            <span className="ml-auto text-[10.5px] text-secondary">{advice.length ? `${advice.length} öneri` : 'Kadro hazır'}</span>
            <span aria-hidden="true" className="text-amber text-lg leading-none">{rotationOpen ? '−' : '+'}</span>
          </button>
          <div id="rotation-desk-content" hidden={!rotationOpen} className="max-h-40 overflow-y-auto">
            {advice.length === 0 ? (
              <p className="px-3 pb-2.5 text-[11px] text-muted leading-snug">Tüm kadro hazır — sakatlık, ceza veya kondisyon uyarısı yok.</p>
            ) : (
              advice.slice(0, 5).map((a) => (
                <button key={`${a.kind}-${a.playerId}`} onClick={() => { const pl = squadById.get(a.playerId); if (pl) setQuick(pl); }}
                  data-advice-kind={a.kind}
                  className="w-full text-left flex items-start gap-2 px-3 py-2 border-t border-line/50 min-h-[44px] active:bg-elevated">
                  <span className="text-[13px] leading-5 shrink-0">{a.kind === 'injury' ? '🚑' : a.kind === 'rest' ? '🔄' : '🔥'}</span>
                  <span className="text-[11px] leading-snug text-secondary flex-1">{a.reason}</span>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-2" aria-label="Mevki filtresi">
          {([['all', 'Tümü'], ['GK', 'Kaleci'], ['DF', 'Savunma'], ['MF', 'Orta'], ['FW', 'Hücum']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`shrink-0 min-h-[44px] px-3 rounded-lg text-[11px] font-bold border ${filter === v ? 'text-amber border-amber/60 bg-amber/10' : 'text-muted border-line bg-surface'}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-surface border border-line rounded-lg px-3 mb-2">
          <span className="w-4 h-4 text-muted inline-block shrink-0">{(() => { const I = ICONS.search; return I ? <I /> : null; })()}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Oyuncu ara" aria-label="Kadroda oyuncu ara"
            className="flex-1 bg-transparent min-h-[42px] text-primary text-[12.5px] focus:outline-none placeholder:text-muted" />
        </div>
        <div className="flex items-center justify-between px-0.5">
          <span className="text-muted text-[9px] tracking-[0.08em] font-extrabold">{list.length} OYUNCU</span>
          <button onClick={() => setSort(sort === 'gen' ? 'form' : sort === 'form' ? 'age' : 'gen')} className="text-amber text-[10.5px] font-bold min-h-[44px]">
            {sort === 'gen' ? 'Genel ↓' : sort === 'form' ? 'Form ↓' : 'Yaş ↑'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 space-y-2">
        {list.length === 0 && (
          <div className="text-muted text-center py-8 border border-dashed border-line rounded-xl text-[12px] leading-relaxed">Bu filtrede oyuncu bulunamadı.</div>
        )}
        {list.map((p) => {
          const [formTxt, formKind] = FORM_TIER(p.form);
          const warnTxt = p.injuredDays > 0 ? (p.injury ? `${p.injury.name.split(' ').slice(0, 2).join(' ')} · ${p.injury.daysRemaining}g` : 'Sakat') : p.suspendedMatches > 0 ? 'Cezalı' : p.fitness < 60 ? 'Kondisyon düşük' : null;
          const ms = g.minuteState(p.id, rankById.get(p.id) ?? 20, p.age);
          const formCls = { ok: 'text-ok', info: 'text-info', warn: 'text-warn', danger: 'text-danger' }[formKind];
          const trend = trendById.get(p.id); // Dalga 3: yalnız ≥4 gerçek maç varsa ok çıkar
          return (
            <button key={p.id} onClick={() => setQuick(p)} className="w-full text-left flex items-center gap-2.5 bg-surface border border-line rounded-xl p-2.5 min-h-[68px]">
              <span className="w-[36px] h-[39px] rounded-lg overflow-hidden border border-line/60 bg-elevated shrink-0"><PlayerPortrait player={p} size={36} /></span>
              <span className="flex-1 min-w-0">
                <span className="text-primary text-[12.5px] font-bold leading-tight truncate block">{p.name}{p.important && <span className="text-amber text-[10px]" title="Önemli oyuncu"> ★</span>}</span>
                <span className="text-muted text-[10px] leading-tight truncate block mt-0.5">{G_LABEL[p.group]} · {p.age} yaş{p.foreign ? ' · Yabancı' : ''}</span>
                <span className="block mt-0.5 text-[9.5px] leading-tight">
                  <span className={formCls}>Form: {formTxt}</span>
                  {trend === 'up' && <span className="text-ok font-bold" title="Son maçlarda yükselişte"> ▲</span>}
                  {trend === 'down' && <span className="text-danger font-bold" title="Son maçlarda düşüşte"> ▼</span>}
                  {trend === 'flat' && <span className="text-muted font-bold" title="Son maçlarda yatay seyir"> →</span>}
                  {warnTxt && <span className={warnTxt === 'Kondisyon düşük' ? 'text-warn' : 'text-danger'}> · {warnTxt}</span>}
                </span>
                <span className="flex gap-1 mt-1 flex-wrap">
                  {xiIds.has(p.id)
                    ? <span className="text-[9px] text-ok border border-ok/50 rounded px-1 py-px font-bold">XI</span>
                    : benchIds.has(p.id) && <span className="text-[9px] text-info border border-info/50 rounded px-1 py-px font-bold">YDK</span>}
                  {g.transferListed.includes(p.id) && <span className="text-[9px] text-warn border border-warn/50 rounded px-1 py-px">SATIŞTA</span>}
                  {g.loans?.some((l) => l.playerId === p.id) && p.clubId === g.myClub.id && <span className="text-[9px] text-info border border-info/50 rounded px-1 py-px">KİRALIK</span>}
                  {ms.promise === 'active'
                    ? <span className="text-[9px] text-ok border border-ok/50 rounded px-1 py-px">SÖZ ✓</span>
                    : ms.label && <span className="text-[9px] text-warn border border-warn/50 rounded px-1 py-px">⏱ {ms.label === 'kırgın' ? 'KIRGIN' : 'HUZURSUZ'}</span>}
                </span>
              </span>
              <span className="w-[40px] min-h-[44px] rounded-lg bg-amber/10 border border-amber/25 flex flex-col items-center justify-center shrink-0">
                <span className="num text-[16px] font-extrabold text-amber leading-none">{p.ratings.gen}</span>
                <span className="text-[7px] text-muted mt-0.5">GENEL</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* §5.7 Hızlı profil bottom sheet */}
      <Sheet open={!!quick} onClose={() => setQuick(null)} title="">
        {quick && (
          <div className="m26-in">
            <div className="flex items-center gap-3 -mt-1">
              <PlayerPortrait player={quick} size={58} />
              <div className="min-w-0">
                <div className="text-primary font-display text-lg truncate">{quick.name}</div>
                <div className="text-secondary text-[12px]">{G_LABEL[quick.group]} · {quick.age} yaş · {clubById(quick.clubId).short}</div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-4">
              <RatingChip value={quick.ratings.gen} label="Genel" showCrown />
              {quick.group === 'GK'
                ? <RatingChip value={quick.ratings.kal ?? 0} label="Kalecilik" />
                : <RatingChip value={quick.ratings.att} label="Hücum" />}
              <RatingChip value={quick.ratings.tek} label="Teknik" />
              <RatingChip value={quick.ratings.def} label="Defans" />
              <RatingChip value={quick.ratings.men} label="Zekâ" />
              <RatingChip value={quick.ratings.fiz} label="Fizik" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              {[['Form', `${quick.form}`, quick.form >= 65 ? 'var(--c-ok)' : 'var(--c-warn)'], ['Kondisyon', `${quick.fitness}`, quick.fitness >= 75 ? 'var(--c-ok)' : 'var(--c-danger)'], ['Maç Ritmi', `${quick.sharpness}`, 'var(--c-info)']].map(([k, v, c]) => (
                <div key={k} className="bg-base/70 rounded-lg p-2">
                  <div className="num font-bold text-[15px]" style={{ color: c as string }}>{v}</div>
                  <div className="text-muted text-[10px] uppercase">{k}</div>
                </div>
              ))}
            </div>
            {/* Dalga 3: son maç reytingleri — yalnız gerçek maç arşivinden */}
            {(() => {
              const rr = recentRatings(quick.id, g.matchReports ?? []);
              const t = formTrend(rr);
              return (
                <div className="mt-3 bg-base/70 rounded-xl p-3" data-testid="recent-ratings">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted text-[10px] uppercase font-extrabold tracking-wider">Son Maç Reytingleri</span>
                    {t && <span className={`text-[10.5px] font-extrabold ${t === 'up' ? 'text-ok' : t === 'down' ? 'text-danger' : 'text-muted'}`}>
                      {t === 'up' ? '▲ Yükselişte' : t === 'down' ? '▼ Düşüşte' : '→ Yatay'}
                    </span>}
                  </div>
                  {rr.length === 0 ? (
                    <p className="text-muted text-[11px] leading-snug">Henüz maç verisi yok — bu grafik sezon içinde oynadıkça gerçek reytinglerle dolar.</p>
                  ) : (
                    <div className="flex items-end gap-1.5 h-14">
                      {rr.map((r, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${i + 1}. maç: ${r.toFixed(1)}`}>
                          <span className="num text-[9px] text-secondary">{r.toFixed(1)}</span>
                          <div className="w-full rounded-t" style={{ height: `${Math.max(8, r * 10)}%`, background: r >= 7.5 ? 'var(--c-ok)' : r >= 6.5 ? 'var(--c-info)' : 'var(--c-warn)' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {quick.bio && <p className="text-secondary text-[12.5px] leading-snug mt-3 bg-base/70 rounded-xl p-3 italic">“{quick.bio}”</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Btn variant="secondary" className="!text-[12.5px]" onClick={() => { goXI(quick); setQuick(null); }}>İlk 11'e Al</Btn>
              <Btn variant="secondary" className="!text-[12.5px]" onClick={() => { g.toggleTransferList(quick.id); setQuick(null); }}>{g.transferListed.includes(quick.id) ? 'Listeden Çıkar' : 'Satış Listesine Koy'}</Btn>
              {!g.loans?.some((l) => l.playerId === quick.id) && (
                <Btn variant="secondary" className="!text-[12.5px]"
                  onClick={() => { const r = g.loanOut(quick.id); show(r.ok ? `🔁 ${quick.name} kiralık gönderildi` : (r.reason ?? 'Gönderilemedi'), r.ok ? 'ok' : 'warn'); if (r.ok) setQuick(null); }}>Kiraya Ver 🔁</Btn>
              )}
              {g.minuteState(quick.id, rankById.get(quick.id) ?? 20, quick.age).label && g.minuteState(quick.id, rankById.get(quick.id) ?? 20, quick.age).promise !== 'active' && (
                <Btn variant="secondary" className="!text-[12.5px] col-span-2"
                  onClick={() => { const r = g.promiseMinutes(quick.id); show(r.ok ? `🤝 ${quick.name}'e süre sözü verildi (10 maç ≥%55)` : (r.reason ?? 'Söz verilemedi'), r.ok ? 'ok' : 'warn'); if (r.ok) setQuick(null); }}>🤝 Süre Sözü Ver (10 maç ≥%55)</Btn>
              )}
              <Btn variant="secondary" className="!text-[12.5px]" onClick={() => { setFull(quick); setQuick(null); }}>Sözleşmeyi İncele</Btn>
              <Btn variant="amber" className="!text-[12.5px]" onClick={() => { setFull(quick); setQuick(null); }}>Tam Profili Aç</Btn>
              <Btn variant="secondary" className="!text-[12.5px] col-span-2" onClick={() => { setQuick(null); setCompare(quick); }}><GameIcon id="market" className="w-4 h-4" />Bu Oyuncuyu Karşılaştır</Btn>
            </div>
          </div>
        )}
      </Sheet>

      {/* §5.7 Tam profil modal — v0.8.3 RISK-02: odak kapanı */}
      {full && (
        <div ref={fullTrapRef} role="dialog" aria-modal="true" aria-label={`${full.name} tam profili`} tabIndex={-1}
          className="fixed inset-0 z-[60] bg-base flex flex-col safe-t safe-b m26-in">
          <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-line/50">
            <Btn variant="secondary" className="!px-3" onClick={() => setFull(null)}>←</Btn>
            <div className="flex-1">
              <div className="text-primary font-display text-[17px]">{full.name}</div>
              <div className="text-muted text-[11px]">{G_LABEL[full.group]} · {full.foreign ? 'Yabancı' : 'Yerli'} · {full.id.split('_')[1]}</div>
            </div>
            <Crest club={clubById(full.clubId)} size={32} />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
            <div className="flex items-center gap-4">
              <PlayerPortrait player={full} size={72} />
              <div className="flex-1 grid grid-cols-3 gap-2">
                <RatingChip value={full.ratings.gen} label="Genel" showCrown />
                <RatingChip value={full.potential} label="Potansiyel" />
                <RatingChip value={full.age} label="Yaş" />
              </div>
            </div>
            <Card>
              <div className="text-[11px] text-muted uppercase mb-2">Grup Puanları</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {full.group === 'GK' && <StatRow label="Kalecilik" v={full.ratings.kal ?? 0} />}
                {full.group !== 'GK' && <StatRow label="Hücum" v={full.ratings.att} />}
                <StatRow label="Teknik" v={full.ratings.tek} />
                <StatRow label="Defans" v={full.ratings.def} />
                <StatRow label="Fizik" v={full.ratings.fiz} />
                <StatRow label="Oyun Zekâsı" v={full.ratings.men} />
              </div>
            </Card>
            <Card>
              <div className="text-[11px] text-muted uppercase mb-2.5">Dinamik Durumlar</div>
              {[
                ['Form', full.form, '±6% maç etkisi'],
                ['Kondisyon', full.fitness, '90+ taze · <60 yüksek risk'],
                ['Maç Ritmi', full.sharpness, 'süre aldıkça yükselir'],
              ].map(([k, v, n]) => (
                <div key={k as string} className="mb-2.5">
                  <div className="flex justify-between text-[12.5px] mb-1"><span className="text-primary font-semibold">{k}</span><span className="num text-secondary">{v}</span></div>
                  <div className="h-1.5 bg-base rounded-full overflow-hidden"><div className="h-full bg-info rounded-full" style={{ width: `${v}%` }} /></div>
                  <div className="text-muted text-[10.5px] mt-0.5">{n}</div>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <Badge kind={full.injuredDays ? 'danger' : 'ok'}>{full.injuredDays ? `Sakat: ${full.injury?.name ?? 'Bilinmeyen'} · ${full.injury?.daysRemaining ?? full.injuredDays}g${full.injury?.canPlayWithRisk ? ' · Riskli oynatılabilir' : ''}` : 'Sakatlık yok'}</Badge>
                <Badge kind="muted">Yakın poz: {full.secondary.map((s) => G_LABEL[s]).join(', ') || '—'}</Badge>
              </div>
            </Card>
            {/* v0.9.9 — Sağlık & Rehberlik: Avrupa Kliniği, iğneyle oynatma, ağabeylik */}
            <Card>
              <div className="text-[11px] text-muted uppercase mb-2.5">Sağlık & Rehberlik</div>
              {full.injuredDays > 0 && full.injury && (
                <div className="space-y-2 mb-2">
                  {/* Avrupa Kliniği sevki: ₺0,3M → 14 gün kısaltma (sakatlık başına 1 kez) */}
                  <Btn variant="secondary" className="w-full !text-[12.5px]"
                    disabled={!!full.injury.clinicUsed || g.budget.tb < 0.3}
                    onClick={() => {
                      const r = g.clinicTreat(full.id);
                      if (r.ok) {
                        const nd = Math.max(1, full.injuredDays - 14);
                        setFull({ ...full, injuredDays: nd, injury: { ...full.injury!, daysRemaining: nd, clinicUsed: true } });
                        show(`🏥 ${full.name} Avrupa Kliniği'ne sevk edildi — süre 14 gün kısaldı (kalan ${nd}g)`, 'ok');
                      } else show(r.reason ?? 'Sevk yapılamadı', 'warn');
                    }}>
                    🏥 Avrupa Kliniğine Sevk Et {full.injury.clinicUsed ? '— kullanıldı' : '— ₺300.000 · 14g kısaltır'}
                  </Btn>
                  {full.injury.clinicUsed && <div className="text-muted text-[10.5px]">Aynı sakatlıkta klinik hakkı bir kez kullanılabilir.</div>}
                  {/* İğneyle oynatma: riskli sakatlıklarda tek maçlık kumar */}
                  {full.injury.canPlayWithRisk ? (
                    <Btn variant={(g.riskPlayIds ?? []).includes(full.id) ? 'amber' : 'secondary'} className="w-full !text-[12.5px]"
                      onClick={() => {
                        const on = !(g.riskPlayIds ?? []).includes(full.id);
                        g.setRiskPlay(full.id, on);
                        show(on ? `💉 ${full.name}: iğneyle oynatma onayı verildi — ilk 11'e alınabilir (%25 nüks kumarı, tek maç)` : `İğne onayı geri çekildi — ${full.name} dinlenir`, on ? 'warn' : 'ok');
                      }}>
                      {(g.riskPlayIds ?? []).includes(full.id) ? '💉 İğne onaylı — geri çekmek için dokun' : '💉 İğneyle Oynatmayı Onayla — %50 kondisyon, %25 nüks kumarı'}
                    </Btn>
                  ) : (
                    <div className="text-muted text-[10.5px]">Bu sakatlık riskli oynatmaya uygun değil ({full.injury.severity}) — takım doktoru iğneyi imzalamaz.</div>
                  )}
                </div>
              )}
              {/* Ağabeylik (mentoring): ≤21 gençlere 29+ ağabey atanır */}
              {(() => {
                const mentor = full.mentorId ? g.playerOf(full.mentorId) : null;
                const seniors = g.mySquad.filter((x) => x.age >= 29 && x.id !== full.id);
                return (
                  <div>
                    <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                      <span className="text-primary font-semibold">Ağabeylik (Mentor)</span>
                      {mentor ? <Badge kind="ok">{mentor.name}</Badge> : <Badge kind="muted">{full.age <= 21 ? 'Atanmadı' : '—'}</Badge>}
                    </div>
                    {full.age <= 21 && (
                      <div className="flex gap-1.5">
                        <select value={mentorSel} onChange={(e) => setMentorSel(e.target.value)}
                          className="flex-1 min-h-[44px] bg-base border border-line rounded-lg px-2 text-[12.5px] text-primary">
                          <option value="">Ağabey seç (29+ yaş)…</option>
                          {seniors.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.ratings.gen} GEN · {x.age}yaş</option>)}
                        </select>
                        <Btn variant="amber" className="!px-3 !text-[12px]" disabled={!mentorSel}
                          onClick={() => {
                            const r = g.setMentor(full.id, mentorSel);
                            show(r.ok ? `🤝 ${g.playerOf(mentorSel)?.name ?? ''} artık ${full.name}'e ağabeylik ediyor — günlük gelişim desteği aktif` : (r.reason ?? 'Atanamadı'), r.ok ? 'ok' : 'warn');
                            if (r.ok) { setFull({ ...full, mentorId: mentorSel }); setMentorSel(''); }
                          }}>Ata</Btn>
                        {mentor && <Btn variant="secondary" className="!px-2.5 !text-[12px]" onClick={() => { g.setMentor(full.id, null); setFull({ ...full, mentorId: null }); show('Ağabeylik kaydı kaldırıldı', 'ok'); }}>✕</Btn>}
                      </div>
                    )}
                    {full.age <= 21
                      ? <p className="text-muted text-[10.5px] leading-snug mt-1">Ağabeyi olan genç oyuncu her gün +ritim/form desteği alır; ağabeyi en az 8 GEN üstündeyse ara sıra ekstra gelişim sıçraması görülebilir.</p>
                      : full.age >= 29
                        ? <p className="text-muted text-[10.5px] leading-snug mt-1">Bu oyuncu ağabey adayı — 21 ve altı bir gencin profilinden atanabilir.</p>
                        : <p className="text-muted text-[10.5px] leading-snug mt-1">Ağabeylik 21 ve altı oyunculara atanır; ağabeyler 29 yaş ve üstü.</p>}
                  </div>
                );
              })()}
            </Card>
            <Card>
              <div className="text-[11px] text-muted uppercase mb-2">Sözleşme · yenileme Piyasa → Sözleşmeler</div>

              <div className="flex justify-between text-[13px]"><span className="text-secondary">Aylık maaş</span><span className="num text-primary font-bold">₺{full.wage}B</span></div>
              <div className="flex justify-between text-[13px] mt-1.5"><span className="text-secondary">Kalan sözleşme</span><Badge kind={(full.contractYears ?? 3) <= 1 ? 'danger' : (full.contractYears ?? 3) <= 2 ? 'warn' : 'muted'}>{(full.contractYears ?? 3)} yıl</Badge></div>
              <div className="flex justify-between text-[13px] mt-1.5"><span className="text-secondary">Statü</span><Badge kind="info">{full.ratings.gen >= 72 ? 'Yıldız Oyuncu' : full.ratings.gen >= 64 ? 'İlk 11 Oyuncusu' : full.age <= 21 ? 'Gelişim Oyuncusu' : 'Rotasyon Oyuncusu'}</Badge></div>
            </Card>
            {/* Gerçek arşivden maç maç performans günlüğü (yeni kalıcı alan yok) */}
            <Card>
              <div className="text-[11px] text-muted uppercase mb-2">Son Maçlar · Maç Günlüğü</div>
              {(() => {
                const log = playerMatchLog(full.id, g.matchReports ?? [], g.career.clubId, 5);
                if (!log.length) {
                  return <p className="text-muted text-[12px]">Henüz oynanmış maç kaydı yok — ilk maçlardan sonra reyting trendi ve maç günlüğü burada birikir.</p>;
                }
                const sum = summarizePlayerLog(log);
                const trend = ratingTrend(log);
                return (
                  <div data-testid="player-match-log">
                    <RatingSparkline ratings={trend} />
                    <div className="grid grid-cols-4 gap-1.5 text-center my-2.5">
                      {[
                        [`${sum.played}`, 'Maç'],
                        [`${sum.goals}/${sum.assists}`, 'Gol/A'],
                        [sum.ratingAvg?.toFixed(2) ?? '—', 'Ort. Reyting'],
                        [`${sum.yellows + sum.reds}`, 'Kart'],
                      ].map(([v, l]) => (
                        <div key={l} className="bg-base/70 rounded-lg py-1.5">
                          <div className="num text-primary font-extrabold text-[14px]">{v}</div>
                          <div className="text-muted text-[9px] uppercase">{l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1" data-testid="player-match-rows">
                      {log.map((m, i) => {
                        const opp = clubById(m.oppClubId);
                        const rc = m.rating >= 8 ? 'text-ok' : m.rating >= 7 ? 'text-amber' : m.rating >= 6.2 ? 'text-info' : 'text-danger';
                        return (
                          <div key={`${m.day}-${i}`} data-testid="player-match-row"
                            className="flex items-center gap-2 rounded-lg bg-base/60 px-2.5 py-1.5 text-[11px]">
                            <span className="text-muted w-9 shrink-0">{COMP_LABEL[m.comp]}</span>
                            <span className="text-muted w-4 shrink-0">{m.isHome ? 'E' : 'D'}</span>
                            <span className="text-primary font-semibold flex-1 truncate">{opp?.short ?? m.oppClubId}</span>
                            <span className="text-muted num w-9 text-right">{m.min}'</span>
                            <span className="num text-amber w-10 text-right">{m.g > 0 ? `${m.g} G` : ''}{m.a > 0 ? ` ${m.a} A` : ''}{!m.g && !m.a ? '—' : ''}</span>
                            {m.yellow > 0 && <span className="text-warn">🟨</span>}
                            {m.red > 0 && <span className="text-danger">🟥</span>}
                            <span className={`num font-extrabold w-9 text-right ${rc}`}>{m.rating.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-muted text-[10px] mt-2 leading-snug">
                      Tam maç {sum.fullMatches} · sonradan giriş/erken çıkış {sum.subAppearances} · toplam {sum.minutes} dk
                      {sum.goalsPer90 !== null && ` · 90 dk başına ${sum.goalsPer90} gol`}
                      {sum.assistsPer90 !== null && `, ${sum.assistsPer90} asist`}
                    </p>
                  </div>
                );
              })()}
            </Card>
            <Card>
              <div className="text-[11px] text-muted uppercase mb-2">Bu Sezon</div>
              {(() => {
                const st = g.playerStats?.[full.id];
                if (!st || !st.apps) return <p className="text-muted text-[12px]">Henüz resmî maç istatistiği yok — bu bilgi sezon ilerledikçe birikir.</p>;
                const rating = ratings[full.id];
                const ort = rating ? `${rating.source === 'legacy' ? '≈' : ''}${rating.average.toFixed(1)}` : '—';
                // Kaleci ayrıntıları score-only AI maçlarında üretilmez.
                const cards = rating ? st.yellows + st.reds : '—';
                const cells: (string | number)[][] = full.group === 'GK'
                  ? [[st.apps, 'Maç'], [rating ? st.conceded ?? 0 : '—', 'Yediği'], [rating ? st.cleanSheets ?? 0 : '—', 'Yememe'], [ort, 'Ort.'], [cards, 'Kart']]
                  : [[st.apps, 'Maç'], [st.goals, 'Gol'], [st.assists, 'Asist'], [ort, 'Ort.'], [cards, 'Kart']];
                return (
                  <>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {cells.map(([v, l]) => (
                        <div key={l as string}><div className="num text-primary font-extrabold text-[15px]">{v}</div><div className="text-muted text-[9px] uppercase mt-0.5">{l}</div></div>
                      ))}
                    </div>
                    <p className="text-muted text-[10px] mt-2 leading-snug">Puan, kart ve kaleci ayrıntıları raporlanan maçlara aittir.{rating?.source === 'legacy' ? ' ≈ eski toplam (yaklaşık).' : ''}</p>
                  </>
                );
              })()}
            </Card>
            {/* v0.9.5 Şartname FAZ A: Kariyer Dökümü — sezon sezon (şu anki sezon canlı satır en üstte) */}
            <Card>
              <div className="text-[11px] text-muted uppercase mb-2">Kariyer Dökümü {full.isRetired && <span className="text-amber normal-case">· 🏅 Jübile Yaptı</span>}</div>
              {(() => {
                const st = g.playerStats?.[full.id];
                const hist = [...(full.careerHistory ?? [])].sort((a, b) => b.season - a.season);
                const isGK = full.group === 'GK';
                const seasonOf = (sno: number) => `${2025 + sno}–${String(26 + sno).padStart(2, '0')}`;
                if (!hist.length && (!st || !st.apps)) {
                  return <p className="text-muted text-[12px]">Kariyer kaydı boş — bu oyuncu henüz resmî maça çıkmadı. (Yeni kayıtlar da ilk sezonundan itibaren burada birikir; sahte geçmiş üretilmez.)</p>;
                }
                const Row: React.FC<{ h?: boolean; sezon: string; kulup: string; mac: string | number; a: string | number; b: string | number; ort: string; alt?: boolean }> = ({ h, sezon, kulup, mac, a, b, ort, alt }) => (
                  <div className={`grid grid-cols-[64px_1fr_34px_34px_34px_38px] gap-1 items-center px-1 py-1.5 ${h ? 'text-muted text-[9.5px] uppercase' : alt ? 'bg-amber/5 rounded' : ''} border-b border-line/30 last:border-0`}>
                    <span className="num text-[11px]">{sezon}</span>
                    <span className="text-[11px] truncate">{kulup}</span>
                    <span className="num text-[11.5px] text-center">{mac}</span>
                    <span className="num text-[11.5px] text-center font-semibold">{a}</span>
                    <span className="num text-[11.5px] text-center">{b}</span>
                    <span className="num text-[11.5px] text-center text-primary font-bold">{ort}</span>
                  </div>
                );
                return (
                  <div>
                    <Row h sezon="Sezon" kulup="Kulüp" mac="Maç" a={isGK ? 'Yediği' : 'Gol'} b={isGK ? 'Yememe' : 'Asist'} ort="Ort" />
                    {st && st.apps > 0 && (
                      <Row alt sezon={`${seasonOf(g.seasonNo)} ▶`} kulup={clubById(st.clubId)?.short ?? st.clubId} mac={st.apps}
                        a={isGK ? ratings[full.id] ? st.conceded ?? 0 : '—' : st.goals} b={isGK ? ratings[full.id] ? st.cleanSheets ?? 0 : '—' : st.assists} ort={ratings[full.id] ? `${ratings[full.id].source === 'legacy' ? '≈' : ''}${ratings[full.id].average.toFixed(2)}` : '—'} />
                    )}
                    {hist.map((r) => (
                      <Row key={`${r.season}-${r.clubId}`} sezon={seasonOf(r.season)} kulup={clubById(r.clubId)?.short ?? r.clubId} mac={r.apps}
                        a={isGK ? r.conceded ?? 0 : r.goals} b={isGK ? r.cleanSheets ?? 0 : r.assists} ort={r.avgRating > 0 ? r.avgRating.toFixed(2) : '—'} />
                    ))}
                  </div>
                );
              })()}
            </Card>
          </div>
          <div className="p-4 border-t border-line/50 grid grid-cols-2 gap-2">
            <Btn variant="secondary" onClick={() => { goXI(full); setFull(null); }}>İlk 11'e Al</Btn>
            <Btn variant="amber" onClick={() => setFull(null)}>Tamam</Btn>
            <Btn variant="secondary" className="col-span-2" onClick={() => { setFull(null); setCompare(full); }}><GameIcon id="market" className="w-4 h-4" />Bu Oyuncuyu Karşılaştır</Btn>
          </div>
        </div>
      )}
      {compare !== null && <ComparisonDesk initialPlayer={compare === 'empty' ? null : compare} onClose={() => setCompare(null)} />}
      {ToastView}
    </div>
  );
};

const StatRow: React.FC<{ label: string; v: number }> = ({ label, v }) => (
  <div className="flex items-center justify-between">
    <span className="text-secondary text-[12.5px]">{label}</span>
    <span className={`num font-bold text-[13px] ${v >= 75 ? 'text-ok' : v >= 62 ? 'text-amber' : 'text-primary'}`}>{v}</span>
  </div>
);
