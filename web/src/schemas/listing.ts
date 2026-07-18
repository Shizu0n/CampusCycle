// copy of server/src/schemas/listing.ts — keep in sync (emenda Eng 10):
// o formulário valida com este schema ANTES de enfileirar/enviar.
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
    title: z
      .string()
      .trim()
      .min(3, 'O título precisa de ao menos 3 caracteres.')
      .max(80, 'O título pode ter no máximo 80 caracteres.'),
    description: z
      .string()
      .trim()
      .min(10, 'A descrição precisa de ao menos 10 caracteres.')
      .max(1000, 'A descrição pode ter no máximo 1000 caracteres.'),
    category: z.enum(CATEGORIES, { message: 'Categoria inválida.' }),
    price: z
      .number({ message: 'Informe um preço válido (ex.: 45,00).' })
      .int('Informe um preço válido (ex.: 45,00).')
      .min(0, 'O preço não pode ser negativo.')
      .max(100_000_00, 'Preço máximo: R$ 100.000,00.')
      .nullable(), // centavos; null = doação
    imageUrl: z
      .string()
      .trim()
      .max(500, 'URL da imagem muito longa (máx. 500 caracteres).')
      .regex(/^https?:\/\//, 'A URL da imagem deve começar com http(s)://')
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
