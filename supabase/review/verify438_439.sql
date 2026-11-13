-- Read-only pre/post deployment report for 439/440 and optional platform follow-up 441. Never calls a game/presence RPC.
-- Expected pet implementation is matched by prosrc hash, not a name/version guess.
begin transaction read only;
set local statement_timeout = '15s';
with expected_tables(name) as (
  select unnest(array['Accounts','PlayerSaves','AuctionListings','RedeemCodeClaims',
    'WorldBossState','WorldBossAttempts','WorldBossRewards','BoxingAttempts','BoxingRanking','BoxingRewards',
    'GameDataVersions','GameDataCurrent','ArenaPlayers','ArenaDefenseSnapshots','ArenaDailyMatches',
    'ArenaBattles','ArenaRevenge','ArenaBattleReports','ArenaSeasonRewards'])
), tables as (
  select e.name,c.oid from expected_tables e
    left join pg_namespace n on n.nspname='public'
    left join pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind in ('r','p')
), table_access as (
  select t.name,r.role,has_table_privilege(r.role,t.oid,'TRUNCATE') as truncate_allowed
    from tables t cross join unnest(array['anon','authenticated']) r(role)
), default_access as (
  select owner.rolname as owner,
         case when d.defaclnamespace=0 then '(global)' else 'public' end as scope,
         coalesce(grantee.rolname,'PUBLIC') as grantee
    from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole
    cross join lateral aclexplode(d.defaclacl) a left join pg_roles grantee on grantee.oid=a.grantee
   where owner.rolname in ('postgres','supabase_admin') and d.defaclobjtype='r'
     and (d.defaclnamespace=0 or d.defaclnamespace='public'::regnamespace)
     and a.privilege_type='TRUNCATE'
     and case when a.grantee=0 then true else
       pg_has_role('anon',a.grantee,'USAGE') or pg_has_role('authenticated',a.grantee,'USAGE') end
), inventory as (
  select p.oid::regprocedure::text as signature,
         has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
         has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
         has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute,
         exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                 where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='game_inventory_action' and p.prokind='f'
), presence as (
  select md5(p.prosrc)='606d6a10f2532f8c3d1a02f1617c9477' as matches_patch439,
         p.prosecdef as security_definer,
         p.proconfig as function_settings,
         has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
         has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
    from pg_proc p
   where p.oid=to_regprocedure('public.game_town_presence436(integer,text,boolean,boolean)')
), readiness as (
  select (select count(oid)=19 from tables)
     and not exists(select 1 from table_access where truncate_allowed)
     and not exists(select 1 from default_access where owner='postgres')
     and exists(select 1 from inventory)
     and not exists(select 1 from inventory where anon_execute or public_execute
                    or not authenticated_execute or not service_execute) as project_ready,
     not exists(select 1 from default_access where owner='supabase_admin') as platform_ready
)
select jsonb_build_object(
  'checked_at',current_timestamp,
  'executor_role',current_user,
  'expected_table_count',19,
  'found_table_count',(select count(oid) from tables),
  'remaining_table_truncate',coalesce((select jsonb_agg(to_jsonb(t)) from table_access t where truncate_allowed),'[]'::jsonb),
  'remaining_default_truncate',coalesce((select jsonb_agg(to_jsonb(d)) from default_access d),'[]'::jsonb),
  'remaining_project_default_truncate',coalesce((select jsonb_agg(to_jsonb(d)) from default_access d where owner='postgres'),'[]'::jsonb),
  'remaining_platform_default_truncate',coalesce((select jsonb_agg(to_jsonb(d)) from default_access d where owner='supabase_admin'),'[]'::jsonb),
  'project_permissions_ready',(select project_ready from readiness),
  'platform_defaults_ready',(select platform_ready from readiness),
  'all_permissions_ready',(select project_ready and platform_ready from readiness),
  'default_owner_membership',(select jsonb_agg(jsonb_build_object('owner',r.rolname,'executor_is_superuser',
    (select rolsuper from pg_roles where rolname=current_user),'executor_is_member',pg_has_role(current_user,r.oid,'MEMBER')))
    from pg_roles r where r.rolname in ('postgres','supabase_admin')),
  'inventory',coalesce((select jsonb_agg(to_jsonb(i)) from inventory i),'[]'::jsonb),
  'presence',(select to_jsonb(p) from presence p),
  'base358_present',to_regprocedure('public.game_town_presence358(integer,text,boolean,boolean)') is not null,
  'base420_present',to_regprocedure('public.game_town_presence420(integer,text,boolean,boolean)') is not null
) as patch_verification;
rollback;
