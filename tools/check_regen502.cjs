const assert=require('node:assert/strict');
const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const engine=process.env.BROWSER||'chromium',browser=await ({chromium,webkit}[engine]).launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
 try{for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:900}});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
  const result=await p.evaluate(async()=>{
   // Exercise the actual shared combat functions with isolated local state; no account/API writes.
   save=()=>{};render=()=>{};wait=async()=>{};playSfx=()=>{};updateBattleNumbers=()=>{};setBattleVisual=()=>{};battleEffectText55_=()=>{};healFx=()=>{};floatText=()=>{};
   const check=(ok,msg)=>{if(!ok)throw Error(msg)},rows=[];
   const reset=(mode='main')=>{
    state=defaultState();state.page='battle';state.base={hp:10000,patk:100,matk:100,def:0,crit:0,critDamage:100};state.battleLog=[];state.equipment={rings:[null,null,null,null]};state.passive=[];
    state.currentBattle={floor:1,enemyKey:'regen502',enemyData:{name:'測試敵人',hp:10000,patk:1,matk:1,def:0},playerHp:3000,enemyHp:8000,turn:1,statuses:{player:{},enemy:{}},cooldowns:{},phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},...({worldBoss:{worldBoss:true,worldBossMaxTurns:5},dungeon:{dungeonBattle:true,dungeonTurnsLeft:20},extreme:{extreme130:true},relic:{relic144:true}}[mode]||{})};
    return state.currentBattle;
   };
   const sk={kind:'healPercentRegen',name:'恢復術',value:100,regen:.005,duration:3};
   for(const mode of ['main','worldBoss','dungeon','extreme','relic']){
    let b=reset(mode);await useBalancedMain241_('heal502',sk,battlePlayerStats());check(b.playerHp===3100,mode+' immediate heal');
    tickPlayerRegen502_();check(b.playerHp===3100&&b.playerBuffs.regenTurns===3,mode+' same-turn acquisition guard');
    tickPlayerBuffs();check(b.playerHp===3100&&b.playerBuffs.regenTurns===3,mode+' no regen in end-of-turn buff decay');
    const amount=Math.trunc(battlePlayerStats().hp*.005);
    await finishEnemyAction134_(b,battleEnemy(b));check(b.turn===2&&b.playerHp===3100+amount&&b.playerBuffs.regenTurns===2,mode+' next own turn');
    tickPlayerRegen502_();check(b.playerHp===3100+amount&&b.playerBuffs.regenTurns===2,mode+' duplicate tick');
    state.currentBattle=JSON.parse(JSON.stringify(b));b=state.currentBattle;tickPlayerRegen502_();check(b.playerBuffs.regenTurns===2,mode+' persisted tick');
    await finishEnemyAction134_(b,battleEnemy(b));await finishEnemyAction134_(b,battleEnemy(b));check(b.playerBuffs.regenTurns===0&&b.playerHp===3100+amount*3,mode+' full duration');
    rows.push(mode);
   }
   let b=reset();await useBalancedMain241_('heal502',sk,battlePlayerStats());b.turn++;
   applyBattleStatus_('player','heal_block',{duration:2});tickPlayerRegen502_();check(b.playerHp===3100&&b.playerBuffs.regenTurns===2,'main heal block');
   b=reset();await useBalancedMain241_('heal502',sk,battlePlayerStats());b.turn++;b.playerHp=30;applyBattleStatus_('player','curse',{duration:2});tickPlayerRegen502_();check(b.playerHp<=0,'main curse');
   // Special boss regeneration previously included the cast turn; it now uses its next turn.
   b=reset();enemyBehaviors.regen502=[{action:'tri_growth',param1:0},{action:'tri_regen',duration:3,param1:.01}];
   triRegen117_(b);triStartRegen502_(b,battleEnemy(b));await triEndEnemyTurn117_(b,battleEnemy(b));check(b.enemyHp===8000&&b.triRegenTurns117===3,'boss acquisition turn');
   for(let i=1;i<=3;i++){b.turn++;triStartRegen502_(b,battleEnemy(b));triStartRegen502_(b,battleEnemy(b));check(b.enemyHp===8000+100*i&&b.triRegenTurns117===3-i,'boss own-start single tick');}
   // Arena already begins regeneration on the owner's next turn: preserve this behavior.
   const actor=name=>({name,hp:3000,maxHp:10000,stats:{hp:10000,patk:1,matk:1,def:0,crit:0,critDamage:100},status:{},buff:{},equipmentList:[],equipment:{},skills:[],cooldowns:{}});
   arenaVisual_=async()=>{};arenaFx_=()=>{};arenaBattle_={attacker:actor('A'),defender:actor('D'),turn:1,log:[],finished:false};
   for(const side of ['attacker','defender']){
    const a=arenaBattle_[side],other=arenaBattle_[side==='attacker'?'defender':'attacker'];
    arenaTurnStartStatus_(a);await useBalancedArena241_(a,other,'heal502',sk);check(a.hp===3100&&a.regenTurns===3,'arena immediate only '+side);
    arenaTurnStartStatus_(a);check(a.hp===3150&&a.regenTurns===2,'arena next own start '+side);
   }
   return rows;
  });
  assert.equal(result.length,5);console.log(engine,width,result.join(', '),'plus boss and arena regeneration passed');await p.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
