// lobby.js — اللوبي

(async () => {

  // ===== تحقق من البيانات =====
  const roomCode = getUrlParam('room');
  const local    = loadLocalPlayer();

  if (!roomCode || !local || local.roomCode !== roomCode) {
    showToast('انتهت الجلسة، العودة للرئيسية', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }

  const { playerId, playerName, isHost } = local;

  // ===== عرض كود الغرفة =====
  document.getElementById('room-code-display').textContent = roomCode;
  document.getElementById('btn-copy-code').addEventListener('click', () => copyToClipboard(roomCode));

  hideLoading();

  // ===== بناء واجهة الهوست =====
  if (isHost) {
    document.getElementById('host-controls').classList.remove('hidden');
    document.getElementById('host-only-note').classList.add('hidden');
    _buildHostSettings();
  }

  // ===== الاستماع للاعبين =====
  Rooms.listenPlayers(roomCode, players => {
    _renderPlayers(players);
    _updateReadyStatus(players);

    // التحقق من نقل الهوست
    const me = players[playerId];
    if (me && me.isHost && !isHost) {
      local.isHost = true;
      saveLocalPlayer(local);
      showToast('أصبحت الهوست', 'info');
      document.getElementById('host-controls').classList.remove('hidden');
      document.getElementById('host-only-note').classList.add('hidden');
    }
  });

  // ===== الاستماع لحالة الغرفة =====
  Rooms.listenStatus(roomCode, status => {
    if (status === ROOM_STATUS.PLAYING) {
      window.location.href = `game.html?room=${roomCode}`;
    }
  });

  // ===== زر الجاهزية =====
  let amReady = false;
  const readyBtn = document.getElementById('btn-ready');
  readyBtn.addEventListener('click', async () => {
    amReady = !amReady;
    readyBtn.disabled = true;
    await Rooms.setReady(roomCode, playerId, amReady);
    readyBtn.disabled = false;
    readyBtn.textContent = amReady ? 'إلغاء الجاهزية' : 'جاهز ✓';
    readyBtn.className = amReady ? 'btn btn-secondary btn-full' : 'btn btn-primary btn-full';
  });

  // ===== الشات =====
  Chat.listenChat(roomCode, 'lobby-chat-messages', 'lobby');
  Chat.bindInput('lobby-chat-input', 'lobby-chat-send', roomCode, playerId, playerName, 'lobby');

  // ===== onDisconnect =====
  db.ref(`rooms/${roomCode}/players/${playerId}/connected`).onDisconnect().set(false);
  await db.ref(`rooms/${roomCode}/players/${playerId}/connected`).set(true);

  // ===== رسالة دخول =====
  await Chat.sendSystemMessage(roomCode, `${playerName} انضم للغرفة`, 'lobby');

  // ===== إعدادات الهوست =====
  function _buildHostSettings() {
    const roundSel = document.getElementById('setting-round-time');
    const maxSel   = document.getElementById('setting-max-players');

    // بناء الخيارات
    ROUND_TIME_OPTIONS.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = `${t} ثانية`;
      if (t === DEFAULT_SETTINGS.roundTime) opt.selected = true;
      roundSel.appendChild(opt);
    });

    MAX_PLAYERS_OPTIONS.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n; opt.textContent = `${n} لاعب`;
      if (n === DEFAULT_SETTINGS.maxPlayers) opt.selected = true;
      maxSel.appendChild(opt);
    });

    roundSel.addEventListener('change', () => {
      Rooms.updateSettings(roomCode, { roundTime: parseInt(roundSel.value) });
    });
    maxSel.addEventListener('change', () => {
      Rooms.updateSettings(roomCode, { maxPlayers: parseInt(maxSel.value) });
    });

    // زر بدء
    document.getElementById('btn-start').addEventListener('click', _startGame);
  }

  async function _startGame() {
    const snap = await db.ref(`rooms/${roomCode}/players`).get();
    const players = snap.val() || {};
    const activePlayers = Object.values(players).filter(p => p.role === 'player' && p.connected !== false);

    if (activePlayers.length < 2) { showToast('يجب أن يكون هناك لاعبان على الأقل', 'error'); return; }

    const notReady = activePlayers.filter(p => !p.id === playerId && !p.isReady);
    if (notReady.length > 0) { showToast('انتظر حتى يكون الجميع جاهزين', 'error'); return; }

    const startBtn = document.getElementById('btn-start');
    startBtn.disabled = true;
    startBtn.textContent = 'جارٍ البدء...';

    try {
      // بناء البركت
      const playerIds = activePlayers.map(p => p.id);
      const rounds = Tournament.generateBracket(playerIds);
      await Tournament.saveBracket(roomCode, rounds, playerIds);

      // تعيين أول مباراة
      const firstMatch = Tournament.getNextActiveMatch(rounds);
      if (firstMatch) {
        await db.ref(`rooms/${roomCode}/tournament/currentMatchId`).set(firstMatch.id);
      }

      await Rooms.startGame(roomCode);
    } catch (e) {
      console.error('Start failed:', e);
      showToast('فشل بدء اللعبة: ' + e.message, 'error');
      startBtn.disabled = false;
      startBtn.textContent = 'ابدأ اللعبة';
    }
  }

  // ===== رسم اللاعبين =====
  function _renderPlayers(players) {
    const grid = document.getElementById('players-grid');
    grid.innerHTML = '';

    Object.values(players).sort((a, b) => a.joinedAt - b.joinedAt).forEach(p => {
      const skin = SKINS.find(s => s.id === p.skinId) || SKINS[0];
      const isMe = p.id === playerId;
      const isHostPlayer = p.isHost;
      const readyLabel = p.role === 'spectator' ? 'متفرج' : (p.isReady ? 'جاهز' : 'غير جاهز');
      const readyClass = p.role === 'spectator' ? 'spectator' : (p.isReady ? 'ready' : 'not-ready');

      const card = document.createElement('div');
      card.className = `player-card ${p.isReady ? 'ready' : ''} ${p.role === 'spectator' ? 'spectator' : ''} ${isMe ? 'is-me' : ''}`;
      card.innerHTML = `
        ${isHostPlayer ? '<span class="player-host-badge">👑 هوست</span>' : ''}
        <div class="player-avatar">${skin.emoji}</div>
        <div class="player-info">
          <div class="player-name">${escapeHtml(p.name)}${isMe ? ' (أنا)' : ''}</div>
          <div class="player-status ${readyClass}">${readyLabel}</div>
        </div>
        ${isHost && !isMe ? `
          <div style="display:flex;flex-direction:column;gap:4px;margin-right:auto">
            <button class="btn btn-sm btn-danger" onclick="kickPlayer('${p.id}')">طرد</button>
            <button class="btn btn-sm btn-secondary" onclick="makeSpectator('${p.id}')">متفرج</button>
          </div>` : ''}
      `;
      grid.appendChild(card);
    });
  }

  function _updateReadyStatus(players) {
    const active = Object.values(players).filter(p => p.role === 'player');
    const readyCount = active.filter(p => p.isReady).length;
    const el = document.getElementById('ready-count');
    if (el) el.textContent = `${readyCount} / ${active.length} جاهزين`;
  }

  // ===== دوال الهوست العالمية =====
  window.kickPlayer = async (pid) => {
    if (!confirm('هل أنت متأكد من الطرد؟')) return;
    await Rooms.kickPlayer(roomCode, pid);
    await Chat.sendSystemMessage(roomCode, 'تم طرد أحد اللاعبين', 'lobby');
  };

  window.makeSpectator = async (pid) => {
    await Rooms.makeSpectator(roomCode, pid);
  };

})();
