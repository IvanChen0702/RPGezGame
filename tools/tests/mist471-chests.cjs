const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
const {reduceMist468}=await import('../../supabase/functions/game-api/mist-runtime468.js');
const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));data.MistConfig.find(x=>x.Key==='Enabled').Value=true;
const engine=process.env.BROWSER||'chromium',browser=await (engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
try{for(const [view,width,height] of [['desktop',1440,900],['mobile',390,844]]){
 let input={world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},now:'2026-11-16T01:00:00Z',planning:{data,dataVersion:'fixture'},save:{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]},rewards:[],nickname:'test'};
 const replies=new Map();let drop='chest/open';
 const call=async(action,body={})=>{if(replies.has(body.requestId))return replies.get(body.requestId);const r=await reduceMist468(input,'preview-adventurer',action.slice(5),body,()=>.4);if(r.world)input.world=r.world;if(body.requestId)replies.set(body.requestId,r.result);if(action==='mist/'+drop){drop='';return {ok:false,error:'MIST_RETRY'}}return r.result;};
 const p=await browser.newPage({viewport:{width,height},hasTouch:view==='mobile'}),errors=[];
 p.on('pageerror',e=>{if(!e.message.startsWith('ResizeObserver'))errors.push(e.message)});
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.exposeFunction('mistRpc471',call);
 async function setup(){await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});await p.evaluate(({data,view})=>{installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);planningReady412_=()=>true;render=previewOriginalRender465;mist465_.preview=false;mist465_.data=null;apiPost=(a,b)=>mistRpc471(a,b);render();},{data,view});await p.evaluate(()=>refreshMist465_());}
 await setup();await p.getByRole('button',{name:'參加本季',exact:true}).click();await p.waitForFunction(()=>mist465_.data?.self&&!mist465_.loading);
 await p.getByRole('tab',{name:'棋盤',exact:true}).click();await p.waitForFunction(()=>!!mist465_.pending&&!mist465_.loading);
 assert.equal(input.world.players['preview-adventurer'].inventory.equipment.length,4);
 await p.getByRole('button',{name:'重試同筆操作',exact:true}).click();await p.waitForSelector('#mistChest471');
 assert.match(await p.locator('#mistChest471 .g431-pose0').getAttribute('src'),/equipment-chest479/);
 // Reload during the actual shared ceremony; the server retains the very same four items.
 const ids=input.world.players['preview-adventurer'].inventory.equipment.map(x=>x.id);
 await setup();await p.waitForSelector('#mistChest471');await p.locator('#mistChest471 .g431-skip').click();
 await p.waitForSelector('#mistChest471.g431-complete');
 assert.equal(await p.locator('#mistChest471 .g431-tile').count(),4);
 await p.mouse.move(0,0);await p.evaluate(()=>prepareTooltipHide_());await p.waitForTimeout(650);
 const buttons=await p.locator('#mistChest471 .gift-actions101 button:visible').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height}}));assert.ok(buttons.every(r=>r.w>=100&&r.h>=40),'reward buttons remain horizontal and usable');
 await p.screenshot({path:`/workspace/work/mist465-preview/${engine}-${width}-chest471.png`,fullPage:true});
 drop='chest/confirm';await p.locator('#mistChest471 [data-equip471]').click();await p.waitForSelector('#mistChest471 [data-retry471]:not([hidden])');
 await p.locator('#mistChest471 [data-retry471]').click();await p.waitForSelector('#mistChest471',{state:'detached'});
 assert.deepEqual(new Set(Object.values(input.world.players['preview-adventurer'].equipment).map(x=>x.id)),new Set(ids));
 assert.equal(input.world.players['preview-adventurer'].energy,10);
 // Confirming respawn immediately opens the fresh private starter, without another button.
 let player=input.world.players['preview-adventurer'];player.runtime.dead=true;player.runtime.starter=null;player.equipment={};player.inventory={equipment:[],gems:[],chests:[]};player.pending_loot=[];player.hp=0;
 await p.evaluate(()=>refreshMist465_());await p.evaluate(()=>mistCommand465_('respawn'));
 await p.waitForSelector('#mistChest471');assert.equal(await p.getByRole('button',{name:'開啟補給箱',exact:true}).count(),0);await p.waitForSelector('#mistChest471');await p.locator('#mistChest471 .g431-skip').click();await p.locator('#mistChest471 [data-keep471]').click();await p.waitForSelector('#mistChest471',{state:'detached'});
 assert.equal(input.world.players['preview-adventurer'].inventory.equipment.length,4);
 input.now='2026-11-16T01:31:00Z';await call('mist/status');
 const monster=input.world.cells.find(x=>x.kind==='monster'),me=input.world.cells.find(x=>x.kind==='player'&&x.owner_account==='preview-adventurer');
 input.world.cells=input.world.cells.filter(x=>x===me||!(x.x===monster.x+1&&x.y===monster.y));Object.assign(me,{x:monster.x+1,y:monster.y});monster.payload.hp=1;
 await p.evaluate(()=>refreshMist465_());await p.evaluate(targetId=>mistCommand465_('battle/start',{targetId}),monster.id);
 await p.waitForSelector('.mist-shared470');
 await p.evaluate(()=>{window.earlyChest471=false;const show=mistShowChest471_;mistShowChest471_=function(...args){if(mistAnimating470_||mistPresentation471_)earlyChest471=true;return show(...args)};void mistTurn470_('slash');});
 await p.waitForSelector('#mistChest471');assert.equal(await p.evaluate(()=>earlyChest471),false,'combat loot only opens after the last hit and result');
 assert.equal(await p.evaluate(()=>mist465_.data.battle.result),'win');
 await p.locator('#mistChest471 .g431-skip').click();await p.locator('#mistChest471 [data-keep471]').click();await p.waitForSelector('#mistChest471',{state:'detached'});
 assert.equal(await p.evaluate(()=>mist465_.data.inventory.chests.length),0,'battle chest auto opened');
 input.world.players['preview-adventurer'].inventory.chests.push({id:'legendary479',kind:'chest',name:'傳說裝備寶箱',legendary:true});
 await p.evaluate(()=>refreshMist465_());await p.waitForSelector('#mistChest471.g431-open');
 assert.match(await p.locator('#mistChest471 .g431-pose0').getAttribute('src'),/legendary-chest479/);
 assert.match(await p.locator('#mistChest471 .g431-pose2').getAttribute('src'),/legendary-chest-open479/);
 assert.equal(await p.locator('#mistChest471 .g431-chest img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)),true);
 await p.screenshot({path:`/workspace/work/mist465-preview/${engine}-${width}-legendary479.png`,fullPage:true});
 await p.locator('#mistChest471 .g431-skip').click();await p.locator('#mistChest471 [data-keep471]').click();await p.waitForSelector('#mistChest471',{state:'detached'});
 assert.deepEqual(errors,[]);await p.close();console.log(engine,view,'opening/confirmation lost replies, reload during ceremony, exact-once equip and respawn passed');
}}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
