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
  ['petted', [150,150,150,150,150,220]],
  ['dozing', [280,260,280,260,280,320]],
  ['eating', [220,180,220,180,180,260]],
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
  if (type === 'approval/asked' || type === 'question/asked' || type === 'input/requested' || type === 'plan/review' || type === 'plan/proposed') return 'waiting';
  if (type === 'approval/decided' || type === 'question/answered' || type === 'input/resolved' || type === 'plan/decided' || type === 'plan/approved' || type === 'plan/rejected') return 'running';
  if ([
    'turn/start', 'step/start', 'assistant/chunk', 'tool/call', 'tool/result',
    'command/run', 'subagent/start', 'subagent/progress',
  ].includes(type)) return 'running';
  if (type === 'turn/end') {
    const reason = data.reason?.kind ?? data.reason;
    if (reason === 'blocked' || reason === 'question' || reason === 'plan-review') return 'waiting';
    if (reason === 'interrupted' || reason === 'cancelled') return 'failed';
    return reason === 'completed' ? 'review' : 'failed';
  }
  return undefined;
}

export function activityDetail(type, data = {}) {
  if (type === 'approval/asked') return 'approval';
  if (type === 'question/asked' || type === 'input/requested') return 'question';
  if (type === 'plan/review' || type === 'plan/proposed') return 'plan-review';
  if (type === 'approval/decided' || type === 'question/answered' || type === 'input/resolved' || type === 'plan/decided' || type === 'plan/approved' || type === 'plan/rejected') return 'working';
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
    if (reason === 'question') return 'question';
    if (reason === 'plan-review') return 'plan-review';
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

const INTERACTION_LINES = {
  'head-pat': {
    zh: ['好舒服…', '蹭蹭～', '呼噜呼噜', '再摸摸头', '心情变好了'],
    en: ['So cozy…', 'Purr~', 'That feels nice', 'Headpats accepted'],
  },
  'body-poke': {
    zh: ['别戳肚子啦', '痒！', '欸嘿，躲开了', '戳到围裙啦'],
    en: ['Hey, that tickles!', 'Dodged it!', "Don't poke the apron"],
  },
  dizzy: {
    zh: ['别戳啦，转晕了…', '头昏眼花…', '求放过…歇一秒'],
    en: ['Whoa, getting dizzy…', 'Easy on the clicks…'],
  },
  feed: {
    zh: ['咔嚓咔嚓，小鱼干真香', '投喂收到～', '能量补充完毕'],
    en: ['Crunch crunch, tasty fish!', 'Snack received~'],
  },
  'feed-empty': {
    zh: ['小鱼干罐子空啦，多跑两轮任务就攒满～', '口袋里还没有小鱼干，先给你比个心！', '小鱼干库存 0，再完成 1 轮或 1 次审批就掉鱼干啦'],
    en: ['Fish jar is empty — finish a turn or approval to earn more!', 'Zero fish left, sending a heart instead~'],
  },
  doze: {
    zh: ['有点困了…', '眯一小会…', 'zZz…'],
    en: ['Getting sleepy…', 'Short nap…'],
  },
  cheer: {
    zh: ['元气满满！', '给你加油～', '随时准备出发'],
    en: ['Full of energy!', 'Cheering you on~'],
  },
};

export function pickClickLine(locale = 'zh', index = 0) {
  const list = CLICK_LINES[locale === 'en' ? 'en' : 'zh'];
  return list[Math.abs(index) % list.length];
}

export function pickInteractionLine(kind, locale = 'zh', index = 0) {
  const key = kind === 'head-tap' || kind === 'pet' ? 'head-pat' : kind;
  const pool = INTERACTION_LINES[key];
  if (!pool) return pickClickLine(locale, index);
  const list = pool[locale === 'en' ? 'en' : 'zh'];
  return list[Math.abs(index) % list.length];
}

const IDLE_LIFE_LINES = {
  eating: {
    zh: ['偷偷啃根小鱼干…', '补充点能量～', '咔嚓咔嚓'],
    en: ['Sneaking a fish snack…', 'Refueling~'],
  },
  dozing: {
    zh: ['有点困了…', '小憩一会…'],
    en: ['Getting sleepy…', 'Quick nap…'],
  },
  petted: {
    zh: ['今天状态不错～', '心情很好哦'],
    en: ['Feeling cozy~', 'Good mood today'],
  },
};

export function pickAutoIdleLine(kind, locale = 'zh', index = 0) {
  const pool = IDLE_LIFE_LINES[kind];
  if (!pool) return '';
  const list = pool[locale === 'en' ? 'en' : 'zh'];
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
    let text;
    if (waitingCount > 1) {
      text = en ? `${waitingCount} items waiting` : `${waitingCount} 项待处理`;
    } else if (detail === 'question') {
      text = en ? 'Question waiting' : '等待回答问题';
    } else if (detail === 'plan-review') {
      text = en ? 'Plan review ready' : '待评审方案';
    } else {
      text = en ? 'Approval needed' : '等待审批';
    }
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
