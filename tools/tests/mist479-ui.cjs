const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
(async()=>{const engine=process.env.BROWSER==='webkit'?'webkit':'chromium',browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true}));
try{for(const [width,height,view]of [[1440,900,'desktop'],[1024,768,'desktop'],[901,760,'desktop'],[390,844,'mobile'],[360,640,'mobile']]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:view==='mobile'}),errors=[];
 p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver loop'))errors.push(e.message)});
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
 await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'mist465-preview-fixture.js'),'utf8')});
 await p.evaluate(({planning,view})=>{
  installMistPreview465(planning,view);planningReady412_=()=>true;render=previewOriginalRender465;
  const d=mist465_.data;d.self={...d.self,x:6,y:6,energy:12,flags:3,energyNextAt:new Date(Date.now()+900000).toISOString()};d.energyRules={cap:20,recoveryMinutes:30};
  d.flagRules={minutes:180,points:1,closesAt:new Date(Date.now()+86400000).toISOString()};
  const flags=[{x:5,y:5,own:true},{x:7,y:7,own:true},{x:9,y:6,own:true},{x:6,y:5,own:false}];
  const visible=new Map();for(const center of [d.self,...flags.filter(f=>f.own)])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=center.x+dx,y=center.y+dy;visible.set(x+','+y,{x,y,object:null});}
  const put=(x,y,o)=>visible.get(x+','+y).object=o;
  for(const f of flags){const c=visible.get(f.x+','+f.y);c.flag={own:f.own,createdAt:new Date(Date.now()-5400000).toISOString()};c.object={kind:'flag',own:f.own,name:f.own?'我的旗幟':'敵方旗幟'};}
  put(7,6,{kind:'monster',id:'wolf',name:'荊棘野狼',art:'normal-6'});
  put(8,7,{kind:'monster',id:'elite',name:'熔金守衛',art:'elite-2',elite:true,busy:true});
  put(5,6,{kind:'player',id:'rival',name:'霧中的旅人',points:18,hp:183,appearance:{sex:'female',suit:2,head:2,kind:'sword'}});
  put(9,5,{kind:'forge',name:'鐵匠鋪'});put(9,7,{kind:'supply',name:'補給站'});
  put(7,5,{kind:'monster',id:'spawn',name:'召喚中',art:'normal-1',countdown:'12:45'});
  d.cells=[...visible.values()];d.reports=[{id:'flag-lost',title:'旗幟被拔除',description:'旅人拔除了你的旗幟，駐守時間已重置。',result:'flag_lost',time:'本季',points:12,position:{x:5,y:5}}];
  mist465_.tab='map';mist465_.selection=null;render();mistCenter465_();
 },{planning:JSON.parse(fs.readFileSync('/workspace/work/catalog463-bootstrap.json')),view});
 await p.waitForFunction(()=>document.querySelector('.self canvas')?.dataset.painted==='true');
 assert.equal(await p.getByRole('progressbar',{name:'體力',exact:true}).getAttribute('aria-valuenow'),'12');
 assert.equal(await p.locator('.mist-energy479>svg').count(),1);
 const resourceSizes=await p.evaluate(()=>({hp:document.querySelector('.mist-hp474').getBoundingClientRect().height,energy:document.querySelector('.mist-energy-track479').getBoundingClientRect().height,top:document.querySelector('.mist-map-scroll465').getBoundingClientRect().top-document.querySelector('.mist-top465').getBoundingClientRect().top}));
 assert.equal(resourceSizes.hp,resourceSizes.energy,'HP and stamina have exactly equal outer height');
 const edges=await p.evaluate(()=>{const hp=document.querySelector('.mist-hp474').getBoundingClientRect(),energy=document.querySelector('.mist-energy-track479').getBoundingClientRect();return {top:Math.abs(hp.top-energy.top),bottom:Math.abs(hp.bottom-energy.bottom)};});
 assert.ok(edges.top<1&&edges.bottom<1,'bars align at both edges, not just height: '+JSON.stringify(edges));
 assert.ok(await p.evaluate(()=>{const timer=document.querySelector('.mist-energy479>small').getBoundingClientRect(),bar=document.querySelector('.mist-energy-track479').getBoundingClientRect(),summary=document.querySelector('.mist-explore-summary469').getBoundingClientRect();return timer.top>=bar.bottom&&timer.bottom<=summary.bottom;}),'countdown stays beneath the bar and inside the resource panel');

 if(view==='mobile')assert.ok(resourceSizes.top<260,'mode controls stay compact: '+JSON.stringify(resourceSizes));

 assert.equal(await p.locator('[data-flag-clock479]').count(),4);
 const timers=await p.locator('[data-flag-clock479]').allTextContents();assert.ok(timers.every(s=>/01:29:|01:30:/.test(s)));
 assert.equal(await p.locator('.mist-cell465[data-x="7"][data-y="5"] img').count(),0,'unspawned monster has no image');
 assert.equal(await p.locator('.mist-busy479').count(),1);
 assert.equal(await p.locator('.fog img,.fog canvas,.fog .mist-flag-label479').count(),0,'fog hides all world objects');
 assert.equal(await p.locator('.mist-room489 .mist-floor489').count(),1);
 assert.ok(await p.locator('.mist-cell465:not(.fog)').evaluateAll(es=>es.every(e=>getComputedStyle(e).backgroundImage==='none')),'visible cells share a continuous floor instead of individually cropped images');

 assert.equal(await p.locator('.mist-flag-label479').evaluateAll(es=>es.every(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.bottom<=b.bottom+1})),true,'flag labels stay inside their cells');
 await p.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-crowd479.png'});
 await p.locator('.mist-cell465[data-x="7"][data-y="6"]').click();
 assert.match(await p.locator('#modalBody').innerText(),/荊棘野狼.*擊敗 \+1 分/s);
 assert.match(await p.locator('#modal .mist-reward479 img').getAttribute('src'),/equipment-chest479/);
 let box=await p.locator('#modal>.modal-box').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1);
 await p.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-monster479.png'});
 await p.evaluate(()=>closeModal());await p.locator('.mist-cell465[data-x="5"][data-y="6"]').click();
 const info=await p.locator('#modalBody').innerText();assert.match(info,/積分 18 · 剩餘 HP 183/);assert.ok(!/物攻|魔攻|防禦|裝備/.test(info),'opponent stats remain private');
 await p.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-player479.png'});
 await p.evaluate(()=>closeModal());await p.getByRole('tab',{name:'戰報',exact:true}).click();assert.match(await p.locator('.mist-report465').innerText(),/座標 6,6/);
 await p.getByRole('tab',{name:'棋盤',exact:true}).click();
 // Confirmed movement uses native walk rig, locks repeat input, and ends at authoritative cell.
 await p.evaluate(()=>{mist465_.preview=false;window.moveCalls479=0;window.moveFrames479=[];apiPost=async(action,payload)=>{moveCalls479++;await new Promise(r=>setTimeout(r,80));const d=clone(mist465_.data);d.self={...d.self,x:payload.x,y:payload.y,energy:d.self.energy-1};return d;};const collect=()=>{const c=document.querySelector('.mist-walker479');if(c)moveFrames479.push(c.style.transform);if(mist465_.loading||!moveFrames479.length)requestAnimationFrame(collect);};requestAnimationFrame(collect);void mistCommand465_('move',{x:6,y:7});});
 await p.waitForSelector('.mist-walker479');await p.evaluate(()=>mistCommand465_('move',{x:6,y:8}));
 await p.waitForFunction(()=>!mist465_.loading);assert.equal(await p.evaluate(()=>moveCalls479),1);
 assert.equal(await p.evaluate(()=>mist465_.data.self.energy),11);
 assert.equal(await p.evaluate(()=>new Set(moveFrames479).size>2),true,'visible intermediate positions');
 assert.equal(await p.locator('.mist-walker479').count(),0);
 assert.equal(await p.locator('.self').getAttribute('data-y'),'7');
 // A rejected move keeps HP, energy, cell and no moving sprite; a lost reply stays retryable.
 await p.evaluate(async()=>{apiPost=async()=>({ok:false,error:'MIST_CELL_BLOCKED'});await mistCommand465_('move',{x:6,y:8});});
 assert.equal(await p.evaluate(()=>mist465_.data.self.energy),11);assert.equal(await p.locator('.self').getAttribute('data-y'),'7');
 assert.equal(await p.locator('.mist-walker479').count(),0);
 await p.emulateMedia({reducedMotion:'reduce'});
 await p.evaluate(async()=>{window.reducedWalk479=false;const observe=new MutationObserver(()=>{if(document.querySelector('.mist-walker479'))reducedWalk479=true;});observe.observe(document.body,{childList:true,subtree:true});apiPost=async()=>({...clone(mist465_.data),self:{...mist465_.data.self,y:8,energy:10}});await mistCommand465_('move',{x:6,y:8});observe.disconnect();mist465_.preview=true;});
 assert.equal(await p.evaluate(()=>reducedWalk479),false);assert.equal(await p.locator('.self').getAttribute('data-y'),'8');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 await p.close();console.log(engine,width,'crowded objects, flag timers, stamina, privacy, popup, coordinates, walk/repeat/rejection/reduced motion passed');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
