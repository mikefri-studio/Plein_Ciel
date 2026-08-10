"use strict";
function renderStats(){
  const c=state.fc.current, h=state.fc.hourly, d=state.fc.daily;
  let hi=h.time.findIndex(t=>t.slice(0,13)===c.time.slice(0,13)); if(hi<0)hi=0;
  const vis=h.visibility?h.visibility[hi]:null;
  const dp=h.dew_point_2m?h.dew_point_2m[hi]:null;
  const dpLab=dp==null?'—':dp<10?'air sec':dp<16?'confortable':dp<18?'un peu lourd':dp<21?'temps lourd':'oppressant';
  const uv=d.uv_index_max!=null?d.uv_index_max[0]:null;
  const uvLab=uv==null?'—':uv<3?'Faible':uv<6?'Modéré':uv<8?'Élevé':uv<11?'Très élevé':'Extrême';
  const cc=c.cloud_cover, ccLab=cc<=25?'ciel dégagé':cc<=60?'partiellement nuageux':'ciel couvert';
  $('#stats').innerHTML=`
    <div class="stat" data-info="swind" title="En savoir plus"><span class="lbl">Vent</span>
      <span class="val"><svg class="compass" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13"/><path class="arr" style="transform:rotate(${Math.round(c.wind_direction_10m)}deg)" d="M15 7l3.4 9-3.4-2.4-3.4 2.4z"/></svg>${fmtW(c.wind_speed_10m)}</span>
      <span class="sub">Direction ${cardOf(c.wind_direction_10m)} (${Math.round(c.wind_direction_10m)}°)</span></div>
    <div class="stat" data-info="sgust" title="En savoir plus"><span class="lbl">Rafales</span><span class="val">${fmtW(c.wind_gusts_10m)}</span><span class="sub">vent instantané max</span></div>
    <div class="stat" data-info="shum" title="En savoir plus"><span class="lbl">Humidité</span><span class="val">${c.relative_humidity_2m}<small>%</small></span><span class="sub">${c.relative_humidity_2m>=70?'atmosphère humide':c.relative_humidity_2m<=35?'air très sec':'confortable'}</span></div>
    <div class="stat" data-info="sdew" title="En savoir plus"><span class="lbl">Point de rosée</span><span class="val">${dp!=null?fmtT(dp)+unitT():'—'}</span><span class="sub">${dpLab}</span></div>
    <div class="stat" data-info="spress" title="En savoir plus"><span class="lbl">Pression</span><span class="val">${Math.round(c.pressure_msl)}<small>hPa</small></span><span class="sub">${c.pressure_msl>1020?'anticyclone':c.pressure_msl<1005?'dépressionnaire':'stable'}</span></div>
    <div class="stat" data-info="suv" title="En savoir plus"><span class="lbl">Indice UV</span><span class="val">${uv!=null?Math.round(uv*10)/10:'—'}<small>${uvLab}</small></span><span class="uvbar"><i style="left:${Math.min(100,(uv||0)/11*100)}%"></i></span></div>
    <div class="stat" data-info="svis" title="En savoir plus"><span class="lbl">Visibilité</span><span class="val">${fmtVis(vis)}</span><span class="sub">${vis!=null&&vis/1000<5?'visibilité réduite':'bonne visibilité'}</span></div>
    <div class="stat" data-info="scloud" title="En savoir plus"><span class="lbl">Nébulosité</span><span class="val">${cc}<small>%</small></span><span class="sub">${ccLab}</span></div>`;
}
