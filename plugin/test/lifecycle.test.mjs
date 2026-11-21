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

test('smooth scale resizes in-place without recreating overlay, and status version matches package.json',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-scale-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;let cleanup,overlayCreates=0,registered;const resizes=[];
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
    apply({effect:fn=>{cleanup=fn();},on:()=>()=>{},commands:{register:def=>{registered=def;return ()=>{};}}},
      {resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),
       createOverlay:async()=>{overlayCreates++;return {pid:123,destroy(){},frame(){},bubble(){},prefs(){},resize:async s=>{resizes.push(s);},inspect:async()=>({visible:true}),hide:async()=>{},show:async()=>{}};}});
    await wait(40);
    const result=await registered.handler({rawInput:'scale 1.5'});
    assert.equal(result.kind,'success');
    assert.equal(overlayCreates,1,'smooth scale should not restart native process');
    assert.deepEqual(resizes,[1.5]);
    const status=JSON.parse(await readFile(join(dir,'status.json'),'utf8'));
    assert.equal(status.version,pkg.version);
    assert.equal(status.scale,1.5);
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('bounded auto-restart recovers native window after unexpected exit',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-restart-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;let cleanup,onEvent,overlayCreates=0;
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    apply({effect:fn=>{cleanup=fn();},on:()=>()=>{}},
      {restartDelays:[40,80],resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),
       createOverlay:async options=>{overlayCreates++;onEvent=options.onEvent;return {pid:100+overlayCreates,destroy(){},frame(){},bubble(){},prefs(){},inspect:async()=>({visible:true}),hide:async()=>{},show:async()=>{}};}});
    await wait(30);assert.equal(overlayCreates,1);
    onEvent('native-exited',{});
    await wait(120);
    assert.equal(overlayCreates,2);
    const status=JSON.parse(await readFile(join(dir,'status.json'),'utf8'));
    assert.equal(status.rendererReady,true);assert.equal(status.nativePid,102);
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('click, waiting approval focus, bubbles, and hideWhenIdle wake work end-to-end',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-ux-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;let cleanup,onEvent,sessionHandler;
  const bubbles=[],chimes=[];let hiddenCount=0,shownCount=0,focusCount=0;
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({hideWhenIdle:true,idleHideDelayMs:60,sound:true,patrol:false}));
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    apply({effect:fn=>{cleanup=fn();},on:(ev,fn)=>{if(ev==='session/event')sessionHandler=fn;return ()=>{};}},
      {resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),
       focusHostWindow:async()=>{focusCount++;return true;},
       createOverlay:async options=>{onEvent=options.onEvent;return {pid:200,destroy(){},frame(){},bubble:b=>bubbles.push(b),chime:t=>chimes.push(t),prefs(){},inspect:async()=>({visible:true}),hide:async()=>{hiddenCount++;},show:async()=>{shownCount++;}};}});
    await wait(110);
    assert.ok(hiddenCount>=1,'hideWhenIdle should auto-hide idle pet');
    sessionHandler({id:'s1'},{type:'approval/asked',data:{id:'ap-1'}});
    await wait(40);
    assert.ok(shownCount>=1,'waiting approval should wake auto-hidden pet');
    assert.ok(chimes.includes('waiting'),'approval chime should trigger when sound enabled');
    assert.ok(bubbles.some(b=>b.tone==='waiting'&&b.sticky===true));
    onEvent('click',{});
    await wait(30);
    assert.equal(focusCount,1,'clicking while waiting should focus DSH window');
    sessionHandler({id:'s1'},{type:'approval/decided',data:{id:'ap-1'}});
    sessionHandler({id:'s1'},{type:'turn/end',data:{reason:{kind:'completed'}}});
    await wait(30);
    assert.ok(bubbles.some(b=>b.tone==='review'));
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('idle patrol animates during idle and yields immediately to agent activity',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-patrol-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;let cleanup,sessionHandler;
  const states=[];
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({patrol:true,patrolIntervalMs:200}));
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    apply({effect:fn=>{cleanup=fn();},on:(ev,fn)=>{if(ev==='session/event')sessionHandler=fn;return ()=>{};}},
      {resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),
       createOverlay:async()=>({pid:201,destroy(){},frame:d=>{states.push(d.state);},move(){},bubble(){},prefs(){},inspect:async()=>({visible:true}),hide:async()=>{},show:async()=>{}})});
    await wait(340);
    assert.ok(states.some(s=>s==='waving'||s==='running-left'||s==='running-right'),'patrol should animate idle pet');
    sessionHandler({id:'s1'},{type:'tool/call',data:{name:'bash'}});
    await wait(30);
    const status=JSON.parse(await readFile(join(dir,'status.json'),'utf8'));
    assert.equal(status.state,'running');assert.equal(status.source,'agent');
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});
