// HM26 — v0.9.5 Şartname FAZ A: HUB-3 İstatistik & Ödüller Merkezi
// Kaynak: PersistedState.playerStats (maç motoru sindirimi) + seasonFinale.awards + kupa vitrini.
// Kural: sahte veri yok — veri birikmediyse Empty State gösterilir.
import { GameIcon } from '../components/icons';
import React, { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { Card, Badge, Sheet } from '../components/ui/kit';
import { ExpandableRanking } from '../components/ui/ExpandableRanking';
import { clubById, clubByIdSafe } from '../data/clubs';
import type { MatchArchiveEntry } from '../types';
import { MatchHighlights } from '../components/match/MatchHighlights';
import { archivedHighlightEvents } from '../engine/highlights';
import { COMP_LABEL } from '../data/newsroom';
import { buildXptsTable, buildLeagueXptsTable, buildFairPlayTable, goalkeeperSaveRate, buildRefereeProfile } from '../engine/analytics';
import { normalizeMyMatches, teamSplit, formStrip, goalBuckets, perMatch, xgTrend, xgVerdict, seasonMatchStats, cardDisciplineByPosition, type TeamSplitRow } from '../engine/teamInsights';
import { goalMinuteProfile, firstGoalProfile, injuryTally, varStats } from '../engine/matchEvents';
import { XgTrendChart } from '../components/ui/charts';

type Tab = 'krallik' | 'analiz' | 'karakter' | 'oduller';

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

const RankTable: React.FC<{ title: string; rows: RankRow[]; mine?: string | null; max?: number }> = ({ title, rows, mine, max = 10 }) => (
  <ExpandableRanking
    title={title} rows={rows} previewLimit={max} unit="oyuncu"
    rowKey={(row) => row.playerId}
    detailNote="Lig, kupa ve diğer maçlardaki birikmiş kayıtlar birlikte gösterilir."
    empty={<div className="px-4 py-3 text-muted text-[12px]">Henüz sıralama verisi yok.</div>}
    renderRow={(r, i, detail) => (
      <div className={`flex items-center gap-2.5 ${detail ? 'px-1' : 'px-4'} py-2 ${r.playerId === mine ? 'bg-amber/5' : ''}`}>
        <span className={`num w-6 shrink-0 text-center text-[12px] font-extrabold ${i === 0 ? 'text-amber' : i < 3 ? 'text-primary' : 'text-muted'}`}>{i + 1}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-semibold ${detail ? 'break-words' : 'truncate'}`}>{r.label}</div>
          <div className={`text-[10.5px] text-muted ${detail ? 'break-words' : ''}`}>{clubByIdSafe(r.clubId)?.short ?? r.clubId}{r.sub ? ` · ${r.sub}` : ''}</div>
        </div>
        <span className="num text-[15px] font-extrabold text-ink shrink-0">{r.value}</span>
      </div>
    )}
  />
);

const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '');

export const StatsHub: React.FC = () => {
  const g = useGame();
  const [tab, setTab] = useState<Tab>('krallik');
  const [archiveMatch, setArchiveMatch] = useState<MatchArchiveEntry | null>(null);
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

  // Dalga 1: kaleci kurtarış yüzdesi krallığı (kurtarış / (kurtarış + yenilen gol))
  const gkSaves = useMemo<RankRow[]>(() =>
    rows.filter((r) => g.playerOf(r.playerId)?.group === 'GK' && (r.saves ?? 0) > 0)
      .map((r) => ({ r, rate: goalkeeperSaveRate(r.saves, r.conceded) }))
      .filter((x): x is { r: typeof x.r; rate: number } => x.rate !== null)
      .sort((a, b) => b.rate - a.rate || (b.r.saves ?? 0) - (a.r.saves ?? 0))
      .map(({ r, rate }) => ({ playerId: r.playerId, clubId: r.clubId, label: nameOf(r.playerId), value: rate, sub: `%${rate} · ${r.saves} kurtarış · ${r.apps} maç` })), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dalga 1: kullanıcının ligine ait arşiv raporlarından xPTS ve Fair Play agregatı
  const myLeague = g.leagueOf[g.career.clubId] ?? g.myClub.league;
  const reports = g.matchReports ?? [];
  // C3: tam lig xPTS'si fikstür xG'lerinden gelir; eski kayıtta (xG yok) arşiv tablosuna düşülür
  const leagueXptsRows = useMemo(() => buildLeagueXptsTable(g.fixtures), [g.fixtures]);
  const archiveXptsRows = useMemo(() => buildXptsTable(reports, g.seasonNo), [reports, g.seasonNo]);
  const xptsRows = leagueXptsRows.length ? leagueXptsRows : archiveXptsRows;
  const xptsSource = leagueXptsRows.length ? 'league' : 'archive';
  const minuteProfile = useMemo(() => goalMinuteProfile(reports, g.career.clubId), [reports, g.career.clubId]);
  const seasonStats = useMemo(() => seasonMatchStats(reports, g.career.clubId, g.seasonNo), [reports, g.career.clubId, g.seasonNo]);
  // v4: ilk gol psikolojisi, VAR karnesi, hakem profili, pozisyon disiplini, sakatlık geçmişi
  const firstGoal = useMemo(() => firstGoalProfile(reports, g.career.clubId), [reports, g.career.clubId]);
  const varReport = useMemo(() => varStats(reports, g.career.clubId), [reports, g.career.clubId]);
  const refereeProfiles = useMemo(() => buildRefereeProfile(reports, g.career.clubId), [reports, g.career.clubId]);
  const discipline = useMemo(() => cardDisciplineByPosition(reports, g.career.clubId), [reports, g.career.clubId]);
  const injuries = useMemo(() => injuryTally(reports, g.career.clubId), [reports, g.career.clubId]);
  const fairPlayRows = useMemo(() => buildFairPlayTable(reports, g.seasonNo), [reports, g.seasonNo]);
  const actualPts = useMemo(() => new Map((g.table[myLeague] ?? []).map((r) => [r.clubId, r.pts])), [g.table, myLeague]);
  const leagueClubs = useMemo(() => (g.table[myLeague] ?? []).map((r) => clubById(r.clubId)).filter(Boolean), [g.table, myLeague]);

  const awards = g.seasonFinale?.awards ?? null;
  const trophies = g.career.trophyCabinet ?? [];
  const noDataYet = rows.length === 0;

  // Dalga 6: takımımın gerçek arşivinden ev/deplasman performansı, form şeridi ve gol dağılımı
  const myMatches = useMemo(
    () => normalizeMyMatches(g.matchReports ?? [], g.career.clubId, g.seasonNo),
    [g.matchReports, g.career.clubId, g.seasonNo],
  );
  const mySplit = useMemo(() => teamSplit(myMatches), [myMatches]);
  const myStrip = useMemo(() => formStrip(myMatches, 10), [myMatches]);
  const myBuckets = useMemo(() => goalBuckets(myMatches), [myMatches]);
  const myXgTrend = useMemo(() => xgTrend(myMatches), [myMatches]);
  const myXgVerdict = useMemo(() => xgVerdict(myMatches), [myMatches]);
  const recentReports = useMemo(() => reports.filter((r) => r.homeId === g.career.clubId || r.awayId === g.career.clubId)
    .slice().sort((a, b) => b.seasonNo - a.seasonNo || b.day - a.day).slice(0, 10), [reports, g.career.clubId]);
  const archiveEvents = useMemo(() => archivedHighlightEvents(archiveMatch?.events, (id) => g.playerOf(id)?.name), [archiveMatch, g.playerOf]);
  const archiveHome = archiveMatch ? clubByIdSafe(archiveMatch.homeId) : undefined;
  const archiveAway = archiveMatch ? clubByIdSafe(archiveMatch.awayId) : undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 pt-3 pb-2">
        <h2 className="font-display font-extrabold text-[17px]">İstatistik & Ödüller</h2>
        <div className="text-muted text-[11.5px] mt-0.5">Sezon {seasonLabel} · canlı veri, maç motorundan beslenir</div>
        <div className="flex gap-2 mt-3" role="tablist" aria-label="İstatistik sekmeleri">
          {([['krallik', 'Krallıklar'], ['analiz', 'Lig Analizi'], ['karakter', 'Karakter'], ['oduller', 'Ödüller']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`flex-1 min-h-[44px] rounded-lg text-[12.5px] font-bold border ${tab === t ? 'bg-amber/15 border-amber/50 text-amber' : 'border-line text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 grid auto-rows-max gap-3 content-start">
        {tab === 'krallik' && (
          <>
            {noDataYet
              ? <EmptyBox icon="chart" title="Henüz istatistik birikmedi" note="Lig maçları oynandıkça gol, asist ve maç puanları burada canlı krallık tablolarına dönüşür. Şu an gösterilecek gerçek veri yok." />
              : <>
                {topScorers.length ? <RankTable title="⚽ Gol Kralı" rows={topScorers} mine={null} /> : null}
                {topAssists.length ? <RankTable title="🎯 Asist Kralı" rows={topAssists} /> : null}
                {topRating.length ? <RankTable title="⭐ Maç Puanı (min. 3 maç)" rows={topRating} /> : null}
                {gkSheets.length ? <RankTable title="🧤 Gol Yememe (Kaleciler)" rows={gkSheets} /> : null}
                {gkSaves.length ? <RankTable title="🧤 Kurtarış Yüzdesi (Kaleciler)" rows={gkSaves} /> : null}
                {!topScorers.length && !topAssists.length && !topRating.length && <EmptyBox icon="chart" title="Sezon yeni başladı" note="İlk maçlar oynanınca krallık tabloları burada belirecek." />}
              </>}
          </>
        )}

        {tab === 'analiz' && (
          <>
            <Card className="!p-0 overflow-hidden" >
              <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">🎬 Son Maçların Özetleri</div>
              {recentReports.length === 0 ? <div className="px-4 py-3 text-muted text-[12px]">Arşivde henüz maçın yok. Oynanan maçlar burada görünür.</div>
                : <div data-testid="archive-highlights-list">{recentReports.map((report) => {
                  const home = clubByIdSafe(report.homeId);
                  const away = clubByIdSafe(report.awayId);
                  return <button type="button" key={report.id} data-testid="archive-highlight-open" onClick={() => setArchiveMatch(report)}
                    aria-label={`${home?.short ?? report.homeId} ${report.hg}–${report.ag} ${away?.short ?? report.awayId} özetini aç`}
                    className="w-full min-h-touch flex items-center gap-2 text-left px-4 py-2.5 border-b border-line/40 last:border-0 hover:bg-base/60">
                    <span className="flex-1 min-w-0"><span className="block text-primary text-[12px] font-bold truncate">{home?.short ?? report.homeId} <span className="text-amber num">{report.hg}–{report.ag}</span> {away?.short ?? report.awayId}</span><span className="text-muted text-[10px]">{COMP_LABEL[report.comp]} · {report.day}. gün</span></span>
                    <span className="text-amber text-[11px] font-bold shrink-0">Özeti Aç ›</span>
                  </button>;
                })}</div>}
              <p className="px-4 py-2 text-muted text-[10.5px]">Arşivde yalnızca kaydedilmiş olaylar gösterilir.</p>
            </Card>
            {/* Dalga 6: Takımım — ev/deplasman performansı (yalnız gerçek arşiv) */}
            <Card className="!p-0 overflow-hidden">
              <div data-testid="team-split">
              <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">🏟️ Takımım — Ev / Deplasman</div>
              {mySplit.all.played === 0 ? (
                <div className="px-4 py-3 text-muted text-[12px]">Bu sezon henüz arşivde maçın yok — ilk maçlardan sonra ev/deplasman dağılımın burada belirir.</div>
              ) : (
                <div className="px-2 py-2">
                  <div className="grid grid-cols-[1fr_repeat(9,34px)] gap-y-1 text-center text-[9px] text-muted font-extrabold tracking-wider py-1">
                    <span className="text-left pl-2">BAĞLAM</span><span>O</span><span>G</span><span>B</span><span>M</span><span>AG</span><span>YG</span><span>xG</span><span>xGA</span><span>P</span>
                  </div>
                  {([
                    ['Ev', mySplit.home],
                    ['Deplasman', mySplit.away],
                    ['Toplam', mySplit.all],
                  ] as [string, TeamSplitRow][]).map(([label, r], i) => (
                    <div key={label} className={`grid grid-cols-[1fr_repeat(9,34px)] gap-y-1 items-center text-center text-[11.5px] num py-1.5 rounded-lg ${i === 2 ? 'bg-amber/5 font-extrabold text-primary' : 'text-secondary'}`}>
                      <span className="text-left pl-2 font-sans font-bold">{label}</span>
                      <span>{r.played}</span><span className="text-ok">{r.wins}</span><span>{r.draws}</span><span className="text-danger">{r.losses}</span>
                      <span>{r.gf}</span><span>{r.ga}</span>
                      <span className="text-[10.5px]">{r.xgf.toFixed(1)}</span><span className="text-[10.5px]">{r.xga.toFixed(1)}</span>
                      <span className="text-amber">{r.points}</span>
                    </div>
                  ))}
                  <div className="px-2 pt-1.5 text-[10px] text-muted leading-snug">
                    Maç başına: {perMatch(mySplit.all.gf, mySplit.all.played)} gol · {perMatch(mySplit.all.xgf, mySplit.all.played)} xG · {perMatch(mySplit.all.ga, mySplit.all.played)} yenilen
                  </div>
                </div>
              )}
              </div>
            </Card>

            {/* Dalga 6: son maçlar form şeridi + gol dağılımı */}
            <Card className="!p-0 overflow-hidden">
              <div data-testid="team-form">
              <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">📈 Son Maçlar & Gol Dağılımı</div>
              {myStrip.length === 0 ? (
                <div className="px-4 py-3 text-muted text-[12px]">Form şeridi oynanan maçlarla dolar; şu an gerçek veri yok.</div>
              ) : (
                <div className="px-4 py-3 space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {myStrip.map((m, i) => {
                      const opp = clubById(m.oppClubId);
                      const cls = m.result === 'W' ? 'bg-ok/20 border-ok/60 text-ok' : m.result === 'D' ? 'bg-muted/15 border-line text-muted' : 'bg-danger/15 border-danger/60 text-danger';
                      return (
                        <div key={`${m.day}-${i}`} className={`w-[42px] rounded-lg border py-1.5 text-center ${cls}`} title={`${m.isHome ? 'Ev' : 'Deplasman'} · ${opp?.short ?? m.oppClubId} · ${m.gf}-${m.ga}`} data-form-dot={m.result}>
                          <div className="num text-[13px] font-black leading-none">{m.result === 'W' ? 'G' : m.result === 'D' ? 'B' : 'M'}</div>
                          <div className="num text-[9px] mt-1 opacity-85">{m.gf}-{m.ga}</div>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const Bar: React.FC<{ label: string; b: { zero: number; one: number; twoPlus: number } }> = ({ label, b }) => {
                      const total = b.zero + b.one + b.twoPlus || 1;
                      const seg = (n: number) => `${(n / total) * 100}%`;
                      return (
                        <div>
                          <div className="text-[10px] text-muted font-bold mb-1">{label}</div>
                          <div className="flex h-2.5 rounded-full overflow-hidden bg-base border border-line/60">
                            <div style={{ width: seg(b.zero), background: 'var(--c-muted)' }} title={`0 gol: ${b.zero} maç`} />
                            <div style={{ width: seg(b.one), background: 'var(--c-info)' }} title={`1 gol: ${b.one} maç`} />
                            <div style={{ width: seg(b.twoPlus), background: 'var(--c-ok)' }} title={`2+ gol: ${b.twoPlus} maç`} />
                          </div>
                          <div className="flex justify-between text-[9.5px] text-muted mt-1 num">
                            <span>0 gol: {b.zero}</span><span>1 gol: {b.one}</span><span>2+: {b.twoPlus}</span>
                          </div>
                        </div>
                      );
                    };
                    return (
                      <div className="space-y-2.5">
                        <Bar label="ATILAN GOLLER (maç sayısı)" b={myBuckets.scored} />
                        <Bar label="YENİLEN GOLLER (maç sayısı)" b={myBuckets.conceded} />
                      </div>
                    );
                  })()}
                </div>
              )}
              </div>
            </Card>

            {/* Maç maç xG vs gerçek gol trendi — yalnız gerçek arşiv, az veride yargı yok */}
            <Card className="!p-0 overflow-hidden">
              <div data-testid="xg-trend-card">
                <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">📉 xG Trendi (maç maç)</div>
                {myXgTrend.length < 2 ? (
                  <div className="px-4 py-3 text-muted text-[12px]">En az iki maç oynanınca beklenen gol ile gerçek gol çizgisi burada belirir.</div>
                ) : (
                  <div className="px-3 py-3">
                    <XgTrendChart points={myXgTrend} oppShort={(id) => clubById(id)?.short ?? id} />
                    {myXgVerdict && (
                      <p className={`mt-2 text-[11px] leading-snug ${myXgVerdict.label === 'under' ? 'text-warn' : myXgVerdict.label === 'over' ? 'text-ok' : 'text-secondary'}`} data-testid="xg-verdict">
                        {myXgVerdict.text} Savunma tarafında fark: {myXgVerdict.defensiveDelta > 0 ? '+' : ''}{myXgVerdict.defensiveDelta} gol.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* C2: gol dakika profili — sıkıştırılmış olaylardan; eski kayıtlarda dürüst boş durum */}
            <Card className="!p-0 overflow-hidden">
              <div data-testid="goal-minute-card">
                <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">⏱️ Gol Dakika Profili</div>
                {minuteProfile.matchesWithEvents === 0 ? (
                  <div className="px-4 py-3 text-muted text-[12px]">Dakikalı olay kaydı yeni kayıt sistemiyle birikir; geçmiş maçlarda bu kırılım yok — uydurma gösterilmez.</div>
                ) : (
                  <div className="px-4 py-3">
                    <div className="space-y-1.5">
                      {minuteProfile.buckets.map((b) => {
                        const maxV = Math.max(1, ...minuteProfile.buckets.map((x) => Math.max(x.scored, x.conceded)));
                        return (
                          <div key={b.label} className="flex items-center gap-2" data-minute-bucket={b.label}>
                            <span className="num text-[10px] text-muted w-9 shrink-0">{b.label}</span>
                            <div className="flex-1 flex flex-col gap-0.5">
                              <div className="h-2 rounded-full bg-base overflow-hidden"><div className="h-full bg-ok/80" style={{ width: `${(b.scored / maxV) * 100}%` }} title={`Atılan: ${b.scored}`} /></div>
                              <div className="h-2 rounded-full bg-base overflow-hidden"><div className="h-full bg-danger/70" style={{ width: `${(b.conceded / maxV) * 100}%` }} title={`Yenilen: ${b.conceded}`} /></div>
                            </div>
                            <span className="num text-[10px] shrink-0 w-14 text-right"><b className="text-ok">{b.scored}</b> / <b className="text-danger">{b.conceded}</b></span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 mt-2.5 text-[9.5px] text-muted">
                      <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-ok/80 inline-block" /> atılan</span>
                      <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-danger/70 inline-block" /> yenilen</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-center">
                      <div className="bg-base rounded-lg py-1.5">
                        <div className="num text-primary font-extrabold text-[13px]">{minuteProfile.firstHalfScoredShare === null ? '—' : `%${Math.round(minuteProfile.firstHalfScoredShare * 100)}`}</div>
                        <div className="text-muted text-[9px] uppercase">İlk yarı gol</div>
                      </div>
                      <div className="bg-base rounded-lg py-1.5">
                        <div className="num text-primary font-extrabold text-[13px]">{minuteProfile.lateScoredShare === null ? '—' : `%${Math.round(minuteProfile.lateScoredShare * 100)}`}</div>
                        <div className="text-muted text-[9px] uppercase">76+ gol</div>
                      </div>
                      <div className="bg-base rounded-lg py-1.5">
                        <div className="num text-primary font-extrabold text-[13px]">{minuteProfile.comeFromBehindRate === null ? '—' : `%${Math.round(minuteProfile.comeFromBehindRate * 100)}`}</div>
                        <div className="text-muted text-[9px] uppercase">Geriden geliş</div>
                      </div>
                    </div>
                    <p className="text-muted text-[10px] mt-2">
                      Geriden geliş: {minuteProfile.comeFromBehindMatches} maçta önce yenilen gol yendi, {minuteProfile.comeFromBehindWins} tanesi galibiyete döndü.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* C1: sezonluk maç istatistik verimliliği — istatistik bloğu taşıyan kayıtlardan */}
            <Card className="!p-0 overflow-hidden">
              <div data-testid="season-match-stats">
                <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">📊 Sezon İstatistik Verimliliği</div>
                {seasonStats.matches === 0 ? (
                  <div className="px-4 py-3 text-muted text-[12px]">Şut, korner ve pres dökümü yeni kayıt sistemiyle maçlarda birikir; eski kayıtlarda bu kırılım yok.</div>
                ) : (
                  <div className="px-4 py-3 grid grid-cols-2 gap-1.5">
                    {([
                      ['Topa sahip olma ort.', seasonStats.possessionAvg === null ? '—' : `%${seasonStats.possessionAvg}`],
                      ['Şut isabeti', seasonStats.shotAccuracy === null ? '—' : `%${seasonStats.shotAccuracy}`],
                      ['Maç başı şut (isabetli)', seasonStats.shotsPerMatch === null ? '—' : `${seasonStats.shotsPerMatch} (${seasonStats.shotsOnPerMatch ?? '—'})`],
                      ['Maç başı korner', seasonStats.cornersPerMatch === null ? '—' : String(seasonStats.cornersPerMatch)],
                      ['Maç başı kurtarış', seasonStats.savesPerMatch === null ? '—' : String(seasonStats.savesPerMatch)],
                      ['Maç başı pres kazanımı', seasonStats.pressPerMatch === null ? '—' : String(seasonStats.pressPerMatch)],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="bg-base rounded-lg px-2.5 py-2">
                        <div className="num text-primary font-extrabold text-[14px]">{value}</div>
                        <div className="text-muted text-[9.5px] uppercase leading-tight mt-0.5">{label}</div>
                      </div>
                    ))}
                    <p className="col-span-2 text-muted text-[10px]">{seasonStats.matches} maçın motor istatistik bloğundan hesaplandı.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* v4: ilk gol/öne geçme psikolojisi + VAR karnesi */}
            <Card className="!p-0 overflow-hidden">
              <div data-testid="first-goal-card">
                <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">🧠 İlk Gol & Maç Psikolojisi</div>
                {firstGoal.matchesWithEvents === 0 ? (
                  <div className="px-4 py-3 text-muted text-[12px]">Dakikalı olay kaydı biriken maçlarda ilk golün kimden çıktığı ve sonucu nasıl etkilediği burada özetlenir.</div>
                ) : (
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="grid grid-cols-2 gap-1.5 text-center">
                      <div className="bg-ok/10 border border-ok/25 rounded-lg py-2">
                        <div className="text-[9.5px] text-muted uppercase">İlk golü attığın</div>
                        <div className="num text-primary font-extrabold text-[15px]">{firstGoal.scoredFirst.matches} maç</div>
                        <div className="num text-[11px] text-ok font-bold">{firstGoal.scoredFirst.wins}G {firstGoal.scoredFirst.draws}B {firstGoal.scoredFirst.losses}M</div>
                        <div className="text-[9.5px] text-muted">Puan verimi: <b className="num text-secondary">{firstGoal.scoredFirst.pointRate === null ? '—' : `%${Math.round(firstGoal.scoredFirst.pointRate * 100)}`}</b></div>
                      </div>
                      <div className="bg-danger/10 border border-danger/25 rounded-lg py-2">
                        <div className="text-[9.5px] text-muted uppercase">İlk golü yediğin</div>
                        <div className="num text-primary font-extrabold text-[15px]">{firstGoal.concededFirst.matches} maç</div>
                        <div className="num text-[11px] text-danger font-bold">{firstGoal.concededFirst.wins}G {firstGoal.concededFirst.draws}B {firstGoal.concededFirst.losses}M</div>
                        <div className="text-[9.5px] text-muted">Geri dönüş: <b className="num text-secondary">{firstGoal.concededFirst.comebackRate === null ? '—' : `%${Math.round(firstGoal.concededFirst.comebackRate * 100)}`}</b></div>
                      </div>
                    </div>
                    {firstGoal.leadCollapses > 0 && (
                      <p className="text-[10.5px] text-warn leading-snug">⚠️ Öne geçtiğin {firstGoal.leadCollapses} maçta galibiyeti koruyamadın (beraberlik veya mağlubiyet).</p>
                    )}
                    <div className="flex items-center justify-between bg-base rounded-lg px-3 py-2 text-[11px]" data-testid="var-stats">
                      <span className="text-secondary">VAR kayıtları</span>
                      <span className="num">
                        <b className="text-danger">{varReport.myCancelled}</b> golün iptal edildi · rakiplerin <b className="text-ok">{varReport.oppCancelled}</b> iptali
                        {varReport.total === 0 && <span className="text-muted"> — bu sezon VAR olayı yok</span>}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* v4: pozisyon disiplini + sakatlık geçmişi */}
            <Card className="!p-0 overflow-hidden">
              <div data-testid="discipline-card">
                <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">🟨 Disiplin & Sakatlık Haritası</div>
                <div className="px-4 py-3 space-y-3">
                  {discipline.length === 0 ? (
                    <p className="text-muted text-[12px]">Kart verisi maçlarda birikir.</p>
                  ) : (
                    <div>
                      <div className="text-[10px] text-muted uppercase mb-1.5">Pozisyon gruplarına göre kart yükü</div>
                      <div className="space-y-1">
                        {discipline.map((d) => (
                          <div key={d.posGroup} className="flex items-center gap-2 text-[11.5px]" data-discipline-row={d.posGroup}>
                            <span className="w-14 shrink-0 font-bold text-secondary">{d.posGroup}</span>
                            <div className="flex-1 h-2.5 rounded-full bg-base overflow-hidden">
                              <div className="h-full bg-warn/80" style={{ width: `${Math.min(100, (d.yellows + d.reds * 3) * 12)}%` }} />
                            </div>
                            <span className="num text-muted w-20 text-right shrink-0">{d.yellows} sarı · {d.reds} kırmızı</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <ExpandableRanking
                    embedded title="Sakatlık geçmişi (maçtan çıkışlar)" rows={injuries} previewLimit={5} unit="oyuncu"
                    rowKey={(row) => row.playerId} listTestId="injury-list" listClassName="space-y-1" rowClassName=""
                    detailNote="Yalnızca maç arşivine kaydedilen sakatlıklar yer alır."
                    empty={<p className="text-muted text-[11.5px]">Bu sezon maç içinde sakatlanarak oyundan çıkan oyuncu yok — kayıtlar maçlarda birikir.</p>}
                    renderRow={(t, _i, detail) => (
                      <div className="flex items-center justify-between text-[11.5px] bg-base rounded-lg px-2.5 py-1.5">
                        <span className={`font-semibold text-primary min-w-0 ${detail ? 'break-words' : 'truncate'}`}>{g.playerOf(t.playerId)?.name ?? 'Oyuncu'}</span>
                        <span className="num text-danger font-bold shrink-0 ml-2">{t.count} sakatlık</span>
                      </div>
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* v4: hakem profilleri */}
            <ExpandableRanking
              title="📋 Hakem Profilleri" rows={refereeProfiles} previewLimit={6} unit="hakem"
              testId="referee-profile-card" rowKey={(rf) => rf.label}
              detailNote="Yalnızca hakem bilgisi içeren kayıtlı maçlar kullanılır."
              empty={<div className="px-4 py-3 text-muted text-[12px]">Hakem etiketi taşıyan maç raporu birikince profiller burada belirir.</div>}
              renderRow={(rf, _i, detail) => (
                <div className={`${detail ? 'px-1' : 'px-4'} py-2.5 flex items-center gap-2`} data-referee={rf.label}>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] font-bold text-primary ${detail ? 'break-words' : 'truncate'}`}>{rf.label}</div>
                    <div className="text-[10px] text-muted num">{rf.matches} maçın · maç başı {rf.foulsPerMatch} faul · {rf.yellows} sarı {rf.reds} kırmızı</div>
                  </div>
                  <Badge kind={rf.strictness === 'strict' ? 'danger' : rf.strictness === 'lenient' ? 'ok' : 'muted'}>
                    {rf.strictness === 'strict' ? 'Sıkı' : rf.strictness === 'lenient' ? 'Yumuşak' : 'Dengeli'}
                  </Badge>
                  <span className="num text-[11px] font-extrabold text-secondary w-16 text-right shrink-0">{rf.myWins}G {rf.myDraws}B {rf.myLosses}M</span>
                </div>
              )}
            />

            <ExpandableRanking
              title="⚖️ xPTS Adalet Tablosu" rows={xptsRows.length ? leagueClubs : []} previewLimit={leagueClubs.length} unit="takım"
              rowKey={(club) => club.id}
              description={<>Maçların xG’lerinden Poisson modeliyle hesaplanan <b>beklenen puan</b> ile gerçek puan farkı.
                {xptsSource === 'league'
                  ? ' Tüm lig maçlarının xG’si fikstürlerden okunur; böylece bütün kulüpler aynı haftada tabloya girer.'
                  : ' Eski kayıtlarda lig geneli xG bulunmadığından veri yalnız senin oynadığın lig maçlarından birikir.'}</>}
              detailNote={xptsSource === 'league' ? 'Fikstürdeki xG verileri kullanılır.' : 'Eski kayıtlarda yalnızca arşivlenen maçlar kullanılır.'}
              empty={<div className="px-4 py-3 text-muted text-[12px]">Henüz arşivde lig maçı yok — ilk maçların ardından tablo burada belirir.</div>}
              renderRow={(club, _i, detail) => {
                const row = xptsRows.find((x) => x.clubId === club.id);
                const real = actualPts.get(club.id) ?? 0;
                const isMine = club.id === g.career.clubId;
                const diff = row ? real - row.xpts : 0;
                const luck = !row ? null : row.matches < 5 ? null : diff >= 4 ? '🍀 Şanslı' : diff <= -4 ? '😰 Hakkı yeniyor' : '➖ Dengeli';
                return (
                  <div className={`flex items-center gap-2 ${detail ? 'px-1' : 'px-4'} py-2 ${isMine ? 'bg-amber/5' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] font-semibold ${detail ? 'break-words' : 'truncate'}`}>{club.name}{isMine && <span className="text-amber text-[10px] font-bold ml-1">SEN</span>}</div>
                      <div className="text-[10px] text-muted num">{row ? `${row.matches} maç · xG ${row.xgf} – ${row.xga}` : 'veri birikiyor…'}</div>
                    </div>
                    {row && luck && <span className="text-[9.5px] font-bold text-secondary shrink-0">{luck}</span>}
                    <div className="text-right shrink-0 w-[74px]">
                      <div className="num text-[13px] font-extrabold text-ink">{row ? row.xpts.toFixed(1) : '—'} <span className="text-[9px] text-muted font-normal">xPTS</span></div>
                      <div className="num text-[10px] text-muted">{real} gerçek</div>
                    </div>
                  </div>
                );
              }}
            />

            <ExpandableRanking
              title="🕊️ Fair Play Ligi" rows={fairPlayRows} previewLimit={fairPlayRows.length} unit="takım"
              rowKey={(row) => row.clubId}
              description="Düşük puan centilmenlik demek: sarı kart 1, kırmızı kart 3, faul 0.25 puan. Sıralama maç başına puanla yapılır."
              detailNote="Yalnızca arşive kaydedilmiş lig maçlarının verileri yer alır."
              empty={<div className="px-4 py-3 text-muted text-[12px]">Kart ve faul verisi ilk lig maçlarından sonra birikir.</div>}
              renderRow={(r, i, detail) => {
                const club = clubByIdSafe(r.clubId);
                const isMine = r.clubId === g.career.clubId;
                return (
                  <div className={`flex items-center gap-2.5 ${detail ? 'px-1' : 'px-4'} py-2 ${isMine ? 'bg-amber/5' : ''}`}>
                    <span className={`num w-5 shrink-0 text-center text-[12px] font-extrabold ${i === 0 ? 'text-amber' : 'text-muted'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] font-semibold ${detail ? 'break-words' : 'truncate'}`}>{club?.name ?? r.clubId}{isMine && <span className="text-amber text-[10px] font-bold ml-1">SEN</span>}</div>
                      <div className="text-[10px] text-muted num">{r.yellows} sarı · {r.reds} kırmızı · {r.fouls} faul · {r.matches} maç</div>
                    </div>
                    <span className="num text-[13px] font-extrabold text-ink shrink-0">{r.perMatch.toFixed(2)}</span>
                  </div>
                );
              }}
            />
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
      <Sheet open={!!archiveMatch} onClose={() => setArchiveMatch(null)} title="Maç Arşivi · Öne Çıkan Anlar" tall>
        {archiveMatch && (archiveHome && archiveAway
          ? <MatchHighlights home={archiveHome} away={archiveAway} homeGoals={archiveMatch.hg} awayGoals={archiveMatch.ag} events={archiveEvents} archived reduceMotion={g.career.settings.reduceMotion} />
          : <p className="text-secondary text-[12px]">Bu eski kayıtta takım bilgileri bulunamadı.</p>)}
      </Sheet>
    </div>
  );
};
