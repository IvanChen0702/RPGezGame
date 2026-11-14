/* Local fixtures only. GAME_TEST_ENGINE=webkit exercises Safari's engine. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const engines=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const engine=process.env.GAME_TEST_ENGINE||'chromium',out=process.env.ENEMY_TEST_OUT||'/workspace/work/enemy459';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await engines[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
 try{
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:3}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
 await p.addStyleTag({content:'#accountOverlay{display:none!important}body.login-required-lock #app{filter:none!important;pointer-events:auto!important}'});
await p.evaluate(()=>{state=defaultState();state.page='battle';state.base={hp:10000,patk:100,matk:100,def:30,crit:0,critDamage:100};viewModePreference_='mobile';initialEntryShown45_=true;state.currentBattle={floor:48,enemyKey:'dragonVeinWarlock',enemyData:{name:'龍脈咒師',hp:1900,patk:0,matk:110,def:85,boss:false},playerHp:900,enemyHp:687,turn:9,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false};onlineStages[48]={backgroundKey:'main05'};state.battleVisual={phase:'等待玩家操作',detail:'',busy:false,actor:'player'};state.battleLog=[];render();});

 await p.waitForTimeout(500);
 for(const [mode,width,height] of [['mobile',390,680],['desktop',1440,900]]){
  await p.setViewportSize({width,height});await p.evaluate(mode=>{viewModePreference_=mode;render();},mode);await p.waitForTimeout(250);
  for(const side of ['player','enemy']){
   const result=await p.evaluate(side=>{const r=pixelStage192_;r.events=[];const target=side==='player'?'enemy':'player',before=JSON.stringify(state.currentBattle);
    reflectAttackFx56_(document.getElementById(side+'Combatant'),document.getElementById(target+'Combatant'));
    const event=r.events[0],now=performance.now();if(!event||event.type!=='reflect459'||event.side!==side||event.target!==target)throw Error('missing directional shield');
    if(pixelAction386_(r,side,now)||pixelAction386_(r,target,now))throw Error('reflection created actor movement');
    const cv=document.createElement('canvas');cv.width=1000;cv.height=1000;const c=cv.getContext('2d'),anchors={player:pixelAnchor192_('player'),enemy:pixelAnchor192_('enemy')};let frames=0;
    for(const reduce of [false,true])for(const p of [.15,.45,.85]){c.clearRect(0,0,1000,1000);pixelReflect459_(c,event,anchors,event.start+event.duration*p,reduce);let count=0;for(const alpha of c.getImageData(0,0,1000,1000).data.filter((_,i)=>i%4===3))if(alpha>8)count++;if(count<20)throw Error('blank shield');frames++;}
    const cast={type:'cast203',side,start:now,duration:1000};r.events.unshift(cast);if(pixelAction386_(r,side,now)!==cast)throw Error('reflection interrupted cast');r.events.shift();
    if(JSON.stringify(state.currentBattle)!==before)throw Error('visual mutated battle');return{frames};},side);
   assert.equal(result.frames,6);
  }
  console.log(engine,mode,'both reflection directions, no actor motion, active cast preserved, reduced motion PASS');
 }
 const pve=await p.evaluate(async()=>{
  const battle=state.currentBattle;battle.playerHp=1000;battle.enemyHp=1000;battle.enemyData.def=5;
  state.inventory=[{id:'reflect-fixture',template:'reflect-fixture',name:'測試反傷護甲',slot:'armor',stats:{},effect:'reflect20',gems:[]}];state.equipment={armor:'reflect-fixture',rings:[]};state.passive=[];
  pixelStage192_.events=[];const taken=await applyIncomingDamageLegacy122_(100,'測試攻擊',true);
  const first={taken,player:battle.playerHp,enemy:battle.enemyHp,events:pixelStage192_.events.map(e=>({type:e.type,side:e.side}))};
  pixelStage192_.events=[];enemyBehaviors[battle.enemyKey]=[{action:'damage_reflect_magic',param1:.3}];
  const damage=await applyDirectDamageToEnemyLegacy122_(100,'physical','測試攻擊');
  return{first,second:{damage,player:battle.playerHp,enemy:battle.enemyHp,events:pixelStage192_.events.map(e=>({type:e.type,side:e.side}))}};
 });
 assert.equal(pve.first.taken,100);assert.equal(pve.first.player,900);assert.equal(pve.first.enemy,985);assert(pve.first.events.some(e=>e.type==='reflect459'&&e.side==='player'));assert(!pve.first.events.some(e=>['attack','magic'].includes(e.type)));
 assert.equal(pve.second.damage,100);assert.equal(pve.second.player,870);assert.equal(pve.second.enemy,885);assert(pve.second.events.some(e=>e.type==='reflect459'&&e.side==='enemy'));assert(!pve.second.events.some(e=>e.type==='reflect459'&&e.side==='player'),'no reflection loop');
 console.log('PvE actual damage: 100 hit -> 15 physical reflection; 100 hit -> 30 enemy magic reflection; no recursion PASS');
 const arena=await p.evaluate(()=>{
  const actor=(name,effect)=>({name,hp:1000,maxHp:1000,stats:{hp:1000,patk:100,matk:100,def:5},status:{},shields:[],equipmentList:effect?[{name:'反傷護甲',effect,stats:{},gems:[]}]:[],passive:null});
  const a=actor('玩家','reflect20'),d=actor('對手','reflect60');arenaBattle_={attacker:a,defender:d,turn:1,log:[]};state.page='arenaBattle';pixelStage192_.battle=arenaBattle_;pixelStage192_.events=[];
  const taken=arenaTakeDamage_(a,100,'damage',d),first={taken,a:a.hp,d:d.hp,events:pixelStage192_.events.map(e=>({type:e.type,side:e.side}))};
  a.hp=d.hp=1000;pixelStage192_.events=[];const taken2=arenaTakeDamage_(d,100,'damage',a);
  return{first,second:{taken:taken2,a:a.hp,d:d.hp,events:pixelStage192_.events.map(e=>({type:e.type,side:e.side}))}};
 });
 assert.deepEqual([arena.first.taken,arena.first.a,arena.first.d],[100,900,985]);assert.deepEqual([arena.second.taken,arena.second.a,arena.second.d],[100,945,900]);
 for(const [row,side]of [[arena.first,'player'],[arena.second,'enemy']]){assert.equal(row.events.filter(e=>e.type==='reflect459').length,1);assert(row.events.some(e=>e.type==='reflect459'&&e.side===side));assert(!row.events.some(e=>['attack','magic','cast203','hit'].includes(e.type)));}
 console.log('Arena actual damage: both sides retain 20%/60% reflection, no recursion or movement PASS');
 assert.deepEqual(errors,[]);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
