import type { ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ReloadPrompt } from './components/ReloadPrompt';
import { useAuth } from './context/AuthContext';
import { IDENTITY_MODE } from './lib/auth';
import { Feed } from './pages/Feed';
import { Landing } from './pages/Landing';
import { ListingDetail } from './pages/ListingDetail';
import { Login } from './pages/Login';
import { MyListings } from './pages/MyListings';
import { NewListing } from './pages/NewListing';
import { Register } from './pages/Register';

// Em modo jwt, escrita exige sessão; em modo anonymous a rota é livre
// (identidade = UUID do localStorage). Contrato de 2 estágios.
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (IDENTITY_MODE === 'jwt' && !user) {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }
  return children;
}

function AuthNav() {
  const { user, logout } = useAuth();
  if (IDENTITY_MODE !== 'jwt') return null;
  return user ? (
    <span className="auth-nav">
      <span className="auth-greeting">Olá, {user.name.split(' ')[0]}</span>
      <button className="btn btn--ghost" onClick={() => void logout()}>
        Sair
      </button>
    </span>
  ) : (
    <NavLink to="/login">Entrar</NavLink>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="wordmark">
          CampusCycle
        </Link>
        <nav className="desktop-nav">
          <NavLink to="/feed">Vitrine</NavLink>
          <NavLink to="/mine">Meus anúncios</NavLink>
          <AuthNav />
          <Link to="/new" className="btn">
            Anunciar
          </Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<Feed />} />
          <Route
            path="/new"
            element={
              <RequireAuth>
                <NewListing />
              </RequireAuth>
            }
          />
          <Route
            path="/mine"
            element={
              <RequireAuth>
                <MyListings />
              </RequireAuth>
            }
          />
          <Route path="/listings/:id" element={<ListingDetail />} />
          {IDENTITY_MODE === 'jwt' && (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </>
          )}
        </Routes>
      </main>

      {/* Nav de app no mobile (Chivo Mono 12px, uppercase — DESIGN.md) */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        <NavLink to="/feed">Vitrine</NavLink>
        <NavLink to="/new">Anunciar</NavLink>
        <NavLink to="/mine">Meus</NavLink>
      </nav>

      <ReloadPrompt />
    </div>
  );
}
