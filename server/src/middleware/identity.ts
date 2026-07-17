/*
 * Contrato de identidade em DOIS ESTÁGIOS — resolver EXCLUSIVO por env.
 *
 *                    IDENTITY_MODE (lido no boot)
 *                    ┌───────────┴───────────┐
 *              "anonymous"                 "jwt"
 *                    │                        │
 *         header X-User-Id (UUID)   Authorization: Bearer <token>
 *                    │                        │
 *                    ▼                        ▼
 *          req.userId = header       req.userId = payload.sub
 *        (stub User criado via       (X-User-Id é IGNORADO;
 *         upsert no 1º POST)          sem JWT válido → 401)
 *
 * NUNCA empilhar os dois resolvers: either/or seria bypass total do auth
 * (emenda Eng 5 / OV-6). O fallback do dia 8 = trocar a env, não o código.
 * Registro SEMPRE cria usuário novo — nunca reivindica o stub anônimo
 * (vetor de account takeover; emenda CEO 7 / OV-3).
 * Modo jwt exige JWT_SECRET no boot (fail-fast em app.ts).
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../errors';
import { UUID_REGEX } from '../schemas/listing';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export type IdentityMode = 'anonymous' | 'jwt';

export function resolveIdentityMode(): IdentityMode {
  const mode = process.env.IDENTITY_MODE ?? 'anonymous';
  if (mode === 'anonymous' || mode === 'jwt') return mode;
  throw new Error(`IDENTITY_MODE inválido: "${mode}"`);
}

// Resolver do estágio 1: identidade anônima via header X-User-Id.
function anonymousResolver(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('x-user-id');
  if (!header || !UUID_REGEX.test(header)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Identidade ausente ou inválida (X-User-Id)');
  }
  req.userId = header.toLowerCase();
  next();
}

// Resolver do estágio 2: JWT no Authorization. X-User-Id é ignorado por completo.
function buildJwtResolver(secret: string): RequestHandler {
  return (req, _res, next) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Token ausente — faça login');
    }
    try {
      const payload = jwt.verify(token, secret);
      if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error();
      req.userId = payload.sub;
    } catch {
      throw new ApiError(401, 'UNAUTHORIZED', 'Token inválido ou expirado');
    }
    next();
  };
}

export function buildRequireIdentity(mode: IdentityMode, jwtSecret?: string): RequestHandler {
  if (mode === 'anonymous') return anonymousResolver;
  if (!jwtSecret) throw new Error('IDENTITY_MODE=jwt exige JWT_SECRET');
  return buildJwtResolver(jwtSecret);
}
