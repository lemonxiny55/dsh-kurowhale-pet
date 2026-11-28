import { execFile } from 'node:child_process';

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeRect(raw, fallback) {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const x = Math.round(finite(raw.x ?? raw.left ?? raw.X, fallback.x));
  const y = Math.round(finite(raw.y ?? raw.top ?? raw.Y, fallback.y));
  const w = Math.max(1, Math.round(finite(raw.w ?? raw.width ?? raw.Width, fallback.w)));
  const h = Math.max(1, Math.round(finite(raw.h ?? raw.height ?? raw.Height, fallback.h)));
  return { x, y, w, h };
}

export function normalizeDisplays(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const normalized = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || typeof item !== 'object') continue;
    const rawBounds = item.bounds ?? item.resolution ?? item;
    const bounds = normalizeRect(rawBounds, { x: 0, y: 0, w: 1920, h: 1080 });
    const rawWork = item.workArea ?? item.workingArea ?? item.available ?? rawBounds;
    const workArea = normalizeRect(rawWork, bounds);
    const id = String(item.id ?? item.deviceName ?? item.name ?? `display-${i}`);
    const dpiScaleRaw = Number(item.dpiScale ?? item.scaleFactor ?? item.dpi ?? 1);
    const dpiScale = Number.isFinite(dpiScaleRaw) && dpiScaleRaw > 0
      ? Math.round((dpiScaleRaw > 10 ? dpiScaleRaw / 96 : dpiScaleRaw) * 100) / 100
      : 1;
    normalized.push({
      id,
      primary: Boolean(item.primary ?? item.isPrimary ?? (i === 0 && bounds.x === 0 && bounds.y === 0)),
      bounds,
      workArea,
      dpiScale,
    });
  }
  if (normalized.length > 0 && !normalized.some(d => d.primary)) {
    const origin = normalized.find(d => d.bounds.x === 0 && d.bounds.y === 0) ?? normalized[0];
    origin.primary = true;
  }
  return normalized;
}

export function defaultDisplayList() {
  return [{
    id: 'primary-fallback',
    primary: true,
    bounds: { x: 0, y: 0, w: 1920, h: 1080 },
    workArea: { x: 0, y: 0, w: 1920, h: 1040 },
    dpiScale: 1,
  }];
}

export function clampToWorkArea(pos, layout, workArea) {
  const w = Math.max(1, Math.round(finite(layout?.width, 248)));
  const h = Math.max(1, Math.round(finite(layout?.height, 360)));
  const wa = workArea ?? { x: 0, y: 0, w: 1920, h: 1040 };
  const maxX = wa.x + Math.max(0, wa.w - w);
  const maxY = wa.y + Math.max(0, wa.h - h);
  return {
    x: Math.round(Math.max(wa.x, Math.min(maxX, finite(pos?.x, wa.x)))),
    y: Math.round(Math.max(wa.y, Math.min(maxY, finite(pos?.y, wa.y)))),
  };
}

export function findDisplayForPosition(pos, layout, displays) {
  const list = normalizeDisplays(displays);
  if (!list.length) return defaultDisplayList()[0];
  const w = Math.max(1, Math.round(finite(layout?.width, 248)));
  const h = Math.max(1, Math.round(finite(layout?.height, 360)));
  const cx = finite(pos?.x, 0) + w / 2;
  const cy = finite(pos?.y, 0) + h / 2;
  const hit = list.find(d =>
    cx >= d.workArea.x && cx < d.workArea.x + d.workArea.w
    && cy >= d.workArea.y && cy < d.workArea.y + d.workArea.h
  ) ?? list.find(d =>
    cx >= d.bounds.x && cx < d.bounds.x + d.bounds.w
    && cy >= d.bounds.y && cy < d.bounds.y + d.bounds.h
  );
  if (hit) return hit;

  let best = list.find(d => d.primary) ?? list[0];
  let bestDist = Infinity;
  for (const d of list) {
    const dx = Math.max(d.workArea.x - cx, 0, cx - (d.workArea.x + d.workArea.w));
    const dy = Math.max(d.workArea.y - cy, 0, cy - (d.workArea.y + d.workArea.h));
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

export function isPositionVisible(pos, layout, displays, minOverlapRatio = 0.4) {
  if (!Number.isFinite(pos?.x) || !Number.isFinite(pos?.y)) return false;
  const list = normalizeDisplays(displays);
  if (!list.length) return true;
  const w = Math.max(1, Math.round(finite(layout?.width, 248)));
  const h = Math.max(1, Math.round(finite(layout?.height, 360)));
  const area = w * h;
  for (const d of list) {
    const wa = d.workArea;
    const ox = Math.max(0, Math.min(pos.x + w, wa.x + wa.w) - Math.max(pos.x, wa.x));
    const oy = Math.max(0, Math.min(pos.y + h, wa.y + wa.h) - Math.max(pos.y, wa.y));
    if ((ox * oy) / area >= minOverlapRatio) return true;
  }
  return false;
}

export function computeAnchor(pos, layout, displays) {
  const list = normalizeDisplays(displays);
  const target = findDisplayForPosition(pos, layout, list.length ? list : defaultDisplayList());
  const wa = target.workArea;
  const w = Math.max(1, Math.round(finite(layout?.width, 248)));
  const h = Math.max(1, Math.round(finite(layout?.height, 360)));
  const spanX = Math.max(1, wa.w - w);
  const spanY = Math.max(1, wa.h - h);
  const clamped = clampToWorkArea(pos, layout, wa);
  const relX = Math.max(0, Math.min(1, Number(((clamped.x - wa.x) / spanX).toFixed(4))));
  const relY = Math.max(0, Math.min(1, Number(((clamped.y - wa.y) / spanY).toFixed(4))));
  return {
    displayId: target.id,
    primary: target.primary,
    relX,
    relY,
    dpiScale: target.dpiScale,
    workArea: { ...wa },
  };
}

function positionFromAnchor(anchor, layout, display) {
  const wa = display.workArea;
  const w = Math.max(1, Math.round(finite(layout?.width, 248)));
  const h = Math.max(1, Math.round(finite(layout?.height, 360)));
  const spanX = Math.max(0, wa.w - w);
  const spanY = Math.max(0, wa.h - h);
  const relX = Math.max(0, Math.min(1, finite(anchor?.relX, 0.08)));
  const relY = Math.max(0, Math.min(1, finite(anchor?.relY, 0.12)));
  return clampToWorkArea({
    x: wa.x + Math.round(spanX * relX),
    y: wa.y + Math.round(spanY * relY),
  }, layout, wa);
}

export function resolveSafePosition({ saved = {}, layout, displays }) {
  const list = normalizeDisplays(displays);
  if (!list.length) {
    const fallbackPos = {
      x: Math.round(finite(saved?.x, 120)),
      y: Math.round(finite(saved?.y, 120)),
    };
    return { ...fallbackPos, anchor: saved?.anchor ?? null, healed: false, reason: 'no-displays' };
  }
  const primary = list.find(d => d.primary) ?? list[0];
  const anchor = saved?.anchor && typeof saved.anchor === 'object' ? saved.anchor : null;

  if (anchor?.displayId) {
    const matched = list.find(d => d.id === anchor.displayId);
    if (matched) {
      const next = positionFromAnchor(anchor, layout, matched);
      const changed = !Number.isFinite(saved?.x) || !Number.isFinite(saved?.y)
        || Math.abs(next.x - saved.x) > 2 || Math.abs(next.y - saved.y) > 2;
      return {
        ...next,
        anchor: computeAnchor(next, layout, list),
        healed: changed,
        reason: changed ? 'anchor-rescaled' : 'ok',
      };
    }
    const next = positionFromAnchor(anchor, layout, primary);
    return {
      ...next,
      anchor: computeAnchor(next, layout, list),
      healed: true,
      reason: 'display-unplugged',
    };
  }

  const rawPos = { x: Math.round(finite(saved?.x, 120)), y: Math.round(finite(saved?.y, 120)) };
  if (isPositionVisible(rawPos, layout, list)) {
    const owner = findDisplayForPosition(rawPos, layout, list);
    const safePos = clampToWorkArea(rawPos, layout, owner.workArea);
    const changed = Math.abs(safePos.x - rawPos.x) > 2 || Math.abs(safePos.y - rawPos.y) > 2;
    return {
      ...safePos,
      anchor: computeAnchor(safePos, layout, list),
      healed: changed,
      reason: changed ? 'clamped-to-workarea' : 'legacy-migrated',
    };
  }

  const safeFallback = clampToWorkArea({
    x: primary.workArea.x + 120,
    y: primary.workArea.y + 120,
  }, layout, primary.workArea);
  return {
    ...safeFallback,
    anchor: computeAnchor(safeFallback, layout, list),
    healed: true,
    reason: 'out-of-bounds',
  };
}

export function queryWindowsDisplays(platform = process.platform) {
  if (platform !== 'win32') return Promise.resolve([]);
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    'Add-Type -AssemblyName System.Windows.Forms',
    'Add-Type -AssemblyName System.Drawing',
    "$out = @([System.Windows.Forms.Screen]::AllScreens | ForEach-Object { $dpi = 96; try { $g = [System.Drawing.Graphics]::FromHwnd([IntPtr]::Zero); $dpi = [Math]::Round($g.DpiX); $g.Dispose() } catch {}; [pscustomobject]@{ id=$_.DeviceName; primary=$_.Primary; dpiScale=[Math]::Round($dpi/96,2); bounds=@{x=$_.Bounds.X;y=$_.Bounds.Y;w=$_.Bounds.Width;h=$_.Bounds.Height}; workArea=@{x=$_.WorkingArea.X;y=$_.WorkingArea.Y;w=$_.WorkingArea.Width;h=$_.WorkingArea.Height} } })",
    'ConvertTo-Json -InputObject $out -Compress',
  ].join('; ');
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 4000 }, (error, stdout) => {
      if (error || !stdout) { resolve([]); return; }
      try {
        const parsed = JSON.parse(String(stdout).trim());
        resolve(normalizeDisplays(Array.isArray(parsed) ? parsed : [parsed]));
      } catch {
        resolve([]);
      }
    });
  });
}
