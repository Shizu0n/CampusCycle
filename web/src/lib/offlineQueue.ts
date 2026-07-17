/*
 * Fila offline de anúncios — o momento-uau (design doc, emenda CEO 1).
 *
 * IndexedDB (lib `idb`) + listener `online` + retry no load. A fila NÃO vive
 * no Service Worker — o SW só cuida de cache (sw.ts). Idempotência: o UUID do
 * anúncio é gerado no MOUNT do formulário e reutilizado em TODOS os retries
 * (regenerado só após sucesso confirmado); o servidor trata P2002 do mesmo
 * dono como 200 idempotente.
 *
 * Máquina de estados por item (persistida com errorReason + retryCount):
 *
 *                       rede falhou
 *   [form submit] ────────────────────▶ PENDING ──── online/load retry ────┐
 *        │                                │  ▲                            │
 *        │ 2xx                        401 │  │ re-login                   ▼
 *        ▼                                │  │                     POST /api/listings
 *     SYNCED ◀── 2xx ou P2002 ────────────┼──┴──────────────────────────  │
 *                                         │                               │
 *                                         ▼ 4xx / 5º retry / 5xx          │
 *                                      FAILED ── "toque p/ revisar" ──▶ volta ao form
 *
 * Classificação de cada tentativa (nenhum estado é silencioso):
 *   - Falha de REDE (fetch rejeita)  → permanece pending, intocado (offline
 *     não é erro do item; retry no `online` e no load).
 *   - 401 (JWT expirado)             → pending + needsLogin (UI pede re-login;
 *     o login dispara syncQueue()).
 *   - 429 (rate limit)               → pending + nextRetryAt (backoff; não
 *     conta como retry — o limite não é culpa do item).
 *   - 5xx                            → retryCount+1; no 5º → failed com motivo.
 *   - Demais 4xx (400/409/413/drift) → failed + mensagem DO SERVIDOR
 *     (emenda Eng 9 — o form reaberto exibe esse motivo).
 *   - 2xx                            → synced (badge "publicado"; limpo no
 *     próximo load, quando o servidor já devolve o item em /mine).
 *
 * Guarda de IndexedDB (emenda Eng 8): open/write falho → enqueue() LANÇA e o
 * formulário mostra erro visível preservando os dados; o resto da fila degrada
 * em silêncio (getQueueItems() → [], syncQueue() → no-op).
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { CreateListingInput } from '../schemas/listing';
import type { Listing } from '../types';
import { ApiError, apiPost } from './api';

export type QueueState = 'pending' | 'synced' | 'failed';

export interface QueuedListing {
  id: string; // UUID do cliente = chave de idempotência (keyPath)
  payload: CreateListingInput;
  state: QueueState;
  errorReason?: string;
  needsLogin?: boolean;
  retryCount: number; // só 5xx conta (rede e 429 não são culpa do item)
  nextRetryAt?: number; // backoff do 429 (epoch ms)
  enqueuedAt: number;
}

const DB_NAME = 'campuscycle-queue';
const STORE = 'listings';
const MAX_RETRIES = 5;
const RATE_LIMIT_BACKOFF_MS = 60_000;

type QueueDb = IDBPDatabase<unknown>;

let dbPromise: Promise<QueueDb> | null = null;

function queueDb(): Promise<QueueDb> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      },
    }).catch((err) => {
      dbPromise = null; // próxima chamada tenta de novo (quota/modo anônimo pode mudar)
      throw err;
    });
  }
  return dbPromise;
}

// ---------- assinantes (UI re-renderiza a cada mudança de estado) ----------

const listeners = new Set<() => void>();

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const l of listeners) l();
}

// ---------- operações ----------

/** Enfileira (ou re-enfileira, mesmo UUID) um anúncio que falhou por rede.
 *  LANÇA se o IndexedDB estiver indisponível — o chamador mostra erro visível
 *  preservando o formulário (emenda Eng 8). */
export async function enqueue(payload: CreateListingInput): Promise<void> {
  const db = await queueDb();
  const item: QueuedListing = {
    id: payload.id,
    payload,
    state: 'pending',
    retryCount: 0,
    enqueuedAt: Date.now(),
  };
  await db.put(STORE, item);
  notify();
}

/** Itens da fila para o merge do /mine. IDB indisponível → lista vazia. */
export async function getQueueItems(): Promise<QueuedListing[]> {
  try {
    const db = await queueDb();
    return (await db.getAll(STORE)) as QueuedListing[];
  } catch {
    return [];
  }
}

/** Remove um item (best-effort — usado ao remover local ou após revisão). */
export async function removeQueueItem(id: string): Promise<void> {
  try {
    const db = await queueDb();
    await db.delete(STORE, id);
    notify();
  } catch {
    /* guarda */
  }
}

// ---------- sincronização ----------

let syncing = false;

async function persist(db: QueueDb, item: QueuedListing): Promise<void> {
  await db.put(STORE, item);
  notify();
}

async function attempt(db: QueueDb, item: QueuedListing): Promise<void> {
  // needsLogin/nextRetryAt são recalculados a cada tentativa
  const base: QueuedListing = { ...item, needsLogin: false, nextRetryAt: undefined };
  try {
    // MESMO UUID em todos os retries — P2002 do mesmo dono volta como 200.
    await apiPost<Listing>('/api/listings', item.payload);
    await persist(db, { ...base, state: 'synced', errorReason: undefined });
  } catch (err) {
    if (!(err instanceof ApiError)) return; // rede: permanece pending intocado
    if (err.status === 401) {
      await persist(db, { ...base, needsLogin: true });
    } else if (err.status === 429) {
      await persist(db, { ...base, nextRetryAt: Date.now() + RATE_LIMIT_BACKOFF_MS });
    } else if (err.status >= 500) {
      const retryCount = item.retryCount + 1;
      await persist(
        db,
        retryCount >= MAX_RETRIES
          ? {
              ...base,
              retryCount,
              state: 'failed',
              errorReason: `Servidor falhou ${MAX_RETRIES} vezes — toque para revisar e reenviar`,
            }
          : { ...base, retryCount }
      );
    } else {
      // 4xx terminal: o motivo do SERVIDOR vai para o form reaberto (Eng 9)
      await persist(db, { ...base, state: 'failed', errorReason: err.message });
    }
  }
}

/** Percorre os pending (respeitando backoff) e tenta publicar cada um. */
export async function syncQueue(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    const db = await queueDb();
    const items = (await db.getAll(STORE)) as QueuedListing[];
    const now = Date.now();
    for (const item of items) {
      if (item.state !== 'pending') continue;
      if (item.nextRetryAt && item.nextRetryAt > now) continue;
      await attempt(db, item);
    }
  } catch {
    /* IDB indisponível: nada a sincronizar (guarda) */
  } finally {
    syncing = false;
  }
}

/** Chamar UMA vez no boot do app: limpa synced antigos (o servidor já os
 *  devolve em /mine), tenta sincronizar (retry no load) e arma o listener
 *  `online` — a implementação primária de sync do design doc. */
export function initOfflineQueue(): void {
  window.addEventListener('online', () => {
    void syncQueue();
  });
  void (async () => {
    try {
      const db = await queueDb();
      const items = (await db.getAll(STORE)) as QueuedListing[];
      for (const item of items) {
        if (item.state === 'synced') await db.delete(STORE, item.id);
      }
    } catch {
      /* IDB indisponível: app segue com POST direto */
    }
    await syncQueue();
  })();
}
