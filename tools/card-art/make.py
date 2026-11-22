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

Version 11: 24 nya kort (svamp, sporer, speglar, illusioner och glas) – sporfärdighetsikonerna i meshy/icons, bossen
gamma_bloom och två dekaler ur assets/ashfall-ai/flux/decals (tabellen V11_SRC); resten ritas här med oanvända partiklar
(tabellen V11_DRAWN). Pakterna för sporkastaren, spegelskölden och piskan ritas som siluetter; uppgraderingarna är
oanvända effektbilder ur vfx (spormolnen, läkningen ...) eller partiklar med vapnet som bricka i hörnet (V11_UPGRADES).

Version 13: 24 nya kort (böcker, bläck, runor, ånga, smide och metall) – gjuteriets kort ur de sista oanvända bilderna i
assets/ashfall-ai som passar (medaljongerna furnace, heat_sink och molten_fists, två föremål, två färdighetsikoner och bossen
pyre_warden, tabellen V13_SRC); bibliotekets böcker, bläckhorn, penna, stämpel och lupp samt gjuteriets verktyg ritas här med
oanvända partiklar (V13_DRAWN). Pakterna för runboken och ångkanonen ritas som siluetter; uppgraderingarna är oanvända
effektbilder ur vfx eller partiklar med vapnet som bricka i hörnet (V13_UPGRADES).

Version 15: 24 nya kort (katedral, blod, ljus, klockor, bin, honung och vax) – bara medaljongen lifeblood och bossen
brood_warden i assets/ashfall-ai passar (tabellen V15_SRC); resten ritas här (fönster, klockor, kalk, gloria, ljus, honungskakor,
bin ...) med de sista oanvända partiklarna samt två nya källor: Kenneys splat-pack (blod- och honungsstänk) och smoke-particles
(rökelserök), tabellen V15_DRAWN. Pakterna för rökelsekaret och bikastaren ritas som siluetter; uppgraderingarna är oanvända
effektbilder ur vfx eller partiklar med vapnet som bricka i hörnet (V15_UPGRADES).

Kör från repo-roten: python3 retrofps/tools/card-art/make.py .          (alla)
                     python3 retrofps/tools/card-art/make.py . v5       (bara version 5)
                     python3 retrofps/tools/card-art/make.py . v6       (bara version 6)
                     python3 retrofps/tools/card-art/make.py . v7       (bara version 7)
                     python3 retrofps/tools/card-art/make.py . v8       (bara version 8)
                     python3 retrofps/tools/card-art/make.py . v9       (bara version 9)
                     python3 retrofps/tools/card-art/make.py . v11      (bara version 11)
                     python3 retrofps/tools/card-art/make.py . v13      (bara version 13)
                     python3 retrofps/tools/card-art/make.py . v15      (bara version 15)
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


# ---------- version 11: Svampriket och Spegelpalatset ----------
# Färdighetsikonerna i meshy/icons med svampar och sporer (sporsvampen som exploderar, kokongen av sporer, rankorna ur
# marken, gestalten som löses upp i rök), bossen gamma_bloom (en svampblomma full av glödande sporer) och två
# dekaler i assets/ashfall-ai/flux/decals (glasskärvor och glödande mycel, genomskinlig bakgrund) – tabellen V11_SRC.
# Resten ritas här (svampar, speglar, glas, portaler, masker, piskor ...) med oanvända partiklar ur Kenneys
# particle-pack på samma mörklila vinjett (tabellen V11_DRAWN). Pakternas vapen ritas som siluetter;
# uppgraderingarna är oanvända effektbilder ur vfx (spormolnen m.m.) eller partiklar med vapnet som bricka i hörnet.
DECALS = os.path.join(ASH, 'decals')
TIGHT_CROP = (150, 150, 874, 874)  # rankorna har en vit ram med stora rundade hörn
V11_SRC = {  # kort-id: (sort, bild, andel/beskärning) – som V8, plus 'decal' = flux/decals med genomskinlig bakgrund
    'flugsvampen': ('skill', 'skill_spore_burst', SKILL_CROP), 'sporkokongen': ('skill', 'skill_spore_cocoon', SKILL_CROP),
    'mycelgreppet': ('skill', 'skill_grasping_tendrils', TIGHT_CROP), 'maskbrytaren': ('skill', 'skill_smoke_cloak', SKILL_CROP),
    'urmycelet': ('ash', 'bosses/gamma_bloom', 0),
    'glassplittret': ('decal', 'crystal_shards', 0.86), 'mycelmattan': ('decal', 'lumen_growth', 0.84),
}
# kort-id: (ritfunktion, storlek, förskjutning y, [(partikel, storlek, dx, dy, färg, vridning)])
V11_DRAWN = {
    'svamphatten': ('mushroom', 0.84, 0, [('magic_04', 0.9, 0, -0.1, (140, 255, 170), 0)]),
    'studssvampen': ('bounce', 0.86, 0.02, [('circle_05', 0.8, 0, 0.16, (220, 120, 255), 0)]),
    'resestenen': ('runestone', 0.82, 0.02, [('circle_02', 0.9, 0, -0.04, (110, 200, 255), 0)]),
    'polerduken': ('handmirror', 0.84, 0, [('flare_01', 1.0, -0.12, -0.16, (230, 240, 255), 0)]),
    'klarsynsdroppen': ('dropper', 0.86, 0, [('star_03', 0.9, 0.1, 0.18, (170, 230, 255), 0)]),
    'svampkorgen': ('basket', 0.86, 0.04, [('star_05', 0.9, 0, -0.16, (255, 210, 140), 0)]),
    'myceltraden': ('fibrewhip', 0.84, 0, [('smoke_03', 0.9, 0.12, 0.12, (200, 230, 190), 0)]),
    'andningsduken': ('facecloth', 0.84, 0, [('smoke_06', 0.95, 0, 0.1, (150, 230, 120), 0)]),
    'irrblosset': ('lantern', 0.84, 0.02, [('fire_01', 0.7, 0, -0.04, (120, 255, 200), 0)]),
    'fjaderskivlingen': ('springshroom', 0.86, 0, [('smoke_02', 0.8, 0, 0.26, (120, 90, 170), 0)]),
    'skarvpansaret': ('shardarmor', 0.84, 0, [('star_07', 0.95, 0.16, -0.18, (220, 240, 255), 0)]),
    'portvaktarens_ring': ('portalring', 0.8, 0.02, [('circle_04', 0.95, 0, 0, (120, 160, 255), 0)]),
    'hyfkedjan': ('hyphachain', 0.86, 0, [('spark_03', 0.9, 0, 0, (170, 255, 160), 0)]),
    'kalejdoskopet': ('kaleidoscope', 0.86, 0, [('magic_05', 0.95, 0.2, -0.2, (255, 170, 240), 0)]),
    'tvillingporten': ('twinportal', 0.88, 0.02, [('circle_01', 0.95, 0, 0, (200, 170, 255), 0)]),
    'glaskroppen': ('glassbust', 0.84, 0.02, [('scorch_02', 0.9, 0, -0.04, (255, 90, 90), 0)]),
    'tusenspegeln': ('bigmirror', 0.88, 0, [('star_01', 1.0, 0, -0.06, (255, 230, 170), 0), ('trace_06', 0.9, -0.3, 0, (220, 230, 255), 0)]),
}
V11_PACTS = {'pakt_sporkastare': 'sporelauncher', 'pakt_spegelskold': 'mirrorshield', 'pakt_piska': 'whip'}
V11_UPGRADES = {  # kort-id: (vapen, 'vfx:<bild>' eller 'part:<partikel>', färgton eller None, vridning) – som V9
    'sporstormen': ('sporelauncher', 'vfx:spore_cloud_2', None, 0), 'lakesporerna': ('sporelauncher', 'vfx:heal_1', None, 0),
    'smittobararen': ('sporelauncher', 'vfx:spore_cloud_1', None, 0), 'snabbsadden': ('sporelauncher', 'vfx:spores_0', None, 0),
    'speglingen': ('mirrorshield', 'part:magic_03', (210, 230, 255), 0), 'skoldslaget': ('mirrorshield', 'vfx:dust_2', (230, 215, 190), 0),
    'skyddsringen': ('mirrorshield', 'vfx:magic_circle_green', (200, 225, 255), 0), 'pareringen': ('mirrorshield', 'part:star_06', (255, 220, 130), 0),
    'langsnarten': ('whip', 'vfx:smoke_1', (235, 200, 150), 0), 'eldsnarten': ('whip', 'vfx:flame_3', None, 0),
    'niosvansen': ('whip', 'vfx:scorch_1', None, 0), 'oxdraget': ('whip', 'vfx:smoke_3', (200, 220, 160), 0),
}

SILVER, DSILVER, GLASS, CAP = (196, 204, 220, 255), (120, 128, 146, 255), (170, 220, 240, 140), (176, 84, 60, 255)


def mushroom(d, cx, top, w, h, stem_w, stem_h, cap, stem=(230, 220, 196, 255), spots=None, gills=True):
    """Svamp: hatt (halv ellips med fransad kant), skivor under och en fot. top = hattens topp."""
    base = top + h
    rrect(d, (cx - stem_w / 2, base - 6, cx + stem_w / 2, base + stem_h), stem_w / 3, stem)
    d.line((cx - stem_w * 0.2, base + 6, cx - stem_w * 0.2, base + stem_h - 8), fill=lighter(stem, 1.08), width=4)
    if gills:
        d.ellipse((cx - w / 2 + 10, base - 18, cx + w / 2 - 10, base + 18), fill=(150, 120, 100, 255), outline=INK, width=5)
        for k in range(1, 12):
            x = cx - w / 2 + 14 + k * (w - 28) / 12
            d.line((cx, base + 10, x, base - 6), fill=(110, 84, 70, 255), width=2)
    d.chord((cx - w / 2, top, cx + w / 2, base + h), 180, 360, fill=cap, outline=INK, width=6)
    d.arc((cx - w / 2 + 18, top + 14, cx + w / 2 - 18, base + h - 10), 200, 250, fill=lighter(cap, 1.4), width=7)
    for sx, sy, r in spots or []:
        d.ellipse((cx + sx * w / 2 - r, top + sy * h - r, cx + sx * w / 2 + r, top + sy * h + r), fill=(250, 244, 230, 255), outline=INK, width=3)


def mirror_face(d, box, deep=0):
    """Spegelglas: blågrå yta med två ljusa reflexstreck och (deep) speglingar i speglingen."""
    x0, y0, x1, y1 = box
    d.ellipse(box, fill=(150, 176, 200, 255), outline=INK, width=5)
    for k in range(deep):
        t = (k + 1) * 0.09
        b = (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, x1 - (x1 - x0) * t, y1 - (y1 - y0) * t)
        d.ellipse(b, fill=(120 + k * 14, 146 + k * 16, 176 + k * 14, 255), outline=(220, 186, 96, 255), width=4)
    w = x1 - x0
    d.line((x0 + w * 0.22, y0 + w * 0.52, x0 + w * 0.5, y0 + w * 0.24), fill=(240, 248, 255, 255), width=max(4, int(w * 0.05)))
    d.line((x0 + w * 0.34, y0 + w * 0.62, x0 + w * 0.58, y0 + w * 0.38), fill=(240, 248, 255, 255), width=max(3, int(w * 0.025)))


def swirl(d, cx, cy, r, col, turns=2.6, w=8):
    pts = [(cx + r * t / (turns * 2 * np.pi) * np.cos(t), cy + r * t / (turns * 2 * np.pi) * np.sin(t)) for t in np.linspace(0.3, turns * 2 * np.pi, 90)]
    d.line(pts, fill=INK, width=w + 6, joint='curve')
    d.line(pts, fill=col, width=w, joint='curve')


def art11(kind):
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    if kind == 'mushroom':
        mushroom(d, 280, 170, 150, 70, 34, 120, (120, 76, 150, 255), gills=False, spots=[(-0.5, 0.5, 8), (0.3, 0.35, 7)])
        mushroom(d, 170, 60, 280, 130, 64, 190, (196, 120, 60, 255), spots=[(-0.55, 0.55, 14), (-0.1, 0.25, 12), (0.4, 0.45, 16), (0.7, 0.8, 9)])
        for x, y in ((110, 330), (250, 360), (320, 320)):
            d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=(170, 255, 190, 255))
    elif kind == 'bounce':
        mushroom(d, 200, 150, 360, 110, 70, 120, (190, 90, 220, 255), spots=[(-0.6, 0.6, 12), (0, 0.3, 14), (0.55, 0.55, 12)])
        for k, y in enumerate((150, 112, 74)):                                                          # fjädrande linjer under hatten
            d.arc((90 - k * 20, y - 40, 310 + k * 20, y + 30), 205, 335, fill=(240, 220, 255, 255), width=5 - k)
        poly(d, [(200, 0), (240, 50), (218, 50), (218, 86), (182, 86), (182, 50), (160, 50)], (255, 236, 160, 255))  # uppåtpil
    elif kind == 'runestone':
        poly(d, [(110, 390), (96, 150), (130, 60), (200, 24), (272, 60), (306, 160), (290, 390)], (110, 116, 124, 255), w=8)
        d.line([(120, 150), (136, 70), (200, 36)], fill=(160, 166, 176, 255), width=6)
        swirl(d, 200, 200, 90, (110, 210, 255, 255), 2.4, 9)
        for x, y in ((150, 320), (200, 340), (250, 320)):                                              # runor
            d.line((x, y - 22, x, y + 22), fill=(110, 210, 255, 255), width=6)
            d.line((x, y - 4, x + 14, y - 20), fill=(110, 210, 255, 255), width=5)
    elif kind == 'handmirror':
        d.line((206, 236, 330, 380), fill=INK, width=36)                                                 # skaft
        d.line((206, 236, 330, 380), fill=(200, 160, 70, 255), width=22)
        d.ellipse((308, 354, 350, 396), fill=(200, 160, 70, 255), outline=INK, width=5)
        d.ellipse((40, 20, 290, 270), fill=(206, 166, 76, 255), outline=INK, width=8)                   # ram
        for k in range(16):
            a = k * np.pi / 8
            d.ellipse((165 + 118 * np.cos(a) - 8, 145 + 118 * np.sin(a) - 8, 165 + 118 * np.cos(a) + 8, 145 + 118 * np.sin(a) + 8), fill=(240, 210, 120, 255), outline=INK, width=2)
        mirror_face(d, (66, 46, 264, 244))
        cloth = [(6, 300), (40, 262), (90, 270), (140, 248), (196, 262), (226, 300), (200, 330), (214, 372), (170, 396), (120, 380), (70, 396), (30, 370), (40, 334)]
        poly(d, cloth, (226, 214, 186, 255))                                                              # duken
        for pts in ([(40, 290), (90, 300), (150, 280), (200, 300)], [(50, 340), (100, 330), (150, 350), (190, 340)], [(110, 300), (120, 380)]):
            d.line(pts, fill=(180, 160, 130, 255), width=6, joint='curve')
        for x in range(50, 200, 22):                                                                      # fransar
            d.line((x, 384 + (x % 3) * 3, x - 4, 398), fill=(196, 180, 150, 255), width=3)
    elif kind == 'dropper':
        rrect(d, (170, 20, 230, 110), 24, (40, 40, 46, 255))                                            # gummiblåsa
        d.line((184, 36, 184, 96), fill=(90, 90, 100, 255), width=5)
        rrect(d, (164, 100, 236, 126), 6, (200, 160, 70, 255))                                          # hylsa
        poly(d, [(176, 124), (224, 124), (220, 270), (206, 320), (194, 320), (180, 270)], GLASS)        # glasrör
        d.polygon([(184, 200), (216, 200), (214, 268), (204, 310), (196, 310), (186, 268)], fill=(120, 220, 255, 255))
        d.line((186, 136, 186, 262), fill=(240, 250, 255, 255), width=4)
        poly(d, [(200, 330), (232, 372), (200, 398), (168, 372)], (120, 220, 255, 255))                 # droppen
        d.ellipse((184, 356, 216, 384), fill=(240, 250, 255, 255), outline=INK, width=3)                # ett öga i droppen
        d.ellipse((194, 364, 206, 376), fill=(30, 60, 90, 255))
    elif kind == 'basket':
        for x, cap, h in ((130, (196, 120, 60, 255), 140), (230, (190, 70, 50, 255), 120), (180, (150, 110, 170, 255), 170), (290, (210, 150, 80, 255), 150)):
            mushroom(d, x, 240 - h, 110, 50, 26, h - 40, cap, gills=False, spots=[(-0.4, 0.5, 6)])
        poly(d, [(40, 210), (360, 210), (330, 390), (70, 390)], (164, 112, 56, 255), w=8)                # korgen
        for y in range(236, 390, 26):
            d.line((52 + (y - 210) * 0.17, y, 348 - (y - 210) * 0.17, y), fill=(110, 70, 34, 255), width=6)
        for x in range(80, 330, 36):
            d.line((x, 214, x + (200 - x) * 0.12, 386), fill=(196, 146, 80, 255), width=6)
        d.arc((60, 70, 340, 380), 190, 350, fill=INK, width=22)                                         # handtag
        d.arc((60, 70, 340, 380), 192, 348, fill=(176, 122, 62, 255), width=12)
    elif kind == 'fibrewhip':
        fib = (226, 230, 214, 255)
        coil = [(190 + (40 + 112 * u) * np.cos(u * 3.2 * 2 * np.pi), 210 + (40 + 112 * u) * 0.72 * np.sin(u * 3.2 * 2 * np.pi)) for u in np.linspace(0, 1, 220)]
        d.line(coil, fill=INK, width=22, joint='curve')                                                 # hoprullad tråd
        d.line(coil, fill=fib, width=12, joint='curve')
        for k in range(0, len(coil) - 1, 6):                                                           # fibrer
            x, y = coil[k]
            d.line((x - 5, y - 7, x + 6, y + 6), fill=(160, 196, 140, 255), width=2)
        rrect(d, (300, 220, 340, 380), 10, (96, 62, 34, 255))                                           # handtag
        for y in (250, 280, 310, 340):
            d.line((302, y, 338, y + 10), fill=(60, 34, 20, 255), width=5)
        d.line([(320, 224), (330, 180), (334, 120)], fill=INK, width=20, joint='curve')
        d.line([(320, 224), (330, 180), (334, 120)], fill=fib, width=10, joint='curve')
    elif kind == 'facecloth':
        d.ellipse((60, 0, 340, 330), fill=(28, 22, 34, 255), outline=INK, width=6)                       # huvudets skugga
        for x in (150, 250):                                                                           # glödande ögon
            d.ellipse((x - 22, 120, x + 22, 146), fill=(150, 230, 120, 255), outline=INK, width=3)
        d.rectangle((60, 320, 340, 400), fill=(28, 22, 34, 255))
        poly(d, [(40, 170), (360, 170), (340, 300), (260, 370), (140, 370), (60, 300)], (120, 150, 96, 255), w=8)  # duken
        for y in (200, 240, 280):                                                                      # veck
            d.arc((70, y - 40, 330, y + 40), 20, 160, fill=(150, 180, 120, 255), width=6)
        for y in (180, 230):                                                                           # band
            d.line((40, y, 4, y - 30), fill=INK, width=16)
            d.line((40, y, 4, y - 30), fill=(90, 70, 50, 255), width=8)
            d.line((360, y, 396, y - 30), fill=INK, width=16)
            d.line((360, y, 396, y - 30), fill=(90, 70, 50, 255), width=8)
        for x, y in ((150, 300), (200, 320), (250, 300), (175, 260), (225, 260)):                       # sydda örter
            d.ellipse((x - 10, y - 10, x + 10, y + 10), fill=(200, 230, 120, 255), outline=INK, width=3)
    elif kind == 'lantern':
        d.arc((150, 0, 250, 90), 180, 360, fill=INK, width=16)                                         # bygel
        d.arc((150, 0, 250, 90), 180, 360, fill=DSILVER, width=8)
        rrect(d, (130, 44, 270, 80), 8, (70, 72, 82, 255))
        poly(d, [(140, 80), (260, 80), (280, 320), (120, 320)], (70, 140, 130, 120))                    # glaset
        for x0, x1 in ((140, 120), (200, 200), (260, 280)):
            d.line((x0, 80, x1, 320), fill=(70, 72, 82, 255), width=10)
        rrect(d, (104, 316, 296, 356), 8, (70, 72, 82, 255))
        poly(d, [(200, 130), (236, 210), (226, 280), (200, 296), (174, 280), (164, 210)], (140, 255, 210, 255), w=4)  # irrblosset
        d.ellipse((186, 220, 214, 270), fill=(236, 255, 246, 255))
        d.ellipse((182, 200, 194, 214), fill=INK)
        d.ellipse((206, 200, 218, 214), fill=INK)
    elif kind == 'springshroom':
        coil = [(200 + 60 * np.sin(t), 380 - t * 5.4 + 18 * np.cos(t)) for t in np.linspace(0, 6 * 2 * np.pi, 160)]
        d.line(coil, fill=INK, width=16, joint='curve')
        d.line(coil, fill=SILVER, width=8, joint='curve')
        mushroom(d, 200, 40, 300, 110, 44, 30, (110, 80, 190, 255), spots=[(-0.5, 0.5, 13), (0.1, 0.3, 11), (0.6, 0.7, 10)])
    elif kind == 'shardarmor':
        poly(d, [(80, 60), (160, 40), (200, 70), (240, 40), (320, 60), (350, 150), (320, 330), (200, 390), (80, 330), (50, 150)], (130, 150, 176, 255), w=8)
        shards = [[(90, 80), (160, 60), (190, 140), (110, 170)], [(240, 60), (310, 80), (290, 170), (210, 140)],
                  [(80, 190), (190, 160), (180, 270), (100, 300)], [(210, 160), (330, 190), (300, 300), (220, 270)],
                  [(120, 320), (190, 290), (280, 300), (200, 370)]]
        for k, sh in enumerate(shards):                                                                # spegelskärvor
            poly(d, sh, (170 + k * 10, 196 + k * 8, 226, 255), w=4)
            d.line((sh[0][0] + 12, sh[0][1] + 16, sh[1][0] - 14, sh[1][1] + 20), fill=(245, 250, 255, 255), width=4)
        rrect(d, (182, 50, 218, 380), 6, (200, 160, 70, 255), w=4)                                     # mittskena
    elif kind == 'portalring':
        d.ellipse((60, 140, 340, 380), fill=(0, 0, 0, 0), outline=INK, width=60)                       # ringen
        d.ellipse((66, 146, 334, 374), outline=SILVER, width=44)
        d.arc((76, 156, 324, 364), 200, 300, fill=(240, 244, 255, 255), width=8)
        poly(d, [(200, 10), (290, 70), (270, 170), (130, 170), (110, 70)], (60, 40, 120, 255), w=8)    # stenen
        swirl(d, 200, 92, 66, (150, 190, 255, 255), 2.2, 6)
        for x in (110, 290):
            d.ellipse((x - 16, 150, x + 16, 182), fill=(200, 160, 70, 255), outline=INK, width=4)
    elif kind == 'hyphachain':
        for k in range(5):
            cx, cy = 70 + k * 64, 100 + k * 56
            box = (cx - 60, cy - 36, cx + 60, cy + 36) if k % 2 == 0 else (cx - 36, cy - 60, cx + 36, cy + 60)
            d.ellipse(box, outline=INK, width=26)
            d.ellipse(box, outline=(170, 200, 150, 255), width=14)
            for a in np.linspace(0, 2 * np.pi, 14, endpoint=False):                                     # trådiga fibrer
                rx, ry = (box[2] - box[0]) / 2, (box[3] - box[1]) / 2
                d.line((cx + rx * np.cos(a), cy + ry * np.sin(a), cx + (rx + 12) * np.cos(a + 0.2), cy + (ry + 12) * np.sin(a + 0.2)), fill=(220, 240, 200, 255), width=3)
    elif kind == 'kaleidoscope':
        tube = [(20, 300), (250, 120), (290, 170), (60, 350)]
        poly(d, tube, (150, 60, 90, 255), w=8)
        for t in (0.25, 0.6):                                                                          # mässingsband
            a, b = (20 + 230 * t, 300 - 180 * t), (60 + 230 * t, 350 - 180 * t)
            d.line((a, b), fill=INK, width=18)
            d.line((a, b), fill=(200, 160, 70, 255), width=10)
        d.ellipse((220, 60, 380, 220), fill=(40, 30, 60, 255), outline=(200, 160, 70, 255), width=12)  # gluggen
        d.ellipse((220, 60, 380, 220), outline=INK, width=4)
        cols = [(255, 90, 90), (255, 200, 80), (110, 230, 120), (90, 170, 255), (200, 110, 255), (255, 140, 200)]
        for k in range(12):                                                                            # stjärnmönster av färgat glas
            a0, a1 = k * np.pi / 6, (k + 1) * np.pi / 6
            d.polygon([(300, 140), (300 + 64 * np.cos(a0), 140 + 64 * np.sin(a0)), (300 + 40 * np.cos((a0 + a1) / 2), 140 + 40 * np.sin((a0 + a1) / 2)), (300 + 64 * np.cos(a1), 140 + 64 * np.sin(a1))], fill=cols[k % 6] + (255,), outline=INK)
        d.ellipse((288, 128, 312, 152), fill=(250, 250, 255, 255))
    elif kind == 'twinportal':
        for cx, col in ((110, (110, 180, 255, 255)), (290, (255, 150, 80, 255))):
            rrect(d, (cx - 86, 60, cx + 86, 396), 80, (110, 112, 120, 255), w=8)                        # valv av sten
            rrect(d, (cx - 60, 86, cx + 60, 396), 60, (20, 16, 30, 255), w=4)
            swirl(d, cx, 230, 56, col, 2.3, 6)
            for y in (110, 200, 290):
                d.line((cx - 86, y, cx - 62, y + 6), fill=INK, width=4)
                d.line((cx + 86, y, cx + 62, y + 6), fill=INK, width=4)
        d.arc((110, 20, 290, 200), 200, 340, fill=(240, 230, 255, 255), width=6)                         # bågen mellan dem
        poly(d, [(282, 52), (300, 70), (276, 74)], (240, 230, 255, 255), w=3)
    elif kind == 'glassbust':
        facets = [  # en byst av glas i facetter: huvud, hals och axlar
            ([(200, 30), (262, 70), (240, 120), (200, 100)], 0), ([(200, 30), (138, 70), (160, 120), (200, 100)], 1),
            ([(138, 70), (126, 150), (160, 200), (160, 120)], 2), ([(262, 70), (274, 150), (240, 200), (240, 120)], 3),
            ([(160, 120), (200, 100), (240, 120), (240, 200), (200, 236), (160, 200)], 1),
            ([(176, 230), (224, 230), (230, 272), (170, 272)], 2),
            ([(170, 272), (230, 272), (240, 396), (160, 396)], 0), ([(170, 272), (160, 396), (40, 396), (60, 310)], 3),
            ([(230, 272), (240, 396), (360, 396), (340, 310)], 2),
        ]
        cols = [(214, 246, 255, 235), (176, 226, 248, 235), (140, 200, 236, 235), (236, 252, 255, 240)]
        for pts, c in facets:
            poly(d, pts, cols[c], w=5)
        for pts in ([(200, 40), (186, 96), (212, 150), (192, 222)], [(186, 96), (150, 110)], [(212, 150), (250, 168)],
                    [(200, 280), (176, 330), (200, 370), (190, 396)], [(176, 330), (100, 340)], [(200, 370), (290, 350)]):  # röda sprickor
            d.line(pts, fill=(255, 80, 70, 255), width=5)
        d.line((150, 76, 182, 52), fill=(255, 255, 255, 255), width=6)
        d.line((250, 300, 320, 330), fill=(255, 255, 255, 255), width=5)
    elif kind == 'bigmirror':
        poly(d, [(200, 0), (240, 30), (330, 40), (350, 120), (350, 330), (310, 396), (90, 396), (50, 330), (50, 120), (70, 40), (160, 30)], (206, 166, 76, 255), w=8)  # ram
        for x, y in ((200, 18), (64, 130), (336, 130), (64, 320), (336, 320), (200, 384)):
            d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=(150, 40, 60, 255), outline=INK, width=3)
        mirror_face(d, (84, 60, 316, 370), deep=4)
    return im


def draw_sporelauncher():
    """Sporkastaren: kolv, en glasbehållare full av gröna sporer och en vid pipa som slutar i en svamphatt."""
    im = Image.new('RGBA', (440, 440))
    d = ImageDraw.Draw(im)
    poly(d, [(6, 214), (110, 196), (150, 200), (150, 232), (104, 236), (16, 264)], (118, 72, 38, 255))    # kolv
    d.line((26, 216, 104, 202), fill=(168, 112, 62, 255), width=5)
    poly(d, [(170, 230), (200, 230), (190, 296), (160, 296)], (86, 54, 32, 255))                       # handtag
    rrect(d, (140, 196, 330, 236), 10, (96, 104, 90, 255))                                            # kropp
    d.line((150, 206, 322, 206), fill=(150, 160, 140, 255), width=5)
    d.ellipse((176, 104, 276, 204), fill=(90, 200, 80, 200), outline=INK, width=6)                     # sporbehållaren
    for x, y, r in ((206, 140, 12), (236, 166, 9), (220, 180, 7), (246, 132, 8), (198, 172, 6)):
        d.ellipse((x - r, y - r, x + r, y + r), fill=(200, 255, 140, 255))
    d.arc((186, 114, 266, 194), 200, 260, fill=(240, 255, 240, 255), width=5)
    rrect(d, (214, 92, 238, 108), 4, (70, 70, 78, 255))                                               # lock
    rrect(d, (326, 202, 380, 230), 6, (80, 86, 74, 255))                                              # pipa
    d.chord((360, 160, 436, 272), 270, 450, fill=(170, 90, 60, 255), outline=INK, width=6)             # svamphatt i mynningen
    for x, y in ((404, 186), (420, 226), (398, 248)):
        d.ellipse((x - 6, y - 6, x + 6, y + 6), fill=(250, 244, 230, 255))
    im = im.crop(im.getbbox())
    return im.rotate(18, resample=Image.BICUBIC, expand=True)


def draw_mirrorshield():
    """Spegelskölden: rund sköld med blankpolerad spegelyta, mässingskant med nitar och en reflex."""
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    d.ellipse((20, 20, 380, 380), fill=(196, 150, 64, 255), outline=INK, width=8)
    for k in range(12):
        a = k * np.pi / 6
        d.ellipse((200 + 164 * np.cos(a) - 9, 200 + 164 * np.sin(a) - 9, 200 + 164 * np.cos(a) + 9, 200 + 164 * np.sin(a) + 9), fill=(240, 210, 120, 255), outline=INK, width=3)
    d.ellipse((52, 52, 348, 348), fill=(160, 186, 212, 255), outline=INK, width=6)
    d.ellipse((90, 90, 310, 310), outline=(130, 156, 186, 255), width=6)
    d.line((96, 210, 210, 96), fill=(245, 250, 255, 255), width=18)                                  # reflexer
    d.line((130, 250, 250, 130), fill=(245, 250, 255, 255), width=8)
    d.ellipse((176, 176, 224, 224), fill=(196, 150, 64, 255), outline=INK, width=5)                    # buckla
    return im.rotate(-10, resample=Image.BICUBIC, expand=True)


def draw_whip():
    """Piskan: lindat läderhandtag och en tjock snärt som slingrar sig i luften och smalnar av mot en tofs."""
    im = Image.new('RGBA', (440, 440))
    d = ImageDraw.Draw(im)
    lash = [(266 + (150 - 104 * u) * np.cos(np.pi * (0.75 + 2.1 * u)), 196 + (150 - 104 * u) * np.sin(np.pi * (0.75 + 2.1 * u)))
            for u in np.linspace(0, 1, 140)]                                                         # snärten slingrar sig i en spiral
    widths = [int(30 - 22 * k / len(lash)) for k in range(len(lash))]
    for k in range(len(lash) - 1):                                                                    # kontur först
        d.line((lash[k], lash[k + 1]), fill=INK, width=widths[k] + 10)
    for k in range(len(lash) - 1):
        d.line((lash[k], lash[k + 1]), fill=(168, 104, 54, 255), width=widths[k])
    for k in range(4, len(lash) - 1, 7):                                                              # flätning
        x, y = lash[k]
        d.line((x - widths[k] * 0.3, y - widths[k] * 0.3, x + widths[k] * 0.3, y + widths[k] * 0.3), fill=(110, 64, 30, 255), width=3)
    ex, ey = lash[-1]
    for dx, dy in ((-22, -30), (6, -38), (26, -20)):                                                   # tofs
        d.line((ex, ey, ex + dx, ey + dy), fill=INK, width=10)
        d.line((ex, ey, ex + dx, ey + dy), fill=(230, 200, 150, 255), width=5)
    hd = [(24, 424), (136, 318)]
    d.line(hd, fill=INK, width=52)                                                                     # handtag
    d.line(hd, fill=(92, 56, 30, 255), width=38)
    for u in np.linspace(0.12, 0.88, 7):                                                               # lindning
        x, y = 24 + 112 * u, 424 - 106 * u
        d.line((x - 14, y - 16, x + 16, y + 14), fill=(50, 28, 16, 255), width=6)
    d.ellipse((4, 404, 48, 448), fill=(196, 150, 64, 255), outline=INK, width=6)                        # knopp
    return im.crop(im.getbbox())


GUNS.update({'sporelauncher': draw_sporelauncher, 'mirrorshield': draw_mirrorshield, 'whip': draw_whip})


def decal_card(src, fill):
    """Dekal med genomskinlig bakgrund (flux/decals), centrerad på den mörklila vinjetten."""
    im = Image.open(os.path.join(DECALS, src + '.webp')).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 16 else 0).getbbox() or (0, 0, im.width, im.height)
    im = im.crop(bb)
    k = S * 4 * fill / max(im.size)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    big = purple_bg()
    pos = ((S * 4 - im.width) // 2, (S * 4 - im.height) // 2)
    add_glow(big, im, pos, (0, 0, 0), 12)
    big.alpha_composite(im, pos)
    return big


def drawn_card11(cid, kind, size, dy, parts):
    big = purple_bg()
    for name, sc, px, py, tint, rot in parts:
        big = screen(big, particle(name, int(S * 4 * sc), tint, rot), S * 2 + px * S * 4, S * 2 + py * S * 4)
    g = art11(kind)
    g = shade(g.crop(g.getbbox()))
    k = S * 4 * size / max(g.size)
    g = g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))), Image.LANCZOS)
    pos = ((S * 4 - g.width) // 2, int((S * 4 - g.height) / 2 + dy * S * 4))
    add_glow(big, g, pos, (0, 0, 0), 12)
    big.alpha_composite(g, pos)
    save(big, cid)


def main_v11():
    old = {'ash:' + s for s, _ in V7.values()} | {k + ':' + s for k, s, _ in V8.values()} | {k + ':' + s for k, s, _ in V9_ASH.values()}
    srcs = [k + ':' + s for k, s, _ in V11_SRC.values()]
    assert len(srcs) == len(set(srcs)) and not old & set(srcs), 'varje bild används bara en gång'
    assert len(V11_SRC) + len(V11_DRAWN) == 24 and not set(V11_SRC) & set(V11_DRAWN)
    old_parts = {p[0] for _, _, _, ps in V9_DRAWN.values() for p in ps} | {s[5:] for _, s, _, _ in V9_UPGRADES.values() if s.startswith('part:')}
    parts = [p[0] for _, _, _, ps in V11_DRAWN.values() for p in ps] + [s[5:] for _, s, _, _ in V11_UPGRADES.values() if s.startswith('part:')]
    assert len(parts) == len(set(parts)) and not old_parts & set(parts), 'varje partikelbild används bara en gång'
    fx = [s[4:] for _, s, _, _ in V11_UPGRADES.values() if s.startswith('vfx:')]
    old_fx = ({s for _, s, _ in V6_UPGRADES.values()} | {n for ls in V6_ACTIVES.values() for n, *_ in ls} | {s for _, s, _ in V7_UPGRADES.values()}
              | {s for _, s, _ in V8_UPGRADES.values()} | {s[4:] for _, s, _, _ in V9_UPGRADES.values() if s.startswith('vfx:')})
    assert len(V11_UPGRADES) == 12 and len(fx) == len(set(fx)) and not old_fx & set(fx), 'varje effektbild används bara en gång'
    n = 0
    for cid, (kind, src, arg) in V11_SRC.items():
        save(ash_card(src, arg) if kind == 'ash' else decal_card(src, arg) if kind == 'decal' else meshy_card(kind, src, arg), cid)
        n += 1
    for cid, (kind, size, dy, ps) in V11_DRAWN.items():
        drawn_card11(cid, kind, size, dy, ps)
        n += 1
    for cid, w in V11_PACTS.items():
        pact(cid, w)
        n += 1
    for cid, (w, src, tint, rot) in V11_UPGRADES.items():
        v9_upgrade(cid, w, src, tint, rot)
        n += 1
    near_dupes(list(V11_SRC) + list(V11_DRAWN) + list(V11_PACTS) + list(V11_UPGRADES))
    return n


# ---------- version 13: Det förbjudna biblioteket och Gjuteriet ----------
# Gjuteriets kort tas ur de sista oanvända bilderna i assets/ashfall-ai som passar: medaljongerna furnace (smältugnen),
# heat_sink (ångande galler) och molten_fists (glödande näve), föremålen unique_governors_crucible (plåtharnesk med
# glödande kärna) och unique_ashen_heartwood (glödande hjärta), färdighetsikonerna skill_furnace_cleave (klinga i eldring)
# och skill_coolant_flush (ånga) samt bossen pyre_warden (en rustad koloss med brinnande hjälm) – tabellen V13_SRC.
# Biblioteket har inga färdiga bilder (lore_log och keycard ser moderna ut), så böckerna, bläckhornet, pennan, stämpeln,
# luppen och foliant ritas här, liksom gjuteriets verktyg (tång, städ, ventilratt, munstycke, rullband och spak), med
# oanvända partiklar ur Kenneys particle-pack på samma mörklila vinjett (tabellen V13_DRAWN). Pakternas vapen (runboken
# och ångkanonen) ritas som siluetter; uppgraderingarna är oanvända effektbilder ur vfx eller partiklar med vapnet som
# bricka i hörnet (V13_UPGRADES).
V13_SRC = {  # kort-id: (sort, bild, andel/beskärning) – som V11
    'nithandsken': ('ash', 'aspects/molten_fists', 0.92), 'anggallret': ('ash', 'aspects/heat_sink', 0.92),
    'angpannan': ('ash', 'aspects/furnace', 0.92), 'stalforkladet': ('ash', 'items/unique_governors_crucible', 0.86),
    'smalthjartat': ('ash', 'items/unique_ashen_heartwood', 0.86), 'kolossens_hjarta': ('ash', 'bosses/pyre_warden', 0),
    'assjans_klinga': ('skill', 'skill_furnace_cleave', SKILL_CROP), 'angvisslan': ('skill', 'skill_coolant_flush', SKILL_CROP),
}
# kort-id: (ritfunktion, storlek, förskjutning y, [(partikel, storlek, dx, dy, färg, vridning)])
V13_DRAWN = {
    'blackhornet': ('inkhorn', 0.84, 0.02, [('star_04', 0.9, -0.16, -0.18, (130, 150, 255), 0)]),
    'runpennan': ('runequill', 0.86, 0, [('trace_03', 0.9, 0.12, 0.06, (110, 200, 255), 60)]),
    'ventilnyckeln': ('valvewheel', 0.84, 0, [('smoke_01', 0.95, 0, -0.12, (200, 210, 225), 0)]),
    'kopparmunstycket': ('nozzle', 0.86, 0.02, [('muzzle_03', 0.8, 0.2, -0.04, (230, 236, 246), -90)]),
    'bokmarket': ('bookmark', 0.82, 0.02, [('window_01', 0.7, 0, -0.08, (255, 214, 140), 0)]),
    'smidestangen': ('tongs', 0.86, 0, [('spark_01', 0.95, 0.1, -0.1, (255, 170, 80), 0)]),
    'gjutarstovlarna': ('beltboot', 0.86, 0, [('trace_01', 0.9, 0, 0.3, (255, 180, 100), 90)]),
    'lasglaset': ('magnifier', 0.86, 0.02, [('star_02', 0.9, -0.12, -0.14, (255, 230, 170), 0)]),
    'runstampeln': ('stamp', 0.84, 0, [('scorch_01', 0.8, 0, 0.26, (140, 180, 255), 0)]),
    'kopistens_lupp': ('scrollloupe', 0.88, 0.02, [('flame_05', 0.16, -0.31, -0.4, (255, 200, 120), 0)]),
    'kilremmen': ('pulleys', 0.86, 0, [('trace_05', 0.95, 0, 0, (200, 205, 220), 90)]),
    'svartblacket': ('spilledink', 0.86, 0.04, [('scorch_03', 0.95, 0, 0.12, (160, 70, 210), 0)]),
    'eldskriften': ('flamebook', 0.84, 0.06, [('fire_02', 0.9, 0, -0.16, (255, 140, 60), 0)]),
    'jattens_stad': ('anvil', 0.86, 0.04, [('spark_02', 0.95, 0.04, -0.2, (255, 200, 100), 0)]),
    'gjutarspaken': ('lever', 0.84, 0, [('spark_07', 0.95, 0, -0.06, (255, 200, 120), 0)]),
    'forbjudna_folianten': ('tome', 0.86, 0.02, [('flame_01', 1.0, 0, -0.08, (160, 90, 255), 0), ('flame_03', 0.8, 0.2, 0.18, (120, 255, 180), 0)]),
}
V13_PACTS = {'pakt_runbok': 'runebook', 'pakt_angkanon': 'steamcannon'}
V13_UPGRADES = {  # kort-id: (vapen, 'vfx:<bild>' eller 'part:<partikel>', färgton eller None, vridning) – som V9
    'runklyvningen': ('runebook', 'vfx:magic_circle_red', (140, 190, 255), 0), 'sokarrunan': ('runebook', 'vfx:rune_trap_0', None, 0),
    'pappersstormen': ('runebook', 'part:dirt_03', (240, 232, 210), 0), 'blackstanket': ('runebook', 'part:dirt_01', (90, 110, 230), 0),
    'langroret': ('steamcannon', 'vfx:steam_1', None, 0), 'skallningen': ('steamcannon', 'vfx:bubbles_0', (255, 170, 120), 0),
    'tryckstoten': ('steamcannon', 'vfx:dust_1', (225, 230, 240), 0), 'overtrycket': ('steamcannon', 'part:muzzle_01', (220, 240, 255), -90),
}

LEATHER, PAGE, COPPER, IRON, GLOW, RUNE = (122, 40, 36, 255), (234, 220, 184, 255), (190, 104, 60, 255), (86, 90, 100, 255), (255, 150, 50, 255), (110, 200, 255, 255)


def closed_book(d, x0, y0, x1, y1, cover, depth=26):
    """Stängd bok sedd snett framifrån: sidblocket till höger/nedtill och pärmen över."""
    poly(d, [(x1, y0 + depth), (x1 + depth, y0), (x1 + depth, y1 - depth), (x1, y1)], PAGE)          # sidorna
    for k in range(1, 6):
        t = k / 6
        d.line((x1 + 3, y0 + depth + (y1 - y0 - depth) * t - 4 * t, x1 + depth - 3, y0 + (y1 - y0 - depth) * t + 2), fill=(190, 170, 130, 255), width=2)
    poly(d, [(x0, y0 + depth), (x0 + depth, y0), (x1 + depth, y0), (x1, y0 + depth)], lighter(cover, 0.8))  # ovankant
    rrect(d, (x0, y0 + depth, x1, y1), 6, cover)                                                     # pärmen
    d.line((x0 + 22, y0 + depth + 6, x0 + 22, y1 - 6), fill=lighter(cover, 0.7), width=8)            # rygglist
    for cy in (y0 + depth + 18, y1 - 18):                                                            # hörnbeslag
        for cx in (x0 + 14, x1 - 14):
            d.polygon([(cx - 12, cy), (cx, cy - 12), (cx + 12, cy), (cx, cy + 12)], fill=(220, 180, 90, 255), outline=INK)


def open_book(d, cx, top, w, h, cover, page=PAGE, lines=True):
    """Uppslagen bok: pärmen under, två sidor med böjd ovankant och en rygg i mitten."""
    poly(d, [(cx - w / 2 - 14, top + 30), (cx, top + 46), (cx + w / 2 + 14, top + 30), (cx + w / 2 + 14, top + h + 14), (cx, top + h + 34), (cx - w / 2 - 14, top + h + 14)], cover)
    for s in (-1, 1):
        edge = [(cx + s * w / 2 * t, top + 24 - 22 * np.sin(np.pi * t) + 20 * t) for t in np.linspace(0, 1, 24)]
        bottom = [(cx + s * w / 2 * t, top + h + 20 - 14 * np.sin(np.pi * t) + 4 * t) for t in np.linspace(1, 0, 24)]
        poly(d, edge + bottom, page, w=5)
        if lines:
            for k in range(1, 7):
                yy = top + 34 + k * (h - 40) / 7
                d.line((cx + s * 18, yy, cx + s * (w / 2 - 22), yy - 4), fill=(150, 130, 100, 255), width=3)
    d.line((cx, top + 20, cx, top + h + 26), fill=INK, width=5)


def quill(d, tip, tail, vane_col=(238, 232, 220, 255), w=46):
    """Fjäderpenna från spetsen (tip) till toppen (tail)."""
    (x0, y0), (x1, y1) = tip, tail
    L = np.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    nx, ny = -uy, ux
    left, right = [], []
    for t in np.linspace(0.2, 1, 20):
        ww = w * np.sin(np.pi * min(1, (t - 0.2) / 0.8)) ** 0.6 + 2
        bx, by = x0 + ux * L * t, y0 + uy * L * t
        left.append((bx + nx * ww - ux * ww * 0.3, by + ny * ww - uy * ww * 0.3))
        right.append((bx - nx * ww * 0.7 - ux * ww * 0.3, by - ny * ww * 0.7 - uy * ww * 0.3))
    poly(d, left + right[::-1], vane_col)
    for t in np.linspace(0.3, 0.92, 9):
        bx, by = x0 + ux * L * t, y0 + uy * L * t
        d.line((bx, by, bx + nx * w * 0.8 - ux * 22, by + ny * w * 0.8 - uy * 22), fill=lighter(vane_col, 0.78), width=3)
    d.line((x0, y0, x1, y1), fill=INK, width=12)
    d.line((x0, y0, x1, y1), fill=(250, 246, 236, 255), width=5)
    poly(d, [(x0, y0), (x0 + ux * 46 + nx * 9, y0 + uy * 46 + ny * 9), (x0 + ux * 46 - nx * 9, y0 + uy * 46 - ny * 9)], (40, 40, 60, 255), w=4)  # spets


def rune(d, x, y, s, col, kind=0, w=6):
    """En enkel runa (fyra varianter) med mitten i (x, y) och höjden 2s."""
    d.line((x, y - s, x, y + s), fill=col, width=w)
    if kind == 0:
        d.line((x, y - s * 0.3, x + s * 0.6, y - s), fill=col, width=w)
        d.line((x, y + s * 0.2, x + s * 0.6, y - s * 0.4), fill=col, width=w)
    elif kind == 1:
        d.line((x, y - s, x + s * 0.6, y - s * 0.4), fill=col, width=w)
        d.line((x + s * 0.6, y - s * 0.4, x, y + s * 0.2), fill=col, width=w)
    elif kind == 2:
        d.line((x - s * 0.6, y - s * 0.5, x + s * 0.6, y + s * 0.5), fill=col, width=w)
        d.line((x - s * 0.6, y + s * 0.5, x + s * 0.6, y - s * 0.5), fill=col, width=w)
    else:
        d.line((x, y, x + s * 0.6, y - s * 0.6), fill=col, width=w)
        d.line((x, y, x - s * 0.6, y - s * 0.6), fill=col, width=w)


def art13(kind):
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    if kind == 'inkhorn':
        horn = [(60, 360), (40, 300), (52, 220), (96, 150), (150, 110), (210, 96), (250, 120), (230, 160), (186, 186), (150, 230), (142, 300), (150, 360)]
        poly(d, horn, (214, 196, 160, 255), w=8)                                                     # bläckhornet (ett djurhorn)
        for k, y in enumerate((170, 230, 290)):
            d.arc((30 + k * 6, y - 30, 170 - k * 4, y + 30), 160, 340, fill=(150, 120, 80, 255), width=5)
        d.ellipse((196, 88, 262, 132), fill=(24, 30, 80, 255), outline=INK, width=5)                   # bläcket i öppningen
        d.ellipse((212, 98, 236, 110), fill=(90, 110, 220, 255))
        rrect(d, (30, 352, 190, 384), 10, (120, 84, 46, 255))                                         # fot
        quill(d, (230, 112), (370, 10), (226, 230, 246, 255), 40)
        for x, y, r in ((272, 200, 12), (300, 260, 9), (286, 320, 14)):                               # droppar
            d.ellipse((x - r, y - r, x + r, y + r), fill=(40, 50, 130, 255), outline=INK, width=3)
    elif kind == 'runequill':
        poly(d, [(20, 330), (380, 300), (390, 380), (30, 396)], PAGE)                                 # pergament
        for k, x in enumerate((70, 150, 230, 310)):                                                   # glödande runor
            rune(d, x, 352, 24, RUNE, k % 4, 7)
        quill(d, (300, 300), (110, 10), (200, 210, 236, 255), 52)
        d.ellipse((288, 288, 312, 312), fill=(200, 240, 255, 255), outline=INK, width=3)              # glöd i spetsen
    elif kind == 'valvewheel':
        rrect(d, (40, 300, 360, 352), 10, IRON)                                                       # rör
        for x in (60, 340):
            rrect(d, (x - 20, 286, x + 20, 366), 6, (110, 114, 126, 255))
        rrect(d, (184, 220, 216, 306), 6, (110, 114, 126, 255))                                       # ventilhals
        d.ellipse((60, 20, 340, 300), outline=INK, width=40)                                          # ratten
        d.ellipse((66, 26, 334, 294), outline=(190, 48, 40, 255), width=26)
        for k in range(5):
            a = k * 2 * np.pi / 5 - np.pi / 2
            d.line((200, 160, 200 + 124 * np.cos(a), 160 + 124 * np.sin(a)), fill=INK, width=26)
            d.line((200, 160, 200 + 124 * np.cos(a), 160 + 124 * np.sin(a)), fill=(170, 40, 34, 255), width=14)
        d.ellipse((168, 128, 232, 192), fill=(200, 160, 70, 255), outline=INK, width=6)
        d.line((20, 380, 210, 210), fill=INK, width=36)                                               # skiftnyckel
        d.line((20, 380, 210, 210), fill=STEEL, width=22)
        poly(d, [(190, 196), (238, 160), (266, 186), (240, 214), (256, 232), (226, 258)], STEEL)
    elif kind == 'nozzle':
        rrect(d, (10, 150, 130, 250), 8, IRON)                                                        # röret
        rrect(d, (120, 120, 160, 280), 6, (150, 150, 160, 255))                                       # fläns
        for y in (136, 176, 224, 264):
            d.ellipse((132, y - 8, 148, y + 8), fill=(220, 190, 110, 255), outline=INK, width=3)
        poly(d, [(160, 140), (300, 170), (360, 120), (380, 130), (380, 270), (360, 280), (300, 230), (160, 260)], COPPER, w=7)  # munstycket
        d.line((170, 156, 296, 182), fill=(236, 160, 110, 255), width=6)
        for x in (210, 260):                                                                          # band
            d.line((x, 140 + (x - 160) * 0.2, x, 260 - (x - 160) * 0.2), fill=(130, 64, 34, 255), width=8)
        rrect(d, (196, 84, 236, 140), 6, (110, 114, 126, 255))                                        # liten ventil
        d.line((176, 84, 256, 84), fill=INK, width=14)
        d.line((176, 84, 256, 84), fill=(190, 48, 40, 255), width=7)
    elif kind == 'bookmark':
        closed_book(d, 80, 30, 300, 340, (60, 70, 130, 255), 30)
        d.rectangle((150, 120, 240, 220), outline=(220, 180, 90, 255), width=6)                       # titelfält
        rune(d, 196, 170, 28, (230, 200, 110, 255), 3, 7)
        poly(d, [(250, 300), (282, 300), (282, 396), (266, 376), (250, 396)], (200, 30, 40, 255), w=5)  # bokmärket
    elif kind == 'tongs':
        for a, b, c in (((20, 380), (210, 190), (370, 120)), ((60, 396), (200, 210), (360, 160))):
            d.line((a, b, c), fill=INK, width=30, joint='curve')                                     # tångens skänklar
            d.line((a, b, c), fill=(70, 72, 82, 255), width=18, joint='curve')
        d.ellipse((186, 180, 226, 220), fill=(120, 124, 136, 255), outline=INK, width=5)               # nit
        rrect(d, (236, 112, 396, 160), 10, GLOW)                                                      # glödande järnstång i käftarna
        d.rectangle((248, 122, 386, 132), fill=(255, 230, 140, 255))
        d.line((246, 150, 386, 150), fill=(220, 90, 30, 255), width=6)
    elif kind == 'beltboot':
        rrect(d, (10, 300, 390, 370), 34, (60, 60, 66, 255))                                          # rullbandet
        for x in (50, 150, 250, 350):
            d.ellipse((x - 28, 307, x + 28, 363), fill=(110, 114, 126, 255), outline=INK, width=5)
            d.ellipse((x - 8, 327, x + 8, 343), fill=INK)
        for x in (90, 200, 310):                                                                      # pilar på bandet
            d.line((x - 20, 290, x, 300, x - 20, 310), fill=(255, 200, 60, 255), width=8)
        poly(d, [(110, 40), (230, 40), (240, 180), (330, 210), (350, 280), (90, 280), (96, 180)], (110, 74, 44, 255), w=8)  # kängan
        rrect(d, (84, 260, 356, 296), 8, IRON)                                                        # järnsula
        for y in (70, 110, 150):                                                                      # plåtar och nitar
            d.line((106, y, 236, y), fill=(80, 50, 30, 255), width=6)
        poly(d, [(240, 200), (330, 214), (346, 270), (240, 270)], (150, 154, 166, 255), w=5)          # tåhätta
        for x in (260, 300, 330):
            d.ellipse((x - 6, 236, x + 6, 248), fill=(220, 190, 110, 255), outline=INK, width=2)
    elif kind == 'magnifier':
        open_book(d, 200, 200, 340, 150, (110, 54, 40, 255))
        d.line((260, 220, 380, 390), fill=INK, width=34)                                              # skaft
        d.line((260, 220, 380, 390), fill=(110, 72, 40, 255), width=20)
        d.ellipse((60, 40, 290, 270), fill=(200, 230, 240, 110), outline=INK, width=10)                # linsen
        d.ellipse((70, 50, 280, 260), outline=(200, 160, 70, 255), width=12)
        for k, x in enumerate((120, 175, 230)):                                                       # förstorade bokstäver
            rune(d, x, 150, 34, (60, 40, 30, 255), k, 10)
        d.arc((90, 70, 240, 220), 200, 250, fill=(255, 255, 255, 255), width=8)
    elif kind == 'stamp':
        poly(d, [(20, 300), (380, 290), (370, 396), (30, 396)], PAGE)                                 # papperet
        rune(d, 120, 344, 32, (90, 150, 255, 255), 0, 9)                                              # avtryck
        d.ellipse((60, 300, 180, 390), outline=(90, 150, 255, 255), width=6)
        rrect(d, (196, 220, 360, 270), 8, (196, 150, 64, 255))                                        # stämpelns fot
        rrect(d, (206, 262, 350, 284), 4, (60, 40, 30, 255))
        rrect(d, (258, 130, 298, 226), 8, (150, 100, 56, 255))                                        # hals
        d.ellipse((228, 30, 328, 140), fill=(130, 72, 40, 255), outline=INK, width=7)                  # handtag
        d.arc((244, 44, 312, 112), 200, 260, fill=(200, 140, 90, 255), width=7)
    elif kind == 'scrollloupe':
        poly(d, [(30, 150), (370, 150), (370, 330), (30, 330)], PAGE)                                 # utrullad skriftrulle
        for x in (30, 370):
            rrect(d, (x - 24, 130, x + 24, 350), 20, (176, 150, 110, 255))
            rrect(d, (x - 10, 110, x + 10, 370), 6, (110, 72, 40, 255))
        for y in range(180, 320, 22):
            d.line((70, y, 330 - (y % 3) * 30, y), fill=(120, 100, 80, 255), width=4)
        d.line((290, 120, 380, 20), fill=(200, 160, 70, 255), width=5)                                # kedjan
        rrect(d, (40, 40, 76, 118), 6, (236, 226, 196, 255))                                          # ljuset
        rrect(d, (26, 110, 90, 128), 6, (200, 160, 70, 255))
        d.line((58, 40, 58, 26), fill=INK, width=4)
        d.ellipse((190, 150, 310, 270), fill=(210, 236, 245, 120), outline=INK, width=8)               # luppen
        d.ellipse((198, 158, 302, 262), outline=(200, 160, 70, 255), width=8)
        rune(d, 250, 210, 26, (60, 40, 30, 255), 1, 8)
    elif kind == 'pulleys':
        hull = []                                                                                     # kilremmen runt båda skivorna
        for cx, cy, r in ((90, 120, 86), (310, 290, 106)):
            hull += [(cx + r * np.cos(a), cy + r * np.sin(a)) for a in np.linspace(0, 2 * np.pi, 72, endpoint=False)]
        hull.sort()
        def half(pts):
            out = []
            for p in pts:
                while len(out) >= 2 and (out[-1][0] - out[-2][0]) * (p[1] - out[-2][1]) - (out[-1][1] - out[-2][1]) * (p[0] - out[-2][0]) <= 0:
                    out.pop()
                out.append(p)
            return out
        hull = half(hull)[:-1] + half(hull[::-1])[:-1]
        d.line(hull + hull[:1], fill=INK, width=30, joint='curve')
        d.line(hull + hull[:1], fill=(110, 74, 44, 255), width=16, joint='curve')
        for cx, cy, r in ((90, 120, 76), (310, 290, 96)):
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=IRON, outline=INK, width=7)               # remskivor
            d.ellipse((cx - r * 0.7, cy - r * 0.7, cx + r * 0.7, cy + r * 0.7), outline=(60, 62, 70, 255), width=8)
            for k in range(6):
                a = k * np.pi / 3
                d.line((cx, cy, cx + r * 0.66 * np.cos(a), cy + r * 0.66 * np.sin(a)), fill=(130, 134, 146, 255), width=8)
            d.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(200, 160, 70, 255), outline=INK, width=4)
        belt = (110, 74, 44, 255)
        for t in (0.35, 0.62):                                                                        # pilar: remmen går åt ett håll
            x, y = 90 + 220 * t + 60, 120 + 170 * t - 70
            d.line((x - 22, y - 4, x + 2, y + 8, x - 10, y + 32), fill=(255, 200, 60, 255), width=7)
    elif kind == 'spilledink':
        poly(d, [(20, 330), (120, 270), (260, 280), (380, 330), (300, 390), (60, 390)], (20, 16, 30, 255), w=6)  # bläckpölen
        skull = (140, 70, 190, 255)                                                                   # en dödskalle i pölen
        d.ellipse((140, 286, 250, 366), outline=skull, width=6)
        d.rectangle((168, 356, 222, 382), outline=skull, width=5)
        for x in (182, 196, 210):
            d.line((x, 360, x, 380), fill=skull, width=3)
        for x in (172, 218):
            d.ellipse((x - 16, 306, x + 16, 332), fill=skull)
        d.polygon([(195, 336), (186, 352), (204, 352)], fill=skull)
        poly(d, [(60, 150), (200, 80), (250, 170), (110, 240)], (40, 34, 56, 255), w=7)               # vält bläckflaska
        poly(d, [(200, 80), (240, 60), (270, 130), (250, 170)], (60, 50, 80, 255), w=6)
        rrect(d, (238, 44, 290, 84), 8, (196, 150, 64, 255))
        d.line((76, 160, 190, 100), fill=(120, 100, 160, 255), width=6)
        poly(d, [(110, 240), (130, 230), (140, 280), (120, 300)], (20, 16, 30, 255), w=4)
    elif kind == 'flamebook':
        open_book(d, 200, 220, 360, 150, (90, 30, 26, 255), lines=False)
        for k, (x, y) in enumerate(((120, 290), (170, 280), (240, 280), (290, 290))):                 # brinnande runor på sidorna
            rune(d, x, y, 22, (200, 70, 30, 255), k % 4, 7)
        for k, (x, y, s) in enumerate(((130, 160, 34), (200, 110, 42), (270, 160, 34), (170, 40, 26), (240, 50, 28))):  # runor som stiger
            rune(d, x, y, s, (255, 120 + k * 20, 40, 255), (k + 1) % 4, 10)
            rune(d, x, y, s, (255, 236, 160, 255), (k + 1) % 4, 4)
    elif kind == 'anvil':
        poly(d, [(20, 140), (300, 140), (390, 120), (340, 190), (290, 200), (250, 240), (270, 320), (330, 330), (330, 380), (60, 380), (60, 330), (120, 320), (140, 240), (90, 200)], IRON, w=8)  # städet
        d.line((30, 148, 300, 148), fill=(170, 176, 190, 255), width=8)
        rrect(d, (130, 60, 280, 110), 8, (70, 72, 82, 255))                                           # hammarhuvud
        d.line((200, 100, 330, 10), fill=INK, width=26)                                               # skaft
        d.line((200, 100, 330, 10), fill=WOOD, width=14)
        rrect(d, (60, 112, 170, 142), 6, GLOW)                                                        # glödande ämne
    elif kind == 'lever':
        rrect(d, (40, 300, 360, 380), 10, IRON)                                                       # bottenplatta
        for x in (70, 330):
            d.ellipse((x - 10, 330, x + 10, 350), fill=(220, 190, 110, 255), outline=INK, width=3)
        d.chord((120, 220, 280, 380), 180, 360, fill=(110, 114, 126, 255), outline=INK, width=6)       # navet
        d.line((200, 290, 300, 50), fill=INK, width=30)                                               # spaken
        d.line((200, 290, 300, 50), fill=STEEL, width=16)
        d.ellipse((268, 10, 336, 78), fill=(200, 40, 40, 255), outline=INK, width=6)                   # knopp
        d.ellipse((60, 140, 170, 250), fill=(236, 226, 200, 255), outline=INK, width=7)               # tryckmätare
        d.ellipse((64, 144, 166, 246), outline=(200, 160, 70, 255), width=6)
        d.line((115, 195, 150, 165), fill=(200, 30, 30, 255), width=6)
        for k in range(7):
            a = np.pi * (0.8 + 1.4 * k / 6)
            d.line((115 + 36 * np.cos(a), 195 + 36 * np.sin(a), 115 + 44 * np.cos(a), 195 + 44 * np.sin(a)), fill=INK, width=3)
        rrect(d, (108, 246, 122, 300), 4, (110, 114, 126, 255))
    elif kind == 'tome':
        closed_book(d, 40, 20, 330, 380, (70, 20, 60, 255), 34)
        for a, b in (((40, 120), (330, 330)), ((40, 330), (330, 120))):                               # kedjor i kors
            for t in np.linspace(0, 1, 9):
                x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                d.ellipse((x - 18, y - 12, x + 18, y + 12), outline=INK, width=10)
                d.ellipse((x - 18, y - 12, x + 18, y + 12), outline=(150, 154, 166, 255), width=5)
        d.ellipse((130, 170, 240, 280), fill=(230, 220, 200, 255), outline=INK, width=7)               # ögat
        d.ellipse((160, 196, 210, 254), fill=(150, 70, 230, 255), outline=INK, width=4)
        d.ellipse((176, 212, 194, 238), fill=INK)
        rrect(d, (160, 296, 210, 350), 8, (200, 160, 70, 255))                                        # hänglås
        d.arc((166, 270, 204, 312), 180, 360, fill=INK, width=8)
    return im


def draw_runebook():
    """Runboken: uppslagen läderbok med glödande runor, mässingshörn och ett bokmärke."""
    im = Image.new('RGBA', (420, 420))
    d = ImageDraw.Draw(im)
    open_book(d, 210, 90, 360, 220, LEATHER, lines=False)
    for k, (x, y) in enumerate(((100, 170), (150, 200), (100, 240), (270, 160), (320, 200), (270, 250))):
        rune(d, x, y, 22, RUNE, k % 4, 8)
    for x, y in ((24, 130), (396, 130), (24, 312), (396, 312)):
        d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=(220, 180, 90, 255), outline=INK, width=4)
    poly(d, [(204, 330), (220, 330), (230, 410), (212, 396), (196, 410)], (200, 30, 40, 255), w=5)
    for x, y in ((150, 60), (210, 30), (270, 64)):                                                     # runor som lyfter
        rune(d, x, y, 18, (170, 230, 255, 255), 2, 6)
    return im.rotate(-8, resample=Image.BICUBIC, expand=True)


def draw_steamcannon():
    """Ångkanonen: mässingspanna med tryckmätare, trähandtag och en lång kopparpipa som vidgas till en tratt."""
    im = Image.new('RGBA', (460, 300))
    d = ImageDraw.Draw(im)
    poly(d, [(6, 150), (100, 136), (130, 140), (130, 176), (96, 180), (14, 206)], (118, 72, 38, 255))   # kolv
    poly(d, [(150, 176), (184, 176), (174, 250), (140, 250)], (86, 54, 32, 255))                        # handtag
    rrect(d, (120, 70, 300, 170), 46, (196, 150, 64, 255))                                             # pannan
    for x in (160, 220, 270):
        d.line((x, 74, x, 166), fill=(140, 100, 40, 255), width=6)
    d.line((140, 92, 290, 92), fill=(236, 204, 120, 255), width=6)
    d.ellipse((176, 10, 236, 70), fill=(236, 226, 200, 255), outline=INK, width=6)                      # tryckmätare
    d.line((206, 40, 222, 22), fill=(200, 30, 30, 255), width=5)
    rrect(d, (198, 64, 214, 80), 3, (110, 114, 126, 255))
    rrect(d, (290, 120, 400, 152), 8, COPPER)                                                          # pipa
    poly(d, [(396, 116), (452, 90), (456, 186), (396, 158)], (210, 120, 70, 255))                       # tratt
    d.line((300, 126, 396, 126), fill=(236, 160, 110, 255), width=5)
    d.line((130, 176, 300, 160), fill=INK, width=14)                                                   # rör under
    d.line((130, 176, 300, 160), fill=(110, 114, 126, 255), width=7)
    d.ellipse((270, 40, 300, 70), outline=INK, width=8)                                               # ventilratt
    d.ellipse((272, 42, 298, 68), outline=(190, 48, 40, 255), width=4)
    rrect(d, (280, 66, 290, 80), 2, (110, 114, 126, 255))
    return im.crop(im.getbbox()).rotate(8, resample=Image.BICUBIC, expand=True)


GUNS.update({'runebook': draw_runebook, 'steamcannon': draw_steamcannon})


def drawn_card13(cid, kind, size, dy, parts):
    big = purple_bg()
    for name, sc, px, py, tint, rot in parts:
        big = screen(big, particle(name, int(S * 4 * sc), tint, rot), S * 2 + px * S * 4, S * 2 + py * S * 4)
    g = art13(kind)
    g = shade(g.crop(g.getbbox()))
    k = S * 4 * size / max(g.size)
    g = g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))), Image.LANCZOS)
    pos = ((S * 4 - g.width) // 2, int((S * 4 - g.height) / 2 + dy * S * 4))
    add_glow(big, g, pos, (0, 0, 0), 12)
    big.alpha_composite(g, pos)
    save(big, cid)


def main_v13():
    old = ({'ash:' + s for s, _ in V7.values()} | {k + ':' + s for k, s, _ in V8.values()} | {k + ':' + s for k, s, _ in V9_ASH.values()}
           | {k + ':' + s for k, s, _ in V11_SRC.values()})
    srcs = [k + ':' + s for k, s, _ in V13_SRC.values()]
    assert len(srcs) == len(set(srcs)) and not old & set(srcs), 'varje bild används bara en gång'
    assert len(V13_SRC) + len(V13_DRAWN) == 24 and not set(V13_SRC) & set(V13_DRAWN)
    old_parts = ({p[0] for t in (V9_DRAWN, V11_DRAWN) for _, _, _, ps in t.values() for p in ps}
                 | {s[5:] for t in (V9_UPGRADES, V11_UPGRADES) for _, s, _, _ in t.values() if s.startswith('part:')})
    parts = [p[0] for _, _, _, ps in V13_DRAWN.values() for p in ps] + [s[5:] for _, s, _, _ in V13_UPGRADES.values() if s.startswith('part:')]
    assert len(parts) == len(set(parts)) and not old_parts & set(parts), 'varje partikelbild används bara en gång'
    fx = [s[4:] for _, s, _, _ in V13_UPGRADES.values() if s.startswith('vfx:')]
    old_fx = ({s for _, s, _ in V6_UPGRADES.values()} | {n for ls in V6_ACTIVES.values() for n, *_ in ls} | {s for _, s, _ in V7_UPGRADES.values()}
              | {s for _, s, _ in V8_UPGRADES.values()} | {s[4:] for t in (V9_UPGRADES, V11_UPGRADES) for _, s, _, _ in t.values() if s.startswith('vfx:')})
    assert len(V13_UPGRADES) == 8 and len(fx) == len(set(fx)) and not old_fx & set(fx), 'varje effektbild används bara en gång'
    n = 0
    for cid, (kind, src, arg) in V13_SRC.items():
        save(ash_card(src, arg) if kind == 'ash' else decal_card(src, arg) if kind == 'decal' else meshy_card(kind, src, arg), cid)
        n += 1
    for cid, (kind, size, dy, ps) in V13_DRAWN.items():
        drawn_card13(cid, kind, size, dy, ps)
        n += 1
    for cid, w in V13_PACTS.items():
        pact(cid, w)
        n += 1
    for cid, (w, src, tint, rot) in V13_UPGRADES.items():
        v9_upgrade(cid, w, src, tint, rot)
        n += 1
    near_dupes(list(V13_SRC) + list(V13_DRAWN) + list(V13_PACTS) + list(V13_UPGRADES))
    return n


# ---------- version 15: Blodkatedralen och Bikupan ----------
# Bara två oanvända bilder i assets/ashfall-ai passar: medaljongen lifeblood (ett blodrött hjärta) och bossen brood_warden
# (en koloss full av äggsäckar) – tabellen V15_SRC. Resten ritas här (blyinfattade fönster, klockor, kalk, glorian, vaxljus,
# honungskakor, bin, larver ...) på samma mörklila vinjett. Bakom motiven ligger de sista oanvända partiklarna ur Kenneys
# particle-pack och två nya källor som inga kort använt: Kenneys splat-pack (blod, honung och vax som stänk) och
# smoke-particles (rökelserök och ljusblixtar) – tabellen V15_DRAWN. Varje källbild används bara en gång. Pakternas vapen
# (rökelsekaret och bikastaren) ritas som siluetter; uppgraderingarna är oanvända effektbilder ur vfx eller partiklar med
# vapnet som bricka i hörnet (V15_UPGRADES).
SPLATS = os.path.join(ROOT, 'assets/effects/splat-pack/PNG/Default (256px)')
SMOKES = os.path.join(ROOT, 'assets/effects/smoke-particles/PNG')
V15_SRC = {  # kort-id: (sort, bild, andel/beskärning) – som V13
    'blodsdopet': ('ash', 'aspects/lifeblood', 0.92), 'yngelvaktaren': ('ash', 'bosses/brood_warden', 0),
}
# kort-id: (ritfunktion, storlek, förskjutning y, [(källa, storlek, dx, dy, färg, vridning)])
# källa: 'part:<partikel>' (läggs med "screen"), 'splat:<stänk>' (täckande stänk) eller 'smoke:<mapp>/<bild>' (halvgenomskinlig rök)
V15_DRAWN = {
    'glasmalningen': ('lancet', 0.84, 0, [('part:muzzle_05', 0.95, 0, 0.12, (255, 210, 150), 180)]),
    'vaxsulorna': ('waxboots', 0.8, -0.04, [('splat:splat05', 0.9, 0, 0.26, (226, 150, 34), 0)]),
    'larvkroken': ('larvahook', 0.84, 0, [('part:slash_02', 0.85, 0, 0.1, (170, 230, 120), 0)]),
    'rokelsekornen': ('incensebowl', 0.78, 0.1, [('smoke:White puff/whitePuff03', 0.8, 0, -0.18, (220, 210, 236), 0)]),
    'bigadden': ('stinger', 0.86, 0, [('part:trace_04', 0.95, 0, 0, (255, 210, 90), 50)]),
    'klockrepet': ('bellrope', 0.86, 0, [('part:slash_03', 0.85, 0.12, 0, (255, 220, 140), 0)]),
    'offerskalen': ('bloodbowl', 0.84, 0.06, [('splat:splat19', 0.95, 0, 0.1, (130, 10, 20), 0)]),
    'helgonglorian': ('halo', 0.84, 0, [('part:muzzle_04', 0.95, 0, 0.05, (255, 236, 170), 180)]),
    'vaxljuset': ('candle', 0.84, 0.04, [('part:flame_06', 0.32, 0, -0.36, (255, 200, 90), 0)]),
    'honungskakan': ('honeycomb', 0.84, 0, [('splat:splat26', 0.95, 0, 0.12, (210, 130, 20), 0)]),
    'kyrkklockan': ('bigbell', 0.84, 0, [('smoke:Flash/flash02', 0.95, 0, 0, (255, 220, 150), 0)]),
    'blodkalken': ('chalice', 0.84, 0, [('splat:splat28', 0.95, 0, 0.14, (120, 8, 18), 0)]),
    'biodlarhandskarna': ('beegloves', 0.84, 0, [('splat:splat13', 0.85, 0, 0.2, (200, 130, 30), 0)]),
    'larvsaxen': ('shears', 0.86, 0, [('splat:splat02', 0.9, 0.02, 0.18, (90, 170, 50), 0)]),
    'myrran': ('myrrhjar', 0.8, 0.08, [('smoke:White puff/whitePuff11', 0.8, 0, -0.2, (236, 214, 190), 0)]),
    'rosettfonstret': ('rosewindow', 0.86, 0, [('part:window_02', 0.7, 0, 0, (255, 180, 200), 45)]),
    'sota_fallan': ('honeyjar', 0.84, 0, [('splat:splat33', 0.95, 0, 0.16, (236, 160, 30), 0)]),
    'klockarens_hammare': ('bellhammer', 0.86, 0, [('part:flame_02', 0.9, 0.06, -0.04, (255, 190, 110), 0)]),
    'helgonreliken': ('reliquary', 0.84, 0.02, [('part:window_03', 0.95, 0, -0.04, (255, 230, 150), 90)]),
    'rokelsemolnet': ('censercloud', 0.84, 0.04, [('smoke:White puff/whitePuff19', 0.95, 0, 0, (210, 196, 230), 0),
                                                   ('smoke:Black smoke/blackSmoke07', 0.6, -0.2, 0.24, (120, 100, 140), 0)]),
    'kardinalens_ring': ('cardinalring', 0.84, 0, [('part:symbol_01', 0.55, 0, -0.06, (200, 30, 50), 0), ('splat:splat21', 0.9, 0, 0.2, (100, 6, 16), 0)]),
    'drottningens_krona': ('beecrown', 0.86, 0, [('part:flame_04', 0.95, 0, -0.06, (255, 190, 60), 0), ('splat:splat17', 0.8, 0, 0.3, (220, 140, 24), 0)]),
}
V15_PACTS = {'pakt_rokelsekar': 'censer', 'pakt_bikastare': 'hivelauncher'}
V15_UPGRADES = {  # kort-id: (vapen, 'vfx:<bild>' eller 'part:<partikel>', färgton eller None, vridning) – som V9
    'langkedjan': ('censer', 'vfx:smoke_0', (230, 214, 190), 0), 'vigda_roken': ('censer', 'vfx:heal_0', None, 0),
    'skarselden': ('censer', 'vfx:embers_0', None, 0), 'snabbsvingen': ('censer', 'part:slash_01', (255, 220, 150), 0),
    'svarmtiden': ('hivelauncher', 'part:window_04', (255, 196, 60), 0), 'giftgadden': ('hivelauncher', 'vfx:bubbles_1', None, 0),
    'drottninggelen': ('hivelauncher', 'part:symbol_02', (255, 214, 90), 0), 'flyghalet': ('hivelauncher', 'part:trace_07', (255, 200, 90), 90),
}

GOLD, WAX, HONEY, BLOOD, STONE, BEE = (220, 180, 90, 255), (240, 228, 190, 255), (236, 160, 40, 255), (150, 16, 26, 255), (112, 106, 116, 255), (244, 192, 40, 255)
PANES = [(200, 40, 50, 255), (40, 90, 200, 255), (240, 190, 50, 255), (60, 160, 80, 255), (150, 60, 190, 255)]


def bee(d, x, y, s=1.0, flip=False):
    """Ett litet bi: gul kropp med svarta ränder, genomskinliga vingar, huvud och gadd."""
    f = -1 if flip else 1
    for wx, wy in ((-6, -30), (10, -26)):
        d.ellipse((x + f * wx * s - 16 * s, y + wy * s - 12 * s, x + f * wx * s + 16 * s, y + wy * s + 12 * s), fill=(226, 240, 255, 210), outline=INK, width=max(2, int(3 * s)))
    d.ellipse((x - 30 * s, y - 18 * s, x + 30 * s, y + 18 * s), fill=BEE, outline=INK, width=max(2, int(4 * s)))
    for dx in (-10, 6):
        d.line((x + f * dx * s, y - 16 * s, x + f * dx * s, y + 16 * s), fill=INK, width=max(2, int(8 * s)))
    d.ellipse((x + f * 30 * s - 12 * s, y - 12 * s, x + f * 30 * s + 12 * s, y + 12 * s), fill=INK)
    d.polygon([(x - f * 26 * s, y - 6 * s), (x - f * 46 * s, y), (x - f * 26 * s, y + 6 * s)], fill=INK)


def hexcell(d, cx, cy, r, fill, w=5):
    poly(d, [(cx + r * np.cos(np.pi / 6 + k * np.pi / 3), cy + r * np.sin(np.pi / 6 + k * np.pi / 3)) for k in range(6)], fill, w)


def bell(d, cx, top, w, h, col, clapper=True):
    """Kyrkklocka: krona, kropp som vidgar sig mot en tjock kant, och kläppen under."""
    left = [(cx - w * (0.26 + 0.24 * t ** 2.4), top + h * t) for t in np.linspace(0, 1, 30)]
    right = [(cx + w * (0.26 + 0.24 * t ** 2.4), top + h * t) for t in np.linspace(1, 0, 30)]
    if clapper:
        d.line((cx, top + h * 0.6, cx, top + h + 26), fill=INK, width=12)
        d.ellipse((cx - 20, top + h + 6, cx + 20, top + h + 46), fill=lighter(col, 0.7), outline=INK, width=5)
    rrect(d, (cx - w * 0.1, top - h * 0.2, cx + w * 0.1, top + 6), 6, lighter(col, 0.8))           # krona
    d.chord((cx - w * 0.26, top - h * 0.12, cx + w * 0.26, top + h * 0.12), 180, 360, fill=col, outline=INK, width=6)
    poly(d, left + right, col)
    d.ellipse((cx - w * 0.52, top + h - 16, cx + w * 0.52, top + h + 16), fill=lighter(col, 0.85), outline=INK, width=6)  # kanten
    for t in (0.35, 0.75):                                                                           # band
        hw = w * (0.26 + 0.24 * t ** 2.4)
        d.line((cx - hw + 6, top + h * t, cx + hw - 6, top + h * t), fill=lighter(col, 0.7), width=6)
    d.line((cx - w * 0.16, top + 10, cx - w * 0.3, top + h * 0.85), fill=lighter(col, 1.3), width=8)  # glans


def candle(d, x, top, w, h, col=WAX, drips=3):
    rrect(d, (x - w / 2, top, x + w / 2, top + h), 6, col)
    for k in range(drips):                                                                           # vaxdroppar
        dx = x - w / 2 + 8 + k * (w - 16) / max(1, drips - 1)
        L = 26 + 22 * ((k * 7) % 3)
        d.line((dx, top + 4, dx, top + L), fill=INK, width=14)
        d.line((dx, top + 4, dx, top + L), fill=lighter(col, 1.05), width=8)
    d.ellipse((x - w / 2, top - 10, x + w / 2, top + 10), fill=lighter(col, 1.08), outline=INK, width=5)
    d.line((x, top - 2, x, top - 22), fill=INK, width=5)                                             # veke


def chalice(d, cx, top, w, h, col, liquid):
    cup = [(cx - w / 2, top), (cx + w / 2, top), (cx + w * 0.36, top + h * 0.38), (cx + w * 0.12, top + h * 0.5), (cx - w * 0.12, top + h * 0.5), (cx - w * 0.36, top + h * 0.38)]
    poly(d, cup, col)
    d.ellipse((cx - w / 2, top - 18, cx + w / 2, top + 18), fill=liquid, outline=INK, width=6)          # vätskan
    d.ellipse((cx - w * 0.3, top - 8, cx - w * 0.05, top + 4), fill=lighter(liquid, 1.6))
    rrect(d, (cx - 14, top + h * 0.5, cx + 14, top + h * 0.82), 6, col)                             # fot
    d.ellipse((cx - 26, top + h * 0.6, cx + 26, top + h * 0.7), fill=lighter(col, 0.85), outline=INK, width=5)  # nod
    poly(d, [(cx - 14, top + h * 0.82), (cx + 14, top + h * 0.82), (cx + w * 0.4, top + h), (cx - w * 0.4, top + h)], lighter(col, 0.9))
    d.line((cx - w * 0.36, top + 24, cx - w * 0.18, top + h * 0.42), fill=lighter(col, 1.3), width=7)


def smoke_curl(d, pts, col, w=16):
    """En slingrande rökslinga (ljus, utan kontur)."""
    for k in range(len(pts) - 1):
        d.line((pts[k], pts[k + 1]), fill=col, width=max(3, int(w * (1 - k / len(pts)))))


def censer_pot(d, cx, cy, r, col=GOLD, ember=(255, 150, 50, 255)):
    """Rökelsekar: rund skål med genombruten kupol, kors överst och fyra kedjor upp till en ring."""
    for ox in (-0.8, -0.3, 0.3, 0.8):
        d.line((cx + ox * r, cy - r * 0.2, cx, cy - r * 2.4), fill=INK, width=8)
        d.line((cx + ox * r, cy - r * 0.2, cx, cy - r * 2.4), fill=(200, 200, 210, 255), width=3)
    d.ellipse((cx - 16, cy - r * 2.4 - 26, cx + 16, cy - r * 2.4 + 6), outline=INK, width=10)
    d.ellipse((cx - 16, cy - r * 2.4 - 26, cx + 16, cy - r * 2.4 + 6), outline=GOLD, width=4)
    d.chord((cx - r, cy - r, cx + r, cy + r), 0, 180, fill=col, outline=INK, width=7)                    # skålen
    d.chord((cx - r * 0.92, cy - r * 0.9, cx + r * 0.92, cy + r * 0.9), 180, 360, fill=lighter(col, 0.8), outline=INK, width=7)  # kupolen
    for k in range(5):                                                                               # hål med glöd
        a = np.pi * (1.15 + 0.7 * k / 4)
        x, y = cx + r * 0.55 * np.cos(a), cy + r * 0.5 * np.sin(a)
        d.ellipse((x - 8, y - 8, x + 8, y + 8), fill=ember, outline=INK, width=2)
    d.line((cx - r, cy, cx + r, cy), fill=INK, width=8)
    d.line((cx - r + 6, cy, cx + r - 6, cy), fill=lighter(col, 1.2), width=4)
    rrect(d, (cx - r * 0.3, cy + r * 0.9, cx + r * 0.3, cy + r * 1.15), 4, lighter(col, 0.8))        # fot
    d.line((cx, cy - r * 0.9, cx, cy - r * 1.3), fill=INK, width=10)                                 # kors
    d.line((cx - 12, cy - r * 1.15, cx + 12, cy - r * 1.15), fill=INK, width=10)
    d.line((cx, cy - r * 0.92, cx, cy - r * 1.28), fill=GOLD, width=4)
    d.line((cx - 10, cy - r * 1.15, cx + 10, cy - r * 1.15), fill=GOLD, width=4)


def skep(d, cx, bottom, w, h, col=(206, 160, 80, 255)):
    """Halmkupa (bikupa av flätad halm): staplade valkar som smalnar av uppåt, med ett flyghål nedtill."""
    rows = 6
    for k in range(rows):
        t0, t1 = k / rows, (k + 1) / rows
        hw0 = w / 2 * np.sqrt(max(0.05, 1 - t0 ** 1.6)) if k else w / 2
        hw1 = w / 2 * np.sqrt(max(0.05, 1 - t1 ** 1.6))
        y0, y1 = bottom - h * t0, bottom - h * t1
        d.rounded_rectangle((cx - max(hw0, hw1), y1 - 4, cx + max(hw0, hw1), y0 + 4), int(min(22, (y0 - y1) / 2)), fill=col if k % 2 else lighter(col, 0.88), outline=INK, width=5)
        for x in np.linspace(cx - max(hw0, hw1) + 16, cx + max(hw0, hw1) - 16, 5):
            d.line((x - 6, y1 + 6, x + 6, y0 - 6), fill=lighter(col, 0.7), width=3)
    d.chord((cx - w * 0.12, bottom - h * 0.16, cx + w * 0.12, bottom + h * 0.08), 180, 360, fill=INK)  # flyghål


def art15(kind):
    im = Image.new('RGBA', (400, 400))
    d = ImageDraw.Draw(im)
    if kind == 'lancet':
        outer = [(80, 390), (80, 150), (110, 70), (200, 10), (290, 70), (320, 150), (320, 390)]
        inner = [(110, 370), (110, 160), (134, 96), (200, 44), (266, 96), (290, 160), (290, 370)]
        poly(d, outer, STONE, w=8)                                                                    # stenbågen
        for y in range(180, 370, 40):                                                                 # fogar i stenen
            d.line((84, y, 108, y), fill=lighter(STONE, 0.75), width=4)
            d.line((292, y + 20, 316, y + 20), fill=lighter(STONE, 0.75), width=4)
        glass = Image.new('RGBA', (400, 400))
        dg = ImageDraw.Draw(glass)
        k = 0
        for y in range(40, 380, 52):                                                                  # glasrutor i blyinfattning
            for x in range(110, 290, 45):
                dg.rectangle((x, y, x + 45, y + 52), fill=PANES[(k * 3) % 5], outline=INK, width=6); k += 1
        dg.line((200, 40, 200, 380), fill=INK, width=8)
        dg.ellipse((168, 70, 232, 134), fill=(255, 236, 160, 255), outline=INK, width=6)               # helgonets gloria
        mask = Image.new('L', (400, 400))
        ImageDraw.Draw(mask).polygon(inner, fill=255)
        im.paste(glass, (0, 0), mask)
        d = ImageDraw.Draw(im)
        d.line(inner + [inner[0]], fill=INK, width=8)
        rrect(d, (66, 366, 334, 396), 6, lighter(STONE, 0.85))                                        # fönsterbänk
    elif kind == 'waxboots':
        for x0, f in ((40, 1), (210, 1)):
            poly(d, [(x0 + 30, 40), (x0 + 110, 40), (x0 + 116, 230), (x0 + 170, 260), (x0 + 172, 316), (x0 + 20, 316), (x0 + 24, 200)], (96, 62, 40, 255), w=7)
            rrect(d, (x0 + 10, 300, x0 + 182, 350), 14, WAX)                                         # vaxsula
            for k in range(3):
                dx = x0 + 30 + k * 60
                d.line((dx, 344, dx, 372 + 10 * (k % 2)), fill=INK, width=14)
                d.line((dx, 344, dx, 372 + 10 * (k % 2)), fill=lighter(WAX, 1.05), width=8)
            d.line((x0 + 40, 70, x0 + 100, 70), fill=(60, 36, 22, 255), width=6)
            d.line((x0 + 40, 110, x0 + 100, 110), fill=(60, 36, 22, 255), width=6)
    elif kind == 'larvahook':
        d.line((300, 10, 300, 200), fill=INK, width=24)                                               # kroken
        d.line((300, 10, 300, 200), fill=(150, 154, 166, 255), width=12)
        d.arc((150, 120, 310, 300), 0, 200, fill=INK, width=26)
        d.arc((150, 120, 310, 300), 0, 200, fill=(150, 154, 166, 255), width=12)
        poly(d, [(146, 216), (130, 180), (170, 200)], (180, 184, 196, 255), w=5)
        segs = [(70 + 34 * k, 300 - 40 * np.sin(k * 0.6), 30 - k * 1.5) for k in range(7)]           # larven
        for x, y, r in segs[::-1]:
            d.ellipse((x - r, y - r, x + r, y + r), fill=(236, 230, 200, 255), outline=INK, width=5)
        x, y, r = segs[0]
        d.ellipse((x - r - 4, y - r + 2, x + r - 10, y + r - 4), fill=(170, 110, 60, 255), outline=INK, width=5)
        d.ellipse((x - 18, y - 10, x - 6, y + 2), fill=INK)
    elif kind == 'incensebowl':
        d.chord((40, 140, 360, 360), 0, 180, fill=(150, 110, 70, 255), outline=INK, width=8)           # skålen
        d.ellipse((40, 220, 360, 280), fill=(110, 70, 40, 255), outline=INK, width=7)
        for k in range(26):                                                                           # rökelsekorn
            x, y = 80 + (k * 53) % 240, 236 + (k * 17) % 34
            d.ellipse((x - 11, y - 8, x + 11, y + 8), fill=(236, 200, 120, 255), outline=INK, width=3)
        for x, y in ((150, 244), (250, 250)):
            d.ellipse((x - 10, y - 10, x + 10, y + 10), fill=(255, 140, 40, 255))
        smoke_curl(d, [(160 + 30 * np.sin(t * 6), 230 - 220 * t) for t in np.linspace(0, 1, 30)], (236, 230, 246, 230), 18)
        smoke_curl(d, [(250 - 26 * np.sin(t * 5), 236 - 200 * t) for t in np.linspace(0, 1, 30)], (220, 214, 236, 220), 14)
        rrect(d, (160, 340, 240, 380), 8, (120, 84, 50, 255))
    elif kind == 'stinger':
        bee(d, 150, 170, 3.2)
        poly(d, [(56, 152), (6, 176), (56, 196)], (60, 60, 66, 255), w=5)                              # gadden glänser
        d.line((50, 168, 14, 176), fill=(200, 200, 210, 255), width=4)
        for x, y in ((40, 220), (20, 240), (52, 250)):                                                # giftdroppar
            d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(140, 220, 90, 255), outline=INK, width=3)
    elif kind == 'bellrope':
        bell(d, 120, 30, 180, 140, GOLD, False)
        pts = [(220 + 30 * np.sin(t * 5), 20 + 320 * t) for t in np.linspace(0, 1, 40)]             # repet
        for k in range(len(pts) - 1):
            d.line((pts[k], pts[k + 1]), fill=INK, width=26)
        for k in range(len(pts) - 1):
            d.line((pts[k], pts[k + 1]), fill=(200, 170, 120, 255), width=16)
        for k in range(0, len(pts) - 2, 3):
            x, y = pts[k]
            d.line((x - 8, y - 6, x + 8, y + 6), fill=(130, 100, 60, 255), width=4)
        x, y = pts[-1]
        rrect(d, (x - 24, y - 10, x + 24, y + 20), 8, (170, 30, 40, 255))                            # tofs
        for dx in range(-26, 30, 10):
            d.line((x + dx * 0.6, y + 18, x + dx, y + 60), fill=INK, width=8)
            d.line((x + dx * 0.6, y + 18, x + dx, y + 58), fill=(200, 40, 50, 255), width=4)
    elif kind == 'bloodbowl':
        d.chord((30, 100, 370, 340), 0, 180, fill=(180, 180, 190, 255), outline=INK, width=8)
        d.ellipse((30, 180, 370, 260), fill=BLOOD, outline=INK, width=8)
        d.ellipse((90, 196, 200, 226), fill=(210, 60, 70, 255))
        rrect(d, (150, 330, 250, 370), 8, (150, 150, 160, 255))
        for k in range(8):                                                                            # gravyr
            x = 70 + k * 37
            d.line((x, 262, x + 10, 300 - abs(k - 3.5) * 6), fill=(120, 120, 130, 255), width=4)
        for x, y in ((330, 290), (346, 330)):                                                         # droppar längs kanten
            d.ellipse((x - 10, y - 14, x + 10, y + 14), fill=BLOOD, outline=INK, width=3)
    elif kind == 'halo':
        d.ellipse((40, 60, 360, 200), outline=INK, width=46)                                          # gloria
        d.ellipse((46, 66, 354, 194), outline=(255, 214, 90, 255), width=30)
        d.ellipse((60, 80, 340, 180), outline=(255, 246, 200, 255), width=6)
        for k in range(12):                                                                           # strålar
            a = k * np.pi / 6
            d.line((200 + 170 * np.cos(a), 130 + 90 * np.sin(a), 200 + 196 * np.cos(a), 130 + 110 * np.sin(a)), fill=(255, 236, 170, 255), width=8)
        d.ellipse((130, 170, 270, 330), fill=(60, 50, 70, 255), outline=INK, width=7)                 # helgonets huvud i skugga
        d.chord((110, 260, 290, 400), 180, 360, fill=(90, 40, 50, 255), outline=INK, width=7)
    elif kind == 'candle':
        rrect(d, (80, 340, 320, 384), 12, (170, 130, 60, 255))                                        # ljusstake
        rrect(d, (170, 300, 230, 348), 6, (196, 150, 64, 255))
        candle(d, 200, 90, 110, 214, WAX, 4)
        candle(d, 110, 170, 60, 140, (220, 200, 160, 255), 2)
        candle(d, 290, 190, 60, 120, (230, 210, 170, 255), 2)
        for x, y, r in ((200, 52, 26), (110, 140, 18), (290, 162, 16)):                               # lågor
            d.ellipse((x - r * 0.6, y - r * 1.4, x + r * 0.6, y + r * 0.6), fill=(255, 200, 80, 255), outline=INK, width=3)
            d.ellipse((x - r * 0.25, y - r * 0.5, x + r * 0.25, y + r * 0.4), fill=(255, 250, 220, 255))
    elif kind == 'honeycomb':
        for row in range(4):
            for col in range(4):
                cx, cy = 70 + col * 80 + (40 if row % 2 else 0), 60 + row * 70
                if cx > 340:
                    continue
                hexcell(d, cx, cy, 46, HONEY if (row + col) % 3 else (250, 220, 120, 255), 7)
                d.ellipse((cx - 18, cy - 18, cx - 2, cy - 4), fill=(255, 236, 170, 255))
        for x, L in ((90, 80), (190, 120), (290, 60)):                                                # honung droppar
            d.line((x, 300, x, 300 + L), fill=INK, width=26)
            d.line((x, 300, x, 300 + L), fill=HONEY, width=16)
            d.ellipse((x - 16, 300 + L - 10, x + 16, 300 + L + 20), fill=HONEY, outline=INK, width=5)
    elif kind == 'bigbell':
        rrect(d, (20, 10, 380, 50), 10, (90, 60, 36, 255))                                           # bjälken
        bell(d, 200, 70, 300, 250, (196, 150, 64, 255))
        for x in (100, 300):
            d.arc((x - 50, 180, x + 50, 260), 120, 240, fill=(255, 236, 170, 255), width=6)        # ljudvågor
    elif kind == 'chalice':
        chalice(d, 200, 60, 260, 330, GOLD, BLOOD)
        for x, y in ((90, 100), (310, 110)):
            d.ellipse((x - 12, y - 4, x + 12, y + 40), fill=BLOOD, outline=INK, width=3)
        for k in range(3):                                                                            # ädelstenar
            x = 150 + k * 50
            d.ellipse((x - 12, 130, x + 12, 154), fill=(200, 30, 40, 255), outline=INK, width=4)
    elif kind == 'beegloves':
        for x0, flip in ((30, False), (190, True)):
            palm = [(x0 + 30, 380), (x0 + 20, 220), (x0 + 30, 120), (x0 + 60, 110), (x0 + 70, 180), (x0 + 80, 90), (x0 + 110, 90), (x0 + 112, 180), (x0 + 130, 110),
                    (x0 + 160, 120), (x0 + 156, 240), (x0 + 150, 380)]
            if flip:
                palm = [(2 * x0 + 180 - x, y) for x, y in palm]
            poly(d, palm, (236, 226, 196, 255), w=7)
            rrect(d, (x0 + 18, 300, x0 + 162, 384), 10, (210, 200, 170, 255))                        # krage
            for y in (320, 350):
                d.line((x0 + 26, y, x0 + 154, y), fill=(150, 140, 110, 255), width=5)
        bee(d, 150, 200, 1.3)
        bee(d, 280, 120, 1.1, True)
        bee(d, 90, 60, 1.0)
    elif kind == 'shears':
        for a, b in (((40, 360), (330, 60)), ((60, 60), (340, 360))):
            pass
        poly(d, [(200, 200), (360, 30), (376, 46), (214, 214)], (190, 194, 206, 255))                 # blad
        poly(d, [(200, 200), (40, 30), (24, 46), (186, 214)], (170, 174, 186, 255))
        d.line((210, 196, 352, 46), fill=(240, 244, 250, 255), width=5)
        d.ellipse((186, 186, 214, 214), fill=GOLD, outline=INK, width=5)                              # nit
        for cx in (120, 280):                                                                         # handtagsöglor
            d.ellipse((cx - 64, 260, cx + 64, 388), outline=INK, width=34)
            d.ellipse((cx - 60, 264, cx + 60, 384), outline=(110, 72, 40, 255), width=22)
        d.line((200, 214, 150, 270), fill=INK, width=22)
        d.line((200, 214, 250, 270), fill=INK, width=22)
        d.line((200, 214, 150, 270), fill=(110, 72, 40, 255), width=12)
        d.line((200, 214, 250, 270), fill=(110, 72, 40, 255), width=12)
        for x, y in ((300, 110), (320, 150), (100, 110)):                                             # grön larvsaft
            d.ellipse((x - 10, y - 12, x + 10, y + 12), fill=(130, 210, 80, 255), outline=INK, width=3)
    elif kind == 'myrrhjar':
        poly(d, [(120, 120), (280, 120), (320, 200), (310, 340), (260, 380), (140, 380), (90, 340), (80, 200)], (236, 220, 200, 255), w=8)  # alabasterkrus
        for y in (200, 260, 320):
            d.arc((90, y - 40, 310, y + 30), 20, 160, fill=(200, 180, 160, 255), width=5)
        rrect(d, (150, 90, 250, 128), 8, (210, 196, 176, 255))
        d.ellipse((140, 76, 260, 104), fill=(110, 60, 30, 255), outline=INK, width=6)                 # öppningen med myrra
        rrect(d, (170, 250, 230, 300), 6, (170, 30, 40, 255))                                         # sigill
        smoke_curl(d, [(200 + 34 * np.sin(t * 7), 90 - 90 * t) for t in np.linspace(0, 1, 26)], (236, 226, 246, 230), 18)
    elif kind == 'rosewindow':
        d.ellipse((10, 10, 390, 390), fill=STONE, outline=INK, width=8)
        d.ellipse((40, 40, 360, 360), fill=(40, 30, 50, 255), outline=INK, width=6)
        for k in range(12):                                                                           # kronbladen
            a0, a1 = k * 30, k * 30 + 30
            d.pieslice((44, 44, 356, 356), a0, a1, fill=PANES[k % 5], outline=INK, width=6)
        for k in range(12):
            a = (k * 30 + 15) * np.pi / 180
            x, y = 200 + 120 * np.cos(a), 200 + 120 * np.sin(a)
            d.ellipse((x - 22, y - 22, x + 22, y + 22), fill=PANES[(k + 2) % 5], outline=INK, width=5)
        d.ellipse((130, 130, 270, 270), fill=(200, 40, 60, 255), outline=INK, width=7)
        for k in range(8):
            a = k * np.pi / 4
            d.line((200, 200, 200 + 70 * np.cos(a), 200 + 70 * np.sin(a)), fill=INK, width=5)
        d.ellipse((176, 176, 224, 224), fill=(255, 220, 110, 255), outline=INK, width=5)
    elif kind == 'honeyjar':
        poly(d, [(110, 110), (290, 110), (330, 170), (330, 360), (300, 390), (100, 390), (70, 360), (70, 170)], (236, 150, 30, 230), w=8)  # burken
        d.line((100, 180, 100, 350), fill=(255, 220, 140, 255), width=10)
        rrect(d, (100, 60, 300, 116), 10, (200, 180, 140, 255))                                       # tygskynke
        d.line((96, 112, 304, 112), fill=(170, 30, 40, 255), width=10)
        for k in range(4):
            x = 120 + k * 52
            d.line((x, 116, x - 6, 150 + 20 * (k % 2)), fill=INK, width=18)
            d.line((x, 116, x - 6, 150 + 20 * (k % 2)), fill=(255, 190, 60, 255), width=10)
        bee(d, 160, 260, 1.4)                                                                         # fastklistrade bin
        bee(d, 250, 310, 1.2, True)
        bee(d, 340, 60, 1.1, True)
    elif kind == 'bellhammer':
        bell(d, 120, 150, 150, 160, (196, 150, 64, 255))
        d.line((380, 20, 230, 230), fill=INK, width=30)                                               # skaft
        d.line((380, 20, 230, 230), fill=(122, 78, 42, 255), width=18)
        ux, uy, px, py = -0.58, 0.81, 0.81, 0.58                                                      # skaftets riktning och tvärs över
        hx, hy = 236, 222
        poly(d, [(hx + px * 80 + ux * 34, hy + py * 80 + uy * 34), (hx + px * 80 - ux * 34, hy + py * 80 - uy * 34),
                 (hx - px * 80 - ux * 34, hy - py * 80 - uy * 34), (hx - px * 80 + ux * 34, hy - py * 80 + uy * 34)], (110, 114, 126, 255), w=7)  # hammarhuvud
        for sgn in (1, -1):                                                                           # järnband vid ändarna
            d.line((hx + sgn * px * 60 + ux * 34, hy + sgn * py * 60 + uy * 34, hx + sgn * px * 60 - ux * 34, hy + sgn * py * 60 - uy * 34), fill=INK, width=8)
        d.line((hx - px * 70 - ux * 26, hy - py * 70 - uy * 26, hx + px * 70 - ux * 26, hy + py * 70 - uy * 26), fill=(180, 184, 196, 255), width=6)
        for a in (200, 230, 260):
            x, y = 150 + 70 * np.cos(a * np.pi / 180), 230 + 70 * np.sin(a * np.pi / 180)
            d.line((x, y, x - 30 * np.cos((a - 180) * np.pi / 180), y + 30 * np.sin((a - 180) * np.pi / 180)), fill=(255, 236, 170, 255), width=6)
    elif kind == 'reliquary':
        rrect(d, (70, 160, 330, 340), 12, GOLD)                                                       # skrinet
        poly(d, [(60, 170), (200, 60), (340, 170)], lighter(GOLD, 0.85), w=7)                          # taket
        d.line((200, 60, 200, 10), fill=INK, width=14)                                                # kors
        d.line((180, 28, 220, 28), fill=INK, width=14)
        d.line((200, 58, 200, 12), fill=(255, 230, 150, 255), width=6)
        d.line((182, 28, 218, 28), fill=(255, 230, 150, 255), width=6)
        rrect(d, (140, 190, 260, 310), 50, (255, 246, 210, 255))                                     # fönster med ljus
        d.ellipse((176, 220, 224, 280), fill=(240, 200, 180, 255), outline=INK, width=4)             # benbit i fönstret
        for x in (90, 310):
            for y in (190, 310):
                d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=(200, 30, 40, 255), outline=INK, width=4)
        rrect(d, (50, 330, 350, 372), 10, lighter(GOLD, 0.8))
    elif kind == 'censercloud':
        censer_pot(d, 200, 250, 100)
        for k, (x, y) in enumerate(((90, 340), (310, 330), (60, 210), (340, 220))):
            smoke_curl(d, [(x + 24 * np.sin(t * 6 + k), y - 120 * t) for t in np.linspace(0, 1, 20)], (230, 226, 240, 220), 16)
    elif kind == 'cardinalring':
        d.ellipse((70, 140, 330, 390), outline=INK, width=52)                                         # ringen
        d.ellipse((76, 146, 324, 384), outline=GOLD, width=38)
        d.arc((90, 160, 310, 370), 200, 260, fill=(255, 240, 180, 255), width=8)
        poly(d, [(130, 160), (270, 160), (300, 110), (200, 30), (100, 110)], lighter(GOLD, 0.85), w=7)  # infattning
        d.ellipse((140, 50, 260, 160), fill=(190, 20, 40, 255), outline=INK, width=7)                 # rubinen
        d.ellipse((164, 70, 200, 100), fill=(255, 120, 130, 255))
        for x in (120, 280):
            d.ellipse((x - 10, 100, x + 10, 120), fill=(255, 240, 200, 255), outline=INK, width=3)
    elif kind == 'beecrown':
        base = [(40, 360), (40, 200), (100, 260), (140, 120), (200, 230), (260, 120), (300, 260), (360, 200), (360, 360)]
        poly(d, base, HONEY, w=8)                                                                     # kronan av vax och honung
        for row, y in enumerate((300, 340)):
            for k in range(6):
                hexcell(d, 70 + k * 52 + (26 if row else 0), y, 24, (250, 210, 100, 255) if (k + row) % 2 else (230, 150, 30, 255), 4)
        for x, y in ((140, 120), (260, 120)):
            d.ellipse((x - 18, y - 18, x + 18, y + 18), fill=(255, 236, 160, 255), outline=INK, width=5)
        d.ellipse((176, 150, 224, 198), fill=(200, 30, 40, 255), outline=INK, width=5)
        bee(d, 200, 70, 2.0)                                                                          # drottningen
        rrect(d, (30, 352, 370, 380), 8, (190, 120, 30, 255))
    return im


def draw_censer():
    """Rökelsekaret: genombrutet mässingskar på kedjor, med glöd i hålen och en ring att svinga det i."""
    im = Image.new('RGBA', (420, 440))
    d = ImageDraw.Draw(im)
    censer_pot(d, 210, 320, 110)
    return im.crop(im.getbbox()).rotate(-18, resample=Image.BICUBIC, expand=True)


def draw_hivelauncher():
    """Bikastaren: en halmkupa på en trästock med handtag och ett kort mässingsrör som bina flyger ut ur."""
    im = Image.new('RGBA', (480, 320))
    d = ImageDraw.Draw(im)
    poly(d, [(6, 190), (110, 172), (150, 176), (150, 208), (104, 212), (16, 240)], (118, 72, 38, 255))   # kolv
    poly(d, [(170, 206), (200, 206), (190, 280), (160, 280)], (86, 54, 32, 255))                        # handtag
    rrect(d, (130, 180, 380, 214), 8, (110, 72, 40, 255))                                              # stock
    skep(d, 250, 196, 200, 170)
    rrect(d, (360, 150, 440, 190), 8, (196, 150, 64, 255))                                             # rör
    d.ellipse((428, 144, 456, 196), fill=(150, 110, 40, 255), outline=INK, width=6)
    d.line((370, 160, 432, 160), fill=(236, 204, 120, 255), width=5)
    return im.crop(im.getbbox()).rotate(6, resample=Image.BICUBIC, expand=True)


GUNS.update({'censer': draw_censer, 'hivelauncher': draw_hivelauncher})


def layer15(src, size):
    """Bakgrundslager: (RGB-bild, mask eller None). Partiklar läggs med "screen", stänk och rök med sin egen alfa."""
    kind, name = src.split(':', 1)
    if kind == 'part':
        return None
    im = Image.open(os.path.join(SPLATS if kind == 'splat' else SMOKES, name + '.png')).convert('RGBA')
    im = im.crop(im.split()[3].point(lambda v: 255 if v > 16 else 0).getbbox() or (0, 0, im.width, im.height))
    k = size / max(im.size)
    return im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)


def drawn_card15(cid, kind, size, dy, layers):
    big = purple_bg()
    for src, sc, px, py, tint, rot in layers:
        cx, cy = S * 2 + px * S * 4, S * 2 + py * S * 4
        if src.startswith('part:'):
            big = screen(big, particle(src[5:], int(S * 4 * sc), tint, rot), cx, cy)
            continue
        im = layer15(src, int(S * 4 * sc))
        if rot:
            im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
        lum = im.convert('L')
        rgb = Image.merge('RGB', [lum.point(lambda v, c=c: v * c // 255) for c in tint])
        alpha = im.split()[3].point(lambda v: int(v * (0.9 if src.startswith('splat:') else 0.6)))
        col = Image.merge('RGBA', rgb.split() + (alpha,))
        big.alpha_composite(col, (int(cx - col.width / 2), int(cy - col.height / 2)))
    g = art15(kind)
    g = shade(g.crop(g.getbbox()))
    k = S * 4 * size / max(g.size)
    g = g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))), Image.LANCZOS)
    pos = ((S * 4 - g.width) // 2, int((S * 4 - g.height) / 2 + dy * S * 4))
    add_glow(big, g, pos, (0, 0, 0), 12)
    big.alpha_composite(g, pos)
    save(big, cid)


def main_v15():
    old = ({'ash:' + s for s, _ in V7.values()} | {k + ':' + s for k, s, _ in V8.values()} | {k + ':' + s for k, s, _ in V9_ASH.values()}
           | {k + ':' + s for k, s, _ in V11_SRC.values()} | {k + ':' + s for k, s, _ in V13_SRC.values()})
    srcs = [k + ':' + s for k, s, _ in V15_SRC.values()]
    assert len(srcs) == len(set(srcs)) and not old & set(srcs), 'varje bild används bara en gång'
    assert len(V15_SRC) + len(V15_DRAWN) == 24 and not set(V15_SRC) & set(V15_DRAWN)
    old_parts = ({p[0] for t in (V9_DRAWN, V11_DRAWN, V13_DRAWN) for _, _, _, ps in t.values() for p in ps}
                 | {s[5:] for t in (V9_UPGRADES, V11_UPGRADES, V13_UPGRADES) for _, s, _, _ in t.values() if s.startswith('part:')})
    layers = [p[0] for _, _, _, ps in V15_DRAWN.values() for p in ps] + [s for _, s, _, _ in V15_UPGRADES.values() if s.startswith('part:')]
    assert len(layers) == len(set(layers)), 'varje partikel, stänk och rökbild används bara en gång'
    assert not old_parts & {s[5:] for s in layers if s.startswith('part:')}, 'partiklarna är oanvända'
    fx = [s[4:] for _, s, _, _ in V15_UPGRADES.values() if s.startswith('vfx:')]
    old_fx = ({s for _, s, _ in V6_UPGRADES.values()} | {n for ls in V6_ACTIVES.values() for n, *_ in ls} | {s for _, s, _ in V7_UPGRADES.values()}
              | {s for _, s, _ in V8_UPGRADES.values()} | {s[4:] for t in (V9_UPGRADES, V11_UPGRADES, V13_UPGRADES) for _, s, _, _ in t.values() if s.startswith('vfx:')})
    assert len(V15_UPGRADES) == 8 and len(fx) == len(set(fx)) and not old_fx & set(fx), 'varje effektbild används bara en gång'
    n = 0
    for cid, (kind, src, arg) in V15_SRC.items():
        save(ash_card(src, arg) if kind == 'ash' else decal_card(src, arg) if kind == 'decal' else meshy_card(kind, src, arg), cid)
        n += 1
    for cid, (kind, size, dy, ps) in V15_DRAWN.items():
        drawn_card15(cid, kind, size, dy, ps)
        n += 1
    for cid, w in V15_PACTS.items():
        pact(cid, w)
        n += 1
    for cid, (w, src, tint, rot) in V15_UPGRADES.items():
        v9_upgrade(cid, w, src, tint, rot)
        n += 1
    near_dupes(list(V15_SRC) + list(V15_DRAWN) + list(V15_PACTS) + list(V15_UPGRADES))
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
    if ONLY == 'v11':
        print(main_v11(), 'kortbilder ->', OUT)
        return
    if ONLY == 'v13':
        print(main_v13(), 'kortbilder ->', OUT)
        return
    if ONLY == 'v15':
        print(main_v15(), 'kortbilder ->', OUT)
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
        n += main_v11()
        n += main_v13()
        n += main_v15()
    print(n, 'kortbilder ->', OUT)


if __name__ == '__main__':
    main()
