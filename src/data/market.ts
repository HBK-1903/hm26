// HM26 — Dalga 3: Yabancı kotası + Bosman serbestliği + kiralık paketi
// Saf (pure) kurallar — oyun kırılması riski bu modülün testleriyle kapatılır (qa-extended FO1/BO1/LN1)
import { LeagueId, Player } from '../types';

// §11.7 yabancı kotası (2026-27 sezonu TFF yazılı kuralı, oyuna uyarlanmış):
//   Zirve Lig 8 · Geçit Lig 5 · Kök Lig 3 (kadrodaki toplam yabancı sayısı)
export const FOREIGN_QUOTA: Record<LeagueId, number> = { zirve: 8, gecit: 5, kok: 3 };

export const foreignCountIn = (squad: Player[]): number => squad.filter((p) => p.foreign).length;

/** Yabancı bir oyuncuyu kadroya katma kontrolü (kalıcı transfer ve kiralık ortak) */
export function canAddForeign(squad: Player[], league: LeagueId, incoming: Player): { ok: boolean; reason?: string } {
  if (!incoming.foreign) return { ok: true };
  const quota = FOREIGN_QUOTA[league];
  const cur = foreignCountIn(squad);
  if (cur >= quota) return { ok: false, reason: `Yabancı kotası dolu (${cur}/${quota}). Önce bir yabancı ile yolları ayır.` };
  return { ok: true };
}

// ─── Bosman: sözleşmesi biten oyuncu sezon sonunda bedelsiz serbest kalır ───
// Sezon geçişinde sözleşme 0'a düşenler listelenir; oyuncu 'FA' kulübüne alınır
// (polyfill serbest statü), dünya kadrolarının gençle doldurulması mevcut akışta kalır.
export const FREE_CLUB = 'FA';

export function seasonEndContractMoves(
  squads: Record<string, Player[]>,
  patch: Record<string, Partial<Player>>,
): { updates: Record<string, Partial<Player>>; leavers: { clubId: string; name: string }[] } {
  const updates: Record<string, Partial<Player>> = {};
  const leavers: { clubId: string; name: string }[] = [];
  for (const [cid, arr] of Object.entries(squads)) {
    for (const p of arr) {
      const curCy = (patch[p.id]?.contractYears ?? p.contractYears ?? 3);
      const cy = Math.max(0, curCy - 1);
      updates[p.id] = { contractYears: cy };
      if (cy === 0) {
        // Bosman: bedelsiz serbest
        updates[p.id].clubId = FREE_CLUB;
        leavers.push({ clubId: cid, name: p.name });
      }
    }
  }
  return { updates, leavers };
}

// ─── Kiralık paketi ───
export interface LoanEntry {
  playerId: string;
  fromClub: string;   // gerçek kulübü
  toClub: string;     // kiralayan
  seasonNo: number;   // hangi sezon için (sezon sonunda döner)
}

/** AI kulübü kiralik talebini kabul mü? Saf kural (deterministik, RNG yok):
 *  - kadro derinliği yeterli (22+)
 *  - oyuncu ilk 11 önceliği değil (önemli değil ve gücü kulüp ortalamasının belirgin altında)
 *  - kiralik oyuncu zaten kiralık değil (üst üste kiralık yok)
 */
export function clubAcceptsLoan(clubStrength: number, squadSize: number, p: Player, alreadyOnLoan: boolean): boolean {
  if (alreadyOnLoan) return false;
  if (p.important) return false;
  if (squadSize < 22) return false;
  return p.ratings.gen <= clubStrength - 2;
}

/** Kiralık ücreti kapıda 0; maaş yarı paylaşımı (₺B ay) */
export const loanWage = (p: Player): number => Math.max(1, Math.round(p.wage / 2));

/** Sezon sonunda sona eren kiralıklar (önceki sezon no ve altı) */
export const expiringLoans = (loans: LoanEntry[], newSeasonNo: number): LoanEntry[] =>
  loans.filter((l) => l.seasonNo < newSeasonNo);

export const activeLoans = (loans: LoanEntry[], newSeasonNo: number): LoanEntry[] =>
  loans.filter((l) => l.seasonNo >= newSeasonNo);

/** Oyuncu şu an bir yerde kiralık mı? */
export const onLoan = (loans: LoanEntry[], playerId: string): LoanEntry | undefined =>
  loans.find((l) => l.playerId === playerId);

/** Dışarı kiralık: hedef AI kulübü oyuncuyu kadrosuna alır mı? (üst üste kiralık yok kuralı çağırandadır) */
export function aiAcceptsInboundLoan(clubStrength: number, squadSize: number, p: Player): boolean {
  if (squadSize >= 28) return false;
  return p.ratings.gen <= clubStrength + 6; // süperstar küçük kulübe düşmez
}
