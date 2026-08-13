# ☀️ PLEIN CIEL — Météo en direct

Application météo complète et installable (PWA) : pluie minute par minute,
prévisions 16 jours, pollen, qualité de l'air, conditions marines,
radar de précipitations, vent animé, alertes orage, heures dorées/bleues et lune.

🔗 En ligne : https://mikefri-studio.github.io/Plein_Ciel/

## ✨ Fonctionnalités

- 🌡️ Météo actuelle + prévisions sur 16 jours
- 🌧️ Pluie dans les 3 prochaines heures
- 🗺️ Carte interactive : radar RainViewer + particules de vent (sol ou 3 km)
- ⛈️ Alerte orage double source : modèle de prévision ET détection radar
- 🌼 Pollen & qualité de l'air
- 🌊 Conditions marines
- 📷 Heures dorées et heures bleues
- 🌙 Phase de la lune + course du soleil
- 📱 PWA installable, fonctionne hors-ligne

## 🛠️ Technologies
- **JS Vanilla** (Zéro dépendance)
- **Leaflet** (Carte)
- **Open-Meteo** (Météo)
- **RainViewer** (Radar)
- **GitHub Pages** (Hébergement)

## 📁 Structure
Le code est découpé en modules dans le dossier `js/` :
- `core.js` : état global, thèmes, calculs solaires
- `api.js` : appels API, géocodage
- `map.js` : carte, radar, vent
- `alerts.js` : alertes orage
- `render/` : rendu des widgets (1 fichier par widget)
- `ui/` : interfaces (recherche, favoris, réglages)

## 🚀 Lancer en local
`python3 -m http.server 8000`

## 📱 Appli Android (dépôt séparé : plein-ciel-app)
WebView React Native + 4 widgets natifs Kotlin.
