// Notebook Studio v153-fixed - ONLINE service worker (404 fix)
// Fixes: iconfont.* double-extension typos (.eot.eot / .woff.woff / .woff2.woff2 / .tff)
//        + removes non-existent iconfont.html + adds Luckysheet loading.gif (GitHub Pages / static hosting)
// Use this file for the ONLINE push only.
// Do NOT use the wrapper's service-worker.js (network-only, for the .exe) for online,
// and do NOT use the old SalvationBeads SW.
//
// File must sit at ROOT next to index.html, and be registered from index.html:
//   navigator.serviceWorker.register('./service-worker.js')
// If you name it Sw.js instead, register './Sw.js' - name must match exactly.
// Cache version - bump this EVERY time you push a new v148 build, or
// browsers will keep serving the old cached copy.
const CACHE_NAME = 'notebook-studio-v148-fixed';

// Everything that must be available offline / on first load.
// This is built from your folder_structure.txt + what v148.html actually links to.
// NOTE: case matters on GitHub Pages (Linux). This list uses capital Help
// because v148.html links to ./Help/helpindex.html. Your folder on disk
// MUST be named Help (capital H), not help, or it will 404 online.
const PRECACHE_URLS = [
  './',
  './index.html', // = v148.html renamed
  './manifest.json',
  './version.json',
  // Adjacent pages v148 links to
  './Help/helpindex.html',
  './dbs/dbs-design.html',
  './flashcards/flashcards.html',
  './offline-spreadsheets-charts/sheetsoffline.html',
  // sheetsoffline.html loads these at runtime - if you only cache
  // sheetsoffline.html, spreadsheets break offline. Cache them all.
  './offline-spreadsheets-charts/offline_cdn/chart.umd.min.js',
  './offline-spreadsheets-charts/offline_cdn/echarts.min.js',
  './offline-spreadsheets-charts/offline_cdn/iconfont.css',
  './offline-spreadsheets-charts/offline_cdn/luckysheet.css',
  './offline-spreadsheets-charts/offline_cdn/luckysheet.umd.js',
  './offline-spreadsheets-charts/offline_cdn/plugin.js',
  './offline-spreadsheets-charts/offline_cdn/plugins.css',
  './offline-spreadsheets-charts/offline_cdn/pluginsCss.css',
  './offline-spreadsheets-charts/offline_cdn/xlsx.full.min.js',
  './offline-spreadsheets-charts/offline_cdn/loading.gif',
  './offline-spreadsheets-charts/iconfont/Anton-Regular.ttf',
  './offline-spreadsheets-charts/iconfont/demo.css',
  './offline-spreadsheets-charts/iconfont/demo_index.html',
  './offline-spreadsheets-charts/iconfont/HanaleiFill-Regular.ttf',
  './offline-spreadsheets-charts/iconfont/iconfont.css',
  './offline-spreadsheets-charts/iconfont/iconfont.eot',
  './offline-spreadsheets-charts/iconfont/iconfont.js',
  './offline-spreadsheets-charts/iconfont/iconfont.json',
  './offline-spreadsheets-charts/iconfont/iconfont.ttf',
  './offline-spreadsheets-charts/iconfont/iconfont.woff',
  './offline-spreadsheets-charts/iconfont/iconfont.woff2',
  './offline-spreadsheets-charts/iconfont/Pacifico-Regular.ttf',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Add one-by-one so one 404 doesn't kill the whole install.
      // Old Sw.js used cache.addAll() which fails entirely on one 404,
      // and it tried to cache './Help/helpindex' (no .html) which 404s
      // on GitHub Pages - that is why the fallback was needed.
      const results = await Promise.allSettled(
        PRECACHE_URLS.map((u) => cache.add(new Request(u, { cache: 'no-cache' })))
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn('[SW] failed to precache', PRECACHE_URLS[i], r.reason);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never intercept cross-origin: Google Fonts, jsDelivr, SheetJS CDN, etc.
  // v148 NEEDS those. Old SWs that cached them broke CDN loads.
  if (url.origin !== self.location.origin) return;

  const isAdjacent =
    url.pathname.includes('/Help/') ||
    url.pathname.includes('/dbs/') ||
    url.pathname.includes('/flashcards/') ||
    url.pathname.includes('/offline-spreadsheets-charts/');

  // Navigation (e.g. opening / or /index.html): network-first, fall back to cached index
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (isAdjacent) {
    // Adjacent pages + their assets: cache-first, update in background
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(req, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Everything else same-origin: network-first, fall back to cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
