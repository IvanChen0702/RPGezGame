// Local-only browser regression. Start: python -m http.server 8443 --bind 127.0.0.1
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
 await page.evaluate(()=>{document.getElementById('accountOverlay')?.remove();state=defaultState();state.page='town';initialEntryShown45_=true;});
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]){
  await page.setViewportSize(viewport);
  await page.evaluate(width=>{viewModePreference_=width<768?'mobile':'desktop';applyViewMode_();},viewport.width);
  for(const npc of ['lily','xi','kazama','yexian']){
   const result=await page.evaluate(async npc=>{
    questOpenShell368(npc);document.querySelector('.quest-content368').textContent='測試表情：台詞不改變角色比例與底部位置。';
    let base=null;
    for(const expression of questExpressions447){
     questSpeakerArt370({Speaker:'npc',Expression:expression});
     const art=document.querySelector('.quest-art368');const r=art.getBoundingClientRect();
     if(!base)base={height:r.height,bottom:r.bottom};
     if(Math.abs(r.height-base.height)>1)throw Error('portrait height changed '+npc+' '+expression);
     const svg=art.querySelector('.quest-npc-expression447');
     if(questExtraExpressions447.includes(expression)){
      if(!svg)throw Error('missing expression '+expression);
      await questExtraImages447.get(npc).decode();
      const sr=svg.getBoundingClientRect();if(Math.abs(sr.width/sr.height-480/724)>.01)throw Error('squashed portrait');
      if(Math.abs(r.bottom-base.bottom)>1)throw Error('bottom changed');
      if(sr.left<0||sr.right>innerWidth+1)throw Error('portrait outside screen');
     }
    }
    questSpeakerArt370({Speaker:'narrator',Expression:'serious'});if(document.querySelector('.quest-npc-expression447'))throw Error('narrator retained portrait');
    questSpeakerArt370({Speaker:'player',Expression:'serious'});if(document.querySelector('.quest-npc-expression447'))throw Error('player retained NPC');
    questSpeakerArt370({Speaker:'npc',Expression:'basic'});if(document.querySelector('.quest-npc-expression447'))throw Error('new atlas persists on basic');
    questSpeakerArt370({Speaker:'npc',Expression:'surprised'});return base;
   },npc);
   console.log('PASS NPC',viewport.width,npc,result);
  }
  await page.screenshot({path:'/workspace/work/npc-expression-review/processed/dialog-'+viewport.width+'.png'});
 }
 await page.evaluate(()=>{
  questClose368();window.realRender448=render;
  window.setup448=()=>{
   cloudMeta={accountId:'synthetic-account',sessionToken:'synthetic-token'};state=defaultState();state.page='battle';
   window.sessionGeneration448=1;
   characterSessionContext_=()=>({accountId:cloudMeta.accountId,generation:sessionGeneration448});
   assertCharacterSession_=s=>{if(s.accountId!==cloudMeta.accountId||s.generation!==sessionGeneration448)throw Error('ACCOUNT_CHANGED');};
   characterStorageWrite44_=(k,v)=>localStorage.setItem(k,v);save=()=>{};toast=t=>{window.lastToast448=t;};refreshWorldBoss=async()=>{};
   worldBossPlanningData_=()=>({attempts:3,name:'測試 Boss',maxHp:100,topRewardCount:3,chestStone:1,chestGoldMin:1,chestGoldMax:1,chestGemRate:0});
   worldBossCache={boss:{instanceId:'boss',currentHp:100,status:'ALIVE'},attemptsLeft:3,attemptsMax:3};
   render=()=>{document.getElementById('page').innerHTML=state.currentBattle?renderBattle():worldBossPending448()?worldBossRecoveryHtml448():'';};
   window.makeBattle448=()=>{state.page='battle';state.currentBattle={worldBoss:true,worldBossInstanceId:'boss',worldBossStartHp:100,enemyHp:40,playerHp:100,worldBossMaxTurns:5,turn:6,worldBossRequest448:crypto.randomUUID()};return state.currentBattle;};
  };setup448();
 });
 console.log(await page.evaluate(async()=>{
  const b=makeBattle448();apiPost=async()=>({ok:true,settled:true,settlementStatus:'boss_defeated',attemptConsumed:false,bossHp:0,bossStatus:'DEAD',attemptsMax:3,attemptsLeft:3});
  await settleWorldBossChallenge_('turn_limit');
  if(state.currentBattle||worldBossPending448()||state.page!=='worldboss'||worldBossCache.attemptsLeft!==3)throw Error('dead boss did not cleanly close');
  return 'PASS dead boss: exits with unchanged attempts';
 }));
 console.log(await page.evaluate(async()=>{
  const b=makeBattle448();window.calls448=[];apiPost=async(a,p)=>{calls448.push(p);throw Error('NETWORK_TIMEOUT');};
  await settleWorldBossChallenge_('turn_limit');
  if(!worldBossEnded448()||!worldBossPending448()||!state.battleVisual.busy)throw Error('failed settlement resumed combat');
  if(!document.querySelector('[onclick="returnWorldBoss448()"]'))throw Error('missing exit');
  await useSkill(0);await skipPlayerTurn();await useBattleItem(0);
  await Promise.resolve();
  if(b.turn!==6||b.enemyHp!==40)throw Error('combat continued past limit');
  const request=calls448[0];returnWorldBoss448();
  if(state.currentBattle||!worldBossPending448())throw Error('exit lost pending receipt');
  state=defaultState();state.page='worldboss'; // Simulate load() clearing the battle.
  apiPost=async(a,p)=>{if(p.requestId!==request.requestId||p.damage!==60)throw Error('retry changed request');return {ok:true,settled:true,settlementStatus:'accepted',alreadySettled:true,acceptedDamage:60,bossHp:40,bossStatus:'ALIVE',attemptsMax:3,attemptsLeft:2};};
  await settleWorldBossChallenge_('retry');if(worldBossPending448()||worldBossCache.attemptsLeft!==2)throw Error('receipt recovery failed');
  return 'PASS transient failure: frozen combat, exit, persisted receipt and stable retry';
 }));
 console.log(await page.evaluate(async()=>{
  const b=makeBattle448();let calls=0;let resolve;
  apiPost=()=>{calls++;return new Promise(r=>resolve=r);};
  const first=settleWorldBossChallenge_('turn_limit'),second=settleWorldBossChallenge_('retry');
  if(calls!==1)throw Error('duplicate request in flight');
  returnWorldBoss448();resolve({ok:true,settled:true,settlementStatus:'accepted',bossHp:40,bossStatus:'ALIVE',attemptsLeft:2,attemptsMax:3});await Promise.all([first,second]);
  if(worldBossPending448()||state.currentBattle)throw Error('in-flight exit did not recover');
  return 'PASS repeated click and return while settling';
 }));
 console.log(await page.evaluate(async()=>{
  makeBattle448();apiPost=async()=>{throw Object.assign(Error('世界 BOSS 已被擊敗'),{apiData:{error:'WORLD_BOSS_DEAD'}});};
  await settleWorldBossChallenge_('turn_limit');if(state.currentBattle||worldBossPending448())throw Error('legacy terminal failure stranded battle');
  makeBattle448();let resolve;apiPost=()=>new Promise(r=>resolve=r);const old=settleWorldBossChallenge_('turn_limit');
  cloudMeta.accountId='different-account';state=defaultState();state.page='prepare';resolve({ok:true,attemptsLeft:0});await old;
  if(state.page!=='prepare'||worldBossPending448())throw Error('old response applied to new account');
  cloudMeta.accountId='synthetic-account';if(!worldBossPending448())throw Error('old account pending result lost');
  localStorage.removeItem(worldBossPendingKey448());
  return 'PASS legacy error and account-switch isolation';
 }));
 assert.deepEqual(errors,[]);console.log('PASS no browser script errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
