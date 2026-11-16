// Extract the existing combat functions at build time; no client-supplied code is evaluated.
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "../supabase/tests/node_modules/acorn/dist/acorn.mjs";
import { analyze } from "../supabase/tests/node_modules/eslint-scope/lib/index.js";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8"),
  defs = new Map();
for (const [, attrs, js] of html.matchAll(
  /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
)) {
  if (/type=["']application\//.test(attrs)) continue;
  const ast = parse(js, {
    ecmaVersion: 2022,
    sourceType: "script",
    ranges: true,
    allowReturnOutsideFunction: true,
  });
  for (const n of ast.body) {
    if (n.type === "FunctionDeclaration")
      defs.set(n.id.name, js.slice(n.start, n.end));
    else if (n.type === "VariableDeclaration")
      for (const d of n.declarations)
        if (d.id.type === "Identifier")
          defs.set(d.id.name, "let " + js.slice(d.start, d.end) + ";");
  }
}
const noops = [
  "arenaVisual_",
  "arenaEffectText_",
  "arenaFx_",
  "playSfx",
  "render",
  "wait",
  "refreshBattleFeed46_",
  "refreshArenaShields111_",
  "effectNotice44_",
  "floatText",
  "toast",
  "battleAuraFx_",
  "refreshCommandStates175_",
  "pixelBurstNotice251_",
  "showEnemyNotice458_",
  "diceFlight141_",
  "pixelCast192_",
  "effectGainReport44_",
  "effectEventReport44_",
  "cooldownNotice245_",
  "effectStatusReport44_",
  "effectDamageReport44_",
  "arenaCombatantEl_",
  "arenaFxEl_",
  "hitFx",
  "healFx",
  "updateBattleNumbers",
  "log",
  "battleEffectText55_",
  "enemySkillPopup133_",
  "refreshMainPassive221_",
  "reflectAttackFx56_",
  "queueDiceVisual141_",
  "bossAttackFx55_",
  "bossElementFx55_",
];
const overrides = new Map(noops.map((n) => [n, `function ${n}(){}`]));
for (const [n, src] of Object.entries({
  arenaLog_: "function arenaLog_(s){arenaBattle_.log.push(String(s));record471('log',{text:String(s)});}",
  arenaVisual_: "function arenaVisual_(actor,target,kind,text='',impactDelay=320){record471('visual',{actor:side471(actor),target:side471(target),kind,text,impactDelay,skillId:actor.fxActiveSkillId||null});}",
  pixelCast192_: "function pixelCast192_(side,sk){record471('cast',{actor:side==='player'?'attacker':'defender',skillId:sk.id||Object.keys(skillTemplates).find(id=>skillTemplates[id]===sk),name:sk.name});}",
  arenaEffectText_: "function arenaEffectText_(x,text,type='buff'){record471('float',{target:side471(x),text,kind:type});}",
  arenaFx_: "function arenaFx_(side,text,cls=''){record471('float',{target:side,text,kind:cls});}",
  arenaCombatantEl_: "function arenaCombatantEl_(x){return side471(x);}",
  arenaFxEl_: "function arenaFxEl_(x){return side471(x);}",
  healFx: "function healFx(target){record471('heal',{target});}",
  hitFx: "function hitFx(target){record471('hit',{target});}",
  battleAuraFx_: "function battleAuraFx_(target,kind){record471('aura',{target,kind});}",
  bossElementFx55_: "function bossElementFx55_(target,theme){record471('element',{target,theme});}",
  queueDiceVisual141_: "function queueDiceVisual141_(owner,result,actor){record471('dice',{actor:side471(actor),result:JSON.parse(JSON.stringify(result))});}",
  reflectAttackFx56_: "function reflectAttackFx56_(actor,target){record471('reflect',{actor,target});}",
  render: "function render(){record471('state');}",
  wait: "function wait(ms){record471('wait',{ms});}",
  playSfx: "function playSfx(name){record471('sound',{name});}",
  arenaBaseStats_: "function arenaBaseStats_(){return {...base};}",
  defaultState: "function defaultState(){return {base:{...base}};}",
  planningRowsWithFallback_:
    "function planningRowsWithFallback_(name,rows){return rows||[];}",
  state:
    "let state={page:'arenaBattle',currentBattle:null,base,inventory:[],passive:[],equippedSkills:[],equipment:{}};",
  itemTemplates: "let itemTemplates={};",
  skillTemplates: "let skillTemplates={};",
  gemTemplates: "let gemTemplates={};",
  onlineGameConfig: "let onlineGameConfig={};",
  bootstrapDataCache: "let bootstrapDataCache=data;",
  arenaBattle_: "let arenaBattle_=null;",
  document:
    "const document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};",
  window: "const window={};",
  viewMode_: "const viewMode_='server';",
  Math: "const Math=Object.create(globalThis.Math);Math.random=random;",
  setTimeout: "function setTimeout(){}",
  clearTimeout: "function clearTimeout(){}",
  requestAnimationFrame: "function requestAnimationFrame(){}",
  statusEffects:
    "let statusEffects=Object.fromEntries((data.StatusEffects||[]).map(r=>[r.StatusID,{id:r.StatusID,name:r.Name,category:r.Category,defaultDuration:r.DefaultDuration,stackable:r.Stackable,maxStacks:r.MaxStacks,value:r.Value}]));",
  ORDER_TABLES127_: "const ORDER_TABLES127_={Equipment:[],Gems:[],Skills:[]};",
}))
  overrides.set(n, src);
for (const n of [
  "applyDirectDamageToEnemyLegacy122_",
  "applyDirectDamageToEnemy_",
  "applyIncomingDamage",
  "fxMainKeys_",
  "battlePlayerStats",
  "battleEnemy",
  "applyBattleStatus_",
  "addBattleShield_",
  "ensureBattleStatuses_",
  "applyWeaponOnHitEffect_",
  "effectiveEnemyDef_",
  "applyAdventurerDamageBonus",
  "magicDamageAgainstEnemy",
  "resolvePlayerHealing_",
])
  overrides.set(n, `function ${n}(){throw Error('MIST_NON_ARENA_PATH:${n}');}`);
const globals = new Set([
  "Object",
  "Array",
  "String",
  "Number",
  "Boolean",
  "Set",
  "Map",
  "JSON",
  "RegExp",
  "Error",
  "Promise",
  "console",
  "Date",
  "Infinity",
  "NaN",
  "undefined",
  "parseInt",
  "parseFloat",
  "isFinite",
  "isNaN",
  "arguments",
  "globalThis",
  "data",
  "base",
  "random",
  "encodeURIComponent",
  "decodeURIComponent",
  "record471",
  "side471",
]);
const roots = [
  "arenaStatsFrom_",
  "arenaUse_",
  "arenaHit_",
  "arenaTick_",
  "arenaTurnStartStatus_",
  "arenaCanAct_",
  "arenaRefreshConditionalStats_",
  "arenaChooseAi_",
  "arenaHasDead59_",
  "fxEvent_",
  "arenaFinishArcaneRound_",
  "applyGameConfigRows_",
  "applyEquipmentRows_",
  "applySkillRows_",
  "applyGemRows_",
  "applyEnhancementRows_",
  "enhancedStats",
  "itemEffectKeys_",
  "gemResolved_",
];
const selected = new Map(),
  missing = new Set(),
  parents = new Map();
function add(name) {
  if (selected.has(name) || globals.has(name)) return;
  const src = overrides.get(name) || defs.get(name);
  if (!src) {
    missing.add(name);
    return;
  }
  selected.set(name, src);
  const ast = parse(src, { ecmaVersion: 2022, ranges: true });
  const refs = analyze(ast, {
    ecmaVersion: 2022,
    sourceType: "script",
    optimistic: true,
  }).globalScope.through;
  for (const r of refs) {
    if (!parents.has(r.identifier.name)) parents.set(r.identifier.name, name);
    add(r.identifier.name);
  }
}
roots.forEach(add);
console.log({
  functions: selected.size,
  bytes: [...selected.values()].join("\n").length,
  missing: [...missing],
});

for (const key of [...missing]) {
  let n = key,
    chain = [n];
  for (let i = 0; i < 20 && parents.has(n); i++) {
    n = parents.get(n);
    chain.push(n);
  }
  console.log(chain.join(" <- "));
}

if (missing.size)
  throw Error("Unresolved combat dependencies: " + [...missing]);
const code = [...selected.values()]
  .join("\n")
  .replace("async function fxEvent_(", "async function fxEventCore468_(")
  .replace(
    "function arenaTakeDamage_(target,amount,kind=",
    "function arenaTakeDamageBase468_(target,amount,kind=",
  );
const pre = readFileSync(
    new URL("./mist468/combat-prefix.js", import.meta.url),
    "utf8",
  ),
  post = readFileSync(
    new URL("./mist468/combat-suffix.js", import.meta.url),
    "utf8",
  );
writeFileSync(
  new URL("../supabase/functions/game-api/mist-combat468.js", import.meta.url),
  "// GENERATED from index.html by tools/build_mist_combat468.mjs; edit the source, not this file.\n" +
    pre +
    "\n" +
    code +
    "\n" +
    post,
);
