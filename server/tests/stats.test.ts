import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { KG_BY_CATEGORY, SIMULATED_FLOOR } from '../src/lib/impact';
import { makeListing, userA } from './helpers';

const app = createApp({ writeLimit: 1000 });

describe('GET /api/stats', () => {
  it('banco vazio → só o piso simulado (números nunca zerados)', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totals.listings).toBe(0);
    expect(res.body.impact.kg).toBe(SIMULATED_FLOOR.kg);
    expect(res.body.impact.moneyCents).toBe(SIMULATED_FLOOR.moneyCents);
  });

  it('matemática: kg por categoria + vendidos + média da categoria para doações', async () => {
    // Fixture: 2 livros com preço (um vendido), 1 livro doado, 1 móvel disponível.
    const sold = makeListing({ price: 4000 });
    const available = makeListing({ price: 6000 });
    const donated = makeListing({ price: null });
    const furniture = makeListing({ category: 'Móveis', price: 20000 });
    for (const p of [sold, available, donated, furniture]) {
      await request(app).post('/api/listings').set('X-User-Id', userA).send(p);
    }
    await prisma.listing.update({ where: { id: sold.id }, data: { status: 'sold' } });
    await prisma.listing.update({ where: { id: donated.id }, data: { status: 'donated' } });

    const res = await request(app).get('/api/stats');

    expect(res.body.totals).toEqual({ listings: 4, available: 2, sold: 1, donated: 1 });

    // kg = 3×Livros + 1×Móveis + piso
    const kg = 3 * KG_BY_CATEGORY.Livros! + KG_BY_CATEGORY['Móveis']! + SIMULATED_FLOOR.kg;
    expect(res.body.impact.kg).toBe(Math.round(kg * 10) / 10);

    // R$ = vendido (4000) + doação × média de Livros com preço ((4000+6000)/2 = 5000) + piso
    expect(res.body.impact.moneyCents).toBe(4000 + 5000 + SIMULATED_FLOOR.moneyCents);
  });
});
