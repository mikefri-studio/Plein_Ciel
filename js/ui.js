"use strict";
/* ================= FAVORIS ================= */
function getFavs(){ return store.get('pc_favs')||[]; }
function saveFavs(list){ store.set('pc_favs',list); }
function isFav(loc){ return getFavs().some(f=>Math.abs(f.lat-loc.lat)<0.01&&Math.abs(f.lon-loc.lon)<0.01); }
function renderFavButton(){
  const btn=$('#favBtn');
  btn.classList.toggle('on',isFav(state.loc));
  btn.title=isFav(state.loc)?'Retirer des favoris':'Ajouter aux favoris';
}
function renderFavs(){
  const list=getFavs(), wrap=$('#favs');
  if(!list.length){ wrap.innerHTML=''; return; }
  wrap.innerHTML=list.map((f,i)=>{
    const active=(Math.abs(f.lat-state.loc.lat)<0.01&&Math.abs(f.lon-state.loc.lon)<0.01);
    return `<div class="fav-chip ${active?'active':''}" data-i="${i}"><span class="name">${esc(f.name)}</span><span class="x" data-del="${i}" title="Retirer">×</span></div>`;
  }).join('');
  wrap.querySelectorAll('.fav-chip').forEach(el=>{
    el.addEventListener('click',e=>{
      if(e.target.matches('[data-del]')){
        e.stopPropagation();
        const i=+e.target.dataset.del, list=getFavs();
        list.splice(i,1); saveFavs(list); renderFavs(); renderFavButton();
      }else{
        const f=getFavs()[+el.dataset.i];
        if(f) setLoc(f);
      }
    });
  });
}
$('#favBtn').addEventListener('click',()=>{
  const list=getFavs();
  const idx=list.findIndex(f=>Math.abs(f.lat-state.loc.lat)<0.01&&Math.abs(f.lon-state.loc.lon)<0.01);
  if(idx>=0){ list.splice(idx,1); saveFavs(list); toast('Retiré des favoris'); }
  else { list.push({...state.loc}); saveFavs(list); toast('Ajouté aux favoris ⭐'); }
  renderFavs(); renderFavButton();
});

$('#shareBtn').addEventListener('click',async()=>{
  const url=location.href;
  try{
    if(navigator.share) await navigator.share({title:`Météo à ${state.loc.name}`,text:'Ma météo en direct sur Plein Ciel',url});
    else { await navigator.clipboard.writeText(url); toast('Lien copié dans le presse-papiers 📋'); }
  }catch(e){
    try{ await navigator.clipboard.writeText(url); toast('Lien copié'); }
    catch(e2){ toast('Impossible de partager'); }
  }
});

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
      const fav=isFav({lat:r.latitude,lon:r.longitude});
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
      const d=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(v)}&count=6&language=fr&format=json`).then(r=>r.json());
      lastResults=d.results||[];
      if(!lastResults.length){ openList(`<div class="qt">Aucun résultat pour « ${v} »</div>`); return; }
      openList(lastResults.map((r,i)=>{
        const fav=isFav({lat:r.latitude,lon:r.longitude});
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
  const loc={lat:r.latitude,lon:r.longitude,name:r.name,sub:[r.admin1,r.country].filter(Boolean).join(' · ')};
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

/* ================= FX CANVAS ================= */
const cv=$('#fx'), ctx=cv.getContext('2d');
let stars=[],parts=[];
function sizeFX(){ cv.width=innerWidth; cv.height=innerHeight;
  stars=Array.from({length:150},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height*.7,r:Math.random()*1.3+.3,p:Math.random()*Math.PI*2,s:.5+Math.random()*1.5}));
}
addEventListener('resize',sizeFX); sizeFX();
function ensureParts(){
  const want=state.fx==='rain'?130:state.fx==='heavy'?230:state.fx==='snow'?90:0;
  while(parts.length<want)parts.push(state.fx==='snow'
    ?{x:Math.random()*cv.width,y:Math.random()*cv.height,r:1+Math.random()*2.4,v:.4+Math.random()*.9,p:Math.random()*7}
    :{x:Math.random()*cv.width,y:Math.random()*cv.height,l:9+Math.random()*14,v:11+Math.random()*9});
  parts.length=want;
}
function loop(t){
  requestAnimationFrame(loop);
  ctx.clearRect(0,0,cv.width,cv.height);
  if(state.fx==='stars'){
    const dt=t/1000;
    for(const s of stars){ ctx.globalAlpha=.35+.55*Math.abs(Math.sin(s.p+dt*s.s)); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,7); ctx.fill(); }
    ctx.globalAlpha=1;
  } else if(state.fx==='rain'||state.fx==='heavy'){
    ensureParts();
    ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--pc').trim()||'rgba(200,230,255,.45)';
    ctx.lineWidth=1.4; ctx.lineCap='round'; ctx.beginPath();
    for(const p of parts){
      ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-3,p.y+p.l);
      p.y+=p.v; p.x-=.7;
      if(p.y>cv.height+20){ p.y=-20; p.x=Math.random()*(cv.width+80); }
    }
    ctx.stroke();
  } else if(state.fx==='snow'){
    ensureParts();
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--pc').trim()||'rgba(255,255,255,.85)';
    for(const p of parts){
      ctx.beginPath(); ctx.arc(p.x+Math.sin(t/900+p.p)*14,p.y,p.r,0,7); ctx.fill();
      p.y+=p.v; if(p.y>cv.height+6){ p.y=-8; p.x=Math.random()*cv.width; }
    }
  }
}
requestAnimationFrame(loop);

/* ================= REVEAL & DIVERS ================= */
$$('section.reveal').forEach(s=>new IntersectionObserver((es,ob)=>{ if(es[0].isIntersecting){ s.classList.add('in'); ob.disconnect(); } },{threshold:.1}).observe(s));

function tween(el,to){
  const from=parseFloat(el.dataset.v); const start=performance.now();
  if(isNaN(from)){ el.textContent=to; el.dataset.v=to; return; }
  const dur=700;
  (function step(now){
    const k=Math.min(1,(now-start)/dur), e=1-Math.pow(1-k,3);
    el.textContent=Math.round(from+(to-from)*e);
    if(k<1)requestAnimationFrame(step); else el.dataset.v=to;
  })(start);
}
let toastT=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),3600); }

