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
    state=defaultState();state.page='arena';state.maxCleared=50;
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
    root.innerHTML=hubActive413_()?renderHub413_('arena'):arenaTab_==='revenge'?renderArenaRevenge_():renderArenaRanking_();
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
  await p.evaluate(()=>{fixture450(true);arenaTab_='ranking';render();});
  await p.click('#arenaRankingRefreshBtn');
  await p.waitForFunction(()=>document.querySelector('.arena-rank-player')?.textContent.includes('最新排行'),null,{timeout:5000}).catch(async e=>{console.log(await p.evaluate(()=>({cache:arenaCache_,tab:arenaTab_,page:state.page,mode:viewMode_,calls:calls450,visible:arenaPaneVisible450_('ranking'),text:document.querySelector('.arena-rank-player')?.textContent})));throw e;});
  await p.evaluate(()=>{arenaTab_='revenge';next450={ok:true,rows:[{revengeId:'mobile',targetNickname:'手機復仇'}]};render();});
  await p.locator('.arena-revenge-panel214 .section-title button').click();
  await p.waitForFunction(()=>document.querySelector('.arena-revenge-list214')?.textContent.includes('手機復仇'));
  assert.equal(await p.locator('.arena-revenge-list214').evaluate(e=>e.style.getPropertyValue('overflow')),'');
  assert.deepEqual(errors,[]);
  console.log('PASS mobile refresh preserved; desktop inline styles do not leak; no script errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
