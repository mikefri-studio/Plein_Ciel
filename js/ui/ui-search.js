"use strict";
/* ================= RECHERCHE ================= */
let lastResults=[], selIdx=-1, debT=null;
const qEl=$('#q'), ql=$('#qlist');
const DEFAULTS=[['Paris',48.8566,2.3522],['Lyon',45.764,4.8357],['Marseille',43.2965,5.3698],['Bordeaux',44.8378,-0.5792],['Bruxelles',50.8503,4.3517],['Genève',46.2044,6.1432],['Montréal',45.5017,-73.5673]]
  .map(a=>({name:a[0],latitude:a[1],longitude:a[2],country:'',admin1:''}));
function openList(html){ ql.innerHTML=html; ql.classList.toggle('open',!!html); selIdx=-1; }
function closeList(){ ql.classList.remove('open'); }
function showQuick(){
  const rec=store.get('pc_recent')||[];
  const list=rec.length?rec:DEFAULTS;
  openList(`<div class="qt">${rec.length?'Recherches récentes':'Suggestions'}</div>`+
    list.map((r,i)=>{
      const fav=isFav({lat:(r.latitude??r.lat),lon:(r.longitude??r.lon)});
      return `<div class="qi ${fav?'fav':''}" data-i="${i}"><b>${r.name} <span class="star">★</span></b><span>${[r.admin1,r.country].filter(Boolean).join(' · ')}</span></div>`;
    }).join(''));
  lastResults=list;
}
qEl.addEventListener('focus',()=>{ if(!qEl.value.trim())showQuick(); });
qEl.addEventListener('input',()=>{
  clearTimeout(debT);
  const v=qEl.value.trim();
  if(v.length<2){ showQuick(); return; }
  debT=setTimeout(async()=>{
    try{
      const exp=v.replace(/\bste[\s.-]+/gi,'sainte ').replace(/\bst[\s.-]+/gi,'saint ');
      const variants=[...new Set([v, exp, v.replace(/\s+/g,'-'), exp.replace(/\s+/g,'-'), v.replace(/[-'']/g,' '), exp.replace(/[-'']/g,' ')])].filter(q=>q.trim().length>=2);
      lastResults=[];
      for(const q of variants){
        const d=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=fr&format=json`).then(r=>r.json());
        lastResults=d.results||[];
        if(lastResults.length)break;
      }
      if(!lastResults.length){ openList(`<div class="qt">Aucun résultat pour « ${v} »</div>`); return; }
      openList(lastResults.map((r,i)=>{
        const fav=isFav({lat:(r.latitude??r.lat),lon:(r.longitude??r.lon)});
        return `<div class="qi ${fav?'fav':''}" data-i="${i}"><b>${r.name} <span class="star">★</span></b><span>${[r.admin1,r.country].filter(Boolean).join(' · ')}</span></div>`;
      }).join(''));
    }catch(e){ closeList(); }
  },300);
});
ql.addEventListener('mousedown',e=>{
  const it=e.target.closest('.qi'); if(!it)return;
  pickCity(lastResults[+it.dataset.i]);
});
qEl.addEventListener('keydown',e=>{
  const items=[...ql.querySelectorAll('.qi')];
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    selIdx=(selIdx+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
    items.forEach((it,i)=>it.classList.toggle('sel',i===selIdx));
  }else if(e.key==='Enter'){
    e.preventDefault();
    if(selIdx>=0&&lastResults[selIdx])pickCity(lastResults[selIdx]);
    else if(lastResults.length)pickCity(lastResults[0]);
  }else if(e.key==='Escape'){ closeList(); qEl.blur(); }
});
document.addEventListener('click',e=>{ if(!e.target.closest('.search'))closeList(); });
document.addEventListener('keydown',e=>{ if(e.key==='/'&&document.activeElement!==qEl){ e.preventDefault(); qEl.focus(); }});

function pickCity(r){
  closeList(); qEl.value=''; qEl.blur();
  const lat=r.latitude??r.lat, lon=r.longitude??r.lon;
  const loc={lat,lon,name:r.name,sub:r.sub||[r.admin1,r.country].filter(Boolean).join(' · ')};
  const rec=store.get('pc_recent')||[];
  store.set('pc_recent',[loc,...rec.filter(x=>x.name!==loc.name)].slice(0,5));
  setLoc(loc);
}
function setLoc(loc){
  state.loc=loc; store.set('pc_loc',loc); writeURL(loc);
  loadTry=0;
  $('#load').classList.remove('off');
  $('#load .box').innerHTML='<div id="loadIco">'+icon(2,true)+'</div><p>Chargement du ciel…</p>';
  load();
}
$('#geoBtn').addEventListener('click',()=>{
  if(!navigator.geolocation)return toast('Géolocalisation non disponible.');
  toast('Recherche de votre position…');
  navigator.geolocation.getCurrentPosition(
    async p=>{
      const g=await reverseGeocode(p.coords.latitude,p.coords.longitude);
      setLoc({lat:p.coords.latitude,lon:p.coords.longitude,name:g?g.name:'Ma position',sub:g?g.sub:'Position actuelle'});
    },
    ()=>toast('Géolocalisation refusée — position par défaut conservée.'),
    {timeout:8000}
  );
});

