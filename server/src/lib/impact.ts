// Tabela de impacto (kg por categoria) — micro-decisão do design doc.
export const KG_BY_CATEGORY: Record<string, number> = {
  Livros: 0.8,
  Engenharia: 1.5,
  Computação: 1.2,
  Eletrônicos: 0.5,
  Vestuário: 0.4,
  Móveis: 8.0,
  Outros: 1.0,
};

// Piso simulado somado aos valores reais — fiel ao "estatísticas simuladas"
// do edital: com poucos anúncios os números não parecem vazios.
export const SIMULATED_FLOOR = {
  kg: 120,
  moneyCents: 4_500_00, // R$ 4.500,00
};
