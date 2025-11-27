import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'sdk/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './sdk'),
    },
  },
});
