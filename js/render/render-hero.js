"use strict";
const safe=(name,f)=>{ try{ f(); }catch(err){ console.error('Erreur de rendu ['+name+'] :',err); } };
function renderAll(){
  const fc=state.fc, c=fc.current, day=fc.daily, isDay=c.is_day==1, code=c.weather_code;
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
