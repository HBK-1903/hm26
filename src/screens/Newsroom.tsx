// Wave 13 — newsroom views derive from stored results, tables and detailed match reports only.
import React, { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { CLUBS, clubByIdSafe } from '../data/clubs';
import { internationalFixtures } from '../data/international';
import { buildHeadlines, buildMatchNews, leaguePulse, refereeReportEntries, selectTeamOfWeek, type MatchNewsTag } from '../data/newsroom';
import { Card, Badge, Seg } from '../components/ui/kit';
import { Crest } from '../components/assets/Crest';
import { GameIcon } from '../components/icons';
import { normalizeClubCulture } from '../data/culture';
import { fanPulse, type PulseTone } from '../engine/atmosphere';
import { normalizeMyMatches } from '../engine/teamInsights';
import { buildPressProfile } from '../engine/pressProfile';
import { buildLeagueLuckSnapshot } from '../engine/analytics';

const NEWS_TAG_STYLE: Record<MatchNewsTag, { label: string; cls: string }> = {
  derbi: { label: 'Derbi', cls: 'bg-danger/15 text-danger border-danger/40' },
  farkli: { label: 'Farklı Skor', cls: 'bg-ok/15 text-ok border-ok/40' },
  temiz: { label: 'Gol Yememe', cls: 'bg-info/15 text-info border-info/40' },
  xg: { label: 'xG Analizi', cls: 'bg-amber/15 text-amber border-amber/40' },
  gollu: { label: 'Gollü Maç', cls: 'bg-muted/15 text-secondary border-line' },
  'geri-donus': { label: 'Geri Dönüş', cls: 'bg-ok/15 text-ok border-ok/40' },
  cokus: { label: 'Çöküş', cls: 'bg-warn/15 text-warn border-warn/40' },
  kirmizi: { label: 'Kırmızı Kart', cls: 'bg-danger/25 text-danger border-danger/50' },
  var: { label: 'VAR', cls: 'bg-special/15 text-special border-special/40' },
  'son-dakika': { label: 'Son Dakika', cls: 'bg-primary/15 text-primary border-primary/40' },
  sonuc: { label: 'Maç Sonucu', cls: 'bg-muted/15 text-secondary border-line' },
};
const OUTCOME_LABEL = { win: 'Galibiyet sonrası', draw: 'Beraberlik sonrası', loss: 'Mağlubiyet sonrası' } as const;

const TABS = [
  { v: 'headlines', label: 'Manşet' },
  { v: 'pulse', label: 'Lig Nabzı' },
  { v: 'xi', label: 'Haftanın 11’i' },
  { v: 'referees', label: 'Hakemler' },
  { v: 'fans', label: 'Taraftar' },
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
  const matchNews = useMemo(
    () => buildMatchNews(
      g.matchReports ?? [],
      g.career.clubId,
      (id) => clubByIdSafe(id)?.short ?? id,
      (h, a) => (clubByIdSafe(h)?.rivalIds ?? []).includes(a) || clubByIdSafe(h)?.derby === a,
    ),
    [g.matchReports, g.career.clubId],
  );
  const pressProfile = useMemo(() => buildPressProfile(g.inbox), [g.inbox]);
  const pulse = useMemo(() => leaguePulse(g.table[g.myLeague] ?? [], CLUBS), [g.table, g.myLeague]);
  const fromDay = Math.max(1, g.career.day - 6);
  const teamOfWeek = useMemo(() => selectTeamOfWeek(g.matchReports ?? [], fromDay, g.career.day, (id) => g.playerOf(id)), [g.matchReports, fromDay, g.career.day, g.playerOf]);
  const refereeReports = useMemo(() => refereeReportEntries(g.matchReports ?? []), [g.matchReports]);
  // v4: xPTS–gerçek puan farkından lig şans/fırsat özeti
  const luckRows = useMemo(
    () => buildLeagueLuckSnapshot(g.fixtures, g.table[g.myLeague] ?? []),
    [g.fixtures, g.table, g.myLeague],
  );
  const latestDate = allFixtures.filter((fixture) => fixture.played).reduce((day, fixture) => Math.max(day, fixture.day), 0);
  // Dalga 7: taraftar nabzı — gerçek kültür değerleri + oynanmış maçların sonuç şeridi
  const fanData = useMemo(() => {
    const culture = normalizeClubCulture(g.career.culture, g.career.seed, g.career.clubId, g.myClub.rivalIds ?? []);
    const results = normalizeMyMatches(g.matchReports ?? [], g.career.clubId, g.seasonNo).map((m) => m.result);
    return { pulse: fanPulse(culture, results), culture, results };
  }, [g.career.culture, g.career.seed, g.career.clubId, g.myClub.rivalIds, g.matchReports, g.seasonNo]);

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
            {/* Maç raporlarından türetilen kanıta dayalı hikâyeler — yalnız gerçek arşiv */}
            {matchNews.length > 0 && (
              <Card className="!p-0 overflow-hidden" >
                <div data-testid="match-news">
                  <div className="px-4 py-2.5 border-b border-line font-display font-bold text-[13px]">📰 Maçın Hikâyesi</div>
                  {matchNews.map((item) => {
                    const tag = NEWS_TAG_STYLE[item.tag];
                    return (
                      <div key={item.id} data-testid="match-news-item" data-news-tag={item.tag} className="px-4 py-2.5 border-b border-line/40 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9.5px] font-black border rounded-md px-1.5 py-0.5 ${tag.cls}`}>{tag.label}</span>
                          <span className="text-muted text-[11px] num">{item.comp} · Gün {item.day}</span>
                        </div>
                        <div className="font-display text-primary text-[15px] font-bold mt-1.5">{item.title}</div>
                        <div className="text-secondary text-[12px] mt-0.5 leading-snug">{item.detail}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Menajer basın profili — röportaj seçimlerinin gerçek sayımı */}
            {pressProfile.total > 0 && (
              <Card className="!p-3.5">
                <div data-testid="press-profile">
                  <div className="m26-overline flex items-center gap-1.5"><span>🎙️</span> Menajer Basın Profili</div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-display text-primary text-[22px] font-black num">{pressProfile.total}</span>
                    <span className="text-secondary text-[12px]">röportajda konuştu</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-center">
                    {(['win', 'draw', 'loss'] as const).map((k) => (
                      <div key={k} className="bg-base rounded-lg py-1.5">
                        <div className="num text-primary font-extrabold text-[14px]">{pressProfile.byOutcome[k]}</div>
                        <div className="text-muted text-[9px] uppercase">{OUTCOME_LABEL[k]}</div>
                      </div>
                    ))}
                  </div>
                  {pressProfile.mostUsedTone && (
                    <p className="text-secondary text-[11.5px] mt-2.5 leading-snug">
                      En sık tercih ettiğin ton: <b className="text-amber">{pressProfile.mostUsedTone.label}</b> ({pressProfile.mostUsedTone.count} kez)
                    </p>
                  )}
                </div>
              </Card>
            )}

            {luckRows.length >= 4 && (
              <Card className="!p-3.5" >
                <div data-testid="league-luck-card">
                  <div className="m26-overline mb-2">🍀 Lig Nabzı · xPTS Adaleti</div>
                  <p className="text-muted text-[11px] leading-snug mb-2.5">Beklenen puanla gerçek puan arasındaki fark; pozitif değer puanın beklentinin üstünde toplandığını gösterir.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(() => {
                      const luckiest = luckRows[0];
                      const unluckiest = luckRows[luckRows.length - 1];
                      const xgLeader = [...luckRows].sort((a, b) => b.xpts - a.xpts)[0];
                      const cell = (title: string, clubId: string, value: string, tone: 'ok' | 'danger' | 'info') => (
                        <div key={title} className="bg-base rounded-lg p-2.5">
                          <div className="text-[9.5px] text-muted uppercase">{title}</div>
                          <div className="text-[12.5px] font-bold text-primary truncate mt-0.5">{clubByIdSafe(clubId)?.name ?? clubId}</div>
                          <div className={`num text-[12px] font-extrabold mt-0.5 ${tone === 'ok' ? 'text-ok' : tone === 'danger' ? 'text-danger' : 'text-info'}`}>{value}</div>
                        </div>
                      );
                      return (
                        <>
                          {cell('En şanslı', luckiest.clubId, `+${luckiest.diff.toFixed(1)} puan`, 'ok')}
                          {cell('Hakkı yeniyor', unluckiest.clubId, `${unluckiest.diff.toFixed(1)} puan`, 'danger')}
                          {cell('xPTS lideri', xgLeader.clubId, `${xgLeader.xpts.toFixed(1)} xPTS`, 'info')}
                          {cell('Senin durumun', g.career.clubId, (() => { const me = luckRows.find((r) => r.clubId === g.career.clubId); return me ? `${me.diff >= 0 ? '+' : ''}${me.diff.toFixed(1)} puan` : '—'; })(), 'info')}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            )}
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

        {tab === 'fans' && (
          <>
            <Card className="!p-3.5">
              <div data-testid="fan-pulse">
              <div className="flex items-center gap-2"><span className="text-[18px]">📣</span><div><div className="m26-overline">Taraftar nabzı</div><div className="text-primary font-display text-[17px] font-bold">Tribün Masası</div></div></div>
              <p className="text-secondary text-[12.5px] mt-3 leading-snug" data-momentum-text>{fanData.pulse.momentumLabel}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {([
                  ['Taraftar güveni', fanData.pulse.trust, fanData.culture.fanTrust],
                  ['Taraftar ısısı', fanData.pulse.heat, fanData.culture.ultrasHeat],
                  ['Topluluk bağı', fanData.pulse.community, fanData.culture.communityTrust],
                  ['Disiplin imajı', fanData.pulse.discipline, fanData.culture.discipline],
                ] as [string, { tone: PulseTone; label: string }, number][]).map(([label, level, value]) => (
                  <div key={label} className="bg-base rounded-lg p-2.5 border border-line/60">
                    <div className="text-muted text-[10px] font-bold">{label}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`num text-[15px] font-black ${level.tone === 'ok' ? 'text-ok' : level.tone === 'info' ? 'text-info' : level.tone === 'warn' ? 'text-warn' : 'text-danger'}`}>{value}</span>
                      <span className="text-[10px] font-bold text-secondary">{level.label}</span>
                    </div>
                    <div className="h-1.5 bg-line/50 rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${level.tone === 'ok' ? 'bg-ok' : level.tone === 'info' ? 'bg-info' : level.tone === 'warn' ? 'bg-warn' : 'bg-danger'}`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {fanData.pulse.noMatches && <p className="text-muted text-[11px] mt-3 leading-relaxed">Trend yorumu ilk resmî maçların ardından gelecek; gösterilen göstergeler kulübün canlı kültür verisidir, tahmin üretilmez.</p>}
              </div>
            </Card>

            <Card className="!p-3.5">
              <div className="m26-overline">Ezeli rekabet</div>
              {fanData.culture.nemesisClubId && clubByIdSafe(fanData.culture.nemesisClubId) ? (
                <div className="flex items-center gap-2.5 mt-2">
                  <Crest club={clubByIdSafe(fanData.culture.nemesisClubId)!} size={30} />
                  <div className="min-w-0">
                    <div className="text-primary text-[13px] font-bold truncate">{clubByIdSafe(fanData.culture.nemesisClubId)?.name}</div>
                    <div className="text-muted text-[11px]">Son hesaplaşmalar tribünlerin hafızasında taze — bu eşleşme ekstra motivasyon getirir.</div>
                  </div>
                </div>
              ) : (
                <p className="text-secondary text-[12px] mt-2">Şu an işaretlenmiş bir ezeli rakip yok; rekabet kimliği derbi sonuçlarıyla şekillenir.</p>
              )}
            </Card>

            <Card className="!p-3.5">
              <div className="m26-overline">Sezon sonuç şeridi</div>
              {fanData.results.length === 0 ? (
                <p className="text-secondary text-[12px] mt-2">Henüz oynanmış maç yok — şerit ilk maçla birlikte dolacak.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2" data-result-strip>
                  {fanData.results.map((r, i) => (
                    <span key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center num text-[13px] font-black border ${r === 'W' ? 'bg-ok/15 border-ok/50 text-ok' : r === 'D' ? 'bg-muted/15 border-line text-muted' : 'bg-danger/15 border-danger/50 text-danger'}`}>
                      {r === 'W' ? 'G' : r === 'D' ? 'B' : 'M'}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};
