(function () {
  window.MB = window.MB || {};

  const PLAYER_ID_KEY = "mysteryBox.playerId";
  const PLAYER_DATA_KEY = "mysteryBox.playerData";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  function normalizeName(name) {
    return String(name || "").trim().replace(/\s+/g, " ").slice(0, 18);
  }

  function normalizeRoomCode(code) {
    return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  }

  function generateId(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  function getPlayerId() {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = generateId("p");
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  }

  function savePlayerData(data) {
    const existing = getPlayerData();
    const next = Object.assign({}, existing, data || {});
    localStorage.setItem(PLAYER_DATA_KEY, JSON.stringify(next));
    if (next.playerId) {
      localStorage.setItem(PLAYER_ID_KEY, next.playerId);
    }
    return next;
  }

  function getPlayerData() {
    try {
      return JSON.parse(localStorage.getItem(PLAYER_DATA_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function randomRoomCode(length) {
    const size = length || (Math.random() > 0.45 ? 6 : 5);
    let code = "";
    for (let i = 0; i < size; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }

  function setStatus(element, message, type) {
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("is-error", type === "error");
    element.classList.toggle("is-ok", type === "ok");
  }

  function shuffle(items) {
    const next = (items || []).slice();
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = next[i];
      next[i] = next[j];
      next[j] = temp;
    }
    return next;
  }

  function sample(items) {
    if (!items || !items.length) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || min));
  }

  function toArray(object) {
    return Object.keys(object || {}).map(function (key) {
      return object[key];
    });
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function playerName(room, playerId) {
    return room && room.players && room.players[playerId] ? room.players[playerId].name : "لاعب";
  }

  function itemById(id) {
    return window.MB.Constants.ITEMS.find(function (item) {
      return item.id === id;
    }) || window.MB.Constants.ITEMS[0];
  }

  function skinById(id) {
    return window.MB.Constants.SKINS.find(function (skin) {
      return skin.id === id;
    }) || window.MB.Constants.SKINS[0];
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    const input = document.createElement("input");
    input.value = value;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    return Promise.resolve();
  }

  function once(fn) {
    let called = false;
    return function () {
      if (called) return undefined;
      called = true;
      return fn.apply(this, arguments);
    };
  }

  window.MB.Utils = {
    qs,
    qsa,
    escapeHtml,
    normalizeName,
    normalizeRoomCode,
    generateId,
    getPlayerId,
    savePlayerData,
    getPlayerData,
    randomRoomCode,
    setStatus,
    shuffle,
    sample,
    clamp,
    toArray,
    formatTime,
    playerName,
    itemById,
    skinById,
    copyText,
    once
  };
})();
