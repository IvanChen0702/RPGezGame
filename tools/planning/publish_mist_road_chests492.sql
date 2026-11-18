-- Approved additive rules for the current season. No player records are changed.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $$
DECLARE oldrow public."GameDataCurrent"%ROWTYPE; stamp timestamptz:=clock_timestamp(); v text; pkg jsonb;
 rows jsonb := '[{"Key":"RoadChestCap","Value":5},{"Key":"RoadChestRespawnMinutes","Value":30},{"Key":"RoadChestLegendaryPercent","Value":30},{"Key":"RoadChestRandomPercent","Value":40},{"Key":"RoadChestTrapPercent","Value":30},{"Key":"RoadChestTrapHpPercent","Value":80}]';
BEGIN
 PERFORM 1 FROM public.mist_runtime468 WHERE id=true FOR UPDATE;
 SELECT * INTO STRICT oldrow FROM public."GameDataCurrent" WHERE channel='production' FOR UPDATE;
 IF oldrow.version <> '20261118-043856-resources487' THEN RAISE EXCEPTION 'PLANNING_VERSION_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(oldrow.data_json->'data'->'MistConfig') r WHERE r->>'Key' IN ('RoadChestCap','RoadChestRespawnMinutes','RoadChestLegendaryPercent','RoadChestRandomPercent','RoadChestTrapPercent','RoadChestTrapHpPercent')) THEN RAISE EXCEPTION 'ROAD_CONFIG_ALREADY_PRESENT'; END IF;
 v:=to_char(stamp AT TIME ZONE 'UTC','YYYYMMDD-HH24MISS')||'-roadchests492';
 pkg:=jsonb_set(oldrow.data_json,'{data,MistConfig}',(oldrow.data_json->'data'->'MistConfig')||rows)||jsonb_build_object('dataVersion',v,'generatedAt',stamp);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) SELECT oldrow.version,oldrow.published_at,'roadchests492-backup',oldrow.data_json WHERE NOT EXISTS(SELECT 1 FROM public."GameDataVersions" WHERE version=oldrow.version);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) VALUES(v,stamp,'roadchests492-approved',pkg);
 UPDATE public."GameDataCurrent" SET version=v,published_at=stamp,data_json=pkg WHERE channel='production';
 UPDATE public.mist_seasons465 SET rules=jsonb_set(rules,'{planning,MistConfig}',(rules->'planning'->'MistConfig')||rows) WHERE status='ACTIVE';
 UPDATE public.mist_runtime468 SET revision=revision+1,meta=meta||jsonb_build_object('roadchests492',jsonb_build_object('appliedAt',stamp,'previousPlanningVersion',oldrow.version)) WHERE id=true;
END $$;
COMMIT;
