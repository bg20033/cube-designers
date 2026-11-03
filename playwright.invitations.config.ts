import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "invitations-online.spec.ts",
  fullyParallel: true, workers: 2, timeout: 45000,
  use: { baseURL: "http://127.0.0.1:4178", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "node scripts/test-invitations-server.mjs", url: "http://127.0.0.1:4178", reuseExistingServer: false, timeout: 45000 },
})
