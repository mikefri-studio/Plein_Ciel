"use strict";
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
