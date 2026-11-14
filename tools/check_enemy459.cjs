/* Local fixtures only. GAME_TEST_ENGINE=webkit exercises Safari's engine. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const engines=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const engine=process.env.GAME_TEST_ENGINE||'chromium',out=process.env.ENEMY_TEST_OUT||'/workspace/work/enemy459';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await engines[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{headless:true});
 try{
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:3}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
 await p.addStyleTag({content:'#accountOverlay{display:none!important}body.login-required-lock #app{filter:none!important;pointer-events:auto!important}'});
await p.evaluate(()=>{state=defaultState();state.page='battle';state.base={hp:10000,patk:100,matk:100,def:30,crit:0,critDamage:100};viewModePreference_='mobile';initialEntryShown45_=true;state.currentBattle={floor:48,enemyKey:'dragonVeinWarlock',enemyData:{name:'龍脈咒師',hp:1900,patk:0,matk:110,def:85,boss:false},playerHp:900,enemyHp:687,turn:9,statuses:{player:{},enemy:{}},magicShield:{hp:0,max:0,turns:0,breakMatk:0},cooldowns:{},phasePatkMult:1,phaseMatkMult:1,phaseDefMult:1,behaviorTriggered:{},won:false,lost:false};onlineStages[48]={backgroundKey:'main05'};state.battleVisual={phase:'等待玩家操作',detail:'',busy:false,actor:'player'};state.battleLog=[];render();});
 await p.evaluate(()=>artImage202_('family_dragonMage').decode());
 const metrics=await p.evaluate(()=>{const im=artImage202_(enemyArtKey202_()),c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(im,0,0,128,128);const d=c.getContext('2d').getImageData(0,0,128,128).data;let count=0,upper=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(d[(y*128+x)*4+3]>24){count++;if(y<64)upper++;}return{size:[im.naturalWidth,im.naturalHeight],metric:spriteMetrics203_(im),count,upper,src:im.src};});
 assert.deepEqual(metrics.size,[128,128]);assert(metrics.count>5000&&metrics.upper>2000,JSON.stringify(metrics));assert(metrics.metric.top<.1&&metrics.metric.foot>.79&&metrics.metric.foot<.82);assert(metrics.src.endsWith('.webp'));
 for(const [mode,width,height] of [['mobile',390,844],['mobile',320,740],['mobile',390,680],['desktop',1440,900]]){
  await p.setViewportSize({width,height});await p.evaluate(mode=>{viewModePreference_=mode;render();},mode);await p.waitForTimeout(400);
  const result=await p.evaluate(()=>{
   const im=artImage202_(enemyArtKey202_()),m=spriteMetrics203_(im),cv=document.createElement('canvas');cv.width=128;cv.height=128;const c=cv.getContext('2d');c.drawImage(im,0,0);const d=c.getImageData(0,0,128,128).data;let foot=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(d[(y*128+x)*4+3]>24)foot=Math.max(foot,y+1);if(foot/128!==m.foot)throw Error('measurement differs from drawn pixels');
   const before=JSON.stringify(state.currentBattle),a=pixelAnchor192_('enemy'),floor=pixelFloor203_(),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1000;const ctx=canvas.getContext('2d');let frames=0;
   for(const type of [null,'hit','attack','magic'])for(const progress of [0,.25,.5,.75,.99]){
    ctx.clearRect(0,0,1200,1000);pixelDrawMonster203_(ctx,a,1000+1000*progress,type?{type,start:1000,duration:1000}:null);
    const px=ctx.getImageData(0,0,1200,1000).data;let top=1000,bottom=0,upper=0;for(let y=0;y<Math.floor(floor);y++)for(let x=0;x<1200;x++)if(px[(y*1200+x)*4+3]>150){top=Math.min(top,y);bottom=Math.max(bottom,y);if(y<floor-12)upper++;}
    if(bottom-top<25||upper<150)throw Error('enemy disappears '+JSON.stringify({type,progress,top,bottom,upper}));frames++;
   }
   if(before!==JSON.stringify(state.currentBattle))throw Error('renderer changed combat state');return{frames,nav:document.getElementById('mainNav').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(result.frames,20);assert(!result.overflow);if(mode==='mobile')assert.equal(result.nav,0);
  await p.evaluate(()=>render());await p.waitForTimeout(150);
  if(width===390||width===1440)await p.screenshot({path:path.join(out,`${engine}-${width}.jpg`),type:'jpeg',quality:82,scale:'css'});
  console.log(engine,mode,width,'idle/hit/attack/cast, pixel visibility, foot metrics, rerender PASS');
 }
 assert.deepEqual(errors,[]);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
