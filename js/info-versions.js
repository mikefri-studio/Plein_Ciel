"use strict";
(function(){
  const st=document.createElement('style');
  st.textContent='.footer-version{cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}.footer-version:hover{color:var(--accent,#ffd166)}';
  document.head.appendChild(st);
})();

/* Rend le numéro de version cliquable (injecté par main.js dans #appVersion) */
(function(){
  function bind(){
    const el=document.getElementById('appVersion');
    if(el && !el.classList.contains('footer-version')){
      el.classList.add('footer-version');
      el.title='Historique des versions';
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();

function versionBlock(num,date,items){
  return '<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.12)">'
   +'<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:700;color:#ffd166">v'+num+'</span><span style="opacity:.6;font-size:12px">'+date+'</span></div>'
   +'<ul style="margin:0;padding-left:18px">'+items.map(i=>'<li style="margin-bottom:5px">'+i+'</li>').join('')+'</ul></div>';
}

function openVersions(){
  if(document.getElementById('versionsModal'))return;
  const ov=document.createElement('div');
  ov.id='versionsModal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(4,10,25,.6);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div style="max-width:600px;width:100%;max-height:82vh;overflow-y:auto;background:rgba(13,25,48,.97);border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:20px 22px;color:#eef4ff;box-shadow:0 24px 70px rgba(0,0,0,.55);font-size:14px;line-height:1.55">'
  +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><b style="font-size:17px">📋 Historique des versions</b><button id="verClose" style="background:none;border:none;color:#eef4ff;font-size:18px;cursor:pointer">✕</button></div>'
  +versionBlock('1.4.2','11 août 2026',[
    '📱 Appli Android : pied de page au-dessus des boutons de navigation'
  ])
+versionBlock('1.4.1','11 août 2026',[
    '📱 Safe areas : site hors barres système Android/iOS',
    '🤖 Appli : widget 24 h avec titre PLEIN CIEL + heure de MAJ'
  ])
+versionBlock('1.4.0','10 août 2026',[
    '⚡ Détection radar des orages : alerte même si le modèle ne prévoit rien',
    '🌬️ Sélecteur vent sol / vent 3 km',
    '⚙️ Réglages d\'alerte déplacés dans ⚙️',
    '🏗️ Code découpé en ~20 modules',
    '📖 README + historique des versions'
  ])
  +versionBlock('1.3.0','10 août 2026',[
    '🏙️ Nom de ville automatique à la géolocalisation',
    '🗺️ Fond plan corrigé (CARTO)',
    '💨 Vent visible sur tous les fonds',
    'ℹ️ Indicateurs cliquables avec explications'
  ])
  +versionBlock('1.2.0','9 août 2026',[
    '⛈️ Bannière d\'alerte orage 3 niveaux',
    '🔔 Notifications + bip sonore optionnels',
    '🌼 Pollen mis en cache'
  ])
  +versionBlock('1.0.0','8 août 2026',[
    '🌡️ Météo + 16 jours + pluie minute',
    '🗺️ Radar animé + particules de vent',
    '🌼☀️🌙 Pollen, marine, soleil, lune',
    '🧥 Conseils tenue + activités',
    '📱 PWA installable hors-ligne'
  ])
  +'</div>';
  document.body.appendChild(ov);
  ov.querySelector('#verClose').addEventListener('click',()=>ov.remove());
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
}

document.addEventListener('click',e=>{
  if(e.target.closest && e.target.closest('.footer-version')) openVersions();
});
