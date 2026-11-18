import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reduceMist468} from '../functions/game-api/mist-runtime468.js';
import {handleMist468} from '../functions/game-api/mist-api468.js';
import {PGlite} from '@electric-sql/pglite';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
const rules={RoadChestCap:5,RoadChestRespawnMinutes:30,RoadChestLegendaryPercent:30,RoadChestRandomPercent:40,RoadChestTrapPercent:30,RoadChestTrapHpPercent:80};
data.MistConfig.find(r=>r.Key==='Enabled').Value=true;
const oldData=structuredClone(data);
for(const [Key,Value] of Object.entries(rules))data.MistConfig.push({Key,Value});
let input={world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},now:'2026-11-16T01:00:00Z',planning:{data,dataVersion:'fixture492'},save:{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]},rewards:[],nickname:'test'};
async function call(action,payload={},random=()=>.4){const out=await reduceMist468(input,'a',action,{expectedRevision:input.world.players.a?.revision,...payload},random);if(out.world)input.world=out.world;return out.result;}
let d=await call('join');assert.equal(input.world.cells.filter(c=>c.kind==='road_chest').length,5);
let p=input.world.players.a;p.runtime.starter.opened=true;p.energy=0;
const me=input.world.cells.find(c=>c.kind==='player'),target=input.world.cells.find(c=>c.kind==='road_chest'&&c.x>0&&c.x<15);
input.world.cells=input.world.cells.filter(c=>c.kind==='player'||c.x!==target.x-1||c.y!==target.y);Object.assign(me,{x:target.x-1,y:target.y});await call('status');
p=input.world.players.a;p.hp=500;p.max_hp=1000;
const base=structuredClone(input);
for(const [roll,outcome] of [[0,'legendary'],[.299999,'legendary'],[.3,'random'],[.699999,'random'],[.7,'trap'],[.999999,'trap']]){
 input=structuredClone(base);d=await call('road-chest/open',{targetId:target.id},()=>roll);assert.equal(d.self.energy,0);assert.equal(d.self.maxHp,1000);
 assert.equal(input.world.cells.some(c=>c.id===target.id),false);assert.equal(input.world.meta.roadChestRespawns492.length,1);
 assert.ok(d.reports.some(r=>r.result==='road_chest'&&r.position.x===target.x&&r.position.y===target.y));
 if(outcome==='trap'){assert.equal(d.self.hp,100);assert.equal(d.roadChestReceipt492.damage,400);assert.equal(d.inventory.equipment.length,0);assert.equal(d.chestReveals471.length,0);}
 else {const receipt=d.chestReveals471[0],item=receipt.items[0];assert.equal(receipt.items.length,1);assert.equal(receipt.legendary,outcome==='legendary');assert.equal(item.starter,false);assert.equal(item.sockets,1);assert.ok(item.enhance>=1&&item.enhance<=9);assert.ok(!/gmsword/i.test(item.template));if(outcome==='legendary')assert.equal(item.rarity,'傳說');assert.equal(d.self.hp,500);assert.deepEqual((await call('status')).chestReveals471[0],receipt);}
 await assert.rejects(()=>call('road-chest/open',{targetId:target.id}),/RESOURCE_MISSING/);
}
for(const [hp,left] of [[1,1],[2,1],[3,1],[7,2],[100,20]]){input=structuredClone(base);input.world.players.a.hp=hp;d=await call('road-chest/open',{targetId:target.id},()=>.9);assert.equal(d.self.hp,left);}
input=structuredClone(base);Object.assign(input.world.cells.find(c=>c.kind==='player'),{x:0,y:0});await assert.rejects(()=>call('road-chest/open',{targetId:target.id}),/NOT_ADJACENT/);
for(const [field,value,error] of [['battle_id','busy','IN_BATTLE'],['pending_loot',[{kind:'equipment'}],'LOOT_PENDING']]){input=structuredClone(base);input.world.players.a[field]=value;await assert.rejects(()=>call('road-chest/open',{targetId:target.id}),new RegExp(error));}
input=structuredClone(base);input.world.players.a.runtime.dead=true;await assert.rejects(()=>call('road-chest/open',{targetId:target.id}),/RESPAWN_REQUIRED/);
input=structuredClone(base);input.now=input.world.season.closes_at;await assert.rejects(()=>call('road-chest/open',{targetId:target.id}),/NOT_OPEN/);
// Full equipment bag uses existing pending-loot + one-click equip acknowledgement.
input=structuredClone(base);input.world.players.a.inventory.equipment=Array.from({length:10},(_,i)=>({id:'old'+i,kind:'equipment'}));d=await call('road-chest/open',{targetId:target.id},()=>.1);assert.equal(d.pendingLoot.length,1);const reward=d.chestReveals471[0];d=await call('chest/confirm',{chestId:reward.id,choice:'equip'});assert.ok(Object.values(d.equipment).some(x=>x.id===reward.items[0].id));assert.equal(d.pendingLoot.length,0);
// Replacement boundary and different coordinate, cap includes pending jobs.
input=structuredClone(base);await call('road-chest/open',{targetId:target.id},()=>.9);const count=()=>input.world.cells.filter(c=>c.kind==='road_chest').length;
assert.equal(count(),4);input.now='2026-11-16T01:29:59.999Z';await call('status');assert.equal(count(),4);input.now='2026-11-16T01:30:00Z';await call('status');assert.equal(count(),5);assert.equal(input.world.meta.roadChestRespawns492.length,0);assert.ok(!input.world.cells.some(c=>c.kind==='road_chest'&&c.x===target.x&&c.y===target.y));
// No overwriting flags or occupied cells on a crowded map.
input=structuredClone(base);await call('road-chest/open',{targetId:target.id},()=>.9);input.now='2026-11-16T01:30:00Z';input.world.flags=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)input.world.flags.push({x,y,owner_account:'a',season_id:input.world.season.id,created_at:input.now});await call('status');assert.equal(count(),4);assert.equal(input.world.meta.roadChestRespawns492.length,1);
// Old published packages stay compatible; receipt and hidden chest positions are private.
input=structuredClone(base);d=await call('road-chest/open',{targetId:target.id},()=>.9);const outsider=await reduceMist468(input,'outsider','status',{},()=>.4);assert.equal(outsider.result.roadChestReceipt492,null);assert.equal(outsider.result.cells.length,0);
const legacy={...structuredClone(base),world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},planning:{data:oldData}};const out=await reduceMist468(legacy,'a','join',{},()=>.4);assert.equal(out.result.roadChestRules492,null);assert.equal(out.world.cells.some(c=>c.kind==='road_chest'),false);
// Real transaction RPC tests: grants, planning migration and concurrent/shared receipt semantics.
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role,anon,authenticated;
create table "Accounts"(account_id text primary key,nickname text,disabled boolean default false);
create table "PlayerSaves"(id bigserial primary key,account_id text unique,save_json jsonb,revision bigint default 1,updated_at timestamptz default now());
create table "GameDataCurrent"(channel text primary key,version text,published_at timestamptz default now(),data_json jsonb);
create table "GameDataVersions"(version text,published_at timestamptz,published_by text,data_json jsonb);
insert into "Accounts" values('a','A',false),('b','B',false);
insert into "PlayerSaves"(account_id,save_json) select account_id,'{"maxCleared":1,"mainProgressEpoch":411,"skillsOwned":["slash"],"equippedSkills":["slash"],"passive":[]}' from "Accounts";
grant select,update on "PlayerSaves" to service_role;grant select on "Accounts","GameDataCurrent" to service_role;`);
await db.query('insert into "GameDataCurrent"(channel,version,data_json) values($1,$2,$3)',['production','20261118-043856-resources487',JSON.stringify({dataVersion:'fixture',data:oldData})]);
for(const f of ['20261115140245_mist_world465.sql','20261115163236_mist_runtime468.sql','20261116032956_mist_energy478.sql','20261118043535_mist_resources487.sql','20261118074324_mist_road_chests492.sql'])await db.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../../tools/planning/publish_mist_road_chests492.sql',import.meta.url),'utf8'));
const one=async(q,args=[]) => (await db.query(q,args)).rows[0];
await db.query('update "GameDataCurrent" set data_json=$1',[JSON.stringify({data:oldData})]);
assert.equal((await one(`select jsonb_array_length(data_json->'data'->'MistConfig') n from "GameDataCurrent"`)).n,oldData.MistConfig.length+6);
await assert.rejects(()=>db.exec(`update "GameDataCurrent" set data_json=jsonb_set(data_json,'{data,MistConfig}',(data_json->'data'->'MistConfig')||'[{"Key":"RoadChestCap","Value":99}]')`),/DUPLICATE/);
for(const [key,value,error]of [['RoadChestTrapHpPercent',100,'INVALID'],['RoadChestRandomPercent',41,'PERCENT_TOTAL'],['RoadChestTrapPercent',null,'INVALID']]){
 const bad=structuredClone(data);bad.MistConfig.find(r=>r.Key===key).Value=value;
 await assert.rejects(()=>db.query('update "GameDataCurrent" set data_json=$1',[JSON.stringify({data:bad})]),new RegExp(error));
}
const rpc=async(name,args)=>{const keys=Object.keys(args);const r=(await one('select public.'+name+'('+keys.map((k,i)=>k+'=>$'+(i+1)).join(',')+') d',Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v))).d;if(name==='game_mist_load468')r.now='2026-11-16T01:00:00Z';return r;};
const status=id=>handleMist468(rpc,id,{action:'mist/status'});
await db.exec('set role service_role');
for(const id of ['a','b'])assert.equal((await handleMist468(rpc,id,{action:'mist/join',requestId:crypto.randomUUID()})).ok,true);
const chest=await one("select * from mist_cells465 where kind='road_chest' limit 1");
await db.query("delete from mist_cells465 where kind<>'player' and id<>$1 and y=$2 and x in ($3,$4)",[chest.id,chest.y,chest.x-1,chest.x+1]);
await db.exec("update mist_cells465 set x=0,y=0 where owner_account='a';update mist_cells465 set x=15,y=15 where owner_account='b'");
for(const [id,x] of [['a',chest.x-1],['b',chest.x+1]])await db.query('update mist_cells465 set x=$1,y=$2 where owner_account=$3',[x,chest.y,id]);
await db.exec("update mist_players465 set hp=500,max_hp=1000,energy=0,energy_at='2026-11-16T01:00:00Z'");
const snapshots=await Promise.all(['a','b'].map(status)),requests=snapshots.map(s=>({action:'mist/road-chest/open',requestId:crypto.randomUUID(),expectedRevision:s.self.revision,targetId:chest.id}));
const outcomes=await Promise.all(requests.map((r,i)=>handleMist468(rpc,['a','b'][i],r)));assert.equal(outcomes.filter(o=>o.ok).length,1);
const wi=outcomes[0].ok?0:1,winner=['a','b'][wi],before=await one('select * from mist_players465 where account_id=$1',[winner]);
assert.deepEqual(await handleMist468(rpc,winner,requests[wi]),outcomes[wi]);assert.deepEqual(await one('select * from mist_players465 where account_id=$1',[winner]),before,'replay never rerolls, damages or rewards twice');
const loser=await one('select * from mist_players465 where account_id=$1',[['a','b'][1-wi]]);assert.equal(loser.hp,500);assert.equal(loser.energy,0);assert.equal(loser.inventory.equipment.length,0);
assert.equal((await handleMist468(rpc,winner,{...requests[wi],targetId:'changed'})).error,'MIST_REQUEST_REUSED');
assert.equal((await one('select jsonb_array_length(meta->\'roadChestRespawns492\') n from mist_runtime468')).n,1);
await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select * from mist_cells465'),/permission denied/);await assert.rejects(()=>rpc('game_mist_load468',{p_account:'a',p_request:null}),/permission denied/);
await db.close();console.log('Road chests492: probability boundaries, current HP rounding, free open, loot overflow, replacement/cap, privacy, SQL guard, CAS rivalry, receipt replay and ACL passed');
