import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import adapter from 'braces';
import micromatch from 'micromatch';
import { Linter } from 'eslint';
import nextPlugin from '@next/eslint-plugin-next';
const resolve = createRequire(import.meta.url).resolve;
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'next-brace-contract-'));
for (const file of ['app/page.tsx', 'apps/web/pages/legacy.tsx', 'apps/admin/app/page.tsx', 'apps/.hidden/pages/hidden-only.tsx', 'apps/app11/pages/numeric-only.tsx']) {
  const target = path.join(fixture, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, 'export default function Page() { return null; }\n');
}
const rule = '@next/next/no-html-link-for-pages';
function lint(rootDir, href) {
  const previous = process.cwd();
  process.chdir(fixture);
  try { return new Linter({ cwd: fixture }).verify(`export default function Page() { return <a href="${href}">Home</a>; }`, [{
    files: ['**/*.jsx'], plugins: { '@next/next': nextPlugin }, rules: { [rule]: 'error' },
    settings: rootDir === undefined ? {} : { next: { rootDir } },
    languageOptions: { ecmaVersion: 'latest', parserOptions: { ecmaFeatures: { jsx: true } } },
  }], { filename: path.join(fixture, 'case.jsx') }); }
  finally { process.chdir(previous); }
}
for (const [name, rootDir, href, expected] of [
  ['default app root', undefined, '/', 1], ['dot preserves cwd semantics', '.', '/legacy', 0],
  ['static root', 'apps/web', '/legacy', 1], ['static dot root', 'apps/web/.', '/legacy', 1],
  ['raw group root', 'apps/(web|admin)', '/legacy', 1], ['double dot prefix', '././apps/web', '/legacy', 0],
  ['dynamic globstar', 'apps/*/**', '/legacy', 1], ['dynamic globstar with slash', 'apps/*/**/', '/numeric-only', 1],
  ['static globstar', 'apps/web/**/', '/legacy', 0], ['negative extglob hidden root', 'apps/!(web|admin)', '/hidden-only', 1],
  ['negative class hidden root', 'apps/[!a]*', '/hidden-only', 1], ['numeric range', 'apps/app{1..12}', '/numeric-only', 1],
  ['step range', 'apps/app{1..12..2}', '/numeric-only', 1], ['array root setting', ['apps/web', 'apps/admin'], '/legacy', 1],
]) test(name, () => {
  const result = lint(rootDir, href);
  assert.equal(result.length, expected);
  assert.ok(result.every(item => item.ruleId === rule && item.severity === 2 && !item.fatal));
});
test('actual private package identity and expansion syntax', () => {
  assert.equal(JSON.parse(fs.readFileSync(resolve('braces/package.json'), 'utf8')).name, '@ai-in-action/next-brace-expansion-adapter');
  assert.deepEqual(micromatch.braces('apps/{"web,admin",web}', { expand: true, nodupes: true }), ['apps/web,admin', 'apps/web']);
  assert.deepEqual(micromatch.braces('apps/{a{b,c}}', { expand: true, nodupes: true }), ['apps/{ab}', 'apps/{ac}']);
  assert.deepEqual(micromatch.braces('apps/{w..w}eb', { expand: true, nodupes: true }), ['apps/web']);
});
test('unexpected APIs and complexity fail explicitly', () => {
  const opts = { expand: true, nodupes: true };
  assert.throws(() => adapter('{a,b}', { expand: true }), TypeError);
  assert.throws(() => adapter('{a,b}'.repeat(13), opts), RangeError);
  assert.throws(() => adapter('{' + ('{' + '{,}'.repeat(13) + ',apps/app11}') + ',apps/web}', opts), RangeError);
  assert.throws(() => adapter('{'.repeat(33) + 'a' + '}'.repeat(33), opts), RangeError);
  assert.throws(() => adapter('{9007199254740992..9007199254740993}', opts), RangeError);
  for (const pattern of ['apps/app{11e0..11e0}', 'apps/app{+11..+11}', 'apps/app{11..11..1.1}', 'apps/app{1..12..1e0}', 'apps/app{11..11..001}']) assert.throws(() => lint(pattern, '/numeric-only'), RangeError);
});
