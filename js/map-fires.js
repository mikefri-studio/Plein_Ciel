"use strict";

let fireLayer=null, fireMarkerLayer=null, fireLoaded=false;

function fireIcon(){
  return L.divIcon({
    className:'fire-marker',
    html:`<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;width:30px;height:30px;background:radial-gradient(circle,#ff6b35 0%,transparent 70%);border-radius:50%;animation:fire-pulse 2s ease-in-out infinite"></div>
      <span style="font-size:20px;filter:drop-shadow(0 0 4px #ff0)">🔥</span>
    </div>`,
    iconSize:[30,30], iconAnchor:[15,15]
  });
}

async function loadFires(){
  if(fireLoaded) return;
  fireLoaded=true;
  try{
    const r=await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=2000');
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data=await r.json();
    const evts=data.events||[];
    if(evts.length===0){
      if(window.toast) toast('Aucun incendie en cours');
      return;
    }
    fireMarkerLayer=L.layerGroup();
    let count=0;
    evts.forEach(ev=>{
      const gl=ev.geometry||ev.geometries||[];
      const geo=gl.length?gl[gl.length-1]:null;
      if(!geo||geo.type!=='Point') return;
      const [lon,lat]=geo.coordinates;
      if(!isFinite(lat)||!isFinite(lon)) return;
      const title=ev.title||'Incendie';
      const date=geo.date?new Date(geo.date).toLocaleDateString('fr-FR'):'';
      const src=ev.sources&&ev.sources[0]?(ev.sources[0].id||''):'';
      const mag=geo.magnitudeValue?Math.round(geo.magnitudeValue)+' '+(geo.magnitudeUnit||''):'—';
      const m=L.marker([lat,lon],{icon:fireIcon()});
      m.bindPopup(`<b>🔥 ${title}</b><br>📅 ${date}<br>📐 ${mag}<br>🛰️ ${src||'NASA EONET'}`);
      fireMarkerLayer.addLayer(m);
      count++;
    });
    if(window.toast) toast(count+' incendies détectés');
  }catch(e){
    console.error('Fires:',e);
    if(window.toast) toast('Impossible de charger les incendies');
  }
}

function toggleFires(on){
  if(!fireLayer){
    fireLayer={show(){ if(!fireLoaded) loadFires().then(()=>{ if(fireMarkerLayer&&state.map) state.map.addLayer(fireMarkerLayer); }); },
               hide(){ if(fireMarkerLayer&&state.map) state.map.removeLayer(fireMarkerLayer); }};
  }
  if(on) fireLayer.show(); else fireLayer.hide();
}

document.addEventListener('DOMContentLoaded',()=>{
  const cb=document.getElementById('fireToggle');
  if(cb) cb.addEventListener('change',e=>toggleFires(e.target.checked));
});
