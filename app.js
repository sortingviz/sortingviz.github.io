// New app.js - generator-driven engine using algos.js
// Provides: start/pause/reset/step/record and visual stats

const board = document.getElementById("board");
const newArrayBtn = document.getElementById("newArray");
const startStopBtn = document.getElementById("startStop");
const pauseBtn = document.getElementById("pause");
const sizeInput = document.getElementById("size");
const speedInput = document.getElementById("speed");
const algorithmSelect = document.getElementById("algorithm");
const customSelect = document.getElementById("algorithm"); // same container (custom)
const stairToggle = document.getElementById("stairToggle");
const comparisonsEl = document.getElementById("comparisons");
const swapsEl = document.getElementById("swaps");
const sizeVal = document.getElementById("sizeVal");
const speedVal = document.getElementById("speedVal");

let array = [];
let bars = [];
let running = false;
let paused = false;
let speed = 100;
let comparisons = 0;
let swaps = 0;
let gen = null;
let genIter = null;
let staircaseOn = false; // default off
let staircaseReverted = false;
let staircasePrepared = false; // true when we regenerated a staircase array right before running
let stoppedByUser = false;
// helper to get/remove spinner
function addSpinner() {
  if (!startStopBtn) return;
  if (document.getElementById("__spinner")) return;
  const spinner = document.createElement("span");
  spinner.className = "start-spinner";
  spinner.id = "__spinner";
  startStopBtn.appendChild(spinner);
}
function removeSpinner() {
  const sp = document.getElementById("__spinner");
  if (sp) sp.remove();
}

function setStats() {
  comparisonsEl.textContent = comparisons;
  swapsEl.textContent = swaps;
}

function randomArray(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(Math.random());
  return arr;
}

function staircaseArray(n) {
  if (n <= 1) return [0];
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = i / (n - 1);
  // Fisher-Yates shuffle
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function renderArray(arr) {
  board.innerHTML = "";
  bars = [];
  const n = arr.length;
  // board height in px to compute bar height (ensure visibility even for many bars)
  const bh = board.clientHeight || 400;
  for (let i = 0; i < n; i++) {
    const b = document.createElement("div");
    b.className = "bar";
    const hpx = Math.max(8, Math.round(arr[i] * bh));
    b.style.height = `${hpx}px`;
    b.dataset.idx = i;
    board.appendChild(b);
    bars.push(b);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function updateSpeed() {
  const v = Number(speedInput.value);
  speed = Math.max(1, 1100 - v);
}

function mark(i, cls) {
  if (bars[i]) bars[i].classList.add(cls);
}
function unmark(i, cls) {
  if (bars[i]) bars[i].classList.remove(cls);
}

function setHeight(i, value) {
  if (bars[i]) {
    const bh = board.clientHeight || 400;
    const hpx = Math.max(8, Math.round(value * bh));
    bars[i].style.height = `${hpx}px`;
  }
}

function swapVisual(i, j) {
  const hi = bars[i].style.height;
  bars[i].style.height = bars[j].style.height;
  bars[j].style.height = hi;
}

async function playGenerator(generator) {
  // pass live array so algorithms mutate the visible data
  genIter = generator(array);
  running = true;
  paused = false;
  stoppedByUser = false;
  comparisons = 0;
  swaps = 0;
  setStats();
  addSpinner();

  while (true) {
    if (!running) break;
    if (paused) {
      await waitWhilePaused();
    }
    const res = genIter.next();
    if (res.done) break;
    const action = res.value;
    if (!action) continue;
    // handle action types
    if (action.type === "compare") {
      comparisons += 1;
      setStats();
      if (typeof action.a === "number") mark(action.a, "compared");
      if (typeof action.b === "number") mark(action.b, "compared");
      await sleep(speed);
      if (typeof action.a === "number") unmark(action.a, "compared");
      if (typeof action.b === "number") unmark(action.b, "compared");
    } else if (action.type === "swap") {
      swaps += 1;
      setStats();
      mark(action.a, "active");
      mark(action.b, "active");
      await sleep(speed);
      swapVisual(action.a, action.b);
      await sleep(speed);
      unmark(action.a, "active");
      unmark(action.b, "active");
    } else if (action.type === "set") {
      // set value at index
      setHeight(action.i, action.value);
      await sleep(speed);
    } else if (action.type === "done") {
      for (let k = 0; k < bars.length; k++) mark(k, "sorted");
      break;
    }

    // continue until generator finishes or user pauses
  }

  running = false;
  paused = false;
  // Apply staircase final layout if enabled and not reverted and not stopped by the user
  // If we didn't prepare a staircase input explicitly, animate the staircase final layout as a visual override.
  // If we prepared a staircase array before running, the algorithm will actually sort to the staircase, so skip the extra animation.
  if (
    !stoppedByUser &&
    staircaseOn &&
    !staircaseReverted &&
    !staircasePrepared
  ) {
    await animateStaircase();
  }
  // reset prepared flag after run
  staircasePrepared = false;
  // remove spinner and ensure start/stop button reflects stopped state
  removeSpinner();
  if (startStopBtn) {
    startStopBtn.textContent = "Start";
    startStopBtn.classList.remove("danger");
    startStopBtn.classList.add("primary");
  }
}

async function animateStaircase() {
  const n = bars.length;
  if (n <= 1) return;
  for (let i = 0; i < n; i++) {
    const v = i / (n - 1);
    setHeight(i, v);
    mark(i, "active");
    await sleep(Math.max(12, speed / 6));
    unmark(i, "active");
  }
  for (let k = 0; k < bars.length; k++) mark(k, "sorted");
}

function waitWhilePaused() {
  return new Promise((resolve) => {
    const iv = setInterval(() => {
      if (!paused) {
        clearInterval(iv);
        resolve();
      }
    }, 50);
  });
}

// recording functionality removed

async function run() {
  if (typeof window.Algos === "undefined") {
    alert("Algos not loaded");
    return;
  }
  updateSpeed();
  // if graph is already completely sorted, disallow start
  if (isSortedVisible()) {
    alert("Array already sorted — cannot start a new sort");
    return;
  }
  const name = customSelect.dataset
    ? customSelect.dataset.value ||
      customSelect.getAttribute("data-value") ||
      "bubble"
    : "bubble";
  const genCtor =
    window.Algos && window.Algos.generators && window.Algos.generators[name];
  if (!genCtor) {
    alert("Algorithm not found: " + name);
    return;
  }
  // If staircase mode is on, prepare a staircase-shaped underlying array so the algorithm actually sorts to it
  if (staircaseOn) {
    array = staircaseArray(bars.length || Number(sizeInput.value));
    renderArray(array);
    staircasePrepared = true;
  }

  // play
  playGenerator(genCtor);
}

function isSortedVisible() {
  // determine if bars are marked 'sorted' or the underlying array is in non-decreasing order
  // first check visual markers
  if (bars.every((b) => b.classList && b.classList.contains("sorted")))
    return true;
  // otherwise check logical array order by reading heights
  const heights = bars.map((b) => parseInt(b.style.height, 10));
  for (let i = 1; i < heights.length; i++) {
    if (heights[i - 1] > heights[i]) return false;
  }
  return true;
}

function init() {
  updateSpeed();
  updateSizeCap();
  array = staircaseOn
    ? staircaseArray(Number(sizeInput.value))
    : randomArray(Number(sizeInput.value));
  renderArray(array);
  comparisons = 0;
  swaps = 0;
  setStats();
  updateRangeVisual(sizeInput);
  updateRangeVisual(speedInput);
  if (sizeVal) sizeVal.textContent = sizeInput.value;
  if (speedVal) speedVal.textContent = speedInput.value;
  // ensure visual fills exist for sliders
  setupRangeFill(sizeInput);
  setupRangeFill(speedInput);
}

function updateSizeCap() {
  const cap = Math.min(
    120,
    Math.max(30, Math.floor((board.clientWidth || 800) / 3))
  );
  sizeInput.max = cap;
  if (Number(sizeInput.value) > cap) sizeInput.value = cap;
}

window.addEventListener("resize", () => {
  updateSizeCap();
  // update fills on resize (percent unchanged but width may change)
  setupRangeFill(sizeInput);
  setupRangeFill(speedInput);
});

function updateRangeVisual(input) {
  const val = Number(input.value);
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const pct = ((val - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, pct));
  // update CSS variable used by CSS to render the left gradient width
  input.style.setProperty("--p", clamped + "%");
  // keep a fallback for browsers that don't handle the CSS variable on pseudo-elements
  input.style.backgroundSize = `${clamped}% 100%, ${100 - clamped}% 100%`;
}

// Fallback: Some browsers ignore input pseudo-element styling. Create a
// visible fill element behind each range and size it to match the percent.
function setupRangeFill(input) {
  if (!input) return;
  // ensure wrapper exists
  let wrap = input.parentElement;
  if (!wrap || !wrap.classList.contains("range-wrap")) {
    wrap = document.createElement("span");
    wrap.className = "range-wrap";
    input.parentElement.insertBefore(wrap, input);
    wrap.appendChild(input);
  }
  // don't duplicate fill
  if (!wrap.querySelector(".range-fill")) {
    const fill = document.createElement("span");
    fill.className = "range-fill";
    wrap.insertBefore(fill, input);
  }

  const update = (e) => {
    const val = Number(input.value);
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    const fillEl = wrap.querySelector(".range-fill");
    if (fillEl) fillEl.style.width = pct + "%";
  };

  input.addEventListener("input", update);
  input.addEventListener("change", update);
  // set initial
  update();
}

// Controls wiring
newArrayBtn.addEventListener("click", () => {
  if (running) {
    alert("Stop current run to create a new array");
    return;
  }
  init();
});
// slider initial visuals
updateRangeVisual(sizeInput);
updateRangeVisual(speedInput);

sizeInput.addEventListener("input", (e) => {
  if (running) {
    return;
  }
  const n = Number(e.target.value);
  sizeVal.textContent = n;
  updateRangeVisual(e.target);
  array = staircaseOn ? staircaseArray(n) : randomArray(n);
  renderArray(array);
});
speedInput.addEventListener("input", (e) => {
  speedVal.textContent = e.target.value;
  updateRangeVisual(e.target);
  updateSpeed();
});

startStopBtn.addEventListener("click", () => {
  if (running) {
    // act as Stop
    running = false;
    paused = false;
    stoppedByUser = true;
    pauseBtn.textContent = "Pause";
    if (startStopBtn) {
      startStopBtn.textContent = "Start";
      startStopBtn.classList.remove("danger");
      startStopBtn.classList.add("primary");
    }
    return;
  }
  // act as Start
  if (startStopBtn) {
    startStopBtn.textContent = "Stop";
    startStopBtn.classList.remove("primary");
    startStopBtn.classList.add("danger");
  }
  run();
});
pauseBtn.addEventListener("click", () => {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
});
// staircase toggle
if (stairToggle) {
  stairToggle.addEventListener("click", () => {
    staircaseOn = !staircaseOn;
    stairToggle.classList.toggle("active", staircaseOn);
    stairToggle.textContent = "Staircase: " + (staircaseOn ? "On" : "Off");
  });
}

// keyboard
window.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    e.preventDefault();
    if (running) {
      paused = !paused;
      pauseBtn.textContent = paused ? "Resume" : "Pause";
    } else run();
  }
});

// initialize
init();

// Command prompt: Ctrl+K to type commands (type exact 'revert staircase' to disable staircase permanently)
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    const cmd = prompt("Enter command:");
    if (!cmd) return;
    if (cmd.trim().toLowerCase() === "revert staircase") {
      staircaseReverted = true;
      alert("Staircase final override disabled (reverted)");
    }
  }
});

// expose revert function
window.revertStaircase = function () {
  staircaseReverted = true;
};

// Custom select behavior
(function () {
  const cs = customSelect;
  if (!cs) return;
  const btn = cs.querySelector(".cs-selected");
  const list = cs.querySelector(".cs-options");
  const options = Array.from(cs.querySelectorAll(".cs-option"));
  function close() {
    btn.setAttribute("aria-expanded", "false");
    list.style.display = "none";
  }
  function open() {
    btn.setAttribute("aria-expanded", "true");
    list.style.display = "block";
  }
  btn.addEventListener("click", () => {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    if (expanded) close();
    else open();
  });
  const labelSpan = btn.querySelector(".label");
  options.forEach((opt) => {
    opt.addEventListener("click", () => {
      const v = opt.dataset.value;
      cs.dataset.value = v;
      if (labelSpan) labelSpan.textContent = opt.textContent;
      close();
    });
  });
  document.addEventListener("click", (e) => {
    if (!cs.contains(e.target)) close();
  });
  cs.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const expanded = btn.getAttribute("aria-expanded") === "true";
      if (!expanded) open();
      else close();
    }
  });
})();

// expose for debugging
window.__sv = { array, bars, run, init };
