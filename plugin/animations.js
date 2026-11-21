export const animations = [
  ['idle', [280,110,110,140,140,320]],
  ['running-right', [120,120,120,120,120,120,120,220]],
  ['running-left', [120,120,120,120,120,120,120,220]],
  ['waving', [140,140,140,280]],
  ['jumping', [140,140,140,140,280]],
  ['failed', [140,140,140,140,140,140,140,240]],
  ['waiting', [150,150,150,150,150,260]],
  ['running', [120,120,120,120,120,220]],
  ['review', [150,150,150,150,150,280]],
];

const CODING_TOOLS = /edit|write|patch|create_file|replace|apply_diff|format/i;
const COMMAND_TOOLS = /bash|shell|command|terminal|exec|powershell|pwsh|run_/i;
const SEARCH_TOOLS = /search|grep|glob|find|read|list|fetch|web|browse|inspect|view/i;
const SUBAGENT_TOOLS = /subagent|agent|delegate|spawn|swarm|task/i;

export function classifyTool(toolName) {
  if (typeof toolName !== 'string' || !toolName.trim()) return 'working';
  if (SUBAGENT_TOOLS.test(toolName)) return 'subagent';
  if (COMMAND_TOOLS.test(toolName)) return 'command';
  if (CODING_TOOLS.test(toolName)) return 'coding';
  if (SEARCH_TOOLS.test(toolName)) return 'searching';
  return 'working';
}

export function activityState(type, data = {}) {
  if (type === 'approval/asked') return 'waiting';
  if (type === 'approval/decided') return 'running';
  if ([
    'turn/start', 'step/start', 'assistant/chunk', 'tool/call', 'tool/result',
    'command/run', 'subagent/start', 'subagent/progress',
  ].includes(type)) return 'running';
  if (type === 'turn/end') {
    const reason = data.reason?.kind ?? data.reason;
    if (reason === 'blocked') return 'waiting';
    if (reason === 'interrupted' || reason === 'cancelled') return 'failed';
    return reason === 'completed' ? 'review' : 'failed';
  }
  return undefined;
}

export function activityDetail(type, data = {}) {
  if (type === 'approval/asked') return 'approval';
  if (type === 'approval/decided') return 'working';
  if (type === 'command/run') return 'command';
  if (type === 'subagent/start' || type === 'subagent/progress') return 'subagent';
  if (type === 'tool/call') return classifyTool(data.name ?? data.toolName ?? data.tool?.name);
  if (type === 'assistant/chunk') {
    const kind = data.chunk?.type ?? data.kind;
    if (kind === 'reasoning-delta' || kind === 'thinking') return 'thinking';
    if (kind === 'tool-call-delta') return 'working';
    return 'thinking';
  }
  if (type === 'step/start' || type === 'turn/start') return 'thinking';
  if (type === 'turn/end') {
    const reason = data.reason?.kind ?? data.reason;
    if (reason === 'blocked') return 'approval';
    if (reason === 'completed') return 'completed';
    if (reason === 'interrupted' || reason === 'cancelled') return 'interrupted';
    return 'error';
  }
  return undefined;
}

export function resolveActivities(states) {
  const values = [...states]; // Map.values() is a one-shot iterator.
  const priority = ['waiting', 'failed', 'running', 'review', 'idle'];
  return priority.find(state => values.includes(state)) ?? 'idle';
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 500) return '';
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

const CLICK_LINES = {
  zh: [
    '在这里哦',
    '随时待命',
    '记得歇一会',
    '一切正常',
    '双击唤起 DSH',
  ],
  en: [
    'Right here',
    'Standing by',
    'Take a quick break',
    'All good',
    'Double-click for DSH',
  ],
};

export function pickClickLine(locale = 'zh', index = 0) {
  const list = CLICK_LINES[locale === 'en' ? 'en' : 'zh'];
  return list[Math.abs(index) % list.length];
}

export function bubbleForState({
  state,
  detail,
  activeCount = 0,
  waitingCount = 0,
  durationMs,
  locale = 'zh',
} = {}) {
  const en = locale === 'en';
  const dur = formatDuration(durationMs);

  if (state === 'waiting') {
    const text = waitingCount > 1
      ? (en ? `${waitingCount} approvals pending` : `${waitingCount} 项待审批`)
      : (en ? 'Approval needed' : '等待审批');
    return { text, tone: 'waiting', ttlMs: 0, sticky: true, clickable: true };
  }

  if (state === 'running') {
    const suffix = activeCount > 1 ? (en ? ` · ${activeCount}` : ` · ${activeCount}`) : '';
    const map = en
      ? {
        thinking: 'Thinking',
        coding: 'Editing code',
        command: 'Running command',
        searching: 'Searching',
        subagent: 'Sub-agents active',
        working: 'Working',
      }
      : {
        thinking: '思考中',
        coding: '编辑代码',
        command: '执行命令',
        searching: '检索中',
        subagent: '协作中',
        working: '处理中',
      };
    const base = map[detail] ?? map.working;
    return { text: base + suffix, tone: 'running', ttlMs: 4500, sticky: false, clickable: false };
  }

  if (state === 'review') {
    const text = dur
      ? (en ? `Done · ${dur}` : `已完成 · ${dur}`)
      : (en ? 'Done' : '已完成');
    return { text, tone: 'review', ttlMs: 3200, sticky: false, clickable: false };
  }

  if (state === 'failed') {
    const text = detail === 'interrupted'
      ? (en ? 'Paused' : '已暂停')
      : (en ? 'Needs attention' : '遇到异常');
    return { text, tone: 'failed', ttlMs: 4000, sticky: false, clickable: true };
  }

  return null;
}
