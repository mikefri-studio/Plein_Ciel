/* Plein Ciel — service worker (PWA) */
const VERSION='v1';
const SHELL_CACHE='pc-shell-'+VERSION;
const DATA_CACHE='pc-data-'+VERSION;

const SHELL_ASSETS=[
  './',
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

/* APIs météo : réseau d'abord, repli hors-ligne sur le cache */
const API_HOSTS=[
  'api.open-meteo.com','geocoding-api.open-meteo.com','marine-api.open-meteo.com',
  'air-quality-api.open-meteo.com','archive-api.open-meteo.com','api.rainviewer.com'
];
/* Polices & libs : cache avec mise à jour en arrière-plan */
const STATIC_HOSTS=['unpkg.com','fonts.googleapis.com','fonts.gstatic.com'];
/* Les tuiles de carte (Esri/CARTO/RainViewer) ne sont PAS cachées : trop volumineuses */

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL_ASSETS.map(u=>cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==SHELL_CACHE&&k!==DATA_CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Limite la taille du cache données (quota navigateur) */
async function trimCache(name,max){
  const cache=await caches.open(name);
  const keys=await cache.keys();
  if(keys.length>max) await Promise.all(keys.slice(0,keys.length-max).map(k=>cache.delete(k)));
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  /* 1) Navigation : réseau d'abord, sinon la page en cache */
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      try{
        const res=await fetch(req);
        const cache=await caches.open(SHELL_CACHE);
        cache.put('index.html',res.clone());
        return res;
      }catch(err){
        const cache=await caches.open(SHELL_CACHE);
        return (await cache.match('index.html'))||(await cache.match('./'))||
          new Response('<h1 style="font-family:sans-serif">Plein Ciel — hors ligne 📴</h1>',{headers:{'Content-Type':'text/html'}});
      }
    })());
    return;
  }

  /* 2) APIs météo : réseau d'abord + sauvegarde pour le hors-ligne */
  if(API_HOSTS.includes(url.hostname)){
    e.respondWith((async()=>{
      try{
        const res=await fetch(req);
        if(res.ok){
          const cache=await caches.open(DATA_CACHE);
          cache.put(req,res.clone());
          trimCache(DATA_CACHE,120);
        }
        return res;
      }catch(err){
        const cached=await caches.match(req);
        if(cached)return cached;
        throw err;
      }
    })());
    return;
  }

  /* 3) Statiques (polices, leaflet, icones…) : cache d'abord, maj en fond */
  if(url.hostname===self.location.hostname||STATIC_HOSTS.includes(url.hostname)){
    e.respondWith((async()=>{
      const cached=await caches.match(req);
      const net=fetch(req).then(res=>{
        if(res&&(res.ok||res.type==='opaque')){
          caches.open(SHELL_CACHE).then(c=>c.put(req,res.clone()));
        }
        return res;
      }).catch(()=>cached);
      return cached||net;
    })());
    return;
  }
  /* 4) Le reste (tuiles carte) : passe directement */
});
