import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        // Port 3001 is in the backend's CORS_ORIGIN allow-list (dev .env).
        command: "npm run dev -- --port 3001",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: "3001",
          NEXT_PUBLIC_API_URL: process.env.PLAYWRIGHT_API_URL || "http://localhost:4000",
        } as Record<string, string>,
      },
});
