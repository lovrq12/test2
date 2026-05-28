(() => {
  const rules = {
    nightmares: {
      title: "لعبة المافيا",
      html: "<p>يُوزّع المضيف أدواراً سرية بين المافيا والمواطنين. يعمل أصحاب الأدوار ليلاً، ثم يناقش الجميع ويصوّتون نهاراً.</p><ul><li>هدف المواطنين: كشف المافيا قبل السيطرة على المدينة.</li><li>هدف المافيا: إقصاء المواطنين دون انكشاف.</li><li>يمكن للمضيف تفعيل أدوار خاصة قبل بدء الجولة.</li></ul>"
    },
    detective: {
      title: "لعبة التحقيق",
      html: "<p>قضية جماعية يقودها الطبيب الشرعي بتلميحات، بينما يخفي القاتل أداتي الجريمة ويحاول الشريك تضليل الفريق.</p><ul><li>راقب أدوات اللاعبين واربطها بالتلميحات.</li><li>يناقش المحققون القضية قبل الاتهام النهائي.</li><li>يكشف الاتهام الصحيح القاتل وينهي القضية.</li></ul>"
    }
  };
  const joinModal = document.getElementById("join-modal");
  const rulesModal = document.getElementById("rules-modal");
  const joinForm = document.getElementById("portal-join-form");
  const codeInput = document.getElementById("portal-room-code");
  const errorText = document.getElementById("portal-join-error");

  function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModals() {
    joinModal.hidden = true;
    rulesModal.hidden = true;
    document.body.style.overflow = "";
    errorText.textContent = "";
  }

  document.querySelectorAll("[data-open-join]").forEach(button => {
    button.addEventListener("click", () => {
      const preferredGame = button.dataset.openJoin;
      if (preferredGame) {
        const radio = joinForm.querySelector(`input[value="${preferredGame}"]`);
        if (radio) radio.checked = true;
      }
      openModal(joinModal);
      codeInput.focus();
    });
  });

  document.querySelectorAll("[data-rules]").forEach(button => {
    button.addEventListener("click", () => {
      const content = rules[button.dataset.rules];
      document.getElementById("rules-title").textContent = content.title;
      document.getElementById("rules-content").innerHTML = content.html;
      openModal(rulesModal);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", closeModals);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModals();
  });

  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/\s+/g, "");
    errorText.textContent = "";
  });

  joinForm.addEventListener("submit", event => {
    event.preventDefault();
    const gameType = new FormData(joinForm).get("gameType");
    const code = codeInput.value.trim().toUpperCase();
    const isNightmaresCode = code.length === 5;
    const isDetectiveCode = code.length === 4 || (code.length === 5 && code.startsWith("D"));

    if ((gameType === "nightmares" && !isNightmaresCode) ||
        (gameType === "detective" && !isDetectiveCode)) {
      errorText.textContent = gameType === "nightmares"
        ? "كود لعبة المافيا يتكون من 5 رموز."
        : "كود التحقيق الجديد يبدأ بـ D ويتكون من 5 رموز، وتُقبل الأكواد القديمة من 4 رموز.";
      return;
    }

    window.location.href = `games/${gameType}/index.html?mode=join&code=${encodeURIComponent(code)}`;
  });

  function spawnParticles() {
    const layer = document.getElementById("particles");
    for (let index = 0; index < 18; index += 1) {
      const particle = document.createElement("span");
      particle.className = "crystal-particle";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.setProperty("--size", `${3 + Math.random() * 7}px`);
      particle.style.setProperty("--duration", `${12 + Math.random() * 15}s`);
      particle.style.setProperty("--delay", `${-Math.random() * 24}s`);
      layer.appendChild(particle);
    }
  }

  spawnParticles();
  window.lucide?.createIcons();
})();
