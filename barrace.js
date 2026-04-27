/**
 * barrace.js — Bar chart race (évolution historique des points cumulés)
 * Dépend de: web/data/timeline.json, web/data/clubs.json
 */

const BR = {
  timeline: [],
  clubs: {},
  currentIdx: 0,
  playing: false,
  timer: null,
  initialized: false,
  topN: 15,
};

const COMP_COLORS_MAP = {
  PSG:  "#004170",
  OL:   "#032f75",
  OM:   "#2CBFEF",
  ASM:  "#EF3340",
  LOSC: "#D0021B",
  RCL:  "#FFD700",
  GDB:  "#1D3F8F",
  SRFC: "#CF3237",
  OGCN: "#CF3237",
  SB29: "#DA291C",
  RCSA: "#004EA0",
  TFC:  "#3E0081",
  AJA:  "#005BAC",
  ASSE: "#00A046",
  FCN:  "#FFCD00",
  SDR:  "#DA291C",
  SCB:  "#003087",
  MHSC: "#F57D00",
};

async function barraceLoadData() {
  const [timelineResp, clubsResp] = await Promise.all([
    fetch("data/timeline.json"),
    fetch("data/clubs.json"),
  ]);
  BR.timeline = await timelineResp.json();
  BR.clubs = await clubsResp.json();
}

function barraceRender(idx) {
  const frame = BR.timeline[idx];
  if (!frame) return;

  const seekEl = document.getElementById("br-seek");
  const seasonEl = document.getElementById("br-season-display");
  if (seekEl) seekEl.value = idx;
  if (seasonEl) seasonEl.textContent = frame.season || "—";

  // Tri décroissant, top N
  const entries = Object.entries(frame.scores || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, BR.topN);

  if (entries.length === 0) return;
  const maxPts = entries[0][1] || 1;

  const container = document.getElementById("barrace-container");
  if (!container) return;

  container.innerHTML = entries.map(([club, pts], i) => {
    const meta = BR.clubs[club] || {};
    const short = escapeHtmlBr(meta.short || club.slice(0, 3).toUpperCase());
    const color = meta.color || COMP_COLORS_MAP[meta.short] || "#1A4B9B";
    const pct = Math.max(2, (pts / maxPts) * 100).toFixed(1);
    const logoHtml = meta.logo_url
      ? `<img src="${escapeHtmlBr(meta.logo_url)}" alt="" style="height:18px;width:18px;object-fit:contain;margin-left:4px;vertical-align:middle;" onerror="this.style.display='none'" loading="lazy" />`
      : "";

    return `
      <div class="br-row" style="opacity:${pts > 0 ? 1 : 0.3}">
        <div class="br-label" title="${escapeHtmlBr(club)}">
          <span style="color:#8b949e;margin-right:4px;font-size:0.7rem">${i + 1}</span>
          ${short}${logoHtml}
        </div>
        <div class="br-bar-wrap">
          <div class="br-bar" style="width:${pct}%;background:${escapeHtmlBr(color)}">
            <span class="br-bar-pts">${pts % 1 === 0 ? pts : pts.toFixed(2)}</span>
          </div>
        </div>
      </div>`;
  }).join("");
}

function barracePlay() {
  if (BR.playing) return;
  BR.playing = true;
  document.getElementById("br-play").textContent = "⏸";
  BR.timer = setInterval(() => {
    if (BR.currentIdx >= BR.timeline.length - 1) {
      barracePause();
      return;
    }
    BR.currentIdx++;
    barraceRender(BR.currentIdx);
  }, 450);
}

function barracePause() {
  BR.playing = false;
  clearInterval(BR.timer);
  const btn = document.getElementById("br-play");
  if (btn) btn.textContent = "▶";
}

async function barraceInit() {
  if (BR.initialized) return;
  BR.initialized = true;

  await barraceLoadData();

  const seekEl = document.getElementById("br-seek");
  if (seekEl) {
    seekEl.max = BR.timeline.length - 1;
    seekEl.addEventListener("input", () => {
      barracePause();
      BR.currentIdx = parseInt(seekEl.value);
      barraceRender(BR.currentIdx);
    });
  }

  document.getElementById("br-play")?.addEventListener("click", () => {
    if (BR.playing) barracePause();
    else {
      if (BR.currentIdx >= BR.timeline.length - 1) BR.currentIdx = 0;
      barracePlay();
    }
  });

  document.getElementById("br-top15")?.addEventListener("change", (e) => {
    BR.topN = e.target.checked ? 15 : 999;
    barraceRender(BR.currentIdx);
  });

  barraceRender(0);
}

function escapeHtmlBr(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Exposer pour app.js
window.barraceInit = barraceInit;
