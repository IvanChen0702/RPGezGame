BEGIN;
SET LOCAL lock_timeout='3s';
-- Optional rules stay compatible with older publishers that omit new keys.
CREATE FUNCTION public.game_planning_mist498() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE cfg jsonb; previous jsonb; k text; v jsonb; n numeric;
BEGIN
 cfg:=NEW.data_json->'data'->'MistConfig'; IF cfg IS NULL THEN RETURN NEW; END IF;
 SELECT data_json->'data'->'MistConfig' INTO previous FROM public."GameDataCurrent" WHERE channel='production';
 FOREACH k IN ARRAY ARRAY['SupplyVisionRadius','AirdropIntervalHours','RoadChestRandomExcludeLegendary'] LOOP
  IF (SELECT count(*) FROM jsonb_array_elements(cfg) r WHERE r->>'Key'=k)>1 THEN RAISE EXCEPTION 'MIST_CONFIG_DUPLICATE: %',k; END IF;
  SELECT r->'Value' INTO v FROM jsonb_array_elements(cfg) r WHERE r->>'Key'=k;
  IF v IS NULL THEN
   SELECT r INTO v FROM jsonb_array_elements(coalesce(previous,'[]')) r WHERE r->>'Key'=k;
   IF v IS NULL THEN CONTINUE; END IF;
   cfg:=cfg||jsonb_build_array(v);v:=v->'Value';
  END IF;
  n:=(v#>>'{}')::numeric;
  IF n IS NULL OR n<>trunc(n) OR (k='SupplyVisionRadius' AND n NOT IN (0,1,2)) OR (k='AirdropIntervalHours' AND n NOT IN (12,24)) OR (k='RoadChestRandomExcludeLegendary' AND n NOT IN (0,1)) THEN RAISE EXCEPTION 'MIST_CONFIG_INVALID: %',k; END IF;
 END LOOP;
 NEW.data_json:=jsonb_set(NEW.data_json,'{data,MistConfig}',cfg);RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.game_planning_mist498() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER planning_mist498 BEFORE INSERT OR UPDATE ON public."GameDataCurrent" FOR EACH ROW EXECUTE FUNCTION public.game_planning_mist498();
CREATE TRIGGER planning_mist498 BEFORE INSERT OR UPDATE ON public."GameDataVersions" FOR EACH ROW EXECUTE FUNCTION public.game_planning_mist498();
COMMIT;
