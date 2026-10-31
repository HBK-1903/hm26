// HM26 — §5.8 Müsabakalar (Aşama 1: 3 lig puan tablosu + Miras Kupası grupları + eleme ağacı)
import React, { useMemo, useState } from 'react';
import { Card, Badge } from '../components/ui/kit';
import { ExpandableRanking } from '../components/ui/ExpandableRanking';
import { Crest } from '../components/assets/Crest';
import { useGame } from '../store/game';
import { GameIcon } from '../components/icons';
import { PlayerPortrait } from '../components/assets/Portrait';
import { clubById, clubByIdSafe, LEAGUES } from '../data/clubs';
import { LeagueId, TableRow } from '../types';
import { cupGroupTable, dayToDate } from '../data/calendar';
import { internationalGroupTable, type InternationalCupId } from '../data/international';
import { seasonRatings } from '../engine/seasonRatings';

type Tab = 'ligler' | 'fikstur' | 'kupa' | 'agac' | 'istatistik' | 'uluslararasi';

export const CompsScreen: React.FC = () => {
  const g = useGame();
  const [tab, setTab] = useState<Tab>('ligler');
  const [league, setLeague] = useState<LeagueId>(g.myLeague);
  const [cupGroup, setCupGroup] = useState('A');
  const [internationalCupId, setInternationalCupId] = useState<InternationalCupId>('champions');
  const internationalCup = g.international?.cups.find((competition) => competition.id === internationalCupId);
  const internationalScorers = Object.values(internationalCup?.scorers ?? {}).sort((a, b) => b.goals - a.goals || a.playerId.localeCompare(b.playerId));
  const ratings = useMemo(() => seasonRatings(g.playerStats ?? {}, g.matchReports ?? [], g.seasonNo), [g.playerStats, g.matchReports, g.seasonNo]);

  const myRank = g.table[g.myLeague].findIndex((r) => r.clubId === g.myClub.id) + 1;

  const leagueFixtures = useMemo(() => {
    const f = g.fixtures.filter((x) => x.league === league);
    const played = f.filter((x) => x.played);
    const upcoming = f.filter((x) => !x.played).slice(0, 30);
    return { played: played.slice(-30).reverse(), upcoming };
  }, [g.fixtures, league]);

  // Derin-QA gap: puan tablosunda son 5 maç form şeridi (G/B/M, yeniden eskiye)
  const formByClub = useMemo(() => {
    const out: Record<string, ('G' | 'B' | 'M')[]> = {};
    const played = g.fixtures.filter((x) => x.league === league && x.played).sort((a, b) => b.day - a.day);
    for (const fx of played) {
      for (const [id, gf, ga] of [[fx.homeId, fx.hg ?? 0, fx.ag ?? 0], [fx.awayId, fx.ag ?? 0, fx.hg ?? 0]] as [string, number, number][]) {
        const arr = (out[id] ??= []);
        if (arr.length < 5) arr.push(gf > ga ? 'G' : gf === ga ? 'B' : 'M');
      }
    }
    return out;
  }, [g.fixtures, league]);

  const gk = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const groupTable = useMemo(() => cupGroupTable(g.cup, cupGroup), [g.cup, cupGroup]);
  const userGroupT = (Object.entries(g.cup.groups) as [string, string[]][]).find(([, arr]) => arr.includes(g.career.clubId));

  return (
    <div className="h-full flex flex-col safe-t">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-xl text-primary">Müsabakalar</h1>
        <div className="text-muted text-[11px] mt-0.5">S{g.seasonNo} · {LEAGUES[g.myLeague].name}'nde {myRank > 0 ? `${myRank}.` : '—'} sıradasın</div>
      </div>
      <div className="px-4 pb-2">
        <div className="grid grid-cols-3 bg-base rounded-xl p-1 gap-1" role="group" aria-label="Müsabaka bölümleri">
          {([['ligler', 'Ligler'], ['fikstur', 'Fikstür'], ['kupa', 'Miras'], ['agac', 'Eleme'], ['istatistik', 'Krallıklar'], ['uluslararasi', 'Kıtalar']] as [Tab, string][]).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setTab(value)} aria-pressed={tab === value}
              className={`min-h-touch rounded-lg text-[12px] font-bold transition-colors ${tab === value ? 'bg-elevated text-amber shadow-inner' : 'text-secondary'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">

        {tab === 'ligler' && (
          <div className="m26-in">
            <div className="flex bg-base rounded-xl p-1 gap-1 mb-3 sticky top-0 z-10">
              {(Object.keys(LEAGUES) as LeagueId[]).map((l) => (
                <button key={l} onClick={() => setLeague(l)} className={`flex-1 min-h-touch rounded-lg text-[12px] font-bold ${league === l ? 'bg-elevated text-amber' : 'text-secondary'}`}>
                  {LEAGUES[l].short}
                </button>
              ))}
            </div>
            <Card className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted font-bold uppercase border-b border-line/60">
                <span>Sıra · Kulüp</span><span>Puan</span>
              </div>
              <ol aria-label={`${LEAGUES[league].name} puan tablosu`}>
                {g.table[league].map((r: TableRow, i: number) => {
                  const c = clubById(r.clubId);
                  const mine = r.clubId === g.career.clubId;
                  const form = (formByClub[r.clubId] ?? []).slice().reverse();
                  const diff = r.gf - r.ga;
                  return (
                    <li key={r.clubId} data-league-club={r.clubId} className={`px-3 py-2 border-b border-line/30 last:border-0 ${mine ? 'bg-amber/5' : ''}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`num w-5 shrink-0 text-[12px] font-bold ${i < 2 ? 'text-ok' : i >= g.table[league].length - 2 ? 'text-danger' : 'text-secondary'}`}>{i + 1}</span>
                        <Crest club={c} size={20} />
                        <span data-club-name className={`min-w-0 flex-1 text-[12px] leading-snug break-words ${mine ? 'text-amber font-bold' : 'text-primary font-semibold'}`}>
                          {c.name} <span className="text-muted text-[10px] font-semibold">({c.short})</span>
                        </span>
                        <span className={`num shrink-0 text-[13px] font-extrabold ${mine ? 'text-amber' : 'text-primary'}`} aria-label={`${r.pts} puan`}>{r.pts}</span>
                      </div>
                      <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_64px] items-center gap-1 mt-1.5 text-[10px] text-secondary" aria-label="Maç istatistikleri">
                        {([['O', 'Oynanan', r.p], ['G', 'Galibiyet', r.w], ['B', 'Beraberlik', r.d], ['M', 'Mağlubiyet', r.l], ['AV', 'Averaj', diff > 0 ? `+${diff}` : diff]] as const).map(([short, label, value]) => (
                          <span key={short} className="whitespace-nowrap" aria-label={`${label}: ${value}`}><span className="text-muted">{short}</span> <b className="num text-primary">{value}</b></span>
                        ))}
                        <span className="flex items-center justify-end gap-[2px]" aria-label={form.length ? `Son 5 maç, eskiden yeniye: ${form.join(' ')}` : 'Henüz form verisi yok'} title="Son 5 maç (soldan yeniye)">
                          <span className="text-muted mr-1">Form</span>
                          {form.map((result, fi) => (
                            <span key={fi} aria-hidden="true" className="inline-block rounded-[3px]" style={{ width: 7, height: 14, background: result === 'G' ? 'var(--c-ok)' : result === 'B' ? 'var(--c-warn)' : 'var(--c-danger)', opacity: 0.35 + fi * 0.16 }} />
                          ))}
                          {form.length === 0 && <span className="text-muted">—</span>}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
            <p className="text-[11px] text-muted mt-2 leading-snug">
              {league === 'zirve' ? 'İlk 2 → şampiyonluk havuzu; son 2 → Geçit Ulusal\'a düşer.' : league === 'gecit' ? 'İlk 2 → Miras Zirve\'ye yükselir; son 2 → Kök Bölge\'ye düşer.' : 'İlk 2 → Geçit Ulusal\'a yükselir.'} Renkli satır: senin kulübün.
            </p>
          </div>
        )}

        {tab === 'fikstur' && (
          <div className="m26-in space-y-4">
            <div>
              <div className="text-[12px] font-bold text-amber uppercase tracking-wider mb-2">Sonraki Maçlar</div>
              {leagueFixtures.upcoming.length === 0 && <p className="text-muted text-sm">Bu ligde kalan maç yok.</p>}
              <div className="space-y-1.5">
                {leagueFixtures.upcoming.slice(0, 18).map((f, i) => (
                  <FixtureRow key={i} fx={f} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[12px] font-bold text-muted uppercase tracking-wider mb-2">Sonuçlar</div>
              <div className="space-y-1.5">
                {leagueFixtures.played.map((f, i) => (
                  <FixtureRow key={i} fx={f} played />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'kupa' && (
          <div className="m26-in">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {gk.map((x) => (
                <button key={x} onClick={() => setCupGroup(x)}
                  className={`min-w-[38px] min-h-[38px] rounded-lg text-[13px] font-bold border ${cupGroup === x ? 'bg-amber/15 border-amber text-amber' : 'bg-surface border-line text-secondary'} ${userGroupT?.[0] === x ? 'ring-1 ring-amber/60' : ''}`}>
                  {x}
                </button>
              ))}
            </div>
            {userGroupT?.[0] === cupGroup && <Badge kind="warn" className="mb-2">Senin grubun</Badge>}
            <Card className="!p-0 overflow-hidden">
              <div className="grid grid-cols-[26px_1fr_repeat(5,26px)] px-2.5 py-2 text-[10px] text-muted font-bold uppercase border-b border-line/60">
                <span>#</span><span>Kulüp</span>
                <span className="text-center">O</span><span className="text-center">G</span><span className="text-center">B</span><span className="text-center">M</span><span className="text-center">P</span>
              </div>
              {groupTable.map((r, i) => {
                const c = clubById(r.clubId);
                const mine = r.clubId === g.career.clubId;
                const allPlayed = g.cup.fixtures.every((f) => f.played);
                return (
                  <div key={r.clubId} className={`grid grid-cols-[26px_1fr_repeat(5,26px)] px-2.5 py-2.5 items-center border-b border-line/30 last:border-0 text-[12px] ${mine ? 'bg-amber/5' : ''}`}>
                    <span className={`num font-bold ${i === 0 && allPlayed ? 'text-ok' : i === 1 ? 'text-amber' : 'text-secondary'}`}>{i + 1}</span>
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Crest club={c} size={20} />
                      <span className={`truncate ${mine ? 'text-amber font-bold' : 'text-primary'}`}>{c.short}</span>
                    </span>
                    <span className="text-center num text-secondary">{r.p}</span>
                    <span className="text-center num text-secondary">{r.w}</span>
                    <span className="text-center num text-secondary">{r.d}</span>
                    <span className="text-center num text-secondary">{r.l}</span>
                    <span className={`text-center num font-bold ${mine ? 'text-amber' : 'text-primary'}`}>{r.pts}</span>
                  </div>
                );
              })}
            </Card>
            <p className="text-[11px] text-muted mt-2 leading-snug">Grup maç günleri: {g.cup.fixtures.filter((f) => f.homeId === g.career.clubId || f.awayId === g.career.clubId).map((f) => `${f.day}. gün (${dayToDate(f.day).split(' ').slice(0, 2).join(' ')})`).join(' · ') || '—'}. 9 lider + en iyi 7 ikinci Son 16'ya yükselir.</p>
            <div className="mt-3">
              <div className="text-[12px] font-bold text-muted uppercase tracking-wider mb-2">Grup {cupGroup} Maçları</div>
              <div className="space-y-1.5">
                {g.cup.fixtures.filter((f) => f.group === cupGroup).map((f, i) => <FixtureRow key={i} fx={f} played={f.played} cup />)}
              </div>
            </div>
          </div>
        )}

        {tab === 'istatistik' && (
          <div className="m26-in space-y-2.5">
            {(() => {
              const stats = Object.values(g.playerStats ?? {});
              if (!stats.length) return <Card><p className="text-secondary text-[13px] text-center py-4">Sezon istatistikleri henüz oluşmadı. İlk resmi maçları oynayın.</p></Card>;
              const byLeague = stats.filter((s) => g.leagueOf[s.clubId] === league);
              const topGoals = [...byLeague].sort((a, b) => b.goals - a.goals);
              const topAssists = [...byLeague].sort((a, b) => b.assists - a.assists);
              const topRating = [...byLeague].filter((s) => (ratings[s.playerId]?.games ?? 0) >= 3).sort((a, b) => ratings[b.playerId].average - ratings[a.playerId].average);
              const leagueShot = (list: typeof stats, metric: (s: (typeof stats)[0]) => string, label: string) => (
                <ExpandableRanking
                  title={label} rows={list} previewLimit={8} unit="oyuncu" rowKey={(row) => row.playerId}
                  detailNote={`${LEAGUES[league].name} kulüplerindeki oyuncuların tüm müsabakalardaki sezon toplamları.`}
                  empty={<p className="text-muted text-[11.5px] text-center py-2 italic">Bu ligde veri henüz yok</p>}
                  renderRow={(s, i, detail) => {
                    const p = (g.squads[s.clubId] ?? []).find((x) => x.id === s.playerId) ?? null;
                    const club = clubByIdSafe(s.clubId);
                    return (
                      <div className={`flex items-center gap-2 ${detail ? 'px-1' : 'px-4'} py-1.5`}>
                        <span className={`num w-5 shrink-0 text-center font-bold text-[11.5px] ${i === 0 ? 'text-amber' : i < 3 ? 'text-ok' : 'text-muted'}`}>{i + 1}</span>
                        {p && <PlayerPortrait player={p} size={24} />}
                        <span className={`text-primary text-[12px] font-semibold flex-1 min-w-0 ${detail ? 'break-words' : 'truncate'}`}>{p?.name ?? s.playerId}</span>
                        {club && <span className="text-muted text-[10px] shrink-0">{club.short}</span>}
                        <span className="num font-bold text-primary text-[12px] shrink-0">{metric(s)}</span>
                      </div>
                    );
                  }}
                />
              );
              return (
                <>
                  <div className="flex gap-1.5">
                    {(Object.keys(LEAGUES) as LeagueId[]).map((l) => (
                      <button key={l} onClick={() => setLeague(l)} className={`flex-1 min-h-touch rounded-xl text-[11px] font-bold border ${league === l ? 'bg-accent text-[var(--c-on-accent)] border-transparent' : 'bg-surface text-secondary border-line'}`}>{LEAGUES[l].short}</button>
                    ))}
                  </div>
                  {leagueShot(topGoals, (s) => `${s.goals} gol`, 'Gol Krallığı (sezon)')}
                  {leagueShot(topAssists, (s) => `${s.assists} asist`, 'Asist Krallığı (sezon)')}
                  {leagueShot(topRating, (s) => `${ratings[s.playerId].source === 'legacy' ? '≈' : ''}${ratings[s.playerId].average.toFixed(1)}`, 'Ortalama Reyting (min 3 maç)')}
                  <p className="text-muted text-[11px] leading-snug">Reyting sadece puanı olan maçlardan hesaplanır; ≈ işaretli eski toplamlar rapor eksikse yaklaşık olabilir.</p>
                </>
              );
            })()}
          </div>
        )}

        {tab === 'agac' && (
          <div className="m26-in">
            {g.cup.rounds.length === 0 && (
              <Card className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 text-accent"><GameIcon id={('sprout') as string} className="w-full h-full" /></div>
                <div className="text-primary font-bold">Eleme ağacı henüz belli değil</div>
                <p className="text-secondary text-[12px] mt-1.5 leading-snug">Grup aşaması tamamlandığında 9 grup lideri + en iyi 7 ikinci Son 16'ya yükselir ve kura burada görünür.</p>
              </Card>
            )}
            {g.cup.rounds.map((r) => (
              <Card key={r.name} className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-primary font-bold text-[14px]">{r.name}</div>
                  <span className="text-[11px] text-muted">{r.day}. gün · {dayToDate(r.day)}</span>
                </div>
                <div className="space-y-2">
                  {r.ties.map((t) => {
                    const h = clubById(t.homeId), a = clubById(t.awayId);
                    const mine = t.homeId === g.career.clubId || t.awayId === g.career.clubId;
                    const winnerName = t.winner ? clubById(t.winner).short : null;
                    return (
                      <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${mine ? 'border-amber bg-amber/5' : 'border-line/50 bg-base'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[12.5px]">
                            <Crest club={h} size={18} /><span className={t.winner === h.id ? 'text-primary font-bold' : t.winner ? 'text-muted line-through' : 'text-primary'}>{h.short}</span>
                            <span className="num text-amber font-bold mx-1">{t.hg ?? '–'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[12.5px] mt-0.5">
                            <Crest club={a} size={18} /><span className={t.winner === a.id ? 'text-primary font-bold' : t.winner ? 'text-muted line-through' : 'text-secondary'}>{a.short}</span>
                            <span className="num text-amber font-bold mx-1">{t.ag ?? '–'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {t.pens && <div className="text-[10px] text-warn">pen.</div>}
                          {winnerName && <div className="text-[10.5px] font-bold text-ok">→ {winnerName}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
            {g.cup.champion && (
              <Card className="border-amber bg-amber/5 text-center">
                <div className="w-8 h-8 mx-auto text-accent"><GameIcon id={('comps') as string} className="w-full h-full" /></div>
                <div className="text-amber font-display text-lg">{clubById(g.cup.champion).name}</div>
                <div className="text-secondary text-[12px]">Miras Kupası Şampiyonu</div>
              </Card>
            )}
          </div>
        )}

        {tab === 'uluslararasi' && internationalCup && (
          <div className="m26-in space-y-2.5">
            <div className="flex gap-1.5">
              {g.international.cups.map((competition) => <button key={competition.id} onClick={() => setInternationalCupId(competition.id)} className={`flex-1 min-h-touch rounded-xl border px-2 text-[11px] font-bold ${internationalCupId === competition.id ? 'bg-accent text-[var(--c-on-accent)] border-accent' : 'bg-surface text-secondary border-line'}`}>{competition.id === 'champions' ? 'Şampiyonlar' : 'Kıtalar Kupası'}</button>)}
            </div>
            <Card accent="var(--c-accent)">
              <div className="flex items-start justify-between gap-2"><div><div className="text-primary font-bold text-[15px]">{internationalCup.name}</div><div className="text-muted text-[11px] mt-1">Sezon {internationalCup.seasonNo} · 16 takım · 4 grup · eleme: çeyrek finalden</div></div><Badge kind={internationalCup.champion ? 'ok' : 'info'}>{internationalCup.champion ? 'Tamamlandı' : 'Devam ediyor'}</Badge></div>
              <p className="text-secondary text-[11.5px] leading-relaxed mt-2">Yeterlilik: Kupa A — Miras Kupası sahibi + üst sıralar; Kupa B — finalist + sonraki lig sıraları. Boş yerler domestic merit sırasıyla doldurulur. Her kupada 8 yerli + 8 yabancı; 24 kurgusal dış kulüpten 16’sı katsayı sırasıyla gelir. Gruplardan ilk 2 çeyrek finale çıkar.</p>
              {internationalCup.qualifiers.some((row) => row.clubId === g.career.clubId) ? <Badge kind="ok" className="mt-2">Kulübün bu kupaya katılıyor</Badge> : <Badge kind="warn" className="mt-2">Bu sezon bu kupaya katılmıyorsun</Badge>}
              {internationalCup.champion && <div className="text-center mt-3"><div className="text-amber font-display text-lg">{clubById(internationalCup.champion).name}</div><div className="text-muted text-[11px]">Şampiyon{internationalCup.runnerUp ? ` · Finalist: ${clubById(internationalCup.runnerUp).short}` : ''}</div></div>}
            </Card>

            <div className="grid grid-cols-2 gap-2">
              {Object.keys(internationalCup.groups).sort().map((group) => {
                const rows = internationalGroupTable(internationalCup, group);
                const completed = internationalCup.fixtures.filter((fixture) => fixture.group === group).every((fixture) => fixture.played);
                return <Card key={group} className="!p-2.5">
                  <div className="flex items-center justify-between mb-1.5"><div className="text-primary text-[12px] font-bold">Grup {group}</div><Badge kind={completed ? 'ok' : 'info'}>{completed ? 'Bitti' : 'Grupta'}</Badge></div>
                  <div className="grid grid-cols-[18px_1fr_25px_28px] text-[9px] uppercase text-muted border-b border-line pb-1"><span>#</span><span>Kulüp</span><span className="text-center">O</span><span className="text-right">P</span></div>
                  {rows.map((row, index) => { const team = clubById(row.clubId); return <div key={row.clubId} className={`grid grid-cols-[18px_1fr_25px_28px] items-center py-1 border-b border-line/30 last:border-0 text-[10.5px] ${row.clubId === g.career.clubId ? 'text-amber font-bold' : index < 2 && completed ? 'text-ok' : 'text-primary'}`}><span className="num">{index + 1}</span><span className="truncate flex items-center gap-1"><Crest club={team} size={14} />{team.short}</span><span className="num text-center">{row.p}</span><span className="num text-right font-bold">{row.pts}</span></div>; })}
                </Card>;
              })}
            </div>

            <ExpandableRanking
              title="Uluslararası gol krallığı" rows={internationalScorers} previewLimit={8} unit="oyuncu"
              rowKey={(scorer) => scorer.playerId} detailNote={`${internationalCup.name} için kayıtlı golcüler.`}
              empty={<p className="px-4 py-3 text-secondary text-[12px]">İlk uluslararası maçlar oynandığında gol krallığı burada oluşur.</p>}
              renderRow={(scorer, index, detail) => {
                const player = g.playerOf(scorer.playerId);
                const team = clubByIdSafe(scorer.clubId);
                return <div className={`flex items-center gap-2 ${detail ? 'px-1' : 'px-4'} py-1.5`}>
                  <span className={`num w-5 shrink-0 text-center font-bold ${index === 0 ? 'text-amber' : 'text-muted'}`}>{index + 1}</span>
                  {player && <PlayerPortrait player={player} size={25} />}
                  <span className={`text-primary text-[12px] font-semibold flex-1 min-w-0 ${detail ? 'break-words' : 'truncate'}`}>{player?.name ?? scorer.playerId}</span>
                  <span className="text-muted text-[10px] shrink-0">{team?.short ?? scorer.clubId}</span>
                  <span className="num text-amber font-bold shrink-0">{scorer.goals}</span>
                </div>;
              }}
            />

            {internationalCup.rounds.length ? internationalCup.rounds.map((round) => <Card key={round.name}>
              <div className="flex items-center justify-between mb-2"><div className="text-primary text-[13px] font-bold">{round.name}</div><span className="text-muted text-[10.5px]">Gün {round.day} · {dayToDate(round.day)}</span></div>
              <div className="space-y-1.5">{round.ties.map((tie) => { const home = clubById(tie.homeId), away = clubById(tie.awayId); return <div key={tie.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${tie.homeId === g.career.clubId || tie.awayId === g.career.clubId ? 'border-amber bg-amber/5' : 'border-line/50 bg-base'}`}><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 text-[12px]"><Crest club={home} size={17}/><span className="truncate">{home.short}</span><span className="num text-amber font-bold ml-auto">{tie.hg ?? '–'}</span></div><div className="flex items-center gap-1.5 text-[12px] mt-1"><Crest club={away} size={17}/><span className="truncate">{away.short}</span><span className="num text-amber font-bold ml-auto">{tie.ag ?? '–'}</span></div></div><div className="text-right">{tie.pens && <div className="text-[9px] text-warn">pen.</div>}{tie.winner && <div className="text-[10px] text-ok font-bold">{clubById(tie.winner).short} ✓</div>}</div></div>; })}</div>
            </Card>) : <Card className="border-dashed"><div className="text-primary text-[13px] font-bold">Eleme ağacı bekleniyor</div><p className="text-secondary text-[11.5px] mt-1">Dört grup tamamlandığında her grubun ilk iki takımı çeyrek finale yükselir.</p></Card>}

            <Card>
              <div className="text-primary text-[13px] font-bold">Geçmiş sezonlar</div>
              {g.internationalArchive.filter((entry) => entry.cupId === internationalCupId).slice().reverse().length ? <div className="mt-2 space-y-1.5">{g.internationalArchive.filter((entry) => entry.cupId === internationalCupId).slice().reverse().slice(0, 6).map((entry) => <div key={`${entry.seasonNo}-${entry.cupId}`} className="rounded-lg bg-base px-2.5 py-2"><div className="flex justify-between gap-2"><span className="text-primary text-[12px] font-semibold">S{entry.seasonNo} · {entry.champion ? clubById(entry.champion).short : 'Sonuç yok'}</span><span className="text-muted text-[10px]">{entry.participants.length} takım</span></div>{entry.runnerUp && <div className="text-muted text-[10.5px] mt-0.5">Finalist: {clubById(entry.runnerUp).short}</div>}</div>)}</div> : <p className="text-secondary text-[11.5px] mt-1">İlk sezon arşivi sezon tamamlandığında oluşur.</p>}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

const FixtureRow: React.FC<{ fx: { day: number; round: number; homeId: string; awayId: string; hg?: number; ag?: number; played?: boolean; comp?: string; group?: string }; played?: boolean; cup?: boolean }> = ({ fx, played, cup }) => {
  const h = clubById(fx.homeId), a = clubById(fx.awayId);
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] ${played ? 'border-line/40 bg-base' : 'border-line/60 bg-surface'}`}>
      <span className="text-muted text-[10.5px] w-[44px] shrink-0">{cup ? `G. ${fx.day}` : `H. ${fx.round}`}</span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <Crest club={h} size={16} /><span className="text-primary truncate">{played || fx.played ? h.short : h.short}</span>
      </div>
      <span className="num font-bold text-amber px-1.5">{played || fx.played ? `${fx.hg}–${fx.ag}` : '–'}</span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 justify-end">
        <span className="text-secondary truncate">{fx.played || played ? a.short : a.short}</span><Crest club={a} size={16} />
      </div>
    </div>
  );
};
