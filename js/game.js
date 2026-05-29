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

const DAY_ABILITY_PHASES = ['morning', 'day', 'discussion', 'voting', 'defense'];
const TARGET_DAY_ABILITY_PHASES = ['discussion', 'voting', 'defense'];
const CURSED_SUCCESS_ROLES = ['doctor', 'detective', 'eclipse'];
const CURSED_MENU_ROLES = Object.keys(ROLES);
const EVENT_REPLAY_MAX_AGE_MS = 8000;
const EVENT_ANNOUNCEMENT_DURATION_MS = 3200;
const VOTE_RESULT_EVENT_TYPES = ['execution', 'skip', 'tie', 'no_votes'];
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
  return target.role === 'liar' ? getPlayerLiarFakeRole(target) : target.role;
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
  Effects.init();
  addFog();
  initSoundButton();
  initChatTabs();
  initChatSend();

  unsubRoom = DB.on(`rooms/${session.roomId}`, onRoomUpdate);

  setTimeout(hideLoading, 1200);
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
  const phase = game.phase;
  const players = data.players || {};
  updatePhaseHeader(phase, game, me);

  // Check winner
  if (game.winner) { showWinScreen(game.winner, players); return; }

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
  updateTableSkipButton(game, me);
  renderBottomActionBar(game, me);

  // Render action panel
  renderActionPanel(phase, game, me, players);

  // Render chat
  renderPublicChat(game.chat || {}, game.mafiaChat || {});
  updateChatAvailability(phase, me);

  // Global one-shot reveals/notices
  checkFounderFreezeNotice(game);
  checkWhisperReveal(game, players);

  // Phoenix: see dead roles
  if (myRole === 'phoenix') handlePhoenixPassive(players, game);
}

// ── Phase change handler ───────────────────────────────────────────────────────
function handlePhaseChange(phase, game, me, players, options = {}) {
  const gameBg = document.getElementById('game-bg');
  const suppressCinematic = !!options.suppressCinematic;

  if (phase === 'night') {
    gameBg.className = 'game-bg night';
    Effects.setNight();
    if (!suppressCinematic) showCinematic('حلّ الليل...', 'ابقَ هادئاً واستمع للظلام', 2500);
    lockPublicChat(true);
    const timerWrap = document.getElementById('timer-wrap');
    if (timerWrap) timerWrap.style.display = '';

  } else if (phase === 'morning' || phase === 'day') {
    gameBg.className = 'game-bg day';
    Effects.setDay();

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
  const phaseHeader = document.getElementById('phase-header');
  const roundBadge = document.getElementById('phase-round-badge');
  const indicator = document.getElementById('phase-indicator');
  const spectateBanner = document.getElementById('spectate-banner');
  const phaseClass = phase || '';

  if (phaseLabel) {
    phaseLabel.textContent = PHASE_ARABIC_NAMES[phase] || phase || 'تحميل...';
    phaseLabel.className = `phase-label ${phaseClass}`;
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
    const result = resolveNightActions(game.nightActions || {}, players);
    const deathKey = `rooms/${session.roomId}/game/deathLog/round_${round}`;

    if (result.killed) {
      updates[`rooms/${session.roomId}/players/${result.killed}/alive`] = false;
    }
    if (result.immuneConsumed) {
      updates[`rooms/${session.roomId}/players/${result.immuneConsumed}/usedAbilities/immune_used`] = true;
    }
    updates[deathKey] = result;

    // Check win
    const updatedPlayers = JSON.parse(JSON.stringify(players));
    if (result.killed && updatedPlayers[result.killed]) updatedPlayers[result.killed].alive = false;
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
    updates[`rooms/${session.roomId}/game/whisperReveal`] = null;

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

      // Eclipse solo win
      if (victimRole === 'eclipse') {
        updates[`rooms/${session.roomId}/game/winner`] = 'eclipse';
        updates[`rooms/${session.roomId}/status`] = 'ended';
        updates[`rooms/${session.roomId}/players/${result.executed}/alive`] = false;
        await db.ref().update(updates);
        return;
      }

      updates[`rooms/${session.roomId}/players/${result.executed}/alive`] = false;

      // Hopebreaker reveal
      if (victimRole === 'hopebreaker') {
        // No special action needed, already dead
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
    const updatedPlayers = JSON.parse(JSON.stringify(players));
    if (result.executed && updatedPlayers[result.executed]) updatedPlayers[result.executed].alive = false;
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
    updates[`rooms/${session.roomId}/game/founderActive`] = false;
    updates[`rooms/${session.roomId}/game/founderVote`] = null;
  }

  await db.ref().update(updates);
}

// ── Night Action Resolution ────────────────────────────────────────────────────
function resolveNightActions(actions, players) {
  const mafiaKill = selectMafiaKillTarget(actions, players);
  const doctorProtect = actions.doctor_protect;

  let killed = null;
  let protected_ = false;
  let immuneConsumed = null;

  if (mafiaKill) {
    const target = players[mafiaKill];
    if (isActiveAlive(target)) {
      if (doctorProtect === mafiaKill) {
        protected_ = true;
      } else if (target.role === 'immune_citizen' && !target.usedAbilities?.immune_used) {
        protected_ = true;
        immuneConsumed = mafiaKill;
      } else {
        killed = mafiaKill;
      }
    }
  }

  return { killed, protected: protected_, immuneConsumed, mafiaTarget: mafiaKill || null };
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

  const tally = {};
  Object.values(validChoices).forEach(targetId => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  const majority = Math.floor(livingMafia.length / 2) + 1;
  for (const [targetId, count] of Object.entries(tally)) {
    if (count >= majority) return targetId;
  }

  const leader = livingMafia.find(p => p.role === 'cursed')
    || livingMafia.find(p => p.isMafiaLeader)
    || livingMafia[0];
  return validChoices[leader.id] || null;
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
  return TARGET_DAY_ABILITY_PHASES.includes(phase);
}

function canUsePhoenixAbility(phase) {
  return DAY_ABILITY_PHASES.includes(phase);
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
  const result = target?.role === 'liar'
    ? 'مواطن'
    : (RoleEngine.isPlayerMafia(target) ? '⚔ مافيا' : '✓ ليس مافيا');
  showCinematic(result, `نتيجة التحقيق عن ${target.name}`, 3000);
}

async function useWhisperOnTarget(targetPlayerId) {
  const game = roomData?.game || {};
  const target = roomData?.players?.[targetPlayerId];
  if (!target) return;
  const shownRole = getWhisperVisibleRole(target);
  const ts = Date.now();
  Sound.playWhisper();
  await DB.update(`rooms/${session.roomId}/players/${session.id}/privateReveals/${targetPlayerId}`, {
    shownRole,
    targetName: target.name,
    round: game.round || 1,
    ts,
  });
  await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { whisper_used: true });
  showWhisperReveal({ ...target, role: shownRole }, 10, shownRole);
  showToast(`رأيت بطاقة ${target.name}: ${RoleEngine.getRoleArabicName(shownRole)}`, 'info', 5000);
}

async function useHopebreakerOnTarget(targetPlayerId) {
  const target = roomData?.players?.[targetPlayerId];
  if (!isActiveAlive(target)) return;
  Sound.playAbility();
  const isMafia = RoleEngine.isPlayerMafia(target);
  if (isMafia) {
    showCinematic('الأمل آخر شيء يختفي... وهو أول شيء يدمره.', `${target.name} هو ${RoleEngine.getRoleArabicName(target.role)} — مات فوراً`, 4000);
    const updates = {};
    const chatKey = DB.generateId();
    updates[`rooms/${session.roomId}/players/${target.id}/alive`] = false;
    updates[`rooms/${session.roomId}/players/${session.id}/usedAbilities/hopebreaker_used`] = true;
    updates[`rooms/${session.roomId}/game/revealedRoles/${target.id}`] = target.role;
    updates[`rooms/${session.roomId}/game/chat/${chatKey}`] = {
      playerId: 'system', name: 'النظام', icon: 'owl',
      text: `الأمل آخر شيء يختفي... وهو أول شيء يدمره. محطم الآمال كشف ${target.name}: ${RoleEngine.getRoleArabicName(target.role)} — مات فوراً.`,
      ts: DB.timestamp(), type: 'system',
    };
    await db.ref().update(updates);
  } else {
    showCinematic('محطم الآمال مات', 'لم يُكشف أحد.', 3500);
    await DB.update(`rooms/${session.roomId}/players/${session.id}`, { alive: false });
    await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { hopebreaker_used: true });
  }
}

async function usePhoenixOnTarget(targetPlayerId) {
  const target = roomData?.players?.[targetPlayerId];
  if (!target || target.alive || !isPlayerActive(target)) return;
  Sound.playAbility();
  showCinematic('عاد من الموت...', `${target.name} لكنه لم يعد كما كان.`, 3500);
  await DB.update(`rooms/${session.roomId}/players/${target.id}`, { alive: true });
  await DB.update(`rooms/${session.roomId}/game/votes`, { [target.id]: null });
  await DB.update(`rooms/${session.roomId}/players/${session.id}`, { team: RoleEngine.getPlayerTeam(target) });
  await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { phoenix_used: true });
}

async function executeCursedGuess(targetPlayerId, guessRole) {
  const players = roomData?.players || {};
  const game = roomData?.game || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  if (!isActiveAlive(me) || me.role !== 'cursed' || me.usedAbilities?.cursed_used) return;
  if (!canUseCursedAbility(game.phase)) return;
  if (targetPlayerId === session.id) return;
  if (!isActiveAlive(target) || !ROLES[guessRole]) return;

  Sound.playCrystalCrack();
  Effects.screenShake();
  const isValidCursedJudgment = target.role === guessRole && CURSED_SUCCESS_ROLES.includes(guessRole);
  if (isValidCursedJudgment) {
    showCinematic('أصبت! 💀', `${target.name} هو ${RoleEngine.getRoleArabicName(guessRole)}`, 3000);
    await DB.update(`rooms/${session.roomId}/players/${targetPlayerId}`, { alive: false });
  } else {
    showCinematic('أخطأت! 💀', 'الملعون دفع الثمن بنفسه...', 3000);
    await DB.update(`rooms/${session.roomId}/players/${session.id}`, { alive: false });
  }
  await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { cursed_used: true });
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

  await db.ref().update(updates);
  showToast('تم طرد اللاعب من الغرفة', 'info');
}

function handlePlayerTargetClick(targetPlayerId, anchorEl = null) {
  const game = roomData?.game || {};
  const phase = game.phase;
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  const actions = [];

  if (!me?.alive || !isPlayerActive(me)) {
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
    && !targetIsAlive
    && !targetIsSelf;

  if (!targetIsAlive && !canPhoenixRevive) return;
  if (targetIsSelf && !(phase === 'night' && me.role === 'doctor')) return;

  const nightActions = game.nightActions || {};

  if (phase === 'night' && RoleEngine.isPlayerMafia(me) && targetIsAlive && !RoleEngine.isPlayerMafia(target)) {
    const selected = nightActions.mafiaKills?.[session.id] === targetPlayerId;
    actions.push({
      label: selected ? 'إلغاء الاختيار' : 'قتل',
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

  if (phase === 'night' && me.role === 'whisper' && !me.usedAbilities?.whisper_used && targetIsAlive && !targetIsSelf && target.role !== 'cursed') {
    actions.push({ label: 'هَمس', fn: () => useWhisperOnTarget(targetPlayerId) });
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

  if (canUseCursedAbility(phase) && me.role === 'cursed' && !me.usedAbilities?.cursed_used && targetIsAlive && !targetIsSelf) {
    actions.push({ label: 'قدرة الملعون', fn: () => showCursedGuessMenu(target, anchorEl) });
  }

  if (actions.length === 0) return;
  const enabledActions = actions.filter(action => !action.disabled);
  if (phase !== 'night' && actions.length === 1 && enabledActions.length === 1) {
    actions[0].fn();
    return;
  }
  showActionMenu(target.name, actions, anchorEl);
}

// ── Render table players ───────────────────────────────────────────────────────
function renderGameTable(players, game) {
  const ring = document.getElementById('game-players-ring');
  if (!ring) return;
  ring.innerHTML = '';

  {
    const pArr = Object.values(players);
    const count = pArr.length;
    if (count === 0) return;

    const positions = getSeatPositions(count, 50, 50, 41, 33);
    const votes = game?.votes || {};
    const voteTally = getVoteTally(game, players);
    const me = players[session.id];
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
      const publicRevealedRole = game.revealedRoles?.[p.id];
      const revealedRole = publicRevealedRole === 'liar' ? null : publicRevealedRole;
      const voteCount = voteTally[p.id] || 0;
      const seatNumber = p.seat !== undefined && p.seat !== null ? Number(p.seat) + 1 : i + 1;
      const statusLabel = status === 'kicked' ? 'مطـرود' : status === 'left' ? 'غادر' : '';
      const canClick = isActiveAlive(me) && isActive && (p.alive || (me?.role === 'phoenix' && canUsePhoenixAbility(phase)));

      const seat = document.createElement('button');
      seat.type = 'button';
      seat.className = [
        'player-table-card',
        p.id === session.id ? 'is-me' : '',
        !p.alive ? 'is-dead' : '',
        status === 'kicked' ? 'is-kicked' : '',
        status === 'left' ? 'is-left' : '',
        canClick ? 'selectable-target' : '',
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
          <img class="ptc-portrait" src="${getPlayerPortrait(p.icon)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="this.src='${PLAYER_PORTRAIT_FALLBACK}'">
          <span class="ptc-status-dot ${isActive ? 'online' : 'offline'}"></span>
          ${!p.alive ? '<span class="ptc-dead-overlay">☠</span>' : ''}
          ${voteCount ? `<span class="ptc-vote-badge">${voteCount}</span>` : ''}
          ${iAmMafia && targetIsMafia && p.id !== session.id ? '<span class="ptc-private-badge" title="زميل مافيا">⚔</span>' : ''}
        </span>
        <span class="ptc-name">${escapeHtml(p.name)}${p.id === session.id ? ' (أنت)' : ''}</span>
        ${statusLabel ? `<span class="ptc-status-text">${statusLabel}</span>` : ''}
        ${revealedRole ? `<span class="ptc-revealed-role" style="color:${RoleEngine.getRoleColor(revealedRole)};">${RoleEngine.getRoleArabicName(revealedRole)}</span>` : ''}
      `;

      if (me?.isHost && p.id !== session.id && !p.isHost && status !== 'kicked' && status !== 'left') {
        const kickBtn = document.createElement('span');
        kickBtn.className = 'ptc-kick-btn';
        kickBtn.textContent = 'طرد';
        kickBtn.title = `طرد ${p.name}`;
        kickBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          showActionMenu('إدارة اللاعب', [
            { label: `طرد ${p.name}`, fn: () => kickPlayer(p.id) }
          ], seat);
        });
        seat.appendChild(kickBtn);
      }

      seat.addEventListener('click', () => handlePlayerTargetClick(p.id, seat));
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

    const publicRevealedRole = game.revealedRoles?.[p.id];
    const revealedRole = publicRevealedRole === 'liar' ? null : publicRevealedRole;

    seat.innerHTML = `
      <div class="legacy-seat-avatar" title="${escapeHtml(p.name)}">${getPlayerPortraitHtml(p.icon, p.name, 'gps-portrait')}</div>
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
      badge.textContent = '⚔';
      badge.title = 'زميل مافيا';
      seat.appendChild(badge);
    }

    if (me?.isHost && p.id !== session.id && !p.isHost && status !== 'kicked' && status !== 'left') {
      const kickBtn = document.createElement('button');
      kickBtn.type = 'button';
      kickBtn.className = 'gps-kick-btn';
      kickBtn.textContent = 'طرد';
      kickBtn.title = `طرد ${p.name}`;
      kickBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        showActionMenu('إدارة اللاعب', [
          { label: `طرد ${p.name}`, fn: () => kickPlayer(p.id) }
        ], kickBtn);
      });
      seat.appendChild(kickBtn);
    }

    seat.style.cursor = 'pointer';
    seat.addEventListener('click', () => handlePlayerTargetClick(p.id, seat));

    ring.appendChild(seat);
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

function renderActionPanel(phase, game, me, players) {
  // Role card
  renderMyRole(me);

  // Dead banner
  const deadBanner = document.getElementById('dead-banner');
  const myStatus = getPlayerStatus(me);
  if (!isPlayerActive(me) || !me.alive) {
    deadBanner.style.display = '';
    deadBanner.textContent = myStatus === 'kicked'
      ? 'تم طردك من الغرفة'
      : myStatus === 'left'
        ? 'غادرت الغرفة — يمكنك المشاهدة فقط'
        : '⚰ أنت ميت — يمكنك المشاهدة فقط';
  } else {
    deadBanner.style.display = 'none';
  }

  // Night actions
  const nightSection = document.getElementById('night-action-section');
  const votingSection = document.getElementById('voting-section');
  const abilitySection = document.getElementById('ability-section');

  nightSection.style.display = 'none';
  votingSection.style.display = 'none';
  abilitySection.style.display = 'none';

  if (!isActiveAlive(me)) return;

  if (phase === 'voting' || phase === 'defense') {
    // Voting is handled by table-card clicks plus the bottom action bar.
  }

  // Day abilities (Cursed, Founder, Hopebreaker, Phoenix)
  if (DAY_ABILITY_PHASES.includes(phase)) {
    renderDayAbilities(game, me, players);
  }
}

// ── Role Card in Panel ─────────────────────────────────────────────────────────
function renderMyRole(me) {
  const img = document.getElementById('my-role-img');
  const name = document.getElementById('my-role-name');
  const team = document.getElementById('my-role-team');
  if (!img) return;

  const roleData = RoleEngine.getRole(me.role);
  if (me.role === 'liar') {
    const fakeRole = getPlayerLiarFakeRole(me);
    img.src = getLiarDisplayCard(me);
    name.textContent = 'دورك: الكذاب';
    team.innerHTML = `
      <span class="liar-fake-line">الكذبة الحالية: ${RoleEngine.getRoleArabicName(fakeRole)}</span>
      <small class="liar-role-desc">${roleData.description}</small>
    `;
    name.style.color = roleData.color;
    return;
  }
  img.src = roleData.image;
  name.textContent = roleData.arabicName;
  team.textContent = me.team === 'mafia' ? '⚔ فريق المافيا' : me.team === 'neutral' ? '⚖ محايد' : '🛡 المواطنون';
  name.style.color = roleData.color;
}

// ── Night Actions ──────────────────────────────────────────────────────────────
function renderNightActions(game, me, players) {
  const section = document.getElementById('night-action-section');
  const list = document.getElementById('night-target-list');
  if (!section || !list) return;

  const alivePlayers = Object.values(players).filter(p => isActiveAlive(p) && p.id !== session.id);
  const actions = game.nightActions || {};
  const myRoleId = me.role;

  // Mafia actions
  if (RoleEngine.isPlayerMafia(me)) {
    section.style.display = '';
    section.querySelector('h4').textContent = '🔪 أفعال المافيا الليلية';

    // Mafia chat
    document.getElementById('mafia-chat-wrap').style.display = '';
    renderMafiaChat(game.mafiaChat || {});

    const mafiaChoices = actions.mafiaKills || {};
    const myChoice = mafiaChoices[session.id];
    list.innerHTML = '';
    const killLabel = document.createElement('div');
    killLabel.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;';
    killLabel.textContent = 'اختر ضحية المافيا:';
    list.appendChild(killLabel);

    const targets = alivePlayers.filter(p => !RoleEngine.isPlayerMafia(p));
    if (targets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'skill-used-badge';
      empty.textContent = 'لا يوجد هدف متاح';
      list.appendChild(empty);
    }

    targets.forEach(p => {
      const btn = document.createElement('button');
      btn.className = `target-btn${myChoice === p.id ? ' selected' : ''}`;
      btn.innerHTML = `<span class="t-icon">${getPlayerPortraitHtml(p.icon, p.name, 'target-portrait')}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', () => chooseMafiaKill(p.id));
      list.appendChild(btn);
    });

    appendMafiaChoices(list, players, mafiaChoices);
    appendWhisperAbility(list, game, me, players);
    return;
  }

  // Doctor
  if (myRoleId === 'doctor') {
    section.style.display = '';
    section.querySelector('h4').textContent = '💉 احمِ أحد اللاعبين الليلة';
    const doctorProtect = actions.doctor_protect;
    list.innerHTML = '';
    // Doctor can protect self
    const allAlive = Object.values(players).filter(p => isActiveAlive(p));
    allAlive.forEach(p => {
      const btn = document.createElement('button');
      btn.className = `target-btn${doctorProtect === p.id ? ' selected' : ''}`;
      btn.innerHTML = `<span class="t-icon">${getPlayerPortraitHtml(p.icon, p.name, 'target-portrait')}</span><span class="t-name">${escapeHtml(p.name)}${p.id===session.id?' (أنت)':''}</span>`;
      btn.addEventListener('click', () => chooseDoctorProtect(p.id));
      list.appendChild(btn);
    });
    return;
  }

  // Detective
  if (myRoleId === 'detective') {
    section.style.display = '';
    section.querySelector('h4').textContent = '🔍 تحقق من هوية لاعب';
    const roundKey = String(game.round || 1);
    const investigated = me.usedAbilities?.investigatedRounds?.[roundKey];
    if (investigated) {
      list.innerHTML = `<div style="font-size:13px;color:rgba(255,255,255,0.5);text-align:center;padding:10px;">استخدمت فحصك لهذه الليلة</div>`;
      section.style.display = '';
      return;
    }
    list.innerHTML = '';
    alivePlayers.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.innerHTML = `<span class="t-icon">${getPlayerPortraitHtml(p.icon, p.name, 'target-portrait')}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', () => investigatePlayer(p.id));
      list.appendChild(btn);
    });
    return;
  }
}

function appendMafiaChoices(list, players, mafiaChoices) {
  const mafiaPlayers = Object.values(players)
    .filter(p => isActiveAlive(p) && RoleEngine.isPlayerMafia(p))
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  if (mafiaPlayers.length <= 1) return;

  const box = document.createElement('div');
  box.style.cssText = 'margin-top:10px;padding:10px;border:1px solid rgba(248,113,113,0.2);border-radius:8px;font-size:12px;color:rgba(255,255,255,0.6);';
  const leader = mafiaPlayers.find(p => p.role === 'cursed')
    || mafiaPlayers.find(p => p.isMafiaLeader)
    || mafiaPlayers[0];
  const rows = mafiaPlayers.map(p => {
    const target = players[mafiaChoices[p.id]];
    const leaderMark = p.id === leader.id ? ' — القائد' : '';
    return `<div>${escapeHtml(p.name)}${leaderMark}: ${target ? escapeHtml(target.name) : 'لم يختر'}</div>`;
  }).join('');
  box.innerHTML = `<div style="color:#f87171;font-weight:700;margin-bottom:4px;">اختيارات المافيا</div>${rows}`;
  list.appendChild(box);
}

function appendWhisperAbility(list, game, me, players) {
  if (me.role !== 'whisper') return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid rgba(129,140,248,0.2);';
  const usedWhisper = me.usedAbilities?.whisper_used;
  if (usedWhisper) {
    wrap.innerHTML = `<div class="skill-used-badge">استخدمت قدرة الهمسة بالفعل</div>`;
    list.appendChild(wrap);
    return;
  }

  const label = document.createElement('div');
  label.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;';
  label.textContent = 'الهمسة: اكشف بطاقة لاعب حي للجميع لمدة 10 ثوانٍ';
  wrap.appendChild(label);

  const targets = Object.values(players)
    .filter(p => isActiveAlive(p) && p.id !== session.id && p.role !== 'cursed');
  if (targets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'skill-used-badge';
    empty.textContent = 'لا يوجد هدف متاح للهمسة';
    wrap.appendChild(empty);
  }

  targets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'target-btn';
    btn.innerHTML = `<span class="t-icon">${getPlayerPortraitHtml(p.icon, p.name, 'target-portrait')}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
    btn.addEventListener('click', () => useWhisperOnTarget(p.id));
    wrap.appendChild(btn);
  });

  list.appendChild(wrap);
}

// ── Voting UI ──────────────────────────────────────────────────────────────────
function renderVotingUI(game, me, players) {
  const section = document.getElementById('voting-section');
  const list = document.getElementById('vote-list');
  if (!section || !list) return;

  section.style.display = '';
  const votes = game.votes || {};
  const founderActive = game.founderActive;
  const myVote = founderActive && me.role === 'founder' ? game.founderVote : votes[session.id];

  // Founder froze votes
  if (founderActive && me.role !== 'founder') {
    list.innerHTML = `
      <div style="text-align:center;font-size:13px;color:#fcd34d;padding:12px;border:1px solid rgba(245,158,11,0.3);border-radius:8px;">
        تم تجميد الأصوات جميعًا<br>
        <span style="font-size:11px;opacity:0.7;">الصمت ليس ضعفًا... بل سيطرة.</span>
      </div>`;
    return;
  }

  // Tally
  const tally = getVoteTally(game, players);

  list.innerHTML = '';
  if (founderActive && me.role === 'founder') {
    const info = document.createElement('div');
    info.style.cssText = 'font-size:12px;color:#fcd34d;text-align:center;margin-bottom:8px;';
    info.textContent = 'الأصوات مجمدة — صوتك وحده سيُحسب';
    list.appendChild(info);
  }

  const alivePlayers = Object.values(players).filter(p => isActiveAlive(p) && p.id !== session.id);

  alivePlayers.forEach(p => {
    const btn = document.createElement('button');
    btn.className = `vote-btn${myVote === p.id ? ' selected' : ''}`;
    btn.innerHTML = `
      <span class="t-icon">${getPlayerPortraitHtml(p.icon, p.name, 'target-portrait')}</span>
      <span class="t-name">${escapeHtml(p.name)}</span>
      ${tally[p.id] ? `<span class="vote-count">${tally[p.id]} صوت</span>` : ''}
    `;
    btn.addEventListener('click', () => castVote(p.id));
    list.appendChild(btn);
  });

  // Skip
  if (!founderActive) {
    const skipBtn = document.createElement('button');
    skipBtn.className = `vote-skip-btn${myVote === 'skip' ? ' selected' : ''}`;
    skipBtn.textContent = '⏭ تخطي — لا أصوت';
    skipBtn.addEventListener('click', () => castVote('skip'));
    list.appendChild(skipBtn);
  }
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

// ── Day Abilities ──────────────────────────────────────────────────────────────
function renderDayAbilities(game, me, players) {
  const section = document.getElementById('ability-section');
  const content = document.getElementById('ability-content');
  if (!section || !content) return;

  content.innerHTML = '';

  if (me.role === 'cursed' && !me.usedAbilities?.cursed_used && canUseCursedAbility(game.phase)) {
    section.style.display = '';
    content.innerHTML = `
      <div class="skill-used-badge">
        اضغط على لاعب من الطاولة ثم اختر الكرت الذي تشك أنه يحمله.
      </div>
    `;

  } else if (me.role === 'founder' && !me.usedAbilities?.founder_used && (game.phase === 'discussion' || game.phase === 'voting' || game.phase === 'defense')) {
    section.style.display = '';
    const btn = document.createElement('button');
    btn.className = 'btn btn-gold btn-full';
    btn.textContent = '❄ تجميد الأصوات — صوّت منفردًا';
    btn.addEventListener('click', async () => {
      Sound.playAbility();
      Effects.screenShake();
      await DB.update(`rooms/${session.roomId}/game`, { founderActive: true, founderVote: null });
      await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { founder_used: true });
    });
    content.appendChild(btn);

  } else if (me.role === 'hopebreaker' && !me.usedAbilities?.hopebreaker_used) {
    section.style.display = '';
    content.innerHTML = `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;">قدرة اختيارية: اختر لاعباً. إن كان مافيا يُكشف ويموت فوراً وتنجو أنت:</div>`;
    const alivePlayers = Object.values(players).filter(p => isActiveAlive(p) && p.id !== session.id);

    alivePlayers.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.innerHTML = `<span class="t-icon">${getPlayerPortraitHtml(p.icon, p.name, 'target-portrait')}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', () => {
        content.querySelectorAll('button').forEach(b => b.disabled = true);
        useHopebreakerOnTarget(p.id);
      });
      content.appendChild(btn);
    });

  } else if (me.role === 'phoenix' && !me.usedAbilities?.phoenix_used) {
    section.style.display = '';
    const deadPlayers = Object.values(players).filter(p => !p.alive && isPlayerActive(p) && p.id !== session.id);
    if (deadPlayers.length > 0) {
      content.innerHTML = `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;">أحيِ لاعباً ميتاً وانضم لفريقه:</div>`;
      deadPlayers.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'target-btn';
        btn.innerHTML = `<span class="t-icon">${getPlayerPortraitHtml(p.icon, p.name, 'target-portrait')}</span><span class="t-name">${escapeHtml(p.name)} (${RoleEngine.getRoleArabicName(p.role)})</span>`;
        btn.addEventListener('click', () => {
          content.querySelectorAll('button').forEach(b => b.disabled = true);
          usePhoenixOnTarget(p.id);
        });
        content.appendChild(btn);
      });
    } else {
      content.innerHTML = `<div class="skill-used-badge">لا يوجد لاعب ميت لإحيائه الآن</div>`;
    }
  } else {
    section.style.display = 'none';
  }
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

// ── Whisper reveal (passive watcher) ─────────────────────────────────────────
let activeWhisperRevealKey = null;
let whisperRevealTimer = null;

function checkWhisperReveal(game, players) {
  {
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
    return;
  }

  const reveal = game.whisperReveal;
  if (!reveal?.targetId || game.phase !== 'night') {
    hideWhisperReveal();
    activeWhisperRevealKey = null;
    return;
  }

  const key = `${reveal.round || game.round || 0}:${reveal.targetId}:${reveal.revealedAt || 0}`;
  const elapsed = Math.floor((Date.now() - (reveal.revealedAt || Date.now())) / 1000);
  const remaining = Math.max(0, 10 - elapsed);
  if (remaining <= 0) {
    hideWhisperReveal();
    return;
  }

  if (activeWhisperRevealKey === key) return;
  const target = players[reveal.targetId];
  if (!target) return;
  if (target.role === 'cursed') {
    hideWhisperReveal();
    return;
  }
  activeWhisperRevealKey = key;
  Sound.playWhisper();
  showWhisperReveal(target, remaining);
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
  const width = menu.classList.contains('cursed-menu')
    ? Math.min(520, window.innerWidth - 24)
    : Math.min(260, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
  const top = Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - (menu.classList.contains('cursed-menu') ? 520 : 220)));
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

  titleEl.textContent = title;
  list.innerHTML = '';
  menu.classList.remove('cursed-menu');
  overlay.style.display = '';
  menu.style.display = '';
  positionActionMenu(menu, anchorEl);

  overlay.onclick = closeActionMenu;
  cancel.onclick = closeActionMenu;
  return { overlay, menu, titleEl, list, cancel };
}

function closeActionMenu() {
  const overlay = document.getElementById('action-menu-overlay');
  const menu = document.getElementById('action-menu');
  if (overlay) overlay.style.display = 'none';
  if (menu) menu.style.display = 'none';
}

function showActionMenu(targetName, actions, anchorEl) {
  const shell = openActionMenuShell(targetName, anchorEl);
  if (!shell) return;

  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className = 'action-menu-btn';
    btn.textContent = action.label;
    btn.disabled = !!action.disabled;
    btn.addEventListener('click', async () => {
      if (action.disabled) return;
      closeActionMenu();
      await action.fn();
    });
    shell.list.appendChild(btn);
  });
}

function showCursedGuessMenu(target, anchorEl) {
  const shell = openActionMenuShell(`قدرة الملعون: ${target.name}`, anchorEl);
  if (!shell) return;
  shell.menu.classList.add('cursed-menu');
  positionActionMenu(shell.menu, anchorEl);

  let selectedRole = '';
  const roleWrap = document.createElement('div');
  roleWrap.className = 'cursed-role-options';
  CURSED_MENU_ROLES.forEach(roleId => {
    const roleData = ROLES[roleId];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cursed-role-option';
    btn.dataset.role = roleId;
    btn.innerHTML = `
      <img src="${roleData.image}" alt="${RoleEngine.getRoleArabicName(roleId)}" loading="lazy" decoding="async">
      <span>${RoleEngine.getRoleArabicName(roleId)}</span>
    `;
    btn.addEventListener('click', () => {
      selectedRole = roleId;
      roleWrap.querySelectorAll('.cursed-role-option').forEach(el => el.classList.toggle('selected', el === btn));
      confirm.disabled = false;
    });
    roleWrap.appendChild(btn);
  });

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'action-menu-confirm';
  confirm.textContent = 'تنفيذ قدرة الملعون';
  confirm.disabled = true;
  confirm.addEventListener('click', async () => {
    if (!selectedRole) return;
    closeActionMenu();
    await executeCursedGuess(target.id, selectedRole);
  });

  const hint = document.createElement('div');
  hint.className = 'cursed-menu-hint';
  hint.textContent = 'اختر الكرت الذي تشك أن هذا اللاعب يحمله. النجاح الحقيقي فقط ضد الطبيب أو المحقق أو ECLIPSE.';

  shell.list.append(hint, roleWrap, confirm);
}

// ── Chat ───────────────────────────────────────────────────────────────────────
let chatTab = 'public';

function initChatTabs() {
  document.getElementById('tab-public')?.addEventListener('click', () => { chatTab = 'public'; updateChatTabs(); updateChatAvailability(); });
  document.getElementById('tab-mafia')?.addEventListener('click', () => { chatTab = 'mafia'; updateChatTabs(); updateChatAvailability(); });
}

function updateChatTabs() {
  document.getElementById('tab-public').classList.toggle('active', chatTab === 'public');
  document.getElementById('tab-mafia').classList.toggle('active', chatTab === 'mafia');
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
  const publicLocked = chatTab === 'public' && phase === 'night' && !isMafia;
  const mafiaLocked = chatTab === 'mafia' && (!isMafia || phase !== 'night');
  const locked = inactive || isDead || publicLocked || mafiaLocked;

  inp.disabled = locked;
  if (btn) btn.disabled = locked;
  if (lockMsg) {
    lockMsg.textContent = inactive
      ? 'لا يمكنك الدردشة من هذه الحالة'
      : isDead
      ? '⚰ الأموات يشاهدون فقط'
      : mafiaLocked
        ? '🔒 دردشة المافيا ليلاً فقط'
        : '🔒 الدردشة مغلقة في الليل';
    lockMsg.style.display = locked ? '' : 'none';
  }
}

function initChatSend() {
  document.getElementById('game-chat-send')?.addEventListener('click', sendGameChat);
  document.getElementById('game-chat-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendGameChat(); });
}

async function sendGameChat() {
  const inp = document.getElementById('game-chat-input');
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

  if (chatTab === 'public' && phase === 'night' && !RoleEngine.isPlayerMafia(me)) {
    showToast('الدردشة العامة مغلقة ليلاً', 'error'); return;
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
  document.getElementById('mafia-chat-wrap').style.display = showMafia ? '' : 'none';
}

// ── Mafia chat in action panel ─────────────────────────────────────────────────
function renderMafiaChat(data) { /* Handled in main chat */ }

// ── Win screen ─────────────────────────────────────────────────────────────────
function showWinScreen(winner, players) {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  Effects.setDay();

  const ws = document.getElementById('win-screen');
  const title = document.getElementById('win-title');
  const sub = document.getElementById('win-subtitle');
  const rolesDiv = document.getElementById('win-roles-reveal');

  let titleText, subText, titleClass;
  if (winner === 'citizens') {
    titleText = '🛡 انتصر المواطنون!'; subText = 'الحق انتصر في النهاية'; titleClass = 'citizens';
  } else if (winner === 'mafia') {
    titleText = '⚔ انتصرت المافيا!'; subText = 'الظلام ابتلع القرية'; titleClass = 'mafia';
  } else if (winner === 'eclipse') {
    titleText = '🌑 Eclipse يفوز!'; subText = 'كلهم ظنوا أنهم انتصروا... حتى ظهرت الحقيقة.'; titleClass = 'eclipse';
  } else {
    titleText = 'انتهت اللعبة'; subText = ''; titleClass = '';
  }

  title.textContent = titleText;
  title.className = `win-title ${titleClass}`;
  sub.textContent = subText;

  rolesDiv.innerHTML = '';
  Object.values(players).forEach(p => {
    const roleData = RoleEngine.getRole(p.role);
    const item = document.createElement('div');
    item.className = 'win-role-item';
    item.innerHTML = `
      <span class="icon">${getPlayerPortraitHtml(p.icon, p.name, 'player-portrait-mini')}</span>
      <span class="name">${escapeHtml(p.name)}</span>
      <span class="role" style="color:${roleData.color}">${roleData.arabicName}</span>
      ${!p.alive ? '<span style="color:#f87171;font-size:11px;">⚰ ميت</span>' : ''}
    `;
    rolesDiv.appendChild(item);
  });

  ws.classList.add('active');
  Sound.playDeathHit();
}

// ── Escape HTML ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Boot ───────────────────────────────────────────────────────────────────────
initGame();
