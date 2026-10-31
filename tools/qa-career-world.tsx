// Wizard regression without a browser: settings remain shared, saved and connected to match input.
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).SVGElement = dom.window.SVGElement;
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { Wizard } from '../src/screens/newcareer/Wizard';
import { buildEngineInput } from '../src/engine/adapter';
import { xgConfig } from '../src/engine/leagueXg';
import { SAVE_VERSION } from '../src/store/persist';
import { CLUBS } from '../src/data/clubs';
import type { Career, TacticPlan } from '../src/types';

let total = 0, failed = 0;
const check = (name: string, condition: boolean) => { total++; if (!condition) failed++; console.log(`${condition ? '✅' : '❌'} ${name}`); };
const q = <T extends HTMLElement = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector);
const elements = (selector: string) => Array.from(dom.window.document.querySelectorAll<HTMLElement>(selector));
const exact = (selector: string, text: string) => elements(selector).find((element) => element.textContent?.trim() === text) ?? null;
const containing = (selector: string, text: string) => elements(selector).find((element) => element.textContent?.includes(text)) ?? null;
const click = async (element: HTMLElement | null, name: string) => {
  if (!element) throw new Error(`Kontrol bulunamadı: ${name}`);
  await act(async () => element.click());
};
const btn = (text: string) => exact('button', text);
const group = (label: string) => q(`[role="group"][aria-label="${label}"]`);
const option = (label: string, text: string) => Array.from(group(label)?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((b) => b.textContent?.trim() === text) ?? null;
const selected = (label: string, text: string) => option(label, text)?.getAttribute('aria-pressed') === 'true';
const result: { career: Career | null } = { career: null };
const root = createRoot(dom.window.document.getElementById('root')!);

try {
  await act(async () => root.render(<Wizard slot={1} onDone={(career) => { result.career = career; }} onBack={() => {}} />));
  const name = q<HTMLInputElement>('input');
  if (!name) throw new Error('Menajer adı alanı bulunamadı');
  await act(async () => { name.value = 'Dünya Testi'; Simulate.change(name); });
  await click(containing('[role="button"]', 'Eski Futbolcu'), 'Eski Futbolcu');
  await click(btn('Devam'), 'Devam');
  const toggle = () => containing('button', 'Gelişmiş dünya ayarlarını');
  check('Gelişmiş dünya ayarları başlangıçta kapalı ve düğmeyle bağlantılıdır', toggle()?.getAttribute('aria-expanded') === 'false' && toggle()?.getAttribute('aria-controls') === 'world-advanced-settings' && q('#world-advanced-settings')?.hasAttribute('hidden') === true);
  await click(toggle(), 'Gelişmiş dünya ayarlarını aç');
  check('Düğme dört mevcut dünya ayarını açar', toggle()?.getAttribute('aria-expanded') === 'true' && q('#world-advanced-settings')?.querySelectorAll('[role="group"]').length === 4);
  check('Değiştirilmemiş kariyerin dengeli varsayılanları görünür', selected('Gol ritmi', 'Dengeli') && selected('Şaşırtıcılık / rastgelelik', 'Dengeli') && selected('Sakatlık sıklığı', 'Normal') && selected('Piyasa yenilenme ritmi', 'Dengeli'));
  await click(option('Gol ritmi', 'Yüksek'), 'Yüksek gol ritmi');
  await click(option('Şaşırtıcılık / rastgelelik', 'Kaotik'), 'Kaotik');
  await click(option('Sakatlık sıklığı', 'Düşük'), 'Düşük sakatlık');
  await click(option('Piyasa yenilenme ritmi', 'Yoğun'), 'Yoğun piyasa');
  await click(toggle(), 'Kapat');
  await click(toggle(), 'Tekrar aç');
  check('Paneli kapatıp açmak seçimleri kaybettirmez', selected('Gol ritmi', 'Yüksek') && selected('Şaşırtıcılık / rastgelelik', 'Kaotik') && selected('Sakatlık sıklığı', 'Düşük') && selected('Piyasa yenilenme ritmi', 'Yoğun'));
  await click(containing('[role="button"]', 'Açık Rekabet Dönemi'), 'Açık Rekabet');
  await click(btn('Devam'), 'Zorluk');
  await click(containing('[role="button"]', 'Özel Kariyer'), 'Özel Kariyer');
  await click(containing('button', 'Kariyer Dünyası'), 'Kariyer Dünyası');
  check('Özel kariyer bölümü aynı dünya değerlerini gösterir', selected('Şaşırtıcılık / rastgelelik', 'Kaotik') && selected('Sakatlık sıklığı', 'Düşük'));
  await click(option('Şaşırtıcılık / rastgelelik', 'Tahmin edilebilir'), 'Tahmin edilebilir');
  await click(containing('button', 'Maç Gerçekçiliği'), 'Maç Gerçekçiliği');
  await click(option('Maç hızı varsayılanı', 'Hızlı'), 'Hızlı maç');
  await click(containing('button', 'Piyasa & Yönetim'), 'Piyasa & Yönetim');
  await click(option('Yönetim baskısı', 'Yüksek'), 'Yüksek baskı');
  await click(containing('button', 'Konfor (sonradan değişir)'), 'Konfor');
  await click(option('Metin boyutu', 'Büyük'), 'Büyük metin');
  await click(option('Akış önerileri', 'Kapalı'), 'Kapalı öneriler');
  await click(btn('←'), 'Dünya adımına dön');
  await click(toggle(), 'Dünya ayarlarını aç');
  check('Zorluk ekranındaki ayar dünya adımına geri yansır', selected('Şaşırtıcılık / rastgelelik', 'Tahmin edilebilir') && selected('Piyasa yenilenme ritmi', 'Yoğun'));
  await click(option('Sakatlık sıklığı', 'Yüksek'), 'Yüksek sakatlık');
  await click(btn('Devam'), 'Zorluk');
  await click(containing('[role="button"]', 'Zorlu Kariyer'), 'Zorlu Kariyer');
  await click(btn('Devam'), 'Kulüp');
  await click(containing('[role="button"]', 'Denizli Yeşilova'), 'Denizli Yeşilova');
  await click(btn('Kulüp Brifingine Git'), 'Brifing');
  await click(btn('Kariyeri Başlat'), 'Kariyer başlangıcı');
  const career = result.career;
  check('Dönem, zorluk ve dünya seçimleri kariyere aktarılır', !!career && career.manager.era === 'acik' && career.manager.difficulty === 'zorlu' && career.manager.challengePoints === 70 && career.settings.goalPace === 'yuksek' && career.settings.randomness === 'low' && career.settings.injuryRate === 'yuksek' && career.settings.marketRefresh === 'yogun');
  if (!career) throw new Error('Kariyer oluşturulmadı');
  check('Özel kariyerdeki mevcut maç hızı, yönetim ve konfor seçimleri de korunur', career.settings.matchSpeed === 'hizli' && career.settings.boardPressure === 'yuksek' && career.settings.textSize === 'buyuk' && career.settings.suggestions === false);
  const input = buildEngineInput({ homeClub: CLUBS[0], awayClub: CLUBS[1], homeSquad: [], awaySquad: [], homeTactic: {} as TacticPlan, seed: career.seed, settings: career.settings });
  const xg = xgConfig(career.settings);
  check('Gol ve rastgelelik ayarları gerçek maç ve diğer maç simülasyonlarına aktarılır', input.goalPace === 'yuksek' && input.randomness === 'low' && xg.pace === 1.18 && xg.jitter === 0.45);
  check('Yeni kariyer ayarları korunur; canlı maç kayıt sürümü 5', SAVE_VERSION === 5 && Object.keys(career.settings).sort().join(',') === ['boardPressure', 'goalPace', 'highContrast', 'injuryRate', 'marketRefresh', 'matchSpeed', 'randomness', 'reduceMotion', 'suggestions', 'textSize'].sort().join(','));
} catch (error) {
  failed++;
  console.error('❌ Yeni kariyer UI testi:', error);
} finally {
  await act(async () => root.unmount());
  dom.window.close();
}
console.log(`\nCAREER-WORLD-UI: ${total - failed}/${total}`);
if (failed) process.exitCode = 1;
