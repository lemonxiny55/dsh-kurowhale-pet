import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { name, apply } from '../index.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('declares an installable DSH bundle with a pinned RC target', async () => {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'dsh-kurowhale-pet');
  assert.equal(pkg.private, true);
  assert.equal(pkg.engines.dsh, '0.2.1-rc.3 || 0.2.1-rc.5');
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
});

test('patch references only the backend entrypoint', async () => {
  const patch = await readFile(resolve(root, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /- insert:/);
  assert.match(patch, /id: kurowhale-host/);
  assert.match(patch, /name: dsh-kurowhale-pet/);
  assert.doesNotMatch(patch.replace(/^\s*#.*$/gm, ''), /webRuntime|webServer|client|frontend|web-entry/i);
});

test('backend entrypoint exports a loadable apply function', () => {
  assert.equal(name, 'dsh-kurowhale-pet');
  assert.equal(typeof apply, 'function');
});
