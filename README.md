# Coefficient UEFA — Clubs français en coupes d'Europe

Site web interactif montrant la contribution historique des clubs français au coefficient UEFA, depuis les premières Coupes des Clubs Champions jusqu'à aujourd'hui.

🔗 **Démo** : [https://rgaspard.github.io/uefa/](https://rgaspard.github.io/uefa/) *(à mettre à jour)*

---

## Fonctionnalités

- **Classement général** : tous les clubs français triés par points UEFA totaux, avec V/N/D par compétition, ratio pts/match
- **Filtre par période** : slider date min/max pour recalculer le classement dynamiquement
- **Fiche club** : détail de toutes les participations européennes (matchs, adversaires, scores, dates, round atteint)
- **Bar chart race** : animation de l'évolution des points cumulés par club au fil des saisons
- **Responsive** : utilisable sur mobile

---

## Structure du projet

```
uefa/
├── build_seed_data.py      # Construit data/raw_matches.json depuis les données manuelles + scraping
├── generate_data.py        # Génère les JSON du site depuis raw_matches.json
├── scrape_wikipedia.py     # Scrape les résultats détaillés depuis Wikipedia
├── fetch_data.py           # Scraper worldfootball.net (historique)
├── download_logos.py       # Télécharge les logos des clubs
├── data/
│   └── raw_matches.json    # Tous les matchs (1 122 matchs, non versionné)
└── web/                    # Site statique (versionné sur GitHub Pages)
    ├── index.html          # Page principale (classement + filtres)
    ├── club.html           # Fiche détaillée d'un club
    ├── app.js              # Logique page principale
    ├── club.js             # Logique fiche club
    ├── barrace.js          # Bar chart race
    ├── style.css
    └── data/
        ├── clubs.json      # Stats agrégées par club
        ├── seasons.json    # Stats par saison par club
        ├── matches.json    # Tous les matchs enrichis
        ├── timeline.json   # Points cumulés par saison (bar chart race)
        └── clubs_meta.json # Métadonnées clubs (couleurs, logos, abréviations)
```

---

## Pipeline de données

```
build_seed_data.py  ──►  data/raw_matches.json  ──►  generate_data.py  ──►  web/data/*.json
     │                                                       │
     ├── SEED_HISTORY (données manuelles agrégées)           └── clubs.json
     ├── scrape_wikipedia.py (détail matchs par saison)          seasons.json
     └── worldfootball.net (scraping récent)                     matches.json
                                                                 timeline.json
```

**Pour régénérer les données :**
```bash
cd uefa/
python build_seed_data.py    # génère data/raw_matches.json
python generate_data.py      # génère web/data/*.json
```

**Pour servir le site localement :**
```bash
cd uefa/
python -m http.server 8765
# puis ouvrir http://localhost:8765/web/
```

---

## Sources de données

| Source | Usage | Couverture |
|--------|-------|------------|
| **Wikipedia** (fr + en) | Détail des matchs par saison et par compétition | 1955 → aujourd'hui |
| **RSSSF** (rsssf.org) | Archives historiques (pré-1990) | 1955 → 1990 |
| **eurotopteam.com** | Coefficients UEFA par club et par saison | 5 dernières saisons |
| **worldfootball.net** | Résultats détaillés par club et par saison | 1990 → aujourd'hui |
| **Données manuelles** (SEED_HISTORY) | Statistiques agrégées compilées manuellement | 1955 → 2024 |

Les données manuelles (`SEED_HISTORY` dans `build_seed_data.py`) sont la source principale pour les saisons historiques. Elles ont été compilées depuis Wikipedia, RSSSF et eurotopteam, et encodées sous forme agrégée (nb de V/N/D par phase : qualifications, phase de groupes, KO).

---

## Compétitions couvertes

| Code | Nom complet | Période |
|------|-------------|---------|
| `CC` | Coupe des Clubs Champions | 1955/56 → 1991/92 |
| `CWC` | Coupe des Vainqueurs de Coupe | 1960/61 → 1998/99 |
| `UEFA` | Coupe UEFA | 1971/72 → 2008/09 |
| `UCL` | Ligue des Champions UEFA | 1992/93 → aujourd'hui |
| `UEL` | Ligue Europa | 2009/10 → aujourd'hui |
| `UECL` | Ligue Europa Conférence | 2021/22 → aujourd'hui |

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

## Clubs couverts (19)

Paris Saint-Germain · Olympique Lyonnais · Olympique Marseille · AS Monaco ·
LOSC Lille · RC Lens · Girondins de Bordeaux · Stade Rennais · OGC Nice ·
Stade Brestois · RC Strasbourg · Toulouse FC · AJ Auxerre · AS Saint-Étienne ·
FC Nantes · Stade de Reims · SC Bastia · FC Sochaux · Montpellier HSC ·
EA Guingamp

---

## Chiffres clés (au 27/04/2026)

| Métrique | Valeur |
|----------|--------|
| Matchs dans la BDD | 1 122 |
| Saisons-clubs | 212 |
| Clubs couverts | 19 |
| Période couverte | 1955/56 → 2025/26 |
