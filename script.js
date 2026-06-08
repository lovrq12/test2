/* ============================================================
   NIGHTMARES HUB — Phase 1 UI interactions (static only)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Mobile drawer (menu) open / close ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var drawer = document.getElementById("drawer");
  var drawerClose = document.getElementById("drawerClose");

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);

  // Close when tapping the dark backdrop or a drawer link
  if (drawer) {
    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) closeDrawer();
    });
    drawer.querySelectorAll(".side-link").forEach(function (link) {
      link.addEventListener("click", closeDrawer);
    });
  }

  // Close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
  });

  /* ---------- Simple active-state feedback for nav links ---------- */
  function wireActive(selector) {
    var links = document.querySelectorAll(selector);
    links.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        links.forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
      });
    });
  }
  wireActive(".side-nav .side-link");
  wireActive(".top-nav .top-link");
  wireActive(".bottom-nav .bn-item");

  /* ---------- Lightweight tap feedback for glowing buttons ---------- */
  document.querySelectorAll(".glow-btn, .primary-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      // Phase 1: no real navigation, just prevent jump for placeholder links
      if (btn.getAttribute("href") === "#") e.preventDefault();
    });
  });
})();
