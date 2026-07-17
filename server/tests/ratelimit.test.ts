import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { makeListing, userA } from './helpers';

describe('rate limit de escrita', () => {
  it('acima do limite → 429 no envelope; leitura não é limitada', async () => {
    const app = createApp({ writeLimit: 2 });

    await request(app).post('/api/listings').set('X-User-Id', userA).send(makeListing());
    await request(app).post('/api/listings').set('X-User-Id', userA).send(makeListing());
    const blocked = await request(app)
      .post('/api/listings')
      .set('X-User-Id', userA)
      .send(makeListing());

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');

    const read = await request(app).get('/api/listings');
    expect(read.status).toBe(200);
  });
});
