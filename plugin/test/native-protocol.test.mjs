import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

// Broadcasts reach the sender as well as peers. This regression test catches
// a position acknowledgement feeding back into a second move command.
test('native broadcasts do not feed position or frame acknowledgements back into commands',async()=>{
 const html=await readFile(new URL('../native/index.html',import.meta.url),'utf8');
 const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 const listeners=new Map(),sent=[];let moves=0,draws=0;
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{style:{},getBoundingClientRect:()=>({width:160,height:232}),getContext:()=>({clearRect(){},drawImage(){draws++}})});return elements.get(id)};
 const dispatch=(name,data)=>listeners.get(name)?.({detail:data});
 const sandbox={console,Date,Math,Set,Promise,performance:{now:()=>100},devicePixelRatio:1.5,innerWidth:160,innerHeight:232,screen:{availLeft:0,availTop:0,availWidth:1707,availHeight:1020},document:{getElementById:element},setInterval:()=>0,
 Image:class{naturalWidth=1536;naturalHeight=1872;set src(_){queueMicrotask(()=>this.onload())}},
 Neutralino:{init:()=>Promise.resolve(),app:{exit:()=>Promise.resolve()},extensions:{getStats:async()=>({connected:['kurowhaleHost']})},os:{setTray:()=>Promise.resolve()},window:{move:async()=>{if(++moves>10)throw Error('Position feedback loop')},setSize:async()=>{}},events:{on:(n,fn)=>listeners.set(n,fn),broadcast:async(n,data)=>{sent.push({n,data});queueMicrotask(()=>dispatch(n,data))}}}};
 vm.runInNewContext(source,sandbox);
 await dispatch('kw.initialize',{width:240,height:347,x:120,y:120,scale:1.25,topmost:true});
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(moves,1,'one initialization must perform only one move');
 const beforeMoves=moves,beforeDraws=draws;
 await dispatch('kw.reposition',{x:400,y:300});
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(moves-beforeMoves,1,'one host reposition must not recurse');
 dispatch('kw.frame',{row:0,index:1,trace:true});
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(draws-beforeDraws,1,'one directive must not draw its own acknowledgement');
 assert.ok(sent.some(e=>e.n==='kw.rendered-frame'));
});
