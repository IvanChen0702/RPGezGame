-- Platform-admin follow-up only; not part of the project migration sequence.
-- A hosted project's postgres/service_role connection may NOT own these ACLs.
-- Never grant or impersonate supabase_admin to work around a permission error.
-- A platform-authorized administrator may apply this independently of 440.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
set local search_path = '';
do $platform$
declare entry record;
begin
  if not exists(select 1 from pg_roles where rolname='supabase_admin') then
    raise exception '441_PLATFORM_ROLE_NOT_FOUND';
  end if;
  if not exists(select 1 from pg_roles where rolname=current_user and rolsuper)
     and not pg_has_role(current_user,'supabase_admin','MEMBER') then
    raise exception '441_PLATFORM_OWNER_PERMISSION_REQUIRED: supabase_admin';
  end if;
  for entry in
    select distinct d.defaclnamespace as namespace_id
      from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole
      cross join lateral aclexplode(d.defaclacl) a join pg_roles grantee on grantee.oid=a.grantee
     where owner.rolname='supabase_admin' and d.defaclobjtype='r'
       and (d.defaclnamespace=0 or d.defaclnamespace='public'::regnamespace)
       and grantee.rolname in ('anon','authenticated') and a.privilege_type='TRUNCATE'
  loop
    execute format('alter default privileges for role supabase_admin %s revoke truncate on tables from anon, authenticated',
                   case when entry.namespace_id=0 then '' else 'in schema public' end);
  end loop;
  if exists(select 1 from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole
              cross join lateral aclexplode(d.defaclacl) a
             where owner.rolname='supabase_admin' and d.defaclobjtype='r'
               and (d.defaclnamespace=0 or d.defaclnamespace='public'::regnamespace)
               and a.privilege_type='TRUNCATE'
               and case when a.grantee=0 then true else
                 pg_has_role('anon',a.grantee,'USAGE') or pg_has_role('authenticated',a.grantee,'USAGE') end) then
    raise exception '441_PLATFORM_DEFAULT_TRUNCATE_STILL_GRANTED';
  end if;
end;
$platform$;
commit;
