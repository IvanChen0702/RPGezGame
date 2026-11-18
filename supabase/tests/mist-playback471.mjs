import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMistCombat468} from '../functions/game-api/mist-combat468.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
const c=createMistCombat468(data,()=>0.4);
const snapshot=(skill)=>({...c.snapshot({nickname:'test',equipment:{},skills:{active:[skill]}}),stats:{hp:10000,patk:150,matk:150,def:10,crit:0,critDamage:100}});
for(const skill of ['slash','magicMissileII','magicMissileIII','magicBurst']){
 const a=snapshot(skill),d={...snapshot('slash'),skills:[],ai:[],name:'enemy'};
 const b=c.create(a,d);b.attacker.arcaneStacks=3;
 const out=await c.turn(b,skill);
 const ev=out.events471,attacks=ev.filter(e=>e.type==='visual'&&e.actor==='attacker'&&['magic','physical','crit'].includes(e.kind));
 assert.ok(ev.some(e=>e.type==='cast'&&e.skillId===skill));
 assert.ok(attacks.length>=(skill.includes('II')?2:1));
 assert.ok(ev.some(e=>e.type==='visual'&&e.actor==='defender'));
 assert.equal(attacks[0].frame.defender.hp,10000,'HP is preserved until first impact');
 assert.ok(out.defender.hp<attacks[0].frame.defender.hp);
 for(let i=1;i<attacks.length;i++)assert.ok(attacks[i].frame.defender.hp<attacks[i-1].frame.defender.hp,'multi-hit impacts have distinct HP snapshots');
 for(const e of ev){for(const key of ['skills','equipment','equipmentList','ai','passive'])assert.ok(!(key in e.frame.defender),'opponent private data excluded');}
 assert.ok(ev.length<=512);
 const next=await c.turn(out,'skip');assert.ok(!next.events471.some(e=>e.type==='cast'&&e.actor==='attacker'),'previous cast is not replayed next turn');
 console.log(skill,attacks.length,'ordered attack events');
}
// Reflection is its own stationary shield event, never a second attack.
const reflectionItem=data.Equipment.find(x=>String(x.EffectKey).includes('reflect'));
assert.ok(reflectionItem);
const a=snapshot('slash'),d=c.snapshot({nickname:'reflector',equipment:{armor:{template:reflectionItem.ItemID,enhance:0,gems:[]}},skills:{active:[]}});d.stats={...a.stats};
const out=await c.turn(c.create(a,d),'slash');
assert.ok(out.events471.some(e=>e.type==='reflect'&&e.actor==='defender'&&e.target==='attacker'));
assert.equal(out.events471.filter(e=>e.type==='visual'&&e.actor==='defender'&&e.kind==='physical').length,1,'only actual enemy action creates forward attack');
console.log('Reflection, bounded timeline, per-turn reset, and opponent privacy passed');
