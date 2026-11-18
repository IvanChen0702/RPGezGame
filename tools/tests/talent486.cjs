const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));try{for(const view of ['desktop','mobile']){
 const p=await browser.newPage({viewport:view==='desktop'?{width:1440,height:900}:{width:390,height:844}}),errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({data,view})=>{installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);state.page='prepare';planningReady412_=()=>true;render=previewOriginalRender465;save=()=>{};playSfx=()=>{};mobilePrepareManageTab_='ability';state.level=250;state.talent=501;state.talentSpent={hp:0,def:0,patk:0,matk:0,crit:0};render();void requestReadyRoom24_('main','整備測試',()=>{});},{data:JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json')),view});
 const batch=p.locator('#readyRoom24 .talent-batch486').first();await batch.waitFor();
 for(const [remaining,amount]of [[0,10],[9,10],[10,10],[199,10],[200,10],[201,50],[500,50],[501,99],[747,99]]){
  await p.evaluate(n=>{state.talent=n;refreshTalent263_();},remaining);
  assert.equal(await batch.textContent(),'＋'+amount);assert.equal(await batch.isDisabled(),remaining<amount);
  assert.match(await batch.getAttribute('onclick'),new RegExp(','+amount+'\\)'));
 }
 await p.evaluate(()=>{state.talent=501;refreshTalent263_();window.oldTalentButton486=document.querySelector('#readyRoom24 .talent-batch486');window.oldHp486=totalStats().hp;});
 await batch.click();assert.equal(await p.evaluate(()=>state.talent),402);assert.equal(await p.evaluate(()=>state.talentSpent.hp),99);assert.equal(await p.evaluate(()=>totalStats().hp-oldHp486),990);assert.equal(await batch.textContent(),'＋50');assert.equal(await batch.evaluate(el=>el===window.oldTalentButton486),true,'button DOM retained');
 await p.evaluate(()=>{state.talent=201;refreshTalent263_();});await batch.click();assert.equal(await p.evaluate(()=>state.talent),151);assert.equal(await batch.textContent(),'＋10');
 await p.evaluate(()=>{state.talent=201;refreshTalent263_();});await p.locator('#readyRoom24 .talent-actions310 button').first().click();assert.equal(await p.evaluate(()=>state.talent),200);assert.equal(await batch.textContent(),'＋10');
 await p.evaluate(()=>{state.currentBattle={won:false,lost:false};refreshTalent263_();});assert.equal(await batch.isDisabled(),true);const locked=await p.evaluate(()=>{const n=state.talent;spendTalent('hp',99);return state.talent===n});assert.equal(locked,true);
 await p.evaluate(()=>{state.currentBattle=null;state.talent=9;refreshTalent263_();});assert.equal(await batch.isDisabled(),true);
 await p.evaluate(()=>{state.talent=501;refreshTalent263_();});assert.equal(await batch.textContent(),'＋99');
 const geometry=await batch.evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(geometry.scroll<=geometry.client+1,'99 label fits: '+JSON.stringify(geometry));
 if(await p.locator('#uiAlertOverlay').count())await p.locator('#uiAlertOverlay button').first().click();
 // Arena uses its independent unspent pool and never changes PvE allocations.
 await p.evaluate(()=>{document.getElementById('readyRoom24')?.remove();window.pve486=JSON.stringify([state.talent,state.talentSpent]);window.renderBefore486=render;render=()=>{document.getElementById('page').innerHTML=renderArenaStats_()};arenaDraft_().talentSpent={hp:246,def:0,patk:0,matk:0,crit:0};render();});
 const arena=p.locator('.arena-stat-row .talent-batch486').first();assert.equal(await arena.textContent(),'+99');await arena.click();assert.equal(await p.evaluate(()=>arenaTalentLeft_()),402);assert.equal(await arena.textContent(),'+50');
 await p.evaluate(()=>{arenaDraft_().talentSpent.hp=546;render();});await arena.click();assert.equal(await p.evaluate(()=>arenaTalentLeft_()),151);assert.equal(await arena.textContent(),'+10');
 assert.equal(await p.evaluate(()=>JSON.stringify([state.talent,state.talentSpent])===pve486),true);assert.deepEqual(errors,[]);await p.close();console.log(engine,view,'talent boundaries, live downgrade, HP, retained button, insufficient points, battle lock and arena isolation passed');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
