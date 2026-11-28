import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDiagnosticReport, readRecentErrors, redactText } from '../diagnostics.js';

test('redactText strips user home paths and sensitive tokens', () => {
  const sample = 'Error at C:\\Users\\Alice\\AppData\\Local\\dsh?connectToken=secret123 Bearer abc.def.ghi sk_live_12345678 nlToken="tok999"';
  const redacted = redactText(sample, ['D:\\CustomSecret\\Dir']);
  assert.doesNotMatch(redacted, /Alice/i);
  assert.doesNotMatch(redacted, /secret123/);
  assert.doesNotMatch(redacted, /abc\.def\.ghi/);
  assert.doesNotMatch(redacted, /sk_live_12345678/);
  assert.doesNotMatch(redacted, /tok999/);
  assert.match(redacted, /<USER_HOME>/);
  assert.match(redacted, /\[REDACTED\]/);
});

test('readRecentErrors and buildDiagnosticReport produce clean summary', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kurowhale-diag-'));
  try {
    const logPath = join(dir, 'lifecycle.jsonl');
    await writeFile(logPath, [
      JSON.stringify({ time: '2026-11-28T10:00:00Z', event: 'started' }),
      JSON.stringify({ time: '2026-11-28T10:01:00Z', event: 'renderer-error', error: 'Failed reading C:\\Users\\Tester\\file nlToken=abc123' }),
    ].join('\n'));
    const errors = readRecentErrors(logPath, 5, [dir]);
    assert.equal(errors.length, 1);
    assert.doesNotMatch(errors[0], /Tester|abc123/);

    const report = buildDiagnosticReport({
      status: { version: '0.4.0', stage: 'running', state: 'idle', source: 'agent', rendererReady: true, nativePid: 9001, visible: true, topmost: true, x: 100, y: 120, scale: 1.25, preferences: { clickThrough: true } },
      displays: [{ id: 'DISPLAY1', primary: true, workArea: { x: 0, y: 0, w: 1920, h: 1040 }, dpiScale: 1.25 }],
      dshVersion: '0.2.3-alpha.2',
      recentErrors: errors,
    });
    assert.match(report, /Plugin: v0\.4\.0/);
    assert.match(report, /DSH=0\.2\.3-alpha\.2/);
    assert.match(report, /DISPLAY1 \(primary\).*dpi=1\.25x/);
    assert.match(report, /clickThrough=true/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
