import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { animations, activityState, activityDetail, resolveActivities, bubbleForState, pickClickLine, pickInteractionLine, pickAutoIdleLine } from './animations.js';
import { registerKuroWhaleCommand } from './commands.js';
import { buildDiagnosticReport, copyTextToClipboard, readRecentErrors } from './diagnostics.js';
import { computeAnchor, normalizeDisplays, queryWindowsDisplays, resolveSafePosition } from './display.js';
import { isHostWindowFocused, sendWindowsToast, shouldTriggerAlert } from './notify.js';
import { computeWindowLayout, createOverlay, focusHostWindow } from './overlay.js';
import { buildReportCardModel, copyImageFileToClipboard, saveReportCardPng } from './report-card.js';
import { resolveResources } from './resources.js';
import { createCareMonitor, createStatsTracker, formatCompanionTime, formatTokens } from './stats.js';

export const name = 'dsh-kurowhale-pet';
export const inject = [];

const read = (path, fallback) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };
const pkgVersion = read(new URL('./package.json', import.meta.url), null)?.version ?? '0.3.0';

export function apply(ctx, dependencies = {}) {
  const resourceResolver = dependencies.resolveResources ?? resolveResources;
  const overlayFactory = dependencies.createOverlay ?? createOverlay;
  const hostFocuser = dependencies.focusHostWindow ?? focusHostWindow;
  const displayQuerier = dependencies.queryDisplays
    ?? (dependencies.createOverlay ? async () => [] : queryWindowsDisplays);
  const clipboardCopier = dependencies.copyToClipboard ?? copyTextToClipboard;
  const hostFocusChecker = dependencies.isHostWindowFocused
    ?? (dependencies.createOverlay ? async () => true : isHostWindowFocused);
  const toastSender = dependencies.sendToast
    ?? (dependencies.createOverlay ? async () => false : sendWindowsToast);
  const imageClipboardCopier = dependencies.copyImageToClipboard ?? copyImageFileToClipboard;
  const nowFn = dependencies.nowFn ?? (() => new Date());
  const restartDelays = dependencies.restartDelays ?? [1500, 4000, 8000];
  const directory = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'kurowhale-pet');
  mkdirSync(directory, { recursive: true });
  const audit = (event, details = {}) => {
    try {
      const log = join(directory, 'lifecycle.jsonl');
      try { if (statSync(log).size >= 1024 * 1024) renameSync(log, log + '.1'); } catch {}
      appendFileSync(log, JSON.stringify({ time: new Date().toISOString(), event, version: pkgVersion, pid: process.pid, ...details }) + '\n');
    } catch {}
  };

  ctx.effect(() => {
    let closed = false, overlay, frameTimer, statusTimer, pollTimer, cycleTimer, hoverTimer;
    let clickTimer, patrolTimer, patrolStepTimer, idleHideTimer, restartTimer, healthyTimer, companionTimer, interactTimer;
    let queue = Promise.resolve(), lastCommand, lastSeen, pokeDodges = 0, interactLines = 0;
    let firstIdleDone = false, lastAutoAct = null, autoLineIdx = 0;
    const abort = new AbortController();
    const config = read(join(directory, 'local.json'), {});
    // Honor an explicit opt-out; fresh installs start automatically.
    const overlayEnabled = config.rendererEnabled !== false;
    let resources;
    const saved = read(join(directory, 'position.json'), {});
    let scale = Number.isFinite(saved.scale) ? saved.scale : (config.scale ?? 1.25);
    scale = Math.max(0.5, Math.min(2, scale));
    let x = saved.x ?? 120, y = saved.y ?? 120, visible = saved.visible !== false, topmost = saved.topmost !== false;
    let positionAnchor = saved.anchor && typeof saved.anchor === 'object' ? saved.anchor : null;
    const preferences = {
      bubbles: saved.bubbles ?? config.bubbles ?? true,
      patrol: saved.patrol ?? config.patrol ?? true,
      hideWhenIdle: saved.hideWhenIdle ?? config.hideWhenIdle ?? false,
      clickThrough: saved.clickThrough ?? config.clickThrough ?? false,
      sound: saved.sound ?? config.sound ?? false,
      dndEnabled: saved.dndEnabled ?? config.dndEnabled ?? false,
      dndStart: saved.dndStart ?? config.dndStart ?? '23:00',
      dndEnd: saved.dndEnd ?? config.dndEnd ?? '08:00',
      toast: saved.toast ?? config.toast ?? true,
      careReminders: saved.careReminders ?? config.careReminders ?? true,
      quickApprove: saved.quickApprove ?? config.quickApprove ?? true,
      locale: saved.locale ?? config.locale ?? 'zh',
    };
    const statsTracker = createStatsTracker(read(join(directory, 'stats.json'), null), nowFn);
    const careMonitor = createCareMonitor({
      intervalMs: Number.isFinite(config.careIntervalMs) ? config.careIntervalMs : 50 * 60_000,
      nowFn,
    });
    let autoHidden = false;
    let state = 'idle', source = 'agent', index = 0, diagnostic = false, dragging = false;
    let clickCount = 0, restartAttempts = 0, screenBounds = null;
    let currentDisplays = [], overlayOpen = false, clickThroughSuspended = false;
    let lastChimeAt = 0, lastChimeTone = '', lastToastAt = 0, lastToastKind = '';
    const activities = new Map(), details = new Map(), toolNames = new Map(), turnStarts = new Map();
    // Session-level approval audit metadata from `approval/asked` events: key -> Map<approvalId, meta>
    const approvals = new Map();
    // Session-level pending questions & plan-review items (gracefully populated when DSH emits optional fields).
    const pendingQuestions = new Map(), pendingPlans = new Map();
    // Live interactive approval requests intercepted via `approval/request` waterfall: id -> entry
    const liveRequests = new Map();
    const liveQuestionRequests = new Map(), livePlanRequests = new Map();
    // Track approval ids already counted via quick action so `approval/decided` doesn't double-count.
    const quickCountedApprovals = new Set();
    // Weak references to live agents for safe in-process cancellation without leaking memory.
    const agentRefs = new Map();
    const timeouts = new Map(), seen = new Map(), eventCounts = {}, aliases = new Map();
    const alias = key => { if (!aliases.has(key)) aliases.set(key, 'session-' + (aliases.size + 1)); return aliases.get(key); };
    const status = {
      version: pkgVersion, hostPid: process.pid, rendererReady: false, visibilityVerified: false,
      nativePid: null, lastError: null, stage: 'starting', restartAttempts: 0,
      clickThroughSuspended: false,
    };
    const atomic = (file, value) => {
      const target = join(directory, file), tmp = target + '.tmp';
      try { writeFileSync(tmp, JSON.stringify(value, null, 2)); renameSync(tmp, target); return true; } catch { return false; }
    };
    const refreshAnchor = () => {
      if (currentDisplays.length) {
        positionAnchor = computeAnchor({ x, y }, computeWindowLayout(scale), currentDisplays);
      }
    };
    const persist = () => atomic('position.json', {
      x, y, scale, visible, topmost,
      ...(positionAnchor ? { anchor: positionAnchor } : {}),
      ...preferences,
    });
    const persistStats = () => {
      if (!statsTracker.isDirty()) return;
      if (atomic('stats.json', statsTracker.snapshot())) statsTracker.markSaved();
    };

    const resolveAgentForKey = key => {
      const ref = agentRefs.get(key);
      const cached = ref?.deref?.();
      if (cached && typeof cached.cancel === 'function') return cached;
      try {
        const direct = (typeof ctx.get === 'function' ? ctx.get('agents') : ctx.agents)?.get?.(key);
        if (direct && typeof direct.cancel === 'function') return direct;
      } catch {}
      return null;
    };

    const collectPendingApprovals = () => {
      const items = [];
      const seenKeys = new Set();
      for (const req of liveRequests.values()) {
        items.push({
          id: req.id,
          session: alias(req.sessionKey),
          toolName: req.toolName || 'tool',
          reason: req.reason || '',
          canDecide: true,
        });
        seenKeys.add(`${req.sessionKey}:${req.callId ?? req.toolName ?? ''}`);
      }
      for (const [sessionKey, map] of approvals) {
        for (const [id, meta] of map) {
          const dedup = `${sessionKey}:${meta.callId ?? meta.toolName ?? ''}`;
          if (seenKeys.has(dedup)) continue;
          items.push({
            id,
            session: alias(sessionKey),
            toolName: meta.toolName || 'tool',
            reason: meta.reason || '',
            canDecide: false,
          });
        }
      }
      return items;
    };

    const collectPendingQuestions = () => {
      const items = [];
      const seenIds = new Set();
      for (const req of liveQuestionRequests.values()) {
        items.push({
          id: req.id,
          session: alias(req.sessionKey),
          prompt: req.prompt || '',
          options: req.options ?? [],
          canAnswer: true,
        });
        seenIds.add(`${req.sessionKey}:${req.rawId ?? req.prompt}`);
      }
      for (const [sessionKey, map] of pendingQuestions) {
        for (const [id, meta] of map) {
          const dedup = `${sessionKey}:${meta.id ?? meta.prompt}`;
          if (seenIds.has(dedup)) continue;
          items.push({
            id,
            session: alias(sessionKey),
            prompt: meta.prompt || '',
            options: meta.options ?? [],
            canAnswer: false,
          });
        }
      }
      return items;
    };

    const collectPendingPlans = () => {
      const items = [];
      const seenIds = new Set();
      for (const req of livePlanRequests.values()) {
        items.push({
          id: req.id,
          session: alias(req.sessionKey),
          title: req.title || '',
          summary: req.summary || '',
          canDecide: true,
        });
        seenIds.add(`${req.sessionKey}:${req.rawId ?? req.title}`);
      }
      for (const [sessionKey, map] of pendingPlans) {
        for (const [id, meta] of map) {
          const dedup = `${sessionKey}:${meta.id ?? meta.title}`;
          if (seenIds.has(dedup)) continue;
          items.push({
            id,
            session: alias(sessionKey),
            title: meta.title || '',
            summary: meta.summary || '',
            canDecide: false,
          });
        }
      }
      return items;
    };

    const buildPanelPayload = () => {
      const nowMs = Date.now();
      const snap = statsTracker.snapshot();
      const t = snap.today;
      const pendingApprovals = collectPendingApprovals();
      const questions = collectPendingQuestions();
      const planReviews = collectPendingPlans();
      const sessionRows = [...activities].map(([key, value]) => {
        const hasWait = approvals.get(key)?.size
          || pendingQuestions.get(key)?.size
          || pendingPlans.get(key)?.size
          || [...liveRequests.values(), ...liveQuestionRequests.values(), ...livePlanRequests.values()].some(r => r.sessionKey === key);
        const eff = hasWait ? 'waiting' : value;
        const started = turnStarts.get(key);
        return {
          alias: alias(key),
          state: eff,
          detail: details.get(key),
          toolName: toolNames.get(key),
          elapsedSec: started && eff !== 'idle' ? Math.max(0, Math.round((nowMs - started) / 1000)) : 0,
          canCancel: (eff === 'running' || eff === 'waiting') && Boolean(resolveAgentForKey(key)),
        };
      });
      return {
        state,
        approvals: pendingApprovals,
        questions,
        planReviews,
        sessions: sessionRows,
        stats: {
          companion: formatCompanionTime(t.companionSec),
          turns: t.turnsCompleted,
          tools: t.toolCalls,
          tokens: t.tokens.total > 0 ? formatTokens(t.tokens.total) : '',
          fishStock: snap.fish?.stock ?? 0,
          feeds: t.feeds ?? 0,
          streakDays: snap.streak?.currentDays ?? 1,
        },
        reports: {
          today: buildReportCardModel(snap, 'today', preferences.locale),
          week: buildReportCardModel(snap, 'week', preferences.locale),
        },
      };
    };

    const pushPanel = () => {
      if (!overlay || !status.rendererReady) return;
      overlay.panel?.(buildPanelPayload());
    };

    const buildSummary = () => ({
      ...status, state, source, visible, autoHidden, x, y, scale, topmost,
      ...(positionAnchor ? { anchor: positionAnchor } : {}),
      displays: currentDisplays,
      preferences: { ...preferences }, lastCommand,
      sessions: [...activities].map(([key, value]) => ({
        alias: alias(key),
        state: (approvals.get(key)?.size || pendingQuestions.get(key)?.size || pendingPlans.get(key)?.size || [...liveRequests.values(), ...liveQuestionRequests.values(), ...livePlanRequests.values()].some(r => r.sessionKey === key)) ? 'waiting' : value,
        detail: details.get(key),
        ...(toolNames.get(key) ? { toolName: toolNames.get(key) } : {}),
      })),
      pendingApprovals: collectPendingApprovals(),
      pendingQuestions: collectPendingQuestions(),
      pendingPlans: collectPendingPlans(),
      stats: statsTracker.snapshot(),
      framesDrawn: Object.fromEntries([...seen].map(([k, v]) => [k, [...v].sort((a, b) => a - b)])),
      eventCounts,
    });
    let lastSnapshot;
    const snapshot = () => {
      const value = buildSummary();
      const serialized = JSON.stringify(value);
      if (serialized !== lastSnapshot) { if (atomic('status.json', value)) lastSnapshot = serialized; }
    };

    const stopPatrol = () => {
      clearTimeout(patrolTimer); patrolTimer = null;
      clearInterval(patrolStepTimer); patrolStepTimer = null;
      overlay?.stopPatrol?.();
    };

    const stopIdleHide = () => {
      clearTimeout(idleHideTimer); idleHideTimer = null;
    };

    const showBubble = payload => {
      if (!overlay || !status.rendererReady) return;
      if (!preferences.bubbles) { overlay.bubble?.({ clear: true }); return; }
      overlay.bubble?.(payload ?? { clear: true });
    };

    const scheduleIdleHide = () => {
      stopIdleHide();
      if (closed || !preferences.hideWhenIdle || !visible || autoHidden || state !== 'idle' || diagnostic || dragging) return;
      const delay = Number.isFinite(config.idleHideDelayMs) ? Math.max(50, config.idleHideDelayMs) : 30000;
      idleHideTimer = setTimeout(async () => {
        if (closed || !preferences.hideWhenIdle || !visible || state !== 'idle' || diagnostic || dragging) return;
        autoHidden = true;
        clearTimeout(frameTimer);
        stopPatrol();
        if (overlay) {
          try { await overlay.hide(); } catch {}
        }
        audit('auto-hidden');
        snapshot();
      }, delay);
    };

    const wakeFromAutoHide = async () => {
      stopIdleHide();
      if (!autoHidden || !visible) return;
      autoHidden = false;
      if (overlay && status.rendererReady) {
        try { await overlay.show(); } catch {}
      }
      tick();
      audit('auto-shown');
      snapshot();
    };

    const pickAutonomousAction = hasWalk => {
      const basePool = [
        ...(hasWalk ? [{ kind: 'walk', weight: 30 }] : []),
        { kind: 'eating', weight: 22 },
        { kind: 'dozing', weight: 20 },
        { kind: 'petted', weight: 10 },
        { kind: 'jumping', weight: 10 },
        { kind: 'waving', weight: 8 },
      ];
      const pool = basePool.length > 1 && lastAutoAct
        ? basePool.filter(item => item.kind !== lastAutoAct)
        : basePool;
      const total = pool.reduce((sum, item) => sum + item.weight, 0);
      let cursor = Math.random() * total;
      let chosen = pool[0];
      for (const item of pool) {
        cursor -= item.weight;
        if (cursor <= 0) { chosen = item; break; }
      }
      lastAutoAct = chosen.kind;
      return chosen.kind;
    };

    const schedulePatrol = () => {
      stopPatrol();
      if (closed || !preferences.patrol || !visible || autoHidden || diagnostic || dragging || state !== 'idle' || !status.rendererReady) return;
      const hasCustomInterval = Number.isFinite(config.patrolIntervalMs);
      const waitMs = hasCustomInterval
        ? Math.max(25, config.patrolIntervalMs)
        : (firstIdleDone ? 9000 + Math.floor(Math.random() * 6000) : 6000 + Math.floor(Math.random() * 4000));
      const hold = ms => (Number.isFinite(config.patrolActionDurationMs) ? Math.max(20, config.patrolActionDurationMs) : ms);
      patrolTimer = setTimeout(() => {
        if (closed || !preferences.patrol || !visible || autoHidden || diagnostic || dragging || state !== 'idle' || !overlay || !status.rendererReady) return;
        firstIdleDone = true;
        const canWalk = Boolean(overlay.patrol || overlay.move);
        if (hasCustomInterval && config.patrolAutoAll !== true) {
          const shouldWave = !canWalk || Math.random() < 0.3;
          if (shouldWave) {
            setState('waving', 'patrol');
            patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, hold(1300));
            return;
          }
        } else {
          const act = pickAutonomousAction(canWalk);
          if (act === 'eating') {
            setState('eating', 'patrol', true);
            overlay?.fx?.({ kind: 'sparkle', bounce: true });
            if (Math.random() < 0.5) showBubble({ text: pickAutoIdleLine('eating', preferences.locale, autoLineIdx++), tone: 'chat', ttlMs: 2800 });
            patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, hold(3400));
            return;
          }
          if (act === 'dozing') {
            setState('dozing', 'patrol', true);
            overlay?.fx?.({ kind: 'zzz' });
            if (Math.random() < 0.4) showBubble({ text: pickAutoIdleLine('dozing', preferences.locale, autoLineIdx++), tone: 'chat', ttlMs: 2400 });
            patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, hold(7500 + Math.floor(Math.random() * 3000)));
            return;
          }
          if (act === 'petted') {
            setState('petted', 'patrol', true);
            overlay?.fx?.({ kind: 'heart', bounce: true });
            if (Math.random() < 0.45) showBubble({ text: pickAutoIdleLine('petted', preferences.locale, autoLineIdx++), tone: 'chat', ttlMs: 2400 });
            patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, hold(2400));
            return;
          }
          if (act === 'jumping') {
            setState('jumping', 'patrol', true);
            overlay?.fx?.({ kind: 'sparkle', bounce: true });
            patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, hold(1450));
            return;
          }
          if (act === 'waving') {
            setState('waving', 'patrol', true);
            patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, hold(1350));
            return;
          }
        }
        const b = screenBounds ?? { x: 0, y: 0, w: 1920, h: 1080 };
        const minX = b.x + 24;
        const maxX = Math.max(minX, b.x + b.w - Math.round(260 * scale));
        let dir = Math.random() < 0.5 ? -1 : 1;
        if (x - 140 < minX) dir = 1;
        else if (x + 140 > maxX) dir = -1;
        setState(dir < 0 ? 'running-left' : 'running-right', 'patrol');
        if (typeof overlay.patrol === 'function') {
          const distance = 90 + Math.floor(Math.random() * 90);
          const durationMs = hold(1350 + Math.floor(Math.random() * 750));
          overlay.patrol({ dir, distance, durationMs });
          patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, durationMs + hold(900));
          return;
        }
        let steps = 10 + Math.floor(Math.random() * 6);
        patrolStepTimer = setInterval(() => {
          if (closed || dragging || diagnostic || source !== 'patrol' || !overlay) { stopPatrol(); return; }
          const nextX = Math.max(minX, Math.min(maxX, x + dir * 8));
          if (nextX === x || --steps <= 0) {
            stopPatrol();
            resume();
            return;
          }
          x = nextX;
          overlay.move({ x, y });
        }, Number.isFinite(config.patrolActionDurationMs) ? 10 : 120);
      }, waitMs);
    };

    const syncClickThrough = async (reasonState = state) => {
      const needsAttention = reasonState === 'waiting' || reasonState === 'failed' || collectPendingApprovals().length > 0;
      const shouldSuspend = Boolean(preferences.clickThrough && (needsAttention || overlayOpen));
      const effective = Boolean(preferences.clickThrough && !shouldSuspend);
      const prevSuspended = clickThroughSuspended;
      clickThroughSuspended = shouldSuspend;
      status.clickThroughSuspended = shouldSuspend;
      if (!overlay || !status.rendererReady) return;
      if (preferences.clickThrough) {
        await overlay.setClickThrough?.(effective, {
          suspended: shouldSuspend,
          highlight: needsAttention ? (reasonState === 'failed' ? 'failed' : 'waiting') : null,
        });
        if (shouldSuspend && !prevSuspended && needsAttention) {
          audit('click-through-wake', { reason: reasonState });
        } else if (!shouldSuspend && prevSuspended) {
          audit('click-through-restored');
        }
      } else {
        await overlay.setClickThrough?.(false, { suspended: false, highlight: null });
      }
    };

    const healDisplayPosition = async (rawDisplays, reasonTrigger = 'display-check') => {
      const normalized = normalizeDisplays(rawDisplays);
      if (normalized.length) currentDisplays = normalized;
      if (!currentDisplays.length) return false;
      const layout = computeWindowLayout(scale);
      const savedInput = { x, y, ...(positionAnchor ? { anchor: positionAnchor } : {}) };
      const resolved = resolveSafePosition({ saved: savedInput, layout, displays: currentDisplays });
      if (resolved.anchor) positionAnchor = resolved.anchor;
      if (!resolved.healed) return false;
      x = resolved.x;
      y = resolved.y;
      persist();
      if (overlay && status.rendererReady) {
        overlay.move?.({ x, y });
      }
      audit('display-healed', { trigger: reasonTrigger, reason: resolved.reason, x, y, displayId: positionAnchor?.displayId });
      snapshot();
      return true;
    };

    const tick = () => {
      clearTimeout(frameTimer);
      if (closed || !overlay || !visible || autoHidden) return;
      const row = animations.findIndex(([s]) => s === state), times = animations[row][1];
      overlay.frame({ state, row, index, trace: diagnostic && config.diagnostics === true });
      index = (index + 1) % times.length;
      frameTimer = setTimeout(tick, times[(index + times.length - 1) % times.length]);
    };

    const setState = (next, origin, force = false) => {
      if (!animations.some(([s]) => s === next)) throw Error('Unknown animation');
      if (force || next !== state || origin !== source) {
        if (origin !== 'patrol') stopPatrol();
        if (origin !== 'interact') clearTimeout(interactTimer);
        state = next; source = origin; index = 0;
        audit('state', { state, source });
        tick();
        if (state === 'idle' && origin === 'agent') {
          schedulePatrol();
          scheduleIdleHide();
        } else {
          stopIdleHide();
        }
        void syncClickThrough(next);
        pushPanel();
        snapshot();
      }
    };

    const aggregateContext = () => {
      let activeCount = 0, waitingCount = 0, primaryDetail;
      const pendingList = collectPendingApprovals();
      waitingCount = pendingList.length;
      for (const [key, value] of activities) {
        const hasPending = approvals.get(key)?.size || [...liveRequests.values()].some(r => r.sessionKey === key);
        const eff = hasPending ? 'waiting' : value;
        if (eff === 'running') {
          activeCount++;
          if (!primaryDetail) primaryDetail = details.get(key);
        }
      }
      return { activeCount, waitingCount, primaryDetail, firstApproval: pendingList[0] };
    };

    const dispatchAlert = async (tone, message) => {
      const now = nowFn();
      const nowMs = now.getTime();
      if (shouldTriggerAlert({
        enabled: Boolean(preferences.sound),
        dndEnabled: Boolean(preferences.dndEnabled),
        dndStart: preferences.dndStart,
        dndEnd: preferences.dndEnd,
        now,
      })) {
        if (tone !== lastChimeTone || nowMs - lastChimeAt >= 1200) {
          lastChimeTone = tone;
          lastChimeAt = nowMs;
          overlay?.chime?.(tone);
        }
      }
      if (!shouldTriggerAlert({
        enabled: preferences.toast !== false,
        dndEnabled: Boolean(preferences.dndEnabled),
        dndStart: preferences.dndStart,
        dndEnd: preferences.dndEnd,
        now,
      })) return;
      if (!message || (tone === lastToastKind && nowMs - lastToastAt < 4000)) return;
      let focused = false;
      try { focused = await hostFocusChecker(); } catch {}
      if (closed || focused) return;
      lastToastKind = tone;
      lastToastAt = nowMs;
      const en = preferences.locale === 'en';
      const title = tone === 'waiting'
        ? (en ? 'KuroWhale · Waiting for input' : 'KuroWhale · 等待你的确认')
        : tone === 'review'
          ? (en ? 'KuroWhale · Turn completed' : 'KuroWhale · 本轮已完成')
          : (en ? 'KuroWhale · Attention needed' : 'KuroWhale · 遇到异常');
      audit('toast-sent', { tone });
      void toastSender({
        title,
        body: message,
        kind: tone,
        onAction: actionKind => {
          if (closed) return;
          if (actionKind === 'panel' && overlay && status.rendererReady) {
            void enqueue({ action: 'panel', value: true, id: crypto.randomUUID() }).catch(() => {});
          } else {
            void enqueue({ action: 'focus', id: crypto.randomUUID() }).catch(() => {});
          }
        },
      }).catch(() => {});
    };

    const resume = (bubbleOptions) => {
      diagnostic = false;
      clearTimeout(cycleTimer);
      const effectiveStates = [...activities].map(([key, value]) => {
        const hasPending = approvals.get(key)?.size
          || pendingQuestions.get(key)?.size
          || pendingPlans.get(key)?.size
          || [...liveRequests.values(), ...liveQuestionRequests.values(), ...livePlanRequests.values()].some(r => r.sessionKey === key);
        return hasPending ? 'waiting' : value;
      });
      if (liveRequests.size > 0 || liveQuestionRequests.size > 0 || livePlanRequests.size > 0) effectiveStates.push('waiting');
      const next = resolveActivities(effectiveStates);
      const prevState = state;
      if (next !== 'idle') void wakeFromAutoHide();
      setState(next, 'agent');
      void syncClickThrough(next);
      pushPanel();
      if (next === 'idle') {
        if (prevState === 'waiting') showBubble({ clear: true });
        if (visible && !autoHidden) {
          const care = careMonitor.checkIdle({ enabled: preferences.careReminders, locale: preferences.locale });
          if (care) {
            audit('care-reminder', { kind: care.kind });
            showBubble(care);
          }
        }
        return;
      }
      const { activeCount, waitingCount, primaryDetail, firstApproval } = aggregateContext();
      const totalWaiting = waitingCount + collectPendingQuestions().length + collectPendingPlans().length;
      const bubble = bubbleForState({
        state: next,
        detail: bubbleOptions?.detail ?? primaryDetail,
        activeCount,
        waitingCount: totalWaiting,
        durationMs: bubbleOptions?.durationMs,
        locale: preferences.locale,
      });
      if (bubble) {
        if (next === 'waiting' && firstApproval?.toolName && totalWaiting === 1) {
          bubble.text = preferences.locale === 'en'
            ? `Approve ${firstApproval.toolName}`
            : `待审批 · ${firstApproval.toolName}`;
        }
        showBubble(bubble);
      }
      if (next === 'waiting' && (prevState !== 'waiting' || bubbleOptions?.newApproval)) {
        void dispatchAlert('waiting', bubble?.text ?? 'Approval needed');
      } else if (next === 'review' && prevState !== 'review') {
        void dispatchAlert('review', bubble?.text ?? 'Completed');
      } else if (next === 'failed' && prevState !== 'failed') {
        void dispatchAlert('failed', bubble?.text ?? 'Failed');
      }
    };

    const setVisible = async value => {
      stopIdleHide();
      autoHidden = false;
      if (value && (!overlay || !status.rendererReady)) await reopen();
      visible = value; persist();
      if (overlay) {
        if (value) await overlay.show(); else await overlay.hide();
        status.nativeWindow = await overlay.inspect();
      }
      tick();
      if (value && state === 'idle') schedulePatrol(); else stopPatrol();
      pushPanel();
      snapshot(); audit(value ? 'shown' : 'hidden');
    };

    const scheduleAutoRestart = () => {
      clearTimeout(restartTimer); restartTimer = null;
      if (closed || !visible || autoHidden || !overlayEnabled || config.autoRestart === false) return;
      if (restartAttempts >= restartDelays.length) return;
      const delay = restartDelays[restartAttempts++];
      status.restartAttempts = restartAttempts;
      audit('native-restart-scheduled', { attempt: restartAttempts, delayMs: delay });
      restartTimer = setTimeout(() => {
        if (closed || !visible || autoHidden || status.rendererReady) return;
        audit('native-restarting', { attempt: restartAttempts });
        void reopen().catch(error => {
          if (closed) return;
          status.lastError = String(error.message || error);
          audit('renderer-error', { error: status.lastError, attempt: restartAttempts });
          snapshot();
          scheduleAutoRestart();
        });
      }, delay);
    };

    const handleInteraction = async (kind = 'head-tap') => {
      if (closed || diagnostic || dragging) return;
      if (state === 'waiting') {
        const focused = await hostFocuser();
        audit('focus-host', { trigger: 'click-waiting', focused });
        showBubble({ text: focused ? '已切回 DSH 处理审批' : '请切回 DSH 窗口处理审批', tone: 'waiting', ttlMs: 2500 });
        return;
      }
      if (state === 'running') {
        const { activeCount, primaryDetail } = aggregateContext();
        const b = bubbleForState({ state: 'running', detail: primaryDetail, activeCount, locale: preferences.locale });
        if (b) showBubble(b);
        return;
      }
      stopPatrol();
      clearTimeout(interactTimer);
      clearTimeout(clickTimer);
      clearTimeout(hoverTimer);
      if (autoHidden) void wakeFromAutoHide();
      const loc = preferences.locale;
      const line = pickInteractionLine(kind, loc, interactLines++);
      audit('interact', { kind });

      if (kind === 'head-pat' || kind === 'head-tap' || kind === 'pet') {
        setState('petted', 'interact', true);
        overlay?.fx?.({ kind: 'heart', bounce: true });
        showBubble({ text: line, tone: 'chat', ttlMs: 2600 });
        interactTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'interact') resume(); }, 2400);
        return loc === 'en' ? 'KuroWhale: enjoying headpats~' : 'KuroWhale：正在开心蹭蹭～';
      }
      if (kind === 'body-poke') {
        const dodge = pokeDodges++ % 2 === 1 && typeof overlay?.patrol === 'function';
        if (dodge) {
          const b = screenBounds ?? { x: 0, y: 0, w: 1920, h: 1080 };
          let dir = pokeDodges % 4 < 2 ? 1 : -1;
          if (x - 80 < b.x + 24) dir = 1;
          else if (x + 80 > b.x + b.w - Math.round(260 * scale)) dir = -1;
          setState(dir < 0 ? 'running-left' : 'running-right', 'interact', true);
          overlay.patrol({ dir, distance: 42, durationMs: 420 });
        } else {
          setState('jumping', 'interact', true);
        }
        overlay?.fx?.({ kind: 'sparkle', bounce: true });
        showBubble({ text: line, tone: 'chat', ttlMs: 2200 });
        interactTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'interact') resume(); }, 1350);
        return;
      }
      if (kind === 'dizzy') {
        setState('failed', 'interact', true);
        overlay?.fx?.({ kind: 'dizzy', shake: true });
        showBubble({ text: line, tone: 'chat', ttlMs: 2800 });
        interactTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'interact') resume(); }, 2500);
        return;
      }
      if (kind === 'feed') {
        const feedResult = statsTracker.feedFish();
        persistStats();
        pushPanel();
        if (!feedResult.consumed) {
          const emptyLine = pickInteractionLine('feed-empty', loc, interactLines++);
          setState('eating', 'interact', true);
          overlay?.fx?.({ kind: 'heart', bounce: true });
          showBubble({ text: emptyLine, tone: 'chat', ttlMs: 3200 });
          interactTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'interact') resume(); }, 2200);
          return loc === 'en' ? 'KuroWhale: fish jar is empty (0 left), finish turns or approvals to earn more!' : 'KuroWhale：小鱼干库存为 0，先比个心，完成任务会掉小鱼干哦～';
        }
        setState('eating', 'interact', true);
        const unlocked = feedResult.newlyUnlocked ?? [];
        if (unlocked.length > 0) {
          const badge = loc === 'en' ? unlocked[0].en : unlocked[0].zh;
          overlay?.fx?.({ kind: 'milestone', bounce: true });
          showBubble({ text: loc === 'en' ? `Milestone! ${badge}` : `解锁里程碑：${badge}`, tone: 'review', ttlMs: 3800 });
        } else {
          overlay?.fx?.({ kind: 'sparkle', bounce: true });
          const leftMsg = loc === 'en' ? `${line} (${feedResult.stock} left)` : `${line}（余 ${feedResult.stock} 条）`;
          showBubble({ text: leftMsg, tone: 'chat', ttlMs: 3200 });
        }
        interactTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'interact') resume(); }, 3400);
        return loc === 'en'
          ? `KuroWhale: nibbling a dried fish snack~ (${feedResult.stock} left)`
          : `KuroWhale：正在啃小鱼干～（剩余 ${feedResult.stock} 条）`;
      }
      if (kind === 'doze') {
        setState('dozing', 'interact', true);
        overlay?.fx?.({ kind: 'zzz' });
        showBubble({ text: line, tone: 'chat', ttlMs: 2600 });
        interactTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'interact') resume(); }, 22000);
        return loc === 'en' ? 'KuroWhale: taking a little nap…' : 'KuroWhale：靠着打个盹…';
      }
      if (kind === 'cheer') {
        setState('jumping', 'interact', true);
        overlay?.fx?.({ kind: 'sparkle', bounce: true });
        showBubble({ text: line, tone: 'chat', ttlMs: 2600 });
        interactTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'interact') resume(); }, 1600);
        return loc === 'en' ? 'KuroWhale: cheering you on~' : 'KuroWhale：元气满满为你加油～';
      }
      const fallbackText = pickClickLine(loc, clickCount++);
      setState(clickCount % 2 === 0 ? 'waving' : 'jumping', 'interact', true);
      showBubble({ text: fallbackText, tone: 'chat', ttlMs: 2600 });
      interactTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'interact') resume(); }, 1100);
    };
    const handleInteractionClick = () => handleInteraction('head-tap');

    const reopen = async () => {
      if (!overlayEnabled) throw Error('Experimental renderer is disabled');
      clearTimeout(frameTimer); clearTimeout(healthyTimer); stopPatrol();
      overlay?.destroy(); overlay = undefined; status.rendererReady = false;
      resources ??= await resourceResolver({
        directory, config, signal: abort.signal,
        onStage: stage => { status.stage = stage; snapshot(); },
        onAttempt: details => audit('download-error', details),
      });
      if (closed) return;
      const manifest = read(join(resources.assetDirectory, 'pet.json'), null);
      if (!manifest || basename(manifest.spritesheetPath ?? '') !== manifest.spritesheetPath || !manifest.spritesheetPath?.endsWith('.webp')) {
        throw Error('A local pet.json with a safe WebP filename is required');
      }
      try {
        const queried = await displayQuerier();
        if (Array.isArray(queried) && queried.length) currentDisplays = normalizeDisplays(queried);
      } catch {}
      if (closed) return;
      if (currentDisplays.length) {
        const layout = computeWindowLayout(scale);
        const resolved = resolveSafePosition({
          saved: { x, y, ...(positionAnchor ? { anchor: positionAnchor } : {}) },
          layout,
          displays: currentDisplays,
        });
        if (resolved.anchor) positionAnchor = resolved.anchor;
        if (resolved.healed) {
          x = resolved.x;
          y = resolved.y;
          persist();
          audit('display-healed', { trigger: 'startup', reason: resolved.reason, x, y, displayId: positionAnchor?.displayId });
        }
      }
      overlay = await overlayFactory({
        sheet: resolve(resources.assetDirectory, manifest.spritesheetPath),
        runtimePath: resources.runtimePath,
        scale, x, y, topmost, displays: currentDisplays, preferences: { ...preferences }, signal: abort.signal,
        onEvent: (event, data) => {
          if (closed) return;
          if (event === 'ready') {
            if (data.canvas) status.canvasLayout = data;
            if (data.bounds) screenBounds = data.bounds;
            if (Array.isArray(data.displays) && data.displays.length) {
              void healDisplayPosition(data.displays, 'ready');
            }
            void syncClickThrough(state);
            pushPanel();
          }
          if (event === 'displayChanged' && Array.isArray(data.displays)) {
            if (data.bounds) screenBounds = data.bounds;
            void healDisplayPosition(data.displays, 'display-changed');
          }
          if (event === 'overlayState') {
            overlayOpen = Boolean(data?.open);
            void syncClickThrough(state);
          }
          if (event === 'position' && Number.isFinite(data.x) && Number.isFinite(data.y)) {
            const moved = data.x !== x || data.y !== y;
            x = data.x; y = data.y;
            if (Array.isArray(data.displays) && data.displays.length) currentDisplays = normalizeDisplays(data.displays);
            if (source !== 'patrol' && moved) {
              refreshAnchor();
              persist();
            }
          }
          if (event === 'rendered-frame' && config.diagnostics === true) audit('frame', { row: data.row, index: data.index, renderTime: data.time });
          if (event === 'tray-ready') status.trayReady = true;
          if (event === 'tray-error') status.trayReady = false;
          if (event === 'drawn' && Number.isInteger(data.row) && Number.isInteger(data.index)) {
            const key = animations[data.row]?.[0];
            if (key) { if (!seen.has(key)) seen.set(key, new Set()); seen.get(key).add(data.index); }
          }
          if (event === 'dragMove' && !diagnostic) {
            stopPatrol();
            dragging = true;
            setState(data.direction === 'left' ? 'running-left' : 'running-right', 'drag');
          }
          if (event === 'dragEnd') {
            dragging = false;
            if (Number.isFinite(data.x) && Number.isFinite(data.y)) {
              x = data.x; y = data.y;
              if (Array.isArray(data.displays) && data.displays.length) currentDisplays = normalizeDisplays(data.displays);
              refreshAnchor();
              persist();
              audit('dragged', { x, y, displayId: positionAnchor?.displayId });
            }
            if (!diagnostic) resume();
          }
          if (event === 'hover' && !diagnostic && !dragging && state === 'idle') {
            stopPatrol();
            setState('jumping', 'hover');
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => { if (!diagnostic && !dragging && source === 'hover') resume(); }, 850);
          }
          if (event === 'unhover' && !diagnostic && !dragging && source === 'hover') resume();
          if (event === 'patrolDone') {
            if (Number.isFinite(data.x) && Number.isFinite(data.y)) { x = data.x; y = data.y; }
            if (!diagnostic && !dragging && source === 'patrol') resume();
          }
          if (event === 'interact') void handleInteraction(data.kind ?? 'head-tap');
          if (event === 'click') void handleInteractionClick();
          if (event === 'dblclick') void enqueue({ action: 'focus', id: crypto.randomUUID() }).catch(() => {});
          if (event === 'control') void enqueue({ ...data, id: crypto.randomUUID() }).catch(() => {});
          if (event === 'reportCardSave' || event === 'reportCardCopy') {
            void (async () => {
              try {
                const snap = statsTracker.snapshot();
                const savedPath = saveReportCardPng({
                  dataUrl: data?.dataUrl,
                  directory,
                  period: data?.period === 'week' ? 'week' : 'today',
                  dateKey: snap.today.date,
                  targetPath: data?.targetPath,
                });
                let copied = false;
                if (event === 'reportCardCopy') {
                  copied = await imageClipboardCopier(savedPath);
                }
                audit('report-card-exported', { kind: event, period: data?.period ?? 'today', copied });
                if (preferences.bubbles) {
                  const zh = event === 'reportCardCopy'
                    ? (copied ? '战报卡已复制到剪贴板！' : `战报已保存至 ${basename(savedPath)}`)
                    : `战报已保存：${basename(savedPath)}`;
                  const en = event === 'reportCardCopy'
                    ? (copied ? 'Report card copied to clipboard!' : `Saved report: ${basename(savedPath)}`)
                    : `Report saved: ${basename(savedPath)}`;
                  showBubble({ text: preferences.locale === 'en' ? en : zh, tone: 'review', ttlMs: 3000 });
                }
              } catch (err) {
                audit('report-card-error', { error: String(err?.message || err) });
              }
            })();
          }
          if (event === 'native-exited') {
            status.rendererReady = false; status.nativePid = null; overlay = undefined;
            status.lastError = 'Native window exited unexpectedly';
            clearTimeout(frameTimer); clearTimeout(healthyTimer); stopPatrol();
            audit('native-exited'); snapshot();
            scheduleAutoRestart();
          }
        },
      });
      if (closed) { overlay.destroy(); return; }
      status.rendererReady = true; status.nativePid = overlay.pid; status.lastError = null; status.stage = 'running';
      healthyTimer = setTimeout(() => { restartAttempts = 0; status.restartAttempts = 0; }, 30000);
      if (!visible || autoHidden) await overlay.hide();
      status.nativeWindow = await overlay.inspect();
      tick();
      pushPanel();
      if (visible && !autoHidden && state === 'idle') { schedulePatrol(); scheduleIdleHide(); }
      snapshot(); audit('renderer-ready', { nativePid: overlay.pid });
    };

    const command = async c => {
      if (closed) return;
      clearTimeout(cycleTimer);
      let note;
      switch (c.action) {
        case 'state': diagnostic = true; stopPatrol(); setState(c.value, 'diagnostic', true); break;
        case 'resume': resume(); break;
        case 'interact': note = await handleInteraction(c.kind ?? 'pet'); break;
        case 'all': {
          diagnostic = true; stopPatrol(); let i = 0;
          const advance = () => {
            if (closed) return;
            if (i === animations.length) { audit('diagnostic-cycle-complete'); resume(); return; }
            const [next, times] = animations[i++];
            setState(next, 'diagnostic');
            cycleTimer = setTimeout(advance, times.reduce((a, b) => a + b, 0) * 2 + 150);
          };
          audit('diagnostic-cycle-start'); advance(); break;
        }
        case 'hide': await setVisible(false); break;
        case 'show': await setVisible(true); break;
        case 'panel':
          if (!overlay || !status.rendererReady) await reopen();
          pushPanel();
          overlay.togglePanel?.(c.value);
          break;
        case 'approval-decide': {
          const outcome = c.outcome === 'allowed-once' ? 'allowed-once' : 'rejected';
          let target = c.approvalId ? liveRequests.get(c.approvalId) : null;
          if (!target && !c.approvalId) target = liveRequests.values().next().value;
          if (!target) throw Error('No interactive pending approval matches that id');
          liveRequests.delete(target.id);
          quickCountedApprovals.add(target.id);
          if (target.callId) quickCountedApprovals.add(target.callId);
          statsTracker.recordApproval(outcome, true);
          persistStats();
          target.resolve(outcome);
          audit('approval-quick-decided', { toolName: target.toolName, outcome });
          pushPanel();
          note = outcome === 'allowed-once'
            ? `KuroWhale: allowed "${target.toolName}" once.`
            : `KuroWhale: rejected "${target.toolName}".`;
          break;
        }
        case 'cancel-session': {
          let targetKey;
          if (c.alias) {
            for (const [k, a] of aliases) if (a === c.alias) { targetKey = k; break; }
          } else {
            for (const [k, v] of activities) {
              if (v === 'running' || approvals.get(k)?.size) { targetKey = k; break; }
            }
          }
          if (!targetKey) throw Error('No active session found to cancel');
          const agent = resolveAgentForKey(targetKey);
          if (!agent) throw Error(`Session "${alias(targetKey)}" does not expose cancellation`);
          await agent.cancel({ kind: 'user' });
          audit('session-cancelled', { session: alias(targetKey) });
          pushPanel();
          note = `KuroWhale: cancelled active turn for ${alias(targetKey)}.`;
          break;
        }
        case 'scale': {
          const value = c.relative ? scale + Number(c.value) : Number(c.value);
          if (!Number.isFinite(value) || value < 0.5 || value > 2) throw Error('Scale must be within 0.5..2');
          scale = Math.round(value * 4) / 4; persist();
          if (overlay && status.rendererReady && typeof overlay.resize === 'function') {
            await overlay.resize(scale);
            status.nativeWindow = await overlay.inspect();
          } else if (overlayEnabled && visible) {
            await reopen();
          }
          break;
        }
        case 'topmost':
          topmost = c.toggle ? !topmost : c.value !== false;
          persist();
          if (overlay) await overlay.topmost(topmost);
          snapshot();
          break;
        case 'center':
          if (!overlay || !status.rendererReady) await reopen();
          await overlay.center();
          refreshAnchor();
          persist();
          snapshot();
          break;
        case 'focus': {
          const focused = await hostFocuser();
          audit('focus-host', { trigger: 'command', focused });
          if (preferences.bubbles) {
            showBubble({ text: focused ? '已唤起 DSH 窗口' : '未找到可置前的 DSH 窗口', tone: 'chat', ttlMs: 2200 });
          }
          break;
        }
        case 'pref': {
          const key = c.key;
          if (!['bubbles', 'patrol', 'hideWhenIdle', 'clickThrough', 'sound', 'dndEnabled', 'toast', 'careReminders', 'quickApprove', 'locale'].includes(key)) {
            throw Error(`Unknown preference: ${key}`);
          }
          if (key === 'locale') {
            preferences.locale = c.value === 'en' ? 'en' : 'zh';
          } else {
            preferences[key] = c.toggle ? !preferences[key] : Boolean(c.value);
          }
          persist();
          overlay?.prefs?.({ ...preferences });
          if (key === 'bubbles' && !preferences.bubbles) overlay?.bubble?.({ clear: true });
          if (key === 'patrol') { if (preferences.patrol) schedulePatrol(); else stopPatrol(); }
          if (key === 'hideWhenIdle') {
            if (preferences.hideWhenIdle) scheduleIdleHide();
            else await wakeFromAutoHide();
          }
          if (key === 'clickThrough') {
            await syncClickThrough(state);
            if (preferences.bubbles) {
              const zhText = preferences.clickThrough ? '已开启专注穿透（托盘可随时关闭）' : '已关闭专注穿透';
              const enText = preferences.clickThrough ? 'Click-through enabled (toggle in tray)' : 'Click-through disabled';
              showBubble({ text: preferences.locale === 'en' ? enText : zhText, tone: 'chat', ttlMs: 2600 });
            }
          }
          if (key === 'careReminders' && preferences.careReminders) careMonitor.resetFocus();
          audit('preference', { key, value: preferences[key] });
          snapshot();
          break;
        }
        case 'dnd-range': {
          preferences.dndEnabled = true;
          preferences.dndStart = c.start;
          preferences.dndEnd = c.end;
          persist();
          overlay?.prefs?.({ ...preferences });
          audit('preference', { key: 'dndRange', start: c.start, end: c.end });
          snapshot();
          note = `KuroWhale: DND enabled (${c.start}-${c.end}).`;
          break;
        }
        case 'question-answer': {
          const target = c.questionId ? liveQuestionRequests.get(c.questionId) : liveQuestionRequests.values().next().value;
          if (!target) {
            await hostFocuser();
            note = 'Switched to DSH to answer question.';
            break;
          }
          liveQuestionRequests.delete(target.id);
          target.resolve(c.answer ?? '');
          audit('question-quick-answered', { id: target.id });
          pushPanel();
          if (!diagnostic && !dragging) resume();
          note = `KuroWhale: answered "${String(c.answer ?? '')}".`;
          break;
        }
        case 'plan-decide': {
          const outcome = c.outcome === 'approved' ? 'approved' : 'rejected';
          const target = c.planId ? livePlanRequests.get(c.planId) : livePlanRequests.values().next().value;
          if (!target) {
            await hostFocuser();
            note = 'Switched to DSH to review plan.';
            break;
          }
          livePlanRequests.delete(target.id);
          target.resolve(outcome);
          audit('plan-quick-decided', { id: target.id, outcome });
          pushPanel();
          if (!diagnostic && !dragging) resume();
          note = `KuroWhale: plan ${outcome}.`;
          break;
        }
        case 'export-report': {
          const period = c.period === 'week' ? 'week' : 'today';
          const snap = statsTracker.snapshot();
          const model = buildReportCardModel(snap, period, preferences.locale);
          if (overlay && status.rendererReady && typeof overlay.exportReportCard === 'function') {
            overlay.exportReportCard(model, c.mode ?? 'save');
            note = preferences.locale === 'en'
              ? `KuroWhale: generating ${period} Vibe Coding report card in overlay.`
              : `KuroWhale：正在生成${period === 'week' ? '本周' : '今日'} Vibe Coding 战报卡，请在浮卡内保存或复制。`;
          } else {
            note = `KuroWhale ${model.title} (${model.subtitle}): ` + model.metrics.map(m => `${m.label} ${m.value}`).join(' · ');
          }
          break;
        }
        case 'diagnostics': {
          if (!currentDisplays.length) {
            try {
              const queried = await displayQuerier();
              if (Array.isArray(queried) && queried.length) currentDisplays = normalizeDisplays(queried);
            } catch {}
          }
          const dshVersion = ctx?.app?.version ?? ctx?.config?.version ?? process.env.DSH_VERSION ?? 'unknown';
          const recentErrors = readRecentErrors(join(directory, 'lifecycle.jsonl'), 15, [directory]);
          const report = buildDiagnosticReport({
            status: buildSummary(),
            displays: currentDisplays,
            dshVersion,
            recentErrors,
            extraSecrets: [directory],
          });
          let copied = false;
          if (overlay && status.rendererReady && typeof overlay.copyClipboard === 'function') {
            try { await overlay.copyClipboard(report); copied = true; } catch {}
          }
          if (!copied) {
            try { copied = await clipboardCopier(report); } catch {}
          }
          audit('diagnostics-copied', { copied, length: report.length });
          if (preferences.bubbles) {
            showBubble({
              text: copied
                ? (preferences.locale === 'en' ? 'Redacted diagnostics copied' : '已复制脱敏诊断信息')
                : (preferences.locale === 'en' ? 'Diagnostics generated (clipboard unavailable)' : '已生成诊断信息（剪贴板不可用）'),
              tone: 'chat',
              ttlMs: 2600,
            });
          }
          note = copied ? report : `Diagnostics (clipboard unavailable):\n${report}`;
          break;
        }
        case 'bubble':
          showBubble({ text: String(c.value ?? ''), tone: c.tone ?? 'chat', ttlMs: Number.isFinite(c.ttlMs) ? c.ttlMs : 3000 });
          break;
        case 'close':
          visible = false; autoHidden = false; stopIdleHide(); stopPatrol(); clearTimeout(restartTimer);
          persist(); persistStats(); overlay?.destroy(); overlay = undefined; status.rendererReady = false; status.nativePid = null;
          clearTimeout(frameTimer); snapshot(); break;
        default: throw Error('Unknown local control action');
      }
      lastCommand = { id: c.id, action: c.action, ok: true }; snapshot();
      return note;
    };

    const enqueue = c => {
      const task = queue.then(() => command(c)).catch(error => {
        lastCommand = { id: c.id, action: c.action, ok: false, error: 'Local control action failed' };
        audit('control-error', { action: c.action, error: String(error.message || error) });
        snapshot();
        throw error;
      });
      queue = task.catch(() => {});
      return task;
    };

    const updateActivity = (key, next, meta = {}) => {
      clearTimeout(timeouts.get(key));
      activities.set(key, next);
      const prevDetail = details.get(key);
      if (meta.detail) details.set(key, meta.detail);
      if (meta.toolName) toolNames.set(key, meta.toolName);
      if (next === 'idle') toolNames.delete(key);
      if (next === 'review' || next === 'failed') {
        timeouts.set(key, setTimeout(() => {
          activities.set(key, 'idle');
          details.delete(key);
          toolNames.delete(key);
          if (!diagnostic && !dragging) resume();
        }, 2500));
      }
      if (!diagnostic && !dragging) resume(meta);
      if ((meta.detail && meta.detail !== prevDetail) || meta.toolName) {
        pushPanel();
        snapshot();
      }
    };

    const offEvent = ctx.on('session/event', (session, event) => {
      const type = event?.type; if (typeof type !== 'string') return;
      const key = session?.id ?? session?.sessionId ?? 'active-session';

      // Passive read-only token usage accounting from completed steps/messages.
      if (type === 'assistant/message' || type === 'step/end') {
        if (statsTracker.recordUsage(event.data?.usage)) {
          persistStats();
          pushPanel();
          snapshot();
        }
      }

      const next = activityState(type, event.data); if (!next) return;
      careMonitor.markActivity();
      const detail = activityDetail(type, event.data);
      const toolName = type === 'tool/call'
        ? (event.data?.name ?? event.data?.toolName ?? event.data?.tool?.name)
        : (type === 'approval/asked' ? event.data?.toolName : (type === 'command/run' ? 'command' : undefined));
      let newApproval = false;
      let durationMs;
      if (type === 'turn/start') {
        approvals.delete(key);
        pendingQuestions.delete(key);
        pendingPlans.delete(key);
        toolNames.delete(key);
        turnStarts.set(key, Date.now());
      }
      if (type === 'tool/call' || type === 'command/run') {
        statsTracker.recordToolCall(detail);
      }
      if (type === 'approval/asked') {
        if (!approvals.has(key)) approvals.set(key, new Map());
        const approvalId = event.data?.id ?? 'pending';
        if (!approvals.get(key).has(approvalId)) newApproval = true;
        approvals.get(key).set(approvalId, {
          id: approvalId,
          toolName: event.data?.toolName ?? 'tool',
          callId: event.data?.callId,
          reason: typeof event.data?.reason === 'string' ? event.data.reason : '',
        });
      }
      if (type === 'approval/decided') {
        const approvalId = event.data?.id ?? 'pending';
        const removed = approvals.get(key)?.get(approvalId);
        approvals.get(key)?.delete(approvalId);
        if (!quickCountedApprovals.delete(approvalId) && !(removed?.callId && quickCountedApprovals.delete(removed.callId))) {
          statsTracker.recordApproval(event.data?.outcome, false);
          persistStats();
        }
      }
      if (type === 'question/asked' || type === 'input/requested') {
        if (!pendingQuestions.has(key)) pendingQuestions.set(key, new Map());
        const qId = event.data?.id ?? 'question-pending';
        if (!pendingQuestions.get(key).has(qId)) newApproval = true;
        const rawOptions = Array.isArray(event.data?.options ?? event.data?.choices) ? (event.data.options ?? event.data.choices) : [];
        const options = rawOptions.slice(0, 4).map(opt => (typeof opt === 'string' ? opt : String(opt?.label ?? opt?.title ?? opt?.value ?? ''))).filter(Boolean);
        const promptText = event.data?.question ?? event.data?.prompt ?? event.data?.title ?? event.data?.text ?? '';
        pendingQuestions.get(key).set(qId, { id: qId, prompt: String(promptText), options });
      }
      if (type === 'question/answered' || type === 'input/resolved') {
        const qId = event.data?.id ?? 'question-pending';
        pendingQuestions.get(key)?.delete(qId);
      }
      if (type === 'plan/review' || type === 'plan/proposed') {
        if (!pendingPlans.has(key)) pendingPlans.set(key, new Map());
        const pId = event.data?.id ?? 'plan-pending';
        if (!pendingPlans.get(key).has(pId)) newApproval = true;
        const title = event.data?.title ?? event.data?.name ?? '';
        const summary = event.data?.summary ?? event.data?.reason ?? event.data?.description ?? '';
        pendingPlans.get(key).set(pId, { id: pId, title: String(title), summary: String(summary) });
      }
      if (type === 'plan/decided' || type === 'plan/approved' || type === 'plan/rejected') {
        const pId = event.data?.id ?? 'plan-pending';
        pendingPlans.get(key)?.delete(pId);
      }
      if (type === 'turn/end') {
        if (next !== 'waiting') {
          approvals.delete(key);
          pendingQuestions.delete(key);
          pendingPlans.delete(key);
        }
        const started = turnStarts.get(key);
        if (started) { durationMs = Date.now() - started; turnStarts.delete(key); }
        const reason = event.data?.reason?.kind ?? event.data?.reason;
        if (reason !== 'blocked') {
          statsTracker.recordTurnEnd(reason === 'completed');
          persistStats();
          if (reason === 'completed') pushPanel();
        }
      }
      eventCounts[type] = (eventCounts[type] ?? 0) + 1;
      if (type !== 'assistant/chunk' || eventCounts[type] === 1) {
        audit('agent-event', {
          type, mappedState: next, detail, session: alias(key),
          ...(type === 'turn/end' ? { reason: event.data?.reason?.kind ?? event.data?.reason, durationMs } : {}),
        });
      }
      updateActivity(key, next, { detail, toolName, durationMs, newApproval });
    }, { global: true });

    // Non-blocking approval waterfall race: always invokes next() so native DSH approval UI works
    // identically, while also letting the user approve/reject from KuroWhale's floating card.
    const offApprovalRequest = ctx.on('approval/request', (req, next) => {
      const hostPromise = Promise.resolve().then(() => (typeof next === 'function' ? next() : 'unavailable'));
      if (closed || !preferences.quickApprove || !req || typeof req !== 'object') return hostPromise;
      const sessionKey = req.agent?.session?.id ?? req.agent?.sessionId ?? req.agent?.id ?? 'active-session';
      if (req.agent && typeof req.agent.cancel === 'function') agentRefs.set(sessionKey, new WeakRef(req.agent));
      const reqId = `req-${crypto.randomUUID()}`;
      let resolvePet;
      const petPromise = new Promise(resolve => { resolvePet = resolve; });
      const entry = {
        id: reqId,
        sessionKey,
        toolName: typeof req.toolName === 'string' ? req.toolName : 'tool',
        callId: req.callId,
        reason: typeof req.reason === 'string' ? req.reason : '',
        resolve: resolvePet,
      };
      liveRequests.set(reqId, entry);
      if (!activities.has(sessionKey)) activities.set(sessionKey, 'waiting');
      if (!diagnostic && !dragging) resume({ newApproval: true });
      pushPanel();
      snapshot();

      const onAbort = () => {
        if (liveRequests.delete(reqId)) {
          resolvePet('cancelled');
          pushPanel();
          if (!diagnostic && !dragging) resume();
        }
      };
      req.signal?.addEventListener?.('abort', onAbort, { once: true });

      hostPromise.catch(() => {});
      return Promise.race([hostPromise, petPromise]).finally(() => {
        req.signal?.removeEventListener?.('abort', onAbort);
        if (liveRequests.delete(reqId)) {
          pushPanel();
          if (!closed && !diagnostic && !dragging) resume();
        }
      });
    }, { global: true, prepend: true });

    const offStatus = ctx.on('agent/status', ({ agent, status: agentStatus } = {}) => {
      const key = agent?.session?.id ?? agent?.sessionId ?? agent?.id;
      if (key && agent && typeof agent.cancel === 'function') agentRefs.set(key, new WeakRef(agent));
      if (agentStatus !== 'idle') return;
      if (key && activities.get(key) === 'running' && !approvals.get(key)?.size) {
        details.delete(key);
        toolNames.delete(key);
        turnStarts.delete(key);
        updateActivity(key, 'idle');
      }
    }, { global: true });

    const offDisposed = ctx.on('agent/disposed', ({ agent } = {}) => {
      const key = agent?.session?.id ?? agent?.id;
      if (!key) return;
      activities.delete(key); details.delete(key); toolNames.delete(key); approvals.delete(key);
      pendingQuestions.delete(key); pendingPlans.delete(key);
      turnStarts.delete(key); agentRefs.delete(key);
      clearTimeout(timeouts.get(key)); timeouts.delete(key);
      if (!diagnostic && !dragging) resume();
    }, { global: true });

    const offCommand = registerKuroWhaleCommand(ctx, {
      getSummary: buildSummary,
      runCommand: cmd => enqueue({ ...cmd, id: crypto.randomUUID() }),
    });

    audit('started', { mode: overlayEnabled ? 'experimental-overlay' : 'host-only' });
    console.info('[dsh-kurowhale-pet] host started; no DSH frontend modules');
    // Never replay the last diagnostic/control command after a restart.
    lastSeen = read(join(directory, 'control.json'), null)?.id;
    pollTimer = setInterval(() => {
      const c = read(join(directory, 'control.json'), null);
      if (!c?.id || c.id === lastCommand?.id || c.id === lastSeen) return;
      lastSeen = c.id;
      void enqueue(c).catch(() => {});
    }, 200);
    statusTimer = setInterval(snapshot, 1000);
    // Count companion minutes calmly every 60s so status.json stays idle-stable between events.
    companionTimer = setInterval(() => {
      if (closed || !visible || autoHidden) return;
      statsTracker.addCompanionSeconds(60);
      persistStats();
      pushPanel();
    }, 60_000);
    const startup = overlayEnabled
      ? reopen().catch(error => {
        if (closed) return;
        status.lastError = String(error.message || error);
        status.stage = 'error';
        audit('renderer-error', { error: status.lastError });
        snapshot();
      })
      : Promise.resolve();
    snapshot();

    return async () => {
      closed = true; abort.abort();
      clearInterval(pollTimer); clearInterval(statusTimer); clearInterval(companionTimer);
      clearTimeout(frameTimer); clearTimeout(cycleTimer); clearTimeout(hoverTimer);
      clearTimeout(clickTimer); clearTimeout(interactTimer); clearTimeout(restartTimer); clearTimeout(healthyTimer);
      stopPatrol(); stopIdleHide();
      for (const req of liveRequests.values()) req.resolve('cancelled');
      liveRequests.clear();
      for (const req of liveQuestionRequests.values()) req.resolve(null);
      liveQuestionRequests.clear();
      for (const req of livePlanRequests.values()) req.resolve('cancelled');
      livePlanRequests.clear();
      for (const t of timeouts.values()) clearTimeout(t);
      offEvent(); offApprovalRequest?.(); offStatus(); offDisposed(); offCommand();
      persistStats();
      await startup; overlay?.destroy();
      status.rendererReady = false; status.nativePid = null;
      snapshot(); audit('stopped');
    };
  });
}
