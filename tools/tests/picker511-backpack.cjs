const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
 fs.mkdirSync('/workspace/outputs/ui504',{recursive:true});
 try{for(const [view,width,height]of [['mobile',390,844],['mobile',320,568],['mobile',844,390]]){
  const p=await browser.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>{if(!e.message.startsWith('ResizeObserver'))errors.push(e.message)});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
  await p.evaluate(({data,view})=>{
   installMistPreview465({data},view);loginRequiredActive_=()=>false;applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);render=previewOriginalRender465;initialEntryShown45_=true;
   const make=(id,template)=>({...itemTemplates[template],id,template,kind:'equipment',enhance:0,sockets:1,gems:[null]});
   const templates=Object.keys(itemTemplates).filter(k=>itemTemplates[k].slot==='weapon').slice(0,8);window.items504=templates.map((t,i)=>make('item504-'+i,t));items504[0].name='測試武器甲';items504[1].name='測試武器乙';
   const rings=Object.keys(itemTemplates).filter(k=>itemTemplates[k].slot==='ring').slice(0,2);itemTemplates[rings[0]].equipmentLevel464=20;itemTemplates[rings[1]].equipmentLevel464=90;
   window.rings504=[make('ringLow',rings[0]),make('ringHigh',rings[1])];rings504[0].enhance=10;
   window.gems504=Object.keys(gemTemplates).slice(0,6).map((template,i)=>({...gemTemplates[template],template,id:'gem504-'+i,kind:'gem',level:1}));
   items504=Array.from({length:114},(_,i)=>({...items504[i%items504.length],id:'item504-'+i}));gems504=Array.from({length:114},(_,i)=>({...gems504[i%gems504.length],id:'gem504-'+i}));state.inventory=items504;state.gems=gems504;state.equipment={weapon:items504[0].id,rings:[null,null,null,null]};state.page='prepare';state.currentBattle=null;state.battleVisual={busy:false};window.equipCalls504=[];
   prepareEquip=async(...args)=>{equipCalls504.push(args);closeQuickPicker()};socketGemFromPicker_=async(...args)=>{equipCalls504.push(args);return true};localStorage.setItem('rpg_view204_inventory','grid');render();openPrepareEquipPicker('weapon');
  },{data,view});

  const geometry=n=>{const c=getComputedStyle(n),a=getComputedStyle(n.querySelector('.tile-art204')),img=getComputedStyle(n.querySelector('.tile-art204 img')),name=getComputedStyle(n.querySelector('.tile-name204')),grid=getComputedStyle(n.closest('.tile-grid205'));return {radius:c.borderRadius,top:a.top,left:a.left,bottom:parseFloat(a.bottom)/(n.clientHeight||1),imgPadding:img.padding,imgWidth:parseFloat(img.width)/parseFloat(a.width),imgHeight:parseFloat(img.height)/parseFloat(a.height),nameFont:name.fontSize,namePadding:name.padding,nameLine:name.lineHeight,cols:grid.gridTemplateColumns.split(' ').length,gap:grid.gap,padding:grid.padding}};
  for(const type of ['equipment','gem']){
   await p.evaluate(type=>{closeQuickPicker();inventoryMainTab_=type;localStorage.setItem('rpg_view204_inventory','grid');openInventoryWindowLocal338_()},type);await p.waitForTimeout(250);
   const baseline=await p.locator('#page .collection-tile205').first().evaluate(geometry);
   const menuText=await p.locator('#page .view-control204').textContent();
   await p.evaluate(type=>{closeInventoryWindow293_();if(type==='gem')openGemPicker_('item504-0',0);else openPrepareEquipPicker('weapon')},type);
   await p.locator('.mobile-picker509 .view-control204 summary').click();
   assert.equal(await p.locator('.mobile-picker509 .view-control204').textContent(),menuText);
   await p.locator('.mobile-picker509 .view-control204 button').nth(1).click();await p.mouse.move(0,0);await p.waitForTimeout(150);
   const current=await p.locator('.mobile-picker509 .collection-tile205').filter({has:p.locator('img')}).first().evaluate(geometry);
   for(const k of Object.keys(baseline)){if(typeof baseline[k]==='number')assert(Math.abs(baseline[k]-current[k])<.015,JSON.stringify({type,k,baseline,current}));else assert.equal(current[k],baseline[k],type+' '+k)}
   await p.screenshot({path:'/workspace/outputs/ui504/picker511-'+type+'-'+engine+'-'+width+'.png'});
   if(width===390){await p.locator('.mobile-picker509 summary').click();await p.screenshot({path:'/workspace/outputs/ui504/picker511-menu-'+engine+'.png'});await p.locator('.mobile-picker509 .view-control204 button').first().click()}
  }
  assert.deepEqual(errors,[]);console.log(engine,width,'backpack/picker menu and tile/icon geometry match PASS');await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
