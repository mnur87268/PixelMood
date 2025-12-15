export function bootMosaicUI({ root, onReadyText }) {
  const KEY = "mosaic_moods_v1";

  const MOODS = [
    { id: "sun",  name: "Bright",  emoji: "☀️", color: "#FFCF59" },
    { id: "calm", name: "Calm",    emoji: "🌿", color: "#6FE9AA" },
    { id: "blue", name: "Blue",    emoji: "🌧️", color: "#70ADFF" },
    { id: "fire", name: "Spicy",   emoji: "🔥", color: "#FF6384" },
    { id: "dream",name: "Dreamy",  emoji: "✨", color: "#B884FF" }
  ];

  const state = load() || { year: (new Date()).getFullYear(), entries: {} };

  root.innerHTML = `
    <div class="wrap">
      <header class="top">
        <div class="brand">
          <div class="title">Pixel Mood</div>
          <div class="sub">one color per day → your year becomes art</div>
        </div>
        <div class="pill" id="envPill">WEB</div>
      </header>

      <section class="card">
        <div class="row">
          <div class="year">
            <button class="miniBtn" id="prevY" aria-label="Previous year">‹</button>
            <div class="yearText" id="yearText"></div>
            <button class="miniBtn" id="nextY" aria-label="Next year">›</button>
          </div>
          <button class="ghost" id="todayBtn" type="button">today</button>
        </div>

        <div class="gridWrap">
          <div class="grid" id="grid" aria-label="Year mood grid"></div>
        </div>

        <div class="legend">
          ${MOODS.map(m => `<div class="lg"><span class="sw" style="background:${m.color}"></span>${m.emoji}<span class="ln">${m.name}</span></div>`).join("")}
        </div>
      </section>

      <div class="toast" id="toast">${onReadyText || "ready ✓"}</div>

      <div class="modal" id="modal" aria-hidden="true">
        <div class="sheet">
          <div class="sheetTop">
            <div class="sheetTitle" id="sheetTitle">Today</div>
            <button class="x" id="closeBtn" type="button" aria-label="Close">✕</button>
          </div>
          <div class="palette" id="palette"></div>
          <button class="danger" id="clearBtn" type="button">clear day</button>
        </div>
      </div>
    </div>
  `;

  const el = {
    env: root.querySelector("#envPill"),
    yearText: root.querySelector("#yearText"),
    grid: root.querySelector("#grid"),
    toast: root.querySelector("#toast"),
    modal: root.querySelector("#modal"),
    palette: root.querySelector("#palette"),
    sheetTitle: root.querySelector("#sheetTitle"),
    closeBtn: root.querySelector("#closeBtn"),
    clearBtn: root.querySelector("#clearBtn"),
    prevY: root.querySelector("#prevY"),
    nextY: root.querySelector("#nextY"),
    todayBtn: root.querySelector("#todayBtn"),
  };

  let selectedDateKey = null;

  function setEnv(isMini) {
    el.env.textContent = isMini ? "MINI" : "WEB";
    el.env.classList.toggle("mini", !!isMini);
  }

  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function startOfYear(y) { return new Date(y, 0, 1); }
  function endOfYear(y) { return new Date(y, 11, 31); }
  function isLeap(y) { return (y%4===0 && y%100!==0) || (y%400===0); }

  // GitHub-like grid: columns = weeks, rows = 7 days
  function dayOfWeekMon0(d){
    // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
    return (d.getDay() + 6) % 7;
  }

  function buildGrid(year) {
    el.yearText.textContent = String(year);
    el.grid.innerHTML = "";

    const start = startOfYear(year);
    const end = endOfYear(year);

    // Determine number of weeks from start to end (Mon-based)
    // We anchor columns by week index starting at the first day of year.
    const totalDays = isLeap(year) ? 366 : 365;

    // We will render exactly enough columns to fit all days:
    // weekIndex = floor((dayIndex + offset)/7), where offset = dow(start)
    const offset = dayOfWeekMon0(start);
    const weeks = Math.ceil((totalDays + offset) / 7);

    el.grid.style.setProperty("--weeks", weeks);

    // Precompute today (for highlight)
    const today = new Date();
    const todayKey = dateKey(today);

    // Render cells in week-major order
    for (let w=0; w<weeks; w++) {
      for (let r=0; r<7; r++) {
        const cellIndex = w*7 + r;
        const dayIndex = cellIndex - offset; // 0..totalDays-1 valid
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "px";
        btn.setAttribute("aria-label", "day pixel");
        btn.dataset.dayIndex = String(dayIndex);

        if (dayIndex < 0 || dayIndex >= totalDays) {
          btn.classList.add("off");
          btn.disabled = true;
        } else {
          const d = new Date(year, 0, 1 + dayIndex);
          const k = dateKey(d);
          const moodId = state.entries[k];
          if (moodId) {
            const mood = MOODS.find(x => x.id === moodId);
            if (mood) btn.style.background = mood.color;
          }
          if (k === todayKey) btn.classList.add("today");
          btn.title = k;
          btn.addEventListener("click", () => openPicker(k));
        }

        el.grid.appendChild(btn);
      }
    }
  }

  function toast(msg){
    el.toast.textContent = msg;
    el.toast.classList.remove("pop");
    void el.toast.offsetWidth;
    el.toast.classList.add("pop");
  }

  function openPicker(k){
    selectedDateKey = k;
    el.sheetTitle.textContent = (k === dateKey(new Date())) ? "Today" : k;
    el.modal.classList.add("show");
    el.modal.setAttribute("aria-hidden","false");

    // build palette buttons
    el.palette.innerHTML = "";
    MOODS.forEach(m => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mood";
      b.style.setProperty("--c", m.color);
      const active = state.entries[k] === m.id;
      b.classList.toggle("active", active);
      b.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="em">${m.emoji}</span><span class="nm">${m.name}</span>`;
      b.addEventListener("click", () => {
        state.entries[k] = m.id;
        save();
        toast(`${m.emoji} saved`);
        closePicker();
        buildGrid(state.year);
      });
      el.palette.appendChild(b);
    });
  }

  function closePicker(){
    el.modal.classList.remove("show");
    el.modal.setAttribute("aria-hidden","true");
  }

  function clearDay(){
    if (!selectedDateKey) return;
    delete state.entries[selectedDateKey];
    save();
    toast("cleared");
    closePicker();
    buildGrid(state.year);
  }

  function setYear(y){
    const nowY = (new Date()).getFullYear();
    // allow browsing +/- 2 years from now to keep simple
    const clamped = Math.max(nowY-2, Math.min(nowY+2, y));
    state.year = clamped;
    save();
    buildGrid(state.year);
    toast(`year ${state.year}`);
  }

  el.closeBtn.addEventListener("click", closePicker);
  el.modal.addEventListener("click", (e) => { if (e.target === el.modal) closePicker(); });
  el.clearBtn.addEventListener("click", clearDay);

  el.prevY.addEventListener("click", () => setYear(state.year - 1));
  el.nextY.addEventListener("click", () => setYear(state.year + 1));
  el.todayBtn.addEventListener("click", () => {
    const t = new Date();
    setYear(t.getFullYear());
    openPicker(dateKey(t));
  });

  // initial render
  buildGrid(state.year);
  toast(onReadyText || "ready ✓");

  return { setEnv };
}