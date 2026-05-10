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
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
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
    this._meteorInterval = setInterval(() => this.spawnMeteor(), 3000 + Math.random() * 4000);
  },

  stopMeteors() {
    if (this._meteorInterval) { clearInterval(this._meteorInterval); this._meteorInterval = null; }
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
    if (typeof Sound !== 'undefined') { Sound.startRain(); Sound.startWind(); }
  },

  setDay() {
    this.stopRain();
    this.stopLightning();
    if (typeof Sound !== 'undefined') { Sound.stopRain(); Sound.stopWind(); }
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
