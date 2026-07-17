// Fonte de verdade do contrato de anúncio (zod). O web usa uma cópia verbatim
// deste arquivo (web/src/schemas/listing.ts) e valida ANTES de enfileirar.
import { z } from 'zod';

export const CATEGORIES = [
  'Livros',
  'Engenharia',
  'Computação',
  'Eletrônicos',
  'Vestuário',
  'Móveis',
  'Outros',
] as const;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createListingSchema = z
  .object({
    id: z.string().regex(UUID_REGEX, 'id deve ser um UUID gerado no cliente'),
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().min(10).max(1000),
    category: z.enum(CATEGORIES),
    price: z.number().int().min(0).max(100_000_00).nullable(), // centavos; null = doação
    imageUrl: z
      .string()
      .trim()
      .max(500)
      .regex(/^https?:\/\//, 'imageUrl deve ser http(s)')
      .optional(),
  })
  .strict();

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const STATUSES = ['available', 'sold', 'donated'] as const;

// PATCH (dono): título/descrição/preço/status — ex.: marcar como vendido/doado.
export const updateListingSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().min(10).max(1000),
    price: z.number().int().min(0).max(100_000_00).nullable(),
    status: z.enum(STATUSES),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'informe ao menos um campo para atualizar',
  });

export type UpdateListingInput = z.infer<typeof updateListingSchema>;
