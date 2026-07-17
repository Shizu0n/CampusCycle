import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListingCard } from '../components/ListingCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { ApiError, apiDelete, apiGet, apiPatch } from '../lib/api';
import { IDENTITY_MODE } from '../lib/auth';
import type { Listing } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

// Meus anúncios (estágio 1: identidade anônima via X-User-Id).
// Nos dias 10-12 esta lista passa a mesclar serverItems + fila offline (OV-2).
export function MyListings() {
  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<Listing[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
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

  if (state === 'loading')
    return (
      <div>
        <h2>Meus anúncios</h2>
        <SkeletonGrid count={3} />
      </div>
    );
  if (state === 'error')
    return <p className="vitrine-status">Não foi possível carregar. Tente de novo.</p>;

  return (
    <div>
      <h2>Meus anúncios</h2>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="stamp stamp--segunda-vida">Tudo limpo</span>
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
              <div className="mine-actions">
                {l.status === 'available' && (
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
                  onClick={() => handleDelete(l.id)}
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
