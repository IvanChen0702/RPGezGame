import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reduceMist468} from '../functions/game-api/mist-runtime468.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
for(const r of data.MistConfig){if(['EquipmentCapacity','GemCapacity','ChestCapacity'].includes(r.Key))r.Value=20;if(r.Key==='Enabled')r.Value=true;}
let input={world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},now:'2026-11-16T01:00:00Z',planning:{data,dataVersion:'fixture499'},save:{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]},rewards:[],nickname:'test'};
async function call(action,payload={}){const out=await reduceMist468(input,'a',action,{expectedRevision:input.world.players.a?.revision,...payload},()=>.4);if(out.world)input.world=out.world;return out.result;}
let d=await call('join');assert.deepEqual(d.inventoryCapacity499,{equipment:20,gems:20,chests:20});input.world.players.a.runtime.starter.opened=true;const base=structuredClone(input);
for(const [group,kind] of [['equipment','equipment'],['gems','gem'],['chests','chest']]){
 input=structuredClone(base);let p=input.world.players.a;
 p.inventory[group]=Array.from({length:19},(_,i)=>({id:'old'+i,kind}));p.pending_loot=[{id:'20th',kind},{id:'21st',kind}];
 d=await call('loot/take',{itemId:'20th'});assert.equal(d.inventory[group].length,20);assert.equal(d.pendingLoot.length,1);
 await assert.rejects(()=>call('loot/take',{itemId:'21st'}),/BAG_FULL/);assert.equal(input.world.players.a.pending_loot[0].id,'21st');
 await call('discard',{kind:group,itemId:'old0'});d=await call('loot/take',{itemId:'21st'});assert.equal(d.inventory[group].length,20);assert.equal(d.pendingLoot.length,0);
}
// Chest generation respects the same capacity and preserves overflow.
input=structuredClone(base);let p=input.world.players.a;p.inventory.equipment=Array.from({length:19},(_,i)=>({id:'old'+i,kind:'equipment'}));p.inventory.chests=[{id:'box1',kind:'chest'},{id:'box2',kind:'chest'}];
d=await call('chest/open',{chestId:'box1'});assert.equal(d.inventory.equipment.length,20);assert.equal(d.pendingLoot.length,0);d=await call('chest/open',{chestId:'box2'});assert.equal(d.inventory.equipment.length,20);assert.equal(d.pendingLoot.length,1);
console.log('499: all three capacities 20, 20th accepted, 21st retained, discard/reclaim and chest overflow passed');
