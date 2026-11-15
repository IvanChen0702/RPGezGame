-- Phase 1: service-only exploration storage. No season is opened by this migration.
-- Combat, loot, respawn and settlement must pass integration tests before enabling entry.
begin;
create table public.mist_seasons465 (
 id text primary key,
 starts_at timestamptz not null,
 closes_at timestamptz not null,
 settles_at timestamptz not null,
 size integer not null default 16 check(size between 16 and 256),
 status text not null default 'PREPARING' check(status in ('PREPARING','ACTIVE','SETTLING','SETTLED')),
 rules jsonb not null default '{}',
 check(starts_at<closes_at and closes_at<settles_at)
);
create table public.mist_players465 (
 season_id text not null references public.mist_seasons465(id),
 account_id text not null references public."Accounts"(account_id),
 nickname text not null,
 hp integer not null check(hp>=0),
 max_hp integer not null check(max_hp>0 and hp<=max_hp),
 energy integer not null default 10 check(energy between 0 and 10),
 energy_at timestamptz not null default now(),
 points integer not null default 0 check(points>=0),
 kills integer not null default 0 check(kills>=0),
 protected_until timestamptz,
 hidden_until timestamptz,
 supplied_on date,
 battle_id uuid,
 revision bigint not null default 1,
 equipment jsonb not null default '{}',
 inventory jsonb not null default '{"equipment":[],"gems":[],"chests":[]}',
 pending_loot jsonb not null default '[]' check(jsonb_typeof(pending_loot)='array'),
 skills jsonb not null default '{"active":[],"passive":[]}',
 defense_snapshot jsonb not null default '{}',
 primary key(season_id,account_id)
);
create index mist_players465_ranking on public.mist_players465(season_id,points desc,kills desc);
create table public.mist_cells465 (
 id uuid primary key default gen_random_uuid(),
 season_id text not null references public.mist_seasons465(id),
 x integer not null check(x>=0),
 y integer not null check(y>=0),
 kind text not null check(kind in ('player','monster','forge','supply','spawn')),
 owner_account text,
 payload jsonb not null default '{}',
 unique(season_id,x,y),
 foreign key(season_id,owner_account) references public.mist_players465(season_id,account_id)
);
create unique index mist_cells465_player on public.mist_cells465(season_id,owner_account) where kind='player';
create table public.mist_flags465 (
 season_id text not null,
 owner_account text not null,
 x integer not null check(x>=0),
 y integer not null check(y>=0),
 created_at timestamptz not null default now(),
 primary key(season_id,x,y),
 foreign key(season_id,owner_account) references public.mist_players465(season_id,account_id)
);
create index mist_flags465_owner on public.mist_flags465(season_id,owner_account);
create table public.mist_requests465 (
 season_id text not null,
 account_id text not null,
 request_id uuid not null,
 action text not null,
 payload jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(season_id,account_id,request_id),
 foreign key(season_id,account_id) references public.mist_players465(season_id,account_id)
);
create table public.mist_reports465 (
 id uuid primary key default gen_random_uuid(),
 season_id text not null,
 account_id text not null,
 created_at timestamptz not null default now(),
 result text not null,
 summary jsonb not null,
 read_at timestamptz,
 foreign key(season_id,account_id) references public.mist_players465(season_id,account_id)
);
create index mist_reports465_owner on public.mist_reports465(season_id,account_id,created_at desc);

-- API-only: auth/owner mapping is checked by game-api, never passed through from a client.
-- SECURITY INVOKER retains service role semantics; no owner-privilege elevation.
create function public.game_mist_observe465(p_account text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 s public.mist_seasons465%rowtype;
 p public.mist_players465%rowtype;
 pos public.mist_cells465%rowtype;
 cells jsonb; ranks jsonb; reports jsonb;
 own jsonb:=null; now_at timestamptz:=statement_timestamp();
begin
 if not exists(select 1 from public."Accounts" a join public."PlayerSaves" sv using(account_id)
   where a.account_id=p_account and not coalesce(a.disabled,false)
   and coalesce((sv.save_json->>'maxCleared')::integer,0)>=1
   and (sv.save_json->>'mainProgressEpoch')::integer=411)
 then return jsonb_build_object('ok',false,'error','MIST_NOT_UNLOCKED');end if;
 select * into s from public.mist_seasons465 where starts_at<=now_at order by starts_at desc limit 1;
 if not found then return jsonb_build_object('ok',true,'ready',false,'self',null,'cells','[]'::jsonb,'ranking','[]'::jsonb,'reports','[]'::jsonb);end if;
 select * into p from public.mist_players465 where season_id=s.id and account_id=p_account;
 if found then
  select * into pos from public.mist_cells465 where season_id=s.id and kind='player' and owner_account=p_account;
  own:=jsonb_build_object('x',pos.x,'y',pos.y,'hp',p.hp,'maxHp',p.max_hp,
   'energy',least(10,p.energy+greatest(0,floor(extract(epoch from now_at-p.energy_at)/3600))::integer),
   'points',p.points,'kills',p.kills,'revision',p.revision,
   'protectedUntil',p.protected_until,'hiddenUntil',p.hidden_until,
   'suppliedToday',p.supplied_on=(now_at at time zone 'Asia/Taipei')::date,
   'flags',(select count(*) from public.mist_flags465 where season_id=s.id and owner_account=p_account),
   'battleId',p.battle_id);
  with centers as (
   select pos.x as x,pos.y as y where pos.id is not null union
   select f.x,f.y from public.mist_flags465 f where f.season_id=s.id and f.owner_account=p_account
  ), visible as (
   select distinct a.x+dx as x,a.y+dy as y from centers a cross join generate_series(-1,1) dx cross join generate_series(-1,1) dy
   where a.x+dx between 0 and s.size-1 and a.y+dy between 0 and s.size-1
  )
  select coalesce(jsonb_agg(jsonb_build_object('x',v.x,'y',v.y,'object',
   case
    when c.kind='player' and other.account_id<>p_account
     and (other.hidden_until is null or other.hidden_until<=now_at)
    then jsonb_build_object('kind','player','id',c.id,'name',other.nickname,
      'points',other.points,'hp',other.hp,'protected',coalesce(other.protected_until>now_at,false),'busy',other.battle_id is not null)
    when c.kind in ('monster','forge','supply','spawn')
    then jsonb_build_object('kind',case when c.kind='spawn' then 'monster' else c.kind end,'id',c.id,
      'name',c.payload->>'name','art',c.payload->>'art','elite',coalesce((c.payload->>'elite')::boolean,false),
      'countdown',case when c.kind='spawn' then c.payload->>'countdown' else null end)
    when f.owner_account is not null
    then jsonb_build_object('kind','flag','own',f.owner_account=p_account,'name',case when f.owner_account=p_account then '我的旗幟' else '敵方旗幟' end)
    else null end) order by v.y,v.x),'[]'::jsonb) into cells
  from visible v
  left join public.mist_cells465 c on c.season_id=s.id and c.x=v.x and c.y=v.y
  left join public.mist_players465 other on other.season_id=c.season_id and other.account_id=c.owner_account
  left join public.mist_flags465 f on f.season_id=s.id and f.x=v.x and f.y=v.y;
  select coalesce(jsonb_agg(r.doc order by r.created_at desc),'[]'::jsonb) into reports from
   (select created_at,jsonb_build_object('id',id,'time',created_at,'result',result,'title',summary->>'title',
    'description',summary->>'description','points',summary->'points','unread',read_at is null) doc
    from public.mist_reports465 where season_id=s.id and account_id=p_account order by created_at desc limit 30) r;
 end if;
 select coalesce(jsonb_agg(r.doc order by r.rank,r.nickname),'[]'::jsonb) into ranks from (
  select rank,nickname,jsonb_build_object('rank',rank,'nickname',nickname,'points',points,'kills',kills) doc
  from (select rank() over(order by points desc,kills desc) rank,nickname,points,kills from public.mist_players465 where season_id=s.id) z
  where rank<=10) r;
 return jsonb_build_object('ok',true,'ready',false,'size',s.size,
  'season',jsonb_build_object('id',s.id,'label',s.id,'startsAt',s.starts_at,'closesAt',s.closes_at,'status',s.status),
  'self',own,'cells',coalesce(cells,'[]'::jsonb),'ranking',ranks,'reports',coalesce(reports,'[]'::jsonb),
  'equipment',coalesce(p.equipment,'{}'::jsonb),'inventory',coalesce(p.inventory,'{}'::jsonb),
  'skills',coalesce(p.skills,'{}'::jsonb),'pendingLoot',coalesce(p.pending_loot,'[]'::jsonb));
end $$;

-- Foundations exercised by SQL tests. Not wired to public game-api mutations yet.
-- Serializes one actor only. Unique cell occupancy resolves simultaneous moves.
create function public.game_mist_explore465(p_account text,p_request uuid,p_action text,p_payload jsonb,p_revision bigint)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare
 s public.mist_seasons465%rowtype;p public.mist_players465%rowtype;pos public.mist_cells465%rowtype;
 old public.mist_requests465%rowtype; f public.mist_flags465%rowtype;
 v_x integer;v_y integer;cost integer:=0;hours integer;result jsonb;
 now_at timestamptz:=statement_timestamp();
begin
 if p_request is null or p_revision is null or p_payload is null or jsonb_typeof(p_payload)<>'object'
 then raise exception 'MIST_INVALID_REQUEST';end if;
 if not exists(select 1 from public."Accounts" a join public."PlayerSaves" sv using(account_id)
   where a.account_id=p_account and not coalesce(a.disabled,false)
   and coalesce((sv.save_json->>'maxCleared')::integer,0)>=1 and (sv.save_json->>'mainProgressEpoch')::integer=411)
 then raise exception 'MIST_NOT_UNLOCKED';end if;
 select * into s from public.mist_seasons465 where starts_at<=now_at order by starts_at desc limit 1;
 if not found then raise exception 'MIST_NOT_OPEN';end if;
 select * into p from public.mist_players465 where season_id=s.id and account_id=p_account for update;
 if not found then raise exception 'MIST_NOT_JOINED';end if;
 select * into old from public.mist_requests465 where season_id=s.id and account_id=p_account and request_id=p_request;
 if found then
  if old.action<>p_action or old.payload<>p_payload then raise exception 'MIST_REQUEST_REUSED';end if;
  return old.result;
 end if;
 if s.status<>'ACTIVE' or now_at>=s.closes_at then raise exception 'MIST_NOT_OPEN';end if;
 if p.revision<>p_revision then raise exception 'MIST_STALE';end if;
 if p.battle_id is not null then raise exception 'MIST_IN_BATTLE';end if;
 select * into pos from public.mist_cells465 where season_id=s.id and owner_account=p_account and kind='player' for update;
 if not found then raise exception 'MIST_POSITION_MISSING';end if;
 hours:=greatest(0,floor(extract(epoch from now_at-p.energy_at)/3600))::integer;
 if p.energy+hours>=10 then p.energy:=10;p.energy_at:=now_at;
 else p.energy:=p.energy+hours;p.energy_at:=p.energy_at+hours*interval '1 hour';end if;
 if p_action='move' then
  v_x:=(p_payload->>'x')::integer;v_y:=(p_payload->>'y')::integer;
  if v_x is null or v_y is null or abs(v_x-pos.x)+abs(v_y-pos.y)<>1 or v_x<0 or v_y<0 or v_x>=s.size or v_y>=s.size then raise exception 'MIST_INVALID_MOVE';end if;
  if jsonb_array_length(p.pending_loot)>0 then raise exception 'MIST_LOOT_PENDING';end if;
  -- Explicitly qualified variables avoid ambiguous column comparisons.
  cost:=1;
  if p.energy<cost then raise exception 'MIST_ENERGY_LOW';end if;
  begin update public.mist_cells465 set x=v_x,y=v_y where id=pos.id;
  exception when unique_violation then raise exception 'MIST_CELL_BLOCKED';end;
  p.protected_until:=null;
 elsif p_action='flag' then
  if (select count(*) from public.mist_flags465 where season_id=s.id and owner_account=p_account)>=3 then raise exception 'MIST_FLAG_LIMIT';end if;
  cost:=1;if p.energy<cost then raise exception 'MIST_ENERGY_LOW';end if;
  begin insert into public.mist_flags465(season_id,owner_account,x,y) values(s.id,p_account,pos.x,pos.y);
  exception when unique_violation then raise exception 'MIST_FLAG_EXISTS';end;
  p.hidden_until:=null;
 elsif p_action='unflag' then
  v_x:=(p_payload->>'x')::integer;v_y:=(p_payload->>'y')::integer;
  select * into f from public.mist_flags465 fl where fl.season_id=s.id and fl.x=v_x and fl.y=v_y for update;
  if not found then raise exception 'MIST_FLAG_MISSING';end if;
  if f.owner_account=p_account then cost:=0;
  else
   if abs(pos.x-f.x)+abs(pos.y-f.y)<>1 then raise exception 'MIST_NOT_ADJACENT';end if;
   cost:=2;p.hidden_until:=null;
  end if;
  if p.energy<cost then raise exception 'MIST_ENERGY_LOW';end if;
  delete from public.mist_flags465 where season_id=f.season_id and x=f.x and y=f.y;
 elsif p_action='hide' then
  if p.hidden_until>now_at then raise exception 'MIST_ALREADY_HIDDEN';end if;
  cost:=3;if p.energy<cost then raise exception 'MIST_ENERGY_LOW';end if;
  p.hidden_until:=now_at+interval '1 hour';
 else raise exception 'MIST_ACTION_NOT_READY';
 end if;
 update public.mist_players465 set energy=p.energy-cost,energy_at=p.energy_at,
  protected_until=p.protected_until,hidden_until=p.hidden_until,revision=revision+1
 where season_id=s.id and account_id=p_account;
 result:=public.game_mist_observe465(p_account);
 insert into public.mist_requests465(season_id,account_id,request_id,action,payload,result)
 values(s.id,p_account,p_request,p_action,p_payload,result);
 return result;
end $$;
-- Explicit allowlist defeats platform default ACL grants, including PUBLIC.
alter table public.mist_seasons465 enable row level security;
alter table public.mist_players465 enable row level security;
alter table public.mist_cells465 enable row level security;
alter table public.mist_flags465 enable row level security;
alter table public.mist_requests465 enable row level security;
alter table public.mist_reports465 enable row level security;
revoke all on table public.mist_seasons465,public.mist_players465,public.mist_cells465,public.mist_flags465,public.mist_requests465,public.mist_reports465 from public,anon,authenticated;
grant select,insert,update,delete on table public.mist_seasons465,public.mist_players465,public.mist_cells465,public.mist_flags465,public.mist_requests465,public.mist_reports465 to service_role;
revoke truncate on table public.mist_seasons465,public.mist_players465,public.mist_cells465,public.mist_flags465,public.mist_requests465,public.mist_reports465 from service_role;
revoke all on function public.game_mist_observe465(text),public.game_mist_explore465(text,uuid,text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.game_mist_observe465(text),public.game_mist_explore465(text,uuid,text,jsonb,bigint) to service_role;
commit;
