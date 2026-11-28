import { execFile } from 'node:child_process';

function parseClockMinutes(text) {
  if (typeof text !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
}

export function parseDndRange(raw) {
  if (typeof raw !== 'string') return null;
  const match = /^\s*(\d{1,2}:\d{2})\s*[-~～]\s*(\d{1,2}:\d{2})\s*$/.exec(raw);
  if (!match) return null;
  const startMin = parseClockMinutes(match[1]);
  const endMin = parseClockMinutes(match[2]);
  if (startMin === null || endMin === null) return null;
  const pad = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { start: pad(startMin), end: pad(endMin) };
}

export function isWithinDnd(nowDate = new Date(), { enabled = false, start = '23:00', end = '08:00' } = {}) {
  if (!enabled) return false;
  const startMin = parseClockMinutes(start);
  const endMin = parseClockMinutes(end);
  if (startMin === null || endMin === null || startMin === endMin) return false;
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  if (startMin < endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  return nowMin >= startMin || nowMin < endMin;
}

export function shouldTriggerAlert({
  enabled = true,
  dndEnabled = false,
  dndStart = '23:00',
  dndEnd = '08:00',
  now = new Date(),
} = {}) {
  if (!enabled) return false;
  return !isWithinDnd(now, { enabled: dndEnabled, start: dndStart, end: dndEnd });
}

export function isHostWindowFocused(platform = process.platform) {
  if (platform !== 'win32') return Promise.resolve(false);
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class KwFg { [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid); }'",
    '$h = [KwFg]::GetForegroundWindow(); if ($h -eq [IntPtr]::Zero) { Write-Output "NO"; exit }',
    '[uint32]$p = 0; [KwFg]::GetWindowThreadProcessId($h, [ref]$p) | Out-Null',
    '$proc = Get-Process -Id $p -ErrorAction SilentlyContinue',
    'if ($proc -and $proc.MainWindowTitle -notmatch "KuroWhale" -and ($proc.ProcessName -match "deepseek|dsh|electron" -or $proc.MainWindowTitle -match "DeepSeek|DSH")) { Write-Output "YES" } else { Write-Output "NO" }',
  ].join('; ');
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 3000 }, (error, stdout) => {
      resolve(!error && String(stdout).includes('YES'));
    });
  });
}

export function sendWindowsToast({
  title = 'KuroWhale · DSH',
  body = '',
  kind = 'waiting',
  onAction,
  platform = process.platform,
} = {}) {
  if (platform !== 'win32' || !body) return Promise.resolve(false);
  const titleB64 = Buffer.from(String(title), 'utf8').toString('base64');
  const bodyB64 = Buffer.from(String(body), 'utf8').toString('base64');
  const actionKind = kind === 'waiting' ? 'panel' : 'focus';
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    `$title = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${titleB64}'))`,
    `$body = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${bodyB64}'))`,
    '$esc = { param($s) [Security.SecurityElement]::Escape($s) }',
    '$shown = $false; $activated = $false',
    'try {',
    '  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
    '  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null',
    '  $xmlText = "<toast duration=`"short`"><visual><binding template=`"ToastGeneric`"><text>$(& $esc $title)</text><text>$(& $esc $body)</text></binding></visual></toast>"',
    '  $doc = New-Object Windows.Data.Xml.Dom.XmlDocument; $doc.LoadXml($xmlText)',
    '  $toast = [Windows.UI.Notifications.ToastNotification]::new($doc)',
    '  $done = [System.Threading.ManualResetEventSlim]::new($false)',
    '  $reg = Register-ObjectEvent -InputObject $toast -EventName Activated -Action { $script:activated = $true; $done.Set() }',
    '  $appIds = @("DeepSeek.Harness.Desktop", "com.deepseek.harness", "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe")',
    '  foreach ($id in $appIds) { try { [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($id).Show($toast); $shown = $true; break } catch {} }',
    '  if ($shown) { Write-Output "SHOWN"; [void]$done.Wait(12000) }',
    '  if ($reg) { Unregister-Event -SubscriptionId $reg.Id -ErrorAction SilentlyContinue }',
    '} catch {}',
    'if (-not $shown) {',
    '  Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing',
    '  $ni = New-Object System.Windows.Forms.NotifyIcon',
    '  $ni.Icon = [System.Drawing.SystemIcons]::Information; $ni.Visible = $true',
    '  $done2 = [System.Threading.ManualResetEventSlim]::new($false)',
    '  $ni.add_BalloonTipClicked({ $script:activated = $true; $done2.Set() })',
    '  $ni.ShowBalloonTip(5000, $title, $body, [System.Windows.Forms.ToolTipIcon]::Info)',
    '  Write-Output "SHOWN"',
    '  [void]$done2.Wait(7000); $ni.Visible = $false; $ni.Dispose()',
    '}',
    'if ($activated) { Write-Output "ACTIVATED" }',
  ].join('\n');

  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 16000 }, (error, stdout) => {
      const out = String(stdout ?? '');
      const shown = !error && out.includes('SHOWN');
      if (shown && out.includes('ACTIVATED') && typeof onAction === 'function') {
        try { onAction(actionKind); } catch {}
      }
      resolve(shown);
    });
  });
}
