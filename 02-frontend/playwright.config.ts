import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../04-tests/e2e",
  use: {
    headless: true,
    baseURL: "http://localhost:5173"
  }
});
