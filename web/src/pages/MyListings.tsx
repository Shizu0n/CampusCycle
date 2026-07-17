import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListingCard } from '../components/ListingCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { ApiError, apiDelete, apiGet, apiPatch } from '../lib/api';
import { IDENTITY_MODE } from '../lib/auth';
import { mergeMine, type MineItem } from '../lib/mergeMine';
import {
  getQueueItems,
  removeQueueItem,
  subscribeQueue,
  type QueuedListing,
} from '../lib/offlineQueue';
import type { Listing } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

// Meus anúncios = serverItems + fila offline mesclados pelo UUID do cliente
// (OV-2): ao sincronizar, o item do servidor substitui o gêmeo local sem
// flicker nem duplicata; o estado da fila alimenta o badge.
export function MyListings() {
  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<Listing[]>([]);
  const [queueItems, setQueueItems] = useState<QueuedListing[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    void getQueueItems().then(setQueueItems);
    apiGet<{ items: Listing[] }>('/api/listings/mine')
      .then((res) => {
        setItems(res.items);
        setState('ready');
      })
      .catch((err) => {
        // Token expirado no meio da sessão → re-login (a guarda de rota só
        // cobre a AUSÊNCIA de sessão, não a expiração).
        if (IDENTITY_MODE === 'jwt' && err instanceof ApiError && err.status === 401) {
          navigate('/login', { state: { next: '/mine' } });
          return;
        }
        setState('error');
      });
  }, [navigate]);

  useEffect(load, [load]);

  // Cada transição da fila (sync, falha, backoff) re-renderiza os badges;
  // o refetch traz o item recém-publicado do servidor.
  useEffect(() => subscribeQueue(load), [load]);

  async function handleDelete(item: MineItem) {
    if (!window.confirm('Remover este anúncio?')) return;
    if (item.local) {
      await removeQueueItem(item.id); // só existe na fila — nada no servidor
      return;
    }
    try {
      await apiDelete(`/api/listings/${item.id}`);
      setItems((prev) => prev.filter((l) => l.id !== item.id));
    } catch {
      window.alert('Não foi possível remover — tente de novo.');
    }
  }

  // Fecha o ciclo do anúncio e alimenta o placar (/api/stats conta sold/donated).
  async function handleStatus(id: string, status: 'sold' | 'donated') {
    setBusyId(id);
    try {
      const updated = await apiPatch<Listing>(`/api/listings/${id}`, { status });
      setItems((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch {
      window.alert('Não foi possível atualizar — tente de novo.');
    } finally {
      setBusyId(null);
    }
  }

  // "Toque para revisar": reabre o form preenchido exibindo o erro DO SERVIDOR
  // (emenda Eng 9), reusando o MESMO UUID do item failed.
  function handleRevise(item: MineItem) {
    const queued = queueItems.find((q) => q.id === item.id);
    if (!queued) return;
    navigate('/new', {
      state: { revise: { payload: queued.payload, errorReason: queued.errorReason } },
    });
  }

  if (state === 'loading')
    return (
      <div>
        <h2>Meus anúncios</h2>
        <SkeletonGrid count={3} />
      </div>
    );
  if (state === 'error')
    return <p className="vitrine-status">Não foi possível carregar. Tente de novo.</p>;

  const merged = mergeMine(items, queueItems);

  return (
    <div>
      <h2>Meus anúncios</h2>

      {merged.length === 0 ? (
        <div className="empty-state">
          <span className="stamp stamp--segunda-vida">Tudo limpo</span>
          <p>Você ainda não anunciou nada.</p>
          <Link to="/new" className="btn">
            Anunciar agora
          </Link>
        </div>
      ) : (
        <section className="feed-grid">
          {merged.map((l) => (
            <div key={l.id} className="mine-item">
              <ListingCard listing={l} />

              {l.queueState === 'pending' && !l.needsLogin && (
                <span className="stamp stamp--sync stamp--thunk">Aguardando sincronização</span>
              )}
              {l.queueState === 'pending' && l.needsLogin && (
                <span className="stamp stamp--sync stamp--thunk">Aguardando login</span>
              )}
              {l.queueState === 'failed' && (
                <span className="stamp stamp--failed stamp--thunk">Falhou — revise</span>
              )}
              {l.queueState === 'synced' && (
                <span className="stamp stamp--publicado stamp--thunk">Publicado</span>
              )}

              <div className="mine-actions">
                {l.queueState === 'pending' && l.needsLogin && (
                  <Link to="/login" state={{ next: '/mine' }} className="btn">
                    Entrar para sincronizar
                  </Link>
                )}
                {l.queueState === 'failed' && (
                  <button className="btn" onClick={() => handleRevise(l)}>
                    Revisar
                  </button>
                )}
                {!l.local && l.status === 'available' && (
                  <>
                    <button
                      className="btn"
                      disabled={busyId === l.id}
                      onClick={() => handleStatus(l.id, 'sold')}
                    >
                      Vendi!
                    </button>
                    <button
                      className="btn btn--ghost"
                      disabled={busyId === l.id}
                      onClick={() => handleStatus(l.id, 'donated')}
                    >
                      Doei!
                    </button>
                  </>
                )}
                <button
                  className="btn btn--danger"
                  disabled={busyId === l.id}
                  onClick={() => handleDelete(l)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
