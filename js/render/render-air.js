"use strict";
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
