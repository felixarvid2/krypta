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
# Version 11: sporkastaren (sporelauncher, extra läget reload, sporbollen och sporpuffen ritas in i skjutrutorna),
#   spegelskölden (mirrorshield, närstrid: svärdet i högerhanden; skölden i vänsterhanden är en egen rendering,
#   mirrorshield_s, som läggs över varje ruta (MERGE); extra läget block = skölden uppe framför kameran) och piskan
#   (whip, närstrid; snärten ritas från skaftets spets ut i bilden, LASH). Källor: KayKit sword_B (CC0), övrigt enkla former.
# Version 13: runboken (runebook, närstrid: en öppen bok i handen; runan som skjuts iväg ritas in i skjutrutorna, RUNEFLY,
#   och extra läget ward = boken hålls upp med en virvel av sidor runt sig, WARD) och ångkanonen (steamcannon, extra läget
#   reload; ångmolnet ur mynningen ritas in i skjutrutorna, STEAMFX). Källor: enkla former i static.html.
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
        'harpoon':(124,198,40),'prism':(118,196,40),'sawlauncher':(118,198,34),'windgun':(118,206,26),
        'sporelauncher':(120,204,30),'steamcannon':(122,206,30)}  # höjd i px, mittpunkt x, hur mycket som skärs av nedtill
HARD={'axe','flamer','launcher','nailgun','staff','bow','knives','hammer','musket','harpoon','boomerang','prism','sawlauncher','windgun','spear',
      'sporelauncher','mirrorshield','whip','runebook','steamcannon'}   # version 5 och 6: hel eller ingen täckning per pixel
MUZZLE_IDLE={'bow'}
PICK={'nailgun':(48,'w'),'staff':(48,'w',-90),'bow':(46,'w',90,'string'),'axe':(44,'w',90),'flamer':(54,'w'),'launcher':(46,'w'),
      'knives':(24,'h',0,'fan'),'hammer':(44,'w',90),'musket':(60,'w'),'harpoon':(58,'w'),'boomerang':(22,'w'),'prism':(54,'w'),
      'sawlauncher':(50,'w'),'windgun':(46,'w'),'spear':(60,'w',-90),
      'sporelauncher':(50,'w'),'mirrorshield':(40,'h'),'whip':(40,'h'),'steamcannon':(52,'w')}  # upplockningsbildens storlek (höjd eller bredd i px)


SMOKE={'musket':[(0,5),(1,10),(2,14),(3,17),(4,18),(5,17)]}   # version 7: rökpuff vid mynningen per skjutruta (steg, radie i px)
ROPE={'harpoon':[0.45,1.0,1.0,0.9,None]}          # version 8: repet från mynningen mot siktet (andel av sträckan, None = inget)
FLASH={'prism':[(0,14),(1,10),(2,6),None]}        # version 8: prismans ljusblixt (steg, radie i px)
SAWFLY={'sawlauncher':[None,0.3,0.7,None,None]}     # version 9: klingan på väg mot siktet (andel av sträckan, None = ingen)
GUST={'windgun':[(0,12),(1,19),(2,26),(3,31),None]}  # version 9: vindbössans luftstöt (steg, radie i px)
SPOREFLY={'sporelauncher':[(0,0.0),(1,0.35),(2,0.75),(3,None),None]}   # version 11: sporpuff vid mynningen (steg) och bollen på väg mot siktet (andel, None = ingen)
LASH={'whip':[0,1,2,3,4]}                             # version 11: piskans snärt per skjutruta (läge 0 = bakåt .. 2 = utsträckt mot siktet .. 4 = faller)
MERGE={'mirrorshield':'mirrorshield_s'}               # version 11: en andra rendering (skölden) som läggs över rutorna, samma lägen och antal
PICK_SIDE={'mirrorshield':'mirrorshield_s'}           # version 11: upplockningsbilden ur en annan sidovy (skölden med svärdet bakom)
RUNEFLY={'runebook':[(0,0.0),(1,0.3),(2,0.7),None]}   # version 13: runan (steg, andel av sträckan mot siktet, None = ingen)
WARD={'runebook':[(0,0.55),(1,0.85),(2,1.0)]}         # version 13: sidvirveln runt boken i läget ward (steg, storlek)
STEAMFX={'steamcannon':[(0,10),(1,18),(2,25),(3,29),None]}   # version 13: ångmolnet ur mynningen (steg, radie i px)
AIM=(176,50)                                        # dit harpunen flyger (strax ovanför och till höger om siktet)
WAIM=(112,80)                                       # version 11: dit piskans snärt når (till vänster om siktet, där bågen slår)
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


def spore_draw(d,mx,my,st,X0,Y0,i):
    """Version 11: sporkastarens skott: en puff av lila sporer vid mynningen och sporbollen som flyger mot siktet."""
    import random
    k,f=st; rr=random.Random(5+i)
    if k<3:   # puffen vid mynningen
        r=6+k*4
        blobs=[(mx+rr.uniform(-r*0.5,r*0.5)-k*2,my+rr.uniform(-r*0.4,r*0.3)-k*2,max(2,r*rr.uniform(0.35,0.55))) for _ in range(4)]
        sh=[(86,40,120),(130,72,176),(186,128,228)]
        for bx,by,br in blobs: d.ellipse((bx-br-1,by-br-1,bx+br+1,by+br+1),fill=OUTC+(255,))
        for bx,by,br in blobs: d.ellipse((bx-br,by-br,bx+br,by+br),fill=sh[0]+(255,))
        for bx,by,br in blobs: d.ellipse((bx-br*0.7,by-br*0.75,bx+br*0.4,by+br*0.3),fill=sh[1]+(255,))
        for bx,by,br in blobs: d.ellipse((bx-br*0.45,by-br*0.6,bx,by-br*0.1),fill=sh[2]+(255,))
        for j in range(6):
            a=rr.uniform(0,6.283); dd=r*rr.uniform(0.9,1.5); d.point((mx+np.cos(a)*dd,my+np.sin(a)*dd),fill=(200,240,100,255))
    if f is not None:   # sporbollen, mindre ju längre bort
        ax,ay=AIM[0]-X0,AIM[1]-Y0; px,py=mx+(ax-mx)*f,my+(ay-my)*f; r=max(3.0,9*(1-f)+3)
        d.ellipse((px-r-1,py-r-1,px+r+1,py+r+1),fill=OUTC+(255,)); d.ellipse((px-r,py-r,px+r,py+r),fill=(130,72,176,255))
        d.ellipse((px-r*0.7,py-r*0.7,px+r*0.3,py+r*0.3),fill=(186,128,228,255))
        for j in range(3): d.point((px+np.cos(j*2.1+i)*r*0.5,py+np.sin(j*2.1+i)*r*0.5),fill=(200,240,100,255))
        for j in range(3): d.line([(px+(mx-px)*0.1*(j+1)-2,py+(my-py)*0.1*(j+1)),(px+(mx-px)*0.1*(j+1),py+(my-py)*0.1*(j+1))],fill=(190,224,84,255),width=1)


def lash_draw(d,mx,my,k,X0,Y0,i):
    """Version 11: piskans snärt från skaftets spets: 0 slängd bakåt-uppåt, 1 en båge på väg fram, 2 utsträckt mot
    siktet med en smäll, 3 studsar tillbaka i en våg, 4 faller ned mot handen."""
    ax,ay=WAIM[0]-X0,WAIM[1]-Y0
    if k==0: ctrl=[(mx,my),(mx+30,my+10),(mx+60,my+50),(mx+50,my+100)]
    elif k==1: ctrl=[(mx,my),(mx-30,my-15),(mx-80,my+5),(mx-100,my+40)]
    elif k==2: ctrl=[(mx,my),(mx-25,my-12),(ax+30,ay-25),(ax,ay)]
    elif k==3: ctrl=[(mx,my),(mx-20,my),(ax+20,ay+30),(ax+10,ay+60)]
    else: ctrl=[(mx,my),(mx-10,my+20),(mx-30,my+50),(mx-30,my+90)]
    pts=[]
    for j in range(41):
        t=j/40; u=1-t
        x=u**3*ctrl[0][0]+3*u*u*t*ctrl[1][0]+3*u*t*t*ctrl[2][0]+t**3*ctrl[3][0]
        y=u**3*ctrl[0][1]+3*u*u*t*ctrl[1][1]+3*u*t*t*ctrl[2][1]+t**3*ctrl[3][1]
        pts.append((x,y))
    for j in range(len(pts)-1):   # tjock vid skaftet, tunn mot snärten
        w=max(1,round(6*(1-j/40)+1))
        d.line([pts[j],pts[j+1]],fill=OUTC+(255,),width=w+2)
    for j in range(len(pts)-1):
        w=max(1,round(6*(1-j/40)+1)); c=(122,76,42) if (j//3)%2 else (150,98,56)
        d.line([pts[j],pts[j+1]],fill=c+(255,),width=w)
    if k==2:   # smällen
        ex,ey=pts[-1]
        for j in range(8):
            a=j/8*6.283; r0,r1=3,9 if j%2 else 13
            d.line([(ex+np.cos(a)*r0,ey+np.sin(a)*r0),(ex+np.cos(a)*r1,ey+np.sin(a)*r1)],fill=(255,250,220,255),width=2 if j%2==0 else 1)
        d.ellipse((ex-2,ey-2,ex+2,ey+2),fill=(255,255,255,255))


def rune_draw(d,mx,my,st,X0,Y0,i):
    """Version 13: runboken: ett gyllene sken över boken och runan (en lysande skiva med ett tecken) på väg mot siktet."""
    import random
    k,f=st; rr=random.Random(11+i); G=[(120,64,16),(222,150,40),(255,214,100),(255,248,214)]
    if k==0:   # skenet över sidorna när runan väcks
        for j in range(10):
            a=j/10*6.283; r0,r1=6,(16 if j%2 else 11)
            d.line([(mx+np.cos(a)*r0,my+np.sin(a)*r0*0.7),(mx+np.cos(a)*r1,my+np.sin(a)*r1*0.7)],fill=G[2]+(255,),width=1)
    ax,ay=AIM[0]-X0,AIM[1]-Y0; px,py=mx+(ax-mx)*f,my-6+(ay-my+6)*f; r=max(3.0,10*(1-f)+3)
    for j in range(5):   # gnistspår bakom runan
        t=(j+1)/6; d.point((px+(mx-px)*t*0.4+rr.uniform(-2,2),py+(my-py)*t*0.4+rr.uniform(-2,2)),fill=G[2 if j%2 else 3]+(255,))
    d.ellipse((px-r-1,py-r-1,px+r+1,py+r+1),fill=OUTC+(255,)); d.ellipse((px-r,py-r,px+r,py+r),fill=G[2]+(255,))
    d.ellipse((px-r+1.5,py-r+1.5,px+r-1.5,py+r-1.5),fill=(64,30,10,255))
    s_=r*0.55; w=2 if r>6 else 1   # tecknet: en lodrät stav med två snedstreck
    d.line([(px,py-s_),(px,py+s_)],fill=G[3]+(255,),width=w)
    d.line([(px,py-s_*0.2),(px+s_*0.8,py-s_*0.8)],fill=G[3]+(255,),width=w); d.line([(px,py+s_*0.4),(px-s_*0.8,py-s_*0.2)],fill=G[3]+(255,),width=w)


def ward_draw(d,mx,my,st,X0,Y0,i):
    """Version 13: runbokens värn: lösa sidor som virvlar i en ellips runt boken, med fartstreck mellan dem."""
    k,s=st; rx,ry=118*s,44*s; n=10
    for j in range(n):   # fartstrecken (bågar) bakom sidorna
        a0=j/n*6.283+k*0.5; pts=[(mx+np.cos(a0+t*0.35)*rx,my-16+np.sin(a0+t*0.35)*ry) for t in np.linspace(0,1,6)]
        d.line(pts,fill=(236,226,196,255),width=1)
    for j in range(n):
        a=j/n*6.283+k*0.5+0.4; cx,cy=mx+np.cos(a)*rx,my-16+np.sin(a)*ry; w,h=9*s+3,7*s+2; t=a*1.7
        q=[(cx+np.cos(t)*w-np.sin(t)*h*0.5,cy+np.sin(t)*w*0.5+np.cos(t)*h),(cx-np.cos(t)*w-np.sin(t)*h*0.5,cy-np.sin(t)*w*0.5+np.cos(t)*h),
           (cx-np.cos(t)*w+np.sin(t)*h*0.5,cy-np.sin(t)*w*0.5-np.cos(t)*h),(cx+np.cos(t)*w+np.sin(t)*h*0.5,cy+np.sin(t)*w*0.5-np.cos(t)*h)]
        d.polygon([(x+(1 if x>cx else -1),y+(1 if y>cy else -1)) for x,y in q],fill=OUTC+(255,)); d.polygon(q,fill=(232,218,180,255))
        d.line([q[0],q[1]],fill=(250,242,214,255)); d.line([q[2],q[3]],fill=(170,146,104,255))
        for l in (0.35,0.65):   # skrivrader
            a_=(q[1][0]+(q[2][0]-q[1][0])*l,q[1][1]+(q[2][1]-q[1][1])*l); b_=(q[0][0]+(q[3][0]-q[0][0])*l,q[0][1]+(q[3][1]-q[0][1])*l)
            d.line([(a_[0]*0.8+b_[0]*0.2,a_[1]*0.8+b_[1]*0.2),(a_[0]*0.2+b_[0]*0.8,a_[1]*0.2+b_[1]*0.8)],fill=(150,124,90,255))


def steam_draw(d,mx,my,st,X0,Y0,i):
    """Version 13: ångkanonens stöt: vita ångpuffar som väller ut ur mynningen mot siktet och glesnar."""
    import random
    k,r=st; rr=random.Random(23+i); ax,ay=AIM[0]-X0,AIM[1]-Y0
    sh=[(160,166,178),(204,210,218),(232,236,242),(250,252,254)] if k<3 else [(130,136,148),(170,176,186),(200,204,212),(226,230,236)]
    blobs=[]
    for j in range(4+k):
        t=rr.uniform(0,1)*(0.3+0.15*k); bx=mx+(ax-mx)*t+rr.uniform(-r*0.7,r*0.7); by=my+(ay-my)*t+rr.uniform(-r*0.5,r*0.3)
        blobs.append((by,bx,max(3,r*rr.uniform(0.5,0.85))))
    blobs.sort()
    for by,bx,br in blobs: d.ellipse((bx-br-1,by-br-1,bx+br+1,by+br+1),fill=OUTC+(255,))
    for by,bx,br in blobs: d.ellipse((bx-br,by-br,bx+br,by+br),fill=sh[0]+(255,))
    for by,bx,br in blobs: d.ellipse((bx-br*0.8,by-br*0.85,bx+br*0.55,by+br*0.4),fill=sh[1]+(255,))
    for by,bx,br in blobs: d.ellipse((bx-br*0.55,by-br*0.7,bx+br*0.05,by-br*0.1),fill=sh[2]+(255,))
    for j in range(5+k*2):   # heta droppar
        a=rr.uniform(0,6.283); dd=r*rr.uniform(1.0,1.6); d.point((mx+(ax-mx)*0.15+np.cos(a)*dd,my+np.sin(a)*dd*0.8),fill=sh[3]+(255,))


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
        im=Image.open(f'side_{PICK_SIDE.get(w,w)}.png').convert('RGBA'); im=im.crop(im.getbbox())   # version 11: PICK_SIDE
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
    for s in ['idle','fire']+[k for k in ('draw','charge','reload','throw','empty','block','ward') if k in st]:   # version 6: draw, 7: charge, 8: reload/empty, 9: throw, 11: block, 13: ward
        states[s]=[]
        for fr in st[s]: states[s].append(len(files)); files.append(fr)
    ims=[Image.open(f['f']).convert('RGBA') for f in files]
    if w in MERGE:   # version 11: lägg den andra renderingen (skölden) över varje ruta i samma läge
        ov=[f2 for s_ in states for f2 in d[MERGE[w]][s_]]
        ims=[Image.alpha_composite(im,Image.open(f2['f']).convert('RGBA')) for im,f2 in zip(ims,ov)]
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
    def steps_for(tab,st_='fire'):   # version 8: effekten bara i skjutrutorna (version 13: eller i ett annat läge, st_)
        f_=states[st_]; return [tab[f_.index(i)] if i in f_ and f_.index(i)<len(tab) else None for i in range(len(ims))]
    if w in ROPE:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(ROPE[w]),lambda m,k:(min(m[0],AIM[0])-6,min(m[1],AIM[1])-10,max(m[0],AIM[0])+6,m[1]),rope_draw)
    if w in FLASH:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(FLASH[w]),lambda m,st:(m[0]-st[1]-2,m[1]-st[1]-2,m[0]+st[1]+2,m[1]+st[1]),flash_draw)
    if w in SAWFLY:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(SAWFLY[w]),lambda m,k:(min(m[0],AIM[0])-16,min(m[1],AIM[1])-14,max(m[0],AIM[0])+16,m[1]),saw_draw)
    if w in GUST:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(GUST[w]),lambda m,st:(m[0]-st[1]-3,m[1]-st[1]-3,m[0]+st[1]+3,m[1]),gust_draw)
    if w in SPOREFLY:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(SPOREFLY[w]),lambda m,st:(min(m[0],AIM[0])-22,min(m[1],AIM[1])-22,max(m[0],AIM[0])+22,m[1]),spore_draw)
    if w in LASH:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(LASH[w]),lambda m,k:(max(0,min(m[0],WAIM[0])-110),max(0,m[1]-30),min(VW,m[0]+80),m[1]+110),lash_draw)
    if w in RUNEFLY:   # version 13
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(RUNEFLY[w]),lambda m,st:(min(m[0],AIM[0])-24,min(m[1],AIM[1])-24,max(m[0],AIM[0])+24,m[1]),rune_draw)
    if w in WARD:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(WARD[w],'ward'),lambda m,st:(max(0,m[0]-130*st[1]),max(0,m[1]-70*st[1]),min(VW,m[0]+130*st[1]),m[1]),ward_draw)
    if w in STEAMFX:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(STEAMFX[w]),lambda m,st:(min(m[0],AIM[0])-st[1]*2-6,min(m[1],AIM[1])-st[1]*2-6,max(m[0],AIM[0])+st[1]*2+6,m[1]+st[1]),steam_draw)
    atlas.save(OUT+f'assets/gfx/fp_{w}.png',optimize=True)
    if w in MUZZLE_IDLE: mz=[mz[0] if i in states['fire'] else m for i,m in enumerate(mz)]   # bågen: utan pil räknas mynningen från vilobilden
    out[w]={'x':x,'y':y,'w':fw,'h':fh,'states':states,'muzzle':mz,'dur':{'fire':round(st['fire_dur'],3),**{k:round(v,3) for k,v in st.get('durs',{}).items()}}}
    print(w,atlas.size,x,y,mz[0])
open(OUT+'js/weapons.js','w').write('// Genererad av tools/weapon-frames: vapnen utan händer, rakt framåt (Doom/Quake-stil), koordinater i 320x166-vyn.\nwindow.WEAPON_FRAMES = '+json.dumps(out)+';\n')
