import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import type { ListingsPage } from '../types';
import { formatPrice } from '../types';

type LoadState = 'loading' | 'cold' | 'ready' | 'error';

export function Feed() {
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<ListingsPage | null>(null);

  useEffect(() => {
    // Cold start do Render/Neon: se demorar, avisa que o servidor está acordando
    // (emenda CEO 8). O fetch em si segue com timeout longo em lib/api.ts.
    const coldTimer = setTimeout(() => {
      setState((s) => (s === 'loading' ? 'cold' : s));
    }, 4000);

    apiGet<ListingsPage>('/api/listings')
      .then((page) => {
        setData(page);
        setState('ready');
      })
      .catch(() => setState('error'))
      .finally(() => clearTimeout(coldTimer));

    return () => clearTimeout(coldTimer);
  }, []);

  if (state === 'loading') return <p>Carregando vitrine…</p>;
  if (state === 'cold') return <p>Servidor gratuito acordando (~1 min)… segura aí.</p>;
  if (state === 'error') return <p>Não foi possível carregar a vitrine. Tente de novo.</p>;

  if (!data || data.items.length === 0) {
    return <p>Nenhum anúncio ainda — seja a primeira pessoa a desapegar!</p>;
  }

  return (
    <section className="feed-grid">
      {data.items.map((l) => (
        <article key={l.id} className="card">
          <h3>{l.title}</h3>
          <p className="feed-category">{l.category}</p>
          {l.price === null ? (
            <span className="stamp stamp--doacao">Doação</span>
          ) : (
            <span className="price-splash">{formatPrice(l.price)}</span>
          )}
        </article>
      ))}
    </section>
  );
}
