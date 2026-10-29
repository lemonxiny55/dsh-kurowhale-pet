import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { animations, activityState, resolveActivities } from './animations.js';
import { createOverlay } from './overlay.js';

export const name = 'dsh-kurowhale-pet';
export const inject = [];
const version='0.1.0';
const read = (path, fallback) => {try{return JSON.parse(readFileSync(path,'utf8'));}catch{return fallback;}};

export function apply(ctx) {
  const directory=join(process.env.DSH_HOME||join(homedir(),'.dsh'),'kurowhale-pet');
  mkdirSync(directory,{recursive:true});
  const audit=(event,details={})=>{
    try{appendFileSync(join(directory,'lifecycle.jsonl'),JSON.stringify({time:new Date().toISOString(),event,version,pid:process.pid,...details})+'\n');}catch{}
  };
  ctx.effect(()=>{
    let closed=false,overlay,frameTimer,statusTimer,pollTimer,cycleTimer,hoverTimer,queue=Promise.resolve(),lastCommand,lastSeen;
    const abort=new AbortController();
    const config=read(join(directory,'local.json'),{});
    // Keep renderer activation explicit. IPC readiness is not visual acceptance.
    const overlayEnabled=config.rendererEnabled===true;
    const saved=read(join(directory,'position.json'),{});
    let scale=Number.isFinite(saved.scale)?saved.scale:(config.scale??1.25);
    scale=Math.max(.5,Math.min(2,scale));
    let x=saved.x??120,y=saved.y??120,visible=saved.visible!==false,topmost=saved.topmost!==false;
    let state='idle',source='agent',index=0,diagnostic=false,dragging=false;
    const activities=new Map(),approvals=new Map(),timeouts=new Map(),seen=new Map(),eventCounts={},aliases=new Map();
    const alias=key=>{if(!aliases.has(key))aliases.set(key,'session-'+(aliases.size+1));return aliases.get(key);};
    const status={version,hostPid:process.pid,rendererReady:false,visibilityVerified:false,nativePid:null,lastError:null};
    const atomic=(file,value)=>{
      const target=join(directory,file),tmp=target+'.tmp';
      try{writeFileSync(tmp,JSON.stringify(value,null,2));renameSync(tmp,target);}catch{}
    };
    const persist=()=>atomic('position.json',{x,y,scale,visible,topmost});
    const snapshot=()=>{
      atomic('status.json',{...status,state,source,visible,x,y,scale,topmost,lastCommand,
        sessions:[...activities].map(([key,value])=>({alias:alias(key),state:approvals.get(key)?.size?'waiting':value})),
        framesDrawn:Object.fromEntries([...seen].map(([k,v])=>[k,[...v].sort((a,b)=>a-b)])),eventCounts});
    };
    const tick=()=>{
      clearTimeout(frameTimer);
      if(closed||!overlay||!visible)return;
      const row=animations.findIndex(([s])=>s===state),times=animations[row][1];
      overlay.frame({state,row,index,trace:diagnostic&&config.diagnostics===true});index=(index+1)%times.length;
      frameTimer=setTimeout(tick,times[(index+times.length-1)%times.length]);
    };
    const setState=(next,origin,force=false)=>{
      if(!animations.some(([s])=>s===next))throw Error('Unknown animation');
      if(force||next!==state||origin!==source){state=next;source=origin;index=0;audit('state',{state,source});tick();snapshot();}
    };
    const resume=()=>{diagnostic=false;clearTimeout(cycleTimer);setState(resolveActivities([...activities].map(([key,value])=>approvals.get(key)?.size?'waiting':value)),'agent');};
    const setVisible=async value=>{
      if(value&&(!overlay||!status.rendererReady))await reopen();
      visible=value;persist();if(overlay){if(value)await overlay.show();else await overlay.hide();status.nativeWindow=await overlay.inspect();}tick();snapshot();audit(value?'shown':'hidden');
    };
    const reopen=async()=>{
      if(!overlayEnabled)throw Error('Experimental renderer is disabled');
      clearTimeout(frameTimer);overlay?.destroy();overlay=undefined;status.rendererReady=false;
      const manifest=read(join(config.assetDirectory??'','pet.json'),null);
      if(!manifest||basename(manifest.spritesheetPath??'')!==manifest.spritesheetPath||!manifest.spritesheetPath?.endsWith('.webp'))throw Error('A local pet.json with a safe WebP filename is required');
      overlay=await createOverlay({sheet:resolve(config.assetDirectory,manifest.spritesheetPath),runtimePath:config.runtimePath,scale,x,y,topmost,signal:abort.signal,onEvent:(event,data)=>{
        if(closed)return;
        if(event==='ready'&&data.canvas)status.canvasLayout=data;
        if(event==='position'&&Number.isFinite(data.x)&&Number.isFinite(data.y)){x=data.x;y=data.y;persist();}
        if(event==='rendered-frame'&&config.diagnostics===true)audit('frame',{row:data.row,index:data.index,renderTime:data.time});
        if(event==='tray-ready')status.trayReady=true;
        if(event==='tray-error')status.trayReady=false;
        if(event==='drawn'&&Number.isInteger(data.row)&&Number.isInteger(data.index)){
          const key=animations[data.row]?.[0];if(key){if(!seen.has(key))seen.set(key,new Set());seen.get(key).add(data.index);}
        }
        if(event==='dragMove'&&!diagnostic){dragging=true;setState(data.direction==='left'?'running-left':'running-right','drag');}
        if(event==='dragEnd'){dragging=false;if(Number.isFinite(data.x)&&Number.isFinite(data.y)){x=data.x;y=data.y;persist();audit('dragged',{x,y});}if(!diagnostic)resume();}
        if(event==='hover'&&!diagnostic&&!dragging&&state==='idle'){setState('jumping','hover');clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(!diagnostic&&!dragging)resume();},850);}
        if(event==='unhover'&&!diagnostic&&!dragging)resume();
        if(event==='control')enqueue({...data,id:crypto.randomUUID()});
        if(event==='native-exited'){status.rendererReady=false;status.nativePid=null;overlay=undefined;visible=false;persist();clearTimeout(frameTimer);audit('native-exited');snapshot();}
      }});
      if(closed){overlay.destroy();return;}
      status.rendererReady=true;status.nativePid=overlay.pid;status.lastError=null;
      status.nativeWindow=await overlay.inspect();
      if(!visible)await overlay.hide();tick();snapshot();audit('renderer-ready',{nativePid:overlay.pid});
    };
    const command=async c=>{
      if(closed)return;
      clearTimeout(cycleTimer);
      switch(c.action){
        case 'state':diagnostic=true;setState(c.value,'diagnostic',true);break;
        case 'resume':resume();break;
        case 'all':{
          diagnostic=true;let i=0;
          const advance=()=>{if(closed)return;if(i===animations.length){audit('diagnostic-cycle-complete');resume();return;}const [next,times]=animations[i++];setState(next,'diagnostic');cycleTimer=setTimeout(advance,times.reduce((a,b)=>a+b,0)*2+150);};
          audit('diagnostic-cycle-start');advance();break;
        }
        case 'hide':await setVisible(false);break;
        case 'show':await setVisible(true);break;
        case 'scale':{
          const value=c.relative?scale+Number(c.value):Number(c.value);
          if(!Number.isFinite(value)||value<.5||value>2)throw Error('Scale must be within 0.5..2');
          scale=Math.round(value*4)/4;persist();await reopen();break;
        }
        case 'topmost':topmost=c.value!==false;persist();if(overlay)await overlay.topmost(topmost);snapshot();break;
        case 'center':if(!overlay||!status.rendererReady)await reopen();await overlay.center();snapshot();break;
        case 'close':visible=false;persist();overlay?.destroy();overlay=undefined;status.rendererReady=false;status.nativePid=null;clearTimeout(frameTimer);snapshot();break;
        default:throw Error('Unknown local control action');
      }
      lastCommand={id:c.id,action:c.action,ok:true};snapshot();
    };
    const enqueue=c=>{
      queue=queue.then(()=>command(c)).catch(()=>{
        lastCommand={id:c.id,action:c.action,ok:false,error:'Local control action failed'};audit('control-error',{action:c.action});snapshot();
      });
    };
    const updateActivity=(key,next)=>{
      clearTimeout(timeouts.get(key));activities.set(key,next);
      if(next==='review'||next==='failed')timeouts.set(key,setTimeout(()=>{activities.set(key,'idle');if(!diagnostic&&!dragging)resume();},2000));
      if(!diagnostic&&!dragging)resume();
    };
    const offEvent=ctx.on('session/event',(session,event)=>{
      const type=event?.type;if(typeof type!=='string')return;
      const next=activityState(type,event.data);if(!next)return;
      const key=session?.id??session?.sessionId??'active-session';
      if(type==='turn/start')approvals.delete(key);
      if(type==='approval/asked'){if(!approvals.has(key))approvals.set(key,new Set());approvals.get(key).add(event.data?.id??'pending');}
      if(type==='approval/decided')approvals.get(key)?.delete(event.data?.id??'pending');
      if(type==='turn/end'&&next!=='waiting')approvals.delete(key);
      eventCounts[type]=(eventCounts[type]??0)+1;
      if(type!=='assistant/chunk'||eventCounts[type]===1)audit('agent-event',{type,mappedState:next,session:alias(key),...(type==='turn/end'?{reason:event.data?.reason?.kind??event.data?.reason}:{})});
      updateActivity(key,next);
    },{global:true});
    const offStatus=ctx.on('agent/status',({agent,status:agentStatus}={})=>{
      if(agentStatus!=='idle')return;
      const key=agent?.session?.id??agent?.sessionId??agent?.id;
      if(key&&activities.get(key)==='running'&&!approvals.get(key)?.size)updateActivity(key,'idle');
    },{global:true});
    const offDisposed=ctx.on('agent/disposed',({agent}={})=>{if(!agent?.id)return;activities.delete(agent.id);approvals.delete(agent.id);clearTimeout(timeouts.get(agent.id));timeouts.delete(agent.id);if(!diagnostic&&!dragging)resume();},{global:true});
    audit('started',{mode:overlayEnabled?'experimental-overlay':'host-only'});
    console.info('[dsh-kurowhale-pet] host started; no DSH frontend modules');
    // Never replay the last diagnostic/control command after a restart.
    lastSeen=read(join(directory,'control.json'),null)?.id;
    pollTimer=setInterval(()=>{
      const c=read(join(directory,'control.json'),null);if(!c?.id||c.id===lastCommand?.id||c.id===lastSeen)return;
      lastSeen=c.id;enqueue(c);
    },200);
    statusTimer=setInterval(snapshot,1000);
    const startup=overlayEnabled&&config.assetDirectory&&config.runtimePath?reopen().catch(()=>{status.lastError='Renderer startup failed; DSH remains available';audit('renderer-error');snapshot();}):Promise.resolve();
    snapshot();
    return async()=>{
      closed=true;abort.abort();clearInterval(pollTimer);clearInterval(statusTimer);clearTimeout(frameTimer);clearTimeout(cycleTimer);clearTimeout(hoverTimer);
      for(const t of timeouts.values())clearTimeout(t);offEvent();offStatus();offDisposed();
      await startup;overlay?.destroy();status.rendererReady=false;status.nativePid=null;snapshot();audit('stopped');
    };
  });
}
