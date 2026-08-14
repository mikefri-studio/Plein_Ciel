"use strict";
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
    items+=`<div class="hour ${isAlert?'alert':''}"><span class="ht">${k===0?'Maint.':hm(h.time[i])}</span>${icon(h.weather_code[i],h.is_day[i]==1)}
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
