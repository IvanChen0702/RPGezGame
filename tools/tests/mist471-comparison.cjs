// Compare actual normal-battle and mode rendering/animation on isolated local fixtures.
const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {createMistCombat468}=await import('../../supabase/functions/game-api/mist-combat468.js');
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const core=createMistCombat468(data,()=>.4),stats={hp:10000,patk:100,matk:100,def:30,crit:0,critDamage:100};
 const a={name:'測試旅人',stats,skills:['magicMissileIII','slash'],passive:null,equipmentList:[],ai:[]},d={...a,name:'測試守衛',skills:[]};
 const initial=core.create(a,d),end=await core.turn(initial,'magicMissileIII');
 const project=b=>({...b,id:'compare471',result:null,attacker:{...b.attacker},defender:{name:b.defender.name,hp:b.defender.hp,maxHp:b.defender.maxHp,status:b.defender.status,shields:b.defender.shields,art:'normal-1'}});
 const engine=process.env.BROWSER||'chromium',browser=await (engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
 try{for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844],['mobile',360,640],['mobile',844,390]]){
  if(process.env.WIDTH&&Number(process.env.WIDTH)!==width)continue;
  const measurements={};
  for(const mode of ['main','mist']){
   const p=await browser.newPage({viewport:{width,height},hasTouch:view==='mobile'}),errors=[];
   p.on('pageerror',e=>{if(!e.message.startsWith('ResizeObserver'))errors.push(e.message)});
   await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
   await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
   await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
   await p.evaluate(({data,view,mode,stats,battle,next})=>{
    installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);
    planningReady412_=()=>true;render=previewOriginalRender465;save=()=>{};state.base=stats;state.equipment={rings:[null,null,null,null]};state.inventory=[];state.passive=[];state.equippedSkills=['magicMissileIII','slash',null];state.skillsOwned=['magicMissileIII','slash'];state.battleLog=[];state.battleVisual={phase:'等待玩家操作',detail:'',busy:false,actor:'player'};battleSpeed=1;
    // Compare with the very same enemy image/background to isolate layout and movement.
    const art='compare471';PIXEL_ART202_[art]=mistAsset465_('enemy','normal-1');enemyArtKey202_=()=>art;
    onlineStages[1]={backgroundKey:'dungeon'};
    if(mode==='main'){
     state.currentBattle={floor:1,enemyKey:'compare471',enemyData:{name:'測試守衛',...stats,hp:10000,patk:100,matk:0,boss:false},playerHp:10000,enemyHp:10000,turn:1,enemyBonusPatk:0,enemyPoison:0,enemyBurning:0,poison:0,burning:0,arcaneStacks:0,arcaneCastMultiplier:1,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false};state.page='battle';
    }else{
     mist465_.preview=false;mist465_.data={ok:true,ready:true,self:{revision:1,hp:10000,maxHp:10000,energy:9,points:0,battleId:battle.id},equipment:{},inventory:{equipment:[],gems:[],chests:[]},skills:{active:['magicMissileIII','slash'],passive:null},stats,battle};state.page='mist';mistSyncBattle470_();
     apiPost=async action=>{if(action==='mist/battle/turn')return {...mist465_.data,battle:next};throw Error('Unexpected network: '+action);};
    }
    render();window.motion471={shots:[],monster:[],hero:[]};
    const attack=pixelAttack192_;pixelAttack192_=function(...args){const ok=attack(...args),e=skillEvent386_(pixelStage192_,pixelSide192_(args[0]),performance.now());if(e)motion471.shots.push({side:e.side,type:e.visual386,index:e.shots386.length});return ok};
    const monster=pixelDrawMonster192_;pixelDrawMonster192_=function(c,a,t,x){if(x)motion471.monster.push(x.type);return monster(c,a,t,x)};
    const hero=pixelDrawHero192_;pixelDrawHero192_=function(c,a,g,t,x,...rest){if(x)motion471.hero.push(x.type);return hero(c,a,g,t,x,...rest)};
   },{data,view,mode,stats,battle:project(initial),next:project(end)});
   await p.waitForTimeout(600);
   measurements[mode]=await p.evaluate(()=>{const rect=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r?{width:Math.round(r.width),height:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y)}:null};return{stage:rect('#battleStage'),layout:rect('.battle-layout'),hp:rect('#playerHpBar111'),enemyHp:rect('#enemyHpBar111'),skill:rect('.battle-command-grid button'),commands:rect('.battle-command-grid'),speed:rect('#battleSpeedBtn'),auto:rect('#battleAutoBtn262'),skip:rect('.skip-turn-btn'),retreat:rect('.mobile-turn-controls34 .danger,.desktop-battle-footer58 .danger'),nav:getComputedStyle(document.querySelector('#mainNav')).display,overflow:document.documentElement.scrollWidth>innerWidth+1}});
   await p.screenshot({path:`/workspace/work/mist465-preview/${engine}-${width}-${mode}-compare471.png`,fullPage:true});
   await p.evaluate(mode=>{window.run471=mode==='main'?useSkill(0):mistTurn470_('magicMissileIII');},mode);
   await p.evaluate(()=>run471);
   const proof=await p.evaluate(()=>motion471);
   assert.deepEqual(proof.shots.filter(x=>x.side==='player'&&x.type==='missile').map(x=>x.index),[1,2,3,4],`${mode}: all four shared projectiles`);
   assert.ok(proof.monster.includes('attack'),`${mode}: enemy forward attack actually drawn`);assert.ok(proof.monster.includes('hit'),`${mode}: enemy hit actually drawn`);assert.ok(proof.hero.includes('hit'),`${mode}: player hit actually drawn`);
   assert.deepEqual(errors,[]);assert.equal(measurements[mode].overflow,false);if(view==='mobile')assert.equal(measurements[mode].nav,'none');
   await p.close();
  }
  fs.writeFileSync(`/workspace/work/mist465-preview/${engine}-${width}-compare471.json`,JSON.stringify(measurements,null,2));
  // Shared stage/controls must use the same dimensions; mode-specific text may differ.
  for(const key of ['stage','layout','hp','enemyHp','commands','speed','auto','skip','retreat']){
   assert.deepEqual(measurements.mist[key],measurements.main[key],`${width} ${key} geometry`);
  }
  console.log(engine,view,width,'normal/mist four projectiles, enemy attack, both hit reactions and matching stage/HUD/controls geometry passed');
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
