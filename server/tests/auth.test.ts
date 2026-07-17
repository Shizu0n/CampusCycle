import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { makeListing, userA } from './helpers';

const SECRET = 'segredo-de-teste-nunca-em-producao';
// Apps nos DOIS modos: a exclusividade do resolver é por instância/env.
const jwtApp = createApp({ writeLimit: 1000, identityMode: 'jwt', jwtSecret: SECRET });
const anonApp = createApp({ writeLimit: 1000, identityMode: 'anonymous' });

const CREDS = { name: 'Ana Souza', email: 'ana@edu.unifor.br', password: 'senha-forte-123' };

describe('POST /api/auth/register', () => {
  it('cria usuário e retorna token válido, sem vazar o hash', async () => {
    const res = await request(jwtApp).post('/api/auth/register').send(CREDS);

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      name: 'Ana Souza',
      email: 'ana@edu.unifor.br',
    });
    expect(res.body.user).not.toHaveProperty('password');

    const payload = jwt.verify(res.body.token, SECRET);
    expect(typeof payload !== 'string' && payload.sub).toBe(res.body.user.id);
  });

  it('e-mail repetido → 409 EMAIL_TAKEN', async () => {
    await request(jwtApp).post('/api/auth/register').send(CREDS);
    const res = await request(jwtApp).post('/api/auth/register').send(CREDS);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('senha curta → 400 no envelope', async () => {
    const res = await request(jwtApp)
      .post('/api/auth/register')
      .send({ ...CREDS, password: '1234567' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('NUNCA reivindica o stub anônimo: registro cria id novo e não herda anúncios', async () => {
    // usuário anônimo (estágio 1) cria um anúncio → stub userA existe no banco
    await request(anonApp).post('/api/listings').set('X-User-Id', userA).send(makeListing());

    const res = await request(jwtApp).post('/api/auth/register').send(CREDS);
    expect(res.body.user.id).not.toBe(userA);

    // a conta nova começa sem anúncios — os anônimos permanecem anônimos
    const mine = await request(jwtApp)
      .get('/api/listings/mine')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(mine.body.items).toHaveLength(0);

    // e o stub segue dono do anúncio dele
    expect(await prisma.listing.count({ where: { userId: userA } })).toBe(1);
  });
});

describe('POST /api/auth/login', () => {
  it('credenciais corretas → token; senha errada → 401', async () => {
    await request(jwtApp).post('/api/auth/register').send(CREDS);

    const ok = await request(jwtApp)
      .post('/api/auth/login')
      .send({ email: CREDS.email, password: CREDS.password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(jwtApp)
      .post('/api/auth/login')
      .send({ email: CREDS.email, password: 'senha-errada-99' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('e-mail inexistente → mesma resposta 401 (não vaza cadastro)', async () => {
    const res = await request(jwtApp)
      .post('/api/auth/login')
      .send({ email: 'ninguem@nada.com', password: 'qualquer-coisa' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('escritas em modo jwt', () => {
  async function registerAndGetToken() {
    const res = await request(jwtApp).post('/api/auth/register').send(CREDS);
    return res.body.token as string;
  }

  it('token válido → cria anúncio', async () => {
    const token = await registerAndGetToken();
    const res = await request(jwtApp)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(makeListing());
    expect(res.status).toBe(201);
  });

  it('X-User-Id sozinho é IGNORADO → 401 (resolver exclusivo, emenda Eng 5)', async () => {
    const res = await request(jwtApp)
      .post('/api/listings')
      .set('X-User-Id', userA)
      .send(makeListing());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('token inválido ou expirado → 401', async () => {
    const invalid = await request(jwtApp)
      .post('/api/listings')
      .set('Authorization', 'Bearer nao-e-um-token')
      .send(makeListing());
    expect(invalid.status).toBe(401);

    const expired = jwt.sign({}, SECRET, { subject: userA, expiresIn: -10 });
    const res = await request(jwtApp)
      .post('/api/listings')
      .set('Authorization', `Bearer ${expired}`)
      .send(makeListing());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rotas de auth não existem em modo anonymous', async () => {
    const res = await request(anonApp).post('/api/auth/register').send(CREDS);
    expect(res.status).toBe(404);
  });
});
