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
  for(const type of ['equipment','gem']){
   await p.evaluate(type=>{closeQuickPicker();if(type==='gem'){openItem('item504-0');setItemManagerTab307_('socket');openGemPicker_('item504-0',0);}else openPrepareEquipPicker('weapon')},type);
   const grid=p.locator(type==='gem'?'#gemPickerGrid':'.quick-picker-list');
   for(const list of [true,false,true,false]){
    const toggle=p.locator('[aria-label="切換檢視方式"]');if((await toggle.getAttribute('aria-pressed')==='true')!==list)await toggle.click();
    await p.waitForTimeout(150);
    const toolbar=await p.locator('.mobile-filters509').evaluate(n=>{const a=n.querySelector('input').getBoundingClientRect(),b=n.querySelector('button').getBoundingClientRect();return {a:a.y,b:b.y,right:a.right,left:b.left}});assert(Math.abs(toolbar.a-toolbar.b)<1&&toolbar.right<=toolbar.left);
    assert(await p.locator('.quick-picker-card').evaluate(n=>{const r=n.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+20)?.closest('#quickPicker')}),'picker must be above management');
    if(list&&type==='gem'){
     const rows=await p.locator('.gem-pick-card').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),e=n.querySelector('.gem-effect310'),er=e.getBoundingClientRect(),st=n.querySelector('.gem-stats310').getBoundingClientRect();return {top:r.top,bottom:r.bottom,eHeight:er.height,eBottom:er.bottom,stHeight:st.height,border:getComputedStyle(e).borderTopStyle,text:e.textContent}}));
     assert.equal(rows.length,114);rows.forEach((r,i)=>{assert(r.eHeight>20&&r.stHeight>5&&r.eBottom<=r.bottom+1&&r.border==='solid'&&r.text.trim(),JSON.stringify(r));if(i)assert(r.top>=rows[i-1].bottom-1)});
    }
    if(!list){
     const cells=await grid.locator('.cell402:visible').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),a=n.querySelector('.tile-art204').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,ax:a.x,ay:a.y,ar:a.right,ab:a.bottom,right:r.right,bottom:r.bottom}}));
     assert(cells.length>=114);for(const c of cells){assert(Math.abs(c.w-c.h)<1.5&&c.w>40,JSON.stringify(c));assert(c.ax>=c.x-1&&c.ay>=c.y-1&&c.ar<=c.right+1&&c.ab<=c.bottom+1)}
     assert(cells[0].y===cells[1].y&&cells[1].x>=cells[0].right-1);const row2=cells.find(c=>c.y>cells[0].y+1);assert(row2.y>=cells[0].bottom-1);
    }
    const box=await p.locator('.quick-picker-card').evaluate(n=>({w:n.clientWidth,sw:n.scrollWidth,b:n.getBoundingClientRect().bottom}));assert(box.sw<=box.w+1&&box.b<=height+1,JSON.stringify(box));
    await grid.evaluate(n=>n.scrollTop=n.scrollHeight);assert(await grid.evaluate(n=>n.scrollTop>0));await grid.evaluate(n=>n.scrollTop=0);
    if(width===390)await p.screenshot({path:'/workspace/outputs/ui504/'+type+'-510-'+(list?'list':'grid')+'-'+engine+'.png'});
   }
   // Sorting and searching keep the original item identity in a true grid.
   await p.locator('[aria-label="排序方式"]').selectOption('name-desc');
   if(type==='gem'){const target=p.locator('.gem-pick-card:visible').nth(7),idx=Number(await target.getAttribute('data-gem-index'));await target.click();assert.equal(await p.evaluate(()=>equipCalls504.at(-1)[2]),idx)}
   else{const target=p.locator('.quick-option:visible').filter({has:p.locator('.picker-tile510:enabled')}).nth(3),idx=Number(await target.getAttribute('data-pick-index509'));await target.locator('.picker-tile510').click();assert.equal(await p.evaluate(()=>equipCalls504.at(-1)[0]),'item504-'+(idx-1))}
  }
  await p.evaluate(()=>{closeQuickPicker();openItem('item504-0');setItemManagerTab307_('socket');openGemPicker_('item504-0',0)});
  await p.keyboard.press('Escape');assert.equal(await p.locator('#quickPicker').count(),0);assert.equal(await p.locator('#modal.open').count(),1);
  await p.locator('#modal [onclick*="chooseGem"]').first().click();await p.locator('.quick-picker-close').click();assert.equal(await p.locator('#modal.open').count(),1);
  assert.deepEqual(errors,[]);console.log(engine,width,'114 items: square backpack cells, non-overlapping rows, full framed gem effects, scroll and original IDs PASS');await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
