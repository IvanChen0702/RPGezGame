const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
 fs.mkdirSync('/workspace/outputs/ui504',{recursive:true});
 try{for(const [view,width,height]of [['mobile',390,844],['mobile',320,568]]){
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
   prepareEquip=async(...args)=>{equipCalls504.push(args);closeQuickPicker()};socketGemFromPicker_=async(...args)=>{equipCalls504.push(args);return true};localStorage.setItem('rpg_view204_inventory','grid');render();openPrepareEquipPicker('weapon');
  },{data,view});

  await p.evaluate(()=>{closeQuickPicker();setMobilePrepareManageTab_('equip');render()});await p.waitForTimeout(700);
  const measure=()=>p.evaluate(()=>Object.fromEntries(['#app','#page','#mainNav','.prepare-equip-area','.prepare-equip-area>.panel'].map(s=>{const n=document.querySelector(s),r=n?.getBoundingClientRect();return [s,n?{w:r.width,h:r.height,y:r.y,scale:n.dataset.fitScale317,css:n.style.cssText}:null]})));
  const baseline=await measure();
  for(let i=0;i<3;i++){
   await p.locator('.pet-manage301').click();await p.waitForTimeout(300);
   // A stale keyboard measurement must never resize the game shell (v512).
   await p.evaluate(height=>{document.documentElement.style.setProperty('--mobile-height431',Math.floor(height*.5)+'px');syncEquipment317_()},height);await p.waitForTimeout(80);
   const compressed=await measure();assert(Math.abs(compressed['.prepare-equip-area>.panel'].w-baseline['.prepare-equip-area>.panel'].w)<2,'keyboard height must not shrink the game shell');
   await p.locator('[aria-label="關閉寵物管理"]').click();await p.waitForTimeout(600);
   const restored=await measure();console.log(engine,'return',i,restored['.prepare-equip-area>.panel'].w,restored['#app'].h);
   assert(Math.abs(restored['#app'].h-height)<2,'outer viewport must recover');assert(Math.abs(restored['.prepare-equip-area>.panel'].w-baseline['.prepare-equip-area>.panel'].w)<2,'equipment scale must recover');assert(Math.abs(restored['#mainNav'].y-baseline['#mainNav'].y)<2,'nav must recover');
  }
  assert.deepEqual(errors,[]);
  await p.screenshot({path:'/workspace/outputs/ui504/pet-return510-'+engine+'-'+width+'.png'});await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
