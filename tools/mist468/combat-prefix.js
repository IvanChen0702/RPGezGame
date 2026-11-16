export function createMistCombat468(data,random){
 const cfg=Object.fromEntries((data.GameConfig||[]).map(r=>[r.Key,r.Value]));
 const base={hp:Number(cfg.BaseHP),def:Number(cfg.BaseDEF),patk:Number(cfg.BasePATK),matk:Number(cfg.BaseMATK),crit:Number(cfg.BaseCrit),critDamage:Number(cfg.BaseCritDamage||100)};
 if(Object.values(base).some(n=>!Number.isFinite(n))||base.hp<=0)throw Error('MIST_BASE_CONFIG_INVALID');
 let pending468=[];
 // Presentation events are recorded from the same combat hooks as the browser.
 // Only public combat state is copied; opponent stats/equipment/AI never leave the server.
 function side471(x){return x===arenaBattle_?.attacker?'attacker':x===arenaBattle_?.defender?'defender':x;}
 function frame471(){const pick=(a,own)=>({hp:a.hp,maxHp:a.maxHp,status:a.status||{},shields:(a.shields||[]).map(s=>({id:s.id,name:s.name,hp:s.hp,turns:s.turns})),...(own?{stats:a.stats,buff:a.buff||{},cooldowns:a.cooldowns||{},arcaneStacks:a.arcaneStacks||0}:{})});return structuredClone({attacker:pick(arenaBattle_.attacker,true),defender:pick(arenaBattle_.defender,false)});}
 function record471(type,detail={}){if(!arenaBattle_?.events471)return;const events=arenaBattle_.events471;if(events.length>=512)return;events.push({type,...detail,frame:frame471()});}
 function fxEvent_(...args){const p=fxEventCore468_(...args);pending468.push(p);return p;}
 async function drain468(){for(let i=0;pending468.length;i++){if(i>1000)throw Error('MIST_EFFECT_LOOP');const tasks=pending468;pending468=[];await Promise.all(tasks);}}

 function arenaTakeDamage_(target,amount,kind='damage',source=null){if(target?.mistFirstGuard468&&source&&kind==='damage'&&amount>0){amount=Math.floor(amount*target.mistFirstGuard468);delete target.mistFirstGuard468;}return arenaTakeDamageBase468_(target,amount,kind,source);}
