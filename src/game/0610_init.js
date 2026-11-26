(async () => {
  const st = document.getElementById('status');
  try {
    const bar = document.getElementById('loadbar'), help = document.getElementById('loadhelp');
    if (help) help.textContent = isTouch() ? 'VÄNSTER TUMME GÅR · HÖGER TUMME SIKTAR · TRYCK SNABBT FÖR ATT SKJUTA · HANDEN ÖPPNAR OCH HANDLAR' : 'WASD GÅ · MUS SIKTA · SPACE HOPPA · E ANVÄND · F GRANAT · H DRYCK · R LADDA OM';
    const tick = setInterval(() => { if (bar) bar.style.width = Math.min(98, loadN / 3.2) + '%'; }, 100);
    await loadAll(t => { st.textContent = t; });
    clearInterval(tick); if (bar) { bar.style.width = '100%'; setTimeout(() => { bar.parentNode.hidden = true; if (help) help.hidden = true; }, 300); }
    st.textContent = ''; prefetchSounds();
    for (const id of ['start', 'daily', 'unlocks', 'altar']) document.getElementById(id).disabled = false;
  } catch (e) { st.textContent = 'FEL: ' + e.message; console.error(e); }
  checkAch(); refreshTitle(); setupTouch(); setupSliders(); applyDisplay();
  v26cTouchBtn(); // version 26C: hånknappen i ALLA KNAPPAR
  if (isTouch()) document.body.classList.add('touch');
  addEventListener('resize', () => { if (settings.rotatePause && isTouch() && state === 'play' && innerHeight > innerWidth * 1.1) { pause(); say('PAUSAT – VRID TILLBAKA MOBILEN', 2); } }); // pausa vid stående läge
  CardUI.sfx = n => { const m = { flip: ['card', 0.4, 1.3], pick: ['card', 0.8, 0.9], deny: ['click', 0.6, 0.7], open: ['card', 0.3, 0.8], hover: ['ui_hover', 0.3, 1], click: ['ui_click', 0.5, 1] }[n]; if (m) play(m[0], m[1], m[2]); };
  document.querySelectorAll('#title button').forEach(b => { b.addEventListener('mouseenter', () => play('ui_hover', 0.3)); b.addEventListener('click', () => play('ui_click', 0.5)); });
  requestAnimationFrame(loop);
  window.__game = { P, WS, ents: () => ents, items: () => items, pots: () => pots, chests: () => chests, merchants: () => merchants, state: () => state, banner: () => levelBanner, run: () => run, kills: () => kills, begin, doors: () => doors,
    fire, useKey, startReload, switchWeapon, floorDone, nextFloor, projectiles: () => projectiles, secrets: () => secrets, keys, setMouse: (d, aim) => { mouseDown = d; aimDown = !!aim; }, pause, resume, hurtPlayer,
    light: () => light, lvl: () => lvl, boss: () => boss, gainCard, startLevel, props: () => props, guardian: () => guardianE, explode, alertEnemy, WEAPONS, mods: () => M, loadFloor, openShop, openChest, profile, showTitle, endRun, hurtEnemy,
    spawnEnemy: (type, x, y) => { const e = makeEnemy(type, x, y); ents.push(e); totalEnemies++; return e; }, portals: () => portals, particles: () => particles, hazards: () => hazards,
    pet: () => pet, allies: () => allies, beginMaze, beginBossHunt, beginEnemyPractice, beginAbyss, beginHub, openEditor, styleRef: () => style, arenasRef: () => arenas, arenaCurRef: () => arenaCur, execute, canExec, kickParry, edEncode, edDecode, playCustom, giveLegend, LEGENDS, beginCampaign, pclouds: () => pclouds, tports: () => tports, beginFinale, lightningAt, bubbles: () => timeBubbles, sawsRef: () => saws, voidAt, solid, hasLOS, freeSpot, mapRef: () => map, enterPortal, killAllCheat: () => { for (const e of ents) if (!e.dead && !e.boss) hurtEnemy(e, 99999, e.x, e.y, { noProc: true }); if (boss && !boss.dead) hurtEnemy(boss, 99999, boss.x, boss.y, { noProc: true }); }, talentPick, gainXp, TALENTS, talent, deepAt, tideHigh, pauseMenu, settings, refreshTitle, checkAch, showStats, levelTime: () => levelTime, showTitles, cmode, shareSeed, soundCue, cues: () => cues, deathMap: () => deathMap, findPage, showChronicle, toggleLamp, throwStone, openGambler, openBanker, openWanderer, visibility, addPropAt, openCampfire, openQuestBoard, giveRune, useAbility, quests: () => quests, drinkPotion, swapPotion, givePotion, givePet, spawnAlly, spawnPortal, dropItem, openAlchemist, openPriest, openPetCage, biomeFor, useProp, v19: () => ({ carts: v19carts, loose: v19loose, ports: v19ports, slits: v19slits, mets: v19mets, wells: v19wells, rays: v19rays, beams: v19beams, pend: v19pend, ore: v19ore, setup: setupV19, meteor: v19Meteor, grav: v19Grav, clock: v19clock }), v18: () => ({ trapdoors: v18doors, spotOn: P.spotT > 0, darts: v18darts, beams: v18beams, clock: v18clock }), hitProp, burnThorns, v17: () => ({ lobs, clouds: v17clouds, puddles: v17puddles, tiles: v17tiles, wave: v17wave }) };
  window.__game.hudRects = () => { const L = hudLay(); return { hp: L.hp, ammo: L.ammo, map: L.map }; }; window.__game.settings = window.__game.settings || settings; window.__game.say = say; window.__game.msgs = () => msgs; // HUD-hörnen i spelkoordinater (320×200) – pekkontrollerna trycker på dem
  window.__game.sky = skyApi; // version 25.1: egna himlar per biom (t118)
  window.__game.gfxE = gfxEApi(); // FIENDER: räknare och av/på för t104
  window.__game.v27b = v27bApi(); // version 27 (BLOOD): väggstänk, strålar, pölar, fotspår och BLOD AV/NORMAL/MYCKET (t135–t139)
  window.__game.v28 = v28Api(); // version 28 (REND): blod i taket, genomsiktliga galler och fönster (t150–t154)
  window.__game.v26c = v26cApi(); // version 26C: huvudet lossnar, stilstyrd musik och hån (t130–t133)
  window.__game.ai = ai24Api(); // version 24: fiende-AI – poletter, roller, skyddspunkter och barks (t112)
  window.__game.roles = r25Api(); // version 25: fienderoller – sköldvakt, befälhavare och granatkastare (t114)
  window.__game.v26b = v26bApi(); // version 26B: närstridsparering, flygspark och granatretur (t125–t127)
  window.__game.v20 = v20api; window.__game.v21 = v21api; window.__game.v22 = v22api; window.__game.v23 = v23api; window.__game.gfxW = gfxWApi(); window.__game.weaponFrame = () => { const r = weaponFrame(); return { idx: r.idx, dx: r.dx, dy: r.dy }; }; window.__game.fogK = () => fogK;
  window.__game.look = { LK, max: LK_MAX, tot: LK_TOT, bufW: LK_W, bufH: LK_H, dims: lkDims, project, // upp/ned-blicken för t111
    probe: () => { tpx.fill(0); spx.fill(0); const c0 = LK.clamps, lk = lkBegin(); try { renderWorld(W, VH, px); if (lk) lkProject(); } finally { if (lk) lkEnd(); } // världen utan färgton; ofyllda punkter har alfa 0
      let holes = 0, h = 2166136261; for (let i = 0; i < spx.length; i++) { const c = spx[i]; if (!(c >>> 24)) holes++; h = Math.imul(h ^ c, 16777619); }
      return { on: LK.on, holes, clamps: LK.clamps - c0, TW: LK.TW, TH: LK.TH, hash: h >>> 0, px: Array.from(spx) }; } };
  window.__game.efx = efxApi; // version 25: Effekseer-effekter (t115)
  window.__game.gl = glApi(); // version 28 (WEBGL): t160–t164
  window.__game.fix251 = fix251Api(); // version 25.1: lobbar och smällar genom väggar, röster (t116)
  window.__game.v26a = v26aApi(); // version 26A: sprängskott och myntet (t120, t121)
  window.__game.pb = pbApi; // version 27: partikelbudgeten (t147)
  window.__game.efx2 = efx2Api; // version 25.1: fler Effekseer-effekter (t117)
  window.__game.flame = { groundFires: () => groundFires, light: (x, y) => lightAt(x, y) }; // version 25.1: eldkastarens ljus (t119)
  if (params.has('autostart')) begin('new');
})();
document.getElementById('start').addEventListener('click', () => startMode('new'));
document.getElementById('setupstart').addEventListener('click', () => setupStart());
document.getElementById('daily').addEventListener('click', () => startMode('daily'));
document.getElementById('practicebtn').addEventListener('click', () => openPractice());
document.getElementById('newsbtn').addEventListener('click', () => { showNews(); listPager(); });
document.getElementById('manualbtn').addEventListener('click', () => { showManual(); listPager(); });
document.getElementById('continue').addEventListener('click', () => begin('continue'));
document.getElementById('unlocks').addEventListener('click', () => { ensureAudio(); openUnlocks(); });
document.getElementById('altar').addEventListener('click', () => { ensureAudio(); openAltar(); });
document.getElementById('settingsbtn').addEventListener('click', () => { ensureAudio(); openSettings(() => refreshTitle()); });
document.getElementById('profilebtn').addEventListener('click', () => showProfile());
document.getElementById('bestiary').addEventListener('click', () => showBestiary());
document.getElementById('achbtn').addEventListener('click', () => showAchievements());
document.getElementById('codexbtn').addEventListener('click', () => showCodex());
document.getElementById('bossrush').addEventListener('click', () => startMode('bossrush'));
document.getElementById('weekly').addEventListener('click', () => startMode('weekly'));
document.getElementById('survival').addEventListener('click', () => { if (!document.getElementById('start').disabled) beginSurvival(); });
document.getElementById('statsbtn').addEventListener('click', () => showStats());
document.getElementById('chroniclebtn').addEventListener('click', () => showChronicle());
document.getElementById('mazebtn').addEventListener('click', () => { if (!document.getElementById('start').disabled) beginMaze(); });
document.getElementById('huntbtn').addEventListener('click', () => { if (!document.getElementById('start').disabled) beginBossHunt(); });
document.getElementById('monthly').addEventListener('click', () => startMode('monthly'));
document.getElementById('titlesbtn').addEventListener('click', () => showTitles());
for (const [b, box] of [['moremodesbtn', 'moremodes'], ['collbtn', 'collections'], ['setupbtn', 'setup']]) document.getElementById(b).addEventListener('click', () => titleMenu(box)); // undermenyer: LÄGEN, ANPASSA, SAMLINGAR
document.querySelectorAll('#title [data-back]').forEach(b => b.addEventListener('click', () => titleMenu('')));
document.getElementById('campaignbtn').addEventListener('click', () => { if (!document.getElementById('start').disabled) showCampaign(); });
document.getElementById('hubbtn').addEventListener('click', () => { if (!document.getElementById('start').disabled) beginHub(); });
document.getElementById('abyssbtn').addEventListener('click', () => { if (!document.getElementById('start').disabled) beginAbyss(); });
document.getElementById('abyssdaily').addEventListener('click', () => { if (!document.getElementById('start').disabled) beginAbyss(true); });
if (params.has('fro')) document.getElementById('seed').value = params.get('fro').slice(0, 16); // delad länk med frö
document.getElementById('editorbtn').addEventListener('click', () => { if (!document.getElementById('start').disabled) openEditor(); });
if (params.has('bana')) { const t = setInterval(() => { if (!document.getElementById('start').disabled) { clearInterval(t); openEditor(params.get('bana')); } }, 300); } // delad bana
addEventListener('keydown', e => { // siffertangenterna väljer klass på startskärmen
  if (state !== 'title' || CardUI.isOpen() || document.getElementById('editor') || document.activeElement?.tagName === 'INPUT' || !/^Digit[0-9]$/.test(e.code)) return;
  const ids = Object.keys(CLASSES), id = ids[e.code === 'Digit0' ? 9 : +e.code.slice(5) - 1]; if (!id) return;
  if (!classOpen(id)) { document.getElementById('status').textContent = `${CLASSES[id].name} ÄR LÅST (${CLASSES[id].cost} SJÄLAR)`; return; }
  settings.cls = id; saveSettings(); refreshTitle(); document.getElementById('status').textContent = `${CLASSES[id].name}: ${CLASSES[id].text}`;
});
addEventListener('keydown', e => { // startskärmen: pilarna flyttar markeringen, Enter väljer, Escape går tillbaka (handkontrollen skickar samma tangenter)
  if (state === 'title' && document.getElementById('editor')) { if (e.code === 'Escape' && !CardUI.isOpen()) { const b = [...document.querySelectorAll('#editor button')].find(x => x.textContent === 'STÄNG'); if (b) b.click(); } return; } // banbyggaren ligger över: Escape = STÄNG, övriga tangenter är dess
  if (state !== 'title' || CardUI.isOpen() || document.getElementById('title').hidden) return;
  const a = document.activeElement, inInput = !!a && a.tagName === 'INPUT', items = titleItems(), i = items.indexOf(a);
  if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && a && a.classList && a.classList.contains('srow')) { e.preventDefault(); setupStep(a.dataset.k, e.code === 'ArrowRight' ? 1 : -1); return; } // ANPASSA: vänster/höger byter värde
  if (e.code === 'Escape' && titleSub === 'setup' && setupUI.combo) { e.preventDefault(); setupUI.combo = false; setupRows(); try { document.querySelector('#srows [data-k=cmode]').focus(); } catch (er) { /* ingen fokus */ } return; }
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp' || (!inInput && (e.code === 'ArrowLeft' || e.code === 'ArrowRight'))) {
    e.preventDefault(); const n = items.length, d = e.code === 'ArrowDown' || e.code === 'ArrowRight' ? 1 : -1; if (!n) return;
    try { items[i < 0 ? (d > 0 ? 0 : n - 1) : (i + d + n) % n].focus(); } catch (er) { /* ingen fokus */ } play('ui_hover', 0.3); return;
  }
  if (e.code === 'Escape' || (e.code === 'Backspace' && !inInput)) { if (titleSub) { e.preventDefault(); titleMenu(''); } return; }
  if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
  if (inInput) { if (a.id === 'seed' && !document.getElementById('start').disabled) { e.preventDefault(); startMode('new'); } return; } // Enter i fröfältet startar med fröet
  e.preventDefault(); if (i >= 0) { items[i].click(); const f = document.activeElement; if ((!f || !f.isConnected || f === document.body) && state === 'title') { const it = titleItems(); if (it[i]) try { it[i].focus({ preventScroll: true }); } catch (er) { /* ingen fokus */ } } return; } // ANPASSA bygger om knapparna: behåll markeringen
  if (!titleSub && !document.getElementById('start').disabled) startMode('new');
});
let titleSub = ''; // öppen undermeny på startskärmen: '' (huvudlistan), 'moremodes', 'setup' eller 'collections'
function titleMenu(sub) { // visa huvudlistan eller en undermeny i samma stil
  const prev = titleSub; titleSub = sub || '';
  if (titleSub === 'setup' && prev !== 'setup') { setupUI.cls = ''; setupUI.combo = false; setupUI.msg = ''; setupUI.k = 'diff'; setupRows(); } // ANPASSA öppnas alltid med vald klass och utan kombinationspanelen
  document.getElementById('mainmenu').hidden = !!titleSub;
  for (const box of ['moremodes', 'setup', 'collections']) document.getElementById(box).hidden = box !== titleSub;
  for (const [b, box] of [['moremodesbtn', 'moremodes'], ['setupbtn', 'setup'], ['collbtn', 'collections']]) document.getElementById(b).setAttribute('aria-expanded', String(box === titleSub));
  document.getElementById('title').classList.toggle('insub', !!titleSub); document.getElementById('title').scrollTop = 0;
  const back = !titleSub && prev ? document.getElementById({ moremodes: 'moremodesbtn', setup: 'setupbtn', collections: 'collbtn' }[prev]) : null;
  const it = titleItems(), t = back && it.includes(back) ? back : it[0]; if (t && !isTouch()) try { t.focus({ preventScroll: true }); } catch (e) { /* ingen fokus */ }
}
function titleItems() { const box = document.getElementById(titleSub || 'mainmenu'); return box ? [...box.querySelectorAll('button, input')].filter(b => !b.disabled && b.offsetParent !== null) : []; }
document.getElementById('fullscreen').addEventListener('click', () => toggleFullscreen());
})();
