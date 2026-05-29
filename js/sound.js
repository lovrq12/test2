// ===== NIGHTMARES — SOUND MODULE =====

const Sound = (() => {
  let enabled = localStorage.getItem('nm_sound') !== 'false';
  let audioCtx = null;
  let rainNode = null;
  let windNode = null;
  let started = false;
  let nightAmbienceAudio = null;
  let nightAmbienceWanted = false;
  let nightAmbienceFade = null;
  let nightAmbienceNoticeShown = false;

  const NIGHT_AMBIENCE_SRC = 'assets/audio/night_ambience.mp3';
  const NIGHT_AMBIENCE_MAX_VOLUME = 0.16;

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function resume() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Create noise buffer
  function createNoiseBuffer(ctx, duration = 2) {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * duration, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    return buf;
  }

  function startRain() {
    if (!enabled || !started) return;
    stopRain();
    try {
      const ctx = getCtx();
      const buf = createNoiseBuffer(ctx, 3);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 4000;
      filter.Q.value = 0.3;

      const gain = ctx.createGain();
      gain.gain.value = 0.08;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      rainNode = { src, gain };
    } catch(e) {}
  }

  function stopRain() {
    if (rainNode) {
      try { rainNode.src.stop(); } catch(e) {}
      rainNode = null;
    }
  }

  function startWind() {
    if (!enabled || !started) return;
    stopWind();
    try {
      const ctx = getCtx();
      const buf = createNoiseBuffer(ctx, 4);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      const gain = ctx.createGain();
      gain.gain.value = 0.04;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      windNode = { src, gain };
    } catch(e) {}
  }

  function stopWind() {
    if (windNode) {
      try { windNode.src.stop(); } catch(e) {}
      windNode = null;
    }
  }

  function playThunder() {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const buf = createNoiseBuffer(ctx, 2.5);
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch(e) {}
  }

  function playHeartbeat() {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const playBeat = (time) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 80;
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
      };
      const now = ctx.currentTime;
      playBeat(now);
      playBeat(now + 0.25);
    } catch(e) {}
  }

  function playVoteClick() {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  }

  function playCrystalCrack() {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const buf = createNoiseBuffer(ctx, 0.8);
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 5000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch(e) {}
  }

  function playDeathHit() {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch(e) {}
  }

  function playWhisper() {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const buf = createNoiseBuffer(ctx, 1.5);
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 1.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch(e) {}
  }

  function playAbility() {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      [600, 800, 1000, 1200].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.15);
      });
    } catch(e) {}
  }

  function init() {
    // Initialize on first user interaction
    document.addEventListener('click', () => {
      if (!started) {
        started = true;
        try { getCtx(); } catch(e) {}
        if (enabled && isNightPhaseActive()) startNightAmbience();
      }
    }, { once: false });
  }

  function isNightPhaseActive() {
    return document.body?.classList?.contains('night-phase')
      || document.getElementById('game-bg')?.classList?.contains('night');
  }

  function ensureNightAmbienceAudio() {
    if (nightAmbienceAudio) return nightAmbienceAudio;

    nightAmbienceAudio = new Audio(NIGHT_AMBIENCE_SRC);
    nightAmbienceAudio.loop = true;
    nightAmbienceAudio.preload = 'auto';
    nightAmbienceAudio.volume = 0;
    return nightAmbienceAudio;
  }

  function showNightAmbienceNotice() {
    if (!nightAmbienceWanted || !isNightPhaseActive() || nightAmbienceNoticeShown || typeof showToast !== 'function') return;
    showToast('اضغط تشغيل الصوت لتفعيل أجواء الليل', 'info', 5000);
    nightAmbienceNoticeShown = true;
  }

  function fadeNightAmbience(target, onDone) {
    const audio = ensureNightAmbienceAudio();
    if (nightAmbienceFade) clearInterval(nightAmbienceFade);

    const clampedTarget = Math.max(0, Math.min(NIGHT_AMBIENCE_MAX_VOLUME, target));
    const startVol = audio.volume || 0;
    const startedAt = Date.now();
    const duration = 1800;

    nightAmbienceFade = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / duration);
      const next = startVol + (clampedTarget - startVol) * t;
      audio.volume = Math.max(0, Math.min(NIGHT_AMBIENCE_MAX_VOLUME, next));

      if (t >= 1) {
        clearInterval(nightAmbienceFade);
        nightAmbienceFade = null;
        if (onDone) onDone();
      }
    }, 80);
  }

  function playNightAmbience() {
    if (!enabled || !started || !nightAmbienceWanted || !isNightPhaseActive()) return;

    try {
      const audio = ensureNightAmbienceAudio();
      audio.loop = true;

      const fadeIn = () => {
        if (!enabled || !nightAmbienceWanted || !isNightPhaseActive()) {
          audio.volume = 0;
          audio.pause();
          return;
        }
        nightAmbienceNoticeShown = false;
        fadeNightAmbience(NIGHT_AMBIENCE_MAX_VOLUME);
      };

      if (!audio.paused) {
        fadeIn();
        return;
      }

      const playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.then === 'function') {
        playAttempt.then(fadeIn).catch(() => {
          showNightAmbienceNotice();
        });
      } else {
        fadeIn();
      }
    } catch(e) {}
  }

  function startNightAmbience() {
    nightAmbienceWanted = true;
    if (!enabled) return;
    if (!started) {
      showNightAmbienceNotice();
      return;
    }
    playNightAmbience();
  }

  function stopNightAmbience(immediate = false) {
    nightAmbienceWanted = false;
    nightAmbienceNoticeShown = false;
    if (!nightAmbienceAudio) return;

    const pause = () => {
      try { nightAmbienceAudio.pause(); } catch(e) {}
    };

    if (immediate) {
      if (nightAmbienceFade) clearInterval(nightAmbienceFade);
      nightAmbienceFade = null;
      try { nightAmbienceAudio.volume = 0; } catch(e) {}
      pause();
    } else {
      fadeNightAmbience(0, pause);
    }
  }

  function toggle() {
    if (enabled && nightAmbienceNoticeShown && isNightPhaseActive()) {
      playNightAmbience();
      updateSoundBtn();
      return enabled;
    }

    enabled = !enabled;
    localStorage.setItem('nm_sound', enabled ? 'true' : 'false');
    if (!enabled) {
      stopRain();
      stopWind();
      stopNightAmbience(true);
    } else if (isNightPhaseActive()) {
      startNightAmbience();
    }
    updateSoundBtn();
    return enabled;
  }

  function updateSoundBtn() {
    const btn = document.getElementById('sound-btn');
    if (btn) btn.textContent = enabled ? '🔊' : '🔇';
  }

  function isEnabled() { return enabled; }

  init();

  return {
    startRain, stopRain, startWind, stopWind,
    startNightAmbience, stopNightAmbience,
    playThunder, playHeartbeat, playVoteClick,
    playCrystalCrack, playDeathHit, playWhisper, playAbility,
    toggle, isEnabled, updateSoundBtn, resume,
    setStarted: () => {
      started = true;
      if (enabled && isNightPhaseActive()) startNightAmbience();
    }
  };
})();
