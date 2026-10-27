/* =========================================================
   Windows Phone / Lumia motion behaviour

   The Continuum transition: when you tap a tile, that tile flies
   forward toward you while every other tile hinges away on its left
   edge and the chrome swivels down. The page only navigates once the
   tile has filled the screen — so the new page feels like it grew
   out of the thing you touched.
   ========================================================= */
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. feathered entrance ---------- */
  const groups = [
    document.querySelectorAll(".menu-card"),
    document.querySelectorAll(".week"),
    document.querySelectorAll(".pre-facts > div"),
    document.querySelectorAll(".stack-list li"),
  ];

  groups.forEach((group) => {
    group.forEach((el, i) => {
      el.setAttribute("data-enter", "");
      el.style.setProperty("--i", i);
    });
  });

  [".board-head", ".pre-topbar", ".topbar", ".pre-hero", ".chart-wrap", ".pre-cta"].forEach(
    (sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.setAttribute("data-enter", "");
      }
    }
  );

  /* ---------- 2. press tilt ---------- */
  if (!reduced) {
    document.querySelectorAll(".menu-card").forEach((card) => {
      card.addEventListener("pointerdown", (event) => {
        const r = card.getBoundingClientRect();
        const edges = {
          left: (event.clientX - r.left) / r.width,
          right: 1 - (event.clientX - r.left) / r.width,
          top: (event.clientY - r.top) / r.height,
          bottom: 1 - (event.clientY - r.top) / r.height,
        };
        const nearest = Object.keys(edges).reduce((a, b) =>
          edges[a] < edges[b] ? a : b
        );
        // only pivot when the press is genuinely near an edge
        card.setAttribute("data-press", edges[nearest] < 0.3 ? nearest : "");
      });

      ["pointerup", "pointercancel", "pointerleave"].forEach((evt) =>
        card.addEventListener(evt, () => card.removeAttribute("data-press"))
      );
    });
  }

  /* ---------- 3. Continuum exit ---------- */
  const HERO_MS = 400; // the chosen tile's flight
  const PLAIN_MS = 250; // a plain swivel-out

  // Everything on the page that should leave, split into the tile you
  // chose, its sibling tiles, and the surrounding chrome.
  function cast(hero) {
    const tiles = [...document.querySelectorAll(".menu-card")];
    const chrome = [
      ".topbar",
      ".board-head",
      ".pre-topbar",
      ".footer-note",
      ".pre-hero",
      ".stack-row",
      ".weeks",
      ".pre-cta",
      ".chart-wrap",
    ]
      .map((s) => document.querySelector(s))
      .filter((el) => el && el !== hero && !el.contains(hero));

    return { tiles: tiles.filter((t) => t !== hero), chrome };
  }

  function leave(url, hero) {
    if (reduced) {
      window.location.href = url;
      return;
    }

    document.body.classList.add("wp-leaving");
    const { tiles, chrome } = cast(hero);

    if (hero) {
      hero.classList.add("wp-continuum-hero");
    }

    // Siblings turnstile away, each a beat after the last — the
    // "feather" the toolkit applies to lists.
    tiles.forEach((tile, i) => {
      tile.style.setProperty("--j", i);
      tile.classList.add("wp-turnstile-out");
    });

    chrome.forEach((el) => el.classList.add("wp-swivel-out"));

    // Navigate when the longest animation has finished.
    const wait = hero ? HERO_MS : PLAIN_MS;
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        window.location.href = url;
      }
    };
    setTimeout(go, wait);
  }

  // Page scripts (the menu cards) use the same exit.
  window.metroLeave = leave;

  /* ---------- 4. intercept in-site links ---------- */
  document.querySelectorAll('a[href$=".html"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0 ||
        link.target === "_blank"
      ) {
        return;
      }
      event.preventDefault();
      // a link is not a tile, so there is no hero to fly forward
      leave(link.getAttribute("href"), null);
    });
  });

  /* ---------- 5. restore after a back-button return ---------- */
  // The browser may serve a cached page frozen mid-exit.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      document.body.classList.remove("wp-leaving");
      document
        .querySelectorAll(".wp-continuum-hero, .wp-turnstile-out, .wp-swivel-out")
        .forEach((el) => {
          el.classList.remove(
            "wp-continuum-hero",
            "wp-turnstile-out",
            "wp-swivel-out"
          );
        });
    }
  });
})();
