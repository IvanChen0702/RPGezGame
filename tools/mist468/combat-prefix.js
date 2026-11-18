export function createMistCombat468(data,random){
 const cfg=Object.fromEntries((data.GameConfig||[]).map(r=>[r.Key,r.Value]));
 const base={hp:Number(cfg.BaseHP),def:Number(cfg.BaseDEF),patk:Number(cfg.BasePATK),matk:Number(cfg.BaseMATK),crit:Number(cfg.BaseCrit),critDamage:Number(cfg.BaseCritDamage||100)};
 if(Object.values(base).some(n=>!Number.isFinite(n))||base.hp<=0)throw Error('MIST_BASE_CONFIG_INVALID');
 let pending468=[];
 // Presentation events are recorded from the same combat hooks as the browser.
 // Only public combat state is copied; opponent equipment/AI never leave the server.
 function side471(x){return x===arenaBattle_?.attacker?'attacker':x===arenaBattle_?.defender?'defender':x;}
 function frame471(){const pick=(a,own)=>({hp:a.hp,maxHp:a.maxHp,stats:a.stats,buff:a.buff||{},regen:a.regen||0,regenTurns:a.regenTurns||0,regenRate241:a.regenRate241||0,status:a.status||{},shields:(a.shields||[]).map(s=>({id:s.id,name:s.name,hp:s.hp,turns:s.turns})),...(own?{stats:a.stats,buff:a.buff||{},cooldowns:a.cooldowns||{},arcaneStacks:a.arcaneStacks||0}:{})});return structuredClone({attacker:pick(arenaBattle_.attacker,true),defender:pick(arenaBattle_.defender,false)});}
 function record471(type,detail={}){if(!arenaBattle_?.events471)return;const events=arenaBattle_.events471;if(events.length>=512)return;events.push({type,...detail,frame:frame471()});}
 function fxEvent_(...args){const p=fxEventCore468_(...args);pending468.push(p);return p;}
 async function drain468(){for(let i=0;pending468.length;i++){if(i>1000)throw Error('MIST_EFFECT_LOOP');const tasks=pending468;pending468=[];await Promise.all(tasks);}}

 function arenaTakeDamage_(target,amount,kind='damage',source=null){if(target?.status?.brand?.turns>0)amount=Math.trunc(amount*Number(statusDef_('brand').value??1.5));if(target?.mistFirstGuard468&&source&&kind==='damage'&&amount>0){amount=Math.floor(amount*target.mistFirstGuard468);delete target.mistFirstGuard468;}return arenaTakeDamageBase468_(target,amount,kind,source);}

 // Persist phase stamps in the authoritative battle so retries/resumes cannot double-tick.
 function arenaStatus_(target,id,turns=2,stacks=1){
  if(statusDef_(id).category==='buff'&&target.status.enhancement_lock?.turns>0)return;
  arenaStatusBase494_(target,id,turns,stacks);
  const entry=target.status[id];entry.applied494=arenaBattle_.phase494||0;
  if(id==='seal'){const skills=(target.skills||[]).filter(Boolean);if(skills.length)entry.skill=skills[Math.floor(Math.random()*skills.length)];}
 }
 function tickDebuffs494(x,ids=null){
  for(const [id,v] of Object.entries(x.status||{})){
   const def=statusDef_(id);
   if(def.category==='buff'||def.durationType!=='turns'||ids&&!ids.includes(id))continue;
   if(v.applied494===(arenaBattle_.phase494||0))continue;
   if(--v.turns<=0){delete x.status[id];arenaLog_(`${x.name} 的【${def.name||id}】效果結束。`);}
  }
 }
 function dot494(x,ids){
  for(const id of ids){
   if(arenaHasDead59_())return;
   const v=x.status?.[id];if(!(v?.stacks>0))continue;
   const rate=Number(statusDef_(id).value),damage=Math.max(1,Math.trunc(x.maxHp*rate*v.stacks));
   const got=arenaTakeDamage_(x,damage,id);
   arenaLog_(`${x.name} 受到【${statusDef_(id).name}】${got} 傷害（最大 HP ${x.maxHp} × ${rate*100}% × ${v.stacks} 層）。`);
   arenaFx_(side471(x),`-${got} ${statusDef_(id).name}`,'status');record471('hit',{target:side471(x)});record471('wait',{ms:450});
  }
 }
 function finishAction494(x){
  x.freezeCd494=x.freezeCd494||x.status.freeze?.turns>0||x.status.paralysis?.turns>0;
  // Normal battle's legacy stun/heal-block counters expire after the affected action.
  tickDebuffs494(x,['stun','heal_block']);
  const other=x===arenaBattle_.attacker?arenaBattle_.defender:arenaBattle_.attacker;
  arenaTickProtection45_(other);arenaRegen_(other);
  other.gamblePct141=0;delete other.status.gamble_luck141;
  arenaRefreshConditionalStats_(x);arenaRefreshConditionalStats_(other);record471('state');
 }
 function cooldown494(x){
  const frozen=x.freezeCd494||x.status.freeze?.turns>0||x.status.paralysis?.turns>0;
  fxNaturalCooldown_(x.cooldowns,fxArenaKeys_(x),frozen);
  if(frozen)arenaLog_(`${x.name}【冰凍／麻痺】技能 CD 停止自然倒數。`);
  x.freezeCd494=false;
 }

 function arenaTryStatus_(actor,target,id,turns=2,stacks=1){
  if(statusDef_(id).category==='debuff'&&target.status.invincible?.turns>0){arenaLog_(`${target.name} 的【無敵】免疫【${statusDef_(id).name}】。`);return false;}
  if(statusDef_(id).category==='buff'&&target.status.enhancement_lock?.turns>0)return false;
  return arenaTryStatusBase494_(actor,target,id,turns,stacks);
 }

 function defense494(x){return Number(x.stats.def||0)*(x.status.armor_break?.turns>0?Number(statusDef_('armor_break').value):1);}
