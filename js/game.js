(function () {
  const Utils = window.MB.Utils;
  const Router = window.MB.Router;
  const Rooms = window.MB.Rooms;
  const Chat = window.MB.Chat;
  const Tournament = window.MB.Tournament;
  const GameState = window.MB.GameState;
  const C = window.MB.Constants;

  const roomCode = Router.ensureRoomOrHome();
  if (!roomCode) return;

  const matchTitle = Utils.qs("#matchTitle");
  const scorePill = Utils.qs("#scorePill");
  const timerLabel = Utils.qs("#timerLabel");
  const bracketView = Utils.qs("#bracketView");
  const secretPanel = Utils.qs("#secretPanel");
  const turnLog = Utils.qs("#turnLog");
  const turnForm = Utils.qs("#turnForm");
  const turnInput = Utils.qs("#turnInput");
  const turnSubmitBtn = Utils.qs("#turnSubmitBtn");
  const choiceButtons = Utils.qs("#choiceButtons");
  const revealPanel = Utils.qs("#revealPanel");
  const statusEl = Utils.qs("#gameStatus");
  const sceneController = window.MB3D.Scene.createGameScene(Utils.qs("#gameCanvas"));

  let currentRoom = null;
  let busyProgress = false;

  Rooms.markConnected(roomCode, Utils.getPlayerId());

  const cleanupChat = Chat.init({
    roomCode,
    listEl: Utils.qs("#gameChatList"),
    formEl: Utils.qs("#gameChatForm"),
    inputEl: Utils.qs("#gameChatInput")
  });

  function playerName(room, playerId) {
    return Utils.playerName(room, playerId);
  }

  function renderMatchHeader(room, match, round) {
    if (!match) {
      const championId = room && room.tournament && room.tournament.championId;
      matchTitle.textContent = championId ? "البطل: " + playerName(room, championId) : "بانتظار المباراة";
      scorePill.textContent = "-";
      timerLabel.textContent = "--";
      return;
    }

    matchTitle.textContent = playerName(room, match.playerA) + " ضد " + playerName(room, match.playerB);
    scorePill.textContent = (match.score && match.score.playerA || 0) + " - " + (match.score && match.score.playerB || 0);

    if (!round) {
      timerLabel.textContent = "تحضير";
    } else if (round.status === C.ROUND_STATUS.QUESTIONING) {
      timerLabel.textContent = Utils.formatTime(Number(round.endsAt || 0) - Date.now());
    } else if (round.status === C.ROUND_STATUS.CHOOSE_MODE) {
      timerLabel.textContent = "اختيار";
    } else if (round.status === C.ROUND_STATUS.GUESSING) {
      timerLabel.textContent = "تخمين";
    } else if (round.status === C.ROUND_STATUS.REVEAL) {
      timerLabel.textContent = "كشف";
    } else {
      timerLabel.textContent = "--";
    }
  }

  function renderSecretPanel(room, match, round) {
    if (!round || !match) {
      secretPanel.hidden = true;
      secretPanel.innerHTML = "";
      return;
    }

    const role = GameState.currentRole(match, round);
    const speaker = playerName(room, round.speakerId);
    const investigator = playerName(room, round.investigatorId);
    let html = "";

    if (role === "speaker" && round.status === C.ROUND_STATUS.CHOOSE_MODE) {
      html = "<strong>أنت صاحب الصندوق.</strong><br>اختر حالتك السرية قبل بدء التحقيق.";
    } else if (role === "speaker" && round.itemId) {
      const item = Utils.itemById(round.itemId);
      const mode = round.truthMode === "truth" ? "صادق" : "كذاب";
      const hints = item.hints && item.hints.length ? " - " + item.hints.join("، ") : "";
      html = "<strong>سرك:</strong> " + mode + "<br><strong>الغرض:</strong> " + item.name + " (" + item.color + ")" + hints;
    } else if (role === "investigator") {
      html = "<strong>أنت المحقق.</strong><br>حقق مع " + Utils.escapeHtml(speaker) + " ولا تثق بسهولة.";
    } else {
      html = "<strong>مشاهدة المباراة.</strong><br>" + Utils.escapeHtml(speaker) + " صاحب الصندوق، و" + Utils.escapeHtml(investigator) + " يحقق معه.";
    }

    secretPanel.hidden = false;
    secretPanel.innerHTML = html;
  }

  function renderTurnLog(room, round) {
    const questions = GameState.getQuestions(round);
    if (!questions.length) {
      turnLog.innerHTML = '<div class="empty-state">لم يبدأ التحقيق بعد</div>';
      return;
    }

    turnLog.innerHTML = questions.map(function (question, index) {
      const parts = [
        '<article class="turn-entry question"><strong>سؤال ' + (index + 1) + ':</strong> ' + Utils.escapeHtml(question.text) + '</article>'
      ];
      if (question.answer) {
        parts.push('<article class="turn-entry answer"><strong>الجواب:</strong> ' + Utils.escapeHtml(question.answer) + '</article>');
      }
      return parts.join("");
    }).join("");
    turnLog.scrollTop = turnLog.scrollHeight;
  }

  function renderTurnControls(match, round) {
    choiceButtons.innerHTML = "";
    turnForm.hidden = true;
    turnForm.style.display = "none";

    if (!match || !round) return;

    const role = GameState.currentRole(match, round);
    if (role === "speaker" && round.status === C.ROUND_STATUS.CHOOSE_MODE) {
      choiceButtons.innerHTML = [
        '<button type="button" data-mode="truth" data-value="truth">صادق</button>',
        '<button type="button" data-mode="lie" data-value="lie">كذاب</button>'
      ].join("");
      return;
    }

    if (role === "investigator" && round.status === C.ROUND_STATUS.GUESSING) {
      choiceButtons.innerHTML = [
        '<button type="button" data-guess="truth" data-value="truth">صادق</button>',
        '<button type="button" data-guess="lie" data-value="lie">كذاب</button>'
      ].join("");
      return;
    }

    if (round.status !== C.ROUND_STATUS.QUESTIONING) return;

    if (role === "investigator" && round.turn === C.ROUND_TURN.QUESTION) {
      turnForm.hidden = false;
      turnForm.style.display = "grid";
      turnInput.placeholder = "اكتب سؤالًا واحدًا";
      turnSubmitBtn.textContent = "إرسال السؤال";
    } else if (role === "speaker" && round.turn === C.ROUND_TURN.ANSWER) {
      turnForm.hidden = false;
      turnForm.style.display = "grid";
      turnInput.placeholder = "اكتب جوابًا واحدًا";
      turnSubmitBtn.textContent = "إرسال الجواب";
    }
  }

  function renderReveal(room, round) {
    if (!round || round.status !== C.ROUND_STATUS.REVEAL) {
      revealPanel.hidden = true;
      revealPanel.innerHTML = "";
      sceneController.setBoxOpen(false);
      return;
    }

    const item = Utils.itemById(round.itemId);
    const mode = round.truthMode === "truth" ? "صادق" : "كذاب";
    const guess = round.guess && round.guess.value === "truth" ? "صادق" : "كذاب";
    const result = round.guess && round.guess.correct ? "تخمين صحيح" : "تخمين خاطئ";
    revealPanel.hidden = false;
    revealPanel.innerHTML = [
      '<strong>الكشف:</strong> ' + Utils.escapeHtml(item.name),
      '<br><strong>حالة صاحب الصندوق:</strong> ' + mode,
      '<br><strong>تخمين المحقق:</strong> ' + guess + ' - ' + result,
      '<br><strong>فائز الجولة:</strong> ' + Utils.escapeHtml(playerName(room, round.winnerId))
    ].join("");
    sceneController.setBoxOpen(true);
  }

  function renderStatus(room, match, round) {
    if (!room) return;
    if (room.meta.status === C.ROOM_STATUS.FINISHED) {
      const champion = room.tournament && room.tournament.championId;
      Utils.setStatus(statusEl, champion ? "انتهت البطولة. البطل: " + playerName(room, champion) : "انتهت البطولة.", "ok");
      return;
    }
    if (!match) {
      Utils.setStatus(statusEl, "بانتظار تجهيز المباراة التالية...");
      return;
    }
    if (!round) {
      Utils.setStatus(statusEl, "يتم تجهيز الجولة...");
      return;
    }

    const role = GameState.currentRole(match, round);
    if (round.status === C.ROUND_STATUS.CHOOSE_MODE) {
      Utils.setStatus(statusEl, role === "speaker" ? "اختر صادق أو كذاب لبدء الجولة." : "ننتظر اختيار صاحب الصندوق.");
    } else if (round.status === C.ROUND_STATUS.QUESTIONING) {
      if (role === "investigator" && round.turn === C.ROUND_TURN.QUESTION) {
        Utils.setStatus(statusEl, "دورك لطرح سؤال.");
      } else if (role === "speaker" && round.turn === C.ROUND_TURN.ANSWER) {
        Utils.setStatus(statusEl, "دورك للرد على السؤال.");
      } else {
        Utils.setStatus(statusEl, "التحقيق جارٍ.");
      }
    } else if (round.status === C.ROUND_STATUS.GUESSING) {
      Utils.setStatus(statusEl, role === "investigator" ? "اختر حكمك النهائي." : "المحقق يختار حكمه.");
    } else if (round.status === C.ROUND_STATUS.REVEAL) {
      Utils.setStatus(statusEl, "تم فتح الصندوق.");
    }
  }

  function renderGame(room) {
    const match = GameState.getActiveMatch(room);
    const round = GameState.getRound(room, match);
    Tournament.render(bracketView, room);
    sceneController.updateMatch(room, match);
    renderMatchHeader(room, match, round);
    renderSecretPanel(room, match, round);
    renderTurnLog(room, round);
    renderTurnControls(match, round);
    renderReveal(room, round);
    renderStatus(room, match, round);
  }

  function runHostProgress() {
    if (!currentRoom || busyProgress || !currentRoom.meta) return;
    if (currentRoom.meta.hostId !== Utils.getPlayerId()) return;
    const match = GameState.getActiveMatch(currentRoom);
    const round = GameState.getRound(currentRoom, match);
    busyProgress = true;

    const task = Promise.resolve()
      .then(function () {
        if (!match && currentRoom.meta.status === C.ROOM_STATUS.PLAYING) return false;
        if (match && !round) return GameState.ensureActiveRound(roomCode, currentRoom);
        if (round && round.status === C.ROUND_STATUS.QUESTIONING) return GameState.setGuessing(roomCode, round);
        if (round && round.status === C.ROUND_STATUS.REVEAL) return GameState.progressAfterReveal(roomCode, currentRoom);
        return false;
      });

    task.catch(function (error) {
      console.warn("تعذر تحديث حالة اللعبة:", error);
    }).finally(function () {
      busyProgress = false;
    });
  }

  const stopWatching = Rooms.watchRoom(roomCode, function (snapshot) {
    const room = snapshot.val();
    currentRoom = room;

    if (!room) {
      Utils.setStatus(statusEl, "الغرفة غير موجودة.", "error");
      setTimeout(Router.goHome, 1000);
      return;
    }

    const myPlayer = room.players && room.players[Utils.getPlayerId()];
    if (!myPlayer) {
      Utils.setStatus(statusEl, "تم إخراجك من الغرفة.", "error");
      setTimeout(Router.goHome, 1200);
      return;
    }

    Rooms.maybeClaimHost(roomCode, room);

    if (room.meta.status === C.ROOM_STATUS.LOBBY) {
      Router.goToLobby(roomCode);
      return;
    }

    renderGame(room);
    runHostProgress();
  });

  turnForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const room = currentRoom;
    const match = GameState.getActiveMatch(room);
    const round = GameState.getRound(room, match);
    const text = turnInput.value;
    turnInput.value = "";
    const role = GameState.currentRole(match, round);
    const action = role === "investigator"
      ? GameState.submitQuestion(roomCode, round, text)
      : GameState.submitAnswer(roomCode, round, text);
    action.catch(function (error) {
      Utils.setStatus(statusEl, error.message, "error");
    });
  });

  choiceButtons.addEventListener("click", function (event) {
    const modeBtn = event.target.closest("[data-mode]");
    const guessBtn = event.target.closest("[data-guess]");
    const room = currentRoom;
    const match = GameState.getActiveMatch(room);
    const round = GameState.getRound(room, match);
    if (modeBtn) {
      const roundTime = room.settings && room.settings.roundTime || C.DEFAULT_SETTINGS.roundTime;
      GameState.chooseMode(roomCode, round, modeBtn.dataset.mode, roundTime).catch(function (error) {
        Utils.setStatus(statusEl, error.message, "error");
      });
    }
    if (guessBtn) {
      GameState.submitGuess(roomCode, room, round, guessBtn.dataset.guess).catch(function (error) {
        Utils.setStatus(statusEl, error.message, "error");
      });
    }
  });

  const timer = setInterval(function () {
    if (!currentRoom) return;
    const match = GameState.getActiveMatch(currentRoom);
    const round = GameState.getRound(currentRoom, match);
    renderMatchHeader(currentRoom, match, round);
    runHostProgress();
  }, 500);

  window.addEventListener("pagehide", function () {
    clearInterval(timer);
    cleanupChat();
    stopWatching();
    sceneController.cleanup();
  });
})();
