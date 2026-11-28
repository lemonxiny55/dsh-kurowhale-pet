import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, normalize, resolve } from 'node:path';

export const EXPECTED_FRAME_WIDTH = 192;
export const EXPECTED_FRAME_HEIGHT = 208;
export const EXPECTED_COLUMNS = 8;
export const EXPECTED_SHEET_WIDTH = EXPECTED_FRAME_WIDTH * EXPECTED_COLUMNS; // 1536
export const MAX_SHEET_BYTES = 8 * 1024 * 1024;
export const MAX_SOUND_BYTES = 256 * 1024;
export const ALLOWED_SOUND_EXTS = new Set(['.wav', '.mp3', '.ogg', '.webm']);
const SAFE_ID_RE = /^[a-z0-9][a-z0-9_-]{1,47}$/;

export function isSafeRelativeAssetPath(rel) {
  if (typeof rel !== 'string' || !rel.trim()) return false;
  if (isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || rel.includes('\0')) return false;
  const norm = normalize(rel).replaceAll('\\', '/');
  if (!norm || norm === '.' || norm.startsWith('../') || norm.includes('/../') || norm.startsWith('/')) return false;
  return true;
}

export function parseWebpMetadata(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 30) {
    throw Error('File is too small to be a valid WebP image');
  }
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw Error('Invalid WebP RIFF header');
  }
  let offset = 12;
  let width = 0;
  let height = 0;
  let hasAlpha = false;
  let format = 'unknown';

  while (offset + 8 <= buf.length) {
    const fourcc = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > buf.length) break;

    if (fourcc === 'VP8X' && chunkSize >= 10) {
      const flags = buf[dataOffset];
      hasAlpha = (flags & 0x10) !== 0;
      width = 1 + (buf[dataOffset + 4] | (buf[dataOffset + 5] << 8) | (buf[dataOffset + 6] << 16));
      height = 1 + (buf[dataOffset + 7] | (buf[dataOffset + 8] << 8) | (buf[dataOffset + 9] << 16));
      format = 'VP8X';
      break;
    }
    if (fourcc === 'VP8L' && chunkSize >= 5 && buf[dataOffset] === 0x2f) {
      const bits = buf.readUInt32LE(dataOffset + 1);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
      hasAlpha = ((bits >> 28) & 1) === 1;
      format = 'VP8L';
      break;
    }
    if (fourcc === 'VP8 ' && chunkSize >= 10) {
      if (buf[dataOffset + 3] === 0x9d && buf[dataOffset + 4] === 0x01 && buf[dataOffset + 5] === 0x2a) {
        width = buf.readUInt16LE(dataOffset + 6) & 0x3fff;
        height = buf.readUInt16LE(dataOffset + 8) & 0x3fff;
        hasAlpha = false;
        format = 'VP8';
        break;
      }
    }
    if (fourcc === 'ALPH') {
      hasAlpha = true;
    }
    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  if (width <= 0 || height <= 0) {
    throw Error('Unable to parse WebP dimensions');
  }
  return { width, height, hasAlpha, format };
}

function readJsonSafe(filePath, label, errors) {
  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    errors.push(`Missing or unreadable ${label}`);
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push(`${label} must be a JSON object`);
      return null;
    }
    return parsed;
  } catch (err) {
    errors.push(`Invalid JSON in ${label}: ${err.message}`);
    return null;
  }
}

export function validateSkinDirectory(skinDir, { strict = false } = {}) {
  const errors = [];
  const warnings = [];
  if (typeof skinDir !== 'string' || !skinDir.trim()) {
    return { ok: false, errors: ['Skin directory path is required'], warnings };
  }
  const rootDir = resolve(skinDir);
  if (!existsSync(rootDir)) {
    return { ok: false, errors: [`Skin directory not found: ${rootDir}`], warnings };
  }
  try {
    if (!statSync(rootDir).isDirectory()) {
      return { ok: false, errors: [`Skin path is not a directory: ${rootDir}`], warnings };
    }
  } catch (err) {
    return { ok: false, errors: [`Cannot stat skin directory: ${err.message}`], warnings };
  }

  const manifestPath = join(rootDir, 'manifest.json');
  const hasManifest = existsSync(manifestPath);
  let manifest = null;
  if (hasManifest) {
    manifest = readJsonSafe(manifestPath, 'manifest.json', errors);
    if (manifest) {
      if (manifest.schemaVersion !== 1) errors.push('manifest.schemaVersion must be 1');
      if (typeof manifest.id !== 'string' || !SAFE_ID_RE.test(manifest.id)) {
        errors.push('manifest.id must match /^[a-z0-9][a-z0-9_-]{1,47}$/');
      }
      if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
        errors.push('manifest.name must be a non-empty string');
      }
      if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
        errors.push('manifest.version must be a non-empty string');
      }
      if (manifest.rows !== undefined && manifest.rows !== 9 && manifest.rows !== 12) {
        errors.push('manifest.rows must be 9 or 12');
      }
      if (manifest.columns !== undefined && manifest.columns !== EXPECTED_COLUMNS) {
        errors.push(`manifest.columns must be ${EXPECTED_COLUMNS}`);
      }
      if (manifest.frameWidth !== undefined && manifest.frameWidth !== EXPECTED_FRAME_WIDTH) {
        errors.push(`manifest.frameWidth must be ${EXPECTED_FRAME_WIDTH}`);
      }
      if (manifest.frameHeight !== undefined && manifest.frameHeight !== EXPECTED_FRAME_HEIGHT) {
        errors.push(`manifest.frameHeight must be ${EXPECTED_FRAME_HEIGHT}`);
      }
      if (manifest.pet !== undefined && !isSafeRelativeAssetPath(manifest.pet)) {
        errors.push('manifest.pet must be a safe relative path');
      }
      if (manifest.spritesheet !== undefined && !isSafeRelativeAssetPath(manifest.spritesheet)) {
        errors.push('manifest.spritesheet must be a safe relative path');
      }
    }
  } else if (strict) {
    errors.push('manifest.json is required in --strict mode');
  } else {
    warnings.push('No manifest.json found; validating in legacy skin compatibility mode');
  }

  const petRel = manifest?.pet ?? 'pet.json';
  const petPath = isSafeRelativeAssetPath(petRel) ? resolve(rootDir, petRel) : null;
  const pet = petPath ? readJsonSafe(petPath, petRel, errors) : null;

  let sheetRel = manifest?.spritesheet ?? pet?.spritesheetPath ?? 'spritesheet.webp';
  if (!isSafeRelativeAssetPath(sheetRel) || !sheetRel.toLowerCase().endsWith('.webp')) {
    errors.push('spritesheet path must be a safe relative .webp file');
    sheetRel = null;
  }
  if (pet && typeof pet.spritesheetPath === 'string' && !isSafeRelativeAssetPath(pet.spritesheetPath)) {
    errors.push('pet.json spritesheetPath must be a safe relative path');
  }

  let metadata = null;
  let sheetPath = null;
  if (sheetRel) {
    sheetPath = resolve(rootDir, sheetRel);
    if (!existsSync(sheetPath)) {
      errors.push(`Missing spritesheet file: ${sheetRel}`);
    } else {
      try {
        const st = statSync(sheetPath);
        if (!st.isFile()) errors.push(`Spritesheet is not a file: ${sheetRel}`);
        else if (st.size > MAX_SHEET_BYTES) errors.push(`Spritesheet exceeds ${MAX_SHEET_BYTES} bytes limit`);
        else {
          const buf = readFileSync(sheetPath);
          metadata = parseWebpMetadata(buf);
          if (metadata.width !== EXPECTED_SHEET_WIDTH) {
            errors.push(`Spritesheet width must be ${EXPECTED_SHEET_WIDTH}px (8x${EXPECTED_FRAME_WIDTH}), got ${metadata.width}px`);
          }
          if (metadata.height < EXPECTED_FRAME_HEIGHT * 9 || metadata.height % EXPECTED_FRAME_HEIGHT !== 0) {
            errors.push(`Spritesheet height must be a multiple of ${EXPECTED_FRAME_HEIGHT}px and >= ${EXPECTED_FRAME_HEIGHT * 9}px, got ${metadata.height}px`);
          }
          const rows = metadata.height / EXPECTED_FRAME_HEIGHT;
          metadata.rows = rows;
          if (Number.isInteger(rows) && rows !== 9 && rows !== 12) {
            warnings.push(`Unusual atlas row count ${rows} (expected 9 or 12); rows >=12 will use standard indices`);
          }
          if (manifest?.rows && Number.isInteger(rows) && manifest.rows !== rows) {
            errors.push(`manifest.rows (${manifest.rows}) does not match spritesheet rows (${rows})`);
          }
          if (!metadata.hasAlpha) {
            errors.push('Spritesheet WebP must contain an alpha transparency channel');
          }
        }
      } catch (err) {
        errors.push(`Spritesheet validation failed: ${err.message}`);
      }
    }
  }

  const sounds = {};
  if (manifest?.sounds !== undefined) {
    if (!manifest.sounds || typeof manifest.sounds !== 'object' || Array.isArray(manifest.sounds)) {
      errors.push('manifest.sounds must be an object');
    } else {
      for (const tone of ['waiting', 'review', 'failed']) {
        const rel = manifest.sounds[tone];
        if (rel === undefined) continue;
        if (!isSafeRelativeAssetPath(rel) || !ALLOWED_SOUND_EXTS.has(extname(rel).toLowerCase())) {
          errors.push(`manifest.sounds.${tone} must be a safe relative .wav/.mp3/.ogg/.webm path`);
          continue;
        }
        const sPath = resolve(rootDir, rel);
        if (!existsSync(sPath)) {
          errors.push(`Missing sound file for ${tone}: ${rel}`);
          continue;
        }
        try {
          const st = statSync(sPath);
          if (!st.isFile() || st.size > MAX_SOUND_BYTES) {
            errors.push(`Sound file ${rel} must be <= ${MAX_SOUND_BYTES} bytes`);
            continue;
          }
          sounds[tone] = sPath;
        } catch (err) {
          errors.push(`Cannot read sound file ${rel}: ${err.message}`);
        }
      }
    }
  }

  const rowCount = metadata?.rows ?? (manifest?.rows ?? 9);
  const mode = hasManifest
    ? (rowCount >= 12 ? 'skin-pack-12row' : 'skin-pack-9row-compat')
    : (rowCount >= 12 ? 'legacy-12row' : 'legacy-9row-compat');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    mode,
    skinDir: rootDir,
    skinId: manifest?.id ?? pet?.id ?? 'custom-skin',
    skinName: manifest?.name ?? pet?.displayName ?? 'Custom Skin',
    manifest,
    pet,
    sheetPath,
    sounds,
    metadata,
  };
}
