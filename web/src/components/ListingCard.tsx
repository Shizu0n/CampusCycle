import { Link } from 'react-router-dom';
import type { Listing } from '../types';
import { formatPrice } from '../types';

// Cores de placeholder por categoria (DESIGN.md) — placeholder é feature:
// a inicial da categoria em Alfa Slab sobre o bloco de cor, nunca emoji.
const CATEGORY_COLORS: Record<string, string> = {
  Livros: '#E8DCC0',
  Engenharia: '#D8E3D0',
  Computação: '#DAD9E6',
  Eletrônicos: '#E6D9D2',
  Vestuário: '#E8DCC0',
  Móveis: '#D8E3D0',
  Outros: '#DAD9E6',
};

// 3 variantes de composição por categoria, escolhidas por hash do id.
function variantOf(id: string): number {
  let sum = 0;
  for (const ch of id) sum = (sum + ch.charCodeAt(0)) % 997;
  return sum % 3;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const variant = variantOf(listing.id);
  const bg = CATEGORY_COLORS[listing.category] ?? '#E8DCC0';

  return (
    <article className="hang-tag">
      <Link to={`/listings/${listing.id}`} className="hang-tag-link">
        <div className="tag-media" style={{ background: bg }} data-variant={variant}>
          {listing.imageUrl ? (
            <img src={listing.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="tag-initial">{listing.category[0]}</span>
          )}
        </div>

        <h3 className="tag-title">{listing.title}</h3>
        <p className="tag-category">{listing.category}</p>

        <div className="tag-footer">
          {listing.price === null ? (
            <span className="price-splash price-splash--doar">DOAR</span>
          ) : (
            <span className="price-splash">{formatPrice(listing.price)}</span>
          )}
          {listing.status === 'sold' ? (
            <span className="stamp stamp--vendido">Vendido</span>
          ) : listing.status === 'donated' ? (
            <span className="stamp stamp--doacao">Doado</span>
          ) : (
            <span className="stamp stamp--segunda-vida">2ª vida</span>
          )}
        </div>
      </Link>
    </article>
  );
}
