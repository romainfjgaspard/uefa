/**
 * club.js — Page de détail d'un club
 * Dépend de: web/data/clubs.json, web/data/seasons.json
 */

const ROUND_LABELS = {
  qualifying: "Qualifications",
  group: "Phase de groupes",
  R32: "Seizièmes",
  R16: "Huitièmes",
  QF: "Quarts",
  SF: "Demi-finales",
  F: "Finale",
  W: "Vainqueur",
};

const COMP_LABELS = {
  CC: "Coupe des Champions",
  CWC: "C. des Vainqueurs",
  UEFA: "Coupe UEFA",
  UCL: "Ligue des Champions",
  UEL: "Ligue Europa",
  UECL: "Ligue Europa Conférence",
};

const COMP_COLORS = {
  CC: "#FFD700", CWC: "#9B59B6", UEFA: "#E67E22",
  UCL: "#1A4B9B", UEL: "#E67E22", UECL: "#27AE60",
};

// ============================================================
// CHARGEMENT
// ============================================================
async function loadClubData(clubName) {
  const [clubsResp, seasonsResp] = await Promise.all([
    fetch("data/clubs.json"),
    fetch("data/seasons.json"),
  ]);
  const clubs = await clubsResp.json();
  const allSeasons = await seasonsResp.json();
  return { meta: clubs[clubName] || {}, seasons: allSeasons[clubName] || {} };
}

// ============================================================
// RENDU PRINCIPAL
// ============================================================
async function renderClubPage() {
  const params = new URLSearchParams(window.location.search);
  const clubName = params.get("club");

  if (!clubName) {
    document.title = "Club introuvable";
    document.getElementById("club-name").textContent = "Club introuvable";
    return;
  }

  document.title = `${clubName} — Coefficients UEFA`;

  let meta, seasons;
  try {
    ({ meta, seasons } = await loadClubData(clubName));
  } catch (e) {
    document.getElementById("club-name").textContent = "Erreur de chargement";
    return;
  }

  // Header
  document.getElementById("club-name").textContent = clubName;
  document.getElementById("club-meta").textContent =
    [meta.city, meta.founded ? `Fondé en ${meta.founded}` : ""].filter(Boolean).join(" · ");

  const logoEl = document.getElementById("club-logo");
  if (meta.logo_url) {
    logoEl.src = meta.logo_url;
    logoEl.alt = clubName;
  } else {
    logoEl.style.display = "none";
  }

  // Calcul stats globales
  let totalWins = 0, totalDraws = 0, totalLosses = 0, totalPts = 0, totalMatches = 0;
  const seasonsUsed = new Set();
  const compStats = {};
  let bestRoundIdx = 0;
  const ROUND_ORDER = ["qualifying", "group", "R32", "R16", "QF", "SF", "F", "W"];

  for (const [key, s] of Object.entries(seasons)) {
    totalWins += s.wins || 0;
    totalDraws += s.draws || 0;
    totalLosses += s.losses || 0;
    totalPts += s.total_points || 0;
    totalMatches += s.total_matches || 0;
    seasonsUsed.add(s.season);

    const comp = s.competition;
    if (!compStats[comp]) compStats[comp] = { wins: 0, draws: 0, losses: 0, pts: 0, seasons: 0 };
    compStats[comp].wins += s.wins || 0;
    compStats[comp].draws += s.draws || 0;
    compStats[comp].losses += s.losses || 0;
    compStats[comp].pts += s.total_points || 0;
    compStats[comp].seasons++;

    const re = s.round_eliminated || "group";
    const reIdx = ROUND_ORDER.indexOf(re);
    if (reIdx > bestRoundIdx) bestRoundIdx = reIdx;
  }

  // Stats bar
  document.getElementById("stat-seasons").textContent = seasonsUsed.size;
  document.getElementById("stat-matches").textContent = totalMatches;
  document.getElementById("stat-w").textContent = totalWins;
  document.getElementById("stat-d").textContent = totalDraws;
  document.getElementById("stat-l").textContent = totalLosses;
  document.getElementById("stat-pts").textContent = totalPts.toFixed(2);
  document.getElementById("stat-ratio").textContent =
    totalMatches > 0 ? (totalPts / totalMatches).toFixed(3) : "—";
  document.getElementById("stat-best").textContent =
    ROUND_LABELS[ROUND_ORDER[bestRoundIdx]] || ROUND_ORDER[bestRoundIdx];

  // Graphe saison
  renderSeasonChart(seasons, meta.color || "#1A4B9B");

  // Répartition par compétition
  renderCompBreakdown(compStats);

  // Accordéon saisons
  renderSeasonsAccordion(seasons);
}

// ============================================================
// GRAPHE POINTS PAR SAISON (mini bar chart SVG)
// ============================================================
function renderSeasonChart(seasons, color) {
  const container = document.getElementById("season-chart-container");
  if (!container) return;

  // Trier les saisons chronologiquement
  const sorted = Object.values(seasons).sort((a, b) => {
    const ya = parseInt((a.season || "0").split("-")[0]);
    const yb = parseInt((b.season || "0").split("-")[0]);
    return ya - yb;
  });

  if (sorted.length === 0) return;

  const maxPts = Math.max(...sorted.map((s) => s.total_points || 0), 1);
  const barW = Math.max(12, Math.min(40, Math.floor(900 / sorted.length) - 4));
  const gap = 4;
  const chartH = 200;
  const labelH = 24;
  const totalW = sorted.length * (barW + gap);

  const bars = sorted.map((s, i) => {
    const pts = s.total_points || 0;
    const barH = Math.max(2, Math.floor((pts / maxPts) * chartH));
    const x = i * (barW + gap);
    const y = chartH - barH;
    const compColor = COMP_COLORS[s.competition] || color;
    const season = (s.season || "").replace(/\d{4}-(\d{2})/, "$&"); // keep as is
    const label = season.split("-")[0]; // just start year

    return `
      <g>
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}"
              fill="${escHtml(compColor)}" rx="2" opacity="0.85">
          <title>${escHtml(s.season)} — ${escHtml(s.competition)}: ${pts.toFixed(2)} pts</title>
        </rect>
        <text x="${x + barW / 2}" y="${chartH + 16}" text-anchor="middle"
              font-size="9" fill="#8b949e" transform="rotate(-45 ${x + barW / 2} ${chartH + 16})">
          ${escHtml(label)}
        </text>
      </g>`;
  }).join("");

  const svgH = chartH + labelH + 10;
  container.innerHTML = `
    <svg viewBox="0 0 ${totalW} ${svgH}" preserveAspectRatio="xMidYMid meet"
         style="width:100%;max-height:260px;display:block">
      ${bars}
    </svg>
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:0.5rem;font-size:0.72rem;color:#8b949e">
      ${Object.entries(COMP_COLORS).map(([c, col]) =>
        `<span><span style="display:inline-block;width:10px;height:10px;background:${col};border-radius:2px;margin-right:3px"></span>${escHtml(COMP_LABELS[c] || c)}</span>`
      ).join("")}
    </div>`;
}

// ============================================================
// RÉPARTITION PAR COMPÉTITION
// ============================================================
function renderCompBreakdown(compStats) {
  const el = document.getElementById("comp-breakdown");
  if (!el) return;

  const sorted = Object.entries(compStats).sort(([, a], [, b]) => b.pts - a.pts);

  el.innerHTML = sorted.map(([comp, s]) => {
    const color = COMP_COLORS[comp] || "#333";
    const label = COMP_LABELS[comp] || comp;
    const m = s.wins + s.draws + s.losses;
    return `
      <div class="comp-card" style="border-left-color:${escHtml(color)}">
        <div class="comp-card-title" style="color:${escHtml(color)}">${escHtml(label)}</div>
        <div class="comp-card-wdl">
          <span style="color:#2ea043;font-weight:600">${s.wins}V</span>
          <span style="color:#c9a227;margin:0 3px">${s.draws}N</span>
          <span style="color:#cf3d3d">${s.losses}D</span>
          <span style="color:#8b949e;margin-left:4px">(${m} matchs, ${s.seasons} saisons)</span>
        </div>
        <div class="comp-card-pts">${s.pts.toFixed(2)} pts</div>
      </div>`;
  }).join("");
}

// ============================================================
// ACCORDÉON SAISONS
// ============================================================
function renderSeasonsAccordion(seasons) {
  const el = document.getElementById("seasons-accordion");
  if (!el) return;

  const sorted = Object.values(seasons).sort((a, b) => {
    const ya = parseInt((a.season || "0").split("-")[0]);
    const yb = parseInt((b.season || "0").split("-")[0]);
    return yb - ya; // plus récent d'abord
  });

  el.innerHTML = sorted.map((s, i) => {
    const comp = s.competition;
    const compLabel = COMP_LABELS[comp] || comp;
    const compColor = COMP_COLORS[comp] || "#333";
    const roundLabel = ROUND_LABELS[s.round_eliminated] || s.round_eliminated || "?";
    const id = `se-${i}`;

    const matchRows = (s.matches || []).map((m) => {
      const isQual = m.is_qualifying ? " (qual.)" : "";
      const homeAway = m.home ? "Dom." : "Ext.";
      const score = m.score_for != null ? `${m.score_for}–${m.score_against}` : "—";
      const ptsTxt = m.uefa_points != null ? `+${m.uefa_points}` : "";
      const opponent = m.opponent && m.opponent !== "Adversaire"
        ? escHtml(m.opponent)
        : `<em style="color:#8b949e">Adversaire</em>`;
      const dateTxt = m.date ? escHtml(m.date) : "—";
      const roundTxt = escHtml(ROUND_LABELS[m.round] || m.round || "—");

      return `
        <tr>
          <td>${dateTxt}</td>
          <td>${roundTxt}${isQual ? `<span class="match-qual">${isQual}</span>` : ""}</td>
          <td>${homeAway}</td>
          <td>${opponent}</td>
          <td class="match-result-${m.result}">${score}</td>
          <td class="match-pts">${ptsTxt}</td>
        </tr>`;
    }).join("");

    const matchTable = matchRows
      ? `<table class="match-table">
           <thead><tr>
             <th>Date</th><th>Tour</th><th>H/E</th>
             <th>Adversaire</th><th>Score</th><th>Pts</th>
           </tr></thead>
           <tbody>${matchRows}</tbody>
         </table>`
      : "<p style='color:#8b949e;font-size:0.82rem'>Détail non disponible (données agrégées)</p>";

    return `
      <div class="season-entry">
        <div class="season-entry-header" id="hdr-${id}" onclick="toggleAccordion('${id}')">
          <span class="se-season">${escHtml(s.season || "—")}</span>
          <span class="se-comp" style="color:${escHtml(compColor)}">${escHtml(compLabel)}</span>
          <span class="se-round">${escHtml(roundLabel)}</span>
          <span class="se-wdl">
            <span style="color:#2ea043">${s.wins}V</span>
            <span style="color:#c9a227;margin:0 2px">${s.draws}N</span>
            <span style="color:#cf3d3d">${s.losses}D</span>
          </span>
          <span class="se-pts">${(s.total_points || 0).toFixed(2)} pts</span>
          <span class="se-chevron">›</span>
        </div>
        <div class="season-entry-body" id="body-${id}">
          <div style="font-size:0.78rem;color:#8b949e;margin-bottom:0.5rem">
            Pts match: <strong style="color:#e6edf3">${(s.uefa_match_points || 0).toFixed(2)}</strong>
            + Bonus parcours: <strong style="color:#e6edf3">${(s.bonus_points || 0).toFixed(2)}</strong>
            = <strong style="color:#FFD700">${(s.total_points || 0).toFixed(2)} pts</strong>
          </div>
          ${matchTable}
        </div>
      </div>`;
  }).join("");
}

function toggleAccordion(id) {
  const hdr = document.getElementById(`hdr-${id}`);
  const body = document.getElementById(`body-${id}`);
  if (!hdr || !body) return;
  const isOpen = hdr.classList.contains("open");
  hdr.classList.toggle("open", !isOpen);
  body.classList.toggle("open", !isOpen);
}

// ============================================================
// UTILITAIRES
// ============================================================
function escHtml(str) {
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
renderClubPage();
