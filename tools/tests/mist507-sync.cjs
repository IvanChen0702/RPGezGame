const fs=require('fs'),assert=require('assert/strict');
const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));try{
const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
for(const view of ['desktop','mobile']){
 const p=await browser.newPage({viewport:view==='desktop'?{width:1280,height:720}:{width:390,height:844}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>{if(new URL(r.request().url()).hostname!=='127.0.0.1')return r.abort();if(process.env.BASELINE&&r.request().isNavigationRequest())return r.fulfill({contentType:'text/html',body:require('child_process').execFileSync('git',['show','origin/main:index.html'],{maxBuffer:16*1024*1024})});return r.continue()});
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({data,view})=>{installMistPreview465({data},view);loginRequiredActive_=()=>false;applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);planningReady412_=()=>true;render=previewOriginalRender465;mist465_.preview=false;mist465_.tab='map';mist465_.data.starter=null;mist465_.data.chestReveals471=[];mist465_.data.cells=mist465_.data.cells.filter(c=>c.object?.kind!=='chest');render();window.good507=structuredClone(mist465_.data);window.calls507=[];
 // Exercise the real JSON transport: ok:false rejects instead of returning a result.
 window.fetch=async(url,options)=>{calls507.push(JSON.parse(options.body));return new Response(JSON.stringify({ok:false,error:'MIST_TARGET_BUSY'}),{status:200})};apiPost=(action,payload)=>supabaseJson_('/functions/v1/game-api',{action,...payload});
 },{data,view});
 await p.evaluate(()=>mistCommand465_('battle/start',{targetId:'preview-wolf'}));
 assert(await p.evaluate(()=>!mist465_.pending&&!mist465_.loading),'explicit rejection must unlock the board');assert.match(await p.locator('.mist-error465').innerText(),/正在交戰/);
 // A server retry response retains the same operation, unlike a definitive rejection.
 await p.evaluate(async()=>{fetch=async()=>new Response(JSON.stringify({ok:false,error:'MIST_RETRY'}),{status:200});await mistCommand465_('battle/start',{targetId:'preview-wolf'})});assert(await p.evaluate(()=>!!mist465_.pending&&!mist465_.loading));
 await p.evaluate(async()=>{fetch=async()=>new Response(JSON.stringify({ok:false,error:'MIST_PAIR_COOLDOWN'}),{status:200});await mistRetry465_()});assert(await p.evaluate(()=>!mist465_.pending&&!mist465_.loading));assert.match(await p.locator('.mist-error465').innerText(),/六小時/);
 // Unknown outcomes stay pending, and status refresh must not erase recovery UI.
 await p.evaluate(async()=>{apiPost=async()=>{throw Error('connection lost')};await mistCommand465_('battle/start',{targetId:'preview-wolf'});window.pending507=structuredClone(mist465_.pending);apiPost=async()=>structuredClone(good507);await refreshMist465_()});
 assert(await p.evaluate(()=>mist465_.pending.requestId===pending507.requestId));assert.match(await p.locator('.mist-error465').innerText(),/重試同筆操作/);
 for(const [x,y,name] of [[3,7,'霧中的旅人'],[6,7,'我的旗幟'],[5,5,'補給站']]){await p.evaluate(([x,y])=>mistCellClick469_(x,y),[x,y]);assert.match(await p.locator('#modalBody').innerText(),new RegExp(name));await p.evaluate(()=>closeModal())}
 await p.evaluate(()=>mistCellClick469_(5,6));assert(await p.locator('#modal.open').count());assert(await p.locator('#modalBody button[onclick*="battle/start"]').isDisabled());assert.match(await p.locator('#modalBody').innerText(),/荊棘野狼/);
 await p.evaluate(async()=>{apiPost=async(action,payload)=>{window.retried507=payload;return structuredClone(good507)};await mistRetry465_()});assert(await p.evaluate(()=>retried507.requestId===pending507.requestId&&retried507.expectedRevision===pending507.expectedRevision&&!mist465_.pending));
 // A slow read allows inspection; completing it enables the already open popup.
 await p.evaluate(()=>{apiPost=()=>new Promise(resolve=>window.resolve507=resolve);window.flight507=refreshMist465_()});await p.evaluate(()=>mistCellClick469_(5,6));assert.match(await p.locator('#modalBody').innerText(),/資料同步中/);assert(await p.locator('#modalBody button[onclick*="battle/start"]').isDisabled());await p.evaluate(async()=>{resolve507(structuredClone(good507));await flight507});assert(!await p.locator('#modalBody button[onclick*="battle/start"]').isDisabled());
 // Render exceptions cannot strand the loading guard before try/finally.
 await p.evaluate(async()=>{closeModal();const draw=mistDraw465_;let first=true;mistDraw465_=()=>{if(first){first=false;throw Error('render failure')}draw()};try{await refreshMist465_()}finally{mistDraw465_=draw}});assert(await p.evaluate(()=>!mist465_.loading));
 assert.deepEqual(errors,[]);console.log(engine,view,'rejection, pending recovery, same request retry, slow read inspection, popup refresh and render exception PASS');await p.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
