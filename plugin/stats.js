// Pure local, offline daily companion metrics, dried-fish progression, and gentle care checks.
// No network access, no telemetry, no model credentials.

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayDiff(fromKey, toKey) {
  if (!fromKey || !toKey) return null;
  const a = Date.parse(`${fromKey}T00:00:00Z`);
  const b = Date.parse(`${toKey}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export function extractUsageTokens(usage) {
  if (!usage || typeof usage !== 'object') return null;
  const num = (...keys) => {
    for (const k of keys) {
      const v = usage[k];
      if (Number.isFinite(v) && v > 0) return Math.round(v);
    }
    return 0;
  };
  const input = num('inputTokens', 'promptTokens', 'input_tokens', 'prompt_tokens');
  const output = num('outputTokens', 'completionTokens', 'output_tokens', 'completion_tokens');
  const cached = num('cachedInputTokens', 'cacheReadTokens', 'cache_read_input_tokens', 'cached_tokens');
  const rawTotal = num('totalTokens', 'total_tokens');
  const total = rawTotal > 0 ? rawTotal : (input + output);
  if (total <= 0 && input <= 0 && output <= 0 && cached <= 0) return null;
  return { input, output, cached, total };
}

export function formatTokens(count) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count < 1000) return String(Math.round(count));
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

export function formatCompanionTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 60) return '<1m';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function emptyDailyStats(dateKey) {
  return {
    date: dateKey,
    companionSec: 0,
    turnsCompleted: 0,
    turnsFailed: 0,
    toolCalls: 0,
    toolsByKind: { coding: 0, command: 0, searching: 0, subagent: 0, working: 0 },
    approvalsHandled: 0,
    approvalsQuickAllowed: 0,
    approvalsQuickRejected: 0,
    tokens: { input: 0, output: 0, cached: 0, total: 0 },
    feeds: 0,
    fishEarned: 0,
  };
}

function normalizeDayRecord(t, dateKey) {
  const empty = emptyDailyStats(dateKey);
  if (!t || typeof t !== 'object') return empty;
  return {
    date: dateKey,
    companionSec: Number.isFinite(t.companionSec) ? Math.max(0, Math.round(t.companionSec)) : 0,
    turnsCompleted: Number.isFinite(t.turnsCompleted) ? Math.max(0, Math.round(t.turnsCompleted)) : 0,
    turnsFailed: Number.isFinite(t.turnsFailed) ? Math.max(0, Math.round(t.turnsFailed)) : 0,
    toolCalls: Number.isFinite(t.toolCalls) ? Math.max(0, Math.round(t.toolCalls)) : 0,
    toolsByKind: { ...empty.toolsByKind, ...(t.toolsByKind && typeof t.toolsByKind === 'object' ? t.toolsByKind : {}) },
    approvalsHandled: Number.isFinite(t.approvalsHandled) ? Math.max(0, Math.round(t.approvalsHandled)) : 0,
    approvalsQuickAllowed: Number.isFinite(t.approvalsQuickAllowed) ? Math.max(0, Math.round(t.approvalsQuickAllowed)) : 0,
    approvalsQuickRejected: Number.isFinite(t.approvalsQuickRejected) ? Math.max(0, Math.round(t.approvalsQuickRejected)) : 0,
    tokens: {
      input: Number.isFinite(t.tokens?.input) ? Math.max(0, Math.round(t.tokens.input)) : 0,
      output: Number.isFinite(t.tokens?.output) ? Math.max(0, Math.round(t.tokens.output)) : 0,
      cached: Number.isFinite(t.tokens?.cached) ? Math.max(0, Math.round(t.tokens.cached)) : 0,
      total: Number.isFinite(t.tokens?.total) ? Math.max(0, Math.round(t.tokens.total)) : 0,
    },
    feeds: Number.isFinite(t.feeds) ? Math.max(0, Math.round(t.feeds)) : 0,
    fishEarned: Number.isFinite(t.fishEarned) ? Math.max(0, Math.round(t.fishEarned)) : 0,
  };
}

export const MILESTONE_DEFS = [
  { id: 'streak_3', check: s => s.streak.currentDays >= 3, zh: '连续陪伴 3 天 · 默契搭档', en: '3-day streak · Synced' },
  { id: 'streak_7', check: s => s.streak.currentDays >= 7, zh: '连续陪伴 7 天 · 专属星光', en: '7-day streak · Starlight' },
  { id: 'approvals_10', check: s => s.lifetimeApprovals >= 10, zh: '累计 10 次审批 · 守护者', en: '10 approvals · Guardian' },
  { id: 'approvals_50', check: s => s.lifetimeApprovals >= 50, zh: '累计 50 次审批 · 黄金审阅官', en: '50 approvals · Lead Reviewer' },
  { id: 'feeds_5', check: s => s.lifetimeFeeds >= 5, zh: '投喂 5 条小鱼干 · 吃货认证', en: '5 fish snacks · Snack Fan' },
  { id: 'feeds_20', check: s => s.lifetimeFeeds >= 20, zh: '投喂 20 条小鱼干 · 鱼干富翁', en: '20 fish snacks · Fish Baron' },
  { id: 'turns_25', check: s => s.lifetimeTurns >= 25, zh: '累计完成 25 轮协作', en: '25 turns completed' },
];

export function normalizeStats(raw, now = new Date()) {
  const today = localDateKey(now);
  const empty = emptyDailyStats(today);
  const nonNeg = v => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);

  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: 2,
      today: empty,
      history: [],
      lifetimeTurns: 0,
      lifetimeCompanionSec: 0,
      lifetimeApprovals: 0,
      lifetimeTools: 0,
      lifetimeFeeds: 0,
      fish: { stock: 0, totalEarned: 0, totalFed: 0, progress: { toolRemainder: 0 } },
      streak: { currentDays: 1, longestDays: 1, lastActiveDate: today },
      milestones: { unlocked: [] },
    };
  }

  const lifetimeTurns = nonNeg(raw.lifetimeTurns);
  const lifetimeCompanionSec = nonNeg(raw.lifetimeCompanionSec);
  const prevTodayDate = typeof raw.today?.date === 'string' ? raw.today.date : null;
  const rawHistory = Array.isArray(raw.history) ? raw.history : [];
  const historyMap = new Map();
  for (const entry of rawHistory) {
    if (entry && typeof entry.date === 'string' && entry.date !== today) {
      historyMap.set(entry.date, normalizeDayRecord(entry, entry.date));
    }
  }
  if (prevTodayDate && prevTodayDate !== today) {
    historyMap.set(prevTodayDate, normalizeDayRecord(raw.today, prevTodayDate));
  }
  const history = [...historyMap.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  const todayRecord = prevTodayDate === today ? normalizeDayRecord(raw.today, today) : empty;
  const lifetimeApprovals = Number.isFinite(raw.lifetimeApprovals)
    ? nonNeg(raw.lifetimeApprovals)
    : todayRecord.approvalsHandled;
  const lifetimeTools = Number.isFinite(raw.lifetimeTools)
    ? nonNeg(raw.lifetimeTools)
    : todayRecord.toolCalls;
  const lifetimeFeeds = Number.isFinite(raw.lifetimeFeeds)
    ? nonNeg(raw.lifetimeFeeds)
    : nonNeg(raw.fish?.totalFed);

  const rawFish = raw.fish && typeof raw.fish === 'object' ? raw.fish : {};
  const fish = {
    stock: nonNeg(rawFish.stock),
    totalEarned: nonNeg(rawFish.totalEarned),
    totalFed: nonNeg(rawFish.totalFed ?? lifetimeFeeds),
    progress: { toolRemainder: nonNeg(rawFish.progress?.toolRemainder) % 5 },
  };

  const rawStreak = raw.streak && typeof raw.streak === 'object' ? raw.streak : {};
  const lastActive = typeof rawStreak.lastActiveDate === 'string'
    ? rawStreak.lastActiveDate
    : (prevTodayDate ?? today);
  const gap = dayDiff(lastActive, today);
  let currentDays = Math.max(1, nonNeg(rawStreak.currentDays || 1));
  if (gap === 1) currentDays += 1;
  else if (gap !== null && gap > 1) currentDays = 1;
  const longestDays = Math.max(currentDays, nonNeg(rawStreak.longestDays || currentDays));

  const unlocked = Array.isArray(raw.milestones?.unlocked)
    ? [...new Set(raw.milestones.unlocked.filter(x => typeof x === 'string'))]
    : [];

  return {
    schemaVersion: 2,
    today: todayRecord,
    history,
    lifetimeTurns,
    lifetimeCompanionSec,
    lifetimeApprovals,
    lifetimeTools,
    lifetimeFeeds,
    fish,
    streak: { currentDays, longestDays, lastActiveDate: today },
    milestones: { unlocked },
  };
}

export function summarizePeriod(snapshot, period = 'today') {
  if (period !== 'week') {
    const t = snapshot.today;
    return {
      period: 'today',
      dateLabel: t.date,
      days: 1,
      companionSec: t.companionSec,
      turnsCompleted: t.turnsCompleted,
      turnsFailed: t.turnsFailed,
      toolCalls: t.toolCalls,
      approvalsHandled: t.approvalsHandled,
      tokens: { ...t.tokens },
      feeds: t.feeds ?? 0,
      fishEarned: t.fishEarned ?? 0,
    };
  }
  const records = [...(Array.isArray(snapshot.history) ? snapshot.history.slice(-6) : []), snapshot.today];
  const agg = {
    period: 'week',
    dateLabel: records.length > 1 ? `${records[0].date} ~ ${records.at(-1).date}` : snapshot.today.date,
    days: records.length,
    companionSec: 0,
    turnsCompleted: 0,
    turnsFailed: 0,
    toolCalls: 0,
    approvalsHandled: 0,
    tokens: { input: 0, output: 0, cached: 0, total: 0 },
    feeds: 0,
    fishEarned: 0,
  };
  for (const r of records) {
    agg.companionSec += r.companionSec ?? 0;
    agg.turnsCompleted += r.turnsCompleted ?? 0;
    agg.turnsFailed += r.turnsFailed ?? 0;
    agg.toolCalls += r.toolCalls ?? 0;
    agg.approvalsHandled += r.approvalsHandled ?? 0;
    agg.tokens.input += r.tokens?.input ?? 0;
    agg.tokens.output += r.tokens?.output ?? 0;
    agg.tokens.cached += r.tokens?.cached ?? 0;
    agg.tokens.total += r.tokens?.total ?? 0;
    agg.feeds += r.feeds ?? 0;
    agg.fishEarned += r.fishEarned ?? 0;
  }
  return agg;
}

export function createStatsTracker(initialRaw, nowFn = () => new Date()) {
  let state = normalizeStats(initialRaw, nowFn());
  let dirty = false;

  const unlockMilestones = () => {
    const newlyUnlocked = [];
    for (const def of MILESTONE_DEFS) {
      if (!state.milestones.unlocked.includes(def.id) && def.check(state)) {
        state.milestones.unlocked.push(def.id);
        newlyUnlocked.push(def);
        dirty = true;
      }
    }
    return newlyUnlocked;
  };

  const awardFish = count => {
    if (count <= 0) return;
    state.fish.stock += count;
    state.fish.totalEarned += count;
    state.today.fishEarned += count;
    dirty = true;
  };

  const rollIfNeeded = () => {
    const today = localDateKey(nowFn());
    if (state.today.date !== today) {
      const archived = normalizeDayRecord(state.today, state.today.date);
      state.history = [...state.history.filter(h => h.date !== archived.date), archived]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7);
      const gap = dayDiff(state.streak.lastActiveDate, today);
      if (gap === 1) state.streak.currentDays += 1;
      else if (gap !== null && gap > 1) state.streak.currentDays = 1;
      state.streak.longestDays = Math.max(state.streak.longestDays, state.streak.currentDays);
      state.streak.lastActiveDate = today;
      state.today = emptyDailyStats(today);
      unlockMilestones();
      dirty = true;
    }
  };

  unlockMilestones();

  return {
    addCompanionSeconds(sec) {
      if (!Number.isFinite(sec) || sec <= 0) return;
      rollIfNeeded();
      const delta = Math.round(sec);
      state.today.companionSec += delta;
      state.lifetimeCompanionSec += delta;
      dirty = true;
    },
    recordToolCall(kind = 'working') {
      rollIfNeeded();
      state.today.toolCalls += 1;
      state.lifetimeTools += 1;
      const bucket = Object.hasOwn(state.today.toolsByKind, kind) ? kind : 'working';
      state.today.toolsByKind[bucket] += 1;
      state.fish.progress.toolRemainder += 1;
      if (state.fish.progress.toolRemainder >= 5) {
        const gained = Math.floor(state.fish.progress.toolRemainder / 5);
        state.fish.progress.toolRemainder %= 5;
        awardFish(gained);
      }
      dirty = true;
    },
    recordTurnEnd(completed) {
      rollIfNeeded();
      if (completed) {
        state.today.turnsCompleted += 1;
        state.lifetimeTurns += 1;
        awardFish(1);
        unlockMilestones();
      } else {
        state.today.turnsFailed += 1;
      }
      dirty = true;
    },
    recordApproval(outcome, viaQuickAction = false) {
      rollIfNeeded();
      state.today.approvalsHandled += 1;
      state.lifetimeApprovals += 1;
      if (viaQuickAction) {
        if (outcome === 'allowed-once') state.today.approvalsQuickAllowed += 1;
        else if (outcome === 'rejected') state.today.approvalsQuickRejected += 1;
      }
      awardFish(1);
      unlockMilestones();
      dirty = true;
    },
    recordUsage(usage) {
      const parsed = extractUsageTokens(usage);
      if (!parsed) return false;
      rollIfNeeded();
      state.today.tokens.input += parsed.input;
      state.today.tokens.output += parsed.output;
      state.today.tokens.cached += parsed.cached;
      state.today.tokens.total += parsed.total;
      dirty = true;
      return true;
    },
    feedFish() {
      rollIfNeeded();
      if (state.fish.stock <= 0) {
        return { consumed: false, stock: 0, totalFed: state.fish.totalFed, newlyUnlocked: [] };
      }
      state.fish.stock -= 1;
      state.fish.totalFed += 1;
      state.today.feeds += 1;
      state.lifetimeFeeds += 1;
      const newlyUnlocked = unlockMilestones();
      dirty = true;
      return {
        consumed: true,
        stock: state.fish.stock,
        totalFed: state.fish.totalFed,
        newlyUnlocked,
      };
    },
    snapshot() {
      rollIfNeeded();
      return {
        schemaVersion: state.schemaVersion,
        today: {
          ...state.today,
          toolsByKind: { ...state.today.toolsByKind },
          tokens: { ...state.today.tokens },
        },
        history: state.history.map(item => ({
          ...item,
          toolsByKind: { ...item.toolsByKind },
          tokens: { ...item.tokens },
        })),
        lifetimeTurns: state.lifetimeTurns,
        lifetimeCompanionSec: state.lifetimeCompanionSec,
        lifetimeApprovals: state.lifetimeApprovals,
        lifetimeTools: state.lifetimeTools,
        lifetimeFeeds: state.lifetimeFeeds,
        fish: {
          ...state.fish,
          progress: { ...state.fish.progress },
        },
        streak: { ...state.streak },
        milestones: { unlocked: [...state.milestones.unlocked] },
      };
    },
    isDirty() { return dirty; },
    markSaved() { dirty = false; },
  };
}

export function createCareMonitor({ intervalMs = 50 * 60_000, nowFn = () => new Date() } = {}) {
  const safeInterval = Number.isFinite(intervalMs) ? Math.max(1000, intervalMs) : 50 * 60_000;
  let focusAnchorMs = nowFn().getTime();
  let lastBreakRemindedMs = 0;
  let lastLateNightKey = null;

  return {
    markActivity() {
      const now = nowFn().getTime();
      if (now - focusAnchorMs > safeInterval * 3) focusAnchorMs = now;
    },
    resetFocus() {
      focusAnchorMs = nowFn().getTime();
    },
    checkIdle({ enabled = true, locale = 'zh' } = {}) {
      if (!enabled) return null;
      const nowDate = nowFn();
      const now = nowDate.getTime();
      const hour = nowDate.getHours();
      const minute = nowDate.getMinutes();
      const isLateNight = (hour === 23 && minute >= 30) || hour < 5;
      const nightKey = hour < 5
        ? `${localDateKey(new Date(now - 24 * 3600_000))}-night`
        : `${localDateKey(nowDate)}-night`;

      if (isLateNight && lastLateNightKey !== nightKey) {
        lastLateNightKey = nightKey;
        lastBreakRemindedMs = now;
        focusAnchorMs = now;
        return {
          kind: 'late-night',
          text: locale === 'en' ? 'Getting late — remember to rest' : '夜深了，记得早点休息',
          tone: 'chat',
          ttlMs: 5200,
        };
      }

      if (now - focusAnchorMs >= safeInterval && now - lastBreakRemindedMs >= safeInterval) {
        lastBreakRemindedMs = now;
        focusAnchorMs = now;
        const mins = Math.max(1, Math.round(safeInterval / 60_000));
        return {
          kind: 'focus-break',
          text: locale === 'en' ? `Focused ${mins}m — stretch or sip water` : `已专注 ${mins} 分钟，歇会儿喝口水`,
          tone: 'chat',
          ttlMs: 5000,
        };
      }
      return null;
    },
  };
}
