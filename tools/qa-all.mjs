// HM26: sıralı tam regresyon otomasyonu. Build/core/stress/features ve her UI E2E'yi tek akışta çalıştırır.
// Kullanım: npm run qa:all
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { qaChildStatus, qaFailureAnnotation } from './qa-child-status.mjs';
import { startQaPreview, stopQaPreview } from './qa-preview.mjs';

const root = process.cwd();
const reportPath = `${root}/QA-AUTOMATION-LATEST.md`;
const rows = [];
let previewProcess = null;
const clean = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '').trim();
const stamp = new Date().toISOString();

function run(name, command, args, timeout = 300_000, extraEnv = {}) {
  console.log(`\n${'='.repeat(74)}\n[QA ${rows.length + 1}] ${name}\n$ ${command} ${args.join(' ')}\n${'='.repeat(74)}`);
  const res = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, HM26_BASE_URL: 'http://localhost:4173', ...extraEnv } });
  const stdout = clean(res.stdout ?? '');
  const stderr = clean(res.stderr ?? '');
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  // A signal-terminated or timed-out child has no exit status; it must never
  // be reported as a successful QA stage.
  const { code, error } = qaChildStatus(res);
  rows.push({ name, code, stdout, stderr, error });
  console.log(`[${code === 0 ? 'PASS' : 'FAIL'}] ${name} (exit ${code})`);
  return code === 0;
}

async function ensurePreview() {
  try {
    const response = await fetch('http://127.0.0.1:4173', { signal: AbortSignal.timeout(1200) });
    if (response.ok) { console.log('\n[QA] Preview :4173 hazır; mevcut server kullanılacak.'); return true; }
  } catch { /* start local preview below */ }
  previewProcess = startQaPreview(root);
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
  run('QA runner exit, signal and timeout handling', process.execPath, ['tools/qa-child-status.test.mjs'], 60_000);
  run('Browser save readiness handles delay and stale data', process.execPath, ['tools/qa-browser-save.test.mjs'], 60_000);
  run('Production build + TypeScript + offline manifest', 'npm', ['run', 'build'], 300_000);
  run('QA preview server startup and cleanup', process.execPath, ['tools/qa-preview.test.mjs'], 60_000);
  run('PWA headers, manifest, icons and update lifecycle', 'npm', ['run', 'qa:pwa'], 120_000);
  run('Content-derived service-worker build identity', 'npm', ['run', 'qa:sw-manifest'], 60_000);
  run('Save integrity, legacy migration and transaction conflicts (jsdom)', 'npm', ['run', 'qa:save-integrity'], 120_000);
  run('Project-local security skill installation checks (not an audit)', 'npm', ['run', 'qa:security-skill'], 60_000);
  run('Agency development role installation checks (not independent agents)', 'npm', ['run', 'qa:agency-roles'], 60_000);

  const core = [
    ['Core integrity / serialization QA (11 tests)', ['tsx', 'tools/qa.ts']],
    ['Save-slot season metadata and legacy compatibility QA', ['tsx', 'tools/qa-save-metadata.ts']],
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
    ['Newsroom saved-evidence regression', ['tsx', 'tools/qa-newsroom-wave13.ts']],
    ['Market refresh, shortlist and press-room links', ['tsx', 'tools/qa-market-improvements.ts']],
  ];
  for (const [name, args] of core) run(name, 'npx', ['--yes', ...args], name.includes('simulation') ? 300_000 : 180_000);

  // Feature-specific suites that used to be runnable only individually.
  const focused = [
    ['MatchCore event/reducer contracts', 'qa:match-core'],
    ['Production simulation isolation, legacy adapter and replay', 'qa:production-core'],
    ['MatchCore state and deterministic input', 'qa:match-core:wave2'],
    ['MatchCore live/instant and replay parity', 'qa:match-core:wave3'],
    ['Live-match checkpoint, decisions and deterministic replay', 'qa:live:checkpoint'],
    ['MatchCore shot and VAR consistency', 'qa:match-core:wave4'],
    ['MatchCore time, fatigue and player minutes', 'qa:match-core:wave5'],
    ['MatchCore injuries and substitutions', 'qa:match-core:wave6'],
    ['MatchCore referees and set pieces', 'qa:match-core:wave7'],
    ['MatchCore tactics and AI decisions', 'qa:match-core:wave8'],
    ['Goal pace, randomness and causal score calibration (6,480 matches)', 'qa:goal-calibration'],
    ['League and favorite balance simulation (10,000 matches)', 'qa:match-core:wave8:balance'],
    ['Challenge balance simulation (15,000 matches)', 'qa:match-core:challenge-balance'],
    ['Transfer negotiation and resale clauses', 'qa:transfer:wave11'],
    ['Academy recruitment and limits', 'qa:academy:wave12'],
    ['Club culture and financial decisions', 'qa:culture:wave14'],
    ['Board budget approval, refusal, limits and durable save', 'qa:board-budget'],
    ['International competition progression', 'qa:international:wave15'],
    ['AI appearances, score fingerprint, ratings and legacy saves', 'qa:ai-appearances'],
    ['Classic interviews and outcomes', 'qa:interview'],
    ['GameProvider played-fixture and durable save', 'qa:store-fixture'],
  ];
  for (const [name, script] of focused) run(name, 'npm', ['run', script], name.includes('simulation') ? 300_000 : 180_000);

  run('Transfer negotiation and save integration (jsdom)', 'npm', ['run', 'qa:transfer:scene:ui'], 180_000);
  run('Sale negotiation, settlement and save integration (jsdom)', 'npm', ['run', 'qa:sale:ui'], 180_000);
  run('Market potential, rotation, match plan and legacy saves (jsdom)', 'npm', ['run', 'qa:market-squad:ui'], 180_000);
  run('Contract renewal and recorded match highlights (jsdom)', 'npm', ['run', 'qa:renewal-highlights:ui'], 180_000);
  run('Live reactions, player comparison and weekly paper (jsdom)', 'npm', ['run', 'qa:atmosphere-paper:ui'], 180_000);
  run('Match arrival, award, training and career story (jsdom)', 'npm', ['run', 'qa:career-scenes:ui'], 180_000);
  run('Newsroom and fan atmosphere regression (jsdom)', 'npm', ['run', 'qa:wave7:ui'], 180_000);
  run('Tactics editor regression (jsdom)', 'npm', ['run', 'qa:wave2:ui'], 180_000);
  run('Squad rotation and health regression (jsdom)', 'npm', ['run', 'qa:wave3:ui'], 180_000);
  run('Matchday preparation regression (jsdom)', 'npm', ['run', 'qa:wave5:ui'], 180_000);
  run('Batched halftime event and decision flow (jsdom)', 'npm', ['run', 'qa:live:halftime'], 180_000);
  run('Injury treatment and return do not repeat decisions (jsdom)', 'npm', ['run', 'qa:match-finish'], 180_000, { HM26_INJURY_DECISION_TEST: '1' });
  run('Match finish, last-whistle reaction and manual interview (jsdom)', 'npm', ['run', 'qa:match-finish'], 180_000, { HM26_FINAL_BATCH: 'card' });
  run('Cancelled goal live presentation, audio and match finish (jsdom)', 'npm', ['run', 'qa:match-finish'], 180_000, { HM26_CANCELLED_GOAL: '1' });
  run('Match finish recovery after simulated engine failure (jsdom)', 'npm', ['run', 'qa:match-finish'], 180_000, { HM26_FAULT: 'finish' });
  run('Matchday progression and end-day regression (jsdom)', 'npm', ['run', 'qa:dayflow'], 180_000);
  for (const [name, script] of [
    ['Team insights and statistics UI (jsdom)', 'qa:wave6:ui'],
    ['Player analytics and match history UI (jsdom)', 'qa:analytics:ui'],
    ['Scout, interview and press profile UI (jsdom)', 'qa:scout:ui'],
    ['News and career analytics UI (jsdom)', 'qa:fixwave:ui'],
    ['Match preparation and league analytics UI (jsdom)', 'qa:cwave:ui'],
  ]) run(name, 'npm', ['run', script], 180_000);

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
      ['Delayed career save readiness E2E', 'tools/e2e-career-save-readiness.mjs'],
      ['New career advanced world settings and save E2E', 'tools/e2e-career-world.mjs'],
      ['Embedded asset rendering E2E', 'tools/e2e-assets.mjs'],
      ['Icon system E2E', 'tools/e2e-icons.mjs'],
      ['Statistics and career history E2E', 'tools/e2e-stats.mjs'],
      ['Complete statistics and league rankings E2E (320px and 390px)', 'tools/e2e-ranking.mjs'],
      ['Full tactical roster, league names and ratings E2E (320px and 390px)', 'tools/e2e-roster-league.mjs'],
      ['Bench, global market and complete records E2E (320px and 390px)', 'tools/e2e-new-features.mjs'],
      ['Live-match resume, decisions, backup and failure E2E', 'tools/e2e-live-resume.mjs'],
      ['Production service worker offline live-match resume E2E', 'tools/e2e-offline-live.mjs'],
      ['Save-slot delete flow E2E', 'tools/e2e-slots.mjs'],
      ['Backup, storage failure, legacy migration and stale-tab E2E (390px)', 'tools/e2e-save-integrity.mjs'],
      ['Backup, storage failure, legacy migration and stale-tab E2E (320px)', 'tools/e2e-save-integrity.mjs', { HM26_VIEWPORT_WIDTH: '320' }],
      ['Board budget approval and reload on migrated career E2E (390px)', 'tools/e2e-board-budget.mjs'],
      ['Board budget approval and reload on migrated career E2E (320px)', 'tools/e2e-board-budget.mjs', { HM26_VIEWPORT_WIDTH: '320' }],
      ['Service-worker two-release and offline isolation E2E', 'tools/e2e-sw-update.mjs'],
      ['Save-before-update and multi-tab game update E2E', 'tools/e2e-update-game.mjs'],
      ['Full profile → starting XI E2E', 'tools/e2e-xi-full.mjs'],
      ['Out-of-position warning E2E', 'tools/e2e-xi-warn.mjs'],
      ['Bench-first tactical flow E2E', 'tools/e2e-benchfirst.mjs'],
      ['Medical/mentoring/trade E2E', 'tools/e2e-features-v099.mjs'],
      ['Transfer theatre, signing and offline media E2E', 'tools/e2e-transfer-scene.mjs'],
      ['Market potential, rotation and sale negotiation E2E', 'tools/e2e-market-squad-polish.mjs'],
      ['Contract renewal and recorded match highlights E2E', 'tools/e2e-renewal-highlights.mjs'],
      ['Live reactions, player comparison and weekly paper E2E', 'tools/e2e-atmosphere-comparison-paper.mjs'],
      ['Match arrival, award, training and career story E2E', 'tools/e2e-career-scenes.mjs'],
      ['Market filters and live tactic flow E2E (390px)', 'tools/e2e-v099.mjs'],
      ['Market filters and live tactic flow E2E (320px)', 'tools/e2e-v099.mjs', { HM26_VIEWPORT_WIDTH: '320' }],
      ['Injury treatment and return E2E (320px home, 390px away)', 'tools/e2e-injury-decision.mjs'],
      ['Live scorebug, feed, accessible Phaser pitch and action E2E (v0.9.12)', 'tools/e2e-live-v0911.mjs'],
      ['Deterministic Phaser motion and pause E2E', 'tools/e2e-pitch-motion.mjs'],
      ['PWA offline shell + cached bundles E2E (v0.9.12)', 'tools/e2e-offline-v0911.mjs'],
    ];
    for (const [name, script, extraEnv] of ui) run(name, process.execPath, [script], 240_000, extraEnv);
  }
} catch (error) {
  rows.push({ name: 'QA automation runner', code: 1, stdout: '', stderr: String(error) });
} finally {
  await stopQaPreview(previewProcess);
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
    `- **Bu koşudaki testler:** ${fail === 0 ? 'tüm aşamalar geçti; test kapsamı dışındaki kusurlar ayrıca incelenmelidir.' : `başarısız aşamalar: ${failingStages.join(', ')}.`}`,
    '- **Otomasyon düzeltmesi:** eski E2E betiklerindeki :3001 adresleri ortak `HM26_BASE_URL` ile :4173 preview adresine alındı; yeniden koşuda ilgili akışlar geçti.',
    '- **Tarayıcı ortamı:** Chromium indirme ve paylaşımlı sistem kütüphanelerini kontrol etme/kurma adımları ile launch smoke testi otomasyona eklendi.',
    '- **Ek kapsam:** maç çekirdeği, klasik röportajlar, transfer/akademi/kulüp kültürü/uluslararası kupa ve ek arayüz testleri de artık bu sıraya dahildir.',
    '- **Yönetim bütçesi:** mevcut güven, lig performansı ve mali verilere dayalı onay/ret; sezon başına tek onay, redden sonra 30 günlük bekleme ve kayıt/yeniden açma testleri kapsamdadır.',
    '- **Maç çekirdeği:** canlı ve hızlı maçlar callback içermeyen, kopyalanmış girdi kullanan ortak üretim çekirdeğinde çalışır; eski oturum ve komut tekrar oynatma yolları uyumluluk adaptörleriyle korunur.',
    '- **Denge:** ayrı normal lig ve favori ev/deplasman senaryoları 15.000 ve 10.000 maçta, gol temposu/rastlantısallık ayarları 6.480 maçta izlenir. `QA-MATCH-BALANCE.md` ana maç çekirdeğini karşılaştırır; ayrı, sonuç odaklı AI fikstür simülasyonunun takım başına 6 gol tavanı sürmektedir.',
    '- **AI katılımı:** yeni sonuç odaklı AI maçlarında yalnız seçilen ilk 11 sayılır; değişiklik ve reyting üretilmez. Eski maçlarda oyuncu katılım geçmişi bulunmadığından eski hatalı sayılar geriye dönük uydurulmaz. Skor RNG parmak izi, tüm müsabakalar, puanlı maçlar ve gerçek v2 kayıt test edilir.',
    '- **Kadro ve lig:** ilk 11 dışındaki tüm oyunculara erişim, gerçek maçın en fazla 9 yedeği, tam kulüp adları/form ve 320/390 px açık/koyu tema Chromium ile sınanır.',
    '- **Uyarılar:** `qa-extended` 100 maçlık küçük örneklemde istatistiksel uyarılar üretebilir; her koşunun çıktısı aşağıdadır. Build Phaser lazy-chunk boyut uyarısı verir; Phaser maç ekranında lazy-load edilir.',
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
  if (fail && process.env.GITHUB_ACTIONS === 'true') {
    for (const row of rows.filter((item) => item.code !== 0)) console.error(qaFailureAnnotation(row));
  }
  if (fail) process.exitCode = 1;
}
