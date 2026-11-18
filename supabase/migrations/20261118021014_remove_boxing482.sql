-- Explicitly approved full retirement. Retain earned player items and the
-- already migrated arena quest baseline; remove only this mode's records.
begin;
set local lock_timeout='5s';
-- Planning sanitizer also prevents an older workbook publisher from restoring
-- retired data. Mist gets its own frozen reward row before the source is removed.
create function public.game_planning_cleanup482(p jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare d jsonb:=coalesce(p->'data',p); rewards jsonb; r jsonb; k text; rows jsonb;
begin
 rewards:=d->'MistRankRewards';
 if rewards is null then
  select jsonb_agg(value - array['SeasonID','StartAt','EndAt','Enabled','__row']) into rewards
  from jsonb_array_elements(coalesce(d->'BoxingSeasons_SCHEMA','[]')) where value->>'SeasonID'='2026-W42';
 end if;
 if rewards is not null then d:=d||jsonb_build_object('MistRankRewards',rewards);end if;
 for k in select key from jsonb_each(d) where key ilike '%boxing%' loop d:=d-k;end loop;
 if d ? 'GameConfig' then
  select coalesce(jsonb_agg(value),'[]') into rows from jsonb_array_elements(d->'GameConfig') where value->>'Key' not ilike '%boxing%';
  d:=jsonb_set(d,'{GameConfig}',rows);
 end if;
 if d ? 'MistConfig' then
  select coalesce(jsonb_agg(case when value->>'Key'='RewardTemplate' then value||'{"Value":"MistRankRewards"}' else value end),'[]') into rows from jsonb_array_elements(d->'MistConfig');
  d:=jsonb_set(d,'{MistConfig}',rows);
 end if;
 if d ? 'QuestObjectives' then
  select coalesce(jsonb_agg(case when value->>'Type'='battle' and value->>'TargetID'='boxing' then value||'{"TargetID":"arena","Label":"完成競技場對戰結算"}' else value end),'[]') into rows from jsonb_array_elements(d->'QuestObjectives');
  d:=jsonb_set(d,'{QuestObjectives}',rows);
 end if;
 -- Update old archived prose too; no player progress is derived from this text.
 foreach k in array array['Quests','QuestDialogues','QuestObjectives'] loop
  if d ? k then
   select coalesce(jsonb_agg(replace(value::text,'拳擊機','競技場')::jsonb),'[]') into rows from jsonb_array_elements(d->k);
   d:=jsonb_set(d,array[k],rows);
  end if;
 end loop;
 return case when p ? 'data' then jsonb_set(p,'{data}',d) else d end;
end $$;
revoke all on function public.game_planning_cleanup482(jsonb) from public,anon,authenticated;
grant execute on function public.game_planning_cleanup482(jsonb) to service_role;
drop trigger competition_planning_guard465 on public."GameDataCurrent";
drop function public.game_competition_planning_guard465();
create function public.game_planning_guard482() returns trigger language plpgsql set search_path='' as $$
begin new.data_json:=public.game_planning_cleanup482(new.data_json); return new;end $$;
revoke all on function public.game_planning_guard482() from public,anon,authenticated;
create trigger planning_guard482 before insert or update on public."GameDataCurrent" for each row execute function public.game_planning_guard482();
create trigger planning_archive_guard482 before insert or update on public."GameDataVersions" for each row execute function public.game_planning_guard482();
update public."GameDataVersions" set data_json=public.game_planning_cleanup482(data_json);
update public."GameDataCurrent" set data_json=public.game_planning_cleanup482(data_json);
update public.mist_seasons465 set rules=jsonb_set(rules,'{planning}',public.game_planning_cleanup482(rules->'planning')) where rules ? 'planning';
-- A fresh public version invalidates every client's planning cache.
do $$ declare c public."GameDataCurrent"%rowtype; stamp timestamptz:=clock_timestamp(); v text; d jsonb;begin
 select * into strict c from public."GameDataCurrent" where channel='production' for update;
 if jsonb_array_length(c.data_json->'data'->'MistRankRewards')<>1 then raise exception 'MIST_REWARDS_MISSING';end if;
 v:=to_char(stamp at time zone 'UTC','YYYYMMDD-HH24MISS')||'-cleanup482';
 d:=c.data_json||jsonb_build_object('dataVersion',v,'generatedAt',stamp);
 insert into public."GameDataVersions"(version,published_at,published_by,data_json) values(v,stamp,'cleanup482-approved',d);
 update public."GameDataCurrent" set version=v,published_at=stamp,data_json=d where channel='production';
 execute replace(pg_get_functiondef('public.game_mist_load468(text,uuid)'::regprocedure),'BoxingSeasons_SCHEMA','MistRankRewards');
end $$;
-- Only the retired job is removed. The shared tick still runs Mist and world boss.
do $$ declare j record;begin for j in select jobid from cron.job where jobname='boxing-weekly-settlement137' loop
 delete from cron.job_run_details where jobid=j.jobid;
 perform cron.unschedule(j.jobid);
end loop;end $$;
drop table public."BoxingAttempts",public."BoxingRanking",public."BoxingRewards",public.game_boxing_quest_runs379;
drop function public.game_quest_boxing_event368();
drop function public.game_boxing_quest_start379(text,uuid,text,integer,numeric,boolean);
drop function public.game_boxing_quest_finish379(text,uuid,jsonb);
drop function public.game_boxing_final_guard465();
-- Audit table is no longer needed; migrated baselines live in game_quests368.
drop table public.game_quest_transition465;
update public.game_quest_metrics368 set metrics=metrics-'battle:boxing:*' where metrics ? 'battle:boxing:*';
update public.game_quests368 set states=states #- '{kazama_secret_4,boxingTransition465}' where states#>'{kazama_secret_4,boxingTransition465}' is not null;
update public."PlayerSaves" set save_json=save_json #- '{serverReceipts,boxing}',revision=revision+1,updated_at=now() where save_json#>'{serverReceipts,boxing}' is not null;
delete from public.game_backup411 where table_name ilike '%boxing%';
delete from public.game_runtime_config where name ilike '%boxing%';
commit;
