// Deterministic atlas extraction; originals stay outside the public package.
// Usage: node tools/prepare_mist465_art.cjs scenes.png objects.png monsters.png floor.png
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.SHARP_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),[scenes,objects,monsters,floor]=process.argv.slice(2),manifest=[];
async function save(src,rect,dest,trim=false){
 let p=sharp(src).extract(rect);if(trim)p=sharp(await p.png().toBuffer()).trim({background:'#00000000',threshold:8});
 const file=path.join(root,dest);fs.mkdirSync(path.dirname(file),{recursive:true});await p.webp({quality:85}).toFile(file);
 const m=await sharp(file).metadata();manifest.push({path:dest,width:m.width,height:m.height,alpha:m.hasAlpha,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex'),crop:rect,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
}
(async()=>{
 const sm=await sharp(scenes).metadata(),half=Math.floor(sm.height/2);
 await save(scenes,{left:0,top:0,width:sm.width,height:half},'assets/images/backgrounds/mist/entrance465.webp');
 await save(scenes,{left:0,top:half,width:sm.width,height:sm.height-half},'assets/images/backgrounds/mist/battle465.webp');
 const om=await sharp(objects).metadata();if(!om.hasAlpha)throw Error('Object atlas must have alpha');
 for(const [i,n] of ['flag-blue','flag-red','forge','supply','chest'].entries()){
  // Actual alpha bounds; equal-width slicing clips the forge into the red flag.
  const [left,right]=[[137,336],[539,738],[854,1262],[1352,1671],[1784,2068]][i];
  await save(objects,{left,top:0,width:right-left,height:om.height},`assets/images/ui/mist/${n}465.webp`,true);
 }
 if(monsters){
  const mm=await sharp(monsters).metadata();if(!mm.hasAlpha)throw Error('Monster atlas must have alpha');
  for(let i=0;i<15;i++){
   const x=i%5,y=Math.floor(i/5),[top,bottom]=[[53,281],[360,569],[642,955]][y],bounds=[[[38,312],[334,600],[624,914],[938,1182],[1228,1515]],[[31,313],[338,594],[633,889],[940,1199],[1250,1515]],[[15,317],[326,612],[615,921],[930,1203],[1217,1517]]],[left,right]=bounds[y][x];
   await save(monsters,{left,top,width:right-left,height:bottom-top},`assets/images/characters/enemies/mist/${i<10?'normal-'+(i+1):'elite-'+(i-9)}465.webp`,true);
  }
 }
 if(floor){const fm=await sharp(floor).metadata();await save(floor,{left:0,top:0,width:fm.width,height:fm.height},'assets/images/backgrounds/mist/board465.webp');}
 fs.mkdirSync(path.join(root,'docs/assets'),{recursive:true});fs.writeFileSync(path.join(root,'docs/assets/mist465.json'),JSON.stringify({quality:85,files:manifest},null,2)+'\n');
 console.log(JSON.stringify(manifest.map(({path,width,height,alpha})=>({path,width,height,alpha}))));
})().catch(e=>{console.error(e);process.exitCode=1});
