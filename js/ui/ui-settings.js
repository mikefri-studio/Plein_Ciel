"use strict";
/* ================= UNITÉS ================= */
$$('#units button').forEach(b=>b.addEventListener('click',()=>{
  if(state.units===b.dataset.u)return;
  state.units=b.dataset.u; store.set('pc_units',state.units);
  $$('#units button').forEach(x=>x.classList.toggle('on',x===b));
  if(state.fc)renderAll();
}));
$$('#units button').forEach(b=>b.classList.toggle('on',b.dataset.u===state.units));

/* ================= CONTRÔLES CARTE ================= */
$('#playBtn').addEventListener('click',togglePlay);
$('#frameRange').addEventListener('input',e=>{ if(state.radar.playing)togglePlay(); setFrame(+e.target.value); });
$('#opRange').addEventListener('input',e=>{
  const v=e.target.value/100; state.radar.op=v;
  if(state.overlay)state.overlay.setOpacity(v);
});
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
