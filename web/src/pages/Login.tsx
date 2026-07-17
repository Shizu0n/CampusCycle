import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiPost } from '../lib/api';
import type { AuthUser } from '../lib/auth';
import { loginSchema } from '../schemas/auth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = (location.state as { next?: string } | null)?.next ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorMsg('Confira o e-mail e a senha digitados.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost<{ token: string; user: AuthUser }>('/api/auth/login', parsed.data);
      await login(res.token, res.user);
      navigate(next, { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Falha de rede — tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <h2>Entrar</h2>

      <label htmlFor="email">E-mail</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label htmlFor="password">Senha</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {errorMsg && <p className="form-error">{errorMsg}</p>}

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>

      <p>
        Primeira vez por aqui? <Link to="/register">Criar conta</Link>
      </p>
    </form>
  );
}
