// Theme picker with a split-wipe theme change, modelled on the theme switcher at
// https://omarchy.org (its behaviour and look; this code is written for this site).
//
// The themes are Material palette options (mkdocs.yml), so Material stores the choice
// and restores it on every page. The picker selects the option inside a view
// transition; theme-picker.css draws the wipe.
(function () {
  const NAMES = {
    "astral-dark": "uv Dark",
    "astral-light": "uv Light",
    "catppuccin": "Catppuccin",
    "catppuccin-latte": "Catppuccin Latte",
    "ethereal": "Ethereal",
    "everforest": "Everforest",
    "flexoki-light": "Flexoki Light",
    "gruvbox": "Gruvbox",
    "hackerman": "Hackerman",
    "kanagawa": "Kanagawa",
    "last-horizon": "Last Horizon",
    "lumon": "Lumon",
    "lupine": "Lupine",
    "matte-black": "Matte Black",
    "miasma": "Miasma",
    "nord": "Nord",
    "osaka-jade": "Osaka Jade",
    "retro-82": "Retro 82",
    "ristretto": "Ristretto",
    "rose-pine": "Rosé Pine",
    "solitude": "Solitude",
    "tokyo-night": "Tokyo Night",
    "vantablack": "Vantablack",
    "white": "White",
  };
  const AUTO = "(prefers-color-scheme)";
  const ICON_PALETTE = '<svg viewBox="0 0 24 24"><path d="M17.5 12a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 9a1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1-1.5 1.5m-3-4A1.5 1.5 0 0 1 13 6.5 1.5 1.5 0 0 1 14.5 5 1.5 1.5 0 0 1 16 6.5 1.5 1.5 0 0 1 14.5 8m-5 0A1.5 1.5 0 0 1 8 6.5 1.5 1.5 0 0 1 9.5 5 1.5 1.5 0 0 1 11 6.5 1.5 1.5 0 0 1 9.5 8m-3 4A1.5 1.5 0 0 1 5 10.5 1.5 1.5 0 0 1 6.5 9 1.5 1.5 0 0 1 8 10.5 1.5 1.5 0 0 1 6.5 12M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1-.23-.27-.38-.62-.38-1a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8"/></svg>';
  const ICON_LEFT = '<svg viewBox="0 0 24 24"><path d="M15.41 16.58 10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>';
  const ICON_RIGHT = '<svg viewBox="0 0 24 24"><path d="M8.59 16.58 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';

  let themes = [];
  let index = 0;
  let dialog = null;
  let dimmer = null;
  let returnFocus = null;
  const swipe = { id: -1, from: 0, moved: 0 };

  function paletteInputs() {
    return Array.from(document.querySelectorAll('form[data-md-component="palette"] input'));
  }

  function systemScheme() {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "astral-dark" : "astral-light";
  }

  // Auto first, then uv Dark and uv Light, then the rest by name.
  function readThemes() {
    const list = paletteInputs().map((input) => {
      const media = input.getAttribute("data-md-color-media");
      const scheme = input.getAttribute("data-md-color-scheme");
      if (media === AUTO) return { input, key: "auto", name: "Auto (system)", rank: 0 };
      if (media.startsWith(AUTO.slice(0, -1))) return null;
      return { input, key: scheme, scheme, name: NAMES[scheme] || scheme, rank: scheme.startsWith("astral") ? 1 : 2 };
    }).filter(Boolean);
    const lightDark = paletteInputs().filter((i) => i.getAttribute("data-md-color-media").startsWith(AUTO.slice(0, -1)));
    lightDark.forEach((input) => {
      const scheme = input.getAttribute("data-md-color-scheme");
      list.push({ input, key: scheme, scheme, name: NAMES[scheme] || scheme, rank: 1 });
    });
    return list.sort((a, b) => a.rank - b.rank || (a.rank === 1 ? (a.scheme === "astral-dark" ? -1 : 1) : a.name.localeCompare(b.name)));
  }

  function currentKey() {
    const body = document.body;
    if (body.getAttribute("data-md-color-media") === AUTO) return "auto";
    return body.getAttribute("data-md-color-scheme");
  }

  function mockScheme(theme) {
    return theme.key === "auto" ? systemScheme() : theme.scheme;
  }

  function mock(scheme) {
    return (
      `<div class="tp-mock" data-md-color-scheme="${scheme}">` +
      '<div class="tp-mock__bar"><span class="tp-mock__logo"></span>Docs<span class="tp-mock__search"></span></div>' +
      '<div class="tp-mock__tabs"><span></span><span class="on"></span><span></span></div>' +
      '<div class="tp-mock__body">' +
      '<div class="tp-mock__nav"><div class="tp-line"></div><div class="tp-line accent"></div><div class="tp-line"></div><div class="tp-line"></div><div class="tp-line"></div></div>' +
      '<div class="tp-mock__main"><div class="tp-title">Monthly routine</div>' +
      '<div class="tp-line"></div><div class="tp-line" style="width:70%"></div>' +
      '<div class="tp-code"><div><span class="kw"></span><span class="fn"></span><span class="st"></span></div><div><span class="tx"></span><span class="nm"></span><span class="fn"></span></div></div>' +
      '<div class="tp-adm"><div class="tp-line"></div></div>' +
      '<div class="tp-btn"></div>' +
      "</div></div></div>"
    );
  }

  function step(delta) {
    index = (index + delta + themes.length) % themes.length;
    render();
  }

  function render() {
    const deck = dialog.querySelector(".tp-deck");
    deck.querySelectorAll(".tp-slot").forEach((slot) => slot.remove());
    const half = themes.length / 2;
    themes.forEach((theme, i) => {
      let offset = i - index;
      if (offset > half) offset -= themes.length;
      if (offset < -half) offset += themes.length;
      const depth = Math.abs(offset);
      if (depth > 2) return;
      // Neighbours tuck in behind the front card; the extra 6% makes up for the
      // front card being full size while the side cards are scaled to 0.88.
      const shift = offset === 0 ? 0 : Math.sign(offset) * (6 + depth * 12);
      const slot = document.createElement("div");
      slot.className = "tp-slot" + (offset === 0 ? " tp-front" : "");
      slot.style.transform = `translateX(${shift}%) scale(${offset === 0 ? 1 : 0.88})`;
      slot.style.zIndex = String(10 - depth);
      slot.innerHTML =
        `<button type="button" class="tp-card" tabindex="-1" aria-label="${offset === 0 ? "Use" : "Show"} ${theme.name}">` +
        `<div class="tp-frame" data-md-color-scheme="${mockScheme(theme)}"><div class="tp-inner">${mock(mockScheme(theme))}</div></div></button>`;
      slot.querySelector("button").addEventListener("click", () => (offset === 0 ? choose() : step(offset)));
      deck.insertBefore(slot, deck.querySelector(".tp-spacer"));
    });
    const name = dialog.querySelector(".tp-name");
    name.textContent = themes[index].name;
    name.setAttribute("data-md-color-scheme", mockScheme(themes[index]));
    name.setAttribute("aria-label", `Use ${themes[index].name}`);
  }

  function open() {
    if (dialog) return;
    themes = readThemes();
    if (!themes.length) return;
    const at = themes.findIndex((t) => t.key === currentKey());
    index = at >= 0 ? at : 0;
    returnFocus = document.activeElement;

    dimmer = document.createElement("div");
    dimmer.className = "tp-dimmer";
    dimmer.setAttribute("aria-hidden", "true");

    dialog = document.createElement("div");
    dialog.className = "tp-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Theme picker");
    dialog.tabIndex = -1;
    dialog.innerHTML =
      '<div class="tp-backdrop" aria-hidden="true"></div>' +
      '<div class="tp-deck"><div class="tp-spacer"></div></div>' +
      '<button type="button" class="tp-name" tabindex="-1"></button>' +
      '<div class="tp-hint">← → to browse · Enter to apply · Esc to close · T to open</div>' +
      `<button type="button" class="tp-arrow tp-prev" aria-label="Previous theme">${ICON_LEFT}</button>` +
      `<button type="button" class="tp-arrow tp-next" aria-label="Next theme">${ICON_RIGHT}</button>`;

    dialog.querySelector(".tp-backdrop").addEventListener("click", close);
    dialog.querySelector(".tp-name").addEventListener("click", choose);
    dialog.querySelector(".tp-prev").addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
    dialog.querySelector(".tp-next").addEventListener("click", (e) => { e.stopPropagation(); step(1); });

    // Touch swipe walks the deck; a swipe that travelled is not a tap.
    dialog.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      Object.assign(swipe, { id: e.pointerId, from: e.clientX, moved: 0 });
    });
    dialog.addEventListener("pointermove", (e) => {
      if (e.pointerId === swipe.id) swipe.moved = e.clientX - swipe.from;
    });
    dialog.addEventListener("pointerup", (e) => {
      if (e.pointerId !== swipe.id) return;
      swipe.id = -1;
      if (Math.abs(swipe.moved) > 44) step(swipe.moved < 0 ? 1 : -1);
    });
    dialog.addEventListener("click", (e) => {
      if (Math.abs(swipe.moved) <= 44) return;
      swipe.moved = 0;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    document.body.append(dimmer, dialog);
    render();
    dialog.focus();
  }

  function close() {
    if (!dialog) return;
    dialog.remove();
    dimmer.remove();
    dialog = null;
    dimmer = null;
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  }

  function choose() {
    const theme = themes[index];
    if (theme.key === currentKey()) {
      close();
      return;
    }
    const root = document.documentElement;
    const apply = () => {
      root.classList.add("no-transitions");
      theme.input.checked = true;
      theme.input.dispatchEvent(new Event("change", { bubbles: true }));
      // The picker is named in the wipe, so it must be gone before the second snapshot.
      close();
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-transitions")));
    };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof document.startViewTransition !== "function" || reduced) {
      apply();
      return;
    }
    root.classList.add("theme-wipe-frosted");
    try {
      const transition = document.startViewTransition(apply);
      transition.finished.finally(() => root.classList.remove("theme-wipe-frosted"));
    } catch (_) {
      root.classList.remove("theme-wipe-frosted");
      apply();
    }
  }

  function isTyping(target) {
    if (!target || !target.tagName) return false;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
  }

  document.addEventListener("keydown", (e) => {
    if (dialog) {
      if (e.key === "ArrowLeft" || e.key === "Left") { e.preventDefault(); step(-1); }
      else if (e.key === "ArrowRight" || e.key === "Right") { e.preventDefault(); step(1); }
      else if (e.key === "Enter") { e.preventDefault(); choose(); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key.toLowerCase() === "t" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); close(); }
      return;
    }
    if (e.key.toLowerCase() === "t" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
      e.preventDefault();
      open();
    }
  }, true);

  // The header survives Material's instant navigation, so add the button once.
  function addButton() {
    if (document.querySelector(".tp-open")) return;
    const palette = document.querySelector('form[data-md-component="palette"]');
    if (!palette) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tp-open md-header__button";
    button.title = "Change theme (T)";
    button.setAttribute("aria-label", "Change theme");
    button.innerHTML = ICON_PALETTE;
    button.addEventListener("click", open);
    palette.after(button);
  }

  if (typeof document$ !== "undefined") document$.subscribe(addButton);
  else document.addEventListener("DOMContentLoaded", addButton);
})();
