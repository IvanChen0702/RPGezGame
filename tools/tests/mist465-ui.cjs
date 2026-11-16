const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const out='/workspace/work/mist465-preview';fs.mkdirSync(out,{recursive:true});
const engine=process.env.BROWSER==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit.launch({headless:true}):chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}));
try{
for(const [view,width,height] of [['desktop',1440,900],['desktop',1366,650],['mobile',390,844],['mobile',360,640],['mobile',844,390],['mobile',768,1024]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:view==='mobile'});const errors=[],missing=[],setupWarnings=[];let settingUp=true;
 // WebKit emits this observer warning while the fixture switches desktop to mobile;
 // reproduced unchanged on main 5959063. Keep interaction-time errors fatal.
 page.on('pageerror',e=>{if(settingUp&&e.message==='ResizeObserver loop completed with undelivered notifications.')setupWarnings.push(e.message);else errors.push(e.message);});page.on('response',r=>{if(r.status()===404)missing.push(r.url())});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'mist465-preview-fixture.js'),'utf8')});
 await page.evaluate(({data,view})=>installMistPreview465(data,view),{data:JSON.parse(fs.readFileSync('/workspace/work/catalog463-bootstrap.json','utf8')),view});
 await page.evaluate(()=>{planningReady412_=()=>true;render=previewOriginalRender465;render();});
 await page.waitForTimeout(200);settingUp=false;
 const wrapper=await page.locator('#page>.viewport-screen').elementHandle();
 for(const tab of ['entry','map','bag','ranking','reports']){
  await page.evaluate(t=>mistTab465_(t),tab);await page.waitForTimeout(150);
  const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,tiles:document.querySelectorAll('.mist-cell465').length,bad:[...document.querySelectorAll('.mist465 img')].filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src)}));
  assert.ok(geometry.scroll<=width+2,'page horizontal overflow: '+JSON.stringify({view,width,tab,geometry}));assert.deepEqual(geometry.bad,[],'missing art');
  if(tab==='map'){assert.equal(geometry.tiles,256);await page.getByRole('button',{name:'5,7 你的位置',exact:true}).click();assert.equal(await page.locator('#mistPrep474 [role="dialog"]').count(),1);await page.getByRole('button',{name:'關閉整備',exact:true}).click();await page.evaluate(()=>mistSelect465_(5,6));const dims=await page.locator('.mist-cell465').first().boundingBox();assert.ok(Math.abs(dims.width-dims.height)<1,'map tiles must stay square');}
  if(width!==360)await page.screenshot({path:path.join(out,view+'-'+tab+'.png'),fullPage:true});
 }
 // Exercise the real render wrapper and async redraw, not only raw preview HTML.
 await page.evaluate(()=>{mist465_.preview=false;mistTab465_('entry');});
 await page.locator('.mist465 summary').click();
 const panel=page.locator('#mistPanel465');
 const scrollState=await panel.evaluate(e=>{e.scrollTop=e.scrollHeight;return {top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight,overflow:getComputedStyle(e).overflowY};});
 assert.equal(scrollState.overflow,'auto');
 if(scrollState.total>scrollState.height+1)assert.ok(scrollState.top>0,'expanded rules reachable');
 await page.evaluate(async()=>{mist465_.preview=false;apiPost=async()=>previewMistData465;await refreshMist465_();});
 assert.equal(await wrapper.evaluate(e=>e.isConnected),true,'status refresh must retain scroll wrapper');
 assert.equal(await page.locator('.mist465 details').evaluate(e=>e.open),true,'refresh retains expanded rules');
 assert.ok(Math.abs(await panel.evaluate(e=>e.scrollTop)-scrollState.top)<2,'refresh retains reading position');
 await page.getByRole('tab',{name:'戰報',exact:true}).click();
 assert.equal(await panel.evaluate(e=>e.scrollTop),0,'new tab starts at top');
 // Long lists must scroll within the panel, above the persistent navigation.
 await page.evaluate(()=>{mist465_.data={...previewMistData465,reports:Array.from({length:35},(_,i)=>({...previewMistData465.reports[0],title:'戰報 '+i}))};mistDraw465_();});
 await panel.hover();
 if(engine==='chromium'){await page.mouse.wheel(0,600);await page.waitForTimeout(100);assert.ok(await panel.evaluate(e=>e.scrollTop)>0,'mouse wheel scrolls content');}
 if(engine==='chromium'&&view==='mobile'){
  await panel.evaluate(e=>{e.scrollTop=0;});const r=await panel.boundingBox(),client=await page.context().newCDPSession(page);
  const x=r.x+r.width/2,start=r.y+r.height-25,distance=Math.min(160,r.height-50);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});
  for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start-distance*i/8}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
  assert.ok(await panel.evaluate(e=>e.scrollTop)>0,'finger swipe scrolls content');await client.detach();
 }
 await panel.evaluate(e=>{e.scrollTop=e.scrollHeight;});
 const lastReport=await page.locator('.mist-report465').last().boundingBox(),panelBox=await panel.boundingBox();
 assert.ok(lastReport.y+lastReport.height<=panelBox.y+panelBox.height+1,'last report is not clipped');
 const bounds=await page.evaluate(()=>{const root=document.querySelector('.mist465').getBoundingClientRect(),nav=document.querySelector('#mainNav');return {bottom:root.bottom,limit:document.documentElement.classList.contains('mobile-ui')?nav.getBoundingClientRect().top:innerHeight};});
 assert.ok(bounds.bottom<=bounds.limit+1,'content stays above navigation');
 await page.evaluate(()=>{mist465_.data=previewMistData465;mist465_.preview=true;});
 assert.deepEqual(errors,[],'runtime errors');assert.deepEqual(missing,[],'404 assets');
 // Preview must never mutate formal player or send actions.
 assert.equal(await page.evaluate(async()=>{const before=JSON.stringify(state);await mistCommand465_('hide');return JSON.stringify(state)===before;}),true);
 if(await page.locator('#uiAlertOk').count())await page.locator('#uiAlertOk').click();
 // Closing/reopening locked mode never bypasses main progress.
 assert.equal(await page.evaluate(()=>{state.maxCleared=0;return modeUnlockFloor258_('mist')===1&&!modeUnlocked258_('mist');}),true);
 assert.equal(await page.evaluate(async()=>{planningReady412_=()=>true;onlineGameConfig.ArenaUnlockFloor=5;state.maxCleared=1;mist465_.preview=false;mist465_.data={ok:true,ready:false,self:null};render=previewOriginalRender465;apiPost=async()=>({ok:true,ready:false,self:null,message:'戰境準備中'});await openMist465_();return state.page==='mist'&&!!document.querySelector('.mist465')&&modeUnlocked258_('mist')&&!modeUnlocked258_('arena')&&battleModeCards349_('arena').length===3&&!lobby402_().includes('undefined');}),true,'actual render, entrance and level 1 unlock');
 assert.deepEqual(errors,[],'actual render errors');
 // Actual competitive category: three equal horizontal cards, a single parent scroller.
 if(view==='mobile'){
  await page.evaluate(()=>{state.page='combatHub';mobilePrepareModeTab_='arena';render();});
  const cards=page.locator('.mode-grid349 .mode-card349');assert.equal(await cards.count(),3);
  const boxes=await cards.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  assert.ok(boxes.every(r=>Math.abs(r.x-boxes[0].x)<1&&Math.abs(r.w-boxes[0].w)<1&&r.h===150),'cards use equal full-width rows');
  assert.ok(boxes[1].y>=boxes[0].y+boxes[0].h&&boxes[2].y>=boxes[1].y+boxes[1].h,'cards never overlap');
  await cards.last().scrollIntoViewIfNeeded();
  const hit=await cards.last().evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});assert.ok(hit,'last entry reachable and clickable');
  await page.screenshot({path:path.join(out,engine+'-'+width+'x'+height+'-entrances.png')});
  await page.locator('.mode-mist349').click();await page.waitForTimeout(100);
  assert.equal(await page.locator('#page>.viewport-screen>.mist465').count(),1,'entrance keeps wrapper after async status');
 }
 assert.deepEqual(errors,[],'interaction errors');
 await page.close();console.log(engine,view,width,height,'passed',setupWarnings.length?'(existing fixture resize warning)':'');
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
