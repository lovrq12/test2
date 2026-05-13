// game.js — صفحة اللعب الرئيسية

(async () => {

  // ===== تحذير file:// =====
  if (window.location.protocol === 'file:') {
    const ov = document.getElementById('loading-overlay');
    if (ov) ov.innerHTML = `
      <div style="text-align:center;max-width:460px;padding:24px;font-family:Tajawal,sans-serif">
        <div style="font-size:3rem;margin-bottom:16px">⚠️</div>
        <h2 style="color:#d4a017;margin-bottom:12px">تحتاج سيرفر محلي</h2>
        <p style="color:#999;line-height:1.9;margin-bottom:16px">
          المتصفح يمنع تحميل ملفات 3D عبر <span style="color:#e74c3c">file://</span><br>
          شغّل سيرفر محلي أولاً:
        </p>
        <div style="background:#111;border:1px solid #333;border-radius:8px;padding:14px;font-family:monospace;color:#7ec8e3;margin-bottom:16px;direction:ltr;text-align:left">
          python -m http.server 8080
        </div>
        <p style="color:#999;margin-bottom:4px">ثم افتح في المتصفح:</p>
        <div style="background:#111;border:1px solid #333;border-radius:8px;padding:10px;font-family:monospace;color:#7ec8e3;direction:ltr;text-align:left">
          http://localhost:8080
        </div>
      </div>`;
    return;
  }

  // ===== بيانات اللاعب =====
  const roomCode = getUrlParam('room');
  const local    = loadLocalPlayer();

  if (!roomCode || !local || local.roomCode !== roomCode) {
    window.location.href = 'index.html'; return;
  }

  const { playerId, playerName } = local;

  // ===== حالة اللعبة المحلية =====
  let state = {
    players:      {},       // كل لاعبي الغرفة
    tournament:   null,     // بيانات البطولة
    currentMatch: null,     // المباراة الحالية
    currentRound: null,     // الجولة الحالية
    myRole:       null,     // 'A' | 'B' | 'spectator'
    matchRole:    null,     // 'speaker' | 'investigator'
    roundNumber:  0,        // رقم الجولة في المباراة (0,1,2)
    timerInterval: null,
    activeListeners: []
  };

  // ===== تهيئة 3D =====
  Scene3D.init('three-canvas');
  Scene3D.loadRoom(
    () => {
      MysteryBox3D.build(Scene3D.scene);
      Characters3D.loadBoth(Scene3D.scene, state.myRole, () => {});
    },
    () => {
      // room load failed — fallback already handled inside scene.js
      MysteryBox3D.build(Scene3D.scene);
    }
  );
  Scene3D.startRenderLoop();

  // ===== تحميل اللاعبين =====
  await _loadPlayers();
  hideLoading();

  // ===== الاستماع للبيانات =====
  _listenTournament();
  _listenPlayers();

  // ===== شات اللعبة =====
  Chat.listenChat(roomCode, 'game-chat-messages', 'game');
  Chat.bindInput('game-chat-input', 'game-chat-send', roomCode, playerId, playerName, 'game');

  // ===== onDisconnect =====
  db.ref(`rooms/${roomCode}/players/${playerId}/connected`).onDisconnect().set(false);
  await db.ref(`rooms/${roomCode}/players/${playerId}/connected`).set(true);

  // ===================================================
  // تحميل اللاعبين
  // ===================================================
  async function _loadPlayers() {
    const snap = await db.ref(`rooms/${roomCode}/players`).get();
    state.players = snap.val() || {};
  }

  function _listenPlayers() {
    const ref = db.ref(`rooms/${roomCode}/players`);
    ref.on('value', snap => {
      state.players = snap.val() || {};
    });
    state.activeListeners.push({ ref, event: 'value' });
  }

  // ===================================================
  // الاستماع للبطولة
  // ===================================================
  function _listenTournament() {
    const ref = db.ref(`rooms/${roomCode}/tournament`);
    ref.on('value', snap => {
      const tournament = snap.val();
      if (!tournament) return;
      state.tournament = tournament;
      _renderBracket(tournament);

      // إذا انتهت البطولة
      if (tournament.championId) {
        _showChampion(tournament.championId); return;
      }

      const matchId = tournament.currentMatchId;
      if (matchId && (!state.currentMatch || state.currentMatch.id !== matchId)) {
        _startListeningMatch(matchId);
      }
    });
    state.activeListeners.push({ ref, event: 'value' });
  }

  // ===================================================
  // الاستماع للمباراة
  // ===================================================
  function _startListeningMatch(matchId) {
    // أزل listener السابق
    if (state._matchRef) state._matchRef.off('value');

    const ref = db.ref(`rooms/${roomCode}/matches/${matchId}`);
    ref.on('value', snap => {
      const match = snap.val();
      if (!match) return;

      // أول مرة — هيئ المباراة
      if (!state.currentMatch || state.currentMatch.id !== match.id) {
        state.currentMatch = match;
        _initMatch(match);
      } else {
        state.currentMatch = match;
      }

      _updateMatchUI(match);

      // الاستماع للجولة الحالية
      if (match.currentRoundId && (!state.currentRound || state.currentRound.id !== match.currentRoundId)) {
        _startListeningRound(match.currentRoundId, match);
      }
    });
    state._matchRef = ref;
    state.activeListeners.push({ ref, event: 'value' });
  }

  // ===================================================
  // تهيئة مباراة جديدة
  // ===================================================
  async function _initMatch(match) {
    // حدد دوري
    if (match.playerA === playerId) state.myRole = 'A';
    else if (match.playerB === playerId) state.myRole = 'B';
    else state.myRole = 'spectator';

    state.roundNumber = 0;

    // تحديث كاميرا 3D
    if (state.myRole === 'A') Scene3D.setCameraForPlayer(true);
    else if (state.myRole === 'B') Scene3D.setCameraForPlayer(false);
    else Scene3D.setCameraDefault();

    // إذا كنت اللاعب A وهذه أول جولة — الهوست ينشئ الجولة الأولى
    const myLocal = loadLocalPlayer();
    if (myLocal && myLocal.isHost && !match.currentRoundId) {
      await _createNextRound(match);
    }
  }

  // ===================================================
  // إنشاء جولة جديدة
  // ===================================================
  async function _createNextRound(match) {
    state.roundNumber++;
    const rn = state.roundNumber;

    // تبادل الأدوار
    let speakerId, investigatorId;
    if (rn === 1) {
      speakerId = match.playerA; investigatorId = match.playerB;
    } else if (rn === 2) {
      speakerId = match.playerB; investigatorId = match.playerA;
    } else {
      // جولة 3 — عشوائي
      if (Math.random() < 0.5) { speakerId = match.playerA; investigatorId = match.playerB; }
      else { speakerId = match.playerB; investigatorId = match.playerA; }
    }

    const { roundId } = await GameState.createRound(roomCode, match.id, speakerId, investigatorId, rn);
    console.log('[Game] Created round:', roundId);
  }

  // ===================================================
  // الاستماع للجولة
  // ===================================================
  function _startListeningRound(roundId, match) {
    if (state._roundRef) state._roundRef.off('value');

    const ref = db.ref(`rooms/${roomCode}/rounds/${roundId}`);
    ref.on('value', snap => {
      const round = snap.val();
      if (!round) return;

      const prevStatus = state.currentRound?.status;
      state.currentRound = round;

      // تحديد دوري في الجولة
      if (round.speakerId === playerId) state.matchRole = 'speaker';
      else if (round.investigatorId === playerId) state.matchRole = 'investigator';
      else state.matchRole = 'spectator';

      _renderRound(round, match);

      // انتهت الجولة → الهوست ينشئ التالية أو ينهي المباراة
      if (round.status === ROUND_STATUS.FINISHED && prevStatus !== ROUND_STATUS.FINISHED) {
        _handleRoundEnd(round, match);
      }
    });
    state._roundRef = ref;

    // timer
    _startTimer(roundId);
  }

  // ===================================================
  // رسم الجولة
  // ===================================================
  function _renderRound(round, match) {
    const status = round.status;

    // إخفاء كل panels
    _hideAll();

    switch (status) {
      case ROUND_STATUS.CHOOSE_MODE:
        if (state.matchRole === 'speaker') _showChooseMode(round);
        else _showWaitingPanel('انتظر... اللاعب يختار وضعه');
        break;

      case ROUND_STATUS.QUESTIONING:
        _showQA(round);
        break;

      case ROUND_STATUS.GUESSING:
        if (state.matchRole === 'investigator') _showGuessing(round);
        else _showWaitingPanel('انتظر قرار المحقق...');
        break;

      case ROUND_STATUS.REVEAL:
        _showReveal(round);
        break;
    }

    // عرض الغرض السري لصاحب الصندوق فقط
    if (state.matchRole === 'speaker' && round.itemId && status !== ROUND_STATUS.CHOOSE_MODE) {
      _showSecretItem(round);
    }
  }

  function _hideAll() {
    ['panel-choose-mode', 'panel-waiting', 'panel-qa', 'panel-guessing', 'secret-item-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  // اختيار الوضع
  function _showChooseMode(round) {
    const panel = document.getElementById('panel-choose-mode');
    if (!panel) return;
    panel.classList.remove('hidden');

    const item = getItemById(round.itemId);
    document.getElementById('choose-item-name').textContent = item.name;
    document.getElementById('choose-item-emoji').textContent = item.emoji;

    document.getElementById('btn-choose-truth').onclick = async () => {
      await GameState.chooseTruthMode(roomCode, round.id, 'truth');
    };
    document.getElementById('btn-choose-lie').onclick = async () => {
      await GameState.chooseTruthMode(roomCode, round.id, 'lie');
    };
  }

  // عرض الغرض السري
  function _showSecretItem(round) {
    const card = document.getElementById('secret-item-card');
    if (!card || !round.truthMode) return;
    card.classList.remove('hidden');

    const item = getItemById(round.itemId);
    document.getElementById('secret-emoji').textContent = item.emoji;
    document.getElementById('secret-name').textContent = item.name;
    document.getElementById('secret-hints').textContent = item.hints.join(' • ') || 'لا تلميحات';
    const badge = document.getElementById('secret-mode-badge');
    badge.textContent = round.truthMode === 'truth' ? '🔵 صادق' : '🔴 كذاب';
    badge.className = `mode-badge ${round.truthMode}`;
  }

  // انتظار
  function _showWaitingPanel(msg) {
    const panel = document.getElementById('panel-waiting');
    if (!panel) return;
    panel.classList.remove('hidden');
    document.getElementById('waiting-msg').textContent = msg;
  }

  // منطقة السؤال والجواب
  function _showQA(round) {
    const panel = document.getElementById('panel-qa');
    if (!panel) return;
    panel.classList.remove('hidden');

    const isInvestigator = state.matchRole === 'investigator';
    const isSpeaker      = state.matchRole === 'speaker';
    const turn           = round.turn;

    // رسم سجل الأسئلة
    _renderQALog(round.questions || {});

    // إظهار حقل الإدخال المناسب
    const qRow = document.getElementById('qa-question-row');
    const aRow = document.getElementById('qa-answer-row');

    if (qRow) qRow.classList.add('hidden');
    if (aRow) aRow.classList.add('hidden');

    if (isInvestigator && turn === ROUND_TURN.INVESTIGATOR_QUESTION) {
      if (qRow) qRow.classList.remove('hidden');
      document.getElementById('turn-label').textContent = '🔍 دورك — اسأل سؤالاً';
    } else if (isSpeaker && turn === ROUND_TURN.SPEAKER_ANSWER) {
      // إيجاد السؤال الأخير بدون جواب
      const questions = round.questions || {};
      const pending = Object.values(questions).find(q => !q.answer);
      if (pending && aRow) {
        aRow.classList.remove('hidden');
        aRow.dataset.qid = pending.id;
      }
      document.getElementById('turn-label').textContent = '💬 دورك — أجب';
    } else {
      document.getElementById('turn-label').textContent = isInvestigator ? '⏳ انتظر الجواب...' : '⏳ انتظر السؤال...';
    }
  }

  function _renderQALog(questions) {
    const log = document.getElementById('qa-log');
    if (!log) return;
    log.innerHTML = '';

    Object.values(questions).sort((a, b) => a.createdAt - b.createdAt).forEach(q => {
      const qEntry = document.createElement('div');
      qEntry.className = 'qa-entry question';
      qEntry.innerHTML = `<div class="qa-from">🔍 ${escapeHtml(q.fromName || 'المحقق')}</div><div class="qa-text">${escapeHtml(q.text)}</div>`;
      log.appendChild(qEntry);

      if (q.answer) {
        const aEntry = document.createElement('div');
        aEntry.className = 'qa-entry answer';
        aEntry.innerHTML = `<div class="qa-from">💬 صاحب الصندوق</div><div class="qa-text">${escapeHtml(q.answer)}</div>`;
        log.appendChild(aEntry);
      }
    });

    log.scrollTop = log.scrollHeight;
  }

  // تخمين المحقق
  function _showGuessing(round) {
    const panel = document.getElementById('panel-guessing');
    if (!panel) return;
    panel.classList.remove('hidden');

    document.getElementById('btn-guess-truth').onclick = async () => {
      const playerA = state.currentMatch.playerA;
      const playerB = state.currentMatch.playerB;
      const sp = round.speakerId, inv = round.investigatorId;
      await GameState.submitGuess(roomCode, round.id, state.currentMatch.id, 'truth', sp, inv, state.players);
    };
    document.getElementById('btn-guess-lie').onclick = async () => {
      const sp = round.speakerId, inv = round.investigatorId;
      await GameState.submitGuess(roomCode, round.id, state.currentMatch.id, 'lie', sp, inv, state.players);
    };
  }

  // Reveal
  async function _showReveal(round) {
    const item = getItemById(round.itemId);
    const winner = state.players[round.winnerId];

    // فتح الصندوق 3D
    MysteryBox3D.openBox(() => {
      setTimeout(() => MysteryBox3D.resetBox(), 6000);
    });

    // overlay
    const overlay = document.getElementById('reveal-overlay');
    if (!overlay) return;

    document.getElementById('reveal-emoji').textContent = item.emoji;
    document.getElementById('reveal-item-name').textContent = item.name;
    document.getElementById('reveal-mode-text').textContent = round.truthMode === 'truth' ? '🔵 كان صادقًا' : '🔴 كان يكذب';
    document.getElementById('reveal-guess-result').textContent = round.guess?.correct ? '✅ المحقق أصاب' : '❌ المحقق أخطأ';
    document.getElementById('reveal-winner-name').textContent = winner ? winner.name : '—';

    overlay.classList.remove('hidden');

    // إخفاء الـ overlay بعد 5 ثوانٍ (الهوست يكمل)
    setTimeout(async () => {
      overlay.classList.add('hidden');

      if (round.status !== ROUND_STATUS.REVEAL) return;
      // إنهاء الجولة
      const myLocal = loadLocalPlayer();
      if (myLocal && myLocal.isHost) {
        await _finalizeCurrentRound(round);
      }
    }, 5000);
  }

  // ===================================================
  // إنهاء الجولة
  // ===================================================
  async function _finalizeCurrentRound(round) {
    const match = state.currentMatch;
    const score = await GameState.finalizeRound(roomCode, round.id, match.id, round.winnerId, match.playerA, match.playerB);
    await db.ref(`rooms/${roomCode}/rounds/${round.id}/status`).set(ROUND_STATUS.FINISHED);
  }

  // ===================================================
  // نهاية الجولة — قرار المباراة
  // ===================================================
  async function _handleRoundEnd(round, match) {
    const myLocal = loadLocalPlayer();
    if (!myLocal || !myLocal.isHost) return;

    // انتظر قليلاً
    await sleep(6000);

    const snapMatch = await db.ref(`rooms/${roomCode}/matches/${match.id}`).get();
    const freshMatch = snapMatch.val();
    const score = freshMatch.score || { playerA: 0, playerB: 0 };

    const matchWinner = GameState.checkMatchWinner(score, match.playerA, match.playerB);

    if (matchWinner) {
      // انتهت المباراة
      await GameState.finalizeMatch(roomCode, match.id, matchWinner);
      const { nextMatch, champion } = await GameState.advanceTournament(roomCode, match.id, matchWinner);

      if (champion) {
        await db.ref(`rooms/${roomCode}/tournament/championId`).set(champion);
      } else if (nextMatch) {
        // ابدأ المباراة التالية
        await db.ref(`rooms/${roomCode}/tournament/currentMatchId`).set(nextMatch.id);
        const newMatchData = await GameState.createMatch(roomCode, nextMatch.id, nextMatch.playerA, nextMatch.playerB);
        await _createNextRoundForMatch(newMatchData);
      }
    } else {
      // جولة تالية في نفس المباراة
      await _createNextRoundForMatch(freshMatch);
    }
  }

  async function _createNextRoundForMatch(match) {
    state.roundNumber = (state.roundNumber || 0) + 1;
    const rn = state.roundNumber;
    let speakerId, investigatorId;

    if (rn % 2 === 1) {
      speakerId = match.playerA; investigatorId = match.playerB;
    } else {
      speakerId = match.playerB; investigatorId = match.playerA;
    }

    await GameState.createRound(roomCode, match.id, speakerId, investigatorId, rn);
  }

  // ===================================================
  // Timer
  // ===================================================
  function _startTimer(roundId) {
    if (state.timerInterval) clearInterval(state.timerInterval);

    state.timerInterval = setInterval(async () => {
      const round = state.currentRound;
      if (!round || round.id !== roundId) { clearInterval(state.timerInterval); return; }
      if (round.status !== ROUND_STATUS.QUESTIONING) return;

      const remaining = Math.max(0, Math.floor((round.endsAt - now()) / 1000));
      const timerEl = document.getElementById('match-timer');
      if (timerEl) {
        timerEl.textContent = formatTime(remaining);
        timerEl.classList.toggle('urgent', remaining <= 10);
      }

      if (remaining <= 0) {
        clearInterval(state.timerInterval);
        // الهوست ينهي الجولة بالوقت
        const myLocal = loadLocalPlayer();
        if (myLocal && myLocal.isHost) {
          await GameState.handleTimeUp(roomCode, round.id, state.currentMatch?.id, round.investigatorId, round.speakerId);
          // إذا قُلب الدور لـ guessing، المحقق يرى الأزرار
          await db.ref(`rooms/${roomCode}/rounds/${round.id}/status`).set(ROUND_STATUS.GUESSING);
        }
      }
    }, 500);
  }

  // ===================================================
  // تحديث UI المباراة
  // ===================================================
  function _updateMatchUI(match) {
    const pA = state.players[match.playerA];
    const pB = state.players[match.playerB];

    const nameA = document.getElementById('match-name-a');
    const nameB = document.getElementById('match-name-b');
    const scoreEl = document.getElementById('match-score');

    if (nameA) nameA.textContent = pA?.name || '—';
    if (nameB) nameB.textContent = pB?.name || '—';
    if (scoreEl && match.score) {
      scoreEl.textContent = `${match.score.playerA} : ${match.score.playerB}`;
    }
  }

  // ===================================================
  // رسم البركت
  // ===================================================
  function _renderBracket(tournament) {
    const container = document.getElementById('bracket-list');
    if (!container || !tournament.rounds) return;
    container.innerHTML = '';

    tournament.rounds.forEach((round, ri) => {
      const label = Tournament.getRoundLabel(tournament.rounds.length, ri);
      const heading = document.createElement('div');
      heading.style.cssText = 'font-size:0.7rem;color:var(--text-dim);margin:8px 0 4px;letter-spacing:0.06em;';
      heading.textContent = label;
      container.appendChild(heading);

      round.forEach(match => {
        if (match.isBye) return;
        const pA = state.players[match.playerA];
        const pB = state.players[match.playerB];
        const isCurrent = tournament.currentMatchId === match.id;

        const card = document.createElement('div');
        card.className = 'bracket-match';
        card.innerHTML = `
          <div class="bm-label">${isCurrent ? '🔴 جارية' : match.status === 'finished' ? '✓ انتهت' : '⏳ قادمة'}</div>
          <div class="bm-player ${match.winnerId === match.playerA ? 'winner' : ''} ${isCurrent && match.playerA === playerId ? 'current' : ''}">${pA?.name || '?'}</div>
          <div class="bm-player ${match.winnerId === match.playerB ? 'winner' : ''} ${isCurrent && match.playerB === playerId ? 'current' : ''}">${pB?.name || '?'}</div>
        `;
        container.appendChild(card);
      });
    });
  }

  // ===================================================
  // نهاية البطولة — البطل
  // ===================================================
  function _showChampion(championId) {
    const champion = state.players[championId];
    if (!champion) return;

    const overlay = document.getElementById('tournament-end-overlay');
    if (!overlay) return;

    document.getElementById('champion-name').textContent = champion.name;
    overlay.classList.remove('hidden');

    // كونفيتي بسيط بـ CSS
    const skin = SKINS.find(s => s.id === champion.skinId) || SKINS[0];
    document.getElementById('champion-skin').textContent = skin.emoji;
  }

  // ===================================================
  // ربط أزرار الإجراءات
  // ===================================================

  // إرسال سؤال
  document.getElementById('btn-send-question')?.addEventListener('click', async () => {
    const input = document.getElementById('question-input');
    const text  = input?.value.trim();
    if (!text || !state.currentRound) return;
    input.value = '';
    await GameState.sendQuestion(roomCode, state.currentRound.id, playerId, playerName, text);
  });

  document.getElementById('question-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-send-question')?.click();
  });

  // إرسال جواب
  document.getElementById('btn-send-answer')?.addEventListener('click', async () => {
    const input = document.getElementById('answer-input');
    const text  = input?.value.trim();
    const aRow  = document.getElementById('qa-answer-row');
    const qid   = aRow?.dataset.qid;
    if (!text || !state.currentRound || !qid) return;
    input.value = '';
    await GameState.sendAnswer(roomCode, state.currentRound.id, qid, text);
  });

  document.getElementById('answer-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-send-answer')?.click();
  });

  // زر مغادرة
  document.getElementById('btn-leave')?.addEventListener('click', () => {
    clearLocalPlayer();
    window.location.href = 'index.html';
  });

})();
