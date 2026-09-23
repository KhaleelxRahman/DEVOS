import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout:30000,
  use:{
    headless:false,
    viewport:{width:1920,height:1080},
    screenshot:"only-on-failure",
    video:"retain-on-failure",
    trace:"retain-on-failure"
  }
});
