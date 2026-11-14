/* Browser regression: synthetic local game state only, all external requests blocked. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.GAME_TEST_URL||'http://127.0.0.1:8443/',out=process.env.AVATAR_TEST_OUT||'/workspace/work/avatar454';fs.mkdirSync(out,{recursive:true});
async function setup(page,mode,sex='female'){
 await page.evaluate(({mode,sex})=>{
  document.getElementById('accountOverlay')?.remove();document.body.classList.remove('login-required-lock');initialEntryShown45_=true;state=defaultState();viewMode_=mode;applyViewMode_();
  localStorage.setItem(avatarPreferenceKey220_(),sex);
  state.base={hp:100000,patk:100,matk:100,def:30,crit:0,critDamage:100};state.currentHp=100000;
  const ids=['thalessiahead','timeMirrorArmor','chronosArcaneStaff'];
  state.inventory=ids.map((template,i)=>({id:'fixture-'+i,template,name:['瑟蕾絲提亞之帽','時鏡法衣','永劫魔杖'][i],slot:['head','armor','weapon'][i],rarity:'傳說',enhance:0,stats:{},gems:[]}));state.equipment={head:'fixture-0',armor:'fixture-1',weapon:'fixture-2',rings:[]};
  for(const it of state.inventory)itemTemplates[it.template]={...it};
  Object.assign(skillTemplates,{magicBurst:{id:'magicBurst',name:'魔力爆發',kind:'magicBurst',hits:2,mult:2,cd:0,type:'active'},heavenlyThunder:{id:'heavenlyThunder',name:'天雷制裁',kind:'heavenlyThunder',hits:3,mult:2,cd:0,type:'active'},magicMissileIII:{id:'magicMissileIII',name:'魔法彈III',kind:'magicMulti',hits:3,mult:.75,cd:0,type:'active'}});
  state.equippedSkills=['magicBurst','heavenlyThunder','magicMissileIII'];state.passive=[];
  window.newBattle454=()=>{state.page='battle';state.currentBattle={floor:1,enemyKey:'slime',enemyData:{name:'測試史萊姆',hp:100000,patk:20,matk:20,def:10,boss:false},playerHp:100000,enemyHp:100000,turn:1,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},arcaneStacks:0,arcaneCastMultiplier:1,phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false};state.battleVisual={phase:'等待玩家操作',detail:'',busy:false,actor:'player'};state.battleLog=[];render();};
 },{mode,sex});
}
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const errors=[];
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).hostname===new URL(url).hostname?r.continue():r.abort());await p.goto(url,{waitUntil:'networkidle'});
 console.log('asset/composition',await p.evaluate(async()=>{
  const keys=Object.keys(PIXEL_ART202_).filter(k=>/^body245_|^head245_|^weapon245_/.test(k));await Promise.all(keys.map(k=>artImage202_(k).decode()));
  const heads=[null,{name:'皮革帽'},{name:'法師帽'},{name:'王冠'},...Object.keys(HEAD_STYLES454_).map(template=>({template}))];
  const armors=[null,{name:'鎖子甲'},{name:'法袍'},{name:'神鎧'},...Object.keys(ARMOR_STYLES454_).map(template=>({template}))];
  let n=0;for(const sex of ['male','female'])for(const head of heads)for(const armor of armors)for(const pose of ['idle','attack','cast']){
   const g={sex,head,armor,hood:/帽/.test(head?.name||''),robe:/袍/.test(armor?.name||''),weapon:{template:'astralLance'},rings:[],kind:'astralLance'};
   const im=femaleHeroComposite220_(g,pose);if(!im||!im.heroFrame250_||im.heroFrame250_.top>=.3)throw Error('missing composite/head '+JSON.stringify({sex,head,armor,pose}));
   const pixels=im.getContext('2d').getImageData(0,0,512,512).data;let nonzero=0;for(let i=3;i<pixels.length;i+=4)nonzero+=pixels[i]>24?1:0;if(nonzero<3000)throw Error('blank composite');n++;
  }
  const weaponKinds=Object.keys(PIXEL_ART202_).filter(k=>k.startsWith('weapon245_'));if(weaponKinds.length!==42)throw Error('weapon count '+weaponKinds.length);
  for(const id of Object.keys(WEAPON_IDS251_).filter(id=>AVATAR_FALLBACKS454_['weapon245_'+id]))for(const enhance of [0,10])if(weaponKind245_('',{},true,enhance,id)!==id)throw Error('lost upgraded shape '+id);
  if(SKILL_MOTIONS454_.magicBurst!=='E'||SKILL_MOTIONS454_.heavenlyThunder!=='F'||Object.values(SKILL_MOTIONS454_).includes('G'))throw Error('skill assignment');
  return {composites:n,weapons:weaponKinds.length,assets:keys.length};
 }));
 for(const [mode,width,height] of [['desktop',1440,900],['mobile',390,844],['mobile',320,740]]){
  await p.setViewportSize({width,height});await setup(p,mode);await p.evaluate(()=>{state.page='prepare';render();});await p.waitForTimeout(400);
  await p.screenshot({path:path.join(out,`prepare-${width}.png`)});
  await p.evaluate(()=>newBattle454());await p.waitForTimeout(350);
  for(const [slot,expected] of [[0,400],[1,600],[2,225]]){
   await p.evaluate(()=>newBattle454());await p.waitForTimeout(150);
   await p.evaluate(slot=>{window.cast454=useSkill(slot);},slot);await p.waitForTimeout(400);
   const motion=await p.evaluate(()=>{const r=pixelStage192_,e=skillEvent386_(r,'player',performance.now()),g=r.gear.player,frame=femaleHeroComposite220_(g,'cast');return {skill:e?.skillId386,lift:e&&['burst','thunder'].includes(e.visual386)?floatingMotion454_(e,performance.now(),pixelAnchor192_('player'),frame).lift:0,nav:document.querySelector('#mainNav')?.getBoundingClientRect().height,canvas:r.canvas.isConnected,overflow:document.documentElement.scrollWidth>innerWidth+1};});
   if(slot<2)assert(motion.lift>0,JSON.stringify(motion));if(mode==='mobile')assert.equal(motion.nav,0,'mobile battle navigation');assert(!motion.overflow,'horizontal overflow');
   if(slot<2&&width!==320)await p.screenshot({path:path.join(out,`cast-${slot}-${width}.png`)});
   await p.evaluate(async()=>{await cast454;});
   const after=await p.evaluate(()=>({hp:state.currentBattle.enemyHp,busy:state.battleVisual.busy}));assert.equal(after.hp,100000-expected,`${mode} skill${slot} damage`);assert(!after.busy);
  }
  console.log(mode,width,'three real skill flows + damage + unlocked controls + navigation PASS');
 }
 await p.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await p.evaluate(()=>{const a=pixelAnchor192_('player'),g=pixelStage192_.gear.player,frame=femaleHeroComposite220_(g,'cast');return floatingMotion454_({type:'skill386',visual386:'thunder',skillId386:'heavenlyThunder',start:0,rate386:1,shots386:[],expected386:3},500,a,frame).lift}),0);
 // Same shared renderer supports the mirrored arena actor; no actor state writes.
 await p.emulateMedia({reducedMotion:'no-preference'});
 console.log('mirrored/reduced-motion',await p.evaluate(()=>{const r=pixelStage192_,g=r.gear.player,a={...pixelAnchor192_('player'),side:'enemy'},before=JSON.stringify(state.currentBattle),c=document.createElement('canvas');c.width=500;c.height=500;pixelDrawHero203_(c.getContext('2d'),a,g,500,{type:'skill386',visual386:'thunder',skillId386:'heavenlyThunder',start:0,duration:1800,rate386:1,shots386:[],expected386:3},false);if(before!==JSON.stringify(state.currentBattle))throw Error('visual changed battle');return 'PASS';}));
 // External-action failure falls back to embedded idle instead of blanking the character.
 await p.route('**/body245_female_4_cast.webp*',r=>r.abort());
 await p.evaluate(()=>{PIXEL_ART202_.body245_female_4_cast+='?test-failure454';delete pixelArtCache202_.body245_female_4_cast;heroCompositeCache228_.clear();artImage202_('body245_female_4_cast');});await p.waitForTimeout(250);
 assert(await p.evaluate(()=>{const g=pixelStage192_.gear.player;return !!artImage202_('body245_female_4_cast').avatarFallback454_&&!!femaleHeroComposite220_(g,'cast');}));
 assert.deepEqual(errors,[]);console.log('external asset fallback + no runtime errors PASS');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
