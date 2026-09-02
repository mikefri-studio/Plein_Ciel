"use strict";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
/* v1.4.1 : store.set sécurisé (navigation privée Safari, quota, etc.) */
const store={get:k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ================= ÉTAT ================= */
function locFromURL(){
  try{
    const u=new URL(location.href), la=u.searchParams.get('lat'), lo=u.searchParams.get('lon'), n=u.searchParams.get('n'), s=u.searchParams.get('s');
    if(la==null||lo==null) return null;
    const lat=+la, lon=+lo;
    if(isFinite(lat)&&isFinite(lon)) return {lat,lon,name:n||'Lieu partagé',sub:s||''};
  }catch(e){}
  return null;
}
let savedLoc=store.get('pc_loc');
if(!savedLoc||!isFinite(savedLoc.lat)||!isFinite(savedLoc.lon))
  savedLoc={lat:48.8566, lon:2.3522, name:'Paris', sub:'Île-de-France · France'};
const state={
  loc: locFromURL() || savedLoc,
  units: store.get('pc_units') || 'C',
  fc:null, aq:null, marine:null, wind:null, climate:null, fx:'none', aqStale:false,
  radar:{host:'',frames:[],pastCount:0,idx:0,playing:false,timer:null,op:.75},
  map:null, bases:{}, overlay:null, marker:null, mapInited:false,
  windLayer:null, windOn:true, mapVisible:false, baseMode:'sat', windLevel:'10', windChoice:'700', baseMode:'sat',
  alert:{muted: store.get('pc_alert_muted')==='1', lastSeen: store.get('pc_alert_seen')||'', perm: ('Notification' in window)?Notification.permission:'default'},
  audioCtx:null
};

function writeURL(loc){
  try{
    const u=new URL(location.href);
    u.searchParams.set('lat',loc.lat.toFixed(4));
    u.searchParams.set('lon',loc.lon.toFixed(4));
    u.searchParams.set('n',loc.name);
    if(loc.sub) u.searchParams.set('s',loc.sub);
    history.replaceState(null,'',u.toString());
  }catch(e){}
}

/* ================= WIDGETS PERSONNALISABLES ================= */
const WIDGETS=[
 ['rain','🌧️','Pluie prochaines heures'],
 ['outfit','🧥','Que porter aujourd\'hui'],
 ['activities','🎯','Activités du jour'],
 ['stats','📊','Indicateurs actuels'],
 ['hours','🕐','Prochaines 24 heures'],
 ['days','📆','Prévisions 16 jours'],
 ['sun','☀️','Course du soleil'],
 ['climate','📅','Il y a 1 an'],
 ['photo','📷','Lumière photo'],
 ['moon','🌙','Lune'],
 ['air','🌫️','Qualité de l\'air'],
 ['pollen','🌼','Pollen & allergies'],
 ['marine','🌊','Conditions marines'],
 ['map','🗺️','Carte radar & vent'],
];
function wVis(id){ const p=store.get('pc_widgets')||{}; return p[id]!==false; }
function applyWidgets(){
  const sel={
    rain:'#rainNowCard', outfit:'#wOutfit', activities:'#wActivities', stats:'#statsWrap',
    hours:'#secHours', sun:'#wSun', climate:'#wClimate', photo:'#wPhoto', moon:'#wMoon',
    air:'#wAir', pollen:'#wPollen', marine:'#wMarine', days:'#wDays', map:'#secMap'
  };
  for(const [id,s] of Object.entries(sel)){
    const el=$(s); if(el) el.style.display = wVis(id)? '' : 'none';
  }
  const adv=$('#adviceGrid');
  if(adv){
    const both=wVis('outfit')&&wVis('activities');
    const any=wVis('outfit')||wVis('activities');
    adv.style.display = any? '' : 'none';
    adv.style.gridTemplateColumns = both? '' : '1fr';
  }
  const secDays=$('#secDays');
  if(secDays){
    const anySide=['sun','climate','photo','moon','air','pollen','marine'].some(k=>wVis(k));
    secDays.style.display = (wVis('days')||anySide)? '' : 'none';
    const cols=$('#daysCols');
    if(cols) cols.style.gridTemplateColumns = wVis('days')? '' : '1fr';
  }
}
function buildWidgetList(){
  const p=store.get('pc_widgets')||{};
  const savedOrder = store.get('pc_widget_order') || [];
  
  const sortedWidgets = [...WIDGETS].sort((a, b) => {
    const idxA = savedOrder.indexOf(a[0]);
    const idxB = savedOrder.indexOf(b[0]);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  $('#widgetList').innerHTML = sortedWidgets.map(([id,em,label])=>
    `<div class="wrow" draggable="true" data-w="${id}">
       <span class="sort-grip" title="Glisser pour réorganiser">⋮⋮</span>
       <input type="checkbox" data-w="${id}" ${p[id]!==false?'checked':''}>
       <span class="we">${em}</span>
       <span class="wl">${label}</span>
     </div>`
  ).join('');

  if(typeof initSortableCSS === 'function') initSortableCSS();
  if(typeof makeSortable === 'function') {
    makeSortable($('#widgetList'), () => {
      const newOrder = Array.from($('#widgetList').children).map(el => el.dataset.w);
      store.set('pc_widget_order', newOrder);
    });
  }
}
$('#settingsBtn').addEventListener('click',()=>{ buildWidgetList(); $('#settingsModal').classList.add('open'); });
$('#setClose').addEventListener('click',()=>$('#settingsModal').classList.remove('open'));
$('#widgetDone').addEventListener('click',()=>$('#settingsModal').classList.remove('open'));
$('#settingsModal').addEventListener('click',e=>{ if(e.target.id==='settingsModal') $('#settingsModal').classList.remove('open'); });
$('#widgetList').addEventListener('change',e=>{
  const cb=e.target.closest('input[data-w]'); if(!cb)return;
  const p=store.get('pc_widgets')||{};
  p[cb.dataset.w]=cb.checked;
  store.set('pc_widgets',p);
  applyWidgets();
});
$('#widgetReset').addEventListener('click',()=>{
  store.set('pc_widgets',{});
  buildWidgetList();
  applyWidgets();
  toast('Tous les widgets sont réaffichés');
});

/* ================= THÈMES ================= */
const THEMES={
 'clear-day':{t:'#1470c8',m:'#4aa3e0',l:'#a8d8f2',ink:'#ffffff',soft:'rgba(255,255,255,.8)',acc:'#ffd166',aink:'#0b2239',card:'rgba(9,35,66,.28)',line:'rgba(255,255,255,.24)',panel:'#0e2138',cf:'#ffffff',cl2:'rgba(20,60,100,.55)',drop:'#2f86c9',glow:'rgba(255,209,102,.5)',cop:.85,pc:'rgba(200,230,255,.45)',fx:'none'},
 'clear-night':{t:'#050a1c',m:'#0d1734',l:'#20335f',ink:'#f2f6ff',soft:'rgba(220,232,255,.72)',acc:'#dfe8ff',aink:'#0b1c33',card:'rgba(8,14,32,.42)',line:'rgba(255,255,255,.16)',panel:'#0a1226',cf:'rgba(255,255,255,.12)',cl2:'rgba(255,255,255,.7)',drop:'#7fb2ff',glow:'rgba(170,200,255,.22)',cop:.12,pc:'rgba(200,230,255,.45)',fx:'stars'},
 'cloudy-day':{t:'#46617c',m:'#7d95aa',l:'#b6c8d6',ink:'#ffffff',soft:'rgba(255,255,255,.78)',acc:'#ffce63',aink:'#0b2239',card:'rgba(22,38,55,.32)',line:'rgba(255,255,255,.22)',panel:'#17293c',cf:'#f2f6f9',cl2:'rgba(35,60,85,.55)',drop:'#2f86c9',glow:'rgba(255,225,160,.28)',cop:.75,pc:'rgba(220,235,250,.4)',fx:'none'},
 'cloudy-night':{t:'#0a0f1c',m:'#1a2438',l:'#31415c',ink:'#eef3fb',soft:'rgba(210,224,244,.7)',acc:'#c4d4f2',aink:'#0b1c33',card:'rgba(10,18,34,.45)',line:'rgba(255,255,255,.14)',panel:'#0b1322',cf:'rgba(255,255,255,.12)',cl2:'rgba(255,255,255,.65)',drop:'#7fb2ff',glow:'rgba(150,180,230,.16)',cop:.14,pc:'rgba(200,230,255,.4)',fx:'stars'},
 'fog-day':{t:'#8b98a3',m:'#aeb9c2',l:'#d6dde3',ink:'#243447',soft:'rgba(36,52,71,.72)',acc:'#ffb84d',aink:'#3a2506',card:'rgba(255,255,255,.5)',line:'rgba(30,50,70,.18)',panel:'#eef2f5',cf:'#ffffff',cl2:'#5c7186',drop:'#4a7fa5',glow:'rgba(255,255,255,.45)',cop:.9,pc:'rgba(90,120,150,.4)',fx:'none'},
 'fog-night':{t:'#3d4750',m:'#5c6873',l:'#8b98a3',ink:'#f2f6f9',soft:'rgba(235,242,248,.72)',acc:'#ffc46b',aink:'#3a2506',card:'rgba(20,30,40,.35)',line:'rgba(255,255,255,.18)',panel:'#232c34',cf:'rgba(255,255,255,.2)',cl2:'rgba(255,255,255,.7)',drop:'#9fc6e2',glow:'rgba(255,220,160,.15)',cop:.5,pc:'rgba(220,235,250,.35)',fx:'none'},
 'rain-day':{t:'#16303f',m:'#2e5670',l:'#5b8aa3',ink:'#f0f7ff',soft:'rgba(215,235,250,.75)',acc:'#6fd3ff',aink:'#04263a',card:'rgba(8,24,38,.38)',line:'rgba(255,255,255,.18)',panel:'#0d2233',cf:'rgba(230,242,252,.9)',cl2:'rgba(15,45,70,.7)',drop:'#8fd9ff',glow:'rgba(120,190,230,.16)',cop:.5,pc:'rgba(190,225,255,.5)',fx:'rain'},
 'rain-night':{t:'#0c1b28',m:'#17324a',l:'#2c4d66',ink:'#eaf4fd',soft:'rgba(200,225,245,.7)',acc:'#5cc9ff',aink:'#04263a',card:'rgba(6,18,30,.48)',line:'rgba(255,255,255,.15)',panel:'#0a1826',cf:'rgba(255,255,255,.14)',cl2:'rgba(255,255,255,.65)',drop:'#7fd0ff',glow:'rgba(90,160,220,.14)',cop:.16,pc:'rgba(170,210,245,.5)',fx:'rain'},
 'heavy':{t:'#0d1c2a',m:'#1c3448',l:'#35546c',ink:'#eaf4fd',soft:'rgba(200,225,245,.7)',acc:'#57c7ff',aink:'#04263a',card:'rgba(6,18,30,.45)',line:'rgba(255,255,255,.16)',panel:'#0a1826',cf:'rgba(210,230,245,.85)',cl2:'rgba(10,35,55,.8)',drop:'#8fd9ff',glow:'rgba(90,160,220,.14)',cop:.4,pc:'rgba(190,225,255,.55)',fx:'heavy'},
 'snow-day':{t:'#8fa5b4',m:'#b7c8d3',l:'#e3ebef',ink:'#1c3a52',soft:'rgba(28,58,82,.7)',acc:'#2f7fae',aink:'#ffffff',card:'rgba(255,255,255,.55)',line:'rgba(30,60,90,.18)',panel:'#f2f6f8',cf:'#ffffff',cl2:'#46657c',drop:'#2f7fae',glow:'rgba(255,255,255,.5)',cop:.9,pc:'rgba(90,120,150,.55)',fx:'snow'},
 'snow-night':{t:'#2c3a4e',m:'#45586e',l:'#6d8296',ink:'#f4f8ff',soft:'rgba(225,236,248,.72)',acc:'#9fd0f0',aink:'#0b1c33',card:'rgba(14,26,40,.4)',line:'rgba(255,255,255,.16)',panel:'#1a2636',cf:'rgba(255,255,255,.25)',cl2:'rgba(255,255,255,.7)',drop:'#bfe0f5',glow:'rgba(200,225,255,.15)',cop:.3,pc:'rgba(255,255,255,.8)',fx:'snow'},
 'thunder':{t:'#0b0f1e',m:'#232b4a',l:'#46507a',ink:'#f2f4ff',soft:'rgba(215,220,245,.72)',acc:'#ffd23f',aink:'#2a2200',card:'rgba(10,14,30,.45)',line:'rgba(255,255,255,.16)',panel:'#101528',cf:'rgba(200,206,235,.85)',cl2:'rgba(20,24,50,.9)',drop:'#9fc6ff',glow:'rgba(255,210,80,.14)',cop:.25,pc:'rgba(190,205,255,.5)',fx:'heavy'}
};
function applyTheme(key){
  const t=THEMES[key]||THEMES['clear-day'], r=document.documentElement.style;
  r.setProperty('--sky-top',t.t); r.setProperty('--sky-mid',t.m); r.setProperty('--sky-low',t.l);
  r.setProperty('--ink',t.ink); r.setProperty('--ink-soft',t.soft);
  r.setProperty('--accent',t.acc); r.setProperty('--accent-ink',t.aink);
  r.setProperty('--card',t.card); r.setProperty('--line',t.line); r.setProperty('--panel',t.panel);
  r.setProperty('--cloudfill',t.cf); r.setProperty('--cloudline',t.cl2); r.setProperty('--dropc',t.drop);
  r.setProperty('--glow',t.glow); r.setProperty('--cloud-op',t.cop); r.setProperty('--pc',t.pc);
  state.fx=t.fx; document.body.classList.toggle('thunder', key==='thunder');
  const metaTheme=document.querySelector('meta[name="theme-color"]'); if(metaTheme)metaTheme.setAttribute('content',t.t);
}
function condGroup(code){
  if(code<=1)return'clear'; if(code===2)return'partly'; if(code===3)return'cloud';
  if(code===45||code===48)return'fog';
  if(code>=51&&code<=57)return'drizzle';
  if(code===65||code===67||code===82)return'heavy';
  if((code>=61&&code<=66)||code===80||code===81)return'rain';
  if((code>=71&&code<=77)||code===85||code===86)return'snow';
  return'thunder';
}
const WMO={0:'Ciel dégagé',1:'Plutôt dégagé',2:'Partiellement nuageux',3:'Ciel couvert',45:'Brouillard',48:'Brouillard givrant',
51:'Bruine légère',53:'Bruine',55:'Bruine dense',56:'Bruine verglaçante',57:'Bruine verglaçante',
61:'Pluie faible',63:'Pluie modérée',65:'Pluie forte',66:'Pluie verglaçante',67:'Pluie verglaçante forte',
71:'Neige faible',73:'Neige',75:'Neige forte',77:'Grains de neige',80:'Averses',81:'Averses',82:'Fortes averses',
85:'Averses de neige',86:'Fortes averses de neige',95:'Orage',96:'Orage avec grêle',99:'Orage avec grêle'};

/* ================= ICÔNES SVG ================= */
const CLOUD="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z";
const gCloud=(s,x,y,cls='cl')=>`<g class="${cls}" transform="translate(${x} ${y}) scale(${s})" stroke-width="${(3/s).toFixed(2)}"><path d="${CLOUD}"/></g>`;
const gSun=(cx,cy,r,small)=>{
  const rays=[0,45,90,135,180,225,270,315].map(a=>`<line x1="${cx}" y1="${cy-r-(small?4:7)}" x2="${cx}" y2="${cy-r-(small?8:14)}" transform="rotate(${a} ${cx} ${cy})"/>`).join('');
  return `<g><circle class="sun-c" cx="${cx}" cy="${cy}" r="${r}"/><g class="rays" style="--o:${cx}px ${cy}px">${rays}</g></g>`;
};
const gMoon=(tx,ty,s)=>`<g transform="translate(${tx} ${ty}) scale(${s})" stroke-width="${(3/s).toFixed(2)}"><path class="moonp" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></g>`;
const drops=(xs,y,cls='')=>xs.map((x,i)=>`<path class="drop ${cls}" style="animation-delay:${(i*.28).toFixed(2)}s" d="M${x} ${y}v6"/>`).join('');
const flakes=(xs,y)=>xs.map((x,i)=>`<g class="flake" style="animation-delay:${(i*.5).toFixed(2)}s"><path d="M${x} ${y-3}v6M${x-2.6} ${y-1.5}l5.2 3M${x-2.6} ${y+1.5}l5.2-3"/></g>`).join('');
const BOLT=`<path class="bolt" d="M34 37l-8 12h6l-4 11 12-15h-6l5-8z"/>`;
const FOG=`<g class="fog"><path d="M15 47h26"/><path d="M21 53h24"/><path d="M13 59h20"/></g>`;
function icon(code,isDay){
  const g=condGroup(code); let inner='';
  switch(g){
    case 'clear': inner = isDay? gSun(32,32,11) : gMoon(11,9,2.0)+`<circle class="tw" cx="49" cy="15" r="1.5"/><circle class="tw t2" cx="55" cy="27" r="1.1"/>`; break;
    case 'partly': inner = isDay? gSun(22,20,8,true)+gCloud(1.55,14,20) : gMoon(6,3,1.15)+gCloud(1.55,14,20); break;
    case 'cloud': inner = gCloud(1.35,30,12)+gCloud(2.0,7,15); break;
    case 'fog': inner = gCloud(1.7,11,8)+FOG; break;
    case 'drizzle': inner = gCloud(1.8,10,11)+drops([25,36],48,'slow'); break;
    case 'rain': inner = gCloud(1.8,10,11)+drops([23,32,41],47); break;
    case 'heavy': inner = gCloud(1.9,8,9)+drops([20,28,36,44],47); break;
    case 'snow': inner = gCloud(1.8,10,11)+flakes([24,33,42],50); break;
    case 'thunder': inner = gCloud(1.8,10,10)+BOLT+drops([22,44],46); break;
  }
  return `<svg class="wxi" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
}

/* ================= UNITÉS ================= */
const fmtT=c=>state.units==='C'?Math.round(c):Math.round(c*9/5+32);
const unitT=()=>'°'+state.units;
const fmtW=k=>state.units==='C'?Math.round(k)+' km/h':Math.round(k*0.621371)+' mph';
const fmtVis=m=>{ if(m==null)return'—'; const km=m/1000; return state.units==='C'? (km>=10?Math.round(km):km.toFixed(1))+' km' : (km*0.621371>=10?Math.round(km*0.621371):(km*0.621371).toFixed(1))+' mi'; };
const fmtP=mm=>state.units==='C'?mm.toFixed(1)+' mm':(mm/25.4).toFixed(2)+' in';
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const CARD=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
const cardOf=d=>CARD[Math.round(((d%360)/22.5))%16];
const mins=s=>{const p=s.slice(11,16).split(':');return +p[0]*60+ +p[1]};
const hm=s=>s.slice(11,16);
const fmtDur=min=>{
  const h=Math.floor(min/60), mm=min%60;
  if(h<=0) return `~${mm} min`;
  if(mm===0) return `~${h} h`;
  return `~${h} h ${String(mm).padStart(2,'0')}`;
};

/* ================= POSITION SOLAIRE ================= */
const RAD=Math.PI/180, DAYMS=86400000, J2000=2451545;
function sunAltitude(ms,lat,lng){
  const d=ms/DAYMS - 0.5 + 2440588 - J2000;
  const M=RAD*(357.5291+0.98560028*d);
  const C=RAD*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M));
  const L=M+C+RAD*102.9372+Math.PI;
  const e=RAD*23.4397;
  const dec=Math.asin(Math.sin(e)*Math.sin(L));
  const ra=Math.atan2(Math.sin(L)*Math.cos(e),Math.cos(L));
  const phi=RAD*lat, lw=RAD*-lng;
  const H=RAD*(280.16+360.9856235*d)-ra-lw;
  return Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H))/RAD;
}
function computeSunEvents(lat,lng,offSec){
  const nowLocal=new Date(Date.now()+offSec*1000);
  const Y=nowLocal.getUTCFullYear(),Mo=nowLocal.getUTCMonth(),D=nowLocal.getUTCDate();
  const altAt=m=>sunAltitude(Date.UTC(Y,Mo,D,0,m)-offSec*1000,lat,lng);
  const ev={};
  let prev=altAt(0);
  for(let m=2;m<=1440;m+=2){
    const a=altAt(m);
    if(prev<-0.833&&a>=-0.833) ev.sunrise=m;
    if(prev>=-0.833&&a<-0.833) ev.sunset=m;
    if(prev<-6&&a>=-6) ev.blueStartAM=m;
    if(prev>=-6&&a<-6) ev.blueEndPM=m;
    if(prev<6&&a>=6) ev.goldEndAM=m;
    if(prev>=6&&a<6) ev.goldStartPM=m;
    prev=a;
  }
  return ev;
}
const fmtMin=m=>m==null?'—':`${String(Math.floor(m/60)%24).padStart(2,'0')}h${String(m%60).padStart(2,'0')}`;


/* Calcule l'icône dominante du jour à partir des heures 8h-20h
   Plus fidèle que le weather_code daily d'Open-Meteo (qui peut
   donner un nuage même sur une journée majoritairement ensoleillée).
   Règles de sécurité : orage/pluie/neige priorisés si ≥ seuil. */
function calcDayIcon(hourlyCodes, hourlyTimes, dateStr){
  if(!hourlyCodes||!hourlyTimes||!dateStr) return null;
  const codes=[];
  for(let i=0;i<hourlyTimes.length;i++){
    const h=hourlyTimes[i], hr=h.slice(11,13), day=h.slice(0,10);
    if(day===dateStr){
      const hour=+hr;
      if(hour>=8&&hour<20&&hourlyCodes[i]!=null) codes.push(hourlyCodes[i]);
    }
  }
  if(codes.length===0) return null;
  const count=(lo,hi)=>codes.filter(c=>c>=lo&&c<=hi).length;
  const storm=count(95,99), snow=count(71,86),
        rain=count(51,67)+count(80,82), fog=count(45,48),
        over=codes.filter(c=>c===3).length,
        part=codes.filter(c=>c===2).length,
        clear=codes.filter(c=>c<=1).length;
  if(storm>=2) return 95;
  if(rain>=3)  return 61;
  if(snow>=3)  return 71;
  const max=Math.max(clear,part,over,fog,rain,snow,storm);
  if(max===0) return null;
  if(part===max)  return 2;
  if(clear===max) return 1;
  if(over===max)  return 3;
  if(fog===max)   return 45;
  if(rain===max)  return 61;
  if(snow===max)  return 71;
  if(storm===max) return 95;
  return null;
}
