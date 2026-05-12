(function () {
  window.MB = window.MB || {};

  const db = window.MB.db;
  const firebase = window.MB.firebase;
  const Utils = window.MB.Utils;
  const C = window.MB.Constants;

  function roomRef(roomCode) {
    return db.ref("rooms/" + roomCode);
  }

  function playerRef(roomCode, playerId) {
    return db.ref("rooms/" + roomCode + "/players/" + playerId);
  }

  function buildPlayer(name, skinId, isHost) {
    const playerId = Utils.getPlayerId();
    return {
      id: playerId,
      name: Utils.normalizeName(name) || "لاعب",
      skinId: skinId || "player01",
      isHost: !!isHost,
      isReady: !!isHost,
      role: C.PLAYER_ROLE.PLAYER,
      connected: true,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    };
  }

  function rememberPlayer(roomCode, player) {
    Utils.savePlayerData({
      playerId: player.id,
      playerName: player.name,
      skinId: player.skinId,
      roomCode,
      isHost: !!player.isHost
    });
  }

  function markConnected(roomCode, playerId) {
    const ref = playerRef(roomCode, playerId);
    ref.update({ connected: true });
    ref.onDisconnect().update({ connected: false });
  }

  function createRoom(name, skinId) {
    const player = buildPlayer(name, skinId, true);

    function tryCreate(attemptsLeft) {
      const roomCode = Utils.randomRoomCode();
      return roomRef(roomCode).once("value").then(function (snapshot) {
        if (snapshot.exists()) {
          if (attemptsLeft <= 0) throw new Error("تعذر إنشاء كود فريد. حاول مرة أخرى.");
          return tryCreate(attemptsLeft - 1);
        }

        const room = {
          meta: {
            code: roomCode,
            hostId: player.id,
            status: C.ROOM_STATUS.LOBBY,
            createdAt: firebase.database.ServerValue.TIMESTAMP
          },
          settings: C.DEFAULT_SETTINGS,
          players: {},
          chat: {},
          tournament: null,
          matches: {},
          rounds: {}
        };
        room.players[player.id] = player;

        return roomRef(roomCode).set(room).then(function () {
          rememberPlayer(roomCode, player);
          markConnected(roomCode, player.id);
          return roomCode;
        });
      });
    }

    return tryCreate(8);
  }

  function joinRoom(roomCode, name, skinId) {
    const code = Utils.normalizeRoomCode(roomCode);
    const playerId = Utils.getPlayerId();
    return roomRef(code).once("value").then(function (snapshot) {
      const room = snapshot.val();
      if (!room) throw new Error("الغرفة غير موجودة.");

      const existing = room.players && room.players[playerId];
      const isStarted = room.meta && room.meta.status !== C.ROOM_STATUS.LOBBY;
      if (isStarted && !existing) {
        throw new Error("اللعبة بدأت بالفعل. لا يمكن دخول لاعب جديد.");
      }

      const maxPlayers = Number(room.settings && room.settings.maxPlayers) || C.DEFAULT_SETTINGS.maxPlayers;
      const activePlayers = Utils.toArray(room.players).filter(function (player) {
        return player.role !== C.PLAYER_ROLE.SPECTATOR;
      });
      if (!existing && activePlayers.length >= maxPlayers) {
        throw new Error("الغرفة ممتلئة.");
      }

      const isHost = room.meta && room.meta.hostId === playerId;
      const player = Object.assign({}, existing || buildPlayer(name, skinId, isHost), {
        id: playerId,
        name: Utils.normalizeName(name) || (existing && existing.name) || "لاعب",
        skinId: skinId || (existing && existing.skinId) || "player01",
        isHost,
        connected: true,
        role: existing && existing.role ? existing.role : C.PLAYER_ROLE.PLAYER
      });

      if (!existing) {
        player.isReady = false;
        player.joinedAt = firebase.database.ServerValue.TIMESTAMP;
      }

      return playerRef(code, playerId).update(player).then(function () {
        rememberPlayer(code, player);
        markConnected(code, playerId);
        return code;
      });
    });
  }

  function watchRoom(roomCode, onValue) {
    const ref = roomRef(roomCode);
    ref.on("value", onValue);
    return function () {
      ref.off("value", onValue);
    };
  }

  function updateReady(roomCode, isReady) {
    return playerRef(roomCode, Utils.getPlayerId()).update({ isReady: !!isReady });
  }

  function updateSkin(roomCode, skinId) {
    Utils.savePlayerData({ skinId });
    return playerRef(roomCode, Utils.getPlayerId()).update({ skinId });
  }

  function updateSettings(roomCode, settings) {
    const roundTime = Utils.clamp(settings.roundTime, 30, 120);
    const maxPlayers = Utils.clamp(settings.maxPlayers, C.MIN_PLAYERS, C.MAX_PLAYERS);
    return roomRef(roomCode).child("settings").update({ roundTime, maxPlayers });
  }

  function moveToSpectator(roomCode, playerId) {
    return playerRef(roomCode, playerId).update({
      role: C.PLAYER_ROLE.SPECTATOR,
      isReady: true
    });
  }

  function kickPlayer(roomCode, playerId) {
    return playerRef(roomCode, playerId).remove();
  }

  function canStart(room) {
    const players = Utils.toArray(room.players).filter(function (player) {
      return player.role === C.PLAYER_ROLE.PLAYER;
    });
    if (players.length < C.MIN_PLAYERS) {
      return { ok: false, reason: "تحتاج لاعبين على الأقل." };
    }
    const allReady = players.every(function (player) {
      return player.isReady;
    });
    if (!allReady) {
      return { ok: false, reason: "كل اللاعبين يجب أن يكونوا جاهزين." };
    }
    return { ok: true, players };
  }

  function startGame(roomCode, room) {
    const playerId = Utils.getPlayerId();
    if (!room || !room.meta || room.meta.hostId !== playerId) {
      return Promise.reject(new Error("الهوست فقط يستطيع بدء اللعبة."));
    }
    const check = canStart(room);
    if (!check.ok) return Promise.reject(new Error(check.reason));

    const created = window.MB.Tournament.create(check.players);
    const updates = {};
    updates["rooms/" + roomCode + "/meta/status"] = C.ROOM_STATUS.PLAYING;
    updates["rooms/" + roomCode + "/meta/startedAt"] = firebase.database.ServerValue.TIMESTAMP;
    updates["rooms/" + roomCode + "/tournament"] = created.tournament;
    updates["rooms/" + roomCode + "/matches"] = created.matches;
    updates["rooms/" + roomCode + "/rounds"] = {};

    return db.ref().update(updates);
  }

  function maybeClaimHost(roomCode, room) {
    if (!room || !room.players || !room.meta) return Promise.resolve(false);
    const myId = Utils.getPlayerId();
    const currentHost = room.players[room.meta.hostId];
    if (currentHost && currentHost.connected) return Promise.resolve(false);

    const connected = Utils.toArray(room.players)
      .filter(function (player) { return player.connected; })
      .sort(function (a, b) {
        return (a.joinedAt || 0) - (b.joinedAt || 0);
      });

    if (!connected.length || connected[0].id !== myId) {
      return Promise.resolve(false);
    }

    const updates = {};
    updates["rooms/" + roomCode + "/meta/hostId"] = myId;
    connected.forEach(function (player) {
      updates["rooms/" + roomCode + "/players/" + player.id + "/isHost"] = player.id === myId;
    });
    return db.ref().update(updates).then(function () {
      Utils.savePlayerData({ isHost: true });
      return true;
    });
  }

  window.MB.Rooms = {
    roomRef,
    playerRef,
    createRoom,
    joinRoom,
    watchRoom,
    updateReady,
    updateSkin,
    updateSettings,
    moveToSpectator,
    kickPlayer,
    canStart,
    startGame,
    markConnected,
    maybeClaimHost
  };
})();
