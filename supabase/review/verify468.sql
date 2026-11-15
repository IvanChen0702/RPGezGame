-- Read-only: no player rows, tokens, full saves or scheduled command bodies.
select to_regclass('public.mist_seasons465') is not null as foundation_ready,
       to_regclass('public.mist_runtime468') is not null as runtime_ready,
       to_regprocedure('public.game_mist_load468(text,uuid)') is not null as load_ready,
       to_regprocedure('public.game_mist_commit468(text,uuid,text,jsonb,bigint,jsonb,jsonb)') is not null as commit_ready,
       to_regprocedure('public.game_mist_reward_claim468(text,text,bigint)') is not null as claim_ready;
select c.relname,c.relrowsecurity as rls,
       has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') as anon_any_access,
       has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') as authenticated_any_access,
       has_table_privilege('service_role',c.oid,'TRUNCATE') as service_truncate
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relname in
('mist_seasons465','mist_players465','mist_cells465','mist_flags465','mist_reports465','mist_requests465','mist_runtime468','mist_commands468','mist_rewards468')
order by c.relname;
select p.proname,p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('game_mist_load468','game_mist_commit468','game_mist_reward_claim468');
select data_json->>'dataVersion' as planning_version,
       (select r->'Value' from jsonb_array_elements(data_json->'data'->'MistConfig') r where r->>'Key'='Enabled') as planning_enabled,
       jsonb_array_length(data_json->'data'->'MistEnemies') as enemy_designs,
       jsonb_array_length(data_json->'data'->'MistLootRules') as loot_rules
from public."GameDataCurrent" where channel='production';
select jobname,schedule,active from cron.job where jobname='rpg-background-tick';
