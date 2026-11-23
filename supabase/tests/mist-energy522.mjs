import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { handleMist468 } from "../functions/game-api/mist-api468.js";
const data = JSON.parse(
  readFileSync(new URL("./fixtures/mist468-planning.json", import.meta.url)),
);
for(const [k,v] of Object.entries({EnergyInitial:20,EnergyCap:20,EnergyRecoveryMinutes:30})) data.MistConfig.find(r=>r.Key===k).Value=v;
data.MistConfig.find((r) => r.Key === "Enabled").Value = true;
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role,anon,authenticated;
create table "Accounts"(account_id text primary key,nickname text,disabled boolean default false);
create table "PlayerSaves"(id bigserial primary key,account_id text unique,save_json jsonb,revision bigint default 1,updated_at timestamptz default now());
create table "GameDataCurrent"(channel text primary key,data_json jsonb);
insert into "Accounts" values('a','A',false),('b','B',false),('c','C',false),('locked','L',false),('disabled','D',true);
insert into "PlayerSaves"(account_id,save_json) select account_id,jsonb_build_object('maxCleared',case when account_id='locked' then 0 else 1 end,'mainProgressEpoch',411,'skillsOwned',jsonb_build_array('slash','adventurerAptitude'),'equippedSkills',jsonb_build_array('slash'),'passive',jsonb_build_array('adventurerAptitude'),'consumables',jsonb_build_object('luckyBox',2),'serverReceipts','{}'::jsonb) from "Accounts";
grant select,update on "PlayerSaves" to service_role;grant select,update on "Accounts" to service_role;grant select on "GameDataCurrent" to service_role;`);
await db.query('insert into "GameDataCurrent" values($1,$2)', [
  "production",
  JSON.stringify({ data, dataVersion: "test" }),
]);
for (const f of [
  "20261115140245_mist_world465.sql",
  "20261115163236_mist_runtime468.sql",
  "20261116032956_mist_energy478.sql",
])
  await db.exec(
    readFileSync(new URL("../migrations/" + f, import.meta.url), "utf8"),
  );
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
let now = "2026-11-23T01:00:00.000Z";
const rpc = async (name, args) => {
  const keys = Object.keys(args),
    sql =
      "select public." +
      name +
      "(" +
      keys.map((k, i) => k + "=> $" + (i + 1)).join(",") +
      ") d";
  const r = (
    await one(
      sql,
      Object.values(args).map((x) =>
        x && typeof x === "object" ? JSON.stringify(x) : x,
      ),
    )
  ).d;
  if (name === "game_mist_load468") r.now = now;
  return r;
};
await db.exec("set role service_role");
const status = (account) =>
  handleMist468(rpc, account, { action: "mist/status" });
const act = async (account, action, p = {}, id = crypto.randomUUID()) => {
  const d = await status(account);
  return handleMist468(rpc, account, {
    action: "mist/" + action,
    requestId: id,
    expectedRevision: d.self?.revision,
    ...p,
  });
};

await act('a','join');await act('b','join');
await db.exec("reset role;alter table \"GameDataCurrent\" add column version text default '20261119-120205-mistcapacity499';alter table \"GameDataCurrent\" add column published_at timestamptz default now();create table \"GameDataVersions\"(version text,published_at timestamptz,published_by text,data_json jsonb)");
await db.exec(readFileSync(new URL('../migrations/20261123135148_mist_energy522.sql',import.meta.url),'utf8'));
await db.exec("update mist_players465 set energy=2,energy_at=timestamptz '2026-11-23T01:00:00Z'-interval '15 minutes' where account_id='b';update mist_players465 set energy=20,energy_at=timestamptz '2026-11-23T01:00:00Z'-interval '2 days' where account_id='a'");
const oldPlayers=(await db.query('select * from mist_players465 order by account_id')).rows;
const oldWorld=await rpc('game_mist_load468',{p_account:'a'});
const publish=readFileSync(new URL('../../tools/planning/publish_mist_energy522.sql',import.meta.url),'utf8').replaceAll('clock_timestamp()',"timestamptz '2026-11-23T01:00:00Z'");
await db.exec(publish);
const newPlayers=(await db.query('select * from mist_players465 order by account_id')).rows;
for(let i=0;i<oldPlayers.length;i++){
 const old={...oldPlayers[i]},fresh={...newPlayers[i]};
 for(const k of ['energy','energy_at','revision']){delete old[k];delete fresh[k];}assert.deepEqual(fresh,old);
}
assert.equal(newPlayers[0].energy,20,'old full energy is not retroactively raised to 30');
assert.equal(newPlayers[1].energy,2,'half-hour old progress preserved, not credited as a full old-hour');
const applied=(await one("select meta->'energy522'->>'appliedAt' stamp from mist_runtime468")).stamp;
const sample=(min)=>new Date(Date.parse(applied)+min*60000).toISOString();
const season=(await one('select * from mist_seasons465')).rules;
const cfg=Object.fromEntries(season.planning.MistConfig.map(r=>[r.Key,r.Value]));
assert.equal(cfg.EnergyCap,30);assert.equal(cfg.EnergyInitial,30);assert.equal(cfg.EnergyRecoveryMinutes,15);
now=sample(7);assert.equal((await status('b')).self.energy,2);
now=sample(7.5);assert.equal((await status('b')).self.energy,3,'half progress completes after 7.5 minutes');
now=sample(14);assert.equal((await status('a')).self.energy,20);
now=sample(15);const a522=await status('a');assert.equal(a522.self.energy,21);assert.equal(a522.energyRules.cap,30);assert.equal(a522.energyRules.recoveryMinutes,15);
assert.equal((await act('c','join')).self.energy,30);assert.equal((await act('c','flag')).self.energy,29);
now=sample(700);assert.equal((await status('a')).self.energy,30);
await assert.rejects(()=>db.exec('update mist_players465 set energy=31'),/check constraint/);
const stale=await rpc('game_mist_commit468',{p_account:'a',p_request:crypto.randomUUID(),p_action:'status',p_payload:{},p_revision:oldWorld.world.revision,p_patch:{},p_result:{ok:true}});assert.equal(stale.error,'MIST_RETRY');
await assert.rejects(()=>db.exec(publish),/PLANNING_VERSION_CHANGED/);await db.exec('rollback');
await db.close();console.log('Energy522: 30 initial/cap, 15-minute recovery, partial progress, no refill, unchanged inventory/HP/points, stale writes and version guard passed');
