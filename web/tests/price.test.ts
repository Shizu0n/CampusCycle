import { describe, expect, it } from 'vitest';
import { formatPriceInput, parsePriceCents } from '../src/lib/price';

describe('parsePriceCents', () => {
  it('doação → null (regressão: Number.isFinite(null) fazia a doação virar NaN)', () => {
    expect(parsePriceCents('', true)).toBeNull();
    expect(parsePriceCents('45,00', true)).toBeNull(); // doação ignora qualquer texto
  });

  it('valor válido pt-BR → centavos', () => {
    expect(parsePriceCents('45,00', false)).toBe(4500);
    expect(parsePriceCents('6000', false)).toBe(600000);
    expect(parsePriceCents('6.000,00', false)).toBe(600000); // ponto de milhar
    expect(parsePriceCents('45,5', false)).toBe(4550);
  });

  it('texto não-numérico → NaN (dispara o erro de validação)', () => {
    expect(Number.isNaN(parsePriceCents('abc', false) as number)).toBe(true);
  });
});

describe('formatPriceInput', () => {
  it('6000 → 6.000,00', () => expect(formatPriceInput('6000')).toBe('6.000,00'));
  it('45 → 45,00', () => expect(formatPriceInput('45')).toBe('45,00'));
  it('45,5 → 45,50', () => expect(formatPriceInput('45,5')).toBe('45,50'));
  it('já formatado permanece estável', () => expect(formatPriceInput('6.000,00')).toBe('6.000,00'));
  it('vazio permanece vazio', () => expect(formatPriceInput('')).toBe(''));
  it('não-numérico permanece como digitado (usuário corrige)', () =>
    expect(formatPriceInput('abc')).toBe('abc'));
});
