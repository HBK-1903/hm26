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

The production site is generated in `dist/`. Deployment instructions for Cloudflare Pages are in [`DEPLOY-CLOUDFLARE.md`](./DEPLOY-CLOUDFLARE.md).

## Focused QA

```bash
npm run qa:match-core:challenge-score
npm run qa:match-core:evidence-insights
npm run qa:match-core:challenge-balance
npx tsx tools/qa-extended.ts
```

## Project notes

- The app and save format remain at their existing versions.
- Deployment ZIPs, `dist/`, dependencies and QA screenshots are excluded from Git; build them locally when needed.
- This repository does not yet declare an open-source license. Public visibility alone does not grant permission to reuse or redistribute the code; add a license only after choosing the intended terms.
