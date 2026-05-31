// ===== NIGHTMARES — LOBBY V2 UI ENHANCEMENTS =====
// Handles: star particles, theme toggle, host badge, invite, mobile settings, player count badge

(function () {
  'use strict';

  /* ── Star particles ── */
  function initStars() {
    const container = document.getElementById('lv2-stars');
    if (!container) return;
    const count = 80;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'lv2-star';
      const size = Math.random() * 2.5 + 0.5;
      el.style.cssText = [
        `width:${size}px`,
        `height:${size}px`,
        `left:${Math.random() * 100}%`,
        `top:${Math.random() * 100}%`,
        `--dur:${(Math.random() * 5 + 2).toFixed(1)}s`,
        `--delay:${(Math.random() * 6).toFixed(1)}s`,
        `--op:${(Math.random() * 0.5 + 0.2).toFixed(2)}`,
      ].join(';');
      container.appendChild(el);
    }
  }

  /* ── Theme system ── */
  const THEME_KEY = 'nightmares_lobby_theme';

  function applyTheme(theme) {
    const isDark = theme !== 'light';
    document.body.classList.toggle('lv2-dark', isDark);
    document.body.classList.toggle('lv2-light', !isDark);
    const icon = document.querySelector('.lv2-theme-icon');
    if (icon) icon.textContent = isDark ? '🌙' : '☀️';
    // Sync existing vm-btn system
    const vmBtns = document.querySelectorAll('.vm-btn');
    vmBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === (isDark ? 'dark' : 'clear'));
    });
    document.body.dataset.visualMode = isDark ? 'dark' : 'clear';
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(saved);

    document.getElementById('lv2-theme-toggle')?.addEventListener('click', () => {
      const current = document.body.classList.contains('lv2-light') ? 'light' : 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  /* ── Host badge live update ── */
  function updateHostBadge(players) {
    const nameEl = document.getElementById('lv2-host-name');
    if (!nameEl || !players) return;
    const host = Object.values(players).find(p => p.isHost);
    nameEl.textContent = host ? host.name : '—';
  }

  /* ── Player count badge ── */
  function updatePlayerCount(players, maxPlayers) {
    const el = document.getElementById('lv2-player-count');
    if (!el) return;
    const active = Object.values(players || {}).filter(p => {
      const s = p.status || 'active';
      return s !== 'kicked' && s !== 'left';
    }).length;
    el.textContent = `${active}/${maxPlayers || 12}`;
  }

  /* ── Invite button ── */
  function initInvite() {
    const btn = document.getElementById('lv2-invite-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const code = document.getElementById('room-code-display')?.textContent?.trim();
      if (!code || code === '-----') return;
      const text = `انضم إلي في لعبة Nightmares! كود الغرفة: ${code}`;
      if (navigator.share) {
        navigator.share({ title: 'Nightmares', text }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          if (typeof showToast === 'function') showToast('تم نسخ رابط الدعوة', 'success');
        });
      }
    });
  }

  /* ── Mobile settings accordion ── */
  function initMobileSettingsAccordion() {
    const toggle = document.getElementById('lv2-mob-settings-toggle');
    const body = document.getElementById('lv2-mob-settings-body');
    if (!toggle || !body) return;

    toggle.addEventListener('click', () => {
      const isOpen = !body.hidden;
      body.hidden = isOpen;
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  /* ── Mobile start button sync ── */
  function syncMobileStart() {
    const mobileBar = document.getElementById('lv2-mob-start-bar');
    const desktopStart = document.getElementById('btn-start');
    const mobileStart = document.getElementById('btn-start-mobile');
    if (!mobileStart || !desktopStart || !mobileBar) return;

    // Mirror visibility & disabled state
    const observer = new MutationObserver(() => {
      const visible = desktopStart.style.display !== 'none';
      mobileBar.style.display = visible ? 'block' : 'none';
      mobileStart.disabled = desktopStart.disabled;
      mobileStart.textContent = desktopStart.textContent;
    });

    observer.observe(desktopStart, { attributes: true, childList: true, characterData: true, subtree: true });

    mobileStart.addEventListener('click', () => {
      desktopStart.click();
    });
  }

  /* ── Hook into onRoomUpdate for extra V2 data ── */
  function patchRoomUpdate() {
    const originalOnRoomUpdate = typeof onRoomUpdate === 'function' ? onRoomUpdate : null;
    if (!originalOnRoomUpdate) return; // lobby.js not loaded yet, will retry

    // Wrap to also update V2 UI
    window._v2_roomUpdateHook = function (data) {
      if (!data) return;
      updateHostBadge(data.players || {});
      updatePlayerCount(data.players || {}, data.settings?.maxPlayers);
    };
  }

  /* ── Watch for room data changes via MutationObserver on player-list ── */
  function observePlayerList() {
    const playerList = document.getElementById('player-list');
    if (!playerList) return;

    const mo = new MutationObserver(() => {
      // Count rendered player items
      const items = playerList.querySelectorAll('.player-list-item');
      const el = document.getElementById('lv2-player-count');
      if (el) {
        const current = el.textContent.split('/');
        el.textContent = `${items.length}/${current[1] || 12}`;
      }
      // Update host badge by looking at badge-host element
      const hostItem = playerList.querySelector('.badge-host')?.closest('.player-list-item');
      const nameEl = document.getElementById('lv2-host-name');
      if (hostItem && nameEl) {
        const nameSpan = hostItem.querySelector('.player-list-name');
        if (nameSpan) {
          const fullText = nameSpan.textContent.replace(/\(أنت\).*/, '').replace(/⭐.*/, '').trim();
          nameEl.textContent = fullText;
        }
      }
    });

    mo.observe(playerList, { childList: true, subtree: true });
  }

  /* ── Override syncVisualModeButtons to also update lv2 theme ── */
  function patchSyncVisualMode() {
    if (typeof syncVisualModeButtons === 'function') {
      const orig = syncVisualModeButtons;
      window.syncVisualModeButtons = function (mode) {
        orig(mode);
        applyTheme(mode === 'clear' ? 'light' : 'dark');
      };
    }
  }

  /* ── Init ── */
  function init() {
    initStars();
    initTheme();
    initInvite();
    initMobileSettingsAccordion();
    syncMobileStart();
    observePlayerList();

    // Patch after lobby.js has run
    setTimeout(() => {
      patchSyncVisualMode();
      patchRoomUpdate();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
