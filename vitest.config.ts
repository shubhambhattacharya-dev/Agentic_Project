import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['node_modules', 'dist', 'frontend'],
    // Set env vars BEFORE module resolution — setupFiles run too late
    // because env.ts executes at import time (transitive via logger.ts)
    env: {
      NODE_ENV: 'test',
      GROQ_API: 'gsk_test_mock_key_for_ci',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      CLERK_SECRET_KEY: 'sk_test_mock',
      CLERK_PUBLISHABLE_KEY: 'pk_test_mock',
      CLERK_WEBHOOK_SECRET: 'whsec_test_mock',
      LOG_LEVEL: 'silent',
    },
  },
});
