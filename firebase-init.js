// ── firebase-init.js ───────────────────────────────────────────────────────
// Single Firebase initialization. No Firebase Auth. Realtime Database only.
// Uses localStorage to give each browser a persistent player UID.
// Every other script reads window.db and window.currentUser from here.

const firebaseConfig = {
  apiKey:            "AIzaSyOfE8IrWe_UNZaTus-OJygAk4wIILY_jjw",
  authDomain:        "endx-8ac33.firebaseapp.com",
  databaseURL:       "https://endx-8ac33-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "endx-8ac33",
  storageBucket:     "endx-8ac33.firebasestorage.app",
  messagingSenderId: "11855321835",
  appId:             "1:11855321835:web:bb03b9acb3abf5143b1eb2"
};

// Guard: only initialize once (in case script is loaded twice)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Realtime Database — available globally as window.db
window.db = firebase.database();

// Persistent player identity via localStorage (no auth needed)
(function initIdentity() {
  let uid = localStorage.getItem("mafia_uid");
  if (!uid) {
    uid = "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    localStorage.setItem("mafia_uid", uid);
  }
  window.currentUser = { uid };
})();
