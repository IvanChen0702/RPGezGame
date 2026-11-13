import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
process.on('uncaughtException',e=>{console.error(e.message,e.where||'');process.exit(1)});
const migration=readFileSync(new URL('../migrations/202611130002_restrict_public_privileges438.sql',import.meta.url),'utf8');
const tables=['Accounts','PlayerSaves','AuctionListings','RedeemCodeClaims','WorldBossState','WorldBossAttempts','WorldBossRewards','BoxingAttempts','BoxingRanking','BoxingRewards','GameDataVersions','GameDataCurrent','ArenaPlayers','ArenaDefenseSnapshots','ArenaDailyMatches','ArenaBattles','ArenaRevenge','ArenaBattleReports','ArenaSeasonRewards'];
const verification=readFileSync(new URL('../review/verify438_439.sql',import.meta.url),'utf8');
const quote=name=>'"'+name.replaceAll('"','""')+'"';
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create role supabase_admin;
 create schema auth;create schema other_schema;
 grant usage on schema public,auth to anon,authenticated,service_role;
 grant usage,create on schema public to supabase_admin;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 alter default privileges for role postgres grant select,insert,truncate on tables to anon,authenticated;
 alter default privileges for role postgres in schema public grant update,truncate on tables to anon,authenticated;
 alter default privileges for role supabase_admin grant select,truncate on tables to anon,authenticated;
 alter default privileges for role supabase_admin in schema public grant insert,truncate on tables to anon,authenticated;
 create function public.game_inventory_action(p_request_id uuid,p_expected_revision bigint,p_operation jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 return jsonb_build_object('ok',true,'operation',p_operation);end;$$;
 create function public.game_inventory_action(p_operation jsonb) returns jsonb language sql security definer set search_path='' as $$select public.game_inventory_action('00000000-0000-0000-0000-000000000001',1,p_operation)$$;
 create function public.game_equipment_bulk387() returns jsonb language sql security definer set search_path='' as $$select public.game_inventory_action('{"bulk":true}'::jsonb)$$;
 grant execute on function public.game_inventory_action(uuid,bigint,jsonb) to anon;
 create table public.unrelated_table(id integer primary key);
 grant all on public.unrelated_table to anon,authenticated,service_role;`);
 for(const t of tables)await db.exec(`create table public.${quote(t)}(id integer primary key,payload text);insert into public.${quote(t)} values (1,'unchanged');grant select,insert,update,delete,references,trigger,truncate on public.${quote(t)} to anon,authenticated,service_role;`);
 return db;
}
const bodies=async db=>(await db.query("select pg_get_functiondef(oid) as definition from pg_proc where proname in ('game_inventory_action','game_equipment_bulk387') order by oid")).rows;
const dml=async db=>(await db.query(`select table_name,grantee,privilege_type,is_grantable from information_schema.table_privileges where table_schema='public' and privilege_type<>'TRUNCATE' order by table_name,grantee,privilege_type`)).rows;
const db=await fixture();const beforeBodies=await bodies(db),beforeDml=await dml(db);
await db.exec(migration);await db.exec(migration);
assert.deepEqual(await bodies(db),beforeBodies,'function bodies must be unchanged');assert.deepEqual(await dml(db),beforeDml,'non-TRUNCATE table privileges must be unchanged');
for(const t of tables){
 const result=(await db.query(`select has_table_privilege('anon',$1,'TRUNCATE') as anon,has_table_privilege('authenticated',$1,'TRUNCATE') as authenticated,has_table_privilege('service_role',$1,'TRUNCATE') as service`,['public.'+quote(t)])).rows[0];
 assert.deepEqual(result,{anon:false,authenticated:false,service:true});assert.equal((await db.query(`select payload from public.${quote(t)}`)).rows[0].payload,'unchanged');
}
assert.equal((await db.query("select has_table_privilege('anon','public.unrelated_table','TRUNCATE') as allowed")).rows[0].allowed,true);
for(const owner of ['postgres','supabase_admin']){
 await db.exec(`set role ${owner};create table public.${owner}_future438(id integer);reset role;`);
 const rights=(await db.query(`select has_table_privilege('anon',$1,'TRUNCATE') as truncate,has_table_privilege('authenticated',$1,'SELECT') as select,has_table_privilege('authenticated',$1,'INSERT') as insert`,['public.'+owner+'_future438'])).rows[0];
 assert.deepEqual(rights,{truncate:false,select:true,insert:true});
}
await db.exec(`create table other_schema.future438(id integer);`);
assert.equal((await db.query("select has_table_privilege('anon','other_schema.future438','TRUNCATE') as allowed")).rows[0].allowed,false,'global defaults must also be revoked');
await db.exec(`set role anon`);
await assert.rejects(()=>db.query(`select public.game_inventory_action('{}'::jsonb)`),/permission denied/);
await db.exec(`reset role;set role authenticated`);
await assert.rejects(()=>db.query(`select public.game_inventory_action('{}'::jsonb)`),/AUTH_REQUIRED/);
await db.exec(`set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'`);
assert.equal((await db.query(`select public.game_inventory_action('{}'::jsonb) as result`)).rows[0].result.ok,true);
assert.equal((await db.query(`select public.game_equipment_bulk387() as result`)).rows[0].result.ok,true,'definer wrapper must still work');
await db.exec('reset role;set role service_role');assert.equal((await db.query(`select public.game_inventory_action('{}'::jsonb) as result`)).rows[0].result.ok,true);
await db.exec('reset role');
const report=(await db.exec(verification)).find(r=>r.rows?.[0]?.patch_verification).rows[0].patch_verification;
assert.equal(report.found_table_count,19);assert.deepEqual(report.remaining_table_truncate,[]);assert.deepEqual(report.remaining_default_truncate,[]);
assert(report.inventory.every(r=>!r.anon_execute&&!r.public_execute&&r.authenticated_execute&&r.service_execute));
await db.close();
console.log('438 PASS idempotent migration, 19 table ACLs, both default owners/scopes, authenticated/server/bulk calls, function and row preservation');

// Unexpected inherited access fails verification and rolls back earlier REVOKEs.
const drift=await fixture();await drift.exec('grant truncate on public."Accounts" to public');
await assert.rejects(()=>drift.exec(migration),/438_TRUNCATE_STILL_EFFECTIVE/);await drift.exec('rollback');
assert.equal((await drift.query("select has_table_privilege('anon','public.\"PlayerSaves\"','TRUNCATE') as allowed")).rows[0].allowed,true);
assert.equal((await drift.query("select has_function_privilege('anon','public.game_inventory_action(jsonb)','EXECUTE') as allowed")).rows[0].allowed,true);
await drift.close();
const limited=await fixture();await limited.exec('create role migration_runner;grant usage on schema public to migration_runner;set role migration_runner');
await assert.rejects(()=>limited.exec(migration),/438_DEFAULT_ACL_OWNER_PERMISSION_REQUIRED/);await limited.exec('rollback;reset role');
assert.equal((await limited.query("select has_table_privilege('anon','public.\"PlayerSaves\"','TRUNCATE') as allowed")).rows[0].allowed,true);await limited.close();
console.log('438 PASS unexpected PUBLIC access and missing owner permission fail without partial changes');
const defaultDrift=await fixture();await defaultDrift.exec('alter default privileges for role postgres grant truncate on tables to public');
await assert.rejects(()=>defaultDrift.exec(migration),/438_DEFAULT_TRUNCATE_STILL_GRANTED/);await defaultDrift.exec('rollback');
assert.equal((await defaultDrift.query("select has_table_privilege('anon','public.\"PlayerSaves\"','TRUNCATE') as allowed")).rows[0].allowed,true);await defaultDrift.close();
console.log('438 PASS unexpected PUBLIC default privileges cannot silently defeat the restriction');
