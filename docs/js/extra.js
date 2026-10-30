// External links open in a new tab and get an arrow icon (see extra.css).
// Adapted from the FastAPI documentation (https://github.com/fastapi/fastapi, MIT).
// Unlike FastAPI, links inside this site keep opening in the same tab.
function markExternalLinks() {
  const siteOrigin = window.location.origin;
  document.querySelectorAll(".md-content a[href]").forEach((a) => {
    if (a.classList.contains("md-content__button")) return;
    let url;
    try {
      url = new URL(a.getAttribute("href"), window.location.href);
    } catch (_) {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || url.origin === siteOrigin) return;
    a.dataset.externalLink = "";
    if (!a.hasAttribute("target")) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
  });
}

// Material's instant navigation swaps pages without a reload, so run on every page change.
document$.subscribe(() => {
  markExternalLinks();
});
