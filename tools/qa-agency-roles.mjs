// Verifies four pinned project-local role references; this does not create independent agents.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), '.agents/roles/agency-agents');
const metadata = JSON.parse(readFileSync(join(root, 'UPSTREAM.json'), 'utf8'));
const expectedRoles = {
  'design/design-ui-designer.md': 'UI Designer',
  'game-development/game-designer.md': 'Game Designer',
  'game-development/narrative-designer.md': 'Narrative Designer',
  'testing/testing-test-automation-engineer.md': 'Test Automation Engineer',
};
const expectedFiles = ['LICENSE', ...Object.keys(expectedRoles)].sort();
const router = readFileSync('.agents/roles/HM26.md', 'utf8');
const instructions = readFileSync('AGENTS.md', 'utf8');
const gitBlobHash = (contents) => createHash('sha1').update(`blob ${contents.length}\0`).update(contents).digest('hex');
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`✅ ${name}`); };

function listFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert(!entry.isSymbolicLink(), `${path}: sembolik bağlantı olamaz`);
    if (entry.isDirectory()) return listFiles(join(dir, entry.name), path);
    assert(entry.isFile(), `${path}: normal dosya olmalı`);
    return [path];
  });
}

check('Kaynak, sabit sürüm ve MIT lisansı doğru', () => {
  assert.equal(metadata.repository, 'https://github.com/msitarzewski/agency-agents');
  assert.equal(metadata.revision, 'b37b5bb33b78f2c1d6567d98e25ca818e3259219');
  assert.equal(metadata.license, 'MIT');
  assert.equal(metadata.hashAlgorithm, 'git-blob-sha1');
  assert.deepEqual(Object.keys(metadata.files).sort(), expectedFiles);
  assert.match(readFileSync(join(root, 'LICENSE'), 'utf8'), /Copyright \(c\) 2025 AgentLand Contributors/);
});
check('Dört rol ve lisans orijinal GitHub içeriğiyle birebir', () => {
  for (const name of expectedFiles) {
    assert.match(name, /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/);
    assert.match(metadata.files[name], /^[a-f0-9]{40}$/);
    const file = join(root, name);
    const stat = lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink());
    assert.equal(gitBlobHash(readFileSync(file)), metadata.files[name], `${name}: içerik değişmiş`);
  }
  assert.deepEqual(listFiles(root).sort(), [...expectedFiles, 'UPSTREAM.json'].sort());
});
check('Yalnız seçilen dört rol mevcut ve doğru adları taşıyor', () => {
  for (const [path, name] of Object.entries(expectedRoles)) {
    const text = readFileSync(join(root, path), 'utf8');
    assert(text.startsWith(`---\nname: ${name}\n`), `${path}: rol adı beklenenden farklı`);
  }
});
check('HM26 yönlendirmesi dört role tek tek bağlanıyor', () => {
  for (const path of Object.keys(expectedRoles)) assert(router.includes(`agency-agents/${path}`), `${path}: yönlendirme eksik`);
  assert(router.includes('Select only the roles relevant to the task'));
  assert(instructions.includes('.agents/roles/HM26.md'));
});
check('Bağımsız ajan iddiası yok; güvenlik rehberi korunuyor', () => {
  assert(router.includes('not independent agents'));
  assert(instructions.includes('.agents/skills/security-audit/SKILL.md'));
  assert(router.includes('.agents/skills/security-audit/SKILL.md'));
});
check('Çevrimdışı oyun ve mevcut kayıt kuralları korunuyor', () => {
  assert(router.includes('offline-first'));
  assert(router.includes('Do not add persistent fields'));
  assert(router.includes('256-match archive limit'));
  assert(router.includes('Do not introduce an 18-subattribute system'));
  assert(router.includes('80–84') && router.includes('85 or above'));
});
check('Rol dosyaları oyun dağıtımına eklenmemiş', () => {
  if (!existsSync('dist')) return; // Full QA builds first; standalone source checks need no build.
  assert.equal(existsSync('dist/.agents'), false);
  assert.equal(existsSync('dist/AGENTS.md'), false);
});
console.log(`\n${passed}/${passed} rol kurulum kontrolü geçti; bu kontrol bağımsız ajan çalıştırmaz.`);
