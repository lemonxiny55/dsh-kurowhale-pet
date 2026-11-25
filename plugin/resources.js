import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
// Artwork release pin: update version, archive URL and both file hashes together.
export const artworkVersion = '0.3.0';
const npmUrls = [
  'https://registry.npmjs.org/dsh-kurowhale-pet/-/dsh-kurowhale-pet-0.3.0.tgz',
  'https://registry.npmmirror.com/dsh-kurowhale-pet/-/dsh-kurowhale-pet-0.3.0.tgz',
];
const npmHash = null; // Per-file SHA-256 is strictly enforced in extractAssets() to avoid self-referential tarball pin.
const archiveUrls = [
  'https://github.com/neutralinojs/neutralinojs/releases/download/v6.9.0/neutralinojs-v6.9.0.zip',
  'https://ghfast.top/https://github.com/neutralinojs/neutralinojs/releases/download/v6.9.0/neutralinojs-v6.9.0.zip',
  'https://gh-proxy.com/https://github.com/neutralinojs/neutralinojs/releases/download/v6.9.0/neutralinojs-v6.9.0.zip',
];
const archiveHash = 'ff33dd68979cffc36e4e7e73d1bab4cbcdf2c036aad72ca32876fde51a32df14';
const exeHash = '0eecd0c7f6c955b441e586def6e89c27c295f144d6d9061dd358c3f3907ff3b3';
const assetHashes = {
  'pet.json': 'bfda441760349621dead38e95977c7612ecdcfce6473c366d72e3496343b0ae3',
  'spritesheet.webp': '5657fcfba7240b215dfd847b3601ae2f7b84475072767d752ed32ab7243a2bd3',
};
// Legacy v0.1.x & v0.2.0 stock spritesheet SHA-256s; if a previous installer pinned one
// in local.json, prefer verified bundled/cached v0.3.0 extended artwork locally without network.
const legacyStockSheetHashes = [
  '7ae1e467778139d7da381fd860af6ebff3a3bd0385b69f9f0c278fbeb4d89298',
  '7ba604af016af7974af7cb093ce927c31c993b71566eb6500d523c52ce2969a9',
];
const digest = data => createHash('sha256').update(data).digest('hex');
const valid = async (path, hash) => { try { return digest(await readFile(path)) === hash; } catch { return false; } };

function sanitizeMirrors(defaults, extra) {
  const urls = [...defaults];
  if (Array.isArray(extra)) {
    for (const item of extra) {
      if (typeof item === 'string' && /^https:\/\//i.test(item) && !urls.includes(item)) urls.push(item);
    }
  }
  return urls;
}

export async function download(urlOrUrls, hash, max, signal, options = {}) {
  const sources = Array.isArray(urlOrUrls) ? urlOrUrls.filter(Boolean) : [urlOrUrls];
  if (!sources.length) throw Error('No download source configured');
  const attempts = options.attempts ?? Math.max(3, sources.length);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const url = sources[(attempt - 1) % sources.length];
    try {
      const timeout = AbortSignal.timeout(options.timeoutMs ?? 120000);
      const response = await (options.fetch ?? fetch)(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      if (!response.ok || !response.body) throw Error(`Download failed (HTTP ${response.status})`);
      const parts = [];
      let length = 0;
      for await (const chunk of response.body) {
        length += chunk.length;
        if (length > max) throw Error('Download exceeds size limit');
        parts.push(chunk);
      }
      const data = Buffer.concat(parts);
      if (hash && digest(data) !== hash) throw Error('Downloaded file failed SHA-256 verification');
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      options.onAttempt?.({ attempt, attempts, source: url, error: String(error.message || error) });
      if (attempt === attempts) throw new Error(`Download failed after ${attempts} attempts: ${error.message}`, { cause: error });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(done, (options.backoffMs ?? 1000) * 2 ** (attempt - 1));
        function done() { signal?.removeEventListener('abort', aborted); resolve(); }
        function aborted() { clearTimeout(timer); signal?.removeEventListener('abort', aborted); reject(signal.reason); }
        signal?.addEventListener('abort', aborted, { once: true });
        if (signal?.aborted) aborted();
      });
    }
  }
}

export async function validAssets(dir) {
  return (await Promise.all(Object.entries(assetHashes).map(([name, hash]) => valid(join(dir, name), hash)))).every(Boolean);
}

function extractAssets(tgz) {
  const tar = gunzipSync(tgz, { maxOutputLength: 8 * 1024 * 1024 });
  const found = {};
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (!header.some(Boolean)) break;
    const name = header.subarray(0, 100).toString().split('\0')[0];
    const sizeText = header.subarray(124, 136).toString().replace(/\0.*$/, '').trim();
    if (!/^[0-7]+$/.test(sizeText)) throw Error('Invalid asset archive');
    const size = parseInt(sizeText, 8);
    offset += 512;
    if (offset + size > tar.length) throw Error('Truncated asset archive');
    for (const item of Object.keys(assetHashes)) {
      if (name === `package/character/${item}` && (header[156] === 0 || header[156] === 48)) found[item] = tar.subarray(offset, offset + size);
    }
    offset += Math.ceil(size / 512) * 512;
  }
  for (const [name, hash] of Object.entries(assetHashes)) {
    if (!found[name] || digest(found[name]) !== hash) throw Error('Asset verification failed');
  }
  return found;
}

export async function downloadAssets(signal, options = {}) {
  const sources = sanitizeMirrors(npmUrls, options.mirrors);
  return extractAssets(await download(sources, npmHash, 4 * 1024 * 1024, signal, options));
}

export async function resolveResources({
  directory,
  config,
  signal,
  onAttempt,
  onStage,
  platform = process.platform,
  arch = process.arch,
  downloadOptions = {},
  legacySheetHashes = legacyStockSheetHashes,
  checkValidAssets = validAssets,
}) {
  if (platform !== 'win32' || arch !== 'x64') throw Error('Automatic setup requires Windows x64');
  const localCandidates = [
    fileURLToPath(new URL('../character/', import.meta.url)),
    fileURLToPath(new URL('./character/', import.meta.url)),
    join(directory, 'assets', artworkVersion),
  ];
  const pickLocalCandidate = async () => {
    for (const candidate of localCandidates) {
      if (await checkValidAssets(candidate)) return candidate;
    }
    return undefined;
  };
  let assetDirectory = config.assetDirectory;
  if (assetDirectory) {
    const sheetPath = join(assetDirectory, 'spritesheet.webp');
    const isLegacyStock = (await Promise.all(legacySheetHashes.map(h => valid(sheetPath, h)))).some(Boolean);
    if (isLegacyStock) assetDirectory = (await pickLocalCandidate()) ?? assetDirectory;
  } else {
    assetDirectory = await pickLocalCandidate();
    if (!assetDirectory) {
      onStage?.('downloading-artwork');
      const files = await downloadAssets(signal, {
        ...downloadOptions,
        mirrors: config.assetMirrors,
        onAttempt: details => onAttempt?.({ resource: 'artwork', ...details }),
      });
      assetDirectory = join(directory, 'assets', artworkVersion);
      await mkdir(assetDirectory, { recursive: true });
      for (const [name, data] of Object.entries(files)) {
        const target = join(assetDirectory, name);
        const tmp = `${target}.${randomUUID()}.tmp`;
        try {
          await writeFile(tmp, data, { flag: 'wx' });
          await rename(tmp, target);
        } finally {
          await rm(tmp, { force: true });
        }
      }
    }
  }
  let runtimePath = config.runtimePath;
  if (!runtimePath) {
    runtimePath = join(directory, 'runtime', 'neutralino-win_x64.exe');
    if (!await valid(runtimePath, exeHash)) {
      onStage?.('downloading-runtime');
      const runtimeSources = sanitizeMirrors(archiveUrls, config.runtimeMirrors);
      const bytes = await download(runtimeSources, archiveHash, 100 * 1024 * 1024, signal, {
        ...downloadOptions,
        onAttempt: details => onAttempt?.({ resource: 'neutralino', ...details }),
      });
      const runtimeDir = join(directory, 'runtime');
      await mkdir(runtimeDir, { recursive: true });
      const tmp = join(runtimeDir, randomUUID());
      const zip = `${tmp}.zip`;
      const exe = `${tmp}.exe`;
      try {
        await writeFile(zip, bytes, { flag: 'wx' });
        const script = `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead($env:KUROWHALE_ZIP); try { $e=@($z.Entries | Where-Object { $_.FullName -eq 'neutralino-win_x64.exe' }); if ($e.Count -ne 1) { throw 'Runtime archive entry missing or duplicated' }; $s=$e[0].Open(); try { $o=[IO.File]::Create($env:KUROWHALE_EXE); try { $s.CopyTo($o) } finally { $o.Dispose() } } finally { $s.Dispose() } } finally { $z.Dispose() }`;
        await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
          env: { ...process.env, KUROWHALE_ZIP: zip, KUROWHALE_EXE: exe },
          windowsHide: true,
          timeout: 30000,
          signal,
        });
        if (!await valid(exe, exeHash)) throw Error('Neutralino executable failed SHA-256 verification');
        await rename(exe, runtimePath);
      } finally {
        await rm(zip, { force: true });
        await rm(exe, { force: true });
      }
    }
  }
  onStage?.('ready');
  return { assetDirectory, runtimePath };
}
