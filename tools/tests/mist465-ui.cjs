const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const out='/workspace/work/mist465-preview';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
for(const [view,width,height] of [['desktop',1440,1000],['mobile',390,844],['mobile',360,780]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url())});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'mist465-preview-fixture.js'),'utf8')});
 await page.evaluate(({data,view})=>installMistPreview465(data,view),{data:JSON.parse(fs.readFileSync('/workspace/work/catalog463-bootstrap.json','utf8')),view});
 for(const tab of ['entry','map','bag','ranking','reports']){
  await page.evaluate(t=>mistTab465_(t),tab);await page.waitForTimeout(150);
  const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,tiles:document.querySelectorAll('.mist-cell465').length,bad:[...document.querySelectorAll('.mist465 img')].filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src)}));
  assert.ok(geometry.scroll<=width+2,'page horizontal overflow: '+JSON.stringify({view,width,tab,geometry}));assert.deepEqual(geometry.bad,[],'missing art');
  if(tab==='map'){assert.equal(geometry.tiles,256);await page.getByRole('button',{name:'5,7 你的位置',exact:true}).click();assert.equal(await page.locator('.mist-cell465.selected').count(),1);await page.evaluate(()=>mistSelect465_(5,6));const dims=await page.locator('.mist-cell465').first().boundingBox();assert.ok(Math.abs(dims.width-dims.height)<1,'map tiles must stay square');}
  if(width!==360)await page.screenshot({path:path.join(out,view+'-'+tab+'.png'),fullPage:true});
 }
 assert.deepEqual(errors,[],'runtime errors');assert.deepEqual(missing,[],'404 assets');
 // Preview must never mutate formal player or send actions.
 assert.equal(await page.evaluate(async()=>{const before=JSON.stringify(state);await mistCommand465_('hide');return JSON.stringify(state)===before;}),true);
 // Closing/reopening locked mode never bypasses main progress.
 assert.equal(await page.evaluate(()=>{state.maxCleared=0;return modeUnlockFloor258_('mist')===1&&!modeUnlocked258_('mist');}),true);
 assert.equal(await page.evaluate(async()=>{planningReady412_=()=>true;onlineGameConfig.ArenaUnlockFloor=5;state.maxCleared=1;mist465_.preview=false;mist465_.data={ok:true,ready:false,self:null};render=previewOriginalRender465;apiPost=async()=>({ok:true,ready:false,self:null,message:'戰境準備中'});await openMist465_();return state.page==='mist'&&!!document.querySelector('.mist465')&&modeUnlocked258_('mist')&&!modeUnlocked258_('arena')&&battleModeCards349_('arena').length===3&&!lobby402_().includes('undefined');}),true,'actual render, entrance and level 1 unlock');
 assert.deepEqual(errors,[],'actual render errors');
 await page.close();console.log(view,width,'passed');
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
