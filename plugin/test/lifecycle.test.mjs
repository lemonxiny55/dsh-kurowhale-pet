import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as wait} from 'node:timers/promises';
import {apply} from '../index.js';

// Structural safety checks only. These are not Desktop runtime qualification.
test('renderer stays opt-in; stale controls do not replay; cleanup completes',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'kurowhale-unit-'));
  const previous=process.env.DSH_HOME;process.env.DSH_HOME=temp;
  let cleanup;
  try{
    const dir=join(temp,'kurowhale-pet');await mkdir(dir);
    await writeFile(join(dir,'local.json'),JSON.stringify({assetDirectory:'not-an-asset',runtimePath:'not-a-runtime'}));
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
