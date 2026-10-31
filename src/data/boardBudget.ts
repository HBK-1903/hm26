// Ek transfer bütçesi: mevcut kariyer, lig, finans ve gelen kutusu kayıtlarından türetilir.
// Yeni kalıcı alan yoktur; karar ve bekleme süresi mevcut InboxMsg.id/day içinde taşınır.
import type { Career, Club, InboxMsg, Player, TableRow, TransferLogEntry } from '../types';
import { assessFfp, clubSeasonTransferTotals, type FfpAssessment } from './culture';

export const BOARD_BUDGET_COOLDOWN_DAYS = 30;
export const BOARD_BUDGET_MIN_LEAGUE_MATCHES = 4;
export const BOARD_BUDGET_MIN_CONFIDENCE = 60;
export const BOARD_BUDGET_NEED_RATIO = 0.6;

export interface BoardBudgetInput {
  career: Career;
  club: Club;
  seasonNo: number;
  leagueTable: readonly TableRow[];
  squad: readonly Player[];
  transferLog: readonly TransferLogEntry[];
  inbox: readonly InboxMsg[];
  budget: { tb: number; wbExtra?: number };
}

export interface BoardBudgetAssessment {
  canRequest: boolean;
  blockedReason: string | null;
  approved: boolean;
  amount: number;
  reasons: string[];
  matches: number;
  rank: number | null;
  targetRank: number;
  confidence: number;
  ffp: FfpAssessment;
  nextRequestDay: number | null;
}

const prefixFor = (clubId: string, seasonNo: number) => `board-budget-v1:${clubId}:${seasonNo}:`;
export const boardBudgetMessageId = (clubId: string, seasonNo: number, day: number, approved: boolean) =>
  `${prefixFor(clubId, seasonNo)}${day}:${approved ? 'approved' : 'rejected'}`;

// Kulüp hedefindeki mevcut "İlk N" ifadesi kullanılır; belirsiz hedefler için orta sıra nötr varsayılır.
export function boardTargetRank(goal: string, leagueSize: number): number {
  const text = goal.toLocaleLowerCase('tr-TR');
  const explicit = text.match(/ilk\s*(\d+)/)?.[1];
  if (explicit) return Math.min(leagueSize, Math.max(1, Number(explicit)));
  if (text.includes('şampiyon')) return 1;
  if (text.includes('ligde kal') || text.includes('kümede kal')) return Math.max(1, leagueSize - 2);
  return Math.max(1, Math.ceil(leagueSize / 2));
}

export function assessBoardBudget(input: BoardBudgetInput): BoardBudgetAssessment {
  const { career, club, seasonNo, leagueTable, squad, transferLog, inbox, budget } = input;
  const totals = clubSeasonTransferTotals(transferLog, club.id, seasonNo);
  const payrollM = squad.reduce((sum, player) => sum + (player.wage ?? 0), 0) / 1000;
  const ffp = assessFfp({
    payrollM,
    wageCapM: club.wageBudget + (budget.wbExtra ?? 0),
    transferSpendM: totals.spendM,
    transferIncomeM: totals.incomeM,
    baseBudgetM: club.transferBudget,
  });
  const rows = [...leagueTable].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.clubId.localeCompare(b.clubId));
  const index = rows.findIndex((row) => row.clubId === club.id);
  const ownRow = index < 0 ? undefined : rows[index];
  const matches = ownRow?.p ?? 0;
  const rank = ownRow && matches > 0 ? index + 1 : null;
  const targetRank = boardTargetRank(club.boardGoal, Math.max(1, rows.length));
  const confidence = Number.isFinite(career.boardConfidence) ? Math.max(0, Math.min(100, career.boardConfidence!)) : 70;
  // Initial tuning: 12% of the club's base transfer budget, limited to ₺0.2–5M.
  const amount = Math.round(Math.min(5, Math.max(0.2, club.transferBudget * 0.12)) * 10) / 10;
  const reasons: string[] = [];
  if (matches < BOARD_BUDGET_MIN_LEAGUE_MATCHES) reasons.push(`Yönetim en az ${BOARD_BUDGET_MIN_LEAGUE_MATCHES} lig maçı görmek istiyor (${matches}/${BOARD_BUDGET_MIN_LEAGUE_MATCHES}).`);
  if (confidence < BOARD_BUDGET_MIN_CONFIDENCE) reasons.push(`Yönetim güveni %${confidence}; en az %${BOARD_BUDGET_MIN_CONFIDENCE} gerekiyor.`);
  if (rank !== null && matches >= BOARD_BUDGET_MIN_LEAGUE_MATCHES && rank > Math.min(rows.length, targetRank + 2)) {
    reasons.push(`Lig sırası ${rank}; yönetim hedefi ilk ${targetRank} ve en çok iki sıra gerisine izin veriyor.`);
  }
  if (ffp.status === 'breach') reasons.push('Maaş veya transfer harcamasında mali uyum ihlali riski var.');
  if (club.transferBudget <= 0 || budget.tb > club.transferBudget * BOARD_BUDGET_NEED_RATIO) reasons.push('Mevcut transfer bütçesi yönetimin ek kaynak eşiğinin üzerinde.');

  const prefix = prefixFor(club.id, seasonNo);
  const attempts = inbox.flatMap((message) => {
    if (!message.id.startsWith(prefix)) return [];
    const parts = message.id.slice(prefix.length).split(':');
    const day = Number(parts[0]);
    if (parts.length !== 2 || !Number.isSafeInteger(day) || day < 1 || day > career.day || message.day !== day || !['approved', 'rejected'].includes(parts[1])) return [];
    return [{ day, approved: parts[1] === 'approved' }];
  });
  const approvedAlready = attempts.some((attempt) => attempt.approved);
  const latestDay = Math.max(0, ...attempts.map((attempt) => attempt.day));
  const nextRequestDay = latestDay ? latestDay + BOARD_BUDGET_COOLDOWN_DAYS : null;
  const blockedReason = career.jobSearch ? 'İşsizken kulüpten bütçe talep edilemez.'
    : approvedAlready ? 'Bu kulüp için bu sezon ek bütçe zaten onaylandı.'
    : nextRequestDay !== null && career.day < nextRequestDay ? `Yeniden talep için ${nextRequestDay - career.day} gün beklemelisin.`
    : null;
  return { canRequest: blockedReason === null, blockedReason, approved: reasons.length === 0, amount, reasons, matches, rank, targetRank, confidence, ffp, nextRequestDay };
}
