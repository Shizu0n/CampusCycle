import { Router } from 'express';

// Endpoint de alerta do UptimeRobot. O ping periódico anti-cold-start aponta
// para /api/stats (toca o banco); este fica leve de propósito.
export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});
