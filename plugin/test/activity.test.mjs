import test from 'node:test';
import assert from 'node:assert/strict';
import {
  animations, activityState, activityDetail, classifyTool,
  resolveActivities, formatDuration, bubbleForState, pickClickLine, pickInteractionLine,
} from '../animations.js';

test('waiting approval wins over other session activity', () => {
  assert.equal(resolveActivities(['running', 'waiting', 'review']), 'waiting');
  assert.equal(resolveActivities(['idle', 'running']), 'running');
  assert.equal(resolveActivities(new Map([['a', 'running']]).values()), 'running');
  assert.equal(resolveActivities(new Map([['a', 'review'], ['b', 'waiting']]).values()), 'waiting');
});

test('session events distinguish approval, work, subagent and completion', () => {
  assert.equal(activityState('approval/asked'), 'waiting');
  assert.equal(activityState('approval/decided'), 'running');
  assert.equal(activityState('tool/call'), 'running');
  assert.equal(activityState('subagent/start'), 'running');
  assert.equal(activityState('turn/end', { reason: { kind: 'completed' } }), 'review');
  assert.equal(activityState('turn/end', { reason: { kind: 'error' } }), 'failed');
  assert.equal(activityState('turn/end', { reason: { kind: 'blocked' } }), 'waiting');
  assert.equal(activityState('turn/end', { reason: { kind: 'aborted' } }), 'failed');
  assert.equal(activityState('unrelated'), undefined);
});

test('tool classification and speech bubbles map semantic details cleanly', () => {
  assert.equal(classifyTool('edit_file'), 'coding');
  assert.equal(classifyTool('run_command'), 'command');
  assert.equal(classifyTool('grep_search'), 'searching');
  assert.equal(classifyTool('invoke_subagent'), 'subagent');
  assert.equal(classifyTool('custom_tool'), 'working');
  assert.equal(activityDetail('tool/call', { name: 'bash' }), 'command');
  assert.equal(activityDetail('assistant/chunk', { chunk: { type: 'reasoning-delta' } }), 'thinking');
  assert.equal(formatDuration(3200), '3.2s');
  assert.equal(formatDuration(72000), '1m 12s');

  const waitBubble = bubbleForState({ state: 'waiting', waitingCount: 2, locale: 'zh' });
  assert.equal(waitBubble.sticky, true);
  assert.equal(waitBubble.clickable, true);
  assert.match(waitBubble.text, /2/);

  const runBubble = bubbleForState({ state: 'running', detail: 'coding', activeCount: 3, locale: 'en' });
  assert.equal(runBubble.tone, 'running');
  assert.match(runBubble.text, /Editing code.*3/);

  const reviewBubble = bubbleForState({ state: 'review', durationMs: 4500, locale: 'zh' });
  assert.match(reviewBubble.text, /4\.5s/);
  assert.ok(pickClickLine('zh', 0).length > 0);
  assert.ok(pickClickLine('en', 2).length > 0);
  assert.ok(pickInteractionLine('head-pat', 'zh', 0).length > 0);
  assert.ok(pickInteractionLine('body-poke', 'en', 1).length > 0);
  assert.ok(pickInteractionLine('feed', 'zh', 0).length > 0);
  assert.ok(pickInteractionLine('dizzy', 'en', 0).length > 0);
});

test('twelve atlas rows use exactly 75 original occupied cells', () => {
  assert.deepEqual(animations.map(([, t]) => t.length), [6, 8, 8, 4, 5, 8, 6, 6, 6, 6, 6, 6]);
});
