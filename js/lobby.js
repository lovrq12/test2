(function () {
  const Utils = window.MB.Utils;
  const Router = window.MB.Router;
  const Rooms = window.MB.Rooms;
  const Chat = window.MB.Chat;
  const C = window.MB.Constants;

  const roomCode = Router.ensureRoomOrHome();
  if (!roomCode) return;

  const roomCodeLabel = Utils.qs("#roomCodeLabel");
  const copyCodeBtn = Utils.qs("#copyCodeBtn");
  const playersCount = Utils.qs("#playersCount");
  const playersList = Utils.qs("#playersList");
  const statusEl = Utils.qs("#lobbyStatus");
  const readyBtn = Utils.qs("#readyBtn");
  const hostControls = Utils.qs("#hostControls");
  const roundTimeSelect = Utils.qs("#roundTimeSelect");
  const maxPlayersInput = Utils.qs("#maxPlayersInput");
  const startGameBtn = Utils.qs("#startGameBtn");
  const skinPicker = Utils.qs("#lobbySkinPicker");
  let currentRoom = null;

  roomCodeLabel.textContent = roomCode;
  const saved = Utils.getPlayerData();
  if (!saved.playerName) Router.goHome();
  Rooms.markConnected(roomCode, Utils.getPlayerId());

  const cleanupChat = Chat.init({
    roomCode,
    listEl: Utils.qs("#lobbyChatList"),
    formEl: Utils.qs("#lobbyChatForm"),
    inputEl: Utils.qs("#lobbyChatInput")
  });

  function renderSkinPicker(myPlayer) {
    skinPicker.innerHTML = C.SKINS.map(function (skin) {
      const active = myPlayer && myPlayer.skinId === skin.id ? " is-selected" : "";
      return '<button class="lobby-skin' + active + '" type="button" data-skin="' + skin.id + '"><span class="player-avatar skin-' + skin.id + '"></span><strong>' + skin.name + '</strong></button>';
    }).join("");
  }

  function renderPlayers(room) {
    const players = Utils.toArray(room.players).sort(function (a, b) {
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });
    const activePlayers = players.filter(function (player) {
      return player.role === C.PLAYER_ROLE.PLAYER;
    });
    const maxPlayers = Number(room.settings && room.settings.maxPlayers) || C.DEFAULT_SETTINGS.maxPlayers;
    playersCount.textContent = activePlayers.length + " / " + maxPlayers;

    if (!players.length) {
      playersList.innerHTML = '<div class="empty-state">لا يوجد لاعبون</div>';
      return;
    }

    const myId = Utils.getPlayerId();
    const isHost = room.meta.hostId === myId;
    playersList.innerHTML = players.map(function (player) {
      const readyClass = player.isReady ? " ready" : "";
      const readyText = player.isReady ? "جاهز" : "غير جاهز";
      const hostBadge = player.id === room.meta.hostId ? '<span class="badge host">هوست</span>' : "";
      const roleBadge = player.role === C.PLAYER_ROLE.SPECTATOR ? '<span class="badge spectator">متفرج</span>' : "";
      const connection = player.connected ? "متصل" : "منقطع";
      const controls = isHost && player.id !== myId ? [
        '<div class="host-actions">',
        '<button class="quiet-action" type="button" data-action="spectate" data-player="' + player.id + '">متفرج</button>',
        '<button class="danger-action" type="button" data-action="kick" data-player="' + player.id + '">طرد</button>',
        '</div>'
      ].join("") : "";

      return [
        '<article class="player-row">',
        '<span class="player-avatar skin-' + Utils.escapeHtml(player.skinId || "player01") + '"></span>',
        '<div class="player-main"><strong>' + Utils.escapeHtml(player.name) + '</strong><span>' + connection + ' - ' + Utils.skinById(player.skinId).name + '</span>' + controls + '</div>',
        '<div class="player-badges"><span class="badge' + readyClass + '">' + readyText + '</span>' + hostBadge + roleBadge + '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderRoom(room) {
    currentRoom = room;
    if (!room) {
      Utils.setStatus(statusEl, "الغرفة غير موجودة.", "error");
      setTimeout(Router.goHome, 1000);
      return;
    }

    const myId = Utils.getPlayerId();
    const myPlayer = room.players && room.players[myId];
    if (!myPlayer) {
      Utils.setStatus(statusEl, "تم إخراجك من الغرفة.", "error");
      setTimeout(Router.goHome, 1200);
      return;
    }

    Rooms.maybeClaimHost(roomCode, room);

    if (room.meta.status === C.ROOM_STATUS.PLAYING) {
      Router.goToGame(roomCode);
      return;
    }

    renderPlayers(room);
    renderSkinPicker(myPlayer);

    const isHost = room.meta.hostId === myId;
    hostControls.hidden = !isHost;
    readyBtn.textContent = myPlayer.isReady ? "إلغاء الجاهزية" : "جاهز";
    readyBtn.classList.toggle("secondary-action", !!myPlayer.isReady);
    readyBtn.classList.toggle("primary-action", !myPlayer.isReady);
    roundTimeSelect.value = String((room.settings && room.settings.roundTime) || 60);
    maxPlayersInput.value = String((room.settings && room.settings.maxPlayers) || 16);
  }

  const stopWatching = Rooms.watchRoom(roomCode, function (snapshot) {
    renderRoom(snapshot.val());
  });

  readyBtn.addEventListener("click", function () {
    if (!currentRoom) return;
    const myPlayer = currentRoom.players[Utils.getPlayerId()];
    Rooms.updateReady(roomCode, !myPlayer.isReady);
  });

  skinPicker.addEventListener("click", function (event) {
    const button = event.target.closest("[data-skin]");
    if (!button) return;
    Rooms.updateSkin(roomCode, button.dataset.skin);
  });

  playersList.addEventListener("click", function (event) {
    const button = event.target.closest("[data-action]");
    if (!button || !currentRoom) return;
    const playerId = button.dataset.player;
    if (button.dataset.action === "spectate") {
      Rooms.moveToSpectator(roomCode, playerId);
    }
    if (button.dataset.action === "kick") {
      Rooms.kickPlayer(roomCode, playerId);
    }
  });

  function saveHostSettings() {
    if (!currentRoom || currentRoom.meta.hostId !== Utils.getPlayerId()) return;
    Rooms.updateSettings(roomCode, {
      roundTime: roundTimeSelect.value,
      maxPlayers: maxPlayersInput.value
    });
  }

  roundTimeSelect.addEventListener("change", saveHostSettings);
  maxPlayersInput.addEventListener("change", saveHostSettings);

  startGameBtn.addEventListener("click", function () {
    if (!currentRoom) return;
    Utils.setStatus(statusEl, "جاري بدء البطولة...");
    Rooms.startGame(roomCode, currentRoom)
      .then(function () {
        Utils.setStatus(statusEl, "بدأت اللعبة.", "ok");
      })
      .catch(function (error) {
        Utils.setStatus(statusEl, error.message, "error");
      });
  });

  copyCodeBtn.addEventListener("click", function () {
    Utils.copyText(roomCode).then(function () {
      Utils.setStatus(statusEl, "تم نسخ الكود.", "ok");
    });
  });

  window.addEventListener("pagehide", function () {
    cleanupChat();
    stopWatching();
  });
})();
