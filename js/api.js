"use strict";
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

