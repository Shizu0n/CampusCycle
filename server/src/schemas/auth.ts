import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    email: z.string().trim().toLowerCase().email().max(120),
    password: z.string().min(8).max(72), // 72 = limite do bcrypt
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(120),
    password: z.string().min(1).max(72),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
