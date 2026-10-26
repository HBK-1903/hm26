// Wave 10 — presentation-only console structure, independent of match execution.
export type ConsoleTab = 'pitch' | 'ratings' | 'subs' | 'analysis' | 'table' | 'feed';
export interface ConsoleTabSpec { id: ConsoleTab; label: string; short: string; icon: string }

export const LIVE_CONSOLE_TABS: readonly ConsoleTabSpec[] = Object.freeze([
  { id: 'pitch', label: 'Canlı Saha', short: 'Saha', icon: 'ball' },
  { id: 'ratings', label: 'Reytingler ve Karne', short: 'Reyting', icon: 'star' },
  { id: 'subs', label: 'Oyuncu Değişikliği', short: 'Değişiklik', icon: 'squad' },
  { id: 'analysis', label: 'Analiz ve Şut Haritası', short: 'Analiz', icon: 'chart' },
  { id: 'table', label: 'Canlı Puan Durumu', short: 'Puan', icon: 'comps' },
  { id: 'feed', label: 'Spiker ve Maç Günlüğü', short: 'Spiker', icon: 'news' },
]);
