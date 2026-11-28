import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAnchor,
  isPositionVisible,
  normalizeDisplays,
  resolveSafePosition,
} from '../display.js';

const mixedDisplays = normalizeDisplays([
  { id: 'PRIMARY', primary: true, dpiScale: 1.5, bounds: { x: 0, y: 0, w: 2560, h: 1440 }, workArea: { x: 0, y: 0, w: 2560, h: 1380 } },
  { id: 'EXT-LEFT', primary: false, dpiScale: 1, bounds: { x: -1920, y: 0, w: 1920, h: 1080 }, workArea: { x: -1920, y: 0, w: 1920, h: 1040 } },
]);
const layout = { width: 264, height: 363 };

test('normalizeDisplays and computeAnchor track negative-coordinate secondary displays', () => {
  assert.equal(mixedDisplays.length, 2);
  assert.equal(mixedDisplays[0].primary, true);
  assert.equal(mixedDisplays[1].dpiScale, 1);

  const posOnLeft = { x: -960, y: 400 };
  assert.equal(isPositionVisible(posOnLeft, layout, mixedDisplays), true);
  const anchor = computeAnchor(posOnLeft, layout, mixedDisplays);
  assert.equal(anchor.displayId, 'EXT-LEFT');
  assert.equal(anchor.primary, false);
  assert.ok(anchor.relX > 0.4 && anchor.relX < 0.7);
});

test('resolveSafePosition migrates legacy pixel positions and self-heals unplugged displays', () => {
  // Legacy v0.3.0 config without anchor stays in place if visible and gains anchor.
  const migrated = resolveSafePosition({ saved: { x: -1200, y: 200 }, layout, displays: mixedDisplays });
  assert.equal(migrated.x, -1200);
  assert.equal(migrated.y, 200);
  assert.equal(migrated.healed, false);
  assert.equal(migrated.anchor.displayId, 'EXT-LEFT');

  // Unplugging EXT-LEFT heals back into primary display safe workArea preserving relative anchor.
  const primaryOnly = [mixedDisplays[0]];
  const healed = resolveSafePosition({
    saved: { x: -1200, y: 200, anchor: migrated.anchor },
    layout,
    displays: primaryOnly,
  });
  assert.equal(healed.healed, true);
  assert.equal(healed.reason, 'display-unplugged');
  assert.equal(healed.anchor.displayId, 'PRIMARY');
  assert.ok(isPositionVisible(healed, layout, primaryOnly));

  // Completely out-of-bounds legacy coordinate heals back to primary workArea.
  const oob = resolveSafePosition({ saved: { x: 9999, y: 9999 }, layout, displays: primaryOnly });
  assert.equal(oob.healed, true);
  assert.equal(oob.reason, 'out-of-bounds');
  assert.ok(isPositionVisible(oob, layout, primaryOnly));
});
