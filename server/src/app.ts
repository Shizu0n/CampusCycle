import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { errorBody } from './errors';
import {
  buildRequireIdentity,
  resolveIdentityMode,
  type IdentityMode,
} from './middleware/identity';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { listingsRouter } from './routes/listings';
import { statsRouter } from './routes/stats';

export interface AppOptions {
  /** Máximo de escritas por IP na janela de 15 min (default 20; testes sobem). */
  writeLimit?: number;
  /** Override do IDENTITY_MODE da env (testes criam apps nos dois modos). */
  identityMode?: IdentityMode;
  /** Override do JWT_SECRET da env. */
  jwtSecret?: string;
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

  // Resolver de identidade EXCLUSIVO, escolhido UMA vez na criação do app.
  const identityMode = options.identityMode ?? resolveIdentityMode();
  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET;
  if (identityMode === 'jwt' && !jwtSecret) {
    throw new Error('IDENTITY_MODE=jwt exige JWT_SECRET definido'); // fail-fast no boot
  }
  const requireIdentity = buildRequireIdentity(identityMode, jwtSecret);

  app.use('/api/health', healthRouter);
  app.use('/api/stats', statsRouter);
  // Rotas de auth só existem no estágio 2 — em modo anonymous não há emissão de token.
  if (identityMode === 'jwt') {
    app.use('/api/auth', authRouter(jwtSecret!, writeLimiter));
  }
  app.use('/api/listings', listingsRouter(requireIdentity, writeLimiter));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
