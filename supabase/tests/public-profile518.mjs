import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const dir=new URL('../functions/game-api/',import.meta.url);
const lease=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('lease446.ts',dir),'utf8')).toString('base64'));
let src=fs.readFileSync(new URL('index.ts',dir),'utf8');src=src.slice(0,src.indexOf('// Log interrupted phases')).replace(/^import .*;\n/gm,'').replaceAll('export function ','function ');
const ctx={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Uint32Array,URL,Response,Request,AbortSignal,setTimeout,clearTimeout,console:{info(){},error(){}},...lease};vm.createContext(ctx);vm.runInContext(src+'\nthis.profile=publicProfile518;this.api=makeGameApi;this.stats=secureStats78;',ctx);
const planning=JSON.parse(fs.readFileSync(new URL('./fixtures/mist468-planning.json',import.meta.url)));
const save={nickname:'測試玩家',level:10,base:{},talentSpent:{},inventory:[{id:'private-item-id',template:'starterBlade1',name:'啟程之刃',slot:'weapon',enhance:3,stats:{patk:10},gems:[],private:'secret-inventory'}],equipment:{weapon:'private-item-id',rings:[]},equippedSkills:['slash'],passive:['adventurerAptitude'],skillsOwned:['slash'],mainProgressEpoch:411,maxCleared:55,gold:123456,credentials:'PRIVATE_SECRET',pets297:[{id:'private-pet',species:'spiritDeer',level:5,traits:[]}],equippedPet297:'private-pet'};
const id='11111111-2222-3333-4444-555555555555';
test('public profile uses authoritative stats, equipment and explicit public fields without mutating save',()=>{
 const before=JSON.stringify(save),p=ctx.profile(save,planning,{presence_id:id,nickname:'測試',sex:'female'},3);
 assert.equal(JSON.stringify(save),before);assert.equal(p.id,id);assert.equal(p.appearance.sex,'female');assert.equal(p.avatarId,3);assert.equal(p.appearance.equipment.length,1);assert.equal(p.skills.length,2);assert.equal(p.pet.level,5);assert.equal(p.maxCleared,55);
 const stats=ctx.stats(save,planning).stats;assert.equal(p.stats.hp,stats.hp);assert.equal(p.stats.patk,stats.patk);
 for(const forbidden of ['private-item-id','PRIVATE_SECRET','secret-inventory','private-pet','credentials','gold','auth_user_id','account_id'])assert(!JSON.stringify(p).includes(forbidden),forbidden);
});
function harness({offline=false,disabled=false,unauthorized=false}={}){
 const calls=[];const fetcher=async(url,o={})=>{const u=new URL(url);calls.push([u.pathname,o.method||'GET',u.search]);assert.equal(o.method||'GET','GET','read-only');
 if(u.pathname==='/auth/v1/user')return Response.json(unauthorized?{}:{id:'self-auth',email_confirmed_at:'2026-01-01'});
 if(u.pathname==='/rest/v1/game_identity_links')return Response.json([{legacy_account_id:u.search.includes('other-auth')?'other':'self'}]);
 if(u.pathname==='/rest/v1/Accounts')return Response.json([{disabled:disabled&&u.search.includes('other')}]);
 if(u.pathname==='/rest/v1/game_presence358'){assert(u.search.includes('last_seen=gte.'));return Response.json(offline?[]:[{presence_id:id,auth_user_id:'other-auth',avatar_id:2}]);}
 if(u.pathname==='/rest/v1/PlayerSaves')return Response.json([{save_json:save}]);
 if(u.pathname==='/rest/v1/GameDataCurrent')return Response.json([{data_json:{data:planning}}]);
 if(u.pathname==='/rest/v1/game_player_profiles325')return Response.json([{avatar_id:7}]);
 if(u.pathname==='/rest/v1/game_avatar_preferences294')return Response.json([{sex:'female'}]);
 throw Error('unexpected I/O '+url);
 };
 const env=k=>({GAME_ALLOWED_ORIGINS:'https://game.test',SUPABASE_URL:'https://db.test',SUPABASE_SERVICE_ROLE_KEY:'test-key'})[k];
 return {calls,run:async(presenceId=id)=>ctx.api(env,fetcher)(new Request('https://game.test',{method:'POST',headers:{Authorization:'Bearer test',Origin:'https://game.test'},body:JSON.stringify({action:'profile/public',presenceId})}))};
}
test('authenticated public UUID read has no writes or lock calls and no private IDs',async()=>{const h=harness(),r=await h.run(),p=await r.json();assert.equal(r.status,200);assert.equal(p.profile.avatarId,7);assert.equal(p.profile.appearance.sex,'female');assert(!JSON.stringify(p).includes('other-auth'));assert.equal(r.headers.get('Cache-Control'),'no-store');});
for(const [name,opts,status] of [['offline',{offline:true},404],['disabled',{disabled:true},404],['unauthenticated',{unauthorized:true},401]])test('rejects '+name,async()=>{const h=harness(opts),r=await h.run();assert.equal(r.status,status);assert(!h.calls.some(x=>x[0]==='/rest/v1/PlayerSaves'));});
test('rejects account IDs and filter injection',async()=>{const h=harness();assert.equal((await h.run('other&select=*')).status,400);assert(!h.calls.some(x=>x[0]==='/rest/v1/game_presence358'));});
