import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCareMonitor, createStatsTracker, extractUsageTokens,
  formatCompanionTime, formatTokens, localDateKey,
} from '../stats.js';

test('extractUsageTokens supports multiple LLM usage schemas and ignores empty payloads', () => {
  assert.deepEqual(extractUsageTokens({ inputTokens: 1200, outputTokens: 350, cachedInputTokens: 400 }), {
    input: 1200, output: 350, cached: 400, total: 1550,
  });
  assert.deepEqual(extractUsageTokens({ prompt_tokens: 500, completion_tokens: 250, total_tokens: 750 }), {
    input: 500, output: 250, cached: 0, total: 750,
  });
  assert.equal(extractUsageTokens({}), null);
  assert.equal(extractUsageTokens(null), null);
});

test('formatTokens and formatCompanionTime produce compact readable labels', () => {
  assert.equal(formatTokens(420), '420');
  assert.equal(formatTokens(4560), '4.6k');
  assert.equal(formatTokens(18400), '18k');
  assert.equal(formatTokens(1_250_000), '1.25M');
  assert.equal(formatCompanionTime(45), '<1m');
  assert.equal(formatCompanionTime(1500), '25m');
  assert.equal(formatCompanionTime(4800), '1h 20m');
});

test('statsTracker rolls over cleanly across local calendar days while preserving lifetime totals', () => {
  let now = new Date(2026, 10, 22, 23, 55, 0);
  const tracker = createStatsTracker(null, () => now);
  tracker.addCompanionSeconds(120);
  tracker.recordToolCall('coding');
  tracker.recordTurnEnd(true);
  tracker.recordApproval('allowed-once', true);
  tracker.recordUsage({ inputTokens: 800, outputTokens: 200 });

  const day1 = tracker.snapshot();
  assert.equal(day1.today.date, localDateKey(now));
  assert.equal(day1.today.companionSec, 120);
  assert.equal(day1.today.turnsCompleted, 1);
  assert.equal(day1.today.toolCalls, 1);
  assert.equal(day1.today.approvalsQuickAllowed, 1);
  assert.equal(day1.today.tokens.total, 1000);
  assert.equal(day1.lifetimeTurns, 1);

  // Advance across midnight.
  now = new Date(2026, 10, 23, 0, 5, 0);
  const day2 = tracker.snapshot();
  assert.equal(day2.today.date, localDateKey(now));
  assert.equal(day2.today.turnsCompleted, 0);
  assert.equal(day2.today.tokens.total, 0);
  assert.equal(day2.lifetimeTurns, 1);
  assert.equal(day2.lifetimeCompanionSec, 120);
});

test('careMonitor triggers focus break with cooldown and once-per-night late-night care', () => {
  let now = new Date(2026, 10, 22, 14, 0, 0);
  const care = createCareMonitor({ intervalMs: 50 * 60_000, nowFn: () => now });
  assert.equal(care.checkIdle({ enabled: true, locale: 'zh' }), null);

  now = new Date(2026, 10, 22, 14, 51, 0);
  const brk = care.checkIdle({ enabled: true, locale: 'zh' });
  assert.equal(brk?.kind, 'focus-break');
  assert.match(brk.text, /50/);
  // Cooldown prevents repeating immediately.
  assert.equal(care.checkIdle({ enabled: true, locale: 'zh' }), null);

  // Late night triggers once per night.
  now = new Date(2026, 10, 22, 23, 40, 0);
  const night = care.checkIdle({ enabled: true, locale: 'zh' });
  assert.equal(night?.kind, 'late-night');
  assert.equal(care.checkIdle({ enabled: true, locale: 'zh' }), null);
  assert.equal(care.checkIdle({ enabled: false, locale: 'zh' }), null);
});

test('migrates v0.3.0 stats smoothly, earns and consumes dried fish, and unlocks streak/feed milestones', () => {
  const legacyV03 = {
    today: {
      date: '2026-11-27',
      companionSec: 2400,
      turnsCompleted: 4,
      turnsFailed: 0,
      toolCalls: 9,
      toolsByKind: { coding: 6, command: 3, searching: 0, subagent: 0, working: 0 },
      approvalsHandled: 9,
      approvalsQuickAllowed: 5,
      approvalsQuickRejected: 1,
      tokens: { input: 3000, output: 1000, cached: 500, total: 4000 },
    },
    lifetimeTurns: 4,
    lifetimeCompanionSec: 2400,
  };
  let now = new Date(2026, 10, 28, 10, 0, 0);
  const tracker = createStatsTracker(legacyV03, () => now);
  const migrated = tracker.snapshot();
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.history.length, 1);
  assert.equal(migrated.history[0].date, '2026-11-27');
  assert.equal(migrated.streak.currentDays, 2);

  // Empty fish jar returns consumed=false cleanly.
  assert.equal(tracker.feedFish().consumed, false);

  // Earning fish: 5 tool calls (+1), 1 turn (+1), 1 approval (+1) -> 3 fish.
  for (let i = 0; i < 5; i++) tracker.recordToolCall('coding');
  tracker.recordTurnEnd(true);
  tracker.recordApproval('allowed-once', true);
  assert.equal(tracker.snapshot().fish.stock, 3);

  const fed = tracker.feedFish();
  assert.equal(fed.consumed, true);
  assert.equal(fed.stock, 2);

  // Cross another day to unlock 3-day streak milestone.
  now = new Date(2026, 10, 29, 10, 0, 0);
  const day3 = tracker.snapshot();
  assert.equal(day3.streak.currentDays, 3);
  assert.ok(day3.milestones.unlocked.includes('streak_3'));
});
