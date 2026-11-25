# KRYPTA – roguelike-FPS

Ett raycaster-FPS i Doom/Quake 1-stil som är en roguelike: varje runda är fem slumpade våningar i åtta biomer och
en boss längst ner. Tangenterna går att byta, och handkontroll och mobil stöds. Öppna `index.html` via en lokal webbserver (`python3 -m http.server` i den här
mappen) och klicka **NY RUNDA**.

**Om repot:** spelet flyttades hit från `felixarvid2/test`, där det låg i mappen `retrofps/`. Historiken följde med.
Spelet behöver inget byggsteg. Skripten i `tools/` som bygger om grafik, ljud och kort läser däremot källpaketen
(`assets/2d-pixel`, `assets/3d-models`, `assets/audio` med flera) från `felixarvid2/test`. De förutsätter fortfarande den gamla
mappstrukturen: kör dem från en mapp som innehåller både källpaketens `assets/` och det här repot som `retrofps/`.

**Kontroller:** WASD gå · mus sikta · vänsterklick skjut · högerklick sikta med vapnet · R ladda om ·
E öppna dörr, kista, hemlig vägg, använd föremål eller handla · Shift spring · 1–8/Q/mushjul byt vapen · C dina kort ·
M/Tab karta · V spark · Space hopp · Ctrl ducka · Z rusa · F granat · X inspektera · B kartmarkör · K fotoläge · F9 skärmbild · P/Esc paus (I inställningar, G ge upp, M karta) · Enter ny runda · `[` `]` muskänslighet · `,` `.` synfält · `-` `+` volym · N ljud av · O helskärm.

**Mobil:** vänster tumme styr en flytande joystick (dra långt för att springa), höger tumme drar för att vrida, och ett snabbt tryck i bilden skjuter. Den stora knappen skjuter så länge man håller den, och man kan dra på den för att sikta samtidigt. Liggande läge ger störst bild. I stående läge ligger bilden överst, och hela bilden är vrid- och skjutyta. Joysticken och knapparna ligger under bilden. Texter som "R = LADDA OM" och "E: HANDLA" byts mot pekvarianter. Knapparna vid sidan av bilden siktar, laddar om, använder, byter vapen och öppnar karta, kort och paus. Helskärmsknappen finns både på startskärmen och i spelet (också i pausen), och på Android vrids skärmen till liggande läge. Där webbläsaren eller appen inte tillåter helskärm, till exempel på iPhone, visas ett meddelande om det. Knapparna kommer från Kenneys *Mobile Controls* (CC0, `assets/touch/`).

## Roguelike

- **Genererade våningar i fem biomer** (`js/gen.js`, `js/rng.js`). Varje varv går igenom alla fem i slumpad ordning, och storleken och fienderna ökar med djupet.
  - *Kryptan* (inomhus): rum och korridorer med minimalt uppspännande träd och slingor, dörrar, hemliga rum, skattrum, butiksrum och elitrum. Sju teman med olika väggar, golv, dimma och namn.
  - *Grottorna*: cellautomat (45 % sten, fem utjämningar) och några slumpvandrare som gräver slingrande gångar. Flood fill behåller den största grottan och binder ihop resten med två rutor breda tunnlar. Droppstenar och lerfläckar.
  - *Kyrkogården* (utomhus, under natthimlen): ett öppet fält innanför en mur, med kapell, kryptor (med kista), gravkvarter med rader av gravstenar, grusgångar från ingången och döda träd där brusfunktionen säger det.
  - *Skogen* (utomhus): brus avgör var skogen är tät (trädridå) och var det är gläntor. En slingrande stig går från start till utgång, och en andra stig grenar av och går ihop med den igen, så det alltid finns en slinga. Gläntor med sidostigar och ibland en stuga med kista.
  - *Borggården* (delvis utomhus): en öppen gård under himlen omgiven av byggnadslängor med rum, dörrar och ibland en grind, med torn, pelare och ett centralt torn som skydd.
  - Gemensamt för alla: utgången hamnar längst bort från starten (räknat i gångavstånd), stora öppna ytor bryts upp med skydd, och varje föremål som blockerar kontrolleras så att det aldrig stänger av en väg. Generatorn tar 3–6 ms per våning.
  - Valet av metod bygger på en genomgång av rot.js, cellautomater, Brogue-liknande rumspåbyggnad, BSP, Wave Function Collapse, slumpvandring, brus/Voronoi och Herringbone Wang tiles. Egna algoritmer per biom passar en rutnätsraycaster bäst; rot.js hade gett ett extra beroende och en andra slumpgenerator utan utomhusbiomer.
- **Frö och dagens runda**: samma frö ger samma våningar. Fröet visas i pausen och efter rundan, och kan skrivas in på startskärmen. *Dagens runda* har samma frö för alla under dagen.
- **Kort** (`js/cards.js`, `js/cardui.js`): 100 vanliga kort (50 nya i version 4) i fyra sällsyntheter (vanlig, ovanlig, sällsynt, legendarisk). Korten ger permanenta bonusar under rundan, till exempel skada, eldhastighet, krit, genomslag, explosioner, brand, livsstöld, sköld, extraliv, magnet och rabatt. Fem förbannade kort ger en stark fördel med en nackdel. Det finns synergier, som eld + explosion och krit + kritskada.
- **Åtta vapen**: pistol, hagelgevär, gevär och kpist, samt
  - *dubbelbössa*: två pipor med tio hagel var och snabb omladdning av båda,
  - *armborst*: tyst (väcker inga fiender) och bulten går igenom alla,
  - *signalpistol*: skjuter ett bloss som sprängs och tänder eld,
  - *prickskyttegevär*: hög skada, går igenom två fiender, stark zoom och dålig träffsäkerhet från höften.

  Armborsten och signalpistolen har egen ammunition (pilar och bloss). Varje våning har ett nytt vapen i slumpad ordning; de två sista dyker upp i varv 2.
- **Vapenpakter** (åtta sällsynta kort, en per vapen): man svär sig till ett vapen resten av rundan. De andra vapnen försvinner, vapen man hittar blir ammo och 20 guld, all ammo blir vapnets egen och skadan ökar med 15 %. Pakten öppnar vapnets unika uppgraderingar, som bara dyker upp efter pakten men då ofta. Uppgraderingarna ändrar hur vapnet fungerar:
  - **Pistol:** *Studskulan* (träffen studsar till nästa fiende), *Hanefläkten* (håll in för att tömma magasinet i ett svep), *Sista kulan* (sista skottet gör 3× skada och exploderar), *Duellanten* (ovetande fiender dör av första träffen) och *Tomhylsan* (tomt magasin laddas om direkt).
  - **Hagelgevär:** *Drakanden* (varje hagel tänder eld), *Dubbelpipan* (två patroner per skott, dubbelt så många hagel), *Slagkraften* (nära fiender slungas bakåt och skadas mot väggen), *Splitterhaglet* (döda fiender sprängs och skadar grannarna) och *Snigeln* (siktar man skjuts en snigel som går igenom alla med 7× skada).
  - **Gevär:** *Kedjeblixten* (var fjärde träff hoppar till tre fiender), *Kalla blodet* (sikta en sekund så gör nästa skott 4× skada och går igenom; en ring runt hårkorset visar laddningen), *Kastmagasinet* (omladdningen kastar det gamla magasinet som en granat) och *Skarpskytten* (träffar på över 7 rutor är alltid kritiska).
  - **Kpist:** *Spinnpipan* (eldhastigheten växer till det dubbla medan man håller in), *Rikoschetten* (kulor studsar mot väggar), *Dödsmärket* (åttonde träffen på samma fiende detonerar) och *Blybältet* (ingen omladdning, skjuter direkt ur reserven).
  - **Dubbelbössa:** *Blodskörden* (varje dödad fiende ger 3 HP och en patron), *Dubbeldöden* (dödar ett skott två fiender laddas båda piporna direkt), *Kedjekulan* (tre tunga kulor som går igenom alla) och *Stormsteget* (skottet kastar dig bakåt och du är osårbar en kort stund).
  - **Armborst:** *Sprängspetsen* (pilen fastnar och sprängs efter 0,8 s), *Giftspetsen* (gift som sprids när fienden dör), *Pilsamlaren* (dödande pilar kommer tillbaka och läggs i direkt) och *Treskottet* (tre pilar i en solfjäder för priset av en).
  - **Signalpistol:** *Fyrverkeriet* (blosset spricker i fem brinnande gnistor), *Solblosset* (bländar fiender i 2 s), *Ekoblosset* (studsar mot väggar två gånger) och *Löpelden* (brinnande fiender som dör tänder eld på grannarna).
  - **Prickskyttegevär:** *Huvudjägaren* (ett dödande skott laddar om direkt och nästa gör dubbel skada), *Genomborraren* (kulan går igenom väggar upp till 2 rutor), *Tidsstoppet* (tiden går i halv fart när du siktar) och *Sprängkulan* (varje träff exploderar).
- **Fiender**: förutom skelett, eldskelett och vampyr finns sex sorter med eget beteende, och nya sorter dyker upp ju djupare man kommer. Första gången man möter en sort visas ett tips.
  - *Blodslem* (våning 1–): delar sig i två droppar när det dör.
  - *Smådjävul* (2–): sicksackar och hoppar åt sidan när den träffas.
  - *Orkshaman* (2–): helar och skyndar på fienderna runt sig och håller avstånd.
  - *Benmagiker* (3–): väcker skelett och skjuter lila klot som svänger efter dig.
  - *Gravrövare* (3–): nästan osynlig på avstånd och hugger hårdare i ryggen.
  - *Orkkrigare* (3–): rustning som tar 0,6 av varje träff (bra mot hagel och kpist, dåligt mot tunga skott). Den stormar fram och blir yr om den krockar i en vägg.
- **Var korten kommer ifrån**: ett startkort (1 av 3), ett kort efter varje våning (1 av 3, eller hoppa över för guld), kortkistor och butiken.
- **Portaler i stället för att gå tillbaka**: när våningens sista elitfiende dör öppnas en portal där den föll (finns ingen elit öppnas den när alla fiender är döda). Gå in i portalen för att gå vidare direkt, eller fortsätt utforska och gå in senare. Utgången finns kvar som förut.
- **Djupare varv**: efter Bendemonen öppnas en portal där man väljer att *gå djupare*, *avsluta rundan* som segrare eller *stanna kvar* och plocka upp guldet. Varv 2 är våning 7–12 med tuffare fiender och en Bendemon med 60 % mer hälsa, och så vidare. Djupare våningar ger fler själar.
- **Guld och butik**: fiender, krukor och guldhögar ger guld. Dödgrävaren på våning 2 och 4 i varje varv säljer kort, hälsa, rustning, ammunition och nya kort.
- **Elitfiender**: större, färgade fiender med livmätare och en egenskap (snabb, seg, blodtörstig, explosiv eller brutal). De tappar mer guld.
- **Fem bossar** med olika beteenden, en per varv i slumpad ordning (våning 6, 12 osv.). Alla har tre faser (under 2/3 och 1/3 hälsa), livmätare och dödsanimation, och var och en har en egen arena.
  - *Bendemonen* (tronsal): eldfläktar och vingslag. Kallar på skelett och skjuter eldringar från fas 2.
  - *Helvetesbesten* (grotta): eldklot och eldpelare som slår upp under spelaren efter en varning. Från fas 2 sjunker den ned i marken och dyker upp någon annanstans.
  - *Mardrömmen* (kyrkogård): cirklar och skjuter blå eld, stampar och stormar sedan fram med ett spår av blå eld. Krockar den i en vägg blir den yr. Två stormningar i rad från fas 2.
  - *Ogern* (skogsglänta): krossar marken så att en ring av stenar flyger ut och kastar block på håll. Kallar på orkkrigare i fas 2 och blir rasande i fas 3.
  - *Vålnaden* (kyrkogård): halvgenomskinlig och svävande, skjuter sökande klot, försvinner (och går då inte att skada) och dyker upp nära spelaren med ett skrik som saktar ned. Väcker skelett i fas 2.
- **Permadöd**: döden avslutar rundan och den sparade rundan raderas. *Fortsätt* finns bara för en runda som pågår och laddar början av den senaste våningen.
- **Själar och upplåsningar**: varje runda ger själar efter hur långt man kom, och mer på svår nivå. Med dem låser man upp 17 kort på startskärmen. Profilen sparar rundor, segrar, bästa våning och rekord.
- **Spelkänsla**: skadesiffror (gula vid krit), träffmarkör, brinnande och slöade fiender syns i färg, och fiender kan explodera i kedja.

## Skjutkänsla (efter `fps-shooter`-, `game-feel`- och `input-systems`-skillsen)

- **Lärbart rekylmönster:** varje automatvapen rycker i samma sidomönster under en salva, och hagelgevär och pistol knycker uppåt. Siktet återhämtar sig mot där du siktade, och första skottet går exakt dit hårkorset pekar.
- **Avståndsfall:** skadan är full på nära håll och sjunker till ett golv på långt håll, så att pistolen inte prickskjuter över hela banan.
- **Träffstopp:** tiden står nästan still ett ögonblick vid dödande träff, krit, elit och bossens fasbyten.
- **Skärmskak:** skakningen bygger på trauma² och mjuka svängningar i stället för slumpbrus, så små träffar knappt märks medan stora slår till.
- **Reaktionstid:** fiender väntar 0,35–0,8 s efter att de upptäckt dig innan de anfaller första gången.
- **Siktstöd på pekskärm:** kulan dras lätt mot en synlig fiende nära hårkorset, och vridningen saktar in när hårkorset ligger över en fiende.
- **Synfält och känslighet:** båda kan ställas in med reglage på startskärmen, `,` `.` och `[` `]` i spelet, och sparas.

Testerna körs med `node tools/gen-test.js` (alla biomer, slumpade biomer och alla bossarenor) och `node tools/cards-test.js`.
`node tools/gen-preview.js <biom|boss:arena|random> [frö] [djup]` skriver ut en våning som text, och `?biome=<id>` och `?boss=<id>` i adressen väljer biom och boss för test.
Fiendearken byggs med `tools/enemy-sprites/prep.py` och vapenkortens bilder med `tools/weapon-cards/make.py`.
`tools/cards-demo.html` visar kortgränssnittet fristående.

## Grundspelet (version 2)

De handgjorda banorna, banomstarten och det gamla sparade framsteget har ersatts av roguelike-systemen ovan.

Vapen och känsla
1. Vapnen sticker rakt fram från skärmens nederkant som i Doom och Quake 1, utan händer. De är renderade ur RetroWeaponPack.
2. Paketets egna skjutanimationer för slide och pump, plus en rekylknyck.
3. Magasin och omladdning (R): vapnet sänks ur bild och kommer upp igen.
4. Hagelgeväret laddas en patron i taget, och man kan avbryta omladdningen genom att skjuta.
5. Automatisk omladdning när magasinet tar slut.
6. Torrt klick när magasinet är tomt.
7. Vid vapenbyte sänks det gamla vapnet och det nya höjs upp.
8. Sikta med höger musknapp: vapnet flyttas in mot mitten, lätt zoom, mindre spridning och långsammare rörelse.
9. Mynningsflamman sitter vid vapnets verkliga mynning i varje bildruta.
10. Vapnet svajar efter musrörelser.
11. Vapnet gungar i takt med farten och lugnar sig mjukt när man stannar.
12. Vapnet ljussätts av platsen man står på och av mynningsblixten.
13. Tre ammotyper (9 mm, 5.56, patroner) med magasin/reserv i HUD:en.
14. Siktet vidgas när man rör sig och skjuter.
15. Träffmarkör vid träff, röd när fienden dör.
16. Kulnedslag på väggar med rikoschettljud.
17. Blodstänk vid träff.
18. Skärmskakning vid skott och när man tar skada.
19. Hagelgeväret gör mer skada på nära håll.

Fiender
20. Fiender hittar vägen runt hörn (avståndsfält från spelaren).
21. Fiender öppnar dörrar.
22. Eldskeletten kastar synliga eldklot som går att undvika.
23. Skottljud väcker fiender som kan nå dig, och fiender larmar varandra.
24. Fiender blinkar vitt när de träffas.
25. Döda fiender kan tappa ammunition eller hälsa.
26. Fiendernas sprites vänds efter rörelsen på skärmen och mot dig när de anfaller.
27. Man kan inte gå igenom fiender, och fiender klumpar inte ihop sig.
28. Närstridsattacker som missar hörs som ett svisch.

Världen
29. Eldfat med animerad eld som flimrande ljuskällor.
30. Ljuskarta: grundljus per bana, eldfat, mynningsblixtar, eldklot och ett svagt eget sken.
31. Dimma med egen färg per bana.
32. Krukor som går att skjuta sönder och som kan gömma föremål.
33. Hemliga väggar (E) med rustning, ammunition och hälsa bakom.
34. Rustning som tar halva skadan.
35. Ammolåda renderad från Styloo-paketet.
37. Grinden öppnas av sig själv när sista fienden dör.
38. Dörrar går inte att stänga på någon.
39. Spelaren börjar varje bana vänd mot den öppnaste riktningen.

Spelare och gränssnitt
40. Mjuk acceleration och friktion.
41. Kameran gungar när man går och sjunker när man dör.
42. Röd markering visar varifrån skadan kom.
43. Pulserande röd kant och andning vid låg hälsa.
44. Paus med P/Esc, och automatiskt när fönstret tappar fokus eller musen släpps.
45. Svårighetsgrad (Lätt, Normal, Svår) på startskärmen.
46. Banstatistik efter varje bana: fiender, hemligheter, föremål, tid och bonus.
49. Karta (M/Tab) som bara visar utforskade rutor, föremål och utgång.
50. Inställbar muskänslighet och volym som sparas.
51. Helskärm (O).
52. Upp till tre meddelanden visas samtidigt.
53. Positionsljud i stereo som dämpas bakom väggar.
54. Fotsteg i takt med farten.

## Gränssnittet och språket (efter moderna boomer shooters)
- **Språk:** spelet är på engelska som standard; svenska väljs under INSTÄLLNINGAR → SPRÅK / LANGUAGE (sidan laddas om). Källtexten är fortfarande svensk: `js/i18n.js` översätter varje text när den visas (canvas via `plain()`/`wrapText()`, DOM via en MutationObserver) med ordlistan `js/i18n_en.js`, först hela strängen och sedan bit för bit, så att sammansatta texter också blir engelska. Ordlistan byggs med `node tools/i18n/build.mjs` av `tools/i18n/en/part_*.json` (översatta bitar ur `node tools/i18n/extract.mjs`) och `tools/i18n/en/manual.json` (rättelser, vinner). `node tools/i18n/coverage.mjs` och `coverage_play.mjs` listar texter som fortfarande är svenska. Testerna kör på svenska (`?nolock=1` utan `&lang=en`).
- **HUD:** ingen statuslist; hälsa (kors + siffra) och skydd (sköld) i ena hörnet, ammo i det andra, inga etiketter. Ett kort meddelande i taget, fiendepresentationer bara "NEW ENEMY: NAMN", målet som en kort rad under minikartan, effekter som ikoner. På pekskärm ligger hörnen uppe.
- **Telefonen:** fem fasta knappar (avfyra, alt, hoppa, rusa, paus); ANVÄND, LADDA OM, GRANAT, DRYCK, FÖRMÅGA och LAMPA dyker upp när de går att använda. Tryck på ammo byter vapen, tryck på minikartan visar kartan. "ALLA KNAPPAR" i inställningarna ger tillbaka den gamla layouten.
- **Menyer:** startskärmen är en lodrät lista (PLAY, MODES, CUSTOMIZE, COLLECTIONS, SETTINGS) med undermenyer; CUSTOMIZE har en rad per inställning med ◀ ▶; pausen sex val; dödsskärm med RETRY/MENU; nivåslut med uppräkning och betyg; affär, kortval och andra dialoger visar ikon + namn + pris och beskrivningen bara för det markerade valet.
- **Verktyg:** `node tools/ui/shots.mjs <etikett>` tar skärmdumpar på dator, liggande och stående telefon (`LANG_UI=sv` för svenska). Tester: t97 (HUD), t98 (pek), t99 (menyer), t100 (dialoger), t101 (lägen och tillbaka-flöden), t102 (språket).

## Grafik och animationer

All rörelse är procedurell eller ritad i kod (inga nya renderingar). Varje del har ett eget block i `js/game.js` och en egen krok i `window.__game` med tillstånd, av/på och mätning. Allt det tunga stängs av med `settings.lowfx` (och det automatiska lågeffektläget); `noFlash`, `shake`, `bob` och minskad rörelse respekteras.

- **Vapnen (`__game.wfx`, `wproj`):** omladdning per vapentyp (magasin ut/in, pump med patroner, bruten pipa, tunga vapen, armborst, musköt), aktiv omladdning med snärt, vapenbyte med överslag, hylsor (röda för hagel), mynningsrök och glödande pipa, landningsdipp, språng- och sidledslutning, inspektion, svepspår för närstridsvapen och viloliv (glöd vid magiska vapens spets, vibrerande sågar, tändlåga, guldglimt på legendariska). Explosioner i flera steg (blixt, eldklot, rökmoln som dröjer, chockvåg, skräp, ljus som falnar), rök- och ljusspår på projektiler, fiendeskott med svans i sin färg och nedslag efter väggens material.
- **Fienderna (`__game.gfxE`):** squash & stretch och knuff vid träff, glöd före skott, andning och gångstuds, dödsglid med blodpöl, gibs efter material (kött, ben, slem, metall), spawn ur golvet, flygarskuggor, synliga statuseffekter (brinner, fryst, gift, blöder, rädd, bedövad, el), kontur på eliter, frysta fiender splittras i is och brinnande förkolnas. Bossar: tyngre träffar, fasbyte med chockvåg, död i flera steg och ett intro med band och namn som slår in.
- **Världen (`__game.gfxW`):** rinnande och pulserande vätskor, fladdrande ljus (styrka och radie), åska, luftpartiklar per biom, föremål som snurrar och glimtar, kistlock, dörr- och väggdamm, fällor, spakar och tryckplattor som rör sig, fotsteg som plaskar och dammar, en vajande fana, sotmärken efter explosioner, utgången som en ljuspelare och fiender som plaskar eller fräser när de dör i vätska.
- **Skärmen och menyerna (`__game.meny`):** levande kameraflykt genom en riktig bana bakom startskärmen, toning mellan våningar, HUD-juice (blink, skak, "+N"), skadebåge åt rätt håll, pulserande vinjett vid låg hälsa, färgade kanter vid upplockning, fartlinjer, gift/eld/under ytan, dödskamera som glider ned och lägger sig på sidan, "YOU DIED" som slår in, uppräkning och betygsstämpel, kort som delas ut och lyfts.
- **Verktyg och tester:** skript för före/efter-bilder och mätning i `tools/gfx/<del>/` (bilderna hamnar i `out/`, som inte checkas in). Tester: t103 (vapen), t104 (fiender), t105 (världen), t106 (skärmen och menyerna), t107 (projektiler och explosioner).

## Förbättringsloopen

Spelet har en självförbättrande loop för Claude Code i grafform: **mät → planera → (bygg ∥ testa blint) → sammanför och revidera → granska → checka in → lär**.

- **Mät:** `node tools/playtest/measure.mjs` kör bangeneratorns och kortens tester, hela speltestsviten och spelrobotar utan gudläge i varje biom, och skriver `tools/playtest/out/report.md`.
- **Planera, bygga, granska, slå ihop:** arbetsflödet `.claude/workflows/forbattra.js` (skillen `forbattra`) låter en planerare välja små, testbara förbättringar ur rapporten. För varje förbättring skriver en byggare koden medan en annan agent samtidigt skriver acceptanstestet utan att se koden; en sammanförare kör testet mot koden och skickar tillbaka till byggaren vid rött (högst två varv); en oberoende granskare läser diffen, och bara det som är grönt checkas in. Underkända ändringar sparas som patch och återställs.
- **Lär:** loopens minne är `tools/playtest/LOOP_NOTES.md` (backlogg, historik, lärdomar), som varje runda läser och uppdaterar.
- **Testriggen:** `tools/playtest/` (Playwright-tester, bottar), `tools/artifact/` (bygget av claude.ai-artefakten med stabila paket och tester för dator och telefon).

## Version 3: biomer, väktarrum och 100 förbättringar

### Biomerna ser och låter olika
| Biom | Färgton och dimma | Väder och partiklar | Ljud | Fotsteg |
|---|---|---|---|---|
| Kryptan | varm, gulbrun | dammkorn i ljuset | dovt mullrande och viskningar | sten |
| Grottorna | kall, blågrön och tät dimma | droppar från taket, fladdermöss | droppande vatten | grus |
| Kyrkogården | blåaktig natt | markdimma, irrbloss och blixtar med åska och kyrkklockor | vind | grus och gräs |
| Skogen | grön | fallande löv och eldflugor | vind och grodor | gräs |
| Borggården | neutral | regn som skvätter | regn | sten och trä |

Varje biom har också egna föremål i rummen, till exempel kistor och kandelabrar i kryptan, kristaller och svampar i grottorna och bord och lådor i borggården.

### Rummen
- Inga rum är tomma, och inget rum har bara en fiende: varje rum utom startrummet har antingen minst två fiender eller något särskilt (brunn, altare, skatt, butik eller fälla).
- **Föremål** (`tools/props/make.py`):
  - *Kandelabrar, kristaller och svampar* lyser upp sin omgivning.
  - *Likkistor, benhögar, bokhyllor, statyer, burar, rustningar och bord* står i vägen och tar kulor.
  - En *helande brunn* ger 40 HP en gång.
  - Ett *förbannat altare* ger 60 guld och ett förbannat kort, om man vågar.
  - *Spikfällor* skjuter upp var tredje sekund. De klickar strax innan och skadar både dig och fienderna.
  - *Krutfat* exploderar när man skjuter på dem och kan sätta igång en kedjereaktion.
  - *Lådor* går sönder av skott och sparkar och kan innehålla ammo, hälsa, guld eller en rustningsskärva.
- **Mimics**: kistor med tänder. De ligger stilla tills man kommer nära, försöker öppna dem eller skjuter på dem.

### Väktarrum och bossrum
- **Väktaren**: varje vanlig våning har ett väktarrum. Där väntar en av de andra bossarna i mindre format, och rummet har väggar och golv som passar den bossen:
  - Bendemonen: blodröda tegelväggar med dödskallefris och ett blodigt golv.
  - Helvetesbesten: basalt med glödande lavasprickor.
  - Mardrömmen: blå runor bakom ett smidesstaket och ett jordgolv med blått sken.
  - Ogern: en timmerpalissad med dödskallar och djurhudar och ett golv av trampad lera.
  - Vålnaden: kall kapellsten med en blekt fresk och ett marmorgolv med blått sken.

  När väktaren vaknar slår dörrarna igen, bossmusiken börjar och väktarens egen livmätare visas. Väktaren har bossens anfall och faser. Besegrar man den öppnas dörrarna och portalen till nästa våning, och man får väktarens skatt (ett kortval) plus guld och själar.
- **Bossarenan** på våning 6, 12 och så vidare har samma texturer som sin boss.

### 100 förbättringar
**Strid och känsla**
1. Spark (V, eller E när det inte finns något att använda): knuffar fiender och slår sönder krukor och lådor.
2. Aktiv omladdning: tryck R igen i rätt ögonblick för en snabbare omladdning och +15 % skada på magasinet.
3. Missar man ögonblicket kärvar vapnet och omladdningen tar längre tid.
4. En omladdningsmätare under hårkorset visar ögonblicket.
5. Vapnets namn visas när man byter.
6. Q byter till förra vapnet.
7. Tomhylsor flyger ut och studsar.
8. Synfältet ger en liten stöt vid varje skott.
9. Vapnet gungar lätt i takt med andningen när man står still (kan stängas av).
10. Ett torrt klick när sista skottet går.
11. Ett tydligare ljud när man träffar och när man dödar.
12. Multikills (DUBBELT, TRIPPEL, FYRDUBBELT, MASSAKER) ger extra guld.
13. Fiendernas eldklot och klot går att skjuta ned.
14. Blodpölar blir kvar på golvet.
15. Större siffror vid kritiska träffar.
16. Varning när ammon håller på att ta slut.
17. Explosioner lyser upp rummet och skärmen blixtrar till.
18. Hårkorset blir rött över en fiende.
19. Träffar knuffar fiender bakåt.
20. Brinnande, förgiftade och frusna fiender har egna partiklar.

**Fiender**
21. Livmätare över skadade fiender.
22. Ett "!" när en fiende upptäcker dig.
23. Fiender flankerar i stället för att alla gå rakt mot dig.
24. Magiker och shamaner flyr när du kommer nära.
25. Brinnande fiender får panik och springer runt.
26. Ny elitegenskap: teleporterande.
27. Ny elitegenskap: läkande.
28. Ny elitegenskap: sköld som tar skadan först.
29. Från varv 2 kan eliter ha två egenskaper.
30. Eliter kan tappa ett kortval.
31. Bossen tappar ett bättre kortval (bossens skatt).
32. Bossintro med titel och slow motion.
33. Bossarna varnar innan sina stora anfall.
34. Egna dödsljud för varje fiendetyp.
35. Mimics.

**Världen**
36. Krukor kan innehålla en jackpott.
37. Rustningsskärvor (+10 rustning) i krukor och lådor.
38. Hälsa droppar oftare när du har lite HP kvar.
39. Ammolådor ger 50 % mer till vapnet du håller.
40. Kistorna blir bättre ju djupare du kommer.
41. Guld i närheten följer med när du går in i portalen.
42. Guldhögar glittrar.
43. Utgången och portalerna lyser.
44. Det drar damm vid hemliga väggar.
45. Eldfaten sprakar.
46. Dörrar öppnas när man går in i dem.
47. En kompasspil pekar mot portalen.
48. Helande brunnar.
49. Förbannade altaren.
50. Spikfällor.
51. Krutfat med kedjereaktioner.
52. Lådor som går sönder.
53. Lysande kandelabrar, kristaller och svampar.
54. Möbler och dekor: likkistor, benhögar, bokhyllor, statyer, burar, rustningar och bord.
55. Väktarrum med en miniboss på varje vanlig våning.

**Skärm och menyer**
56. Kartan har tre lägen: av, liten i hörnet eller stor (M/Tab eller kartknappen). Valet sparas.
57. Kartan visar fiender som syns och väktaren och bossen när man sett deras rum.
58. Kartan visar brunnar, altaren, krutfat och möbler i egna färger.
59. Aktiva effekter visas nere till vänster.
60. Hjärtslag hörs när hälsan är låg.
61. Mobilen vibrerar vid skada (kan stängas av).
62. Statistiken efter våningen visar hur mycket du utforskat, träffsäkerhet och skada du tagit.
63. En karta över varvet i statistiken visar var du är.
64. 21 tips mellan våningarna.
65. Sammanfattningen efter rundan visar favoritvapen och träffsäkerhet.
66. Ett stort titelkort med våningens namn och biom.
67. Pausen visar dina bonusar.
68. Profil med statistik för alla rundor.
69. FPS-räknare (val i inställningarna).
70. Bestiarium med alla fiender du dödat och bossar du besegrat.
71. 20 prestationer som ger 10 själar var.
72. Topp 5-lista.
73. Historik med biom och vad du dog av.
74. Väktarens egen livmätare och titel.
75. Enter startar en ny runda från startskärmen.

**Inställningar** (startskärmen, I i pausen eller kugghjulet på mobilen)
76. Skärmskakning: av, låg eller full.
77. Hårkorsets form: kors, punkt eller cirkel.
78. Hårkorsets färg.
79. Ljusstyrka.
80. Känslighet, synfält och volym på samma ställe.
81. Spelet pausas när fönstret tappar fokus eller fliken byts.
82. Minskade effekter (färre partiklar).
83. Vapnets gungning kan stängas av.
84. Vänsterhänt mobillayout och justerbar knappstorlek.
85. Inställningar och "ge upp" går att nå från pausen, också på mobilen.

**Progression**
86. Själaaltaret: fem bestående uppgraderingar köps med själar (mer HP, startguld, startammo, startrustning och ett extra val av startkort).
87. Ny svårighetsgrad: MARDRÖM.
88. Dagens runda har en dagens utmaning: Glaskanon, Guldfeber, Mörkret, De snabba döda eller Elitjakten.
89. Butiken: rensa bort ett kort ur leken.
90. Butiken: mysteriekort som är minst sällsynt.
91. Profilen räknar dödade fiender, speltid och dödade per vapen.
92. Varje besegrad boss räknas per typ.
93. Väktare och bossar ger själar.
94. Ge upp rundan (G i pausen) och behåll själarna.
95. Snabbhetsbonus: en våning på under 2 minuter ger 20 guld.
96. Orörd-bonus: en våning utan skada ger 40 guld.
97. Alla hemligheter på en våning ger 30 guld.
98. Prestationer ger själar.
99. Väktarens skatt: ett kortval.
100. Väktarrummets dörrar förseglas tills väktaren är besegrad, och sedan öppnas portalen.

## Version 4: 350 förbättringar

Den här versionen lägger till 350 förbättringar. Grafiken för de nya fienderna och föremålen ritas med `tools/props2/make.py`, ljuden och musiken byggs med `tools/sounds/make2.sh`, korten med `tools/card-art/make.py`, och bangeneratorn har en ny biom (Träsket) och nya rumstyper.

**Rörelse (1–15)**
1. Hopp (Space), E = använd
2. Ducka (Ctrl): lägre kamera, tystare steg och mindre mål för eldklot
3. Rusning (Z eller dubbeltryck på riktning) med kort osårbarhet
4. Uthållighet: spring och rusning drar uthållighet, mätare i HUD
5. Glidning: ducka under spring = glid
6. Kameran lutar vid sidosteg (inställning)
7. Explosioner knuffar spelaren
8. Halt på is
9. Långsammare i vatten och lera
10. Spindelnät saktar ned
11. Hoppa över spikfällor och lava
12. Synfältet vidgas när man springer
13. Kameran skakar till vid landning
14. Vapnet sänks när man springer
15. Hoppa över låga anfall (ogerns stenring, lavavågen, rullande stockar)

**Strid och vapen (16–50)**
16. Granater (F): kastas i båge, studsar och sprängs
17. Granater på våningarna, i krukor och i butiken
18. Håll F längre för att kasta längre
19. Kulhål i väggarna
20. Gnistor där kulor träffar väggar och dörrar
21. Spårljus för gevär och prickskyttegevär
22. Mynningsrök
23. Lik sprängs i bitar av explosioner
24. Överdöd sprängs i bitar
25. Blodstänk på väggar bakom träffade fiender
26. Bakhåll: +50 % skada på fiender som inte sett dig
27. Vapeninspektion (X)
28. Upplockad ammo, hälsa, rustning, guld och granater visas som flytande text
29. Byt automatiskt till ett nyss upplockat vapen (inställning)
30. Vapnet laddas om automatiskt efter en stund utan skott (inställning)
31. Kolvslag när allt ammo är slut
32. Smedjan: uppgradera vapnets skada (3 nivåer)
33. Vapennivån syns i HUD
34. Kritiska träffar har eget ljud
35. Fiender som träffas mitt i språnget snubblar
36. Explosioner lämnar sotfläckar
37. Signalpistolens bloss lämnar brinnande mark
38. Frusna fiender splittras när de dör
39. Kombomätare: snabba dödanden i följd ger mer guld
40. Slow motion när sista fienden på våningen dör
41. Ammolådor i tre storlekar
42. Hagelspridningen syns i siktet
43. Reservammon blinkar rött när den är slut
44. Låg HP: bilden gråas och ljudet dämpas
45. Frysning som ny statuseffekt (kort och fiender)
46. Gift som statuseffekt även från kort
47. Blixt som kedjar mellan fiender (kort)
48. Granater skadar inte dig själv på lätt
49. Granaten piper innan den smäller
50. Kulor genom krukor och lådor fortsätter (genomslag)

**Fiender (51–85)**
51. Spindel: snabb, skjuter nät som saktar ned
52. Fladdermussvärm: små och snabba, flyger i flock
53. Helvetshund: jagar i flock och hoppar
54. Bombskelett: springer fram och sprängs
55. Sköldbärare: blockerar skott framifrån
56. Svampman: släpper giftmoln
57. Levande rustning: rustningsställningar som vaknar
58. Patrullerande fiender
59. Sovande fiender (Zzz) som går att smyga förbi
60. Fiender hör dina fotsteg när du springer (gå eller ducka för att smyga)
61. Explosioner väcker sovande fiender
62. Vissa fiender viker undan när du siktar på dem
63. Skyttar siktar framför dig när du springer
64. Fiender flyr när de har lite HP kvar
65. Fiender springer från granater
66. Fiender saktas ned av vatten och nät (utom spindlar och fladdermöss)
67. Fiender undviker spikfällor, lava och eld
68. Fiender knuffas av explosioner
69. Champions: sällsynta gyllene fiender med mycket guld
70. Ny elitegenskap: delande
71. Ny elitegenskap: giftig (förgiftar dig vid träff)
72. Ny elitegenskap: frostaura
73. Ny elitegenskap: flimrande (svår att se)
74. Eliter har en glödande aura
75. Veteraner: fiender i djupare varv får färg och mer HP
76. Brända fiender blir aska
77. Fiender letar där de senast såg dig ("?")
78. Fiender som tappat dig ger upp efter ett tag
79. Fiendeskott glöder tydligare
80. Röd varningspil när en fiende anfaller bakifrån
81. Bombskelettens explosioner skadar även andra fiender
82. Fiendernas livmätare färgas av frysning, gift och brand
83. Bestiariet visar fiendens bild
84. Bestiariet visar fiendens HP, skada och fart
85. Fiender ger ifrån sig ljud när de är nära (andning, fotsteg)

**Bossar och väktare (86–105)**
86. Bendemonen: meteorregn
87. Bendemonen: dykanfall
88. Helvetesbesten: lavavåg som man hoppar över
89. Helvetesbesten: studsande magmabollar
90. Mardrömmen: skuggkloner
91. Mardrömmen: mörkret – ljuset slocknar en stund
92. Ogern: stenar faller från taket med skuggor som varning
93. Ogern: rullande stockar
94. Vålnaden: spegelbilder
95. Vålnaden: jagande dödskallar
96. Bossar blir yra (stagger) efter många träffar i följd
97. Bossens livmätare visar fasgränser
98. Bossen hånar dig
99. Väktaren tappar en relik med mycket bättre kortval från varv 2
100. Bossens livmätare visar skadan i en fördröjd stapel
101. Bossarenan mörknar och tänds i fas 3
102. Bossmusiken växer i intensitet med fasen
103. Ilskemätare: bossen blir snabbare om striden drar ut
104. Bossrush-läge från startskärmen (alla fem i rad)
105. Tid för bosstriden visas och sparas som rekord

**Kort (106–165)**
106–155. 50 nya kort (20 vanliga, 15 ovanliga, 10 sällsynta, 5 legendariska, varav 4 förbannade), bland annat Drakägget, Frostmolnet, Åskstaven, Gryningskorset och Den ansiktslöse.
156. Kortset: tre kort ur samma set ger en bonus (6 set)
157. Setbonusen syns i kortleken
158. Synergimärke i kortvalet när kortet passar dina kort
159. Förvisa: ta bort ett kort ur poolen i kortvalet (en gång per våning)
160. Nya kort för guld i kortvalet
161. Kortarkiv: alla kort du sett, med låsta kort som skuggor
162. Kortleken går att sortera (sällsynthet, namn, typ)
163. "NY" på kort du aldrig sett
164. Legendariska kort skimrar
165. Kort visar sina siffror tydligt med färgade plus och minus

**Föremål och interaktion (166–195)**
166. Smedjan (skada på vapnet)
167. Spåaltaret: en slumpad välsignelse eller förbannelse
168. Fångar i bur: befria för en belöning
169. Utmaningsaltaret: överlev tre vågor för en skatt
170. Spakar som öppnar järngaller
171. Låsta dörrar och nycklar
172. Spruckna väggar som sprängs upp
173. Pilfällor (tryckplattor)
174. Gasventiler
175. Offerskålen: betala HP för ett kort
176. Lava (bränner)
177. Vatten (saktar ned, plaskar)
178. Is (halt)
179. Spindelnät (saktar ned, brinner upp)
180. Skattkarta som visar hela våningen
181. Krutfat kan sparkas iväg
182. Ljus kan skjutas sönder (mörkare rum)
183. Kistor kan vara låsta (kräver en nyckel)
184. Brunnen lyser rött på kartan tills den är använd
185. Dörrar kan sparkas upp (V)
186. Bokhyllor kan innehålla ett gömt kort
187. Statyer kan ha guld i sockeln (sparka)
188. Kistor skakar och glittrar när de innehåller något sällsynt
189. Föremål som går att använda visar "E" och vad de gör när man står nära
190. Guld dras till dig när du rusar förbi
191. Föremål som fiender tappar studsar ut ur dem
192. Krukor kan innehålla granater och nycklar
193. Brinnande nät och eld sprider sig till nät intill
194. Lavan lyser upp rummet
195. Vatten speglar ljuset (blänk)

**Banor och biomer (196–230)**
196. Ny biom: Träsket (utomhus, vatten, dimma, ruttna träd)
197. Träskets väggar och golv
198. Träskets ljud och musik (grodor, droppar, egen musikslinga)
199. Träskets väder: dimma och eldflugor
200. Träskets rum: hyddor på pålar, bryggor, ödehus
201. Lavarum i grottorna
202. Frusna rum i kryptan
203. Översvämmade rum
204. Spindelrum med nät
205. Fällgångar med pilfällor
206. Gasrum
207. Hemliga rum bakom spruckna väggar
208. Låsta skattrum med nyckel någon annanstans på våningen
209. Spakrum: spak öppnar galler till en skatt
210. Smedjerum
211. Spåaltare
212. Fångrum
213. Utmaningsrum
214. Offerskålar
215. Nya fiender placeras efter biom (spindlar i grottor, fladdermöss, hundar i skogen …)
216. Fiender sover eller patrullerar när våningen börjar
217. Granater och skattkartor placeras ut
218. Fler rumsformer: dubbelrum med valv, pelarsalar
219. Bossarena: Träsket (ny arena)
220. Blodmåne: sällsynt våning med röd himmel, starkare fiender och dubbelt guld
221. Dimnatt: tät dimma men fler skatter
222. Jordbävning: stenar faller ibland från taket
223. Mörk våning: bara facklor lyser
224. Guldregn: mer guld men fler fällor
225. Våningens händelse visas på titelkortet
226. Himmel med moln som rör sig
227. Stjärnfall på utomhusvåningar
228. Månen syns på himlen
229. Facklorna fladdrar i vinden utomhus
230. Väggar i mörka hörn får spindelväv (dekaler)

**Händelser och utmaningar (231–250)**
231. Vågor i utmaningsrummet med räknare
232. Tidsutmaning: hinn till portalen på tid för en bonus
233. Jakt: döda den märkta eliten för en belöning
234. Vandrande köpman som dyker upp ibland
235. Tärningsspel hos dödgrävaren: satsa 30 guld
236. Spöket som ber om sina ben (hitta benhögen)
237. Förbannad kista: öppna och möt en fälla eller skatt
238. Hemlig nivå: guldkammaren (sällsynt portal)
239. Varvets bonusuppdrag visas i pausen
240. Belöning för att döda alla fiender på en våning
241. Belöning för att hitta alla kistor
242. Belöning för att inte använda hälsa
243. Dagens runda har en egen topplista
244. Veckans utmaning: samma frö hela veckan och två förbannelser
245. Förbannade våningar: ta en förbannelse för 60 guld
246. Portalen visar vart den leder (nästa biom eller bossen)
247. Mimic-jakt: hitta och döda mimicen
248. Befriade fångar ger dig granater, guld och ibland en nyckel
249. Spöklika ekon av din förra död (där du dog senast)
250. Händelselogg i pausen

**Ljud och musik (251–270)**
251. Musik per biom (loopar)
252. Musiken blir intensivare i strid
253. Eget eko (reverb) i grottor och kryptor
254. Separata volymer för musik, effekter och miljöljud
255. Ljud för hopp och landning
256. Ljud för rusning
257. Ljud för granater (kast, studs, pip)
258. Ljud för spakar, lås och nycklar
259. Smedjans klang
260. Lavans fräsande
261. Fladdermöss, hundar och spindlar har egna ljud
262. Bombskelettets stubin
263. Sköldklang när skott studsar
264. Gongen när en utmaning börjar
265. Menyljud vid hovring och klick
266. Kulor som träffar väggar låter
267. Fanfar när rundan vinns
268. Dödsklang när man dör
269. Ljud dämpas när du är under vatten eller har låg HP
270. Upprepade ljud varierar i tonhöjd

**Skärm och grafik (271–300)**
271. Uthållighetsmätare
272. Granaträknare i HUD
273. Nyckelikon i HUD
274. Pilar vid kanten som visar väktare och eliter utanför bilden
275. Mål-text ("BESEGRA VÄKTAREN", "HITTA PORTALEN")
276. Skadeindikatorn färgas efter typ av anfall
277. Valfri timer för våningen
278. Livmätaren visar förlorad hälsa i en fördröjd stapel
279. Rustningen spricker synligt när den tar slut
280. Guld som plockas upp visas som +siffror
281. Kortbanderoll när du får ett kort
282. Aktiva tidsbegränsade effekter visar nedräkning
283. Undertexter för ljud ("[MORRANDE TILL VÄNSTER]")
284. Bilden får frost- eller giftkanter när du är saktad eller förgiftad
285. Fotoläge (K): göm allt och frys bilden
286. Skärmbild med F12/knapp sparas som PNG
287. Kartmarkör (högerklick på stora kartan eller B)
288. Stora kartan har teckenförklaring
289. Kartan ramar in specialrum (butik, väktare, brunn, skatt)
290. Kartan roterar med spelaren (inställning)
291. Krutfat och fällor syns på kartan när de setts
292. Interaktiva föremål blinkar på kartan
293. Fiendernas livmätare kan stängas av
294. Skadesiffror kan stängas av
295. Vattnet och lavan är animerade
296. Ljuskällor (ljus, kristaller, svampar, altare) har en glöd
297. Fiender kastar en mörk skugga på golvet
298. Föremål på golvet glänser
299. Portalen drar in partiklar
300. Dödsskärmen visar vad som dödade dig

**Menyer och meta (301–330)**
301. Klasser: Krigaren, Prickskytten, Alkemisten, Plundraren (olika start)
302. Klasser låses upp med själar eller prestationer
303. Uppstigning: MARDRÖM 1–5 med växande förbannelser
304. Fem nya uppgraderingar i själaaltaret
305. 30 nya prestationer
306. Prestationer visar framsteg (12/100)
307. Statistik per fiende i bestiariet
308. Statistik per vapen i profilen
309. Rekord per biom
310. Snabbaste seger sparas
311. Övningsläge: välj biom och boss
312. Poängmultiplikator efter varv 3 (oändligt djup)
313. Rundans graf över HP och guld per våning
314. Startskärmen har egen musik
315. Senaste fröet kan kopieras
316. Spela igen med samma frö
317. M i pausen visar hela kartan
318. Profilen kan exporteras och importeras
319. Nyheter i spelet (vad som är nytt) på startskärmen
320. Handbok: hur allt fungerar, i spelet
321. Kontrollschema i pausen
322. Bekräftelse innan en ny runda skriver över en pågående
323. Varvskartan visar biomernas namn
324. Topplista för dagens runda
325. Själar visas med animation efter rundan
326. Kortarkivet nås från startskärmen
327. Rundsammanfattning visar kort du hade
328. Klassens färg syns i HUD
329. Uppstigningsnivå syns i pausen
330. Tips anpassas efter vad du dog av

**Inställningar och tillgänglighet (331–350)**
331. Handkontroll (gamepad): gå, sikta, skjut, alla knappar
332. Vibration i handkontrollen
333. Byt tangenter
334. Håll eller växla spring
335. Siktstöd på mobil och handkontroll
336. Automatiskt skott när siktet ligger på en fiende (mobil, valfritt)
337. Gyro-sikte på mobil
338. Färgblindlägen (3)
339. Minskade blixtar
340. Textstorlek
341. Mjuk eller pixlig uppskalning
342. Effekterna minskas automatiskt vid låg FPS
343. Fast eller flytande joystick
344. Knapparnas genomskinlighet
345. Skärmen släcks inte under spel (Wake Lock)
346. Undertexter av/på
347. Ljudsignaler för fiender bakom dig (tillgänglighet)
348. Musik av/på
349. Kartans storlek
350. Återställ alla inställningar

## Version 5: 200 nya förbättringar

Version 5 lägger till 200 förbättringar. Nya bilder ritas med `tools/props3/make.py` och `tools/weapon-frames`, ljud och musik byggs med `tools/sounds/make3.sh`, korten med `tools/card-art/make.py`. Bangeneratorn har fått biomen Frostfästet, en isarena, NPC:er, djurburar, drycker och istappar.

**Nya vapen (1–20)**
1. Yxan (å): närstrid utan ammo, ett svep som träffar flera fiender
2. Håll inne för ett laddat slag som slungar fiender
3. Högerklick kastar yxan, som kommer tillbaka
4. Eldkastaren (ä): kontinuerlig låga som tänder eld, eget bränsle
5. Eldkastaren bränner nät och tänder krutfat
6. Eldkastarens låga lyser upp omgivningen
7. Granatkastaren (ö): studsande granater, egen ammo
8. Sikta med granatkastaren så smäller granaten vid första träffen
9. Bärsärkens ed: pakt för yxan med fyra unika uppgraderingar
10. Mordbrännarens ed: pakt för eldkastaren med fyra uppgraderingar
11. Sprängmästarens ed: pakt för granatkastaren med fyra uppgraderingar
12. Nya ammotyper (BRÄNSLE, GRANATER) i HUD och ammolådor
13. Vapenhjulet: håll Q och peka med musen (tiden saktar ned)
14. Vapnets skada och eldhastighet visas när du byter
15. Eliter kan tappa vapen (sällsynt)
16. Dödgrävaren säljer vapen
17. Siffertangenterna når alla elva vapen (0 = tionde, § = elfte)
18. Mobil: dra på byt-knappen för att byta, håll den för vapenhjulet
19. Träffstopp, skak och slagljud för närstrid
20. Yxan blockerar eldklot medan du laddar

**Nya fiender (21–40)**
21. Ghoul (Å): snabb, äter lik för att läka
22. Kultist (Ä): förbannar dig på håll (du gör mindre skada en stund)
23. Gargoyl (Ö): sitter som en staty, vaknar och flyger
24. Isvarg (É): jagar i flock, bettet saktar ned
25. Irrbloss (Ü): svävande blå låga som sprängs i frost
26. Ghouler söker sig till lik i närheten
27. Kultister offrar en annan fiende för att stärka sig
28. Gargoyler tar halv skada från kulor men full skada från explosioner och närstrid
29. Isvargar ylar och kallar på flocken
30. Irrbloss fryser marken där de sprängs
31. De nya fienderna finns i bestiariet med bild och tips
32. Ny elitegenskap: speglande (skickar tillbaka en del av skadan)
33. Ny elitegenskap: kallande (kallar på hjälp vid låg hälsa)
34. Ny elitegenskap: smygande (osynlig tills den anfaller)
35. Fiender som stärkts av en kultist lyser lila
36. Mörkerfiender undviker starkt ljus
37. Fiender glider på is
38. Fiender flyr från eldkastaren
39. Lik som ghouler äter försvinner
40. Fiendernas anfall blinkar till en kort stund innan de slår

**Frostfästet (41–55)**
41. Ny biom: Frostfästet, med frusna murar, snöiga gårdar under öppen himmel och isiga salar
42. Frusna stenmurar, isväggar, snögolv och frostiga golvplattor
43. Snöfall
44. Fotspår i snön
45. Andedräkten syns i kylan
46. Egen musik med ett intensitetslager och kall vind
47. Rumstyper: istronsal, frusen sjö, kasern och kristallsal
48. Frusna sjöar där man glider
49. Kylan: står du still ute för länge börjar du frysa; eld och rörelse värmer
50. Eldfat har en synlig värmeaura
51. Frostfästets väktarrum och bossarena
52. Is spricker under tunga steg
53. Fotsteg i snö
54. Istappar faller när man skjuter dem
55. Eget namn och titelkort

**Ny boss (56–65)**
56. Den sjätte bossen, Isdraken, med en egen arena: en ishall med en frusen sjö
57. Isskärvor i solfjäder
58. Ett slag som får istaggar att skjuta upp ur marken
59. Snöstorm i fas 2 och 3
60. Två specialanfall: en frostvåg som du hoppar över, och irrbloss som den kallar på
61. Egna väggar och golv i väktarrum och arena
62. Egen bossmusik och eget vrål
63. Isdraken är med i bossrushen (sex bossar)
64. Isdraken kan vakta vanliga våningar som väktare
65. Bossrekord och bestiarium för den nya bossen

**Följeslagare (66–75)**
66. Korpen hämtar guld och föremål åt dig
67. Lyktan lyser upp mörkret, visar fällor och avslöjar smygande eliter
68. Vargvalpen biter fiender
69. Välj följeslagare på startskärmen när den är upplåst
70. Följeslagarna låses upp i själaaltaret (FLOCKEN)
71. Följeslagaren går upp i nivå (1–5) under rundan
72. Djurburen (©) på våningarna: befria en ny följeslagare för rundan
73. Följeslagaren syns på kartan
74. Egna ljud för korp, lykta och valp
75. Följeslagaren kan inte dö, men vilar en stund om den skadas för mycket

**Drycker (76–90)**
76. Två dryckesplatser: H dricker, J byter ordning
77. Läkedryck (+50 HP)
78. Raseridryck (+50 % skada i 8 s)
79. Osynlighetsdryck (fienderna tappar dig i 6 s)
80. Snabbhetsdryck (+40 % fart i 8 s)
81. Isdryck (fryser fiender runt dig och ger rustning)
82. Okända drycker: effekten visas först när du har druckit sorten en gång
83. Drycker finns i krukor, kistor, bokhyllor och hos alkemisten (¥ på kartan)
84. Alkemisten (£) säljer drycker och blandar två till en stark dryck
85. Dryckernas effekter syns som färg i bilden
86. Ljud för att dricka och för varje effekt
87. Mobil: dryckesknapp
88. Handkontroll: dryck på D-pad nedåt
89. Kort som gör dryckerna starkare eller vanligare
90. Dryckerna syns som ikoner i bildens nedre vänstra hörn

**NPC:er och val (91–105)**
91. Prästen (€) lyfter ett förbannat kort mot guld
92. Prästen kan välsigna dig (+20 max HP och full hälsa) en gång per runda
93. Vägval: ibland två portaler mot olika biomer
94. Portalen visar biomen och om vägen är lugn, farlig eller svår (mer guld)
95. Kartografens karta hos dödgrävaren visar hela nästa våning
96. Dödgrävaren säljer ibland ett vapen redan på de första våningarna
97. Köpmannen ger 15 % rabatt om du inte har tagit skada på våningen
98. NPC:er säger något när du kommer nära
99. Fångar kan följa med och slåss för dig resten av våningen
100. Skugghandlaren syns bara i mörker och ger rabatt
101. Utmaningsaltaret har tre svårighetsgrader (2, 3 eller 5 vågor)
102. Spåaltaret spår vilken boss som väntar
103. Brunnar kan vara förgiftade (grönt vatten)
104. Bokhyllor kan gömma en dryck
105. Offerskålen kan ge en följeslagare

**Kort (106–145)**
106–135. 30 nya kort (12 vanliga, 9 ovanliga, 6 sällsynta och 3 legendariska, varav 2 förbannelser) med nya bonusar: dryckesstyrka, fler drycker, följeslagarstyrka, närstridsskada, brandskada, köldskydd, huvudträffar, blödning, allierade, ljusradie, vapentapp och NPC-rabatt
136. Två nya kortset: ALKEMISTENS LÄRA och FLOCKENS BAND
137. Kortfusion: två likadana kort smälts samman till ett starkare (+)
138. Kortleken visar statistik per kort: skada, dödade och hur ofta det valts
139. Statistiken per kort samlas in under rundan och i profilen
140. Kortvalet visar "DU HAR n" för kort du redan har
141. Banderollen för nya kort har en ram i kortets raritetsfärg
142. En svår utmaning bryter en förbannelse
143. Legendariska kort skakar och glöder när de visas
144. Bossens kortval har alltid ett legendariskt alternativ
145. Kortarkivet visar hur många gånger du har valt varje kort

**Strid och känsla (146–165)**
146. Färgat ljus: eld, lava, kristaller och portaler färgar rummet
147. Fiender har glödande ögon i mörker
148. Skadade fiender lämnar blodspår
149. Mynningsflammans ljus har vapnets färg
150. Vattenringar när du går i vatten
151. Damm när du landar efter ett hopp
152. Facklor ryker
153. Facklor gnistrar
154. Irrbloss löses upp när de dör
155. Mjukare rekylåterhämtning
156. Träffmarkören visar dödande träffar och huvudträffar i egna färger
157. Ett tydligare ljud när en fiende dör
158. Skadesiffror från snabba träffar slås ihop
159. Fiender blinkar orange vid bakhåll
160. Explosioner skakar kameran efter avstånd
161. Varningsljud när ammunitionen tar slut
162. Huvudträffar: en träff mitt i fienden med ett enkelskottsvapen ger +50 %
163. Huvudträffar visas med en stjärna och ett eget ljud
164. Döda fiender rycker till en sista gång
165. Bossar och väktare lämnar en krater när de dör

**Meta och lägen (166–185)**
166. Ny klass: Nekromantikern (döda fiender kan resa sig som allierade)
167. Ny klass: Jägaren (armborst och en vargvalp)
168. Utmaningslägen: Ett slag (1 HP), Bara pistol och Inga kort
169. Utmaningslägena ger egna prestationer och fler själar
170. 20 nya prestationer
171. Snabbstart: Enter på slutskärmen startar direkt en ny runda
172. Dödsrapport: vem som skadade dig mest
173. Rundans tidslinje på slutskärmen
174. Färgteman för HUD (klassisk, blå, grön, guld)
175. Vapenfärger som låses upp med prestationer
176. Sparad statistik: total skada, längsta kombo, flest dödade på en våning och i en runda
177. Nya personliga rekord visas på slutskärmen
178. Startskärmen visar dagens frö och hur länge det gäller
179. Djupmätare: hur djupt du är jämfört med ditt rekord
180. Själarna syns i pausen
181. Dagens belöning: första rundan varje dag ger 15 själar
182. Nekromantikerns allierade syns som gröna gestalter
183. Ny uppgradering i själaaltaret: följeslagare
184. Ny uppgradering: en tredje dryckesplats
185. Ny uppgradering: börja rundan med en läkedryck

**Tillgänglighet, mobil och övrigt (186–200)**
186. Stor text i HUD (inställning)
187. Konturer runt fiender (inställning)
188. Enhandsläge på mobil: knapparna flyttas till höger och en GÅ-knapp går framåt
189. Siktets storlek
190. Fokusläge: miljöljuden dämpas i strid
191. Pausa när mobilen vrids till stående (inställning)
192. Kontrollerna visas på laddningsskärmen
193. Mobil: håll kartknappen för att se hela kartan
194. Mobil: dubbeltryck på bilden för att hoppa (inställning)
195. Vibrationsmönster för olika händelser
196. Inställningarna sparas per enhet (mobil och dator)
197. Laddningsskärm med förloppsstapel
198. Ljuden hämtas i bakgrunden medan du är på startskärmen
199. Felrapporten i profilen kan kopieras
200. Version och nyheter visas på startskärmen

## Version 6: 200 nya förbättringar

Version 6 lägger till 200 förbättringar:
- **Bilder:** ritas med `tools/props4/make.py` och `tools/weapon-frames`.
- **Ljud och musik:** byggs med `tools/sounds/make4.sh`.
- **Kort:** byggs med `tools/card-art/make.py`.
- **Bangeneratorn:** har fått biomen Vulkanen, en vulkanarena, hemliga våningar (`Gen.secret`), fällor, lägereldar, anslagstavlor och runstenar.

**Nya vapen (1–20)**
1. Spikgeväret (é): snabba spikar som projektiler
2. Spikar nålar fast fiender mot väggen
3. Spikarna studsar ibland mot sten
4. Blixtstaven (ü): kedjeblixt mellan fiender
5. Staven använder MANA som laddas av sig själv, även när staven ligger i fickan
6. Högerklick laddar ett blixtklot som zappar allt i närheten
7. Långbågen (ñ): håll för att spänna, släpp för att skjuta
8. Fullt spänd båge gör dubbel skada och går igenom fiender
9. Pilar fastnar i väggar och kan plockas upp igen
10. Spiksmedens ed: pakt för spikgeväret med fyra uppgraderingar
11. Stormmagerns ed: pakt för blixtstaven med fyra uppgraderingar
12. Bågskyttens ed: pakt för långbågen med fyra uppgraderingar
13. Nya ammotyper: SPIKAR, MANA och PILAR (armborstet har nu BULTAR)
14. Vapenhjulet och vapenraden i HUD klarar fjorton vapen
15. Alternativa skott med högerklick: en spikbrasa och ett blixtklot
16. Siktet drar ihop sig när bågen spänns
17. Spikgeväret skjuter snabbare ju längre du håller inne
18. Blixten leder i vatten: alla som står i samma vatten får en stöt
19. De nya vapnen finns i butiken och som elitbyte
20. Träffljud efter väggens material (sten, trä, metall)

**Nya fiender (21–40)**
21. Nekromant (Ñ): väcker döda fiender
22. Eldelemental (Æ): delar sig i små flammor när den dör
23. Lavamask (Þ): gräver sig fram och dyker upp under dig
24. Dödsriddare (Ð): tung, med sköldstöt och svärdsvåg
25. Banshee (Ý): skriket saktar ned och får dig att tappa fotfästet
26. Nekromanten håller avstånd
27. Marken glöder och spricker innan lavamasken dyker upp
28. Dödsriddarens sköld stoppar skott framifrån
29. Bansheen syns bara som en skugga på håll
30. Eldelementalen tänder marken där den går och bränner nät
31. Fiender undviker granater
32. Skadade fiender söker sig till shamanen för att helas
33. Vissa fiender bär ett föremål som syns och tappas när de dör
34. Grupper har en ledare: när den dör tvekar de andra
35. Fiender hör när du öppnar dörrar
36. Ny elitegenskap: brinnande aura
37. Ny elitegenskap: magnetisk (drar dig närmare)
38. Ny elitegenskap: odödlig en gång (återuppstår med halv hälsa)
39. De nya fienderna finns i bestiariet
40. Livmätarna visar statusprickar (brand, gift, frost, blödning, bedövning)

**Vulkanen (41–55)**
41. Ny biom: Vulkanen, med obsidianhallar, lavafloder och askfält
42. Obsidianväggar, askgolv och basaltgolv
43. Askregn och stigande glöd
44. Värmedis i bilden
45. Hetta: nära lava blir du varm, vatten och isdrycken kyler
46. Utbrott: lavabomber faller med varning på marken
47. Rumstyper: smedjehall, lavasjö med bro, askfält och magmakammare
48. Lavan lyser rött på väggarna (färgat ljus)
49. Egen musik och mullrande miljöljud
50. Röd himmel av glöd och rök
51. Vulkanens väktarrum och bossarena
52. Eldjetar (°) som sprutar eld i takt
53. Sköra golvplattor (¬) som rasar efter att du gått på dem
54. Pendelblad (±) som svänger i korridorerna
55. Vulkanens namn och titelkort

**Ny boss (56–65)**
56. Den sjunde bossen, Eldkungen, med en egen vulkanarena
57. Eldklot i salvor
58. Ett slag som får lava att spruta upp i en ring
59. Lavapölar i fas 2 och raseri i fas 3
60. Två specialanfall: utbrott och eldelementaler
61. Egna väggar och golv i väktarrum och arena
62. Egen bossmusik och eget vrål
63. Eldkungen är med i bossrushen (sju bossar)
64. Eldkungen kan vakta vanliga våningar
65. Bossintro: kameran vänder sig mot bossen innan striden

**Runor (66–80)**
66. Runstenar (ª) på våningarna
67. Runor fästs i vapen, direkt eller vid smedjan
68. Eldrunan tänder eld
69. Isrunan saktar ned och fryser ibland
70. Giftrunan förgiftar
71. Stormrunan slår ibland ned blixt i en annan fiende
72. Blodrunan ger liv tillbaka
73. Ekorunan upprepar var femte träff
74. Runorna syns på vapnet i HUD
75. Vapnet glöder i runans färg
76. En runplats per vapen, två med själaaltarets uppgradering
77. En ny runa ersätter den äldsta
78. Runstenar i butiken
79. Runorna förklaras i handboken
80. Ljud när en runa fästs och när den slår till

**Lägerelden och uppdrag (81–100)**
81. Lägerelden (¶): en vilplats på vissa våningar
82. Vila: läk 40 % hälsa
83. Smida: vapnet går upp en nivå gratis
84. Förädla: ett kort blir starkare (+)
85. Laga mat: kött från djur ger hälsa, max hälsa och mer skada på våningen
86. Lägerelden värmer i kylan och lyser
87. Anslagstavlan (®): tre sidouppdrag per våning
88. Uppdrag: döda fiender med ett visst vapen
89. Uppdrag: hitta en hemlighet
90. Uppdrag: klara våningen utan drycker
91. Uppdrag: döda en elit innan tiden går ut, nå en kombo, ta ingen skada en minut
92. Belöningen är guld, ett kortval eller en runa
93. Uppdragen syns i pausen
94. Ljud när ett uppdrag tas och klaras
95. Hemlig trappa (÷) i hemliga rum
96. Den hemliga våningen: en skattkammare med eliter
97. Den hemliga våningen har egen musik
98. Giftfat (µ) och isfat (ß) som smäller med effekt
99. Tryckplattor (¨) öppnar en hemlighet i närheten
100. Fångar viskar ett tips om våningen

**Aktiva förmågor (101–115)**
101. Fem kort ger en aktiv förmåga (T)
102. Blinken: teleport framåt
103. Tidsbubblan: allt runt dig saktar ned
104. Sköldbubblan: blockerar projektiler
105. Vålnadskallet: två allierade
106. Jordskalvet: slår omkull fiender runt dig
107. Förmågans nedräkning syns i HUD
108. Mobil: förmågeknapp
109. Handkontroll: förmåga på höger spak (går att byta)
110. Kort som sänker nedräkningen
111. Ljud för varje förmåga och när den är redo
112. Dödanden laddar förmågan snabbare, mer vid kombo
113. Bara en förmåga åt gången: det senaste kortet gäller
114. Förmågan syns i kortleken ("I BRUK")
115. Tips första gången du får en förmåga

**Kort (116–145)**
116–140. 25 nya kort med nya bonusar: runplatser, runstyrka, hettaskydd, mana, pilar som kommer tillbaka, uppdragsguld, vila, nedräkning, hemligheter och måltider
141. Två nya kortset: ASKANS ARV och JÄGARENS LÄRA
142. Förädling: ett kort blir + utan att du behöver ett till
143. Kortvalet visar FÖRE → EFTER för det kortet ändrar
144. Kortleken kan sorteras och filtreras
145. Kortleken visar dina aktuella värden

**Lägen och meta (146–175)**
146. Överlevnadsläget: vågor i en arena, med rekordlista
147. Spöket: din bästa tid på samma våning syns som en skugga
148. Introduktion för nya spelare, steg för steg
149. Själaaltaret: en andra runplats
150. Själaaltaret: lägereldar oftare
151. Själaaltaret: börja med en runa
152. 20 nya prestationer
153. Statistik per biom och boss
154. Slutskärmens graf visar skadan per våning
155. Vanligaste dödsorsakerna i statistiken
156. Nytt läge: snabb runda (portalen öppnas tidigare)
157. Hjälpläge: långsammare spel
158. Hjälpläge: extra hälsa
159. Byt svårighet mellan våningarna (D)
160. Spara slutskärmen som bild (S)
161. Fotoläget har filter: svartvit, sepia och nattseende (1–4)
162. Ny klass: Spejaren (långbåge och lykta)
163. Ny klass: Smeden (smidd pistol med eldruna)
164. Dagliga uppdrag: tre om dagen, själar som belöning
165. Tre nya regler för dagens och veckans utmaning
166. Bossrush med alla sju bossar och topptid
167. Själarna hittills syns efter varje våning
168. Kortarkivet visar saknade kort och hur de låses upp
169. Bestiariet visar fiendernas svagheter
170. Rörlig bakgrund på startskärmen
171. Startskärmen visar senaste rundan
172. Ny meny: statistik
173. Favoritvapen per biom
174. Bästa tid per boss
175. Pausen visar runor, förmåga och uppdrag

**Grafik, ljud och känsla (176–190)**
176. Värmedis och askfilter i vulkanen
177. Blixtstaven lyser upp rummet
178. Spårljus efter spikar
179. Brinnande fiender lyser
180. Stora fiender skakar marken när de går nära
181. Explosioner lämnar glödande rester
182. Spårljus efter fullt spända pilar
183. Hjärtat slår hårdare vid mycket låg hälsa
184. Musiken blir intensivare när en elit är nära
185. Ljudet dämpas när du duckar i vatten
186. Fönsterljuset i husväggarna flimrar
187. Spindelnät fladdrar när du går igenom dem
188. Du hör fotsteg från fiender du inte ser
189. Partiklar när runor slår till
190. Bossens steg skakar kameran

**Tillgänglighet och mobil (191–200)**
191. Flytta mobilknapparna (layoutläge i inställningarna)
192. Byt knappar på handkontrollen
193. Hög kontrast på fiender
194. Stora undertexter
195. Siktstödets styrka kan väljas
196. Spring automatiskt på mobil
197. Pilar mot uppdragets mål i cyan
198. Spelhastighet (hjälpläge)
199. Sparläge: 30 bilder i sekunden för svaga enheter
200. Version 6 i nyheter och handbok

Siktstödet på mobil är också rättat. Två funktioner hette `aimAssist`, så första skottet saknade riktning när man spelade med pekskärm.

## Version 7: 200 förbättringar

Version 7 lägger till 200 förbättringar:
- **Bilder:** ritas med `tools/props5/make.py` och `tools/weapon-frames`.
- **Ljud och musik:** byggs med `tools/sounds/make5.sh`.
- **Kort:** byggs med `tools/card-art/make.py` (`make.py . v7`).
- **Bangeneratorn:** har fått biomen Gravkammaren, Faraonens tempelarena, labyrinter (`Gen.maze`), kvicksand, stenblock, solstrålar, larmklockor och nya NPC:er.


**Nya vapen (1–15)**
1. Kastknivarna (ô): snabba kast, kan plockas upp igen
2. Knivar studsar från väggar och fastnar i fiender (plockas vid död)
3. Stridshammaren (û): tung närstrid, laddat slag ger en stöt i marken
4. Hammaren slår sönder sköldar och sten
5. Musköten (ï): mycket kraftigt skott som genomborrar, lång omladdning, krutrök
6. Musköten: rök ligger kvar och skymmer sikten en stund
7. Pakter för de tre nya vapnen med fyra uppgraderingar vardera
8. Nya ammotyper KNIVAR och KULOR
9. Vapenvana: vapen går upp i nivå (1–5) av användning under rundan
10. Vapenvanan syns i HUD och vid vapenbyte
11. Tyst närstridsdödande bakifrån (smygdödande)
12. Snabbt vapenbyte: Q byter till förra vapnet, och ett tomt vapen byts automatiskt
13. Vapnen visar slitage-fri "inspektera" med statistik
14. Nya vapen i butik, väktarbyte och elitbyte
15. Träffreaktion: fiender ryggar tillbaka olika mycket per vapen

**Nya fiender (16–35)**
16. Mumie (Ã): långsam, kastar bandage som drar dig närmare
17. Skarabéer (Õ): små, kommer i svärmar
18. Schakalkrigare (Ê): parerar framifrån när den höjer klingan
19. Ficktjuv (Î): stjäl guld och springer – döda den för att få tillbaka det
20. Dubbelgångare (Ô): kopierar ditt vapen och skjuter med det
21. Mumien vaknar ur sarkofager
22. Skarabéer kryper ur sanden och sprids när de dör
23. Ficktjuven gömmer sig och flyr mot utgången
24. Dubbelgångaren byter vapen när du gör det
25. Elitegenskap: taggig (skadar dig vid närstrid)
26. Elitegenskap: undvikande (sidsteg när du siktar)
27. Elitegenskap: jätte (större, långsammare, tål mer)
28. Fiender som ser dig ropar på andra (larm)
29. Fiender springer till larmklockor (ljud väcker hela våningen)
30. Fiender söker där de senast hörde dig
31. Fiender i mörker ser dig sämre
32. Fiender kan överraskas (ovetande fiender tar mer skada)
33. Fiender plockar upp fallna vapen (ficktjuven tar guld från marken)
34. Bestiariet: nya fiender, svagheter och tips
35. Fiendernas syn och hörsel visas som ikon (öga/öra) ovanför dem

**Ny biom: Gravkammaren (36–50)**
36. Biomen Gravkammaren: sandsten, hieroglyfer, sand, gyllene gravkammare
37. Sandstensvägg, hieroglyfvägg, sandgolv, gyllene golv
38. Sandstorm som väder (sämre sikt utomhus)
39. Kvicksand: sjunker långsamt, hoppa för att ta dig loss
40. Rullande stenblock-fälla som jagar dig genom korridoren
41. Sarkofager som kan öppnas: skatt eller mumie
42. Solljus från takhål: ljuskäglor med damm
43. Rumstyper: gravkammare, pelarsal, skattkammare, sandfyllda gångar
44. Pilfällor i hieroglyfväggar
45. Hetta i solen (använder hettan från vulkanen), skugga svalkar
46. Gravkammarens musik och ökenvind
47. Väktarrum och bossarena (tempel med sandgrop)
48. Guldmynt i högar (mer guld i biomen)
49. Förbannad skatt: tar du den vaknar mumierna
50. Gravkammarens namn och titelkort

**Ny boss (51–60)**
51. Den åttonde bossen: Faraonen, med egen arena
52. Anfall: gyllene stråle som sveper
53. Anfall: sandtornado som jagar dig
54. Anfall: kallar mumier ur golvet
55. Faser: förbannelse (omvända kontroller kort), raseri
56. Specialanfall: sanden stiger (kvicksand i arenan) och skarabésvärm
57. Bossens väggar och golv
58. Bossens musik och röst
59. Faraonen i bossrushen (åtta bossar) och som väktare
60. Bossens svaga punkt: skjut juvelen i pannan för extra skada

**Krönikan och berättelse (61–75)**
61. Krönikesidor (þ) på våningarna
62. 40 sidor berättar Kryptans historia
63. Krönikan som meny med lästa och saknade sidor
64. Sidorna sparas mellan rundor
65. Sidor ger själar första gången
66. Varje boss har sina sidor
67. Hemlig slutsida när alla andra är hittade
68. Fångar och präster berättar om krönikan
69. Prestationer för krönikan
70. Berättaren: korta texter vid nya biomer första gången
71. Bossarnas namn och historia i bestiariet
72. Titelskärmen visar hur mycket av krönikan som hittats
73. Sidor kan läsas upp (talsyntes, om inställningen är på)
74. Ljud när en sida hittas
75. Krönikan i handboken

**Smyg (76–90)**
76. Ljudmätare i HUD: hur mycket väsen du för
77. Ljusmätare: hur synlig du är (mörker döljer dig)
78. Fiender upptäcker dig gradvis (en mätare fylls)
79. Smygdödande: närstrid bakifrån på ovetande fiende dödar direkt
80. Kasta sten (G): lockar fiender till ljudet
81. Larmklockor (³) som fiender springer till
82. Guld för dödande utan att bli upptäckt
83. Smygbonus i våningsstatistiken
84. Ducka i mörker gör dig nästan osynlig
85. Släck ljus genom att skjuta ljusen – mörkare rum
86. Sovande fiender snarkar (ljud och Z)
87. Fiender ser dig sämre i hög gräs/skog
88. Smygkort (kort)
89. Prestationer för smyg
90. Handboken förklarar smyg

**Ficklampan och mörker (91–100)**
91. Ficklampan (L): ljuskägla framför dig med batteri
92. Batterier (¼) på våningarna
93. Mörka våningar (händelse) blir mörkare – lampan behövs
94. Ljuskänsliga fiender (banshee, vampyr) flyr ljuskäglan
95. Lampan lockar fiender (de ser ljuset)
96. Batterimätare i HUD
97. Själaaltaret: ficklampa från start
98. Mobil: lampknapp
99. Handkontroll: lampa på knapp
100. Lampan flimrar när batteriet tar slut

**NPC:er och ekonomi (101–120)**
101. Spelaren (ç): tärningsspel, högre/lägre och lyckohjul
102. Spel kan ge guld, kort eller förbannelser
103. Bankiren (ÿ): sätt in guld som blir själar när rundan slutar
104. Banken ger ränta per våning
105. Vandraren (ý): dyker upp på flera våningar med en uppdragskedja
106. Vandrarens kedja: tre steg med växande belöning
107. Pruta hos köpmannen (chans till rabatt, kan sura)
108. Stjäla från köpmannen (han blir en elitfiende)
109. Rea: ett slumpat erbjudande per butik
110. Köpmannens lager växer med djupet
111. Sälja kort till köpmannen
112. Sälja drycker och runor
113. Guldräknare: hur mycket du tjänat och spenderat
114. Butiken minns vad du köpt (statistik)
115. Dricks till fångar ger tips
116. Spelaren fuskar ibland (syns om du har tur)
117. NPC:er reagerar på din hälsa och dina kort
118. Ljud för NPC:er
119. Mobilvänliga NPC-menyer
120. Prestationer för NPC:er

**Kort (121–145)**
121. Smygskorna: mindre ljud
122. Tystlåten: långsammare upptäckt
123. Lyktbäraren: längre batteri
124. Lyckostjärnan: bättre odds hos spelaren
125. Guldfröet: ränta på banken
126. Övningssvärdet: snabbare vapenvana
127. Själastenen: själar per krönikesida
128. Guldsållet: mer guld från högar och sarkofager
129. Kastdolkarna: smygskada och krit
130. Lyktsmeden: större ljuskägla
131. Bankirens sigill: ränta och guld
132. Den gyllene skarabén: guld och tur
133. Vapenmästarens bok: vapenvana och skada
134. Det nattblinda ögat (förbannat): smygskada men mindre ljus
135. Gravplundraren: guld, själar och fällskydd
136. Skuggkappan: tyst, svårupptäckt, undvikande
137. Den blodiga krönikan: själar och vapenvana
138. Skuldbrevet (förbannat): ränta och odds mot hälsa
139. Faraonens mask (legendarisk): guld, ränta och själar
140. Mörkrets furste (legendarisk): det bästa smygkortet
141. Två nya kortset: SKUGGORNAS och ÖKNENS
142. Kortens ovanlighet visas med glans i kortvalet
143. Kort kan säljas
144. "Senast valda" i kortleken
145. Kortsökning i kortarkivet

**Lägen och meta (146–175)**
146. Labyrintläget: en stor labyrint, hitta utgången innan tiden tar slut
147. Mörkerläget (utmaning): bara ficklampan lyser
148. Bossjakten: alla bossar i valfri ordning med topplista
149. Dela frö: kopiera en länk med fröet
150. Tre sparplatser för rundor
151. Titlar som låses upp och visas på startskärmen
152. Två nya klasser: Tjuven och Ökenvandraren
153. Själaaltaret: tre nya uppgraderingar
154. 20 nya prestationer
155. Dagliga uppdrag: nya sorter
156. Rekord per läge
157. Rundans karta efter döden (var du dog)
158. Statistik: smyg, lampa, spel, bank
159. Historik: senaste tio rundorna med klass och biomer
160. Startskärmen: krönikan och titel
161. Snabbval av klass med siffertangenter på startskärmen
162. Profilen kan återställas (med bekräftelse)
163. Övningsläge: välj fiende att öva mot
164. Övningsläge: oändlig ammo och hälsa
165. Pausmeny: fortsätt, inställningar, karta, kort, krönika, ge upp
166. Kortleken öppnas från pausen
167. Tips på laddningsskärmen
168. Svårighetsgrad: Berättelseläge (mycket lätt)
169. Rundans sammanfattning visar smyg och lampa
170. Våningsstatistik: tid jämfört med rekord
171. Månadsutmaning
172. Utmaningslägen kan kombineras
173. Själaaltaret visar vad som är köpt
174. Bestiariet visar var fienden finns (biomer)
175. Prestationer visar datum

**Känsla (176–190)**
176. Ljusstrålar från takhål och fönster
177. Ficklampans ljus i ljuskartan
178. Dammkorn i ljuset
179. Sandpartiklar och sandstorm
180. Kameran faller vid döden
181. Skadevinjetten färgas efter skadetyp
182. Vapnet gungar mer när du springer
183. Musköten och hammaren skakar mer
184. Bossens hälsa i segment
185. Fiender lyser till när de upptäcker dig
186. Ljud: fotsteg på sand
187. Ljud: fiender reagerar (huh) när de hör något
188. Lugnare musik när du smyger
189. Nya partiklar för knivar och hammare
190. Skärmskak när stenblocket rullar

**Tillgänglighet (191–200)**
191. Uppläsning av meddelanden (talsyntes)
192. Visuella ljudsignaler: pilar mot ljud du inte ser
193. Berättelseläge (lätt)
194. Minska rörelse (en knapp stänger av skak, gung och blixtar)
195. HUD-förinställningar (minimal, standard, full)
196. Större menyer på mobil
197. Håll eller växla sikte
198. Lampa och smyg på handkontroll
199. Tydligare upptäcktsmätare (färgblindvänlig form)
200. Version 7 i nyheter och handbok

Kombinerade utmaningar multiplicerar själarna. Sparplatsen väljs på startskärmen, och `?fro=XXXX` i adressen fyller i ett delat frö.

## Version 25: Befälet – fienderoller och Effekseer-effekter

### Fienderoller: sköldvakt, befälhavare och granatkastare
Tre nya roller i version 24:s trupper. Undantagen är desamma som i version 24: bossar, väktare, minions och arenafiender får inga roller, och i KLOCKAN finns inga roller alls.
- **Sköldvakt:**
  - Sköldbäraren, dödsriddaren och den levande rustningen ställer sig en dryg ruta framför truppens skytt, på linjen mot dig, med skölden vänd mot dig. Truppens egna skott går igenom vakten.
  - Går du nära bryter den formationen och anfaller. Dör skytten anfaller den direkt. Den ropar "SKÖLDAR UPP!".
- **Befälhavare:**
  - En per trupp med minst tre fiender bär en krigsfana över huvudet. Helst blir det ledaren, en elit eller en champion, annars den talande fienden med mest hp.
  - Truppen inom 6 rutor går 15 % fortare, laddar om 15 % snabbare, backar mindre och flyr inte ("FRAMÅT!", "HÅLL LINJEN!").
  - Dör befälhavaren tvekar truppen en sekund, den svagaste flyr och ingen tar befälet på en stund ("BEFÄLET ÄR DÖTT!"). Döda officeren först.
- **Granatkastare:**
  - Gömmer du dig för truppen i mer än tre sekunder kastar en kultist, armborstskytt, urverkssoldat, spöksoldat, spökpirat eller gruvarbetare en granat i båge dit de senast såg dig.
  - Granaten piper allt tätare i 1–1,5 s inom en blinkande röd ring innan den smäller, så spring ut ur ringen. Med INGA BLIXTAR växer ringen i stället för att blinka.
  - Varje trupp kastar högst en granat på 9–12 s, och granaterna delar nedkylning med eldkrukan från version 24.
- **Allmänt:**
  - Allt följer SMART FIENDE-AI, och när den stängs av återställs fart, nedkylning och roller.
  - Rollerna kostar cirka 1–5 % av fiendeloopen, mätt med 36 fiender och fyrfaldigt strypt processor.
  - Testkroken heter `__game.roles` och testet t114.

### Effekter från Effekseer (förrenderade)
Explosioner, magiträffar, magisk laddning och teleporter har nya effekter. De är gjorda i partikelverktyget [Effekseer](https://effekseer.github.io/), som är MIT-licensierat, renderade offline bildruta för bildruta och bearbetade till spelets pixelstil. Spelet innehåller ingen Effekseer-runtime, och de tre nya stripparna är tillsammans cirka 22 kB.
- **Explosioner** från granater, krutfat och bomber får ett eldklot med chockvåg.
- **Magiska skott**, både dina och fiendernas, slocknar i en stjärnburst i skottets färg.
- **Laddning:** kultister, nekromanter och shamaner samlar ljus i handen innan de skjuter.
- **Teleporter, portaler och fiender som dyker upp** får en ljuspelare som stiger från en ring på golvet.
- Med MINSKADE EFFEKTER, eller när spelet slår på det automatiskt, visas de gamla effekterna. Med INGA BLIXTAR tonas explosionen in och dämpas.
- **Källor:** effekterna bygger på Effekseers exempeleffekter av Effekseer Project och tktk, som är CC0.
- **Pipeline och test:** pipelinen finns i `tools/effekseer/`, och den använder EffekseerForWebGL i headless Chromium. Källor och licenser står i `CREDITS.md`, och testet är t115.

### Också sedan version 24
- **Slagfältet:** egen grå stridshimmel och nya golv för leran och skyttegravarna. Varje biom kan nu ha en egen himmel i `gfx/sky_<biom>.png`.

## Version 24: Jakten – bandesign, spelloop och fiende-AI

Version 24 bygger om hur fienderna slåss tillsammans och hur banorna hänger ihop. Förebilderna är F.E.A.R. för fiende-AI:n, DOOM (2016) och DOOM Eternal för stridens takt, och DUSK, Ion Fury och Prodeus (de klassiska Doom- och Quake-banorna) för bandesignen.

### Förebilderna och vad vi tog

| Förebild | Hur den fungerar | I Krypta |
|---|---|---|
| **F.E.A.R.** (Jeff Orkin, ["Three States and a Plan"](https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf), GDC 2006) | Varje soldat har bara tre tillstånd (gå, animera, använd objekt). En GOAP-planerare söker med A* fram en kedja handlingar mot ett mål. Sensorer fyller ett arbetsminne, och fienden vet bara vad den har uppfattat. En truppkoordinator delar ut roller (ta skydd, avancera, nedhållande eld, flankera, sök). Barks gör beteendet läsbart. | Sensorer och arbetsminne, skyddspunkter, truppkoordinator med fyra roller och barks. I stället för A* används en målväljare, eftersom kedjorna är högst tre steg långa (gå till skydd, kliv ut, skjut). Det ger samma beteende för en bråkdel av CPU:n. |
| **DOOM** ([Embracing Push Forward Combat](https://gdcvault.com/play/1024940/Embracing-Push-Forward-Combat-in), GDC 2017) | Attackpoletter: bara några fiender får anfalla åt gången, och resten rör sig och positionerar sig. Anfallen förvarnas. Spelaren ska trycka framåt, inte gömma sig. | Attackpoletter i två pooler (närstrid och skott), en glöd som förvarning och press mot den som campar. Laddar du om rusar närstridarna fram. |
| **DUSK, Ion Fury, Prodeus** ([Game Informer](https://gameinformer.com/2023/10/13/inside-the-rise-of-boomer-shooters)) | Sammanflätade banor med genvägar som öppnas från andra sidan, nycklar som utlöser bakhåll, landmärken, hemligheter med ledtrådar och föremål som brödsmulor. | Genvägar (en del enkelriktade), bakhåll vid nyckeln och kistan, landmärken, brödsmulor, skydd i stridsrum, lugna rum efter svåra strider och ledtrådar vid hemliga väggar. |

### Fiende-AI
- **Attackpoletter:** högst N närstridare och N skyttar anfaller samtidigt (N = 2 + djupet/2: −1 på lätt och berättelse, +1 på svår, +2 på mardröm).
  - De andra håller avståndet strax utanför räckhåll, går i sidled och hotar.
  - Den som väntat längst går först. Den som just anfallit backar om andra väntar.
  - Skyttarna glöder kort innan de skjuter.
- **Vakthunden:** ingen fiende står inom räckhåll mer än cirka 4 s utan att få anfalla, så arenavågor, KLOCKAN och partider fungerar som förut.
- **Sensorer och arbetsminne:** var spelaren senast syntes, om du står still och om du laddar om. Siktkontrollerna har en budget per bildruta.
- **Skydd:** skyttar (eldskelett, kultister, armborstskyttar, spökbågskyttar) väljer en skyddspunkt som är skymd från dig men har skottlinje från sidosteget. De kliver ut, skjuter och kliver tillbaka. Skyddet används först efter första skottet, så första anfallet kommer lika snabbt som förut.
- **Truppen**, två gånger i sekunden för alerterade fiender inom 8 rutor från varandra:
  - UNDERTRYCK: skyttarna som ser dig skjuter först.
  - AVANCERA: de andra skyttarna flyttar fram mellan skydd.
  - FLANK: en närstridare går runt och kommer från sidan.
  - SÖK: när du försvinner sprider de ut sig där de senast såg dig. De fuskar inte.
- **Press:** står du still bakom skydd i mer än 4 s kommer en eldkruka eller två flankerare.
- **Barks:** talande fiender säger vad de gör: "FLANKERA!", "HAN LADDAR OM!", "VAR ÄR HAN?", "TÄCK MIG!", "I SKYDD!", "DÄR ÄR HAN!", "MAN NERE!".
- **Undantag:** bossar och väktare påverkas inte. Arenafiender, eliter, minions och fiender med egna specialbeteenden behåller sitt beteende men följer poletterna. I KLOCKAN är rollerna avstängda.
- Allt stängs av med INSTÄLLNINGAR → SPEL → SMART FIENDE-AI. Testkroken heter `__game.ai` och testet t112.

### Bandesign
- **Genvägar:** banorna slingrar tillbaka. Där två delar ligger nära på kartan men långt isär längs vägen öppnar generatorn en dörr i väggen.
- **Enkelriktade genvägar:** ungefär hälften är låsta från den sida du når först ("ÖPPNAS FRÅN ANDRA SIDAN", rött märke) och öppnas från andra sidan (gult märke, "GENVÄG ÖPPNAD"). Fiender går inte igenom dem medan de är stängda, och de syns röda på kartan.
- **Bakhåll:** när du tar nyckeln, eller öppnar kistan i ett skattrum, glider en dold nisch i väggen upp och fiender kliver ut ("BAKHÅLL!"). De skapas först då, så andelen dödade fiender och KLOCKAN stämmer.
- **Landmärke:** en staty med fyra ljus i en central sal och en svag ljuspelare som syns på håll.
- **Brödsmulor:** ammo och hälsa i gångarna leder mot nyckeln eller utgången.
- **Takt:** lådor som skydd i stora stridsrum, och en hälsa i första lugna rummet efter ett elitrum eller en arena.
- **Hemliga väggar:** de ger sig till känna med ett svagt ljus och damm som silar ut.
- Allt ligger i ett eget pass ovanpå den gamla banan (`content24`, med eget slumpflöde). Samma frö ger samma grundlayout, `opts.v24off` ger exakt version 23, och arenor, hemliga våningar och labyrinter rörs inte. Testa med `node tools/gen-preview.js frost t113-99 2` och testet t113.

### Inte gjort
- Utsiktsfönster mot rum man når senare: strålkastningen stannar vid första väggen, och att ändra det skulle kräva ändringar i den heta renderloopen.
- Inga nya nycklar eller lås: bakhållen använder de nycklar och kistor som redan finns.

## Version 23: Slakteriet och Slagfältet

- **Slakteriet (`abattoir`):** inomhus på djup 2–5. Kaklade slakthallar med slaktkakel (ɼ) och kylrumsväggar (ɽ), kylrum med köttkrokar (ʁ, i taket, gungar och knarrar), slaktbänkar (ʂ) och bandsågar (ʃ). Testa med `?biome=abattoir`.
  - Blodhalt golv (ɿ) har svag friktion: farten bromsas långsamt och du glider. Fiender glider också.
  - Köttkvarnar (ʀ) gör 12 skada i sekunden. Fiender som knuffas in tar dubbel skada. Bangeneratorn gör dem aldrig till enda vägen.
  - Flugsvärmar dras till liken.
- **Det eviga slagfältet (`battlefield`):** utomhus under grå himmel med rök och glöd, djup 4–5 (en sen biom). Lera, skyttegravar, palissader (ʈ), jordvallar (ʉ), trasiga katapulter (ʍ), krigsfanor (ʎ) som vajar och spjutpålar (ʏ). Testa med `?biome=battlefield`.
  - Djup lera (ʋ) gör dig 45 % långsammare, och du kan inte hoppa ur den.
  - Katapultmål (ʌ): var sjunde sekund (i olika takt för varje ruta) landar en sten. En skugga och ett visslande kommer 1 s före. Stenen gör 30 skada inom en ruta och lämnar en krater (bara ett märke). En bana har högst åtta mål.
  - Spjutpålarna gör 4 skada när du går in i dem.
  - Slagfältets lergolv (`floor_battlemud`) saktar inte, till skillnad från den gamla leran.
  - Himlen (`gfx/sky_battlefield.png`), lergolvet och skyttegravsgolvet är AI-texturer från Cloudflare Workers AI, efterbehandlade till spelets palett (se `tools/cfart/`). Varje biom kan ha en egen himmel i `gfx/sky_<biom>.png`.
- **Vapen:**
  - **Slaktarkroken (ʔ):** kastar en krok på kedja som når 6 rutor. Små fiender dras in till dig. Stora fiender, väktare och bossar drar i stället in dig till dem. Sedan slår kroken (45 skada). Ingen ammo, 1,2 s nedkylning.
  - **Bombarden (ʕ, ammo kanonkulor från kulpåsar ʖ):** en handkanon med en tung kanonkula (80 skada). Kulan går igenom fiender, tappar 25 % per fiende och studsar en gång i väggar. Högerklick skjuter druvhagel: 8 kulor på kort håll.
  - Båda har pakter med fyra uppgraderingar var.
- **Fiender i slakteriet:** slaktaren (ʄ) kastar köttyxor i båge och slåss i närstrid. Grismannen (ʅ) rusar och knuffar dig – kliv åt sidan, så slår den i väggen och blir yr. Flugsvärmen (ʆ) är svag och flyger i moln om tre. Den styckade (ʇ) kryper snabbt längs golvet.
- **Fiender på slagfältet:** spöksoldaterna (ʐ) går i grupper om tre. Skölden tar 65 % framifrån så länge formationen håller och 35 % när de andra är döda. Spökbågskytten (ʑ) skjuter pilskurar om tre. Spökryttaren (ʒ) rusar i långa raka linjer, vänder och rusar igen (högst två per bana). Kråkorna (ʓ) kommer i flock och dyker.
- **Bossar:**
  - **Slaktmästaren:** hugger med köttyxan och kastar en krok som drar dig till honom. Han slänger köttbitar som blir flugsvärmar, sätter igång köttkvarnar i arenan i 6 s och kallar på grismän.
  - **Krigsherren:** slår med svärdet, svingar en svärdsvirvel och rider i raka linjer. Han blåser i hornet och kallar en formation spöksoldater och beordrar katapultsalvor över arenan.
  - Båda kan också vara väktare.
- **Kort:** 16 nya kort, åtta nya kortnycklar och två set: SLAKTARENS VÄG och FÄLTHERRENS VÄG. De nya nycklarna är `slickGrip`, `grinderResist`, `fliesResist`, `mudWalk`, `catapultSense`, `formationBreak`, `hookDmg` och `bombardDmg`. Kortbilderna ritas i `tools/card-art/make.py` (`v23`).
- **Namnbyten:** lergolvet heter `floor_battlemud` och sköldljudet `ghost_shield_bash`. Ammot heter KANONKULOR (inte KULOR, som musköten redan använder).
- **Test:** `tools/playtest/t110.mjs` (port 9810).

## Version 22: Badhuset och Skärselden

- **Badhuset (`bathhouse`):** inomhus på mellandjup. Ett romerskt badhus i förfall med mosaikmarmor (ɠ), pelargångar (ɡ), kakel och mosaikgolv, statyer (ɦ), fontäner (ɧ) och bänkar (ɨ).
  - Heta bassänger (ɣ) gör dig 25 % långsammare och skållar dig med 3 skada i sekunden. Fiender skållas också.
  - Ånggaller (ɤ) väller upp ånga i 2 s var sjätte sekund, i olika takt för varje ruta. Inom 3 rutor tjocknar dimman kraftigt, men ångan skadar inte. Ångvålnaderna syns bara i ångan och på nära håll.
  - Kallbad (ɥ) släcker brand direkt och läker 2 hp/s upp till halva hälsan. Varje bad ger högst 30 hp och tar sedan slut.
- **Skärselden (`purgatory`):** utomhus under blodröd himmel med askregn. Det är en sen biom. Där finns köttmurar (ɭ), benmurar (ɮ), askfält och svavel, kedjade själar (ɲ) som gungar och jämrar sig, benpelare (ɳ) och svavelgrytor (ɴ) som lyser.
  - Eldfloder (ɰ) gör 6 skada i sekunden och drar dig 1,2 rutor/s med strömmen. Riktningen tas från `level.streams = [{x,y,dx,dy}]`. Saknas fältet räknas riktningen ut från grannrutorna.
  - Runcirklar (ɱ) lyser upp i 0,8 s när du kliver i dem och kallar sedan fram två eldimpar. Varje cirkel gör det en gång, och en bana har högst tre.
  - Ljuset mäts i t109: bilden är tydligt röd (rött > 1,3 × blått) men läsbar.
- **Vapen:**
  - **Treudden (ɹ):** en stöt utan ammo som når 2,2 rutor, gör 40 skada och går igenom två fiender. Högerklick kastar den (90 skada), och den kommer tillbaka efter 1,2 s. Under tiden slåss du med nävarna.
  - **Svavelmortern (ɺ, ammo svavel från svavelklumpar ɻ):** lobbar ett brinnande svavelklot i båge. Klotet landar vid fienden i siktet, exploderar (60 skada, 2 rutors radie) och lämnar eld i 3 s. Högerklick ger ett kort skott rakt fram som exploderar vid träff.
  - Båda har pakter med fyra uppgraderingar var.
- **Fiender i badhuset:**
  - Badvakten (ɩ) snärtar med en blöt handduk som gör dig långsam i 1 s.
  - Ångvålnaden (ɪ) är nästan osynlig och sliter på dig när den är nära.
  - Gladiatorn (ɫ) har en sköld som tar 75 % av skadan framifrån, kastar ett nät som snärjer och slåss med en treudd.
  - Mögelkryparen (ɬ) lämnar giftiga sporer där den dör. Sporerna använder den gamla nyckeln `sporeResist`, och eld bränner bort dem.
- **Fiender i skärselden:**
  - Eldimpen (ɵ) är snabb och kastar eldklot som bränner kort.
  - Den plågade själen (ɶ) störtar mot dig och exploderar. Högst fyra per bana.
  - Köttbjässen (ɷ) rusar och slår i marken så att en chockvåg går ut (hoppa över den). Högst två per bana.
  - Askvandraren (ɸ) går sönder i aska och reser sig igen en gång efter 3 s, om den inte sprängs eller bränns.
- **Bossar:**
  - **Badmästaren:** slår med skopan och kastar skållhett vatten som lämnar en het bassäng i 4 s. Han fyller arenan med ånga, kallar på badvakter och dyker ner i en bassäng för att komma upp i en annan.
  - **Eldfursten:** slår med klon och låter eld regna ned (med varningsringar). En eldpelare följer efter dig. Han öppnar sprickor med eld i marken i 5 s och kallar på eldimpar och plågade själar.
  - Båda kan också vara väktare.
- **Kort:** 16 nya kort, åtta nya kortnycklar och två set: BADGÄSTENS VÄG och DEN FÖRDÖMDES VÄG. De nya nycklarna är `scaldResist`, `steamSight`, `coldPoolHeal`, `shieldBreak`, `streamResist`, `runeQuiet`, `tridentDmg` och `brimstoneDmg`. Kortbilderna ritas i `tools/card-art/make.py` (`v22`).
- **Namnbyten:** golvet `floor_ashfield`, fontänen `prop_bathfountain` och ljudet `mold_spore_burst`. Fontänljudet är det gamla `fountain`.
- **Test:** `tools/playtest/t109.mjs` (port 9809).

## Version 21: Järnfängelset och Fiskeläget

- **Järnfängelset (`prison`):** inomhus på mellandjup, med fängelsesten (ɇ), cellgaller (Ɉ), halm och smutsig sten. Där finns cellrader, vaktrum, tortyrkammare och en galggård.
  - Larmplattor (ɍ) lyser svagt rött. Kliver du på en ringer en klocka: alla fiender inom 14 rutor larmas, och två nyckelknektar kommer in vid närmaste dörr. Varje platta larmar en gång, och en bana har högst tre. Hoppa över dem.
  - Hängande burar (ɏ) hänger i taket och faller av 25 skada. De släpper ett föremål, och ibland kravlar en kedjefånge ut.
  - Sträckbänkar (ɐ) och en galge (ɑ) som gungar lätt. Galler som öppnas med spak (|) finns som förut.
- **Fiskeläget (`harbor`):** utomhus, en sen biom. Det har bryggor över mörkt vatten, kajer av sten (ɋ), bodar (Ɋ), kullersten och bryggplank.
  - Dimman rullar in och ut i en period på 36 sekunder, och ett mistlur hörs när den är som tätast. Dimman är grå, inte svart (ljuset mäts i t108).
  - En fyr sveper sin ljuskägla över banan. Den utgår från `level.lighthouse` (om fältet finns), annars från den första fyrlyktan (ɒ).
  - Fisknät (Ɏ) saktar dig 50 %. Går du in i ett nät fastnar du i 0,6 s, en gång per nät och fjärde sekund. Eld bränner bort näten.
  - Fisktunnor (ɓ) går sönder av skott och ger ammo, skrot eller fiskrens (5 hp). Ankare (ɔ) står i vägen. Djupvattnet och de ruttna plankorna finns kvar från tidigare biomer.
- **Vapen:**
  - **Morgonstjärnan (ɝ):** ett tungt slag (35 skada) som inte kräver ammo. Håll inne högerklick så snurrar kedjan över huvudet och träffar allt inom 1,5 rutor var fjärdedels sekund (18 skada), men du går långsammare.
  - **Trombonen (ɞ, ammo skrot från skrotpåsar ɟ):** 12 hagel à 7 skada med kort räckvidd, och fienderna knuffas hårt bakåt. Högerklick avfyrar båda laddningarna på en gång, med dubbel rekyl och längre omladdning.
  - Båda har pakter med fyra uppgraderingar var.
- **Fiender i fängelset:**
  - Nyckelknekten (ɕ) blåser i visselpipan när den ser dig. Då larmas alla fiender inom 10 rutor (en gång).
  - Kedjefången (ɖ) är långsam och svingar kula och kedja i en bred båge som når två rutor.
  - Tortyrmästaren (ɗ) kastar glödande järn som sätter dig i brand en kort stund. Högst två per bana.
  - Vakthundarna (ɘ) är snabba och kommer i par.
- **Fiender i fiskeläget:**
  - Den drunknade fiskaren (ə) stöter med harpunen två rutor bort.
  - Fiskmannen (ɚ) gömmer sig i djupvattnet vid bryggkanten och hoppar i en båge mot dig. Högst tre per bana.
  - Strandkrabban (ɛ) går i sidled och tar 75 % mindre skada framifrån. Från sidan, bakifrån eller med explosioner tar den full skada.
  - Måssvärmen (ɜ) är svag, flyger i flock, dyker och hackar.
- **Bossar:**
  - **Bödeln:** hugger med yxan och skickar en huggvåg längs golvet (hoppa över den). Han kastar en kedjekrok som drar dig till sig. Vid inlåsning fälls galler ned som delar arenan i 8 s. Han kallar också på nyckelknektar.
  - **Tidvattenprästen:** slår med snäckstaven och låter tentakler skjuta upp nära dig (bubblor varnar 0,7 s innan). Han höjer vattnet i arenan så att du blir långsam, sänder en våg som knuffar dig och kallar på fiskmän.
  - Båda kan också vara väktare.
- **Kort:** 16 nya kort, åtta nya kortnycklar och två set: FÅNGENS VÄG och FISKARENS VÄG. De nya nycklarna är `alarmQuiet`, `netResist`, `crabCrack`, `gullResist`, `fogSight`, `flailDmg`, `blunderDmg` och `burnResist`. Kortbilderna ritas i `tools/card-art/make.py` (`v21`).
- **Test:** `tools/playtest/t108.mjs` (port 9808).

## Version 20: Kloakerna och Öknen

- **Kloakerna (`sewer`):** inomhus, med valvat tegel (Ȭ) och rörväggar (ȭ), fuktig sten och galler på golvet.
  - Slam (Ȳ) saktar dig 40 % och ger 2 skada i sekunden. Fiender saktas också.
  - Sprutrör (ȳ) sprutar het ånga i 1 s var fjärde sekund (fasen beror på rutan). Ett väsande varnar 0,5 s innan, och ångan gör 8 skada.
  - Slussar (ȷ, `level.sluices = [{x,y,open}]`) är vägg när de är stängda och slam när de är öppna. Slussratten (ȶ) öppnar eller stänger alla slussar på våningen, men en sluss som någon står i stängs inte. Saknas `level.sluices` letas slussarna upp i kartan.
  - Råttbon (ȸ) släpper ut två eller tre råttor var tolfte sekund när du är nära, högst åtta åt gången, tills boet slagits sönder (30 skada).
- **Öknen (`desert`):** utomhus under stark sol, med sanddyner och sandsten (ȯ), klippor (Ȱ), sand och ruinplattor. Öknen är en sen biom.
  - Sandstorm: var trettionde sekund tjocknar dimman i sex sekunder, och sand blåser förbi. Sandvålnaderna blir nästan osynliga.
  - Oaser (ȴ) läker 3 hp/s upp till 60 % av maxhälsan, högst 40 hp per oas. Sedan torkar oasen ut.
  - Hägringar (ȵ) ser ut som oasvatten på mer än fyra rutors avstånd men är sand när du kommer nära. Kvicksand (¯) finns kvar från gravkammaren.
  - Kaktusar (ȹ) ger 4 skada om du går in i dem. Amforor (Ⱥ) går sönder av skott och släpper ett föremål, eller ibland en skorpion. Eldkrukor (Ȼ) lyser.
- **Vapen:**
  - **Kroksabeln (Ʉ):** snabba närstridssvep (30 skada) som träffar alla i bågen. Högerklick ger ett utfallssteg tre rutor framåt med ett hugg (nedkylning 2 s). Den behöver ingen ammo.
  - **Fällkastaren (Ʌ, ammo fällådor Ɇ):** kastar en björnsax som landar och slår igen om en fiende som kliver på den (60 skada och fast i 3 s). Högst fyra saxar ligger ute samtidigt.
  - Båda har pakter med fyra uppgraderingar var.
- **Fiender i kloakerna:**
  - Alligatorn (ȼ) ligger gömd under slammet, rusar fram och biter. Högst två per bana.
  - Slamvarelsen (Ƚ) kastar slamklumpar som lämnar slam där de landar.
  - Rörmokaren (Ⱦ) är tålig och blir snabbare när den är skadad.
  - Igeln (ȿ) fäster sig vid dig och suger blod tills du skjuter den eller hoppar tre gånger.
- **Fiender i öknen:**
  - Skorpionen (ɀ) är snabb, och svanshugget förgiftar.
  - Nomaden (Ɂ) kliver undan åt sidan när du siktar på honom.
  - Sandvålnaden (ɂ) är en flygande sandvirvel som sliter på dig när du är nära.
  - Gamen (Ƀ) cirklar ovanför dig och dyker först när du har under halva hälsan.
- **Bossar:**
  - **Råttkungen:** biter, spyr slam, kallar på råttsvärmar och gräver sig in i väggen för att komma ut någon annanstans.
  - **Sfinxen:** slår med tassen, skjuter ögonstrålar, kallar på mumier och skorpioner och frammanar en sandstorm i arenan.
- **Kort:** 16 nya kort, sju nya kortnycklar (hettan använder den gamla `heatResist`) och två set: KLOAKERNAS VÄG och KARAVANENS VÄG. Kortbilderna ritas i `tools/card-art/make.py` (`v20`).

## Version 19: Gruvan och Observatoriet

- **Den övergivna gruvan (`mine`):** inomhus, med timrade stollar (Ȑ) och malmådror (ȑ) som väggar, och gruvjord och plankgolv på golvet.
  - Räls (Ȗ) är gångbar. Gruvvagnar rullar längs rälsen (`level.carts`, en sluten slinga eller en sträcka fram och tillbaka). Träffas du av en vagn tar du 15 skada och knuffas i färdriktningen. Fiender som träffas tar 40 skada. Rälsens bild väljs efter grannrutorna: vågrät, lodrät eller korsning.
  - Gasfickor (ȗ) ger 1 skada i sekunden. Eld eller en explosion på rutan ger en explosion med radie 2, och elden sprider sig till gasen intill.
  - Knakande tak (Ș): står du kvar under det i 0,8 s rasar det. Du tar 12 skada, hamnar på en fri grannruta, och rutan blir en stenbumling.
  - En gruvvagn i vila (ț) kan du puffa med E. Den rullar då sex rutor rakt fram och gör 60 skada på fiender i vägen.
  - Dynamitlådor (Ȝ) smäller av skott, eld och explosioner, med radie 3 och 50 skada. Karbidlampor (ȝ) lyser.
  - Ett skott i en malmåder ger 1 guld första gången. Hackan bryter ut åderns malm för 3 guld, och åderns ruta blir en vanlig stollvägg.
- **Stjärnobservatoriet (`observatory`):** inomhus högt upp, med mässingspaneler (ȓ, bilden `wall_brass2`) och stjärnkartor (Ȕ).
  - Stjärnkartegolvet (ș) har låg tyngdkraft: hoppen blir dubbelt så höga och långa.
  - Kupolspringor (Ț): var 5–8 s faller en meteor på en springruta nära dig. En ring varnar 1 s innan, och nedslaget gör 20 skada i radie 1,2, även på fiender.
  - Stjärnportar (Ƞ) går i par (`level.starports`) som spegelpalatsets teleportrar.
  - Planetariet (Ȟ) visar utgången och hemligheterna på kartan. Teleskopet (ȟ) visar alla fiender på kartan i 20 s. Båda går att använda en gång.
  - Observatoriet är en sen biom och kommer aldrig först i en omgång eller i Avgrundens sexvåningsvarv. Gruvan kan komma först.
- **Vapen:**
  - **Hackan (ȩ):** tunga närstridsslag (45 skada) som också slår sönder stenbumlingar, knakande tak och malmådror. Den behöver ingen ammo.
  - **Stjärnlansen (Ȫ, ammo stjärnstoftsflaskor ȫ):** håll inne avtryckaren 0,2–1,2 s och släpp. Då går en stjärnstråle genom alla fiender i en linje och gör 25–90 skada efter laddningen.
  - Båda har pakter med fyra uppgraderingar var.
- **Fiender i gruvan:**
  - Gruvarbetaren (ȡ) slåss med hackan och kastar ibland en dynamitstav, som landar där ringen lyser.
  - Kolgolemen (Ȣ) gör 25 % mer skada när den står i eld och exploderar i glöd när den dör. Högst två per bana.
  - Mullvadsmannen (ȣ) gräver ned sig och kommer upp bredvid dig.
  - Gnistlyktan (Ȥ) flyger, tänder gasfickor och exploderar svagt intill dig.
- **Fiender i observatoriet:**
  - Den stjärnfödda (ȥ) flyger och skjuter stjärnskott som delar sig i tre.
  - Astronomen (Ȧ) håller avstånd och kallar ned små meteorer där du står.
  - Urverksugglan (ȧ) dyker mot dig och reflekterar ungefär vart femte skott.
  - Tomrumsväktaren (Ȩ) är ett svävande öga. Dess stråle av stjärnkyla gör dig långsam i 2 s. Högst två per bana.
- **Bossar:**
  - **Gruvförmannen:** slår med släggan, kastar dynamit, släpper gruvvagnar mot dig och får taket att rasa.
  - **Stjärnskådaren:** skjuter stjärnbilder, låter meteorer regna, öppnar gravitationsbrunnar som drar dig till sig och teleporterar mellan stjärnportarna. Hon kallar också fram stjärnfödda.
- **Kort:** 24 nya kort, åtta nya kortnycklar och två set: GRUVANS VÄG och OBSERVATORIETS VÄG. Kortbilderna ritas i `tools/card-art/make.py` (`v19`).

## Version 18: Cirkusen och Djungeltemplet

- **Den övergivna cirkusen (`circus`):** inomhus under randiga tält, med tältduk (Ǯ) och djurburar (ǯ) som väggar och sågspån och manegens röda matta på golvet.
  - Fallluckor (Ǳ) öppnas 1,5 s var sjätte sekund, och varje lucka har sin egen fas. En halv sekund innan skakar de. Står du på en lucka när den öppnas tar du 10 skada och hamnar på senaste säkra ruta. Fiender som står där faller och dör, men inte bossar, väktare eller flygande.
  - Strålkastare (ǲ) sätter dig i rampljuset: du gör 25 % mer skada, men så länge du står där vet alla fiender på våningen var du är.
  - Knivkastarhjul (ǳ) skjuter fyra knivar var andra sekund och vrider sig 45° mellan kasten (6 skada). Hjulet går sönder av 40 skada.
  - Lyckohjulet (Ǵ) kostar 10 guld och kan snurras högst tre gånger. Det ger guld, en dryck, ammo eller ett kort, eller så hoppar en clown fram.
  - Ballongklasar (ǵ) smäller när du skjuter dem och släpper ett föremål. Girlanger av glödlampor (Ƕ) lyser.
- **Djungeltemplet (`jungle`):** utomhus, med mossig tempelsten (ǿ) och tät djungel (Ȁ).
  - Pirayavatten (Ȃ) ger 3 skada var halv sekund och saktar ned 30 %. Fiender som inte flyger tar också skada.
  - Lianer (ȃ) saktar ned 40 % och brinner bort av eld, precis som taggrankorna.
  - Guldidolen (Ȅ) ger 40 guld, men utlöser ett bakhåll: 3–5 fiender ur våningens egen pool dyker upp runt dig. Har bangeneratorn lagt ett stenblock i närheten börjar det också rulla.
  - Pilidoler (ȅ) skjuter en giftpil när du står i linje med dem (räckvidd 8, var 1,5 s).
  - Giftblommor (Ȇ) sprutar ett giftmoln när du kommer närmare än 1,5 rutor. Tikifacklor (ȇ) lyser.
  - Cirkusen och djungeltemplet är sena biomer, som trädgården, drömriket och laboratoriet: de kommer aldrig först i en omgång eller i Avgrundens sexvåningsvarv.
- **Vapen:**
  - **Käglekastaren (ǽ, ammo kägellådor Ǿ):** kastar tre jonglörkäglor (18 skada var) som studsar två gånger mot väggarna.
  - **Blåsröret (Ȏ, ammo pilkoger ȏ):** en tyst och snabb giftpil (12 skada och gift i 3 s). En träff nära mitten av fienden är en huvudträff och gör dubbel skada.
  - Båda har pakter med fyra uppgraderingar var.
- **Fiender i cirkusen:**
  - Clownen (Ƿ) tutar och släpper två ballonger när den dör. Ballongerna flyger mot dig och smäller i konfetti, men du kan skjuta ned dem.
  - Jonglören (Ǹ) kastar tre käglor som studsar en gång.
  - Styltgångaren (ǹ) sparkar hårt. Skjuter du på benen på nära håll tar den dubbel skada och faller omkull i 2 s.
  - Knivkastaren (Ǻ) kastar tre knivar i solfjäder.
  - Cirkuslejonet (ǻ) tar sats och flyger mot dig i ett långt språng.
  - Marionetten (Ǽ) rycker fram i sina trådar. När den dör faller den ihop och reser sig en gång efter 3 s, om du inte skjuter den medan den ligger.
- **Fiender i templet:**
  - Ödlekrigaren (Ȉ) har en sköld som tar halva skadan framifrån.
  - Blåsrörsjägaren (ȉ) är nästan osynlig tills den skjuter giftpilar.
  - Apan (Ȋ) stjäl fem ammo till vapnet du håller och flyr. Dödar du den får du tillbaka dubbelt.
  - Jaguaren (ȋ) är osynlig på mer än fem rutors avstånd och tar språng.
  - Myggsvärmen (Ȍ) flyger, suger 2 hp per bett och läker sig själv.
  - Tempelväktaren (ȍ) är en stenstaty som står still tills du kommer nära. Sedan glöder ögonen, och efter en varning kommer en laserstråle som varar 1 s.
- **Bossar:**
  - **Cirkusdirektören:** smäller med piskan och kastar knivar. En strålkastare följer dig och sätter eld på marken där ljuset står. Han kallar fram nummer (clowner, lejon och knivkastare) och öppnar fallluckor i manegen runt dig.
  - **Den fjädrade ormen:** dyker ned i marken och kommer upp under dig, där en ring varnar först. Den spottar gift i bågar, sveper med svansen och kallar på myggsvärmar.
- **Kort:** 24 nya kort, åtta nya kortnycklar och två set: CIRKUSENS VÄG och TEMPLETS VÄG.

## Version 17: Spökskeppet och Laboratoriet

- **Spökskeppet (`ship`):** ett skepp på ett nattsvart hav, med däck under himlen och kajutor och lastrum under däck. Väggarna är skrov (ǒ) och master med rigg (Ǔ).
  - Ruttna plankor (Ǎ) brakar igenom om du står kvar 0,6 s: 10 skada, och du hamnar på senaste säkra ruta. Fiender som går på dem bryter dem också (stora direkt), tar skada och kliver upp bredvid.
  - Sköljt däck (Ǐ) är halt som is, och var sjätte sekund knuffar en våg allt som står på det.
  - Kanoner (ǎ) avfyras med E dit du tittar, en gång: 60 skada i en linje och en smäll. Skeppslyktor (ǐ) och krutfat (Ǒ) som smäller.
- **Laboratoriet (`lab`):** kakel (Ǡ) och hyllor med burkar (ǡ).
  - Syrakar (Ǜ) fräter: först 2 rustning, sedan 4 skada var halv sekund.
  - En fiende på en transmutationscirkel (ǜ) blir av guld i 3 s: den står still, tar dubbel skada och ger guld om den dör. Själv får du en slumpad dryckeseffekt, högst var 20:e sekund.
  - Teslaspolar (Ǟ) slår en blixt mot det närmaste levande inom fyra rutor, dig eller en fiende.
  - Flaskhyllor (ǝ) går sönder i ett moln av gift, frost eller eld. I alembiker (ǟ) brygger du en dryck för 20 guld, högst två gånger.
  - Laboratoriet kommer, som trädgården och drömriket, aldrig först i en omgång. I Avgrunden är första våningen i varje sexvåningsvarv aldrig en av de tre.
- **Vapen:**
  - **Kedjekulekanonen (Ǫ, ammo kulkistor ǫ):** en snurrande kedjekula som går igenom upp till fyra fiender. Två skott och sedan en lång omladdning.
  - **Syrasprutan (Ǭ, ammo syraflaskor ǭ):** en kort grön stråle. Den skadar över tid och fräter, så att fienden tar 20 % mer skada i 3 s.
  - Båda har pakter med fyra uppgraderingar var.
- **Fiender på skeppet:**
  - Spökpiraten (Ǖ) blir genomskinlig och immun i 1 s efter en träff.
  - Kanonjären (ǖ) lobbar kanonkulor som landar där en ring lyser.
  - Den drunknade matrosen (Ǘ) saktar ned dig och lämnar en vattenpöl.
  - Papegojspöket (ǘ) dyker och stjäl tre guld.
  - Tentakeln (Ǚ) slår över en ring på 2,2 rutor och dyker upp på ett nytt ställe var åttonde sekund.
  - Skeppsråttor (ǚ) kommer i flock.
- **Fiender i laboratoriet:**
  - Homunkulusen (ǣ) delar sig en gång.
  - Slemmet (Ǥ) lämnar syrapölar, tar mindre skada av kulor och mer av eld.
  - Lärlingen (ǥ) kastar flaskor med gift, frost eller eld.
  - Kvicksilvergolemen (Ǧ) reser sig en gång, om den inte dör av eld eller en explosion.
  - Flaskgasten (ǧ) smäller vid kontakt.
  - Kimären (Ǩ) växlar mellan bett, eld och giftspott.
- **Bossar:**
  - **Spökkaptenen:** sabel och flintlåspistol. Han blir till dimma och är då immun, kallar på besättningen och skjuter kanonsalvor med varningsringar.
  - **Alkemisten:** dricker drycker som gör honom till jätte, blixtsnabb eller osynlig (han syns bara när han kastar). Han kastar flaskor, förvandlar golvet till syra och väcker homunkulusar och flaskgastar.
- **Kort:** 24 nya kort, åtta nya kortnycklar och två set: SKEPPETS VÄG och LABORATORIETS VÄG.

## Version 16: Trädgården och Drömriket

- **Den döda trädgården (`garden`):** utomhus, med häckar (Ɵ), murar (Ơ), fontäner (Ƨ) som läker en gång och stenstatyer (ƨ). Taggrankor (ƥ) river och saktar ned, och de brinner bort av eldkastaren, brinnande mark och eld.
- **Drömriket (`dream`):**
  - Drömväggar (Ƣ) och glidande väggar (ƣ, `level.shifts`) som är uppe 2 s och nere 2 s. De stänger aldrig på någon.
  - Falska dörrar (Ʃ) som väcker en drömätare.
  - Drömlyktor (ƪ).
  - Sömnens dimma (Ʀ): fiender längre bort än 4 rutor blir nästan osynliga, och du blir dåsig.
- **Banorna:** trädgården byggs utomhus med häckgångar, murade trädgårdar, statygångar och fontängårdar; drömriket med schackbrädesalar, salar med rader av glidande väggar och rum med falska dörrar. Båda kommer aldrig först i en omgång. Bossarenorna `garden` och `dream` finns, och trädgårdsmästaren och Jon Blund vaktar även vanliga våningar.
- **Vapen:**
  - **Trädgårdssaxen (Ʊ):** två snabba klipp. Högerklick kastar saxen, som kommer tillbaka.
  - **Drömstaven (Ʋ, ammo drömflaskor Ƴ):** en långsam stjärna som saktar ned allt den passerar och smäller i sömn (bedövar).
- **Fiender:**
  - Stenängeln (ƫ) rör sig bara när du inte tittar på den.
  - Taggrankan (Ƭ) är rotad men når långt.
  - Trädgårdsdrängen (ƭ).
  - Drömätaren (Ʈ) äter ljus och släcker lampan.
  - Speglingen (Ư) skjuter när du skjuter och rör sig spegelvänt.
  - Sömngångaren (ư) går inte att smyga förbi och spricker i sömnpulver.
- **Bossar:**
  - **Trädgårdsmästaren:** saxhugg, frön och rankor, och väcker statyer.
  - **Jon Blund:** sömnsand och språng. Han släcker ljuset och väcker dina spegelbilder.

## Version 15: Katedralen och Bikupan

- **Blodkatedralen (`cathedral`):**
  - Ljusstråk (ƍ) välsignar dig, vilket ger +30 % skada en stund.
  - Blodfuntar (Ə) läker fiender inom 4 rutor. Slå sönder dem med E.
  - Klockor (Ɛ) bedövar fiender inom 6 rutor men väcker resten av våningen.
  - Kyrkbänkar (Ǝ).
- **Bikupan (`hive`):** honung (Ɩ) som klibbar fast. Larvsäckar (Ɨ) kläcks när du kommer nära, men går att krossa med E innan dess.
- **Banorna:** katedralen har ett långhus med bänkrader, kor och altare, dopkapell och klocktorn; bikupan sexkantiga vaxceller, larvkammare och honungssalar, och arbetsbin i svärmar om 3–6. Bossarenorna `cathedral` och `hive` finns, och kardinalen och bidrottningen vaktar även vanliga våningar.
- **Vapen:**
  - **Rökelsekaret (ƛ):** ett varv runt dig som träffar allt omkring, och röken läker dig lite.
  - **Bikastaren (Ɲ, ammo bikupor ƞ):** bin som söker upp fiender och sticker dem tre gånger.
- **Fiender:**
  - Korgossen (Ƒ) läker och skyddar fiender omkring sig.
  - Botgöraren (ƒ) blir snabbare ju mer skadad den är.
  - Keruben (Ɯ) skriker så att siktet hoppar.
  - Arbetsbiet (Ƙ).
  - Gaddkrigaren (ƙ) rusar med gadden och förgiftar.
  - Larven (ƚ) spottar syra.
- **Bossar:**
  - **Kardinalen:** heligt ljus slår ned, eldringar, blodmässa och en kör.
  - **Bidrottningen:** rusning, honungspölar, svärmar och ägg.

## Version 14: Arenorna

- **Arenarum (`level.arenas`):** när du går in fälls gallren ned i dörröppningarna och två eller tre vågor av våningens fiender kommer. När den sista är död går gallren upp, och en belöning (ett kortval, guld och hälsa eller ammo) ligger i mitten.
- **Arenornas regler:** från våning 2 i ungefär varannan bana i biomerna med raka rum (aldrig start-, väktar- eller utgångsrummet). Ålar och jordmaskar kommer inte i vågorna, och en våg som inte går att döda släpper efter 45 sekunder.
- **Sjutton nya rumstyper**, en per gammal biom: till exempel pelarsalen, stencirkeln, bron över lavan, kristallkatedralen och läsesalen. Ungefär var fjärde bana får en.
- **Sex fiender i de mellersta biomerna:**
  - Snöfantomen (Ƅ, frost): nästan osynlig tills den är nära.
  - Lavaormen (ƅ, vulkan): dyker ned och bryter upp och spottar lava.
  - Skarabéprästen (Ɔ, gravkammaren): väcker skarabéer och lägger en sandförbannelse.
  - Kristallspindeln (Ƈ, kristall): nät som saktar ned.
  - Marulken (ƈ, sjunkna staden): lockar med ljus och drar ned dig.
  - Vindanden (Ɖ, molnborgen): blåser dig mot kanten och tar nästan ingen skada innan den fäster sig.

## Version 13: Biblioteket och Gjuteriet

- **Det förbjudna biblioteket (`library`):**
  - Bokhyllor (ũ) i rader och pulpeter (Ű), där en bok ger kartan, läkning, raseri eller kunskap.
  - Kandelabrar (ű).
  - Bläck (Ŭ) som gör dig halvblind och långsam.
- **Gjuteriet (`foundry`):**
  - Rullband (Ÿ, `level.belts`) som för med sig dig, fiender och föremål. Texturen vrids efter riktningen och animeras.
  - Smält metall (Ź).
  - Ångventiler (ź) som väser innan de blåser.
  - Stansar (Ż) som slår ned var tredje sekund.
- **Vapen:**
  - **Runboken (ƀ, ammo bläck Ƃ):** målsökande runor. Högerklick ger en virvel av sidor som fångar skott.
  - **Ångkanonen (Ɓ, bränsle):** en kon av skållande ånga som knuffar och blåser bort skott.
- **Fiender:**
  - Flygande bok (Ų).
  - Bläckslem (ų): delar sig och lämnar bläck.
  - Arkivariespöke (Ŵ): blinkar och väcker böcker.
  - Smältgolem (Ž): lämnar brinnande metall.
  - Ångautomat (ž): sprutar ånga.
  - Gnistdrönare (ſ): exploderar.
- **Bossar:**
  - **Bibliotekarien:** runor, bläck, språng mellan hyllorna och en storm av sidor.
  - **Smideskolossen:** markslag med chockvågor, smält metall ur ugnen, rusning och eld runt sig.

Nya bossar kommer med i turordningen först när bangeneratorn kan bygga deras arena.

## Version 12: Blodets rytm

Version 12 gör om stridens grundloop. Den jämfördes först med tolv moderna boomer shooters: vad belönar de, vad driver spelaren framåt och vad saknade Krypta?

**Jämförelsen**

| Spel | Loopens kärna | Fanns i Krypta? | Version 12 tar |
|---|---|---|---|
| DOOM Eternal | Avrättning ger hälsa, eld ger skydd, motorsåg ger ammo: resurserna tas från fienderna | Delvis (livsstöldkort) | Avrättningar, resursloopen |
| ULTRAKILL | Stilmätare D–SSS, blod läker när du är nära, parering läker, betyg per bana | Kombo i guld | Stilmätaren, blodläkning, sparkparering, betyg |
| Klassiska DOOM | Fiender som träffar varandra börjar slåss inbördes | Nej | Inbördes strid |
| Quake | Megahälsa över max som sjunker tillbaka | Nej | Överhälsa |
| DUSK | Snabb rörelse, glidning, hemligheter, tabell per bana | Glidning, hemligheter, tabell | Glidhopp |
| Turbo Overkill | Glidningen är ett vapen (motorsågsben) | Nej | Glidspark |
| Mullet MadJack | Tio sekunder att leva, dödanden köper tid | Nej | Utmaningen KLOCKAN |
| Amid Evil | Själsläge som laddas av dödanden | Förmågekort som laddas av dödanden | – |
| Ion Fury | Förstörbar miljö, många hemligheter | Ja (krutfat, krukor, hemligheter) | – |
| Prodeus | Köttbitar, tydliga resurser, automap | Ja | Föremål dras till dig |
| Cultic | Glidning, vapenhjul som saktar tiden | Ja (vapenhjulet saktar tiden) | – |
| Warhammer 40K: Boltgun | Tung närstrid som en del av skjutandet | Yxa, hammare, spark | Närstrid avrättar och ger ammo |
| Nightmare Reaper | Roguelite med slumpade vapen | Kort, pakter och legendariska vapen | – |

Snabba vapenbyten är gemensamt för nästan alla tolv, så bytet är nu ungefär en tredjedel snabbare.

**Listan, och vad som är gjort**
1. **Stilmätaren (stor):**
   - Varje död ger poäng, och variation ger mer: nytt vapen, i luften, glidning, huvudträff, flerdöd, smygdöd, i bitar, sprängd, närstrid, avrättning, parering och inbördes strid.
   - Att använda samma vapen gång på gång halverar poängen, och skada sänker mätaren.
   - Nivåerna är D (DÖDANDE), C (CHOCKERANDE), B (BRUTALT), A (ANARKISTISKT), S (SKONINGSLÖST), SS (SADISTISKT) och SSS (KRYPTISKT). Från B ger varje död extra guld, och från A extra erfarenhet.
   - Mätaren är en ruta till höger och kan stängas av i inställningarna.
2. **Avrättningar (stor):** fiender på 25 % hälsa vacklar och blinkar blåvitt. En spark eller ett närstridsslag avrättar dem direkt och ger 15 hälsa och kort osårbarhet.
3. **Sparkparering (mellan):** V sparkar tillbaka skott framför dig. De flyger mot skytten med 2,5 gånger skadan och ger 10 hälsa och stilpoäng.
4. **Överhälsa (liten):** avrättningar och pareringar kan ge upp till 150 % hälsa. Överskottet sjunker två hälsa i sekunden, och vanlig läkning sänker det aldrig.
5. **Resursloopen (mellan):**
   - Dödanden närmare än två rutor läker 3.
   - Fiender som brinner när de dör ger 6 skydd.
   - Närstridsdödanden ger ammo till alla vapen du bär.
6. **Inbördes strid (mellan):**
   - Fiendernas skott skadar andra sorters fiender, och den som träffas ger igen i sex sekunder.
   - Närstridsfiender går fram och slår, och skyttar skjuter tillbaka.
   - Samma sort skadar inte varandra.
7. **Glidspark och glidhopp (liten):** glidningen sparkar undan fiender i vägen, och ett hopp mitt i en glidning behåller farten.
8. **Våningsbetyg (mellan):**
   - Tid mot par (25 s + 5 s per fiende), andel dödade, hemligheter, skada och högsta stil ger betyget S, A, B, C eller D.
   - Betyget ger 50, 30, 15, 5 eller 0 guld och visas stort i våningens tabell.
9. **KLOCKAN (mellan):** en ny utmaning som kan kombineras med de andra.
   - Du har tio sekunder att leva. En död ger 3 sekunder, en snygg död 4,5 och en avrättning fyller på allt, upp till 12.
   - Klockan står still när det inte finns något att döda. Träffar på bossen ger lite tid, och läget ger +60 % själar.
10. **Snabbare vapenbyten (liten):** fram 0,22 s och undan 0,14 s, tidigare 0,32 och 0,22.
11. **Magnet (liten):** guld, hälsa, ammo och andra småsaker som fiender tappar dras till dig inom två rutor.
12. **Fem prestationer:** BÖDELN, PARERINGSMÄSTAREN, KRYPTISKT, FELFRI och SPLIT OCH HÄRSKA.

Sådant som redan fanns i Krypta och inte behövde göras om: själsläget (förmågekorten laddas av dödanden), förstörbar miljö, hemligheter, kombo, glidning, vapenhjulet och slumpade vapen (legendariska vapen och pakter).

## Version 11: Svampriket och Spegelpalatset

Version 11 lägger till två nya biomer med egna mekaniker:
- **Bilder:** ritas med `tools/props9/make.py`.
- **Ljud och musik:** byggs med `tools/sounds/make9.sh`.
- **Bangeneratorn:** har fått biomerna, arenorna och väktarna.

**Två nya biomer**
- **Svampriket (`fungus`):**
  - Grottor med glödsvampar (Ŧ) som lyser.
  - Studsplattor (ţ) kastar dig långt i den riktning du går, med lång lufttid.
  - Sporpölar (Ť) vänder på styrningen en stund och ger syner av fiender som inte finns.
- **Spegelpalatset (`mirror`):**
  - Marmorsalar med spegelväggar (š) som studsar alla skott, både dina och fiendernas. Kulor kan studsa upp till tre gånger och träffa runt hörn.
  - Teleportrar (ť) går i par (`level.teleports`).
  - Spegelstatyer (ŧ).

**Tre nya vapen, med pakter och uppgraderingar**
- **Sporkastaren (Ŕ, ammo sporsäckar Ũ):** sporbollar i båge som lämnar giftmoln. Svampfolket läker sig i molnen.
- **Spegelskölden (ŕ):**
  - Slaget knuffar fiender.
  - Höger musknapp håller upp skölden. Skott framifrån studsar då tillbaka, och slag framifrån tar bara en fjärdedel av skadan.
  - Den som höjer skölden precis före träffen parerar: skottet går tillbaka mot skytten.
- **Piskan (Ŗ):**
  - Lång räckvidd, och spetsen smäller hårdast.
  - Drar mindre fiender till dig.

**Sex nya fiender**
- **Sporling:** spricker i ett giftmoln.
- **Mycelbest:** läker sig i sporer.
- **Svampshaman:** kastar sporbollar och väcker sporlingar.
- **Spegelriddare:** studsar skott framifrån när skölden är uppe.
- **Illusionist:** byter plats med falska kopior som försvinner vid en träff.
- **Glasskärva:** splittras i skärvor när den dör.

**Två nya bossar**, som även kan dyka upp som väktare:
- **Mycelmodern (boss9):** sporbollar, mycel som växer upp under dig, ett tungt markslag och ett sporfält som hon läker sig i.
- **Spegelkungen (boss10):** glasskärvor och en speglande ställning som skickar tillbaka skotten. Han delar sig också i spegelbilder och byter plats med en av dem, och när den äkta kungen träffas krossas bilderna.

**Mer**
- 24 nya kort, två nya set och åtta nya kortegenskaper:
  - sporeResist, bounceHeight, teleportShield, reflectDmg
  - illusionSight, mirrorShards, fungusHeal, whipReach
- Tre nya prestationer. Nyheterna och handboken är uppdaterade.

**Lugnare gränssnitt**

Förebilderna är Doom, Quake, Wolfenstein 3D och Ultrakill: bilden ska vara ren, och informationen ska ligga där man vet att den finns.
- **Statuslisten:** fem lika fält (hälsa, skydd, ammo, vapen, våning), med en stor siffra och en liten etikett under.
  - Vapenrutorna, dödsräknaren och kortantalet är borta från listen; de finns i målet, pausen och kortlistan.
  - Granater, nycklar och vapennivå ligger på en rad under vapnets namn.
- **Meddelanden:** ett i taget, och det förra bleknar under det.
  - De väntar medan titelkortet visas och läggs under bossens livmätare.
  - Samma meddelande visas inte två gånger.
- **Titelkortet:** bara namn och undertitel, plus högst en rad om händelse eller förbannelse.
  - Bossens entré visas inte samtidigt som våningens titelkort.
- **Minikartan och målet:**
  - Minikartan är mindre och genomskinligare.
  - Målet syns tydligt när det ändras och bleknar sedan.
  - Medan en boss eller väktare syns visas livmätaren i stället för målet.
- **Pausen:** en lugn panel med rundans uppgifter och två rader tangenter. Hela tangentlistan finns i handboken.
- **Våningsstatistiken och dödsskärmen:** raka tabeller utan överlapp. Tipset och tangenterna ligger längst ned.
- **Startskärmen:** NY RUNDA och DAGENS RUNDA först, sedan LÄGRET, KAMPANJEN och FLER LÄGEN.
  - Svårighet, klass, följeslagare, utmaningar och sparplats samlas under ANPASSA RUNDAN, med en sammanfattning bredvid.
  - Fröet ligger under FLER LÄGEN, och känslighet och synfält finns i inställningarna.
- **Kortvalet:** FÖRE → EFTER visas bara när kortet ändrar något man redan har.

## Version 10: Nya invånare

Version 10 fyller de tidiga biomerna, som man ser oftast, med nytt liv:
- **Bilder:** ritas med `tools/props8/make.py`.
- **Ljud och musik:** byggs med `tools/sounds/make8.sh`.
- **Bangeneratorn:** har fått nya fiender i de gamla biomerna och legendaltaret.

**Sex nya fiender i de gamla biomerna**
- **Fångvaktaren (kryptan):** kastar en kedja som binder dig.
- **Grävaren (grottorna):** gräver under marken och bryter upp under dig.
- **Likgrävaren (kyrkogården):** väcker döda kroppar till skelett.
- **Rotvättet (skogen):** låter rötter skjuta upp där du står.
- **Armborstskytten (borggården):** skjuter långt och söker skydd.
- **Paddjätten (träsket):** drar dig med tungan och hoppar.

**Legendariska vapen**
- Sex varianter av befintliga vapen, med egna bilder och ljud:
  - **Drakbössan:** sätter fyr.
  - **Frostgeväret:** fryser.
  - **Själapistolen:** läker.
  - **Åskstaven:** blixtar.
  - **Blodyxan:** livsstöld och raseri.
  - **Månbågen:** märker fienden så att den tar mer skada.
- Hittas sällan hos eliter och väktare, eller köps vid legendaltaret (Œ) för guld eller själar.

**Följeslagare**
- Eldflugan, stengolemen och ugglan är nya, och själaaltarets FLOCKEN har sex nivåer.
- Alla sex följeslagare har nu egna bilder, även korpen, lyktan och vargvalpen som tidigare lånade andra fienders bilder.

**Banbyggaren**
- Rita egna banor på ett rutnät av 32 × 24 rutor (FLER LÄGEN → BANBYGGAREN). Det går med mus eller finger.
- Det finns väggar, dörrar, start och utgång, nio fiender, föremål och faror, och man väljer vilken biom banan ska se ut som.
- PROVSPELA kontrollerar först att utgången går att nå. När man når utgången kommer man tillbaka till byggaren.
- DELA LÄNK kopierar en länk med banan inbakad (`?bana=…`), så att andra kan spela den.

**Mer**
- Startskärmen är städad: de vanligaste valen syns direkt, resten ligger under FLER LÄGEN och SAMLINGAR.
- Egen musik i Lägret och en fanfar när ett kampanjkapitel börjar.
- Två prestationer för legendariska vapen.

## Version 9: Klocktornet och Molnborgen

Version 9 lägger till två biomer, tre vapen, sex fiender och två bossar, så att det finns tolv bossar totalt:
- **Bilder:** ritas med `tools/props7/make.py` och `tools/weapon-frames`.
- **Ljud och musik:** byggs med `tools/sounds/make7.sh`.
- **Kort:** byggs med `tools/card-art/make.py` (`make.py . v9`).
- **Bangeneratorn:** har fått biomerna Klocktornet och Molnborgen, två arenor och två väktare.

**Klocktornet**
- Sågklingor åker fram och tillbaka i spår i golvet.
- Tidsbubblor saktar in allt inuti dem: dig, fienderna och skotten.
- Urverk ger ljus, och ett klockspel (Ň) stannar urverken en stund.

**Molnborgen**
- Flytande öar över ett tomrum. Faller du hamnar du på senaste säkra plats och tar skada.
- Vindrutor knuffar dig, och vindbyar kommer med jämna mellanrum.
- Åskan slår ned där marken glöder, men blixtstänger drar till sig den.
- Molnkistor kan öppnas.

**Tre nya vapen**
- **Sågbladskastaren:** klingor som studsar mot väggar och går igenom fiender. Ammon är kugghjul.
- **Vindbössan:** laddas av sig själv. Den knuffar fiender in i väggar eller ut i tomrummet och blåser tillbaka skott.
- **Spjutet:** stöter med vänsterklick och kastas med högerklick. Gå över spjutet för att plocka upp det.

**Sex nya fiender**
- Urverkssoldat, som lindas upp igen en gång efter döden.
- Kuggspindel.
- Tidsväktare, som lägger tidsbubblor.
- Harpya, som dyker ned.
- Stormkallare, som kallar på blixtar.
- Molnjätte, som blåser bort dig.

**Två nya bossar**
- **Urmakaren:** sågklingor, tidsbubblor och urverkssoldater. Han kan vrida tillbaka tiden och få tillbaka hälsa.
- **Stormfågeln:** dyker, kallar ned åskstormar, skickar harpyor och blåser dig mot kanten.

**Kampanjen**
- Sex kapitel i fast ordning:
  1. Kryptan
  2. De dödas marker
  3. Is och eld
  4. Sanden
  5. Djupet
  6. Himlen
- Varje kapitel har en kort berättelse, två våningar i bestämda biomer och en bestämd boss.
- Senare kapitel börjar med fler vapen, mer guld och fler talangval.
- Kapitlen nås med knappen KAMPANJEN eller från en portal i Lägret.
- När hela kampanjen är klar öppnas Krönikans slut.

**Krönikans slut**
- När alla krönikesidor är hittade öppnas en portal i Lägret till den hemliga slutbossen, Den förste munken.
- Han strider i tre faser med krafter från Faraonen, Kristalldrottningen och Stormfågeln, och kan dessutom vrida tillbaka tiden som Urmakaren.
- Segern ger 150 själar, en prestation och titeln DEN SISTE MUNKEN.

**Mer**
- Klassen Spjutbäraren.
- Skjutbanan i Lägret: provdockor som visar skada per sekund.
- Fyra nya elitegenskaper: tidsbunden, åskande, prismatisk och stormvind.
- Vapenmästaren i Lägret, där vapen med 100 dödanden kan väljas som startvapen.
- Fjädrar ger dubbelhopp en våning.
- 6 prestationer, 4 krönikesidor och nya kort.

## Version 8: Avgrunden

Version 8 gör spelet större med två biomer, ett talangsystem, ett nytt läge och mycket nytt innehåll:
- **Bilder:** ritas med `tools/props6/make.py` och `tools/weapon-frames`.
- **Ljud och musik:** byggs med `tools/sounds/make6.sh`.
- **Kort:** byggs med `tools/card-art/make.py` (`make.py . v8`).
- **Bangeneratorn:** har fått biomerna Kristallgrottorna och Den sjunkna staden, två nya bossarenor och två nya väktare.

**Erfarenhet och talanger**
- Dödanden, kunskapsböcker (Ģ) och talangaltare (Ġ) ger erfarenhet. Varje ny nivå ger ett val av tre talanger.
- Det finns 30 talanger i tre grenar: Krigaren, Skuggan och Mystikern. Några kräver en annan talang först, och många har flera rangar.
- Talangskärmen (`CardUI.talents`):
  - 1–3 väljer en talang, R slår om och T visar hela trädet.
  - Pausmenyn visar dina talanger.

**Två nya biomer**
- **Kristallgrottorna:**
  - Glödande kristaller och kristallådror ger färgat ljus, och kristallspikar skadar.
  - Brytande kristaller (Ė) delar varje skott, även prismans strålar, i tre.
- **Den sjunkna staden:**
  - I djupt vatten (Đ) simmar du långsamt och kan inte hoppa.
  - En luftmätare töms under vattnet, och luftbubblor (Ĝ) fyller på.
  - Tidvattenrutor (Ĕ) blir djupa med jämna mellanrum.
  - Vrakkistor kan innehålla skatter, eller vara en mimic.

**Tre nya vapen** (med pakter och fyra uppgraderingar vardera)
- **Harpunen:** drar fienden till dig. Träffar den en vägg drar den dig dit.
- **Bumerangen:** flyger ut, träffar och kommer tillbaka.
- **Prisman:** en kristallstråle som studsar mot väggar.

**Åtta nya fiender**
- Kristallgolem, som slår sönder marken.
- Skärvirrbloss, som skjuter skärvor och hoppar undan.
- Drunknad sjöman, med en båtshake som drar.
- Ål, som bara finns i djupt vatten.
- Siren, vars sång drar dig mot henne.
- Jättekrabba, med ett skal som skyddar framifrån.
- Skuggjägare, som bara syns i ljus.
- Häxa, som förhäxar dig och teleporterar sig.

**Två nya bossar**
- **Kristalldrottningen:** skärvsalvor, studsande strålar och en spegelsköld som skickar tillbaka skotten.
- **Leviatan:** dyker i bassängen och kommer upp någon annanstans, sprutar vatten, skickar vågor och kallar på ålar.

**Avgrunden**
- Ett nytt läge med oändlig nedstigning genom slumpade biomer.
- Varje våning är svårare än den förra, och det kommer en boss var sjätte våning.
- Djupaste våningen sparas som rekord.

**Lägret**
- Ett gångbart nav mellan rundorna (knappen LÄGRET).
- Portaler leder till Ny runda, Dagens runda, Avgrunden, Dagens avgrund, Labyrinten, Bossjakten och Fortsätt.
- Figurerna ger själaaltaret, kortarkivet med bestiarium och statistik, upplåsningar, övning och krönikan.
- Det står en staty för varje boss du har besegrat.

**Mer**
- Dagens avgrund: samma frö för alla en dag, med topplista.
- Våningshändelserna Visdomens natt, Resonans (kristall) och Stormflod (sjunken stad).
- Själaaltaret: Visdomen, Ödets tärning och Förberedelsen.
- Handkontrollen styr alla menyer.
- Förstagångstips för de nya systemen.
- Kartografen säljer kartor och hemligheter.
- Den nya klassen Dykaren.
- 24 nya kort och två nya set: Djupets väg och Prismans väg.
- 10 nya prestationer och nya dagliga uppdrag.
- Statistik för Avgrunden och nivåer.

**Rättelser**
- Kastknivarna drog två knivar per kast.
- Kvicksanden sänkte aldrig kameran.
- Laddhinten visades för närstridsvapen.

## Assets som används

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
| Version 7: kastknivar, stridshammare, musköt | knivarna och hammaren ur KayKit *Fantasy Weapons Bits* (`dagger_A`, `hammer_A`, CC0), musköten byggd på *PSX Shotgun Pack* `OneBarrelShotgun`, renderade med `tools/weapon-frames` (nytt `fan`-läge och `charge`-läge) |
| Version 7: mumie, schakalkrigare, ficktjuv, skarabé, dubbelgångare, Faraonen, NPC:er, Gravkammarens texturer, rekvisita, föremål, partiklar och ikoner | `tools/props5/make.py`. Faraonen bygger på TinyRPG *Demon* och dubbelgångaren på Warped *cyberpunk-detective* (Legacy Collection, Ansimuz, CC0); mumien, schakalen, ficktjuven och NPC:erna på *Pixel Crawler 2.11* (Anokolisa); ytor från Kenney *retro-textures-fantasy* och *Classic64* (CC0); resten ritas i skriptet |
| Version 7: 47 ljud och musiken för Gravkammaren, Faraonen, smyg och labyrinten | `tools/sounds/make5.sh`: Kenney *impact-sounds*, *rpg-audio*, *casino-audio* och *voiceover-pack* (CC0), 400 Sounds Pack (CC0); musiken och rösterna syntetiseras i skriptet |
| Version 7: 35 nya kortbilder | `tools/card-art/make.py` ur `assets/ashfall-ai/flux` och effektbilder; pakternas vapen ritas i skriptet |
| Version 8: harpun, bumerang, prisma | harpunen ur KayKit *Fantasy Weapons Bits* (`spear_A`, CC0), prisman byggd på *Guns&Explosives*, bumerangen och handen byggda av enkla former i `tools/weapon-frames` |
| Version 8: åtta fiender, Kristalldrottningen, Leviatan, kristall- och ruintexturer, vatten, props, partiklar, ikoner och 30 talangikoner | `tools/props6/make.py`. Sjömannen, häxan och kartografen bygger på *Pixel Crawler 2.11* (Anokolisa), sirenen på Gothicvania *Dancing Girl*, skuggjägaren på *WereWolf* och Kristalldrottningen på TinyRPG *Witch* (Legacy Collection, Ansimuz, CC0); ytor från Kenney *retro-textures-fantasy* och *Classic64* (CC0); golemen, ålen, krabban, Leviatan och resten ritas i skriptet |
| Version 8: 45 ljud och musiken för Kristallgrottorna, Den sjunkna staden, två bossar och Avgrunden | `tools/sounds/make6.sh`: Kenney *impact-sounds*, *rpg-audio* och *voiceover-pack* (CC0), 400 Sounds Pack (CC0); musiken och rösterna syntetiseras i skriptet |
| Version 8: 39 nya kortbilder | `tools/card-art/make.py . v8` ur `assets/ashfall-ai/flux` och `assets/ashfall-ai/meshy/icons`; pakternas vapen ritas i skriptet |
| Version 9: sågbladskastare, vindbössa, spjut | sågbladskastaren och vindbössan byggda på *Guns&Explosives* (GreaseGun, Luger), spjutet ur KayKit *Fantasy Weapons Bits* (`spear_A`, CC0), renderade med `tools/weapon-frames` |
| Version 9: sex fiender, Urmakaren, Stormfågeln, mässings-, kugg-, moln- och stormtexturer, props, partiklar och ikoner | `tools/props7/make.py`. Urverkssoldaten och stormkallaren bygger på *Pixel Crawler 2.11* (Anokolisa); ytor från Kenney *retro-textures-fantasy* och *Classic64* (CC0); tidsväktaren, kuggspindeln, harpyan, molnjätten, bossarna och resten ritas i skriptet |
| Version 9: 38 ljud och musiken för Klocktornet, Molnborgen, Urmakaren och Stormfågeln | `tools/sounds/make7.sh`: Kenney *impact-sounds* och *rpg-audio* (CC0), 400 Sounds Pack; musiken syntetiseras i skriptet |
| Version 9: 39 nya kortbilder | `tools/card-art/make.py . v9` ur `assets/ashfall-ai` och Kenney *particle-pack* (CC0); pakternas vapen ritas i skriptet |
| Version 10: sex fiender, sex följeslagare, legendaltaret, legendariska vapen, partiklar och ikoner | `tools/props8/make.py`. Fångvaktaren, likgrävaren och armborstskytten bygger på *Pixel Crawler 2.11* (Anokolisa); de legendariska vapnen är omfärgningar av spelets egna vapenbilder; resten ritas i skriptet |
| Version 10: 27 ljud, Lägrets musik och kapitelfanfaren | `tools/sounds/make8.sh`: 400 Sounds Pack och Kenney *impact-sounds* och *rpg-audio* (CC0); musiken syntetiseras i skriptet |
| Version 11: sex fiender, två bossar, svamp- och marmorväggar, spegelväggen, golvrutor, rekvisita, partiklar och ikoner | `tools/props9/make.py`. Spegelriddaren och illusionisten bygger på Body_A ur Pixel Crawler Free Pack 2.11 (Anokolisa; fri kommersiell användning, ändringar tillåtna, ingen vidareförsäljning). Marmorns ådror kommer från Classic 64 Asset Pack 0.6 (CC0). Resten ritas i skriptet |
| Version 11: förstapersonsvapnen sporkastaren, spegelskölden och piskan | `tools/weapon-frames` (static-defs.json, pack.py). Spegelsköldens svärd är `sword_B` ur KayKit Fantasy Weapons Bits (CC0) |
| Version 11: 25 ljud och musik för Svampriket, Spegelpalatset, Mycelmodern och Spegelkungen | `tools/sounds/make9.sh`: Kenney *impact-sounds* och *rpg-audio* samt 400 Sounds Pack (CC0); musiken syntetiseras i skriptet |
| Version 11: 39 kortbilder | `tools/card-art/make.py . v11`: meshy-ikoner, vfx och partiklar som inte använts tidigare; pakternas vapen ritas som siluetter |
| Typsnitt | Press Start 2P (OFL) |

Se licensfilerna i respektive källpaket.
