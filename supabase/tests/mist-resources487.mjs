import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {handleMist468} from '../functions/game-api/mist-api468.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
for(const [k,v] of Object.entries({Enabled:true,EnergyInitial:20,EnergyCap:20,EnergyRecoveryMinutes:30}))data.MistConfig.find(r=>r.Key===k).Value=v;
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role,anon,authenticated;
create table "Accounts"(account_id text primary key,nickname text,disabled boolean default false);
create table "PlayerSaves"(id bigserial primary key,account_id text unique,save_json jsonb,revision bigint default 1,updated_at timestamptz default now());
create table "GameDataCurrent"(channel text primary key,version text,published_at timestamptz default now(),data_json jsonb);
create table "GameDataVersions"(version text,published_at timestamptz,published_by text,data_json jsonb);
insert into "Accounts" values('a','A',false),('b','B',false);
insert into "PlayerSaves"(account_id,save_json) select account_id,'{"maxCleared":1,"mainProgressEpoch":411,"skillsOwned":["slash"],"equippedSkills":["slash"],"passive":[]}' from "Accounts";
grant select,update on "PlayerSaves" to service_role;grant select on "Accounts","GameDataCurrent" to service_role;`);
await db.query('insert into "GameDataCurrent"(channel,version,data_json) values($1,$2,$3)',['production','20261118-021030-cleanup482',JSON.stringify({dataVersion:'fixture',data})]);
for(const f of ['20261115140245_mist_world465.sql','20261115163236_mist_runtime468.sql','20261116032956_mist_energy478.sql','20261118043535_mist_resources487.sql'])await db.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../../tools/planning/publish_mist_resources487.sql',import.meta.url),'utf8'));
const one=async(q,args=[]) => (await db.query(q,args)).rows[0];
// Old publisher missing keys carries forward published settings; invalid explicit values fail.
await db.query('update "GameDataCurrent" set data_json=$1',[JSON.stringify({data})]);
assert.equal((await one(`select jsonb_array_length(data_json->'data'->'MistConfig') n from "GameDataCurrent"`)).n,data.MistConfig.length+4);
await assert.rejects(()=>db.exec(`update "GameDataCurrent" set data_json=jsonb_set(data_json,'{data,MistConfig}',(data_json->'data'->'MistConfig')||'[{"Key":"StaminaPackCap","Value":99}]')`),/DUPLICATE/);
let now='2026-11-16T01:00:00.000Z';
const rpc=async(name,args)=>{const keys=Object.keys(args);const r=(await one('select public.'+name+'('+keys.map((k,i)=>k+'=>$'+(i+1)).join(',')+') d',Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v))).d;if(name==='game_mist_load468')r.now=now;return r;};
const status=id=>handleMist468(rpc,id,{action:'mist/status'});
const act=async(id,action,payload={},requestId=crypto.randomUUID())=>{const s=await status(id);return handleMist468(rpc,id,{action:'mist/'+action,requestId,expectedRevision:s.self?.revision,...payload});};
const cells=async()=> (await db.query('select * from mist_cells465')).rows;
const player=async(id)=>one('select * from mist_players465 where account_id=$1',[id]);
await db.exec('set role service_role');await act('a','join');await act('b','join');
let c=await cells(),drop=c.find(x=>x.kind==='airdrop');assert.equal(c.filter(x=>x.kind==='stamina_spawn').length,10);assert.equal(c.filter(x=>x.kind==='airdrop').length,1);
assert.ok(c.filter(x=>['airdrop','stamina_spawn'].includes(x.kind)).every(x=>x.x>0&&x.y>0&&x.x<15&&x.y<15));
let s=await status('a');assert.equal(s.visions487.filter(v=>v.kind==='airdrop').length,1);assert.equal(s.cells.filter(x=>Math.abs(x.x-drop.x)<=2&&Math.abs(x.y-drop.y)<=2).length,25);
// Place both players near the resource; avoid test-only collisions by clearing other cells.
const place=async(target)=>{await db.query("delete from mist_cells465 where kind<>'player' and id<>$1 and y=$2 and x in ($3,$4)",[target.id,target.y,target.x-1,target.x+1]);await db.exec("update mist_cells465 set x=0,y=0 where owner_account='a';update mist_cells465 set x=15,y=15 where owner_account='b'");await db.query("update mist_cells465 set x=$1,y=$2 where owner_account='a'",[target.x-1,target.y]);await db.query("update mist_cells465 set x=$1,y=$2 where owner_account='b'",[target.x+1,target.y]);};
await place(drop);
await db.query("update mist_players465 set hidden_until='2026-11-16T03:00:00Z' where account_id='b'");s=await status('a');assert.equal(s.cells.some(c=>c.object?.name==='B'),false,'global sight still respects invisibility');
await db.query("update mist_players465 set hidden_until=null where account_id='b'");
// Two contenders submit the same shared revision; only one gets a chest.
const snapshots=await Promise.all(['a','b'].map(id=>status(id)));const requests=['a','b'].map((id,i)=>({action:'mist/resource/claim',requestId:crypto.randomUUID(),expectedRevision:snapshots[i].self.revision,targetId:drop.id}));
const outcomes=await Promise.all(requests.map((body,i)=>handleMist468(rpc,['a','b'][i],body)));assert.equal(outcomes.filter(o=>o.ok).length,1);
const winner=outcomes[0].ok?'a':'b',wi=winner==='a'?0:1;const before=await player(winner);assert.equal(before.inventory.chests.length,1);assert.equal(before.inventory.chests[0].legendary,true);
assert.deepEqual(await handleMist468(rpc,winner,requests[wi]),outcomes[wi],'lost response replays identical receipt');assert.equal((await player(winner)).inventory.chests.length,1);
s=await status(winner);assert.equal(s.visions487.some(v=>v.kind==='airdrop'),false);assert.equal(s.airdropNextAt487,'2026-11-16T16:00:00.000Z');
await assert.rejects(()=>rpc('game_mist_commit468',{p_account:winner,p_request:requests[wi].requestId,p_action:'resource/claim',p_payload:{targetId:'changed'},p_revision:0,p_patch:{},p_result:{}}),/REQUEST_REUSED/);
// Warning boundary and full-cap refusal; then recovery clamping + immediate replacement warning.
let pack=(await cells()).find(x=>x.kind==='stamina_spawn');await place(pack);
let r=await act('a','resource/claim',{targetId:pack.id});assert.equal(r.error,'MIST_RESOURCE_PENDING');
now='2026-11-16T01:29:59.999Z';await status('a');assert.equal((await cells()).find(x=>x.id===pack.id).kind,'stamina_spawn');
now='2026-11-16T01:30:00.000Z';await status('a');assert.equal((await cells()).find(x=>x.id===pack.id).kind,'stamina');
r=await act('a','resource/claim',{targetId:pack.id});assert.equal(r.error,'MIST_ENERGY_FULL');
await db.query("update mist_players465 set energy=15,energy_at=$1 where account_id='a'",[now]);r=await act('a','resource/claim',{targetId:pack.id});assert.equal(r.self.energy,20);assert.equal(r.resourceReceipt487.gained,5);assert.equal(r.self.energyNextAt,null);assert.ok(r.reports.some(x=>x.result==='resource'&&x.position.x===pack.x));
c=await cells();assert.equal(c.filter(x=>['stamina','stamina_spawn'].includes(x.kind)).length,10);assert.ok(c.some(x=>x.kind==='stamina_spawn'&&x.payload.spawnAt==='2026-11-16T02:00:00.000Z'));
r=await act('a','resource/claim',{targetId:pack.id});assert.equal(r.error,'MIST_RESOURCE_MISSING');
pack=c.find(x=>x.kind==='stamina'&&(x.x!==pack.x||x.y!==pack.y));await place(pack);await db.query("update mist_players465 set energy=0,energy_at=$1 where account_id='a'",[now]);r=await act('a','resource/claim',{targetId:pack.id});assert.equal(r.self.energy,10);assert.equal(r.resourceReceipt487.gained,10);
// Distant target cannot be claimed even in public vision.
await db.query("update mist_cells465 set x=0,y=1 where owner_account='a'");pack=(await cells()).find(x=>x.kind==='stamina'&&x.x>2);r=await act('a','resource/claim',{targetId:pack.id});assert.equal(r.error,'MIST_NOT_ADJACENT');
now='2026-11-16T15:59:59.999Z';await status('a');assert.equal((await cells()).filter(x=>x.kind==='airdrop').length,0);
now='2026-11-16T16:00:00.000Z';await status('a');drop=(await cells()).find(x=>x.kind==='airdrop');assert.ok(drop);
now='2026-11-17T16:00:00.000Z';await status('a');assert.deepEqual((await cells()).find(x=>x.kind==='airdrop'),drop,'unclaimed resource keeps ID and location across midnight');
// Private flag selector never lists someone else's flags.
await act('a','flag');await act('b','flag');s=await status('a');assert.equal(s.visions487.filter(x=>x.kind==='flag').length,1);
// No new grants: all mode tables still inaccessible to anonymous/browser roles.
await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select * from mist_cells465'),/permission denied/);
await db.close();console.log('Resources487: SQL schema/planning guard, 10 warnings, boundary, cap/clamp, replacement, atomic rival claims, replay, privacy, own flags, Taiwan midnight, retention and ACL passed');
