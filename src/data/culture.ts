// Wave 14 — persistent club culture, supporter affairs and evidence-led FFP status.
import type { CultureHonor, CultureIssueKind, OffPitchCulture } from '../types';

const CHAIRMAN_NAMES = ['Sarp Erdem', 'Tunca Yalçın', 'Nehir Aksoy', 'Bora Keskin', 'Deren Arı'];
const CHAIRMAN_STYLES: OffPitchCulture['chairmanStyle'][] = ['patient', 'ambitious', 'pragmatic', 'community'];
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const hash = (value: string) => {
  let out = 2166136261;
  for (let i = 0; i < value.length; i++) out = Math.imul(out ^ value.charCodeAt(i), 16777619);
  return out >>> 0;
};

export function createClubCulture(seed: number, clubId: string, rivalIds: string[] = []): OffPitchCulture {
  const h = hash(`${seed}:${clubId}:chair`);
  return {
    fanTrust: 64, communityTrust: 58, discipline: 68, ultrasHeat: 22,
    chairmanName: CHAIRMAN_NAMES[h % CHAIRMAN_NAMES.length],
    chairmanStyle: CHAIRMAN_STYLES[(h >>> 4) % CHAIRMAN_STYLES.length],
    nemesisClubId: null,
    honors: [],
  };
}

export function normalizeClubCulture(value: unknown, seed: number, clubId: string, rivalIds: string[] = []): OffPitchCulture {
  const fallback = createClubCulture(seed, clubId, rivalIds);
  if (!value || typeof value !== 'object') return fallback;
  const row = value as Partial<OffPitchCulture>;
  const styles = new Set<OffPitchCulture['chairmanStyle']>(['patient', 'ambitious', 'pragmatic', 'community']);
  const honors = Array.isArray(row.honors) ? row.honors.filter((honor): honor is CultureHonor => !!honor
    && typeof honor.id === 'string' && typeof honor.title === 'string'
    && Number.isInteger(honor.seasonNo) && Number.isInteger(honor.earnedDay)) : [];
  return {
    fanTrust: Number.isFinite(row.fanTrust) ? clamp(Number(row.fanTrust)) : fallback.fanTrust,
    communityTrust: Number.isFinite(row.communityTrust) ? clamp(Number(row.communityTrust)) : fallback.communityTrust,
    discipline: Number.isFinite(row.discipline) ? clamp(Number(row.discipline)) : fallback.discipline,
    ultrasHeat: Number.isFinite(row.ultrasHeat) ? clamp(Number(row.ultrasHeat)) : fallback.ultrasHeat,
    chairmanName: typeof row.chairmanName === 'string' && row.chairmanName ? row.chairmanName : fallback.chairmanName,
    chairmanStyle: row.chairmanStyle && styles.has(row.chairmanStyle) ? row.chairmanStyle : fallback.chairmanStyle,
    nemesisClubId: typeof row.nemesisClubId === 'string' ? row.nemesisClubId : null,
    honors,
    ...(Number.isInteger(row.lastFfpReviewSeason) ? { lastFfpReviewSeason: row.lastFfpReviewSeason } : {}),
  };
}

export interface FfpAssessment {
  status: 'clear' | 'watch' | 'breach';
  payrollRatio: number;
  netSpendM: number;
  netSpendRatio: number;
}

export function assessFfp(input: { payrollM: number; wageCapM: number; transferSpendM: number; transferIncomeM: number; baseBudgetM: number }): FfpAssessment {
  const payrollRatio = input.wageCapM > 0 ? input.payrollM / input.wageCapM : input.payrollM > 0 ? Infinity : 0;
  const netSpendM = Math.max(0, input.transferSpendM - input.transferIncomeM);
  const netSpendRatio = input.baseBudgetM > 0 ? netSpendM / input.baseBudgetM : netSpendM > 0 ? Infinity : 0;
  const status = payrollRatio > 1.02 || netSpendRatio > 1.5 ? 'breach'
    : payrollRatio >= 0.9 || netSpendRatio >= 0.9 ? 'watch' : 'clear';
  return { status, payrollRatio, netSpendM, netSpendRatio };
}

export type CultureChoice = 'stand_by' | 'apologize' | 'open_day' | 'defer' | 'meet_ultras' | 'firm_statement' | 'audit' | 'appeal';
export interface CultureResolution {
  ok: boolean;
  reason?: string;
  culture?: OffPitchCulture;
  budget?: number;
  boardDelta?: number;
  message?: string;
}

export function resolveCultureChoice(input: {
  culture: OffPitchCulture; kind: CultureIssueKind; choice: CultureChoice;
  transferBudgetM: number; seasonNo: number; day: number;
}): CultureResolution {
  const costs: Partial<Record<CultureChoice, number>> = { apologize: 0.08, open_day: 0.12, meet_ultras: 0.10, audit: 0.15 };
  const cost = input.kind === 'scandal' && input.choice === 'apologize' ? 0.12 : costs[input.choice] ?? 0;
  if (input.transferBudgetM < cost) return { ok: false, reason: `Bu karar ₺${cost.toFixed(2)}M gerektiriyor; transfer bütçesi yetersiz.` };
  const c = { ...input.culture, honors: [...input.culture.honors] };
  let boardDelta = 0, message = '';
  const addHonor = (id: string, title: string) => {
    if (!c.honors.some((honor) => honor.id === id)) c.honors.push({ id, title, seasonNo: input.seasonNo, earnedDay: input.day });
  };
  if (input.kind === 'discipline' && input.choice === 'stand_by') {
    c.fanTrust = clamp(c.fanTrust + 6); c.discipline = clamp(c.discipline - 5); boardDelta = -1; message = 'Oyuncunun arkasında durdun; tribün desteği arttı, disiplin baskısı sürdü.';
  } else if (input.kind === 'discipline' && input.choice === 'apologize') {
    c.communityTrust = clamp(c.communityTrust + 4); c.discipline = clamp(c.discipline + 7); boardDelta = 2; message = 'Kamuoyu açıklaması ve kulüp içi disiplin planı yayımlandı.';
  } else if (input.kind === 'scandal' && input.choice === 'stand_by') {
    c.fanTrust = clamp(c.fanTrust + 3); c.communityTrust = clamp(c.communityTrust - 5); c.discipline = clamp(c.discipline - 8); boardDelta = -2; message = 'Yönetim oyuncuların arkasında durdu; tribün desteği korundu ancak kamuoyu ve yönetim baskısı büyüdü.';
  } else if (input.kind === 'scandal' && input.choice === 'apologize') {
    c.communityTrust = clamp(c.communityTrust + 9); c.discipline = clamp(c.discipline + 8); c.fanTrust = clamp(c.fanTrust - 2); boardDelta = 2; message = 'Kulüp kamuoyu önünde özür diledi ve bağımsız disiplin planı açıkladı.';
  } else if (input.kind === 'community' && input.choice === 'open_day') {
    c.communityTrust = clamp(c.communityTrust + 12); c.fanTrust = clamp(c.fanTrust + 4); boardDelta = 1; message = 'Akademi kapıları mahalleye açıldı; toplum ve tribün güveni yükseldi.';
    if (c.communityTrust >= 80) addHonor('community-club', 'Toplumla İç İçe Kulüp');
  } else if (input.kind === 'community' && input.choice === 'defer') {
    c.communityTrust = clamp(c.communityTrust - 3); message = 'Ziyaret ertelendi; topluluk bağı zayıfladı.';
  } else if (input.kind === 'ultras' && input.choice === 'meet_ultras') {
    c.fanTrust = clamp(c.fanTrust + 8); c.ultrasHeat = clamp(c.ultrasHeat - 15); c.communityTrust = clamp(c.communityTrust + 3); boardDelta = 1; message = 'Taraftar temsilcileriyle görüşme tansiyonu düşürdü.';
    if (c.fanTrust >= 80 && c.ultrasHeat <= 30) addHonor('terrace-bond', 'Tribünle Güçlü Bağ');
  } else if (input.kind === 'ultras' && input.choice === 'firm_statement') {
    c.fanTrust = clamp(c.fanTrust - 6); c.ultrasHeat = clamp(c.ultrasHeat + 12); c.discipline = clamp(c.discipline + 1); boardDelta = 1; message = 'Yönetim sert açıklama yaptı; disiplin korunurken taraftar tansiyonu arttı.';
  } else if (input.kind === 'ffp' && input.choice === 'audit') {
    c.discipline = clamp(c.discipline + 5); c.lastFfpReviewSeason = input.seasonNo; boardDelta = 2; message = 'Mali tablolar bağımsız incelemeye sunuldu; yönetim uyum planını kayda aldı.';
  } else if (input.kind === 'ffp' && input.choice === 'appeal') {
    c.fanTrust = clamp(c.fanTrust + 2); c.lastFfpReviewSeason = input.seasonNo; boardDelta = -3; message = 'Kulüp karara itiraz etti; inceleme sürerken yönetim güveni geriledi.';
  } else return { ok: false, reason: 'Bu olay için bu karar seçeneği geçerli değil.' };
  return { ok: true, culture: c, budget: Math.round((input.transferBudgetM - cost) * 100) / 100, boardDelta, message };
}

export function addSeasonCultureHonors(culture: OffPitchCulture, seasonNo: number, day: number): OffPitchCulture {
  const next = { ...culture, honors: [...culture.honors] };
  const award = (id: string, title: string, threshold: boolean) => {
    if (threshold && !next.honors.some((honor) => honor.id === id)) next.honors.push({ id, title, seasonNo, earnedDay: day });
  };
  award('fair-play-club', 'Centilmen Kulüp', next.discipline >= 85);
  award('community-club', 'Toplumla İç İçe Kulüp', next.communityTrust >= 85);
  award('supporters-club', 'Tribünle Güçlü Bağ', next.fanTrust >= 85 && next.ultrasHeat <= 30);
  return next;
}
