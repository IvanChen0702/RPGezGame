// GENERATED from index.html by tools/build_mist_combat468.mjs; edit the source, not this file.
export function createMistCombat468(data,random){
 const cfg=Object.fromEntries((data.GameConfig||[]).map(r=>[r.Key,r.Value]));
 const base={hp:Number(cfg.BaseHP),def:Number(cfg.BaseDEF),patk:Number(cfg.BasePATK),matk:Number(cfg.BaseMATK),crit:Number(cfg.BaseCrit),critDamage:Number(cfg.BaseCritDamage||100)};
 if(Object.values(base).some(n=>!Number.isFinite(n))||base.hp<=0)throw Error('MIST_BASE_CONFIG_INVALID');
 let pending468=[];
 // Presentation events are recorded from the same combat hooks as the browser.
 // Only public combat state is copied; opponent stats/equipment/AI never leave the server.
 function side471(x){return x===arenaBattle_?.attacker?'attacker':x===arenaBattle_?.defender?'defender':x;}
 function frame471(){const pick=(a,own)=>({hp:a.hp,maxHp:a.maxHp,status:a.status||{},shields:(a.shields||[]).map(s=>({id:s.id,name:s.name,hp:s.hp,turns:s.turns})),...(own?{stats:a.stats,buff:a.buff||{},cooldowns:a.cooldowns||{},arcaneStacks:a.arcaneStacks||0}:{})});return structuredClone({attacker:pick(arenaBattle_.attacker,true),defender:pick(arenaBattle_.defender,false)});}
 function record471(type,detail={}){if(!arenaBattle_?.events471)return;const events=arenaBattle_.events471;if(events.length>=512)return;events.push({type,...detail,frame:frame471()});}
 function fxEvent_(...args){const p=fxEventCore468_(...args);pending468.push(p);return p;}
 async function drain468(){for(let i=0;pending468.length;i++){if(i>1000)throw Error('MIST_EFFECT_LOOP');const tasks=pending468;pending468=[];await Promise.all(tasks);}}

 function arenaTakeDamage_(target,amount,kind='damage',source=null){if(target?.mistFirstGuard468&&source&&kind==='damage'&&amount>0){amount=Math.floor(amount*target.mistFirstGuard468);delete target.mistFirstGuard468;}return arenaTakeDamageBase468_(target,amount,kind,source);}

function arenaStatsFrom_(_talentSpent,eq){
 const x=arenaBaseStats_();
 for(const it of (eq||[])){const q=it.resolvedStats||{};for(const k in q)x[k]=(Number(x[k])||0)+Number(q[k]||0)}
 const passive=arguments.length>2?arguments[2]:null;
 if(passive==='assassinAptitude'){x.crit+=15}
 if(passive==='assassinAptitudeII'){x.crit+=15;x.critDamage=(Number(x.critDamage)||100)+Number(skillTemplates.assassinAptitudeII?.mult??15)}
 if(passive==='magicSwordsmanAptitude'){x.hp+=5;x.def+=5;x.patk+=5;x.matk+=5;x.crit+=5}
 if(passive==='magicSwordsmanAptitudeII'){x.hp=Math.trunc(x.hp*1.1);x.def=Math.trunc(x.def*1.1);x.patk=Math.trunc(x.patk*1.1);x.matk=Math.trunc(x.matk*1.1);x.crit+=10}
 if(passive==='enhancedConstitution'&&x.patk>=30)x.def+=5;
 if(passive==='enhancedConstitutionII'&&x.patk>=120)x.def+=75;
 if(passive==='enhancedConstitutionIII'&&x.patk>=300)x.def+=100;
 fxStats_(x,fxArenaKeys_({equipmentList:eq||[],passive}),{},false);
 const hpPct=arenaEffectSum46_({equipmentList:eq||[]},'maxhp_percent_');
 x.hp=Math.max(1,Math.trunc(x.hp*Math.max(0,1+hpPct/100)));x.crit=Math.max(0,Math.min(100,x.crit));return x
}
function arenaBaseStats_(){return {...base};}
let skillTemplates={};
const Math=Object.create(globalThis.Math);Math.random=random;
function fxStats_(stats,keys,ctx,conditional=false){
 const before={...stats},flat={},pct={};
 for(const key of keys){const f=fxParse_(key);if(f?.type!=='stat'||(f.condition!=='always')!==conditional||!fxCondition_(f.condition,ctx))continue;const a=f.mode==='flat'?flat:pct;a[f.stat]=(a[f.stat]||0)+f.n;}
 for(const stat of Object.keys(before))stats[stat]=Math.trunc(((Number(before[stat])||0)+(flat[stat]||0))*Math.max(0,1+(pct[stat]||0)/100));
 stats.hp=Math.max(1,stats.hp);stats.crit=Math.max(0,Math.min(100,stats.crit||0));return stats;
}
function fxParse_(key){
 const equipment462=equipmentParse462_(key);if(equipment462)return equipment462;
 const chaos=typeof chaosFxParse332_==='function'?chaosFxParse332_(key):null;if(chaos)return chaos;
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
function equipmentParse462_(key){
 let m;
 if(m=key.match(/^fx_oncrit_damage_enemy_maxhp_physical_(\d+(?:\.\d+)?)_chance_(\d+(?:\.\d+)?)_lowhp_(\d+(?:\.\d+)?)_chance_(\d+(?:\.\d+)?)$/))return {type:'critMaxHp462',event:'oncrit',n:+m[1],chance:Math.min(100,+m[2])/100,threshold:Math.min(100,+m[3])/100,lowChance:Math.min(100,+m[4])/100};
 if(m=key.match(/^fx_oncrit_patk_percent_battle_(\d+(?:\.\d+)?)$/))return {type:'critGrowth462',event:'oncrit',n:+m[1]};
 if(m=key.match(/^fx_cast_no_cooldown_(\d+(?:\.\d+)?)$/))return {type:'noCooldown462',chance:Math.min(100,+m[1])/100};
 if(m=key.match(/^fx_skip_cooldown_random_(\d+)$/))return {type:'skipCooldown462',event:'skip',n:Math.min(99,+m[1])};
 return null;
}
function chaosFxParse332_(key){let m;if(m=key.match(/^fx_shield_damage_percent_(\d+)$/))return {type:'chaosShield',n:+m[1]};if(m=key.match(/^fx_shield_break_heal_maxhp_(\d+)$/))return {type:'chaosBreak',n:+m[1]};if(m=key.match(/^fx_cast_random_weakness_suppression_(\d+)$/))return {type:'chaosRandom',event:'cast',n:+m[1]};if(m=key.match(/^fx_onhit_heal_block_once_(\d+)$/))return {type:'chaosBlock',event:'onhit',n:+m[1]};return null;}
let defaultStatusEffects={
  enhancement_lock:{id:'enhancement_lock',name:'封鎖強化',category:'debuff',durationType:'turns',defaultDuration:3,stackable:false,effectType:'enhancement_lock',description:'無法取得護盾、祝福、格擋、持續恢復與無敵；既有效果保留。'},
  gamble_luck141:{id:'gamble_luck141',name:'狂賭之骰',category:'buff',durationType:'turns',defaultDuration:1,stackable:false,effectType:'none',description:'本回合雙攻增益，正向加成無上限，最多降低100%（雙攻最低0）'},
  dark_erosion:{id:'dark_erosion',name:'暗蝕',category:'debuff',durationType:'stacks',defaultDuration:0,stackable:true,maxStacks:999,effectType:'shadow_drain',value:.03,description:'每層每回合造成最大HP3%傷害，敵人回復玩家實際損失HP；上限999層，可淨化。'},
  paralysis:{id:"paralysis",name:"麻痺",category:"debuff",durationType:"turns",defaultDuration:2,stackable:false,effectType:"cooldown_freeze",description:"效果持續期間，技能 CD 不會自然倒數；仍可行動。"},
  poison:{id:'poison',name:'中毒',category:'debuff',durationType:'stacks',defaultDuration:0,stackable:true,maxStacks:99,effectType:'dot_percent',value:.02,description:'每回合受到最大 HP 2% × 層數的傷害。'},
  burning:{id:'burning',name:'燃燒',category:'debuff',durationType:'stacks',defaultDuration:0,stackable:true,maxStacks:99,effectType:'dot_percent',value:.05,description:'每回合受到最大 HP 5% × 層數的傷害。'},
  heal_block:{id:'heal_block',name:'禁療',category:'debuff',durationType:'turns',defaultDuration:1,stackable:false,effectType:'heal_block',description:'無法恢復生命。'},
  stun:{id:'stun',name:'暈眩',category:'debuff',durationType:'turns',defaultDuration:1,stackable:false,effectType:'skip_turn',description:'無法行動。'},
  invincible:{id:'invincible',name:'無敵',category:'buff',durationType:'turns',defaultDuration:1,stackable:false,effectType:'damage_immunity',description:'免疫傷害與敵方附加異常。'},
  curse:{id:'curse',name:'詛咒',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'heal_reverse',description:'恢復生命無效，並改為扣除等量 HP。'},
  weakness:{id:'weakness',name:'乏力',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'stat_multiplier',stat:'patk',value:.2,description:'物理攻擊降低 80%。'},
  suppression:{id:'suppression',name:'壓制',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'stat_multiplier',stat:'matk',value:.2,description:'魔法攻擊降低 80%。'},
  armor_break:{id:'armor_break',name:'破防',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'stat_multiplier',stat:'def',value:.2,description:'防禦降低 80%。'},
  freeze:{id:'freeze',name:'冰凍',category:'debuff',durationType:'turns',defaultDuration:1,stackable:false,effectType:'skip_turn_freeze_cd',description:'無法行動 1 回合，且被冰凍的回合技能 CD 不會減少。'},
  seal:{id:'seal',name:'封印',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'seal_random_active',description:'隨機封印一格已裝備主動技能，期間無法使用。'},
  forget:{id:'forget',name:'忘卻',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'disable_passive',description:'被動技能暫時無效。'},
  blind:{id:'blind',name:'失明',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'stat_multiplier',stat:'crit',value:.5,description:'爆擊率降低 50%。'},
  bleed:{id:'bleed',name:'失血',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'skill_hp_cost_percent',value:.10,description:'每次成功釋放主動技能後失去最大 HP 10%。'},
  block:{id:'block',name:'格擋',category:'buff',durationType:'trigger',defaultDuration:0,stackable:false,effectType:'next_damage_multiplier',value:.1,description:'下一次受到的傷害降低 90%，觸發後消失。'},
  brand:{id:'brand',name:'烙印',category:'debuff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'damage_taken_multiplier',value:1.5,description:'受到傷害增加50%。'},
  blessing:{id:'blessing',name:'祝福',category:'buff',durationType:'turns',defaultDuration:2,stackable:false,effectType:'abnormal_immunity',description:'免疫新的異常效果。'}
};
let statusEffects=Object.fromEntries((data.StatusEffects||[]).map(r=>[r.StatusID,{id:r.StatusID,name:r.Name,category:r.Category,defaultDuration:r.DefaultDuration,stackable:r.Stackable,maxStacks:r.MaxStacks,value:r.Value}]));
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
function fxArenaKeys_(actor){return [...(actor?.equipmentList||Object.values(actor?.equipment||{})).flatMap(it=>[...itemEffectKeys_(it),...(it.gems||[]).filter(Boolean).flatMap(g=>fxSplit_(g.effect))]).filter(k=>fxParse_(k)),...(actor?.status?.forget?.turns>0?[]:fxSkillKeys_(actor?.passive))]}
function itemEffectKeys_(item){
  if(!item)return [];
  // v191: published template is authoritative, including removal of an effect.
  // Forged items own their custom effects; unknown templates retain their fallback.
  const id=String(item.template||''),custom=!!item.forge172||id==='forgeBlank172'||id.startsWith('forge172_');
  const t=custom?null:itemTemplates?.[id];
  const raw=t ? (t.effect??'') : (item.effect??(Array.isArray(item.effects)?item.effects.join('|'):item.effects)??'');
  return [...new Set(fxSplit_(raw))];
}
let itemTemplates={};
function fxSplit_(raw){return String(raw||'').split(/[\n,;|]+/).map(x=>x.trim()).filter(Boolean)}
function fxSkillKeys_(id){return fxSplit_(skillTemplates?.[id]?.effectKey).filter(k=>fxParse_(k))}
function arenaEffectSum46_(actor,prefix){
 return arenaEffectEntries46_(actor).reduce((sum,e)=>{const tail=e.key.startsWith(prefix)?e.key.slice(prefix.length):'';return sum+(tail&&Number.isFinite(Number(tail))?Number(tail):0)},0);
}
function arenaEffectEntries46_(actor){
 const rows=actor?.equipmentList||Object.values(actor?.equipment||{}),out=[];
 for(const [i,it] of rows.filter(Boolean).entries()){
  for(const key of itemEffectKeys_(it))out.push({key,name:it.name||itemTemplates[it.template]?.name||'裝備',source:`item:${i}`});
  for(const [j,g] of (it.gems||[]).entries())if(g){
   const effect=String(g.template||g.gemId||'')==='orderHeart'?(gemTemplates.orderHeart?.effect??g.effect):g.effect;
   for(const key of new Set(fxSplit_(effect)))out.push({key,name:g.name||gemTemplates[g.template]?.name||'寶石',source:`gem:${i}:${j}`});
  }
 }
 return out;
}
let gemTemplates={};
async function arenaUse_(actor,target,id){
 const sk=skillTemplates?.[id];if(!sk||actor.hp<=0||target.hp<=0||arenaBattle_?.finished||(actor.cooldowns[sk.name]||0)>0)return 0;
 actor.orderSkillDamage127=0;actor.orderSkillActive127=true;orderDispelArena127_(actor,target);
 try{return await arenaUseLegacy127_(actor,target,id);}finally{
  actor.orderSkillActive127=false;
  const rate=orderShieldRate139_(arenaEffectEntries46_(actor)),bonus=Math.max(0,arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain')),hp=Math.trunc(Math.max(0,actor.orderSkillDamage127||0)*rate*(1+bonus/100));
  if(hp>0&&actor.hp>0&&!actor.status.enhancement_lock?.turns){arenaAddShield60_(actor,{id:'orderHeart',name:'秩序之心',hp,turns:1,noRetaliate:true});arenaEffectText_(actor,`秩序之心：護盾 +${hp}`,'buff');}
 }
}
let arenaBattle_=null;
function orderDispelArena127_(actor,target){
 if(!arenaEffectKeys_(actor).includes('order_dispel_cast_50')||Math.random()>=.5)return;
 const ids=Object.keys(target.status||{}).filter(id=>statusDef_(id).category==='buff'&&!['shield','equipment_immunity'].includes(id)&&target.status[id]?.turns>0);
 for(const id of ['patk','matk','def'])if(target.buff?.[id]>0)ids.push('stat_'+id);
 if(target.regenTurns>0)ids.push('regen');if(!ids.length)return;
 const id=ids[Math.floor(Math.random()*ids.length)];
 if(id.startsWith('stat_')){const stat=id.slice(5),key='temp'+stat[0].toUpperCase()+stat.slice(1);target.stats[stat]-=Number(target[key]||0);target[key]=0;target.buff[stat]=0;}
 else if(id==='regen'){target.regenTurns=0;target.regen=0;}else delete target.status[id];
 arenaEffectText_(target,`律界裁衡：移除${statusDef_(id).name||id}`,'status');arenaLog_(`【律界裁衡】移除 ${target.name} 一種Buff。`);arenaRefreshPair46_(actor,target);
}
function arenaEffectKeys_(x){return [...new Set(arenaEffectEntries46_(x).map(e=>e.key))]}
function statusDef_(id){const def=statusEffects[id]||defaultStatusEffects[id]||{id,name:id,category:'debuff',defaultDuration:1};return id==='block'?{...def,category:'buff',durationType:'trigger',defaultDuration:0,stackable:false,maxStacks:1,description:'下一段有效傷害降低90%，觸發後消失；不隨回合到期，最多持有一個。'}:def;}
function arenaEffectText_(x,text,type='buff'){record471('float',{target:side471(x),text,kind:type});}
function arenaLog_(s){arenaBattle_.log.push(String(s));record471('log',{text:String(s)});}
function arenaRefreshPair46_(actor,target){arenaRefreshConditionalStats_(actor);if(target)arenaRefreshConditionalStats_(target)}
function arenaRefreshConditionalStats_(x){
 if(!x)return;
 for(const [stat,n] of Object.entries(x.fxConditionalDelta||{}))x.stats[stat]-=n;
 x.fxConditionalDelta={};
 const bonus=arenaFullHpCritDamageFromEquipment_(x.equipmentList||[]),active=bonus>0&&Number(x.hp)>=Number(x.maxHp),base=Number(x.baseCritDamage??x.stats?.critDamage??100);
 x.baseCritDamage=base;x.stats.critDamage=base+(active?bonus:0)+Object.entries(x.balanceDeltas241||{}).reduce((n,[key,d])=>n+(x.buff?.[key]>0?Number(d.critDamage||0):0),0);
 if(active&&!x._fullHpCritDamageShown){x._fullHpCritDamageShown=true;arenaLog_(`${x.name} 的裝備效果觸發：滿血時爆擊傷害 +${bonus}%。`);arenaEffectText_(x,`爆擊傷害 +${bonus}%`,'buff',80)}
 if(!active)x._fullHpCritDamageShown=false;
 const original={...x.stats};if(x.equipmentPatkPct462>0)x.stats.patk=Math.trunc(x.stats.patk*(1+x.equipmentPatkPct462/100)+1e-8);
 const target=x===arenaBattle_?.attacker?arenaBattle_?.defender:arenaBattle_?.attacker,activeKeys=[];
 const buffPatk=arenaEffectNumber_(x,'buff_patk_flat_',0);
 if(buffPatk>0&&emptyMirrorArenaHasBuff_(x)){x.stats.patk+=buffPatk;activeKeys.push(`buff_patk_flat_${buffPatk}`)}
 const dual=arenaEffectNumber_(x,'balanced_dual_attack_',0),hi=Math.max(x.stats.patk,x.stats.matk),lo=Math.min(x.stats.patk,x.stats.matk);
 if(dual>0&&(hi<=0||(hi-lo)/hi<=.2)){x.stats.patk=Math.trunc(x.stats.patk*(1+dual/100));x.stats.matk=Math.trunc(x.stats.matk*(1+dual/100));activeKeys.push(`balanced_dual_attack_${dual}`)}
 const ctx=fxArenaContext_(x,target),keys=fxArenaKeys_(x);
 for(const key of keys){const f=fxParse_(key);if(f?.type==='stat'&&f.condition!=='always'&&fxCondition_(f.condition,ctx))activeKeys.push(key)}
 fxStats_(x.stats,keys,ctx,true);
 for(const stat of Object.keys(original))x.fxConditionalDelta[stat]=x.stats[stat]-original[stat];
 const signature=activeKeys.join('|');
 if(signature&&signature!==x._conditionalSignature46){
  const changes=Object.keys(original).filter(k=>x.stats[k]!==original[k]).map(k=>`${k} ${original[k]}→${x.stats[k]}`);
  if(changes.length)effectNotice44_(activeKeys[0],x,`條件成立：${activeKeys.map(effectDescription_).join('；')}；${changes.join('、')}。`,'條件能力生效',[...new Set(activeKeys.map(k=>effectSources44_(k,x)))].join('、'));
 }
 x._conditionalSignature46=signature;diceArenaStats141_(x);
}
function arenaFullHpCritDamageFromEquipment_(eq){return Math.max(0,arenaEffectSum46_({equipmentList:eq||[]},'fullhp_critdamage_'))}
function arenaEffectNumber_(x,prefix,fallback=0){for(const k of arenaEffectKeys_(x)){const m=k.match(new RegExp('^'+prefix+'(-?\\d+(?:\\.\\d+)?)$','i'));if(m&&Number.isFinite(Number(m[1])))return Number(m[1])}return fallback}
function emptyMirrorArenaHasBuff_(x){
 if(Object.values(x.buff||{}).some(turns=>Number(turns)>0)||arenaShieldTotal60_(x)>0)return true;
 return Object.entries(x.status||{}).some(([id,entry])=>statusDef_(id)?.category==='buff'&&Number(entry?.turns||0)>0);
}
function arenaShieldTotal60_(x){return arenaActiveShields60_(x).reduce((sum,sh)=>sum+Number(sh.hp),0);}
function arenaActiveShields60_(x){
 if(!x)return [];
 if(!Array.isArray(x.shields))x.shields=[];
 if(Number(x.shield)>0){
  const r=x.shieldRetaliate;
  x.shields.push({id:r?'magicShield':'legacyShield',name:r?.name||'護盾',hp:Number(x.shield),max:Number(x.shield),turns:Math.max(1,Number(x.shieldTurns)||2),retaliate:r||null});
 }
 delete x.shield;delete x.shieldTurns;delete x.shieldRetaliate;
 x.shields=x.shields.filter(sh=>Number(sh.hp)>0&&Number(sh.turns)>0);
 return x.shields;
}
function fxArenaContext_(actor,target){return {hp:actor.hp,maxHp:actor.maxHp,hasBuff:emptyMirrorArenaHasBuff_(actor),enemyHp:target?.hp,enemyMaxHp:target?.maxHp,enemyDebuff:Object.entries(target?.status||{}).some(([id,v])=>v.turns>0&&statusDef_(id)?.category==='debuff')}}
function effectNotice44_(){}
function effectDescription_(...args){return blockText286_(effectDescription_Legacy286_(...args));}
function blockText286_(text){return String(text??'').replace(/(【格擋】|格擋)\s*(?:持續\s*)?\d+\s*(?:回合|R)/g,'$1（不隨回合到期，最多持有一個）');}
function effectDescription_Legacy286_(effect=''){
 const dodge241=String(effect||'').match(/^attack_evasion_percent_(\d+(?:\.\d+)?)$/);if(dodge241)return `${Number(dodge241[1])}% 機率迴避攻擊。`;return String(effectDescriptionLegacy163_(effect)||'').replace(/＋/g,'+').replace(/[－−]/g,'-');}
function effectDescriptionLegacy163_(effect=''){  if(effect==='first_below_hp_30_invincible_1_cd_reduce_1')return '每場戰鬥首次 HP 低於 30% 時，獲得 1 回合【無敵】，所有主動技能 CD -1。';
 if(effect==='golden_dragon_20_2')return 'HP低於50%時，攻擊傷害+20%，且攻擊命中後恢復最大HP 2%。';
 const wb141=String(effect).match(/^(shield_break_active|turnstart_debuff_shield|turnstart_gamble_dual)_(\d+(?:\.\d+)?)$/);
 if(wb141){const n=Number(wb141[2]);return wb141[1]==='shield_break_active'?`對護盾造成的主動傷害＋${n}%`:(wb141[1]==='turnstart_debuff_shield'?`回合開始時獲得自身最大 HP ${n}% 的護盾，身上每有一種異常效果，額外追加最大 HP ${n}%；護盾持續 1 回合。`:`每回合各自擲骰，50%雙攻＋${n}%，反之－${n}%，持續1回合；多顆加總，正向加成無上限，最多降低100%（雙攻最低0）。`);}
 if(effect==='order_dispel_cast_50')return '施放技能時，50%機率移除敵人最多 1 種 Buff（不含護盾／裝備免疫）';
 const orderShieldMatch139=String(effect||'').trim().match(/^order_skill_damage_shield_(\d+(?:\.\d+)?)$/);
 if(orderShieldMatch139&&Number.isFinite(Number(orderShieldMatch139[1])))return `獲得主動技造成傷害${Number(orderShieldMatch139[1])}%的護盾。`;
  if(String(effect||'').trim()==='afterhit_block_10_once_per_turn')return '每次受到攻擊後，10% 機率獲得【格擋】（不隨回合到期，最多持有一個）';

  const keys=String(effect||'').split(/[\n,;|]+/).map(x=>x.trim()).filter(Boolean);
  if(!keys.length)return '';
  const special={
    reflect20:'反射受到傷害 20%（物理反傷）',
    reflect60:'反射受到傷害 60%（物理反傷）'
  };
  return keys.map(key=>{
    const generic=fxDescription_(key);if(generic)return generic;
    if(special[key])return special[key];
    const triggered=parseTriggeredStatusEffectKey_(key);
    if(triggered)return triggeredStatusEffectText_(triggered);
    if(key.startsWith('immune_')){
      const statusId=key.slice(7);
      const def=statusDef_(statusId);
      return `免疫${def?.name||statusId}`;
    }
    let cm=key.match(/^shield_gain_(\d+(?:\.\d+)?)$/i);if(cm)return `獲得護盾量 +${Number(cm[1])}%`;
    cm=key.match(/^healing_received_(\d+(?:\.\d+)?)$/i);if(cm)return `生命恢復量 +${Number(cm[1])}%`;
    cm=key.match(/^buff_patk_flat_(\d+(?:\.\d+)?)$/i);if(cm)return `身上有 BUFF 時，物攻 +${Number(cm[1])}`;
    cm=key.match(/^magic_damage_vs_debuff_(\d+(?:\.\d+)?)$/i);if(cm)return `敵人帶有 Debuff 時，魔法傷害 +${Number(cm[1])}%`;
    cm=key.match(/^physical_damage_no_buff_(\d+(?:\.\d+)?)$/i);if(cm)return `自身若沒有裝備免疫之外的 BUFF 時，物理傷害 +${Number(cm[1])}%`;
    cm=key.match(/^balanced_dual_attack_(\d+(?:\.\d+)?)$/i);if(cm)return `物攻與魔攻差距不超過 20% 時，物攻與魔攻各 +${Number(cm[1])}%`;
    cm=key.match(/^lethal_guard_shield_(\d+(?:\.\d+)?)$/i);if(cm)return `每場首次受到致命傷害時保留 1 HP，並獲得最大 HP ${Number(cm[1])}% 護盾`;
    cm=key.match(/^first_debuff_duration_minus_(\d+)$/i);if(cm)return `每場第一次受到有回合數的 Debuff 時，持續時間 -${Number(cm[1])} 回合`;
    cm=key.match(/^no_buff_damage_reduction_(\d+(?:\.\d+)?)$/i);if(cm)return `自身若沒有裝備免疫之外的 BUFF 時，受到的傷害 -${Number(cm[1])}%`;
    cm=key.match(/^fullhp_critdamage_(\d+(?:\.\d+)?)$/i);if(cm)return `HP 100% 時，爆擊傷害 +${Number(cm[1])}%`;
    cm=key.match(/^chance_immune_stun_(\d+(?:\.\d+)?)$/i);if(cm)return `每顆獨立 ${Number(cm[1])}% 機率免疫暈眩`;
    cm=key.match(/^turn_regen_maxhp_(\d+(?:\.\d+)?)$/i);if(cm)return `每回合開始恢復最大 HP ${Number(cm[1])}%`;
    cm=key.match(/^onattack_block_(\d+(?:\.\d+)?)$/i);if(cm)return `每次攻擊後，獨立 ${Number(cm[1])}% 機率獲得【格擋】（不隨回合到期，最多持有一個）`;
    cm=key.match(/^gold_gain_percent_(\d+(?:\.\d+)?)$/i);if(cm)return `主線獲得金幣 +${Number(cm[1])}%`;
    const hpPct=key.match(/^maxhp_percent_(-?\d+(?:\.\d+)?)$/i);
    if(hpPct)return `MAX HP ${Number(hpPct[1])>=0?'+':''}${Number(hpPct[1])}%`;
    return key;
  }).join(' / ');
}
function fxDescription_(key){
 const f=fxParse_(key);if(!f)return '';
 if(f.type==='critMaxHp462')return `每次造成爆擊傷害時，${f.chance*100}% 機率額外造成敵人最大 HP ${f.n}% 的物理傷害；自身 HP 低於 ${f.threshold*100}% 時，機率提升至 ${f.lowChance*100}%。`;
 if(f.type==='critGrowth462')return `每次造成爆擊傷害，物攻提升 ${f.n}%（本場戰鬥內持續累積，採加算，結束重置）。`;
 if(f.type==='noCooldown462')return `每次施放技能時，${f.chance*100}% 機率該技能不進冷卻。`;
 if(f.type==='skipCooldown462')return `主動跳過回合時，隨機一項冷卻中的主動技能額外 CD -${f.n}。`;
 if(f.type==='chaosShield')return `對護盾傷害 +${f.n}%（額外傷害不溢出至HP）`;
 if(f.type==='chaosBreak')return `主動擊破護盾恢復最大HP ${f.n}%，每回合最多一次`;
 if(f.type==='chaosRandom')return `施放技能後 ${f.n}% 機率隨機附加乏力或壓制1回合`;
 if(f.type==='chaosBlock')return `命中 ${f.n}% 機率附加禁療1回合，每次技能最多成功一次`;
 const stat={hp:'最大 HP',def:'防禦',patk:'物攻',matk:'魔攻',crit:'爆擊率',critDamage:'爆擊傷害'},cond={always:'',fullhp:'滿血時，',lowhp:'自身 HP ≤30% 時，',no_buff:'自身沒有裝備免疫之外的 BUFF 時，',has_buff:'自身有裝備免疫之外的 BUFF 時，',enemy_debuff:'敵人有 Debuff 時，',enemy_lowhp:'敵人 HP ≤30% 時，'},event={turnstart:'回合開始時，',onhit:'每次主動命中後，',oncrit:'每次物理爆擊命中後，',afterhit:'每次受到有效傷害後，',cast:'施放技能時，'},kind={all:'主動傷害',physical:'物理傷害',magic:'魔法傷害'};
 if(f.type==='stat')return `${cond[f.condition]}${stat[f.stat]} ${f.n>=0?'+':''}${f.n}${f.mode==='percent'?'%':(['crit','critDamage'].includes(f.stat)?' 個百分點':'')}`;
 if(f.type==='damage')return `${cond[f.condition]}${kind[f.kind]} ${f.n>=0?'+':''}${f.n}%`;
 if(f.type==='reduce')return `${cond[f.condition]}受到傷害 -${f.n}%（此系列合計上限90%）`;
 if(f.type==='tick')return `每次自然 CD 倒數額外 ${f.n>=0?'+':''}${f.n} 回合（麻痺時不倒數）`;
 const simple={lifesteal:'主動造成有效傷害的',healing_gain:'恢復量 +',shield_gain:'護盾量 +',reward_gold:'主線通關金幣 +',reward_exp:'主線通關經驗 +'};
 if(simple[f.type])return `${simple[f.type]}${f.n}%${f.type==='lifesteal'?'轉為自身恢復（上限100%）':''}`;
 if(f.type==='heal')return `${event[f.event]}恢復最大 HP ${f.n}%`;
 if(f.type==='shield')return `${event[f.event]}獲得最大 HP ${f.n}% 護盾，持續 ${f.duration} 回合`;
 if(f.type==='status')return `${event[f.event]}${Math.round(f.chance*100)}% 機率使${f.target==='self'?'自身':'敵人'}獲得【${statusDef_(f.status)?.name||f.status}】${f.status==='block'?'（不隨回合到期，觸發後消耗，最多持有一個）':statusDef_(f.status)?.durationType==='stacks'?`${f.stacks}層`:`${f.duration}回合`}`;
 if(f.type==='cooldown')return `${event[f.event]}${f.target==='self'?'自身':'敵人'}已有 CD 的技能${f.mode==='reduce'?'縮短':'延長'} ${f.n} 回合${f.target==='enemy'?'（敵方 CD 僅競技場有作用）':''}`;
 if(f.type==='cleanse')return `${event[f.event]}解除自身最多 ${f.n} 種 Debuff`;
 if(f.type==='dispel')return `施放技能時，移除敵人最多 ${f.n} 種 Buff（不含護盾／裝備免疫）`;
 if(f.type==='castDamage')return `施放時造成${f.kind==='physical'?'物攻':'魔攻'} ×${f.n}% ${kind[f.kind]}`;
 return '';
}
function parseTriggeredStatusEffectKey_(key){
  const m=String(key||'').trim().match(/^(onhit|oncrit)_([a-zA-Z0-9]+?)(\d+)(?:_(\d+(?:\.\d+)?))?$/);
  if(!m)return null;
  const trigger=m[1],statusId=m[2];
  const stacks=Math.max(1,Math.trunc(Number(m[3])||1));
  let chance=m[4]==null?1:Number(m[4]);
  if(!Number.isFinite(chance))chance=1;
  if(chance>1)chance=chance/100;
  chance=Math.max(0,Math.min(1,chance));
  return {key:String(key),trigger,statusId,stacks,chance};
}
function triggeredStatusEffectText_(parsed){
  if(!parsed)return '';
  const def=statusDef_(parsed.statusId);
  const statusName=def?.name||parsed.statusId;
  const triggerText=parsed.trigger==='oncrit'?'爆擊時':'攻擊時';
  const chanceText=parsed.chance<1?`${Math.round(parsed.chance*10000)/100}% 機率`:'';
  if(def?.durationType==='turns' && !def?.stackable){
    const turns=Math.max(1,Math.trunc(Number(def?.defaultDuration)||1));
    return `${triggerText}${chanceText}使敵人【${statusName}】${turns} 回合`;
  }
  return `${triggerText}${chanceText}附加 ${parsed.stacks} 層【${statusName}】`;
}
function effectSources44_(key,actor=null){
 const names=[],rows=actor?(actor.equipmentList||Object.values(actor.equipment||{})):equippedItems();
 for(const it of rows.filter(Boolean)){
  const keys=itemEffectKeys_(it);
  if(keys.includes(key))names.push(it.name||itemTemplates[it.template]?.name||'裝備');
  for(const gem of (it.gems||[]).filter(Boolean)){
   const g=actor?gem:gemResolved_(gem);
   if(fxSplit_(g.effect).includes(key))names.push(g.name||gemTemplates[g.template]?.name||'寶石');
  }
 }
 return [...new Set(names)].join('、')||'技能效果';
}
function equippedItems(){
  const ids=[
    state.equipment.head,state.equipment.armor,state.equipment.weapon,state.equipment.special,
    ...state.equipment.rings
  ].filter(Boolean);
  return ids.map(id=>state.inventory.find(i=>i.id===id)).filter(Boolean);
}
let state={page:'arenaBattle',currentBattle:null,base,inventory:[],passive:[],equippedSkills:[],equipment:{}};
function gemResolved_(gem){
  return resolveGemTemplateData_(gem);
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
function diceArenaStats141_(x){
 const pct=Number(x.gamblePct141||0);if(!pct||pct>0&&!(x.status.gamble_luck141?.turns>0))return;
 for(const k of ['patk','matk']){const old=x.stats[k],next=Math.max(0,Math.trunc(old*(1+pct/100)));x.stats[k]=next;x.fxConditionalDelta[k]=(x.fxConditionalDelta[k]||0)+next-old;}
}
async function arenaUseLegacy127_(actor,target,id){
 if(actor.hp<=0||target.hp<=0||arenaBattle_?.finished)return 0;
 arenaRefreshPair46_(actor,target);
 const sk=skillTemplates?.[id];if(!sk)return 0;const kind=String(sk.kind||''),name=sk.name||id;
 if((actor.cooldowns[name]||0)>0)return 0;
 pixelCast192_(arenaSide_(actor)==='attacker'?'player':'enemy',sk);
 arenaPrepareArcaneForSkill_(actor,sk);
 let dmg=0,crit=false,heal=0,total=0;
 const arenaPassiveMult=(damageKind)=>{const p=actor.passive,s=actor.stats;if(p==='adventurerAptitude')return damageKind==='physical'?(s.patk>=s.matk?1.05:1):(s.matk>=s.patk?1.05:1);if(p==='mageAptitude'&&damageKind==='magic'&&s.matk>=25)return 1.10;if(p==='mageAptitudeII'&&damageKind==='magic'&&arenaMageAptitudeIIActive_(actor))return (s.matk>=300?1.15:1)*Number(actor.arcaneCastMultiplier||1);return 1};
 const effectiveDef=()=>Number(target.stats.def||0)*(target.status.armor_break?.turns>0?.7:1);
 const phys=(mult=Number(sk.mult??1))=>{arenaRefreshPair46_(actor,target);let n=Math.max(1,Math.trunc(questArenaAtk368_(actor,'patk')*mult-effectiveDef()));crit=Math.random()<Math.max(0,Math.min(1,Number(actor.stats.crit||0)/100));actor.lastPhysicalCrit462=crit;if(crit)n=Math.max(1,Math.trunc(n*(1+Number(actor.stats.critDamage||100)/100)));return Math.max(1,Math.trunc(n*arenaPassiveMult('physical')))};
 const mag=(mult=Number(sk.mult??1))=>{arenaRefreshPair46_(actor,target);return Math.max(1,Math.trunc(questArenaAtk368_(actor,'matk')*mult*arenaPassiveMult('magic')))};
 actor.chaosBlockAction332=false;actor.attackMissed241=false;actor.fxActiveSkillId=id;
 if(['godspeedSlash','heavenlyThunder','enchantedBlade'].includes(kind)){total=await questArenaSkill368_(actor,target,id,sk,phys,mag);
 }else if(kind==='fx'){total+=await fxEvent_('cast',actor,target,fxSkillKeys_(id));arenaLog_(`${actor.name} 使用【${name}】。`);
 }else if(await useBalancedArena241_(actor,target,id,sk)){
 }else if(kind==='heal'){
   heal=Math.max(0,Number(sk.value)||0);const healBonus=arenaEffectNumber_(actor,'healing_received_',0)+fxSum_(fxArenaKeys_(actor),'healing_gain');if(healBonus>0){const raw=heal;heal=Math.trunc(heal*(1+healBonus/100));effectGainReport44_(actor,'healing_gain','healing_received_',raw,heal,'恢復量');}let got=0;
   if(actor.status.heal_block){arenaLog_(`${actor.name} 使用【${name}】，但受到【禁療】影響，恢復量為 0。`);arenaFx_(actor===arenaBattle_.attacker?'attacker':'defender','禁療：恢復 0','status')}
   else if(actor.status.curse){const hurt=arenaTakeDamage_(actor,heal,'curse',target);arenaLog_(`${actor.name} 使用【${name}】，但【詛咒】將恢復反轉為 ${hurt} 傷害。`);arenaFx_(actor===arenaBattle_.attacker?'attacker':'defender',`-${hurt} 詛咒`,'status')}
   else{got=Math.min(heal,Math.max(0,actor.maxHp-actor.hp));actor.hp+=got;if(got>0)playSfx('heal');if(Number(sk.regen)>0){actor.regen=Number(sk.regen);actor.regenRate241=0;actor.regenTurns=Math.max(1,Number(sk.duration)||1)}arenaLog_(`${actor.name} 使用【${name}】恢復 ${got} HP。`);arenaFx_(actor===arenaBattle_.attacker?'attacker':'defender',`+${got} HP`,'heal')}
 }else if(kind==='precisionStrike'){
   const broken=!!target.status.armor_break?.turns;dmg=phys(Number(sk.mult??1.5));total+=await arenaHit_(actor,target,dmg,crit?'crit':'physical',`-${dmg}${crit?' 爆擊!':''}`);arenaFx_(target===arenaBattle_.attacker?'attacker':'defender',`-${dmg}${crit?' 爆擊!':''}`,crit?'crit':'damage');
   if(target.hp>0&&broken){const d2=phys(Number(sk.breakMult??1.8));total+=await arenaHit_(actor,target,d2,crit?'crit':'physical',`-${d2} 追加`);arenaFx_(target===arenaBattle_.attacker?'attacker':'defender',`-${d2} 追加`,'damage')}
   if(target.hp>0&&Math.random()<Math.max(0,Math.min(1,Number(sk.value??.5)))){arenaTryStatus_(actor,target,'armor_break',Math.max(1,Number(sk.duration||2)),1);arenaLog_(`${target.name} 陷入【破防】${Math.max(1,Number(sk.duration||2))} 回合。`);arenaFx_(target===arenaBattle_.attacker?'attacker':'defender','破防','buff')}
   arenaLog_(`${actor.name} 使用【${name}】造成 ${total} 物理傷害。`);
 }else if(kind==='bloodSlash'){
   dmg=phys(Number(sk.mult??2));total=await arenaHit_(actor,target,dmg,crit?'crit':'physical',`-${dmg}${crit?' 爆擊!':''}`);const want=Math.max(1,Math.trunc(total*Number(sk.lifeSteal??.25))),got=fxArenaHeal_(actor,want);
   arenaLog_(`${actor.name} 使用【${name}】造成 ${total} 傷害並吸血 ${got} HP。`);if(got){playSfx('heal');healFx(arenaCombatantEl_(actor))}arenaFx_(target===arenaBattle_.attacker?'attacker':'defender',`-${total}${crit?' 爆擊!':''}`,crit?'crit':'damage');if(got)arenaFx_(actor===arenaBattle_.attacker?'attacker':'defender',`+${got} 吸血`,'heal');
 }else if(kind==='magicBurst'){
   const stacks=arenaMageAptitudeIIActive_(actor)?arcaneStacksValue_(actor.arcaneStacks):0;
   const hits=stacks+Math.max(1,Math.trunc(Number(sk.hits??2)));
   arenaLog_(`${actor.name}【${name}】魔導 ${stacks} 層，共 ${hits} 擊，本次不消耗魔導。`);
   arenaEffectText_(actor,`魔導保留 ${stacks} 層・${hits} 連擊`,'buff');bossElementFx55_(arenaCombatantEl_(actor),'arcane');await wait(280);
   for(let i=1;i<=hits&&target.hp>0&&actor.hp>0;i++){
     const d=mag(Number(sk.mult??2)),got=await arenaHit_(actor,target,d,'magic',`-${d} (${i}/${hits})`);
     total+=got;arenaLog_(`${actor.name}【${name}】第 ${i}/${hits} 擊造成 ${got} 魔法傷害。`);
   }
 }else if(kind==='magicMulti'){
   const hits=Math.max(1,Number(sk.hits)||1);for(let i=1;i<=hits&&target.hp>0&&actor.hp>0;i++){const d=mag();total+=await arenaHit_(actor,target,d,'magic',`-${d}`);arenaLog_(`${actor.name}【${name}】第 ${i} 擊造成 ${d} 魔法傷害。`)}
 }else if(kind==='magicShield'){
   let shield=Math.max(1,Math.trunc(questArenaAtk368_(actor,'matk')*Number(sk.shieldMult??1.2)));{const rawShield44=shield;shield=Math.trunc(shield*(1+(arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain'))/100));effectGainReport44_(actor,'shield_gain','shield_gain_',rawShield44,shield,'護盾量');}arenaAddShield60_(actor,{id:'magicShield',name,hp:shield,turns:Math.max(1,Number(sk.duration)||2),kind:'magic',retaliate:{name,matk:Number(actor.stats.matk||0),mult:Number(sk.breakMult??1)}});arenaLog_(`${actor.name} 使用【${name}】，獲得 ${shield} 護盾。`);arenaVisual_(actor,target,'shield',`護盾 +${shield}`);arenaEffectText_(actor,`護盾 +${shield}`,'buff',60);render();await wait(520);
 }else if(kind==='fullPreparation'){
   let shield=Math.max(1,Math.trunc(actor.maxHp*Number(sk.shieldHpMult??.2)));{const rawShield44=shield;shield=Math.trunc(shield*(1+(arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain'))/100));effectGainReport44_(actor,'shield_gain','shield_gain_',rawShield44,shield,'護盾量');}
   arenaAddShield60_(actor,{id:'fullPreparation',name,hp:shield,turns:Math.max(1,Number(sk.duration)||3)});
   const dp=Math.max(1,Math.trunc(Number(actor.stats.patk||0)*.10)),dm=Math.max(1,Math.trunc(Number(actor.stats.matk||0)*.10)),dc=10;
   actor.stats.patk+=dp;actor.stats.matk+=dm;actor.stats.crit+=dc;actor.fullPreparationDelta={patk:dp,matk:dm,crit:dc};actor.buff.fullPreparation=Math.max(1,Number(sk.duration)||3);playSfx('statUp226');
   arenaLog_(`${actor.name} 使用【${name}】，獲得 ${shield} 護盾，物攻/魔攻 +10%、爆擊率 +10%。`);await arenaVisual_(actor,target,'shield',`護盾 +${shield}`);arenaEffectText_(actor,'雙攻 +10% / 爆擊 +10%','buff',180);render();await wait(520);
 }else if(kind==='defShield'){
   let shield=Math.max(1,Math.trunc(actor.maxHp*Number(sk.shieldMult??.2)));{const rawShield44=shield;shield=Math.trunc(shield*(1+(arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain'))/100));effectGainReport44_(actor,'shield_gain','shield_gain_',rawShield44,shield,'護盾量');}arenaAddShield60_(actor,{id:'absoluteDefenseShield',name,hp:shield,turns:Math.max(1,Number(sk.duration)||2),kind:'absolute'});
   const dv=Number(sk.value||0);actor.stats.def+=dv;actor.tempDef=(actor.tempDef||0)+dv;actor.buff.def=Math.max(1,Number(sk.duration)||2);if(dv>0)playSfx('statUp226');
   arenaLog_(`${actor.name} 使用【${name}】，防禦 +${dv} 並獲得 ${shield} 護盾。`);await arenaVisual_(actor,target,'shield',`防禦 +${dv} / 護盾 +${shield}`);render();await wait(520);
 }else if(kind==='buffPatk'||kind==='buffPatkII'){
   const pv=Number(sk.value||0);if(actor.tempPatk){actor.stats.patk-=actor.tempPatk}actor.tempPatk=pv;actor.stats.patk+=pv;actor.buff.patk=Math.max(1,Number(sk.duration)||2);arenaLog_(`${actor.name} 使用【${name}】，物攻提升 ${Number(sk.value||0)}。`);await arenaVisual_(actor,target,'buff',`【${name}】`);render();arenaEffectText_(actor,`物攻 +${Number(sk.value||0)}`,'buff',60);await wait(520);dmg=phys();total=await arenaHit_(actor,target,dmg,crit?'crit':'physical',`-${dmg}${crit?' 爆擊!':''}`);arenaLog_(`${actor.name} 使用【${name}】造成 ${total}${crit?'（爆擊）':''} 傷害。`);arenaFx_(target===arenaBattle_.attacker?'attacker':'defender',`-${total}${crit?' 爆擊!':''}`,crit?'crit':'damage');
 }else if(kind==='buffMatk'||kind==='buffMatkII'){
   const mv=Number(sk.value||0);if(actor.tempMatk){actor.stats.matk-=actor.tempMatk}actor.tempMatk=mv;actor.stats.matk+=mv;actor.buff.matk=Math.max(1,Number(sk.duration)||2);arenaLog_(`${actor.name} 使用【${name}】，魔攻提升 ${Number(sk.value||0)}。`);await arenaVisual_(actor,target,'buff',`【${name}】`);render();arenaEffectText_(actor,`魔攻 +${Number(sk.value||0)}`,'buff',60);await wait(520);dmg=mag();total=await arenaHit_(actor,target,dmg,'magic',`-${dmg}${crit?' 爆擊!':''}`);arenaLog_(`${actor.name} 使用【${name}】造成 ${total} 魔法傷害。`);arenaFx_(target===arenaBattle_.attacker?'attacker':'defender',`-${total}`,'damage');
 }else if(kind==='magicSlashII'){
   let pm=Number(sk.mult??.3);if(actor.passive==='magicSwordsmanAptitudeII'&&Number(actor.stats.patk||0)>=Number(actor.stats.matk||0)*.85)pm=2;
   const p=phys(pm);total+=await arenaHit_(actor,target,p,crit?'crit':'physical',`-${p}${crit?' 爆擊!':''}`);arenaFx_(target===arenaBattle_.attacker?'attacker':'defender',`-${p}${crit?' 爆擊!':''}`,crit?'crit':'damage');
   if(crit&&target.hp>0){const m=mag(Number(sk.value??2));total+=await arenaHit_(actor,target,m,'magic',`-${m} 魔法`);arenaFx_(target===arenaBattle_.attacker?'attacker':'defender',`-${m} 魔法`,'magic')}
   if(crit&&total>0&&actor.hp>0){let shield=Math.max(1,Math.trunc(total*Number(sk.shieldMult??.15)));{const rawShield44=shield;shield=Math.trunc(shield*(1+(arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain'))/100));effectGainReport44_(actor,'shield_gain','shield_gain_',rawShield44,shield,'護盾量');}arenaAddShield60_(actor,{id:'magicSlashII',name,hp:shield,turns:Math.max(1,Number(sk.duration)||1)});arenaLog_(`${actor.name} 的【${name}】獲得 ${shield} 護盾。`);arenaEffectText_(actor,`護盾 +${shield}`,'buff',80);render();await wait(420)}
   arenaLog_(`${actor.name} 使用【${name}】共造成 ${total} 傷害。`);
 }else if(kind==='magicSlash'){
   const c=Math.random()<Math.max(0,Math.min(1,Number(actor.stats.crit||0)/100));
   let p=Math.max(1,Math.trunc(questArenaAtk368_(actor,'patk')*Number(sk.physicalMult??.3)-effectiveDef()));
   if(c)p=Math.max(1,Math.trunc(p*(1+Number(actor.stats.critDamage||100)/100)));
   total+=await arenaHit_(actor,target,p,c?'crit':'physical',`-${p}${c?' 魔劍爆擊!':''}`);
   if(c&&target.hp>0){const m=Math.max(1,Math.trunc(questArenaAtk368_(actor,'matk')*Number(sk.magicCritMult??1.8)*arenaPassiveMult('magic')));total+=await arenaHit_(actor,target,m,'magic',`-${m} 魔法`)}
   crit=c;arenaLog_(`${actor.name} 使用【${name}】造成 ${total} 傷害${c?'（含爆擊追加魔法）':''}。`);
 }else if(kind==='explosiveMagic'||kind==='explosiveMagicII'){
   dmg=mag();total=await arenaHit_(actor,target,dmg,'magic',`-${dmg} 魔法`);
   if(target.hp>0)arenaTryStatus_(actor,target,'burning',2,1);
   if(kind==='explosiveMagicII'&&target.hp>0&&Math.random()<Math.max(0,Math.min(1,Number(sk.value??.15))))arenaTryStatus_(actor,target,'stun',1,1);
   arenaLog_(`${actor.name} 使用【${name}】造成 ${total} 魔法傷害並附加燃燒${kind==='explosiveMagicII'?'，另判定暈眩':''}。`);
 }else if(kind==='magic'){
   dmg=mag();total=await arenaHit_(actor,target,dmg,'magic',`-${dmg}`);arenaLog_(`${actor.name} 使用【${name}】造成 ${total} 魔法傷害。`);
 }else if(kind==='blessingRain'){
   const debuffs=Object.keys(actor.status||{}).filter(k=>actor.status[k]?.turns>0&&statusDef_(k)?.category==='debuff');
   const removed=debuffs[0]||'';if(removed)delete actor.status[removed];
   const dur=Math.max(1,Number(sk.duration)||2);arenaStatus_(actor,'blessing',dur,1);
   arenaLog_(`${actor.name} 使用【${name}】${removed?`解除【${statusDef_(removed)?.name||removed}】，並`:''}獲得【祝福】${dur} 回合。`);
   await arenaVisual_(actor,target,'buff',removed?`解除異常 / 祝福 ${dur}R`:`祝福 ${dur}R`);render();await wait(650);
 }else if(kind==='haste'||kind==='hasteII'){
   const amount=Math.max(1,Math.trunc(Number(sk.value||1))),changed=[];
   for(const sid of actor.skills||[]){if(sid===id)continue;const nm=skillTemplates?.[sid]?.name;if(nm&&(actor.cooldowns[nm]||0)>0){const before245=actor.cooldowns[nm];actor.cooldowns[nm]=Math.max(0,actor.cooldowns[nm]-amount);cooldownNotice245_(nm,before245-actor.cooldowns[nm],actor);changed.push(nm)}}
   arenaLog_(`${actor.name} 使用【${name}】，其他技能 CD -${amount}${changed.length?`：${changed.join('、')}`:'（目前無其他冷卻技能）'}。`);
   await arenaVisual_(actor,target,'buff',`其他技能 CD -${amount}`);render();await wait(650);
 }else if(kind==='charge'){
   const dur=Math.max(1,Number(sk.duration)||2),rate=Number(sk.mult??.5),dv=Number(sk.value||0);
   const dp=Math.max(1,Math.trunc(Number(actor.stats.patk||0)*rate)),dm=Math.max(1,Math.trunc(Number(actor.stats.matk||0)*rate));
   actor.stats.patk+=dp;actor.stats.matk+=dm;actor.stats.def+=dv;actor.chargeDelta={patk:dp,matk:dm,def:dv};actor.buff.charge=dur;
   arenaLog_(`${actor.name} 使用【${name}】，防禦 +${dv}、物攻/魔攻 +${Math.round(rate*100)}%，持續 ${dur} 回合。`);
   await arenaVisual_(actor,target,'buff',`防禦 +${dv} / 雙攻 +${Math.round(rate*100)}%`);render();await wait(650);
 }else{
   dmg=phys();total=await arenaHit_(actor,target,dmg,crit?'crit':'physical',`-${dmg}${crit?' 爆擊!':''}`);arenaLog_(`${actor.name} 使用【${name}】造成 ${total}${crit?'（爆擊）':''} 傷害。`);arenaFx_(target===arenaBattle_.attacker?'attacker':'defender',`-${total}${crit?' 爆擊!':''}`,crit?'crit':'damage');
 }
 if(arenaHasDead59_()){actor.fxActiveSkillId=null;return total;}
 if(kind!=='fx')total+=await fxEvent_('cast',actor,target,fxSkillKeys_(id));
 actor.fxActiveSkillId=null;
 const statusId=String(sk.statusId||sk.status||'').trim().toLowerCase();
 if(statusId&&target.hp>0){const chance=Math.max(0,Math.min(1,Number(sk.statusChance??sk.chance??1)));if(Math.random()<chance&&arenaTryStatus_(actor,target,statusId,Number(sk.statusDuration??sk.duration??2),Number(sk.statusStacks??1)))arenaLog_(`${target.name} 陷入【${statusDef_(statusId)?.name||statusId}】。`)}

 if(Number(sk.cd??sk.cooldown)>0){actor.cooldowns[name]=equipmentNoCooldown462_(sk,actor)?0:Number(sk.cd??sk.cooldown);if(actor.cooldowns[name]>0)arenaEffectText_(actor,`${name} CD ${actor.cooldowns[name]}`,'buff')}
 arenaFinishArcaneRound_(actor,isAttackSkill_(sk));
 return total
}
function pixelCast192_(side,sk){record471('cast',{actor:side==='player'?'attacker':'defender',skillId:sk.id||Object.keys(skillTemplates).find(id=>skillTemplates[id]===sk),name:sk.name});}
function arenaSide_(x){return x===arenaBattle_?.attacker?'attacker':'defender'}
function arenaPrepareArcaneForSkill_(actor,sk){
 actor.arcaneCastMultiplier=1;if(sk?.kind==='magicBurst'||!arenaMageAptitudeIIActive_(actor)||!isMagicAttackSkill_(sk))return;
 const n=arcaneStacksValue_(actor.arcaneStacks);if(n===0)return;
 actor.arcaneStacks=0;actor.arcaneCastMultiplier=1+n*.15;
 arenaLog_(`${actor.name}【魔導】消耗 ${n} 層，本次魔法技能傷害 +${n*15}%。`);arenaEffectText_(actor,`魔導 ${n} 層 → +${n*15}%`,'buff');render();
}
function arenaMageAptitudeIIActive_(actor){return actor?.passive==='mageAptitudeII'&&!(Number(actor.status?.forget?.turns||0)>0)}
function isMagicAttackSkill_(sk){return !!sk&&(fxSplit_(sk.effectKey).some(k=>{const f=fxParse_(k);return f?.type==='castDamage'&&f.kind==='magic'})||['heavenlyThunder','magic','magicMulti','magicBurst','explosiveMagic','explosiveMagicII','magicSlash','magicSlashII','buffMatk','buffMatkII'].includes(sk.kind));}
function arcaneStacksValue_(value){return Math.max(0,Math.min(3,Math.trunc(Number(value)||0)))}
function render(){record471('state');}
function questArenaAtk368_(actor,stat){const id=stat==='patk'?'weakness':'suppression';return Number(actor.stats[stat]||0)*(actor.status?.[id]?.turns>0?Number(statusDef_(id).value??.2):1);}
async function questArenaSkill368_(actor,target,id,sk,phys,mag){let total=0;
 if(id==='enchantedBlade'){
  const eligible=questBladeEligible368_(questArenaAtk368_(actor,'patk'),questArenaAtk368_(actor,'matk'));
  balancedArenaBuff241_(actor,'enchantedBlade368',sk,{patkRate:.35,matkRate:.35});
  if(eligible&&!(actor.status?.enhancement_lock?.turns>0)){actor.shields=arenaActiveShields60_(actor).filter(x=>x.id!=='enchantedBlade368');const raw=actor.maxHp,bonus=arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain');arenaAddShield60_(actor,{id:'enchantedBlade368',name:sk.name,hp:Math.trunc(raw*(1+bonus/100)),turns:2});}
  arenaLog_(`【${sk.name}】雙攻+35%，持續2回合${eligible?'；獲得最大HP100%護盾':''}。`);await arenaVisual_(actor,target,'buff',sk.name);render();return 0;
 }
 if(id==='godspeedSlash'&&!(actor.status?.enhancement_lock?.turns>0))actor.buff.godspeedSlash368=2;
 for(let hit=0;hit<sk.hits&&actor.hp>0&&target.hp>0;hit++){
  const magic=id==='heavenlyThunder',dmg=magic?mag(2):phys(1.5);actor.attackMissed241=false;
  total+=await arenaHit_(actor,target,dmg,magic?'magic':actor.lastPhysicalCrit462?'crit':'physical',`-${dmg}`);
  if(magic&&!actor.attackMissed241)questThunderProc368_(sid=>{if(target.hp>0)arenaTryStatus_(actor,target,sid,1,1);},()=>{if(arenaMageAptitudeIIActive_(actor))actor.arcaneStacks=Math.min(3,Number(actor.arcaneStacks||0)+1);});
  arenaLog_(`【${sk.name}】第${hit+1}擊${actor.attackMissed241?'被迴避':''}。`);render();await wait(220);
 }
 return total;
}
function questBladeEligible368_(patk,matk){return Number(patk)>=Number(matk)*.85;}
function balancedArenaBuff241_(actor,key,sk,values){
 if(actor.status?.enhancement_lock?.turns>0){arenaLog_(`【庇護封鎖】${actor.name} 無法獲得技能強化效果。`);return false;}
 clearBalancedArenaBuff241_(actor,key);const delta={patk:0,matk:0,crit:0,critDamage:0,damageReduction:Number(values.damageReduction)||0};
 for(const stat of ['patk','matk']){delta[stat]=Math.trunc(Number(actor.stats[stat]||0)*Number(values[stat+'Rate']||0)+1e-8);actor.stats[stat]+=delta[stat];}
 delta.crit=Math.max(0,Math.min(100,Number(actor.stats.crit||0)+Number(values.crit||0)))-Number(actor.stats.crit||0);actor.stats.crit+=delta.crit;
 delta.critDamage=Number(values.critDamage)||0;actor.stats.critDamage=Number(actor.stats.critDamage||100)+delta.critDamage;
 actor.balanceDeltas241||={};actor.balanceDeltas241[key]=delta;actor.buff[key]=Math.max(1,Number(sk.duration)||2);return true;
}
function clearBalancedArenaBuff241_(actor,key){
 const delta=actor.balanceDeltas241?.[key];if(!delta)return;
 for(const stat of ['patk','matk','crit','critDamage'])actor.stats[stat]=Number(actor.stats[stat]||0)-Number(delta[stat]||0);
 delete actor.balanceDeltas241[key];
}
function fxSum_(keys,type){return keys.reduce((n,k)=>{const f=fxParse_(k);return n+(f?.type===type?f.n:0)},0)}
function arenaAddShield60_(x,sh){
 const shields=arenaActiveShields60_(x),hp=Math.max(0,Math.trunc(Number(sh.hp)||0));
 if(!x||x.hp<=0||hp<=0)return null;
 const entry={...sh,id:String(sh.id||'shield'),name:String(sh.name||'護盾'),hp,max:hp,turns:Math.max(1,Number(sh.turns)||1)};
 shields.push(entry);playSfx('shield',{sample:entry.id==='magicShield'||entry.kind==='magic'?'magicShield':'shield'});refreshArenaShields111_();return entry;
}
function playSfx(name){record471('sound',{name});}
function refreshArenaShields111_(){}
function arenaVisual_(actor,target,kind,text='',impactDelay=320){record471('visual',{actor:side471(actor),target:side471(target),kind,text,impactDelay,skillId:actor.fxActiveSkillId||null});}
async function arenaHit_(actor,target,amount,visualKind='physical',text=''){
 actor.attackMissed241=false;
 const evade241=actor.hp>0&&target.hp>0&&amount>0&&!(target.status?.invincible?.turns>0)?attackEvasion281_(target):null;if(evade241){playSfx('evasion323');actor.attackMissed241=true;arenaLog_(`${target.name}【${evade241.name}】迴避攻擊。`);arenaEffectText_(target,'迴避！','buff');return 0;}
 const golden144=goldenActive144_(actor),shield144=(target.shields||[]).reduce((n,s)=>n+s.hp,0);amount=Math.floor(amount*(1+.2*golden144));
 if(actor.hp<=0||target.hp<=0||arenaBattle_?.finished)return 0;
 arenaRefreshPair46_(actor,target);
 if(visualKind==='physical'||visualKind==='crit'){
  const pct=arenaEffectNumber_(actor,'physical_damage_no_buff_',0);
  if(pct>0&&!emptyMirrorArenaHasBuff_(actor)){
   const before44=amount;amount=Math.max(1,Math.trunc(Number(amount)*(100+pct)/100));effectNotice44_(`physical_damage_no_buff_${pct}`,actor,`無 BUFF 物理增傷 +${pct}%，本次傷害 ${before44}→${amount}。`,`物傷 +${pct}%`);
   if(text)text=text.replace(/^-\d+/,`-${amount}`);
  }
 }
 if(visualKind==='magic'&&fxArenaContext_(actor,target).enemyDebuff){
  const pct=arenaEffectNumber_(actor,'magic_damage_vs_debuff_',0);
  if(pct>0){const before=amount;amount=Math.trunc(amount*(100+pct)/100);effectNotice44_(`magic_damage_vs_debuff_${pct}`,actor,`敵人有 Debuff，魔法傷害 ${before}→${amount}（+${pct}%）。`,`魔傷 +${pct}%`)}
 }
 const keys=[...fxArenaKeys_(actor),...fxSkillKeys_(actor.fxActiveSkillId)];
 const modifierBefore44=amount;
 amount=fxDamage_(amount,visualKind==='magic'?'magic':'physical',keys,fxArenaContext_(actor,target));if(text)text=text.replace(/^-\d+/,`-${amount}`);
 await arenaVisual_(actor,target,visualKind,text||`-${Math.max(0,Math.trunc(amount))}`);
 effectModifierReport44_(keys,'damage',actor,modifierBefore44,amount,fxArenaContext_(actor,target),visualKind==='magic'?'magic':'physical');
 const got=arenaTakeDamage_(target,amount,'damage',actor);let extraDamage462=0;
 chaosBreakHeal332_(shield144,arenaShieldTotal60_(target),actor);
 if(got>0||shield144>(target.shields||[]).reduce((n,s)=>n+s.hp,0))goldenHeal144_(golden144,actor);
 if(got<=0&&shield144>arenaShieldTotal60_(target)&&!actor.attackMissed241)await chaosFxEvent332_('onhit',actor,target,fxSkillKeys_(actor.fxActiveSkillId));
 if(actor.orderSkillActive127)actor.orderSkillDamage127=(actor.orderSkillDamage127||0)+got;
 if(got>0){const steal=Math.trunc(got*Math.min(100,fxSum_(keys,'lifesteal'))/100);const restored=fxArenaHeal_(actor,steal);if(steal>0)effectNotice44_(keys.find(k=>fxParse_(k)?.type==='lifesteal'),actor,`有效傷害 ${got}，吸血計算 ${steal}，實際恢復 ${restored} HP。`,`吸血 +${restored}`);await fxEvent_('onhit',actor,target,fxSkillKeys_(actor.fxActiveSkillId));if(visualKind==='crit')extraDamage462+=await fxEvent_('oncrit',actor,target,fxSkillKeys_(actor.fxActiveSkillId));}
 arenaProcOnHitEffects_(actor,target,visualKind==='crit');
 render();return got+extraDamage462
}
function attackEvasion281_(actor=null){
 const sources=[];
 if(!actor&&petAllowed297())for(const t of petActiveTraits297().filter(t=>t.stat==='evasion'))sources.push({rate:t.value/100,name:'同行寵物'});const passive=skillEvasion241_(actor);if(passive>0)sources.push({rate:passive,name:skillTemplates[actor?actor.passive:state.passive?.[0]]?.name||'被動技能'});
 const items=actor?(actor.equipmentList||Object.values(actor.equipment||{})):equippedItems();
 for(const item of items.filter(Boolean)){
  const add=(keys,name)=>{for(const key of new Set(keys)){const m=String(key).match(/^attack_evasion_percent_(\d+(?:\.\d+)?)$/);if(m)sources.push({rate:Math.min(1,Math.max(0,Number(m[1])/100)),name});}};
  add(itemEffectKeys_(item),itemTemplates[item.template]?.name||item.name||'裝備');
  for(const gem of (item.gems||[]).filter(Boolean)){const resolved=gemResolved_(gem);add(fxSplit_(resolved?.effect??gem.effect??''),resolved?.name||gem.name||'寶石');}
 }
 const extra368=actor?(actor.buff?.godspeedSlash368>0?.15:0):(state.currentBattle?.playerBuffEffects||[]).filter(x=>x.id==='godspeedSlash368'&&x.turns>0).reduce((n,x)=>Math.max(n,Number(x.evasion368)||0),0);
 if(extra368>0){const base368=1-sources.reduce((n,x)=>n*(1-Math.max(0,Math.min(1,x.rate))),1);return Math.random()<Math.min(1,base368+extra368)?{rate:base368+extra368,name:'神速斬擊／迴避'}:null;}
 for(const source of sources)if(source.rate>0&&Math.random()<source.rate)return source;
 return null;
}
function petAllowed297(){return !(typeof readyRoom24_!=='undefined'&&['arena','boxing'].includes(readyRoom24_?.kind||readyRoom24_?.mode))&&!petSuppress297&&!state.currentBattle?.boxingMachine&&state.page!=='arenaBattle'&&state.page!=='boxing'&&!String(state.page||'').startsWith('arena');}
let readyRoom24_=null;
let petSuppress297=false;
function petActiveTraits297(){return petAllowed297()?petTraits297(state):[];}
function petTraits297(save){const p=petEquipped297(save);return p?(p.traits||[]).slice(0,p.level>=100?3:p.level>=50?2:1):[];}
function petEquipped297(save){return (save.pets297||[]).find(p=>p.id===save.equippedPet297)||null;}
function skillEvasion241_(actor=null){
 if(actor?actor.status?.forget?.turns>0:passiveSuppressed_())return 0;
 const id=actor?actor.passive:state.passive?.[0],key=String(skillTemplates[id]?.effectKey||'');
 return Math.min(1,Math.max(0,Number(key.match(/(?:^|\|)attack_evasion_percent_(\d+(?:\.\d+)?)/)?.[1]||0)/100));
}
function passiveSuppressed_(){return hasBattleStatus('player','forget')}
function hasBattleStatus(target,id){
  const b=state.currentBattle;if(!b)return false;
  if(target==='player'){
    if(id==='poison')return (b.poison||0)>0;
    if(id==='burning')return (b.burning||0)>0;
    if(id==='heal_block')return (b.healBlockTurns||0)>0;
    if(id==='stun')return (b.stunTurns||0)>0;
    if(id==='invincible')return (b.invincibleTurns||0)>0;
  }else{
    if(id==='invincible'&&rockInvincible_(b))return true;
    if(id==='poison')return (b.enemyPoison||0)>0;
    if(id==='burning')return (b.enemyBurning||0)>0;
  }
  return !!genericStatus_(target,id);
}
function rockInvincible_(b=state.currentBattle){return rockBoss_(b)&&Number(b.rockInvincibleThroughTurn||0)>=Number(b.turn||1);}
function rockBoss_(b=state.currentBattle){return !!b&&(enemyBehaviors[b.enemyKey]||[]).some(x=>x.action==='rock_player_turn_defense'||x.action==='mountain_player_turn_growth');}
let enemyBehaviors={};
function genericStatus_(target,id){const s=ensureBattleStatuses_();return s?.[target]?.[id]||null}
function ensureBattleStatuses_(){throw Error('MIST_NON_ARENA_PATH:ensureBattleStatuses_');}
function goldenActive144_(actor=null){const b=state.currentBattle;return actor?(actor.hp>0&&actor.hp<actor.maxHp*.5?goldenCount144_(actor):0):(b?.playerHp>0&&b.playerHp<battlePlayerStats().hp*.5?goldenCount144_():0);}
function goldenCount144_(actor=null){return worldGemEntries141_(actor).filter(x=>x.key==='golden_dragon_20_2').length;}
function worldGemEntries141_(actor=null){
 if(actor)return arenaEffectEntries46_(actor).filter(x=>String(x.source||'').startsWith('gem:'));
 const out=[];for(const it of equippedItems())for(const g of it.gems||[])if(g)for(const key of String(gemResolved_(g).effect||'').split(/[\n,;|]+/).map(s=>s.trim()).filter(Boolean))out.push({key});return out;
}
function battlePlayerStats(){throw Error('MIST_NON_ARENA_PATH:battlePlayerStats');}
function fxDamage_(amount,kind,keys,ctx){let pct=0;for(const key of keys){const f=fxParse_(key);if(f?.type==='damage'&&(f.kind==='all'||f.kind===kind)&&fxCondition_(f.condition,ctx))pct+=f.n;}return Math.max(0,Math.trunc(amount*Math.max(0,(100+pct)/100)));}
function effectModifierReport44_(keys,type,actor,before,after,ctx,kind=''){
 if(before===after)return;
 const active=keys.filter(k=>{const f=fxParse_(k);return f?.type===type&&fxCondition_(f.condition||'always',ctx)&&(!kind||f.kind==='all'||f.kind===kind)});
 if(!active.length)return;
 const sources=[...new Set(active.map(k=>effectSources44_(k,actor)))].join('、');
 effectNotice44_(active[0],actor,`${active.map(effectDescription_).join('；')}；本次${type==='reduce'?'承受':'造成'}傷害 ${before}→${after}。`,type==='reduce'?`減傷 ${before-after}`:`傷害 ${before}→${after}`,sources);
}
function arenaTakeDamageBase468_(target,amount,kind='damage',source=null){
 if(!target||target.hp<=0)return 0;
 let dmg=fxReduce_(Math.max(0,Math.trunc(Number(amount)||0)),fxArenaKeys_(target),fxArenaContext_(target,source));
 if(target.status.invincible?.turns>0){arenaLog_(`${target.name} 的【無敵】免疫 ${dmg} 傷害。`);arenaVisual_(target,source||target,'buff','無敵');return 0}
 effectModifierReport44_(fxArenaKeys_(target),'reduce',target,Math.max(0,Math.trunc(Number(amount)||0)),dmg,fxArenaContext_(target,source));
 dmg=Math.max(0,Math.trunc(dmg*balancedReduction241_(target)+1e-8));
 const multiplier=arenaNoBuffDamageMultiplier_(target);if(dmg>0&&multiplier<1&&!emptyMirrorArenaHasBuff_(target)){const before=dmg,reduce=noBuffReductionPercent_(multiplier);dmg=Math.max(0,Math.trunc(dmg*multiplier));const matched=arenaEffectKeys_(target).find(k=>String(k).startsWith('no_buff_damage_reduction_'))||'no_buff_damage_reduction_10',src=arenaEffectSourceName_(target,matched);arenaLog_(`${target.name} 的【${src}】觸發：受到傷害 ${before} → ${dmg}（-${reduce}%）。`);arenaEffectText_(target,`【${src}】觸發`,'buff',60);arenaEffectText_(target,`傷害 -${reduce}%`,'buff',260)}
 if(target.status.block?.turns>0&&dmg>0){const before=dmg;dmg=Math.max(0,Math.trunc(dmg*Number(statusDef_('block')?.value||.1)));delete target.status.block;playSfx('block221');arenaLog_(`${target.name}【格擋】${before} → ${dmg}。`);arenaEffectText_(target,`格擋 ${before-dmg}`,'buff')}
 for(const sh of [...arenaActiveShields60_(target)]){
  if(dmg<=0)break;
  const shield141=shieldAbsorb141_(dmg,sh.hp,kind==='damage'&&source?activeShieldBonus141_(source):0),ab=shield141.absorbed;sh.hp-=ab;dmg=shield141.remaining;
  arenaLog_(`${target.name} 的【${sh.name}】吸收 ${ab} 傷害。`);arenaEffectText_(target,`${sh.name} -${ab}`,'buff');
  if(sh.hp<=0){
   playSfx('shieldBreak');
   const r=sh.retaliate;sh.retaliate=null;arenaActiveShields60_(target);
   if(r&&source&&source.hp>0){
    const rd=Math.max(1,Math.trunc(Number(r.matk||0)*Number(r.mult??1)));
    const got=arenaTakeDamage_(source,rd,'shieldReflect',null);
    arenaLog_(`${target.name} 的【${sh.name}】被擊破，反擊實際造成 ${got} 魔法傷害。`);arenaEffectText_(source,`-${got} 光盾反擊`,'magic');
   }
  }
 }
 const before=target.hp;
 let protected59=false;
 if(dmg>0&&dmg>=before&&target.passive==='guts'&&before/target.maxHp>=.8&&!target.gutsUsed){target.gutsUsed=true;target.hp=1;protected59=true;arenaLog_(`${target.name} 的【根性】發動，HP 保留 1。`);arenaVisual_(target,source||target,'buff','根性');}
 if(!protected59&&dmg>0&&dmg>=before&&!target.lethalGuardUsed){const pct=arenaEffectNumber_(target,'lethal_guard_shield_',0);if(pct>0){target.lethalGuardUsed=true;target.hp=1;protected59=true;const rawSh=Math.max(1,Math.trunc(target.maxHp*pct/100)),bonus=arenaEffectNumber_(target,'shield_gain_',0)+fxSum_(fxArenaKeys_(target),'shield_gain'),sh=Math.trunc(rawSh*(100+bonus)/100);effectGainReport44_(target,'shield_gain','shield_gain_',rawSh,sh,'護盾量');const src=arenaEffectSourceName_(target,`lethal_guard_shield_${pct}`);arenaAddShield60_(target,{id:'mirrorLethalGuard',name:src,hp:sh,turns:2});arenaLog_(`${target.name}【${src}】擋下致命傷害，保留 1 HP 並獲得 ${sh} 護盾。`);arenaEffectText_(target,`${src}｜保留 1 HP`,'buff');arenaEffectText_(target,`護盾 +${sh}`,'buff');}}
 if(!protected59)target.hp=Math.max(0,before-dmg); zeroParadoxArena395_(target,before); const actualTaken59=Math.max(0,before-target.hp);
 const reflection=reflectEffect56_(arenaEffectEntries46_(target).map(e=>e.key));
 if(source&&actualTaken59>0&&reflection.rate>0&&source.hp>0){
  const actual=actualTaken59,raw=Math.max(1,Math.trunc(actual*reflection.rate)),def=Number(source.stats.def||0),rd=Math.max(1,raw-def);
  // source=null prevents reflections from triggering another reflection.
  const reflected=arenaTakeDamage_(source,rd,'reflect',null);
  effectNotice44_(reflection.key,target,`受到實際傷害 ${actual} × ${reflection.percent}% = ${raw}，物理反傷扣除對方防禦 ${def}，對 ${source.name} 實際造成 ${reflected} 傷害。`,`${reflection.percent}%反傷 ${reflected}`);
  if(reflected>0){reflectAttackFx56_(arenaCombatantEl_(target),arenaCombatantEl_(source));arenaEffectText_(source,`-${reflected} 反傷`,'damage');}
 }
 const gloryEntry=arenaEffectEntries46_(target).find(e=>/^afterhit_block_\d+(?:\.\d+)?_once_per_turn$/.test(e.key));
 const gloryChance=gloryEntry?Number(gloryEntry.key.match(/^afterhit_block_(\d+(?:\.\d+)?)/)[1]):Math.max(0,arenaEffectNumber_(target,'afterhit_block_',0));
 if(target.hp>0&&source&&actualTaken59>0&&gloryChance>0&&Math.random()<Math.min(100,gloryChance)/100){
   arenaStatus_(target,'block',1,1);
   arenaLog_(`${target.name} 的【榮耀鎧甲】判定成功，獲得【格擋】（最多持有一個，觸發後消耗）。`);arenaEffectText_(target,'榮耀鎧甲：格擋','buff')
 }
 if(target.hp>0&&source&&actualTaken59>0)void fxEvent_('afterhit',target,source).catch(console.error);
 refreshArenaShields111_();
 return actualTaken59;
}
function fxReduce_(amount,keys,ctx){let pct=0;for(const key of keys){const f=fxParse_(key);if(f?.type==='reduce'&&fxCondition_(f.condition,ctx))pct+=f.n;}return Math.max(0,Math.trunc(amount*(100-Math.min(90,Math.max(0,pct)))/100));}
function balancedReduction241_(actor=null){
 if(actor){let mult=1;for(const [key,delta]of Object.entries(actor.balanceDeltas241||{}))if(actor.buff?.[key]>0)mult*=1-Math.max(0,Math.min(1,Number(delta.damageReduction)||0));return mult;}
 return activeBattleBuffEffects_().reduce((mult,x)=>mult*(1-Math.max(0,Math.min(1,Number(x.damageReduction)||0))),1);
}
function activeBattleBuffEffects_(){ensureBattleBuffs();return (state.currentBattle?.playerBuffEffects||[]).filter(x=>(x.turns||0)>0);}
function ensureBattleBuffs(){
  const b=state.currentBattle;if(!b)return null;
  if(!b.playerBuffs)b.playerBuffs={patk:0,patkTurns:0,matk:0,matkTurns:0,def:0,defTurns:0,regen:0,regenTurns:0,omniTurns:0,patkRate:0,matkRate:0,crit:0};
  if(!Array.isArray(b.playerBuffEffects))b.playerBuffEffects=[];
  if(!Array.isArray(b.playerShields))b.playerShields=[];
  if(b.magicShield&&(b.magicShield.hp||0)>0&&(b.magicShield.turns||0)>0&&!b.magicShield._migrated){b.playerShields.push({...b.magicShield,id:'legacyShield',name:'護盾'});b.magicShield._migrated=true;}
  return b.playerBuffs;
}
function arenaNoBuffDamageMultiplier_(actor){
  const keys=[];
  for(const item of (actor?.equipmentList||Object.values(actor?.equipment||{})).filter(Boolean)){
    keys.push(...itemEffectKeys_(item));
    for(const g of (item.gems||[]).filter(Boolean))keys.push(...new Set(fxSplit_(g.effect)));
  }
  return noBuffDamageMultiplier_(keys);
}
function noBuffDamageMultiplier_(keys){
  let multiplier=1;
  for(const key of keys||[]){const m=String(key).match(/^no_buff_damage_reduction_(\d+(?:\.\d+)?)$/i);if(m)multiplier*=1-Math.min(100,Math.max(0,Number(m[1])))/100;}
  return Math.max(0,multiplier);
}
function noBuffReductionPercent_(multiplier){return Math.round((1-multiplier)*1000000)/10000;}
function arenaEffectSourceName_(x,key){
 const resolved=effectSources44_(key,x);if(resolved!=='技能效果')return resolved;
 for(const it of (x?.equipmentList||[]))if(itemEffectKeys_(it).includes(key))return it.name||itemTemplates?.[it.template]?.name||'裝備能力';
 return '裝備能力';
}
function shieldAbsorb141_(damage,shield,bonus=0){
 const base=Math.min(Math.max(0,damage),Math.max(0,shield)),extra=Math.max(0,Math.trunc(base*Math.max(0,bonus)/100));
 return {absorbed:Math.min(Math.max(0,shield),base+extra),remaining:Math.max(0,damage-base)};
}
function activeShieldBonus141_(actor=null){const chaos=(actor||state.currentBattle?.directShield141)?fxSum_(actor?fxArenaKeys_(actor):fxMainKeys_(),'chaosShield'):0;return chaos+(actor?worldGemSum141_('shield_break_active_',actor):(state.currentBattle?.directShield141?worldGemSum141_('shield_break_active_'):0));}
function fxMainKeys_(){throw Error('MIST_NON_ARENA_PATH:fxMainKeys_');}
function worldGemSum141_(prefix,actor=null){return worldGemEntries141_(actor).reduce((sum,x)=>{const tail=x.key.startsWith(prefix)?x.key.slice(prefix.length):'';return sum+(tail!==''&&Number.isFinite(Number(tail))?Math.max(0,Number(tail)):0);},0);}
function effectGainReport44_(){}
function zeroParadoxArena395_(target,before){
  if(!target||target.zeroParadoxUsed395||!arenaHasEffect_(target,'first_below_hp_30_invincible_1_cd_reduce_1'))return false;
  if(!zeroParadoxThreshold395_(before,target.hp,target.maxHp,false))return false;
  target.zeroParadoxUsed395=true;
  const blocked=Number(target.status?.enhancement_lock?.turns||0)>0;
  if(!blocked)arenaStatus_(target,'invincible',1,1);
  const count=zeroParadoxCd395_(target.cooldowns);
  arenaLog_(`${target.name}【零時悖論】HP 首次低於 30%，${blocked?'無敵遭封鎖':'獲得 1 回合【無敵】'}，${count} 個主動技能 CD -1。`);
  arenaEffectText_(target,blocked?'零時悖論：CD -1':'零時悖論：無敵 / CD -1','buff');
  return true;
}
function arenaHasEffect_(x,key){return arenaEffectKeys_(x).includes(key)}
function zeroParadoxThreshold395_(before,after,maxHp,used){
  const max=Number(maxHp)||0;
  return !used&&max>0&&before>0&&after>0&&before/max>=.3&&after/max<.3;
}
function arenaStatus_(target,id,turns=2,stacks=1){if(id==='block'){target.status.block={turns:1,stacks:1};playSfx('gainBuff226',{side:target===arenaBattle_?.attacker?'player':'enemy'});return;}const cur=target.status[id]||{turns:0,stacks:0};cur.turns=Math.max(cur.turns,Math.max(1,Number(turns)||1));cur.stacks=statusDef_(id)?.stackable===false?1:Math.max(1,cur.stacks+Math.max(1,Number(stacks)||1));target.status[id]=cur;if(statusDef_(id)?.category==='debuff')playSfx('debuff');else if(statusDef_(id)?.category==='buff')playSfx('gainBuff226',{side:target===arenaBattle_?.attacker?'player':'enemy'})}
function zeroParadoxCd395_(cooldowns){
  if(!cooldowns||typeof cooldowns!=='object')return 0;
  let changed=0;
  for(const id of Object.keys(cooldowns)){
    const before=Math.max(0,Math.trunc(Number(cooldowns[id])||0));
    if(before>0){cooldowns[id]=before-1;changed++;}
  }
  return changed;
}
function reflectEffect56_(keys=[]){
 let percent=0,key='',highest=0;
 for(const effect of keys){
  const m=String(effect||'').trim().match(/^reflect(20|60)$/i);
  if(!m)continue;const value=Number(m[1]);percent+=value;
  if(value>highest){highest=value;key=String(effect).trim();}
 }
 return {key,percent,rate:percent/100};
}
function reflectAttackFx56_(actor,target){record471('reflect',{actor,target});}
function arenaCombatantEl_(x){return side471(x);}
async function fxEventCore468_(event,actor=null,target=null,extra=[]){
 const arena=!!actor,b=state.currentBattle;if(!arena&&!b)return 0;
 await chaosFxEvent332_(event,actor,target,extra);
 const keys=[...(arena?fxArenaKeys_(actor):fxMainKeys_()),...extra],hp=arena?actor.hp:b.playerHp;
 if(hp<=0)return 0;let damage=0;
 for(const key of keys){
  const f=fxParse_(key);if(!f||f.event!==event)continue; if((arena?actor.hp:b.playerHp)<=0)break;
  const max=arena?actor.maxHp:battlePlayerStats().hp;
  const reportBefore=effectSnapshot44_(actor);let reportApplied=false;
  if(f.type==='cooldown'&&arena&&f.target==='enemy')reportBefore.cd={...(target?.cooldowns||{})};
  if(f.type==='critGrowth462'){
   const owner=actor||b;owner.equipmentPatkPct462=(Number(owner.equipmentPatkPct462)||0)+f.n;
   if(arena)arenaRefreshConditionalStats_(actor);
   effectNotice44_(key,actor,`爆擊造成傷害，物攻累計 +${owner.equipmentPatkPct462}%（本場戰鬥，採加算）。`,`物攻 +${owner.equipmentPatkPct462}%`);
  }else if(f.type==='critMaxHp462'){
   const enemy=arena?target:battleEnemy(b),enemyHp=arena?target?.hp:b.enemyHp;
   if(!enemy||enemyHp<=0)continue;
   const chance=(arena?actor.hp:b.playerHp)/max<f.threshold?f.lowChance:f.chance;if(Math.random()>=chance)continue;
   const raw=Math.trunc(Number(arena?target.maxHp:enemy.hp)*f.n/100),def=arena?Number(target.stats.def||0)*(target.status?.armor_break?.turns>0?.7:1):effectiveEnemyDef_(enemy,b),hit=Math.max(1,Math.trunc(raw-def));
   let actual=0;
   if(arena){actual=arenaTakeDamage_(target,fxDamage_(hit,'physical',keys,fxArenaContext_(actor,target)),'equipmentProc462',actor);arenaEffectText_(target,`-${actual} 追加`,'damage');}
   else{const missed=b.windDodged69;try{actual=await applyDirectDamageToEnemyLegacy122_(hit,'physical',effectSources44_(key),true);await phantomFlush122_(b);}finally{b.windDodged69=missed;}floatText(document.getElementById('enemyFx'),`-${actual} 追加`,'damage');}
   damage+=actual;effectNotice44_(key,actor,`爆擊追加：敵人最大 HP ×${f.n}% = ${raw}，扣除防禦 ${def}，實際造成 ${actual} 物理傷害（觸發率 ${chance*100}%）。`,`追加傷害 ${actual}`);
  }else if(f.type==='skipCooldown462'){
   const name=randomOtherCooldown241_(null,f.n,actor);if(name)effectNotice44_(key,actor,`跳過回合，隨機技能【${name}】額外 CD -${f.n}。`,`${name} CD -${f.n}`);
  }else if(f.type==='heal'){
   const raw=Math.trunc(max*f.n/100);const healed=arena?fxArenaHeal_(actor,raw):resolvePlayerHealing_(raw,max,'企劃效果').healed;

  }else if(f.type==='shield'){
   const raw=Math.trunc(max*f.n/100);
   if(arena){const bonus=arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain');effectGainReport44_(actor,'shield_gain','shield_gain_',raw,Math.trunc(raw*(100+bonus)/100),'護盾量');arenaAddShield60_(actor,{id:`fx:${key}`,name:effectSources44_(key,actor)==='技能效果'?(skillTemplates?.[actor.fxActiveSkillId]?.name||'特殊護盾'):effectSources44_(key,actor),hp:Math.trunc(raw*(100+bonus)/100),turns:f.duration});}
   else addBattleShield_({name:'特殊護盾',hp:raw,turns:f.duration});
  }else if(f.type==='status'){
   if(Math.random()>=f.chance)continue;
   if(arena){const victim=f.target==='self'?actor:target;if(victim?.hp>0)reportApplied=arenaTryStatus_(actor,victim,f.status,f.duration,f.stacks);}
   else if(f.target==='self'||b.enemyHp>0)reportApplied=applyBattleStatus_(f.target==='self'?'player':'enemy',f.status,{duration:f.duration,stacks:f.stacks});
  }else if(f.type==='cooldown'){
   const victim=arena?(f.target==='self'?actor:target):b;
   if(!arena&&f.target==='enemy')continue; // PvE enemies currently have scripted actions, no skill-CD store.
   for(const k of Object.keys(victim?.cooldowns||{})){const cd=Number(victim.cooldowns[k])||0;if(cd>0){victim.cooldowns[k]=Math.max(0,cd+(f.mode==='reduce'?-f.n:f.n));if(f.mode==='reduce')cooldownNotice245_(k,cd-victim.cooldowns[k],arena?victim:null);}}
  }else if(f.type==='cleanse'||f.type==='dispel'){
   reportApplied=[];
   const side=f.type==='cleanse'?'self':'enemy',cat=f.type==='cleanse'?'debuff':'buff';
   if(arena){const victim=side==='self'?actor:target;if(!victim)continue;let n=f.n;
    for(const [id,v] of Object.entries(victim.status||{}))if(n>0&&v.turns>0&&statusDef_(id)?.category===cat){reportApplied.push(statusDef_(id)?.name||id);delete victim.status[id];n--;}
    // Direct stat buffs need their original reversal path. Expire them through arenaTick's buff loop.
    if(cat==='buff'&&n>0&&Object.values(victim.buff||{}).some(v=>v>0)){
     for(const [id,turns] of Object.entries(victim.buff))if(n>0&&turns>0){reportApplied.push(id);fxExpireArenaBuff_(victim,id);n--;}
    }
   }else{
    const t=side==='self'?'player':'enemy',ids=['poison','burning','heal_block','stun','invincible',...Object.keys(ensureBattleStatuses_()?.[t]||{})];
    let n=f.n;for(const id of [...new Set(ids)])if(n>0&&statusDef_(id)?.category===cat&&hasBattleStatus(t,id)){reportApplied.push(statusDef_(id)?.name||id);removeBattleStatus_(t,id);n--;}
   }
  }else if(f.type==='castDamage'){
   reportApplied=damage;
   if(arena){const raw=questArenaAtk368_(actor,f.kind==='physical'?'patk':'matk')*f.n/100,hit=Math.max(1,Math.trunc(raw-(f.kind==='physical'?Number(target.stats.def||0)*(target.status.armor_break?.turns>0?.7:1):0)));const p=actor.passive,s=actor.stats;let mult=1;if(!(actor.status?.forget?.turns>0)){if(p==='adventurerAptitude')mult=(f.kind==='physical'?s.patk>=s.matk:s.matk>=s.patk)?1.05:1;if(f.kind==='magic'&&p==='mageAptitude'&&s.matk>=25)mult=1.1;if(f.kind==='magic'&&p==='mageAptitudeII')mult=(s.matk>=300?1.15:1)*Number(actor.arcaneCastMultiplier||1);}damage+=await arenaHit_(actor,target,Math.trunc(hit*mult),f.kind);}
   else{const stats=battlePlayerStats(),enemy=battleEnemy(b),raw=(f.kind==='physical'?stats.patk:stats.matk)*f.n/100,hit=f.kind==='physical'?applyAdventurerDamageBonus(Math.max(1,Math.trunc(raw-effectiveEnemyDef_(enemy,b))),'physical',stats):magicDamageAgainstEnemy(raw,enemy,stats);damage+=await applyDirectDamageToEnemy_(hit,f.kind,'企劃技能');await applyWeaponOnHitEffect_(false);}
  }
  effectEventReport44_(key,f,actor,target,reportBefore,f.type==='castDamage'?damage-reportApplied:reportApplied);
 }
 return damage;
}
async function chaosFxEvent332_(event,actor,target,extra=[]){
 const b=state.currentBattle,owner=actor||b;if(!owner)return;const keys=[...(actor?fxArenaKeys_(actor):fxMainKeys_()),...extra];
 for(const key of new Set(keys)){const f=chaosFxParse332_(key);if(!f||f.event!==event||Math.random()>=f.n/100)continue;
  if(f.type==='chaosBlock'&&owner.chaosBlockAction332)continue;const id=f.type==='chaosRandom'?(Math.random()<.5?'weakness':'suppression'):'heal_block';
  let ok=false;if(actor&&target?.hp>0)ok=arenaTryStatus_(actor,target,id,1,1);else if(!actor&&b.enemyHp>0&&!b.windDodged69)ok=applyBattleStatus_('enemy',id,{duration:1});
  if(ok!==false&&f.type==='chaosBlock')owner.chaosBlockAction332=true;
 }
}
function arenaTryStatus_(actor,target,id,turns=2,stacks=1){
 if(actor?.attackMissed241)return false;
 const n=statusDef_(id)?.name||id,immuneKey='immune_'+id;
 if(arenaHasEffect_(target,immuneKey)){const src=arenaEffectSourceName_(target,immuneKey);arenaLog_(`${target.name} 的【${src}】免疫【${n}】。`);arenaEffectText_(target,`${src}｜免疫 ${n}`,'buff');return false}
 if(id==='stun'){for(const entry of arenaEffectEntries46_(target)){const k=entry.key;const m=k.match(/^chance_immune_stun_(\d+(?:\.\d+)?)$/i);if(m&&Math.random()<Number(m[1])/100){effectNotice44_(k,target,`${m[1]}% 獨立判定成功，免疫本次【暈眩】。`,'免疫暈眩',entry.name);return false}}}
 if(target.status.blessing&&statusDef_(id)?.category==='debuff'){arenaLog_(`${target.name} 的【祝福】免疫【${n}】。`);arenaEffectText_(target,`祝福免疫：${n}`,'buff');return false}
 // Match the normal battle rule: immunity is checked before consuming the once-per-battle effect.
 const def=statusDef_(id);
 if(def?.category==='debuff'&&def.durationType==='turns'&&!target.firstDebuffDurationReduced){
  const reduce=Math.max(0,Math.trunc(arenaEffectNumber_(target,'first_debuff_duration_minus_',0)));
  if(reduce>0){
   const before=Math.max(1,Number(turns)||1);
   turns=Math.max(0,before-reduce);target.firstDebuffDurationReduced=true;
   const src=arenaEffectSourceName_(target,`first_debuff_duration_minus_${reduce}`);
   effectNotice44_(`first_debuff_duration_minus_${reduce}`,target,`首次【${n}】持續時間 ${before}→${turns} 回合。`,'首次 Debuff 減時',src);
   arenaLog_(`${target.name} 的【${src}】觸發：本場第一次有回合數的 Debuff【${n}】持續時間 ${before}→${turns} 回合。`);
   if(turns<=0){arenaEffectText_(target,`${n} 抵消`,'buff');return false}
   arenaEffectText_(target,`${n} 持續時間 -${reduce}`,'buff');
  }
 }
 arenaStatus_(target,id,turns,stacks);arenaEffectText_(target,`${n}${stacks>1?` ×${stacks}`:''}`,'status');return true
}
function applyBattleStatus_(){throw Error('MIST_NON_ARENA_PATH:applyBattleStatus_');}
function effectSnapshot44_(actor=null){
 if(actor)return {hp:actor.hp,shield:arenaShieldTotal60_(actor),cd:{...(actor.cooldowns||{})}};
 const b=state.currentBattle;
 return {hp:b.playerHp,enemyHp:b.enemyHp,shield:(b.playerShields||[]).reduce((n,x)=>n+Number(x.hp||0),0),cd:{...(b.cooldowns||{})}};
}
function battleEnemy(){throw Error('MIST_NON_ARENA_PATH:battleEnemy');}
function effectiveEnemyDef_(){throw Error('MIST_NON_ARENA_PATH:effectiveEnemyDef_');}
function applyDirectDamageToEnemyLegacy122_(){throw Error('MIST_NON_ARENA_PATH:applyDirectDamageToEnemyLegacy122_');}
async function phantomFlush122_(b=state.currentBattle){await phantomFlushLegacy127_(b);await orderFlush127_(b);}
async function phantomFlushLegacy127_(b=state.currentBattle){
 if(!phantomBoss122_(b)||b.phFlushing122)return;
 b.phFlushing122=true;
 try{
  while((b.phRetaliate122||[]).length){
   const raw=b.phRetaliate122.shift();if(b.playerHp<=0)continue;
   playSfx('magic',{side:'enemy'});bossAttackFx55_(document.getElementById('enemyCombatant'),document.getElementById('playerCombatant'),'magic');
   const before=b.playerHp,taken=await applyIncomingDamage(raw,'幻影．魔力光盾反擊',false);
   const actual=Math.max(0,Math.min(before,Number(taken)||0));
   battleEffectText55_('player',`-${actual} 光盾反擊`,'magic');log(`【幻影．魔力光盾】擊破反擊 ${raw} 魔法傷害，實際 HP 傷害 ${actual}。`);updateBattleNumbers();
  }
 }finally{b.phFlushing122=false;}
}
function phantomBoss122_(b=state.currentBattle){return !!b&&(enemyBehaviors[b.enemyKey]||[]).some(x=>x.action==='ph_disguise');}
function bossAttackFx55_(){}
const document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
function applyIncomingDamage(){throw Error('MIST_NON_ARENA_PATH:applyIncomingDamage');}
function battleEffectText55_(){}
function log(){}
function updateBattleNumbers(){}
async function orderFlush127_(b=state.currentBattle){
 if(!orderBoss127_(b)||b.orderFlushing127)return;b.orderFlushing127=true;
 try{while((b.orderReturns127||[]).length){const raw=b.orderReturns127.shift();if(b.playerHp<=0)continue;
  bossAttackFx55_(document.getElementById('enemyCombatant'),document.getElementById('playerCombatant'),'magic');
  const before=b.playerHp,taken=await applyIncomingDamage(raw,'秩序法則・溢出返還',false),actual=Math.min(before,Math.max(0,Number(taken)||0));
  battleEffectText55_('player',`-${actual} 秩序返還`,'magic');log(`【秩序法則】返還 ${raw} 魔法傷害，玩家實際損失 ${actual} HP。`);updateBattleNumbers();await wait(240);
 }}finally{b.orderFlushing127=false;}
}
function orderBoss127_(b=state.currentBattle){return !!b&&(enemyBehaviors[b.enemyKey]||[]).some(x=>x.action==='order_law');}
function wait(ms){record471('wait',{ms});}
function floatText(){}
function randomOtherCooldown241_(id,amount,actor=null){
 const ids=actor?actor.skills:state.equippedSkills,cd=actor?actor.cooldowns:state.currentBattle?.cooldowns;
 if(!cd)return null;const pool=[...new Set(ids||[])].filter(sid=>sid&&sid!==id&&Number(cd[skillTemplates[sid]?.name])>0);
 if(!pool.length)return null;const sid=pool[Math.min(pool.length-1,Math.floor(Math.random()*pool.length))],name=skillTemplates[sid].name;
 const before245=Number(cd[name]);cd[name]=Math.max(0,Number(cd[name])-Math.max(0,Math.trunc(amount)));cooldownNotice245_(name,before245-cd[name],actor);return name;
}
function cooldownNotice245_(){}
function fxArenaHeal_(actor,raw){
 const amount=Math.max(0,Math.trunc(raw*(100+(fxSum_(fxArenaKeys_(actor),'healing_gain')+arenaEffectNumber_(actor,'healing_received_',0)))/100));
 if(actor.hp<=0||actor.status?.heal_block?.turns>0)return 0;
 if(actor.status?.curse?.turns>0){actor.hp=Math.max(0,actor.hp-amount);return 0;}
 effectGainReport44_(actor,'healing_gain','healing_received_',raw,amount,'恢復量');
 const healed=Math.min(amount,Math.max(0,actor.maxHp-actor.hp));actor.hp+=healed;return healed;
}
function resolvePlayerHealing_(){throw Error('MIST_NON_ARENA_PATH:resolvePlayerHealing_');}
function addBattleShield_(){throw Error('MIST_NON_ARENA_PATH:addBattleShield_');}
function fxExpireArenaBuff_(x,key){
 clearBalancedArenaBuff241_(x,key);
 if(key==='patk'&&x.tempPatk){x.stats.patk-=x.tempPatk;x.tempPatk=0;}
 if(key==='matk'&&x.tempMatk){x.stats.matk-=x.tempMatk;x.tempMatk=0;}
 if(key==='def'&&x.tempDef){x.stats.def-=x.tempDef;x.tempDef=0;}
 const delta=key==='charge'?x.chargeDelta:key==='fullPreparation'?x.fullPreparationDelta:null;
 if(delta){for(const stat of ['patk','matk','def','crit'])x.stats[stat]=(x.stats[stat]||0)-(delta[stat]||0);if(key==='charge')x.chargeDelta=null;else x.fullPreparationDelta=null;}
 delete x.buff[key];
}
function removeBattleStatus_(target,id){
  const b=state.currentBattle;if(!b)return;
  if(target==='player'){
    if(id==='poison')b.poison=0;
    else if(id==='burning')b.burning=0;
    else if(id==='heal_block')b.healBlockTurns=0;
    else if(id==='stun')b.stunTurns=0;
    else if(id==='invincible')b.invincibleTurns=0;
  }else{
    if(id==='poison')b.enemyPoison=0;
    else if(id==='burning')b.enemyBurning=0;
  }
  const stores=ensureBattleStatuses_();if(stores?.[target])delete stores[target][id];
}
function applyAdventurerDamageBonus(){throw Error('MIST_NON_ARENA_PATH:applyAdventurerDamageBonus');}
function magicDamageAgainstEnemy(){throw Error('MIST_NON_ARENA_PATH:magicDamageAgainstEnemy');}
function applyDirectDamageToEnemy_(){throw Error('MIST_NON_ARENA_PATH:applyDirectDamageToEnemy_');}
function applyWeaponOnHitEffect_(){throw Error('MIST_NON_ARENA_PATH:applyWeaponOnHitEffect_');}
function effectEventReport44_(){}
function chaosBreakHeal332_(before,after,actor=null){
 const b=state.currentBattle,owner=actor||b,turn=actor?arenaBattle_?.turn:b?.turn;if(!owner||before<=0||after>0||owner.chaosBreakTurn332===turn)return;
 const n=Math.max(0,...(actor?fxArenaKeys_(actor):fxMainKeys_()).map(k=>{const f=chaosFxParse332_(k);return f?.type==='chaosBreak'?f.n:0;}));if(!n)return;owner.chaosBreakTurn332=turn;
 if(actor)fxArenaHeal_(actor,Math.floor(actor.maxHp*n/100));else resolvePlayerHealing_(Math.floor(battlePlayerStats().hp*n/100),battlePlayerStats().hp,'混沌破障核');
}
function goldenHeal144_(count,actor=null){if(!count)return;if(actor){const got=fxArenaHeal_(actor,Math.floor(actor.maxHp*.02*count));if(got)arenaEffectText_(actor,`黃金巨龍 +${got}`,'heal');}else{const b=state.currentBattle;if(b?.playerHp>0){const r=resolvePlayerHealing_(Math.floor(battlePlayerStats().hp*.02*count),battlePlayerStats().hp,'黃金巨龍寶石');if(r.healed)battleEffectText55_('player',`黃金巨龍 +${r.healed}`,'heal');}}}
function arenaProcOnHitEffects_(actor,target,crit=false){
 if(!actor||actor.hp<=0)return;
 for(const entry of arenaEffectEntries46_(actor)){
  const key=entry.key,parsed=parseTriggeredStatusEffectKey_(key);
  if(parsed&&target?.hp>0&&(parsed.trigger==='onhit'||crit)){
   if(Math.random()>=parsed.chance)continue;
   const def=statusDef_(parsed.statusId),duration=def.durationType==='turns'?Math.max(1,Number(def.defaultDuration)||1):3;
   const ok=arenaTryStatus_(actor,target,parsed.statusId,duration,parsed.stacks),cur=target.status[parsed.statusId];
   effectNotice44_(key,actor,`${parsed.trigger==='oncrit'?'爆擊':'攻擊'}觸發（${parsed.chance*100}%），對 ${target.name} 施加【${def.name||parsed.statusId}】：${ok?`目前 ${cur.turns} 回合、${cur.stacks} 層`:'被免疫或抵消'}。`,ok?`${def.name||parsed.statusId} 生效`:'效果被抵消',entry.name);
  }
  const block=key.match(/^onattack_block_(\d+(?:\.\d+)?)$/);
  if(block&&Math.random()<Math.min(100,Number(block[1]))/100){
   arenaStatus_(actor,'block',1,1);
   effectNotice44_(key,actor,`攻擊後 ${block[1]}% 獨立判定成功，獲得【格擋】（不隨回合到期，最多持有一個）；下一次受到傷害降低 90%，觸發後消耗，不隨回合到期。`,'格擋',entry.name);
  }
 }
}
function questThunderProc368_(apply,gain,rng=Math.random){for(const id of ['paralysis','weakness','suppression'])if(rng()<.25)apply(id);gain();}
async function useBalancedArena241_(actor,target,id,sk){
 const kind=sk.kind;if(!['healPercentRegen','adrenalineGuard','manaAwareness','chargeSacrifice','fullPreparation'].includes(kind))return false;
 const rate=Number(sk.mult)||0,turns=Math.max(1,Number(sk.duration)||2);let detail=sk.desc;
 if(kind==='healPercentRegen'){
  const got=fxArenaHeal_(actor,Math.max(0,Number(sk.value)||0));
  if(!(actor.status?.enhancement_lock?.turns>0)&&actor.hp>0){actor.regen=0;actor.regenRate241=Math.max(0,Number(sk.regen)||0);actor.regenTurns=turns;}
  detail=`立即恢復 ${got} HP；每回合恢復最大 HP ${Math.round(Number(sk.regen)*100)}%，持續 ${turns} 回合。`;
 }else if(kind==='adrenalineGuard')balancedArenaBuff241_(actor,'adrenaline241',sk,{patkRate:rate,damageReduction:Number(sk.value)||0});
 else if(kind==='manaAwareness'){
  balancedArenaBuff241_(actor,'manaAwareness241',sk,{matkRate:rate});const name=randomOtherCooldown241_(id,sk.value,actor);detail+=name?` 本次減少【${name}】的 CD。`:' 目前沒有其他冷卻中的技能。';
 }else if(kind==='chargeSacrifice'){
  const cost=Math.floor(Math.max(0,actor.hp)/2);actor.hp-=cost;balancedArenaBuff241_(actor,'charge',sk,{patkRate:rate,matkRate:rate});detail=`消耗 ${cost} HP，`+detail;
 }else{
  const raw=Math.max(0,Math.trunc(actor.maxHp*Number(sk.shieldMult??.15))),shield=Math.trunc(raw*(1+(arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain'))/100));
  arenaAddShield60_(actor,{id:'fullPreparation',name:sk.name,hp:shield,turns});balancedArenaBuff241_(actor,'fullPreparation',sk,{patkRate:rate,matkRate:rate,crit:Number(sk.value)||15,critDamage:Number(sk.value)||15});
 }
 arenaLog_(`${actor.name} 使用【${sk.name}】：${detail}`);await arenaVisual_(actor,target,kind==='healPercentRegen'?'heal':'buff',sk.name);render();await wait(300);return true;
}
function arenaFx_(side,text,cls=''){record471('float',{target:side,text,kind:cls});}
function healFx(target){record471('heal',{target});}
function bossElementFx55_(target,theme){record471('element',{target,theme});}
function arenaHasDead59_(b=arenaBattle_){return !!b&&(b.attacker.hp<=0||b.defender.hp<=0);}
function equipmentNoCooldown462_(skill,actor=null){
 if(Number(skill?.cd??skill?.cooldown??0)<=0)return false;
 let triggered=false;
 for(const key of actor?fxArenaKeys_(actor):fxMainKeys_()){
  const f=fxParse_(key);if(f?.type!=='noCooldown462'||Math.random()>=f.chance)continue;
  triggered=true;effectNotice44_(key,actor,`施放【${skill.name}】觸發不進入冷卻（${f.chance*100}%）。`,`${skill.name} 不進冷卻`);
 }
 return triggered;
}
function arenaFinishArcaneRound_(actor,usedAttack){
 actor.arcaneCastMultiplier=1;if(usedAttack||actor.hp<=0||!arenaMageAptitudeIIActive_(actor))return;
 const before=arcaneStacksValue_(actor.arcaneStacks);actor.arcaneStacks=Math.min(3,before+1);
 if(actor.arcaneStacks>before){arenaLog_(`${actor.name}【魔法師的資質II】獲得魔導 1 層（${actor.arcaneStacks}/3）。`);arenaEffectText_(actor,`魔導 +1（${actor.arcaneStacks}/3）`,'buff');}render();
}
function isAttackSkill_(sk){return !!sk&&(fxSplit_(sk.effectKey).some(k=>fxParse_(k)?.type==='castDamage')||['godspeedSlash','heavenlyThunder','physical','magic','magicMulti','magicBurst','explosiveMagic','explosiveMagicII','magicSlash','magicSlashII','bloodSlash','precisionStrike','buffPatk','buffPatkII','buffMatk','buffMatkII'].includes(sk.kind));}
function orderShieldRate139_(entries){
 return (entries||[]).reduce((total,entry)=>{
  const m=String(entry.key||'').trim().match(/^order_skill_damage_shield_(\d+(?:\.\d+)?)$/);
  return total+(m&&Number.isFinite(Number(m[1]))?Number(m[1]):0);
 },0)/100;
}
function arenaTick_(x){
 // End of x's turn, including a turn skipped because of control or by choice.
 const frozen=x.status?.freeze?.turns>0,paralyzed=x.status?.paralysis?.turns>0;
 fxNaturalCooldown_(x.cooldowns,fxArenaKeys_(x),frozen||paralyzed);
 if(frozen||paralyzed)arenaLog_(`${x.name}【${frozen?'冰凍':'麻痺'}】技能 CD 停止自然倒數。`);
 // Debuffs must survive until the affected combatant has taken/skipped a turn.
 for(const [k,v] of Object.entries(x.status||{})){
  if(k==='block'||statusDef_(k)?.category==='buff')continue;
  if(--v.turns<=0){delete x.status[k];arenaLog_(`${x.name} 的【${statusDef_(k)?.name||k}】效果結束。`)}
 }
 const opponent=x===arenaBattle_?.attacker?arenaBattle_?.defender:arenaBattle_?.attacker;
 if(opponent)arenaTickProtection45_(opponent);
 x.gamblePct141=0;delete x.status.gamble_luck141;arenaRefreshConditionalStats_(x);
}
function fxNaturalCooldown_(cooldowns,keys,paralyzed){if(paralyzed)return;const n=Math.max(0,1+fxSum_(keys,'tick'));for(const k of Object.keys(cooldowns||{}))if(cooldowns[k]>0){const before245=cooldowns[k];cooldowns[k]=Math.max(0,cooldowns[k]-n);if(n>1){const actor245=typeof arenaBattle_!=='undefined'&&arenaBattle_?.attacker?.cooldowns===cooldowns?arenaBattle_.attacker:typeof arenaBattle_!=='undefined'&&arenaBattle_?.defender?.cooldowns===cooldowns?arenaBattle_.defender:null;cooldownNotice245_(k,Math.max(0,before245-cooldowns[k]-1),actor245);}}}
function arenaTickProtection45_(x){
 // A shield/buff round is consumed only after the opponent completes a turn.
 for(const k of Object.keys(x.buff)){
   if(--x.buff[k]<=0){
     clearBalancedArenaBuff241_(x,k);
     if(k==='patk'&&x.tempPatk){x.stats.patk-=x.tempPatk;x.tempPatk=0}
     if(k==='matk'&&x.tempMatk){x.stats.matk-=x.tempMatk;x.tempMatk=0}
     if(k==='def'&&x.tempDef){x.stats.def-=x.tempDef;x.tempDef=0}
     if(k==='fullPreparation'&&x.fullPreparationDelta){
       x.stats.patk-=x.fullPreparationDelta.patk||0;x.stats.matk-=x.fullPreparationDelta.matk||0;x.stats.crit-=x.fullPreparationDelta.crit||0;x.fullPreparationDelta=null
     }
     if(k==='charge'&&x.chargeDelta){
       x.stats.patk-=x.chargeDelta.patk||0;x.stats.matk-=x.chargeDelta.matk||0;x.stats.def-=x.chargeDelta.def||0;x.chargeDelta=null
     }
     delete x.buff[k]
   }
 }
 for(const [k,v] of Object.entries(x.status||{})){
  if(k==='block'||statusDef_(k)?.category!=='buff')continue;
  if(--v.turns<=0){delete x.status[k];arenaLog_(`${x.name} 的【${statusDef_(k)?.name||k}】效果結束（對方回合已結束）。`)}
 }
 for(const sh of [...arenaActiveShields60_(x)]){
  if(--sh.turns<=0)arenaLog_(`${x.name} 的【${sh.name}】效果結束（對方回合已結束，剩餘 ${Math.trunc(sh.hp)} 護盾到期）。`);
 }
 arenaActiveShields60_(x);
}
function arenaTurnStartStatus_(x){
 // Each call begins one actor turn; the defender opening and first response share the battle round number.
 netherShield141_(x);rollGems141_(x);
 const side=x===arenaBattle_.attacker?'attacker':'defender';
 if(x.status.poison?.turns>0&&x.hp>0){const stacks=Math.max(1,Number(x.status.poison.stacks)||1),d=Math.max(1,Math.trunc(x.maxHp*.05*stacks));const got=arenaTakeDamage_(x,d,'poison');arenaLog_(`${x.name} 受到【中毒】${got} 傷害（${stacks}層）。`);arenaFx_(side,`-${got} 中毒`,'status')}
 if(x.status.burning?.turns>0&&x.hp>0){const stacks=Math.max(1,Number(x.status.burning.stacks)||1),d=Math.max(1,Math.trunc(x.maxHp*.04*stacks));const got=arenaTakeDamage_(x,d,'burning');arenaLog_(`${x.name} 受到【燃燒】${got} 傷害（${stacks}層）。`);arenaFx_(side,`-${got} 燃燒`,'status')}
 arenaRegen_(x);
 for(const entry of arenaEffectEntries46_(x)){
  const m=entry.key.match(/^turn_regen_maxhp_(\d+(?:\.\d+)?)$/);if(!m||x.hp<=0)continue;
  const raw=Math.max(1,Math.trunc(x.maxHp*Number(m[1])/100)),before=x.hp;
  const got=fxArenaHeal_(x,raw),loss=Math.max(0,before-x.hp);
  effectNotice44_(entry.key,x,`回合開始恢復最大 HP ${m[1]}%（${raw}），${loss?`詛咒反轉，扣除 ${loss} HP`:`實際恢復 ${got} HP`}${x.status.heal_block?.turns>0?'（禁療中）':''}。`,loss?`詛咒 -${loss}`:`恢復 +${got}`,entry.name);
 }
 void fxEvent_('turnstart',x,x===arenaBattle_.attacker?arenaBattle_.defender:arenaBattle_.attacker).catch(console.error);
}
function netherShield141_(actor=null){
 const count=worldGemSum141_('turnstart_debuff_shield_',actor);if(!count||(actor?actor.status.enhancement_lock?.turns>0:hasBattleStatus('player','enhancement_lock')))return;
 // Each copy gives 2% + 2% per distinct debuff; suffix is the per-type percentage.
 const max=actor?actor.maxHp:battlePlayerStats().hp,types=worldDebuffs141_(actor),hp=Math.trunc(max*count*(1+types)/100);
 if(actor){if(actor.hp<=0)return;const bonus=Math.max(0,arenaEffectNumber_(actor,'shield_gain_',0)+fxSum_(fxArenaKeys_(actor),'shield_gain'));arenaAddShield60_(actor,{id:'netherTreeHeart',name:'冥生樹心',hp:Math.trunc(hp*(1+bonus/100)),turns:1,noRetaliate:true});}
 else addBattleShield_({id:'netherTreeHeart',name:'冥生樹心',hp,turns:1,noRetaliate:true});
 if(actor)arenaEffectText_(actor,`冥生樹心：${types}種異常｜護盾 ${hp}`,'buff');else battleEffectText55_('player',`冥生樹心：${types}種異常｜護盾 ${hp}`,'buff');
}
function worldDebuffs141_(actor=null){
 if(actor)return Object.keys(actor.status||{}).filter(id=>actor.status[id]?.turns>0&&statusDef_(id)?.category==='debuff').length;
 const b=state.currentBattle;if(!b)return 0;const ids=new Set(['poison','burning','heal_block','stun',...Object.keys(b.statuses?.player||{})]);
 return [...ids].filter(id=>statusDef_(id)?.category==='debuff'&&hasBattleStatus('player',id)).length;
}
function rollGems141_(actor=null){
 const b=actor||state.currentBattle;if(!b)return;
 const values=worldGemEntries141_(actor).map(x=>x.key.match(/^turnstart_gamble_dual_(\d+(?:\.\d+)?)$/)).filter(Boolean).map(m=>Number(m[1]));if(!values.length)return;
 diceStatus141_();
 if(actor){actor.gamblePct141=0;delete actor.status.gamble_luck141;arenaRefreshConditionalStats_(actor);}
 const result=diceRoll141_(values),blocked=actor?actor.status.enhancement_lock?.turns>0:hasBattleStatus('player','enhancement_lock');
 if(result.pct>0&&blocked){result.blocked=true;result.pct=0;}
 b.gamblePct141=result.pct;b.gambleTurn141=actor?arenaBattle_.turn:b.turn;
 if(result.pct>0){if(actor)arenaStatus_(actor,'gamble_luck141',1,1);else applyBattleStatus_('player','gamble_luck141',{duration:1});}
 if(actor){arenaRefreshConditionalStats_(actor);arenaLog_(`【狂賭之骰】${actor.name}：${result.wins}勝${result.losses}敗，雙攻${result.pct>=0?'+':''}${result.pct}%。`);}
 else log(`【狂賭之骰】${result.wins}勝${result.losses}敗，本回合雙攻${result.pct>=0?'+':''}${result.pct}%。`);
 void queueDiceVisual141_(b,result,actor);
}
function diceStatus141_(){
 defaultStatusEffects.gamble_luck141??={id:'gamble_luck141',name:'狂賭之骰',category:'buff',durationType:'turns',defaultDuration:1,stackable:false,effectType:'none',description:'本回合雙攻增益，正向加成無上限，最多降低100%（雙攻最低0）'};
}
function diceRoll141_(values,random=Math.random){
 const faces=[],raw=values.reduce((sum,pct)=>{const face=Math.min(6,Math.max(1,Math.floor(random()*6)+1));faces.push(face);return sum+(face>=4?1:-1)*pct;},0),wins=faces.filter(n=>n>=4).length;
 return {faces,wins,losses:faces.length-wins,raw,pct:Math.max(-100,raw)};
}
function queueDiceVisual141_(owner,result,actor){record471('dice',{actor:side471(actor),result:JSON.parse(JSON.stringify(result))});}
function arenaRegen_(x){
 const turns=Number(x.regenTurns),amount=Number(x.regenRate241)>0?Math.trunc(x.maxHp*x.regenRate241):Number(x.regen);
 if(!Number.isFinite(turns)||turns<1||!Number.isFinite(amount)||amount<0||amount===0&&!(Number(x.regenRate241)>0)){x.regenTurns=0;x.regen=0;x.regenRate241=0;return;}
 if(x.hp<=0)return;
 x.regenTurns=Math.trunc(turns);
 const before=x.hp,got=fxArenaHeal_(x,amount);x.regenTurns--;
 if(x.regenTurns===0){x.regen=0;x.regenRate241=0;}
 const loss=Math.max(0,before-x.hp);
 arenaLog_(`${x.name} 持續恢復：${loss?`詛咒反轉扣除 ${loss} HP`:`實際恢復 ${got} HP`}${x.status.heal_block?.turns>0?'（禁療）':''}，剩餘 ${x.regenTurns} 次。`);
 arenaFx_(x===arenaBattle_.attacker?'attacker':'defender',loss?`-${loss} 詛咒`:`+${got} 持續恢復`,loss?'status':'heal');
}
function arenaCanAct_(x){const side=x===arenaBattle_.attacker?'attacker':'defender';if(x.status.stun?.turns>0){arenaLog_(`${x.name} 因【暈眩】無法行動。`);arenaFx_(side,'暈眩・跳過','status');return false}if(x.status.freeze?.turns>0){arenaLog_(`${x.name} 因【冰凍】無法行動。`);arenaFx_(side,'冰凍・跳過','status');return false}return true}
function arenaChooseAi_(a,t){for(const ai of (a.ai||[]).slice().sort((x,y)=>Number(x.priority||9)-Number(y.priority||9))){const sk=skillTemplates?.[ai.skill];if(ai.skill&&sk&&!(a.cooldowns[sk.name]||0)&&arenaCond_(ai.condition,a,t))return ai.skill}return null}
function arenaCond_(c,self,enemy){c=String(c||'ALWAYS');const a=self.hp/self.maxHp,b=enemy.hp/enemy.maxHp;if(c==='ALWAYS')return true;if(c==='SELF_HP_LE_75')return a<=.75;if(c==='SELF_HP_LE_50')return a<=.5;if(c==='SELF_HP_LE_25')return a<=.25;if(c==='ENEMY_HP_LE_50')return b<=.5;if(c==='ENEMY_HP_LE_25')return b<=.25;if(c==='SELF_HAS_STATUS')return Object.keys(self.status).length>0;if(c==='ENEMY_NO_STATUS'||c==='ENEMY_NO_DEBUFF')return Object.keys(enemy.status).length===0;if(c==='SELF_NO_BUFF')return Object.keys(self.buff).length===0;return false}
function applyGameConfigRows_(rows){
  if(!Array.isArray(rows))return;
  for(const r of rows){
    const key=String(r.Key||'').trim();
    if(!key)continue;
    const raw=r.Value;
    const n=Number(raw);
    onlineGameConfig[key]=raw!==''&&raw!=null&&Number.isFinite(n)?n:raw;
  }
}
let onlineGameConfig={};
function applyEquipmentRows_(rows){
 rows=[...ORDER_TABLES127_.Equipment.filter(r=>!(rows||[]).some(x=>x.ItemID===r.ItemID)),...(rows||[])];
  rows=[...PHANTOM_TABLES122_.Equipment.filter(r=>!(rows||[]).some(x=>x.ItemID===r.ItemID)),...(rows||[])];
  if(!Array.isArray(rows)||!rows.length)return;
  for(const r of rows){
    const id=String(r.ItemID||'').trim();
    if(!id)continue;

    const prev=itemTemplates[id]||{};
    const stats={
      hp:Number(r.HP)||0,
      def:Number(r.DEF)||0,
      patk:Number(r.PATK)||0,
      matk:Number(r.MATK)||0,
      crit:Number(r.Crit)||0,
      critDamage:Number(r.CritDamage)||0
    };
    // 保持資料乾淨：零值不需要寫進 stats，但負數要保留。
    Object.keys(stats).forEach(k=>{if(stats[k]===0)delete stats[k]});

    itemTemplates[id]={
      ...prev,
      name:String(r.Name||prev.name||id),
      rarity:String(r.Rarity||prev.rarity||'一般'),
      slot:String(r.Slot||prev.slot||'special'),
      price:Number(r.BasePrice??prev.price??0)||0,
      equipmentLevel464:equipmentPlanningLevel464_(r),
      stats,
      sockets:Math.max(0,Math.trunc(Number(r.BaseSockets??prev.sockets??0)||0)),
      effect:String(r.EffectKey||prev.effect||'')||undefined,
      iconSymbol:String(r.IconSymbol||prev.iconSymbol||''),
    };
  }
}
const ORDER_TABLES127_={Equipment:[],Gems:[],Skills:[]};
let PHANTOM_TABLES122_={"Equipment":[],"DungeonBosses":[],"DungeonDifficulties":[],"EnemyBehaviors":[],"BossPhases":[]};
function equipmentPlanningLevel464_(row){
 const raw=row?.['等級']??row?.Level;
 if(raw==null||String(raw).trim()===''||!['number','string'].includes(typeof raw))return null;
 const value=Number(raw);return Number.isInteger(value)&&value>=1&&value<=100?value:null;
}
function applySkillRows_(rows){
  rows=planningRowsWithFallback_('Skills',rows,r=>String(r.SkillID||'').trim());
  if(!rows.length)return;

  const numOr=(raw,fallback)=>{
    if(raw===''||raw==null)return fallback;
    const n=Number(raw);
    return Number.isFinite(n)?n:fallback;
  };
  const textOr=(raw,fallback)=>{
    const s=String(raw??'').trim();
    return s!==''?s:fallback;
  };
  const boolEnabled=(raw)=>{
    if(raw===''||raw==null)return true;
    if(raw===true)return true;
    const s=String(raw).trim().toLowerCase();
    return !['false','0','no','off','disabled'].includes(s);
  };

  for(const r of rows){
    const id=String(r.SkillID||'').trim();
    if(!id)continue;

    const prev=skillTemplates[id]||{};
    if(!boolEnabled(r.Enabled)){
      // 不刪除模板，避免舊存檔因技能 ID 消失而報錯；
      // 僅標示 disabled，商店/可用性可以依此判斷。
      skillTemplates[id]={...prev,enabled:false};
      continue;
    }

    const type=textOr(r.Type,prev.type||'active').toLowerCase();
    const kind=textOr(r.Kind,prev.kind||'');
    const next={
      ...prev,
      name:textOr(r.Name,prev.name||id),
      type,
      displayCategory:String(r.DisplayCategory||'').trim(),
      price:numOr(r.Price,prev.price??0),
      cd:numOr(r.CD,prev.cd??0),
      kind,
      effectKey:String(r.EffectKey??prev.effectKey??'').trim(),
      desc:textOr(r.Description,prev.desc||''),
      unlockFloor:Math.max(1,Math.trunc(numOr(r.UnlockFloor,prev.unlockFloor??1))),
      enabled:true
    };

    if(kind==='fx'&&!String(r.Description||'').trim())next.desc=effectDescription_(next.effectKey);
    // 共用資料欄位：只要 Sheet 有填值，就覆蓋前端模板。
    if(r.Multiplier!=='' && r.Multiplier!=null) next.mult=numOr(r.Multiplier,prev.mult??1);
    if(r.Hits!=='' && r.Hits!=null) next.hits=Math.max(1,Math.trunc(numOr(r.Hits,prev.hits??1)));
    if(r.Value!=='' && r.Value!=null) next.value=numOr(r.Value,prev.value??0);
    if(r.Regen!=='' && r.Regen!=null) next.regen=numOr(r.Regen,prev.regen??0);
    if(r.Duration!=='' && r.Duration!=null) next.duration=Math.max(0,Math.trunc(numOr(r.Duration,prev.duration??0)));
    if(r.ShieldMult!=='' && r.ShieldMult!=null) next.shieldMult=numOr(r.ShieldMult,prev.shieldMult??1);
    if(r.BreakMult!=='' && r.BreakMult!=null) next.breakMult=numOr(r.BreakMult,prev.breakMult??1);

    const requires=String(r.Requires??'').trim();
    const upgradeFrom=String(r.UpgradeFrom??'').trim();
    if(requires!=='')next.requires=requires;
    if(upgradeFrom!=='')next.upgradeFrom=upgradeFrom;

    // 既有特殊技能沿用目前 Skills schema，不額外新增欄位：
    // 噬血斬擊：Multiplier = 攻擊係數，Value = 吸血比例。
    if(kind==='bloodSlash'){
      if(r.Multiplier!=='' && r.Multiplier!=null)next.mult=numOr(r.Multiplier,prev.mult??2);
      if(r.Value!=='' && r.Value!=null)next.lifeSteal=numOr(r.Value,prev.lifeSteal??.25);
    }

    // 魔力光盾：ShieldMult / BreakMult / Duration 直接由表控制。
    if(kind==='magicShield'){
      if(r.ShieldMult!=='' && r.ShieldMult!=null)next.shieldMult=numOr(r.ShieldMult,prev.shieldMult??1.2);
      if(r.BreakMult!=='' && r.BreakMult!=null)next.breakMult=numOr(r.BreakMult,prev.breakMult??1);
    }

    // Skills 共用欄位會直接覆蓋模板。
    // 增強體能 / 增強體能II：Multiplier 控制砍擊係數、Value 控制 DEF 加成；
    // PATK 啟動門檻（30 / 120）仍由各自 Kind 的前端機制判斷。
    skillTemplates[id]=next;
  }
}
function planningRowsWithFallback_(name,rows){return rows||[];}
function applyGemRows_(rows){
 rows=[...ORDER_TABLES127_.Gems.filter(r=>!(rows||[]).some(x=>x.GemID===r.GemID)),...(rows||[])];
  if(!Array.isArray(rows))return;
  for(const r of rows){
    const id=String(r.GemID||'').trim();
    if(!id)continue;
    const prev=gemTemplates[id]||{};
    gemTemplates[id]={
      ...prev,
      name:String(r.Name||prev.name||id),
      price:Number(r.Price??prev.price??0)||0,
      stats:{
        hp:Number(r.HP??prev.stats?.hp??0)||0,
        def:Number(r.DEF??prev.stats?.def??0)||0,
        patk:Number(r.PATK??prev.stats?.patk??0)||0,
        matk:Number(r.MATK??prev.stats?.matk??0)||0,
        crit:Number(r.Crit??prev.stats?.crit??0)||0,
        critDamage:Number(r.CritDamage??prev.stats?.critDamage??0)||0
      },
      bossOnly:r.BossOnly===true||String(r.BossOnly).toLowerCase()==='true',
      visualColor:String(r.VisualColor||prev.visualColor||'').trim(),
      effect:String(r.EffectKey||r.Effect||prev.effect||'').trim()
    };
  }
}
function applyEnhancementRows_(rows){
  if(!Array.isArray(rows)||!rows.length)return;
  const next=[null];
  for(const r of rows){
    const lv=Math.trunc(Number(r.TargetLevel));
    if(!(lv>=1&&lv<=10))continue;
    const stone=Math.max(0,Math.trunc(Number(r.StoneCost)||0));
    let rate=Number(r.SuccessRate);
    if(rate>1)rate/=100; // 表格若輸入 95，也會自動視為 95%
    rate=Math.max(0,Math.min(1,Number.isFinite(rate)?rate:0));
    const multi=Number(r.StatMultiplier);
    next[lv]={stone,rate,multi:Number.isFinite(multi)?multi:1};
  }
  for(let lv=1;lv<=10;lv++)if(next[lv])enhancementTable[lv]=next[lv];
}
let enhancementTable=[
 null,
 {stone:1,rate:1.00,multi:1.10},
 {stone:2,rate:.95,multi:1.20},
 {stone:3,rate:.85,multi:1.30},
 {stone:4,rate:.70,multi:1.40},
 {stone:5,rate:.50,multi:1.50},
 {stone:6,rate:.30,multi:1.60},
 {stone:7,rate:.15,multi:1.70},
 {stone:8,rate:.05,multi:1.80},
 {stone:9,rate:.02,multi:1.90},
 {stone:10,rate:.01,multi:2.00}
];
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
    effect:t.effect ?? ''
  };
}
 applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);
 function equipment(items){return items.map(it=>{const t=itemTemplates[it.template];if(!t)throw Error('MIST_EQUIPMENT_UNKNOWN');return {...it,slot:t.slot,name:t.name,rarity:t.rarity,resolvedStats:enhancedStats(it),effects:itemEffectKeys_(it),gems:(it.gems||[]).map(g=>g?{...g,name:gemTemplates[g.template]?.name,stats:gemResolved_(g).stats,effect:gemResolved_(g).effect}:null)};});}
 function snapshot(p){const eq=equipment(Object.values(p.equipment||{}).filter(Boolean));return {name:p.nickname,stats:arenaStatsFrom_(null,eq,p.skills?.passive||null),skills:p.skills?.active||[],passive:p.skills?.passive||null,equipmentList:eq,ai:(p.skills?.active||[]).map((skill,i)=>({skill,priority:i+1,condition:'ALWAYS'}))};}
 function actor(s,hp){return {name:s.name,stats:{...s.stats},baseCritDamage:s.stats.critDamage||100,hp:Math.max(0,Math.min(s.stats.hp,hp??s.stats.hp)),maxHp:s.stats.hp,skills:[...(s.skills||[])],passive:s.passive||null,equipmentList:s.equipmentList||[],equipment:{},ai:s.ai||[],status:{},buff:{},cooldowns:{},regen:0,regenTurns:0,firstDebuffDurationReduced:false};}
 function create(a,d,ahp,dhp,maxTurns=30){arenaBattle_={attacker:actor(a,ahp),defender:actor(d,dhp),turn:1,maxTurns,finished:false,log:[],attackerDamage:0,defenderDamage:0};return arenaBattle_;}
 async function act(a,t,id){record471('phase',{actor:side471(a)});arenaRefreshConditionalStats_(a);arenaRefreshConditionalStats_(t);arenaTurnStartStatus_(a);await drain468();if(a.hp<=0||t.hp<=0)return;
  if(arenaCanAct_(a)){if(id==='skip'){await fxEvent_('skip',a,t);arenaFinishArcaneRound_(a,false);arenaLog_(a.name+' 跳過回合。');}
   else if(id){if(!a.skills.includes(id)||!skillTemplates[id]||(a.cooldowns[skillTemplates[id].name]||0)>0)throw Error('MIST_SKILL_UNAVAILABLE');await arenaUse_(a,t,id);}
   else {const loss=await arenaHit_(a,t,Math.max(1,Math.trunc(a.stats.patk-t.stats.def)),'physical');arenaLog_(a.name+' 普通攻擊造成 '+loss+' 傷害。');}}
  await drain468();arenaTick_(a);await drain468();}
 async function turn(b,id,monster=null){arenaBattle_=structuredClone(b);arenaBattle_.events471=[];const a=arenaBattle_.attacker,d=arenaBattle_.defender;
  if(monster&&arenaBattle_.turn===1&&!d.monsterOpened468){d.monsterOpened468=true;if(['opening_shield','elite_golem'].includes(monster.Ability))arenaAddShield60_(d,{id:'mist-opening',name:'開場護盾',hp:monster.Ability==='elite_golem'?monster.Value:Math.floor(d.maxHp*monster.Multiplier),turns:99});if(monster.Ability==='first_hit_guard')d.mistFirstGuard468=monster.Multiplier;}
  if(arenaBattle_.finished)throw Error('MIST_BATTLE_FINISHED');await act(a,d,id);
  if(a.hp>0&&d.hp>0){if(monster)await monsterAct468(monster,d,a,arenaBattle_.turn);else await act(d,a,arenaChooseAi_(d,a));}
  await drain468();arenaBattle_.finished=a.hp<=0||d.hp<=0||arenaBattle_.turn>=arenaBattle_.maxTurns;
  if(!arenaBattle_.finished)arenaBattle_.turn++;
  arenaBattle_.log=arenaBattle_.log.slice(-120);return arenaBattle_;
 }
 async function monsterAct468(m,a,t,round){
  record471('phase',{actor:side471(a)});arenaRefreshConditionalStats_(a);arenaTurnStartStatus_(a);await drain468();if(a.hp<=0||t.hp<=0)return;
  if(arenaCanAct_(a)){
   const magic=Number(m.MATK)>Number(m.PATK),kind=magic?'magic':'physical';
   const hit=async(mult,bonus=1)=>{const raw=magic?a.stats.matk:a.stats.patk;const loss=await arenaHit_(a,t,Math.max(1,Math.trunc((raw*mult-(magic?0:t.stats.def))*bonus)),kind);arenaLog_(a.name+' 攻擊造成 '+loss+(magic?' 魔法':' 物理')+'傷害。');return loss;};
   await monsterAbility468(m,a,t,round,hit);
  }await drain468();arenaTick_(a);await drain468();
 }
 async function monsterAbility468(m,a,t,round,hit){
  let mult=Number(m.Multiplier)||1;
  switch(m.Ability){
   case 'opening_strike': await hit(round===1?mult:1);break;
   case 'poison_strike': await hit(round===Number(m.Every)?mult:1);if(t.hp>0&&round===Number(m.Every))arenaTryStatus_(a,t,'poison',3,Number(m.Value));break;
   case 'burn_strike': await hit(round===Number(m.Every)?mult:1);if(t.hp>0&&round===Number(m.Every))arenaTryStatus_(a,t,'burning',3,Number(m.Value));break;
   case 'drain_strike': {const trigger=round%Number(m.Every)===0,loss=await hit(trigger?mult:1);if(trigger&&a.hp>0){const healed=fxArenaHeal_(a,Math.floor(loss*Number(m.Value)));arenaLog_(a.name+' 吸血恢復 '+healed+' HP。');}break;}
   case 'poison_turns': await hit(1);if([Number(m.Every),Number(m.Value)].includes(round)&&t.hp>0)arenaTryStatus_(a,t,'poison',3,1);break;
   case 'blind_strike': await hit(round===Number(m.Every)?mult:1);if(round===Number(m.Every)&&t.hp>0)arenaTryStatus_(a,t,'blind',Number(m.Value),1);break;
   case 'execute_bonus': await hit(1,t.hp/t.maxHp<mult?1+Number(m.Value):1);break;
   case 'elite_wolf': {const bonus=t.hp/t.maxHp<.4?1.25:1;for(let i=0;i<(round%Number(m.Every)===0?Number(m.Value):1)&&t.hp>0&&a.hp>0;i++)await hit(round%Number(m.Every)===0?mult:1,bonus);break;}
   case 'elite_spider': await hit(round===2?.8:round%Number(m.Every)===0?mult:1);if(t.hp>0&&round===2)arenaTryStatus_(a,t,'blind',2,1);else if(t.hp>0&&round%Number(m.Every)===0&&Number(t.status.poison?.stacks||0)<Number(m.Value))arenaTryStatus_(a,t,'poison',3,1);break;
   case 'elite_mage': await hit(round===Number(m.Value)?.8:round%Number(m.Every)===0?mult:1);if(t.hp>0&&round===Number(m.Value))arenaTryStatus_(a,t,'heal_block',1,1);break;
   case 'elite_executioner': if(a.hp/a.maxHp<=Number(m.Value)&&!a.enraged468){a.enraged468=true;a.stats.patk=Math.floor(a.stats.patk*1.2);a.stats.def=Math.floor(a.stats.def*.7);arenaLog_(a.name+' 狂暴：物攻 +20%，防禦 −30%。');}await hit(round%Number(m.Every)===0?mult:1);break;
   case 'elite_golem':case 'telegraphed_strike':await hit(round%Number(m.Every)===0?mult:1);break;
   case 'opening_shield':case 'first_hit_guard':await hit(1);break;
   default:throw Error('MIST_MONSTER_ABILITY_UNKNOWN:'+m.Ability);
  }
  if(['telegraphed_strike','elite_golem','elite_mage','elite_executioner'].includes(m.Ability)&&(round+1)%Number(m.Every)===0)arenaLog_(a.name+' 正在蓄力，下回合將施放特殊攻擊。');
 }

 return {snapshot,create,turn,equipment,templates:{skills:skillTemplates,items:itemTemplates,gems:gemTemplates}};
}
