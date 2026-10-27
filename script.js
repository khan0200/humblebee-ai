// Each card opens its own page, with the Continuum transition.
const pages = {
  pipeline: "pipeline.html",
  preparation: "pre.html",
  marketing: "marketing.html",
  bpoint: "bpoint.html",
};

document.querySelectorAll("[data-panel]").forEach((card) => {
  card.addEventListener("click", () => {
    const url = pages[card.dataset.panel];
    if (!url) {
      return;
    }
    // the clicked card is the hero that flies forward
    if (window.metroLeave) {
      window.metroLeave(url, card);
    } else {
      window.location.href = url;
    }
  });
});
