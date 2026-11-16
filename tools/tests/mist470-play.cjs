const {
  chromium,
  webkit,
} = require("/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const { reduceMist468 } = await import(
    "../../supabase/functions/game-api/mist-runtime468.js"
  );
  const data = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "../../supabase/tests/fixtures/mist468-planning.json",
      ),
      "utf8",
    ),
  );
  data.MistConfig.find((r) => r.Key === "Enabled").Value = true;
  const engine = process.env.BROWSER === "webkit" ? "webkit" : "chromium";
  const browser = await (engine === "webkit"
    ? webkit.launch({ headless: true })
    : chromium.launch({
        executablePath: "/usr/bin/chromium",
        headless: true,
        args: ["--no-sandbox"],
      }));
  try {
    for (const [view, width, height] of [
      ["desktop", 1440, 900],
      ["mobile", 390, 844],
      ["mobile", 360, 640],
      ["mobile", 844, 390],
    ]) {
      if(process.env.WIDTH&&Number(process.env.WIDTH)!==width)continue;
      let input = {
        world: {
          revision: 0,
          meta: {},
          season: null,
          players: {},
          cells: [],
          flags: [],
        },
        now: "2026-11-16T01:00:00Z",
        planning: { data, dataVersion: "fixture" },
        save: {
          skillsOwned: ["slash", "adventurerAptitude"],
          equippedSkills: ["slash"],
          passive: ["adventurerAptitude"],
        },
        rewards: [],
        nickname: "測試旅人",
      };
      const responses = new Map();
      let dropReply=false;
      const call = async (action, body = {}) => {
        if (responses.has(body.requestId)) return responses.get(body.requestId);
        try {
          const r = await reduceMist468(
            input,
            "preview-adventurer",
            action.replace("mist/", ""),
            body,
            () => 0.4,
          );
          if (r.world) input.world = r.world;
          if (body.requestId) responses.set(body.requestId, r.result);
          if(dropReply){dropReply=false;return {ok:false,error:"MIST_RETRY"};}
          return r.result;
        } catch (e) {
          return { ok: false, error: e.message };
        }
      };
      console.log("starting", engine, view, width);
      const page = await browser.newPage({
        viewport: { width, height },
        hasTouch: view === "mobile",
      });
      const errors = [],
        missing = [];
      let settingUp = true;
      page.on("pageerror", (e) => {
        if (!(settingUp && e.message.startsWith("ResizeObserver")))
          errors.push(e.message);
      });
      page.on("response", (r) => {
        if (r.status() === 404) missing.push(r.url());
      });
      await page.route("**/*", (r) =>
        new URL(r.request().url()).hostname === "127.0.0.1"
          ? r.continue()
          : r.abort(),
      );
      await page.exposeFunction("mistTestRpc", call);
      console.log("goto");
      await page.goto("http://127.0.0.1:8443/", { waitUntil: "networkidle" });
      console.log("loaded");
      await page.addScriptTag({
        content: fs.readFileSync(
          path.join(__dirname, "mist465-preview-fixture.js"),
          "utf8",
        ),
      });
      await page.evaluate(
        ({ data, view }) => {
          installMistPreview465({ data }, view);
          applyGameConfigRows_(data.GameConfig);
          applyEquipmentRows_(data.Equipment);
          applySkillRows_(data.Skills);
          applyGemRows_(data.Gems);
          applyEnhancementRows_(data.Enhancement);
          planningReady412_ = () => true;
          render = previewOriginalRender465;
          mist465_.preview = false;
          mist465_.data = null;
          apiPost = (action, body) => window.mistTestRpc(action, body);
          render();
        },
        { data, view },
      );
      const formalBefore=await page.evaluate(()=>JSON.stringify([state.inventory,state.equipment,state.gems,state.gold,state.skillsOwned,state.equippedSkills,state.passive,state.pets297]));
      console.log("fixture installed");
      await page.evaluate(() => refreshMist465_());
      console.log("status received");
      await page.waitForTimeout(100);
      settingUp = false;
      console.log("joining");
      await page.getByRole("button", { name: "參加本季", exact: true }).click();
      await page.waitForFunction(() => !!mist465_.data?.self);
      await page.getByRole("tab", { name: "棋盤", exact: true }).click();
      await page.waitForSelector('#mistChest471 .g431-skip:not([hidden])');
      await page.locator('#mistChest471 .g431-skip').click();
      await page.locator('#mistChest471 [data-keep471]').click();
      await page.waitForSelector('#mistChest471',{state:'detached'});
      assert.equal(await page.evaluate(()=>mist465_.data.inventory.equipment.length),4);
      await page.getByRole("button", { name: /^插旗/ }).click();
      await page.waitForFunction(() => mist465_.data.self.flags === 1 && !mist465_.loading);
      const home = await page.evaluate(() => ({x:mist465_.data.self.x,y:mist465_.data.self.y}));
      const step = await page.evaluate(() => {const s=mist465_.data.self;return mist465_.data.cells.find(c=>Math.abs(c.x-s.x)+Math.abs(c.y-s.y)===1&&!c.object);});
      assert.ok(step, "spawn has reachable neighbor");
      const tile=page.locator('.mist-cell465[data-x="'+step.x+'"][data-y="'+step.y+'"]');
      assert.ok((await tile.getAttribute('class')).includes('reachable469'));
      assert.equal(await tile.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(139, 227, 189)');
      await tile.click();
      await page.waitForFunction(({x,y})=>mist465_.data.self.x===x&&mist465_.data.self.y===y&&!mist465_.loading,step);
      assert.equal(await page.evaluate(()=>mist465_.data.self.energy),8,'flag plus move costs two AP');
      await page.locator('.mist-cell465[data-x="'+home.x+'"][data-y="'+home.y+'"]').click();
      assert.match(await page.locator('#modal [data-flag-time476]').innerText(),/存續.*下次/);
      await page.locator('#modal').getByRole('button',{name:'移動至此 · −1 體力',exact:true}).click();
      await page.waitForFunction(({x,y})=>mist465_.data.self.x===x&&mist465_.data.self.y===y&&!mist465_.loading,home);
      assert.equal(await page.evaluate(()=>mist465_.data.self.flags),1,'moving onto own flag retains it');
      await page.getByRole("button", {name:/^隱身/}).click();
      await page.waitForFunction(()=>!!mist465_.data.self.hiddenUntil&&!mist465_.loading);
      assert.equal(await page.evaluate(()=>mist465_.data.self.energy),4);
      await page.waitForFunction(()=>document.querySelector('[data-mist-hero469="self"]')?.dataset.painted==='true');
      await page.evaluate(()=>mistCenter465_());
      const centered=await page.locator('.mist-cell465.self').evaluate(e=>{const r=e.getBoundingClientRect(),s=document.querySelector('.mist-map-scroll465').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom&&r.left>=s.left&&r.right<=s.right;});
      assert.ok(centered,'character remains inside map viewport after flag and movement');
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-map469.png',fullPage:true});
      assert.equal(await page.getByRole('tab',{name:'行囊',exact:true}).count(),0);
      assert.equal(await page.locator('.mist-world465 .mist-side465').count(),0);
      await page.locator('.mist-cell465.self').click();
      assert.equal(await page.locator('#mistPrep474 [role="dialog"]').count(),1);
      await page.getByRole('button',{name:'關閉整備',exact:true}).click();
      const mapBefore=await page.locator('.mist-map-scroll465').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));
      await page.locator('.mist-actions469').getByRole('button',{name:/^整備/}).click();
      assert.equal(await page.locator('#mistPrep474 [role="dialog"]').count(),1);
      const choose=async(last=true)=>{if(view==='mobile'){await page.locator('.quick-option-actions button')[last?'last':'first']().click();}else{await page.locator('.pick-tile401')[last?'last':'first']().click();await page.locator('.pick-card401 footer .primary').click();}};
      await page.locator('.paperdoll-slot204').first().scrollIntoViewIfNeeded();await page.waitForTimeout(120);
      await page.locator('.paperdoll-slot204').first().click();
      await page.getByRole('menuitem',{name:'更換',exact:true}).click();
      await choose();
      await page.waitForFunction(()=>Object.keys(mist465_.data.equipment).length===1);
      await page.waitForTimeout(100);
      const tabs=await page.locator('.mist-preparation470>.inventory-main-tabs button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width};}));
      assert.equal(tabs.length,3);assert.ok(tabs.every(r=>r.x>=0&&r.x+r.w<=width+1),'all preparation tabs fit');
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-loadout470.png',fullPage:true});
      const centred=await page.evaluate(()=>{const board=document.querySelector('.paperdoll204').getBoundingClientRect(),canvas=document.querySelector('.paperdoll-hero204>canvas').getBoundingClientRect();return Math.abs(board.x+board.width/2-canvas.x-canvas.width/2)<2;});assert.ok(centred,'character canvas centred on equipment stage');
      const avatar=await page.locator('.paperdoll-hero204>canvas').first().elementHandle();
      await page.evaluate(()=>refreshMist465_());
      assert.ok(await avatar.evaluate(e=>e.isConnected),'status refresh keeps live character animation');
      await page.getByRole('button',{name:'女性冒險者',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.paperdoll-hero204>canvas').dataset.avatarSex220==='female');
      assert.equal(await page.locator('.paperdoll-weapon250').count(),1,'sex switch retains one renderer');
      await page.getByRole('button',{name:'男性冒險者',exact:true}).click();
      // The same desktop hover / mobile hold gate used by normal preparation.
      const slotTip=page.locator('.paperdoll-slot204').first();await slotTip.scrollIntoViewIfNeeded();await page.waitForTimeout(120);
      if(view==='mobile'){
        const r=await slotTip.boundingBox();
        await slotTip.dispatchEvent('pointerdown',{pointerId:471,pointerType:'touch',isPrimary:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true});
        await page.waitForTimeout(550);
        assert.equal(await page.locator('#prepareHoverTip.touch-info260.show').count(),1,'native mobile hold shows equipment detail');
        await slotTip.dispatchEvent('pointerup',{pointerId:471,pointerType:'touch',isPrimary:true,bubbles:true});
        await slotTip.dispatchEvent('click',{bubbles:true});
        assert.equal(await page.locator('#equipMenu206').count(),0,'release after long hold does not open manage/change');
        await page.evaluate(()=>{equipmentClickBlock260_=null;prepareTooltipHide_();});
      }else{
        await page.mouse.move(0,0);await slotTip.hover();assert.equal(await page.locator('#prepareHoverTip.show').count(),1,'native desktop hover shows equipment detail');
      }



      await page.locator('.paperdoll-slot204').first().scrollIntoViewIfNeeded();await page.waitForTimeout(120);
      await page.locator('.paperdoll-slot204').first().click();
      await page.getByRole('menuitem',{name:'管理',exact:true}).click();
      assert.equal(await page.locator('.item-manager307').count(),1);
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-manager470.png',fullPage:true});
      await page.evaluate(()=>closeModal());
      const equipmentId = await page.evaluate(
        () => Object.values(mist465_.data.equipment)[0].id,
      );
      assert.ok(equipmentId);
      await page.getByRole('button',{name:'技能',exact:true}).click();
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-skills471.png',fullPage:true});
      await page.locator('.prepare-skills-area .quick-slot').nth(1).click();
      await choose(false);
      await page.waitForFunction(()=>!mist465_.loading);
      await page.locator('.prepare-skills-area .quick-slot').nth(1).click();
      await choose();
      await page.waitForFunction(()=>mist465_.data.skills.active[0]==='slash'&&!mist465_.loading);
      await page.getByRole('button',{name:'目前裝備＋能力值',exact:true}).click();
      assert.equal(await page.locator('#mistPrep474 .mist-ability-grid469>div').count(),6);
      await page.locator('#mistPrep474>.modal-box .inventory-main-tabs').getByRole('button',{name:'背包',exact:true}).click();
      await page.waitForTimeout(250);
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-bag470.png',fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'bag fits viewport');
      assert.equal(await page.locator('#mistPrep474 .tiles402').evaluate(e=>e.children.length),15,'equipment grid reserves 15 visual slots');
      await page.locator('.cell402').first().click();
      await page.getByRole('button',{name:'管理裝備',exact:true}).click();
      assert.equal(await page.locator('.item-manager307').count(),1);
      await page.evaluate(()=>closeModal());
      // Use synthetic mode storage to exercise the same controls near the forge.
      const player=input.world.players['preview-adventurer'];
      const playerCell=input.world.cells.find(c=>c.owner_account==='preview-adventurer'&&c.kind==='player');
      const forge=input.world.cells.find(c=>c.kind==='forge');
      input.world.cells=input.world.cells.filter(c=>c===playerCell||!(c.x===forge.x&&c.y===forge.y-1));
      Object.assign(playerCell,{x:forge.x,y:forge.y-1});
      player.inventory.gems=[{id:crypto.randomUUID(),kind:'gem',template:data.Gems[0].GemID}];
      await page.evaluate(()=>refreshMist465_());
      await page.evaluate(id=>mistItem469_(id,'equipped'),equipmentId);
      const energyBeforeForge=player.energy;dropReply=true;
      await page.getByRole('button',{name:'強化至 +10 · 體力 −1',exact:true}).click();
      await page.waitForFunction(()=>!!mist465_.pending&&!mist465_.loading);
      await page.locator('#modal').getByRole('button',{name:'重試本次操作',exact:true}).click();
      await page.waitForFunction(()=>!mist465_.loading&&Object.values(mist465_.data.equipment)[0].enhance===10);
      assert.equal(input.world.players['preview-adventurer'].energy,energyBeforeForge-1,'retry uses same request and spends exactly one AP');
      await page.evaluate(id=>mistItem469_(id,'equipped'),equipmentId);
      await page.locator('.gem-slot310 button').click();
      await page.locator('.pick-tile401').first().click();
      await page.locator('.pick-card401 footer .primary').click();
      await page.waitForFunction(()=>!mist465_.loading&&!!Object.values(mist465_.data.equipment)[0].gems[0]);
      await page.evaluate(id=>mistItem469_(id,'equipped'),equipmentId);
      await page.getByRole('button',{name:'拆卸',exact:true}).click();
      await page.waitForFunction(()=>!mist465_.loading&&mist465_.data.inventory.gems.length===1);
      await page.evaluate(()=>mistBagCategory470_('gems'));
      await page.locator('.cell402').first().click();
      await page.getByRole('button',{name:'鑲嵌寶石',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'丟棄寶石',exact:true}).count(),1);
      await page.evaluate(()=>closeModal());
      assert.equal(await page.getByRole('button',{name:'寶箱',exact:true}).count(),0,'chest category removed');
      assert.equal(await page.locator('#mistPrep474 .tiles402').evaluate(e=>e.children.length),15,'gem grid reserves 15 visual slots');
      await page.getByRole('button',{name:'關閉整備',exact:true}).click();
      assert.equal(await page.locator('#mistPrep474').count(),0);
      assert.deepEqual(await page.locator('.mist-map-scroll465').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop})),mapBefore,'closing preparation retains board position');
      input.world.players['preview-adventurer'].inventory.chests=[{id:crypto.randomUUID(),kind:'chest',name:'裝備寶箱',legendary:false}];
      await page.evaluate(()=>refreshMist465_());
      await page.waitForSelector('#mistChest471 .g431-skip:not([hidden])');
      await page.locator('#mistChest471 .g431-skip').click();
      await page.locator('#mistChest471 [data-keep471]').click();
      await page.waitForSelector('#mistChest471',{state:'detached'});
      await page.waitForFunction(()=>!mist465_.loading&&mist465_.data.inventory.chests.length===0);
      input.save.skillsOwned.push('magicMissileIII');
      assert.equal((await call('mist/skills',{expectedRevision:input.world.players['preview-adventurer'].revision,active:['slash','magicMissileIII'],passive:'adventurerAptitude'})).ok,true);
      input.now = "2026-11-16T01:31:00Z";
      await call("mist/status");
      const m = input.world.cells.find((c) => c.kind === "monster");
      const me = input.world.cells.find(
        (c) => c.owner_account === "preview-adventurer",
      );
      input.world.cells = input.world.cells.filter(
        (c) => c.id === me.id || !(c.x === m.x + 1 && c.y === m.y),
      );
      Object.assign(me, { x: m.x + 1, y: m.y });
      await page.evaluate(() => refreshMist465_());
      await page.getByRole("tab", { name: "棋盤", exact: true }).click();
      await page.evaluate(({ x, y }) => mistCellClick469_(x, y), m);
      await page
        .getByRole("button", { name: "挑戰 · −1 體力", exact: true })
        .click();
      await page.waitForSelector(".mist-shared470");
      const testBattle=input.world.meta.battles[input.world.players['preview-adventurer'].battle_id];
      testBattle.combat.defender.hp=testBattle.combat.defender.maxHp=10000;
      await page.evaluate(()=>refreshMist465_());
      await page.waitForTimeout(500);
      assert.deepEqual(errors, [], "play errors before combat");
      if (view === "mobile")
        assert.equal(
          await page
            .locator("#mainNav")
            .evaluate((e) => getComputedStyle(e).display),
          "none",
          "battle removes navigation",
        );
      assert.ok(
        await page
          .locator(".pixel-scene192")
          .evaluate((c) =>
            [...c.getContext("2d").getImageData(0, 0, 300, 300).data].some(
              (x) => x > 0,
            ),
          ),
        "hero actually painted",
      );
      assert.equal(await page.evaluate(()=>artImage202_(enemyArtKey202_()).naturalWidth>0),true,'shared monster art loaded');
      assert.equal(await page.locator('#enemyHpBar111 #enemyHpText').count(),1,'private enemy stats do not break shared HP positioning');
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
        "no horizontal overflow",
      );
      await page.evaluate(()=>{window.pixelProof471={shots:[],monster:[],hero:[]};const attack=pixelAttack192_;pixelAttack192_=function(...args){const result=attack(...args);const e=skillEvent386_(pixelStage192_,pixelSide192_(args[0]),performance.now());if(e)pixelProof471.shots.push({side:e.side,visual:e.visual386,index:e.shots386.length,canvas:pixelStage192_.canvas.isConnected});return result;};const monster=pixelDrawMonster192_;pixelDrawMonster192_=function(c,a,t,action){if(action)pixelProof471.monster.push(action.type);return monster(c,a,t,action);};const hero=pixelDrawHero192_;pixelDrawHero192_=function(c,a,g,t,action,...rest){if(action)pixelProof471.hero.push({side:a.side,type:action.type});return hero(c,a,g,t,action,...rest);};window.playback471=[];const original=arenaVisual_;arenaVisual_=async(...args)=>{playback471.push({actor:arenaSide_(args[0]),target:arenaSide_(args[1]),kind:args[2],hp:arenaBattle_.defender.hp,finished:arenaBattle_.finished});return original(...args);};});
      dropReply=true;
      await page
        .getByRole("button")
        .filter({ has: page.locator("b", { hasText: "砍擊" }) })
        .click();
      await page.waitForFunction(()=>!!mist465_.pending&&!mist465_.loading);
      assert.equal(await page.evaluate(()=>playback471.length),0,'unconfirmed turn does not invent attacks');
      await page.getByRole('button',{name:'重試同筆操作',exact:true}).click();
      await page.waitForFunction(() => !mist465_.loading&&!mistAnimating470_&&!mistPresentation471_);
      const played=await page.evaluate(()=>({events:mist465_.data.battle.events471.filter(e=>e.type==='visual').map(e=>({actor:e.actor,target:e.target,kind:e.kind})),actual:playback471,finalHP:mist465_.data.battle.defender.hp}));
      assert.ok(played.events.length>=2,'both sides have authoritative attack events');
      assert.deepEqual(played.actual.map(({actor,target,kind})=>({actor,target,kind})),played.events,'all real attack motions play in order');
      assert.ok(played.actual.every(x=>!x.finished),'result is not shown before attacks finish');
      assert.ok(played.actual[0].hp>played.finalHP,'first attack starts before HP is deducted');

      assert.ok(
        await page.evaluate(
          () =>
            mist465_.data.battle.turn === 2 || mist465_.data.battle.finished,
        ),
      );
      await page.screenshot({
        path:
          "/workspace/work/mist465-preview/" +
          engine +
          "-" +
          view +
          "-" +
          width +
          "-combat470.png",
        fullPage: true,
      });
      await page.getByRole('button').filter({has:page.locator('b',{hasText:'魔法彈III'})}).click();
      await page.waitForFunction(()=>mistAnimating470_);
      await page.waitForTimeout(200);
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-magic471.png',fullPage:true});
      await page.waitForFunction(()=>!mist465_.loading&&!mistAnimating470_);
      const multi=await page.evaluate(()=>({expected:mist465_.data.battle.events471.filter(e=>e.type==='visual'&&e.actor==='attacker'&&e.kind==='magic').length,actual:playback471.filter(e=>e.actor==='attacker'&&e.kind==='magic').length}));
      assert.equal(multi.expected,4,'magic missile III has all four hits');assert.equal(multi.actual,4,'every magical hit is animated');
      const proof=await page.evaluate(()=>pixelProof471);
      assert.deepEqual(proof.shots.filter(x=>x.side==='player'&&x.visual==='missile').map(x=>x.index),[1,2,3,4],'four real projectiles are queued on the live shared canvas');
      assert.ok(proof.monster.some(x=>x==='attack'||x==='magic'),'monster action really renders on animation frames');
      assert.ok(proof.monster.includes('hit'),'monster hit reaction really renders');
      assert.ok(proof.hero.some(x=>x.side==='player'&&x.type==='hit'),'player hit reaction really renders');
      // Same battle survives page status refresh; timeout keeps the result screen/nav rule.
      const id = await page.evaluate(() => mist465_.data.battle.id);
      await page.evaluate(() => refreshMist465_());
      assert.equal(await page.evaluate(() => mist465_.data.battle.id), id);
      input.now = "2026-11-16T01:42:00Z";
      await page.evaluate(() => refreshMist465_());
      assert.equal(
        await page.evaluate(() => mist465_.data.battle.finished),
        true,
      );
      if (view === "mobile")
        assert.equal(
          await page
            .locator("#mainNav")
            .evaluate((e) => getComputedStyle(e).display),
          "none",
        );
      await page.getByRole("button", { name: "返回棋盤", exact: true }).click();
      await page.waitForFunction(() => !mist465_.data.battle);
      assert.equal(await page.locator(".mist-shared470").count(), 0);
      if (view === "mobile")
        assert.notEqual(
          await page
            .locator("#mainNav")
            .evaluate((e) => getComputedStyle(e).display),
          "none",
        );
      // Player encounters use the same complete renderer with the public appearance only.
      const rival=await reduceMist468(input,'preview-rival','join',{appearance:{sex:'female',suit:2,head:3,kind:'staff',glow:true}},()=>0.4);
      input.world=rival.world;
      const aCell=input.world.cells.find(c=>c.owner_account==='preview-adventurer'&&c.kind==='player'),bCell=input.world.cells.find(c=>c.owner_account==='preview-rival'&&c.kind==='player');
      input.world.cells=input.world.cells.filter(c=>c===aCell||c===bCell||!((c.x===5||c.x===6)&&c.y===5));
      Object.assign(aCell,{x:5,y:5});Object.assign(bCell,{x:6,y:5});
      input.world.players['preview-rival'].protected_until=null;
      input.world.players['preview-adventurer'].energy=10;
      await page.evaluate(()=>refreshMist465_());
      await page.evaluate(()=>mistCellClick469_(6,5));
      await page.getByRole('button',{name:'發起挑戰 · −1 體力',exact:true}).click();
      await page.waitForSelector('.mist-shared470');
      assert.equal(await page.evaluate(()=>pixelGear192_('enemy').sex),'female');
      assert.equal(await page.locator('#enemyBattleStats').count(),0,'private opponent stats are not rendered');
      await page.waitForTimeout(300);
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-pvp470.png',fullPage:true});
      input.now='2026-11-16T01:53:00Z';
      await page.evaluate(()=>refreshMist465_());
      await page.getByRole('button',{name:'返回棋盤',exact:true}).click();
      await page.waitForFunction(()=>!mist465_.data.battle);
      assert.equal(await page.evaluate(()=>JSON.stringify([state.inventory,state.equipment,state.gems,state.gold,state.skillsOwned,state.equippedSkills,state.passive,state.pets297])),formalBefore,'mode controls never mutate formal equipment, gems, skills, gold or pets');
      assert.deepEqual(errors, [], "play runtime errors");
      assert.deepEqual(missing, [], "missing assets");
      await page.close();
      console.log(
        engine,
        view,
        width,
        height,
        "join, starter, equip, skills, combat, recovery, exit passed",
      );
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
