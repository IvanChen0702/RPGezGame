/* Production slicing/registration only: source artwork is generated and reviewed separately.
 * Node + sharp. Never re-encode existing WebP assets. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require(process.env.SHARP_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),src=path.join(__dirname,'source-assets/avatar454');
const out=process.env.AVATAR454_OUT||'/workspace/work/avatar454/prepared';fs.mkdirSync(out,{recursive:true});
const weapons=['spatulaGod','guardianMace','imperialSaw','sunkenAnchor','shuriken','houndFang','executionerAxe','turguraWeapon','fastsliver','samuraiBlade','bahamutBlade','chronosArcaneStaff','mirrorImageGreatsword','mirrorMyriadStaff','mirrorTwinSpellblade','astraGreatsword','astralLance','chaosSeverBlade','chaosSoulStaff','chaosTwinBlade','goldendragonWeapon1'];
const meta={bodies:{},heads:{},weapons:{}};
async function normalize(file,rect,scale,offset,size,name){
 const input=await sharp(file).extract(rect).resize({width:Math.round(rect.width*scale),height:Math.round(rect.height*scale),kernel:'lanczos3'}).png().toBuffer();
 const left=Math.round(offset[0]),top=Math.round(offset[1]);if(left<0||top<0)throw Error('negative placement '+name);
 const buf=await sharp({create:{width:size,height:size,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left,top}]).webp({quality:85,alphaQuality:100}).toBuffer();fs.writeFileSync(path.join(out,name+'.webp'),buf);return buf.length;
}
async function bounds(file,rect){const {data,info}=await sharp(file).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,t=info.height,r=0,b=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return {left:rect.left+l,top:rect.top+t,width:r-l+1,height:b-t+1};}
(async()=>{
 let bytes=0;
 const heads=path.join(src,'heads.png');
 for(let sex=0;sex<2;sex++)for(let c=0;c<4;c++){
  const edges=[0,485,887,1331,1774],rect=await bounds(heads,{left:edges[c],top:sex?444:0,width:edges[c+1]-edges[c],height:sex?443:444});
  const chin=[[309,344],[750,343],[1172,345],[1607,346]][c];const cx=chin[0],cy=chin[1]+(sex?419:0),scale=.37;
  const name=`head245_${sex?'female':'male'}_${c+4}`;const offset=[145+(rect.left-cx)*scale,110+(rect.top-cy)*scale];
  bytes+=await normalize(heads,rect,scale,offset,256,name);meta.heads[name]={rect,scale,offset};
 }
 // Measured source anchors: collar center, right hand, left casting grip and open palm.
 const male=[
  [[210,49],[312,183],[321,431],[181,794],[318,739]],
  [[580,49],[672,181],[690,431],[547,795],[680,740]],
  [[964,49],[1038,183],[1049,431],[920,795],[1051,740]],
  [[1325,49],[1415,183],[1417,431],[1283,795],[1416,740]]
 ];
 const female=[
  [[208,59],[294,195],[308,441],[179,796],[305,738]],
  [[577,59],[650,195],[677,441],[541,796],[679,738]],
  [[960,59],[1020,195],[1038,441],[913,796],[1046,738]],
  [[1324,59],[1395,195],[1410,441],[1275,796],[1413,738]]
 ];
 for(const sex of ['male','female']){const file=path.join(src,sex+'-bodies.png'),points=sex==='male'?male:female;
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   const pose=['idle','attack','cast'][row],rect=await bounds(file,{left:col*384,top:Math.round(row*1024/3),width:384,height:Math.round((row+1)*1024/3)-Math.round(row*1024/3)});
   const scale=146/rect.height,collarX=points[col][0][0],offset=[145+(rect.left-collarX)*scale,99];
   const name=`body245_${sex}_${col+4}_${pose}`;
   bytes+=await normalize(file,rect,scale,offset,256,name);
   const convert=([x,y])=>[Math.round(145+(x-collarX)*scale),Math.round(99+(y-rect.top)*scale)];
   meta.bodies[name]={rect,scale,offset,hand:convert(points[col][row+1]),palm:convert(points[col][4])};
  }
 }
 const weaponFile=path.join(src,'weapons.png'),wm=await sharp(weaponFile).metadata();
 const grips=[[.24,.80],[.36,.75],[.19,.34],[.65,.23],[.50,.51],[.63,.36],[.25,.80],[.48,.49],[.27,.78],[.27,.79],[.27,.77],[.26,.78],[.76,.24],[.29,.78],[.50,.22],[.72,.24],[.24,.78],[.75,.23],[.27,.79],[.73,.24],[.27,.78]];
 for(let i=0;i<21;i++){
  const col=i%7,row=Math.floor(i/7),left=Math.round(col*wm.width/7),top=Math.round(row*wm.height/3),width=Math.round((col+1)*wm.width/7)-left,height=Math.round((row+1)*wm.height/3)-top;
  const rect={left,top,width,height},scale=176/Math.max(width,height),offset=[8,8],name='weapon245_'+weapons[i];
  bytes+=await normalize(weaponFile,rect,scale,offset,192,name);meta.weapons[weapons[i]]={grip:grips[i].map(x=>Math.round(8+x*176)),rect};
 }
 fs.writeFileSync(path.join(out,'registration.json'),JSON.stringify(meta,null,2));console.log(JSON.stringify({out,bytes,files:fs.readdirSync(out).length}));
})();
