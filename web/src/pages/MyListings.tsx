import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListingCard } from '../components/ListingCard';
import { ApiError, apiDelete, apiGet } from '../lib/api';
import { IDENTITY_MODE } from '../lib/auth';
import type { Listing } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

// Meus anúncios (estágio 1: identidade anônima via X-User-Id).
// Nos dias 10-12 esta lista passa a mesclar serverItems + fila offline (OV-2).
export function MyListings() {
  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<Listing[]>([]);
  const navigate = useNavigate();

  const load = useCallback(() => {
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
