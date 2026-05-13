// game-state.js — إدارة حالة اللعبة

const GameState = (() => {

  let _listeners = [];

  function trackRef(ref, event, handler) {
    ref.on(event, handler);
    _listeners.push({ ref, event, handler });
    return handler;
  }

  function cleanup() {
    _listeners.forEach(({ ref, event, handler }) => ref.off(event, handler));
    _listeners = [];
  }

  // ===== إنشاء مباراة جديدة =====
  async function createMatch(code, matchId, playerA, playerB) {
    const matchData = {
      id:           matchId,
      playerA,
      playerB,
      winnerId:     null,
      status:       'playing',
      score:        { playerA: 0, playerB: 0 },
      currentRoundId: null
    };
    await db.ref(`rooms/${code}/matches/${matchId}`).set(matchData);
    return matchData;
  }

  // ===== إنشاء جولة =====
  async function createRound(code, matchId, speakerId, investigatorId, roundNumber) {
    const roundId = generateId(12);
    const roundTime = await getRoomRoundTime(code);
    const startedAt = now();
    const endsAt = startedAt + roundTime * 1000;

    // اختيار الغرض
    // 30% احتمال صندوق فارغ
    const itemPool = Math.random() < 0.3 ? ITEMS : ITEMS.filter(i => i.id !== 'empty');
    const item = itemPool[Math.floor(Math.random() * itemPool.length)];
    // truthMode يُختار بواسطة صاحب الصندوق — هنا نضع قيمة افتراضية pending
    const roundData = {
      id:           roundId,
      matchId,
      roundNumber,
      speakerId,
      investigatorId,
      truthMode:    null, // يُختار من صاحب الصندوق
      itemId:       item.id,
      status:       ROUND_STATUS.CHOOSE_MODE,
      startedAt,
      endsAt,
      turn:         ROUND_TURN.INVESTIGATOR_QUESTION,
      winnerId:     null
    };

    await db.ref(`rooms/${code}/rounds/${roundId}`).set(roundData);
    await db.ref(`rooms/${code}/matches/${matchId}/currentRoundId`).set(roundId);

    return { roundId, round: roundData, item };
  }

  async function getRoomRoundTime(code) {
    const snap = await db.ref(`rooms/${code}/settings/roundTime`).get();
    return snap.val() || DEFAULT_SETTINGS.roundTime;
  }

  // ===== صاحب الصندوق يختار الوضع =====
  async function chooseTruthMode(code, roundId, mode) {
    await db.ref(`rooms/${code}/rounds/${roundId}`).update({
      truthMode: mode,
      status: ROUND_STATUS.QUESTIONING,
      turn: ROUND_TURN.INVESTIGATOR_QUESTION
    });
  }

  // ===== إرسال سؤال =====
  async function sendQuestion(code, roundId, fromId, fromName, text) {
    const qId = generateId(12);
    const entry = { id: qId, from: fromId, fromName, text, answer: null, createdAt: now() };
    await db.ref(`rooms/${code}/rounds/${roundId}/questions/${qId}`).set(entry);
    await db.ref(`rooms/${code}/rounds/${roundId}/turn`).set(ROUND_TURN.SPEAKER_ANSWER);
    return qId;
  }

  // ===== إرسال جواب =====
  async function sendAnswer(code, roundId, questionId, text) {
    await db.ref(`rooms/${code}/rounds/${roundId}/questions/${questionId}/answer`).set(text);
    await db.ref(`rooms/${code}/rounds/${roundId}/turn`).set(ROUND_TURN.INVESTIGATOR_QUESTION);
  }

  // ===== المحقق يخمن =====
  async function submitGuess(code, roundId, matchId, guessValue, speakerId, investigatorId, playersMap) {
    const snap = await db.ref(`rooms/${code}/rounds/${roundId}`).get();
    const round = snap.val();

    const correct = (guessValue === round.truthMode);
    // إذا صح التخمين: المحقق يكسب، إذا غلط: صاحب الصندوق يكسب
    const winnerId = correct ? investigatorId : speakerId;

    await db.ref(`rooms/${code}/rounds/${roundId}`).update({
      status: ROUND_STATUS.REVEAL,
      guess: { by: investigatorId, value: guessValue, correct },
      winnerId
    });

    return { winnerId, correct, round };
  }

  // ===== إنهاء الجولة وتحديث النتيجة =====
  async function finalizeRound(code, roundId, matchId, winnerId, playerA, playerB) {
    await db.ref(`rooms/${code}/rounds/${roundId}/status`).set(ROUND_STATUS.FINISHED);

    // تحديث النتيجة
    const scoreSnap = await db.ref(`rooms/${code}/matches/${matchId}/score`).get();
    const score = scoreSnap.val() || { playerA: 0, playerB: 0 };

    if (winnerId === playerA) score.playerA++;
    else if (winnerId === playerB) score.playerB++;

    await db.ref(`rooms/${code}/matches/${matchId}/score`).set(score);
    return score;
  }

  // ===== التحقق من فوز المباراة (best of 3) =====
  function checkMatchWinner(score, playerA, playerB) {
    if (score.playerA >= 2) return playerA;
    if (score.playerB >= 2) return playerB;
    return null;
  }

  // ===== إنهاء مباراة =====
  async function finalizeMatch(code, matchId, winnerId) {
    await db.ref(`rooms/${code}/matches/${matchId}`).update({ winnerId, status: 'finished' });
  }

  // ===== تقدم في البطولة =====
  async function advanceTournament(code, matchId, winnerId) {
    const tourSnap = await db.ref(`rooms/${code}/tournament`).get();
    const tournament = tourSnap.val();
    if (!tournament) return null;

    const rounds = tournament.rounds;
    const updated = Tournament.advanceWinner(rounds, matchId, winnerId);

    const champion = Tournament.getChampion(updated);
    const nextMatch = Tournament.getNextActiveMatch(updated);

    await db.ref(`rooms/${code}/tournament`).update({
      rounds: updated,
      currentMatchId: nextMatch ? nextMatch.id : null,
      championId: champion
    });

    return { nextMatch, champion };
  }

  // ===== انتهاء وقت الجولة =====
  async function handleTimeUp(code, roundId, matchId, investigatorId, speakerId) {
    // إذا لم يخمن المحقق بعد انتهاء الوقت، صاحب الصندوق يكسب
    const snap = await db.ref(`rooms/${code}/rounds/${roundId}/status`).get();
    if (snap.val() === ROUND_STATUS.QUESTIONING) {
      await db.ref(`rooms/${code}/rounds/${roundId}`).update({
        status: ROUND_STATUS.GUESSING
      });
    }
  }

  // ===== Listeners =====
  function listenMatch(code, matchId, callback) {
    const ref = db.ref(`rooms/${code}/matches/${matchId}`);
    trackRef(ref, 'value', snap => callback(snap.val()));
  }

  function listenRound(code, roundId, callback) {
    const ref = db.ref(`rooms/${code}/rounds/${roundId}`);
    trackRef(ref, 'value', snap => callback(snap.val()));
  }

  function listenTournament(code, callback) {
    const ref = db.ref(`rooms/${code}/tournament`);
    trackRef(ref, 'value', snap => callback(snap.val()));
  }

  return {
    createMatch, createRound, chooseTruthMode,
    sendQuestion, sendAnswer, submitGuess,
    finalizeRound, checkMatchWinner, finalizeMatch,
    advanceTournament, handleTimeUp,
    listenMatch, listenRound, listenTournament,
    cleanup
  };
})();
