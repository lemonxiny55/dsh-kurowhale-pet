import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function redactText(input, extraSecrets = []) {
  let out = String(input ?? '');
  if (!out) return '';

  const envTargets = [
    homedir(),
    process.env.USERPROFILE,
    process.env.HOME,
    process.env.DSH_HOME,
    ...extraSecrets,
  ].filter(v => typeof v === 'string' && v.length >= 3);

  for (const target of envTargets) {
    const variants = new Set([
      target,
      target.replaceAll('\\', '/'),
      target.replaceAll('/', '\\'),
      target.replaceAll('\\', '\\\\'),
    ]);
    for (const v of variants) {
      out = out.replace(new RegExp(escapeRegex(v), 'gi'), '<USER_HOME>');
    }
  }

  for (const name of [process.env.USERNAME, process.env.USER, process.env.COMPUTERNAME]) {
    if (typeof name === 'string' && name.length >= 2) {
      out = out.replace(new RegExp(`\\\\{1,2}${escapeRegex(name)}(?=\\\\|/|$)`, 'gi'), '\\<USER>');
      out = out.replace(new RegExp(`/${escapeRegex(name)}(?=/|$)`, 'gi'), '/<USER>');
    }
  }

  out = out.replace(/[A-Za-z]:\\{1,2}Users\\{1,2}[^\\/\s"']+/gi, '<USER_HOME>');
  out = out.replace(/\/(?:Users|home)\/[^/\s"']+/g, '<USER_HOME>');
  out = out.replace(/\\"(nlToken|nlConnectToken|connectToken|accessToken|api[_-]?key|token|secret|password)\\"\s*:\s*\\"[^\\"]+\\"/gi, '\\"$1\\":\\"[REDACTED]\\"');
  out = out.replace(/\b(nlToken|nlConnectToken|connectToken|accessToken|api[_-]?key|token|secret|password)\b(\s*[:=]\s*["']?)[^\s"',}&\\]+/gi, '$1$2[REDACTED]');
  out = out.replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  out = out.replace(/\b(sk|ghp|gho|npm)_[A-Za-z0-9_-]{6,}\b/g, '$1_[REDACTED]');
  return out;
}

export function readRecentErrors(logPath, limit = 15, extraSecrets = []) {
  let raw = '';
  try { raw = readFileSync(logPath, 'utf8'); } catch { return []; }
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  const matches = [];
  for (let i = Math.max(0, lines.length - 160); i < lines.length; i++) {
    const line = lines[i];
    if (/error|exited|failed|healed|rollback/i.test(line)) {
      matches.push(redactText(line, extraSecrets));
    }
  }
  return matches.slice(-limit);
}

export function buildDiagnosticReport({
  status = {},
  displays = [],
  dshVersion = 'unknown',
  recentErrors = [],
  skin = null,
  now = new Date(),
  extraSecrets = [],
} = {}) {
  const displayLines = Array.isArray(displays) && displays.length
    ? displays.map((d, idx) => {
      const wa = d.workArea ?? d.bounds ?? {};
      return `  [${idx}] ${d.id}${d.primary ? ' (primary)' : ''} workArea=${wa.x},${wa.y} ${wa.w}x${wa.h} dpi=${d.dpiScale ?? 1}x`;
    })
    : ['  (none reported)'];

  const prefs = status.preferences ?? {};
  const lines = [
    `KuroWhale Diagnostic Report (${now.toISOString()})`,
    `Plugin: v${status.version ?? 'unknown'} | Stage: ${status.stage ?? 'unknown'} | State: ${status.state ?? 'idle'} (${status.source ?? 'agent'})`,
    `Host: DSH=${redactText(dshVersion, extraSecrets)} | Node=${process.version} | OS=${process.platform}/${process.arch}`,
    `Neutralino: ready=${Boolean(status.rendererReady)} | nativePid=${status.nativePid ?? 'none'} | tray=${Boolean(status.trayReady)} | restarts=${status.restartAttempts ?? 0}`,
    `Window: visible=${Boolean(status.visible)} | autoHidden=${Boolean(status.autoHidden)} | topmost=${Boolean(status.topmost)} | clickThrough=${Boolean(prefs.clickThrough)} (suspended=${Boolean(status.clickThroughSuspended)}) | pos=(${status.x ?? '?'}, ${status.y ?? '?'}) @ ${status.scale ?? '?'}x`,
    `Skin: ${skin ? redactText(`${skin.id ?? 'custom'} (${skin.mode ?? 'unknown'})`, extraSecrets) : 'default'}`,
    `LastError: ${status.lastError ? redactText(status.lastError, extraSecrets) : 'none'}`,
    'Displays:',
    ...displayLines.map(line => redactText(line, extraSecrets)),
    `RecentLogs (${recentErrors.length}):`,
    ...(recentErrors.length ? recentErrors.map(e => `  ${redactText(e, extraSecrets)}`) : ['  (no recent error events)']),
  ];
  return lines.join('\n');
}

export function copyTextToClipboard(text, platform = process.platform) {
  if (platform !== 'win32') return Promise.resolve(false);
  return new Promise(resolve => {
    const child = execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', '$inputText = [Console]::In.ReadToEnd(); Set-Clipboard -Value $inputText'],
      { windowsHide: true, timeout: 4000 },
      error => resolve(!error),
    );
    try {
      child.stdin.end(String(text ?? ''), 'utf8');
    } catch {
      resolve(false);
    }
  });
}
