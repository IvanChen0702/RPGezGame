from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np, json, base64, hashlib
import argparse, io
parser=argparse.ArgumentParser(description='Prepare the approved four-expression NPC sheets without changing existing embedded WebP images.')
parser.add_argument('source_dir',type=Path,help='Directory containing lily.png, xi.png, kazama.png and yexian.png')
parser.add_argument('output_dir',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=args.output_dir;out.mkdir(parents=True,exist_ok=True)
html=(root/'index.html').read_text();start=html.index('const assetRegistry393_=')+len('const assetRegistry393_=');registry,_=json.JSONDecoder().raw_decode(html[start:])
sources={'lily':'378a769c-d569-43a6-914d-31898e363a8f','xi':'37f22892-a483-43f1-910d-45858d9759ab','kazama':'e8b3a40c-4e6b-448a-aeea-9ceffe04877d','yexian':'92ca2d1e-c441-4f94-aed2-011379383189'}
anchors={'lily':(646,675,257.8),'xi':(698,716,245.3),'kazama':(636,676,249.5),'yexian':(650,683,243.3)}
meta={}
for npc,uid in sources.items():
 p=args.source_dir/(npc+'.png'); im=Image.open(p).convert('RGBA'); a=np.array(im.getchannel('A'))
 labels,n=ndimage.label(a>200); counts=np.bincount(labels.ravel()); counts[0]=0
 ids=np.argsort(counts)[-4:]; objects=ndimage.find_objects(labels)
 ids=sorted(ids,key=lambda i:(objects[i-1][0].start//(im.height//3),objects[i-1][1].start))
 atlas=Image.new('RGBA',(1920,724)); details=[]
 for slot,i in enumerate(ids):
  ys,xs=objects[i-1]; core=(labels==i)
  # Retain antialiased edges and the crystal glow, remove disconnected labels/background haze.
  near=ndimage.distance_transform_edt(~core)
  alpha=a.copy(); alpha[near>8]=0
  if npc=='yexian':
   alpha=np.clip((a.astype(float)-35)*255/219,0,255).astype('uint8')
  figure=im.copy();figure.putalpha(Image.fromarray(alpha))
  box=(max(0,xs.start-6),max(0,ys.start-6),min(im.width,xs.stop+6),min(im.height,ys.stop+6))
  cut=figure.crop(box); target_h,feet,cx=anchors[npc]; scale=target_h/(ys.stop-ys.start)
  nw,nh=round(cut.width*scale),round(cut.height*scale)
  scaled=cut.resize((nw,nh),Image.Resampling.LANCZOS)
  x=round(cx-((xs.start+xs.stop)/2-box[0])*scale)
  y=round(feet-(ys.stop-box[1])*scale)
  assert x>=0 and x+nw<=480 and y>=0 and y+nh<=724,(npc,x,y,nw,nh)
  frame=Image.new('RGBA',(480,724));frame.alpha_composite(scaled,(x,y));frame.save(out/f'{npc}-{slot}.png')
  atlas.alpha_composite(frame,(slot*480,0));details.append({'source_box':box,'scale':scale,'placement':[x,y],'body_height':target_h,'bottom':feet})
 atlas.save(out/f'{npc}-expressions447.webp',format='WEBP',quality=85,method=6)
 meta[npc]={'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'atlas':[1920,724],'frame':[480,724],'expressions':['deadpan','surprised','worried','serious'],'frames':details}
 # Review old neutral expression next to all four new expressions.
 uri=registry['data'][registry['paths'][f'assets/images/npcs/{npc}368.png']];old=Image.open(io.BytesIO(base64.b64decode(uri.split(',',1)[1]))); width=451 if npc=='kazama' else 434
 neutral=old.crop((0,0,width,724)); contact=Image.new('RGBA',(2400,724),(35,38,43,255));contact.alpha_composite(neutral,((480-width)//2,0));contact.alpha_composite(atlas,(480,0));contact.save(out/f'{npc}-comparison.png')
(out/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print({n:(out/f'{n}-expressions447.webp').stat().st_size for n in sources})
