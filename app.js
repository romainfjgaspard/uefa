/**
 * app.js — Logique principale du classement UEFA des clubs français
 * Dépend de: web/data/clubs.json, seasons.json, matches.json
 */

// ============================================================
// ÉTAT GLOBAL
// ============================================================
const state = {
  clubs: {},       // données clubs (depuis clubs.json)
  seasons: {},     // données saisons (depuis seasons.json)
  filtered: [],    // liste filtrée pour l'affichage
  sortCol: "pts",
  sortDir: "desc",
  yearMin: 1955,
  yearMax: 2026,
  comps: null,     // null = toutes
  search: "",
};

// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================
async function loadData() {
  try {
    const [clubsResp, seasonsResp] = await Promise.all([
      fetch("data/clubs.json"),
      fetch("data/seasons.json"),
    ]);
    state.clubs = await clubsResp.json();
    state.seasons = await seasonsResp.json();
    init();
  } catch (e) {
    document.getElementById("ranking-body").innerHTML =
      `<tr><td colspan="9" class="loading">Erreur de chargement des données : ${e.message}</td></tr>`;
  }
}

// ============================================================
// INITIALISATION
// ============================================================
function init() {
  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Sliders de saison
  const rMin = document.getElementById("range-min");
  const rMax = document.getElementById("range-max");
  const lMin = document.getElementById("season-min-label");
  const lMax = document.getElementById("season-max-label");

  function updateRangeTrack() {
    const min = parseInt(rMin.value);
    const max = parseInt(rMax.value);
    const range = parseInt(rMin.max) - parseInt(rMin.min);
    const pctMin = ((min - parseInt(rMin.min)) / range) * 100;
    const pctMax = ((max - parseInt(rMin.min)) / range) * 100;
    rMin.style.background = `linear-gradient(to right, #30363d ${pctMin}%, #1A4B9B ${pctMin}%, #1A4B9B ${pctMax}%, #30363d ${pctMax}%)`;
  }

  rMin.addEventListener("input", () => {
    if (parseInt(rMin.value) > parseInt(rMax.value)) rMin.value = rMax.value;
    state.yearMin = parseInt(rMin.value);
    lMin.textContent = rMin.value;
    updateRangeTrack();
    renderTable();
  });
  rMax.addEventListener("input", () => {
    if (parseInt(rMax.value) < parseInt(rMin.value)) rMax.value = rMin.value;
    state.yearMax = parseInt(rMax.value);
    lMax.textContent = rMax.value;
    updateRangeTrack();
    renderTable();
  });
  updateRangeTrack();

  // Filtres compétition
  document.querySelectorAll(".comp-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".comp-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.comps = btn.dataset.comp === "ALL" ? null : btn.dataset.comp.split(",");
      renderTable();
    });
  });

  // Recherche
  document.getElementById("search-club").addEventListener("input", (e) => {
    state.search = e.target.value.toLowerCase();
    renderTable();
  });

  // Tri des colonnes
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (state.sortCol === col) {
        state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
      } else {
        state.sortCol = col;
        state.sortDir = "desc";
      }
      document.querySelectorAll("th.sortable").forEach((h) => {
        h.classList.remove("sorted-asc", "sorted-desc");
      });
      th.classList.add(state.sortDir === "desc" ? "sorted-desc" : "sorted-asc");
      renderTable();
    });
  });

  renderTable();
}

// ============================================================
// CALCUL DES STATS FILTRÉES
// ============================================================
function getFilteredStats() {
  const result = {};

  for (const [clubName, clubSeasons] of Object.entries(state.seasons)) {
    const meta = state.clubs[clubName] || {};
    let wins = 0, draws = 0, losses = 0, pts = 0, matchCount = 0;
    const compsUsed = new Set();
    const seasonsUsed = new Set();

    for (const [key, s] of Object.entries(clubSeasons)) {
      const seasonYear = parseInt((s.season || "0").split("-")[0]);
      const endYear = seasonYear + 1;

      // Filtre année
      if (endYear < state.yearMin || seasonYear > state.yearMax) continue;

      // Filtre compétition
      const comp = s.competition;
      if (state.comps && !state.comps.includes(comp)) continue;

      wins += s.wins || 0;
      draws += s.draws || 0;
      losses += s.losses || 0;
      pts += s.total_points || 0;
      matchCount += s.total_matches || 0;
      compsUsed.add(comp);
      seasonsUsed.add(s.season);
    }

    if (matchCount === 0) continue;

    // Filtre recherche
    if (state.search && !clubName.toLowerCase().includes(state.search)) continue;

    // Utiliser données de référence (pari-et-gagne.com) quand pas de filtre actif
    const isUnfiltered = state.yearMin <= 1955 && state.yearMax >= 2026 && state.comps === null;
    const useRef = isUnfiltered && meta.ref_j != null;

    const displayWins = useRef ? meta.ref_g : wins;
    const displayDraws = useRef ? meta.ref_n : draws;
    const displayLosses = useRef ? meta.ref_p : losses;
    const displayMatches = useRef ? meta.ref_j : matchCount;
    const displayPart = useRef ? (meta.ref_part_total || seasonsUsed.size) : seasonsUsed.size;

    result[clubName] = {
      name: clubName,
      short: meta.short || clubName.slice(0, 3).toUpperCase(),
      logo_url: meta.logo_url || "",
      wins: displayWins,
      draws: displayDraws,
      losses: displayLosses,
      j: displayMatches,
      pts: Math.round(pts * 100) / 100,
      ratio: matchCount > 0 ? Math.round((pts / matchCount) * 1000) / 1000 : 0,
      foot_ratio: displayMatches > 0 ? Math.round(((displayWins * 3 + displayDraws) / displayMatches) * 1000) / 1000 : 0,
      seasons: displayPart,
      comps: [...compsUsed],
      bp: useRef && meta.ref_bp != null ? meta.ref_bp : null,
      bc: useRef && meta.ref_bc != null ? meta.ref_bc : null,
      diff: useRef && meta.ref_diff != null ? meta.ref_diff : null,
      part: meta.ref_part_total != null ? meta.ref_part_total : null,
      part_detail: meta.ref_c1 != null
        ? `${meta.ref_c1}/${meta.ref_c2||0}/${meta.ref_c3||0}/${meta.ref_c4||0}`
        : "",
    };
  }

  return result;
}

// ============================================================
// AFFICHAGE DU TABLEAU
// ============================================================
function renderTable() {
  const stats = getFilteredStats();
  let rows = Object.values(stats);

  // Tri
  rows.sort((a, b) => {
    let va, vb;
    switch (state.sortCol) {
      case "name":       va = a.name; vb = b.name; break;
      case "seasons":    va = a.seasons; vb = b.seasons; break;
      case "j":          va = a.j; vb = b.j; break;
      case "wins":       va = a.wins; vb = b.wins; break;
      case "draws":      va = a.draws; vb = b.draws; break;
      case "losses":     va = a.losses; vb = b.losses; break;
      case "ratio":      va = a.ratio; vb = b.ratio; break;
      case "foot_ratio": va = a.foot_ratio; vb = b.foot_ratio; break;
      case "bp":         va = a.bp; vb = b.bp; break;
      case "bc":         va = a.bc; vb = b.bc; break;
      case "diff":       va = a.diff; vb = b.diff; break;
      case "part":       va = a.part; vb = b.part; break;
      default:           va = a.pts; vb = b.pts;
    }
    if (typeof va === "string") return state.sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return state.sortDir === "asc" ? va - vb : vb - va;
  });

  state.filtered = rows;

  const tbody = document.getElementById("ranking-body");
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="14" class="loading">Aucun club trouvé</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td class="td-rank">${i + 1}</td>
      <td>
        <div class="td-club">
          <img class="club-logo-sm" src="${escapeHtml(r.logo_url)}" alt=""
               onerror="this.style.display='none'" loading="lazy" />
          <a href="club.html?club=${encodeURIComponent(r.name)}">${escapeHtml(r.name)}</a>
        </div>
      </td>
      <td class="td-part" title="${r.part_detail ? 'C1/C2/C3/C4: ' + r.part_detail : ''}">${r.seasons}</td>
      <td>${r.j}</td>
      <td class="td-wins">${r.wins}</td>
      <td class="td-draws">${r.draws}</td>
      <td class="td-losses">${r.losses}</td>
      <td class="td-bp">${r.bp != null ? r.bp : '–'}</td>
      <td class="td-bc">${r.bc != null ? r.bc : '–'}</td>
      <td class="td-diff ${r.diff != null && r.diff > 0 ? 'positive' : r.diff != null && r.diff < 0 ? 'negative' : ''}">${r.diff != null ? (r.diff > 0 ? '+' + r.diff : r.diff) : '–'}</td>
      <td class="td-pts">${r.pts.toFixed(2)}</td>
      <td class="td-ratio">${r.ratio.toFixed(3)}</td>
      <td class="td-foot-ratio">${r.foot_ratio.toFixed(3)}</td>
      <td class="td-comps">
        <div class="comp-pills">
          ${r.comps.map((c) => `<span class="comp-pill pill-${escapeHtml(c)}">${escapeHtml(c)}</span>`).join("")}
        </div>
      </td>
    </tr>
  `).join("");
}

// ============================================================
// TABS
// ============================================================
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach((s) => s.classList.toggle("active", s.id === `tab-${tab}`));
  if (tab === "barrace" && window.barraceInit) window.barraceInit();
  if (tab === "bonus" && window.bonusInit) window.bonusInit();
}

// ============================================================
// UTILITAIRES
// ============================================================
function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// DÉMARRAGE
// ============================================================
loadData();
