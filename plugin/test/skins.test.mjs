import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseWebpMetadata, validateSkinDirectory } from '../skins.js';

function makeVp8xWebp(width, height, { alpha = true } = {}) {
  const buf = Buffer.alloc(30);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(22, 4);
  buf.write('WEBP', 8, 'ascii');
  buf.write('VP8X', 12, 'ascii');
  buf.writeUInt32LE(10, 16);
  buf[20] = alpha ? 0x10 : 0x00;
  const w = width - 1;
  const h = height - 1;
  buf[24] = w & 0xff; buf[25] = (w >> 8) & 0xff; buf[26] = (w >> 16) & 0xff;
  buf[27] = h & 0xff; buf[28] = (h >> 8) & 0xff; buf[29] = (h >> 16) & 0xff;
  return buf;
}

test('parseWebpMetadata reads VP8X dimensions and alpha channel flag', () => {
  const meta12 = parseWebpMetadata(makeVp8xWebp(1536, 2496, { alpha: true }));
  assert.deepEqual(meta12, { width: 1536, height: 2496, hasAlpha: true, format: 'VP8X' });
  const metaOpaque = parseWebpMetadata(makeVp8xWebp(1536, 1872, { alpha: false }));
  assert.equal(metaOpaque.hasAlpha, false);
});

test('validateSkinDirectory validates standard 12-row skin packs, legacy 9-row packs, and rejects invalid packs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kurowhale-skins-'));
  try {
    // 1) Standard 12-row skin pack with optional sound
    const pack12 = join(dir, 'starry-12');
    await mkdir(join(pack12, 'sounds'), { recursive: true });
    await writeFile(join(pack12, 'manifest.json'), JSON.stringify({
      schemaVersion: 1,
      id: 'starry-whale',
      name: 'Starry Whale',
      version: '1.0.0',
      rows: 12,
      columns: 8,
      frameWidth: 192,
      frameHeight: 208,
      spritesheet: 'spritesheet.webp',
      pet: 'pet.json',
      sounds: { waiting: 'sounds/waiting.wav' },
    }));
    await writeFile(join(pack12, 'pet.json'), JSON.stringify({ id: 'starry-whale', displayName: 'Starry', spritesheetPath: 'spritesheet.webp' }));
    await writeFile(join(pack12, 'spritesheet.webp'), makeVp8xWebp(1536, 2496, { alpha: true }));
    await writeFile(join(pack12, 'sounds', 'waiting.wav'), Buffer.from('RIFF0000WAVEfmt '));

    const res12 = validateSkinDirectory(pack12, { strict: true });
    assert.equal(res12.ok, true);
    assert.equal(res12.mode, 'skin-pack-12row');
    assert.ok(res12.sounds.waiting);

    // 2) Legacy 9-row skin without manifest.json passes compat, fails --strict
    const legacy9 = join(dir, 'legacy-9');
    await mkdir(legacy9);
    await writeFile(join(legacy9, 'pet.json'), JSON.stringify({ id: 'legacy', displayName: 'Legacy 9', spritesheetPath: 'spritesheet.webp' }));
    await writeFile(join(legacy9, 'spritesheet.webp'), makeVp8xWebp(1536, 1872, { alpha: true }));
    const res9Compat = validateSkinDirectory(legacy9, { strict: false });
    assert.equal(res9Compat.ok, true);
    assert.equal(res9Compat.mode, 'legacy-9row-compat');
    assert.equal(validateSkinDirectory(legacy9, { strict: true }).ok, false);

    // 3) Rejects opaque WebP or wrong dimensions or path traversal
    const bad = join(dir, 'bad-skin');
    await mkdir(bad);
    await writeFile(join(bad, 'manifest.json'), JSON.stringify({
      schemaVersion: 1,
      id: 'BAD ID',
      name: 'Bad',
      version: '1.0.0',
      spritesheet: '../escape.webp',
    }));
    await writeFile(join(bad, 'pet.json'), JSON.stringify({ spritesheetPath: 'spritesheet.webp' }));
    await writeFile(join(bad, 'spritesheet.webp'), makeVp8xWebp(1024, 1872, { alpha: false }));
    const resBad = validateSkinDirectory(bad);
    assert.equal(resBad.ok, false);
    assert.ok(resBad.errors.length >= 2);

    // 4) CLI validate-skin.mjs exits 0 on valid and non-zero on invalid
    const cliOut = execFileSync(process.execPath, ['scripts/validate-skin.mjs', pack12, '--strict', '--json'], { encoding: 'utf8' });
    assert.equal(JSON.parse(cliOut).ok, true);
    assert.throws(() => execFileSync(process.execPath, ['scripts/validate-skin.mjs', bad], { stdio: 'pipe' }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
