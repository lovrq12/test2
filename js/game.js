// ===== NIGHTMARES — GAME JS =====

let session = null;
let roomData = null;
let myRole = null;
let myRoleData = null;
let isHost = false;
let timerInterval = null;
let currentPhase = null;
let unsubRoom = null;
let roleCardShown = false;
let founderActive = false;
let phoenixDeadSeen = {};
let founderFreezeShownRound = null;
let lastSeenEventId = null;
let eventAnnouncementTimer = null;
let actionMenuBusy = false;
let whisperActionPending = false;
let activePoetRequestKey = null;
let lastTargetActivation = { id: null, ts: 0 };
let winPointsAwardPending = false;
let winScreenShown = false;
let currentMobileTab = 'table';
let latestPublicChatData = {};
let latestMafiaChatData = {};
let initialGameAssetsPromise = null;
let initialGameAssetsHidden = false;

const DAY_ABILITY_PHASES = ['morning', 'day', 'discussion', 'voting', 'defense'];
const TARGET_DAY_ABILITY_PHASES = ['discussion', 'voting', 'defense'];
const CURSED_GUESS_OPTIONS = [
  { id: 'doctor', label: 'طبيب' },
  { id: 'detective', label: 'محقق' },
  { id: 'hopebreaker', label: 'محطم الأمل' },
];
const CURSED_SUCCESS_ROLES = CURSED_GUESS_OPTIONS.map(option => option.id);
const EVENT_REPLAY_MAX_AGE_MS = 8000;
const EVENT_ANNOUNCEMENT_DURATION_MS = 3200;
const VOTE_RESULT_EVENT_TYPES = ['execution', 'skip', 'tie', 'no_votes'];
const GOVERNOR_REVIVE_UNLOCK_KEY = 'judgeRevivedAbilityUnlocked';
const GOVERNOR_REVIVED_REVEAL_USED_KEY = 'governor_revived_reveal_used';
const PHASE_ARABIC_NAMES = {
  night: 'الليل',
  morning: 'الصباح',
  day: 'الصباح',
  discussion: 'مرحلة النقاش',
  voting: 'التصويت',
  defense: 'التبرير النهائي',
};

function getPlayerLiarFakeRole(player = {}) {
  if (typeof normalizeLiarFakeRole === 'function') {
    return normalizeLiarFakeRole(player.fakeRole, player.id || player.name || '');
  }
  const options = ['citizen', 'doctor', 'detective'];
  return options.includes(player.fakeRole) ? player.fakeRole : 'citizen';
}

function getLiarDisplayCard(player = {}) {
  const fakeRole = getPlayerLiarFakeRole(player);
  return typeof getLiarCardImage === 'function'
    ? getLiarCardImage(fakeRole, player.id || player.name || '')
    : 'assets/cards/special/liar_fake_citizen.png';
}

function getWhisperVisibleRole(target = {}) {
  if (isRoleHiddenFromInvestigation(target)) return 'citizen';
  return target.role === 'liar' ? getPlayerLiarFakeRole(target) : target.role;
}

function isRoleHiddenFromInvestigation(target = {}) {
  return target?.role === 'cursed';
}

function getDetectiveInvestigationResult(target = {}) {
  if (!target) return '✓ ليس مافيا';
  if (target.role === 'liar') {
    return RoleEngine.getRoleArabicName(getPlayerLiarFakeRole(target));
  }
  if (isRoleHiddenFromInvestigation(target)) {
    return '✓ ليس مافيا';
  }
  return RoleEngine.isPlayerMafia(target) ? '⚔ مافيا' : '✓ ليس مافيا';
}

function isGovernorRevealUnlocked(player = {}) {
  return player?.role === 'governor' && !!player[GOVERNOR_REVIVE_UNLOCK_KEY];
}

function isGovernorRevivedRevealUsed(player = {}) {
  return !!player?.usedAbilities?.[GOVERNOR_REVIVED_REVEAL_USED_KEY];
}

function addGovernorReviveUnlockToUpdates(updates, playerId, player = {}) {
  if (player?.role !== 'governor') return;
  updates[`rooms/${session.roomId}/players/${playerId}/${GOVERNOR_REVIVE_UNLOCK_KEY}`] = true;
}

function canPhoenixSeeDeadRole(viewer = {}, target = {}) {
  return viewer?.role === 'phoenix'
    && !!target?.role
    && !target.alive
    && isPlayerActive(target);
}

function ensureInitialGameAssetsLoaded(game = {}, me = {}) {
  if (initialGameAssetsPromise) return initialGameAssetsPromise;
  const phase = game.phase || 'night';
  const isNight = phase === 'night';
  const activeTableBg = isNight
    ? 'assets/gameplay-ui/table_night_reference.png'
    : 'assets/gameplay-ui/table_day_reference.png';
  const legacyTableBg = isNight
    ? 'assets/backgrounds/night_table_bg.png'
    : 'assets/backgrounds/day_table_bg.png';
  const roleImage = getRoleDisplayData(me).image;
  initialGameAssetsPromise = preloadCriticalImages([
    activeTableBg,
    legacyTableBg,
    'assets/backgrounds/night_table_bg.png',
    'assets/backgrounds/day_table_bg.png',
    roleImage,
  ], 3000).finally(() => {
    if (!initialGameAssetsHidden) {
      initialGameAssetsHidden = true;
      hideLoading();
    }
  });
  return initialGameAssetsPromise;
}

function isDuplicateTargetActivation(targetPlayerId) {
  const now = Date.now();
  if (lastTargetActivation.id === targetPlayerId && now - lastTargetActivation.ts < 280) {
    return true;
  }
  lastTargetActivation = { id: targetPlayerId, ts: now };
  return false;
}

function bindTouchSafeAction(element, handler) {
  if (!element) return;
  element.__nightmaresTouchHandler = handler;
  if (element.__nightmaresTouchBound) return;
  element.__nightmaresTouchBound = true;
  let touchHandledAt = 0;
  element.addEventListener('pointerup', event => {
    if (element.__nightmaresOnlySelf && event.target !== element) return;
    if (event.pointerType === 'mouse') return;
    touchHandledAt = Date.now();
    event.preventDefault();
    event.stopPropagation();
    element.__nightmaresTouchHandler?.(event);
  }, { passive: false });
  element.addEventListener('click', event => {
    if (element.__nightmaresOnlySelf && event.target !== element) return;
    if (Date.now() - touchHandledAt < 420) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    element.__nightmaresTouchHandler?.(event);
  });
}

function isMobileGameplay() {
  return window.matchMedia?.('(max-width: 700px)').matches || window.innerWidth <= 700;
}

function getTablePlayerOrder(players, me) {
  const ordered = Object.values(players)
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  if (!isMobileGameplay() || !me) return ordered;
  const myIndex = ordered.findIndex(p => p.id === me.id);
  return myIndex <= 0 ? ordered : ordered.slice(myIndex).concat(ordered.slice(0, myIndex));
}

function getMobileTablePositions(count) {
  const templates = {
    1: [{ x: 50, y: 72 }],
    2: [{ x: 50, y: 74 }, { x: 50, y: 28 }],
    3: [{ x: 50, y: 76 }, { x: 22, y: 43 }, { x: 78, y: 43 }],
    4: [{ x: 50, y: 76 }, { x: 18, y: 55 }, { x: 50, y: 27 }, { x: 82, y: 55 }],
    5: [{ x: 50, y: 76 }, { x: 18, y: 61 }, { x: 24, y: 33 }, { x: 76, y: 33 }, { x: 82, y: 61 }],
    6: [{ x: 50, y: 76 }, { x: 18, y: 62 }, { x: 18, y: 40 }, { x: 50, y: 26 }, { x: 82, y: 40 }, { x: 82, y: 62 }],
    7: [{ x: 50, y: 76 }, { x: 20, y: 66 }, { x: 16, y: 45 }, { x: 34, y: 27 }, { x: 66, y: 27 }, { x: 84, y: 45 }, { x: 80, y: 66 }],
    8: [{ x: 50, y: 76 }, { x: 24, y: 67 }, { x: 15, y: 49 }, { x: 26, y: 30 }, { x: 50, y: 24 }, { x: 74, y: 30 }, { x: 85, y: 49 }, { x: 76, y: 67 }],
    9: [{ x: 50, y: 76 }, { x: 28, y: 68 }, { x: 15, y: 53 }, { x: 18, y: 34 }, { x: 39, y: 24 }, { x: 61, y: 24 }, { x: 82, y: 34 }, { x: 85, y: 53 }, { x: 72, y: 68 }],
    10: [{ x: 50, y: 76 }, { x: 30, y: 69 }, { x: 15, y: 56 }, { x: 16, y: 39 }, { x: 30, y: 27 }, { x: 50, y: 23 }, { x: 70, y: 27 }, { x: 84, y: 39 }, { x: 85, y: 56 }, { x: 70, y: 69 }],
  };
  if (templates[count]) return templates[count];
  return getSeatPositions(count, 50, 50, 38, 27).map(pos => ({
    x: Math.max(13, Math.min(87, pos.x)),
    y: Math.max(23, Math.min(76, pos.y)),
  }));
}

function applyVisualMode(mode = 'dark') {
  const visualMode = mode === 'clear' ? 'clear' : 'dark';
  document.body.dataset.visualMode = visualMode;
}

function setV2MobileTab(tab = 'table') {
  if (tab === 'chat') {
    showToast('الشات غير متاح حالياً', 'info', 2200);
    tab = currentMobileTab && currentMobileTab !== 'chat' ? currentMobileTab : 'table';
  }
  const allowed = ['table', 'role', 'players'];
  currentMobileTab = allowed.includes(tab) ? tab : 'table';
  document.body.dataset.mobileTab = currentMobileTab;
  document.querySelectorAll('.v2-nav-tab').forEach(btn => {
    const chatDisabled = btn.dataset.tab === 'chat';
    if (chatDisabled) {
      btn.classList.add('is-disabled');
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('aria-pressed', 'false');
      return;
    }
    const active = btn.dataset.tab === currentMobileTab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  const chatPanel = document.getElementById('v2-chat-panel');
  if (chatPanel) {
    chatPanel.hidden = true;
    chatPanel.setAttribute('aria-hidden', 'true');
  }
  if (currentMobileTab === 'players') {
    renderPlayersPanel(roomData?.players || {});
  }
}

function initV2MobileNav() {
  if (window.__v2MobileNavInitialized) return;
  window.__v2MobileNavInitialized = true;
  if (currentMobileTab === 'chat') currentMobileTab = 'table';
  document.body.dataset.mobileTab = currentMobileTab;
  document.querySelectorAll('.v2-nav-tab').forEach(btn => {
    if (btn.dataset.tab === 'chat') {
      btn.classList.add('is-disabled');
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('aria-pressed', 'false');
      return;
    }
    bindTouchSafeAction(btn, () => setV2MobileTab(btn.dataset.tab));
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function initGame() {
  session = Session.getPlayer();
  if (!session.id || !session.roomId) {
    showToast('انتهت جلستك', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return;
  }

  setupPresence(session.roomId, session.id);
  lastSeenEventId = sessionStorage.getItem(getEventSeenStorageKey());
  initSoundButton();
  initV2MobileNav();
  initChatTabs();
  initChatSend();

  unsubRoom = DB.on(`rooms/${session.roomId}`, onRoomUpdate);
  DB.on(`rooms/${session.roomId}/game/chat`, (chatData) => {
    latestPublicChatData = chatData || {};
    renderPublicChat(latestPublicChatData, latestMafiaChatData);
  });
  DB.on(`rooms/${session.roomId}/game/mafiaChat`, (chatData) => {
    latestMafiaChatData = chatData || {};
    renderPublicChat(latestPublicChatData, latestMafiaChatData);
  });

  setTimeout(() => {
    if (!initialGameAssetsHidden) {
      initialGameAssetsHidden = true;
      hideLoading();
    }
  }, 6000);
}

// ── Room update handler ────────────────────────────────────────────────────────
function onRoomUpdate(data) {
  if (!data) { window.location.href = 'index.html'; return; }
  roomData = data;

  const me = data.players?.[session.id];
  if (!me) return;
  const showedVoteResultEvent = handleGameEvent(data.game?.lastEvent);
  if (getPlayerStatus(me) === 'kicked') {
    showToast('تم طردك من الغرفة', 'error', 6000);
    Session.clear();
    setTimeout(() => window.location.href = 'index.html', 1200);
    return;
  }

  myRole = me.role;
  myRoleData = RoleEngine.getRole(myRole);
  isHost = !!me.isHost;
  if (me.role === 'liar' && !(typeof LIAR_FAKE_ROLES !== 'undefined' && LIAR_FAKE_ROLES.includes(me.fakeRole))) {
    DB.update(`rooms/${session.roomId}/players/${session.id}`, { fakeRole: getPlayerLiarFakeRole(me) });
  }

  const game = data.game || {};
  ensureInitialGameAssetsLoaded(game, me);
  const phase = game.phase;
  const players = data.players || {};
  applyVisualMode(data.settings?.visualMode || 'dark');
  updatePhaseHeader(phase, game, me);

  // Check winner
  if (game.winner) {
    awardWinPoints(game, players);
    showWinScreen(game.winner, players);
    return;
  }

  enforceHostWinnerIfNeeded();

  // Back to lobby
  if (data.status !== 'playing') { window.location.href = 'lobby.html'; return; }

  // First time: show role card
  if (!roleCardShown) { roleCardShown = true; showMyRoleCard(me); }

  // Phase change
  if (phase !== currentPhase) {
    handlePhaseChange(phase, game, me, players, { suppressCinematic: showedVoteResultEvent });
    currentPhase = phase;
  }

  // Update timer
  updateTimer(game.timerEndsAt);

  // Render players around table
  renderGameTable(players, game);
  renderPlayersPanel(players);
  updateTableSkipButton(game, me);
  renderBottomActionBar(game, me);

  renderRoleTab(me);
  updateChatTabs();
  updateChatAvailability(phase, me);
  renderPublicChat(latestPublicChatData, latestMafiaChatData);

  // Global one-shot reveals/notices
  checkFounderFreezeNotice(game);
  checkWhisperReveal(game, players);
  checkPoetRequest(game, players, me);

  // Phoenix: see dead roles
  if (myRole === 'phoenix') handlePhoenixPassive(players, game);
}

// ── Phase change handler ───────────────────────────────────────────────────────
function handlePhaseChange(phase, game, me, players, options = {}) {
  const gameBg = document.getElementById('game-bg');
  const suppressCinematic = !!options.suppressCinematic;

  if (phase === 'night') {
    gameBg.className = 'game-bg night';
    if (!suppressCinematic) showCinematic('حلّ الليل...', 'ابقَ هادئاً واستمع للظلام', 2500);
    lockPublicChat(true);
    const timerWrap = document.getElementById('timer-wrap');
    if (timerWrap) timerWrap.style.display = '';

  } else if (phase === 'morning' || phase === 'day') {
    gameBg.className = 'game-bg day';

    // Announce night results
    const deathLog = game.deathLog || {};
    const round = game.round;
    const death = deathLog[`round_${round}`];

    if (death?.protected) {
      if (!suppressCinematic) showCinematic('شخص ما نجا من الموت الليلة...', 'الظلام لم يصل إليه', 2600);
    } else if (death?.killed) {
      const victim = players[death.killed];
      const vname = victim ? victim.name : '؟';
      if (!suppressCinematic) {
        showCinematic('تم العثور على لاعب ميت...', `${vname} لم يستيقظ هذا الصباح`, 3000);
        Sound.playDeathHit();
      }
    } else {
      if (!suppressCinematic) showCinematic('استيقظت القرية...', 'ليلة هادئة... أم هكذا يبدو؟', 2500);
    }

    lockPublicChat(false);

  } else if (phase === 'voting') {
    if (!suppressCinematic) {
      showCinematic('بدأ التصويت...', 'من المذنب بينكم؟', 2000);
      Sound.playVoteClick();
    }
    lockPublicChat(false);

  } else if (phase === 'defense') {
    if (!suppressCinematic) showCinematic('التبرير النهائي', 'اللحظة الأخيرة قبل الحكم...', 2200);
    lockPublicChat(false);

  } else if (phase === 'discussion') {
    if (!suppressCinematic) showCinematic('وقت النقاش', 'تحدث وأقنع الآخرين', 2000);
    lockPublicChat(false);
  }
}

function checkFounderFreezeNotice(game) {
  const key = game.founderActive ? `${game.round || 0}` : null;
  if (!key) {
    founderFreezeShownRound = null;
    return;
  }
  if (founderFreezeShownRound === key) return;
  founderFreezeShownRound = key;
  showCinematic('تم تجميد الأصوات جميعًا', 'الصمت ليس ضعفًا... بل سيطرة.', 3000);
}

// ── Timer ──────────────────────────────────────────────────────────────────────
// ── Public event announcements ───────────────────────────────────────────────
function getEventSeenStorageKey() {
  return `nightmares:lastEvent:${session?.roomId || 'local'}`;
}

function createGameEvent(type, payload = {}) {
  const game = roomData?.game || {};
  const id = payload.id || `${type}_${Date.now()}_${DB.generateId()}`;
  return {
    id,
    type,
    playerId: payload.playerId || null,
    playerName: payload.playerName || '',
    message: payload.message || '',
    subMessage: payload.subMessage || '',
    round: payload.round ?? game.round ?? null,
    phase: payload.phase || game.phase || null,
    ts: Date.now(),
  };
}

async function publishGameEvent(type, payload = {}, updates = null) {
  const event = createGameEvent(type, payload);
  if (updates) {
    updates[`rooms/${session.roomId}/game/lastEvent`] = event;
    return event;
  }
  await DB.update(`rooms/${session.roomId}/game`, { lastEvent: event });
  return event;
}

function clonePlayersWithPatch(playersPatch = {}) {
  const players = JSON.parse(JSON.stringify(roomData?.players || {}));
  Object.entries(playersPatch || {}).forEach(([playerId, patch]) => {
    if (!players[playerId]) return;
    players[playerId] = { ...players[playerId], ...(patch || {}) };
  });
  return players;
}

function isDeathPatchForBelovedLink(patch = {}) {
  return patch?.alive === false && patch.status !== 'kicked' && patch.status !== 'left' && !patch.kicked && !patch.left;
}

function getHabaitLinkedTargetId(player = {}) {
  return player?.belovedTargetId || player?.usedAbilities?.habaitTargetId || null;
}

function getBelovedCascadeDeaths(players = {}, newlyDeadIds = []) {
  const deadSet = new Set((newlyDeadIds || []).filter(Boolean));
  let changed = true;

  while (changed) {
    changed = false;
    Object.values(players || {}).forEach(player => {
      if (player?.role !== 'habait') return;
      if (!isActiveAlive(player) || deadSet.has(player.id)) return;
      const linkedTargetId = getHabaitLinkedTargetId(player);
      if (!linkedTargetId || !deadSet.has(linkedTargetId)) return;
      deadSet.add(player.id);
      changed = true;
    });
  }

  return Array.from(deadSet).filter(playerId => !newlyDeadIds.includes(playerId));
}

function addBelovedDeathsToUpdates(updates, playersPatch = {}) {
  const initialDeadIds = Object.entries(playersPatch || {})
    .filter(([, patch]) => isDeathPatchForBelovedLink(patch))
    .map(([playerId]) => playerId);
  if (initialDeadIds.length === 0) return [];

  const patchedPlayers = clonePlayersWithPatch(playersPatch);
  const linkedDeathIds = getBelovedCascadeDeaths(patchedPlayers, initialDeadIds);
  linkedDeathIds.forEach(playerId => {
    updates[`rooms/${session.roomId}/players/${playerId}/alive`] = false;
    playersPatch[playerId] = { ...(playersPatch[playerId] || {}), alive: false };
  });
  return linkedDeathIds;
}

function addWinnerToUpdates(updates, playersPatch = {}) {
  const game = roomData?.game || {};
  if (game.winner) return null;
  addBelovedDeathsToUpdates(updates, playersPatch);
  const winner = RoleEngine.checkWin(clonePlayersWithPatch(playersPatch));
  if (!winner) return null;
  updates[`rooms/${session.roomId}/game/winner`] = winner;
  updates[`rooms/${session.roomId}/status`] = 'ended';
  return winner;
}

async function checkAndWriteWinnerAfterDirectChange(playersPatch = {}) {
  if (!session?.roomId || roomData?.game?.winner) return null;
  const updates = {};
  const winner = addWinnerToUpdates(updates, playersPatch);
  if (!winner) return null;
  await db.ref().update(updates);
  return winner;
}

async function enforceHostWinnerIfNeeded() {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  if (!isHost || roomData?.status !== 'playing' || game.winner) return;
  if (!Object.values(players).some(p => isPlayerActive(p))) return;
  const winner = RoleEngine.checkWin(players);
  if (!winner) return;
  await db.ref().update({
    [`rooms/${session.roomId}/game/winner`]: winner,
    [`rooms/${session.roomId}/status`]: 'ended',
  });
}

function handleGameEvent(lastEvent) {
  if (!lastEvent?.id) return false;
  if (!VOTE_RESULT_EVENT_TYPES.includes(lastEvent.type)) return false;
  const storageKey = getEventSeenStorageKey();
  const storedSeenId = lastSeenEventId || sessionStorage.getItem(storageKey);
  if (lastEvent.id === storedSeenId) return false;

  const eventAge = Date.now() - Number(lastEvent.ts || 0);
  lastSeenEventId = lastEvent.id;
  sessionStorage.setItem(storageKey, lastEvent.id);
  if (eventAge > EVENT_REPLAY_MAX_AGE_MS) return false;

  showEventAnnouncement(lastEvent);
  return true;
}

function showEventAnnouncement(event) {
  const overlay = document.getElementById('event-announcement-overlay');
  const icon = document.getElementById('event-announcement-icon');
  const title = document.getElementById('event-announcement-title');
  const subtitle = document.getElementById('event-announcement-subtitle');
  if (!overlay || !icon || !title || !subtitle) return;

  const eventIcons = {
    execution: '⚖',
    skip: '↷',
    tie: '≈',
    no_votes: '…',
  };

  if (eventAnnouncementTimer) {
    clearTimeout(eventAnnouncementTimer);
    eventAnnouncementTimer = null;
  }

  overlay.className = `event-announcement-overlay ${event.type || 'info'} active`;
  icon.textContent = eventIcons[event.type] || '✦';
  title.textContent = event.message || '';
  subtitle.textContent = event.subMessage || '';
  subtitle.style.display = event.subMessage ? '' : 'none';

  eventAnnouncementTimer = setTimeout(() => {
    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }, event.duration || EVENT_ANNOUNCEMENT_DURATION_MS);
}

function updateTimer(timerEndsAt) {
  if (!timerEndsAt) return;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  const el = document.getElementById('timer-display');
  if (!el) return;

  function tick() {
    const remaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    el.textContent = formatTime(remaining);
    el.className = 'timer-display' + (remaining <= 10 ? ' urgent' : '');

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      // Only host advances phase
      if (isHost) advancePhase();
    }
  }
  tick();
  timerInterval = setInterval(tick, 500);
}

function updatePhaseHeader(phase, game, me) {
  const phaseLabel = document.getElementById('phase-label-text');
  const phaseIcon = document.getElementById('phase-icon');
  const phaseHeader = document.getElementById('phase-header');
  const roundBadge = document.getElementById('phase-round-badge');
  const indicator = document.getElementById('phase-indicator');
  const spectateBanner = document.getElementById('spectate-banner');
  const phaseClass = phase || '';

  if (phaseLabel) {
    phaseLabel.textContent = PHASE_ARABIC_NAMES[phase] || phase || 'تحميل...';
    phaseLabel.className = `phase-label ${phaseClass}`;
  }
  if (phaseIcon) {
    phaseIcon.textContent = phase === 'night' ? '☾' : '☀';
    phaseIcon.className = `phase-icon ${phase === 'night' ? 'night' : 'day'}`;
  }
  if (phaseHeader) phaseHeader.dataset.phase = phaseClass;
  if (indicator) indicator.className = `phase-indicator ${phaseClass}`;
  if (roundBadge) roundBadge.textContent = `الجولة ${game.round || 1}`;
  if (spectateBanner) spectateBanner.style.display = me && !me.alive ? '' : 'none';

  document.body.classList.toggle('night-phase', phase === 'night');
}

// ── Phase advancement (host only) ─────────────────────────────────────────────
async function advancePhase() {
  if (!isHost || !roomData) return;
  const game = roomData.game || {};
  const players = roomData.players || {};
  const settings = roomData.settings || {};
  const phase = game.phase;
  const round = game.round || 1;

  let updates = {};

  if (phase === 'night') {
    // Resolve night actions
    const result = resolveNightActions(game, players);
    const deathKey = `rooms/${session.roomId}/game/deathLog/round_${round}`;
    const nightDeathPatch = {};

    (result.killedIds || []).forEach(playerId => {
      nightDeathPatch[playerId] = { alive: false };
      updates[`rooms/${session.roomId}/players/${playerId}/alive`] = false;
    });
    const belovedDeathIds = addBelovedDeathsToUpdates(updates, nightDeathPatch);
    const allKilledIds = Array.from(new Set([...(result.killedIds || []), ...belovedDeathIds]));
    if (belovedDeathIds.length) {
      result.killedIds = allKilledIds;
      result.belovedDeaths = belovedDeathIds;
      allKilledIds.forEach(playerId => {
        updates[`rooms/${session.roomId}/players/${playerId}/alive`] = false;
      });
    }
    if (result.immuneConsumed) {
      updates[`rooms/${session.roomId}/players/${result.immuneConsumed}/usedAbilities/immune_used`] = true;
    }
    Object.entries(result.poisonUpdates || {}).forEach(([playerId, value]) => {
      updates[`rooms/${session.roomId}/game/poisoned/${playerId}`] = value;
    });
    Object.entries(result.infectionUpdates || {}).forEach(([playerId, value]) => {
      updates[`rooms/${session.roomId}/game/infections/${playerId}`] = value;
    });
    updates[deathKey] = result;

    // Check win
    const updatedPlayers = clonePlayersWithPatch(nightDeathPatch);
    const winner = RoleEngine.checkWin(updatedPlayers);
    if (winner) {
      updates[`rooms/${session.roomId}/game/winner`] = winner;
      updates[`rooms/${session.roomId}/status`] = 'ended';
      await db.ref().update(updates);
      return;
    }

    updates[`rooms/${session.roomId}/game/phase`] = 'morning';
    updates[`rooms/${session.roomId}/game/timerEndsAt`] = Date.now() + (settings.dayTime || 120) * 1000;
    updates[`rooms/${session.roomId}/game/nightActions`] = {};
  } else if (phase === 'morning' || phase === 'day') {
    updates[`rooms/${session.roomId}/game/phase`] = 'discussion';
    updates[`rooms/${session.roomId}/game/timerEndsAt`] = Date.now() + (settings.discussionTime || 90) * 1000;

  } else if (phase === 'discussion') {
    updates[`rooms/${session.roomId}/game/phase`] = 'voting';
    updates[`rooms/${session.roomId}/game/timerEndsAt`] = Date.now() + (settings.votingTime || 45) * 1000;
    updates[`rooms/${session.roomId}/game/votes`] = {};

  } else if (phase === 'voting') {
    updates[`rooms/${session.roomId}/game/phase`] = 'defense';
    updates[`rooms/${session.roomId}/game/timerEndsAt`] = Date.now() + (settings.defenseTime || 30) * 1000;

  } else if (phase === 'defense') {
    // Resolve votes
    const votes = game.votes || {};
    const result = resolveVotes(votes, players, game);
    const executionPatch = {};

    if (result.executed) {
      const victim = players[result.executed];
      const victimRole = victim?.role;
      await publishGameEvent('execution', {
        playerId: result.executed,
        playerName: victim?.name || '',
        message: `خرج ${victim?.name || 'لاعب'} بالتصويت`,
        subMessage: '',
        round,
        phase: 'defense',
      }, updates);

      executionPatch[result.executed] = { alive: false };
      addBelovedDeathsToUpdates(updates, executionPatch);
      Object.entries(executionPatch).forEach(([playerId, patch]) => {
        if (patch?.alive === false) {
          updates[`rooms/${session.roomId}/players/${playerId}/alive`] = false;
        }
      });

      // Hopebreaker reveal
      if (victimRole === 'hopebreaker') {
        // No special action needed, already dead
      }

      // Eclipse solo win
      if (victimRole === 'eclipse') {
        updates[`rooms/${session.roomId}/game/winner`] = 'eclipse';
        updates[`rooms/${session.roomId}/status`] = 'ended';
        await db.ref().update(updates);
        return;
      }
    } else if (result.skipped) {
      await publishGameEvent('skip', {
        message: 'تم اختيار التخطي',
        subMessage: '',
        round,
        phase: 'defense',
      }, updates);
    } else if (result.tie) {
      await publishGameEvent('tie', {
        message: 'تعادل التصويت',
        subMessage: '',
        round,
        phase: 'defense',
      }, updates);
    } else {
      await publishGameEvent('no_votes', {
        message: 'لم يصوّت أحد',
        subMessage: '',
        round,
        phase: 'defense',
      }, updates);
    }

    // Check win after vote
    const updatedPlayers = clonePlayersWithPatch(executionPatch);
    const winner = RoleEngine.checkWin(updatedPlayers);
    if (winner) {
      updates[`rooms/${session.roomId}/game/winner`] = winner;
      updates[`rooms/${session.roomId}/status`] = 'ended';
      await db.ref().update(updates);
      return;
    }

    // Next night
    const newRound = round + 1;
    updates[`rooms/${session.roomId}/game/phase`] = 'night';
    updates[`rooms/${session.roomId}/game/round`] = newRound;
    updates[`rooms/${session.roomId}/game/timerEndsAt`] = Date.now() + (settings.nightTime || 60) * 1000;
    updates[`rooms/${session.roomId}/game/votes`] = {};
    updates[`rooms/${session.roomId}/game/nightActions`] = {};
    updates[`rooms/${session.roomId}/game/mafiaSharedReveals`] = {};
    updates[`rooms/${session.roomId}/game/founderActive`] = false;
    updates[`rooms/${session.roomId}/game/founderVote`] = null;
  }

  await db.ref().update(updates);
}

// ── Night Action Resolution ────────────────────────────────────────────────────
function resolveNightActions(gameOrActions, players) {
  const game = gameOrActions?.nightActions ? gameOrActions : { nightActions: gameOrActions || {}, round: roomData?.game?.round || 1 };
  const actions = game.nightActions || {};
  const round = game.round || 1;
  const mafiaKill = selectMafiaKillTarget(actions, players);
  const mafiaKillActor = mafiaKill ? selectMafiaKillActor(actions, players, mafiaKill) : null;
  const doctorProtect = actions.doctor_protect;
  const madAction = actions.madCitizen || null;
  const madProtect = madAction?.action === 'protect' ? madAction.targetId : null;
  const bypass = actions.oathbreakerBypass?.targetId === mafiaKill && actions.oathbreakerBypass?.round === round;

  const killedIds = [];
  let protected_ = false;
  let immuneConsumed = null;
  const poisonUpdates = {};
  const infectionUpdates = {};
  let infectionSpread = null;

  if (mafiaKill) {
    const target = players[mafiaKill];
    if (isActiveAlive(target)) {
      const doctorSaved = doctorProtect === mafiaKill && !bypass;
      const madSaved = madProtect === mafiaKill;
      if (doctorSaved || madSaved) {
        protected_ = true;
      } else if (target.role === 'immune_citizen' && !target.usedAbilities?.immune_used) {
        protected_ = true;
        immuneConsumed = mafiaKill;
      } else {
        killedIds.push(mafiaKill);
        if (target.role === 'infected' && mafiaKillActor) {
          infectionUpdates[mafiaKillActor] = {
            from: mafiaKill,
            roundApplied: round,
            diesNextNight: true,
          };
          infectionSpread = mafiaKillActor;
        }
      }
    }
  }

  if (madAction?.action === 'kill') {
    const target = players[madAction.targetId];
    if (madAction.round === round && isActiveAlive(target) && !killedIds.includes(madAction.targetId)) {
      killedIds.push(madAction.targetId);
    }
  }

  Object.entries(game.poisoned || {}).forEach(([targetId, poison]) => {
    const target = players[targetId];
    if (!isPlayerActive(target) || !target?.alive) {
      poisonUpdates[targetId] = null;
      return;
    }
    if (Number(poison.roundApplied || 0) >= round) {
      poisonUpdates[targetId] = poison;
      return;
    }
    const remaining = Number(poison.nightsRemaining || 2);
    if (remaining <= 1) {
      if (doctorProtect === targetId) {
        protected_ = true;
        poisonUpdates[targetId] = null;
      } else {
        if (!killedIds.includes(targetId)) killedIds.push(targetId);
        poisonUpdates[targetId] = null;
      }
    } else {
      poisonUpdates[targetId] = { ...poison, nightsRemaining: remaining - 1 };
    }
  });

  Object.entries(game.infections || {}).forEach(([mafiaId, infection]) => {
    const infectedMafia = players[mafiaId];
    if (!isActiveAlive(infectedMafia)) {
      infectionUpdates[mafiaId] = null;
      return;
    }
    if (infection.diesNextNight && Number(infection.roundApplied || 0) < round) {
      if (!killedIds.includes(mafiaId)) killedIds.push(mafiaId);
      infectionUpdates[mafiaId] = null;
    }
  });

  return {
    killed: killedIds[0] || null,
    killedIds,
    protected: protected_,
    immuneConsumed,
    mafiaTarget: mafiaKill || null,
    mafiaKillActor,
    poisonUpdates,
    infectionUpdates,
    infectionSpread,
  };
}

function selectMafiaKillTarget(actions, players) {
  const livingMafia = Object.values(players)
    .filter(p => isActiveAlive(p) && RoleEngine.isPlayerMafia(p))
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  if (livingMafia.length === 0) return null;

  const choices = actions.mafiaKills || (actions.mafia_kill ? { legacy: actions.mafia_kill } : {});
  const validChoices = {};
  livingMafia.forEach(mafia => {
    const targetId = choices[mafia.id];
    const target = players[targetId];
    if (isActiveAlive(target) && !RoleEngine.isPlayerMafia(target)) {
      validChoices[mafia.id] = targetId;
    }
  });

  const cursedLeader = livingMafia.find(p => p.role === 'cursed');
  if (cursedLeader && validChoices[cursedLeader.id]) {
    return validChoices[cursedLeader.id];
  }

  const tally = {};
  Object.values(validChoices).forEach(targetId => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  const majority = Math.floor(livingMafia.length / 2) + 1;
  for (const [targetId, count] of Object.entries(tally)) {
    if (count >= majority) return targetId;
  }

  const explicitLeader = livingMafia.find(p => p.isMafiaLeader);
  if (explicitLeader && validChoices[explicitLeader.id]) {
    return validChoices[explicitLeader.id];
  }

  const firstSelector = livingMafia.find(p => validChoices[p.id]);
  return firstSelector ? validChoices[firstSelector.id] : null;
}

function selectMafiaKillActor(actions, players, targetId) {
  const livingMafia = Object.values(players)
    .filter(p => isActiveAlive(p) && RoleEngine.isPlayerMafia(p))
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  const choices = actions.mafiaKills || {};
  const voters = livingMafia.filter(mafia => choices[mafia.id] === targetId);
  if (voters.length === 0) return null;
  const leader = livingMafia.find(p => p.role === 'cursed')
    || livingMafia.find(p => p.isMafiaLeader)
    || livingMafia[0];
  return voters.find(p => p.id === leader.id)?.id || voters[0].id;
}

// ── Vote Resolution ────────────────────────────────────────────────────────────
function resolveVotes(votes, players, game = {}) {
  if (game.founderActive) {
    const founder = Object.values(players)
      .find(p => isActiveAlive(p) && p.role === 'founder' && p.usedAbilities?.founder_used);
    const targetId = game.founderVote;
    if (founder && targetId && targetId !== 'skip' && isActiveAlive(players[targetId])) {
      return { executed: targetId, founderOverride: true };
    }
    if (targetId === 'skip') return { executed: null, skipped: true, founderOverride: true };
    return { executed: null, noVotes: true, founderOverride: true };
  }

  const tally = {};
  let skipCount = 0;

  Object.entries(votes).forEach(([voterId, v]) => {
    if (!isActiveAlive(players[voterId])) return;
    if (v === 'skip') { skipCount++; return; }
    if (!isActiveAlive(players[v])) return;
    tally[v] = (tally[v] || 0) + 1;
  });

  if (Object.keys(tally).length === 0) {
    return skipCount > 0
      ? { executed: null, skipped: true }
      : { executed: null, noVotes: true };
  }

  let maxVotes = 0;
  let maxPlayers = [];
  for (const [pid, cnt] of Object.entries(tally)) {
    if (cnt > maxVotes) { maxVotes = cnt; maxPlayers = [pid]; }
    else if (cnt === maxVotes) maxPlayers.push(pid);
  }

  if (maxPlayers.length > 1) return { executed: null, tie: true };
  if (skipCount >= maxVotes) return { executed: null, skipped: true };

  return { executed: maxPlayers[0], votes: tally };
}

function getVoteTally(game, players) {
  const tally = {};
  if (game?.founderActive) {
    const targetId = game.founderVote;
    if (targetId && targetId !== 'skip' && isActiveAlive(players[targetId])) {
      tally[targetId] = 1;
    }
    return tally;
  }

  Object.entries(game?.votes || {}).forEach(([voterId, targetId]) => {
    if (!isActiveAlive(players[voterId]) || !targetId || targetId === 'skip') return;
    if (!isActiveAlive(players[targetId])) return;
    tally[targetId] = (tally[targetId] || 0) + 1;
  });
  return tally;
}

function canUseTargetDayAbility(phase) {
  return TARGET_DAY_ABILITY_PHASES.includes(phase);
}

function canUseCursedAbility(phase) {
  return DAY_ABILITY_PHASES.includes(phase);
}

function getCursedGuessRoleLabel(roleId) {
  return CURSED_GUESS_OPTIONS.find(option => option.id === roleId)?.label
    || RoleEngine.getRoleArabicName(roleId);
}

function canUsePhoenixAbility(phase) {
  return DAY_ABILITY_PHASES.includes(phase);
}

function canUsePoetAbility(phase) {
  return phase === 'night';
}

function canUseHabaitAbility(phase) {
  return phase === 'night';
}

function makePrivateRoleReveal(target = {}, game = roomData?.game || {}) {
  return {
    targetId: target.id,
    shownRole: target.role,
    targetName: target.name || 'لاعب',
    round: game.round || 1,
    ts: Date.now(),
  };
}

async function chooseMafiaKill(targetPlayerId) {
  const game = roomData?.game || {};
  const current = game.nightActions?.mafiaKills?.[session.id];
  Sound.playVoteClick();
  await DB.update(`rooms/${session.roomId}/game/nightActions/mafiaKills`, {
    [session.id]: current === targetPlayerId ? null : targetPlayerId
  });
}

async function chooseDoctorProtect(targetPlayerId) {
  const game = roomData?.game || {};
  const current = game.nightActions?.doctor_protect;
  Sound.playVoteClick();
  await DB.update(`rooms/${session.roomId}/game/nightActions`, {
    doctor_protect: current === targetPlayerId ? null : targetPlayerId
  });
}

async function choosePoisonerTarget(targetPlayerId) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (game.phase !== 'night' || me?.role !== 'poisoner' || me.usedAbilities?.poisoner_used) return;
  if (!isActiveAlive(target) || RoleEngine.isPlayerMafia(target)) return;
  Sound.playAbility();
  const updates = {};
  updates[`rooms/${session.roomId}/game/poisoned/${targetPlayerId}`] = {
    by: session.id,
    roundApplied: game.round || 1,
    nightsRemaining: 2,
  };
  updates[`rooms/${session.roomId}/players/${session.id}/usedAbilities/poisoner_used`] = true;
  await db.ref().update(updates);
  showToast(`تم تسميم ${target.name}`, 'info', 3500);
}

async function chooseOathbreakerBypass(targetPlayerId) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (game.phase !== 'night' || me?.role !== 'oathbreaker' || me.usedAbilities?.oathbreaker_used) return;
  if (!isActiveAlive(target) || targetPlayerId === session.id) return;
  Sound.playAbility();
  await db.ref().update({
    [`rooms/${session.roomId}/game/nightActions/oathbreakerBypass`]: {
      by: session.id,
      targetId: targetPlayerId,
      round: game.round || 1,
    },
    [`rooms/${session.roomId}/players/${session.id}/usedAbilities/oathbreaker_used`]: true,
  });
  showToast(`تم تحديد ${target.name} لكسر الحماية`, 'info', 3500);
}

async function chooseMadCitizenAction(targetPlayerId, action) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (game.phase !== 'night' || me?.role !== 'mad_citizen' || !isActiveAlive(me)) return;
  if (!isActiveAlive(target) || targetPlayerId === session.id) return;
  const current = game.nightActions?.madCitizen || {};
  const same = current.by === session.id && current.targetId === targetPlayerId && current.action === action;
  Sound.playVoteClick();
  await DB.update(`rooms/${session.roomId}/game/nightActions`, {
    madCitizen: same ? null : {
      by: session.id,
      targetId: targetPlayerId,
      action,
      round: game.round || 1,
    }
  });
}

async function requestPoetReveal(targetPlayerId) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  const existingRequest = game.poetRequests?.[session.id];
  if (!canUsePoetAbility(game.phase) || me?.role !== 'poet' || me.usedAbilities?.poet_used) return;
  if (existingRequest?.status === 'pending') {
    showToast('لديك طلب كشف متبادل بانتظار الرد', 'info', 3000);
    return;
  }
  if (!isActiveAlive(me) || !isActiveAlive(target) || targetPlayerId === session.id) return;

  Sound.playAbility();
  await db.ref().update({
    [`rooms/${session.roomId}/game/poetRequests/${session.id}`]: {
      poetId: session.id,
      targetId: targetPlayerId,
      poetName: me.name || 'الشاعر',
      targetName: target.name || 'لاعب',
      status: 'pending',
      round: game.round || 1,
      ts: Date.now(),
    },
    [`rooms/${session.roomId}/players/${session.id}/usedAbilities/poet_used`]: true,
    [`rooms/${session.roomId}/players/${session.id}/usedAbilities/poetTargetId`]: targetPlayerId,
  });
  showToast(`تم إرسال طلب كشف متبادل إلى ${target.name}`, 'info', 3500);
}

async function respondPoetRequest(poetId, accepted) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const request = game.poetRequests?.[poetId];
  const targetId = session.id;
  const poet = players[poetId];
  const target = players[targetId];
  if (!request || request.status !== 'pending' || request.targetId !== targetId) return;

  const canReveal = accepted && isActiveAlive(poet) && isActiveAlive(target);
  const updates = {
    [`rooms/${session.roomId}/game/poetRequests/${poetId}/status`]: canReveal ? 'accepted' : 'refused',
    [`rooms/${session.roomId}/game/poetRequests/${poetId}/resolvedAt`]: Date.now(),
    [`rooms/${session.roomId}/game/poetRequests/${poetId}/accepted`]: !!canReveal,
  };

  if (canReveal) {
    const round = game.round || request.round || 1;
    const ts = Date.now();
    updates[`rooms/${session.roomId}/players/${poetId}/privateReveals/${targetId}`] = {
      ...makePrivateRoleReveal(target, game),
      round,
      ts,
    };
    updates[`rooms/${session.roomId}/players/${targetId}/privateReveals/${poetId}`] = {
      ...makePrivateRoleReveal(poet, game),
      round,
      ts,
    };
  }

  activePoetRequestKey = null;
  await db.ref().update(updates);
  showToast(canReveal ? 'تمت الموافقة على كشف الشاعر' : 'تم رفض طلب الشاعر', canReveal ? 'info' : 'error', 3000);
}

async function chooseHabaitTarget(targetPlayerId) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (!canUseHabaitAbility(game.phase) || me?.role !== 'habait' || me.usedAbilities?.habait_used) return;
  if (!isActiveAlive(me) || !isActiveAlive(target) || targetPlayerId === session.id) return;

  Sound.playAbility();
  await db.ref().update({
    [`rooms/${session.roomId}/players/${session.id}/belovedTargetId`]: targetPlayerId,
    [`rooms/${session.roomId}/players/${session.id}/usedAbilities/habait_used`]: true,
    [`rooms/${session.roomId}/players/${session.id}/usedAbilities/habaitTargetId`]: targetPlayerId,
    [`rooms/${session.roomId}/game/belovedLinks/${session.id}`]: {
      habaitId: session.id,
      targetId: targetPlayerId,
      habaitName: me.name || 'حبيت',
      targetName: target.name || 'لاعب',
      round: game.round || 1,
      ts: Date.now(),
    },
  });
  showToast(`تم الارتباط بـ ${target.name}`, 'info', 3500);
}

async function useVictimSacrifice(targetPlayerId) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (game.phase !== 'night' || me?.role !== 'victim' || me.usedAbilities?.victim_used) return;
  if (!target || target.alive || !isPlayerActive(target) || RoleEngine.isPlayerMafia(target)) return;

  Sound.playAbility();
  showToast(`${target.name} كان ${RoleEngine.getRoleArabicName(target.role)}`, 'info', 4500);

  const updates = {
    [`rooms/${session.roomId}/players/${targetPlayerId}/alive`]: true,
    [`rooms/${session.roomId}/players/${session.id}/alive`]: false,
    [`rooms/${session.roomId}/players/${session.id}/usedAbilities/victim_used`]: true,
    [`rooms/${session.roomId}/game/votes/${targetPlayerId}`]: null,
    [`rooms/${session.roomId}/game/victimRevives/${targetPlayerId}`]: {
      by: session.id,
      round: game.round || 1,
      ts: Date.now(),
    },
  };
  addGovernorReviveUnlockToUpdates(updates, targetPlayerId, target);

  addWinnerToUpdates(updates, {
    [targetPlayerId]: { alive: true },
    [session.id]: { alive: false },
  });

  await db.ref().update(updates);
  showCinematic('عودة من التضحية', `عاد ${target.name} للحياة... وسقطت الضحية مكانه.`, 3500);
}
async function useGovernorReveal(targetPlayerId) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (game.phase !== 'night' || me?.role !== 'governor') return;
  if (!isGovernorRevealUnlocked(me) || isGovernorRevivedRevealUsed(me)) return;
  if (!isActiveAlive(target) || targetPlayerId === session.id) return;
  if (target.role === 'cursed') {
    showToast('لا يمكن كشف هذا الكرت.', 'error', 3500);
    return;
  }
  Sound.playAbility();
  await db.ref().update({
    [`rooms/${session.roomId}/game/publicRevealedRoles/${targetPlayerId}`]: {
      by: session.id,
      role: target.role,
      round: game.round || 1,
      cardImage: RoleEngine.getRoleImage(target.role),
      ts: Date.now(),
    },
    [`rooms/${session.roomId}/players/${session.id}/usedAbilities/${GOVERNOR_REVIVED_REVEAL_USED_KEY}`]: true,
  });
  showToast(`تم كشف كرت ${target.name}: ${RoleEngine.getRoleArabicName(target.role)}`, 'info', 4500);
}

async function investigatePlayer(targetPlayerId) {
  const game = roomData?.game || {};
  const target = roomData?.players?.[targetPlayerId];
  const roundKey = String(game.round || 1);
  Sound.playAbility();
  const tx = await db.ref(`rooms/${session.roomId}/players/${session.id}/usedAbilities/investigatedRounds/${roundKey}`)
    .transaction(current => current ? undefined : true);
  if (!tx.committed) {
    showToast('استخدمت فحصك لهذه الليلة', 'info');
    return;
  }
  const result = getDetectiveInvestigationResult(target);
  showCinematic(result, `نتيجة التحقيق عن ${target.name}`, 3000);
}

async function useWhisperOnTarget(targetPlayerId) {
  if (whisperActionPending) return;
  const game = roomData?.game || {};
  const target = roomData?.players?.[targetPlayerId];
  if (!target) return;
  const me = roomData?.players?.[session.id];
  if (game.phase !== 'night' || me?.role !== 'whisper' || !isActiveAlive(me) || me.usedAbilities?.whisper_used) return;

  whisperActionPending = true;
  try {
    const shownRole = getWhisperVisibleRole(target);
    const ts = Date.now();
    Sound.playWhisper();
    const revealData = {
      targetId: targetPlayerId,
      shownRole,
      targetName: target.name,
      round: game.round || 1,
      ts,
    };
    const updates = {};
    updates[`rooms/${session.roomId}/players/${session.id}/privateReveals/${targetPlayerId}`] = revealData;
    updates[`rooms/${session.roomId}/players/${session.id}/usedAbilities/whisper_used`] = true;
    updates[`rooms/${session.roomId}/game/mafiaSharedReveals/${targetPlayerId}`] = {
      ...revealData,
      byPlayerId: session.id,
      byName: me.name || 'الهامسة',
    };
    await db.ref().update(updates);
    showWhisperReveal({ ...target, role: shownRole }, 10, shownRole);
    showToast(`رأيت بطاقة ${target.name}: ${RoleEngine.getRoleArabicName(shownRole)}`, 'info', 5000);
  } finally {
    whisperActionPending = false;
  }
}

async function useHopebreakerOnTarget(targetPlayerId) {
  const target = roomData?.players?.[targetPlayerId];
  if (!isActiveAlive(target)) return;

  Sound.playAbility();
  const isMafia = RoleEngine.isPlayerMafia(target) && !isRoleHiddenFromInvestigation(target);
  const updates = {};
  const chatKey = DB.generateId();

  if (isMafia) {
    showCinematic('الأمل آخر شيء يختفي... وهو أول شيء يدمره.', `${target.name} هو ${RoleEngine.getRoleArabicName(target.role)} — مات فوراً`, 4000);
    updates[`rooms/${session.roomId}/players/${target.id}/alive`] = false;
    updates[`rooms/${session.roomId}/players/${session.id}/usedAbilities/hopebreaker_used`] = true;
    updates[`rooms/${session.roomId}/game/revealedRoles/${target.id}`] = target.role;
    updates[`rooms/${session.roomId}/game/chat/${chatKey}`] = {
      playerId: 'system', name: 'النظام', icon: 'owl',
      text: `محطم الآمال كشف ${target.name}: ${RoleEngine.getRoleArabicName(target.role)} — مات فوراً.`,
      ts: DB.timestamp(), type: 'system',
    };
    addWinnerToUpdates(updates, { [target.id]: { alive: false } });
  } else {
    showCinematic('محطم الآمال مات', 'لم يُكشف أحد.', 3500);
    updates[`rooms/${session.roomId}/players/${session.id}/alive`] = false;
    updates[`rooms/${session.roomId}/players/${session.id}/usedAbilities/hopebreaker_used`] = true;
    addWinnerToUpdates(updates, { [session.id]: { alive: false } });
  }

  await db.ref().update(updates);
}
function requestPhoenixTeamChoice() {
  const modal = document.getElementById('phoenix-team-modal');
  if (!modal) return Promise.resolve(null);
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  return new Promise(resolve => {
    const buttons = modal.querySelectorAll('[data-phoenix-team]');
    const choose = (event) => {
      const team = event.currentTarget?.dataset?.phoenixTeam;
      buttons.forEach(btn => btn.removeEventListener('click', choose));
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      resolve(team === 'mafia' ? 'mafia' : 'citizens');
    };
    buttons.forEach(btn => btn.addEventListener('click', choose, { once: true }));
  });
}

async function usePhoenixOnTarget(targetPlayerId) {
  const players = roomData?.players || {};
  const game = roomData?.game || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (me?.role !== 'phoenix' || me.usedAbilities?.phoenix_used) return;
  if (!target || target.alive || !isPlayerActive(target)) return;

  Sound.playAbility();
  const updates = {};

  if (targetPlayerId === session.id) {
    const chosenTeam = await requestPhoenixTeamChoice();
    if (!chosenTeam) return;
    updates[`rooms/${session.roomId}/players/${session.id}/alive`] = true;
    updates[`rooms/${session.roomId}/players/${session.id}/team`] = chosenTeam;
    updates[`rooms/${session.roomId}/players/${session.id}/usedAbilities/phoenix_used`] = true;
    updates[`rooms/${session.roomId}/game/votes/${session.id}`] = null;
    addWinnerToUpdates(updates, { [session.id]: { alive: true, team: chosenTeam } });
    showCinematic('قدرة العنقاء', 'أحيِ نفسك واختر فريقك بعد العودة.', 3000);
  } else {
    updates[`rooms/${session.roomId}/players/${target.id}/alive`] = true;
    updates[`rooms/${session.roomId}/game/votes/${target.id}`] = null;
    updates[`rooms/${session.roomId}/players/${session.id}/team`] = RoleEngine.getPlayerTeam(target);
    updates[`rooms/${session.roomId}/players/${session.id}/usedAbilities/phoenix_used`] = true;
    addGovernorReviveUnlockToUpdates(updates, target.id, target);
    addWinnerToUpdates(updates, {
      [target.id]: { alive: true },
      [session.id]: { team: RoleEngine.getPlayerTeam(target) },
    });
    showCinematic('عاد من الموت...', `${target.name} لكنه لم يعد كما كان.`, 3500);
  }

  await db.ref().update(updates);
}
async function executeCursedGuess(targetPlayerId, guessRole) {
  const players = roomData?.players || {};
  const game = roomData?.game || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (!isActiveAlive(me) || me.role !== 'cursed' || me.usedAbilities?.cursed_used) return;
  if (!canUseCursedAbility(game.phase)) return;
  if (targetPlayerId === session.id) return;
  if (!isActiveAlive(target) || !CURSED_SUCCESS_ROLES.includes(guessRole)) return;

  Sound.playCrystalCrack();
  const isValidCursedJudgment = target.role === guessRole && CURSED_SUCCESS_ROLES.includes(guessRole);
  const updates = {
    [`rooms/${session.roomId}/players/${session.id}/usedAbilities/cursed_used`]: true,
  };

  if (isValidCursedJudgment) {
    showCinematic('أصبت!', `${target.name} هو ${getCursedGuessRoleLabel(guessRole)}`, 3000);
    updates[`rooms/${session.roomId}/players/${targetPlayerId}/alive`] = false;
    addWinnerToUpdates(updates, { [targetPlayerId]: { alive: false } });
  } else {
    showCinematic('أخطأت!', 'الملعون دفع الثمن بنفسه...', 3000);
    updates[`rooms/${session.roomId}/players/${session.id}/alive`] = false;
    addWinnerToUpdates(updates, { [session.id]: { alive: false } });
  }

  await db.ref().update(updates);
}
async function kickPlayer(targetPlayerId) {
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (!me?.isHost || !target || target.id === session.id || target.isHost) return;
  if (getPlayerStatus(target) === 'kicked') return;

  const game = roomData?.game || {};
  const updates = {};
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/status`] = 'kicked';
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/kicked`] = true;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/alive`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/ready`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/online`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/connected`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/lastSeen`] = DB.timestamp();
  updates[`rooms/${session.roomId}/game/votes/${targetPlayerId}`] = null;
  updates[`rooms/${session.roomId}/game/nightActions/mafiaKills/${targetPlayerId}`] = null;

  Object.entries(game.votes || {}).forEach(([voterId, voteTargetId]) => {
    if (voteTargetId === targetPlayerId) {
      updates[`rooms/${session.roomId}/game/votes/${voterId}`] = null;
    }
  });
  Object.entries(game.nightActions?.mafiaKills || {}).forEach(([mafiaId, killTargetId]) => {
    if (killTargetId === targetPlayerId) {
      updates[`rooms/${session.roomId}/game/nightActions/mafiaKills/${mafiaId}`] = null;
    }
  });
  if (game.nightActions?.doctor_protect === targetPlayerId) {
    updates[`rooms/${session.roomId}/game/nightActions/doctor_protect`] = null;
  }
  if (game.founderVote === targetPlayerId) {
    updates[`rooms/${session.roomId}/game/founderVote`] = null;
  }

  addWinnerToUpdates(updates, {
    [targetPlayerId]: { alive: false, status: 'kicked', kicked: true, online: false, connected: false },
  });

  await db.ref().update(updates);
  showToast('تم طرد اللاعب من الغرفة', 'info');
}
function handlePlayerTargetClick(targetPlayerId, anchorEl = null) {
  if (isDuplicateTargetActivation(targetPlayerId)) return;
  const game = roomData?.game || {};
  const phase = game.phase;
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  const actions = [];
  const phoenixCanActFromDeath = me?.role === 'phoenix'
    && !me.usedAbilities?.phoenix_used
    && !me.alive
    && isPlayerActive(me)
    && canUsePhoenixAbility(phase);

  if ((!me?.alive || !isPlayerActive(me)) && !phoenixCanActFromDeath) {
    showToast('الأموات لا يتصرفون', 'error');
    return;
  }
  if (!target) return;
  const targetStatus = getPlayerStatus(target);
  if (targetStatus === 'kicked' || targetStatus === 'left' || !isPlayerActive(target)) return;

  const targetIsSelf = targetPlayerId === session.id;
  const targetIsAlive = !!target.alive;
  const canPhoenixRevive = me.role === 'phoenix'
    && !me.usedAbilities?.phoenix_used
    && canUsePhoenixAbility(phase)
    && !targetIsAlive;
  const canVictimRevive = me.role === 'victim'
    && phase === 'night'
    && !me.usedAbilities?.victim_used
    && !targetIsAlive
    && !targetIsSelf
    && !RoleEngine.isPlayerMafia(target);

  if (!targetIsAlive && !canPhoenixRevive && !canVictimRevive) return;
  if (targetIsSelf && !(phase === 'night' && me.role === 'doctor') && !canPhoenixRevive) return;

  if (canUseCursedAbility(phase) && me.role === 'cursed' && !me.usedAbilities?.cursed_used && targetIsAlive && !targetIsSelf) {
    showCursedGuessMenu(target, anchorEl);
    return;
  }

  const nightActions = game.nightActions || {};

  if (phase === 'night' && me.role === 'poet' && !me.usedAbilities?.poet_used && targetIsAlive && !targetIsSelf) {
    actions.push({ label: 'طلب كشف متبادل', fn: () => requestPoetReveal(targetPlayerId) });
  }

  if (phase === 'night' && me.role === 'habait' && !me.usedAbilities?.habait_used && targetIsAlive && !targetIsSelf) {
    actions.push({ label: 'اختيار الحبيب', fn: () => chooseHabaitTarget(targetPlayerId) });
  }

  if (phase === 'night' && me.role === 'whisper' && !me.usedAbilities?.whisper_used && targetIsAlive && !targetIsSelf && target.role !== 'cursed') {
    actions.push({ label: 'كشف البطاقة', className: 'whisper-btn', fn: () => useWhisperOnTarget(targetPlayerId) });
  }

  if (phase === 'night' && RoleEngine.isPlayerMafia(me) && targetIsAlive && !RoleEngine.isPlayerMafia(target)) {
    const selected = nightActions.mafiaKills?.[session.id] === targetPlayerId;
    const mafiaKillLabel = me.role === 'whisper'
      ? (selected ? 'إلغاء اختيار قتل المافيا' : 'قتل المافيا')
      : (selected ? 'إلغاء الاختيار' : 'قتل');
    actions.push({
      label: mafiaKillLabel,
      fn: () => chooseMafiaKill(targetPlayerId)
    });
  }

  if (phase === 'night' && me.role === 'doctor' && targetIsAlive) {
    const selected = nightActions.doctor_protect === targetPlayerId;
    actions.push({
      label: selected ? 'إلغاء الحماية' : 'حماية',
      fn: () => chooseDoctorProtect(targetPlayerId)
    });
  }

  if (phase === 'night' && me.role === 'detective' && targetIsAlive && !targetIsSelf) {
    const roundKey = String(game.round || 1);
    const investigated = me.usedAbilities?.investigatedRounds?.[roundKey];
    if (investigated) {
      actions.push({ label: 'استخدمت التحقيق هذه الليلة', disabled: true });
    } else {
      actions.push({ label: 'تحقيق', fn: () => investigatePlayer(targetPlayerId) });
    }
  }

  if (phase === 'night' && me.role === 'poisoner' && targetIsAlive && !targetIsSelf && !RoleEngine.isPlayerMafia(target)) {
    actions.push({
      label: me.usedAbilities?.poisoner_used ? 'تم استخدام التسميم' : 'تسميم',
      disabled: !!me.usedAbilities?.poisoner_used,
      fn: () => choosePoisonerTarget(targetPlayerId),
    });
  }

  if (phase === 'night' && me.role === 'oathbreaker' && targetIsAlive && !targetIsSelf) {
    actions.push({
      label: me.usedAbilities?.oathbreaker_used ? 'تم كسر الحماية سابقًا' : 'كسر الحماية',
      disabled: !!me.usedAbilities?.oathbreaker_used,
      fn: () => chooseOathbreakerBypass(targetPlayerId),
    });
  }

  if (phase === 'night' && me.role === 'mad_citizen' && targetIsAlive && !targetIsSelf) {
    actions.push({ label: 'ذبح', fn: () => chooseMadCitizenAction(targetPlayerId, 'kill') });
    actions.push({ label: 'حماية', fn: () => chooseMadCitizenAction(targetPlayerId, 'protect') });
  }

  if (phase === 'night' && me.role === 'governor' && targetIsAlive && !targetIsSelf) {
    if (isGovernorRevealUnlocked(me)) {
      const used = isGovernorRevivedRevealUsed(me);
      actions.push({
        label: used ? 'تم استخدام كشف العودة' : 'كشف علني',
        disabled: !!used,
        fn: () => useGovernorReveal(targetPlayerId),
      });
    }
  }

  if ((phase === 'voting' || phase === 'defense') && targetIsAlive && !targetIsSelf) {
    if (game.founderActive && me.role !== 'founder') {
      actions.push({ label: 'تم تجميد الأصوات', disabled: true });
    } else {
      const currentVote = game.founderActive ? game.founderVote : (game.votes || {})[session.id];
      actions.push({
        label: currentVote === targetPlayerId ? 'إلغاء التصويت' : 'تصويت',
        fn: () => castVote(targetPlayerId)
      });
    }
  }

  if (canUseTargetDayAbility(phase) && me.role === 'hopebreaker' && !me.usedAbilities?.hopebreaker_used && targetIsAlive && !targetIsSelf) {
    actions.push({ label: 'تنفيذ قدرة محطم الآمال', fn: () => useHopebreakerOnTarget(targetPlayerId) });
  }

  if (canPhoenixRevive) {
    actions.push({ label: 'إحياء', fn: () => usePhoenixOnTarget(targetPlayerId) });
  }

  if (canVictimRevive) {
    actions.push({ label: 'إحياء بالتضحية', fn: () => useVictimSacrifice(targetPlayerId) });
  }

  if (actions.length === 0) return;
  const enabledActions = actions.filter(action => !action.disabled);
  if (phase !== 'night' && actions.length === 1 && enabledActions.length === 1) {
    actions[0].fn();
    return;
  }
  showActionMenu(target, actions, anchorEl);
}

function getMafiaChoiceLabels(game, players, targetId, viewer) {
  if (game?.phase !== 'night' || !RoleEngine.isPlayerMafia(viewer)) return [];
  return Object.entries(game.nightActions?.mafiaKills || {})
    .filter(([, selectedTargetId]) => selectedTargetId === targetId)
    .map(([mafiaId]) => {
      const selector = players[mafiaId];
      if (!selector || !RoleEngine.isPlayerMafia(selector)) return null;
      return mafiaId === session.id ? 'اختيارك' : `اختيار ${selector.name || 'مافيا'}`;
    })
    .filter(Boolean);
}

function getVisibleMafiaSharedReveal(game, viewer, targetId) {
  if (!game?.mafiaSharedReveals?.[targetId]) return null;
  if (!RoleEngine.isPlayerMafia(viewer)) return null;
  const reveal = game.mafiaSharedReveals[targetId];
  if (reveal.round !== (game.round || 1)) return null;
  return reveal;
}

// ── Render table players ───────────────────────────────────────────────────────
function renderGameTable(players, game) {
  const ring = document.getElementById('game-players-ring');
  if (!ring) return;
  ring.innerHTML = '';

  {
    const me = players[session.id];
    const pArr = getTablePlayerOrder(players, me);
    const count = pArr.length;
    if (count === 0) return;

    const positions = isMobileGameplay()
      ? getMobileTablePositions(count)
      : getSeatPositions(count, 50, 50, 41, 33);
    const votes = game?.votes || {};
    const voteTally = getVoteTally(game, players);
    const phase = game?.phase;
    const myVote = game.founderActive && me?.role === 'founder' ? game.founderVote : votes[session.id];
    const iAmMafia = RoleEngine.isPlayerMafia(me);
    const mafiaChoice = game.nightActions?.mafiaKills?.[session.id];
    const doctorProtect = game.nightActions?.doctor_protect;
    const maxVotes = Math.max(0, ...Object.values(voteTally));

    pArr.forEach((p, i) => {
      const pos = positions[i];
      const status = getPlayerStatus(p);
      const isActive = isPlayerActive(p);
      const targetIsMafia = RoleEngine.isPlayerMafia(p);
      const isVotingTarget = (phase === 'voting' || phase === 'defense') && voteTally[p.id] > 0;
      const isLeadingTarget = phase === 'defense' && maxVotes > 0 && voteTally[p.id] === maxVotes;
      const publicRevealedRole = game.publicRevealedRoles?.[p.id]?.role || game.revealedRoles?.[p.id];
      const revealedRole = publicRevealedRole === 'liar' ? null : publicRevealedRole;
      const phoenixDeadRole = canPhoenixSeeDeadRole(me, p) ? p.role : null;
      const voteCount = voteTally[p.id] || 0;
      const seatNumber = p.seat !== undefined && p.seat !== null ? Number(p.seat) + 1 : i + 1;
      const statusLabel = status === 'kicked' ? 'مطـرود' : status === 'left' ? 'غادر' : '';
      const phoenixCanActFromDeath = me?.role === 'phoenix'
        && !me.usedAbilities?.phoenix_used
        && !me.alive
        && isPlayerActive(me)
        && canUsePhoenixAbility(phase);
      const canClick = (isActiveAlive(me) || phoenixCanActFromDeath) && isActive && (
        p.alive
        || (me?.role === 'phoenix' && canUsePhoenixAbility(phase))
        || (me?.role === 'victim' && phase === 'night' && !me.usedAbilities?.victim_used && !RoleEngine.isPlayerMafia(p))
      );
      const isNightClickTarget = phase === 'night' && canClick;
      const mafiaChoiceLabels = getMafiaChoiceLabels(game, players, p.id, me);
      const sharedReveal = getVisibleMafiaSharedReveal(game, me, p.id);
      const sharedRevealLabel = sharedReveal ? RoleEngine.getRoleArabicName(sharedReveal.shownRole) : '';
      const sharedRevealTitle = sharedReveal ? `كشفتها ${sharedReveal.byName || 'الهامسة'}` : '';
      const isMyMafiaChoice = mafiaChoiceLabels.includes('اختيارك');
      const lifeStatusText = statusLabel || (!p.alive ? 'ميت' : (isActive ? 'حي' : 'غير متصل'));

      const seat = document.createElement('button');
      seat.type = 'button';
      seat.className = [
        'player-table-card',
        p.id === session.id ? 'is-me' : '',
        !p.alive ? 'is-dead' : '',
        status === 'kicked' ? 'is-kicked' : '',
        status === 'left' ? 'is-left' : '',
        canClick ? 'selectable-target' : '',
        isNightClickTarget ? 'night-target' : '',
        isVotingTarget ? 'voting-target' : '',
        myVote === p.id ? 'my-vote-target' : '',
        iAmMafia && mafiaChoice === p.id ? 'my-kill-target' : '',
        me?.role === 'doctor' && doctorProtect === p.id ? 'my-protect-target' : '',
        isLeadingTarget ? 'leading-target' : '',
        iAmMafia && targetIsMafia && p.id !== session.id ? 'mafia-teammate' : '',
      ].filter(Boolean).join(' ');
      seat.style.left = pos.x + '%';
      seat.style.top = pos.y + '%';
      seat.disabled = status === 'kicked' || status === 'left';

      seat.innerHTML = `
        <span class="ptc-seat">#${seatNumber}</span>
        <span class="ptc-frame">
          <span class="ptc-avatar-shell">${getPlayerPortraitHtml(p.icon, p.name, 'ptc-avatar-img')}</span>
          <span class="ptc-status-dot ${isActive ? 'online' : 'offline'}"></span>
          ${!p.alive ? '<span class="ptc-dead-overlay">☠</span>' : ''}
          ${voteCount ? `<span class="ptc-vote-badge">${voteCount}</span>` : ''}
          ${iAmMafia && targetIsMafia && p.id !== session.id ? '<span class="ptc-private-badge ptc-mafia-badge" title="علامة مافيا خاصة">🌹</span>' : ''}
          ${phase === 'night' && me?.role === 'whisper' && canClick && p.id !== session.id && p.role !== 'cursed' ? '<span class="ptc-action-reticle" title="كشف البطاقة">⌖</span>' : ''}
          ${mafiaChoiceLabels.length ? `<span class="ptc-mafia-choice-badge ptc-kill-badge${isMyMafiaChoice ? ' my-selection' : ''}">${escapeHtml(mafiaChoiceLabels.join(' · '))}</span>` : ''}
          ${sharedReveal ? `<span class="ptc-whisper-reveal-badge ptc-reveal-badge" title="${escapeHtml(sharedRevealTitle)}">🔍 ${escapeHtml(sharedRevealLabel)}</span>` : ''}
        </span>
        <span class="ptc-name">${escapeHtml(p.name)}${p.id === session.id ? ' (أنت)' : ''}</span>
        <span class="ptc-status-text ptc-life-status">${escapeHtml(lifeStatusText)}</span>
        ${revealedRole ? `<span class="ptc-revealed-role" style="color:${RoleEngine.getRoleColor(revealedRole)};">${RoleEngine.getRoleArabicName(revealedRole)}</span>` : ''}
        ${phoenixDeadRole ? `<span class="ptc-phoenix-dead-role" title="معلومة خاصة بالعنقاء">العنقاء: ${escapeHtml(RoleEngine.getRoleArabicName(phoenixDeadRole))}</span>` : ''}
      `;

      if (me?.isHost && p.id !== session.id && !p.isHost && status !== 'kicked' && status !== 'left') {
        const kickBtn = document.createElement('span');
        kickBtn.className = 'ptc-kick-btn';
        kickBtn.textContent = 'طرد';
        kickBtn.title = `طرد ${p.name}`;
        bindTouchSafeAction(kickBtn, (event) => {
          event.stopPropagation();
          showActionMenu('إدارة اللاعب', [
            { label: `طرد ${p.name}`, fn: () => kickPlayer(p.id) }
          ], seat);
        });
        seat.appendChild(kickBtn);
      }

      bindTouchSafeAction(seat, () => handlePlayerTargetClick(p.id, seat));
      ring.appendChild(seat);
    });
    return;
  }

  const pArr = Object.values(players);
  const count = pArr.length;
  if (count === 0) return;

  const positions = getSeatPositions(count, 50, 50, 40, 32);
  const votes = game?.votes || {};
  const voteTally = getVoteTally(game, players);
  const me = players[session.id];
  const myVote = game.founderActive && me?.role === 'founder' ? game.founderVote : votes[session.id];
  const iAmMafia = RoleEngine.isPlayerMafia(me);
  const mafiaChoice = game.nightActions?.mafiaKills?.[session.id];
  const doctorProtect = game.nightActions?.doctor_protect;
  const maxVotes = Math.max(0, ...Object.values(voteTally));

  pArr.forEach((p, i) => {
    const pos = positions[i];
    const isVotingTarget = (game.phase === 'voting' || game.phase === 'defense') && voteTally[p.id] > 0;
    const status = getPlayerStatus(p);
    const targetIsMafia = RoleEngine.isPlayerMafia(p);
    const isLeadingTarget = game.phase === 'defense' && maxVotes > 0 && voteTally[p.id] === maxVotes;
    const statusLabel = status === 'kicked' ? 'مطرود' : status === 'left' ? 'غادر' : '';

    const seat = document.createElement('div');
    seat.className = [
      'legacy-player-seat',
      p.id === session.id ? 'is-me' : '',
      !p.alive ? 'dead' : '',
      status === 'kicked' ? 'kicked' : '',
      status === 'left' ? 'player-left' : '',
      isVotingTarget ? 'voting-target' : '',
      myVote === p.id ? 'my-vote-target' : '',
      iAmMafia && mafiaChoice === p.id ? 'my-kill-target' : '',
      me?.role === 'doctor' && doctorProtect === p.id ? 'my-protect-target' : '',
      isLeadingTarget ? 'leading-target' : '',
    ].filter(Boolean).join(' ');
    seat.style.left = pos.x + '%';
    seat.style.top = pos.y + '%';

      const publicRevealedRole = game.publicRevealedRoles?.[p.id]?.role || game.revealedRoles?.[p.id];
    const revealedRole = publicRevealedRole === 'liar' ? null : publicRevealedRole;

    seat.innerHTML = `
      <div class="legacy-seat-avatar" title="${escapeHtml(p.name)}">${getAnimalEmoji(p.icon)}</div>
      <div class="legacy-seat-name">${escapeHtml(p.name)}${p.id === session.id ? ' (أنت)' : ''}</div>
      ${statusLabel ? `<div class="gps-status" style="color:#fbbf24;">${statusLabel}</div>` : ''}
      ${!p.alive ? `<div class="gps-status" style="color:#f87171;">⚰ ميت</div>` : ''}
      ${revealedRole ? `<div class="gps-status" style="color:${RoleEngine.getRoleColor(revealedRole)};">${RoleEngine.getRoleArabicName(revealedRole)}</div>` : ''}
      ${isVotingTarget ? `<div class="vote-indicator">🗳 ${voteTally[p.id]}</div>` : ''}
      ${p.isHost && p.alive ? `<div class="gps-status">👑</div>` : ''}
    `;

    if (iAmMafia && targetIsMafia && p.id !== session.id) {
      seat.classList.add('mafia-teammate');
      const badge = document.createElement('div');
      badge.className = 'mafia-teammate-badge';
      badge.textContent = '🌹';
      badge.title = 'علامة مافيا خاصة';
      seat.appendChild(badge);
    }

    if (me?.isHost && p.id !== session.id && !p.isHost && status !== 'kicked' && status !== 'left') {
      const kickBtn = document.createElement('button');
      kickBtn.type = 'button';
      kickBtn.className = 'gps-kick-btn';
      kickBtn.textContent = 'طرد';
      kickBtn.title = `طرد ${p.name}`;
      bindTouchSafeAction(kickBtn, (event) => {
        event.stopPropagation();
        showActionMenu('إدارة اللاعب', [
          { label: `طرد ${p.name}`, fn: () => kickPlayer(p.id) }
        ], kickBtn);
      });
      seat.appendChild(kickBtn);
    }

    seat.style.cursor = 'pointer';
    bindTouchSafeAction(seat, () => handlePlayerTargetClick(p.id, seat));

    ring.appendChild(seat);
  });
}

function getGameplayPlayerStatusLabel(player = {}) {
  const status = getPlayerStatus(player);
  if (status === 'kicked') return 'مطرود';
  if (status === 'left') return 'غادر';
  if (!player.alive) return 'ميت';
  if (!isPlayerActive(player)) return 'غير متصل';
  return 'حي';
}

function renderPlayersPanel(players = {}) {
  const list = document.getElementById('v2-players-list');
  const countEl = document.getElementById('v2-players-count');
  if (!list) return;

  const ordered = Object.values(players)
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));

  if (countEl) countEl.textContent = String(ordered.length);
  list.innerHTML = '';
  const viewer = players[session?.id];

  if (!ordered.length) {
    list.innerHTML = '<div class="gameplay-players-empty">لا يوجد لاعبون بعد</div>';
    return;
  }

  ordered.forEach(player => {
    const status = getPlayerStatus(player);
    const statusLabel = getGameplayPlayerStatusLabel(player);
    const phoenixDeadRole = canPhoenixSeeDeadRole(viewer, player) ? player.role : null;
    const row = document.createElement('div');
    row.className = [
      'gameplay-player-row',
      player.id === session?.id ? 'is-me' : '',
      !player.alive ? 'is-dead' : '',
      status === 'kicked' ? 'is-kicked' : '',
      status === 'left' ? 'is-left' : '',
    ].filter(Boolean).join(' ');
    row.innerHTML = `
      <span class="gpr-avatar">${getPlayerPortraitHtml(player.icon, player.name, 'gpr-avatar-img')}</span>
      <span class="gpr-main">
        <strong>${escapeHtml(player.name || 'لاعب')}</strong>
        <span class="gpr-tags">
          ${player.id === session?.id ? '<em>أنت</em>' : ''}
          ${player.isHost ? '<em>المضيف</em>' : ''}
          ${phoenixDeadRole ? `<em class="gpr-phoenix-role">العنقاء ترى: ${escapeHtml(RoleEngine.getRoleArabicName(phoenixDeadRole))}</em>` : ''}
        </span>
      </span>
      <span class="gpr-status">${escapeHtml(statusLabel)}</span>
    `;
    list.appendChild(row);
  });
}

function updateTableSkipButton(game, me) {
  const wrap = document.getElementById('table-skip-btn-wrap');
  const btn = document.getElementById('table-skip-btn');
  if (!wrap || !btn) return;

  const canSkip = (game.phase === 'voting' || game.phase === 'defense')
    && isActiveAlive(me)
    && !game.founderActive;

  wrap.style.display = canSkip ? '' : 'none';
  if (!canSkip) return;

  const selected = (game.votes || {})[session.id] === 'skip';
  btn.classList.toggle('selected', selected);
  btn.onclick = () => castVote('skip');
}

// ── Action Panel ───────────────────────────────────────────────────────────────
function renderBottomActionBar(game, me) {
  const bar = document.getElementById('bottom-action-bar');
  const unvoteBtn = document.getElementById('bottom-unvote-btn');
  const skipBtn = document.getElementById('bottom-skip-btn');
  if (!bar || !unvoteBtn || !skipBtn) return;

  const phase = game?.phase;
  const isVotePhase = phase === 'voting' || phase === 'defense';
  const canUse = isVotePhase && isActiveAlive(me);
  bar.classList.toggle('hidden', !canUse);
  if (!canUse) return;

  const currentVote = game.founderActive && me?.role === 'founder'
    ? game.founderVote
    : (game.votes || {})[session.id];
  const votesFrozen = game.founderActive && me?.role !== 'founder';

  unvoteBtn.disabled = votesFrozen || !currentVote;
  unvoteBtn.classList.toggle('active', !!currentVote && currentVote !== 'skip');
  unvoteBtn.onclick = () => clearCurrentVote();

  skipBtn.disabled = votesFrozen;
  skipBtn.classList.toggle('active', currentVote === 'skip');
  skipBtn.onclick = () => castVote('skip');
}

async function clearCurrentVote() {
  const me = roomData?.players?.[session.id];
  const game = roomData?.game || {};
  if (!isActiveAlive(me)) return;
  if (game.phase !== 'voting' && game.phase !== 'defense') return;

  if (game.founderActive && me.role === 'founder') {
    await DB.update(`rooms/${session.roomId}/game`, { founderVote: null });
    return;
  }
  await DB.update(`rooms/${session.roomId}/game/votes`, { [session.id]: null });
}

function getRoleDisplayData(me = {}) {
  const roleData = RoleEngine.getRole(me.role) || {};
  const isLiar = me.role === 'liar';
  const fakeRole = isLiar ? getPlayerLiarFakeRole(me) : null;
  const image = isLiar
    ? getLiarDisplayCard(me)
    : me.role === 'mafia'
      ? 'assets/role_cards/mafia_card_full_v2.png'
      : roleData.image;
  const teamMap = {
    mafia: 'فريق المافيا',
    citizens: 'المواطنون',
    neutral: 'محايد',
  };
  const roleName = isLiar
    ? 'دورك: الكذاب'
    : (RoleEngine.getRoleArabicName?.(me.role) || roleData.arabicName || roleData.name || me.role || 'دورك');

  return {
    roleData,
    roleName,
    image,
    color: roleData.color || '#c084fc',
    teamText: teamMap[roleData.team || me.team] || '',
    fakeText: isLiar ? `الكذبة الحالية: ${RoleEngine.getRoleArabicName(fakeRole)}` : '',
    description: me.role === 'whisper'
      ? 'الهامسة تكشف بطاقة لاعب للمافيا معها، وتستطيع أيضًا المشاركة في قتل المافيا.'
      : (roleData.description || ''),
    abilityText: getRoleAbilityText(me, roleData),
  };
}

function getRoleAbilityText(me = {}, roleData = {}) {
  if (me.role === 'liar') return 'دور سلبي بلا زر قدرة. المحقق يراك مواطناً، والهامسة ترى كذبتك الحالية.';
  const extraAbilityText = {
    victim: 'ليلًا: اضغط لاعبًا ميتًا من غير المافيا لإحيائه بالتضحية بنفسك. مرة واحدة.',
    poisoner: 'ليلًا: سمّم لاعبًا من غير المافيا ليموت بعد ليلتين. مرة واحدة.',
    infected: 'دور سلبي: إذا قتلتك المافيا ليلًا ينتقل المرض إلى القاتل.',
    oathbreaker: 'ليلًا: اكسر حماية الطبيب عن هدف واحد. مرة واحدة.',
    mad_citizen: 'ليلًا: اختر لاعبًا واحدًا للذبح أو الحماية.',
    governor: 'تُفتح بعد موتك ثم عودتك للحياة: اكشفي كرت لاعب علنًا مرة واحدة. لا يمكن كشف الملعون.',
    poet: 'ليلًا: اطلب كشفًا متبادلًا خاصًا مع لاعب واحد. إذا وافق، يرى كل منكما بطاقة الآخر فقط. مرة واحدة.',
    habait: 'ليلًا: اختر لاعبًا ترتبط به. إذا مات بأي سبب، تموت معه فورًا. مرة واحدة.',
  };
  if (extraAbilityText[me.role]) return extraAbilityText[me.role];
  if (roleData.once) {
    const usedMap = {
      cursed: 'cursed_used',
      whisper: 'whisper_used',
      hopebreaker: 'hopebreaker_used',
      phoenix: 'phoenix_used',
      founder: 'founder_used',
      immune_citizen: 'immune_used',
    };
    const key = usedMap[me.role];
    return key && me.usedAbilities?.[key] ? 'تم استخدام القدرة الخاصة.' : 'قدرة خاصة: مرة واحدة.';
  }
  if (me.role === 'doctor') return 'قدرتك الليلية: حماية لاعب من القتل.';
  if (me.role === 'detective') return 'قدرتك الليلية: تحقيق واحد في كل ليلة.';
  if (RoleEngine.isPlayerMafia(me)) return 'فريقك يختار ضحية الليل من بطاقات الطاولة.';
  return '';
}

function getRoleTimingText(me = {}, game = roomData?.game || {}) {
  const role = me.role;
  if (role === 'cursed') return 'الصباح / النقاش / التصويت';
  if (['mafia', 'whisper', 'doctor', 'detective', 'poisoner', 'oathbreaker', 'mad_citizen', 'governor', 'victim', 'poet', 'habait'].includes(role)) {
    return 'الليل';
  }
  if (['cursed', 'founder', 'hopebreaker', 'phoenix'].includes(role)) {
    return 'النقاش / التصويت / التبرير';
  }
  if (ROLES[role]?.passive) return 'دور مستمر';
  return game.phase === 'night' ? 'الليل' : 'النهار';
}

function getRoleTargetTypeText(me = {}) {
  const role = me.role;
  const targetMap = {
    mafia: 'لاعب حي من غير المافيا',
    whisper: 'لاعب حي غير الملعون',
    doctor: 'أي لاعب حي',
    detective: 'لاعب حي غيرك',
    poisoner: 'لاعب حي من غير المافيا',
    oathbreaker: 'لاعب حي غيرك',
    mad_citizen: 'لاعب حي غيرك',
    governor: 'لاعب حي غيرك',
    poet: 'لاعب حي غيرك',
    habait: 'لاعب حي غيرك',
    victim: 'لاعب ميت من غير المافيا',
    cursed: 'لاعب حي غيرك',
    hopebreaker: 'لاعب حي غيرك',
    phoenix: 'لاعب ميت',
    founder: 'الأصوات',
  };
  if (RoleEngine.isPlayerMafia(me)) return targetMap[role] || targetMap.mafia;
  return targetMap[role] || 'لا يوجد هدف مباشر';
}

function findPoisonerTargetId(game = {}, playerId = '') {
  return Object.entries(game.poisoned || {})
    .find(([, data]) => data?.by === playerId)?.[0] || null;
}

function getRoleCurrentTargetText(me = {}, game = roomData?.game || {}, players = roomData?.players || {}) {
  const actions = game.nightActions || {};
  let targetId = null;
  let detail = '';

  if (RoleEngine.isPlayerMafia(me)) targetId = actions.mafiaKills?.[session?.id];
  if (me.role === 'doctor') targetId = actions.doctor_protect;
  if (me.role === 'poisoner') targetId = findPoisonerTargetId(game, session?.id);
  if (me.role === 'oathbreaker') targetId = actions.oathbreakerBypass?.by === session?.id ? actions.oathbreakerBypass.targetId : null;
  if (me.role === 'mad_citizen' && actions.madCitizen?.by === session?.id) {
    targetId = actions.madCitizen.targetId;
    detail = actions.madCitizen.action === 'protect' ? ' - حماية' : ' - ذبح';
  }
  if (me.role === 'poet') {
    targetId = me.usedAbilities?.poetTargetId || game.poetRequests?.[session?.id]?.targetId || null;
    detail = targetId ? ' - كشف متبادل' : '';
  }
  if (me.role === 'habait') {
    targetId = getHabaitLinkedTargetId(me);
    detail = targetId ? ' - ارتباط' : '';
  }
  if ((game.phase === 'voting' || game.phase === 'defense') && isActiveAlive(me)) {
    const voteTarget = game.founderActive && me.role === 'founder'
      ? game.founderVote
      : (game.votes || {})[session?.id];
    if (voteTarget) {
      if (voteTarget === 'skip') return 'تخطي التصويت';
      targetId = voteTarget;
      detail = ' - تصويت';
    }
  }

  const target = targetId ? players[targetId] : null;
  return target ? `${target.name || 'لاعب'}${detail}` : 'لا يوجد';
}

function getOnceAbilityKey(role) {
  const usedMap = {
    cursed: 'cursed_used',
    whisper: 'whisper_used',
    hopebreaker: 'hopebreaker_used',
    phoenix: 'phoenix_used',
    founder: 'founder_used',
    immune_citizen: 'immune_used',
    poisoner: 'poisoner_used',
    oathbreaker: 'oathbreaker_used',
    victim: 'victim_used',
    poet: 'poet_used',
    habait: 'habait_used',
  };
  return usedMap[role] || '';
}

function getRoleAbilityStatusText(me = {}, game = roomData?.game || {}) {
  const roleData = ROLES[me.role] || {};
  const onceKey = getOnceAbilityKey(me.role);
  const phase = game.phase;
  const phoenixCanActFromDeath = me.role === 'phoenix'
    && !me.usedAbilities?.phoenix_used
    && !me.alive
    && isPlayerActive(me)
    && canUsePhoenixAbility(phase);

  if (!isPlayerActive(me)) return 'مشاهدة فقط';
  if (!me.alive && !phoenixCanActFromDeath) return 'غير متاحة بعد الموت';
  if (onceKey && me.usedAbilities?.[onceKey]) return 'تم استخدامها';
  if (me.role === 'detective' && me.usedAbilities?.investigatedRounds?.[String(game.round || 1)]) return 'استخدمت تحقيق هذه الليلة';
  if (me.role === 'governor') {
    if (!isGovernorRevealUnlocked(me)) return 'تُفتح بعد العودة من الموت';
    if (isGovernorRevivedRevealUsed(me)) return 'تم استخدامها';
    return phase === 'night' ? 'متاحة الآن' : 'تنتظر الليل';
  }
  if (['mafia', 'whisper', 'doctor', 'detective', 'poisoner', 'oathbreaker', 'mad_citizen', 'governor', 'victim', 'poet', 'habait'].includes(me.role) || RoleEngine.isPlayerMafia(me)) {
    return phase === 'night' ? 'متاحة الآن' : 'تنتظر الليل';
  }
  if (['cursed', 'hopebreaker', 'founder', 'phoenix'].includes(me.role)) {
    return DAY_ABILITY_PHASES.includes(phase) ? 'متاحة حسب الهدف' : 'تنتظر النهار';
  }
  return roleData.passive ? 'دور سلبي' : 'لا توجد قدرة نشطة';
}

function getRoleUsesText(me = {}, game = roomData?.game || {}) {
  if (me.role === 'detective') return me.usedAbilities?.investigatedRounds?.[String(game.round || 1)] ? '0 / 1 هذه الليلة' : '1 / 1 هذه الليلة';
  if (me.role === 'governor') {
    if (!isGovernorRevealUnlocked(me)) return 'مقفلة';
    return isGovernorRevivedRevealUsed(me) ? '0 / 1 بعد العودة' : '1 / 1 بعد العودة';
  }
  if (['mafia', 'doctor', 'mad_citizen'].includes(me.role)) return 'كل ليلة';
  const onceKey = getOnceAbilityKey(me.role);
  if (onceKey) return me.usedAbilities?.[onceKey] ? '0 / 1' : '1 / 1';
  return (ROLES[me.role] || {}).passive ? 'دائم' : 'لا يوجد';
}

function renderRoleConfirmAction(me = {}, game = roomData?.game || {}) {
  const btn = document.getElementById('v2-role-confirm');
  if (!btn) return;
  btn.hidden = true;
  btn.disabled = false;

  if (me.role === 'founder'
    && !me.usedAbilities?.founder_used
    && isActiveAlive(me)
    && (game.phase === 'discussion' || game.phase === 'voting' || game.phase === 'defense')) {
    btn.hidden = false;
    btn.textContent = 'تجميد الأصوات';
    bindTouchSafeAction(btn, async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      Sound.playAbility();
      await DB.update(`rooms/${session.roomId}/game`, { founderActive: true, founderVote: null });
      await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { founder_used: true });
    });
  }
}

function renderRoleTab(me) {
  if (!me) return;
  const data = getRoleDisplayData(me);
  const v2Img = document.getElementById('v2-role-img');
  const v2Name = document.getElementById('v2-role-name');
  const v2Team = document.getElementById('v2-role-team');
  const v2Fake = document.getElementById('v2-role-fake');
  const v2Desc = document.getElementById('v2-role-desc');
  const v2Ability = document.getElementById('v2-role-ability');
  const v2Timing = document.getElementById('v2-role-timing');
  const v2TargetType = document.getElementById('v2-role-target-type');
  const v2CurrentTarget = document.getElementById('v2-role-current-target');
  const v2Status = document.getElementById('v2-role-status');
  const v2Uses = document.getElementById('v2-role-uses');

  if (v2Img && data.image) v2Img.src = data.image;
  if (v2Name) {
    v2Name.textContent = data.roleName;
    v2Name.style.color = data.color;
  }
  if (v2Team) {
    v2Team.textContent = data.teamText;
    v2Team.style.color = data.color;
  }
  if (v2Fake) {
    v2Fake.textContent = data.fakeText;
    v2Fake.hidden = !data.fakeText;
  }
  if (v2Desc) v2Desc.textContent = data.description;
  if (v2Ability) {
    v2Ability.textContent = data.abilityText || 'لا توجد قدرة نشطة لهذا الدور الآن.';
    v2Ability.hidden = false;
  }
  if (v2Timing) v2Timing.textContent = getRoleTimingText(me);
  if (v2TargetType) v2TargetType.textContent = getRoleTargetTypeText(me);
  if (v2CurrentTarget) v2CurrentTarget.textContent = getRoleCurrentTargetText(me);
  if (v2Status) v2Status.textContent = getRoleAbilityStatusText(me);
  if (v2Uses) v2Uses.textContent = getRoleUsesText(me);
  renderRoleConfirmAction(me);
}

// ── Cast vote ──────────────────────────────────────────────────────────────────
async function castVote(targetId) {
  const me = roomData?.players?.[session.id];
  const game = roomData?.game || {};
  const target = roomData?.players?.[targetId];
  if (!isActiveAlive(me)) { showToast('الأموات لا يصوتون', 'error'); return; }
  if (game.phase !== 'voting' && game.phase !== 'defense') return;

  Sound.playVoteClick();
  if (game.founderActive) {
    if (me.role !== 'founder') { showToast('تم تجميد الأصوات جميعًا', 'info'); return; }
    if (targetId !== 'skip' && !isActiveAlive(target)) return;
    const current = game.founderVote || null;
    await DB.update(`rooms/${session.roomId}/game`, { founderVote: current === targetId ? null : targetId });
    return;
  }

  if (targetId !== 'skip' && !isActiveAlive(target)) return;
  const currentVote = (game.votes || {})[session.id] || null;
  await DB.update(`rooms/${session.roomId}/game/votes`, { [session.id]: currentVote === targetId ? null : targetId });
}

// ── Phoenix passive: see dead roles ───────────────────────────────────────────
function handlePhoenixPassive(players, game) {
  Object.values(players).forEach(p => {
    if (!p.alive && !phoenixDeadSeen[p.id]) {
      phoenixDeadSeen[p.id] = true;
      const roleData = RoleEngine.getRole(p.role);
      setTimeout(() => {
        showToast(`${p.name} كان ${roleData.arabicName}`, 'info', 5000);
      }, 1000);
    }
  });
}

function checkPoetRequest(game, players, me) {
  const pendingEntry = Object.entries(game?.poetRequests || {})
    .find(([, request]) => request?.status === 'pending' && request.targetId === session.id);
  if (!pendingEntry) {
    activePoetRequestKey = null;
    return;
  }

  const [poetId, request] = pendingEntry;
  if (!isPlayerActive(me) || getPlayerStatus(me) === 'kicked' || getPlayerStatus(me) === 'left') return;
  const key = `poet:${poetId}:${request.ts || 0}`;
  if (activePoetRequestKey === key) return;
  activePoetRequestKey = key;
  showPoetRequestPrompt({ ...request, poetId }, players[poetId]);
}

function showPoetRequestPrompt(request, poet) {
  const shell = openActionMenuShell('طلب الشاعر', null);
  if (!shell) return;

  const note = document.createElement('div');
  note.className = 'poet-request-note';
  note.innerHTML = `
    <strong>${escapeHtml(poet?.name || request.poetName || 'الشاعر')}</strong>
    <span>يريد كشفًا متبادلًا خاصًا بينكما فقط.</span>
  `;

  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'action-menu-btn';
  accept.textContent = 'موافقة';
  bindTouchSafeAction(accept, async () => {
    closeActionMenu();
    await respondPoetRequest(request.poetId, true);
  });

  const reject = document.createElement('button');
  reject.type = 'button';
  reject.className = 'action-menu-btn';
  reject.textContent = 'رفض';
  bindTouchSafeAction(reject, async () => {
    closeActionMenu();
    await respondPoetRequest(request.poetId, false);
  });

  shell.cancel.textContent = 'رفض';
  bindTouchSafeAction(shell.cancel, async () => {
    closeActionMenu();
    await respondPoetRequest(request.poetId, false);
  });
  bindTouchSafeAction(shell.overlay, async () => {
    closeActionMenu();
    await respondPoetRequest(request.poetId, false);
  });

  shell.list.append(note, accept, reject);
}

// ── Whisper reveal (passive watcher) ─────────────────────────────────────────
let activeWhisperRevealKey = null;
let whisperRevealTimer = null;

function checkWhisperReveal(game, players) {
  const me = roomData?.players?.[session.id];
  const privateReveals = me?.privateReveals || {};
  const latest = Object.entries(privateReveals)
    .map(([targetId, reveal]) => ({ targetId, ...reveal }))
    .filter(reveal => reveal.round === (game.round || 1))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];

  if (!latest || game.phase !== 'night') {
    hideWhisperReveal();
    activeWhisperRevealKey = null;
    return;
  }

  const elapsed = Math.floor((Date.now() - (latest.ts || Date.now())) / 1000);
  const remaining = Math.max(0, 10 - elapsed);
  if (remaining <= 0) {
    hideWhisperReveal();
    return;
  }

  const key = `private:${latest.round}:${latest.targetId}:${latest.ts || 0}`;
  if (activeWhisperRevealKey === key) return;
  activeWhisperRevealKey = key;
  Sound.playWhisper();
  const target = players[latest.targetId] || { id: latest.targetId, name: latest.targetName, role: latest.shownRole };
  showWhisperReveal({ ...target, role: latest.shownRole }, remaining, latest.shownRole);
}

function showWhisperReveal(player, seconds, shownRole = null) {
  const ov = document.getElementById('whisper-reveal-overlay');
  const img = document.getElementById('whisper-reveal-img');
  const cnt = document.getElementById('whisper-countdown');
  const lbl = document.getElementById('whisper-label');
  if (!ov) return;

  if (whisperRevealTimer) clearInterval(whisperRevealTimer);
  const roleData = RoleEngine.getRole(shownRole || player.role);
  img.src = roleData.image;
  lbl.textContent = `${player.name} — ${roleData.arabicName}`;
  ov.classList.add('active');

  let left = seconds;
  cnt.textContent = left;
  whisperRevealTimer = setInterval(() => {
    left--;
    cnt.textContent = left;
    if (left <= 0) {
      hideWhisperReveal();
    }
  }, 1000);
}

function hideWhisperReveal() {
  if (whisperRevealTimer) {
    clearInterval(whisperRevealTimer);
    whisperRevealTimer = null;
  }
  document.getElementById('whisper-reveal-overlay')?.classList.remove('active');
}

// ── Contextual action menu ────────────────────────────────────────────────────
function positionActionMenu(menu, anchorEl) {
  menu.classList.toggle('bottom-sheet', window.innerWidth <= 700);
  if (window.innerWidth <= 700 || !anchorEl) {
    menu.style.top = '';
    menu.style.left = '';
    return;
  }

  const rect = anchorEl.getBoundingClientRect();
  const isCursedMenu = menu.classList.contains('cursed-menu');
  const width = menu.classList.contains('cursed-menu')
    ? Math.min(360, window.innerWidth - 24)
    : Math.min(260, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
  const top = Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - (isCursedMenu ? 340 : 220)));
  menu.style.width = `${width}px`;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function openActionMenuShell(title, anchorEl) {
  const overlay = document.getElementById('action-menu-overlay');
  const menu = document.getElementById('action-menu');
  const titleEl = document.getElementById('action-menu-title');
  const list = document.getElementById('action-menu-list');
  const cancel = document.getElementById('action-menu-cancel');
  if (!overlay || !menu || !titleEl || !list || !cancel) return null;

  actionMenuBusy = false;
  titleEl.textContent = title;
  list.innerHTML = '';
  menu.classList.remove('cursed-menu');
  cancel.textContent = 'إلغاء';
  overlay.style.display = '';
  menu.style.display = '';
  positionActionMenu(menu, anchorEl);

  bindTouchSafeAction(overlay, closeActionMenu);
  bindTouchSafeAction(cancel, closeActionMenu);
  return { overlay, menu, titleEl, list, cancel };
}

function closeActionMenu() {
  const overlay = document.getElementById('action-menu-overlay');
  const menu = document.getElementById('action-menu');
  if (overlay) overlay.style.display = 'none';
  if (menu) {
    menu.style.display = 'none';
    menu.classList.remove('bottom-sheet');
    menu.style.top = '';
    menu.style.left = '';
    menu.style.width = '';
  }
  actionMenuBusy = false;
}

function showActionMenu(target, actions, anchorEl) {
  const targetInfo = target && typeof target === 'object' ? target : null;
  const shell = openActionMenuShell(targetInfo ? (targetInfo.name || 'لاعب') : target, anchorEl);
  if (!shell) return;

  if (targetInfo) {
    shell.titleEl.innerHTML = `
      <span class="action-menu-target-avatar">${getPlayerPortraitHtml(targetInfo.icon, targetInfo.name, 'action-menu-target-img')}</span>
      <span class="action-menu-target-copy">
        <strong>${escapeHtml(targetInfo.name || 'لاعب')}</strong>
        <small>${escapeHtml(getGameplayPlayerStatusLabel(targetInfo))}</small>
      </span>
    `;
  }

  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className = 'action-menu-btn';
    if (action.className) btn.classList.add(action.className);
    btn.textContent = action.label;
    btn.disabled = !!action.disabled;
    bindTouchSafeAction(btn, async () => {
      if (action.disabled) return;
      if (actionMenuBusy) return;
      actionMenuBusy = true;
      btn.disabled = true;
      closeActionMenu();
      actionMenuBusy = true;
      try {
        await action.fn();
      } catch (error) {
        console.error('Action failed', error);
        showToast('تعذر تنفيذ الإجراء، حاول مرة أخرى', 'error');
      } finally {
        actionMenuBusy = false;
      }
    });
    shell.list.appendChild(btn);
  });
}

function showCursedGuessMenu(target, anchorEl) {
  const shell = openActionMenuShell('تخمين الملعون', anchorEl);
  if (!shell) return;
  shell.menu.classList.add('cursed-menu');
  positionActionMenu(shell.menu, anchorEl);

  let selectedRole = '';
  const targetEl = document.createElement('div');
  targetEl.className = 'cursed-guess-target';
  targetEl.innerHTML = `
    <span class="cursed-guess-kicker">الهدف</span>
    <strong>${escapeHtml(target.name || 'لاعب')}</strong>
  `;

  const hint = document.createElement('div');
  hint.className = 'cursed-menu-hint';
  hint.textContent = 'اختر دور هذا اللاعب';

  const roleWrap = document.createElement('div');
  roleWrap.className = 'cursed-role-options';
  CURSED_GUESS_OPTIONS.forEach(option => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cursed-role-option';
    btn.dataset.role = option.id;
    btn.textContent = option.label;
    bindTouchSafeAction(btn, () => {
      selectedRole = option.id;
      roleWrap.querySelectorAll('.cursed-role-option').forEach(el => el.classList.toggle('selected', el === btn));
      confirm.disabled = false;
    });
    roleWrap.appendChild(btn);
  });

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'action-menu-confirm';
  confirm.textContent = 'تنفيذ التخمين';
  confirm.disabled = true;
  bindTouchSafeAction(confirm, async () => {
    if (!selectedRole) return;
    closeActionMenu();
    await executeCursedGuess(target.id, selectedRole);
  });

  shell.list.append(targetEl, hint, roleWrap, confirm);
}

// ── Chat ───────────────────────────────────────────────────────────────────────
let chatTab = 'public';

function setImportantStyle(el, prop, value) {
  if (!el) return;
  el.style.setProperty(prop, value, 'important');
}

function ensureGameplayChatVisible() {
  if (document.body.dataset.mobileTab !== 'chat') return;

  const panel = document.getElementById('v2-chat-panel');
  const card = panel?.querySelector('.v2-chat-card');
  const tabs = document.getElementById('v2-chat-tabs');
  const messages = document.getElementById('game-chat-messages');
  const inputRow = panel?.querySelector('.chat-input-row');
  const input = document.getElementById('game-chat-input');
  const send = document.getElementById('game-chat-send');
  const lockMsg = document.getElementById('chat-lock-msg');
  const mafiaWrap = document.getElementById('mafia-chat-wrap');

  setImportantStyle(panel, 'display', 'flex');
  setImportantStyle(panel, 'visibility', 'visible');
  setImportantStyle(panel, 'overflow', 'hidden');
  setImportantStyle(card, 'display', 'grid');
  setImportantStyle(card, 'visibility', 'visible');
  setImportantStyle(card, 'height', '100%');
  setImportantStyle(card, 'max-height', '100%');
  setImportantStyle(card, 'overflow', 'hidden');
  setImportantStyle(tabs, 'display', 'grid');
  setImportantStyle(tabs, 'visibility', 'visible');
  setImportantStyle(messages, 'display', 'block');
  setImportantStyle(messages, 'visibility', 'visible');
  setImportantStyle(messages, 'width', 'auto');
  setImportantStyle(messages, 'height', 'auto');
  setImportantStyle(messages, 'max-width', 'none');
  setImportantStyle(messages, 'max-height', 'none');
  setImportantStyle(messages, 'min-height', '0');
  setImportantStyle(messages, 'overflow-y', 'auto');
  setImportantStyle(inputRow, 'display', 'grid');
  setImportantStyle(inputRow, 'visibility', 'visible');
  setImportantStyle(inputRow, 'width', 'auto');
  setImportantStyle(inputRow, 'height', 'auto');
  setImportantStyle(inputRow, 'max-width', 'none');
  setImportantStyle(inputRow, 'max-height', 'none');
  [input, send].forEach(el => {
    setImportantStyle(el, 'display', 'block');
    setImportantStyle(el, 'visibility', 'visible');
    setImportantStyle(el, 'width', 'auto');
    setImportantStyle(el, 'height', 'auto');
    setImportantStyle(el, 'max-width', 'none');
    setImportantStyle(el, 'max-height', 'none');
    setImportantStyle(el, 'pointer-events', 'auto');
  });
  if (lockMsg && !lockMsg.classList.contains('lock-visible')) {
    setImportantStyle(lockMsg, 'display', 'none');
  }
  if (mafiaWrap && !mafiaWrap.classList.contains('mafia-visible')) {
    setImportantStyle(mafiaWrap, 'display', 'none');
  }
}

function initChatTabs() {
  document.getElementById('tab-public')?.addEventListener('click', () => {
    chatTab = 'public';
    updateChatTabs();
    updateChatAvailability();
    renderPublicChat(latestPublicChatData, latestMafiaChatData);
    ensureGameplayChatVisible();
  });
  document.getElementById('tab-mafia')?.addEventListener('click', () => {
    chatTab = 'mafia';
    updateChatTabs();
    updateChatAvailability();
    renderPublicChat(latestPublicChatData, latestMafiaChatData);
    ensureGameplayChatVisible();
  });
}

function updateChatTabs() {
  const me = roomData?.players?.[session?.id];
  const showMafia = me && isPlayerActive(me) && RoleEngine.isPlayerMafia(me);
  if (!showMafia && chatTab === 'mafia') chatTab = 'public';
  document.getElementById('tab-public')?.classList.toggle('active', chatTab === 'public');
  const mafiaTab = document.getElementById('tab-mafia');
  if (mafiaTab) {
    mafiaTab.classList.toggle('active', chatTab === 'mafia');
    if (showMafia) {
      mafiaTab.style.removeProperty('display');
    } else {
      mafiaTab.style.setProperty('display', 'none', 'important');
    }
  }
  const mafiaWrap = document.getElementById('mafia-chat-wrap');
  if (mafiaWrap) {
    mafiaWrap.classList.toggle('mafia-visible', !!showMafia);
    mafiaWrap.setAttribute('aria-hidden', showMafia ? 'false' : 'true');
  }
}

function lockPublicChat(locked) {
  updateChatAvailability();
}

function updateChatAvailability(phase = roomData?.game?.phase, me = roomData?.players?.[session?.id]) {
  const inp = document.getElementById('game-chat-input');
  const btn = document.getElementById('game-chat-send');
  const lockMsg = document.getElementById('chat-lock-msg');
  if (!inp) return;

  const inactive = !me || !isPlayerActive(me);
  const isDead = !me?.alive;
  const isMafia = me && isPlayerActive(me) && RoleEngine.isPlayerMafia(me);
  const mafiaLocked = chatTab === 'mafia' && (!isMafia || phase !== 'night');
  const locked = inactive || isDead || mafiaLocked;

  inp.disabled = locked;
  if (btn) btn.disabled = locked;
  if (lockMsg) {
    lockMsg.textContent = inactive
      ? 'لا يمكنك الدردشة من هذه الحالة'
      : isDead
      ? '⚰ الأموات يشاهدون فقط'
      : mafiaLocked
        ? '🔒 دردشة المافيا ليلاً فقط'
        : '';
    lockMsg.classList.toggle('lock-visible', !!locked);
    lockMsg.style.display = locked ? 'block' : 'none';
  }
}

function initChatSend() {
  if (window.__gameChatSendInitialized) return;
  window.__gameChatSendInitialized = true;
  document.getElementById('game-chat-send')?.addEventListener('click', sendGameChat);
  document.getElementById('game-chat-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendGameChat(); });
}

async function sendGameChat() {
  const inp = document.getElementById('game-chat-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || text.length > 200) return;
  const me = roomData?.players?.[session.id];
  if (!me || !isPlayerActive(me)) { showToast('لا يمكنك إرسال رسائل من هذه الحالة', 'error'); return; }
  if (!me.alive) { showToast('الأموات لا يتحدثون', 'error'); return; }

  inp.value = '';

  const msgData = {
    playerId: session.id,
    name: me.name,
    icon: me.icon,
    text,
    ts: DB.timestamp(),
    type: chatTab,
  };

  if (chatTab === 'mafia' && !RoleEngine.isPlayerMafia(me)) {
    showToast('هذه القناة للمافيا فقط', 'error'); return;
  }

  const phase = roomData?.game?.phase;
  if (chatTab === 'mafia' && phase !== 'night') {
    showToast('دردشة المافيا في الليل فقط', 'error'); return;
  }

  const path = chatTab === 'mafia'
    ? `rooms/${session.roomId}/game/mafiaChat`
    : `rooms/${session.roomId}/game/chat`;

  await DB.push(path, msgData);
}

function renderPublicChat(chatData, mafiaData) {
  const container = document.getElementById('game-chat-messages');
  if (!container) return;

  const me = roomData?.players?.[session.id];
  const showMafia = me && isPlayerActive(me) && RoleEngine.isPlayerMafia(me);

  let msgs = Object.values(chatData).map(m => ({...m, channel:'public'}));
  if (showMafia && chatTab === 'mafia') {
    msgs = Object.values(mafiaData).map(m => ({...m, channel:'mafia'}));
  }

  msgs.sort((a,b) => (a.ts||0)-(b.ts||0));

  container.innerHTML = '';
  if (msgs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'chat-empty-state';
    empty.textContent = chatTab === 'mafia'
      ? 'لا توجد رسائل مافيا بعد'
      : 'لا توجد رسائل بعد';
    container.appendChild(empty);
    updateChatTabs();
    ensureGameplayChatVisible();
    return;
  }

  msgs.forEach(msg => {
    const div = document.createElement('div');
    div.className = `chat-msg${msg.channel==='mafia'?' mafia-chat':''}${msg.type==='system'?' system':''}`;
    if (msg.type === 'system') {
      div.innerHTML = `<span class="text">⚙ ${escapeHtml(msg.text)}</span>`;
    } else {
      div.innerHTML = `
        <span class="icon">${getPlayerPortraitHtml(msg.icon, msg.name, 'chat-portrait')}</span>
        <span class="name">${escapeHtml(msg.name)}:</span>
        <span class="text">${escapeHtml(msg.text)}</span>
      `;
    }
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;

  // Mafia chat tab visibility
  const mafiaTab = document.getElementById('tab-mafia');
  if (mafiaTab) mafiaTab.style.display = showMafia ? '' : 'none';
  updateChatTabs();
  ensureGameplayChatVisible();
}

// ── Mafia chat in action panel ─────────────────────────────────────────────────
function renderMafiaChat(data) { /* Handled in main chat */ }

// ── Persistent room points ─────────────────────────────────────────────────────
async function awardWinPoints(game = {}, players = {}) {
  if (!game.winner || game.pointsAwarded || winPointsAwardPending || !isHost) return;
  winPointsAwardPending = true;

  try {
    const updates = {
      'game/pointsAwarded': true,
    };

    Object.entries(players).forEach(([playerId, player]) => {
      const p = { ...player, id: player.id || playerId };
      if (!isPlayerEligibleForWinCredit(p, game.winner)) return;

      const totalWins = getBestNumericStat(p, ['wins', 'totalWins', 'points']) + 1;
      updates[`players/${p.id}/wins`] = totalWins;
      updates[`players/${p.id}/totalWins`] = totalWins;
      updates[`players/${p.id}/points`] = totalWins;

      if (game.winner === 'mafia') {
        updates[`players/${p.id}/mafiaWins`] = getBestNumericStat(p, ['mafiaWins', 'mafia_wins']) + 1;
      } else if (game.winner === 'citizens') {
        updates[`players/${p.id}/citizenWins`] = getBestNumericStat(p, ['citizenWins', 'citizensWins', 'citizen_wins']) + 1;
      }
    });

    await DB.update(`rooms/${session.roomId}`, updates);
  } catch (error) {
    console.error('Failed to award win points', error);
    winPointsAwardPending = false;
  }
}

function getBestNumericStat(player = {}, keys = []) {
  return keys.reduce((best, key) => {
    const value = Number(player?.[key]);
    return Number.isFinite(value) ? Math.max(best, value) : best;
  }, 0);
}

function getProjectedWinStats(player = {}, winner, includePendingWin = false) {
  const earned = includePendingWin && isPlayerEligibleForWinCredit(player, winner) ? 1 : 0;
  const totalWins = getBestNumericStat(player, ['wins', 'totalWins', 'points']) + earned;
  const mafiaWins = getBestNumericStat(player, ['mafiaWins', 'mafia_wins']) + (winner === 'mafia' && earned ? 1 : 0);
  const citizenWins = getBestNumericStat(player, ['citizenWins', 'citizensWins', 'citizen_wins']) + (winner === 'citizens' && earned ? 1 : 0);
  return { totalWins, mafiaWins, citizenWins };
}

function getWinnerLabel(winner) {
  if (winner === 'citizens') return { title: 'انتصر المواطنون!', subtitle: 'الحقيقة نجت، والقرية استعادت صوتها.', className: 'citizens', team: 'المواطنون' };
  if (winner === 'mafia') return { title: 'انتصرت المافيا!', subtitle: 'الظلام سيطر على الطاولة.', className: 'mafia', team: 'المافيا' };
  if (winner === 'eclipse') return { title: 'Eclipse يفوز!', subtitle: 'الضحية تحولت إلى بطل منفرد.', className: 'eclipse', team: 'Eclipse' };
  return { title: 'انتهت اللعبة', subtitle: '', className: '', team: 'غير محدد' };
}

function isPlayerEligibleForWinCredit(player, winner) {
  if (!player || !winner || !isPlayerActive(player)) return false;
  if (winner === 'mafia') return RoleEngine.isPlayerMafia(player);
  if (winner === 'citizens') return RoleEngine.getPlayerTeam(player) === 'citizens';
  if (winner === 'eclipse') return player.role === 'eclipse';
  return false;
}

function isPlayerOnWinningSide(player, winner) {
  return isPlayerEligibleForWinCredit(player, winner);
}

function getFinalPlayerStatus(player) {
  const status = getPlayerStatus(player);
  if (status === 'kicked') return 'مطرود';
  if (status === 'left') return 'غادر';
  return player.alive ? 'حي' : 'ميت';
}

async function hostReturnToLobby() {
  if (!isHost || !session?.roomId || !roomData) return;
  const players = roomData.players || {};
  const updates = {
    [`rooms/${session.roomId}/status`]: 'lobby',
    [`rooms/${session.roomId}/game/phase`]: 'lobby',
    [`rooms/${session.roomId}/game/timerEndsAt`]: 0,
    [`rooms/${session.roomId}/game/winner`]: null,
    [`rooms/${session.roomId}/game/nightActions`]: {},
    [`rooms/${session.roomId}/game/votes`]: {},
    [`rooms/${session.roomId}/game/founderActive`]: false,
    [`rooms/${session.roomId}/game/founderVote`]: null,
    [`rooms/${session.roomId}/game/mafiaSharedReveals`]: {},
  };

  Object.entries(players).forEach(([playerId, player]) => {
    if (!isPlayerActive({ ...player, id: player.id || playerId })) return;
    updates[`rooms/${session.roomId}/players/${playerId}/ready`] = false;
    updates[`rooms/${session.roomId}/players/${playerId}/alive`] = true;
    updates[`rooms/${session.roomId}/players/${playerId}/usedAbilities`] = {};
    updates[`rooms/${session.roomId}/players/${playerId}/${GOVERNOR_REVIVE_UNLOCK_KEY}`] = false;
  });

  await db.ref().update(updates);
  window.location.href = `lobby.html?room=${encodeURIComponent(session.roomId)}`;
}

function showWinScreen(winner, players) {
  if (winScreenShown) return;
  winScreenShown = true;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  const ws = document.getElementById('win-screen');
  const title = document.getElementById('win-title');
  const sub = document.getElementById('win-subtitle');
  const rolesDiv = document.getElementById('win-roles-reveal');
  const countdown = document.getElementById('win-redirect-countdown');
  const returnBtn = document.getElementById('win-return-lobby');
  const label = getWinnerLabel(winner);
  const includePendingWin = !roomData?.game?.pointsAwarded;

  title.textContent = label.title;
  title.className = `win-title ${label.className}`;
  sub.textContent = `${label.subtitle} الفريق الفائز: ${label.team}`;

  rolesDiv.innerHTML = '';
  Object.entries(players || {})
    .map(([id, player]) => ({ ...player, id: player.id || id }))
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0))
    .forEach(player => {
      const roleData = RoleEngine.getRole(player.role);
      const item = document.createElement('article');
      const isWinner = isPlayerOnWinningSide(player, winner);
      const status = getFinalPlayerStatus(player);
      const stats = getProjectedWinStats(player, winner, includePendingWin);
      item.className = `win-role-item ${isWinner ? 'is-winner' : ''}`;
      item.innerHTML = `
        <span class="icon">${getPlayerPortraitHtml(player.icon, player.name, 'player-portrait-mini')}</span>
        <span class="name">${escapeHtml(player.name)}${player.id === session.id ? ' (أنت)' : ''}</span>
        <img class="win-role-card" src="${roleData.image}" alt="${escapeHtml(roleData.arabicName)}" loading="lazy" decoding="async">
        <span class="role" style="color:${roleData.color}">${roleData.arabicName}</span>
        <span class="win-player-state">${status}</span>
        <span class="win-player-stats" aria-label="إحصائيات الفوز">
          <span class="win-player-stat-chip stat-total"><b>${stats.totalWins}</b><small>الفوز</small></span>
          <span class="win-player-stat-chip stat-mafia"><b>${stats.mafiaWins}</b><small>مافيا</small></span>
          <span class="win-player-stat-chip stat-citizens"><b>${stats.citizenWins}</b><small>مواطن</small></span>
        </span>
        ${isWinner ? '<span class="win-badge-small">فائز</span>' : ''}
      `;
      rolesDiv.appendChild(item);
    });

  if (returnBtn) {
    returnBtn.style.display = isHost ? '' : 'none';
    returnBtn.onclick = hostReturnToLobby;
  }

  if (countdown) {
    countdown.textContent = isHost
      ? 'يمكن للمضيف إعادة الجميع إلى اللوبي عندما تكونون جاهزين.'
      : 'بانتظار المضيف لإعادة اللاعبين إلى اللوبي.';
  }

  ws.classList.add('active');
  Sound.playDeathHit();
}
function escapeHtml(str) {
  return String(str||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Boot ───────────────────────────────────────────────────────────────────────
initGame();



