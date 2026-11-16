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

 const opponent=await reduceMist468(input,'opponent','join',{},()=>.4);input.world=opponent.world;
 const me=input.world.cells.find(c=>c.kind==='player'&&c.owner_account==='preview-adventurer'),them=input.world.cells.find(c=>c.kind==='player'&&c.owner_account==='opponent');
 input.world.cells=input.world.cells.filter(c=>[me,them].includes(c)||!((c.x===5||c.x===6)&&c.y===5));Object.assign(me,{x:5,y:5});Object.assign(them,{x:6,y:5});
 const enemy=input.world.players.opponent;enemy.protected_until=null;
 enemy.equipment=Object.fromEntries(Object.entries(input.world.players['preview-adventurer'].equipment).map(([k,x])=>[k,{...x,id:'enemy-'+k,starter:false}]));
 await p.evaluate(()=>refreshMist465_());await p.evaluate(targetId=>mistCommand465_('battle/start',{targetId}),them.id);
 await p.waitForSelector('.mist-shared470');
 const b=input.world.meta.battles[input.world.players['preview-adventurer'].battle_id];b.combat.defender.hp=1;b.combat.attacker.stats.patk=100000;
 await p.evaluate(()=>{window.earlyChest471=false;const show=mistShowChest471_;mistShowChest471_=function(...args){if(mistAnimating470_||mistPresentation471_)earlyChest471=true;return show(...args)};void mistTurn470_('slash');mistStatusInfo470_('defender');});
 await p.waitForFunction(()=>mist465_.data.battle?.finished&&!mistAnimating470_&&!mistPresentation471_);assert.equal(await p.locator('#mistChest471').count(),0,'status window defers chest without losing it');await p.evaluate(()=>closeModal());
 await p.waitForSelector('#mistChest471',{timeout:15000});assert.equal(await p.evaluate(()=>earlyChest471),false);
 assert.equal(await p.evaluate(()=>mist465_.data.battle.result),'win');

 await p.locator('#mistChest471 .g431-skip').click();await p.locator('#mistChest471 [data-keep471]').click();await p.waitForSelector('#mistChest471',{state:'detached'});
 await p.evaluate(()=>mistCommand465_('battle/leave',{battleId:mist465_.data.battle.id}));
 const next=await reduceMist468(input,'opponent2','join',{},()=>.4);input.world=next.world;
 const target=input.world.cells.find(c=>c.owner_account==='opponent2'&&c.kind==='player');input.world.cells=input.world.cells.filter(c=>c===target||!(c.x===6&&c.y===5));Object.assign(target,{x:6,y:5});
 input.world.players.opponent2.protected_until=null;input.world.players.opponent2.equipment=Object.fromEntries(Object.entries(input.world.players['preview-adventurer'].equipment).map(([k,x])=>[k,{...x,id:'starter-'+k,starter:true}]));
 await p.evaluate(()=>refreshMist465_());await p.evaluate(targetId=>mistCommand465_('battle/start',{targetId}),target.id);
 const b2=input.world.meta.battles[input.world.players['preview-adventurer'].battle_id];b2.combat.defender.hp=1;b2.combat.attacker.stats.patk=100000;
 await p.evaluate(()=>mistTurn470_('slash'));await p.waitForFunction(()=>document.getElementById('page').textContent.includes('重生補給裝備不會掉落'));
 assert.equal(await p.locator('#mistChest471').count(),0);

 await p.getByRole('button',{name:'返回棋盤',exact:true}).click();await p.waitForFunction(()=>!mist465_.loading);
 const supply=input.world.cells.find(c=>c.kind==='supply'),own=input.world.cells.find(c=>c.owner_account==='preview-adventurer'&&c.kind==='player');
 input.world.cells=input.world.cells.filter(c=>c===own||!(c.x===supply.x&&c.y===supply.y+1));Object.assign(own,{x:supply.x,y:supply.y+1});
 await p.evaluate(()=>refreshMist465_());await p.evaluate(({x,y})=>mistCellClick469_(x,y),supply);
 drop='supply';await p.getByRole('button',{name:'取得隨機寶石',exact:true}).click();await p.waitForFunction(()=>mist465_.pending&&!mist465_.loading);
 assert.equal(await p.locator('.mist-supply-result481').count(),0,'lost response cannot invent a reward');
 await p.locator('#modal').getByRole('button',{name:'重試本次操作',exact:true}).click();await p.waitForSelector('.mist-supply-result481');
 const receipt=input.world.players['preview-adventurer'].runtime.supplyReceipt481;
 assert.match(await p.locator('.mist-supply-result481').innerText(),new RegExp(receipt.item.name));
 assert.match(await p.locator('.mist-supply-result481').innerText(),/已加入戰境寶石背包/);
 assert.equal(input.world.players['preview-adventurer'].inventory.gems.length,1);
 await setup();await p.waitForSelector('.mist-supply-result481');assert.match(await p.locator('.mist-supply-result481').innerText(),new RegExp(receipt.item.name));
 await p.locator('.mist-supply-result481').getByRole('button',{name:'確認',exact:true}).click();await p.evaluate(()=>refreshMist465_());assert.equal(await p.locator('.mist-supply-result481').isVisible(),false,'acknowledged receipt does not reopen');
 input.now='2026-11-17T01:00:00Z';await call('mist/status');
 const movedSupply=input.world.cells.find(c=>c.kind==='supply'),own2=input.world.cells.find(c=>c.owner_account==='preview-adventurer'&&c.kind==='player');input.world.cells=input.world.cells.filter(c=>c===own2||!(c.x===movedSupply.x&&c.y===movedSupply.y+1));Object.assign(own2,{x:movedSupply.x,y:movedSupply.y+1});
 input.world.players['preview-adventurer'].inventory.gems=Array.from({length:10},(_,i)=>({id:'gem-'+i,kind:'gem',template:data.Gems[0].GemID}));
 await p.evaluate(()=>refreshMist465_());await p.evaluate(()=>mistCommand465_('supply',{choice:'gem'}));await p.waitForSelector('.mist-supply-result481');assert.match(await p.locator('.mist-supply-result481').innerText(),/背包已滿.*待收戰利品/);
 await p.screenshot({path:`/workspace/work/mist465-preview/${engine}-${width}-supply481.png`,fullPage:true});
 assert.ok(await p.locator('.mist-supply-result481 img').count()>0,'shared item card includes real art');
 console.log(engine,view,'PvP eligible/empty, supply grant/retry/reload/ack/full bag passed');assert.deepEqual(errors,[]);await p.close();
}}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
