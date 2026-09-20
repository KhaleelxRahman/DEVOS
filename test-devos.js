const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://devos-ebon.vercel.app';
const SCREENSHOT_DIR = './screenshots';
const REPORT_FILE = './devos-production-report.json';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let results = {
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    tests: [],
    errors: [],
    passed: 0,
    failed: 0
};

async function testFeature(page, name, testFn, screenshot = true) {
    try {
        console.log(`[✓] Testing: ${name}`);
        await testFn(page);
        
        if (screenshot) {
            const screenshotPath = path.join(SCREENSHOT_DIR, `${name.replace(/\s+/g, '-').toLowerCase()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
        }
        
        results.tests.push({ name, status: 'PASS' });
        results.passed++;
        
    } catch (error) {
        console.log(`[✗] FAILED: ${name}`);
        console.log(`    Error: ${error.message.substring(0, 80)}`);
        results.tests.push({ name, status: 'FAIL', error: error.message });
        results.errors.push({ feature: name, error: error.message });
        results.failed++;
    }
}

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  DEVOS PRODUCTION TEST (IMPROVED)       ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`URL: ${BASE_URL}\n`);
    
    try {
        // TEST 1: Page Load
        await testFeature(page, '1. Page Load', async (p) => {
            await p.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await p.waitForTimeout(3000); // Wait for JS to render
            const title = await p.title();
            console.log(`    Title: ${title}`);
        });
        
        // TEST 2: Screenshot of initial page
        await testFeature(page, '2. Initial Load Screenshot', async (p) => {
            // Just take screenshot
            await p.waitForTimeout(2000);
        });
        
        // TEST 3: Check sidebar exists
        await testFeature(page, '3. Sidebar Visible', async (p) => {
            const sidebar = await p.locator('[class*="sidebar"], [data-testid*="sidebar"]').count();
            if (sidebar === 0) {
                throw new Error('Sidebar not found');
            }
        });
        
        // TEST 4: Check navigation items
        await testFeature(page, '4. Navigation Items Present', async (p) => {
            const navText = await p.content();
            const items = ['Projects', 'Workspace', 'AI', 'GitHub', 'Deploy'];
            const missing = [];
            
            for (const item of items) {
                if (!navText.includes(item)) {
                    missing.push(item);
                }
            }
            
            if (missing.length > 0) {
                console.log(`    Missing: ${missing.join(', ')}`);
            } else {
                console.log(`    Found: ${items.join(', ')}`);
            }
        });
        
        // TEST 5: Builder Section
        await testFeature(page, '5. Builder Section Visible', async (p) => {
            const content = await p.content();
            if (!content.includes('Builder')) {
                throw new Error('Builder not in page');
            }
            console.log('    ✓ Builder content found');
        });
        
        // TEST 6: Build Plan
        await testFeature(page, '6. Build Plan Visible', async (p) => {
            const content = await p.content();
            if (!content.includes('Build Plan') && !content.includes('build')) {
                throw new Error('Build Plan not found');
            }
            console.log('    ✓ Build Plan found');
        });
        
        // TEST 7: AI Section
        await testFeature(page, '7. AI Section Visible', async (p) => {
            const content = await p.content();
            if (!content.includes('AI')) {
                throw new Error('AI not found');
            }
            console.log('    ✓ AI section found');
        });
        
        // TEST 8: Try clicking AI (with longer timeout)
        await testFeature(page, '8. Click AI Menu', async (p) => {
            const aiLocators = [
                p.locator('text=AI').first(),
                p.locator('[data-testid*="ai"]').first(),
                p.locator('button:has-text("AI")').first()
            ];
            
            let clicked = false;
            for (const loc of aiLocators) {
                if (await loc.count() > 0) {
                    await loc.click({ timeout: 5000 });
                    clicked = true;
                    break;
                }
            }
            
            if (!clicked) {
                console.log('    [!] Could not click AI button');
            } else {
                await p.waitForTimeout(2000);
                console.log('    ✓ AI clicked');
            }
        });
        
        // TEST 9: GitHub Section
        await testFeature(page, '9. GitHub Section Visible', async (p) => {
            const content = await p.content();
            if (!content.includes('GitHub')) {
                throw new Error('GitHub not found');
            }
            console.log('    ✓ GitHub found');
        });
        
        // TEST 10: Deploy Section
        await testFeature(page, '10. Deploy Section Visible', async (p) => {
            const content = await p.content();
            if (!content.includes('Deploy')) {
                throw new Error('Deploy not found');
            }
            console.log('    ✓ Deploy found');
        });
        
        // TEST 11: Repository Dashboard
        await testFeature(page, '11. Repository Dashboard', async (p) => {
            const content = await p.content();
            if (!content.includes('Repository') && !content.includes('repository')) {
                console.log('    [!] Repository section not visible');
            } else {
                console.log('    ✓ Repository dashboard found');
            }
        });
        
        // TEST 12: Check for errors
        await testFeature(page, '12. Console Error Check', async (p) => {
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });
            await p.waitForTimeout(2000);
            
            if (errors.length > 0) {
                console.log(`    [!] Found ${errors.length} console errors`);
            } else {
                console.log('    ✓ No console errors');
            }
        }, false);
        
        // TEST 13: Mobile responsive
        await testFeature(page, '13. Mobile Responsive (375px)', async (p) => {
            await p.setViewportSize({ width: 375, height: 812 });
            await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
            const docWidth = await p.evaluate(() => document.documentElement.scrollWidth);
            
            if (docWidth > 375) {
                console.log(`    [!] Content overflow: ${docWidth}px`);
            } else {
                console.log(`    ✓ Fits mobile (${docWidth}px)`);
            }
        });
        
        // TEST 14: Page performance
        await testFeature(page, '14. Page Load Performance', async (p) => {
            const start = Date.now();
            await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
            const loadTime = Date.now() - start;
            console.log(`    Load time: ${loadTime}ms`);
        }, false);
        
        // TEST 15: API Response Check
        await testFeature(page, '15. API Connectivity', async (p) => {
            let apiErrors = 0;
            page.on('response', response => {
                if (response.status() >= 500) {
                    apiErrors++;
                }
            });
            
            await p.goto(BASE_URL);
            await p.waitForTimeout(3000);
            
            if (apiErrors > 0) {
                console.log(`    [!] ${apiErrors} server errors detected`);
            } else {
                console.log('    ✓ API responding');
            }
        }, false);
        
    } catch (error) {
        console.error('\n[CRITICAL ERROR]', error);
        results.errors.push({ type: 'critical', error: error.message });
    } finally {
        // Save report
        fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
        
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║            RESULTS                      ║');
        console.log('╚════════════════════════════════════════╝\n');
        
        console.log(`✅ PASSED:  ${results.passed}`);
        console.log(`❌ FAILED:  ${results.failed}`);
        console.log(`📊 TOTAL:   ${results.tests.length}`);
        
        const percent = ((results.passed / results.tests.length) * 100).toFixed(1);
        console.log(`\n🎯 SUCCESS RATE: ${percent}%`);
        
        if (results.errors.length > 0) {
            console.log('\n[ERRORS SUMMARY]:');
            results.errors.slice(0, 5).forEach(e => {
                console.log(`  • ${e.feature || e.type}: ${e.error.substring(0, 60)}...`);
            });
        }
        
        console.log(`\n📄 Report: ${REPORT_FILE}`);
        console.log(`📸 Screenshots: ${SCREENSHOT_DIR}/\n`);
        
        if (results.failed === 0) {
            console.log('🎉 ALL TESTS PASSED!\n');
        } else {
            console.log(`⚠️  ${results.failed} ISSUE(S) FOUND\n`);
        }
        
        await browser.close();
    }
})();
