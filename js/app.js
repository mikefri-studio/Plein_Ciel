"use strict";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
/* v1.2.0 : store.set sécurisé (navigation privée Safari, quota, etc.) */
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
 ['app','📲','Installer l\'appli'],
];
function wVis(id){ const p=store.get('pc_widgets')||{}; return p[id]!==false; }
function applyWidgets(){
  const sel={
    rain:'#rainNowCard', outfit:'#wOutfit', activities:'#wActivities', stats:'#statsWrap',
    hours:'#secHours', sun:'#wSun', climate:'#wClimate', photo:'#wPhoto', moon:'#wMoon',
    air:'#wAir', pollen:'#wPollen', marine:'#wMarine', days:'#wDays', map:'#secMap', app:'#secApp'
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
  $('#widgetList').innerHTML=WIDGETS.map(([id,em,label])=>
    `<label class="wrow"><input type="checkbox" data-w="${id}" ${p[id]!==false?'checked':''}><span class="we">${em}</span><span class="wl">${label}</span></label>`
  ).join('');
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

/* ================= DONNÉES ================= */
async function fetchJSON(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status+' — '+url.split('?')[0]);
  return r.json();
}
async function reverseGeocode(lat,lon){
  const key='pc_revgeo2_'+lat.toFixed(2)+','+lon.toFixed(2);
  const c=store.get(key); if(c) return c;
  let r=null;
  try{
    const d=await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`).then(x=>x.json());
    const clean=t=>(t||'').replace(/\s*\(.*?\)\s*$/,'');
    const name=clean(d.city)||clean(d.locality)||clean(d.principalSubdivision);
    if(name) r={name, sub:[clean(d.principalSubdivision),clean(d.countryName)].filter(Boolean).join(' · ')};
  }catch(e){ console.warn('Reverse geocoding 1 indisponible :',e); }
  if(!r) try{
    const d=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=fr&zoom=12`).then(x=>x.json());
    const a=d.address||{};
    const name=a.village||a.town||a.city||a.municipality||a.county;
    if(name) r={name, sub:[a.state,a.country].filter(Boolean).join(' · ')};
  }catch(e){ console.warn('Reverse geocoding 2 indisponible :',e); }
  if(r) store.set(key,r);
  return r;
}
/* v1.2.0 : le pollen n'existe qu'en « hourly » (le paramètre daily faisait planter l'API) */
function aqURL(lat,lon){
  return `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}`
    +`&current=european_aqi,pm2_5,pm10`
    +`&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen`
    +`&forecast_days=1&timezone=auto`;
}
async function fetchMarine(lat,lon){
  const base=`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=`;
  try{
    return await fetchJSON(base+'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature');
  }catch(e){
    try{ return await fetchJSON(base+'wave_height,wave_direction,wave_period'); }
    catch(e2){ console.warn('Marine indisponible :',e2); return null; }
  }
}
async function fetchWindGrid(lat,lon){
  const dLat=0.8, dLon=1.2;
  const pts=[
    [lat-dLat,lon-dLon],[lat-dLat,lon],[lat-dLat,lon+dLon],
    [lat,lon-dLon],[lat,lon],[lat,lon+dLon],
    [lat+dLat,lon-dLon],[lat+dLat,lon],[lat+dLat,lon+dLon]
  ];
  const lats=pts.map(p=>p[0].toFixed(3)).join(',');
  const lons=pts.map(p=>p[1].toFixed(3)).join(',');
  
  const grab=async(uv,tag)=>{
    try{
      const d=await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m&hourly=${uv}&timezone=auto`);
      if(Array.isArray(d)&&d.length===9){
        const [ku,kv]=uv.split(',');
        const grid=d.map((x,i)=>{
          const t0=(x.current&&x.current.time||'').slice(0,13);
          let idx=(x.hourly&&x.hourly.time)?x.hourly.time.findIndex(t=>t.slice(0,13)===t0):0;
          if(idx<0)idx=0;
          return {lat:pts[i][0],lon:pts[i][1],u:x.hourly[ku][idx],v:x.hourly[kv][idx]};
        });
        state.windLevel=tag;
        return grid;
      }
    }catch(e){}
    return null;
  };
  
  try{
    if(state.windChoice==='10'){
      return await grab('wind_u_component_10m,wind_v_component_10m','10')
          || await grab('wind_u_component_700hPa,wind_v_component_700hPa','700');
    }
    return await grab('wind_u_component_700hPa,wind_v_component_700hPa','700')
        || await grab('wind_u_component_10m,wind_v_component_10m','10');
  }catch(e){ console.warn('Wind grid indisponible :',e); }
  return null;
}
/* v1.2.0 : archive mise en cache 24 h (ces données ne changent qu'une fois par jour) */
async function fetchClimate(lat,lon){
  const key='pc_clim_'+lat.toFixed(2)+','+lon.toFixed(2);
  const c=store.get(key);
  if(c&&c.d&&Date.now()-c.t<24*3600*1000) return c.d;
  const now=new Date(), y=now.getFullYear()-1;
  const mm=String(now.getMonth()+1).padStart(2,'0'), dd=String(now.getDate()).padStart(2,'0');
  const date=`${y}-${mm}-${dd}`;
  try{
    const d=await fetchJSON(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
    store.set(key,{t:Date.now(),d});
    return d;
  }catch(e){ console.warn('Climat indisponible :',e); return c?c.d:null; }
}
async function fetchData(){
  const {lat,lon}=state.loc;
  const fcBase=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    +`&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m`
    +`&hourly=temperature_2m,precipitation_probability,weather_code,is_day,visibility,dew_point_2m`
    +`&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max`
    +`&minutely_15=precipitation`
    +`&timezone=auto`;
  let fc;
  try{ fc=await fetchJSON(fcBase+'&forecast_days=16'); }
  catch(e1){ console.warn('16 jours refusé, repli sur 7 jours :',e1); fc=await fetchJSON(fcBase+'&forecast_days=7'); }
  const aq=await fetchJSON(aqURL(lat,lon))
    .then(d=>{ store.set('pc_aq_cache',{t:Date.now(),aq:d}); state.aqStale=false; return d; })
    .catch(e=>{
      console.warn('Air/pollen indisponible :',e);
      const c=store.get('pc_aq_cache');
      if(c&&c.aq&&Date.now()-c.t<24*3600*1000){ state.aqStale=true; return c.aq; }
      state.aqStale=false; return null;
    });
  const [marine,wind,climate]=await Promise.all([
    fetchMarine(lat,lon),
    fetchWindGrid(lat,lon),
    fetchClimate(lat,lon)
  ]);
  state.fc=fc; state.aq=aq; state.marine=marine; state.wind=wind; state.climate=climate;
  scheduleAqRetry();
}

let aqRetryTimer=null, aqTryN=0;
function scheduleAqRetry(){
  clearTimeout(aqRetryTimer);
  if(state.aq&&!state.aqStale){ aqTryN=0; return; }
  const delays=[30,120,600,600,600,600];
  const d=delays[Math.min(aqTryN,delays.length-1)]*1000;
  aqTryN++;
  aqRetryTimer=setTimeout(async()=>{
    try{
      const {lat,lon}=state.loc;
      const d=await fetchJSON(aqURL(lat,lon));
      store.set('pc_aq_cache',{t:Date.now(),aq:d});
      state.aq=d; state.aqStale=false; aqTryN=0;
      safe('air',renderAir); safe('pollen',renderPollen);
      toast('✅ Qualité de l\'air & pollen : données rétablies');
    }catch(e){ scheduleAqRetry(); }
  },d);
}

let loadTry=0;
async function load(){
  try{
    await fetchData();
    loadTry=0;
    renderAll();
    checkThunderAlert();
    $('#load').classList.add('off');
  }catch(e){
    console.error('Plein Ciel — erreur de chargement :',e);
    loadTry++;
    if(loadTry<=2){ toast('Nouvelle tentative… ('+loadTry+'/2)'); setTimeout(load,1500*loadTry); }
    else showLoadError(e);
  }
}
function showLoadError(e){
  const msg=(e&&e.message)?e.message:String(e);
  $('#load').classList.remove('off');
  $('#load .box').innerHTML=`
    <div style="font-size:46px;margin-bottom:12px">📡</div>
    <p style="max-width:480px;line-height:1.7;letter-spacing:.02em;text-transform:none;font-size:14px;font-weight:500">
      Le site est bien en ligne, mais je n'arrive pas à joindre le service météo
      <b>api.open-meteo.com</b>.<br>
      Causes possibles : bloqueur de publicités, pare-feu/proxy qui filtre cette adresse,
      ou service momentanément indisponible.<br>
      <span style="opacity:.7">Détail technique : ${esc(msg)}</span>
    </p>
    <button id="retryBtn" style="margin-top:18px;padding:12px 28px;border:0;border-radius:999px;background:#ffd166;color:#0b2239;font-weight:700;cursor:pointer;font-size:15px">Réessayer</button>`;
  $('#retryBtn').addEventListener('click',()=>{
    loadTry=0;
    $('#load .box').innerHTML='<div id="loadIco">'+icon(2,true)+'</div><p>Chargement du ciel…</p>';
    load();
  });
}

/* ================= ALERTE ORAGE ================= */
function analyzeThunder(){
  const fc=state.fc; if(!fc||!fc.hourly)return {level:0};
  const h=fc.hourly, c=fc.current;
  let i0=h.time.findIndex(t=>t.slice(0,13)===c.time.slice(0,13)); if(i0<0)i0=0;
  const thunderHours=[];
  const codes=h.weather_code, pops=h.precipitation_probability||[];
  for(let i=i0;i<Math.min(i0+18, codes.length);i++){
    const code=codes[i], pop=pops[i]||0;
    if(code===95||code===96||code===99){ thunderHours.push({i,code,pop,time:h.time[i]}); }
    else if(pop>=70 && (code>=80&&code<=82)){ thunderHours.push({i,code,pop,time:h.time[i]}); }
  }
  if(!thunderHours.length) return {level:0};
  const first=thunderHours[0];
  const deltaMin=(first.i-i0)*60;
  let level;
  if(first.i===i0) level=3;
  else if(deltaMin<=120) level=2;
  else level=1;
  const hail=thunderHours.some(x=>x.code===96||x.code===99);
  return {level,inMinutes:deltaMin,firstTime:first.time,count:thunderHours.length,hail,hours:thunderHours};
}
function playAlertSound(){
  if(state.alert.muted) return;
  try{
    if(!state.audioCtx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return;
      state.audioCtx=new AC();
    }
    const ctx=state.audioCtx, t0=ctx.currentTime;
    const beep=(freq,start,dur)=>{
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type='sine'; osc.frequency.value=freq;
      gain.gain.setValueAtTime(0,t0+start);
      gain.gain.linearRampToValueAtTime(0.15,t0+start+0.02);
      gain.gain.linearRampToValueAtTime(0,t0+start+dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0+start); osc.stop(t0+start+dur+0.05);
    };
    beep(880,0,0.12); beep(880,0.18,0.12); beep(880,0.36,0.12); beep(660,0.6,0.4);
  }catch(e){ console.warn('Son alerte indisponible',e); }
}
function sendBrowserNotification(title,body){
  if(store.get('pc_alert_notif')!=='1') return;
  if(!('Notification' in window)) return;
  if(Notification.permission==='granted'){
    try{ new Notification(title,{body,tag:'pleinciel-thunder'}); }catch(e){}
  }
}
/* v1.2.0 : hauteur de bannière mesurée → plus de chevauchement du header sur mobile */
function syncAlertHeight(){
  if(!document.body.classList.contains('has-alert'))return;
  const h=$('#alertBar').offsetHeight;
  if(h) document.documentElement.style.setProperty('--alert-h',h+'px');
}
addEventListener('resize',syncAlertHeight);
function updateAlertBar(info){
  const bar=$('#alertBar'), txt=$('#alertText');
  if(!info||info.level===0){
    bar.classList.remove('on');
    document.body.classList.remove('has-alert');
    return;
  }
  const city=state.loc.name;
  let msg='';
  if(info.radar){
    msg = info.level>=3 ? `<b>CELLULE ORAGEUSE AU RADAR</b> · ${city} — fortes précipitations en cours, mettez-vous à l'abri` : `<b>PLUIE AU RADAR</b> · ${city} — précipitations détectées à proximité`;
  } else if(info.level===3){
    msg=`<b>ORAGE EN COURS</b> · ${city} — mettez-vous à l'abri`;
  }else{
    const h=Math.floor(info.inMinutes/60), m=info.inMinutes%60;
    const when = h>0 ? `dans ${h}h${m?String(m).padStart(2,'0'):''}` : `dans ${m} min`;
    const hailTag = info.hail ? ' — risque de grêle' : '';
    msg=`<b>ALERTE ORAGE</b> · ${city} · ${info.count} créneau${info.count>1?'x':''} orageux prévu${info.count>1?'s':''} ${when}${hailTag}`;
  }
  txt.innerHTML=msg;
  bar.classList.add('on');
  document.body.classList.add('has-alert');
  requestAnimationFrame(syncAlertHeight);
}
async function radarLevelAtLoc(){
  const R=state.radar;
  if(!R.host||!R.frames.length) return 0;
  const frame=R.frames[Math.max(0,R.pastCount-1)];
  const z=7, n=1<<z;
  const lat=state.loc.lat, lon=state.loc.lon;
  const xf=(lon+180)/360*n, yf=(1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*n;
  const x=Math.floor(xf), y=Math.floor(yf);
  const url=`${R.host}${frame.path}/256/${z}/${x}/${y}/2/1_1.png`;
  const blob=await fetch(url).then(r=>r.ok?r.blob():null);
  if(!blob) return 0;
  const bmp=await createImageBitmap(blob);
  const cv=document.createElement('canvas'); cv.width=256; cv.height=256;
  const cx=cv.getContext('2d',{willReadFrequently:true});
  cx.drawImage(bmp,0,0);
  const px=Math.round((xf-x)*256), py=Math.round((yf-y)*256);
  const x0=Math.max(0,px-4), y0=Math.max(0,py-4);
  const d=cx.getImageData(x0,y0,9,9).data;
  let lvl=0;
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]<20) continue;
    const r=d[i], g=d[i+1], b=d[i+2];
    if((r>200&&g<180)||(r>140&&b>190)) return 3;
    lvl=1;
  }
  return lvl;
}
async function checkThunderAlert(forceNotify=false){
  let info=analyzeThunder();
  if(info.level===0){
    try{
      const r=await radarLevelAtLoc();
      if(r>0) info={level:r, radar:true, firstTime:'radar'+(state.radar.frames[Math.max(0,state.radar.pastCount-1)]||{time:0}).time};
    }catch(e){}
  }
  updateAlertBar(info);
  if(info.level===0) return;
  const episodeId=info.firstTime+'-'+info.level;
  if(episodeId===state.alert.lastSeen && !forceNotify) return;
  state.alert.lastSeen=episodeId;
  store.set('pc_alert_seen',episodeId);
  playAlertSound();
  const titles=['Pré-alerte orage','Alerte orage imminente','ORAGE EN COURS'];
  const bodies=[
    `Des orages sont prévus dans les prochaines heures à ${state.loc.name}.`,
    `Orages attendus à ${state.loc.name}${info.hail?' (risque de grêle)':''}. Restez vigilant.`,
    `Orage en cours à ${state.loc.name}. Évitez les espaces exposés.`
  ];
  sendBrowserNotification('⛈️ '+titles[info.level-1], bodies[info.level-1]);
}
$('#alertCloseBtn').addEventListener('click',()=>{
  $('#alertBar').classList.remove('on');
  document.body.classList.remove('has-alert');
});
function syncAlertPrefs(){
  const n=$('#setNotif'), s=$('#setSound');
  if(n) n.checked = store.get('pc_alert_notif')==='1';
  if(s) s.checked = !state.alert.muted;
}
$('#setNotif').addEventListener('change',async e=>{
  if(e.target.checked){
    if(!('Notification' in window)){ toast('Notifications non supportées par ce navigateur.'); e.target.checked=false; return; }
    try{
      const p=await Notification.requestPermission();
      if(p==='granted'){ store.set('pc_alert_notif','1'); toast('🔔 Notifications d\'orage activées'); }
      else { e.target.checked=false; store.set('pc_alert_notif','0'); toast('Notifications refusées par le navigateur'); }
    }catch(err){ e.target.checked=false; toast('Impossible de demander la permission.'); }
  } else {
    store.set('pc_alert_notif','0');
    toast('Notifications d\'orage désactivées');
  }
});
$('#setSound').addEventListener('change',e=>{
  state.alert.muted=!e.target.checked;
  store.set('pc_alert_muted',state.alert.muted?'1':'0');
  toast(state.alert.muted?'Bip sonore désactivé':'Bip sonore activé');
});
syncAlertPrefs();
setInterval(()=>{ if(state.fc) checkThunderAlert(); }, 10*60*1000);

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

/* ================= RENDUS ================= */
const safe=(name,f)=>{ try{ f(); }catch(err){ console.error('Erreur de rendu ['+name+'] :',err); } };
function renderAll(){
  const fc=state.fc, c=fc.current, day=fc.daily, isDay=c.is_day===1, code=c.weather_code;
  const grp=condGroup(code);
  let th = grp==='clear' ? (isDay?'clear-day':'clear-night')
        : (grp==='partly'||grp==='cloud') ? (isDay?'cloudy-day':'cloudy-night')
        : grp==='fog' ? (isDay?'fog-day':'fog-night')
        : grp==='drizzle'||grp==='rain' ? (isDay?'rain-day':'rain-night')
        : grp==='heavy' ? 'heavy'
        : grp==='snow' ? (isDay?'snow-day':'snow-night') : 'thunder';
  applyTheme(th);

  $('#today').textContent=cap(new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}));
  $('#place').textContent=state.loc.name;
  $('#placeSub').textContent=state.loc.sub||'';
  tween($('#bigTemp'), fmtT(c.temperature_2m));
  $('#bigUnit').textContent=unitT();
  $('#condTxt').textContent=WMO[code]||'—';
  $('#feels').textContent=`Ressenti ${fmtT(c.apparent_temperature)}${unitT()}`;
  $('#heroIcon').innerHTML=icon(code,isDay);
  $('#updated').textContent=`Mis à jour à ${hm(c.time)}`;
  $('#updated').classList.remove('updated-stale');
  const la=state.loc.lat.toFixed(2), lo=state.loc.lon.toFixed(2);
  $('#coords').textContent=`${Math.abs(la)}° ${la>=0?'N':'S'} · ${Math.abs(lo)}° ${lo>=0?'E':'O'}`;
  $('#chips').innerHTML=[
    ['↑',fmtT(day.temperature_2m_max[0])+unitT(),'max'],
    ['↓',fmtT(day.temperature_2m_min[0])+unitT(),'min'],
    ['☂',fmtP(c.precipitation),'précip.'],
    ['☁',c.cloud_cover+' %','nuages']
  ].map(x=>`<span class="chip">${x[0]} <b>${x[1]}</b> ${x[2]}</span>`).join('');

  safe('rainnow',renderRainNow);
  safe('advice',renderAdvice);
  safe('climate',renderClimate);
  safe('photo',renderPhoto);
  safe('stats',renderStats); safe('hours',renderHours); safe('days',renderDays);
  safe('sunmoon',renderSunMoon); safe('air',renderAir); safe('pollen',renderPollen);
  safe('marine',renderMarine); safe('map',refreshMapFocus);
  renderFavButton(); renderFavs();
  document.title=`${fmtT(c.temperature_2m)}${unitT()} ${WMO[code]} · ${state.loc.name} — Plein Ciel`;
}

function renderRainNow(){
  const fc=state.fc, m=fc.minutely_15, card=$('#rainNowCard');
  if(!wVis('rain')||!m||!m.time||!m.precipitation){ card.style.display='none'; return; }
  const times=m.time, P=m.precipitation, cur=fc.current.time.slice(0,16);
  let i0=times.findIndex(t=>t.slice(0,16)===cur);
  if(i0<0) i0=times.findIndex(t=>t.slice(0,16)>=cur);
  if(i0<0) i0=0;
  const eps=0.05;
  const end=Math.min(i0+13, P.length);
  const rainingNow=(P[i0]||0)>eps;
  let msg='';
  if(rainingNow){
    let stop=-1;
    for(let i=i0+1;i<end;i++){ if((P[i]||0)<=eps){ stop=i; break; } }
    if(stop<0) msg=`Pluie en cours — elle devrait continuer encore au moins 3 h.`;
    else if(stop<=i0+1) msg=`Pluie en cours, elle s'arrête très bientôt (vers ${hm(times[stop])}).`;
    else msg=`Pluie en cours, fin ${fmtDur((stop-i0)*15)} (vers ${hm(times[stop])}).`;
  }else{
    let start=-1;
    for(let i=i0+1;i<end;i++){ if((P[i]||0)>eps){ start=i; break; } }
    if(start<0) msg=`Pas de pluie prévue dans les 3 prochaines heures.`;
    else{
      const min=(start-i0)*15;
      msg = min<=15
        ? `La pluie arrive d'ici ~15 min (vers ${hm(times[start])}). Prenez le parapluie !`
        : `Pas de pluie pour l'instant — elle arrive ${fmtDur(min)} (vers ${hm(times[start])}). Prenez le parapluie !`;
    }
  }
  card.style.display='';
  $('#rainNowTxt').textContent=msg;
  const segs=[];
  for(let k=0;k<12;k++) segs.push(P[i0+k]||0);
  const maxV=Math.max(0.5,...segs);
  $('#rainNowBar').innerHTML=segs.map(v=>{
    const a=Math.min(1,v/maxV);
    const col=v<=eps?'var(--line)':`rgba(90,180,255,${(0.25+0.75*a).toFixed(2)})`;
    return `<i style="background:${col}"></i>`;
  }).join('');
}

function renderClimate(){
  const cl=state.climate, d=state.fc.daily;
  if(!cl||!cl.daily||cl.daily.temperature_2m_max==null||cl.daily.temperature_2m_max[0]==null){
    $('#climDiff').textContent='—'; $('#climBadge').textContent='pas de données'; $('#climTxt').textContent='';
    return;
  }
  const oldMax=cl.daily.temperature_2m_max[0], oldMin=cl.daily.temperature_2m_min[0];
  const todayMax=d.temperature_2m_max[0], todayMin=d.temperature_2m_min[0];
  const diff=todayMax-oldMax;
  const sign=diff>0?'+':'';
  $('#climDiff').textContent=sign+(Math.round(diff*10)/10)+'°';
  const b=$('#climBadge');
  if(diff>1.5){ b.textContent='plus chaud'; b.style.background='#ff9f43'; }
  else if(diff<-1.5){ b.textContent='plus frais'; b.style.background='#6fd3ff'; }
  else { b.textContent='équivalent'; b.style.background='#35c26b'; }
  $('#climTxt').innerHTML=`Même date l'an dernier : <b>${fmtT(oldMax)}${unitT()}</b> max / <b>${fmtT(oldMin)}${unitT()}</b> min<br>Aujourd'hui : <b>${fmtT(todayMax)}${unitT()}</b> max / <b>${fmtT(todayMin)}${unitT()}</b> min`;
}

function renderPhoto(){
  const fc=state.fc;
  const off=fc.utc_offset_seconds!=null?fc.utc_offset_seconds:0;
  const ev=computeSunEvents(state.loc.lat,state.loc.lon,off);
  const nowLocal=new Date(Date.now()+off*1000);
  const nowM=nowLocal.getUTCHours()*60+nowLocal.getUTCMinutes();
  const rows=[
    ['🌌','Heure bleue (matin)',ev.blueStartAM,ev.sunrise],
    ['🌅','Heure dorée (matin)',ev.sunrise,ev.goldEndAM],
    ['🌇','Heure dorée (soir)',ev.goldStartPM,ev.sunset],
    ['🌌','Heure bleue (soir)',ev.sunset,ev.blueEndPM]
  ];
  let html='';
  rows.forEach(([em,lbl,a,b2])=>{
    const active=a!=null&&b2!=null&&nowM>=a&&nowM<b2;
    html+=`<div class="pol" style="grid-template-columns:34px 1fr auto;${active?'background:color-mix(in srgb,var(--accent) 18%,transparent);border-radius:10px;padding:7px 8px':''}">
      <span style="font-size:18px">${em}</span>
      <span class="pn">${lbl}${active?' · en ce moment !':''}</span>
      <span class="pv">${a!=null&&b2!=null?fmtMin(a)+' – '+fmtMin(b2):'—'}</span></div>`;
  });
  $('#photoBox').innerHTML=html;
}

function renderAdvice(){
  const c=state.fc.current, d=state.fc.daily;
  const T=c.temperature_2m, feels=c.apparent_temperature, wind=c.wind_speed_10m;
  const rain=d.precipitation_probability_max?d.precipitation_probability_max[0]:0;
  const popHour=state.fc.hourly.precipitation_probability||[];
  const nowIdx=Math.max(0,state.fc.hourly.time.findIndex(t=>t.slice(0,13)===c.time.slice(0,13)));
  const rainSoon=popHour.slice(nowIdx,nowIdx+4).some(p=>p>=30);
  const code=c.weather_code, grp=condGroup(code);
  const uv=d.uv_index_max!=null?d.uv_index_max[0]:5;
  const hum=c.relative_humidity_2m;
  const isDay=c.is_day===1;

  let mainIcon, mainDesc, items=[];
  const feelsT=feels;
  if(feelsT<=-5){ mainIcon='🧥'; mainDesc='Tenue grand froid : plusieurs couches et protection extrême.'; items=['Doudoune épaisse','Bonnet','Gants isolants','Écharpe','Chaussures chaudes']; }
  else if(feelsT<=5){ mainIcon='🧥'; mainDesc='Il fait froid, habillez-vous chaudement.'; items=['Manteau','Pull chaud','Bonnet','Écharpe']; if(wind>25)items.push('Coupe-vent'); }
  else if(feelsT<=12){ mainIcon='🧥'; mainDesc='Frais, prévoyez une veste ou un pull.'; items=['Veste','Pull léger']; if(wind>25)items.push('Coupe-vent'); }
  else if(feelsT<=18){ mainIcon='👔'; mainDesc='Température agréable, tenue de mi-saison.'; items=['Pull léger ou chemise','Veste légère']; }
  else if(feelsT<=25){ mainIcon='👕'; mainDesc='Douceur, un t-shirt suffit en journée.'; items=['T-shirt ou chemise']; if(!isDay)items.push('Veste légère pour le soir'); }
  else if(feelsT<=32){ mainIcon='👕'; mainDesc='Chaud, restez léger et hydraté.'; items=['T-shirt léger','Chapeau ou casquette','Lunettes de soleil']; }
  else { mainIcon='👕'; mainDesc='Très chaud, attention à la chaleur.'; items=['Vêtements amples','Chapeau','Lunettes','Crème solaire']; }

  if(rain>=40||rainSoon){ mainIcon='☔'; items.unshift('Parapluie'); }
  if(grp==='snow'){ mainIcon='🧤'; items.unshift('Bottes','Gants imperméables'); }
  if(uv>=6 && isDay) items.push('Crème solaire');
  if(hum>=80 && feelsT>=22) mainDesc+=' · Air humide et lourd';
  if(wind>=40) mainDesc+=' · Vent fort';

  $('#outfitIcon').textContent=mainIcon;
  $('#outfitDesc').textContent=mainDesc;
  $('#outfitItems').innerHTML=items.map(it=>`<span>· ${esc(it)}</span>`).join('');

  const activities=[
    {em:'🚴',lbl:'Vélo', calc:()=>{ let n=5; if(T<5||T>32)n-=2; else if(T<10||T>28)n-=1; if(wind>25)n-=2; else if(wind>18)n-=1; if(rain>=40||rainSoon)n-=2; if(grp==='snow')n-=3; return Math.max(0,Math.min(5,n)); }},
    {em:'🏃',lbl:'Course', calc:()=>{ let n=5; if(T<0||T>30)n-=2; else if(T<5||T>27)n-=1; if(wind>30)n-=2; if(rain>=40||rainSoon)n-=2; if(uv>=8 && isDay)n-=1; return Math.max(0,Math.min(5,n)); }},
    {em:'🧺',lbl:'Pique-nique', calc:()=>{ let n=5; if(T<14||T>32)n-=2; else if(T<17||T>28)n-=1; if(rain>=30||rainSoon)n-=3; if(wind>25)n-=1; return Math.max(0,Math.min(5,n)); }},
    {em:'🍖',lbl:'Barbecue', calc:()=>{ let n=5; if(T<15)n-=2; else if(T>32)n-=1; if(rain>=30||rainSoon)n-=3; if(wind>30)n-=2; else if(wind>22)n-=1; return Math.max(0,Math.min(5,n)); }},
    {em:'🏖️',lbl:'Plage', calc:()=>{ let n=5; if(T<22)n-=3; else if(T<25)n-=1; if(T>36)n-=2; if(rain>=30||rainSoon)n-=3; if(wind>25)n-=2; if(uv>=3 && isDay)n+=0; else n-=1; return Math.max(0,Math.min(5,n)); }},
    {em:'📷',lbl:'Photo', calc:()=>{ let n=4; if(grp==='partly'||grp==='cloud')n+=1; if(grp==='fog')n-=1; if(grp==='heavy'||grp==='thunder')n-=2; if(rain>=50)n-=2; return Math.max(0,Math.min(5,n)); }}
  ];
  $('#activities').innerHTML=activities.map(a=>{
    const s=a.calc();
    const dots=Array.from({length:5},(_,i)=>`<i class="${i<s?'on':''}"></i>`).join('');
    return `<div class="act"><span class="em">${a.em}</span><div><div class="lbl2">${a.lbl}</div><div class="val"><span class="dots">${dots}</span></div></div></div>`;
  }).join('');
}

function renderStats(){
  const c=state.fc.current, h=state.fc.hourly, d=state.fc.daily;
  let hi=h.time.findIndex(t=>t.slice(0,13)===c.time.slice(0,13)); if(hi<0)hi=0;
  const vis=h.visibility?h.visibility[hi]:null;
  const dp=h.dew_point_2m?h.dew_point_2m[hi]:null;
  const dpLab=dp==null?'—':dp<10?'air sec':dp<16?'confortable':dp<18?'un peu lourd':dp<21?'temps lourd':'oppressant';
  const uv=d.uv_index_max!=null?d.uv_index_max[0]:null;
  const uvLab=uv==null?'—':uv<3?'Faible':uv<6?'Modéré':uv<8?'Élevé':uv<11?'Très élevé':'Extrême';
  const cc=c.cloud_cover, ccLab=cc<=25?'ciel dégagé':cc<=60?'partiellement nuageux':'ciel couvert';
  $('#stats').innerHTML=`
    <div class="stat" data-info="swind" title="En savoir plus"><span class="lbl">Vent</span>
      <span class="val"><svg class="compass" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13"/><path class="arr" style="transform:rotate(${Math.round(c.wind_direction_10m)}deg)" d="M15 7l3.4 9-3.4-2.4-3.4 2.4z"/></svg>${fmtW(c.wind_speed_10m)}</span>
      <span class="sub">Direction ${cardOf(c.wind_direction_10m)} (${Math.round(c.wind_direction_10m)}°)</span></div>
    <div class="stat" data-info="sgust" title="En savoir plus"><span class="lbl">Rafales</span><span class="val">${fmtW(c.wind_gusts_10m)}</span><span class="sub">vent instantané max</span></div>
    <div class="stat" data-info="shum" title="En savoir plus"><span class="lbl">Humidité</span><span class="val">${c.relative_humidity_2m}<small>%</small></span><span class="sub">${c.relative_humidity_2m>=70?'atmosphère humide':c.relative_humidity_2m<=35?'air très sec':'confortable'}</span></div>
    <div class="stat" data-info="sdew" title="En savoir plus"><span class="lbl">Point de rosée</span><span class="val">${dp!=null?fmtT(dp)+unitT():'—'}</span><span class="sub">${dpLab}</span></div>
    <div class="stat" data-info="spress" title="En savoir plus"><span class="lbl">Pression</span><span class="val">${Math.round(c.pressure_msl)}<small>hPa</small></span><span class="sub">${c.pressure_msl>1020?'anticyclone':c.pressure_msl<1005?'dépressionnaire':'stable'}</span></div>
    <div class="stat" data-info="suv" title="En savoir plus"><span class="lbl">Indice UV</span><span class="val">${uv!=null?Math.round(uv*10)/10:'—'}<small>${uvLab}</small></span><span class="uvbar"><i style="left:${Math.min(100,(uv||0)/11*100)}%"></i></span></div>
    <div class="stat" data-info="svis" title="En savoir plus"><span class="lbl">Visibilité</span><span class="val">${fmtVis(vis)}</span><span class="sub">${vis!=null&&vis/1000<5?'visibilité réduite':'bonne visibilité'}</span></div>
    <div class="stat" data-info="scloud" title="En savoir plus"><span class="lbl">Nébulosité</span><span class="val">${cc}<small>%</small></span><span class="sub">${ccLab}</span></div>`;
}

function renderHours(){
  const fc=state.fc, c=fc.current, h=fc.hourly;
  let i0=h.time.findIndex(t=>t.slice(0,13)===c.time.slice(0,13)); if(i0<0)i0=0;
  const idx=Array.from({length:24},(_,k)=>i0+k).filter(i=>i<h.time.length);
  const W=78, H=120;
  const tInfo=analyzeThunder();
  const alertSet=new Set(tInfo.hours?tInfo.hours.map(x=>x.i):[]);
  let items='';
  idx.forEach((i,k)=>{
    const pop=h.precipitation_probability?h.precipitation_probability[i]:null;
    const isAlert=alertSet.has(i);
    items+=`<div class="hour ${isAlert?'alert':''}"><span class="ht">${k===0?'Maint.':hm(h.time[i])}</span>${icon(h.weather_code[i],h.is_day[i]===1)}
      <span class="htemp">${fmtT(h.temperature_2m[i])}°</span>
      <span class="hp">${pop>=5?`<svg viewBox="0 0 24 24"><path d="M12 3c3 4.5 6 7.6 6 11a6 6 0 1 1-12 0c0-3.4 3-6.5 6-11z"/></svg>${pop}%`:''}</span></div>`;
  });
  $('#hours').innerHTML=items;
  const temps=idx.map(i=>h.temperature_2m[i]);
  const tmin=Math.min(...temps), tmax=Math.max(...temps), span=Math.max(1,tmax-tmin);
  const pts=idx.map((i,k)=>({x:k*W+W/2, y:96-((temps[k]-tmin)/span)*66}));
  let d=`M${pts[0].x} ${pts[0].y}`;
  for(let k=0;k<pts.length-1;k++){
    const p0=pts[Math.max(k-1,0)],p1=pts[k],p2=pts[k+1],p3=pts[Math.min(k+2,pts.length-1)];
    d+=` C ${p1.x+(p2.x-p0.x)/6} ${p1.y+(p2.y-p0.y)/6}, ${p2.x-(p3.x-p1.x)/6} ${p2.y-(p3.y-p1.y)/6}, ${p2.x} ${p2.y}`;
  }
  const spark=`<svg class="spark" width="${idx.length*W}" height="${H}" viewBox="0 0 ${idx.length*W} ${H}">
    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z" fill="url(#sg)" stroke="none"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>
    ${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="2.6" fill="var(--accent)"/>`).join('')}</svg>`;
  $('#hours').insertAdjacentHTML('afterbegin',spark);
}

function renderDays(){
  const d=state.fc.daily, n=d.time.length;
  const wmin=Math.min(...d.temperature_2m_min), wmax=Math.max(...d.temperature_2m_max), span=Math.max(1,wmax-wmin);
  let html='<button class="info-btn" data-info="days" aria-label="À propos de ce widget">i</button>';
  for(let i=0;i<n;i++){
    const date=new Date(d.time[i]+'T12:00');
    const name=i===0?'Aujourd\u2019hui':cap(date.toLocaleDateString('fr-FR',{weekday:'long'}));
    const sub=date.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
    const left=(d.temperature_2m_min[i]-wmin)/span*100, width=Math.max(5,(d.temperature_2m_max[i]-d.temperature_2m_min[i])/span*100);
    const pop=d.precipitation_probability_max?d.precipitation_probability_max[i]:null;
    html+=`<div class="day"><span class="dn">${name}<small>${sub}</small></span>${icon(d.weather_code[i],true)}
      <span class="dp">${pop>=5?'💧 '+pop+'%':''}</span>
      <span class="dmin">${fmtT(d.temperature_2m_min[i])}°</span>
      <span class="dbar"><i style="left:${left}%;width:${width}%"></i></span>
      <span class="dmax">${fmtT(d.temperature_2m_max[i])}°</span></div>`;
  }
  $('#wDays').innerHTML=html;
}

function renderSunMoon(){
  const d=state.fc.daily, rise=d.sunrise[0], set=d.sunset[0], now=state.fc.current.time;
  $('#riseT').textContent=hm(rise); $('#setT').textContent=hm(set);
  const dm=mins(set)-mins(rise);
  $('#dayLen').textContent=`${Math.floor(dm/60)}h${String(dm%60).padStart(2,'0')}`;
  let p=(mins(now)-mins(rise))/(mins(set)-mins(rise)); p=Math.max(0,Math.min(1,p));
  const path=$('#sunPath'), L=path.getTotalLength(), pt=path.getPointAtLength(p*L);
  const dot=$('#sunDot'); dot.setAttribute('cx',pt.x); dot.setAttribute('cy',pt.y);
  dot.style.opacity=(state.fc.current.is_day?1:.25);
  const syn=29.53058867, ref=Date.UTC(2000,0,6,18,14);
  let age=((Date.now()-ref)/864e5)%syn; if(age<0)age+=syn;
  const f=(1-Math.cos(2*Math.PI*age/syn))/2, waxing=age<syn/2;
  const names=age<1.85?'Nouvelle lune':age<5.5?'Premier croissant':age<9.2?'Premier quartier':age<12.9?'Gibbeuse croissante':age<16.6?'Pleine lune':age<20.3?'Gibbeuse décroissante':age<24?'Dernier quartier':age<27.7?'Dernier croissant':'Nouvelle lune';
  const rx=(20*Math.abs(2*f-1)).toFixed(2);
  const lit = waxing ? `M32 12 A20 20 0 0 1 32 52 A ${rx} 20 0 0 ${f>0.5?1:0} 32 12 Z` : `M32 12 A20 20 0 0 0 32 52 A ${rx} 20 0 0 ${f>0.5?0:1} 32 12 Z`;
  $('#moonSvg').innerHTML=`<circle cx="32" cy="32" r="20" fill="#2a3450"/><path d="${lit}" fill="#f3ecd8"/>`;
  $('#moonName').textContent=names;
  $('#moonIll').textContent=`Illumination ${Math.round(f*100)} % · ${waxing?'croissante':'décroissante'}`;
}

function renderAir(){
  if(!state.aq||!state.aq.current){
    $('#aqiN').textContent='—'; $('#aqiLbl').textContent='indisponible';
    $('#pmTxt').innerHTML='<i>Service « air » d\'Open-Meteo injoignable — nouvel essai automatique en cours…</i>';
    return;
  }
  const a=Math.round(state.aq.current.european_aqi);
  const [lbl,col]=a<=20?['Très bon','#35c26b']:a<=40?['Bon','#8fd14f']:a<=60?['Moyen','#ffd23f']:a<=80?['Médiocre','#ff9f43']:a<=100?['Très médiocre','#ff6b6b']:['Exécrable','#d63cff'];
  $('#aqiN').textContent=a; const b=$('#aqiLbl'); b.textContent=lbl; b.style.background=col;
  const pm25=state.aq.current.pm2_5, pm10=state.aq.current.pm10;
  $('#pmTxt').innerHTML=`Indice européen · PM2,5 : <b>${pm25!=null?pm25.toFixed(1):'—'}</b> µg/m³ · PM10 : <b>${pm10!=null?pm10.toFixed(1):'—'}</b> µg/m³`
    + (state.aqStale?'<br><i>Service momentanément injoignable — dernières valeurs connues (mise à jour auto dès son retour).</i>':'');
}

const polInfo=v=> v<=0?['Nul','#9aa7b3']:v<15?['Faible','#35c26b']:v<50?['Modéré','#ffd23f']:v<100?['Élevé','#ff9f43']:['Très élevé','#ff6b6b'];
/* v1.2.0 : pollen lu dans « hourly » (pic du jour) + message propre hors Europe */
function renderPollen(){
  const h=state.aq&&state.aq.hourly?state.aq.hourly:null;
  const wrap=$('#pollenBox'), badge=$('#polBadge');
  if(!h){ wrap.innerHTML='<div class="sub">Données pollen indisponibles.</div>'; badge.style.display='none'; return; }
  const POL=[['alder_pollen','Aulne'],['birch_pollen','Bouleau'],['grass_pollen','Graminées'],['mugwort_pollen','Armoise'],['olive_pollen','Olivier'],['ragweed_pollen','Ambroisie']];
  const allNull=POL.every(([k])=>{ const arr=h[k]; return !arr||arr.every(v=>v==null); });
  if(allNull){ wrap.innerHTML='<div class="sub">Pollen : prévision disponible en Europe uniquement.</div>'; badge.style.display='none'; return; }
  const dayMax=arr=>{ let m=0; if(arr) for(const v of arr) if(v!=null&&v>m) m=v; return m; };
  let rows='', max=0;
  POL.forEach(([k,n])=>{
    const v=dayMax(h[k]); max=Math.max(max,v);
    const [lab,col]=polInfo(v);
    const w=Math.min(100,Math.round(v/1.5));
    rows+=`<div class="pol"><span class="pn">${n}</span><span class="pbar"><i style="width:${v>0?Math.max(7,w):0}%;background:${col}"></i></span>
      <span class="pv">${Math.round(v)}<em>${lab}</em></span></div>`;
  });
  wrap.innerHTML = (max>0 ? rows : '<div class="sub">Aucun pollen significatif aujourd\u2019hui — profitez-en !</div>')
    + (state.aqStale?'<div class="sub" style="margin-top:6px"><i>Dernières valeurs connues.</i></div>':'');
  const [lab,col]=polInfo(max);
  badge.style.display='inline-block'; badge.style.background=col;
  badge.textContent = max>0 ? 'Risque '+lab.toLowerCase() : 'Nul';
}

const seaState=h=>h<0.5?'mer calme':h<1.25?'mer peu agitée':h<2.5?'mer assez agitée':h<4?'mer agitée':'mer forte';
function renderMarine(){
  const box=$('#marineBox'), arr=$('#waveArr'), note=$('#marineNote');
  const m=state.marine; arr.style.display='none';
  if(!m||!m.current||m.current.wave_height==null){
    box.innerHTML=''; note.textContent='Pas de données marines significatives à proximité de cet emplacement.';
    return;
  }
  const c=m.current;
  const cell=(lbl,val,sub)=>`<div class="mcell"><span class="lbl">${lbl}</span><span class="mv">${val}</span><span class="sub">${sub||''}</span></div>`;
  let html='';
  if(c.sea_surface_temperature!=null){
    const t=c.sea_surface_temperature;
    html+=cell('Eau', fmtT(t)+unitT(), t>=20?'baignade agréable':t>=15?'baignade fraîche':'eau froide');
  }
  if(c.wave_height!=null){
    html+=cell('Vagues', c.wave_height.toFixed(1)+' m', seaState(c.wave_height)+(c.wave_direction!=null?` · venant de ${cardOf(c.wave_direction)}`:''));
    if(c.wave_direction!=null){ arr.style.display='block'; arr.style.transform=`rotate(${Math.round(c.wave_direction+180)}deg)`; }
  }
  if(c.swell_wave_height!=null) html+=cell('Houle', c.swell_wave_height.toFixed(1)+' m', c.swell_wave_direction!=null?`venant de ${cardOf(c.swell_wave_direction)}`:'');
  if(c.wave_period!=null) html+=cell('Période', Math.round(c.wave_period)+' s', 'entre deux vagues');
  box.innerHTML=html;
  note.textContent='Point d\u2019eau le plus proche · modèle océanique Open-Meteo';
}

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
/* v1.2.0 : pause les particules de vent quand la carte n'est pas à l'écran (batterie) */
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

/* ================= DÉMARRAGE ================= */
const APP_VERSION = '1.2.0';
console.log(`%c☁️ Plein Ciel v${APP_VERSION}`, 'color:#ffd166;font-size:18px;font-weight:bold');
console.log('Développé avec ❤️ — météo Open-Meteo, radar RainViewer');
$('#loadIco').innerHTML=icon(2,true);
$('#year').textContent=new Date().getFullYear();
$('#appVersion').textContent=APP_VERSION;
writeURL(state.loc);
applyWidgets();
load();
  /* ================= GÉOLOCALISATION AU DÉMARRAGE ================= */
  /* v1.2.0 : ne casse plus les liens partagés, et évite le double chargement */
function geolocateOnStart() {
  if (!navigator.geolocation) return;
  if (store.get('pc_geo_denied') === '1') return;
  const urlLoc = locFromURL();
  const saved = store.get('pc_loc');
  if (urlLoc && (!saved || Math.hypot(urlLoc.lat - saved.lat, urlLoc.lon - saved.lon) > 0.05)) {
    if (!urlLoc.name || urlLoc.name === 'Lieu partagé') {
      reverseGeocode(urlLoc.lat, urlLoc.lon).then(g => { if (g) setLoc({ lat: urlLoc.lat, lon: urlLoc.lon, name: g.name, sub: g.sub }); });
    }
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async p => {
      const lat = p.coords.latitude, lon = p.coords.longitude;
      const close = Math.hypot(lat - state.loc.lat, lon - state.loc.lon) < 0.05;
      const badName = !state.loc.name || state.loc.name === 'Lieu partagé' || state.loc.name === 'Ma position';
      if (close && !badName) return;
      const g = await reverseGeocode(lat, lon);
      if (close) {
        if (g) {
          state.loc = { lat, lon, name: g.name, sub: g.sub };
          store.set('pc_loc', state.loc); writeURL(state.loc); renderAll();
        }
        return;
      }
      setLoc({ lat, lon, name: g ? g.name : 'Ma position', sub: g ? g.sub : 'Position actuelle' });
    },
    err => {
      if (err.code === err.PERMISSION_DENIED) {
        store.set('pc_geo_denied', '1');
      }
    },
    { timeout: 10000, maximumAge: 600000, enableHighAccuracy: true }
  );
}

const inWebView = !!window.ReactNativeWebView;
setTimeout(geolocateOnStart, inWebView ? 4000 : 1500);

/* ================= ACTUALISATION AUTO ================= */
const REFRESH_MS = 5 * 60 * 1000;
setInterval(async () => {
  try {
    await fetchData();
    renderAll();
    checkThunderAlert();
  } catch (e) {
    console.warn('Actualisation auto échouée, on réessaiera plus tard :', e);
    $('#updated').classList.add('updated-stale');
  }
}, REFRESH_MS);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.fc) {
    if (Date.now() - new Date(state.fc.current.time).getTime() > 2 * 60 * 1000) {
      load();
    }
  }
});

/* ================= PWA ================= */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(e=>console.warn('Service worker non enregistré :',e));
  });
}
let deferredPrompt=null;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e; $('#installBtn').style.display='grid';
});
if(isIOS && !window.matchMedia('(display-mode: standalone)').matches) $('#installBtn').style.display='grid';
function tryInstall(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(ch=>{
      if(ch.outcome==='accepted'){ toast('Appli installée 🎉'); $('#installBtn').style.display='none'; }
      deferredPrompt=null;
    });
  }else if(isIOS){
    toast("Sur iPhone/iPad : bouton Partager puis « Sur l'écran d'accueil »");
  }else{
    toast("Menu du navigateur ⋮ → « Installer l'application »");
  }
}
$('#installBtn').addEventListener('click',tryInstall);
window.addEventListener('appinstalled',()=>toast('Plein Ciel ajouté à votre appareil 🎉'));
window.addEventListener('offline',()=>toast('📴 Hors ligne — dernières données affichées'));
window.addEventListener('online',()=>toast('📶 De retour en ligne'));

/* ================= CARTE « EMPORTER LE CIEL » (QR + APK) ================= */
const APK_URL='';
(function initGetApp(){
  const base=location.origin+location.pathname;
  const qr=$('#qrImg');
  if(qr){
    qr.src=`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(base)}`;
    qr.addEventListener('error',()=>{ qr.style.display='none'; });
  }
  if(APK_URL){ const a=$('#gaApkBtn'); a.style.display='inline-flex'; a.href=APK_URL; a.target='_blank'; a.rel='noopener'; }
  const gb=$('#gaInstallBtn'); if(gb) gb.addEventListener('click',tryInstall);
  const cb=$('#gaCopyBtn'); if(cb) cb.addEventListener('click',async()=>{
    try{ await navigator.clipboard.writeText(base); toast('Lien copié 📋'); }catch(e){ toast('Copie impossible'); }
  });
})();
