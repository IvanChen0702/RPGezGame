import { createMistCombat468 } from "./mist-combat468.js";
const clone = (x) => structuredClone(x),
  iso = (n) => new Date(n).toISOString(),
  ms = (x) => (x ? Date.parse(x) : 0),
  day = (n) => new Date(n + 8 * 3600000).toISOString().slice(0, 10),
  enabled = (r) =>
    r.Enabled !== false && String(r.Enabled).toLowerCase() !== "false";
const fail = (s) => {
    throw Error("MIST_" + s);
  },
  uuid = () => crypto.randomUUID(),
  equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const activeSlots = [
  "head",
  "armor",
  "weapon",
  "special",
  "ring1",
  "ring2",
  "ring3",
  "ring4",
];
export async function reduceMist468(
  input,
  account,
  action,
  payload = {},
  random = Math.random,
) {
  const before = clone(input.world),
    w = clone(input.world),
    now = ms(input.now),
    live = input.planning?.data;
  if (!live?.MistConfig?.length || !live.MistEnemies?.length)
    fail("PLANNING_MISSING");
  const liveCfg = Object.fromEntries(
    live.MistConfig.map((r) => [r.Key, r.Value]),
  );
  const configuredOpen =
    liveCfg.Enabled === true || String(liveCfg.Enabled) === "true";
  if (!configuredOpen && !w.season)
    return {
      result: {
        ok: true,
        ready: false,
        message: "戰境準備中。",
        self: null,
        cells: [],
        ranking: [],
        reports: [],
      },
      patch: null,
    };
  let data = w.season?.rules?.planning || live,
    config = Object.fromEntries(data.MistConfig.map((r) => [r.Key, r.Value]));
  const c = (k) => {
    const n = Number(config[k]);
    if (!Number.isFinite(n)) fail("CONFIG_INVALID:" + k);
    return n;
  };
  let core = createMistCombat468(data, random);
  const additions = { seasons: [], reports: [], rewards: [] };
  w.meta.battles ||= {};
  w.meta.pairs ||= {};
  const choose = (arr) => {
    if (!arr.length) fail("POOL_EMPTY");
    return arr[Math.min(arr.length - 1, Math.floor(random() * arr.length))];
  };
  const pos = (p) =>
    w.cells.find(
      (x) => x.kind === "player" && x.owner_account === p.account_id,
    );
  const adjacent = (a, b) =>
    a && b && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  const visible = (p, x, y) => {
    const p0 = pos(p);
    return (
      (p0 && Math.abs(p0.x - x) <= 1 && Math.abs(p0.y - y) <= 1) ||
      w.flags.some(
        (f) =>
          f.owner_account === p.account_id &&
          Math.abs(f.x - x) <= 1 &&
          Math.abs(f.y - y) <= 1,
      )
    );
  };
  const freshCell = (x, y, kind, owner_account = null, payload = {}) => ({
    id: uuid(),
    season_id: w.season.id,
    x,
    y,
    kind,
    owner_account,
    payload,
  });
  function regen(p) {
    if (p.energy === c("EnergyCap")) return;
    const h = Math.max(
      0,
      Math.floor(
        (now - ms(p.energy_at)) / (c("EnergyRecoveryMinutes") * 60000),
      ),
    );
    if (p.energy + h >= c("EnergyCap")) {
      p.energy = c("EnergyCap");
      p.energy_at = iso(now);
    } else {
      p.energy += h;
      p.energy_at = iso(
        ms(p.energy_at) + h * c("EnergyRecoveryMinutes") * 60000,
      );
    }
  }
  function spend(p, n) {
    regen(p);
    if (p.energy === c("EnergyCap")) p.energy_at = iso(now);
    if (p.energy < n) fail("ENERGY_LOW");
    p.energy -= n;
  }
  function unoccupied(x, y) {
    return !w.cells.some((c) => c.x === x && c.y === y);
  }
  function empty(edge = false) {
    const out = [],
      n = w.season.size;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const boundary = x === 0 || y === 0 || x === n - 1 || y === n - 1;
        if (boundary === edge && unoccupied(x, y)) out.push({ x, y });
      }
    return out;
  }
  function spawn(p, protect = true) {
    let cells = empty(true);
    while (!cells.length) {
      if (w.season.size >= 256) fail("MAP_FULL");
      w.season.size += 2;
      cells = empty(true);
    }
    const at = choose(cells);
    w.cells = w.cells.filter(
      (c) => !(c.kind === "player" && c.owner_account === p.account_id),
    );
    w.cells.push(freshCell(at.x, at.y, "player", p.account_id));
    p.runtime.spawn = at;
    p.runtime.dead = false;
    p.protected_until = protect
      ? iso(now + c("ProtectionMinutes") * 60000)
      : null;
    p.hidden_until = null;
    return at;
  }
  function report(p, result, title, description) {
    const r = {
      id: uuid(),
      season_id: w.season.id,
      account_id: p.account_id,
      created_at: iso(now),
      result,
      summary: { title, description, points: p.points },
      read_at: null,
    };
    additions.reports.push(r);
    p.runtime.reports = [r, ...(p.runtime.reports || [])].slice(0, 30);
  }
  const capacity = (k) =>
    c(
      {
        equipment: "EquipmentCapacity",
        gems: "GemCapacity",
        chests: "ChestCapacity",
      }[k],
    );
  const group = (x) =>
    x.kind === "equipment" ? "equipment" : x.kind === "gem" ? "gems" : "chests";
  function award(p, item) {
    const list = p.inventory[group(item)];
    if (list.length < capacity(group(item))) list.push(item);
    else p.pending_loot.push(item);
  }
  function weighted(pool, allow = () => true) {
    const rows = data.MistLootRules.filter(
      (r) =>
        r.Pool === pool && enabled(r) && allow(r.Value) && Number(r.Weight) > 0,
    );
    const total = rows.reduce((n, r) => n + Number(r.Weight), 0);
    if (!total) fail("POOL_EMPTY");
    let n = random() * total;
    return (
      rows.find((r) => (n -= Number(r.Weight)) < 0)?.Value ?? rows.at(-1).Value
    );
  }
  function rollEquipment(slot = null, legendary = false, starter = false) {
    const exclude = String(config.ExcludedEquipmentIDs || "gmSword")
      .toLowerCase()
      .split(",")
      .map((x) => x.trim());
    let rows = data.Equipment.filter(
      (r) =>
        enabled(r) &&
        !exclude.includes(String(r.ItemID).toLowerCase()) &&
        (!slot || r.Slot === slot),
    );
    const rarity = legendary
      ? "傳說"
      : weighted("rarity", (v) => rows.some((r) => r.Rarity === v));
    rows = rows.filter((r) => r.Rarity === rarity);
    const r = choose(rows);
    return {
      id: uuid(),
      template: r.ItemID,
      name: r.Name,
      slot: r.Slot,
      rarity: r.Rarity,
      kind: "equipment",
      enhance: Number(weighted("enhancement")),
      sockets: 1,
      gems: [null],
      starter,
    };
  }
  function starter(p) {
    p.runtime.starter = {
      id: uuid(),
      name: "重生補給箱",
      kind: "starter",
      position: choose(
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]
          .map(([dx, dy]) => ({ x: pos(p).x + dx, y: pos(p).y + dy }))
          .filter(
            (t) =>
              t.x >= 0 &&
              t.y >= 0 &&
              t.x < w.season.size &&
              t.y < w.season.size,
          ),
      ),
      opened: false,
    };
  }
  function chest(legendary = false) {
    return {
      id: uuid(),
      kind: "chest",
      name: legendary ? "傳說裝備寶箱" : "裝備寶箱",
      legendary,
    };
  }
  function stats(p) {
    const s = core.snapshot(p),
      ratio = p.max_hp ? Math.max(0, p.hp) / p.max_hp : 1;
    p.max_hp = s.stats.hp;
    p.hp = Math.min(
      p.max_hp,
      Math.max(p.hp > 0 ? 1 : 0, Math.floor(ratio * p.max_hp)),
    );
    return s;
  }
  function clearDead(p) {
    p.equipment = {};
    p.inventory = { equipment: [], gems: [], chests: [] };
    p.pending_loot = [];
    p.battle_id = null;
    p.hidden_until = null;
    p.protected_until = null;
    p.runtime.starter = null;
    p.runtime.dead = true;
    w.flags = w.flags.filter((f) => f.owner_account !== p.account_id);
    w.cells = w.cells.filter(
      (c) => !(c.kind === "player" && c.owner_account === p.account_id),
    );
    stats(p);
    p.hp = 0;
  }
  function transferDrops(loser, winner) {
    const eligible = Object.values(loser.equipment).filter(
      (x) => x && !x.starter,
    );
    const count = Math.min(
        eligible.length,
        c("PlayerDropMin") +
          Math.floor(random() * (c("PlayerDropMax") - c("PlayerDropMin") + 1)),
      ),
      items = [];
    while (items.length < count) {
      const it = choose(eligible);
      eligible.splice(eligible.indexOf(it), 1);
      items.push(it);
    }
    if (items.length)
      award(winner, {
        id: uuid(),
        kind: "chest",
        name: loser.nickname + "的戰利品",
        contents: items,
      });
  }
  function finishBattle(b, forced = false) {
    const a = w.players[b.attacker],
      d = b.defender ? w.players[b.defender] : null,
      A = b.combat.attacker,
      D = b.combat.defender;
    a.hp = Math.max(
      0,
      Math.min(a.max_hp, Math.floor((A.hp / A.maxHp) * a.max_hp)),
    );
    a.battle_id = null;
    if (d) {
      d.hp = Math.max(
        0,
        Math.min(d.max_hp, Math.floor((D.hp / D.maxHp) * d.max_hp)),
      );
      d.battle_id = null;
    }
    let result = "draw";
    if (!forced && A.hp <= 0 && D.hp <= 0) result = "mutual";
    else if (!forced && D.hp <= 0) result = "win";
    else if (!forced && A.hp <= 0) result = "loss";
    if (result === "mutual") {
      clearDead(a);
      if (d) clearDead(d);
      else w.cells = w.cells.filter((x) => x.id !== b.target);
    } else if (result === "win") {
      a.points += d
        ? c("PlayerWinPoints")
        : b.monster.Elite
          ? c("EliteWinPoints")
          : c("NormalWinPoints");
      if (d) {
        a.kills++;
        transferDrops(d, a);
        clearDead(d);
      } else {
        w.cells = w.cells.filter((x) => x.id !== b.target);
        award(a, chest(!!b.monster.Elite));
      }
    } else if (result === "loss") {
      if (d) {
        a.points = Math.max(
          c("MinimumPoints"),
          a.points - c("AttackerLossPoints"),
        );
        d.points += c("PlayerWinPoints");
        d.kills++;
        transferDrops(a, d);
        clearDead(a);
      } else {
        const home = a.runtime.spawn;
        w.cells = w.cells.filter(
          (x) => !(x.kind === "player" && x.owner_account === a.account_id),
        );
        if (home && unoccupied(home.x, home.y))
          w.cells.push(freshCell(home.x, home.y, "player", a.account_id));
        else spawn(a, false);
        a.hp = Math.max(
          1,
          Math.floor((a.max_hp * c("MonsterLossHealPercent")) / 100),
        );
        a.protected_until = null;
        a.hidden_until = null;
      }
    }
    if (!d) {
      const target = w.cells.find((x) => x.id === b.target);
      if (target) {
        delete target.payload.battleId;
        target.payload.hp = Math.max(1, D.hp);
      }
    }
    b.finished = true;
    b.result = result;
    b.finishedAt = iso(now);
    b.combat.finished = true;
    report(
      a,
      (result === "loss" && d) || result === "mutual" ? "death" : result,
      "與" + (d?.nickname || b.monster.Name) + "的戰鬥",
      forced
        ? "戰鬥逾時，保留最後確認的 HP，體力不退還。"
        : {
            win: "挑戰勝利",
            loss: "挑戰失敗",
            mutual: "雙方同時倒下",
            draw: "30 回合結束，平局",
          }[result],
    );
    if (d)
      report(
        d,
        result === "win" || result === "mutual"
          ? "death"
          : result === "loss"
            ? "win"
            : "draw",
        "遭遇 " + a.nickname,
        result === "win"
          ? "你被 " + a.nickname + " 擊敗。"
          : result === "loss"
            ? "你擊退了 " + a.nickname + "。"
            : result === "mutual"
              ? "雙方同時倒下。"
              : "對戰平局。",
      );
    a.runtime.lastBattle = b.id;
    if (d) d.runtime.lastBattle = b.id;
  }
  function settle() {
    const ranked = Object.values(w.players).sort(
      (a, b) => b.points - a.points || b.kills - a.kills,
    );
    const t = data.BoxingSeasons_SCHEMA.find((r) => r.SeasonID === "2026-W42");
    if (!t) fail("REWARD_CONFIG_MISSING");
    let rank = 0,
      last = "";
    ranked.forEach((p, i) => {
      const k = p.points + ":" + p.kills;
      if (k !== last) {
        rank = i + 1;
        last = k;
      }
      if (rank <= 10) {
        const index = rank <= 3 ? rank : 4;
        const prefix = "Rank" + (index === 4 ? "4To10" : index),
          amount = Number(t[prefix + "RewardQuantity"]),
          id = String(t[prefix + "RewardID"] || "");
        if (
          t[prefix + "RewardType"] !== "CONSUMABLE" ||
          !id ||
          !Number.isSafeInteger(amount) ||
          amount < 1
        )
          fail("REWARD_CONFIG_INVALID");
        additions.rewards.push({
          season_id: w.season.id,
          account_id: p.account_id,
          rank,
          reward: { id, quantity: amount },
          claimed_at: null,
        });
      }
    });
    w.season.status = "SETTLED";
    additions.seasons.push(clone(w.season));
  }
  function startSeason() {
    if (w.season) additions.players = Object.values(w.players).map(clone);
    const tw = new Date(now + 8 * 3600000),
      dow = (tw.getUTCDay() + 6) % 7,
      start =
        Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate() - dow) -
        8 * 3600000;
    const planning = Object.fromEntries(
      [
        "GameConfig",
        "MistConfig",
        "MistEnemies",
        "MistLootRules",
        "Equipment",
        "Skills",
        "Gems",
        "Enhancement",
        "StatusEffects",
        "BoxingSeasons_SCHEMA",
      ].map((k) => [k, live[k] || []]),
    );
    w.season = {
      id: "MIST_" + day(start),
      starts_at: iso(start),
      closes_at: iso(start + 167 * 3600000),
      settles_at: iso(start + 167 * 3600000 + 10 * 60000),
      size: Number(liveCfg.InitialMapSize),
      status: "ACTIVE",
      rules: { planning, planningVersion: input.planning.dataVersion },
    };
    w.players = {};
    w.cells = [];
    w.flags = [];
    w.meta = { battles: {}, pairs: {}, supplyDay: null, lastSpawn: 0 };
    data = planning;
    config = Object.fromEntries(data.MistConfig.map((r) => [r.Key, r.Value]));
    core = createMistCombat468(data, random);
    const f = choose(empty(false));
    w.cells.push(freshCell(f.x, f.y, "forge", null, { name: "鐵匠鋪" }));
  }
  // Finish interrupted combat before settling or entering another season.
  for (const b of Object.values(w.meta.battles))
    if (
      !b.finished &&
      (now >= ms(b.deadline) || (w.season && now >= ms(w.season.settles_at)))
    )
      finishBattle(b, true);
  if (
    w.season &&
    now >= ms(w.season.settles_at) &&
    w.season.status !== "SETTLED"
  )
    settle();
  if (
    configuredOpen &&
    (!w.season || now >= ms(w.season.starts_at) + 7 * 86400000)
  )
    startSeason();
  if (now >= ms(w.season.closes_at) && w.season.status === "ACTIVE")
    w.season.status = "SETTLING";
  if (configuredOpen && w.season.status === "ACTIVE") {
    if (w.meta.supplyDay !== day(now)) {
      w.cells = w.cells.filter((x) => x.kind !== "supply");
      const at = choose(empty(false));
      w.cells.push(freshCell(at.x, at.y, "supply", null, { name: "補給站" }));
      w.meta.supplyDay = day(now);
    }
    for (const cell of w.cells)
      if (cell.kind === "spawn" && ms(cell.payload.spawnAt) <= now)
        cell.kind = "monster";
    if (now - Number(w.meta.lastSpawn || 0) >= 60000) {
      for (const elite of [false, true]) {
        const count = w.cells.filter(
          (x) =>
            ["monster", "spawn"].includes(x.kind) &&
            !!x.payload.elite === elite,
        ).length;
        for (
          let i = count;
          i < c(elite ? "EliteMonsterCap" : "NormalMonsterCap");
          i++
        ) {
          const cells = empty(false);
          if (!cells.length) break;
          const at = choose(cells),
            m = choose(
              data.MistEnemies.filter((x) => enabled(x) && !!x.Elite === elite),
            );
          w.cells.push(
            freshCell(at.x, at.y, "spawn", null, {
              template: m.EnemyID,
              name: m.Name,
              art: m.Art,
              elite,
              spawnAt: iso(now + c("MonsterSpawnWarningMinutes") * 60000),
              hp: m.HP,
            }),
          );
        }
      }
      w.meta.lastSpawn = now;
    }
  }
  const retained = new Set(
    Object.values(w.players)
      .map((p) => p.runtime.lastBattle)
      .filter(Boolean),
  );
  for (const [id, b] of Object.entries(w.meta.battles))
    if (b.finished && !retained.has(id)) delete w.meta.battles[id];
  for (const [key, pair] of Object.entries(w.meta.pairs))
    if (ms(pair.until) <= now) delete w.meta.pairs[key];
  let p = w.players[account];
  if (
    p &&
    action !== "status" &&
    action !== "join" &&
    Number(payload.expectedRevision) !== p.revision
  )
    fail("STALE");
  if (p) regen(p);
  const seasonOpen =
    configuredOpen &&
    w.season.status === "ACTIVE" &&
    now < ms(w.season.closes_at);
  if (
    action !== "status" &&
    action !== "battle/turn" &&
    action !== "battle/leave" &&
    action !== "reports/read" &&
    !seasonOpen
  )
    fail("NOT_OPEN");
  if (action === "join") {
    if (!p) {
      const allowed = input.save?.skillsOwned || [];
      const skills = {
        active: (input.save?.equippedSkills || [])
          .filter(
            (x) =>
              allowed.includes(x) &&
              core.templates.skills[x]?.type === "active" &&
              core.templates.skills[x]?.enabled !== false,
          )
          .slice(0, 3),
        passive:
          (input.save?.passive || []).find(
            (x) =>
              allowed.includes(x) &&
              core.templates.skills[x]?.type === "passive" &&
              core.templates.skills[x]?.enabled !== false,
          ) || null,
      };
      p = {
        season_id: w.season.id,
        account_id: account,
        nickname: input.nickname || "冒險者",
        hp: 100,
        max_hp: 100,
        energy: c("EnergyInitial"),
        energy_at: iso(now),
        points: 0,
        kills: 0,
        protected_until: null,
        hidden_until: null,
        supplied_on: null,
        battle_id: null,
        revision: 1,
        equipment: {},
        inventory: { equipment: [], gems: [], chests: [] },
        pending_loot: [],
        skills,
        defense_snapshot: {},
        runtime: { reports: [] },
      };
      w.players[account] = p;
      stats(p);
      p.hp = p.max_hp;
      spawn(p);
      starter(p);
      p.defense_snapshot = core.snapshot(p);
    }
  } else if (action !== "status") {
    if (!p) fail("NOT_JOINED");
    if (p.battle_id && !["battle/turn", "battle/leave"].includes(action))
      fail("IN_BATTLE");
    if (
      p.runtime.dead &&
      !["respawn", "reports/read", "battle/leave"].includes(action)
    )
      fail("RESPAWN_REQUIRED");
    const at = pos(p);
    if (action === "respawn") {
      if (!p.runtime.dead) fail("NOT_DEAD");
      spawn(p);
      p.hp = p.max_hp;
      starter(p);
      p.defense_snapshot = core.snapshot(p);
    } else if (action === "move") {
      if (p.pending_loot.length) fail("LOOT_PENDING");
      const { x, y } = payload;
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 0 ||
        y < 0 ||
        x >= w.season.size ||
        y >= w.season.size ||
        !adjacent(at, { x, y })
      )
        fail("INVALID_MOVE");
      if (!unoccupied(x, y)) fail("CELL_BLOCKED");
      spend(p, c("MoveCost"));
      at.x = x;
      at.y = y;
      p.protected_until = null;
    } else if (action === "flag") {
      if (
        w.flags.filter((f) => f.owner_account === account).length >=
        c("MaxFlags")
      )
        fail("FLAG_LIMIT");
      if (w.flags.some((f) => f.x === at.x && f.y === at.y))
        fail("FLAG_EXISTS");
      spend(p, c("FlagCost"));
      w.flags.push({
        season_id: w.season.id,
        owner_account: account,
        x: at.x,
        y: at.y,
        created_at: iso(now),
      });
      p.hidden_until = null;
    } else if (action === "unflag") {
      const f = w.flags.find((f) => f.x === payload.x && f.y === payload.y);
      if (!f) fail("FLAG_MISSING");
      if (f.owner_account !== account) {
        if (!adjacent(at, f) && !(at.x === f.x && at.y === f.y))
          fail("NOT_ADJACENT");
        spend(p, c("RemoveEnemyFlagCost"));
        p.hidden_until = null;
      }
      w.flags = w.flags.filter((x) => x !== f);
    } else if (action === "hide") {
      if (ms(p.hidden_until) > now) fail("ALREADY_HIDDEN");
      spend(p, c("HideCost"));
      p.hidden_until = iso(now + c("HideMinutes") * 60000);
    } else if (action === "chest/open") {
      const box = p.runtime.starter;
      if (box?.id === payload.chestId && !box.opened) {
        if (
          !adjacent(at, box.position) &&
          !(at.x === box.position.x && at.y === box.position.y)
        )
          fail("NOT_ADJACENT");
        for (const slot of ["head", "armor", "weapon", "special"])
          award(p, rollEquipment(slot, false, true));
        box.opened = true;
      } else {
        const b = p.inventory.chests.find((x) => x.id === payload.chestId);
        if (!b) fail("ITEM_MISSING");
        p.inventory.chests = p.inventory.chests.filter((x) => x !== b);
        for (const item of b.contents || [rollEquipment(null, b.legendary)])
          award(p, item);
      }
    } else if (action === "loot/take" || action === "loot/discard") {
      const x = p.pending_loot.find((x) => x.id === payload.itemId);
      if (!x) fail("ITEM_MISSING");
      if (action === "loot/take") {
        if (p.inventory[group(x)].length >= capacity(group(x)))
          fail("BAG_FULL");
        p.inventory[group(x)].push(x);
      }
      p.pending_loot = p.pending_loot.filter((i) => i !== x);
    } else if (action === "equip") {
      const x = p.inventory.equipment.find((x) => x.id === payload.itemId);
      if (!x) fail("ITEM_MISSING");
      const slot = x.slot === "ring" ? String(payload.slot || "ring1") : x.slot;
      if (
        !activeSlots.includes(slot) ||
        (x.slot === "ring" && !slot.startsWith("ring"))
      )
        fail("INVALID_SLOT");
      const prior = p.equipment[slot];
      p.inventory.equipment = p.inventory.equipment.filter((i) => i !== x);
      if (prior) p.inventory.equipment.push(prior);
      p.equipment[slot] = x;
      stats(p);
    } else if (action === "unequip") {
      const x = p.equipment[payload.slot];
      if (!x) fail("ITEM_MISSING");
      if (p.inventory.equipment.length >= capacity("equipment"))
        fail("BAG_FULL");
      delete p.equipment[payload.slot];
      p.inventory.equipment.push(x);
      stats(p);
    } else if (action === "discard") {
      const kind = payload.kind;
      if (!["equipment", "gems", "chests"].includes(kind)) fail("INVALID_ITEM");
      const i = p.inventory[kind].find((x) => x.id === payload.itemId);
      if (!i) fail("ITEM_MISSING");
      p.inventory[kind] = p.inventory[kind].filter((x) => x !== i);
    } else if (action === "gem/insert" || action === "gem/remove") {
      const item =
        p.inventory.equipment.find((x) => x.id === payload.itemId) ||
        Object.values(p.equipment).find((x) => x?.id === payload.itemId);
      if (!item) fail("ITEM_MISSING");
      const gem = p.inventory.gems.find((g) => g.id === payload.gemId);
      if (action === "gem/insert" && !gem) fail("ITEM_MISSING");
      if (
        action === "gem/remove" &&
        p.inventory.gems.length >= capacity("gems")
      )
        fail("BAG_FULL");
      if (gem) p.inventory.gems = p.inventory.gems.filter((g) => g !== gem);
      if (item.gems?.[0]) p.inventory.gems.push(item.gems[0]);
      item.gems = [gem || null];
      stats(p);
    } else if (action === "skills") {
      const own = new Set(input.save?.skillsOwned || []),
        active = payload.active,
        passive = payload.passive || null;
      if (
        !Array.isArray(active) ||
        active.length > 3 ||
        new Set(active.filter(Boolean)).size !==
          active.filter(Boolean).length ||
        active.some(
          (id) =>
            id &&
            (!own.has(id) ||
              core.templates.skills[id]?.type !== "active" ||
              core.templates.skills[id]?.enabled === false),
        ) ||
        (passive &&
          (!own.has(passive) ||
            core.templates.skills[passive]?.type !== "passive" ||
            core.templates.skills[passive]?.enabled === false))
      )
        fail("SKILL_NOT_OWNED");
      p.skills = { active: active.filter(Boolean), passive };
      stats(p);
    } else if (action === "forge") {
      const forge = w.cells.find((x) => x.kind === "forge");
      if (!adjacent(at, forge)) fail("NOT_ADJACENT");
      const item =
        p.inventory.equipment.find((x) => x.id === payload.itemId) ||
        Object.values(p.equipment).find((x) => x?.id === payload.itemId);
      if (!item || item.enhance >= c("ForgeEnhanceLevel")) fail("INVALID_ITEM");
      spend(p, c("ForgeEnergyCost"));
      item.enhance = c("ForgeEnhanceLevel");
      stats(p);
    } else if (action === "supply") {
      const s = w.cells.find((x) => x.kind === "supply");
      if (!s || Math.abs(s.x - at.x) > 1 || Math.abs(s.y - at.y) > 1)
        fail("NOT_NEARBY");
      if (p.supplied_on === day(now)) fail("SUPPLY_USED");
      if (payload.choice === "heal")
        p.hp = Math.min(
          p.max_hp,
          p.hp + Math.floor((p.max_hp * c("SupplyHealPercent")) / 100),
        );
      else if (payload.choice === "gem") {
        const g = choose(data.Gems.filter(enabled));
        award(p, { id: uuid(), kind: "gem", template: g.GemID, name: g.Name });
      } else fail("INVALID_REQUEST");
      p.supplied_on = day(now);
    } else if (action === "reports/read") {
      for (const r of p.runtime.reports || []) r.read_at = iso(now);
    } else if (action === "battle/start") {
      const target = w.cells.find((x) => x.id === payload.targetId);
      if (!target || !adjacent(at, target)) fail("NOT_ADJACENT");
      const d =
        target.kind === "player" ? w.players[target.owner_account] : null;
      if (target.kind !== "monster" && !d) fail("INVALID_TARGET");
      if (d && (ms(d.hidden_until) > now || ms(d.protected_until) > now))
        fail("TARGET_PROTECTED");
      if (d?.battle_id || target.payload.battleId) fail("TARGET_BUSY");
      const key = d ? [account, d.account_id].sort().join(":") : null,
        previous = key ? w.meta.pairs[key] : null;
      if (previous && now < ms(previous.until)) {
        if (previous.attacker === account || previous.revengeUsed)
          fail("PAIR_COOLDOWN");
        previous.revengeUsed = true;
        previous.until = iso(now + c("PairCooldownHours") * 3600000);
      } else if (key)
        w.meta.pairs[key] = {
          attacker: account,
          until: iso(now + c("PairCooldownHours") * 3600000),
          revengeUsed: false,
        };
      spend(p, c("BattleCost"));
      p.protected_until = null;
      p.hidden_until = null;
      const A = core.snapshot(p);
      p.defense_snapshot = clone(A);
      const monster = d
        ? null
        : data.MistEnemies.find((x) => x.EnemyID === target.payload.template);
      if (!d && !monster) fail("MONSTER_MISSING");
      const D = d
        ? d.defense_snapshot
        : {
            name: monster.Name,
            stats: {
              hp: monster.HP,
              def: monster.DEF,
              patk: monster.PATK,
              matk: monster.MATK,
              crit: 0,
              critDamage: 100,
            },
            skills: [],
            equipmentList: [],
          };
      const id = uuid(),
        combat = core.create(
          A,
          D,
          p.hp,
          d ? (d.hp / d.max_hp) * D.stats.hp : target.payload.hp,
          c("BattleMaxRounds"),
        );
      const b = {
        id,
        attacker: account,
        defender: d?.account_id || null,
        target: target.id,
        monster,
        combat,
        deadline: iso(now + c("BattleTimeoutMinutes") * 60000),
        startedAt: iso(now),
        finished: false,
      };
      w.meta.battles[id] = b;
      p.battle_id = id;
      if (d) {
        d.battle_id = id;
        d.hidden_until = null;
      } else target.payload.battleId = id;
    } else if (action === "battle/turn" || action === "battle/leave") {
      const b = w.meta.battles[payload.battleId || p.battle_id];
      if (!b || b.attacker !== account) fail("BATTLE_MISSING");
      if (!b.finished) {
        if (action === "battle/leave") fail("BATTLE_ACTIVE");
        b.combat = await core.turn(
          b.combat,
          payload.skill || "skip",
          b.monster,
        );
        b.deadline = iso(
          Math.min(
            ms(b.startedAt) + c("BattleTimeoutMinutes") * 60000,
            ms(w.season.settles_at),
          ),
        );
        if (b.combat.finished) finishBattle(b);
      }
      if (action === "battle/leave") p.runtime.lastBattle = null;
    } else fail("UNKNOWN_ACTION");
  }
  // Cosmetic-only projection. No item IDs, stats or account IDs are shared with observers.
  if (p && payload.appearance && typeof payload.appearance === "object") {
    const a = payload.appearance;
    p.runtime.appearance = {
      sex: a.sex === "female" ? "female" : "male",
      suit: Number.isInteger(a.suit) && a.suit >= 0 && a.suit <= 7 ? a.suit : 0,
      head: Number.isInteger(a.head) && a.head >= 0 && a.head <= 7 ? a.head : 0,
      kind: typeof a.kind === "string" && /^[A-Za-z][A-Za-z0-9]{0,40}$/.test(a.kind)
        ? a.kind : "unarmed",
      glow: a.glow === true,
    };
  }
  // Revision only changes when the player's persisted mode record changes.
  for (const [id, x] of Object.entries(w.players)) {
    const old = before.players?.[id];
    if (!equal(x, old))
      x.revision = (old?.season_id === x.season_id ? old.revision : 0) + 1;
  }
  const result = projectMist468(
    w,
    account,
    now,
    seasonOpen,
    input.save,
    input.rewards || [],
  );
  result.stats = p ? core.snapshot(p).stats : null;
  const changed = (next, old, key) =>
    next.filter((x) => !old.some((y) => key(x) === key(y) && equal(x, y)));
  const reset = before.season?.id !== w.season.id;
  const patch = {
    meta: w.meta,
    seasons: [
      ...additions.seasons,
      ...(!equal(w.season, before.season) ? [w.season] : []),
    ],
    players: [
      ...(additions.players || []),
      ...Object.values(w.players).filter(
        (x) => !equal(x, before.players?.[x.account_id]),
      ),
    ],
    cells: changed(w.cells, reset ? [] : before.cells, (x) => x.id),
    deleteCells: reset
      ? []
      : before.cells
          .filter((x) => !w.cells.some((y) => y.id === x.id))
          .map((x) => x.id),
    flags: changed(w.flags, reset ? [] : before.flags, (x) => x.x + "," + x.y),
    deleteFlags: reset
      ? []
      : before.flags.filter(
          (x) => !w.flags.some((y) => y.x === x.x && y.y === x.y),
        ),
    reports: additions.reports,
    rewards: additions.rewards,
  };
  // Complete a previous season's pending player updates before resetting to the next.
  return { result, patch, world: w };
}
export function projectMist468(w, account, now, ready, save, rewards) {
  const p = w.players[account],
    at = p
      ? w.cells.find((x) => x.kind === "player" && x.owner_account === account)
      : null;
  const centers = p
    ? [
        ...(at ? [at] : []),
        ...w.flags.filter((f) => f.owner_account === account),
      ]
    : [];
  const visible = (x, y) =>
      centers.some((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1),
    cells = [];
  if (p)
    for (let y = 0; y < w.season.size; y++)
      for (let x = 0; x < w.season.size; x++) {
        if (!visible(x, y)) continue;
        const cell = w.cells.find((c) => c.x === x && c.y === y),
          f = w.flags.find((f) => f.x === x && f.y === y);
        let o = null;
        if (cell?.kind === "player" && cell.owner_account !== account) {
          const d = w.players[cell.owner_account];
          if (ms(d.hidden_until) <= now)
            o = {
              kind: "player",
              id: cell.id,
              name: d.nickname,
              hp: d.hp,
              points: d.points,
              protected: ms(d.protected_until) > now,
              busy: !!d.battle_id,
              appearance: d.runtime.appearance || null,
            };
        } else if (cell && cell.kind !== "player")
          o = {
            kind: cell.kind === "spawn" ? "monster" : cell.kind,
            id: cell.id,
            name: cell.payload.name,
            art: cell.payload.art,
            elite: cell.payload.elite,
            busy: !!cell.payload.battleId,
            countdown:
              cell.kind === "spawn"
                ? Math.max(
                    1,
                    Math.ceil((ms(cell.payload.spawnAt) - now) / 60000),
                  ) + " 分鐘"
                : null,
          };
        if (!o && f)
          o = {
            kind: "flag",
            own: f.owner_account === account,
            name: f.owner_account === account ? "我的旗幟" : "敵方旗幟",
          };
        cells.push({
          x, y, object: o,
          flag: f ? { own: f.owner_account === account } : null,
        });
      }
  const ranked = Object.values(w.players).sort(
    (a, b) => b.points - a.points || b.kills - a.kills,
  );
  let rank = 0,
    last = "";
  const ranking = ranked
    .map((p, i) => {
      const key = p.points + ":" + p.kills;
      if (key !== last) {
        rank = i + 1;
        last = key;
      }
      return { rank, nickname: p.nickname, points: p.points, kills: p.kills };
    })
    .filter((x) => x.rank <= 10);
  const b = p ? w.meta.battles[p.battle_id || p.runtime.lastBattle] : null;
  const battle =
    b && b.attacker === account
      ? {
          id: b.id,
          finished: b.finished,
          result: b.result,
          deadline: b.deadline,
          turn: b.combat.turn,
          maxTurns: b.combat.maxTurns,
          attacker: {
            name: b.combat.attacker.name,
            stats: b.combat.attacker.stats,
            buff: b.combat.attacker.buff || {},
            passive: b.combat.attacker.passive,
            arcaneStacks: b.combat.attacker.arcaneStacks || 0,
            hp: b.combat.attacker.hp,
            maxHp: b.combat.attacker.maxHp,
            skills: b.combat.attacker.skills,
            cooldowns: b.combat.attacker.cooldowns,
            status: b.combat.attacker.status,
            shields: b.combat.attacker.shields || [],
          },
          defender: {
            name: b.combat.defender.name,
            appearance: b.defender ? w.players[b.defender]?.runtime?.appearance || null : null,
            hp: b.combat.defender.hp,
            maxHp: b.combat.defender.maxHp,
            status: b.combat.defender.status,
            art: b.monster?.Art || null,
            description: b.monster?.Description || "",
            shields: b.combat.defender.shields || [],
          },
          log: b.combat.log,
        }
      : null;
  return {
    ok: true,
    ready,
    size: w.season.size,
    season: {
      id: w.season.id,
      label: w.season.id,
      startsAt: w.season.starts_at,
      closesAt: w.season.closes_at,
      status: w.season.status,
    },
    self: p
      ? {
          x: at?.x,
          y: at?.y,
          hp: p.hp,
          maxHp: p.max_hp,
          energy: p.energy,
          points: p.points,
          kills: p.kills,
          revision: p.revision,
          protectedUntil: p.protected_until,
          hiddenUntil: p.hidden_until,
          suppliedToday: p.supplied_on === day(now),
          flags: w.flags.filter((f) => f.owner_account === account).length,
          battleId: p.battle_id,
          dead: !!p.runtime.dead,
          appearance: p.runtime.appearance || null,
        }
      : null,
    cells,
    ranking,
    reports: (p?.runtime.reports || []).map((r) => ({
      id: r.id,
      time: r.created_at,
      result: r.result,
      title: r.summary.title,
      description: r.summary.description,
      points: r.summary.points,
      unread: !r.read_at,
    })),
    equipment: p?.equipment || {},
    inventory: p?.inventory || {},
    pendingLoot: p?.pending_loot || [],
    skills: p?.skills || {},
    ownedSkills: save?.skillsOwned || [],
    starter:
      p?.runtime.starter && !p.runtime.starter.opened
        ? {
            id: p.runtime.starter.id,
            name: "重生補給箱",
            position: p.runtime.starter.position,
          }
        : null,
    battle,
    rewards: rewards
      .filter((r) => !r.claimed_at)
      .map((r) => ({ seasonId: r.season_id, rank: r.rank, ...r.reward })),
  };
}
