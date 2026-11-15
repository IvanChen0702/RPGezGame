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
      await page.getByRole("tab", { name: "行囊", exact: true }).click();
      await page.getByRole("button", { name: "開啟補給", exact: true }).click();
      await page.waitForFunction(
        () => mist465_.data.inventory.equipment.length === 4,
      );
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
      await page.locator(".mist-skill-config468 summary").click();
      await page.getByRole("button", { name: "儲存技能", exact: true }).click();
      await page.waitForFunction(() => !mist465_.loading);
      assert.equal(
        await page.evaluate(() => mist465_.data.skills.active[0]),
        "slash",
      );
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
      await page.evaluate(({ x, y }) => mistSelect465_(x, y), m);
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
