"use strict";
/* ================= ALERTE ORAGE ================= */
function analyzeThunder(){
  const fc=state.fc; if(!fc||!fc.hourly)return {level:0};
  const h=fc.hourly, c=fc.current;
  let i0=h.time.findIndex(t=>t.slice(0,13)===c.time.slice(0,13)); if(i0<0)i0=0;
  const thunderHours=[];
  const codes=h.weather_code, pops=h.precipitation_probability||[];
  for(let i=i0;i<Math.min(i0+18, codes.length);i++){
    const code=codes[i], pop=pops[i]||0;
    if(code===95||code===96||code===99){ thunderHours.push({i,code,pop,time:h.time[i]}); }
    else if(pop>=70 && (code>=80&&code<=82)){ thunderHours.push({i,code,pop,time:h.time[i]}); }
  }
  if(!thunderHours.length) return {level:0};
  const first=thunderHours[0];
  const deltaMin=(first.i-i0)*60;
  let level;
  if(first.i===i0) level=3;
  else if(deltaMin<=120) level=2;
  else level=1;
  const hail=thunderHours.some(x=>x.code===96||x.code===99);
  return {level,inMinutes:deltaMin,firstTime:first.time,count:thunderHours.length,hail,hours:thunderHours};
}
function playAlertSound(){
  if(state.alert.muted) return;
  try{
    if(!state.audioCtx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return;
      state.audioCtx=new AC();
    }
    const ctx=state.audioCtx, t0=ctx.currentTime;
    const beep=(freq,start,dur)=>{
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type='sine'; osc.frequency.value=freq;
      gain.gain.setValueAtTime(0,t0+start);
      gain.gain.linearRampToValueAtTime(0.15,t0+start+0.02);
      gain.gain.linearRampToValueAtTime(0,t0+start+dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0+start); osc.stop(t0+start+dur+0.05);
    };
    beep(880,0,0.12); beep(880,0.18,0.12); beep(880,0.36,0.12); beep(660,0.6,0.4);
  }catch(e){ console.warn('Son alerte indisponible',e); }
}
function sendBrowserNotification(title,body){
  if(store.get('pc_alert_notif')!=='1') return;
  if(!('Notification' in window)) return;
  if(Notification.permission==='granted'){
    try{
      if(window.ReactNativeWebView){
        // Appli Android : envoie au natif pour vraie notification système
        window.ReactNativeWebView.postMessage('alert:'+JSON.stringify({title,body}));
      }else{
        // PC : notification navigateur
        new Notification(title,{body,tag:'pleinciel-thunder'});
      }
    }catch(e){}
    try{ if(navigator.vibrate) navigator.vibrate([300,150,300]); }catch(e){}
  }
}
/* v1.4.0 : hauteur de bannière mesurée → plus de chevauchement du header sur mobile */
function syncAlertHeight(){
  if(!document.body.classList.contains('has-alert'))return;
  const h=$('#alertBar').offsetHeight;
  if(h) document.documentElement.style.setProperty('--alert-h',h+'px');
}
addEventListener('resize',syncAlertHeight);
function updateAlertBar(info){
  const bar=$('#alertBar'), txt=$('#alertText');
  if(!info||info.level===0){
    bar.classList.remove('on');
    document.body.classList.remove('has-alert');
    return;
  }
  const city=state.loc.name;
  let msg='';
  if(info.radar){
    const distTxt=(info.distance==null||info.distance>=99)?'à proximité':(info.distance<1?'moins de 1 km':`à ${info.distance} km`);
    msg = info.level>=3 ? `<b>CELLULE ORAGEUSE AU RADAR</b> · ${city} — ${distTxt}, mettez-vous à l'abri` : `<b>PLUIE AU RADAR</b> · ${city} — précipitations ${distTxt}`;
  } else if(info.level===3){
    msg=`<b>ORAGE EN COURS</b> · ${city} — mettez-vous à l'abri`;
  }else{
    const h=Math.floor(info.inMinutes/60), m=info.inMinutes%60;
    const when = h>0 ? `dans ${h}h${m?String(m).padStart(2,'0'):''}` : `dans ${m} min`;
    const hailTag = info.hail ? ' — risque de grêle' : '';
    msg=`<b>ALERTE ORAGE</b> · ${city} · ${info.count} créneau${info.count>1?'x':''} orageux prévu${info.count>1?'s':''} ${when}${hailTag}`;
  }
  txt.innerHTML=msg;
  bar.classList.add('on');
  document.body.classList.add('has-alert');
  requestAnimationFrame(syncAlertHeight);
}
async function radarLevelAtLoc(){
  const R=state.radar;
  if(!R.host||!R.frames.length) return {level:0,distance:99};
  const frame=R.frames[Math.max(0,R.pastCount-1)];
  const z=7, n=1<<z;
  const lat=state.loc.lat, lon=state.loc.lon;
  const xf=(lon+180)/360*n, yf=(1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*n;
  const x=Math.floor(xf), y=Math.floor(yf);
  const url=`${R.host}${frame.path}/256/${z}/${x}/${y}/2/1_1.png`;
  const blob=await fetch(url).then(r=>r.ok?r.blob():null);
  if(!blob) return {level:0,distance:99};
  const bmp=await createImageBitmap(blob);
  const cv=document.createElement('canvas'); cv.width=256; cv.height=256;
  const cx=cv.getContext('2d',{willReadFrequently:true});
  cx.drawImage(bmp,0,0);
  const px=Math.round((xf-x)*256), py=Math.round((yf-y)*256);
  const kmPerPx=(40075.017*Math.cos(lat*Math.PI/180))/(n*256);
  const scan=31;
  const x0=Math.max(0,Math.min(256-scan,Math.round(px-scan/2))), y0=Math.max(0,Math.min(256-scan,Math.round(py-scan/2)));
  const d=cx.getImageData(x0,y0,scan,scan).data;
  let lvl=0, minDist=99;
  for(let dy=0;dy<scan;dy++)for(let dx=0;dx<scan;dx++){
    const i=(dy*scan+dx)*4;
    if(d[i+3]<20) continue;
    const r=d[i],g=d[i+1],b=d[i+2];
    const dist=Math.hypot(dx-(px-x0),dy-(py-y0))*kmPerPx;
    if(dist>=minDist) continue;
    minDist=dist;
    lvl=Math.max(lvl, ((r>200&&g<180)||(r>140&&b>190))?3:1);
  }
  return {level:lvl, distance:Math.round(minDist*10)/10};
}
async function checkThunderAlert(forceNotify=false){
  let info=analyzeThunder();
  if(info.level===0){
    try{
      const r=await radarLevelAtLoc();
      const maxKm=Number(store.get('pc_rain_radius')||10);
      if(r.level>0 && r.distance<=maxKm) info={level:r.level, distance:r.distance, radar:true, firstTime:'radar'+(state.radar.frames[Math.max(0,state.radar.pastCount-1)]||{time:0}).time};
    }catch(e){}
  }
  updateAlertBar(info);
  if(info.level===0) return;
  const episodeId=info.firstTime+'-'+info.level;
  if(episodeId===state.alert.lastSeen && !forceNotify) return;
  state.alert.lastSeen=episodeId;
  store.set('pc_alert_seen',episodeId);
  playAlertSound();
  const titles=['Pré-alerte orage','Alerte orage imminente','ORAGE EN COURS'];
  const bodies=[
    `Des orages sont prévus dans les prochaines heures à ${state.loc.name}.`,
    `Orages attendus à ${state.loc.name}${info.hail?' (risque de grêle)':''}. Restez vigilant.`,
    `Orage en cours à ${state.loc.name}. Évitez les espaces exposés.`
  ];
  sendBrowserNotification('⛈️ '+titles[info.level-1], bodies[info.level-1]);
}
$('#alertCloseBtn').addEventListener('click',()=>{
  $('#alertBar').classList.remove('on');
  document.body.classList.remove('has-alert');
});
function syncAlertPrefs(){
  const n=$('#setNotif'), s=$('#setSound');
  if(n) n.checked = store.get('pc_alert_notif')==='1';
  if(s) s.checked = !state.alert.muted;
}
$('#setNotif').addEventListener('change',async e=>{
  if(e.target.checked){
    try{
      const p=('Notification' in window)?await Notification.requestPermission():'granted';
      if(p==='granted'){ store.set('pc_alert_notif','1'); toast('🔔 Notifications d\'orage activées'); }
      else { e.target.checked=false; store.set('pc_alert_notif','0'); toast('Notifications refusées par le navigateur'); }
    }catch(err){ e.target.checked=false; toast('Impossible de demander la permission.'); }
  } else {
    store.set('pc_alert_notif','0');
    toast('Notifications d\'orage désactivées');
  }
});
$('#setSound').addEventListener('change',e=>{
  state.alert.muted=!e.target.checked;
  store.set('pc_alert_muted',state.alert.muted?'1':'0');
  toast(state.alert.muted?'Bip sonore désactivé':'Bip sonore activé');
});
syncAlertPrefs();
setInterval(()=>{ if(state.fc) checkThunderAlert(); }, 10*60*1000);

