# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\home.spec.ts >> DEVOS Manual Browser QA
- Location: tests\home.spec.ts:5:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('body')
Expected substring: "DEVOS"
Received string:    "Skip to contentSign UpLog in to VercelContinue with EmailContinue with GoogleContinue with GitHubContinue with ChatGPTContinue with SAML SSOContinue with PasskeyShow other optionsDon't have an account? Sign UpTermsPrivacy PolicyLogin – Vercel"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('body')
    13 × locator resolved to <body class="@container">…</body>
       - unexpected value "Skip to contentSign UpLog in to VercelContinue with EmailContinue with GoogleContinue with GitHubContinue with ChatGPTContinue with SAML SSOContinue with PasskeyShow other optionsDon't have an account? Sign UpTermsPrivacy PolicyLogin – Vercel"

```

```yaml
- link "Skip to content":
  - /url: "#geist-skip-nav"
- banner:
  - link "Vercel logo":
    - /url: /home
    - button "Vercel Logo":
      - img "Vercel Logo"
  - navigation:
    - navigation:
      - link "Sign Up":
        - /url: /signup?next=%2Fsso-api%3Furl%3Dhttps%253A%252F%252Fdevos-jp2y0o70p-khaleelxrahmans-projects.vercel.app%252F%26nonce%3Da1387fc15df82d07ae5401d38845c058cb89b1ac3d26c6045705987e17ba0fe1
        - paragraph: Sign Up
- main:
  - heading "Log in to Vercel" [level=1]
  - textbox "Email Address"
  - button "Continue with Email"
  - button "Continue with Google"
  - button "Continue with GitHub"
  - button "Continue with ChatGPT"
  - button "Continue with SAML SSO":
    - img
    - text: Continue with SAML SSO
  - button "Continue with Passkey":
    - img
    - text: Continue with Passkey
  - button "Show other options"
  - paragraph:
    - text: Don't have an account?
    - link "Sign Up":
      - /url: /signup?next=%2Fsso-api%3Furl%3Dhttps%253A%252F%252Fdevos-jp2y0o70p-khaleelxrahmans-projects.vercel.app%252F%26nonce%3Da1387fc15df82d07ae5401d38845c058cb89b1ac3d26c6045705987e17ba0fe1
  - link "Terms":
    - /url: /legal/terms
  - link "Privacy Policy":
    - /url: /legal/privacy-policy
- alert
- img
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const BASE_URL="https://devos-jp2y0o70p-khaleelxrahmans-projects.vercel.app";
  4  | 
  5  | test("DEVOS Manual Browser QA", async ({ page }) => {
  6  | 
  7  |   // Open site
  8  |   await page.goto(BASE_URL,{waitUntil:"networkidle"});
  9  | 
  10 |   // Make sure Vercel login is NOT shown
  11 |   await expect(page).not.toHaveTitle(/Login � Vercel/i);
  12 | 
  13 |   // Wait so you can watch it
  14 |   await page.waitForTimeout(2000);
  15 | 
  16 |   // Check homepage text
> 17 |   await expect(page.locator("body")).toContainText("DEVOS");
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  18 | 
  19 |   // Try Login page
  20 |   await page.goto(BASE_URL+"/login",{waitUntil:"networkidle"});
  21 |   await page.waitForTimeout(1500);
  22 | 
  23 |   // Try Register page
  24 |   await page.goto(BASE_URL+"/register",{waitUntil:"networkidle"});
  25 |   await page.waitForTimeout(1500);
  26 | 
  27 | });
  28 | 
```