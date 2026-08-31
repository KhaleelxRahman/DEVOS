# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\home.spec.ts >> DEVOS Homepage
- Location: tests\home.spec.ts:3:5

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /DEVOS/i
Received string:  "Login – Vercel"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    13 × locator resolved to <html lang="en-US" data-sidebar-nav-version="v1" data-user-display="logged-out" class="geist_mono_fe992356-module__VEU71W__className geistsans_d5a4f12f-module__zXissq__className geist_mono_fe992356-module__VEU71W__variable geistsans_d5a4f12f-module__zXissq__variable dash light-theme js-focus-visible">…</html>
       - unexpected value "Login – Vercel"

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
        - /url: /signup?next=%2Fsso-api%3Furl%3Dhttps%253A%252F%252Fdevos-jp2y0o70p-khaleelxrahmans-projects.vercel.app%252F%26nonce%3D7702b5b8ceaa2c9035569cd48318afadb667bcff7b44611b0c7ab3076ea983ad
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
      - /url: /signup?next=%2Fsso-api%3Furl%3Dhttps%253A%252F%252Fdevos-jp2y0o70p-khaleelxrahmans-projects.vercel.app%252F%26nonce%3D7702b5b8ceaa2c9035569cd48318afadb667bcff7b44611b0c7ab3076ea983ad
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
  3  | test("DEVOS Homepage", async ({ page }) => {
  4  | 
  5  |   await page.goto("https://devos-jp2y0o70p-khaleelxrahmans-projects.vercel.app");
  6  | 
> 7  |   await expect(page).toHaveTitle(/DEVOS/i);
     |                      ^ Error: expect(page).toHaveTitle(expected) failed
  8  | 
  9  |   await page.waitForTimeout(3000);
  10 | 
  11 | });
  12 | 
```