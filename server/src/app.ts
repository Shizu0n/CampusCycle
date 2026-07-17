import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { errorBody } from './errors';
import { buildRequireIdentity, resolveIdentityMode } from './middleware/identity';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { listingsRouter } from './routes/listings';
import { statsRouter } from './routes/stats';

export interface AppOptions {
  /** Máximo de escritas por IP na janela de 15 min (default 20; testes sobem). */
  writeLimit?: number;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  // Render fica atrás de exatamente 1 proxy. Nunca `true` (spoofável) — emenda Eng 1.
  app.set('trust proxy', 1);

  if (process.env.NODE_ENV !== 'test') {
    app.use(pinoHttp());
  }

  // 5173 = vite dev; 4173 = vite preview (build de produção — onde o PWA é testável)
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.WEB_ORIGIN,
  ].filter(Boolean);
  app.use(cors({ origin: allowedOrigins as string[] }));
  app.use(express.json({ limit: '50kb' }));

  const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.writeLimit ?? 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(errorBody('RATE_LIMITED', 'Muitas requisições — tente em alguns minutos'));
    },
  });

  const requireIdentity = buildRequireIdentity(resolveIdentityMode());

  app.use('/api/health', healthRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/listings', listingsRouter(requireIdentity, writeLimiter));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
