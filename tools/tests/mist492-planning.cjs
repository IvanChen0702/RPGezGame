const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{parse}=require('../../supabase/tests/node_modules/acorn');
const full=fs.readFileSync('tools/planning/maintenance482.gs','utf8'),ast=parse(full,{ecmaVersion:'latest'}),fn=ast.body.find(x=>x.type==='FunctionDeclaration'&&x.id.name==='planningMistErrors465_');
const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json')),rows=Object.entries({RoadChestCap:5,RoadChestRespawnMinutes:30,RoadChestLegendaryPercent:30,RoadChestRandomPercent:40,RoadChestTrapPercent:30,RoadChestTrapHpPercent:80}).map(([Key,Value])=>({Key,Value}));
const ctx={MIST_PLANNING465:data};vm.createContext(ctx);vm.runInContext(full.slice(fn.start,fn.end),ctx);
const before=JSON.stringify(ctx.planningMistErrors465_(data));data.MistConfig.push(...rows);assert.equal(JSON.stringify(ctx.planningMistErrors465_(data)),before);
for(const [key,value] of [['RoadChestTrapHpPercent',100],['RoadChestRandomPercent',41],['RoadChestCap',0]]){const bad=structuredClone(data);bad.MistConfig.find(r=>r.Key===key).Value=value;assert.ok(ctx.planningMistErrors465_(bad).length>ctx.planningMistErrors465_(data).length);}
let cells=[['Description','Value','Key'],['preserve designer setting',6,'RoadChestCap'],['other',20,'EnergyCap']];
const sh={getDataRange:()=>({getValues:()=>structuredClone(cells)}),getLastRow:()=>cells.length,getRange:(row,col,count,width)=>({setValues:values=>{assert.equal(row,cells.length+1);assert.equal(count,values.length);assert.equal(width,3);cells.push(...values);}})};
Object.assign(ctx,{publishedPlanningPackage_:()=>({data:{MistConfig:rows}}),ss_:()=>({getSheetByName:name=>name==='MistConfig'?sh:null}),SpreadsheetApp:{flush(){}}});
vm.runInContext(fs.readFileSync('tools/planning/sync_mist_road_chests492.gs','utf8'),ctx);
assert.equal(ctx.syncMistRoadChests492().added.length,5);assert.equal(cells[1][1],6);assert.equal(cells[2][1],20);assert.equal(ctx.syncMistRoadChests492().added.length,0);
ctx.publishedPlanningPackage_=()=>({data:{MistConfig:[]}});assert.throws(()=>ctx.syncMistRoadChests492(),/尚未包含/);assert.equal(cells.length,8);
console.log('GS492: full script syntax, complete rules/ranges/100% validation, additive header-based sync, designer values preserved, idempotency and unpublished guard passed');
