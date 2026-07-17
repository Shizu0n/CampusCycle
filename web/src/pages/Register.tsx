import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiPost } from '../lib/api';
import type { AuthUser } from '../lib/auth';
import { registerSchema } from '../schemas/auth';

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setErrorMsg(
        first?.path[0] === 'password'
          ? 'A senha precisa de ao menos 8 caracteres.'
          : `${String(first?.path[0])}: ${first?.message}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost<{ token: string; user: AuthUser }>(
        '/api/auth/register',
        parsed.data
      );
      await login(res.token, res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Falha de rede — tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <h2>Criar conta</h2>

      <label htmlFor="name">Nome</label>
      <input
        id="name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label htmlFor="email">E-mail</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label htmlFor="password">Senha (mín. 8 caracteres)</label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {errorMsg && <p className="form-error">{errorMsg}</p>}

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Criando…' : 'Criar conta'}
      </button>

      <p>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  );
}
