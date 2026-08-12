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
