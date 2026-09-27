import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 90000,
  outputDir: "test-results",
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL: "https://web.whatsapp.com",
    trace: {
      mode: "on",
      screenshots: true,
      snapshots: true,
      sources: true,
    },
    screenshot: "on",
    video: "on",
    headless: true,
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    launchOptions: {
      ignoreDefaultArgs: ["--enable-automation"],
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
    actionTimeout: 10000,
  },
  projects: [
    {
      name: "auth-locators",
      testMatch: /auth-locators\.spec\.ts/,
    },
    {
      name: "chat-locators",
      testMatch: /chat-locators\.spec\.ts/,
    },
  ],
});
