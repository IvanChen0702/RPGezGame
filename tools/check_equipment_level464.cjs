const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),ratings=JSON.parse(fs.readFileSync('tools/planning/equipment_levels464.json','utf8'));
const extract=n=>{const a=html.indexOf('function '+n+'('),b=html.indexOf('\n}',a);assert(a>=0&&b>a);return html.slice(a,b+2)};
const ctx={itemTemplates:{},onlineStages:{9:{enemyId:'a'},22:{enemyId:'b'}},enemyTemplates:{a:{drops:['early']},b:{drops:['late']}},shopEntriesOnline:[{type:'equipment',template:'shop',unlockFloor:15}],ORDER_TABLES127_:{Equipment:[]},PHANTOM_TABLES122_:{Equipment:[]}};
vm.createContext(ctx);vm.runInContext(['equipmentPlanningLevel464_','equipmentLevel_','applyEquipmentRows_'].map(extract).join('\n'),ctx);
assert.equal(Object.keys(ratings).length,206);assert(Object.values(ratings).every(n=>Number.isInteger(n)&&n>=1&&n<=100));
for(const raw of [1,100,'95',' 85 '])assert.equal(ctx.equipmentPlanningLevel464_({'等級':raw}),Number(raw));
for(const raw of ['',null,true,false,0,101,-1,1.5,'x'])assert.equal(ctx.equipmentPlanningLevel464_({'等級':raw}),null);
assert.equal(ctx.equipmentPlanningLevel464_({Level:'90'}),90);assert.equal(ctx.equipmentPlanningLevel464_({'等級':85,Level:90}),85);
ctx.applyEquipmentRows_(Object.entries(ratings).map(([ItemID,n])=>({ItemID,'等級':n,PATK:12,EffectKey:'immune_stun'})));
for(const [id,n]of Object.entries(ratings)){assert.equal(ctx.equipmentLevel_(id),n);assert.equal(ctx.itemTemplates[id].stats.patk,12);assert.equal(ctx.itemTemplates[id].effect,'immune_stun');}
assert.equal(ctx.equipmentLevel_({template:'erebetisWeapon',enhance:10,gems:[{}]}),94);
assert.equal(ctx.equipmentLevel_({template:'forgeBlank172',forge172:{done:true}}),null);assert.equal(ctx.equipmentLevel_('forge172_custom'),null);assert.equal(ctx.equipmentLevel_('forgeBlank172'),1);
assert.equal(ctx.equipmentLevel_('early'),1);assert.equal(ctx.equipmentLevel_('late'),22);assert.equal(ctx.equipmentLevel_('shop'),15);
ctx.applyEquipmentRows_([{ItemID:'late','等級':77}]);assert.equal(ctx.equipmentLevel_('late'),77);ctx.applyEquipmentRows_([{ItemID:'late'}]);assert.equal(ctx.equipmentLevel_('late'),22,'refresh removes stale rating');

const gs=fs.readFileSync('tools/planning/equipment_levels464.gs','utf8');
function runSheet(values){
 let writes=0,maxCols=values[0].length;
 const sheet={getDataRange:()=>({getValues:()=>values}),getMaxColumns:()=>maxCols,insertColumnsAfter:(_n,count)=>{writes++;maxCols+=count},getRange:(row,col,count=1,width=1)=>({getValues:()=>Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>values[row+i-1]?.[col+j-1]??'')),getFormulas:()=>Array.from({length:count},()=>['']),setValue:v=>{writes++;values[row-1][col-1]=v},setValues:rs=>{writes++;rs.forEach((r,i)=>r.forEach((v,j)=>{values[row+i-1][col+j-1]=v}))},getA1Notation:()=> 'D2',setDataValidation:()=>{},setNote:()=>{}})};
 const rule={requireFormulaSatisfied:()=>rule,setAllowInvalid:()=>rule,setHelpText:()=>rule,build:()=>rule};const context={console:{log:()=>{}},ss_:()=>({getSheetByName:n=>n==='Equipment'?sheet:null}),SpreadsheetApp:{newDataValidation:()=>rule,flush:()=>{}}};vm.createContext(context);vm.runInContext(gs,context);
 return {apply:context.applyEquipmentLevels464,get writes(){return writes},values};
}
const input=[['ItemID','Name','PATK'],...Object.keys(ratings).reverse().map(id=>[id,id,12])],sheet=runSheet(input);
assert.equal(sheet.apply().matched,206);assert.equal(input[0][3],'等級');for(const row of input.slice(1)){assert.equal(row[3],ratings[row[0]]);assert.equal(row[2],12);}assert.equal(sheet.apply().matched,206,'idempotent');
const bad=structuredClone(input);bad[1][3]=ratings[bad[1][0]]===1?2:1;const rejected=runSheet(bad);assert.throws(rejected.apply,/已有不同等級/);assert.equal(rejected.writes,0);
const missing=runSheet(input.slice(0,-1));assert.throws(missing.apply,/缺少/);assert.equal(missing.writes,0);
console.log('PASS 206 ratings, Chinese/English fields, invalid values, refresh fallback, forge exception, unchanged stats/effects, ID-based sheet backfill, idempotence and conflict-before-write');
