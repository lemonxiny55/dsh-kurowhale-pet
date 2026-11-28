import { animations } from './animations.js';
import { parseDndRange } from './notify.js';
import { formatCompanionTime, formatTokens } from './stats.js';

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
  '  stats [export [today|week]]  Show companion stats or export PNG report card',
  '  report [today|week] Generate today or weekly Vibe Coding report card',
  '  panel               Toggle the multi-session approval & stats card',
  '  approve [id]        Allow a pending approval once',
  '  reject [id]         Reject a pending approval',
  '  stop [alias]        Cancel a running session turn',
  '  show | hide | close Show, hide to tray, or close the pet',
  '  center | focus      Recenter the pet or focus the DSH window',
  '  scale <0.5..2|+|- > Resize smoothly without restarting',
  '  topmost [on|off]    Toggle always-on-top',
  '  bubbles [on|off]    Toggle speech bubbles',
  '  patrol [on|off]     Toggle idle desktop patrol',
  '  quiet [on|off]      Toggle hide-when-idle focus mode',
  '  clickthrough [on|off] Toggle smart click-through focus mode',
  '  sound [on|off]      Toggle gentle approval chime',
  '  mute [on|off]       Mute or unmute alert sounds',
  '  dnd [on|off|HH:MM-HH:MM]  Configure quiet-hours DND window',
  '  toast [on|off]      Toggle Windows Toast when DSH is unfocused',
  '  care [on|off]       Toggle gentle focus-break & late-night reminders',
  '  diag                Copy redacted diagnostics to clipboard',
  '  pet | feed | doze | cheer  Trigger playful interactive reactions',
  '  demo <state> | all  Preview an animation or cycle all 12 states',
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
    case 'stats':
    case 'today':
      if (arg === 'export') {
        const period = parts[2]?.toLowerCase() === 'week' ? 'week' : 'today';
        return { kind: 'command', command: { action: 'export-report', period, mode: 'save' } };
      }
      return { kind: 'stats' };
    case 'report': {
      const period = arg?.toLowerCase() === 'week' ? 'week' : 'today';
      return { kind: 'command', command: { action: 'export-report', period, mode: 'save' } };
    }
    case 'panel':
    case 'card':
      return { kind: 'command', command: { action: 'panel' } };
    case 'approve':
    case 'allow':
      return { kind: 'command', command: { action: 'approval-decide', approvalId: arg, outcome: 'allowed-once' } };
    case 'reject':
    case 'deny':
      return { kind: 'command', command: { action: 'approval-decide', approvalId: arg, outcome: 'rejected' } };
    case 'stop':
    case 'cancel':
      return { kind: 'command', command: { action: 'cancel-session', alias: arg } };
    case 'show':
    case 'hide':
    case 'center':
    case 'resume':
    case 'close':
    case 'all':
    case 'focus':
      return { kind: 'command', command: { action: head } };
    case 'pet':
    case 'pat':
      return { kind: 'command', command: { action: 'interact', kind: 'pet' } };
    case 'feed':
    case 'snack':
    case 'fish':
      return { kind: 'command', command: { action: 'interact', kind: 'feed' } };
    case 'doze':
    case 'nap':
    case 'sleep':
      return { kind: 'command', command: { action: 'interact', kind: 'doze' } };
    case 'cheer':
      return { kind: 'command', command: { action: 'interact', kind: 'cheer' } };
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
    case 'clickthrough':
    case 'passthrough':
    case 'ghost':
    case 'through': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale clickthrough [on|off]' };
      return { kind: 'command', command: { action: 'pref', key: 'clickThrough', value, toggle: value === undefined } };
    }
    case 'diag':
    case 'diagnostics':
    case 'debug':
      return { kind: 'command', command: { action: 'diagnostics' } };
    case 'sound':
    case 'chime': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale sound [on|off]' };
      return { kind: 'command', command: { action: 'pref', key: 'sound', value, toggle: value === undefined } };
    }
    case 'mute': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale mute [on|off]' };
      return {
        kind: 'command',
        command: { action: 'pref', key: 'sound', value: value === undefined ? undefined : !value, toggle: value === undefined },
      };
    }
    case 'dnd': {
      if (!arg) return { kind: 'command', command: { action: 'pref', key: 'dndEnabled', toggle: true } };
      const value = parseBool(arg);
      if (value !== undefined) return { kind: 'command', command: { action: 'pref', key: 'dndEnabled', value, toggle: false } };
      const range = parseDndRange(arg);
      if (!range) return { kind: 'error', text: 'Usage: /kurowhale dnd [on|off|HH:MM-HH:MM]' };
      return { kind: 'command', command: { action: 'dnd-range', ...range } };
    }
    case 'toast':
    case 'notify': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale toast [on|off]' };
      return { kind: 'command', command: { action: 'pref', key: 'toast', value, toggle: value === undefined } };
    }
    case 'care':
    case 'remind': {
      const value = parseBool(arg);
      if (arg && value === undefined) return { kind: 'error', text: 'Usage: /kurowhale care [on|off]' };
      return { kind: 'command', command: { action: 'pref', key: 'careReminders', value, toggle: value === undefined } };
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
  let disposed = false;
  let unregister;
  let fork;

  const detach = () => {
    const fn = unregister;
    unregister = undefined;
    if (typeof fn === 'function') {
      try { fn(); } catch {}
    }
  };

  const attach = commands => {
    if (disposed || !commands || typeof commands.register !== 'function') return;
    detach();
    try {
      unregister = commands.register({
        name: 'kurowhale',
        description: 'Control KuroWhale desktop pet (status, stats, panel, approve, stop, scale, preferences).',
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
              text: `KuroWhale v${s.version}: state=${s.state} (${s.source}), visible=${s.visible}, scale=${s.scale}x, topmost=${s.topmost}, bubbles=${prefs.bubbles !== false}, patrol=${prefs.patrol !== false}, quiet=${Boolean(prefs.hideWhenIdle)}, clickThrough=${Boolean(prefs.clickThrough)}, sound=${Boolean(prefs.sound)}, dnd=${Boolean(prefs.dndEnabled)}(${prefs.dndStart ?? '23:00'}-${prefs.dndEnd ?? '08:00'}), toast=${prefs.toast !== false}, care=${prefs.careReminders !== false}, sessions=${s.sessions.length}, approvals=${(s.pendingApprovals ?? []).length}`,
            };
          }
          if (parsed.kind === 'stats') {
            const s = controller.getSummary();
            const t = s.stats?.today;
            if (!t) return { kind: 'success', text: 'KuroWhale: no stats recorded yet.' };
            const fishStock = s.stats?.fish?.stock ?? 0;
            const streakDays = s.stats?.streak?.currentDays ?? 1;
            const parts = [
              `KuroWhale 今日统计 (${t.date}):`,
              `陪伴 ${formatCompanionTime(t.companionSec)}`,
              `完成 ${t.turnsCompleted} 轮`,
              `工具 ${t.toolCalls} 次`,
              `审批 ${t.approvalsHandled} 次`,
              `小鱼干库存 ${fishStock} 条`,
              `喂鱼 ${t.feeds ?? 0} 次`,
              `连续 ${streakDays} 天`,
            ];
            if (t.tokens?.total > 0) {
              const cached = t.tokens.cached > 0 ? ` (缓存 ${formatTokens(t.tokens.cached)})` : '';
              parts.push(`Token ${formatTokens(t.tokens.total)}${cached}`);
            }
            parts.push('导出战报: /kurowhale stats export [today|week]');
            return { kind: 'success', text: parts.join(' · ') };
          }
          try {
            const note = await controller.runCommand(parsed.command);
            const s = controller.getSummary();
            return {
              kind: 'success',
              text: typeof note === 'string' && note
                ? note
                : `KuroWhale: "${parsed.command.action}" applied (state=${s.state}, visible=${s.visible}, scale=${s.scale}x).`,
            };
          } catch (error) {
            return { kind: 'error', text: `KuroWhale command failed: ${String(error?.message || error)}` };
          }
        },
      });
    } catch {}
  };

  const readCommands = target => {
    if (!target) return undefined;
    if (typeof target.get === 'function') {
      try { return target.get('commands'); } catch { return undefined; }
    }
    try { return target.commands; } catch { return undefined; }
  };

  if (typeof ctx?.inject === 'function') {
    try {
      fork = ctx.inject(['commands'], cmdCtx => {
        const commands = readCommands(cmdCtx);
        if (typeof cmdCtx?.effect === 'function') {
          cmdCtx.effect(() => {
            attach(commands);
            return detach;
          });
        } else {
          attach(commands);
        }
      });
    } catch {}
  } else {
    attach(readCommands(ctx));
  }

  return () => {
    disposed = true;
    detach();
    try { fork?.dispose?.(); } catch {}
    fork = undefined;
  };
}
