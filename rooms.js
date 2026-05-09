// ── rooms.js ───────────────────────────────────────────────────────────────
// All Realtime Database room operations.
// Depends on: window.db, window.currentUser, constants.js

// ── Create room ────────────────────────────────────────────────────────────
async function createRoom(displayName, settings) {
  const uid  = window.currentUser.uid;
  const code = generateRoomCode();
  localStorage.setItem("mafia_name", displayName);

  const room = {
    roomCode:   code,
    hostId:     uid,
    phase:      PHASES.LOBBY,
    status:     "waiting",
    createdAt:  Date.now(),
    phaseCount: 0,
    settings,
    players: {
      [uid]: {
        uid,
        displayName,
        isReady:  false,
        isAlive:  true,
        role:     null,
        joinedAt: Date.now()
      }
    }
  };

  await window.db.ref("rooms/" + code).set(room);
  return code;
}

// ── Join room ──────────────────────────────────────────────────────────────
async function joinRoom(code, displayName) {
  const uid    = window.currentUser.uid;
  const roomRef= window.db.ref("rooms/" + code);
  localStorage.setItem("mafia_name", displayName);

  const snap = await roomRef.once("value");
  if (!snap.exists()) throw new Error("Room not found.");

  const room = snap.val();
  if (room.status === "playing") throw new Error("Game already in progress.");

  const count = Object.keys(room.players || {}).length;
  if (count >= room.settings.maxPlayers) throw new Error("Room is full.");

  // Already in room — just update name
  if (room.players?.[uid]) {
    await roomRef.child("players/" + uid + "/displayName").set(displayName);
    return;
  }

  await roomRef.child("players/" + uid).set({
    uid,
    displayName,
    isReady:  false,
    isAlive:  true,
    role:     null,
    joinedAt: Date.now()
  });
}

// ── Leave room ─────────────────────────────────────────────────────────────
async function leaveRoom(code) {
  const uid    = window.currentUser.uid;
  const roomRef= window.db.ref("rooms/" + code);

  const snap = await roomRef.once("value");
  if (!snap.exists()) return;

  const room = snap.val();

  // Remove player
  await roomRef.child("players/" + uid).remove();

  // If host left and others remain, transfer host
  const remaining = Object.values(room.players || {}).filter(p => p.uid !== uid);
  if (remaining.length > 0 && room.hostId === uid) {
    const nextHost = remaining.sort((a,b) => a.joinedAt - b.joinedAt)[0];
    await roomRef.child("hostId").set(nextHost.uid);
  } else if (remaining.length === 0) {
    await roomRef.remove();
  }
}

// ── Set ready ──────────────────────────────────────────────────────────────
async function setReady(code, ready) {
  const uid = window.currentUser.uid;
  await window.db.ref(`rooms/${code}/players/${uid}/isReady`).set(ready);
}

// ── Start game ─────────────────────────────────────────────────────────────
async function startGame(code) {
  const roomRef = window.db.ref("rooms/" + code);
  const snap    = await roomRef.once("value");
  const room    = snap.val();

  if (!room) throw new Error("Room not found.");
  if (room.hostId !== window.currentUser.uid) throw new Error("Only the host can start.");

  const players = Object.values(room.players || {});
  if (players.length < 2) throw new Error("Need at least 2 players.");
  if (!players.every(p => p.isReady)) throw new Error("All players must be ready.");

  // Assign roles
  const roles   = assignRoles(players, room.settings);
  const updates = {};

  players.forEach((p, i) => {
    updates[`players/${p.uid}/role`]    = roles[i];
    updates[`players/${p.uid}/isAlive`] = true;
  });

  const phaseEndsAt = Date.now() + 8000; // 8s for role reveal
  updates.phase      = PHASES.ROLE_REVEAL;
  updates.status     = "playing";
  updates.phaseEndsAt= phaseEndsAt;
  updates.phaseCount = 0;

  await roomRef.update(updates);

  // System message
  await sendSystemMessage(code, "public", "🎭 Game started! Check your role.");
}

// ── Assign roles ────────────────────────────────────────────────────────────
function assignRoles(players, settings) {
  const count   = players.length;
  const mafiaCount = Math.max(1, Math.floor(count / 4));
  const roles   = [];

  // Mafia
  for (let i = 0; i < mafiaCount; i++) roles.push(ROLES.MAFIA);

  // Special roles
  if (settings.rolesEnabled?.detective && count >= 5) roles.push(ROLES.DETECTIVE);
  if (settings.rolesEnabled?.doctor    && count >= 6) roles.push(ROLES.DOCTOR);

  // Fill rest with citizens
  while (roles.length < count) roles.push(ROLES.CITIZEN);

  // Shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

// ── Submit night action ────────────────────────────────────────────────────
async function submitNightAction(code, actionType, targetUid) {
  const uid = window.currentUser.uid;
  await window.db.ref(`rooms/${code}/nightActions/${uid}`).set({
    actionType,
    targetUid,
    timestamp: Date.now()
  });
}

// ── Cast vote ──────────────────────────────────────────────────────────────
async function castVote(code, targetUid) {
  const uid = window.currentUser.uid;
  await window.db.ref(`rooms/${code}/votes/${uid}`).set(targetUid);
}

// ── Send chat message ──────────────────────────────────────────────────────
async function sendChat(code, text, channel = "public") {
  const uid  = window.currentUser.uid;
  const name = localStorage.getItem("mafia_name") || "Player";
  const ref  = window.db.ref(`rooms/${code}/chat/${channel}`).push();
  await ref.set({
    uid,
    displayName: name,
    text,
    timestamp: Date.now()
  });
}

async function sendSystemMessage(code, channel, text) {
  const ref = window.db.ref(`rooms/${code}/chat/${channel}`).push();
  await ref.set({ uid: null, displayName: "System", text, timestamp: Date.now() });
}

// ── Advance phase (host only) ──────────────────────────────────────────────
async function advancePhase(code) {
  const roomRef = window.db.ref("rooms/" + code);
  const snap    = await roomRef.once("value");
  const room    = snap.val();
  if (!room) return;

  const uid = window.currentUser.uid;
  if (room.hostId !== uid) return;

  const phase    = room.phase;
  const settings = room.settings;
  const players  = room.players || {};
  const updates  = {};

  // ── ROLE_REVEAL → NIGHT ───────────────────────────────────────────────
  if (phase === PHASES.ROLE_REVEAL) {
    updates.phase       = PHASES.NIGHT;
    updates.phaseEndsAt = Date.now() + settings.nightDuration * 1000;
    updates.nightActions= null;
    updates.votes       = null;
    await roomRef.update(updates);
    await sendSystemMessage(code, "public", "🌙 Night has fallen. The Mafia is choosing their target…");
    return;
  }

  // ── NIGHT → DISCUSSION ────────────────────────────────────────────────
  if (phase === PHASES.NIGHT) {
    const nightActions = room.nightActions || {};
    const pList        = Object.values(players).filter(p => p.isAlive);
    let eliminated     = null;
    let saved          = false;

    // Mafia vote: most-targeted alive player
    const mafiaVotes = {};
    Object.values(nightActions).forEach(a => {
      if (a.actionType === "mafiaTarget") {
        mafiaVotes[a.targetUid] = (mafiaVotes[a.targetUid] || 0) + 1;
      }
    });
    const mafiaTarget = Object.entries(mafiaVotes).sort((a,b)=>b[1]-a[1])[0]?.[0];

    // Doctor save
    const doctorSave = Object.values(nightActions).find(a => a.actionType === "doctorSave")?.targetUid;
    if (mafiaTarget && doctorSave === mafiaTarget) { saved = true; }
    if (mafiaTarget && !saved && players[mafiaTarget]?.isAlive) {
      eliminated = mafiaTarget;
      updates[`players/${mafiaTarget}/isAlive`] = false;
    }

    updates.phase              = PHASES.DISCUSSION;
    updates.phaseEndsAt        = Date.now() + settings.discussDuration * 1000;
    updates.lastEliminatedNight= eliminated;
    updates.nightActions       = null;
    updates.votes              = null;
    updates.phaseCount         = (room.phaseCount || 0) + 1;
    await roomRef.update(updates);

    if (eliminated && players[eliminated]) {
      await sendSystemMessage(code, "public", `☠️ ${players[eliminated].displayName} was eliminated last night.`);
    } else {
      await sendSystemMessage(code, "public", saved
        ? "💊 The doctor saved someone! No one died last night."
        : "🌙 No one was eliminated last night.");
    }

    // Check win after night
    const updatedSnap = await roomRef.once("value");
    if (await checkWin(code, updatedSnap.val())) return;

    await sendSystemMessage(code, "public", "☀️ Day has begun. Discuss who the Mafia might be!");
    return;
  }

  // ── DISCUSSION → VOTING ───────────────────────────────────────────────
  if (phase === PHASES.DISCUSSION) {
    updates.phase       = PHASES.VOTING;
    updates.phaseEndsAt = Date.now() + settings.votingDuration * 1000;
    updates.votes       = null;
    await roomRef.update(updates);
    await sendSystemMessage(code, "public", "🗳️ Voting has begun! Choose who to eliminate.");
    return;
  }

  // ── VOTING → RESULT ───────────────────────────────────────────────────
  if (phase === PHASES.VOTING) {
    const votes    = room.votes || {};
    const alivePl  = Object.values(players).filter(p => p.isAlive);
    const tally    = {};
    Object.values(votes).forEach(v => { tally[v] = (tally[v] || 0) + 1; });

    let dayElim = null;
    if (Object.keys(tally).length > 0) {
      const top = Object.entries(tally).sort((a,b)=>b[1]-a[1])[0];
      // Only eliminate if they got more than 1 vote OR only 1 alive voter
      if (top[1] >= 1 && players[top[0]]?.isAlive) {
        dayElim = top[0];
        updates[`players/${top[0]}/isAlive`] = false;
      }
    }

    updates.phase              = PHASES.RESULT;
    updates.phaseEndsAt        = Date.now() + 8000;
    updates.lastEliminatedDay  = dayElim;
    updates.votes              = null;
    await roomRef.update(updates);

    if (dayElim && players[dayElim]) {
      await sendSystemMessage(code, "public",
        `🗳️ ${players[dayElim].displayName} was voted out. They were ${ROLE_EMOJI[players[dayElim].role]} ${players[dayElim].role}.`);
    } else {
      await sendSystemMessage(code, "public", "🗳️ No one was eliminated by vote.");
    }

    const updatedSnap = await roomRef.once("value");
    if (await checkWin(code, updatedSnap.val())) return;
    return;
  }

  // ── RESULT → NIGHT ────────────────────────────────────────────────────
  if (phase === PHASES.RESULT) {
    updates.phase              = PHASES.NIGHT;
    updates.phaseEndsAt        = Date.now() + settings.nightDuration * 1000;
    updates.nightActions       = null;
    updates.votes              = null;
    updates.lastEliminatedDay  = null;
    updates.lastEliminatedNight= null;
    updates.phaseCount         = (room.phaseCount || 0) + 1;
    await roomRef.update(updates);
    await sendSystemMessage(code, "public", "🌙 Night falls again…");
    return;
  }
}

// ── Win condition check ────────────────────────────────────────────────────
async function checkWin(code, room) {
  const players = Object.values(room.players || {});
  const alive   = players.filter(p => p.isAlive);
  const mafiaAlive   = alive.filter(p => p.role === ROLES.MAFIA).length;
  const citizensAlive= alive.filter(p => p.role !== ROLES.MAFIA).length;

  if (mafiaAlive === 0) {
    await window.db.ref("rooms/" + code).update({
      phase:  PHASES.ENDED,
      status: "ended",
      winner: "citizens"
    });
    await sendSystemMessage(code, "public", "🎉 Citizens win! All Mafia members have been eliminated.");
    return true;
  }

  if (mafiaAlive >= citizensAlive) {
    await window.db.ref("rooms/" + code).update({
      phase:  PHASES.ENDED,
      status: "ended",
      winner: "mafia"
    });
    await sendSystemMessage(code, "public", "🔫 Mafia wins! They now outnumber the citizens.");
    return true;
  }

  return false;
}
