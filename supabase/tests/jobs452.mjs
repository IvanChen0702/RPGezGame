// Full engine, synthetic rows only. Ensures the cron split preserves rewards.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
let source=readFileSync(new URL('../functions/game-api/index.ts',import.meta.url),'utf8');
source=source.slice(0,source.indexOf('// v446: only audited')).replace(/^import .*lease446.ts';\n/m,'').replace(/^import .*mist-api468.js';\n/m,'').replaceAll('export function ','function ');
class Clock extends Date {static now(){return Date.UTC(2026,10,14);}}
const context={Date:Clock,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Uint32Array,URL,Response,AbortSignal,console:{log(){},warn(){}}};
vm.createContext(context);vm.runInContext(source+'\nthis.factory=makeEngine;',context);
const stages=[];let locked=false;
const engine=context.factory({base:'https://db.test',key:'test-only',planning:{data:{}},
 runJob:async(stage,work)=>{assert.equal(locked,false);locked=true;stages.push(stage);try{return await work();}finally{locked=false;}},
 fetcher:async(url,opt)=>{
  assert.equal(locked,true,'all cron runtime I/O is inside a unit lock');
  const u=new URL(url),table=u.pathname.split('/').at(-1),p=u.searchParams;
  if(['WorldBossState','WorldBossRewards'].includes(table)&&opt.method==='GET')return Response.json([]);
  throw Error('Unexpected I/O '+opt.method+' '+table);
 }
});
await engine.jobs();
assert.deepEqual(stages,['worldboss_cleanup']);assert.equal(locked,false);
await engine.jobs();assert.deepEqual(stages,['worldboss_cleanup','worldboss_cleanup']);
console.log('PASS remaining cron engine: scoped worldboss lock, no retired mode I/O');
