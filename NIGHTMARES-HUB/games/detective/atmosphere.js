const DetectiveAtmosphere = (() => {
  const atmospherePresets = {
    thunderstorm: {
      label: "Thunder storm",
      css: {
        "--atmo-scene-image": "url(\"assets/reference/splash/home_splash_reference.png\")",
        "--atmo-root-gradient": "linear-gradient(180deg, rgba(1, 4, 13, 0.18), rgba(3, 5, 14, 0.88))",
        "--atmo-skyline-overlay": "linear-gradient(95deg, rgba(2, 5, 15, 0.70), rgba(19, 42, 76, 0.15) 48%, rgba(2, 4, 13, 0.78))",
        "--atmo-body-glow-a": "rgba(64, 94, 180, 0.38)",
        "--atmo-body-glow-b": "rgba(91, 202, 255, 0.24)",
        "--atmo-light-wash": "rgba(119, 191, 255, 0.11)",
        "--atmo-accent": "#79c8ff",
        "--atmo-accent-rgb": "121, 200, 255",
        "--atmo-ui-glow": "rgba(121, 200, 255, 0.24)",
        "--atmo-fog-opacity-a": "0.38",
        "--atmo-fog-opacity-b": "0.28",
        "--atmo-rain-opacity": "0.56",
        "--atmo-cloud-opacity": "0.36",
        "--atmo-canvas-opacity": "0.82",
        "--atmo-reflection-opacity": "0.44",
        "--atmo-vignette-opacity": "0.94",
        "--atmo-skyline-filter": "saturate(1.14) contrast(1.18) brightness(0.84)",
        "--atmo-skyline-scale": "1.065"
      }
    },
    "heavy-rain": {
      label: "Heavy rain",
      css: {
        "--atmo-scene-image": "url(\"assets/reference/backgrounds/game_table_reference.png\")",
        "--atmo-root-gradient": "linear-gradient(180deg, rgba(2, 7, 16, 0.20), rgba(3, 5, 12, 0.84))",
        "--atmo-skyline-overlay": "linear-gradient(94deg, rgba(3, 7, 16, 0.74), rgba(8, 32, 54, 0.14) 52%, rgba(3, 5, 14, 0.80))",
        "--atmo-body-glow-a": "rgba(72, 40, 160, 0.34)",
        "--atmo-body-glow-b": "rgba(25, 183, 255, 0.24)",
        "--atmo-light-wash": "rgba(67, 214, 255, 0.065)",
        "--atmo-accent": "#30d7ff",
        "--atmo-accent-rgb": "48, 215, 255",
        "--atmo-ui-glow": "rgba(48, 215, 255, 0.20)",
        "--atmo-fog-opacity-a": "0.34",
        "--atmo-fog-opacity-b": "0.25",
        "--atmo-rain-opacity": "0.48",
        "--atmo-cloud-opacity": "0.28",
        "--atmo-canvas-opacity": "0.76",
        "--atmo-reflection-opacity": "0.36",
        "--atmo-vignette-opacity": "0.90",
        "--atmo-skyline-filter": "saturate(1.06) contrast(1.08) brightness(0.88)",
        "--atmo-skyline-scale": "1.05"
      }
    },
    "foggy-night": {
      label: "Foggy night",
      css: {
        "--atmo-scene-image": "url(\"assets/reference/backgrounds/investigation_room_reference.png\")",
        "--atmo-root-gradient": "linear-gradient(180deg, rgba(8, 9, 18, 0.34), rgba(4, 6, 13, 0.90))",
        "--atmo-skyline-overlay": "linear-gradient(96deg, rgba(4, 6, 13, 0.82), rgba(58, 65, 87, 0.20) 50%, rgba(3, 4, 11, 0.86))",
        "--atmo-body-glow-a": "rgba(112, 120, 148, 0.28)",
        "--atmo-body-glow-b": "rgba(92, 152, 196, 0.16)",
        "--atmo-light-wash": "rgba(220, 232, 255, 0.055)",
        "--atmo-accent": "#a9c7dc",
        "--atmo-accent-rgb": "169, 199, 220",
        "--atmo-ui-glow": "rgba(169, 199, 220, 0.18)",
        "--atmo-fog-opacity-a": "0.66",
        "--atmo-fog-opacity-b": "0.52",
        "--atmo-rain-opacity": "0.18",
        "--atmo-cloud-opacity": "0.42",
        "--atmo-canvas-opacity": "0.58",
        "--atmo-reflection-opacity": "0.24",
        "--atmo-vignette-opacity": "0.96",
        "--atmo-skyline-filter": "saturate(0.72) contrast(1.02) brightness(0.80)",
        "--atmo-skyline-scale": "1.075"
      }
    },
    "meteor-shower": {
      label: "Meteor shower",
      css: {
        "--atmo-scene-image": "url(\"assets/reference/splash/home_splash_reference.png\")",
        "--atmo-root-gradient": "linear-gradient(180deg, rgba(21, 8, 15, 0.16), rgba(4, 5, 14, 0.88))",
        "--atmo-skyline-overlay": "linear-gradient(92deg, rgba(3, 5, 13, 0.76), rgba(98, 30, 42, 0.18) 50%, rgba(3, 4, 12, 0.82))",
        "--atmo-body-glow-a": "rgba(255, 92, 48, 0.24)",
        "--atmo-body-glow-b": "rgba(149, 73, 255, 0.22)",
        "--atmo-light-wash": "rgba(255, 126, 67, 0.08)",
        "--atmo-accent": "#ff8b55",
        "--atmo-accent-rgb": "255, 139, 85",
        "--atmo-ui-glow": "rgba(255, 139, 85, 0.22)",
        "--atmo-fog-opacity-a": "0.26",
        "--atmo-fog-opacity-b": "0.18",
        "--atmo-rain-opacity": "0.08",
        "--atmo-cloud-opacity": "0.22",
        "--atmo-canvas-opacity": "0.88",
        "--atmo-reflection-opacity": "0.30",
        "--atmo-vignette-opacity": "0.92",
        "--atmo-skyline-filter": "saturate(1.28) contrast(1.16) brightness(0.86) hue-rotate(-8deg)",
        "--atmo-skyline-scale": "1.055"
      }
    },
    "snowy-city": {
      label: "Snowy city",
      css: {
        "--atmo-scene-image": "url(\"assets/reference/backgrounds/investigation_room_reference.png\")",
        "--atmo-root-gradient": "linear-gradient(180deg, rgba(10, 16, 26, 0.22), rgba(4, 6, 13, 0.86))",
        "--atmo-skyline-overlay": "linear-gradient(94deg, rgba(4, 7, 14, 0.70), rgba(142, 171, 198, 0.18) 48%, rgba(4, 6, 14, 0.78))",
        "--atmo-body-glow-a": "rgba(164, 194, 228, 0.26)",
        "--atmo-body-glow-b": "rgba(101, 133, 176, 0.22)",
        "--atmo-light-wash": "rgba(236, 246, 255, 0.075)",
        "--atmo-accent": "#d8efff",
        "--atmo-accent-rgb": "216, 239, 255",
        "--atmo-ui-glow": "rgba(216, 239, 255, 0.18)",
        "--atmo-fog-opacity-a": "0.42",
        "--atmo-fog-opacity-b": "0.34",
        "--atmo-rain-opacity": "0.10",
        "--atmo-cloud-opacity": "0.34",
        "--atmo-canvas-opacity": "0.80",
        "--atmo-reflection-opacity": "0.22",
        "--atmo-vignette-opacity": "0.88",
        "--atmo-skyline-filter": "saturate(0.62) contrast(1.04) brightness(1.02)",
        "--atmo-skyline-scale": "1.045"
      }
    },
    "neon-cyber-night": {
      label: "Neon cyber night",
      css: {
        "--atmo-scene-image": "url(\"assets/reference/backgrounds/game_table_reference.png\")",
        "--atmo-root-gradient": "linear-gradient(180deg, rgba(2, 8, 18, 0.18), rgba(2, 4, 13, 0.84))",
        "--atmo-skyline-overlay": "linear-gradient(96deg, rgba(2, 3, 12, 0.72), rgba(41, 18, 84, 0.18) 48%, rgba(2, 4, 12, 0.76))",
        "--atmo-body-glow-a": "rgba(126, 57, 255, 0.34)",
        "--atmo-body-glow-b": "rgba(27, 230, 255, 0.28)",
        "--atmo-light-wash": "rgba(82, 220, 255, 0.10)",
        "--atmo-accent": "#52ecff",
        "--atmo-accent-rgb": "82, 236, 255",
        "--atmo-ui-glow": "rgba(82, 236, 255, 0.26)",
        "--atmo-fog-opacity-a": "0.30",
        "--atmo-fog-opacity-b": "0.20",
        "--atmo-rain-opacity": "0.22",
        "--atmo-cloud-opacity": "0.26",
        "--atmo-canvas-opacity": "0.86",
        "--atmo-reflection-opacity": "0.48",
        "--atmo-vignette-opacity": "0.88",
        "--atmo-skyline-filter": "saturate(1.52) contrast(1.12) brightness(0.94) hue-rotate(8deg)",
        "--atmo-skyline-scale": "1.06"
      }
    }
  };

  const atmospheres = Object.keys(atmospherePresets);

  const labels = Object.fromEntries(atmospheres.map(name => [name, atmospherePresets[name].label]));

  const particleProfiles = {
    thunderstorm: { count: 110, color: "rgba(138, 205, 255, 0.72)", speed: 21, drift: -7, length: 26, width: 1.25, type: "rain" },
    "heavy-rain": { count: 130, color: "rgba(116, 190, 255, 0.62)", speed: 18, drift: -5, length: 22, width: 1.1, type: "rain" },
    "foggy-night": { count: 42, color: "rgba(166, 192, 210, 0.20)", speed: 0.9, drift: 1.2, length: 64, width: 12, type: "fog" },
    "meteor-shower": { count: 38, color: "rgba(255, 150, 92, 0.78)", speed: 13, drift: -18, length: 48, width: 1.8, type: "meteor" },
    "snowy-city": { count: 78, color: "rgba(232, 244, 255, 0.78)", speed: 2.4, drift: 1.8, length: 2.8, width: 2.8, type: "snow" },
    "neon-cyber-night": { count: 74, color: "rgba(62, 213, 255, 0.52)", speed: 3.4, drift: 2.4, length: 11, width: 1.2, type: "spark" }
  };

  let canvas;
  let context;
  let currentIndex = 0;
  let currentAtmosphere = "heavy-rain";
  let particles = [];
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let changeTimer = 0;
  let reducedMotion = false;

  function init() {
    canvas = document.getElementById("atmosphere-canvas");
    context = canvas?.getContext?.("2d");
    reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;

    currentAtmosphere = normalizeAtmosphere(document.body?.dataset.atmosphere) || atmospheres[0];
    currentIndex = Math.max(0, atmospheres.indexOf(currentAtmosphere));
    applyPreset(currentAtmosphere);

    if (context) {
      resize();
      window.addEventListener("resize", resize, { passive: true });
      buildParticles();

      if (!reducedMotion) {
        animate();
        changeTimer = window.setInterval(next, 120000);
      } else {
        drawStatic();
      }
    }

    wireSoundReadyHooks();
    updateLabel();
  }

  function set(atmosphere) {
    const normalizedAtmosphere = normalizeAtmosphere(atmosphere);

    if (!normalizedAtmosphere) {
      console.warn(`Unknown atmosphere preset: ${atmosphere}`);
      return;
    }

    currentAtmosphere = normalizedAtmosphere;
    currentIndex = atmospheres.indexOf(normalizedAtmosphere);
    rememberPreviousScene();
    applyPreset(normalizedAtmosphere);
    buildParticles();
    pulseTransition();
    updateLabel();
    window.DetectiveAudioHooks?.atmosphereChange?.(normalizedAtmosphere);
  }

  function next() {
    set(atmospheres[(currentIndex + 1) % atmospheres.length]);
  }

  function syncScreen(screenName) {
    document.body.dataset.screen = screenName;
  }

  function normalizeAtmosphere(atmosphere) {
    return atmospheres.includes(atmosphere) ? atmosphere : "";
  }

  function applyPreset(atmosphere) {
    const preset = atmospherePresets[atmosphere];

    if (!preset || !document.body) {
      return;
    }

    document.body.dataset.atmosphere = atmosphere;
    Object.entries(preset.css).forEach(([property, value]) => {
      document.body.style.setProperty(property, value);
    });
  }

  function rememberPreviousScene() {
    if (!document.body) {
      return;
    }

    const styles = window.getComputedStyle(document.body);
    const currentScene = styles.getPropertyValue("--atmo-scene-image").trim();
    const currentOverlay = styles.getPropertyValue("--atmo-skyline-overlay").trim();

    if (currentScene) {
      document.body.style.setProperty("--atmo-previous-scene-image", currentScene);
    }

    if (currentOverlay) {
      document.body.style.setProperty("--atmo-previous-skyline-overlay", currentOverlay);
    }
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildParticles();
  }

  function buildParticles() {
    if (!context) {
      return;
    }

    const profile = particleProfiles[currentAtmosphere] || particleProfiles["heavy-rain"];
    const density = Math.max(0.62, Math.min(1.18, (width * height) / 980000));
    const count = Math.round(profile.count * density);

    particles = Array.from({ length: count }, () => makeParticle(profile, true));
  }

  function makeParticle(profile, scatter) {
    const baseSize = profile.width + Math.random() * profile.width * 1.9;

    return {
      x: Math.random() * width,
      y: scatter ? Math.random() * height : -40 - Math.random() * height * 0.22,
      vx: profile.drift + (Math.random() - 0.5) * Math.abs(profile.drift || 1.4),
      vy: profile.speed * (0.7 + Math.random() * 0.65),
      size: baseSize,
      length: profile.length * (0.58 + Math.random() * 0.9),
      alpha: 0.46 + Math.random() * 0.42
    };
  }

  function animate() {
    drawFrame();
    animationFrame = window.requestAnimationFrame(animate);
  }

  function drawStatic() {
    drawFrame();
  }

  function drawFrame() {
    const profile = particleProfiles[currentAtmosphere] || particleProfiles["heavy-rain"];
    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = profile.type === "meteor" ? "lighter" : "source-over";

    particles.forEach(particle => {
      drawParticle(particle, profile);

      if (!reducedMotion) {
        particle.x += particle.vx;
        particle.y += particle.vy;
      }

      if (particle.y > height + 80 || particle.x < -140 || particle.x > width + 140) {
        Object.assign(particle, makeParticle(profile, false));
      }
    });

    context.restore();
  }

  function drawParticle(particle, profile) {
    context.globalAlpha = particle.alpha;
    context.strokeStyle = profile.color;
    context.fillStyle = profile.color;
    context.lineWidth = particle.size;
    context.lineCap = "round";

    if (profile.type === "snow") {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
      return;
    }

    if (profile.type === "fog") {
      const gradient = context.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.length
      );
      gradient.addColorStop(0, profile.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.length, 0, Math.PI * 2);
      context.fill();
      return;
    }

    context.beginPath();
    context.moveTo(particle.x, particle.y);
    context.lineTo(particle.x - particle.vx * 0.62, particle.y + particle.length);
    context.stroke();
  }

  function pulseTransition() {
    const root = document.getElementById("atmosphere-root");

    if (!root) {
      return;
    }

    root.classList.remove("is-transitioning");
    void root.offsetWidth;
    root.classList.add("is-transitioning");
  }

  function updateLabel() {
    const root = document.getElementById("atmosphere-root");

    if (root) {
      root.dataset.atmosphereLabel = labels[currentAtmosphere] || labels["heavy-rain"];
    }
  }

  function wireSoundReadyHooks() {
    window.DetectiveAudioHooks = {
      hover() {},
      click() {},
      transition() {},
      atmosphereChange() {},
      ...(window.DetectiveAudioHooks || {})
    };

    document.addEventListener("pointerenter", event => {
      if (event.target.closest("button, .tool-card, .player-detail-button")) {
        window.DetectiveAudioHooks.hover();
      }
    }, true);

    document.addEventListener("click", event => {
      if (event.target.closest("button, select, input, textarea, .tool-card")) {
        window.DetectiveAudioHooks.click();
      }
    }, true);
  }

  function destroy() {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
    }

    if (changeTimer) {
      window.clearInterval(changeTimer);
    }
  }

  return {
    init,
    set,
    next,
    syncScreen,
    destroy,
    atmospheres: [...atmospheres]
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  DetectiveAtmosphere.init();
});
