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

  const me = data.players?.[session.id];
  if (!me) return;

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

  // Render chat
  renderPublicChat(game.chat || {}, game.mafiaChat || {});

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
    const result = resolveVotes(votes, players);

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
  }

  await db.ref().update(updates);
}

// ── Night Action Resolution ────────────────────────────────────────────────────
function resolveNightActions(actions, players) {
  const mafiaKill = actions.mafia_kill;
  const doctorProtect = actions.doctor_protect;
  const whisperTarget = actions.whisper_target;

  let killed = null;
  let protected_ = false;
  let whispered = null;

  if (mafiaKill) {
    const target = players[mafiaKill];
    if (target && target.alive) {
      // Check doctor
      if (doctorProtect === mafiaKill) {
        protected_ = true;
      }
      // Check immune citizen
      else if (target.role === 'immune_citizen' && !target.usedAbilities?.immune_used) {
        protected_ = true;
        // Mark used
        DB.update(`rooms/${session.roomId}/players/${mafiaKill}/usedAbilities`, { immune_used: true });
      } else {
        killed = mafiaKill;
      }
    }
  }

  if (whisperTarget) whispered = whisperTarget;

  return { killed, protected: protected_, whispered };
}

// ── Vote Resolution ────────────────────────────────────────────────────────────
function resolveVotes(votes, players) {
  const tally = {};
  let skipCount = 0;
  const alivePlayers = Object.values(players).filter(p => p.alive);

  Object.values(votes).forEach(v => {
    if (v === 'skip') { skipCount++; return; }
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

// ── Render table players ───────────────────────────────────────────────────────
function renderGameTable(players, game) {
  const ring = document.getElementById('game-players-ring');
  if (!ring) return;
  ring.innerHTML = '';

  const pArr = Object.values(players);
  const count = pArr.length;
  if (count === 0) return;

  const positions = getSeatPositions(count, 50, 50, 40, 32);
  const votes = game?.votes || {};

  // Vote tally per player
  const voteTally = {};
  Object.values(votes).forEach(v => {
    if (v && v !== 'skip') voteTally[v] = (voteTally[v]||0) + 1;
  });

  pArr.forEach((p, i) => {
    const pos = positions[i];
    const myVote = votes[session.id];
    const isVotingTarget = game.phase === 'voting' && voteTally[p.id] > 0;

    const seat = document.createElement('div');
    seat.className = `game-player-seat${!p.alive ? ' dead' : ''}${isVotingTarget ? ' voting-target' : ''}`;
    seat.style.left = pos.x + '%';
    seat.style.top = pos.y + '%';

    const isMeTarget = (game.phase === 'voting' || game.phase === 'discussion');
    const canVoteThis = isMeTarget && p.alive && p.id !== session.id && players[session.id]?.alive;

    seat.innerHTML = `
      <div class="gps-avatar" title="${escapeHtml(p.name)}">${getAnimalEmoji(p.icon)}</div>
      <div class="gps-name">${escapeHtml(p.name)}${p.id === session.id ? ' (أنت)' : ''}</div>
      ${!p.alive ? `<div class="gps-status" style="color:#f87171;">⚰ ميت</div>` : ''}
      ${isVotingTarget ? `<div class="vote-indicator">🗳 ${voteTally[p.id]}</div>` : ''}
      ${p.isHost && p.alive ? `<div class="gps-status">👑</div>` : ''}
    `;

    // Click to vote (if voting phase)
    if (canVoteThis && game.phase === 'voting' && players[session.id]?.alive && !votes[session.id]) {
      seat.style.cursor = 'pointer';
      seat.addEventListener('click', () => castVote(p.id));
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
  if (!me.alive) {
    deadBanner.style.display = '';
    deadBanner.textContent = '⚰ أنت ميت — يمكنك المشاهدة فقط';
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

  if (!me.alive) return;

  if (phase === 'night') {
    renderNightActions(game, me, players);
  } else if (phase === 'voting') {
    renderVotingUI(game, me, players);
  }

  // Day abilities (Cursed, Founder, Hopebreaker)
  if (phase === 'discussion' || phase === 'voting') {
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

  const alivePlayers = Object.values(players).filter(p => p.alive && p.id !== session.id);
  const actions = game.nightActions || {};
  const myRoleId = me.role;

  // Mafia actions
  if (RoleEngine.isMafia(myRoleId)) {
    section.style.display = '';
    section.querySelector('h4').textContent = '🔪 اختر ضحيتك الليلة';

    // Mafia chat
    document.getElementById('mafia-chat-wrap').style.display = '';
    renderMafiaChat(game.mafiaChat || {});

    const mafiaKill = actions.mafia_kill;
    list.innerHTML = '';
    alivePlayers.forEach(p => {
      // Don't show fellow mafia members as targets
      if (RoleEngine.isMafia(p.role)) return;
      const btn = document.createElement('button');
      btn.className = `target-btn${mafiaKill === p.id ? ' selected' : ''}`;
      btn.innerHTML = `<span class="t-icon">${getAnimalEmoji(p.icon)}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', () => {
        Sound.playVoteClick();
        DB.update(`rooms/${session.roomId}/game/nightActions`, { mafia_kill: p.id });
      });
      list.appendChild(btn);
    });

    // Show mafia teammates
    const mafiaTeam = Object.values(players).filter(p => RoleEngine.isMafia(p.role) && p.id !== session.id);
    if (mafiaTeam.length > 0) {
      const info = document.createElement('div');
      info.style.cssText = 'font-size:12px;color:rgba(248,113,113,0.7);margin-bottom:8px;';
      info.textContent = 'زملاء المافيا: ' + mafiaTeam.map(p => p.name).join('، ');
      list.prepend(info);
    }
    return;
  }

  // Doctor
  if (myRoleId === 'doctor') {
    section.style.display = '';
    section.querySelector('h4').textContent = '💉 احمِ أحد اللاعبين الليلة';
    const doctorProtect = actions.doctor_protect;
    list.innerHTML = '';
    // Doctor can protect self
    const allAlive = Object.values(players).filter(p => p.alive);
    allAlive.forEach(p => {
      const btn = document.createElement('button');
      btn.className = `target-btn${doctorProtect === p.id ? ' selected' : ''}`;
      btn.innerHTML = `<span class="t-icon">${getAnimalEmoji(p.icon)}</span><span class="t-name">${escapeHtml(p.name)}${p.id===session.id?' (أنت)':''}</span>`;
      btn.addEventListener('click', () => {
        Sound.playVoteClick();
        DB.update(`rooms/${session.roomId}/game/nightActions`, { doctor_protect: p.id });
      });
      list.appendChild(btn);
    });
    return;
  }

  // Detective
  if (myRoleId === 'detective') {
    section.style.display = '';
    section.querySelector('h4').textContent = '🔍 تحقق من هوية لاعب';
    const investigated = me.usedAbilities?.investigated_round?.[game.round];
    if (investigated) {
      list.innerHTML = `<div style="font-size:13px;color:rgba(255,255,255,0.5);text-align:center;padding:10px;">تم التحقيق بالفعل هذه الليلة</div>`;
      section.style.display = '';
      return;
    }
    list.innerHTML = '';
    alivePlayers.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.innerHTML = `<span class="t-icon">${getAnimalEmoji(p.icon)}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', async () => {
        Sound.playAbility();
        const isMafia = RoleEngine.isMafia(p.role);
        const result = isMafia ? '⚔ مافيا' : '✓ ليس مافيا';
        showCinematic(result, `نتيجة التحقيق عن ${p.name}`, 3000);
        // Mark used
        await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, {
          [`investigated_round_${game.round}`]: p.id
        });
      });
      list.appendChild(btn);
    });
    return;
  }

  // Whisper (mafia special)
  if (myRoleId === 'whisper') {
    section.style.display = '';
    section.querySelector('h4').textContent = '👁 اكشف دور لاعب للجميع';
    const usedWhisper = me.usedAbilities?.whisper_used;
    if (usedWhisper) {
      list.innerHTML = `<div style="font-size:13px;color:rgba(255,255,255,0.5);text-align:center;padding:10px;">استخدمت هذه القدرة بالفعل</div>`;
      return;
    }
    // Mafia chat too
    document.getElementById('mafia-chat-wrap').style.display = '';
    list.innerHTML = '';
    alivePlayers.forEach(p => {
      if (p.role === 'cursed') return; // cannot target Cursed
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.innerHTML = `<span class="t-icon">${getAnimalEmoji(p.icon)}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', async () => {
        Sound.playWhisper();
        await DB.update(`rooms/${session.roomId}/game/nightActions`, { whisper_target: p.id });
        await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { whisper_used: true });
        showToast('تم إرسال الهمسة!', 'info');
      });
      list.appendChild(btn);
    });
    return;
  }
}

// ── Voting UI ──────────────────────────────────────────────────────────────────
function renderVotingUI(game, me, players) {
  const section = document.getElementById('voting-section');
  const list = document.getElementById('vote-list');
  if (!section || !list) return;

  section.style.display = '';
  const votes = game.votes || {};
  const myVote = votes[session.id];
  const founderActive = game.founderActive;

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
  const tally = {};
  Object.values(votes).forEach(v => { if (v && v!=='skip') tally[v] = (tally[v]||0)+1; });

  list.innerHTML = '';
  const alivePlayers = Object.values(players).filter(p => p.alive && p.id !== session.id);

  alivePlayers.forEach(p => {
    const btn = document.createElement('button');
    btn.className = `vote-btn${myVote === p.id ? ' selected' : ''}`;
    btn.innerHTML = `
      <span class="t-icon">${getAnimalEmoji(p.icon)}</span>
      <span class="t-name">${escapeHtml(p.name)}</span>
      ${tally[p.id] ? `<span class="vote-count">${tally[p.id]} صوت</span>` : ''}
    `;
    if (!myVote) {
      btn.addEventListener('click', () => castVote(p.id));
    }
    list.appendChild(btn);
  });

  // Skip
  const skipBtn = document.createElement('button');
  skipBtn.className = `vote-skip-btn${myVote === 'skip' ? ' selected' : ''}`;
  skipBtn.textContent = '⏭ تخطي — لا أصوت';
  if (!myVote) skipBtn.addEventListener('click', () => castVote('skip'));
  list.appendChild(skipBtn);

  if (myVote) {
    const info = document.createElement('div');
    info.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.4);text-align:center;margin-top:8px;';
    info.textContent = 'تم تسجيل صوتك';
    list.appendChild(info);
  }
}

// ── Cast vote ──────────────────────────────────────────────────────────────────
async function castVote(targetId) {
  Sound.playVoteClick();
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
    content.innerHTML = `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;">خمّن دور لاعب:</div>`;
    const roles = ['doctor','detective','eclipse'];
    const alivePlayers = Object.values(players).filter(p => p.alive && p.id !== session.id && !RoleEngine.isMafia(p.role));

    const targetSel = document.createElement('select');
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
      if (target.role === guessRole) {
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

  } else if (me.role === 'founder' && !me.usedAbilities?.founder_used && game.phase === 'voting') {
    section.style.display = '';
    const btn = document.createElement('button');
    btn.className = 'btn btn-gold btn-full';
    btn.textContent = '❄ تجميد الأصوات — صوّت منفردًا';
    btn.addEventListener('click', async () => {
      Sound.playAbility();
      Effects.screenShake();
      showCinematic('تم تجميد الأصوات جميعًا', 'الصمت ليس ضعفًا... بل سيطرة.', 3000);
      await DB.update(`rooms/${session.roomId}/game`, { founderActive: true });
      await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { founder_used: true });
    });
    content.appendChild(btn);

  } else if (me.role === 'hopebreaker' && !me.usedAbilities?.hopebreaker_used) {
    section.style.display = '';
    content.innerHTML = `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;">اختر لاعباً — إن كان مافيا يُكشف ويموت وأنت تموت:</div>`;
    const alivePlayers = Object.values(players).filter(p => p.alive && p.id !== session.id);

    alivePlayers.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.innerHTML = `<span class="t-icon">${getAnimalEmoji(p.icon)}</span><span class="t-name">${escapeHtml(p.name)}</span>`;
      btn.addEventListener('click', async () => {
        Sound.playAbility();
        const isMafia = RoleEngine.isMafia(p.role);
        if (isMafia) {
          showCinematic('مافيا! 💥', `${p.name} هو ${RoleEngine.getRoleArabicName(p.role)} — كُشف أمام الجميع!`, 4000);
          await DB.update(`rooms/${session.roomId}/players/${p.id}`, { alive: false });
          await DB.push(`rooms/${session.roomId}/game/chat`, {
            playerId: 'system', name: 'النظام', icon: 'owl',
            text: `محطم الآمال كشف ${p.name} — كان ${RoleEngine.getRoleArabicName(p.role)}!`,
            ts: DB.timestamp(), type: 'system',
          });
        } else {
          showCinematic('الأمل آخر شيء يختفي...', `${p.name} لم يكن مافيا — محطم الآمال ضحّى بلا فائدة`, 3500);
        }
        await DB.update(`rooms/${session.roomId}/players/${session.id}`, { alive: false });
        await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { hopebreaker_used: true });
      });
      content.appendChild(btn);
    });

  } else if (me.role === 'phoenix' && !me.usedAbilities?.phoenix_used) {
    section.style.display = '';
    const deadPlayers = Object.values(players).filter(p => !p.alive && p.id !== session.id);
    if (deadPlayers.length > 0) {
      content.innerHTML = `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px;">أحيِ لاعباً ميتاً وانضم لفريقه:</div>`;
      deadPlayers.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'target-btn';
        btn.innerHTML = `<span class="t-icon">${getAnimalEmoji(p.icon)}</span><span class="t-name">${escapeHtml(p.name)} (${RoleEngine.getRoleArabicName(p.role)})</span>`;
        btn.addEventListener('click', async () => {
          Sound.playAbility();
          showCinematic('عاد من الموت...', `${p.name} لكنه لم يعد كما كان.`, 3500);
          // Revive
          await DB.update(`rooms/${session.roomId}/players/${p.id}`, { alive: true });
          // Phoenix joins their team
          await DB.update(`rooms/${session.roomId}/players/${session.id}`, { team: p.team });
          await DB.update(`rooms/${session.roomId}/players/${session.id}/usedAbilities`, { phoenix_used: true });
        });
        content.appendChild(btn);
      });
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
let whisperShown = false;
function checkWhisperReveal(game, players) {
  const wt = game.nightActions?.whisper_target;
  if (wt && !whisperShown && game.phase === 'night') {
    whisperShown = true;
    const target = players[wt];
    if (!target) return;
    Sound.playWhisper();
    showWhisperReveal(target, 10);
  }
  if (!wt) whisperShown = false;
}

function showWhisperReveal(player, seconds) {
  const ov = document.getElementById('whisper-reveal-overlay');
  const img = document.getElementById('whisper-reveal-img');
  const cnt = document.getElementById('whisper-countdown');
  const lbl = document.getElementById('whisper-label');
  if (!ov) return;

  const roleData = RoleEngine.getRole(player.role);
  img.src = roleData.image;
  lbl.textContent = `${player.name} — ${roleData.arabicName}`;
  ov.classList.add('active');

  let left = seconds;
  cnt.textContent = left;
  const t = setInterval(() => {
    left--;
    cnt.textContent = left;
    if (left <= 0) {
      clearInterval(t);
      ov.classList.remove('active');
    }
  }, 1000);
}

// ── Chat ───────────────────────────────────────────────────────────────────────
let chatTab = 'public';

function initChatTabs() {
  document.getElementById('tab-public')?.addEventListener('click', () => { chatTab = 'public'; updateChatTabs(); });
  document.getElementById('tab-mafia')?.addEventListener('click', () => { chatTab = 'mafia'; updateChatTabs(); });
}

function updateChatTabs() {
  document.getElementById('tab-public').classList.toggle('active', chatTab === 'public');
  document.getElementById('tab-mafia').classList.toggle('active', chatTab === 'mafia');
}

function lockPublicChat(locked) {
  const inp = document.getElementById('game-chat-input');
  const btn = document.getElementById('game-chat-send');
  const lockMsg = document.getElementById('chat-lock-msg');
  if (!inp) return;

  // Only lock if it's not mafia or night phase
  const me = roomData?.players?.[session.id];
  const isNight = roomData?.game?.phase === 'night';
  const myRoleIsMafia = me && RoleEngine.isMafia(me.role);

  if (locked && !myRoleIsMafia) {
    inp.disabled = true;
    btn.disabled = true;
    if (lockMsg) lockMsg.style.display = '';
  } else {
    inp.disabled = false;
    btn.disabled = false;
    if (lockMsg) lockMsg.style.display = 'none';
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
  if (!me || !me.alive) { showToast('الأموات لا يتحدثون', 'error'); return; }

  inp.value = '';

  const msgData = {
    playerId: session.id,
    name: me.name,
    icon: me.icon,
    text,
    ts: DB.timestamp(),
    type: chatTab,
  };

  if (chatTab === 'mafia' && !RoleEngine.isMafia(me.role)) {
    showToast('هذه القناة للمافيا فقط', 'error'); return;
  }

  const phase = roomData?.game?.phase;
  if (chatTab === 'mafia' && phase !== 'night') {
    showToast('دردشة المافيا في الليل فقط', 'error'); return;
  }

  if (chatTab === 'public' && phase === 'night' && !RoleEngine.isMafia(me.role)) {
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
  const showMafia = me && RoleEngine.isMafia(me.role);

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
        <span class="icon">${getAnimalEmoji(msg.icon)}</span>
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
      <span class="icon">${getAnimalEmoji(p.icon)}</span>
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
