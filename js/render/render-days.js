"use strict";
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
    html+=`<div class="day" data-day="${i}" style="cursor:pointer"><span class="dn">${name}<small>${sub}</small></span>${icon((function(){const hc=state.fc.hourly;const code=hc&&calcDayIcon(hc.weather_code,hc.time,d.time[i]);return code!=null?code:d.weather_code[i];})(),true)}
      <span class="dp">${pop>=5?'💧 '+pop+'%':''}</span>
      <span class="dmin">${fmtT(d.temperature_2m_min[i])}°</span>
      <span class="dbar"><i style="left:${left}%;width:${width}%"></i></span>
      <span class="dmax">${fmtT(d.temperature_2m_max[i])}°</span></div>`;
  }
  $('#wDays').innerHTML=html;
  
  // Ajouter les event listeners après le rendu
  setTimeout(() => {
    document.querySelectorAll('.day').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.day);
        if (typeof showDayDetail === 'function') {
          showDayDetail(idx);
        }
      });
    });
  }, 0);
}
