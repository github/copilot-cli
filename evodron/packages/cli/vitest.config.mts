import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@evodron/shared': import.meta.dirname + '/../shared/src/index.ts',
    },
  },
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 30000,
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
  },
});
