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
const NEW_EXTRA_ROLE_IDS = ['victim', 'poisoner', 'infected', 'oathbreaker', 'mad_citizen', 'governor', 'poet', 'habait', 'chemist', 'blackWizard'];
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
    description: 'كل ليلة يختار لاعبًا واحدًا: إما يذبحه أو يحميه. لا يجمع بين الفعلين في نفس الليلة.',
    color: '#f97316', abilities: ['mad_kill', 'mad_protect'], nightAction: true, minPlayers: 4,
  },
  governor: {
    id: 'governor', arabicName: 'الحاكمة', team: 'citizens', type: 'special',
    image: 'assets/cards/new_roles/governor.png',
    description: 'تُفتح قدرتها فقط إذا ماتت ثم عادت للحياة: تكشف كرت لاعب واحد علنًا. لا تستطيع كشف المافيا الملعون.',
    color: '#c4b5fd', abilities: ['public_reveal'], nightAction: true, minPlayers: 4,
  },
  poet: {
    id: 'poet', arabicName: 'الشاعر', team: 'citizens', type: 'special',
    image: 'assets/cards/new_roles/poet.png',
    description: 'مرة واحدة في الليل يطلب كشفًا متبادلًا مع لاعب واحد. إذا وافق الهدف، يرى كل منهما بطاقة الآخر فقط.',
    color: '#93c5fd', abilities: ['mutual_private_reveal'], nightAction: true, once: true, minPlayers: 4,
  },
  habait: {
    id: 'habait', arabicName: 'حبيت', team: 'citizens', type: 'special',
    image: 'assets/cards/new_roles/habait.png',
    description: 'مرة واحدة في الليل يختار لاعبًا يرتبط به. إذا مات ذلك اللاعب بأي سبب، يموت حبيت معه فورًا.',
    color: '#f472b6', abilities: ['beloved_link'], nightAction: true, once: true, minPlayers: 4,
  },
  chemist: {
    id: 'chemist', arabicName: 'الكيميائي', team: 'citizens', type: 'special',
    image: 'assets/cards/new_roles/chemist.png',
    description: 'يمتلك ثلاث جرعات ليلية: علاج يحيي لاعبًا ميتًا من المواطنين، كشف يرى دور لاعب سرًا، ودرع يحمي الجميع من قتل المافيا في تلك الليلة. لا يستخدم إلا جرعة واحدة في الليلة.',
    color: '#a78bfa', abilities: ['chemist_heal', 'chemist_reveal', 'chemist_shield'], nightAction: true, minPlayers: 4,
  },
  blackWizard: {
    id: 'blackWizard', arabicName: 'الساحر الأسود', team: 'mafia', type: 'special',
    image: 'assets/cards/new_roles/black-wizard.png',
    description: 'مرة واحدة في الليل يعطل قدرات غير المافيا لتلك الليلة فقط، بينما تستمر قدرات المافيا وقتلها الليلي بشكل طبيعي.',
    color: '#c084fc', abilities: ['disable_non_mafia'], nightAction: true, once: true, minPlayers: 4,
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
  poet: 'assets/optimized/cards/thumbs/poet_thumb.png',
  habait: 'assets/optimized/cards/thumbs/habait_thumb.png',
  chemist: 'assets/optimized/cards/thumbs/chemist_thumb.png',
  blackWizard: 'assets/optimized/cards/thumbs/black_wizard_thumb.png',
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
// ── Copy to clipboard ──────────────────────────────────────────────────────────
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('تم النسخ!', 'success');
  }).catch(() => {
    showToast(text, 'info');
  });
}

