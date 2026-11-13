import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tables,quote,fixture,bodies,dml} from './permissions-fixture.mjs';
process.on('uncaughtException',e=>{console.error(e.message,e.where||'');process.exit(1)});
const sql=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const old=sql('../migrations/202611130002_restrict_public_privileges438.sql');
const migration=sql('../migrations/202611130004_project_privileges440.sql');
const platform=sql('../admin/restrict_platform_defaults441.sql');
const verification=sql('../review/verify438_439.sql');
const report=async db=>(await db.exec(verification)).find(r=>r.rows?.[0]?.patch_verification).rows[0].patch_verification;
const adminDefaults=async db=>(await db.query(`select d.defaclnamespace,d.defaclacl::text as acl from pg_default_acl d join pg_roles r on r.oid=d.defaclrole where r.rolname='supabase_admin' order by d.defaclnamespace`)).rows;
async function hostedFixture(){
 const db=await fixture(true);
 assert.deepEqual((await db.query(`select current_user as role,rolsuper,pg_has_role(current_user,'supabase_admin','MEMBER') as platform_member from pg_roles where rolname=current_user`)).rows[0],{role:'postgres',rolsuper:false,platform_member:false});
 return db;
}
const db=await hostedFixture();
const beforeBodies=await bodies(db),beforeDml=await dml(db),beforeAdmin=await adminDefaults(db);
await assert.rejects(()=>db.exec(old),/438_DEFAULT_ACL_OWNER_PERMISSION_REQUIRED: supabase_admin/);
await db.exec('rollback');
assert.equal((await db.query(`select has_table_privilege('anon','public."PlayerSaves"','TRUNCATE') as allowed`)).rows[0].allowed,true,'438 rolls back');
await db.exec(migration);await db.exec(migration);
assert.deepEqual(await bodies(db),beforeBodies);
assert.deepEqual(await dml(db),beforeDml);
assert.deepEqual(await adminDefaults(db),beforeAdmin,'platform ACLs must stay untouched');
for(const t of tables){
 assert.deepEqual((await db.query(`select has_table_privilege('anon',$1,'TRUNCATE') as anon,has_table_privilege('authenticated',$1,'TRUNCATE') as authenticated,has_table_privilege('service_role',$1,'TRUNCATE') as service`,['public.'+quote(t)])).rows[0],{anon:false,authenticated:false,service:true});
 assert.deepEqual((await db.query(`select * from public.${quote(t)}`)).rows,[{id:1,payload:'unchanged'}]);
}
let state=await report(db);
assert.equal(state.project_permissions_ready,true);
assert.equal(state.platform_defaults_ready,false);
assert.equal(state.all_permissions_ready,false);
assert.deepEqual(state.remaining_project_default_truncate,[]);
assert.equal(state.remaining_platform_default_truncate.length,4);
assert.deepEqual(state.remaining_default_truncate,state.remaining_platform_default_truncate);
await db.exec('create table public.future440(id integer);create table other_schema.future440(id integer);');
for(const table of ['public.future440','other_schema.future440']){
 assert.deepEqual((await db.query(`select has_table_privilege('anon',$1,'TRUNCATE') as truncate,has_table_privilege('authenticated',$1,'SELECT') as select,has_table_privilege('authenticated',$1,'INSERT') as insert`,[table])).rows[0],{truncate:false,select:true,insert:true});
}
// An unavailable platform follow-up must not undo the independently committed 440.
await assert.rejects(()=>db.exec(platform),/441_PLATFORM_OWNER_PERMISSION_REQUIRED: supabase_admin/);
await db.exec('rollback');
state=await report(db);assert.equal(state.project_permissions_ready,true);assert.equal(state.platform_defaults_ready,false);
assert.deepEqual(await adminDefaults(db),beforeAdmin);
// Switch caller only through the fixture superuser, never grant postgres platform rights.
await db.exec('reset role;set role anon');
await assert.rejects(()=>db.query(`select public.game_inventory_action('{}'::jsonb)`),/permission denied/);
await db.exec('reset role;set role authenticated');
await assert.rejects(()=>db.query(`select public.game_inventory_action('{}'::jsonb)`),/AUTH_REQUIRED/);
await db.exec(`set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'`);
assert.equal((await db.query(`select public.game_inventory_action('{}'::jsonb) as result`)).rows[0].result.ok,true);
assert.equal((await db.query('select public.game_equipment_bulk387() as result')).rows[0].result.ok,true);
await db.exec('reset role;set role service_role');
assert.equal((await db.query(`select public.game_inventory_action('{}'::jsonb) as result`)).rows[0].result.ok,true);
await db.exec('reset role');
await db.exec(platform);await db.exec(platform);
state=await report(db);assert.equal(state.project_permissions_ready,true);assert.equal(state.platform_defaults_ready,true);assert.equal(state.all_permissions_ready,true);
assert.deepEqual(state.remaining_default_truncate,[]);
await db.exec('set role supabase_admin;create table public.platform_future441(id integer);reset role;');
assert.deepEqual((await db.query(`select has_table_privilege('anon','public.platform_future441','TRUNCATE') as truncate,has_table_privilege('authenticated','public.platform_future441','SELECT') as select,has_table_privilege('authenticated','public.platform_future441','INSERT') as insert`)).rows[0],{truncate:false,select:true,insert:true});
await db.exec('set role postgres');
assert.deepEqual(await bodies(db),beforeBodies);
for(const t of tables)assert.deepEqual((await db.query(`select * from public.${quote(t)}`)).rows,[{id:1,payload:'unchanged'}]);
await db.close();
console.log('440/441 PASS hosted non-superuser postgres, original 438 failure, independent/idempotent scopes, explicit pending platform status, rows and callers preserved');

const drift=await hostedFixture();await drift.exec('grant truncate on public."Accounts" to public');
await assert.rejects(()=>drift.exec(migration),/440_TRUNCATE_STILL_EFFECTIVE/);await drift.exec('rollback');
assert.equal((await drift.query(`select has_table_privilege('anon','public."PlayerSaves"','TRUNCATE') as allowed`)).rows[0].allowed,true);
await drift.close();
const defaults=await hostedFixture();await defaults.exec('alter default privileges for role postgres grant truncate on tables to public');
await assert.rejects(()=>defaults.exec(migration),/440_DEFAULT_TRUNCATE_STILL_GRANTED/);await defaults.exec('rollback');
assert.equal((await defaults.query(`select has_table_privilege('anon','public."PlayerSaves"','TRUNCATE') as allowed`)).rows[0].allowed,true);
await defaults.close();
console.log('440 PASS unexpected PUBLIC table/default grants fail atomically');
