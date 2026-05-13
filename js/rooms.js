// rooms.js — إدارة الغرف

const Rooms = (() => {

  let _activeListeners = [];

  /** تسجيل listener للتنظيف لاحقًا */
  function track(ref, eventType, handler) {
    ref.on(eventType, handler);
    _activeListeners.push({ ref, eventType, handler });
    return handler;
  }

  /** إزالة كل listeners */
  function cleanup() {
    _activeListeners.forEach(({ ref, eventType, handler }) => ref.off(eventType, handler));
    _activeListeners = [];
  }

  /** إنشاء غرفة جديدة */
  async function createRoom(playerName, skinId) {
    const code     = generateRoomCode();
    const playerId = generateId();

    const roomData = {
      meta: {
        code,
        hostId:    playerId,
        status:    ROOM_STATUS.LOBBY,
        createdAt: now()
      },
      settings: { ...DEFAULT_SETTINGS },
      players: {
        [playerId]: {
          id:        playerId,
          name:      playerName,
          skinId,
          isHost:    true,
          isReady:   false,
          role:      'player',
          connected: true,
          joinedAt:  now()
        }
      }
    };

    await db.ref(`rooms/${code}`).set(roomData);

    const playerData = { playerId, playerName, skinId, roomCode: code, isHost: true };
    saveLocalPlayer(playerData);

    // onDisconnect
    db.ref(`rooms/${code}/players/${playerId}/connected`).onDisconnect().set(false);

    return { code, playerId };
  }

  /** الانضمام لغرفة */
  async function joinRoom(code, playerName, skinId) {
    code = code.toUpperCase().trim();

    const snap = await db.ref(`rooms/${code}`).get();
    if (!snap.exists()) throw new Error('الغرفة غير موجودة');

    const room = snap.val();
    if (room.meta.status !== ROOM_STATUS.LOBBY) throw new Error('اللعبة بدأت بالفعل');

    const players = room.players || {};
    const count   = Object.keys(players).length;
    if (count >= (room.settings.maxPlayers || 8)) throw new Error('الغرفة ممتلئة');

    // التحقق من وجود اللاعب سابقًا
    const local = loadLocalPlayer();
    if (local && local.roomCode === code && local.playerId && players[local.playerId]) {
      // إعادة اتصال
      await db.ref(`rooms/${code}/players/${local.playerId}/connected`).set(true);
      db.ref(`rooms/${code}/players/${local.playerId}/connected`).onDisconnect().set(false);
      return { code, playerId: local.playerId, rejoined: true };
    }

    const playerId = generateId();
    const playerRef = db.ref(`rooms/${code}/players/${playerId}`);
    await playerRef.set({
      id:        playerId,
      name:      playerName,
      skinId,
      isHost:    false,
      isReady:   false,
      role:      'player',
      connected: true,
      joinedAt:  now()
    });

    const playerData = { playerId, playerName, skinId, roomCode: code, isHost: false };
    saveLocalPlayer(playerData);

    playerRef.child('connected').onDisconnect().set(false);

    return { code, playerId };
  }

  /** تحديث جاهزية اللاعب */
  async function setReady(code, playerId, isReady) {
    await db.ref(`rooms/${code}/players/${playerId}/isReady`).set(isReady);
  }

  /** تغيير السكن */
  async function setSkin(code, playerId, skinId) {
    await db.ref(`rooms/${code}/players/${playerId}/skinId`).set(skinId);
  }

  /** تحديث إعدادات الغرفة (هوست فقط) */
  async function updateSettings(code, settings) {
    await db.ref(`rooms/${code}/settings`).update(settings);
  }

  /** طرد لاعب */
  async function kickPlayer(code, playerId) {
    await db.ref(`rooms/${code}/players/${playerId}`).remove();
  }

  /** نقل إلى متفرج */
  async function makeSpectator(code, playerId) {
    await db.ref(`rooms/${code}/players/${playerId}`).update({ role: 'spectator', isReady: false });
  }

  /** الاستماع لتغييرات الغرفة */
  function listenRoom(code, callback) {
    const ref = db.ref(`rooms/${code}`);
    track(ref, 'value', snap => callback(snap.val()));
  }

  /** الاستماع للاعبين فقط */
  function listenPlayers(code, callback) {
    const ref = db.ref(`rooms/${code}/players`);
    track(ref, 'value', snap => callback(snap.val() || {}));
  }

  /** الاستماع لحالة الغرفة */
  function listenStatus(code, callback) {
    const ref = db.ref(`rooms/${code}/meta/status`);
    track(ref, 'value', snap => callback(snap.val()));
  }

  /** نقل الهوست */
  async function transferHost(code, newHostId) {
    const batch = {};
    batch[`meta/hostId`] = newHostId;
    batch[`players/${newHostId}/isHost`] = true;
    await db.ref(`rooms/${code}`).update(batch);
  }

  /** بدء اللعبة */
  async function startGame(code) {
    await db.ref(`rooms/${code}/meta/status`).set(ROOM_STATUS.PLAYING);
  }

  return { createRoom, joinRoom, setReady, setSkin, updateSettings, kickPlayer, makeSpectator, listenRoom, listenPlayers, listenStatus, transferHost, startGame, cleanup };
})();
