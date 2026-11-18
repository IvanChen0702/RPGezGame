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
player("b").equipment = {
  weapon: equip("weapon"),
  head: equip("head", true),
  armor: equip("armor"),
};
player("b").inventory.equipment = [equip("ring")];
player("b").pending_loot = [equip("ring")];
player("b").points = 8;
await act("b", "flag");
let r = await act("a", "battle/start", { targetId: cell("b").id });
const battle = input.world.meta.battles[r.battle.id];
battle.combat.defender.hp = 1;
battle.combat.attacker.stats.patk = 100000;
r = await act("a", "battle/turn", { skill: "slash" });
assert.equal(r.battle.result, "win");
assert.equal(r.self.points, 3);
assert.equal(player("b").points, 8);
assert.equal(player("b").runtime.dead, true);
assert.deepEqual(player("b").equipment, {});
assert.equal(player("b").inventory.equipment.length, 0);
assert.equal(player("b").pending_loot.length, 0);
assert.ok(!input.world.flags.find((f) => f.owner_account === "b"));
const loot = r.inventory.chests[0];
assert.ok(loot.contents.length >= 1 && loot.contents.length <= 3);
assert.ok(loot.contents.every((x) => !x.starter));
const death = await act("b", "status");
assert.equal(death.reports[0].result, "death");
player("b").energy = 0;
r = await act("b", "respawn");
assert.equal(r.self.hp, r.self.maxHp);
assert.equal(r.self.energy, Number(data.MistConfig.find(x=>x.Key==='EnergyCap').Value));
assert.equal(player("b").energy_at, new Date(input.now).toISOString());
await assert.rejects(()=>act("b","respawn"), /NOT_DEAD/);
assert.ok(r.starter && r.self.protectedUntil);
await act("a", "battle/leave", { battleId: battle.id });
assert.equal((await act("a", "status")).battle, null);
// Mutual death must let the attacking client leave its finished combat screen.
await pair();
r = await act("a", "battle/start", { targetId: cell("b").id });
let b = input.world.meta.battles[r.battle.id];
b.combat.attacker.hp = b.combat.defender.hp = 0;
r = await act("a", "battle/turn", { skill: "skip" });
assert.equal(r.battle.result, "mutual");
assert.equal(r.self.points, 0);
await act("a", "battle/leave", { battleId: b.id });
assert.equal((await act("a", "status")).battle, null);
assert.equal(player("a").runtime.dead, true);
player("a").energy=0;player("b").energy=0;
assert.equal((await act("a","respawn")).self.energy,10);
assert.equal((await act("b","respawn")).self.energy,10);
// Attacking loss deducts at most current points; defending winner gains points.
await pair();
player("a").points = 1;
r = await act("a", "battle/start", { targetId: cell("b").id });
b = input.world.meta.battles[r.battle.id];
b.combat.attacker.hp = 0;
r = await act("a", "battle/turn");
assert.equal(r.self.points, 0);
assert.equal(player("b").points, 3);
assert.equal(player("b").runtime.reports[0].result, "win");
await act("a", "battle/leave", { battleId: b.id });
player("a").energy=0;
assert.equal((await act("a","respawn")).self.energy,10);
// Revenge once, then both sides wait six hours. Use timeout draws to retain adjacent positions.
await pair();
r = await act("a", "battle/start", { targetId: cell("b").id });
input.now = "2026-11-16T01:11:00Z";
await act("a", "status");
await assert.rejects(
  () => act("a", "battle/start", { targetId: cell("b").id }),
  /PAIR_COOLDOWN/,
);
r = await act("b", "battle/start", { targetId: cell("a").id });
input.now = "2026-11-16T01:22:00Z";
await act("a", "status");
await assert.rejects(
  () => act("a", "battle/start", { targetId: cell("b").id }),
  /PAIR_COOLDOWN/,
);
await assert.rejects(
  () => act("b", "battle/start", { targetId: cell("a").id }),
  /PAIR_COOLDOWN/,
);
// Pending loot blocks movement; explicit discard unblocks it. Hide persists on movement.
reset();
r = await act("a", "join");
position("a", 5, 5);
input.world.cells = input.world.cells.filter((c) => !(c.x === 5 && c.y === 6));
player("a").pending_loot = [equip("ring")];
await assert.rejects(() => act("a", "move", { x: 5, y: 6 }), /LOOT_PENDING/);
await act("a", "loot/discard", { itemId: player("a").pending_loot[0].id });
r = await act("a", "hide");
assert.equal(r.self.energy, 7);
await act("a", "move", { x: 5, y: 6 });
assert.ok(player("a").hidden_until);
assert.equal(player("a").protected_until, null);
// Equipment, gems, forge keep the HP proportion and use only mode inventory.
let item = equip("armor");
player("a").inventory.equipment = [item];
player("a").hp = player("a").max_hp / 2;
r = await act("a", "equip", { itemId: item.id });
assert.ok(Math.abs(r.self.hp / r.self.maxHp - 0.5) < 0.02);
const forge = input.world.cells.find((c) => c.kind === "forge");
position("a", forge.x, forge.y - 1);
const ap = player("a").energy;
r = await act("a", "forge", { itemId: item.id });
assert.equal(r.equipment.armor.enhance, 10);
assert.equal(r.self.energy, ap - 1);
const g = {
  id: crypto.randomUUID(),
  kind: "gem",
  template: data.Gems[0].GemID,
};
player("a").inventory.gems = [g];
r = await act("a", "gem/insert", { itemId: item.id, gemId: g.id });
assert.equal(r.equipment.armor.gems[0].id, g.id);
await act("a", "gem/remove", { itemId: item.id });
assert.equal(player("a").inventory.gems.length, 1);
// Own proximity, not remote flag vision, grants supply; daily reset follows Taiwan time.
const supply = input.world.cells.find((c) => c.kind === "supply");
position("a", supply.x + 1, supply.y);
r = await act("a", "supply", { choice: "gem" });
assert.equal(r.self.suppliedToday, true);
await assert.rejects(
  () => act("a", "supply", { choice: "heal" }),
  /SUPPLY_USED/,
);
input.now = "2026-11-16T16:00:00Z";
r = await act("a", "status");
assert.equal(r.self.suppliedToday, false);
assert.equal(r.self.energy, 10);
// Monster timeout and defeat release its lock, preserve gear and return to spawn without protection.
reset();
await act("a", "join");
input.now = "2026-11-16T01:31:00Z";
await act("a", "status");
const monster = input.world.cells.find((c) => c.kind === "monster");
position("a", monster.x + 1, monster.y);
player("a").equipment = { weapon: equip("weapon") };
r = await act("a", "battle/start", { targetId: monster.id });
b = input.world.meta.battles[r.battle.id];
b.combat.attacker.hp = 0;
r = await act("a", "battle/turn");
assert.equal(r.battle.result, "loss");
assert.equal(r.self.energy,9,"monster loss does not refill stamina");
assert.ok(r.equipment.weapon);
assert.equal(r.self.points, 0);
assert.equal(r.self.protectedUntil, null);
assert.equal(r.self.hp, Math.max(1, Math.floor(r.self.maxHp * 0.3)));
assert.equal(
  input.world.cells.find((c) => c.id === monster.id).payload.battleId,
  undefined,
);
// Turning entries off does not strand active battles or prevent viewing/closing results.
await act("a", "battle/leave", { battleId: b.id });
position("a", monster.x + 1, monster.y);
r = await act("a", "battle/start", { targetId: monster.id });
data.MistConfig.find((r) => r.Key === "Enabled").Value = false;
r = await act("a", "status");
assert.equal(r.ready, false);
assert.ok(r.battle);
await assert.rejects(() => act("a", "hide"), /NOT_OPEN/);
input.now = "2026-11-16T01:42:00Z";
r = await act("a", "status");
assert.equal(r.battle.finished, true);
await act("a", "battle/leave", { battleId: r.battle.id });
console.log(
  "Mist PvP death/drop/revenge, inventory, HP, supply, monster recovery and closed-mode scenarios passed",
);

// v469: cosmetic projection is bounded and cannot alter combat stats or expose inventory.
data.MistConfig.find((r) => r.Key === "Enabled").Value = true;
reset();
await act('a','join');await act('b','join');
position('a',5,5);position('b',6,5);
player('b').protected_until=null;
const look={sex:'female',suit:7,head:6,kind:'staff',glow:true,account:'private',equipment:['private'],stats:{hp:999999}};
let cosmetic=await act('b','status',{appearance:look});
assert.notEqual(cosmetic.stats.hp,999999);
let observer=await act('a','status');
const seen=observer.cells.find(c=>c.object?.kind==='player').object;
assert.deepEqual(seen.appearance,{sex:'female',suit:7,head:6,kind:'staff',glow:true});
assert.ok(!('stats' in seen)&&!('equipment' in seen)&&!('account' in seen));
await act('b','hide');
observer=await act('a','status');
assert.ok(!observer.cells.some(c=>c.object?.kind==='player'));
input.world.cells=input.world.cells.filter(c=>!(c.x===5&&c.y===6));
await act('a','flag');
let moved=await act('a','move',{x:5,y:6});
assert.equal(moved.self.y,6);
assert.equal(moved.self.flags,1);
moved=await act('a','move',{x:5,y:5});
assert.equal(moved.self.y,5);
assert.equal(moved.self.energy,7);
assert.equal(moved.cells.find(c=>c.x===5&&c.y===5).flag.own,true);
console.log('Mist flag movement, isolated stats and private cosmetic projection passed');

// v470: the shared battle HUD receives only the actor's full stats and public cosmetics.
player('b').hidden_until=null;
player('b').protected_until=null;
r=await act('a','battle/start',{targetId:cell('b').id});
assert.ok(r.battle.attacker.stats);
assert.ok(r.battle.attacker.buff);
assert.ok(r.battle.defender.stats);
assert.deepEqual(r.battle.defender.appearance,{sex:'female',suit:7,head:6,kind:'staff',glow:true});
for(const key of ['equipment','skills','passive','account','inventory'])assert.ok(!(key in r.battle.defender));
console.log('Shared battle own HUD and opponent privacy passed');
