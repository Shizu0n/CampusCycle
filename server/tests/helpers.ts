import { randomUUID } from 'node:crypto';
import type { CreateListingInput } from '../src/schemas/listing';

export function makeListing(overrides: Partial<CreateListingInput> = {}): CreateListingInput {
  return {
    id: randomUUID(),
    title: 'Cálculo Vol. 1 — Stewart',
    description: 'Livro em bom estado, poucas marcações a lápis.',
    category: 'Livros',
    price: 4500,
    ...overrides,
  };
}

export const userA = randomUUID();
export const userB = randomUUID();
