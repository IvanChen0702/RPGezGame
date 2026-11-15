export function createMistCombat468(data,random){
 const cfg=Object.fromEntries((data.GameConfig||[]).map(r=>[r.Key,r.Value]));
 const base={hp:Number(cfg.BaseHP),def:Number(cfg.BaseDEF),patk:Number(cfg.BasePATK),matk:Number(cfg.BaseMATK),crit:Number(cfg.BaseCrit),critDamage:Number(cfg.BaseCritDamage||100)};
 if(Object.values(base).some(n=>!Number.isFinite(n))||base.hp<=0)throw Error('MIST_BASE_CONFIG_INVALID');
 let pending468=[];
 function fxEvent_(...args){const p=fxEventCore468_(...args);pending468.push(p);return p;}
 async function drain468(){for(let i=0;pending468.length;i++){if(i>1000)throw Error('MIST_EFFECT_LOOP');const tasks=pending468;pending468=[];await Promise.all(tasks);}}

 function arenaTakeDamage_(target,amount,kind='damage',source=null){if(target?.mistFirstGuard468&&source&&kind==='damage'&&amount>0){amount=Math.floor(amount*target.mistFirstGuard468);delete target.mistFirstGuard468;}return arenaTakeDamageBase468_(target,amount,kind,source);}
