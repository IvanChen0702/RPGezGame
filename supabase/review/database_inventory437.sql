-- READ-ONLY inventory: no application rows, credentials, SQL text or save_json.
-- Estimates and zero scan counts are review signals, never deletion approval.
-- Run with a trusted administrative connection to the intended project.
begin transaction read only;
set local statement_timeout = '15s';
set local lock_timeout = '2s';

with relations as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
         c.relkind, c.reltuples::bigint as estimated_rows,
         pg_total_relation_size(c.oid) as total_bytes,
         pg_table_size(c.oid) as table_bytes, pg_indexes_size(c.oid) as index_bytes,
         c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
         coalesce(s.n_dead_tup,0) as estimated_dead_rows,
         s.last_autovacuum, s.last_autoanalyze, s.seq_scan, s.idx_scan,
         (select count(*) from pg_policy p where p.polrelid=c.oid) as policy_count
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    left join pg_stat_user_tables s on s.relid=c.oid
   where n.nspname='public' and c.relkind in ('r','p','m')
), indexes as (
  select i.indexrelid, i.indrelid, n.nspname as schema_name, t.relname as table_name,
         c.relname as index_name, pg_relation_size(i.indexrelid) as bytes,
         i.indisunique as is_unique, i.indisprimary as is_primary,
         i.indisvalid as is_valid, i.indisready as is_ready,
         i.indisexclusion as is_exclusion, s.idx_scan,
         exists(select 1 from pg_constraint k where k.conindid=i.indexrelid) as backs_constraint,
         pg_get_indexdef(i.indexrelid) as definition,
         substring(pg_get_indexdef(i.indexrelid) from ' USING .*') as structure
    from pg_index i join pg_class c on c.oid=i.indexrelid
    join pg_class t on t.oid=i.indrelid join pg_namespace n on n.oid=t.relnamespace
    left join pg_stat_user_indexes s on s.indexrelid=i.indexrelid
   where n.nspname='public'
), duplicate_indexes as (
  select schema_name, table_name, structure, is_unique, is_exclusion,
         array_agg(index_name order by index_name) as index_names,
         bool_or(backs_constraint) as any_constraint_backed,
         sum(bytes) as combined_bytes
    from indexes group by schema_name,table_name,structure,is_unique,is_exclusion
  having count(*)>1
), foreign_keys as (
  select n.nspname as schema_name, t.relname as table_name, k.conname as constraint_name,
         k.confrelid::regclass::text as referenced_table,
         array(select a.attname from unnest(k.conkey) with ordinality x(attnum,ord)
               join pg_attribute a on a.attrelid=k.conrelid and a.attnum=x.attnum order by ord) as columns,
         exists(select 1 from pg_index i join pg_class ic on ic.oid=i.indexrelid
                join pg_am am on am.oid=ic.relam
                 where i.indrelid=k.conrelid and i.indisvalid and i.indisready
                   and i.indpred is null and am.amname='btree'
                   and array(select num from unnest(i.indkey) with ordinality x(num,ord)
                             where ord<=cardinality(k.conkey) order by ord)=k.conkey) as has_leading_index
    from pg_constraint k join pg_class t on t.oid=k.conrelid
    join pg_namespace n on n.oid=t.relnamespace
   where k.contype='f' and n.nspname='public'
), routines as (
  select p.oid::regprocedure::text as signature, p.proname as name,
         p.prosecdef as security_definer,
         (select string_agg(setting,', ') from unnest(p.proconfig) setting
           where setting like 'search_path=%') as configured_search_path,
         has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
         has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
         (select jsonb_agg(jsonb_build_object('object_type',d.type,'schema',d.schema,'name',d.name))
            from pg_depend dep cross join lateral pg_identify_object(dep.refclassid,dep.refobjid,dep.refobjsubid) d
           where dep.classid='pg_proc'::regclass and dep.objid=p.oid
             and d.schema='public') as catalog_dependencies
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prokind='f'
)
select jsonb_build_object(
  'captured_at',current_timestamp,
  'server_version',current_setting('server_version'),
  'statistics_reset_at',(select stats_reset from pg_stat_database where datname=current_database()),
  'tables',coalesce((select jsonb_agg(to_jsonb(r)-'oid' order by total_bytes desc) from relations r),'[]'::jsonb),
  'indexes',coalesce((select jsonb_agg(to_jsonb(i)-'indexrelid'-'indrelid'-'structure' order by bytes desc) from indexes i),'[]'::jsonb),
  'duplicate_index_candidates',coalesce((select jsonb_agg(to_jsonb(d)) from duplicate_indexes d),'[]'::jsonb),
  'foreign_key_index_review',coalesce((select jsonb_agg(to_jsonb(f)) from foreign_keys f),'[]'::jsonb),
  'table_grants',coalesce((select jsonb_agg(jsonb_build_object('table',table_name,'role',grantee,'privilege',privilege_type))
                           from information_schema.table_privileges where table_schema='public'
                            and grantee in ('anon','authenticated','PUBLIC')),'[]'::jsonb),
  'policies',coalesce((select jsonb_agg(jsonb_build_object('table',tablename,'policy',policyname,'roles',roles,'command',cmd))
                       from pg_policies where schemaname='public'),'[]'::jsonb),
  'functions',coalesce((select jsonb_agg(to_jsonb(r) order by name,signature) from routines r),'[]'::jsonb),
  'notes',jsonb_build_array(
    'Estimated zero rows / zero scans do not establish that an object is unused.',
    'Function dependencies omit many PL/pgSQL body, dynamic SQL and external client references.',
    'Match functions with current game-api, GAS jobs, cached clients and pending battle/receipt recovery before retirement.',
    'This inventory does not query player data, planning contents or secrets, and performs no maintenance or deletion.'
  )
) as database_review;

rollback;
