import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const source = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const plugin = JSON.parse(await readFile(new URL('plugin/package.json', root), 'utf8'));

test('both installable manifests identify the repository and preserve rc.5 support', () => {
  assert.deepEqual(source.repository, { type: 'git', url: 'git+https://github.com/lemonxiny55/dsh-kurowhale-pet.git' });
  assert.equal(source.homepage, 'https://github.com/lemonxiny55/dsh-kurowhale-pet#readme');
  assert.equal(source.bugs.url, 'https://github.com/lemonxiny55/dsh-kurowhale-pet/issues');
  assert.equal(source.engines.dsh, '0.2.1-rc.3 || 0.2.1-rc.5');
  for (const key of ['name', 'version', 'repository', 'homepage', 'bugs', 'engines']) {
    assert.deepEqual(plugin[key], source[key], key);
  }
});

test('npm staging retains public metadata and rejects missing or inconsistent repository linkage', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kurowhale-market-'));
  try {
    await mkdir(join(dir, 'scripts'));
    await mkdir(join(dir, 'plugin'));
    await copyFile(new URL('scripts/stage-npm.mjs', root), join(dir, 'scripts/stage-npm.mjs'));
    await writeFile(join(dir, 'plugin/package.json'), JSON.stringify(plugin));
    // Keep this packaging regression offline; real artwork is checked when packing the candidate.
    await writeFile(join(dir, 'plugin/resources.js'), 'export async function downloadAssets() { return {}; }');
    for (const name of ['LICENSE', 'LICENSE-ARTWORK', 'NOTICE-ARTWORK.md', 'THIRD_PARTY_NOTICES.md', 'README.md', 'README.en.md']) {
      await copyFile(new URL(name, root), join(dir, name));
    }
    const run = name => execFileSync(process.execPath, [join(dir, 'scripts/stage-npm.mjs'), join(dir, name)], { stdio: 'pipe' });
    await writeFile(join(dir, 'package.json'), JSON.stringify(source));
    run('valid');
    const staged = JSON.parse(await readFile(join(dir, 'valid/package.json'), 'utf8'));
    assert.equal(staged.private, undefined);
    for (const key of ['name', 'version', 'repository', 'homepage', 'bugs', 'engines']) assert.deepEqual(staged[key], source[key], key);
    await writeFile(join(dir, 'package.json'), JSON.stringify({ ...source, repository: undefined }));
    assert.throws(() => run('missing'), /must link back/);
    await writeFile(join(dir, 'package.json'), JSON.stringify({ ...source, version: '99.0.0' }));
    assert.throws(() => run('mismatch'), /disagree on version/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
