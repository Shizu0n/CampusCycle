import type { Listing } from '../types';
import type { QueuedListing } from './offlineQueue';

/** Item do /mine com o badge de sincronização da fila (quando houver). */
export interface MineItem extends Listing {
  queueState?: 'pending' | 'failed' | 'synced';
  errorReason?: string;
  needsLogin?: boolean;
  /** true = existe SÓ na fila local (ainda não publicado no servidor). */
  local?: boolean;
}

/**
 * Função PURA (emenda Eng 11): mescla serverItems + fila pelo UUID do cliente.
 * - Mesmo UUID nos dois lados → o item do SERVIDOR substitui o gêmeo local sem
 *   flicker nem duplicata (OV-2); se acabou de sincronizar, ganha o carimbo
 *   "publicado".
 * - Item só na fila (pending/failed) → entra como card local com badge.
 * - synced sem gêmeo ainda → omitido (o refetch do /mine o traz do servidor).
 * - Ordenação: mais recente primeiro (createdAt do servidor × enqueuedAt local).
 */
export function mergeMine(serverItems: Listing[], queueItems: QueuedListing[]): MineItem[] {
  const byId = new Map<string, MineItem>();
  for (const s of serverItems) byId.set(s.id, { ...s });

  for (const q of queueItems) {
    const twin = byId.get(q.id);
    if (twin) {
      if (q.state === 'synced') twin.queueState = 'synced';
      continue; // servidor ganha o conteúdo — a fila só contribui o badge
    }
    if (q.state === 'synced') continue;
    byId.set(q.id, {
      id: q.id,
      title: q.payload.title,
      description: q.payload.description,
      category: q.payload.category,
      price: q.payload.price,
      imageUrl: q.payload.imageUrl ?? null,
      status: 'available',
      createdAt: new Date(q.enqueuedAt).toISOString(),
      queueState: q.state,
      errorReason: q.errorReason,
      needsLogin: q.needsLogin,
      local: true,
    });
  }

  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
