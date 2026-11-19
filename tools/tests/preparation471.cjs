// Normal preparation regression: optional mode providers must not redirect formal actions.
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{for(const view of ['desktop','mobile']){
 const page=await browser.newPage({viewport:view==='desktop'?{width:1440,height:900}:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await page.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 await page.evaluate(({data,view})=>{installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);state.page='prepare';save=()=>{};planningReady412_=()=>true;render=previewOriginalRender465;state.skillsOwned=['slash','magicMissileIII','adventurerAptitude'];state.equippedSkills=['slash'];state.passive=['adventurerAptitude'];const r=data.Equipment.find(x=>x.Slot==='head');state.inventory=[{id:'normal-head',template:r.ItemID,name:r.Name,slot:'head',rarity:r.Rarity,enhance:3,gems:[],sockets:0}];state.equipment.head=null;mobilePrepareManageTab_='equip';render();void requestReadyRoom24_('main','一般關卡整備',()=>{});}, {data:JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json')),view});
 if(view==='desktop'){const badges=page.locator('#readyRoom24 .prepare-skills-area .skill-category179');assert.ok(await badges.count()>0);for(const badge of await badges.all())assert.equal(await badge.isVisible(),true);}
 const before=await page.evaluate(()=>JSON.stringify(mist465_.data));
 await page.locator('#readyRoom24 .paperdoll-slot204').first().scrollIntoViewIfNeeded();await page.waitForTimeout(100);await page.locator('#readyRoom24 .paperdoll-slot204').first().click();await page.getByRole('menuitem',{name:'更換',exact:true}).click();
 assert.equal(await page.locator('#quickPicker[data-mist470]').count(),0);
 if(view==='desktop'){await page.locator('.pick-tile401').last().click();await page.locator('.pick-card401 footer .primary').click();}else await page.locator('.quick-option-actions button').last().click();
 assert.equal(await page.evaluate(()=>state.equipment.head),'normal-head');
 if(await page.locator('#uiAlertOverlay').count())await page.locator('#uiAlertOverlay button').click();
 await page.evaluate(()=>openPrepareSkillPicker('active',0));
 if(view==='desktop'){await page.locator('.pick-tile401').last().click();assert.equal(await page.locator('.pick-title401 .skill-category179').innerText(),'魔法');assert.equal(await page.locator('.pick-tile401>.skill-category179').count(),2);await page.locator('.pick-card401 footer .primary').click();}else await page.locator('.quick-option-actions button').last().click();
 assert.equal(await page.evaluate(()=>state.equippedSkills[0]),'magicMissileIII');
 assert.equal(await page.evaluate(()=>JSON.stringify(mist465_.data)),before);
 assert.deepEqual(errors,[]);await page.close();console.log(view,'normal preparation actions and mode isolation passed');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
