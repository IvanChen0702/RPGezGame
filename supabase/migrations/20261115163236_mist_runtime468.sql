-- Mode transactions use an optimistic version; no game-wide lease or network work under a DB lock.
begin;
alter table public.mist_players465 add column runtime jsonb not null default '{}';
create table public.mist_runtime468(id boolean primary key default true check(id),revision bigint not null default 0,meta jsonb not null default '{}');
insert into public.mist_runtime468(id) values(true);
create table public.mist_commands468(account_id text not null references public."Accounts",request_id uuid not null,action text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(account_id,request_id));
create table public.mist_rewards468(season_id text not null references public.mist_seasons465,account_id text not null references public."Accounts",rank integer not null,reward jsonb not null,claimed_at timestamptz,primary key(season_id,account_id));
create function public.game_mist_load468(p_account text,p_request uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare w jsonb; s text;
begin
 if p_account is not null and not exists(select 1 from public."Accounts" a join public."PlayerSaves" sv using(account_id) where a.account_id=p_account and not coalesce(a.disabled,false) and (sv.save_json->>'mainProgressEpoch')::integer=411 and coalesce((sv.save_json->>'maxCleared')::integer,0)>=1) then raise exception 'MIST_NOT_UNLOCKED';end if;
 select id into s from public.mist_seasons465 order by starts_at desc limit 1;
 select jsonb_build_object('revision',r.revision,'meta',r.meta,'season',(select to_jsonb(t) from public.mist_seasons465 t where id=s),'players',coalesce((select jsonb_object_agg(account_id,to_jsonb(p)) from public.mist_players465 p where season_id=s),'{}'), 'cells',coalesce((select jsonb_agg(to_jsonb(c)) from public.mist_cells465 c where season_id=s),'[]'),'flags',coalesce((select jsonb_agg(to_jsonb(f)) from public.mist_flags465 f where season_id=s),'[]')) into w from public.mist_runtime468 r where id=true;
 return jsonb_build_object('world',w,'now',statement_timestamp(),'planning',(select jsonb_build_object('dataVersion',data_json->'dataVersion','data',(select jsonb_object_agg(key,value) from jsonb_each(data_json->'data') where key in ('GameConfig','MistConfig','MistEnemies','MistLootRules','Equipment','Skills','Gems','Enhancement','StatusEffects','BoxingSeasons_SCHEMA'))) from public."GameDataCurrent" where channel='production'),'save',(select jsonb_build_object('skillsOwned',save_json->'skillsOwned','equippedSkills',save_json->'equippedSkills','passive',save_json->'passive') from public."PlayerSaves" where account_id=p_account),'nickname',(select nickname from public."Accounts" where account_id=p_account),'previous',(select to_jsonb(c) from public.mist_commands468 c where account_id=p_account and request_id=p_request),'rewards',coalesce((select jsonb_agg(to_jsonb(r)) from public.mist_rewards468 r where account_id=p_account and claimed_at is null),'[]'));
end $$;
create function public.game_mist_commit468(p_account text,p_request uuid,p_action text,p_payload jsonb,p_revision bigint,p_patch jsonb,p_result jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare old public.mist_commands468%rowtype;r jsonb;s text;v bigint;
begin
 set local lock_timeout='3s';
 select revision into v from public.mist_runtime468 where id=true for update;
 select * into old from public.mist_commands468 where account_id=p_account and request_id=p_request;
 if found then if old.action<>p_action or old.payload<>p_payload then raise exception 'MIST_REQUEST_REUSED';end if;return old.result;end if;
 if v<>p_revision then return jsonb_build_object('ok',false,'error','MIST_RETRY');end if;
 if p_account is not null and not exists(select 1 from public."Accounts" where account_id=p_account and not coalesce(disabled,false)) then raise exception 'ACCOUNT_DISABLED';end if;
 -- The caller is service_role only. Apply only changed records, within one short transaction.
 for r in select value from jsonb_array_elements(coalesce(p_patch->'seasons','[]')) loop
  insert into public.mist_seasons465 select * from jsonb_populate_record(null::public.mist_seasons465,r)
  on conflict(id) do update set size=excluded.size,status=excluded.status,rules=excluded.rules;
 end loop;
 for r in select value from jsonb_array_elements(coalesce(p_patch->'players','[]')) loop
  insert into public.mist_players465 select * from jsonb_populate_record(null::public.mist_players465,r)
  on conflict(season_id,account_id) do update set nickname=excluded.nickname,hp=excluded.hp,max_hp=excluded.max_hp,energy=excluded.energy,energy_at=excluded.energy_at,points=excluded.points,kills=excluded.kills,protected_until=excluded.protected_until,hidden_until=excluded.hidden_until,supplied_on=excluded.supplied_on,battle_id=excluded.battle_id,revision=excluded.revision,equipment=excluded.equipment,inventory=excluded.inventory,pending_loot=excluded.pending_loot,skills=excluded.skills,defense_snapshot=excluded.defense_snapshot,runtime=excluded.runtime;
 end loop;
 delete from public.mist_cells465 where id in(select value::uuid from jsonb_array_elements_text(coalesce(p_patch->'deleteCells','[]')));
 for r in select value from jsonb_array_elements(coalesce(p_patch->'cells','[]')) loop
  insert into public.mist_cells465 select * from jsonb_populate_record(null::public.mist_cells465,r) on conflict(id) do update set x=excluded.x,y=excluded.y,kind=excluded.kind,owner_account=excluded.owner_account,payload=excluded.payload;
 end loop;
 for r in select value from jsonb_array_elements(coalesce(p_patch->'deleteFlags','[]')) loop delete from public.mist_flags465 where season_id=r->>'season_id' and x=(r->>'x')::integer and y=(r->>'y')::integer;end loop;
 for r in select value from jsonb_array_elements(coalesce(p_patch->'flags','[]')) loop insert into public.mist_flags465 select * from jsonb_populate_record(null::public.mist_flags465,r) on conflict(season_id,x,y) do update set owner_account=excluded.owner_account;end loop;
 for r in select value from jsonb_array_elements(coalesce(p_patch->'reports','[]')) loop insert into public.mist_reports465 select * from jsonb_populate_record(null::public.mist_reports465,r) on conflict(id) do nothing;end loop;
 for r in select value from jsonb_array_elements(coalesce(p_patch->'rewards','[]')) loop insert into public.mist_rewards468 select * from jsonb_populate_record(null::public.mist_rewards468,r) on conflict(season_id,account_id) do nothing;end loop;
 update public.mist_runtime468 set revision=revision+1,meta=coalesce(p_patch->'meta',meta) where id=true;
 if p_account is not null and p_request is not null then insert into public.mist_commands468(account_id,request_id,action,payload,result) values(p_account,p_request,p_action,p_payload,p_result);end if;
 return p_result;
end $$;
alter table public.mist_runtime468 enable row level security;
alter table public.mist_commands468 enable row level security;
alter table public.mist_rewards468 enable row level security;
revoke all on public.mist_runtime468,public.mist_commands468,public.mist_rewards468 from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.mist_runtime468,public.mist_commands468,public.mist_rewards468 to service_role;
revoke all on function public.game_mist_load468(text,uuid),public.game_mist_commit468(text,uuid,text,jsonb,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.game_mist_load468(text,uuid),public.game_mist_commit468(text,uuid,text,jsonb,bigint,jsonb,jsonb) to service_role;
create function public.game_mist_reward_claim468(p_account text,p_season text,p_expected_revision bigint) returns jsonb language plpgsql security invoker set search_path='' as $$
declare rec public."PlayerSaves"%rowtype;r public.mist_rewards468%rowtype;saved jsonb;qty bigint;item text;
begin
 perform 1 from public."Accounts" where account_id=p_account and not coalesce(disabled,false) for share;
 if not found then raise exception 'ACCOUNT_DISABLED';end if;
 select * into strict rec from public."PlayerSaves" where account_id=p_account for update;
 select * into r from public.mist_rewards468 where account_id=p_account and season_id=p_season for update;
 if not found then raise exception 'MIST_REWARD_MISSING';end if;
 if r.claimed_at is not null then return jsonb_build_object('ok',true,'duplicate',true,'atomicSave',true,'accountId',p_account,'seasonId',p_season,'revision',rec.revision,'save',rec.save_json);end if;
 if p_expected_revision is null or rec.revision<>p_expected_revision then raise exception 'SAVE_REVISION_CONFLICT';end if;
 qty:=(r.reward->>'quantity')::bigint;item:=r.reward->>'id';
 if qty<1 or qty>100000 or item is null or length(item)=0 then raise exception 'MIST_REWARD_INVALID';end if;
 saved:=rec.save_json;if jsonb_typeof(saved->'consumables') is distinct from 'object' then raise exception 'SAVE_SCHEMA_INVALID';end if;
 saved:=jsonb_set(saved,array['consumables',item],to_jsonb(coalesce((saved->'consumables'->>item)::bigint,0)+qty),true);
 if saved->'serverReceipts'='null'::jsonb then saved:=jsonb_set(saved,'{serverReceipts}','{}');end if;
 if saved ? 'serverReceipts' and jsonb_typeof(saved->'serverReceipts')<>'object' then raise exception 'SAVE_SCHEMA_INVALID';end if;
 saved:=jsonb_set(saved,'{serverReceipts}',coalesce(saved->'serverReceipts','{}')||jsonb_build_object('mist',coalesce(saved->'serverReceipts'->'mist','[]')||jsonb_build_array(p_season)));
 update public."PlayerSaves" set save_json=saved,revision=rec.revision+1,updated_at=statement_timestamp() where account_id=p_account;
 update public.mist_rewards468 set claimed_at=statement_timestamp() where account_id=p_account and season_id=p_season;
 return jsonb_build_object('ok',true,'atomicSave',true,'accountId',p_account,'seasonId',p_season,'revision',rec.revision+1,'save',saved);
end $$;
revoke all on function public.game_mist_reward_claim468(text,text,bigint) from public,anon,authenticated;
grant execute on function public.game_mist_reward_claim468(text,text,bigint) to service_role;

commit;
