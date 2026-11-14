-- One authenticated API settlement = one atomic HP change + durable attempt.
-- Only the service role may call this function; the API supplies verified account
-- identity and published planning limits. No player save or existing row is reset.
begin;
create or replace function public.game_worldboss_submit448(
  p_account text, p_boss text, p_request uuid, p_damage bigint,
  p_attempts integer, p_respawn_minutes integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_boss public."WorldBossState"%rowtype;
  v_previous public."WorldBossAttempts"%rowtype;
  v_nickname text;
  v_id text := 'wb448_' || p_account || '_' || p_request::text;
  v_day text := to_char(now() at time zone 'Asia/Taipei', 'YYYY-MM-DD');
  v_used integer;
  v_damage bigint := 0;
  v_status text;
  v_consumed boolean := false;
  v_replayed boolean := false;
begin
  if p_account is null or p_boss is null or btrim(p_boss) = '' or p_request is null
     or p_damage is null or p_damage < 0 or p_damage > 9007199254740991
     or p_attempts is null or p_attempts < 1
     or p_respawn_minutes is null or p_respawn_minutes < 1 then
    raise exception 'WORLD_BOSS_INVALID_SETTLEMENT';
  end if;
  -- Lock account before boss: serializes the daily limit across boss instances.
  select nickname into v_nickname from public."Accounts"
    where account_id = p_account and not coalesce(disabled, false) for update;
  if not found then raise exception 'ACCOUNT_DISABLED'; end if;
  select count(*)::integer into v_used from (
    select regexp_match(btrim(date_key), '^(\d{4})[-/](\d{1,2})[-/](\d{1,2})') as parts
    from public."WorldBossAttempts" where account_id = p_account and upper(status) = 'DONE'
  ) d where parts[1] || '-' || lpad(parts[2],2,'0') || '-' || lpad(parts[3],2,'0') = v_day;

  -- Receipt lookup precedes every terminal boss/limit check, including the killing blow.
  select * into v_previous from public."WorldBossAttempts" where challenge_id = v_id;
  if found and (v_previous.account_id <> p_account or v_previous.boss_instance_id <> p_boss) then
    raise exception 'WORLD_BOSS_REQUEST_REUSED';
  end if;
  select * into v_boss from public."WorldBossState" where boss_instance_id = p_boss for update;
  if v_previous.challenge_id is not null then
    v_damage := v_previous.damage; v_status := 'accepted';
    v_consumed := true; v_replayed := true;
  elsif v_boss.boss_instance_id is null then
    v_status := 'boss_changed';
  elsif upper(v_boss.status) <> 'ALIVE' or v_boss.current_hp <= 0 then
    v_status := 'boss_defeated';
  elsif exists(select 1 from public."WorldBossState" s
      where s.status = 'ALIVE' and s.current_hp > 0 and s.boss_instance_id <> p_boss
        and (s.spawned_at, s.boss_instance_id) > (v_boss.spawned_at, v_boss.boss_instance_id)) then
    v_status := 'boss_changed';
  elsif v_used >= p_attempts then
    v_status := 'no_attempts';
  else
    v_damage := least(p_damage, v_boss.current_hp);
    update public."WorldBossState" set current_hp = current_hp - v_damage,
      revision = coalesce(revision,1) + 1,
      status = case when current_hp <= v_damage then 'DEAD' else status end,
      dead_at = case when current_hp <= v_damage then now() else dead_at end,
      respawn_at = case when current_hp <= v_damage then now() + make_interval(mins => p_respawn_minutes) else respawn_at end
      where boss_instance_id = p_boss returning * into v_boss;
    insert into public."WorldBossAttempts"
      (challenge_id,boss_instance_id,account_id,nickname,date_key,attempt_no,started_at,submitted_at,damage,status)
      values(v_id,p_boss,p_account,coalesce(v_nickname,'冒險者'),v_day,v_used+1,now(),now(),v_damage,'DONE')
      returning * into v_previous;
    v_used := v_used+1; v_consumed := true; v_status := 'accepted';
  end if;
  return jsonb_build_object('ok',true,'settled',true,'settlementStatus',v_status,
    'requestId',p_request,'bossInstanceId',p_boss,'challengeId',v_previous.challenge_id,
    'attemptConsumed',v_consumed,'alreadySettled',v_replayed,'acceptedDamage',v_damage,
    'bossHp',coalesce(v_boss.current_hp,0),'bossStatus',coalesce(v_boss.status,'DEAD'),
    'respawnAt',v_boss.respawn_at,'attemptNo',v_previous.attempt_no,
    'attemptsMax',p_attempts,'attemptsLeft',greatest(0,p_attempts-v_used),'serverNow',now());
end;
$$;
revoke all on function public.game_worldboss_submit448(text,text,uuid,bigint,integer,integer) from public, anon, authenticated;
grant execute on function public.game_worldboss_submit448(text,text,uuid,bigint,integer,integer) to service_role;
comment on function public.game_worldboss_submit448(text,text,uuid,bigint,integer,integer)
  is 'Service-only atomic world boss settlement; request UUID deduplicates retries; defeated or replaced boss consumes no new attempt.';
commit;
