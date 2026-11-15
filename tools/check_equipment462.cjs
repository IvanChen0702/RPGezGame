/* Synthetic combat only; block external requests. Deterministic RNG boundary tests. */
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const keys={bow:'fx_oncrit_damage_enemy_maxhp_physical_12_chance_35_lowhp_30_chance_50',blade:'fx_oncrit_patk_percent_battle_3',inv:'fx_cast_status_self_invincible_10_1_1',hat:'fx_stat_matk_percent_8',noCd:'fx_cast_no_cooldown_15',bless:'fx_onhit_status_self_blessing_25_2_1',skip:'fx_skip_cooldown_random_1'};
const extract=(src,name)=>{const a=src.indexOf('function '+name+'('),b=src.indexOf('\n}',a);assert(a>=0&&b>a);return src.slice(a,b+2);};
const backend=fs.readFileSync('supabase/functions/game-api/index.ts','utf8'),sandbox={defaultStatusEffects:{invincible:{},blessing:{}},statusEffects:{}};
vm.createContext(sandbox);vm.runInContext(extract(backend,'equipmentParse462_')+'\n'+extract(backend,'fxParse_'),sandbox);
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
 const parsed=await p.evaluate(keys=>Object.fromEntries(Object.entries(keys).map(([n,k])=>[n,fxParse_(k)])),keys);for(const [n,key]of Object.entries(keys)){assert(parsed[n],n);assert.deepEqual(JSON.parse(JSON.stringify(sandbox.fxParse_(key))),parsed[n],n+' backend parser parity');}
 console.log('All seven keys parse; frontend/server snapshot parity PASS');
 await p.evaluate(keys=>{
  window.keys462=keys;window.realRandom462=Math.random;
  window.setup462=(effect='')=>{
   state=defaultState();state.page='battle';state.base={hp:1000,patk:100,matk:100,def:0,crit:100,critDamage:100};state.passive=[];state.pets297=[];state.skillsOwned=['strike462','multi462','support462'];state.equippedSkills=['strike462','multi462','support462'];
   itemTemplates.fixture462={name:'測試裝備',slot:'weapon',stats:{},effect};state.inventory=[{id:'fixture462',template:'fixture462',stats:{},gems:[]}];state.equipment={weapon:'fixture462',rings:[]};
   skillTemplates.strike462={id:'strike462',name:'測試攻擊',type:'active',kind:'physical',mult:1,cd:4};skillTemplates.multi462={id:'multi462',name:'測試連擊',type:'active',kind:'precisionStrike',mult:1,breakMult:1,value:0,cd:4};skillTemplates.support462={id:'support462',name:'測試治療',type:'active',kind:'heal',value:10,cd:4};
   state.currentBattle={floor:1,enemyKey:'fixture462',enemyData:{name:'測試敵人',hp:10000,patk:10,matk:10,def:10,boss:false},playerHp:1000,enemyHp:10000,turn:1,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false};state.battleVisual={busy:false};state.battleLog=[];Math.random=()=>.99;
  };
  setup462();initialEntryShown45_=true;viewModePreference_='mobile';render();
  // Replace only presentation, persistence and the opponent response, not combat math.
  render=()=>{};save=()=>{};wait=async()=>{};enemyTurnVisual=async()=>{};arenaVisual_=async()=>{};effectNotice44_=()=>{};playSfx=()=>{};
 },keys);
 const results=await p.evaluate(async()=>{
  const checks=[];const ok=(x,msg)=>{if(!x)throw Error(msg);checks.push(msg);};
  for(const [hp,roll,proc]of [[1000,.349,true],[1000,.35,false],[300,.4,false],[299,.499,true],[299,.5,false]]){
   setup462(keys462.bow);const b=state.currentBattle;b.playerHp=hp;Math.random=()=>roll;const d=await fxEvent_('oncrit');ok(d===(proc?1190:0)&&b.enemyHp===10000-d,'bow threshold '+hp+'/'+roll);
  }
  setup462(keys462.bow+'|'+keys462.bless);Math.random=()=>0;await fxEvent_('oncrit');ok(!hasBattleStatus('player','blessing'),'bow secondary damage does not retrigger active onhit');
  setup462(keys462.bow+'|fx_lifesteal_percent_100');state.currentBattle.playerHp=500;state.currentBattle.orderSkillActive127=true;state.currentBattle.orderSkillDamage127=0;Math.random=()=>0;await fxEvent_('oncrit');ok(state.currentBattle.playerHp===500&&state.currentBattle.orderSkillDamage127===0,'secondary damage does not count as active lifesteal/shield damage');
  setup462(keys462.blade);await applyWeaponOnHitEffect_(true,0);ok(!state.currentBattle.equipmentPatkPct462,'zero damage crit does not grow');
  await applyWeaponOnHitEffect_(true,10);await applyWeaponOnHitEffect_(true,10);ok(battlePlayerStats().patk===106,'growth additive 3+3%');tickPlayerBuffs();ok(battlePlayerStats().patk===106,'growth survives turn expiry');ok(totalStats().patk===100,'growth never changes persistent base');state.currentBattle=null;ok(battlePlayerStats().patk===100,'growth ends with battle');
  setup462(keys462.blade);applyBattleStatus_('enemy','armor_break',{duration:2});Math.random=()=>.5;await useSkill(1);ok(state.currentBattle.equipmentPatkPct462===6,'two critical hits stack twice');ok(state.currentBattle.enemyHp===10000-180-186,'second hit uses updated PATK');
  for(const [roll,want]of [[.149,0],[.15,4]]){setup462(keys462.noCd);Math.random=()=>roll;await useSkill(2);ok(state.currentBattle.cooldowns['測試治療']===want,'no cooldown once per support cast '+roll);}
  setup462(keys462.noCd);let rolls=0;Math.random=()=>{rolls++;return .1;};ok(equipmentNoCooldown462_({name:'零冷卻',cd:0})===false&&rolls===0,'zero-CD does not consume roll');
  setup462(keys462.inv);Math.random=()=>.099;await useSkill(2);ok(hasBattleStatus('player','invincible'),'cast grants invincibility');const hp=state.currentBattle.playerHp;await applyIncomingDamageLegacy122_(100);ok(state.currentBattle.playerHp===hp,'invincibility blocks damage');
  setup462(keys462.inv);Math.random=()=>.1;await useSkill(2);ok(!hasBattleStatus('player','invincible'),'10% exact boundary fails');
  setup462(keys462.bless);Math.random=()=>.249;await applyDirectDamageToEnemy_(100);ok(hasBattleStatus('player','blessing'),'25% active hit blessing');ok(!applyBattleStatus_('player','poison'),'blessing protects against debuffs');
  setup462(keys462.bless);Math.random=()=>.25;await applyDirectDamageToEnemy_(100);ok(!hasBattleStatus('player','blessing'),'25% exact boundary fails');
  setup462(keys462.hat);ok(totalStats().matk===108,'hat MATK +8%');
  setup462(keys462.skip);state.currentBattle.cooldowns={'測試攻擊':3,'測試連擊':0,'測試治療':2};Math.random=()=>0;await skipPlayerTurn();ok(state.currentBattle.cooldowns['測試攻擊']===2&&state.currentBattle.cooldowns['測試治療']===2,'skip reduces exactly one cooling active skill');
  setup462(keys462.skip);await fxEvent_('skip');ok(Object.keys(state.currentBattle.cooldowns).length===0,'skip no available cooldown is harmless');
  setup462(keys462.noCd);skillTemplates.multi462.kind='magicMulti';skillTemplates.multi462.hits=3;let checksNoCd=0;const oldNoCd=equipmentNoCooldown462_;equipmentNoCooldown462_=function(...args){checksNoCd++;return oldNoCd(...args)};Math.random=()=>0;await useSkill(1);ok(checksNoCd===1&&state.currentBattle.cooldowns['測試連擊']===0,'multihit rolls no-CD once');equipmentNoCooldown462_=oldNoCd;
  setup462(keys462.skip);state.currentBattle.cooldowns={'測試攻擊':3};state.currentBattle.stunTurns=1;const oldControl=resolvePlayerControlSkips;resolvePlayerControlSkips=async()=>{};await skipPlayerTurn();ok(state.currentBattle.cooldowns['測試攻擊']===3,'forced stun skip does not grant bonus');resolvePlayerControlSkips=oldControl;
  setup462(keys462.bow);state.currentBattle.enemyMirrorShieldHp=2000;Math.random=()=>0;await fxEvent_('oncrit');ok(state.currentBattle.enemyHp===10000&&state.currentBattle.enemyMirrorShieldHp===810,'bow damage absorbed by shield');
  return checks;
 });console.log('PvE',results);
 const arena=await p.evaluate(async()=>{
  const checks=[],ok=(x,msg)=>{if(!x)throw Error(msg);checks.push(msg);};
  const actor=(name,effect)=>({name,hp:1000,maxHp:1000,stats:{hp:1000,patk:100,matk:100,def:10,crit:100,critDamage:100},status:{},buff:{},cooldowns:{},shields:[],equipmentList:[{name:'測試裝備',effect,stats:{},gems:[]}],skills:['strike462','support462'],passive:null});
  const setup=(effect)=>{setup462();const a=actor('玩家',effect),d=actor('對手','');arenaBattle_={attacker:a,defender:d,turn:1,maxTurns:30,log:[],attackerDamage:0,defenderDamage:0};state.page='arenaBattle';return[a,d];};
  for(const reverse of [false,true]){const [a,d]=setup(keys462.bow);const src=reverse?d:a,tgt=reverse?a:d;src.equipmentList[0].effect=keys462.bow;Math.random=()=>0;const got=await arenaHit_(src,tgt,100,'crit');ok(got===210&&tgt.hp===790,'arena bow both directions '+reverse);}
  let[a,d]=setup(keys462.blade);Math.random=()=>.5;await arenaHit_(a,d,10,'crit');await arenaHit_(a,d,10,'crit');arenaRefreshConditionalStats_(a);arenaRefreshConditionalStats_(a);ok(a.stats.patk===106,'arena growth additive, refresh idempotent');arenaTick_(a);ok(a.stats.patk===106,'arena growth survives tick');
  [a,d]=setup(keys462.blade);d.status.invincible={turns:1,stacks:1};await arenaHit_(a,d,10,'crit');ok(!a.equipmentPatkPct462,'arena immune crit no growth');
  [a,d]=setup(keys462.noCd+'|'+keys462.inv);Math.random=()=>0;await arenaUse_(a,d,'support462');ok(a.cooldowns['測試治療']===0&&a.status.invincible?.turns===1,'arena support cast no-CD and invincible');arenaTick_(a);ok(a.status.invincible?.turns===1,'invincible survives own turn');ok(arenaTakeDamage_(a,100,'damage',d)===0,'arena invincible protects opponent response');arenaTick_(d);ok(!a.status.invincible,'invincible expires after opponent turn');
  [a,d]=setup(keys462.bless);Math.random=()=>0;await arenaHit_(a,d,10,'physical');ok(a.status.blessing?.turns===2,'arena active hit blessing duration 2');
  [a,d]=setup(keys462.skip);a.cooldowns={'測試攻擊':3,'測試治療':2};Math.random=()=>0;await fxEvent_('skip',a,d);ok(a.cooldowns['測試攻擊']===2&&a.cooldowns['測試治療']===2,'arena skip one random cooling skill');
  [a,d]=setup(keys462.blade);skillTemplates.godspeedSlash={id:'godspeedSlash',name:'神速斬擊',kind:'godspeedSlash',type:'active',hits:3,cd:4};d.hp=d.maxHp=10000;Math.random=()=>.5;await arenaUse_(a,d,'godspeedSlash');ok(a.equipmentPatkPct462===9&&a.stats.patk===109,'arena godspeed three critical hits retain critical trigger');
  [a,d]=setup(keys462.bow+'|'+keys462.bless);Math.random=()=>0;await fxEvent_('oncrit',a,d);ok(!a.status.blessing,'arena secondary hit does not trigger onhit');
  return checks;
 });console.log('Arena',arena);assert.deepEqual(errors,[]);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
