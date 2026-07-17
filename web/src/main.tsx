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
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
