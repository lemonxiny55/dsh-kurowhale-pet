// Pure local, offline daily companion metrics and gentle focus/late-night care checks.
// No network access, no telemetry, no model credentials.

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  };
}

export function normalizeStats(raw, now = new Date()) {
  const today = localDateKey(now);
  const empty = emptyDailyStats(today);
  if (!raw || typeof raw !== 'object') return { today: empty, lifetimeTurns: 0, lifetimeCompanionSec: 0 };
  const lifetimeTurns = Number.isFinite(raw.lifetimeTurns) ? Math.max(0, Math.round(raw.lifetimeTurns)) : 0;
  const lifetimeCompanionSec = Number.isFinite(raw.lifetimeCompanionSec) ? Math.max(0, Math.round(raw.lifetimeCompanionSec)) : 0;
  if (raw.today?.date !== today) {
    return { today: empty, lifetimeTurns, lifetimeCompanionSec };
  }
  const t = raw.today;
  return {
    today: {
      date: today,
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
    },
    lifetimeTurns,
    lifetimeCompanionSec,
  };
}

export function createStatsTracker(initialRaw, nowFn = () => new Date()) {
  let state = normalizeStats(initialRaw, nowFn());
  let dirty = false;

  const rollIfNeeded = () => {
    const today = localDateKey(nowFn());
    if (state.today.date !== today) {
      state = { ...state, today: emptyDailyStats(today) };
      dirty = true;
    }
  };

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
      const bucket = Object.hasOwn(state.today.toolsByKind, kind) ? kind : 'working';
      state.today.toolsByKind[bucket] += 1;
      dirty = true;
    },
    recordTurnEnd(completed) {
      rollIfNeeded();
      if (completed) {
        state.today.turnsCompleted += 1;
        state.lifetimeTurns += 1;
      } else {
        state.today.turnsFailed += 1;
      }
      dirty = true;
    },
    recordApproval(outcome, viaQuickAction = false) {
      rollIfNeeded();
      state.today.approvalsHandled += 1;
      if (viaQuickAction) {
        if (outcome === 'allowed-once') state.today.approvalsQuickAllowed += 1;
        else if (outcome === 'rejected') state.today.approvalsQuickRejected += 1;
      }
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
    snapshot() {
      rollIfNeeded();
      return {
        today: {
          ...state.today,
          toolsByKind: { ...state.today.toolsByKind },
          tokens: { ...state.today.tokens },
        },
        lifetimeTurns: state.lifetimeTurns,
        lifetimeCompanionSec: state.lifetimeCompanionSec,
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
      // Keep the anchor rolling once a session becomes active after a long pause.
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
