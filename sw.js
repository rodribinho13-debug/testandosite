/* PROJECT.IA Service Worker - stale-while-revalidate optimized */
const V='projectia-v9.3.24',N=`projectia-cache-${V}`;
const A=['./','./index.html','./hydrostec_v9.html','./custom_views.js','./assets/css/v9.min.css','./assets/js/security.js','./assets/js/saas-modules.js','./assets/js/ia-chat.js','./assets/js/ui-confirm.js','./assets/js/excel-export.js','./assets/js/ai-router.js','./assets/js/module-loader.js','./assets/js/sidebar-groups.js','./assets/js/planejamento.js','./assets/js/manual-forms.js','./manifest.json'];

self.addEventListener('install', e => {
  // allSettled (não addAll atômico): se um arquivo falhar, os demais ainda entram no cache.
  e.waitUntil(
    caches.open(N)
      .then(c => Promise.allSettled(A.map(url => c.add(url))))
      .catch(err => console.warn('[SW]', err))
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

  // Nunca intercepta Supabase (API/auth/storage/edge).
  if (u.hostname.includes('supabase.co')) return;
  if (u.pathname.includes('/functions/v1/') || u.pathname.includes('/rest/v1/')) return;
  if (u.hostname.includes('googleapis.com') && !u.hostname.includes('fonts')) return;

  // CROSS-ORIGIN (CDN de libs como supabase-js/xlsx/lucide, fontes): NÃO intercepta.
  // O browser busca direto. Antes o SW cacheava via SWR e podia servir uma versão
  // corrompida/incompleta do supabase-js (síncrono no head) -> supabase undefined ->
  // "Cannot access 'sb' before initialization" e a página presa em "loading".
  if (u.origin !== self.location.origin) return;

  // HTML / navegação: network-first (sempre fresco online; cache só pra offline).
  if (r.mode === 'navigate' || (r.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(r).then(resp => {
        if (resp && resp.ok) { const c = resp.clone(); caches.open(N).then(cache => cache.put(r, c)); }
        return resp;
      }).catch(() => caches.match(r).then(m => m || caches.match('./hydrostec_v9.html')))
    );
    return;
  }

  // Demais same-origin (assets versionados etc.): stale-while-revalidate.
  e.respondWith(staleWhileRevalidate(r));
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
