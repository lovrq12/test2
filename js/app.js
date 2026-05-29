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

  init() {
    this.layer = document.getElementById('effects-layer');
    if (!this.layer) {
      this.layer = document.createElement('div');
      this.layer.id = 'effects-layer';
      document.body.appendChild(this.layer);
    }
    this.spawnAsh();
  },

  spawnAsh() {
    setInterval(() => {
      if (!this.layer) return;
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

  startRain() {
    this.stopRain();
    for (let i = 0; i < 80; i++) this.spawnRainDrop();
    this._rainInterval = setInterval(() => {
      for (let i = 0; i < 5; i++) this.spawnRainDrop();
    }, 100);
  },

  spawnRainDrop() {
    if (!this.layer) return;
    const drop = document.createElement('div');
    drop.className = 'rain-drop';
    const dur = 0.5 + Math.random() * 0.6;
    drop.style.left = Math.random() * 100 + 'vw';
    drop.style.height = (40 + Math.random() * 60) + 'px';
    drop.style.animationDuration = dur + 's';
    drop.style.animationDelay = -Math.random() * dur + 's';
    drop.style.opacity = 0.3 + Math.random() * 0.5;
    this.layer.appendChild(drop);
    setTimeout(() => drop.remove(), (dur + 0.1) * 1000 * 20);
  },

  stopRain() {
    if (this._rainInterval) { clearInterval(this._rainInterval); this._rainInterval = null; }
    if (this.layer) this.layer.querySelectorAll('.rain-drop').forEach(d => d.remove());
  },

  lightning() {
    const flash = document.createElement('div');
    flash.className = 'lightning-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
    if (typeof Sound !== 'undefined') setTimeout(() => Sound.playThunder(), 100);
  },

  startLightning() {
    this.stopLightning();
    const fire = () => {
      this.lightning();
      this._lightningTimeout = setTimeout(fire, 6000 + Math.random() * 14000);
    };
    this._lightningTimeout = setTimeout(fire, 2000 + Math.random() * 5000);
  },

  stopLightning() {
    if (this._lightningTimeout) { clearTimeout(this._lightningTimeout); this._lightningTimeout = null; }
  },

  spawnMeteor() {
    if (!this.layer) return;
    const m = document.createElement('div');
    m.className = 'meteor';
    m.style.top = Math.random() * 40 + 'vh';
    m.style.left = Math.random() * 80 + 'vw';
    this.layer.appendChild(m);
    setTimeout(() => m.remove(), 1600);
  },

  startMeteors() {
    this.stopMeteors();
    const schedule = () => {
      this.spawnMeteor();
      this._meteorTimeout = setTimeout(schedule, 2500 + Math.random() * 5500);
    };
    this._meteorTimeout = setTimeout(schedule, 900 + Math.random() * 2600);
  },

  stopMeteors() {
    if (this._meteorTimeout) { clearTimeout(this._meteorTimeout); this._meteorTimeout = null; }
    if (this._meteorInterval) { clearInterval(this._meteorInterval); this._meteorInterval = null; }
    if (this.layer) this.layer.querySelectorAll('.meteor').forEach(m => m.remove());
  },

  startCrystalDust() {
    this.stopCrystalDust();
    for (let i = 0; i < 24; i++) this.spawnCrystalDust();
    this._crystalDustInterval = setInterval(() => this.spawnCrystalDust(), 260);
  },

  spawnCrystalDust() {
    if (!this.layer) return;
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

  stopCrystalDust() {
    if (this._crystalDustInterval) {
      clearInterval(this._crystalDustInterval);
      this._crystalDustInterval = null;
    }
    if (this.layer) this.layer.querySelectorAll('.crystal-dust').forEach(d => d.remove());
  },

  screenShake() {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 500);
  },

  setNight() {
    this.startRain();
    this.startLightning();
    this.startMeteors();
    this.startCrystalDust();
    if (typeof Sound !== 'undefined') {
      Sound.startRain();
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
  dog:    '🐶',
  fox:    '🦊',
  dragon: '🐉',
  eagle:  '🦅',
  owl:    '🦉',
  snake:  '🐍',
  tiger:  '🐯',
  bear:   '🐻',
  crow:   '🐦‍⬛',
  cat:    '🐱',
};

function getAnimalEmoji(icon) {
  return ANIMAL_ICONS[icon] || '🐺';
}

const PLAYER_PORTRAIT_FALLBACK = 'assets/player_cards/01_majed_hooded_mask.png';
const PLAYER_PORTRAITS = {
  wolf:   'assets/player_cards/01_majed_hooded_mask.png',
  lion:   'assets/player_cards/03_yousef_bearded_man.png',
  dog:    'assets/player_cards/06_kareem_silver_hair.png',
  fox:    'assets/player_cards/02_laila_dark_woman.png',
  dragon: 'assets/player_cards/04_hiba_witch_hat.png',
  eagle:  'assets/player_cards/07_sarah_masked_final.png',
  owl:    'assets/player_cards/05_nora_dark_woman.png',
  snake:  'assets/player_cards/01_majed_hooded_mask.png',
  tiger:  'assets/player_cards/03_yousef_bearded_man.png',
  bear:   'assets/player_cards/06_kareem_silver_hair.png',
  crow:   'assets/player_cards/07_sarah_masked_final.png',
  cat:    'assets/player_cards/02_laila_dark_woman.png',
};

const PLAYER_PORTRAIT_LABELS = {
  wolf: 'Majed',
  lion: 'Yousef',
  dog: 'Kareem',
  fox: 'Laila',
  dragon: 'Hiba',
  eagle: 'Sarah',
  owl: 'Nora',
  snake: 'Majed',
  tiger: 'Yousef',
  bear: 'Kareem',
  crow: 'Sarah',
  cat: 'Laila',
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
  return `<img class="${safeClass}" src="${getPlayerPortrait(iconKey)}" alt="${safeAlt}" loading="lazy" decoding="async" onerror="this.src='${PLAYER_PORTRAIT_FALLBACK}'">`;
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
    rainWanted = true;
    initRainAmbi();
    if (!rainAmbiAudio) return;
    const tryPlay = () => {
      if (!rainWanted) return;
      rainAmbiAudio.play().then(() => {
        fadeVolume(rainAmbiAudio, RAIN_VOL, FADE_MS);
      }).catch(() => {});
    };
    if (_rainReady) {
      tryPlay();
    } else {
      rainAmbiAudio.addEventListener('canplaythrough', tryPlay, { once: true });
    }
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
    try { Ambience.startRainAmbi(); } catch(e) {}
  };
})();

// Standalone ambience functions (per spec)
function startBirdsAmbience()      { try { Ambience.startBirds(); } catch(e) {} }
function stopBirdsAmbience()       { try { Ambience.stopBirds(); } catch(e) {} }
function startNightRainAmbience()  { try { Ambience.startRainAmbi(); } catch(e) {} }
function stopNightRainAmbience()   { try { Ambience.stopRainAmbi(); } catch(e) {} }
