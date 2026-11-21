import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { animations, activityState, activityDetail, resolveActivities, bubbleForState, pickClickLine } from './animations.js';
import { registerKuroWhaleCommand } from './commands.js';
import { createOverlay, focusHostWindow } from './overlay.js';
import { resolveResources } from './resources.js';

export const name = 'dsh-kurowhale-pet';
export const inject = [];

const read = (path, fallback) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };
const pkgVersion = read(new URL('./package.json', import.meta.url), null)?.version ?? '0.2.0';

export function apply(ctx, dependencies = {}) {
  const resourceResolver = dependencies.resolveResources ?? resolveResources;
  const overlayFactory = dependencies.createOverlay ?? createOverlay;
  const hostFocuser = dependencies.focusHostWindow ?? focusHostWindow;
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
    let clickTimer, patrolTimer, patrolStepTimer, idleHideTimer, restartTimer, healthyTimer;
    let queue = Promise.resolve(), lastCommand, lastSeen;
    const abort = new AbortController();
    const config = read(join(directory, 'local.json'), {});
    // Honor an explicit opt-out; fresh installs start automatically.
    const overlayEnabled = config.rendererEnabled !== false;
    let resources;
    const saved = read(join(directory, 'position.json'), {});
    let scale = Number.isFinite(saved.scale) ? saved.scale : (config.scale ?? 1.25);
    scale = Math.max(0.5, Math.min(2, scale));
    let x = saved.x ?? 120, y = saved.y ?? 120, visible = saved.visible !== false, topmost = saved.topmost !== false;
    const preferences = {
      bubbles: saved.bubbles ?? config.bubbles ?? true,
      patrol: saved.patrol ?? config.patrol ?? true,
      hideWhenIdle: saved.hideWhenIdle ?? config.hideWhenIdle ?? false,
      sound: saved.sound ?? config.sound ?? false,
      locale: saved.locale ?? config.locale ?? 'zh',
    };
    let autoHidden = false;
    let state = 'idle', source = 'agent', index = 0, diagnostic = false, dragging = false;
    let clickCount = 0, restartAttempts = 0, screenBounds = null;
    const activities = new Map(), details = new Map(), turnStarts = new Map();
    const approvals = new Map(), timeouts = new Map(), seen = new Map(), eventCounts = {}, aliases = new Map();
    const alias = key => { if (!aliases.has(key)) aliases.set(key, 'session-' + (aliases.size + 1)); return aliases.get(key); };
    const status = {
      version: pkgVersion, hostPid: process.pid, rendererReady: false, visibilityVerified: false,
      nativePid: null, lastError: null, stage: 'starting', restartAttempts: 0,
    };
    const atomic = (file, value) => {
      const target = join(directory, file), tmp = target + '.tmp';
      try { writeFileSync(tmp, JSON.stringify(value, null, 2)); renameSync(tmp, target); return true; } catch { return false; }
    };
    const persist = () => atomic('position.json', { x, y, scale, visible, topmost, ...preferences });
    const buildSummary = () => ({
      ...status, state, source, visible, autoHidden, x, y, scale, topmost, preferences: { ...preferences }, lastCommand,
      sessions: [...activities].map(([key, value]) => ({
        alias: alias(key),
        state: approvals.get(key)?.size ? 'waiting' : value,
        detail: details.get(key),
      })),
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

    const schedulePatrol = () => {
      stopPatrol();
      if (closed || !preferences.patrol || !visible || autoHidden || diagnostic || dragging || state !== 'idle' || !status.rendererReady) return;
      const base = Number.isFinite(config.patrolIntervalMs) ? Math.max(200, config.patrolIntervalMs) : 24000;
      const jitter = Number.isFinite(config.patrolIntervalMs) ? 0 : Math.floor(Math.random() * 12000);
      patrolTimer = setTimeout(() => {
        if (closed || !preferences.patrol || !visible || autoHidden || diagnostic || dragging || state !== 'idle' || !overlay || !status.rendererReady) return;
        const shouldWave = (!overlay.patrol && !overlay.move) || Math.random() < 0.3;
        if (shouldWave) {
          setState('waving', 'patrol');
          patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, 1300);
          return;
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
          const durationMs = 1350 + Math.floor(Math.random() * 750);
          overlay.patrol({ dir, distance, durationMs });
          patrolTimer = setTimeout(() => { if (!closed && source === 'patrol') resume(); }, durationMs + 900);
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
        }, 120);
      }, base + jitter);
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
        state = next; source = origin; index = 0;
        audit('state', { state, source });
        tick();
        if (state === 'idle' && origin === 'agent') {
          schedulePatrol();
          scheduleIdleHide();
        } else {
          stopIdleHide();
        }
        snapshot();
      }
    };

    const aggregateContext = () => {
      let activeCount = 0, waitingCount = 0, primaryDetail;
      for (const [key, value] of activities) {
        const eff = approvals.get(key)?.size ? 'waiting' : value;
        if (eff === 'waiting') waitingCount += Math.max(1, approvals.get(key)?.size ?? 1);
        if (eff === 'running') {
          activeCount++;
          if (!primaryDetail) primaryDetail = details.get(key);
        }
      }
      return { activeCount, waitingCount, primaryDetail };
    };

    const resume = (bubbleOptions) => {
      diagnostic = false;
      clearTimeout(cycleTimer);
      const effectiveStates = [...activities].map(([key, value]) => approvals.get(key)?.size ? 'waiting' : value);
      const next = resolveActivities(effectiveStates);
      const prevState = state;
      if (next !== 'idle') void wakeFromAutoHide();
      setState(next, 'agent');
      if (next === 'idle') {
        if (prevState === 'waiting') showBubble({ clear: true });
        return;
      }
      const { activeCount, waitingCount, primaryDetail } = aggregateContext();
      const bubble = bubbleForState({
        state: next,
        detail: bubbleOptions?.detail ?? primaryDetail,
        activeCount,
        waitingCount,
        durationMs: bubbleOptions?.durationMs,
        locale: preferences.locale,
      });
      if (bubble) showBubble(bubble);
      if (next === 'waiting' && (prevState !== 'waiting' || bubbleOptions?.newApproval) && preferences.sound) {
        overlay?.chime?.('waiting');
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

    const handleInteractionClick = async () => {
      if (closed || diagnostic || dragging) return;
      if (state === 'waiting') {
        const focused = await hostFocuser();
        audit('focus-host', { trigger: 'click-waiting', focused });
        showBubble({ text: focused ? '已为你切回 DSH 审批~' : '请切回 DSH 窗口处理审批哦', tone: 'waiting', ttlMs: 2500 });
        return;
      }
      if (state === 'running') {
        const { activeCount, primaryDetail } = aggregateContext();
        const b = bubbleForState({ state: 'running', detail: primaryDetail, activeCount, locale: preferences.locale });
        if (b) showBubble(b);
        return;
      }
      stopPatrol();
      const nextAnim = clickCount % 2 === 0 ? 'waving' : 'jumping';
      const line = pickClickLine(preferences.locale, clickCount++);
      setState(nextAnim, 'click', true);
      showBubble({ text: line, tone: 'chat', ttlMs: 2600 });
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { if (!closed && !diagnostic && !dragging && source === 'click') resume(); }, 1100);
    };

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
      overlay = await overlayFactory({
        sheet: resolve(resources.assetDirectory, manifest.spritesheetPath),
        runtimePath: resources.runtimePath,
        scale, x, y, topmost, preferences: { ...preferences }, signal: abort.signal,
        onEvent: (event, data) => {
          if (closed) return;
          if (event === 'ready') {
            if (data.canvas) status.canvasLayout = data;
            if (data.bounds) screenBounds = data.bounds;
          }
          if (event === 'position' && Number.isFinite(data.x) && Number.isFinite(data.y)) {
            x = data.x; y = data.y;
            if (source !== 'patrol') persist();
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
            if (Number.isFinite(data.x) && Number.isFinite(data.y)) { x = data.x; y = data.y; persist(); audit('dragged', { x, y }); }
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
          if (event === 'click') void handleInteractionClick();
          if (event === 'dblclick') void enqueue({ action: 'focus', id: crypto.randomUUID() }).catch(() => {});
          if (event === 'control') void enqueue({ ...data, id: crypto.randomUUID() }).catch(() => {});
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
      if (visible && !autoHidden && state === 'idle') { schedulePatrol(); scheduleIdleHide(); }
      snapshot(); audit('renderer-ready', { nativePid: overlay.pid });
    };

    const command = async c => {
      if (closed) return;
      clearTimeout(cycleTimer);
      switch (c.action) {
        case 'state': diagnostic = true; stopPatrol(); setState(c.value, 'diagnostic', true); break;
        case 'resume': resume(); break;
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
          snapshot();
          break;
        case 'focus': {
          const focused = await hostFocuser();
          audit('focus-host', { trigger: 'command', focused });
          if (preferences.bubbles) {
            showBubble({ text: focused ? '已唤起 DSH 窗口~' : '未找到可置前的 DSH 窗口', tone: 'chat', ttlMs: 2200 });
          }
          break;
        }
        case 'pref': {
          const key = c.key;
          if (!['bubbles', 'patrol', 'hideWhenIdle', 'sound', 'locale'].includes(key)) throw Error(`Unknown preference: ${key}`);
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
          audit('preference', { key, value: preferences[key] });
          snapshot();
          break;
        }
        case 'bubble':
          showBubble({ text: String(c.value ?? ''), tone: c.tone ?? 'chat', ttlMs: Number.isFinite(c.ttlMs) ? c.ttlMs : 3000 });
          break;
        case 'close':
          visible = false; autoHidden = false; stopIdleHide(); stopPatrol(); clearTimeout(restartTimer);
          persist(); overlay?.destroy(); overlay = undefined; status.rendererReady = false; status.nativePid = null;
          clearTimeout(frameTimer); snapshot(); break;
        default: throw Error('Unknown local control action');
      }
      lastCommand = { id: c.id, action: c.action, ok: true }; snapshot();
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
      if (next === 'review' || next === 'failed') {
        timeouts.set(key, setTimeout(() => {
          activities.set(key, 'idle');
          details.delete(key);
          if (!diagnostic && !dragging) resume();
        }, 2500));
      }
      if (!diagnostic && !dragging) resume(meta);
      if (meta.detail && meta.detail !== prevDetail) snapshot();
    };

    const offEvent = ctx.on('session/event', (session, event) => {
      const type = event?.type; if (typeof type !== 'string') return;
      const next = activityState(type, event.data); if (!next) return;
      const detail = activityDetail(type, event.data);
      const key = session?.id ?? session?.sessionId ?? 'active-session';
      let newApproval = false;
      let durationMs;
      if (type === 'turn/start') {
        approvals.delete(key);
        turnStarts.set(key, Date.now());
      }
      if (type === 'approval/asked') {
        if (!approvals.has(key)) approvals.set(key, new Set());
        const approvalId = event.data?.id ?? 'pending';
        if (!approvals.get(key).has(approvalId)) newApproval = true;
        approvals.get(key).add(approvalId);
      }
      if (type === 'approval/decided') approvals.get(key)?.delete(event.data?.id ?? 'pending');
      if (type === 'turn/end') {
        if (next !== 'waiting') approvals.delete(key);
        const started = turnStarts.get(key);
        if (started) { durationMs = Date.now() - started; turnStarts.delete(key); }
      }
      eventCounts[type] = (eventCounts[type] ?? 0) + 1;
      if (type !== 'assistant/chunk' || eventCounts[type] === 1) {
        audit('agent-event', {
          type, mappedState: next, detail, session: alias(key),
          ...(type === 'turn/end' ? { reason: event.data?.reason?.kind ?? event.data?.reason, durationMs } : {}),
        });
      }
      updateActivity(key, next, { detail, durationMs, newApproval });
    }, { global: true });

    const offStatus = ctx.on('agent/status', ({ agent, status: agentStatus } = {}) => {
      if (agentStatus !== 'idle') return;
      const key = agent?.session?.id ?? agent?.sessionId ?? agent?.id;
      if (key && activities.get(key) === 'running' && !approvals.get(key)?.size) {
        details.delete(key);
        turnStarts.delete(key);
        updateActivity(key, 'idle');
      }
    }, { global: true });

    const offDisposed = ctx.on('agent/disposed', ({ agent } = {}) => {
      if (!agent?.id) return;
      activities.delete(agent.id); details.delete(agent.id); approvals.delete(agent.id); turnStarts.delete(agent.id);
      clearTimeout(timeouts.get(agent.id)); timeouts.delete(agent.id);
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
      clearInterval(pollTimer); clearInterval(statusTimer); clearTimeout(frameTimer);
      clearTimeout(cycleTimer); clearTimeout(hoverTimer); clearTimeout(clickTimer);
      clearTimeout(restartTimer); clearTimeout(healthyTimer);
      stopPatrol(); stopIdleHide();
      for (const t of timeouts.values()) clearTimeout(t);
      offEvent(); offStatus(); offDisposed(); offCommand();
      await startup; overlay?.destroy();
      status.rendererReady = false; status.nativePid = null;
      snapshot(); audit('stopped');
    };
  });
}
