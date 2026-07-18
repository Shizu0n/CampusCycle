// Lógica de preço do formulário como funções PURAS (testáveis). O campo aceita
// o padrão pt-BR (vírgula decimal, ponto de milhar); o servidor guarda centavos
// (Int) e null = doação.

/**
 * Converte o texto do campo em centavos, ou null para doação.
 *
 * Doação SEMPRE retorna null ANTES de qualquer parse — foi exatamente aqui que
 * morava o bug: `Number.isFinite(null)` é `false`, então a doação virava NaN e
 * a validação zod rejeitava ("informe um preço válido"). Doação não tem preço.
 *
 * Não-doação com texto não-numérico → NaN (dispara o erro de validação de
 * propósito; o campo é `required` no HTML, então vazio nem chega aqui).
 */
export function parsePriceCents(text: string, isDonation: boolean): number | null {
  if (isDonation) return null;
  const reais = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(reais) ? Math.round(reais * 100) : NaN;
}

/**
 * Formata o texto digitado para o padrão pt-BR com 2 casas (6000 → "6.000,00").
 * Chamada no blur do campo. Texto não-numérico permanece como digitado, para o
 * usuário poder corrigir em vez de perder o que escreveu.
 */
export function formatPriceInput(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const reais = Number(trimmed.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(reais)) return trimmed;
  return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
