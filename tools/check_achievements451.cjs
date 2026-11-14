// Serve the repository at 127.0.0.1:8443. Synthetic data; no account or reward API calls.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const safari=process.env.BROWSER==='webkit';
 const browser=await (safari?webkit.launch():chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}));
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:safari?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'});
  const errors=[],diagnostics=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('achievement tab switch failed'))diagnostics.push(m.text());});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
  await p.evaluate(()=>{
   document.querySelectorAll('#accountOverlay,#bootLoading279,#initialEntry45').forEach(e=>e.remove());document.body.classList.remove('login-required-lock');
   state=defaultState();state.page='town';state.level=5;initialEntryShown45_=true;
   cloudMeta={accountId:'fixture-account',sessionToken:'fixture-token'};isCloudLoggedIn=()=>true;save=()=>{};toast=t=>window.lastToast451=t;
   viewModePreference_='auto';applyViewMode_();
   window.rows451=achievementCategories94_.flatMap(([type])=>Array.from({length:30},(_,i)=>({AchievementID:type+'-'+i,Name:type+' fixture '+i,Description:'合成成就資料',ConditionType:type,TargetID:'slime',TargetValue:i+1,RewardType:'gold',RewardAmount:10})));
   state.claimedAchievements={'level-0':true};applyAchievementRows_(rows451);render();openTownAchievements311_();
   window.remember451=()=>{const panel=document.querySelector('#page .achievement-panel94');window.nodes451={panel,grid:panel.querySelector('.achievement-grid'),tabs:panel.querySelector('.achievement-tabs94'),buttons:[...panel.querySelectorAll('[role=tab]')],wrapper:panel.parentElement};};remember451();
  });
  // Ignore the known initial town ResizeObserver notification; category tests start here.
  await p.waitForTimeout(150);const initialResizeWarnings=errors.filter(x=>x.startsWith('ResizeObserver loop')).length;errors.length=0;
  for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
   await p.setViewportSize(size);await p.waitForTimeout(150);await p.evaluate(()=>remember451());
   for(const category of ['max_clear','enemy_kill','perfect_clear','max_round_damage','other','level']){
    await p.evaluate(()=>{nodes451.grid.scrollTop=nodes451.grid.scrollHeight;});
    await p.locator(`[data-achievement-tab451="${category}"]`).tap();
    const result=await p.evaluate(()=>{
     const panel=document.querySelector('#page .achievement-panel94'),grid=panel.querySelector('.achievement-grid'),tabs=panel.querySelector('.achievement-tabs94'),r=grid.getBoundingClientRect();
     return {category:achievementCategory94_,samePanel:panel===nodes451.panel,sameGrid:grid===nodes451.grid,sameTabs:tabs===nodes451.tabs,sameWrapper:panel.parentElement===nodes451.wrapper,sameButtons:nodes451.buttons.every(b=>b.isConnected),selected:tabs.querySelector('[aria-selected=true]')?.dataset.achievementTab451,cards:grid.children.length,first:grid.textContent.slice(0,80),top:grid.scrollTop,height:r.height,bottom:r.bottom,screen:innerHeight,overflow:grid.scrollWidth-grid.clientWidth,count:document.getElementById('townAchievementCount313').textContent};
    });
    assert.equal(result.category,category);assert.equal(result.selected,category);
    for(const key of ['samePanel','sameGrid','sameTabs','sameWrapper','sameButtons'])assert.equal(result[key],true,key);
    assert.equal(result.cards,30);assert.match(result.first,new RegExp(category+' fixture 0'));assert.equal(result.top,0);
    assert.ok(result.height>80&&result.bottom<=result.screen+1,JSON.stringify(result));assert.ok(result.overflow<=1);assert.equal(result.count,'30 / 180 項');
   }
   console.log('PASS touch tabs, stable nodes, long-list reset and visible content',size.width,size.height);
  }
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(150);
  await p.evaluate(()=>{const button=document.querySelector('[data-achievement-tab451="enemy_kill"]');button.focus();selectAchievementCategory94_('enemy_kill');if(document.activeElement!==button)throw Error('tab focus lost');});
  await p.evaluate(()=>{applyAchievementRows_([]);selectAchievementCategory94_('level');});
  assert.match(await p.locator('.achievement-grid').innerText(),/尚未設定/);assert.equal(await p.locator('[role=tab]').count(),5);
  assert.equal(await p.locator('#townAchievementCount313').innerText(),'0 / 0 項');
  await p.evaluate(()=>{applyAchievementRows_(rows451);selectAchievementCategory94_('other');});
  assert.equal(await p.locator('[role=tab]').count(),6);
  await p.evaluate(()=>{applyAchievementRows_(rows451.filter(r=>r.ConditionType!=='other'));selectAchievementCategory94_('other');});
  assert.equal(await p.locator('[aria-selected=true]').getAttribute('data-achievement-tab451'),'level');
  assert.equal(await p.locator('[role=tab]').count(),5);
  console.log('PASS empty planning, data update, removed category fallback and focus');

  await p.evaluate(()=>{
   window.realAchievements451=renderAchievements;window.before451=document.querySelector('.achievement-grid').innerHTML;
   renderAchievements=()=>{throw new TypeError('synthetic row failure');};selectAchievementCategory94_('enemy_kill');
  });
  assert.equal(await p.evaluate(()=>document.querySelector('.achievement-grid').innerHTML===before451),true);
  assert.equal(await p.evaluate(()=>achievementCategory94_),'level');
  assert.match(await p.locator('.achievement-error451').innerText(),/保留原畫面/);
  assert.equal(diagnostics.length,1);assert.ok(!diagnostics[0].includes('fixture-account')&&!diagnostics[0].includes('fixture-token'));
  await p.evaluate(()=>{renderAchievements=realAchievements451;selectAchievementCategory94_('enemy_kill');});
  assert.equal(await p.locator('.achievement-error451').count(),0);
  console.log('PASS failed rendering preserves current content and selection; retry recovers');

  await p.evaluate(()=>{selectAchievementCategory94_('level');claimAchievement_=(id,button)=>window.claim451={id,connected:button.isConnected};});
  await p.locator('#achievementClaim_level-1').tap();
  assert.deepEqual(await p.evaluate(()=>claim451),{id:'level-1',connected:true});
  assert.equal(await p.locator('.achievement-summary320 b').allTextContents().then(x=>x.join(',')),'1,4,25');
  await p.evaluate(()=>{closeTownWindow311_();window.categoryBefore451=achievementCategory94_;selectAchievementCategory94_('enemy_kill');});
  assert.equal(await p.evaluate(()=>state.page),'town');assert.equal(await p.evaluate(()=>achievementCategory94_===categoryBefore451),true);
  await p.evaluate(()=>openTownAchievements311_());assert.equal(await p.locator('.achievement-card').count(),30);
  console.log('PASS reward IDs/counts, closed-window events ignored and reopening');

  await p.setViewportSize({width:1440,height:900});
  await p.evaluate(()=>{viewModePreference_='desktop';applyViewMode_();render();remember451();});
  await p.locator('[data-achievement-tab451="enemy_kill"]').click();
  assert.match(await p.locator('.achievement-hero407 h3').innerText(),/討伐次數/);
  assert.equal(await p.evaluate(()=>nodes451.grid===document.querySelector('.achievement-grid')),true);
  assert.ok((await p.locator('.achievement-grid').boundingBox()).height>0);
  assert.deepEqual(errors,[]);
  console.log('PASS desktop; no category-switch script errors. Initial town ResizeObserver notices:',initialResizeWarnings);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
