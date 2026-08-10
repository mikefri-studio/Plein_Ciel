"use strict";
/* ================= CARTE ================= */
function initMap(){
  if(state.mapInited)return; state.mapInited=true;
  const map=L.map('map',{zoomControl:false,maxZoom:20}).setView([state.loc.lat,state.loc.lon],6);
  L.control.zoom({position:'bottomright'}).addTo(map);
  state.bases.sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'Tiles © Esri — Esri, Maxar, Earthstar Geographics'});
  state.bases.plan=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,maxNativeZoom:20,attribution:'© OpenStreetMap © CARTO'});
let planFailed=false;
state.bases.plan.on('tileerror',()=>{
  if(planFailed)return; planFailed=true;
  const on=state.map&&state.map.hasLayer(state.bases.plan);
  if(state.map)state.map.removeLayer(state.bases.plan);
  state.bases.plan=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
  if(on)state.bases.plan.addTo(state.map);
  toast('Fond plan : bascule sur OpenStreetMap');
});
  state.bases.labels=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,zIndex:450,attribution:'Noms de lieux © Esri'});
  state.bases.sat.addTo(map); state.bases.labels.addTo(map);
  state.marker=L.circleMarker([state.loc.lat,state.loc.lon],{radius:7,color:'#fff',weight:2,fillColor:'#ffd166',fillOpacity:.95}).addTo(map);
  state.map=map;
  initWindLayer();
  loadRadarFrames();
  setInterval(loadRadarFrames, 5*60*1000);
}
async function loadRadarFrames(){
  try{
    const d=await fetch('https://api.rainviewer.com/public/weather-maps.json').then(r=>r.json());
    const R=state.radar;
    const oldLen=R.frames.length;
    const atEnd=R.idx>=oldLen-1;
    R.host=d.host;
    R.frames=[...(d.radar.past||[]).map(f=>({...f,prev:false})),...(d.radar.nowcast||[]).map(f=>({...f,prev:true}))];
    R.pastCount=(d.radar.past||[]).length;
    const newLen=R.frames.length;
    R.idx = atEnd ? newLen-1 : Math.min(R.idx, newLen-1);
    $('#frameRange').max=Math.max(0,newLen-1);
    setFrame(R.idx);
    checkThunderAlert();
  }catch(e){ console.warn('Radar indisponible :',e); }
}
const curFrames=()=>state.radar.frames;
function tileURL(f){
  /* Schéma de couleur radar uniquement */
  return `${state.radar.host}${f.path}/512/{z}/{x}/{y}/2/1_1.png`;
}
function setFrame(i){
  const R=state.radar, frames=R.frames; if(!frames.length)return;
  R.idx=(i+frames.length)%frames.length;
  const f=frames[R.idx];
  if(state.overlay&&state.map){ state.map.removeLayer(state.overlay); state.overlay=null; }
  if(state.map){
    state.overlay=L.tileLayer(tileURL(f),{opacity:R.op,tileSize:512,zoomOffset:-1,maxNativeZoom:7,maxZoom:20});
    state.overlay.addTo(state.map);
    if(state.bases.labels&&state.map.hasLayer(state.bases.labels))state.bases.labels.bringToFront();
  }
  $('#frameRange').value=R.idx; $('#frameRange').max=frames.length-1;
  const t=new Date(f.time*1000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  $('#mapTime').innerHTML = t + (f.prev?'<span class="prev">PRÉVISION</span>':'');
  updateDelayNote();
}
function updateDelayNote(){
  const R=state.radar, el=$('#radarDelay');
  if(R.pastCount>0){
    const t=R.frames[R.pastCount-1].time;
    const dl=Math.max(0,Math.round((Date.now()/1000-t)/60));
    el.textContent=`Radar en différé d'environ ${dl} min · nouvelles images toutes les 5 min`;
  }else el.textContent='';
}
function togglePlay(){
  const R=state.radar; R.playing=!R.playing;
  $('#playIco').innerHTML=R.playing?'<path d="M2 1h4v14H2zM10 1h4v14h-4z"/>':'<path d="M3 1.5l11 6.5-11 6.5z"/>';
  clearInterval(R.timer);
  if(R.playing) R.timer=setInterval(()=>setFrame(R.idx+1),550);
}
function refreshMapFocus(){
  if(state.map){ state.map.setView([state.loc.lat,state.loc.lon],Math.max(state.map.getZoom(),6)); state.marker.setLatLng([state.loc.lat,state.loc.lon]); }
  updateWindParticles();
}
new IntersectionObserver((es,ob)=>{ if(es[0].isIntersecting){ initMap(); ob.disconnect(); } },{rootMargin:'200px'}).observe($('#secMap'));
/* v1.4.0 : pause les particules de vent quand la carte n'est pas à l'écran (batterie) */
new IntersectionObserver(es=>{ state.mapVisible=es[0].isIntersecting; },{rootMargin:'120px'}).observe($('#secMap'));

/* ================= PARTICULES DE VENT ================= */
function initWindLayer(){
  const WindLayer = L.Layer.extend({
    onAdd(map){
      const pane=map.getPane('overlayPane');
      const canvas=this._canvas=document.createElement('canvas');
      canvas.style.position='absolute'; canvas.style.pointerEvents='none';
      pane.appendChild(canvas);
      this._ctx=canvas.getContext('2d');
      this._parts=[];
      map.on('move zoom resize viewreset',this._reset,this);
      this._reset(); this._animate();
    },
    onRemove(map){
      map.getPane('overlayPane').removeChild(this._canvas);
      map.off('move zoom resize viewreset',this._reset,this);
      cancelAnimationFrame(this._raf);
    },
    _reset(){
      const map=this._map, size=map.getSize();
      const tl=map.containerPointToLayerPoint([0,0]);
      L.DomUtil.setPosition(this._canvas,tl);
      this._canvas.width=size.x; this._canvas.height=size.y;
      this._ensureParts();
    },
    _ensureParts(){
      const want=state.windOn?180:0;
      while(this._parts.length<want){
        this._parts.push({x:Math.random()*this._canvas.width,y:Math.random()*this._canvas.height,age:Math.random()*120,max:60+Math.random()*120});
      }
      this._parts.length=want;
    },
    _windAt(lat,lon){
      const grid=state.wind;
      if(!grid||!grid.length) return null;
      let sw=0,su=0,sv=0;
      for(const g of grid){
        const dy=(lat-g.lat)*111, dx=(lon-g.lon)*111*Math.cos(lat*Math.PI/180);
        const d=Math.sqrt(dx*dx+dy*dy)+0.01;
        const w=1/(d*d); sw+=w; su+=w*g.u; sv+=w*g.v;
      }
      return {u:su/sw,v:sv/sw};
    },
    _animate(){
      this._raf=requestAnimationFrame(()=>this._animate());
      if(!state.windOn||!this._map||!state.mapVisible) return;
      const ctx=this._ctx, c=this._canvas, map=this._map;
      ctx.fillStyle='rgba(0,0,0,0.08)';
      ctx.globalCompositeOperation='destination-out';
      ctx.fillRect(0,0,c.width,c.height);
      ctx.globalCompositeOperation='lighter';
      ctx.strokeStyle=state.baseMode==='plan'?'rgba(15,60,120,0.65)':'rgba(255,255,255,0.55)';
      ctx.lineWidth=1.2;
      ctx.beginPath();
      for(const p of this._parts){
        const ll=map.containerPointToLatLng([p.x,p.y]);
        const w=this._windAt(ll.lat,ll.lng);
        if(!w){ p.age=p.max; continue; }
        const k=0.12;
        const dx=w.u*k, dy=-w.v*k;
        const nx=p.x+dx, ny=p.y+dy;
        ctx.moveTo(p.x,p.y); ctx.lineTo(nx,ny);
        p.x=nx; p.y=ny; p.age++;
        if(p.age>p.max||nx<0||ny<0||nx>c.width||ny>c.height){
          p.x=Math.random()*c.width; p.y=Math.random()*c.height; p.age=0; p.max=60+Math.random()*120;
        }
      }
      ctx.stroke();
      ctx.globalCompositeOperation='source-over';
    }
  });
  state.windLayer=new WindLayer();
  state.windLayer.addTo(state.map);
  updateWindParticles();
}
function updateWindParticles(){
  if(!state.map||!state.windLayer)return;
  if(state.windLayer._ensureParts) state.windLayer._ensureParts();
}

