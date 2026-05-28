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

// ── Boot ──────────────────────────────────────────────────────────────────────
async function initGame() {
  session = Session.getPlayer();
  if (!session.id || !session.roomId) {
    showToast('انتهت جلستك', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return;
  }

  setupPresence(session.roomId, session.id);
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
  const compatibilityUpdates = buildPlayerCompatibilityUpdates(session.roomId, data.players || {});
  if (Object.keys(compatibilityUpdates).length) db.ref().update(compatibilityUpdates);
  ensureActiveHost(session.roomId, data.players || {}, data.hostId);

  const me = data.players?.[session.id];
  if (!me) return;
  if (getPlayerStatus(me) === 'kicked') {
    showToast('تم طردك من الغرفة', 'error', 7000);
    document.getElementById('dead-banner').style.display = '';
    document.getElementById('dead-banner').textContent = 'تم طردك من الغرفة';
    Session.clear();
    setTimeout(() => window.location.href = 'index.html', 1400);
    return;
  }

  myRole = me.role;
  myRoleData = RoleEngine.getRole(myRole);
  isHost = !!me.isHost;

  const game = data.game || {};
  const phase = game.phase;
  const players = data.players || {};

  // Check winner
  if (game.winner) { showWinScreen(game.winner, players); return; }

  // Back to lobby
  if (data.status !== 'playing') { window.location.href = 'lobby.html'; return; }

  // First time: show role card
  if (!roleCardShown) { roleCardShown = true; showMyRoleCard(me); }

  // Phase change
  if (phase !== currentPhase) {
    handlePhaseChange(phase, game, me, players);
    currentPhase = phase;
  }

  // Update timer
  updateTimer(game.timerEndsAt);

  // Render players around table
  renderGameTable(players, game);

  // Render action panel
  renderActionPanel(phase, game, me, players);
  renderHostKickControls(me, players);

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
function handlePhaseChange(phase, game, me, players) {
  const gameBg = document.getElementById('game-bg');

  if (phase === 'night') {
    gameBg.className = 'game-bg night';
    Effects.setNight();
    showCinematic('حلّ الليل...', 'ابقَ هادئاً واستمع للظلام', 2500);
    lockPublicChat(true);
    document.getElementById('timer-wrap').style.display = '';

  } else if (phase === 'morning' || phase === 'day') {
    gameBg.className = 'game-bg day';
    Effects.setDay();

    // Announce night results
    const deathLog = game.deathLog || {};
    const round = game.round;
    const death = deathLog[`round_${round}`];

    if (death?.protected) {
      showCinematic('شخص ما نجا من الموت الليلة...', 'الظلام لم يصل إليه', 2600);
    } else if (death?.killed) {
      const victim = players[death.killed];
      const vname = victim ? victim.name : '؟';
      showCinematic('تم العثور على لاعب ميت...', `${vname} لم يستيقظ هذا الصباح`, 3000);
      Sound.playDeathHit();
    } else {
      showCinematic('استيقظت القرية...', 'ليلة هادئة... أم هكذا يبدو؟', 2500);
    }

    lockPublicChat(false);

  } else if (phase === 'voting') {
    showCinematic('بدأ التصويت...', 'من المذنب بينكم؟', 2000);
    Sound.playVoteClick();
    lockPublicChat(false);

  } else if (phase === 'discussion') {
    showCinematic('وقت النقاش', 'تحدث وأقنع الآخرين', 2000);
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
    updates[`rooms/${session.roomId}/game/timerEndsAt`] = Date.now() + 60 * 1000;
    updates[`rooms/${session.roomId}/game/votes`] = {};

  } else if (phase === 'voting') {
    // Resolve votes
    const votes = game.votes || {};
    const result = resolveVotes(votes, players, game);

    if (result.executed) {
      const victim = players[result.executed];
      const victimRole = victim?.role;

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
    if (target && isActiveAlive(target)) {
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
    if (target && isActiveAlive(target) && !RoleEngine.isPlayerMafia(target)) {
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
    return { executed: null, founderOverride: true };
  }

  const tally = {};
  let skipCount = 0;

  Object.entries(votes).forEach(([voterId, v]) => {
    if (!isActiveAlive(players[voterId])) return;
    if (v === 'skip') { skipCount++; return; }
    if (!isActiveAlive(players[v])) return;
    tally[v] = (tally[v] || 0) + 1;
  });

  if (Object.keys(tally).length === 0) return { executed: null, tie: false };

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

// ── Render table players ───────────────────────────────────────────────────────
function getPlayerTargetState(player, game = roomData?.game || {}, me = roomData?.players?.[session?.id], players = roomData?.players || {}) {
  if (!player || !me) return { selectable: false, selected: false, kind: '' };
  const actions = game.nightActions || {};
  const status = getPlayerStatus(player);
  const inactiveTarget = ['left', 'kicked', 'offline'].includes(status);
  const dayAbilityPhase = ['morning', 'day', 'discussion', 'voting'].includes(game.phase);

  if (!isPlayerActive(me) || !me.alive) return { selectable: false, selected: false, kind: 'inactive-self' };
  if (inactiveTarget) return { selectable: false, selected: false, kind: status };

  if (game.phase === 'voting') {
    const founderCanVote = !game.founderActive || me.role === 'founder';
    const myVote = game.founderActive ? game.founderVote : game.votes?.[session.id];
    return { selectable: founderCanVote && isActiveAlive(player) && player.id !== session.id && !myVote, selected: myVote === player.id, kind: 'vote' };
  }

  if (game.phase === 'night') {
    if (RoleEngine.isPlayerMafia(me)) {
      return { selectable: isActiveAlive(player) && !RoleEngine.isPlayerMafia(player), selected: actions.mafiaKills?.[session.id] === player.id, kind: 'mafiaKill' };
    }
    if (me.role === 'doctor') {
      return { selectable: isActiveAlive(player), selected: actions.doctor_protect === player.id, kind: 'doctorProtect' };
    }
    if (me.role === 'detective') {
      const investigated = me.usedAbilities?.investigatedRounds?.[String(game.round || 1)];
      return { selectable: isActiveAlive(player) && player.id !== session.id && !investigated, selected: false, kind: 'detectiveInvestigate' };
    }
    if (me.role === 'whisper' && !me.usedAbilities?.whisper_used) {
      return { selectable: isActiveAlive(player) && player.id !== session.id && player.role !== 'cursed', selected: game.whisperReveal?.targetId === player.id, kind: 'whisper' };
    }
  }

  if (dayAbilityPhase && me.role === 'hopebreaker' && !me.usedAbilities?.hopebreaker_used) {
    return { selectable: isActiveAlive(player) && player.id !== session.id, selected: false, kind: 'hopebreaker' };
  }
  if (dayAbilityPhase && me.role === 'phoenix' && !me.usedAbilities?.phoenix_used) {
    return { selectable: !player.alive && isPlayerActive(player) && player.id !== session.id, selected: false, kind: 'phoenix' };
  }
  if (dayAbilityPhase && me.role === 'cursed' && !me.usedAbilities?.cursed_used) {
    return { selectable: isActiveAlive(player) && player.id !== session.id && !RoleEngine.isPlayerMafia(player), selected: false, kind: 'cursedSelect' };
  }

  return { selectable: false, selected: false, kind: '' };
}

function getTargetHint(game = roomData?.game || {}, me = roomData?.players?.[session?.id]) {
  if (!me || !isPlayerActive(me) || !me.alive) return '';
  const dayAbilityPhase = ['morning', 'day', 'discussion', 'voting'].includes(game.phase);
  if (game.phase === 'voting') return 'اضغط على اسم اللاعب لاختياره';
  if (game.phase === 'night' && RoleEngine.isPlayerMafia(me)) return 'اضغط على لاعب حي لاختيار ضحية المافيا';
  if (game.phase === 'night' && me.role === 'doctor') return 'اضغط على لاعب حي لحمايته';
  if (game.phase === 'night' && me.role === 'detective' && !me.usedAbilities?.investigatedRounds?.[String(game.round || 1)]) return 'اضغط على لاعب حي للتحقيق معه';
  if (game.phase === 'night' && me.role === 'whisper' && !me.usedAbilities?.whisper_used) return 'اضغط على لاعب لكشف بطاقته بالهمسة';
  if (dayAbilityPhase && me.role === 'hopebreaker' && !me.usedAbilities?.hopebreaker_used) return 'اضغط على لاعب لاستخدام محطم الآمال';
  if (dayAbilityPhase && me.role === 'phoenix' && !me.usedAbilities?.phoenix_used) return 'اضغط على لاعب ميت لإحيائه';
  if (dayAbilityPhase && me.role === 'cursed' && !me.usedAbilities?.cursed_used) return 'اضغط على لاعب ثم اختر الدور من لوحة القدرة';
  return '';
}

async function handlePlayerTargetClick(targetPlayerId) {
  const game = roomData?.game || {};
  const players = roomData?.players || {};
  const me = players[session.id];
  const target = players[targetPlayerId];
  const targetState = getPlayerTargetState(target, game, me, players);

  if (!targetState.selectable) {
    showToast('هذا اللاعب غير متاح للاختيار الآن', 'info');
    return;
  }

  if (targetState.kind === 'vote') return castVote(targetPlayerId);
  if (targetState.kind === 'mafiaKill') return chooseMafiaKill(targetPlayerId);
  if (targetState.kind === 'doctorProtect') return chooseDoctorProtect(targetPlayerId);
  if (targetState.kind === 'detectiveInvestigate') return investigatePlayer(targetPlayerId);
  if (targetState.kind === 'whisper') return useWhisperOnTarget(targetPlayerId);
  if (targetState.kind === 'hopebreaker') return useHopebreakerOnTarget(targetPlayerId);
  if (targetState.kind === 'phoenix') return usePhoenixOnTarget(targetPlayerId);
  if (targetState.kind === 'cursedSelect') {
    const selector = document.getElementById('cursed-target-select');
    if (selector) {
      selector.value = targetPlayerId;
      showToast('تم اختيار اللاعب، اختر الدور ثم أكد القدرة', 'info');
    }
  }
}

async function chooseMafiaKill(targetPlayerId) {
  const target = roomData?.players?.[targetPlayerId];
  if (!isActiveAlive(target) || RoleEngine.isPlayerMafia(target)) return;
  Sound.playVoteClick();
  await DB.update(`rooms/${session.roomId}/game/nightActions/mafiaKills`, { [session.id]: targetPlayerId });
}

async function chooseDoctorProtect(targetPlayerId) {
  const target = roomData?.players?.[targetPlayerId];
  if (!isActiveAlive(target)) return;
  Sound.playVoteClick();
  await DB.update(`rooms/${session.roomId}/game/nightActions`, { doctor_protect: targetPlayerId });
}

async function investigatePlayer(targetPlayerId) {
  const game = roomData?.game || {};
  const target = roomData?.players?.[targetPlayerId];
  if (!isActiveAlive(target)) return;
  const roundKey = String(game.round || 1);
  Sound.playAbility();
  const tx = await db.ref(`rooms/${session.roomId}/players/${session.id}/usedAbilities/investigatedRounds/${roundKey}`)
    .transaction(current => current ? undefined : true);
  if (!tx.committed) {
    showToast('استخدمت فحصك لهذه الليلة', 'info');
    return;
  }
  const result = RoleEngine.isPlayerMafia(target) ? '⚔ مافيا' : '✓ ليس مافيا';
  showCinematic(result, `نتيجة التحقيق عن ${target.name}`, 3000);
}

async function useWhisperOnTarget(targetPlayerId) {
  const game = roomData?.game || {};
  const target = roomData?.players?.[targetPlayerId];
  if (!isActiveAlive(target) || target.role === 'cursed') return;
  Sound.playWhisper();
  await DB.update(`rooms/${session.roomId}/game`, {
    whisperReveal: { targetId: targetPlayerId, revealedAt: Date.now(), round: game.round || 1 }
  });
  await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { whisper_used: true });
  showToast('تم إرسال الهمسة!', 'info');
}

async function useHopebreakerOnTarget(targetPlayerId) {
  const target = roomData?.players?.[targetPlayerId];
  if (!target) return;
  if (!isActiveAlive(target)) return;
  Sound.playAbility();
  if (RoleEngine.isPlayerMafia(target)) {
    showCinematic('الأمل آخر شيء يختفي... وهو أول شيء يدمره.', `${target.name} هو ${RoleEngine.getRoleArabicName(target.role)} — مات فوراً`, 4000);
    const updates = {};
    const chatKey = DB.generateId();
    updates[`rooms/${session.roomId}/players/${target.id}/alive`] = false;
    updates[`rooms/${session.roomId}/players/${session.id}/usedAbilities/hopebreaker_used`] = true;
    updates[`rooms/${session.roomId}/game/revealedRoles/${target.id}`] = target.role;
    updates[`rooms/${session.roomId}/game/chat/${chatKey}`] = {
      playerId: 'system', name: 'النظام', icon: 'owl', avatarId: 'owl',
      text: `محطم الآمال كشف ${target.name}: ${RoleEngine.getRoleArabicName(target.role)} — مات فوراً.`,
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
  if (!target) return;
  if (target.alive || !isPlayerActive(target)) return;
  Sound.playAbility();
  showCinematic('عاد من الموت...', `${target.name} لكنه لم يعد كما كان.`, 3500);
  await DB.update(`rooms/${session.roomId}/players/${target.id}`, { alive: true });
  await DB.update(`rooms/${session.roomId}/game/votes`, { [target.id]: null });
  await DB.update(`rooms/${session.roomId}/players/${session.id}`, { team: RoleEngine.getPlayerTeam(target) });
  await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { phoenix_used: true });
}

function renderGameTable(players, game) {
  const ring = document.getElementById('game-players-ring');
  if (!ring) return;
  ring.innerHTML = '';

  const pArr = Object.values(players);
  const count = pArr.length;
  if (count === 0) return;

  const positions = getSeatPositions(count, 50, 50, 40, 32);
  const votes = game?.votes || {};
  const voteTally = getVoteTally(game, players);
  const me = players[session.id];

  pArr.forEach((p, i) => {
    const pos = positions[i];
    const isVotingTarget = game.phase === 'voting' && voteTally[p.id] > 0;
    const status = getPlayerStatus(p);
    const targetState = getPlayerTargetState(p, game, me, players);
    const inactive = !isPlayerActive(p);
    const revealedRole = game.revealedRoles?.[p.id];
    const statusLabel = status === 'kicked'
      ? 'مطرود'
      : status === 'left'
        ? 'غادر'
        : status === 'offline'
          ? 'غير متصل'
          : '';

    const seat = document.createElement('div');
    seat.className = [
      'game-player-seat',
      !p.alive ? 'dead' : '',
      inactive ? 'inactive-player' : '',
      p.id === session.id ? 'current-player' : '',
      isVotingTarget ? 'voting-target' : '',
      targetState.selectable ? 'selectable-target' : '',
      targetState.selected ? 'selected-target' : '',
      !targetState.selectable ? 'disabled-target' : '',
      `player-status-${status}`,
    ].filter(Boolean).join(' ');
    seat.style.left = pos.x + '%';
    seat.style.top = pos.y + '%';

    seat.innerHTML = `
      <div class="gps-avatar" title="${escapeHtml(p.name)}">${renderAvatarHtml(p, 'avatar-game')}</div>
      <div class="gps-name">${escapeHtml(p.name)}${p.id === session.id ? ' (أنت)' : ''}</div>
      ${statusLabel ? `<div class="gps-status player-state-label">${statusLabel}</div>` : ''}
      ${!p.alive ? `<div class="gps-status" style="color:#f87171;">⚰ ميت</div>` : ''}
      ${revealedRole ? `<div class="gps-status" style="color:${RoleEngine.getRoleColor(revealedRole)};">${RoleEngine.getRoleArabicName(revealedRole)}</div>` : ''}
      ${isVotingTarget ? `<div class="vote-indicator">🗳 ${voteTally[p.id]}</div>` : ''}
      ${p.isHost && p.alive ? `<div class="gps-status">👑</div>` : ''}
    `;

    if (targetState.selectable) {
      seat.tabIndex = 0;
      seat.setAttribute('role', 'button');
      seat.setAttribute('aria-label', `اختر ${p.name}`);
      seat.addEventListener('click', () => handlePlayerTargetClick(p.id));
      seat.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePlayerTargetClick(p.id);
        }
      });
    }

    ring.appendChild(seat);
  });
}

// ── Action Panel ───────────────────────────────────────────────────────────────
function renderActionPanel(phase, game, me, players) {
  // Role card
  renderMyRole(me);

  // Dead banner
  const deadBanner = document.getElementById('dead-banner');
  const myStatus = getPlayerStatus(me);
  const inactive = !me || !isPlayerActive(me);
  if (inactive || !me.alive) {
    deadBanner.style.display = '';
    deadBanner.textContent = myStatus === 'kicked'
      ? 'تم طردك من الغرفة'
      : myStatus === 'left'
        ? 'غادرت الغرفة — يمكنك المشاهدة فقط'
        : myStatus === 'offline'
          ? 'أنت غير متصل — أعد الاتصال للعودة'
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

  if (inactive || !me.alive) return;

  if (phase === 'night') {
    renderNightActions(game, me, players);
  } else if (phase === 'voting') {
    renderVotingUI(game, me, players);
  }

  // Day abilities (Cursed, Founder, Hopebreaker, Phoenix)
  if (phase === 'morning' || phase === 'day' || phase === 'discussion' || phase === 'voting') {
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
    killLabel.className = 'target-helper-message';
    killLabel.textContent = 'اضغط على اسم اللاعب لاختياره';
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
      btn.innerHTML = `<span class="t-icon">${renderAvatarHtml(p, 'avatar-action')}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', () => handlePlayerTargetClick(p.id));
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
    const protectLabel = document.createElement('div');
    protectLabel.className = 'target-helper-message';
    protectLabel.textContent = 'اضغط على اسم اللاعب لحمايته';
    list.appendChild(protectLabel);
    // Doctor can protect self
    const allAlive = Object.values(players).filter(p => isActiveAlive(p));
    allAlive.forEach(p => {
      const btn = document.createElement('button');
      btn.className = `target-btn${doctorProtect === p.id ? ' selected' : ''}`;
      btn.innerHTML = `<span class="t-icon">${renderAvatarHtml(p, 'avatar-action')}</span><span class="t-name">${escapeHtml(p.name)}${p.id===session.id?' (أنت)':''}</span>`;
      btn.addEventListener('click', () => handlePlayerTargetClick(p.id));
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
    const investigateLabel = document.createElement('div');
    investigateLabel.className = 'target-helper-message';
    investigateLabel.textContent = 'اضغط على اسم اللاعب للتحقيق معه';
    list.appendChild(investigateLabel);
    alivePlayers.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.innerHTML = `<span class="t-icon">${renderAvatarHtml(p, 'avatar-action')}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', () => handlePlayerTargetClick(p.id));
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
    btn.innerHTML = `<span class="t-icon">${renderAvatarHtml(p, 'avatar-action')}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
    btn.addEventListener('click', () => handlePlayerTargetClick(p.id));
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
  const voteHint = document.createElement('div');
  voteHint.className = 'target-helper-message';
  voteHint.textContent = 'اضغط على اسم اللاعب لاختياره';
  list.appendChild(voteHint);

  alivePlayers.forEach(p => {
    const btn = document.createElement('button');
    btn.className = `vote-btn${myVote === p.id ? ' selected' : ''}`;
    btn.innerHTML = `
      <span class="t-icon">${renderAvatarHtml(p, 'avatar-action')}</span>
      <span class="t-name">${escapeHtml(p.name)}</span>
      ${tally[p.id] ? `<span class="vote-count">${tally[p.id]} صوت</span>` : ''}
    `;
    if (!myVote) {
      btn.addEventListener('click', () => handlePlayerTargetClick(p.id));
    }
    list.appendChild(btn);
  });

  // Skip
  if (!founderActive) {
    const skipBtn = document.createElement('button');
    skipBtn.className = `vote-skip-btn${myVote === 'skip' ? ' selected' : ''}`;
    skipBtn.textContent = '⏭ تخطي — لا أصوت';
    if (!myVote) skipBtn.addEventListener('click', () => castVote('skip'));
    list.appendChild(skipBtn);
  }

  if (myVote) {
    const info = document.createElement('div');
    info.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.4);text-align:center;margin-top:8px;';
    info.textContent = 'تم تسجيل صوتك';
    list.appendChild(info);
  }
}

// ── Cast vote ──────────────────────────────────────────────────────────────────
async function castVote(targetId) {
  const me = roomData?.players?.[session.id];
  const game = roomData?.game || {};
  const target = roomData?.players?.[targetId];
  if (!isActiveAlive(me)) { showToast('لا يمكنك التصويت من هذه الحالة', 'error'); return; }
  if (game.phase !== 'voting') return;

  Sound.playVoteClick();
  if (game.founderActive) {
    if (me.role !== 'founder') { showToast('تم تجميد الأصوات جميعًا', 'info'); return; }
    if (!isActiveAlive(target)) return;
    await DB.update(`rooms/${session.roomId}/game`, { founderVote: targetId });
    return;
  }

  if (targetId !== 'skip' && !isActiveAlive(target)) return;
  await DB.update(`rooms/${session.roomId}/game/votes`, { [session.id]: targetId });
}

// ── Day Abilities ──────────────────────────────────────────────────────────────
function renderDayAbilities(game, me, players) {
  const section = document.getElementById('ability-section');
  const content = document.getElementById('ability-content');
  if (!section || !content) return;

  content.innerHTML = '';

  if (me.role === 'cursed' && !me.usedAbilities?.cursed_used) {
    section.style.display = '';
    content.innerHTML = `<div class="target-helper-message">اضغط على اسم اللاعب لاختياره، ثم خمّن الدور:</div>`;
    const roles = [
      'mafia',
      'citizen',
      'doctor',
      'detective',
      'cursed',
      'immune_citizen',
      'whisper',
      'founder',
      'eclipse',
      'hopebreaker',
      'phoenix',
    ];
    const cursedKillableRoles = ['doctor', 'detective', 'eclipse'];
    const alivePlayers = Object.values(players).filter(p => isActiveAlive(p) && p.id !== session.id && !RoleEngine.isPlayerMafia(p));

    const targetSel = document.createElement('select');
    targetSel.id = 'cursed-target-select';
    targetSel.className = 'input-field';
    targetSel.style.marginBottom = '8px';
    const defOpt = document.createElement('option'); defOpt.value=''; defOpt.textContent='اختر لاعباً...'; targetSel.appendChild(defOpt);
    alivePlayers.forEach(p => { const o = document.createElement('option'); o.value=p.id; o.textContent=p.name; targetSel.appendChild(o); });

    const roleSel = document.createElement('select');
    roleSel.className = 'input-field';
    roleSel.style.marginBottom = '8px';
    const defR = document.createElement('option'); defR.value=''; defR.textContent='خمّن الدور...'; roleSel.appendChild(defR);
    roles.forEach(r => { const o = document.createElement('option'); o.value=r; o.textContent=RoleEngine.getRoleArabicName(r); roleSel.appendChild(o); });

    const useBtn = document.createElement('button');
    useBtn.className = 'btn btn-danger btn-full btn-sm';
    useBtn.textContent = '💀 استخدام قدرة الملعون';
    useBtn.addEventListener('click', async () => {
      const tid = targetSel.value;
      const guessRole = roleSel.value;
      if (!tid || !guessRole) { showToast('اختر اللاعب والدور', 'error'); return; }
      Sound.playCrystalCrack();
      Effects.screenShake();
      const target = players[tid];
      if (!isActiveAlive(target)) {
        showToast('الهدف لم يعد حيًا', 'error');
        return;
      }
      const isValidCursedJudgment = target.role === guessRole && cursedKillableRoles.includes(guessRole);
      if (isValidCursedJudgment) {
        showCinematic('أصبت! 💀', `${target.name} هو ${RoleEngine.getRoleArabicName(guessRole)}`, 3000);
        await DB.update(`rooms/${session.roomId}/players/${tid}`, { alive: false });
      } else {
        showCinematic('أخطأت! 💀', 'الملعون دفع الثمن بنفسه...', 3000);
        await DB.update(`rooms/${session.roomId}/players/${session.id}`, { alive: false });
      }
      await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { cursed_used: true });
    });

    content.appendChild(targetSel);
    content.appendChild(roleSel);
    content.appendChild(useBtn);

  } else if (me.role === 'founder' && !me.usedAbilities?.founder_used && (game.phase === 'discussion' || game.phase === 'voting')) {
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
    content.innerHTML = `<div class="target-helper-message">اضغط على اسم اللاعب. إن كان مافيا يُكشف ويموت فوراً وتنجو أنت:</div>`;
    const alivePlayers = Object.values(players).filter(p => isActiveAlive(p) && p.id !== session.id);

    alivePlayers.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.innerHTML = `<span class="t-icon">${renderAvatarHtml(p, 'avatar-action')}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', () => {
        content.querySelectorAll('button').forEach(b => b.disabled = true);
        handlePlayerTargetClick(p.id);
      });
      content.appendChild(btn);
    });

  } else if (me.role === 'phoenix' && !me.usedAbilities?.phoenix_used) {
    section.style.display = '';
    const deadPlayers = Object.values(players).filter(p => !p.alive && isPlayerActive(p) && p.id !== session.id);
    if (deadPlayers.length > 0) {
      content.innerHTML = `<div class="target-helper-message">اضغط على لاعب ميت لإحيائه والانضمام لفريقه:</div>`;
      deadPlayers.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'target-btn';
        btn.innerHTML = `<span class="t-icon">${renderAvatarHtml(p, 'avatar-action')}</span><span class="t-name">${escapeHtml(p.name)} (${RoleEngine.getRoleArabicName(p.role)})</span>`;
        btn.addEventListener('click', () => {
          content.querySelectorAll('button').forEach(b => b.disabled = true);
          handlePlayerTargetClick(p.id);
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
    if (!p.alive && isPlayerActive(p) && !phoenixDeadSeen[p.id]) {
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

function showWhisperReveal(player, seconds) {
  const ov = document.getElementById('whisper-reveal-overlay');
  const img = document.getElementById('whisper-reveal-img');
  const cnt = document.getElementById('whisper-countdown');
  const lbl = document.getElementById('whisper-label');
  if (!ov) return;

  if (whisperRevealTimer) clearInterval(whisperRevealTimer);
  const roleData = RoleEngine.getRole(player.role);
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

// ── Host moderation ───────────────────────────────────────────────────────────
function renderHostKickControls(me, players) {
  const section = document.getElementById('host-kick-section');
  const list = document.getElementById('host-kick-list');
  if (!section || !list) return;

  if (!me?.isHost || !isPlayerActive(me)) {
    section.style.display = 'none';
    list.innerHTML = '';
    return;
  }

  const candidates = Object.values(players)
    .filter(p => p.id !== session.id && !p.isHost && getPlayerStatus(p) !== 'kicked');

  section.style.display = '';
  list.innerHTML = '';

  if (candidates.length === 0) {
    list.innerHTML = `<div class="skill-used-badge">لا يوجد لاعب متاح للطرد</div>`;
    return;
  }

  candidates.forEach(player => {
    const status = getPlayerStatus(player);
    const row = document.createElement('div');
    row.className = `host-kick-row player-status-${status}`;
    row.innerHTML = `
      <span class="kick-player-avatar">${renderAvatarHtml(player, 'avatar-action')}</span>
      <span class="kick-player-name">${escapeHtml(player.name)}</span>
      ${!isPlayerActive(player) ? `<span class="kick-status">${status === 'left' ? 'غادر' : 'غير متصل'}</span>` : ''}
      <button class="kick-btn" type="button">طرد</button>
    `;
    row.querySelector('.kick-btn')?.addEventListener('click', () => kickPlayer(player.id));
    list.appendChild(row);
  });
}

async function kickPlayer(targetPlayerId) {
  const me = roomData?.players?.[session.id];
  const target = roomData?.players?.[targetPlayerId];
  if (!me?.isHost || !isPlayerActive(me) || !target || target.isHost || target.id === session.id) return;

  if (!window.confirm(`هل تريد طرد ${target.name} من الغرفة؟`)) return;

  const updates = {};
  const chatKey = DB.generateId();
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/status`] = 'kicked';
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/kicked`] = true;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/left`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/online`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/connected`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/ready`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/alive`] = false;
  updates[`rooms/${session.roomId}/players/${targetPlayerId}/lastSeen`] = DB.timestamp();
  updates[`rooms/${session.roomId}/game/votes/${targetPlayerId}`] = null;
  updates[`rooms/${session.roomId}/game/nightActions/mafiaKills/${targetPlayerId}`] = null;
  updates[`rooms/${session.roomId}/game/chat/${chatKey}`] = {
    playerId: 'system',
    name: 'النظام',
    icon: 'owl',
    avatarId: 'owl',
    text: `تم طرد ${target.name} من الغرفة.`,
    ts: DB.timestamp(),
    type: 'system',
  };

  const updatedPlayers = JSON.parse(JSON.stringify(roomData?.players || {}));
  if (updatedPlayers[targetPlayerId]) {
    updatedPlayers[targetPlayerId].alive = false;
    updatedPlayers[targetPlayerId].status = 'kicked';
    updatedPlayers[targetPlayerId].kicked = true;
  }
  const winner = RoleEngine.checkWin(updatedPlayers);
  if (winner) {
    updates[`rooms/${session.roomId}/game/winner`] = winner;
    updates[`rooms/${session.roomId}/status`] = 'ended';
  }

  await db.ref().update(updates);
  showToast('تم طرد اللاعب', 'success');
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

  const status = getPlayerStatus(me);
  const inactive = !me || !isPlayerActive(me);
  const isDead = !me?.alive;
  const isMafia = me && isPlayerActive(me) && RoleEngine.isPlayerMafia(me);
  const publicLocked = chatTab === 'public' && phase === 'night' && !isMafia;
  const mafiaLocked = chatTab === 'mafia' && (!isMafia || phase !== 'night');
  const locked = inactive || isDead || publicLocked || mafiaLocked;

  inp.disabled = locked;
  if (btn) btn.disabled = locked;
  if (lockMsg) {
    let message = '🔒 الدردشة مغلقة في الليل';
    if (status === 'kicked') message = 'تم طردك من الغرفة';
    else if (status === 'left') message = 'لا يمكنك الدردشة بعد مغادرة الغرفة';
    else if (status === 'offline') message = 'أعد الاتصال للدردشة';
    else if (isDead) message = '⚰ الأموات يشاهدون فقط';
    else if (mafiaLocked) message = '🔒 دردشة المافيا ليلاً فقط';
    lockMsg.textContent = message;
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
    avatarId: getPlayerAvatarId(me),
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
        <span class="icon">${renderAvatarHtml({ avatarId: msg.avatarId || msg.icon, name: msg.name }, 'avatar-chat')}</span>
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
    const status = getPlayerStatus(p);
    const inactiveLabel = status === 'kicked'
      ? 'مطرود'
      : status === 'left'
        ? 'غادر'
        : status === 'offline'
          ? 'غير متصل'
          : '';
    const item = document.createElement('div');
    item.className = 'win-role-item';
    item.innerHTML = `
      <span class="icon">${renderAvatarHtml(p, 'avatar-chat')}</span>
      <span class="name">${escapeHtml(p.name)}</span>
      <span class="role" style="color:${roleData.color}">${roleData.arabicName}</span>
      ${inactiveLabel ? `<span style="color:#fbbf24;font-size:11px;">${inactiveLabel}</span>` : ''}
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
