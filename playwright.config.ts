import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 600_000,
  use: {
    baseURL: process.env.PERF_BASE_URL ?? "http://localhost:3000",
    video: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // The perf test manages its own concurrency internally (3 browser contexts in one test)
  workers: 1,
});
