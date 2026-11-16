/** Approved competition planning. No publish, player writes, or triggers. */
const MIST_PLANNING465={
  "MistConfig": [
{"Key": "FlagScoreMinutes", "Value": 180, "Description": "每面旗幟存續計分週期（分鐘）"},{"Key": "FlagScorePoints", "Value": 1, "Description": "每面旗幟每期積分"},{"Key": "RemoveEnemyFlagPoints", "Value": 3, "Description": "拔除敵方旗幟積分"},
    {
      "Key": "Enabled",
      "Value": false
    },
    {
      "Key": "UnlockFloor",
      "Value": 1
    },
    {
      "Key": "InitialMapSize",
      "Value": 16
    },
    {
      "Key": "EnergyInitial",
      "Value": 20
    },
    {
      "Key": "EnergyCap",
      "Value": 20
    },
    {
      "Key": "EnergyRecoveryMinutes",
      "Value": 30
    },
    {
      "Key": "MoveCost",
      "Value": 1
    },
    {
      "Key": "BattleCost",
      "Value": 1
    },
    {
      "Key": "FlagCost",
      "Value": 1
    },
    {
      "Key": "RemoveEnemyFlagCost",
      "Value": 2
    },
    {
      "Key": "HideCost",
      "Value": 3
    },
    {
      "Key": "HideMinutes",
      "Value": 60
    },
    {
      "Key": "ProtectionMinutes",
      "Value": 60
    },
    {
      "Key": "MaxFlags",
      "Value": 3
    },
    {
      "Key": "ViewRadius",
      "Value": 1
    },
    {
      "Key": "BattleMaxRounds",
      "Value": 30
    },
    {
      "Key": "BattleTimeoutMinutes",
      "Value": 10
    },
    {
      "Key": "PairCooldownHours",
      "Value": 6
    },
    {
      "Key": "NormalMonsterCap",
      "Value": 10
    },
    {
      "Key": "EliteMonsterCap",
      "Value": 2
    },
    {
      "Key": "MonsterSpawnWarningMinutes",
      "Value": 30
    },
    {
      "Key": "NormalWinPoints",
      "Value": 1
    },
    {
      "Key": "EliteWinPoints",
      "Value": 2
    },
    {
      "Key": "PlayerWinPoints",
      "Value": 3
    },
    {
      "Key": "AttackerLossPoints",
      "Value": 3
    },
    {
      "Key": "MinimumPoints",
      "Value": 0
    },
    {
      "Key": "EquipmentCapacity",
      "Value": 10
    },
    {
      "Key": "GemCapacity",
      "Value": 10
    },
    {
      "Key": "ChestCapacity",
      "Value": 10
    },
    {
      "Key": "SupplyHealPercent",
      "Value": 30
    },
    {
      "Key": "MonsterLossHealPercent",
      "Value": 30
    },
    {
      "Key": "ForgeEnergyCost",
      "Value": 1
    },
    {
      "Key": "ForgeEnhanceLevel",
      "Value": 10
    },
    {
      "Key": "LootMinEnhance",
      "Value": 1
    },
    {
      "Key": "LootMaxEnhance",
      "Value": 9
    },
    {
      "Key": "LootSockets",
      "Value": 1
    },
    {
      "Key": "PlayerDropMin",
      "Value": 1
    },
    {
      "Key": "PlayerDropMax",
      "Value": 3
    },
    {
      "Key": "SettlementWeekday",
      "Value": 7
    },
    {
      "Key": "SettlementHour",
      "Value": 23
    },
    {
      "Key": "SettlementGraceMinutes",
      "Value": 10
    },
    {
      "Key": "NewSeasonWeekday",
      "Value": 1
    },
    {
      "Key": "NewSeasonHour",
      "Value": 0
    },
    {
      "Key": "TimeZone",
      "Value": "Asia/Taipei"
    },
    {
      "Key": "RewardTemplate",
      "Value": "BoxingSeasons_SCHEMA:2026-W42"
    },
    {
      "Key": "ExcludedEquipmentIDs",
      "Value": "gmSword"
    },
    {
      "Key": "CarrySkillsOnly",
      "Value": true
    }
  ],
  "MistEnemies": [
    {
      "EnemyID": "mist_normal_1",
      "Name": "苔牙史萊姆",
      "Elite": false,
      "HP": 180,
      "DEF": 8,
      "PATK": 28,
      "MATK": 0,
      "Ability": "poison_strike",
      "Every": 3,
      "Multiplier": 1,
      "Value": 1,
      "Description": "第 3 回合物攻 ×100%，附加 1 層中毒。",
      "Art": "normal-1",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_2",
      "Name": "礦坑鼠賊",
      "Elite": false,
      "HP": 140,
      "DEF": 6,
      "PATK": 34,
      "MATK": 0,
      "Ability": "opening_strike",
      "Every": 1,
      "Multiplier": 1.4,
      "Value": 0,
      "Description": "第 1 回合物攻 ×140%。",
      "Art": "normal-2",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_3",
      "Name": "裂翼蝙蝠",
      "Elite": false,
      "HP": 130,
      "DEF": 4,
      "PATK": 30,
      "MATK": 0,
      "Ability": "drain_strike",
      "Every": 3,
      "Multiplier": 1.2,
      "Value": 0.5,
      "Description": "每 3 回合物攻 ×120%，恢復實際 HP 傷害的 50%。",
      "Art": "normal-3",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_4",
      "Name": "鏽刃骷髏",
      "Elite": false,
      "HP": 190,
      "DEF": 18,
      "PATK": 32,
      "MATK": 0,
      "Ability": "opening_shield",
      "Every": 0,
      "Multiplier": 0.15,
      "Value": 0,
      "Description": "開場獲得最大 HP ×15% 護盾。",
      "Art": "normal-4",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_5",
      "Name": "毒囊蛛",
      "Elite": false,
      "HP": 150,
      "DEF": 6,
      "PATK": 26,
      "MATK": 0,
      "Ability": "poison_turns",
      "Every": 2,
      "Multiplier": 1,
      "Value": 5,
      "Description": "第 2、5 回合附加 1 層中毒。",
      "Art": "normal-5",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_6",
      "Name": "荊棘野狼",
      "Elite": false,
      "HP": 210,
      "DEF": 12,
      "PATK": 38,
      "MATK": 0,
      "Ability": "execute_bonus",
      "Every": 0,
      "Multiplier": 0.4,
      "Value": 0.25,
      "Description": "目標 HP 低於 40% 時，直接傷害增加 25%。",
      "Art": "normal-6",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_7",
      "Name": "燼火小鬼",
      "Elite": false,
      "HP": 145,
      "DEF": 5,
      "PATK": 0,
      "MATK": 32,
      "Ability": "burn_strike",
      "Every": 3,
      "Multiplier": 1,
      "Value": 1,
      "Description": "第 3 回合魔攻 ×100%，附加 1 層燃燒。",
      "Art": "normal-7",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_8",
      "Name": "孢子行者",
      "Elite": false,
      "HP": 220,
      "DEF": 10,
      "PATK": 0,
      "MATK": 28,
      "Ability": "blind_strike",
      "Every": 2,
      "Multiplier": 0.8,
      "Value": 2,
      "Description": "第 2 回合魔攻 ×80%，失明 2 回合。",
      "Art": "normal-8",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_9",
      "Name": "碎岩傀儡",
      "Elite": false,
      "HP": 280,
      "DEF": 24,
      "PATK": 42,
      "MATK": 0,
      "Ability": "telegraphed_strike",
      "Every": 3,
      "Multiplier": 1.6,
      "Value": 0,
      "Description": "每 3 回合物攻 ×160%；前一回合提示。",
      "Art": "normal-9",
      "Enabled": true
    },
    {
      "EnemyID": "mist_normal_10",
      "Name": "殘燭幽魂",
      "Elite": false,
      "HP": 160,
      "DEF": 4,
      "PATK": 0,
      "MATK": 36,
      "Ability": "first_hit_guard",
      "Every": 0,
      "Multiplier": 0.5,
      "Value": 0,
      "Description": "首次受到直接傷害降低 50%。",
      "Art": "normal-10",
      "Enabled": true
    },
    {
      "EnemyID": "mist_elite_1",
      "Name": "黑棘獵首者",
      "Elite": true,
      "HP": 700,
      "DEF": 24,
      "PATK": 72,
      "MATK": 0,
      "Ability": "elite_wolf",
      "Every": 3,
      "Multiplier": 0.7,
      "Value": 2,
      "Description": "每 3 回合物攻 ×70% 連擊兩次；目標 HP 低於 40% 時直接傷害增加 25%。",
      "Art": "elite-1",
      "Enabled": true
    },
    {
      "EnemyID": "mist_elite_2",
      "Name": "熔金守衛",
      "Elite": true,
      "HP": 950,
      "DEF": 40,
      "PATK": 62,
      "MATK": 0,
      "Ability": "elite_golem",
      "Every": 4,
      "Multiplier": 2,
      "Value": 180,
      "Description": "開場 180 護盾；每 4 回合物攻 ×200%，前一回合提示。",
      "Art": "elite-2",
      "Enabled": true
    },
    {
      "EnemyID": "mist_elite_3",
      "Name": "蛛巢女王",
      "Elite": true,
      "HP": 760,
      "DEF": 20,
      "PATK": 48,
      "MATK": 0,
      "Ability": "elite_spider",
      "Every": 3,
      "Multiplier": 1.2,
      "Value": 3,
      "Description": "每 3 回合物攻 ×120%，中毒未滿 3 層則加 1 層；第 2 回合物攻 ×80% 並失明 2 回合。",
      "Art": "elite-3",
      "Enabled": true
    },
    {
      "EnemyID": "mist_elite_4",
      "Name": "殞星咒術師",
      "Elite": true,
      "HP": 620,
      "DEF": 12,
      "PATK": 0,
      "MATK": 72,
      "Ability": "elite_mage",
      "Every": 4,
      "Multiplier": 1.8,
      "Value": 3,
      "Description": "每 4 回合魔攻 ×180%，前一回合提示；第 3 回合魔攻 ×80%，治療封鎖 1 回合。",
      "Art": "elite-4",
      "Enabled": true
    },
    {
      "EnemyID": "mist_elite_5",
      "Name": "斷旗處刑者",
      "Elite": true,
      "HP": 850,
      "DEF": 30,
      "PATK": 78,
      "MATK": 0,
      "Ability": "elite_executioner",
      "Every": 3,
      "Multiplier": 1.7,
      "Value": 0.3,
      "Description": "每 3 回合物攻 ×170%，前一回合提示；首次 HP 不高於 30%，物攻 +20%、防禦 −30%。",
      "Art": "elite-5",
      "Enabled": true
    }
  ],
  "MistLootRules": [
    {
      "Pool": "rarity",
      "Value": "一般",
      "Weight": 35,
      "Enabled": true
    },
    {
      "Pool": "rarity",
      "Value": "特殊",
      "Weight": 25,
      "Enabled": true
    },
    {
      "Pool": "rarity",
      "Value": "稀有",
      "Weight": 20,
      "Enabled": true
    },
    {
      "Pool": "rarity",
      "Value": "史詩",
      "Weight": 15,
      "Enabled": true
    },
    {
      "Pool": "rarity",
      "Value": "傳說",
      "Weight": 5,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 1,
      "Weight": 20,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 2,
      "Weight": 18,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 3,
      "Weight": 16,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 4,
      "Weight": 14,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 5,
      "Weight": 12,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 6,
      "Weight": 8,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 7,
      "Weight": 6,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 8,
      "Weight": 4,
      "Enabled": true
    },
    {
      "Pool": "enhancement",
      "Value": 9,
      "Weight": 2,
      "Enabled": true
    }
  ]
};

const COMPETITION_DIALOGUES465={
 kazama_secret_4_offer_0:'競技場，完成三場對戰。之前練過的次數，我都替你記著。',
 kazama_secret_4_offer_1:'一定得贏嗎？',
 kazama_secret_4_offer_2:'這次不看勝負，完成結算就算。我要你把整段攻勢做完。',
 kazama_secret_4_offer_3:'對手還沒動，你先開始擺姿勢了？先把三場打完，帥氣留到領獎再說。'
};
function applyCompetition465PlanningToSheets(){
 const ss=typeof ss_==='function'?ss_():SpreadsheetApp.getActiveSpreadsheet(),edits=[];
 // Resolve every existing target before changing any cell.
 function plan(sheet,key,id,fields){
  const sh=ss.getSheetByName(sheet);if(!sh)throw Error('缺少 '+sheet);
  const rows=sh.getDataRange().getValues(),h=rows[0].map(String),ki=h.indexOf(key);
  if(ki<0)throw Error(sheet+' 缺少 '+key);
  const matches=rows.map((r,i)=>i>0&&String(r[ki])===id?i:-1).filter(i=>i>0);
  if(matches.length!==1)throw Error(sheet+' ID 必須恰有一筆：'+id);
  for(const [column,value] of Object.entries(fields)){const ci=h.indexOf(column);if(ci<0)throw Error(sheet+' 缺少 '+column);edits.push({sh,row:matches[0]+1,col:ci+1,value});}
 }
 plan('QuestObjectives','ObjectiveID','kazama_secret_4_1',{TargetID:'arena',Quantity:3,Label:'完成競技場對戰結算'});
 for(const [id,Text] of Object.entries(COMPETITION_DIALOGUES465))plan('QuestDialogues','DialogueID',id,{Text});
 for(const e of edits)e.sh.getRange(e.row,e.col).setValue(e.value);
 for(const [name,rows] of Object.entries(MIST_PLANNING465)){
  let sh=ss.getSheetByName(name);
  if(sh&&sh.getLastRow()>1)continue; // preserve a designer's subsequent edits
  if(!sh)sh=ss.insertSheet(name);
  const cols=Object.keys(rows[0]);sh.getRange(1,1,rows.length+1,cols.length).setValues([cols,...rows.map(r=>cols.map(k=>r[k]??''))]);
  sh.setFrozenRows(1);sh.autoResizeColumns(1,cols.length);
 }
 SpreadsheetApp.flush();
 return {ok:true,updatedQuestCells:edits.length,newTables:Object.keys(MIST_PLANNING465),published:false,note:'不會開啟賽季。請先驗證企劃，再使用原本的發布功能。'};
}
function planningMistErrors465_(data){
 const errors=[],keys=['MistConfig','MistEnemies','MistLootRules'];
 if(!keys.some(k=>Array.isArray(data[k])&&data[k].length))return errors;
 for(const k of keys)if(!Array.isArray(data[k])||!data[k].length)errors.push('缺少迷霧戰境企劃表：'+k);
 if(errors.length)return errors;
 const cfg=Object.fromEntries(data.MistConfig.map(r=>[String(r.Key),r.Value]));
 if(new Set(data.MistConfig.map(r=>String(r.Key))).size!==data.MistConfig.length)errors.push('MistConfig Key 重複');
 if(!String(cfg.ExcludedEquipmentIDs||'').toLowerCase().split(',').map(x=>x.trim()).includes('gmsword'))errors.push('迷霧戰境必須排除 gmSword');
 for(const k of ['UnlockFloor','InitialMapSize','EnergyInitial','EnergyCap','EnergyRecoveryMinutes','BattleMaxRounds','BattleTimeoutMinutes','MaxFlags'])
  if(!Number.isSafeInteger(Number(cfg[k]))||Number(cfg[k])<1)errors.push('MistConfig '+k+' 必須為正整數');
 if(Number(cfg.UnlockFloor)!==1||Number(cfg.InitialMapSize)!==16)errors.push('迷霧戰境開放層數應為 1、初始地圖應為 16');
 const ids=new Set(),abilities=new Set(MIST_PLANNING465.MistEnemies.map(x=>x.Ability));
 for(const r of data.MistEnemies){
  if(!r.EnemyID||ids.has(String(r.EnemyID)))errors.push('MistEnemies EnemyID 為空或重複');ids.add(String(r.EnemyID));
  if(!abilities.has(r.Ability))errors.push('MistEnemies 未支援能力：'+r.Ability);
  for(const k of ['HP','DEF','PATK','MATK'])if(!Number.isFinite(Number(r[k]))||Number(r[k])<(k==='HP'?1:0))errors.push(r.EnemyID+' 的 '+k+' 無效');
 }
 const enabled=r=>r.Enabled!==false&&String(r.Enabled).toLowerCase()!=='false';
 for(const pool of ['rarity','enhancement']){
  const rows=data.MistLootRules.filter(r=>r.Pool===pool&&enabled(r)),values=rows.map(r=>String(r.Value));
  if(new Set(values).size!==values.length||rows.some(r=>!Number.isFinite(Number(r.Weight))||Number(r.Weight)<=0)||rows.reduce((n,r)=>n+Number(r.Weight),0)!==100)errors.push('MistLootRules '+pool+' 權重須為正數、無重複、總和 100');
 }
 const rarityValues=new Set(data.MistLootRules.filter(r=>r.Pool==='rarity'&&enabled(r)).map(r=>String(r.Value)));
 for(const r of data.Equipment||[])if(enabled(r)&&String(r.ItemID).toLowerCase()!=='gmsword'&&!rarityValues.has(String(r.Rarity)))errors.push('抽取權重缺少稀有度：'+r.Rarity);
 return [...new Set(errors)];
}
