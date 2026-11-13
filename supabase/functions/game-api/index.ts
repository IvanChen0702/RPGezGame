// @ts-nocheck
import { createGameLease446, retainGameRequest446 } from './lease446.ts';
/* Shared planning compiler and migration. No game-content fallback. */
(function(g){
'use strict';
const epoch=411,enabled=r=>r.Enabled!==false&&String(r.Enabled).toLowerCase()!=='false';
const cfg=(d,k,f)=>{const r=(d.GameConfig||[]).find(r=>r.Key===k);return r?r.Value:f};
function validate(d){
 if(Number(cfg(d,'MainProgressEpoch',0))!==epoch)throw Error('企劃資料尚未升級至411，請完成發布後重新整理。');
 for(const key of ['MainRecordStartFloor','MainStoryEndFloor','WorldBossUnlockFloor','ExtremeUnlockFloor','DungeonUnlockFloor','RelicUnlockFloor','ArenaUnlockFloor','BoxingUnlockFloor','ChallengeUnlockFloor'])if(!Number.isFinite(Number(cfg(d,key,undefined))))throw Error('缺少遊戲設定：'+key);
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
// v368: NPC quests, quest eggs, reward ownership. Base engine v336 retained.
// v11.38.333: cumulative Chaos111-115 + eight Chaos pets + Chaos pet egg; retains v325 avatar profiles.
// v11.38.242: starting skills and authoritative assassin stat calculation.
// @ts-nocheck
// v11.38.126: designated players support server-verified login usernames and AccountIDs.
const PET_DEFAULT297={"PetConfig":[],"PetTrainingCosts":[],"PetQualities":[],"PetSpecies":[],"PetTraits":[],"Consumables":[],"ShopEntries":[],"GiftBoxes":[],"GiftBoxTiers":[],"GiftBoxRewards":[]};
// Shared deterministic rules. Client displays; server owns every mutation/roll.
function petRows297(data,name){return (data?.[name]||PET_DEFAULT297[name]||[]).filter(r=>r.Enabled!==0&&r.Enabled!==false&&!['false','0'].includes(String(r.Enabled).toLowerCase()));}
function petConfig297(data,key){return petRows297(data,'PetConfig').find(r=>r.Key===key)?.Value;}
function petInteger297(value,min=0,max=2147483647){const n=Number(value);if(value==null||value===''||!Number.isSafeInteger(n)||n<min||n>max)throw Error('PET_SETTING_REQUIRED');return n;}
function petPick297(rows,rng){if(!rows.length)throw Error('PET_POOL_EMPTY');const sum=rows.reduce((s,r)=>s+Number(r.Weight??r.Probability??1),0);if(!(sum>0))throw Error('PET_POOL_INVALID');let n=rng()*sum;for(const r of rows){n-=Number(r.Weight??r.Probability??1);if(n<0)return r;}return rows.at(-1);}
function petTrait297(data,quality,rng){const r=petPick297(petRows297(data,'PetTraits').filter(r=>r.QualityID===quality),rng),lo=petInteger297(r.MinValue),hi=petInteger297(r.MaxValue,lo);return {traitId:r.TraitID,quality:r.QualityID,stat:r.Stat,mode:r.Mode,value:lo+Math.floor(rng()*(hi-lo+1)),locked:false};}
function petCreate297(data,species,rng,id,advanced=false){if(!petRows297(data,'PetSpecies').some(r=>r.PetID===species))throw Error('PET_SPECIES_MISSING');return {id,species,level:1,exp:0,traits:[petTrait297(data,advanced?'legendary':'common',rng)],origin:advanced?'advanced':'normal'};}
function petRequiredExp297(data,level){return Math.ceil(Number(petConfig297(data,'BaseExp')??10)*Math.pow(Number(petConfig297(data,'ExpGrowth')??1.1),level-1));}
function petGain297(data,pet,amount,rng){const max=petInteger297(petConfig297(data,'MaxLevel'),1,1000);if(pet.level>=max)return;pet.exp+=petInteger297(amount);while(pet.level<max&&pet.exp>=petRequiredExp297(data,pet.level)){pet.exp-=petRequiredExp297(data,pet.level);pet.level++;if(String(petConfig297(data,'UnlockLevels')||'1,50,100').split(',').map(Number).includes(pet.level))pet.traits.push(petTrait297(data,'common',rng));}if(pet.level>=max)pet.exp=0;}
function petEquipped297(save){return (save.pets297||[]).find(p=>p.id===save.equippedPet297)||null;}
function petTraits297(save){const p=petEquipped297(save);return p?(p.traits||[]).slice(0,p.level>=100?3:p.level>=50?2:1):[];}
function petStat297(stats,save){const traits=petTraits297(save);for(const stat of ['hp','patk','matk','def','crit','critDamage']){const a=traits.filter(t=>t.stat===stat),pct=a.filter(t=>t.mode==='percent').reduce((s,t)=>s+t.value,0),flat=a.filter(t=>t.mode==='flat').reduce((s,t)=>s+t.value,0);stats[stat]=Math.trunc(Number(stats[stat]||0)*(1+pct/100)+flat);}stats.hp=Math.max(1,stats.hp);stats.crit=Math.min(100,Math.max(0,stats.crit));return stats;}
function petSum297(save,stat){return petTraits297(save).filter(t=>t.stat===stat).reduce((s,t)=>s+t.value,0);}
function petReduction297(save){return petTraits297(save).filter(t=>t.stat==='reduction').reduce((s,t)=>s*(1-t.value/100),1);}
function petRolls297(save,stat,rng){return petTraits297(save).filter(t=>t.stat===stat).map(t=>rng()<t.value/100);}
function petTrain297(data,save,pet,rng){const traits=pet.traits,locked=traits.filter(t=>t.locked).length;if(locked===traits.length)throw Error('PET_ALL_LOCKED');const row=petRows297(data,'PetTrainingCosts').find(r=>Number(r.LockedCount)===locked),cost=petInteger297(row?.StoneCost,1);if(Number(save.stones||0)<cost)throw Error('PET_STONES_INSUFFICIENT');const qualities=petRows297(data,'PetQualities');if(Math.abs(qualities.reduce((s,r)=>s+Number(r.Probability),0)-1)>1e-9)throw Error('PET_QUALITY_PROBABILITY_INVALID');const next=traits.map(t=>t.locked?t:petTrait297(data,petPick297(qualities,rng).QualityID,rng));save.stones-=cost;if(save.enhanceStones!=null)save.enhanceStones=save.stones;pet.traits=next;return cost;}
function petPotion297(data,save,pet,quantity,rng){quantity=petInteger297(quantity,1,99999);const cap=Number(petConfig297(data,'MaxLevel'));if(pet.level>=cap)throw Error('PET_MAX_LEVEL');const owned=Number(save.consumables?.petExpPotion||0);if(quantity>owned)throw Error('PET_POTION_INSUFFICIENT');let used=0;while(used<quantity&&pet.level<cap){petGain297(data,pet,Number(petConfig297(data,'PotionExp')),rng);used++;}save.consumables.petExpPotion=owned-used;return used;}
// Published GIFT rows select the pool; pet creation and inventory updates stay server-owned.
function petBoxCatalog297(data,boxId='petEgg'){
 if(!['petEgg','chaosPetEgg'].includes(boxId))throw Error('PET_BOX_DISABLED');
 const box=petRows297(data,'GiftBoxes').find(r=>r.BoxID===boxId),consumable=petRows297(data,'Consumables').find(r=>r.ContentID===boxId&&r.Kind==='gift');if(!box||!consumable)throw Error('PET_BOX_DISABLED');
 const tiers=petRows297(data,'GiftBoxTiers').filter(r=>r.BoxID===boxId),seen=new Set();
 if(!tiers.length||Math.abs(tiers.reduce((s,r)=>s+Number(r.Probability),0)-1)>1e-9)throw Error('PET_BOX_PROBABILITY_INVALID');
 for(const t of tiers){if(!t.TierID||seen.has(t.TierID)||!Number.isFinite(Number(t.Probability))||Number(t.Probability)<=0||Number(t.Probability)>1)throw Error('PET_BOX_PROBABILITY_INVALID');seen.add(t.TierID);}
 const rewards=petRows297(data,'GiftBoxRewards').filter(r=>r.BoxID===boxId),seenRewards=new Set();
 if(rewards.some(r=>!tiers.some(t=>t.TierID===r.TierID)))throw Error('PET_POOL_INVALID');
 for(const t of tiers){const rows=rewards.filter(r=>r.TierID===t.TierID);if(!rows.length)throw Error('PET_POOL_EMPTY');
  for(const r of rows){
   if(!r.RewardID||seenRewards.has(r.RewardID))throw Error('PET_POOL_INVALID');seenRewards.add(r.RewardID);
   const qty=petInteger297(r.Quantity,1),weight=Number(r.Weight),ids=String(r.ContentIDs||'').split(',');
   if(!Number.isFinite(weight)||weight<=0||weight>1000000||Number(r.Sockets||0)!==0||!ids.length||ids.some(id=>!id||id!==id.trim())||new Set(ids).size!==ids.length)throw Error('PET_POOL_INVALID');
   if(r.ContentType==='PET'){
    if(qty!==1)throw Error('PET_QUANTITY_INVALID');
    for(const id of ids){const matches=petRows297(data,'PetSpecies').filter(s=>s.PetID===id);if(matches.length!==1||!Number.isFinite(Number(matches[0].Weight))||Number(matches[0].Weight)<=0)throw Error('PET_SPECIES_MISSING');}
   }else if(boxId==='chaosPetEgg')throw Error('PET_REWARD_UNSUPPORTED');
   else if(r.ContentType==='STONE'){if(ids.length!==1||ids[0]!=='stones')throw Error('PET_REWARD_UNSUPPORTED');}
   else if(r.ContentType==='CONSUMABLE'){if(ids.length!==1||ids[0]!=='petExpPotion')throw Error('PET_REWARD_UNSUPPORTED');}
   else throw Error('PET_REWARD_UNSUPPORTED');
  }
 }
 return {box,tiers};
}
function petOpen297(data,save,quantity,rng,id,boxId='petEgg'){
 quantity=petInteger297(quantity,1,10);const {tiers}=petBoxCatalog297(data,boxId),owned=Number(save.consumables?.[boxId]||0);if(!Number.isSafeInteger(owned)||owned<quantity)throw Error('PET_EGG_EMPTY');const results=[];
 for(let i=0;i<quantity;i++){
  const tier=petPick297(tiers,rng),r=petPick297(petRows297(data,'GiftBoxRewards').filter(r=>r.BoxID===boxId&&r.TierID===tier.TierID),rng),qty=petInteger297(r.Quantity,1),ids=String(r.ContentIDs).split(',');let name,item;
  if(r.ContentType==='PET'){const pool=petRows297(data,'PetSpecies').filter(x=>ids.includes(x.PetID)),s=petPick297(pool,rng);item=petCreate297(data,s.PetID,rng,id());if(boxId==='chaosPetEgg')item.origin='chaos';(save.pets297||=[]).push(item);name=s.Name;}
  else if(r.ContentType==='STONE'){save.stones=Number(save.stones||0)+qty;if(save.enhanceStones!=null)save.enhanceStones=save.stones;name='強化石';}
  else if(r.ContentType==='CONSUMABLE'&&ids[0]==='petExpPotion'){save.consumables.petExpPotion=Number(save.consumables.petExpPotion||0)+qty;name='寵物經驗藥水';}
  else throw Error('PET_REWARD_UNSUPPORTED');
  results.push({type:r.ContentType,id:item?.species||ids[0],item,name,quantity:qty,tier:tier.TierID,jackpot:r.ContentType==='PET'});
 }
 save.consumables[boxId]=owned-quantity;return results;
}


export function makeEngine({base,key,token,actor,planning,privateConfig={},fetcher=fetch,guard=async()=>{}}){
const EDGE_BASE=base,EDGE_KEY=key,EDGE_TOKEN=token,EDGE_ACTOR=actor,EDGE_PLANNING=planning,EDGE_PRIVATE=privateConfig;
const encodeBytes=v=>typeof v==='string'?new TextEncoder().encode(v):new Uint8Array(v.map(x=>x&255));
const Utilities={getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'SHA-256'},Charset:{UTF_8:'UTF-8'},newBlob:s=>({getBytes:()=>[...new TextEncoder().encode(s)]}),
computeDigest:async(_,v)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',encodeBytes(v)))].map(x=>x>127?x-256:x),
computeHmacSha256Signature:async(s,k)=>{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(k),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(s)))].map(x=>x>127?x-256:x)},
formatDate:(d,tz,pattern)=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz||'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(d)).map(x=>[x.type,x.value]));return pattern.replace('yyyy',p.year).replace('MM',p.month).replace('dd',p.day).replace('HH',p.hour).replace('mm',p.minute).replace('ss',p.second)}};
const Session={getScriptTimeZone:()=> 'Asia/Taipei'};
const SpreadsheetApp={getActive:()=>({getSpreadsheetTimeZone:()=> 'Asia/Taipei'})};
const cache=new Map();const CacheService={getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k),removeAll:ks=>ks.forEach(k=>cache.delete(k))})};
const PropertiesService={getScriptProperties:()=>({getProperty:k=>k==='SUPABASE_URL'?base:k==='SUPABASE_SERVICE_KEY'?key:k==='SERVER_SECRET'?'edge-not-used-for-primary':'',setProperty(){},deleteProperty(){}})};
const LockService={getScriptLock:()=>({waitLock:guard,releaseLock:async()=>{}})};
const UrlFetchApp={fetch:async(url,opt={})=>{
 await guard();const u=new URL(url);if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/rest/v1/'))throw Error('OUTBOUND_ROUTE_DENIED');
 const h={...(opt.headers||{}),apikey:key};if(!key.startsWith('eyJ'))delete h.Authorization;
 if(opt.contentType)h['Content-Type']=opt.contentType;
 const r=await fetcher(url,{method:(opt.method||'GET').toUpperCase(),headers:h,body:opt.payload,signal:AbortSignal.timeout(15000)});const text=await r.text();
 return {getResponseCode:()=>r.status,getContentText:()=>text};
}};
async function _asyncArray(method,rows,callback,...args){
 if(method==='sort'){const a=[...rows];for(let i=1;i<a.length;i++){let j=i;while(j>0&&await callback(a[j-1],a[j])>0){[a[j-1],a[j]]=[a[j],a[j-1]];j--;}}return a;}
 let results=[],acc=args[0],start=0;if(method==='reduce'&&!args.length){if(!rows.length)throw Error('EMPTY_REDUCE');acc=rows[0];start=1;}
 for(let i=start;i<rows.length;i++){if(!(i in rows))continue;const v=method==='reduce'?await callback(acc,rows[i],i,rows):await callback(rows[i],i,rows);
 if(method==='reduce')acc=v;else if(method==='map')results.push(v);else if(method==='filter'&&v)results.push(rows[i]);else if(method==='find'&&v)return rows[i];else if(method==='some'&&v)return true;else if(method==='every'&&!v)return false;}
 return method==='reduce'?acc:method==='some'?false:method==='every'?true:method==='find'||method==='forEach'?undefined:results;
}
"use strict";

// Turn Based RPG Backend v11.31.102 - Arena Season Rewards / Glory Gear
/**
 * Turn Based RPG Backend v11.31.47 - Boxing Reward Shadow Test Tool
 * Google Apps Script Web App
 *
 * 使用方式：
 * 1. 把此檔內容貼到 Apps Script 的 Code.gs
 * 2. 執行 setupBackend() 一次並授權
 * 3. 部署 -> 新部署 -> 網頁應用程式
 * 4. 執行身分：我
 * 5. 存取權：任何人
 *
 * 前端建議用 POST + Content-Type: text/plain 傳 JSON，避免 CORS preflight。
 */

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
  BOXING_CONFIG: 'BoxingMachine_SCHEMA',
  BOXING_SEASONS: 'BoxingSeasons_SCHEMA',
  BOXING_ATTEMPTS: 'BoxingAttempts_SCHEMA',
  BOXING_RANKING: 'BoxingRanking_SCHEMA',
  BOXING_REWARDS: 'BoxingRewards_SCHEMA',
  PUBLIC_SHEETS: ['RelicConfig','RelicEnemies','RelicCurses','RelicPools','GameConfig', 'Equipment', 'Skills', 'Consumables', 'Gems', 'Enemies', 'EnemyModules', 'ShopEntries', 'Enhancement', 'StatusEffects', 'EnemyBehaviors', 'BossPhases', 'Titles', 'Achievements', 'DungeonBosses', 'DungeonDifficulties', 'BoxingMachine_SCHEMA', 'BoxingSeasons_SCHEMA', 'WorldBoss_SCHEMA', 'WorldBossPool', 'ArenaConfig', 'ArenaNPC', 'ArenaRewards', 'ExtremeConfig', 'ExtremeStageRewards', 'ExtremeRankRewards', 'GiftBoxes', 'GiftBoxTiers', 'GiftBoxRewards','PetConfig','PetTrainingCosts','PetQualities','PetSpecies','PetTraits','QuestNPCs','Quests','QuestObjectives','QuestRewards','QuestDialogues']
};
const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
const PASSWORD_ITERATIONS = 12000;
const AUCTION_FEE_RATE = 0.10;

// ============================================================
// v11.31.91 Planning Data Publish System
// Google Sheet = CMS only. Published Supabase package = Runtime Planning Primary.
// Runtime tables (PlayerSave/Auction/Boxing*/WorldBoss*) are NOT part of this package.
// ============================================================
const PLANNING_CURRENT_TABLE_ = 'GameDataCurrent';
const PLANNING_VERSIONS_TABLE_ = 'GameDataVersions';
const PLANNING_CURRENT_ID_ = 'production';
const PLANNING_CACHE_KEY_ = 'planning:published:current:v1';
function publishedPlanningPackage_() {
  return EDGE_PLANNING;
}
function publishedPlanningRows_(sheetName) {
  const pkg = publishedPlanningPackage_(false),
    rows = pkg?.data?.[sheetName];
  if (!Array.isArray(rows)) throw new Error('PLANNING_SHEET_NOT_IN_PUBLISHED_PACKAGE:' + sheetName);
  return rows;
}
// ------------------------------
// Setup
// ------------------------------

function ensureBoxingSchema_() {
  ensureSheet_(DB.BOXING_CONFIG, ['Key', 'Value']);
  ensureSheet_(DB.BOXING_SEASONS, ['SeasonID', 'StartAt', 'EndAt', 'Rank1RewardID', 'Rank2RewardID', 'Rank3RewardID', 'Rank4To10Stones', 'Enabled']);
  ensureSheet_(DB.BOXING_ATTEMPTS, ['ChallengeID', 'SeasonID', 'AccountID', 'Nickname', 'StartedAt', 'SubmittedAt', 'Damage', 'Status']);
  ensureSheet_(DB.BOXING_RANKING, ['SeasonID', 'AccountID', 'Nickname', 'Damage', 'SubmittedAt', 'BuildSnapshotJSON']);
  ensureSheet_(DB.BOXING_REWARDS, ['RewardID', 'SeasonID', 'AccountID', 'Nickname', 'Rank', 'RewardType', 'RewardIDValue', 'Quantity', 'Status', 'CreatedAt', 'ClaimedAt']);
}

/**
 * Apps Script 編輯器可手動執行。
 * 只建立缺少的拳擊機工作表/欄位，不會覆蓋既有 Season 或排行資料。
 */

// ------------------------------
// Web App Entry
// ------------------------------

async function doGet(e) {
  try {
    const action = routeAction_(e);
    const payload = e && e.parameter ? e.parameter : {};
    if (action === 'health') {
      return json_({
        ok: true,
        service: 'turn-based-rpg-backend',
        backendVersion: 'v11.38.325-avatar-profiles',
        now: new Date().toISOString()
      });
    }
    if (action === 'data/version') {
      return json_({
        ok: true,
        dataVersion: cachedDataVersion_()
      });
    }
    if (action === 'data/bootstrap') {
      return json_(getBootstrapData_(String(payload.forceRefresh || '') === '1' || String(payload.forceRefresh || '').toLowerCase() === 'true'));
    }
    if (action === 'leaderboard') {
      const type = String(payload.type || 'clear');
      const limit = clampInt_(payload.limit || 50, 1, 100);
      return json_(await getLeaderboard_(type, limit));
    }
    if (action === 'auction/list') {
      const page = clampInt_(payload.page || 1, 1, 999999);
      const pageSize = clampInt_(payload.pageSize || 50, 1, 100);
      return json_(await getAuctionListCached_(page, pageSize, payload.category));
    }
    return json_({
      ok: false,
      error: 'UNKNOWN_GET_ACTION',
      action: action
    });
  } catch (err) {
    return json_({
      ok: false,
      error: 'SERVER_ERROR',
      message: String(err && err.message || err)
    });
  }
}
async function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || routeAction_(e) || '').replace(/^\/+|\/+$/g, '');
    switch (action) {
      case 'auth/register':
        return json_(register_(body));
      case 'auth/login':
        return json_(login_(body));
      case 'auth/bind':
        return json_({
          ok: false,
          error: 'LOCAL_BIND_DISABLED',
          message: 'New accounts must start from a fresh server save.'
        });
      case 'profile/nickname':
        return json_(await changeNickname_(body));
      case 'save/get':
        return json_(await getSave_(body));
      case 'save/set':
        return json_(await setSave_(body));

      // v11.16.0：靜態遊戲資料也支援 POST。
      // 前端不再依賴 Apps Script GET redirect 作為更新資料的唯一通道。
      case 'data/version':
        return json_({
          ok: true,
          dataVersion: cachedDataVersion_()
        });
      case 'data/bootstrap':
        return json_(getBootstrapData_(body.forceRefresh === true || String(body.forceRefresh || '').toLowerCase() === 'true' || String(body.forceRefresh || '') === '1'));
      case 'auction/list':
        return json_(await getAuctionListCached_(body.page, body.pageSize, body.category));
      case 'auction/create':
        return json_(await createAuction_(body));
      case 'auction/cancel':
        return json_(await cancelAuction_(body));
      case 'auction/buy':
        return json_(await buyAuction_(body));
      case 'auction/my-sales':
        return json_(await getMyAuctionSales_(body));
      case 'auction/claim':
        return json_(await claimAuctionProceeds_(body));
      case 'worldboss/status':
        return json_(await getWorldBossStatus_(body));
      case 'worldboss/ranking':
        return json_(await getWorldBossRanking_(body));
      case 'worldboss/reward/check':
        return json_(await checkWorldBossReward_(body));
      case 'worldboss/start':
        return json_(startWorldBossChallenge_(body));
      case 'worldboss/submit':
        return json_(await submitWorldBossChallenge_(body));
      case 'worldboss/chest/open':
        return json_(await markWorldBossChestOpened_(body));
      case 'redeem/claim':
        return json_(await claimRedeemCode_(body));
      case 'login-gift/status':
      case 'login-gift/checkin':
        return json_(await loginGift278_(body));
      case 'login-gift/ack':
        return json_(await acknowledgeLoginGift278_(body));
      case 'achievement/claim':
        return json_(await claimAchievement_(body));
      case 'boxing/status':
        return json_(await getBoxingStatus_(body));
      case 'boxing/ranking':
        return json_(await getBoxingRanking_(body));
      case 'boxing/start':
        return json_(await startBoxingChallenge_(body));
      case 'boxing/submit':
        return json_(await submitBoxingChallenge_(body));
      case 'boxing/history':
        return json_(await getBoxingHistory_(body));
      case 'boxing/reward/claim':
        return json_(await claimBoxingReward_(body));

      // v11.31.92 Arena Phase 1
      case 'arena/status':
        return json_(await arenaStatus_(body));
      case 'arena/defense/upload':
        return json_(await arenaUploadDefense_(body));
      case 'arena/matches':
        return json_(await arenaGetDailyMatches_(body));
      case 'arena/battle/start':
        return json_(await arenaStartBattle_(body));
      case 'arena/battle/submit':
        return json_(await arenaSubmitBattle_(body));
      case 'arena/revenge/list':
        return json_(await arenaRevengeList_(body));
      case 'arena/reports':
        return json_(await arenaReports_(body));
      case 'arena/ranking':
        return json_(await arenaRanking_(body));
      case 'arena/reward/claim':
        return json_(await arenaClaimReward_(body));
      default:
        return json_({
          ok: false,
          error: 'UNKNOWN_POST_ACTION',
          action: action
        });
    }
  } catch (err) {
    return json_({
      ok: false,
      error: 'SERVER_ERROR',
      message: String(err && err.message || err)
    });
  }
}

// ------------------------------
// Auth
// ------------------------------

function register_(body) {
  throw Error('USE_USERNAME_LOGIN_REGISTER');
}
function login_(body) {
  throw Error('USE_USERNAME_LOGIN');
}
async function changeNickname_(body) {
  const auth = requireAuth_(body.sessionToken);
  const nickname = normalizeNickname_(body.nickname);
  validateNickname_(nickname);
  const lock = LockService.getScriptLock();
  await lock.waitLock(15000);
  try {
    const sbAcc = await accountsSbFindByAccountId_(auth.accountId);
    if (!sbAcc) return {
      ok: false,
      error: 'ACCOUNT_NOT_FOUND'
    };
    const nextRevision = (Number(sbAcc.row_revision) || 0) + 1;

    // Account mutation commits to Supabase first.
    await accountsSbPatchByAccountId_(auth.accountId, {
      nickname: nickname,
      row_revision: nextRevision
    });
    sbAcc.nickname = nickname;
    sbAcc.row_revision = nextRevision;
    const saveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    if (saveRec) {
      const save = await parseSaveRecord_(saveRec);
      save.nickname = nickname;
      await updateSaveRecord_(saveRec, save);
    }
    accountsSheetMirrorFromSbRowSafe_(sbAcc, 'CHANGE_NICKNAME');
    const latestSaveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    return {
      ok: true,
      nickname: nickname,
      revision: Number(latestSaveRec ? latestSaveRec.Revision : 1) || 1
    };
  } finally {
    await lock.releaseLock();
  }
}

// ------------------------------
// Cloud Save
// ------------------------------

async function getSave_(body) {
  const auth = requireAuth_(body.sessionToken);
  const rec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
  if (!rec) return {
    ok: false,
    error: 'SAVE_NOT_FOUND'
  };
  return {
    ok: true,
    revision: Number(rec.Revision) || 1,
    save: await parseSaveRecord_(rec)
  };
}
async function setSave_(body) {
  let stage = 'auth';
  let auth = null;
  try {
    auth = requireAuth_(body.sessionToken);
    stage = 'sanitize';
    let incomingSave = sanitizeIncomingSave_(body.save);
    stage = 'lock';
    const lock = LockService.getScriptLock();
    await lock.waitLock(15000);
    try {
      stage = 'find-save';
      const rec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
      if (!rec) return {
        ok: false,
        error: 'SAVE_NOT_FOUND',
        stage: stage,
        message: '找不到此帳號的 PlayerSave 資料列。'
      };
      const currentRevision = Number(rec.Revision) || 1;
      // Auth clients must compare the revision they last read under the same save lock.
      if (String(body.sessionToken || '').split('.').length === 3) {
        const expected = Number(body.expectedSaveRevision);
        if (!Number.isSafeInteger(expected) || expected !== currentRevision) {
          return {
            ok: false,
            error: 'SAVE_REVISION_CONFLICT',
            revision: currentRevision,
            message: '雲端存檔已變更，請先同步確認，未覆寫雲端資料。'
          };
        }
      }
      stage = 'integrity-guard';
      const currentSave = await parseSaveRecord_(rec);
      incomingSave=await secureRpc78("game_check_client78",{old_s:currentSave,new_s:incomingSave});
      assertNoDangerousSaveRegression_(currentSave, incomingSave);
      const newRevision = currentRevision + 1;
      stage = 'write-save';
      await writeFullSave_(auth.accountId, newRevision, incomingSave);
      stage = 'verify-write';
      const written = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
      if (!written || Number(written.Revision) !== newRevision) {
        return {
          ok: false,
          error: 'SAVE_WRITE_VERIFY_FAILED',
          stage: stage,
          message: '寫入後無法確認最新 Revision。'
        };
      }
      return {
        ok: true,
        revision: newRevision,
        previousRevision: currentRevision,
        overwrite: true
      };
    } finally {
      try {
        await lock.releaseLock();
      } catch (_e) {}
    }
  } catch (err) {
    return {
      ok: false,
      error: String(err && err.message || 'SAVE_SET_FAILED'),
      stage: stage,
      message: String(err && err.message || err || 'SAVE_SET_FAILED')
    };
  }
}

// ------------------------------
// Leaderboard
// ------------------------------

// v11.31.67: Runtime account metadata must never read Accounts_SCHEMA snapshot.
async function runtimeAccountById_(accountId) {
  const sb = await accountsSbFindByAccountId_(String(accountId || '').trim());
  return accountsSbRowToLegacyAccount_(sb);
}

// v11.31.21：短期排行榜快取。展示資料允許數秒延遲；寫入時主動失效。
const RANKING_CACHE_TTL_SEC_ = 8;
function rankingCache_() {
  return CacheService.getScriptCache();
}
function rankingCacheGetJson_(key) {
  try {
    const s = rankingCache_().get(key);
    return s ? JSON.parse(s) : null;
  } catch (_e) {
    return null;
  }
}
function rankingCachePutJson_(key, value) {
  try {
    rankingCache_().put(key, JSON.stringify(value), RANKING_CACHE_TTL_SEC_);
  } catch (_e) {}
}
function invalidateLeaderboardCache_() {
  try {
    rankingCache_().remove('rank:leaderboard:all:v289');
  } catch (_e) {}
}
function invalidateWorldBossRankingCache_(bossInstanceId) {
  try {
    rankingCache_().remove('rank:wb:' + String(bossInstanceId || ''));
  } catch (_e) {}
}
function invalidateBoxingRankingCache_(seasonId) {
  try {
    rankingCache_().remove('rank:boxing:' + String(seasonId || ''));
  } catch (_e) {}
}

// v11.31.28：一般排行榜改直接讀 Supabase PlayerSaves Primary。
// 為了同時支援「等級排行」與「通關排行」，各抓前 N 名後合併；
// 不下載完整 save_json，只從 jsonb 取 equippedTitle，避免排行榜讀取帶回整份玩家存檔。
async function supabaseLeaderboardRows_(limit) {
  if (SUPABASE_PRIMARY_ENABLED_ !== true) throw new Error('SUPABASE_PRIMARY_DISABLED');
  const cfg = supabaseConfig_();
  const n = Math.max(1, Math.min(Math.trunc(Number(limit) || 200), 500));
  const select = encodeURIComponent('account_id,nickname,level,max_cleared,level_reached_at,clear_reached_at,level_time_estimated,clear_time_estimated,title_id:save_json->>equippedTitle');
  const base = cfg.url + '/rest/v1/PlayerSaves?select=' + select;
  const headers = {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key
  };
  const requests = [{
    url: base + '&order=level.desc,level_reached_at.asc.nullslast,account_id.asc&limit=' + n,
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  }, {
    url: base + '&max_cleared=gt.0&order=max_cleared.desc,clear_reached_at.asc.nullslast,account_id.asc&limit=' + n,
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  }];
  const responses = await Promise.all(requests.map(({url,...options})=>UrlFetchApp.fetch(url,options)));
  const merged = new Map();
  responses.forEach((response, idx) => {
    const status = response.getResponseCode(),
      text = response.getContentText();
    if (status < 200 || status >= 300) throw new Error('SUPABASE_LEADERBOARD_READ_HTTP_' + status + '_Q' + (idx + 1) + ': ' + text);
    let data = [];
    try {
      data = JSON.parse(text || '[]');
    } catch (_e) {
      throw new Error('SUPABASE_LEADERBOARD_JSON_INVALID_Q' + (idx + 1));
    }
    if (!Array.isArray(data)) throw new Error('SUPABASE_LEADERBOARD_ROWS_INVALID_Q' + (idx + 1));
    data.forEach(r => {
      const accountId = String(r.account_id || '').trim();
      if (!accountId) return;
      merged.set(accountId, {
        accountId: accountId,
        nickname: String(r.nickname || '冒險者'),
        titleId: String(r.title_id || 'beginner'),
        level: Math.max(1, Math.trunc(Number(r.level) || 1)),
        clearCount: Math.max(0, Math.trunc(Number(r.max_cleared) || 0)),
        levelReachedAt: r.level_reached_at || null,
        clearReachedAt: r.clear_reached_at || null,
        levelTimeEstimated: !!r.level_time_estimated,
        clearTimeEstimated: !!r.clear_time_estimated
      });
    });
  });
  return Array.from(merged.values());
}
async function getLeaderboard_(type, limit) {
  const key = 'rank:leaderboard:all:v289';
  const n = Math.max(1, Math.min(Number(limit) || 200, 500));
  let rows = rankingCacheGetJson_(key);
  if (!Array.isArray(rows)) {
    rows = await supabaseLeaderboardRows_(n);
    rankingCachePutJson_(key, rows);
  }
  return {
    ok: true,
    type: 'all',
    source: 'supabase',
    rows: rows
  };
}

// Apps Script 編輯器可手動執行：確認排行榜來源已切到 Supabase，並顯示前幾筆。

// v11.31.20：所有會修改 PlayerSave 的交易都必須使用 preflight 時看到的 Revision。
function requireTransactionSaveRevision_(body, saveRec) {
  const expected = Math.trunc(Number(body && body.expectedSaveRevision) || 0);
  const current = Math.trunc(Number(saveRec && saveRec.Revision) || 0);
  if (!(expected > 0)) throw new Error('SAVE_PREFLIGHT_REQUIRED');
  if (expected !== current) throw new Error('SAVE_PREFLIGHT_REVISION_MISMATCH');
  return current;
}

// ------------------------------
// World Boss v11.8.0
// ------------------------------
async function worldBossConfig_() {
  const cfg = {};
  // 世界 BOSS 參數集中在獨立 WorldBoss_SCHEMA。
  (await readObjects_(DB.WORLD_BOSS_CONFIG)).forEach(r => {
    const k = String(r.Key || '').trim();
    if (k) cfg[k] = r.Value;
  });
  const n = (k, d) => {
    const v = Number(cfg[k]);
    return Number.isFinite(v) ? v : d;
  };
  return {
    bossId: String(cfg.WorldBossID || 'berserkGiant'),
    name: String(cfg.WorldBossName || '狂暴巨人'),
    maxHp: Math.max(1, Math.trunc(n('WorldBossHP', 2000000))),
    def: Math.trunc(n('WorldBossDEF', 10)),
    patk: Math.max(0, Math.trunc(n('WorldBossPATK', 250))),
    matk: Math.max(0, Math.trunc(n('WorldBossMATK', 250))),
    attempts: Math.max(1, Math.trunc(n('WorldBossAttemptsPerDay', 3))),
    maxTurns: Math.max(1, Math.trunc(n('WorldBossMaxTurns', 5))),
    respawnMinutes: Math.max(1, Math.trunc(n('WorldBossRespawnMinutes', 10))),
    topRewardCount: Math.max(1, Math.trunc(n('WorldBossTopRewardCount', 3))),
    chestStone: Math.max(0, Math.trunc(n('WorldBossChestStone', 200))),
    chestGoldMin: Math.max(0, Math.trunc(n('WorldBossChestGoldMin', 50))),
    chestGoldMax: Math.max(0, Math.trunc(n('WorldBossChestGoldMax', 100))),
    chestGemRate: Math.max(0, Math.min(1, n('WorldBossChestGemRate', 0.15))),
    chestGemId: String(cfg.WorldBossChestGemID || 'berserkGiant')
  };
}
async function worldBossPoolRows_() {
  return (await readObjects_('WorldBossPool')).filter(r => {
    const enabled = r.Enabled === true || String(r.Enabled || '').toLowerCase() === 'true' || String(r.Enabled || '') === '1';
    return enabled && String(r.BossID || '').trim();
  });
}
async function worldBossProfileById_(bossId) {
  const id = String(bossId || '').trim();
  const row = (await worldBossPoolRows_()).find(r => String(r.BossID || '').trim() === id);
  if (!row) return null;
  let params = {};
  try {
    params = JSON.parse(String(row.SkillParams || '{}') || '{}');
  } catch (_e) {}
  return {
    bossId: id,
    name: String(row.Name || id),
    icon: String(row.Icon || ''),
    weight: Math.max(0, Number(row.Weight) || 0),
    skillKey: String(row.SkillKey || '').trim(),
    skillParams: params,
    skillDescription: String(row.SkillDescription || ''),
    rewardGemId: String(row.RewardGemID || '').trim()
  };
}
async function pickNextWorldBossProfile_(previousBossId) {
  const rows = await worldBossPoolRows_();
  if (!rows.length) {
    const cfg = await worldBossConfig_();
    return {
      bossId: cfg.bossId,
      name: cfg.name,
      icon: '',
      weight: 1,
      skillKey: 'berserk_giant',
      skillParams: {},
      skillDescription: '',
      rewardGemId: cfg.chestGemId
    };
  }
  let candidates = rows;
  if (rows.length > 1) candidates = rows.filter(r => String(r.BossID || '').trim() !== String(previousBossId || '').trim());
  const weighted = candidates.map(r => ({
    r,
    w: Math.max(0, Number(r.Weight) || 0)
  }));
  let total = weighted.reduce((n, x) => n + x.w, 0);
  let chosen;
  if (total <= 0) chosen = weighted[Math.floor(Math.random() * weighted.length)].r;else {
    let roll = Math.random() * total;
    chosen = weighted[weighted.length - 1].r;
    for (const x of weighted) {
      roll -= x.w;
      if (roll <= 0) {
        chosen = x.r;
        break;
      }
    }
  }
  return await worldBossProfileById_(chosen.BossID);
}
async function worldBossGemConfig_(gemId) {
  const id = String(gemId || '').trim();
  const row = (await readObjects_('Gems')).find(r => String(r.GemID || '').trim() === id);
  if (!row) return {
    gemId: id,
    name: id || 'BOSS寶石',
    price: 0,
    hp: 0,
    def: 0,
    patk: 0,
    matk: 0,
    crit: 0,
    critDamage: 0,
    bossOnly: true,
    visualColor: '',
    effect: ''
  };
  return {
    gemId: id,
    name: String(row.Name || id),
    price: Math.max(0, Number(row.Price) || 0),
    hp: Number(row.HP) || 0,
    def: Number(row.DEF) || 0,
    patk: Number(row.PATK) || 0,
    matk: Number(row.MATK) || 0,
    crit: Number(row.Crit) || 0,
    critDamage: Number(row.CritDamage) || 0,
    bossOnly: row.BossOnly === true || String(row.BossOnly).toLowerCase() === 'true',
    visualColor: String(row.VisualColor || ''),
    effect: String(row.EffectKey || row.Effect || '').trim()
  };
}
function normalizeWbDateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(value || '').trim();
  const m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return s;
}
function wbDateKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
}
function wbNewId_(prefix) {
  return prefix + '_' + Date.now() + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}
// v11.31.35：保留 72 小時機制，並強化 World Boss start 回傳 boss snapshot；前端同步取消 start POST 自動重送。
const WORLD_BOSS_REWARD_TTL_MS_ = 72 * 60 * 60 * 1000;
async function wbBossExpiryAt_(bossInstanceId) {
  const boss = await findRowByValue_(DB.WORLD_BOSS_STATE, 'BossInstanceID', bossInstanceId);
  if (!boss) return '';
  const deadAt = new Date(String(boss.DeadAt || ''));
  if (isNaN(deadAt.getTime())) return '';
  return new Date(deadAt.getTime() + WORLD_BOSS_REWARD_TTL_MS_).toISOString();
}
async function wbRewardExpiryInfo_(reward, nowMs) {
  const expiresAt = await wbBossExpiryAt_(reward && reward.BossInstanceID);
  const expiryMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  return {
    expiresAt: expiresAt,
    expired: Number.isFinite(expiryMs) && Number(nowMs || Date.now()) >= expiryMs
  };
}
async function wbSbDeleteByBoss_(table, bossInstanceId) {
  const cfg = supabaseConfig_(),
    url = cfg.url + '/rest/v1/' + table + '?boss_instance_id=eq.' + encodeURIComponent(String(bossInstanceId));
  const res = await UrlFetchApp.fetch(url, {
    method: 'delete',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Prefer: 'return=minimal'
    },
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_WB_DELETE_' + table + '_HTTP_' + status + ': ' + text);
}
function wbDeleteSheetRowsByValue_() {
  return 0;
}
async function cleanupExpiredWorldBossData() {
  const lock = LockService.getScriptLock();
  await lock.waitLock(30000);
  try {
    const now = Date.now(),
      states = await readObjects_(DB.WORLD_BOSS_STATE),
      rewards = await readObjects_(DB.WORLD_BOSS_REWARDS);
    let cleanedBosses = 0,
      skippedProcessing = 0,
      attemptRows = 0,
      rewardRows = 0,
      stateRows = 0;
    await _asyncArray("forEach", states.filter(b => String(b.Status || '').toUpperCase() === 'DEAD'), async b => {
      const deadMs = new Date(String(b.DeadAt || '')).getTime();
      if (!Number.isFinite(deadMs) || now < deadMs + WORLD_BOSS_REWARD_TTL_MS_) return;
      const bossId = String(b.BossInstanceID || '');
      if (!bossId) return;
      const bossRewards = rewards.filter(r => String(r.BossInstanceID) === bossId);
      // PROCESSING 可能已鎖定獎勵或已寫入 PlayerSave；為避免交易中斷，整隻 BOSS 暫不清除。
      if (bossRewards.some(r => String(r.Status || '').toUpperCase() === 'PROCESSING')) {
        skippedProcessing++;
        return;
      }
      await _asyncArray("forEach", bossRewards.filter(r => String(r.Status || '').toUpperCase() === 'PENDING'), async r => {
        await updateRowObject_(DB.WORLD_BOSS_REWARDS, r.__row, {
          Status: 'EXPIRED'
        });
      });
      await wbSbDeleteByBoss_('WorldBossAttempts', bossId);
      await wbSbDeleteByBoss_('WorldBossRewards', bossId);
      attemptRows += wbDeleteSheetRowsByValue_(DB.WORLD_BOSS_ATTEMPTS, 'BossInstanceID', bossId);
      rewardRows += wbDeleteSheetRowsByValue_(DB.WORLD_BOSS_REWARDS, 'BossInstanceID', bossId);
      await wbStateSbDeleteById_(bossId);
      // v11.31.62: do not mutate WorldBossState_SCHEMA here; Daily Snapshot owns that backup sheet.
      invalidateWorldBossRankingCache_(bossId);
      cleanedBosses++;
    });
    const out = {
      ok: true,
      cleanedBosses,
      skippedProcessing,
      attemptRows,
      rewardRows,
      stateRows,
      serverNow: new Date().toISOString()
    };
    console.log('===== World Boss 72h Cleanup =====');
    console.log(JSON.stringify(out, null, 2));
    return out;
  } finally {
    await lock.releaseLock();
  }
}

/**
 * 一次性修復：清除歷史 bug 產生的重複 ALIVE 世界 Boss。
 * 保留 SpawnedAt 最新的一隻 ALIVE；其餘 ALIVE instance 連同 attempts/rewards 一併刪除。
 * 執行前可先跑 previewDuplicateAliveWorldBosses() 確認。
 */

async function ensureWorldBossInstance_() {
  const cfg = await worldBossConfig_(),
    rows = await readObjects_(DB.WORLD_BOSS_STATE),
    now = new Date();
  const timeMs_ = v => {
    const n = new Date(String(v || '')).getTime();
    return Number.isFinite(n) ? n : 0;
  };
  // Supabase REST 未指定排序時回傳順序不保證固定。
  // 永遠優先沿用「最新 SpawnedAt 的 ALIVE instance」，避免每次進頁重新抽 Boss。
  const alive = rows.filter(r => String(r.Status || '').toUpperCase() === 'ALIVE' && Number(r.CurrentHP || 0) > 0).sort((a, b) => timeMs_(b.SpawnedAt) - timeMs_(a.SpawnedAt) || String(b.BossInstanceID || '').localeCompare(String(a.BossInstanceID || '')));
  if (alive.length) return alive[0];
  const dead = rows.filter(r => String(r.Status || '').toUpperCase() === 'DEAD' || Number(r.CurrentHP || 0) <= 0).sort((a, b) => timeMs_(b.DeadAt || b.SpawnedAt) - timeMs_(a.DeadAt || a.SpawnedAt) || String(b.BossInstanceID || '').localeCompare(String(a.BossInstanceID || '')));
  const previous = dead[0] || null;
  if (previous) {
    const respawnAt = new Date(String(previous.RespawnAt || previous.DeadAt || 0));
    if (Number.isFinite(respawnAt.getTime()) && respawnAt.getTime() > now.getTime()) return previous;
  }
  const previousBossId = String(previous?.BossID || '');
  const profile = await pickNextWorldBossProfile_(previousBossId),
    id = wbNewId_('wb');
  await appendObject_(DB.WORLD_BOSS_STATE, {
    BossInstanceID: id,
    BossID: profile.bossId,
    Name: profile.name,
    MaxHP: cfg.maxHp,
    CurrentHP: cfg.maxHp,
    DEF: cfg.def,
    PATK: cfg.patk,
    MATK: cfg.matk,
    SpawnedAt: now.toISOString(),
    DeadAt: '',
    RespawnAt: '',
    Status: 'ALIVE',
    Revision: 1
  });
  return await findRowByValue_(DB.WORLD_BOSS_STATE, 'BossInstanceID', id);
}
async function wbRanking_(bossInstanceId, accountId) {
  const key = 'rank:wb:' + String(bossInstanceId || '');
  let all = rankingCacheGetJson_(key);
  if (!Array.isArray(all)) {
    const map = {};
    (await readObjects_(DB.WORLD_BOSS_ATTEMPTS)).filter(r => String(r.BossInstanceID) === String(bossInstanceId) && String(r.Status) === 'DONE').forEach(r => {
      const id = String(r.AccountID),
        d = Math.max(0, Math.trunc(Number(r.Damage) || 0));
      if (!map[id]) map[id] = {
        accountId: id,
        nickname: String(r.Nickname || '冒險者'),
        damage: 0,
        lastAt: String(r.SubmittedAt || '')
      };
      map[id].damage += d;
      if (String(r.SubmittedAt || '') < map[id].lastAt || !map[id].lastAt) map[id].lastAt = String(r.SubmittedAt || '');
    });
    all = Object.values(map).sort((a, b) => b.damage - a.damage || String(a.lastAt).localeCompare(String(b.lastAt)));
    all.forEach((x, i) => x.rank = i + 1);
    rankingCachePutJson_(key, all);
  }
  const mine = all.find(x => String(x.accountId) === String(accountId)) || null;
  return {
    top10: all.slice(0, 10),
    mine,
    totalPlayers: all.length
  };
}
async function getWorldBossStatus_(body) {
  // v11.31.72: 進入頁面只取必要 Runtime：目前 Boss、剩餘挑戰次數、待領寶箱。
  // 排行榜不在這裡讀，只有玩家手動按更新排行才讀。
  const auth = requireAuth_(body.sessionToken);
  const lock = LockService.getScriptLock();
  await lock.waitLock(15000);
  try {
    const boss = await ensureWorldBossInstance_(),
      cfg = await worldBossConfig_(),
      dateKey = wbDateKey_();
    // DEAD 狀態查詢時自動補結算；失敗不阻斷頁面狀態查詢。
    if (String(boss.Status || '').toUpperCase() === 'DEAD' || Number(boss.CurrentHP || 0) <= 0) {
      try {
        await distributeWorldBossRewards_(String(boss.BossInstanceID || ''));
      } catch (recoveryErr) {
        console.error('WORLD_BOSS_REWARD_RECOVERY_FAILED: ' + String(recoveryErr && recoveryErr.message || recoveryErr));
      }
    }
    const attempts = (await readObjects_(DB.WORLD_BOSS_ATTEMPTS)).filter(r => String(r.AccountID).trim() === String(auth.accountId).trim() && normalizeWbDateKey_(r.DateKey) === normalizeWbDateKey_(dateKey) && String(r.Status).toUpperCase() === 'DONE').length;
    return {
      ok: true,
      boss: {
        instanceId: String(boss.BossInstanceID),
        bossId: String(boss.BossID || cfg.bossId),
        name: String(boss.Name || cfg.name),
        currentHp: Math.max(0, Number(boss.CurrentHP) || 0),
        status: String(boss.Status || 'ALIVE'),
        spawnedAt: String(boss.SpawnedAt || ''),
        deadAt: String(boss.DeadAt || ''),
        respawnAt: String(boss.RespawnAt || '')
      },
      attemptsUsed: attempts,
      attemptsMax: cfg.attempts,
      attemptsLeft: Math.max(0, cfg.attempts - attempts),
      serverNow: new Date().toISOString()
    };
  } finally {
    await lock.releaseLock();
  }
}
async function wbSbFetchRecentRewardsForAccount_(accountId, bossInstanceId) {
  // v11.31.80 payload slimming:
  // Gold / Stones / GemAwarded and Reward* content fields are intentionally NOT selected.
  // Chest contents are determined by frontend planning data; backend only tracks entitlement/history/open state.

  const cfg = supabaseConfig_(),
    id = String(accountId || '').trim(),
    bossId = String(bossInstanceId || '').trim();
  if (!id) return [];
  let url = cfg.url + '/rest/v1/WorldBossRewards?select=reward_id,boss_instance_id,account_id,nickname,rank,chest_type,status,created_at,opened_at,reward_gold_min,reward_gold_max,reward_stones,reward_gem_rate,reward_gem_id,reward_gem_json&account_id=eq.' + encodeURIComponent(id);
  if (bossId) url += '&boss_instance_id=eq.' + encodeURIComponent(bossId);
  url += '&order=created_at.desc&limit=30';
  const res = await UrlFetchApp.fetch(url, {
    method: 'get',
    headers: wbSbHeaders_(),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_WB_REWARD_CHECK_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {
    throw new Error('SUPABASE_WB_REWARD_CHECK_JSON_INVALID');
  }
  return Array.isArray(rows) ? rows : [];
}
async function checkWorldBossReward_(body) {
  // v11.31.80：每隻 BOSS 一筆寶箱紀錄；PENDING / OPENED 都保留到 BOSS 死亡後 72 小時。
  const auth = requireAuth_(body.sessionToken),
    bossId = String(body.bossInstanceId || '').trim();
  const rows = await wbSbFetchRecentRewardsForAccount_(auth.accountId, bossId),
    now = Date.now(),
    chests = [];
  const instances = await readObjects_(DB.WORLD_BOSS_STATE);
  const pool = await readObjects_('WorldBossPool');
  const legacyGemId = String((await worldBossConfig_()).chestGemId || '');
  await _asyncArray("forEach", rows, async r => {
    const reward = wbRewardSbToSheet_(r),
      ex = await wbRewardExpiryInfo_(reward, now),
      st = String(reward.Status || 'PENDING').toUpperCase();
    const origin = instances.find(x => String(x.BossInstanceID || '') === String(reward.BossInstanceID || ''));
    const originId = String(origin?.BossID || '');
    const originName = String(origin?.Name || '');
    const profile = pool.find(x => String(x.BossID || '') === originId) || pool.find(x => String(x.Name || '') === originName);
    const correctGemId = String(profile?.RewardGemID || (originId === 'berserkGiant' || /狂暴巨人/.test(originName) ? legacyGemId : '') || '');
    const storedGemId = String(reward.RewardGemID || '');
    const fixedGemId = correctGemId || storedGemId;
    const storedJson = wbJsonValue_(reward.RewardGemJSON);
    const gemJson = fixedGemId && fixedGemId !== storedGemId || !storedJson?.name ? fixedGemId ? await worldBossGemConfig_(fixedGemId) : null : storedJson;
    if (ex.expired || !['PENDING', 'OPENED'].includes(st)) return;
    chests.push({
      rewardId: String(reward.RewardID || ''),
      bossInstanceId: String(reward.BossInstanceID || ''),
      rank: Number(reward.Rank) || 0,
      chestType: String(reward.ChestType || '世界 BOSS 寶箱'),
      status: st,
      openedAt: String(reward.OpenedAt || ''),
      expiresAt: ex.expiresAt,
      rewardGoldMin: Number(reward.RewardGoldMin) || 0,
      rewardGoldMax: Number(reward.RewardGoldMax) || 0,
      rewardStones: Number(reward.RewardStones) || 0,
      rewardGemRate: Number(reward.RewardGemRate) || 0,
      rewardGemId: fixedGemId,
      rewardGemJson: gemJson,
      bossName: originName || String(reward.ChestType || '').replace(/寶箱$/, '')
    });
  });
  return {
    ok: true,
    bossInstanceId: bossId,
    chests: chests,
    serverNow: new Date().toISOString()
  };
}
async function markWorldBossChestOpened_(body) {
  // 只記錄「已開啟」。寶箱內容、隨機結果、玩家實際拿到什麼全部由前端決定，後端不產生也不保存獎勵內容。
  const auth = requireAuth_(body.sessionToken),
    rewardId = String(body.rewardId || '').trim();
  if (!rewardId) return {
    ok: false,
    error: 'WORLD_BOSS_REWARD_ID_REQUIRED'
  };
  const reward = await findRowByValue_(DB.WORLD_BOSS_REWARDS, 'RewardID', rewardId);
  if (!reward || String(reward.AccountID || '').trim() !== String(auth.accountId).trim()) return {
    ok: false,
    error: 'WORLD_BOSS_REWARD_NOT_FOUND'
  };
  const st = String(reward.Status || 'PENDING').toUpperCase(),
    ex = await wbRewardExpiryInfo_(reward, Date.now());
  if (ex.expired) return {
    ok: false,
    error: 'WORLD_BOSS_REWARD_EXPIRED',
    message: '此世界 BOSS 寶箱紀錄已超過 72 小時。',
    expiresAt: ex.expiresAt
  };
  if (st === 'OPENED') return {
    ok: true,
    alreadyOpened: true,
    openedAt: String(reward.OpenedAt || ''),
    expiresAt: ex.expiresAt
  };
  if (st !== 'PENDING') return {
    ok: false,
    error: 'WORLD_BOSS_REWARD_INVALID_STATUS',
    status: st
  };
  const openedAt = new Date().toISOString();
  await updateRowObject_(DB.WORLD_BOSS_REWARDS, reward.__row, {
    Status: 'OPENED',
    OpenedAt: openedAt,
    Gold: '',
    Stones: '',
    GemAwarded: ''
  });
  return {
    ok: true,
    openedAt,
    expiresAt: ex.expiresAt
  };
}
async function getWorldBossRanking_(body) {
  // 排行獨立端點：只在玩家手動更新時呼叫。
  const auth = requireAuth_(body.sessionToken),
    bossId = String(body.bossInstanceId || '').trim();
  if (!bossId) return {
    ok: false,
    error: 'WORLD_BOSS_INSTANCE_REQUIRED'
  };
  const boss = await findRowByValue_(DB.WORLD_BOSS_STATE, 'BossInstanceID', bossId);
  if (!boss) return {
    ok: false,
    error: 'WORLD_BOSS_NOT_FOUND'
  };
  return {
    ok: true,
    bossInstanceId: bossId,
    ranking: await wbRanking_(bossId, auth.accountId),
    serverNow: new Date().toISOString()
  };
}
function startWorldBossChallenge_(body) {
  // v11.31.72 legacy compatibility only. 新前端不再呼叫 worldboss/start。
  return {
    ok: false,
    error: 'WORLD_BOSS_START_RETIRED',
    message: '此版本世界 BOSS 已改為前端直接開始，請更新遊戲版本。'
  };
}
async function distributeWorldBossRewards_(bossInstanceId) {
  // v11.31.91：可恢復、冪等補發；BossInstanceID + AccountID 去重。
  bossInstanceId = String(bossInstanceId || '').trim();
  if (!bossInstanceId) return {
    ok: false,
    error: 'WORLD_BOSS_INSTANCE_REQUIRED',
    created: 0,
    existing: 0
  };
  const cfg = await worldBossConfig_(),
    boss = await findRowByValue_(DB.WORLD_BOSS_STATE, 'BossInstanceID', bossInstanceId);
  if (!boss) return {
    ok: false,
    error: 'WORLD_BOSS_NOT_FOUND',
    created: 0,
    existing: 0
  };
  if (String(boss.Status || '').toUpperCase() !== 'DEAD' && Number(boss.CurrentHP || 0) > 0) return {
    ok: true,
    skipped: true,
    reason: 'WORLD_BOSS_NOT_DEAD',
    created: 0,
    existing: 0
  };
  invalidateWorldBossRankingCache_(bossInstanceId);
  const ranking = (await wbRanking_(bossInstanceId, '')).top10.slice(0, Math.max(0, Number(cfg.topRewardCount) || 0));
  const profile = await worldBossProfileById_(String(boss.BossID || '')),
    rewardGemId = String(profile?.rewardGemId || cfg.chestGemId);
  const existing = await readObjects_(DB.WORLD_BOSS_REWARDS),
    gemCfg = await worldBossGemConfig_(rewardGemId);
  const gemSnapshot = JSON.stringify({
    gemId: rewardGemId,
    name: gemCfg.name,
    price: gemCfg.price,
    hp: gemCfg.hp,
    def: gemCfg.def,
    patk: gemCfg.patk,
    matk: gemCfg.matk,
    crit: gemCfg.crit,
    critDamage: gemCfg.critDamage,
    bossOnly: gemCfg.bossOnly,
    visualColor: gemCfg.visualColor,
    effect: gemCfg.effect
  });
  const chestName = String(boss && boss.Name || cfg.name || '世界BOSS') + '寶箱';
  let created = 0,
    already = 0;
  await _asyncArray("forEach", ranking, async (x, i) => {
    const accountId = String(x.accountId || '').trim();
    if (!accountId) return;
    if (existing.some(r => String(r.BossInstanceID) === bossInstanceId && String(r.AccountID).trim() === accountId)) {
      already++;
      return;
    }
    await appendObject_(DB.WORLD_BOSS_REWARDS, {
      RewardID: wbNewId_('wbr'),
      BossInstanceID: bossInstanceId,
      AccountID: accountId,
      Nickname: x.nickname,
      Rank: i + 1,
      ChestType: chestName,
      Status: 'PENDING',
      CreatedAt: new Date().toISOString(),
      OpenedAt: '',
      Gold: '',
      Stones: '',
      GemAwarded: '',
      RewardGoldMin: cfg.chestGoldMin,
      RewardGoldMax: cfg.chestGoldMax,
      RewardStones: cfg.chestStone,
      RewardGemRate: cfg.chestGemRate,
      RewardGemID: rewardGemId,
      RewardGemJSON: gemSnapshot
    });
    created++;
  });
  return {
    ok: true,
    bossInstanceId: bossInstanceId,
    eligible: ranking.length,
    created: created,
    existing: already
  };
}
async function submitWorldBossChallenge_(body) {
  // v11.31.72: 不需要 STARTED challenge；戰鬥結束時一次驗證、建立 DONE Attempt、扣血並回傳最新狀態。
  const auth = requireAuth_(body.sessionToken),
    damage = Math.max(0, Math.trunc(Number(body.damage) || 0));
  const requestedBossId = String(body.bossInstanceId || '').trim();
  const lock = LockService.getScriptLock();
  await lock.waitLock(15000);
  try {
    const cfg = await worldBossConfig_(),
      boss = await ensureWorldBossInstance_(),
      dateKey = wbDateKey_();
    if (!requestedBossId || String(boss.BossInstanceID) !== requestedBossId) return {
      ok: false,
      error: 'WORLD_BOSS_INSTANCE_CHANGED',
      message: '世界 BOSS 已更新，這次戰績無法套用到新的 BOSS。'
    };
    if (String(boss.Status) !== 'ALIVE' || Number(boss.CurrentHP) <= 0) return {
      ok: false,
      error: 'WORLD_BOSS_DEAD',
      message: '世界 BOSS 已被其他玩家擊敗。'
    };
    const used = (await readObjects_(DB.WORLD_BOSS_ATTEMPTS)).filter(r => String(r.AccountID).trim() === String(auth.accountId).trim() && normalizeWbDateKey_(r.DateKey) === normalizeWbDateKey_(dateKey) && String(r.Status).toUpperCase() === 'DONE').length;
    if (used >= cfg.attempts) return {
      ok: false,
      error: 'WORLD_BOSS_NO_ATTEMPTS',
      message: '今日世界 BOSS 挑戰次數已用完。'
    };
    const actual = Math.min(damage, Math.max(0, Math.trunc(Number(boss.CurrentHP) || 0)));
    const hp = Math.max(0, Math.trunc(Number(boss.CurrentHP) || 0) - actual);
    const patch = {
      CurrentHP: hp,
      Revision: (Number(boss.Revision) || 1) + 1
    };
    if (hp <= 0) {
      const deadAt = new Date(),
        respawn = new Date(deadAt.getTime() + cfg.respawnMinutes * 60000);
      patch.Status = 'DEAD';
      patch.DeadAt = deadAt.toISOString();
      patch.RespawnAt = respawn.toISOString();
    }
    await updateRowObject_(DB.WORLD_BOSS_STATE, boss.__row, patch);
    const acc = await runtimeAccountById_(auth.accountId),
      now = new Date().toISOString(),
      challengeId = wbNewId_('wbc');
    await appendObject_(DB.WORLD_BOSS_ATTEMPTS, {
      ChallengeID: challengeId,
      BossInstanceID: requestedBossId,
      AccountID: auth.accountId,
      Nickname: String(acc?.Nickname || '冒險者'),
      DateKey: dateKey,
      AttemptNo: used + 1,
      StartedAt: now,
      SubmittedAt: now,
      Damage: actual,
      Status: 'DONE'
    });
    invalidateWorldBossRankingCache_(requestedBossId);
    const latest = await findRowByValue_(DB.WORLD_BOSS_STATE, 'BossInstanceID', requestedBossId);
    let chestAwarded = false,
      chest = null;
    if (latest && String(latest.Status) === 'DEAD') {
      await distributeWorldBossRewards_(requestedBossId);
      const reward = (await readObjects_(DB.WORLD_BOSS_REWARDS)).find(r => String(r.BossInstanceID || '').trim() === requestedBossId && String(r.AccountID || '').trim() === String(auth.accountId).trim());
      if (reward) {
        const ex = await wbRewardExpiryInfo_(reward, Date.now());
        chestAwarded = true;
        chest = {
          rewardId: String(reward.RewardID),
          rank: Number(reward.Rank) || 0,
          chestType: String(reward.ChestType || '世界 BOSS 寶箱'),
          expiresAt: ex.expiresAt
        };
      }
    }
    return {
      ok: true,
      challengeId,
      acceptedDamage: actual,
      bossHp: latest ? Number(latest.CurrentHP) || 0 : 0,
      bossStatus: latest ? String(latest.Status) : 'DEAD',
      respawnAt: latest ? String(latest.RespawnAt || '') : '',
      attemptNo: used + 1,
      attemptsMax: cfg.attempts,
      attemptsLeft: Math.max(0, cfg.attempts - (used + 1)),
      serverNow: new Date().toISOString(),
      chestAwarded,
      chest
    };
  } finally {
    await lock.releaseLock();
  }
}
// ------------------------------
// Boxing Machine v11.24.0
// 每週個人最高單場傷害；舊 Season 永久保留。
// ------------------------------
// v11.31.81: Boxing Mode auto rotation.
// v137: Taiwan weekly boxing calendar; immutable anchor keeps all runtimes in sync.
// Existing 2026-W42 ranking IDs are retained. Its mode is 3; the next week is 4.
function boxingCalendar137_(source, nowMs=Date.now()){
 const week=604800000, offset=28800000, anchor=Date.UTC(2026,9,11,16);
 const now=Number(nowMs), local=new Date(now+offset);
 const monday=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()-((local.getUTCDay()+6)%7))-offset;
 const enabled=(source||[]).filter(r=>!('Enabled' in r)||String(r.Enabled).trim().toLowerCase()==='true');
 const template=enabled.find(r=>String(r.SeasonID||'').trim()==='2026-W42');
 if(!template)throw new Error('BOXING_FIXED_REWARDS_MISSING:2026-W42');
 const legacy=enabled.map(row=>({row,seasonId:String(row.SeasonID||'').trim(),start:boxingTaipeiTime_(row.StartAt),end:boxingTaipeiTime_(row.EndAt)})).filter(x=>x.seasonId&&Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.start<anchor&&x.seasonId!=='2026-W42');
 for(let start=anchor;start<=Math.max(anchor,monday)+week;start+=week){
  const day=new Date(start+offset), thursday=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth(),day.getUTCDate()+3));
  const year=thursday.getUTCFullYear(), first=Date.UTC(year,0,1), isoWeek=Math.ceil(((thursday.getTime()-first)/86400000+1)/7);
  const seasonId=year+'-W'+String(isoWeek).padStart(2,'0'), end=start+week-3600000;
  legacy.push({row:{...template,SeasonID:seasonId,StartAt:new Date(start).toISOString(),EndAt:new Date(end).toISOString()},seasonId,start,end,auto137:true,mode:((2+Math.round((start-anchor)/week))%4)+1});
 }
 return legacy.sort((a,b)=>a.start-b.start);
}
function boxingSelect137_(rows,seasonId,now=Date.now()){
 if(seasonId)return rows.find(x=>x.seasonId===String(seasonId))||null;
 // During the Sunday 23:00 gap retain the ending season, not next week's mode.
 return rows.find(x=>x.auto137&&now>=x.start&&now<x.start+604800000)||rows.find(x=>now>=x.start&&now<x.end)||rows.find(x=>now<x.start)||rows[rows.length-1]||null;
}
function boxingStatus137_(x,now=Date.now()){
 return now<x.start?'UPCOMING':now<x.end?'ACTIVE':x.auto137&&now<x.start+604800000?'BREAK':'ENDED';
}

async function boxingConfiguredMode_(){const x=await boxingSeason_();return x?.mode||3;}
async function boxingConfig_(season){
 const map={};(await readObjects_(DB.BOXING_CONFIG)).forEach(r=>map[String(r.Key||'').trim()]=r.Value);
 const x=season||await boxingSeason_();
 return {hp:Math.max(1,Math.trunc(Number(map.HP)||50000)),def:Math.max(0,Math.trunc(Number(map.DEF)||0)),patk:Math.max(1,Math.trunc(Number(map.PATK)||1)),matk:Math.max(0,Math.trunc(Number(map.MATK)||0)),maxTurns:Math.max(1,Math.trunc(Number(map.MaxTurns)||3)),mode:x?.mode||3};
}
// 拳擊機賽季時間一律把表格看到的年月日時分視為 Asia/Taipei。
// Google Sheets 的日期儲存格會以 Date 物件回傳；若直接 getTime()，結果會受試算表/指令碼時區設定影響。
// 這裡先取『儲存格顯示的年月日時分』，再明確換算成 UTC+8，避免本週被誤判成下週。
function boxingTaipeiTime_(value) {
  let raw = '';
  if (value instanceof Date && !isNaN(value.getTime())) {
    const ss = SpreadsheetApp.getActive();
    const sheetTz = ss && ss.getSpreadsheetTimeZone && ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Taipei';
    raw = Utilities.formatDate(value, sheetTz, 'yyyy-MM-dd HH:mm:ss');
  } else raw = String(value == null ? '' : value).trim();
  if (!raw) return NaN;
  const m = raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0) - 8, Number(m[5] || 0), Number(m[6] || 0));
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : NaN;
}
async function boxingSeasonRows_(){return boxingCalendar137_(await readObjects_(DB.BOXING_SEASONS));}

async function boxingSeason_(seasonId){return boxingSelect137_(await boxingSeasonRows_(),seasonId);}

function boxingRankRewards106_(row){
 const r=row||{},blank=v=>v===undefined||v===null||String(v).trim()==='';
 return [[1,1,'Rank1'],[2,2,'Rank2'],[3,3,'Rank3'],[4,10,'Rank4To10']].map(([rankMin,rankMax,key])=>{
  const typed=!blank(r[key+'RewardType']);
  let type=String(typed?r[key+'RewardType']:rankMin<=3?'EQUIPMENT':'STONES').trim().toUpperCase();
  if(type==='STONE')type='STONES';
  const id=String(r[key+'RewardID']||(!typed&&rankMin===4?'enhanceStone':'')).trim();
  const raw=typed?r[key+'RewardQuantity']:rankMin<=3?1:blank(r.Rank4To10Stones)?300:r.Rank4To10Stones;
  const quantity=Number(raw);
  if(!['EQUIPMENT','CONSUMABLE','STONES'].includes(type)||blank(raw)||!Number.isSafeInteger(quantity)||quantity<(type==='STONES'?0:1)||quantity>(type==='CONSUMABLE'?999999:2147483647)||type==='EQUIPMENT'&&quantity!==1||typed&&type!=='STONES'&&!id){
   throw new Error('BOXING_REWARD_CONFIG_INVALID:'+String(r.SeasonID||'')+':'+key);
  }
  return {rankMin,rankMax,type,id:type==='STONES'?'enhanceStone':id,quantity};
 });
}

function boxingSeasonPublic_(x) {
  if (!x) return null;
  const r = x.row,
    now = Date.now();
  return {
    seasonId: x.seasonId,
    startAt: new Date(x.start).toISOString(),
    endAt: new Date(x.end).toISOString(),
    status: boxingStatus137_(x,now),
    rank1RewardId: String(r.Rank1RewardID || ''),
    rank2RewardId: String(r.Rank2RewardID || ''),
    rank3RewardId: String(r.Rank3RewardID || ''),
    rank4To10Stones: Math.max(0, Math.trunc(Number(r.Rank4To10Stones) || 300)),
    rankRewards: boxingRankRewards106_(r)
  };
}
// v11.31.48: Boxing Runtime PRIMARY = Supabase. Runtime Google Sheet mirror disabled; Sheet is snapshot backup only.
// Planning/config stays in Google Sheet: BoxingMachine_SCHEMA / BoxingSeasons_SCHEMA.
async function boxingSbQuery_(table, params) {
  const cfg = supabaseConfig_();
  const qs = Object.keys(params || {}).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k]))).join('&');
  const url = cfg.url + '/rest/v1/' + table + (qs ? '?' + qs : '');
  const res = await UrlFetchApp.fetch(url, {
    method: 'get',
    headers: boxingSbHeaders_(),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_BOXING_QUERY_' + table + '_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {
    throw new Error('SUPABASE_BOXING_QUERY_' + table + '_JSON_INVALID');
  }
  if (!Array.isArray(rows)) throw new Error('SUPABASE_BOXING_QUERY_' + table + '_ROWS_INVALID');
  return rows;
}
function boxingRewardSbToObj_(r) {
  return {
    RewardID: String(r.reward_id || ''),
    SeasonID: String(r.season_id || ''),
    AccountID: String(r.account_id || ''),
    Nickname: String(r.nickname || ''),
    Rank: Number(r.rank) || 0,
    RewardType: String(r.reward_type || ''),
    RewardIDValue: String(r.reward_id_value || ''),
    Quantity: Number(r.quantity) || 0,
    Status: String(r.status || 'PENDING'),
    CreatedAt: String(r.created_at || ''),
    ClaimedAt: String(r.claimed_at || '')
  };
}
function boxingSheetMirrorSafe_() {}
async function boxingRanking_(seasonId, accountId) {
  const key = 'rank:boxing:' + String(seasonId || '');
  let mapped = rankingCacheGetJson_(key);
  if (!Array.isArray(mapped)) {
    const rows = await boxingSbQuery_('BoxingRanking', {
      select: '*',
      season_id: 'eq.' + String(seasonId),
      order: 'damage.desc,submitted_at.asc'
    });
    mapped = rows.map(r => ({
      accountId: String(r.account_id || ''),
      nickname: String(r.nickname || '冒險者'),
      damage: Number(r.damage) || 0,
      submittedAt: String(r.submitted_at || ''),
      snapshot: r.build_snapshot_json && typeof r.build_snapshot_json === 'object' ? r.build_snapshot_json : {}
    }));
    rankingCachePutJson_(key, mapped);
  }
  const idx = mapped.findIndex(r => r.accountId === String(accountId || ''));
  return {
    top10: mapped.slice(0, 10),
    myRank: idx >= 0 ? idx + 1 : 0,
    myBest: idx >= 0 ? mapped[idx] : null,
    all: mapped
  };
}
async function settleBoxingSeason_(x) {
  if (!x || Date.now() < x.end) return {
    ok: true,
    seasonId: x?.seasonId || '',
    settled: false,
    reason: 'NOT_ENDED'
  };
  const rank = (await boxingRanking_(x.seasonId, '')).all.slice(0, 10),
    r = x.row;
  const existing = await boxingSbQuery_('BoxingRewards', {
    select: 'reward_id,account_id,rank',
    season_id: 'eq.' + x.seasonId
  });
  const awarded = new Set(existing.map(v => String(v.account_id || '') + '#' + String(Number(v.rank) || 0)));
  const definitions=boxingRankRewards106_(r);
  for(const [i,p] of rank.entries())if(!awarded.has(String(p.accountId||'')+'#'+(i+1)))await boxingRewardTemplate106_(definitions.find(v=>i+1>=v.rankMin&&i+1<=v.rankMax));
  let created = 0;
  await _asyncArray("forEach", rank, async (p, i) => {
    const pos = i + 1,
      key = String(p.accountId || '') + '#' + String(pos);
    if (awarded.has(key)) return;
    const definition=definitions.find(v=>pos>=v.rankMin&&pos<=v.rankMax),type=definition.type,value=definition.id,qty=definition.quantity;
    const obj = {
      RewardID: 'BXR_' + Utilities.getUuid().replace(/-/g, ''),
      SeasonID: x.seasonId,
      AccountID: p.accountId,
      Nickname: p.nickname,
      Rank: pos,
      RewardType: type,
      RewardIDValue: value,
      Quantity: qty,
      Status: 'PENDING',
      CreatedAt: new Date().toISOString(),
      ClaimedAt: ''
    };
    await boxingSbUpsert_('BoxingRewards', boxingRewardSheetToSb_(obj));
    boxingSheetMirrorSafe_(DB.BOXING_REWARDS, 'RewardID', obj.RewardID, obj, 'reward-create:' + obj.RewardID);
    awarded.add(key);
    created++;
  });
  return {
    ok: true,
    seasonId: x.seasonId,
    settled: true,
    ranked: rank.length,
    created: created,
    existing: existing.length
  };
}

// v11.31.91：拳擊機賽季自動結算。Trigger 每 5 分鐘掃描所有已結束賽季，
// 不再依賴玩家打開拳擊機 / 歷史紀錄才產生排名獎勵。
async function settleEndedBoxingSeasons() {
  ensureBoxingSchema_();
  const lock = LockService.getScriptLock();
  await lock.waitLock(30000);
  try {
    const now = Date.now(),
      ended = (await boxingSeasonRows_()).filter(x => now >= x.end),
      results = [];
    await _asyncArray("forEach", ended, async x => results.push(await settleBoxingSeason_(x)));
    const out = {
      ok: true,
      checked: ended.length,
      created: results.reduce((n, x) => n + Number(x?.created || 0), 0),
      results: results,
      ranAt: new Date().toISOString(),
      status: 'BOXING_ENDED_SEASONS_SETTLED'
    };
    console.log('===== Boxing Auto Settlement =====');
    console.log(JSON.stringify(out, null, 2));
    return out;
  } finally {
    await lock.releaseLock();
  }
}
async function boxingPendingRewardSbForAccount_(accountId, preferredSeasonId = '') {
  const aid = String(accountId || '').trim(),
    sid = String(preferredSeasonId || '').trim();
  if (!aid) return null;
  const rows = await boxingSbQuery_('BoxingRewards', {
    select: '*',
    account_id: 'eq.' + aid,
    order: 'created_at.asc'
  });
  const valid = rows.filter(r => ['PENDING', 'PROCESSING'].includes(String(r.status || '').trim().toUpperCase()));
  if (!valid.length) return null;
  return (sid ? valid.find(r => String(r.season_id || '').trim() === sid) : null) || valid[0];
}
function boxingPendingRewardPublic_(pending) {
  return pending ? {
    rewardId: String(pending.reward_id || ''),
    seasonId: String(pending.season_id || ''),
    rank: Number(pending.rank) || 0,
    type: String(pending.reward_type || ''),
    id: String(pending.reward_id_value || ''),
    quantity: Number(pending.quantity) || 0
  } : null;
}
async function getBoxingStatus_(body) {
  ensureBoxingSchema_();
  const auth = requireAuth_(body.sessionToken),
    x = await boxingSeason_(body.seasonId),
    cfg = await boxingConfig_(x);
  if (!x) return {
    ok: false,
    error: 'BOXING_SEASON_NOT_FOUND',
    message: '尚未設定拳擊機賽季。'
  };
  const lock = LockService.getScriptLock();
  await lock.waitLock(15000);
  try {
    await settleBoxingSeason_(x);
    const rank = await boxingRanking_(x.seasonId, auth.accountId);
    const pending = await boxingPendingRewardSbForAccount_(auth.accountId, x.seasonId);
    return {
      ok: true,
      machine: cfg,
      mode: Number(cfg.mode) || 1,
      season: boxingSeasonPublic_(x),
      ranking: rank.top10,
      myRank: rank.myRank,
      myBest: rank.myBest,
      pendingReward: boxingPendingRewardPublic_(pending)
    };
  } finally {
    await lock.releaseLock();
  }
}
async function startBoxingChallenge_(body) {
  ensureBoxingSchema_();
  const auth = requireAuth_(body.sessionToken),
    x = await boxingSeason_(),
    cfg = await boxingConfig_(x);
  if (!x || Date.now() < x.start || Date.now() >= x.end) return {
    ok: false,
    error: 'BOXING_NOT_ACTIVE',
    message: '目前不在拳擊機挑戰期間。'
  };
  const acc = await runtimeAccountById_(auth.accountId),
    id = 'BXC_' + Utilities.getUuid().replace(/-/g, ''),
    obj = {
      ChallengeID: id,
      SeasonID: x.seasonId,
      AccountID: auth.accountId,
      Nickname: String(acc?.Nickname || '冒險者'),
      StartedAt: new Date().toISOString(),
      SubmittedAt: '',
      Damage: 0,
      Status: 'STARTED'
    };
  await boxingSbUpsert_('BoxingAttempts', boxingAttemptSheetToSb_(obj));
  boxingSheetMirrorSafe_(DB.BOXING_ATTEMPTS, 'ChallengeID', id, obj, 'start:' + id);
  return {
    ok: true,
    challengeId: id,
    seasonId: x.seasonId,
    machine: cfg
  };
}
async function submitBoxingChallenge_(body) {
  // v11.31.71: 拳擊機開始/戰鬥完全前端化；只有玩家主動上傳時才建立 Attempt。
  // 不再要求先呼叫 boxing/start / STARTED challenge。
  const auth = requireAuth_(body.sessionToken),
    x = await boxingSeason_(body.seasonId),
    cfg = await boxingConfig_(x);
  if (!x) return {
    ok: false,
    error: 'BOXING_SEASON_NOT_FOUND',
    message: '找不到拳擊機賽季。'
  };
  const nowMs = Date.now();
  if (nowMs < x.start || nowMs >= x.end) return {
    ok: false,
    error: 'BOXING_NOT_ACTIVE',
    message: '目前不在拳擊機挑戰期間。'
  };
  const damage = Math.max(0, Math.min(cfg.hp, Math.trunc(Number(body.damage) || 0)));
  const snapshotObj = body.snapshot && typeof body.snapshot === 'object' && !Array.isArray(body.snapshot) ? body.snapshot : {};
  const snapshot = JSON.stringify(snapshotObj);
  if (snapshot.length > 40000) return {
    ok: false,
    error: 'BOXING_SNAPSHOT_TOO_LARGE'
  };
  const snapshotValid = Object.keys(snapshotObj).length > 0 && (Array.isArray(snapshotObj.equipment) || Array.isArray(snapshotObj.skills) || snapshotObj.talentSpent || snapshotObj.stats);
  const lock = LockService.getScriptLock();
  await lock.waitLock(15000);
  try {
 if(Date.now()<x.start||Date.now()>=x.end)return {ok:false,error:'BOXING_NOT_ACTIVE',message:'目前不在拳擊機挑戰期間。'};

    const now = new Date().toISOString(),
      id = 'BXC_' + Utilities.getUuid().replace(/-/g, '');
    const acc = await runtimeAccountById_(auth.accountId);
    const attempt = {
      ChallengeID: id,
      SeasonID: x.seasonId,
      AccountID: auth.accountId,
      Nickname: String(acc?.Nickname || '冒險者'),
      StartedAt: now,
      SubmittedAt: now,
      Damage: damage,
      Status: 'DONE'
    };
    await boxingSbUpsert_('BoxingAttempts', boxingAttemptSheetToSb_(attempt));
    const oldSb = (await boxingSbQuery_('BoxingRanking', {
      select: '*',
      season_id: 'eq.' + x.seasonId,
      account_id: 'eq.' + auth.accountId,
      limit: 1
    }))[0];
    let updated = false;
    if (!oldSb || damage > Number(oldSb.damage || 0)) {
      if (!snapshotValid) return {
        ok: false,
        error: 'BOXING_SNAPSHOT_REQUIRED',
        message: '本次紀錄缺少配置資料，請重新挑戰後再登錄。'
      };
      const obj = {
        SeasonID: x.seasonId,
        AccountID: auth.accountId,
        Nickname: String(acc?.Nickname || '冒險者'),
        Damage: damage,
        SubmittedAt: now,
        BuildSnapshotJSON: snapshot
      };
      await boxingSbUpsert_('BoxingRanking', boxingRankingSheetToSb_(obj));
      updated = true;
      invalidateBoxingRankingCache_(x.seasonId);
    }
    const rank = await boxingRanking_(x.seasonId, auth.accountId);
    return {
      ok: true,
      challengeId: id,
      updated,
      damage,
      myRank: rank.myRank,
      myBest: rank.myBest,
      ranking: rank.top10
    };
  } finally {
    await lock.releaseLock();
  }
}
async function getBoxingRanking_(body) {
  const auth = requireAuth_(body.sessionToken),
    x = await boxingSeason_(body.seasonId);
  if (!x) return {
    ok: false,
    error: 'BOXING_SEASON_NOT_FOUND'
  };
  const rank = await boxingRanking_(x.seasonId, auth.accountId);
  const pending = await boxingPendingRewardSbForAccount_(auth.accountId, x.seasonId);
  return {
    ok: true,
    seasonId: x.seasonId,
    season: boxingSeasonPublic_(x),
    ranking: rank.top10,
    myRank: rank.myRank,
    myBest: rank.myBest,
    pendingReward: boxingPendingRewardPublic_(pending)
  };
}
async function getBoxingHistory_(body) {
  ensureBoxingSchema_();
  requireAuth_(body.sessionToken);
  const rows = await boxingSeasonRows_();
  return {
    ok: true,
    seasons: await _asyncArray("map", rows, async x => {
      if (Date.now() > x.end) await settleBoxingSeason_(x);
      const rank = (await boxingRanking_(x.seasonId, '')).top10;
      return {
        ...boxingSeasonPublic_(x),
        champion: rank[0]?.nickname || '',
        topDamage: Number(rank[0]?.damage || 0)
      };
    })
  };
}
// v11.31.20：伺服器交易 receipt。任何「外部紀錄 + PlayerSave」跨表交易，
// 都先把唯一交易鍵寫進 PlayerSave，再完成外部狀態；重試時依 receipt 判斷是否已實際入帳。
function serverReceiptBucket_(save, bucket) {
  save.serverReceipts = save.serverReceipts && typeof save.serverReceipts === 'object' && !Array.isArray(save.serverReceipts) ? save.serverReceipts : {};
  const key = String(bucket || 'general');
  save.serverReceipts[key] = Array.isArray(save.serverReceipts[key]) ? save.serverReceipts[key].map(String) : [];
  return save.serverReceipts[key];
}
function hasServerReceipt_(save, bucket, key) {
  return serverReceiptBucket_(save, bucket).includes(String(key));
}
function addServerReceipt_(save, bucket, key) {
  const a = serverReceiptBucket_(save, bucket),
    k = String(key);
  if (!a.includes(k)) a.push(k);
  return k;
}
async function verifyReceiptAfterWrite_(accountId, bucket, key) {
  const rec = await findRowByValue_(DB.SAVES, 'AccountID', accountId);
  if (!rec) throw new Error('SAVE_VERIFY_MISSING');
  const save = await parseSaveRecord_(rec);
  if (!hasServerReceipt_(save, bucket, key)) throw new Error('SAVE_RECEIPT_VERIFY_FAILED:' + bucket + ':' + key);
  return {
    rec,
    save
  };
}
function boxingRewardEquipmentPresent_(save, reward) {
  if (!save || !reward || String(reward.RewardType || '').toUpperCase() !== 'EQUIPMENT') return false;
  const templateId = String(reward.RewardIDValue || '').trim();
  if (!templateId) return false;
  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  // 拳擊排名獎勵是固定裝備模板；receipt 存在但 inventory 沒有該模板時視為未真正入帳。
  return inv.some(it => String(it?.template || it?.templateId || it?.itemId || '') === templateId);
}
function boxingRewardActuallyPresent_(save, reward) {
  if (String(reward?.RewardType || '').toUpperCase() === 'EQUIPMENT') return boxingRewardEquipmentPresent_(save, reward);
  // 強化石無法只靠目前總量判斷歷史入帳，因此仍以 receipt 作為 STONES 的冪等依據。
  return hasServerReceipt_(save, 'boxing', reward?.RewardID);
}
async function boxingRewardTemplate106_(reward){
 const type=String(reward.type||'').toUpperCase(),id=String(reward.id||'').trim();
 if(type==='EQUIPMENT'){
  const row=await equipmentRowById_(id);
  if(!row)throw new Error('BOXING_EQUIPMENT_NOT_FOUND:'+id);
  return row;
 }
 if(type==='CONSUMABLE'){
  const row=(await readObjects_('Consumables')).find(r=>String(r.ContentID||r.ConsumableID||r.ItemID||'').trim()===id);
  if(!row)throw new Error('BOXING_CONSUMABLE_NOT_FOUND:'+id);
  return row;
 }
 if(type!=='STONES'&&type!=='STONE')throw new Error('BOXING_REWARD_TYPE_UNSUPPORTED:'+type);
 return {Name:'強化石'};
}
async function claimBoxingReward_(body){
 ensureBoxingSchema_();
 const auth=requireAuth_(body.sessionToken),seasonId=String(body.seasonId||'').trim(),requestedId=String(body.rewardId||'').trim(),lock=LockService.getScriptLock();
 await lock.waitLock(30000);
 try{
  // Exact IDs make retries safe even if another season also has a pending prize.
  const sb=requestedId?(await boxingSbQuery_('BoxingRewards',{select:'*',account_id:'eq.'+auth.accountId,reward_id:'eq.'+requestedId}))[0]:await boxingPendingRewardSbForAccount_(auth.accountId,seasonId);
  if(!sb)return {ok:false,error:'BOXING_REWARD_NOT_FOUND',message:'沒有可領取的拳擊機排名獎勵。'};
  const reward=boxingRewardSbToObj_(sb),rewardId=reward.RewardID,status=String(reward.Status).toUpperCase();
  if(String(reward.AccountID)!==String(auth.accountId))throw new Error('BOXING_REWARD_ACCOUNT_MISMATCH');
  if(!rewardId||!['PENDING','PROCESSING','CLAIMED'].includes(status))throw new Error('BOXING_REWARD_STATUS_INVALID');
  const saveRec=await findRowByValue_(DB.SAVES,'AccountID',auth.accountId);
  if(!saveRec)return {ok:false,error:'SAVE_NOT_FOUND'};
  let save=await parseSaveRecord_(saveRec),revision=Number(saveRec.Revision)||1,repaired=false;
  const receiptExists=hasServerReceipt_(save,'boxing',rewardId),type=String(reward.RewardType).toUpperCase(),q=Number(reward.Quantity),id=reward.RewardIDValue;
  let text=(id==='luckyBox'?'神運寶盒':type==='STONES'||type==='STONE'?'強化石':id)+' ×'+q;
  if(body.confirmOnly===true&&!receiptExists)return {ok:false,error:'BOXING_CLAIM_UNCONFIRMED'};
  if(status==='CLAIMED'&&!receiptExists)throw new Error('BOXING_REWARD_RECEIPT_MISSING');
  // Retain legacy pending-equipment repair; a claimed or spent reward is never reissued.
  const repairEquipment=body.confirmOnly!==true&&receiptExists&&status!=='CLAIMED'&&type==='EQUIPMENT'&&!boxingRewardEquipmentPresent_(save,reward);
  if(!receiptExists||repairEquipment){
   requireTransactionSaveRevision_(body,saveRec);
   if(!Number.isSafeInteger(q)||q<(type==='STONES'||type==='STONE'?0:1)||q>(type==='CONSUMABLE'?999999:2147483647)||type==='EQUIPMENT'&&q!==1)throw new Error('BOXING_REWARD_QUANTITY_INVALID');
   const row=await boxingRewardTemplate106_({type,id});
   text=String(row.Name||id)+' ×'+q;
   if(type==='EQUIPMENT'){
    if(!boxingRewardEquipmentPresent_(save,reward)){
     save.inventory=Array.isArray(save.inventory)?save.inventory:[];
     save.inventory.push(makeEquipmentInstanceFromRow_(row));
     repaired=receiptExists;
    }
   }else if(type==='CONSUMABLE'){
    const bag=id==='legendaryHammer'?save.enhancementItems:save.consumables;
    if(bag!=null&&(typeof bag!=='object'||Array.isArray(bag)))throw new Error('BOXING_CONSUMABLE_BAG_INVALID');
    const count=Number(bag?.[id]??0);
    if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(count+q)||count+q>2147483647)throw new Error('BOXING_CONSUMABLE_COUNT_INVALID');
    if(id==='legendaryHammer')save.enhancementItems={...(bag||{}),[id]:count+q};
    else{
     save.consumables={...(bag||{}),[id]:count+q};
     if(['redPotion','eyeDrops','sacrificeGoat','poisonItem'].includes(id)){
      save.skillsOwned=Array.isArray(save.skillsOwned)?save.skillsOwned:[];
      if(!save.skillsOwned.includes(id))save.skillsOwned.push(id);
     }
    }
   }else{
    const count=Number(save.stones??save.enhanceStones??0);
    if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(count+q))throw new Error('BOXING_STONE_COUNT_INVALID');
    save.stones=count+q;save.enhanceStones=save.stones;
   }
   const processing={...reward,Status:'PROCESSING',ClaimedAt:''};
   await boxingSbUpsert_('BoxingRewards',boxingRewardSheetToSb_(processing));
   if(!receiptExists)addServerReceipt_(save,'boxing',rewardId);
   await writeFullSave_(auth.accountId,revision+1,save);
   const verified=await verifyReceiptAfterWrite_(auth.accountId,'boxing',rewardId);
   save=verified.save;revision=Number(verified.rec.Revision)||revision+1;
   if(type==='EQUIPMENT'&&!boxingRewardEquipmentPresent_(save,reward))throw new Error('BOXING_REWARD_EQUIPMENT_VERIFY_FAILED:'+rewardId);
  }
  if(status!=='CLAIMED'){
   const claimed={...reward,Status:'CLAIMED',ClaimedAt:new Date().toISOString()};
   await boxingSbUpsert_('BoxingRewards',boxingRewardSheetToSb_(claimed));
   boxingSheetMirrorSafe_(DB.BOXING_REWARDS,'RewardID',rewardId,claimed,'reward-claimed:'+rewardId);
  }
  return {ok:true,accountId:auth.accountId,seasonId:reward.SeasonID,rewardId,rewardText:text,duplicate:receiptExists&&!repaired,repaired,revision,save};
 }finally{await lock.releaseLock();}
}

// ------------------------------
// Redeem Codes v11.14.0
// 每個帳號每組 Code 僅能領取一次；一組 Code 可對應多筆獎勵。
// ------------------------------
function normalizeRedeemCode_(v) {
  return String(v || '').trim().toUpperCase();
}
async function redeemCodeRow_(code) {
  const key = normalizeRedeemCode_(code);
  return (await readObjects_(DB.REDEEM_CODES)).find(r => normalizeRedeemCode_(r.Code) === key) || null;
}
async function redeemRewardRows_(code) {
  const key = normalizeRedeemCode_(code);
  return (await readObjects_(DB.REDEEM_REWARDS)).filter(r => normalizeRedeemCode_(r.Code) === key).sort((a, b) => (Number(a.RewardOrder) || 0) - (Number(b.RewardOrder) || 0));
}
function redeemDateValid_(row) {
  const now = Date.now();
  const start = String(row.StartAt || '').trim();
  const end = String(row.EndAt || '').trim();
  if (start) {
    const t = new Date(start).getTime();
    if (Number.isFinite(t) && now < t) return false;
  }
  if (end) {
    const t = new Date(end).getTime();
    if (Number.isFinite(t) && now > t) return false;
  }
  return true;
}
async function gemRowById_(gemId) {
  const id = String(gemId || '').trim();
  return (await readObjects_('Gems')).find(r => String(r.GemID || '').trim() === id && (!('Enabled' in r) || toBool_(r.Enabled))) || null;
}
function makeGemInstanceFromRow_(row) {
  if (!row) throw new Error('GEM_NOT_FOUND');
  const stats = {};
  [['hp', 'HP'], ['def', 'DEF'], ['patk', 'PATK'], ['matk', 'MATK'], ['crit', 'Crit'], ['critDamage', 'CritDamage']].forEach(([k, h]) => {
    const n = Number(row[h]) || 0;
    if (n !== 0) stats[k] = n;
  });
  return {
    id: 'GEM_' + Utilities.getUuid().replace(/-/g, ''),
    template: String(row.GemID || ''),
    name: String(row.Name || row.GemID || ''),
    price: Number(row.Price) || 0,
    stats: stats,
    boss: row.BossOnly === true || String(row.BossOnly).toLowerCase() === 'true',
    effect: String(row.EffectKey || row.Effect || '').trim(),
    visualColor: String(row.VisualColor || '').trim()
  };
}
function redeemDisplayRarity_(row, fallback) {
  return String(row.Rarity || fallback || '一般').trim() || '一般';
}
async function applyRedeemReward_(save, row) {
  const type = String(row.ContentType || '').trim().toUpperCase();
  const id = String(row.ContentID || '').trim();
  const qty = clampInt_(row.Quantity || 1, 1, 999999);
  // Legendary hammer is an enhancement item, even when planning uses CONSUMABLE.
  if ((type === 'CONSUMABLE' || type === 'ENHANCEMENT') && id === 'legendaryHammer') {
    const bag = save.enhancementItems;
    if (bag != null && (typeof bag !== 'object' || Array.isArray(bag))) throw new Error('ENHANCEMENT_ITEMS_INVALID');
    const count = Number(bag?.legendaryHammer ?? 0);
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(count + qty)) throw new Error('HAMMER_COUNT_INVALID');
    save.enhancementItems = { ...(bag || {}), legendaryHammer: count + qty };
    return { ok: true, type, id, quantity: qty, name: '傳說之鎚', rarity: redeemDisplayRarity_(row, '傳說') };
  }
  if (type === 'EQUIPMENT') {
    const src = await equipmentRowById_(id);
    if (!src) return {
      ok: false,
      error: 'REDEEM_EQUIPMENT_NOT_FOUND:' + id
    };
    if (!Array.isArray(save.inventory)) save.inventory = [];
    for (let i = 0; i < qty; i++) save.inventory.push(makeEquipmentInstanceFromRow_(src));
    return {
      ok: true,
      type,
      id,
      quantity: qty,
      name: String(src.Name || id),
      rarity: redeemDisplayRarity_(row, src.Rarity)
    };
  }
  if (type === 'GEM') {
    const src = await gemRowById_(id);
    if (!src) return {
      ok: false,
      error: 'REDEEM_GEM_NOT_FOUND:' + id
    };
    if (!Array.isArray(save.gems)) save.gems = [];
    for (let i = 0; i < qty; i++) save.gems.push(makeGemInstanceFromRow_(src));
    return {
      ok: true,
      type,
      id,
      quantity: qty,
      name: String(src.Name || id),
      rarity: redeemDisplayRarity_(row, '傳說')
    };
  }
  if (type === 'GOLD') {
    save.gold = (Number(save.gold) || 0) + qty;
    return {
      ok: true,
      type,
      id: 'gold',
      quantity: qty,
      name: '金幣',
      rarity: redeemDisplayRarity_(row, '特殊')
    };
  }
  if (type === 'STONE') {
    save.stones = (Number(save.stones || save.enhanceStones) || 0) + qty;
    save.enhanceStones = save.stones;
    return {
      ok: true,
      type,
      id: 'stone',
      quantity: qty,
      name: '強化石',
      rarity: redeemDisplayRarity_(row, '特殊')
    };
  }
  if (type === 'CONSUMABLE') {
    if (!id) return {
      ok: false,
      error: 'REDEEM_CONSUMABLE_ID_REQUIRED'
    };
    save.consumables = save.consumables && typeof save.consumables === 'object' ? save.consumables : {};
    save.consumables[id] = (Number(save.consumables[id]) || 0) + qty;
    if(['redPotion','eyeDrops','sacrificeGoat','poisonItem'].includes(id)&&save.consumables[id]>0){save.skillsOwned=Array.isArray(save.skillsOwned)?save.skillsOwned:[];if(!save.skillsOwned.includes(id))save.skillsOwned.push(id);}
    const c = (await readObjects_('Consumables')).find(r => String(r.ContentID || r.ConsumableID || r.ItemID || '').trim() === id);
    return {
      ok: true,
      type,
      id,
      quantity: qty,
      name: String(c?.Name || id),
      rarity: redeemDisplayRarity_(row, c?.Rarity || '一般')
    };
  }
  if (type === 'SKILL') {
    if (!id) return {
      ok: false,
      error: 'REDEEM_SKILL_ID_REQUIRED'
    };
    const sk = (await readObjects_('Skills')).find(r => String(r.SkillID || '').trim() === id);
    if (!sk) return {
      ok: false,
      error: 'REDEEM_SKILL_NOT_FOUND:' + id
    };
    save.skillsOwned = Array.isArray(save.skillsOwned) ? save.skillsOwned : [];
    if (!save.skillsOwned.includes(id)) save.skillsOwned.push(id);
    save.purchasedSkills = Array.isArray(save.purchasedSkills) ? save.purchasedSkills : [];
    if (!save.purchasedSkills.includes(id)) save.purchasedSkills.push(id);
    return {
      ok: true,
      type,
      id,
      quantity: 1,
      name: String(sk.Name || id),
      rarity: redeemDisplayRarity_(row, '稀有')
    };
  }
  return {
    ok: false,
    error: 'REDEEM_UNSUPPORTED_CONTENT_TYPE:' + type
  };
}
// AccountID and login username are checked against the server-owned account row, never client input.
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

async function claimRedeemCode_(body) {
  const auth = requireAuth_(body.sessionToken),
    code = normalizeRedeemCode_(body.code);
  if (!code) return {
    ok: false,
    error: 'INVALID_REDEEM_CODE',
    message: '無效的序號'
  };
  const lock = LockService.getScriptLock();
  await lock.waitLock(15000);
  try {
    ensureSheet_(DB.REDEEM_CODES, ['Code', 'Title', 'Enabled', 'StartAt', 'EndAt', 'TargetPlayers']);
    ensureSheet_(DB.REDEEM_REWARDS, ['Code', 'RewardOrder', 'ContentType', 'ContentID', 'Quantity', 'Rarity']);
    ensureSheet_(DB.REDEEM_CLAIMS, ['ClaimID', 'Code', 'AccountID', 'Nickname', 'ClaimedAt', 'ResultJSON']);
    const codeRow = await redeemCodeRow_(code);
    if (!codeRow || !toBool_(codeRow.Enabled) || !redeemDateValid_(codeRow)) return {
      ok: false,
      error: 'INVALID_REDEEM_CODE',
      message: '無效的序號'
    };
    const targetAccount121 = await runtimeAccountById_(auth.accountId);
    if (!redeemPlayerAllowed120_(codeRow, auth.accountId, targetAccount121)) return {ok:false,error:'REDEEM_PLAYER_NOT_ALLOWED',message:'此序號僅限指定玩家領取'};
    const claimKey = auth.accountId + '|' + code;
    // v11.31.52: Supabase is authoritative for Redeem Claims duplicate detection.
    const oldClaim = await redeemClaimsSbFindByAccountCode_(auth.accountId, code);
    const saveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId),
      acc = targetAccount121;
    if (!saveRec) return {
      ok: false,
      error: 'SAVE_NOT_FOUND',
      message: '找不到玩家存檔'
    };
    requireTransactionSaveRevision_(body, saveRec);
    let save = await parseSaveRecord_(saveRec);
    if (oldClaim || hasServerReceipt_(save, 'redeem', claimKey)) {
      // Receipt is the final anti-duplicate guard. If the save was committed but the claim row was not,
      // repair Supabase Primary first, then best-effort mirror the same row to Sheet.
      if (!oldClaim) {
        const repairedClaim = {
          ClaimID: 'RCL_' + Utilities.getUuid().replace(/-/g, ''),
          Code: code,
          AccountID: auth.accountId,
          Nickname: String(acc?.Nickname || save.nickname || ''),
          ClaimedAt: new Date().toISOString(),
          ResultJSON: '[]'
        };
        await redeemClaimsSbInsertPrimary_(redeemClaimSheetToSb_(repairedClaim));
        // v11.31.53: Runtime Sheet mirror disabled. Daily Snapshot will back up Supabase Claims.
      }
      return {
        ok: false,
        error: 'REDEEM_ALREADY_CLAIMED',
        message: '此帳號已領取過'
      };
    }
    const rewards = await redeemRewardRows_(code);
    if (!rewards.length) return {
      ok: false,
      error: 'INVALID_REDEEM_CODE',
      message: '無效的序號'
    };
    const granted = [];
    for (const row of rewards) {
      const result = await applyRedeemReward_(save, row);
      if (!result.ok) return {
        ok: false,
        error: result.error,
        message: '序號內容設定錯誤'
      };
      granted.push(result);
    }
    addServerReceipt_(save, 'redeem', claimKey);
    const revision = (Number(saveRec.Revision) || 1) + 1;
    // Commit receipt and rewards together; pet guard authorization is transaction-local.
    const committed305 = await secureRpc78('game_redeem_apply305', {
      p_account:auth.accountId,p_code:code,p_expected:Number(saveRec.Revision),
      p_save:save,p_awards:granted
    });
    if(!committed305?.ok || Number(committed305.revision)!==revision || !committed305.save ||
       Object.keys({...save.consumables,...committed305.save.consumables}).some(k=>
         Number(save.consumables?.[k]||0)!==Number(committed305.save.consumables?.[k]||0)))
      throw Error('REDEEM_SAVE_VERIFY_FAILED');
    save=committed305.save;
    await verifyReceiptAfterWrite_(auth.accountId, 'redeem', claimKey);
    const claimRow = {
      ClaimID: 'RCL_' + Utilities.getUuid().replace(/-/g, ''),
      Code: code,
      AccountID: auth.accountId,
      Nickname: String(acc?.Nickname || save.nickname || ''),
      ClaimedAt: new Date().toISOString(),
      ResultJSON: JSON.stringify(granted)
    };
    // Supabase is Primary. If this write fails, throw; the PlayerSave Receipt guarantees retry will repair
    // the missing Primary claim without granting the reward twice.
    await redeemClaimsSbInsertPrimary_(redeemClaimSheetToSb_(claimRow));
    // v11.31.53: Google Sheet runtime mirror disabled. Daily Snapshot handles backup.
    return {
      ok: true,
      title: String(codeRow.Title || '序號獎勵'),
      rewards: granted,
      revision,
      save
    };
  } finally {
    await lock.releaseLock();
  }
}

// ------------------------------
// Achievements / Titles v11.17.0
// ------------------------------
// Cumulative login gifts: all eligibility/time/claim authority is held by the database.
const LOGIN_GIFT_DEFAULT278_=Array.from({length:8},(_,i)=>({AchievementID:'login_gift_day'+(i+1),Name:'累積登入第'+(i+1)+'天',Description:'新玩家累積登入禮',ConditionType:'cumulative_login',TargetID:'new_player_login',TargetValue:i+1,RewardType:'gold',RewardID:'gold',RewardAmount:[100,150,200,250,300,400,500,800][i],Enabled:true}));
function loginGiftRows278_(phase='new'){
 const all=EDGE_PLANNING?.data?.Achievements||[],match=(r,types)=>types.includes(String(r.ConditionType||'').trim().toLowerCase());
 const recurring=all.filter(r=>match(r,['recurring_login','常駐累積登入']));
 const configured=phase==='recurring'&&recurring.length?recurring:all.filter(r=>match(r,['cumulative_login','累積登入']));
 const rows=(configured.length?configured:LOGIN_GIFT_DEFAULT278_).filter(r=>!('Enabled'in r)||toBool_(r.Enabled)).map(r=>({...r,RewardType:({裝備:'EQUIPMENT',消耗品:'CONSUMABLE',金幣:'GOLD',稱號:'TITLE'})[String(r.RewardType||'').trim()]||r.RewardType}));
 const ids=new Set(),days=new Set();
 for(const row of rows){const id=String(row.AchievementID||'').trim(),day=Number(row.TargetValue),type=String(row.RewardType||'').trim().toUpperCase(),amount=Number(row.RewardAmount||1);if(!id||ids.has(id)||!Number.isInteger(day)||day<1||day>8||days.has(day)||!['EQUIPMENT','CONSUMABLE','GOLD','TITLE'].includes(type)||!Number.isSafeInteger(amount)||amount<1||amount>999999||(type!=='GOLD'&&!String(row.RewardID||'').trim()))throw Error('LOGIN_GIFT_PLANNING_INVALID');ids.add(id);days.add(day);}
 return rows.sort((a,b)=>Number(a.TargetValue)-Number(b.TargetValue));
}
async function loginGiftCards278_(rows){
 const cards=[];
 for(const r of rows){const type=String(r.RewardType).toUpperCase(),id=String(r.RewardID||'').trim();let source=null;if(type==='EQUIPMENT')source=await equipmentRowById_(id);if(type==='TITLE')source=await titleRowById_(id);if(type==='CONSUMABLE')source=(await readPublicObjectsCached_('Consumables',cachedDataVersion_())).find(x=>String(x.ContentID||x.ConsumableID||x.ItemID||'')===id);if(type!=='GOLD'&&!source)throw Error('LOGIN_GIFT_REWARD_NOT_FOUND:'+id);
  cards.push({day:Number(r.TargetValue),achievementId:String(r.AchievementID),type:type.toLowerCase(),id:type==='GOLD'?'gold':id,quantity:type==='TITLE'?1:Number(r.RewardAmount||1),name:type==='GOLD'?'金幣':String(source.Name||id)});
 }return cards;
}
async function loginGift278_(body){
 const auth=requireAuth_(body.sessionToken),status=await secureRpc78('game_login_gift_state278',{p_account:auth.accountId}),rows=loginGiftRows278_(status.phase),cards=await loginGiftCards278_(rows);
 if(body.action==='login-gift/status')return {ok:true,accountId:auth.accountId,...status,cards};
 if(!rows.length)return {ok:true,accountId:auth.accountId,...status,cards,enabled:false};
 const rec=await findRowByValue_(DB.SAVES,'AccountID',auth.accountId);if(!rec)throw Error('SAVE_NOT_FOUND');
 if(status.receipt)return {ok:true,duplicate:true,accountId:auth.accountId,...status,cards,revision:Number(rec.Revision),save:await parseSaveRecord_(rec)};
 requireTransactionSaveRevision_(body,rec);
 const lifetime=Number(status.lifetimeTotal??status.total??0),day=lifetime<8?lifetime+1:(lifetime-8)%8+1,row=rows.find(r=>Number(r.TargetValue)===day);if(!row)return {ok:true,accountId:auth.accountId,...status,cards,paused:true};
 const save=await parseSaveRecord_(rec);save.claimedAchievements=save.claimedAchievements&&typeof save.claimedAchievements==='object'?save.claimedAchievements:{};
 const award=await applyAchievementReward_(save,row);if(!award.ok)throw Error(award.error||'LOGIN_GIFT_REWARD_ERROR');
 save.claimedAchievements[String(row.AchievementID)]=true;
 const result=await secureRpc78('game_login_gift_apply278',{p_account:auth.accountId,p_expected_revision:Number(rec.Revision),p_day_no:lifetime+1,p_save:sanitizeIncomingSave_(save),p_awards:[{...award,achievementId:String(row.AchievementID)}]});
 return {...result,cards};
}
async function acknowledgeLoginGift278_(body){const auth=requireAuth_(body.sessionToken);return secureRpc78('game_login_gift_ack278',{p_account:auth.accountId,p_day:String(body.receiptDay||'')});}

async function achievementRowById_(id) {
  id = String(id || '').trim();
  const rows = await readPublicObjectsCached_('Achievements', cachedDataVersion_());
  return rows.find(r => String(r.AchievementID || '').trim() === id && (!('Enabled' in r) || toBool_(r.Enabled))) || null;
}
async function titleRowById_(id) {
  id = String(id || '').trim();
  const rows = await readPublicObjectsCached_('Titles', cachedDataVersion_());
  return rows.find(r => String(r.TitleID || '').trim() === id && (!('Enabled' in r) || toBool_(r.Enabled))) || null;
}
function perfectClearProgress98_(counts,target,stages=[]){
 target=String(target||'').trim();counts=counts||{};const value=k=>Math.max(0,Math.trunc(Number(counts[k])||0));
 if(!target)return 0;
 if(Object.prototype.hasOwnProperty.call(counts,target)||/^\d+$/.test(target))return value(target);
 const floors=new Set(stages.filter(r=>String(r.EnemyID||'').trim()===target).map(r=>String(Math.trunc(Number(r.Floor)))).filter(f=>Number(f)>0));
 return Array.from(floors).reduce((n,f)=>n+value(f),0);
}
function achievementProgressServer_(save, row, stages=[]) {
  if(save?.achievedAchievements411?.[row.AchievementID])return Number(row.TargetValue)||1;
  const type = String(row.ConditionType || '').trim().toLowerCase();
  const target = String(row.TargetID || '').trim();
  if (type === 'perfect_clear') return perfectClearProgress98_(save?.achievementMetrics?.perfectClears, target, stages);
  if (type === 'max_round_damage') return Math.max(0, Math.trunc(Number(save?.achievementMetrics?.maxRoundDamage) || 0));
  if (type === 'enemy_kill') return Math.max(0, Math.trunc(Number(save?.enemyDefeatCounts?.[target]) || 0));
  if (type === 'level') return Math.max(1, Math.trunc(Number(save?.level) || 1));
  if (type === 'max_clear') return Math.max(0, Math.trunc(Number(save?.maxCleared || save?.bestClear) || 0));
  return 0;
}
async function applyAchievementReward_(save, row) {
  const type = String(row.RewardType || '').trim().toUpperCase();
  const id = String(row.RewardID || '').trim();
  const qty = clampInt_(row.RewardAmount || 1, 1, 999999);
  if (type === 'TITLE') {
    const t = await titleRowById_(id);
    if (!t) return {
      ok: false,
      error: 'TITLE_NOT_FOUND'
    };
    save.ownedTitles = Array.isArray(save.ownedTitles) ? save.ownedTitles.map(String) : [];
    if (!save.ownedTitles.includes('beginner')) save.ownedTitles.unshift('beginner');
    if (!save.ownedTitles.includes(id)) save.ownedTitles.push(id);
    if (!save.equippedTitle) save.equippedTitle = 'beginner';
    return {
      ok: true,
      type,
      id,
      quantity: 1,
      name: String(t.Name || id)
    };
  }
  // 共用序號獎勵的成熟發獎邏輯。
  return await applyRedeemReward_(save, {
    ContentType: type,
    ContentID: id,
    Quantity: qty
  });
}
async function claimAchievement_(body) {
  const auth = requireAuth_(body.sessionToken);
  const id = String(body.achievementId || '').trim();
  const lock = LockService.getScriptLock();
  await lock.waitLock(15000);
  try {
    const rec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    if (!rec) return {
      ok: false,
      error: 'SAVE_NOT_FOUND'
    };
    requireTransactionSaveRevision_(body, rec);
    const currentRevision = Number(rec.Revision) || 1;
    const row = await achievementRowById_(id);
    if (!row) return {
      ok: false,
      error: 'ACHIEVEMENT_NOT_FOUND'
    };
    if(['cumulative_login','累積登入','recurring_login','常駐累積登入'].includes(String(row.ConditionType||'').trim().toLowerCase()))return {ok:false,error:'LOGIN_GIFT_AUTO_ONLY'};
    const save = (await parseSaveRecord_(rec)) || {};
    save.ownedTitles = Array.isArray(save.ownedTitles) ? save.ownedTitles.map(String) : [];
    if (!save.ownedTitles.includes('beginner')) save.ownedTitles.unshift('beginner');
    if (!save.equippedTitle) save.equippedTitle = 'beginner';
    save.claimedAchievements = save.claimedAchievements && typeof save.claimedAchievements === 'object' ? save.claimedAchievements : {};
    if (save.claimedAchievements[id]) return {
      ok: false,
      error: 'ACHIEVEMENT_ALREADY_CLAIMED'
    };
    const need = Math.max(1, Math.trunc(Number(row.TargetValue) || 1));
    const achievementStages98 = String(row.ConditionType || '').trim().toLowerCase() === 'perfect_clear' ? await readPublicObjectsCached_('Enemies', cachedDataVersion_()) : [];
    const progress = achievementProgressServer_(save, row, achievementStages98);
    if (progress < need) return {
      ok: false,
      error: 'ACHIEVEMENT_NOT_COMPLETE',
      progress: progress,
      target: need
    };
    const reward = await applyAchievementReward_(save, row);
    if (!reward.ok) return {
      ok: false,
      error: reward.error || 'ACHIEVEMENT_REWARD_ERROR'
    };
    save.claimedAchievements[id] = true;
    const revision = currentRevision + 1;
    await writeFullSave_(auth.accountId, revision, save);
    return {
      ok: true,
      achievementId: id,
      reward: reward,
      revision: revision,
      save: save
    };
  } finally {
    await lock.releaseLock();
  }
}

// ------------------------------
// Auction
// ------------------------------

// v11.31.21：拍賣上架前，以伺服器資料表重新校正可交易物品的固定資料。
// 重要：InstanceID、強化等級、實際洞數與已鑲寶石屬於玩家實例資料，不由模板粗暴覆蓋。
// 目前掉落系統合法洞數上限為 2；超過直接拒絕，避免異常物品流入共享經濟。
function canonicalStatsFromRow_(row) {
  const stats = {};
  [['hp', 'HP'], ['def', 'DEF'], ['patk', 'PATK'], ['matk', 'MATK'], ['crit', 'Crit']].forEach(([k, h]) => {
    const n = Number(row && row[h]) || 0;
    if (n !== 0) stats[k] = n;
  });
  return stats;
}
async function sanitizeAuctionItemForListing_(item, itemType) {
  if (!item || typeof item !== 'object') throw new Error('AUCTION_ITEM_INVALID');
  if(item.template==='forgeBlank172')throw Error('鍛造中武器不能拍賣');
  const type = String(itemType || '').toLowerCase();
  const instanceId = String(item.id || item.instanceId || '').trim();
  if (!instanceId) throw new Error('AUCTION_ITEM_INSTANCE_ID_MISSING');
  if (type === 'gem') {
    const template = String(item.template || item.templateId || '').trim();
    const row = await gemRowById_(template);
    if (!row) throw new Error('AUCTION_GEM_TEMPLATE_NOT_FOUND:' + template);
    return {
      id: instanceId,
      template: String(row.GemID || template),
      name: String(row.Name || row.GemID || template),
      price: Number(row.Price) || 0,
      stats: canonicalStatsFromRow_(row),
      boss: row.BossOnly === true || String(row.BossOnly).toLowerCase() === 'true',
      effect: String(row.EffectKey || row.Effect || '').trim(),
      visualColor: String(row.VisualColor || '').trim()
    };
  }
  const template = String(item.template || item.templateId || '').trim();
  const row = await equipmentRowById_(template);
  if (!row) throw new Error('AUCTION_EQUIPMENT_TEMPLATE_NOT_FOUND:' + template);
  const canonicalSlot = String(row.Slot || 'special').toLowerCase();
  if (canonicalSlot !== type) throw new Error('AUCTION_ITEM_SLOT_MISMATCH:' + type + '!=' + canonicalSlot);
  const sockets = Math.max(0, Math.trunc(Number(item.sockets) || 0));
  if (sockets > 2) throw new Error('AUCTION_ITEM_INVALID_SOCKETS:' + sockets);
  const enhance = Math.max(0, Math.trunc(Number(item.enhance) || 0));
  if (enhance > 99) throw new Error('AUCTION_ITEM_INVALID_ENHANCE:' + enhance);
  const gems = Array.isArray(item.gems) ? item.gems.slice(0, sockets) : [];
  while (gems.length < sockets) gems.push(null);
  const clean = {
    id: instanceId,
    template: String(row.ItemID || template),
    name: String(row.Name || row.ItemID || template),
    rarity: String(row.Rarity || '一般'),
    slot: canonicalSlot,
    price: Number(row.BasePrice) || 0,
    stats: canonicalStatsFromRow_(row),
    sockets: sockets,
    enhance: enhance,
    gems: gems
  };
  const effect = String(row.EffectKey || '').trim();
  if (effect) clean.effect = effect;
  const iconSymbol = String(row.IconSymbol || '').trim();
  if (iconSymbol) clean.iconSymbol = iconSymbol;
  if(row._forge172){if(instanceId!==row._forgeItemId)throw Error('鍛造成品身分不符');return {...row._forgeItem,id:instanceId,sockets,enhance,gems};}
  return clean;
}

// ============================================================================
// v11.31.41 - Auction Supabase PRIMARY
// Supabase AuctionListings is runtime source of truth.
// Auction_SCHEMA is immediate backup/audit only; backup failure does not roll back a committed transaction.
// ============================================================================
const AUCTION_SUPABASE_PRIMARY_ENABLED_ = true;
async function auctionPrimaryGetById_(listingId) {
  const rows = await auctionSbRequest_('get', '?listing_id=eq.' + encodeURIComponent(String(listingId || '')) + '&select=*&limit=1', null, null);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
async function auctionPrimaryGetByInstance_(instanceId) {
  const q = '?item_instance_id=eq.' + encodeURIComponent(String(instanceId || '')) + '&status=in.(creating,active,buying,cancelling)&select=*&order=created_at.asc';
  const rows = await auctionSbRequest_('get', q, null, null);
  return Array.isArray(rows) ? rows : [];
}
async function auctionPrimaryPatch_(listingId, patch) {
  patch = Object.assign({}, patch || {}, {
    updated_at: new Date().toISOString()
  });
  const rows = await auctionSbRequest_('patch', '?listing_id=eq.' + encodeURIComponent(String(listingId || '')), patch, 'return=representation');
  if (!Array.isArray(rows) || !rows.length) throw new Error('AUCTION_PRIMARY_PATCH_NOT_FOUND:' + listingId);
  return rows[0];
}
async function auctionPrimaryInsert_(payload) {
  const rows = await auctionSbRequest_('post', '', Object.assign({}, payload, {
    updated_at: new Date().toISOString()
  }), 'return=representation');
  if (!Array.isArray(rows) || !rows.length) throw new Error('AUCTION_PRIMARY_INSERT_FAILED');
  return rows[0];
}
function auctionBackupSyncSbRowSafe_() {}
function auctionPrimaryClaimStatus_(r) {
  const explicit = String(r.claim_status || '').trim().toLowerCase();
  if (explicit === 'pending' || explicit === 'claimed') return explicit;
  if (String(r.payout_mode || '').trim() === 'manual_claim_v1' && !String(r.claimed_at || '').trim()) return 'pending';
  return 'legacy';
}
async function createAuction_(body) {
  const auth = requireAuth_(body.sessionToken),
    askGold = clampInt_(body.askGold, 1, 999999999),
    item = body.item;
  if (!item || !item.instanceId || !item.type) return {
    ok: false,
    error: 'INVALID_ITEM'
  };
  if (!['weapon', 'head', 'armor', 'ring', 'special', 'gem'].includes(String(item.type))) return {
    ok: false,
    error: 'ITEM_NOT_TRADABLE'
  };
  const lock = LockService.getScriptLock();
  await lock.waitLock(20000);
  try {
    const saveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId),
      acc = await runtimeAccountById_(auth.accountId);
    if (!saveRec || !acc) return {
      ok: false,
      error: 'ACCOUNT_DATA_MISSING'
    };
    let save = await parseSaveRecord_(saveRec),
      instanceId = String(item.instanceId);
    const existing = await auctionPrimaryGetByInstance_(instanceId);
    const mine = existing.find(r => String(r.seller_account_id) === auth.accountId);
    if (existing.length && !mine) return {
      ok: false,
      error: 'ITEM_ALREADY_LISTED'
    };
    if (mine) {
      const listingId = String(mine.listing_id),
        receipt = 'create:' + listingId;
      if (String(mine.status) === 'creating' && !hasServerReceipt_(save, 'auction', receipt)) {
        requireTransactionSaveRevision_(body, saveRec);
        const removed = removeTradableItemFromSave_(save, instanceId, String(mine.item_type));
        if (!removed) return {
          ok: false,
          error: 'AUCTION_CREATE_RECOVERY_FAILED'
        };
        addServerReceipt_(save, 'auction', receipt);
        const rev = (Number(saveRec.Revision) || 1) + 1;
        await writeFullSave_(auth.accountId, rev, save);
        await verifyReceiptAfterWrite_(auth.accountId, 'auction', receipt);
      }
      const active = String(mine.status) === 'active' ? mine : await auctionPrimaryPatch_(listingId, {
        status: 'active',
        revision: (Number(mine.revision) || 1) + 1
      });
      auctionBackupSyncSbRowSafe_(active, 'create-idempotent');
      const latest = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId),
        latestSave = await parseSaveRecord_(latest);
      clearAuctionListCache_();
      return {
        ok: true,
        alreadyListed: true,
        listingId,
        revision: Number(latest.Revision) || 1,
        save: latestSave,
        item: active.item_instance_json || {},
        askGold: Number(active.ask_gold) || 0
      };
    }
    requireTransactionSaveRevision_(body, saveRec);
    const removed = removeTradableItemFromSave_(save, instanceId, item.type);
    if (!removed) return {
      ok: false,
      error: 'ITEM_NOT_OWNED'
    };
    const verifiedItem = await sanitizeAuctionItemForListing_(removed, item.type),
      listingId = 'LIST_' + Utilities.getUuid().replace(/-/g, ''),
      receipt = 'create:' + listingId,
      now = new Date().toISOString();
    let sb = await auctionPrimaryInsert_({
      listing_id: listingId,
      seller_account_id: auth.accountId,
      seller_nickname: String(acc.Nickname || save.nickname || ''),
      item_type: String(item.type),
      item_template_id: String(verifiedItem.template || ''),
      item_instance_id: instanceId,
      item_instance_json: verifiedItem,
      ask_gold: askGold,
      fee_rate: AUCTION_FEE_RATE,
      status: 'creating',
      created_at: now,
      buyer_account_id: null,
      sold_at: null,
      fee_gold: null,
      seller_net_gold: null,
      payout_mode: null,
      claim_status: null,
      claimed_at: null,
      revision: 1
    });
    addServerReceipt_(save, 'auction', receipt);
    const rev = (Number(saveRec.Revision) || 1) + 1;
    await writeFullSave_(auth.accountId, rev, save);
    await verifyReceiptAfterWrite_(auth.accountId, 'auction', receipt);
    sb = await auctionPrimaryPatch_(listingId, {
      status: 'active',
      revision: (Number(sb.revision) || 1) + 1
    });
    auctionBackupSyncSbRowSafe_(sb, 'create');
    clearAuctionListCache_();
    const latest = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    save = await parseSaveRecord_(latest);
    return {
      ok: true,
      listingId,
      revision: Number(latest.Revision) || 1,
      save,
      item: verifiedItem,
      askGold
    };
  } finally {
    await lock.releaseLock();
  }
}
async function cancelAuction_(body) {
  const auth = requireAuth_(body.sessionToken),
    listingId = String(body.listingId || ''),
    lock = LockService.getScriptLock();
  await lock.waitLock(20000);
  try {
    let listing = await auctionPrimaryGetById_(listingId);
    if (!listing) return {
      ok: false,
      error: 'LISTING_NOT_FOUND'
    };
    if (String(listing.seller_account_id) !== auth.accountId) return {
      ok: false,
      error: 'NOT_SELLER'
    };
    const saveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    if (!saveRec) return {
      ok: false,
      error: 'SAVE_NOT_FOUND'
    };
    let save = await parseSaveRecord_(saveRec),
      receipt = 'cancel:' + listingId,
      item = listing.item_instance_json || {};
    if (String(listing.status) === 'cancelled' && hasServerReceipt_(save, 'auction', receipt)) return {
      ok: true,
      alreadyCompleted: true,
      item,
      revision: Number(saveRec.Revision) || 1,
      save
    };
    if (!['active', 'cancelling'].includes(String(listing.status))) return {
      ok: false,
      error: 'LISTING_NOT_ACTIVE'
    };
    requireTransactionSaveRevision_(body, saveRec);
    if (String(listing.status) === 'active') listing = await auctionPrimaryPatch_(listingId, {
      status: 'cancelling',
      revision: (Number(listing.revision) || 1) + 1
    });
    if (!hasServerReceipt_(save, 'auction', receipt)) {
      returnTradableItemToSave_(save, item, String(listing.item_type));
      addServerReceipt_(save, 'auction', receipt);
      const rev = (Number(saveRec.Revision) || 1) + 1;
      await writeFullSave_(auth.accountId, rev, save);
      await verifyReceiptAfterWrite_(auth.accountId, 'auction', receipt);
    }
    listing = await auctionPrimaryPatch_(listingId, {
      status: 'cancelled',
      revision: (Number(listing.revision) || 1) + 1
    });
    auctionBackupSyncSbRowSafe_(listing, 'cancel');
    clearAuctionListCache_();
    const latest = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    save = await parseSaveRecord_(latest);
    return {
      ok: true,
      item,
      revision: Number(latest.Revision) || 1,
      save
    };
  } finally {
    await lock.releaseLock();
  }
}
async function buyAuction_(body) {
  const auth = requireAuth_(body.sessionToken),
    listingId = String(body.listingId || ''),
    lock = LockService.getScriptLock();
  await lock.waitLock(20000);
  try {
    let listing = await auctionPrimaryGetById_(listingId);
    if (!listing) return {
      ok: false,
      error: 'LISTING_NOT_FOUND'
    };
    if (String(listing.seller_account_id) === auth.accountId) return {
      ok: false,
      error: 'CANNOT_BUY_OWN_LISTING'
    };
    const saveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    if (!saveRec) return {
      ok: false,
      error: 'SAVE_NOT_FOUND'
    };
    let save = await parseSaveRecord_(saveRec),
      receipt = 'buy:' + listingId,
      price = Number(listing.ask_gold) || 0,
      item = listing.item_instance_json || {},
      status = String(listing.status);
    if (status === 'sold' && String(listing.buyer_account_id) === auth.accountId && hasServerReceipt_(save, 'auction', receipt)) return {
      ok: true,
      alreadyCompleted: true,
      revision: Number(saveRec.Revision) || 1,
      save,
      price,
      fee: Number(listing.fee_gold) || 0,
      sellerNet: Number(listing.seller_net_gold) || 0,
      item,
      buyerGold: Number(save.gold) || 0
    };
    if (status !== 'active' && !(status === 'buying' && String(listing.buyer_account_id) === auth.accountId)) return {
      ok: false,
      error: 'LISTING_NOT_ACTIVE'
    };
    requireTransactionSaveRevision_(body, saveRec);
    const fee = Math.floor(price * AUCTION_FEE_RATE),
      sellerNet = price - fee;
    if (status === 'active') {
      if ((Number(save.gold) || 0) < price) return {
        ok: false,
        error: 'INSUFFICIENT_GOLD'
      };
      listing = await auctionPrimaryPatch_(listingId, {
        status: 'buying',
        buyer_account_id: auth.accountId,
        fee_gold: fee,
        seller_net_gold: sellerNet,
        payout_mode: 'manual_claim_v1',
        claim_status: 'pending',
        revision: (Number(listing.revision) || 1) + 1
      });
    }
    if (!hasServerReceipt_(save, 'auction', receipt)) {
      if ((Number(save.gold) || 0) < price) return {
        ok: false,
        error: 'INSUFFICIENT_GOLD'
      };
      save.gold = (Number(save.gold) || 0) - price;
      returnTradableItemToSave_(save, item, String(listing.item_type));
      addServerReceipt_(save, 'auction', receipt);
      const rev = (Number(saveRec.Revision) || 1) + 1;
      await writeFullSave_(auth.accountId, rev, save);
      await verifyReceiptAfterWrite_(auth.accountId, 'auction', receipt);
    }
    listing = await auctionPrimaryPatch_(listingId, {
      status: 'sold',
      buyer_account_id: auth.accountId,
      sold_at: String(listing.sold_at || '') || new Date().toISOString(),
      fee_gold: fee,
      seller_net_gold: sellerNet,
      payout_mode: 'manual_claim_v1',
      claim_status: 'pending',
      revision: (Number(listing.revision) || 1) + 1
    });
    auctionBackupSyncSbRowSafe_(listing, 'buy');
    clearAuctionListCache_();
    const latest = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    save = await parseSaveRecord_(latest);
    return {
      ok: true,
      revision: Number(latest.Revision) || 1,
      save,
      price,
      fee,
      sellerNet,
      item,
      buyerGold: Number(save.gold) || 0
    };
  } finally {
    await lock.releaseLock();
  }
}
async function getMyAuctionSales_(body) {
  const auth = requireAuth_(body.sessionToken);
  const rows = await auctionSbRequest_('get', '?seller_account_id=eq.' + encodeURIComponent(auth.accountId) + '&status=eq.sold&select=*&order=sold_at.desc', null, null);
  const mapped = (rows || []).map(r => ({
    listingId: String(r.listing_id || ''),
    itemType: String(r.item_type || ''),
    itemTemplateId: String(r.item_template_id || ''),
    item: r.item_instance_json || {},
    askGold: Number(r.ask_gold) || 0,
    feeGold: Number(r.fee_gold) || 0,
    sellerNetGold: Number(r.seller_net_gold) || 0,
    claimStatus: auctionPrimaryClaimStatus_(r),
    payoutMode: String(r.payout_mode || ''),
    soldAt: String(r.sold_at || ''),
    claimedAt: String(r.claimed_at || '')
  }));
  const pending = mapped.filter(r => r.claimStatus === 'pending');
  return {
    ok: true,
    rows: mapped,
    pendingCount: pending.length,
    pendingGold: pending.reduce((a, r) => a + (Number(r.sellerNetGold) || 0), 0)
  };
}
async function claimAuctionProceeds_(body) {
  const auth = requireAuth_(body.sessionToken),
    lock = LockService.getScriptLock();
  await lock.waitLock(20000);
  try {
    const saveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    if (!saveRec) return {
      ok: false,
      error: 'SAVE_NOT_FOUND'
    };
    requireTransactionSaveRevision_(body, saveRec);
    let save = await parseSaveRecord_(saveRec);
    const rows = await auctionSbRequest_('get', '?seller_account_id=eq.' + encodeURIComponent(auth.accountId) + '&status=eq.sold&select=*&order=sold_at.asc', null, null);
    const pending = (rows || []).filter(r => auctionPrimaryClaimStatus_(r) === 'pending');
    if (!pending.length) return {
      ok: true,
      claimedGold: 0,
      claimedCount: 0,
      message: 'NO_PENDING_PROCEEDS',
      revision: Number(saveRec.Revision) || 1,
      save
    };
    let claimedGold = 0,
      claimedCount = 0;
    pending.forEach(r => {
      const key = 'proceeds:' + String(r.listing_id),
        amt = Math.max(0, Number(r.seller_net_gold) || 0);
      if (!hasServerReceipt_(save, 'auction', key)) {
        save.gold = (Number(save.gold) || 0) + amt;
        addServerReceipt_(save, 'auction', key);
        claimedGold += amt;
        claimedCount++;
      }
    });
    let revision = Number(saveRec.Revision) || 1;
    if (claimedCount) {
      revision++;
      await writeFullSave_(auth.accountId, revision, save);
      await _asyncArray("forEach", pending, async r => await verifyReceiptAfterWrite_(auth.accountId, 'auction', 'proceeds:' + String(r.listing_id)));
    }
    const now = new Date().toISOString();
    await _asyncArray("forEach", pending, async r => {
      const updated = await auctionPrimaryPatch_(String(r.listing_id), {
        payout_mode: 'manual_claim_v1',
        claim_status: 'claimed',
        claimed_at: now,
        revision: (Number(r.revision) || 1) + 1
      });
      auctionBackupSyncSbRowSafe_(updated, 'claim');
    });
    const latest = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    save = await parseSaveRecord_(latest);
    return {
      ok: true,
      claimedGold,
      claimedCount,
      newGold: Number(save.gold) || 0,
      revision: Number(latest.Revision) || revision,
      save
    };
  } finally {
    await lock.releaseLock();
  }
}

/**
 * 僅供 Apps Script 編輯器手動使用。
 * 用於修復 v11.4.4 部署後、ClaimStatus 欄位尚未建立時產生的「已成交但未入帳」單筆交易。
 * 請只對你確認尚未領過錢的 ListingID 執行，避免舊版成交重複付款。
 */

function normalizeAuctionCategory_(category) {
  const c = String(category || 'all').trim().toLowerCase();
  return ['weapon', 'head', 'armor', 'ring', 'special', 'gem'].includes(c) ? c : 'all';
}
async function getAuctionListCached_(page, pageSize, category) {
  page = clampInt_(page || 1, 1, 999999);
  pageSize = clampInt_(pageSize || 20, 1, 50);
  category = normalizeAuctionCategory_(category);
  const key = 'auction:list:' + category + ':' + page + ':' + pageSize;
  try {
    const hit = CacheService.getScriptCache().get(key);
    if (hit) return JSON.parse(hit);
  } catch (_e) {}
  const data = await getAuctionList_(page, pageSize, category);
  try {
    const raw = JSON.stringify(data);
    if (raw.length < 90000) CacheService.getScriptCache().put(key, raw, 8);
  } catch (_e) {}
  return data;
}
function clearAuctionListCache_() {
  // v11.31.73: list cache is only 8 seconds and keys include category/page.
  // Mutations do not need an expensive key scan; clients explicitly invalidate their local page cache.
}
async function getAuctionList_(page, pageSize, category) {
  page = clampInt_(page || 1, 1, 999999);
  pageSize = clampInt_(pageSize || 20, 1, 50);
  category = normalizeAuctionCategory_(category);
  const offset = (page - 1) * pageSize;
  let q = '?status=eq.active';
  if (category !== 'all') q += '&item_type=eq.' + encodeURIComponent(category);
  // Fetch one extra row only to know whether a next page exists. Never download the full market.
  q += '&select=*&order=created_at.desc&offset=' + offset + '&limit=' + (pageSize + 1);
  const fetched = (await auctionSbRequest_('get', q, null, null)) || [];
  const hasNext = fetched.length > pageSize;
  const rows = fetched.slice(0, pageSize);
  return {
    ok: true,
    page,
    pageSize,
    category,
    hasNext,
    rows: rows.map(r => ({
      listingId: String(r.listing_id),
      sellerAccountId: String(r.seller_account_id || ''),
      sellerNickname: String(r.seller_nickname || ''),
      itemType: String(r.item_type || ''),
      itemTemplateId: String(r.item_template_id || ''),
      item: r.item_instance_json || {},
      askGold: Number(r.ask_gold) || 0,
      createdAt: String(r.created_at || '')
    }))
  };
}

// ------------------------------
// Public game data
// ------------------------------

function publicDataCache_() {
  return CacheService.getScriptCache();
}
function cachedDataVersion_() {
  return EDGE_PLANNING.dataVersion;
}
async function readPublicObjectsCached_(sheetName, dataVersion, forceRefresh) {
  const cache = publicDataCache_();
  const key = 'public:' + String(dataVersion) + ':' + sheetName;
  if (!forceRefresh) {
    const hit = cache.get(key);
    if (hit) {
      try {
        return JSON.parse(hit);
      } catch (_e) {}
    }
  }
  const rows = (await readObjects_(sheetName)).filter(r => {
    if (!('Enabled' in r)) return true;
    return toBool_(r.Enabled);
  });
  // CacheService 單值有大小限制；過大的 Sheet 自動退回即時讀取，不影響功能。
  try {
    const raw = JSON.stringify(rows);
    if (raw.length < 90000) cache.put(key, raw, 21600);
  } catch (_e) {}
  return rows;
}
function getBootstrapData_() {
  return {
    ok: true,
    ...EDGE_PLANNING
  };
}
// ------------------------------
// Save helpers
// ------------------------------

async function gameConfigMap_() {
  const out = {};
  (await readObjects_('GameConfig')).forEach(r => {
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

async function makeInitialSave_(nickname) {
  const cfg = await gameConfigMap_();
  const base = {
    hp: Number(cfg.BaseHP ?? 100),
    def: Number(cfg.BaseDEF ?? 0),
    patk: Number(cfg.BasePATK ?? 10),
    matk: Number(cfg.BaseMATK ?? 10),
    crit: Number(cfg.BaseCrit ?? 0),
    critDamage:Number(cfg.BaseCritDamage ?? 100)
  };
  let shortSword = null;
  try {
    const row = await equipmentRowById_('shortSword');
    if (row) shortSword = makeEquipmentInstanceFromRow_(row);
  } catch (_e) {}
  if (!shortSword) {
    shortSword = {
      id: 'ITM_' + Utilities.getUuid().replace(/-/g, ''),
      template: 'shortSword',
      name: '短劍',
      rarity: '一般',
      slot: 'weapon',
      price: 0,
      stats: {
        patk: 2
      },
      sockets: 0,
      enhance: 0,
      gems: []
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
    talentSpent: {
      hp: 0,
      def: 0,
      patk: 0,
      matk: 0,
      crit: 0
    },
    gold: Number(cfg.StartingGold ?? 10),
    stones: 0,
    floor: 1,
    currentFloor: 1,
    mainProgressEpoch:411,
    maxCleared: 0,
    bestClear: 0,
    clearCount: {},
    checkpoint: 0,
    equipment: {
      head: null,
      armor: null,
      weapon: shortSword.id,
      special: null,
      rings: [null, null, null, null]
    },
    inventory: [shortSword],
    gems: [],
    skillsOwned: startingOwnedSkills242_(cfg.StartingSkills,cfg.StartingPassiveSkills),
    equippedSkills: startingSkillIds241_(cfg.StartingEquippedSkills,['slash','heal','magicMissile']).slice(0,3),
    passive: startingPassiveSkills242_(cfg.StartingPassiveSkills),
    itemSlots: [null, null],
    purchasedSkills: [],
    consumables: {
      redPotion: 0,
      eyeDrops: 0,
      sacrificeGoat: 0,
      poisonItem: 0
    },
    utilityItems: [],
    shopTab: 'equipment',
    shopEquipSubTab: 'weapon',
    bossGemClaimed: {},
    currentBattle: null,
    shopStock: [],
    battleLog: [],
    battleVisual: {
      phase: '等待玩家操作',
      detail: '選擇一個技能開始行動。',
      busy: false,
      actor: 'player'
    }
  };
}
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
  const banned = {
    '__proto__': true,
    'constructor': true,
    'prototype': true
  };
  const scan = value => {
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

// v11.13.2：關卡驗證已完全移除。
// 登入 / save/get 直接讀取 PlayerSaves.SaveJSON；
// save/set 直接保存玩家本機進度，不再以 VerifiedMaxCleared 限制進度。

const SAVE_CHUNK_SIZE_ = 40000;
const SAVE_CHUNK_COUNT_ = 13;
function saveChunkHeaders_() {
  const out = ['SaveJSON'];
  for (let i = 2; i <= SAVE_CHUNK_COUNT_; i++) out.push('SaveJSON_' + i);
  return out;
}
function ensureSaveChunkSchema_() {}
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
  if (rec?.SaveJSON) return String(rec.SaveJSON);
  return saveChunkHeaders_().map(h => String(rec?.[h] || '')).join('');
}

// v11.31.17：PlayerSave 讀取改為 fail-closed。
// 舊版 JSON 解析失敗時會回傳 makeInitialSave_()；任何發獎/交易 API 隨後再 writeFullSave_，
// 就可能把高等角色永久覆蓋成 Lv.1。現在遇到損壞、截斷或 checksum 不符時直接拒絕交易。
function validateStoredSaveShape_(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('SAVE_CORRUPT_OBJECT');
  if (!Number.isFinite(Number(obj.level)) || Number(obj.level) < 1) throw new Error('SAVE_CORRUPT_LEVEL');
  if (!obj.base || typeof obj.base !== 'object' || Array.isArray(obj.base)) throw new Error('SAVE_CORRUPT_BASE');
  if (!Array.isArray(obj.inventory)) throw new Error('SAVE_CORRUPT_INVENTORY');
  if (!obj.equipment || typeof obj.equipment !== 'object' || Array.isArray(obj.equipment)) throw new Error('SAVE_CORRUPT_EQUIPMENT');
  if (!Array.isArray(obj.skillsOwned)) throw new Error('SAVE_CORRUPT_SKILLS');
  return obj;
}
async function parseSaveRecord_(rec) {
  if (!rec || typeof rec !== 'object') throw new Error('SAVE_RECORD_MISSING');
  const text = joinSaveJson_(rec);
  if (!text || !String(text).trim()) throw new Error('SAVE_JSON_EMPTY');
  let obj;
  try {
    obj = JSON.parse(String(text));
  } catch (_e) {
    throw new Error('SAVE_JSON_CORRUPT');
  }
  validateStoredSaveShape_(obj);

  // 有 checksum 的新式存檔必須驗證；舊資料若 checksum 空白仍允許讀取，下一次正常儲存會補上。
  const storedChecksum = String(rec.SaveChecksum || '').trim();
  if (storedChecksum) {
    const accountId = String(rec.AccountID || '');
    const revision = Number(rec.Revision) || 1;
    const expected = await sign_(accountId + '|' + revision + '|' + String(text));
    if (!safeEquals_(storedChecksum, expected)) throw new Error('SAVE_CHECKSUM_MISMATCH');
  }
  return obj;
}
function assertNoDangerousSaveRegression_(currentSave, incomingSave) {
  validateStoredSaveShape_(incomingSave);
  if (!currentSave) return;
  const oldLevel = Math.max(1, Math.trunc(Number(currentSave.level) || 1));
  const newLevel = Math.max(1, Math.trunc(Number(incomingSave.level) || 1));
  const oldClear = Math.max(0, Math.trunc(Number(currentSave.maxCleared || currentSave.bestClear) || 0));
  const newClear = Math.max(0, Math.trunc(Number(incomingSave.maxCleared || incomingSave.bestClear) || 0));

  // 最高通關本來就不應倒退；高等角色突然大幅掉級也視為壞 state。
  if (newClear < oldClear) throw new Error('SAVE_REGRESSION_MAX_CLEARED:' + oldClear + '->' + newClear);
  if (oldLevel >= 20 && newLevel < oldLevel - 10) throw new Error('SAVE_REGRESSION_LEVEL:' + oldLevel + '->' + newLevel);
}
async function writeFullSave_(accountId, revision, save) {
  accountId = String(accountId || '').trim();
  revision = Math.max(1, Math.trunc(Number(revision) || 1));
  const clean = sanitizeIncomingSave_(save || {});
  const maxCleared = Math.max(0, Math.trunc(Number(clean.maxCleared || clean.bestClear || 0) || 0));
  if(Number(clean.mainProgressEpoch)!==411)throw Error('MAIN_PROGRESS_VERSION_CHANGED');
  clean.maxCleared = maxCleared;
  clean.bestClear = Math.max(maxCleared, Math.trunc(Number(clean.bestClear || 0) || 0));
  clean.floor = Math.max(1, Math.trunc(Number(clean.floor || clean.currentFloor || maxCleared + 1) || maxCleared + 1));

  // v11.31.27：SUPABASE_PRIMARY_ENABLED_ 開啟時，全玩家由 Supabase 擔任 PlayerSave Primary。
  // 寫入順序：Supabase（正式）→ Google Sheet（備援鏡像）。
  // Supabase 寫入失敗會直接中止；Google Sheet 備援失敗只記錄錯誤，不回滾已成功的 Primary。
  if (isSupabasePrimaryEnabledFor_(accountId)) {
    // v11.31.69: Supabase is the only Runtime Primary.
    // PlayerSaves_SCHEMA is SNAPSHOT_BACKUP_ONLY; no realtime Sheet write here.
    await supabaseWritePrimarySave_(accountId, revision, clean);
    invalidateLeaderboardCache_();
    return;
  }

  // Rollback 模式：SUPABASE_PRIMARY_ENABLED_ 關閉時，Google Sheet 恢復為 Primary。
  await writeGoogleSheetSaveBackup_(accountId, revision, clean);

  // 舊 Shadow 測試保留；若帳號未啟用 Shadow 會直接 skipped。
  await shadowSaveToSupabase_(accountId, revision, clean);
  invalidateLeaderboardCache_();
  // 排行榜不再另外寫表；更新排行榜時直接讀 PlayerSaves_SCHEMA。
}

// 專門寫 Google Sheet PlayerSaves；不經過 Supabase Primary 路由。
async function writeGoogleSheetSaveBackup_(accountId, revision, save) {
  const rec = await findSheetSaveRecordByAccount_(accountId);
  const clean = sanitizeIncomingSave_(save || {});
  const maxCleared = Math.max(0, Math.trunc(Number(clean.maxCleared || clean.bestClear || 0) || 0));
  if(Number(clean.mainProgressEpoch)!==411)throw Error('MAIN_PROGRESS_VERSION_CHANGED');
  clean.maxCleared = maxCleared;
  clean.bestClear = Math.max(maxCleared, Math.trunc(Number(clean.bestClear || 0) || 0));
  clean.floor = Math.max(1, Math.trunc(Number(clean.floor || clean.currentFloor || maxCleared + 1) || maxCleared + 1));
  const nickname = String(clean.nickname || '');
  const saveJson = JSON.stringify(clean);
  ensureSaveChunkSchema_();
  const chunks = splitSaveJson_(saveJson);
  const checksum = await sign_(accountId + '|' + revision + '|' + saveJson);
  const patch = {
    AccountID: accountId,
    Revision: revision,
    Level: Number(clean.level || 1) || 1,
    MaxCleared: maxCleared,
    Nickname: nickname,
    UpdatedAt: new Date().toISOString(),
    SaveChecksum: checksum
  };
  saveChunkHeaders_().forEach((h, i) => patch[h] = chunks[i] || '');
  if (rec) {
    await updateRowObject_(DB.SAVES, rec.__row, patch);
    cacheSaveRow_(accountId, rec.__row);
  } else {
    await appendObject_(DB.SAVES, patch);
    const sh = ss_().getSheetByName(DB.SAVES);
    if (sh) cacheSaveRow_(accountId, sh.getLastRow());
  }
}
async function updateSaveRecord_(rec, save) {
  const revision = (Number(rec.Revision) || 1) + 1;
  await writeFullSave_(String(rec.AccountID), revision, save);
}

// ------------------------------
// Leaderboard helpers
// ------------------------------

// ------------------------------
// Auction inventory adapters
// 會依目前遊戲存檔結構做寬鬆支援。
// 正式接 HTML 時再依你遊戲實際 state 做最後一次對位。
// ------------------------------

function removeTradableItemFromSave_(save, instanceId, type) {
  // 所有裝備若仍裝備中，不允許透過直接呼叫 API 繞過前端上架限制。
  if (type !== 'gem' && save && save.equipment) {
    const eq = save.equipment;
    const equippedIds = [eq.head, eq.armor, eq.weapon, eq.special].concat(Array.isArray(eq.rings) ? eq.rings : []).filter(Boolean);
    if (equippedIds.some(x => String(x) === String(instanceId))) return null;
  }
  const arrays = type === 'gem' ? ['gems', 'gemInventory'] : ['inventory', 'weapons'];
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

// ------------------------------
// Shared equipment helpers
async function equipmentRowById_(itemId) {
  const id = String(itemId || '').trim();
  if (!id) return null;
  if(id.startsWith('forge172_')){
   const it=await secureRpc78('game_forge_lookup172',{p_template:id});if(!it)return null;
   return {ItemID:id,Name:it.name,Rarity:it.rarity,Slot:'weapon',BasePrice:5000,HP:it.stats.hp,DEF:it.stats.def,PATK:it.stats.patk,MATK:it.stats.matk,Crit:it.stats.crit,CritDamage:it.stats.critDamage,EffectKey:it.effect||'',Enabled:true,_forge172:it.forge172,_forgeItemId:it.id,_forgeItem:it};
  }
  return (await readObjects_('Equipment')).find(r => String(r.ItemID || '').trim() === id && (!('Enabled' in r) || toBool_(r.Enabled))) || null;
}
function makeEquipmentInstanceFromRow_(row) {
  if (!row) throw new Error('EQUIPMENT_NOT_FOUND');
  const sockets = Math.max(0, Math.trunc(Number(row.BaseSockets) || 0));
  const stats = {};
  [['hp', 'HP'], ['def', 'DEF'], ['patk', 'PATK'], ['matk', 'MATK'], ['crit', 'Crit']].forEach(pair => {
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
// ------------------------------
// Token
// ------------------------------

function requireAuth_(token) {
  if (!EDGE_ACTOR || token !== EDGE_TOKEN) throw Error('UNAUTHORIZED');
  return {
    accountId: EDGE_ACTOR.accountId
  };
}
async function sign_(text) {
  const secret = PropertiesService.getScriptProperties().getProperty('SERVER_SECRET');
  const bytes = await Utilities.computeHmacSha256Signature(String(text), String(secret));
  return bytesToHex_(bytes);
}

// ------------------------------
// Password hashing
// Apps Script 原生沒有 bcrypt/Argon2。
// 此處用 salt + 迭代 SHA-256 作遊戲帳號 v1。
// 若未來正式大量營運，建議改 Firebase Auth / Supabase Auth。
// ------------------------------

async function hashPassword_(password, salt) {
  let bytes = Utilities.newBlob(String(salt) + '|' + String(password)).getBytes();
  for (let i = 0; i < PASSWORD_ITERATIONS; i++) {
    bytes = await Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  }
  return bytesToHex_(bytes);
}

// ------------------------------
// Sheet DB helpers
// ------------------------------

function ss_() {
  throw Error('GOOGLE_SHEETS_DISABLED');
}
function ensureSheet_() {
  return {
    getLastColumn: () => 0,
    getLastRow: () => 0,
    getRange: () => ({
      getValues: () => [[]],
      setValues: () => null
    }),
    setFrozenRows: () => null
  };
}
function readSheetObjectsRaw_(name) {
  if (EDGE_PLANNING.data?.[name]) return EDGE_PLANNING.data[name];
  if (EDGE_PRIVATE[name]) return EDGE_PRIVATE[name];
  throw Error('RUNTIME_TABLE_NOT_MAPPED:' + name);
}

// v11.31.31：World Boss 玩家動態資料改為 Supabase Primary。
// WorldBoss_SCHEMA remains Google Sheet config; WorldBossState is Supabase Primary from v11.31.61.
const WORLD_BOSS_SUPABASE_PRIMARY_ENABLED_ = true;
function isWorldBossSupabasePrimaryTable_(sheetName) {
  return WORLD_BOSS_SUPABASE_PRIMARY_ENABLED_ === true && (sheetName === DB.WORLD_BOSS_STATE || sheetName === DB.WORLD_BOSS_ATTEMPTS || sheetName === DB.WORLD_BOSS_REWARDS);
}
function wbTableMeta_(sheetName) {
  if (sheetName === DB.WORLD_BOSS_STATE) return {
    table: 'WorldBossState',
    idField: 'boss_instance_id',
    sheetId: 'BossInstanceID',
    toSb: wbStateSheetToSb_
  };
  if (sheetName === DB.WORLD_BOSS_ATTEMPTS) return {
    table: 'WorldBossAttempts',
    idField: 'challenge_id',
    sheetId: 'ChallengeID',
    toSb: wbAttemptSheetToSb_
  };
  if (sheetName === DB.WORLD_BOSS_REWARDS) return {
    table: 'WorldBossRewards',
    idField: 'reward_id',
    sheetId: 'RewardID',
    toSb: wbRewardSheetToSb_
  };
  return null;
}
function wbAttemptSbToSheet_(r) {
  return {
    __row: String(r.challenge_id || ''),
    ChallengeID: String(r.challenge_id || ''),
    BossInstanceID: String(r.boss_instance_id || ''),
    AccountID: String(r.account_id || ''),
    Nickname: String(r.nickname || ''),
    DateKey: String(r.date_key || ''),
    AttemptNo: Number(r.attempt_no) || 1,
    StartedAt: String(r.started_at || ''),
    SubmittedAt: String(r.submitted_at || ''),
    Damage: Number(r.damage) || 0,
    Status: String(r.status || 'STARTED')
  };
}
function wbRewardSbToSheet_(r) {
  return {
    __row: String(r.reward_id || ''),
    RewardID: String(r.reward_id || ''),
    BossInstanceID: String(r.boss_instance_id || ''),
    AccountID: String(r.account_id || ''),
    Nickname: String(r.nickname || ''),
    Rank: Number(r.rank) || 0,
    ChestType: String(r.chest_type || ''),
    Status: String(r.status || 'PENDING'),
    CreatedAt: String(r.created_at || ''),
    OpenedAt: String(r.opened_at || ''),
    Gold: r.gold == null ? '' : Number(r.gold),
    Stones: r.stones == null ? '' : Number(r.stones),
    GemAwarded: r.gem_awarded == null ? '' : String(r.gem_awarded),
    RewardGoldMin: r.reward_gold_min == null ? '' : Number(r.reward_gold_min),
    RewardGoldMax: r.reward_gold_max == null ? '' : Number(r.reward_gold_max),
    RewardStones: r.reward_stones == null ? '' : Number(r.reward_stones),
    RewardGemRate: r.reward_gem_rate == null ? '' : Number(r.reward_gem_rate),
    RewardGemID: String(r.reward_gem_id || ''),
    RewardGemJSON: r.reward_gem_json == null ? '' : JSON.stringify(r.reward_gem_json)
  };
}
function wbStateSbToSheet_(r) {
  return {
    __row: String(r.boss_instance_id || ''),
    BossInstanceID: String(r.boss_instance_id || ''),
    BossID: String(r.boss_id || ''),
    Name: String(r.name || ''),
    MaxHP: Number(r.max_hp) || 0,
    CurrentHP: Number(r.current_hp) || 0,
    DEF: Number(r.def) || 0,
    PATK: Number(r.patk) || 0,
    MATK: Number(r.matk) || 0,
    SpawnedAt: String(r.spawned_at || ''),
    DeadAt: String(r.dead_at || ''),
    RespawnAt: String(r.respawn_at || ''),
    Status: String(r.status || 'ALIVE'),
    Revision: Number(r.revision) || 1
  };
}
function wbSbToSheet_(sheetName, r) {
  return sheetName === DB.WORLD_BOSS_STATE ? wbStateSbToSheet_(r) : sheetName === DB.WORLD_BOSS_ATTEMPTS ? wbAttemptSbToSheet_(r) : wbRewardSbToSheet_(r);
}
async function readObjects_(sheetName) {
  if (isWorldBossSupabasePrimaryTable_(sheetName)) return (await wbSbFetchAll_(wbTableMeta_(sheetName).table)).map(r => wbSbToSheet_(sheetName, r));
  // PUBLIC_SHEETS 在 Runtime 一律讀已發布 Supabase package；Google Sheet 僅供企劃編輯/發布。
  if (DB.PUBLIC_SHEETS.includes(String(sheetName || ''))) return publishedPlanningRows_(String(sheetName));
  return readSheetObjectsRaw_(sheetName);
}
async function wbSbPatchById_(sheetName, id, patch) {
  const meta = wbTableMeta_(sheetName);
  if (!meta) throw new Error('WB_PRIMARY_TABLE_INVALID');
  const current = (await wbSbFetchAll_(meta.table)).find(r => String(r[meta.idField]) === String(id));
  if (!current) throw new Error('WB_PRIMARY_ROW_NOT_FOUND:' + id);
  const merged = Object.assign({}, wbSbToSheet_(sheetName, current), patch);
  delete merged.__row;
  const payload = meta.toSb(merged),
    cfg = supabaseConfig_();
  const url = cfg.url + '/rest/v1/' + meta.table + '?' + meta.idField + '=eq.' + encodeURIComponent(String(id));
  const res = await UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Prefer: 'return=representation'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_WB_PATCH_' + meta.table + '_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {}
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SUPABASE_WB_PATCH_' + meta.table + '_ROWCOUNT');
}
function wbBackupAppend_() {}
function wbBackupUpdateById_() {}

// v11.31.21：PlayerSaves AccountID -> rowNumber 快取。
// Cache 只當索引提示；命中後仍重新讀該列並確認 AccountID，避免人工插列/刪列/排序造成誤讀。
const SAVE_ROW_CACHE_TTL_SEC_ = 21600;
function saveRowCacheKey_(accountId) {
  return 'acc_row:' + String(accountId || '').trim();
}
function cacheSaveRow_(accountId, rowNumber) {
  const id = String(accountId || '').trim(),
    row = Math.trunc(Number(rowNumber) || 0);
  if (!id || row < 2) return;
  try {
    CacheService.getScriptCache().put(saveRowCacheKey_(id), String(row), SAVE_ROW_CACHE_TTL_SEC_);
  } catch (_e) {}
}
function clearSaveRowCache_(accountId) {
  try {
    CacheService.getScriptCache().remove(saveRowCacheKey_(accountId));
  } catch (_e) {}
}
function readObjectAtRow_(sheetName, rowNumber) {
  const sh = ss_().getSheetByName(sheetName);
  if (!sh) return null;
  const row = Math.trunc(Number(rowNumber) || 0),
    lastRow = sh.getLastRow(),
    lastCol = sh.getLastColumn();
  if (row < 2 || row > lastRow || lastCol < 1) return null;
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const values = sh.getRange(row, 1, 1, lastCol).getValues()[0];
  if (!values.some(v => String(v) !== '')) return null;
  const obj = {
    __row: row
  };
  headers.forEach((h, i) => obj[h] = values[i]);
  return obj;
}
async function findSheetSaveRecordByAccount_(accountId) {
  const value = String(accountId || '');
  let cachedRow = 0;
  try {
    cachedRow = Math.trunc(Number(CacheService.getScriptCache().get(saveRowCacheKey_(value))) || 0);
  } catch (_e) {}
  if (cachedRow >= 2) {
    const hit = readObjectAtRow_(DB.SAVES, cachedRow);
    if (hit && String(hit.AccountID) === value) return hit;
    clearSaveRowCache_(value);
  }
  const rows = await readObjects_(DB.SAVES);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].AccountID) === value) {
      cacheSaveRow_(value, rows[i].__row);
      return rows[i];
    }
  }
  return null;
}
async function findRowByValue_(sheetName, header, value) {
  value = String(value);

  // v11.31.22：測試帳號的 PlayerSave authoritative source 改為 Supabase。
  // 既有交易、Revision guard、receipt verify 都會自然讀到同一份 Primary。
  if (sheetName === DB.SAVES && header === 'AccountID' && isSupabasePrimaryEnabledFor_(value)) {
    return await supabasePrimaryRecord_(value);
  }

  // 最重、最高頻的 PlayerSaves AccountID 查詢走 row cache。
  if (sheetName === DB.SAVES && header === 'AccountID') {
    let cachedRow = 0;
    try {
      cachedRow = Math.trunc(Number(CacheService.getScriptCache().get(saveRowCacheKey_(value))) || 0);
    } catch (_e) {}
    if (cachedRow >= 2) {
      const hit = readObjectAtRow_(sheetName, cachedRow);
      if (hit && String(hit.AccountID) === value) return hit;
      clearSaveRowCache_(value);
    }
  }
  const rows = await readObjects_(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][header]) === value) {
      if (sheetName === DB.SAVES && header === 'AccountID') cacheSaveRow_(value, rows[i].__row);
      return rows[i];
    }
  }
  return null;
}
function appendSheetObjectRaw_(sheetName, obj) {
  const sh = ss_().getSheetByName(sheetName);
  if (!sh) throw new Error('SHEET_NOT_FOUND: ' + sheetName);
  if (!obj || typeof obj !== 'object') throw new Error('INVALID_DB_OBJECT:' + sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const row = headers.map(h => typeof obj[h] !== 'undefined' ? obj[h] : '');
  sh.appendRow(row);
}
function updateSheetRowObjectRaw_(sheetName, rowNumber, patch) {
  const sh = ss_().getSheetByName(sheetName);
  if (!sh) throw new Error('SHEET_NOT_FOUND: ' + sheetName);
  if (!patch || typeof patch !== 'object') throw new Error('INVALID_DB_PATCH:' + sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const current = sh.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach((h, i) => {
    if (typeof patch[h] !== 'undefined') current[i] = patch[h];
  });
  sh.getRange(rowNumber, 1, 1, headers.length).setValues([current]);
}
async function appendObject_(sheetName, obj) {
  if (isWorldBossSupabasePrimaryTable_(sheetName)) {
    const meta = wbTableMeta_(sheetName),
      payload = meta.toSb(obj);
    await wbSbInsert_(meta.table, payload);
    wbBackupAppend_(sheetName, obj);
    return;
  }
  return appendSheetObjectRaw_(sheetName, obj);
}
async function updateRowObject_(sheetName, rowNumber, patch) {
  if (isWorldBossSupabasePrimaryTable_(sheetName)) {
    const id = String(rowNumber || '');
    await wbSbPatchById_(sheetName, id, patch);
    wbBackupUpdateById_(sheetName, id, patch);
    return;
  }
  return updateSheetRowObjectRaw_(sheetName, rowNumber, patch);
}

// ------------------------------
// Validation / utility
// ------------------------------

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
  try {
    return JSON.parse(String(text));
  } catch (e) {
    return fallback;
  }
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
function bytesToHex_(bytes) {
  return bytes.map(b => {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}
function json_(obj) {
  return obj;
}
// ============================================================
// Supabase PlayerSave Primary v1
// 目前僅開放白名單測試帳號。其他帳號仍使用 Google Sheet Primary。
// ============================================================

// v11.31.27：全玩家 Supabase Primary 正式切換。
// true  = 所有有效 AccountID 使用 Supabase Primary、Google Sheet Backup。
// false = 所有帳號回到 Google Sheet Primary。
// 注意：切成 false 前，必須先做 Full Audit / Rollback 檢查，避免備份落後造成回朔。
const SUPABASE_PRIMARY_ENABLED_ = true;

// Full rollout above no longer uses a historical test-account allowlist.
function isSupabasePrimaryEnabledFor_(accountId) {
  if (SUPABASE_PRIMARY_ENABLED_ !== true) return false;
  return String(accountId || '').trim() !== '';
}
function supabaseConfig_() {
  return {
    url: EDGE_BASE,
    key: EDGE_KEY
  };
}
async function supabasePrimaryReadRow_(accountId) {
  const cfg = supabaseConfig_();
  const endpoint = cfg.url + '/rest/v1/PlayerSaves?account_id=eq.' + encodeURIComponent(String(accountId)) + '&select=*';
  const response = await UrlFetchApp.fetch(endpoint, {
    method: 'get',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key
    },
    muteHttpExceptions: true
  });
  const status = response.getResponseCode(),
    text = response.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_PRIMARY_READ_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {
    throw new Error('SUPABASE_PRIMARY_READ_JSON_INVALID');
  }
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (rows.length !== 1) throw new Error('SUPABASE_PRIMARY_DUPLICATE_ACCOUNT:' + accountId);
  return rows[0];
}

// 把 Supabase row 轉成既有 parseSaveRecord_ / Revision guard 可直接使用的格式。
async function supabasePrimaryRecord_(accountId) {
  const row = await supabasePrimaryReadRow_(accountId);
  if (!row) return null;
  const save = row.save_json && typeof row.save_json === 'object' ? row.save_json : null;
  if (!save) throw new Error('SUPABASE_PRIMARY_SAVE_JSON_INVALID');
  const text = JSON.stringify(save);
  return {
    __source: 'supabase',
    AccountID: String(row.account_id || accountId),
    Revision: Number(row.revision) || 1,
    SaveJSON: text,
    Level: Number(row.level || save.level || 1) || 1,
    MaxCleared: Math.max(0, Math.trunc(Number(row.max_cleared || save.maxCleared || 0) || 0)),
    Nickname: String(row.nickname || save.nickname || ''),
    UpdatedAt: String(row.updated_at || ''),
    // Supabase jsonb 可能重排 key，因此 Primary record 不沿用 Sheet checksum。
    // JSON shape 仍會由 parseSaveRecord_ 的 fail-closed 驗證。
    SaveChecksum: ''
  };
}
async function supabaseWritePrimarySave_(accountId, revision, save) {
  const cfg = supabaseConfig_();
  const clean = sanitizeIncomingSave_(save || {});
  validateStoredSaveShape_(clean);
  const newRevision = Math.max(1, Math.trunc(Number(revision) || 1));
  const expectedRevision = newRevision - 1;
  const maxCleared = Math.max(0, Math.trunc(Number(clean.maxCleared || clean.bestClear || 0) || 0));
  const payload = {
    save_json: clean,
    revision: newRevision,
    level: Number(clean.level || 1) || 1,
    max_cleared: maxCleared,
    nickname: String(clean.nickname || ''),
    updated_at: new Date().toISOString()
  };
  let endpoint, method;
  if (expectedRevision >= 1) {
    endpoint = cfg.url + '/rest/v1/PlayerSaves?account_id=eq.' + encodeURIComponent(accountId) + '&revision=eq.' + expectedRevision;
    method = 'patch';
  } else {
    endpoint = cfg.url + '/rest/v1/PlayerSaves?on_conflict=account_id';
    method = 'post';
    payload.account_id = accountId;
  }
  const response = await UrlFetchApp.fetch(endpoint, {
    method: method,
    contentType: 'application/json',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Prefer: expectedRevision >= 1 ? 'return=representation' : 'resolution=merge-duplicates,return=representation'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode(),
    text = response.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_PRIMARY_WRITE_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {
    throw new Error('SUPABASE_PRIMARY_WRITE_JSON_INVALID');
  }
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error('SAVE_PREFLIGHT_REVISION_MISMATCH');
  }
  const written = rows[0];
  if (Number(written.revision) !== newRevision) throw new Error('SUPABASE_PRIMARY_REVISION_VERIFY_FAILED');

  // 再 GET 一次確認 Primary 真的可回讀，而且完整角色格式仍有效。
  const verify = await supabasePrimaryRecord_(accountId);
  if (!verify || Number(verify.Revision) !== newRevision) throw new Error('SUPABASE_PRIMARY_READBACK_VERIFY_FAILED');
  await parseSaveRecord_(verify);
  console.log('[Supabase Primary OK] ' + accountId + ' Revision=' + newRevision);
  return verify;
}

// 直接讀 Google Sheet 備援，不經過 Supabase Primary 路由。

// 檢查 Supabase Primary 與 Google Sheet Backup 是否可以安全切回。
// 僅讀取，不修改任何資料。

// Apps Script 下拉選單用：切回 Google Sheet Primary 前先跑這個。
// v11.31.24：一次檢查所有 Primary 白名單帳號。

// v11.31.24：把白名單中「Supabase 尚不存在」的既有 Sheet 存檔安全種入 Supabase。
// 只建立缺少的 row；若 Supabase 已存在，絕不覆寫。

// 第一次換成 v11.31.24 時先手動執行一次，再部署 Web App。

// ============================================================
// v11.31.25：全玩家 PlayerSave 安全遷移工具
// 此版「只搬資料」，不會把全服切成 Supabase Primary。
// 規則：Supabase 缺少 -> 從 Sheet 建立；已存在且一致 -> 跳過；
//      已存在但 Revision / SaveJSON 不一致 -> 絕不覆蓋，列為 CONFLICT。
// 為避免 Apps Script 執行逾時，每次最多處理 20 個帳號；重複執行直到 done=true。
// ============================================================
const SUPABASE_FULL_MIGRATION_BATCH_SIZE_ = 20;
const SUPABASE_FULL_MIGRATION_CURSOR_KEY_ = 'SUPABASE_FULL_MIGRATION_CURSOR_V113125';

// 手動執行：每次安全處理一批；看到 done=false 就再執行一次。

// 若要從第一批重新掃描，只重設「進度游標」，不會刪除或覆蓋任何 PlayerSave。

// 最終唯讀稽核：逐帳號確認 Sheet 與 Supabase Revision + 完整 SaveJSON。
// 若玩家數很多而碰到 Apps Script 執行時間限制，可改用下面的 Batch Audit。

// ============================================================
// Supabase PlayerSave Shadow Copy
// Google Sheet 仍為正式來源。
// Supabase 寫入失敗「不得」影響正式遊戲存檔。
// ============================================================
// Historical unused shadow-account literal omitted from versioned source.
async function shadowSaveToSupabase_(accountId, revision, save) {
  if (!isSupabaseShadowEnabledFor_(accountId)) {
    return {
      ok: true,
      skipped: true
    };
  }
  try {
    var props = PropertiesService.getScriptProperties();
    var url = props.getProperty('SUPABASE_URL');
    var key = props.getProperty('SUPABASE_SERVICE_KEY');
    if (!url || !key) {
      throw new Error('SUPABASE_CONFIG_MISSING');
    }

    // 使用與正式 PlayerSave 相同的 sanitize
    var clean = sanitizeIncomingSave_(save || {});
    var maxCleared = Math.max(0, Math.trunc(Number(clean.maxCleared || clean.bestClear || 0) || 0));
    var payload = {
      account_id: String(accountId),
      revision: Number(revision) || 1,
      save_json: clean,
      level: Number(clean.level || 1) || 1,
      max_cleared: maxCleared,
      nickname: String(clean.nickname || ''),
      updated_at: new Date().toISOString()
    };
    var endpoint = url + '/rest/v1/PlayerSaves' + '?on_conflict=account_id';
    var response = await UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var status = response.getResponseCode();
    var text = response.getContentText();
    if (status < 200 || status >= 300) {
      throw new Error('SUPABASE_SHADOW_HTTP_' + status + ': ' + text);
    }
    console.log('[ShadowSave OK] ' + accountId + ' Revision=' + revision);
    return {
      ok: true,
      status: status
    };
  } catch (err) {
    // 非常重要：
    // Shadow Copy 失敗不能讓正式 Google Sheet 存檔失敗。
    console.error('[ShadowSave FAILED] ' + accountId + ': ' + String(err && err.message || err));
    return {
      ok: false,
      error: String(err && err.message || err)
    };
  }
}

// ============================================================
// Supabase Shadow 深度比對工具
// - Object key 順序不同視為相同（PostgreSQL jsonb 會重排 key）
// - Array 順序仍必須一致
// - 發現差異時只輸出第一個差異位置，避免 Apps Script Log 爆量
// ============================================================

// 保留原函式名稱，現在會一次檢查所有 Supabase Primary 白名單帳號。

// ============================================================
// v11.31.29 World Boss Supabase Shadow Migration / Audit
// 正式 World Boss 仍以 Google Sheet 為 Primary；此區僅負責安全搬移與比對。
// ============================================================
function wbSbHeaders_() {
  const cfg = supabaseConfig_();
  return {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key
  };
}
async function wbSbFetchAll_(table) {
  const cfg = supabaseConfig_();
  const url = cfg.url + '/rest/v1/' + table + '?select=*';
  const res = await UrlFetchApp.fetch(url, {
    method: 'get',
    headers: wbSbHeaders_(),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_WB_READ_' + table + '_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {
    throw new Error('SUPABASE_WB_READ_' + table + '_JSON_INVALID');
  }
  if (!Array.isArray(rows)) throw new Error('SUPABASE_WB_READ_' + table + '_ROWS_INVALID');
  return rows;
}
async function wbSbInsert_(table, row) {
  const cfg = supabaseConfig_();
  const res = await UrlFetchApp.fetch(cfg.url + '/rest/v1/' + table, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Prefer: 'return=representation'
    },
    payload: JSON.stringify(row),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_WB_INSERT_' + table + '_HTTP_' + status + ': ' + text);
  return text;
}
function wbNullableIso_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}
function wbNullableNum_(v) {
  return v === null || v === undefined || String(v).trim() === '' ? null : Number(v);
}
function wbJsonValue_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(String(v));
  } catch (_e) {
    return String(v);
  }
}
function wbAttemptSheetToSb_(r) {
  return {
    challenge_id: String(r.ChallengeID || ''),
    boss_instance_id: String(r.BossInstanceID || ''),
    account_id: String(r.AccountID || ''),
    nickname: String(r.Nickname || ''),
    date_key: normalizeWbDateKey_(r.DateKey),
    attempt_no: Math.trunc(Number(r.AttemptNo) || 1),
    started_at: wbNullableIso_(r.StartedAt),
    submitted_at: wbNullableIso_(r.SubmittedAt),
    damage: Math.trunc(Number(r.Damage) || 0),
    status: String(r.Status || 'STARTED')
  };
}
function wbRewardSheetToSb_(r) {
  return {
    reward_id: String(r.RewardID || ''),
    boss_instance_id: String(r.BossInstanceID || ''),
    account_id: String(r.AccountID || ''),
    nickname: String(r.Nickname || ''),
    rank: Math.trunc(Number(r.Rank) || 0),
    chest_type: String(r.ChestType || ''),
    status: String(r.Status || 'PENDING'),
    created_at: wbNullableIso_(r.CreatedAt),
    opened_at: wbNullableIso_(r.OpenedAt),
    gold: wbNullableNum_(r.Gold),
    stones: wbNullableNum_(r.Stones),
    gem_awarded: r.GemAwarded === null || r.GemAwarded === undefined ? '' : String(r.GemAwarded),
    reward_gold_min: wbNullableNum_(r.RewardGoldMin),
    reward_gold_max: wbNullableNum_(r.RewardGoldMax),
    reward_stones: wbNullableNum_(r.RewardStones),
    reward_gem_rate: wbNullableNum_(r.RewardGemRate),
    reward_gem_id: String(r.RewardGemID || ''),
    reward_gem_json: wbJsonValue_(r.RewardGemJSON)
  };
}

// v11.31.33：一次性修復 Supabase WorldBossAttempts.date_key 舊格式。
// 安全原則：
// 1) 以 Google Sheet Backup 的 ChallengeID / DateKey 為修復依據。
// 2) 除 date_key 外，其餘欄位必須已完全一致，否則跳過，不自動覆蓋。
// 3) PATCH payload 只包含 date_key，絕不修改 Damage / Status / AccountID 等欄位。
// 4) 每筆 PATCH 後重新讀取並驗證；最後再跑完整 Audit。

// ============================================================================
// v11.31.37 - Auction -> Supabase SHADOW write / migration / audit
// 正式 Auction runtime 仍使用 Auction_SCHEMA；這些函式只供 Apps Script 編輯器手動執行。
// ============================================================================
const AUCTION_SUPABASE_TABLE_ = 'AuctionListings';
async function auctionSbRequest_(method, query, payload, prefer) {
  const cfg = supabaseConfig_();
  const endpoint = cfg.url + '/rest/v1/' + AUCTION_SUPABASE_TABLE_ + (query || '');
  const opt = {
    method: String(method || 'get').toLowerCase(),
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key
    },
    muteHttpExceptions: true
  };
  if (payload !== undefined && payload !== null) {
    opt.contentType = 'application/json';
    opt.payload = JSON.stringify(payload);
  }
  if (prefer) opt.headers.Prefer = prefer;
  const res = await UrlFetchApp.fetch(endpoint, opt),
    status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_AUCTION_HTTP_' + status + ': ' + text);
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch (_e) {
    return text;
  }
}

/**
 * v11.31.37 Shadow Write
 * Google Sheet remains the Auction runtime source of truth.
 * After a Sheet mutation is fully committed, mirror the final row to Supabase.
 * Shadow failures are logged only and MUST NOT change the player-facing transaction result.
 */

// ============================================================
// v11.31.42 Boxing Supabase Shadow Migration / Audit
// Google Sheet remains Primary in this version.
// Only migrates/verifies BoxingAttempts / BoxingRanking / BoxingRewards.
// BoxingMachine_SCHEMA and BoxingSeasons_SCHEMA remain in Google Sheet.
// ============================================================
function boxingSbHeaders_() {
  const cfg = supabaseConfig_();
  return {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key
  };
}
// v11.31.43b: Boxing Shadow Write (safe scope only).
// IMPORTANT: boxing/status, boxing/history, settleBoxingSeason_, BoxingMachine_SCHEMA and BoxingSeasons_SCHEMA are untouched.
// Google Sheet remains authoritative. Supabase mirror failure is log-only and never changes the API result.
async function boxingSbUpsert_(table, row) {
  const cfg = supabaseConfig_();
  const res = await UrlFetchApp.fetch(cfg.url + '/rest/v1/' + table, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    payload: JSON.stringify(row),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_BOXING_UPSERT_' + table + '_HTTP_' + status + ': ' + text);
  return true;
}
function boxingNullableIso_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}
function boxingJsonValue_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(String(v));
  } catch (_e) {
    return String(v);
  }
}
function boxingAttemptSheetToSb_(r) {
  return {
    challenge_id: String(r.ChallengeID || ''),
    season_id: String(r.SeasonID || ''),
    account_id: String(r.AccountID || ''),
    nickname: String(r.Nickname || ''),
    started_at: boxingNullableIso_(r.StartedAt),
    submitted_at: boxingNullableIso_(r.SubmittedAt),
    damage: Math.trunc(Number(r.Damage) || 0),
    status: String(r.Status || 'STARTED')
  };
}
function boxingRankingSheetToSb_(r) {
  return {
    season_id: String(r.SeasonID || ''),
    account_id: String(r.AccountID || ''),
    nickname: String(r.Nickname || ''),
    damage: Math.trunc(Number(r.Damage) || 0),
    submitted_at: boxingNullableIso_(r.SubmittedAt),
    build_snapshot_json: boxingJsonValue_(r.BuildSnapshotJSON)
  };
}
function boxingRewardSheetToSb_(r) {
  return {
    reward_id: String(r.RewardID || ''),
    season_id: String(r.SeasonID || ''),
    account_id: String(r.AccountID || ''),
    nickname: String(r.Nickname || ''),
    rank: Math.trunc(Number(r.Rank) || 0),
    reward_type: String(r.RewardType || ''),
    reward_id_value: String(r.RewardIDValue || ''),
    quantity: Math.trunc(Number(r.Quantity) || 0),
    status: String(r.Status || 'PENDING'),
    created_at: boxingNullableIso_(r.CreatedAt),
    claimed_at: boxingNullableIso_(r.ClaimedAt)
  };
}

// v11.31.43b verification: compare Sheet primary with Supabase mirror after a real Boxing run.

// v11.31.44 verification: focused BoxingRewards mirror check.

// ============================================================
// v11.31.45 Boxing Reward Shadow Test Tool
// TEST ONLY: verifies BoxingRewards Sheet -> Supabase mirror states.
// Does NOT grant equipment/stones, modify PlayerSave, or create receipts.
// Test identity is stored in Script Properties so each step targets the same row.
// ============================================================
const BOXING_REWARD_SHADOW_TEST_PROP_ = 'BOXING_REWARD_SHADOW_TEST_IDS_V113145';
// ============================================================
// v11.31.46 Boxing REAL Reward Claim Integration Test
// PURPOSE: create one tiny real STONES reward for a chosen existing account,
// then claim it through the NORMAL boxing/reward/claim API from the game client.
// This DOES modify PlayerSave by +1 stone and writes a real boxing receipt.
// It never changes BoxingSeasons_SCHEMA / BoxingRanking_SCHEMA.
// IMPORTANT: set BOXING_REAL_REWARD_TEST_ACCOUNT_ID_ to your test AccountID before running prepare.
// ============================================================
const BOXING_REAL_REWARD_TEST_ACCOUNT_ID_ = ''; // <-- 貼上「測試帳號」AccountID；不可使用正式玩家帳號
const BOXING_REAL_REWARD_TEST_PROP_ = 'BOXING_REAL_REWARD_CLAIM_TEST_V113146';

// ============================================================
// v11.31.47 Boxing Supabase Primary smoke/audit helper
// ============================================================

// ============================================================
// v11.31.48 Boxing Supabase -> Google Sheet Snapshot Backup
// Replaces only the three Runtime backup sheets. Planning/config sheets are untouched.
// ============================================================

// ============================================================
// v11.31.49 Boxing Daily Snapshot Trigger final verification
// Runtime remains Supabase Primary; this only manages/verifies the daily Sheet backup trigger.
// ============================================================

// ============================================================
// v11.31.50b Redeem Claims Supabase Migration / JSON Normalized Audit
// IMPORTANT:
// - RedeemCodes_SCHEMA / RedeemCodeRewards_SCHEMA remain Google Sheet planning config.
// - RedeemCodeClaims_SCHEMA remains Primary in this version.
// - This section ONLY migrates/audits historical claims. It does NOT change redeem/claim runtime.
// ============================================================
const REDEEM_CLAIMS_SB_TABLE_ = 'RedeemCodeClaims';
function redeemClaimsSbHeaders_() {
  const cfg = supabaseConfig_();
  return {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key
  };
}
function redeemClaimSheetToSb_(r) {
  let result = [];
  try {
    const v = JSON.parse(String(r.ResultJSON || '[]'));
    result = Array.isArray(v) ? v : [];
  } catch (_e) {
    result = [];
  }
  return {
    claim_id: String(r.ClaimID || '').trim(),
    code: normalizeRedeemCode_(r.Code),
    account_id: String(r.AccountID || '').trim(),
    nickname: String(r.Nickname || ''),
    claimed_at: String(r.ClaimedAt || '').trim() || new Date(0).toISOString(),
    result_json: result
  };
}

// v11.31.50b: ResultJSON semantic normalizer.
// Handles JSONB key reordering plus legacy nested JSON strings before comparison.

// ============================================================
// v11.31.51 Redeem Claims Safe Shadow Write
// - RedeemCodeClaims_SCHEMA remains runtime Primary.
// - Every NEW/REPAIRED Sheet claim is mirrored to Supabase after the Sheet write.
// - Shadow failure is log-only and MUST NOT turn a successful reward claim into a failure.
// ============================================================

// ============================================================
// v11.31.52 Redeem Claims Supabase Primary + Safe Sheet Mirror
// - RedeemCodes_SCHEMA / RedeemCodeRewards_SCHEMA stay Google Sheet planning config.
// - RedeemCodeClaims Supabase is authoritative runtime Primary.
// - RedeemCodeClaims_SCHEMA is temporary backup mirror only.
// - PlayerSave serverReceipts.redeem remains the final anti-duplicate transaction guard.
// ============================================================
async function redeemClaimsSbFindByAccountCode_(accountId, code) {
  const cfg = supabaseConfig_();
  const url = cfg.url + '/rest/v1/' + REDEEM_CLAIMS_SB_TABLE_ + '?select=*&account_id=eq.' + encodeURIComponent(String(accountId || '')) + '&code=eq.' + encodeURIComponent(normalizeRedeemCode_(code)) + '&limit=1';
  const res = await UrlFetchApp.fetch(url, {
    method: 'get',
    headers: redeemClaimsSbHeaders_(),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_REDEEM_CLAIMS_FIND_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {
    throw new Error('SUPABASE_REDEEM_CLAIMS_FIND_JSON_INVALID');
  }
  if (!Array.isArray(rows)) throw new Error('SUPABASE_REDEEM_CLAIMS_FIND_ROWS_INVALID');
  return rows.length ? rows[0] : null;
}
async function redeemClaimsSbInsertPrimary_(row) {
  if (!row || !row.claim_id || !row.code || !row.account_id) throw new Error('REDEEM_CLAIMS_PRIMARY_REQUIRED_FIELD_MISSING');
  const cfg = supabaseConfig_();
  const res = await UrlFetchApp.fetch(cfg.url + '/rest/v1/' + REDEEM_CLAIMS_SB_TABLE_, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Prefer: 'return=minimal'
    },
    payload: JSON.stringify(row),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_REDEEM_CLAIMS_PRIMARY_INSERT_HTTP_' + status + ': ' + text);
  return true;
}

// ============================================================
// v11.31.53 Redeem Claims Supabase Primary + Daily Snapshot Backup
// - Supabase RedeemCodeClaims is the sole Runtime Primary.
// - RedeemCodeClaims_SCHEMA is snapshot backup only; no per-claim Sheet mirror.
// - RedeemCodes_SCHEMA / RedeemCodeRewards_SCHEMA remain Google Sheet planning config.
// ============================================================

// ============================================================
// v11.31.54 Accounts Supabase Migration + Audit
// IMPORTANT:
// - Accounts_SCHEMA remains the runtime/auth Primary in this version.
// - register/login/nickname/disabled checks are NOT rerouted in this version.
// - PasswordHash and Salt are migrated byte-for-byte as stored (except the existing leading-apostrophe normalization used by auth/audit).
// - This section only performs precheck, historical migration, and audit.
// ============================================================
const ACCOUNTS_SB_TABLE_ = 'Accounts';
function accountsSbHeaders_() {
  const cfg = supabaseConfig_();
  return {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key
  };
}

// ============================================================
// v11.31.56 Accounts Supabase Auth Read Validation
// Google Sheet remains the auth/runtime source of truth.
// Supabase failures are LOG_ONLY and must never change a successful player action.
// ============================================================

// ============================================================
// v11.31.56 Accounts Supabase Auth / Read Validation
// IMPORTANT:
// - Google Sheet remains the ONLY auth decision source in this version.
// - Supabase is read in parallel only to prove username lookup, hash/salt,
//   Disabled, AccountID and Nickname compatibility.
// - Any Supabase mismatch/failure is LOG_ONLY and never changes login result.
// ============================================================
const ACCOUNTS_AUTH_VALIDATION_PROP_ = 'ACCOUNTS_AUTH_READ_VALIDATION_LAST';
async function accountsSbFindByUsername_(username) {
  const cfg = supabaseConfig_();
  const target = normalizeUsername_(username);
  const encoded = encodeURIComponent(target);
  const url = cfg.url + '/rest/v1/' + ACCOUNTS_SB_TABLE_ + '?select=*&username_normalized=eq.' + encoded + '&limit=2';
  const res = await UrlFetchApp.fetch(url, {
    method: 'get',
    headers: accountsSbHeaders_(),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_ACCOUNTS_AUTH_READ_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {
    throw new Error('SUPABASE_ACCOUNTS_AUTH_READ_JSON_INVALID');
  }
  if (!Array.isArray(rows)) throw new Error('SUPABASE_ACCOUNTS_AUTH_READ_ROWS_INVALID');
  if (rows.length > 1) throw new Error('SUPABASE_ACCOUNTS_AUTH_DUPLICATE_USERNAME:' + target);
  return rows.length ? rows[0] : null;
}
// ============================================================
// v11.31.57 Accounts Supabase Primary + Safe Sheet Mirror
// - Supabase Accounts is authoritative for register/login/nickname.
// - Accounts_SCHEMA is a TEMP backup mirror only.
// - Sheet mirror failures are LOG_ONLY.
// ============================================================
async function accountsSbFindByAccountId_(accountId) {
  const cfg = supabaseConfig_(),
    id = String(accountId || '').trim();
  const url = cfg.url + '/rest/v1/' + ACCOUNTS_SB_TABLE_ + '?select=*&account_id=eq.' + encodeURIComponent(id) + '&limit=2';
  const res = await UrlFetchApp.fetch(url, {
    method: 'get',
    headers: accountsSbHeaders_(),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_ACCOUNTS_BY_ID_HTTP_' + status + ': ' + text);
  let rows = [];
  try {
    rows = JSON.parse(text || '[]');
  } catch (_e) {
    throw new Error('SUPABASE_ACCOUNTS_BY_ID_JSON_INVALID');
  }
  if (!Array.isArray(rows)) throw new Error('SUPABASE_ACCOUNTS_BY_ID_ROWS_INVALID');
  if (rows.length > 1) throw new Error('SUPABASE_ACCOUNTS_DUPLICATE_ID:' + id);
  return rows.length ? rows[0] : null;
}
function accountsSbRowToLegacyAccount_(r) {
  if (!r) return null;
  return {
    AccountID: String(r.account_id || ''),
    UsernameNormalized: String(r.username_normalized || ''),
    PasswordHash: String(r.password_hash || ''),
    Salt: String(r.salt || ''),
    Nickname: String(r.nickname || ''),
    CreatedAt: r.created_at || '',
    LastLoginAt: r.last_login_at || '',
    SaveVersion: r.save_version || '',
    Disabled: r.disabled === true,
    RowRevision: Number(r.row_revision) || 1
  };
}
async function accountsSbPatchByAccountId_(accountId, patch) {
  const cfg = supabaseConfig_(),
    id = String(accountId || '').trim();
  const res = await UrlFetchApp.fetch(cfg.url + '/rest/v1/' + ACCOUNTS_SB_TABLE_ + '?account_id=eq.' + encodeURIComponent(id), {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Prefer: 'return=minimal'
    },
    payload: JSON.stringify(patch || {}),
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_ACCOUNTS_PATCH_HTTP_' + status + ': ' + text);
}
function accountsSheetMirrorFromSbRowSafe_() {}
// ============================================================
// v11.31.58 Accounts Supabase Primary + Daily Snapshot Backup
// - Supabase Accounts is the only runtime/auth Primary.
// - Accounts_SCHEMA is backup only; per-event runtime mirror is disabled.
// - Snapshot rewrites Accounts_SCHEMA from the authoritative Supabase table.
// ============================================================
const ACCOUNTS_SNAPSHOT_PROP_ = 'ACCOUNTS_LAST_SNAPSHOT_AT';
// ============================================================
// v11.31.59 WorldBossState Supabase Migration + Audit
// IMPORTANT:
// - WorldBossState_SCHEMA remains the live Runtime Primary in this version.
// - WorldBoss_SCHEMA remains Google Sheet config.
// - WorldBossAttempts / WorldBossRewards remain on their existing Supabase Primary paths.
// - This section ONLY migrates historical WorldBossState rows and audits parity.
// ============================================================
const WORLD_BOSS_STATE_SB_TABLE_ = 'WorldBossState';
function wbStateIso_(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getUTCFullYear();
    if (y >= 2000 && y <= 2100) return v.toISOString();
  }
  const s = String(v).trim();
  if (!s) return null;
  // Google Sheets serial date guard. Must run before new Date(s).
  if (/^\d{4,6}(?:\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (Number.isFinite(serial) && serial >= 36526 && serial <= 73050) {
      const d = new Date(Math.round((serial - 25569) * 86400000));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    if (y >= 2000 && y <= 2100) return d.toISOString();
  }
  throw new Error('WORLD_BOSS_STATE_INVALID_DATETIME:' + s);
}
function wbStateSheetToSb_(r) {
  return {
    boss_instance_id: String(r.BossInstanceID || '').trim(),
    boss_id: String(r.BossID || '').trim(),
    name: String(r.Name || ''),
    max_hp: Math.max(0, Math.trunc(Number(r.MaxHP) || 0)),
    current_hp: Math.max(0, Math.trunc(Number(r.CurrentHP) || 0)),
    def: Math.trunc(Number(r.DEF) || 0),
    patk: Math.trunc(Number(r.PATK) || 0),
    matk: Math.trunc(Number(r.MATK) || 0),
    spawned_at: wbStateIso_(r.SpawnedAt),
    dead_at: wbStateIso_(r.DeadAt),
    respawn_at: wbStateIso_(r.RespawnAt),
    status: String(r.Status || 'ALIVE').trim().toUpperCase(),
    revision: Math.max(1, Math.trunc(Number(r.Revision) || 1))
  };
}

// ============================================================
// v11.31.60 WorldBossState Safe Shadow Write
// Google Sheet remains Runtime Primary. Supabase is a LOG_ONLY shadow.
// Shadow failures MUST NOT change player-facing World Boss results.
// ============================================================

async function wbStateSbDeleteById_(bossInstanceId) {
  const id = String(bossInstanceId || '').trim();
  if (!id) return {
    ok: false,
    error: 'WORLD_BOSS_STATE_ID_MISSING'
  };
  const cfg = supabaseConfig_();
  const url = cfg.url + '/rest/v1/' + WORLD_BOSS_STATE_SB_TABLE_ + '?boss_instance_id=eq.' + encodeURIComponent(id);
  const res = await UrlFetchApp.fetch(url, {
    method: 'delete',
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Prefer: 'return=minimal'
    },
    muteHttpExceptions: true
  });
  const status = res.getResponseCode(),
    text = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('SUPABASE_WORLD_BOSS_STATE_DELETE_HTTP_' + status + ': ' + text);
  return {
    ok: true,
    bossInstanceId: id
  };
}

// ============================================================
// v11.31.61 WorldBossState Supabase Primary + Safe Sheet Mirror
// - WorldBossState runtime reads/writes are authoritative in Supabase.
// - WorldBossState_SCHEMA is TEMP SAFE MIRROR only.
// - Sheet mirror failures are LOG_ONLY and never roll back a successful Supabase runtime write.
// - WorldBoss_SCHEMA remains Google Sheet config.
// ============================================================

// ============================================================
// v11.31.62 WorldBossState Supabase Primary + Daily Snapshot
// - Supabase WorldBossState is the only live Runtime Primary.
// - WorldBossState_SCHEMA is SNAPSHOT_BACKUP_ONLY.
// - Runtime writes/deletes never mutate WorldBossState_SCHEMA.
// - WorldBoss_SCHEMA remains Google Sheet config.
// ============================================================
const WORLD_BOSS_STATE_SNAPSHOT_PROP_ = 'WORLD_BOSS_STATE_LAST_SNAPSHOT_AT';
// ============================================================
// v11.31.67 Runtime Sheet Dependency Cleanup status
// ============================================================

// ============================================================
// v11.31.68 Auction + WorldBoss Attempts/Rewards Daily Snapshot
// ============================================================
const AUCTION_WB_RUNTIME_SNAPSHOT_PROP_ = 'AUCTION_WB_RUNTIME_LAST_SNAPSHOT_AT';
// ============================================================
// v11.31.69 PlayerSaves Supabase Primary + Daily Snapshot
// ============================================================
const PLAYER_SAVES_SNAPSHOT_PROP_ = 'PLAYER_SAVES_LAST_SNAPSHOT_AT';

// ============================================================
// v11.31.70 Final Runtime Architecture Audit
// ============================================================

// ============================================================
// v11.31.92 Arena Phase 1
// Supabase Runtime Primary
// - 7-day seasons
// - Taiwan 00:00 daily boundary
// - defense snapshot required before matchmaking
// - daily five fixed opponents
// - NPC fills missing slots
// Battle / score settlement is intentionally NOT implemented in this phase.
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
function arenaConfig126_(){return arenaParseConfig126_(arenaPlanningRows_('ArenaConfig'));}
function arenaRankEligible126_(rank,seasonId){const cap=arenaConfig126_().RankingTopReward;return rank>0&&(String(seasonId)<'ARENA_20261012'||cap===0||rank<=cap);}
function arenaBattleConfig126_(battle){return battle?.result_summary?.arenaConfig126||{...ARENA_CONFIG_DEFAULT126_};}
function arenaDeltas126_(result,{isNpc=false,isRevenge=false,isRetry=false,npcId='',isElite=null,attackerPoints=0,defenderPoints=0}={},cfg=arenaConfig126_()){
 if(result==='DRAW')return {ad:0,dd:0};
 const win=result==='ATTACKER_WIN';
 if(isNpc){const npc=arenaNpcRows140_().find(r=>r.NpcID===npcId);return {ad:win?((isElite===null?String(npc?.Tier).toUpperCase()==='ELITE':isElite)?2:1):0,dd:0};}
 if(isRevenge&&!win)return {ad:0,dd:0};
 const gap=Number(defenderPoints)-Number(attackerPoints),gain=gap>=10?4:gap<=-10?1:2,loss=gap>=10?1:gap<=-10?4:2;
 const ad=win?gain:-loss;return {ad,dd:-ad};
}
function arenaLocalMidnight126_(ymd,tz){
 const [y,m,d]=ymd.split('-').map(Number),target=Date.UTC(y,m-1,d);let ms=target;
 for(let i=0;i<4;i++){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
  const local=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second),delta=target-local;
  if(!delta)return ms;ms+=delta;
 }throw Error('ARENA_TIMEZONE_MIDNIGHT_INVALID');
}

const ARENA_SEASON_ANCHOR_TW_ = '2026-09-28'; // Monday 00:00 Asia/Taipei; change here if season anchor changes.
const ARENA_SEASON_DAYS_ = 7;
const ARENA_START_POINTS_ = 10;
const ARENA_LEVEL_ = 250;
const ARENA_NPC_IDS_=["arena_guardian", "arena_assassin", "arena_controller", "arena_vampire", "arena_mage", "arena_balanced", "arena_bastion", "arena_executioner", "arena_plague", "arena_undying", "arena_archmage", "arena_spellblade"];
function arenaSbHeaders_(prefer) {
  const cfg = supabaseConfig_(),
    h = {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key
    };
  if (prefer) h.Prefer = prefer;
  return h;
}
async function arenaSbRequest_(method, table, query, payload, prefer) {
  const cfg = supabaseConfig_();
  const qs = String(query || '').replace(/^\?/, '');
  const url = cfg.url + '/rest/v1/' + table + (qs ? '?' + qs : '');
  const opt = {
    method: method,
    headers: arenaSbHeaders_(prefer),
    muteHttpExceptions: true
  };
  if (payload !== undefined) {
    opt.contentType = 'application/json';
    opt.payload = JSON.stringify(payload);
  }
  const res = await UrlFetchApp.fetch(url, opt),
    status = res.getResponseCode(),
    raw = res.getContentText();
  if (status < 200 || status >= 300) throw new Error('ARENA_SUPABASE_' + table + '_HTTP_' + status + ': ' + raw);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return raw;
  }
}
function arenaEq_(v) {
  return encodeURIComponent('eq.' + String(v));
}
function arenaTaipeiParts_(ms) {
  const d = new Date(ms == null ? Date.now() : ms);
  return {
    date: Utilities.formatDate(d, arenaConfig126_().DailyResetTimezone, 'yyyy-MM-dd'),
    stamp: Utilities.formatDate(d, arenaConfig126_().DailyResetTimezone, 'yyyy-MM-dd HH:mm:ss')
  };
}
function arenaTwDateMs_(ymd) {
  const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('ARENA_DATE_INVALID');
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), -8, 0, 0, 0);
}
function arenaSeasonInfo_(){
 const c=arenaConfig126_(),today=arenaTaipeiParts_().date,day=86400000,anchor=Date.parse(ARENA_SEASON_ANCHOR_TW_+'T00:00:00Z');
 const idx=Math.max(0,Math.floor((Date.parse(today+'T00:00:00Z')-anchor)/(c.SeasonDays*day)));
 const startKey=new Date(anchor+idx*c.SeasonDays*day).toISOString().slice(0,10),endLocal=new Date(anchor+(idx+1)*c.SeasonDays*day).toISOString().slice(0,10);
 const start=arenaLocalMidnight126_(startKey,c.DailyResetTimezone),end=arenaLocalMidnight126_(endLocal,c.DailyResetTimezone);
 return {seasonId:'ARENA_'+startKey.replace(/-/g,''),startAt:new Date(start).toISOString(),endAt:new Date(end).toISOString(),startDate:startKey,endDate:new Date(Date.parse(endLocal+'T00:00:00Z')-day).toISOString().slice(0,10),status:Date.now()>=start&&Date.now()<end?'ACTIVE':'UPCOMING',days:c.SeasonDays};
}

function arenaTodayKey_() {
  return arenaTaipeiParts_().date;
}
async function arenaAccountNickname_(accountId) {
  try {
    const a = await runtimeAccountById_(accountId);
    if (a && a.Nickname) return String(a.Nickname);
  } catch (_e) {}
  try {
    const r = await supabasePrimaryReadRow_(accountId);
    if (r && r.nickname) return String(r.nickname);
  } catch (_e) {}
  return '冒險者';
}
async function arenaPlayerRow_(seasonId, accountId) {
  const rows = await arenaSbRequest_('get', 'ArenaPlayers', 'season_id=' + arenaEq_(seasonId) + '&account_id=' + arenaEq_(accountId) + '&select=*');
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
async function arenaEnsurePlayer_(season, accountId, nickname) {
  let row = await arenaPlayerRow_(season.seasonId, accountId);
  if (row) return row;
  const payload = {
    season_id: season.seasonId,
    account_id: accountId,
    nickname: String(nickname || '冒險者'),
    points: arenaConfig126_().StartPoints,
    wins: 0,
    losses: 0,
    draws: 0,
    total_damage: 0,
    reached_points_at: new Date().toISOString(),
    joined_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const out = await arenaSbRequest_('post', 'ArenaPlayers', '', payload, 'resolution=ignore-duplicates,return=representation');
  row = Array.isArray(out) && out.length ? out[0] : await arenaPlayerRow_(season.seasonId, accountId);
  if (!row) throw new Error('ARENA_PLAYER_CREATE_FAILED');
  return row;
}
async function arenaCurrentDefense_(seasonId, accountId) {
  const rows = await arenaSbRequest_('get', 'ArenaDefenseSnapshots', 'season_id=' + arenaEq_(seasonId) + '&account_id=' + arenaEq_(accountId) + '&is_current=eq.true&select=*&limit=1');
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
async function arenaDefenseSnapshotById_(seasonId, accountId, snapshotId) {
  if (!snapshotId) return null;
  const rows = await arenaSbRequest_('get', 'ArenaDefenseSnapshots', 'snapshot_id=' + arenaEq_(snapshotId) + '&season_id=' + arenaEq_(seasonId) + '&account_id=' + arenaEq_(accountId) + '&select=*&limit=1');
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
function arenaStableJson_(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(arenaStableJson_).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + arenaStableJson_(v[k])).join(',') + '}';
}
async function arenaHash_(obj) {
  const bytes = await Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, arenaStableJson_(obj), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}
function arenaValidateDefenseSnapshot_(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('ARENA_DEFENSE_INVALID');
  const s = JSON.parse(JSON.stringify(raw));
  s.arenaLevel = arenaConfig126_().ArenaLevel;
  if (!s.stats || typeof s.stats !== 'object' || Array.isArray(s.stats)) throw new Error('ARENA_DEFENSE_STATS_REQUIRED');
  if (!s.equipment || typeof s.equipment !== 'object' || Array.isArray(s.equipment)) throw new Error('ARENA_DEFENSE_EQUIPMENT_REQUIRED');
  if (!s.gems || typeof s.gems !== 'object' || Array.isArray(s.gems)) throw new Error('ARENA_DEFENSE_GEMS_REQUIRED');
  if (!Array.isArray(s.skills)) throw new Error('ARENA_DEFENSE_SKILLS_REQUIRED');
  if (!Array.isArray(s.ai)) throw new Error('ARENA_DEFENSE_AI_REQUIRED');
  if (s.skills.length > 3) throw new Error('ARENA_DEFENSE_SKILLS_MAX_3');
  const allowed = new Set(['ALWAYS', 'SELF_HP_LE_75', 'SELF_HP_LE_50', 'SELF_HP_LE_25', 'ENEMY_HP_LE_50', 'ENEMY_HP_LE_25', 'SELF_HAS_STATUS', 'ENEMY_NO_STATUS', 'SELF_NO_BUFF', 'ENEMY_NO_DEBUFF']);
  const seen = new Set();
  s.ai = s.ai.map((x, i) => {
    if (!x || typeof x !== 'object') throw new Error('ARENA_DEFENSE_AI_INVALID');
    const priority = Math.trunc(Number(x.priority) || i + 1),
      skill = String(x.skill || ''),
      condition = String(x.condition || 'ALWAYS');
    if (priority < 1 || priority > 3 || seen.has(priority)) throw new Error('ARENA_DEFENSE_AI_PRIORITY_INVALID');
    if (skill && !s.skills.map(String).includes(skill)) throw new Error('ARENA_DEFENSE_AI_SKILL_INVALID');
    if (!allowed.has(condition)) throw new Error('ARENA_DEFENSE_AI_CONDITION_INVALID');
    seen.add(priority);
    return {
      skill: skill,
      priority: priority,
      condition: condition
    };
  }).sort((a, b) => a.priority - b.priority);
  return s;
}
async function arenaUploadDefense_(body) {
  const auth = requireAuth_(body.sessionToken),
    season = arenaSeasonInfo_();
  if (season.status !== 'ACTIVE') return {
    ok: false,
    error: 'ARENA_SEASON_NOT_ACTIVE',
    season: season
  };
  const nickname = await arenaAccountNickname_(auth.accountId),
    player = await arenaEnsurePlayer_(season, auth.accountId, nickname);
  const snapshot = arenaValidateDefenseSnapshot_(body.snapshot),
    hash = await arenaHash_(snapshot),
    now = new Date().toISOString();
  const old = await arenaCurrentDefense_(season.seasonId, auth.accountId);
  if (old && String(old.snapshot_hash || '') === hash) {
    return {
      ok: true,
      unchanged: true,
      season: season,
      player: player,
      snapshotId: String(old.snapshot_id),
      snapshotHash: hash
    };
  }
  if (old) {
    await arenaSbRequest_('patch', 'ArenaDefenseSnapshots', 'snapshot_id=' + arenaEq_(old.snapshot_id), {
      is_current: false
    }, 'return=minimal');
  }
  const rows = await arenaSbRequest_('post', 'ArenaDefenseSnapshots', '', {
    season_id: season.seasonId,
    account_id: auth.accountId,
    nickname: nickname,
    arena_level: arenaConfig126_().ArenaLevel,
    snapshot_json: snapshot,
    snapshot_hash: hash,
    is_current: true,
    created_at: now
  }, 'return=representation');
  const created = Array.isArray(rows) && rows.length ? rows[0] : await arenaCurrentDefense_(season.seasonId, auth.accountId);
  if (!created) throw new Error('ARENA_DEFENSE_CREATE_FAILED');
  await arenaSbRequest_('patch', 'ArenaPlayers', 'season_id=' + arenaEq_(season.seasonId) + '&account_id=' + arenaEq_(auth.accountId), {
    nickname: nickname,
    defense_snapshot_id: created.snapshot_id,
    updated_at: now
  }, 'return=minimal');
  return {
    ok: true,
    season: season,
    snapshotId: String(created.snapshot_id),
    snapshotHash: hash
  };
}
function arenaPreviousSeasonInfo_(){
 const c=arenaConfig126_(),cur=arenaSeasonInfo_(),startKey=new Date(Date.parse(cur.startDate+'T00:00:00Z')-c.SeasonDays*86400000).toISOString().slice(0,10);
 return {seasonId:'ARENA_'+startKey.replace(/-/g,''),startAt:new Date(arenaLocalMidnight126_(startKey,c.DailyResetTimezone)).toISOString(),endAt:cur.startAt,startDate:startKey,endDate:new Date(Date.parse(cur.startDate+'T00:00:00Z')-86400000).toISOString().slice(0,10),status:'ENDED'};
}

function arenaLegacyRewardBundle57_(rank) {
  rank = Math.max(1, Math.trunc(Number(rank) || 0));
  if (rank === 1) return {
    armorId: 'gloryArmor1',
    gemId: 'gloryGem',
    gold: 5000
  };
  if (rank === 2) return {
    armorId: 'gloryArmor1',
    gemId: 'gloryGem',
    gold: 3000
  };
  if (rank === 3) return {
    armorId: 'gloryArmor1',
    gemId: 'gloryGem',
    gold: 2000
  };
  if (rank <= 10) return {
    armorId: 'gloryArmor0',
    gemId: '',
    gold: 1000
  };
  return {
    armorId: '',
    gemId: '',
    gold: 500
  };
}

const ARENA_HAMMER_START_SEASON57_ = 'ARENA_20261005';
function arenaDefaultRewardRows57_(){
 return [[1,1,10],[2,2,7],[3,3,5],[4,10,3],[11,999999,1]].map(([RankMin,RankMax,ConsumableQuantity])=>({RankMin,RankMax,EquipmentID:'',GemID:'',Gold:0,ConsumableID:'legendaryHammer',ConsumableQuantity,SeasonID:''}));
}
function arenaRewardTiers57_(seasonId){
 const sid=String(seasonId||arenaSeasonInfo_().seasonId);
 const source=EDGE_PLANNING?.data?.ArenaRewards;
 const rows=(Array.isArray(source)?source:[]).filter(r=>!('Enabled' in r)||toBool_(r.Enabled));
 const exact=rows.filter(r=>String(r.SeasonID||'').trim()===sid);
 // Earlier unclaimed seasons retain their original gear/gem/gold rewards.
 if(!exact.length&&sid<ARENA_HAMMER_START_SEASON57_){
  return [[1,1],[2,2],[3,3],[4,10],[11,999999]].map(([RankMin,RankMax])=>{const r=arenaLegacyRewardBundle57_(RankMin);return {RankMin,RankMax,EquipmentID:r.armorId,GemID:r.gemId,Gold:r.gold,ConsumableID:'',ConsumableQuantity:0,SeasonID:sid};});
 }
 const selected=exact.length?exact:rows.filter(r=>!String(r.SeasonID||'').trim());
 const current=selected.length?selected:arenaDefaultRewardRows57_();
 const integer=(v,fallback,max)=>{const n=Number(v==null||v===''?fallback:v);if(!Number.isSafeInteger(n)||n<0||n>max)throw Error('ARENA_REWARD_CONFIG_INVALID');return n;};
 const cap126=arenaConfig126_().RankingTopReward;
 const bounded126=sid>='ARENA_20261012'&&cap126>0?current.filter(r=>Number(r.RankMin)<=cap126).map(r=>({...r,RankMax:Math.min(Number(r.RankMax),cap126)})):current;
 const normalized=bounded126.map(r=>({RankMin:integer(r.RankMin,0,999999),RankMax:integer(r.RankMax,0,999999),EquipmentID:String(r.EquipmentID||'').trim(),GemID:String(r.GemID||'').trim(),Gold:integer(r.Gold,0,999999999),ConsumableID:String(r.ConsumableID||'').trim(),ConsumableQuantity:integer(r.ConsumableQuantity,r.ConsumableID?1:0,999999),SeasonID:String(r.SeasonID||'').trim()})).sort((a,b)=>a.RankMin-b.RankMin);
 for(let i=0;i<normalized.length;i++){const r=normalized[i];if(r.RankMin<1||r.RankMax<r.RankMin||(i&&r.RankMin<=normalized[i-1].RankMax))throw Error('ARENA_REWARD_RANK_RANGE_INVALID');}
 return normalized;
}
function arenaRewardBundleForRank_(rank,seasonId){
 const n=Number(rank);if(!Number.isSafeInteger(n)||n<1)throw Error('ARENA_REWARD_RANK_INVALID');
 const r=arenaRewardTiers57_(seasonId).find(r=>n>=r.RankMin&&n<=r.RankMax);
 return {armorId:r?.EquipmentID||'',gemId:r?.GemID||'',gold:r?.Gold||0,consumableId:r?.ConsumableID||'',consumableQuantity:r?.ConsumableQuantity||0};
}

async function arenaFinalRank_(seasonId, accountId) {
  const rows = await arenaSbRequest_('get', 'ArenaPlayers', 'season_id=' + arenaEq_(seasonId) + '&select=account_id,nickname,points,wins,losses,draws,total_damage,reached_points_at&order=points.desc,wins.desc,total_damage.desc,reached_points_at.asc');
  const i = (Array.isArray(rows) ? rows : []).findIndex(r => String(r.account_id) === String(accountId));
  return i >= 0 ? i + 1 : 0;
}
async function arenaPendingReward_(accountId, save) {
  const prev = arenaPreviousSeasonInfo_(),
    rank = await arenaFinalRank_(prev.seasonId, accountId);
  if (!arenaRankEligible126_(rank,prev.seasonId)) return null;
  const receiptKey = prev.seasonId;
  if (hasServerReceipt_(save || {}, 'arena', receiptKey)) return null;
  return {
    seasonId: prev.seasonId,
    rank: rank,
    ...arenaRewardBundleForRank_(rank, prev.seasonId)
  };
}
function arenaFallbackEquipment_(id) {
  const sockets = id === 'gloryArmor1' ? 1 : 0;
  return {
    id: 'ITM_' + Utilities.getUuid().replace(/-/g, ''),
    template: id,
    name: '榮耀鎧甲',
    rarity: '傳說',
    slot: 'armor',
    price: 0,
    stats: {
      hp: 150,
      def: 50,
      patk: 5,
      matk: 5
    },
    sockets: sockets,
    enhance: 0,
    gems: Array(sockets).fill(null),
    effect: 'afterhit_block_10_once_per_turn'
  };
}
function arenaFallbackGem_() {
  return {
    id: 'GEM_' + Utilities.getUuid().replace(/-/g, ''),
    template: 'gloryGem',
    name: '榮耀寶石',
    price: 1000,
    stats: {
      hp: 150,
      patk: 3,
      matk: 3,
      crit: 3,
      critDamage: 3
    },
    boss: false,
    effect: 'fullhp_critdamage_10',
    visualColor: 'gold'
  };
}
async function arenaClaimReward_(body) {
  const auth = requireAuth_(body.sessionToken),
    lock = LockService.getScriptLock();
  await lock.waitLock(30000);
  try {
    const saveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId);
    if (!saveRec) return {
      ok: false,
      error: 'SAVE_NOT_FOUND'
    };
    let save = await parseSaveRecord_(saveRec);
    const prev = arenaPreviousSeasonInfo_(),
      requested = String(body.seasonId || prev.seasonId);
    if (requested !== prev.seasonId) return {
      ok: false,
      error: 'ARENA_REWARD_SEASON_INVALID'
    };
    // v11.38.105: a committed receipt is a read-only success, even when the
    // client still has the pre-claim revision. Never grant the bundle twice.
    if (hasServerReceipt_(save, 'arena', prev.seasonId)) return {
      ok: true,
      accountId: auth.accountId,
      seasonId: prev.seasonId,
      duplicate: true,
      rewardText: '此賽季獎勵已領取',
      revision: Number(saveRec.Revision),
      save
    };
    requireTransactionSaveRevision_(body, saveRec);
    const rank = await arenaFinalRank_(prev.seasonId, auth.accountId);
    if (!arenaRankEligible126_(rank,prev.seasonId)) return {
      ok: false,
      error: 'ARENA_REWARD_NOT_ELIGIBLE',
      message: '不在本季排名獎勵領取範圍內。'
    };
    const rw = arenaRewardBundleForRank_(rank, prev.seasonId),
      texts = [];
    save.inventory = Array.isArray(save.inventory) ? save.inventory : [];
    save.gems = Array.isArray(save.gems) ? save.gems : [];
    if(rw.armorId){
      const row=await equipmentRowById_(rw.armorId);
      if(!row&&!['gloryArmor0','gloryArmor1'].includes(rw.armorId))throw Error('ARENA_EQUIPMENT_NOT_FOUND');
      const item=row?makeEquipmentInstanceFromRow_(row):arenaFallbackEquipment_(rw.armorId);
      save.inventory.push(item);texts.push(`${item.name} ×1`);
    }
    if(rw.gemId){
      const row=await gemRowById_(rw.gemId);
      if(!row&&rw.gemId!=='gloryGem')throw Error('ARENA_GEM_NOT_FOUND');
      const gem=row?makeGemInstanceFromRow_(row):arenaFallbackGem_();
      save.gems.push(gem);texts.push(`${gem.name} ×1`);
    }
    if(rw.consumableId&&rw.consumableQuantity>0){
      const result=await applyRedeemReward_(save,{ContentType:'CONSUMABLE',ContentID:rw.consumableId,Quantity:rw.consumableQuantity});
      if(!result?.ok)throw Error(result?.error||'ARENA_REWARD_GRANT_FAILED');
      texts.push(`${result.name} ×${result.quantity}`);
    }
    if(rw.gold>0){save.gold=(Number(save.gold)||0)+rw.gold;texts.push(`金幣 ×${rw.gold}`);}
    addServerReceipt_(save, 'arena', prev.seasonId);
    const revision = (Number(saveRec.Revision) || 1) + 1;
    await writeFullSave_(auth.accountId, revision, save);
    const verified = await verifyReceiptAfterWrite_(auth.accountId, 'arena', prev.seasonId);
    return {
      ok: true,
      accountId: auth.accountId,
      seasonId: prev.seasonId,
      duplicate: false,
      rank: rank,
      rewardText: texts.join('、'),
      revision: Number(verified.rec.Revision) || revision,
      save: verified.save
    };
  } finally {
    await lock.releaseLock();
  }
}
async function arenaAvatarRows325_(ids){
 const values=[...new Set(ids.filter(Boolean).map(String))];
 const avatars=new Map();
 for(let i=0;i<values.length;i+=100){
  const filter='('+values.slice(i,i+100).map(id=>JSON.stringify(id)).join(',')+')';
  const rows=await arenaSbRequest_('get','game_player_profiles325','account_id=in.'+encodeURIComponent(filter)+'&select=account_id,avatar_id');
  for(const row of Array.isArray(rows)?rows:[]){const n=Number(row.avatar_id);if(Number.isInteger(n)&&n>=1&&n<=12)avatars.set(String(row.account_id),n);}
 }
 return avatars;
}

async function arenaStatus_(body) {
  const auth = requireAuth_(body.sessionToken),
    season = arenaSeasonInfo_(),
    nickname = await arenaAccountNickname_(auth.accountId);
  const player = await arenaEnsurePlayer_(season, auth.accountId, nickname),
    defense = await arenaCurrentDefense_(season.seasonId, auth.accountId);
  const saveRec = await findRowByValue_(DB.SAVES, 'AccountID', auth.accountId),
    save = saveRec ? await parseSaveRecord_(saveRec) : {};
  const avatars325=await arenaAvatarRows325_([auth.accountId]);
  return {
    ok: true,
    capabilities:{avatarProfile:true},
    season: season,
    todayKey: arenaTodayKey_(),
    arenaLevel: arenaConfig126_().ArenaLevel,
    arenaConfig: arenaConfig126_(),
    canChallenge: !!defense,
    needsDefense: !defense,
    pendingReward: await arenaPendingReward_(auth.accountId, save),
    rewardTiers: arenaRewardTiers57_(season.seasonId),
    player: {
      avatarId: avatars325.get(String(auth.accountId))||1,
      points: Number(player.points) || 0,
      wins: Number(player.wins) || 0,
      losses: Number(player.losses) || 0,
      draws: Number(player.draws) || 0,
      totalDamage: Number(player.total_damage) || 0
    },
    defense: defense ? {
      snapshotId: String(defense.snapshot_id),
      snapshotHash: String(defense.snapshot_hash),
      uploadedAt: String(defense.created_at || ''),
      snapshot: defense.snapshot_json || null
    } : null
  };
}
async function arenaRanking_(body) {
  const auth = requireAuth_(body.sessionToken),
    season = arenaSeasonInfo_(),
    limit = Math.max(10, Math.min(100, Number(body.limit) || 100));
  const rows = await arenaSbRequest_('get', 'ArenaPlayers', 'season_id=' + arenaEq_(season.seasonId) + '&select=account_id,nickname,points,wins,losses,draws,total_damage,reached_points_at&order=points.desc,wins.desc,total_damage.desc,reached_points_at.asc&limit=' + limit);
  const avatars325=await arenaAvatarRows325_([auth.accountId,...(Array.isArray(rows)?rows:[]).map(r=>r.account_id)]);
  const all = Array.isArray(rows) ? rows : [],
    ranked = all.map((r, i) => ({
      avatarId:avatars325.get(String(r.account_id))||1,
      rank: i + 1,
      nickname: String(r.nickname || '冒險者'),
      points: Number(r.points) || 0,
      wins: Number(r.wins) || 0,
      losses: Number(r.losses) || 0,
      draws: Number(r.draws) || 0,
      totalDamage: Number(r.total_damage) || 0,
      isSelf: String(r.account_id) === String(auth.accountId)
    }));
  let mine = ranked.find(r => r.isSelf) || null;
  if (!mine) {
    const own = await arenaSbRequest_('get', 'ArenaPlayers', 'season_id=' + arenaEq_(season.seasonId) + '&account_id=' + arenaEq_(auth.accountId) + '&select=account_id,nickname,points,wins,losses,draws,total_damage,reached_points_at&limit=1');
    if (Array.isArray(own) && own.length) {
      const me = own[0],
        better = await arenaSbRequest_('get', 'ArenaPlayers', 'season_id=' + arenaEq_(season.seasonId) + '&points=gt.' + (Number(me.points) || 0) + '&select=account_id');
      mine = {
        avatarId:avatars325.get(String(auth.accountId))||1,
        rank: (Array.isArray(better) ? better.length : 0) + 1,
        nickname: String(me.nickname || '冒險者'),
        points: Number(me.points) || 0,
        wins: Number(me.wins) || 0,
        losses: Number(me.losses) || 0,
        draws: Number(me.draws) || 0,
        totalDamage: Number(me.total_damage) || 0,
        isSelf: true
      };
    }
  }
  return {
    ok: true,
    season: season,
    rows: ranked,
    myRank: mine
  };
}
async function arenaCandidateRows_(seasonId, selfId) {
  const rows = await arenaSbRequest_('get', 'ArenaPlayers', 'season_id=' + arenaEq_(seasonId) + '&select=account_id,nickname,points,defense_snapshot_id');
  return (Array.isArray(rows) ? rows : []).filter(r => String(r.account_id) !== String(selfId) && r.defense_snapshot_id);
}
function arenaPickCandidate_(pool, used, min, max) {
  const eligible = pool.filter(r => !used.has(String(r.account_id)) && Number(r.points) >= min && Number(r.points) <= max);
  if (!eligible.length) return null;
  const i = Math.floor(Math.random() * eligible.length);
  return eligible[i];
}
function arenaPickWithWiden_(pool, used, p, min, max) {
  let x = arenaPickCandidate_(pool, used, Math.max(0, min), Math.max(0, max));
  if (x) return x;
  x = arenaPickCandidate_(pool, used, Math.max(0, p - 5), p + 5);
  if (x) return x;
  x = arenaPickCandidate_(pool, used, Math.max(0, p - 10), p + 10);
  if (x) return x;
  const rest = pool.filter(r => !used.has(String(r.account_id)));
  return rest.length ? rest[Math.floor(Math.random() * rest.length)] : null;
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

async function arenaExistingMatches_(seasonId, dateKey, accountId) {
  const rows = await arenaSbRequest_('get', 'ArenaDailyMatches', 'season_id=' + arenaEq_(seasonId) + '&daily_key=' + arenaEq_(dateKey) + '&account_id=' + arenaEq_(accountId) + '&select=*&order=slot_no.asc');
  return Array.isArray(rows) ? rows : [];
}
async function arenaPointRows179_(season,ids){
 const values=[...new Set(ids.filter(Boolean).map(String))];if(!values.length)return [];
 const filter='('+values.map(id=>JSON.stringify(id)).join(',')+')';
 const rows=await arenaSbRequest_('get','ArenaPlayers','season_id='+arenaEq_(season)+'&account_id=in.'+encodeURIComponent(filter)+'&select=account_id,points');return Array.isArray(rows)?rows:[];
}
async function arenaPublicMatches_(rows,selfPoints=0){
 if(!rows.length)return [];
 const npcOrder179=new Map(arenaNpcRows140_().map((r,i)=>[r.NpcID,i]));rows=[...rows].sort((a,b)=>Number(a.opponent_type!=='NPC')-Number(b.opponent_type!=='NPC')||(a.opponent_type==='NPC'?(npcOrder179.get(a.opponent_npc_id)??999)-(npcOrder179.get(b.opponent_npc_id)??999):Number(a.slot_no)-Number(b.slot_no)));
 const season=rows[0].season_id,players=await arenaPointRows179_(season,rows.map(r=>r.opponent_account_id));
 const avatars325=await arenaAvatarRows325_(rows.filter(r=>r.opponent_type!=='NPC').map(r=>r.opponent_account_id));
 const points=new Map((Array.isArray(players)?players:[]).map(p=>[String(p.account_id),Number(p.points)||0]));
 const battles=await arenaSbRequest_('get','ArenaBattles','attacker_account_id='+arenaEq_(rows[0].account_id)+'&season_id='+arenaEq_(season)+'&started_at=gte.'+encodeURIComponent(rows[0].daily_key+'T00:00:00+08:00')+'&select=daily_match_id,status');
 return rows.map((r,index)=>{
  const p=points.get(String(r.opponent_account_id))??(Number(r.opponent_points_at_match)||0);
  const opts={isNpc:r.opponent_type==='NPC',npcId:r.opponent_npc_id,attackerPoints:selfPoints,defenderPoints:p};
  return {avatarId:r.opponent_type==='NPC'?null:(avatars325.get(String(r.opponent_account_id))||1),matchId:String(r.match_id),slot:index+1,type:r.opponent_type,npcId:r.opponent_npc_id,nickname:r.opponent_nickname,points:p,challenged:r.challenged===true,attempts:(Array.isArray(battles)?battles:[]).filter(b=>String(b.daily_match_id)===String(r.match_id)&&b.status==='SETTLED').length,battleId:r.battle_id||'',winDelta:arenaDeltas126_('ATTACKER_WIN',opts).ad,loseDelta:arenaDeltas126_('DEFENDER_WIN',opts).ad};
 });
}

async function arenaGetDailyMatches_(body) {
  const auth = requireAuth_(body.sessionToken),
    season = arenaSeasonInfo_(),
    today = arenaTodayKey_(),
    nickname = await arenaAccountNickname_(auth.accountId);
  const player = await arenaEnsurePlayer_(season, auth.accountId, nickname),
    defense = await arenaCurrentDefense_(season.seasonId, auth.accountId);
  if (!defense) return {
    ok: false,
    error: 'ARENA_DEFENSE_REQUIRED',
    needsDefense: true,
    season: season,
    todayKey: today,
    matches: []
  };
  let rows = await arenaExistingMatches_(season.seasonId, today, auth.accountId);
  const p=Math.max(0,Number(player.points)||0),pool=await arenaCandidateRows_(season.seasonId,auth.accountId),npcs=arenaNpcRows140_();
  const used=new Set(rows.filter(r=>r.opponent_type==='PLAYER').map(r=>String(r.opponent_account_id))),payload=[];
  const base={season_id:season.seasonId,daily_key:today,account_id:auth.accountId,challenged:false,created_at:new Date().toISOString()};
  let missing=5-used.size,slot=501;
  while(missing>0){while(rows.some(r=>Number(r.slot_no)===slot))slot++;const c=arenaPickWithWiden_(pool,used,p,p-10,p+10);if(!c)break;used.add(String(c.account_id));payload.push({...base,slot_no:slot++,opponent_type:'PLAYER',opponent_account_id:String(c.account_id),opponent_npc_id:null,opponent_nickname:String(c.nickname||'冒險者'),opponent_points_at_match:Number(c.points)||0,opponent_snapshot_id:c.defense_snapshot_id});missing--;}
  let npcSlot179=1001;for(let i=0;i<npcs.length;i++){const n=npcs[i];if(rows.some(r=>r.opponent_type==='NPC'&&r.opponent_npc_id===n.NpcID))continue;while(rows.some(r=>Number(r.slot_no)===npcSlot179)||payload.some(r=>r.slot_no===npcSlot179))npcSlot179++;payload.push({...base,slot_no:npcSlot179++,opponent_type:'NPC',opponent_account_id:null,opponent_npc_id:n.NpcID,opponent_nickname:String(n.Name||n.NpcID),opponent_points_at_match:p,opponent_snapshot_id:null});}
  if(payload.length)await arenaSbRequest_('post','ArenaDailyMatches','',payload,'resolution=ignore-duplicates,return=minimal');
  rows=await arenaExistingMatches_(season.seasonId,today,auth.accountId);
  const seenNpc=new Set();rows=rows.filter(r=>r.opponent_type==='PLAYER'||npcs.some(n=>n.NpcID===r.opponent_npc_id)&&!seenNpc.has(r.opponent_npc_id)&&seenNpc.add(r.opponent_npc_id));
  return {ok:true,season,todayKey:today,points:p,matches:await arenaPublicMatches_(rows,p)};
}

// ============================================================
// v11.31.93 Arena Phase 2 - Battle Session / Settlement
// ============================================================
async function arenaOne_(table, query) {
  const r = await arenaSbRequest_('get', table, query);
  return Array.isArray(r) && r.length ? r[0] : null;
}
async function arenaPatch_(table, query, payload) {
  return await arenaSbRequest_('patch', table, query, payload, 'return=representation');
}
async function arenaBattleRow_(battleId) {
  return await arenaOne_('ArenaBattles', 'battle_id=' + arenaEq_(battleId) + '&select=*');
}
function arenaBuildAttackSnapshot_(accountId, body) {
  // Client chooses one of the player's existing 3 configs. Server also keeps raw selection
  // for later stronger validation. No new Arena inventory/loadout is created.
  const idx = Math.max(0, Math.min(2, Math.trunc(Number(body.configIndex) || 0)));
  const supplied = body.attackSnapshot;
  if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) throw new Error('ARENA_ATTACK_SNAPSHOT_REQUIRED');
  const s = JSON.parse(JSON.stringify(supplied));
  s.arenaLevel = arenaConfig126_().ArenaLevel;
  s.configIndex = idx;
  if (!s.stats || typeof s.stats !== 'object') throw new Error('ARENA_ATTACK_STATS_REQUIRED');
  if (!s.equipment || typeof s.equipment !== 'object') throw new Error('ARENA_ATTACK_EQUIPMENT_REQUIRED');
  if (!s.gems || typeof s.gems !== 'object') throw new Error('ARENA_ATTACK_GEMS_REQUIRED');
  if (!Array.isArray(s.skills)) throw new Error('ARENA_ATTACK_SKILLS_REQUIRED');
  if (s.skills.length > 3) throw new Error('ARENA_ATTACK_SKILLS_MAX_3');
  return s;
}
function arenaNpcSnapshot_(npcId, points) {
  // Phase 2 fallback NPC battle snapshot. Equipment/skills are intentionally data-light here.
  // Formal builds will be replaced by ArenaNPC planning rows in the next phase.
  const p = Math.max(0, Number(points) || 0),
    scale = 1 + Math.min(2, p / 50);
  const archetype = String(npcId || 'arena_balanced');
  const base = {
    arenaLevel: arenaConfig126_().ArenaLevel,
    npcId: archetype,
    stats: {
      hp: Math.round(2200 * scale),
      patk: Math.round(260 * scale),
      matk: Math.round(220 * scale),
      def: Math.round(650 * scale),
      crit: 25,
      critDamage: 100
    },
    equipment: {},
    gems: {},
    skills: [],
    ai: []
  };
  if (archetype === 'arena_guardian') {
    base.stats.hp = Math.round(3000 * scale);
    base.stats.def = Math.round(1000 * scale);
    base.stats.patk = Math.round(190 * scale);
  }
  if (archetype === 'arena_assassin') {
    base.stats.hp = Math.round(1800 * scale);
    base.stats.patk = Math.round(380 * scale);
    base.stats.crit = 55;
    base.stats.critDamage = 160;
  }
  if (archetype === 'arena_controller') {
    base.stats.matk = Math.round(330 * scale);
    base.stats.def = Math.round(550 * scale);
  }
  if (archetype === 'arena_vampire') {
    base.stats.hp = Math.round(2600 * scale);
    base.stats.patk = Math.round(300 * scale);
  }
  if (archetype === 'arena_mage') {
    base.stats.matk = Math.round(410 * scale);
    base.stats.def = Math.round(450 * scale);
  }
  return base;
}
async function arenaStartBattle_(body) {
  const auth = requireAuth_(body.sessionToken),
    season = arenaSeasonInfo_(),
    today = arenaTodayKey_();
  if (season.status !== 'ACTIVE') return {
    ok: false,
    error: 'ARENA_SEASON_NOT_ACTIVE'
  };
  const defense = await arenaCurrentDefense_(season.seasonId, auth.accountId);
  if (!defense) return {
    ok: false,
    error: 'ARENA_DEFENSE_REQUIRED',
    needsDefense: true
  };
  const matchId = String(body.matchId || ''),
    revengeId = String(body.revengeId || ''),
    testMode = body.testMode === true;
  if (!matchId && !revengeId) return {
    ok: false,
    error: 'ARENA_BATTLE_SOURCE_REQUIRED'
  };
  if (testMode && revengeId) return {
    ok: false,
    error: 'ARENA_TEST_MODE_DAILY_ONLY'
  };
  let type = 'DAILY',
    defType = '',
    defAccount = null,
    defNpc = null,
    defName = '',
    defSnap = null,
    defenderSnapshotId = '',
    daily = null,
    revenge = null;
  if (matchId) {
    daily = await arenaOne_('ArenaDailyMatches', 'match_id=' + arenaEq_(matchId) + '&season_id=' + arenaEq_(season.seasonId) + '&daily_key=' + arenaEq_(today) + '&account_id=' + arenaEq_(auth.accountId) + '&select=*');
    if (!daily) return {
      ok: false,
      error: 'ARENA_MATCH_NOT_FOUND'
    };
    if (body.expectedOpponentNickname && String(body.expectedOpponentNickname) !== String(daily.opponent_nickname || '')) return {
      ok: false,
      error: 'ARENA_OPPONENT_MISMATCH'
    };
    if (body.expectedOpponentType && String(body.expectedOpponentType).toUpperCase() !== String(daily.opponent_type || '').toUpperCase()) return {
      ok: false,
      error: 'ARENA_OPPONENT_TYPE_MISMATCH'
    };
    if (!testMode && daily.challenged === true) return {
      ok: false,
      error: 'ARENA_MATCH_ALREADY_WON'
    };
    defType = String(daily.opponent_type);
    defAccount = daily.opponent_account_id || null;
    defNpc = daily.opponent_npc_id || null;
    defName = String(daily.opponent_nickname || '');
  } else {
    type = 'REVENGE';
    revenge = await arenaOne_('ArenaRevenge', 'revenge_id=' + arenaEq_(revengeId) + '&season_id=' + arenaEq_(season.seasonId) + '&owner_account_id=' + arenaEq_(auth.accountId) + '&status=eq.AVAILABLE&select=*');
    if (!revenge) return {
      ok: false,
      error: 'ARENA_REVENGE_NOT_AVAILABLE'
    };
    defType = 'PLAYER';
    defAccount = String(revenge.target_account_id);
    defName = await arenaAccountNickname_(defAccount);
  }
  if (defType === 'PLAYER') {
    // Pairing fixes the opponent identity. Each new battle captures their latest uploaded defense.
    // ArenaBattles retains that captured snapshot throughout the battle and settlement.
    const chosen = await arenaCurrentDefense_(season.seasonId, defAccount);
    if (!chosen) return {
      ok: false,
      error: 'ARENA_OPPONENT_DEFENSE_MISSING'
    };
    defSnap = chosen.snapshot_json;
    defenderSnapshotId = String(chosen.snapshot_id || '');
    defName = String(daily && daily.opponent_nickname || chosen.nickname || defName || '冒險者');
  } else {
    defSnap = arenaNpcSnapshotFromPlanning_(defNpc, daily ? daily.opponent_points_at_match : 0);
  }
  const atkSnap = arenaBuildAttackSnapshot_(auth.accountId, body),
    now = new Date(),
    expires = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  let retryAttempt = false;
  if (daily && !testMode) {
    const prev = await arenaSbRequest_('get', 'ArenaBattles', 'daily_match_id=' + arenaEq_(daily.match_id) + '&status=eq.SETTLED&select=battle_id,result');
    retryAttempt = Array.isArray(prev) && prev.length > 0;
  }
  const scoreRows179=await arenaPointRows179_(season.seasonId,[auth.accountId,defAccount]);
  const score179=id=>Number((Array.isArray(scoreRows179)?scoreRows179:[]).find(x=>String(x.account_id)===String(id))?.points)||0;
  const scoreSnapshot179={attackerPoints:score179(auth.accountId),defenderPoints:score179(defAccount),npcId:defNpc,isElite:defType==='NPC'?String(arenaNpcRows140_().find(r=>r.NpcID===defNpc)?.Tier).toUpperCase()==='ELITE':null};
  const payload = {
    season_id: season.seasonId,
    battle_type: type,
    attacker_account_id: auth.accountId,
    attacker_nickname: await arenaAccountNickname_(auth.accountId),
    defender_type: defType,
    defender_account_id: defAccount,
    defender_npc_id: defNpc,
    defender_nickname: defName,
    daily_match_id: daily ? daily.match_id : null,
    revenge_id: revenge ? revenge.revenge_id : null,
    attacker_snapshot_json: atkSnap,
    attacker_snapshot_hash: await arenaHash_(atkSnap),
    defender_snapshot_json: defSnap,
    defender_snapshot_hash: await arenaHash_(defSnap),
    status: 'STARTED',
    result_summary: {
      testMode: testMode,
      arenaConfig126: arenaConfig126_(),
      scoreSnapshot179,
      retryAttempt: retryAttempt
    },
    started_at: now.toISOString(),
    expires_at: expires
  };
  const made = await arenaSbRequest_('post', 'ArenaBattles', '', payload, 'return=representation');
  const b = Array.isArray(made) && made.length ? made[0] : null;
  if (!b) throw new Error('ARENA_BATTLE_CREATE_FAILED');
  if (daily && !testMode) await arenaPatch_('ArenaDailyMatches', 'match_id=' + arenaEq_(daily.match_id), {
    battle_id: b.battle_id
  });
  if (revenge) await arenaPatch_('ArenaRevenge', 'revenge_id=' + arenaEq_(revenge.revenge_id), {
    revenge_battle_id: b.battle_id
  });
  return {
    ok: true,
    battleId: String(b.battle_id),
    battleType: type,
    maxTurns: payload.result_summary.arenaConfig126.MaxTurns,
    arenaConfig: payload.result_summary.arenaConfig126,
    defenderFirst: true,
    attackerSnapshot: atkSnap,
    defenderSnapshot: defSnap,
    defenderNickname: defName,
    defenderType: defType,
    defenderAccountId: defAccount || null,
    defenderSnapshotId: defenderSnapshotId,
    expiresAt: expires,
    testMode: testMode
  };
}
function arenaHpRatio_(hp, maxHp) {
  hp = Math.max(0, Number(hp) || 0);
  maxHp = Math.max(1, Number(maxHp) || 1);
  return hp / maxHp;
}
function arenaNormalizeResult_(body,cfg=arenaConfig126_()) {
  const turns = Math.max(1, Math.min(cfg.MaxTurns, Math.trunc(Number(body.turns) || 1)));
  const ah = Math.max(0, Number(body.attackerHp) || 0),
    am = Math.max(1, Number(body.attackerMaxHp) || 1);
  const dh = Math.max(0, Number(body.defenderHp) || 0),
    dm = Math.max(1, Number(body.defenderMaxHp) || 1);
  let result = '';
  if (ah <= 0 && dh <= 0) result = 'DRAW';else if (dh <= 0) result = 'ATTACKER_WIN';else if (ah <= 0) result = 'DEFENDER_WIN';else if (turns >= cfg.MaxTurns) {
    const a = arenaHpRatio_(ah, am),
      d = arenaHpRatio_(dh, dm),
      eps = 1e-9;
    result = Math.abs(a - d) <= eps ? 'DRAW' : a > d ? 'ATTACKER_WIN' : 'DEFENDER_WIN';
  } else {
    throw new Error('ARENA_BATTLE_NOT_FINISHED');
  }
  return {
    result: result,
    turns: turns,
    attackerHp: ah,
    attackerMaxHp: am,
    defenderHp: dh,
    defenderMaxHp: dm,
    attackerDamage: Math.max(0, Math.trunc(Number(body.attackerDamage) || 0)),
    defenderDamage: Math.max(0, Math.trunc(Number(body.defenderDamage) || 0))
  };
}
async function arenaApplyPlayerDelta_(seasonId, accountId, delta, result, damage,minPoints=arenaConfig126_().MinPoints) {
  const row = await arenaPlayerRow_(seasonId, accountId);
  if (!row) throw new Error('ARENA_PLAYER_NOT_FOUND');
  const old = Math.max(0, Number(row.points) || 0),
    next = Math.max(minPoints, old + delta),
    now = new Date().toISOString();
  const patch = {
    points: next,
    updated_at: now
  };
  if (next !== old) patch.reached_points_at = now;
  if (result === 'WIN') patch.wins = (Number(row.wins) || 0) + 1;
  if (result === 'LOSS') patch.losses = (Number(row.losses) || 0) + 1;
  if (result === 'DRAW') patch.draws = (Number(row.draws) || 0) + 1;
  patch.total_damage = (Number(row.total_damage) || 0) + Math.max(0, Math.trunc(Number(damage) || 0));
  await arenaPatch_('ArenaPlayers', 'season_id=' + arenaEq_(seasonId) + '&account_id=' + arenaEq_(accountId), patch);
  return {
    before: old,
    after: next,
    delta: next - old
  };
}
async function arenaCreateReport_(seasonId, owner, battleId, type, oppName, result, delta, revengeId) {
  await arenaSbRequest_('post', 'ArenaBattleReports', '', {
    season_id: seasonId,
    owner_account_id: owner,
    battle_id: battleId,
    report_type: type,
    opponent_nickname: String(oppName || ''),
    result: result,
    points_delta: delta,
    revenge_id: revengeId || null,
    is_read: false,
    created_at: new Date().toISOString()
  }, 'resolution=ignore-duplicates,return=minimal');
}
async function arenaSubmitBattle_(body) {
  const auth = requireAuth_(body.sessionToken),
    battleId = String(body.battleId || ''),
    b = await arenaBattleRow_(battleId);
  if (!b || String(b.attacker_account_id) !== String(auth.accountId)) return {
    ok: false,
    error: 'ARENA_BATTLE_NOT_FOUND'
  };
  if (String(b.status) === 'SETTLED') return {
    ok: true,
    alreadySettled: true,
    battleId: battleId,
    result: b.result,
    attackerPointsDelta: Number(b.attacker_points_delta) || 0,
    defenderPointsDelta: Number(b.defender_points_delta) || 0
  };
  if (String(b.status) !== 'STARTED') return {
    ok: false,
    error: 'ARENA_BATTLE_INVALID_STATE'
  };
  if (b.expires_at && Date.now() > new Date(b.expires_at).getTime()) return {
    ok: false,
    error: 'ARENA_BATTLE_EXPIRED'
  };
  const battleCfg126=arenaBattleConfig126_(b);
  const n = arenaNormalizeResult_(body,battleCfg126),
    isNpc = String(b.defender_type) === 'NPC',
    isRevenge = String(b.battle_type) === 'REVENGE',
    isTest = !!(b.result_summary && b.result_summary.testMode === true),
    isRetry = !isRevenge && !!(b.result_summary && b.result_summary.retryAttempt === true);
  let ad = 0,
    dd = 0,
    ar = {
      before: 0,
      after: 0,
      delta: 0
    },
    dr = {
      delta: 0
    },
    revengeId = null;
  if (!isTest) {
    ({ad,dd}=arenaDeltas126_(n.result,{isNpc,isRevenge,isRetry,npcId:b.defender_npc_id,...(b.result_summary?.scoreSnapshot179||{})},battleCfg126));
    ar = await arenaApplyPlayerDelta_(b.season_id, b.attacker_account_id, ad, n.result === 'ATTACKER_WIN' ? 'WIN' : n.result === 'DEFENDER_WIN' ? 'LOSS' : 'DRAW', n.attackerDamage,battleCfg126.MinPoints);
    if (!isNpc) {
      dr = await arenaApplyPlayerDelta_(b.season_id, b.defender_account_id, dd, n.result === 'ATTACKER_WIN' ? 'LOSS' : n.result === 'DEFENDER_WIN' ? 'WIN' : 'DRAW', n.defenderDamage,battleCfg126.MinPoints);
    }
    if (!isRevenge && n.result === 'ATTACKER_WIN' && b.daily_match_id) {
      await arenaPatch_('ArenaDailyMatches', 'match_id=' + arenaEq_(b.daily_match_id), {
        challenged: true,
        challenged_at: new Date().toISOString(),
        battle_id: battleId
      });
    }
    if (!isNpc && !isRevenge && n.result === 'ATTACKER_WIN') {
      const season = arenaSeasonInfo_();
      const rr = await arenaSbRequest_('post', 'ArenaRevenge', '', {
        season_id: b.season_id,
        owner_account_id: b.defender_account_id,
        target_account_id: b.attacker_account_id,
        source_battle_id: battleId,
        status: 'AVAILABLE',
        created_at: new Date().toISOString(),
        expires_at: season.endAt
      }, 'resolution=ignore-duplicates,return=representation');
      if (Array.isArray(rr) && rr.length) revengeId = rr[0].revenge_id;
    }
    if (isRevenge && b.revenge_id) {
      await arenaPatch_('ArenaRevenge', 'revenge_id=' + arenaEq_(b.revenge_id), {
        status: 'USED',
        used_at: new Date().toISOString(),
        revenge_battle_id: battleId
      });
    }
    if (!isNpc) {
      await arenaCreateReport_(b.season_id, b.defender_account_id, battleId, isRevenge ? 'REVENGE' : 'DEFENSE', b.attacker_nickname, n.result === 'ATTACKER_WIN' ? 'LOSS' : n.result === 'DEFENDER_WIN' ? 'WIN' : 'DRAW', dr.delta, revengeId);
    }
  } else {
    const prow = await arenaPlayerRow_(b.season_id, b.attacker_account_id);
    ar = {
      before: Number(prow?.points) || 0,
      after: Number(prow?.points) || 0,
      delta: 0
    };
  }
  const settlementKey = 'arena:' + battleId;
  await arenaPatch_('ArenaBattles', 'battle_id=' + arenaEq_(battleId), {
    status: 'SETTLED',
    result: n.result,
    turns: n.turns,
    attacker_hp: n.attackerHp,
    attacker_max_hp: n.attackerMaxHp,
    defender_hp: n.defenderHp,
    defender_max_hp: n.defenderMaxHp,
    attacker_damage: n.attackerDamage,
    defender_damage: n.defenderDamage,
    result_summary: {
      ...(b.result_summary||{}),
      testMode: isTest,
      retryAttempt: isRetry,
      hpRatio: {
        attacker: arenaHpRatio_(n.attackerHp, n.attackerMaxHp),
        defender: arenaHpRatio_(n.defenderHp, n.defenderMaxHp)
      }
    },
    attacker_points_delta: ar.delta,
    defender_points_delta: dr.delta,
    submitted_at: new Date().toISOString(),
    settled_at: new Date().toISOString(),
    settlement_key: settlementKey
  });
  return {
    ok: true,
    battleId: battleId,
    result: n.result,
    attackerPointsDelta: ar.delta,
    defenderPointsDelta: dr.delta,
    attackerPoints: ar.after,
    revengeCreated: !!revengeId,
    testMode: isTest
  };
}
async function arenaRevengeList_(body){
 const auth=requireAuth_(body.sessionToken),season=arenaSeasonInfo_();
 const rows=await arenaSbRequest_('get','ArenaRevenge','season_id='+arenaEq_(season.seasonId)+'&owner_account_id='+arenaEq_(auth.accountId)+'&status=eq.AVAILABLE&select=*&order=created_at.desc');
 const avatars325=await arenaAvatarRows325_((rows||[]).map(r=>r.target_account_id));
 const points=await arenaPointRows179_(season.seasonId,[auth.accountId,...(rows||[]).map(r=>r.target_account_id)]),p=id=>Number(points.find(x=>String(x.account_id)===String(id))?.points)||0;
 return {ok:true,season,rows:await _asyncArray('map',Array.isArray(rows)?rows:[],async r=>({targetAvatarId:avatars325.get(String(r.target_account_id))||1,revengeId:String(r.revenge_id),targetAccountId:String(r.target_account_id),targetNickname:await arenaAccountNickname_(r.target_account_id),winDelta:arenaDeltas126_('ATTACKER_WIN',{isRevenge:true,attackerPoints:p(auth.accountId),defenderPoints:p(r.target_account_id)}).ad,loseDelta:0,createdAt:r.created_at,expiresAt:r.expires_at}))};
}
async function arenaReports_(body) {
  const auth = requireAuth_(body.sessionToken),
    season = arenaSeasonInfo_(),
    limit = Math.max(1, Math.min(100, Math.trunc(Number(body.limit) || 30)));
  const rows = await arenaSbRequest_('get', 'ArenaBattleReports', 'season_id=' + arenaEq_(season.seasonId) + '&owner_account_id=' + arenaEq_(auth.accountId) + '&select=*&order=created_at.desc&limit=' + limit);
  return {
    ok: true,
    season: season,
    rows: (Array.isArray(rows) ? rows : []).map(r => ({
      reportId: String(r.report_id),
      battleId: String(r.battle_id),
      type: String(r.report_type),
      opponentNickname: String(r.opponent_nickname || ''),
      result: String(r.result),
      pointsDelta: Number(r.points_delta) || 0,
      revengeId: r.revenge_id ? String(r.revenge_id) : null,
      createdAt: r.created_at,
      isRead: r.is_read === true
    }))
  };
}

// ============================================================
// v11.31.94 Arena Planning Data
// ArenaConfig / ArenaNPC are published with the normal planning package.
// ============================================================
function arenaPlanningRows_(name) {
  try {
    return publishedPlanningRows_(name) || [];
  } catch (_e) {
    return [];
  }
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
 const rows=arenaPlanningRows_('Equipment').filter(r=>r.ItemID&&r.ItemID!=='gmSword'&&r.ItemID!=='forgeBlank172'&&active(r)),gemRows=arenaPlanningRows_('Gems').filter(active),out={};
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

function arenaNpcAi_(npc, skills) {
  const cond = [npc.AI1Condition || 'ALWAYS', npc.AI2Condition || 'ALWAYS', npc.AI3Condition || 'ALWAYS'];
  return skills.map((skill, i) => ({
    skill: skill,
    priority: i + 1,
    condition: String(cond[i] || 'ALWAYS')
  }));
}
function arenaNpcSnapshotFromPlanning_(npcId,points){
 const npc=arenaNpcPlanning_(npcId);if(!npc)throw Error('ARENA_NPC_DISABLED_OR_MISSING:'+npcId);
 const passive=String(npc.PassiveID||'');
 if(passive&&!arenaPlanningRows_('Skills').some(r=>r.SkillID===passive&&String(r.Type).toLowerCase()==='passive'&&String(r.Enabled).toLowerCase()!=='false'))throw Error('ARENA_NPC_PASSIVE_INVALID:'+npcId);
 const equipment=arenaNpcEquipment_(npc),skills=arenaNpcSkills_(npc),base=arenaNpcSnapshot_(npcId,points);
 return {...base,npcName:String(npc.Name||npcId),archetype:String(npc.Archetype||npcId),tier:String(npc.Tier||'NORMAL'),equipment,gems:Object.fromEntries(Object.entries(equipment).map(([k,it])=>[k,it.gems])),skills,passive,ai:arenaNpcAi_(npc,skills),planningDriven:true,npcBuildVersion140:1,scale:1};
}

function petRandom297(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
// Server-owned collection mutations. The existing pet receipt/CAS transaction commits them.
function petRelease336_(save,ids,confirmLegendary,rng){
 if(!Array.isArray(ids)||ids.length<1||ids.length>100||ids.some(id=>typeof id!=='string'||!id||id.length>100)||new Set(ids).size!==ids.length)throw Error('PET_RELEASE_INVALID');
 const pets=save.pets297||[],chosen=ids.map(id=>{const matches=pets.filter(p=>p.id===id);if(matches.length!==1)throw Error('PET_NOT_OWNED');return matches[0];});
 if(chosen.some(p=>p.id===save.equippedPet297||p.favorite336===true||p.protected336===true||(p.traits||[]).some(t=>t.locked)))throw Error('PET_RELEASE_PROTECTED');
 if(chosen.some(p=>(p.traits||[]).some(t=>String(t.quality).toLowerCase()==='legendary'))&&confirmLegendary!==true)throw Error('PET_RELEASE_LEGENDARY_CONFIRM');
 const released=chosen.map(p=>{const n=rng();if(!Number.isFinite(n)||n<0||n>=1)throw Error('PET_RANDOM_INVALID');return {petId:p.id,species:p.species,quantity:2+Math.floor(n*19)};});
 const potionTotal=released.reduce((n,r)=>n+r.quantity,0),owned=Number(save.consumables?.petExpPotion||0);
 if(!Number.isSafeInteger(owned)||owned<0||!Number.isSafeInteger(owned+potionTotal))throw Error('PET_POTION_INVALID');
 const remove=new Set(ids);save.pets297=pets.filter(p=>!remove.has(p.id));save.consumables=save.consumables||{};save.consumables.petExpPotion=owned+potionTotal;
 return {released,potionTotal};
}
function petMeta336_(save,id,key,value){
 const pet=(save.pets297||[]).find(p=>p.id===id);if(!pet)throw Error('PET_NOT_OWNED');
 if(!['favorite336','protected336'].includes(key)||typeof value!=='boolean')throw Error('PET_META_INVALID');
 pet[key]=value;return {petId:id,key,value};
}

async function petApi297(body){
 const auth=requireAuth_(body.sessionToken),request=String(body.action==='pet/recover-buy'?body.originalRequest?.requestId||'':body.requestId||''),operation=String(body.action||'');
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(request))throw Error('PET_REQUEST_INVALID');
 const rec=await findRowByValue_(DB.SAVES,'AccountID',auth.accountId);if(!rec)throw Error('SAVE_NOT_FOUND');
 const save=await parseSaveRecord_(rec),revision=Number(rec.Revision),data=secureRules78();
 if(operation==='pet/recover-buy'){if(body.originalRequest?.action!=='pet/buy')throw Error('PET_REQUEST_INVALID');const prior=await secureRpc78('game_pet_receipt297',{p_account:auth.accountId,p_request:request,p_body:body.originalRequest});return prior||{ok:true,notCommitted:true,accountId:auth.accountId,save,revision};}
 const previous=await secureRpc78('game_pet_receipt297',{p_account:auth.accountId,p_request:request,p_body:body});if(previous?.ok)return previous;
 if(Number(body.expectedSaveRevision)!==revision)throw Error('SAVE_REVISION_CONFLICT');
 if(['pet/buy','pet/open','pet/potion'].includes(operation)&&(!Number.isSafeInteger(Number(body.quantity))||Number(body.quantity)<1||Number(body.quantity)>(operation==='pet/open'?10:operation==='pet/buy'?999:99999)))throw Error('PET_QUANTITY_INVALID');
 const active=await UrlFetchApp.fetch(EDGE_BASE+'/rest/v1/game_battles78?account_id=eq.'+encodeURIComponent(auth.accountId)+'&finished_at=is.null&select=battle_id&limit=1',{method:'get'});
 if(active.getResponseCode()>=400)throw Error('PET_BATTLE_CHECK_FAILED');if(JSON.parse(active.getContentText()).length)throw Error('PET_BATTLE_ACTIVE');
 if(save.currentBattle&&!save.currentBattle.won&&!save.currentBattle.lost)throw Error('PET_BATTLE_ACTIVE');
 const relic=await secureRpc78('game_relic_read144',{p_account:auth.accountId,p_run:null});if(relic?.run?.phase==='battle'&&!relic.run.closed)throw Error('PET_BATTLE_ACTIVE');
 const extreme=await secureRpc78('game_extreme_status130',{p_account:auth.accountId,p_season:arenaSeasonInfo_().seasonId});if(extreme?.active)throw Error('PET_BATTLE_ACTIVE');
 save.pets297=save.pets297||[];save.consumables=save.consumables||{};let result={};
 if(operation==='pet/buy'){
  const row=petRows297(data,'ShopEntries').find(r=>r.ContentID==='petEgg'),qty=petInteger297(body.quantity,1,999),price=petInteger297(row?.Price,1),cleared=Number(save.maxCleared||0);
  if(!row||cleared+1<Number(row.UnlockFloor||1)||!petRows297(data,'Consumables').some(r=>r.ContentID==='petEgg'))throw Error('PET_SHOP_UNAVAILABLE');if(Number(save.gold||0)<qty*price)throw Error('PET_GOLD_INSUFFICIENT');save.gold-=qty*price;save.consumables.petEgg=Number(save.consumables.petEgg||0)+qty;result={quantity:qty};
 }else if(operation==='pet/open'){result={results:petOpen297(data,save,body.quantity,petRandom297,()=>crypto.randomUUID(),String(body.boxId||'petEgg'))};
 }else if(operation==='pet/release'){result=petRelease336_(save,body.petIds,body.confirmLegendary,petRandom297);
 }else if(operation==='pet/meta'){result=petMeta336_(save,body.petId,body.key,body.value);
 }else{
  const pet=save.pets297.find(p=>p.id===body.petId);if(!pet&&!(operation==='pet/equip'&&!body.petId))throw Error('PET_NOT_OWNED');
  if(operation==='pet/equip'){save.equippedPet297=pet?.id||null;}
  else if(operation==='pet/lock'){const index=petInteger297(body.index,0,2);if(!pet.traits[index])throw Error('PET_TRAIT_LOCKED_LEVEL');if(typeof body.locked!=='boolean')throw Error('PET_LOCK_INVALID');pet.traits[index].locked=body.locked;}
  else if(operation==='pet/train')result={cost:petTrain297(data,save,pet,petRandom297)};
  else if(operation==='pet/potion')result={used:petPotion297(data,save,pet,body.quantity,petRandom297)};
  else throw Error('PET_ACTION_INVALID');
 }
 return secureRpc78('game_pet_apply297',{p_account:auth.accountId,p_request:request,p_expected:revision,p_body:body,p_save:save,p_result:result});
}

async function secureRpc78(name,body){const r=await UrlFetchApp.fetch(EDGE_BASE+'/rest/v1/rpc/'+name,{method:'post',contentType:'application/json',payload:JSON.stringify(body)});const result=JSON.parse(r.getContentText());if(r.getResponseCode()>=400)throw Error(result.message||'OPERATION_REJECTED');return result;}

const QUEST_DEFAULT368={"QuestNPCs":[],"Quests":[],"QuestObjectives":[],"QuestRewards":[],"QuestDialogues":[]};
const QUEST_ADDITIONS368={"Skills":[],"Gems":[],"PetSpecies":[],"Consumables":[]};
// Shared deterministic quest rules; runtime copies are embedded in HTML and Edge source.
const QUEST_EGGS368={chickEgg368:'chick',spiritDeerEgg368:'spiritDeer',ragdollEgg368:'ragdoll'};
function questEnabled368(x){return x&&x.Enabled!==false&&String(x.Enabled).toLowerCase()!=='false';}
function questRows368(data,key){return Array.isArray(data?.[key])?data[key]:[];}
function questGoals368(data,id){return questRows368(data,'QuestObjectives').filter(x=>x.QuestID===id);}
function questConfigured368(data,id){const goals=questGoals368(data,id);return goals.length>0&&goals.every(g=>{if(!Number.isSafeInteger(Number(g.Quantity))||Number(g.Quantity)<1)return false;if(!['dialogue','deliver_equipment','deliver_gem','battle','enhance','enhance_success','enhance_level','socket','main_clear','craft','kill'].includes(g.Type))return false;const id=String(g.TargetID||'').trim();if(['deliver_equipment','deliver_gem','kill','main_clear','craft','battle'].includes(g.Type)&&!id)return false;const table=({deliver_equipment:['Equipment','ItemID'],deliver_gem:['Gems','GemID'],kill:['Enemies','EnemyID']})[g.Type];if(table&&Array.isArray(data[table[0]])&&!data[table[0]].some(x=>String(x[table[1]])===id&&questEnabled368(x)))return false;if(g.Type==='main_clear'&&(!Number.isSafeInteger(Number(id))||Number(id)<1))return false;if(g.Type==='battle'&&!['main','dungeon','boxing','worldboss','arena'].includes(id))return false;return true;});}
function questUnlocked368(q,save,states){if(!questEnabled368(q)||q.Prerequisite&&!states[q.Prerequisite]?.completed)return false;const n=Number(q.ConditionValue)||0;return q.ConditionType==='level'?Number(save.level)>=n:q.ConditionType==='main'?Number(save.maxCleared)>=n:['town','quest'].includes(q.ConditionType);}
function questMetricKey368(g){return [g.Type,g.TargetID||'*',g.Slot||'*'].join(':');}
function questMetric368(g,save,metrics){if(g.Type==='kill')return Number(save.enemyDefeatCounts?.[g.TargetID]||0);if(g.Type==='main_clear')return Number(save.maxCleared)>=Number(g.TargetID)?Number(g.Quantity):0;if(g.Type==='enhance_level')return (save.inventory||[]).filter(i=>(!g.TargetID||i.template===g.TargetID)&&(!g.Slot||i.slot===g.Slot)&&Number(i.enhance)>=Number(g.MinEnhance)).length;return Number(metrics[questMetricKey368(g)]||0);}
function questEquipped368(save,id){return Object.values(save.equipment||{}).flat().some(x=>String(x)===String(id));}
function questProtected368(save,item){return !!(item.locked||item.protected||item.favorite||item.protected336||(save.favoriteEquipmentIds||[]).includes(String(item.id))||(save.favoriteGemIds||[]).includes(String(item.id))||questEquipped368(save,item.id));}
function questOwnedMatches376(g,save){return (g.Type==='deliver_gem'?save.gems||[]:save.inventory||[]).filter(i=>i.template===g.TargetID&&(!g.Slot||i.slot===g.Slot)&&Number(i.enhance||0)>=Number(g.MinEnhance||0));}
function questCandidates368(g,save){return (g.Type==='deliver_gem'?save.gems||[]:save.inventory||[]).filter(i=>!questProtected368(save,i)&&i.template===g.TargetID&&(!g.Slot||i.slot===g.Slot)&&Number(i.enhance||0)>=Number(g.MinEnhance||0));}
function questProgress368(g,save,metrics,entry){if(!entry?.accepted)return 0;if(g.Type==='dialogue')return entry.dialogue?1:0;if(g.Type.startsWith('deliver_'))return Math.min(Number(g.Quantity),questOwnedMatches376(g,save).length);const now=questMetric368(g,save,metrics);return Math.max(0,Math.min(Number(g.Quantity),['main_clear','enhance_level'].includes(g.Type)?now:now-Number(entry.baseline?.[g.ObjectiveID]||0)));}
function questStatus368(data,q,save,states,metrics){const e=states[q.QuestID];if(e?.completed)return 'completed';if(!questConfigured368(data,q.QuestID))return 'unconfigured';if(!questUnlocked368(q,save,states))return 'locked';if(!e?.accepted)return 'available';return questGoals368(data,q.QuestID).every(g=>questProgress368(g,save,metrics,e)>=Number(g.Quantity))?'ready':'active';}
function questSelections368(goals,save,selected){const used=new Set(),items=[];for(const g of goals.filter(g=>g.Type.startsWith('deliver_'))){const ids=selected?.[g.ObjectiveID];if(!Array.isArray(ids)||ids.length!==Number(g.Quantity))throw Error('QUEST_SELECTION_REQUIRED');const candidates=questCandidates368(g,save);for(const id of ids){if(typeof id!=='string'||used.has(id))throw Error('QUEST_SELECTION_INVALID');const item=candidates.find(i=>i.id===id);if(!item)throw Error('QUEST_ITEM_UNAVAILABLE');used.add(id);items.push({g,item});}}return items;}
function questClaimRewards368(data,id,choice){const rows=questRows368(data,'QuestRewards').filter(r=>r.QuestID===id&&r.Timing==='complete'),groups=[...new Set(rows.map(r=>r.ChoiceGroup).filter(Boolean))];for(const group of groups)if(!rows.some(r=>r.ChoiceGroup===group&&r.RewardID===choice?.[group]))throw Error('QUEST_REWARD_SELECTION_REQUIRED');return rows.filter(r=>!r.ChoiceGroup||r.RewardID===choice[r.ChoiceGroup]);}

function questData368(){const d={...secureRules78()};for(const key of Object.keys(QUEST_DEFAULT368))d[key]=Array.isArray(d[key])?d[key]:QUEST_DEFAULT368[key];return d;}
async function questReward368(data,save,r){const qty=Number(r.Quantity);if(!Number.isSafeInteger(qty)||qty<1||qty>1000000)throw Error('QUEST_REWARD_INVALID');const id=String(r.ContentID||'');
 if(r.Type==='GOLD')save.gold=Number(save.gold||0)+qty;
 else if(r.Type==='STONE'){save.stones=Number(save.stones||0)+qty;if(save.enhanceStones!=null)save.enhanceStones=save.stones;}
 else if(r.Type==='CONSUMABLE'){if(!QUEST_EGGS368[id]&&!(data.Consumables||[]).some(x=>x.ContentID===id&&questEnabled368(x))&&!['redPotion','eyeDrops','legendaryHammer'].includes(id))throw Error('QUEST_REWARD_INVALID');if(id==='legendaryHammer'){save.enhancementItems||={};save.enhancementItems[id]=Number(save.enhancementItems[id]||0)+qty;}else{save.consumables||={};save.consumables[id]=Number(save.consumables[id]||0)+qty;if(['redPotion','eyeDrops','sacrificeGoat','poisonItem'].includes(id)){save.skillsOwned||=[];if(!save.skillsOwned.includes(id))save.skillsOwned.push(id);}}}
 else if(r.Type==='SKILL'){if(!(data.Skills||[]).some(x=>x.SkillID===id))throw Error('QUEST_REWARD_INVALID');save.skillsOwned||=[];if(!save.skillsOwned.includes(id))save.skillsOwned.push(id);}
 else if(r.Type==='TITLE'){if(!(data.Titles||[]).some(x=>x.TitleID===id))throw Error('QUEST_REWARD_INVALID');save.ownedTitles||=[];if(!save.ownedTitles.includes(id))save.ownedTitles.push(id);}
 else if(r.Type==='PET'){for(let i=0;i<qty;i++)(save.pets297||=[]).push(petCreate297(data,id,petRandom297,crypto.randomUUID()));}
 else if(r.Type==='EQUIPMENT'){const tpl=(data.Equipment||[]).find(x=>x.ItemID===id&&questEnabled368(x));if(!tpl)throw Error('QUEST_REWARD_INVALID');for(let i=0;i<qty;i++){const it=makeEquipmentInstanceFromRow_(tpl);it.stats.critDamage=Number(tpl.CritDamage)||0;it.enhance=Number(r.Enhance)||0;if(it.enhance<0||it.enhance>10)throw Error('QUEST_REWARD_INVALID');(save.inventory||=[]).push(it);}}
 else if(r.Type==='GEM'){const tpl=id==='lilyBlueCrystal368'?{GemID:id,Name:'莉莉的藍水晶',HP:10,VisualColor:'cyan',Price:0}:(data.Gems||[]).find(x=>x.GemID===id);if(!tpl)throw Error('QUEST_REWARD_INVALID');for(let i=0;i<qty;i++)(save.gems||=[]).push(makeGemInstanceFromRow_(tpl));}
 else throw Error('QUEST_REWARD_INVALID');
}
// Quest-only run receipts. No score/ranking writes and no PlayerSave mutation.
function questBoxingCompletion379(body){
 const c=body.completion;
 if(!c||typeof c!=='object'||Array.isArray(c)||!['turn_limit','machine_defeated','player_dead'].includes(c.reason)||!Number.isSafeInteger(c.turn)||c.turn<1||!Number.isFinite(c.enemyHp)||c.enemyHp<0||!Number.isFinite(c.playerHp)||c.playerHp<0)throw Error('QUEST_BOXING_INVALID');
 return {reason:c.reason,turn:c.turn,enemyHp:c.enemyHp,playerHp:c.playerHp};
}
async function questBoxingApi379(body){
 const auth=requireAuth_(body.sessionToken),run=String(body.runId||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(run))throw Error('QUEST_BOXING_INVALID');
 if(body.action==='quest/boxing-finish')return secureRpc78('game_boxing_quest_finish379',{p_account:auth.accountId,p_run:run,p_completion:questBoxingCompletion379(body)});
 if(body.action!=='quest/boxing-start')throw Error('QUEST_BOXING_INVALID');
 const season=await boxingSeason_(body.seasonId);if(!season)throw Error('QUEST_BOXING_SEASON_MISSING');
 const cfg=await boxingConfig_(season),now=Date.now();
 return secureRpc78('game_boxing_quest_start379',{p_account:auth.accountId,p_run:run,p_season:season.seasonId,p_turns:Number(cfg.maxTurns||3),p_hp:Number(cfg.hp),p_active:now>=season.start&&now<season.end});
}

/* Resumable records are not live-combat locks. Only authenticated, owned runs renew a short lease. */
async function questActivity392(body){
 const auth=requireAuth_(body.sessionToken),mode=String(body.mode||''),client=String(body.clientId||'');
 if(!['extreme','relic'].includes(mode)||!/^[0-9a-f-]{36}$/i.test(client)||typeof body.active!=='boolean')throw Error('QUEST_ACTIVITY_INVALID');
 const runId=String(body.runId||'');
 if(body.active){
  if(!/^[0-9a-f-]{36}$/i.test(runId))throw Error('QUEST_ACTIVITY_INVALID');
  if(mode==='extreme'){
   const status=await secureRpc78('game_extreme_status130',{p_account:auth.accountId,p_season:arenaSeasonInfo_().seasonId});
   if(String(status?.active?.runId||'')!==runId)throw Error('QUEST_ACTIVITY_RUN_MISSING');
  }else{
   const status=await secureRpc78('game_relic_read144',{p_account:auth.accountId,p_run:runId});
   if(String(status?.run?.id||'')!==runId||status.run.closed||status.run.phase!=='battle')throw Error('QUEST_ACTIVITY_RUN_MISSING');
  }
 }
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(auth.accountId+':'+client));
 const sessionHash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 return secureRpc78('game_quest_activity392',{p_account:auth.accountId,p_session:sessionHash,p_mode:mode,p_run:runId,p_active:body.active});
}

async function questApi368(body){if(body.action==='quest/activity')return questActivity392(body);if(['quest/boxing-start','quest/boxing-finish'].includes(body.action))return questBoxingApi379(body);const auth=requireAuth_(body.sessionToken),data=questData368(),bundle=await secureRpc78('game_quest_read368',{p_account:auth.accountId});
 const save=bundle.save,states=bundle.states,metrics=bundle.metrics;
 const catalog=()=>({ok:true,accountId:auth.accountId,quests:data.Quests.map(q=>({...q,status:questStatus368(data,q,save,states,metrics),objectives:questGoals368(data,q.QuestID).map(g=>({...g,progress:questProgress368(g,save,metrics,states[q.QuestID])})),autoSeen:!!states[q.QuestID]?.seen})),states,metrics,data:Object.fromEntries(Object.keys(QUEST_DEFAULT368).map(k=>[k,data[k]])),revision:bundle.revision});
 if(body.action==='quest/status')return catalog();
 const request=String(body.requestId||'');if(!/^[a-zA-Z0-9_-]{8,100}$/.test(request))throw Error('QUEST_REQUEST_INVALID');
 const prior=await secureRpc78('game_quest_receipt368',{p_account:auth.accountId,p_request:request,p_body:body});if(prior)return prior;
 if(Number(body.expectedSaveRevision)!==Number(bundle.revision))throw Error('SAVE_REVISION_CONFLICT');
 if(await secureRpc78('game_quest_battle_active392',{p_account:auth.accountId}))throw Error('QUEST_BATTLE_ACTIVE');
 save.consumables=save.consumables||{};

 let result={};
 if(body.action==='quest/openEgg'){
  const species=QUEST_EGGS368[body.eggId];if(!species||Number(save.consumables?.[body.eggId]||0)<1)throw Error('QUEST_EGG_EMPTY');
  // petCreate297 is the existing initial-trait/quality algorithm; only species is fixed.
  const item=petCreate297(data,species,petRandom297,crypto.randomUUID());(save.pets297||=[]).push(item);save.consumables[body.eggId]--;result={pet:item};
 }else{
  const q=data.Quests.find(q=>q.QuestID===body.questId);if(!q||!questConfigured368(data,q.QuestID)||!questUnlocked368(q,save,states))throw Error('QUEST_NOT_AVAILABLE');
  const id=q.QuestID,e=states[id]||={};
  if(body.action==='quest/seen'){if(e.seen||e.accepted||e.completed)throw Error('QUEST_ALREADY_SEEN');e.seen=true;}
  else if(body.action==='quest/accept'){
   if(e.accepted||e.completed)throw Error('QUEST_ALREADY_ACCEPTED');e.accepted=true;e.dialogue=true;e.seen=true;e.baseline={};e.acceptedAt=new Date().toISOString();
   for(const g of questGoals368(data,id))e.baseline[g.ObjectiveID]=questMetric368(g,save,metrics);
   for(const r of data.QuestRewards.filter(r=>r.QuestID===id&&r.Timing==='accept'))await questReward368(data,save,r);
  }else if(body.action==='quest/claim'){
   if(questStatus368(data,q,save,states,metrics)!=='ready')throw Error('QUEST_NOT_READY');
   const items=questSelections368(questGoals368(data,id),save,body.selected),rewards=questClaimRewards368(data,id,body.choices||{});
   for(const {g,item}of items){const key=g.Type==='deliver_gem'?'gems':'inventory';save[key]=save[key].filter(x=>x.id!==item.id);}
   for(const r of rewards)await questReward368(data,save,r);e.completed=true;e.completedAt=new Date().toISOString();result={rewards};
  }else throw Error('QUEST_ACTION_INVALID');
 }
 return secureRpc78('game_quest_apply368',{p_account:auth.accountId,p_request:request,p_expected:bundle.revision,p_state_version:bundle.stateVersion,p_body:body,p_save:save,p_states:states,p_result:result,p_metrics:metrics});
}

function secureRules78(){return RPG411.compile(EDGE_PLANNING.data||{});}
async function secureRecovery79(body){const auth=requireAuth_(body.sessionToken);if(body.action==='battle/cancel'){if(!body.battleId)throw Error('BATTLE_NOT_FOUND');return secureRpc78('game_battle_cancel79',{p_account:auth.accountId,p_battle:body.battleId});}return secureRpc78('game_battle_status79',{p_account:auth.accountId,p_battle:body.battleId||null,p_request:body.requestId||null,p_consume:body.consumeRequestId||null});}
async function secureBattle78(body){
 const auth=requireAuth_(body.sessionToken),rec=await findRowByValue_(DB.SAVES,'AccountID',auth.accountId);if(!rec)throw Error('SAVE_NOT_FOUND');
 const save=await parseSaveRecord_(rec),revision=Number(rec.Revision),rules=secureRules78();
 const integer=(v,min,max)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('OPERATION_REJECTED');return n;};
 if(body.action==='battle/start'){
  const selection=body.selection;if(!selection||!['main','dungeon'].includes(selection.mode))throw Error('OPERATION_REJECTED');
  let enemy,details;
  if(selection.mode==='main'){
   const floor=integer(selection.floor,1,2147483647);if(floor>Number(save.maxCleared||0)+1||selection.training&&floor>Number(save.maxCleared||0))throw Error('OPERATION_REJECTED');
   const stage=rules.Enemies.find(r=>Number(r.Floor)===floor&&r.Enabled!==false&&String(r.Enabled).toLowerCase()!=='false');
   if(!stage)throw Error('STAGE_NOT_AVAILABLE');const row=rules.Enemies.find(r=>r.EnemyID===stage.EnemyID);if(!row)throw Error('STAGE_NOT_AVAILABLE');
   const boss=toBool_(row.IsBoss),scale=1;enemy={id:row.EnemyID,name:row.Name,hp:Math.trunc(Number(row.BaseHP)*scale),def:Math.trunc(Number(row.BaseDEF)*scale),patk:Math.trunc(Number(row.BasePATK)*scale),matk:Math.trunc(Number(row.BaseMATK)*scale),boss};details={row};
  }else{
   const row=(rules.DungeonBosses||[]).find(r=>r.BossID===selection.bossId&&toBool_(r.Enabled));const diff=(rules.DungeonDifficulties||[]).find(r=>r.BossID===selection.bossId&&r.Difficulty===selection.difficulty&&toBool_(r.Enabled));
   if(!row||!diff||(row.StartAt&&Date.parse(row.StartAt)>Date.now())||(row.EndAt&&Date.parse(row.EndAt)<Date.now()))throw Error('STAGE_NOT_AVAILABLE');
   enemy={id:'dungeon_'+row.BossID,name:row.Name,hp:Number(diff.HP),def:Number(diff.DEF),patk:Number(diff.PATK),matk:Number(diff.MATK),boss:true};details={row,diff};
  }
  const stat=secureStats78(save,rules);const ids=new Set();for(const it of save.inventory||[]){if(ids.has(it.id))throw Error('CHARACTER_STATE_INVALID');ids.add(it.id);}for(const it of stat.equipped){if(!Number.isInteger(it.enhance||0)||(it.enhance||0)<0||(it.enhance||0)>10)throw Error('CHARACTER_STATE_INVALID');for(const gem of(it.gems||[]).filter(Boolean)){if(ids.has(gem.id))throw Error('CHARACTER_STATE_INVALID');ids.add(gem.id);}}
  const snapshot={mainProgressEpoch:411,enemy,details,stats:stat.stats,equipment:stat.equipped.map(it=>({id:it.id,template:it.template,name:it.name,effect:it.effect||'',enhance:it.enhance||0,sockets:it.sockets,gems:it.gems||[]})),skills:stat.skills,keys:stat.keys,planningVersion:EDGE_PLANNING.dataVersion,petId297:save.equippedPet297||null};
  return secureRpc78('game_battle_start78',{p_account:auth.accountId,p_request:body.requestId,p_expected:integer(body.expectedRevision,1,Number.MAX_SAFE_INTEGER),p_selection:selection,p_snapshot:snapshot});
 }
 const response=await UrlFetchApp.fetch(EDGE_BASE+'/rest/v1/game_battles78?battle_id=eq.'+encodeURIComponent(body.battleId)+'&account_id=eq.'+encodeURIComponent(auth.accountId)+'&select=*',{method:'get'});
 const battle=JSON.parse(response.getContentText())[0];if(!battle)throw Error('BATTLE_NOT_FOUND');
 const payload=body.summary;if(!payload||!['won','lost','abandoned'].includes(payload.result))throw Error('OPERATION_REJECTED');
 const turns=integer(payload.turns,1,1000000),peak=integer(payload.peakDamage??0,0,Number.MAX_SAFE_INTEGER),peakTurn=integer(payload.peakTurn??1,1,turns);
 if(Number(battle.snapshot?.mainProgressEpoch)!==411)throw Error('BATTLE_VERSION_EXPIRED');
 // An exact retry returns the database's current save and the original reward receipt.
 if(battle.finished_at)return secureRpc78('game_battle_commit78',{p_account:auth.accountId,p_battle:body.battleId,p_request:body.requestId,p_expected:revision,p_payload:payload,p_save:save,p_record:null,p_rewards:null});
 if(Number(battle.snapshot?.mainProgressEpoch)!==411)throw Error('BATTLE_VERSION_EXPIRED');
 const {enemy,details,keys}=battle.snapshot;const selection=battle.selection;let rewards={gold:0,exp:0,stones:0,items:[],gems:[],consumables:{}};const won=payload.result==='won';
 const fxTotal=(kind)=>keys.reduce((n,k)=>{const m=String(k).match(new RegExp('^fx_'+kind+'_percent_(-?\\d+(?:\\.\\d+)?)$'));return n+(m?Number(m[1]):0)},0);
 if(won){
  if(selection.mode==='main'){
   const floor=Number(selection.floor),row=details.row,count=Number(save.clearCount?.[floor]||0),m=1;

   // Resolve legacy gold effects from the trusted opening snapshot, including template effects.
   let goldPct=0;for(const it of battle.snapshot.equipment){for(const ef of [String((rules.Equipment||[]).find(x=>x.ItemID===it.template)?.EffectKey||it.effect||''),...(it.gems||[]).filter(Boolean).map(g=>g.effect||'')])for(const k of ef.split(/[\n,;|]+/)){const a=k.trim().match(/^gold_gain_percent_(\d+(?:\.\d+)?)$/);if(a)goldPct+=Number(a[1]);}}
   const baseGold=Math.max(1,Math.trunc(Number(row.Gold||0)*m));rewards.gold=baseGold+Math.max(0,Math.floor(baseGold*((1+goldPct/100)*(1+fxTotal('reward_gold')/100)-1)));
   rewards.exp=Math.max(1,Math.trunc(Number(row.EXP||0)*m*(1+fxTotal('reward_exp')/100)));rewards.stones=count===0?Math.max(0,Number(row.FirstClearStone||0)):0;
   // New boss consumables are awarded by the trusted opening planning row.
   if(enemy.boss&&row.DropConsumableID){const id=String(row.DropConsumableID),rate=Number(count===0?row.FirstDropRate:row.RepeatDropRate);if(!Number.isFinite(rate)||rate<0||rate>1||!(rules.Consumables||[]).some(r=>r.ContentID===id&&r.Enabled!==false&&String(r.Enabled).toLowerCase()!=='false'))throw Error('BOSS_DROP_RULES_INVALID');if(petRandom297()<rate)rewards.consumables[id]=1;}
   const drops=String(row.DropItemIDs||'').split(',').map(s=>s.trim()).filter(Boolean);let chosen=[];
   if(count===0&&enemy.boss)chosen=drops;else if(Math.random()<(Number(count===0?row.FirstDropRate:row.RepeatDropRate))){if(!enemy.boss&&row.DropConsumableID)rewards.consumables[row.DropConsumableID]=1;else if(drops.length)chosen=[drops[Math.floor(Math.random()*drops.length)]];}
   for(const id of chosen){const t=(rules.Equipment||[]).find(x=>x.ItemID===id);if(!t)continue;const it=makeEquipmentInstanceFromRow_(t);it.stats.critDamage=Number(t.CritDamage)||0;if(enemy.boss&&it.slot==='weapon'){it.sockets=Math.random()<.05?2:1;it.gems=Array(it.sockets).fill(null);}it.dropSource='drop';save.inventory.push(it);rewards.items.push(it);}
   if(row.BossGemID&&Math.random()<(count===0&&!save.bossGemClaimed?.[floor]?1:.01)){const r=(rules.Gems||[]).find(x=>x.GemID===row.BossGemID);if(r){const gem=makeGemInstanceFromRow_(r);save.gems.push(gem);rewards.gems.push(gem);save.bossGemClaimed={...save.bossGemClaimed,[floor]:true};}}
   save.clearCount={...save.clearCount,[floor]:count+1};save.enemyDefeatCounts={...save.enemyDefeatCounts,[enemy.id]:Number(save.enemyDefeatCounts?.[enemy.id]||0)+1};
   if(!selection.training){save.maxCleared=Math.max(Number(save.maxCleared||0),floor);save.bestClear=Math.max(Number(save.bestClear||0),save.maxCleared);if(enemy.boss)save.checkpoint=floor;}
  }else{
   const diff=details.diff;rewards.exp=Math.trunc(Number(diff.ExpMin)+Math.random()*(Number(diff.ExpMax)-Number(diff.ExpMin)+1));
   if(Math.random()<Number(diff.DropRate)){const t=(rules.Equipment||[]).find(x=>x.ItemID===details.row.RewardEquipmentID);if(t){const it=makeEquipmentInstanceFromRow_(t);it.stats.critDamage=Number(t.CritDamage)||0;const roll=Math.random();it.sockets=roll<.01?2:roll<.05?1:0;it.gems=Array(it.sockets).fill(null);it.dropSource='dungeon';save.inventory.push(it);rewards.items.push(it);}}
  }
  save.gold=Number(save.gold||0)+rewards.gold;save.stones=Number(save.stones||0)+rewards.stones;if(save.enhanceStones!=null)save.enhanceStones=save.stones;
  for(const [id,qty]of Object.entries(rewards.consumables)){save.consumables={...save.consumables,[id]:Number(save.consumables?.[id]||0)+qty};if(!save.skillsOwned.includes(id))save.skillsOwned.push(id);}
  const follower=(save.pets297||[]).find(p=>p.id===battle.snapshot.petId297);if(follower&&rewards.exp>0)petGain297(rules,follower,rewards.exp,petRandom297);
  const cap=250;save.exp=Number(save.exp||0)+rewards.exp;while(save.level<cap&&save.exp>=(save.level<=2?10:10+save.level*10)){save.exp-=save.level<=2?10:10+save.level*10;save.level++;save.talent=Number(save.talent||0)+Number((rules.GameConfig||[]).find(r=>r.Key==='TalentPointsPerLevel')?.Value??3);save.pendingLevelUps=[...(save.pendingLevelUps||[]),save.level];}if(save.level>=cap)save.exp=0;
 }
 save.currentHp=secureStats78(save,rules).stats.hp;save.currentBattle=null;
 // Only trusted opening equipment/skills/stats are stored; peak combat stats remain explicitly client-reported.
 const record=won&&selection.mode==='main'&&Number(selection.floor)>=40?{peakDamage:peak,peakTurn,turns,peakStats:null}:null;

 return secureRpc78('game_battle_commit78',{p_account:auth.accountId,p_battle:body.battleId,p_request:body.requestId,p_expected:revision,p_payload:payload,p_save:save,p_record:record,p_rewards:rewards});
}

function relicRand144_(lo,hi){return lo+Math.floor(Math.random()*(hi-lo+1));}
function relicPick144_(a){if(!a.length)throw Error('探險抽取池尚未設定');return a[relicRand144_(0,a.length-1)];}
function relicValue277_(base,scale){const value=Number(base)*scale;return Math.floor(value+Math.max(1,Math.abs(value))*Number.EPSILON*8);}
function relicScale144_(cleared,depth){return RPG411.relicScale(EDGE_PLANNING.data,cleared,depth);}
function relicBossScale156_(cleared,depth){return RPG411.relicScale(EDGE_PLANNING.data,cleared,depth);}
function relicMoney144_(base,r){return Math.floor(base*Math.max(1,r.cleared)*(1+.1*(r.floor-1)));}
function relicPublic144_(r){if(!r)return null;const x=JSON.parse(JSON.stringify(r));delete x.pools;delete x.catalog;delete x.config;delete x.lastRequest;for(const o of x.offers||[])delete o.hidden;return x;}
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
function relicReward144_(type,id,quantity,name,sockets=null,r=null){
 const o={type,id,quantity,name};if(type==='EQUIPMENT'){const src=r.catalog.Equipment.find(x=>x.ItemID===id);if(!src)throw Error('裝備資料不存在');o.item=makeEquipmentInstanceFromRow_(src);o.item.sockets=sockets;o.item.gems=Array(sockets).fill(null);o.name=src.Name;}
 if(type==='GEM'){const src=r.catalog.Gems.find(x=>x.GemID===id);if(!src)throw Error('寶石資料不存在');o.item=makeGemInstanceFromRow_(src);o.name=src.Name;}return o;
}
function relicBox144_(r){
 const n=Math.random(),boss=r.floor===10;
 if(boss){if(n<.85){const sockets=n<.7?0:n<.8?1:2;return relicReward144_('EQUIPMENT',relicPick144_(r.pools.BOSS_EQUIPMENT),1,'裝備',sockets,r);}if(n<.9)return relicReward144_('GEM','goldenDragon',1,'黃金巨龍寶石',null,r);if(n<.95)return relicReward144_('ENHANCEMENT','legendaryHammer',10,'傳說之槌');return relicReward144_('GOLD','gold',relicMoney144_(1000,r),'金幣');}
 if(n<.5)return relicReward144_('GOLD','gold',relicMoney144_(relicRand144_(30,50),r),'金幣');
 if(n<.65){const s=Math.random();return relicReward144_('EQUIPMENT',relicPick144_(r.pools.EQUIPMENT||r.pools.WEAPON),1,'裝備',s<.85?0:s<.99?1:2,r);}
 if(n<.8)return relicReward144_('CONSUMABLE','luckyBox',10,'神運寶盒');if(n<.95)return relicReward144_('GEM',relicPick144_(r.pools.GEM),1,'寶石',null,r);return relicReward144_('ENHANCEMENT','legendaryHammer',5,'傳說之槌');
}
function relicOffers144_(r){
 const roll=Math.random(),gold=roll<.02?relicReward144_('ENHANCEMENT','legendaryHammer',1,'傳說之槌'):roll<.04?relicReward144_('CONSUMABLE','wargodBox',10,'榮耀寶盒'):roll<.06?relicReward144_('CONSUMABLE','luckyBox',5,'神運寶盒'):relicReward144_('GOLD','gold',relicMoney144_(relicRand144_(Number(r.config.GoldMin),Number(r.config.GoldMax)),r),'金幣');
 if(r.floor<=2)return [relicReward144_('STONE','stone',relicMoney144_(relicRand144_(Number(r.config.StoneMin),Number(r.config.StoneMax)),r),'強化石'),gold];
 const curse=r.floor===10?null:relicPick144_(r.curseCatalog.filter(x=>!r.curses.includes(x.CurseID)));
 return [{type:'BOX',name:r.floor===10?'王關寶箱':'詛咒寶箱',curse,hidden:relicBox144_(r)},gold];
}
function relicHealGain144_(stat){
 let legacy=0;for(const it of stat.equipped||[])for(const source of [it,...(it.gems||[]).filter(Boolean)]){for(const key of String(source.effect||'').split(/[|,;\n]+/)){const m=key.match(/^healing_received_(\d+(?:\.\d+)?)$/);if(m&&legacy===0)legacy=Number(m[1]);}}
 return Number(stat.petHealing297||0)+legacy+(stat.keys||[]).reduce((n,k)=>n+Number(String(k).match(/^fx_healing_gain_percent_(\d+(?:\.\d+)?)$/)?.[1]||0),0);
}
function relicBuildCombat144_(r,maxHp){
 const e=r.enemies[r.floor],b={floor:0,relic144:true,relicId144:r.id,relicFloor144:r.floor,relicCurses144:[...r.curses],enemyKey:'relic_'+e.id,enemyData:{...e,boss:e.id==='dragon',scaleMultiplier:Number(e.scaleMultiplier)||relicScale144_(r.cleared,r.floor)},enemyHp:e.hp,playerHp:Math.min(r.hp,maxHp),turn:1,cooldowns:{...r.cooldowns},poison:0,burning:0,enemyPoison:0,enemyBurning:0,enemyBonusPatk:0,enemyBonusDef:0,enemyPatkDownTurns:0,enemyPatkDownRate:0,healBlockTurns:0,stunTurns:0,invincibleTurns:0,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},behaviorTriggered:{},phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,won:false,lost:false};
 if(e.id==='golem'){b.enemyMirrorShieldHp=Math.floor(e.hp*.25);b.enemyMirrorShieldMax=b.enemyMirrorShieldHp;b.enemyMirrorShieldTurns=999;}
 for(const sk of r.skillNames)if(r.curses.includes('startcd'))b.cooldowns[sk]=Math.max(1,b.cooldowns[sk]||0);return b;
}
async function relic144Api(body){
 const auth=requireAuth_(body.sessionToken),account=auth.accountId,act=String(body.action).split('/')[1];
 const loaded=await secureRpc78('game_relic_read144',{p_account:account,p_run:body.runId||null});let r=loaded.run;
 const respond=async extra=>{const out={ok:true,run:relicPublic144_(r),...extra};if(r?.closed){const rec=await findRowByValue_(DB.SAVES,'AccountID',account);out.accountId=account;out.save=await parseSaveRecord_(rec);out.revision=Number(rec.Revision);}return out;};
 if(act==='status'){let available=true,reason='';try{relicPlanning144_();}catch(e){available=false;reason=e.message;}return respond({available,reason});}
 if(act==='start'){
  if(r&&!r.closed)return respond({});const p=relicPlanning144_(),rec=await findRowByValue_(DB.SAVES,'AccountID',account),save=await parseSaveRecord_(rec),stats=secureStats78(save,secureRules78()).stats;
  const deck=p.enemies.filter(e=>e.EnemyID!=='dragon');for(let i=deck.length-1;i>0;i--){const j=relicRand144_(0,i);[deck[i],deck[j]]=[deck[j],deck[i]];}
  r={id:Utilities.getUuid(),phase:'ready',floor:1,seq:0,cleared:Math.max(0,Number(save.maxCleared)||0),hp:stats.hp,cooldowns:{},curses:[],loot:[],skills:[...(save.equippedSkills||[])],passive:[...(save.passive||[])],skillNames:(save.equippedSkills||[]).filter(Boolean).map(id=>p.catalog&&arenaPlanningRows_('Skills').find(x=>x.SkillID===id)?.Name||id),...p,curseCatalog:p.curses,enemies:{},lastRequest:body.requestId};r.curses=[];
  [1,2,4,5,7,8,10].forEach((floor,i)=>{const row=floor===10?p.enemies.find(e=>e.EnemyID==='dragon'):deck[i],scale=floor===10?relicBossScale156_(r.cleared,floor):relicScale144_(r.cleared,floor),e={id:row.EnemyID,name:row.Name,skill:row.SkillDescription,scaleMultiplier:scale};for(const [k,col]of Object.entries({hp:'HP',def:'DEF',patk:'PATK',matk:'MATK'})){const base=floor===10?Number(p.config['Dragon'+col]):relicRand144_(Number(p.config[col+'Min']),Number(p.config[col+'Max']));e[k]=relicValue277_(base,scale);}r.enemies[floor]=e;});
  const saved=await secureRpc78('game_relic_put144',{p_account:account,p_run:r.id,p_seq:-1,p_data:r,p_request:body.requestId,p_finish:false,p_save:null,p_expected:null});r=saved.run;return respond({});
 }
 if(!r)throw Error('找不到進行中的探險');if(r.closed)return respond({});if(r.lastRequest===body.requestId)return respond({});if(Number(body.sequence)!==r.seq)throw Error('探險進度已改變，請重新讀取');
 if(act==='equip'){
  if(!['ready','between','camp'].includes(r.phase))throw Error('只能在整備時更換裝備');const hp=Number(body.hp);if(!Number.isFinite(hp)||hp<=0)throw Error('剩餘HP無效');const rec=await findRowByValue_(DB.SAVES,'AccountID',account),save=await parseSaveRecord_(rec);r.hp=Math.min(r.hp,hp,secureStats78(save,secureRules78()).stats.hp);
 }else if(act==='battle'){
  if(r.phase!=='ready')throw Error('目前不能開始戰鬥');
  const rec=await findRowByValue_(DB.SAVES,'AccountID',account),save=await parseSaveRecord_(rec);const selected=secureStats78(save,secureRules78());r.skills=[...(save.equippedSkills||[])];r.passive=[...(save.passive||[])];r.skillNames=(selected.skills?.active||[]).map(x=>x.name);
  const stats=secureStats78(save,secureRules78()).stats;const remaining=Number(body.hp??r.hp);if(!Number.isFinite(remaining)||remaining<=0)throw Error('剩餘HP無效');r.hp=Math.min(r.hp,stats.hp,remaining);r.combat=relicBuildCombat144_(r,stats.hp);r.phase='battle';
 }else if(act==='progress'||act==='victory'||act==='death'){
  if(r.phase!=='battle')throw Error('目前沒有戰鬥');const c=body.combat,e=r.enemies[r.floor];
  if(!c||c.relicId144!==r.id||c.relicFloor144!==r.floor||!c.relic144||!Number.isFinite(c.playerHp)||!Number.isFinite(c.enemyHp)||c.enemyHp>e.hp||!Number.isInteger(c.turn)||c.turn<1||c.turn>1000||c.turn<Number(r.combat?.turn||1))throw Error('探險戰鬥進度無效');
  const rec=await findRowByValue_(DB.SAVES,'AccountID',account),save=await parseSaveRecord_(rec),hp=secureStats78(save,secureRules78()).stats.hp;if(c.playerHp>hp)throw Error('玩家HP超過上限');
  r.hp=Math.max(0,c.playerHp);r.cooldowns=c.cooldowns||{};r.combat={...c,enemyData:{...e,boss:e.id==='dragon'},relicCurses144:[...r.curses]};delete r.combat.relicBusy144;
  if(act==='victory'){if(c.enemyHp>0||c.playerHp<=0)throw Error('尚未擊敗守衛');r.phase='reward';r.offers=relicOffers144_(r);r.combat=null;}
  if(act==='death'){if(c.playerHp>0)throw Error('玩家尚未戰敗');r.closed=true;r.phase='failed';r.loot=[];r.combat=null;}
 }else if(act==='choose'){
  if(r.phase!=='reward'||![0,1].includes(body.choice))throw Error('獎勵選擇無效');const o=r.offers[body.choice];r.lastLoot=o.type==='BOX'?o.hidden:o;r.loot.push(r.lastLoot);if(o.curse)r.curses.push(o.curse.CurseID);r.phase=o.type==='BOX'?'chest':'between';r.offers=null;
 }else if(act==='reveal'){
  if(r.phase!=='chest')throw Error('目前沒有寶箱');r.phase='between';
 }else if(act==='advance'){
  if(r.phase!=='between'||r.floor===10)throw Error('目前不能深入');r.floor++;r.phase=[3,6,9].includes(r.floor)?'camp':'ready';
 }else if(act==='camp'){
  if(r.phase!=='camp'||!['heal','cooldown','cleanse'].includes(body.choice))throw Error('補給選擇無效');
  if(body.choice==='cleanse'){if(!r.curses.includes(body.curse))throw Error('沒有可解除的詛咒');r.curses=r.curses.filter(x=>x!==body.curse);}
  if(body.choice==='cooldown')for(const k of Object.keys(r.cooldowns))r.cooldowns[k]=Math.max(0,Number(r.cooldowns[k])-2);
  if(body.choice==='heal'&&!r.curses.includes('noheal')){const rec=await findRowByValue_(DB.SAVES,'AccountID',account),save=await parseSaveRecord_(rec),max=secureStats78(save,secureRules78()).stats.hp;const gain=relicHealGain144_(secureStats78(save,secureRules78()));r.hp=Math.min(max,r.hp+Math.floor(max*.3*(r.curses.includes('healing')?.2:1)*(1+gain/100)));}
  r.floor++;r.phase='ready';
 }else if(act==='retreat'){
  if(r.phase==='battle')throw Error('戰鬥中無法帶走獎勵結算，請先完成戰鬥或保存並離開');if(!['ready','between','camp'].includes(r.phase))throw Error('請先完成獎勵選擇與開箱');r.closed=true;r.phase='escaped';r.combat=null;
 }else throw Error('不支援的探險操作');
 let save=null,expected=null;
 if(r.closed&&r.phase==='escaped'){
  const rec=await findRowByValue_(DB.SAVES,'AccountID',account);save=await parseSaveRecord_(rec);expected=Number(rec.Revision);if(Number(body.expectedRevision)!==expected)throw Error('SAVE_REVISION_CONFLICT');
  for(const o of r.loot){if(o.type==='EQUIPMENT'){(save.inventory||=[]).push(o.item);}else if(o.type==='GEM'){(save.gems||=[]).push(o.item);}else{const out=await applyAchievementReward_(save,{RewardType:o.type,RewardID:o.id,RewardAmount:o.quantity});if(!out.ok)throw Error(out.error);}}
 }
 r.lastRequest=body.requestId;const result=await secureRpc78('game_relic_put144',{p_account:account,p_run:r.id,p_seq:r.seq,p_data:{...r,seq:r.seq+1},p_request:body.requestId,p_finish:!!r.closed,p_save:save,p_expected:expected});r=result.run;return respond({});
}

function extremeConfig130Server(){
 const rows=arenaPlanningRows_('ExtremeConfig'),m=Object.fromEntries(rows.map(r=>[r.Key,r.Value]));
 if(!rows.length||!toBool_(m.Enabled))throw Error('EXTREME_NOT_AVAILABLE');
 const c={name:String(m.Name||'黑暗史萊姆王'),hp:Number(m.HP),def:Number(m.DEF),patk:Number(m.PATK),matk:Number(m.MATK),growth:Number(m.Growth),shieldRate:Number(m.ShieldRate)};
 if(!['hp','def','patk','matk'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0)||c.hp<1||!Number.isFinite(c.growth)||c.growth<=1||c.growth>2||!Number.isFinite(c.shieldRate)||c.shieldRate<0||c.shieldRate>1)throw Error('EXTREME_CONFIG_INVALID');return c;
}
async function extreme130Api(body){
 const auth=requireAuth_(body.sessionToken),account=auth.accountId,action=body.action;
 const catalog={stageRows:arenaPlanningRows_('ExtremeStageRewards').filter(r=>toBool_(r.Enabled)),rankRows:arenaPlanningRows_('ExtremeRankRewards').filter(r=>toBool_(r.Enabled))};
 for(const row of [...catalog.stageRows,...catalog.rankRows]){const t=String(row.RewardType||'').toUpperCase(),q=Number(row.Quantity);if(!row.RewardKey||!['EQUIPMENT','GEM','CONSUMABLE','ENHANCEMENT','GOLD','STONE','TITLE','SKILL'].includes(t)||!Number.isSafeInteger(q)||q<1||q>999999||['EQUIPMENT','GEM'].includes(t)&&q>1000)throw Error('EXTREME_REWARD_INVALID');}
 await secureRpc78('game_extreme_catalog132',{p_version:String(EDGE_PLANNING.dataVersion),p_catalog:catalog});
 if(action==='extreme/status'){const season=arenaSeasonInfo_(),r=await secureRpc78('game_extreme_status130',{p_account:account,p_season:season.seasonId});return {...r,season:r.season||season};}
 if(action==='extreme/start'){
  const rec=await findRowByValue_(DB.SAVES,'AccountID',account);if(!rec)throw Error('SAVE_NOT_FOUND');const save=await parseSaveRecord_(rec),config=extremeConfig130Server(),season=arenaSeasonInfo_();
  const rankRanges=arenaRewardTiers57_(season.seasonId);
  const rankRows=arenaPlanningRows_('ExtremeRankRewards').filter(r=>toBool_(r.Enabled)&&rankRanges.some(x=>Number(x.RankMin)===Number(r.RankMin)&&Number(x.RankMax)===Number(r.RankMax))),stageRows=arenaPlanningRows_('ExtremeStageRewards').filter(r=>toBool_(r.Enabled));
  for(const r of [...rankRows,...stageRows]){if(!r.RewardKey||!['EQUIPMENT','GEM','CONSUMABLE','GOLD','STONE','TITLE','SKILL','ENHANCEMENT'].includes(String(r.RewardType).toUpperCase())||!Number.isSafeInteger(Number(r.Quantity))||Number(r.Quantity)<1||Number(r.Quantity)>999999||['EQUIPMENT','GEM'].includes(String(r.RewardType).toUpperCase())&&Number(r.Quantity)>1000)throw Error('EXTREME_REWARD_INVALID');}
  const snapshot={config,stats:secureStats78(save,secureRules78()).stats,planningVersion:EDGE_PLANNING.dataVersion,stageRows};
  return secureRpc78('game_extreme_start130',{p_account:account,p_request:body.requestId,p_snapshot:snapshot,p_season:{...season,rankRows,rankRanges}});
 }
 if(action==='extreme/progress'){
  const c=body.combat;if(!c||c.extremeId130!==body.runId||!c.extreme130||!Number.isSafeInteger(Number(body.stage))||body.stage<1||!Number.isSafeInteger(Number(body.score))||body.score<0||Number(c.extremeStage130)!==Number(body.stage)||Number(c.extremeScore130)!==Number(body.score))throw Error('EXTREME_PROGRESS_INVALID');
  return secureRpc78('game_extreme_progress130',{p_account:account,p_run:body.runId,p_seq:body.sequence,p_score:body.score,p_stage:body.stage,p_combat:c,p_finish:!!body.finish});
 }
 if(action==='extreme/claim'){
  const info=await secureRpc78('game_extreme_claim_info130',{p_account:account,p_kind:body.kind,p_key:body.key});
  const rec=await findRowByValue_(DB.SAVES,'AccountID',account);if(!rec)throw Error('SAVE_NOT_FOUND');const save=await parseSaveRecord_(rec),revision=Number(rec.Revision);
  if(info.claimed)return{ok:true,duplicate:true,accountId:account,save,revision};
  if(Number(body.expectedRevision)!==revision)throw Error('SAVE_REVISION_CONFLICT');
  for(const row of info.rewards){const result=await applyAchievementReward_(save,{RewardType:row.RewardType,RewardID:row.RewardID,RewardAmount:row.Quantity});if(!result.ok)throw Error(result.error||'EXTREME_REWARD_INVALID');}
  return secureRpc78('game_extreme_claim130',{p_account:account,p_kind:body.kind,p_key:body.key,p_expected:revision,p_save:save});
 }
 throw Error('ACTION_NOT_SUPPORTED');
}

// Server-only, template-driven GIFT extension. Other gift RPCs remain unchanged.
function chaosCatalog332(data,version){
 const enabled=r=>r.Enabled!==false&&!['false','0'].includes(String(r.Enabled).toLowerCase());
 const box=(data.GiftBoxes||[]).find(r=>r.BoxID==='chaosBox'&&enabled(r));
 if(!box||!(data.Consumables||[]).some(r=>r.ContentID==='chaosBox'&&r.Kind==='gift'&&enabled(r)))throw Error('GIFTBOX_RULES_INVALID');
 const seen=new Set(),seenRewards=new Set(),all=(data.GiftBoxRewards||[]).filter(r=>r.BoxID==='chaosBox'&&enabled(r));
 const tiers=(data.GiftBoxTiers||[]).filter(r=>r.BoxID==='chaosBox'&&enabled(r)).sort((a,b)=>Number(a.SortOrder)-Number(b.SortOrder)).map(t=>{
  const probability=Number(t.Probability);if(!t.TierID||seen.has(t.TierID)||!Number.isFinite(probability)||probability<=0||probability>1)throw Error('GIFTBOX_RULES_INVALID');seen.add(t.TierID);
  const rewards=all.filter(r=>r.TierID===t.TierID).map(r=>{
   const type=String(r.ContentType).toUpperCase(),quantity=Number(r.Quantity),weight=Number(r.Weight),sockets=Number(r.Sockets||0);
   if(!r.RewardID||seenRewards.has(r.RewardID)||!['EQUIPMENT','GEM','GOLD','CONSUMABLE'].includes(type)||!Number.isSafeInteger(quantity)||quantity<1||quantity>2147483647||!Number.isFinite(weight)||weight<=0||weight>1000000||!Number.isInteger(sockets)||sockets<0||sockets>2||type!=='EQUIPMENT'&&sockets!==0||['EQUIPMENT','GEM'].includes(type)&&quantity!==1)throw Error('GIFTBOX_RULES_INVALID');seenRewards.add(r.RewardID);
   const ids=String(r.ContentIDs||'').split(',');if(!ids.length||new Set(ids).size!==ids.length)throw Error('GIFTBOX_RULES_INVALID');
   const choices=ids.map(id=>{
    if(!id||id.trim()!==id)throw Error('GIFTBOX_RULES_INVALID');let template,name;
    if(type==='GOLD'){if(id!=='gold')throw Error('GIFTBOX_RULES_INVALID');name='金幣';}
    else {const table=type==='EQUIPMENT'?'Equipment':type==='GEM'?'Gems':'Consumables',key=type==='EQUIPMENT'?'ItemID':type==='GEM'?'GemID':'ContentID';const matches=(data[table]||[]).filter(r=>r[key]===id&&enabled(r));if(matches.length!==1)throw Error('GIFTBOX_RULES_INVALID');template=matches[0];name=template.Name;
     if(type==='CONSUMABLE'&&(!['petExpPotion','chaosPetEgg'].includes(id)||(id==='chaosPetEgg'?template.Kind!=='gift':template.Kind==='gift')))throw Error('GIFTBOX_RULES_INVALID');}
    if(!name)throw Error('GIFTBOX_RULES_INVALID');return {id,name,template};
   });return {rewardId:r.RewardID,type,quantity,weight,sockets,choices};
  });if(!rewards.length)throw Error('GIFTBOX_RULES_INVALID');return {tierId:t.TierID,name:t.Name,probability,jackpot:t.IsJackpot===true||String(t.IsJackpot).toLowerCase()==='true',rewards};
 });
 if(!tiers.length||Math.abs(tiers.reduce((n,t)=>n+t.probability,0)-1)>1e-10||all.some(r=>!seen.has(r.TierID)))throw Error('GIFTBOX_RULES_INVALID');
 return {ok:true,boxId:'chaosBox',name:box.Name,description:box.Description,version,tiers};
}
function chaosPick332(rows,key,rng){const total=rows.reduce((n,r)=>n+r[key],0);let n=rng()*total;for(const r of rows){n-=r[key];if(n<0)return r;}return rows.at(-1);}
function chaosDraw332(save,catalog,quantity,rng){
 if(![1,10].includes(quantity))throw Error('GIFTBOX_QUANTITY_INVALID');
 if(!Number.isSafeInteger(save.consumables?.chaosBox)||save.consumables.chaosBox<quantity)throw Error('GIFTBOX_EMPTY');
 save.inventory||=[];save.gems||=[];save.skillsOwned||=[];const results=[];
 for(let i=0;i<quantity;i++){
  const tier=chaosPick332(catalog.tiers,'probability',rng),r=chaosPick332(tier.rewards,'weight',rng),c=r.choices[Math.min(r.choices.length-1,Math.floor(rng()*r.choices.length))];let item;
  if(r.type==='EQUIPMENT'){item=makeEquipmentInstanceFromRow_(c.template);item.stats.critDamage=Number(c.template.CritDamage)||0;item.sockets=r.sockets;item.gems=Array(r.sockets).fill(null);item.dropSource='gift';save.inventory.push(item);}
  else if(r.type==='GEM'){item=makeGemInstanceFromRow_(c.template);save.gems.push(item);}
  else if(r.type==='GOLD'){const next=Number(save.gold||0)+r.quantity;if(!Number.isSafeInteger(next))throw Error('GIFTBOX_BALANCE_OVERFLOW');save.gold=next;}
  else {const next=Number(save.consumables[c.id]||0)+r.quantity;if(!Number.isSafeInteger(next))throw Error('GIFTBOX_BALANCE_OVERFLOW');save.consumables[c.id]=next;if(!save.skillsOwned.includes(c.id))save.skillsOwned.push(c.id);}
  results.push({type:r.type,id:c.id,name:c.name,quantity:r.quantity,sockets:r.sockets,tierId:tier.tierId,tierName:tier.name,jackpot:tier.jackpot,...(item?{item}:{})});
 }
 save.consumables.chaosBox-=quantity;return results;
}
async function chaosApi332(body){
 const auth=requireAuth_(body.sessionToken);if(body.boxId!=='chaosBox')throw Error('GIFTBOX_RULES_INVALID');
 const data=secureRules78();
 if(body.action==='chaos/catalog')return chaosCatalog332(data,EDGE_PLANNING.dataVersion);
 if(body.action!=='chaos/open'||!/^[a-zA-Z0-9_-]{8,100}$/.test(String(body.requestId||'')))throw Error('GIFTBOX_REQUEST_INVALID');
 const previous=await secureRpc78('game_chaos_receipt332',{p_account:auth.accountId,p_request:body.requestId,p_body:body});if(previous?.ok)return previous;
 const rec=await findRowByValue_(DB.SAVES,'AccountID',auth.accountId);if(!rec)throw Error('SAVE_NOT_FOUND');
 const revision=Number(rec.Revision),save=await parseSaveRecord_(rec);
 if(Number(body.expectedSaveRevision)!==revision)throw Error('SAVE_REVISION_CONFLICT');
 if(body.planningVersion!==EDGE_PLANNING.dataVersion)throw Error('GIFTBOX_PLANNING_CHANGED');
 const catalog=chaosCatalog332(data,EDGE_PLANNING.dataVersion),quantity=Number(body.quantity);
 const active=await UrlFetchApp.fetch(EDGE_BASE+'/rest/v1/game_battles78?account_id=eq.'+encodeURIComponent(auth.accountId)+'&finished_at=is.null&select=battle_id&limit=1',{method:'get'});
 if(active.getResponseCode()>=400)throw Error('GIFTBOX_BATTLE_CHECK_FAILED');if(JSON.parse(active.getContentText()).length||save.currentBattle&&!save.currentBattle.won&&!save.currentBattle.lost)throw Error('GIFTBOX_BATTLE_ACTIVE');
 const results=chaosDraw332(save,catalog,quantity,petRandom297);
 return secureRpc78('game_chaos_apply332',{p_account:auth.accountId,p_request:body.requestId,p_expected:revision,p_body:body,p_save:save,p_result:{results}});
}

async function dispatchGate411_(body){
 if(/^(battle\/(start|finish)|relic\/|extreme\/)/.test(String(body.action||''))&&Number(body.clientEpoch411)!==411)throw Error('CLIENT_UPDATE_REQUIRED_411');
 RPG411.validate(EDGE_PLANNING.data);
 if(!body.sessionToken)return;
 const auth=requireAuth_(body.sessionToken),rec=await findRowByValue_(DB.SAVES,'AccountID',auth.accountId);
 if(!rec)return;
 const save=await parseSaveRecord_(rec);if(Number(save.mainProgressEpoch)!==411)throw Error('MAIN_PROGRESS_VERSION_CHANGED');
 const action=String(body.action||''),mode=action.startsWith('relic/')?'Relic':action.startsWith('extreme/')?'Extreme':action.startsWith('arena/')?'Arena':action.startsWith('worldboss/')?'WorldBoss':/boxing/.test(action)?'Boxing':body.selection?.mode==='dungeon'?'Dungeon':null;
 if(mode&&Number(save.maxCleared||0)<Number(RPG411.cfg(EDGE_PLANNING.data,mode+'UnlockFloor',999)))throw Error('MODE_NOT_UNLOCKED');
}
return {dispatch:async(body)=>(await dispatchGate411_(body), dispatch411_(body)),read:async(body)=>doGet({parameter:body}),initialSave:makeInitialSave_,legacyHash:hashPassword_,boxingJobs:async()=>({boxing:await settleEndedBoxingSeasons()}),jobs:async()=>({boxing:await settleEndedBoxingSeasons(),worldboss:await cleanupExpiredWorldBossData()})};
async function dispatch411_(body){return String(body.action||'').startsWith('quest/')?questApi368(body):String(body.action||'').startsWith('chaos/')?chaosApi332(body):String(body.action||'').startsWith('pet/')?petApi297(body):String(body.action||'').startsWith('relic/')?relic144Api(body):String(body.action||'').startsWith('extreme/')?extreme130Api(body):["battle/status","battle/cancel"].includes(body.action)?secureRecovery79(body):["battle/start","battle/finish"].includes(body.action)?secureBattle78(body):doPost({postData:{contents:JSON.stringify(body)}});}
}

const BATTLE_RULES_FALLBACK78={};
function secureStats78(save,rules){
const state=JSON.parse(JSON.stringify(save));state.currentBattle=null;const clone=x=>JSON.parse(JSON.stringify(x));const cfgNum=(k,d)=>Number((rules.GameConfig||[]).find(x=>x.Key===k)?.Value??d);const passiveSuppressed_=()=>false;const defaultStatusEffects={},statusEffects={};const skillTemplates={"adventurerAptitude":{"name":"冒險者資質","type":"passive","price":0,"desc":"物攻高於魔攻時，造成的物理傷害 +5%；魔攻高於物攻時，造成的魔法傷害 +5%；兩者相同時，物理與魔法傷害皆 +5%。"},"mageAptitude":{"name":"魔法師的資質","type":"passive","price":5,"desc":"魔攻達到 25 以上時，造成的魔法傷害增加 10%。"},"assassinAptitude":{"name":"刺客的資質","type":"passive","price":5,"desc":"爆擊率 +15%、物攻 +1。"},"assassinAptitudeII":{"name":"刺客的資質II","type":"passive","price":0,"unlockFloor":81,"desc":"爆擊率 +15%、物攻 +10、爆擊傷害 +25%。","kind":"assassinAptitudeII","value":10,"mult":25,"requires":"assassinAptitude","upgradeFrom":"assassinAptitude"},"shadowThrust":{"name":"暗影突刺","type":"active","cd":3,"price":0,"unlockFloor":81,"desc":"造成物攻 ×300% 物理傷害；若爆擊傷害達到 300% 以上，本技能係數提升至物攻 ×1000%。","kind":"physical","mult":3,"breakMult":10},"slash":{"name":"砍擊","type":"active","cd":1,"desc":"造成物攻 × 120% 的物理傷害","kind":"physical","mult":1.2},"magicMissile":{"name":"魔法彈","type":"active","cd":1,"price":5,"desc":"造成魔攻 × 100% 的魔法傷害","kind":"magic","mult":1},"magicBurst":{"name":"魔力爆發","type":"active","cd":4,"price":600,"kind":"magicBurst","mult":2,"hits":2,"unlockFloor":91,"desc":"造成當前魔導層數 + 2 次魔攻 × 200% 的魔法傷害，本次不消耗魔導。"},"magicMissileII":{"name":"魔法彈II","type":"active","cd":1,"price":20,"desc":"連續造成 2 次魔攻 × 75% 的魔法傷害","kind":"magicMulti","mult":0.75,"hits":2,"requires":"magicMissile","upgradeFrom":"magicMissile"},"heal":{"name":"恢復術","type":"active","cd":3,"price":5,"desc":"立即恢復 20 HP，之後每回合恢復 10 HP，持續 3 回合","kind":"heal","value":20,"regen":10,"duration":3},"healII":{"name":"恢復術II","type":"active","cd":2,"price":20,"desc":"立即恢復 30 HP，之後每回合恢復 15 HP，持續 2 回合","kind":"heal","value":30,"regen":15,"duration":2,"requires":"heal","upgradeFrom":"heal"},"adrenaline":{"name":"腎上腺素","type":"active","cd":5,"price":5,"desc":"2回合物攻 +10，並造成一次物攻×100%物理傷害","kind":"buffPatk","value":10,"duration":2},"manaSense":{"name":"魔力感知","type":"active","cd":5,"price":5,"desc":"2回合魔攻 +5，並造成一次魔攻×100%魔法傷害","kind":"buffMatk","value":5,"duration":2},"enhancedConstitution":{"name":"增強體能","type":"passive","price":20,"desc":"物攻達到 30 以上時，防禦 +5，且【砍擊】係數提升至 180%。","kind":"enhancedConstitution","mult":1.8,"value":5},"explosiveMagic":{"name":"爆裂魔彈","type":"active","cd":3,"price":30,"desc":"造成魔攻 × 150% 魔法傷害，並賦予敵人【燃燒】1 層","kind":"explosiveMagic","mult":1.5},"magicShield":{"name":"魔力光盾","type":"active","cd":3,"price":10,"desc":"產生魔攻 × 120% 的護盾，持續 2 回合；護盾被擊破時造成魔攻 × 100% 魔法傷害","kind":"magicShield","shieldMult":1.2,"breakMult":1,"duration":2},"magicSlash":{"name":"魔力斬擊","type":"active","cd":1,"price":40,"unlockFloor":21,"desc":"造成物攻 × 30% 物理傷害；若本次爆擊，額外造成魔攻 × 180% 魔法傷害。","kind":"magicSlash","physicalMult":0.3,"magicCritMult":1.8},"magicSwordsmanAptitude":{"name":"魔劍士的資質","type":"passive","price":60,"unlockFloor":21,"desc":"HP +5、防禦 +5、物攻 +5、魔攻 +5、爆擊率 +5%。"},"magicSwordsmanAptitudeII":{"name":"魔劍士的資質II","type":"passive","price":600,"desc":"HP +10%、防禦 +10%、物攻 +10%、魔攻 +10%、爆擊率 +10%。若自身物攻 ≥ 魔攻的85%，【魔力斬擊II】物理傷害係數由物攻 ×30%提升至物攻 ×200%。","kind":"magicSwordsmanAptitudeII","requires":"magicSwordsmanAptitude","upgradeFrom":"magicSwordsmanAptitude"},"fullPreparation":{"name":"萬全準備","type":"active","cd":5,"price":60,"unlockFloor":21,"desc":"獲得最大 HP × 20% 護盾，並使物攻、魔攻 +10%、爆擊率 +10%，持續 3 回合。","kind":"fullPreparation","shieldHpMult":0.2,"duration":3},"bloodSlash":{"name":"噬血斬擊","type":"active","cd":2,"price":50,"unlockFloor":21,"desc":"造成物攻 × 200% 物理傷害，並恢復實際造成傷害的 25% HP。","kind":"bloodSlash","mult":2,"lifeSteal":0.25},"absoluteDefense":{"name":"絕對防禦","type":"active","cd":5,"price":80,"unlockFloor":61,"desc":"防禦 +100，並獲得最大 HP ×20% 護盾，持續 2 回合。","kind":"defShield","value":100,"shieldMult":0.2,"duration":2},"blessingRain":{"name":"祝福之雨","type":"active","cd":5,"price":80,"unlockFloor":61,"desc":"解除自身 1 個異常效果，並獲得【祝福】2 回合。","kind":"blessingRain","value":1,"duration":2},"charge":{"name":"蓄力","type":"active","cd":4,"price":80,"unlockFloor":61,"desc":"防禦 +50，並使物攻與魔攻 +50%，持續 2 回合。","kind":"charge","value":50,"mult":0.5,"duration":2},"haste":{"name":"加速","type":"active","cd":4,"price":100,"unlockFloor":61,"desc":"除【加速】外，所有目前冷卻中的已裝備技能 CD -1 回合。","kind":"haste","value":1},"hasteII":{"name":"加速II","type":"active","cd":3,"price":600,"desc":"除【加速II】外，所有目前冷卻中的已裝備技能 CD -1 回合。","kind":"hasteII","value":1,"requires":"haste","upgradeFrom":"haste"},"mageAptitudeII":{"name":"魔法師的資質II","type":"passive","price":600,"desc":"魔攻達300以上時，魔法攻擊傷害 +15%；若該回合沒有使用攻擊技能，獲得1層【魔導】。發動魔法攻擊技能時消耗所有【魔導】，每層使該技能最終傷害 +15%，最多3層。","kind":"mageAptitudeII","requires":"mageAptitude","upgradeFrom":"mageAptitude"},"magicSlashII":{"name":"魔力斬擊II","type":"active","cd":1,"price":300,"unlockFloor":83,"desc":"造成一次物攻 ×30% 物理傷害；若本次觸發爆擊，額外造成魔攻 ×200% 魔法傷害，並獲得本次總實際傷害15%的護盾，持續1回合。","kind":"magicSlashII","mult":0.3,"value":2,"shieldMult":0.15,"duration":1,"requires":"magicSlash","upgradeFrom":"magicSlash"},"enhancedConstitutionII":{"name":"增強體能II","type":"passive","price":300,"unlockFloor":86,"desc":"物攻達到120以上時，防禦 +75，且【砍擊】係數提升至300%。","kind":"enhancedConstitutionII","mult":3,"value":75,"requires":"enhancedConstitution","upgradeFrom":"enhancedConstitution"},"enhancedConstitutionIII":{"name":"增強體能III","type":"passive","price":500,"desc":"物攻達到300以上時，防禦 +100，且【砍擊】係數提升至300%；使用【砍擊】時，若敵方防禦低於自身物攻25%，追加一次物攻 ×150%物理傷害。本技能最多造成兩次傷害。","kind":"enhancedConstitutionIII","mult":3,"value":100,"breakMult":1.5,"requires":"enhancedConstitutionII","upgradeFrom":"enhancedConstitutionII"},"precisionStrike":{"name":"精準打擊","type":"active","cd":3,"price":0,"unlockFloor":71,"desc":"造成物攻 ×150% 物理傷害，並有50%機率使敵人【破防】2回合；若施放前敵人已處於【破防】，再追加一次物攻 ×180%物理傷害。最多2段傷害。","kind":"precisionStrike","mult":1.5,"value":0.5,"duration":2,"breakMult":1.8},"guts":{"name":"根性","type":"passive","price":0,"unlockFloor":100,"desc":"HP 在 80% 以上時受到致命傷害，本次傷害不會使 HP 低於 1。每回合最多觸發 1 次。","kind":"guts"},"explosiveMagicII":{"name":"爆裂魔彈II","type":"active","cd":4,"price":350,"unlockFloor":89,"desc":"造成魔攻 ×500% 魔法傷害，賦予敵人【燃燒】1層，並有15%機率賦予【暈眩】1回合。","kind":"explosiveMagicII","mult":5,"value":0.15,"requires":"explosiveMagic","upgradeFrom":"explosiveMagic"},"redPotion":{"name":"紅藥水","type":"item","price":100,"desc":"恢復 50% 最大 HP","kind":"redPotion","consumable":true},"eyeDrops":{"name":"眼藥水","type":"item","price":150,"desc":"解除所有異常效果（暈眩除外）","kind":"eyeDrops","consumable":true},"sacrificeGoat":{"name":"替罪羊","type":"item","price":200,"desc":"受到致死傷害時，自動消耗一個替罪羊並發動：該致死傷害無效，並獲得一回合【無敵】。","kind":"sacrificeGoat","consumable":true,"auto":true},"poisonItem":{"name":"毒藥","type":"item","price":50,"desc":"降低敵人物攻 20%，持續 2 回合，並賦予敵人 1 層【中毒】。","kind":"poisonItem","consumable":true}};const itemTemplates={},gemTemplates={};const enhancementTable=[null,{"stone":1,"rate":1,"multi":1.1},{"stone":2,"rate":0.95,"multi":1.2},{"stone":3,"rate":0.85,"multi":1.3},{"stone":4,"rate":0.7,"multi":1.4},{"stone":5,"rate":0.5,"multi":1.5},{"stone":6,"rate":0.3,"multi":1.6},{"stone":7,"rate":0.15,"multi":1.7},{"stone":8,"rate":0.05,"multi":1.8},{"stone":9,"rate":0.02,"multi":1.9},{"stone":10,"rate":0.01,"multi":2}];
const num=v=>v==null||v===''?0:Number(v);const stats=r=>Object.fromEntries(['HP','DEF','PATK','MATK','Crit','CritDamage'].map(k=>[k==='HP'?'hp':k==='DEF'?'def':k==='PATK'?'patk':k==='MATK'?'matk':k==='Crit'?'crit':'critDamage',num(r[k])]));
for(const r of rules.Equipment||[])itemTemplates[r.ItemID]={name:r.Name,slot:r.Slot,stats:stats(r),effect:r.EffectKey||''};for(const r of rules.Gems||[])gemTemplates[r.GemID]={name:r.Name,stats:stats(r),effect:r.EffectKey||''};for(const r of rules.Skills||[])skillTemplates[r.SkillID]={...skillTemplates[r.SkillID],name:r.Name,type:r.Type||skillTemplates[r.SkillID]?.type||'active',effectKey:r.EffectKey||'',value:r.Value==null||r.Value===''?skillTemplates[r.SkillID]?.value:Number(r.Value),mult:r.Multiplier==null||r.Multiplier===''?skillTemplates[r.SkillID]?.mult:Number(r.Multiplier)};for(const r of rules.Enhancement||[])if(Number(r.TargetLevel)>=1&&Number(r.TargetLevel)<=10)enhancementTable[Number(r.TargetLevel)]={multi:Number(r.StatMultiplier)};
function totalStats(){
  const s=clone(state.base);
  for(const k of Object.keys(state.talentSpent)){
    if(k==='hp')s.hp+=state.talentSpent[k]*10;
    else s[k]+=state.talentSpent[k];
  }
  for(const item of equippedItems()){
    const x=enhancedStats(item);
    for(const k of Object.keys(x))s[k]=(s[k]||0)+x[k];
  }
  const passiveEnabled=!(state.currentBattle&&passiveSuppressed_());
  if(passiveEnabled && state.passive?.[0]==='enhancedConstitution' && s.patk>=30){
    s.def+=Number(skillTemplates.enhancedConstitution?.value ?? 5);
  }
  if(passiveEnabled && state.passive?.[0]==='enhancedConstitutionII' && s.patk>=120){
    s.def+=Number(skillTemplates.enhancedConstitutionII?.value ?? 75);
  }
  if(passiveEnabled && state.passive?.[0]==='enhancedConstitutionIII' && s.patk>=300){
    s.def+=Number(skillTemplates.enhancedConstitutionIII?.value ?? 100);
  }
  if(passiveEnabled && state.passive?.[0]==='assassinAptitude'){
    s.crit+=15;
  }
  if(passiveEnabled && state.passive?.[0]==='assassinAptitudeII'){
    const sk=skillTemplates.assassinAptitudeII||{};
    s.crit+=15;
    s.critDamage=Number(s.critDamage||100)+Number(sk.mult??15);
  }
  if(passiveEnabled && state.passive?.[0]==='magicSwordsmanAptitude'){
    const v=Number(skillTemplates.magicSwordsmanAptitude?.value ?? 5);
    s.hp+=v;s.def+=v;s.patk+=v;s.matk+=v;s.crit+=v;
  }
  if(passiveEnabled && state.passive?.[0]==='magicSwordsmanAptitudeII'){
    s.hp=Math.max(1,Math.trunc(s.hp*1.10));
    s.def+=10;
    s.patk=Math.trunc(s.patk*1.10);
    s.matk=Math.trunc(s.matk*1.10);
    s.crit+=10;
  }
  // 寶石 MAX HP 百分比效果最後乘算；例如 maxhp_percent_-20 = 最終 MAX HP ×80%。
  s.hp=Math.max(1,Math.trunc(s.hp*equippedMaxHpMultiplier_()));
  fxStats_(s,fxMainKeys_(),{},false);
  s.crit=Math.max(0,Math.min(cfgNum('CritCap',100),s.crit));
  return s;
}
function enhancedStats(item){
  const result={hp:0,def:0,patk:0,matk:0,crit:0,critDamage:0};
  const resolved=resolveItemTemplateStats_(item);
  const multi=item.enhance?enhancementTable[item.enhance].multi:1;
  for(const [k,v] of Object.entries(resolved?.stats||{})){
    result[k]+=Math.trunc(Number(v||0)*multi);
  }
  for(const g of item.gems||[]){
    if(!g)continue;
    const resolvedGem=gemResolved_(g);
    for(const [k,v] of Object.entries(resolvedGem.stats||{})) result[k]+=Number(v||0);
  }
  return result;
}
function resolveItemTemplateStats_(item){
  if(!item)return item;
  if(item.forge172||item.template==='forgeBlank172'||String(item.template).startsWith('forge172_'))return item;
  const t=itemTemplates?.[item.template];
  if(!t)return item;
  // 裝備平衡數值永遠讀取最新 Equipment 模板；
  // 強化等級、寶石、Instance ID 等個體資料仍保留在玩家存檔。
  return {
    ...item,
    name:t.name ?? item.name,
    rarity:t.rarity ?? item.rarity,
    slot:t.slot ?? item.slot,
    price:t.price ?? item.price,
    stats:{...(t.stats||item.stats||{})},
    icon:t.icon ?? item.icon,
    iconSymbol:t.iconSymbol ?? item.iconSymbol,
    effect:item.effect ?? t.effect ?? ''
  };
}
function resolveGemTemplateData_(gem){
  if(!gem)return {};
  const t=gemTemplates?.[gem.template];
  if(!t)return gem;
  return {
    ...gem,
    ...t,
    id:gem.id,
    template:gem.template,
    stats:{...(t.stats||{})}
  };
}
function gemResolved_(gem){
  return resolveGemTemplateData_(gem);
}
function equippedItems(){
  const ids=[
    state.equipment.head,state.equipment.armor,state.equipment.weapon,state.equipment.special,
    ...state.equipment.rings
  ].filter(Boolean);
  return ids.map(id=>state.inventory.find(i=>i.id===id)).filter(Boolean);
}
function equippedMaxHpMultiplier_(){
  // v11.30.8：maxhp_percent_* 是通用裝備效果，不再只讀寶石。
  // 同類百分比採加總後一次套用：例如 5 個 -20% = -100%，最終 MaxHP 由 totalStats() 鉗制為最低 1。
  let totalPct=0;
  const addEffectKeys=(keys)=>{
    for(const key of keys||[]){
      const m=String(key||'').trim().match(/^maxhp_percent_(-?\d+(?:\.\d+)?)$/i);
      if(!m)continue;
      const pct=Number(m[1]);
      if(Number.isFinite(pct))totalPct+=pct;
    }
  };
  for(const item of equippedItems()){
    // 裝備本體：優先最新 Equipment 模板並合併舊實例效果；同一件內相同 Key 不重複計算。
    addEffectKeys(itemEffectKeys_(item));
    // 寶石：每顆都是獨立來源，所以同 Key 的多顆寶石要逐顆累加。
    for(const g of (item.gems||[])){
      if(!g)continue;
      const effect=String(gemResolved_(g).effect||'');
      addEffectKeys(effect.split(/[\n,;|]+/).map(x=>x.trim()).filter(Boolean));
    }
  }
  return Math.max(0,1+totalPct/100);
}
function fxMainKeys_(){
 const keys=[];
 for(const item of equippedItems()){
  keys.push(...itemEffectKeys_(item));
  for(const gem of (item.gems||[]).filter(Boolean))keys.push(...fxSplit_(gemResolved_(gem).effect));
 }
 if(!state.currentBattle||!passiveSuppressed_())keys.push(...fxSkillKeys_(state.passive?.[0]));
 return keys.filter(k=>fxParse_(k));
}
function fxSkillKeys_(id){return fxSplit_(skillTemplates?.[id]?.effectKey).filter(k=>fxParse_(k))}
function fxSplit_(raw){return String(raw||'').split(/[\n,;|]+/).map(x=>x.trim()).filter(Boolean)}
function fxParse_(key){
 let m;
 if(m=key.match(/^fx_stat_(hp|def|patk|matk|crit|critDamage)_(flat|percent)_(-?\d+(?:\.\d+)?)$/))return {type:'stat',stat:m[1],mode:m[2],n:+m[3],condition:'always'};
 if(m=key.match(/^fx_stat_(def|patk|matk|crit|critDamage)_(flat|percent)_(-?\d+(?:\.\d+)?)_(fullhp|lowhp|no_buff|has_buff|enemy_debuff)$/))return {type:'stat',stat:m[1],mode:m[2],n:+m[3],condition:m[4]};
 if(m=key.match(/^fx_damage_(all|physical|magic)_percent_(-?\d+(?:\.\d+)?)(?:_(fullhp|lowhp|no_buff|has_buff|enemy_debuff|enemy_lowhp))?$/))return {type:'damage',kind:m[1],n:+m[2],condition:m[3]||'always'};
 if(m=key.match(/^fx_reduce_all_percent_(\d+(?:\.\d+)?)(?:_(fullhp|lowhp|no_buff|has_buff))?$/))return {type:'reduce',n:+m[1],condition:m[2]||'always'};
 if(m=key.match(/^fx_(lifesteal|healing_gain|shield_gain|reward_gold|reward_exp)_percent_(\d+(?:\.\d+)?)$/))return {type:m[1],n:+m[2]};
 if(m=key.match(/^fx_cooldown_tick_bonus_(-?\d+)$/))return {type:'tick',n:+m[1]};
 if(m=key.match(/^fx_(turnstart|onhit|oncrit|afterhit|cast)_(heal|shield)_maxhp_(\d+(?:\.\d+)?)(?:_(\d+))?$/))return {type:m[2],event:m[1],n:+m[3],duration:Math.max(1,Math.min(99,+(m[4]||2)))};
 if(m=key.match(/^fx_(turnstart|onhit|oncrit|afterhit|cast)_status_(self|enemy)_([a-z_]+)_(\d+(?:\.\d+)?)_(\d+)_(\d+)$/)){
  if(!Object.prototype.hasOwnProperty.call(defaultStatusEffects,m[3])&&!Object.prototype.hasOwnProperty.call(statusEffects||{},m[3]))return null;
  return {type:'status',event:m[1],target:m[2],status:m[3],chance:Math.max(0,Math.min(100,+m[4]))/100,duration:Math.max(1,Math.min(99,+m[5])),stacks:Math.max(1,Math.min(99,+m[6]))};
 }
 if(m=key.match(/^fx_(turnstart|onhit|oncrit|afterhit|cast)_cooldown_(self|enemy)_(reduce|increase)_(\d+)$/))return {type:'cooldown',event:m[1],target:m[2],mode:m[3],n:Math.min(99,+m[4])};
 if(m=key.match(/^fx_(turnstart|cast)_cleanse_self_debuff_(\d+)$/))return {type:'cleanse',event:m[1],target:'self',n:Math.min(99,+m[2])};
 if(m=key.match(/^fx_cast_dispel_enemy_buff_(\d+)$/))return {type:'dispel',event:'cast',target:'enemy',n:Math.min(99,+m[1])};
 if(m=key.match(/^fx_cast_damage_(physical|magic)_(\d+(?:\.\d+)?)$/))return {type:'castDamage',event:'cast',kind:m[1],n:+m[2]};
 return null;
}
function fxCondition_(condition,ctx={}){
 const hp=Number(ctx.hp||0),max=Math.max(1,Number(ctx.maxHp)||1),enemyHp=Number(ctx.enemyHp||0),enemyMax=Math.max(1,Number(ctx.enemyMaxHp)||1);
 if(condition==='fullhp')return hp>=max;
 if(condition==='lowhp')return hp/max<=.3;
 if(condition==='no_buff')return !ctx.hasBuff;
 if(condition==='has_buff')return !!ctx.hasBuff;
 if(condition==='enemy_debuff')return !!ctx.enemyDebuff;
 if(condition==='enemy_lowhp')return enemyHp/enemyMax<=.3;
 return true;
}
function fxStats_(stats,keys,ctx,conditional=false){
 const before={...stats},flat={},pct={};
 for(const key of keys){const f=fxParse_(key);if(f?.type!=='stat'||(f.condition!=='always')!==conditional||!fxCondition_(f.condition,ctx))continue;const a=f.mode==='flat'?flat:pct;a[f.stat]=(a[f.stat]||0)+f.n;}
 for(const stat of Object.keys(before))stats[stat]=Math.trunc(((Number(before[stat])||0)+(flat[stat]||0))*Math.max(0,1+(pct[stat]||0)/100));
 stats.hp=Math.max(1,stats.hp);stats.crit=Math.max(0,Math.min(100,stats.crit||0));return stats;
}
function itemEffectKeys_(item){
  if(!item)return [];
  // 舊存檔的裝備實例可能沒有最新 EffectKey。
  // 優先使用最新 Equipment 模板，並合併實例上的效果，避免老玩家武器失去新效果。
  const templateEffect=itemTemplates[item.template]?.effect||'';
  const instanceEffect=item.effect||'';
  return [...new Set(
    `${templateEffect}|${instanceEffect}`
      .split(/[\n,;|]+/)
      .map(x=>x.trim())
      .filter(Boolean)
  )];
}
for(const it of state.inventory||[]){const t=itemTemplates[it.template];if(t)it.effect=t.effect||'';}
state.base={hp:cfgNum('BaseHP',100),def:cfgNum('BaseDEF',0),patk:cfgNum('BasePATK',10),matk:cfgNum('BaseMATK',10),crit:cfgNum('BaseCrit',15),critDamage:cfgNum('BaseCritDamage',100),...state.base};const computed=petStat297(totalStats(),save);for(const v of Object.values(computed))if(!Number.isFinite(v)||Math.abs(v)>Number.MAX_SAFE_INTEGER)throw Error('CHARACTER_STATE_INVALID');return {stats:computed,petHealing297:petSum297(save,'healing'),keys:fxMainKeys_(),equipped:equippedItems().map(it=>({...it,...resolveItemTemplateStats_(it),gems:(it.gems||[]).map(g=>g?resolveGemTemplateData_(g):null)})),skills:{active:(state.equippedSkills||[]).filter(Boolean).map(id=>({id,name:skillTemplates[id]?.name||id})),passive:(state.passive||[]).filter(Boolean).map(id=>({id,name:skillTemplates[id]?.name||id}))},skillTemplates};
}

// v446: only audited read paths bypass the legacy cross-player mutation lease.
const readActions446 = new Set(['battle/status', 'quest/status', 'chaos/catalog']);
const traceActions446 = new Set([
 'health','leaderboard','data/version','data/bootstrap','profile/avatar/get','profile/avatar/set','profile/nickname',
 'save/get','save/set','auction/list','auction/create','auction/cancel','auction/buy','auction/my-sales','auction/claim',
 'battle/status','battle/cancel','battle/start','battle/finish','worldboss/status','worldboss/ranking','worldboss/reward/check',
 'worldboss/start','worldboss/submit','worldboss/chest/open','redeem/claim','login-gift/status','login-gift/checkin','login-gift/ack',
 'achievement/claim','boxing/status','boxing/ranking','boxing/start','boxing/submit','boxing/history','boxing/reward/claim',
 'arena/status','arena/defense/upload','arena/matches','arena/battle/start','arena/battle/submit','arena/revenge/list','arena/reports',
 'arena/ranking','arena/reward/claim','quest/status','quest/activity','quest/boxing-start','quest/boxing-finish','quest/openEgg',
 'quest/seen','quest/accept','quest/claim','chaos/catalog','chaos/open','system/tick','system/boxingTick',
 'pet/buy','pet/equip','pet/lock','pet/meta','pet/open','pet/potion','pet/recover-buy','pet/release','pet/train',
 'extreme/status','extreme/start','extreme/progress','extreme/claim',
 'relic/status','relic/start','relic/equip','relic/battle','relic/progress','relic/victory','relic/death',
 'relic/choose','relic/reveal','relic/advance','relic/camp','relic/retreat'
]);
const activeRequests446 = new Map();
export function makeGameApi(env,fetcher=fetch){return async req=>{
 const owner=crypto.randomUUID(),started=Date.now();
 let action='unknown',phase='request',responseStatus=0,lease=null,lastGuard=0;
 const trace=(event,fields={})=>console.info(JSON.stringify({event:'game_api446',kind:event,trace_id:owner,action,phase,elapsed_ms:Date.now()-started,...fields}));
 const origins=(env('GAME_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean),origin=req.headers.get('Origin');
 const cors=origin&&origins.includes(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{};
 const reply=(status,data)=>{responseStatus=status;return Response.json(data,{status,headers:{...cors,'Cache-Control':'no-store','X-Game-Trace-Id':owner,'Access-Control-Expose-Headers':'X-Game-Trace-Id, Retry-After',...(status===429?{'Retry-After':'2'}:{})}})};
 if(!origins.length)return reply(503,{ok:false,error:'SERVER_NOT_CONFIGURED'});
 if(origin&&!origins.includes(origin))return reply(403,{ok:false,error:'ORIGIN_DENIED'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 const readKey=(a,b)=>{if(env(a))return env(a);try{return JSON.parse(env(b)||'{}').default||''}catch{return ''}};
 const base=(env('SUPABASE_URL')||'').replace(/\/+$/,''),key=readKey('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEYS');
 if(!base||!key)return reply(503,{ok:false,error:'SERVER_NOT_CONFIGURED'});
 const headers={apikey:key,'Content-Type':'application/json',...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{})};
 const remote=async(path,options={},timeoutMs=15000)=>{const r=await fetcher(base+path,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(timeoutMs)});const data=await r.json();if(!r.ok){const e=Error(String(data?.message||'DATABASE_REQUEST_FAILED'));e.code=data?.message||'DATABASE_REQUEST_FAILED';e.httpStatus=r.status;throw e;}return data};
 const rpc=(name,body)=>remote('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body)});
 lease=createGameLease446({owner,log:trace,rpc:body=>remote('/rest/v1/rpc/game_edge_lock',{method:'POST',body:JSON.stringify(body)},3000)});
 try{
  const raw=await req.text();if(raw.length>540000)return reply(413,{ok:false,error:'REQUEST_TOO_LARGE'});
  let body;try{body=JSON.parse(raw)}catch{return reply(400,{ok:false,error:'INVALID_REQUEST'})}
  if(!body||typeof body.action!=='string')return reply(400,{ok:false,error:'INVALID_REQUEST'});
  action=traceActions446.has(body.action)?body.action:'unknown';phase='authenticate';
  activeRequests446.set(owner,()=>({trace_id:owner,action,phase,elapsed_ms:Date.now()-started,held:lease.held}));
  trace('request_started');
  const cron=body.action==='system/tick'||body.action==='system/boxingTick';
  const publicActions=new Set(['health','auction/list','data/version','data/bootstrap','leaderboard']);
  let actor=null,token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')||body.sessionToken||'';
  if(cron){if(!env('GAME_CRON_SECRET')||req.headers.get('x-game-cron-secret')!==env('GAME_CRON_SECRET'))return reply(403,{ok:false,error:'FORBIDDEN'});}
  else if(!publicActions.has(body.action)){
   const u=await remote('/auth/v1/user',{headers:{Authorization:'Bearer '+token}});
   if(!u.id||u.is_anonymous||!u.email_confirmed_at)return reply(401,{ok:false,error:'UNAUTHORIZED'});
   const rows=await remote('/rest/v1/game_identity_links?auth_user_id=eq.'+encodeURIComponent(u.id)+'&select=legacy_account_id');
   if(rows.length!==1)return reply(401,{ok:false,error:'ACCOUNT_NOT_LINKED'});
   const accountId=rows[0].legacy_account_id;
   const accounts=await remote('/rest/v1/Accounts?account_id=eq.'+encodeURIComponent(accountId)+'&select=disabled');
   if(accounts.length!==1||accounts[0].disabled)return reply(403,{ok:false,error:'ACCOUNT_DISABLED'});
   actor={accountId};body.sessionToken=token;
  }
  // v325: an independent cosmetic profile; never writes PlayerSaves or arena points.
  if(body.action==='profile/avatar/get'||body.action==='profile/avatar/set'){
   if(!actor)return reply(401,{ok:false,error:'UNAUTHORIZED'});
   const path='/rest/v1/game_player_profiles325';
   if(body.action==='profile/avatar/set'){
    const id=body.avatarId;
    if(typeof id!=='number'||!Number.isSafeInteger(id)||id<1||id>12)return reply(400,{ok:false,error:'AVATAR_ID_INVALID'});
    const prefer=body.ifAbsent===true?'resolution=ignore-duplicates,return=representation':'resolution=merge-duplicates,return=representation';
    await remote(path+'?on_conflict=account_id',{method:'POST',headers:{Prefer:prefer},body:JSON.stringify({account_id:String(actor.accountId),avatar_id:id,updated_at:new Date().toISOString()})});
   }
   const rows=await remote(path+'?account_id=eq.'+encodeURIComponent(actor.accountId)+'&select=avatar_id&limit=1');
   const value=Number(rows?.[0]?.avatar_id),present=Number.isInteger(value)&&value>=1&&value<=12;
   if(body.action==='profile/avatar/set'&&!present)return reply(503,{ok:false,error:'AVATAR_PROFILE_WRITE_FAILED'});
   return reply(200,{ok:true,accountId:String(actor.accountId),avatarId:present?value:1,avatarSet:present});
  }
  // Recovery reads keep their SQL save-row lock, authentication and owner filter.
  phase='read';
  if(body.action==='battle/status')return reply(200,await rpc('game_battle_status79',{p_account:actor.accountId,p_battle:body.battleId||null,p_request:body.requestId||null,p_consume:body.consumeRequestId||null}));
  // Download immutable planning BEFORE acquiring the mutation lease.
  const directMutation=body.action==='battle/cancel'||body.action==='worldboss/chest/open';
  let plans=[],privateRows=[];
  if(!directMutation){
   phase='planning';
   plans=await remote('/rest/v1/GameDataCurrent?channel=eq.production&select=data_json');
   if(plans.length!==1||!plans[0].data_json?.data)throw Error('PLANNING_NOT_PUBLISHED');
   privateRows=publicActions.has(body.action)||readActions446.has(body.action)?[]:await remote('/rest/v1/game_runtime_config?select=name,rows');
  }
  if(!publicActions.has(body.action)&&!readActions446.has(body.action)){
   phase='lock_wait';await lease.acquire();lastGuard=Date.now();
  }
  phase='execute';
  const guard=async()=>{if(Date.now()-started>80000)throw Error('EXECUTION_DEADLINE');if(lease.held&&Date.now()-lastGuard>5000){await lease.renew();lastGuard=Date.now()}};
  await guard();
  if(body.action==='battle/cancel'){if(!body.battleId)return reply(400,{ok:false,error:'BATTLE_NOT_FOUND'});return reply(200,await rpc('game_battle_cancel79',{p_account:actor.accountId,p_battle:body.battleId}));}
  // v11.37.17: authenticate actor above; award and save under one database transaction.
  // Never dispatch this route to the legacy client-side-award implementation.
  if(body.action==='worldboss/chest/open'){
   const expected=Number(body.expectedSaveRevision),rewardId=String(body.rewardId||'').trim();
   if(!actor||!rewardId||!Number.isSafeInteger(expected)||expected<1)return reply(400,{ok:false,error:'CHEST_CLIENT_UPDATE_REQUIRED'});
   const result=await rpc('game_worldboss_chest_open',{p_account:actor.accountId,p_reward_id:rewardId,p_expected_revision:expected});
   return reply(200,result);
  }
  const engine=makeEngine({base,key,token,actor,planning:plans[0].data_json,privateConfig:Object.fromEntries(privateRows.map(x=>[x.name,x.rows])),fetcher,guard});
  if(cron)return reply(200,{ok:true,...await (body.action==='system/boxingTick'?engine.boxingJobs():engine.jobs())});
  const data=await (publicActions.has(body.action)?engine.read(body):engine.dispatch(body));
  return reply(200,data);
 }catch(err){
  const known=['SERVER_BUSY','LOCK_LOST','LOCK_ACQUIRE_UNCERTAIN','EXECUTION_DEADLINE'].includes(err?.message)?err.message:null;
  trace('request_failed',{failure:known||(['TimeoutError','AbortError'].includes(err?.name)?err.name:err?.httpStatus?'upstream_http':'application'),upstream_status:Number(err?.httpStatus)||null});
  if(known==='SERVER_BUSY')return reply(429,{ok:false,error:'SERVER_BUSY',traceId:owner});
  return reply(503,{ok:false,error:String(known||err?.code||'GAME_API_FAILED'),message:String(err?.message||'GAME_API_FAILED'),traceId:owner});
 }
 finally{
  const operationPhase=phase;phase='release';await lease.release();
  trace('request_completed',{operation_phase:operationPhase,status:responseStatus,...lease.summary});
  activeRequests446.delete(owner);
 }
};}

// Log interrupted phases without tokens, accounts, request bodies or saves.
globalThis.addEventListener?.('beforeunload',event=>{
 const allowed=['EarlyDrop','CPUTime','Memory','WallClockTime','TerminationRequested'];
 for(const snapshot of activeRequests446.values())console.warn(JSON.stringify({event:'game_api446',kind:'worker_shutdown',reason:allowed.includes(event.detail?.reason)?event.detail.reason:'other',...snapshot()}));
});
Deno.serve(retainGameRequest446(makeGameApi(name=>Deno.env.get(name))));
