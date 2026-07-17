import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { ApiError } from '../errors';
import { asyncHandler } from '../lib/asyncHandler';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '../schemas/auth';

// Expiração de 7 dias: um anúncio enfileirado offline horas antes ainda
// sincroniza com o mesmo token (decisão deliberada do design doc).
const TOKEN_TTL = '7d';

function publicUser(u: { id: string; name: string; email: string | null }) {
  return { id: u.id, name: u.name, email: u.email };
}

export function authRouter(jwtSecret: string, writeLimiter: RequestHandler) {
  const router = Router();

  const sign = (userId: string) => jwt.sign({}, jwtSecret, { subject: userId, expiresIn: TOKEN_TTL });

  router.post(
    '/register',
    writeLimiter,
    validateBody(registerSchema),
    asyncHandler(async (req, res) => {
      const { name, email, password } = req.body as RegisterInput;

      // SEMPRE cria usuário novo — nunca reivindica o stub anônimo do
      // localStorage (vetor de account takeover; emenda CEO 7 / OV-3).
      const hash = await bcrypt.hash(password, 10);
      try {
        const user = await prisma.user.create({
          data: { id: randomUUID(), name, email, password: hash },
        });
        res.status(201).json({ token: sign(user.id), user: publicUser(user) });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ApiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado');
        }
        throw err;
      }
    })
  );

  router.post(
    '/login',
    writeLimiter,
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      const { email, password } = req.body as LoginInput;

      const user = await prisma.user.findUnique({ where: { email } });
      // Mesma resposta para e-mail inexistente e senha errada (não vaza cadastro).
      if (!user?.password || !(await bcrypt.compare(password, user.password))) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos');
      }
      res.json({ token: sign(user.id), user: publicUser(user) });
    })
  );

  return router;
}
