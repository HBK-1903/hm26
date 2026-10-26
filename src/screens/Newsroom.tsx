// Wave 13 — newsroom views derive from stored results, tables and detailed match reports only.
import React, { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { CLUBS, clubByIdSafe } from '../data/clubs';
import { internationalFixtures } from '../data/international';
import { buildHeadlines, leaguePulse, refereeReportEntries, selectTeamOfWeek } from '../data/newsroom';
import { Card, Badge, Seg } from '../components/ui/kit';
import { Crest } from '../components/assets/Crest';
import { GameIcon } from '../components/icons';

const TABS = [
  { v: 'headlines', label: 'Manşet' },
  { v: 'pulse', label: 'Lig Nabzı' },
  { v: 'xi', label: 'Haftanın 11’i' },
  { v: 'referees', label: 'Hakemler' },
] as const;

type NewsTab = typeof TABS[number]['v'];
const STRICTNESS: Record<'lenient' | 'balanced' | 'strict', string> = { lenient: 'Yumuşak', balanced: 'Dengeli', strict: 'Katı' };
const GROUP_LABEL: Record<string, string> = { GK: 'KL', CB: 'STP', FB: 'BK', WB: 'KB', DM: 'DOS', CM: 'MOS', AM: 'OOS', WG: 'KNT', ST: 'SN' };

export const NewsroomScreen: React.FC = () => {
  const g = useGame();
  const [tab, setTab] = useState<NewsTab>('headlines');
  const allFixtures = useMemo(() => [
    ...g.fixtures,
    ...g.friendlies,
    ...g.cup.fixtures,
    ...g.cup.rounds.flatMap((round) => round.ties.map((tie) => ({ ...tie, round: 0, played: !!tie.winner, day: round.day, comp: 'kupa-ko' as const }))),
    ...internationalFixtures(g.international?.cups ?? []),
  ], [g.fixtures, g.friendlies, g.cup, g.international]);
  const headlines = useMemo(() => buildHeadlines(allFixtures, (id) => clubByIdSafe(id)?.short ?? id), [allFixtures]);
  const pulse = useMemo(() => leaguePulse(g.table[g.myLeague] ?? [], CLUBS), [g.table, g.myLeague]);
  const fromDay = Math.max(1, g.career.day - 6);
  const teamOfWeek = useMemo(() => selectTeamOfWeek(g.matchReports ?? [], fromDay, g.career.day, (id) => g.playerOf(id)), [g.matchReports, fromDay, g.career.day, g.playerOf]);
  const refereeReports = useMemo(() => refereeReportEntries(g.matchReports ?? []), [g.matchReports]);
  const latestDate = allFixtures.filter((fixture) => fixture.played).reduce((day, fixture) => Math.max(day, fixture.day), 0);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <header className="shrink-0 px-4 pt-4 pb-3 border-b border-line bg-base/90">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="m26-overline flex items-center gap-1.5"><GameIcon id="news" className="w-4 h-4" /> HM26 · Kulüp Basın Odası</div>
            <h1 className="font-display text-primary text-[24px] font-bold leading-tight mt-1">Saha Defteri</h1>
            <p className="text-secondary text-[12px] mt-1">{g.myClub.name} · {g.myLeague === 'zirve' ? 'Miras Zirve' : g.myLeague === 'gecit' ? 'Geçit Ulusal' : 'Kök Bölge'} · Son teyitli maç günü {latestDate || '—'}</p>
          </div>
          <Crest club={g.myClub} size={42} />
        </div>
        <Seg ariaLabel="Basın odası bölümleri" className="mt-3" options={TABS.map((item) => ({ v: item.v, label: item.label }))} value={tab} onChange={(value) => setTab(value as NewsTab)} />
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 space-y-2.5">
        {tab === 'headlines' && (
          <>
            {headlines.length === 0 ? <Card className="text-center py-8"><GameIcon id="news" className="w-8 h-8 mx-auto text-muted" /><p className="text-primary font-bold mt-3">İlk maç sonucu beklendiği için manşet yok</p><p className="text-secondary text-[12px] mt-1">Basın masası yalnızca fikstürde kaydedilmiş skorları yayımlar.</p></Card> : headlines.map((item) => (
              <Card key={item.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2"><Badge kind="info">{item.comp}</Badge><span className="text-muted text-[11px] num">Gün {item.day}</span></div>
                <div className="font-display text-primary text-[17px] font-bold mt-2">{item.title}</div>
                <div className="text-secondary text-[13px] mt-1">{item.detail}</div>
              </Card>
            ))}
            <Card className="!p-3"><p className="text-muted text-[12px] leading-relaxed">Manşetler yalnız oynanmış ve skoru saklanmış fikstürlerden üretilir; sonuçlar bu ekrandan değiştirilemez.</p></Card>
          </>
        )}

        {tab === 'pulse' && (
          <>
            <Card className="!p-3.5">
              <div className="flex items-center gap-2"><GameIcon id="chart" className="w-5 h-5 text-amber" /><div><div className="m26-overline">Lig tablosu</div><div className="text-primary font-display text-[17px] font-bold">Güncel nabız</div></div></div>
              <div className="mt-3 space-y-1">
                {pulse.slice(0, 12).map((row) => <div key={row.clubId} className={`grid grid-cols-[24px_1fr_38px_40px] items-center gap-2 rounded-lg px-2 py-2 text-[12px] ${row.clubId === g.myClub.id ? 'bg-amber/10 border border-amber/30' : 'bg-base'}`}>
                  <span className="num text-muted">{row.rank}</span><span className="text-primary font-semibold truncate">{row.name}</span><span className="num text-secondary text-right">{row.p} M</span><span className="num text-amber font-bold text-right">{row.pts} p</span>
                </div>)}
              </div>
            </Card>
            <Card className="!p-3.5">
              <div className="m26-overline">Son oynanan skorlar</div>
              {headlines.filter((item) => item.comp === 'Lig').slice(0, 5).length === 0
                ? <p className="text-secondary text-[12px] mt-2">Henüz kaydedilmiş lig skoru yok.</p>
                : <div className="mt-2 space-y-2">{headlines.filter((item) => item.comp === 'Lig').slice(0, 5).map((item) => <div key={item.id} className="flex justify-between gap-2 text-[12.5px]"><span className="text-primary truncate">{item.detail}</span><span className="text-muted num shrink-0">G{item.day}</span></div>)}</div>}
            </Card>
          </>
        )}

        {tab === 'xi' && (
          <>
            {teamOfWeek.length === 0 ? <Card className="text-center py-8"><GameIcon id="squad" className="w-8 h-8 mx-auto text-muted" /><p className="text-primary font-bold mt-3">Henüz yeterli ayrıntılı maç karne kaydı yok</p><p className="text-secondary text-[12px] mt-1">Haftanın 11’i yalnız motorun ürettiği oyuncu puanı ve dakikaları kullanır; eksik puanlar tahmin edilmez.</p></Card> : (
              <Card className="!p-3.5">
                <div className="flex items-center justify-between gap-2"><div><div className="m26-overline">Gün {fromDay}–{g.career.day}</div><div className="font-display text-primary text-[18px] font-bold">Haftanın 11’i</div></div><Badge kind={teamOfWeek.length === 11 ? 'ok' : 'warn'}>{teamOfWeek.length}/11</Badge></div>
                <div className="mt-3 space-y-1.5">{teamOfWeek.map((player, index) => <div key={player.playerId} className="grid grid-cols-[24px_1fr_auto] gap-2 items-center rounded-lg bg-base px-2.5 py-2">
                  <span className="num text-muted text-[11px]">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0"><div className="text-primary text-[12.5px] font-bold truncate">{player.name}</div><div className="text-muted text-[11px]">{GROUP_LABEL[player.group] ?? player.group} · {CLUBS.find((club) => club.id === player.clubId)?.short ?? player.clubId}{player.goals ? ` · ${player.goals} gol` : ''}{player.assists ? ` · ${player.assists} asist` : ''}</div></div>
                  <span className="num text-ok font-black">{player.rating.toFixed(1)}</span>
                </div>)}</div>
                <p className="text-muted text-[11px] mt-3 leading-relaxed">Seçim yalnız güncel haftadaki resmî lig maçlarının ayrıntılı motor raporlarına dayanır. AI maçlarında oyuncu puanı üretilmediğinden tahminle doldurulmaz.</p>
              </Card>
            )}
          </>
        )}

        {tab === 'referees' && (
          <>
            {refereeReports.length === 0 ? <Card className="text-center py-8"><GameIcon id="whistle" className="w-8 h-8 mx-auto text-muted" /><p className="text-primary font-bold mt-3">Hakem raporu bekleniyor</p><p className="text-secondary text-[12px] mt-1">Raporlar yalnızca hakemi ve maç olayları kaydedilmiş ayrıntılı motor maçlarından yayımlanır.</p></Card> : refereeReports.map((report) => (
              <Card key={report.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><GameIcon id="whistle" className="w-5 h-5 text-warn" /><div><div className="text-primary font-bold">{report.referee?.label}</div><div className="text-secondary text-[11px]">{STRICTNESS[report.referee!.strictness]} · Gün {report.day}</div></div></div><Badge kind={report.referee?.strictness === 'strict' ? 'warn' : 'info'}>{report.foulsHome + report.foulsAway} faul</Badge></div>
                <div className="text-primary text-[13px] mt-3">{CLUBS.find((club) => club.id === report.homeId)?.short ?? report.homeId} {report.hg}–{report.ag} {CLUBS.find((club) => club.id === report.awayId)?.short ?? report.awayId}</div>
                <div className="text-secondary text-[12px] mt-1">Sarı {report.yellowsHome + report.yellowsAway} · Kırmızı {report.redsHome + report.redsAway} · xG {report.xgHome.toFixed(2)}–{report.xgAway.toFixed(2)}</div>
                <p className="text-muted text-[11px] mt-2 leading-relaxed">Bu özet, maç kaydındaki hakem profili ve reducer istatistiklerinden derlenmiştir; kart/sonuç yeniden yorumlanmaz.</p>
              </Card>
            ))}
          </>
        )}
      </main>
    </div>
  );
};
