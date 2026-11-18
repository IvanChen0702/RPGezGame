const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const {createMistCombat468}=await import('../../supabase/functions/game-api/mist-combat468.js');
 const c=createMistCombat468(data,()=>.4),a=c.snapshot({nickname:'旅人',equipment:{},skills:{active:['slash']}}),b=c.create(a,{...a,name:'熔金守衛'});
 b.id='battle495';b.defender.art='elite-2';b.defender.description='每三回合施放重擊；開場獲得護盾。\n生命低於一半時進入狂暴，物理攻擊提升。';b.defender.status={};
 const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
 fs.mkdirSync('/workspace/outputs/mist495',{recursive:true});
 try{for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844],['mobile',320,568],['mobile',844,390]]){
  const p=await browser.newPage({viewport:{width,height},hasTouch:view==='mobile'}),errors=[];p.on('pageerror',e=>{if(!e.message.startsWith('ResizeObserver'))errors.push(e.message)});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
  await p.evaluate(({data,b,view})=>{
   installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);planningReady412_=()=>true;render=previewOriginalRender465;mist465_.preview=false;mist465_.tab='map';
   mist465_.data.skills={active:['slash'],passive:null};mist465_.data.ownedSkills=['slash'];mist465_.data.equipment={};window.fixture495=structuredClone(b);window.calls495=[];window.fail495=false;window.receipt495=false;
   window.show495=(finished=false,dead=false)=>{closeModal();mistClosePrep474_(false);mistAfterBattlePrep495_=null;mist465_.pending=null;mist465_.error='';mist465_.loading=false;mist465_.data.battle={...structuredClone(fixture495),finished,result:finished?'win':null};mist465_.data.self={...mist465_.data.self,dead,hp:100,maxHp:200,battleId:finished?null:fixture495.id};mist465_.data.stats=fixture495.attacker.stats;mist465_.data.starter=null;mist465_.data.inventory.chests=[];mist465_.data.chestReveals471=[];mist465_.data.pendingLoot=[];state.page='mist';mistSyncBattle470_();render();};
   apiPost=async(action,payload)=>{calls495.push({action,payload});if(fail495){fail495=false;throw Error('test timeout');}const next=structuredClone(mist465_.data);if(action==='mist/battle/leave'){next.battle=null;next.self.battleId=null;if(receipt495)next.chestReveals471=[{id:'reward495',name:'裝備寶箱',items:[]}];}else if(action==='mist/chest/confirm'){next.chestReveals471=[];}else throw Error('Unexpected mutation '+action);return next;};show495();
  },{data,b,view});
  await p.locator('#enemyCombatant .battle-help-btn').click();await p.waitForTimeout(80);
  assert.equal(await p.locator('#modalBody h3').allTextContents().then(x=>x.filter(t=>t==='目前效果').length),1);
  assert.equal(await p.locator('.mist-behavior495 p').count(),3);assert.equal(await p.locator('#modalBody>.current-effects398').count(),0);
  assert.ok(await p.locator('#modalBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  const box=await p.locator('#modal>.modal-box').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,JSON.stringify(box));
  const layout=await p.locator('#modalBody').evaluate(e=>({client:e.clientHeight,scroll:e.scrollHeight,last:e.lastElementChild.getBoundingClientRect().bottom,bottom:e.getBoundingClientRect().bottom}));assert.ok(layout.bottom-layout.last<45,'no large trailing blank area '+JSON.stringify(layout));
  await p.screenshot({path:`/workspace/outputs/mist495/${engine}-${width}-enemy.png`});
  await p.evaluate(()=>{closeModal();arenaBattle_.defender.description='';arenaBattle_.defender.art=null;mistStatusInfo470_('defender');});assert.equal(await p.locator('.mist-behavior495').count(),0);assert.match(await p.locator('#modalBody').innerText(),/技能配置不公開/);
  await p.evaluate(()=>show495(true));
  const actions=p.locator('.battle-actions-v2');await p.getByRole('button',{name:'開啟整備',exact:true}).scrollIntoViewIfNeeded();assert.equal(await actions.locator('button').count(),2);
  const rects=await actions.locator('button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{top:r.top,h:r.height}}));assert.equal(rects[0].top,rects[1].top);assert.ok(rects.every(x=>x.h>=(view==='mobile'?44:32)),JSON.stringify(rects));await p.screenshot({path:`/workspace/outputs/mist495/${engine}-${width}-result.png`});
  await p.getByRole('button',{name:'開啟整備',exact:true}).click();await p.waitForSelector('#mistPrep474');assert.equal(await p.evaluate(()=>state.page),'mist');assert.equal(await p.locator('#mistPrep474 .inventory-main-tabs button').count(),3);
  await p.evaluate(()=>show495(true));await p.getByRole('button',{name:'返回棋盤',exact:true}).click();await p.waitForFunction(()=>state.page==='mist');assert.equal(await p.locator('#mistPrep474').count(),0);
  // Failed leave preserves the same request ID, and opens prep only after confirmed retry.
  await p.evaluate(()=>{show495(true);fail495=true;calls495=[];});await p.getByRole('button',{name:'開啟整備',exact:true}).click();await p.waitForFunction(()=>!!mist465_.error);assert.equal(await p.locator('#mistPrep474').count(),0);await p.getByRole('button',{name:'重試同筆操作',exact:true}).click();await p.waitForSelector('#mistPrep474');const calls=await p.evaluate(()=>calls495);assert.equal(calls[0].payload.requestId,calls[1].payload.requestId);
  await p.evaluate(()=>show495(true,true));assert.equal(await p.getByRole('button',{name:'開啟整備',exact:true}).isDisabled(),true);
  // Existing reward ceremony has priority; prep resumes after accepting the result.
  await p.evaluate(()=>{show495(true);receipt495=true;});await p.getByRole('button',{name:'開啟整備',exact:true}).click();await p.waitForSelector('#mistChest471');assert.equal(await p.locator('#mistPrep474').count(),0);await p.locator('#mistChest471 .g431-skip').click();await p.locator('#mistChest471 [data-keep471]').click();await p.waitForSelector('#mistPrep474');assert.equal(await p.locator('#mistChest471').count(),0);
  assert.deepEqual(errors,[]);console.log(engine,width,'enemy info layout, shared prep, return, retry, death guard and chest ordering passed');await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
