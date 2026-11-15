-- Approved retirement: W46 is the last boxing season.
-- The quest replacement preserves each accepted quest's accrued progress.
begin;
set local lock_timeout='3s';
create table public.game_quest_transition465 (
 account_id text primary key references public."Accounts"(account_id),
 objective_id text not null,
 old_baseline bigint not null,
 old_metric bigint not null,
 arena_metric bigint not null,
 preserved_progress integer not null check(preserved_progress between 0 and 3),
 new_baseline bigint not null,
 migrated_at timestamptz not null default now()
);
alter table public.game_quest_transition465 enable row level security;
revoke all on public.game_quest_transition465 from public,anon,authenticated,service_role;
grant select on public.game_quest_transition465 to service_role;

-- No future-season writes from an old Apps Script/client. Settlement and claims
-- use separate reward tables and remain untouched. No rows are removed.
create function public.game_boxing_final_guard465()
returns trigger language plpgsql security invoker set search_path='' as $$
declare r jsonb:=to_jsonb(new);o jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
begin
 if r->>'season_id' ~ '^[0-9]{4}-W[0-9]{2}$' and r->>'season_id'>'2026-W46'
 then raise exception 'BOXING_RETIRED';end if;
 if statement_timestamp()>='2026-11-15T15:00:00Z'::timestamptz then
  if tg_op='INSERT' or (tg_table_name='BoxingAttempts' and r->>'status' is distinct from o->>'status')
   or (tg_table_name='BoxingRanking' and r->'damage' is distinct from o->'damage')
  then raise exception 'BOXING_RETIRED';end if;
 end if;
 return new;
end $$;
revoke all on function public.game_boxing_final_guard465() from public,anon,authenticated;
create trigger boxing_attempts_final465 before insert or update on public."BoxingAttempts" for each row execute function public.game_boxing_final_guard465();
create trigger boxing_ranking_final465 before insert or update on public."BoxingRanking" for each row execute function public.game_boxing_final_guard465();

lock table public.game_quests368,public.game_quest_metrics368 in share row exclusive mode;
do $migration$
declare c public."GameDataCurrent"%rowtype; d jsonb; goals jsonb; dialogues jsonb; config jsonb;
 new_version text; stamp timestamptz:=clock_timestamp();
 texts jsonb:='{
 "kazama_secret_4_offer_0":"競技場，完成三場對戰。之前練過的次數，我都替你記著。",
 "kazama_secret_4_offer_1":"一定得贏嗎？",
 "kazama_secret_4_offer_2":"這次不看勝負，完成結算就算。我要你把整段攻勢做完。",
 "kazama_secret_4_offer_3":"對手還沒動，你先開始擺姿勢了？先把三場打完，帥氣留到領獎再說。"
 }';
begin
 select * into strict c from public."GameDataCurrent" where channel='production' for update;
 if c.version<>'20261115-043253-level464' then raise exception 'PLANNING_VERSION_CHANGED';end if;
 if (select count(*) from jsonb_array_elements(c.data_json->'data'->'QuestObjectives') r
  where r->>'ObjectiveID'='kazama_secret_4_1' and r->>'QuestID'='kazama_secret_4'
  and r->>'Type'='battle' and r->>'TargetID'='boxing' and (r->>'Quantity')::integer=3)<>1
 then raise exception 'BOXING_QUEST_CHANGED';end if;
 if (select count(*) from jsonb_array_elements(c.data_json->'data'->'QuestDialogues') r where texts ? (r->>'DialogueID'))<>4
 then raise exception 'BOXING_DIALOGUES_CHANGED';end if;
 -- A negative new baseline is intentional: e.g. zero prior arena fights and
 -- two earned boxing completions becomes 0 - (-2) = 2, not a reset to zero.
 insert into public.game_quest_transition465(account_id,objective_id,old_baseline,old_metric,arena_metric,preserved_progress,new_baseline)
 select q.account_id,'kazama_secret_4_1',coalesce((q.states#>>'{kazama_secret_4,baseline,kazama_secret_4_1}')::bigint,0),
  coalesce((m.metrics->>'battle:boxing:*')::bigint,0),coalesce((m.metrics->>'battle:arena:*')::bigint,0),
  least(3,greatest(0,coalesce((m.metrics->>'battle:boxing:*')::bigint,0)-coalesce((q.states#>>'{kazama_secret_4,baseline,kazama_secret_4_1}')::bigint,0)))::integer,
  coalesce((m.metrics->>'battle:arena:*')::bigint,0)-
   least(3,greatest(0,coalesce((m.metrics->>'battle:boxing:*')::bigint,0)-coalesce((q.states#>>'{kazama_secret_4,baseline,kazama_secret_4_1}')::bigint,0)))
 from public.game_quests368 q left join public.game_quest_metrics368 m using(account_id)
 where coalesce((q.states#>>'{kazama_secret_4,accepted}')::boolean,false)
  and not coalesce((q.states#>>'{kazama_secret_4,completed}')::boolean,false);
 update public.game_quests368 q set
  states=jsonb_set(q.states,'{kazama_secret_4}',(q.states->'kazama_secret_4')||
   jsonb_build_object('baseline',coalesce(q.states#>'{kazama_secret_4,baseline}','{}')||
    jsonb_build_object('kazama_secret_4_1',t.new_baseline),'boxingTransition465',true)),
  version=q.version+1
 from public.game_quest_transition465 t where t.account_id=q.account_id;
 select jsonb_agg(case when r->>'ObjectiveID'='kazama_secret_4_1' then
  r||'{"TargetID":"arena","Label":"完成競技場對戰結算","Quantity":3}'::jsonb else r end order by n)
 into goals from jsonb_array_elements(c.data_json->'data'->'QuestObjectives') with ordinality x(r,n);
 select jsonb_agg(case when texts ? (r->>'DialogueID') then r||jsonb_build_object('Text',texts->(r->>'DialogueID')) else r end order by n)
 into dialogues from jsonb_array_elements(c.data_json->'data'->'QuestDialogues') with ordinality x(r,n);
 select coalesce(jsonb_agg(r order by n),'[]') into config from jsonb_array_elements(c.data_json->'data'->'GameConfig') with ordinality x(r,n)
 where r->>'Key' not in ('BoxingFinalSeasonID','BoxingFinalEndAt','MistUnlockFloor');
 config:=config||'[{"Key":"BoxingFinalSeasonID","Value":"2026-W46"},{"Key":"BoxingFinalEndAt","Value":"2026-11-15T15:00:00Z"},{"Key":"MistUnlockFloor","Value":1}]';
 d:=jsonb_set(jsonb_set(jsonb_set(c.data_json,'{data,QuestObjectives}',goals),'{data,QuestDialogues}',dialogues),'{data,GameConfig}',config);
 if (d->'data')-array['QuestObjectives','QuestDialogues','GameConfig']<>(c.data_json->'data')-array['QuestObjectives','QuestDialogues','GameConfig']
 then raise exception 'UNEXPECTED_PLANNING_CHANGE';end if;
 new_version:=to_char(stamp at time zone 'UTC','YYYYMMDD-HH24MISS')||'-competition465';
 d:=d||jsonb_build_object('dataVersion',new_version,'generatedAt',stamp);
 insert into public."GameDataVersions"(version,published_at,published_by,data_json)
 select c.version,c.published_at,'competition465-before',c.data_json where not exists(select 1 from public."GameDataVersions" where version=c.version);
 insert into public."GameDataVersions"(version,published_at,published_by,data_json) values(new_version,stamp,'competition465-approved',d);
 update public."GameDataCurrent" set version=new_version,published_at=stamp,data_json=d where channel='production';
end $migration$;
-- Reject stale workbook republishes that would strand this quest again.
-- The updated maintenance GS reports the same issue before attempting publish.
create function public.game_competition_planning_guard465()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.channel='production' and exists(select 1 from jsonb_array_elements(new.data_json->'data'->'QuestObjectives') r
  where r->>'ObjectiveID'='kazama_secret_4_1' and r->>'TargetID'='boxing')
 then raise exception 'BOXING_QUEST_PLANNING_RETIRED_465: update QuestObjectives kazama_secret_4_1 to arena';end if;
 return new;
end $$;
revoke all on function public.game_competition_planning_guard465() from public,anon,authenticated;
create trigger competition_planning_guard465 before insert or update on public."GameDataCurrent"
 for each row execute function public.game_competition_planning_guard465();
commit;
