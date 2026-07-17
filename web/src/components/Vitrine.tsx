import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import type { ListingsPage } from '../types';
import { CategoryFilter, type FilterState } from './CategoryFilter';
import { ListingCard } from './ListingCard';

type LoadState = 'loading' | 'cold' | 'ready' | 'error';

// Vitrine = filtros + grid. Usada na Landing (desktop) e no Feed (PWA).
export function Vitrine() {
  const [filters, setFilters] = useState<FilterState>({ category: '', q: '', donation: false });
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<ListingsPage | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Cold start do Render/Neon (emenda CEO 8): avisa se demorar.
    const coldTimer = setTimeout(() => {
      setState((s) => (s === 'loading' ? 'cold' : s));
    }, 4000);

    // Debounce curto para a busca digitada não metralhar a API.
    const fetchTimer = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.q.trim()) params.set('q', filters.q.trim());
      if (filters.donation) params.set('donation', 'true');
      const qs = params.toString();

      apiGet<ListingsPage>(`/api/listings${qs ? `?${qs}` : ''}`)
        .then((page) => {
          if (cancelled) return;
          setData(page);
          setState('ready');
        })
        .catch(() => {
          if (!cancelled) setState('error');
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(coldTimer);
      clearTimeout(fetchTimer);
    };
  }, [filters]);

  return (
    <div>
      <CategoryFilter filters={filters} onChange={setFilters} />

      {state === 'loading' && <p className="vitrine-status">Carregando vitrine…</p>}
      {state === 'cold' && (
        <p className="vitrine-status">Servidor gratuito acordando (~1 min)… segura aí.</p>
      )}
      {state === 'error' && (
        <p className="vitrine-status">Não foi possível carregar a vitrine. Tente de novo.</p>
      )}

      {state === 'ready' && data && data.items.length === 0 && (
        <p className="vitrine-status">
          Nada por aqui com esses filtros — tente outra categoria ou anuncie você!
        </p>
      )}

      {state === 'ready' && data && data.items.length > 0 && (
        <section className="feed-grid">
          {data.items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </section>
      )}
    </div>
  );
}
