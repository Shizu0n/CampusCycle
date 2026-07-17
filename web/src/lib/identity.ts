// Identidade estágio 1: UUID anônimo persistido em localStorage, enviado via
// X-User-Id. No estágio 2 (JWT, dias 6-7) o token substitui este mecanismo —
// e o cliente TROCA a identidade (nunca reivindica o stub; emenda CEO 7).
const KEY = 'campuscycle:userId';

export function getUserId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
