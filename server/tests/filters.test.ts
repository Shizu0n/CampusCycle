import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { makeListing, userA, userB } from './helpers';

const app = createApp({ writeLimit: 1000 });

beforeEach(async () => {
  const fixtures = [
    { owner: userA, data: makeListing({ title: 'Stewart Cálculo', category: 'Livros', price: 4500 }) },
    { owner: userA, data: makeListing({ title: 'Jaleco M', description: 'Sem manchas, tamanho médio.', category: 'Vestuário', price: null }) },
    { owner: userB, data: makeListing({ title: 'Teclado mecânico', description: 'Switch brown ABNT2.', category: 'Computação', price: 15000 }) },
  ];
  for (const f of fixtures) {
    await request(app).post('/api/listings').set('X-User-Id', f.owner).send(f.data);
  }
});

describe('GET /api/listings — filtros', () => {
  it('?category= filtra por categoria exata', async () => {
    const res = await request(app).get('/api/listings?category=Livros');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].title).toBe('Stewart Cálculo');
  });

  it('?q= busca em título e descrição, case-insensitive', async () => {
    const byTitle = await request(app).get('/api/listings?q=stewart');
    expect(byTitle.body.total).toBe(1);

    const byDescription = await request(app).get('/api/listings?q=abnt2');
    expect(byDescription.body.total).toBe(1);
    expect(byDescription.body.items[0].title).toBe('Teclado mecânico');
  });

  it('?donation=true retorna só doações (price null)', async () => {
    const res = await request(app).get('/api/listings?donation=true');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].price).toBeNull();
  });

  it('filtros combinados: categoria sem doações → vazio', async () => {
    const res = await request(app).get('/api/listings?category=Livros&donation=true');
    expect(res.body.total).toBe(0);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/listings/mine', () => {
  it('retorna só os anúncios da identidade do header', async () => {
    const res = await request(app).get('/api/listings/mine').set('X-User-Id', userA);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    for (const item of res.body.items) expect(item).not.toHaveProperty('userId');
  });

  it('sem identidade → 401 (e /mine não é engolida por /:id)', async () => {
    const res = await request(app).get('/api/listings/mine');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
