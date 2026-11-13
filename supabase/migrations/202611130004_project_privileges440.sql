-- 440 replaces the project-owned portion of 438 for hosted Supabase.
-- Scope: the 19 audited tables, postgres table defaults and inventory RPC ACLs.
-- Does NOT change supabase_admin defaults or grant membership in that role.
-- Platform defaults are a separate follow-up in admin/restrict_platform_defaults441.sql.
-- Apply as the project postgres role (or an authorized owner administrator).
-- This transaction is atomic within the project-owned scope. Run verify438_439.sql
-- afterwards: project_permissions_ready is separate from platform_defaults_ready.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
set local search_path = '';

do $migration$
declare
  table_names constant text[] := array[
    'Accounts','PlayerSaves','AuctionListings','RedeemCodeClaims',
    'WorldBossState','WorldBossAttempts','WorldBossRewards',
    'BoxingAttempts','BoxingRanking','BoxingRewards',
    'GameDataVersions','GameDataCurrent','ArenaPlayers','ArenaDefenseSnapshots',
    'ArenaDailyMatches','ArenaBattles','ArenaRevenge','ArenaBattleReports','ArenaSeasonRewards'
  ];
  table_ids oid[];
  function_ids oid[];
  role_name text;
  entry record;
  name text;
  other_table_privileges jsonb;
  after_table_privileges jsonb;
begin
  -- Validate the objects before touching any grant. Do not silently skip drift.
  foreach role_name in array array['anon','authenticated','service_role','postgres'] loop
    if not exists(select 1 from pg_roles where rolname=role_name) then
      raise exception '440_ROLE_NOT_FOUND: %', role_name;
    end if;
  end loop;
  foreach name in array table_names loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relname=name and c.relkind in ('r','p')) then
      raise exception '440_TABLE_NOT_FOUND: public.%', name;
    end if;
  end loop;
  select array_agg(c.oid order by c.oid) into table_ids
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=any(table_names);
  select array_agg(p.oid order by p.oid) into function_ids
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='game_inventory_action' and p.prokind='f';
  if coalesce(cardinality(function_ids),0)=0 then
    raise exception '440_INVENTORY_FUNCTION_NOT_FOUND';
  end if;

  -- A schema-specific REVOKE cannot undo global default grants. Review and
  -- revoke both GLOBAL and public-schema TRUNCATE grants, and no other rights.
  -- Do not attempt privilege escalation if the deployment role lacks ownership.
  for entry in
    select distinct owner.rolname as owner_name
      from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole
      cross join lateral aclexplode(d.defaclacl) a join pg_roles grantee on grantee.oid=a.grantee
     where owner.rolname='postgres' and d.defaclobjtype='r'
       and (d.defaclnamespace=0 or d.defaclnamespace='public'::regnamespace)
       and grantee.rolname in ('anon','authenticated') and a.privilege_type='TRUNCATE'
  loop
    if not exists(select 1 from pg_roles where rolname=current_user and rolsuper)
       and not pg_has_role(current_user,entry.owner_name,'MEMBER') then
      raise exception '440_DEFAULT_ACL_OWNER_PERMISSION_REQUIRED: %', entry.owner_name;
    end if;
  end loop;

  select jsonb_agg(jsonb_build_array(t.id,r.role,p.privilege,
                   has_table_privilege(r.role,t.id,p.privilege)) order by t.id,r.role,p.privilege)
    into other_table_privileges
    from unnest(table_ids) t(id)
    cross join unnest(array['anon','authenticated','service_role']) r(role)
    cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','REFERENCES','TRIGGER']) p(privilege);

  foreach name in array table_names loop
    execute format('revoke truncate on table public.%I from anon, authenticated',name);
  end loop;
  for entry in
    select distinct owner.rolname as owner_name,d.defaclnamespace as namespace_id
      from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole
      cross join lateral aclexplode(d.defaclacl) a join pg_roles grantee on grantee.oid=a.grantee
     where owner.rolname='postgres' and d.defaclobjtype='r'
       and (d.defaclnamespace=0 or d.defaclnamespace='public'::regnamespace)
       and grantee.rolname in ('anon','authenticated') and a.privilege_type='TRUNCATE'
  loop
    execute format('alter default privileges for role %I %s revoke truncate on tables from anon, authenticated',
                   entry.owner_name,case when entry.namespace_id=0 then '' else 'in schema public' end);
  end loop;

  -- Preserve authenticated clients and trusted server callers even if they
  -- previously relied on PUBLIC EXECUTE. Function implementations stay intact.
  for entry in select oid,oid::regprocedure::text as signature from pg_proc where oid=any(function_ids) loop
    execute format('grant execute on function %s to authenticated, service_role',entry.signature);
    execute format('revoke execute on function %s from public, anon',entry.signature);
  end loop;

  if exists(select 1 from unnest(table_ids) t(id)
              cross join unnest(array['anon','authenticated']) r(role)
             where has_table_privilege(r.role,t.id,'TRUNCATE')) then
    raise exception '440_TRUNCATE_STILL_EFFECTIVE: review inherited or PUBLIC grants';
  end if;
  if exists(select 1 from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole
              cross join lateral aclexplode(d.defaclacl) a
             where owner.rolname='postgres' and d.defaclobjtype='r'
               and (d.defaclnamespace=0 or d.defaclnamespace='public'::regnamespace)
               and a.privilege_type='TRUNCATE'
               and case when a.grantee=0 then true else
                 pg_has_role('anon',a.grantee,'USAGE') or pg_has_role('authenticated',a.grantee,'USAGE') end) then
    raise exception '440_DEFAULT_TRUNCATE_STILL_GRANTED';
  end if;
  if exists(select 1 from unnest(function_ids) f(id)
             where has_function_privilege('anon',f.id,'EXECUTE')
                or not has_function_privilege('authenticated',f.id,'EXECUTE')
                or not has_function_privilege('service_role',f.id,'EXECUTE'))
     or exists(select 1 from pg_proc p
                 cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                where p.oid=any(function_ids) and a.grantee=0 and a.privilege_type='EXECUTE') then
    raise exception '440_INVENTORY_EXECUTE_VERIFY_FAILED';
  end if;
  select jsonb_agg(jsonb_build_array(t.id,r.role,p.privilege,
                   has_table_privilege(r.role,t.id,p.privilege)) order by t.id,r.role,p.privilege)
    into after_table_privileges
    from unnest(table_ids) t(id)
    cross join unnest(array['anon','authenticated','service_role']) r(role)
    cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','REFERENCES','TRIGGER']) p(privilege);
  if other_table_privileges is distinct from after_table_privileges then
    raise exception '440_UNRELATED_TABLE_PRIVILEGES_CHANGED';
  end if;
end;
$migration$;

notify pgrst, 'reload schema';
commit;
