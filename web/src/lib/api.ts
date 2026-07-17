import { getToken, IDENTITY_MODE } from './auth';
import { getUserId } from './identity';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

// Render free hiberna (~1 min de cold start). Timeout generoso + mensagem de
// "acordando" ficam por conta de quem chama (emenda CEO 8); aqui só o transporte.
const TIMEOUT_MS = 70_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

// Credencial EXCLUSIVA do estágio ativo (espelha o resolver do server):
// anonymous → X-User-Id; jwt → Authorization Bearer (se houver sessão).
function identityHeaders(): Record<string, string> {
  if (IDENTITY_MODE === 'jwt') {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return { 'X-User-Id': getUserId() };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      // Identidade em TODA requisição (o GET /mine também precisa dela).
      headers: { ...identityHeaders(), ...init.headers },
      signal: controller.signal,
    });
    if (res.status === 204) return undefined as T;
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = body?.error ?? {};
      throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? res.statusText, err.details);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, data: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function apiDelete(path: string): Promise<void> {
  return request<void>(path, { method: 'DELETE' });
}
