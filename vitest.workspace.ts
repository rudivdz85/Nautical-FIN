import { defineWorkspace } from 'vitest/config'
import path from 'path'

export default defineWorkspace([
  {
    test: {
      name: 'backend',
      globals: true,
      environment: 'node',
      include: ['__tests__/core/**/*.test.ts'],
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
  },
  {
    esbuild: {
      jsx: 'automatic',
    },
    test: {
      name: 'frontend',
      globals: true,
      environment: 'jsdom',
      include: ['__tests__/web/**/*.test.{ts,tsx}'],
      setupFiles: ['__tests__/web/setup.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/web/src'),
        '@fin/core': path.resolve(__dirname, 'packages/core/src'),
        '@fin/core/services': path.resolve(__dirname, 'packages/core/src/services'),
        '@fin/core/types': path.resolve(__dirname, 'packages/core/src/types'),
        next: path.resolve(__dirname, 'apps/web/node_modules/next'),
      },
    },
  },
])
