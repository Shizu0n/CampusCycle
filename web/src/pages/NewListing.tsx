import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, apiPost } from '../lib/api';
import { IDENTITY_MODE } from '../lib/auth';
import { enqueue, removeQueueItem } from '../lib/offlineQueue';
import { formatPriceInput, parsePriceCents } from '../lib/price';
import { CATEGORIES, createListingSchema, type CreateListingInput } from '../schemas/listing';
import type { Listing } from '../types';

/** Estado de navegação vindo do /mine: revisar um item failed da fila
 *  (emenda Eng 9 — o form reabre preenchido exibindo o erro DO SERVIDOR). */
export interface ReviseState {
  revise?: { payload: CreateListingInput; errorReason?: string };
}

export function NewListing() {
  const revise = (useLocation().state as ReviseState | null)?.revise;

  // UUID gerado no MOUNT do formulário e reutilizado em todos os retries —
  // idempotência da fila offline (emenda CEO 3). Regenerado só após sucesso.
  // Em revisão, REUSA o UUID do item failed (mesmo id em todos os retries).
  const listingId = useMemo(
    () => revise?.payload.id ?? crypto.randomUUID(),
    [revise?.payload.id]
  );
  const navigate = useNavigate();

  const [title, setTitle] = useState(revise?.payload.title ?? '');
  const [description, setDescription] = useState(revise?.payload.description ?? '');
  const [category, setCategory] = useState<string>(revise?.payload.category ?? 'Livros');
  const [priceText, setPriceText] = useState(
    revise && revise.payload.price !== null
      ? (revise.payload.price / 100).toFixed(2).replace('.', ',')
      : ''
  );
  const [isDonation, setIsDonation] = useState(revise ? revise.payload.price === null : false);
  const [imageUrl, setImageUrl] = useState(revise?.payload.imageUrl ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(revise?.errorReason ?? null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const candidate = {
      id: listingId,
      title,
      description,
      category,
      price: parsePriceCents(priceText, isDonation), // doação → null; inválido → NaN
      ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
    };

    // Valida ANTES de enviar/enfileirar (emenda Eng 10) — 4xx de validação
    // na fila offline fica quase inalcançável.
    const parsed = createListingSchema.safeParse(candidate);
    if (!parsed.success) {
      // Mensagens do schema já nomeiam o campo em PT — sem prefixo técnico
      // (consistente com Login/Register).
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
      return;
    }

    setSubmitting(true); // botão desabilitado em voo (emenda CEO 3)
    try {
      await apiPost<Listing>('/api/listings', parsed.data);
      if (revise) await removeQueueItem(listingId); // o failed revisado já publicou
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && IDENTITY_MODE === 'jwt') {
        navigate('/login', { state: { next: '/new' } });
        return;
      }
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
        setSubmitting(false);
        return;
      }
      // Falha de REDE → fila offline (o momento-uau). put() pelo mesmo UUID
      // também cobre a re-tentativa de um item revisado.
      try {
        await enqueue(parsed.data);
        navigate('/mine');
      } catch {
        // Guarda de IndexedDB (emenda Eng 8): offline E sem armazenamento —
        // erro visível preservando o formulário preenchido.
        setErrorMsg(
          'Sem conexão e sem armazenamento local disponível — seus dados continuam aqui; tente de novo ao reconectar.'
        );
        setSubmitting(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <h2>{revise ? 'Revisar anúncio' : 'Novo anúncio'}</h2>

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
            onBlur={() => setPriceText((t) => formatPriceInput(t))}
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
