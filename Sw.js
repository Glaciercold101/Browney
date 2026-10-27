// Service Worker for Notebook App - caches offline adjacent files
// Cache version - bump this to force update
const CACHE_NAME = 'nb-app-v1';
const OFFLINE_URLS = [
  './',
  './index.html',
  './Help/helpindex.html',
  './Help/helpindex',
  './dbs/dbs-design.html',
  './dbs/dbs-design',
  './offline-spreadsheets-charts/sheetsoffline.html',
  './offline-spreadsheets-charts/sheetsoffline'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline files');
      // Use addAll with no-cache to get fresh
      return cache.addAll(OFFLINE_URLS.map(url => new Request(url, {cache: 'no-cache'}))).catch(err => {
        console.warn('[SW] addAll failed, trying individual:', err);
        // Try one by one so one 404 doesn't break all
        return Promise.allSettled(OFFLINE_URLS.map(u => cache.add(u).catch(e => console.warn('[SW] failed to cache', u, e))));
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET
  if (req.method !== 'GET') return;
  
  // For our 3 offline pages, try cache-first, then network
  const url = new URL(req.url);
  const isOfflineFile = OFFLINE_URLS.some(path => url.pathname.endsWith(path.replace('./','')) || url.href.includes(path.replace('./','')));
  // Also check if request is for Help, dbs, offline-spreadsheets-charts
  const isAdjacentFolder = url.pathname.includes('/Help/') || url.pathname.includes('/dbs/') || url.pathname.includes('/offline-spreadsheets-charts/');
  
  if (isOfflineFile || isAdjacentFolder) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // Update cache in background
          fetch(req).then(res => {
            if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res));
          }).catch(()=>{});
          return cached;
        }
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        }).catch(() => caches.match(req));
      })
    );
    return;
  }
  
  // For everything else, network-first fallback to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
