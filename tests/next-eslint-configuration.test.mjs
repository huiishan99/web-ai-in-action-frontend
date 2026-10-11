import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const severities = {
  'google-font-display': 1, 'google-font-preconnect': 1, 'next-script-for-ga': 1,
  'no-async-client-component': 1, 'no-before-interactive-script-outside-document': 1,
  'no-css-tags': 1, 'no-head-element': 1, 'no-html-link-for-pages': 2,
  'no-img-element': 1, 'no-page-custom-font': 1, 'no-styled-jsx-in-document': 1,
  'no-sync-scripts': 2, 'no-title-in-document-head': 1, 'no-typos': 1,
  'no-unwanted-polyfillio': 1, 'inline-script-id': 2, 'no-assign-module-variable': 2,
  'no-document-import-in-page': 2, 'no-duplicate-head': 2, 'no-head-import-in-document': 2,
  'no-script-component-in-head': 2,
};

test('all 21 configured Next rules retain their severities', async () => {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: path.join(root, 'eslint.config.mjs') });
  const config = await eslint.calculateConfigForFile(path.join(root, 'src/app/page.tsx'));
  const actual = Object.fromEntries(Object.entries(config.rules)
    .filter(([name]) => name.startsWith('@next/next/'))
    .map(([name, options]) => [name.slice('@next/next/'.length), options[0]]));
  assert.deepEqual(actual, severities);
});
