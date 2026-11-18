const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8');
const block=html.match(/<script id="battle391">([\s\S]*?)<\/script>/)[1].split('toggleAutoBattle262_=function')[0];
const fn=name=>{const start=html.indexOf('function '+name+'(');const ast=require('../../supabase/tests/node_modules/acorn').parse(html.slice(start,html.indexOf('</script>',start)),{ecmaVersion:'latest',allowReturnOutsideFunction:true});return html.slice(start,start+ast.body[0].end)};
for(const kind of ['main','dungeon']){
 const c={cloudMeta:{accountId:'a',sessionToken:'old'},characterSessionGeneration_:1,autoBattle262_:true,state:{page:'battle',battleVisual:{},inventory:[],gems:[]},document:{hidden:false,getElementById:()=>null},clearTimeout(){},setTimeout(){return 1},toggleAutoBattle262_(){c.autoBattle262_=!c.autoBattle262_},scheduleAutoBattle262_(){},captureSeriesRewards430_(){},startSeriesLedger430_(){},rememberSeriesBattle430_(){},render(){},toast(){},queueSeriesSummary430_(){return true},save(){},log(){},totalStats(){return {hp:100}},dungeonUi:{},dungeonStep25_:0,playPendingLevelUps:async()=>{},settleWonBattle_(){c.state.currentBattle=null},seriesHistory394_:new WeakMap()};
 vm.createContext(c);vm.runInContext(block+'\n'+fn('seriesOwner430_')+'\n'+fn('seriesOrigin394_'),c);
 const run=vm.runInContext('beginBattleSeries391_("'+kind+'")',c);let starts=0;
 const start=async()=>{starts++;c.cloudMeta.sessionToken='rotated-'+starts;c.state.page='battle';c.state.currentBattle={floor:20,dungeonBattle:kind==='dungeon',dungeonBossId:'boss',dungeonDifficulty:1};};
 c.goToBattleConfirmed24_=start;c.startDungeonConfirmed24_=start;
 (async()=>{await start();assert.equal(c.attachBattleSeries391_(run),true);
 for(let i=0;i<10;i++){c.cloudMeta.sessionToken='settlement-'+i;const b=c.state.currentBattle;b.won=true;b.settled78=true;c.seriesHistory394_.set(b,run);assert.equal(c.seriesOrigin394_(b),run);assert.equal(c.seriesOwner430_(run),true);await c.tickBattleSeries391_(run);}
 assert.equal(starts,10);assert.equal(run.completed,10);assert.equal(vm.runInContext('battleSeries391_',c),null);
 const next=vm.runInContext('beginBattleSeries391_("main")',c);c.characterSessionGeneration_++;assert.equal(c.battleSeriesLive391_(next),false);assert.equal(c.seriesOwner430_(next),false);c.characterSessionGeneration_--;c.cloudMeta.accountId='b';assert.equal(c.battleSeriesLive391_(next),false);console.log(kind,'token rotation at settlement and next entry: 10/10; logout/account isolation passed');})().catch(e=>{console.error(e);process.exitCode=1});
}
