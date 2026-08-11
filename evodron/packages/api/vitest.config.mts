import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@evodron/shared': import.meta.dirname + '/../shared/src/index.ts',
      '@evodron/db': import.meta.dirname + '/../db/src/index.ts',
    },
  },
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 30000,
  },
});
