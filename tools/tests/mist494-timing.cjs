// Actual normal-battle flow vs server-authoritative Mist, using isolated fixtures only.
const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {createMistCombat468}=await import('../../supabase/functions/game-api/mist-combat468.js');
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const engine=process.env.BROWSER||'chromium',browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
 try{for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844]]){
 const p=await browser.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 for(const scenario of ['dot','regen','curse','heal_block','bleed','paralysis','weakness','suppression','armor_break','blind','forget','blessing','invincible','block','brand','enhancement_lock','heal','healII','healIV','freeze','stun','skip']){
 const stats={hp:10000,patk:100,matk:100,def:20,crit:0,critDamage:100};
 const c=createMistCombat468(data,()=>.4),skill=scenario==='regen'?'healIII':scenario.startsWith('heal')&&scenario!=='heal_block'?scenario:'slash';
 const a={name:'測試旅人',stats,skills:[skill],passive:null,equipmentList:[],ai:[]},d={...a,name:'測試守衛',stats:{...stats,matk:0},skills:[]};
 const start=c.create(a,d,5000,10000);if(scenario==='skip')start.defender.status.armor_break={turns:2,stacks:1};
 if(scenario==='dot'){for(const actor of [start.attacker,start.defender]){actor.status.poison={turns:1,stacks:2};actor.status.burning={turns:1,stacks:1};}}
 else if(scenario!=='regen'&&!['heal','healII','healIV','skip'].includes(scenario)){start.attacker.status[scenario]={turns:['freeze','stun'].includes(scenario)?1:2,stacks:1};if(['curse','heal_block'].includes(scenario)){start.attacker.regen=100;start.attacker.regenTurns=2;}}
 const end=await c.turn(start,scenario==='skip'?'skip':skill);
 const actual=await p.evaluate(async({data,view,stats,scenario,skill})=>{
  installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyStatusRows494_(data.StatusEffects);
  planningReady412_=()=>true;render=previewOriginalRender465;save=()=>{};wait=async()=>{};Math.random=()=>.4;
  state.base=stats;state.equipment={rings:[null,null,null,null]};state.inventory=[];state.passive=[];state.equippedSkills=[skill];state.battleLog=[];state.battleVisual={busy:false};
  const b=state.currentBattle={floor:1,enemyKey:'compare494',enemyData:{name:'測試守衛',...stats,matk:0,boss:false},playerHp:5000,enemyHp:10000,turn:1,enemyBonusPatk:0,enemyPoison:0,enemyBurning:0,poison:0,burning:0,arcaneStacks:0,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false};
  if(scenario==='skip')applyBattleStatus_('enemy','armor_break',{duration:2});
  if(scenario==='dot'){b.poison=b.enemyPoison=2;b.burning=b.enemyBurning=1;}
  else if(scenario!=='regen'&&!['heal','healII','healIV','skip'].includes(scenario)){applyBattleStatus_('player',scenario,{duration:['freeze','stun'].includes(scenario)?1:2});if(['curse','heal_block'].includes(scenario)){Object.assign(ensureBattleBuffs(),{regen:100,regenTurns:2});}}
  state.page='battle';render();if(scenario==='skip')await skipPlayerTurn();else await useSkill(0);
  return {hp:b.playerHp,enemyHp:b.enemyHp,regenTurns:b.playerBuffs?.regenTurns||0,cd:b.cooldowns,status:b.statuses.player,enemyStatus:b.statuses.enemy};
 },{data,view,stats,scenario,skill});
 assert.equal(end.attacker.hp,actual.hp,scenario+' player HP normal/Mist');assert.equal(end.defender.hp,actual.enemyHp,scenario+' enemy HP normal/Mist');
 assert.equal(end.attacker.regenTurns,actual.regenTurns,scenario+' regen rounds');assert.deepEqual(end.attacker.cooldowns,actual.cd,scenario+' cooldowns');
 for(const [id,v]of Object.entries(actual.status))if(id!=='block')assert.equal(end.attacker.status[id]?.turns,v.duration,scenario+' status turns');
 for(const [id,v]of Object.entries(actual.enemyStatus))assert.equal(end.defender.status[id]?.turns,v.duration,scenario+' enemy status turns');
 // Validate actual shared UI, including intermediate frames, without live mutation.
 await p.evaluate(({start,end,stats})=>{
  mist465_.preview=false;mist465_.data={ok:true,ready:true,self:{revision:1,hp:end.attacker.hp,maxHp:10000,energy:9,points:0},equipment:{},skills:{active:start.attacker.skills,passive:null},stats,battle:{...start,id:'test494',defender:{...start.defender,art:'normal-1'}}};state.page='mist';mistSyncBattle470_();render();
  mistPresentation471_={owner:cloudMeta.accountId,battle:mist465_.data.battle};for(const e of end.events471)mistFrame471_(e.frame);mistPresentation471_=null;
 },{start,end,stats});
 assert.equal(await p.locator('#enemyBattleStats').count(),1);assert.match(await p.locator('#enemyBattleStats').innerText(),/100/);
 if(scenario==='dot'){const tags=await p.locator('#playerStatusZone').textContent();assert.match(tags,/中毒.*2層/s);assert.doesNotMatch(tags,/中毒[^\n]*R/);}
 if(scenario==='regen')assert.match(await p.locator('#playerStatusZone').textContent(),/再生/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 console.log(engine,view,scenario,'normal/Mist HP, cooldown, regen/status timers and shared HUD passed');
 }
 assert.deepEqual(errors,[]);await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
