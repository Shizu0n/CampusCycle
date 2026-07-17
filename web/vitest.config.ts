import { defineConfig } from 'vitest/config';

// Config separada do vite.config.ts: os testes da fila não precisam do
// vite-plugin-pwa (e o plugin não deve rodar no ambiente de teste).
export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
  },
});
