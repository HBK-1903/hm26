// HM26 — Menajer basın profili. Gelen kutusundaki röportaj mesajlarından gerçek
// seçimleri sayar; yeni kalıcı alan yok, eşleşmeyen eski kayıtlar sınıflandırılmaz.
import type { InboxMsg } from '../types';
import { INTERVIEW_INBOX_TITLE, interviewToneOfQuote } from '../data/interview';
import type { InterviewOutcome } from '../data/interview';

export interface PressProfile {
  /** Kaç röportaja cevap verildi (reddedilenler dahil değil) */
  total: number;
  byOutcome: Record<InterviewOutcome, number>;
  /** Ton etiketi → kaç kez seçildi */
  tones: Record<string, number>;
  mostUsedTone: { label: string; count: number } | null;
}

const emptyOutcomes = (): Record<InterviewOutcome, number> => ({ win: 0, draw: 0, loss: 0 });

export function buildPressProfile(inbox: readonly InboxMsg[]): PressProfile {
  const byOutcome = emptyOutcomes();
  const tones: Record<string, number> = {};
  let total = 0;

  for (const msg of inbox) {
    if (msg.title !== INTERVIEW_INBOX_TITLE) continue;
    // Gövde biçimi: “söz” — Menajer Adı → tırnak arasını al
    const match = /“(.+)”/.exec(msg.body);
    if (!match) continue;
    const resolved = interviewToneOfQuote(match[1]);
    if (!resolved) continue;
    total += 1;
    byOutcome[resolved.outcome] += 1;
    tones[resolved.label] = (tones[resolved.label] ?? 0) + 1;
  }

  const sorted = Object.entries(tones).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
  return {
    total,
    byOutcome,
    tones,
    mostUsedTone: sorted.length ? { label: sorted[0][0], count: sorted[0][1] } : null,
  };
}
