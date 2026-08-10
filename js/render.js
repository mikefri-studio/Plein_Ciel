"use strict";
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

