(function () {
  window.MB = window.MB || {};

  const db = window.MB.db;
  const firebase = window.MB.firebase;
  const Utils = window.MB.Utils;
  const C = window.MB.Constants;

  function getActiveMatch(room) {
    if (!room || !room.tournament || !room.tournament.currentMatchId) return null;
    return room.matches && room.matches[room.tournament.currentMatchId] ? room.matches[room.tournament.currentMatchId] : null;
  }

  function getRound(room, match) {
    if (!room || !match || !match.currentRoundId) return null;
    return room.rounds && room.rounds[match.currentRoundId] ? room.rounds[match.currentRoundId] : null;
  }

  function getScore(match, playerId) {
    if (!match || !match.score) return 0;
    if (match.playerA === playerId) return Number(match.score.playerA || 0);
    if (match.playerB === playerId) return Number(match.score.playerB || 0);
    return 0;
  }

  function scoreKey(match, playerId) {
    if (match.playerA === playerId) return "playerA";
    if (match.playerB === playerId) return "playerB";
    return "";
  }

  function chooseRoundRoles(match, roundNumber) {
    if (roundNumber === 1) {
      return { speakerId: match.playerA, investigatorId: match.playerB };
    }
    if (roundNumber === 2) {
      return { speakerId: match.playerB, investigatorId: match.playerA };
    }
    return Math.random() > 0.5
      ? { speakerId: match.playerA, investigatorId: match.playerB }
      : { speakerId: match.playerB, investigatorId: match.playerA };
  }

  function createNextRound(roomCode, room, match) {
    if (!match || match.status !== C.MATCH_STATUS.PLAYING) return Promise.resolve(false);
    const roundNumber = Number(match.roundNumber || 0) + 1;
    const roundId = match.id + "_round_" + roundNumber;
    const roles = chooseRoundRoles(match, roundNumber);
    const round = {
      id: roundId,
      matchId: match.id,
      number: roundNumber,
      speakerId: roles.speakerId,
      investigatorId: roles.investigatorId,
      truthMode: null,
      itemId: null,
      status: C.ROUND_STATUS.CHOOSE_MODE,
      startedAt: null,
      endsAt: null,
      revealEndsAt: null,
      turn: null,
      questions: {},
      guess: null,
      winnerId: null
    };

    const currentRef = db.ref("rooms/" + roomCode + "/matches/" + match.id + "/currentRoundId");
    return currentRef.transaction(function (current) {
      return current || roundId;
    }).then(function (result) {
      if (!result.committed || result.snapshot.val() !== roundId) return false;
      const updates = {};
      updates["rooms/" + roomCode + "/rounds/" + roundId] = round;
      updates["rooms/" + roomCode + "/matches/" + match.id + "/roundNumber"] = roundNumber;
      return db.ref().update(updates).then(function () {
        return true;
      });
    });
  }

  function ensureActiveRound(roomCode, room) {
    const match = getActiveMatch(room);
    if (!match || match.status !== C.MATCH_STATUS.PLAYING || match.currentRoundId) {
      return Promise.resolve(false);
    }
    return createNextRound(roomCode, room, match);
  }

  function chooseMode(roomCode, round, mode, roundTime) {
    if (!round || round.status !== C.ROUND_STATUS.CHOOSE_MODE) {
      return Promise.reject(new Error("لا يمكن اختيار الحالة الآن."));
    }
    if (round.speakerId !== Utils.getPlayerId()) {
      return Promise.reject(new Error("هذا الاختيار لصاحب الصندوق فقط."));
    }

    const truthMode = mode === "lie" ? "lie" : "truth";
    const nonEmpty = C.ITEMS.filter(function (item) { return item.id !== "empty"; });
    const item = truthMode === "truth"
      ? Utils.sample(nonEmpty)
      : (Math.random() < 0.35 ? Utils.itemById("empty") : Utils.sample(nonEmpty));
    const now = Date.now();

    return db.ref("rooms/" + roomCode + "/rounds/" + round.id).update({
      truthMode,
      itemId: item.id,
      status: C.ROUND_STATUS.QUESTIONING,
      startedAt: now,
      endsAt: now + Number(roundTime || C.DEFAULT_SETTINGS.roundTime) * 1000,
      turn: C.ROUND_TURN.QUESTION
    });
  }

  function getQuestions(round) {
    return Utils.toArray(round && round.questions).sort(function (a, b) {
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }

  function getLatestQuestion(round) {
    const questions = getQuestions(round);
    return questions.length ? questions[questions.length - 1] : null;
  }

  function submitQuestion(roomCode, round, text) {
    const clean = String(text || "").trim().slice(0, 220);
    if (!clean) return Promise.reject(new Error("اكتب السؤال أولًا."));
    if (!round || round.status !== C.ROUND_STATUS.QUESTIONING || round.turn !== C.ROUND_TURN.QUESTION) {
      return Promise.reject(new Error("ليس وقت السؤال."));
    }
    if (round.investigatorId !== Utils.getPlayerId()) {
      return Promise.reject(new Error("المحقق فقط يستطيع السؤال."));
    }

    const questionRef = db.ref("rooms/" + roomCode + "/rounds/" + round.id + "/questions").push();
    const updates = {};
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/questions/" + questionRef.key] = {
      id: questionRef.key,
      from: Utils.getPlayerId(),
      text: clean,
      answer: "",
      createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/turn"] = C.ROUND_TURN.ANSWER;
    return db.ref().update(updates);
  }

  function submitAnswer(roomCode, round, text) {
    const clean = String(text || "").trim().slice(0, 220);
    if (!clean) return Promise.reject(new Error("اكتب الجواب أولًا."));
    if (!round || round.status !== C.ROUND_STATUS.QUESTIONING || round.turn !== C.ROUND_TURN.ANSWER) {
      return Promise.reject(new Error("ليس وقت الجواب."));
    }
    if (round.speakerId !== Utils.getPlayerId()) {
      return Promise.reject(new Error("صاحب الصندوق فقط يستطيع الجواب."));
    }

    const latest = getLatestQuestion(round);
    if (!latest || latest.answer) {
      return Promise.reject(new Error("لا يوجد سؤال يحتاج جوابًا."));
    }

    const updates = {};
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/questions/" + latest.id + "/answer"] = clean;
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/questions/" + latest.id + "/answeredAt"] = firebase.database.ServerValue.TIMESTAMP;
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/turn"] = C.ROUND_TURN.QUESTION;
    return db.ref().update(updates);
  }

  function setGuessing(roomCode, round) {
    if (!round || round.status !== C.ROUND_STATUS.QUESTIONING) return Promise.resolve(false);
    if (Date.now() < Number(round.endsAt || 0)) return Promise.resolve(false);
    return db.ref("rooms/" + roomCode + "/rounds/" + round.id).update({
      status: C.ROUND_STATUS.GUESSING,
      turn: null
    }).then(function () {
      return true;
    });
  }

  function submitGuess(roomCode, room, round, value) {
    const match = getActiveMatch(room);
    if (!match || !round || round.status !== C.ROUND_STATUS.GUESSING) {
      return Promise.reject(new Error("ليس وقت التخمين."));
    }
    if (round.investigatorId !== Utils.getPlayerId()) {
      return Promise.reject(new Error("المحقق فقط يستطيع التخمين."));
    }

    const guessValue = value === "lie" ? "lie" : "truth";
    const correct = guessValue === round.truthMode;
    const winnerId = correct ? round.investigatorId : round.speakerId;
    const key = scoreKey(match, winnerId);
    if (!key) return Promise.reject(new Error("تعذر احتساب الفائز."));

    const currentScore = Number(match.score && match.score[key] || 0);
    const updates = {};
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/status"] = C.ROUND_STATUS.REVEAL;
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/guess"] = {
      by: Utils.getPlayerId(),
      value: guessValue,
      correct
    };
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/winnerId"] = winnerId;
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/revealEndsAt"] = Date.now() + 6500;
    updates["rooms/" + roomCode + "/matches/" + match.id + "/score/" + key] = currentScore + 1;
    return db.ref().update(updates);
  }

  function finishMatch(roomCode, room, match, winnerId) {
    const advanced = window.MB.Tournament.advanceWinner(room, match.id, winnerId);
    if (!advanced) return Promise.resolve(false);
    const loserId = match.playerA === winnerId ? match.playerB : match.playerA;
    const updates = {};
    updates["rooms/" + roomCode + "/tournament"] = advanced.tournament;
    updates["rooms/" + roomCode + "/matches"] = advanced.matches;
    if (loserId) {
      updates["rooms/" + roomCode + "/players/" + loserId + "/role"] = C.PLAYER_ROLE.SPECTATOR;
    }
    if (advanced.tournament.championId) {
      updates["rooms/" + roomCode + "/meta/status"] = C.ROOM_STATUS.FINISHED;
      updates["rooms/" + roomCode + "/meta/finishedAt"] = firebase.database.ServerValue.TIMESTAMP;
    }
    return db.ref().update(updates).then(function () {
      return true;
    });
  }

  function progressAfterReveal(roomCode, room) {
    const match = getActiveMatch(room);
    const round = getRound(room, match);
    if (!match || !round || round.status !== C.ROUND_STATUS.REVEAL) {
      return Promise.resolve(false);
    }
    if (Date.now() < Number(round.revealEndsAt || 0)) {
      return Promise.resolve(false);
    }

    const scoreA = Number(match.score && match.score.playerA || 0);
    const scoreB = Number(match.score && match.score.playerB || 0);
    const updates = {};
    updates["rooms/" + roomCode + "/rounds/" + round.id + "/status"] = C.ROUND_STATUS.FINISHED;

    if (scoreA >= 2 || scoreB >= 2) {
      const winnerId = scoreA >= 2 ? match.playerA : match.playerB;
      return db.ref().update(updates).then(function () {
        return finishMatch(roomCode, room, match, winnerId);
      });
    }

    updates["rooms/" + roomCode + "/matches/" + match.id + "/currentRoundId"] = null;
    return db.ref().update(updates).then(function () {
      const nextMatch = Object.assign({}, match, { currentRoundId: null });
      return createNextRound(roomCode, room, nextMatch);
    });
  }

  function currentRole(match, round) {
    const myId = Utils.getPlayerId();
    if (!match || !round) return "spectator";
    if (round.speakerId === myId) return "speaker";
    if (round.investigatorId === myId) return "investigator";
    return "spectator";
  }

  window.MB.GameState = {
    getActiveMatch,
    getRound,
    getScore,
    getQuestions,
    getLatestQuestion,
    currentRole,
    ensureActiveRound,
    createNextRound,
    chooseMode,
    submitQuestion,
    submitAnswer,
    setGuessing,
    submitGuess,
    progressAfterReveal
  };
})();
