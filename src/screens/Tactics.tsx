// HM26 — UI/UX §5.8 Taktik ekranı: 5 plan şeridi + saha + formasyon + plan + talimatlar + duran toplar
import React, { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { Card, Btn, Badge, Sheet, Seg } from '../components/ui/kit';
import { GameIcon } from '../components/icons';
import { FORMATIONS, GAME_PLANS, PLAN_SLOTS } from '../data/meta';
import { FORMATION_SLOTS } from '../engine/profiles';
import { positionMod } from '../engine/ratings';
import { autoXI } from '../data/gen';
import { Formation, Player } from '../types';

const POS_LABEL: Record<string, string> = { GK: 'KL', CB: 'STP', FB: 'BK', WB: 'KB', DM: 'DOS', CM: 'MO', AM: 'OOS', WG: 'KNT', ST: 'SN' };
// Saha koordinatları (formasyon bazlı; yüzde) — §9.1 taban
const SHAPE: Record<Formation, { guide: string; slots: { x: number; y: number; group: string }[] }> = {
  '4-3-3': { guide: '4-3-3', slots: [{ x: 50, y: 90, group: 'GK' }, { x: 12, y: 74, group: 'FB/WB' }, { x: 33, y: 76, group: 'CB' }, { x: 67, y: 76, group: 'CB' }, { x: 88, y: 74, group: 'FB/WB' }, { x: 25, y: 50, group: 'CM' }, { x: 50, y: 55, group: 'CM' }, { x: 75, y: 50, group: 'CM' }, { x: 15, y: 24, group: 'WG' }, { x: 50, y: 18, group: 'ST' }, { x: 85, y: 24, group: 'WG' }] },
  '4-2-3-1': { guide: '4-2-3-1', slots: [{ x: 50, y: 90, group: 'GK' }, { x: 12, y: 74, group: 'FB/WB' }, { x: 33, y: 76, group: 'CB' }, { x: 67, y: 76, group: 'CB' }, { x: 88, y: 74, group: 'FB/WB' }, { x: 36, y: 56, group: 'DM/CM' }, { x: 64, y: 56, group: 'DM/CM' }, { x: 15, y: 34, group: 'WG/AM' }, { x: 50, y: 36, group: 'AM' }, { x: 85, y: 34, group: 'WG/AM' }, { x: 50, y: 14, group: 'ST' }] },
  '4-4-2': { guide: '4-4-2', slots: [{ x: 50, y: 90, group: 'GK' }, { x: 12, y: 74, group: 'FB/WB' }, { x: 33, y: 76, group: 'CB' }, { x: 67, y: 76, group: 'CB' }, { x: 88, y: 74, group: 'FB/WB' }, { x: 14, y: 48, group: 'WG/CM' }, { x: 38, y: 52, group: 'CM' }, { x: 62, y: 52, group: 'CM' }, { x: 86, y: 48, group: 'WG/CM' }, { x: 35, y: 18, group: 'ST' }, { x: 65, y: 18, group: 'ST' }] },
  '4-1-4-1': { guide: '4-1-4-1', slots: [{ x: 50, y: 90, group: 'GK' }, { x: 12, y: 74, group: 'FB/WB' }, { x: 33, y: 76, group: 'CB' }, { x: 67, y: 76, group: 'CB' }, { x: 88, y: 74, group: 'FB/WB' }, { x: 50, y: 62, group: 'DM' }, { x: 15, y: 42, group: 'WG/CM' }, { x: 38, y: 46, group: 'CM' }, { x: 62, y: 46, group: 'CM' }, { x: 85, y: 42, group: 'WG/CM' }, { x: 50, y: 15, group: 'ST' }] },
  '3-5-2': { guide: '3-5-2', slots: [{ x: 50, y: 90, group: 'GK' }, { x: 25, y: 76, group: 'CB' }, { x: 50, y: 78, group: 'CB' }, { x: 75, y: 76, group: 'CB' }, { x: 8, y: 50, group: 'WB' }, { x: 30, y: 54, group: 'CM' }, { x: 50, y: 58, group: 'CM' }, { x: 70, y: 54, group: 'CM' }, { x: 92, y: 50, group: 'WB' }, { x: 38, y: 18, group: 'ST' }, { x: 62, y: 18, group: 'ST' }] },
  '5-3-2': { guide: '5-3-2', slots: [{ x: 50, y: 90, group: 'GK' }, { x: 10, y: 76, group: 'WB' }, { x: 30, y: 80, group: 'CB' }, { x: 50, y: 82, group: 'CB' }, { x: 70, y: 80, group: 'CB' }, { x: 90, y: 76, group: 'WB' }, { x: 30, y: 52, group: 'CM' }, { x: 50, y: 56, group: 'CM' }, { x: 70, y: 52, group: 'CM' }, { x: 40, y: 18, group: 'ST' }, { x: 60, y: 18, group: 'ST' }] },
};

export const TacticsScreen: React.FC<{ pendingXI?: Player | null; onClearXI?: () => void }> = ({ pendingXI, onClearXI }) => {
  const g = useGame();
  const [planIdx, setPlanIdx] = useState(0);
  const plan = g.tactics[planIdx];
  const [tab, setTab] = useState<'formation' | 'plan' | 'instr'>('formation');
  const [drawer, setDrawer] = useState<'setpieces' | null>(null);
  const [editName, setEditName] = useState(false);
  const xi = useMemo(() => autoXI(g.mySquad, plan.formation), [g.mySquad, plan.formation]);
  const [slotPick, setSlotPick] = useState<number | null>(null); // FAZ 2: dokunulan saha yuvası
  // v0.9.4 G2-açıklama: uyumsuz hedefe iki aşamalı onay (ilk dokun uyarı/bilgi, ikinci dokun işlemi uygular)
  const [arm, setArm] = useState<string | null>(null);
  // v0.9.5: yedek kartlar da her zaman tıklanabilir — önce yedeğe dokun, sonra uyumlu yuvaya dokun (kulübeden-sahaya akışı)
  const [benchPick, setBenchPick] = useState<string | null>(null);

  // Aktif lineup: customLineup > auto varsayılan (autoXI'nin picker dizilimiyle eşleşen 11 id)
  const autoIds = useMemo(() => [...xi.gk, ...xi.defShape, ...xi.fbWb, ...xi.dm, ...xi.cm, ...xi.am, ...xi.wg, ...xi.st].map((p) => p.id), [xi]);
  const lineupIds: (string | null)[] = plan.customLineup && plan.customLineup.length === 11 ? plan.customLineup : autoIds;
  const lineup = lineupIds.map((id) => g.mySquad.find((p) => p.id === id) ?? null);
  const benchAll = useMemo(() => {
    const usedIds = new Set(lineupIds.filter(Boolean) as string[]);
    return [...g.mySquad].filter((p) => !usedIds.has(p.id)).sort((a, b) => b.ratings.gen - a.ratings.gen);
  }, [g.mySquad, lineupIds]);
  const bench = plan.customBench?.length ? plan.customBench.map((id) => g.mySquad.find((p) => p.id === id)).filter(Boolean) as Player[] : benchAll.slice(0, 6);

  const swapSlot = (slotIdx: number, newId: string) => {
    const next11 = [...lineupIds];
    const old = next11[slotIdx];
    next11[slotIdx] = newId;
    const inIdx = next11.indexOf(newId);
    // yeni oyuncu baska slottaysa eski oyuncunun gitmesi lazim (swap)
    if (inIdx !== -1 && inIdx !== slotIdx) next11[inIdx] = old;
    setPlan({ customLineup: next11, customBench: benchAll.map((p) => p.id).filter((id) => !next11.includes(id)).slice(0, 6) });
    setSlotPick(null);
    setBenchPick(null);
  };

  // Dalga 9: 11 içi yer değiştirme — seçili yuvadaki oyuncu ile dokunulan yuva takaslanır
  const swapXI = (a: number, b: number) => {
    if (a === b) return;
    const next11 = [...lineupIds];
    [next11[a], next11[b]] = [next11[b], next11[a]];
    setPlan({ customLineup: next11, customBench: benchAll.map((p) => p.id).filter((id) => !next11.includes(id)).slice(0, 6) });
    setSlotPick(null);
    setBenchPick(null);
  };

  const onSlotTap = (i: number) => {
    // Jr-09/QA: Kadro'dan "İlk 11'e Al" ile gelen oyuncu doğrudan dokunulan yuvaya yerleşir
    if (pendingXI) {
      // v0.9.4: uyumsuz hedef → önce açıklama, tekrar dokun onaylama
        if (!canSlot(SHAPE[plan.formation].slots[i].group, pendingXI)) {
        const key = `pend:${i}`;
        if (arm !== key) { setArm(key); return; }
      }
      setArm(null);
      swapSlot(i, pendingXI.id);
      onClearXI?.();
      return;
    }
    // v0.9.5: önce yedek seçildiyse dokunulan yuvaya sahaya alınır (uyumsuzsal gerçek ceza %si + iki aşamalı onay)
    if (benchPick) {
      const bp = benchAll.find((b) => b.id === benchPick);
      if (bp && !canSlot(SHAPE[plan.formation].slots[i].group, bp)) {
        const key = `bp:${benchPick}:${i}`;
        if (arm !== key) { setArm(key); return; }
      }
      setArm(null);
      swapSlot(i, benchPick);
      return;
    }
    setArm(null);
    if (slotPick === null || slotPick === i) { setSlotPick(slotPick === i ? null : i); return; }
    swapXI(slotPick, i);
  };

  // Jr-09/QA: uyumlu yuva parlatması — asıl mevki veya yakın pozisyonlar yuva grubuyla örtüşür
  const canSlot = (slotGroup: string, p: Player): boolean => {
    const tokens = slotGroup.split('/');
    if (p.group === 'GK') return slotGroup === 'GK';
    if (slotGroup === 'GK') return false;
    return tokens.includes(p.group) || (p.secondary ?? []).some((s) => tokens.includes(s));
  };

  // v0.9.4: yuvanın MOTOR mevki grubu (FORMATION_SLOTS) üzerinden gerçek güç cezası yüzdesi
  const penaltyOf = (slotIdx: number, p: Player): number => {
    const g0 = FORMATION_SLOTS[plan.formation]?.[slotIdx];
    if (!g0) return 7;
    return Math.round((1 - positionMod(p, g0)) * 100);
  };

  const setPlan = (patch: Partial<typeof plan>) => g.updateTactic(planIdx, { ...plan, ...patch });

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <h1 className="text-primary font-bold text-[22px] tracking-tight leading-none mb-1">Taktik</h1>
            <p className="text-muted text-[11px]">{g.myClub.name}</p>
          </div>
          <button onClick={() => setTab('formation')} className="shrink-0 min-h-[44px] px-3 rounded-lg text-[11px] font-bold border border-line bg-surface text-primary flex items-center gap-1.5" aria-label={`Dizilişi değiştir, mevcut ${plan.formation}`}>
            <span className="num">{plan.formation}</span>
            <span className="w-4 h-4 inline-block text-muted"><GameIcon id={('settings') as string} className="w-full h-full" /></span>
          </button>
        </div>
        {/* §5.8: 5 taktik plan şeridi */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Taktik planları">
          {g.tactics.map((_, i) => (
            <button key={i} onClick={() => { setArm(null); setSlotPick(null); setBenchPick(null); setPlanIdx(i); }} className={`shrink-0 min-h-[44px] px-3 rounded-lg text-[11px] font-bold border ${i === planIdx ? 'text-amber border-amber/60 bg-amber/10' : 'text-muted border-line bg-surface'}`}>
              {PLAN_SLOTS[i]}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          {editName ? (
            <input autoFocus value={plan.name} onChange={(e) => setPlan({ name: e.target.value || plan.name })} onBlur={() => setEditName(false)} className="bg-base border border-line rounded-lg px-2 py-1 text-[12px] text-primary w-36" />
          ) : (
            <button onClick={() => setEditName(true)} className="text-muted text-[10px] min-h-[44px]">{slotPick === null ? <>{plan.name} ✎ · dokunarak düzenle</> : 'Bir oyuncu daha seç: yer değiştir'}</button>
          )}
          <span className="flex items-center gap-2">
            {plan.customLineup && <span className="text-[9px] text-muted border border-line rounded px-1.5 py-0.5">Manuel dizilim</span>}
            <button onClick={() => setPlan({ customLineup: undefined, customBench: undefined })} className="text-amber text-[10.5px] font-bold min-h-[44px] underline underline-offset-2">Otomatik 11</button>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-1 pb-6 space-y-3">
        {pendingXI && (
          <div className="flex items-center justify-between gap-2 bg-ok/10 border border-ok/40 rounded-lg px-2.5 py-1.5 text-[11.5px] text-ok font-semibold m26-in">
            <span>Sahaya al: <b>{pendingXI.name}</b> — uygun yuvalar yeşil parlıyor, birine dokun.</span>
            <button className="min-w-[44px] min-h-[44px] text-danger font-bold shrink-0" onClick={() => { setArm(null); onClearXI?.(); }} aria-label="İlk 11 atamasını iptal et">✕</button>
          </div>
        )}
        {/* v0.9.4 G2: turuncu üçgen / uyumsuz atama açıklamaları */}
        {pendingXI && arm?.startsWith('pend:') && (() => {
          const i = +arm.slice(5);
          const sg = SHAPE[plan.formation].slots[i]?.group ?? '?';
          return (
            <div className="flex items-start gap-2 bg-warn/10 border border-warn/40 rounded-lg px-2.5 py-2 text-[12px] text-warn font-medium m26-in" role="alert">
              <GameIcon id="info" className="shrink-0 mt-px w-4 h-4" />
              <span><b>{pendingXI.name}</b>, {i + 1}. yuvanın mevki grubu (<b>{sg}</b>) dışında. Maç motoru mevki dışı oyuncuya güç cezası uygular (<b>yaklaşık %{penaltyOf(i, pendingXI)}</b> daha düşük etkili). Yine de sahaya almak için <b>aynı yuvaya bir kez daha dokun</b>; vazgeçmek için başka yuva seç ya da ✕ ile iptal et.</span>
            </div>
          );
        })()}
        {!pendingXI && slotPick !== null && lineup[slotPick] && !canSlot(SHAPE[plan.formation].slots[slotPick].group, lineup[slotPick]!) && (
          <div className="flex items-start gap-2 bg-warn/10 border border-warn/40 rounded-lg px-2.5 py-2 text-[12px] text-warn font-medium m26-in" role="alert">
            <GameIcon id="info" className="shrink-0 mt-px w-4 h-4" />
            <span>Seçtiğin yuvadaki <b>{lineup[slotPick]!.name}</b> <b>{SHAPE[plan.formation].slots[slotPick].group}</b> grubu dışında oynuyor — turuncu üçgenin anlamı bu. Maçta gücü yaklaşık <b>%{penaltyOf(slotPick, lineup[slotPick]!)}</b> düşer; kulübeden uyumlu biriyle değiştir veya "Otomatik 11"e dön.</span>
          </div>
        )}
        {!pendingXI && arm?.startsWith('bp:') && (() => {
          const parts = arm.split(':');
          const bp = benchAll.find((x) => x.id === parts[1]);
          const i = +parts[2];
          if (!bp) return null;
          const sg = SHAPE[plan.formation].slots[i]?.group ?? '?';
          return (
            <div className="flex items-start gap-2 bg-warn/10 border border-warn/40 rounded-lg px-2.5 py-2 text-[12px] text-warn font-medium m26-in" role="alert">
              <GameIcon id="info" className="shrink-0 mt-px w-4 h-4" />
              <span><b>{bp.name}</b>, {i + 1}. yuvanın mevki grubu (<b>{sg}</b>) dışında — güç cezası yaklaşık <b>%{penaltyOf(i, bp)}</b>. Yine de sahaya almak için <b>aynı yuvaya bir kez daha dokun</b>; vazgeçmek için başka yuva seç.</span>
            </div>
          );
        })()}
        {!pendingXI && slotPick !== null && arm?.startsWith('bench:') && (() => {
          const pid = arm.slice(6);
          const bp = benchAll.find((x) => x.id === pid);
          if (!bp) return null;
          return (
            <div className="flex items-start gap-2 bg-warn/10 border border-warn/40 rounded-lg px-2.5 py-2 text-[12px] text-warn font-medium m26-in" role="alert">
              <GameIcon id="info" className="shrink-0 mt-px w-4 h-4" />
              <span><b>{bp.name}</b> seçili yuvada uyumsuz (grup <b>{SHAPE[plan.formation].slots[slotPick]?.group}</b>) — güç cezası yaklaşık <b>%{penaltyOf(slotPick, bp)}</b>. Onaylamak için aynı oyuncuya <b>tekrar dokun</b>; başka yedek seçersen uyarı kalkar.</span>
            </div>
          );
        })()}
        {/* Saha + ilk 11 — prototip pitch reskin (C dalgası) */}
        <div className="mx-auto relative rounded-xl overflow-hidden" style={{ width: 'min(100%, calc((100dvh - 430px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 0.647619))', minWidth: 250, aspectRatio: '68 / 105', border: '1px solid #37594c', background: 'repeating-linear-gradient(to bottom,#123d30 0%,#123d30 10%,#153f32 10%,#153f32 20%)' }}>
          <svg className="absolute inset-0 w-full h-full" style={{ inset: 8, width: 'calc(100% - 16px)', height: 'calc(100% - 16px)' }} viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true">
            <g fill="none" stroke="rgba(226,245,232,.32)" strokeWidth=".55">
              <path d="M1 1H67V104H1Z M1 52.5H67 M14 1V17.5H54V1 M24 1V6.5H44V1 M14 104V87.5H54V104 M24 104V98H44V104" />
              <circle cx="34" cy="52.5" r="9.15" />
              <circle cx="34" cy="52.5" r=".6" fill="rgba(226,245,232,.35)" stroke="none" />
              <path d="M28 17.5a9 9 0 0 0 12 0 M28 87.5a9 9 0 0 1 12 0" />
            </g>
          </svg>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(145deg,rgba(255,255,255,.015),transparent 45%,rgba(0,0,0,.1))' }} />
          {/* FAZ 2: 11 oyuncu — tap-to-swap aktif */}
          {SHAPE[plan.formation].slots.map((slot, i) => {
            const player: Player | null = lineup[i] ?? null;
            const name = player ? player.name.split(' ').slice(-1)[0] : '';
            const warn = player && player.fitness < 60;
            // v0.9.2 G2: oyuncu yuvanın mevki grubu dışında kullanılıyorsa yuva kenarında küçük turuncu uyarı
            const oop = !!player && !canSlot(slot.group, player);
            const picked = slotPick === i;
            const benchPickedP = !pendingXI && benchPick ? benchAll.find((b) => b.id === benchPick) ?? null : null;
            const compatible = !!pendingXI ? canSlot(slot.group, pendingXI) : !!benchPickedP && canSlot(slot.group, benchPickedP);
            const isCaptain = player && plan.setPieces.captain === player.id;
            const isPenalty = player && plan.setPieces.penalty === player.id;
            return (
              
              <button key={i} data-compat={compatible ? '1' : undefined} onClick={() => onSlotTap(i)}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-[3px] min-w-[64px] min-h-[48px]"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                aria-label={player ? `${player.name} değiştir${oop ? ' — mevki dışı konumda' : ''}` : `Yuva ${i + 1} boş`}
                aria-pressed={picked}>
                <span className="relative w-[29px] h-[29px] rounded-full flex items-center justify-center text-[11px] font-extrabold num"
                  style={picked
                    ? { background: 'var(--c-accent)', color: '#071822', border: '1.5px solid #f3cf83', boxShadow: '0 0 0 4px #cc9c4733' }
                    : compatible
                      ? { background: 'rgba(74,222,128,.30)', color: '#fff', border: '1.5px solid #4ade80', boxShadow: '0 0 0 4px #4ade8040, 0 3px 5px #07182255' }
                      : { background: '#194f3a', color: '#fff', border: '1.5px solid #78bf98', boxShadow: '0 3px 5px #07182255' }}>
                  {i + 1}
                  {warn && <span className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-warn text-[7px] text-base font-bold flex items-center justify-center">!</span>}
                  {oop && (
                    <span data-oop="true" title={`${name} mevki grubu dışında (${slot.group})`} role="img" aria-label="Mevki dışı uyarısı"
                      className="absolute -top-1 -left-1.5 w-3.5 h-3.5 flex items-center justify-center"
                      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.45))' }}>
                      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                        <path d="M7 1.1 13.4 12.4H0.6Z" fill="#D78140" stroke="#071822" strokeWidth="0.8" strokeLinejoin="round" />
                        <rect x="6.35" y="5.1" width="1.3" height="4" rx="0.65" fill="#071822" />
                        <circle cx="7" cy="10.6" r="0.75" fill="#071822" />
                      </svg>
                    </span>
                  )}
                  {isCaptain && <span className="absolute -bottom-1 -left-1.5 text-[7px] font-bold text-amber bg-black/70 rounded px-0.5">©</span>}
                  {isPenalty && <span className="absolute -bottom-1 -right-1.5 text-[7px] font-bold text-primary bg-black/70 rounded px-0.5">P</span>}
                </span>
                <span className={`flex flex-col items-center leading-[1.15] px-[5px] py-[3px] rounded border max-w-[72px] ${picked ? 'border-amber text-amber' : 'border-[#37634e] text-white'}`} style={{ background: '#08241bee' }}>
                  <span className="text-[9px] font-semibold max-w-[66px] truncate">{name || '—'}</span>
                  {player && <span data-slot-gen={player.ratings.gen} className="num text-[8.5px] font-extrabold text-amber/95 mt-px leading-none">{player.ratings.gen}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="flex items-start gap-1.5 text-muted text-[10px] leading-[1.5] px-1 !mt-2">
          <span className="w-3.5 h-3.5 inline-block shrink-0 mt-px"><GameIcon id={('info') as string} className="w-full h-full" /></span>
          {pendingXI ? `${pendingXI.name} için yeşil parlayan bir yuvaya dokun.` : benchPick ? `${benchAll.find((b) => b.id === benchPick)?.name ?? 'Seçili yedek'} için yeşil parlayan bir yuvaya dokun — sahaya girer.` : slotPick === null ? 'Önce bir oyuncuya, sonra diğerine dokunarak yer değişimini dene. Veya kulübeden bir yedeğe dokun → uyumlu yuvalar parlar. Turuncu üçgen: oyuncu mevki grubu dışında — güç cezalıdır.' : 'Başka bir yuvaya dokun: iki oyuncu yer değiştirir · alttaki yedeğe dokun: sahaya alınır.'}
        </p>
        <div className="text-muted text-[9px] tracking-[0.08em] font-extrabold px-1 pt-1">YEDEKLER</div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(slotPick !== null ? benchAll : bench).slice(0, 8).map((p) => (
            // v0.9.5: 6 yedek kartının tamamı her zaman tıklanabilir — boşta iken dokun, yuvayı seçtir (yeşil parlatma); yuva seçiliyken dokun, sahaya al
            <button key={p.id}
              data-benchpick={benchPick === p.id ? 'true' : undefined}
              aria-pressed={benchPick === p.id}
              aria-label={slotPick === null && !pendingXI ? `${p.name} — sahaya almak için seç, sonra yuvaya dokun` : `${p.name} — seçili yuvaya sahaya al`}
              onClick={() => {
                if (slotPick === null) {
                  if (pendingXI) return; // pendingXI akışında yedek kartları rol oynamaz
                  setArm(null);
                  setBenchPick(benchPick === p.id ? null : p.id);
                  return;
                }
                // v0.9.4: yedek uyumsuzsa önce açıklama; tekrar dokun onaylama
                const sg = SHAPE[plan.formation].slots[slotPick]?.group ?? 'GK';
                if (!canSlot(sg, p)) {
                  const key = `bench:${p.id}`;
                  if (arm !== key) { setArm(key); return; }
                }
                setArm(null);
                swapSlot(slotPick, p.id);
              }}
              className={`shrink-0 min-w-[64px] min-h-[48px] bg-surface border rounded-lg px-2 py-2 text-center transition-transform active:scale-95 ${benchPick === p.id ? 'border-amber ring-2 ring-amber/50' : slotPick !== null ? 'border-amber/70' : 'border-line'}`}>
              {arm === `bench:${p.id}` && <span className="block text-[9px] text-warn font-bold">⚠ tekrar dokun = onay</span>}
              <span className="block text-[10px] text-primary font-semibold truncate max-w-[64px]">{p.name.split(' ').slice(-1)[0]}</span>
              <span className="block text-muted text-[9px] mt-1">{POS_LABEL[p.group]} · <span className="num">{p.ratings.gen}</span></span>
              {slotPick !== null
                ? <span className="block text-[8px] text-amber font-bold mt-0.5">Sahaya al →</span>
                : !pendingXI && (benchPick === p.id
                  ? <span className="block text-[8px] text-amber font-bold mt-0.5">Yuvaya dokun ↑</span>
                  : <span className="block text-[8px] text-muted mt-0.5">Seçmek için dokun</span>)}
            </button>
          ))}
        </div>

        {/* Sekmeler */}
        <Seg options={[{ v: 'formation', label: 'Formasyon' }, { v: 'plan', label: 'Oyun Planı' }, { v: 'instr', label: 'Talimatlar' }]} value={tab} onChange={(v) => setTab(v as any)} />

        {tab === 'formation' && (
          <Card className="m26-in">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] text-muted uppercase">Formasyon</div>
              <Badge kind="info">{plan.formation}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FORMATIONS.map((f) => (
                <button key={f} onClick={() => { setArm(null); g.updateTactic(planIdx, { ...plan, formation: f, customLineup: undefined, customBench: undefined }); }} className={`min-h-touch rounded-xl border text-[13px] font-bold num ${plan.formation === f ? 'bg-amber text-base border-amber' : 'bg-base text-primary border-line'}`}>{f}</button>
              ))}
            </div>
            <div className="mt-4 space-y-3.5">
              <div>
                <div className="flex justify-between text-[12.5px] mb-1.5"><span className="text-primary font-semibold">Takım genişliği</span><span className="num text-secondary">{plan.width}</span></div>
                <input type="range" min={25} max={90} value={plan.width} onChange={(e) => setPlan({ width: +e.target.value })} className="w-full accent-amber h-6" />
              </div>
              <ToggleRow label="Bekler ileri konumlansın" value={plan.fbAdvanced} onChange={(v) => setPlan({ fbAdvanced: v })} note="İleri bekler kanat üretimini artırır; geride alan bırakır." />
              <div>
                <div className="text-[12.5px] text-primary font-semibold mb-1.5">Orta saha çizgisi</div>
                <Seg options={[{ v: 'low', label: 'Alçak' }, { v: 'mid', label: 'Orta' }, { v: 'high', label: 'Yüksek' }]} value={plan.midLine} onChange={(v) => setPlan({ midLine: v as any })} />
              </div>
              <div>
                <div className="text-[12.5px] text-primary font-semibold mb-1.5">Forvet destek mesafesi</div>
                <Seg options={[{ v: 'low', label: 'Yakın' }, { v: 'mid', label: 'Orta' }, { v: 'high', label: 'Uzun' }]} value={plan.strikerSupport} onChange={(v) => setPlan({ strikerSupport: v as any })} />
              </div>
            </div>
          </Card>
        )}

        {tab === 'plan' && (
          <div className="space-y-2 m26-in">
            {GAME_PLANS.map((p) => (
              <Card key={p.id} onClick={() => setPlan({ plan: p.id })} accent={plan.plan === p.id ? 'var(--c-accent)' : undefined} className={plan.plan === p.id ? '!border-amber' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-primary font-bold text-[14px]">{p.name}</div>
                    <p className="text-secondary text-[12px] leading-snug mt-1">{p.fx}</p>
                  </div>
                  {plan.plan === p.id && <Badge kind="ok">Aktif</Badge>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'instr' && (
          <Card className="m26-in space-y-3.5">
            {(
              [
                ['Pres', 'low', 'Düşük', 'mid', 'Orta', 'high', 'Yüksek', 'press'],
                ['Tempo', 'low', 'Yavaş', 'mid', 'Dengeli', 'high', 'Hızlı', 'tempo'],
                ['Hücum yönü', 'left', 'Sol', 'center', 'Merkez', 'right', 'Sağ', 'direction'],
                ['Savunma çizgisi', 'deep', 'Derin', 'normal', 'Normal', 'high', 'Önde', 'defLine'],
                ['Pas riski', 'safe', 'Güvenli', 'mid', 'Dengeli', 'direct', 'Direkt', 'passRisk'],
              ] as const
            ).map((row) => (
              <div key={row[7]}>
                <div className="text-[12.5px] text-primary font-semibold mb-1.5">{row[0]}</div>
                {row[0] === 'Hücum yönü' ? (
                  <Seg
                    options={[{ v: 'left', label: 'Sol' }, { v: 'center', label: 'Merkez' }, { v: 'right', label: 'Sağ' }, { v: 'balanced', label: 'Dengeli' }]}
                    value={plan.direction}
                    onChange={(v) => setPlan({ direction: v as any })}
                  />
                ) : (
                  <Seg
                    options={[{ v: (row as any)[1], label: (row as any)[2] }, { v: (row as any)[3], label: (row as any)[4] }, { v: (row as any)[5], label: (row as any)[6] }]}
                    value={(plan as any)[row[7]]}
                    onChange={(v) => setPlan({ [row[7]]: v } as any)}
                  />
                )}
              </div>
            ))}
            <p className="text-muted text-[11px] leading-snug pt-1">Belge notu: aynı yönlü aşırı ayarlar bedel üretir (örn. Yüksek Pres + Önde Çizgi → savunma arkası risk).</p>
          </Card>
        )}

        <Btn variant="secondary" onClick={() => setDrawer('setpieces')} clubColor={g.myClub.color1}>Duran Toplar & Görevler</Btn>
      </div>

      <Sheet open={drawer === 'setpieces'} onClose={() => setDrawer(null)} title="Duran Toplar">
        <div className="space-y-3">
          {[
            ['Kaptan', 'captain'], ['Penaltı', 'penalty'], ['Sağ korner', 'cornerR'], ['Sol korner', 'cornerL'], ['Yakın serbest', 'fkShort'], ['Uzak serbest', 'fkLong'],
          ].map(([label, key]) => {
            const cur = plan.setPieces[key as keyof typeof plan.setPieces];
            const options = lineup.filter((p): p is Player => !!p && p.injuredDays === 0 && p.suspendedMatches <= 0);
            return (
              <div key={key}>
                <div className="text-[12px] text-secondary font-bold mb-1.5">{label} <span className="text-muted">(sistem önerisi: {options[0]?.name.split(' ').slice(-1)[0]})</span></div>
                <select
                  value={cur ?? ''}
                  onChange={(e) => setPlan({ setPieces: { ...plan.setPieces, [key]: e.target.value || null } })}
                  className="w-full bg-base border border-line rounded-xl px-3 min-h-touch text-primary text-[13px]"
                >
                  <option value="">— Otomatik öneri —</option>
                  {options.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.ratings.gen})</option>)}
                </select>
              </div>
            );
          })}
          <Btn variant="amber" className="w-full" onClick={() => setDrawer(null)}>Kaydet</Btn>
        </div>
      </Sheet>
    </div>
  );
};

const ToggleRow: React.FC<{ label: string; note: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, note, value, onChange }) => (
  <div>
    <button onClick={() => onChange(!value)} className="w-full min-h-touch flex items-center justify-between">
      <span className="text-[12.5px] text-primary font-semibold">{label}</span>
      <span className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-amber' : 'bg-line'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </span>
    </button>
    <p className="text-muted text-[10.5px] leading-snug -mt-0.5">{note}</p>
  </div>
);
