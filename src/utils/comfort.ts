// HM26 — §6.3 Konfor ayarları: kök sınıfı + localStorage (tarayıcı geneli kalıcı)
import { CareerSettings } from '../types';

const KEY = 'manager26-comfort';
const THEME_KEY = 'manager26-theme';

export type ThemePref = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export function resolveThemePreference(pref: ThemePref, systemPrefersDark: boolean): ResolvedTheme {
  return pref === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : pref;
}

function resolveAuto(): ResolvedTheme {
  try { return resolveThemePreference('auto', window.matchMedia('(prefers-color-scheme: dark)').matches); }
  catch { return 'light'; }
}

export function applyTheme(pref: ThemePref): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const t = pref === 'auto' ? resolveAuto() : pref;
  root.classList.toggle('m26-dark', t === 'dark');
  root.classList.toggle('m26-light', t === 'light');
  root.dataset.theme = t;
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) themeColor.content = t === 'dark' ? '#091521' : '#FAF5EA';
  try { localStorage.setItem(THEME_KEY, pref); } catch { /* boş */ }
}

export function loadTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch { /* boş */ }
  return 'light'; // varsayılan: Yön A açık
}

// Tema otomatikteyken sistem değişimine dinamik uyum (eski iOS Safari addListener fallback dahil)
try {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const syncSystemTheme = () => { if (loadTheme() === 'auto') applyTheme('auto'); };
  if (typeof media.addEventListener === 'function') media.addEventListener('change', syncSystemTheme);
  else media.addListener(syncSystemTheme);
} catch { /* boş */ }

export function applyComfortSettings(s: CareerSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.textSize = s.textSize;
  root.classList.toggle('m26-hc', s.highContrast);
  root.classList.toggle('m26-rm', s.reduceMotion);
}

export function saveLocalComfort(s: CareerSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ textSize: s.textSize, highContrast: s.highContrast, reduceMotion: s.reduceMotion }));
  } catch { /* boş */ }
}

export function loadLocalComfort(): Pick<CareerSettings, 'textSize' | 'highContrast' | 'reduceMotion'> | null {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return null;
    const d = JSON.parse(v);
    if (typeof d.textSize === 'string') return { textSize: d.textSize, highContrast: !!d.highContrast, reduceMotion: !!d.reduceMotion };
    return null;
  } catch { return null; }
}
