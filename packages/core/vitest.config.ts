import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    maxWorkers: 4,
    testTimeout: 20_000,
  },
})
