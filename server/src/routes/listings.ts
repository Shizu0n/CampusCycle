import { Prisma } from '@prisma/client';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { prisma } from '../db/prisma';
import { ApiError } from '../errors';
import { asyncHandler } from '../lib/asyncHandler';
import { validateBody } from '../middleware/validate';
import { createListingSchema, type CreateListingInput } from '../schemas/listing';

// userId NUNCA aparece em respostas públicas (emenda CEO 5) — select explícito.
const PUBLIC_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  price: true,
  imageUrl: true,
  status: true,
  createdAt: true,
} as const;

const PAGE_SIZE = 12;

export function listingsRouter(requireIdentity: RequestHandler, writeLimiter: RequestHandler) {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const page = Math.max(1, Number(req.query.page) || 1);
      const { category, q, donation } = req.query;

      const where: Prisma.ListingWhereInput = {};
      if (typeof category === 'string' && category) where.category = category;
      if (donation === 'true') where.price = null;
      if (typeof q === 'string' && q.trim()) {
        where.OR = [
          { title: { contains: q.trim(), mode: 'insensitive' } },
          { description: { contains: q.trim(), mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.listing.findMany({
          where,
          select: PUBLIC_SELECT,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.listing.count({ where }),
      ]);
      res.json({ items, page, pageSize: PAGE_SIZE, total });
    })
  );

  // /mine ANTES de /:id — senão :id engole a rota (design doc, nota de implementação).
  router.get(
    '/mine',
    requireIdentity,
    asyncHandler(async (req, res) => {
      const items = await prisma.listing.findMany({
        where: { userId: req.userId },
        select: PUBLIC_SELECT,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ items });
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const listing = await prisma.listing.findUnique({
        where: { id: req.params.id },
        select: PUBLIC_SELECT,
      });
      if (!listing) throw new ApiError(404, 'NOT_FOUND', 'Anúncio não encontrado');
      res.json(listing);
    })
  );

  router.post(
    '/',
    writeLimiter,
    requireIdentity,
    validateBody(createListingSchema),
    asyncHandler(async (req, res) => {
      const input = req.body as CreateListingInput;
      const userId = req.userId!;

      // Estágio 1: garante a linha stub do usuário anônimo (FK de Listing).
      await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });

      try {
        const created = await prisma.listing.create({
          data: { ...input, userId },
          select: PUBLIC_SELECT,
        });
        res.status(201).json(created);
      } catch (err) {
        // Id duplicado (retry da fila offline). Mesmo dono → 200 idempotente;
        // dono diferente → 409 (emenda Eng 6 — fecha sondagem de ids públicos).
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const existing = await prisma.listing.findUnique({ where: { id: input.id } });
          if (existing && existing.userId === userId) {
            const { userId: _omit, ...publicExisting } = existing;
            res.status(200).json(publicExisting);
            return;
          }
          throw new ApiError(409, 'CONFLICT', 'Id já utilizado por outro usuário');
        }
        throw err;
      }
    })
  );

  router.delete(
    '/:id',
    writeLimiter,
    requireIdentity,
    asyncHandler(async (req, res) => {
      const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
      if (!listing) throw new ApiError(404, 'NOT_FOUND', 'Anúncio não encontrado');
      if (listing.userId !== req.userId) {
        throw new ApiError(403, 'FORBIDDEN', 'Você não é o dono deste anúncio');
      }
      await prisma.listing.delete({ where: { id: listing.id } });
      res.status(204).end();
    })
  );

  return router;
}
