 applyStatusRows494_(data.StatusEffects);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);
 function equipment(items){return items.map(it=>{const t=itemTemplates[it.template];if(!t)throw Error('MIST_EQUIPMENT_UNKNOWN');return {...it,slot:t.slot,name:t.name,rarity:t.rarity,resolvedStats:enhancedStats(it),effects:itemEffectKeys_(it),gems:(it.gems||[]).map(g=>g?{...g,name:gemTemplates[g.template]?.name,stats:gemResolved_(g).stats,effect:gemResolved_(g).effect}:null)};});}
 function snapshot(p){const eq=equipment(Object.values(p.equipment||{}).filter(Boolean));return {name:p.nickname,stats:arenaStatsFrom_(null,eq,p.skills?.passive||null),skills:p.skills?.active||[],passive:p.skills?.passive||null,equipmentList:eq,ai:(p.skills?.active||[]).map((skill,i)=>({skill,priority:i+1,condition:'ALWAYS'}))};}
 function actor(s,hp){return {name:s.name,stats:{...s.stats},baseCritDamage:s.stats.critDamage||100,hp:Math.max(0,Math.min(s.stats.hp,hp??s.stats.hp)),maxHp:s.stats.hp,skills:[...(s.skills||[])],passive:s.passive||null,equipmentList:s.equipmentList||[],equipment:{},ai:s.ai||[],status:{},buff:{},cooldowns:{},regen:0,regenTurns:0,firstDebuffDurationReduced:false};}
 function create(a,d,ahp,dhp,maxTurns=30){arenaBattle_={attacker:actor(a,ahp),defender:actor(d,dhp),turn:1,maxTurns,finished:false,log:[],attackerDamage:0,defenderDamage:0};return arenaBattle_;}
 async function act(a,t,id){if(a===arenaBattle_.attacker)record471('phase',{actor:side471(a)});arenaRefreshConditionalStats_(a);arenaRefreshConditionalStats_(t);arenaTurnStartStatus_(a);await drain468();if(a.hp<=0||t.hp<=0)return;
  if(arenaCanAct_(a)){if(id==='skip'){await fxEvent_('skip',a,t);arenaFinishArcaneRound_(a,false);arenaLog_(a.name+' 跳過回合。');}
   else if(id){if(!a.skills.includes(id)||!skillTemplates[id]||(a.cooldowns[skillTemplates[id].name]||0)>0)throw Error('MIST_SKILL_UNAVAILABLE');if(a.status.seal?.turns>0&&a.status.seal.skill===id)throw Error('MIST_SKILL_SEALED');await arenaUse_(a,t,id);if(a.hp>0&&a.status.bleed?.turns>0){const damage=Math.max(1,Math.trunc(a.maxHp*Number(statusDef_('bleed').value||.1)));a.hp=Math.max(0,a.hp-damage);arenaLog_(a.name+'【失血】施放技能失去 '+damage+' HP。');arenaFx_(side471(a),'-'+damage+' 失血','status');}}
   else {const loss=await arenaHit_(a,t,Math.max(1,Math.trunc(questArenaAtk368_(a,'patk')-defense494(t))),'physical');arenaLog_(a.name+' 普通攻擊造成 '+loss+' 傷害。');}}
  await drain468();}
 async function turn(b,id,monster=null){arenaBattle_=structuredClone(b);arenaBattle_.events471=[];const a=arenaBattle_.attacker,d=arenaBattle_.defender;
  if(monster&&arenaBattle_.turn===1&&!d.monsterOpened468){d.monsterOpened468=true;if(['opening_shield','elite_golem'].includes(monster.Ability))arenaAddShield60_(d,{id:'mist-opening',name:'開場護盾',hp:monster.Ability==='elite_golem'?monster.Value:Math.floor(d.maxHp*monster.Multiplier),turns:99});if(monster.Ability==='first_hit_guard')d.mistFirstGuard468=monster.Multiplier;}
  if(arenaBattle_.finished)throw Error('MIST_BATTLE_FINISHED');
  arenaBattle_.phase494=(arenaBattle_.phase494||0)+1;
  tickDebuffs494(d);await act(a,d,id);
  if(!arenaHasDead59_()){finishAction494(a);await drain468();}
  if(!arenaHasDead59_()){
   // Same order as enemyTurnVisualLegacy130: enemy burning/poison, then player poison/burning.
   record471('phase',{actor:'defender'});dot494(d,['burning','poison']);dot494(a,['poison','burning']);await drain468();
  }
  arenaBattle_.phase494++;a.freezeCd494=a.freezeCd494||a.status.freeze?.turns>0||a.status.paralysis?.turns>0;
  if(a.hp>0&&d.hp>0){if(monster)await monsterAct468(monster,d,a,arenaBattle_.turn);else {let skill=arenaChooseAi_(d,a);if(d.status.seal?.turns>0&&skill===d.status.seal.skill)skill=null;await act(d,a,skill);}}
  await drain468();
  if(!arenaHasDead59_()){
   tickDebuffs494(a,Object.keys(a.status||{}).filter(id=>!['stun','heal_block'].includes(id)));
   finishAction494(d);await drain468();cooldown494(a);cooldown494(d);record471('state');
  }
  arenaBattle_.finished=a.hp<=0||d.hp<=0||arenaBattle_.turn>=arenaBattle_.maxTurns;
  if(!arenaBattle_.finished)arenaBattle_.turn++;
  arenaBattle_.log=arenaBattle_.log.slice(-120);return arenaBattle_;
 }
 async function monsterAct468(m,a,t,round){
  arenaRefreshConditionalStats_(a);arenaTurnStartStatus_(a);await drain468();if(a.hp<=0||t.hp<=0)return;
  if(arenaCanAct_(a)){
   const magic=Number(m.MATK)>Number(m.PATK),kind=magic?'magic':'physical';
   const hit=async(mult,bonus=1)=>{const raw=questArenaAtk368_(a,magic?'matk':'patk');const loss=await arenaHit_(a,t,Math.max(1,Math.trunc((raw*mult-(magic?0:defense494(t)))*bonus)),kind);arenaLog_(a.name+' 攻擊造成 '+loss+(magic?' 魔法':' 物理')+'傷害。');return loss;};
   await monsterAbility468(m,a,t,round,hit);
  }await drain468();
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
