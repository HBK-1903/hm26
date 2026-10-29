// Checks the pinned Cloudflare skill installation; this is not a security audit.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), '.agents/skills/security-audit');
const metadata = JSON.parse(readFileSync(join(root, 'UPSTREAM.json'), 'utf8'));
const names = Object.keys(metadata.files);
const gitBlobHash = (contents) => createHash('sha1').update(`blob ${contents.length}\0`).update(contents).digest('hex');
let passed = 0;
const check = (name, run) => { run(); passed++; console.log(`✅ ${name}`); };

check('Kaynak, sabit sürüm ve MIT lisansı kayıtlı', () => {
  assert.equal(metadata.repository, 'https://github.com/cloudflare/security-audit-skill');
  assert.equal(metadata.revision, 'c1c8a8c1471069fb0e188eeaff69b8e8db6564a8');
  assert.equal(metadata.directory, 'skills/security-audit');
  assert.equal(metadata.license, 'MIT');
  assert.equal(metadata.hashAlgorithm, 'git-blob-sha1');
  assert.equal(names.length, 21);
});
check('Tüm kaynak dosyaları ve lisans sabitlenen GitHub içeriğiyle birebir', () => {
  for (const name of names) {
    assert.match(name, /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    assert.match(metadata.files[name], /^[a-f0-9]{40}$/);
    const file = join(root, name);
    const stat = lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink(), `${name}: normal dosya değil`);
    assert.equal(gitBlobHash(readFileSync(file)), metadata.files[name], `${name}: içerik değişmiş`);
  }
  assert.deepEqual(readdirSync(root).sort(), [...names, 'UPSTREAM.json'].sort());
});
check('Skill girişi ve kaynak lisansı okunabiliyor', () => {
  const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: security-audit\ndescription: /);
  assert.match(skill, /## Operating modes/);
  assert.match(readFileSync(join(root, 'LICENSE'), 'utf8'), /Copyright \(c\) 2025-2026 Cloudflare, Inc\./);
});
check('Belgelerdeki yerel skill bağlantıları mevcut', () => {
  for (const name of names.filter((entry) => entry.endsWith('.md'))) {
    const text = readFileSync(join(root, name), 'utf8');
    for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(link)) continue;
      const local = link.split('#')[0];
      assert(names.includes(local) && existsSync(join(root, local)), `${name} → ${link}: eksik`);
    }
  }
});
check('Rapor şeması ve iki doğrulayıcı dosyası erişilebilir', () => {
  assert.equal(typeof JSON.parse(readFileSync(join(root, 'report-schema.json'), 'utf8')), 'object');
  for (const name of ['validate-findings.cjs', 'validate-coverage-ledger.cjs', 'validate-findings.test.cjs', 'validate-coverage-ledger.test.cjs']) {
    assert(names.includes(name));
  }
});
check('Proje ajanın skill dosyasını açıkça işaret ediyor', () => {
  assert.match(readFileSync('AGENTS.md', 'utf8'), /\.agents\/skills\/security-audit\/SKILL\.md/);
});
check('Ajan yönergeleri oyun dağıtım klasörüne kopyalanmamış', () => {
  if (!existsSync('dist')) return; // `qa:all` builds first; a standalone source check need not build.
  assert.equal(existsSync('dist/.agents'), false);
  assert.equal(existsSync('dist/AGENTS.md'), false);
});
console.log(`\n${passed}/${passed} skill kurulum kontrolü geçti. Bu kontrol güvenlik denetimi değildir.`);
