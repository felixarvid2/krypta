# Packar raka vapenbilder (utan händer) till bildremsor för 320x166-vyn, Doom/Quake-stil.
#   python3 pack.py qframes,xframes            packar alla vapen i meta.json-filerna och skriver om js/weapons.js
#   python3 pack.py xframes ../../ axe,flamer  packar bara de namngivna vapnen och behåller övriga poster i js/weapons.js
#   python3 pack.py pick ../../ axe,flamer     upplockningsbilder pick_<vapen>.png ur sidovyerna side_<vapen>.png
# Version 7: kastknivar (knives), stridshammare (hammer, extra läget charge) och musköt (musket, röken ritas in i rutorna).
#   Källor: KayKit Fantasy Weapons Bits dagger_A och hammer_A (Kay Lousberg, CC0), PSX Shotgun Pack OneBarrelShotgun
#   (samma paket som dubbelbössan) med längre pipa och mässingsband ur enkla former; röken ritas i smoke_frames().
# Version 8: harpungevär (harpoon, extra läget reload, repet till harpunen ritas in i skjutrutorna), bumerang (boomerang,
#   en hand av enkla former, extra läget empty = tom hand) och prisma (prism, ljusblixten vid kristallen ritas in).
#   Källor: Guns&Explosives Shotgun och Suomi_KP, KayKit spear_A (CC0), övrigt enkla former i static.html.
# Version 9: sågbladskastaren (sawlauncher, extra läget reload, klingan som flyger iväg ritas in i skjutrutorna), vindbössan
#   (windgun, luftstöten vid trumpeten ritas in) och spjutet (spear, närstrid med handen; extra lägena throw = kast och
#   empty = tom hand). Källor: Guns&Explosives GreaseGun och Luger, KayKit spear_A (CC0), övrigt enkla former.
import json, re, sys
import numpy as np
from PIL import Image
srcs=(sys.argv[1] if len(sys.argv)>1 else 'qframes,xframes').split(',')  # qframes: RetroWeaponPack, xframes: statiska modeller
OUT=sys.argv[2] if len(sys.argv)>2 else '../../'
ONLY=sys.argv[3].split(',') if len(sys.argv)>3 else None
VW,VH=320,166
TARGET={'pistol':(84,178,24),'shotgun':(112,196,40),'rifle':(112,184,42),'smg':(98,178,32),
        'dbshotgun':(110,194,40),'crossbow':(66,166,14),'flaregun':(80,180,22),'sniper':(118,186,46),
        'flamer':(104,226,34),'launcher':(100,188,30),'nailgun':(96,210,22),'musket':(128,196,40),
        'harpoon':(124,198,40),'prism':(118,196,40),'sawlauncher':(118,198,34),'windgun':(118,206,26)}  # höjd i px, mittpunkt x, hur mycket som skärs av nedtill
HARD={'axe','flamer','launcher','nailgun','staff','bow','knives','hammer','musket','harpoon','boomerang','prism','sawlauncher','windgun','spear'}   # version 5 och 6: hel eller ingen täckning per pixel
MUZZLE_IDLE={'bow'}
PICK={'nailgun':(48,'w'),'staff':(48,'w',-90),'bow':(46,'w',90,'string'),'axe':(44,'w',90),'flamer':(54,'w'),'launcher':(46,'w'),
      'knives':(24,'h',0,'fan'),'hammer':(44,'w',90),'musket':(60,'w'),'harpoon':(58,'w'),'boomerang':(22,'w'),'prism':(54,'w'),
      'sawlauncher':(50,'w'),'windgun':(46,'w'),'spear':(60,'w',-90)}  # upplockningsbildens storlek (höjd eller bredd i px)


SMOKE={'musket':[(0,5),(1,10),(2,14),(3,17),(4,18),(5,17)]}   # version 7: rökpuff vid mynningen per skjutruta (steg, radie i px)
ROPE={'harpoon':[0.45,1.0,1.0,0.9,None]}          # version 8: repet från mynningen mot siktet (andel av sträckan, None = inget)
FLASH={'prism':[(0,14),(1,10),(2,6),None]}        # version 8: prismans ljusblixt (steg, radie i px)
SAWFLY={'sawlauncher':[None,0.3,0.7,None,None]}     # version 9: klingan på väg mot siktet (andel av sträckan, None = ingen)
GUST={'windgun':[(0,12),(1,19),(2,26),(3,31),None]}  # version 9: vindbössans luftstöt (steg, radie i px)
AIM=(176,50)                                        # dit harpunen flyger (strax ovanför och till höger om siktet)
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


def fx_frames(atlas,n,x,y,fw,fh,mz,steps,ext,draw):
    """Version 8: ritar en effekt (rep, ljusblixt) in i rutorna; rutan växer så att effekten får plats (x/y flyttas)."""
    from PIL import ImageDraw
    es=[ext(mz[i],steps[i]) for i in range(n) if steps[i] is not None]
    X0=max(0,min([x]+[int(np.floor(e[0])) for e in es])); Y0=max(0,min([y]+[int(np.floor(e[1])) for e in es]))
    X1=min(VW,max([x+fw]+[int(np.ceil(e[2])) for e in es]))
    nw,nh=X1-X0,y+fh-Y0
    out=Image.new('RGBA',(nw*n,nh))
    for i in range(n):
        fr=Image.new('RGBA',(nw,nh)); fr.paste(atlas.crop((i*fw,0,(i+1)*fw,fh)),(x-X0,y-Y0))
        if steps[i] is not None:
            ov=Image.new('RGBA',(nw,nh)); draw(ImageDraw.Draw(ov),mz[i][0]-X0,mz[i][1]-Y0,steps[i],X0,Y0,i)
            fr=Image.alpha_composite(ov,fr) if FX_BEHIND else Image.alpha_composite(fr,ov)
        out.paste(hard(fr),(i*nw,0))
    return out,X0,Y0,nw,nh


FX_BEHIND=False


def rope_draw(d,mx,my,k,X0,Y0,i):
    """Harpunens rep: en hampalina som slingrar sig från mynningen mot siktet."""
    ax,ay=AIM[0]-X0,AIM[1]-Y0; ex,ey=mx+(ax-mx)*k,my+(ay-my)*k
    pts=[]
    for j in range(25):
        t=j/24; sag=np.sin(t*np.pi)*(3 if i<2 else 7)+np.sin(t*12+i)*1.2*(1-t)
        pts.append((mx+(ex-mx)*t,my+(ey-my)*t+sag))
    d.line(pts,fill=OUTC+(255,),width=4); d.line(pts,fill=(200,170,110,255),width=2)
    if i==0: d.ellipse((mx-3,my-3,mx+3,my+3),fill=(240,250,255,255))


def flash_draw(d,mx,my,st,X0,Y0,i):
    """Prismans ljusblixt: vit kärna, regnbågsstrålar."""
    k,r=st; cols=[(255,120,120),(255,220,110),(120,230,140),(110,190,255),(200,130,255)]
    for j in range(10):
        a=j/10*6.283+0.3*k; rr=r*(1.0 if j%2==0 else 0.6)
        d.line([(mx,my),(mx+np.cos(a)*rr,my+np.sin(a)*rr*0.8)],fill=cols[j%5]+(255,),width=2 if k==0 else 1)
    c=max(2,r//3)
    d.ellipse((mx-c-1,my-c-1,mx+c+1,my+c+1),fill=(200,230,255,255)); d.ellipse((mx-c+1,my-c+1,mx+c-1,my+c-1),fill=(255,255,255,255))


def saw_draw(d,mx,my,k,X0,Y0,i):
    """Version 9: sågklingan som snurrar iväg mot siktet och krymper med avståndet."""
    ax,ay=AIM[0]-X0,AIM[1]-Y0; px,py=mx+(ax-mx)*k,my+(ay-my)*k; r=max(3.0,11*(1-k)+3)
    for j in range(3):   # fartstrimmor bakom klingan
        a=np.arctan2(my-py,mx-px)+(j-1)*0.35; d.line([(px+np.cos(a)*r,py+np.sin(a)*r),(px+np.cos(a)*(r+6+4*k),py+np.sin(a)*(r+6+4*k))],fill=(236,240,248,255),width=1)
    pts=[(px+np.cos(t)*(r if j%2==0 else r*0.8),py+np.sin(t)*(r if j%2==0 else r*0.8)*0.8) for j,t in enumerate(np.linspace(0,6.283,17)[:-1]+i)]
    d.polygon([(x+(1 if x>px else -1),y+(1 if y>py else -1)) for x,y in pts],fill=OUTC+(255,)); d.polygon(pts,fill=(200,204,214,255))
    d.ellipse((px-r*0.6,py-r*0.48,px+r*0.6,py+r*0.48),fill=(150,156,170,255)); d.ellipse((px-r*0.25,py-r*0.2,px+r*0.25,py+r*0.2),fill=(200,150,60,255))
    d.arc((px-r*0.8,py-r*0.64,px+r*0.8,py+r*0.64),200,280,fill=(255,255,255,255))


def gust_draw(d,mx,my,st,X0,Y0,i):
    """Version 9: vindbössans luftstöt: ringar som vidgas framför trumpeten och strimmor ut åt sidorna."""
    k,r=st; rings=[(r,(236,246,255)),(r*0.6,(196,222,246))] if k<3 else [(r,(196,222,246))]
    for j in range(8):
        a=j/8*6.283+0.4; r0,r1=r*0.7,r*1.15
        d.line([(mx+np.cos(a)*r0,my+np.sin(a)*r0*0.75),(mx+np.cos(a)*r1,my+np.sin(a)*r1*0.75)],fill=OUTC+(255,),width=3)
        d.line([(mx+np.cos(a)*r0,my+np.sin(a)*r0*0.75),(mx+np.cos(a)*r1,my+np.sin(a)*r1*0.75)],fill=(236,246,255,255),width=1)
    for rr,c in rings:
        d.ellipse((mx-rr,my-rr*0.75,mx+rr,my+rr*0.75),outline=OUTC+(255,),width=4)
        d.ellipse((mx-rr+1,my-rr*0.75+1,mx+rr-1,my+rr*0.75-1),outline=c+(255,),width=2)


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
    for s in ['idle','fire']+[k for k in ('draw','charge','reload','throw','empty') if k in st]:   # version 6: draw, 7: charge, 8: reload/empty, 9: throw
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
    def steps_for(tab):   # version 8: effekten bara i skjutrutorna
        f_=states['fire']; return [tab[f_.index(i)] if i in f_ and f_.index(i)<len(tab) else None for i in range(len(ims))]
    if w in ROPE:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(ROPE[w]),lambda m,k:(min(m[0],AIM[0])-6,min(m[1],AIM[1])-10,max(m[0],AIM[0])+6,m[1]),rope_draw)
    if w in FLASH:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(FLASH[w]),lambda m,st:(m[0]-st[1]-2,m[1]-st[1]-2,m[0]+st[1]+2,m[1]+st[1]),flash_draw)
    if w in SAWFLY:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(SAWFLY[w]),lambda m,k:(min(m[0],AIM[0])-16,min(m[1],AIM[1])-14,max(m[0],AIM[0])+16,m[1]),saw_draw)
    if w in GUST:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(GUST[w]),lambda m,st:(m[0]-st[1]-3,m[1]-st[1]-3,m[0]+st[1]+3,m[1]),gust_draw)
    atlas.save(OUT+f'assets/gfx/fp_{w}.png',optimize=True)
    if w in MUZZLE_IDLE: mz=[mz[0] if i in states['fire'] else m for i,m in enumerate(mz)]   # bågen: utan pil räknas mynningen från vilobilden
    out[w]={'x':x,'y':y,'w':fw,'h':fh,'states':states,'muzzle':mz,'dur':{'fire':round(st['fire_dur'],3),**{k:round(v,3) for k,v in st.get('durs',{}).items()}}}
    print(w,atlas.size,x,y,mz[0])
open(OUT+'js/weapons.js','w').write('// Genererad av tools/weapon-frames: vapnen utan händer, rakt framåt (Doom/Quake-stil), koordinater i 320x166-vyn.\nwindow.WEAPON_FRAMES = '+json.dumps(out)+';\n')
