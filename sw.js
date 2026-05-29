/* PROJECT.IA Service Worker - stale-while-revalidate optimized */
const V='projectia-v9.3.15',N=`projectia-cache-${V}`;
const A=['./','./index.html','./hydrostec_v9.html','./custom_views.js','./assets/css/v9.min.css','./assets/js/security.js','./assets/js/saas-modules.js','./assets/js/ia-chat.js','./assets/js/ui-confirm.js','./assets/js/excel-export.js','./assets/js/ai-router.js','./assets/js/module-loader.js','./assets/js/sidebar-groups.js','./assets/js/planejamento.js','./manifest.json'];
const P=[/cdn\.jsdelivr\.net/,/cdnjs\.cloudflare\.com/,/fonts\.googleapis\.com/,/fonts\.gstatic\.com/,/unpkg\.com/];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(N).then(c => c.addAll(A).catch(err => console.warn('[SW]', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(
        ks.filter(k => (k.startsWith('isoia-cache-') || k.startsWith('projectia-cache-')) && k !== N)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  if (u.hostname.includes('supabase.co')) return;
  if (u.pathname.includes('/functions/v1/') || u.pathname.includes('/rest/v1/')) return;
  if (u.hostname.includes('googleapis.com') && !u.hostname.includes('fonts')) return;

  if (u.origin === self.location.origin && u.search.includes('v=')) {
    e.respondWith(staleWhileRevalidate(r));
    return;
  }

  if (P.some(p => p.test(u.hostname))) {
    e.respondWith(staleWhileRevalidate(r));
    return;
  }

  if (u.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(r));
  }
});

function staleWhileRevalidate(request) {
  return caches.open(N).then(cache => {
    return cache.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    });
  });
}

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .then(() => self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({type:'CACHES_CLEARED'}))));
  }
});
