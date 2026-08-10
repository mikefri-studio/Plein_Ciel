"use strict";

function openVersions() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">📋 Historique des versions</div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
        <div class="version-item">
          <div class="version-head">
            <span class="version-num">v1.4.0</span>
            <span class="version-date">11 août 2026</span>
          </div>
          <ul class="version-list">
            <li>⚡ Détection radar des orages : la bannière d'alerte se déclenche même si le modèle météo ne prévoit rien (lecture des pixels à ta position)</li>
            <li>🌬️ Sélecteur vent sol / vent 3 km : les particules peuvent maintenant suivre le vent d'altitude (celui qui pousse les nuages)</li>
            <li>⚙️ Réglages d'alerte déplacés dans la modale (plus de boutons parasites pendant l'orage)</li>
            <li>🏗️ Code découpé en ~20 modules spécialisés (plus maintenable)</li>
            <li>📖 Documentation complète (README.md)</li>
          </ul>
        </div>

        <div class="version-item">
          <div class="version-head">
            <span class="version-num">v1.3.0</span>
            <span class="version-date">10 août 2026</span>
          </div>
          <ul class="version-list">
            <li>🏙️ Géolocalisation auto avec nom de la ville (plus "Ma position" ni "Lieu partagé")</li>
            <li>🗺️ Fond de carte plan corrigé (CARTO au lieu d'OSM qui ne chargeait plus)</li>
            <li>💨 Vent visible partout (adaptation bleu/blanc selon le fond)</li>
            <li>ℹ️ Indicateurs cliquables avec explications détaillées (boutons ⓘ)</li>
            <li>🔒 Stockage localStorage sécurisé (JSON.stringify/parse partout)</li>
          </ul>
        </div>

        <div class="version-item">
          <div class="version-head">
            <span class="version-num">v1.2.0</span>
            <span class="version-date">9 août 2026</span>
          </div>
          <ul class="version-list">
            <li>⛈️ Bannière d'alerte orage avec 3 niveaux (à venir / imminent / en cours)</li>
            <li>🌼 Pollen en cache (évite les requêtes répétées)</li>
            <li>🔔 Notifications navigateur optionnelles</li>
            <li>🔊 Bip sonore désactivable</li>
          </ul>
        </div>

        <div class="version-item">
          <div class="version-head">
            <span class="version-num">v1.0.0</span>
            <span class="version-date">8 août 2026</span>
          </div>
          <ul class="version-list">
            <li>🌡️ Météo actuelle + prévisions 16 jours (Open-Meteo)</li>
            <li>🌧️ Pluie dans les 3 prochaines heures (pas de 15 min)</li>
            <li>🗺️ Carte interactive avec radar RainViewer animé</li>
            <li>💨 Particules de vent animées</li>
            <li>📱 PWA installable (Android / iPhone)</li>
            <li>🌼 Pollen & qualité de l'air (Europe)</li>
            <li>🌊 Conditions marines (vagues, houle, température eau)</li>
            <li>📷 Heures dorées et heures bleues</li>
            <li>🌙 Phase de la lune + course du soleil</li>
            <li>🧥 Conseils "que porter" + activités du jour</li>
            <li>⭐ Favoris, recherche de villes</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// Clic sur la version dans le pied de page
document.addEventListener('DOMContentLoaded', () => {
  const ver = document.querySelector('.footer-version');
  if (ver) ver.addEventListener('click', openVersions);
});
