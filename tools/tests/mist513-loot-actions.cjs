const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
 fs.mkdirSync('/workspace/outputs/mist513',{recursive:true});
 try{for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844],['mobile',320,568]]){
  const p=await browser.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>{if(!e.message.startsWith('ResizeObserver'))errors.push(e.message)});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
  await p.evaluate(({data,view})=>{
   installMistPreview465({data},view);loginRequiredActive_=()=>false;applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applyGemRows_(data.Gems);render=previewOriginalRender465;initialEntryShown45_=true;
   mist465_.preview=false;mist465_.tab='map';const d=mist465_.data;
   const template=Object.keys(itemTemplates).find(k=>itemTemplates[k].slot==='weapon');
   const gem=Object.keys(gemTemplates)[0];
   window.loot513=[{...itemTemplates[template],id:'loot-equipment',template,kind:'equipment',sockets:1,gems:[null],enhance:1},{...gemTemplates[gem],id:'loot-gem',template:gem,kind:'gem'}, {id:'loot-chest',name:'測試寶箱',kind:'chest'}];
   d.pendingLoot=structuredClone(loot513);d.inventory={equipment:[],gems:[],chests:[]};d.inventoryCapacity499={equipment:20,gems:20,chests:20};d.equipment={};d.skills={active:['slash'],passive:null};d.ownedSkills=['slash'];d.stats={hp:1000,patk:100,matk:50,def:40,crit:10,critDamage:100};d.starter=null;d.chestReveals471=[];
   window.calls513=[];mistDo469_=async(action,payload)=>{calls513.push({action,payload})};mistUi470_.bag='pending';render();mistOpenPrep474_('bag');
  },{data,view});
  for(const layout of ['grid','list'])for(const kind of ['equipment','gem','chest']){
   await p.evaluate(({layout,kind})=>{closeModal();localStorage.setItem('rpg_view204_inventory',layout);bagList402_=layout==='list';marketKey402_='loot-'+kind;mistRefreshPrep474_();},{layout,kind});
   await p.locator('#mistPrep474 .cell402').nth(['equipment','gem','chest'].indexOf(kind)).click();
   const detail=p.locator(view==='mobile'?'#modal .detail402':'#mistPrep474 .detail402');
   assert.deepEqual(await detail.locator('.trade402 button').allTextContents(),['收取','丟棄']);
   const take=detail.getByRole('button',{name:'收取',exact:true}),discard=detail.getByRole('button',{name:'丟棄',exact:true});
   const before=await p.evaluate(()=>calls513.length);await take.click();
   assert.deepEqual(await p.evaluate(()=>calls513.at(-1)),{action:'loot/take',payload:{itemId:'loot-'+kind}});assert.equal(await p.evaluate(()=>calls513.length),before+1);
   assert.equal(await p.locator('#modal .manager-buttons307').count(),0,'take must not open another combined action chooser');
   await discard.click();assert.equal(await p.evaluate(()=>calls513.length),before+1);await p.locator('#uiConfirmOverlay button').filter({hasText:'取消'}).click();assert.equal(await p.evaluate(()=>calls513.length),before+1);
   await discard.click();await p.locator('#uiConfirmOverlay .primary').click();assert.equal(await p.evaluate(()=>calls513.at(-1).action),'loot/discard');assert.equal(await p.evaluate(()=>calls513.length),before+2);
  }
  await p.evaluate(()=>{closeModal();const d=mist465_.data;d.inventory.equipment=Array.from({length:20},(_,i)=>({...loot513[0],id:'owned-'+i}));marketKey402_='loot-equipment';mistRefreshPrep474_();});
  await p.locator('#mistPrep474 .cell402').first().click();
  const detail=p.locator(view==='mobile'?'#modal .detail402':'#mistPrep474 .detail402');assert(await detail.getByRole('button',{name:'收取',exact:true}).isDisabled());assert(await detail.getByRole('button',{name:'丟棄',exact:true}).isEnabled());assert.match(await detail.innerText(),/背包已滿/);
  const before=await p.evaluate(()=>calls513.length);await p.evaluate(()=>mistTakeLoot513_('loot-equipment'));assert.equal(await p.evaluate(()=>calls513.length),before,'stale/full take must not send a request');await p.evaluate(()=>document.querySelector('#uiAlertOverlay')?.remove());
  assert.equal(await detail.locator('.mist-discard504').evaluate(e=>getComputedStyle(e).borderColor),'rgb(189, 100, 100)');
  await p.screenshot({path:'/workspace/outputs/mist513/'+engine+'-'+width+'.png'});
  assert.deepEqual(errors,[]);console.log(engine,width,'independent take/discard, confirmation, full capacity, grid/list PASS');await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
