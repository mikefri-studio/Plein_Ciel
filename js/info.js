"use strict";
/* ================= FENÊTRES « À PROPOS » ================= */
const INFO={
 rain:{t:'Pluie dans les prochaines heures',x:'Basé sur la prévision de pluie pas à pas (toutes les 15 min), sur un horizon de <b>3 heures</b>.<br>· Le <b>texte</b> annonce quand la pluie commence ou s\'arrête.<br>· La <b>jauge</b> représente les 3 prochaines heures : chaque segment = 15 min ; plus le bleu est intense, plus il pleut.'},
 outfit:{t:'Que porter aujourd\'hui',x:'Conseil calculé avec la <b>température ressentie</b>, le vent, la pluie attendue et l\'indice UV.<br>Les pastilles listent les accessoires utiles du moment : parapluie, crème solaire, bonnet…'},
 activities:{t:'Activités du jour',x:'Chaque activité est notée de <b>0 à 5 points</b> selon la météo (température, vent, pluie, UV).<br>5 points = conditions idéales ; 0-1 point = à éviter ou à reporter.'},
 stats:{t:'Indicateurs actuels',x:'· <b>Vent</b> : la flèche indique la direction d\'où vient le vent.<br>· <b>Point de rosée</b> : au-dessus de 18 °C, l\'air paraît lourd.<br>· <b>Pression</b> : &gt; 1020 hPa = temps stable, &lt; 1005 hPa = temps perturbé.<br>· <b>UV</b> : le curseur place l\'indice sur l\'échelle de 0 à 11+.<br>· <b>Visibilité</b> et <b>nébulosité</b> : part de ciel couvert.'},
 hours:{t:'Les prochaines 24 heures',x:'Faites défiler horizontalement.<br>· La <b>courbe</b> suit l\'évolution de la température.<br>· Le pourcentage bleu = <b>probabilité de pluie</b> à cette heure.<br>· Une heure encadrée d\'orange signale un <b>risque d\'orage</b>.'},
 days:{t:'Sur les 16 prochains jours',x:'Chaque ligne = un jour : météo, probabilité de pluie, températures min et max.<br>La <b>barre colorée</b> place la fourchette du jour entre le jour le plus froid et le plus chaud de la période : une barre longue et à droite = journée chaude.'},
 sun:{t:'Course du soleil',x:'L\'arc représente la trajectoire du soleil entre le <b>lever</b> et le <b>coucher</b>.<br>Le <b>point lumineux</b> indique sa position actuelle ; la durée du jour est affichée au centre.'},
 climate:{t:'Il y a 1 an',x:'Compare la température maximale d\'aujourd\'hui avec celle du <b>même jour l\'an dernier</b> (données réanalysées ERA5).<br>Le badge indique si c\'est nettement plus chaud, plus frais ou équivalent.'},
 photo:{t:'Lumière photo',x:'Horaires calculés par astronomie pour votre position exacte.<br>· <b>Heure dorée</b> : lumière chaude et rasante, soleil entre 0 et 6°.<br>· <b>Heure bleue</b> : ciel bleu profond juste avant le lever / après le coucher.<br>La ligne surlignée d\'or = créneau en cours.'},
 moon:{t:'Lune',x:'Le dessin montre la partie éclairée de la Lune visible ce soir.<br>Le pourcentage = fraction du disque illuminée ; le texte donne la phase (croissant, quartier, pleine lune…).'},
 air:{t:'Qualité de l\'air',x:'<b>Indice européen</b> de 0 (très bon) à plus de 100 (exécrable).<br>PM2,5 / PM10 = particules fines en µg/m³ : plus la valeur est basse, mieux c\'est.<br>Si le service est en panne, les dernières valeurs connues sont affichées et le site réessaie tout seul.'},
 pollen:{t:'Pollen & allergies',x:'Pic du jour pour chaque pollen (grains/m³).<br>La <b>barre</b> et le label donnent le niveau de risque d\'allergie : nul, faible, modéré, élevé, très élevé.<br><i>Prévision CAMS — Europe uniquement.</i>'},
 marine:{t:'Conditions marines',x:'Données du point de mer le plus proche.<br>· <b>Eau</b> : température de la mer.<br>· <b>Vagues / houle</b> : hauteur en mètres et direction d\'origine.<br>· <b>Période</b> : temps entre deux vagues ; plus elle est longue, plus la houle est établie.'},
 map:{t:'Carte radar & vent',x:'· <b>Radar</b> : précipitations des 2 dernières heures + courte prévision, en différé d\'environ 20-30 min (temps de traitement).<br>· <b>Vent</b> : particules animées (direction et force).<br>▶ anime la frise, le curseur déplace l\'heure, « Opacité » règle le calque radar.'},
 swind:{t:'Vent',x:'Vitesse moyenne du vent à <b>10 m du sol</b>. La boussole indique la direction <b>d\'où vient</b> le vent (NE = vent venant du nord-est).'},
 sgust:{t:'Rafales',x:'Vitesse maximale du vent sur quelques secondes. Elles deviennent dangereuses au-delà de ~80 km/h.'},
 shum:{t:'Humidité',x:'Part de vapeur d\'eau dans l\'air. <b>&lt; 35 %</b> : air sec · <b>&gt; 70 %</b> : air humide · au-delà de 80 % avec la chaleur : sensation de lourdeur.'},
 sdew:{t:'Point de rosée',x:'Température à laquelle l\'air devient saturé. <b>&lt; 10°</b> : air sec · <b>16-18°</b> : confortable · <b>&gt; 20°</b> : temps lourd, propice aux orages.'},
 spress:{t:'Pression',x:'Pression ramenée au niveau de la mer. <b>&gt; 1020 hPa</b> : anticyclone, temps stable · <b>&lt; 1005 hPa</b> : dépression, temps perturbé. Une chute rapide annonce souvent du vent.'},
 suv:{t:'Indice UV',x:'Intensité du rayonnement ultraviolet au sol. <b>0-2</b> faible · <b>3-5</b> modéré · <b>6-7</b> élevé (protection conseillée) · <b>8-10</b> très élevé · <b>11+</b> extrême.'},
 svis:{t:'Visibilité',x:'Distance maximale à laquelle on distingue un objet. Sous 5 km : brume, brouillard ou pluie · au-dessus de 10 km : bonne visibilité.'},
 scloud:{t:'Nébulosité',x:'Fraction du ciel couverte par les nuages. 0 % = ciel dégagé · 100 % = ciel totalement couvert.'}
};
function openInfo(k){
  const d=INFO[k]; if(!d)return;
  $('#imTitle').textContent=d.t;
  $('#imTxt').innerHTML=d.x;
  $('#infoModal').classList.add('open');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('.info-btn');
  if(b){ openInfo(b.dataset.info); return; }
  const st=e.target.closest('.stat[data-info]');
  if(st){ openInfo(st.dataset.info); return; }
  if(e.target.id==='infoModal') $('#infoModal').classList.remove('open');
});
$('#imClose').addEventListener('click',()=>$('#infoModal').classList.remove('open'));
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ $('#infoModal').classList.remove('open'); $('#settingsModal').classList.remove('open'); } });

