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
# Version 15: rökelsekaret (censer, närstrid: ett mässingskar i en kedja; handen med ärmen är en egen rendering, censer_h,
#   som läggs över varje ruta (MERGE); röksvansen efter karet ritas in i skjutrutorna, CENSERFX) och bikastaren
#   (hivelauncher, extra läget reload; bina som flyger ur pipan ritas in i skjutrutorna, BEEFLY). Källor: enkla former.
# Version 16: trädgårdssaxen (shears, närstrid: en sax i handen vars övre halva vrids kring bulten per bildruta; ett blänk
#   där eggarna möts ritas in när saxen klipper, SNIP; extra lägena throw = kastet och empty = tom hand) och drömstaven
#   (dreamstaff, närstrid: stav med månskära och stjärna; stjärnan som flyger mot siktet ritas in i skjutrutorna, STARFLY;
#   extra läget reload). Källor: enkla former i static.html, ställningarna räknas fram i tools/props13/fp_defs.py.
# Version 17: kedjekulekanonen (chaincannon, extra läget reload; kedjekulan som snurrar iväg mot siktet och krutröken vid
#   mynningen ritas in i skjutrutorna, CHAINFLY) och syrasprutan (acidsprayer, fyra skakrutor som går runt som eldkastarens;
#   ett grönt syrastänk vid munstycket ritas in, ACIDFX). Källor: enkla former i static.html, delarna i tools/props14/fp_defs.py.
# Version 18: käglekastaren (pinthrower, närstrid med bumerangens hand; tre jonglörkäglor som snurrar iväg mot siktet ritas in i
#   skjutrutorna, PINFLY) och blåsröret (blowgun, extra läget reload; andningspuffen och giftpilen mot siktet ritas in, DARTFLY).
#   Källor: enkla former i static.html, delarna i tools/props15/fp_defs.py.
# Version 19: hackan (pickaxe, närstrid med bumerangens hand; gnistan och stenflisorna där spetsen tar ritas in i
#   slagrutorna, PICKHIT) och stjärnlansen (starlance, extra lägena charge = laddningen, fyra rutor där stjärnan växer och
#   en ljusring runt den växer, LANCEGLOW, och reload; ett stjärnblänk vid stjärnan ritas in i skjutrutorna, LANCEFLASH -
#   själva strålen ritar spelet, som prismans).
#   Källor: enkla former i static.html, delarna i tools/props16/fp_defs.py.
# Version 20: kroksabeln (scimitar, närstrid med bumerangens hand; extra läget dash = utfallet, tre rutor; ett blekt svep bakom
#   eggen ritas in i svepets rutor, SWEEP) och fällkastaren (trapthrower, närstrid med samma hand; extra läget reload; den öppna
#   björnsaxen som snurrar iväg mot siktet ritas in i kastets rutor, TRAPFLY).
#   Källor: enkla former i static.html, delarna i tools/props17/fp_defs.py.
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
        'sporelauncher':(120,204,30),'steamcannon':(122,206,30),'hivelauncher':(114,204,14),
        'chaincannon':(118,204,22),'acidsprayer':(110,206,16),'blowgun':(96,210,20),'starlance':(100,206,18)}  # höjd i px, mittpunkt x, hur mycket som skärs av nedtill
HARD={'axe','flamer','launcher','nailgun','staff','bow','knives','hammer','musket','harpoon','boomerang','prism','sawlauncher','windgun','spear',
      'sporelauncher','mirrorshield','whip','runebook','steamcannon','censer','hivelauncher','shears','dreamstaff',
      'chaincannon','acidsprayer','pinthrower','blowgun','pickaxe','starlance','scimitar','trapthrower'}   # version 5 och 6: hel eller ingen täckning per pixel
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
MERGE={'mirrorshield':'mirrorshield_s','censer':'censer_h'}   # version 15: rökelsekarets hand               # version 11: en andra rendering (skölden) som läggs över rutorna, samma lägen och antal
PICK_SIDE={'mirrorshield':'mirrorshield_s'}           # version 11: upplockningsbilden ur en annan sidovy (skölden med svärdet bakom)
RUNEFLY={'runebook':[(0,0.0),(1,0.3),(2,0.7),None]}   # version 13: runan (steg, andel av sträckan mot siktet, None = ingen)
WARD={'runebook':[(0,0.55),(1,0.85),(2,1.0)]}         # version 13: sidvirveln runt boken i läget ward (steg, storlek)
STEAMFX={'steamcannon':[(0,10),(1,18),(2,25),(3,29),None]}   # version 13: ångmolnet ur mynningen (steg, radie i px)
CENSERFX={'censer':[0,1,2,3,4,5,6,7]}                        # version 15: rökelsekarets röksvans (steg; svansen följer karets tidigare lägen)
BEEFLY={'hivelauncher':[(0,(0.04,0.1)),(1,(0.08,0.22,0.36)),(2,(0.25,0.45,0.62,0.8)),(3,(0.6,0.8,0.95)),None]}   # version 15: bina (steg, andelar av sträckan mot siktet)
MZ=[]                                                         # version 15: alla rutors mynningar i vyn (för röksvansen)
SNIP={'shears':[None,(0,9),None,(1,9),None,None]}             # version 16: blänket där saxens eggar möts (steg, radie i px)
STARFLY={'dreamstaff':[(0,0.0),(1,0.3),(2,0.65),(3,0.95)]}     # version 16: drömstjärnan (steg, andel av sträckan mot siktet)
CHAINFLY={'chaincannon':[(0,None),(1,0.22),(2,0.5),(3,0.78),(4,0.97)]}   # version 17: kedjekulan (steg, andel av sträckan mot siktet, None = ingen)
ACIDFX={'acidsprayer':[0,1,2,3]}                                # version 17: syrastänket vid munstycket (steg; rutorna går runt)
PINFLY={'pinthrower':[None,None,0.2,0.55,0.9]}                  # version 18: käglorna (andel av sträckan mot siktet, None = inga)
DARTFLY={'blowgun':[(0,0.35),(1,0.75),(2,None)]}                # version 18: blåsrörets puff och pil (steg, andel av sträckan mot siktet)
PICKHIT={'pickaxe':[None,None,None,(0,7),(1,10),None]}          # version 19: gnistan och flisorna där hackans spets tar (steg, radie i px)
LANCEGLOW={'starlance':[(0,4),(1,7),(2,10),(3,13)]}             # version 19: ljusringen runt stjärnan i laddningsrutorna (steg, radie i px)
LANCEFLASH={'starlance':[(0,1.0),(1,0.6),(2,0.25)]}             # version 19: stjärnblänket vid stjärnan när strålen släpps (steg, styrka)
SWEEP={'scimitar':[None,(0,0.6),(1,1.0),(2,0.7),None]}           # version 20: kroksabelns svep bakom eggen (steg, styrka)
TRAPFLY={'trapthrower':[None,None,0.3,0.75]}                    # version 20: björnsaxen (andel av sträckan mot siktet, None = ingen)
# version 21: morgonstjärnan (flail, närstrid, extra läget spin) och trombonen (blunderbuss, krutrök som musköten; None i omladdningsrutorna)
TARGET['blunderbuss']=(124,222,18); HARD.update(('flail','blunderbuss'))
BLUNDERSMOKE={'blunderbuss':[(0,10),(1,18),(2,26),(3,33),(4,38)]}   # trombonens krutrök (steg, radie i px): grå, oregelbunden, glesnar (rastrerad), ingen kontur
SWEEP['flail']=[None,None,(0,0.8),(1,1.0),(2,0.6),None]
# version 22: treudden (trident, närstrid som spjutet: throw/empty) och svavelmortern (brimstone: brinnande klot i båge + krutrök)
TARGET['brimstone']=(148,214,24); HARD.update(('trident','brimstone'))
BLUNDERSMOKE['brimstone']=[(0,9),(1,16),(2,22),(3,28),(4,32)]
BRIMFLY={'brimstone':[(0,0.12),(1,0.38),(2,0.66),(3,0.92),None]}   # svavelklotet (steg, andel av sträckan mot siktet i en båge)


def brimfly_draw(d,mx,my,st,X0,Y0,i):
    """Version 22: svavelmortern: ett brinnande gult svavelklot som lobbas i en båge mot siktet, med en eldsvans bakåt; krymper med avståndet."""
    k,f=st; ax,ay=AIM[0]-X0,AIM[1]-Y0
    def at(t): return (mx+(ax-mx)*t, my+(ay-my)*t-np.sin(t*np.pi)*34)
    px,py=at(f); s=max(0.45,1.25-f*0.85)
    for j in range(6,0,-1):                     # eldsvansen
        tx,ty=at(max(0,f-j*0.035)); r=max(1,(5-j*0.6)*s)
        d.ellipse((tx-r,ty-r,tx+r,ty+r),fill=((255,120,20,255) if j>3 else (255,190,50,255)))
    r=7*s
    d.ellipse((px-r-1,py-r-1,px+r+1,py+r+1),fill=(120,40,10,255))
    d.ellipse((px-r,py-r,px+r,py+r),fill=(232,180,32,255))
    d.ellipse((px-r*0.6,py-r*0.7,px+r*0.2,py),fill=(255,240,140,255))
# version 23: slaktarkroken (hookchain: närstrid, extra lägena throw/empty, kedjan ut mot siktet) och bombarden (bombard: kanonkula + krutrök)
TARGET['bombard']=(146,214,24); HARD.update(('hookchain','bombard'))
BLUNDERSMOKE['bombard']=[(0,10),(1,18),(2,25),(3,31),(4,35)]
BALLFLY={'bombard':[(0,0.1),(1,0.4),(2,0.75),(3,None),None]}   # kanonkulan rakt mot siktet (steg, andel av sträckan)
HOOKLINE={'hookchain':[None,0.55,1.0,0.95]}                   # kedjan och kroken i kastets rutor (andel av sträckan mot siktet)
HOOKHOLD={'hookchain':[1.0]}                                  # läget empty: kedjan sträckt till kroken


def ballfly_draw(d,mx,my,st,X0,Y0,i):
    """Version 23: bombarden: en tung svart järnkula som far rakt mot siktet med fartstreck bakom; krymper med avståndet."""
    k,f=st
    if f is None: return
    ax,ay=AIM[0]-X0,AIM[1]-Y0
    px,py=mx+(ax-mx)*f,my+(ay-my)*f; s=max(0.4,1.3-f*0.9); r=8*s
    for j in range(3):
        tx,ty=mx+(ax-mx)*max(0,f-0.08*(j+1)),my+(ay-my)*max(0,f-0.08*(j+1))
        d.line([(tx-r*0.5,ty),(tx+r*0.5,ty)],fill=(150,150,150,255),width=1)
    d.ellipse((px-r-1,py-r-1,px+r+1,py+r+1),fill=OUTC+(255,))
    d.ellipse((px-r,py-r,px+r,py+r),fill=(58,60,66,255))
    d.ellipse((px-r*0.6,py-r*0.7,px,py-r*0.1),fill=(120,124,134,255))


def hookline_draw(d,mx,my,f,X0,Y0,i):
    """Version 23: slaktarkroken: kedjan (länkar) från handen ut mot siktet och den stora kroken längst ut."""
    ax,ay=AIM[0]-X0+6,AIM[1]-Y0+8
    ex,ey=mx+(ax-mx)*f,my+(ay-my)*f
    n=max(3,int(np.hypot(ex-mx,ey-my)/4))
    for j in range(1,n+1):
        t=j/n; x,y=mx+(ex-mx)*t,my+(ey-my)*t+np.sin(t*np.pi)*4*(1-f*0.6)
        c=(150,154,162,255) if j%2 else (90,94,102,255)
        d.ellipse((x-1.5,y-1,x+1.5,y+1),fill=OUTC+(255,)); d.point((x,y),fill=c)
    s=max(0.9,1.4-f*0.5)
    d.arc((ex-6*s,ey-2*s,ex+6*s,ey+10*s),200,520,fill=OUTC+(255,),width=max(2,int(3*s)))
    d.arc((ex-6*s,ey-2*s,ex+6*s,ey+10*s),200,520,fill=(200,204,212,255),width=1)
    d.polygon([(ex+5*s,ey+2*s),(ex+8*s,ey-2*s),(ex+4*s,ey)],fill=(220,224,230,255))


def blundersmoke_draw(d,mx,my,st,X0,Y0,i):
    """Version 21: trombonen: ett oregelbundet grått krutmoln ur klockan som sprids uppåt och framåt och glesnar; halvgenomskinligt
    med en ordnad 4x4-rastrering i stället för alfa (vapnen har hel eller ingen täckning), utan svart kontur; mynningsblixt i första steget."""
    import random
    k,r=st; rr=random.Random(41+k)
    B=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]])/16.0
    blobs=[(mx+rr.uniform(-0.6,0.5)*r-k*4,my+rr.uniform(-0.9,0.3)*r-k*5,r*rr.uniform(0.35,0.62)) for _ in range(5+2*k)]
    dens=[0.95,0.8,0.62,0.45,0.3][min(k,4)]
    sh=[(96,94,92),(128,126,122),(160,158,152),(188,186,180)]
    x0=int(min(b[0]-b[2] for b in blobs))-1; x1=int(max(b[0]+b[2] for b in blobs))+1
    y0=int(min(b[1]-b[2] for b in blobs))-1; y1=int(max(b[1]+b[2] for b in blobs))+1
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            v=0.0; top=0.0
            for bx,by,br in blobs:
                q=1-((x-bx)**2+(y-by)**2)/(br*br)
                if q>0: v=max(v,q); top=max(top,(by-y)/br)
            if v<=0: continue
            a=min(1.0,v*1.6)*dens
            if a>B[(y+Y0)%4,(x+X0)%4]:
                c=sh[min(3,max(0,int(1.5+top*1.5+v)))]
                d.point((x,y),fill=c+(255,))
    if k==0:
        d.ellipse((mx-5,my-5,mx+5,my+5),fill=(255,170,60,255)); d.ellipse((mx-3,my-3,mx+3,my+3),fill=(255,230,150,255)); d.point((mx,my),fill=(255,255,235,255))
# version 30: slungan (sling: närstrid med handsken, extra läget charge = virveln; stenen mot siktet ritas in, SLINGSTONE) och
# glasbössan (glassgun: extra läget reload; konen av glasskärvor ur klockan ritas in, SHARDFAN)
TARGET['glassgun']=(140,212,22); HARD.update(('sling','glassgun'))
SLINGSTONE={'sling':[None,None,(0,0.3),(1,0.65),(2,0.95)]}      # stenen (steg, andel av sträckan mot siktet)
SHARDFAN={'glassgun':[(0,0.15),(1,0.42),(2,0.72),(3,1.0)]}      # skärvkonen (steg, andel av sträckan mot siktet)


def slingstone_draw(d,mx,my,st,X0,Y0,i):
    """Version 30: slungan: en grå sten som far mot siktet med fartstreck bakom; krymper med avståndet."""
    k,f=st; ax,ay=160-X0,80-Y0
    px,py=mx+(ax-mx)*f,my+(ay-my)*f; s=max(0.35,1.3-f*1.0); r=6*s
    for j in range(3):
        t=max(0,f-0.07*(j+1)); tx,ty=mx+(ax-mx)*t,my+(ay-my)*t
        d.line([(tx-r*0.6,ty),(tx+r*0.6,ty)],fill=(170,164,150,255),width=1)
    d.ellipse((px-r-1,py-r-1,px+r+1,py+r+1),fill=OUTC+(255,))
    d.ellipse((px-r,py-r,px+r,py+r),fill=(128,120,108,255))
    d.ellipse((px-r*0.6,py-r*0.7,px,py-r*0.1),fill=(176,168,152,255))


def shardfan_draw(d,mx,my,st,X0,Y0,i):
    """Version 30: glasbössan: åtta kalla blå glasskärvor som sprids i en kon från klockan mot siktet (vassa trianglar med
    ljus kant), ett vitblått blänk vid klockan i första steget."""
    import random
    k,f=st; ax,ay=150-X0,74-Y0; rr=random.Random(301)
    dx,dy=ax-mx,ay-my; L=max(1.0,np.hypot(dx,dy)); ux,uy=dx/L,dy/L; vx,vy=-uy,ux
    for j in range(8):
        t=f*rr.uniform(0.75,1.0); off=(j-3.5)*f*rr.uniform(8,12); off2=rr.uniform(-1,1)*f*10
        px,py=mx+dx*t+vx*off+ux*off2,my+dy*t+vy*off+uy*off2; s=max(2.4,5.5-f*2.6); a=rr.uniform(0,6.283)
        pts=[(px+np.cos(a)*s*1.4,py+np.sin(a)*s*1.4),(px+np.cos(a+2.4)*s,py+np.sin(a+2.4)*s),(px+np.cos(a+3.6)*s*0.8,py+np.sin(a+3.6)*s*0.8)]
        d.polygon([(x+(1 if x>px else -1)*0.8,y+(1 if y>py else -1)*0.8) for x,y in pts],fill=OUTC+(255,))
        d.polygon(pts,fill=(100,172,206,255)); d.line(pts[:2],fill=(214,244,255,255))
    if k==0:
        d.ellipse((mx-5,my-5,mx+5,my+5),fill=(140,210,240,255)); d.ellipse((mx-2.5,my-2.5,mx+2.5,my+2.5),fill=(236,254,255,255))
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


def censer_draw(d,mx,my,k,X0,Y0,i):
    """Version 15: rökelsekaret: en svans av ljuslila rök längs karets väg från de föregående rutorna, fartstreck och glöd."""
    import random
    rr=random.Random(31+i); sm=[(118,112,138),(168,164,188),(206,204,224),(236,236,248)]
    pts=[(MZ[j][0]-X0,MZ[j][1]-Y0) for j in range(max(1,i-2),i+1)] if i>=1 else [(mx,my)]
    path=[]
    for (ax,ay),(bx,by) in zip(pts,pts[1:]):
        for t in np.linspace(0,1,max(9,int(np.hypot(bx-ax,by-ay)/5)))[:-1]: path.append((ax+(bx-ax)*t,ay+(by-ay)*t))
    path.append((mx,my))
    n=len(path); blobs=[]
    for j,(x,y) in enumerate(path[:-1]):
        u=j/max(1,n-1)
        for q in range(2):
            r=3.5+u*6+rr.uniform(-1.2,1.2)
            blobs.append((x+rr.uniform(-4,4),y+rr.uniform(-4,3)-5*(1-u),r))
    for bx,by,br in blobs: d.ellipse((bx-br-1,by-br-1,bx+br+1,by+br+1),fill=OUTC+(255,))
    for bx,by,br in blobs: d.ellipse((bx-br,by-br,bx+br,by+br),fill=sm[1]+(255,))
    for bx,by,br in blobs: d.ellipse((bx-br*0.75,by-br*0.8,bx+br*0.4,by+br*0.3),fill=sm[2]+(255,))
    for bx,by,br in blobs: d.ellipse((bx-br*0.45,by-br*0.6,bx,by-br*0.15),fill=sm[3]+(255,))
    if len(pts)>1:   # fartstreck längs vägen
        (ax,ay),(bx,by)=pts[-2],pts[-1]; dx,dy=bx-ax,by-ay; ln=np.hypot(dx,dy) or 1; nx,ny=-dy/ln,dx/ln
        for o in (-10,0,10):
            d.line([(ax+nx*o+dx*0.3,ay+ny*o+dy*0.3),(ax+nx*o+dx*0.7,ay+ny*o+dy*0.7)],fill=(250,248,255,255),width=1)
    for j in range(4):   # glöd som stänker ur karet
        a=rr.uniform(0,6.283); dd=rr.uniform(6,14); d.point((mx+np.cos(a)*dd,my+np.sin(a)*dd),fill=(255,190,80,255))


def bee_draw(d,mx,my,st,X0,Y0,i):
    """Version 15: bikastaren: bin som surrar ut ur pipan mot siktet i en slingrande svärm, mindre ju längre bort."""
    import random
    k,fs=st; rr=random.Random(41+i); ax,ay=AIM[0]-X0,AIM[1]-Y0
    if k==0:   # vaxsmulor och en honungsdroppe vid mynningen
        for j in range(6):
            a=rr.uniform(0,6.283); dd=rr.uniform(3,9); d.point((mx+np.cos(a)*dd,my+np.sin(a)*dd*0.8),fill=(248,216,112,255))
    for j,f in enumerate(fs):
        px=mx+(ax-mx)*f+np.sin(f*9+j*2.1)*18*(1-f*0.4); py=my+(ay-my)*f+np.cos(f*7+j*1.7)*10*(1-f*0.4)
        s=max(1.5,5.5*(1-f)+1.6)
        d.ellipse((px-s*1.4-1,py-s-1,px+s*1.4+1,py+s+1),fill=OUTC+(255,))
        d.ellipse((px-s*1.4,py-s,px+s*1.4,py+s),fill=(232,176,30,255))
        if s>2:
            for o in (-0.4,0.3): d.line([(px+s*o,py-s+0.5),(px+s*o,py+s-0.5)],fill=(38,30,30,255),width=max(1,int(s/2.2)))
            d.ellipse((px+s*0.8,py-s*0.6,px+s*1.6,py+s*0.4),fill=(30,22,24,255))
        w=1 if (i+j)%2 else -1   # vingarna, uppe eller nere
        d.ellipse((px-s*0.9,py-s*(2.2 if w>0 else 0.4)-1,px+s*0.3,py-s*(0.6 if w>0 else -1.0)),fill=(230,244,255,255),outline=OUTC+(255,))
        for t in (1,2):   # surrstreck bakom
            d.point((px-s*1.6-t*2,py+rr.uniform(-1,1)),fill=(255,255,255,255))


def snip_draw(d,mx,my,st,X0,Y0,i):
    """Version 16: trädgårdssaxen: ett vitt fyruddigt blänk där eggarna slår ihop och två korta klippstreck."""
    k,r=st
    for a,rr in ((0,r),(1.5708,r),(3.1416,r),(4.7124,r),(0.785,r*0.5),(2.356,r*0.5),(3.927,r*0.5),(5.498,r*0.5)):
        d.line([(mx,my),(mx+np.cos(a)*rr,my+np.sin(a)*rr)],fill=OUTC+(255,),width=3)
    for a,rr in ((0,r),(1.5708,r),(3.1416,r),(4.7124,r),(0.785,r*0.5),(2.356,r*0.5),(3.927,r*0.5),(5.498,r*0.5)):
        d.line([(mx,my),(mx+np.cos(a)*rr,my+np.sin(a)*rr)],fill=(255,255,255,255),width=1)
    d.ellipse((mx-2,my-2,mx+2,my+2),fill=(255,255,240,255))
    for j in (-1,1):   # klippstrecken ut åt sidorna
        d.line([(mx+j*(r+3),my-4-k*2),(mx+j*(r+8),my-8-k*2)],fill=(236,240,248,255),width=1)


def star_draw(d,mx,my,st,X0,Y0,i):
    """Version 16: drömstaven: en gyllene femuddig stjärna med ett lila stoftspår som flyger mot siktet och krymper."""
    import random
    k,f=st; rr=random.Random(51+i); ax,ay=AIM[0]-X0,AIM[1]-Y0
    px,py=mx+(ax-mx)*f,my+(ay-my)*f; r=max(3.0,11*(1-f)+3)
    if k==0:   # ett sken runt stjärnan på staven
        for j in range(8):
            a=j/8*6.283+0.2; r0,r1=r+2,r+(9 if j%2 else 5)
            d.line([(mx+np.cos(a)*r0,my+np.sin(a)*r0),(mx+np.cos(a)*r1,my+np.sin(a)*r1)],fill=(255,236,150,255),width=1)
    for j in range(7):   # lila drömstoft bakom stjärnan
        t=(j+1)/8; x=px+(mx-px)*t*0.6+rr.uniform(-3,3); y=py+(my-py)*t*0.6+rr.uniform(-3,3)
        c=[(176,124,220),(226,196,252),(255,244,200)][j%3]; d.point((x,y),fill=c+(255,))
        if j%3==0: d.point((x+1,y),fill=c+(255,)); d.point((x,y+1),fill=c+(255,))
    pts=[]
    for j in range(10):
        a=-1.5708+j*0.6283+i*0.35; rad=r if j%2==0 else r*0.45
        pts.append((px+np.cos(a)*rad,py+np.sin(a)*rad))
    d.polygon([(x+(1 if x>px else -1),y+(1 if y>py else -1)) for x,y in pts],fill=OUTC+(255,))
    d.polygon(pts,fill=(255,210,70,255))
    d.polygon([(px+(x-px)*0.55,py+(y-py)*0.55) for x,y in pts],fill=(255,244,190,255))


def chain_draw(d,mx,my,st,X0,Y0,i):
    """Version 17: kedjekulekanonen: krutrök och en eldblixt vid mynningen, och kedjekulan (två järnkulor med en kedja emellan)
    som snurrar iväg mot siktet och krymper med avståndet."""
    import random
    k,f=st; rr=random.Random(61+i); ax,ay=AIM[0]-X0,AIM[1]-Y0
    if k<=3:   # krutrök som väller ut och glesnar
        r=7+k*4; sh=[(120,116,114),(160,156,150),(198,194,186)] if k<2 else [(104,102,104),(134,132,132),(160,158,156)]
        blobs=[(mx+rr.uniform(-r*0.6,r*0.6)-k*2,my+rr.uniform(-r*0.5,r*0.3)-k*3,max(3,r*rr.uniform(0.45,0.7))) for _ in range(3+k)]
        for bx,by,br in blobs: d.ellipse((bx-br-1,by-br-1,bx+br+1,by+br+1),fill=OUTC+(255,))
        for bx,by,br in blobs: d.ellipse((bx-br,by-br,bx+br,by+br),fill=sh[0]+(255,))
        for bx,by,br in blobs: d.ellipse((bx-br*0.75,by-br*0.8,bx+br*0.45,by+br*0.3),fill=sh[1]+(255,))
        for bx,by,br in blobs: d.ellipse((bx-br*0.45,by-br*0.6,bx,by-br*0.1),fill=sh[2]+(255,))
    if k==0:   # eldblixten
        for j in range(8):
            a=j/8*6.283+0.3; r0,r1=3,(12 if j%2 else 7)
            d.line([(mx+np.cos(a)*r0,my+np.sin(a)*r0),(mx+np.cos(a)*r1,my+np.sin(a)*r1)],fill=(255,200,90,255),width=2)
        d.ellipse((mx-4,my-4,mx+4,my+4),fill=(255,236,170,255)); d.ellipse((mx-2,my-2,mx+2,my+2),fill=(255,255,240,255))
    if f is None: return
    px,py=mx+(ax-mx)*f,my-4+(ay-my+4)*f; r=max(2.0,7*(1-f)+2); sp=r*2.2; a=i*1.25+0.4
    b1=(px+np.cos(a)*sp,py+np.sin(a)*sp*0.7); b2=(px-np.cos(a)*sp,py-np.sin(a)*sp*0.7)
    for j in range(3):   # fartstrimmor
        q=a+3.1416/2+(j-1)*0.5; d.arc((px-sp-3,py-sp*0.7-3,px+sp+3,py+sp*0.7+3),np.degrees(q)-30,np.degrees(q)+10,fill=(230,232,236,255))
    d.line([b1,b2],fill=OUTC+(255,),width=max(2,int(r*0.7)+2)); d.line([b1,b2],fill=(150,154,162,255),width=max(1,int(r*0.7)))
    for j in range(1,6):   # kedjelänkarna
        t=j/6; x=b1[0]+(b2[0]-b1[0])*t; y=b1[1]+(b2[1]-b1[1])*t; d.point((x,y),fill=(206,210,218,255) if j%2 else (90,94,102,255))
    for bx,by in (b1,b2):
        d.ellipse((bx-r-1,by-r-1,bx+r+1,by+r+1),fill=OUTC+(255,)); d.ellipse((bx-r,by-r,bx+r,by+r),fill=(58,60,68,255))
        d.ellipse((bx-r*0.7,by-r*0.75,bx+r*0.2,by+r*0.1),fill=(96,100,110,255)); d.point((bx-r*0.35,by-r*0.4),fill=(220,224,232,255))


def acid_draw(d,mx,my,k,X0,Y0,i):
    """Version 17: syrasprutan: ett grönt stänk och droppar vid munstycket (strålen ritar spelet själv, som eldkastarens låga)."""
    import random
    rr=random.Random(71+k); G=[(28,90,14),(70,180,30),(150,240,70),(226,255,170)]
    r=5+(k%2)*2
    for j in range(5):   # stänket: små klumpar framåt-uppåt från munstycket
        a=-2.2+rr.uniform(-0.6,0.6); dd=rr.uniform(2,r+4); bx,by=mx+np.cos(a)*dd,my+np.sin(a)*dd; br=rr.uniform(1.5,3.2)
        d.ellipse((bx-br-1,by-br-1,bx+br+1,by+br+1),fill=OUTC+(255,)); d.ellipse((bx-br,by-br,bx+br,by+br),fill=G[1]+(255,))
        d.point((bx-br*0.3,by-br*0.4),fill=G[3]+(255,))
    d.ellipse((mx-r*0.6,my-r*0.6,mx+r*0.6,my+r*0.6),fill=G[2]+(255,)); d.ellipse((mx-1,my-1,mx+1,my+1),fill=G[3]+(255,))
    for j in range(4):   # droppar som faller från munstycket
        x=mx+rr.uniform(-4,3); y=my+4+((j*5+k*3)%12)
        d.line([(x,y-1),(x,y+1)],fill=G[1]+(255,)); d.point((x,y+2),fill=G[0]+(255,))


def pin_draw(d,mx,my,f,X0,Y0,i):
    """Version 18: käglekastaren: tre jonglörkäglor (vit kropp, röda band, röd knopp) som snurrar iväg i en solfjäder mot siktet
    och krymper med avståndet."""
    ax,ay=AIM[0]-X0,AIM[1]-Y0
    for j,(ox,oy) in enumerate(((-14,6),(0,-6),(14,4))):
        px=mx+(ax+ox*(0.4+f)-mx)*f; py=my+(ay+oy*(0.4+f)-my)*f-np.sin(f*np.pi)*14; s=max(0.45,1.3-f*0.85); a=f*9+j*2.1
        u=(np.cos(a),np.sin(a))
        P=lambda t:(px+u[0]*t*s,py+u[1]*t*s)
        bx,by=P(-3); r=4.2*s
        d.ellipse((bx-r-1,by-r-1,bx+r+1,by+r+1),fill=OUTC+(255,))
        d.line([P(-1),P(7)],fill=OUTC+(255,),width=max(2,int(4*s)))
        d.ellipse((bx-r,by-r,bx+r,by+r),fill=(240,234,222,255))
        d.line([P(-1),P(6)],fill=(216,208,192,255),width=max(1,int(2.4*s)))
        d.line([(bx-u[1]*r,by+u[0]*r),(bx+u[1]*r,by-u[0]*r)],fill=(196,40,32,255),width=max(1,int(2*s)))
        kx,ky=P(7.5); k=max(1.2,1.8*s); d.ellipse((kx-k,ky-k,kx+k,ky+k),fill=(196,40,32,255))
        d.point((bx-r*0.4,by-r*0.4),fill=(255,255,255,255))


def dart_draw(d,mx,my,st,X0,Y0,i):
    """Version 18: blåsröret: en liten vit andningspuff vid mynningen och giftpilen (grön spets, röd tofs) på väg mot siktet."""
    k,f=st; ax,ay=AIM[0]-X0,AIM[1]-Y0
    r=3+k*2
    for bx,by,br in ((mx,my-1,r),(mx+3,my-3-k,r*0.7),(mx-3,my-2-k,r*0.6)):
        d.ellipse((bx-br-1,by-br-1,bx+br+1,by+br+1),fill=OUTC+(255,)); d.ellipse((bx-br,by-br,bx+br,by+br),fill=(214,214,206,255))
        d.ellipse((bx-br*0.6,by-br*0.7,bx+br*0.2,by),fill=(244,244,238,255))
    if f is None: return
    px,py=mx+(ax-mx)*f,my+(ay-my)*f; dx,dy=ax-mx,ay-my; L=max(1.0,np.hypot(dx,dy)); u=(dx/L,dy/L); ln=10*(1-f*0.5)
    tx,ty=px-u[0]*ln,py-u[1]*ln
    d.line([(tx,ty),(px,py)],fill=OUTC+(255,),width=3); d.line([(tx,ty),(px,py)],fill=(220,210,170,255),width=1)
    d.ellipse((px-1.5,py-1.5,px+1.5,py+1.5),fill=(120,220,60,255))
    d.ellipse((tx-2.5,ty-2.5,tx+2.5,ty+2.5),fill=OUTC+(255,)); d.ellipse((tx-1.6,ty-1.6,tx+1.6,ty+1.6),fill=(200,40,30,255))


def pickhit_draw(d,mx,my,st,X0,Y0,i):
    """Version 19: hackan: en vit-gul gnista där spetsen tar och några grå stenflisor som sprätter iväg."""
    import random
    k,r=st; rr=random.Random(91+k)
    for j in range(8):
        a=rr.uniform(0,6.283); dd=r*rr.uniform(0.5,1.0); x,y=mx+np.cos(a)*dd,my+np.sin(a)*dd*0.8
        d.line([(mx+np.cos(a)*2,my+np.sin(a)*2),(x,y)],fill=(255,236,150,255) if j%2 else (255,255,230,255))
    for j in range(5):
        a=rr.uniform(-3.0,-0.2); dd=r*(0.6+k*0.5)+rr.uniform(0,4); x,y=mx+np.cos(a)*dd,my+np.sin(a)*dd
        d.rectangle((x-1,y-1,x+1,y+1),fill=OUTC+(255,)); d.point((x,y),fill=(150,140,130,255))
    d.ellipse((mx-2,my-2,mx+2,my+2),fill=(255,250,220,255))


def lanceglow_draw(d,mx,my,st,X0,Y0,i):
    """Version 19: stjärnlansen: en bruten ring av ljuspunkter runt stjärnan som växer när lansen laddas, och strålar i kors."""
    k,r=st; n=10+k*4
    for j in range(n):
        a=j/n*6.283+k*0.3; x,y=mx+np.cos(a)*r,my+np.sin(a)*r*0.9
        d.point((x,y),fill=(220,235,255,255) if j%2 else (150,180,240,255))
    L=3+k*3
    for a in (0,1.571,3.142,4.712):
        d.line([(mx+np.cos(a)*2,my+np.sin(a)*2),(mx+np.cos(a)*L,my+np.sin(a)*L)],fill=(240,248,255,255))
    if k>=2: d.ellipse((mx-2,my-2,mx+2,my+2),fill=(255,255,255,255))


def lanceflash_draw(d,mx,my,st,X0,Y0,i):
    """Version 19: stjärnlansen: ett blåvitt stjärnblänk vid stjärnan när strålen släpps (strålen ritar spelet), med strålar i
    åtta riktningar som krymper rutan ut."""
    k,f=st; r=3+6*f
    pts=[(mx+np.cos(-1.571+j*0.628)*(r if j%2==0 else r*0.45),my+np.sin(-1.571+j*0.628)*(r if j%2==0 else r*0.45)) for j in range(10)]
    for j in range(8):
        a=j*0.785; L=r+3+6*f
        d.line([(mx+np.cos(a)*(r*0.6),my+np.sin(a)*(r*0.6)),(mx+np.cos(a)*L,my+np.sin(a)*L)],fill=(170,200,250,255) if j%2 else (240,248,255,255))
    d.polygon(pts,fill=(255,255,255,255) if f>0.5 else (200,220,255,255))
    d.ellipse((mx-r*0.35,my-r*0.35,mx+r*0.35,my+r*0.35),fill=(255,255,255,255))


def sweep_draw(d,mx,my,st,X0,Y0,i):
    """Version 20: kroksabeln: ett blekt svep (tre tunna bågar) som släpar efter eggen åt höger och uppåt och tunnas ut."""
    k,f=st; R=18+k*6
    for j in range(3):
        r=R-j*4; n=10
        pts=[(mx+np.cos(a)*r-r,my-np.sin(a)*r*0.7) for a in np.linspace(0,1.3*f,n)]
        pts=[(x+r,y) for x,y in pts]
        col=(236,242,250,255) if j==0 else (180,196,220,255)
        d.line(pts,fill=col,width=2 if j==0 else 1)


def trap_draw(d,mx,my,f,X0,Y0,i):
    """Version 20: fällkastaren: en öppen björnsax (järnring med tänder och en mässingsplatta) som snurrar iväg mot siktet i en
    båge och krymper med avståndet."""
    ax,ay=AIM[0]-X0,AIM[1]-Y0
    px=mx+(ax-mx)*f; py=my+(ay-my)*f-np.sin(f*np.pi)*16; s=max(0.5,1.3-f*0.8); a=f*7
    rx,ry=10*s,10*s*abs(np.cos(a))+3*s
    d.ellipse((px-rx-1,py-ry-1,px+rx+1,py+ry+1),fill=OUTC+(255,))
    d.ellipse((px-rx,py-ry,px+rx,py+ry),fill=(90,90,100,255))
    d.ellipse((px-rx+2*s,py-ry+2*s*0.6,px+rx-2*s,py+ry-2*s*0.6),fill=OUTC+(255,))
    for j in range(10):
        b=j/10*6.283
        d.point((px+np.cos(b)*(rx-2.5*s),py+np.sin(b)*(ry-1.5*s)),fill=(200,204,214,255))
    d.ellipse((px-3*s,py-2*s,px+3*s,py+2*s),fill=(150,116,60,255))
    d.line([(px-rx-3*s,py),(px+rx+3*s,py)],fill=(70,70,80,255),width=max(1,int(2*s)))


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
    for s in ['idle','fire']+[k for k in ('draw','charge','reload','throw','empty','block','ward','dash','spin') if k in st]:   # version 6: draw, 7: charge, 8: reload/empty, 9: throw, 11: block, 13: ward, 20: dash, 21: spin
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
    if w in CENSERFX:   # version 15
        MZ[:]=mz
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(CENSERFX[w]),lambda m,k:(max(0,m[0]-20),max(0,m[1]-24),min(VW,m[0]+20),m[1]),censer_draw)
    if w in BEEFLY:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(BEEFLY[w]),lambda m,st:(min(m[0],AIM[0])-16,min(m[1],AIM[1])-14,max(m[0],AIM[0])+16,m[1]),bee_draw)
    if w in SNIP:   # version 16
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(SNIP[w]),lambda m,st:(m[0]-st[1]-10,m[1]-st[1]-12,m[0]+st[1]+10,m[1]+st[1]),snip_draw)
    if w in STARFLY:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(STARFLY[w]),lambda m,st:(min(m[0],AIM[0])-18,min(m[1],AIM[1])-18,max(m[0],AIM[0])+18,m[1]+14),star_draw)
    if w in CHAINFLY:   # version 17
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(CHAINFLY[w]),lambda m,st:(min(m[0],AIM[0])-24,min(m[1],AIM[1])-26,max(m[0],AIM[0])+24,m[1]+8),chain_draw)
    if w in ACIDFX:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(ACIDFX[w]),lambda m,k:(m[0]-14,m[1]-14,m[0]+12,m[1]+18),acid_draw)
    if w in PINFLY:   # version 18
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(PINFLY[w]),lambda m,f:(min(m[0],AIM[0])-24,min(m[1],AIM[1])-30,max(m[0],AIM[0])+24,m[1]+8),pin_draw)
    if w in DARTFLY:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(DARTFLY[w]),lambda m,st:(min(m[0],AIM[0])-10,min(m[1],AIM[1])-10,max(m[0],AIM[0])+10,m[1]+8),dart_draw)
    if w in PICKHIT:   # version 19
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(PICKHIT[w]),lambda m,st:(m[0]-st[1]-8,m[1]-st[1]-10,m[0]+st[1]+8,m[1]+st[1]+4),pickhit_draw)
    if w in LANCEGLOW:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(LANCEGLOW[w],'charge'),lambda m,st:(m[0]-st[1]-3,m[1]-st[1]-3,m[0]+st[1]+3,m[1]+st[1]+3),lanceglow_draw)
    if w in LANCEFLASH:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(LANCEFLASH[w]),lambda m,st:(m[0]-20,m[1]-20,m[0]+20,m[1]+20),lanceflash_draw)
    if w in SWEEP:   # version 20
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(SWEEP[w]),lambda m,st:(m[0]-4,m[1]-40,m[0]+44,m[1]+4),sweep_draw)
    if w in TRAPFLY:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(TRAPFLY[w]),lambda m,f:(min(m[0],AIM[0])-16,min(m[1],AIM[1])-30,max(m[0],AIM[0])+16,m[1]+8),trap_draw)
    if w in BLUNDERSMOKE:   # version 21
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(BLUNDERSMOKE[w]),lambda m,st:(m[0]-st[1]*1.4-14,m[1]-st[1]*1.4-16,m[0]+st[1]*1.2+8,m[1]+st[1]+6),blundersmoke_draw)
    if w in BRIMFLY:   # version 22
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(BRIMFLY[w]),lambda m,st:(min(m[0],AIM[0])-14,max(0,min(m[1],AIM[1])-50),max(m[0],AIM[0])+14,m[1]+10),brimfly_draw)
    if w in BALLFLY:   # version 23
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(BALLFLY[w]),lambda m,st:(min(m[0],AIM[0])-14,min(m[1],AIM[1])-14,max(m[0],AIM[0])+14,m[1]+10),ballfly_draw)
    if w in HOOKLINE:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(HOOKLINE[w],'throw'),lambda m,f:(min(m[0],AIM[0])-14,min(m[1],AIM[1])-8,max(m[0],AIM[0])+20,m[1]+8),hookline_draw)
    if w in HOOKHOLD:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(HOOKHOLD[w],'empty'),lambda m,f:(min(m[0],AIM[0])-14,min(m[1],AIM[1])-8,max(m[0],AIM[0])+20,m[1]+8),hookline_draw)
    if w in SLINGSTONE:   # version 30
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(SLINGSTONE[w]),lambda m,st:(min(m[0],160)-12,min(m[1],80)-12,max(m[0],160)+12,max(m[1],80)+12),slingstone_draw)
    if w in SHARDFAN:
        atlas,x,y,fw,fh=fx_frames(atlas,len(ims),x,y,fw,fh,mz,steps_for(SHARDFAN[w]),lambda m,st:(min(m[0],150)-60,min(m[1],74)-50,max(m[0],150)+60,m[1]+14),shardfan_draw)
    atlas.save(OUT+f'assets/gfx/fp_{w}.png',optimize=True)
    if w in MUZZLE_IDLE: mz=[mz[0] if i in states['fire'] else m for i,m in enumerate(mz)]   # bågen: utan pil räknas mynningen från vilobilden
    out[w]={'x':x,'y':y,'w':fw,'h':fh,'states':states,'muzzle':mz,'dur':{'fire':round(st['fire_dur'],3),**{k:round(v,3) for k,v in st.get('durs',{}).items()}}}
    print(w,atlas.size,x,y,mz[0])
open(OUT+'js/weapons.js','w').write('// Genererad av tools/weapon-frames: vapnen utan händer, rakt framåt (Doom/Quake-stil), koordinater i 320x166-vyn.\nwindow.WEAPON_FRAMES = '+json.dumps(out)+';\n')
