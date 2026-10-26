// HM26 — Dalga 6: Söz verilen süre & dakika memnuniyeti (saf kurallar — qa-extended PM1)
// FM tarzı: kadro sıralaması rol bekler; gerçek oynama payı beklentinin çok altındaysa güven erozyonu.

export type MinuteRole = 'key' | 'rotation' | 'backup';

/** Kadro sıralamasına göre rol beklentisi (sıralama: genel güç azalan)
 *  key: ilk 13 · rotation: 14-22 · backup: kalan. 21 yaş altı rotation'da daha sabırlı. */
export function minuteRole(rank: number, age: number): MinuteRole {
  if (rank <= 12) return 'key';
  if (rank <= 21) return age <= 20 ? 'backup' : 'rotation';
  return 'backup';
}

/** Rolün beklenen oynama payı (0-1) */
const EXPECTED: Record<MinuteRole, number> = { key: 0.78, rotation: 0.42, backup: 0.04 };

/** Memnuniyetsizlik 0..1. matchDays < 6 → ölçüm erken, gürültü olmasın diye 0 döner. */
export function minuteGrievance(rank: number, age: number, apps: number, matchDays: number): number {
  if (matchDays < 6) return 0;
  const role = minuteRole(rank, age);
  const exp = EXPECTED[role];
  const actual = apps / matchDays;
  if (actual >= exp) return 0;
  const deficit = (exp - actual) / exp; // 0..1
  return Math.round(Math.min(1, deficit * (role === 'key' ? 1.25 : role === 'rotation' ? 1.0 : 0.35)) * 100) / 100;
}

export type GrievanceLabel = 'sabırlı' | 'huzursuz' | 'kırgın';
/** null: sorun yok. Rozet eşikleri: ≥0.45 huzursuz, ≥0.7 kırgın */
export const grievanceLabel = (g: number): GrievanceLabel | null =>
  g >= 0.7 ? 'kırgın' : g >= 0.45 ? 'huzursuz' : null;

// ── Süre sözü ──
// "Önümüzdeki 10 maçta en az %55 kadroda" vaadi.
export interface MinutePromise {
  share: number;      // hedef pay (0.55)
  fromDay: number;    // verildiği gün
  played0: number;    // verdiği andaki kulüp maç sayısı
  apps0: number;      // verdiği andaki oyuncu maç sayısı
  window: number;     // değerlendirme penceresi (maç)
}

export const PROMISE_SHARE = 0.55;
export const PROMISE_WINDOW = 10;

export const newPromise = (day: number, playedNow: number, appsNow: number): MinutePromise =>
  ({ share: PROMISE_SHARE, fromDay: day, played0: playedNow, apps0: appsNow, window: PROMISE_WINDOW });

export function evalPromise(p: MinutePromise, playedNow: number, appsNow: number): 'active' | 'kept' | 'broken' {
  const span = playedNow - p.played0;
  if (span < p.window) return 'active';
  const got = (appsNow - p.apps0) / p.window;
  return got >= p.share ? 'kept' : 'broken';
}
