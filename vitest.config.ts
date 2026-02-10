import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      exclude: ['packages/core/src/**/index.ts', 'packages/core/src/db/schema.ts'],
    },
  },
  resolve: {
    alias: {
      '@fin/core': path.resolve(__dirname, 'packages/core/src'),
      '@fin/core/services': path.resolve(__dirname, 'packages/core/src/services'),
      '@fin/core/repositories': path.resolve(__dirname, 'packages/core/src/repositories'),
      '@fin/core/errors': path.resolve(__dirname, 'packages/core/src/errors'),
      '@fin/core/types': path.resolve(__dirname, 'packages/core/src/types'),
      '@fin/core/validation': path.resolve(__dirname, 'packages/core/src/validation'),
      '@fin/core/db': path.resolve(__dirname, 'packages/core/src/db'),
      '@fin/logger': path.resolve(__dirname, 'packages/logger/src'),
      '@fin/testing': path.resolve(__dirname, 'packages/testing/src'),
    },
  },
})
