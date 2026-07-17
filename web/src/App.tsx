import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { Feed } from './pages/Feed';
import { Landing } from './pages/Landing';
import { ListingDetail } from './pages/ListingDetail';
import { MyListings } from './pages/MyListings';
import { NewListing } from './pages/NewListing';
import { ReloadPrompt } from './components/ReloadPrompt';

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
          <Link to="/new" className="btn">
            Anunciar
          </Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/new" element={<NewListing />} />
          <Route path="/mine" element={<MyListings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
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
