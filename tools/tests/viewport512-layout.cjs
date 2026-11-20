const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
 fs.mkdirSync('/workspace/outputs/ui504',{recursive:true});
 try{for(const [view,width,height]of [['mobile',390,664],['mobile',320,568],['mobile',390,844]]){
  const p=await browser.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>{if(!e.message.startsWith('ResizeObserver'))errors.push(e.message)});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
  await p.evaluate(({data,view})=>{
   installMistPreview465({data},view);loginRequiredActive_=()=>false;applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);render=previewOriginalRender465;initialEntryShown45_=true;
   const make=(id,template)=>({...itemTemplates[template],id,template,kind:'equipment',enhance:0,sockets:1,gems:[null]});
   const templates=Object.keys(itemTemplates).filter(k=>itemTemplates[k].slot==='weapon').slice(0,8);window.items504=templates.map((t,i)=>make('item504-'+i,t));items504[0].name='測試武器甲';items504[1].name='測試武器乙';
   const rings=Object.keys(itemTemplates).filter(k=>itemTemplates[k].slot==='ring').slice(0,2);itemTemplates[rings[0]].equipmentLevel464=20;itemTemplates[rings[1]].equipmentLevel464=90;
   window.rings504=[make('ringLow',rings[0]),make('ringHigh',rings[1])];rings504[0].enhance=10;
   window.gems504=Object.keys(gemTemplates).slice(0,6).map((template,i)=>({...gemTemplates[template],template,id:'gem504-'+i,kind:'gem',level:1}));
   state.inventory=items504;state.gems=gems504;state.equipment={weapon:items504[0].id,rings:[null,null,null,null]};state.page='prepare';state.currentBattle=null;state.battleVisual={busy:false};window.equipCalls504=[];
   localStorage.setItem('rpg_view204_inventory','grid');render();openPrepareEquipPicker('weapon');
  },{data,view});

  await p.evaluate(()=>{closeQuickPicker();setMobilePrepareManageTab_('equip');render()});await p.waitForTimeout(700);
  const measure=()=>p.evaluate(()=>Object.fromEntries(['#app','#page','#mainNav','.prepare-equip-area','.prepare-equip-area>.panel'].map(s=>{const n=document.querySelector(s),r=n?.getBoundingClientRect();return [s,n?{w:r.width,h:r.height,y:r.y,scale:n.dataset.fitScale317,css:n.style.cssText}:null]})));

  const baseline=await measure();
  const check=async(label)=>{
   await p.waitForTimeout(150);const now=await measure();
   assert(Math.abs(now['#app'].h-height)<2,label+': app height');
   assert(Math.abs(now['#mainNav'].y-baseline['#mainNav'].y)<2,label+': nav position');
   if(Math.abs(now['.prepare-equip-area>.panel'].w-baseline['.prepare-equip-area>.panel'].w)>=2){console.log({label,baseline,now});await p.screenshot({path:'/workspace/outputs/ui504/viewport512-failure.png'});}assert(Math.abs(now['.prepare-equip-area>.panel'].w-baseline['.prepare-equip-area>.panel'].w)<2,label+': equipment scale');
  };
  const keyboard=async()=>{
   await p.evaluate(()=>{
    if(!window.simViewport512){window.simViewport512={};for(const k of ['height','scale','offsetTop'])Object.defineProperty(visualViewport,k,{configurable:true,get:()=>simViewport512[k]});}
    Object.assign(simViewport512,{height:360,scale:1,offsetTop:35});visualViewport.dispatchEvent(new Event('resize'));
   });await p.waitForTimeout(100);
  };
  const settle=async()=>{
   // Delayed recovery without a resize notification: the old focusout timers cannot recover it.
   await p.waitForTimeout(600);await p.evaluate(()=>Object.assign(simViewport512,{height:innerHeight,offsetTop:0}));await check('delayed recovery');
  };
  const dismiss=async()=>{const ok=p.locator('#uiAlertOk');if(await ok.isVisible())await ok.click();};
  await p.locator('button[onclick="openEquipmentLoadoutSave_()"]').click();await p.locator('#loadoutSaveName').fill('Test');
  await keyboard();await check('keyboard visible');await p.locator('#loadoutSaveOk').click();await settle();await dismiss();
  assert.equal(await p.evaluate(()=>state.equipmentLoadoutNames[0]),'Test');
  await p.evaluate(()=>applyEquipmentLoadout_(0));await dismiss();await check('apply saved loadout');
  await p.locator('button[onclick="openEquipmentLoadoutSave_()"]').click();await keyboard();await p.locator('#loadoutSaveCancel').click();await settle();
  await p.locator('.pet-manage301').click();await keyboard();await p.locator('[aria-label="關閉寵物管理"]').click();await settle();
  for(const kind of ['equipment','gem']){
   await p.evaluate(kind=>kind==='equipment'?openPrepareEquipPicker('weapon'):openGemPicker_('item504-1',0),kind);
   await p.locator('#quickPicker input[type="search"]').fill('測試');await keyboard();
   await p.evaluate(kind=>{closeQuickPicker();if(kind==='equipment')prepareEquip('item504-1','weapon');else socketGemFromPicker_('item504-1',0,0)},kind);
   await settle();await dismiss();await p.evaluate(()=>closeModal());await check(kind+' selection and redraw');
  }
  assert.equal(await p.evaluate(()=>state.equipment.weapon),'item504-1');
  assert(await p.evaluate(()=>!!state.inventory.find(x=>x.id==='item504-1').gems[0]));
  // Pinch zoom / focus zoom must not turn a visual viewport into a layout size.
  await keyboard();await p.evaluate(()=>{simViewport512.scale=1.3;visualViewport.dispatchEvent(new Event('resize'));render()});await check('zoom and render');
  await p.evaluate(()=>{simViewport512.scale=1;simViewport512.height=innerHeight;simViewport512.offsetTop=0});
  await p.setViewportSize({width:height,height:width});await p.waitForTimeout(400);
  assert(Math.abs((await measure())['#app'].h-width)<2,'rotation follows actual CSS viewport');
  await p.setViewportSize({width,height});await p.waitForTimeout(400);await check('rotate back');
  for(const page of ['battle','arenaBattle','mist','prepare']){
   // Exercise the real mode/nav class update without needing a live battle API.
   await p.evaluate(page=>{state.page=page;applyViewMode_()},page);await p.waitForTimeout(100);
   assert.equal(await p.locator('#mainNav').isVisible(),page==='prepare',page+' navigation visibility');
  }
  await p.evaluate(()=>render());await check('mode return');
  assert.deepEqual(errors,[]);await p.screenshot({path:'/workspace/outputs/ui504/viewport512-'+engine+'-'+width+'x'+height+'.png'});
  console.log(engine,width,height,'save/apply/cancel, pet return, equipment/gem search + mutations, delayed viewport, zoom, rotation, mode nav PASS');await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
