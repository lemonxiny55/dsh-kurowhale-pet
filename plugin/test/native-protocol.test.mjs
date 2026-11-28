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

test('native frontend handles smooth resize and speech bubbles without loops',async()=>{
 const html=await readFile(new URL('../native/index.html',import.meta.url),'utf8');
 const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 const listeners=new Map(),sizes=[];let draws=0;
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{style:{},getBoundingClientRect:()=>({width:160,height:232}),getContext:()=>({clearRect(){},drawImage(){draws++}})});return elements.get(id)};
 const dispatch=(name,data)=>listeners.get(name)?.({detail:data});
 const sandbox={console,Date,Math,Set,Promise,Number,Boolean,performance:{now:()=>100},devicePixelRatio:1.5,innerWidth:160,innerHeight:232,screen:{availLeft:0,availTop:0,availWidth:1707,availHeight:1020},document:{getElementById:element},setInterval:()=>0,setTimeout:()=>0,clearTimeout:()=>{},
 Image:class{naturalWidth=1536;naturalHeight=1872;set src(_){queueMicrotask(()=>this.onload())}},
 Neutralino:{init:()=>Promise.resolve(),app:{exit:()=>Promise.resolve()},extensions:{getStats:async()=>({connected:['kurowhaleHost']})},os:{setTray:()=>Promise.resolve()},window:{move:async()=>{},setSize:async s=>{sizes.push({width:s.width,height:s.height})}},events:{on:(n,fn)=>listeners.set(n,fn),broadcast:async(n,data)=>{queueMicrotask(()=>dispatch(n,data))}}}};
 vm.runInNewContext(source,sandbox);
 await dispatch('kw.initialize',{width:240,height:438,petWidth:240,petHeight:260,bubbleSpace:68,x:120,y:120,scale:1.25,topmost:true});
 for(let i=0;i<20;i++)await Promise.resolve();
 const beforeDraws=draws;
 await dispatch('kw.resize',{width:288,height:504,petWidth:288,petHeight:312,bubbleSpace:68,scale:1.5});
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.deepEqual(sizes,[{width:288,height:504}]);
 assert.equal(elements.get('pet').width,288);
 assert.equal(draws-beforeDraws,1);
 dispatch('kw.bubble',{text:'Approval needed',tone:'waiting',sticky:true,clickable:true});
 assert.equal(elements.get('bubble').textContent,'Approval needed');
 assert.equal(elements.get('bubble').style.display,'block');
 dispatch('kw.bubble',{clear:true});
 assert.equal(elements.get('bubble').style.display,'none');
 dispatch('kw.panel',{state:'waiting',approvals:[{id:'req-1',toolName:'run_command',reason:'Run <test>',canDecide:true}],sessions:[{alias:'session-1',state:'waiting',toolName:'run_command',elapsedSec:12,canCancel:true}],stats:{companion:'15m',turns:3,tools:9,tokens:'8.2k'}});
 assert.match(elements.get('panelBody').innerHTML,/run_command/);
 assert.match(elements.get('panelBody').innerHTML,/Run &lt;test&gt;/,'reason must be HTML-escaped');
 assert.match(elements.get('panelBody').innerHTML,/允许一次/);
 assert.match(elements.get('panelBody').innerHTML,/8\.2k/);
 await dispatch('kw.togglePanel',{open:true});
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.ok(sizes.at(-1).width>288,'side drawer must expand window beside character');
 assert.equal(elements.get('stage').style.left,'0px');
 assert.notEqual(elements.get('panel').style.left,'0px');
 await dispatch('kw.togglePanel',{open:false});
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.deepEqual({width:sizes.at(-1).width,height:sizes.at(-1).height},{width:288,height:504});
 assert.equal(elements.get('panel').style.display,'none');
});

test('native frontend supports 12-row v0.3.0 atlas, 9-row skin fallback, and kw.fx particles',async()=>{
 const html=await readFile(new URL('../native/index.html',import.meta.url),'utf8');
 const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 const runCase=async naturalHeight=>{
  const listeners=new Map(),syList=[];
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{style:{},getBoundingClientRect:()=>({width:160,height:232}),getContext:()=>({clearRect(){},drawImage(_img,_sx,sy){syList.push(sy);}})});return elements.get(id);};
  const dispatch=(name,data)=>listeners.get(name)?.({detail:data});
  const sandbox={console,Date,Math,Set,Promise,Number,Boolean,performance:{now:()=>100},devicePixelRatio:1.5,innerWidth:160,innerHeight:232,screen:{availLeft:0,availTop:0,availWidth:1707,availHeight:1020},document:{getElementById:element},setInterval:()=>0,setTimeout:()=>0,clearTimeout:()=>{},
  Image:class{naturalWidth=1536;naturalHeight=naturalHeight;set src(_){queueMicrotask(()=>this.onload());}},
  Neutralino:{init:()=>Promise.resolve(),app:{exit:()=>Promise.resolve()},extensions:{getStats:async()=>({connected:['kurowhaleHost']})},os:{setTray:()=>Promise.resolve()},window:{move:async()=>{},setSize:async()=>{}},events:{on:(n,fn)=>listeners.set(n,fn),broadcast:async(n,data)=>{queueMicrotask(()=>dispatch(n,data));}}}};
  vm.runInNewContext(source,sandbox);
  await dispatch('kw.initialize',{width:240,height:438,petWidth:240,petHeight:260,bubbleSpace:68,x:120,y:120,scale:1.25,topmost:true});
  for(let i=0;i<20;i++)await Promise.resolve();
  dispatch('kw.frame',{state:'petted',row:9,index:2});
  dispatch('kw.fx',{kind:'heart',bounce:true,shake:true});
  return syList.at(-1);
 };
 assert.equal(await runCase(2496),9*208,'12-row atlas must draw row 9 directly');
 assert.equal(await runCase(1872),3*208,'9-row custom skin must gracefully fall back row 9 -> row 3');
});

test('native panel collapses 3+ active sessions and renders question and plan-review cards safely',async()=>{
 const html=await readFile(new URL('../native/index.html',import.meta.url),'utf8');
 const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 const listeners=new Map(),elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{style:{},getBoundingClientRect:()=>({width:160,height:232}),getContext:()=>({clearRect(){},drawImage(){}})});return elements.get(id);};
 const dispatch=(name,data)=>listeners.get(name)?.({detail:data});
 const sandbox={console,Date,Math,Set,Promise,Number,Boolean,performance:{now:()=>100},devicePixelRatio:1.5,innerWidth:160,innerHeight:232,screen:{availLeft:0,availTop:0,availWidth:1707,availHeight:1020},document:{getElementById:element},setInterval:()=>0,setTimeout:()=>0,clearTimeout:()=>{},
 Image:class{naturalWidth=1536;naturalHeight=2496;set src(_){queueMicrotask(()=>this.onload());}},
 Neutralino:{init:()=>Promise.resolve(),app:{exit:()=>Promise.resolve()},extensions:{getStats:async()=>({connected:['kurowhaleHost']})},os:{setTray:()=>Promise.resolve()},window:{move:async()=>{},setSize:async()=>{}},events:{on:(n,fn)=>listeners.set(n,fn),broadcast:async(n,data)=>{queueMicrotask(()=>dispatch(n,data));}}}};
 vm.runInNewContext(source,sandbox);
 await dispatch('kw.initialize',{width:240,height:438,petWidth:240,petHeight:260,bubbleSpace:68,x:120,y:120,scale:1.25,topmost:true});
 for(let i=0;i<20;i++)await Promise.resolve();
 dispatch('kw.panel',{
  state:'waiting',
  approvals:[],
  questions:[{id:'q1',session:'session-1',prompt:'Pick <mode>?',options:['Fast','Safe'],canAnswer:true}],
  planReviews:[{id:'p1',session:'session-2',title:'Plan A',summary:'Check <diff>',canDecide:false}],
  sessions:[
   {alias:'session-1',state:'waiting',toolName:'bash',elapsedSec:5},
   {alias:'session-2',state:'running',toolName:'edit',elapsedSec:8},
   {alias:'session-3',state:'running',toolName:'grep',elapsedSec:2},
  ],
  stats:{companion:'5m',turns:1,tools:2,tokens:''},
 });
 const bodyHtml=elements.get('panelBody').innerHTML;
 assert.match(bodyHtml,/Pick &lt;mode&gt;\?/);
 assert.match(bodyHtml,/Plan A/);
 assert.match(bodyHtml,/展开全部 3 个活跃会话/);
 assert.doesNotMatch(bodyHtml,/session-3/);
 elements.get('panel').onclick({target:{dataset:{act:'toggle-sessions'}}});
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.match(elements.get('panelBody').innerHTML,/session-3/);
 assert.match(elements.get('panelBody').innerHTML,/收起多余会话/);
});
