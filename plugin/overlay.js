// Native Neutralino extension protocol. No DSH browser module imports.
import { spawn, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('./native/', import.meta.url));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function createOverlay(options) {
  if (process.platform !== 'win32') throw Error('This development build targets Windows only');
  if (!existsSync(options.runtimePath)) throw Error('Configure an existing official Neutralino 6.9.0 runtimePath');
  const work = mkdtempSync(join(tmpdir(), 'kurowhale-'));
  mkdirSync(join(work,'resources'));
  for (const name of ['index.html','neutralino.js']) copyFileSync(join(frontend,name),join(work,'resources',name));
  copyFileSync(options.sheet,join(work,'resources','atlas.webp'));
  const width = Math.round(192*options.scale), height = Math.ceil(208*options.scale/0.75);
  writeFileSync(join(work,'neutralino.config.json'),JSON.stringify({
    applicationId:'community.kurowhale.pet',defaultMode:'window',documentRoot:'/resources/',url:'/',
    enableServer:true,enableNativeAPI:true,enableExtensions:true,exportAuthInfo:true,
    extensions:[{id:'kurowhaleHost'}],logging:{enabled:false,writeToLogFile:false},
    nativeAllowList:['app.*','events.*','window.*'],
    modes:{window:{title:'KuroWhale · DSH',width,height,x:options.x,y:options.y,transparent:true,borderless:true,alwaysOnTop:options.topmost!==false,skipTaskbar:true,exitProcessOnClose:true,useSavedState:false,resizable:false,enableInspector:false}},
  }));
  // This is a GUI executable. On the tested Windows/WebView2 runtime,
  // windowsHide:true leaves the outer window visible but hides its web content.
  const child = spawn(options.runtimePath,[`--path=${work}`,'--res-mode=directory'],{cwd:work,stdio:['ignore','pipe','pipe'],windowsHide:false});
  child.stdout.resume();child.stderr.resume();
  let exited=false,closed=false,ws,auth;
  child.on('exit',()=>{exited=true;if(!closed)options.onEvent('native-exited',{});});
  child.on('error',()=>{exited=true;});
  const pending=new Map();
  const destroy=()=>{
    if(closed)return;closed=true;
    options.signal?.removeEventListener('abort',destroy);
    try{ws?.close();}catch{}
    for(const p of pending.values())p.reject(Error('Native window closed'));
    pending.clear();
    if(!exited&&child.pid){try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true,timeout:8000});}catch{}}
    try{rmSync(work,{recursive:true,force:true,maxRetries:2,retryDelay:100});}catch{}
  };
  options.signal?.addEventListener('abort',destroy,{once:true});
  try{
    const deadline=Date.now()+15000;
    while(Date.now()<deadline){
      if(closed||exited)throw Error('Native runtime exited before readiness');
      try{const a=JSON.parse(readFileSync(join(work,'.tmp/auth_info.json'),'utf8'));if(a.nlPort&&a.nlToken&&a.nlConnectToken){auth=a;break;}}catch{}
      await pause(100);
    }
    if(!auth)throw Error('Native runtime readiness timed out');
    // These are short-lived capabilities of this newly created window only.
    // They are never logged and are unrelated to DSH/model credentials.
    ws=new WebSocket(`ws://127.0.0.1:${auth.nlPort}?extensionId=kurowhaleHost&connectToken=${auth.nlConnectToken}`);
    const call=(method,data={})=>new Promise((resolve,reject)=>{
      if(closed||ws.readyState!==WebSocket.OPEN){reject(Error('Native connection not open'));return;}
      const id=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(Error(`Native call timed out: ${method}`));},5000);
      pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
      ws.send(JSON.stringify({id,method,data,accessToken:auth.nlToken}));
    });
    const broadcast=(event,data)=>call('app.broadcast',{event,data});
    let ready=false;let uiError;
    ws.addEventListener('message',e=>{
      let m;try{m=JSON.parse(String(e.data));}catch{return;}
      if(m.id&&pending.has(m.id)){
        const p=pending.get(m.id);pending.delete(m.id);
        if(m.data?.error)p.reject(Error('Native method failed'));else p.resolve(m.data?.returnValue??m.data);
      }
      if(m.event==='kw.ready')ready=true;
      if(m.event==='kw.error')uiError=Error('Native atlas decode or frontend initialization failed');
      if(m.event?.startsWith('kw.'))options.onEvent(m.event.slice(3),m.data??{});
    });
    await new Promise((resolve,reject)=>{
      const t=setTimeout(()=>reject(Error('Native websocket open timed out')),8000);
      ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});
      ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('Native websocket error'));},{once:true});
    });
    const until=Date.now()+15000;
    while(!ready&&Date.now()<until){
      if(closed||exited)throw Error('Native runtime closed during atlas initialization');
      if(uiError)throw uiError;
      await broadcast('kw.initialize',{width,height,scale:options.scale,x:options.x,y:options.y});
      await pause(150);
    }
    if(!ready)throw Error('Native atlas readiness timed out');
    return {pid:child.pid,destroy,
      frame: directive=>{void broadcast('kw.frame',directive).catch(()=>{});},
      show:()=>call('window.show'),hide:()=>call('window.hide'),
      topmost:enabled=>call('window.setAlwaysOnTop',{enabled}),
      inspect:async()=>({visible:await call('window.isVisible'),position:await call('window.getPosition'),size:await call('window.getSize'),minimized:await call('window.isMinimized')}),
    };
  }catch(error){destroy();throw error;}
}
