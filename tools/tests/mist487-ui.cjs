const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
const {reduceMist468}=await import('../../supabase/functions/game-api/mist-runtime468.js');
const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
for(const [k,v]of Object.entries({Enabled:true,EnergyInitial:20,EnergyCap:20,EnergyRecoveryMinutes:30,StaminaPackCap:10,StaminaPackWarningMinutes:30,StaminaPackEnergy:10,AirdropVisionRadius:2})){const row=data.MistConfig.find(x=>x.Key===k);if(row)row.Value=v;else data.MistConfig.push({Key:k,Value:v});}
const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
fs.mkdirSync('/workspace/outputs/mist487',{recursive:true});
try{for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844],['mobile',360,640]]){
 let input={world:{revision:0,meta:{},season:null,players:{},cells:[],flags:[]},now:'2026-11-18T01:00:00Z',planning:{data,dataVersion:'fixture487'},save:{skillsOwned:['slash'],equippedSkills:['slash'],passive:[]},rewards:[],nickname:'test'};
 const replies=new Map();let loseReply=false;
 const call=async(action,body={})=>{if(body.requestId&&replies.has(body.requestId))return replies.get(body.requestId);try{const r=await reduceMist468(input,'preview-adventurer',action.slice(5),body,()=>.4);if(r.world)input.world=r.world;if(body.requestId)replies.set(body.requestId,r.result);if(loseReply&&action==='mist/resource/claim'){loseReply=false;throw Error('offline after commit');}return r.result;}catch(e){if(e.message.startsWith('MIST_'))return {ok:false,error:e.message};throw e;}};
 await call('mist/join');const player=input.world.players['preview-adventurer'];player.runtime.starter.opened=true;player.energy=7;
 const me=input.world.cells.find(x=>x.kind==='player');Object.assign(me,{x:4,y:6});
 const season_id=input.world.season.id;
 input.world.cells=input.world.cells.filter(x=>x.kind==='player');const mk=(kind,x,y,payload)=>({id:crypto.randomUUID(),season_id,x,y,kind,owner_account:null,payload});
 const pack=mk('stamina_spawn',5,6,{name:'體力補包',spawnAt:'2026-11-18T01:30:00Z'}),air=mk('airdrop',8,6,{name:'空降資源',radius:2});input.world.cells.push(pack,air,mk('spawn',4,5,{name:'燼火小鬼',art:'normal-1',spawnAt:'2026-11-18T01:30:00Z'}));
 input.world.flags=[{season_id,x:3,y:6,owner_account:'preview-adventurer',created_at:input.now},{season_id,x:12,y:12,owner_account:'preview-adventurer',created_at:input.now}];
 const p=await browser.newPage({viewport:{width,height},hasTouch:view==='mobile'}),errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.exposeFunction('mistRpc487',call);
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});await p.evaluate(({data,view})=>{installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);planningReady412_=()=>true;render=previewOriginalRender465;mist465_.preview=false;mist465_.tab='map';mist465_.data=null;apiPost=(a,b)=>mistRpc487(a,b);render();},{data,view});await p.evaluate(()=>refreshMist465_());await p.evaluate(()=>mistCenter465_());
 const toolbar=p.locator('.mist-view-tools487');assert.ok(await toolbar.isVisible());assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.ok(await p.locator('.mist-map-scroll465').evaluate(el=>el.clientHeight>=180));
 assert.equal(await p.locator('[data-x="5"][data-y="6"] .mist-stamina-circle487').count(),1);assert.equal(await p.locator('[data-x="5"][data-y="6"] img').count(),0);
 assert.equal(await p.locator('[data-x="4"][data-y="5"] .mist-stamina-circle487').count(),0);
 await p.getByRole('button',{name:'查看其它視野',exact:true}).click();assert.equal(await p.locator('.mist-vision487').count(),3);
 await p.screenshot({path:`/workspace/outputs/mist487/${engine}-${width}-visions.png`});
 const before=[input.world.players['preview-adventurer'].energy,input.world.cells.find(c=>c.kind==='player').x,input.world.cells.find(c=>c.kind==='player').y];
 await p.locator('.mist-vision487').filter({hasText:'我的旗幟 2'}).click();assert.deepEqual([input.world.players['preview-adventurer'].energy,input.world.cells.find(c=>c.kind==='player').x,input.world.cells.find(c=>c.kind==='player').y],before);
 assert.ok(await p.locator('.mist-map-scroll465').evaluate(el=>el.scrollTop>0));
 await p.getByRole('button',{name:'回到我的位置',exact:true}).click();
 await p.evaluate(()=>mistCellClick469_(5,6));assert.equal(await p.getByRole('button',{name:'生成中',exact:true}).isDisabled(),true);await p.evaluate(()=>closeModal());
 input.now='2026-11-18T01:30:00Z';await p.evaluate(()=>refreshMist465_());
 assert.ok(await p.locator('[data-x="5"][data-y="6"] img').getAttribute('src').then(v=>v.includes('stamina487')));
 await p.screenshot({path:`/workspace/outputs/mist487/${engine}-${width}-board.png`});
 await p.evaluate(()=>mistCellClick469_(5,6));loseReply=true;await p.getByRole('button',{name:/領取 · 體力/}).click();await p.waitForFunction(()=>!!mist465_.pending&&!mist465_.loading);
 assert.equal(input.world.players['preview-adventurer'].energy,18);await p.evaluate(()=>mistRetry465_());await p.waitForSelector('.mist-resource-result487');assert.match(await p.locator('.mist-resource-result487').innerText(),/體力 \+10/);assert.equal(input.world.players['preview-adventurer'].energy,18);
 await p.locator('.mist-resource-result487 button').click();
 // Move next to airdrop in test world, then exercise the actual claim/open/confirm UI.
 input.world.cells=input.world.cells.filter(x=>x.kind==='player'||!(x.x===7&&x.y===6));Object.assign(input.world.cells.find(x=>x.kind==='player'),{x:7,y:6});await p.evaluate(()=>refreshMist465_());await p.evaluate(()=>mistCenter465_());await p.evaluate(()=>mistCellClick469_(8,6));
 await p.screenshot({path:`/workspace/outputs/mist487/${engine}-${width}-airdrop.png`});
 await p.getByRole('button',{name:'領取傳說裝備寶箱',exact:true}).click();await p.waitForSelector('#mistChest471');assert.match(await p.locator('#mistChest471 .g431-pose0').getAttribute('src'),/legendary-chest479/);
 await p.locator('#mistChest471 .g431-skip').click();await p.waitForSelector('#mistChest471.g431-complete');assert.equal(await p.locator('#mistChest471 .g431-tile').count(),1);await p.locator('#mistChest471 [data-keep471]').click();await p.waitForSelector('#mistChest471',{state:'detached'});
 assert.equal(await p.evaluate(()=>mist465_.data.visions487.some(v=>v.kind==='airdrop')),false);assert.equal(input.world.players['preview-adventurer'].inventory.equipment.length,1);
 assert.deepEqual(errors,[]);console.log(engine,width,'warning art, compact toolbar, camera only, loss/retry receipt, actual legendary ceremony & sight removal passed');await p.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
