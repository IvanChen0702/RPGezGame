-- Approved additive rules for the current season. No player records are changed.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $$
DECLARE oldrow public."GameDataCurrent"%ROWTYPE; stamp timestamptz:=clock_timestamp(); v text; pkg jsonb;
 rows jsonb := '[{"Key":"SupplyVisionRadius","Value":2},{"Key":"AirdropIntervalHours","Value":12},{"Key":"RoadChestRandomExcludeLegendary","Value":1},{"Key":"RoadChestLegendaryPercent","Value":20},{"Key":"RoadChestRandomPercent","Value":60},{"Key":"RoadChestTrapPercent","Value":20},{"Key":"ExcludedEquipmentIDs","Value":"gmSword,forgeBlank172"}]';
 previous_season_configs jsonb;
 latest_claim timestamptz; next_drop timestamptz;

BEGIN
 PERFORM 1 FROM public.mist_runtime468 WHERE id=true FOR UPDATE;
 SELECT * INTO STRICT oldrow FROM public."GameDataCurrent" WHERE channel='production' FOR UPDATE;
 IF oldrow.version <> '20261118-075812-roadchests492' THEN RAISE EXCEPTION 'PLANNING_VERSION_CHANGED'; END IF;
 v:=to_char(stamp AT TIME ZONE 'UTC','YYYYMMDD-HH24MISS')||'-mistrules498';
 pkg:=jsonb_set(oldrow.data_json,'{data,MistConfig}',(SELECT coalesce(jsonb_agg(r),'[]'::jsonb) FROM jsonb_array_elements(oldrow.data_json->'data'->'MistConfig') r WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(rows) n WHERE n->>'Key'=r->>'Key'))||rows)||jsonb_build_object('dataVersion',v,'generatedAt',stamp);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) SELECT oldrow.version,oldrow.published_at,'mistrules498-backup',oldrow.data_json WHERE NOT EXISTS(SELECT 1 FROM public."GameDataVersions" WHERE version=oldrow.version);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) VALUES(v,stamp,'mistrules498-approved',pkg);
 UPDATE public."GameDataCurrent" SET version=v,published_at=stamp,data_json=pkg WHERE channel='production';
 SELECT jsonb_object_agg(id,rules->'planning'->'MistConfig') INTO previous_season_configs FROM public.mist_seasons465 WHERE status='ACTIVE';
 UPDATE public.mist_seasons465 SET rules=jsonb_set(rules,'{planning,MistConfig}',(SELECT coalesce(jsonb_agg(r),'[]'::jsonb) FROM jsonb_array_elements(rules->'planning'->'MistConfig') r WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(rows) n WHERE n->>'Key'=r->>'Key'))||rows) WHERE status='ACTIVE';
 SELECT max(created_at) INTO latest_claim FROM public.mist_reports465 WHERE season_id IN(SELECT id FROM public.mist_seasons465 WHERE status='ACTIVE') AND result='resource' AND summary->>'title'='領取空降資源';
 IF latest_claim IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.mist_cells465 WHERE kind='airdrop') THEN
  next_drop:=(date_trunc('day',latest_claim AT TIME ZONE 'Asia/Taipei') + (CASE WHEN extract(hour FROM latest_claim AT TIME ZONE 'Asia/Taipei')<12 THEN interval '12 hours' ELSE interval '24 hours' END)) AT TIME ZONE 'Asia/Taipei';
  UPDATE public.mist_runtime468 SET meta=meta||jsonb_build_object('airdropNextAt487',next_drop,'airdropClaimedAt498',latest_claim) WHERE id=true;
 END IF;
 UPDATE public.mist_runtime468 SET revision=revision+1,meta=meta||jsonb_build_object('mistrules498',jsonb_build_object('appliedAt',stamp,'previousPlanningVersion',oldrow.version,'previousSeasonConfigs',previous_season_configs)) WHERE id=true;
END $$;
COMMIT;
