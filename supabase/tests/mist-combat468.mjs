import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createMistCombat468 } from "../functions/game-api/mist-combat468.js";
const data = JSON.parse(
  readFileSync(new URL("./fixtures/mist468-planning.json", import.meta.url)),
);
let seed = 11;
const rng = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const runtime = () => createMistCombat468(data, rng);
let checked = 0;
for (const sk of data.Skills.filter(
  (x) => x.Type === "active" && x.Enabled !== false,
)) {
  const c = runtime(),
    a = c.snapshot({
      nickname: "A",
      equipment: {},
      skills: { active: [sk.SkillID] },
    });
  a.stats.hp = 10000;
  a.stats.patk = 500;
  a.stats.matk = 500;
  const d = { ...a, name: "D", skills: [], ai: [] };
  const b = c.create(a, d);
  try {
    const result = await c.turn(b, sk.SkillID);
    assert.ok(
      Number.isFinite(result.attacker.hp) &&
        Number.isFinite(result.defender.hp),
    );
    checked++;
  } catch (e) {
    console.error("SKILL", sk.SkillID, e);
    throw e;
  }
}
for (const item of data.Equipment) {
  const c = runtime(),
    a = c.snapshot({
      nickname: "A",
      equipment: {
        weapon: {
          id: "x",
          template: item.ItemID,
          enhance: 9,
          sockets: 1,
          gems: [null],
        },
      },
      skills: { active: ["slash"] },
    });
  a.stats.hp = Math.max(10000, a.stats.hp);
  const d = { ...a, name: "D", equipmentList: [], skills: [], ai: [] };
  try {
    await c.turn(c.create(a, d), "slash");
    checked++;
  } catch (e) {
    console.error("ITEM", item.ItemID, e);
    throw e;
  }
}
for (const gem of data.Gems) {
  const c = runtime(),
    a = c.snapshot({
      nickname: "A",
      equipment: {
        weapon: {
          id: "x",
          template: "shortSword",
          enhance: 5,
          sockets: 1,
          gems: [{ template: gem.GemID }],
        },
      },
      skills: { active: ["slash"] },
    });
  a.stats.hp = 10000;
  const d = { ...a, name: "D", equipmentList: [], skills: [], ai: [] };
  try {
    await c.turn(c.create(a, d), "slash");
    checked++;
  } catch (e) {
    console.error("GEM", gem.GemID, e);
    throw e;
  }
}
for (const m of data.MistEnemies) {
  const c = runtime(),
    a = c.snapshot({
      nickname: "A",
      equipment: {},
      skills: { active: ["slash"] },
    });
  a.stats.hp = 100000;
  const d = {
    name: m.Name,
    stats: {
      hp: m.HP,
      def: m.DEF,
      patk: m.PATK,
      matk: m.MATK,
      crit: 0,
      critDamage: 100,
    },
    skills: [],
    equipmentList: [],
  };
  let b = c.create(a, d);
  for (let i = 0; i < 5 && !b.finished; i++) b = await c.turn(b, "skip", m);
  checked++;
}
console.log("Shared combat cases passed:", checked);
// Exercise low-HP and guaranteed chance branches on both sides, not only a single random sample.
for (const item of data.Equipment.filter((r) => !/gmsword/i.test(r.ItemID))) {
  const c = createMistCombat468(data, () => 0),
    a = c.snapshot({
      nickname: "A",
      equipment: {
        weapon: { template: item.ItemID, enhance: 9, gems: [null] },
      },
      skills: { active: ["slash"] },
    });
  a.stats.hp = 100000;
  a.stats.crit = 100;
  const d = {
    ...a,
    name: "D",
    stats: { ...a.stats },
    ai: [{ skill: "slash", priority: 1, condition: "ALWAYS" }],
  };
  let b = c.create(a, d, 25000, 25000);
  for (let i = 0; i < 3 && !b.finished; i++) b = await c.turn(b, "slash");
  assert.ok(Number.isFinite(b.attacker.hp) && Number.isFinite(b.defender.hp));
}
for (const sk of data.Skills.filter(
  (x) => x.Type === "passive" && x.Enabled !== false,
)) {
  const c = createMistCombat468(data, () => 0),
    a = c.snapshot({
      nickname: "A",
      equipment: {},
      skills: { active: ["slash"], passive: sk.SkillID },
    });
  a.stats.hp = 10000;
  const d = { ...a, name: "D", stats: { ...a.stats }, ai: [] };
  let b = c.create(a, d);
  for (let i = 0; i < 3 && !b.finished; i++) b = await c.turn(b, "slash");
  assert.ok(Number.isFinite(b.attacker.hp));
}
for (const id of ["mist_normal_1", "mist_normal_7", "mist_normal_3"]) {
  const m = data.MistEnemies.find((r) => r.EnemyID === id),
    c = createMistCombat468(data, () => 0.99),
    a = {
      name: "A",
      stats: {
        hp: 100000,
        patk: 10,
        matk: 10,
        def: 0,
        crit: 0,
        critDamage: 100,
      },
      skills: [],
      equipmentList: [],
    },
    d = {
      name: m.Name,
      stats: {
        hp: m.HP,
        patk: m.PATK,
        matk: m.MATK,
        def: m.DEF,
        crit: 0,
        critDamage: 100,
      },
      skills: [],
      equipmentList: [],
    };
  let b = c.create(a, d, 100000, m.HP / 2);
  for (let i = 1; i <= 3; i++) {
    b = await c.turn(b, "skip", m);
    if (i < 3) {
      assert.ok(!b.attacker.status.poison && !b.attacker.status.burning);
      assert.equal(b.defender.hp, m.HP / 2);
    } else if (id === "mist_normal_3") assert.ok(b.defender.hp > m.HP / 2);
    else
      assert.ok(
        b.attacker.status[id === "mist_normal_1" ? "poison" : "burning"],
      );
  }
}
console.log(
  "Guaranteed equipment procs, all passive skills and monster ability timing passed",
);
const limitCore=createMistCombat468(data,()=>.99),unit={name:'A',stats:{hp:1000000,def:0,patk:1,matk:1,crit:0,critDamage:100},skills:[],equipmentList:[]};
let limitBattle=limitCore.create(unit,{...unit,name:'D'});
for(let i=1;i<=30;i++){limitBattle=await limitCore.turn(limitBattle,'skip');assert.equal(limitBattle.finished,i===30);}
assert.equal(limitBattle.turn,30);console.log('Exact 30-round draw limit passed');
