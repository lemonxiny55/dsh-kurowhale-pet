// Standalone Windows GUI reproduction. Does not install or configure DSH.
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';

const runtime=process.argv[2],stage=process.argv[3]??'opaque',seconds=Number(process.argv[4]??60);
const stages=['hidden','opaque','transparent','borderless','topmost','skip-taskbar'];
const rank=stages.indexOf(stage);
if(!runtime||rank<0||!Number.isFinite(seconds)||seconds<5||seconds>600){
  console.error('Usage: node scripts/probe-native-window.mjs <official-runtime.exe> <hidden|opaque|transparent|borderless|topmost|skip-taskbar> [seconds:5..600]');process.exit(1);
}
if(process.platform!=='win32')throw Error('Requires real Windows; not a simulated test');
const work=mkdtempSync(join(tmpdir(),'kurowhale-visible-'));
let child,ws,auth,closing=false;const pending=new Map();
const finish=()=>{
  if(closing)return;closing=true;
  try{ws?.close()}catch{}
  for(const p of pending.values())p.reject(Error('Probe closed'));pending.clear();
  if(child?.pid&&child.exitCode===null){try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true,timeout:8000})}catch{}}
  rmSync(work,{recursive:true,force:true,maxRetries:3,retryDelay:100});
};
process.once('SIGINT',()=>{finish();process.exit(130)});
process.once('SIGTERM',()=>{finish();process.exit(143)});
try{
  mkdirSync(join(work,'resources'));
  copyFileSync(fileURLToPath(new URL('../plugin/native/neutralino.js',import.meta.url)),join(work,'resources/neutralino.js'));
  writeFileSync(join(work,'resources/index.html'),`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:#ff00cc;color:#000;font:32px 'Segoe UI'}</style><div style="padding:24px">KuroWhale Test<br>${stage}</div><script src="neutralino.js"></script><script>Neutralino.init();</script>`);
  const window={title:'KuroWhale Test '+stage,width:400,height:400,center:true,transparent:rank>=2,borderless:rank>=3,alwaysOnTop:rank>=4,skipTaskbar:rank>=5,exitProcessOnClose:true,useSavedState:false,resizable:false,enableInspector:false};
  writeFileSync(join(work,'neutralino.config.json'),JSON.stringify({applicationId:'community.kurowhale.visibilitytest',defaultMode:'window',documentRoot:'/resources/',url:'/',enableServer:true,enableNativeAPI:true,enableExtensions:true,exportAuthInfo:true,extensions:[{id:'kwProbe'}],logging:{enabled:false,writeToLogFile:false},nativeAllowList:['window.*'],modes:{window}}));
  child=spawn(resolve(runtime),[`--path=${work}`,'--res-mode=directory'],{cwd:work,windowsHide:stage==='hidden',stdio:'ignore'});
  let spawnError;child.on('error',e=>{spawnError=e});
  for(let i=0;i<150;i++){
    if(spawnError)throw spawnError;
    if(child.exitCode!==null)throw Error('Runtime exited before readiness');
    try{auth=JSON.parse(readFileSync(join(work,'.tmp/auth_info.json'),'utf8'));if(auth.nlPort)break}catch{}
    await pause(100);
  }
  if(!auth)throw Error('Native readiness timeout');
  // Only this newly created window's temporary IPC capability, never DSH/model credentials.
  ws=new WebSocket(`ws://127.0.0.1:${auth.nlPort}?extensionId=kwProbe&connectToken=${auth.nlConnectToken}`);
  ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.data?.error?p.reject(Error('Native method failed')):p.resolve(m.data?.returnValue??m.data)}});
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Socket timeout')),8000);ws.addEventListener('open',()=>{clearTimeout(t);resolve()},{once:true});ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('Socket failed'))},{once:true})});
  const call=method=>new Promise((resolve,reject)=>{const id=crypto.randomUUID(),t=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'))},5000);pending.set(id,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}});ws.send(JSON.stringify({id,method,data:{},accessToken:auth.nlToken}))});
  await pause(1500);
  console.log(JSON.stringify({stage,windowsHide:stage==='hidden',pid:child.pid,configuredWindow:window,native:{visible:await call('window.isVisible'),position:await call('window.getPosition'),size:await call('window.getSize'),minimized:await call('window.isMinimized')},visualAcceptance:'NOT AUTOMATED: inspect the real desktop and save a screenshot separately'},null,2));
  await pause(seconds*1000);
}finally{finish()}
