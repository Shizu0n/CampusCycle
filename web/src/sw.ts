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
 *  │ GET /api/listings*           │ NetworkFirst        [PENDENTE — dias 8-9]│
 *  │ Imagens externas             │ CacheFirst + expir.  [PENDENTE — dias 8-9]│
 *  │ /api/auth/*                  │ NetworkOnly         [PENDENTE — dias 6-7]│
 *  └──────────────────────────────┴──────────────────────────────────────────┘
 *
 * A fila offline NÃO vive aqui — vive em lib/offlineQueue.ts (IndexedDB +
 * listener 'online' + retry no load). O SW só cuida de cache.
 */
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

// App shell precacheado — o app instalado abre offline.
precacheAndRoute(self.__WB_MANIFEST);

// Sem isso, o app instalado não abre offline numa rota interna (emenda CEO 4).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// registerType 'prompt': o app envia SKIP_WAITING quando o usuário aceita atualizar.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
