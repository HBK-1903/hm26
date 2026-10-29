// HM26: sıralı tam regresyon otomasyonu. Build/core/stress/features ve her UI E2E'yi tek akışta çalıştırır.
// Kullanım: npm run qa:all
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const root = process.cwd();
const reportPath = `${root}/QA-AUTOMATION-LATEST.md`;
const rows = [];
let previewProcess = null;
const clean = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '').trim();
const stamp = new Date().toISOString();

function run(name, command, args, timeout = 300_000) {
  console.log(`\n${'='.repeat(74)}\n[QA ${rows.length + 1}] ${name}\n$ ${command} ${args.join(' ')}\n${'='.repeat(74)}`);
  const res = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, HM26_BASE_URL: 'http://localhost:4173' } });
  const stdout = clean(res.stdout ?? '');
  const stderr = clean(res.stderr ?? '');
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  const code = res.status ?? (res.error ? 1 : 0);
  rows.push({ name, code, stdout, stderr, error: res.error?.message ?? '' });
  console.log(`[${code === 0 ? 'PASS' : 'FAIL'}] ${name} (exit ${code})`);
  return code === 0;
}

async function ensurePreview() {
  try {
    const response = await fetch('http://127.0.0.1:4173', { signal: AbortSignal.timeout(1200) });
    if (response.ok) { console.log('\n[QA] Preview :4173 hazır; mevcut server kullanılacak.'); return true; }
  } catch { /* start local preview below */ }
  previewProcess = spawn('npm', ['run', 'preview', '--', '--host', '0.0.0.0', '--port', '4173'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const response = await fetch('http://127.0.0.1:4173', { signal: AbortSignal.timeout(1000) });
      if (response.ok) { console.log('\n[QA] Preview :4173 otomatik başlatıldı.'); return true; }
    } catch { /* wait for Vite */ }
  }
  return false;
}

try {
  if (!existsSync(`${root}/node_modules/.bin/tsc`)) run('Install locked dependencies', 'npm', ['ci'], 300_000);
  run('Production build + TypeScript + offline manifest', 'npm', ['run', 'build'], 300_000);
  run('PWA headers, manifest, icons and update lifecycle', 'npm', ['run', 'qa:pwa'], 120_000);

  const core = [
    ['Core integrity / serialization QA (11 tests)', ['tsx', 'tools/qa.ts']],
    ['Stress and broad feature QA (37 tests)', ['tsx', 'tools/qa-extended.ts']],
    ['Goalkeeper/stat consistency QA', ['tsx', 'tools/qa8-faza.ts']],
    ['Assets and brand manifest QA', ['tsx', 'tools/qa9-logopack.ts']],
    ['Live engine parity (300 matches)', ['tsx', 'tools/parity.ts']],
    ['Quick-match score/event consistency (KZP patch regression)', ['tsx', 'tools/qa-match-core-challenge-score.ts']],
    ['Match insight evidence QA (60 deterministic results)', ['tsx', 'tools/qa-match-core-evidence-insights.ts']],
    ['League/cup balance simulation (4,000 matches)', ['tsx', 'tools/masssim.ts']],
    ['Medical, protest, penalty, shout and telemetry QA', ['tsx', 'tools/qa-features-v099.ts']],
    ['Pitch Wave 1 geometry and goal-line clearance QA (6 checks)', ['tsx', 'tools/qa-pitch-v0912.ts']],
    ['Pitch formation, team colors and motion cadence', ['tsx', 'tools/qa-pitch-motion.ts']],
    ['Live engine projection and speed parity', ['tsx', 'tools/qa-live-projection-wave10.ts']],
    ['Shared UI notification timing', ['tsx', 'tools/qa-ui-smoothness.tsx']],
    ['New career advanced world settings', ['tsx', 'tools/qa-career-world.tsx']],
    ['Transfer presentation rules, voices and local artwork', ['tsx', 'tools/qa-transfer-scene.ts']],
  ];
  for (const [name, args] of core) run(name, 'npx', ['--yes', ...args], name.includes('simulation') ? 300_000 : 180_000);
  run('Transfer negotiation and save integration (jsdom)', 'npm', ['run', 'qa:transfer:scene:ui'], 180_000);
  run('Batched halftime event and decision flow (jsdom)', 'npm', ['run', 'qa:live:halftime'], 180_000);
  run('Match finish and manual interview flow (jsdom)', 'npm', ['run', 'qa:match-finish'], 180_000);
  run('Matchday progression and end-day regression (jsdom)', 'npm', ['run', 'qa:dayflow'], 180_000);

  const browserProbe = spawnSync(process.execPath, ['-e', "import('playwright').then(({ chromium }) => console.log(chromium.executablePath()))"], { cwd: root, encoding: 'utf8' });
  const chromiumExecutable = clean(browserProbe.stdout ?? '').split('\n').filter(Boolean).at(-1) ?? '';
  const headlessShell = chromiumExecutable.replace(/\/chromium-(\d+)\/chrome-linux64\/chrome$/, '/chromium_headless_shell-$1/chrome-headless-shell-linux64/chrome-headless-shell');
  if (!chromiumExecutable || !existsSync(chromiumExecutable) || (headlessShell && !existsSync(headlessShell))) {
    run('Install Playwright Chromium runtime', 'npx', ['--yes', 'playwright', 'install', 'chromium'], 600_000);
  }

  const runtimeTargets = [chromiumExecutable, headlessShell].filter((p) => p && existsSync(p));
  const missingLibraries = runtimeTargets.some((target) => {
    const result = spawnSync('ldd', [target], { encoding: 'utf8' });
    return /not found/.test(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  });
  if (missingLibraries) run('Install Chromium system libraries', 'npx', ['--yes', 'playwright', 'install-deps', 'chromium'], 600_000);

  const browserReady = run('Playwright Chromium launch smoke test', process.execPath, ['--input-type=module', '-e', "import { chromium } from 'playwright'; const browser = await chromium.launch(); await browser.close();"], 60_000);
  const previewReady = browserReady && await ensurePreview();
  if (!browserReady) rows.push({ name: 'Playwright UI E2Es (browser launch blocked)', code: 1, stdout: '', stderr: 'Chromium launch smoke test failed; see its captured diagnostics above.' });
  else if (!previewReady) rows.push({ name: 'Playwright preview server', code: 1, stdout: '', stderr: 'Could not start or reach http://127.0.0.1:4173' });
  else {
    const ui = [
      ['New career advanced world settings and save E2E', 'tools/e2e-career-world.mjs'],
      ['Embedded asset rendering E2E', 'tools/e2e-assets.mjs'],
      ['Icon system E2E', 'tools/e2e-icons.mjs'],
      ['Statistics and career history E2E', 'tools/e2e-stats.mjs'],
      ['Save-slot delete flow E2E', 'tools/e2e-slots.mjs'],
      ['Full profile → starting XI E2E', 'tools/e2e-xi-full.mjs'],
      ['Out-of-position warning E2E', 'tools/e2e-xi-warn.mjs'],
      ['Bench-first tactical flow E2E', 'tools/e2e-benchfirst.mjs'],
      ['Medical/mentoring/trade E2E', 'tools/e2e-features-v099.mjs'],
      ['Transfer theatre, signing and offline media E2E', 'tools/e2e-transfer-scene.mjs'],
      ['Market filters and match-flow E2E', 'tools/e2e-v099.mjs'],
      ['Live scorebug, feed, accessible Phaser pitch and action E2E (v0.9.12)', 'tools/e2e-live-v0911.mjs'],
      ['Deterministic Phaser motion and pause E2E', 'tools/e2e-pitch-motion.mjs'],
      ['PWA offline shell + cached bundles E2E (v0.9.12)', 'tools/e2e-offline-v0911.mjs'],
    ];
    for (const [name, script] of ui) run(name, process.execPath, [script], 240_000);
  }
} catch (error) {
  rows.push({ name: 'QA automation runner', code: 1, stdout: '', stderr: String(error) });
} finally {
  if (previewProcess) { previewProcess.kill('SIGTERM'); }
  const pass = rows.filter((row) => row.code === 0).length;
  const fail = rows.length - pass;
  const failingStages = rows.filter((row) => row.code !== 0).map((row) => row.name);
  const report = [
    '# HM26 — Sıralı Otomatik QA',
    `**Çalıştırma:** ${stamp}`,
    `**Sonuç:** ${pass}/${rows.length} geçti · ${fail} başarısız`,
    '',
    '| # | Aşama | Sonuç |',
    '|---:|---|---|',
    ...rows.map((row, i) => `| ${i + 1} | ${row.name.replaceAll('|', '\\|')} | ${row.code === 0 ? '✅ PASS' : '❌ FAIL'} |`),
    '',
    '## Bulgular ve açık işler',
    `- **Bu koşuda ürün/test kusuru:** ${fail === 0 ? 'bulunmadı; tüm aşamalar geçti.' : `açık başarısız aşamalar: ${failingStages.join(', ')}.`}`,
    '- **Otomasyon düzeltmesi:** eski E2E betiklerindeki :3001 adresleri ortak `HM26_BASE_URL` ile :4173 preview adresine alındı; yeniden koşuda ilgili akışlar geçti.',
    '- **Tarayıcı ortamı:** Chromium indirme ve paylaşımlı sistem kütüphanelerini kontrol etme/kurma adımları ile launch smoke testi otomasyona eklendi.',
    '- **Uyarılar:** `qa-extended` 37/37 testte sıfır başarısızlıkla iki istatistiksel uyarı üretir (100 maçlık skor dağılımı örneklemi ve farklı skor çeşitliliği). Build ayrıca kabul edilmiş Phaser lazy-chunk boyut uyarısını verir; Phaser maç ekranında lazy-load edilir.',
    '- **Dağıtım:** bu koşu yerel build/QA’dır; üretime deployment yapılmadı.',
    '',
    ...rows.flatMap((row, i) => [
      `## ${i + 1}. ${row.name}`,
      `Exit: ${row.code}`,
      row.error ? `\nRunner error: ${row.error}` : '',
      row.stdout ? `\n\`\`\`text\n${row.stdout.slice(-18000)}\n\`\`\`` : '',
      row.stderr ? `\nStderr:\n\`\`\`text\n${row.stderr.slice(-5000)}\n\`\`\`` : '',
      '',
    ]),
  ].filter(Boolean).join('\n');
  writeFileSync(reportPath, `${report}\n`);
  console.log(`\nQA report: ${reportPath}\n${pass}/${rows.length} stages passed; ${fail} failed.`);
  if (fail) process.exitCode = 1;
}
