import test from 'node:test';
import assert from 'node:assert/strict';
import { isWithinDnd, parseDndRange, shouldTriggerAlert } from '../notify.js';

test('parseDndRange validates HH:MM-HH:MM windows and rejects malformed inputs', () => {
  assert.deepEqual(parseDndRange('23:00-08:00'), { start: '23:00', end: '08:00' });
  assert.deepEqual(parseDndRange('9:05~12:30'), { start: '09:05', end: '12:30' });
  assert.equal(parseDndRange('25:00-08:00'), null);
  assert.equal(parseDndRange('invalid'), null);
});

test('isWithinDnd and shouldTriggerAlert handle overnight and same-day DND windows', () => {
  const lateNight = new Date(2026, 10, 28, 23, 30, 0);
  const earlyMorning = new Date(2026, 10, 29, 7, 15, 0);
  const afternoon = new Date(2026, 10, 29, 14, 0, 0);

  assert.equal(isWithinDnd(lateNight, { enabled: true, start: '23:00', end: '08:00' }), true);
  assert.equal(isWithinDnd(earlyMorning, { enabled: true, start: '23:00', end: '08:00' }), true);
  assert.equal(isWithinDnd(afternoon, { enabled: true, start: '23:00', end: '08:00' }), false);

  assert.equal(shouldTriggerAlert({ enabled: true, dndEnabled: true, dndStart: '23:00', dndEnd: '08:00', now: lateNight }), false);
  assert.equal(shouldTriggerAlert({ enabled: true, dndEnabled: true, dndStart: '23:00', dndEnd: '08:00', now: afternoon }), true);
  assert.equal(shouldTriggerAlert({ enabled: false, dndEnabled: false, now: afternoon }), false);
  assert.equal(isWithinDnd(afternoon, { enabled: true, start: '13:30', end: '15:00' }), true);
});
