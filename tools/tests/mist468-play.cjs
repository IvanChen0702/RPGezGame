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
      ["mobile", 844, 390],
    ]) {
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
      console.log("fixture installed");
      await page.evaluate(() => refreshMist465_());
      console.log("status received");
      await page.waitForTimeout(100);
      settingUp = false;
      console.log("joining");
      await page.getByRole("button", { name: "參加本季", exact: true }).click();
      await page.waitForFunction(() => !!mist465_.data?.self);
      await page.getByRole("tab", { name: "棋盤", exact: true }).click();
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
      await page.getByRole("tab", { name: "行囊", exact: true }).click();
      await page.getByRole("button", { name: /^開啟補給/ }).click();
      await page.waitForFunction(
        () => mist465_.data.inventory.equipment.length === 4,
      );
      await page.locator(".mist-bag-grid469 button").first().click();
      await page
        .getByRole("button", { name: "裝備", exact: true })
        .first()
        .click();
      await page.waitForFunction(
        () => Object.keys(mist465_.data.equipment).length === 1,
      );
      const equipmentId = await page.evaluate(
        () => Object.values(mist465_.data.equipment)[0].id,
      );
      assert.ok(equipmentId);
      await page.locator(".mist-skill469").nth(1).click();
      await page.getByRole("button", { name: "選擇", exact: true }).first().click();
      await page.waitForFunction(() => !mist465_.loading);
      assert.equal(
        await page.evaluate(() => mist465_.data.skills.active[0]),
        "slash",
      );
      await page.waitForFunction(()=>document.querySelector('[data-mist-hero469="self"]')?.dataset.painted==='true');
      assert.equal(await page.locator('.mist-ability-grid469>div').count(),6);
      await page.locator('#mistPanel465').evaluate(e=>e.scrollTop=0);
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-bag469.png',fullPage:true});
      const spawn=input.world.cells.find(c=>c.kind==='spawn');
      const pawn=input.world.cells.find(c=>c.kind==='player'&&c.owner_account==='preview-adventurer');
      input.world.cells=input.world.cells.filter(c=>c.id===pawn.id||!(c.x===spawn.x+1&&c.y===spawn.y));
      Object.assign(pawn,{x:spawn.x+1,y:spawn.y});
      await page.evaluate(()=>refreshMist465_());
      await page.getByRole('tab',{name:'棋盤',exact:true}).click();
      const warning=page.locator('.mist-cell465[data-x="'+spawn.x+'"][data-y="'+spawn.y+'"]');
      assert.equal(await warning.locator('img').count(),0,'pending spawn must not reveal a monster sprite');
      assert.equal(await warning.locator('.mist-summon469').count(),1);
      assert.match(await warning.innerText(),/分鐘/);
      await warning.click();
      assert.equal(await page.getByRole('button',{name:'挑戰 · −1 體力',exact:true}).isDisabled(),true);
      await page.waitForTimeout(250);
      if(width<=900){const bounds=await page.locator('.mist-picker469').boundingBox();assert.ok(bounds.y>=0&&bounds.x>=0&&bounds.y+bounds.height<=height+1&&bounds.x+bounds.width<=width+1,'encounter dialog inside viewport: '+JSON.stringify(bounds));}
      await page.screenshot({path:'/workspace/work/mist465-preview/'+engine+'-'+width+'-summon469.png',fullPage:true});
      await page.evaluate(()=>closeQuickPicker());
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
      await page.waitForSelector(".mist-battle468");
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
          .locator("#mistHero468")
          .evaluate((c) =>
            [...c.getContext("2d").getImageData(0, 0, 300, 300).data].some(
              (x) => x > 0,
            ),
          ),
        "hero actually painted",
      );
      assert.equal(
        await page
          .locator(".mist-enemy468")
          .evaluate((i) => i.complete && i.naturalWidth > 0),
        true,
        "monster art loaded",
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
        "no horizontal overflow",
      );
      await page
        .getByRole("button")
        .filter({ has: page.locator("span", { hasText: "砍擊" }) })
        .click();
      await page.waitForFunction(() => !mist465_.loading);
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
          "-combat468.png",
        fullPage: true,
      });
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
      assert.equal(await page.locator(".mist-battle468").count(), 0);
      if (view === "mobile")
        assert.notEqual(
          await page
            .locator("#mainNav")
            .evaluate((e) => getComputedStyle(e).display),
          "none",
        );
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
