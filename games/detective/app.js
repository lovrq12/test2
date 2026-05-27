// نقطة بداية التطبيق وإدارة الحالة العامة.
const DetectiveApp = (() => {
  const state = {
    playerId: createPlayerId()
  };

  function createPlayerId() {
    const existingId = sessionStorage.getItem("detectivePlayerId");

    if (existingId) {
      return existingId;
    }

    let nextId = "";

    if (window.crypto?.randomUUID) {
      nextId = `player_${window.crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
    } else {
      nextId = `player_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    sessionStorage.setItem("detectivePlayerId", nextId);
    return nextId;
  }

  async function runConnectionTest() {
    DetectiveUI.setConnectionState("loading", "يتصل...");

    try {
      await DetectiveFirebase.testConnection(state.playerId);
      DetectiveUI.setConnectionState("success", "متصل");
    } catch (error) {
      DetectiveUI.setConnectionState("error", "فشل الاتصال");
      DetectiveUI.setHomeMessage(error.message || "تعذر الاتصال بـ Firebase.", "error");
    }
  }

  function init() {
    DetectiveUI.init();
    DetectiveLobby.init({
      playerId: state.playerId,
      retryConnection: runConnectionTest
    });
    runConnectionTest();
  }

  return {
    init,
    runConnectionTest,
    state
  };
})();

document.addEventListener("DOMContentLoaded", DetectiveApp.init);
