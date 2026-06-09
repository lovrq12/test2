// =====================================================
// NIGHTMARES — Cosmetic Player Card System
// player-cards.js
// =====================================================
// This file handles cosmetic (appearance) cards only.
// It does NOT touch role assignment, roleData, or
// any game logic.
// =====================================================

// ── Cosmetic card catalog ─────────────────────────
const COSMETIC_CARDS = [
  {
    id: 'shadow-reaper-card.png',
    label: 'حاصد الظلال',
    src: 'assets/player-cards/shadow-reaper-card.png',
  },
  {
    id: 'pink-cat-card.png',
    label: 'القطة الوردية',
    src: 'assets/player-cards/pink-cat-card.png',
  },
];

const COSMETIC_CARD_FALLBACK = COSMETIC_CARDS[0].id;

// ── Helpers ───────────────────────────────────────

/**
 * Resolve the image src for a cosmetic card id.
 * Falls back to shadow-reaper-card.png.
 */
function getCosmeticCardSrc(cardId) {
  const found = COSMETIC_CARDS.find(c => c.id === cardId);
  return found ? found.src : COSMETIC_CARDS[0].src;
}

/**
 * Get the Arabic label for a cosmetic card id.
 */
function getCosmeticCardLabel(cardId) {
  const found = COSMETIC_CARDS.find(c => c.id === cardId);
  return found ? found.label : COSMETIC_CARDS[0].label;
}

/**
 * Return the player's cosmetic card id, with fallback.
 */
function getPlayerCosmeticCard(player) {
  return player?.appearanceCard || COSMETIC_CARD_FALLBACK;
}

/**
 * Render an <img> tag for a player's cosmetic card.
 * Used anywhere that should show PUBLIC identity,
 * NOT in the "دورك" tab.
 */
function getCosmeticCardHtml(player, cssClass = 'ptc-cosmetic-img') {
  const cardId = getPlayerCosmeticCard(player);
  const src = getCosmeticCardSrc(cardId);
  const label = getCosmeticCardLabel(cardId);
  const safeName = String(player?.name || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<img class="${cssClass}" src="${src}" alt="${label} - ${safeName}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${COSMETIC_CARDS[0].src}';">`;
}

/**
 * Render a mini cosmetic card div (for lobby list).
 */
function getCosmeticMiniCardHtml(player) {
  const cardId = getPlayerCosmeticCard(player);
  const src = getCosmeticCardSrc(cardId);
  const label = getCosmeticCardLabel(cardId);
  return `<div class="pc-mini-card"><img src="${src}" alt="${label}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${COSMETIC_CARDS[0].src}';"></div>`;
}

/**
 * Render a seat-size cosmetic card div (for lobby seat ring).
 */
function getCosmeticSeatCardHtml(player) {
  const cardId = getPlayerCosmeticCard(player);
  const src = getCosmeticCardSrc(cardId);
  const label = getCosmeticCardLabel(cardId);
  return `<div class="pc-seat-card"><img src="${src}" alt="${label}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${COSMETIC_CARDS[0].src}';"></div>`;
}

// ── Entry screen selector renderer ───────────────

/**
 * Render the cosmetic card selector into a container element.
 * Returns the currently-selected card id.
 * @param {HTMLElement} container
 * @param {string} initialCardId
 * @param {function(string)} onSelect - called with selected card id
 */
function renderCosmeticCardSelector(container, initialCardId, onSelect) {
  if (!container) return;
  let selectedId = COSMETIC_CARDS.find(c => c.id === initialCardId) ? initialCardId : COSMETIC_CARDS[0].id;

  container.innerHTML = '';

  COSMETIC_CARDS.forEach(card => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pc-card-option' + (card.id === selectedId ? ' is-selected' : '');
    btn.setAttribute('data-card-id', card.id);
    btn.setAttribute('aria-pressed', card.id === selectedId ? 'true' : 'false');
    btn.setAttribute('title', card.label);
    btn.innerHTML = `
      <span class="pc-card-frame">
        <img class="pc-card-img" src="${card.src}" alt="${card.label}" loading="lazy" decoding="async">
        <span class="pc-check-badge" aria-hidden="true">✓</span>
      </span>
      <span class="pc-card-label">${card.label}</span>
    `;

    btn.addEventListener('click', () => {
      selectedId = card.id;
      container.querySelectorAll('.pc-card-option').forEach(el => {
        const active = el.dataset.cardId === selectedId;
        el.classList.toggle('is-selected', active);
        el.setAttribute('aria-pressed', String(active));
      });
      if (typeof onSelect === 'function') onSelect(selectedId);
    });

    container.appendChild(btn);
  });

  if (typeof onSelect === 'function') onSelect(selectedId);
  return selectedId;
}
