/* Exercise rendering before the later pet UI script is parsed, then reload.
   Synthetic local state only; all external requests are blocked. */
const assert=require('assert/strict'),fs=require('fs');
const browsers=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const engine=process.env.GAME_TEST_ENGINE||'chromium';
(async()=>{
 const browser=await browsers[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
 try{
 for(const mode of ['mobile','desktop']){
  const p=await browser.newPage({viewport:mode==='mobile'?{width:390,height:844}:{width:1440,height:900}}),errors=[];
  p.on('console',m=>{if(m.type()==='error'&&m.text().includes('render page failed'))errors.push(m.text());});
  p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver loop'))errors.push(e.message);});
  await p.route('**/*',async r=>{
   const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();
   if(u.pathname==='/'){
    const html=fs.readFileSync('index.html','utf8'),marker='<script data-ui360="pets-ui.js">';assert.equal(html.split(marker).length,2);
    const probe=`<script>state=defaultState();state.page='town';viewModePreference_=${JSON.stringify(mode)};initialEntryShown45_=true;render();window.earlyTown460={pet:typeof syncPetTraining458_,text:document.getElementById('page').textContent,canvas:!!document.querySelector('.town-canvas311'),mounted:!!townRun311_};</script>`;
    return r.fulfill({contentType:'text/html',body:html.replace(marker,probe+marker)});
   }return r.continue();
  });
  for(let attempt=0;attempt<2;attempt++){
   if(attempt)await p.reload({waitUntil:'networkidle'});else await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
   const early=await p.evaluate(()=>earlyTown460);
   assert.equal(early.pet,'undefined','must test before later script initialization');
   assert(!early.text.includes('頁面載入失敗'),JSON.stringify(early));assert(early.canvas&&early.mounted,JSON.stringify(early));
   await p.evaluate(()=>{state.page='town';render();});
   assert.equal(await p.locator('.town-canvas311').count(),1);
   assert(!(await p.locator('#page').innerText()).includes('頁面載入失敗'));
  }
  await p.evaluate(()=>{
   bootstrapDataCache={PetConfig:[{Key:'MaxLevel',Value:100},{Key:'BaseExp',Value:10},{Key:'ExpGrowth',Value:1.1}],PetTrainingCosts:[{LockedCount:0,StoneCost:100}]};
   state.pets297=[{id:'pet460',species:'deer',level:25,exp:47,origin:'normal',traits:[{traitId:'t0',quality:'common',stat:'hp',mode:'flat',value:10,locked:false}]}];state.stones=91;petBusy297=false;petModal297={id:'pet460',emotion:'idle'};petPaint297();render();
  });
  assert(await p.locator('#petTrainButton458').isDisabled());assert.match(await p.locator('#petTrainingFunds458').innerText(),/還差 9 顆/);
  await p.waitForFunction(()=>getComputedStyle(document.getElementById('petTrainButton458')).backgroundColor==='rgb(41, 41, 41)');
  assert.equal(await p.locator('#petTrainButton458').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(41, 41, 41)');
  await p.evaluate(()=>{state.stones=100;render();});assert(await p.locator('#petTrainButton458').isEnabled());
  assert.deepEqual(errors,[]);console.log(engine,mode,'early town mount, cold load/reload, late pet funds refresh PASS');await p.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
