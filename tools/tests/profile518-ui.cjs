const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});fs.mkdirSync('/workspace/outputs/profile518',{recursive:true});try{
for(const [view,width,height]of [['desktop',1280,900],['mobile',390,844],['mobile',320,568]]){
const p=await browser.newPage({viewport:{width,height}}),errors=[];p.on('pageerror',e=>{if(!e.message.startsWith('ResizeObserver'))errors.push(e.stack)});
await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});await p.addScriptTag({content:fs.readFileSync('tools/tests/mist465-preview-fixture.js','utf8')});
const data=JSON.parse(fs.readFileSync('supabase/tests/fixtures/mist468-planning.json'));
await p.evaluate(({data,view})=>{
 installMistPreview465({data},view);loginRequiredActive_=()=>false;applyGameConfigRows_(data.GameConfig);applyEquipmentRows_(data.Equipment);applySkillRows_(data.Skills);applyGemRows_(data.Gems);render=previewOriginalRender465;initialEntryShown45_=true;save=()=>{};
 isCloudLoggedIn=()=>true;cloudMeta.accountId='self518';cloudMeta.authProvider='supabase';avatarCloudTick325_=()=>{};presenceSync358_=()=>{};questAuto368=()=>{};
 state.nickname='哈草太郎';state.level=222;state.exp=Math.floor(expNeeded(222)*.3);state.gold=37302;state.equippedTitle='beginner';state.page='town';state.currentBattle=null;
 const ids=['starterCrown1','starterArmor1','starterBlade1','phantomLegendCloak',...Object.keys(itemTemplates).filter(k=>itemTemplates[k].slot==='ring').slice(-4)];const equipment=ids.map((template,i)=>({...itemTemplates[template],id:'public-'+i,template,enhance:10,sockets:1,gems:[null]}));
 window.person518={id:'11111111-2222-3333-4444-555555555555',nickname:'測試冒險者',level:100,titleId:'beginner',avatarId:2,appearance:{sex:'female',equipment}};
 window.public518={...person518,stats:{hp:5091,patk:1015,matk:385,def:186,crit:100,critDamage:228},skills:[{id:'adventurerAptitude',type:'passive'},{id:'slash',type:'active'},{id:'magicMissileIII',type:'active'},{id:'healIII',type:'active'}],maxCleared:65,pet:{species:'spiritDeer',level:100}};
 presence358_.owner=presenceOwner358_();presence358_.cache={count:1,members:[person518],hasMembers:true};presence358_.stamp=Date.now();
 window.writes518=[];apiPost=async(action,body)=>{if(action==='profile/public')return {ok:true,profile:public518};if(action==='profile/avatar/set'){writes518.push(body);return {ok:true,accountId:cloudMeta.accountId,avatarId:body.avatarId,avatarSet:true}};return {ok:true}};render();
},{data,view});await p.waitForTimeout(500);
await p.screenshot({path:`/workspace/outputs/profile518/town-${width}.png`});
const header=await p.locator('.topbar').boundingBox();assert.equal(Math.round(header.height),44);assert.equal(await p.locator('.player-account518').count(),1);
await p.locator('.player-account518').click();await p.screenshot({path:`/workspace/outputs/profile518/account-${width}.png`});assert.equal(await p.locator('.account-avatars518 button').count(),12);
const measure=await p.locator('.account-window518').evaluate(e=>({w:e.clientWidth,scroll:e.scrollWidth,h:e.getBoundingClientRect().height}));assert(measure.scroll<=measure.w+1);assert(measure.h<=height-18);
await p.getByRole('button',{name:'更換稱號',exact:true}).click();assert(await p.locator('#modal.open').isVisible());assert(await p.evaluate(()=>Number(getComputedStyle(document.getElementById('modal')).zIndex)>Number(getComputedStyle(document.getElementById('accountOverlay')).zIndex)));await p.evaluate(()=>closeModal());
await p.locator('[data-account-avatar518="3"]').click();assert.equal(await p.evaluate(()=>writes518.length),0,'avatar change must remain draft');
await p.locator('.account-window518 footer button').first().click();assert.equal(await p.evaluate(()=>avatarCurrent314_()),1,'cancel preserves avatar');
await p.evaluate(()=>openAccountPanel());await p.locator('[data-account-avatar518="3"]').click();await p.locator('.account-window518 footer .primary').click();await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>avatarCurrent314_()),3);assert.equal(await p.evaluate(()=>writes518.length),1);assert.match(await p.locator('#accountMessage').textContent(),/已儲存/);
await p.evaluate(()=>{ensureTransactionCloudMatch_=async()=>({revision:1});apiPostRevisionMutation_=async(a,b)=>{writes518.push({action:a,nickname:b.nickname});return {ok:true,nickname:b.nickname}};reloadVerifiedTransactionSave_=async(s,page,label,data)=>{state.nickname=data.nickname};saveCloudMeta=()=>{};});
await p.locator('#nicknameChangeInput').fill('新玩家名稱');await p.locator('[data-account-avatar518="4"]').click();
await p.evaluate(()=>{window.goodApi518=apiPost;apiPost=async(a,b)=>{if(a==='profile/avatar/set')throw Error('測試斷線');return goodApi518(a,b)};});
await p.locator('.account-window518 footer .primary').click();await p.waitForTimeout(80);assert.match(await p.locator('#accountMessage').textContent(),/名稱已儲存/);assert.equal(await p.evaluate(()=>avatarCurrent314_()),3);assert.equal(await p.evaluate(()=>state.nickname),'新玩家名稱');
await p.evaluate(()=>apiPost=goodApi518);await p.locator('.account-window518 footer .primary').click();await p.waitForTimeout(80);assert.equal(await p.evaluate(()=>avatarCurrent314_()),4);assert.equal(await p.evaluate(()=>writes518.filter(x=>x.action==='profile/nickname').length),1);
await p.locator('.account-window518 footer button').first().click();if(view==='mobile')await p.locator('.town-person358').first().click();else await p.locator('.town-person358').first().evaluate(el=>el.click());await p.waitForTimeout(800);
await p.screenshot({path:`/workspace/outputs/profile518/public-${width}.png`});assert.equal(await p.locator('.profile-equip518').count(),8);assert.equal(await p.locator('.profile-skill518').count(),4);assert.match(await p.locator('.profile-stats518').textContent(),/5,091/);assert.equal(await p.locator('.profile-hero518 canvas').first().getAttribute('data-avatar-sex220'),'female');
await p.locator('.profile-equip518').first().click();assert(await p.locator('.profile-detail518').isVisible());await p.locator('.profile-detail-close518').click();
await p.locator('.profile-skill518').last().click();assert(await p.locator('.profile-detail518').isVisible());await p.keyboard.press('Escape');assert.equal(await p.locator('.town-profile518').count(),0);
// An old response must not reopen a closed dialog.
await p.evaluate(()=>{apiPost=()=>new Promise(r=>window.late518=r);presence358_.selected=person518.id;openTownProfile518_(person518);closeTownPerson358_();late518({ok:true,profile:public518});});await p.waitForTimeout(50);assert.equal(await p.locator('.town-profile518').count(),0);
await p.evaluate(()=>{state.nickname='這是十六個字的超級長玩家名稱測試';state.gold=123456789012;renderTop()});assert.equal(Math.round((await p.locator('.topbar').boundingBox()).height),44);assert(await p.locator('.player-account518').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
assert.deepEqual(errors,[]);console.log('PASS',view,width,'header/account/public profile');await p.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
