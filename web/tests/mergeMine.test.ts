// Merge do /mine como função PURA (emenda Eng 11): dedupe pelo UUID do
// cliente (servidor ganha) e ordenação estável — sem flicker nem duplicata.
import { describe, expect, it } from 'vitest';
import { mergeMine } from '../src/lib/mergeMine';
import type { QueuedListing } from '../src/lib/offlineQueue';
import type { Listing } from '../src/types';

function serverItem(overrides: Partial<Listing> = {}): Listing {
  return {
    id: crypto.randomUUID(),
    title: 'Item do servidor',
    description: 'Descrição vinda do servidor.',
    category: 'Livros',
    price: 4500,
    imageUrl: null,
    status: 'available',
    createdAt: '2026-07-17T12:00:00.000Z',
    ...overrides,
  };
}

function queued(overrides: Partial<QueuedListing> = {}): QueuedListing {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    payload: {
      id,
      title: 'Item da fila',
      description: 'Descrição local aguardando sync.',
      category: 'Computação',
      price: null,
    },
    state: 'pending',
    retryCount: 0,
    enqueuedAt: Date.parse('2026-07-17T13:00:00.000Z'),
    ...overrides,
  };
}

describe('mergeMine', () => {
  it('mesmo UUID nos dois lados → item do servidor substitui o gêmeo, sem duplicata', () => {
    const s = serverItem();
    const merged = mergeMine([s], [queued({ id: s.id, state: 'pending' })]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('Item do servidor'); // conteúdo do servidor ganha
    expect(merged[0]?.local).toBeUndefined();
  });

  it('gêmeo recém-sincronizado ganha o carimbo "publicado"', () => {
    const s = serverItem();
    const merged = mergeMine([s], [queued({ id: s.id, state: 'synced' })]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.queueState).toBe('synced');
  });

  it('item só na fila entra como card local com badge e status available', () => {
    const q = queued({ state: 'failed', errorReason: 'Dados inválidos' });
    const merged = mergeMine([serverItem()], [q]);

    expect(merged).toHaveLength(2);
    const local = merged.find((m) => m.id === q.id);
    expect(local?.local).toBe(true);
    expect(local?.status).toBe('available');
    expect(local?.queueState).toBe('failed');
    expect(local?.errorReason).toBe('Dados inválidos');
  });

  it('synced sem gêmeo no servidor é omitido (o refetch o traz)', () => {
    const merged = mergeMine([], [queued({ state: 'synced' })]);
    expect(merged).toHaveLength(0);
  });

  it('ordenação: mais recente primeiro, misturando servidor e fila', () => {
    const older = serverItem({ createdAt: '2026-07-17T10:00:00.000Z', title: 'Antigo' });
    const newer = serverItem({ createdAt: '2026-07-17T14:00:00.000Z', title: 'Novo' });
    const q = queued(); // enqueuedAt 13:00

    const titles = mergeMine([older, newer], [q]).map((m) => m.title);
    expect(titles).toEqual(['Novo', 'Item da fila', 'Antigo']);
  });
});
