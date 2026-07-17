// CONTRATO COMPARTILHADO entre sw.ts (runtime caching, dias 8-9) e o fluxo de
// auth (purge na troca de identidade — emenda Eng 7). O Cache API indexa por
// URL e /api/listings/mine varia por identidade: sem o purge, o /mine offline
// pode exibir a lista da identidade anterior (inclusive na cena do modo avião).
export const API_CACHE = 'campuscycle-api-v1';

// Imagens externas (CacheFirst) — não varia por identidade, logo fora do purge.
export const IMAGE_CACHE = 'campuscycle-img-v1';
