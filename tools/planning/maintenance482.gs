/**
 * RPGezGame — Apps Script 完整整理版 maintenance465（含核准的裝備 Lv 464）
 * 來源：使用者提供的「貼上的文字.txt」；整理日期 2026-11-15。
 *
 * 用途：企劃驗證／發布／回讀核對、定期快照、既有過期資料清理、舊 API 相容。
 * 保留 doGet / doPost：外部呼叫尚未確認，依使用者要求保留必要依賴。
 * 移除：歷史建表／種子填表、Supabase 遷移、Shadow 測試／測試資料及一次性修復。
 * 本次唯一企劃回填：applyEquipmentLevels464（206 件；只填 Equipment.等級）。
 *
 * 使用方式：以此完整檔取代原主程式，不要與原完整 .gs 或獨立 Lv helper 重複載入。
 * 沿用原 Apps Script 專案、試算表、Script Properties 與現有觸發器；不重新初始化。
 * 先執行 checkMaintenanceStatus465（只讀）→ applyEquipmentLevels464 → 驗證 → 發布 → 回讀核對。
 * 備份／清理沿用原 handler 名稱；不需重裝觸發器，不會在載入本檔時自動執行。
 * 部署版本型 Web App 若要使用本版，須在原部署更新版本、維持原網址與存取設定。
 * 金鑰維持 Script Properties；本檔沒有內嵌憑證或玩家資料。
 */

// ============================================================
// 01｜企劃資料驗證、發布與回讀
// ============================================================

const DB = {
  ACCOUNTS: 'Accounts_SCHEMA',
  SAVES: 'PlayerSaves_SCHEMA',
  LEADERBOARD: 'Leaderboard_SCHEMA',
  AUCTION: 'Auction_SCHEMA',
  WORLD_BOSS_CONFIG: 'WorldBoss_SCHEMA',
  WORLD_BOSS_STATE: 'WorldBossState_SCHEMA',
  WORLD_BOSS_ATTEMPTS: 'WorldBossAttempts_SCHEMA',
  WORLD_BOSS_REWARDS: 'WorldBossRewards_SCHEMA',
  REDEEM_CODES: 'RedeemCodes_SCHEMA',
  REDEEM_REWARDS: 'RedeemCodeRewards_SCHEMA',
  REDEEM_CLAIMS: 'RedeemCodeClaims_SCHEMA',
  PUBLIC_SHEETS: ["RelicConfig","RelicEnemies","RelicCurses","RelicPools","GameConfig","Equipment","Skills","Consumables","Gems","Enemies","ShopEntries","Enhancement","StatusEffects","EnemyBehaviors","BossPhases","Titles","Achievements","DungeonBosses","DungeonDifficulties","WorldBoss_SCHEMA","WorldBossPool","ArenaConfig","ArenaRewards","ExtremeConfig","ExtremeStageRewards","ExtremeRankRewards","ArenaNPC","GiftBoxes","GiftBoxTiers","GiftBoxRewards","PetConfig","PetTrainingCosts","PetQualities","PetSpecies","PetTraits","QuestNPCs","Quests","QuestObjectives","QuestRewards","QuestDialogues","EnemyModules",'MistRankRewards']
};

const TOKEN_TTL_SEC = 60 * 60 * 24 * 30;

const PASSWORD_ITERATIONS = 12000;

const AUCTION_FEE_RATE = 0.10;

const PLANNING_CURRENT_TABLE_='GameDataCurrent';

const PLANNING_VERSIONS_TABLE_='GameDataVersions';

const PLANNING_CURRENT_ID_='production';

const PLANNING_CACHE_KEY_='planning:published:current:v1';

const PLANNING_READ_BUDGET_MS_103_=240000;

const PLANNING_READ_CHUNK_CELLS_103_=20000;

function planningRun103_(label){
  const ctx={label:label,startedAt:Date.now(),stage:'開始',ss:null,sheets:null,warnings:[]};
  planningLog103_(ctx,'開始（GAS maintenance465）');
  return ctx;
}

function planningLog103_(ctx,message){
  if(ctx)ctx.stage=String(message);
  const prefix=ctx?'['+ctx.label+' +'+((Date.now()-ctx.startedAt)/1000).toFixed(1)+'s] ':'[企劃] ';
  console.log(prefix+String(message));
}

function planningReadBudget103_(ctx){
  if(ctx&&Date.now()-ctx.startedAt>PLANNING_READ_BUDGET_MS_103_){
    throw new Error('企劃讀取／驗證超過 '+(PLANNING_READ_BUDGET_MS_103_/1000)+' 秒，已停止本次作業。最後階段：'+ctx.stage+'。請提供執行紀錄最後幾行，以確認卡住的工作表。');
  }
}

function planningSpreadsheet103_(ctx){
  if(ctx.ss)return ctx.ss;
  planningLog103_(ctx,'取得企劃試算表與工作表清單');
  ctx.ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ctx.ss)throw new Error('找不到企劃試算表。請從該試算表的「擴充功能 → Apps Script」開啟並執行。');
  ctx.sheets=Object.create(null);
  ctx.ss.getSheets().forEach(sh=>ctx.sheets[sh.getName()]=sh);
  planningReadBudget103_(ctx);
  return ctx.ss;
}

function planningToast103_(ctx,title){
  // toast 不等待使用者按確認；提示失敗也不影響已完成的驗證／發布。
  try{if(ctx&&ctx.ss)ctx.ss.toast('詳情請看 Apps Script「執行紀錄」。',String(title),8);}catch(_e){}
}

function planningFailure103_(ctx,error){
  const stage=ctx.stage;
  console.error('['+ctx.label+' 失敗｜'+((Date.now()-ctx.startedAt)/1000).toFixed(1)+'s] 階段：'+stage+'\n'+String(error&&error.message||error));
  planningToast103_(ctx,ctx.label+'失敗');
}

function planningReadSheet103_(sheetName,ctx){
  ctx=ctx||planningRun103_('企劃讀表');
  planningSpreadsheet103_(ctx);
  planningReadBudget103_(ctx);
  const startedAt=Date.now();
  planningLog103_(ctx,'讀取 '+sheetName+'：開始');
  const sh=ctx.sheets[sheetName];
  const required={
    ArenaRewards:['RankMin','RankMax'],
    GiftBoxes:['BoxID','Name'],
    GiftBoxTiers:['BoxID','TierID','Name','Probability'],
    GiftBoxRewards:['BoxID','RewardID','TierID','ContentType','ContentIDs','Quantity','Weight']
  };
  if(!sh){
    if(required[sheetName])throw new Error('缺少企劃工作表：'+sheetName+'。請確認工作表名稱完全相同，並保留必要表頭。');
    const warning='找不到工作表 '+sheetName+'，依既有規則視為空表；請確認是否符合預期。';
    ctx.warnings.push(warning);planningLog103_(ctx,warning);return [];
  }
  const lastRow=sh.getLastRow(),lastCol=sh.getLastColumn();
  planningReadBudget103_(ctx);
  if(lastRow===0||lastCol===0){
    if(required[sheetName])throw new Error(sheetName+' 為空白，請匯入必要表頭與企劃資料。');
    planningLog103_(ctx,'讀取 '+sheetName+'：完成，0 筆，'+((Date.now()-startedAt)/1000).toFixed(1)+'s');return [];
  }
  planningLog103_(ctx,'讀取 '+sheetName+'：'+lastRow+' 列 × '+lastCol+' 欄，讀取表頭');
  const headers=sh.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v).trim());
  planningReadBudget103_(ctx);
  const seen=new Set();
  headers.forEach(h=>{if(h){if(seen.has(h))throw new Error(sheetName+' 表頭重複：'+h);seen.add(h);}});
  if(!seen.size)throw new Error(sheetName+' 第一列沒有表頭，請確認表頭位於第 1 列。');
  if(seen.has('__row'))throw new Error(sheetName+' 不可使用保留欄位名稱 __row。');
  const missing=(required[sheetName]||[]).filter(h=>!seen.has(h));
  if(missing.length)throw new Error(sheetName+' 缺少必要欄位：'+missing.join('、'));
  const rows=[],batchSize=Math.max(1,Math.min(1000,Math.floor(PLANNING_READ_CHUNK_CELLS_103_/lastCol)));
  for(let start=2;start<=lastRow;start+=batchSize){
    planningReadBudget103_(ctx);
    const count=Math.min(batchSize,lastRow-start+1);
    planningLog103_(ctx,'讀取 '+sheetName+'：第 '+start+'～'+(start+count-1)+' 列');
    const values=sh.getRange(start,1,count,lastCol).getValues();
    planningReadBudget103_(ctx);
    values.forEach((row,index)=>{
      const obj={__row:start+index};
      headers.forEach((h,i)=>obj[h]=row[i]);
      if(headers.some(h=>h&&String(obj[h])!==''))rows.push(obj);
    });
  }
  planningLog103_(ctx,'讀取 '+sheetName+'：完成，'+rows.length+' 筆，'+((Date.now()-startedAt)/1000).toFixed(1)+'s');
  return rows;
}

function planningValidationLog103_(ctx,check){
  planningLog103_(ctx,(check.ok?'✅ 驗證通過':'❌ 驗證失敗')+'｜資料表：'+check.sheetCount+'｜總列數：'+check.rowCount);
  check.warnings.forEach(message=>console.warn('[企劃警告] '+message));
  check.errors.forEach(message=>console.error('[企劃錯誤] '+message));
}

function onOpen(){
  try{
    SpreadsheetApp.getUi().createMenu('🚀 遊戲資料')
      .addItem('驗證企劃資料','validatePlanningDataForPublish')
      .addItem('發布正式資料','publishPlanningDataToGameServer')
      .addSeparator()
      .addItem('查看目前發布版本','showCurrentPublishedPlanningVersion')
      .addItem('核對目前正式資料（只讀）','verifyCurrentPublishedPlanning107')
      .addItem('檢查維護設定與排程（只讀）','checkMaintenanceStatus465')
      .addSeparator()
      .addItem('填入已確認的裝備 Lv（不發布）','applyEquipmentLevels464')
      .addToUi();
  }catch(_e){}
}

function planningSbHeaders_(prefer){
  const cfg=supabaseConfig_(),h={apikey:cfg.key,Authorization:'Bearer '+cfg.key};
  if(prefer)h.Prefer=prefer;return h;
}

function planningSbRequest_(method,path,payload,prefer){
  const cfg=supabaseConfig_(),opt={method:method,headers:planningSbHeaders_(prefer),muteHttpExceptions:true};
  if(payload!==undefined){opt.contentType='application/json';opt.payload=JSON.stringify(payload);}
  const res=UrlFetchApp.fetch(cfg.url+'/rest/v1/'+path,opt),status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('PLANNING_SUPABASE_HTTP_'+status+': '+text);
  if(!text)return null;try{return JSON.parse(text)}catch(_e){return text}
}

function planningBuildPackageFromSheets_(ctx){
  ctx=ctx||planningRun103_('企劃讀表');
  const data={};
  DB.PUBLIC_SHEETS.forEach(name=>data[name]=planningReadSheet103_(name,ctx));
  for(const name of ['MistConfig','MistEnemies','MistLootRules','MistRankRewards'])if(ss_().getSheetByName(name))data[name]=planningReadSheet103_(name,ctx);
  const additions=[
    {ShopEntryID:'shop_stonePack100',ContentType:'enhancement',ContentID:'stonePack100',DisplayName:'強化石 ×100',Price:500,UnlockFloor:1,Enabled:true,Category:'enhancement'},
    {ShopEntryID:'shop_legendaryHammer',ContentType:'enhancement',ContentID:'legendaryHammer',DisplayName:'傳說之鎚',Price:10000,UnlockFloor:1,Enabled:true,Category:'enhancement'}
  ];
  additions.forEach(r=>{if(!data.ShopEntries.some(x=>String(x.ContentID||'').trim()===r.ContentID&&String(x.ContentType||'').toLowerCase()==='enhancement')){
    if(data.ShopEntries.some(x=>String(x.ShopEntryID||'')===r.ShopEntryID))throw new Error('新增商品 ID 重複：'+r.ShopEntryID);
    data.ShopEntries.push(r);
  }});
  return data;
}

function planningGiftboxCanonical102_(value){
 const wireValue=JSON.parse(JSON.stringify(value));
 const sort=v=>{
  if(Array.isArray(v))return v.map(sort);
  if(v&&typeof v==='object'){
   const out={};Object.keys(v).sort().forEach(k=>out[k]=sort(v[k]));return out;
  }
  return v;
 };
 return sort(wireValue);
}

function planningFirstDifference107_(expected,actual,path){
 if(expected===actual)return '';
 if(expected===null||actual===null||typeof expected!==typeof actual)return path;
 if(Array.isArray(expected)||Array.isArray(actual)){
  if(!Array.isArray(expected)||!Array.isArray(actual))return path;
  if(expected.length!==actual.length)return path+'.length';
  for(let i=0;i<expected.length;i++){
   const diff=planningFirstDifference107_(expected[i],actual[i],path+'['+i+']');
   if(diff)return diff;
  }
  return '';
 }
 if(typeof expected==='object'){
  const keys=[...new Set([...Object.keys(expected),...Object.keys(actual)])].sort();
  for(const key of keys){
   const next=path+'.'+key;
   if(!Object.prototype.hasOwnProperty.call(expected,key)||!Object.prototype.hasOwnProperty.call(actual,key))return next;
   const diff=planningFirstDifference107_(expected[key],actual[key],next);
   if(diff)return diff;
  }
  return '';
 }
 return path;
}

function planningVerifyReadback107_(expected,actual){
 const errors=[],tables=[];
 if(!expected?.dataVersion||actual?.dataVersion!==expected.dataVersion)errors.push('發布版本不一致：預期 '+String(expected?.dataVersion||'未設定')+'，回讀 '+String(actual?.dataVersion||'未設定'));
 for(const name of DB.PUBLIC_SHEETS){
  if(!Array.isArray(expected?.data?.[name])){errors.push('送出資料缺少企劃表：'+name);continue;}
  if(!Array.isArray(actual?.data?.[name])){errors.push('回讀資料缺少企劃表：'+name);continue;}
  const left=planningGiftboxCanonical102_(expected.data[name]),right=planningGiftboxCanonical102_(actual.data[name]);
  const difference=planningFirstDifference107_(left,right,name);
  if(difference)errors.push('企劃內容不一致：'+difference+'（陣列索引從 0 起算；未列出資料內容）');
  else tables.push({name,rows:right.length});
 }
 return {ok:errors.length===0,errors,tables,sheetCount:tables.length,rowCount:tables.reduce((n,t)=>n+t.rows,0)};
}

function verifyCurrentPublishedPlanning107(){
 const ctx=planningRun103_('正式企劃核對');
 try{
  // Read only: compare current Sheets with the published package. Never publish,
  // reset reward quantities, settle a season or touch a player's save here.
  const data=planningBuildPackageFromSheets_(ctx);
  planningReadBudget103_(ctx);
  planningLog103_(ctx,'回讀正式企劃，核對目前試算表的公開內容');
  const pkg=publishedPlanningPackage_(true);
  planningLog103_(ctx,'目前正式版本：'+pkg.dataVersion+'｜發布時間：'+String(pkg.generatedAt||''));
  const check=planningVerifyReadback107_({dataVersion:pkg.dataVersion,data},pkg);
  if(!check.ok)throw new Error('目前試算表與正式企劃尚未一致：\n'+check.errors.join('\n')+'\n本次只讀核對，未重新發布。請確認表格內容後再執行發布。');
  planningLog103_(ctx,'✅ 正式企劃核對通過｜版本：'+pkg.dataVersion+'｜'+check.sheetCount+' 張公開表、'+check.rowCount+' 筆內容一致。可回遊戲更新資料，無須重新發布。');
  planningToast103_(ctx,'✅ 正式企劃核對通過');
  return {ok:true,dataVersion:pkg.dataVersion,generatedAt:pkg.generatedAt,sheetCount:check.sheetCount,rowCount:check.rowCount,readOnly:true};
 }catch(e){planningFailure103_(ctx,e);throw e;}
}

function planningGiftboxErrors102_(data){
 const petErrors297=[];if((data.GiftBoxes||[]).some(r=>r.BoxID==='petEgg')){for(var i297=0;i297<3;i297++){var row297=(data.PetTrainingCosts||[]).find(r=>Number(r.LockedCount)===i297);if(row297?.StoneCost==null||row297.StoneCost===''||!Number.isInteger(Number(row297.StoneCost))||Number(row297.StoneCost)<1)petErrors297.push('請填寫 PetTrainingCosts：鎖定 '+i297+' 條的訓練總消耗（正整數）');}var ps297=(data.PetQualities||[]).reduce((n,r)=>n+Number(r.Probability||0),0);if(Math.abs(ps297-1)>1e-9)petErrors297.push('PetQualities 機率合計須為100%');}
 const errors=[...petErrors297],enabled=r=>!Object.prototype.hasOwnProperty.call(r,'Enabled')||r.Enabled===true||String(r.Enabled).toLowerCase()==='true';
 const rows=k=>Array.isArray(data?.[k])?data[k]:[];
 const text=v=>String(v??'').trim(),integer=(v,min,max)=>v!==''&&v!==null&&v!==undefined&&Number.isInteger(Number(v))&&Number(v)>=min&&Number(v)<=max;
 const boxes=rows('GiftBoxes').filter(enabled),tiers=rows('GiftBoxTiers').filter(enabled),rewards=rows('GiftBoxRewards').filter(enabled);
 const consumables=rows('Consumables').filter(enabled),activeIds=new Set(boxes.map(x=>text(x.BoxID)));
 for(const c of consumables.filter(c=>text(c.Kind)==='gift'))if(!activeIds.has(text(c.ContentID)))errors.push('GiftBoxes 缺少啟用的寶盒：'+text(c.ContentID));
 const unique=(list,key,label)=>{const seen=new Set();for(const r of list){const id=key(r);if(!id)errors.push(label+' 的 ID 不可空白');else if(seen.has(id))errors.push(label+' ID 重複：'+id);seen.add(id);}};
 unique(rows('GiftBoxes'),r=>text(r.BoxID),'GiftBoxes');
 unique(rows('GiftBoxTiers'),r=>text(r.BoxID)&&text(r.TierID)?text(r.BoxID)+'/'+text(r.TierID):'','GiftBoxTiers');
 unique(rows('GiftBoxRewards'),r=>text(r.BoxID)&&text(r.RewardID)?text(r.BoxID)+'/'+text(r.RewardID):'','GiftBoxRewards');
 for(const b of boxes){
  const boxId=text(b.BoxID),bt=tiers.filter(t=>text(t.BoxID)===boxId),sum=bt.reduce((n,t)=>n+Number(t.Probability),0);
  if(!consumables.some(c=>text(c.ContentID)===boxId&&text(c.Kind)==='gift'))errors.push(boxId+' 沒有對應 Kind=gift 的啟用消耗品');
  if(!text(b.Name))errors.push(boxId+' 的寶盒名稱不可空白');
  if(!bt.length||!Number.isFinite(sum)||Math.abs(sum-1)>1e-12)errors.push(boxId+' 的啟用獎級 Probability 加總必須為 1（100%）');
 }
 for(const t of tiers){
  const boxId=text(t.BoxID),tierId=text(t.TierID),label=boxId+'/'+tierId;
  if(!activeIds.has(boxId))errors.push('GiftBoxTiers 對應不存在或未啟用的寶盒：'+label);
  if(!text(t.Name))errors.push(label+' 的獎級名稱不可空白');
  if(!(Number(t.Probability)>0&&Number(t.Probability)<=1))errors.push(label+' 的 Probability 必須大於 0 且不超過 1');
  if(!rewards.some(r=>text(r.BoxID)===boxId&&text(r.TierID)===tierId))errors.push(label+' 沒有啟用獎項');
 }
 for(const r of rewards){
  const boxId=text(r.BoxID),tierId=text(r.TierID),label=text(r.RewardID),type=text(r.ContentType).toUpperCase(),ids=text(r.ContentIDs).split(',').map(text),sockets=r.Sockets===''||r.Sockets==null?0:r.Sockets;
  if(!tiers.some(t=>text(t.BoxID)===boxId&&text(t.TierID)===tierId))errors.push(label+' 的獎級不存在或未啟用：'+boxId+'/'+tierId);
  if(!['GOLD','STONE','ENHANCEMENT','CONSUMABLE','GEM','EQUIPMENT','SKILL','TITLE','UTILITY','PET'].includes(type))errors.push(label+' 不支援 ContentType：'+type);
  if(!integer(r.Quantity,1,2147483647))errors.push(label+' 的 Quantity 必須為正整數');
  if(['GEM','EQUIPMENT','SKILL','TITLE','UTILITY'].includes(type)&&Number(r.Quantity)!==1)errors.push(label+' 的寶石／裝備／技能／稱號／功能道具 Quantity 必須為 1');
  if(!(Number(r.Weight)>0&&Number(r.Weight)<=1000000))errors.push(label+' 的 Weight 必須大於 0 且不超過 1000000');
  if(!integer(sockets,0,2)||type!=='EQUIPMENT'&&Number(sockets)!==0)errors.push(label+' 的 Sockets 必須為裝備 0～2 洞，其他類型填 0');
  if(ids.some(id=>!id)||new Set(ids).size!==ids.length)errors.push(label+' 的 ContentIDs 不可空白或重複');
  for(const id of ids){
   let template;
   if(type==='PET'&&!rows('PetSpecies').some(x=>text(x.PetID)===id&&enabled(x)))errors.push(label+' 的寵物 ID 不存在或已停用：'+id);
   if(type==='GEM'){template=rows('Gems').find(x=>text(x.GemID)===id);if(!template||!enabled(template))errors.push(label+' 的寶石 ID 不存在或已停用：'+id);}
   if(type==='EQUIPMENT'){template=rows('Equipment').find(x=>text(x.ItemID)===id);if(!template||!['weapon','head','armor','special','ring'].includes(template.Slot)||'Enabled' in template&&!toBool_(template.Enabled))errors.push(label+' 的裝備 ID 不存在、停用或部位不合法：'+id);}
   if(type==='CONSUMABLE'&&!consumables.some(x=>text(x.ContentID)===id&&!['enhancement','utility'].includes(text(x.Kind))))errors.push(label+' 的消耗品 ID 不存在或類型不符：'+id);
   if(type==='UTILITY'&&!consumables.some(x=>text(x.ContentID)===id&&text(x.Kind)==='utility'))errors.push(label+' 的功能道具 ID 不存在：'+id);
   if(type==='SKILL'&&!rows('Skills').some(x=>text(x.SkillID)===id&&['active','passive'].includes(text(x.Type))&&enabled(x)))errors.push(label+' 的技能 ID 不存在或已停用：'+id);
   if(type==='TITLE'&&!rows('Titles').some(x=>text(x.TitleID)===id&&enabled(x)))errors.push(label+' 的稱號 ID 不存在或已停用：'+id);
   if(type==='GOLD'&&id!=='gold'||type==='STONE'&&id!=='stones'||type==='ENHANCEMENT'&&(!['legendaryHammer','stonePack10','stonePack100'].includes(id)||!consumables.some(x=>text(x.ContentID)===id&&text(x.Kind)==='enhancement')))errors.push(label+' 的資源 ContentIDs 不正確：'+id);
   if(template){
    if(!text(template.Name))errors.push(label+' 的獎品名稱不可空白：'+id);
    for(const k of ['HP','DEF','PATK','MATK','Crit','CritDamage'])if(!Number.isFinite(Number(template[k]??0)))errors.push(id+' 的 '+k+' 必須為數值');
    const price=type==='GEM'?template.Price:template.BasePrice;if(!Number.isFinite(Number(price??0)))errors.push(id+' 的價格必須為數值');
   }
  }
 }
 return errors;
}



function planningValidatePackage_(data){
  const errors=[],warnings=[];
  if(!data||typeof data!=='object')errors.push('PACKAGE_INVALID');
  const forbidden=['PlayerSaves_SCHEMA','Auction_SCHEMA','WorldBossState_SCHEMA','WorldBossAttempts_SCHEMA','WorldBossRewards_SCHEMA'];
  forbidden.forEach(k=>{if(Object.prototype.hasOwnProperty.call(data||{},k))errors.push('禁止發布 Runtime 資料表：'+k)});
  DB.PUBLIC_SHEETS.forEach(k=>{if(!Array.isArray(data?.[k]))errors.push('缺少企劃表：'+k)});
  ['GameConfig','Equipment','Enemies','Enemies','Skills','Gems','WorldBoss_SCHEMA'].forEach(k=>{
    if(Array.isArray(data?.[k])&&data[k].length===0)warnings.push(k+' 目前為空');
  });
  const ids=(name,key)=>{
    const seen=new Set();
    (data?.[name]||[]).forEach((r,i)=>{
      const v=String(r?.[key]||'').trim();
      if(!v)errors.push(name+' 第 '+(i+2)+' 列 '+key+' 為空');
      else if(seen.has(v))errors.push(name+' '+key+' 重複：'+v);
      else seen.add(v);
    });
  };
  ids('Equipment','ItemID');ids('Skills','SkillID');ids('Enemies','EnemyID');ids('ArenaNPC','NpcID');
  try{arenaParseConfig126_(data.ArenaConfig||[]);}catch(e){errors.push('ArenaConfig：'+e.message);}
  errors.push(...planningEquipmentLevelErrors465_(data));
  errors.push(...planningMistErrors465_(data));
  if((data.QuestObjectives||[]).some(r=>r.ObjectiveID==='kazama_secret_4_1'&&r.TargetID!=='arena'))errors.push('請先執行 applyCompetition465PlanningToSheets，將退役拳擊機任務改為競技場。');
  errors.push(...planningGiftboxErrors102_(data));
  for(const r of data.Skills||[]){const category=String(r.DisplayCategory||'').trim();if(category&&!['magic','physical','hybrid','defense','healing','buff','special','passive','魔法','物理','混合','防禦','恢復','增益','特殊','被動'].includes(category))errors.push('Skills '+r.SkillID+' 的 DisplayCategory 必須是單一有效分類');}
  errors.push(...planningArenaRewardErrors185_(data));
  errors.push(...planningNpcErrors140_(data));
  errors.push(...planningRelicErrors144_(data));
  try{RPG411.validate(data);}catch(e){errors.push(e.message);}
  return {ok:errors.length===0,errors,warnings,sheetCount:DB.PUBLIC_SHEETS.length,rowCount:DB.PUBLIC_SHEETS.reduce((n,k)=>n+(data?.[k]?.length||0),0)};
}

function planningArenaRewardErrors185_(data){
 const errors=[],groups=new Map();
 for(const [index,r]of (data.ArenaRewards||[]).entries()){
  if('Enabled' in r&&!toBool_(r.Enabled))continue;
  const line=r.__row||index+2,season=String(r.SeasonID||'').trim(),lo=Number(r.RankMin),hi=Number(r.RankMax);
  if(!Number.isSafeInteger(lo)||lo<1||!Number.isSafeInteger(hi)||hi<lo||hi>999999){errors.push('ArenaRewards 第'+line+'列：名次範圍無效');continue;}
  const rows=groups.get(season)||[];rows.push({lo,hi,line});groups.set(season,rows);
  for(const [key,fallback,max]of [['Gold',0,999999999],['ConsumableQuantity',r.ConsumableID?1:0,999999]]){
   const raw=r[key],value=Number(raw==null||raw===''?fallback:raw);
   if(!Number.isSafeInteger(value)||value<0||value>max)errors.push('ArenaRewards 第'+line+'列：'+key+' 必須為有效的非負整數');
  }
 }
 for(const rows of groups.values()){
  rows.sort((a,b)=>a.lo-b.lo);
  for(let i=1;i<rows.length;i++)if(rows[i].lo<=rows[i-1].hi)errors.push('ArenaRewards 第'+rows[i].line+'列：同賽季名次範圍重疊');
 }
 return errors;
}

function validatePlanningDataForPublish(){
  const ctx=planningRun103_('企劃驗證');
  try{
    const data=planningBuildPackageFromSheets_(ctx);
    planningLog103_(ctx,'檢查公開企劃與寶盒獎項設定');
    const v=planningValidatePackage_(data);
    planningReadBudget103_(ctx);
    try{planningPrivateRedeemPackage_(data,ctx)}catch(e){v.ok=false;v.errors.push('階段：'+ctx.stage+'\n'+String(e.message||e))}
    v.warnings.push(...ctx.warnings);
    v.elapsedMs=Date.now()-ctx.startedAt;
    planningValidationLog103_(ctx,v);
    if(!v.ok)throw new Error('企劃驗證未通過：\n'+v.errors.join('\n'));
    planningToast103_(ctx,'✅ 驗證通過');
    return v;
  }catch(e){planningFailure103_(ctx,e);throw e;}
}

function planningNewVersion_(){
  return Utilities.formatDate(new Date(),'GMT','yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,8);
}

function planningPrivateRedeemPackage_(data,ctx){
  ctx=ctx||planningRun103_('序號企劃驗證');
  const names=['RedeemCodes_SCHEMA','RedeemCodeRewards_SCHEMA'];
  const configs=names.map(name=>({name:name,rows:planningReadSheet103_(name,ctx)}));
  planningLog103_(ctx,'檢查私人序號與獎勵設定');
  const errors=[],codes=new Set(),rewardCounts={};
  const norm=v=>String(v||'').trim().toUpperCase();
  configs[0].rows.forEach((r,i)=>{
    const code=norm(r.Code);
    if(!code)errors.push('RedeemCodes_SCHEMA 第 '+(i+2)+' 列 Code 為空');
    else if(codes.has(code))errors.push('序號重複：'+code);
    codes.add(code);
    try{redeemTargetPlayers120_(r)}catch(e){errors.push(code+' 指定玩家欄位無效：'+String(e.message||e))}
    ['StartAt','EndAt'].forEach(k=>{if(String(r[k]||'').trim()&&!Number.isFinite(new Date(r[k]).getTime()))errors.push(code+' '+k+' 日期無效')});
  });
  const refs={EQUIPMENT:['Equipment','ItemID'],GEM:['Gems','GemID'],SKILL:['Skills','SkillID']};
  configs[1].rows.forEach((r,i)=>{
    const code=norm(r.Code),type=norm(r.ContentType),id=String(r.ContentID||'').trim();
    if(!codes.has(code))errors.push('獎勵對應不存在的序號：'+code);
    rewardCounts[code]=(rewardCounts[code]||0)+1;
    if(!['EQUIPMENT','GEM','SKILL','CONSUMABLE','GOLD','STONE'].includes(type))errors.push(code+' 不支援獎勵類型：'+type);
    if(refs[type]){const pair=refs[type];if(!(data[pair[0]]||[]).some(x=>String(x[pair[1]]||'').trim()===id))errors.push(code+' 獎勵 ID 不存在：'+id+'（'+pair[0]+'.'+pair[1]+'）')}
    if(type==='CONSUMABLE'&&!(data.Consumables||[]).some(x=>String(x.ContentID||x.ConsumableID||x.ItemID||'').trim()===id))errors.push(code+' 消耗品 ID 不存在：'+id);
    if(r.Quantity!==''&&r.Quantity!==null&&r.Quantity!==undefined&&(!Number.isInteger(Number(r.Quantity))||Number(r.Quantity)<1))errors.push(code+' Quantity 必須為正整數或留空');
  });
  configs[0].rows.forEach(r=>{if(toBool_(r.Enabled)&&!rewardCounts[norm(r.Code)])errors.push(norm(r.Code)+' 已啟用但沒有獎勵')});
  if(errors.length)throw new Error('序號企劃驗證失敗：\n'+errors.join('\n'));
  planningReadBudget103_(ctx);
  return configs;
}

function publishPlanningDataToGameServer(){
  const ctx=planningRun103_('企劃發布');
  let lock=null,locked=false,version='',currentWriteAttempted=false;
  try{
    planningLog103_(ctx,'取得發布鎖（最多等待 5 秒）');
    lock=LockService.getScriptLock();locked=lock.tryLock(5000);
    if(!locked)throw new Error('其他作業正在使用腳本鎖；本次尚未發布，請稍後再執行。');
    const data=planningBuildPackageFromSheets_(ctx);
    planningLog103_(ctx,'檢查公開企劃與寶盒獎項設定');
    const check=planningValidatePackage_(data);
    planningReadBudget103_(ctx);
    if(!check.ok)throw new Error('發布中止：\n'+check.errors.join('\n'));
    const privateConfigs=planningPrivateRedeemPackage_(data,ctx);
    check.warnings.push(...ctx.warnings);
    planningValidationLog103_(ctx,check);
    planningReadBudget103_(ctx);
    version=planningNewVersion_();
    const now=new Date().toISOString();
    // Freeze the exact JSON payload before the first write; verification uses this snapshot.
    const pkg=JSON.parse(JSON.stringify({ok:true,dataVersion:version,generatedAt:now,data:data}));
    const history={version:version,published_at:now,published_by:Session.getActiveUser().getEmail()||'',data_json:pkg};
    planningLog103_(ctx,'寫入發布歷史，版本：'+version);
    planningSbRequest_('post',PLANNING_VERSIONS_TABLE_,history,'return=minimal');
    planningLog103_(ctx,'寫入私人序號設定（不包含在公開企劃包）');
    planningSbRequest_('post','game_runtime_config?on_conflict=name',privateConfigs,'resolution=merge-duplicates,return=minimal');
    planningLog103_(ctx,'切換正式企劃版本：'+version);
    currentWriteAttempted=true;
    planningSbRequest_('post',PLANNING_CURRENT_TABLE_,{channel:PLANNING_CURRENT_ID_,version:version,published_at:now,data_json:pkg},'resolution=merge-duplicates,return=minimal');
    planningLog103_(ctx,'清除企劃快取');
    CacheService.getScriptCache().remove(PLANNING_CACHE_KEY_);
    planningLog103_(ctx,'回讀正式企劃，核對版本及全部公開企劃（含寶盒／拳擊機）');
    const confirmed=publishedPlanningPackage_(true);
    const readback=planningVerifyReadback107_(pkg,confirmed);
    if(!readback.ok)throw new Error('發布已送出，但正式資料回讀核對未通過：\n'+readback.errors.join('\n')+'\n請執行 verifyCurrentPublishedPlanning107 核對，不要直接重複發布。');
    PropertiesService.getScriptProperties().setProperty('PUBLISHED_GAME_DATA_VERSION',version);
    planningLog103_(ctx,'🚀 發布完成（含序號設定）｜版本：'+version+'｜資料表：'+check.sheetCount+'｜總列數：'+check.rowCount);
    planningLog103_(ctx,'發布回讀確認：'+readback.sheetCount+' 張公開表、'+readback.rowCount+' 筆內容一致');
    planningToast103_(ctx,'🚀 發布完成（含寶盒與序號設定）');
    return {ok:true,version:version,...check,elapsedMs:Date.now()-ctx.startedAt};
  }catch(e){
    planningFailure103_(ctx,e);
    if(currentWriteAttempted)console.error('正式資料可能已送出；目標版本：'+version+'。請執行 verifyCurrentPublishedPlanning107 只讀核對目前正式內容，確認前請勿直接重複發布。');
    throw e;
  }finally{if(locked)lock.releaseLock();}
}

function publishedPlanningPackage_(force){
  const cache=CacheService.getScriptCache();
  if(!force){const hit=cache.get(PLANNING_CACHE_KEY_);if(hit){try{return JSON.parse(hit)}catch(_e){}}}
  const rows=planningSbRequest_('get',PLANNING_CURRENT_TABLE_+'?channel=eq.'+encodeURIComponent(PLANNING_CURRENT_ID_)+'&select=version,published_at,data_json&limit=1');
  if(!Array.isArray(rows)||!rows.length)throw new Error('PLANNING_NOT_PUBLISHED');
  const pkg=rows[0].data_json;
  if(!pkg||!pkg.data||!pkg.dataVersion)throw new Error('PLANNING_PUBLISHED_PACKAGE_INVALID');
  try{const raw=JSON.stringify(pkg);if(raw.length<90000)cache.put(PLANNING_CACHE_KEY_,raw,300)}catch(_e){}
  return pkg;
}

function publishedPlanningRows_(sheetName){
  const pkg=publishedPlanningPackage_(false),rows=pkg?.data?.[sheetName];
  if(!Array.isArray(rows))throw new Error('PLANNING_SHEET_NOT_IN_PUBLISHED_PACKAGE:'+sheetName);
  return rows;
}

function showCurrentPublishedPlanningVersion(){
  const ctx=planningRun103_('查詢發布版本');
  try{
    planningLog103_(ctx,'回讀目前正式企劃');
    const pkg=publishedPlanningPackage_(true),giftboxRows={};
    planningLog103_(ctx,'目前正式企劃版本：'+pkg.dataVersion+'｜發布時間：'+String(pkg.generatedAt||''));
    ['GiftBoxes','GiftBoxTiers','GiftBoxRewards'].forEach(name=>{
      giftboxRows[name]=Array.isArray(pkg.data&&pkg.data[name])?pkg.data[name].length:null;
      console.log('[正式寶盒資料] '+name+'：'+(giftboxRows[name]===null?'缺少此表':giftboxRows[name]+' 筆'));
    });
    
    return {ok:true,dataVersion:pkg.dataVersion,generatedAt:pkg.generatedAt,giftboxRows:giftboxRows};
  }catch(e){planningFailure103_(ctx,e);throw e;}
}

// ============================================================
// 02｜舊 Web App 相容服務（含原有排程與交易恢復）
// ============================================================



function doGet(e) {
  try {
    const action = routeAction_(e);
    const payload = e && e.parameter ? e.parameter : {};

    if (action === 'health') {
      return json_({
        ok: true,
        service: 'turn-based-rpg-backend',
        backendVersion: 'maintenance482',
        now: new Date().toISOString()
      });
    }

    if (action === 'data/version') {
      return json_({ok:true,dataVersion:cachedDataVersion_()});
    }

    if (action === 'data/bootstrap') {
      return json_(getBootstrapData_(String(payload.forceRefresh||'')==='1'||String(payload.forceRefresh||'').toLowerCase()==='true'));
    }

    if (action === 'leaderboard') {
      const type = String(payload.type || 'clear');
      const limit = clampInt_(payload.limit || 50, 1, 100);
      return json_(getLeaderboard_(type, limit));
    }

    if (action === 'auction/list') {
      const page = clampInt_(payload.page || 1, 1, 999999);
      const pageSize = clampInt_(payload.pageSize || 50, 1, 100);
      return json_(getAuctionListCached_(page, pageSize, payload.category));
    }

    return json_({ ok: false, error: 'UNKNOWN_GET_ACTION', action: action });
  } catch (err) {
    return json_({ ok: false, error: 'SERVER_ERROR', message: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || routeAction_(e) || '').replace(/^\/+|\/+$/g, '');

    switch (action) {
      case 'auth/register':
        return json_(register_(body));
      case 'auth/login':
        return json_(login_(body));
      case 'auth/bind':
        return json_({ ok:false, error:'LOCAL_BIND_DISABLED', message:'New accounts must start from a fresh server save.' });
      case 'profile/nickname':
        return json_(changeNickname_(body));

      case 'save/get':
        return json_(getSave_(body));
      case 'save/set':
        return json_(setSave_(body));

      // v11.16.0：靜態遊戲資料也支援 POST。
      // 前端不再依賴 Apps Script GET redirect 作為更新資料的唯一通道。
      case 'data/version':
        return json_({ok:true,dataVersion:cachedDataVersion_()});
      case 'data/bootstrap':
        return json_(getBootstrapData_(body.forceRefresh===true||String(body.forceRefresh||'').toLowerCase()==='true'||String(body.forceRefresh||'')==='1'));

      case 'auction/list':
        return json_(getAuctionListCached_(body.page, body.pageSize, body.category));

      case 'auction/create':
        return json_(createAuction_(body));
      case 'auction/cancel':
        return json_(cancelAuction_(body));
      case 'auction/buy':
        return json_(buyAuction_(body));
      case 'auction/my-sales':
        return json_(getMyAuctionSales_(body));
      case 'auction/claim':
        return json_(claimAuctionProceeds_(body));
      case 'worldboss/status':
        return json_(getWorldBossStatus_(body));
      case 'worldboss/ranking':
        return json_(getWorldBossRanking_(body));
      case 'worldboss/reward/check':
        return json_(checkWorldBossReward_(body));
      case 'worldboss/start':
        return json_(startWorldBossChallenge_(body));
      case 'worldboss/submit':
        return json_(submitWorldBossChallenge_(body));
      case 'worldboss/chest/open':
        return json_(markWorldBossChestOpened_(body));
      case 'redeem/claim':
        return json_(claimRedeemCode_(body));
      case 'achievement/claim':
        return json_(claimAchievement_(body));
      
      
      
      
      
      

      // v11.31.92 Arena Phase 1
      case 'arena/status':
        return json_(arenaStatus_(body));
      case 'arena/defense/upload':
        return json_(arenaUploadDefense_(body));
      case 'arena/matches':
        return json_(arenaGetDailyMatches_(body));
      case 'arena/battle/start':
        return json_(arenaStartBattle_(body));
      case 'arena/battle/submit':
        return json_(arenaSubmitBattle_(body));
      case 'arena/revenge/list':
        return json_(arenaRevengeList_(body));
      case 'arena/reports':
        return json_(arenaReports_(body));
      case 'arena/ranking':
        return json_(arenaRanking_(body));
      case 'arena/reward/claim':
        return json_(arenaClaimReward_(body));

      default:
        return json_({ ok: false, error: 'UNKNOWN_POST_ACTION', action: action });
    }
  } catch (err) {
    return json_({ ok: false, error: 'SERVER_ERROR', message: String(err && err.message || err) });
  }
}

function normalizeStoredHash_(v) {
  return String(v == null ? '' : v).trim().replace(/^'/,'');
}

function register_(body) {
  const username = normalizeUsername_(body.username);
  const password = String(body.password || '');
  const nickname = normalizeNickname_(body.nickname);

  validateUsername_(username);
  validatePassword_(password);
  validateNickname_(nickname);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const existingSb = accountsSbFindByUsername_(username);
    if (existingSb) {
      const existing = accountsSbRowToLegacyAccount_(existingSb);
      const expectedExisting = normalizeStoredHash_(existing.PasswordHash);
      const actualExisting = hashPassword_(password, String(existing.Salt || ''));
      if (safeEquals_(expectedExisting, actualExisting)) {
        let saveRec = findRowByValue_(DB.SAVES, 'AccountID', String(existing.AccountID));
        if (!saveRec) {
          const repairNickname=String(existing.Nickname || nickname || '冒險者');
          const repairSave = makeInitialSave_(repairNickname);
          repairSave.nickname = repairNickname;
          writeFullSave_(String(existing.AccountID), 1, repairSave);
          saveRec = findRowByValue_(DB.SAVES, 'AccountID', String(existing.AccountID));
        }
        accountsSheetMirrorFromSbRowSafe_(existingSb, 'REGISTER_REPAIR_EXISTING');
        const repaired = saveRec ? parseSaveRecord_(saveRec) : makeInitialSave_(String(existing.Nickname || nickname || '冒險者'));
        return {ok:true,repaired:true,accountId:String(existing.AccountID),nickname:String(existing.Nickname || nickname || ''),sessionToken:makeToken_(String(existing.AccountID)),revision:Number(saveRec ? saveRec.Revision : 1) || 1,save:repaired};
      }
      return { ok:false, error:'USERNAME_EXISTS' };
    }

    const accountId = 'ACC_' + Utilities.getUuid().replace(/-/g, '');
    const salt = randomHex_(32);
    const passwordHash = hashPassword_(password, salt);
    const now = new Date().toISOString();
    const sbRow={account_id:accountId,username_normalized:username,password_hash:passwordHash,salt:salt,nickname:nickname,created_at:now,last_login_at:now,save_version:getDataVersion_(),disabled:false,row_revision:1};

    // Supabase is authoritative. Unique username/account constraints provide DB-level duplicate protection.
    accountsSbInsert_(sbRow);

    const initialSave = makeInitialSave_(nickname);
    initialSave.nickname = nickname;
    try {
      writeFullSave_(accountId, 1, initialSave);
    } catch (saveErr) {
      // Registration is not considered committed if the initial PlayerSave cannot be created.
      try{accountsSbDeleteByAccountId_(accountId);}catch(rollbackErr){console.error('[ACCOUNTS_REGISTER_ROLLBACK_FAILED] '+String(rollbackErr&&rollbackErr.message||rollbackErr));}
      throw new Error('REGISTER_SAVE_CREATE_FAILED:' + String(saveErr && saveErr.message || saveErr));
    }

    // Sheet is TEMP backup mirror only; mirror failure must not invalidate a committed Supabase registration.
    accountsSheetMirrorFromSbRowSafe_(sbRow, 'REGISTER');

    const token = makeToken_(accountId);
    const createdRec = findRowByValue_(DB.SAVES, 'AccountID', accountId);
    const safeCreatedSave = createdRec ? parseSaveRecord_(createdRec) : initialSave;
    return {ok:true,accountId:accountId,nickname:nickname,sessionToken:token,save:safeCreatedSave,revision:1};
  } finally {
    lock.releaseLock();
  }
}

function login_(body) {
  const username = normalizeUsername_(body.username);
  const password = String(body.password || '');

  const sbAcc = accountsSbFindByUsername_(username);
  if (!sbAcc) return { ok: false, error: 'INVALID_LOGIN' };
  const acc = accountsSbRowToLegacyAccount_(sbAcc);
  if (toBool_(acc.Disabled)) return { ok: false, error: 'ACCOUNT_DISABLED' };

  const expected = normalizeStoredHash_(acc.PasswordHash);
  const actual = hashPassword_(password, String(acc.Salt || ''));
  if (!safeEquals_(expected, actual)) return { ok: false, error: 'INVALID_LOGIN' };

  const lastLoginAt=new Date().toISOString();
  accountsSbPatchByAccountId_(String(acc.AccountID),{last_login_at:lastLoginAt});
  sbAcc.last_login_at=lastLoginAt;
  accountsSheetMirrorFromSbRowSafe_(sbAcc, 'LOGIN_LAST_LOGIN');

  const saveRec = findRowByValue_(DB.SAVES, 'AccountID', String(acc.AccountID));
  const rawSave = saveRec ? parseSaveRecord_(saveRec) : makeInitialSave_(String(acc.Nickname || '冒險者'));
  return {ok:true,accountId:String(acc.AccountID),nickname:String(acc.Nickname || ''),sessionToken:makeToken_(String(acc.AccountID)),revision:Number(saveRec ? saveRec.Revision : 1) || 1,save:rawSave};
}

function changeNickname_(body) {
  const auth = requireAuth_(body.sessionToken);
  const nickname = normalizeNickname_(body.nickname);
  validateNickname_(nickname);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sbAcc = accountsSbFindByAccountId_(auth.accountId);
    if (!sbAcc) return { ok: false, error: 'ACCOUNT_NOT_FOUND' };
    const nextRevision=(Number(sbAcc.row_revision)||0)+1;

    // Account mutation commits to Supabase first.
    accountsSbPatchByAccountId_(auth.accountId,{nickname:nickname,row_revision:nextRevision});
    sbAcc.nickname=nickname; sbAcc.row_revision=nextRevision;

    const saveRec = findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    if (saveRec) {
      const save = parseSaveRecord_(saveRec);
      save.nickname = nickname;
      updateSaveRecord_(saveRec, save);
    }

    accountsSheetMirrorFromSbRowSafe_(sbAcc, 'CHANGE_NICKNAME');
    const latestSaveRec = findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    return { ok: true, nickname: nickname, revision: Number(latestSaveRec ? latestSaveRec.Revision : 1) || 1 };
  } finally {
    lock.releaseLock();
  }
}

function getSave_(body) {
  const auth = requireAuth_(body.sessionToken);
  const rec = findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);

  if (!rec) return { ok: false, error: 'SAVE_NOT_FOUND' };

  return {
    ok: true,
    revision: Number(rec.Revision) || 1,
    save: parseSaveRecord_(rec)
  };
}

function setSave_(body) {
  let stage='auth';
  let auth=null;
  try {
    auth=requireAuth_(body.sessionToken);
    stage='sanitize';
    const incomingSave=sanitizeIncomingSave_(body.save);
    stage='lock';
    const lock=LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      stage='find-save';
      const rec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);
      if(!rec)return {ok:false,error:'SAVE_NOT_FOUND',stage:stage,message:'找不到此帳號的 PlayerSave 資料列。'};
      const currentRevision=Number(rec.Revision)||1;
      // Auth clients must compare the revision they last read under the same save lock.
      if(String(body.sessionToken||'').split('.').length===3){
        const expected=Number(body.expectedSaveRevision);
        if(!Number.isSafeInteger(expected)||expected!==currentRevision){
          return {ok:false,error:'SAVE_REVISION_CONFLICT',revision:currentRevision,message:'雲端存檔已變更，請先同步確認，未覆寫雲端資料。'};
        }
      }
      stage='integrity-guard';
      const currentSave=parseSaveRecord_(rec);
      assertNoDangerousSaveRegression_(currentSave,incomingSave);
      const newRevision=currentRevision+1;
      stage='write-save';
      writeFullSave_(auth.accountId,newRevision,incomingSave);
      stage='verify-write';
      const written=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);
      if(!written || Number(written.Revision)!==newRevision){
        return {ok:false,error:'SAVE_WRITE_VERIFY_FAILED',stage:stage,message:'寫入後無法確認最新 Revision。'};
      }
      return {ok:true,revision:newRevision,previousRevision:currentRevision,overwrite:true};
    } finally {
      try{lock.releaseLock();}catch(_e){}
    }
  } catch(err) {
    return {
      ok:false,
      error:String(err&&err.message||'SAVE_SET_FAILED'),
      stage:stage,
      message:String(err&&err.message||err||'SAVE_SET_FAILED')
    };
  }
}

function runtimeAccountById_(accountId) {
  const sb = accountsSbFindByAccountId_(String(accountId || '').trim());
  return accountsSbRowToLegacyAccount_(sb);
}

const RANKING_CACHE_TTL_SEC_ = 8;

function rankingCache_(){ return CacheService.getScriptCache(); }

function rankingCacheGetJson_(key){
  try{ const s=rankingCache_().get(key); return s?JSON.parse(s):null; }catch(_e){ return null; }
}

function rankingCachePutJson_(key,value){
  try{ rankingCache_().put(key,JSON.stringify(value),RANKING_CACHE_TTL_SEC_); }catch(_e){}
}

function invalidateLeaderboardCache_(){ try{ rankingCache_().remove('rank:leaderboard:all'); }catch(_e){} }

function invalidateWorldBossRankingCache_(bossInstanceId){
  try{ rankingCache_().remove('rank:wb:'+String(bossInstanceId||'')); }catch(_e){}
}



function supabaseLeaderboardRows_(limit) {
  if(SUPABASE_PRIMARY_ENABLED_!==true)throw new Error('SUPABASE_PRIMARY_DISABLED');
  const cfg=supabaseConfig_();
  const n=Math.max(1,Math.min(Math.trunc(Number(limit)||200),500));
  const select=encodeURIComponent('account_id,nickname,level,max_cleared,title_id:save_json->>equippedTitle');
  const base=cfg.url+'/rest/v1/PlayerSaves?select='+select;
  const headers={apikey:cfg.key,Authorization:'Bearer '+cfg.key};
  const requests=[
    {url:base+'&order=level.desc,max_cleared.desc&limit='+n,method:'get',headers:headers,muteHttpExceptions:true},
    {url:base+'&max_cleared=gt.0&order=max_cleared.desc,level.desc&limit='+n,method:'get',headers:headers,muteHttpExceptions:true}
  ];
  const responses=UrlFetchApp.fetchAll(requests);
  const merged=new Map();
  responses.forEach((response,idx)=>{
    const status=response.getResponseCode(),text=response.getContentText();
    if(status<200||status>=300)throw new Error('SUPABASE_LEADERBOARD_READ_HTTP_'+status+'_Q'+(idx+1)+': '+text);
    let data=[];try{data=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_LEADERBOARD_JSON_INVALID_Q'+(idx+1));}
    if(!Array.isArray(data))throw new Error('SUPABASE_LEADERBOARD_ROWS_INVALID_Q'+(idx+1));
    data.forEach(r=>{
      const accountId=String(r.account_id||'').trim();
      if(!accountId)return;
      merged.set(accountId,{
        accountId:accountId,
        nickname:String(r.nickname||'冒險者'),
        titleId:String(r.title_id||'beginner'),
        level:Math.max(1,Math.trunc(Number(r.level)||1)),
        clearCount:Math.max(0,Math.trunc(Number(r.max_cleared)||0))
      });
    });
  });
  return Array.from(merged.values());
}

function getLeaderboard_(type, limit) {
  const key='rank:leaderboard:all';
  const n=Math.max(1,Math.min(Number(limit)||200,500));
  let rows=rankingCacheGetJson_(key);
  if(!Array.isArray(rows)){
    rows=supabaseLeaderboardRows_(n);
    rankingCachePutJson_(key,rows);
  }
  return {ok:true,type:'all',source:'supabase',rows:rows};
}

function requireTransactionSaveRevision_(body, saveRec) {
  const expected=Math.trunc(Number(body&&body.expectedSaveRevision)||0);
  const current=Math.trunc(Number(saveRec&&saveRec.Revision)||0);
  if(!(expected>0))throw new Error('SAVE_PREFLIGHT_REQUIRED');
  if(expected!==current)throw new Error('SAVE_PREFLIGHT_REVISION_MISMATCH');
  return current;
}

function worldBossConfig_() {
  const cfg = {};
  // 世界 BOSS 參數集中在獨立 WorldBoss_SCHEMA。
  readObjects_(DB.WORLD_BOSS_CONFIG).forEach(r => {
    const k=String(r.Key||'').trim();
    if(k)cfg[k]=r.Value;
  });
  const n=(k,d)=>{const v=Number(cfg[k]);return Number.isFinite(v)?v:d;};
  return {
    bossId:String(cfg.WorldBossID||'berserkGiant'),
    name:String(cfg.WorldBossName||'狂暴巨人'),
    maxHp:Math.max(1,Math.trunc(n('WorldBossHP',2000000))),
    def:Math.trunc(n('WorldBossDEF',10)),
    patk:Math.max(0,Math.trunc(n('WorldBossPATK',250))),
    matk:Math.max(0,Math.trunc(n('WorldBossMATK',250))),
    attempts:Math.max(1,Math.trunc(n('WorldBossAttemptsPerDay',3))),
    maxTurns:Math.max(1,Math.trunc(n('WorldBossMaxTurns',5))),
    respawnMinutes:Math.max(1,Math.trunc(n('WorldBossRespawnMinutes',10))),
    topRewardCount:Math.max(1,Math.trunc(n('WorldBossTopRewardCount',3))),
    chestStone:Math.max(0,Math.trunc(n('WorldBossChestStone',200))),
    chestGoldMin:Math.max(0,Math.trunc(n('WorldBossChestGoldMin',50))),
    chestGoldMax:Math.max(0,Math.trunc(n('WorldBossChestGoldMax',100))),
    chestGemRate:Math.max(0,Math.min(1,n('WorldBossChestGemRate',0.15))),
    chestGemId:String(cfg.WorldBossChestGemID||'berserkGiant')
  };
}

function worldBossPoolRows_(){
  return readObjects_('WorldBossPool').filter(r=>{
    const enabled=r.Enabled===true||String(r.Enabled||'').toLowerCase()==='true'||String(r.Enabled||'')==='1';
    return enabled&&String(r.BossID||'').trim();
  });
}

function worldBossProfileById_(bossId){
  const id=String(bossId||'').trim();
  const row=worldBossPoolRows_().find(r=>String(r.BossID||'').trim()===id);
  if(!row)return null;
  let params={};try{params=JSON.parse(String(row.SkillParams||'{}')||'{}')}catch(_e){}
  return {
    bossId:id,name:String(row.Name||id),icon:String(row.Icon||''),
    weight:Math.max(0,Number(row.Weight)||0),skillKey:String(row.SkillKey||'').trim(),
    skillParams:params,skillDescription:String(row.SkillDescription||''),
    rewardGemId:String(row.RewardGemID||'').trim()
  };
}

function pickNextWorldBossProfile_(previousBossId){
  const rows=worldBossPoolRows_();
  if(!rows.length){
    const cfg=worldBossConfig_();
    return {bossId:cfg.bossId,name:cfg.name,icon:'',weight:1,skillKey:'berserk_giant',skillParams:{},skillDescription:'',rewardGemId:cfg.chestGemId};
  }
  let candidates=rows;
  if(rows.length>1)candidates=rows.filter(r=>String(r.BossID||'').trim()!==String(previousBossId||'').trim());
  const weighted=candidates.map(r=>({r,w:Math.max(0,Number(r.Weight)||0)}));
  let total=weighted.reduce((n,x)=>n+x.w,0);
  let chosen;
  if(total<=0)chosen=weighted[Math.floor(Math.random()*weighted.length)].r;
  else{
    let roll=Math.random()*total;
    chosen=weighted[weighted.length-1].r;
    for(const x of weighted){roll-=x.w;if(roll<=0){chosen=x.r;break;}}
  }
  return worldBossProfileById_(chosen.BossID);
}

function worldBossGemConfig_(gemId) {
  const id=String(gemId||'').trim();
  const row=readObjects_('Gems').find(r=>String(r.GemID||'').trim()===id);
  if(!row)return {gemId:id,name:id||'BOSS寶石',price:0,hp:0,def:0,patk:0,matk:0,crit:0,critDamage:0,bossOnly:true,visualColor:'',effect:''};
  return {
    gemId:id,
    name:String(row.Name||id),price:Math.max(0,Number(row.Price)||0),
    hp:Number(row.HP)||0,def:Number(row.DEF)||0,patk:Number(row.PATK)||0,matk:Number(row.MATK)||0,crit:Number(row.Crit)||0,critDamage:Number(row.CritDamage)||0,
    bossOnly:row.BossOnly===true||String(row.BossOnly).toLowerCase()==='true',
    visualColor:String(row.VisualColor||''),effect:String(row.EffectKey||row.Effect||'').trim()
  };
}

function normalizeWbDateKey_(value){
  if(value instanceof Date && !isNaN(value.getTime())){
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s=String(value||'').trim();
  const m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  return s;
}

function wbDateKey_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Taipei','yyyy-MM-dd');}

function wbNewId_(prefix){return prefix+'_'+Date.now()+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,12);}

const WORLD_BOSS_REWARD_TTL_MS_ = 72 * 60 * 60 * 1000;

function wbBossExpiryAt_(bossInstanceId){
  const boss=findRowByValue_(DB.WORLD_BOSS_STATE,'BossInstanceID',bossInstanceId);
  if(!boss)return '';
  const deadAt=new Date(String(boss.DeadAt||''));
  if(isNaN(deadAt.getTime()))return '';
  return new Date(deadAt.getTime()+WORLD_BOSS_REWARD_TTL_MS_).toISOString();
}

function wbRewardExpiryInfo_(reward,nowMs){
  const expiresAt=wbBossExpiryAt_(reward&&reward.BossInstanceID);
  const expiryMs=expiresAt?new Date(expiresAt).getTime():NaN;
  return {expiresAt:expiresAt,expired:Number.isFinite(expiryMs)&&Number(nowMs||Date.now())>=expiryMs};
}

function wbSbDeleteByBoss_(table,bossInstanceId){
  const cfg=supabaseConfig_(),url=cfg.url+'/rest/v1/'+table+'?boss_instance_id=eq.'+encodeURIComponent(String(bossInstanceId));
  const res=UrlFetchApp.fetch(url,{method:'delete',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,Prefer:'return=minimal'},muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_WB_DELETE_'+table+'_HTTP_'+status+': '+text);
}

function wbDeleteSheetRowsByValue_(sheetName,header,value){
  const sh=ss_().getSheetByName(sheetName);if(!sh||sh.getLastRow()<2)return 0;
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),idx=headers.indexOf(header);if(idx<0)return 0;
  const vals=sh.getRange(2,idx+1,sh.getLastRow()-1,1).getValues();let deleted=0;
  for(let i=vals.length-1;i>=0;i--){if(String(vals[i][0])===String(value)){sh.deleteRow(i+2);deleted++;}}
  return deleted;
}

function cleanupExpiredWorldBossData(){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const now=Date.now(),states=readObjects_(DB.WORLD_BOSS_STATE),rewards=readObjects_(DB.WORLD_BOSS_REWARDS);
    let cleanedBosses=0,skippedProcessing=0,attemptRows=0,rewardRows=0,stateRows=0;
    states.filter(b=>String(b.Status||'').toUpperCase()==='DEAD').forEach(b=>{
      const deadMs=new Date(String(b.DeadAt||'')).getTime();if(!Number.isFinite(deadMs)||now<deadMs+WORLD_BOSS_REWARD_TTL_MS_)return;
      const bossId=String(b.BossInstanceID||'');if(!bossId)return;
      const bossRewards=rewards.filter(r=>String(r.BossInstanceID)===bossId);
      // PROCESSING 可能已鎖定獎勵或已寫入 PlayerSave；為避免交易中斷，整隻 BOSS 暫不清除。
      if(bossRewards.some(r=>String(r.Status||'').toUpperCase()==='PROCESSING')){skippedProcessing++;return;}
      bossRewards.filter(r=>String(r.Status||'').toUpperCase()==='PENDING').forEach(r=>{
        updateRowObject_(DB.WORLD_BOSS_REWARDS,r.__row,{Status:'EXPIRED'});
      });
      wbSbDeleteByBoss_('WorldBossAttempts',bossId);wbSbDeleteByBoss_('WorldBossRewards',bossId);
      attemptRows+=wbDeleteSheetRowsByValue_(DB.WORLD_BOSS_ATTEMPTS,'BossInstanceID',bossId);
      rewardRows+=wbDeleteSheetRowsByValue_(DB.WORLD_BOSS_REWARDS,'BossInstanceID',bossId);
      wbStateSbDeleteById_(bossId);
      // v11.31.62: do not mutate WorldBossState_SCHEMA here; Daily Snapshot owns that backup sheet.
      invalidateWorldBossRankingCache_(bossId);cleanedBosses++;
    });
    const out={ok:true,cleanedBosses,skippedProcessing,attemptRows,rewardRows,stateRows,serverNow:new Date().toISOString()};
    console.log('===== World Boss 72h Cleanup =====');console.log(JSON.stringify(out,null,2));return out;
  }finally{lock.releaseLock();}
}

function installWorldBossCleanupTrigger(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='cleanupExpiredWorldBossData').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cleanupExpiredWorldBossData').timeBased().everyHours(1).create();
  return {ok:true,message:'World Boss cleanup trigger installed: hourly'};
}

function ensureWorldBossInstance_(){
  const cfg=worldBossConfig_(),rows=readObjects_(DB.WORLD_BOSS_STATE),now=new Date();
  const timeMs_=v=>{const n=new Date(String(v||'')).getTime();return Number.isFinite(n)?n:0;};
  // Supabase REST 未指定排序時回傳順序不保證固定。
  // 永遠優先沿用「最新 SpawnedAt 的 ALIVE instance」，避免每次進頁重新抽 Boss。
  const alive=rows.filter(r=>String(r.Status||'').toUpperCase()==='ALIVE'&&Number(r.CurrentHP||0)>0)
    .sort((a,b)=>timeMs_(b.SpawnedAt)-timeMs_(a.SpawnedAt)||String(b.BossInstanceID||'').localeCompare(String(a.BossInstanceID||'')));
  if(alive.length)return alive[0];

  const dead=rows.filter(r=>String(r.Status||'').toUpperCase()==='DEAD'||Number(r.CurrentHP||0)<=0)
    .sort((a,b)=>timeMs_(b.DeadAt||b.SpawnedAt)-timeMs_(a.DeadAt||a.SpawnedAt)||String(b.BossInstanceID||'').localeCompare(String(a.BossInstanceID||'')));
  const previous=dead[0]||null;
  if(previous){
    const respawnAt=new Date(String(previous.RespawnAt||previous.DeadAt||0));
    if(Number.isFinite(respawnAt.getTime())&&respawnAt.getTime()>now.getTime())return previous;
  }

  const previousBossId=String(previous?.BossID||'');
  const profile=pickNextWorldBossProfile_(previousBossId),id=wbNewId_('wb');
  appendObject_(DB.WORLD_BOSS_STATE,{
    BossInstanceID:id,BossID:profile.bossId,Name:profile.name,MaxHP:cfg.maxHp,CurrentHP:cfg.maxHp,
    DEF:cfg.def,PATK:cfg.patk,MATK:cfg.matk,SpawnedAt:now.toISOString(),DeadAt:'',
    RespawnAt:'',Status:'ALIVE',Revision:1
  });
  return findRowByValue_(DB.WORLD_BOSS_STATE,'BossInstanceID',id);
}

function wbRanking_(bossInstanceId, accountId){
  const key='rank:wb:'+String(bossInstanceId||'');
  let all=rankingCacheGetJson_(key);
  if(!Array.isArray(all)){
    const map={};
    readObjects_(DB.WORLD_BOSS_ATTEMPTS)
      .filter(r=>String(r.BossInstanceID)===String(bossInstanceId)&&String(r.Status)==='DONE')
      .forEach(r=>{
        const id=String(r.AccountID),d=Math.max(0,Math.trunc(Number(r.Damage)||0));
        if(!map[id])map[id]={accountId:id,nickname:String(r.Nickname||'冒險者'),damage:0,lastAt:String(r.SubmittedAt||'')};
        map[id].damage+=d;
        if(String(r.SubmittedAt||'')<map[id].lastAt||!map[id].lastAt)map[id].lastAt=String(r.SubmittedAt||'');
      });
    all=Object.values(map).sort((a,b)=>b.damage-a.damage||String(a.lastAt).localeCompare(String(b.lastAt)));
    all.forEach((x,i)=>x.rank=i+1);
    rankingCachePutJson_(key,all);
  }
  const mine=all.find(x=>String(x.accountId)===String(accountId))||null;
  return {top10:all.slice(0,10),mine,totalPlayers:all.length};
}

function getWorldBossStatus_(body){
  // v11.31.72: 進入頁面只取必要 Runtime：目前 Boss、剩餘挑戰次數、待領寶箱。
  // 排行榜不在這裡讀，只有玩家手動按更新排行才讀。
  const auth=requireAuth_(body.sessionToken);
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const boss=ensureWorldBossInstance_(),cfg=worldBossConfig_(),dateKey=wbDateKey_();
    // DEAD 狀態查詢時自動補結算；失敗不阻斷頁面狀態查詢。
    if(String(boss.Status||'').toUpperCase()==='DEAD'||Number(boss.CurrentHP||0)<=0){
      try{distributeWorldBossRewards_(String(boss.BossInstanceID||''));}
      catch(recoveryErr){console.error('WORLD_BOSS_REWARD_RECOVERY_FAILED: '+String(recoveryErr&&recoveryErr.message||recoveryErr));}
    }
    const attempts=readObjects_(DB.WORLD_BOSS_ATTEMPTS).filter(r=>String(r.AccountID).trim()===String(auth.accountId).trim()&&normalizeWbDateKey_(r.DateKey)===normalizeWbDateKey_(dateKey)&&String(r.Status).toUpperCase()==='DONE').length;
    return {ok:true,boss:{
      instanceId:String(boss.BossInstanceID),bossId:String(boss.BossID||cfg.bossId),name:String(boss.Name||cfg.name),currentHp:Math.max(0,Number(boss.CurrentHP)||0),
      status:String(boss.Status||'ALIVE'),spawnedAt:String(boss.SpawnedAt||''),deadAt:String(boss.DeadAt||''),respawnAt:String(boss.RespawnAt||'')
    },attemptsUsed:attempts,attemptsMax:cfg.attempts,attemptsLeft:Math.max(0,cfg.attempts-attempts),
      serverNow:new Date().toISOString()
    };
  }finally{lock.releaseLock();}
}

function wbSbFetchRecentRewardsForAccount_(accountId,bossInstanceId){
  // v11.31.80 payload slimming:
  // Gold / Stones / GemAwarded and Reward* content fields are intentionally NOT selected.
  // Chest contents are determined by frontend planning data; backend only tracks entitlement/history/open state.

  const cfg=supabaseConfig_(),id=String(accountId||'').trim(),bossId=String(bossInstanceId||'').trim();
  if(!id)return [];
  let url=cfg.url+'/rest/v1/WorldBossRewards?select=reward_id,boss_instance_id,account_id,nickname,rank,chest_type,status,created_at,opened_at,reward_gold_min,reward_gold_max,reward_stones,reward_gem_rate,reward_gem_id,reward_gem_json&account_id=eq.'+encodeURIComponent(id);
  if(bossId)url+='&boss_instance_id=eq.'+encodeURIComponent(bossId);
  url+='&order=created_at.desc&limit=30';
  const res=UrlFetchApp.fetch(url,{method:'get',headers:wbSbHeaders_(),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_WB_REWARD_CHECK_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_WB_REWARD_CHECK_JSON_INVALID');}
  return Array.isArray(rows)?rows:[];
}

function checkWorldBossReward_(body){
  // v11.31.80：每隻 BOSS 一筆寶箱紀錄；PENDING / OPENED 都保留到 BOSS 死亡後 72 小時。
  const auth=requireAuth_(body.sessionToken),bossId=String(body.bossInstanceId||'').trim();
  const rows=wbSbFetchRecentRewardsForAccount_(auth.accountId,bossId),now=Date.now(),chests=[];
  const instances=readObjects_(DB.WORLD_BOSS_STATE);
  const pool=readObjects_('WorldBossPool');
  const legacyGemId=String(worldBossConfig_().chestGemId||'');
  rows.forEach(r=>{
    const reward=wbRewardSbToSheet_(r),ex=wbRewardExpiryInfo_(reward,now),st=String(reward.Status||'PENDING').toUpperCase();
    const origin=instances.find(x=>String(x.BossInstanceID||'')===String(reward.BossInstanceID||''));
    const originId=String(origin?.BossID||'');
    const originName=String(origin?.Name||'');
    const profile=pool.find(x=>String(x.BossID||'')===originId)||pool.find(x=>String(x.Name||'')===originName);
    const correctGemId=String(profile?.RewardGemID||(originId==='berserkGiant'||/狂暴巨人/.test(originName)?legacyGemId:'')||'');
    const storedGemId=String(reward.RewardGemID||'');
    const fixedGemId=correctGemId||storedGemId;
    const storedJson=wbJsonValue_(reward.RewardGemJSON);
    const gemJson=(fixedGemId&&fixedGemId!==storedGemId)||!storedJson?.name ? (fixedGemId?worldBossGemConfig_(fixedGemId):null) : storedJson;
    if(ex.expired||!['PENDING','OPENED'].includes(st))return;
    chests.push({
      rewardId:String(reward.RewardID||''),bossInstanceId:String(reward.BossInstanceID||''),
      rank:Number(reward.Rank)||0,chestType:String(reward.ChestType||'世界 BOSS 寶箱'),
      status:st,openedAt:String(reward.OpenedAt||''),expiresAt:ex.expiresAt,
      rewardGoldMin:Number(reward.RewardGoldMin)||0,rewardGoldMax:Number(reward.RewardGoldMax)||0,
      rewardStones:Number(reward.RewardStones)||0,rewardGemRate:Number(reward.RewardGemRate)||0,
      rewardGemId:fixedGemId,rewardGemJson:gemJson,bossName:originName||String(reward.ChestType||'').replace(/寶箱$/,'')
    });
  });
  return {ok:true,bossInstanceId:bossId,chests:chests,serverNow:new Date().toISOString()};
}

function markWorldBossChestOpened_(body){
  // 只記錄「已開啟」。寶箱內容、隨機結果、玩家實際拿到什麼全部由前端決定，後端不產生也不保存獎勵內容。
  const auth=requireAuth_(body.sessionToken),rewardId=String(body.rewardId||'').trim();
  if(!rewardId)return {ok:false,error:'WORLD_BOSS_REWARD_ID_REQUIRED'};
  const reward=findRowByValue_(DB.WORLD_BOSS_REWARDS,'RewardID',rewardId);
  if(!reward||String(reward.AccountID||'').trim()!==String(auth.accountId).trim())return {ok:false,error:'WORLD_BOSS_REWARD_NOT_FOUND'};
  const st=String(reward.Status||'PENDING').toUpperCase(),ex=wbRewardExpiryInfo_(reward,Date.now());
  if(ex.expired)return {ok:false,error:'WORLD_BOSS_REWARD_EXPIRED',message:'此世界 BOSS 寶箱紀錄已超過 72 小時。',expiresAt:ex.expiresAt};
  if(st==='OPENED')return {ok:true,alreadyOpened:true,openedAt:String(reward.OpenedAt||''),expiresAt:ex.expiresAt};
  if(st!=='PENDING')return {ok:false,error:'WORLD_BOSS_REWARD_INVALID_STATUS',status:st};
  const openedAt=new Date().toISOString();
  updateRowObject_(DB.WORLD_BOSS_REWARDS,reward.__row,{Status:'OPENED',OpenedAt:openedAt,Gold:'',Stones:'',GemAwarded:''});
  return {ok:true,openedAt,expiresAt:ex.expiresAt};
}

function getWorldBossRanking_(body){
  // 排行獨立端點：只在玩家手動更新時呼叫。
  const auth=requireAuth_(body.sessionToken),bossId=String(body.bossInstanceId||'').trim();
  if(!bossId)return {ok:false,error:'WORLD_BOSS_INSTANCE_REQUIRED'};
  const boss=findRowByValue_(DB.WORLD_BOSS_STATE,'BossInstanceID',bossId);
  if(!boss)return {ok:false,error:'WORLD_BOSS_NOT_FOUND'};
  return {ok:true,bossInstanceId:bossId,ranking:wbRanking_(bossId,auth.accountId),serverNow:new Date().toISOString()};
}

function recoverWorldBossRewardsForInstance(bossInstanceId){
  let id=String(bossInstanceId||'').trim();
  if(!id){
    const dead=readObjects_(DB.WORLD_BOSS_STATE).filter(r=>String(r.Status||'').toUpperCase()==='DEAD'||Number(r.CurrentHP||0)<=0).sort((a,b)=>new Date(b.DeadAt||0)-new Date(a.DeadAt||0));
    if(!dead.length)return {ok:false,error:'NO_DEAD_WORLD_BOSS_FOUND'};
    id=String(dead[0].BossInstanceID||'').trim();
  }
  const out=distributeWorldBossRewards_(id);console.log(JSON.stringify(out,null,2));return out;
}

function startWorldBossChallenge_(body){
  // v11.31.72 legacy compatibility only. 新前端不再呼叫 worldboss/start。
  return {ok:false,error:'WORLD_BOSS_START_RETIRED',message:'此版本世界 BOSS 已改為前端直接開始，請更新遊戲版本。'};
}

function distributeWorldBossRewards_(bossInstanceId){
  // v11.31.91：可恢復、冪等補發；BossInstanceID + AccountID 去重。
  bossInstanceId=String(bossInstanceId||'').trim();
  if(!bossInstanceId)return {ok:false,error:'WORLD_BOSS_INSTANCE_REQUIRED',created:0,existing:0};
  const cfg=worldBossConfig_(),boss=findRowByValue_(DB.WORLD_BOSS_STATE,'BossInstanceID',bossInstanceId);
  if(!boss)return {ok:false,error:'WORLD_BOSS_NOT_FOUND',created:0,existing:0};
  if(String(boss.Status||'').toUpperCase()!=='DEAD'&&Number(boss.CurrentHP||0)>0)return {ok:true,skipped:true,reason:'WORLD_BOSS_NOT_DEAD',created:0,existing:0};
  invalidateWorldBossRankingCache_(bossInstanceId);
  const ranking=wbRanking_(bossInstanceId,'').top10.slice(0,Math.max(0,Number(cfg.topRewardCount)||0));
  const profile=worldBossProfileById_(String(boss.BossID||'')),rewardGemId=String(profile?.rewardGemId||cfg.chestGemId);
  const existing=readObjects_(DB.WORLD_BOSS_REWARDS),gemCfg=worldBossGemConfig_(rewardGemId);
  const gemSnapshot=JSON.stringify({gemId:rewardGemId,name:gemCfg.name,price:gemCfg.price,hp:gemCfg.hp,def:gemCfg.def,patk:gemCfg.patk,matk:gemCfg.matk,crit:gemCfg.crit,critDamage:gemCfg.critDamage,bossOnly:gemCfg.bossOnly,visualColor:gemCfg.visualColor,effect:gemCfg.effect});
  const chestName=String((boss&&boss.Name)||cfg.name||'世界BOSS')+'寶箱';
  let created=0,already=0;
  ranking.forEach((x,i)=>{
    const accountId=String(x.accountId||'').trim();if(!accountId)return;
    if(existing.some(r=>String(r.BossInstanceID)===bossInstanceId&&String(r.AccountID).trim()===accountId)){already++;return;}
    appendObject_(DB.WORLD_BOSS_REWARDS,{RewardID:wbNewId_('wbr'),BossInstanceID:bossInstanceId,AccountID:accountId,Nickname:x.nickname,Rank:i+1,ChestType:chestName,Status:'PENDING',CreatedAt:new Date().toISOString(),OpenedAt:'',Gold:'',Stones:'',GemAwarded:'',RewardGoldMin:cfg.chestGoldMin,RewardGoldMax:cfg.chestGoldMax,RewardStones:cfg.chestStone,RewardGemRate:cfg.chestGemRate,RewardGemID:rewardGemId,RewardGemJSON:gemSnapshot});
    created++;
  });
  return {ok:true,bossInstanceId:bossInstanceId,eligible:ranking.length,created:created,existing:already};
}

function submitWorldBossChallenge_(body){
  // v11.31.72: 不需要 STARTED challenge；戰鬥結束時一次驗證、建立 DONE Attempt、扣血並回傳最新狀態。
  const auth=requireAuth_(body.sessionToken),damage=Math.max(0,Math.trunc(Number(body.damage)||0));
  const requestedBossId=String(body.bossInstanceId||'').trim();
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const cfg=worldBossConfig_(),boss=ensureWorldBossInstance_(),dateKey=wbDateKey_();
    if(!requestedBossId||String(boss.BossInstanceID)!==requestedBossId)return {ok:false,error:'WORLD_BOSS_INSTANCE_CHANGED',message:'世界 BOSS 已更新，這次戰績無法套用到新的 BOSS。'};
    if(String(boss.Status)!=='ALIVE'||Number(boss.CurrentHP)<=0)return {ok:false,error:'WORLD_BOSS_DEAD',message:'世界 BOSS 已被其他玩家擊敗。'};
    const used=readObjects_(DB.WORLD_BOSS_ATTEMPTS).filter(r=>String(r.AccountID).trim()===String(auth.accountId).trim()&&normalizeWbDateKey_(r.DateKey)===normalizeWbDateKey_(dateKey)&&String(r.Status).toUpperCase()==='DONE').length;
    if(used>=cfg.attempts)return {ok:false,error:'WORLD_BOSS_NO_ATTEMPTS',message:'今日世界 BOSS 挑戰次數已用完。'};
    const actual=Math.min(damage,Math.max(0,Math.trunc(Number(boss.CurrentHP)||0)));
    const hp=Math.max(0,Math.trunc(Number(boss.CurrentHP)||0)-actual);
    const patch={CurrentHP:hp,Revision:(Number(boss.Revision)||1)+1};
    if(hp<=0){
      const deadAt=new Date(),respawn=new Date(deadAt.getTime()+cfg.respawnMinutes*60000);
      patch.Status='DEAD';patch.DeadAt=deadAt.toISOString();patch.RespawnAt=respawn.toISOString();
    }
    updateRowObject_(DB.WORLD_BOSS_STATE,boss.__row,patch);
    const acc=runtimeAccountById_(auth.accountId),now=new Date().toISOString(),challengeId=wbNewId_('wbc');
    appendObject_(DB.WORLD_BOSS_ATTEMPTS,{
      ChallengeID:challengeId,BossInstanceID:requestedBossId,AccountID:auth.accountId,Nickname:String(acc?.Nickname||'冒險者'),
      DateKey:dateKey,AttemptNo:used+1,StartedAt:now,SubmittedAt:now,Damage:actual,Status:'DONE'
    });
    invalidateWorldBossRankingCache_(requestedBossId);
    const latest=findRowByValue_(DB.WORLD_BOSS_STATE,'BossInstanceID',requestedBossId);
    let chestAwarded=false,chest=null;
    if(latest&&String(latest.Status)==='DEAD'){
      distributeWorldBossRewards_(requestedBossId);
      const reward=readObjects_(DB.WORLD_BOSS_REWARDS).find(r=>String(r.BossInstanceID||'').trim()===requestedBossId&&String(r.AccountID||'').trim()===String(auth.accountId).trim());
      if(reward){
        const ex=wbRewardExpiryInfo_(reward,Date.now());
        chestAwarded=true;
        chest={rewardId:String(reward.RewardID),rank:Number(reward.Rank)||0,chestType:String(reward.ChestType||'世界 BOSS 寶箱'),expiresAt:ex.expiresAt};
      }
    }
    return {ok:true,challengeId,acceptedDamage:actual,bossHp:latest?Number(latest.CurrentHP)||0:0,bossStatus:latest?String(latest.Status):'DEAD',
      respawnAt:latest?String(latest.RespawnAt||''):'',attemptNo:used+1,attemptsMax:cfg.attempts,attemptsLeft:Math.max(0,cfg.attempts-(used+1)),
      serverNow:new Date().toISOString(),chestAwarded,chest};
  }finally{lock.releaseLock();}
}



























































function serverReceiptBucket_(save, bucket) {
  save.serverReceipts=(save.serverReceipts&&typeof save.serverReceipts==='object'&&!Array.isArray(save.serverReceipts))?save.serverReceipts:{};
  const key=String(bucket||'general');save.serverReceipts[key]=Array.isArray(save.serverReceipts[key])?save.serverReceipts[key].map(String):[];return save.serverReceipts[key];
}

function hasServerReceipt_(save,bucket,key){return serverReceiptBucket_(save,bucket).includes(String(key));}

function addServerReceipt_(save,bucket,key){const a=serverReceiptBucket_(save,bucket),k=String(key);if(!a.includes(k))a.push(k);return k;}

function verifyReceiptAfterWrite_(accountId,bucket,key){const rec=findRowByValue_(DB.SAVES,'AccountID',accountId);if(!rec)throw new Error('SAVE_VERIFY_MISSING');const save=parseSaveRecord_(rec);if(!hasServerReceipt_(save,bucket,key))throw new Error('SAVE_RECEIPT_VERIFY_FAILED:'+bucket+':'+key);return {rec,save};}







function normalizeRedeemCode_(v){
  return String(v||'').trim().toUpperCase();
}

function redeemCodeRow_(code){
  const key=normalizeRedeemCode_(code);
  return readObjects_(DB.REDEEM_CODES).find(r=>normalizeRedeemCode_(r.Code)===key)||null;
}

function redeemRewardRows_(code){
  const key=normalizeRedeemCode_(code);
  return readObjects_(DB.REDEEM_REWARDS)
    .filter(r=>normalizeRedeemCode_(r.Code)===key)
    .sort((a,b)=>(Number(a.RewardOrder)||0)-(Number(b.RewardOrder)||0));
}

function redeemDateValid_(row){
  const now=Date.now();
  const start=String(row.StartAt||'').trim();
  const end=String(row.EndAt||'').trim();
  if(start){
    const t=new Date(start).getTime();
    if(Number.isFinite(t)&&now<t)return false;
  }
  if(end){
    const t=new Date(end).getTime();
    if(Number.isFinite(t)&&now>t)return false;
  }
  return true;
}

function gemRowById_(gemId){
  const id=String(gemId||'').trim();
  return readObjects_('Gems').find(r=>
    String(r.GemID||'').trim()===id &&
    (!('Enabled' in r)||toBool_(r.Enabled))
  )||null;
}

function makeGemInstanceFromRow_(row){
  if(!row)throw new Error('GEM_NOT_FOUND');
  const stats={};
  [['hp','HP'],['def','DEF'],['patk','PATK'],['matk','MATK'],['crit','Crit'],['critDamage','CritDamage']].forEach(([k,h])=>{
    const n=Number(row[h])||0;if(n!==0)stats[k]=n;
  });
  return {
    id:'GEM_'+Utilities.getUuid().replace(/-/g,''),
    template:String(row.GemID||''),
    name:String(row.Name||row.GemID||''),
    price:Number(row.Price)||0,
    stats:stats,
    boss:row.BossOnly===true||String(row.BossOnly).toLowerCase()==='true',
    effect:String(row.EffectKey||row.Effect||'').trim(),
    visualColor:String(row.VisualColor||'').trim()
  };
}

function redeemDisplayRarity_(row,fallback){
  return String(row.Rarity||fallback||'一般').trim()||'一般';
}

function applyRedeemReward_(save,row){
  const type=String(row.ContentType||'').trim().toUpperCase();
  const id=String(row.ContentID||'').trim();
  const qty=clampInt_(row.Quantity||1,1,999999);

  if(type==='EQUIPMENT'){
    const src=equipmentRowById_(id);
    if(!src)return {ok:false,error:'REDEEM_EQUIPMENT_NOT_FOUND:'+id};
    if(!Array.isArray(save.inventory))save.inventory=[];
    for(let i=0;i<qty;i++)save.inventory.push(makeEquipmentInstanceFromRow_(src));
    return {ok:true,type,id,quantity:qty,name:String(src.Name||id),rarity:redeemDisplayRarity_(row,src.Rarity)};
  }
  if(type==='GEM'){
    const src=gemRowById_(id);
    if(!src)return {ok:false,error:'REDEEM_GEM_NOT_FOUND:'+id};
    if(!Array.isArray(save.gems))save.gems=[];
    for(let i=0;i<qty;i++)save.gems.push(makeGemInstanceFromRow_(src));
    return {ok:true,type,id,quantity:qty,name:String(src.Name||id),rarity:redeemDisplayRarity_(row,'傳說')};
  }
  if(type==='GOLD'){
    save.gold=(Number(save.gold)||0)+qty;
    return {ok:true,type,id:'gold',quantity:qty,name:'金幣',rarity:redeemDisplayRarity_(row,'特殊')};
  }
  if(type==='STONE'){
    save.stones=(Number(save.stones||save.enhanceStones)||0)+qty;
    save.enhanceStones=save.stones;
    return {ok:true,type,id:'stone',quantity:qty,name:'強化石',rarity:redeemDisplayRarity_(row,'特殊')};
  }
  if(type==='CONSUMABLE'){
    if(!id)return {ok:false,error:'REDEEM_CONSUMABLE_ID_REQUIRED'};
    save.consumables=(save.consumables&&typeof save.consumables==='object')?save.consumables:{};
    save.consumables[id]=(Number(save.consumables[id])||0)+qty;
    const c=readObjects_('Consumables').find(r=>String(r.ContentID||r.ConsumableID||r.ItemID||'').trim()===id);
    return {ok:true,type,id,quantity:qty,name:String(c?.Name||id),rarity:redeemDisplayRarity_(row,c?.Rarity||'一般')};
  }
  if(type==='SKILL'){
    if(!id)return {ok:false,error:'REDEEM_SKILL_ID_REQUIRED'};
    const sk=readObjects_('Skills').find(r=>String(r.SkillID||'').trim()===id);
    if(!sk)return {ok:false,error:'REDEEM_SKILL_NOT_FOUND:'+id};
    save.skillsOwned=Array.isArray(save.skillsOwned)?save.skillsOwned:[];
    if(!save.skillsOwned.includes(id))save.skillsOwned.push(id);
    save.purchasedSkills=Array.isArray(save.purchasedSkills)?save.purchasedSkills:[];
    if(!save.purchasedSkills.includes(id))save.purchasedSkills.push(id);
    return {ok:true,type,id,quantity:1,name:String(sk.Name||id),rarity:redeemDisplayRarity_(row,'稀有')};
  }
  return {ok:false,error:'REDEEM_UNSUPPORTED_CONTENT_TYPE:'+type};
}

function redeemTargetPlayers120_(row){
 const canonical=row?.TargetPlayers,alias=row?.['指定玩家'];
 const supplied=v=>v!=null&&String(v).trim()!=='';
 const parse=v=>[...new Set((Array.isArray(v)?v:String(v??'').split(/[,，;；|\s]+/)).map(x=>String(x).trim()).filter(Boolean))];
 if(supplied(canonical)&&supplied(alias)){
  const a=parse(canonical).sort(),b=parse(alias).sort();
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error('REDEEM_TARGET_PLAYERS_CONFLICT');
 }
 const raw=supplied(canonical)?canonical:alias;
 if(!supplied(raw))return null;
 const ids=parse(raw);
 if(!ids.length||ids.some(id=>!/^(?:(?:id|user):)?[A-Za-z0-9_.@-]{1,128}$/i.test(id)))throw Error('REDEEM_TARGET_PLAYERS_INVALID');
 return ids;
}

function redeemPlayerAllowed120_(row,accountId,account=null){
 const targets=redeemTargetPlayers120_(row);if(targets===null)return true;
 const id=String(accountId||'').trim();
 if(account&&String(account.AccountID||'').trim()!==id)return false;
 const username=String(account?.UsernameNormalized||'').trim().toLowerCase();
 return targets.some(target=>{
  if(/^id:/i.test(target))return target.slice(3)===id;
  if(/^user:/i.test(target))return !!username&&target.slice(5).toLowerCase()===username;
  if(target===id)return true;
  // UUID and historical account-ID prefixes cannot be impersonated by choosing a matching username.
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target)||/^(ACC_|USR_|U_)/i.test(target))return false;
  return !!username&&target.toLowerCase()===username;
 });
}

function claimRedeemCode_(body){
  const auth=requireAuth_(body.sessionToken),code=normalizeRedeemCode_(body.code);
  if(!code)return {ok:false,error:'INVALID_REDEEM_CODE',message:'無效的序號'};
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    ensureSheet_(DB.REDEEM_CODES,['Code','Title','Enabled','StartAt','EndAt','TargetPlayers']);
    ensureSheet_(DB.REDEEM_REWARDS,['Code','RewardOrder','ContentType','ContentID','Quantity','Rarity']);
    ensureSheet_(DB.REDEEM_CLAIMS,['ClaimID','Code','AccountID','Nickname','ClaimedAt','ResultJSON']);
    const codeRow=redeemCodeRow_(code);if(!codeRow||!toBool_(codeRow.Enabled)||!redeemDateValid_(codeRow))return {ok:false,error:'INVALID_REDEEM_CODE',message:'無效的序號'};
    const targetAccount121=runtimeAccountById_(auth.accountId);
    if(!redeemPlayerAllowed120_(codeRow,auth.accountId,targetAccount121))return {ok:false,error:'REDEEM_PLAYER_NOT_ALLOWED',message:'此序號僅限指定玩家領取'};
    const claimKey=auth.accountId+'|'+code;
    // v11.31.52: Supabase is authoritative for Redeem Claims duplicate detection.
    const oldClaim=redeemClaimsSbFindByAccountCode_(auth.accountId,code);
    const saveRec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId),acc=targetAccount121;
    if(!saveRec)return {ok:false,error:'SAVE_NOT_FOUND',message:'找不到玩家存檔'};requireTransactionSaveRevision_(body,saveRec);
    let save=parseSaveRecord_(saveRec);
    if(oldClaim||hasServerReceipt_(save,'redeem',claimKey)){
      // Receipt is the final anti-duplicate guard. If the save was committed but the claim row was not,
      // repair Supabase Primary first, then best-effort mirror the same row to Sheet.
      if(!oldClaim){
        const repairedClaim={ClaimID:'RCL_'+Utilities.getUuid().replace(/-/g,''),Code:code,AccountID:auth.accountId,Nickname:String(acc?.Nickname||save.nickname||''),ClaimedAt:new Date().toISOString(),ResultJSON:'[]'};
        redeemClaimsSbInsertPrimary_(redeemClaimSheetToSb_(repairedClaim));
        // v11.31.53: Runtime Sheet mirror disabled. Daily Snapshot will back up Supabase Claims.
      }
      return {ok:false,error:'REDEEM_ALREADY_CLAIMED',message:'此帳號已領取過'};
    }
    const rewards=redeemRewardRows_(code);if(!rewards.length)return {ok:false,error:'INVALID_REDEEM_CODE',message:'無效的序號'};
    const granted=[];for(const row of rewards){const result=applyRedeemReward_(save,row);if(!result.ok)return {ok:false,error:result.error,message:'序號內容設定錯誤'};granted.push(result);}
    addServerReceipt_(save,'redeem',claimKey);
    const revision=(Number(saveRec.Revision)||1)+1;writeFullSave_(auth.accountId,revision,save);
    verifyReceiptAfterWrite_(auth.accountId,'redeem',claimKey);
    const claimRow={ClaimID:'RCL_'+Utilities.getUuid().replace(/-/g,''),Code:code,AccountID:auth.accountId,Nickname:String(acc?.Nickname||save.nickname||''),ClaimedAt:new Date().toISOString(),ResultJSON:JSON.stringify(granted)};
    // Supabase is Primary. If this write fails, throw; the PlayerSave Receipt guarantees retry will repair
    // the missing Primary claim without granting the reward twice.
    redeemClaimsSbInsertPrimary_(redeemClaimSheetToSb_(claimRow));
    // v11.31.53: Google Sheet runtime mirror disabled. Daily Snapshot handles backup.
    return {ok:true,title:String(codeRow.Title||'序號獎勵'),rewards:granted,revision,save};
  }finally{lock.releaseLock();}
}

function achievementRowById_(id){
  id=String(id||'').trim();
  const rows=readPublicObjectsCached_('Achievements',cachedDataVersion_());
  return rows.find(r=>String(r.AchievementID||'').trim()===id && (!('Enabled' in r)||toBool_(r.Enabled)))||null;
}

function titleRowById_(id){
  id=String(id||'').trim();
  const rows=readPublicObjectsCached_('Titles',cachedDataVersion_());
  return rows.find(r=>String(r.TitleID||'').trim()===id && (!('Enabled' in r)||toBool_(r.Enabled)))||null;
}

function achievementProgressServer_(save,row){
  const type=String(row.ConditionType||'').trim().toLowerCase();
  const target=String(row.TargetID||'').trim();
  if(type==='enemy_kill')return Math.max(0,Math.trunc(Number(save?.enemyDefeatCounts?.[target])||0));
  if(type==='level')return Math.max(1,Math.trunc(Number(save?.level)||1));
  if(type==='max_clear')return Math.max(0,Math.trunc(Number(save?.maxCleared||save?.bestClear)||0));
  return 0;
}

function applyAchievementReward_(save,row){
  const type=String(row.RewardType||'').trim().toUpperCase();
  const id=String(row.RewardID||'').trim();
  const qty=clampInt_(row.RewardAmount||1,1,999999);
  if(type==='TITLE'){
    const t=titleRowById_(id);if(!t)return {ok:false,error:'TITLE_NOT_FOUND'};
    save.ownedTitles=Array.isArray(save.ownedTitles)?save.ownedTitles.map(String):[];
    if(!save.ownedTitles.includes('beginner'))save.ownedTitles.unshift('beginner');
    if(!save.ownedTitles.includes(id))save.ownedTitles.push(id);
    if(!save.equippedTitle)save.equippedTitle='beginner';
    return {ok:true,type,id,quantity:1,name:String(t.Name||id)};
  }
  // 共用序號獎勵的成熟發獎邏輯。
  return applyRedeemReward_(save,{ContentType:type,ContentID:id,Quantity:qty});
}

function claimAchievement_(body){
  const auth=requireAuth_(body.sessionToken);
  const id=String(body.achievementId||'').trim();
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const rec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);
    if(!rec)return {ok:false,error:'SAVE_NOT_FOUND'};requireTransactionSaveRevision_(body,rec);
    const currentRevision=Number(rec.Revision)||1;
    const row=achievementRowById_(id);
    if(!row)return {ok:false,error:'ACHIEVEMENT_NOT_FOUND'};
    const save=parseSaveRecord_(rec)||{};
    save.ownedTitles=Array.isArray(save.ownedTitles)?save.ownedTitles.map(String):[];
    if(!save.ownedTitles.includes('beginner'))save.ownedTitles.unshift('beginner');
    if(!save.equippedTitle)save.equippedTitle='beginner';
    save.claimedAchievements=(save.claimedAchievements&&typeof save.claimedAchievements==='object')?save.claimedAchievements:{};
    if(save.claimedAchievements[id])return {ok:false,error:'ACHIEVEMENT_ALREADY_CLAIMED'};
    const need=Math.max(1,Math.trunc(Number(row.TargetValue)||1));
    const progress=achievementProgressServer_(save,row);
    if(progress<need)return {ok:false,error:'ACHIEVEMENT_NOT_COMPLETE',progress:progress,target:need};
    const reward=applyAchievementReward_(save,row);
    if(!reward.ok)return {ok:false,error:reward.error||'ACHIEVEMENT_REWARD_ERROR'};
    save.claimedAchievements[id]=true;
    const revision=currentRevision+1;
    writeFullSave_(auth.accountId,revision,save);
    return {ok:true,achievementId:id,reward:reward,revision:revision,save:save};
  }finally{lock.releaseLock();}
}

function canonicalStatsFromRow_(row){
  const stats={};
  [['hp','HP'],['def','DEF'],['patk','PATK'],['matk','MATK'],['crit','Crit']].forEach(([k,h])=>{
    const n=Number(row&&row[h])||0;if(n!==0)stats[k]=n;
  });
  return stats;
}

function sanitizeAuctionItemForListing_(item,itemType){
  if(!item||typeof item!=='object')throw new Error('AUCTION_ITEM_INVALID');
  const type=String(itemType||'').toLowerCase();
  const instanceId=String(item.id||item.instanceId||'').trim();
  if(!instanceId)throw new Error('AUCTION_ITEM_INSTANCE_ID_MISSING');

  if(type==='gem'){
    const template=String(item.template||item.templateId||'').trim();
    const row=gemRowById_(template);
    if(!row)throw new Error('AUCTION_GEM_TEMPLATE_NOT_FOUND:'+template);
    return {
      id:instanceId,
      template:String(row.GemID||template),
      name:String(row.Name||row.GemID||template),
      price:Number(row.Price)||0,
      stats:canonicalStatsFromRow_(row),
      boss:row.BossOnly===true||String(row.BossOnly).toLowerCase()==='true',
      effect:String(row.EffectKey||row.Effect||'').trim(),
      visualColor:String(row.VisualColor||'').trim()
    };
  }

  const template=String(item.template||item.templateId||'').trim();
  const row=equipmentRowById_(template);
  if(!row)throw new Error('AUCTION_EQUIPMENT_TEMPLATE_NOT_FOUND:'+template);
  const canonicalSlot=String(row.Slot||'special').toLowerCase();
  if(canonicalSlot!==type)throw new Error('AUCTION_ITEM_SLOT_MISMATCH:'+type+'!='+canonicalSlot);

  const sockets=Math.max(0,Math.trunc(Number(item.sockets)||0));
  if(sockets>2)throw new Error('AUCTION_ITEM_INVALID_SOCKETS:'+sockets);
  const enhance=Math.max(0,Math.trunc(Number(item.enhance)||0));
  if(enhance>99)throw new Error('AUCTION_ITEM_INVALID_ENHANCE:'+enhance);
  const gems=Array.isArray(item.gems)?item.gems.slice(0,sockets):[];
  while(gems.length<sockets)gems.push(null);

  const clean={
    id:instanceId,
    template:String(row.ItemID||template),
    name:String(row.Name||row.ItemID||template),
    rarity:String(row.Rarity||'一般'),
    slot:canonicalSlot,
    price:Number(row.BasePrice)||0,
    stats:canonicalStatsFromRow_(row),
    sockets:sockets,
    enhance:enhance,
    gems:gems
  };
  const effect=String(row.EffectKey||'').trim();if(effect)clean.effect=effect;
  const iconSymbol=String(row.IconSymbol||'').trim();if(iconSymbol)clean.iconSymbol=iconSymbol;
  return clean;
}

function auctionSbToSheetRow_(r) {
  return {
    ListingID:String(r.listing_id||''),SellerAccountID:String(r.seller_account_id||''),SellerNickname:String(r.seller_nickname||''),
    ItemType:String(r.item_type||''),ItemTemplateID:String(r.item_template_id||''),ItemInstanceJSON:JSON.stringify(r.item_instance_json||{}),
    AskGold:Number(r.ask_gold)||0,FeeRate:Number(r.fee_rate)||0,Status:String(r.status||''),CreatedAt:String(r.created_at||''),
    BuyerAccountID:String(r.buyer_account_id||''),SoldAt:String(r.sold_at||''),FeeGold:r.fee_gold==null?'':Number(r.fee_gold),
    SellerNetGold:r.seller_net_gold==null?'':Number(r.seller_net_gold),PayoutMode:String(r.payout_mode||''),
    ClaimStatus:String(r.claim_status||''),ClaimedAt:String(r.claimed_at||''),Revision:Number(r.revision)||1
  };
}

function auctionPrimaryGetById_(listingId) {
  const rows=auctionSbRequest_('get','?listing_id=eq.'+encodeURIComponent(String(listingId||''))+'&select=*&limit=1',null,null);
  return Array.isArray(rows)&&rows.length?rows[0]:null;
}

function auctionPrimaryGetByInstance_(instanceId) {
  const q='?item_instance_id=eq.'+encodeURIComponent(String(instanceId||''))+
    '&status=in.(creating,active,buying,cancelling)&select=*&order=created_at.asc';
  const rows=auctionSbRequest_('get',q,null,null);
  return Array.isArray(rows)?rows:[];
}

function auctionPrimaryPatch_(listingId, patch) {
  patch=Object.assign({},patch||{},{updated_at:new Date().toISOString()});
  const rows=auctionSbRequest_('patch','?listing_id=eq.'+encodeURIComponent(String(listingId||'')),patch,'return=representation');
  if(!Array.isArray(rows)||!rows.length)throw new Error('AUCTION_PRIMARY_PATCH_NOT_FOUND:'+listingId);
  return rows[0];
}

function auctionPrimaryInsert_(payload) {
  const rows=auctionSbRequest_('post','',Object.assign({},payload,{updated_at:new Date().toISOString()}),'return=representation');
  if(!Array.isArray(rows)||!rows.length)throw new Error('AUCTION_PRIMARY_INSERT_FAILED');
  return rows[0];
}

function auctionBackupSyncSbRowSafe_(sbRow,reason) {
  // v11.31.68: Auction_SCHEMA is SNAPSHOT_BACKUP_ONLY.
  return {ok:true,skipped:true,snapshotOnly:true,reason:String(reason||'')};
}

function auctionPrimaryClaimStatus_(r) {
  const explicit=String(r.claim_status||'').trim().toLowerCase();
  if(explicit==='pending'||explicit==='claimed')return explicit;
  if(String(r.payout_mode||'').trim()==='manual_claim_v1'&&!String(r.claimed_at||'').trim())return 'pending';
  return 'legacy';
}

function createAuction_(body) {
  const auth=requireAuth_(body.sessionToken),askGold=clampInt_(body.askGold,1,999999999),item=body.item;
  if(!item||!item.instanceId||!item.type)return {ok:false,error:'INVALID_ITEM'};
  if(!['weapon','head','armor','ring','special','gem'].includes(String(item.type)))return {ok:false,error:'ITEM_NOT_TRADABLE'};
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const saveRec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId),acc=runtimeAccountById_(auth.accountId);
    if(!saveRec||!acc)return {ok:false,error:'ACCOUNT_DATA_MISSING'};
    let save=parseSaveRecord_(saveRec),instanceId=String(item.instanceId);
    const existing=auctionPrimaryGetByInstance_(instanceId);
    const mine=existing.find(r=>String(r.seller_account_id)===auth.accountId);
    if(existing.length&&!mine)return {ok:false,error:'ITEM_ALREADY_LISTED'};
    if(mine){
      const listingId=String(mine.listing_id),receipt='create:'+listingId;
      if(String(mine.status)==='creating'&&!hasServerReceipt_(save,'auction',receipt)){
        requireTransactionSaveRevision_(body,saveRec);
        const removed=removeTradableItemFromSave_(save,instanceId,String(mine.item_type));
        if(!removed)return {ok:false,error:'AUCTION_CREATE_RECOVERY_FAILED'};
        addServerReceipt_(save,'auction',receipt);
        const rev=(Number(saveRec.Revision)||1)+1;writeFullSave_(auth.accountId,rev,save);verifyReceiptAfterWrite_(auth.accountId,'auction',receipt);
      }
      const active=String(mine.status)==='active'?mine:auctionPrimaryPatch_(listingId,{status:'active',revision:(Number(mine.revision)||1)+1});
      auctionBackupSyncSbRowSafe_(active,'create-idempotent');
      const latest=findRowByValue_(DB.SAVES,'AccountID',auth.accountId),latestSave=parseSaveRecord_(latest);
      clearAuctionListCache_();
      return {ok:true,alreadyListed:true,listingId,revision:Number(latest.Revision)||1,save:latestSave,item:active.item_instance_json||{},askGold:Number(active.ask_gold)||0};
    }
    requireTransactionSaveRevision_(body,saveRec);
    const removed=removeTradableItemFromSave_(save,instanceId,item.type);if(!removed)return {ok:false,error:'ITEM_NOT_OWNED'};
    const verifiedItem=sanitizeAuctionItemForListing_(removed,item.type),listingId='LIST_'+Utilities.getUuid().replace(/-/g,''),receipt='create:'+listingId,now=new Date().toISOString();
    let sb=auctionPrimaryInsert_({listing_id:listingId,seller_account_id:auth.accountId,seller_nickname:String(acc.Nickname||save.nickname||''),
      item_type:String(item.type),item_template_id:String(verifiedItem.template||''),item_instance_id:instanceId,item_instance_json:verifiedItem,
      ask_gold:askGold,fee_rate:AUCTION_FEE_RATE,status:'creating',created_at:now,buyer_account_id:null,sold_at:null,fee_gold:null,
      seller_net_gold:null,payout_mode:null,claim_status:null,claimed_at:null,revision:1});
    addServerReceipt_(save,'auction',receipt);
    const rev=(Number(saveRec.Revision)||1)+1;writeFullSave_(auth.accountId,rev,save);verifyReceiptAfterWrite_(auth.accountId,'auction',receipt);
    sb=auctionPrimaryPatch_(listingId,{status:'active',revision:(Number(sb.revision)||1)+1});
    auctionBackupSyncSbRowSafe_(sb,'create');clearAuctionListCache_();
    const latest=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);save=parseSaveRecord_(latest);
    return {ok:true,listingId,revision:Number(latest.Revision)||1,save,item:verifiedItem,askGold};
  }finally{lock.releaseLock()}
}

function cancelAuction_(body) {
  const auth=requireAuth_(body.sessionToken),listingId=String(body.listingId||''),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    let listing=auctionPrimaryGetById_(listingId);if(!listing)return {ok:false,error:'LISTING_NOT_FOUND'};
    if(String(listing.seller_account_id)!==auth.accountId)return {ok:false,error:'NOT_SELLER'};
    const saveRec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);if(!saveRec)return {ok:false,error:'SAVE_NOT_FOUND'};
    let save=parseSaveRecord_(saveRec),receipt='cancel:'+listingId,item=listing.item_instance_json||{};
    if(String(listing.status)==='cancelled'&&hasServerReceipt_(save,'auction',receipt))
      return {ok:true,alreadyCompleted:true,item,revision:Number(saveRec.Revision)||1,save};
    if(!['active','cancelling'].includes(String(listing.status)))return {ok:false,error:'LISTING_NOT_ACTIVE'};
    requireTransactionSaveRevision_(body,saveRec);
    if(String(listing.status)==='active')listing=auctionPrimaryPatch_(listingId,{status:'cancelling',revision:(Number(listing.revision)||1)+1});
    if(!hasServerReceipt_(save,'auction',receipt)){
      returnTradableItemToSave_(save,item,String(listing.item_type));addServerReceipt_(save,'auction',receipt);
      const rev=(Number(saveRec.Revision)||1)+1;writeFullSave_(auth.accountId,rev,save);verifyReceiptAfterWrite_(auth.accountId,'auction',receipt);
    }
    listing=auctionPrimaryPatch_(listingId,{status:'cancelled',revision:(Number(listing.revision)||1)+1});
    auctionBackupSyncSbRowSafe_(listing,'cancel');clearAuctionListCache_();
    const latest=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);save=parseSaveRecord_(latest);
    return {ok:true,item,revision:Number(latest.Revision)||1,save};
  }finally{lock.releaseLock()}
}

function ensureAuctionClaimSchema_() {
  ensureSheet_(DB.AUCTION, [
    'ListingID','SellerAccountID','SellerNickname','ItemType','ItemTemplateID',
    'ItemInstanceJSON','AskGold','FeeRate','Status','CreatedAt','BuyerAccountID',
    'SoldAt','FeeGold','SellerNetGold','PayoutMode','ClaimStatus','ClaimedAt','Revision'
  ]);
}

function buyAuction_(body) {
  const auth=requireAuth_(body.sessionToken),listingId=String(body.listingId||''),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    let listing=auctionPrimaryGetById_(listingId);if(!listing)return {ok:false,error:'LISTING_NOT_FOUND'};
    if(String(listing.seller_account_id)===auth.accountId)return {ok:false,error:'CANNOT_BUY_OWN_LISTING'};
    const saveRec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);if(!saveRec)return {ok:false,error:'SAVE_NOT_FOUND'};
    let save=parseSaveRecord_(saveRec),receipt='buy:'+listingId,price=Number(listing.ask_gold)||0,item=listing.item_instance_json||{},status=String(listing.status);
    if(status==='sold'&&String(listing.buyer_account_id)===auth.accountId&&hasServerReceipt_(save,'auction',receipt))
      return {ok:true,alreadyCompleted:true,revision:Number(saveRec.Revision)||1,save,price,fee:Number(listing.fee_gold)||0,sellerNet:Number(listing.seller_net_gold)||0,item,buyerGold:Number(save.gold)||0};
    if(status!=='active'&&!(status==='buying'&&String(listing.buyer_account_id)===auth.accountId))return {ok:false,error:'LISTING_NOT_ACTIVE'};
    requireTransactionSaveRevision_(body,saveRec);
    const fee=Math.floor(price*AUCTION_FEE_RATE),sellerNet=price-fee;
    if(status==='active'){
      if((Number(save.gold)||0)<price)return {ok:false,error:'INSUFFICIENT_GOLD'};
      listing=auctionPrimaryPatch_(listingId,{status:'buying',buyer_account_id:auth.accountId,fee_gold:fee,seller_net_gold:sellerNet,
        payout_mode:'manual_claim_v1',claim_status:'pending',revision:(Number(listing.revision)||1)+1});
    }
    if(!hasServerReceipt_(save,'auction',receipt)){
      if((Number(save.gold)||0)<price)return {ok:false,error:'INSUFFICIENT_GOLD'};
      save.gold=(Number(save.gold)||0)-price;returnTradableItemToSave_(save,item,String(listing.item_type));addServerReceipt_(save,'auction',receipt);
      const rev=(Number(saveRec.Revision)||1)+1;writeFullSave_(auth.accountId,rev,save);verifyReceiptAfterWrite_(auth.accountId,'auction',receipt);
    }
    listing=auctionPrimaryPatch_(listingId,{status:'sold',buyer_account_id:auth.accountId,sold_at:String(listing.sold_at||'')||new Date().toISOString(),
      fee_gold:fee,seller_net_gold:sellerNet,payout_mode:'manual_claim_v1',claim_status:'pending',revision:(Number(listing.revision)||1)+1});
    auctionBackupSyncSbRowSafe_(listing,'buy');clearAuctionListCache_();
    const latest=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);save=parseSaveRecord_(latest);
    return {ok:true,revision:Number(latest.Revision)||1,save,price,fee,sellerNet,item,buyerGold:Number(save.gold)||0};
  }finally{lock.releaseLock()}
}

function getMyAuctionSales_(body) {
  const auth=requireAuth_(body.sessionToken);
  const rows=auctionSbRequest_('get','?seller_account_id=eq.'+encodeURIComponent(auth.accountId)+'&status=eq.sold&select=*&order=sold_at.desc',null,null);
  const mapped=(rows||[]).map(r=>({listingId:String(r.listing_id||''),itemType:String(r.item_type||''),itemTemplateId:String(r.item_template_id||''),
    item:r.item_instance_json||{},askGold:Number(r.ask_gold)||0,feeGold:Number(r.fee_gold)||0,sellerNetGold:Number(r.seller_net_gold)||0,
    claimStatus:auctionPrimaryClaimStatus_(r),payoutMode:String(r.payout_mode||''),soldAt:String(r.sold_at||''),claimedAt:String(r.claimed_at||'')}));
  const pending=mapped.filter(r=>r.claimStatus==='pending');
  return {ok:true,rows:mapped,pendingCount:pending.length,pendingGold:pending.reduce((a,r)=>a+(Number(r.sellerNetGold)||0),0)};
}

function claimAuctionProceeds_(body) {
  const auth=requireAuth_(body.sessionToken),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const saveRec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);if(!saveRec)return {ok:false,error:'SAVE_NOT_FOUND'};requireTransactionSaveRevision_(body,saveRec);
    let save=parseSaveRecord_(saveRec);
    const rows=auctionSbRequest_('get','?seller_account_id=eq.'+encodeURIComponent(auth.accountId)+'&status=eq.sold&select=*&order=sold_at.asc',null,null);
    const pending=(rows||[]).filter(r=>auctionPrimaryClaimStatus_(r)==='pending');
    if(!pending.length)return {ok:true,claimedGold:0,claimedCount:0,message:'NO_PENDING_PROCEEDS',revision:Number(saveRec.Revision)||1,save};
    let claimedGold=0,claimedCount=0;
    pending.forEach(r=>{const key='proceeds:'+String(r.listing_id),amt=Math.max(0,Number(r.seller_net_gold)||0);if(!hasServerReceipt_(save,'auction',key)){save.gold=(Number(save.gold)||0)+amt;addServerReceipt_(save,'auction',key);claimedGold+=amt;claimedCount++;}});
    let revision=Number(saveRec.Revision)||1;
    if(claimedCount){revision++;writeFullSave_(auth.accountId,revision,save);pending.forEach(r=>verifyReceiptAfterWrite_(auth.accountId,'auction','proceeds:'+String(r.listing_id)));}
    const now=new Date().toISOString();
    pending.forEach(r=>{const updated=auctionPrimaryPatch_(String(r.listing_id),{payout_mode:'manual_claim_v1',claim_status:'claimed',claimed_at:now,revision:(Number(r.revision)||1)+1});auctionBackupSyncSbRowSafe_(updated,'claim');});
    const latest=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);save=parseSaveRecord_(latest);
    return {ok:true,claimedGold,claimedCount,newGold:Number(save.gold)||0,revision:Number(latest.Revision)||revision,save};
  }finally{lock.releaseLock()}
}

function repairAuctionSaleToPending(listingId) {
  ensureAuctionClaimSchema_();
  const id = String(listingId || '').trim();
  if (!id) throw new Error('LISTING_ID_REQUIRED');

  const row = findRowByValue_(DB.AUCTION, 'ListingID', id);
  if (!row) throw new Error('LISTING_NOT_FOUND');
  if (String(row.Status) !== 'sold') throw new Error('LISTING_NOT_SOLD');
  if (String(row.ClaimedAt || '').trim()) throw new Error('ALREADY_CLAIMED');

  updateRowObject_(DB.AUCTION, row.__row, {
    PayoutMode:'manual_claim_v1',
    ClaimStatus:'pending',
    ClaimedAt:'',
    Revision:(Number(row.Revision)||1)+1
  });

  return {
    ok:true,
    listingId:id,
    sellerNetGold:Number(row.SellerNetGold)||0,
    message:'Marked as pending. Seller can now claim proceeds.'
  };
}

function normalizeAuctionCategory_(category) {
  const c=String(category||'all').trim().toLowerCase();
  return ['weapon','head','armor','ring','special','gem'].includes(c)?c:'all';
}

function getAuctionListCached_(page,pageSize,category) {
  page=clampInt_(page||1,1,999999);
  pageSize=clampInt_(pageSize||20,1,50);
  category=normalizeAuctionCategory_(category);
  const key='auction:list:'+category+':'+page+':'+pageSize;
  try{
    const hit=CacheService.getScriptCache().get(key);
    if(hit)return JSON.parse(hit);
  }catch(_e){}
  const data=getAuctionList_(page,pageSize,category);
  try{
    const raw=JSON.stringify(data);
    if(raw.length<90000)CacheService.getScriptCache().put(key,raw,8);
  }catch(_e){}
  return data;
}

function clearAuctionListCache_(){
  // v11.31.73: list cache is only 8 seconds and keys include category/page.
  // Mutations do not need an expensive key scan; clients explicitly invalidate their local page cache.
}

function getAuctionList_(page,pageSize,category) {
  page=clampInt_(page||1,1,999999);pageSize=clampInt_(pageSize||20,1,50);
  category=normalizeAuctionCategory_(category);
  const offset=(page-1)*pageSize;
  let q='?status=eq.active';
  if(category!=='all')q+='&item_type=eq.'+encodeURIComponent(category);
  // Fetch one extra row only to know whether a next page exists. Never download the full market.
  q+='&select=*&order=created_at.desc&offset='+offset+'&limit='+(pageSize+1);
  const fetched=auctionSbRequest_('get',q,null,null)||[];
  const hasNext=fetched.length>pageSize;
  const rows=fetched.slice(0,pageSize);
  return {ok:true,page,pageSize,category,hasNext,rows:rows.map(r=>({listingId:String(r.listing_id),sellerAccountId:String(r.seller_account_id||''),
    sellerNickname:String(r.seller_nickname||''),itemType:String(r.item_type||''),itemTemplateId:String(r.item_template_id||''),
    item:r.item_instance_json||{},askGold:Number(r.ask_gold)||0,createdAt:String(r.created_at||'')}))};
}

function publicDataCache_() {
  return CacheService.getScriptCache();
}

function cachedDataVersion_(){
  try{return String(publishedPlanningPackage_(false).dataVersion||'unknown')}
  catch(_e){return String(PropertiesService.getScriptProperties().getProperty('PUBLISHED_GAME_DATA_VERSION')||'unpublished')}
}

function readPublicObjectsCached_(sheetName,dataVersion,forceRefresh) {
  const cache=publicDataCache_();
  const key='public:'+String(dataVersion)+':'+sheetName;
  if(!forceRefresh){
    const hit=cache.get(key);
    if(hit){
      try{return JSON.parse(hit)}catch(_e){}
    }
  }
  const rows=readObjects_(sheetName).filter(r=>{
    if(!('Enabled' in r))return true;
    return toBool_(r.Enabled);
  });
  // CacheService 單值有大小限制；過大的 Sheet 自動退回即時讀取，不影響功能。
  try{
    const raw=JSON.stringify(rows);
    if(raw.length<90000)cache.put(key,raw,21600);
  }catch(_e){}
  return rows;
}

function getBootstrapData_(forceRefresh) {
  // v11.31.91：Runtime 不再讀 Google Sheet；只回傳已發布的 Supabase package。
  return publishedPlanningPackage_(!!forceRefresh);
}

function getDataVersion_(){ return cachedDataVersion_(); }

function gameConfigMap_() {
  const out = {};
  readObjects_('GameConfig').forEach(r => {
    const key = String(r.Key || '').trim();
    if (!key) return;
    const raw = r.Value;
    const n = Number(raw);
    out[key] = raw !== '' && raw != null && Number.isFinite(n) ? n : raw;
  });
  return out;
}

function startingSkillIds241_(raw,fallback=[]){return raw==null?[...fallback]:(Array.isArray(raw)?raw:String(raw).split(',')).map(x=>String(x).trim()).filter(Boolean);}

function startingPassiveSkills242_(raw){const ids=startingSkillIds241_(raw,['adventurerAptitude']);return (ids.length?ids:['adventurerAptitude']).slice(0,1);}

function startingOwnedSkills242_(raw,passiveRaw){return [...new Set([...startingSkillIds241_(raw,['slash','heal','magicMissile']),...startingPassiveSkills242_(passiveRaw),'adventurerAptitude'])];}

function makeInitialSave_(nickname) {
  const cfg = gameConfigMap_();
  const base = {
    hp: Number(cfg.BaseHP ?? 100),
    def: Number(cfg.BaseDEF ?? 0),
    patk: Number(cfg.BasePATK ?? 10),
    matk: Number(cfg.BaseMATK ?? 10),
    crit: Number(cfg.BaseCrit ?? 0)
  };

  let shortSword = null;
  try {
    const row = equipmentRowById_('shortSword');
    if (row) shortSword = makeEquipmentInstanceFromRow_(row);
  } catch (_e) {}

  if (!shortSword) {
    shortSword = {
      id:'ITM_' + Utilities.getUuid().replace(/-/g,''),
      template:'shortSword',
      name:'短劍',
      rarity:'一般',
      slot:'weapon',
      price:0,
      stats:{patk:2},
      sockets:0,
      enhance:0,
      gems:[]
    };
  }

  return {
    schemaVersion: 2,
    version: 1,
    page: 'prepare',
    nickname: nickname || '冒險者',
    level: 1,
    exp: 0,
    talent: 0,
    talentPoints: 0,
    base: base,
    currentHp: base.hp,
    pendingLevelUps: [],
    talentSpent:{hp:0,def:0,patk:0,matk:0,crit:0},
    gold: Number(cfg.StartingGold ?? 10),
    stones: 0,
    floor: 1,
    currentFloor: 1,
    maxCleared: 0,
    bestClear: 0,
    clearCount: {},
    checkpoint: 0,
    equipment:{
      head:null,
      armor:null,
      weapon:shortSword.id,
      special:null,
      rings:[null,null,null,null]
    },
    inventory:[shortSword],
    gems:[],
    skillsOwned:startingOwnedSkills242_(cfg.StartingSkills,cfg.StartingPassiveSkills),
    equippedSkills:String(cfg.StartingEquippedSkills??'slash,heal,magicMissile').split(',').map(x=>x.trim()).filter(Boolean).slice(0,3),
    passive:startingPassiveSkills242_(cfg.StartingPassiveSkills),
    itemSlots:[null,null],
    purchasedSkills:[],
    consumables:{redPotion:0,eyeDrops:0,sacrificeGoat:0,poisonItem:0},
    utilityItems:[],
    shopTab:'equipment',
    shopEquipSubTab:'weapon',
    bossGemClaimed:{},
    currentBattle:null,
    shopStock:[],
    battleLog:[],
    battleVisual:{phase:'等待玩家操作',detail:'選擇一個技能開始行動。',busy:false,actor:'player'}
  };
}

// ============================================================
// 03｜存檔、授權與共用資料工具
// ============================================================

function sanitizeIncomingSave_(save) {
  if (!save || typeof save !== 'object' || Array.isArray(save)) throw new Error('INVALID_SAVE');

  // 防止超大 payload
  const text = JSON.stringify(save);
  if (text.length > 500000) throw new Error('SAVE_TOO_LARGE');

  const obj = JSON.parse(text);

  // v11.4.4 修正：
  // 舊版使用 `'constructor' in obj`，普通 JavaScript object 會從 Object.prototype
  // 繼承 constructor，因此所有正常存檔都會被誤判成 INVALID_SAVE_KEYS。
  // 現在只檢查 JSON 內「實際存在的 own keys」，並遞迴檢查巢狀資料。
  const banned = { '__proto__':true, 'constructor':true, 'prototype':true };
  const scan = (value) => {
    if (value == null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }
    Object.keys(value).forEach(key => {
      if (banned[key]) throw new Error('INVALID_SAVE_KEYS');
      scan(value[key]);
    });
  };
  scan(obj);

  return obj;
}

const SAVE_CHUNK_SIZE_ = 40000;

const SAVE_CHUNK_COUNT_ = 13;

function saveChunkHeaders_() {
  const out = ['SaveJSON'];
  for (let i = 2; i <= SAVE_CHUNK_COUNT_; i++) out.push('SaveJSON_' + i);
  return out;
}

function ensureSaveChunkSchema_() {
  const sh = ss_().getSheetByName(DB.SAVES);
  if (!sh) throw new Error('SHEET_NOT_FOUND: ' + DB.SAVES);
  const lastCol = sh.getLastColumn();
  const headers = lastCol > 0 ? sh.getRange(1,1,1,lastCol).getValues()[0].map(String) : [];
  const missing = saveChunkHeaders_().filter(h => headers.indexOf(h) < 0);
  if (missing.length) sh.getRange(1,lastCol+1,1,missing.length).setValues([missing]);
}

function splitSaveJson_(text) {
  text = String(text || '');
  const capacity = SAVE_CHUNK_SIZE_ * SAVE_CHUNK_COUNT_;
  if (text.length > capacity) throw new Error('SAVE_TOO_LARGE_CHUNKED:' + text.length + '/' + capacity);
  const chunks = [];
  for (let i = 0; i < SAVE_CHUNK_COUNT_; i++) {
    chunks.push(text.slice(i * SAVE_CHUNK_SIZE_, (i + 1) * SAVE_CHUNK_SIZE_));
  }
  return chunks;
}

function joinSaveJson_(rec) {
  if (!rec || typeof rec !== 'object') return '';
  return saveChunkHeaders_().map(h => String(rec[h] || '')).join('');
}

function validateStoredSaveShape_(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('SAVE_CORRUPT_OBJECT');
  if (!Number.isFinite(Number(obj.level)) || Number(obj.level) < 1) throw new Error('SAVE_CORRUPT_LEVEL');
  if (!obj.base || typeof obj.base !== 'object' || Array.isArray(obj.base)) throw new Error('SAVE_CORRUPT_BASE');
  if (!Array.isArray(obj.inventory)) throw new Error('SAVE_CORRUPT_INVENTORY');
  if (!obj.equipment || typeof obj.equipment !== 'object' || Array.isArray(obj.equipment)) throw new Error('SAVE_CORRUPT_EQUIPMENT');
  if (!Array.isArray(obj.skillsOwned)) throw new Error('SAVE_CORRUPT_SKILLS');
  return obj;
}

function parseSaveRecord_(rec) {
  if (!rec || typeof rec !== 'object') throw new Error('SAVE_RECORD_MISSING');
  const text=joinSaveJson_(rec);
  if (!text || !String(text).trim()) throw new Error('SAVE_JSON_EMPTY');
  let obj;
  try { obj=JSON.parse(String(text)); }
  catch (_e) { throw new Error('SAVE_JSON_CORRUPT'); }
  validateStoredSaveShape_(obj);

  // 有 checksum 的新式存檔必須驗證；舊資料若 checksum 空白仍允許讀取，下一次正常儲存會補上。
  const storedChecksum=String(rec.SaveChecksum||'').trim();
  if (storedChecksum) {
    const accountId=String(rec.AccountID||'');
    const revision=Number(rec.Revision)||1;
    const expected=sign_(accountId+'|'+revision+'|'+String(text));
    if (!safeEquals_(storedChecksum,expected)) throw new Error('SAVE_CHECKSUM_MISMATCH');
  }
  return obj;
}

function assertNoDangerousSaveRegression_(currentSave,incomingSave) {
  validateStoredSaveShape_(incomingSave);
  if (!currentSave) return;
  const oldLevel=Math.max(1,Math.trunc(Number(currentSave.level)||1));
  const newLevel=Math.max(1,Math.trunc(Number(incomingSave.level)||1));
  const oldClear=Math.max(0,Math.trunc(Number(currentSave.maxCleared||currentSave.bestClear)||0));
  const newClear=Math.max(0,Math.trunc(Number(incomingSave.maxCleared||incomingSave.bestClear)||0));

  // 最高通關本來就不應倒退；高等角色突然大幅掉級也視為壞 state。
  if (newClear < oldClear) throw new Error('SAVE_REGRESSION_MAX_CLEARED:'+oldClear+'->'+newClear);
  if (oldLevel >= 20 && newLevel < oldLevel-10) throw new Error('SAVE_REGRESSION_LEVEL:'+oldLevel+'->'+newLevel);
}

function writeFullSave_(accountId, revision, save) {
  accountId=String(accountId||'').trim();
  if(!accountId)throw new Error('ACCOUNT_ID_REQUIRED');
  revision=Math.max(1,Math.trunc(Number(revision)||1));
  const clean=sanitizeIncomingSave_(save||{});
  const maxCleared=Math.max(0,Math.trunc(Number(clean.maxCleared||clean.bestClear||0)||0));
  clean.maxCleared=maxCleared;
  clean.bestClear=Math.max(maxCleared,Math.trunc(Number(clean.bestClear||0)||0));
  clean.floor=Math.max(1,Math.trunc(Number(clean.floor||clean.currentFloor||maxCleared+1)||maxCleared+1));

  // 正式存檔仍以 Supabase 為唯一來源；不保留已退役的 Sheet 主庫／Shadow 測試寫入。
  supabaseWritePrimarySave_(accountId,revision,clean);
  invalidateLeaderboardCache_();
}

function writeGoogleSheetSaveBackup_(accountId, revision, save) {
  const rec=findSheetSaveRecordByAccount_(accountId);
  const clean=sanitizeIncomingSave_(save||{});
  const maxCleared=Math.max(0,Math.trunc(Number(clean.maxCleared||clean.bestClear||0)||0));
  clean.maxCleared=maxCleared;
  clean.bestClear=Math.max(maxCleared,Math.trunc(Number(clean.bestClear||0)||0));
  clean.floor=Math.max(1,Math.trunc(Number(clean.floor||clean.currentFloor||maxCleared+1)||maxCleared+1));
  const nickname=String(clean.nickname||'');
  const saveJson=JSON.stringify(clean);
  ensureSaveChunkSchema_();
  const chunks=splitSaveJson_(saveJson);
  const checksum=sign_(accountId+'|'+revision+'|'+saveJson);
  const patch={
    AccountID:accountId,Revision:revision,
    Level:Number(clean.level||1)||1,MaxCleared:maxCleared,
    Nickname:nickname,UpdatedAt:new Date().toISOString(),SaveChecksum:checksum
  };
  saveChunkHeaders_().forEach((h,i)=>patch[h]=chunks[i]||'');
  if(rec){
    updateRowObject_(DB.SAVES,rec.__row,patch);
    cacheSaveRow_(accountId,rec.__row);
  }else{
    appendObject_(DB.SAVES,patch);
    const sh=ss_().getSheetByName(DB.SAVES);
    if(sh)cacheSaveRow_(accountId,sh.getLastRow());
  }
}

function updateSaveRecord_(rec, save) {
  const revision = (Number(rec.Revision) || 1) + 1;
  writeFullSave_(String(rec.AccountID), revision, save);
}

function removeTradableItemFromSave_(save, instanceId, type) {
  // 所有裝備若仍裝備中，不允許透過直接呼叫 API 繞過前端上架限制。
  if (type !== 'gem' && save && save.equipment) {
    const eq = save.equipment;
    const equippedIds = [
      eq.head, eq.armor, eq.weapon, eq.special
    ].concat(Array.isArray(eq.rings) ? eq.rings : []).filter(Boolean);
    if (equippedIds.some(x => String(x) === String(instanceId))) return null;
  }

  const arrays = type === 'gem'
    ? ['gems','gemInventory']
    : ['inventory','weapons'];

  for (let a = 0; a < arrays.length; a++) {
    const key = arrays[a];
    if (!Array.isArray(save[key])) continue;

    const idx = save[key].findIndex(x => String(x && (x.id || x.instanceId)) === String(instanceId));
    if (idx >= 0) {
      return save[key].splice(idx, 1)[0];
    }
  }

  return null;
}

function returnTradableItemToSave_(save, item, type) {
  const key = type === 'gem' ? 'gems' : 'inventory';
  if (!Array.isArray(save[key])) save[key] = [];
  save[key].push(item);
}

function equipmentRowById_(itemId) {
  const id = String(itemId || '').trim();
  if (!id) return null;
  return readObjects_('Equipment').find(r =>
    String(r.ItemID || '').trim() === id &&
    (!('Enabled' in r) || toBool_(r.Enabled))
  ) || null;
}

function makeEquipmentInstanceFromRow_(row) {
  if (!row) throw new Error('EQUIPMENT_NOT_FOUND');

  const sockets = Math.max(0, Math.trunc(Number(row.BaseSockets) || 0));
  const stats = {};
  [
    ['hp','HP'],['def','DEF'],['patk','PATK'],['matk','MATK'],['crit','Crit']
  ].forEach(pair => {
    const n = Number(row[pair[1]]) || 0;
    if (n !== 0) stats[pair[0]] = n;
  });

  const item = {
    id: 'ITM_' + Utilities.getUuid().replace(/-/g, ''),
    template: String(row.ItemID || ''),
    name: String(row.Name || row.ItemID || ''),
    rarity: String(row.Rarity || '一般'),
    slot: String(row.Slot || 'special'),
    price: Number(row.BasePrice) || 0,
    stats: stats,
    sockets: sockets,
    enhance: 0,
    gems: Array(sockets).fill(null)
  };

  const effect = String(row.EffectKey || '').trim();
  if (effect) item.effect = effect;
  const iconSymbol = String(row.IconSymbol || '').trim();
  if (iconSymbol) item.iconSymbol = iconSymbol;

  return item;
}

function makeToken_(accountId) {
  const exp = Math.floor(Date.now()/1000) + TOKEN_TTL_SEC;
  const payloadObj = { sub: accountId, exp: exp };
  const payload = base64UrlEncode_(JSON.stringify(payloadObj));
  const sig = signWithTokenSecret_(payload);
  return payload + '.' + sig;
}

function requireSupabaseAuthBridge_(token) {
  const cfg=supabaseConfig_();
  const userResponse=UrlFetchApp.fetch(cfg.url+'/auth/v1/user',{
    method:'get',headers:{apikey:cfg.key,Authorization:'Bearer '+token},muteHttpExceptions:true});
  if(userResponse.getResponseCode()!==200)throw new Error('UNAUTHORIZED');
  const user=parseJsonSafe_(userResponse.getContentText(),null);
  if(!user||!user.id||user.is_anonymous||!user.email_confirmed_at)throw new Error('UNAUTHORIZED');
  const linkResponse=UrlFetchApp.fetch(cfg.url+'/rest/v1/game_identity_links?auth_user_id=eq.'+
    encodeURIComponent(user.id)+'&select=legacy_account_id&limit=2',{
    method:'get',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},muteHttpExceptions:true});
  if(linkResponse.getResponseCode()!==200)throw new Error('AUTH_BRIDGE_LOOKUP_FAILED');
  const links=parseJsonSafe_(linkResponse.getContentText(),null);
  if(!Array.isArray(links)||links.length!==1||!links[0].legacy_account_id)throw new Error('UNAUTHORIZED');
  const accountId=String(links[0].legacy_account_id);
  const account=runtimeAccountById_(accountId);
  if(!account||toBool_(account.Disabled))throw new Error('ACCOUNT_DISABLED');
  return {accountId:accountId};
}

function requireAuth_(token) {
  token=String(token||'');
  if(token.split('.').length===3)return requireSupabaseAuthBridge_(token);
  const parsed = verifyToken_(token);
  if (!parsed) throw new Error('UNAUTHORIZED');
  return { accountId: String(parsed.sub) };
}

function verifyToken_(token) {
  token = String(token || '');
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const payload = parts[0];
  const sig = parts[1];

  if (!safeEquals_(signWithTokenSecret_(payload), sig)) return null;

  const obj = parseJsonSafe_(base64UrlDecode_(payload), null);
  if (!obj || !obj.sub || !obj.exp) return null;

  if (Math.floor(Date.now()/1000) > Number(obj.exp)) return null;

  return obj;
}

function signWithTokenSecret_(text) {
  const secret = PropertiesService.getScriptProperties().getProperty('TOKEN_SECRET');
  const bytes = Utilities.computeHmacSha256Signature(String(text), String(secret));
  return bytesToHex_(bytes);
}

function sign_(text) {
  const secret = PropertiesService.getScriptProperties().getProperty('SERVER_SECRET');
  const bytes = Utilities.computeHmacSha256Signature(String(text), String(secret));
  return bytesToHex_(bytes);
}

function hashPassword_(password, salt) {
  let bytes = Utilities.newBlob(String(salt) + '|' + String(password)).getBytes();

  for (let i = 0; i < PASSWORD_ITERATIONS; i++) {
    bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      bytes
    );
  }

  return bytesToHex_(bytes);
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheet_(name, headers) {
  let sh = ss_().getSheetByName(name);

  if (!sh) {
    sh = ss_().insertSheet(name);
  }

  const existingLastCol = sh.getLastColumn();
  const current = existingLastCol > 0 ? sh.getRange(1,1,1,existingLastCol).getValues()[0].map(String) : [];

  if (sh.getLastRow() === 0 || current.filter(String).length === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }

  // v11.4.4：既有 Schema 表自動在最右側補上缺少的新欄位，不重排、不覆蓋舊資料。
  const missing = headers.filter(h => current.indexOf(String(h)) < 0);
  if (missing.length) {
    sh.getRange(1, existingLastCol + 1, 1, missing.length).setValues([missing]);
  }

  return sh;
}

function readSheetObjectsRaw_(sheetName) {
  const sh = ss_().getSheetByName(sheetName);
  if (!sh) return [];

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(v => String(v).trim());

  return values.slice(1)
    .map((row, idx) => {
      const obj = { __row: idx + 2 };
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
    .filter(obj => headers.some(h => h && String(obj[h]) !== ''));
}

const WORLD_BOSS_SUPABASE_PRIMARY_ENABLED_ = true;

function isWorldBossSupabasePrimaryTable_(sheetName){
  return WORLD_BOSS_SUPABASE_PRIMARY_ENABLED_===true && (sheetName===DB.WORLD_BOSS_STATE||sheetName===DB.WORLD_BOSS_ATTEMPTS||sheetName===DB.WORLD_BOSS_REWARDS);
}

function wbTableMeta_(sheetName){
  if(sheetName===DB.WORLD_BOSS_STATE)return {table:'WorldBossState',idField:'boss_instance_id',sheetId:'BossInstanceID',toSb:wbStateSheetToSb_};
  if(sheetName===DB.WORLD_BOSS_ATTEMPTS)return {table:'WorldBossAttempts',idField:'challenge_id',sheetId:'ChallengeID',toSb:wbAttemptSheetToSb_};
  if(sheetName===DB.WORLD_BOSS_REWARDS)return {table:'WorldBossRewards',idField:'reward_id',sheetId:'RewardID',toSb:wbRewardSheetToSb_};
  return null;
}

function wbAttemptSbToSheet_(r){return {__row:String(r.challenge_id||''),ChallengeID:String(r.challenge_id||''),BossInstanceID:String(r.boss_instance_id||''),AccountID:String(r.account_id||''),Nickname:String(r.nickname||''),DateKey:String(r.date_key||''),AttemptNo:Number(r.attempt_no)||1,StartedAt:String(r.started_at||''),SubmittedAt:String(r.submitted_at||''),Damage:Number(r.damage)||0,Status:String(r.status||'STARTED')};}

function wbRewardSbToSheet_(r){return {__row:String(r.reward_id||''),RewardID:String(r.reward_id||''),BossInstanceID:String(r.boss_instance_id||''),AccountID:String(r.account_id||''),Nickname:String(r.nickname||''),Rank:Number(r.rank)||0,ChestType:String(r.chest_type||''),Status:String(r.status||'PENDING'),CreatedAt:String(r.created_at||''),OpenedAt:String(r.opened_at||''),Gold:r.gold==null?'':Number(r.gold),Stones:r.stones==null?'':Number(r.stones),GemAwarded:r.gem_awarded==null?'':String(r.gem_awarded),RewardGoldMin:r.reward_gold_min==null?'':Number(r.reward_gold_min),RewardGoldMax:r.reward_gold_max==null?'':Number(r.reward_gold_max),RewardStones:r.reward_stones==null?'':Number(r.reward_stones),RewardGemRate:r.reward_gem_rate==null?'':Number(r.reward_gem_rate),RewardGemID:String(r.reward_gem_id||''),RewardGemJSON:r.reward_gem_json==null?'':JSON.stringify(r.reward_gem_json)};}

function wbStateSbToSheet_(r){return {__row:String(r.boss_instance_id||''),BossInstanceID:String(r.boss_instance_id||''),BossID:String(r.boss_id||''),Name:String(r.name||''),MaxHP:Number(r.max_hp)||0,CurrentHP:Number(r.current_hp)||0,DEF:Number(r.def)||0,PATK:Number(r.patk)||0,MATK:Number(r.matk)||0,SpawnedAt:String(r.spawned_at||''),DeadAt:String(r.dead_at||''),RespawnAt:String(r.respawn_at||''),Status:String(r.status||'ALIVE'),Revision:Number(r.revision)||1};}

function wbSbToSheet_(sheetName,r){return sheetName===DB.WORLD_BOSS_STATE?wbStateSbToSheet_(r):(sheetName===DB.WORLD_BOSS_ATTEMPTS?wbAttemptSbToSheet_(r):wbRewardSbToSheet_(r));}

function readObjects_(sheetName){
  if(isWorldBossSupabasePrimaryTable_(sheetName))return wbSbFetchAll_(wbTableMeta_(sheetName).table).map(r=>wbSbToSheet_(sheetName,r));
  // PUBLIC_SHEETS 在 Runtime 一律讀已發布 Supabase package；Google Sheet 僅供企劃編輯/發布。
  if(DB.PUBLIC_SHEETS.includes(String(sheetName||'')))return publishedPlanningRows_(String(sheetName));
  return readSheetObjectsRaw_(sheetName);
}

function wbSbPatchById_(sheetName,id,patch){
  const meta=wbTableMeta_(sheetName);if(!meta)throw new Error('WB_PRIMARY_TABLE_INVALID');
  const current=wbSbFetchAll_(meta.table).find(r=>String(r[meta.idField])===String(id));
  if(!current)throw new Error('WB_PRIMARY_ROW_NOT_FOUND:'+id);
  const merged=Object.assign({},wbSbToSheet_(sheetName,current),patch);delete merged.__row;
  const payload=meta.toSb(merged),cfg=supabaseConfig_();
  const url=cfg.url+'/rest/v1/'+meta.table+'?'+meta.idField+'=eq.'+encodeURIComponent(String(id));
  const res=UrlFetchApp.fetch(url,{method:'patch',contentType:'application/json',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,Prefer:'return=representation'},payload:JSON.stringify(payload),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();if(status<200||status>=300)throw new Error('SUPABASE_WB_PATCH_'+meta.table+'_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){}if(!Array.isArray(rows)||rows.length!==1)throw new Error('SUPABASE_WB_PATCH_'+meta.table+'_ROWCOUNT');
}

function wbBackupAppend_(sheetName,obj){
  // v11.31.68: WorldBoss runtime sheets are SNAPSHOT_BACKUP_ONLY.
  return;
}

function wbBackupUpdateById_(sheetName,id,patch){
  // v11.31.68: WorldBoss runtime sheets are SNAPSHOT_BACKUP_ONLY.
  return;
}

const SAVE_ROW_CACHE_TTL_SEC_ = 21600;

function saveRowCacheKey_(accountId){ return 'acc_row:'+String(accountId||'').trim(); }

function cacheSaveRow_(accountId,rowNumber){
  const id=String(accountId||'').trim(),row=Math.trunc(Number(rowNumber)||0);
  if(!id||row<2)return;
  try{ CacheService.getScriptCache().put(saveRowCacheKey_(id),String(row),SAVE_ROW_CACHE_TTL_SEC_); }catch(_e){}
}

function clearSaveRowCache_(accountId){
  try{ CacheService.getScriptCache().remove(saveRowCacheKey_(accountId)); }catch(_e){}
}

function readObjectAtRow_(sheetName,rowNumber){
  const sh=ss_().getSheetByName(sheetName);if(!sh)return null;
  const row=Math.trunc(Number(rowNumber)||0),lastRow=sh.getLastRow(),lastCol=sh.getLastColumn();
  if(row<2||row>lastRow||lastCol<1)return null;
  const headers=sh.getRange(1,1,1,lastCol).getValues()[0].map(String);
  const values=sh.getRange(row,1,1,lastCol).getValues()[0];
  if(!values.some(v=>String(v)!==''))return null;
  const obj={__row:row};headers.forEach((h,i)=>obj[h]=values[i]);return obj;
}

function findSheetSaveRecordByAccount_(accountId){
  const value=String(accountId||'');
  let cachedRow=0;
  try{cachedRow=Math.trunc(Number(CacheService.getScriptCache().get(saveRowCacheKey_(value)))||0);}catch(_e){}
  if(cachedRow>=2){
    const hit=readObjectAtRow_(DB.SAVES,cachedRow);
    if(hit&&String(hit.AccountID)===value)return hit;
    clearSaveRowCache_(value);
  }
  const rows=readObjects_(DB.SAVES);
  for(let i=0;i<rows.length;i++){
    if(String(rows[i].AccountID)===value){cacheSaveRow_(value,rows[i].__row);return rows[i];}
  }
  return null;
}

function findRowByValue_(sheetName, header, value) {
  value=String(value);

  // v11.31.22：測試帳號的 PlayerSave authoritative source 改為 Supabase。
  // 既有交易、Revision guard、receipt verify 都會自然讀到同一份 Primary。
  if(sheetName===DB.SAVES && header==='AccountID' && isSupabasePrimaryEnabledFor_(value)){
    return supabasePrimaryRecord_(value);
  }

  // 最重、最高頻的 PlayerSaves AccountID 查詢走 row cache。
  if(sheetName===DB.SAVES && header==='AccountID'){
    let cachedRow=0;
    try{ cachedRow=Math.trunc(Number(CacheService.getScriptCache().get(saveRowCacheKey_(value)))||0); }catch(_e){}
    if(cachedRow>=2){
      const hit=readObjectAtRow_(sheetName,cachedRow);
      if(hit && String(hit.AccountID)===value)return hit;
      clearSaveRowCache_(value);
    }
  }

  const rows=readObjects_(sheetName);
  for(let i=0;i<rows.length;i++){
    if(String(rows[i][header])===value){
      if(sheetName===DB.SAVES && header==='AccountID')cacheSaveRow_(value,rows[i].__row);
      return rows[i];
    }
  }
  return null;
}

function appendSheetObjectRaw_(sheetName, obj) {
  const sh = ss_().getSheetByName(sheetName);
  if (!sh) throw new Error('SHEET_NOT_FOUND: ' + sheetName);
  if (!obj || typeof obj !== 'object') throw new Error('INVALID_DB_OBJECT:' + sheetName);

  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const row = headers.map(h => (typeof obj[h] !== 'undefined') ? obj[h] : '');

  sh.appendRow(row);
}

function updateSheetRowObjectRaw_(sheetName, rowNumber, patch) {
  const sh = ss_().getSheetByName(sheetName);
  if (!sh) throw new Error('SHEET_NOT_FOUND: ' + sheetName);
  if (!patch || typeof patch !== 'object') throw new Error('INVALID_DB_PATCH:' + sheetName);

  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const current = sh.getRange(rowNumber,1,1,headers.length).getValues()[0];

  headers.forEach((h, i) => {
    if (typeof patch[h] !== 'undefined') current[i] = patch[h];
  });

  sh.getRange(rowNumber,1,1,headers.length).setValues([current]);
}

function appendObject_(sheetName,obj){
  if(isWorldBossSupabasePrimaryTable_(sheetName)){
    const meta=wbTableMeta_(sheetName),payload=meta.toSb(obj);wbSbInsert_(meta.table,payload);wbBackupAppend_(sheetName,obj);return;
  }
  return appendSheetObjectRaw_(sheetName,obj);
}

function updateRowObject_(sheetName,rowNumber,patch){
  if(isWorldBossSupabasePrimaryTable_(sheetName)){
    const id=String(rowNumber||'');wbSbPatchById_(sheetName,id,patch);wbBackupUpdateById_(sheetName,id,patch);return;
  }
  return updateSheetRowObjectRaw_(sheetName,rowNumber,patch);
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return parseJsonSafe_(e.postData.contents, {});
}

function routeAction_(e) {
  if (e && e.pathInfo) return String(e.pathInfo).replace(/^\/+|\/+$/g, '');
  if (e && e.parameter && e.parameter.action) return String(e.parameter.action).replace(/^\/+|\/+$/g, '');
  return 'health';
}

function normalizeUsername_(v) {
  return String(v || '').trim().toLowerCase();
}

function normalizeNickname_(v) {
  return String(v || '').trim();
}

function validateUsername_(v) {
  if (!/^[a-z0-9_]{4,24}$/.test(v)) {
    throw new Error('帳號需為 4~24 位英文小寫、數字或底線');
  }
}

function validatePassword_(v) {
  if (v.length < 8 || v.length > 72) {
    throw new Error('密碼需為 8~72 個字元');
  }
}

function validateNickname_(v) {
  if (v.length < 1 || v.length > 16) {
    throw new Error('暱稱需為 1~16 個字元');
  }
  if (/[\r\n\t<>]/.test(v)) {
    throw new Error('暱稱含不允許字元');
  }
}

function clampInt_(v, min, max) {
  const n = Math.floor(Number(v));
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toBool_(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function parseJsonSafe_(text, fallback) {
  try { return JSON.parse(String(text)); }
  catch (e) { return fallback; }
}

function safeEquals_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function randomHex_(bytesLen) {
  let out = '';
  while (out.length < bytesLen * 2) {
    out += Utilities.getUuid().replace(/-/g, '');
  }
  return out.substring(0, bytesLen * 2);
}

function bytesToHex_(bytes) {
  return bytes.map(b => {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function base64UrlEncode_(text) {
  return Utilities.base64EncodeWebSafe(String(text), Utilities.Charset.UTF_8).replace(/=+$/,'');
}

function base64UrlDecode_(text) {
  let s = String(text);
  while (s.length % 4) s += '=';
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(s)).getDataAsString();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const SUPABASE_PRIMARY_ENABLED_ = true;

function isSupabasePrimaryEnabledFor_(accountId) {
  if (SUPABASE_PRIMARY_ENABLED_ !== true) return false;
  return String(accountId || '').trim() !== '';
}

function supabaseConfig_() {
  const props=PropertiesService.getScriptProperties();
  const url=String(props.getProperty('SUPABASE_URL')||'').replace(/\/+$/,'');
  const key=String(props.getProperty('SUPABASE_SERVICE_KEY')||'').trim();
  if(!url||!key)throw new Error('SUPABASE_CONFIG_MISSING');
  return {url,key};
}

function supabasePrimaryReadRow_(accountId) {
  const cfg=supabaseConfig_();
  const endpoint=cfg.url+'/rest/v1/PlayerSaves?account_id=eq.'+encodeURIComponent(String(accountId))+'&select=*';
  const response=UrlFetchApp.fetch(endpoint,{
    method:'get',
    headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},
    muteHttpExceptions:true
  });
  const status=response.getResponseCode(),text=response.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_PRIMARY_READ_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_PRIMARY_READ_JSON_INVALID');}
  if(!Array.isArray(rows)||rows.length===0)return null;
  if(rows.length!==1)throw new Error('SUPABASE_PRIMARY_DUPLICATE_ACCOUNT:'+accountId);
  return rows[0];
}

function supabasePrimaryRecord_(accountId) {
  const row=supabasePrimaryReadRow_(accountId);
  if(!row)return null;
  const save=(row.save_json&&typeof row.save_json==='object')?row.save_json:null;
  if(!save)throw new Error('SUPABASE_PRIMARY_SAVE_JSON_INVALID');
  const text=JSON.stringify(save);
  return {
    __source:'supabase',
    AccountID:String(row.account_id||accountId),
    Revision:Number(row.revision)||1,
    SaveJSON:text,
    Level:Number(row.level||save.level||1)||1,
    MaxCleared:Math.max(0,Math.trunc(Number(row.max_cleared||save.maxCleared||0)||0)),
    Nickname:String(row.nickname||save.nickname||''),
    UpdatedAt:String(row.updated_at||''),
    // Supabase jsonb 可能重排 key，因此 Primary record 不沿用 Sheet checksum。
    // JSON shape 仍會由 parseSaveRecord_ 的 fail-closed 驗證。
    SaveChecksum:''
  };
}

function supabaseWritePrimarySave_(accountId, revision, save) {
  const cfg=supabaseConfig_();
  const clean=sanitizeIncomingSave_(save||{});
  validateStoredSaveShape_(clean);
  const newRevision=Math.max(1,Math.trunc(Number(revision)||1));
  const expectedRevision=newRevision-1;
  const maxCleared=Math.max(0,Math.trunc(Number(clean.maxCleared||clean.bestClear||0)||0));
  const payload={
    save_json:clean,
    revision:newRevision,
    level:Number(clean.level||1)||1,
    max_cleared:maxCleared,
    nickname:String(clean.nickname||''),
    updated_at:new Date().toISOString()
  };

  let endpoint,method;
  if(expectedRevision>=1){
    endpoint=cfg.url+'/rest/v1/PlayerSaves?account_id=eq.'+encodeURIComponent(accountId)+'&revision=eq.'+expectedRevision;
    method='patch';
  }else{
    endpoint=cfg.url+'/rest/v1/PlayerSaves?on_conflict=account_id';
    method='post';
    payload.account_id=accountId;
  }

  const response=UrlFetchApp.fetch(endpoint,{
    method:method,
    contentType:'application/json',
    headers:{
      apikey:cfg.key,
      Authorization:'Bearer '+cfg.key,
      Prefer:expectedRevision>=1?'return=representation':'resolution=merge-duplicates,return=representation'
    },
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });
  const status=response.getResponseCode(),text=response.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_PRIMARY_WRITE_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_PRIMARY_WRITE_JSON_INVALID');}
  if(!Array.isArray(rows)||rows.length!==1){
    throw new Error('SAVE_PREFLIGHT_REVISION_MISMATCH');
  }
  const written=rows[0];
  if(Number(written.revision)!==newRevision)throw new Error('SUPABASE_PRIMARY_REVISION_VERIFY_FAILED');

  // 再 GET 一次確認 Primary 真的可回讀，而且完整角色格式仍有效。
  const verify=supabasePrimaryRecord_(accountId);
  if(!verify||Number(verify.Revision)!==newRevision)throw new Error('SUPABASE_PRIMARY_READBACK_VERIFY_FAILED');
  parseSaveRecord_(verify);
  console.log('[Supabase Primary OK] '+accountId+' Revision='+newRevision);
  return verify;
}

// ============================================================
// 04｜Supabase 資料轉換、快照備份與排程
// ============================================================

function wbSbHeaders_(){
  const cfg=supabaseConfig_();
  return {apikey:cfg.key,Authorization:'Bearer '+cfg.key};
}

function wbSbFetchAll_(table){
  const cfg=supabaseConfig_();
  const url=cfg.url+'/rest/v1/'+table+'?select=*';
  const res=UrlFetchApp.fetch(url,{method:'get',headers:wbSbHeaders_(),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_WB_READ_'+table+'_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_WB_READ_'+table+'_JSON_INVALID');}
  if(!Array.isArray(rows))throw new Error('SUPABASE_WB_READ_'+table+'_ROWS_INVALID');
  return rows;
}

function wbSbInsert_(table,row){
  const cfg=supabaseConfig_();
  const res=UrlFetchApp.fetch(cfg.url+'/rest/v1/'+table,{
    method:'post',contentType:'application/json',
    headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,Prefer:'return=representation'},
    payload:JSON.stringify(row),muteHttpExceptions:true
  });
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_WB_INSERT_'+table+'_HTTP_'+status+': '+text);
  return text;
}

function wbNullableIso_(v){
  if(v===null||v===undefined||String(v).trim()==='')return null;
  if(v instanceof Date&&!isNaN(v.getTime()))return v.toISOString();
  const d=new Date(v);return isNaN(d.getTime())?String(v):d.toISOString();
}

function wbNullableNum_(v){return (v===null||v===undefined||String(v).trim()==='')?null:Number(v);}

function wbJsonValue_(v){
  if(v===null||v===undefined||String(v).trim()==='')return null;
  if(typeof v==='object')return v;
  try{return JSON.parse(String(v));}catch(_e){return String(v);}
}

function wbAttemptSheetToSb_(r){return {
  challenge_id:String(r.ChallengeID||''),boss_instance_id:String(r.BossInstanceID||''),account_id:String(r.AccountID||''),
  nickname:String(r.Nickname||''),date_key:normalizeWbDateKey_(r.DateKey),attempt_no:Math.trunc(Number(r.AttemptNo)||1),
  started_at:wbNullableIso_(r.StartedAt),submitted_at:wbNullableIso_(r.SubmittedAt),damage:Math.trunc(Number(r.Damage)||0),status:String(r.Status||'STARTED')
};}

function wbRewardSheetToSb_(r){return {
  reward_id:String(r.RewardID||''),boss_instance_id:String(r.BossInstanceID||''),account_id:String(r.AccountID||''),nickname:String(r.Nickname||''),
  rank:Math.trunc(Number(r.Rank)||0),chest_type:String(r.ChestType||''),status:String(r.Status||'PENDING'),
  created_at:wbNullableIso_(r.CreatedAt),opened_at:wbNullableIso_(r.OpenedAt),gold:wbNullableNum_(r.Gold),stones:wbNullableNum_(r.Stones),
  gem_awarded:(r.GemAwarded===null||r.GemAwarded===undefined)?'':String(r.GemAwarded),reward_gold_min:wbNullableNum_(r.RewardGoldMin),
  reward_gold_max:wbNullableNum_(r.RewardGoldMax),reward_stones:wbNullableNum_(r.RewardStones),reward_gem_rate:wbNullableNum_(r.RewardGemRate),
  reward_gem_id:String(r.RewardGemID||''),reward_gem_json:wbJsonValue_(r.RewardGemJSON)
};}

function wbCanonScalar_(v){
  if(v===undefined||v===null)return null;
  if(typeof v==='boolean')return v?'TRUE':'FALSE';
  if(typeof v==='string'){
    const s=v.trim();
    if(s==='')return null;
    // Sheet checkbox / boolean 與 Supabase text 欄位統一成 TRUE/FALSE。
    if(/^true$/i.test(s))return 'TRUE';
    if(/^false$/i.test(s))return 'FALSE';
    // DateKey 統一 yyyy-MM-dd；避免 Sheet Date 物件字串與 Supabase text 誤判。
    const dm=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:$|[ T])/);
    if(dm&&!s.includes('T'))return dm[1]+'-'+String(dm[2]).padStart(2,'0')+'-'+String(dm[3]).padStart(2,'0');
    // PostgREST timestamptz may return +00:00 while Sheet conversion uses Z.
    if(/^\d{4}-\d{2}-\d{2}T/.test(s)){const d=new Date(s);if(!isNaN(d.getTime()))return d.toISOString();}
    // Numeric DB columns can be returned as strings depending on representation.
    if(/^-?(?:\d+\.?\d*|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(s)){const n=Number(s);if(Number.isFinite(n))return n;}
    return s;
  }
  return v;
}

function wbCanon_(v){
  if(v===undefined||v===null)return null;
  if(Array.isArray(v))return v.map(wbCanon_);
  if(typeof v==='object'){
    if(v instanceof Date&&!isNaN(v.getTime()))return v.toISOString();
    const o={};Object.keys(v).sort().forEach(k=>{o[k]=wbCanon_(v[k]);});return o;
  }
  return wbCanonScalar_(v);
}

function wbRowsEqual_(a,b){return JSON.stringify(wbCanon_(a))===JSON.stringify(wbCanon_(b));}

function wbRowDiff_(a,b){
  const ca=wbCanon_(a)||{},cb=wbCanon_(b)||{},keys=Array.from(new Set(Object.keys(ca).concat(Object.keys(cb)))).sort(),diff=[];
  keys.forEach(k=>{if(JSON.stringify(ca[k])!==JSON.stringify(cb[k]))diff.push({field:k,sheet:ca[k],supabase:cb[k]});});
  return diff;
}

const AUCTION_SUPABASE_TABLE_ = 'AuctionListings';

function auctionSbRequest_(method, query, payload, prefer) {
  const cfg=supabaseConfig_();
  const endpoint=cfg.url+'/rest/v1/'+AUCTION_SUPABASE_TABLE_+(query||'');
  const opt={method:String(method||'get').toLowerCase(),headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},muteHttpExceptions:true};
  if(payload!==undefined&&payload!==null){opt.contentType='application/json';opt.payload=JSON.stringify(payload);}
  if(prefer)opt.headers.Prefer=prefer;
  const res=UrlFetchApp.fetch(endpoint,opt),status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_AUCTION_HTTP_'+status+': '+text);
  if(!text)return [];
  try{return JSON.parse(text);}catch(_e){return text;}
}

function auctionSbAllRows_() {
  return auctionSbRequest_('get','?select=*&order=created_at.asc',null,null);
}















































const REDEEM_CLAIMS_SB_TABLE_ = 'RedeemCodeClaims';

function redeemClaimsSbHeaders_(){
  const cfg=supabaseConfig_();
  return {apikey:cfg.key,Authorization:'Bearer '+cfg.key};
}

function redeemClaimSheetToSb_(r){
  let result=[];
  try{const v=JSON.parse(String(r.ResultJSON||'[]'));result=Array.isArray(v)?v:[];}catch(_e){result=[];}
  return {
    claim_id:String(r.ClaimID||'').trim(),
    code:normalizeRedeemCode_(r.Code),
    account_id:String(r.AccountID||'').trim(),
    nickname:String(r.Nickname||''),
    claimed_at:String(r.ClaimedAt||'').trim()||new Date(0).toISOString(),
    result_json:result
  };
}

function redeemClaimsSbFetchAll_(){
  const cfg=supabaseConfig_();
  const url=cfg.url+'/rest/v1/'+REDEEM_CLAIMS_SB_TABLE_+'?select=*&order=claimed_at.asc';
  const res=UrlFetchApp.fetch(url,{method:'get',headers:redeemClaimsSbHeaders_(),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_REDEEM_CLAIMS_READ_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_REDEEM_CLAIMS_READ_JSON_INVALID');}
  if(!Array.isArray(rows))throw new Error('SUPABASE_REDEEM_CLAIMS_ROWS_INVALID');
  return rows;
}

function redeemClaimComparableSheet_(r){
  const x=redeemClaimSheetToSb_(r);
  return {claim_id:x.claim_id,code:x.code,account_id:x.account_id,nickname:x.nickname,claimed_at:redeemClaimIso_(x.claimed_at),result_json:redeemStableJson_(x.result_json)};
}

function redeemClaimComparableSb_(r){
  return {claim_id:String(r.claim_id||''),code:normalizeRedeemCode_(r.code),account_id:String(r.account_id||''),nickname:String(r.nickname||''),claimed_at:redeemClaimIso_(r.claimed_at),result_json:redeemStableJson_(r.result_json)};
}

function redeemClaimIso_(v){
  const t=new Date(String(v||'')).getTime();
  return Number.isFinite(t)?new Date(t).toISOString():String(v||'');
}

function redeemNormalizeJsonValue_(v){
  if(typeof v==='string'){
    const s=String(v).trim();
    if(!s)return '';
    try{return redeemNormalizeJsonValue_(JSON.parse(s));}
    catch(_e){return s;}
  }
  if(Array.isArray(v))return v.map(redeemNormalizeJsonValue_);
  if(v&&typeof v==='object'){
    const out={};
    Object.keys(v).sort().forEach(k=>{out[k]=redeemNormalizeJsonValue_(v[k]);});
    return out;
  }
  return v;
}

function redeemStableJson_(v){
  return JSON.stringify(redeemNormalizeJsonValue_(v==null?[]:v));
}

function validateRedeemClaimsSheetForMigration_(){
  const rows=readObjects_(DB.REDEEM_CLAIMS);
  const claimIds=new Map(), accountCodes=new Map(), issues=[];
  rows.forEach(r=>{
    const claimId=String(r.ClaimID||'').trim(),code=normalizeRedeemCode_(r.Code),accountId=String(r.AccountID||'').trim();
    if(!claimId||!code||!accountId){issues.push({row:r.__row,issue:'REQUIRED_FIELD_MISSING',claimId,code,accountId});return;}
    if(claimIds.has(claimId))issues.push({row:r.__row,issue:'DUPLICATE_CLAIM_ID',claimId,firstRow:claimIds.get(claimId)});else claimIds.set(claimId,r.__row);
    const k=accountId+'|'+code;
    if(accountCodes.has(k))issues.push({row:r.__row,issue:'DUPLICATE_ACCOUNT_CODE',accountId,code,firstRow:accountCodes.get(k)});else accountCodes.set(k,r.__row);
  });
  return {ok:issues.length===0,rows:rows.length,issues};
}

function testRedeemClaimsSupabaseAudit(){
  const pre=validateRedeemClaimsSheetForMigration_();
  const sheetRows=readObjects_(DB.REDEEM_CLAIMS),sbRows=redeemClaimsSbFetchAll_();
  const sMap=new Map(sheetRows.map(r=>{const x=redeemClaimComparableSheet_(r);return [x.claim_id,x];}));
  const bMap=new Map(sbRows.map(r=>{const x=redeemClaimComparableSb_(r);return [x.claim_id,x];}));
  const missing=[],conflict=[],extra=[];let consistent=0;
  sMap.forEach((s,id)=>{const b=bMap.get(id);if(!b){missing.push(id);return;}if(JSON.stringify(s)===JSON.stringify(b))consistent++;else conflict.push({claimId:id,sheet:s,supabase:b});});
  bMap.forEach((_b,id)=>{if(!sMap.has(id))extra.push(id);});
  const ok=pre.ok&&missing.length===0&&conflict.length===0&&extra.length===0&&sheetRows.length===sbRows.length;
  const out={ok,mode:'MIGRATION_AUDIT',primary:'GOOGLE_SHEET',runtimeChanged:false,config:{codes:'GOOGLE_SHEET',rewards:'GOOGLE_SHEET'},claims:{sheet:sheetRows.length,supabase:sbRows.length,consistent,missing:missing.length,conflict:conflict.length,extra:extra.length,missingIds:missing,conflicts:conflict,extraIds:extra},precheck:pre,status:ok?'REDEEM_CLAIMS_MIGRATION_AUDIT_OK':'REDEEM_CLAIMS_MIGRATION_AUDIT_HAS_ISSUES'};
  console.log('===== Redeem Claims Supabase Audit =====');console.log(JSON.stringify(out,null,2));return out;
}

function redeemClaimsSbFindByAccountCode_(accountId,code){
  const cfg=supabaseConfig_();
  const url=cfg.url+'/rest/v1/'+REDEEM_CLAIMS_SB_TABLE_+'?select=*&account_id=eq.'+encodeURIComponent(String(accountId||''))+'&code=eq.'+encodeURIComponent(normalizeRedeemCode_(code))+'&limit=1';
  const res=UrlFetchApp.fetch(url,{method:'get',headers:redeemClaimsSbHeaders_(),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_REDEEM_CLAIMS_FIND_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_REDEEM_CLAIMS_FIND_JSON_INVALID');}
  if(!Array.isArray(rows))throw new Error('SUPABASE_REDEEM_CLAIMS_FIND_ROWS_INVALID');
  return rows.length?rows[0]:null;
}

function redeemClaimsSbInsertPrimary_(row){
  if(!row||!row.claim_id||!row.code||!row.account_id)throw new Error('REDEEM_CLAIMS_PRIMARY_REQUIRED_FIELD_MISSING');
  const cfg=supabaseConfig_();
  const res=UrlFetchApp.fetch(cfg.url+'/rest/v1/'+REDEEM_CLAIMS_SB_TABLE_,{
    method:'post',contentType:'application/json',
    headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,Prefer:'return=minimal'},
    payload:JSON.stringify(row),muteHttpExceptions:true
  });
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_REDEEM_CLAIMS_PRIMARY_INSERT_HTTP_'+status+': '+text);
  return true;
}

function redeemClaimSbToSheetObj_(r){
  return {
    ClaimID:String(r.claim_id||''),
    Code:normalizeRedeemCode_(r.code),
    AccountID:String(r.account_id||''),
    Nickname:String(r.nickname||''),
    ClaimedAt:String(r.claimed_at||''),
    ResultJSON:JSON.stringify(Array.isArray(r.result_json)?r.result_json:[])
  };
}

function redeemClaimsWriteSnapshotSheet_(objects){
  ensureSheet_(DB.REDEEM_CLAIMS,['ClaimID','Code','AccountID','Nickname','ClaimedAt','ResultJSON']);
  const sh=ss_().getSheetByName(DB.REDEEM_CLAIMS);
  if(!sh)throw new Error('REDEEM_CLAIMS_SNAPSHOT_SHEET_MISSING');
  const lastCol=sh.getLastColumn();
  if(lastCol<1)throw new Error('REDEEM_CLAIMS_SNAPSHOT_HEADERS_MISSING');
  const headers=sh.getRange(1,1,1,lastCol).getValues()[0].map(String);
  const lastRow=sh.getLastRow();
  if(lastRow>1)sh.getRange(2,1,lastRow-1,lastCol).clearContent();
  if(objects.length){
    const values=objects.map(o=>headers.map(h=>o[h]===undefined?'':o[h]));
    sh.getRange(2,1,values.length,lastCol).setValues(values);
  }
  return objects.length;
}

function snapshotRedeemClaimsToSheet(){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const rows=redeemClaimsSbFetchAll_().map(redeemClaimSbToSheetObj_);
    const count=redeemClaimsWriteSnapshotSheet_(rows);
    const now=new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty('REDEEM_CLAIMS_LAST_SNAPSHOT_AT',now);
    const audit=testRedeemClaimsSupabaseAudit();
    const out={ok:audit.ok===true,mode:'SUPABASE_TO_SHEET_SNAPSHOT',primary:'SUPABASE',sheetRole:'SNAPSHOT_BACKUP_ONLY',runtimeSheetMirror:false,count:count,lastSnapshotAt:now,audit:audit,status:audit.ok===true?'REDEEM_CLAIMS_SNAPSHOT_OK':'REDEEM_CLAIMS_SNAPSHOT_AUDIT_FAILED'};
    console.log('===== Redeem Claims Snapshot =====');console.log(JSON.stringify(out,null,2));return out;
  }finally{lock.releaseLock();}
}

function installDailyRedeemClaimsSnapshotTrigger(){
  const handler='snapshotRedeemClaimsToSheet';
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(4).create();
  return testDailyRedeemClaimsSnapshotTriggerStatus();
}

function removeDailyRedeemClaimsSnapshotTrigger(){
  const handler='snapshotRedeemClaimsToSheet';let removed=0;
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>{ScriptApp.deleteTrigger(t);removed++;});
  const out={ok:true,removed:removed,status:'REDEEM_CLAIMS_DAILY_SNAPSHOT_TRIGGER_REMOVED'};console.log(JSON.stringify(out,null,2));return out;
}

function testDailyRedeemClaimsSnapshotTriggerStatus(){
  const handler='snapshotRedeemClaimsToSheet';
  const triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler);
  const last=PropertiesService.getScriptProperties().getProperty('REDEEM_CLAIMS_LAST_SNAPSHOT_AT')||'';
  const out={ok:triggers.length===1,primary:'SUPABASE',sheetRole:'SNAPSHOT_BACKUP_ONLY',runtimeSheetMirror:false,handler:handler,triggerCount:triggers.length,scriptTimeZone:Session.getScriptTimeZone(),intendedSchedule:'DAILY_AROUND_04:00_SCRIPT_TIMEZONE',lastSnapshotAt:last,status:triggers.length===1?'REDEEM_CLAIMS_DAILY_SNAPSHOT_TRIGGER_READY':(triggers.length===0?'REDEEM_CLAIMS_DAILY_SNAPSHOT_TRIGGER_MISSING':'REDEEM_CLAIMS_DAILY_SNAPSHOT_TRIGGER_DUPLICATED')};
  console.log('===== Redeem Claims Daily Snapshot Trigger Status =====');console.log(JSON.stringify(out,null,2));return out;
}

const ACCOUNTS_SB_TABLE_ = 'Accounts';

function accountsSbHeaders_(){
  const cfg=supabaseConfig_();
  return {apikey:cfg.key,Authorization:'Bearer '+cfg.key};
}

function accountIso_(v){
  if(v===null||v===undefined)return '';
  // Normal Apps Script Date cell.
  if(v instanceof Date && !isNaN(v.getTime())){
    const y=v.getUTCFullYear();
    if(y>=2000&&y<=2100)return v.toISOString();
  }
  const s=String(v).trim();
  if(!s)return '';
  // Google Sheets serial date (e.g. 46276 / 46276.5). 25569 = 1970-01-01.
  // Do this BEFORE new Date(s): JS can interpret a 5-digit numeric string as a huge year.
  if(/^\d{4,6}(?:\.\d+)?$/.test(s)){
    const serial=Number(s);
    if(Number.isFinite(serial)&&serial>=36526&&serial<=73050){
      const ms=Math.round((serial-25569)*86400000);
      const d=new Date(ms);
      if(!isNaN(d.getTime()))return d.toISOString();
    }
  }
  const d=new Date(s);
  if(!isNaN(d.getTime())){
    const y=d.getUTCFullYear();
    if(y>=2000&&y<=2100)return d.toISOString();
  }
  throw new Error('ACCOUNTS_INVALID_DATETIME:'+s);
}

function accountSheetToSb_(r){
  return {
    account_id:String(r.AccountID||'').trim(),
    username_normalized:normalizeUsername_(r.UsernameNormalized),
    password_hash:normalizeStoredHash_(r.PasswordHash),
    salt:String(r.Salt==null?'':r.Salt).trim().replace(/^'/,''),
    nickname:String(r.Nickname||''),
    created_at:accountIso_(r.CreatedAt)||new Date(0).toISOString(),
    last_login_at:accountIso_(r.LastLoginAt)||null,
    save_version:String(r.SaveVersion==null?'':r.SaveVersion),
    disabled:toBool_(r.Disabled),
    row_revision:Math.max(0,Math.trunc(Number(r.RowRevision)||0))
  };
}

function accountComparableSheet_(r){
  const x=accountSheetToSb_(r);
  return {account_id:x.account_id,username_normalized:x.username_normalized,password_hash:x.password_hash,salt:x.salt,nickname:x.nickname,created_at:accountIso_(x.created_at),last_login_at:accountIso_(x.last_login_at),save_version:x.save_version,disabled:x.disabled,row_revision:x.row_revision};
}

function accountComparableSb_(r){
  return {
    account_id:String(r.account_id||'').trim(),
    username_normalized:normalizeUsername_(r.username_normalized),
    password_hash:normalizeStoredHash_(r.password_hash),
    salt:String(r.salt==null?'':r.salt).trim().replace(/^'/,''),
    nickname:String(r.nickname||''),
    created_at:accountIso_(r.created_at),
    last_login_at:accountIso_(r.last_login_at),
    save_version:String(r.save_version==null?'':r.save_version),
    disabled:r.disabled===true||String(r.disabled).toLowerCase()==='true',
    row_revision:Math.max(0,Math.trunc(Number(r.row_revision)||0))
  };
}

function accountsSbFetchAll_(){
  const cfg=supabaseConfig_();
  const url=cfg.url+'/rest/v1/'+ACCOUNTS_SB_TABLE_+'?select=*&order=created_at.asc';
  const res=UrlFetchApp.fetch(url,{method:'get',headers:accountsSbHeaders_(),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_ACCOUNTS_READ_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_ACCOUNTS_READ_JSON_INVALID');}
  if(!Array.isArray(rows))throw new Error('SUPABASE_ACCOUNTS_ROWS_INVALID');
  return rows;
}

function accountsSbInsert_(row){
  const cfg=supabaseConfig_();
  const res=UrlFetchApp.fetch(cfg.url+'/rest/v1/'+ACCOUNTS_SB_TABLE_,{
    method:'post',contentType:'application/json',
    headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,Prefer:'return=minimal'},
    payload:JSON.stringify(row),muteHttpExceptions:true
  });
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_ACCOUNTS_INSERT_HTTP_'+status+': '+text);
}

function accountsSbFindByUsername_(username){
  const cfg=supabaseConfig_();
  const target=normalizeUsername_(username);
  const encoded=encodeURIComponent(target);
  const url=cfg.url+'/rest/v1/'+ACCOUNTS_SB_TABLE_+'?select=*&username_normalized=eq.'+encoded+'&limit=2';
  const res=UrlFetchApp.fetch(url,{method:'get',headers:accountsSbHeaders_(),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_ACCOUNTS_AUTH_READ_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_ACCOUNTS_AUTH_READ_JSON_INVALID');}
  if(!Array.isArray(rows))throw new Error('SUPABASE_ACCOUNTS_AUTH_READ_ROWS_INVALID');
  if(rows.length>1)throw new Error('SUPABASE_ACCOUNTS_AUTH_DUPLICATE_USERNAME:'+target);
  return rows.length?rows[0]:null;
}

function validateAccountsSheetForMigration_(){
  const rows=readObjects_(DB.ACCOUNTS),ids=new Map(),users=new Map(),issues=[];
  rows.forEach(r=>{
    const accountId=String(r.AccountID||'').trim(),username=normalizeUsername_(r.UsernameNormalized),hash=normalizeStoredHash_(r.PasswordHash),salt=String(r.Salt==null?'':r.Salt).trim().replace(/^'/,'');
    if(!accountId||!username||!hash||!salt){issues.push({row:r.__row,issue:'REQUIRED_FIELD_MISSING',accountId,username,hasPasswordHash:!!hash,hasSalt:!!salt});return;}
    if(ids.has(accountId))issues.push({row:r.__row,issue:'DUPLICATE_ACCOUNT_ID',accountId,firstRow:ids.get(accountId)});else ids.set(accountId,r.__row);
    if(users.has(username))issues.push({row:r.__row,issue:'DUPLICATE_USERNAME_NORMALIZED',username,firstRow:users.get(username)});else users.set(username,r.__row);
  });
  return {ok:issues.length===0,rows:rows.length,issues};
}

function testAccountsSupabaseAudit(){
  const pre=validateAccountsSheetForMigration_(),sheetRows=readObjects_(DB.ACCOUNTS),sbRows=accountsSbFetchAll_();
  const sMap=new Map(sheetRows.map(r=>{const x=accountComparableSheet_(r);return [x.account_id,x];}));
  const bMap=new Map(sbRows.map(r=>{const x=accountComparableSb_(r);return [x.account_id,x];}));
  const missing=[],conflict=[],extra=[];let consistent=0;
  sMap.forEach((s,id)=>{const b=bMap.get(id);if(!b){missing.push(id);return;}if(JSON.stringify(s)===JSON.stringify(b))consistent++;else conflict.push({accountId:id,username:s.username_normalized,sheet:s,supabase:b});});
  bMap.forEach((_b,id)=>{if(!sMap.has(id))extra.push(id);});
  const ok=pre.ok&&missing.length===0&&conflict.length===0&&extra.length===0&&sheetRows.length===sbRows.length;
  const out={ok,mode:'MIGRATION_AUDIT',primary:'GOOGLE_SHEET',runtimeChanged:false,authRuntimeChanged:false,accounts:{sheet:sheetRows.length,supabase:sbRows.length,consistent,missing:missing.length,conflict:conflict.length,extra:extra.length,missingIds:missing,conflicts:conflict,extraIds:extra},precheck:pre,status:ok?'ACCOUNTS_MIGRATION_AUDIT_OK':'ACCOUNTS_MIGRATION_AUDIT_HAS_ISSUES'};
  console.log('===== Accounts Supabase Audit =====');console.log(JSON.stringify(out,null,2));return out;
}

function accountsSbFindByAccountId_(accountId){
  const cfg=supabaseConfig_(),id=String(accountId||'').trim();
  const url=cfg.url+'/rest/v1/'+ACCOUNTS_SB_TABLE_+'?select=*&account_id=eq.'+encodeURIComponent(id)+'&limit=2';
  const res=UrlFetchApp.fetch(url,{method:'get',headers:accountsSbHeaders_(),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_ACCOUNTS_BY_ID_HTTP_'+status+': '+text);
  let rows=[];try{rows=JSON.parse(text||'[]');}catch(_e){throw new Error('SUPABASE_ACCOUNTS_BY_ID_JSON_INVALID');}
  if(!Array.isArray(rows))throw new Error('SUPABASE_ACCOUNTS_BY_ID_ROWS_INVALID');
  if(rows.length>1)throw new Error('SUPABASE_ACCOUNTS_DUPLICATE_ID:'+id);
  return rows.length?rows[0]:null;
}

function accountsSbRowToLegacyAccount_(r){
  if(!r)return null;
  return {AccountID:String(r.account_id||''),UsernameNormalized:String(r.username_normalized||''),PasswordHash:String(r.password_hash||''),Salt:String(r.salt||''),Nickname:String(r.nickname||''),CreatedAt:r.created_at||'',LastLoginAt:r.last_login_at||'',SaveVersion:r.save_version||'',Disabled:r.disabled===true,RowRevision:Number(r.row_revision)||1};
}

function accountsSbPatchByAccountId_(accountId,patch){
  const cfg=supabaseConfig_(),id=String(accountId||'').trim();
  const res=UrlFetchApp.fetch(cfg.url+'/rest/v1/'+ACCOUNTS_SB_TABLE_+'?account_id=eq.'+encodeURIComponent(id),{method:'patch',contentType:'application/json',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,Prefer:'return=minimal'},payload:JSON.stringify(patch||{}),muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_ACCOUNTS_PATCH_HTTP_'+status+': '+text);
}

function accountsSbDeleteByAccountId_(accountId){
  const cfg=supabaseConfig_(),id=String(accountId||'').trim();
  const res=UrlFetchApp.fetch(cfg.url+'/rest/v1/'+ACCOUNTS_SB_TABLE_+'?account_id=eq.'+encodeURIComponent(id),{method:'delete',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,Prefer:'return=minimal'},muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_ACCOUNTS_DELETE_HTTP_'+status+': '+text);
}

function accountsSheetMirrorFromSbRowSafe_(sbRow,reason){
  // v11.31.58: Runtime Sheet mirror intentionally disabled.
  // Supabase Accounts is the only runtime/auth Primary; Accounts_SCHEMA is snapshot backup only.
  return {ok:true,disabled:true,accountId:String(sbRow&&sbRow.account_id||''),reason:String(reason||'')};
}

const ACCOUNTS_SNAPSHOT_PROP_='ACCOUNTS_LAST_SNAPSHOT_AT';

function accountsSbToSheetObject_(r){
  return {
    AccountID:String(r.account_id||''),
    UsernameNormalized:String(r.username_normalized||''),
    PasswordHash:String(r.password_hash||''),
    Salt:String(r.salt||''),
    Nickname:String(r.nickname||''),
    CreatedAt:r.created_at||'',
    LastLoginAt:r.last_login_at||'',
    SaveVersion:r.save_version==null?'':String(r.save_version),
    Disabled:r.disabled===true,
    RowRevision:Number(r.row_revision)||1
  };
}

function accountsWriteSnapshotSheet_(objects){
  const headers=['AccountID','UsernameNormalized','PasswordHash','Salt','Nickname','CreatedAt','LastLoginAt','SaveVersion','Disabled','RowRevision'];
  let sh=ss_().getSheetByName(DB.ACCOUNTS);
  if(!sh)sh=ss_().insertSheet(DB.ACCOUNTS);
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  const rows=(objects||[]).map(o=>headers.map(h=>o[h]===undefined||o[h]===null?'':o[h]));
  if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  return rows.length;
}

function snapshotAccountsToSheet(){
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    const sbRows=accountsSbFetchAll_();
    const objects=sbRows.map(accountsSbToSheetObject_);
    const count=accountsWriteSnapshotSheet_(objects);
    const now=new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty(ACCOUNTS_SNAPSHOT_PROP_,now);
    const audit=testAccountsSupabaseAudit();
    const out={ok:audit.ok===true,mode:'SUPABASE_TO_SHEET_SNAPSHOT',primary:'SUPABASE',authPrimary:'SUPABASE',sheetRole:'SNAPSHOT_BACKUP_ONLY',runtimeSheetMirror:false,count:count,lastSnapshotAt:now,audit:audit,status:audit.ok===true?'ACCOUNTS_SNAPSHOT_OK':'ACCOUNTS_SNAPSHOT_AUDIT_FAILED'};
    console.log('===== Accounts Snapshot =====');console.log(JSON.stringify(out,null,2));return out;
  }finally{lock.releaseLock();}
}

function installDailyAccountsSnapshotTrigger(){
  const handler='snapshotAccountsToSheet';
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(4).create();
  return testDailyAccountsSnapshotTriggerStatus();
}

function removeDailyAccountsSnapshotTrigger(){
  const handler='snapshotAccountsToSheet';let removed=0;
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>{ScriptApp.deleteTrigger(t);removed++;});
  return {ok:true,removed:removed,handler:handler,status:'ACCOUNTS_DAILY_SNAPSHOT_TRIGGER_REMOVED'};
}

function testDailyAccountsSnapshotTriggerStatus(){
  const handler='snapshotAccountsToSheet';
  const triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler);
  const last=PropertiesService.getScriptProperties().getProperty(ACCOUNTS_SNAPSHOT_PROP_)||'';
  const out={ok:triggers.length===1,primary:'SUPABASE',authPrimary:'SUPABASE',sheetRole:'SNAPSHOT_BACKUP_ONLY',runtimeSheetMirror:false,handler:handler,triggerCount:triggers.length,scriptTimeZone:Session.getScriptTimeZone(),intendedSchedule:'DAILY_AROUND_04:00_SCRIPT_TIMEZONE',lastSnapshotAt:last,status:triggers.length===1?'ACCOUNTS_DAILY_SNAPSHOT_TRIGGER_READY':(triggers.length===0?'ACCOUNTS_DAILY_SNAPSHOT_TRIGGER_MISSING':'ACCOUNTS_DAILY_SNAPSHOT_TRIGGER_DUPLICATED')};
  console.log('===== Accounts Daily Snapshot Trigger Status =====');console.log(JSON.stringify(out,null,2));return out;
}

const WORLD_BOSS_STATE_SB_TABLE_ = 'WorldBossState';

function wbStateIso_(v){
  if(v===null||v===undefined)return null;
  if(v instanceof Date&&!isNaN(v.getTime())){
    const y=v.getUTCFullYear();
    if(y>=2000&&y<=2100)return v.toISOString();
  }
  const s=String(v).trim();
  if(!s)return null;
  // Google Sheets serial date guard. Must run before new Date(s).
  if(/^\d{4,6}(?:\.\d+)?$/.test(s)){
    const serial=Number(s);
    if(Number.isFinite(serial)&&serial>=36526&&serial<=73050){
      const d=new Date(Math.round((serial-25569)*86400000));
      if(!isNaN(d.getTime()))return d.toISOString();
    }
  }
  const d=new Date(s);
  if(!isNaN(d.getTime())){
    const y=d.getUTCFullYear();
    if(y>=2000&&y<=2100)return d.toISOString();
  }
  throw new Error('WORLD_BOSS_STATE_INVALID_DATETIME:'+s);
}

function wbStateSheetToSb_(r){
  return {
    boss_instance_id:String(r.BossInstanceID||'').trim(),
    boss_id:String(r.BossID||'').trim(),
    name:String(r.Name||''),
    max_hp:Math.max(0,Math.trunc(Number(r.MaxHP)||0)),
    current_hp:Math.max(0,Math.trunc(Number(r.CurrentHP)||0)),
    def:Math.trunc(Number(r.DEF)||0),
    patk:Math.trunc(Number(r.PATK)||0),
    matk:Math.trunc(Number(r.MATK)||0),
    spawned_at:wbStateIso_(r.SpawnedAt),
    dead_at:wbStateIso_(r.DeadAt),
    respawn_at:wbStateIso_(r.RespawnAt),
    status:String(r.Status||'ALIVE').trim().toUpperCase(),
    revision:Math.max(1,Math.trunc(Number(r.Revision)||1))
  };
}

function wbStatePrecheck_(){
  const rows=readSheetObjectsRaw_(DB.WORLD_BOSS_STATE),ids=new Set(),issues=[];
  rows.forEach((r,i)=>{
    const rowNo=r.__row||i+2,id=String(r.BossInstanceID||'').trim();
    if(!id)issues.push('ROW_'+rowNo+':BOSS_INSTANCE_ID_MISSING');
    else if(ids.has(id))issues.push('ROW_'+rowNo+':BOSS_INSTANCE_ID_DUPLICATE:'+id);
    else ids.add(id);
    if(!String(r.BossID||'').trim())issues.push('ROW_'+rowNo+':BOSS_ID_MISSING');
    const st=String(r.Status||'').trim().toUpperCase();
    if(st!=='ALIVE'&&st!=='DEAD')issues.push('ROW_'+rowNo+':STATUS_INVALID:'+st);
    try{wbStateSheetToSb_(r);}catch(e){issues.push('ROW_'+rowNo+':'+String(e&&e.message||e));}
  });
  return {ok:issues.length===0,rows:rows.length,issues:issues.slice(0,50)};
}

function wbStateSbFetchAll_(){return wbSbFetchAll_(WORLD_BOSS_STATE_SB_TABLE_);}

function auditWorldBossStateSupabase_(){
  const precheck=wbStatePrecheck_();
  const sheetRows=readSheetObjectsRaw_(DB.WORLD_BOSS_STATE).map(wbStateSheetToSb_),sbRows=wbStateSbFetchAll_();
  const sm=new Map(sheetRows.map(r=>[String(r.boss_instance_id),r])),dm=new Map(sbRows.map(r=>[String(r.boss_instance_id||''),r]));
  let consistent=0,missing=0,conflict=0,extra=0;const missingIds=[],conflicts=[],extraIds=[];
  sm.forEach((row,id)=>{const db=dm.get(id);if(!db){missing++;missingIds.push(id);}else if(wbRowsEqual_(row,db))consistent++;else{conflict++;conflicts.push({id,diff:wbRowDiff_(row,db)});}});
  dm.forEach((_r,id)=>{if(!sm.has(id)){extra++;extraIds.push(id);}});
  const ok=precheck.ok&&missing===0&&conflict===0&&extra===0&&sheetRows.length===sbRows.length;
  return {ok,mode:'MIGRATION_AUDIT',primary:'GOOGLE_SHEET',runtimeChanged:false,state:{sheet:sheetRows.length,supabase:sbRows.length,consistent,missing,conflict,extra},missingIds:missingIds.slice(0,30),conflicts:conflicts.slice(0,20),extraIds:extraIds.slice(0,30),precheck,status:ok?'WORLD_BOSS_STATE_MIGRATION_AUDIT_OK':'WORLD_BOSS_STATE_MIGRATION_AUDIT_MISMATCH'};
}

function wbStateSbDeleteById_(bossInstanceId){
  const id=String(bossInstanceId||'').trim();
  if(!id)return {ok:false,error:'WORLD_BOSS_STATE_ID_MISSING'};
  const cfg=supabaseConfig_();
  const url=cfg.url+'/rest/v1/'+WORLD_BOSS_STATE_SB_TABLE_+'?boss_instance_id=eq.'+encodeURIComponent(id);
  const res=UrlFetchApp.fetch(url,{method:'delete',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,Prefer:'return=minimal'},muteHttpExceptions:true});
  const status=res.getResponseCode(),text=res.getContentText();
  if(status<200||status>=300)throw new Error('SUPABASE_WORLD_BOSS_STATE_DELETE_HTTP_'+status+': '+text);
  return {ok:true,bossInstanceId:id};
}

const WORLD_BOSS_STATE_SNAPSHOT_PROP_ = 'WORLD_BOSS_STATE_LAST_SNAPSHOT_AT';

function worldBossStateWriteSnapshotSheet_(objects){
  const headers=['BossInstanceID','BossID','Name','MaxHP','CurrentHP','DEF','PATK','MATK','SpawnedAt','DeadAt','RespawnAt','Status','Revision'];
  let sh=ss_().getSheetByName(DB.WORLD_BOSS_STATE);
  if(!sh)sh=ss_().insertSheet(DB.WORLD_BOSS_STATE);
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  const rows=(objects||[]).map(o=>headers.map(h=>o[h]===undefined||o[h]===null?'':o[h]));
  if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  return rows.length;
}

function snapshotWorldBossStateToSheet(){
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    const sbRows=wbStateSbFetchAll_();
    const objects=sbRows.map(wbStateSbToSheet_);
    const count=worldBossStateWriteSnapshotSheet_(objects);
    const now=new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty(WORLD_BOSS_STATE_SNAPSHOT_PROP_,now);
    const audit=auditWorldBossStateSupabase_();
    const out={
      ok:audit.ok===true,
      mode:'SUPABASE_TO_SHEET_SNAPSHOT',
      primary:'SUPABASE',
      sheetRole:'SNAPSHOT_BACKUP_ONLY',
      runtimeSheetMirror:false,
      count:count,
      lastSnapshotAt:now,
      audit:audit,
      status:audit.ok===true?'WORLD_BOSS_STATE_SNAPSHOT_OK':'WORLD_BOSS_STATE_SNAPSHOT_AUDIT_FAILED'
    };
    console.log('===== WorldBossState Snapshot =====');
    console.log(JSON.stringify(out,null,2));
    return out;
  }finally{lock.releaseLock();}
}

function installDailyWorldBossStateSnapshotTrigger(){
  const handler='snapshotWorldBossStateToSheet';
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(4).create();
  return testDailyWorldBossStateSnapshotTriggerStatus();
}

function removeDailyWorldBossStateSnapshotTrigger(){
  const handler='snapshotWorldBossStateToSheet';
  let removed=0;
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>{ScriptApp.deleteTrigger(t);removed++;});
  const out={ok:true,removed:removed,handler:handler,status:'WORLD_BOSS_STATE_DAILY_SNAPSHOT_TRIGGER_REMOVED'};
  console.log(JSON.stringify(out,null,2));
  return out;
}

function testDailyWorldBossStateSnapshotTriggerStatus(){
  const handler='snapshotWorldBossStateToSheet';
  const triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler);
  const last=PropertiesService.getScriptProperties().getProperty(WORLD_BOSS_STATE_SNAPSHOT_PROP_)||'';
  const out={
    ok:triggers.length===1,
    primary:'SUPABASE',
    sheetRole:'SNAPSHOT_BACKUP_ONLY',
    runtimeSheetMirror:false,
    handler:handler,
    triggerCount:triggers.length,
    scriptTimeZone:Session.getScriptTimeZone(),
    intendedSchedule:'DAILY_AROUND_04:00_SCRIPT_TIMEZONE',
    lastSnapshotAt:last,
    status:triggers.length===1?'WORLD_BOSS_STATE_DAILY_SNAPSHOT_TRIGGER_READY':
      (triggers.length===0?'WORLD_BOSS_STATE_DAILY_SNAPSHOT_TRIGGER_MISSING':'WORLD_BOSS_STATE_DAILY_SNAPSHOT_TRIGGER_DUPLICATED')
  };
  console.log('===== WorldBossState Daily Snapshot Trigger Status =====');
  console.log(JSON.stringify(out,null,2));
  return out;
}

const AUCTION_WB_RUNTIME_SNAPSHOT_PROP_='AUCTION_WB_RUNTIME_LAST_SNAPSHOT_AT';

function writeSnapshotObjects_(sheetName,headers,objects){
  let sh=ss_().getSheetByName(sheetName);
  if(!sh)sh=ss_().insertSheet(sheetName);
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  const rows=(objects||[]).map(o=>headers.map(h=>o[h]===undefined||o[h]===null?'':o[h]));
  if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  return rows.length;
}

function snapshotAuctionWorldBossRuntimeToSheets(){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const auction=auctionSbAllRows_().map(auctionSbToSheetRow_);
    const attempts=wbSbFetchAll_('WorldBossAttempts').map(wbAttemptSbToSheet_);
    const rewards=wbSbFetchAll_('WorldBossRewards').map(wbRewardSbToSheet_);

    const auctionCount=writeSnapshotObjects_(DB.AUCTION,
      ['ListingID','SellerAccountID','SellerNickname','ItemType','ItemTemplateID','ItemInstanceJSON','AskGold','FeeRate','Status','CreatedAt','BuyerAccountID','SoldAt','FeeGold','SellerNetGold','PayoutMode','ClaimStatus','ClaimedAt','Revision'],
      auction);
    const attemptCount=writeSnapshotObjects_(DB.WORLD_BOSS_ATTEMPTS,
      ['ChallengeID','BossInstanceID','AccountID','Nickname','DateKey','AttemptNo','StartedAt','SubmittedAt','Damage','Status'],
      attempts);
    const rewardCount=writeSnapshotObjects_(DB.WORLD_BOSS_REWARDS,
      ['RewardID','BossInstanceID','AccountID','Nickname','Rank','ChestType','Status','CreatedAt','OpenedAt','Gold','Stones','GemAwarded','RewardGoldMin','RewardGoldMax','RewardStones','RewardGemRate','RewardGemID','RewardGemSnapshotJSON'],
      rewards);

    const now=new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty(AUCTION_WB_RUNTIME_SNAPSHOT_PROP_,now);
    const out={ok:true,primary:'SUPABASE',sheetRole:'SNAPSHOT_BACKUP_ONLY',runtimeSheetMirror:false,
      counts:{auction:auctionCount,worldBossAttempts:attemptCount,worldBossRewards:rewardCount},
      lastSnapshotAt:now,status:'AUCTION_WB_RUNTIME_SNAPSHOT_OK'};
    console.log(JSON.stringify(out,null,2));return out;
  }finally{lock.releaseLock();}
}

function installDailyAuctionWorldBossRuntimeSnapshotTrigger(){
  const handler='snapshotAuctionWorldBossRuntimeToSheets';
  ScriptApp.getProjectTriggers().filter(x=>x.getHandlerFunction()===handler).forEach(x=>ScriptApp.deleteTrigger(x));
  ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(4).create();
  return testDailyAuctionWorldBossRuntimeSnapshotTriggerStatus();
}

function testDailyAuctionWorldBossRuntimeSnapshotTriggerStatus(){
  const handler='snapshotAuctionWorldBossRuntimeToSheets';
  const n=ScriptApp.getProjectTriggers().filter(x=>x.getHandlerFunction()===handler).length;
  const out={ok:n===1,handler:handler,triggerCount:n,primary:'SUPABASE',sheetRole:'SNAPSHOT_BACKUP_ONLY',
    runtimeSheetMirror:false,lastSnapshotAt:PropertiesService.getScriptProperties().getProperty(AUCTION_WB_RUNTIME_SNAPSHOT_PROP_)||'',
    status:n===1?'AUCTION_WB_DAILY_SNAPSHOT_TRIGGER_READY':(n===0?'AUCTION_WB_DAILY_SNAPSHOT_TRIGGER_MISSING':'AUCTION_WB_DAILY_SNAPSHOT_TRIGGER_DUPLICATED')};
  console.log(JSON.stringify(out,null,2));return out;
}

const PLAYER_SAVES_SNAPSHOT_PROP_='PLAYER_SAVES_LAST_SNAPSHOT_AT';

function playerSavesSbFetchAll_(){
  const cfg=supabaseConfig_(),pageSize=500;
  let offset=0,out=[];
  while(true){
    const url=cfg.url+'/rest/v1/PlayerSaves?select=account_id,revision,save_json,level,max_cleared,nickname,updated_at&order=account_id.asc&limit='+pageSize+'&offset='+offset;
    const res=UrlFetchApp.fetch(url,{method:'get',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},muteHttpExceptions:true});
    const status=res.getResponseCode(),body=res.getContentText();
    if(status<200||status>=300)throw new Error('SUPABASE_PLAYER_SAVES_FETCH_ALL_HTTP_'+status+': '+body);
    let rows=[];try{rows=JSON.parse(body||'[]');}catch(_e){throw new Error('SUPABASE_PLAYER_SAVES_FETCH_ALL_JSON_INVALID');}
    if(!Array.isArray(rows))throw new Error('SUPABASE_PLAYER_SAVES_FETCH_ALL_ROWS_INVALID');
    out=out.concat(rows);
    if(rows.length<pageSize)break;
    offset+=rows.length;
  }
  return out;
}

function auditPlayerSavesForSnapshot(){
  const rows=playerSavesSbFetchAll_();
  const invalid=[],valid=[];
  rows.forEach(r=>{
    const accountId=String(r.account_id||'').trim();
    const revision=Number(r.revision)||1;
    const nickname=String(r.nickname||'');
    try{
      if(!accountId)throw new Error('ACCOUNT_ID_MISSING');
      const save=(r.save_json&&typeof r.save_json==='object'&&!Array.isArray(r.save_json))?r.save_json:null;
      if(!save)throw new Error('SUPABASE_PLAYER_SAVE_JSON_INVALID');
      sanitizeIncomingSave_(save);
      validateStoredSaveShape_(save);
      valid.push({accountId:accountId,revision:revision,nickname:nickname});
    }catch(err){
      const save=(r.save_json&&typeof r.save_json==='object'&&!Array.isArray(r.save_json))?r.save_json:null;
      invalid.push({
        accountId:accountId,
        revision:revision,
        nickname:nickname,
        error:String(err&&err.message||err),
        hasLevel:!!(save&&Object.prototype.hasOwnProperty.call(save,'level')),
        hasBase:!!(save&&save.base&&typeof save.base==='object'&&!Array.isArray(save.base)),
        hasInventory:!!(save&&Array.isArray(save.inventory)),
        hasEquipment:!!(save&&save.equipment&&typeof save.equipment==='object'&&!Array.isArray(save.equipment)),
        hasSkillsOwned:!!(save&&Array.isArray(save.skillsOwned))
      });
    }
  });
  const out={
    ok:invalid.length===0,
    total:rows.length,
    valid:valid.length,
    invalid:invalid.length,
    invalidRows:invalid,
    status:invalid.length===0?'PLAYER_SAVES_SNAPSHOT_PREFLIGHT_OK':'PLAYER_SAVES_SNAPSHOT_PREFLIGHT_HAS_INVALID_SAVES'
  };
  console.log('===== PlayerSaves Snapshot Preflight Audit =====');
  console.log(JSON.stringify(out,null,2));
  return out;
}

function snapshotPlayerSavesToSheet(){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const rows=playerSavesSbFetchAll_();

    // v11.31.69b SAFE PREFLIGHT:
    // Validate EVERY Supabase PlayerSave before touching PlayerSaves_SCHEMA.
    const invalid=[];
    rows.forEach(r=>{
      const accountId=String(r.account_id||'').trim();
      try{
        if(!accountId)throw new Error('ACCOUNT_ID_MISSING');
        const save=(r.save_json&&typeof r.save_json==='object'&&!Array.isArray(r.save_json))?r.save_json:null;
        if(!save)throw new Error('SUPABASE_PLAYER_SAVE_JSON_INVALID');
        sanitizeIncomingSave_(save);
        validateStoredSaveShape_(save);
      }catch(err){
        invalid.push({
          accountId:accountId,
          revision:Number(r.revision)||1,
          nickname:String(r.nickname||''),
          error:String(err&&err.message||err)
        });
      }
    });

    if(invalid.length){
      const out={
        ok:false,
        committed:false,
        primary:'SUPABASE',
        sheetRole:'SNAPSHOT_BACKUP_ONLY',
        runtimeSheetBackup:false,
        total:rows.length,
        invalid:invalid.length,
        invalidRows:invalid,
        status:'PLAYER_SAVES_SNAPSHOT_ABORTED_PREFLIGHT_FAILED'
      };
      console.error('===== PlayerSaves Snapshot ABORTED: Sheet NOT touched =====');
      console.error(JSON.stringify(out,null,2));
      return out;
    }

    // Only after ALL rows pass preflight may the snapshot sheet be rebuilt.
    const sh=ss_().getSheetByName(DB.SAVES);
    if(!sh)throw new Error('SHEET_NOT_FOUND:'+DB.SAVES);
    if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,sh.getMaxColumns()).clearContent();

    let written=0;
    rows.forEach(r=>{
      const accountId=String(r.account_id||'').trim();
      writeGoogleSheetSaveBackup_(accountId,Number(r.revision)||1,r.save_json);
      written++;
    });

    const now=new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty(PLAYER_SAVES_SNAPSHOT_PROP_,now);
    const out={
      ok:true,
      committed:true,
      primary:'SUPABASE',
      sheetRole:'SNAPSHOT_BACKUP_ONLY',
      runtimeSheetBackup:false,
      supabaseRows:rows.length,
      snapshotRows:written,
      lastSnapshotAt:now,
      status:'PLAYER_SAVES_SNAPSHOT_OK'
    };
    console.log(JSON.stringify(out,null,2));
    return out;
  }finally{
    lock.releaseLock();
  }
}

function installDailyPlayerSavesSnapshotTrigger(){
  const handler='snapshotPlayerSavesToSheet';
  ScriptApp.getProjectTriggers().filter(x=>x.getHandlerFunction()===handler).forEach(x=>ScriptApp.deleteTrigger(x));
  ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(4).create();
  return testDailyPlayerSavesSnapshotTriggerStatus();
}

function testDailyPlayerSavesSnapshotTriggerStatus(){
  const handler='snapshotPlayerSavesToSheet';
  const n=ScriptApp.getProjectTriggers().filter(x=>x.getHandlerFunction()===handler).length;
  const out={ok:n===1,handler:handler,triggerCount:n,primary:'SUPABASE',sheetRole:'SNAPSHOT_BACKUP_ONLY',
    runtimeSheetBackup:false,lastSnapshotAt:PropertiesService.getScriptProperties().getProperty(PLAYER_SAVES_SNAPSHOT_PROP_)||'',
    status:n===1?'PLAYER_SAVES_DAILY_SNAPSHOT_TRIGGER_READY':(n===0?'PLAYER_SAVES_DAILY_SNAPSHOT_TRIGGER_MISSING':'PLAYER_SAVES_DAILY_SNAPSHOT_TRIGGER_DUPLICATED')};
  console.log(JSON.stringify(out,null,2));return out;
}

// ============================================================
// 05｜舊競技場相容功能
// ============================================================

const ARENA_SEASON_ANCHOR_TW_='2026-09-28';

const ARENA_SEASON_DAYS_=7;

const ARENA_START_POINTS_=10;

const ARENA_LEVEL_=250;

function arenaSbHeaders_(prefer){
  const cfg=supabaseConfig_(),h={apikey:cfg.key,Authorization:'Bearer '+cfg.key};
  if(prefer)h.Prefer=prefer;
  return h;
}

function arenaSbRequest_(method,table,query,payload,prefer){
  const cfg=supabaseConfig_();
  const qs=String(query||'').replace(/^\?/,'');
  const url=cfg.url+'/rest/v1/'+table+(qs?'?'+qs:'');
  const opt={method:method,headers:arenaSbHeaders_(prefer),muteHttpExceptions:true};
  if(payload!==undefined){opt.contentType='application/json';opt.payload=JSON.stringify(payload);}
  const res=UrlFetchApp.fetch(url,opt),status=res.getResponseCode(),raw=res.getContentText();
  if(status<200||status>=300)throw new Error('ARENA_SUPABASE_'+table+'_HTTP_'+status+': '+raw);
  if(!raw)return null;
  try{return JSON.parse(raw)}catch(_e){return raw}
}

function arenaEq_(v){return encodeURIComponent('eq.'+String(v))}

function arenaTaipeiParts_(ms){
  const d=new Date(ms==null?Date.now():ms);
  return {
    date:Utilities.formatDate(d,'Asia/Taipei','yyyy-MM-dd'),
    stamp:Utilities.formatDate(d,'Asia/Taipei','yyyy-MM-dd HH:mm:ss')
  };
}

function arenaTwDateMs_(ymd){
  const m=String(ymd||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)throw new Error('ARENA_DATE_INVALID');
  return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),-8,0,0,0);
}

function arenaSeasonInfo_(){
  const now=Date.now(),anchor=arenaTwDateMs_(ARENA_SEASON_ANCHOR_TW_),span=ARENA_SEASON_DAYS_*86400000;
  const idx=Math.max(0,Math.floor((now-anchor)/span));
  const start=anchor+idx*span,end=start+span;
  const startKey=arenaTaipeiParts_(start).date,endKey=arenaTaipeiParts_(end-1).date;
  return {
    seasonId:'ARENA_'+startKey.replace(/-/g,''),
    startAt:new Date(start).toISOString(),
    endAt:new Date(end).toISOString(),
    startDate:startKey,endDate:endKey,
    status:now>=start&&now<end?'ACTIVE':now<start?'UPCOMING':'ENDED'
  };
}

function arenaTodayKey_(){return arenaTaipeiParts_().date}

function arenaAccountNickname_(accountId){
  try{
    const a=runtimeAccountById_(accountId);
    if(a&&a.Nickname)return String(a.Nickname);
  }catch(_e){}
  try{
    const r=supabasePrimaryReadRow_(accountId);
    if(r&&r.nickname)return String(r.nickname);
  }catch(_e){}
  return '冒險者';
}

function arenaPlayerRow_(seasonId,accountId){
  const rows=arenaSbRequest_('get','ArenaPlayers',
    'season_id='+arenaEq_(seasonId)+'&account_id='+arenaEq_(accountId)+'&select=*');
  return Array.isArray(rows)&&rows.length?rows[0]:null;
}

function arenaEnsurePlayer_(season,accountId,nickname){
  let row=arenaPlayerRow_(season.seasonId,accountId);
  if(row)return row;
  const payload={season_id:season.seasonId,account_id:accountId,nickname:String(nickname||'冒險者'),
    points:ARENA_START_POINTS_,wins:0,losses:0,draws:0,total_damage:0,
    reached_points_at:new Date().toISOString(),joined_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const out=arenaSbRequest_('post','ArenaPlayers','',payload,'resolution=ignore-duplicates,return=representation');
  row=Array.isArray(out)&&out.length?out[0]:arenaPlayerRow_(season.seasonId,accountId);
  if(!row)throw new Error('ARENA_PLAYER_CREATE_FAILED');
  return row;
}

function arenaCurrentDefense_(seasonId,accountId){
  const rows=arenaSbRequest_('get','ArenaDefenseSnapshots',
    'season_id='+arenaEq_(seasonId)+'&account_id='+arenaEq_(accountId)+'&is_current=eq.true&select=*&limit=1');
  return Array.isArray(rows)&&rows.length?rows[0]:null;
}

function arenaDefenseSnapshotById_(seasonId,accountId,snapshotId){
  if(!snapshotId)return null;
  const rows=arenaSbRequest_('get','ArenaDefenseSnapshots',
    'snapshot_id='+arenaEq_(snapshotId)+'&season_id='+arenaEq_(seasonId)+'&account_id='+arenaEq_(accountId)+'&select=*&limit=1');
  return Array.isArray(rows)&&rows.length?rows[0]:null;
}

function arenaStableJson_(v){
  if(v===null||typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(arenaStableJson_).join(',')+']';
  return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+arenaStableJson_(v[k])).join(',')+'}';
}

function arenaHash_(obj){
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,arenaStableJson_(obj),Utilities.Charset.UTF_8);
  return bytes.map(b=>('0'+((b<0?b+256:b).toString(16))).slice(-2)).join('');
}

function arenaValidateDefenseSnapshot_(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('ARENA_DEFENSE_INVALID');
  const s=JSON.parse(JSON.stringify(raw));
  s.arenaLevel=ARENA_LEVEL_;
  if(!s.stats||typeof s.stats!=='object'||Array.isArray(s.stats))throw new Error('ARENA_DEFENSE_STATS_REQUIRED');
  if(!s.equipment||typeof s.equipment!=='object'||Array.isArray(s.equipment))throw new Error('ARENA_DEFENSE_EQUIPMENT_REQUIRED');
  if(!s.gems||typeof s.gems!=='object'||Array.isArray(s.gems))throw new Error('ARENA_DEFENSE_GEMS_REQUIRED');
  if(!Array.isArray(s.skills))throw new Error('ARENA_DEFENSE_SKILLS_REQUIRED');
  if(!Array.isArray(s.ai))throw new Error('ARENA_DEFENSE_AI_REQUIRED');
  if(s.skills.length>3)throw new Error('ARENA_DEFENSE_SKILLS_MAX_3');
  const allowed=new Set(['ALWAYS','SELF_HP_LE_75','SELF_HP_LE_50','SELF_HP_LE_25','ENEMY_HP_LE_50','ENEMY_HP_LE_25','SELF_HAS_STATUS','ENEMY_NO_STATUS','SELF_NO_BUFF','ENEMY_NO_DEBUFF']);
  const seen=new Set();
  s.ai=s.ai.map((x,i)=>{
    if(!x||typeof x!=='object')throw new Error('ARENA_DEFENSE_AI_INVALID');
    const priority=Math.trunc(Number(x.priority)||i+1),skill=String(x.skill||''),condition=String(x.condition||'ALWAYS');
    if(priority<1||priority>3||seen.has(priority))throw new Error('ARENA_DEFENSE_AI_PRIORITY_INVALID');
    if(skill&&!s.skills.map(String).includes(skill))throw new Error('ARENA_DEFENSE_AI_SKILL_INVALID');
    if(!allowed.has(condition))throw new Error('ARENA_DEFENSE_AI_CONDITION_INVALID');
    seen.add(priority);return {skill:skill,priority:priority,condition:condition};
  }).sort((a,b)=>a.priority-b.priority);
  return s;
}

function arenaUploadDefense_(body){
  const auth=requireAuth_(body.sessionToken),season=arenaSeasonInfo_();
  if(season.status!=='ACTIVE')return {ok:false,error:'ARENA_SEASON_NOT_ACTIVE',season:season};
  const nickname=arenaAccountNickname_(auth.accountId),player=arenaEnsurePlayer_(season,auth.accountId,nickname);
  const snapshot=arenaValidateDefenseSnapshot_(body.snapshot),hash=arenaHash_(snapshot),now=new Date().toISOString();
  const old=arenaCurrentDefense_(season.seasonId,auth.accountId);
  if(old&&String(old.snapshot_hash||'')===hash){
    return {ok:true,unchanged:true,season:season,player:player,snapshotId:String(old.snapshot_id),snapshotHash:hash};
  }
  if(old){
    arenaSbRequest_('patch','ArenaDefenseSnapshots','snapshot_id='+arenaEq_(old.snapshot_id),{is_current:false},'return=minimal');
  }
  const rows=arenaSbRequest_('post','ArenaDefenseSnapshots','',{
    season_id:season.seasonId,account_id:auth.accountId,nickname:nickname,arena_level:ARENA_LEVEL_,
    snapshot_json:snapshot,snapshot_hash:hash,is_current:true,created_at:now
  },'return=representation');
  const created=Array.isArray(rows)&&rows.length?rows[0]:arenaCurrentDefense_(season.seasonId,auth.accountId);
  if(!created)throw new Error('ARENA_DEFENSE_CREATE_FAILED');
  arenaSbRequest_('patch','ArenaPlayers',
    'season_id='+arenaEq_(season.seasonId)+'&account_id='+arenaEq_(auth.accountId),
    {nickname:nickname,defense_snapshot_id:created.snapshot_id,updated_at:now},'return=minimal');
  return {ok:true,season:season,snapshotId:String(created.snapshot_id),snapshotHash:hash};
}

function arenaPreviousSeasonInfo_(){
  const cur=arenaSeasonInfo_(),span=ARENA_SEASON_DAYS_*86400000,start=new Date(cur.startAt).getTime()-span,end=new Date(cur.startAt).getTime();
  const startKey=arenaTaipeiParts_(start).date,endKey=arenaTaipeiParts_(end-1).date;
  return {seasonId:'ARENA_'+startKey.replace(/-/g,''),startAt:new Date(start).toISOString(),endAt:new Date(end).toISOString(),startDate:startKey,endDate:endKey,status:'ENDED'};
}

function arenaRewardBundleForRank_(rank){
  rank=Math.max(1,Math.trunc(Number(rank)||0));
  if(rank===1)return {armorId:'gloryArmor1',gemId:'gloryGem',gold:5000};
  if(rank===2)return {armorId:'gloryArmor1',gemId:'gloryGem',gold:3000};
  if(rank===3)return {armorId:'gloryArmor1',gemId:'gloryGem',gold:2000};
  if(rank<=10)return {armorId:'gloryArmor0',gemId:'',gold:1000};
  return {armorId:'',gemId:'',gold:500};
}

function arenaFinalRank_(seasonId,accountId){
  const rows=arenaSbRequest_('get','ArenaPlayers','season_id='+arenaEq_(seasonId)+'&select=account_id,nickname,points,wins,losses,draws,total_damage,reached_points_at&order=points.desc,wins.desc,total_damage.desc,reached_points_at.asc');
  const i=(Array.isArray(rows)?rows:[]).findIndex(r=>String(r.account_id)===String(accountId));
  return i>=0?i+1:0;
}

function arenaPendingReward_(accountId,save){
  const prev=arenaPreviousSeasonInfo_(),rank=arenaFinalRank_(prev.seasonId,accountId);if(rank<=0)return null;
  const receiptKey=prev.seasonId;if(hasServerReceipt_(save||{},'arena',receiptKey))return null;
  return {seasonId:prev.seasonId,rank:rank,...arenaRewardBundleForRank_(rank)};
}

function arenaFallbackEquipment_(id){
  const sockets=id==='gloryArmor1'?1:0;
  return {id:'ITM_'+Utilities.getUuid().replace(/-/g,''),template:id,name:'榮耀鎧甲',rarity:'傳說',slot:'armor',price:0,stats:{hp:150,def:50,patk:5,matk:5},sockets:sockets,enhance:0,gems:Array(sockets).fill(null),effect:'afterhit_block_10_once_per_turn'};
}

function arenaFallbackGem_(){
  return {id:'GEM_'+Utilities.getUuid().replace(/-/g,''),template:'gloryGem',name:'榮耀寶石',price:1000,stats:{hp:150,patk:3,matk:3,crit:3,critDamage:3},boss:false,effect:'fullhp_critdamage_10',visualColor:'gold'};
}

function arenaClaimReward_(body){
  const auth=requireAuth_(body.sessionToken),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const saveRec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);if(!saveRec)return {ok:false,error:'SAVE_NOT_FOUND'};
    requireTransactionSaveRevision_(body,saveRec);let save=parseSaveRecord_(saveRec);
    const prev=arenaPreviousSeasonInfo_(),requested=String(body.seasonId||prev.seasonId);
    if(requested!==prev.seasonId)return {ok:false,error:'ARENA_REWARD_SEASON_INVALID'};
    const rank=arenaFinalRank_(prev.seasonId,auth.accountId);if(rank<=0)return {ok:false,error:'ARENA_REWARD_NOT_ELIGIBLE',message:'上一季沒有競技場排名紀錄。'};
    if(hasServerReceipt_(save,'arena',prev.seasonId))return {ok:false,error:'ARENA_REWARD_ALREADY_CLAIMED',message:'此賽季競技場獎勵已領取。'};
    const rw=arenaRewardBundleForRank_(rank),texts=[];
    save.inventory=Array.isArray(save.inventory)?save.inventory:[];save.gems=Array.isArray(save.gems)?save.gems:[];
    if(rw.armorId){const row=equipmentRowById_(rw.armorId);save.inventory.push(row?makeEquipmentInstanceFromRow_(row):arenaFallbackEquipment_(rw.armorId));texts.push(`榮耀鎧甲（${rw.armorId==='gloryArmor1'?'1':'0'}洞） ×1`);}
    if(rw.gemId){const row=gemRowById_(rw.gemId);save.gems.push(row?makeGemInstanceFromRow_(row):arenaFallbackGem_());texts.push('榮耀寶石 ×1');}
    if(rw.gold>0){save.gold=(Number(save.gold)||0)+rw.gold;texts.push(`金幣 ×${rw.gold}`);}
    addServerReceipt_(save,'arena',prev.seasonId);
    const revision=(Number(saveRec.Revision)||1)+1;writeFullSave_(auth.accountId,revision,save);
    const verified=verifyReceiptAfterWrite_(auth.accountId,'arena',prev.seasonId),latest=findRowByValue_(DB.SAVES,'AccountID',auth.accountId);
    return {ok:true,seasonId:prev.seasonId,rank:rank,rewardText:texts.join('、'),revision:Number(latest?.Revision)||revision,save:verified.save};
  }finally{lock.releaseLock();}
}

function arenaStatus_(body){
  const auth=requireAuth_(body.sessionToken),season=arenaSeasonInfo_(),nickname=arenaAccountNickname_(auth.accountId);
  const player=arenaEnsurePlayer_(season,auth.accountId,nickname),defense=arenaCurrentDefense_(season.seasonId,auth.accountId);
  const saveRec=findRowByValue_(DB.SAVES,'AccountID',auth.accountId),save=saveRec?parseSaveRecord_(saveRec):{};
  return {ok:true,season:season,todayKey:arenaTodayKey_(),arenaLevel:ARENA_LEVEL_,
    canChallenge:!!defense,needsDefense:!defense,pendingReward:arenaPendingReward_(auth.accountId,save),
    player:{points:Number(player.points)||0,wins:Number(player.wins)||0,losses:Number(player.losses)||0,
      draws:Number(player.draws)||0,totalDamage:Number(player.total_damage)||0},
    defense:defense?{snapshotId:String(defense.snapshot_id),snapshotHash:String(defense.snapshot_hash),uploadedAt:String(defense.created_at||''),snapshot:defense.snapshot_json||null}:null};
}

function arenaRanking_(body){
  const auth=requireAuth_(body.sessionToken),season=arenaSeasonInfo_(),limit=Math.max(10,Math.min(100,Number(body.limit)||100));
  const rows=arenaSbRequest_('get','ArenaPlayers','season_id='+arenaEq_(season.seasonId)+'&select=account_id,nickname,points,wins,losses,draws,total_damage,reached_points_at&order=points.desc,wins.desc,total_damage.desc,reached_points_at.asc&limit='+limit);
  const all=Array.isArray(rows)?rows:[],ranked=all.map((r,i)=>({rank:i+1,nickname:String(r.nickname||'冒險者'),points:Number(r.points)||0,wins:Number(r.wins)||0,losses:Number(r.losses)||0,draws:Number(r.draws)||0,totalDamage:Number(r.total_damage)||0,isSelf:String(r.account_id)===String(auth.accountId)}));
  let mine=ranked.find(r=>r.isSelf)||null;
  if(!mine){
    const own=arenaSbRequest_('get','ArenaPlayers','season_id='+arenaEq_(season.seasonId)+'&account_id='+arenaEq_(auth.accountId)+'&select=account_id,nickname,points,wins,losses,draws,total_damage,reached_points_at&limit=1');
    if(Array.isArray(own)&&own.length){
      const me=own[0],better=arenaSbRequest_('get','ArenaPlayers','season_id='+arenaEq_(season.seasonId)+'&points=gt.'+(Number(me.points)||0)+'&select=account_id');
      mine={rank:(Array.isArray(better)?better.length:0)+1,nickname:String(me.nickname||'冒險者'),points:Number(me.points)||0,wins:Number(me.wins)||0,losses:Number(me.losses)||0,draws:Number(me.draws)||0,totalDamage:Number(me.total_damage)||0,isSelf:true};
    }
  }
  return {ok:true,season:season,rows:ranked,myRank:mine};
}

function arenaCandidateRows_(seasonId,selfId){
  const rows=arenaSbRequest_('get','ArenaPlayers','season_id='+arenaEq_(seasonId)+'&select=account_id,nickname,points,defense_snapshot_id');
  return (Array.isArray(rows)?rows:[]).filter(r=>String(r.account_id)!==String(selfId)&&r.defense_snapshot_id);
}

function arenaPickCandidate_(pool,used,min,max){
  const eligible=pool.filter(r=>!used.has(String(r.account_id))&&Number(r.points)>=min&&Number(r.points)<=max);
  if(!eligible.length)return null;
  const i=Math.floor(Math.random()*eligible.length);
  return eligible[i];
}

function arenaPickWithWiden_(pool,used,p,min,max){
  let x=arenaPickCandidate_(pool,used,Math.max(0,min),Math.max(0,max));if(x)return x;
  x=arenaPickCandidate_(pool,used,Math.max(0,p-5),p+5);if(x)return x;
  x=arenaPickCandidate_(pool,used,Math.max(0,p-10),p+10);if(x)return x;
  const rest=pool.filter(r=>!used.has(String(r.account_id)));return rest.length?rest[Math.floor(Math.random()*rest.length)]:null;
}

function arenaNpcForSlot_(slot,p,seed=''){
 const rows=arenaNpcRows140_(),ordered=[];
 for(let i=0;i<6;i++)for(const id of [ARENA_NPC_BUILDS140_[i].NpcID,ARENA_NPC_BUILDS140_[i+6].NpcID]){const r=rows.find(x=>x.NpcID===id);if(r)ordered.push(r);}
 for(const row of rows)if(!ordered.some(x=>x.NpcID===row.NpcID))ordered.push(row);
 if(!ordered.length)throw Error('ARENA_NPC_POOL_EMPTY');
 let hash=0;for(const ch of String(seed))hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;
 const row=ordered[(hash+Math.max(0,Number(slot)-1))%ordered.length],delta=[-2,0,1,3,5][Number(slot)-1]||0;
 return {npcId:row.NpcID,nickname:String(row.Name||row.NpcID),points:Math.max(0,Number(p)+delta)};
}

function arenaExistingMatches_(seasonId,dateKey,accountId){
  const rows=arenaSbRequest_('get','ArenaDailyMatches',
    'season_id='+arenaEq_(seasonId)+'&daily_key='+arenaEq_(dateKey)+'&account_id='+arenaEq_(accountId)+'&select=*&order=slot_no.asc');
  return Array.isArray(rows)?rows:[];
}

function arenaPublicMatches_(rows){
  return rows.map(r=>{
    const mid=String(r.match_id),bs=arenaSbRequest_('get','ArenaBattles','daily_match_id='+arenaEq_(mid)+'&select=battle_id,status,result');
    const attempts=(Array.isArray(bs)?bs:[]).filter(x=>String(x.status)==='SETTLED').length;
    return {matchId:mid,slot:Number(r.slot_no),type:String(r.opponent_type),
      nickname:String(r.opponent_nickname||''),points:Number(r.opponent_points_at_match)||0,
      challenged:r.challenged===true,attempts:attempts,battleId:r.battle_id?String(r.battle_id):''};
  });
}

function arenaGetDailyMatches_(body){
  const auth=requireAuth_(body.sessionToken),season=arenaSeasonInfo_(),today=arenaTodayKey_(),nickname=arenaAccountNickname_(auth.accountId);
  const player=arenaEnsurePlayer_(season,auth.accountId,nickname),defense=arenaCurrentDefense_(season.seasonId,auth.accountId);
  if(!defense)return {ok:false,error:'ARENA_DEFENSE_REQUIRED',needsDefense:true,season:season,todayKey:today,matches:[]};
  let rows=arenaExistingMatches_(season.seasonId,today,auth.accountId);
  if(rows.length===5)return {ok:true,season:season,todayKey:today,points:Number(player.points)||0,matches:arenaPublicMatches_(rows)};
  if(rows.length>0)throw new Error('ARENA_DAILY_MATCH_PARTIAL_STATE');

  const p=Math.max(0,Number(player.points)||0),pool=arenaCandidateRows_(season.seasonId,auth.accountId),used=new Set();
  const ranges=[[p-4,p-1],[p-2,p+2],[p-2,p+2],[p+1,p+4],[p+3,p+8]],payload=[];
  for(let slot=1;slot<=5;slot++){
    const rg=ranges[slot-1],c=arenaPickWithWiden_(pool,used,p,rg[0],rg[1]);
    if(c){
      used.add(String(c.account_id));
      payload.push({season_id:season.seasonId,daily_key:today,account_id:auth.accountId,slot_no:slot,
        opponent_type:'PLAYER',opponent_account_id:String(c.account_id),opponent_npc_id:null,
        opponent_nickname:String(c.nickname||'冒險者'),opponent_points_at_match:Math.max(0,Number(c.points)||0),
        opponent_snapshot_id:c.defense_snapshot_id,challenged:false,created_at:new Date().toISOString()});
    }else{
      const n=arenaNpcForSlot_(slot,p,today+'|'+auth.accountId);
      payload.push({season_id:season.seasonId,daily_key:today,account_id:auth.accountId,slot_no:slot,
        opponent_type:'NPC',opponent_account_id:null,opponent_npc_id:n.npcId,
        opponent_nickname:n.nickname,opponent_points_at_match:n.points,opponent_snapshot_id:null,
        challenged:false,created_at:new Date().toISOString()});
    }
  }
  arenaSbRequest_('post','ArenaDailyMatches','',payload,'resolution=ignore-duplicates,return=minimal');
  rows=arenaExistingMatches_(season.seasonId,today,auth.accountId);
  if(rows.length!==5)throw new Error('ARENA_DAILY_MATCH_CREATE_FAILED');
  return {ok:true,season:season,todayKey:today,points:p,matches:arenaPublicMatches_(rows)};
}

function arenaOne_(table,query){
  const r=arenaSbRequest_('get',table,query);
  return Array.isArray(r)&&r.length?r[0]:null;
}

function arenaPatch_(table,query,payload){
  return arenaSbRequest_('patch',table,query,payload,'return=representation');
}

function arenaBattleRow_(battleId){
  return arenaOne_('ArenaBattles','battle_id='+arenaEq_(battleId)+'&select=*');
}

function arenaBuildAttackSnapshot_(accountId,body){
  // Client chooses one of the player's existing 3 configs. Server also keeps raw selection
  // for later stronger validation. No new Arena inventory/loadout is created.
  const idx=Math.max(0,Math.min(2,Math.trunc(Number(body.configIndex)||0)));
  const supplied=body.attackSnapshot;
  if(!supplied||typeof supplied!=='object'||Array.isArray(supplied))throw new Error('ARENA_ATTACK_SNAPSHOT_REQUIRED');
  const s=JSON.parse(JSON.stringify(supplied));
  s.arenaLevel=ARENA_LEVEL_;s.configIndex=idx;
  if(!s.stats||typeof s.stats!=='object')throw new Error('ARENA_ATTACK_STATS_REQUIRED');
  if(!s.equipment||typeof s.equipment!=='object')throw new Error('ARENA_ATTACK_EQUIPMENT_REQUIRED');
  if(!s.gems||typeof s.gems!=='object')throw new Error('ARENA_ATTACK_GEMS_REQUIRED');
  if(!Array.isArray(s.skills))throw new Error('ARENA_ATTACK_SKILLS_REQUIRED');
  if(s.skills.length>3)throw new Error('ARENA_ATTACK_SKILLS_MAX_3');
  return s;
}

function arenaNpcSnapshot_(npcId,points){
  // Phase 2 fallback NPC battle snapshot. Equipment/skills are intentionally data-light here.
  // Formal builds will be replaced by ArenaNPC planning rows in the next phase.
  const p=Math.max(0,Number(points)||0),scale=1+Math.min(2,p/50);
  const archetype=String(npcId||'arena_balanced');
  const base={arenaLevel:250,npcId:archetype,stats:{hp:Math.round(2200*scale),patk:Math.round(260*scale),
    matk:Math.round(220*scale),def:Math.round(650*scale),crit:25,critDamage:100},
    equipment:{},gems:{},skills:[],ai:[]};
  if(archetype==='arena_guardian'){base.stats.hp=Math.round(3000*scale);base.stats.def=Math.round(1000*scale);base.stats.patk=Math.round(190*scale);}
  if(archetype==='arena_assassin'){base.stats.hp=Math.round(1800*scale);base.stats.patk=Math.round(380*scale);base.stats.crit=55;base.stats.critDamage=160;}
  if(archetype==='arena_controller'){base.stats.matk=Math.round(330*scale);base.stats.def=Math.round(550*scale);}
  if(archetype==='arena_vampire'){base.stats.hp=Math.round(2600*scale);base.stats.patk=Math.round(300*scale);}
  if(archetype==='arena_mage'){base.stats.matk=Math.round(410*scale);base.stats.def=Math.round(450*scale);}
  return base;
}

function arenaStartBattle_(body){
  const auth=requireAuth_(body.sessionToken),season=arenaSeasonInfo_(),today=arenaTodayKey_();
  if(season.status!=='ACTIVE')return {ok:false,error:'ARENA_SEASON_NOT_ACTIVE'};
  const defense=arenaCurrentDefense_(season.seasonId,auth.accountId);
  if(!defense)return {ok:false,error:'ARENA_DEFENSE_REQUIRED',needsDefense:true};
  const matchId=String(body.matchId||''),revengeId=String(body.revengeId||''),testMode=body.testMode===true;
  if(!matchId&&!revengeId)return {ok:false,error:'ARENA_BATTLE_SOURCE_REQUIRED'};
  if(testMode&&revengeId)return {ok:false,error:'ARENA_TEST_MODE_DAILY_ONLY'};
  let type='DAILY',defType='',defAccount=null,defNpc=null,defName='',defSnap=null,daily=null,revenge=null;
  if(matchId){
    daily=arenaOne_('ArenaDailyMatches','match_id='+arenaEq_(matchId)+'&season_id='+arenaEq_(season.seasonId)+'&daily_key='+arenaEq_(today)+'&account_id='+arenaEq_(auth.accountId)+'&select=*');
    if(!daily)return {ok:false,error:'ARENA_MATCH_NOT_FOUND'};
    if(body.expectedOpponentNickname&&String(body.expectedOpponentNickname)!==String(daily.opponent_nickname||''))return {ok:false,error:'ARENA_OPPONENT_MISMATCH'};
    if(body.expectedOpponentType&&String(body.expectedOpponentType).toUpperCase()!==String(daily.opponent_type||'').toUpperCase())return {ok:false,error:'ARENA_OPPONENT_TYPE_MISMATCH'};
    if(!testMode&&daily.challenged===true)return {ok:false,error:'ARENA_MATCH_ALREADY_WON'};
    defType=String(daily.opponent_type);defAccount=daily.opponent_account_id||null;defNpc=daily.opponent_npc_id||null;defName=String(daily.opponent_nickname||'');
  }else{
    type='REVENGE';
    revenge=arenaOne_('ArenaRevenge','revenge_id='+arenaEq_(revengeId)+'&season_id='+arenaEq_(season.seasonId)+'&owner_account_id='+arenaEq_(auth.accountId)+'&status=eq.AVAILABLE&select=*');
    if(!revenge)return {ok:false,error:'ARENA_REVENGE_NOT_AVAILABLE'};
    defType='PLAYER';defAccount=String(revenge.target_account_id);defName=arenaAccountNickname_(defAccount);
  }
  if(defType==='PLAYER'){
    // Daily match must use the exact defense snapshot that was paired when the card was generated.
    // This prevents choosing player A but entering a later/current snapshot with drifted identity/build.
    const chosen=daily
      ? arenaDefenseSnapshotById_(season.seasonId,defAccount,daily.opponent_snapshot_id)
      : arenaCurrentDefense_(season.seasonId,defAccount);
    if(!chosen)return {ok:false,error:'ARENA_OPPONENT_DEFENSE_MISSING'};
    defSnap=chosen.snapshot_json;
    defName=String((daily&&daily.opponent_nickname)||chosen.nickname||defName||'冒險者');
  }else{
    defSnap=arenaNpcSnapshotFromPlanning_(defNpc,daily?daily.opponent_points_at_match:0);
  }
  const atkSnap=arenaBuildAttackSnapshot_(auth.accountId,body),now=new Date(),expires=new Date(now.getTime()+30*60*1000).toISOString();
  let retryAttempt=false;
  if(daily&&!testMode){
    const prev=arenaSbRequest_('get','ArenaBattles','daily_match_id='+arenaEq_(daily.match_id)+'&status=eq.SETTLED&select=battle_id,result');
    retryAttempt=Array.isArray(prev)&&prev.length>0;
  }
  const payload={season_id:season.seasonId,battle_type:type,attacker_account_id:auth.accountId,
    attacker_nickname:arenaAccountNickname_(auth.accountId),defender_type:defType,defender_account_id:defAccount,
    defender_npc_id:defNpc,defender_nickname:defName,daily_match_id:daily?daily.match_id:null,revenge_id:revenge?revenge.revenge_id:null,
    attacker_snapshot_json:atkSnap,attacker_snapshot_hash:arenaHash_(atkSnap),defender_snapshot_json:defSnap,
    defender_snapshot_hash:arenaHash_(defSnap),status:'STARTED',result_summary:{testMode:testMode,retryAttempt:retryAttempt},started_at:now.toISOString(),expires_at:expires};
  const made=arenaSbRequest_('post','ArenaBattles','',payload,'return=representation');
  const b=Array.isArray(made)&&made.length?made[0]:null;if(!b)throw new Error('ARENA_BATTLE_CREATE_FAILED');
  if(daily&&!testMode)arenaPatch_('ArenaDailyMatches','match_id='+arenaEq_(daily.match_id),{battle_id:b.battle_id});
  if(revenge)arenaPatch_('ArenaRevenge','revenge_id='+arenaEq_(revenge.revenge_id),{revenge_battle_id:b.battle_id});
  return {ok:true,battleId:String(b.battle_id),battleType:type,maxTurns:20,defenderFirst:true,
    attackerSnapshot:atkSnap,defenderSnapshot:defSnap,defenderNickname:defName,defenderType:defType,
    defenderAccountId:defAccount||null,defenderSnapshotId:daily?String(daily.opponent_snapshot_id||''):'',
    expiresAt:expires,testMode:testMode};
}

function arenaHpRatio_(hp,maxHp){
  hp=Math.max(0,Number(hp)||0);maxHp=Math.max(1,Number(maxHp)||1);return hp/maxHp;
}

function arenaNormalizeResult_(body){
  const turns=Math.max(1,Math.min(20,Math.trunc(Number(body.turns)||1)));
  const ah=Math.max(0,Number(body.attackerHp)||0),am=Math.max(1,Number(body.attackerMaxHp)||1);
  const dh=Math.max(0,Number(body.defenderHp)||0),dm=Math.max(1,Number(body.defenderMaxHp)||1);
  let result='';
  if(ah<=0&&dh<=0)result='DRAW';
  else if(dh<=0)result='ATTACKER_WIN';
  else if(ah<=0)result='DEFENDER_WIN';
  else if(turns>=20){
    const a=arenaHpRatio_(ah,am),d=arenaHpRatio_(dh,dm),eps=1e-9;
    result=Math.abs(a-d)<=eps?'DRAW':a>d?'ATTACKER_WIN':'DEFENDER_WIN';
  }else{
    throw new Error('ARENA_BATTLE_NOT_FINISHED');
  }
  return {result:result,turns:turns,attackerHp:ah,attackerMaxHp:am,defenderHp:dh,defenderMaxHp:dm,
    attackerDamage:Math.max(0,Math.trunc(Number(body.attackerDamage)||0)),
    defenderDamage:Math.max(0,Math.trunc(Number(body.defenderDamage)||0))};
}

function arenaApplyPlayerDelta_(seasonId,accountId,delta,result,damage){
  const row=arenaPlayerRow_(seasonId,accountId);if(!row)throw new Error('ARENA_PLAYER_NOT_FOUND');
  const old=Math.max(0,Number(row.points)||0),next=Math.max(0,old+delta),now=new Date().toISOString();
  const patch={points:next,updated_at:now};
  if(next!==old)patch.reached_points_at=now;
  if(result==='WIN')patch.wins=(Number(row.wins)||0)+1;
  if(result==='LOSS')patch.losses=(Number(row.losses)||0)+1;
  if(result==='DRAW')patch.draws=(Number(row.draws)||0)+1;
  patch.total_damage=(Number(row.total_damage)||0)+Math.max(0,Math.trunc(Number(damage)||0));
  arenaPatch_('ArenaPlayers','season_id='+arenaEq_(seasonId)+'&account_id='+arenaEq_(accountId),patch);
  return {before:old,after:next,delta:next-old};
}

function arenaCreateReport_(seasonId,owner,battleId,type,oppName,result,delta,revengeId){
  arenaSbRequest_('post','ArenaBattleReports','',{
    season_id:seasonId,owner_account_id:owner,battle_id:battleId,report_type:type,
    opponent_nickname:String(oppName||''),result:result,points_delta:delta,revenge_id:revengeId||null,
    is_read:false,created_at:new Date().toISOString()
  },'resolution=ignore-duplicates,return=minimal');
}

function arenaSubmitBattle_(body){
  const auth=requireAuth_(body.sessionToken),battleId=String(body.battleId||''),b=arenaBattleRow_(battleId);
  if(!b||String(b.attacker_account_id)!==String(auth.accountId))return {ok:false,error:'ARENA_BATTLE_NOT_FOUND'};
  if(String(b.status)==='SETTLED')return {ok:true,alreadySettled:true,battleId:battleId,result:b.result,
    attackerPointsDelta:Number(b.attacker_points_delta)||0,defenderPointsDelta:Number(b.defender_points_delta)||0};
  if(String(b.status)!=='STARTED')return {ok:false,error:'ARENA_BATTLE_INVALID_STATE'};
  if(b.expires_at&&Date.now()>new Date(b.expires_at).getTime())return {ok:false,error:'ARENA_BATTLE_EXPIRED'};
  const n=arenaNormalizeResult_(body),isNpc=String(b.defender_type)==='NPC',isRevenge=String(b.battle_type)==='REVENGE',isTest=!!(b.result_summary&&b.result_summary.testMode===true),isRetry=!isRevenge&&!!(b.result_summary&&b.result_summary.retryAttempt===true);
  let ad=0,dd=0,ar={before:0,after:0,delta:0},dr={delta:0},revengeId=null;
  if(!isTest){
    if(n.result==='ATTACKER_WIN'){ad=isRetry?1:(isNpc?1:2);dd=isNpc?0:(isRetry?-1:-2);}
    else if(n.result==='DEFENDER_WIN'){
      if(isRevenge){ad=0;dd=0;}else{ad=isRetry?-1:(isNpc?-1:-2);dd=isNpc?0:(isRetry?1:2);}
    }
    ar=arenaApplyPlayerDelta_(b.season_id,b.attacker_account_id,ad,
      n.result==='ATTACKER_WIN'?'WIN':n.result==='DEFENDER_WIN'?'LOSS':'DRAW',n.attackerDamage);
    if(!isNpc){
      dr=arenaApplyPlayerDelta_(b.season_id,b.defender_account_id,dd,
        n.result==='ATTACKER_WIN'?'LOSS':n.result==='DEFENDER_WIN'?'WIN':'DRAW',n.defenderDamage);
    }
    if(!isRevenge&&n.result==='ATTACKER_WIN'&&b.daily_match_id){
      arenaPatch_('ArenaDailyMatches','match_id='+arenaEq_(b.daily_match_id),{challenged:true,challenged_at:new Date().toISOString(),battle_id:battleId});
    }
    if(!isNpc&&!isRevenge&&n.result==='ATTACKER_WIN'){
      const season=arenaSeasonInfo_();
      const rr=arenaSbRequest_('post','ArenaRevenge','',{
        season_id:b.season_id,owner_account_id:b.defender_account_id,target_account_id:b.attacker_account_id,
        source_battle_id:battleId,status:'AVAILABLE',created_at:new Date().toISOString(),expires_at:season.endAt
      },'resolution=ignore-duplicates,return=representation');
      if(Array.isArray(rr)&&rr.length)revengeId=rr[0].revenge_id;
    }
    if(isRevenge&&b.revenge_id){
      arenaPatch_('ArenaRevenge','revenge_id='+arenaEq_(b.revenge_id),
        {status:'USED',used_at:new Date().toISOString(),revenge_battle_id:battleId});
    }
    if(!isNpc){
      arenaCreateReport_(b.season_id,b.defender_account_id,battleId,isRevenge?'REVENGE':'DEFENSE',
        b.attacker_nickname,n.result==='ATTACKER_WIN'?'LOSS':n.result==='DEFENDER_WIN'?'WIN':'DRAW',dr.delta,revengeId);
    }
  }else{
    const prow=arenaPlayerRow_(b.season_id,b.attacker_account_id);
    ar={before:Number(prow?.points)||0,after:Number(prow?.points)||0,delta:0};
  }
  const settlementKey='arena:'+battleId;
  arenaPatch_('ArenaBattles','battle_id='+arenaEq_(battleId),{
    status:'SETTLED',result:n.result,turns:n.turns,attacker_hp:n.attackerHp,attacker_max_hp:n.attackerMaxHp,
    defender_hp:n.defenderHp,defender_max_hp:n.defenderMaxHp,attacker_damage:n.attackerDamage,defender_damage:n.defenderDamage,
    result_summary:{testMode:isTest,retryAttempt:isRetry,hpRatio:{attacker:arenaHpRatio_(n.attackerHp,n.attackerMaxHp),defender:arenaHpRatio_(n.defenderHp,n.defenderMaxHp)}},
    attacker_points_delta:ar.delta,defender_points_delta:dr.delta,submitted_at:new Date().toISOString(),
    settled_at:new Date().toISOString(),settlement_key:settlementKey
  });
  return {ok:true,battleId:battleId,result:n.result,attackerPointsDelta:ar.delta,defenderPointsDelta:dr.delta,
    attackerPoints:ar.after,revengeCreated:!!revengeId,testMode:isTest};
}

function arenaRevengeList_(body){
  const auth=requireAuth_(body.sessionToken),season=arenaSeasonInfo_();
  const rows=arenaSbRequest_('get','ArenaRevenge','season_id='+arenaEq_(season.seasonId)+'&owner_account_id='+arenaEq_(auth.accountId)+'&status=eq.AVAILABLE&select=*&order=created_at.desc');
  return {ok:true,season:season,rows:(Array.isArray(rows)?rows:[]).map(r=>({
    revengeId:String(r.revenge_id),targetAccountId:String(r.target_account_id),targetNickname:arenaAccountNickname_(r.target_account_id),
    createdAt:r.created_at,expiresAt:r.expires_at
  }))};
}

function arenaReports_(body){
  const auth=requireAuth_(body.sessionToken),season=arenaSeasonInfo_(),limit=Math.max(1,Math.min(100,Math.trunc(Number(body.limit)||30)));
  const rows=arenaSbRequest_('get','ArenaBattleReports','season_id='+arenaEq_(season.seasonId)+'&owner_account_id='+arenaEq_(auth.accountId)+'&select=*&order=created_at.desc&limit='+limit);
  return {ok:true,season:season,rows:(Array.isArray(rows)?rows:[]).map(r=>({
    reportId:String(r.report_id),battleId:String(r.battle_id),type:String(r.report_type),opponentNickname:String(r.opponent_nickname||''),
    result:String(r.result),pointsDelta:Number(r.points_delta)||0,revengeId:r.revenge_id?String(r.revenge_id):null,
    createdAt:r.created_at,isRead:r.is_read===true
  }))};
}

function arenaPlanningRows_(name){
  try{return publishedPlanningRows_(name)||[]}catch(_e){return []}
}

const ARENA_NPC_BUILDS140_=[{"NpcID":"arena_guardian","Name":"競技場守護者","Archetype":"guardian","Tier":"NORMAL","Enabled":true,"Enhance":0,"SocketMode":"BASE","SocketCount":0,"PassiveID":"guts","EquipmentJSON":"{\"weapon\":\"regestaScale\",\"head\":\"mirrorReverseCrown\",\"armor\":\"gloryArmor1\",\"special\":\"event01\",\"ring1\":\"velasienRing\",\"ring2\":\"judgment\",\"ring3\":\"eclipseSovereignRing\",\"ring4\":\"slowTimeRing\"}","GemPool":"terrax|orderHeart|luckyGem3|velska","Skill1ID":"absoluteDefense","Skill2ID":"precisionStrike","Skill3ID":"slash","AI1Condition":"SELF_NO_BUFF","AI2Condition":"ALWAYS","AI3Condition":"ALWAYS"},{"NpcID":"arena_assassin","Name":"幻影刺客","Archetype":"assassin","Tier":"NORMAL","Enabled":true,"Enhance":0,"SocketMode":"BASE","SocketCount":0,"PassiveID":"assassinAptitudeII","EquipmentJSON":"{\"weapon\":\"spatulaGod\",\"head\":\"berserkerCrown1\",\"armor\":\"mirrorFormlessArmor\",\"special\":\"coreOverclockPlugin\",\"ring1\":\"eclipseSovereignRing\",\"ring2\":\"empireZeroRing\",\"ring3\":\"mirrorReflectionRing\",\"ring4\":\"judgment\"}","GemPool":"luckyGem1|reysaan|aurion","Skill1ID":"shadowThrust","Skill2ID":"adrenalineII","Skill3ID":"precisionStrike","AI1Condition":"ENEMY_HP_LE_25","AI2Condition":"SELF_NO_BUFF","AI3Condition":"ALWAYS"},{"NpcID":"arena_controller","Name":"咒縛術師","Archetype":"controller","Tier":"NORMAL","Enabled":true,"Enhance":0,"SocketMode":"BASE","SocketCount":0,"PassiveID":"mageAptitudeII","EquipmentJSON":"{\"weapon\":\"chronosArcaneStaff\",\"head\":\"thalessiahead\",\"armor\":\"timeMirrorArmor\",\"special\":\"riftBracelet\",\"ring1\":\"mirrorRebirthRing\",\"ring2\":\"slowTimeRing\",\"ring3\":\"judgment\",\"ring4\":\"tysseviaRing\"}","GemPool":"frostDragonGem|turgura|poisonDragonGem","Skill1ID":"blessingRain","Skill2ID":"explosiveMagicII","Skill3ID":"magicMissileIII","AI1Condition":"SELF_HAS_STATUS","AI2Condition":"ENEMY_NO_STATUS","AI3Condition":"ALWAYS"},{"NpcID":"arena_vampire","Name":"鮮血鬥士","Archetype":"vampire","Tier":"NORMAL","Enabled":true,"Enhance":0,"SocketMode":"BASE","SocketCount":0,"PassiveID":"guts","EquipmentJSON":"{\"weapon\":\"luckyWeapon3\",\"head\":\"orichalcumCrown\",\"armor\":\"gloryArmor1\",\"special\":\"leviathanHeart\",\"ring1\":\"velasienRing\",\"ring2\":\"velasienRing\",\"ring3\":\"judgment\",\"ring4\":\"tysseviaRing\"}","GemPool":"worldTreeCrystal|Thalessia|orderHeart","Skill1ID":"blessingRain","Skill2ID":"bloodSlashII","Skill3ID":"precisionStrike","AI1Condition":"SELF_HAS_STATUS","AI2Condition":"SELF_HP_LE_75","AI3Condition":"ALWAYS"},{"NpcID":"arena_mage","Name":"奧術幻影","Archetype":"mage","Tier":"NORMAL","Enabled":true,"Enhance":0,"SocketMode":"BASE","SocketCount":0,"PassiveID":"mageAptitudeII","EquipmentJSON":"{\"weapon\":\"mirrorMyriadStaff\",\"head\":\"thalessiahead\",\"armor\":\"nebulaMantle\",\"special\":\"phantomLegendCloak\",\"ring1\":\"eclipseSovereignRing\",\"ring2\":\"oceanSovereignRing\",\"ring3\":\"velasienRing\",\"ring4\":\"judgment\"}","GemPool":"luckyGem2|orderHeart|turgura","Skill1ID":"magicShieldII","Skill2ID":"magicBurst","Skill3ID":"magicMissileIII","AI1Condition":"SELF_NO_BUFF","AI2Condition":"ALWAYS","AI3Condition":"ALWAYS"},{"NpcID":"arena_balanced","Name":"競技場鬥士","Archetype":"balanced","Tier":"NORMAL","Enabled":true,"Enhance":0,"SocketMode":"BASE","SocketCount":0,"PassiveID":"magicSwordsmanAptitudeII","EquipmentJSON":"{\"weapon\":\"regestaScale\",\"head\":\"heroCrown1\",\"armor\":\"mirrorFormlessArmor\",\"special\":\"event01\",\"ring1\":\"eclipseSovereignRing\",\"ring2\":\"oceanSovereignRing\",\"ring3\":\"judgment\",\"ring4\":\"mirrorReflectionRing\"}","GemPool":"aurion|orderHeart|luckyGem3|tyssevia","Skill1ID":"fullPreparation","Skill2ID":"magicSlashII","Skill3ID":"precisionStrike","AI1Condition":"SELF_NO_BUFF","AI2Condition":"ALWAYS","AI3Condition":"ALWAYS"},{"NpcID":"arena_bastion","Name":"菁英・不落壁壘","Archetype":"guardian","Tier":"ELITE","Enabled":true,"Enhance":10,"SocketMode":"FIXED","SocketCount":2,"PassiveID":"enhancedConstitutionIII","EquipmentJSON":"{\"weapon\":\"regestaScale\",\"head\":\"mirrorReverseCrown\",\"armor\":\"terraxArmor\",\"special\":\"phantomLegendCloak\",\"ring1\":\"velasienRing\",\"ring2\":\"judgment\",\"ring3\":\"eclipseSovereignRing\",\"ring4\":\"velasienRing\"}","GemPool":"luckyGem1|luckyGem1|orderHeart|orderHeart|luckyGem3|luckyGem3|terrax|terrax|erebetis|erebetis|velska|velska|velasien|velasien|aurion|tyssevia","Skill1ID":"absoluteDefense","Skill2ID":"precisionStrike","Skill3ID":"slash","AI1Condition":"SELF_NO_BUFF","AI2Condition":"ALWAYS","AI3Condition":"ALWAYS"},{"NpcID":"arena_executioner","Name":"菁英・終幕處刑者","Archetype":"assassin","Tier":"ELITE","Enabled":true,"Enhance":10,"SocketMode":"FIXED","SocketCount":2,"PassiveID":"assassinAptitudeII","EquipmentJSON":"{\"weapon\":\"fastsliver\",\"head\":\"berserkerCrown1\",\"armor\":\"mirrorFormlessArmor\",\"special\":\"coreOverclockPlugin\",\"ring1\":\"eclipseSovereignRing\",\"ring2\":\"judgment\",\"ring3\":\"mirrorReflectionRing\",\"ring4\":\"eclipseSovereignRing\"}","GemPool":"luckyGem1|luckyGem1|luckyGem1|luckyGem1|luckyGem1|luckyGem1|reysaan|reysaan|reysaan|reysaan|tyssevia|tyssevia|aurion|aurion|orderHeart|orderHeart","Skill1ID":"adrenalineII","Skill2ID":"shadowThrust","Skill3ID":"precisionStrike","AI1Condition":"SELF_NO_BUFF","AI2Condition":"ALWAYS","AI3Condition":"ALWAYS"},{"NpcID":"arena_plague","Name":"菁英・災厄咒縛者","Archetype":"controller","Tier":"ELITE","Enabled":true,"Enhance":10,"SocketMode":"FIXED","SocketCount":2,"PassiveID":"mageAptitudeII","EquipmentJSON":"{\"weapon\":\"chronosArcaneStaff\",\"head\":\"thalessiahead\",\"armor\":\"vturtle\",\"special\":\"phantomLegendCloak\",\"ring1\":\"mirrorRebirthRing\",\"ring2\":\"slowTimeRing\",\"ring3\":\"judgment\",\"ring4\":\"tysseviaRing\"}","GemPool":"frostDragonGem|frostDragonGem|frostDragonGem|frostDragonGem|turgura|turgura|poisonDragonGem|poisonDragonGem|luckyGem2|luckyGem2|luckyGem2|luckyGem2|orderHeart|orderHeart|velasien|velasien","Skill1ID":"blessingRain","Skill2ID":"explosiveMagicII","Skill3ID":"magicMissileIII","AI1Condition":"SELF_HAS_STATUS","AI2Condition":"ENEMY_NO_STATUS","AI3Condition":"ALWAYS"},{"NpcID":"arena_undying","Name":"菁英・不滅血爵","Archetype":"vampire","Tier":"ELITE","Enabled":true,"Enhance":10,"SocketMode":"FIXED","SocketCount":2,"PassiveID":"guts","EquipmentJSON":"{\"weapon\":\"luckyWeapon3\",\"head\":\"celestialObserverCrown\",\"armor\":\"mirrorFormlessArmor\",\"special\":\"leviathanHeart\",\"ring1\":\"velasienRing\",\"ring2\":\"velasienRing\",\"ring3\":\"judgment\",\"ring4\":\"tysseviaRing\"}","GemPool":"luckyGem3|luckyGem3|luckyGem3|luckyGem3|luckyGem1|luckyGem1|luckyGem1|luckyGem1|orderHeart|orderHeart|velasien|velasien|tyssevia|tyssevia|aurion|aurion","Skill1ID":"blessingRain","Skill2ID":"bloodSlashII","Skill3ID":"precisionStrike","AI1Condition":"SELF_HAS_STATUS","AI2Condition":"SELF_HP_LE_75","AI3Condition":"ALWAYS"},{"NpcID":"arena_archmage","Name":"菁英・滅界大魔導","Archetype":"mage","Tier":"ELITE","Enabled":true,"Enhance":10,"SocketMode":"FIXED","SocketCount":2,"PassiveID":"mageAptitudeII","EquipmentJSON":"{\"weapon\":\"luckyWeapon2\",\"head\":\"thalessiahead\",\"armor\":\"timeMirrorArmor\",\"special\":\"phantomLegendCloak\",\"ring1\":\"eclipseSovereignRing\",\"ring2\":\"oceanSovereignRing\",\"ring3\":\"judgment\",\"ring4\":\"tysseviaRing\"}","GemPool":"luckyGem2|luckyGem2|luckyGem2|luckyGem2|luckyGem2|luckyGem2|luckyGem2|luckyGem2|dragonEmpressII|dragonEmpressII|turgura|turgura|orderHeart|orderHeart|velasien|velasien","Skill1ID":"magicShieldII","Skill2ID":"magicBurst","Skill3ID":"magicMissileIII","AI1Condition":"SELF_NO_BUFF","AI2Condition":"ALWAYS","AI3Condition":"ALWAYS"},{"NpcID":"arena_spellblade","Name":"菁英・雙界裁決者","Archetype":"balanced","Tier":"ELITE","Enabled":true,"Enhance":10,"SocketMode":"FIXED","SocketCount":2,"PassiveID":"magicSwordsmanAptitudeII","EquipmentJSON":"{\"weapon\":\"erebetisWeapon\",\"head\":\"heroCrown1\",\"armor\":\"mirrorFormlessArmor\",\"special\":\"phantomLegendCloak\",\"ring1\":\"eclipseSovereignRing\",\"ring2\":\"oceanSovereignRing\",\"ring3\":\"judgment\",\"ring4\":\"tysseviaRing\"}","GemPool":"tyssevia|tyssevia|tyssevia|tyssevia|aurion|aurion|orderHeart|orderHeart|orderHeart|orderHeart|luckyGem3|luckyGem3|frostDragonGem|frostDragonGem|velasien|velasien","Skill1ID":"fullPreparation","Skill2ID":"magicSlashII","Skill3ID":"precisionStrike","AI1Condition":"SELF_NO_BUFF","AI2Condition":"ALWAYS","AI3Condition":"ALWAYS"}];

function arenaNpcRows140_(){
 const rows=arenaPlanningRows_('ArenaNPC');
 return rows.map(row=>{const preset=ARENA_NPC_BUILDS140_.find(x=>x.NpcID===String(row.NpcID||''));const out={...(preset||{})};for(const [k,v]of Object.entries(row))if(v!==''&&v!==null&&v!==undefined)out[k]=v;return out;}).filter(r=>String(r.Enabled).trim().toLowerCase()!=='false');
}

function arenaNpcPlanning_(npcId){return arenaNpcRows140_().find(r=>String(r.NpcID)===String(npcId))||null;}

function arenaEquipmentScore_(row,npc){
 if(!row||row.ItemID==='gmSword')return -1e15;
 const n=k=>Number(row[k])||0,w=k=>Number(npc[k])||0;
 // Fallback for custom NPCs: no name-substring bonuses or common-ring jackpots.
 return n('PATK')*w('PATKWeight')+n('MATK')*w('MATKWeight')+n('DEF')*w('DEFWeight')+n('HP')*w('HPWeight')+n('Crit')*w('CritWeight')+n('CritDamage')*Math.max(w('CritWeight'),1)+n('BaseSockets')*25;
}

function arenaNpcEquipment_(npc){
 const active=r=>String(r.Enabled).trim().toLowerCase()!=='false';
 const rows=arenaPlanningRows_('Equipment').filter(r=>r.ItemID&&r.ItemID!=='gmSword'&&active(r)),gemRows=arenaPlanningRows_('Gems').filter(active),out={};
 let picks={};try{picks=JSON.parse(String(npc.EquipmentJSON||'{}'));}catch(_){throw Error('ARENA_NPC_EQUIPMENT_JSON_INVALID:'+npc.NpcID);}
 const pool=String(npc.GemPool||'').split('|').map(x=>x.trim()).filter(Boolean);let gemIndex=0;
 for(const slot of ['weapon','head','armor','special','ring1','ring2','ring3','ring4']){
  const type=slot.replace(/\d+$/,''),explicit=String(picks[slot]||''),ranked=rows.filter(r=>String(r.Slot).toLowerCase()===type).sort((a,b)=>arenaEquipmentScore_(b,npc)-arenaEquipmentScore_(a,npc));
  const row=explicit?ranked.find(r=>r.ItemID===explicit):ranked[type==='ring'?Math.min(Number(slot.slice(4))-1,ranked.length-1):0];
  if(!row)throw Error('ARENA_NPC_EQUIPMENT_MISSING:'+npc.NpcID+':'+slot+':'+explicit);
  const enhance=Math.max(0,Math.min(10,Math.trunc(Number(npc.Enhance)||0))),sockets=String(npc.SocketMode).toUpperCase()==='FIXED'?Math.max(0,Math.min(2,Math.trunc(Number(npc.SocketCount)||0))):Math.max(0,Math.min(2,Math.trunc(Number(row.BaseSockets)||0)));
  const gems=[];
  for(let j=0;j<sockets;j++){
   const id=pool.length?pool[gemIndex++%pool.length]:'';
   if(!id||!gemRows.some(g=>String(g.GemID)===id))throw Error('ARENA_NPC_GEM_MISSING:'+npc.NpcID+':'+id);
   gems.push({template:id});
  }
  out[slot]={template:row.ItemID,slot:type,enhance,sockets,gems};
 }
 return out;
}

function arenaNpcSkills_(npc){
 const rows=arenaPlanningRows_('Skills').filter(r=>r.SkillID&&String(r.Enabled).toLowerCase()!=='false'&&String(r.Type).toLowerCase()==='active');
 const explicit=[npc.Skill1ID,npc.Skill2ID,npc.Skill3ID].filter(Boolean).map(String);
 if(explicit.length){if(explicit.length!==3||new Set(explicit).size!==3||explicit.some(id=>!rows.some(r=>r.SkillID===id)))throw Error('ARENA_NPC_SKILLS_INVALID:'+npc.NpcID);return explicit;}
 const scored=rows.map(r=>({id:r.SkillID,power:Number(r.Power)||Number(r.Multiplier)||0})).sort((a,b)=>b.power-a.power);
 const chosen=[];for(const r of scored){if(!chosen.includes(r.id))chosen.push(r.id);if(chosen.length===3)break;}return chosen;
}

function arenaNpcAi_(npc,skills){
  const cond=[npc.AI1Condition||'ALWAYS',npc.AI2Condition||'ALWAYS',npc.AI3Condition||'ALWAYS'];
  return skills.map((skill,i)=>({skill:skill,priority:i+1,condition:String(cond[i]||'ALWAYS')}));
}

function arenaNpcSnapshotFromPlanning_(npcId,points){
 const npc=arenaNpcPlanning_(npcId);if(!npc)throw Error('ARENA_NPC_DISABLED_OR_MISSING:'+npcId);
 const passive=String(npc.PassiveID||'');
 if(passive&&!arenaPlanningRows_('Skills').some(r=>r.SkillID===passive&&String(r.Type).toLowerCase()==='passive'&&String(r.Enabled).toLowerCase()!=='false'))throw Error('ARENA_NPC_PASSIVE_INVALID:'+npcId);
 const equipment=arenaNpcEquipment_(npc),skills=arenaNpcSkills_(npc),base=arenaNpcSnapshot_(npcId,points);
 return {...base,npcName:String(npc.Name||npcId),archetype:String(npc.Archetype||npcId),tier:String(npc.Tier||'NORMAL'),equipment,gems:Object.fromEntries(Object.entries(equipment).map(([k,it])=>[k,it.gems])),skills,passive,ai:arenaNpcAi_(npc,skills),planningDriven:true,npcBuildVersion140:1,scale:1};
}

// ============================================================
// 06｜企劃規則驗證與共享編譯器
// ============================================================

const ARENA_CONFIG_DEFAULT126_={SeasonDays:7,StartPoints:10,MinPoints:0,DailyOpponentCount:5,MaxTurns:20,PlayerWinDelta:2,PlayerLoseDelta:-2,DefenderWinDelta:2,DefenderLoseDelta:-2,NpcWinDelta:1,NpcLoseDelta:-1,DrawDelta:0,RevengeWinDelta:2,RevengeLoseDelta:0,DailyResetTimezone:'Asia/Taipei',ArenaLevel:250,RankingTopReward:0,RetryWinDelta:1,RetryLoseDelta:-1,RetryDefenderWinDelta:1,RetryDefenderLoseDelta:-1};

function arenaParseConfig126_(rows){
 const out={...ARENA_CONFIG_DEFAULT126_},seen=new Set();
 const bounds={SeasonDays:[1,366],StartPoints:[0,1000000],MinPoints:[0,1000000],DailyOpponentCount:[1,50],MaxTurns:[1,1000],ArenaLevel:[1,10000],RankingTopReward:[0,1000000]};
 for(const row of rows||[]){
  const key=String(row.Key||'').trim();if(!(key in out))continue;
  if(seen.has(key))throw Error('ARENA_CONFIG_DUPLICATE:'+key);seen.add(key);
  if(row.Value==null||String(row.Value).trim()==='')throw Error('ARENA_CONFIG_INVALID:'+key);
  if(key==='DailyResetTimezone'){
   const tz=String(row.Value).trim();try{new Intl.DateTimeFormat('en',{timeZone:tz}).format(new Date());}catch{throw Error('ARENA_CONFIG_INVALID:'+key);}out[key]=tz;
  }else{
   const n=Number(row.Value),[min,max]=bounds[key]||[-1000000,1000000];
   if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('ARENA_CONFIG_INVALID:'+key);out[key]=n;
  }
 }
 if(out.StartPoints<out.MinPoints)throw Error('ARENA_CONFIG_START_BELOW_MIN');return out;
}



function planningNpcErrors140_(data){
 const errors=[],on=r=>String(r.Enabled).trim().toLowerCase()!=='false',find=(table,key,id)=>(data[table]||[]).find(r=>String(r[key])===String(id)&&on(r));
 for(const row of data.ArenaNPC||[]){
  if(!on(row))continue;
  const preset=ARENA_NPC_BUILDS140_.find(x=>x.NpcID===row.NpcID),npc={...(preset||{})};for(const [k,v]of Object.entries(row))if(v!==''&&v!=null)npc[k]=v;
  if(!npc.EquipmentJSON)continue;
  const label='ArenaNPC '+npc.NpcID+'：';let picks;
  try{picks=JSON.parse(String(npc.EquipmentJSON));}catch(_){errors.push(label+'EquipmentJSON 不是有效 JSON');continue;}
  const level=Number(npc.Enhance);if(!Number.isInteger(level)||level<0||level>10)errors.push(label+'Enhance 必須為0～10整數');
  if(level>0&&!(data.Enhancement||[]).some(x=>Number(x.TargetLevel)===level&&Number(x.StatMultiplier)>0))errors.push(label+'缺少強化倍率：+'+level);
  if(!['BASE','FIXED'].includes(String(npc.SocketMode)))errors.push(label+'SocketMode 必須為 BASE 或 FIXED');
  if(npc.SocketMode==='FIXED'&&(!Number.isInteger(Number(npc.SocketCount))||Number(npc.SocketCount)<0||Number(npc.SocketCount)>2))errors.push(label+'SocketCount 必須為0～2整數');
  let holes=0;
  for(const slot of ['weapon','head','armor','special','ring1','ring2','ring3','ring4']){
   const it=find('Equipment','ItemID',picks?.[slot]);if(!it||it.ItemID==='gmSword'||String(it.Slot)!==slot.replace(/\d+$/,''))errors.push(label+'裝備不存在、未啟用或部位錯誤：'+slot+'='+picks?.[slot]);
   else holes+=npc.SocketMode==='FIXED'?Number(npc.SocketCount):Math.max(0,Math.min(2,Number(it.BaseSockets)||0));
  }
  const gems=String(npc.GemPool||'').split('|').map(s=>s.trim()).filter(Boolean);if(holes>0&&!gems.length)errors.push(label+'有鑲孔但未設定 GemPool');
  for(const id of new Set(gems))if(!find('Gems','GemID',id))errors.push(label+'寶石不存在或未啟用：'+id);
  const ids=[npc.Skill1ID,npc.Skill2ID,npc.Skill3ID];if(new Set(ids).size!==3)errors.push(label+'三個主動技能必須不同');
  for(const id of ids){const sk=find('Skills','SkillID',id);if(!sk||String(sk.Type).toLowerCase()!=='active')errors.push(label+'主動技能不存在或類型錯誤：'+id);}
  const passive=find('Skills','SkillID',npc.PassiveID);if(!passive||String(passive.Type).toLowerCase()!=='passive')errors.push(label+'被動技能不存在或類型錯誤：'+npc.PassiveID);
  for(let i=1;i<=3;i++)if(!['ALWAYS','SELF_HP_LE_75','SELF_HP_LE_50','SELF_HP_LE_25','ENEMY_HP_LE_50','ENEMY_HP_LE_25','SELF_HAS_STATUS','ENEMY_NO_STATUS','ENEMY_NO_DEBUFF','SELF_NO_BUFF'].includes(npc['AI'+i+'Condition']))errors.push(label+'不支援的 AI 條件：'+npc['AI'+i+'Condition']);
 }
 return errors;
}

function planningRelicErrors144_(data){if(!toBool_((data.RelicConfig||[]).find(r=>r.Key==='Enabled')?.Value))return [];const arenaPlanningRows_=name=>data[name]||[];
function relicPlanning144_(){
 const config=Object.fromEntries(arenaPlanningRows_('RelicConfig').map(r=>[r.Key,r.Value]));if(!toBool_(config.Enabled))throw Error('遺物探險尚未開放');
 for(const key of ['HP','DEF','PATK','MATK','Gold','Stone']){const lo=Number(config[key+'Min']),hi=Number(config[key+'Max']);if(!Number.isSafeInteger(lo)||!Number.isSafeInteger(hi)||lo<1||hi<lo||hi>10000)throw Error('RelicConfig數值無效：'+key);}
 for(const k of ['HP','DEF','PATK','MATK'])if(!Number.isSafeInteger(Number(config['Dragon'+k]))||Number(config['Dragon'+k])<1)throw Error('尾王基礎值無效');
 const pools={};for(const key of ['EQUIPMENT','GEM','BOSS_EQUIPMENT']){pools[key]=[...new Set(arenaPlanningRows_('RelicPools').filter(r=>{const type=String(r.PoolType||'').trim().toUpperCase();return (type===key||key==='EQUIPMENT'&&type==='WEAPON')&&toBool_(r.Enabled);}).map(r=>String(r.ContentID||'').trim()))];if(!pools[key].length)throw Error('請先填寫RelicPools：'+key);}
 const catalog={Equipment:arenaPlanningRows_('Equipment'),Gems:arenaPlanningRows_('Gems')};
 for(const [key,ids]of Object.entries(pools))for(const id of ids){const row=catalog[key==='GEM'?'Gems':'Equipment'].find(r=>String(r[key==='GEM'?'GemID':'ItemID'])===id);if(!row||'Enabled'in row&&row.Enabled!==''&&row.Enabled!=null&&!toBool_(row.Enabled))throw Error('抽取池ID無效：'+id);}
 if(!catalog.Gems.some(r=>r.GemID==='goldenDragon'))throw Error('缺少黃金巨龍寶石');
 const enemies=arenaPlanningRows_('RelicEnemies').filter(r=>toBool_(r.Enabled)),curses=arenaPlanningRows_('RelicCurses').filter(r=>toBool_(r.Enabled));
 const ids=['guard','golem','vampire','warden','slime','puppet','reflect','growth','curse','thief','hound','berserk','countdown','seal','dragon'];
 if(enemies.length!==15||!ids.every(id=>enemies.filter(r=>r.EnemyID===id).length===1)||curses.length!==8||new Set(curses.map(x=>x.CurseID)).size!==8||!['cooldown','healing','shield','crit','noheal','matk','patk','toxin'].every(id=>curses.some(r=>r.CurseID===id)))throw Error('敵人／詛咒企劃不完整');
 const itemIds=new Set([...pools.EQUIPMENT,...pools.BOSS_EQUIPMENT]),gemIds=new Set([...pools.GEM,'goldenDragon']);catalog.Equipment=catalog.Equipment.filter(r=>itemIds.has(String(r.ItemID)));catalog.Gems=catalog.Gems.filter(r=>gemIds.has(String(r.GemID)));return {config,pools,catalog,enemies,curses};
}
try{relicPlanning144_();return [];}catch(e){return ['遺物探險：'+e.message];}}

(function(g){
'use strict';
const epoch=411,enabled=r=>r.Enabled!==false&&String(r.Enabled).toLowerCase()!=='false';
const cfg=(d,k,f)=>{const r=(d.GameConfig||[]).find(r=>r.Key===k);return r?r.Value:f};
function validate(d){
 if(Number(cfg(d,'MainProgressEpoch',0))!==epoch)throw Error('企劃資料尚未升級至411，請完成發布後重新整理。');
 for(const key of ['MainRecordStartFloor','MainStoryEndFloor','WorldBossUnlockFloor','ExtremeUnlockFloor','DungeonUnlockFloor','RelicUnlockFloor','ArenaUnlockFloor','ChallengeUnlockFloor'])if(!Number.isFinite(Number(cfg(d,key,undefined))))throw Error('缺少遊戲設定：'+key);
 for(const k of ['Enemies','EnemyBehaviors','EnemyModules','BossPhases','Skills','Equipment','Gems','RelicConfig'])if(!Array.isArray(d[k]))throw Error('缺少企劃表：'+k);
 const rows=d.Enemies.filter(enabled),floors=rows.map(r=>Number(r.Floor));
 if(rows.length!==65||new Set(floors).size!==65||floors.some(f=>!Number.isInteger(f)||f<1||f>65)||new Set(rows.map(r=>r.EnemyID)).size!==65)throw Error('主線必須為不重複的1～65關。');
 for(const r of rows)for(const k of ['BaseHP','BaseDEF','BasePATK','BaseMATK','EXP','Gold','FirstClearStone'])if(!Number.isFinite(Number(r[k]))||Number(r[k])<0)throw Error('敵人數值無效：'+r.EnemyID+'/'+k);
 const mods=new Map(d.EnemyModules.filter(enabled).map(r=>[r.ModuleID,r]));
 for(const r of d.EnemyBehaviors.filter(enabled))if(!mods.has(r.ModuleID))throw Error('未知敵人積木：'+r.ModuleID);
 relicScale(d,20,1);return d;
}
const pct=v=>Math.round(Number(v||0)*1000000)/10000;
function describe(r,d){
 const mod=(d.EnemyModules||[]).find(m=>m.ModuleID===r.ModuleID&&enabled(m));if(!mod)throw Error('未知敵人積木：'+r.ModuleID);
 const p={param1:Number(r.Param1||0),param2:Number(r.Param2||0),p1:pct(r.Param1),p2:pct(r.Param2),duration:Number(r.Duration||0),durationText:['poison','burning'].includes(r.StatusID)?'持續至解除':r.StatusID==='block'?'抵擋下一段傷害後消失':'持續'+(Number(r.Duration)||(d.StatusEffects||[]).find(s=>s.StatusID===r.StatusID)?.DefaultDuration||1)+'回合',stacks:Math.max(1,Number(r.Stacks||0)),value:Number(r.TriggerValue||0),hit:Number(r.Param2||0),chance:pct(r.Chance==null||r.Chance===''?1:r.Chance),status:(d.StatusEffects||[]).find(s=>s.StatusID===r.StatusID)?.Name||({physical:'物攻',magic:'魔攻'})[r.StatusID]||r.StatusID||'無'};
 const chance=Number(r.Chance==null||r.Chance===''?1:r.Chance),prefix=chance<1&&r.TriggerType!=='passive'&&!String(mod.DescriptionTemplate).includes('{chance}')?pct(chance)+'%機率，':'';
 return prefix+String(mod.DescriptionTemplate||'').replace(/\{([a-zA-Z0-9]+)\}/g,(_,k)=>{if(!(k in p))throw Error('未知說明參數：'+k);return p[k]});
}
function compile(d){
 validate(d);return {...d,EnemyBehaviors:d.EnemyBehaviors.filter(enabled).map(r=>({...r,ActionType:r.ModuleID,Message:(r.Name?'【'+r.Name+'】':'')+describe(r,d)})),BossPhases:d.BossPhases.filter(enabled).map(r=>({...r,Message:''}))};
}
function relicScale(d,floor,depth){
 const c=Object.fromEntries((d.RelicConfig||[]).map(r=>[r.Key,r.Value]));
 for(const k of ['ProgressKnee','EarlyProgressFactor','LateProgressOffset','TierOrigin','TierStep','DepthGrowth'])if(!Number.isFinite(Number(c[k])))throw Error('缺少遺物難度設定：'+k);
 const tiers=String(c.TierMultipliers||'').split(',').map(Number);if(tiers.length!==9||tiers.some(v=>!Number.isFinite(v)||v<=0)||Number(c.TierStep)<=0)throw Error('遺物倍率階梯無效');
 const f=Math.max(0,Math.trunc(Number(floor)||0)),e=f<=Number(c.ProgressKnee)?f*Number(c.EarlyProgressFactor):f+Number(c.LateProgressOffset),i=Math.max(0,Math.min(tiers.length-1,Math.floor((e-Number(c.TierOrigin))/Number(c.TierStep))));
 return tiers[i]*Math.pow(Number(c.DepthGrowth),Math.max(1,Math.trunc(Number(depth)||1))-1);
}
function metric(s,a,stages){
 const t=String(a.ConditionType||''),id=String(a.TargetID||''),m=s.achievementMetrics||{};
 if(t==='max_clear')return Math.max(Number(s.maxCleared)||0,Number(s.bestClear)||0);
 if(t==='level')return Number(s.level)||1;
 if(t==='enemy_kill')return Number(s.enemyDefeatCounts?.[id])||0;
 if(t==='max_round_damage')return Number(m.maxRoundDamage)||0;
 if(t==='perfect_clear'){const p=m.perfectClears||{};if(Object.hasOwn(p,id))return Number(p[id])||0;return stages.filter(r=>r.EnemyID===id).reduce((n,r)=>n+(Number(p[r.Floor])||0),0)}
 return 0;
}
function reset(s,old){
 if(Number(s.mainProgressEpoch||0)>=epoch)return s;
 const x=JSON.parse(JSON.stringify(s)),ach={...(x.achievedAchievements411||{})};
 for(const a of old.Achievements||[])if(enabled(a)&&metric(x,a,old.Stages||[])>=Number(a.TargetValue||1))ach[a.AchievementID]=true;
 for(const [id,yes] of Object.entries(x.claimedAchievements||{}))if(yes)ach[id]=true;
 x.achievedAchievements411=ach;x.mainProgressEpoch=epoch;x.maxCleared=0;x.bestClear=0;x.floor=1;x.currentFloor=1;x.checkpoint=0;x.clearCount={};x.bossGemClaimed={};x.currentBattle=null;x.pendingBattleFloor=null;x.page='town';
 const m=x.achievementMetrics||{};x.achievementMetrics={...m,perfectClears:{}};
 for(const k of ['mainDamageQueue68','mainDamageQueue','mainClearRecords','mainPerfectClears','mainStagePreviewFloor','battleSeries391'])delete x[k];
 return x;
}
g.RPG411=Object.freeze({epoch,enabled,cfg,validate,describe,compile,relicScale,metric,reset});
})(globalThis);

const RPG411=globalThis.RPG411;

// ============================================================
// 07｜維護狀態與本次裝備等級回填
// ============================================================
/** 本次核准的裝備等級；此入口只寫 Equipment，不發布、不寫玩家資料。 */
function applyEquipmentLevels464(){
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{return applyEquipmentLevels464Unlocked_();}finally{lock.releaseLock();}
}

function planningEquipmentLevelErrors465_(data){
  const errors=[];
  for(const r of data.Equipment||[]){
    const a=r['等級'],b=r.Level;
    const filled=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
    if(filled(a)&&filled(b)&&Number(a)!==Number(b))errors.push('Equipment '+r.ItemID+'：等級與 Level 不一致，請保留單一欄位。');
    for(const [key,value]of [['等級',a],['Level',b]]){
      if(!filled(value))continue;
      const n=Number(value);
      if(typeof value==='boolean'||!Number.isInteger(n)||n<1||n>100)errors.push('Equipment '+r.ItemID+'：'+key+' 必須為 1～100 整數。');
    }
  }
  return errors;
}

/** 唯讀：不顯示金鑰、不重建排程、不執行備份或刪除。 */
function checkMaintenanceStatus465(){
  const props=PropertiesService.getScriptProperties();
  const handlers={
    snapshotPlayerSavesToSheet:PLAYER_SAVES_SNAPSHOT_PROP_,
    snapshotAccountsToSheet:ACCOUNTS_SNAPSHOT_PROP_,
    snapshotRedeemClaimsToSheet:'REDEEM_CLAIMS_LAST_SNAPSHOT_AT',
    snapshotWorldBossStateToSheet:WORLD_BOSS_STATE_SNAPSHOT_PROP_,
    snapshotAuctionWorldBossRuntimeToSheets:AUCTION_WB_RUNTIME_SNAPSHOT_PROP_,
    cleanupExpiredWorldBossData:null,
  };
  const supported=new Set(Object.keys(handlers).concat(['onOpen']));
  const triggers=ScriptApp.getProjectTriggers().map(t=>({handler:t.getHandlerFunction(),eventType:String(t.getEventType())}));
  const unknown=triggers.filter(t=>!supported.has(t.handler));
  const required=['SUPABASE_URL','SUPABASE_SERVICE_KEY','SERVER_SECRET','TOKEN_SECRET'];
  const configured=Object.fromEntries(required.map(k=>[k,!!String(props.getProperty(k)||'').trim()]));
  const jobs=Object.keys(handlers).map(handler=>({handler,triggerCount:triggers.filter(t=>t.handler===handler).length,lastSnapshotAt:handlers[handler]?props.getProperty(handlers[handler])||null:null}));
  const out={ok:required.every(k=>configured[k])&&unknown.length===0,version:'maintenance482',readOnly:true,scriptTimeZone:Session.getScriptTimeZone(),configured,publishedVersion:props.getProperty('PUBLISHED_GAME_DATA_VERSION')||null,jobs,unknownTriggers:unknown,notes:['僅能列出目前執行者可管理的觸發器；其他擁有者的觸發器須由其自行核對。','triggerCount=0 只表示未找到該排程，不會自動安裝；拳擊結算可能由 Supabase 負責。','相容入口保留不代表已確認仍有客戶端使用。']};
  console.log(JSON.stringify(out,null,2));
  return out;
}

const EQUIPMENT_LEVELS464 = {
  "gmSword": 100,
  "event01": 21,
  "starterBlade1": 44,
  "starterArmor1": 35,
  "starterCrown1": 44,
  "berserkerRing": 46,
  "gloryArmor1": 73,
  "gloryArmor0": 75,
  "heroCrown1": 49,
  "heroCrown0": 47,
  "berserkerCrown1": 48,
  "berserkerCrown0": 47,
  "berserkerSword": 60,
  "luckyWeapon1": 71,
  "luckyWeapon2": 76,
  "luckyWeapon3": 91,
  "luckyWeapon4": 58,
  "luckyWeapon5": 58,
  "luckyWeapon6": 63,
  "judgment": 71,
  "lichRing": 47,
  "coreOverclockPlugin": 69,
  "twilightSword": 56,
  "phantomLegendCloak": 75,
  "shortSword": 1,
  "magicBranch": 1,
  "longSword": 3,
  "clothArmorA": 4,
  "clothArmorB": 3,
  "leatherHat": 1,
  "glasses": 2,
  "critRing": 4,
  "ironRingSpecial": 3,
  "chainArmor": 4,
  "bracer": 1,
  "apprenticeRobe": 1,
  "samuraiBlade": 15,
  "natureStaff": 22,
  "reflectArmor": 18,
  "naturalBracelet": 4,
  "naturalRing": 7,
  "shuriken": 6,
  "mageHat": 3,
  "apprenticeMageBracer": 4,
  "soldierArmor": 6,
  "magicRing": 1,
  "powerRing": 5,
  "mindsEye": 16,
  "houndFang": 20,
  "dragonsteelSword": 12,
  "arcaneBlade": 10,
  "hawkEyeRing": 7,
  "dragonScaleArmorShop": 13,
  "modernShield": 23,
  "graveSword": 17,
  "soulStaff": 16,
  "executionRing": 13,
  "boneArmorShop": 27,
  "necromancerCharmShop": 20,
  "dragonLeatherHat": 9,
  "dragonClawRing": 21,
  "dragonScaleBracer": 12,
  "azureRobe": 12,
  "arcaneRing": 22,
  "wyvernGlasses": 11,
  "dragonGuardArmor": 24,
  "iceCrystalRing": 27,
  "blackScaleArmor": 15,
  "twinDragonRing": 28,
  "bahamutBlade": 31,
  "bahamutStaff": 31,
  "bahamutEye": 24,
  "graveHelm": 15,
  "boneRing": 18,
  "spiritVeil": 27,
  "soulRing": 29,
  "cryptArmor": 37,
  "graveGauntlet": 20,
  "necromancerRobe": 26,
  "executionerAxe": 30,
  "forgottenCharm": 31,
  "plagueRing": 31,
  "frostBoneArmor": 29,
  "archmageSkull": 27,
  "azraelScythe": 49,
  "azraelGrimoire": 48,
  "azraelCrown": 38,
  "imperialVisor": 29,
  "cityCharm": 30,
  "dragonSealRing": 39,
  "shadowBracer": 44,
  "imperialRobe": 40,
  "ironGuardArmor": 44,
  "jadeMask": 39,
  "judgmentRing": 41,
  "dragonVeinCharm": 40,
  "royalGuardGauntlet": 41,
  "empressCrown": 47,
  "imperialDragonArmor": 51,
  "imperialDragonRing": 53,
  "guardianMace": 28,
  "warhawkHelm": 22,
  "arcaneCirclet": 24,
  "fortressHelm": 34,
  "dragonScholarLens": 35,
  "warriorScaleMail": 25,
  "arcaneWardRobe": 37,
  "bloodsteelBracer": 37,
  "manaConduit": 41,
  "berserkSignet": 31,
  "sorcererRing": 31,
  "bastionRing": 29,
  "gearHoundFang": 27,
  "pulseLens": 21,
  "sawbladeArm": 30,
  "reactorArmor": 26,
  "nullGuardHelm": 39,
  "plasmaRing": 26,
  "bloodDriveArmor": 25,
  "disruptorCharm": 47,
  "imperialSaw": 30,
  "emperorBreaker": 43,
  "emperorCore": 56,
  "orichalcumCrown": 64,
  "empireZeroRing": 62,
  "abyssCoralBlade": 51,
  "tidecallerRobe": 53,
  "anglerCrown": 44,
  "leviathanScale": 52,
  "sirenPendant": 58,
  "trenchGauntlet": 50,
  "krakenEyeRing": 53,
  "frostPearlCirclet": 59,
  "sunkenAnchor": 43,
  "neptisTrident": 53,
  "abyssalCrown": 65,
  "leviathanHeart": 67,
  "oceanSovereignRing": 72,
  "starfallSaber": 53,
  "nebulaMantle": 57,
  "oracleLens": 54,
  "riftBracelet": 63,
  "cometRing": 61,
  "gravityPlate": 60,
  "voidMageCrown": 58,
  "eclipseCharm": 60,
  "astralLance": 47,
  "astraGreatsword": 58,
  "celestialObserverCrown": 71,
  "singularityCore": 76,
  "eclipseSovereignRing": 73,
  "clockworkBlade": 45,
  "eternalKnightArmor": 69,
  "timeSandCrown": 63,
  "ironJudgmentGauntlet": 64,
  "arcaneDevourerRing": 64,
  "timeMirrorArmor": 62,
  "twinbladeSignet": 64,
  "eternalSentinelHelm": 65,
  "judgmentCore": 70,
  "chronosPhysicalBlade": 68,
  "chronosArcaneStaff": 68,
  "chronosSpellblade": 64,
  "slowTimeRing": 54,
  "mirrorRebirthRing": 50,
  "mirrorCurseHood": 56,
  "mirrorShieldArmor": 61,
  "mirrorLifePendant": 57,
  "mirrorJealousBlade": 51,
  "mirrorFateGrimoire": 55,
  "mirrorReflectionBracer": 58,
  "mirrorMyriadRing": 61,
  "mirrorGateMask": 58,
  "mirrorImageGreatsword": 68,
  "mirrorMyriadStaff": 67,
  "mirrorTwinSpellblade": 65,
  "mirrorFormlessArmor": 83,
  "mirrorReverseCrown": 68,
  "mirrorReflectionRing": 67,
  "assassinRing": 35,
  "fortuneBell": 10,
  "spatulaGod": 56,
  "magicBranchII": 59,
  "fastsliver": 39,
  "vturtle": 85,
  "thalessiahead": 90,
  "turguraWeapon": 95,
  "terraxArmor": 89,
  "velskasp": 85,
  "erebetisWeapon": 94,
  "aurionSp": 70,
  "reysaanWeapon": 71,
  "velasienRing": 72,
  "tysseviaRing": 81,
  "regestaScale": 87,
  "goldendragonWeapon1": 90,
  "goldendragonWeapon2": 80,
  "goldendragonWeapon3": 80,
  "forgeBlank172": 1,
  "chaosSeverBlade": 80,
  "chaosSoulStaff": 72,
  "chaosTwinBlade": 82,
  "chaosFateCrown": 75,
  "chaosDevourArmor": 87,
  "chaosBarrierCore": 48,
  "chaosCurseRing": 66
};
function applyEquipmentLevels464Unlocked_(){
 const book=typeof ss_==='function'?ss_():SpreadsheetApp.getActiveSpreadsheet();
 const sheet=book&&book.getSheetByName('Equipment');if(!sheet)throw Error('找不到 Equipment 工作表');
 const values=sheet.getDataRange().getValues(),headers=values[0].map(x=>String(x).trim());
 if(headers.filter(x=>x==='ItemID').length!==1)throw Error('ItemID 表頭缺少或重複');
 const columns=headers.map((x,i)=>['等級','Level'].includes(x)?i:-1).filter(i=>i>=0);
 if(columns.length>1)throw Error('等級／Level 欄位重複，請先保留唯一的等級欄');
 const idCol=headers.indexOf('ItemID'),existing=columns.length?columns[0]:-1,seen=new Set(),pending=[];
 for(let i=1;i<values.length;i++){
  const id=String(values[i][idCol]||'').trim();if(!id)continue;
  if(seen.has(id))throw Error('重複 ItemID：'+id);seen.add(id);
  if(!Object.prototype.hasOwnProperty.call(EQUIPMENT_LEVELS464,id))continue;
  const before=existing<0?'':values[i][existing],rating=EQUIPMENT_LEVELS464[id];
  if(before!==''&&before!=null&&Number(before)!==rating)throw Error('已有不同等級，未修改：'+id+'，請先確認原值');
  pending.push([i,rating]);
 }
 const missing=Object.keys(EQUIPMENT_LEVELS464).filter(id=>!seen.has(id));
 if(missing.length)throw Error('缺少已確認的裝備，未修改：'+missing.join('、'));
 // All validation completes before the first write. Preserve non-target cells/formulas.
 const col=existing<0?headers.length:existing;
 if(col+1>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),col+1-sheet.getMaxColumns());
 if(existing<0)sheet.getRange(1,col+1).setValue('等級');
 const range=sheet.getRange(2,col+1,values.length-1,1),old=range.getValues(),formulas=range.getFormulas();
 const next=old.map((r,i)=>[formulas[i][0]||r[0]]);for(const [i,rating]of pending)next[i-1]=[rating];range.setValues(next);
 const cell=sheet.getRange(2,col+1).getA1Notation();
 const rule=SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=OR(LEN('+cell+')=0,AND(ISNUMBER('+cell+'),'+cell+'=INT('+cell+'),'+cell+'>=1,'+cell+'<=100))').setAllowInvalid(false).setHelpText('裝備 Lv 評價：1～100 整數；只供顯示，不限制穿戴。').build();
 range.setDataValidation(rule);sheet.getRange(1,col+1).setNote('已確認的裝備強度 Lv，1～100 整數。未填維持舊來源推算；鍛造成品另行評估。');
 SpreadsheetApp.flush();const result={ok:true,matched:pending.length,column:headers[col]||'等級',published:false};console.log(JSON.stringify(result));return result;
}

/** Approved competition planning. No publish, player writes, or triggers. */
const MIST_PLANNING465={
  "MistConfig": [
{"Key": "RoadChestCap", "Value": 5},{"Key": "RoadChestRespawnMinutes", "Value": 30},{"Key": "RoadChestLegendaryPercent", "Value": 30},{"Key": "RoadChestRandomPercent", "Value": 40},{"Key": "RoadChestTrapPercent", "Value": 30},{"Key": "RoadChestTrapHpPercent", "Value": 80},
{"Key": "StaminaPackCap", "Value": 10},{"Key": "StaminaPackWarningMinutes", "Value": 30},{"Key": "StaminaPackEnergy", "Value": 10},{"Key": "AirdropVisionRadius", "Value": 2},
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
      "Value": 10
    },
    {
      "Key": "EnergyCap",
      "Value": 10
    },
    {
      "Key": "EnergyRecoveryMinutes",
      "Value": 60
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
      "Value": "MistRankRewards"
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
 for(const [k,limit] of [['StaminaPackCap',10],['StaminaPackWarningMinutes',1440],['StaminaPackEnergy',20],['AirdropVisionRadius',2]])
  if(cfg[k]!==undefined&&(!Number.isSafeInteger(Number(cfg[k]))||Number(cfg[k])<1||Number(cfg[k])>limit))errors.push('MistConfig '+k+' 必須為 1～'+limit+' 整數');
 const roadKeys492=['RoadChestCap','RoadChestRespawnMinutes','RoadChestLegendaryPercent','RoadChestRandomPercent','RoadChestTrapPercent','RoadChestTrapHpPercent'];
 const roadCount492=roadKeys492.filter(k=>cfg[k]!==undefined).length;
 if(roadCount492&&roadCount492!==6)errors.push('路邊寶箱六項設定必須完整');
 for(const k of roadKeys492){
  if(cfg[k]===undefined)continue;
  const min=['RoadChestLegendaryPercent','RoadChestRandomPercent','RoadChestTrapPercent'].includes(k)?0:1;
  const max=k==='RoadChestCap'?10:k==='RoadChestRespawnMinutes'?1440:k==='RoadChestTrapHpPercent'?99:100;
  if(!Number.isSafeInteger(Number(cfg[k]))||Number(cfg[k])<min||Number(cfg[k])>max)errors.push('MistConfig '+k+' 必須為 '+min+'～'+max+' 整數');
 }
 if(roadCount492===6&&Number(cfg.RoadChestLegendaryPercent)+Number(cfg.RoadChestRandomPercent)+Number(cfg.RoadChestTrapPercent)!==100)errors.push('路邊寶箱三種結果機率合計必須為 100');
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

/** Run once after installing maintenance482. Does not publish or touch player saves. */
function removeRetiredMode482() {
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try {
  const ss=typeof ss_==='function'?ss_():SpreadsheetApp.getActiveSpreadsheet();
  const source=ss.getSheetByName('BoxingSeasons_SCHEMA');
  let rewards=ss.getSheetByName('MistRankRewards');
  if(!rewards||rewards.getLastRow()<2){
   if(!source)throw Error('缺少 MistRankRewards，請先從目前發布企劃取得獎勵設定。');
   const rows=source.getDataRange().getValues(),header=rows[0].map(String),at=header.indexOf('SeasonID');
   const row=rows.find((r,i)=>i>0&&r[at]==='2026-W42');if(!row)throw Error('找不到目前沿用的獎勵設定，未執行清理。');
   const indices=header.map((k,i)=>k.indexOf('Rank')===0?i:-1).filter(i=>i>=0);
   if(!indices.length)throw Error('獎勵欄位不存在，未執行清理。');
   if(!rewards)rewards=ss.insertSheet('MistRankRewards');
   rewards.getRange(1,1,2,indices.length).setValues([indices.map(i=>header[i]),indices.map(i=>row[i])]);rewards.setFrozenRows(1);
  }
  const deletedSheets=[],deletedTriggers=[];
  for(const t of ScriptApp.getProjectTriggers())if(/boxing/i.test(t.getHandlerFunction())){deletedTriggers.push(t.getHandlerFunction());ScriptApp.deleteTrigger(t);}
  for(const sh of ss.getSheets())if(/boxing/i.test(sh.getName())){deletedSheets.push(sh.getName());ss.deleteSheet(sh);}
  const config=ss.getSheetByName('GameConfig');
  if(config){const rows=config.getDataRange().getValues(),ki=rows[0].indexOf('Key');if(ki<0)throw Error('GameConfig 缺少 Key');for(let i=rows.length-1;i>0;i--)if(/boxing/i.test(String(rows[i][ki])))config.deleteRow(i+1);}
  const mist=ss.getSheetByName('MistConfig');if(mist){const rows=mist.getDataRange().getValues(),ki=rows[0].indexOf('Key'),vi=rows[0].indexOf('Value');for(let i=1;i<rows.length;i++)if(rows[i][ki]==='RewardTemplate')mist.getRange(i+1,vi+1).setValue('MistRankRewards');}
  const props=PropertiesService.getScriptProperties();for(const k of Object.keys(props.getProperties()))if(/boxing/i.test(k))props.deleteProperty(k);
  SpreadsheetApp.flush();
  return {ok:true,deletedSheets,deletedTriggers,published:false,note:'僅能刪除目前執行者的觸發器；其他擁有者須各執行一次。完成後可移除這個一次性函式。'};
 } finally {lock.releaseLock();}
}
