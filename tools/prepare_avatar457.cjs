/* Slice reviewed artwork using collar + sole anchors, never the pose bounding box.
 * The old head stays at its original coordinates; hands belong to each new pose. */
const fs=require('fs'),path=require('path'),sharp=require(process.env.SHARP_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),src=path.join(__dirname,'source-assets/avatar457');
const anchors={
 male:{neck:[[[205,69],[586,69],[962,70],[1349,71]],[[193,402],[583,402],[962,403],[1346,401]],[[195,740],[584,741],[960,740],[1347,740]]],hands:[[[304,192],[684,189],[1061,190],[1450,191]],[[317,434],[699,433],[1085,431],[1469,432]],[[143,821],[519,822],[900,823],[1294,822]]],palms:[[304,736],[685,735],[1070,733],[1453,735]],targetNeck:[136,102],foot:245},
 female:{neck:[[[199,55],[575,54],[941,55],[1322,55]],[[199,388],[575,387],[939,388],[1317,387]],[[200,721],[576,722],[941,721],[1320,722]]],hands:[[[294,174],[668,175],[1035,175],[1415,176]],[[317,421],[698,420],[1055,421],[1438,421]],[[157,802],[527,805],[893,803],[1273,803]]],palms:[[304,724],[671,724],[1046,726],[1419,726]],targetNeck:[136,102],foot:242}
};
(async()=>{const meta={version:457,anchors,parts:{}};for(const sex of ['male','female']){
 const file=path.join(src,sex+'-bodies.png'),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const a=anchors[sex],pose=['idle','attack','cast'][row],key=`body245_${sex}_${col+4}_${pose}`;
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=Math.round(row*info.height/3);y<Math.round((row+1)*info.height/3);y++)for(let x=Math.round(col*info.width/4);x<Math.round((col+1)*info.width/4);x++)if(data[(y*info.width+x)*4+3]>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
  const neck=a.neck[row][col],scale=(a.foot-a.targetNeck[1])/(bottom+1-neck[1]),rect={left,top,width:right-left+1,height:bottom-top+1};
  const offset=[Math.round(a.targetNeck[0]+(left-neck[0])*scale),Math.round(a.targetNeck[1]+(top-neck[1])*scale)];
  const input=await sharp(file).extract(rect).resize({width:Math.round(rect.width*scale),height:Math.round(rect.height*scale),kernel:'nearest'}).png().toBuffer();
  const dest=`assets/images/characters/player/${sex}/bodies/${key}-457.webp`;
  await sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left:offset[0],top:offset[1]}]).webp({quality:85,alphaQuality:100}).toFile(path.join(root,dest));
  const convert=([x,y])=>[Math.round(a.targetNeck[0]+(x-neck[0])*scale),Math.round(a.targetNeck[1]+(y-neck[1])*scale)];
  meta.parts[key]={src:dest,rect,neck,scale,offset,hand:convert(a.hands[row][col]),...(row===2?{palm:convert(a.palms[col])}:{})};
 }
 }fs.writeFileSync(path.join(src,'registration.json'),JSON.stringify(meta,null,2)+'\n');console.log('Prepared',Object.keys(meta.parts).length,'registered parts');})();
