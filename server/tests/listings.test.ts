import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { makeListing, userA, userB } from './helpers';

const app = createApp({ writeLimit: 1000 });

describe('POST /api/listings', () => {
  it('cria anúncio (201) sem expor userId', async () => {
    const payload = makeListing();
    const res = await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(payload.id);
    expect(res.body.status).toBe('available');
    expect(res.body).not.toHaveProperty('userId');
  });

  it('rejeita body inválido com 400 no envelope de erro', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('X-User-Id', userA)
      .send({ id: 'não-é-uuid', title: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('rejeita preço negativo e categoria desconhecida', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('X-User-Id', userA)
      .send(makeListing({ price: -1, category: 'Mágica' as never }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('aceita doação (price null)', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('X-User-Id', userA)
      .send(makeListing({ price: null }));

    expect(res.status).toBe(201);
    expect(res.body.price).toBeNull();
  });

  it('sem identidade → 401 no envelope', async () => {
    const res = await request(app).post('/api/listings').send(makeListing());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('id duplicado do MESMO dono → 200 idempotente, sem linha nova', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);
    const retry = await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    expect(retry.status).toBe(200);
    expect(retry.body.id).toBe(payload.id);
    expect(retry.body).not.toHaveProperty('userId');
    expect(await prisma.listing.count()).toBe(1);
  });

  it('id duplicado de dono DIFERENTE → 409', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);
    const res = await request(app).post('/api/listings').set('X-User-Id', userB).send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(await prisma.listing.count()).toBe(1);
  });
});

describe('GET /api/listings', () => {
  it('lista paginada (12 por página) sem vazar userId', async () => {
    for (let i = 0; i < 15; i++) {
      await request(app)
        .post('/api/listings')
        .set('X-User-Id', userA)
        .send(makeListing({ title: `Item número ${i + 1}` }));
    }

    const page1 = await request(app).get('/api/listings');
    expect(page1.status).toBe(200);
    expect(page1.body.items).toHaveLength(12);
    expect(page1.body.total).toBe(15);
    expect(page1.body.items[0]).not.toHaveProperty('userId');

    const page2 = await request(app).get('/api/listings?page=2');
    expect(page2.body.items).toHaveLength(3);
  });
});

describe('GET /api/listings/:id', () => {
  it('detalhe existente; inexistente → 404 no envelope', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    const found = await request(app).get(`/api/listings/${payload.id}`);
    expect(found.status).toBe(200);
    expect(found.body.title).toBe(payload.title);

    const missing = await request(app).get(`/api/listings/${makeListing().id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/listings/:id', () => {
  it('dono deleta (204); linha some', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    const res = await request(app).delete(`/api/listings/${payload.id}`).set('X-User-Id', userA);
    expect(res.status).toBe(204);
    expect(await prisma.listing.count()).toBe(0);
  });

  it('não-dono → 403 no envelope; linha permanece', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    const res = await request(app).delete(`/api/listings/${payload.id}`).set('X-User-Id', userB);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.listing.count()).toBe(1);
  });
});
