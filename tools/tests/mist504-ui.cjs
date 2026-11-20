const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const root='/workspace/work/RPGezGame',out='/workspace/outputs/mist504-live';
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await(process.env.BROWSER==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));try{
for(const [variant,view,width,height]of [['504','desktop',1440,960],['504','mobile',390,844],['504','mobile',320,568],['504','mobile',844,390]]){
 const p=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});
 await p.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'?r.continue():r.abort()});
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync(root+'/tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({data,view,variant})=>{
 installMistPreview465({data},view);loginRequiredActive_=()=>false;applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);planningReady412_=()=>true;render=previewOriginalRender465;
 state.level=93;cloudMeta.nickname='冒險者';state.gold=27917;
 const d=mist465_.data;d.season.label='測試階段';d.self={...d.self,x:11,y:8,hp:417,maxHp:1010,energy:12,points:30,flags:3};d.energyRules={cap:20,recoveryMinutes:30};d.self.energyNextAt=new Date(Date.now()+16*60000).toISOString();d.flagRules={minutes:180,points:1};
 const centers=[{x:10,y:2,r:1},{x:4,y:1,r:1},{x:7,y:5,r:1},{x:12,y:4,r:1},{x:6,y:2,r:2}];
 d.self.x=10;d.self.y=2;
 d.cells=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(centers.some(c=>Math.abs(c.x-x)<=c.r&&Math.abs(c.y-y)<=c.r))d.cells.push({x,y,object:null});
 const put=(x,y,o)=>{const c=d.cells.find(c=>c.x===x&&c.y===y);if(c)c.object=o;};
 put(4,1,{kind:'flag',own:true,name:'我的旗幟'});put(7,5,{kind:'flag',own:true,name:'我的旗幟'});put(12,4,{kind:'flag',own:true,name:'我的旗幟'});
 for(const [x,y,own,minutes]of [[4,1,true,45],[7,5,true,85],[12,4,true,123],[7,2,false,67]]){const c=d.cells.find(c=>c.x===x&&c.y===y);c.flag={own,createdAt:new Date(Date.now()-minutes*60000).toISOString()};}
 put(7,2,{kind:'player',id:'opponent1',name:'旅人',hp:183,points:12,appearance:{sex:'female',suit:4,head:2,kind:'sword',glow:true}});
 put(8,3,{kind:'player',id:'opponent2',name:'旅人',hp:350,points:15,appearance:{sex:'male',suit:5,head:3,kind:'staff',glow:true}});
 put(5,1,{kind:'supply',name:'補給站'});put(8,5,{kind:'forge',name:'鐵匠鋪'});put(6,2,{kind:'airdrop',name:'空降資源'});
 put(9,2,{kind:'monster',id:'enemy',art:'normal-1',name:'燼火小鬼'});put(12,3,{kind:'monster',id:'elite',art:'elite-2',elite:true,name:'熔金守衛'});
 put(5,3,{kind:'stamina',name:'體力補包'});put(8,1,{kind:'stamina',name:'體力補包',countdown:'12 分鐘'});
 mist465_.preview=false;mist465_.tab='map';mist465_.selection={x:9,y:2};render();
 // Same existing hero renderer: equipment silhouette comes from the production atlas.
 const paint=mistPaint469_;mistPaint469_=()=>{paint();const c=document.querySelector('[data-mist-hero469="self"]');if(c){delete c.dataset.painting;void mistPaintCanvas469_(c,mistGear469_({sex:'male',suit:4,head:2,kind:'sword',glow:true}));}};mistPaint469_();
 document.querySelector('.mist-tag465').textContent='競技模式 · 介面設計預覽';
 },{data:JSON.parse(fs.readFileSync(root+'/supabase/tests/fixtures/mist468-planning.json')),view,variant});

 await p.waitForTimeout(1300);await p.evaluate(()=>mistCenter465_());assert.deepEqual(errors,[]);
 const geometry=await p.evaluate(()=>{const h=document.querySelector('.mist-hp474').getBoundingClientRect(),e=document.querySelector('.mist-energy-track479').getBoundingClientRect(),hero=document.querySelector('.mist-cell465.self').getBoundingClientRect(),map=document.querySelector('.mist-map-scroll465').getBoundingClientRect();return {hp:h.height,energy:e.height,hpY:h.y,energyY:e.y,visible:hero.left>=map.left&&hero.right<=map.right&&hero.top>=map.top&&hero.bottom<=map.bottom}});
 assert.equal(geometry.hp,geometry.energy);assert(geometry.energyY>geometry.hpY);assert(geometry.visible);
 await p.screenshot({path:out+'/controls-'+view+'-'+width+'.png'});
 const a=await p.locator('.mist-dock504').boundingBox();await p.locator('.mist-map-scroll465').evaluate(e=>e.scrollTop+=100);const b=await p.locator('.mist-dock504').boundingBox();assert.equal(a.y,b.y);

 assert(a.y+a.height<=height+1);const mapBox=await p.locator('.mist-map-scroll465').boundingBox();assert(mapBox.height>70);assert(mapBox.y+mapBox.height<=a.y+1);
 // Re-rendering status keeps the camera; switching tabs recreates and centers the board.
 const scroll=await p.locator('.mist-map-scroll465').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));await p.evaluate(()=>mistDraw465_());const after=await p.locator('.mist-map-scroll465').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));assert.deepEqual(after,scroll);
 await p.evaluate(()=>mistTab465_('reports'));assert.equal(await p.locator('.mist-dock504').count(),0);await p.evaluate(()=>mistTab465_('map'));await p.waitForTimeout(150);
 await p.getByRole('button',{name:'整備',exact:false}).filter({hasText:'背包'}).click();assert.equal(await p.locator('#mistPrep474').count(),1);await p.evaluate(()=>mistClosePrep474_(false));
 await p.evaluate(()=>{
  window.calls504=[];window.chests504=[];window.fail504=false;
  mistAutoChest471_=async force=>{chests504.push(force)};
  apiPost=async(action,payload)=>{calls504.push({action,payload});await new Promise(r=>setTimeout(r,50));if(fail504){fail504=false;throw Error('test offline')};const d=structuredClone(mist465_.data);if(action==='mist/reports/read')d.reports.forEach(r=>r.unread=false);else if(action==='mist/respawn'){d.self.dead=false;d.self.hp=d.self.maxHp;d.self.energy=20;d.self.x=0;d.self.y=0;d.starter={opened:false}}else throw Error('unexpected '+action);return d;};
  const d=mist465_.data;d.self.dead=true;d.self.hp=0;d.self.points=17;d.self.flags=0;d.reports=[{id:'death504',unread:true,result:'death',title:'遭遇 <霧行者>',description:'你被 <霧行者> 擊敗。',time:'2026-11-20T03:05:00Z',points:17,position:{x:7,y:2}}];mistDeathNoticeId468_='';mistDraw465_();void mistDeathNotice468_();
 });
 await p.waitForSelector('#mistDeath504');assert.equal(await p.locator('#mistDeath504 .defeat-enemy504 h3').innerText(),'<霧行者>');assert.match(await p.locator('#mistDeath504').innerText(),/11:05:00/);assert.match(await p.locator('#mistDeath504').innerText(),/座標 8,3/);assert.match(await p.locator('#mistDeath504').innerText(),/17 積分/);
 await p.screenshot({path:out+'/defeat-'+view+'-'+width+'.png'});
 await p.locator('[data-death504="reports"]').click();await p.waitForFunction(()=>mist465_.tab==='reports'&&!mist465_.loading);assert.equal(await p.evaluate(()=>calls504.length),1);assert.equal(await p.locator('#mistDeath504').count(),0);
 await p.evaluate(()=>mistTab465_('map'));await p.screenshot({path:out+'/respawn-'+view+'-'+width+'.png'});
 assert.equal(await p.locator('.mist-respawn504').count(),1);assert.equal(await p.locator('.mist-dock504').count(),0);
 await p.evaluate(()=>fail504=true);await p.getByRole('button',{name:'確認重生 · 自動開箱'}).click();await p.waitForFunction(()=>mist465_.pending&&!mist465_.loading);assert.equal(await p.locator('.mist-respawn504').count(),1);
 await p.getByRole('button',{name:'重試同筆操作',exact:true}).click();await p.waitForFunction(()=>!mist465_.data.self.dead&&!mist465_.loading);const reqs=await p.evaluate(()=>calls504.filter(c=>c.action==='mist/respawn'));assert.equal(reqs.length,2);assert.equal(reqs[0].payload.requestId,reqs[1].payload.requestId);assert(await p.evaluate(()=>chests504.includes(true)));assert.equal(await p.locator('.mist-dock504').count(),1);
 // Pending death dialog must not acknowledge or redirect a different account.
 await p.evaluate(()=>{mist465_.data.reports[0].unread=true;mistDeathNoticeId468_='';void mistDeathNotice468_()});await p.waitForSelector('#mistDeath504');await p.evaluate(()=>{cloudMeta.accountId='other504';mistDecorate470_()});await p.waitForTimeout(30);assert.equal(await p.locator('#mistDeath504').count(),0);assert.equal(await p.evaluate(()=>calls504.filter(c=>c.action==='mist/reports/read').length),1);
 assert.deepEqual(errors,[]);
 console.log(process.env.BROWSER||'chromium',width,'fixed dock, stacked bars, camera, prep, real report, respawn retry/autochest and account guard PASS');await p.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
