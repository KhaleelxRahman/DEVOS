import { test, expect } from "@playwright/test";

const BASE="https://devos-ebon.vercel.app";

test("DEVOS Live Browser AI", async ({ page }) => {

  page.on("console",m=>console.log("[Console]",m.type(),m.text()));
  page.on("pageerror",e=>console.log("[PageError]",e.message));
  page.on("requestfailed",r=>console.log("[Failed]",r.url()));

  const pages=[
    "/",
    "/login",
    "/register",
    "/dashboard",
    "/workspace",
    "/projects",
    "/settings"
  ];

  for(const p of pages){

    console.log("Opening:",p);

    await page.goto(BASE+p,{waitUntil:"networkidle"});

    await page.waitForTimeout(2500);

    const buttons=await page.locator("button").count();

    console.log("Buttons found:",buttons);

    for(let i=0;i<Math.min(buttons,5);i++){

      const btn=page.locator("button").nth(i);

      try{

        await btn.scrollIntoViewIfNeeded();

        await btn.hover();

        await page.waitForTimeout(300);

      }catch{}

    }

    await page.screenshot({
      path:`screenshots/${p.replace(/\//g,"_")||"home"}.png`,
      fullPage:true
    });

  }

});
