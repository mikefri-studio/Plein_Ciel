"use strict";
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
