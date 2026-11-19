# Packar raka vapenbilder (utan händer) till bildremsor för 320x166-vyn, Doom/Quake-stil.
#   python3 pack.py qframes,xframes            packar alla vapen i meta.json-filerna och skriver om js/weapons.js
#   python3 pack.py xframes ../../ axe,flamer  packar bara de namngivna vapnen och behåller övriga poster i js/weapons.js
#   python3 pack.py pick ../../ axe,flamer     upplockningsbilder pick_<vapen>.png ur sidovyerna side_<vapen>.png
# Version 7: kastknivar (knives), stridshammare (hammer, extra läget charge) och musköt (musket, röken ritas in i rutorna).
#   Källor: KayKit Fantasy Weapons Bits dagger_A och hammer_A (Kay Lousberg, CC0), PSX Shotgun Pack OneBarrelShotgun
#   (samma paket som dubbelbössan) med längre pipa och mässingsband ur enkla former; röken ritas i smoke_frames().
import json, re, sys
import numpy as np
from PIL import Image
srcs=(sys.argv[1] if len(sys.argv)>1 else 'qframes,xframes').split(',')  # qframes: RetroWeaponPack, xframes: statiska modeller
OUT=sys.argv[2] if len(sys.argv)>2 else '../../'
ONLY=sys.argv[3].split(',') if len(sys.argv)>3 else None
VW,VH=320,166
TARGET={'pistol':(84,178,24),'shotgun':(112,196,40),'rifle':(112,184,42),'smg':(98,178,32),
        'dbshotgun':(110,194,40),'crossbow':(66,166,14),'flaregun':(80,180,22),'sniper':(118,186,46),
        'flamer':(104,226,34),'launcher':(100,188,30),'nailgun':(96,210,22),'musket':(128,196,40)}  # höjd i px, mittpunkt x, hur mycket som skärs av nedtill
HARD={'axe','flamer','launcher','nailgun','staff','bow','knives','hammer','musket'}   # version 5 och 6: hel eller ingen täckning per pixel
MUZZLE_IDLE={'bow'}
PICK={'nailgun':(48,'w'),'staff':(48,'w',-90),'bow':(46,'w',90,'string'),'axe':(44,'w',90),'flamer':(54,'w'),'launcher':(46,'w'),
      'knives':(24,'h',0,'fan'),'hammer':(44,'w',90),'musket':(60,'w')}  # upplockningsbildens storlek (höjd eller bredd i px)


SMOKE={'musket':[(0,5),(1,10),(2,14),(3,17),(4,18),(5,17)]}   # version 7: rökpuff vid mynningen per skjutruta (steg, radie i px)
OUTC=(37,19,26)


def puff(d,cx,cy,r,k,seed):
    """Grå krutrök i pixelstil: några runda klumpar med mörk kant, ljusare mitt; k = hur långt den hunnit (glesnar)."""
    import random
    rr=random.Random(seed); blobs=[]
    for i in range(3+k):
        a=rr.uniform(0,6.283); dd=rr.uniform(0,r*0.55)
        bx=cx+np.cos(a)*dd*(1+0.12*k)-k*2.2; by=cy+np.sin(a)*dd*0.75-k*2.0; br=max(2,r*rr.uniform(0.5,0.78)*(1-0.05*k))
        blobs.append((bx,by,br))
    sh=[(152,148,146),(186,182,178),(214,210,204)] if k<3 else [(118,116,118),(146,144,144),(170,168,166)]
    for bx,by,br in blobs: d.ellipse((bx-br-1,by-br-1,bx+br+1,by+br+1),fill=OUTC+(255,))
    for bx,by,br in blobs: d.ellipse((bx-br,by-br,bx+br,by+br),fill=sh[0]+(255,))
    for bx,by,br in blobs: d.ellipse((bx-br*0.75-0.5,by-br*0.8,bx+br*0.5,by+br*0.35),fill=sh[1]+(255,))
    for bx,by,br in blobs: d.ellipse((bx-br*0.5-0.8,by-br*0.65,bx,by-br*0.1),fill=sh[2]+(255,))
    if k==0:   # mynningsblixten i första rutan
        d.ellipse((cx-2,cy-2,cx+2,cy+2),fill=(255,226,140,255)); d.point((cx,cy),fill=(255,255,230,255))


def smoke_frames(atlas,n,x,y,fw,fh,mz,steps):
    """Musköten: ritar rökpuffen vid mynningen in i skjutrutorna; rutan växer så att röken får plats (x/y flyttas)."""
    from PIL import ImageDraw
    ext=[]
    for i in range(n):
        if steps[i] is None: continue
        k,r=steps[i]; mx,my=mz[i]; ext.append((mx-r-6-k,my-r-6-k*2,mx+r+4,my+r+3))
    X0=min([x]+[int(np.floor(e[0])) for e in ext]); Y0=min([y]+[int(np.floor(e[1])) for e in ext]); Y0=max(Y0,y-60)
    X1=max([x+fw]+[int(np.ceil(e[2])) for e in ext])
    nw,nh=X1-X0,y+fh-Y0
    out=Image.new('RGBA',(nw*n,nh))
    for i in range(n):
        fr=Image.new('RGBA',(nw,nh)); fr.paste(atlas.crop((i*fw,0,(i+1)*fw,fh)),(x-X0,y-Y0))
        if steps[i] is not None:
            sm=Image.new('RGBA',(nw,nh)); k,r=steps[i]; puff(ImageDraw.Draw(sm),mz[i][0]-X0,mz[i][1]-Y0,r,k,7+i)
            fr=Image.alpha_composite(fr,sm)
        out.paste(hard(fr),(i*nw,0))
    return out,X0,Y0,nw,nh


def fan_pick(im):
    """Upplockningsbilden för kastknivarna: tre knivar i en solfjäder kring handtagen (bladen uppåt)."""
    W,H=im.size; S=H*3; c=Image.new('RGBA',(S,S)); px,py=S//2,S//2+H//2
    for a in (28,-28,0):
        l=Image.new('RGBA',(S,S)); l.paste(im,(px-W//2,py-H)); c.alpha_composite(l.rotate(a,center=(px,py),resample=Image.BICUBIC))
    c=c.rotate(-35,center=(px,py),resample=Image.BICUBIC)
    return c.crop(c.getbbox())


def hard(im):
    a=np.array(im.convert('RGBA'))
    a[:,:,3]=np.where(a[:,:,3]>=128,255,0); a[a[:,:,3]==0]=0
    return Image.fromarray(a)


if srcs==['pick']:
    for w in ONLY:
        im=Image.open(f'side_{w}.png').convert('RGBA'); im=im.crop(im.getbbox())
        n,ax,*rt=PICK[w]
        if rt and rt[0]!='string': im=im.rotate(rt[0],expand=True)
        if 'fan' in rt: im=fan_pick(im)   # version 7: tre knivar i en solfjäder
        sc=n/(im.height if ax=='h' else im.width)
        im=hard(im.resize((max(1,round(im.width*sc)),max(1,round(im.height*sc))),Image.LANCZOS))
        if 'string' in rt:  # bågen: sträng mellan spetsarna (sidovyn saknar sträng)
            from PIL import ImageDraw
            a=np.array(im)[:,:,3]>0; xs=np.nonzero(a.any(0))[0]; x0,x1=xs[0],xs[-1]
            yl=np.nonzero(a[:,x0])[0].mean(); yr=np.nonzero(a[:,x1])[0].mean()
            ImageDraw.Draw(im).line([(x0,round(yl)),(x1,round(yr))],fill=(232,224,200,255))
        im=im.crop(im.getbbox()); im.save(OUT+f'assets/gfx/pick_{w}.png',optimize=True); print('pick',w,im.size)
    sys.exit()

d={}
for src in srcs: d.update(json.load(open(src+'/meta.json')))
out={}
if ONLY:
    js=open(OUT+'js/weapons.js').read()
    out=json.loads(re.search(r'window\.WEAPON_FRAMES = (\{.*\});',js,re.S).group(1))
for w,st in d.items():
    if ONLY and w not in ONLY: continue
    files=[]; states={}
    for s in ['idle','fire']+[k for k in ('draw','charge') if k in st]:   # version 6: bågens draw, version 7: hammarens charge
        states[s]=[]
        for fr in st[s]: states[s].append(len(files)); files.append(fr)
    ims=[Image.open(f['f']).convert('RGBA') for f in files]
    bb=None
    for im in ims:
        b=im.getbbox()
        if b: bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    if st.get('native'):  # närstrid: kameran komponerar redan bilden, skala 960x498 -> 320x166 och behåll läget
        sc=VW/ims[0].width; bb=(bb[0],bb[1],bb[2],min(bb[3],ims[0].height))
        fw=round((bb[2]-bb[0])*sc); fh=round((bb[3]-bb[1])*sc); x=round(bb[0]*sc); y=round(bb[1]*sc)
    else:
        th,cx,extra=TARGET[w]; sc=th/(bb[3]-bb[1])
        fw=round((bb[2]-bb[0])*sc); fh=th
        x=round(cx-fw/2); y=VH-fh+extra
    atlas=Image.new('RGBA',(fw*len(ims),fh))
    for i,im in enumerate(ims):
        fr=im.crop(bb).resize((fw,fh),Image.LANCZOS)
        atlas.paste(hard(fr) if w in HARD else fr,(i*fw,0))
    mz=[[round(x+(f['muzzle'][0]-bb[0])*sc,1),round(y+(f['muzzle'][1]-bb[1])*sc,1)] for f in files]
    if w in SMOKE: atlas,x,y,fw,fh=smoke_frames(atlas,len(ims),x,y,fw,fh,mz,[None]+SMOKE[w])
    atlas.save(OUT+f'assets/gfx/fp_{w}.png',optimize=True)
    if w in MUZZLE_IDLE: mz=[mz[0] if i in states['fire'] else m for i,m in enumerate(mz)]   # bågen: utan pil räknas mynningen från vilobilden
    out[w]={'x':x,'y':y,'w':fw,'h':fh,'states':states,'muzzle':mz,'dur':{'fire':round(st['fire_dur'],3),**{k:round(v,3) for k,v in st.get('durs',{}).items()}}}
    print(w,atlas.size,x,y,mz[0])
open(OUT+'js/weapons.js','w').write('// Genererad av tools/weapon-frames: vapnen utan händer, rakt framåt (Doom/Quake-stil), koordinater i 320x166-vyn.\nwindow.WEAPON_FRAMES = '+json.dumps(out)+';\n')
