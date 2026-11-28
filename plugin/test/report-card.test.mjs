import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReportCardModel, decodePngDataUrl, saveReportCardPng } from '../report-card.js';
import { createStatsTracker } from '../stats.js';

// 1x1 transparent PNG
const SAMPLE_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('buildReportCardModel creates daily and weekly geek report card payloads', () => {
  let now = new Date(2026, 10, 27, 16, 0, 0);
  const tracker = createStatsTracker(null, () => now);
  tracker.addCompanionSeconds(1800);
  tracker.recordTurnEnd(true);
  tracker.recordApproval('allowed-once', true);
  tracker.recordUsage({ inputTokens: 1000, outputTokens: 500 });

  now = new Date(2026, 10, 28, 16, 0, 0);
  tracker.addCompanionSeconds(3600);
  tracker.recordTurnEnd(true);
  tracker.recordToolCall('coding');
  tracker.feedFish();

  const snap = tracker.snapshot();
  const todayModel = buildReportCardModel(snap, 'today', 'zh');
  assert.equal(todayModel.brand, 'dsh-kurowhale-pet');
  assert.equal(todayModel.streakDays, 2);
  assert.equal(todayModel.metrics.find(m => m.label === '完成轮次')?.value, '1');
  assert.equal(todayModel.metrics.find(m => m.label === '喂鱼互动')?.value, '1 🐟');

  const weekModel = buildReportCardModel(snap, 'week', 'en');
  assert.equal(weekModel.period, 'week');
  assert.equal(weekModel.metrics.find(m => m.label === 'Turns')?.value, '2');
  assert.equal(weekModel.metrics.find(m => m.label === 'Companion')?.value, '1h 30m');
});

test('decodePngDataUrl and saveReportCardPng validate PNG header and persist atomically', async () => {
  assert.throws(() => decodePngDataUrl('data:image/png;base64,aGVsbG8='), /not a valid PNG/);
  const dir = await mkdtemp(join(tmpdir(), 'kurowhale-report-'));
  try {
    const outPath = saveReportCardPng({
      dataUrl: `data:image/png;base64,${SAMPLE_PNG_B64}`,
      directory: dir,
      period: 'today',
      dateKey: '2026-11-28',
    });
    const written = await readFile(outPath);
    assert.deepEqual([...written.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
