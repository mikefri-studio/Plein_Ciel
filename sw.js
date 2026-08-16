const CACHE = 'pleinciel-1.7.7';
const CORE = [
  './', 'index.html', 'css/style.css',
  'js/core.js','js/api.js','js/alerts.js','js/info.js','js/info-versions.js',
  'js/render/render-hero.js','js/render/render-rain.js','js/render/render-advice.js',
  'js/render/render-stats.js','js/render/render-hours.js','js/render/render-days.js',
  'js/render/render-sun.js','js/render/render-air.js','js/render/render-marine.js',
  'js/render.js','js/map.js','js/ui/ui-favs.js','js/ui/ui-search.js','js/ui/ui-settings.js','js/ui/ui-effects.js','js/ui/ui-share-card.js',
  'js/ui.js','js/main.js',
  'manifest.webmanifest', 'icon-180.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Données météo & tuiles : toujours réseau (infos vivantes)
  if (url.hostname !== location.hostname) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      if (r.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() =>
      caches.match(e.request).then(m =>
        m || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});
