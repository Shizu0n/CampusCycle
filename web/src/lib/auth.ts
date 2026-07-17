import { API_CACHE } from './cacheNames';

// Estágio do cliente — espelha o IDENTITY_MODE do server (contrato de 2 estágios).
export const IDENTITY_MODE = ((import.meta.env.VITE_IDENTITY_MODE as string | undefined) ??
  'anonymous') as 'anonymous' | 'jwt';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
}

const TOKEN_KEY = 'campuscycle:token';
const USER_KEY = 'campuscycle:user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

async function purgeApiCache() {
  if ('caches' in window) await caches.delete(API_CACHE);
}

// Troca de identidade (login/registro — emenda CEO 7): purga o cache da API
// ANTES de gravar a sessão nova. O UUID anônimo NÃO é reivindicado — a conta
// nova é outra identidade; anúncios anônimos permanecem anônimos.
export async function startSession(token: string, user: AuthUser) {
  await purgeApiCache();
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function endSession() {
  await purgeApiCache();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
