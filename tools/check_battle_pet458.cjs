/* Local fixtures only; network writes are stubbed and all external requests are blocked. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const browsers=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.env.UI458_OUT||'/workspace/work/ui458/results';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const engine=process.env.GAME_TEST_ENGINE||'chromium';
 const browser=await browsers[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}:{headless:true});
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 let resizeWarnings=0;
 p.on('pageerror',e=>{if(e.message==='ResizeObserver loop completed with undelivered notifications.')resizeWarnings++;else errors.push(e.message);});
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 try{
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
 await p.addStyleTag({content:'#accountOverlay{display:none!important}body.login-required-lock #app{filter:none!important;pointer-events:auto!important}'});
 for(const [mode,width,height] of [['desktop',1440,900],['mobile',390,680],['mobile',320,640],['mobile',844,390]]){
  await p.setViewportSize({width,height});
  await p.evaluate(mode=>{
   clearEnemyNotice458_();state=defaultState();state.page='battle';state.base={hp:10000,patk:100,matk:100,def:30,crit:0,critDamage:100};viewModePreference_=mode;initialEntryShown45_=true;
   state.currentBattle={floor:30,enemyKey:'main_boss30',enemyData:{name:'赤炎龍王・巴哈姆特',hp:14600,patk:330,matk:280,def:60,boss:true},playerHp:7856,enemyHp:6630,turn:3,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false,revivedOnce:true,fireReviveHp55:6630,fireReviveBurning55:4};
   onlineStages[30]={backgroundKey:'main03'};enemyBehaviors.main_boss30=[{action:'revive_by_burning'}];
   state.battleVisual={phase:'等待玩家操作',detail:'',busy:false,actor:'player'};state.battleLog=[];render();
  },mode);
  await p.waitForTimeout(180);
  const geometry=await p.evaluate(()=>{const r=id=>JSON.stringify(document.getElementById(id).getBoundingClientRect().toJSON());return{speed:r('battleSpeedBtn'),auto:r('battleAutoBtn262'),hp:r('enemyHpBar111')};});
  await p.evaluate(()=>{showBossPhaseFlash_(state.currentBattle,{phase:'phase2'});window.noticeNode458=enemyNoticeState458_.active.node;window.noticeExpiry458=enemyNoticeState458_.active.expiresAt;});
  const shown=await p.evaluate(()=>{const n=document.querySelector('.enemy-notice458'),r=n.getBoundingClientRect(),l=n.parentElement.getBoundingClientRect(),controls=document.querySelector('.battle-overlay200').getBoundingClientRect(),hp=document.getElementById('enemyHpBar111').getBoundingClientRect();const box=id=>JSON.stringify(document.getElementById(id).getBoundingClientRect().toJSON());return{rect:r.toJSON(),layout:l.toJSON(),offset:n.offsetParent?.className,title:n.querySelector('.enemy-title458').textContent,width:r.width,inside:r.right<=l.right+1,enemySide:r.left>=l.left+l.width/2,belowControls:r.top>=controls.bottom,aboveHud:r.bottom<hp.top||r.top>Math.max(...[...document.querySelectorAll('#enemyBattleStats,#enemyCombatant .combat-head35,#enemyCombatant .combat-status-tag')].map(el=>el.getBoundingClientRect().bottom)),overflow:document.documentElement.scrollWidth>innerWidth,geometry:{speed:box('battleSpeedBtn'),auto:box('battleAutoBtn262'),hp:box('enemyHpBar111')},log:state.battleLog.join(''),nav:document.getElementById('mainNav').getBoundingClientRect().height};});
  assert.equal(shown.title,'煌種涅槃');assert(shown.inside&&shown.enemySide&&shown.belowControls&&!shown.overflow,JSON.stringify(shown));assert.deepEqual(shown.geometry,geometry);assert.match(shown.log,/消耗 4 層燃燒/);
  if(mode==='mobile'){assert.equal(shown.width,84);assert.equal(shown.nav,0);}
  assert(shown.aboveHud,'notice overlaps HP '+JSON.stringify({mode,width,shown}));
  await p.evaluate(()=>render());
  assert(await p.evaluate(()=>enemyNoticeState458_.active.node===noticeNode458&&noticeNode458.isConnected&&enemyNoticeState458_.active.expiresAt===noticeExpiry458),'rerender must keep node and expiry');
  await p.waitForTimeout(250);assert(await p.locator('.enemy-notice458').isVisible(),'notice must survive final layout');
  if(width===1440||width===390)await p.screenshot({path:path.join(out,`battle-${width}.jpg`),type:'jpeg',quality:82});
  await p.evaluate(()=>{state.currentBattle.won=true;render();});
  assert.equal(await p.locator('.enemy-notice458').count(),0);
 }
 console.log('Enemy placement: desktop, phone 390/320, landscape; unchanged controls/HUD; rerender and end cleanup PASS');
 await p.setViewportSize({width:390,height:680});
 await p.evaluate(()=>{state.currentBattle.won=false;render();orionNotice111_(state.currentBattle,'聖光庇護','護盾 200；下一回合恢復 10%。');orionNotice111_(state.currentBattle,'聖光庇護','護盾 200；下一回合恢復 10%。');for(let i=0;i<6;i++)enemyNotice458_(state.currentBattle,'特殊技能'+i,'完整規則'+i,{duration:1600});});
 assert.equal(await p.evaluate(()=>enemyNoticeState458_.queue.length),3);
 assert.equal(await p.evaluate(()=>state.battleLog.filter(x=>x.includes('敵方技能・聖光庇護')).length),1,'duplicate event');
 await p.evaluate(()=>showBossPhaseFlash_(state.currentBattle,{phase:'phase2'}));
 assert.equal(await p.evaluate(()=>enemyNoticeState458_.queue.length),0,'phase drops obsolete visuals, not logs');
 await p.waitForTimeout(1700);
 assert.equal(await p.locator('.enemy-notice458.phase').count(),1,'interrupted timer cannot remove phase');
 await p.evaluate(()=>{enemyNotice458_(state.currentBattle,'過期攻擊','完整規則');state.currentBattle.turn++;enemyNoticeState458_.active.expiresAt=Date.now()-1;syncEnemyNotice458_();});
 assert.equal(await p.locator('.enemy-notice458').count(),0,'old-turn queue must be skipped');
 await p.evaluate(()=>{showCyberSkillFx_('firewall','防火牆','下回合魔法傷害提升；完整規則保留。');});
 assert.match(await p.locator('.enemy-notice458').innerText(),/防火牆/);
 await p.evaluate(()=>{state.currentBattle={...state.currentBattle};render();});
 assert.equal(await p.locator('.enemy-notice458').count(),0,'new battle clears old notice');
 await p.evaluate(()=>{enemyNotice458_(state.currentBattle,'離場測試','不應殘留');state.page='prepare';render();});
 assert.equal(await p.locator('.enemy-notice458').count(),0,'exit cleanup');
 assert.equal(await p.locator('.mobile-enemy-notice39,.skill-cast-flash55,.player-skill-notice55').count(),0);
 console.log('Enemy queue: duplicate, bounded queue, phase priority, timer, stale turn, cyber producer, battle identity and exit PASS');
 await p.emulateMedia({reducedMotion:'reduce'});
 await p.evaluate(()=>{state.page='battle';render();enemyNotice458_(state.currentBattle,'減少動態','保持靜態');});
 assert.equal(await p.locator('.enemy-notice458').evaluate(n=>n.getAnimations().length),0);
 await p.evaluate(()=>clearEnemyNotice458_());
 await p.evaluate(()=>{
  state.currentBattle=null;state.page='prepare';state.pets297=[{id:'fixture-pet',species:'cat',level:100,exp:0,origin:'normal',traits:[0,1,2].map(i=>({traitId:'t'+i,quality:'common',stat:'hp',mode:'flat',value:10,locked:false}))}];
  bootstrapDataCache={PetConfig:[{Key:'MaxLevel',Value:100},{Key:'BaseExp',Value:10},{Key:'ExpGrowth',Value:1.1}],PetQualities:[{QualityID:'common',Name:'普通',Color:'#bbb'}],PetTrainingCosts:[{LockedCount:0,StoneCost:5},{LockedCount:1,StoneCost:10},{LockedCount:2,StoneCost:20}]};state.stones=4;petModal297={id:'fixture-pet',emotion:'idle'};petBusy297=false;cloudMeta.accountId='fixture458';
  localStorage.removeItem(petPendingKey297());render();petPaint297();
 });
 assert(await p.locator('#petTrainButton458').isDisabled());assert.match(await p.locator('#petTrainingFunds458').innerText(),/強化石不足.*1/);
 await p.screenshot({path:path.join(out,'pet-insufficient.jpg'),type:'jpeg',quality:85});
 await p.evaluate(()=>{bootstrapDataCache.PetTrainingCosts[0].StoneCost=100;state.stones=91;state.pets297[0].level=25;state.pets297[0].traits=state.pets297[0].traits.slice(0,1);petPaint297();});
 assert(await p.locator('#petTrainButton458').isDisabled());assert.match(await p.locator('#petTrainingFunds458').innerText(),/強化石不足.*9/);
 assert.equal(await p.locator('#petTrainButton458').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(41, 41, 41)');
 await p.screenshot({path:path.join(out,'pet-91-of-100.jpg'),type:'jpeg',quality:85});
 await p.evaluate(()=>{bootstrapDataCache.PetTrainingCosts[0].StoneCost=5;state.pets297[0].level=100;state.pets297[0].traits=[0,1,2].map(i=>({traitId:'t'+i,quality:'common',stat:'hp',mode:'flat',value:10,locked:false}));state.stones=5;render();});assert(await p.locator('#petTrainButton458').isEnabled());
 await p.evaluate(()=>{state.pets297[0].traits[0].locked=true;petPaint297();});assert(await p.locator('#petTrainButton458').isDisabled());assert.match(await p.locator('#petTrainingFunds458').innerText(),/還差 5/);
 await p.evaluate(()=>{state.stones=10;petPaint297();});assert(await p.locator('#petTrainButton458').isEnabled());
 await p.evaluate(()=>{state.pets297[0].traits.forEach(t=>t.locked=true);petPaint297();});assert(await p.locator('#petTrainButton458').isDisabled());assert(!(await p.locator('#petTrainingFunds458').isVisible()));
 await p.evaluate(()=>{state.pets297[0].traits.forEach(t=>t.locked=false);state.stones=100;});
 for(const value of ['',null,'no',0,-1,2.5]){await p.evaluate(value=>{bootstrapDataCache.PetTrainingCosts[0].StoneCost=value;petPaint297();},value);assert(await p.locator('#petTrainButton458').isDisabled());}
 await p.evaluate(()=>{
  bootstrapDataCache.PetTrainingCosts[0].StoneCost=5;state.stones=4;state.pets297[0].traits[0].quality='legendary';petPaint297();
  window.fixture458={api:0,confirm:0,preflight:0,preflightStones:null};isCloudLoggedIn=()=>true;activeBattleNow=()=>false;
  characterSessionContext_=()=>({accountId:'fixture458',generation:0});assertCharacterSession_=()=>{};beginServerMutation_=()=>true;endServerMutation_=()=>{};closeBattle78_=async()=>{};
  characterStorageWrite44_=(key,value)=>localStorage.setItem(key,value);save=()=>{};
  gameConfirm_=async()=>{fixture458.confirm++;return true;};
  inventoryPreflight85_=async()=>{fixture458.preflight++;if(fixture458.preflightStones!==null)state.stones=fixture458.preflightStones;return{revision:1};};
  apiPost=async(action,payload)=>{fixture458.api++;return{ok:true,accountId:'fixture458',save:{stones:0},duplicate:!!fixture458.recover};};
  applyServerSave79_=async r=>{state.stones=r.save.stones;};
 });
 await p.evaluate(()=>petAction297('pet/train',{petId:'fixture-pet'}));
 assert.deepEqual(await p.evaluate(()=>[fixture458.api,fixture458.confirm,fixture458.preflight]),[0,0,0],'insufficient must stop before legend confirmation/network');
 await p.evaluate(()=>{state.stones=5;state.pets297[0].traits[0].quality='common';fixture458.preflightStones=4;petPaint297();});
 await p.evaluate(()=>petAction297('pet/train',{petId:'fixture-pet'}));
 assert.equal(await p.evaluate(()=>fixture458.api),0,'preflight rechecks funds');assert.equal(await p.evaluate(()=>petPending297()),null);
 assert(await p.locator('#petTrainButton458').isDisabled());
 await p.evaluate(()=>{state.stones=5;fixture458.preflightStones=null;petPaint297();});
 await p.evaluate(()=>petAction297('pet/train',{petId:'fixture-pet'}));
 assert.equal(await p.evaluate(()=>fixture458.api),1);assert(await p.locator('#petTrainButton458').isDisabled());assert.match(await p.locator('#petTrainingFunds458').innerText(),/強化石不足/);
 await p.evaluate(()=>{fixture458.recover=true;fixture458.preflight=0;localStorage.setItem(petPendingKey297(),JSON.stringify({action:'pet/train',petId:'fixture-pet',requestId:'existing-receipt',expectedSaveRevision:1}));petPaint297();});
 assert(await p.locator('#petTrainButton458').isDisabled());
 assert(await p.getByRole('button',{name:'確認上次結果',exact:true}).isEnabled());
 await p.evaluate(()=>petAction297());
 assert.equal(await p.evaluate(()=>fixture458.api),2,'recovery with zero stones must still query original receipt');assert.equal(await p.evaluate(()=>fixture458.preflight),0);assert.equal(await p.evaluate(()=>petPending297()),null);
 assert.deepEqual(errors,[]);if(resizeWarnings)console.log('Browser resize delivery warnings (layout assertions passed):',resizeWarnings);console.log('Pet: insufficient/equal funds, lock costs, all locked, invalid costs, preflight race, last-stone training and zero-stone recovery PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
