-- HISTORICAL: contains the incorrect account-ID assumption discovered in the live review.
-- Do not apply this file alone. Use 202611130003_fix_presence_identity439.sql instead.
-- Original implementation retained for history and regression reproduction.
-- Only the server-selected, already-public roster can supply companion snapshots.
begin;

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
  account_key public."PlayerSaves".account_id%type;
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
    -- Presence IDs are canonical game account IDs, as in PlayerSaves.account_id.
    -- Use the column's type so this remains an indexed lookup for UUID or text schemas.
    account_key := member->>'id';
    select save_json->'pets297', save_json->>'equippedPet297'
      into pets, equipped
      from public."PlayerSaves" where account_id = account_key;
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
  'Public town companions from equipped pets only; no inventory, traits, credentials or save mutation.';
notify pgrst, 'reload schema';
commit;
