import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMistCombat468} from '../functions/game-api/mist-combat468.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
const c=createMistCombat468(data,()=>.4);
const snap=(name)=>({name,stats:{hp:10000,patk:100,matk:100,def:0,crit:0,critDamage:100},skills:['slash','healIII'],equipmentList:[],ai:[]});
const fresh=()=>c.create(snap('A'),snap('D'),5000,10000);
const status=(b,side,id,turns=2,stacks=1)=>b[side].status[id]={turns,stacks};
// Both DOTs resolve after the player's action and before the enemy attack; stacks do not expire.
let b=fresh();for(const side of ['attacker','defender']){status(b,side,'poison',1,2);status(b,side,'burning',1,1);}
let r=await c.turn(b,'slash');
assert.equal(r.attacker.hp,4000); // 400 poison + 500 burning + 100 attack
assert.equal(r.defender.hp,8980); // 120 slash + 500 burning + 400 poison
let events=r.events471;const cast=events.findIndex(e=>e.type==='cast');const dot=events.findIndex(e=>e.type==='log'&&e.text.includes('受到【燃燒】'));const enemy=events.findIndex(e=>e.type==='visual'&&e.actor==='defender'&&e.kind==='physical');
assert.ok(cast<dot&&dot<enemy);assert.equal(r.attacker.status.poison.stacks,2);
for(let i=0;i<3;i++)r=await c.turn(r,'skip');assert.equal(r.attacker.status.poison.stacks,2);assert.equal(r.defender.status.burning.stacks,1);
// Regeneration from this cast runs after the enemy response, never before it.
b=fresh();r=await c.turn(b,'healIII');const sk=c.templates.skills.healIII;
assert.equal(r.attacker.regenTurns,sk.duration-1);
const attackIndex=r.events471.findIndex(e=>e.type==='visual'&&e.actor==='defender'&&e.kind==='physical');
const healIndex=r.events471.findIndex(e=>e.type==='log'&&e.text.includes('持續恢復：'));
assert.ok(attackIndex<healIndex);assert.ok(r.events471[healIndex].frame.attacker.regenTurns===sk.duration-1);
// Every published timed status decrements in its phase; stack/trigger effects stay until consumed/cleansed.
for(const row of data.StatusEffects){
 b=fresh();status(b,'attacker',row.StatusID,3);if(row.StatusID==='seal')b.attacker.status.seal.skill='healIII';
 r=await c.turn(b,'skip');
 if(row.DurationType==='turns')assert.equal(r.attacker.status[row.StatusID]?.turns,2,row.StatusID+' exactly one tick');
 else if(row.StatusID!=='block')assert.equal(r.attacker.status[row.StatusID]?.stacks,1,row.StatusID+' persists');
}
for(const id of ['freeze','paralysis']){
 b=fresh();status(b,'attacker',id,1);b.attacker.cooldowns.test=3;r=await c.turn(b,'slash');
 assert.equal(r.attacker.cooldowns.test,3,id+' prevents natural CD tick');assert.ok(!r.attacker.status[id]);
 assert.equal(r.events471.some(e=>e.type==='cast'),id==='paralysis');
}
b=fresh();status(b,'attacker','stun',1);b.attacker.cooldowns.test=3;r=await c.turn(b,'slash');assert.equal(r.attacker.cooldowns.test,2);assert.ok(!r.events471.some(e=>e.type==='cast'));
// Newly inflicted 1-turn status survives the current enemy response.
b=fresh();const monster={Ability:'elite_mage',Value:1,Every:3,Multiplier:1,MATK:100,PATK:0};
r=await c.turn(b,'skip',monster);assert.equal(r.attacker.status.heal_block.turns,1);
r=await c.turn(r,'healIII',monster);assert.ok(!r.attacker.status.heal_block);assert.ok(r.log.some(s=>s.includes('實際恢復 0'))||r.log.some(s=>s.includes('立即恢復 0')));
// Seal must reject without modifying the provided battle; bleed charges only a successful skill.
b=fresh();status(b,'attacker','seal',2);b.attacker.status.seal.skill='slash';const before=JSON.stringify(b);await assert.rejects(()=>c.turn(b,'slash'),/MIST_SKILL_SEALED/);assert.equal(JSON.stringify(b),before);
b=fresh();status(b,'attacker','bleed',2);r=await c.turn(b,'slash');assert.equal(r.attacker.hp,3900);r=await c.turn(b,'skip');assert.equal(r.attacker.hp,4900);
// A 1-turn shield/buff protects against the response before expiring; block has no timer.
b=fresh();status(b,'attacker','invincible',1);r=await c.turn(b,'skip');assert.equal(r.attacker.hp,5000);assert.ok(!r.attacker.status.invincible);
b=fresh();b.defender.ai=[];b.defender.stats.patk=0;status(b,'attacker','block',1);r=await c.turn(b,'skip');assert.ok(r.log.some(s=>s.includes('格擋')));
// Identical retry input produces identical authoritative state/events. Resume contains all timing data.
b=fresh();status(b,'attacker','poison',1);b.attacker.regen=100;b.attacker.regenTurns=2;
assert.deepEqual(await c.turn(b,'skip'),await c.turn(structuredClone(b),'skip'));
console.log('Mist 494: DOT order/rates/persistence, same-round regen, all published status timers, control/CD, seal/bleed, shields, retry determinism passed');
