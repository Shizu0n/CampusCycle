import { Link, Route, Routes } from 'react-router-dom';
import { Feed } from './pages/Feed';
import { NewListing } from './pages/NewListing';
import { ReloadPrompt } from './components/ReloadPrompt';

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="wordmark">
          CampusCycle
        </Link>
        <nav>
          <Link to="/new" className="btn">
            Anunciar
          </Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/new" element={<NewListing />} />
        </Routes>
      </main>

      <ReloadPrompt />
    </div>
  );
}
