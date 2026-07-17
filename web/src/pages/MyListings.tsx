import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListingCard } from '../components/ListingCard';
import { apiDelete, apiGet } from '../lib/api';
import type { Listing } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

// Meus anúncios (estágio 1: identidade anônima via X-User-Id).
// Nos dias 10-12 esta lista passa a mesclar serverItems + fila offline (OV-2).
export function MyListings() {
  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<Listing[]>([]);

  const load = useCallback(() => {
    apiGet<{ items: Listing[] }>('/api/listings/mine')
      .then((res) => {
        setItems(res.items);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  useEffect(load, [load]);

  async function handleDelete(id: string) {
    if (!window.confirm('Remover este anúncio?')) return;
    try {
      await apiDelete(`/api/listings/${id}`);
      setItems((prev) => prev.filter((l) => l.id !== id));
    } catch {
      window.alert('Não foi possível remover — tente de novo.');
    }
  }

  if (state === 'loading') return <p className="vitrine-status">Carregando seus anúncios…</p>;
  if (state === 'error')
    return <p className="vitrine-status">Não foi possível carregar. Tente de novo.</p>;

  return (
    <div>
      <h2>Meus anúncios</h2>

      {items.length === 0 ? (
        <div className="vitrine-status">
          <p>Você ainda não anunciou nada.</p>
          <Link to="/new" className="btn">
            Anunciar agora
          </Link>
        </div>
      ) : (
        <section className="feed-grid">
          {items.map((l) => (
            <div key={l.id} className="mine-item">
              <ListingCard listing={l} />
              <button className="btn btn--danger" onClick={() => handleDelete(l.id)}>
                Remover
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
