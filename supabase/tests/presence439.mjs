import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
process.on('uncaughtException',e=>{console.error(e.message,e.where||'');process.exit(1)});
const migration=name=>readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8');
const old=migration('202611130001_town_companions436.sql'),fixed=migration('202611130003_fix_presence_identity439.sql');
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key);
create table public."Accounts"(account_id text primary key,disabled boolean not null default false);
create table public."PlayerSaves"(account_id text primary key,save_json jsonb not null);
create table public.game_identity_links(auth_user_id uuid primary key,legacy_account_id text not null);
create table public.game_presence358(
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 presence_id uuid not null unique default gen_random_uuid(),nickname text not null check(length(nickname)<=48),
 level integer not null check(level>=1),title_id text not null check(length(title_id)<=80),
 avatar_id integer not null check(avatar_id between 1 and 12),visual text not null check(visual ~ '^hero_(male|female)_[0-3]_[0-3]_idle$'),last_seen timestamptz not null default now());
create index game_presence358_last_seen on public.game_presence358(last_seen);
create table public.test_roster439(data jsonb);insert into public.test_roster439 values('{}');
-- A contract stub of 420, not a copy of the unprovided deployed implementation.
create function public.game_town_presence420(p_avatar_id integer,p_visual text,p_include_members boolean,p_touch boolean)
returns jsonb language plpgsql security definer set search_path='' as $$declare account text;begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select l.legacy_account_id into account from public.game_identity_links l join public."Accounts" a on a.account_id=l.legacy_account_id where l.auth_user_id=auth.uid() and not a.disabled;
 if account is null then raise exception 'ACCOUNT_NOT_LINKED_OR_DISABLED';end if;
 if not p_include_members then return '{"ok":true,"count":8,"hasMembers":false,"members":[]}'::jsonb;end if;
 return (select data from public.test_roster439);end;$$;
insert into auth.users values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
insert into public."Accounts" values('legacy-observer',false);
insert into public.game_identity_links values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','legacy-observer');
insert into public."PlayerSaves" values('legacy-observer','{"equippedPet297":"local-pet","pets297":[{"id":"local-pet","species":"orange","level":10}]}');`);
const ids=Array.from({length:8},(_,i)=>`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
const authIds=Array.from({length:8},(_,i)=>`11111111-1111-1111-1111-${String(i+1).padStart(12,'0')}`);
const pets=[{id:'equipped-pet',species:'chick',level:7},{id:'other-pet',species:'spiritDeer',level:20,traits:['PRIVATE_TRAIT']}];
const saves=[{equippedPet297:'equipped-pet',pets297:pets,private:'PRIVATE_SAVE'}, {equippedPet297:'other-pet',pets297:pets}, {equippedPet297:null,pets297:pets}, {equippedPet297:'missing',pets297:pets}, {equippedPet297:'equipped-pet',pets297:{}}, {equippedPet297:'equipped-pet',pets297:[{...pets[0],level:-1}]}, {equippedPet297:'equipped-pet',pets297:[{...pets[0],level:999999999999}]}, {equippedPet297:'equipped-pet',pets297:[{...pets[0],species:'<script>'}]}];
for(let i=0;i<8;i++){
 await db.query('insert into auth.users values($1)',[authIds[i]]);
 await db.query('insert into public."Accounts" values($1,false)',['legacy-player-'+i]);
 await db.query('insert into public.game_identity_links values($1,$2)',[authIds[i],'legacy-player-'+i]);
 await db.query('insert into public."PlayerSaves" values($1,$2)',['legacy-player-'+i,saves[i]]);
 await db.query(`insert into public.game_presence358(auth_user_id,presence_id,nickname,level,title_id,avatar_id,visual) values($1,$2,$3,10,'beginner',1,'hero_male_0_0_idle')`,[authIds[i],ids[i],'member'+i]);
}
// Decoy account proves the old code can even read the wrong save when IDs collide.
await db.query('insert into public."PlayerSaves" values($1,$2)',[ids[0],{equippedPet297:'decoy-pet',pets297:[{id:'decoy-pet',species:'chaosVoidCat',level:1}]}]);
const original={ok:true,count:9,hasMembers:true,members:ids.map((id,i)=>({id,nickname:'member'+i,level:10,appearance:{sex:'male',equipment:[]},avatarId:1,titleId:'beginner'}))};
await db.query('update public.test_roster439 set data=$1',[original]);
await db.exec(old);await db.exec(`set request.jwt.claim.sub='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';set role authenticated;`);
const read=async()=> (await db.query("select public.game_town_presence436(1,'hero_male_0_0_idle',true,false) as result")).rows[0].result;
assert.equal((await read()).members[0].pet.id,'decoy-pet','reproduce the old identity mismatch');
await db.exec('reset role');
const saveSnapshot=(await db.query('select account_id,save_json from public."PlayerSaves" order by account_id')).rows;
const baseBefore=(await db.query("select pg_get_functiondef('public.game_town_presence420(integer,text,boolean,boolean)'::regprocedure) as body")).rows[0].body;
await db.exec(fixed);await db.exec(fixed);
assert.equal((await db.query("select pg_get_functiondef('public.game_town_presence420(integer,text,boolean,boolean)'::regprocedure) as body")).rows[0].body,baseBefore);
assert.deepEqual((await db.query('select account_id,save_json from public."PlayerSaves" order by account_id')).rows,saveSnapshot);
assert.equal((await db.query("select md5(prosrc) as hash from pg_proc where oid='public.game_town_presence436(integer,text,boolean,boolean)'::regprocedure")).rows[0].hash,'606d6a10f2532f8c3d1a02f1617c9477');
await db.exec('set role authenticated');
let result=await read();assert.deepEqual(result.members[0].pet,pets[0]);assert.deepEqual(result.members[1].pet,{id:'other-pet',species:'spiritDeer',level:20});assert(result.members.slice(2).every(m=>m.pet===null));assert.deepEqual(result.members.map(({pet,...m})=>m),original.members);assert.equal(result.count,original.count);
const output=JSON.stringify(result);assert(!/PRIVATE_|legacy-|11111111|auth_user_id|legacy_account_id|decoy-pet|local-pet/.test(output));
await assert.rejects(()=>db.query('select * from public."PlayerSaves"'),/permission denied/);
assert.deepEqual((await db.query("select public.game_town_presence436(1,'hero_male_0_0_idle',false,false) as result")).rows[0].result,{ok:true,count:8,hasMembers:false,members:[]});
await db.exec('reset role');await db.query(`update public."PlayerSaves" set save_json=jsonb_set(save_json,'{equippedPet297}','"other-pet"') where account_id='legacy-player-0'`);await db.exec('set role authenticated');assert.equal((await read()).members[0].pet.species,'spiritDeer');
await db.exec('reset role');await db.query(`update public."PlayerSaves" set save_json=jsonb_set(save_json,'{equippedPet297}','null') where account_id='legacy-player-0'`);await db.exec('set role authenticated');assert.equal((await read()).members[0].pet,null);
// Same roster ID but disconnected identity/disabled target must not borrow another pet.
await db.exec(`reset role;delete from public.game_identity_links where legacy_account_id='legacy-player-1';set role authenticated`);assert.equal((await read()).members[1].pet,null);
await db.exec(`reset role;update public."Accounts" set disabled=true where account_id='legacy-player-0';set role authenticated`);assert.equal((await read()).members[0].pet,null);
await db.exec(`reset role;update public."Accounts" set disabled=false where account_id='legacy-player-0';alter table public.game_identity_links drop constraint game_identity_links_pkey`);
await db.query('insert into public.game_identity_links values($1,$2)',[authIds[0],'legacy-player-1']);await db.exec('set role authenticated');assert.equal((await read()).members[0].pet,null,'ambiguous identity must not pick either save');
await db.exec(`reset role;update public."Accounts" set disabled=true where account_id='legacy-observer';set role authenticated`);await assert.rejects(read,/ACCOUNT_NOT_LINKED_OR_DISABLED/);
await db.exec(`set request.jwt.claim.sub=''`);await assert.rejects(read,/UNAUTHORIZED/);
await db.exec('reset role;set role anon');await assert.rejects(read,/permission denied/);await db.exec('reset role');
await db.close();
console.log('439 PASS old bug reproduced; random presence/Auth/legacy IDs mapped correctly; rerun, private fields, switch/unequip, disabled/missing identities, auth checks and base RPC/save preservation');
