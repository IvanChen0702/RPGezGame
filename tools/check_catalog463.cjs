// No live writes. Optional UI smoke: CATALOG_BOOTSTRAP=/path/to/public-bootstrap.json
// Serve the repository on 127.0.0.1:8443 before running the optional browser checks.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const extract=name=>{const a=html.indexOf('function '+name+'('),b=html.indexOf('\n}',a);assert(a>=0&&b>a,name);return html.slice(a,b+2);};
const ctx={onlineStages:{1:{enemyId:'enemy'},2:{enemyId:'enemy',enabled:false}},enemyTemplates:{enemy:{name:'守衛',drops:['shared'],boss:true,bossGem:'gem'}},dungeonTimeLabel_:()=> '常駐副本',escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),escapeAttr:s=>String(s).replace(/"/g,'&quot;')};
vm.createContext(ctx);vm.runInContext(['catalogSourceIndex463_','catalogSources463_','catalogSourceHtml463_','catalogSourceActions463_','boxingRankRewards106_'].map(extract).join('\n'),ctx);
const data={Equipment:[{ItemID:'shortSword'}],ShopEntries:[{ContentID:'shared',ContentType:'equipment',Price:123,UnlockFloor:5},{ContentID:'box',ContentType:'consumable',UnlockFloor:10},{ContentID:'disabled',ContentType:'equipment',Enabled:false}],GiftBoxes:[{BoxID:'box',Name:'測試寶盒'},{BoxID:'off',Enabled:false}],GiftBoxTiers:[{BoxID:'box',TierID:'top',Name:'頭獎',Probability:.1},{BoxID:'off',TierID:'top',Probability:.99}],GiftBoxRewards:[{BoxID:'box',TierID:'top',ContentType:'EQUIPMENT',ContentIDs:'shared, other',Sockets:2,Weight:1},{BoxID:'box',TierID:'top',ContentType:'GEM',ContentIDs:'gem',Weight:1},{BoxID:'box',TierID:'missing',ContentType:'EQUIPMENT',ContentIDs:'bad',Weight:1},{BoxID:'off',TierID:'top',ContentType:'EQUIPMENT',ContentIDs:'disabled',Weight:1},{BoxID:'box',TierID:'top',ContentType:'EQUIPMENT',ContentIDs:'zero',Weight:0}],DungeonBosses:[{BossID:'boss',Name:'副本王',RewardEquipmentID:'shared'}],DungeonDifficulties:[{BossID:'boss',Difficulty:'easy',DropRate:.01},{BossID:'boss',Difficulty:'hard',DropRate:.1},{BossID:'boss',Difficulty:'normal',DropRate:.03,Enabled:false}],WorldBossPool:[{BossID:'world',Name:'世界王',RewardGemID:'gem',Weight:1}],RelicPools:[{PoolType:'BOSS_EQUIPMENT',ContentID:'shared',Enabled:true},{PoolType:'EQUIPMENT',ContentID:'disabled',Enabled:false}],Achievements:[{AchievementID:'achievement',Name:'打倒守衛',Description:'擊敗守衛十次',RewardType:'equipment',RewardID:'shared'},{AchievementID:'login',Name:'第七天',ConditionType:'cumulative_login',TargetValue:7,RewardType:'裝備',RewardID:'login'},{AchievementID:'recurring',ConditionType:'recurring_login',TargetValue:2,RewardType:'equipment',RewardID:'repeat'}],Quests:[{QuestID:'quest',Name:'同伴任務'}],QuestRewards:[{QuestID:'quest',Type:'EQUIPMENT',ContentID:'questItem',Timing:'complete',ChoiceGroup:'pick'}],ArenaRewards:[{EquipmentID:'arenaItem',RankMin:1,RankMax:3}],BoxingSeasons_SCHEMA:[{SeasonID:'invalid',Rank1RewardQuantity:-1,Rank1RewardType:'EQUIPMENT'}],ExtremeStageRewards:[{RewardType:'EQUIPMENT',RewardID:'extremeItem',Stage:10}],RedeemCodeRewards_SCHEMA:[{ContentType:'EQUIPMENT',ContentID:'privateItem',Code:'must-not-leak'}]};
const index=ctx.catalogSourceIndex463_(data),get=(id,kind='EQUIPMENT')=>ctx.catalogSources463_(kind,id,index);
assert.equal(get('shared').length,6,'all six overlapping sources retained');
assert(!index.has('EQUIPMENT:disabled'));assert(!index.has('EQUIPMENT:bad'));assert(!index.has('EQUIPMENT:zero'));assert(!index.has('EQUIPMENT:privateItem'));
assert(get('other').some(s=>s.label.includes('測試寶盒')&&s.detail.includes('10%')&&s.detail.includes('非單件機率')));
assert(get('shared').find(s=>s.route==='dungeon').detail.includes('簡單 1%／困難 10%'));
assert.equal(get('login')[0].label,'新玩家每日登入');assert(get('login')[0].detail.includes('第 7 天'));assert.equal(get('login')[0].route,'');
assert.equal(get('repeat')[0].label,'常駐累積登入');assert.equal(get('shortSword')[0].label,'新角色初始裝備');
assert.equal(get('gem','GEM').find(s=>s.label.includes('世界王')).route,'');
assert(get('questItem')[0].detail.includes('擇一'));assert(get('unknown')[0].detail.includes('未列出'));
const actions=ctx.catalogSourceActions463_(get('shared'));assert.equal((actions.match(/前往商店/g)||[]).length,1);assert(actions.includes('進副本大廳'));assert(actions.includes('前往遺物探險'));assert(!actions.includes('成就'));
assert(ctx.catalogSourceHtml463_([{label:'<img src=x onerror=alert(1)>',detail:'<script>x</script>'}]).includes('&lt;img'));
const updated=structuredClone(data);updated.ShopEntries[0].Enabled=false;assert(!ctx.catalogSources463_('EQUIPMENT','shared',ctx.catalogSourceIndex463_(updated)).some(s=>s.label==='商店購買'),'new planning reflected without stale cache');
console.log('PASS source joins, multiple sources, enabled/zero filters, tier identity, login, private-code isolation, escaping, deduplicated routes and planning refresh');

if(process.env.CATALOG_BOOTSTRAP)(async()=>{
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const boot=JSON.parse(fs.readFileSync(process.env.CATALOG_BOOTSTRAP,'utf8')).data;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
  await page.evaluate(boot=>{bootstrapDataCache=boot;installPlanning412_(boot);state=defaultState();state.maxCleared=65;initialEntryShown45_=true;loginRequiredActive_=()=>false;save=()=>{};document.getElementById('accountOverlay')?.remove();document.body.classList.remove('login-required-lock');window.toast463=[];toast=s=>toast463.push(s);},boot);
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});
   for(const mode of ['list','grid']){
    await page.evaluate(({width,mode})=>{closeModal();if(townWindow311_)closeTownWindow311_(false);state.page='catalog';viewModePreference_=width<768?'mobile':'desktop';applyViewMode_();localStorage.setItem('rpg_view204_catalog',mode);render();},{width,mode});
    await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-catalog-equipment463]').count(),boot.Equipment.filter(r=>r.Name&&r.ItemID!=='gmSword').length);
    const card=page.locator('[data-catalog-equipment463="luckyWeapon1"]');
    if(mode==='grid')await card.locator('..').locator('..').click();
    const detail=mode==='grid'?page.locator('#modalBody'):card;assert((await detail.textContent()).includes('寶盒抽取'));
    assert(await detail.getByRole('button',{name:'前往商店',exact:true}).count());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+width);
    if(process.env.CATALOG_SCREENSHOTS)await page.screenshot({path:process.env.CATALOG_SCREENSHOTS+'/catalog-'+width+'-'+mode+'.png'});
    await detail.getByRole('button',{name:'前往商店',exact:true}).click();
    assert.equal(await page.evaluate(()=>state.page),'shop');assert.equal(await page.evaluate(()=>state.shopTab),'utility');assert.equal(await page.evaluate(()=>shopConsumableSubTab_),'gift');
    assert.equal(await page.locator('#modal.open').count(),0);
    console.log('PASS browser',width,mode,'box → shop gift tab');
   }
  }
  console.log(await page.evaluate(async()=>{
   closeModal();if(townWindow311_)closeTownWindow311_(false);state.page='catalog';state.currentBattle={won:false,lost:false};await catalogTravel463_('shop');if(state.page!=='catalog')throw Error('escaped battle');state.currentBattle=null;
   state.maxCleared=0;await catalogTravel463_('dungeon');if(state.page!=='catalog')throw Error('bypassed dungeon unlock');await catalogTravel463_('relic');if(state.page!=='catalog')throw Error('bypassed relic unlock');
   state.maxCleared=65;window.entryCalls463=[];const dungeon=openDungeonLobby25_,relic=openRelic144_;openDungeonLobby25_=async()=>entryCalls463.push('dungeon');openRelic144_=async()=>entryCalls463.push('relic');await catalogTravel463_('dungeon');await catalogTravel463_('relic');openDungeonLobby25_=dungeon;openRelic144_=relic;if(entryCalls463.join(',')!=='dungeon,relic')throw Error('incorrect entry handlers');
   return 'PASS battle/unlock guards and existing dungeon/relic entry handlers';
  }));
  console.log(await page.evaluate(async()=>{
   // Keep the actual entry/render functions; isolate only planning download and relic HTTP I/O.
   downloadCheckedGameData_=async()=>true;bootstrapLoadPromise=null;characterStartupPromise_=null;relicRequest144_=async()=>({ok:true,run:null});
   viewModePreference_='desktop';applyViewMode_();state.maxCleared=65;state.page='town';render();openTownPage396_('catalog');
   await catalogTravel463_('dungeon');if(state.page!=='dungeon'||dungeonStep25_!==1||townWindow311_||document.querySelector('#townWindow311'))throw Error('dungeon lobby did not replace catalog window');
   state.page='town';render();openTownPage396_('catalog');await catalogTravel463_('relic');if(state.page!=='relic'||townWindow311_||document.querySelector('#townWindow311'))throw Error('relic entry did not replace catalog window');
   state.page='catalog';render();const world=(bootstrapDataCache.WorldBossPool||[]).find(r=>r.RewardGemID);openCatalogGem39_(world.RewardGemID);if(!document.getElementById('modalBody').textContent.includes(world.Name))throw Error('missing world boss name');if([...document.querySelectorAll('#modalBody button')].some(b=>/世界.*BOSS|討伐/.test(b.textContent)))throw Error('world boss should be text only');closeModal();
   return 'PASS real dungeon/relic screens, desktop overlay cleanup, world boss gem detail';
  }));
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
