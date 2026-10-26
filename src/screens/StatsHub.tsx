// HM26 — v0.9.5 Şartname FAZ A: HUB-3 İstatistik & Ödüller Merkezi
// Kaynak: PersistedState.playerStats (maç motoru sindirimi) + seasonFinale.awards + kupa vitrini.
// Kural: sahte veri yok — veri birikmediyse Empty State gösterilir.
import { GameIcon } from '../components/icons';
import React, { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { Card, Badge } from '../components/ui/kit';
import { clubById } from '../data/clubs';

type Tab = 'krallik' | 'karakter' | 'oduller';

const EmptyBox: React.FC<{ icon: string; title: string; note: string }> = ({ icon, title, note }) => {
  return (
    <Card className="!p-4 flex items-start gap-3">
      <span className="text-muted shrink-0 mt-0.5"><GameIcon id={icon} className="w-5 h-5" /></span>
      <div>
        <div className="font-display font-bold text-[14px]">{title}</div>
        <div className="text-muted text-[12px] mt-1 leading-snug">{note}</div>
      </div>
    </Card>
  );
};

interface RankRow { playerId: string; clubId: string; label: string; value: number; sub?: string }

const RankTable: React.FC<{ title: string; rows: RankRow[]; mine?: string | null; max?: number }> = ({ title, rows, mine, max = 10 }) => {
  const list = rows.slice(0, max);
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">{title}</div>
      {list.map((r, i) => (
        <div key={`${r.playerId}-${i}`} className={`flex items-center gap-2.5 px-4 py-2 border-b border-line/40 last:border-0 ${r.playerId === mine ? 'bg-amber/5' : ''}`}>
          <span className={`num w-6 text-center text-[12px] font-extrabold ${i === 0 ? 'text-amber' : i < 3 ? 'text-primary' : 'text-muted'}`}>{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">{r.label}</div>
            <div className="text-[10.5px] text-muted">{clubById(r.clubId)?.short ?? r.clubId}{r.sub ? ` · ${r.sub}` : ''}</div>
          </div>
          <span className="num text-[15px] font-extrabold text-ink">{r.value}</span>
        </div>
      ))}
    </Card>
  );
};

const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '');

export const StatsHub: React.FC = () => {
  const g = useGame();
  const [tab, setTab] = useState<Tab>('krallik');
  const stats = g.playerStats ?? {};
  const seasonLabel = `${2025 + g.seasonNo}–${String(26 + g.seasonNo).padStart(2, '0')}`;

  const rows = useMemo(() => Object.values(stats).filter((r) => r.apps > 0), [stats]);
  const nameOf = (pid: string) => g.playerOf(pid)?.name ?? `Oyuncu #${pid.slice(0, 4)}`;
  const avg = (r: { ratingSum: number; apps: number }) => r.ratingSum / r.apps;

  const topScorers = useMemo<RankRow[]>(() =>
    rows.filter((r) => r.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.apps - a.apps || a.playerId.localeCompare(b.playerId))
      .map((r) => ({ playerId: r.playerId, clubId: r.clubId, label: nameOf(r.playerId), value: r.goals, sub: `${r.apps} maç` })), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const topAssists = useMemo<RankRow[]>(() =>
    rows.filter((r) => r.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.apps - a.apps || a.playerId.localeCompare(b.playerId))
      .map((r) => ({ playerId: r.playerId, clubId: r.clubId, label: nameOf(r.playerId), value: r.assists, sub: `${r.apps} maç` })), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const topRating = useMemo<RankRow[]>(() =>
    rows.filter((r) => r.apps >= 3)
      .sort((a, b) => avg(b) - avg(a) || b.apps - a.apps || a.playerId.localeCompare(b.playerId))
      .map((r) => ({ playerId: r.playerId, clubId: r.clubId, label: nameOf(r.playerId), value: +avg(r).toFixed(2), sub: `${r.apps} maç` })), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const gkSheets = useMemo<RankRow[]>(() =>
    rows.filter((r) => (r.cleanSheets ?? 0) > 0 && g.playerOf(r.playerId)?.group === 'GK')
      .sort((a, b) => (b.cleanSheets ?? 0) - (a.cleanSheets ?? 0) || (a.conceded ?? 0) - (b.conceded ?? 0) || a.playerId.localeCompare(b.playerId))
      .map((r) => ({ playerId: r.playerId, clubId: r.clubId, label: nameOf(r.playerId), value: r.cleanSheets ?? 0, sub: `${r.conceded ?? 0} yediği · ${r.apps} maç` })), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const hotheads = useMemo<RankRow[]>(() =>
    rows.filter((r) => (r.yellows + r.reds) > 0)
      .sort((a, b) => (b.yellows + b.reds * 3) - (a.yellows + a.reds * 3) || a.playerId.localeCompare(b.playerId))
      .map((r) => ({ playerId: r.playerId, clubId: r.clubId, label: nameOf(r.playerId), value: r.yellows + r.reds * 3, sub: `${r.yellows} sarı · ${r.reds} kırmızı` })), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const gentlemen = useMemo<RankRow[]>(() =>
    rows.filter((r) => r.apps >= 5 && (r.yellows + r.reds) === 0)
      .sort((a, b) => avg(b) - avg(a) || b.apps - a.apps || a.playerId.localeCompare(b.playerId))
      .map((r) => ({ playerId: r.playerId, clubId: r.clubId, label: nameOf(r.playerId), value: +avg(r).toFixed(2), sub: `${r.apps} maç · 0 kart` })), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const awards = g.seasonFinale?.awards ?? null;
  const trophies = g.career.trophyCabinet ?? [];
  const noDataYet = rows.length === 0;

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 pt-3 pb-2">
        <h2 className="font-display font-extrabold text-[17px]">İstatistik & Ödüller</h2>
        <div className="text-muted text-[11.5px] mt-0.5">Sezon {seasonLabel} · canlı veri, maç motorundan beslenir</div>
        <div className="flex gap-2 mt-3" role="tablist" aria-label="İstatistik sekmeleri">
          {([['krallik', 'Krallıklar'], ['karakter', 'Karakter'], ['oduller', 'Ödüller']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`flex-1 min-h-[44px] rounded-lg text-[12.5px] font-bold border ${tab === t ? 'bg-amber/15 border-amber/50 text-amber' : 'border-line text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 grid gap-3 content-start">
        {tab === 'krallik' && (
          <>
            {noDataYet
              ? <EmptyBox icon="chart" title="Henüz istatistik birikmedi" note="Lig maçları oynandıkça gol, asist ve maç puanları burada canlı krallık tablolarına dönüşür. Şu an gösterilecek gerçek veri yok." />
              : <>
                {topScorers.length ? <RankTable title="⚽ Gol Kralı" rows={topScorers} mine={null} /> : null}
                {topAssists.length ? <RankTable title="🎯 Asist Kralı" rows={topAssists} /> : null}
                {topRating.length ? <RankTable title="⭐ Maç Puanı (min. 3 maç)" rows={topRating} /> : null}
                {gkSheets.length ? <RankTable title="🧤 Gol Yememe (Kaleciler)" rows={gkSheets} /> : null}
                {!topScorers.length && !topAssists.length && !topRating.length && <EmptyBox icon="chart" title="Sezon yeni başladı" note="İlk maçlar oynanınca krallık tabloları burada belirecek." />}
              </>}
          </>
        )}

        {tab === 'karakter' && (
          <>
            {noDataYet
              ? <EmptyBox icon="shield" title="Takım karakteri okunamıyor" note="Kart ve fair-play verileri maçlar oynandıkça birikir; yeterli örneklem olunca hırçın/centilmen listeleri burada görünür." />
              : <>
                {hotheads.length
                  ? <RankTable title="🔥 En Hırçınlar" rows={hotheads} max={5} />
                  : <EmptyBox icon="whistle" title="Kart özeti yok" note="Bu sezon henüz kart görülmüş değil — disiplinli bir lig başlangıcı." />}
                {gentlemen.length
                  ? <RankTable title="🕊️ Centilmenler (0 kart, min. 5 maç)" rows={gentlemen} max={5} />
                  : <EmptyBox icon="whistle" title="Centilmen eşiği dolmadı" note="En az 5 maç ve sıfır kart şartını henüz sağlayan oyuncu yok." />}
              </>}
          </>
        )}

        {tab === 'oduller' && (
          <>
            {/* Kupalar — gerçek vitrin verisi */}
            <Card className="!p-0 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">🏆 Kupa Vitrini</div>
              {trophies.length === 0
                ? <div className="px-4 py-3 text-muted text-[12px]">Vitrin henüz boş — ilk kupayı kazandığında burada tarihiyle birlikte sergilenecek.</div>
                : trophies.slice().reverse().map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-line/40 last:border-0">
                    <span className="text-[18px]">{t.type === 'lig' ? '🏆' : t.type === 'kupa' ? '🥇' : '⬆️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold truncate">{t.title}</div>
                      <div className="text-[10.5px] text-muted num">{t.season}</div>
                    </div>
                  </div>
                ))}
            </Card>

            {/* Bireysel ödüller — son sezon finalinden */}
            {awards
              ? (['scorer', 'assist', 'mvp', 'young'] as const).map((k) => {
                const list = awards[k];
                if (!list.length) return null;
                const title = k === 'scorer' ? '⚽ Gol Kralı' : k === 'assist' ? '🎯 Asist Kralı' : k === 'mvp' ? '🌟 Yılın Oyuncusu' : '🌱 Yılın Genci';
                return (
                  <Card key={k} className="!p-0 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">{title} <span className="text-muted font-normal">· {g.seasonFinale?.season}</span></div>
                    {list.map((r, i) => (
                      <div key={r.playerId} className="flex items-center gap-2.5 px-4 py-2 border-b border-line/40 last:border-0">
                        <span className="w-6 text-center text-[13px]">{medal(i)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold truncate">{nameOf(r.playerId)}</div>
                          <div className="text-[10.5px] text-muted">{clubById(r.clubId)?.short ?? r.clubId}</div>
                        </div>
                        <span className="num text-[13px] font-bold text-amber">{r.display}</span>
                      </div>
                    ))}
                  </Card>
                );
              })
              : <EmptyBox icon="star" title="Bireysel ödüller sezon sonunda bekliyor" note="Gol/asist krallığı, yılın oyuncusu ve yılın genci ödülleri sezon finali töreninde sahiplerini bulur; önceki sezon tören verisi henüz yok." />}
          </>
        )}
      </div>
    </div>
  );
};
