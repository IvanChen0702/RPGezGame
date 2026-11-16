import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reduceMist468 } from "../functions/game-api/mist-runtime468.js";
const data = JSON.parse(
  readFileSync(new URL("./fixtures/mist468-planning.json", import.meta.url)),
);
data.MistConfig.find((r) => r.Key === "Enabled").Value = true;
let input;
const reset = () =>
  (input = {
    world: {
      revision: 0,
      meta: {},
      season: null,
      players: {},
      cells: [],
      flags: [],
    },
    now: "2026-11-16T01:00:00Z",
    planning: { data, dataVersion: "fixture" },
    save: {
      skillsOwned: ["slash", "adventurerAptitude"],
      equippedSkills: ["slash"],
      passive: ["adventurerAptitude"],
    },
    rewards: [],
    nickname: "Test",
  });
async function act(who, action, payload = {}) {
  const r = await reduceMist468(
    input,
    who,
    action,
    { expectedRevision: input.world.players[who]?.revision, ...payload },
    () => 0.4,
  );
  if (r.world) input.world = r.world;
  return r.result;
}
const player = (id) => input.world.players[id];
const cell = (id) =>
  input.world.cells.find((x) => x.owner_account === id && x.kind === "player");
function position(id, x, y) {
  input.world.cells = input.world.cells.filter(
    (c) => !(c.x === x && c.y === y && c.owner_account !== id),
  );
  Object.assign(cell(id), { x, y });
}
const equip = (slot, starter = false) => {
  const r = data.Equipment.find(
    (x) => x.Slot === slot && !/gmsword/i.test(x.ItemID),
  );
  return {
    id: crypto.randomUUID(),
    template: r.ItemID,
    name: r.Name,
    slot,
    rarity: r.Rarity,
    kind: "equipment",
    enhance: 1,
    sockets: 1,
    gems: [null],
    starter,
  };
};
async function pair() {
  reset();
  await act("a", "join");
  await act("b", "join");
  position("a", 3, 3);
  position("b", 4, 3);
  player("a").protected_until = null;
  player("b").protected_until = null;
}

await pair();
await act('a','flag');
input.now='2026-11-16T04:00:00Z';
await act('b','status');
assert.deepEqual((await act('a','status')).reports[0].position,{x:3,y:3});
const before=structuredClone(input.world);
player('b').energy=1;player('b').energy_at=input.now;
await assert.rejects(()=>act('b','unflag',{x:3,y:3}),/ENERGY_LOW/);
assert.equal(player('a').runtime.reports.length,before.players.a.runtime.reports.length,'failed removal writes no report');
player('b').energy=10;
await act('b','unflag',{x:3,y:3});
const lost=(await act('a','status')).reports.find(x=>x.result==='flag_lost');
const captured=(await act('b','status')).reports.find(x=>x.result==='flag_capture');
assert.ok(lost.unread);assert.match(lost.description,/Test.*駐守時間已重置/);
assert.deepEqual(lost.position,{x:3,y:3});assert.deepEqual(captured.position,lost.position);
assert.equal(lost.points,1);assert.equal(captured.points,3);
assert.equal(input.world.flags.length,0);
await assert.rejects(()=>act('b','unflag',{x:3,y:3}),/FLAG_MISSING/);
assert.equal((await act('a','status')).reports.filter(x=>x.result==='flag_lost').length,1);
await act('a','reports/read');assert.equal((await act('a','status')).reports.find(x=>x.id===lost.id).unread,false);
await act('a','flag');await act('a','unflag',{x:3,y:3});
assert.equal((await act('a','status')).reports.filter(x=>x.result==='flag_lost').length,1,'own withdrawal is not enemy removal');
// Encounter coordinates survive target death and the next respawn; they never follow current position.
let d=await act('b','battle/start',{targetId:cell('a').id});
const battle=input.world.meta.battles[d.battle.id];battle.combat.defender.hp=1;battle.combat.attacker.stats.patk=100000;
await act('b','battle/turn',{skill:'slash'});
assert.equal(player('a').runtime.dead,true);
assert.deepEqual((await act('a','status')).reports[0].position,{x:3,y:3});
assert.deepEqual((await act('b','status')).reports[0].position,{x:3,y:3});
await act('a','respawn');assert.deepEqual((await act('a','status')).reports[0].position,{x:3,y:3});
// Old in-flight battles use the target's position before it is removed.
await pair();d=await act('b','battle/start',{targetId:cell('a').id});
const old=input.world.meta.battles[d.battle.id];delete old.position;
old.combat.defender.hp=1;old.combat.attacker.stats.patk=100000;
await act('b','battle/turn',{skill:'slash'});
assert.deepEqual((await act('a','status')).reports[0].position,{x:3,y:3});
// Private legacy records have no invented coordinate; visible players get no recovery clock.
delete player('a').runtime.reports[0].summary.position;
assert.equal((await act('a','status')).reports[0].position,null);
await pair();await act('a','flag');
const status=await act('a','status');assert.equal(status.self.energyNextAt,'2026-11-16T02:00:00.000Z');
assert.equal(status.cells.find(x=>x.object?.kind==='player').object.energyNextAt,undefined);
console.log('Reports479: flag removal both parties/coordinates/rollback, read state, battle death+respawn+legacy positions and private recovery time passed');
