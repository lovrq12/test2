// ===== NIGHTMARES — LOBBY JS =====

let session = null;
let roomData = null;
let unsubRoom = null;
let visualModeControlsBound = false;

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

  Effects.init();
  addFog();
  initSoundButton();
  initNewRolesUpdateModal();
  Effects.startMeteors();

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
  updateStartButton(data);
  updateReadyButton(me.ready);
  syncVisualModeButtons(data.settings?.visualMode || 'dark');

  if (me.isHost) {
    document.getElementById('host-settings').style.display = '';
    document.getElementById('btn-start').style.display = '';
    document.getElementById('btn-ready').style.display = 'none';
    // V2: also show mobile settings panel
    const mobSettings = document.getElementById('lv2-mobile-settings');
    const mobStartBar = document.getElementById('lv2-mob-start-bar');
    if (mobSettings) mobSettings.style.display = 'block';
    if (mobStartBar) mobStartBar.style.display = 'block';
  }

  // Host settings display
  if (data.settings) {
    document.getElementById('s-maxPlayers').value = data.settings.maxPlayers || 6;
    document.getElementById('s-nightTime').value = data.settings.nightTime || 60;
    document.getElementById('s-dayTime').value = data.settings.dayTime || 120;
    document.getElementById('s-discussTime').value = data.settings.discussionTime || 90;
    document.getElementById('s-votingTime').value = data.settings.votingTime || 45;
    document.getElementById('s-defenseTime').value = data.settings.defenseTime || 30;
    syncVisualModeButtons(data.settings.visualMode || 'dark');

    // Special role toggles
    const enabled = data.settings.enabledSpecialRoles || [];
    document.querySelectorAll('.sr-toggle').forEach(cb => {
      cb.checked = enabled.includes(cb.dataset.role);
    });

    const enabledExtra = data.settings.enabledExtraRoles || {};
    document.querySelectorAll('.er-toggle').forEach(cb => {
      cb.checked = !!enabledExtra[cb.dataset.role];
      cb.disabled = !me.isHost;
    });
  }
}

// ── Player list (sidebar) ─────────────────────────────────────────────────────
function initNewRolesUpdateModal() {
  const key = 'nightmares_new_roles_update_seen_v2';
  const modal = document.getElementById('new-roles-update-modal');
  if (!modal || localStorage.getItem(key) === '1') return;
  const close = () => {
    localStorage.setItem(key, '1');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  };
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('new-roles-update-close')?.addEventListener('click', close);
  document.getElementById('new-roles-update-ok')?.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
}

function renderPlayers(players) {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  const viewer = roomData?.players?.[session.id];
  const viewerIsHost = !!viewer?.isHost;
  Object.values(players).forEach(p => {
    const status = getPlayerStatus(p);
    const inactive = !isPlayerActive(p);
    const points = typeof p.points === 'number' ? p.points : 0;
    const pointsBadge = `<span class="player-points-badge">⭐ ${points}</span>`;
    const canKick = viewerIsHost && p.id !== session.id && !p.isHost && status !== 'kicked' && status !== 'left';
    const div = document.createElement('div');
    div.className = `player-list-item player-status-${status}`;
    div.innerHTML = `
      <span class="player-list-icon">${getPlayerPortraitHtml(p.icon, p.name, 'player-portrait-mini')}</span>
      <span class="player-list-name">${escapeHtml(p.name)}${p.id === session.id ? ' (أنت)' : ''} ${pointsBadge}</span>
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
      <div class="player-seat-icon">${getPlayerPortraitHtml(p.icon, p.name, 'player-seat-portrait')}</div>
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
    return `<span class="enabled-extra-role-chip"><img src="${role.image}" alt="" loading="lazy" decoding="async">${RoleEngine.getRoleArabicName(roleId)}</span>`;
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
  if (!me?.isHost) { btn.style.display = 'none'; return; }
  btn.style.display = '';

  const players = Object.values(data.players || {}).filter(p => isPlayerActive(p));
  const count = players.length;
  const minPlayers = 4;
  const maxPlayers = data.settings?.maxPlayers || 12;
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
function checkHostControls() {
  // Real-time settings update
  const settingInputs = ['s-maxPlayers','s-nightTime','s-dayTime','s-discussTime','s-votingTime','s-defenseTime'];
  settingInputs.forEach(id => {
    document.getElementById(id)?.addEventListener('change', pushSettings);
  });
  bindVisualModeControls();

  document.querySelectorAll('.sr-toggle').forEach(cb => {
    cb.addEventListener('change', pushSettings);
  });
  document.querySelectorAll('.er-toggle').forEach(cb => {
    cb.addEventListener('change', pushSettings);
  });

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

function syncVisualModeButtons(mode = 'dark') {
  const visualMode = mode === 'clear' ? 'clear' : 'dark';
  document.body.dataset.visualMode = visualMode;
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

  await DB.update(`rooms/${session.roomId}/settings`, {
    maxPlayers: parseInt(document.getElementById('s-maxPlayers').value) || 6,
    nightTime: parseInt(document.getElementById('s-nightTime').value) || 60,
    dayTime: parseInt(document.getElementById('s-dayTime').value) || 120,
    discussionTime: parseInt(document.getElementById('s-discussTime').value) || 90,
    votingTime: parseInt(document.getElementById('s-votingTime').value) || 45,
    defenseTime: parseInt(document.getElementById('s-defenseTime').value) || 30,
    visualMode: getSelectedVisualMode(),
    enabledSpecialRoles: sanitized.roles,
    enabledExtraRoles: getEnabledExtraRoleMap(enabledExtraRoleIds),
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

  enabledExtraRoles.forEach(roleId => {
    const role = RoleEngine.getRole(roleId);
    if (count < (role.minPlayers || 0)) {
      errors.push(`${role.arabicName} يحتاج ${role.minPlayers} لاعبين على الأقل.`);
    }
  });
  if (errors.length) return { error: errors.join(' '), warnings: base.warnings || [] };

  const mafiaExtras = enabledExtraRoles.filter(roleId => RoleEngine.getTeam(roleId) === 'mafia');
  const citizenExtras = enabledExtraRoles.filter(roleId => RoleEngine.getTeam(roleId) === 'citizens');
  const normalMafiaSlots = roles.map((roleId, index) => roleId === 'mafia' ? index : -1).filter(index => index >= 0);
  const normalCitizenSlots = roles.map((roleId, index) => roleId === 'citizen' ? index : -1).filter(index => index >= 0);

  if (mafiaExtras.length > normalMafiaSlots.length) {
    return {
      error: 'عدد أفراد المافيا لا يكفي للأدوار المفعلة. عطّل بعض أدوار المافيا الخاصة أو زد عدد اللاعبين.',
      warnings: base.warnings || [],
    };
  }
  if (citizenExtras.length > normalCitizenSlots.length) {
    return {
      error: 'عدد المواطنين لا يكفي للأدوار الخاصة المفعلة. عطّل بعض الأدوار أو زد عدد اللاعبين.',
      warnings: base.warnings || [],
    };
  }

  shuffleArrayCopy(normalMafiaSlots).slice(0, mafiaExtras.length).forEach((slotIndex, i) => {
    roles[slotIndex] = mafiaExtras[i];
  });
  shuffleArrayCopy(normalCitizenSlots).slice(0, citizenExtras.length).forEach((slotIndex, i) => {
    roles[slotIndex] = citizenExtras[i];
  });

  const assignment = {};
  playerIds.forEach((pid, index) => {
    assignment[pid] = roles[index] || 'citizen';
  });

  return {
    assignment,
    roles,
    warnings: base.warnings || [],
    selectedSpecialRoles: base.selectedSpecialRoles || oldSpecials,
    selectedExtraRoles: enabledExtraRoles,
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

  const nightDuration = (roomData.settings?.nightTime || 60) * 1000;

  updates[`rooms/${session.roomId}/settings/enabledSpecialRoles`] = distribution.selectedSpecialRoles;
  updates[`rooms/${session.roomId}/settings/enabledExtraRoles`] = getEnabledExtraRoleMap(distribution.selectedExtraRoles || []);
  updates[`rooms/${session.roomId}/settings/roleWarnings`] = distribution.warnings;
  updates[`rooms/${session.roomId}/status`] = 'playing';
  updates[`rooms/${session.roomId}/game/phase`] = 'night';
  updates[`rooms/${session.roomId}/game/round`] = 1;
  updates[`rooms/${session.roomId}/game/timerEndsAt`] = Date.now() + nightDuration;
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
