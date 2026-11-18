const {chromium,webkit}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const engine=process.env.BROWSER||'chromium',b=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));try{for(const [view,width,height]of [['desktop',1440,900],['desktop',1024,768],['mobile',390,844],['mobile',360,640]]){
 const p=await b.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>{if(!e.message.includes('ResizeObserver'))errors.push(e.message)});await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
 await p.evaluate(({data,view})=>{installMistPreview465({data},view);planningReady412_=()=>true;render=previewOriginalRender465;mist465_.data.self=null;mist465_.tab='entry';render();},{data:JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json')),view});
 assert.equal(await p.locator('.mist-guide-card485').count(),6);assert.equal(await p.locator('.mist-details485 details').getAttribute('open'),null);
 const pane=p.locator('.mist-content465');assert.ok(await pane.evaluate(el=>el.clientHeight>150&&getComputedStyle(el).overflowY==='auto'));
 await p.locator('.mist-details485 summary').click();assert.equal(await p.locator('.mist-details485 details').getAttribute('open'),'');
 await pane.evaluate(el=>el.scrollTop=el.scrollHeight);assert.ok(await pane.evaluate(el=>el.scrollTop>0&&el.scrollTop+el.clientHeight>=el.scrollHeight-2));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.getByRole('tab',{name:'排行',exact:true}).click();assert.equal(await p.locator('.rank-stage57').count(),4);assert.equal(await p.locator('.mist-table465').count(),0);
 assert.equal(await p.locator('.rank-rewards-arena58 .rank-prize57').count(),4);
 await pane.evaluate(el=>el.scrollTop=el.scrollHeight);const last=p.locator('.rank-stage57').last();assert.ok(await last.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.mist-content465').getBoundingClientRect();return r.bottom<=p.bottom+1&&r.left>=p.left&&r.right<=p.right}));
 assert.deepEqual(errors,[]);console.log(engine,width,'guide cards, collapsed/full rules, real scrolling, native arena rewards and no horizontal overflow passed');await p.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
