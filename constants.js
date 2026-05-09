// ── constants.js ──────────────────────────────────────────────────────────
// Shared constants used across all pages. No imports needed.

const PHASES = {
  LOBBY:       "lobby",
  ROLE_REVEAL: "role_reveal",
  NIGHT:       "night",
  DISCUSSION:  "discussion",
  VOTING:      "voting",
  RESULT:      "result",
  ENDED:       "ended"
};

const ROLES = {
  MAFIA:     "mafia",
  CITIZEN:   "citizen",
  DETECTIVE: "detective",
  DOCTOR:    "doctor"
};

const ROLE_EMOJI = {
  mafia:     "🔫",
  citizen:   "🧑",
  detective: "🔍",
  doctor:    "💊"
};

const ROLE_COLORS = {
  mafia:     "var(--red)",
  citizen:   "var(--green)",
  detective: "var(--yellow)",
  doctor:    "var(--green)"
};

// Utility: get two-letter initials from a display name
function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "??";
}

// Utility: generate a random 6-char alphanumeric room code
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Utility: simple HTML escape
function escapeHtml(str = "") {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;")
            .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
