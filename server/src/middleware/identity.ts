/*
 * Contrato de identidade em DOIS ESTÁGIOS — resolver EXCLUSIVO por env.
 *
 *                    IDENTITY_MODE (lido no boot)
 *                    ┌───────────┴───────────┐
 *              "anonymous"                 "jwt" (dia 6+)
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
 */
import type { NextFunction, Request, Response } from 'express';
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
  if (mode === 'anonymous') return mode;
  if (mode === 'jwt') {
    // Estágio 2 chega no dia 6. Falhar no boot evita rodar sem auth por engano.
    throw new Error('IDENTITY_MODE=jwt ainda não implementado');
  }
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

export function buildRequireIdentity(mode: IdentityMode) {
  if (mode === 'anonymous') return anonymousResolver;
  throw new Error('resolver jwt ainda não implementado');
}
