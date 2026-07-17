// Forma pública de um anúncio (o server nunca envia userId — emenda CEO 5).
export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number | null; // centavos; null = doação
  imageUrl: string | null;
  status: 'available' | 'sold' | 'donated';
  createdAt: string;
}

export interface ListingsPage {
  items: Listing[];
  page: number;
  pageSize: number;
  total: number;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
