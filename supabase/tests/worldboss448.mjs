import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;
 create table "Accounts"(account_id text primary key,nickname text,disabled boolean default false);
 create table "WorldBossState"(boss_instance_id text primary key,boss_id text,name text,max_hp bigint,current_hp bigint,def bigint,patk bigint,matk bigint,spawned_at timestamptz,dead_at timestamptz,respawn_at timestamptz,status text,revision bigint default 1);
 create table "WorldBossAttempts"(challenge_id text primary key,boss_instance_id text,account_id text,nickname text,date_key text,attempt_no integer,started_at timestamptz,submitted_at timestamptz,damage bigint,status text);
 grant usage on schema public to service_role,anon,authenticated;
 grant select,insert,update on all tables in schema public to service_role;
 insert into "Accounts" values ('alice','Synthetic A',false),('bob','Synthetic B',false),('disabled','Synthetic D',true);`);
await db.exec(readFileSync(new URL('../migrations/20261114042601_worldboss_settlement448.sql',import.meta.url),'utf8'));
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const submit=async(account,boss,n,damage=40,limit=3)=>(await db.query('select public.game_worldboss_submit448($1,$2,$3,$4,$5,10) as r',[account,boss,uuid(n),damage,limit])).rows[0].r;
async function reset(){await db.exec(`delete from "WorldBossAttempts";delete from "WorldBossState";insert into "WorldBossState"(boss_instance_id,boss_id,current_hp,max_hp,spawned_at,status)values('boss','fixture',100,100,now()-interval '1 hour','ALIVE');`);}
await reset();await db.exec('set role service_role');
let r=await submit('alice','boss',1);assert.equal(r.acceptedDamage,40);assert.equal(r.attemptsLeft,2);
r=await submit('alice','boss',1);assert.equal(r.alreadySettled,true);assert.equal(r.bossHp,60);assert.equal(r.attemptsLeft,2);
await assert.rejects(submit('alice','different-boss',1),/WORLD_BOSS_REQUEST_REUSED/);
r=await submit('bob','boss',2,100);assert.equal(r.acceptedDamage,60);assert.equal(r.bossStatus,'DEAD');
r=await submit('alice','boss',3,50);assert.equal(r.settlementStatus,'boss_defeated');assert.equal(r.attemptConsumed,false);assert.equal(r.attemptsLeft,2);
r=await submit('bob','boss',2,100);assert.equal(r.alreadySettled,true);assert.equal(r.acceptedDamage,60);assert.equal(r.attemptsLeft,2);
console.log('PASS competing kill, no lost attempt, killing-blow retry, account/request deduplication');
await db.exec('reset role');await reset();
await db.exec(`insert into "WorldBossState"(boss_instance_id,current_hp,max_hp,spawned_at,status)values('new',100,100,now(),'ALIVE');set role service_role;`);
r=await submit('alice','boss',4);assert.equal(r.settlementStatus,'boss_changed');assert.equal(r.attemptsLeft,3);
r=await submit('alice','missing',5);assert.equal(r.settlementStatus,'boss_changed');assert.equal(r.attemptConsumed,false);
await db.exec('reset role');await reset();await db.exec('set role service_role');
await submit('alice','boss',1,10,1);r=await submit('alice','boss',2,10,1);assert.equal(r.settlementStatus,'no_attempts');assert.equal(r.bossHp,90);
r=await submit('alice','boss',1,10,1);assert.equal(r.alreadySettled,true);assert.equal(r.attemptsLeft,0);
await assert.rejects(submit('disabled','boss',3),/ACCOUNT_DISABLED/);
await assert.rejects(submit('alice','boss',4,-1),/WORLD_BOSS_INVALID_SETTLEMENT/);
console.log('PASS replaced/missing boss, daily limit, disabled identity, invalid damage');
await db.exec('reset role');await reset();
await db.exec(`insert into "WorldBossAttempts"(challenge_id,account_id,date_key,status,damage)values('legacy','alice',to_char(now() at time zone 'Asia/Taipei','YYYY/FMMM/FMDD'),'DONE',10);`);
r=await submit('alice','boss',9);assert.equal(r.attemptsLeft,1);
// Retrying yesterday's receipt neither charges today's quota nor changes HP.
await db.exec(`update "WorldBossAttempts" set date_key=to_char(now() at time zone 'Asia/Taipei'-interval '1 day','YYYY-MM-DD');`);
r=await submit('alice','boss',9);assert.equal(r.alreadySettled,true);assert.equal(r.attemptsLeft,3);assert.equal(r.bossHp,60);
// Simulate a failure after UPDATE but before INSERT: both changes must roll back.
await reset();await db.exec(`create function fail_attempt448() returns trigger language plpgsql as $$begin raise exception 'SIMULATED_INSERT_FAILURE';end$$;
create trigger fail_attempt before insert on "WorldBossAttempts" for each row execute function fail_attempt448();`);
await assert.rejects(submit('alice','boss',10),/SIMULATED_INSERT_FAILURE/);
assert.equal((await db.query('select current_hp from "WorldBossState"')).rows[0].current_hp,100);
assert.equal((await db.query('select count(*)::integer as n from "WorldBossAttempts"')).rows[0].n,0);
await db.exec('drop trigger fail_attempt on "WorldBossAttempts";');
console.log('PASS legacy date formats, midnight replay, atomic rollback');
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);await assert.rejects(submit('alice','boss',11),/permission denied/);await db.exec('reset role');
}
assert.equal((await db.query("select prosecdef from pg_proc where proname='game_worldboss_submit448'")).rows[0].prosecdef,false);
console.log('PASS service-only invoker permissions');
// Exercise the deployed engine adapter against the real transaction fixture.
await reset();
const source=readFileSync(new URL('../functions/game-api/index.ts',import.meta.url),'utf8');
const start=source.indexOf('async function submitWorldBossChallenge_(body) {');
const warnings=[];
const context={
 requireAuth_:token=>{if(token!=='synthetic')throw Error('UNAUTHORIZED');return {accountId:'alice'};},
 worldBossConfig_:async()=>({attempts:3,respawnMinutes:10}),Utilities:{getUuid:randomUUID},
 secureRpc78:async(name,p)=>{assert.equal(name,'game_worldboss_submit448');assert.equal(p.p_account,'alice');return (await db.query('select public.game_worldboss_submit448($1,$2,$3,$4,$5,$6) as r',Object.values(p))).rows[0].r;},
 invalidateWorldBossRankingCache_:()=>{},distributeWorldBossRewards_:async()=>{throw Error('SIMULATED_AWARD_FAILURE');},
 console:{warn:s=>warnings.push(s)}
};
vm.createContext(context);vm.runInContext(source.slice(start,source.indexOf('// ------------------------------',start)),context);
let ack=await context.submitWorldBossChallenge_({sessionToken:'synthetic',accountId:'bob',bossInstanceId:'boss',damage:100,requestId:uuid(50)});
assert.equal(ack.ok,true);assert.equal(ack.rewardsPending,true);assert.equal(ack.attemptsLeft,2);
ack=await context.submitWorldBossChallenge_({sessionToken:'synthetic',bossInstanceId:'boss',damage:100,requestId:uuid(50)});
assert.equal(ack.alreadySettled,true);assert.equal(ack.attemptsLeft,2);
ack=await context.submitWorldBossChallenge_({sessionToken:'synthetic',bossInstanceId:'boss',damage:50});
assert.equal(ack.settlementStatus,'boss_defeated');assert.equal(ack.attemptsLeft,2);
await assert.rejects(context.submitWorldBossChallenge_({sessionToken:'wrong'}),/UNAUTHORIZED/);
ack=await context.submitWorldBossChallenge_({sessionToken:'synthetic',bossInstanceId:'boss',damage:50,requestId:'bad-id'});
assert.equal(ack.error,'WORLD_BOSS_INVALID_SETTLEMENT');
assert.ok(warnings.every(s=>s==='WORLD_BOSS_REWARD_RECOVERY_PENDING448'));
console.log('PASS actual API adapter: verified actor, legacy clients, award failure, stable retry');
await db.close();
