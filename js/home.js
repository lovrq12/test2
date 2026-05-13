// home.js — شاشة الدخول

(async () => {

  // ===== عناصر DOM =====
  const nameInput     = document.getElementById('player-name');
  const createBtn     = document.getElementById('btn-create');
  const joinCodeInput = document.getElementById('join-code');
  const joinBtn       = document.getElementById('btn-join');
  const errorEl       = document.getElementById('error-msg');
  const skinOptions   = document.querySelectorAll('.skin-option');

  let selectedSkin = 'skin1';

  // ===== اختيار السكن =====
  skinOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      skinOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedSkin = opt.dataset.skin;
    });
  });

  // ===== إعادة الاتصال — لو اللاعب عنده غرفة سابقة =====
  const local = loadLocalPlayer();
  if (local && local.roomCode && local.playerName) {
    try {
      const snap = await db.ref(`rooms/${local.roomCode}/meta/status`).get();
      if (snap.exists() && snap.val() !== ROOM_STATUS.FINISHED) {
        // غرفة لا تزال نشطة
        const snap2 = await db.ref(`rooms/${local.roomCode}/players/${local.playerId}`).get();
        if (snap2.exists()) {
          showToast('إعادة الاتصال بالغرفة السابقة...', 'info');
          const status = snap.val();
          if (status === ROOM_STATUS.PLAYING) {
            window.location.href = `game.html?room=${local.roomCode}`;
          } else {
            window.location.href = `lobby.html?room=${local.roomCode}`;
          }
          return;
        }
      }
    } catch (e) {
      clearLocalPlayer();
    }
  }

  hideLoading();

  // ===== إنشاء غرفة =====
  createBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) { showError('أدخل اسمك أولاً'); return; }
    if (name.length > 20) { showError('الاسم طويل جدًا (20 حرف كحد أقصى)'); return; }

    createBtn.disabled = true;
    createBtn.textContent = 'جارٍ الإنشاء...';
    clearError();

    try {
      const { code } = await Rooms.createRoom(name, selectedSkin);
      window.location.href = `lobby.html?room=${code}`;
    } catch (e) {
      showError('فشل إنشاء الغرفة، حاول مجددًا');
      console.error(e);
      createBtn.disabled = false;
      createBtn.textContent = 'إنشاء غرفة';
    }
  });

  // ===== الانضمام للغرفة =====
  joinBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const code = joinCodeInput.value.trim().toUpperCase();

    if (!name) { showError('أدخل اسمك أولاً'); return; }
    if (!code || code.length < 4) { showError('أدخل كود الغرفة'); return; }

    joinBtn.disabled = true;
    joinBtn.textContent = 'جارٍ الانضمام...';
    clearError();

    try {
      await Rooms.joinRoom(code, name, selectedSkin);
      window.location.href = `lobby.html?room=${code}`;
    } catch (e) {
      showError(e.message || 'فشل الانضمام');
      joinBtn.disabled = false;
      joinBtn.textContent = 'انضم';
    }
  });

  // ادخال كود بالضغط Enter
  joinCodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinBtn.click(); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') createBtn.click(); });

  function showError(msg) { errorEl.textContent = msg; errorEl.classList.add('show'); }
  function clearError()   { errorEl.classList.remove('show'); }

})();
