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

describe('PATCH /api/listings/:id', () => {
  it('dono marca como vendido (200) sem expor userId', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    const res = await request(app)
      .patch(`/api/listings/${payload.id}`)
      .set('X-User-Id', userA)
      .send({ status: 'sold' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('sold');
    expect(res.body).not.toHaveProperty('userId');
  });

  it('não-dono → 403 no envelope; status permanece', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    const res = await request(app)
      .patch(`/api/listings/${payload.id}`)
      .set('X-User-Id', userB)
      .send({ status: 'sold' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    const kept = await prisma.listing.findUnique({ where: { id: payload.id } });
    expect(kept?.status).toBe('available');
  });

  it('inexistente → 404; sem identidade → 401', async () => {
    const missing = await request(app)
      .patch(`/api/listings/${makeListing().id}`)
      .set('X-User-Id', userA)
      .send({ status: 'sold' });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const anon = await request(app)
      .patch(`/api/listings/${makeListing().id}`)
      .send({ status: 'sold' });
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejeita status desconhecido, campo estranho e body vazio (400)', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    for (const bad of [{ status: 'trocado' }, { userId: userB }, {}]) {
      const res = await request(app)
        .patch(`/api/listings/${payload.id}`)
        .set('X-User-Id', userA)
        .send(bad);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('atualiza preço para doação (null) e título', async () => {
    const payload = makeListing();
    await request(app).post('/api/listings').set('X-User-Id', userA).send(payload);

    const res = await request(app)
      .patch(`/api/listings/${payload.id}`)
      .set('X-User-Id', userA)
      .send({ price: null, title: 'Doando: Cálculo Vol. 1' });

    expect(res.status).toBe(200);
    expect(res.body.price).toBeNull();
    expect(res.body.title).toBe('Doando: Cálculo Vol. 1');
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
