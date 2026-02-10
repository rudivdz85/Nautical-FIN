import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['../../__tests__/core/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/db/schema.ts'],
    },
  },
  resolve: {
    alias: {
      '@fin/core': new URL('./src', import.meta.url).pathname,
    },
  },
})
