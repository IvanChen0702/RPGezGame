import {PGlite} from '@electric-sql/pglite';
export const tables=['Accounts','PlayerSaves','AuctionListings','RedeemCodeClaims','WorldBossState','WorldBossAttempts','WorldBossRewards','BoxingAttempts','BoxingRanking','BoxingRewards','GameDataVersions','GameDataCurrent','ArenaPlayers','ArenaDefenseSnapshots','ArenaDailyMatches','ArenaBattles','ArenaRevenge','ArenaBattleReports','ArenaSeasonRewards'];
export const quote=name=>'"'+name.replaceAll('"','""')+'"';
export async function fixture(hosted=false){
 const db=new PGlite();
 // PostgreSQL cannot demote its bootstrap superuser. Rename that fixture role,
 // then create a distinct non-superuser postgres to model hosted project access.
 if(hosted)await db.exec(`create role fixture_admin superuser login;
 set session authorization fixture_admin;
 alter role postgres rename to fixture_bootstrap;
 create role postgres nosuperuser;`);
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
 if(hosted){
  for(const t of [...tables,'unrelated_table'])await db.exec(`alter table public.${quote(t)} owner to postgres`);
  for(const f of ['auth.uid()','public.game_inventory_action(uuid,bigint,jsonb)','public.game_inventory_action(jsonb)','public.game_equipment_bulk387()'])await db.exec(`alter function ${f} owner to postgres`);
  for(const schema of ['public','auth','other_schema'])await db.exec(`alter schema ${schema} owner to postgres`);
  await db.exec('set role postgres');
 }
 return db;
}
export const bodies=async db=>(await db.query("select pg_get_functiondef(oid) as definition from pg_proc where proname in ('game_inventory_action','game_equipment_bulk387') order by oid")).rows;
export const dml=async db=>(await db.query(`select table_name,grantee,privilege_type,is_grantable from information_schema.table_privileges where table_schema='public' and privilege_type<>'TRUNCATE' order by table_name,grantee,privilege_type`)).rows;
