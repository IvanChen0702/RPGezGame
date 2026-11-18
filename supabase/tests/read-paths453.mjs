import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// Full engine and real planning validation, synthetic accounts only; no network.
const source=readFileSync(new URL('../functions/game-api/index.ts',import.meta.url),'utf8');
const baseline=process.argv[2]?readFileSync(process.argv[2],'utf8'):source;
const actions=['arena/ranking','arena/revenge/list','arena/reports','worldboss/ranking','auction/my-sales'];
const fixed=Date.parse('2026-11-14T13:00:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}
function factory(text){
 const context={Date:Clock,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Uint32Array,URL,Response,AbortSignal,console};
 vm.createContext(context);
 vm.runInContext(text.slice(0,text.indexOf('// v446: only audited')).replace(/^import .*lease446.ts';\n/m,'').replace(/^import .*mist-api468.js';\n/m,'').replaceAll('export function ','function ')+'\nthis.factory=makeEngine;',context);
 return context.factory;
}
const currentFactory=factory(source),oldFactory=factory(baseline);
const kv=o=>Object.entries(o).map(([Key,Value])=>({Key,Value}));
const data={GameConfig:kv({MainProgressEpoch:411,MainRecordStartFloor:40,MainStoryEndFloor:50,WorldBossUnlockFloor:5,ExtremeUnlockFloor:5,DungeonUnlockFloor:5,RelicUnlockFloor:5,ArenaUnlockFloor:5,BoxingUnlockFloor:5,ChallengeUnlockFloor:50}),
 Enemies:Array.from({length:65},(_,i)=>({Floor:i+1,EnemyID:'test-'+i,BaseHP:1,BaseDEF:1,BasePATK:1,BaseMATK:1,EXP:1,Gold:1,FirstClearStone:1})),
 EnemyBehaviors:[],EnemyModules:[],BossPhases:[],Skills:[],Equipment:[],Gems:[],ArenaConfig:[],
 RelicConfig:kv({ProgressKnee:20,EarlyProgressFactor:1,LateProgressOffset:0,TierOrigin:0,TierStep:10,DepthGrowth:1,TierMultipliers:'1,1,1,1,1,1,1,1,1'}),
};
const save={level:10,mainProgressEpoch:411,maxCleared:65,base:{},inventory:[],equipment:{},skillsOwned:[],gems:[],consumables:{},privateMarker:'DO_NOT_RETURN_SAVE'};
function fixture(mode){
 const own={account_id:'self',nickname:'Self',season_id:'ARENA_20261109',points:10,wins:2,losses:1,draws:0,total_damage:123};
 const target={...own,account_id:'target',nickname:'Target',points:20};
 const tables={PlayerSaves:[{account_id:'self',save_json:{...save,...(mode==='locked'?{maxCleared:0}:{})},revision:7},{account_id:'target',nickname:'Fallback',save_json:save,revision:9}],
  Accounts:mode==='fallback'?[]:[{account_id:'target',nickname:'Target',disabled:false}],
  ArenaPlayers:[target,own],game_player_profiles325:[{account_id:'self',avatar_id:3},{account_id:'target',avatar_id:7}],
  ArenaRevenge:[{revenge_id:'rv1',owner_account_id:'self',target_account_id:'target',season_id:own.season_id,status:'AVAILABLE',created_at:'2026-11-14T01:00:00Z',expires_at:'2026-11-15T01:00:00Z'},{revenge_id:'private-revenge',owner_account_id:'other',status:'AVAILABLE'}],
  ArenaBattleReports:[{report_id:'report1',owner_account_id:'self',season_id:own.season_id,battle_id:'battle1',report_type:'DEFENSE',result:'LOSS',points_delta:-2,is_read:false},{report_id:'private-report',owner_account_id:'other'}],
  WorldBossState:[{boss_instance_id:'boss1',status:'DEAD',current_hp:0}],
  WorldBossAttempts:[{boss_instance_id:'boss1',account_id:'self',nickname:'Self',status:'DONE',damage:10},{boss_instance_id:'boss1',account_id:'self',nickname:'Self',status:'DONE',damage:20},{boss_instance_id:'boss1',account_id:'target',nickname:'Target',status:'DONE',damage:100},{boss_instance_id:'boss2',account_id:'self',status:'DONE',damage:9999}],
  AuctionListings:[{listing_id:'sale1',seller_account_id:'self',status:'sold',seller_net_gold:90,claim_status:'pending'},{listing_id:'sale2',seller_account_id:'self',status:'sold',seller_net_gold:30,payout_mode:'manual_claim_v1'},{listing_id:'sale3',seller_account_id:'self',status:'sold',seller_net_gold:50,claim_status:'claimed'},{listing_id:'private-sale',seller_account_id:'other',status:'sold',seller_net_gold:9999}]};
 if(mode==='empty')for(const key of Object.keys(tables))if(key!=='PlayerSaves')tables[key]=[];
 return tables;
}
async function run(make,action,mode,readOnly){
 const tables=fixture(mode),calls=[];
 const engine=make({base:'https://db.test',key:'synthetic-key',token:'synthetic-token',actor:{accountId:'self'},planning:{data},readOnly,
  fetcher:async(url,opts)=>{
   const u=new URL(url),table=u.pathname.split('/').at(-1);calls.push({table,method:opts.method,query:u.search});
   assert.equal(opts.method,'GET','a display dependency attempted a write');assert.ok(Object.hasOwn(tables,table),'Unexpected I/O '+table);
   if(mode==='error'&&table!=='PlayerSaves')return Response.json({message:'fixture error'},503);
   let rows=tables[table];
   for(const [key,value] of u.searchParams){
    if(value.startsWith('eq.'))rows=rows.filter(r=>String(r[key])===value.slice(3));
    if(value.startsWith('gt.'))rows=rows.filter(r=>Number(r[key])>Number(value.slice(3)));
    if(value.startsWith('in.')){const ids=JSON.parse('['+value.slice(4,-1)+']');rows=rows.filter(r=>ids.includes(r[key]));}
   }
   if(mode==='outside'&&table==='ArenaPlayers'&&!u.searchParams.has('account_id'))rows=rows.filter(r=>r.account_id!=='self');
   const limit=Number(u.searchParams.get('limit'));if(limit>0)rows=rows.slice(0,limit);
   return Response.json(rows);
  }});
 const body={action,sessionToken:'synthetic-token',accountId:'other',ownerAccountId:'other',sellerAccountId:'other',seasonId:mode==='missing'?'not-a-season':'2026-W45',bossInstanceId:mode==='missing'?'not-a-boss':'boss1'};
 let result;try{result=JSON.parse(JSON.stringify(await engine.dispatch(body)));}catch(err){result={thrown:err.message};}
 await assert.rejects(()=>engine.dispatch({...body,sessionToken:'wrong'}),/UNAUTHORIZED/);
 return {result,calls};
}
for(const action of actions)for(const mode of ['normal','empty','fallback','outside','missing','error','locked']){
 const old=await run(oldFactory,action,mode,false),now=await run(currentFactory,action,mode,true);
 assert.deepEqual(now.result,old.result,action+' '+mode+' response changed');assert.deepEqual(now.calls,old.calls,action+' '+mode+' I/O changed');
 assert.ok(!JSON.stringify(now.result).includes('DO_NOT_RETURN_SAVE'));
 if(mode==='normal'){
  assert.equal(now.result.ok,true,action);
  assert.ok(!JSON.stringify(now.result).includes('private-'),action+' leaked another owner');
  if(action==='worldboss/ranking'){assert.equal(now.result.ranking.mine.damage,30);assert.equal(now.result.ranking.totalPlayers,2);}
  if(action==='arena/revenge/list')assert.equal(now.result.rows[0].targetNickname,'Target');
  if(action==='auction/my-sales'){assert.equal(now.result.pendingGold,120);assert.equal(now.result.pendingCount,2);}
 }
 if(mode==='fallback'&&action==='arena/revenge/list')assert.equal(now.result.rows[0].targetNickname,'Fallback');
 if(mode==='outside'&&action==='arena/ranking')assert.equal(now.result.myRank.rank,2);
 if(mode==='locked'&&action!=='auction/my-sales')assert.equal(now.result.thrown,'MODE_NOT_UNLOCKED');
}
// Deliberately add a future write to a display handler: guard rejects before fetch.
for(const call of ["await UrlFetchApp.fetch(base+'/rest/v1/WorldBossRewards',{method:'post',payload:'{}'});", "await UrlFetchApp.fetch(base+'/rest/v1/rpc/future_read',{method:'get'});"]){
 const injected=factory(source.replace('async function getWorldBossRanking_(body) {','async function getWorldBossRanking_(body) {'+call));
 const r=await run(injected,'worldboss/ranking','normal',true);
 assert.equal(r.result.message,'READ_PATH_WRITE_DENIED');assert.equal(r.calls.length,1);
}
console.log('PASS 35 full-engine response/I/O parity scenarios: five routes, owner filters, fallback, empty/missing data, errors, unlock gates; write/RPC guard');
