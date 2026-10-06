import { defineConfig, devices } from '@playwright/test';

// E2E chạy trên stack thật: FE (vite) + BE (Spring, tự bật trước) + Postgres. Xem e2e/README.md.
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  // ponytail: các spec dùng chung 1 DB → chạy tuần tự; tách DB theo worker nếu cần chạy song song
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000, // gọi Gemini có thể chậm
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Trang chủ có mở màn + tự cuộn kể chuyện; tắt hiệu ứng để các spec khác không phải chờ / bị cuộn mất.
    // Spec trang chủ bật lại (reducedMotion: 'no-preference') để test riêng phần mở màn.
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', testIgnore: /mobile/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } },
    // Điện thoại: Pixel 7 (Chromium, có touch + UA mobile) — chỉ chạy các spec *mobile*
    { name: 'mobile', testMatch: /mobile/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
