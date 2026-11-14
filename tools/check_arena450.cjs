// Local-only regression; serve the repo on 127.0.0.1:8443. All API data is synthetic.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
  await p.evaluate(()=>{
   document.querySelectorAll('#accountOverlay,#bootLoading279,#initialEntry45').forEach(e=>e.remove());
   document.body.classList.remove('login-required-lock');initialEntryShown45_=true;
   save=()=>{};isCloudLoggedIn=()=>true;toast=t=>window.lastToast450=t;bootstrapDataCache={};
   window.fixture450=(mobile=false)=>{
    updateCooldowns132.clear();state=defaultState();state.page='arena';state.maxCleared=50;
    cloudMeta={accountId:'synthetic-450',sessionToken:'fixture'};
    viewModePreference_=mobile?'mobile':'desktop';applyViewMode_();arenaTab_='challenge';
    arenaCache_={status:{ok:true,needsDefense:false,season:{seasonId:'fixture'}},ranking:[{rank:1,nickname:'舊排行',points:10}],rankingLoaded:true,revenge:[{revengeId:'fixture-revenge',targetNickname:'復仇測試玩家',winDelta:2}],revengeLoaded:true};
    window.calls450=[];window.next450={ok:true,rows:[{rank:2,nickname:'最新排行',points:20}],myRank:{rank:2,points:20}};
    apiPost=async action=>{calls450.push(action);return next450;};
    hubUI413_={mode:'arena',facility:'ranking',quick:false};render();
   };
   // Use production hub markup, mounting, styles and async readers.
   render=()=>{
    window.renderCount450=(window.renderCount450||0)+1;
    const root=document.getElementById('page');root.dataset.gamePage=state.page;
    root.innerHTML=hubActive413_()?renderHub413_(state.page):renderArena_();
    hubMount413_();hubKit413_(root);
   };
   window.defer450=()=>{calls450=[];apiPost=action=>{calls450.push(action);return new Promise(resolve=>window.resolve450=resolve);};};
   fixture450();
  });
  await p.click('#arenaRankingRefreshBtn');
  await p.waitForFunction(()=>document.querySelector('.arena-rank-player')?.textContent.includes('最新排行'));
  assert.match(await p.locator('.arena-my-rank').innerText(),/#2/);
  assert.equal(await p.evaluate(()=>arenaTab_),'challenge');
  console.log('PASS desktop refresh updates ranking and own rank immediately');

  for(const tab of ['ranking','record']){
   await p.evaluate(tab=>{fixture450();arenaCache_.rankingLoaded=false;arenaCache_.revengeLoaded=false;defer450();hubOpen413_(tab);},tab);
   const button=p.locator(tab==='ranking'?'#arenaRankingRefreshBtn':'.arena-revenge-panel214 .section-title button');
   assert.equal(await button.isDisabled(),true);
   await p.evaluate(tab=>tab==='ranking'?refreshArenaRanking_():refreshArenaRevenge_(),tab);
   assert.deepEqual(await p.evaluate(()=>calls450),[tab==='ranking'?'arena/ranking':'arena/revenge/list']);
   await p.evaluate(()=>resolve450({ok:true,rows:[]}));
   await p.waitForFunction(()=>!arenaCache_.rankingBusy&&!arenaCache_.revengeBusy);
   assert.equal(await button.isDisabled(),false,JSON.stringify(await p.evaluate(()=>({cache:arenaCache_,hub:hubUI413_,session:characterSessionContext_(),html:document.querySelector('#arenaRankingRefreshBtn,.arena-revenge-panel214 .section-title button')?.outerHTML}))));
  }
  console.log('PASS first entry fetches data; duplicate requests blocked; empty responses replace old rows');

  for(const [width,height] of [[1440,900],[1280,720],[1024,600]]){
   await p.setViewportSize({width,height});
   await p.evaluate(()=>{
    fixture450();arenaCache_.revenge=Array.from({length:30},(_,i)=>({revengeId:'revenge-'+i,targetNickname:'測試玩家 '+i}));hubOpen413_('record');
    entryPhase228_('arena','ready');arenaStartSession_=payload=>window.started450=payload;
   });
   const list=p.locator('.arena-revenge-list214');
   assert.ok((await list.boundingBox()).height>100);
   const last=list.locator('button.danger').last();await last.scrollIntoViewIfNeeded();
   const box=await last.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=height);
   const geom=await p.locator('.hub-content413').evaluate(e=>({overflow:e.scrollWidth-e.clientWidth,scrolled:e.scrollTop}));
   assert.ok(geom.overflow<=1);assert.ok(geom.scrolled>0);
   if(width===1440){await last.click();assert.deepEqual(await p.evaluate(()=>started450),{revengeId:'revenge-29'});}
  }
  console.log('PASS revenge rows visible, scrollable and correct revenge ID passed at three desktop sizes');

  await p.setViewportSize({width:1440,height:900});
  await p.evaluate(()=>{
   fixture450();arenaCache_.revenge=[];arenaCache_.revengeLoaded=false;
   apiPost=async()=>{throw Error('fixture network failure');};hubOpen413_('record');
  });
  await p.waitForFunction(()=>!!arenaCache_.revengeLoadError&&!arenaCache_.revengeBusy);
  assert.match(await p.locator('.arena-revenge-list214').innerText(),/讀取失敗/);
  const refresh=p.locator('.arena-revenge-panel214 .section-title button');
  assert.equal(await refresh.isDisabled(),false);assert.equal(await refresh.innerText(),'重新整理');
  await p.evaluate(()=>apiPost=async()=>({ok:true,rows:[{revengeId:'retry',targetNickname:'重試成功'}]}));
  await refresh.click();await p.waitForFunction(()=>!arenaCache_.revengeLoadError);
  assert.match(await p.locator('.arena-revenge-list214').innerText(),/重試成功/);
  await p.evaluate(async()=>{apiPost=async()=>{throw Error('fixture failure');};await refreshArenaRevenge_();});
  assert.match(await p.locator('.arena-revenge-panel214').innerText(),/上次的名單/);
  assert.match(await p.locator('.arena-revenge-list214').innerText(),/重試成功/);
  console.log('PASS failed fetch is distinct from empty list; retry works; cached rows retained on failure');

  for(const tab of ['ranking','record'])for(const transition of ['tab','close','account','cache']){
   await p.evaluate(({tab,transition})=>{
    fixture450();hubOpen413_(tab);defer450();
    window.pending450=tab==='ranking'?refreshArenaRanking_():refreshArenaRevenge_();
    if(transition==='tab')hubOpen413_(tab==='ranking'?'record':'ranking');
    if(transition==='close')hubClose413_();
    if(transition==='account')cloudMeta.accountId='another-fixture';
    if(transition==='cache')arenaCache_={};
    window.before450=renderCount450;
   },{tab,transition});
   await p.evaluate(async()=>{resolve450({ok:true,rows:[{nickname:'遲到資料',targetNickname:'遲到資料'}]});await pending450;});
   assert.equal(await p.evaluate(()=>renderCount450===before450),true,tab+' '+transition);
   if(transition==='account'||transition==='cache')assert.equal(await p.evaluate(()=>JSON.stringify(arenaCache_).includes('遲到資料')),false);
  }
  console.log('PASS late responses cannot reopen dialogs, replace another tab or cross account/cache changes');

  await p.setViewportSize({width:390,height:844});
  // Let the application's debounced resize render finish before installing the fixture.
  await p.waitForTimeout(500);
  await p.evaluate(()=>{fixture450(true);arenaTab_='ranking';render();});
  await p.click('#arenaRankingRefreshBtn');
  await p.waitForFunction(()=>document.querySelector('.arena-rank-player')?.textContent.includes('最新排行'));
  await p.evaluate(()=>{arenaTab_='revenge';next450={ok:true,rows:[{revengeId:'mobile',targetNickname:'手機復仇'}]};render();});
  await p.locator('.arena-revenge-panel214 .section-title button').click();
  await p.waitForFunction(()=>document.querySelector('.arena-revenge-list214')?.textContent.includes('手機復仇'));
  assert.equal(await p.locator('.arena-revenge-list214').evaluate(e=>e.style.getPropertyValue('overflow')),'');
  assert.deepEqual(errors,[]);
  console.log('PASS mobile refresh preserved; desktop inline styles do not leak; no script errors');

  // Exercise the approved world-boss dialog with production readers and synthetic API responses.
  await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(500);
  await p.evaluate(()=>{
   fixture450();state.page='worldboss';updateCooldowns132.clear();
   worldBossPlanningData_=()=>({bossId:'poisonDragon',name:'測試首領',maxHp:100000,maxTurns:5,attempts:2,topRewardCount:10,chestGoldMin:10,chestGoldMax:20,chestStone:5,chestGemId:'fixture-gem',chestGemRate:.5,gem:{name:'測試寶石'},patk:100,matk:100,def:50,skillDescription:'合成測試情報'});
   worldBossCache={boss:{instanceId:'fixture-boss',bossId:'poisonDragon',currentHp:90000,status:'ALIVE'},attemptsLeft:2,attemptsMax:2,pendingChests:[]};
   localStorage.removeItem(worldBossPendingKey448());hubUI413_={mode:'worldboss',facility:'ranking'};
   apiPost=async action=>{
    if(action==='worldboss/ranking')return {ok:true,ranking:{top10:[{rank:1,nickname:'更新後貢獻排行',damage:1234}],mine:{rank:1,damage:1234},totalPlayers:1}};
    if(action==='worldboss/status')return {...worldBossCache,boss:{...worldBossCache.boss,currentHp:12345}};
    if(action==='worldboss/reward/check')return {ok:true,chests:[{rewardId:'fixture-reward',rank:1,status:'PENDING',chestType:'測試寶箱',rewardGemId:'fixture-gem',rewardGoldMin:10,rewardGoldMax:20,rewardStones:5,expiresAt:new Date(Date.now()+3600000).toISOString()}]};
    throw Error('Unexpected fixture request '+action);
   };render();
  });
  await p.locator('.wb-pane-heading449 button').click();
  await p.waitForFunction(()=>document.querySelector('.wb-rank-list449')?.textContent.includes('更新後貢獻排行'));
  // The existing update cooldown lasts three seconds; the button must recover after it.
  await p.waitForFunction(()=>!document.querySelector('.wb-pane-heading449 button').disabled,null,{timeout:5000});
  await p.click('#worldBossRefreshBtn');
  await p.waitForFunction(()=>worldBossCache.boss.currentHp===12345);
  assert.match(await p.locator('.wb-hp-detail449').innerText(),/12,345/);
  await p.click('[data-hub-tab422="rewards"]');await p.click('#worldBossChestCheckBtn');
  await p.waitForFunction(()=>document.querySelector('[data-wb-chest-btn="fixture-reward"]'));
  await p.evaluate(()=>gameConfirm_=async text=>{window.confirm450=text;return false;});
  await p.click('[data-wb-chest-btn="fixture-reward"]');
  assert.match(await p.evaluate(()=>confirm450),/測試寶箱/);assert.match(await p.evaluate(()=>confirm450),/10～20/);
  for(const [width,height] of [[1440,900],[1280,720],[1024,600],[1920,1080]]){
   await p.setViewportSize({width,height});
   for(const tab of ['challenge','ranking','rewards']){
    await p.evaluate(tab=>hubOpen413_(tab),tab);
    const geometry=await p.locator('.wb449').evaluate(e=>{const r=e.getBoundingClientRect(),c=e.querySelector('.wb-content449');return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,overflow:c.scrollWidth-c.clientWidth};});
    assert.ok(geometry.left>=0&&geometry.top>=0&&geometry.right<=width+1&&geometry.bottom<=height+1,JSON.stringify(geometry));assert.ok(geometry.overflow<=1);
   }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS world-boss ranking/status/chest handlers and four desktop viewport layouts');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
