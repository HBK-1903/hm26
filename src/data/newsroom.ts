// Wave 13 — headlines and weekly features are derived only from persisted match/table evidence.
import type { DemoFixture, MatchArchiveEntry, Player, TableRow } from '../types';
import type { Club } from '../types';
import { EV_GOAL, EV_VAR, SIDE_HOME, SIDE_AWAY } from '../engine/matchEvents';

// Maç kimliğinden kararlı varyant seçimi için küçük FNV hash (kayıt maliyeti yok, saf).
function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = <T,>(pool: readonly T[], seed: string): T => pool[hash32(seed) % pool.length];

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
      const fixtureSeed = `${fixture.day}-${fixture.homeId}-${fixture.awayId}`;
      const total = hg + ag, margin = Math.abs(hg - ag);
      // xG varsa skor-beklenti uyumsuzluğu dürüstçe manşete taşınır (olay uydurulmaz)
      const xgH = fixture.xgHome, xgA = fixture.xgAway;
      const hasXg = typeof xgH === 'number' && typeof xgA === 'number';
      const upsetXg = hasXg && margin > 0 && (hg > ag ? (xgA ?? 0) - (xgH ?? 0) >= 1.5 : (xgH ?? 0) - (xgA ?? 0) >= 1.5);
      let title: string;
      if (total >= 6) title = 'Gollü doksan dakika';
      else if (margin >= 3) title = 'Farklı galibiyet';
      else if (hg === 0 && ag === 0) title = 'Golsüz düello';
      else if (hg === ag) title = 'Puanlar paylaşıldı';
      else if (upsetXg) title = pick(['İstatistikler başka, skor başka', 'Skor tablosu şaşırttı', 'Beklentinin tersi sonuç'], fixtureSeed);
      else if (total === 1) title = pick(['Tek golle geçti', 'Kaleyi tek kez gören maç'], fixtureSeed);
      else title = pick(['Maç sonucu', 'Saha notu', 'Haftanın skoru'], fixtureSeed);
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
export type MatchNewsTag =
  | 'derbi' | 'farkli' | 'temiz' | 'xg' | 'gollu'
  | 'geri-donus' | 'cokus' | 'kirmizi' | 'var' | 'son-dakika' | 'sonuc';

export interface MatchNewsItem {
  id: string;
  day: number;
  comp: string;
  tag: MatchNewsTag;
  title: string;
  detail: string;
}

interface MatchEvidence {
  firstGoalSide: 'mine' | 'opp' | null;
  myReds: number;
  varCount: number;
  lateMinute: number | null;
}

/** Sıkıştırılmış olaylardan habere konu kanıtları çıkarır; olayısız eski kayıtta her alan nötr döner. */
function matchEvidence(r: MatchArchiveEntry, mySide: number): MatchEvidence {
  const events = r.events ?? [];
  const firstGoal = events.find((e) => e[1] === EV_GOAL);
  const firstGoalSide: MatchEvidence['firstGoalSide'] = !firstGoal ? null
    : firstGoal[2] === mySide ? 'mine' : firstGoal[2] === 2 ? null : 'opp';
  const myReds = mySide === SIDE_HOME ? r.redsHome : r.redsAway;
  const varCount = events.filter((e) => e[1] === EV_VAR).length;
  const lateGoal = events.filter((e) => e[1] === EV_GOAL && e[2] === mySide && e[0] >= 76).sort((a, b) => b[0] - a[0])[0];
  return { firstGoalSide, myReds, varCount, lateMinute: lateGoal ? lateGoal[0] : null };
}

/**
 * Kullanıcının arşiv maçlarından gerçek istatistikli haber üretir. Her maç tam olarak
 * bir haber üretir (özel tema yoksa dürüst jenerik 'sonuc' haberi). Öncelik sırası:
 * geri dönüş → çöküş → derbi → kırmızı kart → VAR → son dakika → farklı skor →
 * gol yememe → xG sapması → gollü maç → jenerik. Başlıklar maç kimliğinden kararlı
 * varyant havuzundan seçilir; metinler her zaman gerçek skor/sayıları taşır.
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
    const mySide = isHome ? SIDE_HOME : SIDE_AWAY;
    const myName = clubName(myClubId);
    const oppName = clubName(isHome ? r.awayId : r.homeId);
    const gf = isHome ? r.hg : r.ag;
    const ga = isHome ? r.ag : r.hg;
    const xgf = isHome ? r.xgHome : r.xgAway;
    const margin = gf - ga;
    const won = gf > ga;
    const finishingDelta = Math.round((gf - xgf) * 10) / 10;
    const base = `${myName} ${isHome ? 'evinde' : 'deplasmanda'} ${oppName} ${gf}–${ga}`;
    const ev = matchEvidence(r, mySide);
    const seed = r.id;
    let item: MatchNewsItem | null = null;

    if (ev.firstGoalSide === 'opp' && won) {
      item = { id: `news-comeback-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'geri-donus',
        title: pick(['Geri dönüşün gecesi', 'Önce yedi, sonra yıktı', 'Pes etmeyen kazandı'], seed),
        detail: `${base} — geriye düşmesine rağmen sahadan üç puanla ayrıldı.` };
    } else if (ev.firstGoalSide === 'mine' && !won) {
      item = { id: `news-collapse-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'cokus',
        title: pick(['Öne geçti, tutamadı', 'Kurşun çöp oldu', 'Kontroldeki maç kaçtı'], seed),
        detail: `${base} — ilk golü atan tarafken puan kaybetti.` };
    } else if (isDerby(r.homeId, r.awayId)) {
      item = { id: `news-derby-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'derbi',
        title: margin >= 0
          ? pick(['Derbide gülen taraf oldun', 'Ezeli rekabette üstünlük', 'Derbi gecesinin galibi'], seed)
          : pick(['Derbi rakibe teslim', 'Rekabette yara aldın', 'Derbi gecesi hüsran'], seed),
        detail: `${base} — ezeli rekabette ${margin >= 0 ? 'kayıp verilmedi' : 'hasar aldı'}.` };
    } else if (ev.myReds > 0) {
      item = { id: `news-red-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'kirmizi',
        title: pick(['10 kişi direnci', 'Kırmızı kartın gölgesinde', 'Eksik kalınan doksan dakika'], seed),
        detail: `${base} — ${ev.myReds} kırmızı kartla ${won ? 'eksik oynamasına rağmen kazandı' : 'maçı tamamladı'}.` };
    } else if (ev.varCount > 0) {
      item = { id: `news-var-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'var',
        title: pick(["VAR'a takılan gece", 'Teknoloji maçın kaderini değiştirdi', 'Monitör başında karar anı'], seed),
        detail: `${base} — ${ev.varCount} VAR kararı maçın seyrine etki etti.` };
    } else if (won && ev.lateMinute !== null) {
      item = { id: `news-late-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'son-dakika',
        title: pick(['Son dakika kalp krizi', 'Geç gelen golün tadı', 'Doksanda gülen taraf'], seed),
        detail: `${base} — ${ev.lateMinute}. dakikada gelen golle üç puanı kaptı.` };
    } else if (Math.abs(margin) >= 3) {
      item = { id: `news-margin-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'farkli',
        title: margin > 0 ? pick(['Sahada fark yarattı', 'Farkın adı üç ve üstü', 'Rahat gecenin tablosu'], seed) : pick(['Ağır yenilgi masada', 'Farklı kaybeden gece', 'Tabloda derin yara'], seed),
        detail: `${base} — ${margin > 0 ? `${Math.abs(margin)} gol farkıyla rahat kazandı` : `${Math.abs(margin)} gol farkıyla kaybetti`}.` };
    } else if (margin > 0 && ga === 0) {
      item = { id: `news-clean-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'temiz',
        title: pick(['Kalesini kilitledi', 'Temiz sayfa', 'Savunma izin vermedi'], seed),
        detail: `${base} — savunma ve kaleci gol yemeden üç puanı aldı.` };
    } else if (Math.abs(finishingDelta) >= 2) {
      item = { id: `news-xg-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'xg',
        title: finishingDelta > 0 ? pick(['Pozisyonlardan maksimum verim', 'Az şutla çok iş', 'Bitiricilik konuştu'], seed) : pick(['Pozisyonlar geldi, bitiricilik gelmedi', 'Şutlar tabelaya değil', 'xG boşa gitti'], seed),
        detail: `${base} — beklenen gol ${xgf.toFixed(1)} ikiken gerçekleşen ${gf}; fark ${finishingDelta > 0 ? '+' : ''}${finishingDelta}.` };
    } else if (gf + ga >= 5) {
      item = { id: `news-goals-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'gollu',
        title: pick(['Gollü doksan dakika', 'Taraftara ziyafet', 'Kaleler rahat durmadı'], seed),
        detail: `${base} — taraftar toplam ${gf + ga} gol izledi.` };
    } else {
      // Özel hikâyesi olmayan maç da basında yer alır; uydurma ayrıntı yok, yalnız gerçek skor.
      item = { id: `news-result-${r.id}`, day: r.day, comp: COMP_LABEL[r.comp], tag: 'sonuc',
        title: won ? pick(['Üç puan deftere işlendi', 'Haftanın kazananları arasına girdi', 'Sahanın gülen tarafı'], seed)
          : gf === ga ? pick(['Puanlar paylaşıldı', 'Beraberlikle yetinildi', 'Kazanan çıkmadı'], seed)
          : pick(['Puan hasadı boş geçti', 'Maçtan eli boş döndü', 'Haftayı kayıpla kapattı'], seed),
        detail: `${base} — sonuç puan tablosuna işlendi.` };
    }
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}
