import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const BASE="https://devos-ebon.vercel.app",API="https://devos-backend-f3ub.onrender.com/api/v1",STAMP=Date.now(),EMAIL=`qa.focus.${STAMP}@example.com`,PASSWORD="Devos-Focus-2026!-ok",NAME="QA Focus Agent",PROJECT=`Focus ${STAMP}`,DIR=path.join(process.cwd(),"test-results","focus");
fs.mkdirSync(DIR,{recursive:true});
const rows=[];
let seq=0;const nid=()=>String(++seq).padStart(3,"0");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const pq=[];
function rd(p:any){p.on("dialog",async(d:any)=>{try{if(d.type()==="prompt")await d.accept(pq.shift()??"");else await d.accept()}catch{}})}
const qp=(v:string)=>pq.push(v);
function rec(a:string,n:string,s:"PASS"|"FAIL",dt?:string){const r:any={id:nid(),area:a,name:n,status:s};if(dt)r.detail=dt;rows.push(r);console.log(`[FOCUS] ${s} ${r.id} ${a} :: ${n}${dt?" :: "+dt:""}`)}
async function chk(p:any,a:string,n:string,fn:()=>Promise<void>){try{await fn();rec(a,n,"PASS");return true}catch(e){rec(a,n,"FAIL",String((e as Error)?.message??e).split("\n").map(s=>s.trim()).filter(Boolean).slice(0,3).join(" | ").slice(0,400));return false}}
test("DEVOS focused verification",async({page,browser})=>{
test.setTimeout(900_000);rd(page);
const probe=async(m:string,p:string,b?:unknown)=>(await page.request.fetch(`${API}${p}`,{method:m,headers:{"Content-Type":"application/json"},data:b})).status();
rec("BACKEND","/ai/chat/stream",(await probe("POST","/projects/00000000-0000-0000-0000-000000000000/ai/chat/stream",{message:"hi"}))===404?"FAIL":"PASS","404=missing on deployed backend");
rec("BACKEND","/ai/artifacts",(await probe("POST","/projects/00000000-0000-0000-0000-000000000000/ai/artifacts",{name:"x",kind:"markdown",content:"x"}))===404?"FAIL":"PASS","404=missing on deployed backend");
rec("BACKEND","/files/move",(await probe("POST","/projects/00000000-0000-0000-0000-000000000000/files/move",{path:"a",destination_parent:"b"}))===405?"FAIL":"PASS","405=missing on deployed backend");
await chk(page,"AUTH","Register",async()=>{await page.goto(`${BASE}/register`,{waitUntil:"domcontentloaded"});await page.getByLabel("Full Name").fill(NAME);await page.getByLabel("Email Address").fill(EMAIL);await page.getByLabel("Password").fill(PASSWORD);await page.getByRole("button",{name:"Create Account"}).click();await expect(page).toHaveURL(/\/app\/dashboard$/,{timeout:90_000})});
await chk(page,"PROJECT","Create project",async()=>{await page.goto(`${BASE}/app/projects`,{waitUntil:"domcontentloaded"});await page.getByRole("button",{name:"Create Project"}).first().click();await page.getByLabel("Project Name").fill(PROJECT);await page.getByRole("dialog").last().getByRole("button",{name:"Create Project"}).click();await expect(page).toHaveURL(/\/app\/workspace$/,{timeout:60_000})});
qp("src");await chk(page,"EXPLORER","Create folder src",async()=>{await page.getByRole("button",{name:"New file, folder, or upload"}).click();await page.getByRole("menuitem",{name:"New Folder"}).click();await expect(page.locator('.tree-row[title="src"]').first()).toBeVisible({timeout:30_000})});
const mkFile=async(p:any,parent:string,name:string,kind:string)=>{
  for(let a=0;a<3;a++){
    try{
      await p.locator(`.tree-row[title="${parent}"]`).first().click();await sleep(400);
      await p.locator(`.tree-row[title="${parent}"]`).first().click({button:"right"});
      await expect(p.getByRole("menuitem",{name:kind==="file"?"New File":"New Folder"})).toBeVisible({timeout:8_000});
      await p.getByRole("menuitem",{name:kind==="file"?"New File":"New Folder"}).click();
      return true;
    }catch(e){await sleep(1000)}
  }
  throw new Error(`could not open ${kind} menu in ${parent}`)
};
for(const f of["a.ts","b.ts"]){qp(f);await chk(page,"EXPLORER",`Create src/${f}`,async()=>{await mkFile(page,"src",f,"file");await expect(page.locator(`.tree-row[title="src/${f}"]`).last()).toBeVisible({timeout:25_000})})}
await chk(page,"MONACO","Open a.ts",async()=>{await page.locator('.tree-row[title="src/a.ts"]').last().click();await expect(page.locator(".monaco-editor")).toBeVisible({timeout:30_000})});
await chk(page,"MONACO","Open b.ts (2 tabs)",async()=>{await page.locator('.tree-row[title="src/b.ts"]').last().click();await expect(page.locator(".editor-tab")).toHaveCount(2,{timeout:15_000})});
await page.screenshot({path:path.join(DIR,"focus-two-tabs.png")});
await chk(page,"MONACO","Switch tabs",async()=>{await page.locator(".editor-tab",{hasText:"a.ts"}).click();await expect(page.locator(".editor-tab.active",{hasText:"a.ts"})).toBeVisible({timeout:8_000});await page.locator(".editor-tab",{hasText:"b.ts"}).click();await expect(page.locator(".editor-tab.active",{hasText:"b.ts"})).toBeVisible({timeout:8_000})});
await chk(page,"MONACO","Find widget",async()=>{await page.getByRole("button",{name:"Find in file"}).click();await expect(page.locator(".find-widget")).toBeVisible({timeout:10_000});await page.keyboard.press("Escape")});
await chk(page,"MONACO","Replace widget",async()=>{await page.getByRole("button",{name:"Find and replace"}).click();await expect(page.locator(".find-widget .replace-part")).toBeVisible({timeout:8_000});await page.keyboard.press("Escape")});
await chk(page,"MONACO","Go to line",async()=>{await page.getByRole("button",{name:"Go to line"}).click();await expect(page.locator(".quick-input-widget")).toBeVisible({timeout:10_000});await page.keyboard.press("Escape")});
await chk(page,"MONACO","Close b.ts tab",async()=>{await page.locator(".editor-tab",{hasText:"b.ts"}).locator(".editor-tab-close").click();await expect(page.locator(".editor-tab")).toHaveCount(1,{timeout:10_000})});
await chk(page,"MONACO","Edit+dirty+save",async()=>{await page.locator(".monaco-editor").click();await page.keyboard.press("Control+a");await page.keyboard.type("const answer=42;\n");await expect(page.locator(".editor-statusbar",{hasText:"Unsaved changes"})).toBeVisible({timeout:8_000});await page.getByRole("button",{name:"Save file"}).click();await expect(page.locator(".editor-statusbar",{hasText:"Saved"})).toBeVisible({timeout:20_000})});
const widths=[320,375,390,414];
const mctx=await browser.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true});
const mp=await mctx.newPage();rd(mp);
await chk(mp,"MOBILE","authenticate",async()=>{await mp.goto(`${BASE}/login`,{waitUntil:"domcontentloaded"});await mp.getByLabel("Email Address").fill(EMAIL);await mp.getByLabel("Password").fill(PASSWORD);await mp.getByRole("button",{name:"Sign In"}).click();await expect(mp).toHaveURL(/\/app\/dashboard$/,{timeout:60_000})});
for(const w of widths){
  await mp.setViewportSize({width:w,height:800});
  await chk(mp,"MOBILE",`no overflow @${w}`,async()=>{await mp.goto(`${BASE}/app/workspace`,{waitUntil:"domcontentloaded"});await expect(mp.locator(".workspace-page").or(mp.getByText(/Workspace:/i)).first()).toBeVisible({timeout:30_000});const o=await mp.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);if(o>2)throw new Error(`overflow ${o}px`)});
  await chk(mp,"MOBILE",`Monaco @${w}`,async()=>{await mp.locator('.tree-row[title="src"]').first().click();await sleep(500);await mp.locator('.tree-row[title="src/a.ts"]').last().click();await expect(mp.locator(".monaco-editor")).toBeVisible({timeout:30_000})});
  await chk(mp,"MOBILE",`AI composer @${w}`,async()=>{await mp.locator("#ai-command-center").getByRole("tab",{name:"Assistant"}).click();await expect(mp.getByLabel("Message the AI assistant")).toBeVisible({timeout:15_000})});
  await chk(mp,"MOBILE",`terminal @${w}`,async()=>{await expect(mp.getByLabel("Terminal command")).toBeVisible({timeout:15_000})});
  await chk(mp,"MOBILE",`palette @${w}`,async()=>{await mp.keyboard.press("Control+k");await expect(mp.getByRole("dialog",{name:"Command palette"})).toBeVisible({timeout:10_000});await mp.keyboard.press("Escape")});
  await chk(mp,"MOBILE",`drawer @${w}`,async()=>{await mp.goto(`${BASE}/app/dashboard`,{waitUntil:"domcontentloaded"});await mp.getByRole("button",{name:"Open navigation"}).click({timeout:15_000});await expect(mp.getByRole("button",{name:"Close navigation"})).toBeVisible({timeout:10_000});await mp.getByRole("link",{name:/Projects/}).click();await expect(mp).toHaveURL(/\/app\/projects$/,{timeout:15_000})});
  await mp.screenshot({path:path.join(DIR,`focus-mobile-${w}.png`)});
}
await mctx.close();
const pass=rows.filter(r=>r.status==="PASS").length,fail=rows.filter(r=>r.status==="FAIL").length;
fs.writeFileSync(path.join(DIR,"focus-report.json"),JSON.stringify({generatedAt:new Date().toISOString(),summary:{pass,fail,total:rows.length},rows},null,2));
console.log(`\n[FOCUS] ===== ${pass} PASS / ${fail} FAIL (${rows.length}) =====`);
rows.filter(r=>r.status!=="PASS").forEach(r=>console.log(`[FOCUS] FAIL ${r.id} ${r.area} :: ${r.name}${r.detail?" :: "+r.detail:""}`));
});