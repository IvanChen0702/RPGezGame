import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reduceMist468} from '../functions/game-api/mist-runtime468.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
data.MistConfig.find(r=>r.Key==='Enabled').Value=true;
let input={world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},now:'2026-11-16T01:00:00Z',planning:{data,dataVersion:'fixture'},save:{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]},rewards:[],nickname:'test'};
async function call(action,payload={}){const out=await reduceMist468(input,'a',action,{expectedRevision:input.world.players.a?.revision,...payload},()=>.4);if(out.world)input.world=out.world;return out.result;}
let d=await call('join');const energy=d.self.energy,starter=d.starter.id;
d=await call('chest/open',{chestId:starter});assert.equal(d.chestReveals471[0].items.length,4);assert.equal(d.inventory.equipment.length,4);
assert.deepEqual(new Set(d.chestReveals471[0].items.map(x=>x.slot)),new Set(['head','armor','weapon','special']));
assert.ok(d.chestReveals471[0].items.every(x=>x.starter&&x.sockets===1&&!/gmsword/i.test(x.template)));
const receipt=structuredClone(d.chestReveals471[0]);
assert.deepEqual((await call('status')).chestReveals471[0],receipt,'refresh preserves exact awarded items');
await assert.rejects(()=>call('chest/open',{chestId:starter}),/ITEM_MISSING/);
d=await call('chest/confirm',{chestId:starter,choice:'equip'});
assert.equal(Object.keys(d.equipment).length,4);assert.equal(d.inventory.equipment.length,0);assert.equal(d.chestReveals471.length,0);assert.equal(d.self.energy,energy);
assert.deepEqual(new Set(Object.values(d.equipment).map(x=>x.id)),new Set(receipt.items.map(x=>x.id)));
await assert.rejects(()=>call('chest/confirm',{chestId:starter,choice:'equip'}),/ITEM_MISSING/);
// Full bag plus pending chest: open without requiring a free chest slot, then atomically equip.
let p=input.world.players.a;const old=p.equipment.head;
p.inventory.equipment=Array.from({length:10},(_,i)=>({...old,id:'existing-'+i}));
p.inventory.chests=Array.from({length:10},(_,i)=>({id:'unopened-'+i,kind:'chest',name:'box',legendary:false}));
p.pending_loot=[{id:'pending-box',kind:'chest',name:'掉落寶箱',contents:[{...old,id:'new-head',starter:false},{...p.equipment.weapon,id:'new-weapon',starter:false}]}];
p.hp=Math.floor(p.max_hp/2);const ratio=p.hp/p.max_hp;
d=await call('chest/open',{chestId:'pending-box'});assert.equal(d.pendingLoot.length,2);assert.equal(d.inventory.chests.length,10);
d=await call('chest/confirm',{chestId:'pending-box',choice:'equip'});
assert.equal(d.equipment.head.id,'new-head');assert.equal(d.equipment.weapon.id,'new-weapon');assert.equal(d.pendingLoot.length,2);assert.equal(d.inventory.equipment.length,10);
assert.ok(d.pendingLoot.some(x=>x.id===old.id),'displaced gear preserved even with full bag');assert.ok(d.self.hp/d.self.maxHp<=ratio+.01,'no free heal');
// Legacy and elite boxes are opened through the same endpoint; kept items remain mode-owned.
p=input.world.players.a;p.inventory.chests=[{id:'elite',kind:'chest',name:'傳說寶箱',legendary:true}];
d=await call('chest/open',{chestId:'elite'});assert.equal(d.chestReveals471[0].items[0].rarity,'傳說');assert.equal(d.chestReveals471[0].legendary,true,'legendary presentation survives reload');assert.equal((await call('status')).chestReveals471[0].legendary,true);
const gained=d.chestReveals471[0].items[0].id;
d=await call('chest/confirm',{chestId:'elite',choice:'keep'});assert.ok(d.pendingLoot.some(x=>x.id===gained));
assert.deepEqual(input.save,{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]});
console.log('Persistent chest results, no reroll, auto-equip, full-bag preservation, pending/elite/legacy boxes and mode isolation passed');
