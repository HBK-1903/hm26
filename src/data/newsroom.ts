// Wave 13 — headlines and weekly features are derived only from persisted match/table evidence.
import type { DemoFixture, MatchArchiveEntry, Player, TableRow } from '../types';
import type { Club } from '../types';

export interface EvidenceHeadline {
  id: string;
  day: number;
  title: string;
  detail: string;
  comp: string;
}

export const COMP_LABEL: Record<DemoFixture['comp'], string> = { lig: 'Lig', kupa: 'Miras Kupası', 'kupa-ko': 'Kupa elemesi', hazirlik: 'Hazırlık', 'intl-grup': 'Uluslararası grup', 'intl-ko': 'Uluslararası eleme' };

export function buildHeadlines(fixtures: readonly DemoFixture[], clubName: (id: string) => string, limit = 8): EvidenceHeadline[] {
  return fixtures.filter((fixture) => fixture.played && Number.isFinite(fixture.hg) && Number.isFinite(fixture.ag))
    .sort((a, b) => b.day - a.day || ((b.hg ?? 0) + (b.ag ?? 0)) - ((a.hg ?? 0) + (a.ag ?? 0)) || a.homeId.localeCompare(b.homeId))
    .slice(0, limit)
    .map((fixture) => {
      const hg = fixture.hg ?? 0, ag = fixture.ag ?? 0;
      const total = hg + ag, margin = Math.abs(hg - ag);
      const title = total >= 6 ? 'Gollü doksan dakika' : margin >= 3 ? 'Farklı galibiyet' : hg === ag ? 'Puanlar paylaşıldı' : 'Maç sonucu';
      return {
        id: `${fixture.comp}-${fixture.day}-${fixture.homeId}-${fixture.awayId}`,
        day: fixture.day,
        title,
        detail: `${clubName(fixture.homeId)} ${hg}–${ag} ${clubName(fixture.awayId)}`,
        comp: COMP_LABEL[fixture.comp],
      };
    });
}

export interface TeamOfWeekMember {
  playerId: string;
  name: string;
  clubId: string;
  group: string;
  rating: number;
  goals: number;
  assists: number;
}

export function selectTeamOfWeek(
  reports: readonly MatchArchiveEntry[], fromDay: number, toDay: number,
  playerLookup: (playerId: string) => Player | null,
): TeamOfWeekMember[] {
  const evidence = new Map<string, { clubId: string; group: string; ratingMinutes: number; minutes: number; goals: number; assists: number }>();
  reports.filter((report) => report.comp === 'lig' && report.day >= fromDay && report.day <= toDay).forEach((report) => {
    Object.entries(report.playerRows ?? {}).forEach(([playerId, row]) => {
      if (!Number.isFinite(row.rating) || row.min < 30) return;
      const player = playerLookup(playerId);
      if (!player) return;
      const current = evidence.get(playerId) ?? {
        clubId: report.playerClubIds?.[playerId] ?? player.clubId,
        group: row.posGroup || player.group,
        ratingMinutes: 0, minutes: 0, goals: 0, assists: 0,
      };
      current.ratingMinutes += row.rating * row.min;
      current.minutes += row.min;
      current.goals += row.g;
      current.assists += row.a;
      evidence.set(playerId, current);
    });
  });
  const candidates = [...evidence.entries()].map(([playerId, row]) => {
    const player = playerLookup(playerId)!;
    return { playerId, name: player.name, clubId: row.clubId, group: row.group, rating: Math.round(row.ratingMinutes / Math.max(1, row.minutes) * 10) / 10, goals: row.goals, assists: row.assists };
  }).sort((a, b) => b.rating - a.rating || b.goals - a.goals || b.assists - a.assists || a.playerId.localeCompare(b.playerId));

  const selected = new Set<string>();
  const pick = (predicate: (group: string) => boolean, count: number) => {
    for (const member of candidates.filter((item) => !selected.has(item.playerId) && predicate(item.group)).slice(0, count)) selected.add(member.playerId);
  };
  pick((group) => group === 'GK', 1);
  pick((group) => ['CB', 'FB', 'WB'].includes(group), 4);
  pick((group) => ['DM', 'CM', 'AM'].includes(group), 3);
  pick((group) => ['WG', 'ST'].includes(group), 3);
  for (const member of candidates) { if (selected.size >= 11) break; selected.add(member.playerId); }
  return candidates.filter((member) => selected.has(member.playerId)).slice(0, 11);
}

export function leaguePulse(table: readonly TableRow[], clubs: readonly Club[]) {
  const names = new Map(clubs.map((club) => [club.id, club.name]));
  return [...table].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
    .map((row, index) => ({ rank: index + 1, ...row, name: names.get(row.clubId) ?? row.clubId, gd: row.gf - row.ga }));
}

export function refereeReportEntries(reports: readonly MatchArchiveEntry[]) {
  return reports.filter((report) => !!report.referee)
    .sort((a, b) => b.day - a.day || b.id.localeCompare(a.id)).slice(0, 8);
}

// ——— Maç raporlarından kanıta dayalı basın haberleri (sahte senaryo yok) ———
export type MatchNewsTag = 'derbi' | 'farkli' | 'temiz' | 'xg' | 'gollu';

export interface MatchNewsItem {
  id: string;
  day: number;
  comp: string;
  tag: MatchNewsTag;
  title: string;
  detail: string;
}

/**
 * Kullanıcının arşiv maçlarından gerçek istatistikli haber üretir. Her maç en fazla
 * bir haber üretir; öncelik sırası: derbi → farklı skor → gol yememe → xG sapması → gollü maç.
 */
export function buildMatchNews(
  reports: readonly MatchArchiveEntry[],
  myClubId: string,
  clubName: (id: string) => string,
  isDerby: (homeId: string, awayId: string) => boolean,
  limit = 6,
): MatchNewsItem[] {
  const items: MatchNewsItem[] = [];
  for (const r of [...reports].sort((a, b) => b.day - a.day || b.seasonNo - a.seasonNo)) {
    const isHome = r.homeId === myClubId;
    const myName = clubName(myClubId);
    const oppName = clubName(isHome ? r.awayId : r.homeId);
    const gf = isHome ? r.hg : r.ag;
    const ga = isHome ? r.ag : r.hg;
    const xgf = isHome ? r.xgHome : r.xgAway;
    const margin = gf - ga;
    const finishingDelta = Math.round((gf - xgf) * 10) / 10;
    const base = `${myName} ${isHome ? 'evinde' : 'deplasmanda'} ${oppName} ${gf}–${ga}`;
    let item: MatchNewsItem | null = null;

    if (isDerby(r.homeId, r.awayId)) {
      item = { id: `news-derby-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'derbi',
        title: margin >= 0 ? 'Derbide gülen taraf oldun' : 'Derbi rakibe teslim',
        detail: `${base} — ezeli rekabette ${margin >= 0 ? 'kayıp verilmedi' : 'hasar aldı'}.` };
    } else if (Math.abs(margin) >= 3) {
      item = { id: `news-margin-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'farkli',
        title: margin > 0 ? 'Sahada fark yarattı' : 'Ağır yenilgi masada',
        detail: `${base} — ${margin > 0 ? `${Math.abs(margin)} gol farkıyla rahat kazandı` : `${Math.abs(margin)} gol farkıyla kaybetti`}.` };
    } else if (margin > 0 && ga === 0) {
      item = { id: `news-clean-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'temiz',
        title: 'Kalesini kilitledi',
        detail: `${base} — savunma ve kaleci gol yemeden üç puanı aldı.` };
    } else if (Math.abs(finishingDelta) >= 2) {
      item = { id: `news-xg-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'xg',
        title: finishingDelta > 0 ? 'Pozisyonlardan maksimum verim' : 'Pozisyonlar geldi, bitiricilik gelmedi',
        detail: `${base} — beklenen gol ${xgf.toFixed(1)} ikiken gerçekleşen ${gf}; fark ${finishingDelta > 0 ? '+' : ''}${finishingDelta}.` };
    } else if (gf + ga >= 5) {
      item = { id: `news-goals-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'gollu',
        title: 'Gollü doksan dakika',
        detail: `${base} — taraftar toplam ${gf + ga} gol izledi.` };
    }
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}
