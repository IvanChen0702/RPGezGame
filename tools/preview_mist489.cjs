const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const root='/workspace/work/RPGezGame',out='/workspace/outputs/mist489-implemented';
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
for(const [variant,view,width,height]of [['T','desktop',1600,1100],['T','mobile',390,844]]){
 const p=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});
 await p.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'?r.continue():r.abort()});
 await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync(root+'/tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({data,view,variant})=>{
 installMistPreview465({data},view);applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);applyEnhancementRows_(data.Enhancement);planningReady412_=()=>true;render=previewOriginalRender465;
 state.level=93;cloudMeta.nickname='冒險者';state.gold=27917;
 const d=mist465_.data;d.season.label='場景設計預覽';d.self={...d.self,x:11,y:8,hp:417,maxHp:1010,energy:12,points:30,flags:3};d.energyRules={cap:20,recoveryMinutes:30};d.self.energyNextAt=new Date(Date.now()+16*60000).toISOString();d.flagRules={minutes:180,points:1};
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
 document.querySelector('.mist-tag465').textContent='厚石地城 A · 現有素材實際組裝預覽';
 },{data:JSON.parse(fs.readFileSync(root+'/supabase/tests/fixtures/mist468-planning.json')),view,variant});
 await p.evaluate(()=>{const scroll=document.querySelector('.mist-map-scroll465');scroll.scrollTop=0;scroll.scrollLeft=Math.max(0,(scroll.scrollWidth-scroll.clientWidth)/2);if(innerWidth<700){mistCenter465_();}});
 await p.waitForTimeout(1200);assert.deepEqual(errors,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const name=variant+'-'+view;await p.screenshot({path:out+'/'+name+'.png'});
 if(view==='desktop')await p.locator('.mist-board-frame479').screenshot({path:out+'/'+variant+'-scene.png'});
 console.log(name,'saved');await p.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
