(function () {
  window.MB = window.MB || {};

  const ITEMS = [
    { id: "apple", name: "تفاحة", color: "أحمر", hints: ["تؤكل", "خفيفة", "دائرية"] },
    { id: "key", name: "مفتاح", color: "فضي", hints: ["معدن", "صغير", "يفتح شيئًا"] },
    { id: "watch", name: "ساعة", color: "أسود", hints: ["تلبس", "تعرض الوقت"] },
    { id: "coin", name: "عملة", color: "ذهبي", hints: ["صغيرة", "معدنية"] },
    { id: "cube", name: "مكعب", color: "متعدد", hints: ["لعبة", "ألوان"] },
    { id: "empty", name: "صندوق فارغ", color: "لا يوجد", hints: [] }
  ];

  const SKINS = [
    { id: "player01", name: "اللاعب 1", asset: "assets/characters/player01.fbx" },
    { id: "player02", name: "اللاعب 2", asset: "assets/characters/player02.fbx" }
  ];

  window.MB.Constants = {
    DEBUG_3D: false,
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 16,
    DEFAULT_SETTINGS: {
      roundTime: 60,
      maxPlayers: 16
    },
    ITEMS,
    SKINS,
    ROOM_STATUS: {
      LOBBY: "lobby",
      PLAYING: "playing",
      FINISHED: "finished"
    },
    PLAYER_ROLE: {
      PLAYER: "player",
      SPECTATOR: "spectator"
    },
    MATCH_STATUS: {
      WAITING: "waiting",
      PLAYING: "playing",
      FINISHED: "finished"
    },
    ROUND_STATUS: {
      CHOOSE_MODE: "chooseMode",
      QUESTIONING: "questioning",
      GUESSING: "guessing",
      REVEAL: "reveal",
      FINISHED: "finished"
    },
    ROUND_TURN: {
      QUESTION: "investigatorQuestion",
      ANSWER: "speakerAnswer"
    }
  };
})();
