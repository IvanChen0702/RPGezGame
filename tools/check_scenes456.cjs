/* Local synthetic-state regression, no player or backend writes. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.GAME_TEST_URL||'http://127.0.0.1:8443/',out=process.env.SCENE_TEST_OUT||'/workspace/work/scenes456';fs.mkdirSync(out,{recursive:true});
async function setup(page,mode,sex='female'){
 await page.evaluate(({mode,sex})=>{
  document.getElementById('accountOverlay')?.remove();document.body.classList.remove('login-required-lock');initialEntryShown45_=true;state=defaultState();viewModePreference_=mode;applyViewMode_();
  localStorage.setItem(avatarPreferenceKey220_(),sex);
  state.base={hp:100000,patk:100,matk:100,def:30,crit:0,critDamage:100};state.currentHp=100000;
  const ids=['thalessiahead','timeMirrorArmor','chronosArcaneStaff'];
  state.inventory=ids.map((template,i)=>({id:'fixture-'+i,template,name:['瑟蕾絲提亞之帽','時鏡法衣','永劫魔杖'][i],slot:['head','armor','weapon'][i],rarity:'傳說',enhance:0,stats:{},gems:[]}));state.equipment={head:'fixture-0',armor:'fixture-1',weapon:'fixture-2',rings:[]};
  for(const it of state.inventory)itemTemplates[it.template]={...it};
  Object.assign(skillTemplates,{magicBurst:{id:'magicBurst',name:'魔力爆發',kind:'magicBurst',hits:2,mult:2,cd:0,type:'active'},heavenlyThunder:{id:'heavenlyThunder',name:'天雷制裁',kind:'heavenlyThunder',hits:3,mult:2,cd:0,type:'active'},magicMissileIII:{id:'magicMissileIII',name:'魔法彈III',kind:'magicMulti',hits:3,mult:.75,cd:0,type:'active'}});
  state.equippedSkills=['magicBurst','heavenlyThunder','magicMissileIII'];state.passive=[];
  window.newBattle454=()=>{state.page='battle';state.currentBattle={floor:1,enemyKey:'slime',enemyData:{name:'測試史萊姆',hp:100000,patk:20,matk:20,def:10,boss:false},playerHp:100000,enemyHp:100000,turn:1,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},arcaneStacks:0,arcaneCastMultiplier:1,phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false};state.battleVisual={phase:'等待玩家操作',detail:'',busy:false,actor:'player'};state.battleLog=[];render();};
 },{mode,sex});
}
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[],missing=[];try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===404)missing.push(r.url())});await p.route('**/*',r=>new URL(r.request().url()).hostname===new URL(url).hostname?r.continue():r.abort());await p.goto(url,{waitUntil:'networkidle'});await setup(p,'desktop');await p.evaluate(()=>{window.originalTheme456=battleTheme203_;battleTheme203_=()=>window.sceneKey456||originalTheme456();newBattle454();});
 const themes=await p.evaluate(()=>Object.keys(DESKTOP_SCENES456_));let checked=0;
 for(const [width,height]of [[1920,1080],[1280,720],[2560,1440],[3440,1440],[1024,768]]){
  await p.setViewportSize({width,height});
  for(const key of themes){
   await p.evaluate(async key=>{window.sceneKey456=key;await artImage203_('bg_desktop456_'+key,DESKTOP_SCENES456_[key].src).decode();},key);await p.waitForTimeout(70);
   const d=await p.evaluate(()=>{const r=pixelStage192_,q=r.background456.canvas,w=r.canvas.getBoundingClientRect().width/2,h=r.canvas.getBoundingClientRect().height/2,ground=pixelFloor203_(),im=backgroundImage203_(sceneKey456),f=DESKTOP_SCENES456_[sceneKey456].floorY,b=scenePlacement456_(im.naturalWidth,im.naturalHeight,Math.round(w),Math.round(h),ground,f);return {background:q.width*q.height,effects:r.canvas.width*r.canvas.height,connected:q.isConnected,layerCount:r.host.querySelectorAll('.pixel-background456').length,floorError:Math.abs(b.y+b.height*f-ground),covers:b.x<=.01&&b.y<=.01&&b.x+b.width>=Math.round(w)-.01&&b.y+b.height>=Math.round(h)-.01,source:im.naturalWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,anchors:[pixelAnchor192_('player').y,pixelAnchor192_('enemy').y,ground]}});
   assert(d.connected&&d.layerCount===1&&d.covers&&d.floorError<.01,JSON.stringify({key,width,d}));assert(d.background<4008000&&d.effects<1605000,'pixel budgets');assert(d.source>=1774);assert(!d.overflow,'overflow '+width);assert(d.anchors.every(y=>y===d.anchors[2]));checked++;
   if(width===1920)await p.locator('#battleStage').screenshot({path:path.join(out,'battle-'+key+'.png')});
  }
 }
 await p.evaluate(()=>{window.layerBefore456=pixelStage192_.background456.canvas;window.canvasBefore456=pixelStage192_.canvas;render();});await p.waitForTimeout(100);assert(await p.evaluate(()=>pixelStage192_.background456.canvas===layerBefore456&&pixelStage192_.canvas===canvasBefore456),'same battle retains layers');
 // Cold desktop backdrop failure must use the original scene, not a blank canvas.
 await p.route('**/main02-456.webp*',r=>r.abort());await p.evaluate(()=>{sceneKey456='main02';delete artCache203_.bg_desktop456_main02;DESKTOP_SCENES456_.main02.src+='?failed-test';});await p.waitForTimeout(350);assert(await p.evaluate(()=>backgroundImage203_('main02').naturalWidth===768),'background failure fallback');
 await setup(p,'mobile');await p.setViewportSize({width:390,height:844});await p.evaluate(()=>newBattle454());await p.waitForTimeout(150);assert(await p.evaluate(()=>!pixelStage192_.background456&&document.querySelectorAll('.pixel-background456').length===0),'mobile layer teardown');
 console.log('desktop scenes/floor/geometry',checked,'PASS; same battle cache, fallback and mobile transition PASS');
 // New mobile session never fetches desktop scene images.
 const m=await browser.newPage({viewport:{width:390,height:844},isMobile:true});const desktopRequests=[];await m.addInitScript(()=>localStorage.setItem('rpg_view_mode_v1','mobile'));m.on('request',r=>{if(r.url().includes('/battle/desktop/'))desktopRequests.push(r.url())});await m.route('**/*',r=>new URL(r.request().url()).hostname===new URL(url).hostname?r.continue():r.abort());await m.goto(url,{waitUntil:'networkidle'});await setup(m,'mobile');await m.evaluate(()=>newBattle454());await m.waitForTimeout(250);assert.equal(desktopRequests.length,0);await m.close();
 const retina=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:2});
 await retina.route('**/*',r=>new URL(r.request().url()).hostname===new URL(url).hostname?r.continue():r.abort());await retina.goto(url,{waitUntil:'networkidle'});await setup(retina,'desktop');await retina.evaluate(()=>newBattle454());await retina.waitForTimeout(250);
 const budgets=await retina.evaluate(()=>({bg:pixelStage192_.background456.canvas.width*pixelStage192_.background456.canvas.height,fx:pixelStage192_.canvas.width*pixelStage192_.canvas.height}));assert(budgets.bg>budgets.fx&&budgets.bg<4008000&&budgets.fx<1605000);await retina.close();console.log('DPR 2 separate background/effects budgets PASS',budgets);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('no desktop background fetch on mobile; no runtime errors/404 PASS');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
