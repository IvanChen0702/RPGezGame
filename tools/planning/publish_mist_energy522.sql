-- Existing season adopts the new rules without refilling/resetting player energy.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $energy$
DECLARE
 oldrow public."GameDataCurrent"%ROWTYPE;
 s public.mist_seasons465%ROWTYPE;
 cfg jsonb; next_package jsonb; stamp timestamptz; next_version text;
 replacements jsonb := '{"EnergyInitial":30,"EnergyCap":30,"EnergyRecoveryMinutes":15}';
 previous jsonb := '{"EnergyInitial":20,"EnergyCap":20,"EnergyRecoveryMinutes":30}';
 before_players jsonb; before_seasons jsonb;
BEGIN
 PERFORM 1 FROM public.mist_runtime468 WHERE id=true FOR UPDATE;
 SELECT * INTO STRICT oldrow FROM public."GameDataCurrent" WHERE channel='production' FOR UPDATE;
 IF oldrow.version <> '20261119-120205-mistcapacity499' THEN RAISE EXCEPTION 'PLANNING_VERSION_CHANGED'; END IF;
 stamp:=clock_timestamp();
 IF (SELECT count(*) FROM jsonb_array_elements(oldrow.data_json->'data'->'MistConfig') r WHERE previous ? (r->>'Key') AND r->'Value'=previous->(r->>'Key')) <> 3
 THEN RAISE EXCEPTION 'ENERGY_CONFIG_CONFLICT'; END IF;
 SELECT jsonb_agg(to_jsonb(p)) INTO before_players FROM
 (SELECT p.season_id,p.account_id,p.energy,p.energy_at,p.revision FROM public.mist_players465 p JOIN public.mist_seasons465 season_row ON season_row.id=p.season_id WHERE season_row.status='ACTIVE') p;
 SELECT jsonb_agg(jsonb_build_object('id',id,'config',rules->'planning'->'MistConfig')) INTO before_seasons FROM public.mist_seasons465 WHERE status='ACTIVE';
 FOR s IN SELECT * FROM public.mist_seasons465 WHERE status='ACTIVE' FOR UPDATE LOOP
  IF (SELECT count(*) FROM jsonb_array_elements(s.rules->'planning'->'MistConfig') r WHERE previous ? (r->>'Key') AND r->'Value'=previous->(r->>'Key')) <> 3
  THEN RAISE EXCEPTION 'SEASON_ENERGY_CONFIG_CONFLICT'; END IF;
  -- Settle elapsed old-rate time first; preserve the fraction toward the next point.
  WITH elapsed AS (
   SELECT account_id,energy,greatest(0,extract(epoch FROM stamp-energy_at)) AS seconds
   FROM public.mist_players465 WHERE season_id=s.id
  ) UPDATE public.mist_players465 p SET
   energy=least(20,e.energy+floor(e.seconds/1800)::integer),
   energy_at=CASE WHEN e.energy+floor(e.seconds/1800)>=20 THEN stamp
     ELSE stamp-(mod(e.seconds,1800)/2)*interval '1 second' END,
   revision=p.revision+1
  FROM elapsed e WHERE p.season_id=s.id AND p.account_id=e.account_id;
  SELECT jsonb_agg(CASE WHEN replacements ? (r.value->>'Key') THEN r.value||jsonb_build_object('Value',replacements->(r.value->>'Key')) ELSE r.value END ORDER BY r.ord)
  INTO cfg FROM jsonb_array_elements(s.rules->'planning'->'MistConfig') WITH ORDINALITY r(value,ord);
  UPDATE public.mist_seasons465 SET rules=jsonb_set(rules,'{planning,MistConfig}',cfg) WHERE id=s.id;
 END LOOP;
 SELECT jsonb_agg(CASE WHEN replacements ? (r.value->>'Key') THEN r.value||jsonb_build_object('Value',replacements->(r.value->>'Key')) ELSE r.value END ORDER BY r.ord)
 INTO cfg FROM jsonb_array_elements(oldrow.data_json->'data'->'MistConfig') WITH ORDINALITY r(value,ord);
 next_version:=to_char(stamp AT TIME ZONE 'UTC','YYYYMMDD-HH24MISS')||'-energy522';
 next_package:=jsonb_set(oldrow.data_json,'{data,MistConfig}',cfg)||jsonb_build_object('dataVersion',next_version,'generatedAt',stamp);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json)
 SELECT oldrow.version,oldrow.published_at,'energy522-backup',oldrow.data_json WHERE NOT EXISTS(SELECT 1 FROM public."GameDataVersions" WHERE version=oldrow.version);
 INSERT INTO public."GameDataVersions"(version,published_at,published_by,data_json) VALUES(next_version,stamp,'energy522-approved',next_package);
 UPDATE public."GameDataCurrent" SET version=next_version,published_at=stamp,data_json=next_package WHERE channel='production';
 UPDATE public.mist_runtime468 SET revision=revision+1,meta=meta||jsonb_build_object('energy522',jsonb_build_object('appliedAt',stamp,'playersBefore',before_players,'seasonsBefore',before_seasons)) WHERE id=true;
END $energy$;
COMMIT;
SELECT version FROM public."GameDataCurrent" WHERE channel='production';
