#!/usr/bin/env python3
"""Kortbilder (96x96 RGB, samma format som de övriga i assets/cards).

Version 4: 50 kort där kortets id är relikbildens namn i assets/rune-ai/flux/relics (512x512 webp),
som skalas ned hel med Lanczos, precis som de ursprungliga korten (t.ex. askkungen.png).

Version 5: 30 nya kort. Relikmappen har bara ett fåtal oanvända bilder kvar som inte ser moderna ut
(bergstopp, gycklaren, smetade_paletten, presentkortet), så resten tas ur samma bildserie i
assets/rune-ai/flux: bosses, vouchers, tags och rune-symbols (samma stil: ett föremål på mörklila
vinjett). Tabellen V5 nedan säger vilken bild varje kort har.
Pakterna för yxan, eldkastaren och granatkastaren ritas här (vapnen finns inte i RetroWeaponPack):
en enkel siluett av vapnet på samma blodröda vinjett som tools/weapon-cards. Uppgraderingarna är en
bild ur serien med vapnet som liten bricka nere i hörnet, som de andra vapenuppgraderingarna.

Nya kort (runor, hetta, mana, pilar m.m.): 25 kort ur de sista oanvända bilderna i assets/rune-ai/flux
(tabellen V6). backgrounds/altar och backgrounds/menu beskärs till en kvadrat, packs/eko beskärs så att
texten försvinner och relics/till_manen speglas så att raketen försvinner. Pakterna för spikgeväret,
blixtstaven och långbågen ritas som siluetter här. Uppgraderingarna och de fem aktiva förmågorna är
effektbilder ur assets/ashfall-ai/flux/vfx (svart bakgrund, läggs med "screen" på samma mörklila vinjett
som rune-ai-bilderna); uppgraderingarna har vapnet som bricka i hörnet.

Version 7: rune-ai-serien är slut (de sista relikerna ser moderna ut: rymdskepp, läskflaska, kamera),
så de 20 nya korten tas ur assets/ashfall-ai/flux: medaljongerna i aspects och stats, de få föremålen i
items som inte ser moderna ut (ringar, hängen, dolkar, kronan) och bossen vire (tabellen V7). Bilderna har
svart bakgrund och läggs med "screen" på samma mörklila vinjett som rune-ai-bilderna. Pakterna för
kastknivarna, stridshammaren och musköten ritas som siluetter här; uppgraderingarna är oanvända
effektbilder ur assets/ashfall-ai/flux/vfx med vapnet som bricka i hörnet (tabellen V7_UPGRADES).

Version 8: 24 nya kort (kristall, hav, kunskap och avgrund) ur de sista oanvända bilderna i assets/ashfall-ai/flux
(medaljongerna i aspects och stats, porträtten the_prism och archivist) och assets/ashfall-ai/meshy/icons
(kristallerna, hänget, buren och några färdighetsikoner, som beskärs så att de rundade hörnen försvinner),
tabellen V8. Föremålen med genomskinlig bakgrund läggs på samma mörklila vinjett. Pakterna för harpunen,
bumerangen och prismat ritas som siluetter här; uppgraderingarna är oanvända effektbilder ur
assets/ashfall-ai/flux/vfx med vapnet som bricka i hörnet (tabellen V8_UPGRADES).

Version 9: 24 nya kort (urverk, tid, vind, storm och höjd) – de sista medaljongerna i assets/ashfall-ai/flux som
inte ser moderna ut, bossen drowned_engine och två färdighetsikoner (tabellen V9_ASH); resten ritas här som
föremål med partiklar ur Kenneys particle-pack (tabellen V9_DRAWN). Pakterna för sågbladskastaren, vindbössan och
spjutet ritas som siluetter; uppgraderingarna är oanvända effektbilder ur vfx eller partiklar med vapnet som bricka
i hörnet (tabellen V9_UPGRADES). near_dupes() jämför de nya bilderna med alla befintliga kortbilder.

Kör från repo-roten: python3 retrofps/tools/card-art/make.py .          (alla)
                     python3 retrofps/tools/card-art/make.py . v5       (bara version 5)
                     python3 retrofps/tools/card-art/make.py . v6       (bara version 6)
                     python3 retrofps/tools/card-art/make.py . v7       (bara version 7)
                     python3 retrofps/tools/card-art/make.py . v8       (bara version 8)
                     python3 retrofps/tools/card-art/make.py . v9       (bara version 9)
"""
import os
import sys
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
ONLY = sys.argv[2] if len(sys.argv) > 2 else ''
ONLY_V5 = ONLY == 'v5'
FLUX = os.path.join(ROOT, 'assets/rune-ai/flux')
VFX = os.path.join(ROOT, 'assets/ashfall-ai/flux/vfx')
ASH = os.path.join(ROOT, 'assets/ashfall-ai/flux')
MESHY = os.path.join(ROOT, 'assets/ashfall-ai/meshy/icons')
RELICS = os.path.join(FLUX, 'relics')
OUT = os.path.join(ROOT, 'retrofps/assets/cards')
S = 96

CARDS = [  # kort-id = relikbild
    # vanliga
    'fyllbulten', 'fyrfoten', 'hornstenen', 'agget', 'benflojt', 'hangande_lappen', 'gronskan', 'att_gora',
    'grodan', 'halvmane', 'dominobrickan', 'sollinsen', 'glasogat', 'akrobaten', 'urtidsrunan', 'fyrkanten',
    'idolen', 'moln_nio', 'askstav', 'feltrycket',
    # ovanliga
    'spakvinnan', 'kristallkronan', 'tankestormen', 'inbrottstjuven', 'snedsteget', 'spakortet', 'avtrycket',
    'tomrummet', 'trubaduren', 'lyckokatten', 'sigillbrevet', 'rotknuta', 'schablonen', 'maskerna', 'baronen',
    # sällsynta
    'vandringsstaven', 'bryggan', 'kubtornet', 'spadomskulan', 'glad_trefot', 'pirathatten', 'horisonten',
    'runsten', 'eremiten', 'snedkronet',
    # legendariska
    'prismakronan', 'gryningen', 'travstaven', 'brokiga', 'ansiktslos',
]

V5 = {  # kort-id: bild i assets/rune-ai/flux
    # vanliga
    'lakebladet': 'bosses/grona_bladet', 'groddrunan': 'rune-symbols/natur', 'vargtanden': 'bosses/tanden',
    'jarnnaven': 'bosses/armen', 'eldrunan': 'rune-symbols/eld', 'frosttoppen': 'relics/bergstopp',
    'slaktkroken': 'bosses/kroken', 'spejarkikaren': 'vouchers/teleskop', 'manrunan': 'rune-symbols/mane',
    'marknadstaltet': 'relics/gycklaren', 'vapenladorna': 'vouchers/lager', 'dodsrunan': 'rune-symbols/dod',
    # ovanliga
    'blandbradet': 'relics/smetade_paletten', 'flockens_horn': 'vouchers/krigsrop', 'gapet': 'bosses/munnen',
    'bodelsnalen': 'bosses/nalen', 'ristarboden': 'vouchers/ristarbod', 'brinnande_tornet': 'bosses/tornet',
    'trogna_anden': 'tags/eko', 'overflodet': 'vouchers/overflod', 'spokspegeln': 'bosses/spegeln',
    # sällsynta
    'ishavet': 'bosses/vattnet', 'jagarogat': 'bosses/ogat', 'dimvasen': 'bosses/dimman',
    'gavoasken': 'relics/presentkortet', 'haxkvasten': 'vouchers/rensning', 'trallbojan': 'bosses/kedjan',
    # legendariska
    'purpurkitteln': 'bosses/purpurkarlet', 'karmosinhjartat': 'bosses/karmosinhjartat', 'dodsbesvarjaren': 'bosses/psyket',
}
V5_PACTS = {'pakt_yxa': 'axe', 'pakt_eld': 'flamer', 'pakt_gk': 'launcher'}
V5_UPGRADES = {  # kort-id: (vapen, bild)
    'virvelhugget': ('axe', 'bosses/virveln'), 'aderlataren': ('axe', 'vouchers/slipning'),
    'returkastet': ('axe', 'vouchers/omrullning'), 'skordehugget': ('axe', 'rune-symbols/sol'),
    'brinnande_jord': ('flamer', 'bosses/gloden'), 'bla_lagan': ('flamer', 'rune-symbols/kristall'),
    'sparlagan': ('flamer', 'tags/pengar'), 'eldmuren': ('flamer', 'bosses/muren'),
    'splitterskalet': ('launcher', 'bosses/stenfaltet'), 'tjarbomben': ('launcher', 'bosses/forseglaren'),
    'jattegranaten': ('launcher', 'bosses/askstormen'), 'trummagasinet': ('launcher', 'tags/runor'),
}

V6 = {  # kort-id: bild i assets/rune-ai/flux (de sista oanvända som inte ser moderna ut)
    # vanliga
    'runristaren': 'tags/ristning', 'manastjarnan': 'tags/stjarna', 'fjaderpennan': 'vouchers/penseln',
    'hamstraren': 'vouchers/hamstraren', 'vilostenen': 'backgrounds/altar', 'blixtstenen': 'rune-symbols/blixt',
    'stjarnkartan': 'packs/star', 'pilgrimsfrukten': 'relics/bananen', 'skattbrevet': 'packs/rist', 'askbrevet': 'packs/eko',
    # ovanliga
    'runskivan': 'relics/hologrammet', 'arkana_karnan': 'vouchers/antimateria', 'jaktmarket': 'tags/rabatt',
    'ballongerna': 'relics/kaosclownen', 'marketenterskan': 'vouchers/stjarnbod', 'andekortet': 'card-backs/eko',
    'frostglassen': 'relics/glassen', 'svarta_gavan': 'tags/relik',
    # sällsynta
    'runkistan': 'packs/relic', 'fullmanen': 'relics/till_manen', 'vulkanvaggen': 'bosses/bergvaggen',
    'pilpungen': 'packs/rune', 'demonrunorna': 'card-backs/rist',
    # legendariska
    'asktemplet': 'backgrounds/menu', 'stjarnskytten': 'card-backs/star',
}
CROP = {  # bilder som inte är kvadratiska eller har något modernt i sig: (vänster, topp, höger, botten)
    'backgrounds/altar': (190, 90, 834, 734), 'backgrounds/menu': (232, 40, 792, 600), 'packs/eko': (106, 18, 406, 318),
}
MIRROR = {'relics/till_manen': 258}  # x där bilden speglas: vänstra halvan ersätter den högra (tar bort raketen)
V6_PACTS = {'pakt_spik': 'nailgun', 'pakt_stav': 'staff', 'pakt_bage': 'bow'}
V6_UPGRADES = {  # kort-id: (vapen, effektbild i assets/ashfall-ai/flux/vfx, färgton eller None)
    'fastspikaren': ('nailgun', 'ice_shard_1', (210, 205, 225)), 'studsspiken': ('nailgun', 'hit_spark_0', None),
    'glodspiken': ('nailgun', 'fire_core_0', None), 'rivjarnet': ('nailgun', 'blood_burst', None),
    'askkedjan': ('staff', 'lightning_0', None), 'klotblixten': ('staff', 'electric_ball', None),
    'manakallan': ('staff', 'energy_glow_1', None), 'dunderslaget': ('staff', 'energy_ring', None),
    'spjutpilen': ('bow', 'plasma_bolt_0', None), 'solfjadern': ('bow', 'embers_1', None),
    'krutpilen': ('bow', 'explosion_0', None), 'atervandaren': ('bow', 'void_rift', None),
}
V6_ACTIVES = {  # kort-id: [(effektbild, skala, förskjutning x, y, spegla)]
    'blinken': [('blink_0', 0.95, 0, 0, False)],
    'tidsbubblan': [('magic_circle_cyan', 0.95, 0, 0, False)],
    'skoldbubblan': [('hex_shield_0', 0.95, 0, 0, False)],
    'valnadskallet': [('wisp_0', 0.8, -0.2, 0.02, False), ('wisp_0', 0.8, 0.2, 0.02, True)],
    'jordskalvet': [('crack_0', 0.9, 0, 0.04, False), ('shockwave_dust', 1.0, 0, 0.16, False)],
}

V7 = {  # kort-id: (bild i assets/ashfall-ai/flux, andel av bilden som motivet fyller)
    # vanliga
    'smygskorna': ('aspects/momentum', 0.92), 'tystlaten': ('aspects/phantom', 0.92), 'lyktbararen': ('aspects/trapper', 0.92),
    'lyckostjarnan': ('stats/generic', 0.92), 'guldfrot': ('items/unique_seed_of_accord', 0.86), 'ovningssvardet': ('stats/attackSpeed', 0.92),
    'sjalastenen': ('items/unique_heart_of_lumen', 0.9), 'guldsallet': ('items/unique_mother_of_spores', 0.86),
    # ovanliga
    'kastdolkarna': ('items/scalpel_blade_3', 0.9), 'lyktsmeden': ('aspects/cinder_core', 0.92), 'bankirens_sigill': ('items/conduit_ring_3', 0.84),
    'gyllene_skarabeen': ('aspects/carapace', 0.92), 'vapenboken': ('stats/damage', 0.92), 'nattblinda_ogat': ('aspects/ancient_wrath', 0.92),
    # sällsynta
    'gravplundraren': ('aspects/unbroken', 0.92), 'skuggkappan': ('aspects/ambusher', 0.92), 'blodiga_kronikan': ('stats/cooldownReduction', 0.92),
    'skuldbrevet': ('aspects/parasitic', 0.92),
    # legendariska
    'faraonens_mask': ('items/unique_crown_of_the_hive', 0.88), 'morkrets_furste': ('bosses/vire', 0),  # 0 = hela bilden
}
V7_PACTS = {'pakt_kniv': ('knives', 'pakt_kniv'), 'pakt_musköt': ('musket', 'pakt_muskot'), 'pakt_hammare': ('hammer', 'pakt_hammare')}  # kort-id: (vapen, filnamn)
V7_UPGRADES = {  # kort-id: (vapen, effektbild i assets/ashfall-ai/flux/vfx, färgton eller None)
    'knivsolfjadern': ('knives', 'slash_0', (235, 225, 255)), 'giftleggen': ('knives', 'toxic_splat_0', None),
    'aterkastet': ('knives', 'slash_1', (200, 230, 255)), 'rygghugget': ('knives', 'rune_mark_0', None),
    'jordbavaren': ('hammer', 'crack_1', (255, 200, 140)), 'dunslaget': ('hammer', 'hit_spark_1', (255, 236, 160)),
    'krossaren': ('hammer', 'frost_burst_1', None), 'hammarkastet': ('hammer', 'arc_1', None),
    'hagelladdningen': ('musket', 'explosion_3', None), 'kruthornet': ('musket', 'muzzle_flash', None),
    'krutroken': ('musket', 'smoke_2', None), 'bajonetten': ('musket', 'ichor_burst', (225, 225, 235)),
}

SKILL_CROP = (104, 104, 920, 920)  # färdighetsikonerna i meshy/icons har rundade hörn (ibland vita): bara mitten
V8 = {  # kort-id: (sort, bild, andel av bilden som motivet fyller eller beskärning)
    # ash = assets/ashfall-ai/flux (svart bakgrund, 0 = hela bilden), icon = meshy/icons med genomskinlig bakgrund,
    # skill = meshy/icons färdighetsikon (beskärs)
    # vanliga
    'simfenan': ('skill', 'skill_spore_dart', SKILL_CROP), 'parlbandet': ('icon', 'signal_pendant', 0.78),
    'lardomens_ljus': ('ash', 'stats/critDamage', 0.92), 'roda_skarvan': ('icon', 'crystal_ember', 0.66),
    'tidvattenstenen': ('ash', 'aspects/echo', 0.92), 'skarvlinsen': ('icon', 'crystal_lumen', 0.8),
    'farjkarlens_obol': ('ash', 'aspects/gravity_well', 0.92), 'ronnbarskransen': ('ash', 'aspects/plague', 0.92),
    'larlingens_dryck': ('ash', 'stats/potionHealing', 0.92), 'sjoormen': ('skill', 'skill_parasite_link', SKILL_CROP),
    # ovanliga
    'visdomsstjarnan': ('ash', 'stats/critChance', 0.92), 'dykarklockan': ('icon', 'bio_focus', 0.78),
    'kristallbrytaren': ('ash', 'aspects/hive', 0.92), 'krakens_vrede': ('skill', 'skill_wrath_of_lumen', SKILL_CROP),
    'avgrundsfyren': ('ash', 'aspects/wrecking_ball', 0.92), 'ronnskolden': ('ash', 'aspects/aegis', 0.92),
    'drunknarens_sang': ('ash', 'aspects/virulent', 0.92),
    # sällsynta
    'regnbagsslipan': ('icon', 'crystal_void', 0.8), 'leviatans_fjall': ('skill', 'skill_chitin_armor', SKILL_CROP),
    'siarens_oga': ('ash', 'aspects/predator', 0.92), 'haxjagaren': ('skill', 'skill_phase_shift', SKILL_CROP),
    'avgrundens_lofte': ('ash', 'aspects/leech', 0.92),
    # legendariska
    'glashjartat': ('ash', 'bosses/the_prism', 0), 'avgrundens_arkivarie': ('ash', 'bosses/archivist', 0),
}
V8_PACTS = {'pakt_harpun': 'harpoon', 'pakt_bumerang': 'boomerang', 'pakt_prisma': 'prism'}
V8_UPGRADES = {  # kort-id: (vapen, effektbild i assets/ashfall-ai/flux/vfx, färgton eller None)
    'ankarlinan': ('harpoon', 'arc_0', (200, 225, 255)), 'hullingen': ('harpoon', 'splat_0', (210, 30, 26)),
    'kedjeharpunen': ('harpoon', 'arc_2', (255, 214, 150)), 'snabbvinschen': ('harpoon', 'dust_0', (170, 205, 225)),
    'tvillingkastet': ('boomerang', 'flame_1', (215, 235, 255)), 'eggbumerangen': ('boomerang', 'flame_2', (232, 232, 242)),
    'sokarkastet': ('boomerang', 'wisp_1', None), 'fangsten': ('boomerang', 'heat_ring_0', None),
    'trestralen': ('prism', 'lumen_beam', None), 'spegelstralen': ('prism', 'lightning_1', (230, 200, 255)),
    'fokuslinsen': ('prism', 'energy_glow_0', None), 'solstralen': ('prism', 'flame_0', None),
}

# ---------- vapensiluetter (ritas på 400x400 och beskärs) ----------
INK = (12, 8, 6, 255)


def poly(d, pts, fill, w=6):
    d.polygon(pts, fill=fill)
    d.line(pts + [pts[0]], fill=INK, width=w, joint='curve')


def rrect(d, box, r, fill, w=6):
    d.rounded_rectangle(box, r, fill=fill, outline=INK, width=w)


def draw_axe():
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    rrect(d, (186, 70, 214, 372), 8, (122, 78, 42, 255))           # skaft
    d.line((196, 90, 196, 360), fill=(160, 110, 64, 255), width=4)  # ljus kant
    rrect(d, (180, 336, 220, 372), 6, (70, 44, 26, 255))            # knopp
    for y in (250, 270, 290):                                      # lindning
        d.line((188, y, 212, y), fill=(60, 30, 20, 255), width=5)
    poly(d, [(200, 86), (130, 62), (84, 92), (66, 150), (84, 206), (132, 182), (200, 160)], (128, 132, 142, 255))  # blad
    d.line([(124, 70), (82, 98), (70, 150), (86, 198)], fill=(225, 228, 236, 255), width=7)                        # egg
    poly(d, [(208, 96), (268, 122), (208, 146)], (98, 100, 110, 255))                                             # nacke
    return im.rotate(-32, resample=Image.BICUBIC, expand=True)


def draw_flamer():
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    poly(d, [(16, 176), (64, 166), (64, 214), (24, 226)], (92, 60, 38, 255))   # kolv
    poly(d, [(150, 206), (186, 206), (176, 270), (140, 270)], (60, 46, 36, 255))  # handtag
    rrect(d, (58, 164, 268, 210), 10, (74, 74, 82, 255))                        # kropp
    rrect(d, (84, 104, 226, 162), 26, (150, 108, 52, 255))                      # bränsletank (mässing)
    d.line((104, 118, 206, 118), fill=(226, 190, 110, 255), width=5)
    for x in (110, 200):                                                       # band med nitar
        d.line((x, 106, x, 160), fill=(70, 50, 30, 255), width=6)
    rrect(d, (140, 92, 170, 108), 4, (60, 60, 66, 255))                        # lock
    rrect(d, (264, 176, 344, 196), 4, (60, 60, 66, 255))                        # munstycke
    rrect(d, (234, 206, 262, 236), 4, (60, 60, 66, 255))                        # främre grepp
    flame = [(340, 186), (366, 160), (360, 176), (392, 168), (372, 186), (394, 204), (360, 198), (366, 214)]
    d.polygon(flame, fill=(255, 140, 40, 255))
    d.polygon([(344, 186), (364, 174), (380, 186), (364, 198)], fill=(255, 236, 140, 255))
    return im


def draw_launcher():
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    poly(d, [(14, 156), (124, 166), (124, 200), (14, 214)], (92, 60, 38, 255))   # kolv
    rrect(d, (10, 150, 34, 220), 6, (50, 34, 24, 255))                          # kolvplatta
    poly(d, [(196, 214), (230, 214), (220, 280), (186, 280)], (60, 46, 36, 255))  # handtag
    rrect(d, (190, 142, 384, 190), 12, (70, 76, 70, 255))                       # pipa
    d.line((200, 152, 376, 152), fill=(130, 140, 130, 255), width=5)
    rrect(d, (118, 122, 216, 222), 22, (90, 94, 86, 255))                       # trumma
    for cy in (146, 172, 198):
        d.ellipse((140, cy - 9, 158, cy + 9), fill=(30, 30, 30, 255))
        d.ellipse((176, cy - 9, 194, cy + 9), fill=(30, 30, 30, 255))
    rrect(d, (300, 190, 328, 228), 4, (60, 46, 36, 255))                        # främre grepp
    return im


def draw_nailgun():
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    poly(d, [(150, 200), (196, 200), (184, 286), (140, 286)], (92, 60, 38, 255))   # handtag (trä)
    rrect(d, (136, 280, 190, 300), 6, (60, 40, 26, 255))                          # knopp
    rrect(d, (60, 140, 300, 206), 14, (88, 84, 90, 255))                          # kropp (järn)
    d.line((76, 152, 286, 152), fill=(170, 168, 176, 255), width=5)
    for x in (90, 150, 210, 270):                                                # nitar
        d.ellipse((x - 6, 186, x + 6, 198), fill=(150, 108, 52, 255), outline=INK, width=2)
    rrect(d, (20, 150, 70, 196), 8, (70, 66, 70, 255))                            # bakstycke
    rrect(d, (296, 158, 372, 188), 6, (70, 70, 76, 255))                          # pipa
    poly(d, [(372, 166), (396, 173), (372, 180)], (220, 220, 230, 255), w=3)      # spik ur pipan
    rrect(d, (204, 206, 238, 250), 6, (60, 60, 66, 255))                          # magasin
    for i in range(6):                                                           # spikar i bandet
        x = 208 + i * 14
        d.line((x, 250, x - 4, 330 - i * 8), fill=(200, 200, 210, 255), width=5)
        d.ellipse((x - 6, 244, x + 6, 256), fill=(150, 150, 160, 255), outline=INK, width=2)
    return im


def draw_staff():
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    rrect(d, (186, 120, 214, 392), 10, (110, 70, 40, 255))                        # skaft
    d.line((196, 140, 196, 380), fill=(150, 104, 62, 255), width=4)
    for y in (200, 260, 320):                                                    # lindning
        d.line((188, y, 212, y + 10), fill=(60, 34, 20, 255), width=5)
    for a, b in (((200, 128), (150, 60)), ((200, 128), (250, 60)), ((200, 128), (200, 46))):  # klor
        d.line((a, b), fill=INK, width=14)
        d.line((a, b), fill=(150, 108, 52, 255), width=8)
    d.ellipse((160, 56, 240, 136), fill=(120, 200, 255, 255), outline=INK, width=6)   # kristallklot
    d.ellipse((178, 70, 206, 98), fill=(235, 250, 255, 255))
    for pts in ([(240, 80), (280, 60), (268, 92), (312, 74)], [(160, 84), (122, 66), (132, 98), (88, 82)]):  # blixtar
        d.line(pts, fill=(200, 230, 255, 255), width=5, joint='curve')
    return im.rotate(-28, resample=Image.BICUBIC, expand=True)


def draw_bow():
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    box = (40, 20, 300, 380)
    d.arc(box, -80, 80, fill=INK, width=26)                                      # bågen
    d.arc(box, -78, 78, fill=(130, 84, 44, 255), width=16)
    d.arc((48, 28, 292, 372), -70, 70, fill=(176, 122, 70, 255), width=4)
    rrect(d, (268, 176, 300, 224), 6, (70, 44, 26, 255))                          # grepp
    top, bot = (192, 30), (192, 370)
    d.line((top, (110, 200), bot), fill=(230, 220, 190, 255), width=4)          # sträng, dragen
    d.line((110, 200, 384, 200), fill=INK, width=12)                             # pil
    d.line((110, 200, 384, 200), fill=(160, 120, 70, 255), width=6)
    poly(d, [(372, 186), (398, 200), (372, 214)], (200, 200, 210, 255), w=3)     # spets
    for dy in (-1, 1):                                                           # fjädrar
        poly(d, [(112, 200), (150, 200), (136, 200 + dy * 22), (100, 200 + dy * 22)], (200, 60, 40, 255), w=3)
    return im.rotate(36, resample=Image.BICUBIC, expand=True)


def draw_knives():
    im = Image.new('RGBA', (420, 420))

    def knife():
        k = Image.new('RGBA', (120, 400))
        d = ImageDraw.Draw(k)
        poly(d, [(60, 10), (84, 70), (84, 250), (36, 250), (36, 70)], (176, 180, 192, 255))   # blad
        d.line((60, 22, 60, 244), fill=(236, 238, 244, 255), width=6)                       # ås
        rrect(d, (22, 248, 98, 266), 4, (150, 108, 52, 255))                                 # parerstång
        rrect(d, (44, 264, 76, 362), 8, (70, 40, 26, 255))                                   # grepp
        for y in (284, 306, 328):                                                          # lindning
            d.line((46, y, 74, y + 8), fill=(40, 22, 14, 255), width=5)
        d.ellipse((38, 356, 82, 396), fill=(150, 108, 52, 255), outline=INK, width=5)        # ring
        d.ellipse((50, 368, 70, 386), fill=(0, 0, 0, 0))
        return k
    for ang in (34, 0, -34):                                                                # tre knivar i solfjäder
        k = knife().rotate(ang, resample=Image.BICUBIC, expand=True, center=(60, 330))
        im.alpha_composite(k, ((420 - k.width) // 2, (420 - k.height) // 2 - 10))
    return im


def draw_hammer():
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    rrect(d, (184, 120, 216, 386), 10, (112, 72, 40, 255))                           # skaft
    d.line((194, 140, 194, 374), fill=(156, 108, 64, 255), width=4)
    for y in (300, 322, 344):                                                         # lindning
        d.line((186, y, 214, y + 8), fill=(60, 30, 20, 255), width=6)
    rrect(d, (178, 370, 222, 394), 6, (80, 80, 88, 255))                              # knopp
    rrect(d, (86, 52, 314, 146), 12, (110, 112, 122, 255))                            # huvud
    d.line((98, 66, 302, 66), fill=(200, 204, 214, 255), width=6)
    rrect(d, (70, 62, 96, 136), 6, (90, 92, 102, 255))                                # slagytor
    rrect(d, (304, 62, 330, 136), 6, (90, 92, 102, 255))
    for x in (130, 270):                                                             # band med runor
        d.line((x, 56, x, 142), fill=(150, 108, 52, 255), width=10)
    poly(d, [(200, 76), (216, 100), (200, 124), (184, 100)], (255, 200, 90, 255), w=4)  # runsten
    return im.rotate(-24, resample=Image.BICUBIC, expand=True)


def draw_musket():
    im = Image.new('RGBA', (420, 420))
    d = ImageDraw.Draw(im)
    poly(d, [(8, 212), (120, 190), (196, 196), (196, 222), (124, 226), (24, 262)], (124, 74, 38, 255))  # kolv
    d.line((30, 214, 116, 198), fill=(170, 112, 62, 255), width=5)
    rrect(d, (186, 192, 340, 216), 6, (110, 66, 34, 255))                                              # framstock
    rrect(d, (190, 178, 414, 194), 4, (86, 88, 98, 255))                                               # pipa
    d.line((196, 182, 410, 182), fill=(170, 172, 182, 255), width=3)
    for x in (250, 310):                                                                              # pipband
        d.line((x, 176, x, 216), fill=(176, 132, 64, 255), width=6)
    rrect(d, (150, 176, 190, 198), 4, (150, 108, 52, 255))                                             # lås (mässing)
    d.line((166, 178, 158, 158), fill=INK, width=8)                                                    # hane
    d.line((166, 178, 158, 158), fill=(150, 150, 160, 255), width=4)
    d.arc((140, 206, 180, 246), 20, 200, fill=INK, width=6)                                            # varbygel
    poly(d, [(404, 178), (420, 172), (420, 180)], (210, 210, 220, 255), w=2)                           # sikte
    im = im.crop(im.getbbox())
    im = im.resize((im.width, int(im.height * 1.6)), Image.BICUBIC)                                     # grövre, syns bättre på kortet
    return im.rotate(28, resample=Image.BICUBIC, expand=True)


def draw_harpoon():
    """Harpungevär: trästock, rör av järn, en hullingförsedd harpun och en lina i en ögla."""
    im = Image.new('RGBA', (440, 440))
    d = ImageDraw.Draw(im)
    poly(d, [(6, 216), (100, 196), (150, 200), (150, 228), (104, 232), (18, 262)], (118, 72, 38, 255))   # kolv
    d.line((26, 218, 98, 204), fill=(168, 112, 62, 255), width=5)
    poly(d, [(118, 226), (146, 226), (136, 290), (108, 290)], (86, 54, 32, 255))                      # handtag
    d.arc((112, 222, 160, 270), 10, 190, fill=INK, width=6)                                            # varbygel
    rrect(d, (140, 194, 330, 226), 8, (78, 84, 92, 255))                                               # rör
    d.line((150, 202, 322, 202), fill=(160, 168, 178, 255), width=4)
    for x in (190, 280):                                                                              # band (mässing)
        d.line((x, 190, x, 230), fill=(176, 132, 64, 255), width=7)
    d.line((330, 210, 404, 210), fill=INK, width=12)                                                   # harpunen
    d.line((330, 210, 404, 210), fill=(196, 200, 210, 255), width=6)
    poly(d, [(400, 196), (438, 210), (400, 224)], (220, 222, 232, 255), w=4)                           # spets
    for dy in (-1, 1):                                                                                # hullingar
        poly(d, [(402, 210 + dy * 6), (384, 210 + dy * 24), (392, 210 + dy * 8)], (200, 202, 212, 255), w=3)
    d.arc((40, 228, 170, 330), 200, 340, fill=(220, 200, 150, 255), width=5)                            # lina
    d.ellipse((160, 236, 182, 258), fill=(150, 108, 52, 255), outline=INK, width=4)                     # ögla
    im = im.crop(im.getbbox())
    im = im.resize((im.width, int(im.height * 1.5)), Image.BICUBIC)
    return im.rotate(24, resample=Image.BICUBIC, expand=True)


def draw_boomerang():
    """Bumerang: böjd träbit med målade ränder och en lindning i knäet."""
    im = Image.new('RGBA', (420, 420))
    d = ImageDraw.Draw(im)
    outer = [(30, 330), (70, 200), (150, 90), (210, 60), (270, 90), (350, 200), (390, 330), (350, 340), (300, 230), (240, 150), (210, 136), (180, 150), (120, 230), (70, 340)]
    poly(d, outer, (150, 92, 46, 255), w=8)
    d.line([(52, 320), (92, 206), (160, 112), (210, 84)], fill=(200, 140, 80, 255), width=6, joint='curve')    # ljus kant
    d.line([(210, 84), (262, 112), (330, 206), (368, 320)], fill=(200, 140, 80, 255), width=6, joint='curve')
    for (x0, y0, x1, y1) in ((60, 280, 104, 296), (88, 222, 128, 246), (290, 246, 330, 222), (316, 296, 360, 280)):  # målade ränder
        d.line((x0, y0, x1, y1), fill=(230, 210, 170, 255), width=8)
    for k in range(4):                                                                               # lindning
        d.line((186 + k * 12, 92, 180 + k * 12, 140), fill=(60, 32, 20, 255), width=5)
    return im.rotate(-12, resample=Image.BICUBIC, expand=True)


def draw_prism():
    """Prisma: en glaskristall i en mässingsfattning på ett skaft, en vit stråle in och en regnbåge ut."""
    im = Image.new('RGBA', (440, 440))
    d = ImageDraw.Draw(im)
    rrect(d, (196, 250, 230, 420), 10, (110, 70, 40, 255))                                    # skaft
    d.line((206, 266, 206, 408), fill=(150, 104, 62, 255), width=4)
    for y in (300, 330, 360):                                                                 # lindning
        d.line((198, y, 228, y + 8), fill=(60, 34, 20, 255), width=5)
    poly(d, [(150, 246), (276, 246), (256, 268), (170, 268)], (176, 132, 64, 255))              # fattning
    d.line((30, 170, 176, 186), fill=(250, 250, 255, 255), width=10)                           # strålen in
    cols = [(255, 70, 60), (255, 160, 40), (255, 236, 80), (90, 220, 90), (70, 150, 255), (170, 90, 255)]
    for i, c in enumerate(cols):                                                              # regnbågen ut
        d.polygon([(240, 176 + i * 4), (240, 180 + i * 4), (430, 120 + i * 26), (430, 106 + i * 26)], fill=c + (255,))
    poly(d, [(213, 70), (290, 236), (136, 236)], (150, 220, 240, 255), w=8)                     # kristallen
    poly(d, [(213, 96), (244, 222), (213, 222)], (215, 245, 255, 255), w=3)                     # ljus fasett
    d.line((213, 74, 213, 232), fill=(90, 160, 200, 255), width=3)
    return im


GUNS = {'harpoon': draw_harpoon, 'boomerang': draw_boomerang, 'prism': draw_prism, 'knives': draw_knives, 'hammer': draw_hammer, 'musket': draw_musket, 'axe': draw_axe, 'flamer': draw_flamer, 'launcher': draw_launcher, 'nailgun': draw_nailgun, 'staff': draw_staff, 'bow': draw_bow}


def shade(im):
    """Ljus ovanifrån och lite smuts, så de platta formerna får volym som de renderade vapnen."""
    a = np.asarray(im).astype(np.float32)
    h = a.shape[0]
    ys = np.linspace(1.3, 0.62, h)[:, None, None]
    rng = np.random.default_rng(7)
    grit = 1 + rng.normal(0, 0.06, a.shape[:2])[:, :, None]
    a[:, :, :3] = np.clip(a[:, :, :3] * ys * grit, 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def gun(name, size):
    im = GUNS[name]()
    im = shade(im.crop(im.getbbox()))
    k = size / max(im.size)
    return im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)


def add_glow(dst, g, pos, col, r):
    pad = r * 3
    a = Image.new('L', (g.width + pad * 2, g.height + pad * 2))
    a.paste(g.split()[3], (pad, pad))
    a = a.filter(ImageFilter.GaussianBlur(r))
    gl = Image.new('RGBA', a.size, col + (0,))
    gl.putalpha(a.point(lambda v: min(255, v * 2)))
    dst.alpha_composite(gl, (pos[0] - pad, pos[1] - pad))


def vignette(inner, outer):
    big = Image.new('RGB', (S * 4, S * 4), outer)
    d = ImageDraw.Draw(big)
    for i in range(60, 0, -1):
        t = i / 60
        c = tuple(int(outer[j] + (inner[j] - outer[j]) * (1 - t)) for j in range(3))
        r = int(S * 2 * t * 1.15)
        d.ellipse((S * 2 - r, S * 2 - r, S * 2 + r, S * 2 + r), fill=c)
    return big.convert('RGBA')


def save(im, cid):
    im.resize((S, S), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, cid + '.png'))


def flux(path):
    return Image.open(os.path.join(FLUX, path + '.webp')).convert('RGBA')


def pact(cid, w):
    big = vignette((70, 22, 30), (10, 4, 12))
    g = gun(w, int(S * 4 * 0.74))
    pos = ((S * 4 - g.width) // 2, (S * 4 - g.height) // 2)
    for col, r in (((200, 40, 30), 22), ((255, 190, 80), 6)):
        add_glow(big, g, pos, col, r)
    big.alpha_composite(g, pos)
    save(big, cid)


def upgrade(cid, w, src):
    im = flux(src).resize((S * 4, S * 4), Image.LANCZOS)
    g = gun(w, int(S * 4 * 0.42))
    pos = (S * 4 - g.width - 10, S * 4 - g.height - 12)
    add_glow(im, g, pos, (0, 0, 0), 10)
    add_glow(im, g, pos, (255, 200, 90), 4)
    im.alpha_composite(g, pos)
    save(im, cid)


def flux_v6(src):
    im = Image.open(os.path.join(FLUX, src + '.webp')).convert('RGBA')
    if src in CROP:
        im = im.crop(CROP[src])
    if src in MIRROR:
        x = MIRROR[src]
        left = im.crop((0, 0, x, im.height))
        im.paste(left.transpose(Image.FLIP_LEFT_RIGHT), (x, 0))
    return im


def purple_bg():
    return vignette((58, 34, 74), (8, 5, 12))


def vfx(name, size, tint=None, flip=False):
    im = Image.open(os.path.join(VFX, name + '.webp')).convert('RGB')
    if tint:
        g = im.convert('L')
        im = Image.merge('RGB', [g.point(lambda v, c=c: v * c // 255) for c in tint])
    bb = im.convert('L').point(lambda v: 255 if v > 12 else 0).getbbox() or (0, 0, im.width, im.height)
    im = im.crop(bb)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    k = size / max(im.size)
    return im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)


def screen(dst, im, cx, cy):
    """Lägger en effektbild (ljus på svart) på dst med "screen" kring (cx, cy)."""
    layer = Image.new('RGB', dst.size, (0, 0, 0))
    layer.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
    rgb = ImageChops.screen(dst.convert('RGB'), layer)
    return rgb.convert('RGBA')


def v6_upgrade(cid, w, src, tint):
    big = purple_bg()
    big = screen(big, vfx(src, int(S * 4 * 0.86), tint), S * 2, S * 2 - 10)
    g = gun(w, int(S * 4 * 0.42))
    pos = (S * 4 - g.width - 10, S * 4 - g.height - 12)
    add_glow(big, g, pos, (0, 0, 0), 10)
    add_glow(big, g, pos, (255, 200, 90), 4)
    big.alpha_composite(g, pos)
    save(big, cid)


def v6_active(cid, layers):
    big = vignette((24, 46, 70), (5, 8, 14))  # blåare vinjett: förmågorna ska synas som en egen sort
    for name, sc, dx, dy, flip in layers:
        big = screen(big, vfx(name, int(S * 4 * sc), None, flip), S * 2 + dx * S * 4, S * 2 + dy * S * 4)
    save(big, cid)


def main_v6():
    srcs = list(V6.values())
    assert len(V6) == 25 and len(srcs) == len(set(srcs)), 'varje bild används bara en gång'
    old = set(V5.values()) | {s for _, s in V5_UPGRADES.values()} | {'relics/' + c for c in CARDS}
    assert not old & set(srcs), old & set(srcs)
    fx = [s for _, s, _ in V6_UPGRADES.values()] + sorted({n for ls in V6_ACTIVES.values() for n, *_ in ls})
    assert len(fx) == len(set(fx)), 'varje effektbild används bara en gång'
    n = 0
    for cid, src in V6.items():
        save(flux_v6(src), cid)
        n += 1
    for cid, w in V6_PACTS.items():
        pact(cid, w)
        n += 1
    for cid, (w, src, tint) in V6_UPGRADES.items():
        v6_upgrade(cid, w, src, tint)
        n += 1
    for cid, layers in V6_ACTIVES.items():
        v6_active(cid, layers)
        n += 1
    return n


def ash_card(src, fill):
    im = Image.open(os.path.join(ASH, src + '.webp')).convert('RGB')
    if not fill:  # målning med egen bakgrund: hela bilden
        return im
    bb = im.convert('L').point(lambda v: 255 if v > 22 else 0).getbbox() or (0, 0, im.width, im.height)
    cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
    side = max(bb[2] - bb[0], bb[3] - bb[1]) / fill
    box = Image.new('RGB', (int(side), int(side)), (0, 0, 0))
    box.paste(im, (int(side / 2 - cx), int(side / 2 - cy)))
    return screen(purple_bg(), box.resize((S * 4, S * 4), Image.LANCZOS), S * 2, S * 2)


def main_v7():
    srcs = [s for s, _ in V7.values()]
    assert len(V7) == 20 and len(srcs) == len(set(srcs)), 'varje bild används bara en gång'
    fx = [s for _, s, _ in V7_UPGRADES.values()]
    old_fx = {s for _, s, _ in V6_UPGRADES.values()} | {n for ls in V6_ACTIVES.values() for n, *_ in ls}
    assert len(fx) == len(set(fx)) == 12 and not old_fx & set(fx), 'varje effektbild används bara en gång'
    n = 0
    for cid, (src, fill) in V7.items():
        save(ash_card(src, fill), cid)
        n += 1
    for cid, (w, fname) in V7_PACTS.items():
        pact(fname, w)
        n += 1
    for cid, (w, src, tint) in V7_UPGRADES.items():
        v6_upgrade(cid, w, src, tint)
        n += 1
    return n


def meshy_card(kind, src, arg):
    im = Image.open(os.path.join(MESHY, src + '.webp'))
    if kind == 'skill':  # färdighetsikon med egen bakgrund: mitten utan de rundade hörnen
        return im.convert('RGB').crop(arg)
    im = im.convert('RGBA')  # föremål med genomskinlig bakgrund: centreras på den mörklila vinjetten
    bb = im.split()[3].point(lambda v: 255 if v > 16 else 0).getbbox() or (0, 0, im.width, im.height)
    im = im.crop(bb)
    k = S * 4 * arg / max(im.size)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    big = purple_bg()
    pos = ((S * 4 - im.width) // 2, (S * 4 - im.height) // 2)
    add_glow(big, im, pos, (0, 0, 0), 12)
    big.alpha_composite(im, pos)
    return big


def main_v8():
    srcs = [k + ':' + s for k, s, _ in V8.values()]
    assert len(V8) == 24 and len(srcs) == len(set(srcs)), 'varje bild används bara en gång'
    old = {'ash:' + s for s, _ in V7.values()}
    assert not old & set(srcs), old & set(srcs)
    fx = [s for _, s, _ in V8_UPGRADES.values()]
    old_fx = {s for _, s, _ in V6_UPGRADES.values()} | {n for ls in V6_ACTIVES.values() for n, *_ in ls} | {s for _, s, _ in V7_UPGRADES.values()}
    assert len(fx) == len(set(fx)) == 12 and not old_fx & set(fx), 'varje effektbild används bara en gång'
    n = 0
    for cid, (kind, src, arg) in V8.items():
        save(ash_card(src, arg) if kind == 'ash' else meshy_card(kind, src, arg), cid)
        n += 1
    for cid, w in V8_PACTS.items():
        pact(cid, w)
        n += 1
    for cid, (w, src, tint) in V8_UPGRADES.items():
        v6_upgrade(cid, w, src, tint)
        n += 1
    return n


# ---------- version 9: Klocktornet och Molnborgen ----------
# De sista medaljongerna i assets/ashfall-ai/flux som inte ser moderna ut (blixtsprickan, blixtarna, gnistskuren,
# den bevingade kängan, skölden som vänder pilarna), bossen drowned_engine (ett urverk i vatten) och två
# färdighetsikoner i meshy/icons (en huvklädd gestalt i dimma och en ljusstråle ur himlen). Resten är
# föremål som ritas här (kugghjul, timglas, stoppur, pendel, vindflöjel, fjäder, moln, stege ...) med
# partiklar ur Kenneys particle-pack (assets/effects/particle-pack, vitt på svart, färgas och läggs med
# "screen") på samma mörklila vinjett. Varje partikelbild används bara en gång.
PARTS = os.path.join(ROOT, 'assets/effects/particle-pack/PNG (Black background)')
V9_ASH = {  # kort-id: (sort, bild, andel/beskärning) – som V8
    'askledaren': ('ash', 'aspects/fissure', 0.92), 'askfangaren': ('ash', 'aspects/ricochet', 0.92),
    'tryckvagen': ('ash', 'aspects/swarm', 0.92), 'svalvingarna': ('ash', 'stats/moveSpeed', 0.92),
    'urmakarens_hjarta': ('ash', 'bosses/drowned_engine', 0),
    'stormhuvan': ('skill', 'skill_holo_decoy', SKILL_CROP), 'stormens_skuld': ('skill', 'skill_orbital_strike', SKILL_CROP),
}
# kort-id: (ritfunktion, storlek, förskjutning y, [(partikel, storlek, dx, dy, färg, vridning)])
V9_DRAWN = {
    'kuggfickan': ('gears', 0.82, 0, [('star_09', 0.9, 0, 0, (255, 190, 90), 0)]),
    'sandglaset': ('hourglass', 0.8, 0, [('magic_02', 0.95, 0, 0, (255, 205, 110), 0)]),
    'vindflojeln': ('vane', 0.84, 0.02, [('smoke_04', 0.9, -0.1, -0.12, (120, 200, 230), 0)]),
    'fjaderfallet': ('feather', 0.8, -0.06, [('smoke_07', 0.7, 0, 0.3, (200, 205, 220), 0)]),
    'vaggsmallen': ('wall', 0.86, 0, [('star_08', 0.8, 0.02, -0.04, (255, 150, 60), 0)]),
    'stoppuret': ('stopwatch', 0.8, 0.02, [('magic_01', 0.98, 0, 0.02, (110, 220, 240), 0)]),
    'molnmyntet': ('cloudcoin', 0.76, -0.04, [('smoke_08', 0.62, 0.18, 0.3, (210, 215, 230), 0)]),
    'urnyckeln': ('windkey', 0.84, 0, [('light_02', 0.9, 0, 0, (110, 230, 140), 0)]),
    'klattrarrepet': ('rope', 0.84, 0, [('dirt_02', 0.9, 0, 0.18, (150, 120, 90), 0)]),
    'massingsringen': ('gearring', 0.8, 0, [('circle_03', 0.95, 0, 0, (255, 200, 100), 0)]),
    'pendelvikten': ('pendulum', 0.86, -0.02, [('slash_04', 0.9, 0, 0.26, (255, 200, 110), 0)]),
    'guldmolnet': ('goldcloud', 0.86, 0, [('smoke_09', 0.9, 0, -0.1, (255, 200, 90), 0)]),
    'trasiga_klockan': ('brokenclock', 0.8, 0, [('spark_04', 1.0, 0, 0, (255, 70, 50), 0)]),
    'tidsvaktarens_sigill': ('sigil', 0.8, 0, [('light_01', 1.0, 0, 0, (90, 200, 255), 0)]),
    'virvelstenen': ('spiralstone', 0.74, 0.04, [('smoke_10', 1.0, 0, 0, (90, 210, 230), 0)]),
    'himlastegen': ('ladder', 0.9, 0.02, [('light_03', 0.9, 0, -0.26, (255, 225, 160), 0)]),
    'stormfagelns_fjader': ('stormfeather', 0.86, 0, [('smoke_05', 1.0, 0, -0.18, (70, 80, 120), 0), ('spark_05', 0.9, -0.16, 0, (170, 205, 255), 0)]),
}
V9_PACTS = {'pakt_sagblad': 'sawlauncher', 'pakt_vindbossa': 'windgun', 'pakt_spjut': 'spear'}
V9_UPGRADES = {  # kort-id: (vapen, 'vfx:<bild i ashfall vfx>' eller 'part:<partikel>', färgton eller None, vridning)
    'trebladet': ('sawlauncher', 'part:scratch_01', (235, 225, 200), 0), 'studsklingan': ('sawlauncher', 'vfx:warn_ring_0', None, 0),
    'blodklingan': ('sawlauncher', 'vfx:splat_1', (210, 30, 26), 0), 'aterklingan': ('sawlauncher', 'part:twirl_01', (255, 205, 120), 0),
    'virvelvinden': ('windgun', 'part:twirl_03', (170, 230, 255), 0), 'murslaget': ('windgun', 'vfx:rock_debris', None, 0),
    'nordanvinden': ('windgun', 'vfx:frost_burst_0', None, 0), 'stormfronten': ('windgun', 'vfx:steam_0', (200, 230, 255), 0),
    'genomkastet': ('spear', 'part:trace_02', (255, 220, 150), 90), 'aterkallelsen': ('spear', 'part:twirl_02', (255, 215, 130), 0),
    'utfallet': ('spear', 'part:muzzle_02', (255, 200, 140), -90), 'askspjutet': ('spear', 'part:spark_06', (190, 215, 255), 0),
}

BRASS, DBRASS, STEEL, WOOD = (176, 132, 64, 255), (122, 86, 40, 255), (140, 144, 156, 255), (112, 72, 40, 255)


def gear_pts(cx, cy, ro, ri, n, rot=0.0):
    pts = []
    for k in range(n):
        for t, r in ((0.0, ri), (0.12, ro), (0.38, ro), (0.5, ri), (0.75, ri)):
            a = rot + (k + t) * 2 * np.pi / n
            pts.append((cx + r * np.cos(a), cy + r * np.sin(a)))
    return pts


def gear(d, cx, cy, ro, ri, n, fill, hub, rot=0.0, hole=0.0):
    poly(d, gear_pts(cx, cy, ro, ri, n, rot), fill)
    h = ri * 0.62
    d.ellipse((cx - h, cy - h, cx + h, cy + h), fill=hub, outline=INK, width=5)
    for k in range(4):  # ekrar
        a = rot + k * np.pi / 2 + np.pi / 4
        d.line((cx, cy, cx + h * np.cos(a), cy + h * np.sin(a)), fill=fill, width=int(ri * 0.16))
    c = ri * 0.2 if not hole else hole
    d.ellipse((cx - c, cy - c, cx + c, cy + c), fill=fill if not hole else (0, 0, 0, 0), outline=INK, width=5)


def lighter(c, k=1.35):
    return tuple(min(255, int(v * k)) for v in c[:3]) + (255,)


def cloud(d, blobs, fill, w=7):
    for x, y, r in blobs:  # konturen först, sedan fyllningen: en sammanhängande sky
        d.ellipse((x - r - w, y - r - w, x + r + w, y + r + w), fill=INK)
    for x, y, r in blobs:
        d.ellipse((x - r, y - r, x + r, y + r), fill=fill)
    for x, y, r in blobs[:3]:
        d.arc((x - r * 0.8, y - r * 0.8, x + r * 0.8, y + r * 0.8), 200, 290, fill=lighter(fill, 1.12), width=6)


def feather(d, col, vane, quill, n=14):
    """Fjäder längs en böjd linje (400x400, spetsen uppe)."""
    spine = [(200 + 40 * np.sin(t * 1.4), 380 - 340 * t) for t in np.linspace(0, 1, 40)]
    left, right = [], []
    for i, (x, y) in enumerate(spine):
        t = i / (len(spine) - 1)
        if t < 0.18:
            continue
        w = 70 * np.sin(np.pi * min(1, (t - 0.18) / 0.82)) ** 0.7 + 4
        left.append((x - w, y + w * 0.35))
        right.append((x + w, y + w * 0.35))
    poly(d, left + right[::-1], vane)
    for i in range(1, n):  # strålar
        k = int(len(spine) * (0.22 + 0.74 * i / n))
        x, y = spine[k]
        w = 60 * np.sin(np.pi * i / n) ** 0.7
        for s in (-1, 1):
            d.line((x, y, x + s * w, y + w * 0.5), fill=col, width=3)
    for gx, gy in ((-1, 0.55), (1, 0.4)):  # två hack i fanet
        k = int(len(spine) * gy)
        x, y = spine[k]
        d.polygon([(x + gx * 8, y), (x + gx * 72, y + 10), (x + gx * 60, y + 30)], fill=(0, 0, 0, 0))
    d.line(spine, fill=INK, width=10, joint='curve')
    d.line(spine, fill=quill, width=5, joint='curve')


def art(kind):
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    if kind == 'gears':
        gear(d, 150, 236, 128, 104, 14, BRASS, DBRASS, 0.1)
        gear(d, 296, 120, 82, 64, 10, STEEL, (92, 96, 108, 255), 0.3)
        gear(d, 310, 300, 60, 46, 8, (184, 104, 60, 255), (120, 62, 34, 255), 0.2)
    elif kind == 'hourglass':
        glass = (170, 210, 230, 150)
        poly(d, [(110, 70), (290, 70), (290, 110), (222, 196), (222, 204), (290, 290), (290, 330), (110, 330), (110, 290), (178, 204), (178, 196), (110, 110)], glass)
        d.polygon([(132, 112), (268, 112), (214, 182), (186, 182)], fill=(236, 196, 110, 255))      # sand uppe
        d.polygon([(200, 230), (276, 318), (124, 318)], fill=(236, 196, 110, 255))                  # sand nere
        d.line((200, 184, 200, 300), fill=(250, 220, 140, 255), width=4)                            # rinnande sand
        d.line((124, 96, 140, 120), fill=(240, 250, 255, 255), width=5)
        for y in (40, 330):                                                                          # plattor
            rrect(d, (78, y, 322, y + 34), 8, WOOD)
            d.line((90, y + 9, 310, y + 9), fill=(160, 110, 62, 255), width=4)
        for x in (96, 304):                                                                          # stolpar
            rrect(d, (x - 9, 70, x + 9, 334), 6, (150, 104, 54, 255))
    elif kind == 'vane':
        rrect(d, (192, 150, 208, 392), 6, (70, 70, 78, 255))                                         # stång
        for a, b in (((120, 250), (280, 250)),):                                                    # väderstreck
            d.line((a, b), fill=INK, width=12)
            d.line((a, b), fill=(90, 92, 102, 255), width=6)
        for x in (112, 288):
            d.ellipse((x - 12, 238, x + 12, 262), fill=BRASS, outline=INK, width=4)
        d.line((40, 150, 330, 150), fill=INK, width=14)                                             # pilen
        d.line((40, 150, 330, 150), fill=(110, 112, 122, 255), width=7)
        poly(d, [(318, 122), (386, 150), (318, 178)], BRASS)
        poly(d, [(20, 108), (90, 140), (90, 160), (20, 192), (44, 150)], BRASS)
        poly(d, [(176, 120), (140, 58), (166, 74), (160, 40), (186, 78), (196, 56), (202, 96)], (90, 52, 30, 255))        # tuppens stjärt
        poly(d, [(168, 140), (176, 110), (206, 96), (228, 70), (232, 46), (252, 40), (266, 52), (284, 60), (268, 68),
                 (262, 92), (250, 118), (232, 140)], (130, 80, 40, 255))                                                # tuppen
        d.polygon([(236, 44), (240, 26), (248, 36), (254, 22), (258, 40)], fill=(210, 50, 36, 255))                   # kam
        d.polygon([(262, 70), (270, 84), (256, 80)], fill=(210, 50, 36, 255))                                          # slör
        d.ellipse((248, 48, 258, 58), fill=(250, 230, 150, 255))
        d.ellipse((186, 138, 214, 166), fill=BRASS, outline=INK, width=4)
    elif kind == 'feather':
        feather(d, (170, 160, 150, 255), (236, 232, 222, 255), (200, 170, 120, 255))
        im = im.rotate(-28, resample=Image.BICUBIC, expand=True)
    elif kind == 'stormfeather':
        feather(d, (40, 50, 80, 255), (70, 86, 130, 255), (230, 200, 110, 255), 16)
        d.line([(170, 120), (204, 180), (182, 190), (226, 270)], fill=(220, 236, 255, 255), width=7)  # blixt i fanet
        im = im.rotate(-22, resample=Image.BICUBIC, expand=True)
    elif kind == 'wall':
        for row in range(5):
            y = 40 + row * 64
            off = 0 if row % 2 else -60
            for col in range(4):
                x = off + col * 120 + 20
                c = (150 + (row * 13 + col * 29) % 30, 88 + (row * 7 + col * 11) % 20, 62, 255)
                rrect(d, (max(10, x), y, min(390, x + 112), y + 56), 6, c)
        d.line([(200, 170), (160, 120), (176, 90), (138, 44)], fill=INK, width=8)                       # sprickor
        d.line([(200, 170), (262, 150), (286, 104), (340, 92)], fill=INK, width=8)
        d.line([(200, 170), (220, 236), (190, 290), (210, 340)], fill=INK, width=8)
        d.line([(200, 170), (140, 210), (90, 204), (50, 250)], fill=INK, width=8)
        d.polygon([(170, 150), (222, 140), (236, 196), (184, 206)], fill=(40, 24, 18, 255))           # hål
    elif kind == 'stopwatch':
        d.ellipse((176, 10, 224, 58), fill=(0, 0, 0, 0), outline=INK, width=16)                       # ögla
        d.ellipse((176, 10, 224, 58), outline=BRASS, width=8)
        rrect(d, (180, 50, 220, 84), 6, DBRASS)                                                        # krona
        rrect(d, (270, 60, 300, 90), 6, DBRASS)                                                        # knapp
        d.ellipse((60, 80, 340, 360), fill=BRASS, outline=INK, width=8)
        d.ellipse((84, 104, 316, 336), fill=(236, 226, 200, 255), outline=INK, width=6)
        for k in range(12):
            a = k * np.pi / 6
            r0 = 96 if k % 3 else 84
            d.line((200 + r0 * np.cos(a), 220 + r0 * np.sin(a), 200 + 110 * np.cos(a), 220 + 110 * np.sin(a)), fill=INK, width=6 if k % 3 == 0 else 3)
        d.line((200, 220, 200, 128), fill=(200, 40, 30, 255), width=6)                                 # visare
        d.line((200, 220, 262, 248), fill=INK, width=9)
        d.ellipse((188, 208, 212, 232), fill=DBRASS, outline=INK, width=4)
        d.arc((90, 110, 310, 330), 200, 250, fill=(255, 255, 255, 255), width=6)
    elif kind == 'cloudcoin':
        d.ellipse((40, 40, 360, 360), fill=(214, 168, 60, 255), outline=INK, width=8)
        d.ellipse((70, 70, 330, 330), outline=(150, 110, 36, 255), width=8)
        for k in range(40):                                                                             # räfflad kant
            a = k * np.pi / 20
            d.line((200 + 150 * np.cos(a), 200 + 150 * np.sin(a), 200 + 158 * np.cos(a), 200 + 158 * np.sin(a)), fill=(150, 110, 36, 255), width=4)
        cloud(d, [(160, 210, 50), (230, 196, 62), (284, 222, 38), (120, 236, 34), (200, 240, 46)], (250, 226, 140, 255), 5)
        d.line((112, 280, 290, 280), fill=(150, 110, 36, 255), width=6)
    elif kind == 'windkey':
        for cx in (130, 270):                                                                           # vingarna
            d.ellipse((cx - 78, 40, cx + 78, 180), fill=BRASS, outline=INK, width=8)
            d.ellipse((cx - 30, 86, cx + 30, 136), fill=(0, 0, 0, 0), outline=INK, width=6)
        rrect(d, (168, 80, 232, 150), 10, DBRASS)
        rrect(d, (184, 140, 216, 360), 8, BRASS)                                                        # skaft
        d.line((194, 150, 194, 350), fill=lighter(BRASS), width=4)
        rrect(d, (172, 340, 228, 396), 6, DBRASS)                                                       # fyrkanthylsa
        d.rectangle((188, 356, 212, 380), fill=(30, 22, 14, 255))
        im = im.rotate(-34, resample=Image.BICUBIC, expand=True)
    elif kind == 'rope':
        rope = (196, 156, 96, 255)
        for i, r in enumerate((150, 122, 94, 66)):                                                     # rullen
            box = (200 - r, 250 - r * 0.55, 200 + r, 250 + r * 0.55)
            d.ellipse(box, outline=INK, width=26)
            d.ellipse(box, outline=rope, width=16)
            d.arc(box, 190, 250, fill=lighter(rope), width=5)
        d.line([(310, 230), (334, 160), (318, 96)], fill=INK, width=24, joint='curve')                 # linan upp till kroken
        d.line([(310, 230), (334, 160), (318, 96)], fill=rope, width=14, joint='curve')
        rrect(d, (308, 30, 328, 104), 6, STEEL)                                                         # änterhake
        for pts in ([(318, 44), (280, 30), (266, 2)], [(318, 44), (356, 30), (370, 2)], [(318, 40), (318, 0)]):
            d.line(pts, fill=INK, width=18, joint='curve')
            d.line(pts, fill=STEEL, width=9, joint='curve')
        d.ellipse((306, 92, 330, 116), fill=STEEL, outline=INK, width=4)
    elif kind == 'gearring':
        gear(d, 200, 210, 170, 146, 18, BRASS, DBRASS, 0.0, hole=100)
        d.ellipse((96, 106, 304, 314), fill=(0, 0, 0, 0))
        d.ellipse((96, 106, 304, 314), outline=INK, width=8)
        d.arc((120, 130, 280, 290), 200, 300, fill=lighter(BRASS), width=6)
        poly(d, [(200, 12), (232, 40), (200, 70), (168, 40)], (90, 170, 230, 255))                       # sten
        d.line((190, 30, 200, 22), fill=(230, 250, 255, 255), width=4)
    elif kind == 'pendulum':
        gear(d, 200, 40, 34, 26, 8, DBRASS, BRASS)
        rrect(d, (192, 40, 208, 260), 6, BRASS)                                                         # stången
        d.ellipse((120, 230, 280, 390), fill=BRASS, outline=INK, width=8)                               # lodet
        d.ellipse((146, 256, 254, 364), outline=DBRASS, width=6)
        d.arc((136, 246, 264, 374), 200, 270, fill=lighter(BRASS, 1.5), width=8)
        im = im.rotate(16, resample=Image.BICUBIC, expand=True, center=(200, 40))
    elif kind == 'goldcloud':
        for x, y in ((120, 300), (200, 340), (280, 296), (160, 372), (246, 380)):                      # mynt som regnar
            d.ellipse((x - 22, y - 14, x + 22, y + 14), fill=(230, 180, 60, 255), outline=INK, width=4)
            d.line((x - 10, y - 4, x + 6, y - 6), fill=(255, 236, 150, 255), width=3)
        cloud(d, [(150, 170, 74), (240, 150, 86), (310, 196, 56), (90, 206, 50), (200, 216, 64)], (232, 234, 244, 255))
    elif kind == 'brokenclock':
        d.ellipse((40, 40, 360, 360), fill=(96, 56, 30, 255), outline=INK, width=8)                     # träram
        d.ellipse((72, 72, 328, 328), fill=(226, 214, 186, 255), outline=INK, width=6)
        for k in range(12):
            a = k * np.pi / 6
            d.line((200 + 100 * np.cos(a), 200 + 100 * np.sin(a), 200 + 122 * np.cos(a), 200 + 122 * np.sin(a)), fill=INK, width=7 if k % 3 == 0 else 4)
        d.line([(200, 200), (176, 130), (190, 96)], fill=INK, width=10)                                 # böjd visare
        d.line((200, 200, 276, 236), fill=INK, width=12)
        d.ellipse((186, 186, 214, 214), fill=DBRASS, outline=INK, width=4)
        d.polygon([(236, 72), (300, 96), (262, 150), (230, 120)], fill=(30, 18, 12, 255))               # bortslagen bit
        for pts in ([(230, 120), (200, 150), (150, 160), (110, 230)], [(262, 150), (280, 210), (322, 236)]):
            d.line(pts, fill=INK, width=6)
    elif kind == 'sigil':
        hexa = [(200 + 170 * np.cos(a), 200 + 170 * np.sin(a)) for a in np.arange(6) * np.pi / 3 + np.pi / 6]
        poly(d, hexa, (150, 156, 170, 255), w=8)
        hexi = [(200 + 140 * np.cos(a), 200 + 140 * np.sin(a)) for a in np.arange(6) * np.pi / 3 + np.pi / 6]
        poly(d, hexi, (40, 50, 90, 255))
        for x, y in hexa:
            d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=BRASS, outline=INK, width=4)
        poly(d, [(150, 110), (250, 110), (210, 196), (250, 290), (150, 290), (190, 196)], (226, 190, 100, 255))  # timglas
        d.polygon([(166, 120), (234, 120), (200, 180)], fill=(110, 220, 255, 255))
        d.polygon([(200, 220), (236, 280), (164, 280)], fill=(110, 220, 255, 255))
        d.arc((70, 70, 330, 330), 120, 240, fill=(110, 220, 255, 255), width=5)
        d.arc((70, 70, 330, 330), -60, 60, fill=(110, 220, 255, 255), width=5)
    elif kind == 'spiralstone':
        rock = [(60, 220), (80, 120), (160, 60), (260, 66), (340, 130), (352, 236), (300, 330), (190, 352), (96, 310)]
        poly(d, rock, (118, 122, 130, 255), w=8)
        d.line([(84, 130), (160, 70), (250, 74)], fill=(170, 174, 182, 255), width=6)
        spiral = [(206 + 9 * t * np.cos(t * 1.0), 208 + 9 * t * np.sin(t * 1.0)) for t in np.linspace(0.6, 13.5, 120)]
        d.line(spiral, fill=INK, width=14, joint='curve')
        d.line(spiral, fill=(120, 230, 240, 255), width=7, joint='curve')
    elif kind == 'ladder':
        cloud(d, [(200, 70, 70), (120, 96, 50), (284, 92, 56), (160, 120, 44), (246, 122, 46)], (236, 238, 248, 255))
        for a, b in (((110, 396), (170, 130)), ((290, 396), (230, 130))):                             # bommar
            d.line((a, b), fill=INK, width=22)
            d.line((a, b), fill=(150, 100, 56, 255), width=12)
        for k in range(7):                                                                              # pinnar
            t = k / 7
            y = 380 - t * 236
            xl, xr = 110 + 60 * (396 - y) / 266, 290 - 60 * (396 - y) / 266
            d.line((xl, y, xr, y), fill=INK, width=14 - k)
            d.line((xl, y, xr, y), fill=(196, 146, 86, 255), width=7 - k // 2)
        cloud(d, [(200, 120, 40), (150, 132, 32), (250, 134, 30)], (244, 246, 252, 255), 5)
    return im


def draw_sawlauncher():
    """Sågbladskastaren: kolv, mässingskropp med kugghjul och en cirkelsågsklinga laddad längst fram."""
    im = Image.new('RGBA', (440, 440))
    d = ImageDraw.Draw(im)
    poly(d, [(6, 214), (110, 196), (150, 200), (150, 232), (104, 236), (16, 264)], (118, 72, 38, 255))    # kolv
    d.line((26, 216, 104, 202), fill=(168, 112, 62, 255), width=5)
    poly(d, [(150, 228), (180, 228), (168, 296), (138, 296)], (86, 54, 32, 255))                       # handtag
    rrect(d, (140, 190, 300, 236), 10, BRASS)                                                         # kropp
    d.line((152, 200, 292, 200), fill=(226, 190, 110, 255), width=5)
    gear(d, 200, 214, 34, 26, 9, DBRASS, (90, 62, 30, 255), 0.2)                                      # kugghjul i sidan
    rrect(d, (290, 204, 330, 222), 4, (70, 70, 78, 255))                                              # axel
    teeth = []
    for k in range(18):                                                                               # sågklingan: sneda tänder
        a0 = k * 2 * np.pi / 18
        teeth += [(360 + 66 * np.cos(a0), 212 + 66 * np.sin(a0)), (360 + 84 * np.cos(a0 + 0.08), 212 + 84 * np.sin(a0 + 0.08))]
    poly(d, teeth, (200, 204, 214, 255), w=5)
    d.ellipse((316, 168, 404, 256), outline=(150, 154, 166, 255), width=6)
    d.ellipse((346, 198, 374, 226), fill=(70, 70, 78, 255), outline=INK, width=4)
    d.arc((304, 156, 416, 268), 200, 260, fill=(250, 250, 255, 255), width=5)
    im = im.crop(im.getbbox())
    return im.rotate(18, resample=Image.BICUBIC, expand=True)


def draw_windgun():
    """Vindbössan: en blåsbälg av läder bak, mässingsrör med en vid tratt och virvlar ur mynningen."""
    im = Image.new('RGBA', (440, 440))
    d = ImageDraw.Draw(im)
    poly(d, [(6, 218), (70, 200), (70, 244), (14, 262)], (118, 72, 38, 255))                           # kolv
    for k in range(5):                                                                                # bälgen
        x = 70 + k * 18
        poly(d, [(x, 176 - (k % 2) * 10), (x + 18, 176 - ((k + 1) % 2) * 10), (x + 18, 268 + ((k + 1) % 2) * 10), (x, 268 + (k % 2) * 10)], (120, 70, 40, 255) if k % 2 else (150, 92, 52, 255), w=4)
    rrect(d, (66, 170, 80, 274), 4, WOOD)
    rrect(d, (156, 170, 170, 274), 4, WOOD)
    poly(d, [(170, 252), (200, 252), (190, 316), (160, 316)], (86, 54, 32, 255))                      # handtag
    rrect(d, (168, 204, 320, 240), 8, BRASS)                                                          # rör
    d.line((176, 212, 312, 212), fill=(230, 196, 120, 255), width=5)
    for x in (220, 280):
        d.line((x, 200, x, 244), fill=DBRASS, width=7)
    poly(d, [(316, 206), (392, 160), (406, 168), (406, 276), (392, 284), (316, 238)], (196, 150, 72, 255))  # tratt
    d.ellipse((384, 160, 420, 284), fill=(60, 40, 22, 255), outline=INK, width=6)
    for k, r in enumerate((26, 44)):                                                                  # virvlar
        d.arc((404 - r, 222 - r, 404 + r + 30, 222 + r), -70, 70, fill=(200, 240, 255, 255), width=6 - k)
    im = im.crop(im.getbbox())
    im = im.resize((im.width, int(im.height * 1.2)), Image.BICUBIC)
    return im.rotate(20, resample=Image.BICUBIC, expand=True)


def draw_spear():
    """Spjutet: långt träskaft, lindning, ett bladformat stålhuvud och en röd tofs."""
    im = Image.new('RGBA', (120, 460))
    d = ImageDraw.Draw(im)
    rrect(d, (48, 110, 72, 452), 10, (122, 80, 44, 255))                                             # skaft
    d.line((56, 130, 56, 440), fill=(166, 116, 66, 255), width=4)
    for y in (118, 134, 150):                                                                        # lindning
        d.line((48, y, 72, y + 8), fill=(60, 34, 20, 255), width=6)
    rrect(d, (44, 98, 76, 120), 6, (150, 108, 52, 255))                                              # holk
    poly(d, [(60, 4), (92, 60), (78, 100), (42, 100), (28, 60)], (190, 194, 206, 255))                 # bladet
    d.line((60, 12, 60, 96), fill=(240, 242, 248, 255), width=5)
    for dx in (-1, 1):                                                                               # tofs
        d.line((60, 128, 60 + dx * 26, 190), fill=INK, width=10)
        d.line((60, 128, 60 + dx * 26, 190), fill=(200, 40, 34, 255), width=5)
    return im.rotate(-50, resample=Image.BICUBIC, expand=True)


GUNS.update({'sawlauncher': draw_sawlauncher, 'windgun': draw_windgun, 'spear': draw_spear})


def particle(name, size, tint, rot=0):
    im = Image.open(os.path.join(PARTS, name + '.png')).convert('L')
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    im = im.crop(im.point(lambda v: 255 if v > 12 else 0).getbbox() or (0, 0, im.width, im.height))
    im = Image.merge('RGB', [im.point(lambda v, c=c: v * c // 255) for c in tint])
    k = size / max(im.size)
    return im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)


def drawn_card(cid, kind, size, dy, parts):
    big = purple_bg()
    for name, sc, px, py, tint, rot in parts:
        big = screen(big, particle(name, int(S * 4 * sc), tint, rot), S * 2 + px * S * 4, S * 2 + py * S * 4)
    g = art(kind)
    g = shade(g.crop(g.getbbox()))
    k = S * 4 * size / max(g.size)
    g = g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))), Image.LANCZOS)
    pos = ((S * 4 - g.width) // 2, int((S * 4 - g.height) / 2 + dy * S * 4))
    add_glow(big, g, pos, (0, 0, 0), 12)
    big.alpha_composite(g, pos)
    save(big, cid)


def v9_upgrade(cid, w, src, tint, rot):
    kind, name = src.split(':')
    big = purple_bg()
    fx = vfx(name, int(S * 4 * 0.86), tint) if kind == 'vfx' else particle(name, int(S * 4 * 0.86), tint, rot)
    big = screen(big, fx, S * 2, S * 2 - 10)
    g = gun(w, int(S * 4 * 0.42))
    pos = (S * 4 - g.width - 10, S * 4 - g.height - 12)
    add_glow(big, g, pos, (0, 0, 0), 10)
    add_glow(big, g, pos, (255, 200, 90), 4)
    big.alpha_composite(g, pos)
    save(big, cid)


def sig(f):
    """Gråskalesignatur 32x32 (normaliserad), tålig mot omfärgning, ljusare/mörkare och omskalning."""
    a = np.asarray(Image.open(f).convert('L').resize((32, 32), Image.BILINEAR)).astype(np.float32)
    return (a - a.mean()) / (a.std() + 1e-6)


def near_dupes(new_ids, limit=0.1):
    """Jämför varje ny bild med ALLA andra kortbilder i assets/cards och avbryter om någon är samma bild
    (omfärgad, skalad eller nästan lika). Olika kort ligger över 0,11 (närmast: ankarlinan ~ kedjeharpunen);
    samma bild med annan färg eller ljusstyrka ligger under 0,03."""
    files = sorted(f for f in os.listdir(OUT) if f.endswith('.png') and f != 'back.png')
    sigs = {f[:-4]: sig(os.path.join(OUT, f)) for f in files}
    worst = (9.0, '', '')
    for cid in new_ids:
        for other, s in sigs.items():
            if other == cid:
                continue
            dist = float(np.abs(sigs[cid] - s).mean())
            if dist < worst[0]:
                worst = (dist, cid, other)
            assert dist > limit, (cid, 'liknar', other, round(dist, 3))
    print('%d nya bilder mot %d kortbilder, närmaste par: %s ~ %s (%.2f)' % (len(new_ids), len(sigs), worst[1], worst[2], worst[0]))


def main_v9():
    old_ash = {'ash:' + s for s, _ in V7.values()} | {k + ':' + s for k, s, _ in V8.values()}
    srcs = [k + ':' + s for k, s, _ in V9_ASH.values()]
    assert len(srcs) == len(set(srcs)) and not old_ash & set(srcs), 'varje bild används bara en gång'
    assert len(V9_ASH) + len(V9_DRAWN) == 24 and not set(V9_ASH) & set(V9_DRAWN)
    parts = [p[0] for _, _, _, ps in V9_DRAWN.values() for p in ps] + [s[5:] for _, s, _, _ in V9_UPGRADES.values() if s.startswith('part:')]
    assert len(parts) == len(set(parts)), 'varje partikelbild används bara en gång'
    fx = [s[4:] for _, s, _, _ in V9_UPGRADES.values() if s.startswith('vfx:')]
    old_fx = {s for _, s, _ in V6_UPGRADES.values()} | {n for ls in V6_ACTIVES.values() for n, *_ in ls} | {s for _, s, _ in V7_UPGRADES.values()} | {s for _, s, _ in V8_UPGRADES.values()}
    assert len(V9_UPGRADES) == 12 and len(fx) == len(set(fx)) and not old_fx & set(fx), 'varje effektbild används bara en gång'
    n = 0
    for cid, (kind, src, arg) in V9_ASH.items():
        save(ash_card(src, arg) if kind == 'ash' else meshy_card(kind, src, arg), cid)
        n += 1
    for cid, (kind, size, dy, ps) in V9_DRAWN.items():
        drawn_card(cid, kind, size, dy, ps)
        n += 1
    for cid, w in V9_PACTS.items():
        pact(cid, w)
        n += 1
    for cid, (w, src, tint, rot) in V9_UPGRADES.items():
        v9_upgrade(cid, w, src, tint, rot)
        n += 1
    near_dupes(list(V9_ASH) + list(V9_DRAWN) + list(V9_PACTS) + list(V9_UPGRADES))
    return n


def main():
    assert len(CARDS) == len(set(CARDS)) == 50, len(CARDS)
    srcs = list(V5.values()) + [s for _, s in V5_UPGRADES.values()]
    assert len(V5) == 30 and len(srcs) == len(set(srcs)), 'varje bild används bara en gång'
    assert not set(V5) & set(CARDS)
    if ONLY == 'v6':
        print(main_v6(), 'kortbilder ->', OUT)
        return
    if ONLY == 'v7':
        print(main_v7(), 'kortbilder ->', OUT)
        return
    if ONLY == 'v8':
        print(main_v8(), 'kortbilder ->', OUT)
        return
    if ONLY == 'v9':
        print(main_v9(), 'kortbilder ->', OUT)
        return
    n = 0
    if not ONLY_V5:
        for cid in CARDS:
            save(Image.open(os.path.join(RELICS, cid + '.webp')).convert('RGB'), cid)
            n += 1
    for cid, src in V5.items():
        save(flux(src), cid)
        n += 1
    for cid, w in V5_PACTS.items():
        pact(cid, w)
        n += 1
    for cid, (w, src) in V5_UPGRADES.items():
        upgrade(cid, w, src)
        n += 1
    if not ONLY_V5:
        n += main_v6()
        n += main_v7()
        n += main_v8()
        n += main_v9()
    print(n, 'kortbilder ->', OUT)


if __name__ == '__main__':
    main()
