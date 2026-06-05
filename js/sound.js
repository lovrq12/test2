// ===== NIGHTMARES - SOUND MODULE =====

const Sound = (() => {
  let enabled = localStorage.getItem('nm_sound') !== 'false';
  let audioCtx = null;
  let started = false;

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

  function createNoiseBuffer(ctx, duration = 1) {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function playTone(freqStart, freqEnd, duration, volume = 0.25, type = 'sine') {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ctx.currentTime + duration);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function playNoise(duration, filterType, frequency, volume) {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = createNoiseBuffer(ctx, duration);
      filter.type = filterType;
      filter.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function playHeartbeat() {
    if (!enabled || !started) return;
    try {
      const ctx = getCtx();
      const beat = (time) => {
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
      beat(now);
      beat(now + 0.25);
    } catch (e) {}
  }

  function playVoteClick() {
    playTone(800, 400, 0.1, 0.3);
  }

  function playCrystalCrack() {
    playNoise(0.8, 'highpass', 5000, 0.5);
  }

  function playDeathHit() {
    playTone(200, 40, 0.7, 0.5, 'sawtooth');
  }

  function playWhisper() {
    playNoise(1.5, 'bandpass', 3000, 0.15);
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
    } catch (e) {}
  }

  function toggle() {
    enabled = !enabled;
    localStorage.setItem('nm_sound', enabled ? 'true' : 'false');
    updateSoundBtn();
    return enabled;
  }

  function updateSoundBtn() {
    const btn = document.getElementById('sound-btn');
    if (btn) btn.textContent = enabled ? '🔊' : '🔇';
  }

  function isEnabled() {
    return enabled;
  }

  document.addEventListener('click', () => {
    if (!started) {
      started = true;
      try { getCtx(); } catch (e) {}
    }
  }, { once: false });

  return {
    playHeartbeat,
    playVoteClick,
    playCrystalCrack,
    playDeathHit,
    playWhisper,
    playAbility,
    toggle,
    isEnabled,
    updateSoundBtn,
    resume,
    setStarted: () => {
      started = true;
    },
  };
})();
