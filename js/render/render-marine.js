"use strict";
function tidesBlock(m){
  const h=m.hourly; if(!h||!h.sea_level_height_msl||!h.time)return '';
  const s=h.sea_level_height_msl, t=h.time;
  const now=(m.current&&m.current.time)||'';
  let start=0;
  if(now){ for(let i=0;i<t.length;i++){ if(t[i]>=now){ start=i; break; } } }
  const ev=[];
  for(let i=Math.max(1,start);i<s.length-1&&ev.length<4;i++){
    if(s[i]==null||s[i-1]==null||s[i+1]==null)continue;
    if(s[i]>s[i-1]&&s[i]>=s[i+1]) ev.push({t:t[i],h:s[i],type:'Haute'});
    else if(s[i]<s[i-1]&&s[i]<=s[i+1]) ev.push({t:t[i],h:s[i],type:'Basse'});
  }
  if(!ev.length)return '';
  return '<div style="grid-column:1/-1;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12)"><span class="lbl">Marées prochaines</span><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">'
   + ev.map(e=>'<span style="background:rgba(255,255,255,.08);border-radius:10px;padding:6px 10px;font-size:12.5px">'+(e.type==='Haute'?'⬆️':'⬇️')+' <b>'+e.type+'</b> '+e.t.slice(11,16)+' · '+e.h.toFixed(1)+' m</span>').join('')
   +'</div><div style="opacity:.5;font-size:11px;margin-top:6px">Modèle indicatif — ne remplace pas un annuaire de marées officiel.</div></div>';
}
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
  if(store.get('pc_marine_plus')==='1'){
    if(c.swell_wave_period!=null) html+=cell('Période houle', Math.round(c.swell_wave_period)+' s', 'idéal surf si >10 s');
    if(c.wind_wave_height!=null) html+=cell('Vague de vent', c.wind_wave_height.toFixed(1)+' m', c.wind_wave_direction!=null?'venant de '+cardOf(c.wind_wave_direction):'');
    if(c.ocean_current_velocity!=null) html+=cell('Courant', c.ocean_current_velocity.toFixed(1)+' km/h', c.ocean_current_direction!=null?'vers '+cardOf(c.ocean_current_direction):'');
  }
  box.innerHTML=html+((store.get('pc_marine_plus')==='1')?tidesBlock(m):'');
  note.textContent='Point d\u2019eau le plus proche · modèle océanique Open-Meteo';
}
