-- Approved additive rules for the current season. No player records are changed.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $$
DECLARE oldrow public."GameDataCurrent"%ROWTYPE; stamp timestamptz:=clock_timestamp(); v text; pkg jsonb;
 rows jsonb := '[{"Key":"StaminaPackCap","Value":10,"Description":"體力補包與預告合計上限"},{"Key":"StaminaPackWarningMinutes","Value":30,"Description":"體力補包生成預告分鐘"},{"Key":"StaminaPackEnergy","Value":10,"Description":"體力補包恢復量（不超過體力上限）"},{"Key":"AirdropVisionRadius","Value":2,"Description":"空降共用視野半徑；2 為 5×5"}]';
BEGIN
 PERFORM 1 FROM public.mist_runtime468 WHERE id=true FOR UPDATE;
 SELECT * INTO STRICT oldrow FROM public."GameDataCurrent" WHERE channel='production' FOR UPDATE;
 IF oldrow.version <> '20261118-021030-cleanup482' THEN RAISE EXCEPTION 'PLANNING_VERSION_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(oldrow.data_json->'data'->'MistConfig') r WHERE r->>'Key' IN ('StaminaPackCap','StaminaPackWarningMinutes','StaminaPackEnergy','AirdropVisionRadius')) THEN RAISE EXCEPTION 'RESOURCE_CONFIG_ALREADY_PRESENT'; END IF;
 v:=to_char(stamp AT TIME ZONE 'UTC','YYYYMMDD-HH24MISS')||'-resources487';
 pkg:=jsonb_set(oldrow.data_json,'{data,MistConfig}',(oldrow.data_json->'data'->'MistConfig')||rows)||jsonb_build_object('dataVersion',v,'generatedAt',stamp);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) SELECT oldrow.version,oldrow.published_at,'resources487-backup',oldrow.data_json WHERE NOT EXISTS(SELECT 1 FROM public."GameDataVersions" WHERE version=oldrow.version);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) VALUES(v,stamp,'resources487-approved',pkg);
 UPDATE public."GameDataCurrent" SET version=v,published_at=stamp,data_json=pkg WHERE channel='production';
 UPDATE public.mist_seasons465 SET rules=jsonb_set(rules,'{planning,MistConfig}',(rules->'planning'->'MistConfig')||rows) WHERE status='ACTIVE';
 UPDATE public.mist_runtime468 SET revision=revision+1,meta=meta||jsonb_build_object('resources487',jsonb_build_object('appliedAt',stamp,'previousPlanningVersion',oldrow.version)) WHERE id=true;
END $$;
COMMIT;
