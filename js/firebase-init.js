(function () {
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

  window.MB = window.MB || {};
  window.MB.firebase = firebase;
  window.MB.db = db;
})();
