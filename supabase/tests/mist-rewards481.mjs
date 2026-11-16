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

// Empty PvP drops are legitimate: no starter duplication, but a persisted reason is required.
await pair();player('a').equipment={head:equip('head',true),weapon:equip('weapon',true)};
let r=await act('b','battle/start',{targetId:cell('a').id});
let battle=input.world.meta.battles[r.battle.id];battle.combat.defender.hp=1;battle.combat.attacker.stats.patk=100000;
r=await act('b','battle/turn',{skill:'slash'});
assert.equal(r.battle.result,'win');assert.equal(r.inventory.chests.length,0);
assert.deepEqual(r.battle.loot481,{count:0,reason:'no_droppable_equipment'});
assert.deepEqual((await act('b','status')).battle.loot481,r.battle.loot481);
// Eligible gear still yields the same selected items; a full chest bag uses pending loot.
await pair();const item=equip('weapon');player('a').equipment={head:equip('head',true),weapon:item};
player('b').inventory.chests=Array.from({length:10},(_,i)=>({id:'old-'+i,kind:'chest',legendary:false}));
r=await act('b','battle/start',{targetId:cell('a').id});battle=input.world.meta.battles[r.battle.id];battle.combat.defender.hp=1;battle.combat.attacker.stats.patk=100000;
r=await act('b','battle/turn',{skill:'slash'});assert.equal(r.battle.loot481.count,1);
const chest=r.pendingLoot.find(x=>x.kind==='chest');assert.deepEqual(chest.contents,[item]);
r=await act('b','chest/open',{chestId:chest.id});assert.deepEqual(r.chestReveals471[0].items,[item]);
// Supply grants once and persists its exact identity even if the response is lost.
await pair();let supply=input.world.cells.find(c=>c.kind==='supply');position('a',supply.x,supply.y+1);
r=await act('a','supply',{choice:'gem'});const receipt=r.supplyReceipt481;assert.ok(receipt?.item?.name);assert.equal(receipt.item.kind,'gem');assert.equal(r.inventory.gems[0].id,receipt.id);
assert.deepEqual((await act('a','status')).supplyReceipt481,receipt);
await assert.rejects(()=>act('a','supply',{choice:'gem'}),/SUPPLY_USED/);assert.equal(player('a').inventory.gems.length,1);
assert.equal((await act('b','status')).supplyReceipt481,null,'another player cannot see the receipt');
// Full bag records the actual gem in pending loot; receipt is not a second reward.
await pair();supply=input.world.cells.find(c=>c.kind==='supply');position('a',supply.x,supply.y+1);
player('a').inventory.gems=Array.from({length:10},(_,i)=>({id:'gem-'+i,kind:'gem',template:data.Gems[0].GemID}));
r=await act('a','supply',{choice:'gem'});assert.equal(r.inventory.gems.length,10);assert.equal(r.pendingLoot[0].id,r.supplyReceipt481.id);
assert.equal((await act('a','status')).pendingLoot.length,1);
console.log('Rewards481: empty PvP reason, eligible exact drops, full chest bag, supply receipt persistence, exact-once and privacy passed');
