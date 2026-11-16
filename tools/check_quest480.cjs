const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8'),data={QuestObjectives:[],QuestRewards:[]};
const c={itemTemplates:{book:{name:'秘典'}},gemTemplates:{},enemyTemplates:{boss:{name:'海皇'}},questNpcNames368:{lily:'莉莉'},questDataUi368:()=>data,escapeHtml:s=>s,questRewardArt368:()=>'',questRewardName368:r=>r.ContentID};vm.createContext(c);
for(const [a,b]of [['function questGoalLabel368(','\nfunction questRewardName368'],['function questDescription373(','\nfunction questCondition373'],['function questRewardsHtml373(','\n// The canvas']])vm.runInContext(html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a))),c);
const q={QuestID:'lily_partner',NPCID:'lily',objectives:[{Type:'main_clear',TargetID:5,Quantity:1}]};
assert.match(c.questDescription373(q),/通關第 5 層（已通關也算）/);assert.ok(!c.questDescription373(q).includes('20'));
q.objectives[0].TargetID=9;assert.match(c.questDescription373(q),/通關第 9 層/);
q.objectives=[{Type:'enhance',Slot:'weapon',Quantity:3}];assert.match(c.questDescription373(q),/接取後嘗試強化武器（成功或失敗皆可） ×3/);
q.objectives[0]={Type:'enhance_success',Slot:'weapon',Quantity:7};assert.match(c.questDescription373(q),/接取後成功強化武器 ×7/);
q.objectives=[{Type:'deliver_equipment',TargetID:'book',Quantity:2,MinEnhance:3}];assert.match(c.questDescription373(q),/交付 秘典（強化至少＋3） ×2/);assert.match(c.questDescription373(q),/確認後才會扣除/);
q.objectives=[{Type:'kill',TargetID:'boss',Quantity:4}];assert.match(c.questDescription373(q),/接取後討伐 海皇 ×4/);
q.Description='  表格自訂說明  ';assert.equal(c.questDescription373(q),'表格自訂說明');q.Description=' ';q.description='小寫欄位說明';assert.equal(c.questDescription373(q),'小寫欄位說明');delete q.description;q.Summary='摘要';assert.equal(c.questDescription373(q),'摘要');delete q.Summary;
data.QuestObjectives=[{QuestID:'lily_partner',Type:'main_clear',TargetID:5,Quantity:1}];delete q.objectives;assert.match(c.questDescription373(q),/通關第 5 層/);
for(const n of [3,4]){data.QuestRewards=Array.from({length:n},(_,i)=>({QuestID:q.QuestID,Timing:'complete',ChoiceGroup:'pet',ContentID:'egg'+i,Quantity:i+1}));const result=c.questRewardsHtml373(q);assert.equal((result.match(new RegExp(n+' 選 1','g'))||[]).length,n);assert.ok(result.includes('×'+n));}
assert.ok(!html.includes('通過主線第20層後，回城鎮找莉莉'));
console.log('Quest480: live-goal floor/count/type/delivery, configured descriptions, fallback rows and reward group counts passed');
