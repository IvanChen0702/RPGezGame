import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMistCombat468} from '../functions/game-api/mist-combat468.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
const snapshot=name=>({name,stats:{hp:10000,patk:1,matk:1,def:0,crit:0,critDamage:100},skills:['healIII','slash'],equipmentList:[],ai:[]});
for(const kind of ['heal','healPercentRegen']){
 const c=createMistCombat468(data,()=>.4);
 Object.assign(c.templates.skills.healIII,{kind,value:100,regen:kind==='heal'?50:.005,duration:3,cd:0});
 const fresh=()=>c.create(snapshot('A'),snapshot('D'),3000,3000);
 const ticks=(r,side)=>r.events471.filter(e=>e.type==='log'&&e.text.startsWith((side==='attacker'?'A':'D')+' 持續恢復：'));
 let b=fresh(),r=await c.turn(b,'healIII');
 assert.equal(r.attacker.hp,3099,kind+' direct heal only on cast');assert.equal(r.attacker.regenTurns,3);assert.equal(ticks(r,'attacker').length,0);
 for(let remaining=2;remaining>=0;remaining--){
  const hp=r.attacker.hp;r=await c.turn(JSON.parse(JSON.stringify(r)),'skip');
  assert.equal(r.attacker.hp,hp+49);assert.equal(r.attacker.regenTurns,remaining);assert.equal(ticks(r,'attacker').length,1);
 }
 r=await c.turn(r,'skip');assert.equal(ticks(r,'attacker').length,0);
 // Defender regeneration belongs to the defender's next turn, not the attacker's next action.
 b=fresh();b.defender.ai=[{skill:'healIII',priority:1,condition:'ALWAYS'}];
 r=await c.turn(b,'skip');assert.equal(r.defender.hp,3100);assert.equal(r.defender.regenTurns,3);assert.equal(ticks(r,'defender').length,0);
 r.defender.ai=[];r=await c.turn(r,'slash');
 assert.equal(r.defender.regenTurns,2);const heal=r.events471.indexOf(ticks(r,'defender')[0]);
 assert(heal>r.events471.findIndex(e=>e.type==='cast'&&e.actor==='attacker'));
 assert(heal<r.events471.findIndex(e=>e.type==='visual'&&e.actor==='defender'));
 // Refresh gets only the existing start-of-turn tick and replaces the remaining duration.
 b=await c.turn(fresh(),'healIII');b.attacker.cooldowns={};r=await c.turn(b,'healIII');
 assert.equal(ticks(r,'attacker').length,1);assert.equal(r.attacker.regenTurns,3);
 for(const id of ['heal_block','curse','enhancement_lock','stun','freeze']){
  b=await c.turn(fresh(),'healIII');b.attacker.status[id]={turns:2,stacks:1};
  const hp=b.attacker.hp;r=await c.turn(b,'skip');
  assert.equal(r.attacker.regenTurns,2,id+' consumes one regeneration tick');
  assert.equal(r.attacker.hp,hp-1+(id==='heal_block'?0:id==='curse'?-50:50),kind+' '+id);
 }
 b=fresh();b.attacker.status.enhancement_lock={turns:2};r=await c.turn(b,'healIII');assert.equal(r.attacker.regenTurns,0);assert.equal(r.attacker.hp,3099);
 b=await c.turn(fresh(),'healIII');b.attacker.hp=10000;r=await c.turn(b,'skip');assert.equal(r.attacker.regenTurns,2);assert.equal(r.attacker.hp,9999);
 b=await c.turn(fresh(),'healIII');b.attacker.hp=40;b.attacker.status.curse={turns:2};r=await c.turn(b,'slash');assert(r.finished);assert.equal(r.attacker.hp,0);assert(!r.events471.some(e=>e.type==='cast'));
 b=await c.turn(fresh(),'healIII');assert.deepEqual(await c.turn(b,'skip'),await c.turn(JSON.parse(JSON.stringify(b)),'skip'));
 // Rejecting an unavailable action cannot mutate persisted HP/duration.
 b.attacker.cooldowns[c.templates.skills.healIII.name]=9;const saved=JSON.stringify(b);
 await assert.rejects(()=>c.turn(b,'healIII'),/MIST_SKILL_UNAVAILABLE/);assert.equal(JSON.stringify(b),saved);
 console.log(kind+': immediate heal, delayed ticks for both sides, full duration, refresh, control/heal restrictions, death, persistence/retry passed');
}
