import test from 'node:test';
import assert from 'node:assert/strict';
import {animations,activityState,resolveActivities} from '../animations.js';

test('waiting approval wins over other session activity',()=>{
  assert.equal(resolveActivities(['running','waiting','review']),'waiting');
  assert.equal(resolveActivities(['idle','running']),'running');
  assert.equal(resolveActivities(new Map([['a','running']]).values()),'running');
  assert.equal(resolveActivities(new Map([['a','review'],['b','waiting']]).values()),'waiting');
});
test('rc3 session events distinguish real approval, work and completion',()=>{
  assert.equal(activityState('approval/asked'),'waiting');
  assert.equal(activityState('approval/decided'),'running');
  assert.equal(activityState('tool/call'),'running');
  assert.equal(activityState('turn/end',{reason:{kind:'completed'}}),'review');
  assert.equal(activityState('turn/end',{reason:{kind:'error'}}),'failed');
  assert.equal(activityState('turn/end',{reason:{kind:'blocked'}}),'waiting');
  assert.equal(activityState('turn/end',{reason:{kind:'aborted'}}),'failed');
  assert.equal(activityState('unrelated'),undefined);
});
test('nine atlas rows use exactly 57 original occupied cells',()=>{
  assert.deepEqual(animations.map(([,t])=>t.length),[6,8,8,4,5,8,6,6,6]);
});
