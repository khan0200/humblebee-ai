const svg = document.querySelector("#chart");
const wrap = document.querySelector("#chartWrap");
const zoomVal = document.querySelector("#zoomVal");
const editToggle = document.querySelector("#editToggle");
const editLabel = document.querySelector("#editLabel");
const editHint = document.querySelector("#editHint");

/* ---------------------------------------------------------
   ZOOM — changes the viewBox, so text stays sharp at any size
   --------------------------------------------------------- */
const BASE = { w: 2300, h: 700 };
const MIN = 1;
const MAX = 5;
const STEP = 1.25;

let scale = 1;
let viewX = 0;
let viewY = 0;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function apply() {
  const w = BASE.w / scale;
  const h = BASE.h / scale;
  viewX = clamp(viewX, 0, BASE.w - w);
  viewY = clamp(viewY, 0, BASE.h - h);
  svg.setAttribute("viewBox", `${viewX} ${viewY} ${w} ${h}`);
  zoomVal.textContent = `${Math.round(scale * 100)}%`;
  svg.classList.toggle("pannable", scale > 1 && !editing);
}

// zoom toward a point so what's under the cursor stays there
function zoomTo(next, fx, fy) {
  const c = clamp(next, MIN, MAX);
  if (c === scale) {
    return;
  }
  const w = BASE.w / scale;
  const h = BASE.h / scale;
  const rx = (fx - viewX) / w;
  const ry = (fy - viewY) / h;
  scale = c;
  viewX = fx - (BASE.w / scale) * rx;
  viewY = fy - (BASE.h / scale) * ry;
  apply();
}

function toSvg(event) {
  const r = svg.getBoundingClientRect();
  return {
    x: viewX + ((event.clientX - r.left) / r.width) * (BASE.w / scale),
    y: viewY + ((event.clientY - r.top) / r.height) * (BASE.h / scale),
  };
}

const middle = () => ({
  x: viewX + BASE.w / scale / 2,
  y: viewY + BASE.h / scale / 2,
});

function fit() {
  scale = 1;
  viewX = 0;
  viewY = 0;
  apply();
}

document.querySelector("#zoomIn").addEventListener("click", () => {
  const m = middle();
  zoomTo(scale * STEP, m.x, m.y);
});
document.querySelector("#zoomOut").addEventListener("click", () => {
  const m = middle();
  zoomTo(scale / STEP, m.x, m.y);
});
document.querySelector("#zoomFit").addEventListener("click", fit);

// wheel zooms only with Ctrl/⌘ held, so the page still scrolls normally
wrap.addEventListener(
  "wheel",
  (event) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    const p = toSvg(event);
    zoomTo(scale * (event.deltaY < 0 ? STEP : 1 / STEP), p.x, p.y);
  },
  { passive: false }
);

// drag to pan when zoomed in (and not editing)
let dragging = false;
let sx = 0;
let sy = 0;
let svx = 0;
let svy = 0;

wrap.addEventListener("pointerdown", (event) => {
  if (editing || scale === 1 || event.target.closest("[data-edit]")) {
    return;
  }
  dragging = true;
  sx = event.clientX;
  sy = event.clientY;
  svx = viewX;
  svy = viewY;
  wrap.setPointerCapture(event.pointerId);
  svg.classList.add("grabbing");
});

wrap.addEventListener("pointermove", (event) => {
  if (!dragging) {
    return;
  }
  const r = svg.getBoundingClientRect();
  viewX = svx - ((event.clientX - sx) / r.width) * (BASE.w / scale);
  viewY = svy - ((event.clientY - sy) / r.height) * (BASE.h / scale);
  apply();
});

function stopDrag() {
  dragging = false;
  svg.classList.remove("grabbing");
}
wrap.addEventListener("pointerup", stopDrag);
wrap.addEventListener("pointercancel", stopDrag);

/* ---------------------------------------------------------
   EDIT — click any labelled text to retype it
   --------------------------------------------------------- */
const fields = [...svg.querySelectorAll("[data-edit]")];
const original = fields.map((el) => el.textContent);
let editing = false;
let active = null;

function closeEditor(keep) {
  if (!active) {
    return;
  }
  const { target, input } = active;
  if (keep) {
    const value = input.value.trim();
    target.textContent = value === "" ? " " : value;
  }
  input.remove();
  target.style.visibility = "";
  active = null;
}

function openEditor(target) {
  closeEditor(true);

  const box = target.getBoundingClientRect();
  const wrapBox = wrap.getBoundingClientRect();
  const input = document.createElement("input");
  input.className = "text-input";
  input.value = target.textContent;

  // sit the input exactly where the text is
  input.style.left = `${box.left - wrapBox.left + wrap.scrollLeft - 4}px`;
  input.style.top = `${box.top - wrapBox.top + wrap.scrollTop - 3}px`;
  input.style.width = `${Math.max(box.width + 26, 90)}px`;
  input.style.height = `${box.height + 6}px`;
  input.style.fontSize = `${Math.max(box.height * 0.82, 10)}px`;
  input.style.textAlign = getComputedStyle(target).textAnchor === "middle" ? "center" : "left";

  target.style.visibility = "hidden";
  wrap.appendChild(input);
  input.focus();
  input.select();

  active = { target, input };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      closeEditor(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeEditor(false);
    }
  });
  input.addEventListener("blur", () => closeEditor(true));
}

function setEditing(on) {
  editing = on;
  closeEditor(true);
  svg.classList.toggle("editing", on);
  editToggle.classList.toggle("active", on);
  editToggle.setAttribute("aria-pressed", String(on));
  editLabel.textContent = on ? "Done editing" : "Edit text";
  editHint.hidden = !on;
  fields.forEach((el) => {
    if (on) {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
    } else {
      el.removeAttribute("tabindex");
      el.removeAttribute("role");
    }
  });
  apply();
}

editToggle.addEventListener("click", () => setEditing(!editing));

svg.addEventListener("click", (event) => {
  if (!editing) {
    return;
  }
  const target = event.target.closest("[data-edit]");
  if (target) {
    openEditor(target);
  }
});

svg.addEventListener("keydown", (event) => {
  if (!editing || event.key !== "Enter") {
    return;
  }
  const target = event.target.closest("[data-edit]");
  if (target) {
    event.preventDefault();
    openEditor(target);
  }
});

document.querySelector("#resetText").addEventListener("click", () => {
  closeEditor(false);
  fields.forEach((el, i) => {
    el.textContent = original[i];
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editing && !active) {
    setEditing(false);
  }
  if (event.target.tagName === "INPUT") {
    return;
  }
  if (event.key === "+" || event.key === "=") {
    const m = middle();
    zoomTo(scale * STEP, m.x, m.y);
  } else if (event.key === "-") {
    const m = middle();
    zoomTo(scale / STEP, m.x, m.y);
  } else if (event.key === "0") {
    fit();
  }
});

apply();
