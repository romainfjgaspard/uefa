/**
 * bonus.js — 🎭 Simulations parallèles : l'histoire du football aurait pu être si différente…
 *
 * Simulation 1 : "Polo prend les rênes de l'OM" (2005-2025) puis "Polo au Canari" (2025+)
 * Simulation 2 : "Le penalty de Nilmar" — OL vainqueur de l'UCL 2004-05
 */

const BONUS_COLORS = {
  'Paris Saint-Germain':   '#5599cc',
  'Olympique Lyonnais':    '#4466cc',
  'Olympique Marseille':   '#35b8e8',
  'AS Monaco':             '#ff6677',
  'Girondins de Bordeaux': '#5577bb',
  'AS Saint-Étienne':      '#44bb66',
  'LOSC Lille':            '#cc4444',
  'FC Nantes':             '#bbaa00',
  'AJ Auxerre':            '#5599dd',
  'RC Strasbourg':         '#4477bb',
};

async function bonusInit() {
  if (window._bonusInitDone) return;
  window._bonusInitDone = true;

  try {
    const resp = await fetch('data/timeline.json');
    const timeline = await resp.json();
    buildBonusChart(timeline);
  } catch (e) {
    const el = document.getElementById('bonus-chart');
    if (el) el.insertAdjacentHTML('afterend', `<p style="color:#f88;padding:1rem">Erreur chargement : ${e.message}</p>`);
  }
}

// ─────────────────────────────────────────────────────────────────
// CHART
// ─────────────────────────────────────────────────────────────────
function buildBonusChart(timeline) {
  // Top 10 clubs à la dernière saison
  const lastFrame = timeline[timeline.length - 1];
  const top10Names = Object.entries(lastFrame.scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name]) => name);

  // Saisons réelles + 4 saisons futures pour la projection Nantes
  const realSeasons = timeline.map(f => f.season);
  const futureSeasons = ['2026-27', '2027-28', '2028-29', '2029-30'];
  const allSeasons = [...realSeasons, ...futureSeasons];

  // ── Datasets clubs réels ──────────────────────────────────────
  const datasets = top10Names.map(name => ({
    label: shortName(name),
    data: allSeasons.map(s => {
      const frame = timeline.find(f => f.season === s);
      return frame ? (frame.scores[name] ?? null) : null;
    }),
    borderColor: BONUS_COLORS[name] || '#888',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    tension: 0.2,
    pointRadius: 0,
    spanGaps: true,
  }));

  // ── Simulation OM Polo ────────────────────────────────────────
  datasets.push({
    label: '🔴⚪ OM — Polo aux rênes (2005-2025)',
    data: buildOMPoloData(allSeasons, timeline),
    borderColor: '#ff8833',
    backgroundColor: 'rgba(255,136,51,0.07)',
    borderWidth: 3,
    borderDash: [8, 4],
    tension: 0.3,
    pointRadius: 0,
    spanGaps: true,
  });

  // ── Simulation Nantes Polo ────────────────────────────────────
  datasets.push({
    label: '💛 FCN — Polo le Canari (2025+)',
    data: buildNantesPoloData(allSeasons, timeline),
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 3,
    borderDash: [4, 4],
    tension: 0.4,
    pointRadius: (ctx) => {
      const idx = allSeasons.indexOf('2025-26');
      return ctx.dataIndex >= idx ? 4 : 0;
    },
    spanGaps: false,
  });

  // ── Simulation OL Nilmar ──────────────────────────────────────
  datasets.push({
    label: '⚽ OL — Le penalty de Nilmar (2005)',
    data: buildOLNilmarData(allSeasons, timeline),
    borderColor: '#aaee33',
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderDash: [6, 3],
    tension: 0.3,
    pointRadius: 0,
    spanGaps: true,
  });

  // ── Rendu ─────────────────────────────────────────────────────
  const canvas = document.getElementById('bonus-chart');
  new Chart(canvas, {
    type: 'line',
    data: { labels: allSeasons, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#ccc',
            font: { size: 11 },
            usePointStyle: true,
            padding: 12,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(13,17,23,0.92)',
          titleColor: '#eee',
          bodyColor: '#bbb',
          borderColor: '#30363d',
          borderWidth: 1,
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return v != null ? `${ctx.dataset.label}: ${v.toFixed(1)}` : null;
            },
          },
          filter: item => item.parsed.y != null,
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 14,
            color: '#777',
            font: { size: 10 },
            maxRotation: 45,
          },
          grid: { color: '#21262d' },
        },
        y: {
          ticks: { color: '#777' },
          grid: { color: '#21262d' },
          title: { display: true, text: 'Points UEFA cumulés', color: '#888' },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// SIMULATION : OM sous Polo (2005-2025)
// Polo arrive en 2005 → OM gagne +14 pts/saison en extra (UCL profond chaque année)
// Polo part fin 2024-25 → OM retombe sur sa croissance naturelle
// ─────────────────────────────────────────────────────────────────
function buildOMPoloData(allSeasons, timeline) {
  const POLO_START_YEAR = 2005;
  const POLO_END_YEAR   = 2024; // Dernière saison Polo = 2024-25
  const EXTRA_PER_SEASON = 14;

  // Nombre de saisons Polo dans la timeline
  const poloFrames = timeline.filter(f => {
    const y = seasonYear(f.season);
    return y >= POLO_START_YEAR && y <= POLO_END_YEAR;
  });
  const extraAtEnd = poloFrames.length * EXTRA_PER_SEASON;

  // Valeur OM à la fin de l'ère Polo (saison 2024-25 = year 2024)
  const poloEndFrame = [...timeline].reverse().find(f => seasonYear(f.season) === POLO_END_YEAR);
  const omAtPoloEnd = poloEndFrame ? (poloEndFrame.scores['Olympique Marseille'] ?? null) : null;

  const data = [];
  let runningCount = 0;

  for (const s of allSeasons) {
    const frame = timeline.find(f => f.season === s);
    const realOm = frame ? (frame.scores['Olympique Marseille'] ?? null) : null;
    const y = seasonYear(s);

    if (y < POLO_START_YEAR) {
      data.push(realOm);
    } else if (y <= POLO_END_YEAR) {
      if (frame) runningCount++;
      data.push(realOm !== null ? realOm + runningCount * EXTRA_PER_SEASON : null);
    } else {
      // Après Polo : OM garde son niveau élevé + croissance réelle
      if (realOm !== null && omAtPoloEnd !== null) {
        data.push((omAtPoloEnd + extraAtEnd) + (realOm - omAtPoloEnd));
      } else {
        data.push(null);
      }
    }
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────
// SIMULATION : FC Nantes sous Polo (2025+)
// Polo révèle qu'il a toujours été Nantais. Catastrophe pour l'OM, révolution pour les Canaris.
// Données réelles jusqu'en 2024-25, puis trajectoire explosive
// ─────────────────────────────────────────────────────────────────
function buildNantesPoloData(allSeasons, timeline) {
  const POLO_NANTES_YEAR = 2025; // saison 2025-26 = premiere sous Polo
  const EXTRA_PER_FUTURE_SEASON = 22; // Polo transforme Nantes en machine UCL

  // Valeur FCN à la saison de transition (2025-26)
  const startFrame = timeline.find(f => seasonYear(f.season) === POLO_NANTES_YEAR);
  const baseNantes = startFrame ? (startFrame.scores['FC Nantes'] ?? 138) : 138;

  const data = [];
  for (const s of allSeasons) {
    const frame = timeline.find(f => f.season === s);
    const y = seasonYear(s);

    if (y < POLO_NANTES_YEAR) {
      data.push(frame ? (frame.scores['FC Nantes'] ?? null) : null);
    } else if (y === POLO_NANTES_YEAR) {
      // Première saison Polo : légère amélioration (recrutement ciblé)
      data.push(baseNantes + 7);
    } else {
      // Projections futures : Polo transforme les Canaris en mastodontes
      const fut = y - POLO_NANTES_YEAR;
      data.push(baseNantes + 7 + fut * EXTRA_PER_FUTURE_SEASON);
    }
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────
// SIMULATION : OL — Le penalty de Nilmar (2004-05)
// L'arbitre laisse jouer → OL remporte l'UCL. Boost initial + effet boule de neige.
// +15 pts en 2004-05, puis +7 pts/saison de sur-performance (jusqu'à 2018)
// ─────────────────────────────────────────────────────────────────
function buildOLNilmarData(allSeasons, timeline) {
  const NILMAR_YEAR     = 2004; // saison 2004-05
  const INITIAL_BOOST   = 15;   // victoire UCL au lieu de perdre en SF
  const EXTRA_PER_SEASON = 7;   // effet psychologique / recrutement post-titre
  const DECAY_YEAR      = 2018; // la magie finit par s'estomper…

  const data = [];
  for (const s of allSeasons) {
    const frame = timeline.find(f => f.season === s);
    const realOl = frame ? (frame.scores['Olympique Lyonnais'] ?? null) : null;
    const y = seasonYear(s);

    if (y < NILMAR_YEAR) {
      data.push(realOl);
    } else if (y === NILMAR_YEAR) {
      data.push(realOl !== null ? realOl + INITIAL_BOOST : null);
    } else {
      if (realOl !== null) {
        const seasonsAfter = Math.min(y - NILMAR_YEAR, DECAY_YEAR - NILMAR_YEAR);
        const extra = INITIAL_BOOST + seasonsAfter * EXTRA_PER_SEASON;
        data.push(realOl + extra);
      } else {
        data.push(null);
      }
    }
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────
function seasonYear(s) {
  return parseInt((s || '0').split('-')[0]);
}

function shortName(name) {
  const MAP = {
    'Paris Saint-Germain':   'PSG',
    'Olympique Lyonnais':    'OL',
    'Olympique Marseille':   'OM',
    'AS Monaco':             'ASM',
    'Girondins de Bordeaux': 'GDB',
    'AS Saint-Étienne':      'ASSE',
    'LOSC Lille':            'LOSC',
    'FC Nantes':             'FCN',
    'AJ Auxerre':            'AJA',
    'RC Strasbourg':         'RCS',
  };
  return MAP[name] || name;
}
