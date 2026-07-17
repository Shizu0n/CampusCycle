import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiPost } from '../lib/api';
import { IDENTITY_MODE } from '../lib/auth';
import { CATEGORIES, createListingSchema } from '../schemas/listing';
import type { Listing } from '../types';

export function NewListing() {
  // UUID gerado no MOUNT do formulário e reutilizado em todos os retries —
  // idempotência da fila offline (emenda CEO 3). Regenerado só após sucesso.
  const listingId = useMemo(() => crypto.randomUUID(), []);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Livros');
  const [priceText, setPriceText] = useState('');
  const [isDonation, setIsDonation] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const priceCents = isDonation
      ? null
      : Math.round(Number(priceText.replace(/\./g, '').replace(',', '.')) * 100);

    const candidate = {
      id: listingId,
      title,
      description,
      category,
      price: Number.isFinite(priceCents) ? priceCents : NaN,
      ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
    };

    // Valida ANTES de enviar/enfileirar (emenda Eng 10) — 4xx de validação
    // na fila offline fica quase inalcançável.
    const parsed = createListingSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setErrorMsg(`${first?.path.join('.')}: ${first?.message}`);
      return;
    }

    setSubmitting(true); // botão desabilitado em voo (emenda CEO 3)
    try {
      // Dia 3: POST direto. Nos dias 10-12 este transporte é substituído pela
      // fila offline (IndexedDB + retry) — o schema e o UUID já estão prontos.
      await apiPost<Listing>('/api/listings', parsed.data);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && IDENTITY_MODE === 'jwt') {
        navigate('/login', { state: { next: '/new' } });
        return;
      }
      setErrorMsg(err instanceof ApiError ? err.message : 'Falha de rede — tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <h2>Novo anúncio</h2>

      <label htmlFor="title">Título</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label htmlFor="description">Descrição</label>
      <textarea
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        required
      />

      <label htmlFor="category">Categoria</label>
      <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label htmlFor="donation">
        <input
          id="donation"
          type="checkbox"
          checked={isDonation}
          onChange={(e) => setIsDonation(e.target.checked)}
        />{' '}
        É doação
      </label>

      {!isDonation && (
        <>
          <label htmlFor="price">Preço (R$)</label>
          <input
            id="price"
            inputMode="decimal"
            placeholder="45,00"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            required
          />
        </>
      )}

      <label htmlFor="imageUrl">URL da imagem (opcional)</label>
      <input
        id="imageUrl"
        type="url"
        placeholder="https://…"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />

      {errorMsg && <p className="form-error">{errorMsg}</p>}

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Publicando…' : 'Publicar'}
      </button>
    </form>
  );
}
