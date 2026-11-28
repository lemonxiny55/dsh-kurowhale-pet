// Purpose-built local control. Does not connect to DSH authentication or models.
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const directory = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'kurowhale-pet');
const [action = 'status', value, extra] = process.argv.slice(2);
if (action === 'status') { console.log(await readFile(join(directory, 'status.json'), 'utf8')); process.exit(0); }
if (action === 'stats') { console.log(await readFile(join(directory, 'stats.json'), 'utf8')); process.exit(0); }

const valid = [
  'state', 'all', 'resume', 'show', 'hide', 'scale', 'topmost', 'center', 'focus', 'close',
  'bubbles', 'patrol', 'quiet', 'clickthrough', 'sound', 'dnd', 'toast', 'care', 'panel', 'approve', 'reject', 'stop', 'bubble', 'diag', 'report', 'skin',
];
if (!valid.includes(action)) {
  throw Error('Usage: status | stats | panel | approve [id] | reject [id] | stop [alias] | state <name> | all | resume | show | hide | scale <0.5..2> | topmost <true|false> | center | focus | bubbles <true|false> | patrol <true|false> | quiet <true|false> | clickthrough <true|false> | sound <true|false> | dnd <true|false> | toast <true|false> | care <true|false> | diag | report [today|week] | skin [dir|reset] | bubble <text> | close');
}

const id = randomUUID();
let c;
if (['bubbles', 'patrol', 'quiet', 'clickthrough', 'sound', 'dnd', 'toast', 'care'].includes(action)) {
  const key = action === 'quiet' ? 'hideWhenIdle' : action === 'care' ? 'careReminders' : action === 'clickthrough' ? 'clickThrough' : action === 'dnd' ? 'dndEnabled' : action;
  c = { id, action: 'pref', key, value: value === undefined ? undefined : value !== 'false', toggle: value === undefined };
} else if (action === 'diag') {
  c = { id, action: 'diagnostics' };
} else if (action === 'report') {
  c = { id, action: 'export-report', period: value === 'week' ? 'week' : 'today', mode: 'save' };
} else if (action === 'skin') {
  c = { id, action: 'skin', path: (!value || value === 'reset' || value === 'default') ? null : value };
} else if (action === 'approve' || action === 'reject') {
  c = { id, action: 'approval-decide', approvalId: value, outcome: action === 'approve' ? 'allowed-once' : 'rejected' };
} else if (action === 'stop') {
  c = { id, action: 'cancel-session', alias: value };
} else if (action === 'panel') {
  c = { id, action: 'panel', value: value === undefined ? undefined : value !== 'false' };
} else if (action === 'bubble') {
  c = { id, action: 'bubble', value: value ?? '', tone: extra ?? 'chat' };
} else {
  c = { id, action, value: action === 'scale' ? Number(value) : action === 'topmost' ? value !== 'false' : value };
}

await mkdir(directory, { recursive: true });
const path = join(directory, 'control.json');
await writeFile(path + '.new', JSON.stringify(c));
await rename(path + '.new', path);
const deadline = Date.now() + 20000;
while (Date.now() < deadline) {
  try {
    const s = JSON.parse(await readFile(join(directory, 'status.json'), 'utf8'));
    if (s.lastCommand?.id === id) {
      console.log(JSON.stringify({
        command: s.lastCommand, state: s.state, source: s.source,
        rendererReady: s.rendererReady, visible: s.visible, scale: s.scale, preferences: s.preferences,
      }, null, 2));
      process.exit(s.lastCommand.ok ? 0 : 1);
    }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 100));
}
throw Error('No live plugin acknowledgement; no result assumed');
