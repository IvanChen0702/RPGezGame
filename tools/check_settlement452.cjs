const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const code=source.slice(source.indexOf('async function finishRequest452_('),source.indexOf('async function finishBattle78_('));
async function check(errors,{switched=false}={}){
 const calls=[],waits=[];let elapsed=false;
 const context={assertCharacterSession_:()=>{if(switched&&elapsed)throw Error('SESSION_CHANGED');},
  apiPost:async(action,payload)=>{calls.push(JSON.parse(JSON.stringify({action,payload})));if(errors.length)throw errors.shift();return {ok:true};},
  setTimeout:(fn,ms)=>{waits.push(ms);elapsed=true;fn();}};
 vm.createContext(context);vm.runInContext(code+'\nthis.finish=finishRequest452_;',context);
 const ticket={battleId:'same-battle',finish:{requestId:'same-request',summary:{result:'won',turns:5}}};
 let result,error;try{result=await context.finish(ticket,{});}catch(e){error=e;}
 return {calls,waits,result,error};
}
const busy=()=>Object.assign(Error('SERVER_BUSY'),{code:'SERVER_BUSY',httpStatus:429});
(async()=>{
 const recovered=await check([busy(),busy()]);assert.equal(recovered.result.ok,true);assert.equal(recovered.calls.length,3);
 assert.deepEqual(recovered.calls[0],recovered.calls[1]);assert.deepEqual(recovered.calls[1],recovered.calls[2]);assert.deepEqual(recovered.waits,[2000,2000]);
 const exhausted=await check([busy(),busy(),busy()]);assert.equal(exhausted.error.code,'SERVER_BUSY');assert.equal(exhausted.calls.length,3);
 for(const e of [Object.assign(Error(),{code:'SUPABASE_TIMEOUT'}),Object.assign(Error(),{code:'LOCK_LOST',httpStatus:503}),Object.assign(Error(),{code:'SERVER_BUSY',httpStatus:503})]){const r=await check([e]);assert.equal(r.error,e);assert.equal(r.calls.length,1);assert.equal(r.waits.length,0);}
 const changed=await check([busy()],{switched:true});assert.equal(changed.error.message,'SESSION_CHANGED');assert.equal(changed.calls.length,1);
 console.log('PASS settlement retry: stable payload/ID, two retries, no ambiguous-error replay, account switch stops retry');
})().catch(e=>{console.error(e);process.exitCode=1;});
