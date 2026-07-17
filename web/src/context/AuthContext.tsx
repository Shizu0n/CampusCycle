import { createContext, useContext, useState, type ReactNode } from 'react';
import { endSession, getStoredUser, startSession, type AuthUser } from '../lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  const value: AuthContextValue = {
    user,
    login: async (token, u) => {
      await startSession(token, u); // purge do cache da API acontece aqui dentro
      setUser(u);
    },
    logout: async () => {
      await endSession();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora de AuthProvider');
  return ctx;
}
