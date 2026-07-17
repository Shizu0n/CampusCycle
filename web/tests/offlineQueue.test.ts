/*
 * Testes da fila offline — UM por transição da máquina de estados (emenda
 * Eng 11) + invariante de idempotência + guarda de IndexedDB (emenda Eng 8).
 * fake-indexeddb + fetch mockado; cada teste importa um módulo limpo (a fila
 * tem cache de conexão) sobre um IndexedDB zerado.
 */
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateListingInput } from '../src/schemas/listing';

type QueueModule = typeof import('../src/lib/offlineQueue');

async function freshQueue(): Promise<QueueModule> {
  vi.resetModules();
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  return import('../src/lib/offlineQueue');
}

function makePayload(overrides: Partial<CreateListingInput> = {}): CreateListingInput {
  return {
    id: crypto.randomUUID(),
    title: 'Cálculo Vol. 1 — Stewart',
    description: 'Livro em bom estado, poucas marcações a lápis.',
    category: 'Livros',
    price: 4500,
    ...overrides,
  };
}

function httpRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const envelope = (code: string, message: string) => ({ error: { code, message } });

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('offlineQueue — uma transição por teste', () => {
  it('falha de REDE → permanece pending, intocado', async () => {
    const q = await freshQueue();
    const p = makePayload();
    await q.enqueue(p);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await q.syncQueue();

    const [item] = await q.getQueueItems();
    expect(item?.state).toBe('pending');
    expect(item?.retryCount).toBe(0);
    expect(item?.errorReason).toBeUndefined();
  });

  it('2xx → synced', async () => {
    const q = await freshQueue();
    const p = makePayload();
    await q.enqueue(p);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(httpRes(201, { id: p.id })));

    await q.syncQueue();

    const [item] = await q.getQueueItems();
    expect(item?.state).toBe('synced');
    expect(item?.errorReason).toBeUndefined();
  });

  it('4xx de validação → failed com a mensagem DO SERVIDOR (emenda Eng 9)', async () => {
    const q = await freshQueue();
    await q.enqueue(makePayload());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(httpRes(400, envelope('VALIDATION_ERROR', 'Dados inválidos')))
    );

    await q.syncQueue();

    const [item] = await q.getQueueItems();
    expect(item?.state).toBe('failed');
    expect(item?.errorReason).toBe('Dados inválidos');
  });

  it('401 (JWT expirado) → pending + flag de re-login', async () => {
    const q = await freshQueue();
    await q.enqueue(makePayload());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(httpRes(401, envelope('UNAUTHORIZED', 'Sessão expirada')))
    );

    await q.syncQueue();

    const [item] = await q.getQueueItems();
    expect(item?.state).toBe('pending');
    expect(item?.needsLogin).toBe(true);
  });

  it('429 (rate limit) → pending + backoff (sem retry imediato)', async () => {
    const q = await freshQueue();
    await q.enqueue(makePayload());
    const fetchMock = vi
      .fn()
      .mockResolvedValue(httpRes(429, envelope('RATE_LIMITED', 'Muitas requisições')));
    vi.stubGlobal('fetch', fetchMock);

    await q.syncQueue();

    const [item] = await q.getQueueItems();
    expect(item?.state).toBe('pending');
    expect(item?.nextRetryAt).toBeGreaterThan(Date.now());
    expect(item?.retryCount).toBe(0); // rate limit não é culpa do item

    // dentro da janela de backoff, um novo sync NÃO tenta de novo
    await q.syncQueue();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('5xx persistente → failed no 5º retry, com motivo', async () => {
    const q = await freshQueue();
    await q.enqueue(makePayload());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(httpRes(500, envelope('INTERNAL', 'Erro interno')))
    );

    for (let attempt = 1; attempt <= 4; attempt++) {
      await q.syncQueue();
      const [item] = await q.getQueueItems();
      expect(item?.state).toBe('pending');
      expect(item?.retryCount).toBe(attempt);
    }

    await q.syncQueue(); // 5ª tentativa
    const [item] = await q.getQueueItems();
    expect(item?.state).toBe('failed');
    expect(item?.retryCount).toBe(5);
    expect(item?.errorReason).toBeTruthy();
  });
});

describe('offlineQueue — invariantes', () => {
  it('MESMO UUID em todos os retries; synced só após sucesso', async () => {
    const q = await freshQueue();
    const p = makePayload();
    await q.enqueue(p);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(httpRes(500, envelope('INTERNAL', 'Erro interno')))
      .mockResolvedValueOnce(httpRes(201, { id: p.id }));
    vi.stubGlobal('fetch', fetchMock);

    await q.syncQueue(); // 5xx → pending, retryCount 1
    await q.syncQueue(); // 2xx → synced

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      const body = JSON.parse((call[1] as RequestInit).body as string);
      expect(body.id).toBe(p.id); // idempotência (emenda CEO 3)
    }
    const [item] = await q.getQueueItems();
    expect(item?.state).toBe('synced');
  });

  it('guarda de IndexedDB (emenda Eng 8): enqueue LANÇA; sync/list degradam', async () => {
    const q = await freshQueue();
    (globalThis as { indexedDB: unknown }).indexedDB = {
      open() {
        throw new Error('quota excedida');
      },
    };

    await expect(q.enqueue(makePayload())).rejects.toThrow();
    await expect(q.getQueueItems()).resolves.toEqual([]);
    await expect(q.syncQueue()).resolves.toBeUndefined(); // no-op silencioso
  });
});
