"use strict";

/* ================= CONTRÔLES CARTE ================= */
$('#playBtn').addEventListener('click',togglePlay);
$('#frameRange').addEventListener('input',e=>{ if(state.radar.playing)togglePlay(); setFrame(+e.target.value); });

$$('#baseSeg button').forEach(b=>b.addEventListener('click',()=>{
  $$('#baseSeg button').forEach(x=>x.classList.toggle('on',x===b));
  if(!state.map)return;
  state.baseMode=b.dataset.b;
const sat=b.dataset.b==='sat';
  const want=sat?state.bases.sat:state.bases.plan, other=sat?state.bases.plan:state.bases.sat;
  state.map.removeLayer(other); want.addTo(state.map);
  if(sat)state.bases.labels.addTo(state.map); else state.map.removeLayer(state.bases.labels);
}));
$('#windToggle').addEventListener('change',e=>{
  state.windOn=e.target.checked;
  if(state.windLayer&&state.windLayer._canvas){
    state.windLayer._canvas.style.display=state.windOn?'':'none';
    if(state.windOn)state.windLayer._ensureParts();
  }
});
$$('#windLevelSeg button').forEach(b=>b.addEventListener('click',async()=>{
  if(state.windChoice===b.dataset.l)return;
  state.windChoice=b.dataset.l;
  $$('#windLevelSeg button').forEach(x=>x.classList.toggle('on',x===b));
  toast(b.dataset.l==='700'?'Particules : vent à 3 km (celui qui pousse les nuages)':'Particules : vent au sol (10 m)');
  state.wind=await fetchWindGrid(state.loc.lat,state.loc.lon);
  updateWindParticles();
}));


// Bouton de test des notifications (Android/iOS native app)
const testBtn = $('#testNotifBtn');
if (testBtn) {
  testBtn.addEventListener('click', () => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('test_notification');
      toast('Notification envoyée ! Vérifiez votre téléphone 🔔');
    } else {
      toast('Ce bouton ne fonctionne que dans l\'application native 📱');
    }
  });
}

// Détail horaire au clic sur un jour
function showDayDetail(dayIndex) {
  const fc = state.fc;
  if (!fc || !fc.daily || !fc.hourly) return;
  
  const d = fc.daily;
  const h = fc.hourly;
  
  // Date du jour sélectionné
  const dateStr = d.time[dayIndex];
  const date = new Date(dateStr + 'T12:00');
  const title = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Lever/coucher soleil
  const sunrise = new Date(d.sunrise[dayIndex]).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sunset = new Date(d.sunset[dayIndex]).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  // Extraire les données horaires pour ce jour
  const dayStart = dateStr + 'T00:00';
  const dayEnd = dateStr + 'T23:00';
  const startIndex = h.time.indexOf(dayStart);
  const endIndex = h.time.indexOf(dayEnd);
  
  if (startIndex === -1 || endIndex === -1) {
    console.warn('Données horaires non trouvées pour ce jour');
    return;
  }
  
  // Générer les lignes horaires
  let hoursHtml = '';
  for (let i = startIndex; i <= endIndex; i++) {
    const time = new Date(h.time[i]).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const temp = Math.round(h.temperature_2m[i]);
    const code = h.weather_code[i];
    const pop = h.precipitation_probability ? h.precipitation_probability[i] : null;
    
    hoursHtml += `
      <div class="day-hour-row">
        <span class="day-hour-time">${time}</span>
        <span class="day-hour-icon">${icon(code, h.is_day[i]==1)}</span>
        <span class="day-hour-temp">${temp}°</span>
        <span class="day-hour-rain">${pop >= 5 ? '💧 ' + pop + '%' : ''}</span>
      </div>
    `;
  }
  
  // Remplir le modal
  $('#dayDetailTitle').textContent = title;
  $('#dayDetailSun').innerHTML = `
    <span>🌅 ${sunrise}</span>
    <span>🌇 ${sunset}</span>
  `;
  $('#dayDetailHours').innerHTML = hoursHtml;
  
  // Afficher
  $('#dayDetailModal').classList.add('open');
}

// Event listeners pour le modal
$('#dayDetailClose').addEventListener('click', () => $('#dayDetailModal').classList.remove('open'));
$('#dayDetailModal').addEventListener('click', e => {
  if (e.target.id === 'dayDetailModal') $('#dayDetailModal').classList.remove('open');
});

addEventListener('DOMContentLoaded',()=>{
/* ================= OPACITÉ FIXE 100% ================= */
/* ================= UNITÉS ================= */
$$('#units button').forEach(b=>b.addEventListener('click',()=>{
  if(state.units===b.dataset.u)return;
  state.units=b.dataset.u; store.set('pc_units',state.units);
  $$('#units button').forEach(x=>x.classList.toggle('on',x===b));
  if(state.fc)renderAll();
}));
$$('#units button').forEach(b=>b.classList.toggle('on',b.dataset.u===state.units));

if(state&&state.radar)state.radar.op=1;
if(state&&state.overlay)state.overlay.setOpacity(1);

/* ================= PANNEAU PARAMÈTRES ================= */
(function(){
  const fab=$('#settingsFab'), panel=$('#settingsPanel'), back=$('#settingsBackdrop'), close=$('#settingsClose');
  if(!fab||!panel)return;
  const open=()=>{panel.style.display='block';back.style.display='block';};
  const shut=()=>{panel.style.display='none';back.style.display='none';};
  fab.addEventListener('click',open);
  close.addEventListener('click',shut);
  back.addEventListener('click',shut);
})();

/* ================= GÉO AUTO AU LANCEMENT ================= */
(function(){
  const t=$('#geoAutoToggle'); if(!t)return;
  t.checked = store.get('pc_geo_auto')!=='0';
  t.addEventListener('change',()=>{
    store.set('pc_geo_auto', t.checked?'1':'0');
    if(t.checked) store.set('pc_geo_denied','0');
    toast(t.checked?'Géolocalisation auto activée 📍':'Géolocalisation auto désactivée 🏙️');
  });
})();

/* ================= INFOS MARINE + ================= */
(function(){
  const t=$('#marinePlusToggle'); if(!t)return;
  t.checked = store.get('pc_marine_plus')==='1';
  t.addEventListener('change',()=>{
    store.set('pc_marine_plus', t.checked?'1':'0');
    if(typeof renderMarine==='function') renderMarine();
    toast(t.checked?'Infos marine détaillées activées 🌊':'Infos marine détaillées désactivées');
  });
})();

/* ================= VITRINE PRO ================= */
function proLine(ic,t,d){ return '<div style="display:flex;gap:10px;margin-bottom:10px"><span style="font-size:20px">'+ic+'</span><div><b>'+t+'</b><div style="opacity:.7;font-size:12.5px">'+d+'</div></div></div>'; }
function openPro(){
  if(document.getElementById('proModal'))return;
  const ov=document.createElement('div');
  ov.id='proModal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(4,10,25,.6);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div style="max-width:480px;width:100%;max-height:84vh;overflow-y:auto;background:rgba(13,25,48,.97);border:1px solid rgba(255,209,102,.35);border-radius:20px;padding:22px;color:#eef4ff;box-shadow:0 24px 70px rgba(0,0,0,.55);font-size:14px;line-height:1.55">'
  +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:19px;color:#ffd166">⭐ PLEIN CIEL PRO</b><button id="proClose" style="background:none;border:none;color:#eef4ff;font-size:18px;cursor:pointer">✕</button></div>'
  +'<div style="opacity:.75;margin-bottom:14px">La version gratuite reste complète, pour toujours. Le PRO ajoute le confort :</div>'
  +proLine('🌊','Marées & courants','horaires des marées, meilleurs créneaux baignade et pêche')
  +proLine('📡','Radar 48 h','anticipez les orages deux jours à l’avance')
  +proLine('🔔','Alertes multi-villes','suivez jusqu’à 5 lieux (maison, vacances, proches)')
  +proLine('🌀','Marine détaillée','période de houle et vague de vent (déjà inclus !)')
  +proLine('🧩','Widget avancé','votre ciel direct sur l’écran d’accueil')
  +'<div style="margin-top:16px;padding:12px;border-radius:12px;background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.35);text-align:center"><b style="color:#ffd166">Bientôt : 2,99 €/mois ou 19,99 € à vie</b></div>'
  +'<button id="proSoon" style="width:100%;margin-top:12px;padding:12px;border-radius:12px;border:0;background:#ffd166;color:#123;font-weight:800;cursor:pointer">Être prévenu au lancement 🚀</button>'
  +'</div>';
  document.body.appendChild(ov);
  ov.querySelector('#proClose').addEventListener('click',()=>ov.remove());
  ov.querySelector('#proSoon').addEventListener('click',()=>{ toast('Merci ! Vous serez prévenu au lancement 🚀'); ov.remove(); });
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
}
(function(){
  const b=$('#proBtn'); if(!b)return;
  b.addEventListener('click',openPro);
})();

/* ================= RAYON ALERTE PLUIE ================= */
(function(){
  const seg=$('#rainRadiusSeg'); if(!seg)return;
  const cur=Number(store.get('pc_rain_radius')||10);
  seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.r===cur));
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    const r=+b.dataset.r;
    store.set('pc_rain_radius',r);
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    toast('Alerte pluie si précipitations à moins de '+r+' km 🌧️');
  }));
})();

});
