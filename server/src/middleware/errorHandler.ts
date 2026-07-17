import type { NextFunction, Request, Response } from 'express';
import { ApiError, errorBody } from '../errors';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json(errorBody('NOT_FOUND', 'Rota não encontrada'));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json(errorBody(err.code, err.message, err.details));
    return;
  }
  // express.json: body malformado ou acima do limite de 50kb
  if (err instanceof SyntaxError && 'status' in err) {
    res.status(400).json(errorBody('INVALID_JSON', 'JSON malformado'));
    return;
  }
  console.error({ method: req.method, path: req.path, err });
  res.status(500).json(errorBody('INTERNAL', 'Erro interno'));
}
