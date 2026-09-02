"use strict";
/* ================= DÉMARRAGE ================= */
const APP_VERSION='1.8.0';
console.log(`%c☁️ Plein Ciel v${APP_VERSION}`, 'color:#ffd166;font-size:18px;font-weight:bold');
console.log('Développé avec ❤️ — météo Open-Meteo, radar RainViewer');
$('#loadIco').innerHTML=icon(2,true);
$('#year').textContent=new Date().getFullYear();
$('#appVersion').textContent=APP_VERSION;
if(state.loc&&state.loc.lat==null&&state.loc.latitude!=null){state.loc.lat=state.loc.latitude;state.loc.lon=state.loc.longitude;store.set('pc_loc',state.loc);}
writeURL(state.loc);
applyWidgets();
if(typeof applyWidgetOrder==='function') applyWidgetOrder();
load();
  /* ================= GÉOLOCALISATION AU DÉMARRAGE ================= */
  /* v1.4.1 : ne casse plus les liens partagés, et évite le double chargement */
function geolocateOnStart() {
  if (!navigator.geolocation) return;
  if (store.get('pc_geo_denied') === '1') return;
  if (store.get('pc_geo_auto') === '0') return;
  const urlLoc = locFromURL();
  const saved = store.get('pc_loc');
  if (urlLoc && (!saved || Math.hypot(urlLoc.lat - saved.lat, urlLoc.lon - saved.lon) > 0.05)) {
    if (!urlLoc.name || urlLoc.name === 'Lieu partagé') {
      reverseGeocode(urlLoc.lat, urlLoc.lon).then(g => { if (g) setLoc({ lat: urlLoc.lat, lon: urlLoc.lon, name: g.name, sub: g.sub }); });
    }
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async p => {
      const lat = p.coords.latitude, lon = p.coords.longitude;
      const close = Math.hypot(lat - state.loc.lat, lon - state.loc.lon) < 0.05;
      const badName = !state.loc.name || state.loc.name === 'Lieu partagé' || state.loc.name === 'Ma position';
      if (close && !badName) return;
      const g = await reverseGeocode(lat, lon);
      if (close) {
        if (g) {
          state.loc = { lat, lon, name: g.name, sub: g.sub };
          store.set('pc_loc', state.loc); writeURL(state.loc); renderAll();
        }
        return;
      }
      setLoc({ lat, lon, name: g ? g.name : 'Ma position', sub: g ? g.sub : 'Position actuelle' });
    },
    err => {
      if (err.code === err.PERMISSION_DENIED) {
        store.set('pc_geo_denied', '1');
      }
    },
    { timeout: 10000, maximumAge: 600000, enableHighAccuracy: true }
  );
}

const inWebView = !!window.ReactNativeWebView;
setTimeout(geolocateOnStart, inWebView ? 4000 : 1500);

/* ================= ACTUALISATION AUTO ================= */
const REFRESH_MS = 5 * 60 * 1000;
setInterval(async () => {
  try {
    await fetchData();
    renderAll();
    checkThunderAlert();
  } catch (e) {
    console.warn('Actualisation auto échouée, on réessaiera plus tard :', e);
    $('#updated').classList.add('updated-stale');
  }
}, REFRESH_MS);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.fc) {
    if (Date.now() - new Date(state.fc.current.time).getTime() > 2 * 60 * 1000) {
      load();
    }
  }
});

/* ================= PWA ================= */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(e=>console.warn('Service worker non enregistré :',e));
  });
}
let deferredPrompt=null;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e;
});

function tryInstall(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(ch=>{
      if(ch.outcome==='accepted'){ toast('Appli installée 🎉'); }
      deferredPrompt=null;
    });
  }else if(isIOS){
    toast("Sur iPhone/iPad : bouton Partager puis « Sur l'écran d'accueil »");
  }else{
    toast("Menu du navigateur ⋮ → « Installer l'application »");
  }
}

window.addEventListener('appinstalled',()=>toast('Plein Ciel ajouté à votre appareil 🎉'));
window.addEventListener('offline',()=>toast('📴 Hors ligne — dernières données affichées'));
window.addEventListener('online',()=>toast('📶 De retour en ligne'));

/* ================= CARTE « EMPORTER LE CIEL » (QR + APK) ================= */
const APK_URL='';
(function initGetApp(){
  const base=location.origin+location.pathname;
  const qr=$('#qrImg');
  if(qr){
    qr.src=`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(base)}`;
    qr.addEventListener('error',()=>{ qr.style.display='none'; });
  }
  if(APK_URL){ const a=$('#gaApkBtn'); a.style.display='inline-flex'; a.href=APK_URL; a.target='_blank'; a.rel='noopener'; }
  const gb=$('#gaInstallBtn'); if(gb) gb.addEventListener('click',tryInstall);
  const cb=$('#gaCopyBtn'); if(cb) cb.addEventListener('click',async()=>{
    try{ await navigator.clipboard.writeText(base); toast('Lien copié 📋'); }catch(e){ toast('Copie impossible'); }
  });
})();

/* ===== Repli barres système dans l'appli (WebView) ===== */
(function(){
  var inApp = (typeof window.ReactNativeWebView!=='undefined') || /\bwv\b/.test(navigator.userAgent||'');
  if(!inApp) return;
  var probe=document.createElement('div');
  probe.style.cssText='position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
  document.documentElement.appendChild(probe);
  var envTop=parseFloat(getComputedStyle(probe).paddingTop)||0;
  probe.remove();
  if(envTop>0) return;
  document.documentElement.classList.add('in-app');
  var v=document.getElementById('appVersion');
  if(v && v.parentElement) v.parentElement.style.paddingBottom='70px';
})();

/* ===== Espace réservé sous le pied de page dans l'appli ===== */
(function(){
  if(!(typeof window.ReactNativeWebView!=='undefined' || /\bwv\b/.test(navigator.userAgent||''))) return;
  if(document.getElementById('spacerBas')) return;
  var sp=document.createElement('div');
  sp.id='spacerBas';
  sp.style.height='90px';
  sp.style.flexShrink='0';
  document.body.appendChild(sp);
})();


/* ================= PULL-UP-TO-REFRESH (en bas) ================= */
(function initPullToRefresh(){
  let startY=0, currentY=0, isPulling=false, threshold=100;
  const ptr=document.createElement('div');
  ptr.id='pullToRefresh';
  ptr.innerHTML='<div style="display:flex;align-items:center;justify-content:center;padding:12px;background:linear-gradient(0deg,rgba(90,180,255,.15),transparent);color:#eef4ff;font-size:14px"><span class="ptr-icon">⬆️</span>&nbsp;<span class="ptr-text">Tirez vers le haut pour rafraîchir</span></div>';
  ptr.style.cssText='position:fixed;bottom:0;left:0;right:0;height:0;overflow:hidden;z-index:9999;transition:height .2s';
  document.body.appendChild(ptr);
  const ptrIcon=ptr.querySelector('.ptr-icon');
  const ptrText=ptr.querySelector('.ptr-text');
  function onStart(e){
    const scrollBottom=document.documentElement.scrollHeight-window.innerHeight-window.scrollY;
    if(scrollBottom<50){
      isPulling=true;
      startY=e.type==='touchstart'?e.touches[0].pageY:e.pageY;
      ptr.style.transition='none';
    }
  }
  function onMove(e){
    if(!isPulling)return;
    currentY=startY-(e.type==='touchmove'?e.touches[0].pageY:e.pageY);
    if(currentY>0){
      e.preventDefault();
      const height=Math.min(currentY*0.6,150);
      ptr.style.height=height+'px';
      const progress=height/threshold;
      if(progress>=1){ptrIcon.textContent='🔄';ptrText.textContent='Relâchez pour rafraîchir';}
      else{ptrIcon.textContent='⬆️';ptrText.textContent='Tirez vers le haut pour rafraîchir';}
    }
  }
  async function onEnd(){
    if(!isPulling)return;
    isPulling=false;
    const height=parseFloat(ptr.style.height)||0;
    if(height>=threshold){
      ptrIcon.textContent='';ptrText.textContent='Rafraîchissement...';
      try{
        await fetchData();renderAll();checkThunderAlert();
        ptrIcon.textContent='✅';ptrText.textContent='Actualisé !';
        setTimeout(()=>{ptr.style.height='0px';ptrIcon.textContent='⬆️';ptrText.textContent='Tirez vers le haut pour rafraîchir';},800);
      }catch(e){
        ptrIcon.textContent='❌';ptrText.textContent='Échec';
        setTimeout(()=>{ptr.style.height='0px';ptrIcon.textContent='⬆️';ptrText.textContent='Tirez vers le haut pour rafraîchir';},1000);
      }
    }else{ptr.style.height='0px';ptrIcon.textContent='⬆️';ptrText.textContent='Tirez vers le haut pour rafraîchir';}
    ptr.style.transition='height .2s';
  }
  document.addEventListener('touchstart',onStart,{passive:true});
  document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('touchend',onEnd);
  document.addEventListener('mousedown',onStart);
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onEnd);
})();
