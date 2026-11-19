const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{parse}=require('../../supabase/tests/node_modules/acorn');
parse(fs.readFileSync('tools/planning/maintenance482.gs','utf8'),{ecmaVersion:'latest'});
const rows=Object.entries({SupplyVisionRadius:2,AirdropIntervalHours:12,RoadChestRandomExcludeLegendary:1,RoadChestLegendaryPercent:20,RoadChestRandomPercent:60,RoadChestTrapPercent:20,ExcludedEquipmentIDs:'gmSword,forgeBlank172'}).map(([Key,Value])=>({Key,Value}));
let cells=[['Description','Key','Value'],['old','RoadChestLegendaryPercent',30],['keep','EnergyCap',20]];
const sh={getDataRange:()=>({getValues:()=>structuredClone(cells)}),getLastRow:()=>cells.length,getRange:(row,col,count,width)=>({setValues:values=>cells.push(...values),setValue:value=>{cells[row-1][col-1]=value}})};
const ctx={publishedPlanningPackage_:()=>({data:{MistConfig:rows}}),ss_:()=>({getSheetByName:()=>sh}),SpreadsheetApp:{flush(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('tools/planning/sync_mist_rules498.gs','utf8'),ctx);
let r=ctx.syncMistRules498();assert.equal(r.added.length,6);assert.equal(r.updated.length,1);assert.equal(cells[1][2],20);assert.deepEqual(cells[2],['keep','EnergyCap',20]);r=ctx.syncMistRules498();assert.equal(r.updated.length+r.added.length,0);
console.log('498 GS: full syntax, seven-key update/add sync, unrelated fields preserved and repeat safe passed');
