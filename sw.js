/* PROJECT.IA Service Worker — PASS-THROUGH seguro.
 * Historico: o SW com stale-while-revalidate chegou a servir cache corrompido do
 * supabase-js (sync no head) -> "Cannot access 'sb' before initialization" e a
 * pagina presa em "loading". Para garantir confiabilidade, este SW NAO intercepta
 * mais nenhuma requisicao (o navegador trata tudo nativamente, com seu HTTP cache)
 * e LIMPA todos os caches antigos ao ativar. */
const V = 'projectia-v9.3.27';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// SEM fetch handler: nenhuma interceptacao. Elimina qualquer chance de o SW
// servir um recurso corrompido/incompleto ou travar o carregamento.

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));
  }
});
