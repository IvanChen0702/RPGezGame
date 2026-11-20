// Check real shipped assets through the production renderer; no live API mutations.
const fs=require('fs'),assert=require('assert/strict');
const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const engine=process.env.BROWSER||'chromium',out='/workspace/outputs/mist505';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));try{
 const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
 const arts=[...Array.from({length:10},(_,i)=>'normal-'+(i+1)),...Array.from({length:5},(_,i)=>'elite-'+(i+1))];
 for(const [view,width,height]of [['desktop',1440,900],['mobile',390,844],['mobile',320,568],['mobile',844,390]]){
  const p=await browser.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
  await p.evaluate(({data,view,arts})=>{
   installMistPreview465({data},view);loginRequiredActive_=()=>false;applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);planningReady412_=()=>true;render=previewOriginalRender465;mist465_.preview=false;mist465_.tab='map';mist465_.data.skills={active:['slash'],passive:null};mist465_.data.starter=null;mist465_.data.chestReveals471=[];
   mist465_.data.cells=arts.map((art,i)=>({x:i%5,y:Math.floor(i/5),object:{kind:'monster',id:art,art,name:art,elite:art.startsWith('elite')}}));mist465_.data.cells.push({x:5,y:1,object:{kind:'player',id:'other',name:'其他玩家',appearance:{sex:'female',suit:1,head:0,kind:'sword'}}});mist465_.data.self.x=5;mist465_.data.self.y=2;render();
  },{data,view,arts});
  await p.locator('.mist-cell465 img').evaluateAll(imgs=>Promise.all(imgs.map(im=>im.decode())));
  const fit=await p.locator('.mist-cell465>:is(img,canvas)').evaluateAll(xs=>xs.map(x=>getComputedStyle(x).objectFit));assert(fit.length>=17);assert(fit.every(x=>x==='contain'));
  for(const art of arts){await p.evaluate(art=>{const c=mist465_.data.cells.find(c=>c.object?.art===art);mistCellClick469_(c.x,c.y)},art);const img=p.locator('#modal .mist-target-art465 img');await img.evaluate(x=>x.decode());assert.equal(await img.evaluate(x=>getComputedStyle(x).objectFit),'contain');await p.evaluate(()=>closeModal());}
  await p.evaluate(()=>{const c=mist465_.data.cells.find(c=>c.object?.kind==='player');mistCellClick469_(c.x,c.y)});assert.equal(await p.locator('#modal .mist-target-art465 canvas').evaluate(x=>getComputedStyle(x).objectFit),'contain');await p.evaluate(()=>closeModal());
  await p.evaluate(()=>{
   const actor={name:'測試旅人',hp:1000,maxHp:1000,stats:{hp:1000,patk:100,matk:100,def:30,crit:0,critDamage:100},status:{},buff:{},cooldowns:{},skills:['slash']};mist465_.data.battle={id:'ratio505',attacker:structuredClone(actor),defender:{...structuredClone(actor),name:'迷霧測試敵人',art:'normal-3'},turn:1,maxTurns:30,finished:false,log:[],events:[]};mist465_.data.self.battleId='ratio505';mistSyncBattle470_();render();
  });
  const results=await p.evaluate(async arts=>{
   const all=[];for(const art of arts){arenaBattle_.defender.art=art;const key=enemyArtKey202_(),im=artImage202_(key);await im.decode();const c=document.createElement('canvas');c.width=1600;c.height=1000;const ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx),renders=[];
    ctx.drawImage=(image,...a)=>{if(image===im)renders.push({x:a[0],y:a[1],w:a[2],h:a[3],transform:ctx.getTransform().toFloat64Array()});return draw(image,...a)};
    const before=JSON.stringify(arenaBattle_),anchor=pixelAnchor192_('enemy'),foot=spriteMetrics203_(im).foot;
    for(const type of [null,'attack','hit','magic','cast203'])for(const phase of [0,.25,.5,.75,1]){ctx.clearRect(0,0,1600,1000);pixelDrawMonster203_(ctx,anchor,phase*1000,type?{type,start:0,duration:1000}:null);const r=renders.at(-1),ratio=im.naturalWidth/im.naturalHeight;
     // Existing breathing is <3%; integer rounding may add at most one pixel per axis.
     const error=Math.abs((r.w/r.h)/ratio-1),tolerance=.025+1/r.w+1/r.h;if(error>tolerance)throw Error(art+' stretched '+JSON.stringify({ratio,r,error,tolerance}));
     const ground=r.transform[13]+r.y+r.h*foot;if(Math.abs(ground-pixelFloor203_())>1)throw Error(art+' feet off ground '+ground);
     if(Math.max(r.w,r.h)<20)throw Error('invisible '+art);
    }
    if(before!==JSON.stringify(arenaBattle_))throw Error('render changed battle');all.push({art,native:[im.naturalWidth,im.naturalHeight],neutral:[renders[0].w,renders[0].h],frames:renders.length});
   }return all;
  },arts);assert.equal(results.length,15);assert(results.every(x=>x.frames===25));
  await p.evaluate(()=>{arenaBattle_.defender.art='normal-3';render()});await p.waitForTimeout(200);await p.screenshot({path:out+'/'+engine+'-'+width+'.png'});
  assert.deepEqual(errors,[]);console.log(engine,width,'15 real monsters × 25 frames, native proportions/floor, map + info object-fit PASS',results[2]);await p.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
