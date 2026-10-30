import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as wait} from 'node:timers/promises';
import {apply} from '../index.js';

// Structural safety checks only. These are not Desktop runtime qualification.
test('explicit opt-out is retained; stale controls do not replay; cleanup completes',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-unit-'));
  const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;
  let cleanup;
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({rendererEnabled:false,assetDirectory:'not-an-asset',runtimePath:'not-a-runtime'}));
    await writeFile(join(dir,'control.json'),JSON.stringify({id:'already-consumed',action:'all'}));
    apply({effect:fn=>{cleanup=fn();},on:()=>()=>{}});
    await wait(300);
    const status=JSON.parse(await readFile(join(dir,'status.json'),'utf8'));
    assert.equal(status.rendererReady,false);assert.equal(status.visibilityVerified,false);
    assert.equal(status.source,'agent');
    await cleanup();cleanup=null;
    const log=await readFile(join(dir,'lifecycle.jsonl'),'utf8');
    assert.match(log,/"mode":"host-only"/);assert.match(log,/"event":"stopped"/);
    assert.doesNotMatch(log,/diagnostic-cycle-start/);
  }finally{
    if(cleanup)await cleanup();
    if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;
    await rm(temp,{recursive:true,force:true});
  }
});

test('unexpected native exit preserves visibility and existing configuration',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-exit-'));
  const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;
  let cleanup, onEvent;
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    const config={assetDirectory:dir,runtimePath:'custom-runtime',scale:1.5};
    const position={x:42,y:81,scale:1.25,visible:true,topmost:false};
    await writeFile(join(dir,'local.json'),JSON.stringify(config));
    await writeFile(join(dir,'position.json'),JSON.stringify(position));
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    apply({effect:fn=>{cleanup=fn();},on:()=>()=>{}},{resolveResources:async()=>({assetDirectory:dir,runtimePath:config.runtimePath}),createOverlay:async options=>{onEvent=options.onEvent;return {pid:123,destroy(){},frame(){},inspect:async()=>({visible:true}),hide:async()=>{},show:async()=>{}};}});
    await wait(30);onEvent('native-exited',{});await wait(20);
    assert.deepEqual(JSON.parse(await readFile(join(dir,'position.json'),'utf8')),position);
    assert.deepEqual(JSON.parse(await readFile(join(dir,'local.json'),'utf8')),config);
    const status=JSON.parse(await readFile(join(dir,'status.json'),'utf8'));
    assert.equal(status.visible,true);assert.equal(status.rendererReady,false);assert.match(status.lastError,/exited/);
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('rotates lifecycle log and leaves unchanged status alone',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-log-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;let cleanup;
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);await writeFile(join(dir,'local.json'),JSON.stringify({rendererEnabled:false}));
    await writeFile(join(dir,'lifecycle.jsonl'),'x'.repeat(1024*1024));
    apply({effect:fn=>{cleanup=fn();},on:()=>()=>{}});
    assert.equal((await readFile(join(dir,'lifecycle.jsonl.1'))).length,1024*1024);
    const {stat}=await import('node:fs/promises');const before=(await stat(join(dir,'status.json'))).mtimeMs;
    await wait(1200);assert.equal((await stat(join(dir,'status.json'))).mtimeMs,before);
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('hidden startup reports the native window state after hiding',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-hidden-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;let cleanup,nativeVisible=true;
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);await writeFile(join(dir,'position.json'),JSON.stringify({x:42,y:81,scale:1.25,visible:false,topmost:true}));await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    apply({effect:fn=>{cleanup=fn();},on:()=>()=>{}},{resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),createOverlay:async()=>({pid:123,destroy(){},frame(){},inspect:async()=>({visible:nativeVisible}),hide:async()=>{nativeVisible=false;}})});
    await wait(50);const status=JSON.parse(await readFile(join(dir,'status.json'),'utf8'));
    assert.equal(status.rendererReady,true);assert.equal(status.visible,false);assert.equal(status.nativeWindow.visible,false);
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});
