const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');const{chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const root=require('path').resolve(__dirname,'..'),catalog=require(root+'/docs/assets/catalog456.json').files;
for(const r of catalog){const data=fs.readFileSync(root+'/'+r.path);assert.equal(data.length,r.bytes,r.path);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),r.sha256,r.path)}
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{const p=await b.newPage();await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:8443/',{waitUntil:'networkidle'});
const imagePaths=catalog.filter(x=>/\.(webp|png|svg|jpg)$/.test(x.path)).map(x=>x.path);const bad=await p.evaluate(async paths=>{const bad=[];for(let i=0;i<paths.length;i+=8)await Promise.all(paths.slice(i,i+8).map(async path=>{const im=new Image();im.src=path;try{await im.decode();if(!im.naturalWidth)bad.push(path)}catch{bad.push(path)}}));return bad},imagePaths);assert.deepEqual(bad,[]);
const aliases=await p.evaluate(()=>{
 const checks=[];for(const[k,v]of Object.entries(assetRegistry393_.paths)){
  checks.push([k,assetSrc393_(k),v],[k+'?v=456',assetSrc393_('./'+k+'?v=456'),v+'?v=456']);
  for(const[before,after]of Object.entries(assetRegistry393_.prefixes))if(k.startsWith(after)){
   const old=before+k.slice(after.length);checks.push([old,assetSrc393_('/'+old),v]);
  }
 }return checks;
});for(const[k,got,want]of aliases)assert.equal(got,want,k);
const giftPaths=await p.evaluate(()=>Object.keys(GIFT_THEMES431_).filter(giftIsEgg431_).map(giftEggSrc431_));for(const v of giftPaths)assert(fs.existsSync(root+'/'+v),v);
const runtime=await p.evaluate(()=>({art:PIXEL_ART202_,bg:PIXEL_BACKGROUNDS203_,pet:typeof PET_ART297_!=='undefined'?PET_ART297_:null}));for(const v of Object.values(runtime.art))if(typeof v==='string'&&v.startsWith('assets/'))assert(fs.existsSync(root+'/'+v),v);for(const v of Object.values(runtime.bg))assert(fs.existsSync(root+'/'+v),v);
console.log(JSON.stringify({catalogHashes:catalog.length,imageDecodes:imagePaths.length,aliases:aliases.length,runtimeArtKeys:Object.keys(runtime.art).length}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
