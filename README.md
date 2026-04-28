# Coefficient UEFA — Clubs français en coupes d'Europe

Site web interactif montrant la contribution historique des clubs français au coefficient UEFA, depuis les premières Coupes des Clubs Champions jusqu'à aujourd'hui.

🔗 **Démo** : [https://rgaspard.github.io/uefa/](https://rgaspard.github.io/uefa/)

---

## Fonctionnalités

- **Classement général** : tous les clubs français triés par points UEFA totaux, avec J/V/N/D, Bp/Bc/Diff, ratio pts/match, participations par compétition (C1/C2/C3/C4)
- **Totaux de référence** : colonnes J/V/N/D reflètent les données exactes de pari-et-gagne.com (sans filtre)
- **Filtre par période** : slider date min/max pour recalculer le classement dynamiquement
- **Fiche club** : détail de toutes les participations européennes (matchs, adversaires, scores, round atteint)
- **Bar chart race** : animation de l'évolution des points cumulés par club au fil des saisons
- **Logos des clubs** : 37 logos en local (images/logos/*.gif)
- **Responsive** : utilisable sur mobile

---

## Structure du projet

```
uefa/
├── build_seed_data.py      # Construit data/raw_matches.json (toutes sources)
├── generate_data.py        # Génère les JSON du site depuis raw_matches.json
├── scrape_peg_seasons.py   # Scrape pari-et-gagne.com (source principale, 1955→2026)
├── scrape_wikipedia.py     # Scrape Wikipedia (UCL/UEL/UECL post-2016)
├── download_logos.py       # Télécharge les logos des clubs
├── data/
│   ├── raw_matches.json        # Tous les matchs (~2811 matchs, non versionné)
│   ├── real_matches_peg.json   # Matchs scrapés pari-et-gagne.com (non versionné)
│   └── real_matches_cc_ucl.json
└── web/                    # Site statique (versionné sur GitHub Pages)
    ├── index.html
    ├── app.js
    ├── style.css
    ├── images/logos/       # 37 logos .gif clubs français
    └── data/
        ├── clubs.json
        ├── seasons.json
        ├── matches.json
        ├── timeline.json
        └── clubs_meta.json
```

---

## Pipeline de données

```
scrape_peg_seasons.py  ──►  data/real_matches_peg.json   ─┐
scrape_wikipedia.py    ──►  data/real_matches_wikipedia.json ─┤
SEED_HISTORY (manual)                                     ─┤
                                                           ▼
                          build_seed_data.py  ──►  data/raw_matches.json
                                                           │
                                                           ▼
                          generate_data.py  ──►  web/data/*.json
```

**Priorité des sources** (ordre décroissant) :
1. `manual` — matchs PSG 2024-25 encodés manuellement (17 matchs)
2. `peg_season` — pari-et-gagne.com (2298 matchs, toutes compétitions 1955–2026)
3. `wikipedia_knockout` / `wikipedia_group_synth` — Wikipedia post-2016
4. `real_matches_cc_ucl` — archives CC/UCL historiques (comble les lacunes PEG)
5. `synthetic` — données SEED_HISTORY agrégées (fallback pour saisons non couvertes)

**Pour régénérer les données :**
```bash
cd uefa/
python scrape_peg_seasons.py   # scrape pari-et-gagne.com (~70 saisons)
python build_seed_data.py      # génère data/raw_matches.json
python generate_data.py        # génère web/data/*.json
```

**Pour servir le site localement :**
```bash
cd uefa/web/
python -m http.server 8080
# puis ouvrir http://localhost:8080/
```

---

## Sources de données

| Source | Usage | Couverture | Matchs |
|--------|-------|------------|--------|
| **pari-et-gagne.com** | Matchs détaillés toutes compétitions | 1955 → 2026 | ~2300 |
| **Wikipedia** (fr + en) | UCL/UEL/UECL post-2016 | 2016 → aujourd'hui | ~250 |
| **SEED_HISTORY** (manuel) | Stats agrégées (fallback) | 1955 → 2024 | synthétique |
| **Matchs manuels** | PSG UCL 2024-25 | 2024-25 | 17 |

---

## Compétitions couvertes

| Code | Nom complet | Période |
|------|-------------|---------|
| `CC` | Coupe des Clubs Champions | 1955/56 → 1991/92 |
| `CWC` | Coupe des Vainqueurs de Coupe | 1960/61 → 1998/99 |
| `UCL` | Ligue des Champions UEFA | 1992/93 → aujourd'hui |
| `UEL` | Ligue Europa (+ Coupe UEFA) | 1971/72 → aujourd'hui |
| `UECL` | Ligue Europa Conférence | 2021/22 → aujourd'hui |
| `IT` | Coupe Intertoto | 1995 → 2008 |

---

## Hypothèses de calcul du coefficient UEFA

Le coefficient est calculé comme suit pour chaque match :

### Points par résultat de match

| Résultat | Phase principale | Tour de qualification |
|----------|-----------------|----------------------|
| Victoire | 2 pts | 1 pt |
| Nul | 1 pt | 0.5 pt |
| Défaite | 0 pt | 0 pt |

> Les tours de qualification (avant la phase de groupes ou la phase de ligue) comptent pour **moitié**.

### Points bonus par tour de phase éliminatoire

Ces bonus s'ajoutent aux points de match pour chaque tour atteint en phase à élimination directe.

**Depuis 2021/22** (nouveau format UCL phase de ligue) :

| Compétition | Bonus par tour KO (R16, QF, SF, F) |
|-------------|-------------------------------------|
| UCL | +1.5 pt par tour |
| UEL | +1.0 pt par tour |
| UECL | +0.5 pt par tour |

**De 2009/10 à 2020/21** :

| Compétition | Bonus par tour KO (R16, QF, SF, F) |
|-------------|-------------------------------------|
| UCL | +1.0 pt par tour |
| UEL | +1.0 pt par tour |

**Avant 2009/10** (anciennes compétitions) :

| Compétition | Tours bonus | Bonus par tour |
|-------------|------------|----------------|
| UCL (CL) | R16, QF, SF, F | +1.0 pt |
| CC | QF, SF, F | +1.0 pt |
| CWC | QF, SF, F | +1.0 pt |
| UEFA (Coupe UEFA) | R16, QF, SF, F | +1.0 pt |

> **Note** : Le vrai coefficient UEFA officiel inclut également un bonus de participation (+1 pt pour les petits pays) et depuis 2021 des bonus de classement en phase de ligue (positions 1-8 dans la phase UCL). Ces bonus ne sont **pas implémentés** car ils nécessitent des données de classement complet difficiles à récupérer historiquement. Le coefficient affiché est donc une **approximation** basée uniquement sur les résultats des matchs et les tours atteints.

### Limites connues

- Les pénalties aux tirs au but ne sont pas distingués des défaites en temps réglementaire (traités comme défaite `L`)
- Les matchs joués sur terrain neutre sont traités comme des matchs "à l'extérieur"
- Pour les saisons agrégées (pré-2000 environ), les matchs synthétiques sont générés à partir des stats V/N/D par phase : les adversaires, scores exacts et dates ne sont pas disponibles
- Le coefficient officiel UEFA ne s'applique qu'aux 5 dernières saisons ; ici on calcule sur **toute l'histoire** pour comparaison

---

## Clubs couverts (37)

Paris Saint-Germain · Olympique Lyonnais · Olympique Marseille · AS Monaco ·
LOSC Lille · RC Lens · Girondins de Bordeaux · Stade Rennais · OGC Nice ·
Stade Brestois · RC Strasbourg · Toulouse FC · AJ Auxerre · AS Saint-Étienne ·
FC Nantes · Stade de Reims · SC Bastia · FC Sochaux · Montpellier HSC ·
EA Guingamp · FC Metz · AS Nancy Lorraine · AS Cannes · FC Lorient ·
FC Gueugnon · FC Rouen · SM Caen · Stade Lavallois · Stade Français ·
Angoulême CFC · Nîmes Olympique · CS Sedan Ardennes · SCO Angers ·
Racing CF · Berrichonne Châteauroux · ES Troyes AC · Toulouse FC 1937-67

---

## Chiffres clés (au 28/04/2026)

| Métrique | Valeur |
|----------|--------|
| Matchs dans la BDD | 2 811 |
| Saisons-clubs | 507 |
| Clubs couverts | 37 |
| Période couverte | 1955/56 → 2025/26 |
