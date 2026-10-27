# Manager26 (HM26)

Offline-first Turkish football management game. Built with React, TypeScript, Vite and Phaser.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal.

## Production build

```bash
npm run build
```

The production site is generated in `dist/`. Deployment instructions for Cloudflare Pages are in [`DEPLOY-CLOUDFLARE.md`](./DEPLOY-CLOUDFLARE.md). The service worker is production-only; new releases offer an in-app update prompt before activation.

## PWA features

- Installable standalone app: `public/manifest.json` with maskable 192/512 PNG icons, Android launch shortcuts (`#squad`, `#market`, `#tactics`) and install-dialog screenshots.
- Offline-first shell: `public/sw.js` precaches the whole build at install time (the precache list is injected by `tools/inject-sw-manifest.mjs`); hash-linked assets are cache-first, navigations network-first with an offline fallback.
- User-controlled updates: a waiting service worker only activates after the in-app prompt is accepted.
- iOS launch screens: `apple-touch-startup-image` tags in `index.html`, backed by generated PNGs in `public/splash/`.
- Store/OS-level assets (`splash/`, `screenshots/`) are deliberately excluded from the service-worker precache to keep installs light.

Launch screens, promo screenshots and shortcut icons are generated deterministically:

```bash
python3 -m pip install pillow
python3 tools/generate-pwa-assets.py
```

## Focused QA

```bash
npm run qa:match-core:challenge-score
npm run qa:match-core:evidence-insights
npm run qa:pwa
npm run qa:match-core:challenge-balance
npx tsx tools/qa-extended.ts
```

## Project notes

- The app and save format remain at their existing versions.
- Deployment ZIPs, `dist/`, dependencies and QA screenshots are excluded from Git; build them locally when needed.
- This repository does not yet declare an open-source license. Public visibility alone does not grant permission to reuse or redistribute the code; add a license only after choosing the intended terms.
