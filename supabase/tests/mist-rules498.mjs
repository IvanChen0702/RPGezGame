import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reduceMist468,projectMist468} from '../functions/game-api/mist-runtime468.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
const rules={Enabled:true,SupplyVisionRadius:2,AirdropIntervalHours:12,RoadChestRandomExcludeLegendary:1,RoadChestCap:5,RoadChestRespawnMinutes:30,RoadChestLegendaryPercent:20,RoadChestRandomPercent:60,RoadChestTrapPercent:20,RoadChestTrapHpPercent:80,StaminaPackCap:10,StaminaPackWarningMinutes:30,StaminaPackEnergy:10,AirdropVisionRadius:2,ExcludedEquipmentIDs:'gmSword,forgeBlank172'};
for(const [Key,Value] of Object.entries(rules)){const r=data.MistConfig.find(r=>r.Key===Key);if(r)r.Value=Value;else data.MistConfig.push({Key,Value});}
let input={world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},now:'2026-11-16T01:00:00Z',planning:{data,dataVersion:'fixture498'},save:{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]},rewards:[],nickname:'test'};
async function call(action,payload={},random=()=>.4){const out=await reduceMist468(input,'a',action,{expectedRevision:input.world.players.a?.revision,...payload},random);if(out.world)input.world=out.world;return out.result;}
let d=await call('join');input.world.players.a.runtime.starter.opened=true;
let supply=input.world.cells.find(c=>c.kind==='supply');assert.equal(d.visions487.find(v=>v.kind==='supply').radius,2);assert.equal(d.cells.filter(c=>Math.abs(c.x-supply.x)<=2&&Math.abs(c.y-supply.y)<=2).length,25);
assert.equal(projectMist468(input.world,'outsider',Date.parse(input.now),true,{},[]).cells.length,0);
function place(target){const me=input.world.cells.find(c=>c.kind==='player');input.world.cells=input.world.cells.filter(c=>c===me||c===target||c.x!==target.x-1||c.y!==target.y);Object.assign(me,{x:target.x-1,y:target.y});}
const base=structuredClone(input),chest=base.world.cells.find(c=>c.kind==='road_chest');
for(const [roll,outcome] of [[0,'legendary'],[.199999,'legendary'],[.2,'random'],[.799999,'random'],[.8,'trap'],[.99999,'trap']]){
 input=structuredClone(base);place(chest);input.world.players.a.hp=500;input.world.players.a.max_hp=1000;
 d=await call('road-chest/open',{targetId:chest.id},()=>roll);
 if(outcome==='trap'){assert.equal(d.self.hp,100);assert.equal(d.roadChestReceipt492.damage,400);}else{const item=d.chestReveals471.at(-1).items[0];assert.equal(item.rarity==='傳說',outcome==='legendary');assert.ok(!['gmsword','forgeblank172'].includes(item.template.toLowerCase()));}
}
// Every equipment rarity/slot roll respects exclusion, including opening starter crates.
for(let i=0;i<40;i++){input=structuredClone(base);const p=input.world.players.a;p.runtime.starter.opened=false;const target=p.runtime.starter.position;place(target);d=await call('chest/open',{chestId:p.runtime.starter.id},()=>i/40);assert.ok(d.chestReveals471.at(-1).items.every(x=>!['gmsword','forgeblank172'].includes(x.template.toLowerCase())));}
input=structuredClone(base);input.world.players.a.inventory.equipment.push({id:'excluded',template:'forgeBlank172',slot:'weapon',kind:'equipment'});await assert.rejects(()=>call('equip',{itemId:'excluded'}),/EQUIPMENT_EXCLUDED/);
for(const [claimed,next] of [['2026-11-16T03:59:59.999Z','2026-11-16T04:00:00.000Z'],['2026-11-16T04:00:00.000Z','2026-11-16T16:00:00.000Z'],['2026-11-16T15:59:59.999Z','2026-11-16T16:00:00.000Z'],['2026-11-16T16:00:00.000Z','2026-11-17T04:00:00.000Z']]){
 input=structuredClone(base);input.now=claimed;let drop=input.world.cells.find(c=>c.kind==='airdrop');place(drop);d=await call('resource/claim',{targetId:drop.id});assert.equal(d.airdropNextAt487,next);assert.equal(d.visions487.some(v=>v.kind==='airdrop'),false);assert.equal(d.visions487.some(v=>v.kind==='supply'),true);
 input.now=new Date(Date.parse(next)-1).toISOString();await call('status');assert.equal(input.world.cells.some(c=>c.kind==='airdrop'),false);
 input.now=next;await call('status');drop=input.world.cells.find(c=>c.kind==='airdrop');assert.ok(drop);
 input.now=new Date(Date.parse(next)+12*3600000).toISOString();await call('status');assert.deepEqual(input.world.cells.find(c=>c.kind==='airdrop'),drop);assert.equal(input.world.cells.filter(c=>c.kind==='airdrop').length,1);
}
console.log('498: shared supply sight/privacy, exact 20/60/20 boundaries, exclusions, 12:00/00:00 boundary, no duplicate drops and retention passed');
