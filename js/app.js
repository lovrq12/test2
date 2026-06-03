// ===== NIGHTMARES — APP UTILITIES =====

// ── Session ──────────────────────────────────────────────────────────────────
const Session = {
  get: (key) => localStorage.getItem(`nm_${key}`),
  set: (key, val) => localStorage.setItem(`nm_${key}`, val),
  remove: (key) => localStorage.removeItem(`nm_${key}`),

  getPlayer: () => ({
    id:     localStorage.getItem('nm_playerId'),
    name:   localStorage.getItem('nm_playerName'),
    icon:   localStorage.getItem('nm_playerIcon'),
    roomId: localStorage.getItem('nm_roomId'),
    code:   localStorage.getItem('nm_roomCode'),
  }),

  savePlayer: (id, name, icon, roomId, code) => {
    localStorage.setItem('nm_playerId', id);
    localStorage.setItem('nm_playerName', name);
    localStorage.setItem('nm_playerIcon', icon);
    localStorage.setItem('nm_roomId', roomId);
    localStorage.setItem('nm_roomCode', code);
  },

  clear: () => {
    ['nm_playerId','nm_playerName','nm_playerIcon','nm_roomId','nm_roomCode']
      .forEach(k => localStorage.removeItem(k));
  }
};

// ── Generate Room Code ────────────────────────────────────────────────────────
// New roles update pack is loaded here so js/roles.js stays untouched.
const NEW_EXTRA_ROLE_IDS = ['victim', 'poisoner', 'infected', 'oathbreaker', 'mad_citizen', 'governor'];
const NEW_EXTRA_ROLE_META = {
  victim: {
    id: 'victim', arabicName: 'الضحية', team: 'citizens', type: 'special',
    image: 'assets/cards/new_roles/victim.png',
    description: 'يحيي لاعبًا ميتًا من غير المافيا ويضحي بنفسه مكانه. يرى كرت اللاعب قبل إعادته للحياة.',
    color: '#f8d6a5', abilities: ['sacrificial_revive'], nightAction: true, once: true, minPlayers: 6,
  },
  poisoner: {
    id: 'poisoner', arabicName: 'المسمم', team: 'mafia', type: 'special',
    image: 'assets/cards/new_roles/poisoner.png',
    description: 'يسمّم هدفًا واحدًا ليموت بعد ليلتين. السم ليس فوريًا.',
    color: '#84cc16', abilities: ['poison'], nightAction: true, once: true, minPlayers: 7,
  },
  infected: {
    id: 'infected', arabicName: 'المصاب', team: 'citizens', type: 'special',
    image: 'assets/cards/new_roles/infected.png',
    description: 'إذا قتلته المافيا ليلًا، ينتقل المرض إلى القاتل ويموت في الليلة التالية.',
    color: '#22d3ee', abilities: ['infect'], nightAction: false, passive: true, minPlayers: 6,
  },
  oathbreaker: {
    id: 'oathbreaker', arabicName: 'كاسر القسم', team: 'mafia', type: 'special',
    image: 'assets/cards/new_roles/oathbreaker.png',
    description: 'مرة واحدة في اللعبة، يكسر حماية الطبيب عن هدف واحد. إذا كان الهدف محميًا ومقصودًا بالقتل، يموت رغم الحماية.',
    color: '#fb7185', abilities: ['bypass_protection'], nightAction: true, once: true, minPlayers: 7,
  },
  mad_citizen: {
    id: 'mad_citizen', arabicName: 'المواطن المجنون', team: 'citizens', type: 'special',
    image: 'assets/cards/new_roles/mad_citizen.png',
    description: 'كل ليلة يختار لاعبًا واحدًا: إما يحميه أو يستخدم ذبحه الوحيد في المباراة. لا يجمع بين الفعلين في نفس الليلة.',
    color: '#f97316', abilities: ['mad_kill', 'mad_protect'], nightAction: true, minPlayers: 4,
  },
  governor: {
    id: 'governor', arabicName: 'الحاكمة', team: 'citizens', type: 'special',
    image: 'assets/cards/new_roles/governor.png',
    description: 'مرة واحدة في المباراة ليلًا: تختار لاعبًا لتكشف كرته على الطاولة حتى نهاية اللعبة.',
    color: '#c4b5fd', abilities: ['public_reveal'], nightAction: true, once: true, minPlayers: 4,
  },
};

if (typeof ROLES !== 'undefined') {
  Object.assign(ROLES, NEW_EXTRA_ROLE_META);
}

function isNewExtraRole(roleId) {
  return NEW_EXTRA_ROLE_IDS.includes(roleId);
}

function getEnabledExtraRoleIds(enabledExtraRoles = {}) {
  if (Array.isArray(enabledExtraRoles)) return enabledExtraRoles.filter(isNewExtraRole);
  return NEW_EXTRA_ROLE_IDS.filter(roleId => !!enabledExtraRoles?.[roleId]);
}

function getEnabledExtraRoleMap(roleIds = []) {
  return NEW_EXTRA_ROLE_IDS.reduce((map, roleId) => {
    map[roleId] = roleIds.includes(roleId);
    return map;
  }, {});
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'N';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px) scale(0.95)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── Cinematic Overlay ─────────────────────────────────────────────────────────
function showCinematic(title, subtitle = '', duration = 2800, onDone) {
  let overlay = document.getElementById('cinematic-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cinematic-overlay';
    overlay.innerHTML = `<div id="cinematic-text"><h1></h1><p></p></div>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector('h1').textContent = title;
  overlay.querySelector('p').textContent = subtitle;
  overlay.classList.add('active');

  setTimeout(() => {
    overlay.classList.remove('active');
    if (onDone) setTimeout(onDone, 500);
  }, duration);
}

// ── Effects Layer ─────────────────────────────────────────────────────────────
const Effects = {
  layer: null,

  isMobileLite() {
    return window.matchMedia?.('(max-width: 700px)').matches;
  },

  isLowPower() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection?.saveData === true;
    return this.isMobileLite() || reducedMotion || saveData;
  },

  init() {
    this._isMobile = window.innerWidth <= 700;
    this.layer = document.getElementById('effects-layer');
    if (!this.layer) {
      this.layer = document.createElement('div');
      this.layer.id = 'effects-layer';
      document.body.appendChild(this.layer);
    }
    this.bindLifecycle();
    if (!this.isLowPower()) this.spawnAsh();
  },

  spawnAsh() {
    this._ashWanted = true;
    if (this._isMobile || this.isLowPower() || document.hidden) return;
    if (this._ashInterval) return;
    this._ashInterval = setInterval(() => {
      if (this._isMobile || this.isLowPower() || document.hidden) return;
      if (!this.layer) return;
      if (this.layer.querySelectorAll('.ash').length >= 6) return;
      const ash = document.createElement('div');
      ash.className = 'ash';
      ash.style.left = Math.random() * 100 + 'vw';
      const dur = 8 + Math.random() * 12;
      ash.style.animationDuration = dur + 's';
      ash.style.animationDelay = -Math.random() * dur + 's';
      ash.style.width = ash.style.height = (2 + Math.random() * 4) + 'px';
      this.layer.appendChild(ash);
      setTimeout(() => ash.remove(), dur * 1000);
    }, 600);
  },

  stopAsh(clearWanted = true) {
    if (clearWanted) this._ashWanted = false;
    if (this._ashInterval) { clearInterval(this._ashInterval); this._ashInterval = null; }
    if (this.layer) this.layer.querySelectorAll('.ash').forEach(a => a.remove());
  },

  startRain() {
    this.stopRain?.();
    return;
  },

  spawnRainDrop() {
    return;
  },

  stopRain() {
    if (this._rainInterval) { clearInterval(this._rainInterval); this._rainInterval = null; }
    if (this.layer) this.layer.querySelectorAll('.rain-drop').forEach(d => d.remove());
  },

  lightning() {
    if (this.isLowPower() || document.hidden) return;
    const flash = document.createElement('div');
    flash.className = 'lightning-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
    if (typeof Sound !== 'undefined') setTimeout(() => Sound.playThunder(), 100);
  },

  startLightning() {
    this._lightningWanted = true;
    this.stopLightning(false);
    if (this.isLowPower() || document.hidden) return;
    const fire = () => {
      this.lightning();
      this._lightningTimeout = setTimeout(fire, 6000 + Math.random() * 14000);
    };
    this._lightningTimeout = setTimeout(fire, 2000 + Math.random() * 5000);
  },

  stopLightning(clearWanted = true) {
    if (clearWanted) this._lightningWanted = false;
    if (this._lightningTimeout) { clearTimeout(this._lightningTimeout); this._lightningTimeout = null; }
  },

  spawnMeteor() {
    if (!this.layer) return;
    if (this.isLowPower() || document.hidden) return;
    if (this.layer.querySelectorAll('.meteor').length >= 2) return;
    const m = document.createElement('div');
    m.className = 'meteor';
    m.style.top = Math.random() * 40 + 'vh';
    m.style.left = Math.random() * 80 + 'vw';
    this.layer.appendChild(m);
    setTimeout(() => m.remove(), 1400);
  },

  startMeteors() {
    this._meteorsWanted = true;
    this.stopMeteors(false);
    if (this.isLowPower() || document.hidden) return;
    const schedule = () => {
      this.spawnMeteor();
      const delay = 6000 + Math.random() * 6000;
      this._meteorTimeout = setTimeout(schedule, delay);
    };
    this._meteorTimeout = setTimeout(schedule, 6000 + Math.random() * 6000);
  },

  stopMeteors(clearWanted = true) {
    if (clearWanted) this._meteorsWanted = false;
    if (this._meteorTimeout) { clearTimeout(this._meteorTimeout); this._meteorTimeout = null; }
    if (this._meteorInterval) { clearInterval(this._meteorInterval); this._meteorInterval = null; }
    if (this.layer) this.layer.querySelectorAll('.meteor').forEach(m => m.remove());
  },

  startCrystalDust() {
    this._crystalDustWanted = true;
    if (this._isMobile || this.isLowPower() || document.hidden) return;
    this.stopCrystalDust(false);
    for (let i = 0; i < 4; i++) this.spawnCrystalDust();
    this._crystalDustInterval = setInterval(() => this.spawnCrystalDust(), 900);
  },

  spawnCrystalDust() {
    if (!this.layer) return;
    if (this._isMobile || this.isLowPower() || document.hidden) return;
    if (this.layer.querySelectorAll('.crystal-dust').length >= 8) return;
    const dust = document.createElement('div');
    dust.className = 'crystal-dust';
    const size = 2 + Math.random() * 5;
    const duration = 5 + Math.random() * 8;
    dust.style.width = `${size}px`;
    dust.style.height = `${size}px`;
    dust.style.left = Math.random() * 100 + 'vw';
    dust.style.top = 60 + Math.random() * 45 + 'vh';
    dust.style.animationDuration = duration + 's';
    dust.style.animationDelay = -Math.random() * duration + 's';
    this.layer.appendChild(dust);
    setTimeout(() => dust.remove(), duration * 1000 + 300);
  },

  stopCrystalDust(clearWanted = true) {
    if (clearWanted) this._crystalDustWanted = false;
    if (this._crystalDustInterval) {
      clearInterval(this._crystalDustInterval);
      this._crystalDustInterval = null;
    }
    if (this.layer) this.layer.querySelectorAll('.crystal-dust').forEach(d => d.remove());
  },

  pauseAmbientEffects() {
    this.stopLightning(false);
    this.stopMeteors(false);
    this.stopCrystalDust(false);
    this.stopAsh(false);
  },

  resumeAmbientEffects() {
    if (this.isLowPower() || document.hidden) return;
    if (this._ashWanted) this.spawnAsh();
    if (this._lightningWanted) this.startLightning();
    if (this._meteorsWanted) this.startMeteors();
    if (this._crystalDustWanted) this.startCrystalDust();
  },

  stopAllEffects() {
    this.stopRain();
    this.stopLightning();
    this.stopMeteors();
    this.stopCrystalDust();
    this.stopAsh();
  },

  bindLifecycle() {
    if (this._lifeBound) return;
    this._lifeBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseAmbientEffects();
      else this.resumeAmbientEffects();
    });
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this._isMobile = window.innerWidth <= 700;
        if (this.isLowPower()) this.pauseAmbientEffects();
        else this.resumeAmbientEffects();
      }, 150);
    });
    window.addEventListener('pagehide', () => this.stopAllEffects());
    window.addEventListener('beforeunload', () => this.stopAllEffects());
  },

  screenShake() {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 500);
  },

  setNight() {
    if (!this.isLowPower()) {
      this.startLightning();
      this.startMeteors();
      this.startCrystalDust();
    } else {
      this.stopLightning();
      this.stopMeteors();
      this.stopCrystalDust();
    }
    if (typeof Sound !== 'undefined') {
      Sound.startWind();
      Sound.startNightAmbience?.();
    }
  },

  setDay() {
    this.stopRain();
    this.stopLightning();
    this.stopMeteors();
    this.stopCrystalDust();
    if (typeof Sound !== 'undefined') {
      Sound.stopRain();
      Sound.stopWind();
      Sound.stopNightAmbience?.();
    }
  },
};

// ── Player seat positions around ellipse ──────────────────────────────────────
function getSeatPositions(count, cx = 50, cy = 50, rx = 38, ry = 30) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    positions.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
  }
  return positions;
}

// ── Animal icons map ──────────────────────────────────────────────────────────
const ANIMAL_ICONS = {
  wolf:   '🐺',
  lion:   '🦁',
  monkey: '🐵',
  tiger:  '🐯',
  fox:    '🦊',
  bear:   '🐻',
  owl:    '🦉',
  eagle:  '🦅',
  snake:  '🐍',
  cat:    '🐱',
};

const ANIMAL_ICON_ALIASES = {
  dog: 'monkey',
  dragon: 'tiger',
  crow: 'owl',
};

function getAnimalEmoji(icon) {
  return ANIMAL_ICONS[icon] || ANIMAL_ICONS[ANIMAL_ICON_ALIASES[icon]] || '🐺';
}

const PLAYER_PORTRAIT_FALLBACK = 'assets/avatars/wolf.png';
const PLAYER_PORTRAITS = {
  v3_avatar_01: 'assets/v3/game/avatars/avatar-01.png',
  v3_avatar_02: 'assets/v3/game/avatars/avatar-02.png',
  v3_avatar_03: 'assets/v3/game/avatars/avatar-03.png',
  v3_avatar_04: 'assets/v3/game/avatars/avatar-04.png',
  v3_avatar_05: 'assets/v3/game/avatars/avatar-05.png',
  v3_avatar_06: 'assets/v3/game/avatars/avatar-06.png',
  v3_avatar_07: 'assets/v3/game/avatars/avatar-07.png',
  wolf:   'assets/avatars/wolf.png',
  lion:   'assets/avatars/lion.png',
  monkey: 'assets/avatars/bat.png',
  tiger:  'assets/avatars/lion.png',
  fox:    'assets/avatars/fox.png',
  bear:   'assets/avatars/deer.png',
  owl:    'assets/avatars/owl.png',
  eagle:  'assets/avatars/raven.png',
  snake:  'assets/avatars/snake.png',
  cat:    'assets/avatars/cat.png',
  raven:  'assets/avatars/raven.png',
  bat:    'assets/avatars/bat.png',
  witch:  'assets/avatars/witch.png',
  deer:   'assets/avatars/deer.png',
  crow_mask: 'assets/avatars/crow_mask.png',
  dog:    'assets/avatars/bat.png',
  dragon: 'assets/avatars/snake.png',
  crow:   'assets/avatars/raven.png',
};

const PLAYER_PORTRAIT_LABELS = {
  v3_avatar_01: 'الظل الأول',
  v3_avatar_02: 'حارس البنفسج',
  v3_avatar_03: 'زهرة الليل',
  v3_avatar_04: 'القمر الأبيض',
  v3_avatar_05: 'النصل الأسود',
  v3_avatar_06: 'العين الخفية',
  v3_avatar_07: 'المقنع',
  wolf: 'ذئب',
  lion: 'أسد',
  monkey: 'قرد',
  tiger: 'نمر',
  fox: 'ثعلب',
  bear: 'دب',
  owl: 'بومة',
  eagle: 'نسر',
  snake: 'ثعبان',
  cat: 'قط',
  dog: 'قرد',
  dragon: 'نمر',
  crow: 'بومة',
};

function getPlayerPortrait(iconKey) {
  return PLAYER_PORTRAITS[iconKey] || PLAYER_PORTRAIT_FALLBACK;
}

function getPlayerPortraitLabel(iconKey) {
  return PLAYER_PORTRAIT_LABELS[iconKey] || PLAYER_PORTRAIT_LABELS.wolf;
}

function getPlayerPortraitHtml(iconKey, alt = '', className = 'player-portrait') {
  const safeAlt = String(alt || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeClass = String(className || 'player-portrait').replace(/[^a-zA-Z0-9 _-]/g, '');
  const src = getPlayerPortrait(iconKey);
  return `<img class="${safeClass} gothic-avatar-img" src="${src}" alt="${safeAlt}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${PLAYER_PORTRAIT_FALLBACK}';">`;
}

const ROLE_THUMB_OVERRIDES = {
  cursed: 'assets/optimized/cards/thumbs/01_cursed_thumb.png',
  immune_citizen: 'assets/optimized/cards/thumbs/02_immune_citizen_thumb.png',
  liar: 'assets/optimized/cards/thumbs/liar_fake_doctor_thumb.png',
  whisper: 'assets/optimized/cards/thumbs/03_whisper_thumb.png',
  founder: 'assets/optimized/cards/thumbs/04_founder_thumb.png',
  eclipse: 'assets/optimized/cards/thumbs/05_eclipse_thumb.png',
  hopebreaker: 'assets/optimized/cards/thumbs/06_hopebreaker_thumb.png',
  phoenix: 'assets/optimized/cards/thumbs/07_phoenix_thumb.png',
  victim: 'assets/optimized/cards/thumbs/victim_thumb.png',
  poisoner: 'assets/optimized/cards/thumbs/poisoner_thumb.png',
  infected: 'assets/optimized/cards/thumbs/infected_thumb.png',
  oathbreaker: 'assets/optimized/cards/thumbs/oathbreaker_thumb.png',
  mad_citizen: 'assets/optimized/cards/thumbs/mad_citizen_thumb.png',
  governor: 'assets/optimized/cards/thumbs/governor_thumb.png',
};

function getRoleThumbImage(roleId) {
  const role = typeof RoleEngine !== 'undefined' ? RoleEngine.getRole?.(roleId) : null;
  return ROLE_THUMB_OVERRIDES[roleId] || role?.image || '';
}

function preloadImage(src, timeoutMs = 2500) {
  return new Promise((resolve) => {
    if (!src) { resolve(false); return; }
    const img = new Image();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = src;
  });
}

async function preloadCriticalImages(srcs = [], timeoutMs = 2800) {
  const unique = [...new Set(srcs.filter(Boolean))];
  await Promise.all(unique.map(src => preloadImage(src, timeoutMs)));
}

const PLAYER_INACTIVE_GRACE_MS = 30000;

function getPlayerStatus(player = {}, now = Date.now()) {
  if (player.kicked || player.status === 'kicked') return 'kicked';
  if (player.left || player.status === 'left') return 'left';
  if (player.online === false || player.connected === false) {
    const lastSeen = Number(player.lastSeen || 0);
    return lastSeen && now - lastSeen < PLAYER_INACTIVE_GRACE_MS ? 'offline-grace' : 'left';
  }
  return player.status || 'active';
}

function isPlayerActive(player = {}, now = Date.now()) {
  if (!player || !player.id) return false;
  const status = getPlayerStatus(player, now);
  return status !== 'kicked' && status !== 'left';
}

function isActiveAlive(player = {}, now = Date.now()) {
  return !!player.alive && isPlayerActive(player, now);
}

// ── Format seconds ─────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${s}`;
}

// ── Sound button ──────────────────────────────────────────────────────────────
function initSoundButton() {
  let btn = document.getElementById('sound-btn');
  if (!btn) {
    btn = document.createElement('div');
    btn.id = 'sound-btn';
    document.body.appendChild(btn);
  }
  btn.textContent = Sound.isEnabled() ? '🔊' : '🔇';
  btn.addEventListener('click', () => {
    Sound.setStarted();
    Sound.resume();
    const on = Sound.toggle();
    btn.textContent = on ? '🔊' : '🔇';
  });
}

// ── Loading screen ─────────────────────────────────────────────────────────────
function hideLoading() {
  const ls = document.getElementById('loading-screen');
  if (ls) {
    ls.classList.add('hidden');
    setTimeout(() => ls.remove(), 600);
  }
}

// ── Fog layer ──────────────────────────────────────────────────────────────────
function addFog() {
  if (Effects?.isLowPower?.()) return;
  if (!document.querySelector('.fog-layer')) {
    const fog = document.createElement('div');
    fog.className = 'fog-layer';
    document.body.appendChild(fog);
  }
}

// ── Copy to clipboard ──────────────────────────────────────────────────────────
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('تم النسخ!', 'success');
  }).catch(() => {
    showToast(text, 'info');
  });
}

// ================================================================
// NIGHTMARES — AMBIENCE SYSTEM v2.0
// Birds (day) · Rain (night) · Safe loading · No crash on missing files
// ================================================================

const Ambience = (() => {
  // Audio references
  let birdsAudio = null;
  let rainAmbiAudio = null;
  let birdsWanted = false;
  let rainWanted = false;
  let _birdsReady = false;
  let _rainReady = false;

  const BIRDS_SRC = 'assets/audio/birds_day.mp3';
  const RAIN_NIGHT_SRC = 'assets/audio/rain_night.mp3';
  const BIRDS_VOL = 0.14;
  const RAIN_VOL = 0.12;
  const FADE_MS = 1600;

  // Safe audio loader — does not crash if file missing
  function safeAudio(src, onReady) {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', () => { onReady(true); }, { once: true });
    audio.addEventListener('error', () => { onReady(false); }, { once: true });
    audio.src = src;
    return audio;
  }

  function initBirds() {
    if (birdsAudio) return;
    birdsAudio = safeAudio(BIRDS_SRC, (ok) => { _birdsReady = ok; });
  }

  function initRainAmbi() {
    if (rainAmbiAudio) return;
    rainAmbiAudio = safeAudio(RAIN_NIGHT_SRC, (ok) => { _rainReady = ok; });
  }

  function fadeVolume(audio, target, ms) {
    if (!audio) return;
    const start = audio.volume;
    const delta = target - start;
    const steps = Math.ceil(ms / 80);
    let step = 0;
    clearInterval(audio._fadeInterval);
    audio._fadeInterval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, start + delta * (step / steps)));
      if (step >= steps) {
        clearInterval(audio._fadeInterval);
        audio._fadeInterval = null;
        if (target === 0) audio.pause();
      }
    }, 80);
  }

  function startBirds() {
    birdsWanted = true;
    initBirds();
    if (!birdsAudio) return;
    const tryPlay = () => {
      if (!birdsWanted) return;
      birdsAudio.play().then(() => {
        fadeVolume(birdsAudio, BIRDS_VOL, FADE_MS);
      }).catch(() => {});
    };
    if (_birdsReady) {
      tryPlay();
    } else {
      birdsAudio.addEventListener('canplaythrough', tryPlay, { once: true });
    }
  }

  function stopBirds(immediate) {
    birdsWanted = false;
    if (!birdsAudio) return;
    if (immediate) {
      clearInterval(birdsAudio._fadeInterval);
      birdsAudio.volume = 0;
      birdsAudio.pause();
    } else {
      fadeVolume(birdsAudio, 0, FADE_MS);
    }
  }

  function startRainAmbi() {
    rainWanted = false;
    return;
  }

  function stopRainAmbi(immediate) {
    rainWanted = false;
    if (!rainAmbiAudio) return;
    if (immediate) {
      clearInterval(rainAmbiAudio._fadeInterval);
      rainAmbiAudio.volume = 0;
      rainAmbiAudio.pause();
    } else {
      fadeVolume(rainAmbiAudio, 0, FADE_MS);
    }
  }

  // Pause/resume on tab visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (birdsAudio && !birdsAudio.paused) birdsAudio.pause();
      if (rainAmbiAudio && !rainAmbiAudio.paused) rainAmbiAudio.pause();
    } else {
      if (birdsWanted && birdsAudio) birdsAudio.play().catch(() => {});
      if (rainWanted && rainAmbiAudio) rainAmbiAudio.play().catch(() => {});
    }
  });

  return {
    startBirds,
    stopBirds,
    startRainAmbi,
    stopRainAmbi,
  };
})();

// ── Extend Effects with ambience wiring ──────────────────────────────
(function() {
  const origSetDay = Effects.setDay.bind(Effects);
  Effects.setDay = function() {
    origSetDay();
    try { Ambience.stopRainAmbi(); } catch(e) {}
    try { Ambience.startBirds(); } catch(e) {}
  };

  const origSetNight = Effects.setNight.bind(Effects);
  Effects.setNight = function() {
    origSetNight();
    try { Ambience.stopBirds(); } catch(e) {}
  };
})();

// Standalone ambience functions (per spec)
function startBirdsAmbience()      { try { Ambience.startBirds(); } catch(e) {} }
function stopBirdsAmbience()       { try { Ambience.stopBirds(); } catch(e) {} }
function startNightRainAmbience()  {}
function stopNightRainAmbience()   { try { Ambience.stopRainAmbi(); } catch(e) {} }
