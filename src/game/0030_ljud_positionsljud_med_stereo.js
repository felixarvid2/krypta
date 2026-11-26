// ---------- Ljud (positionsljud med stereo) ----------
let actx = null, master = null;
const SOUNDS = ['shot', 'boom', 'pickup', 'health', 'hurt', 'splat', 'weapon', 'lose', 'win', 'growl', 'hiss', 'pain', 'roar', 'gore', 'drone', 'door', 'steps',
  'reload', 'click', 'shell', 'pot', 'secret', 'whoosh', 'ricochet', 'breath', 'armor', 'gate', 'fireburst', 'bossroar', 'coin', 'chest', 'card', 'buy', 'bigboom', 'stinger',
  'amb_wind', 'amb_drip', 'amb_rain', 'amb_frogs', 'amb_creepy', 'bell', 'moan', 'gasp', 'kick', 'bonesnap', 'step_grass', 'step_gravel', 'step_wood', 'gem', 'splash', 'music_boss', 'heart',
  'jump', 'land', 'dash', 'grenade_throw', 'grenade_bounce', 'grenade_beep', 'lever', 'unlock', 'key', 'anvil', 'lava', 'web', 'bat', 'hound', 'spider', 'fuse', 'shield_block', 'spore', 'gong',
  'ui_hover', 'ui_click', 'bullet_wall', 'gib', 'ice_break', 'gas', 'arrow', 'prisoner', 'fortune', 'freeze', 'shock', 'stamina_out', 'slide', 'map_unroll', 'combo', 'champion',
  'axe_swing', 'axe_hit', 'axe_charge', 'axe_throw', 'flamer_loop', 'flamer_start', 'flamer_end', 'launcher_fire', 'ghoul', 'ghoul_eat', 'cultist', 'curse', 'gargoyle_wake', 'gargoyle',
  'icewolf', 'wolf_bite', 'wisp', 'wisp_burst', 'frost_boss_roar', 'ice_crack', 'icicle_fall', 'snow_step', 'wind_cold', 'drink', 'potion_rage', 'potion_ghost', 'potion_speed', 'potion_ice',
  'raven', 'lantern', 'pup_bark', 'pup_bite', 'npc_alchemist', 'npc_priest', 'bless', 'route_choice', 'fuse_cards', 'headshot', 'low_ammo', 'daily_reward',
  'nailgun_fire', 'nail_hit', 'nail_flesh', 'staff_zap', 'staff_charge', 'staff_orb', 'bow_draw', 'bow_release', 'arrow_hit', 'arrow_pickup', 'necromancer', 'necro_raise', 'fire_elemental', 'elemental_split',
  'lavaworm', 'worm_emerge', 'deathknight', 'knight_wave', 'banshee', 'banshee_scream', 'lava_bubble', 'volcano_rumble', 'eruption', 'firejet', 'crumble', 'pendulum', 'plate_click', 'barrel_poison', 'barrel_frost',
  'campfire', 'eat', 'rest', 'quest_done', 'quest_new', 'rune_socket', 'rune_proc', 'secret_stairs', 'ab_blink', 'ab_slowmo', 'ab_bubble', 'ab_summon', 'ab_quake', 'ability_ready', 'flame_boss_roar', 'survival_wave', 'tutorial', 'heartbeat_fast',
  'knife_throw', 'knife_hit', 'knife_wall', 'knife_pickup', 'hammer_swing', 'hammer_hit', 'hammer_charge', 'hammer_slam', 'musket_fire', 'musket_reload', 'mummy', 'bandage', 'scarab', 'scarab_swarm', 'jackal', 'parry',
  'thief', 'steal', 'doppel', 'sarcophagus_open', 'boulder_roll', 'boulder_crash', 'quicksand', 'sandstorm', 'alarm_bell', 'page_found', 'lamp_on', 'lamp_off', 'lamp_flicker', 'stone_throw', 'stone_land', 'detect',
  'suspicious', 'sneak_kill', 'gamble_dice', 'gamble_win', 'gamble_lose', 'wheel_spin', 'bank_deposit', 'wanderer', 'haggle', 'mastery_up', 'pharaoh_roar', 'golden_beam', 'tornado', 'curse_reverse', 'labyrinth_tick',
  'harpoon_fire', 'harpoon_reel', 'harpoon_hit', 'boomerang_throw', 'boomerang_whirr', 'boomerang_catch', 'prism_fire', 'prism_bounce', 'golem', 'golem_step', 'shardwisp', 'sailor', 'eel', 'siren_song', 'crab', 'crab_clack', 'stalker', 'witch', 'witch_hex', 'witch_teleport',
  'queen_roar', 'queen_shatter', 'queen_beam', 'leviathan_roar', 'leviathan_submerge', 'leviathan_wave', 'crystal_hit', 'crystal_shatter', 'crystal_chime', 'spikes_crystal', 'swim_stroke', 'dive', 'surface', 'gasp_air', 'drown', 'bubbles', 'tide_rise', 'water_deep', 'wreck_open', 'tome_read', 'talent_altar',
  'levelup', 'talent_pick', 'xp_tick', 'abyss_descend',
  'saw_fire', 'saw_bounce', 'saw_hit', 'wind_fire', 'wind_push', 'spear_thrust', 'spear_throw', 'spear_hit', 'spear_pickup', 'clocksoldier', 'clock_rewind', 'gearspider', 'timekeeper', 'time_bubble', 'harpy', 'harpy_dive', 'stormcaller', 'thunder_warn', 'thunder_strike', 'cloudgiant', 'giant_blow',
  'clockmaker_laugh', 'clockmaker_rewind', 'clockmaker_gears', 'thunderbird_cry', 'thunderbird_dive', 'thunderbird_storm', 'saw_track', 'gear_tick', 'chimes', 'wind_gust', 'wind_loop', 'void_fall', 'void_return', 'feather', 'gear_pickup', 'cloudchest_open', 'double_jump',
  'jailer', 'chain_throw', 'chain_bind', 'burrower', 'burrow_dig', 'burrow_emerge', 'gravedigger', 'spade_hit', 'raise_dead', 'rootling', 'roots_burst', 'crossbow_enemy', 'bolt_hit', 'toad', 'tongue_lash', 'toad_land', 'pet_firefly', 'pet_golem', 'pet_owl',
  'legend_altar', 'legend_get', 'legend_fire_dragon', 'legend_fire_frost', 'legend_fire_soul', 'legend_fire_storm', 'legend_hit_blood', 'legend_fire_moon',
  'spore_fire', 'spore_burst', 'shield_bash', 'mirrorshield_block', 'whip_crack', 'whip_pull', 'sporling', 'mycelbrute', 'myconid', 'mirrorknight', 'mirror_deflect', 'illusionist', 'illusion_pop', 'shardling', 'glass_break',
  'mycelmother_roar', 'mycelmother_spores', 'mirrorking_laugh', 'mirrorking_shatter', 'mirrorking_split', 'bounce', 'teleport', 'spore_confuse', 'shroom_hum', 'mirror_hum',
  'rune_fire', 'rune_hit', 'page_ward', 'steam_fire', 'steam_hiss', 'grimoire', 'grimoire_bite', 'inkslime', 'ink_splash', 'archivist', 'archivist_blink', 'moltengolem', 'molten_drip', 'steambot', 'steam_burst', 'sparkdrone', 'drone_zap', 'drone_pop',
  'librarian_laugh', 'librarian_cast', 'librarian_pages', 'colossus_roar', 'colossus_slam', 'colossus_furnace', 'press_slam', 'belt_loop', 'vent_burst', 'lectern_read', 'ink_pickup', 'library_hum', 'foundry_hum',
  'snowwraith', 'snowwraith_freeze', 'lavaworm_growl', 'lavaworm_emerge', 'lava_spit', 'scarabpriest', 'scarab_curse', 'crystalspider', 'web_shot', 'web_break', 'anglerfish', 'angler_lure', 'angler_bite', 'windspirit', 'wind_howl', 'arena_lock', 'arena_wave', 'arena_clear',
  'censer_swing', 'censer_hit', 'hive_fire', 'bee_buzz', 'bee_sting', 'choirboy', 'flagellant', 'cherub', 'cherub_shriek', 'workerbee', 'stingerknight', 'larva', 'larva_spit', 'larva_hatch', 'larva_squish',
  'cardinal_chant', 'cardinal_laugh', 'queenbee_buzz', 'honey_splash', 'bless_beam', 'bell_ring', 'font_break', 'cathedral_hum', 'hive_hum',
  'shears_snip', 'shears_hit', 'shears_throw', 'shears_catch', 'dream_fire', 'dream_burst', 'dream_pickup', 'angel_scrape', 'thornvine', 'gardener', 'dreameater', 'doppelganger', 'doppel_fire', 'sleepwalker', 'sleep_puff',
  'gardener_laugh', 'gardener_seeds', 'sandman_laugh', 'sandman_sand', 'wall_shift', 'thorn_burn', 'mist_whisper', 'fountain_drink', 'falsedoor_open', 'garden_hum', 'dream_hum',
  'ghostpirate', 'gunner', 'drownedsailor', 'ghostparrot', 'tentacle', 'rat', 'homunculus', 'ooze', 'apprentice', 'mercurygolem', 'vialwisp', 'chimera', 'captain_laugh', 'captain_shout', 'alchemist_laugh', 'alchemist_drink',
  'cannon_fire', 'cannonball_land', 'plank_break', 'wave_wash', 'ship_creak', 'lab_bubble', 'tesla_zap', 'acid_hiss', 'flask_break', 'transmute', 'alembic_brew', 'chain_fire', 'chain_hit', 'acid_spray', 'acid_hit', 'ship_hum', 'lab_hum',
  'clown', 'juggler', 'stiltwalker', 'knifethrower', 'lion', 'marionette', 'lizardman', 'blowgunner', 'monkey', 'jaguar', 'mosquito', 'templeguardian', 'ringmaster_laugh', 'ringmaster_whip', 'serpent_hiss', 'serpent_roar',
  'honk', 'balloon_pop', 'confetti', 'trapdoor', 'spotlight_on', 'knifewheel', 'prizewheel', 'idol_take', 'dart_trap', 'piranha', 'vine_rustle', 'pin_throw', 'pin_bounce', 'blowgun_fire', 'blowgun_hit', 'laser_eye', 'circus_hum', 'jungle_hum',
  'miner', 'coalgolem', 'moleman', 'sparkwisp', 'starspawn', 'astronomer', 'clockowl', 'voidwatcher', 'foreman_shout', 'foreman_laugh', 'starseer_chant', 'starseer_laugh', 'cart_roll', 'cart_hit', 'dynamite_fuse', 'gas_ignite', 'cavein', 'ore_ping',
  'lowgrav_jump', 'meteor_fall', 'meteor_impact', 'orrery_turn', 'telescope', 'starport', 'pickaxe_swing', 'pickaxe_hit', 'starlance_charge', 'starlance_fire', 'mine_hum', 'observatory_hum',
  'alligator', 'sludgeman', 'plumber', 'leech', 'scorpion', 'nomad', 'sandwraith', 'vulture', 'ratking_squeal', 'ratking_roar', 'sphinx_roar', 'sphinx_chant', 'sludge_splash', 'steam_spray', 'sluice', 'ratnest', 'cactus_hit', 'amphora_break',
  'oasis', 'desert_storm', 'mirage', 'scimitar_swing', 'scimitar_hit', 'trap_throw', 'trap_snap', 'sewer_hum', 'desert_hum',
  'turnkey', 'jailer_whistle', 'convict', 'chain_swing', 'torturer', 'hot_iron', 'watchdog', 'watchdog_bite', 'drowned', 'fishman', 'fishman_leap', 'shorecrab', 'shorecrab_clack', 'gulls', 'executioner_roar', 'executioner_chop', 'chain_hook', 'gate_slam',
  'tidepriest_chant', 'tidepriest_roar', 'tide_tentacle', 'wave_crash', 'prison_alarm_bell', 'cage_fall', 'net_snag', 'barrel_fish', 'foghorn', 'flail_swing', 'flail_hit', 'flail_spin', 'blunder_fire', 'blunder_double', 'scrap_pickup', 'prison_hum', 'harbor_hum',
  'attendant', 'towel_snap', 'steamghost', 'gladiator', 'gladiator_block', 'net_throw', 'moldcrawler', 'mold_spore_burst', 'fireimp', 'fireimp_ball', 'lostsoul', 'lostsoul_boom', 'fleshbrute', 'ground_slam', 'ashwalker', 'ash_reform',
  'bathmaster_roar', 'scald_splash', 'bath_dive', 'pyrelord_roar', 'fire_rain', 'flame_pillar', 'fissure', 'steam_vent', 'cold_pool', 'hot_pool', 'rune_circle', 'chained_soul', 'trident_stab', 'trident_throw', 'trident_return',
  'brimstone_fire', 'brimstone_boom', 'brimstone_pickup', 'bathhouse_hum', 'purgatory_hum',
  'butcher', 'cleaver_throw', 'pigman', 'pig_charge', 'flies', 'crawler', 'ghostsoldier', 'ghost_shield_bash', 'ghostarcher', 'arrow_volley', 'ghostrider', 'hoofbeats', 'crows', 'meatmaster_roar', 'hook_throw', 'chain_pull',
  'grinder', 'grinder_start', 'warlord_roar', 'war_horn', 'catapult_whistle', 'catapult_impact', 'sword_whirl', 'blood_slick', 'deep_mud', 'meathook_creak', 'bandsaw', 'stakes_hit', 'banner_flap', 'hookchain_throw', 'hookchain_hit',
  'bombard_fire', 'bombard_grape', 'cannonball_bounce', 'cannonball_pickup', 'abattoir_hum', 'battlefield_hum'];
async function loadSounds() {
  actx = new (window.AudioContext || window.webkitAudioContext)();
  master = actx.createGain(); master.connect(actx.destination); applyVolume();
  if (window.Music) { Music.init(actx, master); applyMixer(); }
  v251Load(); // version 25.1: rösterna för det valda språket (i bakgrunden)
  await Promise.all(SOUNDS.map(async n => {
    try { const buf = await (sndCache[n] || fetch(`${A}snd/${n}.ogg`).then(r => r.arrayBuffer())); if (buf) snd[n] = await actx.decodeAudioData(buf.slice(0)); } catch (e) { /* ljud är valfritt */ }
  }));
}
function applyVolume() { if (master) master.gain.value = settings.muted ? 0 : settings.vol; }
const SUBS = { growl: 'MORRANDE', hiss: 'VÄSANDE', roar: 'VRÅL', bossroar: 'BOSSENS VRÅL', door: 'EN DÖRR', gate: 'ETT GALLER', moan: 'STÖNANDE', bell: 'KLOCKOR', fireburst: 'EXPLOSION', bigboom: 'SMÄLL', arrow: 'EN PIL', gas: 'PYSANDE GAS', spider: 'SPINDEL', bat: 'FLADDERMÖSS', hound: 'SKALL', fuse: 'STUBIN' };
let subs = [];
function play(name, vol = 1, rate = 1, opt = {}) {
  if (opt.x !== undefined && settings.soundCues) soundCue(name, opt.x, opt.y);
  if (settings.subtitles && SUBS[name] && opt.x !== undefined && state === 'play') { const rel = Math.atan2(Math.sin(Math.atan2(opt.y - P.y, opt.x - P.x) - P.a), Math.cos(Math.atan2(opt.y - P.y, opt.x - P.x) - P.a)), dist = Math.hypot(opt.x - P.x, opt.y - P.y);
    if (dist < 16 && !subs.some(s => s.n === name)) { subs.push({ n: name, text: `[${SUBS[name]} ${Math.abs(rel) < 0.6 ? 'FRAMFÖR' : Math.abs(rel) > 2.4 ? 'BAKOM' : rel > 0 ? 'TILL HÖGER' : 'TILL VÄNSTER'}]`, t: 2 }); if (subs.length > 3) subs.shift(); } }
  if (!actx || !snd[name]) return null;
  let v = vol, pan = 0;
  if (opt.x !== undefined) {
    const dx = opt.x - P.x, dy = opt.y - P.y, d = Math.hypot(dx, dy);
    if (d > 22) return null;
    v *= clamp(1 - d / 22, 0, 1) ** 1.4;
    if (map && !hasLOS(P.x, P.y, opt.x, opt.y)) v *= 0.45;
    pan = clamp(Math.sin(Math.atan2(dy, dx) - P.a), -1, 1) * 0.8;
  }
  const s = actx.createBufferSource(); s.buffer = snd[name]; s.playbackRate.value = rate; s.loop = !!opt.loop;
  const g = actx.createGain(); g.gain.value = v;
  let node = s.connect(g);
  if (pan && actx.createStereoPanner) { const p = actx.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
  if (opt.loop) { s.loopStart = 0; s.loopEnd = Math.max(0.05, s.buffer.duration - 0.025); } // Vorbis-filerna är lite för långa: loopa före slutet
  if (name !== 'heart' && name !== 'combo' && !opt.loop && rate === 1 && /hurt|pain|growl|hiss|pot|coin|splat|click|steps|step_/.test(name)) s.playbackRate.value = rnd(0.94, 1.06); // upprepade ljud varierar
  node.connect(window.Music && Music.sfxIn ? (opt.amb ? Music.ambIn : Music.sfxIn) : master); s.start();
  return { s, g };
}

// ---------- Vapen ----------
const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', short: 'PISTOL', ammo: 'p9', mag: 9, dmg: 2.2, pellets: 1, spread: 0.012, delay: 0.3, auto: false, sound: ['shot', 1.15, 0.85], flash: 0.75, kick: 0.8, reload: 1.1, falloff: [7, 18, 0.5], recoil: [0.012, -0.006] },
  { id: 'shotgun', name: 'HAGELGEVÄR', short: 'HAGEL', ammo: 'shells', mag: 6, dmg: 1.7, pellets: 9, spread: 0.07, delay: 0.95, auto: false, sound: ['boom', 0.8, 0.9], flash: 1.4, kick: 2.2, shellReload: true, reload: 0, falloff: [3, 11, 0.35], recoil: [0.02] },
  { id: 'rifle', name: 'GEVÄR', short: 'GEVÄR', ammo: 'r556', mag: 24, dmg: 2.8, pellets: 1, spread: 0.014, delay: 0.13, auto: true, sound: ['shot', 0.82, 0.9], flash: 1.0, kick: 0.9, reload: 1.7, falloff: [12, 30, 0.6], recoil: [0.004, 0.006, -0.003, 0.007, -0.005, 0.004, -0.006] },
  { id: 'smg', name: 'KULSPRUTEPISTOL', short: 'KPIST', ammo: 'p9', mag: 32, dmg: 1.5, pellets: 1, spread: 0.035, delay: 0.085, auto: true, sound: ['shot', 1.45, 0.65], flash: 0.75, kick: 0.5, reload: 1.5, falloff: [6, 16, 0.45], recoil: [0.003, -0.004, 0.005, -0.002, 0.004, -0.005] },
  // fyra vapen ur andra modellpaket (tools/weapon-frames/render-static.mjs)
  { id: 'dbshotgun', name: 'DUBBELBÖSSA', short: 'DUBBEL', ammo: 'shells', mag: 2, dmg: 1.9, pellets: 10, spread: 0.08, delay: 0.25, auto: false, sound: ['boom', 0.7, 1.0], flash: 1.6, kick: 2.6, reload: 1.5, falloff: [3, 10, 0.3], recoil: [0.025, -0.02] },
  { id: 'crossbow', name: 'ARMBORST', short: 'ARMBST', ammo: 'bolts', mag: 1, dmg: 10, pellets: 1, spread: 0.004, delay: 0.2, auto: false, sound: ['whoosh', 1.3, 0.8], flash: 0, kick: 0.5, reload: 0.85, falloff: [30, 40, 1], recoil: [0.004], silent: true, pierceAll: true },
  { id: 'flaregun', name: 'SIGNALPISTOL', short: 'SIGNAL', ammo: 'flares', mag: 1, dmg: 4, pellets: 1, spread: 0.01, delay: 0.3, auto: false, sound: ['shot', 0.6, 0.7], flash: 1.2, kick: 1.0, reload: 1.1, falloff: [30, 40, 1], recoil: [0.01], proj: 'flare' },
  // version 5: närstrid, eld och granater
  { id: 'axe', name: 'YXAN', short: 'YXA', ammo: 'none', mag: 1, dmg: 9, pellets: 1, spread: 0, delay: 0.5, auto: false, sound: ['axe_swing', 1, 0.8], flash: 0, kick: 1.2, reload: 0, falloff: [2, 3, 1], recoil: [0], melee: true },
  { id: 'flamer', name: 'ELDKASTAREN', short: 'ELD', ammo: 'fuel', mag: 60, dmg: 0.55, pellets: 1, spread: 0, delay: 0.06, auto: true, sound: ['', 1, 0], flash: 0.5, kick: 0.15, reload: 1.8, falloff: [4.5, 6, 1], recoil: [0], flame: true },
  { id: 'launcher', name: 'GRANATKASTAREN', short: 'GRKAST', ammo: 'lgren', mag: 6, dmg: 30, pellets: 1, spread: 0.01, delay: 0.6, auto: false, sound: ['launcher_fire', 0.9, 1], flash: 0.8, kick: 2, reload: 2.1, falloff: [30, 40, 1], recoil: [0.01], lob: true },
  // version 6: spikar, blixt och båge (läggs sist så att de gamla platserna behålls)
  { id: 'sniper', name: 'PRICKSKYTTEGEVÄR', short: 'PRICK', ammo: 'r556', mag: 5, dmg: 14, pellets: 1, spread: 0.002, delay: 1.0, auto: false, sound: ['boom', 1.25, 0.85], flash: 1.1, kick: 2.8, reload: 2.2, falloff: [40, 50, 1], recoil: [0.015, -0.01], pierce: 2, zoom: 0.5, hip: 0.05 },
  { id: 'nailgun', name: 'SPIKGEVÄRET', short: 'SPIK', ammo: 'nails', mag: 50, dmg: 1.5, pellets: 1, spread: 0.02, delay: 0.1, auto: true, sound: ['nailgun_fire', 0.9, 1], flash: 0.4, kick: 0.4, reload: 1.6, falloff: [30, 40, 1], recoil: [0.002, -0.002], nail: true },
  { id: 'staff', name: 'BLIXTSTAVEN', short: 'STAV', ammo: 'mana', mag: 100, dmg: 2.4, pellets: 1, spread: 0, delay: 0.32, auto: true, sound: ['staff_zap', 0.8, 1], flash: 0.6, kick: 0.5, reload: 0, falloff: [12, 14, 1], recoil: [0.004], staff: true },
  { id: 'bow', name: 'LÅNGBÅGEN', short: 'BÅGE', ammo: 'arrows', mag: 1, dmg: 7, pellets: 1, spread: 0.02, delay: 0.25, auto: false, sound: ['bow_release', 1, 1], flash: 0, kick: 0.6, reload: 0.45, falloff: [30, 40, 1], recoil: [0.006], bow: true, silent: true },
  // version 7: knivar, hammare och musköt
  { id: 'knives', name: 'KASTKNIVARNA', short: 'KNIV', ammo: 'knives', mag: 6, dmg: 4.5, pellets: 1, spread: 0.01, delay: 0.22, auto: false, sound: ['knife_throw', 0.6, 1], flash: 0, kick: 0.4, reload: 0.6, falloff: [30, 40, 1], recoil: [0.003], knives: true, silent: true },
  { id: 'hammer', name: 'STRIDSHAMMAREN', short: 'HAMMARE', ammo: 'none', mag: 1, dmg: 14, pellets: 1, spread: 0, delay: 0.85, auto: false, sound: ['hammer_swing', 1, 0.9], flash: 0, kick: 1.8, reload: 0, falloff: [2, 3, 1], recoil: [0], melee: true, hammer: true },
  { id: 'musket', name: 'MUSKÖTEN', short: 'MUSKÖT', ammo: 'balls', mag: 1, dmg: 24, pellets: 1, spread: 0.004, delay: 0.4, auto: false, sound: ['musket_fire', 0.95, 1], flash: 1.8, kick: 3.2, reload: 2.2, falloff: [25, 40, 0.8], recoil: [0.03, -0.01], pierce: 2, musket: true },
  { id: 'harpoon', name: 'HARPUNEN', short: 'HARPUN', ammo: 'harpoons', mag: 1, dmg: 20, pellets: 1, spread: 0.004, delay: 0.3, auto: false, sound: ['harpoon_fire', 0.9, 1], flash: 0, kick: 1.4, reload: 1.3, falloff: [20, 30, 1], recoil: [0.012], harpoon: true, silent: true },
  { id: 'boomerang', name: 'BUMERANGEN', short: 'BUMERANG', ammo: 'none', mag: 1, dmg: 9, pellets: 1, spread: 0, delay: 0.25, auto: false, sound: ['boomerang_throw', 0.8, 1], flash: 0, kick: 0.5, reload: 0, falloff: [8, 10, 1], recoil: [0], boomerang: true, silent: true },
  { id: 'sawlauncher', name: 'SÅGBLADSKASTAREN', short: 'SÅGBLAD', ammo: 'gears', mag: 6, dmg: 8, pellets: 1, spread: 0.01, delay: 0.38, auto: false, sound: ['saw_fire', 0.8, 1], flash: 0.3, kick: 0.9, reload: 1.4, falloff: [30, 40, 1], recoil: [0.008, -0.006], sawlauncher: true },
  { id: 'windgun', name: 'VINDBÖSSAN', short: 'BÄLGEN', ammo: 'none', mag: 1, dmg: 3, pellets: 1, spread: 0, delay: 0.85, auto: false, sound: ['wind_fire', 0.9, 1], flash: 0, kick: 1.2, reload: 0, falloff: [8, 10, 1], recoil: [0], windgun: true },
  { id: 'spear', name: 'SPJUTET', short: 'SPJUT', ammo: 'none', mag: 1, dmg: 13, pellets: 1, spread: 0, delay: 0.45, auto: false, sound: ['spear_thrust', 0.7, 1], flash: 0, kick: 0.6, reload: 0, falloff: [3, 4, 1], recoil: [0], spear: true, silent: true },
  { id: 'prism', name: 'PRISMAN', short: 'PRISMA', ammo: 'crystals', mag: 14, dmg: 5.5, pellets: 1, spread: 0.006, delay: 0.16, auto: true, sound: ['prism_fire', 0.7, 1], flash: 0.6, kick: 0.4, reload: 1.5, falloff: [30, 40, 1], recoil: [0.004, -0.003], prism: true },
  { id: 'sporelauncher', name: 'SPORKASTAREN', short: 'SPORRÖR', ammo: 'spores', mag: 5, dmg: 7, pellets: 1, spread: 0.02, delay: 0.7, auto: false, sound: ['spore_fire', 0.8, 1], flash: 0.2, kick: 0.8, reload: 1.6, falloff: [30, 40, 1], recoil: [0.006, -0.004], sporelauncher: true },
  { id: 'mirrorshield', name: 'SPEGELSKÖLDEN', short: 'SKÖLD', ammo: 'none', mag: 1, dmg: 10, pellets: 1, spread: 0, delay: 0.55, auto: false, sound: ['shield_bash', 0.8, 1], flash: 0, kick: 0.8, reload: 0, falloff: [2, 3, 1], recoil: [0], mirrorshield: true, silent: true },
  { id: 'whip', name: 'PISKAN', short: 'PISKA', ammo: 'none', mag: 1, dmg: 8, pellets: 1, spread: 0, delay: 0.6, auto: false, sound: ['whip_crack', 0.8, 1], flash: 0, kick: 0.5, reload: 0, falloff: [4, 5, 1], recoil: [0], whip: true, silent: true },
  { id: 'runebook', name: 'RUNBOKEN', short: 'RUNBOK', ammo: 'ink', mag: 8, dmg: 6, pellets: 1, spread: 0.03, delay: 0.3, auto: true, sound: ['rune_fire', 0.7, 1], flash: 0.3, kick: 0.3, reload: 1.4, falloff: [30, 40, 1], recoil: [0.003, -0.003], runebook: true },
  { id: 'steamcannon', name: 'ÅNGKANONEN', short: 'ÅNGKANON', ammo: 'fuel', mag: 16, dmg: 7, pellets: 1, spread: 0, delay: 0.6, auto: true, sound: ['steam_fire', 0.8, 1], flash: 0, kick: 0.9, reload: 1.6, falloff: [6, 7, 1], recoil: [0.004], steamcannon: true },
  { id: 'censer', name: 'RÖKELSEKARET', short: 'RÖKELSE', ammo: 'none', mag: 1, dmg: 7, pellets: 1, spread: 0, delay: 0.6, auto: true, sound: ['censer_swing', 0.8, 1], flash: 0, kick: 0.5, reload: 0, falloff: [3, 4, 1], recoil: [0], censer: true, silent: true },
  { id: 'hivelauncher', name: 'BIKASTAREN', short: 'BIKAST', ammo: 'bees', mag: 6, dmg: 6, pellets: 1, spread: 0, delay: 0.55, auto: false, sound: ['hive_fire', 0.8, 1], flash: 0.1, kick: 0.5, reload: 1.5, falloff: [30, 40, 1], recoil: [0.004], hivelauncher: true },
  { id: 'shears', name: 'TRÄDGÅRDSSAXEN', short: 'SAX', ammo: 'none', mag: 1, dmg: 6, pellets: 1, spread: 0, delay: 0.45, auto: true, sound: ['shears_snip', 0.7, 1], flash: 0, kick: 0.3, reload: 0, falloff: [2, 3, 1], recoil: [0], shears: true, silent: true },
  { id: 'dreamstaff', name: 'DRÖMSTAVEN', short: 'DRÖMSTAV', ammo: 'dreams', mag: 4, dmg: 14, pellets: 1, spread: 0, delay: 0.8, auto: false, sound: ['dream_fire', 0.8, 1], flash: 0.3, kick: 0.4, reload: 1.6, falloff: [30, 40, 1], recoil: [0.003], dreamstaff: true },
  // version 17: kedjekulekanonen och syrasprutan
  { id: 'chaincannon', name: 'KEDJEKULEKANONEN', short: 'KEDJEKUL', ammo: 'chainballs', mag: 2, dmg: 40, pellets: 1, spread: 0, delay: 0.75, auto: false, sound: ['chain_fire', 0.9, 1], flash: 1.4, kick: 2.6, reload: 2.4, falloff: [30, 40, 1], recoil: [0.02, -0.01], chaincannon: true, noShell: true },
  { id: 'acidsprayer', name: 'SYRASPRUTAN', short: 'SYRA', ammo: 'acid', mag: 50, dmg: 0.5, pellets: 1, spread: 0, delay: 0.07, auto: true, sound: ['', 1, 0], flash: 0, kick: 0.12, reload: 1.8, falloff: [4, 6, 1], recoil: [0], acid: true, noShell: true },
  // version 18: käglekastaren och blåsröret
  { id: 'pinthrower', name: 'KÄGLEKASTAREN', short: 'KÄGLOR', ammo: 'pins', mag: 6, dmg: 18, pellets: 1, spread: 0, delay: 0.6, auto: false, sound: ['pin_throw', 0.8, 1], flash: 0, kick: 0.6, reload: 1.6, falloff: [30, 40, 1], recoil: [0.004], pinthrower: true, noShell: true, silent: true },
  { id: 'blowgun', name: 'BLÅSRÖRET', short: 'BLÅSRÖR', ammo: 'darts', mag: 8, dmg: 12, pellets: 1, spread: 0, delay: 0.42, auto: false, sound: ['blowgun_fire', 0.7, 1], flash: 0, kick: 0.2, reload: 1.3, falloff: [30, 40, 1], recoil: [0.002], blowgun: true, noShell: true, silent: true },
  // version 19: hackan och stjärnlansen
  { id: 'pickaxe', name: 'HACKAN', short: 'HACKA', ammo: 'none', mag: 1, dmg: 45, pellets: 1, spread: 0, delay: 1.1, auto: false, sound: ['pickaxe_swing', 1, 0], flash: 0, kick: 1.4, reload: 0, falloff: [2, 3, 1], recoil: [0], pickaxe: true, noShell: true, silent: true },
  { id: 'starlance', name: 'STJÄRNLANSEN', short: 'LANS', ammo: 'stars', mag: 4, dmg: 25, pellets: 1, spread: 0, delay: 0.35, auto: true, sound: ['starlance_fire', 1, 0], flash: 1.0, kick: 1.2, reload: 1.8, falloff: [30, 40, 1], recoil: [0.01], starlance: true, noShell: true },
  // version 20: kroksabeln och fällkastaren
  { id: 'scimitar', name: 'KROKSABELN', short: 'SABEL', ammo: 'none', mag: 1, dmg: 30, pellets: 1, spread: 0, delay: 0.45, auto: true, sound: ['scimitar_swing', 0.5, 0], flash: 0, kick: 0.6, reload: 0, falloff: [2, 3, 1], recoil: [0], scimitar: true, noShell: true, silent: true },
  { id: 'trapthrower', name: 'FÄLLKASTAREN', short: 'FÄLLOR', ammo: 'traps', mag: 4, dmg: 60, pellets: 1, spread: 0, delay: 0.7, auto: false, sound: ['trap_throw', 0.8, 0], flash: 0, kick: 0.5, reload: 1.6, falloff: [30, 40, 1], recoil: [0], trapthrower: true, noShell: true, silent: true },
  // version 21: morgonstjärnan och trombonen
  { id: 'flail', name: 'MORGONSTJÄRNAN', short: 'STJÄRNA', ammo: 'none', mag: 1, dmg: 35, pellets: 1, spread: 0, delay: 0.75, auto: true, sound: ['flail_swing', 0.6, 0], flash: 0, kick: 1.3, reload: 0, falloff: [2, 3, 1], recoil: [0], flail: true, noShell: true, silent: true },
  { id: 'blunderbuss', name: 'TROMBONEN', short: 'TROMBON', ammo: 'scrap', mag: 2, dmg: 7, pellets: 12, spread: 0.13, delay: 0.6, auto: false, sound: ['blunder_fire', 0.9, 0], flash: 1.6, kick: 2.6, reload: 1.7, falloff: [2.5, 7, 0.15], recoil: [0.03, -0.025], blunderbuss: true },
  // version 22: treudden och svavelmortern
  { id: 'trident', name: 'TREUDDEN', short: 'TREUDD', ammo: 'none', mag: 1, dmg: 40, pellets: 1, spread: 0, delay: 0.6, auto: true, sound: ['trident_stab', 0.7, 0], flash: 0, kick: 0.9, reload: 0, falloff: [2, 3, 1], recoil: [0], trident: true, noShell: true, silent: true },
  { id: 'brimstone', name: 'SVAVELMORTERN', short: 'SVAVEL', ammo: 'brimstone', mag: 4, dmg: 60, pellets: 1, spread: 0, delay: 0.9, auto: false, sound: ['brimstone_fire', 0.9, 0], flash: 1.2, kick: 1.8, reload: 1.9, falloff: [30, 40, 1], recoil: [0.01], brimstone: true, noShell: true },
  // version 23: slaktarkroken och bombarden
  { id: 'hookchain', name: 'SLAKTARKROKEN', short: 'KROK', ammo: 'none', mag: 1, dmg: 45, pellets: 1, spread: 0, delay: 1.2, auto: true, sound: ['hookchain_throw', 0.9, 0], flash: 0, kick: 1.0, reload: 0, falloff: [2, 3, 1], recoil: [0], hookchain: true, noShell: true, silent: true },
  { id: 'bombard', name: 'BOMBARDEN', short: 'BOMBARD', ammo: 'cannonballs', mag: 1, dmg: 80, pellets: 1, spread: 0, delay: 0.9, auto: false, sound: ['bombard_fire', 1.0, 0], flash: 1.8, kick: 2.4, reload: 1.5, falloff: [30, 40, 1], recoil: [0.04], bombard: true, noShell: true },
];
const AMMO = { p9: { name: '9MM', max: 200 }, r556: { name: '5.56', max: 150 }, shells: { name: 'PATRONER', max: 50 }, bolts: { name: 'BULTAR', max: 40 }, flares: { name: 'BLOSS', max: 24 },
  fuel: { name: 'BRÄNSLE', max: 240 }, lgren: { name: 'GRANATER', max: 24 }, none: { name: 'NÄRSTRID', max: 1 },
  nails: { name: 'SPIKAR', max: 300 }, mana: { name: 'MANA', max: 0 }, arrows: { name: 'PILAR', max: 40 }, knives: { name: 'KNIVAR', max: 30 }, balls: { name: 'KULOR', max: 40 }, harpoons: { name: 'HARPUNER', max: 20 }, crystals: { name: 'KRISTALLER', max: 140 }, gears: { name: 'KUGGHJUL', max: 60 }, spores: { name: 'SPORER', max: 30 }, ink: { name: 'BLÄCK', max: 60 }, bees: { name: 'BIN', max: 40 }, dreams: { name: 'DRÖMMAR', max: 24 }, chainballs: { name: 'KEDJEKULOR', max: 20 }, acid: { name: 'SYRA', max: 200 }, pins: { name: 'KÄGLOR', max: 36 }, darts: { name: 'GIFTPILAR', max: 60 }, stars: { name: 'STJÄRNSTOFT', max: 30 }, traps: { name: 'FÄLLOR', max: 16 }, scrap: { name: 'SKROT', max: 40 }, brimstone: { name: 'SVAVEL', max: 20 }, cannonballs: { name: 'KANONKULOR', max: 20 } };
const NOAMMO = () => ({ p9: 36, r556: 0, shells: 0, bolts: 0, flares: 0, fuel: 0, lgren: 0, none: 1, nails: 0, mana: 0, arrows: 0, knives: 0, balls: 0, harpoons: 0, crystals: 0, gears: 0, spores: 0, ink: 0, bees: 0, dreams: 0, chainballs: 0, acid: 0, pins: 0, darts: 0, stars: 0, traps: 0, scrap: 0, brimstone: 0, cannonballs: 0 });
const weaponIndex = id => WEAPONS.findIndex(w => w.id === id);
// tecknet för vapnet på kartan (gen.js) -> vapnets id
const WEAPON_CHAR = { g: 'shotgun', r: 'rifle', m: 'smg', d: 'dbshotgun', b: 'crossbow', s: 'flaregun', p: 'sniper', 'å': 'axe', 'ä': 'flamer', 'ö': 'launcher', 'é': 'nailgun', 'ü': 'staff', 'ñ': 'bow', 'ô': 'knives', 'û': 'hammer', 'ï': 'musket', 'À': 'harpoon', 'Á': 'boomerang', 'Â': 'prism', 'Į': 'sawlauncher', 'į': 'windgun', 'Ĳ': 'spear', 'Ŕ': 'sporelauncher', 'ŕ': 'mirrorshield', 'Ŗ': 'whip', 'ƀ': 'runebook', 'Ɓ': 'steamcannon', 'ƛ': 'censer', 'Ɲ': 'hivelauncher', 'Ʊ': 'shears', 'Ʋ': 'dreamstaff', 'Ǫ': 'chaincannon', 'Ǭ': 'acidsprayer', 'ǽ': 'pinthrower', 'Ȏ': 'blowgun', 'ȩ': 'pickaxe', 'Ȫ': 'starlance', 'Ʉ': 'scimitar', 'Ʌ': 'trapthrower', 'ɝ': 'flail', 'ɞ': 'blunderbuss', 'ɹ': 'trident', 'ɺ': 'brimstone', 'ʔ': 'hookchain', 'ʕ': 'bombard' };
const WF = window.WEAPON_FRAMES;

// ---------- Spelstate ----------
const P = { pitch: 0, look: 0, ryaw: 0, burst: 0, burstT: 0, chainN: 0, iframe: 0, slowT: 0, kickT: 0, lastWeapon: 0, boom: 0, x: 2, y: 2, a: 0, vx: 0, vy: 0, hp: 100, armor: 0, shield: 0, shieldT: 0, haste: 0, weapon: 0, has: [true, false, false, false, false, false, false, false],
  ammo: { p9: 36, r556: 0, shells: 0, bolts: 0, flares: 0 }, mags: [9, 0, 0, 0, 0, 0, 0, 0], flash: 0, bob: 0, bobAmp: 0, hurt: 0, pick: 0, shake: 0, camZ: 0.5, deadT: 0,
  jz: 0, jv: 0, dj: false, crouch: 0, slide: 0, stam: 1, stamT: 0, dashT: 0, dashCd: 0, grenades: 2, keys: 0, combo: 0, comboT: 0, runK: 0, roll: 0, landT: 0 };
const WS = { state: 'draw', t: 0, aim: 0, next: -1, shot: 99, cd: 0, swayX: 0, swayY: 0, spread: 0, shellPhase: '', spin: 0, focus: 0, hunt: false, kick: 0, boost: false, tried: false, nameT: 0, punch: 0, lowWarned: {}, inspect: 0, idleT: 0, throwT: -1 };
let portals = []; // portaler: 'floor' leder till nästa våning, 'boss' låter en välja mellan djupare och att avsluta
let map, mw, mh, doors, ents, items, pots, torches, chests, merchants, particles, projectiles, light, flow, flowCell = -1, seen;
let lvl, totalEnemies, kills, secrets, totalSecrets, itemsTaken, totalItems, levelTime = 0, boss = null, bossBanner = 0;
let state = 'title', tmr = 0, score = 0, showMap = settings.map ?? 1, hitMark = 0, hitKill = false, hitCrit = false, hurtDir = [], breathSnd = null, ambient = null, stepT = 0, fireHeld = false;
let run = null, M = {}, hint = '', hitStop = 0, slowmo = 0, levelBanner = 0;
const lvlStat = { shots: 0, hits: 0, taken: 0 };
const shakeAmt = () => { const tr = Math.min(1, P.shake / 2.5); return tr * tr * (settings.shake ?? 1); }; // trauma²: små träffar knappt märks, stora slår till
const msgs = [];
const keys = {};
let mouseDown = false, aimDown = false;
const mod = k => M[k] || 0;
let UP = new Set(); // vapenuppgraderingar (kortens wup) för vapnet man har svurit sig till
// ---------- Klasser: olika start ----------
const CLASSES = {
  vandrare: { name: 'VANDRAREN', text: 'PISTOLEN OCH INGET MER. KLASSISK START.', color: '#c9a87a', cost: 0, mods: {} },
  krigare: { name: 'KRIGAREN', text: 'HAGELGEVÄR, 25 RUSTNING OCH +15 MAX HP', color: '#d04030', cost: 30, mods: { maxHp: 15 }, weapon: 'shotgun', armor: 25 },
  prickskytt: { name: 'PRICKSKYTTEN', text: 'GEVÄR, +6 % KRIT OCH +15 % TRÄFFSÄKERHET', color: '#60a0ff', cost: 40, mods: { critChance: 0.06, accuracy: 0.15 }, weapon: 'rifle' },
  alkemist: { name: 'ALKEMISTEN', text: '5 GRANATER, +10 % GIFTCHANS OCH +25 % GRANATSKADA', color: '#70d060', cost: 40, mods: { poisonChance: 0.1, grenadeDmg: 0.25, grenades: 2 }, grenades: 5 },
  nekromantiker: { name: 'NEKROMANTIKERN', text: 'DÖDA FIENDER KAN RESA SIG SOM DINA ALLIERADE (12 %)', color: '#70e080', cost: 60, mods: { allyChance: 0.12 }, grenades: 1 },
  jagare: { name: 'JÄGAREN', text: 'ARMBORST OCH EN VARGVALP SOM FÖLJESLAGARE', color: '#b0c080', cost: 50, mods: { petPower: 0.2 }, weapon: 'crossbow', pet: 'pup' },
  spejare: { name: 'SPEJAREN', text: 'LÅNGBÅGE OCH LYKTAN SOM FÖLJESLAGARE', color: '#a0c0a0', cost: 55, mods: { headshot: 0.15 }, weapon: 'bow', pet: 'lantern' },
  smed: { name: 'SMEDEN', text: 'PISTOLEN SMIDD TILL NIVÅ 2 MED EN ELDRUNA', color: '#d08040', cost: 55, mods: { armorPerFloor: 5 }, smith: true },
  tjuv: { name: 'TJUVEN', text: 'KASTKNIVAR, +30 % SMYGSKADA, 20 % TYSTARE OCH 3 EXTRA STENAR', color: '#9090d0', cost: 60, mods: { stealthDmg: 0.3, noiseReduce: 0.2, detectSlow: 0.1 }, weapon: 'knives', stones: 3 },
  spjut: { name: 'SPJUTBÄRAREN', text: 'SPJUT, +20 % NÄRSTRIDSSKADA OCH TÅL VIND', color: '#d0b070', cost: 70, mods: { meleeDmg: 0.2, windResist: 0.4, fallSafe: 0.3 }, weapon: 'spear' },
  dykare: { name: 'DYKAREN', text: 'HARPUN, +10 SEKUNDERS LUFT OCH +25 % SIMFART', color: '#60b0d0', cost: 60, mods: { airMax: 10, swimSpeed: 0.25, waterDmg: 0.15 }, weapon: 'harpoon' },
  oken: { name: 'ÖKENVANDRAREN', text: 'MUSKÖT, TÅL HETTA, +20 % GULD FRÅN HÖGAR OCH LÄNGRE BATTERI', color: '#e0b060', cost: 65, mods: { heatResist: 0.4, goldFind: 0.2, lampBattery: 0.3 }, weapon: 'musket' },
  plundrare: { name: 'PLUNDRAREN', text: '80 GULD, +10 % FART, BÄTTRE TUR OCH MAGNET', color: '#ffd24a', cost: 50, mods: { moveSpeed: 0.1, magnet: 1, luck: 0.06 }, gold: 80 },
};
const classOpen = id => !CLASSES[id].cost || (profile.classes || []).includes(id);
function applyClassStart() {
  const c = CLASSES[run.cls]; if (!c) return;
  if (c.weapon && !cmode('pistol')) { const i = weaponIndex(c.weapon); P.has[i] = true; P.mags[i] = effMag(i); const w = WEAPONS[i]; P.ammo[w.ammo] = Math.min(AMMO[w.ammo].max, P.ammo[w.ammo] + { r556: 40, shells: 16 }[w.ammo] || 20); }
  if (c.armor) P.armor += c.armor; if (c.grenades) P.grenades = c.grenades; if (c.gold) run.gold += c.gold;
  if (c.pet && !run.pet) run.pet = c.pet;
  if (c.stones) P.stones += c.stones;
  if (c.smith) { run.wlvl = { pistol: 2 }; run.wrunes = { pistol: ['fire'] }; }
}
const stat = (k, n = 1) => { profile[k] = (profile[k] || 0) + n; };
function cardGained(card) { if (!card) return; const r = Cards.RARITY[card.rarity]; cardBanner = { name: card.name, color: r ? r.color : '#e8d9b0', t: 2.2 }; logEvent('KORT: ' + card.name); }
function recomputeMods() {
  M = window.Cards && run ? Cards.computeMods(run.owned) : {};
  const cls = run && CLASSES[run.cls]; if (cls) for (const [k, v] of Object.entries(cls.mods)) M[k] = (M[k] || 0) + v; // klassens bonusar
  if (run && meta('luck')) M.luck = (M.luck || 0) + meta('luck') * 0.05;
  if (run && meta('wisdom')) M.xpMul = (M.xpMul || 0) + meta('wisdom') * 0.1;
  talentMods(M);
  UP = new Set(window.Cards && run ? run.owned.map(id => Cards.byId(id)).filter(c => c && c.wup).map(c => c.wup) : []);
}
const up = k => UP.has(k) && !!run && WEAPONS[P.weapon].id === run.pact;

const plain = s => String(window.I18N ? I18N.t(s) : s).normalize('NFC').replace(/[^\u0000-\u007fÅÄÖåäö]/g, ch => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '')); // å, ä och ö finns i fonten och behålls; andra accenter tas bort
function say(t, d = 2.5) { const pt = plain(t), ex = msgs.find(m => m.text === pt); if (ex) { ex.t = Math.max(ex.t, d); return; } msgs.push({ text: pt, t: d, d }); if (msgs.length > 3) msgs.splice(1, msgs.length - 3); /* kö: det första syns, de två senaste väntar */ if (settings.tts && t && d >= 2.5 && state !== 'title') speak(t); }

// ---------- Runda och våningar ----------
const dailySeed = () => { const d = new Date(); return RNG.hash(`krypta-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`); };
const seedText = s => (s >>> 0).toString(36).toUpperCase();
// dagens runda har en utmaning som gäller hela rundan
const DAILY_MODS = [
  { id: 'glass', name: 'GLASKANON', text: 'DU GÖR OCH TAR 50 % MER SKADA' },
  { id: 'gold', name: 'GULDFEBER', text: 'DUBBELT GULD, 30 % SÄMRE HELNING' },
  { id: 'dark', name: 'MÖRKRET', text: 'MYCKET MÖRKARE, MEN FIENDERNA SER SÄMRE' },
  { id: 'swift', name: 'DE SNABBA DÖDA', text: 'FIENDERNA ÄR 25 % SNABBARE OCH GER 50 % MER GULD' },
  { id: 'elite', name: 'ELITJAKTEN', text: 'FLER ELITER, VARJE ELIT TAPPAR ETT KORT' },
  { id: 'giants', name: 'JÄTTARNAS TID', text: 'FIENDERNA ÄR STÖRRE OCH HAR 30 % MER HÄLSA, MEN GER MER GULD' },
  { id: 'light', name: 'LÄTTA STEG', text: 'DU ÄR 25 % SNABBARE MEN HAR 25 % MINDRE HÄLSA' },
  { id: 'scarce', name: 'AMMOBRIST', text: 'HÄLFTEN SÅ MYCKET AMMO, MEN 50 % MER GULD' },
];
const dmod = id => !!(run && ((run.modifier && run.modifier.id === id) || (run.modifier2 && run.modifier2.id === id)));
const weekNo = () => { const d = new Date(), j = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-${Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7)}`; };
function newRun(seed, daily) {
  run = { seed: seed >>> 0, daily: !!daily, depth: 0, owned: [], gold: 25 * meta('gold'), kills: 0, time: 0, livesUsed: 0, souls: 0, rerolls: 0, diff: settings.diff, bossKilled: false,
    cls: classOpen(settings.cls || 'vandrare') ? settings.cls || 'vandrare' : 'vandrare', asc: settings.diff === 3 ? Math.min(settings.asc || 0, profile.ascMax || 0) : 0, graph: [], practice: practice ? { ...practice } : null };
  run.cardRng = RNG(run.seed).fork('kort');
  newMission();
  if (daily) run.modifier = RNG(run.seed).fork('dagens').pick(DAILY_MODS);
  run.cmode = run.practice || daily ? '' : (settings.cmode || '').split('+').filter(x => x && CMODES[x]).join('+');
  resetPlayer(); recomputeMods(); if (settings.pet && PETS[settings.pet] && petOpen(settings.pet)) run.pet = settings.pet; applyClassStart();
  if (cmode('onehit')) { P.hp = 1; P.armor = 0; }
  if (cmode('dark')) P.battery += 120; // mörkerläget: extra batteri
  giveStartWeapon(); run.talentRerolls = 1 + meta('talentroll'); if (meta('startlvl') && !run.practice) { run.lvl = 2; run.talentQ = 1; }
  if (meta('stones')) P.stones += 2 * meta('stones');
  if (meta('mastery')) run.wxp = Object.fromEntries(WEAPONS.map(w => [w.id, MASTERY[1]])); // vapenvana från start
  if (meta('startrune')) { run.wrunes = run.wrunes || {}; run.wrunes.pistol = (run.wrunes.pistol || []).concat(RUNE_IDS[(Math.random() * RUNE_IDS.length) | 0]).slice(-runeSlots()); }
  if (!run.practice) { profile.runs++; saveProfile(); dailyReward(); }
}
function weaponFor(depth) { // ett nytt vapen per våning i slumpad ordning; de sista dyker upp i varv 2
  const order = RNG(run.seed).fork('vapen').shuffle(Object.keys(WEAPON_CHAR));
  const want = order[depth - 1 - cycleOf(depth)];
  if (!want) return null;
  return P.has[weaponIndex(WEAPON_CHAR[want])] ? null : want;
}
// biomer: varje varv går igenom alla fem i slumpad ordning (?biome=id för test)
const BIOME_IDS = ['dungeon', 'caves', 'graveyard', 'forest', 'courtyard', 'swamp', 'frost', 'volcano', 'tomb', 'crystal', 'sunken', 'clock', 'sky', 'fungus', 'mirror', 'library', 'foundry', 'cathedral', 'hive', 'garden', 'dream', 'ship', 'lab', 'circus', 'jungle', 'mine', 'observatory', 'sewer', 'desert', 'prison', 'harbor', 'bathhouse', 'purgatory', 'abattoir', 'battlefield'];
let practice = null; // övningsläge: { biome } eller { boss }
const biomeFor = depth => run && run.practice && run.practice.biome ? run.practice.biome : BIOME_IDS.includes(params.get('biome')) ? params.get('biome') : run && run.biomeChoice && run.biomeChoice[depth] ? run.biomeChoice[depth]
  : lateLast(RNG(run.seed).fork('biom' + cycleOf(depth)).shuffle(BIOME_IDS.slice()))[(cyclePos(depth) - 1) % BIOME_IDS.length];
const BIOME_LATE = ['garden', 'dream', 'lab', 'circus', 'jungle', 'observatory', 'desert', 'harbor', 'purgatory', 'battlefield']; // sena biomer: aldrig först i en omgång (och aldrig först i avgrundens sexvåningsvarv)
function lateLast(order) { // trädgården, drömriket, laboratoriet, cirkusen, djungeltemplet och observatoriet är sena biomer: aldrig först i en omgång
  const LATE = BIOME_LATE;
  if (LATE.includes(order[0])) { const i = order.findIndex(b => !LATE.includes(b)); if (i > 0) [order[0], order[i]] = [order[i], order[0]]; }
  return order;
}
// väktaren på varje vanlig våning: en annan boss än varvets egen, i mindre format
const guardianFor = depth => { const own = bossFor((cycleOf(depth) + 1) * (FLOORS + 1)); return RNG(run.seed).fork('väktare' + depth).pick(bossPool().filter(b => b !== own)); };
function loadFloor(depth) {
  run.depth = depth;
  if (run.campaign) { startLevel(campaignLevel(depth)); P.armor = Math.min(200, P.armor + mod('armorPerFloor')); if (mod('floorHeal')) heal(mod('floorHeal'), true); saveRun(); return; }
  if (run.abyss) { const L = abyssLevel(depth); startLevel(L); abyssScale(); P.armor = Math.min(200, P.armor + mod('armorPerFloor')); if (mod('floorHeal')) heal(mod('floorHeal'), true); saveRun(); return; }
  const c = cycleOf(depth), pos = cyclePos(depth);
  const level = !isBossDepth(depth)
    ? Gen.floor(RNG.hash(run.seed + ':' + depth), Math.min(5, pos + c), { shop: pos === 2 || pos === 4, weapon: weaponFor(depth), biome: biomeFor(depth), guardian: guardianFor(depth) })
    : Gen.boss(RNG.hash(run.seed + ':boss' + (c ? ':' + c : '')), { arena: BOSSES[bossFor(depth)].arena, boss: bossFor(depth) });
  if (isBossDepth(depth)) level.bossId = bossFor(depth);
  startLevel(level);
  P.armor = Math.min(200, P.armor + mod('armorPerFloor'));
  if (mod('floorHeal')) heal(mod('floorHeal'), true);
  run.freeRerolls = Math.round(mod('freeReroll')) + (depth === 1 || run.metaReroll === undefined ? (run.metaReroll = meta('reroll')) : 0);
  saveRun();
}
function saveRun() { // ögonblicksbild vid våningens start, raderas vid död (permadöd)
  store.set(runKey(), { run: Object.assign({}, run, { cardRng: undefined }), p: { hp: P.hp, armor: P.armor, has: P.has, ammo: P.ammo, mags: P.mags, weapon: P.weapon, potions: P.potions || [], grenades: P.grenades, keys: P.keys }, score });
}
function loadRunSave() {
  const s = store.get(runKey(), null); if (!s) return false;
  run = Object.assign({}, s.run); run.cardRng = RNG(RNG.hash(run.seed + ':kort:' + run.depth));
  const pad = (a, v) => WEAPONS.map((_, i) => a[i] ?? v); // äldre sparningar hade fyra vapen
  Object.assign(P, { hp: s.p.hp, armor: s.p.armor, has: pad(s.p.has, false), ammo: Object.assign(NOAMMO(), s.p.ammo), mags: pad(s.p.mags, 0), weapon: s.p.weapon, potions: s.p.potions || [], grenades: s.p.grenades ?? P.grenades, keys: s.p.keys ?? P.keys });
  score = s.score; settings.diff = run.diff; recomputeMods();
  return true;
}
function resetPlayer() {
  P.has = WEAPONS.map((_, i) => i === 0); P.weapon = 0; P.ammo = NOAMMO(); P.mags = WEAPONS.map((_, i) => i === 0 ? 9 : 0); P.hp = 100; P.armor = 0; P.shield = 0; score = 0;
  P.ammo.p9 = Math.round(P.ammo.p9 * (1 + 0.5 * meta('ammo'))); P.armor = 25 * meta('armor'); P.hp = 100 + meta('hp') * 10; // själaaltaret
  P.grenades = 2 + meta('grenade'); P.keys = meta('key'); P.stam = 1; P.combo = 0;
  P.potions = meta('potstart') ? [{ id: 'heal', strong: false }] : []; P.rageT = P.ghostT = P.speedT = 0; pet = null; allies = [];
  P.battery = 60 + 40 * meta('lamp'); P.lamp = false; P.stones = 3; P.reverseT = 0; P.pullT = 0;
}
function startLevel(level) {
  wallMarks.clear();
  lvl = level;
  map = lvl.map.map(r => r.split('')); mh = map.length; mw = map[0].length;
  icicles.length = 0; groundFires.length = 0; spores.length = 0; challenge = null; iceSteps = {}; P.cold = 0; waves = []; clones = []; mirrors = []; darkT = 0; doors = {}; ents = []; items = []; pots = []; torches = []; chests = []; merchants = []; particles = []; projectiles = []; numbers.length = 0; fuses.length = 0; portals = []; hazards = []; decals.length = 0;
  lvlStat.shots = lvlStat.hits = lvlStat.taken = 0; lvlStat.healed = 0;
  if (run) run.floorStealth = 0;
  guardianE = null; kills = 0; totalEnemies = 0; secrets = 0; totalSecrets = 0; itemsTaken = 0; totalItems = 0; levelTime = 0; boss = null; bossBanner = 0;
  light = new Float32Array(mw * mh); lcol = settings.colorLight === false ? null : new Float32Array(mw * mh * 3); seen = new Uint8Array(mw * mh); flow = new Int16Array(mw * mh).fill(-1); flowCell = -1;
  const lrng = RNG(RNG.hash(run.seed + ':spawn:' + run.depth));
  const itemOf = { h: 'health', a: 'ammo', A: 'armor', $: 'goldpile', ',': 'grenade', '}': 'key', "'": 'scroll', '¥': 'potion', 'ª': 'rune', 'ð': 'meat', 'þ': 'page', '¼': 'battery', '½': 'stones', 'Ģ': 'tome', 'Ŋ': 'gear', 'ŋ': 'feather', 'Ũ': 'sporesack', 'Ƃ': 'inkflask', 'ƞ': 'beehive', 'Ƴ': 'dreamflask', 'ǫ': 'chaincrate', 'ǭ': 'acidflask', 'Ǿ': 'pinbox', 'ȏ': 'dartquiver', 'ȫ': 'stardust', 'Ɇ': 'traps', 'ɟ': 'scrap', 'ɻ': 'brimstone', 'ʖ': 'cannonballs', ...WEAPON_CHAR };
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = map[y][x], cx = x + 0.5, cy = y + 0.5;
    if (c === 'P') { P.x = cx; P.y = cy; P.a = startAngle(x, y); map[y][x] = '.'; }
    else if (c === 'Ç') { icicles.push({ x: cx, y: cy, fall: -1 }); map[y][x] = '.'; }
    else if (c === 'Q' || c === '+' || c === 'Ö') { const e = makeEnemy(c, cx, cy); e.dormant = true; ents.push(e); map[y][x] = '.'; } // mimicen och rustningen räknas först när de vaknar
    else if (c === 'Z') { const g = makeGuardian(cx, cy); if (g) { ents.push(g); totalEnemies++; } map[y][x] = '.'; }
    else if (ENEMY_DEFS[c]) { ents.push(makeEnemy(c, cx, cy)); totalEnemies++; map[y][x] = '.'; }
    else if (c === 'E' || (dmod('elite') && ENEMY_DEFS[c] && lrng.chance(0.15))) { ents.push(makeElite(lrng, cx, cy)); totalEnemies++; map[y][x] = '.'; }
    else if (c === 'B') { boss = makeBoss(cx, cy); ents.push(boss); totalEnemies++; map[y][x] = '.'; }
    else if (itemOf[c]) { const it = { type: itemOf[c], x: cx, y: cy, taken: false }; if (c === 'a') { const r = lrng.next(); it.mult = r < 0.2 ? 0.5 : r < 0.33 ? 2 : 1; } if (c === '¥') it.pot = randomPotion(() => lrng.next()); if (c === 'ª') it.rune = lrng.pick(RUNE_IDS); items.push(it); totalItems++; map[y][x] = '.'; } // ammolådor i tre storlekar
    else if (isDoorChar(c)) { doors[x + ',' + y] = { open: 0, target: 0, gate: c === 'G', secret: c === '*', lever: c === '|', locked: c === ']', x, y }; if (c === '*') totalSecrets++; }
    else if (c === '{') totalSecrets++;
    else if (c === 'x') { map[y][x] = '.'; lvl.exit = { x, y }; }
    else if (c === 'f') { torches.push({ x: cx, y: cy, ph: Math.random() * 10, cells: [] }); }
    else if (c === 'o') { pots.push({ x: cx, y: cy, color: (x * 7 + y * 3) % 4, broken: false, loot: lrng.chance(0.5) ? lrng.pick(['ammo', 'health', 'gold', 'gold', 'grenade', lrng.chance(0.15) ? 'key' : 'gold', lrng.chance(0.25 + mod('potionChance')) ? 'potion' : 'gold']) : null }); map[y][x] = '.'; }
    else if (c === 'C') { chests.push({ x: cx, y: cy, open: false, t: 0 }); totalItems++; map[y][x] = '.'; }
    else if (c === 'M') { merchants.push({ x: cx, y: cy, stock: null }); } // köpmannen blockerar sin ruta
  }
  setupEnemyRoles(lrng); setupV6Roles(lrng);
  ghosts = []; echoes = []; quakeT = 8;
  floorTexs = (lvl.floors || [lvl.floor]).map(n => tex[n] || tex.floor_stone);
  cellFloor = new Uint8Array(mw * mh); cellSky = new Uint8Array(mw * mh); props = []; hazGrid = new Uint8Array(mw * mh);
  const hazTex = { '_': 'floor_lava', '-': 'floor_water', ':': 'floor_ice', '¬': 'floor_crack', '·': 'floor_pit', '¯': 'floor_quicksand', 'Đ': 'floor_deepwater', 'Ĕ': 'floor_shallow', 'Ń': 'floor_void', 'ń': 'floor_wind', 'Ŀ': 'floor_sawtrack', 'ţ': 'floor_bouncepad', 'Ť': 'floor_sporepool', 'ť': 'floor_teleport', 'Ŭ': 'floor_ink', 'Ÿ': 'floor_conveyor', 'Ź': 'floor_molten', 'ź': 'floor_vent', 'ƍ': 'floor_lightbeam', 'Ɩ': 'floor_honey', 'ƥ': 'floor_thorns', 'Ʀ': 'floor_dreammist', 'Ǎ': 'floor_rotplank', 'Ǐ': 'floor_wetdeck', 'Ǜ': 'floor_acid', 'ǜ': 'floor_transmute', 'Ǳ': 'floor_trapdoor', 'ǲ': 'floor_spotlight', 'Ȃ': 'floor_piranha', 'ȃ': 'floor_vines', 'Ȗ': 'floor_rail', 'ȗ': 'floor_gas2', 'Ș': 'floor_cavein', 'ș': 'floor_starmap', 'Ț': 'floor_domeslit', 'Ȳ': 'floor_sludge', 'ȳ': 'floor_spray', 'ȴ': 'floor_oasis', 'ȵ': 'floor_mirage', 'ɍ': 'floor_alarmplate', 'Ɏ': 'floor_net', 'ɣ': 'floor_hotpool', 'ɤ': 'floor_steamvent', 'ɥ': 'floor_coldpool', 'ɰ': 'floor_firestream', 'ɱ': 'floor_runecircle', 'ɿ': 'floor_bloodslick', 'ʀ': 'floor_grinder', 'ʋ': 'floor_deepmud', 'ʌ': 'floor_target' }, hazIdx = {}, nBase = floorTexs.length;
  for (const [ch, n] of Object.entries(hazTex)) { hazIdx[ch] = floorTexs.length; floorTexs.push(tex[n]); }
  animTex = { lava: hazIdx['_'], water: hazIdx['-'], ice: hazIdx[':'], pit: hazIdx['·'], deep: hazIdx['Đ'], shallow: hazIdx['Ĕ'], acid: hazIdx['Ǜ'], sludge: hazIdx['Ȳ'], honey: hazIdx['Ɩ'], ink: hazIdx['Ŭ'], molten: hazIdx['Ź'], sporepool: hazIdx['Ť'], piranha: hazIdx['Ȃ'], oasis: hazIdx['ȴ'] }; let lavaLights = 0; crumbles = {};
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    if (lvl.floorMask) cellFloor[y * mw + x] = Math.min(nBase - 1, +lvl.floorMask[y][x] || 0);
    if (map[y][x] === '¬') crumbles[y * mw + x] = { t: -1 }; // skör platta
    if (hazIdx[map[y][x]] !== undefined) cellFloor[y * mw + x] = hazIdx[map[y][x]];
    if (map[y][x] === '_' && (x + y) % 3 === 0 && lavaLights++ < 50) torches.push({ x: x + 0.5, y: y + 0.5, ph: Math.random() * 10, cells: [], hidden: true, str: 0.45, r: 3 }); // lavan lyser
    if (lvl.sky) cellSky[y * mw + x] = lvl.sky[y][x] === '1' ? 1 : 0;
    const c = map[y][x], h = (x * 73856093 ^ y * 19349663) >>> 0;
    if (c === 't') props.push({ x: x + 0.5 + ((h % 7) - 3) * 0.03, y: y + 0.5 + (((h >> 3) % 7) - 3) * 0.03, img: fx.trees[h % 2], size: 1.45 + (h % 5) * 0.08, flip: !!(h & 16) });
    else if (c === 'n') props.push({ x: x + 0.5, y: y + 0.5, img: fx.graves[h % 3], size: 0.62, flip: false });
    else if (PROP_DEFS[c] && (fx.props[PROP_DEFS[c].img] || fx.props[PROP_DEFS[c].fb])) {
      const d = PROP_DEFS[c], frames = fx.props[d.img] || fx.props[d.fb];
      const o = { x: x + 0.5, y: y + 0.5, cx: x, cy: y, ch: c, def: d, frames, img: frames[0], size: d.size, flip: !d.n && !!(h & 16), ph: (h % 100) / 10 };
      props.push(o);
      if (d.light) torches.push({ x: o.x, y: o.y, ph: o.ph, cells: [], hidden: true, str: d.light, r: d.lightR || 4, prop: o });
      if (d.trap || c === 'z') hazGrid[y * mw + x] = 1;
      if (d.web) { o.size = 0.85; o.z = 0.05; continue; } // nätet ligger kvar i kartan (saktar ned, kan brinna)
      if (!d.block) map[y][x] = d.under === 'Đ' ? 'Đ' : d.under === 'auto' && [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => (map[y + b] || '')[x + a] === 'Đ').length >= 2 ? 'Đ' : '.'; // ben, ljus, svamp och fällor går att gå över; bubblor i vattnet ligger kvar i vatten
    }
  }
  prepareTorchLight();
  quests = null; run.inSecret = !!lvl.secret; boulders = []; smokes = []; tornados = [];
  pickFloorEvent(lrng); setupQuests(lrng); addCobwebs(lrng); lockChests(lrng); setupNpcFloor(lrng); setupV8(lrng); setupV9(); setupV11(); setupV13(); setupV14(); setupV15(); setupV16(); setupV17(); setupV18(); setupV19(); setupV20(); setupV21(); setupV22(); setupV23(); setupLoop();
  if (dmod('giants')) for (const e of ents) if (!e.boss) { e.hp = e.maxHp = e.maxHp * 1.3; e.d = { ...e.d, size: e.d.size * 1.2, score: e.d.score * 1.5 }; }
  if (run.floorCurse) for (const e of ents) if (!e.boss) { e.hp = e.maxHp = e.maxHp * 1.2; e.d = { ...e.d, dmg: e.d.dmg * 1.3 }; }
  if (!boss && !merchants.length && run.depth >= 2 && lrng.next() < 0.15) { const sp = randomFreeCell(lrng); if (sp) { merchants.push({ x: sp[0], y: sp[1], stock: null, wander: true }); map[sp[1] | 0][sp[0] | 0] = 'M'; logEvent('VANDRANDE KÖPMAN'); } } // vandrande köpman
  if (floorEvent === 'mist') fogMul = 1.8; else fogMul = 1;
  P.vx = P.vy = 0; P.flash = 0; P.hurt = 0; P.roll = 0; P.camZ = 0.5; P.deadT = 0; P.shake = 0; P.haste = 0; P.look = 0; if (P.deathPitch) { P.pitch = 0; P.deathPitch = false; } // dödskamerans nedåtblick nollställs
  P.hp = Math.min(P.hp, maxHp()); P.shield = mod('shield');
  WS.state = 'draw'; WS.t = 0; WS.aim = 0; WS.shot = 99;
  hurtDir = []; msgs.length = 0;
  state = 'play';
  if (!boss) levelBanner = 3; // stort titelkort med namn och biom
  if (run && lvl.biome && !boss) run.biomes = (run.biomes || []).concat(lvl.biome);
  else say(lvl.name, 3);
  v27Start(); // version 27: planritningens namn
  v28Start(); // version 28 (REND): takfläckar nollställs, fönstrens ramar och genomsiktliga rutor
  if (boss) { bossIntro = 2.2; boss.cd = Math.max(boss.cd, 3); }
  if (boss) { bossBanner = 3.5; slowmo = 1.2; play('stinger', 0.8); if (window.Music) Music.sting('boss'); setTimeout(() => play('bossroar', 0.9, 0.8), 600); }
  startAmbient(); buildGrade(); fogK = biomeFx().fogK * fogMul; lightning = 0; lightningT = rnd(4, 10);
  setMusic(!!boss);
}
