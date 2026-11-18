-- Roadside chests use the existing world CAS and operation receipt transaction.
BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.mist_cells465 DROP CONSTRAINT mist_cells465_kind_check;
ALTER TABLE public.mist_cells465 ADD CONSTRAINT mist_cells465_kind_check CHECK(kind IN ('player','monster','forge','supply','spawn','stamina_spawn','stamina','airdrop','road_chest'));
CREATE FUNCTION public.game_planning_road_chests492() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE cfg jsonb; current_cfg jsonb; k text; v jsonb; n numeric; lim integer; minimum integer; total numeric:=0; present integer;
BEGIN
 cfg:=NEW.data_json->'data'->'MistConfig';
 IF cfg IS NULL THEN RETURN NEW; END IF;
 SELECT data_json->'data'->'MistConfig' INTO current_cfg FROM public."GameDataCurrent" WHERE channel='production';
 FOREACH k IN ARRAY ARRAY['RoadChestCap','RoadChestRespawnMinutes','RoadChestLegendaryPercent','RoadChestRandomPercent','RoadChestTrapPercent','RoadChestTrapHpPercent'] LOOP
  IF (SELECT count(*) FROM jsonb_array_elements(cfg) r WHERE r->>'Key'=k)>1 THEN RAISE EXCEPTION 'MIST_ROAD_CONFIG_DUPLICATE: %',k; END IF;
  SELECT r->'Value' INTO v FROM jsonb_array_elements(cfg) r WHERE r->>'Key'=k;
  IF v IS NULL THEN
   SELECT r INTO v FROM jsonb_array_elements(coalesce(current_cfg,'[]')) r WHERE r->>'Key'=k;
   IF v IS NULL THEN CONTINUE; END IF;
   cfg:=cfg||jsonb_build_array(v); v:=v->'Value';
  END IF;
  n:=(v#>>'{}')::numeric;
  lim:=CASE k WHEN 'RoadChestCap' THEN 10 WHEN 'RoadChestRespawnMinutes' THEN 1440 WHEN 'RoadChestTrapHpPercent' THEN 99 ELSE 100 END;
  minimum:=CASE WHEN k IN ('RoadChestLegendaryPercent','RoadChestRandomPercent','RoadChestTrapPercent') THEN 0 ELSE 1 END;
  IF n IS NULL OR n<>trunc(n) OR n<minimum OR n>lim THEN RAISE EXCEPTION 'MIST_ROAD_CONFIG_INVALID: %',k; END IF;
  IF minimum=0 THEN total:=total+n; END IF;
 END LOOP;
 SELECT count(*) INTO present FROM jsonb_array_elements(cfg) r WHERE r->>'Key' IN ('RoadChestCap','RoadChestRespawnMinutes','RoadChestLegendaryPercent','RoadChestRandomPercent','RoadChestTrapPercent','RoadChestTrapHpPercent');
 IF present NOT IN (0,6) THEN RAISE EXCEPTION 'MIST_ROAD_CONFIG_INCOMPLETE'; END IF;
 IF present=6 AND total<>100 THEN RAISE EXCEPTION 'MIST_ROAD_CONFIG_PERCENT_TOTAL'; END IF;
 NEW.data_json:=jsonb_set(NEW.data_json,'{data,MistConfig}',cfg);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.game_planning_road_chests492() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER planning_road_chests492 BEFORE INSERT OR UPDATE ON public."GameDataCurrent" FOR EACH ROW EXECUTE FUNCTION public.game_planning_road_chests492();
CREATE TRIGGER planning_road_chests492 BEFORE INSERT OR UPDATE ON public."GameDataVersions" FOR EACH ROW EXECUTE FUNCTION public.game_planning_road_chests492();
COMMIT;
