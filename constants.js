/**
 * shared/constants.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared constants used by BOTH frontend and backend.
 * Import in backend via:  const C = require('../shared/constants');
 * Import in frontend via: import C from '../../shared/constants.js';
 *
 * DO NOT put environment-specific config here (no URLs, no secrets).
 * This file must work in both Node.js (CommonJS) and browser (ES Module).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── GAME PHASES ─────────────────────────────────────────────────────────────

const PHASES = {
  LOBBY:             'lobby',
  ROLE_DISTRIBUTION: 'role_distribution',
  ROLE_REVEAL:       'role_reveal',
  NIGHT:             'night',
  DAWN:              'dawn',
  DAY:               'day',
  VOTING:            'voting',
  ELIMINATION:       'elimination',
  GAME_OVER:         'game_over',
};

// ─── PLAYER ROLES ─────────────────────────────────────────────────────────────

const ROLES = {
  MAFIA:     'mafia',
  DETECTIVE: 'detective',
  DOCTOR:    'doctor',
  CITIZEN:   'citizen',
};

/** Arabic display names for each role */
const ROLE_ARABIC = {
  [ROLES.MAFIA]:     'المافيا',
  [ROLES.DETECTIVE]: 'المحقق',
  [ROLES.DOCTOR]:    'الطبيب',
  [ROLES.CITIZEN]:   'المواطن',
};

/**
 * Role distribution by player count.
 * Key = total number of players in the room.
 */
const ROLE_COUNTS = {
  4: { [ROLES.MAFIA]: 1, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.CITIZEN]: 1 },
  5: { [ROLES.MAFIA]: 1, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.CITIZEN]: 2 },
  6: { [ROLES.MAFIA]: 2, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.CITIZEN]: 2 },
  7: { [ROLES.MAFIA]: 2, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.CITIZEN]: 3 },
  8: { [ROLES.MAFIA]: 2, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.CITIZEN]: 4 },
};

// ─── ROOM STATUS ──────────────────────────────────────────────────────────────

const ROOM_STATUS = {
  WAITING: 'waiting',
  ACTIVE:  'active',
  ENDED:   'ended',
};

// ─── ROOM SETTINGS DEFAULTS & LIMITS ─────────────────────────────────────────

const ROOM_SETTINGS = {
  MIN_PLAYERS:        4,
  MAX_PLAYERS:        8,
  DEFAULT_MAX_PLAYERS: 6,

  NIGHT_DURATION_OPTIONS:      [30, 45, 60],  // seconds
  DAY_DURATION_OPTIONS:        [30, 60, 90],  // seconds
  DISCUSSION_DURATION_OPTIONS: [30, 60, 90],  // seconds
  VOTING_DURATION_OPTIONS:     [20, 30, 45],  // seconds

  DEFAULT_NIGHT_DURATION:      45,
  DEFAULT_DAY_DURATION:        60,
  DEFAULT_DISCUSSION_DURATION: 60,
  DEFAULT_VOTING_DURATION:     30,
};

// ─── WIN CONDITIONS ───────────────────────────────────────────────────────────

const WIN_REASON = {
  ALL_MAFIA_ELIMINATED:    'all_mafia_eliminated',
  MAFIA_EQUALS_CIVILIANS:  'mafia_equals_civilians',
};

const WINNER = {
  CIVILIANS: 'civilians',
  MAFIA:     'mafia',
};

// ─── SOCKET EVENT NAMES ───────────────────────────────────────────────────────
// Centralised here so both client and server reference the same string literals.

const EVENTS = {
  // ── Client → Server ──────────────────────────────────────────────────────
  CREATE_ROOM:            'createRoom',
  JOIN_ROOM:              'joinRoom',
  LEAVE_ROOM:             'leaveRoom',
  KICK_PLAYER:            'kickPlayer',
  UPDATE_SETTINGS:        'updateSettings',
  SET_READY:              'setReady',
  START_GAME:             'startGame',
  ROLE_ACKNOWLEDGED:      'roleAcknowledged',
  MAFIA_SELECT_TARGET:    'mafiaSelectTarget',
  DOCTOR_SELECT_SAVE:     'doctorSelectSave',
  DETECTIVE_INVESTIGATE:  'detectiveInvestigate',
  SUBMIT_VOTE:            'submitVote',
  SEND_MESSAGE:           'sendMessage',
  RECONNECT_TO_ROOM:      'reconnectToRoom',

  // ── Server → Client (private) ─────────────────────────────────────────────
  ROOM_CREATED:           'ROOM_CREATED',
  ROOM_JOINED:            'ROOM_JOINED',
  JOIN_ERROR:             'JOIN_ERROR',
  ROOM_ERROR:             'ROOM_ERROR',
  YOUR_ROLE:              'YOUR_ROLE',
  DETECTIVE_RESULT:       'DETECTIVE_RESULT',
  ACTION_CONFIRMED:       'ACTION_CONFIRMED',
  VOTE_CONFIRMED:         'VOTE_CONFIRMED',
  KICKED:                 'KICKED',
  GAME_STATE_RESTORED:    'GAME_STATE_RESTORED',
  ERROR:                  'ERROR',

  // ── Server → Client (broadcast to room) ──────────────────────────────────
  PLAYER_JOINED:          'PLAYER_JOINED',
  PLAYER_LEFT:            'PLAYER_LEFT',
  PLAYER_READY_CHANGED:   'PLAYER_READY_CHANGED',
  ALL_PLAYERS_READY:      'ALL_PLAYERS_READY',
  SETTINGS_UPDATED:       'SETTINGS_UPDATED',
  GAME_STARTING:          'GAME_STARTING',
  ROLES_DISTRIBUTING:     'ROLES_DISTRIBUTING',
  ROLES_DEALT:            'ROLES_DEALT',
  NIGHT_STARTING:         'NIGHT_STARTING',
  NIGHT_PHASE_START:      'NIGHT_PHASE_START',
  MAFIA_TARGET_UPDATED:   'MAFIA_TARGET_UPDATED',
  DAWN_RESOLUTION:        'DAWN_RESOLUTION',
  DAY_PHASE_START:        'DAY_PHASE_START',
  NEW_MESSAGE:            'NEW_MESSAGE',
  VOTING_PHASE_START:     'VOTING_PHASE_START',
  VOTE_TALLY_UPDATED:     'VOTE_TALLY_UPDATED',
  VOTE_RESULT:            'VOTE_RESULT',
  GAME_OVER:              'GAME_OVER',
  PLAYER_DISCONNECTED:    'PLAYER_DISCONNECTED',
  HOST_TRANSFERRED:       'HOST_TRANSFERRED',
  TIMER_SYNC:             'TIMER_SYNC',
};

// ─── ERROR CODES ──────────────────────────────────────────────────────────────

const ERROR_CODES = {
  NOT_YOUR_TURN:         'NOT_YOUR_TURN',
  NOT_YOUR_ROLE:         'NOT_YOUR_ROLE',
  PLAYER_IS_DEAD:        'PLAYER_IS_DEAD',
  INVALID_TARGET:        'INVALID_TARGET',
  ROOM_NOT_FOUND:        'ROOM_NOT_FOUND',
  ROOM_FULL:             'ROOM_FULL',
  GAME_IN_PROGRESS:      'GAME_IN_PROGRESS',
  NOT_ENOUGH_PLAYERS:    'NOT_ENOUGH_PLAYERS',
  RATE_LIMITED:          'RATE_LIMITED',
  VALIDATION_ERROR:      'VALIDATION_ERROR',
  NOT_HOST:              'NOT_HOST',
  ROOM_LIMIT_REACHED:    'ROOM_LIMIT_REACHED',
  NAME_TAKEN:            'NAME_TAKEN',
  ALREADY_IN_ROOM:       'ALREADY_IN_ROOM',
};

// ─── SCORING ──────────────────────────────────────────────────────────────────

const SCORE = {
  SURVIVE_TO_WIN:            100,
  CORRECT_INVESTIGATION:      50,
  SUCCESSFUL_DOCTOR_SAVE:     75,
  CORRECT_VOTE_ON_MAFIA:      25,
  MAFIA_SURVIVE_TO_WIN:      150,
  MAFIA_ELIMINATE_CIVILIAN:   30,
};

// ─── TIMING (milliseconds unless noted) ──────────────────────────────────────

const TIMING = {
  ROLE_REVEAL_DURATION_MS:       8000,   // How long role reveal screen shows
  ROLE_REVEAL_FLIP_DELAY_MS:     3000,   // Delay before card flips
  COUNTDOWN_BEFORE_NIGHT_MS:     5000,   // Countdown before first night
  PHASE_TRANSITION_DELAY_MS:     2000,   // Brief pause between phase transitions
  DISCONNECT_GRACE_PERIOD_MS:   30000,   // Wait before eliminating disconnected player
  TIMER_SYNC_INTERVAL_MS:        5000,   // How often server syncs timer to clients
  TIMER_WARNING_THRESHOLD_S:        10,  // Seconds remaining when warning starts
  DAWN_RESOLUTION_DISPLAY_MS:    4000,   // How long dawn result is shown
  GAME_OVER_REVEAL_DELAY_MS:     1500,   // Delay before revealing roles on game over
};

// ─── REDIS ────────────────────────────────────────────────────────────────────

const REDIS = {
  KEY_PREFIX:    'mafia:',
  ROOM_TTL_S:    7200,  // 2 hours
};

/**
 * Build a Redis key for a given resource.
 * @param {'room'|'players'|'roles'|'mafia_team'|'night'|'votes'|'tally'|'chat'|'eliminated'} type
 * @param {string} roomCode
 * @param {Object} [opts] - Optional extra segments (round, phase)
 * @returns {string}
 */
function redisKey(type, roomCode, opts = {}) {
  const base = `${REDIS.KEY_PREFIX}room:${roomCode}`;
  switch (type) {
    case 'room':       return base;
    case 'players':    return `${base}:players`;
    case 'roles':      return `${base}:roles`;
    case 'mafia_team': return `${base}:mafia_team`;
    case 'night':      return `${base}:night:${opts.round}`;
    case 'votes':      return `${base}:votes:${opts.round}`;
    case 'tally':      return `${base}:tally:${opts.round}`;
    case 'chat':       return `${base}:chat:${opts.phase}:${opts.round}`;
    case 'eliminated': return `${base}:eliminated`;
    default:           return `${base}:${type}`;
  }
}

// ─── VALIDATION LIMITS ────────────────────────────────────────────────────────

const VALIDATION = {
  PLAYER_NAME_MIN_LENGTH:  1,
  PLAYER_NAME_MAX_LENGTH: 20,
  ROOM_CODE_LENGTH:        6,
  CHAT_MESSAGE_MAX_LENGTH: 200,
  ROOM_CODE_PATTERN:       /^[A-Z0-9]{6}$/,
  // Allow Arabic (Unicode ranges), Latin letters, numbers, spaces
  PLAYER_NAME_PATTERN:     /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFFA-Za-z0-9 ]{1,20}$/,
};

// ─── RATE LIMITS ──────────────────────────────────────────────────────────────

const RATE_LIMITS = {
  CHAT_MAX_MESSAGES:       10,
  CHAT_WINDOW_MS:       10000,  // per 10 seconds
  VOTE_CHANGES_MAX:         3,  // per voting phase
  RECONNECT_MAX_ATTEMPTS:   5,
  RECONNECT_WINDOW_MS:  60000,  // per minute
  ROOM_CREATION_MAX:        3,
  ROOM_CREATION_WINDOW_MS: 3600000,  // per hour
};

// ─── EXPORT (works in both CommonJS and ES Modules) ──────────────────────────

const constants = {
  PHASES,
  ROLES,
  ROLE_ARABIC,
  ROLE_COUNTS,
  ROOM_STATUS,
  ROOM_SETTINGS,
  WIN_REASON,
  WINNER,
  EVENTS,
  ERROR_CODES,
  SCORE,
  TIMING,
  REDIS,
  redisKey,
  VALIDATION,
  RATE_LIMITS,
};

// Support both CommonJS (Node.js backend) and ES Module (browser frontend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = constants;
} else {
  // ES Module export — used by frontend
  // (This file is referenced in frontend as a plain <script> or via dynamic import)
}

// Also attach to globalThis for browser usage without bundler
if (typeof globalThis !== 'undefined') {
  globalThis.MafiaConstants = constants;
}
