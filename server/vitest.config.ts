import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Testes compartilham o mesmo banco — sem paralelismo entre arquivos.
    fileParallelism: false,
    setupFiles: ['tests/setup.ts'],
  },
});
