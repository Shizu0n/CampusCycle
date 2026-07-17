import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../lib/api';
import type { Listing } from '../types';
import { formatPrice } from '../types';

// Detalhe mínimo — alcançado pelo clique no card (design doc).
export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet<Listing>(`/api/listings/${id}`)
      .then(setListing)
      .catch(() => setError(true));
  }, [id]);

  if (error) return <p className="vitrine-status">Anúncio não encontrado.</p>;
  if (!listing)
    return (
      <div className="detail card skeleton" aria-busy="true" aria-label="Carregando anúncio">
        <div className="skeleton-line skeleton-line--meta" />
        <div className="skeleton-line skeleton-line--title" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line--price" />
      </div>
    );

  return (
    <article className="detail card">
      <p className="tag-category">{listing.category}</p>
      <h2>{listing.title}</h2>
      <p>{listing.description}</p>

      <div className="tag-footer">
        {listing.price === null ? (
          <span className="price-splash price-splash--doar">DOAR</span>
        ) : (
          <span className="price-splash">{formatPrice(listing.price)}</span>
        )}
        {listing.status === 'sold' && <span className="stamp stamp--vendido">Vendido</span>}
        {listing.status === 'donated' && <span className="stamp stamp--doacao">Doado</span>}
      </div>

      <Link to="/" className="detail-back">
        ← Voltar para a vitrine
      </Link>
    </article>
  );
}
