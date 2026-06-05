// ===== NIGHTMARES — FIREBASE MODULE =====

const firebaseConfig = {
  apiKey: "AIzaSyOfE8IrWe_UNZaTus-OJygAk4wIILY_jjw",
  authDomain: "endx-8ac33.firebaseapp.com",
  databaseURL: "https://endx-8ac33-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "endx-8ac33",
  storageBucket: "endx-8ac33.firebasestorage.app",
  messagingSenderId: "11855321835",
  appId: "1:11855321835:web:bb03b9acb3abf5143b1eb2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== DB HELPERS =====
const DB = {
  ref: (path) => db.ref(path),

  set: (path, data) => db.ref(path).set(data),

  update: (path, data) => db.ref(path).update(data),

  push: (path, data) => db.ref(path).push(data),

  get: async (path) => {
    const snap = await db.ref(path).get();
    return snap.exists() ? snap.val() : null;
  },

  on: (path, cb, event = 'value') => {
    const r = db.ref(path);
    r.on(event, snap => cb(snap.val(), snap));
    return () => r.off(event);
  },

  once: async (path) => {
    const snap = await db.ref(path).once('value');
    return snap.val();
  },

  remove: (path) => db.ref(path).remove(),

  onDisconnect: (path, data) => {
    db.ref(path).onDisconnect().update(data);
  },

  timestamp: () => firebase.database.ServerValue.TIMESTAMP,

  generateId: () => db.ref().push().key,
};

// ===== PRESENCE SYSTEM =====
function setupPresence(roomId, playerId) {
  const connectedRef = db.ref('.info/connected');
  const playerRef = db.ref(`rooms/${roomId}/players/${playerId}`);

  connectedRef.on('value', async (snap) => {
    if (snap.val() === true) {
      const current = (await playerRef.once('value')).val() || {};
      if (current.status === 'kicked') return;
      playerRef.update({
        connected: true,
        online: true,
        status: 'active',
        lastSeen: DB.timestamp()
      });
      playerRef.onDisconnect().update({
        connected: false,
        online: false,
        lastSeen: DB.timestamp()
      });
    }
  });
}
