(function () {
  const Utils = window.MB.Utils;
  const Rooms = window.MB.Rooms;
  const Router = window.MB.Router;

  const form = Utils.qs("#entryForm");
  const playerNameInput = Utils.qs("#playerName");
  const inviteCodeInput = Utils.qs("#inviteCode");
  const joinBtn = Utils.qs("#joinRoomBtn");
  const statusEl = Utils.qs("#homeStatus");
  let selectedSkin = "player01";

  const saved = Utils.getPlayerData();
  if (saved.playerName) playerNameInput.value = saved.playerName;
  if (saved.skinId) selectedSkin = saved.skinId;

  function refreshSkinCards() {
    Utils.qsa(".skin-card").forEach(function (button) {
      const active = button.dataset.skin === selectedSkin;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function getPlayerName() {
    const name = Utils.normalizeName(playerNameInput.value);
    if (!name) throw new Error("اكتب اسم اللاعب أولًا.");
    return name;
  }

  Utils.qsa(".skin-card").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedSkin = button.dataset.skin;
      Utils.savePlayerData({ skinId: selectedSkin });
      refreshSkinCards();
    });
  });
  refreshSkinCards();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    Utils.setStatus(statusEl, "جاري إنشاء الغرفة...");
    Rooms.createRoom(getPlayerName(), selectedSkin)
      .then(Router.goToLobby)
      .catch(function (error) {
        Utils.setStatus(statusEl, error.message, "error");
      });
  });

  joinBtn.addEventListener("click", function () {
    let name;
    try {
      name = getPlayerName();
    } catch (error) {
      Utils.setStatus(statusEl, error.message, "error");
      return;
    }
    const code = Utils.normalizeRoomCode(inviteCodeInput.value);
    if (!code) {
      Utils.setStatus(statusEl, "اكتب كود الدعوة.", "error");
      return;
    }

    Utils.setStatus(statusEl, "جاري الانضمام...");
    Rooms.joinRoom(code, name, selectedSkin)
      .then(Router.goToLobby)
      .catch(function (error) {
        Utils.setStatus(statusEl, error.message, "error");
      });
  });
})();
