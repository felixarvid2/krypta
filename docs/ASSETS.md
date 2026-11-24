# Tillstånd och källor för resurserna

Krypta använder grafik, ljud, musik och typsnitt från en rad öppna paket, samt egenritat material. Tabellen nedan anger var varje resurs kommer ifrån och vilket skript som byggt den. Licensfilerna finns i respektive källpaket; de flesta är CC0, och typsnittet Press Start 2P är OFL.

## Resurser

| Vad | Källa |
|---|---|
| Förstapersonsvapen (pistol, hagelgevär, gevär, kpist) med skjutanimationer | release `assets-large-v1` → `RetroWeaponPack_V1.zip`, renderade med `tools/weapon-frames` |
| Dubbelbössa, armborst, signalpistol, prickskyttegevär | `assets/3d-models/PSXShotgunPack[FIXED]`, `Low Poly Weapon Pack with Image Texture - by Kickin It Studios` och `Guns&Explosives`, renderade med `tools/weapon-frames/render-static.mjs` |
| Portal | ritad med `tools/portal/make.py` |
| Bossar: Helvetesbesten, Mardrömmen, Ogern, Vålnaden | `assets/2d-pixel/Legacy Collection/.../Gothicvania/Characters` (Ansimuz, CC0), bildremsor med `tools/boss-sprites/prep.py` |
| Utomhus: skogsvägg, kyrkogårdsmur, grottvägg, korsvirkeshus, gräs, grus, lera, grottgolv och -tak | Kenney *retro-textures-fantasy* (CC0), *Classic64 Asset Pack* (CC0), byggda med `tools/biome-textures/make.py` |
| Natthimmel | Kenney *Skyboxes* (CC0) |
| Träd och gravstenar | träden ur Gothicvania *HauntedForest* (CC0), gravstenarna ritade i `tools/biome-textures/make.py` |
| Mynningsflamma | `RetroWeaponPack_V1.zip` → `FX/Textures/MuzzleFlash.png` |
| Väggar, dörrar, golv, tak | `assets/textures/retro-textures-fantasy` (Kenney, CC0) |
| Skelett, eldskelett, vampyr | `assets/2d-pixel/Enemy_Animations_Set` |
| Benmagiker, orkshaman, gravrövare, orkkrigare | `assets/2d-pixel/Pixel Crawler - Free Pack 2.11` (Anokolisa). Anfalls- och smärtrutor ritas fram av `tools/enemy-sprites/prep.py` |
| Smådjävul och blodslem | `assets/2d-pixel/Tiny RPG Character Asset Pack 02` (Demon_A och Blood Monster_A) |
| Krukor och skärvor | `assets/2d-pixel/20.05b - Breakable Pots 1.1a` |
| Eld, eldklot, kulnedslag | `assets/effects/Free Pixel Effects Pack` (public domain) |
| Blod | `assets/effects/splat-pack` (Kenney, CC0) |
| Ammolåda | `assets/3d-models/Styloo Guns Asset Pack` (renderad till sprite) |
| Hälsa och rustning | `assets/2d-sprites/potions` |
| Ljud | `assets/audio/400 Sounds Pack` och release `assets-large-v1` → `Horror.SFX.Free.zip` |
| Boss: vingad demon | `assets/2d-pixel/Legacy Collection/.../Gothicvania/Characters/demon-Files` (Ansimuz, CC0) |
| Köpman (liemannen) | `assets/2d-pixel/Legacy Collection/.../Gothicvania/Characters/death` (CC0) |
| Kistor och mynt | `assets/2d-pixel/2D Pixel Dungeon Asset Pack v2.0` |
| Kortbilder och kortbaksida | `assets/rune-ai/flux/relics` och `card-backs`. Vapenkorten kombinerar relikbilder med vapnen renderade ur RetroWeaponPack (`tools/weapon-cards`) |
| Mobilknappar och joystick | Kenney *Mobile Controls* 1.0 (CC0), hämtad från kenney.nl. Kartikonen (`icon_map.png`) är ritad i samma stil |
| Föremål (kandelabrar, kistor, bokhyllor, brunnar, altare, spikfällor, krutfat, lådor m.m.), mimic, partiklar och väktar-/bossrummens väggar och golv | ritade med `tools/props/make.py`. Mimicen bygger på kistan ur *2D Pixel Dungeon*, kristallen på Gothicvania *Rocky Pass* (CC0), dimman på Kenney *Particle Pack* (CC0). Texturerna har ytstruktur från Kenney *retro-textures-fantasy* och *Classic64* (CC0) |
| Nya ljud (biomljud, fotsteg, bossmusik, klockor, hjärtslag m.m.) | `assets/audio/400 Sounds Pack` och `Horror.SFX.Free.zip`, konverterade med `tools/sounds/make.sh` |
| Kugghjul och utgång (mobil) | Kenney *Game Icons* (CC0) |
| Version 4: sju nya fiender (spindel, fladdermus, helveteshund, bombskelett, sköldbärare, svampman, levande rustning), nya föremål, partiklar, måne, moln och Träskets texturer | `tools/props2/make.py`. Helveteshunden och svampmannen ur Gothicvania (Ansimuz, CC0), bombskelettet och sköldbäraren bygger på *Pixel Crawler* (Anokolisa), resten ritas i skriptet. Ytor från Kenney *retro-textures-fantasy* och *Classic64* (CC0) |
| Musik per biom, eko och 35 nya ljud | `js/music.js` och `tools/sounds/make2.sh`: Abstraction *Music Loop Bundle* (CC0), Kenney *impact-sounds*, *rpg-audio*, *ui-audio*, *digital-audio* (CC0), 400 Sounds Pack och Horror SFX Free. Skogens, borggårdens och startskärmens musik är syntetiserad i skriptet |
| 50 nya kortbilder | `tools/card-art/make.py` ur `assets/rune-ai/flux/relics` |
| Version 5: yxa, eldkastare, granatkastare | yxan ur Kay Lousberg *KayKit Fantasy Weapons Bits* (CC0); eldkastaren och granatkastaren byggda av *Guns&Explosives* och *PSXShotgunPack* med `tools/weapon-frames` |
| Version 5: ghoul, kultist, gargoyl, isvarg, irrbloss, Isdraken, följeslagare, drycker, alkemist, präst, djurbur, Frostfästets texturer och partiklar | `tools/props3/make.py`. Isvargen och Isdraken ur Gothicvania (Ansimuz, CC0), omfärgade; ghoul, kultist, alkemist och präst bygger på *Pixel Crawler* (Anokolisa); ytor från *Classic64* (CC0); resten ritas i skriptet |
| Version 5: 40 ljud och musiken för Frostfästet och Isdraken | `tools/sounds/make3.sh`: Kenney-paket (CC0), 400 Sounds Pack, Horror SFX Free; musiken och flera ljud syntetiseras i skriptet |
| Version 5: 45 nya kortbilder | `tools/card-art/make.py` ur `assets/rune-ai/flux` (relics, bosses, vouchers, tags, rune-symbols) |
| Version 6: spikgevär, blixtstav, långbåge | blixtstaven och bågen ur KayKit *Fantasy Weapons Bits* (CC0), spikgeväret byggt på *Guns&Explosives*, renderade med `tools/weapon-frames` |
| Version 6: nekromant, dödsriddare, banshee, eldelemental, lavamask, Eldkungen, Vulkanens texturer, rekvisita, runor och ikoner | `tools/props4/make.py`. Nekromanten och dödsriddaren bygger på *Pixel Crawler* (Anokolisa), bansheen på Gothicvania (Ansimuz, CC0), Eldkungen på TinyRPG *Jumping Demon* (Legacy Collection, CC0), ytor från *Classic64* och Kenney (CC0); resten ritas i skriptet |
| Version 6: 47 ljud och musiken för Vulkanen, Eldkungen, hemliga våningar och överlevnad | `tools/sounds/make4.sh`: Kenney-paket (CC0), 400 Sounds Pack, Horror SFX Free; musiken syntetiseras i skriptet |
| Version 6: 45 nya kortbilder | `tools/card-art/make.py` ur `assets/rune-ai/flux` och `assets/ashfall-ai/flux/vfx` |
| Typsnitt | Press Start 2P (OFL) |

Se licensfilerna i respektive källpaket.
