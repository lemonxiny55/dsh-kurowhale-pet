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
  assert.deepEqual(parseSlashInput('sound on'), { kind: 'command', command: { action: 'pref', key: 'sound', value: true, toggle: false } });
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
        version: '0.2.0', state: 'idle', source: 'agent', visible: true, scale: 1.25, topmost: true,
        preferences: { bubbles: true, patrol: true, hideWhenIdle: false, sound: false }, sessions: [],
      }),
      runCommand: async cmd => { ran.push(cmd); },
    },
  );
  assert.equal(registered.name, 'kurowhale');
  const statusRes = await registered.handler({ rawInput: 'status' });
  assert.equal(statusRes.kind, 'success');
  assert.match(statusRes.text, /KuroWhale v0\.2\.0/);
  const prefRes = await registered.handler({ rawInput: 'bubbles off' });
  assert.equal(prefRes.kind, 'success');
  assert.deepEqual(ran, [{ action: 'pref', key: 'bubbles', value: false, toggle: false }]);
  dispose();
  assert.equal(registered, null);
});
