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
const season={SeasonID:'2026-W42',Enabled:true};
for(const key of ['Rank1','Rank2','Rank3','Rank4To10'])Object.assign(season,{[key+'RewardType']:'STONES',[key+'RewardQuantity']:300});
const rewards=[],stages=[];let locked=false,reads=0,failAfter=null;
const engine=context.factory({base:'https://db.test',key:'test-only',planning:{data:{BoxingSeasons_SCHEMA:[season]}},
 runJob:async(stage,work)=>{assert.equal(locked,false);locked=true;stages.push(stage);try{return await work();}finally{locked=false;}},
 fetcher:async(url,opt)=>{
  assert.equal(locked,true,'all cron runtime I/O is inside a unit lock');
  const u=new URL(url),table=u.pathname.split('/').at(-1),p=u.searchParams;
  if(table==='BoxingRanking'){
   reads++;assert.equal(p.get('select'),'account_id,nickname');assert.equal(p.get('limit'),'10');assert.equal(p.get('order'),'damage.desc,submitted_at.asc');
   return Response.json(Array.from({length:10},(_,i)=>({account_id:'fixture-'+i,nickname:'Fixture '+i})));
  }
  if(table==='BoxingRewards'&&opt.method==='GET')return Response.json(rewards.filter(r=>'eq.'+r.season_id===p.get('season_id')));
  if(table==='BoxingRewards'&&opt.method==='POST'){if(rewards.length===failAfter)throw Error('synthetic interrupted write');const rows=JSON.parse(opt.body);rewards.push(...(Array.isArray(rows)?rows:[rows]));return Response.json([]);}
  if(['WorldBossState','WorldBossRewards'].includes(table)&&opt.method==='GET')return Response.json([]);
  throw Error('Unexpected I/O '+opt.method+' '+table);
 }
});
const first=await engine.jobs();
assert.equal(first.boxing.checked,4);assert.equal(first.boxing.created,40);assert.equal(reads,4);
assert.deepEqual(stages,['boxing_season','boxing_season','boxing_season','boxing_season','worldboss_cleanup']);
assert.equal(rewards.length,40);assert.ok(rewards.every(r=>r.quantity===300&&r.status==='PENDING'));
for(const seasonId of new Set(rewards.map(r=>r.season_id)))assert.deepEqual(rewards.filter(r=>r.season_id===seasonId).map(r=>r.rank),[1,2,3,4,5,6,7,8,9,10]);
const again=await engine.jobs();assert.equal(again.boxing.created,0);assert.equal(rewards.length,40);assert.equal(locked,false);
rewards.length=0;failAfter=3;await assert.rejects(()=>engine.jobs(),/synthetic interrupted write/);assert.equal(locked,false);assert.equal(rewards.length,3);
failAfter=null;const recovered=await engine.jobs();assert.equal(recovered.boxing.created,37);assert.equal(rewards.length,40);
console.log('PASS full cron engine: unit locks, top-ten projection, reward ranks/quantities, retry does not duplicate rewards');
