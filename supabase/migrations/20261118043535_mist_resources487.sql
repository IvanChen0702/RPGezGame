-- Add resource cell types; retain the existing RLS, ACL and transaction RPCs.
BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.mist_cells465 DROP CONSTRAINT mist_cells465_kind_check;
ALTER TABLE public.mist_cells465 ADD CONSTRAINT mist_cells465_kind_check CHECK(kind IN ('player','monster','forge','supply','spawn','stamina_spawn','stamina','airdrop'));
-- Older Sheets publishers may not yet contain the four new keys. Carry forward
-- the last published values only when absent; explicit valid spreadsheet edits win.
CREATE FUNCTION public.game_planning_resources487() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE cfg jsonb; current_cfg jsonb; k text; v jsonb; n numeric; lim integer;
BEGIN
 cfg:=NEW.data_json->'data'->'MistConfig';
 IF cfg IS NULL THEN RETURN NEW; END IF;
 SELECT data_json->'data'->'MistConfig' INTO current_cfg FROM public."GameDataCurrent" WHERE channel='production';
 FOREACH k IN ARRAY ARRAY['StaminaPackCap','StaminaPackWarningMinutes','StaminaPackEnergy','AirdropVisionRadius'] LOOP
  IF (SELECT count(*) FROM jsonb_array_elements(cfg) r WHERE r->>'Key'=k)>1 THEN RAISE EXCEPTION 'MIST_RESOURCE_CONFIG_DUPLICATE: %',k; END IF;
  SELECT r->'Value' INTO v FROM jsonb_array_elements(cfg) r WHERE r->>'Key'=k;
  IF v IS NULL THEN
   SELECT r INTO v FROM jsonb_array_elements(coalesce(current_cfg,'[]')) r WHERE r->>'Key'=k;
   IF v IS NULL THEN CONTINUE; END IF;
   cfg:=cfg||jsonb_build_array(v); v:=v->'Value';
  END IF;
  n:=(v#>>'{}')::numeric;
  lim:=CASE k WHEN 'StaminaPackCap' THEN 10 WHEN 'StaminaPackEnergy' THEN 20 WHEN 'AirdropVisionRadius' THEN 2 ELSE 1440 END;
  IF n IS NULL OR n<>trunc(n) OR n<1 OR n>lim THEN RAISE EXCEPTION 'MIST_RESOURCE_CONFIG_INVALID: %',k; END IF;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_array_elements(cfg) r WHERE r->>'Key' IN ('StaminaPackCap','StaminaPackWarningMinutes','StaminaPackEnergy','AirdropVisionRadius')) NOT IN (0,4) THEN RAISE EXCEPTION 'MIST_RESOURCE_CONFIG_INCOMPLETE'; END IF;
 NEW.data_json:=jsonb_set(NEW.data_json,'{data,MistConfig}',cfg);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.game_planning_resources487() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER planning_resources487 BEFORE INSERT OR UPDATE ON public."GameDataCurrent" FOR EACH ROW EXECUTE FUNCTION public.game_planning_resources487();
CREATE TRIGGER planning_resources487 BEFORE INSERT OR UPDATE ON public."GameDataVersions" FOR EACH ROW EXECUTE FUNCTION public.game_planning_resources487();
COMMIT;
