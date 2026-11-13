-- 439: repair the public presence ID -> Auth user -> legacy account mapping.
-- Source: user-supplied live schema review, 2026-11-13 18:16 Asia/Taipei.
-- Replaces only the 436 wrapper; 420/358 keep authentication, TTL and roster rules.
-- Public results never include auth_user_id or legacy_account_id.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

do $preflight$
begin
  if to_regprocedure('public.game_town_presence420(integer,text,boolean,boolean)') is null then
    raise exception '439_BASE_PRESENCE_FUNCTION_NOT_FOUND';
  end if;
  -- Validate the actual relation and column names without reading player rows.
  perform p.presence_id, p.auth_user_id, l.legacy_account_id, a.disabled, s.save_json
    from public.game_presence358 p
    join public.game_identity_links l on l.auth_user_id=p.auth_user_id
    join public."Accounts" a on a.account_id=l.legacy_account_id
    join public."PlayerSaves" s on s.account_id=l.legacy_account_id
   where false;
end;
$preflight$;

create or replace function public.game_town_presence436(
  p_avatar_id integer default 1,
  p_visual text default null,
  p_include_members boolean default true,
  p_touch boolean default true
) returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  result jsonb;
  member jsonb;
  members jsonb := '[]'::jsonb;
  presence_key public.game_presence358.presence_id%type;
  pets jsonb;
  equipped text;
  companion jsonb;
  public_pet jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  -- Preserve the existing account checks, online TTL, count, limits and roster order.
  result := public.game_town_presence420(
    p_avatar_id => p_avatar_id, p_visual => p_visual,
    p_include_members => p_include_members, p_touch => p_touch
  );
  if result->>'ok' is distinct from 'true'
     or jsonb_typeof(result->'members') is distinct from 'array' then
    return result;
  end if;
  if jsonb_array_length(result->'members') > 8 then
    raise exception 'PRESENCE_ROSTER_INVALID';
  end if;
  for member in select value from jsonb_array_elements(result->'members') loop
    public_pet := null;
    companion := null;
    -- members[].id is the random public presence ID, not an account ID.
    -- Follow the same identity chain used by 420, using the unique presence index.
    presence_key := member->>'id';
    begin
      select s.save_json->'pets297', s.save_json->>'equippedPet297'
        into strict pets, equipped
        from public.game_presence358 p
        join public.game_identity_links l on l.auth_user_id = p.auth_user_id
        join public."Accounts" a on a.account_id = l.legacy_account_id and a.disabled = false
        join public."PlayerSaves" s on s.account_id = l.legacy_account_id
       where p.presence_id = presence_key;
    exception when no_data_found or too_many_rows then
      -- A departed player, missing save or ambiguous identity must never fall
      -- back to another account or reuse the previous member's companion.
      pets := null;
      equipped := null;
    end;
    if coalesce(equipped, '') <> '' and jsonb_typeof(pets) = 'array' then
      select value into companion from jsonb_array_elements(pets)
        where value->>'id' = equipped limit 1;
      if jsonb_typeof(companion->'id') = 'string'
         and length(companion->>'id') between 1 and 96
         and jsonb_typeof(companion->'species') = 'string'
         and companion->>'species' ~ '^[A-Za-z0-9_]{1,64}$'
         and jsonb_typeof(companion->'level') = 'number'
         and companion->>'level' ~ '^[0-9]{1,10}$' then
        if (companion->>'level')::bigint between 1 and 2147483647 then
          public_pet := jsonb_build_object('id', companion->>'id',
            'species', companion->>'species', 'level', (companion->>'level')::integer);
        end if;
      end if;
    end if;
    members := members || jsonb_build_array(member || jsonb_build_object('pet', public_pet));
  end loop;
  return jsonb_set(result, '{members}', members);
end;
$function$;

revoke all on function public.game_town_presence436(integer,text,boolean,boolean) from public, anon;
grant execute on function public.game_town_presence436(integer,text,boolean,boolean) to authenticated;
comment on function public.game_town_presence436(integer,text,boolean,boolean) is
  '439: equipped companion via presence_id -> auth_user_id -> legacy_account_id; public IDs unchanged, private IDs never returned.';
notify pgrst, 'reload schema';
commit;
