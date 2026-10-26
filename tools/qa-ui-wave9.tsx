import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { genSquad } from '../src/data/gen';
import { CLUBS } from '../src/data/clubs';
import { PlayerPortrait } from '../src/components/assets/Portrait';
import { resolveThemePreference } from '../src/utils/comfort';
import { quickContinueLabel } from '../src/store/persist';
import { Card, Seg, Sheet } from '../src/components/ui/kit';

let failed = 0;
const check = (label: string, pass: boolean, detail: string) => {
  console.log(`${pass ? '✅' : '❌'} ${label} | ${detail}`);
  if (!pass) failed++;
};
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const kit = readFileSync(new URL('../src/components/ui/kit.tsx', import.meta.url), 'utf8');
const tailwind = readFileSync(new URL('../tailwind.config.js', import.meta.url), 'utf8');
const getBlock = (pattern: RegExp) => pattern.exec(css)?.[1] ?? '';
const lightBlock = getBlock(/:root, html\.m26-light\s*\{([^}]+)\}/s);
const darkBlock = getBlock(/html\.m26-dark\s*\{([^}]+)\}/s);
const token = (block: string, name: string) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block)?.[1];
const luminance = (color: string) => {
  const c = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

{
  const failures: string[] = [];
  for (const [name, block] of [['light', lightBlock], ['dark', darkBlock]] as const) {
    const bg = token(block, '--c-base');
    for (const role of ['--c-primary', '--c-secondary', '--c-muted', '--c-accent', '--c-danger']) {
      const fg = token(block, role);
      if (!bg || !fg || contrast(bg, fg) < 4.5) failures.push(`${name}:${role}=${fg ? contrast(bg!, fg).toFixed(2) : 'missing'}`);
    }
  }
  check('Theme A/B palette text pairs meet WCAG AA', failures.length === 0,
    failures.length ? failures.join(', ') : 'light/dark primary, secondary, muted, accent and danger ≥ 4.5:1');
}

{
  const pass = resolveThemePreference('light', true) === 'light'
    && resolveThemePreference('dark', false) === 'dark'
    && resolveThemePreference('auto', true) === 'dark'
    && resolveThemePreference('auto', false) === 'light'
    && html.includes("localStorage.getItem('manager26-theme')")
    && html.includes("meta[name=\"theme-color\"]");
  check('Theme preference is deterministic and applied before first paint', pass, 'light/dark/system resolution + offline inline bootstrap + browser chrome color');
}

{
  const semanticMarkup = renderToStaticMarkup(React.createElement('div', null,
    React.createElement(Card, { onClick: () => undefined }, 'Keyboard action'),
    React.createElement(Seg, { ariaLabel: 'Theme', options: [{ v: 'light', label: 'Light' }, { v: 'dark', label: 'Dark' }], value: 'light', onChange: () => undefined }),
    React.createElement(Sheet, { open: true, onClose: () => undefined, title: 'Panel' }, 'Dialog content'),
  ));
  const pass = css.includes(':focus-visible') && css.includes('100dvh')
    && css.includes('prefers-reduced-motion: reduce')
    && tailwind.includes("minHeight: { touch: '44px' }")
    && kit.includes('aria-pressed={value === o.v}')
    && kit.includes('aria-modal="true"') && kit.includes("event.key === 'Escape'")
    && /role="button"[^>]*tabindex="0"/.test(semanticMarkup)
    && semanticMarkup.includes('role="group" aria-label="Theme"')
    && semanticMarkup.includes('aria-pressed="true"')
    && semanticMarkup.includes('role="dialog" aria-modal="true"');
  check('Mobile/accessibility foundation covers focus, safe viewport and 44px controls', pass,
    'SSR verifies keyboard cards, named pressed-state segments and a labelled modal dialog');
}

{
  const club = CLUBS.find((item) => item.id === 'denizli_yesilova') ?? CLUBS[0];
  const player = { ...genSquad(club, 20261026)[0], clubId: 'free' };
  let htmlMarkup = '';
  try { htmlMarkup = renderToStaticMarkup(React.createElement(PlayerPortrait, { player, size: 48 })); }
  catch (error) { htmlMarkup = `render error: ${String(error)}`; }
  const pass = htmlMarkup.includes('data-hm26-player-avatar="v1"') && htmlMarkup.includes('data-player-id=') && !htmlMarkup.includes('render error');
  check('Free-agent portrait safely uses a neutral club palette', pass, pass ? 'PlayerPortrait server-rendered without club lookup crash' : htmlMarkup.slice(0, 120));
}

{
  const actual = quickContinueLabel({ clubName: 'Denizli Yeşilova', day: 17 });
  const fallback = quickContinueLabel({ clubName: '  ', day: 3 });
  check('Quick-continue uses SaveMeta.clubName and has a safe fallback', actual === 'Denizli Yeşilova · Gün 17' && fallback === 'Kulüp · Gün 3', `label=${actual}; fallback=${fallback}`);
}

{
  const pass = !/https?:\/\//i.test(html) && !/fonts\.googleapis|fonts\.gstatic|cdn\./i.test(css)
    && css.includes('m26-overline') && css.includes('Georgia');
  check('Theme stays offline-first and retains the paper/serif identity', pass, 'no new remote CSS/font dependency; paper tokens and local system-serif stack');
}

console.log(`\nUI-WAVE9: ${failed ? `${6 - failed}/6 passed, ${failed} failed` : '6/6 passed'}`);
if (failed) process.exit(1);
