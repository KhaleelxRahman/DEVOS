import { test, expect } from "@playwright/test";

const BASE_URL="https://devos-ebon.vercel.app";

test("DEVOS Full Manual QA", async ({ page }) => {

  page.on("console",msg=>console.log("[Browser]",msg.type(),msg.text()));
  page.on("pageerror",err=>console.log("[PageError]",err.message));
  page.on("requestfailed",req=>console.log("[RequestFailed]",req.url()));

  // Home
  await page.goto(BASE_URL,{waitUntil:"networkidle"});
  await page.waitForTimeout(2000);

  await expect(page).not.toHaveTitle(/Login – Vercel/i);

  // Login
  await page.goto(BASE_URL+"/login",{waitUntil:"networkidle"});
  await page.waitForTimeout(2000);

  // Register
  await page.goto(BASE_URL+"/register",{waitUntil:"networkidle"});
  await page.waitForTimeout(2000);

  await page.screenshot({path:"test-results/final-home.png",fullPage:true});

});
