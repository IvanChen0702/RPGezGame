/* Local UI regression. Relic requests are fixture responses; no live accounts or writes. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.GAME_TEST_URL||'http://127.0.0.1:8443/',out=process.env.RELIC_TEST_OUT||'/workspace/work/relic455';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];
try{for(const [mode,width,height]of [['mobile',390,844],['mobile',320,568],['mobile',844,390],['desktop',1440,900]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:mode==='mobile'});p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).hostname===new URL(url).hostname?r.continue():r.abort());await p.goto(url,{waitUntil:'networkidle'});
 await p.evaluate(mode=>{
  document.getElementById('accountOverlay')?.remove();document.body.classList.remove('login-required-lock');initialEntryShown45_=true;viewModePreference_=mode;applyViewMode_();state=defaultState();state.page='relic';state.level=100;state.base={hp:1000,patk:100,matk:100,def:30,crit:0,critDamage:100};
  const key=Object.keys(ENEMY_ART_MAP202_).find(k=>k.startsWith('relic_')),enemy={id:key.replace(/^relic_/,''),name:ENEMY_ART_MAP202_[key].name,hp:100,patk:10,matk:10,def:10,skill:'測試守衛：生命與技能 CD 跨場保留。'};
  relicRun144_={id:'fixture455',seq:1,floor:1,cleared:50,phase:'ready',hp:800,curses:[],loot:[],skills:[],passive:[],cooldowns:{},enemies:Object.fromEntries(Array.from({length:10},(_,i)=>[i+1,{...enemy}]))};relicAvailable144_=true;relicAccount144_=cloudMeta.accountId;entryPhase228_('relic','ready');render();
  window.calls455=[];
  relicRequest144_=async(action,payload={})=>{calls455.push({action,payload});const r=relicRun144_;
   if(action==='advance'){r.floor++;r.phase='ready';}
   if(action==='camp'){r.hp=Math.min(1000,r.hp+300);r.phase='between';}
   if(action==='retreat'){r.closed=true;r.phase='completed';}
   if(action==='battle'){r.phase='battle';r.combat={relic144:true,floor:r.floor,enemyKey:r.enemies[r.floor].id,enemyData:{...r.enemies[r.floor],scaleMultiplier:1},playerHp:r.hp,enemyHp:100,turn:1,_turnStartGemTurn:1,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},arcaneStacks:0,arcaneCastMultiplier:1,phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false};}
   return {ok:true,run:r};
  };
 },mode);
 await p.evaluate(async()=>{const before=JSON.stringify(relicRun144_);await relicResume144_();if(before!==JSON.stringify(relicRun144_))throw Error('preview changed run');});
 const root=p.locator('#relicOverlay144');await root.waitFor();
 if(mode==='mobile')assert.equal(await root.locator('[data-relic-eyebrow455]').innerText(),'下一場遭遇');
 await p.evaluate(()=>{const root=document.querySelector('#relicOverlay144'),before=root.querySelector('header').innerHTML;relicSkin429_(root);relicSkin429_(root);if(root.querySelector('header').innerHTML!==before)throw Error('repeated skin changed preview');});
 const geometry=await root.evaluate(el=>{const card=el.querySelector('.relic-card144'),footer=el.querySelector('.relic-actions144'),r=card.getBoundingClientRect(),f=footer.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,footerBottom:f.bottom,overflow:card.scrollWidth>card.clientWidth+1};});assert(geometry.x>=0&&geometry.right<=width+1&&geometry.y>=0&&geometry.bottom<=height+1,JSON.stringify(geometry));assert(!geometry.overflow,JSON.stringify(geometry));assert(geometry.footerBottom<=height+1);
 await p.screenshot({path:path.join(out,`preview-${mode}-${width}.png`)});
 // Enter preparation then cancel: return to the same encounter without changing the run.
 await root.locator('.relic-actions144 .primary').click();await p.locator('#readyRoom24').waitFor();await p.evaluate(()=>cancelReadyRoom24_());await root.waitFor();await p.waitForFunction(()=>!relicUiBusy149_);
 if(mode==='mobile')assert.equal(await root.locator('[data-relic-eyebrow455]').innerText(),'下一場遭遇');
 // Save and resume keeps HP/floor; the server boundary is recorded, never bypassed in production.
 await root.getByRole('button',{name:'保存並離開',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#relicOverlay144')&&!relicUiBusy149_);
 assert.deepEqual(await p.evaluate(()=>[relicRun144_.hp,relicRun144_.floor,calls455.at(-1).action]),[800,1,'equip']);
 await p.evaluate(()=>relicResume144_());await root.waitFor();await root.locator('.relic-actions144 .primary').click();await p.waitForFunction(()=>readyRoom24_&&!readyRoom24_.assetsLoading228);await p.locator('#readyEnter24').click();await p.waitForFunction(()=>state.page==='battle'&&!readyRoom24_&&!relicUiBusy149_);
 assert.deepEqual(await p.evaluate(()=>[state.currentBattle.relic144,state.currentBattle.playerHp,calls455.filter(x=>x.action==='battle').length]),[true,800,1]);
 await p.evaluate(async()=>{const n=calls455.length;await relicRetreat144_();if(calls455.length!==n)throw Error('retreat sent in battle');document.querySelector('.ui-confirm-overlay')?.remove();});
 await p.evaluate(async()=>{await relicRecover144_();if(state.page!=='battle'||state.currentBattle.playerHp!==800)throw Error('battle recovery');state.currentBattle=null;state.page='relic';relicRun144_.phase='between';await relicContinue144_();});
 await root.getByRole('button',{name:'繼續深入',exact:true}).click();await p.waitForFunction(()=>relicRun144_.floor===2&&!relicUiBusy149_);assert.equal(await root.locator('h2').innerText(),mode==='mobile'?'第2層｜'+await p.evaluate(()=>relicRun144_.enemies[2].name):'遺物探險｜第2層');
 // Supply and clean exit remain reachable with the common header skin.
 await p.evaluate(()=>{relicRun144_.phase='camp';return relicContinue144_();});await root.locator('.r429-heal').click();await p.waitForFunction(()=>relicRun144_.phase==='between'&&!relicUiBusy149_);assert.equal(await p.evaluate(()=>relicRun144_.hp),1000);
 await root.locator('.relic-action-exit152').click();await p.waitForFunction(()=>relicRun144_.closed&&!relicUiBusy149_);assert.equal(await root.locator('h2').innerText(),'成功撤離');
 console.log(mode,width+'x'+height,'preview/re-skin/layout/preparation/cancel/save/resume/battle/recover/advance/camp/retreat PASS');await p.close();
 }assert.deepEqual(errors,[]);console.log('No page errors; all external requests blocked.');}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
