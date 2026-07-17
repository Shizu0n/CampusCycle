import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Fontes self-hosted (woff2 no bundle, SW-precached) — nunca CDN: o PWA
// instalado precisa renderizar a tipografia correta OFFLINE (DESIGN.md).
import '@fontsource/alfa-slab-one/400.css';
import '@fontsource-variable/archivo';
import '@fontsource/chivo-mono/400.css';
import '@fontsource/chivo-mono/500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/components.css';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { initOfflineQueue } from './lib/offlineQueue';

// Retry no load + listener 'online' — o sync primário da fila (design doc).
initOfflineQueue();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
