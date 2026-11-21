import { animations } from './animations.js';

const VALID_ANIMATIONS = new Set(animations.map(([name]) => name));

function parseBool(token) {
  if (!token) return undefined;
  const normalized = token.toLowerCase();
  if (['on', 'true', '1', 'yes', 'enable', 'enabled'].includes(normalized)) return true;
  if (['off', 'false', '0', 'no', 'disable', 'disabled'].includes(normalized)) return false;
  return undefined;
}

const HELP_TEXT = [
  'KuroWhale commands (/kurowhale <action>):',
  '  status              Show pet state, scale and preferences',
  '  show | hide | close Show, hide to tray, or close the pet',
  '  center | focus      Recenter the pet or focus the DSH window',
  '  scale <0.5..2|+|- > Resize smoothly without restarting',
  '  topmost [on|off]    Toggle always-on-top',
  '  bubbles [on|off]    Toggle speech bubbles',
  '  patrol [on|off]     Toggle idle desktop patrol',
  '  quiet [on|off]      Toggle hide-when-idle focus mode',
  '  sound [on|off]      Toggle gentle approval chime',
  '  demo <state> | all  Preview an animation or cycle all 9 states',
  '  resume              Return to automatic agent tracking',
].join('\n');

export function parseSlashInput(rawInput = '') {
  const parts = String(rawInput ?? '').trim().split(/\s+/).filter(Boolean);
  const head = (parts[0] ?? 'status').toLowerCase();
  const arg = parts[1];

  switch (head) {
    case 'help':
    case '?':
      return { kind: 'help' };
    case 'status':
      return { kind: 'status' };
    case 'show':
    case 'hide':
    case 'center':
    case 'resume':
    case 'close':
    case 'all':
    case 'focus':
      return { kind: 'command', command: { action: head } };
    case 'scale': {
      if (!arg) return { kind: 'error', text: 'Usage: /kurowhale scale <0.5..2 | + | ->' };
      if (arg === '+' || arg === 'up' || arg === 'larger') {
        return { kind: 'command', command: { action: 'scale', value: 0.25, relative: true } };
      }
      if (arg === '-' || arg === 'down' || arg === 'smaller') {
        return { kind: 'command', command: { action: 'scale', value: -0.25, relative: true } };
      }
      const value = Number(arg);
      if (!Number.isFinite(value) || value < 0.5 || value > 2) {
        return { kind: 'error', text: 'Scale must be a number between 0.5 and 2 (or + / -).' };
      }
      return { kind: 'command', command: { action: 'scale', value, relative: false } };
    }
    case 'topmost': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale topmost [on|off]' };
      return { kind: 'command', command: { action: 'topmost', value, toggle: value === undefined } };
    }
    case 'bubbles':
    case 'bubble': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale bubbles [on|off]' };
      return { kind: 'command', command: { action: 'pref', key: 'bubbles', value, toggle: value === undefined } };
    }
    case 'patrol': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale patrol [on|off]' };
      return { kind: 'command', command: { action: 'pref', key: 'patrol', value, toggle: value === undefined } };
    }
    case 'quiet':
    case 'hidewhenidle': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale quiet [on|off]' };
      return { kind: 'command', command: { action: 'pref', key: 'hideWhenIdle', value, toggle: value === undefined } };
    }
    case 'sound':
    case 'chime': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale sound [on|off]' };
      return { kind: 'command', command: { action: 'pref', key: 'sound', value, toggle: value === undefined } };
    }
    case 'demo':
    case 'state': {
      if (!arg) return { kind: 'error', text: `Usage: /kurowhale demo <${[...VALID_ANIMATIONS].join('|')}>` };
      if (!VALID_ANIMATIONS.has(arg)) {
        return { kind: 'error', text: `Unknown animation "${arg}". Valid: ${[...VALID_ANIMATIONS].join(', ')}` };
      }
      return { kind: 'command', command: { action: 'state', value: arg } };
    }
    default:
      return { kind: 'error', text: `Unknown subcommand "${head}". Run "/kurowhale help" for usage.` };
  }
}

export function registerKuroWhaleCommand(ctx, controller) {
  if (!ctx?.commands || typeof ctx.commands.register !== 'function') return () => {};
  let disposed = false;
  let unregister;
  try {
    unregister = ctx.commands.register({
      name: 'kurowhale',
      description: 'Control the KuroWhale desktop pet (show, hide, scale, bubbles, patrol, quiet, status).',
      input: { type: 'string' },
      handler: async invocation => {
        if (disposed) return { kind: 'error', text: 'KuroWhale plugin is stopped.' };
        const parsed = parseSlashInput(invocation?.rawInput ?? '');
        if (parsed.kind === 'help') return { kind: 'success', text: HELP_TEXT };
        if (parsed.kind === 'error') return { kind: 'error', text: parsed.text };
        if (parsed.kind === 'status') {
          const s = controller.getSummary();
          const prefs = s.preferences ?? {};
          return {
            kind: 'success',
            text: `KuroWhale v${s.version}: state=${s.state} (${s.source}), visible=${s.visible}, scale=${s.scale}x, topmost=${s.topmost}, bubbles=${prefs.bubbles !== false}, patrol=${prefs.patrol !== false}, quiet=${Boolean(prefs.hideWhenIdle)}, sound=${Boolean(prefs.sound)}, sessions=${s.sessions.length}`,
          };
        }
        try {
          await controller.runCommand(parsed.command);
          const s = controller.getSummary();
          return {
            kind: 'success',
            text: `KuroWhale: "${parsed.command.action}" applied (state=${s.state}, visible=${s.visible}, scale=${s.scale}x).`,
          };
        } catch (error) {
          return { kind: 'error', text: `KuroWhale command failed: ${String(error?.message || error)}` };
        }
      },
    });
  } catch {
    return () => {};
  }
  return () => {
    disposed = true;
    if (typeof unregister === 'function') {
      try { unregister(); } catch {}
    }
  };
}
