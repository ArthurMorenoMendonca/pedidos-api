import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: { LOG_LEVEL: 'silent' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // server.ts é só o bootstrap (listen + sinais); o app é testado via createApp.
      exclude: ['src/server.ts'],
      reporter: ['text', 'lcov'],
      // Coverage mínimo declarado (também citado no README).
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
});
