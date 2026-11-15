import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';
const sql=readFileSync(new URL('../migrations/20261115141736_retire_boxing465.sql',import.meta.url),'utf8');
const db=new PGlite();
await db.exec("create role anon;create role authenticated;create role service_role;create table \"Accounts\"(account_id text primary key);create table \"BoxingAttempts\"(id text primary key,season_id text,status text,damage int);create table \"BoxingRanking\"(id text primary key,season_id text,damage int);create table \"BoxingRewards\"(id text primary key,status text);insert into \"BoxingRewards\" values('pending','PENDING');create table game_quests368(account_id text primary key,states jsonb,version bigint);create table game_quest_metrics368(account_id text primary key,metrics jsonb);create table \"GameDataCurrent\"(channel text primary key,version text,published_at timestamptz,data_json jsonb);create table \"GameDataVersions\"(version text primary key,published_at timestamptz,published_by text,data_json jsonb);");
const data={Equipment:[{ItemID:'kept','等級':80}],GameConfig:[{Key:'BaseHP',Value:100}],QuestObjectives:[{QuestID:'kazama_secret_4',ObjectiveID:'kazama_secret_4_1',Type:'battle',TargetID:'boxing',Quantity:3},{ObjectiveID:'untouched',TargetID:'boxing'}],QuestDialogues:[0,1,2,3].map(n=>({DialogueID:'kazama_secret_4_offer_'+n,Text:'original'})),Quests:[{QuestID:'kazama_secret_4',Name:'特殊體能訓練！（4/5）'}]};
await db.query('insert into "GameDataCurrent" values($1,$2,now(),$3)',['production','20261115-043253-level464',JSON.stringify({data,dataVersion:'20261115-043253-level464'})]);
for(const [id,progress,arena,accepted,completed] of [['zero',0,7,true,false],['two',2,0,true,false],['ready',9,5,true,false],['not-accepted',2,3,false,false],['done',3,4,true,true]]){
 await db.query('insert into "Accounts" values($1)',[id]);
 await db.query('insert into game_quests368 values($1,$2,4)',[id,JSON.stringify({other:{unchanged:true},kazama_secret_4:{accepted,completed,baseline:{kazama_secret_4_1:10}}})]);
 await db.query('insert into game_quest_metrics368 values($1,$2)',[id,JSON.stringify({'battle:boxing:*':10+progress,'battle:arena:*':arena})]);
}
await db.exec(sql);
await assert.rejects(()=>db.query('update "GameDataCurrent" set data_json=$1',[JSON.stringify({data})]),/BOXING_QUEST_PLANNING_RETIRED_465/);
const rows=(await db.query("select q.account_id,states,version,metrics from game_quests368 q join game_quest_metrics368 using(account_id) order by q.account_id")).rows;
for(const r of rows){
 const e=r.states.kazama_secret_4,expected={zero:0,two:2,ready:3}[r.account_id];
 assert.deepEqual(r.states.other,{unchanged:true});
 if(expected!==undefined){assert.equal(Math.min(3,r.metrics['battle:arena:*']-e.baseline.kazama_secret_4_1),expected);assert.equal(r.version,5);}
 else{assert.equal(e.baseline.kazama_secret_4_1,10);assert.equal(r.version,4);}
}
const current=(await db.query('select data_json from "GameDataCurrent"')).rows[0].data_json.data;
assert.equal(current.QuestObjectives[0].TargetID,'arena');assert.equal(current.QuestObjectives[1].TargetID,'boxing');
assert.deepEqual(current.Equipment,data.Equipment);assert.deepEqual(current.Quests,data.Quests);
assert.equal((await db.query('select count(*) n from "GameDataVersions"')).rows[0].n,2);
assert.equal((await db.query('select count(*) n from game_quest_transition465')).rows[0].n,3);
await assert.rejects(()=>db.exec("insert into \"BoxingAttempts\" values('future','2026-W47','STARTED',0)"),/BOXING_RETIRED/);
const definition=sql.slice(sql.indexOf('create function public.game_boxing_final_guard465()'),sql.indexOf('revoke all on function public.game_boxing_final_guard465()'));
await db.exec(definition.replace('create function','create or replace function').replaceAll('2026-11-15T15:00:00Z','2099-11-15T15:00:00Z'));
await db.exec("insert into \"BoxingAttempts\" values('current','2026-W46','STARTED',0);insert into \"BoxingRanking\" values('current','2026-W46',50);");
await db.exec(definition.replace('create function','create or replace function').replaceAll('2026-11-15T15:00:00Z','2000-11-15T15:00:00Z'));
await assert.rejects(()=>db.exec("insert into \"BoxingAttempts\" values('late','2026-W46','STARTED',0)"),/BOXING_RETIRED/);
await assert.rejects(()=>db.exec("update \"BoxingRanking\" set damage=100 where id='current'"),/BOXING_RETIRED/);
await db.exec("update \"BoxingRewards\" set status='CLAIMED' where id='pending';");
assert.equal((await db.query('select status from "BoxingRewards"')).rows[0].status,'CLAIMED');
await db.close();
function functionText(source,name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);let depth=0,first=false;for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{'){depth++;first=true;}else if(source[i]==='}'&&--depth===0&&first)return source.slice(start,i+1);}throw Error(name);}
const front=readFileSync(new URL('../../index.html',import.meta.url),'utf8'),back=readFileSync(new URL('../functions/game-api/index.ts',import.meta.url),'utf8');
const source=[{SeasonID:'2026-W42',Enabled:true}];
for(const stamp of ['2026-11-15T14:59:59Z','2026-11-15T15:00:00Z','2026-11-15T16:00:00Z','2026-12-01T00:00:00Z','2027-12-01T00:00:00Z']){
 const results=[front,back].map(text=>{const c={Date,boxingTaipeiTime_:Date.parse};vm.createContext(c);for(const n of ['boxingCalendar137_','boxingSelect137_','boxingStatus137_'])vm.runInContext(functionText(text,n),c);const rows=c.boxingCalendar137_(source,Date.parse(stamp)),selected=c.boxingSelect137_(rows,null,Date.parse(stamp));assert.equal(rows.at(-1).seasonId,'2026-W46');assert.equal(selected.seasonId,'2026-W46');return c.boxingStatus137_(selected,Date.parse(stamp));});
 assert.equal(results[0],results[1]);assert.equal(results[0],stamp==='2026-11-15T14:59:59Z'?'ACTIVE':stamp==='2026-11-15T15:00:00Z'?'BREAK':'ENDED');
}
console.log('retirement465: quest 0/2/3 progress, completed/untaken isolation, boxing cutoff, legacy guard and reward claims passed');

