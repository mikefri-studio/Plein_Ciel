"use strict";
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
