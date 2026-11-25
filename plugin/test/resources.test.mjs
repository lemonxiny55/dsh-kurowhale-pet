import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {download} from '../resources.js';
const hash = data => createHash('sha256').update(data).digest('hex');
const response = data => new Response(data);

test('retries transient failures with bounded attempts and succeeds', async()=>{
  let calls=0; const errors=[];
  const bytes=await download('https://example.test',hash('ok'),10,undefined,{backoffMs:1,onAttempt:e=>errors.push(e),fetch:async()=>{if(++calls<3)throw Error('offline');return response('ok');}});
  assert.equal(bytes.toString(),'ok');assert.equal(calls,3);assert.deepEqual(errors.map(e=>e.attempt),[1,2]);
});
test('falls back across configured mirrors while preserving SHA-256 verification', async () => {
  const seenUrls = [];
  const bytes = await download(
    ['https://primary.test/file', 'https://mirror.test/file'],
    hash('verified-payload'),
    100,
    undefined,
    {
      backoffMs: 1,
      fetch: async url => {
        seenUrls.push(url);
        if (url.includes('primary')) throw Error('blocked');
        return response('verified-payload');
      },
    },
  );
  assert.equal(bytes.toString(), 'verified-payload');
  assert.deepEqual(seenUrls, ['https://primary.test/file', 'https://mirror.test/file']);
});
test('rejects bad hashes after bounded retries',async()=>{
  let calls=0;
  await assert.rejects(download('https://example.test',hash('expected'),100,undefined,{backoffMs:1,fetch:async()=>{calls++;return response('bad');}}),/3 attempts.*SHA-256/);
  assert.equal(calls,3);
});
test('timeouts retry and cancellation stops immediately',async()=>{
  let calls=0;
  // AbortSignal.timeout() uses an unref'ed timer in Node 22. A pure unresolved
  // mock fetch may let the test runner exit before the abort event is delivered.
  // Keep a ref'ed mock watchdog so a missing abort fails instead of cancelling tests.
  const hanging=(_url,{signal})=>new Promise((_,reject)=>{
    calls++;
    const watchdog=setTimeout(()=>reject(Error('Mock fetch did not abort')),1000);
    signal.addEventListener('abort',()=>{clearTimeout(watchdog);reject(signal.reason);},{once:true});
  });
  await assert.rejects(download('https://example.test',hash('x'),10,undefined,{fetch:hanging,timeoutMs:5,backoffMs:1}),/3 attempts/);
  assert.equal(calls,3);
  const controller=new AbortController();controller.abort();
  await assert.rejects(download('https://example.test',hash('x'),10,controller.signal,{fetch:async(_u,{signal})=>{signal.throwIfAborted();}}));
});
import {mkdtemp, mkdir, writeFile, rm, copyFile} from 'node:fs/promises';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {artworkVersion, resolveResources, validAssets} from '../resources.js';

test('configured asset and runtime paths remain untouched and need no network',async()=>{
  const config={assetDirectory:'existing-assets',runtimePath:'existing-runtime'};
  assert.deepEqual(await resolveResources({directory:'unused',config,platform:'win32',arch:'x64',downloadOptions:{fetch:()=>{throw Error('unexpected download');}}}),config);
});
test('missing or corrupt asset cache triggers bounded download and reports failure',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'kurowhale-resources-'));
  try {
    const cache=join(dir,'assets',artworkVersion);await mkdir(cache,{recursive:true});
    assert.equal(await validAssets(cache),false);
    await writeFile(join(cache,'pet.json'),'corrupt');assert.equal(await validAssets(cache),false);
    const isolated=join(dir,'module');await mkdir(isolated);
    const source=join(isolated,'resources.mjs');await copyFile(fileURLToPath(new URL('../resources.js',import.meta.url)),source);
    const {resolveResources: resolveIsolated}=await import(pathToFileURL(source).href);
    let calls=0;const errors=[];
    await assert.rejects(resolveIsolated({directory:dir,config:{},platform:'win32',arch:'x64',onAttempt:e=>errors.push(e),downloadOptions:{backoffMs:1,fetch:async()=>{calls++;throw Error('offline');}}}),/3 attempts/);
    assert.equal(calls,3);assert.equal(errors.length,3);assert.equal(errors[0].resource,'artwork');
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('upgrades legacy v0.1.x stock assetDirectory to verified local v0.2.0 cache without network, leaving custom skins untouched',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'kurowhale-upgrade-art-'));
  try {
    const legacyDir=join(dir,'old-stock');await mkdir(legacyDir,{recursive:true});
    const customDir=join(dir,'custom-skin');await mkdir(customDir,{recursive:true});
    const cacheDir=join(dir,'assets',artworkVersion);await mkdir(cacheDir,{recursive:true});
    await writeFile(join(legacyDir,'spritesheet.webp'),'legacy-v01-sheet');
    await writeFile(join(customDir,'spritesheet.webp'),'custom-skin-sheet');
    await writeFile(join(cacheDir,'spritesheet.webp'),'v02-turnaround-sheet');
    const legacyHash=hash('legacy-v01-sheet');
    let cacheValid=true;
    const checkValidAssets=async candidate=>cacheValid&&candidate===cacheDir;
    const noFetch=()=>{throw Error('unexpected download');};

    const upgraded=await resolveResources({
      directory:dir,
      config:{assetDirectory:legacyDir,runtimePath:'existing-runtime'},
      platform:'win32',
      arch:'x64',
      downloadOptions:{fetch:noFetch},
      legacySheetHashes:[legacyHash],
      checkValidAssets,
    });
    assert.equal(upgraded.assetDirectory,cacheDir);

    const customKept=await resolveResources({
      directory:dir,
      config:{assetDirectory:customDir,runtimePath:'existing-runtime'},
      platform:'win32',
      arch:'x64',
      downloadOptions:{fetch:noFetch},
      legacySheetHashes:[legacyHash],
      checkValidAssets,
    });
    assert.equal(customKept.assetDirectory,customDir);

    cacheValid=false;
    const legacyKeptOffline=await resolveResources({
      directory:dir,
      config:{assetDirectory:legacyDir,runtimePath:'existing-runtime'},
      platform:'win32',
      arch:'x64',
      downloadOptions:{fetch:noFetch},
      legacySheetHashes:[legacyHash],
      checkValidAssets,
    });
    assert.equal(legacyKeptOffline.assetDirectory,legacyDir);
  } finally {await rm(dir,{recursive:true,force:true});}
});
