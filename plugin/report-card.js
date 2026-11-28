import { execFile } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { MILESTONE_DEFS, formatCompanionTime, formatTokens, summarizePeriod } from './stats.js';

export function buildReportCardModel(statsSnapshot, period = 'today', locale = 'zh') {
  const mode = period === 'week' ? 'week' : 'today';
  const en = locale === 'en';
  const summary = summarizePeriod(statsSnapshot, mode);
  const unlockedIds = statsSnapshot?.milestones?.unlocked ?? [];
  const badges = MILESTONE_DEFS
    .filter(def => unlockedIds.includes(def.id))
    .slice(0, 3)
    .map(def => (en ? def.en : def.zh));

  return {
    period: mode,
    locale: en ? 'en' : 'zh',
    title: mode === 'week'
      ? (en ? 'Vibe Coding Weekly Report' : 'Vibe Coding 本周陪伴战报')
      : (en ? 'Vibe Coding Daily Report' : 'Vibe Coding 今日陪伴战报'),
    subtitle: summary.dateLabel,
    brand: 'dsh-kurowhale-pet',
    streakDays: statsSnapshot?.streak?.currentDays ?? 1,
    fishStock: statsSnapshot?.fish?.stock ?? 0,
    badges,
    metrics: [
      {
        label: en ? 'Companion' : '陪伴时长',
        value: formatCompanionTime(summary.companionSec),
      },
      {
        label: en ? 'Turns' : '完成轮次',
        value: String(summary.turnsCompleted),
      },
      {
        label: en ? 'Tool Calls' : '工具调用',
        value: String(summary.toolCalls),
      },
      {
        label: en ? 'Approvals' : '审批处理',
        value: String(summary.approvalsHandled),
      },
      {
        label: en ? 'Tokens (RO)' : '只读 Token',
        value: summary.tokens?.total > 0 ? formatTokens(summary.tokens.total) : '0',
      },
      {
        label: en ? 'Fish Fed' : '喂鱼互动',
        value: `${summary.feeds} 🐟`,
      },
    ],
  };
}

export function decodePngDataUrl(dataUrlOrBase64) {
  const raw = String(dataUrlOrBase64 ?? '').trim();
  const base64 = raw.startsWith('data:image/png;base64,')
    ? raw.slice('data:image/png;base64,'.length)
    : raw;
  if (!base64 || base64.length > 8 * 1024 * 1024) {
    throw Error('Invalid or oversized PNG payload');
  }
  const bytes = Buffer.from(base64, 'base64');
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !sig.every((b, idx) => bytes[idx] === b)) {
    throw Error('Payload is not a valid PNG image');
  }
  return bytes;
}

export function saveReportCardPng({ dataUrl, directory, period = 'today', dateKey = 'today', targetPath } = {}) {
  const bytes = decodePngDataUrl(dataUrl);
  const safePeriod = period === 'week' ? 'week' : 'today';
  const safeDate = String(dateKey || 'today').replace(/[^0-9a-zA-Z_-]/g, '');
  const destination = targetPath
    ? resolve(targetPath)
    : join(directory, 'reports', `kurowhale-report-${safePeriod}-${safeDate}.png`);
  mkdirSync(dirname(destination), { recursive: true });
  const tmp = `${destination}.${Date.now()}.tmp`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, destination);
  return destination;
}

export function copyImageFileToClipboard(pngPath, platform = process.platform) {
  if (platform !== 'win32' || !pngPath) return Promise.resolve(false);
  const b64Path = Buffer.from(String(pngPath), 'utf8').toString('base64');
  const script = [
    "$ErrorActionPreference='Stop'",
    'Add-Type -AssemblyName System.Windows.Forms',
    'Add-Type -AssemblyName System.Drawing',
    `$p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64Path}'))`,
    '$img = [System.Drawing.Image]::FromFile($p)',
    'try { [System.Windows.Forms.Clipboard]::SetImage($img); Write-Output "OK" } finally { $img.Dispose() }',
  ].join('; ');
  return new Promise(resolvePromise => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-Command', script], { windowsHide: true, timeout: 6000 }, (error, stdout) => {
      resolvePromise(!error && String(stdout).includes('OK'));
    });
  });
}
