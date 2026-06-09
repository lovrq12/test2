// ===== NIGHTMARES — LOBBY JS =====

let session = null;
let roomData = null;
let unsubRoom = null;
let visualModeControlsBound = false;
let lobbyV2ChromeBound = false;
let lobbyTabsBound = false;
let settingsPushTimer = null;

const LOBBY_THEME_KEY = 'nightmares_lobby_theme';

// ── Init ──────────────────────────────────────────────────────────────────────
async function initLobby() {
  session = Session.getPlayer();
  if (!session.id || !session.roomId) {
    showToast('انتهت جلستك', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return;
  }

  // Update room code display
  document.getElementById('room-code-display').textContent = session.code;
  document.getElementById('room-code-badge').addEventListener('click', () => {
    copyText(session.code);
  });

  // Listen to room
  unsubRoom = DB.on(`rooms/${session.roomId}`, onRoomUpdate);

  // Setup presence
  setupPresence(session.roomId, session.id);

  // Host: handle settings
  checkHostControls();

  // Chat
  initChat();

  // Ready button
  document.getElementById('btn-ready').addEventListener('click', toggleReady);

  // Start game
  document.getElementById('btn-start').addEventListener('click', startGame);

  initSoundButton();
  initLobbyV2Chrome();
  initLobbyTabs();

  setTimeout(hideLoading, 1000);
}

// ── Room updates ───────────────────────────────────────────────────────────────
function onRoomUpdate(data) {
  if (!data) return;
  roomData = data;

  // Redirect if game started
  if (data.status === 'playing') {
    window.location.href = 'game.html';
    return;
  }

  const me = data.players?.[session.id];
  if (!me) return;
  if (getPlayerStatus(me) === 'kicked') {
    showToast('تم طردك من الغرفة', 'error', 6000);
    Session.clear();
    setTimeout(() => window.location.href = 'index.html', 1200);
    return;
  }

  renderPlayers(data.players || {});
  renderPlayerSeats(data.players || {});
  renderEnabledExtraRoles(data.settings?.enabledExtraRoles || {});
  updateLobbyV2RoomChrome(data);
  updateStartButton(data);
  updateReadyButton(me.ready);
  syncLobbyV2MobileStart(!!me.isHost);
  syncVisualModeButtons(data.settings?.visualMode || 'clear');

  const isHost = !!me.isHost;
  setHostControlsState(isHost);
  document.getElementById('btn-start').style.display = isHost ? '' : 'none';
  document.getElementById('btn-ready').style.display = isHost ? 'none' : '';
  const mobStartBar = document.getElementById('lv2-mob-start-bar');
  if (mobStartBar) mobStartBar.style.display = isHost ? 'block' : 'none';

  // Host settings display
  if (data.settings) {
    document.getElementById('s-maxPlayers').value = data.settings.maxPlayers || 10;
    document.getElementById('s-nightTime').value = data.settings.nightTime || 60;
    document.getElementById('s-dayTime').value = data.settings.dayTime || 120;
    document.getElementById('s-discussTime').value = data.settings.discussionTime || 90;
    document.getElementById('s-votingTime').value = data.settings.votingTime || 45;
    document.getElementById('s-defenseTime').value = data.settings.defenseTime || 30;
    syncVisualModeButtons(data.settings.visualMode || 'clear');

    // Special role toggles
    const enabled = data.settings.enabledSpecialRoles || [];
    document.querySelectorAll('.sr-toggle').forEach(cb => {
      cb.checked = enabled.includes(cb.dataset.role);
    });
    syncCursedDetectiveSetting(data.settings, enabled, !!me.isHost);

    const enabledExtra = data.settings.enabledExtraRoles || {};
    document.querySelectorAll('.er-toggle').forEach(cb => {
      cb.checked = !!enabledExtra[cb.dataset.role];
      cb.disabled = !me.isHost;
    });
  }
}

// ── Player list (sidebar) ─────────────────────────────────────────────────────
function renderPlayers(players) {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  const viewer = roomData?.players?.[session.id];
  const viewerIsHost = !!viewer?.isHost;
  const activePlayers = Object.values(players).sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99));
  const maxPlayers = Math.max(activePlayers.length, roomData?.settings?.maxPlayers || 10);

  activePlayers.forEach(p => {
    const status = getPlayerStatus(p);
    const inactive = !isPlayerActive(p);
    const totalWins = getPlayerStatValue(p, ['wins', 'totalWins', 'points']);
    const mafiaWins = getPlayerStatValue(p, ['mafiaWins', 'mafia_wins']);
    const citizenWins = getPlayerStatValue(p, ['citizenWins', 'citizensWins', 'citizen_wins']);
    const statChips = renderLobbyStatChips(totalWins, mafiaWins, citizenWins);
    const canKick = viewerIsHost && p.id !== session.id && !p.isHost && status !== 'kicked' && status !== 'left';
    const div = document.createElement('div');
    div.className = `player-list-item player-status-${status}`;
    div.innerHTML = `
      <span class="player-list-icon">${getCosmeticMiniCardHtml(p)}</span>
      <span class="player-list-name">${escapeHtml(p.name)}${p.id === session.id ? ' (أنت)' : ''}</span>
      <span class="player-list-stats" aria-label="إحصائيات اللاعب">${statChips}</span>
      ${inactive
        ? `<span class="player-list-badge badge-waiting">${status === 'kicked' ? 'مطرود' : 'غادر'}</span>`
        : p.isHost
        ? `<span class="player-list-badge badge-host">👑 مضيف</span>`
        : p.ready
          ? `<span class="player-list-badge badge-ready">✓ جاهز</span>`
          : `<span class="player-list-badge badge-waiting">انتظار</span>`}
      ${canKick ? `<button class="lobby-kick-btn" data-pid="${escapeHtml(p.id)}" type="button">طرد</button>` : ''}
    `;
    list.appendChild(div);
    const kickBtn = div.querySelector('.lobby-kick-btn');
    if (kickBtn) {
      kickBtn.addEventListener('click', () => kickLobbyPlayer(kickBtn.dataset.pid));
    }
  });

  for (let i = activePlayers.length; i < maxPlayers; i++) {
    const slot = document.createElement('div');
    slot.className = 'lv2-empty-slot';
    slot.innerHTML = `
      <span class="lv2-empty-slot-icon">${i + 1}</span>
      <span>مقعد فارغ</span>
    `;
    list.appendChild(slot);
  }

  renderPlayerStats(players);
}

function getPlayerStatValue(player, keys, fallback = 0) {
  for (const key of keys) {
    if (typeof player?.[key] === 'number') return player[key];
  }
  return fallback;
}

function renderLobbyStatChips(totalWins = 0, mafiaWins = 0, citizenWins = 0) {
  return `
    <span class="player-stat-chip stat-total"><b>${totalWins}</b><small>الفوز</small></span>
    <span class="player-stat-chip stat-mafia"><b>${mafiaWins}</b><small>مافيا</small></span>
    <span class="player-stat-chip stat-citizens"><b>${citizenWins}</b><small>مواطن</small></span>
  `;
}

function renderPlayerStats(players = {}) {
  const list = document.getElementById('player-stats-list');
  if (!list) return;
  list.innerHTML = '';
  const activePlayers = Object.values(players)
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99))
    .slice(0, 10);

  activePlayers.forEach((player, index) => {
    const totalWins = getPlayerStatValue(player, ['wins', 'totalWins', 'points']);
    const mafiaWins = getPlayerStatValue(player, ['mafiaWins', 'mafia_wins']);
    const citizenWins = getPlayerStatValue(player, ['citizenWins', 'citizensWins', 'citizen_wins']);
    const row = document.createElement('div');
    row.className = 'handoff-stat-row';
    row.innerHTML = `
      <span class="handoff-stat-avatar">${getCosmeticMiniCardHtml(player)}</span>
      <span class="handoff-stat-name">${index + 1}. ${escapeHtml(player.name)}${player.id === session.id ? ' (أنت)' : ''}</span>
      <span class="handoff-stat-chip stat-total"><b>${totalWins}</b><small>الفوز</small></span>
      <span class="handoff-stat-chip stat-mafia"><b>${mafiaWins}</b><small>مافيا</small></span>
      <span class="handoff-stat-chip stat-citizens"><b>${citizenWins}</b><small>مواطن</small></span>
    `;
    list.appendChild(row);
  });

  for (let i = activePlayers.length; i < 10; i++) {
    const row = document.createElement('div');
    row.className = 'handoff-stat-row is-empty';
    row.innerHTML = `
      <span class="handoff-stat-avatar"></span>
      <span class="handoff-stat-name">${i + 1}. مقعد فارغ</span>
      <span class="handoff-stat-chip stat-total"><b>0</b><small>الفوز</small></span>
      <span class="handoff-stat-chip stat-mafia"><b>0</b><small>مافيا</small></span>
      <span class="handoff-stat-chip stat-citizens"><b>0</b><small>مواطن</small></span>
    `;
    list.appendChild(row);
  }
}

async function kickLobbyPlayer(playerId) {
  if (!roomData || !playerId) return;
  const me = roomData.players?.[session.id];
  const target = roomData.players?.[playerId];
  if (!me?.isHost || !target || playerId === session.id || target.isHost) return;
  const status = getPlayerStatus(target);
  if (status === 'kicked' || status === 'left') return;

  await DB.update(`rooms/${session.roomId}/players/${playerId}`, {
    status: 'kicked',
    kicked: true,
    alive: false,
    ready: false,
  });
}

// ── Player seats around table ─────────────────────────────────────────────────
function renderPlayerSeats(players) {
  const container = document.getElementById('players-around-table');
  container.innerHTML = '';
  const pArr = Object.values(players);
  const count = pArr.length;
  if (count === 0) return;

  const positions = getSeatPositions(count);

  pArr.forEach((p, i) => {
    const pos = positions[i];
    const status = getPlayerStatus(p);
    const inactive = !isPlayerActive(p);
    const seat = document.createElement('div');
    seat.className = `player-seat player-status-${status}${p.ready || p.isHost ? ' ready' : ''}${p.isHost ? ' host' : ''}`;
    seat.style.left = pos.x + '%';
    seat.style.top = pos.y + '%';
    seat.innerHTML = `
      <div class="player-seat-icon">${getCosmeticSeatCardHtml(p)}</div>
      <div class="player-seat-name">${escapeHtml(p.name)}${p.isHost ? ' 👑' : ''}</div>
      <div class="player-seat-status">${inactive ? (status === 'kicked' ? 'مطرود' : 'غادر') : p.ready || p.isHost ? '✓ جاهز' : 'ينتظر...'}</div>
    `;
    container.appendChild(seat);
  });
}

function renderEnabledExtraRoles(enabledExtraRoles = {}) {
  const list = document.getElementById('enabled-extra-roles-list');
  if (!list) return;
  const enabledIds = getEnabledExtraRoleIds(enabledExtraRoles);
  if (enabledIds.length === 0) {
    list.textContent = 'لا يوجد';
    return;
  }
  list.innerHTML = enabledIds.map(roleId => {
    const role = RoleEngine.getRole(roleId);
    const image = getRoleThumbImage(roleId) || role.image;
    return `<span class="enabled-extra-role-chip"><img src="${image}" alt="" width="36" height="50" loading="lazy" decoding="async">${RoleEngine.getRoleArabicName(roleId)}</span>`;
  }).join('');
}

// ── Ready button ───────────────────────────────────────────────────────────────
async function toggleReady() {
  const me = roomData?.players?.[session.id];
  if (!me || !isPlayerActive(me)) return;
  const newReady = !me.ready;
  await DB.update(`rooms/${session.roomId}/players/${session.id}`, { ready: newReady });
}

function updateReadyButton(ready) {
  const btn = document.getElementById('btn-ready');
  if (!btn) return;
  if (ready) {
    btn.textContent = '✓ جاهز — انقر للإلغاء';
    btn.className = 'btn btn-success btn-full';
  } else {
    btn.textContent = '⚡ أنا جاهز!';
    btn.className = 'btn btn-primary btn-full';
  }
}

// ── Start button ───────────────────────────────────────────────────────────────
function updateStartButton(data) {
  const btn = document.getElementById('btn-start');
  if (!btn) return;
  const me = data.players?.[session.id];
  if (!me?.isHost) {
    btn.style.display = 'none';
    syncLobbyV2MobileStart(false);
    return;
  }
  btn.style.display = '';

  const players = Object.values(data.players || {}).filter(p => isPlayerActive(p));
  const count = players.length;
  const minPlayers = 4;
  const maxPlayers = data.settings?.maxPlayers || 10;
  const allReady = players.filter(p => !p.isHost).every(p => p.ready);
  const enoughPlayers = count >= minPlayers && count <= maxPlayers;

  btn.disabled = !allReady || !enoughPlayers;

  if (count < minPlayers) {
    btn.textContent = `⏳ يلزم ${minPlayers} لاعبين على الأقل (${count}/${minPlayers})`;
  } else if (!allReady) {
    btn.textContent = `⏳ انتظر جاهزية الجميع`;
  } else {
    btn.textContent = `🌑 ابدأ اللعبة (${count} لاعبين)`;
  }
}

// ── Host settings ──────────────────────────────────────────────────────────────
function initLobbyTabs() {
  if (lobbyTabsBound) return;
  lobbyTabsBound = true;
  document.querySelectorAll('[data-lobby-tab]').forEach(btn => {
    btn.addEventListener('click', () => setActiveLobbyTab(btn.dataset.lobbyTab || 'lobby'));
  });
  document.getElementById('btn-leave-more')?.addEventListener('click', leaveRoom);
  setActiveLobbyTab('lobby');
}

function setActiveLobbyTab(tabName = 'lobby') {
  const activeTab = ['lobby', 'settings', 'players', 'more'].includes(tabName) ? tabName : 'lobby';
  const page = document.getElementById('lobby-page');
  if (page) page.dataset.activeTab = activeTab;
  document.querySelectorAll('[data-lobby-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lobbyTab === activeTab);
  });
  document.querySelectorAll('[data-lobby-panel]').forEach(panel => {
    panel.classList.toggle('handoff-tab-panel-active', panel.dataset.lobbyPanel === activeTab);
  });
}

function setHostControlsState(isHost) {
  const settings = document.getElementById('host-settings');
  if (!settings) return;
  settings.classList.toggle('handoff-settings-locked', !isHost);
  const lock = document.getElementById('settings-host-lock');
  if (lock) lock.hidden = isHost;
  settings.querySelectorAll('input, button').forEach(control => {
    if (control.closest('.visual-mode-btns')) return;
    control.disabled = !isHost;
  });
}

function initLobbyV2Chrome() {
  if (lobbyV2ChromeBound) return;
  lobbyV2ChromeBound = true;

  const savedMode = localStorage.getItem(LOBBY_THEME_KEY) === 'dark' ? 'dark' : 'clear';
  syncVisualModeButtons(savedMode);

  document.getElementById('lv2-theme-toggle')?.addEventListener('click', async () => {
    const nextMode = document.body.dataset.visualMode === 'clear' ? 'dark' : 'clear';
    syncVisualModeButtons(nextMode);
    const me = roomData?.players?.[session?.id];
    if (me?.isHost) {
      await DB.update(`rooms/${session.roomId}/settings`, { visualMode: nextMode });
    }
  });

  document.getElementById('lv2-invite-btn')?.addEventListener('click', () => {
    const code = document.getElementById('room-code-display')?.textContent?.trim();
    if (!code || code === '-----') return;
    const text = `انضم إلي في لعبة Nightmares! كود الغرفة: ${code}`;
    if (navigator.share) {
      navigator.share({ title: 'Nightmares', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('تم نسخ رابط الدعوة', 'success'));
    } else {
      showToast(text, 'info', 6000);
    }
  });

  document.getElementById('btn-start-mobile')?.addEventListener('click', () => {
    document.getElementById('btn-start')?.click();
  });
}

function applyLobbyV2Theme(mode = 'clear') {
  const visualMode = mode === 'clear' ? 'clear' : 'dark';
  const isDark = visualMode !== 'clear';
  document.body.classList.toggle('lv2-dark', isDark);
  document.body.classList.toggle('lv2-light', !isDark);
  document.body.dataset.visualMode = visualMode;
  localStorage.setItem(LOBBY_THEME_KEY, visualMode);
  const icon = document.querySelector('.lv2-theme-icon');
  if (icon) icon.textContent = isDark ? '🌙' : '☀️';
}

function updateLobbyV2RoomChrome(data = {}) {
  const players = data.players || {};
  const host = Object.values(players).find(p => p.isHost);
  const hostName = document.getElementById('lv2-host-name');
  if (hostName) hostName.textContent = host ? host.name : '—';

  const activeCount = Object.values(players).filter(p => isPlayerActive(p)).length;
  const playerCount = document.getElementById('lv2-player-count');
  if (playerCount) playerCount.textContent = `${activeCount} / ${data.settings?.maxPlayers || 10}`;
}

function syncLobbyV2MobileStart(hostVisible) {
  const desktopStart = document.getElementById('btn-start');
  const mobileBar = document.getElementById('lv2-mob-start-bar');
  const mobileStart = document.getElementById('btn-start-mobile');
  if (!mobileBar || !mobileStart || !desktopStart) return;
  mobileBar.style.display = hostVisible ? 'block' : 'none';
  mobileStart.disabled = desktopStart.disabled;
  mobileStart.textContent = desktopStart.textContent || 'ابدأ اللعبة';
}

function syncCursedDetectiveSetting(settings = {}, enabledSpecialRoles = [], hostEnabled = false) {
  const control = document.getElementById('s-cursed-hidden-detective');
  if (!control) return;
  const cursedEnabled = enabledSpecialRoles.includes('cursed');
  control.checked = cursedEnabled && settings.cursedHiddenFromDetective === true;
  control.disabled = !hostEnabled || !cursedEnabled;
}

function checkHostControls() {
  // Real-time settings update
  const settingInputs = ['s-maxPlayers','s-nightTime','s-dayTime','s-discussTime','s-votingTime','s-defenseTime'];
  settingInputs.forEach(id => {
    const input = document.getElementById(id);
    input?.addEventListener('change', pushSettings);
    input?.addEventListener('input', schedulePushSettings);
  });
  bindVisualModeControls();

  document.querySelectorAll('.sr-toggle').forEach(cb => {
    cb.addEventListener('change', pushSettings);
  });
  document.querySelectorAll('.er-toggle').forEach(cb => {
    cb.addEventListener('change', pushSettings);
  });
  document.getElementById('s-cursed-hidden-detective')?.addEventListener('change', pushSettings);

  document.getElementById('btn-enable-all')?.addEventListener('click', () => {
    document.querySelectorAll('.sr-toggle').forEach(cb => cb.checked = true);
    pushSettings();
  });

  document.getElementById('btn-disable-all')?.addEventListener('click', () => {
    document.querySelectorAll('.sr-toggle').forEach(cb => cb.checked = false);
    pushSettings();
  });
}

function getSelectedVisualMode() {
  return document.querySelector('.vm-btn.active')?.dataset.mode === 'clear' ? 'clear' : 'dark';
}

function syncVisualModeButtons(mode = 'clear') {
  const visualMode = mode === 'clear' ? 'clear' : 'dark';
  document.body.dataset.visualMode = visualMode;
  applyLobbyV2Theme(visualMode);
  document.querySelectorAll('.vm-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === visualMode);
  });
}

function bindVisualModeControls() {
  if (visualModeControlsBound) return;
  visualModeControlsBound = true;
  document.querySelectorAll('.vm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      syncVisualModeButtons(btn.dataset.mode);
      pushSettings();
    });
  });
}

function schedulePushSettings() {
  clearTimeout(settingsPushTimer);
  settingsPushTimer = setTimeout(pushSettings, 350);
}

async function pushSettings() {
  if (!roomData) return;
  const me = roomData.players?.[session.id];
  if (!me?.isHost) return;

  const enabledSpecialRoles = [];
  document.querySelectorAll('.sr-toggle').forEach(cb => {
    if (cb.checked) enabledSpecialRoles.push(cb.dataset.role);
  });

  const sanitized = RoleEngine.sanitizeSpecialRoles(enabledSpecialRoles);
  if (sanitized.warnings.length) {
    showToast(sanitized.warnings[0], 'info', 5000);
    document.querySelectorAll('.sr-toggle').forEach(cb => {
      cb.checked = sanitized.roles.includes(cb.dataset.role);
    });
  }

  const enabledExtraRoleIds = [];
  document.querySelectorAll('.er-toggle').forEach(cb => {
    if (cb.checked) enabledExtraRoleIds.push(cb.dataset.role);
  });
  const cursedHiddenFromDetective = sanitized.roles.includes('cursed')
    && document.getElementById('s-cursed-hidden-detective')?.checked === true;
  syncCursedDetectiveSetting({ cursedHiddenFromDetective }, sanitized.roles, true);

  await DB.update(`rooms/${session.roomId}/settings`, {
    maxPlayers: parseInt(document.getElementById('s-maxPlayers').value) || 10,
    nightTime: parseInt(document.getElementById('s-nightTime').value) || 60,
    dayTime: parseInt(document.getElementById('s-dayTime').value) || 120,
    discussionTime: parseInt(document.getElementById('s-discussTime').value) || 90,
    votingTime: parseInt(document.getElementById('s-votingTime').value) || 45,
    defenseTime: parseInt(document.getElementById('s-defenseTime').value) || 30,
    visualMode: getSelectedVisualMode(),
    enabledSpecialRoles: sanitized.roles,
    enabledExtraRoles: getEnabledExtraRoleMap(enabledExtraRoleIds),
    cursedHiddenFromDetective,
  });
}

// ── Start Game ─────────────────────────────────────────────────────────────────
function selectLiarFakeRole() {
  const options = typeof LIAR_FAKE_ROLES !== 'undefined' ? LIAR_FAKE_ROLES : ['citizen', 'doctor', 'detective'];
  return options[Math.floor(Math.random() * options.length)];
}

function shuffleArrayCopy(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDistributionWithExtraRoles(playerIds, enabledSpecials = [], enabledExtraRoles = []) {
  const oldSpecials = enabledSpecials.filter(roleId => !isNewExtraRole(roleId));
  const base = RoleEngine.buildDistribution(playerIds, oldSpecials);
  const roles = playerIds.map(pid => base.assignment[pid] || 'citizen');
  const count = playerIds.length;
  const errors = [];
  const warnings = [...(base.warnings || [])];

  enabledExtraRoles.forEach(roleId => {
    const role = RoleEngine.getRole(roleId);
    if (count < (role.minPlayers || 0)) {
      errors.push(`${role.arabicName} يحتاج ${role.minPlayers} لاعبين على الأقل.`);
    }
  });
  if (errors.length) return { error: errors.join(' '), warnings };

  const mafiaExtras = enabledExtraRoles.filter(roleId => RoleEngine.getTeam(roleId) === 'mafia');
  const citizenExtras = enabledExtraRoles.filter(roleId => RoleEngine.getTeam(roleId) === 'citizens');
  const normalMafiaSlots = roles.map((roleId, index) => roleId === 'mafia' ? index : -1).filter(index => index >= 0);
  const normalCitizenSlots = roles.map((roleId, index) => roleId === 'citizen' ? index : -1).filter(index => index >= 0);
  const selectedMafiaExtras = mafiaExtras.slice(0, normalMafiaSlots.length);
  const selectedCitizenExtras = citizenExtras.slice(0, normalCitizenSlots.length);
  const skippedExtras = [
    ...mafiaExtras.slice(selectedMafiaExtras.length),
    ...citizenExtras.slice(selectedCitizenExtras.length),
  ];

  if (false && mafiaExtras.length > normalMafiaSlots.length) {
    return {
      error: 'عدد أفراد المافيا لا يكفي للأدوار المفعلة. عطّل بعض أدوار المافيا الخاصة أو زد عدد اللاعبين.',
      warnings: base.warnings || [],
    };
  }
  if (false && citizenExtras.length > normalCitizenSlots.length) {
    return {
      error: 'عدد المواطنين لا يكفي للأدوار الخاصة المفعلة. عطّل بعض الأدوار أو زد عدد اللاعبين.',
      warnings: base.warnings || [],
    };
  }

  skippedExtras.forEach(roleId => {
    warnings.push(`تم تخطي ${RoleEngine.getRoleArabicName(roleId)} لعدم توفر خانة مناسبة مع عدد اللاعبين الحالي.`);
  });

  shuffleArrayCopy(normalMafiaSlots).slice(0, selectedMafiaExtras.length).forEach((slotIndex, i) => {
    roles[slotIndex] = selectedMafiaExtras[i];
  });
  shuffleArrayCopy(normalCitizenSlots).slice(0, selectedCitizenExtras.length).forEach((slotIndex, i) => {
    roles[slotIndex] = selectedCitizenExtras[i];
  });

  const assignment = {};
  playerIds.forEach((pid, index) => {
    assignment[pid] = roles[index] || 'citizen';
  });

  return {
    assignment,
    roles,
    warnings,
    selectedSpecialRoles: base.selectedSpecialRoles || oldSpecials,
    selectedExtraRoles: enabledExtraRoles.filter(roleId => (
      selectedMafiaExtras.includes(roleId) || selectedCitizenExtras.includes(roleId)
    )),
  };
}

async function startGame() {
  if (!roomData) return;
  const me = roomData.players?.[session.id];
  if (!me?.isHost) return;

  const players = Object.values(roomData.players || {}).filter(p => isPlayerActive(p));
  if (players.length < 4) { showToast('يلزم 4 لاعبين على الأقل', 'error'); return; }

  const playerIds = players.map(p => p.id);
  const enabledSpecials = roomData.settings?.enabledSpecialRoles || [];
  const enabledExtraRoles = getEnabledExtraRoleIds(roomData.settings?.enabledExtraRoles || {});

  // Distribute roles
  const distribution = buildDistributionWithExtraRoles(playerIds, enabledSpecials, enabledExtraRoles);
  if (distribution.error) {
    showToast(distribution.error, 'error', 8000);
    return;
  }
  const roleAssignment = distribution.assignment;
  if (distribution.warnings.length) {
    showToast(distribution.warnings.join(' '), 'info', 6000);
  }

  // Build players update with roles
  const updates = {};
  players.forEach(p => {
    const roleId = roleAssignment[p.id];
    const role = RoleEngine.getRole(roleId);
    updates[`rooms/${session.roomId}/players/${p.id}/role`] = roleId;
    updates[`rooms/${session.roomId}/players/${p.id}/team`] = role.team;
    updates[`rooms/${session.roomId}/players/${p.id}/fakeRole`] = roleId === 'liar' ? selectLiarFakeRole() : null;
    updates[`rooms/${session.roomId}/players/${p.id}/alive`] = true;
    updates[`rooms/${session.roomId}/players/${p.id}/status`] = 'active';
    updates[`rooms/${session.roomId}/players/${p.id}/online`] = true;
    updates[`rooms/${session.roomId}/players/${p.id}/usedAbilities`] = {};
    updates[`rooms/${session.roomId}/players/${p.id}/privateReveals`] = null;
    updates[`rooms/${session.roomId}/players/${p.id}/isMafiaLeader`] = false;
    updates[`rooms/${session.roomId}/players/${p.id}/judgeRevivedAbilityUnlocked`] = false;
  });

  // Identify mafia leader: Cursed first, otherwise the first assigned mafia.
  const mafiaPlayers = players.filter(p => RoleEngine.getTeam(roleAssignment[p.id]) === 'mafia');
  const mafiaLeader = mafiaPlayers.find(p => roleAssignment[p.id] === 'cursed') || mafiaPlayers[0];
  if (mafiaLeader) {
    updates[`rooms/${session.roomId}/players/${mafiaLeader.id}/isMafiaLeader`] = true;
  }

  if (distribution.warnings.length) {
    const warnKey = DB.generateId();
    updates[`rooms/${session.roomId}/game/chat/${warnKey}`] = {
      playerId: 'system',
      name: 'النظام',
      icon: 'owl',
      text: distribution.warnings.join(' '),
      ts: DB.timestamp(),
      type: 'system',
    };
  }

  const gameStartedAt = Date.now();
  const nightDuration = (roomData.settings?.nightTime || 60) * 1000;

  updates[`rooms/${session.roomId}/settings/enabledSpecialRoles`] = distribution.selectedSpecialRoles;
  updates[`rooms/${session.roomId}/settings/enabledExtraRoles`] = getEnabledExtraRoleMap(distribution.selectedExtraRoles || []);
  updates[`rooms/${session.roomId}/settings/roleWarnings`] = distribution.warnings;
  updates[`rooms/${session.roomId}/status`] = 'playing';
  updates[`rooms/${session.roomId}/game/phase`] = 'night';
  updates[`rooms/${session.roomId}/game/round`] = 1;
  updates[`rooms/${session.roomId}/game/startedAt`] = gameStartedAt;
  updates[`rooms/${session.roomId}/game/timerEndsAt`] = gameStartedAt + nightDuration;
  updates[`rooms/${session.roomId}/game/nightActions`] = {};
  updates[`rooms/${session.roomId}/game/votes`] = {};
  updates[`rooms/${session.roomId}/game/founderActive`] = false;
  updates[`rooms/${session.roomId}/game/founderVote`] = null;
  updates[`rooms/${session.roomId}/game/winner`] = null;
  updates[`rooms/${session.roomId}/game/pointsAwarded`] = false;
  updates[`rooms/${session.roomId}/game/deathLog`] = {};
  updates[`rooms/${session.roomId}/game/revealedRoles`] = {};
  updates[`rooms/${session.roomId}/game/publicRevealedRoles`] = {};
  updates[`rooms/${session.roomId}/game/poisoned`] = {};
  updates[`rooms/${session.roomId}/game/infections`] = {};
  updates[`rooms/${session.roomId}/game/victimRevives`] = {};
  updates[`rooms/${session.roomId}/game/mafiaSharedReveals`] = {};
  updates[`rooms/${session.roomId}/game/chemistRevives`] = {};
  updates[`rooms/${session.roomId}/game/chemistShieldRound`] = null;
  updates[`rooms/${session.roomId}/game/chemistShieldBy`] = null;
  updates[`rooms/${session.roomId}/game/blackWizardDisabledRound`] = null;
  updates[`rooms/${session.roomId}/game/blackWizardDisabledBy`] = null;

  await db.ref().update(updates);
}

// ── Chat ───────────────────────────────────────────────────────────────────────
function initChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  sendBtn.addEventListener('click', sendChat);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

  DB.on(`rooms/${session.roomId}/game/chat`, (chatData) => {
    renderChat(chatData || {});
  });
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || text.length > 200) return;
  input.value = '';

  const me = roomData?.players?.[session.id];
  if (!me || !isPlayerActive(me)) return;

  await DB.push(`rooms/${session.roomId}/game/chat`, {
    playerId: session.id,
    name: me.name,
    icon: me.icon,
    text,
    ts: DB.timestamp(),
    type: 'public',
  });
}

function renderChat(chatData) {
  const container = document.getElementById('chat-messages');
  const msgs = Object.values(chatData).sort((a,b) => (a.ts||0)-(b.ts||0));
  container.innerHTML = '';
  msgs.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `
      <span class="icon">${getPlayerPortraitHtml(msg.icon, msg.name, 'chat-portrait')}</span>
      <span class="name">${escapeHtml(msg.name)}:</span>
      <span class="text">${escapeHtml(msg.text)}</span>
    `;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

// ── Leave room ─────────────────────────────────────────────────────────────────
document.getElementById?.('btn-leave')?.addEventListener?.('click', leaveRoom);

async function leaveRoom() {
  if (!session.id) return;
  if (roomData?.players?.[session.id]?.isHost) {
    // Transfer host or delete
    const others = Object.values(roomData.players || {}).filter(p => p.id !== session.id && isPlayerActive(p));
    if (others.length > 0) {
      await DB.update(`rooms/${session.roomId}`, { hostId: others[0].id });
      await DB.update(`rooms/${session.roomId}/players/${others[0].id}`, { isHost: true });
    }
  }
  await DB.update(`rooms/${session.roomId}/players/${session.id}`, {
    status: 'left',
    left: true,
    online: false,
    connected: false,
    ready: false,
    isHost: false,
    lastSeen: DB.timestamp()
  });
  Session.clear();
  window.location.href = 'index.html';
}

// ── Escape HTML ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Boot ───────────────────────────────────────────────────────────────────────
initLobby();
