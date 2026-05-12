(function () {
  window.MB = window.MB || {};

  function getRoomFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return window.MB.Utils.normalizeRoomCode(params.get("room"));
  }

  function goToLobby(roomCode) {
    window.location.href = "lobby.html?room=" + encodeURIComponent(roomCode);
  }

  function goToGame(roomCode) {
    window.location.href = "game.html?room=" + encodeURIComponent(roomCode);
  }

  function goHome() {
    window.location.href = "index.html";
  }

  function ensureRoomOrHome() {
    const roomCode = getRoomFromUrl();
    if (!roomCode) {
      goHome();
      return "";
    }
    return roomCode;
  }

  window.MB.Router = {
    getRoomFromUrl,
    goToLobby,
    goToGame,
    goHome,
    ensureRoomOrHome
  };
})();
