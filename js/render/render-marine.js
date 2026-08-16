"use strict";
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
