/* ============================================================
   NIGHTMARES HUB — Store Page Interactions
   store/js/store.js
   ─────────────────────────────────────────────────────────
   Rules:
   • Only handles store-specific UI (filters, active states)
   • Does NOT block any real navigation links
   • Does NOT add event.preventDefault() to real hrefs
   • No backend, no checkout, no real purchases
   ============================================================ */
(function () {
  "use strict";

  /* ── Render store cards from store-items.js data ── */
  function renderCards() {
    var grid = document.getElementById("storeGrid");
    if (!grid || typeof STORE_ITEMS === "undefined") return;

    grid.innerHTML = STORE_ITEMS.map(function (item) {
      return '<article class="store-card" data-category="' + item.category + '">' +
        '<div class="sc-icon-wrap sc-icon--' + item.iconColor + '">' +
          '<span class="sc-icon" aria-hidden="true">' + item.icon + '</span>' +
        '</div>' +
        '<div class="sc-body">' +
          '<span class="sc-badge">' + item.badge + '</span>' +
          '<h3 class="sc-title">' + item.title + '</h3>' +
          '<p class="sc-desc">' + item.description + '</p>' +
        '</div>' +
        '<button class="sc-btn" disabled aria-disabled="true">قريباً</button>' +
      '</article>';
    }).join("");
  }

  /* ── Category filter buttons ── */
  function initFilters() {
    var filterBar = document.getElementById("storeFilters");
    if (!filterBar) return;

    var buttons = filterBar.querySelectorAll(".sf-btn");
    var grid = document.getElementById("storeGrid");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        /* Update active state */
        buttons.forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");

        /* Filter cards */
        var filter = btn.getAttribute("data-filter");
        if (!grid) return;
        var cards = grid.querySelectorAll(".store-card");
        cards.forEach(function (card) {
          if (filter === "all" || card.getAttribute("data-category") === filter) {
            card.style.display = "";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }

  /* ── Mobile drawer (shared pattern from script.js — store page copy) ── */
  function initDrawer() {
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

    if (drawer) {
      drawer.addEventListener("click", function (e) {
        if (e.target === drawer) closeDrawer();
      });
      /* Close drawer on link click — but do NOT block navigation */
      drawer.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          closeDrawer();
          /* No preventDefault — let the browser navigate normally */
        });
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* ── Wire active state on nav (placeholder links only) ── */
  function wireNavActive(selector) {
    var links = document.querySelectorAll(selector);
    links.forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href");
        /* ONLY block placeholder "#" links — never block real hrefs */
        if (!href || href === "#") {
          e.preventDefault();
        }
        links.forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
      });
    });
  }

  /* ── Init ── */
  renderCards();
  initFilters();
  initDrawer();
  wireNavActive(".side-nav .side-link");
  wireNavActive(".top-nav .top-link");
  wireNavActive(".bottom-nav .bn-item");

})();
