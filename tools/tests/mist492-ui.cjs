const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
const {reduceMist468}=await import('../../supabase/functions/game-api/mist-runtime468.js');
const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
for(const [k,v]of Object.entries({Enabled:true,EnergyInitial:20,EnergyCap:20,EnergyRecoveryMinutes:30,RoadChestCap:5,RoadChestRespawnMinutes:30,RoadChestLegendaryPercent:30,RoadChestRandomPercent:40,RoadChestTrapPercent:30,RoadChestTrapHpPercent:80})){const row=data.MistConfig.find(x=>x.Key===k);if(row)row.Value=v;else data.MistConfig.push({Key:k,Value:v});}
const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
fs.mkdirSync('/workspace/outputs/mist492',{recursive:true});
try{for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844],['mobile',360,640]]){
 let input={world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},now:'2026-11-18T01:00:00Z',planning:{data,dataVersion:'fixture492'},save:{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]},rewards:[],nickname:'test'};
 const replies=new Map();let loseReply=false,roll=.9,opens=0;
 const call=async(action,body={})=>{if(body.requestId&&replies.has(body.requestId))return replies.get(body.requestId);try{const r=await reduceMist468(input,'preview-adventurer',action.slice(5),body,()=>roll);if(r.world)input.world=r.world;if(body.requestId)replies.set(body.requestId,r.result);if(action==='mist/road-chest/open')opens++;if(loseReply&&action==='mist/road-chest/open'){loseReply=false;throw Error('offline after commit');}return r.result;}catch(e){if(e.message.startsWith('MIST_'))return {ok:false,error:e.message};throw e;}};
 await call('mist/join');const player=input.world.players['preview-adventurer'];player.runtime.starter.opened=true;player.energy=0;player.hp=500;player.max_hp=1000;
 const me=input.world.cells.find(x=>x.kind==='player');Object.assign(me,{x:4,y:6});
 const chest=()=>{input.world.cells=input.world.cells.filter(x=>!(x.x===5&&x.y===6));const c={id:crypto.randomUUID(),season_id:input.world.season.id,x:5,y:6,kind:'road_chest',owner_account:null,payload:{name:'路邊寶箱'}};input.world.cells.push(c);return c;};chest();
 const p=await browser.newPage({viewport:{width,height},hasTouch:view==='mobile'}),errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.exposeFunction('mistRpc492',call);
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});await p.evaluate(({data,view})=>{installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);planningReady412_=()=>true;render=previewOriginalRender465;mist465_.preview=false;mist465_.tab='map';mist465_.data=null;apiPost=(a,b)=>mistRpc492(a,b);render();},{data,view});await p.evaluate(()=>refreshMist465_());await p.evaluate(()=>mistCenter465_());
 await p.locator('[data-x="5"][data-y="6"]').click();assert.equal(await p.locator('.mist-target-art465 img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
 assert.match(await p.locator('.mist-target-details490').innerText(),/目前 HP −80%/);await p.screenshot({path:`/workspace/outputs/mist492/${engine}-${width}-details.png`});
 await p.getByRole('button',{name:'開啟寶箱 · 免費',exact:true}).click();assert.match(await p.locator('#uiConfirmOverlay').innerText(),/30%.*傳說裝備/s);assert.match(await p.locator('#uiConfirmOverlay').innerText(),/40%.*隨機裝備/s);
 await p.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#uiConfirmOverlay .ui-confirm-card')).opacity)>.99);
 await p.screenshot({path:`/workspace/outputs/mist492/${engine}-${width}-confirm.png`});
 const box=await p.locator('#uiConfirmOverlay .ui-confirm-card').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1);
 await p.locator('#uiConfirmCancel').click();assert.equal(opens,0);assert.equal(input.world.players['preview-adventurer'].hp,500);
 await p.getByRole('button',{name:'開啟寶箱 · 免費',exact:true}).click();loseReply=true;await p.locator('#uiConfirmOk').click();await p.waitForFunction(()=>!!mist465_.pending&&!mist465_.loading);assert.equal(opens,1);assert.equal(input.world.players['preview-adventurer'].hp,100);
 await p.evaluate(()=>mistRetry465_());await p.waitForSelector('.mist-trap492');assert.equal(opens,1);assert.match(await p.locator('.mist-trap492').innerText(),/損失 400 HP/);assert.equal(await p.locator('.mist-trap492 [role="progressbar"]').getAttribute('aria-valuenow'),'100');await p.screenshot({path:`/workspace/outputs/mist492/${engine}-${width}-trap.png`});await p.locator('.mist-trap492 button').click();await p.evaluate(()=>refreshMist465_());assert.equal(await p.locator('.mist-trap492:visible').count(),0);
 for(const [value,legendary] of [[.4,false],[.1,true]]){
  roll=value;chest();await p.evaluate(()=>refreshMist465_());await p.evaluate(()=>mistCellClick469_(5,6));await p.getByRole('button',{name:'開啟寶箱 · 免費',exact:true}).click();await p.locator('#uiConfirmOk').click();await p.waitForSelector('#mistChest471');
  assert.match(await p.locator('#mistChest471 .g431-pose0').getAttribute('src'),legendary?/legendary-chest479/:/equipment-chest479/);
  await p.locator('#mistChest471 .g431-skip').click();await p.waitForSelector('#mistChest471.g431-complete');assert.equal(await p.locator('#mistChest471 .g431-tile').count(),1);await p.screenshot({path:`/workspace/outputs/mist492/${engine}-${width}-${legendary?'legendary':'random'}.png`});
  await p.locator(legendary?'#mistChest471 [data-keep471]':'#mistChest471 [data-equip471]').click();await p.waitForSelector('#mistChest471',{state:'detached'});
 }
 assert.equal(input.world.players['preview-adventurer'].energy,0);assert.equal(Object.values(input.world.players['preview-adventurer'].equipment).length,1);assert.equal(input.world.players['preview-adventurer'].inventory.equipment.length,1);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);console.log(engine,width,'real reducer: cancel/free/confirmation, lost trap reply+retry, HP bar, both ceremonies/equip, no overflow or JS errors passed');await p.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
