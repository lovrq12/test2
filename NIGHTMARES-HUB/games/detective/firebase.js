const firebaseConfig = {
  apiKey: "AIzaSyOfE8IrWe_UNZaTus-OJygAk4wIILY_jjw",
  authDomain: "endx-8ac33.firebaseapp.com",
  databaseURL: "https://endx-8ac33-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "endx-8ac33",
  storageBucket: "endx-8ac33.firebasestorage.app",
  messagingSenderId: "11855321835",
  appId: "1:11855321835:web:bb03b9acb3abf5143b1eb2"
};

if (!window.firebase) {
  throw new Error("لم يتم تحميل Firebase.");
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

const DEFAULT_ROOM_SETTINGS = {
  requiredPlayerCount: 5,
  roundTimerMinutes: 10,
  autoRoleAssignment: true,
  witnessEnabled: true,
  accompliceEnabled: true,
  forensicDoctorPlayerId: "",
  manualKillerId: "",
  manualAccompliceId: "",
  manualWitnessId: ""
};

function roomPath(roomCode) {
  return `rooms/${roomCode}`;
}

function roomPublicPath(roomCode) {
  return `${roomPath(roomCode)}/public`;
}

function playerPrivatePath(roomCode, playerId) {
  return `${roomPath(roomCode)}/private/${playerId}`;
}

function buildPausedTimer(phase) {
  return {
    phase,
    durationSeconds: 0,
    startedAt: null,
    endsAt: null,
    paused: true,
    unlimited: true
  };
}

function buildRunningTimer(phase, settings = {}) {
  const minutes = Number(settings.roundTimerMinutes || 0);

  if (!minutes) {
    return buildPausedTimer(phase);
  }

  const now = Date.now();
  const durationSeconds = minutes * 60;

  return {
    phase,
    durationSeconds,
    startedAt: now,
    endsAt: now + durationSeconds * 1000,
    paused: false,
    unlimited: false
  };
}

function buildRoomSkeleton(hostId, settings = {}) {
  return {
    gameType: "detective",
    public: {
      gameType: "detective",
      hostId,
      status: "lobby",
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      settings: {
        ...DEFAULT_ROOM_SETTINGS,
        ...normalizeRoomSettings(settings)
      },
      playerNames: {},
      playerProfiles: {},
      playerTools: {},
      playerStates: {},
      timer: buildPausedTimer("lobby"),
      caseFile: null,
      investigationFeed: {},
      discussionFeed: {},
      accusation: null,
      endReveal: null
    },
    private: {}
  };
}

async function testFirebaseConnection(playerId) {
  const snapshot = await db.ref(".info/connected").once("value");

  return {
    path: ".info/connected",
    value: {
      status: snapshot.val() ? "ok" : "offline",
      checkedAt: Date.now(),
      playerId: playerId || "unknown-player"
    }
  };
}

async function roomExists(roomCode) {
  try {
    const snapshot = await db.ref(roomPublicPath(roomCode)).once("value");
    return snapshot.exists();
  } catch (error) {
    if (isPermissionDenied(error)) {
      return false;
    }

    throw error;
  }
}

function isPermissionDenied(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  return code.includes("permission_denied") || message.includes("permission_denied");
}

async function createRoom({ roomCode, hostId, hostName, hostProfile, settings }) {
  const room = buildRoomSkeleton(hostId, settings);
  room.public.playerNames = {
    [hostId]: hostName
  };
  room.public.playerProfiles = {
    [hostId]: hostProfile || {}
  };

  await db.ref(roomPath(roomCode)).set(room);
}

async function readRoomPublic(roomCode) {
  const snapshot = await db.ref(roomPublicPath(roomCode)).once("value");
  return snapshot.val();
}

async function readRoomPrivate(roomCode) {
  const snapshot = await db.ref(`${roomPath(roomCode)}/private`).once("value");
  return snapshot.val() || {};
}

async function addPlayerToRoom({ roomCode, playerId, playerName, playerProfile }) {
  const publicSnapshot = await db.ref(roomPublicPath(roomCode)).once("value");
  const currentPublic = publicSnapshot.val() || {};
  const playerNames = currentPublic.playerNames || {};
  const updates = {
    [`${roomPublicPath(roomCode)}/playerNames/${playerId}`]: playerName,
    [`${roomPublicPath(roomCode)}/playerProfiles/${playerId}`]: playerProfile || {}
  };

  if (!currentPublic.hostId || !playerNames[currentPublic.hostId]) {
    updates[`${roomPublicPath(roomCode)}/hostId`] = playerId;
  }

  await db.ref().update(updates);
}

async function removePlayerFromRoom({ roomCode, playerId }) {
  await cleanupPlayerSession({ roomCode, playerId, status: "lobby" });
}

async function updateRoomSettings(roomCode, settings) {
  await db.ref(`${roomPublicPath(roomCode)}/settings`).update(normalizeRoomSettings(settings));
}

function normalizeRoomSettings(settings = {}) {
  return {
    requiredPlayerCount: clampNumber(settings.requiredPlayerCount, 4, 10, DEFAULT_ROOM_SETTINGS.requiredPlayerCount),
    roundTimerMinutes: [0, 5, 10, 15, 20].includes(Number(settings.roundTimerMinutes))
      ? Number(settings.roundTimerMinutes)
      : DEFAULT_ROOM_SETTINGS.roundTimerMinutes,
    autoRoleAssignment: settings.autoRoleAssignment !== false,
    witnessEnabled: settings.witnessEnabled !== false,
    accompliceEnabled: settings.accompliceEnabled !== false,
    forensicDoctorPlayerId: String(settings.forensicDoctorPlayerId || ""),
    manualKillerId: String(settings.manualKillerId || ""),
    manualAccompliceId: String(settings.manualAccompliceId || ""),
    manualWitnessId: String(settings.manualWitnessId || "")
  };
}

function clampNumber(value, min, max, fallback) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, numberValue));
}

async function writeRoleDistribution({ roomCode, playerTools, privateRoles }) {
  const updates = {
    [`${roomPublicPath(roomCode)}/status`]: "roles",
    [`${roomPublicPath(roomCode)}/playerTools`]: playerTools,
    [`${roomPublicPath(roomCode)}/playerStates`]: null,
    [`${roomPublicPath(roomCode)}/timer`]: buildPausedTimer("roles"),
    [`${roomPublicPath(roomCode)}/caseFile`]: null,
    [`${roomPublicPath(roomCode)}/investigationFeed`]: null,
    [`${roomPublicPath(roomCode)}/discussionFeed`]: null,
    [`${roomPublicPath(roomCode)}/accusation`]: null,
    [`${roomPublicPath(roomCode)}/endReveal`]: null
  };

  Object.entries(privateRoles).forEach(([playerId, privateData]) => {
    updates[playerPrivatePath(roomCode, playerId)] = privateData;
  });

  await db.ref().update(updates);
}

async function writeKillerToolPhase({ roomCode, publicUpdates, privateUpdates }) {
  const updates = {
    [`${roomPublicPath(roomCode)}/status`]: publicUpdates.status,
    [`${roomPublicPath(roomCode)}/playerStates`]: publicUpdates.playerStates,
    [`${roomPublicPath(roomCode)}/timer`]: buildPausedTimer(publicUpdates.status),
    [`${roomPublicPath(roomCode)}/caseFile`]: publicUpdates.caseFile,
    [`${roomPublicPath(roomCode)}/investigationFeed`]: null,
    [`${roomPublicPath(roomCode)}/discussionFeed`]: null
  };

  Object.entries(privateUpdates).forEach(([playerId, privateData]) => {
    Object.entries(privateData).forEach(([key, value]) => {
      updates[`${playerPrivatePath(roomCode, playerId)}/${key}`] = value;
    });
  });

  await db.ref().update(updates);
}

async function writeKillerToolSelection({ roomCode, publicUpdates, privateUpdates }) {
  const updates = {
    [`${roomPublicPath(roomCode)}/status`]: publicUpdates.status,
    [`${roomPublicPath(roomCode)}/playerStates`]: publicUpdates.playerStates,
    [`${roomPublicPath(roomCode)}/timer`]: buildPausedTimer(publicUpdates.status),
    [`${roomPublicPath(roomCode)}/caseFile`]: publicUpdates.caseFile,
    [`${roomPublicPath(roomCode)}/investigationFeed`]: null,
    [`${roomPublicPath(roomCode)}/discussionFeed`]: null
  };

  Object.entries(privateUpdates).forEach(([playerId, privateData]) => {
    Object.entries(privateData).forEach(([key, value]) => {
      updates[`${playerPrivatePath(roomCode, playerId)}/${key}`] = value;
    });
  });

  await db.ref().update(updates);
}

async function writeForensicCaseForPlayer({ roomCode, forensicPlayerId, publicUpdates, privateUpdates }) {
  const publicSnapshot = await db.ref(roomPublicPath(roomCode)).once("value");
  const currentPublic = publicSnapshot.val() || {};
  const playerIds = Object.keys(currentPublic.playerNames || {});
  const playerStates = playerIds.reduce((states, playerId) => {
    states[playerId] = {
      ...(currentPublic.playerStates?.[playerId] || {}),
      phase: publicUpdates.playerStatesPhase,
      ready: true,
      connected: currentPublic.playerStates?.[playerId]?.connected !== false
    };
    return states;
  }, {});
  const updates = {
    [`${roomPublicPath(roomCode)}/status`]: publicUpdates.status,
    [`${roomPublicPath(roomCode)}/playerStates`]: playerStates,
    [`${roomPublicPath(roomCode)}/timer`]: buildRunningTimer(publicUpdates.status, currentPublic.settings || {}),
    [`${roomPublicPath(roomCode)}/caseFile`]: publicUpdates.caseFile,
    [`${roomPublicPath(roomCode)}/investigationFeed`]: null,
    [`${roomPublicPath(roomCode)}/discussionFeed`]: null
  };

  Object.entries(privateUpdates).forEach(([key, value]) => {
    updates[`${playerPrivatePath(roomCode, forensicPlayerId)}/${key}`] = value;
  });

  await db.ref().update(updates);
}

async function sendForensicHint({ roomCode, hint }) {
  const hintRef = db.ref(`${roomPublicPath(roomCode)}/investigationFeed`).push();
  const payload = {
    ...hint,
    id: hintRef.key,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };

  await hintRef.set(payload);
  return payload;
}

async function sendDiscussionMessage({ roomCode, message }) {
  const messageRef = db.ref(`${roomPublicPath(roomCode)}/discussionFeed`).push();
  const payload = {
    ...message,
    id: messageRef.key,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };

  await messageRef.set(payload);
  return payload;
}

async function deleteDiscussionMessage({ roomCode, messageId }) {
  await db.ref(`${roomPublicPath(roomCode)}/discussionFeed/${messageId}`).remove();
}

async function advanceToAccusation({ roomCode }) {
  const publicSnapshot = await db.ref(roomPublicPath(roomCode)).once("value");
  const currentPublic = publicSnapshot.val() || {};
  const updates = {
    [`${roomPublicPath(roomCode)}/status`]: "accusation",
    [`${roomPublicPath(roomCode)}/timer`]: buildRunningTimer("accusation", currentPublic.settings || {}),
    [`${roomPublicPath(roomCode)}/caseFile/statusText`]: "مرحلة الاتهام مفتوحة. ناقشوا القرار النهائي ثم يختار الهوست المتهم."
  };

  await db.ref().update(updates);
}

async function writeEndReveal({ roomCode, endReveal }) {
  const updates = {
    [`${roomPublicPath(roomCode)}/status`]: "end",
    [`${roomPublicPath(roomCode)}/timer`]: buildPausedTimer("end"),
    [`${roomPublicPath(roomCode)}/endReveal`]: {
      ...endReveal,
      revealedAt: firebase.database.ServerValue.TIMESTAMP
    }
  };

  await db.ref().update(updates);
}

async function transferHost({ roomCode, nextHostId }) {
  await db.ref(`${roomPublicPath(roomCode)}/hostId`).set(nextHostId);
}

async function kickPlayer({ roomCode, playerId }) {
  await cleanupPlayerSession({ roomCode, playerId, status: "lobby" });
}

async function markPlayerConnected({ roomCode, playerId, playerName = "", playerProfile = {}, status = "lobby" }) {
  const updates = {
    [`${roomPublicPath(roomCode)}/playerNames/${playerId}`]: playerName,
    [`${roomPublicPath(roomCode)}/playerProfiles/${playerId}`]: playerProfile
  };

  if (status !== "lobby") {
    updates[`${roomPublicPath(roomCode)}/playerStates/${playerId}/name`] = playerName;
    updates[`${roomPublicPath(roomCode)}/playerStates/${playerId}/phase`] = status;
    updates[`${roomPublicPath(roomCode)}/playerStates/${playerId}/connected`] = true;
    updates[`${roomPublicPath(roomCode)}/playerStates/${playerId}/ready`] = true;
    updates[`${roomPublicPath(roomCode)}/playerStates/${playerId}/disconnectedAt`] = null;
  }

  await db.ref().update(updates);
}

async function resetRoomForNewRound({ roomCode, settings }) {
  const publicSnapshot = await db.ref(roomPublicPath(roomCode)).once("value");
  const currentPublic = publicSnapshot.val() || {};
  const activePlayerNames = getActivePlayerNamesForReset(currentPublic);
  const activePlayerIds = Object.keys(activePlayerNames);
  const nextHostId = activePlayerNames[currentPublic.hostId]
    ? currentPublic.hostId
    : activePlayerIds[0] || currentPublic.hostId || "";
  const updates = {
    [`${roomPublicPath(roomCode)}/hostId`]: nextHostId,
    [`${roomPublicPath(roomCode)}/status`]: "lobby",
    [`${roomPublicPath(roomCode)}/settings`]: {
      ...DEFAULT_ROOM_SETTINGS,
      ...normalizeRoomSettings(settings)
    },
    [`${roomPublicPath(roomCode)}/playerNames`]: activePlayerNames,
    [`${roomPublicPath(roomCode)}/timer`]: buildPausedTimer("lobby"),
    [`${roomPublicPath(roomCode)}/playerTools`]: null,
    [`${roomPublicPath(roomCode)}/playerStates`]: null,
    [`${roomPublicPath(roomCode)}/caseFile`]: null,
    [`${roomPublicPath(roomCode)}/investigationFeed`]: null,
    [`${roomPublicPath(roomCode)}/discussionFeed`]: null,
    [`${roomPublicPath(roomCode)}/accusation`]: null,
    [`${roomPublicPath(roomCode)}/endReveal`]: null,
    [`${roomPath(roomCode)}/private`]: null
  };

  await db.ref().update(updates);
}

function getActivePlayerNamesForReset(publicData) {
  const playerNames = publicData.playerNames || {};
  const playerStates = publicData.playerStates || {};

  return Object.entries(playerNames).reduce((activeNames, [playerId, playerName]) => {
    const playerState = playerStates[playerId];

    if (!playerState || playerState.connected !== false) {
      activeNames[playerId] = playerName;
    }

    return activeNames;
  }, {});
}

function buildPlayerCleanupUpdates({
  roomCode,
  playerId,
  playerName = "",
  status = "lobby",
  timestampValue = firebase.database.ServerValue.TIMESTAMP,
  nextHostId
}) {
  if (status === "lobby") {
    const updates = {
      [`${roomPublicPath(roomCode)}/playerNames/${playerId}`]: null,
      [`${roomPublicPath(roomCode)}/playerProfiles/${playerId}`]: null,
      [`${roomPublicPath(roomCode)}/playerTools/${playerId}`]: null,
      [`${roomPublicPath(roomCode)}/playerStates/${playerId}`]: null,
      [playerPrivatePath(roomCode, playerId)]: null
    };

    if (typeof nextHostId === "string") {
      updates[`${roomPublicPath(roomCode)}/hostId`] = nextHostId;
    }

    return updates;
  }

  return {
    [`${roomPublicPath(roomCode)}/playerStates/${playerId}/name`]: playerName,
    [`${roomPublicPath(roomCode)}/playerStates/${playerId}/phase`]: status,
    [`${roomPublicPath(roomCode)}/playerStates/${playerId}/ready`]: false,
    [`${roomPublicPath(roomCode)}/playerStates/${playerId}/connected`]: false,
    [`${roomPublicPath(roomCode)}/playerStates/${playerId}/disconnectedAt`]: timestampValue
  };
}

function buildPlayerCleanupPatch({
  playerId,
  playerName = "",
  status = "lobby",
  timestampValue = Date.now(),
  nextHostId
}) {
  if (status === "lobby") {
    const patch = {
      public: {
        playerNames: { [playerId]: null },
        playerProfiles: { [playerId]: null },
        playerTools: { [playerId]: null },
        playerStates: { [playerId]: null }
      },
      private: {
        [playerId]: null
      }
    };

    if (typeof nextHostId === "string") {
      patch.public.hostId = nextHostId;
    }

    return patch;
  }

  return {
    public: {
      playerStates: {
        [playerId]: {
          name: playerName,
          phase: status,
          ready: false,
          connected: false,
          disconnectedAt: timestampValue
        }
      }
    }
  };
}

async function cleanupPlayerSession({ roomCode, playerId, playerName = "", status = "lobby" }) {
  let nextHostId;

  if (status === "lobby") {
    const publicSnapshot = await db.ref(roomPublicPath(roomCode)).once("value");
    const currentPublic = publicSnapshot.val() || {};

    if (currentPublic.hostId === playerId) {
      nextHostId = getNextHostId(currentPublic.playerNames || {}, playerId);
    }
  }

  await db.ref().update(buildPlayerCleanupUpdates({ roomCode, playerId, playerName, status, nextHostId }));
}

async function registerPlayerDisconnect({ roomCode, playerId, playerName = "", status = "lobby", nextHostId }) {
  await db.ref().onDisconnect().cancel();
  await db.ref().onDisconnect().update(
    buildPlayerCleanupUpdates({ roomCode, playerId, playerName, status, nextHostId })
  );
}

async function cancelPlayerDisconnect() {
  await db.ref().onDisconnect().cancel();
}

function sendPlayerCleanup({ roomCode, playerId, playerName = "", status = "lobby", nextHostId }) {
  const patch = buildPlayerCleanupPatch({
    playerId,
    playerName,
    status,
    nextHostId,
    timestampValue: Date.now()
  });

  fetch(`${firebaseConfig.databaseURL}/${roomPath(roomCode)}.json`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(patch),
    keepalive: true
  }).catch(() => {});
}

function getNextHostId(playerNames, leavingPlayerId) {
  return Object.keys(playerNames || {}).find(playerId => playerId !== leavingPlayerId) || "";
}

function watchRoomPublic(roomCode, onValue, onError) {
  const ref = db.ref(roomPublicPath(roomCode));
  const handler = snapshot => onValue(snapshot.val());
  ref.on("value", handler, onError);

  return () => ref.off("value", handler);
}

function watchPlayerPrivate(roomCode, playerId, onValue, onError) {
  const ref = db.ref(playerPrivatePath(roomCode, playerId));
  const handler = snapshot => onValue(snapshot.val());
  ref.on("value", handler, onError);

  return () => ref.off("value", handler);
}

window.DetectiveFirebase = {
  db,
  firebaseConfig,
  serverTimestamp: firebase.database.ServerValue.TIMESTAMP,
  defaultRoomSettings: DEFAULT_ROOM_SETTINGS,
  roomPath,
  roomPublicPath,
  playerPrivatePath,
  buildRoomSkeleton,
  testConnection: testFirebaseConnection,
  roomExists,
  createRoom,
  readRoomPublic,
  readRoomPrivate,
  addPlayerToRoom,
  removePlayerFromRoom,
  updateRoomSettings,
  writeRoleDistribution,
  writeKillerToolPhase,
  writeKillerToolSelection,
  writeForensicCaseForPlayer,
  sendForensicHint,
  sendDiscussionMessage,
  deleteDiscussionMessage,
  advanceToAccusation,
  writeEndReveal,
  transferHost,
  kickPlayer,
  markPlayerConnected,
  resetRoomForNewRound,
  cleanupPlayerSession,
  registerPlayerDisconnect,
  cancelPlayerDisconnect,
  sendPlayerCleanup,
  watchRoomPublic,
  watchPlayerPrivate
};
