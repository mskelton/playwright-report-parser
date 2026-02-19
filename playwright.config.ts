import { defineConfig } from '@playwright/test'

export default defineConfig({
  fullyParallel: true,
  reporter: 'list',
  testDir: './tests',
  timeout: 60000,
  use: {
    trace: 'on-first-retry',
  },
})
