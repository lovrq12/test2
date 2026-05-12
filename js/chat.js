(function () {
  window.MB = window.MB || {};

  const db = window.MB.db;
  const firebase = window.MB.firebase;
  const Utils = window.MB.Utils;

  function renderMessages(listEl, messages) {
    if (!listEl) return;
    const values = Utils.toArray(messages).sort(function (a, b) {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }).slice(-80);

    if (!values.length) {
      listEl.innerHTML = '<div class="empty-state">لا توجد رسائل بعد</div>';
      return;
    }

    listEl.innerHTML = values.map(function (message) {
      return [
        '<article class="chat-message">',
        '<p><strong>' + Utils.escapeHtml(message.name || "لاعب") + '</strong>' + Utils.escapeHtml(message.text || "") + '</p>',
        '</article>'
      ].join("");
    }).join("");
    listEl.scrollTop = listEl.scrollHeight;
  }

  function init(options) {
    const roomCode = options.roomCode;
    const path = options.path || "chat";
    const listEl = options.listEl;
    const formEl = options.formEl;
    const inputEl = options.inputEl;
    const ref = db.ref("rooms/" + roomCode + "/" + path);
    const playerData = Utils.getPlayerData();

    function onValue(snapshot) {
      renderMessages(listEl, snapshot.val() || {});
    }

    ref.limitToLast(80).on("value", onValue);

    function onSubmit(event) {
      event.preventDefault();
      const text = String(inputEl.value || "").trim();
      if (!text) return;
      inputEl.value = "";
      ref.push({
        playerId: Utils.getPlayerId(),
        name: playerData.playerName || "لاعب",
        text,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
    }

    if (formEl) formEl.addEventListener("submit", onSubmit);

    return function cleanup() {
      ref.off("value", onValue);
      if (formEl) formEl.removeEventListener("submit", onSubmit);
    };
  }

  function sendSystem(roomCode, text) {
    return db.ref("rooms/" + roomCode + "/chat").push({
      playerId: "system",
      name: "النظام",
      text,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
  }

  window.MB.Chat = {
    init,
    sendSystem
  };
})();
