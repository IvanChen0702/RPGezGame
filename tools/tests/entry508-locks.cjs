const fs=require('fs'),assert=require('assert/strict');
const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));try{
const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));fs.mkdirSync('/workspace/outputs/entry508',{recursive:true});
for(const [view,width,height]of [['desktop',1280,720],['mobile',390,844],['mobile',320,740]]){
 const p=await browser.newPage({viewport:{width,height}});await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({data,view})=>{installMistPreview465({data},view);loginRequiredActive_=()=>false;applyGameConfigRows_(data.GameConfig);applyStageRows_(Array.from({length:55},(_,i)=>({Floor:i+1,EnemyID:'test-enemy',Enabled:true})));planningReady412_=()=>true;state.page='combatHub';townWindow311_=view==='desktop'?{route:'combatHub'}:null;window.mount508=(max,group='main')=>{state.maxCleared=max;mobilePrepareModeTab_=group;document.getElementById('page').innerHTML='<section class="battle349 '+(viewMode_==='mobile'?'phone349':'desktop349')+'"><div class="battle-body349">'+renderLobby349_()+'</div></section>';};},{data,view});
 for(const [max,group,id,locked]of [[0,'arena','mist',true],[1,'arena','mist',false],[9,'worldboss','worldboss',true],[10,'worldboss','worldboss',false],[19,'dungeon','dungeon',true],[20,'dungeon','dungeon',false],[29,'arena','arena',true],[30,'arena','arena',false],[47,'main','challenge',true],[49,'main','challenge',true],[50,'main','challenge',false]]){
  await p.evaluate(({max,group})=>mount508(max,group),{max,group});const b=p.locator(view==='desktop'?'[data-mode508="'+id+'"]':'[data-mode352="'+id+'"]');assert.equal(await b.isDisabled(),locked,id+' at '+max);assert.equal(await b.getAttribute('aria-disabled'),String(locked));if(locked){assert.equal(await b.evaluate(e=>getComputedStyle(e).filter),'grayscale(1)');assert.match(await b.innerText(),/解鎖|尚未就緒/);await b.evaluate(e=>e.click());assert.equal(await p.evaluate(()=>state.page),'combatHub');}
 }
 await p.evaluate(()=>mount508(47));await p.screenshot({path:'/workspace/outputs/entry508/'+engine+'-'+width+'.png'});
 // Mobile group tabs must still allow access to an unlocked mode in a mixed group.
 if(view==='mobile'){await p.evaluate(()=>mount508(1,'main'));await p.locator('.mode-tabs349 button[onclick*="arena"]').click();assert(!await p.locator('[data-mode352="mist"]').isDisabled());assert(await p.locator('[data-mode352="arena"]').isDisabled());}
 await p.evaluate(()=>{state.maxCleared=2;battleView349_={story:true,challenge:false,chapter:0,floor:3};document.querySelector('.battle-body349').innerHTML=renderStory349_()});assert(!await p.locator('#stage349-3').isDisabled());assert(await p.locator('#stage349-4').isDisabled());assert(await p.locator('#stage349-2').isDisabled());assert(await p.locator('.chapter-tabs349 button').nth(1).isDisabled());
 await p.evaluate(()=>{state.maxCleared=10;document.querySelector('.battle-body349').innerHTML=renderStory349_()});assert(!await p.locator('#stage349-2').isDisabled());
 // Missing planning data cannot make an entry look available.
 await p.evaluate(()=>{planningReady412_=()=>false;mount508(50)});assert(await p.locator(view==='desktop'?'[data-mode508="story"]':'[data-mode352="story"]').isDisabled());
 console.log(engine,view,width,'unlock boundaries, native disabled, grayscale, mixed groups and stage progression PASS');await p.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
