// Shared toast timers: a newer notification must never be cleared by an older one.
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useToast } from '../src/components/ui/kit';

const root = createRoot(document.getElementById('root')!);
let notify: (text: string, kind?: 'ok' | 'warn') => void = () => {};
function Harness() {
  const { show, ToastView } = useToast();
  notify = show;
  return <>{ToastView}</>;
}
let count = 0, failed = 0;
const check = (name: string, condition: boolean) => { count++; if (!condition) failed++; console.log(`${condition ? '✅' : '❌'} ${name}`); };
const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
let nextId = 0;
const timers = new Map<number, () => void>();
const cancelled = new Set<number>();
try {
  act(() => root.render(<Harness />));
  (globalThis as any).setTimeout = (callback: () => void) => { const id = ++nextId; timers.set(id, callback); return id; };
  (globalThis as any).clearTimeout = (id: number) => { cancelled.add(id); timers.delete(id); };
  act(() => notify('İlk bildirim'));
  check('İlk bildirim gösterilir ve tek bir kapanma süresi başlatır', document.body.textContent?.includes('İlk bildirim') === true && timers.size === 1);
  act(() => notify('Daha yeni bildirim', 'warn'));
  check('Yeni bildirim eskisinin kapanma zamanlayıcısını iptal eder', cancelled.has(1) && timers.size === 1 && document.body.textContent?.includes('Daha yeni bildirim') === true);
  act(() => { const latest = timers.get(2); timers.delete(2); latest?.(); });
  check('Yeni bildirim kendi süresi dolunca kapanır', !document.body.textContent?.includes('Daha yeni bildirim'));
  act(() => notify('Ekrandan ayrılma'));
  act(() => root.unmount());
  check('Ekrandan ayrılırken bekleyen zamanlayıcı temizlenir', timers.size === 0 && cancelled.has(3));
} finally {
  globalThis.setTimeout = originalSet;
  globalThis.clearTimeout = originalClear;
  dom.window.close();
}
console.log(`\nUI-SMOOTHNESS: ${count - failed}/${count}`);
if (failed) process.exit(1);
