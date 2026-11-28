// Native Neutralino extension protocol. No DSH browser module imports.
import { spawn, execFile, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('./native/', import.meta.url));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function computeWindowLayout(scale) {
  const safeScale = Math.max(0.5, Math.min(2, Number.isFinite(scale) ? scale : 1.25));
  const petWidth = Math.round(192 * safeScale);
  const petHeight = Math.round(208 * safeScale);
  const bubbleSpace = Math.round(64 * Math.max(0.95, Math.min(1.25, safeScale)));
  const width = Math.max(petWidth + 24, 248);
  // Keep both the speech bubble and character inside the top 75% to avoid
  // Neutralino's transparent bottom hit-test dead zone on Windows.
  const height = Math.ceil((bubbleSpace + petHeight) / 0.75);
  return { scale: safeScale, width, height, petWidth, petHeight, bubbleSpace };
}

export function focusHostWindow() {
  if (process.platform !== 'win32') return Promise.resolve(false);
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class KwWin { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow); }'",
    "$targets = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -and $_.MainWindowTitle -notmatch 'KuroWhale' -and ($_.ProcessName -match 'deepseek|dsh|electron' -or $_.MainWindowTitle -match 'DeepSeek|DSH') }",
    "$pick = $targets | Sort-Object @{Expression={$_.ProcessName -match 'deepseek|dsh'};Descending=$true}, StartTime -Descending | Select-Object -First 1",
    "if ($pick) { [KwWin]::ShowWindowAsync($pick.MainWindowHandle, 9) | Out-Null; [KwWin]::SetForegroundWindow($pick.MainWindowHandle) | Out-Null; Write-Output 'OK' }",
  ].join('; ');
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 4000 }, (error, stdout) => {
      resolve(!error && String(stdout).includes('OK'));
    });
  });
}

export function setWindowClickThrough(pid, enabled, platform = process.platform) {
  if (platform !== 'win32' || !Number.isInteger(pid) || pid <= 0) return Promise.resolve(false);
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class KwPass { public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam); [DllImport(\"user32.dll\")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam); [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId); [DllImport(\"user32.dll\")] public static extern bool IsWindowVisible(IntPtr hWnd); [DllImport(\"user32.dll\", EntryPoint=\"GetWindowLongPtrW\")] private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex); [DllImport(\"user32.dll\", EntryPoint=\"GetWindowLongW\")] private static extern int GetWindowLong32(IntPtr hWnd, int nIndex); [DllImport(\"user32.dll\", EntryPoint=\"SetWindowLongPtrW\")] private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong); [DllImport(\"user32.dll\", EntryPoint=\"SetWindowLongW\")] private static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong); public static long GetExStyle(IntPtr hWnd) { return IntPtr.Size == 8 ? GetWindowLongPtr64(hWnd, -20).ToInt64() : (long)GetWindowLong32(hWnd, -20); } public static void SetExStyle(IntPtr hWnd, long style) { if (IntPtr.Size == 8) SetWindowLongPtr64(hWnd, -20, new IntPtr(style)); else SetWindowLong32(hWnd, -20, (int)style); } }'",
    `$targetPid = [uint32]${pid}; $enable = ${enabled ? '$true' : '$false'}; $updated = 0`,
    '[KwWin]::EnumWindows({ param($hWnd, $lParam) return $true }, [IntPtr]::Zero) | Out-Null',
  ].join('; ');
  // Keep single self-contained P/Invoke class without depending on KwWin.
  void script;
  const cleanScript = [
    "$ErrorActionPreference='SilentlyContinue'",
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class KwPass { public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam); [DllImport(\"user32.dll\")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam); [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId); [DllImport(\"user32.dll\")] public static extern bool IsWindowVisible(IntPtr hWnd); [DllImport(\"user32.dll\", EntryPoint=\"GetWindowLongPtrW\")] private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex); [DllImport(\"user32.dll\", EntryPoint=\"GetWindowLongW\")] private static extern int GetWindowLong32(IntPtr hWnd, int nIndex); [DllImport(\"user32.dll\", EntryPoint=\"SetWindowLongPtrW\")] private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong); [DllImport(\"user32.dll\", EntryPoint=\"SetWindowLongW\")] private static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong); public static long GetExStyle(IntPtr hWnd) { return IntPtr.Size == 8 ? GetWindowLongPtr64(hWnd, -20).ToInt64() : (long)GetWindowLong32(hWnd, -20); } public static void SetExStyle(IntPtr hWnd, long style) { if (IntPtr.Size == 8) SetWindowLongPtr64(hWnd, -20, new IntPtr(style)); else SetWindowLong32(hWnd, -20, (int)style); } }'",
    `$targetPid = [uint32]${pid}; $enable = ${enabled ? '$true' : '$false'}; $updated = 0`,
    '$cb = [KwPass+EnumWindowsProc]{ param($hWnd, $lParam) [uint32]$winPid = 0; [KwPass]::GetWindowThreadProcessId($hWnd, [ref]$winPid) | Out-Null; if ($winPid -eq $targetPid -and [KwPass]::IsWindowVisible($hWnd)) { $style = [KwPass]::GetExStyle($hWnd); if ($enable) { $style = $style -bor 0x80000 -bor 0x20 } else { $style = $style -band (-bnot 0x20L) }; [KwPass]::SetExStyle($hWnd, $style) | Out-Null; $script:updated++ }; return $true }',
    '[KwPass]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null; if ($updated -gt 0) { Write-Output "OK" }',
  ].join('; ');
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cleanScript], { windowsHide: true, timeout: 4000 }, (error, stdout) => {
      resolve(!error && String(stdout).includes('OK'));
    });
  });
}

export async function createOverlay(options) {
  if (process.platform !== 'win32') throw Error('This development build targets Windows only');
  if (!existsSync(options.runtimePath)) throw Error('Configure an existing official Neutralino 6.9.0 runtimePath');
  const work = mkdtempSync(join(tmpdir(), 'kurowhale-'));
  mkdirSync(join(work, 'resources'));
  for (const name of ['index.html', 'neutralino.js', 'tray.png']) copyFileSync(join(frontend, name), join(work, 'resources', name));
  copyFileSync(options.sheet, join(work, 'resources', 'atlas.webp'));
  const layout = computeWindowLayout(options.scale);
  writeFileSync(join(work, 'neutralino.config.json'), JSON.stringify({
    applicationId: 'community.kurowhale.pet', defaultMode: 'window', documentRoot: '/resources/', url: '/',
    enableServer: true, enableNativeAPI: true, enableExtensions: true, exportAuthInfo: true,
    extensions: [{ id: 'kurowhaleHost' }], logging: { enabled: false, writeToLogFile: false },
    nativeAllowList: ['app.*', 'events.*', 'window.*', 'os.setTray', 'extensions.getStats', 'computer.getDisplays', 'clipboard.writeText'],
    modes: {
      window: {
        title: 'KuroWhale · DSH', width: layout.width, height: layout.height, x: options.x, y: options.y,
        transparent: true, borderless: true, alwaysOnTop: options.topmost !== false, skipTaskbar: true,
        exitProcessOnClose: true, useSavedState: false, resizable: false, enableInspector: false,
      },
    },
  }));
  // This is a GUI executable. On the tested Windows/WebView2 runtime,
  // windowsHide:true leaves the outer window visible but hides its web content.
  const child = spawn(options.runtimePath, [`--path=${work}`, '--res-mode=directory'], { cwd: work, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false });
  child.stdout.resume(); child.stderr.resume();
  let exited = false, closed = false, ws, auth;
  child.on('exit', () => { exited = true; if (!closed) { options.onEvent('native-exited', {}); destroy(); } });
  child.on('error', () => { exited = true; });
  const pending = new Map();
  const destroy = () => {
    if (closed) return; closed = true;
    options.signal?.removeEventListener('abort', destroy);
    try { ws?.close(); } catch {}
    for (const p of pending.values()) p.reject(Error('Native window closed'));
    pending.clear();
    if (!exited && child.pid) {
      try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 8000 }); } catch {}
    }
    try { rmSync(work, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }); } catch {}
  };
  options.signal?.addEventListener('abort', destroy, { once: true });
  try {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (closed || exited) throw Error('Native runtime exited before readiness');
      try {
        const a = JSON.parse(readFileSync(join(work, '.tmp/auth_info.json'), 'utf8'));
        if (a.nlPort && a.nlToken && a.nlConnectToken) { auth = a; break; }
      } catch {}
      await pause(100);
    }
    if (!auth) throw Error('Native runtime readiness timed out');
    // These are short-lived capabilities of this newly created window only.
    // They are never logged and are unrelated to DSH/model credentials.
    ws = new WebSocket(`ws://127.0.0.1:${auth.nlPort}?extensionId=kurowhaleHost&connectToken=${auth.nlConnectToken}`);
    const call = (method, data = {}) => new Promise((resolve, reject) => {
      if (closed || ws.readyState !== WebSocket.OPEN) { reject(Error('Native connection not open')); return; }
      const id = crypto.randomUUID();
      const timer = setTimeout(() => { pending.delete(id); reject(Error(`Native call timed out: ${method}`)); }, 5000);
      pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
      ws.send(JSON.stringify({ id, method, data, accessToken: auth.nlToken }));
    });
    const broadcast = (event, data) => call('app.broadcast', { event, data });
    let ready = false; let uiError;
    ws.addEventListener('message', e => {
      let m; try { m = JSON.parse(String(e.data)); } catch { return; }
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id);
        if (m.data?.error) p.reject(Error('Native method failed')); else p.resolve(m.data?.returnValue ?? m.data);
      }
      if (m.event === 'kw.ready') ready = true;
      if (m.event === 'kw.error') uiError = Error('Native atlas decode or frontend initialization failed');
      if (m.event?.startsWith('kw.')) options.onEvent(m.event.slice(3), m.data ?? {});
    });
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(Error('Native websocket open timed out')), 8000);
      ws.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
      ws.addEventListener('error', () => { clearTimeout(t); reject(Error('Native websocket error')); }, { once: true });
    });
    const until = Date.now() + 15000;
    while (!ready && Date.now() < until) {
      if (closed || exited) throw Error('Native runtime closed during atlas initialization');
      if (uiError) throw uiError;
      await broadcast('kw.initialize', {
        ...layout, x: options.x, y: options.y, topmost: options.topmost !== false,
        displays: options.displays ?? [],
        preferences: options.preferences ?? {},
      });
      await pause(150);
    }
    if (!ready) throw Error('Native atlas readiness timed out');
    if (options.preferences?.clickThrough) {
      await setWindowClickThrough(child.pid, true);
      void broadcast('kw.clickThrough', { enabled: true, suspended: false }).catch(() => {});
    }
    return {
      pid: child.pid,
      destroy,
      frame: directive => { void broadcast('kw.frame', directive).catch(() => {}); },
      bubble: payload => { void broadcast('kw.bubble', payload ?? { clear: true }).catch(() => {}); },
      panel: payload => { void broadcast('kw.panel', payload ?? {}).catch(() => {}); },
      togglePanel: open => { void broadcast('kw.togglePanel', { open }).catch(() => {}); },
      fx: data => { void broadcast('kw.fx', data ?? {}).catch(() => {}); },
      chime: tone => { void broadcast('kw.chime', { tone: tone ?? 'waiting' }).catch(() => {}); },
      prefs: preferences => { void broadcast('kw.prefs', preferences).catch(() => {}); },
      setClickThrough: async (enabled, meta = {}) => {
        const applied = await setWindowClickThrough(child.pid, Boolean(enabled));
        void broadcast('kw.clickThrough', { enabled: Boolean(enabled), ...meta }).catch(() => {});
        return applied;
      },
      copyClipboard: text => call('clipboard.writeText', { data: String(text ?? '') }),
      getDisplays: () => call('computer.getDisplays'),
      resize: async nextScale => {
        const nextLayout = computeWindowLayout(nextScale);
        await call('window.setSize', { width: nextLayout.width, height: nextLayout.height, resizable: false });
        await broadcast('kw.resize', nextLayout);
        return nextLayout;
      },
      move: position => { void broadcast('kw.reposition', position).catch(() => {}); },
      patrol: plan => { void broadcast('kw.patrol', plan).catch(() => {}); },
      stopPatrol: () => { void broadcast('kw.stopPatrol', {}).catch(() => {}); },
      show: () => call('window.show'),
      hide: () => call('window.hide'),
      topmost: async enabled => { await call('window.setAlwaysOnTop', { onTop: enabled }); await broadcast('kw.topmost', { enabled }); },
      center: async () => {
        await call('window.center');
        const position = await call('window.getPosition');
        await broadcast('kw.reposition', position);
        options.onEvent('position', position);
      },
      inspect: async () => ({
        visible: await call('window.isVisible'),
        position: await call('window.getPosition'),
        size: await call('window.getSize'),
        minimized: await call('window.isMinimized'),
      }),
    };
  } catch (error) { destroy(); throw error; }
}
