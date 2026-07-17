import { Router } from 'express';
import { prisma } from '../db/prisma';
import { asyncHandler } from '../lib/asyncHandler';
import { KG_BY_CATEGORY, SIMULATED_FLOOR } from '../lib/impact';

// Contador de impacto. Também é o alvo do ping anti-cold-start (emenda Eng 3):
// toca o banco, então aquece Render E Neon.
// Matemática no banco via groupBy/aggregate, nunca fetch-all (emenda Eng 14).
export const statsRouter = Router();

statsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [byCategory, byStatus, soldSum, avgPriceByCategory, donatedByCategory] =
      await Promise.all([
        prisma.listing.groupBy({ by: ['category'], _count: true }),
        prisma.listing.groupBy({ by: ['status'], _count: true }),
        prisma.listing.aggregate({
          _sum: { price: true },
          where: { status: 'sold', price: { not: null } },
        }),
        prisma.listing.groupBy({
          by: ['category'],
          _avg: { price: true },
          where: { price: { not: null } },
        }),
        prisma.listing.groupBy({
          by: ['category'],
          _count: true,
          where: { status: 'donated' },
        }),
      ]);

    // kg: todo anúncio publicado é um item desviado do lixo (peso estimado por categoria).
    const kgReal = byCategory.reduce(
      (sum, g) => sum + g._count * (KG_BY_CATEGORY[g.category] ?? KG_BY_CATEGORY.Outros!),
      0
    );

    // R$ economizado = soma dos preços vendidos + média da categoria para doações.
    const avgByCat = new Map(avgPriceByCategory.map((g) => [g.category, g._avg.price ?? 0]));
    const donatedCents = donatedByCategory.reduce(
      (sum, g) => sum + g._count * Math.round(avgByCat.get(g.category) ?? 0),
      0
    );
    const moneyCentsReal = (soldSum._sum.price ?? 0) + donatedCents;

    const statusCount = (s: string) => byStatus.find((g) => g.status === s)?._count ?? 0;

    res.json({
      totals: {
        listings: byCategory.reduce((sum, g) => sum + g._count, 0),
        available: statusCount('available'),
        sold: statusCount('sold'),
        donated: statusCount('donated'),
      },
      impact: {
        // piso simulado somado (fiel ao "estatísticas simuladas" do edital)
        kg: Math.round((kgReal + SIMULATED_FLOOR.kg) * 10) / 10,
        moneyCents: moneyCentsReal + SIMULATED_FLOOR.moneyCents,
      },
    });
  })
);
