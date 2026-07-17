import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../errors';

// Valida req.body contra um schema zod; falha → 400 no envelope padrão.
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw new ApiError(400, 'VALIDATION_ERROR', 'Dados inválidos', details);
    }
    req.body = result.data;
    next();
  };
}
