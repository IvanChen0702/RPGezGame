const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
for(const [view,width,height] of [['desktop',1280,900],['mobile',390,844]]){
 const p=await b.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({view,data})=>{for(const [k,v] of Object.entries({EnergyInitial:30,EnergyCap:30,EnergyRecoveryMinutes:15}))data.MistConfig.find(r=>r.Key===k).Value=v;installMistPreview465({data},view);bootstrapDataCache=data;planningReady412_=()=>true;render=previewOriginalRender465;delete mist465_.data.energyRules;mist465_.tab='entry';render();},{view,data:JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'))});
 assert.match(await p.locator('.mist-guide-energy485').innerText(),/30.*體力上限[\s\S]*每 15 分鐘/);
 assert.match(await p.locator('.mist-rules465').textContent(),/初始體力 30、上限 30，每 15 分鐘恢復 1 點/);
 await p.evaluate(()=>{mist465_.data.energyRules={initial:30,cap:30,recoveryMinutes:15};mist465_.data.self.energy=29;mist465_.data.self.energyNextAt=new Date(Date.now()+900000).toISOString();mist465_.tab='map';render()});
 const bar=p.locator('[aria-label="體力"][role="progressbar"]');assert.equal(await bar.getAttribute('aria-valuemax'),'30');assert.equal(await bar.getAttribute('aria-valuenow'),'29');assert.match(await bar.innerText(),/29 \/ 30/);
 assert.match(await p.locator('[data-energy-clock479]').innerText(),/00:1[45]:\d\d.*\+1/);
 assert.match(await p.evaluate(()=>mistError465_('MIST_ENERGY_LOW')),/每 15 分鐘/);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);console.log('PASS',view,'30/15 rules, bar, countdown, error text');await p.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
