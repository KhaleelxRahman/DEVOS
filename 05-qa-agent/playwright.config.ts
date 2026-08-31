import { defineConfig } from "@playwright/test";

export default defineConfig({
  use:{
    headless:false,
    viewport:{width:1920,height:1080},
    screenshot:"only-on-failure",
    video:"retain-on-failure"
  }
});
