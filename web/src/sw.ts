/// <reference lib="webworker" />
/*
 * Service Worker autoral (vite-plugin-pwa modo injectManifest).
 *
 * Tabela de estratégias de cache por rota — MANTER ATUALIZADA no mesmo commit
 * que mudar o comportamento:
 *
 *  ┌──────────────────────────────┬──────────────────────────────────────────┐
 *  │ Recurso                      │ Estratégia                               │
 *  ├──────────────────────────────┼──────────────────────────────────────────┤
 *  │ App shell (html/js/css/fonts)│ Precache (manifest injetado no build)    │
 *  │ Navegação (qualquer rota)    │ navigateFallback → index.html precacheado│
 *  │ GET /api/listings*           │ NetworkFirst (API_CACHE, timeout 4s)     │
 *  │ Imagens externas (http/s)    │ CacheFirst (IMAGE_CACHE, 60 itens/30d)   │
 *  │ /api/auth/*                  │ NetworkOnly (credenciais nunca em cache) │
 *  └──────────────────────────────┴──────────────────────────────────────────┘
 *
 * A fila offline NÃO vive aqui — vive em lib/offlineQueue.ts (IndexedDB +
 * listener 'online' + retry no load). O SW só cuida de cache.
 */
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { API_CACHE, IMAGE_CACHE } from './lib/cacheNames';

declare let self: ServiceWorkerGlobalScope;

// App shell precacheado — o app instalado abre offline.
precacheAndRoute(self.__WB_MANIFEST);

// Sem isso, o app instalado não abre offline numa rota interna (emenda CEO 4).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Auth nunca passa por cache (nem em falha de rede) — registrar ANTES do
// matcher de listings por clareza; os matchers não se sobrepõem.
registerRoute(({ url }) => url.pathname.startsWith('/api/auth/'), new NetworkOnly());

// Feed atualizado online; último feed visível offline (bônus de leitura offline).
// timeout 4s: no cold start do Render (~1 min), quem já tem cache vê o feed
// cacheado enquanto o servidor acorda (emenda CEO 8); sem cache, espera a rede.
// API_CACHE é contrato compartilhado com o purge de troca de identidade
// (lib/cacheNames.ts) — /mine varia por identidade.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && url.pathname.startsWith('/api/listings'),
  new NetworkFirst({ cacheName: API_CACHE, networkTimeoutSeconds: 4 })
);

// Imagens externas (campo imageUrl): CacheFirst com expiração. statuses [0, 200]
// aceita respostas opacas (cross-origin sem CORS) — sem isso nada seria cacheado.
// Placeholders de categoria são bundle local (precache), não passam por aqui.
registerRoute(
  ({ url, request }) =>
    request.destination === 'image' && url.origin !== self.location.origin,
  new CacheFirst({
    cacheName: IMAGE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// registerType 'prompt': o app envia SKIP_WAITING quando o usuário aceita atualizar.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
