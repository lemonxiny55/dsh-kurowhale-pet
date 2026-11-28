import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSlashInput, registerKuroWhaleCommand } from '../commands.js';

test('parseSlashInput handles control, preference and diagnostic subcommands', () => {
  assert.deepEqual(parseSlashInput(''), { kind: 'status' });
  assert.deepEqual(parseSlashInput('help'), { kind: 'help' });
  assert.deepEqual(parseSlashInput('show'), { kind: 'command', command: { action: 'show' } });
  assert.deepEqual(parseSlashInput('focus'), { kind: 'command', command: { action: 'focus' } });
  assert.deepEqual(parseSlashInput('scale +'), { kind: 'command', command: { action: 'scale', value: 0.25, relative: true } });
  assert.deepEqual(parseSlashInput('scale 1.5'), { kind: 'command', command: { action: 'scale', value: 1.5, relative: false } });
  assert.equal(parseSlashInput('scale 5').kind, 'error');
  assert.deepEqual(parseSlashInput('bubbles off'), { kind: 'command', command: { action: 'pref', key: 'bubbles', value: false, toggle: false } });
  assert.deepEqual(parseSlashInput('patrol'), { kind: 'command', command: { action: 'pref', key: 'patrol', value: undefined, toggle: true } });
  assert.deepEqual(parseSlashInput('quiet on'), { kind: 'command', command: { action: 'pref', key: 'hideWhenIdle', value: true, toggle: false } });
  assert.deepEqual(parseSlashInput('clickthrough on'), { kind: 'command', command: { action: 'pref', key: 'clickThrough', value: true, toggle: false } });
  assert.deepEqual(parseSlashInput('diag'), { kind: 'command', command: { action: 'diagnostics' } });
  assert.deepEqual(parseSlashInput('sound on'), { kind: 'command', command: { action: 'pref', key: 'sound', value: true, toggle: false } });
  assert.deepEqual(parseSlashInput('mute on'), { kind: 'command', command: { action: 'pref', key: 'sound', value: false, toggle: false } });
  assert.deepEqual(parseSlashInput('dnd 23:00-08:00'), { kind: 'command', command: { action: 'dnd-range', start: '23:00', end: '08:00' } });
  assert.deepEqual(parseSlashInput('toast off'), { kind: 'command', command: { action: 'pref', key: 'toast', value: false, toggle: false } });
  assert.deepEqual(parseSlashInput('care off'), { kind: 'command', command: { action: 'pref', key: 'careReminders', value: false, toggle: false } });
  assert.deepEqual(parseSlashInput('stats'), { kind: 'stats' });
  assert.deepEqual(parseSlashInput('stats export week'), { kind: 'command', command: { action: 'export-report', period: 'week', mode: 'save' } });
  assert.deepEqual(parseSlashInput('report'), { kind: 'command', command: { action: 'export-report', period: 'today', mode: 'save' } });
  assert.deepEqual(parseSlashInput('panel'), { kind: 'command', command: { action: 'panel' } });
  assert.deepEqual(parseSlashInput('approve req-1'), { kind: 'command', command: { action: 'approval-decide', approvalId: 'req-1', outcome: 'allowed-once' } });
  assert.deepEqual(parseSlashInput('reject'), { kind: 'command', command: { action: 'approval-decide', approvalId: undefined, outcome: 'rejected' } });
  assert.deepEqual(parseSlashInput('stop session-1'), { kind: 'command', command: { action: 'cancel-session', alias: 'session-1' } });
  assert.deepEqual(parseSlashInput('pet'), { kind: 'command', command: { action: 'interact', kind: 'pet' } });
  assert.deepEqual(parseSlashInput('feed'), { kind: 'command', command: { action: 'interact', kind: 'feed' } });
  assert.deepEqual(parseSlashInput('doze'), { kind: 'command', command: { action: 'interact', kind: 'doze' } });
  assert.deepEqual(parseSlashInput('cheer'), { kind: 'command', command: { action: 'interact', kind: 'cheer' } });
  assert.deepEqual(parseSlashInput('demo petted'), { kind: 'command', command: { action: 'state', value: 'petted' } });
  assert.deepEqual(parseSlashInput('demo waving'), { kind: 'command', command: { action: 'state', value: 'waving' } });
  assert.equal(parseSlashInput('demo nonexistent').kind, 'error');
  assert.equal(parseSlashInput('unknowncmd').kind, 'error');
});

test('registerKuroWhaleCommand degrades cleanly when ctx.commands is absent', () => {
  const dispose = registerKuroWhaleCommand({}, { getSummary: () => ({}), runCommand: async () => {} });
  assert.equal(typeof dispose, 'function');
  dispose();
});

test('registerKuroWhaleCommand executes status and commands via controller', async () => {
  let registered;
  const ran = [];
  const dispose = registerKuroWhaleCommand(
    { commands: { register: def => { registered = def; return () => { registered = null; }; } } },
    {
      getSummary: () => ({
        version: '0.3.0', state: 'idle', source: 'agent', visible: true, scale: 1.25, topmost: true,
        preferences: { bubbles: true, patrol: true, hideWhenIdle: false, sound: false, careReminders: true },
        sessions: [],
        pendingApprovals: [],
        stats: { today: { date: '2026-11-22', companionSec: 1800, turnsCompleted: 5, toolCalls: 14, approvalsHandled: 2, tokens: { total: 12400, cached: 3200 } } },
      }),
      runCommand: async cmd => { ran.push(cmd); },
    },
  );
  assert.equal(registered.name, 'kurowhale');
  const statusRes = await registered.handler({ rawInput: 'status' });
  assert.equal(statusRes.kind, 'success');
  assert.match(statusRes.text, /KuroWhale v0\.3\.0/);
  const statsRes = await registered.handler({ rawInput: 'stats' });
  assert.equal(statsRes.kind, 'success');
  assert.match(statsRes.text, /30m.*完成 5 轮.*12k/);
  const prefRes = await registered.handler({ rawInput: 'bubbles off' });
  assert.equal(prefRes.kind, 'success');
  assert.deepEqual(ran, [{ action: 'pref', key: 'bubbles', value: false, toggle: false }]);
  dispose();
  assert.equal(registered, null);
});

test('registerKuroWhaleCommand uses ctx.inject without reading uninjected ctx.commands', async () => {
  const controller = {
    getSummary: () => ({
      version: '0.3.0', state: 'idle', source: 'agent', visible: true, scale: 1.25, topmost: true,
      preferences: { bubbles: true, patrol: true, hideWhenIdle: false, sound: false, careReminders: true },
      sessions: [],
      pendingApprovals: [],
    }),
    runCommand: async () => {},
  };

  // Case A: DSH context has inject(), throws on direct ctx.commands read, and service never mounts.
  let forkDisposed = 0;
  const unfulfilledCtx = {
    inject(deps, _cb) {
      assert.deepEqual(deps, ['commands']);
      return { dispose: () => { forkDisposed++; } };
    },
    get() { return undefined; },
    get commands() { throw new Error('cannot get property "commands" without inject'); },
  };
  const disposeA = registerKuroWhaleCommand(unfulfilledCtx, controller);
  disposeA();
  assert.equal(forkDisposed, 1);

  // Case B: inject() mounts when commands service arrives and registers via cmdCtx.get/effect.
  let registered = null;
  let effectCleanup = null;
  const fulfilledCtx = {
    inject(deps, cb) {
      assert.deepEqual(deps, ['commands']);
      const cmdSvc = { register: def => { registered = def; return () => { registered = null; }; } };
      cb({
        get: name => (name === 'commands' ? cmdSvc : undefined),
        effect: fn => { effectCleanup = fn(); },
      });
      return { dispose: () => { effectCleanup?.(); } };
    },
    get() { return undefined; },
    get commands() { throw new Error('cannot get property "commands" without inject'); },
  };
  const disposeB = registerKuroWhaleCommand(fulfilledCtx, controller);
  assert.equal(registered?.name, 'kurowhale');
  const res = await registered.handler({ rawInput: 'status' });
  assert.equal(res.kind, 'success');
  assert.match(res.text, /KuroWhale v0\.3\.0/);
  disposeB();
  assert.equal(registered, null);
});
