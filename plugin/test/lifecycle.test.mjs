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

test('approval waterfall race, session cancel, token stats, and care reminder work end-to-end',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-v03-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;
  let cleanup,onEvent,sessionHandler,statusHandler,approvalHandler,registered;
  const panels=[],bubbles=[];let cancelled=0,nextInvoked=0;
  let fakeNow=new Date(2026,10,22,14,0,0);
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({patrol:false,careIntervalMs:60000}));
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    apply({
      effect:fn=>{cleanup=fn();},
      on:(ev,fn)=>{
        if(ev==='session/event')sessionHandler=fn;
        if(ev==='agent/status')statusHandler=fn;
        if(ev==='approval/request')approvalHandler=fn;
        return ()=>{};
      },
      commands:{register:def=>{registered=def;return ()=>{};}},
    },{
      nowFn:()=>fakeNow,
      resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),
      createOverlay:async options=>{
        onEvent=options.onEvent;
        return {pid:300,destroy(){},frame(){},bubble:b=>bubbles.push(b),panel:p=>panels.push(p),togglePanel(){},prefs(){},inspect:async()=>({visible:true}),hide:async()=>{},show:async()=>{}};
      },
    });
    await wait(40);
    const liveAgent={session:{id:'s-live'},cancel:async()=>{cancelled++;}};
    statusHandler({agent:liveAgent,status:'running'});
    sessionHandler({id:'s-live'},{type:'turn/start',data:{}});
    sessionHandler({id:'s-live'},{type:'tool/call',data:{name:'run_command'}});
    sessionHandler({id:'s-live'},{type:'assistant/message',data:{usage:{inputTokens:1500,outputTokens:500,cachedInputTokens:300}}});

    // Trigger approval waterfall where host next() stays pending while user clicks Allow in pet panel.
    const approvalOutcomePromise=approvalHandler(
      {agent:liveAgent,toolName:'run_command',callId:'c1',reason:'Run test suite'},
      ()=>{nextInvoked++;return new Promise(()=>{});},
    );
    await wait(30);
    assert.equal(nextInvoked,1,'native approval next() must always be called without blocking');
    const latestPanel=panels.at(-1);
    assert.equal(latestPanel.approvals.length,1);
    assert.equal(latestPanel.approvals[0].canDecide,true);
    assert.equal(latestPanel.approvals[0].toolName,'run_command');

    onEvent('control',{action:'approval-decide',approvalId:latestPanel.approvals[0].id,outcome:'allowed-once'});
    assert.equal(await approvalOutcomePromise,'allowed-once');

    // Cancel active turn via /kurowhale stop.
    const stopRes=await registered.handler({rawInput:'stop session-1'});
    assert.equal(stopRes.kind,'success');
    assert.equal(cancelled,1);

    // Complete turn, advance fake clock past careIntervalMs, verify stats & care reminder.
    sessionHandler({id:'s-live'},{type:'turn/end',data:{reason:{kind:'completed'}}});
    const statsRes=await registered.handler({rawInput:'stats'});
    assert.equal(statsRes.kind,'success');
    assert.match(statsRes.text,/完成 1 轮.*工具 1 次.*审批 1 次.*2\.0k/);

    fakeNow=new Date(2026,10,22,14,2,0);
    statusHandler({agent:liveAgent,status:'idle'});
    // Force transition from review -> idle after advancing time.
    await registered.handler({rawInput:'resume'});
    const savedStats=JSON.parse(await readFile(join(dir,'stats.json'),'utf8'));
    assert.equal(savedStats.today.tokens.total,2000);
    assert.equal(savedStats.today.approvalsQuickAllowed,1);
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('activates cleanly under strict Cordis proxy and resolves agents via ctx.get',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-cordis-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;
  let cleanup,sessionHandler,registered=null,effectCleanup=null,cancelled=0;
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({rendererEnabled:false}));
    const agentsMap=new Map([['s-get',{cancel:async()=>{cancelled++;}}]]);
    const cmdSvc={register:def=>{registered=def;return ()=>{registered=null;};}};
    const strictCtx={
      effect:fn=>{cleanup=fn();},
      on:(ev,fn)=>{if(ev==='session/event')sessionHandler=fn;return ()=>{};},
      get:name=>(name==='agents'?agentsMap:undefined),
      inject:(deps,cb)=>{
        assert.deepEqual(deps,['commands']);
        cb({get:name=>(name==='commands'?cmdSvc:undefined),effect:fn=>{effectCleanup=fn();}});
        return {dispose:()=>{effectCleanup?.();}};
      },
      get commands(){throw new Error('cannot get property "commands" without inject');},
      get agents(){throw new Error('cannot get property "agents" without inject');},
    };
    apply(strictCtx);
    await wait(30);
    assert.equal(registered?.name,'kurowhale');
    sessionHandler({id:'s-get'},{type:'turn/start',data:{}});
    const stopRes=await registered.handler({rawInput:'stop session-1'});
    assert.equal(stopRes.kind,'success');
    assert.equal(cancelled,1);
    await cleanup();cleanup=null;
    assert.equal(registered,null);
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('partitioned interact events and menu commands animate new poses and yield to agent work',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-interact-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;
  let cleanup,onEvent,sessionHandler,registered;
  const states=[],fxCalls=[];
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({patrol:false}));
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    apply({
      effect:fn=>{cleanup=fn();},
      on:(ev,fn)=>{if(ev==='session/event')sessionHandler=fn;return ()=>{};},
      commands:{register:def=>{registered=def;return ()=>{};}},
    },{
      resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),
      createOverlay:async options=>{
        onEvent=options.onEvent;
        return {pid:400,destroy(){},frame:d=>states.push(d.state),bubble(){},fx:f=>fxCalls.push(f),patrol(){},prefs(){},inspect:async()=>({visible:true}),hide:async()=>{},show:async()=>{}};
      },
    });
    await wait(40);
    onEvent('interact',{kind:'head-pat'});await wait(25);
    assert.equal(states.at(-1),'petted');
    assert.deepEqual(fxCalls.at(-1),{kind:'heart',bounce:true});

    onEvent('interact',{kind:'body-poke'});await wait(25);
    assert.equal(states.at(-1),'jumping');
    assert.deepEqual(fxCalls.at(-1),{kind:'sparkle',bounce:true});

    onEvent('interact',{kind:'dizzy'});await wait(25);
    assert.equal(states.at(-1),'failed');
    assert.deepEqual(fxCalls.at(-1),{kind:'dizzy',shake:true});

    await registered.handler({rawInput:'feed'});await wait(25);
    assert.equal(states.at(-1),'eating');
    await registered.handler({rawInput:'doze'});await wait(25);
    assert.equal(states.at(-1),'dozing');
    await registered.handler({rawInput:'cheer'});await wait(25);
    assert.equal(states.at(-1),'jumping');

    sessionHandler({id:'s1'},{type:'tool/call',data:{name:'bash'}});await wait(25);
    assert.equal(states.at(-1),'running');
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('autonomous idle routine automatically triggers eating, dozing, petted and other poses without consecutive repeats',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-autoidle-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;
  let cleanup,sessionHandler;
  const actionSeq=[];
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({patrol:true,patrolIntervalMs:25,patrolAutoAll:true,patrolActionDurationMs:25}));
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    let prevTracked='idle';
    apply({
      effect:fn=>{cleanup=fn();},
      on:(ev,fn)=>{if(ev==='session/event')sessionHandler=fn;return ()=>{};},
    },{
      resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),
      createOverlay:async()=>({
        pid:401,destroy(){},bubble(){},fx(){},prefs(){},inspect:async()=>({visible:true}),hide:async()=>{},show:async()=>{},
        patrol(){},
        frame:d=>{
          const kind=d.state==='running-left'||d.state==='running-right'?'walk':d.state;
          if(kind!==prevTracked){
            prevTracked=kind;
            if(kind!=='idle')actionSeq.push(kind);
          }
        },
      }),
    });
    await wait(520);
    assert.ok(actionSeq.length>=4,`expected >=4 autonomous actions, got ${JSON.stringify(actionSeq)}`);
    for(let i=1;i<actionSeq.length;i++){
      assert.notEqual(actionSeq[i],actionSeq[i-1],`consecutive autonomous action must not repeat: ${JSON.stringify(actionSeq)}`);
    }
    const allowed=new Set(['walk','eating','dozing','petted','jumping','waving']);
    assert.ok(actionSeq.every(k=>allowed.has(k)));
    assert.ok(new Set(actionSeq).size>=3,`expected >=3 distinct autonomous poses, got ${JSON.stringify(actionSeq)}`);

    sessionHandler({id:'s1'},{type:'tool/call',data:{name:'bash'}});await wait(25);
    const status=JSON.parse(await readFile(join(dir,'status.json'),'utf8'));
    assert.equal(status.state,'running');assert.equal(status.source,'agent');
    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});

test('smart click-through wakes on approval/failure, restores afterward, and diag copies redacted report',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-m1-'));const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;
  let cleanup,onEvent,sessionHandler,registered;
  const ctCalls=[],moved=[],copied=[];
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({patrol:false}));
    await writeFile(join(dir,'position.json'),JSON.stringify({x:5000,y:5000,scale:1.25,visible:true,topmost:true,clickThrough:true}));
    await writeFile(join(dir,'pet.json'),JSON.stringify({spritesheetPath:'spritesheet.webp'}));
    apply({
      effect:fn=>{cleanup=fn();},
      on:(ev,fn)=>{if(ev==='session/event')sessionHandler=fn;return ()=>{};},
      commands:{register:def=>{registered=def;return ()=>{};}},
    },{
      queryDisplays:async()=>[{id:'MAIN',primary:true,dpiScale:1.5,bounds:{x:0,y:0,w:1920,h:1080},workArea:{x:0,y:0,w:1920,h:1040}}],
      copyToClipboard:async text=>{copied.push(text);return true;},
      resolveResources:async()=>({assetDirectory:dir,runtimePath:'custom-runtime'}),
      createOverlay:async options=>{
        onEvent=options.onEvent;
        return {
          pid:501,destroy(){},frame(){},bubble(){},panel(){},prefs(){},
          move:p=>moved.push(p),
          setClickThrough:async(enabled,meta)=>{ctCalls.push({enabled,meta});return true;},
          inspect:async()=>({visible:true}),hide:async()=>{},show:async()=>{},
        };
      },
    });
    await wait(50);
    // Out-of-bounds 5000,5000 must have healed into primary 1920x1040.
    const posAfterHeal=JSON.parse(await readFile(join(dir,'position.json'),'utf8'));
    assert.ok(posAfterHeal.x<1920&&posAfterHeal.y<1040,'out-of-bounds startup position should heal');
    assert.equal(posAfterHeal.anchor.displayId,'MAIN');
    onEvent('ready',{bounds:{x:0,y:0,w:1920,h:1040}});
    await wait(25);
    assert.equal(ctCalls.at(-1).enabled,true,'click-through should start enabled in idle');

    // Waiting approval wakes click-through and highlights.
    sessionHandler({id:'s1'},{type:'approval/asked',data:{id:'ap-1',toolName:'bash'}});
    await wait(25);
    assert.equal(ctCalls.at(-1).enabled,false);
    assert.equal(ctCalls.at(-1).meta.suspended,true);
    assert.equal(ctCalls.at(-1).meta.highlight,'waiting');

    // Resolving approval restores click-through.
    sessionHandler({id:'s1'},{type:'approval/decided',data:{id:'ap-1'}});
    await wait(25);
    assert.equal(ctCalls.at(-1).enabled,true);
    assert.equal(ctCalls.at(-1).meta.suspended,false);

    // Diagnostics command copies redacted report without leaking temp DSH_HOME path.
    const diagRes=await registered.handler({rawInput:'diag'});
    assert.equal(diagRes.kind,'success');
    assert.equal(copied.length,1);
    assert.match(copied[0],/KuroWhale Diagnostic Report/);
    assert.doesNotMatch(copied[0],new RegExp(temp.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

    await cleanup();cleanup=null;
  }finally{if(cleanup)await cleanup();if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(temp,{recursive:true,force:true});}
});
