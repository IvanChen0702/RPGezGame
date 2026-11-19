const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const engine=process.env.BROWSER||'chromium',b=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
try{for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844],['mobile',360,640]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:view==='mobile'}),errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({data,view})=>{installMistPreview465({data},view);planningReady412_=()=>true;render=previewOriginalRender465;mist465_.tab='map';mist465_.preview=true;window.setupMap489=(size,x,y)=>{const d=mist465_.data;d.size=size;d.self={...d.self,x,y};d.cells=[];for(const [cx,cy]of [[x,y],[Math.floor(size/2),Math.floor(size/2)]])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=cx+dx,yy=cy+dy;if(xx>=0&&yy>=0&&xx<size&&yy<size&&!d.cells.some(c=>c.x===xx&&c.y===yy))d.cells.push({x:xx,y:yy,object:null});}const flag=d.cells.find(c=>c.x===Math.floor(size/2)&&c.y===Math.floor(size/2));flag.object={kind:'flag',name:'我的旗幟',own:true};flag.flag={own:true,createdAt:new Date().toISOString()};d.visions487=[{kind:'flag',x:flag.x,y:flag.y,radius:1,createdAt:flag.flag.createdAt}];render();mistCenter465_();};setupMap489(16,0,0);},{data:JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json')),view});
 for(const [size,x,y]of [[16,0,0],[16,15,0],[16,0,15],[16,15,15],[18,17,17],[32,31,31]]){
  await p.evaluate(([size,x,y])=>setupMap489(size,x,y),[size,x,y]);
  const result=await p.evaluate(()=>{const self=document.querySelector('.self'),r=self.getBoundingClientRect(),board=document.querySelector('.mist-board465').getBoundingClientRect(),room=document.querySelector('.mist-room489').getBoundingClientRect(),viewport=document.querySelector('.mist-map-scroll465').getBoundingClientRect(),click=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {tile:r.width,wall:[board.left-room.left,board.top-room.top,room.right-board.right,room.bottom-board.bottom],visible:r.left>=viewport.left-1&&r.right<=viewport.right+1&&r.top>=viewport.top-1&&r.bottom<=viewport.bottom+1,clickable:click?.closest('.mist-cell465')===self,overflow:document.documentElement.scrollWidth>innerWidth+1,fogObjects:document.querySelectorAll('.fog img,.fog canvas,.fog .mist-flag-label479').length,filters:[...document.querySelectorAll('.mist-fog489 svg')].map(s=>s.getBoundingClientRect().width)}});
  assert.equal(result.tile,64,'fixed world scale on expansion');assert.ok(result.wall.every(n=>n>=90),'all wall faces outside actual playable cells');assert.equal(result.visible,true,'edge spawn remains reachable after centering');assert.equal(result.clickable,true,'decorative fog/walls do not intercept player clicks');assert.equal(result.overflow,false);assert.equal(result.fogObjects,0);assert.ok(result.filters.every(n=>n<=512));
 }
 // Camera-only controls still work with the exterior border offset.
 const before=await p.evaluate(()=>JSON.stringify(mist465_.data));await p.getByRole('button',{name:'查看其它視野',exact:true}).click();await p.locator('.mist-vision487').click();
 assert.equal(await p.evaluate(()=>JSON.stringify(mist465_.data)),before);assert.ok(await p.locator('.mist-map-scroll465').evaluate(el=>el.scrollTop>0));
 await p.getByRole('button',{name:'回到我的位置',exact:true}).click();
 await p.evaluate(()=>{mist465_.data.self.x=0;mist465_.data.self.y=0;mistDraw465_();mistCenter465_();});
 // Returning from another tab or a newly mounted board centers the player automatically.
 await p.evaluate(()=>setupMap489(16,14,14));
 await p.evaluate(()=>{mist465_.data.visions487.push({kind:'supply',x:2,y:2,radius:2});mistVisions487_();});
 await p.getByRole('button',{name:/補給站 · 共用視野/}).click();
 const far=await p.locator('.mist-map-scroll465').evaluate(e=>e.scrollTop);
 await p.evaluate(()=>mistDraw465_());await p.waitForTimeout(80);assert.equal(await p.locator('.mist-map-scroll465').evaluate(e=>e.scrollTop),far,'ordinary refresh preserves chosen public view');
 await p.evaluate(()=>{mistTab465_('reports');mistTab465_('map');});await p.waitForTimeout(100);assert.ok(await p.locator('.mist-map-scroll465').evaluate(e=>e.scrollTop)>far,'tab return follows self');
 await p.evaluate(()=>{document.querySelector('.mist-map-scroll465').scrollTop=0;document.getElementById('page').innerHTML='';mistDraw465_();});await p.waitForTimeout(100);assert.ok(await p.locator('.mist-map-scroll465').evaluate(e=>e.scrollTop)>far,'return from battle remount follows self');
 const shade=await p.evaluate(()=>({edge:getComputedStyle(document.querySelector('.mist-board-frame479'),'::after').pointerEvents,wall:getComputedStyle(document.querySelector('.mist-room489'),'::after').pointerEvents}));assert.deepEqual(shade,{edge:'none',wall:'none'});
 await p.screenshot({path:'/tmp/mist498-'+engine+'-'+width+'.png'});
 // Simulate a server refresh removing a flag: no stale prop is retained by the fog.
 await p.evaluate(()=>{mist465_.data.cells=mist465_.data.cells.filter(c=>c.x<2&&c.y<2);mist465_.data.visions487=[];mistDraw465_();});assert.equal(await p.locator('.mist-flag-label479').count(),0);
 // Largest supported world only filters bounded patches near visible cells.
 const bound=await p.evaluate(()=>{const h=mistFog489_({self:{x:0,y:0},cells:[{x:0,y:0},{x:255,y:255}]},256),el=document.createElement('div');el.innerHTML=h;return {svgs:el.querySelectorAll('svg').length,viewBoxes:[...el.querySelectorAll('svg')].map(s=>s.getAttribute('viewBox'))}});assert.ok(bound.svgs<=8);assert.ok(bound.viewBoxes.every(v=>v==='0 0 8 8'));
 if(view==='mobile'){await p.setViewportSize({width:844,height:390});await p.evaluate(()=>mistCenter465_());assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.setViewportSize({width,height});await p.evaluate(()=>mistCenter465_());assert.ok(await p.locator('.self').isVisible());}
 assert.deepEqual(errors,[]);console.log(engine,width,'perimeter spawns, 18/32 map expansion, 256 fog bounds, click targets, camera-only views, stale visibility and rotation passed');await p.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
