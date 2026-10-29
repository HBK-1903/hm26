// Aynı maç adımında devre düdüğünü izleyen olayların arayüzde kaybolmadığını sınar.
import { spawnSync } from 'node:child_process';

for (const scenario of ['trailing', 'decision']) {
  console.log(`\n=== Devre partisi: ${scenario} ===`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--loader', './tools/qa-live-loader.mjs', 'tools/qa-live-finish.tsx'], {
    env: { ...process.env, HM26_HALFTIME_BATCH: scenario },
    stdio: 'inherit',
  });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
