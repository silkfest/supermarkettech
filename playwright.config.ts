import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
          args: [
            '--no-sandbox',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--single-process'
          ]
        }
      : {}
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'phone',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    }
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100/game',
    timeout: 120_000,
    // Local browser fixtures never contact a real account or modify saved data.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-test-placeholder'
    }
  }
})
