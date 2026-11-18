import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { handleMist468 } from "../functions/game-api/mist-api468.js";
const data = JSON.parse(
  readFileSync(new URL("./fixtures/mist468-planning.json", import.meta.url)),
);
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
])
  await db.exec(
    readFileSync(new URL("../migrations/" + f, import.meta.url), "utf8"),
  );
// Apply the new projection after the historical schema, as migration 482 does.
await db.exec(`do $$ begin execute replace(pg_get_functiondef('game_mist_load468(text,uuid)'::regprocedure),'BoxingSeasons_SCHEMA','MistRankRewards');end $$;`);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
let now = "2026-11-16T01:00:00.000Z";
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
assert.equal((await status("locked")).error, "MIST_NOT_UNLOCKED");
assert.equal((await status("disabled")).error, "MIST_NOT_UNLOCKED");
let a = await act("a", "join");
assert.equal(a.self.energy, 10);
assert.ok([4, 6].includes(a.cells.length));
assert.ok(a.starter);
assert.equal(a.ready, true);
// Real SQL persistence: flag insertion must not lock the player in place.
const origin469={x:a.self.x,y:a.self.y};
a=await act('a','flag');
const step469=a.cells.find(c=>Math.abs(c.x-a.self.x)+Math.abs(c.y-a.self.y)===1&&!c.object);
assert.ok(step469);
a=await act('a','move',{x:step469.x,y:step469.y});
assert.equal(a.ok,true);assert.equal(a.self.x,step469.x);assert.equal(a.self.y,step469.y);
a=await act('a','move',origin469);
assert.equal(a.ok,true);assert.equal(a.self.flags,1);
await act('a','unflag',origin469);
// Restore test energy only, so the existing combat assertions stay independent.
await db.exec("update mist_players465 set energy=10 where account_id='a'");
a=await status('a');
let first = await one(
  'select save_json from "PlayerSaves" where account_id=$1',
  ["a"],
);
const request = crypto.randomUUID(),
  payload = {
    action: "mist/chest/open",
    requestId: request,
    expectedRevision: a.self.revision,
    chestId: a.starter.id,
  };
a = await handleMist468(rpc, "a", payload);
assert.equal(a.inventory.equipment.length, 4);
assert.ok(
  a.inventory.equipment.every(
    (x) => x.starter && x.sockets === 1 && !/gmsword/i.test(x.template),
  ),
);
const ids = a.inventory.equipment.map((x) => x.id);
const retry = await handleMist468(rpc, "a", payload);
assert.deepEqual(
  retry.inventory.equipment.map((x) => x.id),
  ids,
);
assert.equal(
  (await handleMist468(rpc, "a", { ...payload, chestId: crypto.randomUUID() }))
    .error,
  "MIST_REQUEST_REUSED",
);
assert.deepEqual((await status('a')).chestReveals471[0].items.map(x=>x.id),ids);
const confirmPayload={action:'mist/chest/confirm',requestId:crypto.randomUUID(),expectedRevision:a.self.revision,chestId:payload.chestId,choice:'keep'};
a=await handleMist468(rpc,'a',confirmPayload);
assert.equal(a.chestReveals471.length,0);
assert.deepEqual(await handleMist468(rpc,'a',confirmPayload),a,'SQL receipt replays confirmation without awarding twice');
a = await act("a", "equip", { itemId: ids[2] });
assert.ok(a.equipment.weapon);
assert.equal(a.inventory.equipment.length, 3);
assert.equal(
  (await act("a", "skills", { active: ["unownedSkill"], passive: null })).error,
  "MIST_SKILL_NOT_OWNED",
);
await act("b", "join");
await db.exec("reset role");
// Place only synthetic test players adjacent; never performed against production.
await db.exec(
  "delete from mist_cells465 where kind<>'player' and (x,y) in ((3,3),(4,3));update mist_cells465 set x=3,y=3 where owner_account='a';update mist_cells465 set x=4,y=3 where owner_account='b';update mist_players465 set protected_until=null,hidden_until=null where account_id in ('a','b');delete from mist_cells465 where kind<>'player' and (x,y) in ((3,3),(4,3));",
);
await db.exec("set role service_role");
a = await status("a");
const target = a.cells.find((x) => x.object?.kind === "player").object;
assert.equal(target.name, "B");
assert.ok(!JSON.stringify(target).includes("equipment"));
let started = await act("a", "battle/start", { targetId: target.id });
assert.ok(started.battle);
assert.equal(started.self.energy, 9);
assert.ok((await status("b")).self.battleId);
assert.equal((await act("b", "move", { x: 4, y: 4 })).error, "MIST_IN_BATTLE");
const battle = started.battle.id;
let next = await act("a", "battle/turn", { battleId: battle, skill: "slash" });
assert.equal(next.battle.turn, 2);
assert.ok(next.battle.defender.hp < next.battle.defender.maxHp);
now = "2026-11-16T01:11:00.000Z";
next = await status("a");
assert.equal(next.battle.finished, true);
assert.equal(next.battle.result, "draw");
assert.equal((await status("b")).self.battleId, null);
assert.equal(
  (await act("a", "battle/start", { targetId: target.id })).error,
  "MIST_PAIR_COOLDOWN",
);
// Same transaction cannot be applied on an outdated world revision.
const loaded = await rpc("game_mist_load468", {
  p_account: "a",
  p_request: null,
});
assert.equal(
  (
    await rpc("game_mist_commit468", {
      p_account: "a",
      p_request: crypto.randomUUID(),
      p_action: "test",
      p_payload: {},
      p_revision: loaded.world.revision - 1,
      p_patch: {},
      p_result: { ok: true },
    })
  ).error,
  "MIST_RETRY",
);
assert.deepEqual(
  (await one('select save_json from "PlayerSaves" where account_id=$1', ["a"]))
    .save_json,
  first.save_json,
  "mode play never writes formal save",
);
// Competing moves into one cell: exactly one wins, the loser spends no energy.
await db.exec(
  "delete from mist_cells465 where kind<>'player' and (x,y) in ((3,4),(4,4),(5,4));update mist_cells465 set x=3,y=4 where owner_account='a';update mist_cells465 set x=5,y=4 where owner_account='b';",
);
const aBefore = await status("a"),
  bBefore = await status("b");
const race = await Promise.all(
  [
    ["a", aBefore],
    ["b", bBefore],
  ].map(([id, s]) =>
    handleMist468(rpc, id, {
      action: "mist/move",
      x: 4,
      y: 4,
      requestId: crypto.randomUUID(),
      expectedRevision: s.self.revision,
    }),
  ),
);
assert.equal(race.filter((r) => r.ok).length, 1);
assert.equal(race.find((r) => !r.ok).error, "MIST_CELL_BLOCKED");
assert.equal(
  (await status("a")).self.energy + (await status("b")).self.energy,
  aBefore.self.energy + bBefore.self.energy - 1,
);
const flagPlanted476=Date.parse(now);
const c = await act("c", "join"),
  duplicate = {
    action: "mist/flag",
    requestId: crypto.randomUUID(),
    expectedRevision: c.self.revision,
  };
const twice = await Promise.all([
  handleMist468(rpc, "c", duplicate),
  handleMist468(rpc, "c", duplicate),
]);
assert.ok(twice.every((r) => r.ok));
assert.equal((await status("c")).self.energy, 9);
assert.equal((await status("c")).self.flags, 1);
// Sunday close, grace settlement, Monday reset, pending reward survives reset.
now = "2026-11-22T15:01:00.000Z";
assert.equal((await status("a")).ready, false);
assert.equal((await act("a", "hide")).error, "MIST_NOT_OPEN");
now = "2026-11-22T15:11:00.000Z";
await status("a");
let rewards = (await status("a")).rewards;
// Player c retained a flag all week and now outranks a through passive scoring.
const flagTotal476=Math.floor((Date.parse('2026-11-22T15:00:00Z')-flagPlanted476)/10800000);
assert.equal((await status('c')).self.points,flagTotal476);
assert.equal((await status('c')).self.points,flagTotal476,'SQL cursor persists across repeated reads');
assert.equal(rewards[0].quantity, 80);
const season = rewards[0].seasonId;
now = "2026-11-22T16:00:00.000Z";
a = await status("a");
assert.equal(a.self, null);
assert.equal(a.rewards[0].seasonId, season);
let claim = await rpc("game_mist_reward_claim468", {
  p_account: "a",
  p_season: season,
  p_expected_revision: 1,
});
assert.equal(claim.save.consumables.luckyBox, 82);
assert.equal(claim.revision, 2);
claim = await rpc("game_mist_reward_claim468", {
  p_account: "a",
  p_season: season,
  p_expected_revision: 1,
});
assert.equal(claim.duplicate, true);
assert.equal(claim.save.consumables.luckyBox, 82);
await db.exec("reset role;set role authenticated");
await assert.rejects(
  () => rpc("game_mist_load468", { p_account: "a" }),
  /permission denied/,
);
await assert.rejects(
  () => db.exec("select * from mist_players465"),
  /permission denied/,
);
await db.exec("reset role;set role service_role");
await assert.rejects(
  () => db.exec("truncate mist_rewards468"),
  /permission denied/,
);
console.log(
  "Mist transaction, recovery, isolation, season and reward checks passed",
);
await db.close();
