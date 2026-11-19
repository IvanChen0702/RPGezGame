-- Approved additive rules for the current season. No player records are changed.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $$
DECLARE oldrow public."GameDataCurrent"%ROWTYPE; stamp timestamptz:=clock_timestamp(); v text; pkg jsonb;
 rows jsonb := '[{"Key":"EquipmentCapacity","Value":20},{"Key":"GemCapacity","Value":20},{"Key":"ChestCapacity","Value":20}]';
 previous_season_configs jsonb;


BEGIN
 PERFORM 1 FROM public.mist_runtime468 WHERE id=true FOR UPDATE;
 SELECT * INTO STRICT oldrow FROM public."GameDataCurrent" WHERE channel='production' FOR UPDATE;
 IF oldrow.version <> '20261119-051345-mistrules498' THEN RAISE EXCEPTION 'PLANNING_VERSION_CHANGED'; END IF;
 v:=to_char(stamp AT TIME ZONE 'UTC','YYYYMMDD-HH24MISS')||'-mistcapacity499';
 pkg:=jsonb_set(oldrow.data_json,'{data,MistConfig}',(SELECT coalesce(jsonb_agg(r),'[]'::jsonb) FROM jsonb_array_elements(oldrow.data_json->'data'->'MistConfig') r WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(rows) n WHERE n->>'Key'=r->>'Key'))||rows)||jsonb_build_object('dataVersion',v,'generatedAt',stamp);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) SELECT oldrow.version,oldrow.published_at,'mistcapacity499-backup',oldrow.data_json WHERE NOT EXISTS(SELECT 1 FROM public."GameDataVersions" WHERE version=oldrow.version);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) VALUES(v,stamp,'mistcapacity499-approved',pkg);
 UPDATE public."GameDataCurrent" SET version=v,published_at=stamp,data_json=pkg WHERE channel='production';
 SELECT jsonb_object_agg(id,rules->'planning'->'MistConfig') INTO previous_season_configs FROM public.mist_seasons465 WHERE status='ACTIVE';
 UPDATE public.mist_seasons465 SET rules=jsonb_set(rules,'{planning,MistConfig}',(SELECT coalesce(jsonb_agg(r),'[]'::jsonb) FROM jsonb_array_elements(rules->'planning'->'MistConfig') r WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(rows) n WHERE n->>'Key'=r->>'Key'))||rows) WHERE status='ACTIVE';
 UPDATE public.mist_runtime468 SET revision=revision+1,meta=meta||jsonb_build_object('mistcapacity499',jsonb_build_object('appliedAt',stamp,'previousPlanningVersion',oldrow.version,'previousSeasonConfigs',previous_season_configs)) WHERE id=true;
END $$;
COMMIT;
