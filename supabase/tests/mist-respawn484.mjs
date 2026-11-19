import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reduceMist468} from '../functions/game-api/mist-runtime468.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
for(const [key,value] of Object.entries({Enabled:true,EnergyInitial:20,EnergyCap:20,EnergyRecoveryMinutes:30}))data.MistConfig.find(r=>r.Key===key).Value=value;
for(const result of ['win','loss','mutual']){
 let input={world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},now:'2026-11-16T01:00:00Z',planning:{data,dataVersion:'fixture484'},save:{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]},rewards:[],nickname:'test'};
 async function act(id,action,payload={}){const r=await reduceMist468(input,id,action,{expectedRevision:input.world.players[id]?.revision,...payload},()=>.4);if(r.world)input.world=r.world;return r.result;}
 await act('a','join');await act('b','join');
 input.world.cells=input.world.cells.filter(c=>c.kind==='player');
 for(const [id,x]of [['a',4],['b',5]]){const p=input.world.players[id];p.protected_until=null;p.energy=2;Object.assign(input.world.cells.find(c=>c.owner_account===id),{x,y:4});}
 const receipts={chestReveals471:[{id:'old-chest',items:[]}],supplyReceipt481:{id:'old-gem',item:{id:'old-gem'}},resourceReceipt487:{id:'old-energy'},roadChestReceipt492:{id:'old-trap'}};
 for(const p of Object.values(input.world.players)){Object.assign(p.runtime,structuredClone(receipts));p.supplied_on='2026-11-16';}
 const targetId=input.world.cells.find(c=>c.owner_account==='b').id;
 let r=await act('a','battle/start',{targetId}),b=input.world.meta.battles[r.battle.id];
 b.combat.attacker.hp=result==='win'?100:0;b.combat.defender.hp=result==='loss'?100:0;
 r=await act('a','battle/turn',{skill:'skip'});assert.equal(r.battle.result,result);
 for(const id of result==='mutual'?['a','b']:result==='win'?['b']:['a']){
  const dead=input.world.players[id];assert.deepEqual(dead.runtime.chestReveals471,[]);
  for(const key of ['supplyReceipt481','resourceReceipt487','roadChestReceipt492'])assert.equal(dead.runtime[key],undefined);
  // Existing dead players from earlier deployments may still carry old receipts.
  Object.assign(dead.runtime,structuredClone(receipts));
  assert.ok(input.world.players[id].energy<20);r=await act(id,'respawn');assert.equal(r.self.energy,20);assert.equal(r.self.hp,r.self.maxHp);assert.equal(r.self.energyNextAt,null);
  assert.deepEqual(r.chestReveals471,[]);for(const key of ['supplyReceipt481','resourceReceipt487','roadChestReceipt492'])assert.equal(r[key],null);
  assert.equal(input.world.players[id].supplied_on,'2026-11-16');assert.ok(r.starter);
  r=await act(id,'chest/open',{chestId:r.starter.id});assert.equal(r.chestReveals471.length,1);assert.equal(r.chestReveals471[0].items.length,4);
  await act(id,'chest/confirm',{chestId:r.chestReveals471[0].id,choice:'keep'});
  assert.equal(input.world.players[id].energy_at,'2026-11-16T01:00:00.000Z');
  await act(id,'flag');assert.equal(input.world.players[id].energy,19);
  await assert.rejects(()=>act(id,'respawn'),/NOT_DEAD/);assert.equal(input.world.players[id].energy,19);
 }
}
console.log('Respawn484: PvP attack/defense/mutual death restores 20 once; repeat cannot refill; recovery clock reset');
