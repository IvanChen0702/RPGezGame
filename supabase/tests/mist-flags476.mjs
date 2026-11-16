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
const f={x:3,y:3};
input.now='2026-11-16T03:59:59Z';
assert.equal((await act('b','status')).self.points,0);
assert.equal(player('a').points,0);
input.now='2026-11-16T04:00:00Z';
await act('b','status');
assert.equal(player('a').points,1,'offline owner earns at exact three hours');
await act('a','status');assert.equal(player('a').points,1,'repeat status cannot award twice');
input.now='2026-11-16T10:05:00Z';
await act('b','status');assert.equal(player('a').points,3,'catch up multiple periods');
const projected=await act('a','status');
assert.equal(projected.cells.find(c=>c.x===3&&c.y===3).flag.createdAt,'2026-11-16T01:00:00.000Z');
await act('b','unflag',f);assert.equal(player('b').points,3);assert.equal(player('b').energy,8);
assert.equal(input.world.flags.length,0);assert.equal(Object.keys(input.world.meta.flagScores476).length,0);
await assert.rejects(()=>act('b','unflag',f),/FLAG_MISSING/);assert.equal(player('b').points,3);
await act('a','flag');
input.now='2026-11-16T13:04:59Z';await act('b','status');assert.equal(player('a').points,3,'replacement starts fresh');
input.now='2026-11-16T13:05:00Z';await act('b','status');assert.equal(player('a').points,4);
await act('a','unflag',f);assert.equal(player('a').points,4,'own removal gives no points');
await act('a','flag');
player('b').energy=1;await assert.rejects(()=>act('b','unflag',f),/ENERGY_LOW/);
assert.equal(input.world.flags.length,1);assert.equal(player('b').points,3);
player('b').energy=10;
let r=await act('b','battle/start',{targetId:cell('a').id});
let battle=input.world.meta.battles[r.battle.id];battle.combat.defender.hp=1;battle.combat.attacker.stats.patk=100000;
await act('b','battle/turn',{skill:'slash'});
assert.equal(player('a').runtime.dead,true);assert.equal(input.world.flags.length,0);
const points=player('a').points;
input.now='2026-11-17T13:05:00Z';await act('b','status');assert.equal(player('a').points,points,'dead flags never keep accruing');
await pair();await act('a','flag');
input.now=input.world.season.closes_at;await act('a','status');
const finalPoints=player('a').points;
input.now=input.world.season.settles_at;await act('a','status');assert.equal(player('a').points,finalPoints);
input.now='2026-11-22T15:59:00Z';await act('a','status');assert.equal(player('a').points,finalPoints,'no score after closure');
console.log('flag score boundary, offline catch-up, idempotency, removal, respawn timer, death, cutoff passed');
