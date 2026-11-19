const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
const planning=JSON.parse(fs.readFileSync('/workspace/work/catalog463-bootstrap.json')),out='/workspace/outputs/shop493';fs.mkdirSync(out,{recursive:true});
try{for(const [view,width,height]of [['desktop',1440,900],['desktop',1024,768],['mobile',390,844],['mobile',360,640],['mobile',320,568]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:view==='mobile'}),errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({planning,view})=>{
  installMistPreview465(planning,view);applyGameConfigRows_(planning.data.GameConfig);applyEquipmentRows_(planning.data.Equipment);applySkillRows_(planning.data.Skills);applyConsumableRows_(planning.data.Consumables);applyShopEntriesRows_(planning.data.ShopEntries);planningReady412_=()=>true;
  state.page='shop';state.floor=1;state.maxCleared=0;state.gold=10000;state.skillsOwned=['slash'];state.shopTab='skill';cloudMeta.authProvider='supabase';render=previewOriginalRender465;render();if(view==='desktop'){state.page='town';openFacility402_('shop');}
 },{planning,view});
 const count=await p.evaluate(()=>({all:shopEntriesOnline.length,stock:state.shopStock.length}));assert.equal(count.all,count.stock,'all active products retained');
 const draw=async()=>p.evaluate(()=>render());
 const bounds=async()=>{assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const bad=await p.locator('.shop-condition493').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.innerText));assert.deepEqual(bad,[],'conditions wrap without overflow');};
 const select=async(id)=>{if(view==='desktop')await p.evaluate(id=>{const i=marketRows402_.findIndex(r=>r.key==='skill:'+id);if(i<0)throw Error('missing '+id);marketPick402_(i);},id);};
 // Future-tier spells stay visible; learned skills are hidden without changing purchase indices.
 await select('magicSlashII');const container=view==='desktop'?p.locator('.detail402'):p.locator('.shop-card').filter({has:p.locator('.shop-product-name',{hasText:'【魔力斬擊II】'})});
 assert.ok(await container.count());assert.equal(await container.locator('.skill-category179').innerText(),'混合');if(view==='desktop')assert.equal(await p.locator('.cell402>.skill-category179').count(),await p.evaluate(()=>marketRows402_.length));assert.match(await container.locator('.shop-condition493').innerText(),/通關主線第/);assert.match(await container.locator('.shop-condition493').innerText(),/需先習得/);assert.equal(await container.locator('button.shop-buy-btn,.trade402 button').count(),0);await bounds();await p.evaluate(()=>hideItem404_());if(view==='mobile')await container.scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${engine}-${width}-locked.png`});
 // Precisely reach planning UnlockFloor; missing prerequisite still prevents purchase.
 await p.evaluate(()=>{state.maxCleared=shopEntriesOnline.find(x=>x.template==='magicSlashII').unlockFloor-1;state.floor=1;render();});assert.match(await container.locator('.shop-condition493').innerText(),/需先習得/);assert.doesNotMatch(await container.locator('.shop-condition493').innerText(),/通關/);
 await p.evaluate(()=>{state.skillsOwned.push('magicSlash');render();});assert.equal(await container.locator('.shop-condition493').count(),0);assert.equal(await container.locator('button.shop-buy-btn,.trade402 button').count(),1);
 const purchase=await p.evaluate(async()=>{let sent=null;runInventoryAction_=async(body)=>{sent=body;state.skillsOwned=state.skillsOwned.filter(id=>id!=='magicSlash');state.skillsOwned.push('magicSlashII');render();return true};const entry=state.shopStock.find(x=>x.template==='magicSlashII');await buyShop(state.shopStock.indexOf(entry));return {sent,id:entry.shopEntryId};});assert.deepEqual(purchase.sent,{action:'buy',entryId:purchase.id});
 assert.equal(await p.evaluate(()=>state.shopStock.length),count.stock);
 const hidden=await p.evaluate(view=>view==='desktop'?!marketRows402_.some(r=>['skill:slash','skill:magicSlash','skill:magicSlashII'].includes(r.key)):!Array.from(document.querySelectorAll('.shop-product-name')).some(n=>/【(?:砍擊|魔力斬擊|魔力斬擊II)】/.test(n.textContent)),view);assert.equal(hidden,true,'learned and superseded skills disappear after purchase');
 // Direct stale calls still cannot repurchase hidden skills.
 const repeat=await p.evaluate(async()=>{let sent=0;runInventoryAction_=async()=>{sent++;return true};await buyShopLegacy175_(state.shopStock.findIndex(x=>x.template==='magicSlashII'));return sent});assert.equal(repeat,0);
 // All skills learned renders an empty category without leaking the prior detail selection.
 await p.evaluate(()=>{state.skillsOwned=Object.keys(skillTemplates);render();});assert.equal(await p.evaluate(view=>view==='desktop'?marketRows402_.length:document.querySelectorAll('.shop-buy-section .shop-card').length,view),0);

 // Money, long prerequisite copy and direct stale-button calls cannot bypass eligibility.
 await p.evaluate(()=>{state.skillsOwned=['slash'];state.gold=0;skillTemplates.magicSlash.name='很長的前置技能名稱用來確認窄螢幕換行不會擠壓商品圖片與價格';render();});await select('magicSlashII');await bounds();await p.evaluate(()=>hideItem404_());if(view==='mobile')await container.scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${engine}-${width}-long-condition.png`});
 const guards=await p.evaluate(async()=>{let sent=0,notices=[];runInventoryAction_=async()=>{sent++;return true};toast=m=>notices.push(m);const i=state.shopStock.findIndex(x=>x.template==='magicSlashII');await buyShopLegacy175_(i);return {sent,notices};});assert.equal(guards.sent,0);assert.match(guards.notices[0],/需先習得/);
 await p.evaluate(()=>{state.shopTab='equipment';state.shopEquipSubTab='weapon';render();});const locked=view==='desktop'?p.locator('.detail402 .shop-condition493'):p.locator('.shop-condition493').first();assert.match(await locked.innerText(),/金幣不足/);await bounds();
 await p.evaluate(()=>{state.gold=10000;state.maxCleared=0;state.floor=1;state.shopTab='utility';shopConsumableSubTab_='battle';render();});await bounds();
 // Unique utilities remain visible and belong to consumables, not weapon equipment.
 const utility=await p.evaluate(()=>{state.utilityItems=['fixture-utility'];const e={type:'utility',template:'fixture-utility',unlockFloor:1,price:1};return {tab:shopEntryTab(e),conditions:shopConditions493_(e)};});assert.equal(utility.tab,'utility');assert.deepEqual(utility.conditions,['已持有此道具']);
 // Legacy/offline stock follows the same display gates and retains future tier equipment.
 const offline=await p.evaluate(()=>{cloudMeta.authProvider='legacy';refreshShop();const e=state.shopStock.find(x=>x.unlockFloor>1);return {future:!!e,blocked:e&&shopConditions493_(e).length>0};});assert.equal(offline.future,true);assert.equal(offline.blocked,true);
 assert.deepEqual(errors,[]);console.log(engine,width,'all listings, floor/prerequisite/ownership/gold gates, stale click guard, long wrap and category layout passed');await p.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
