const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
async function flipView(p){if(await p.locator('.mobile-picker509').count()){await p.locator('.mobile-picker509 .view-control204 summary').click();await p.locator('.mobile-picker509 .view-control204 button[aria-pressed=false]').click()}else await p.locator('[aria-label="切換檢視方式"]').click()}
(async()=>{
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
 fs.mkdirSync('/workspace/outputs/ui504',{recursive:true});
 try{for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844],['mobile',320,568],['mobile',844,390]]){
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
  if(view==='desktop'){
  if(width===390)await p.screenshot({path:'/workspace/outputs/ui504/equipment-picker-mobile.png'});
  const rarity504=await p.evaluate(()=>equipmentRarity280_(items504[1]));await p.locator('[aria-label="稀有度篩選"]').selectOption(rarity504);
  const expected504=await p.evaluate(r=>items504.filter(x=>equipmentRarity280_(x)===r).length,rarity504);assert.equal(await p.locator('.pick-grid401 button:visible').count(),expected504);
  await p.locator('[aria-label="稀有度篩選"]').selectOption('all');
  await p.locator('[aria-label="搜尋物品"]').fill('測試武器乙');assert.equal(await p.locator('.pick-grid401 button:visible').count(),1);
  await flipView(p);assert.equal(await p.locator('.pick-list504').count(),1);
  await p.locator('[aria-label="排序方式"]').selectOption('level-desc');
  const dims=await p.locator('.pick-card401').evaluate(e=>({w:e.scrollWidth,cw:e.clientWidth,h:e.getBoundingClientRect().height,bottom:e.getBoundingClientRect().bottom}));assert(dims.w<=dims.cw+1&&dims.bottom<=height+1,JSON.stringify(dims));
  await p.locator('.pick-card401 footer .primary').click();assert.equal(await p.evaluate(()=>equipCalls504[0][0]),'item504-1');
  await p.evaluate(()=>openGemPicker_('item504-0',0));if(width===390)await p.screenshot({path:'/workspace/outputs/ui504/gem-picker-mobile.png'});await p.locator('[aria-label="排序方式"]').selectOption('name-desc');
  const name=await p.evaluate(()=>gemDisplayName(state.gems[3]));await p.locator('[aria-label="搜尋物品"]').fill(name);await p.locator('.pick-grid401 button:visible').first().click();const chosen=await p.locator('.pick-grid401 button[aria-pressed=true]').getAttribute('data-pick-index504');
  await p.locator('.pick-card401 footer .primary').click();assert.equal(await p.evaluate(()=>equipCalls504.at(-1)[2]),Number(chosen));
  await p.evaluate(()=>openPrepareEquipPicker('weapon'));await p.locator('[aria-label="搜尋物品"]').fill('不存在的裝備XYZ');assert(await p.locator('.pick-card401 footer .primary').isDisabled());assert.equal(await p.locator('.pick-grid401 button:visible').count(),0);await p.evaluate(()=>closeQuickPicker());
  }else{
   assert.equal(await p.locator('.picker401').count(),0);assert.equal(await p.locator('.quick-picker-list').count(),1);
   if(width===390)await p.screenshot({path:'/workspace/outputs/ui504/equipment-picker-mobile.png'});
   await p.locator('[aria-label="搜尋物品"]').fill('測試武器乙');assert.equal(await p.locator('.quick-option:visible').count(),1);
   await p.evaluate(()=>{window.row509=document.querySelector('.quick-option:not([hidden])')});
   await p.locator('.quick-option:visible .favorite-star').click();assert(await p.evaluate(()=>row509===document.querySelector('.quick-option:not([hidden])')));
   await flipView(p);assert.equal(await p.locator('.mobile-equip-grid509').count(),1);await p.locator('[aria-label="排序方式"]').selectOption('level-desc');
   const dims=await p.locator('.quick-picker-card').evaluate(e=>({w:e.scrollWidth,cw:e.clientWidth,bottom:e.getBoundingClientRect().bottom}));assert(dims.w<=dims.cw+1&&dims.bottom<=height+1,JSON.stringify(dims));
   await p.locator('.quick-option:visible .quick-option-actions button:visible,.quick-option:visible .picker-tile510:visible').click();assert.equal(await p.evaluate(()=>equipCalls504[0][0]),'item504-1');
   await p.evaluate(()=>openGemPicker_('item504-0',0));assert.equal(await p.locator('.picker401').count(),0);assert.equal(await p.locator('#gemPickerGrid').count(),1);
   await p.locator('[aria-label="排序方式"]').selectOption('name-desc');const name=await p.evaluate(()=>gemDisplayName(state.gems[3]));await p.locator('[aria-label="搜尋物品"]').fill(name);await flipView(p);
   if(width===390)await p.screenshot({path:'/workspace/outputs/ui504/gem-picker-mobile.png'});
   const gem=p.locator('.gem-pick-card:visible').first(),chosen=await gem.getAttribute('data-gem-index');await gem.evaluate(el=>{const e=new Event('touchstart',{bubbles:true});Object.defineProperty(e,'touches',{value:[{clientX:100,clientY:200}]});el.dispatchEvent(e)});await p.waitForTimeout(470);await gem.dispatchEvent('touchend',{});await gem.click();assert.equal(await p.evaluate(()=>equipCalls504.length),1,'long press must not socket');await gem.click();assert.equal(await p.evaluate(()=>equipCalls504.at(-1)[2]),Number(chosen));
   await p.evaluate(()=>openPrepareEquipPicker('weapon'));await p.locator('[aria-label="搜尋物品"]').fill('不存在的裝備XYZ');assert.equal(await p.locator('.quick-option:visible').count(),0);assert(await p.locator('.mobile-picker-empty509').isVisible());await p.evaluate(()=>closeQuickPicker());
  }
  await p.evaluate(()=>{
   state.page='mist';state.currentBattle=null;mist465_.preview=false;mist465_.tab='map';const d=mist465_.data;d.inventory={equipment:[...items504,{...rings504[0],id:'bagRing'}],gems:gems504,chests:[]};d.equipment={weapon:{...items504[0],id:'wornWeapon'},ring1:rings504[0],ring2:rings504[1]};d.skills={active:['slash'],passive:null};d.ownedSkills=['slash'];d.stats={hp:1000,patk:100,matk:50,def:40,crit:10,critDamage:100};d.pendingLoot=[];d.starter=null;d.chestReveals471=[];mist465_.pending=null;mist465_.loading=false;window.discards504=[];mistDo469_=async(a,p)=>discards504.push({a,p});render();mistOpenPrep474_('bag');
  });
  const first=p.locator('.cell402').first();await first.click();
  const discard=p.locator(view==='mobile'?'#modal .mist-discard504':'#mistPrep474 .detail402 .mist-discard504');assert.equal(await discard.innerText(),'丟棄');
  const color=await discard.evaluate(e=>getComputedStyle(e).borderColor);assert.equal(color,'rgb(189, 100, 100)');
  await discard.click();await p.waitForSelector('#uiConfirmOverlay');assert.equal(await p.evaluate(()=>discards504.length),0);await p.getByRole('button',{name:'取消',exact:true}).last().click();assert.equal(await p.evaluate(()=>discards504.length),0);
  await discard.click();await p.locator('#uiConfirmOverlay .primary').click();await p.waitForTimeout(30);assert.equal(await p.evaluate(()=>discards504.length),1);
  // Switching accounts while the confirmation is open must not discard another account's item.
  await discard.click();await p.waitForSelector('#uiConfirmOverlay');await p.evaluate(()=>cloudMeta.accountId='changed504');await p.locator('#uiConfirmOverlay .primary').click();await p.waitForTimeout(30);assert.equal(await p.evaluate(()=>discards504.length),1);await p.evaluate(()=>{cloudMeta.accountId='preview-adventurer';closeModal()});
  if(view==='desktop'){
   const ring=p.locator('.cell402').filter({has:p.locator('[data-unused]')});
   await p.evaluate(()=>{const i=marketRows402_.findIndex(r=>r.key==='bagRing');showItem404_(document.querySelector('[data-market-index404="'+i+'"]'),marketRows402_[i]);});
   assert.equal(await p.locator('#itemTip404.mist-compare504').count(),1);assert.match(await p.locator('#itemTip404>section').nth(1).innerText(),/Lv.90/);
   const box=await p.locator('#itemTip404').boundingBox();assert(box.x>=0&&box.x+box.width<=width&&box.y+box.height<=height+1,JSON.stringify(box));
   await p.screenshot({path:'/workspace/outputs/ui504/compare-desktop.png'});
   await p.evaluate(()=>{hideItem404_();mistClosePrep474_(false);state.page='prepare';render();openPrepareEquipPicker('weapon');const e=document.querySelector('.pick-tile401[data-pick-index504="1"]');showItem404_(e,e.detailRow404_());});assert.equal(await p.locator('.mist-compare504').count(),0);
  }
  if(view==='mobile'){
   await p.evaluate(()=>{mistClosePrep474_(false);mistEquipPicker469_('weapon')});assert.equal(await p.locator('.picker401').count(),0);await p.locator('[aria-label="搜尋物品"]').fill('測試武器乙');await p.locator('.quick-option:visible .quick-option-actions button:visible,.quick-option:visible .picker-tile510:visible').click();assert.equal(await p.evaluate(()=>discards504.at(-1).a),'equip');assert.equal(await p.evaluate(()=>discards504.at(-1).p.itemId),'item504-1');
   await p.evaluate(()=>{closeQuickPicker();mistGemPicker469_('wornWeapon')});await p.locator('.gem-pick-card').first().click();assert.equal(await p.evaluate(()=>discards504.at(-1).a),'gem/insert');const before=await p.evaluate(()=>discards504.length);await p.evaluate(()=>cloudMeta.accountId='changed509');await p.locator('.gem-pick-card').first().click();assert.equal(await p.evaluate(()=>discards504.length),before);assert.equal(await p.locator('#quickPicker').count(),0);
  }
  assert.deepEqual(errors,[]);console.log(engine,width,'picker filtering/layout/original IDs and Mist discard confirmation/account guard/comparison PASS');await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
