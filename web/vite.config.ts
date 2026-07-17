import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest: SW escrito à mão em src/sw.ts — escolha deliberada pela
      // rubrica de autoria (config não é código explicável; ver design doc).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // 'prompt' é o modo em que needRefresh realmente dispara (toast de atualização).
      registerType: 'prompt',
      injectManifest: {
        // Fontes woff2 self-hosted PRECISAM estar no precache — sem isso o app
        // instalado cai para Verdana offline (DESIGN.md). png = ícones do manifest.
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        // woff (legado) e subsets vietnamitas não servem ao pt-BR.
        globIgnores: ['**/*vietnamese*', '**/*.woff'],
      },
      manifest: {
        name: 'CampusCycle — Desapego Universitário',
        short_name: 'CampusCycle',
        description:
          'Marketplace de economia circular do campus: anuncie, doe e encontre itens usados.',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '/',
        background_color: '#FBF8F0',
        theme_color: '#FBF8F0',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // screenshots: capturados da produção no dia 13
      },
    }),
  ],
});
