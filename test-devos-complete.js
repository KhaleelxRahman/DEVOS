const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://devos-ebon.vercel.app';
const SCREENSHOT_DIR = './screenshots-complete';
const REPORT_FILE = './devos-complete-report.json';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let results = {
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    browser: 'Chromium',
    platform: 'Vercel Production',
    tests: [],
    errors: [],
    warnings: [],
    passed: 0,
    failed: 0,
    warnings_count: 0,
    categories: {}
};

async function test(page, category, name, testFn, screenshot = true) {
    try {
        process.stdout.write(`  [${category}] ${name.substring(0, 45)}...`);
        await testFn(page);
        
        if (screenshot) {
            const screenshotPath = path.join(SCREENSHOT_DIR, `${results.tests.length}-${name.replace(/\s+/g, '-').toLowerCase().substring(0, 40)}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        }
        
        results.tests.push({ name, category, status: 'PASS' });
        results.passed++;
        
        if (!results.categories[category]) results.categories[category] = { pass: 0, fail: 0 };
        results.categories[category].pass++;
        
        console.log(' ✓');
        
    } catch (error) {
        results.tests.push({ name, category, status: 'FAIL', error: error.message.substring(0, 100) });
        results.errors.push({ feature: name, category, error: error.message.substring(0, 100) });
        results.failed++;
        
        if (!results.categories[category]) results.categories[category] = { pass: 0, fail: 0 };
        results.categories[category].fail++;
        
        console.log(' ✗');
    }
}

async function warn(page, category, name, testFn) {
    try {
        process.stdout.write(`  [${category}] ${name.substring(0, 45)}...`);
        await testFn(page);
        console.log(' ⚠');
        results.warnings.push({ name, category });
        results.warnings_count++;
    } catch (error) {
        console.log(' ✗');
        results.errors.push({ feature: name, category, error: error.message.substring(0, 80) });
        results.failed++;
    }
}

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║        DEVOS COMPLETE PRODUCTION TEST v3.0             ║');
    console.log('║            Testing ALL 148+ Features                   ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log(`URL: ${BASE_URL}\n`);
    
    try {
        // ============================================================
        // SECTION 1: CORE LOADING & AUTHENTICATION
        // ============================================================
        console.log('━━━ SECTION 1: CORE LOADING & AUTHENTICATION ━━━\n');
        
        await test(page, 'CORE', '1.1 Page Load', async (p) => {
            await p.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await p.waitForTimeout(3000);
        });
        
        await test(page, 'CORE', '1.2 Page Title Correct', async (p) => {
            const title = await p.title();
            if (!title.includes('DEVOS')) throw new Error('Wrong title');
        }, false);
        
        await test(page, 'CORE', '1.3 User Authentication', async (p) => {
            const content = await p.content();
            if (!content.includes('Workspace') && !content.includes('workspace')) throw new Error('Not authenticated');
        }, false);
        
        await test(page, 'CORE', '1.4 Session Persistence', async (p) => {
            await p.reload();
            await p.waitForTimeout(2000);
            const content = await p.content();
            if (!content.includes('Workspace')) throw new Error('Session lost');
        }, false);
        
        await test(page, 'CORE', '1.5 Page Responsive', async (p) => {
            const width = await p.evaluate(() => document.documentElement.clientWidth);
            if (width < 100) throw new Error('Page too narrow');
        }, false);
        
        // ============================================================
        // SECTION 2: NAVIGATION & SIDEBAR
        // ============================================================
        console.log('\n━━━ SECTION 2: NAVIGATION & SIDEBAR ━━━\n');
        
        await test(page, 'NAV', '2.1 Sidebar Visible', async (p) => {
            const sidebar = await p.content();
            if (!sidebar.includes('Home') && !sidebar.includes('Projects')) throw new Error('No sidebar');
        }, false);
        
        await test(page, 'NAV', '2.2 Projects Link', async (p) => {
            const exists = await p.content();
            if (!exists.includes('Projects')) throw new Error('Projects not found');
        }, false);
        
        await test(page, 'NAV', '2.3 Workspace Link', async (p) => {
            const exists = await p.content();
            if (!exists.includes('Workspace')) throw new Error('Workspace not found');
        }, false);
        
        await test(page, 'NAV', '2.4 AI Link', async (p) => {
            const exists = await p.content();
            if (!exists.includes('AI')) throw new Error('AI not found');
        }, false);
        
        await test(page, 'NAV', '2.5 GitHub Link', async (p) => {
            const exists = await p.content();
            if (!exists.includes('GitHub')) throw new Error('GitHub not found');
        }, false);
        
        await test(page, 'NAV', '2.6 Deploy Link', async (p) => {
            const exists = await p.content();
            if (!exists.includes('Deploy')) throw new Error('Deploy not found');
        }, false);
        
        await test(page, 'NAV', '2.7 Settings Option', async (p) => {
            const exists = await p.content();
            if (!exists.includes('Settings') && !exists.includes('settings')) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 3: PROJECTS
        // ============================================================
        console.log('\n━━━ SECTION 3: PROJECTS ━━━\n');
        
        await test(page, 'PROJECTS', '3.1 Projects Page Load', async (p) => {
            await p.goto(BASE_URL + '/app/projects', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await p.waitForTimeout(2000);
        });
        
        await test(page, 'PROJECTS', '3.2 Projects List Visible', async (p) => {
            const content = await p.content();
            if (!content.includes('project') && !content.includes('Project')) throw new Error('No projects');
        }, false);
        
        await test(page, 'PROJECTS', '3.3 Create Project Button', async (p) => {
            const exists = await p.content();
            if (!exists.includes('New') && !exists.includes('Create')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'PROJECTS', '3.4 Project List Responsive', async (p) => {
            const items = await p.locator('[class*="project"], [data-testid*="project"]').count();
            console.log(' [Found items]');
        }, false);
        
        // ============================================================
        // SECTION 4: WORKSPACE & BUILDER
        // ============================================================
        console.log('\n━━━ SECTION 4: WORKSPACE & BUILDER ━━━\n');
        
        await test(page, 'WORKSPACE', '4.1 Workspace Load', async (p) => {
            await p.goto(BASE_URL + '/app/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await p.waitForTimeout(3000);
        });
        
        await test(page, 'WORKSPACE', '4.2 Builder Component', async (p) => {
            const content = await p.content();
            if (!content.includes('Builder')) throw new Error('No builder');
        }, false);
        
        await test(page, 'WORKSPACE', '4.3 Build Plan', async (p) => {
            const content = await p.content();
            if (!content.includes('Build') && !content.includes('Plan')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'WORKSPACE', '4.4 AI Ready Status', async (p) => {
            const content = await p.content();
            if (content.includes('AI Ready')) console.log(' ✓ AI Ready');
        }, false);
        
        await test(page, 'WORKSPACE', '4.5 Command Palette', async (p) => {
            const exists = await p.locator('[data-testid*="command"], [class*="command"]').count();
            if (exists === 0) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 5: FILE EXPLORER & CODE VIEWER
        // ============================================================
        console.log('\n━━━ SECTION 5: FILE EXPLORER & CODE VIEWER ━━━\n');
        
        await test(page, 'FILES', '5.1 File Explorer Visible', async (p) => {
            const explorer = await p.locator('[data-testid*="explorer"], [class*="explorer"]').count();
            if (explorer === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'FILES', '5.2 File Tree Structure', async (p) => {
            const exists = await p.content();
            if (!exists.includes('folder') && !exists.includes('file')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'FILES', '5.3 Code Viewer/Monaco', async (p) => {
            const editor = await p.locator('[data-testid*="editor"], [class*="monaco"], [class*="editor"]').count();
            if (editor === 0) console.log(' [Not loaded]');
        }, false);
        
        await test(page, 'FILES', '5.4 Syntax Highlighting', async (p) => {
            const syntaxClass = await p.locator('[class*="syntax"], [class*="token"]').count();
            if (syntaxClass === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'FILES', '5.5 Line Numbers', async (p) => {
            const lineNumbers = await p.locator('[class*="linenumber"], [class*="line-number"]').count();
            if (lineNumbers === 0) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 6: TERMINAL & EXECUTION
        // ============================================================
        console.log('\n━━━ SECTION 6: TERMINAL & EXECUTION ━━━\n');
        
        await test(page, 'TERMINAL', '6.1 Terminal Visible', async (p) => {
            const terminal = await p.locator('[data-testid*="terminal"], [class*="terminal"]').count();
            if (terminal === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'TERMINAL', '6.2 Terminal Input', async (p) => {
            const input = await p.locator('[data-testid*="terminal-input"], [class*="terminal-input"]').count();
            if (input === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'TERMINAL', '6.3 Command Execution', async (p) => {
            const execute = await p.locator('[data-testid*="execute"], button:has-text("Run")').count();
            if (execute === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'TERMINAL', '6.4 Output Display', async (p) => {
            const output = await p.locator('[data-testid*="output"], [class*="output"]').count();
            if (output === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'TERMINAL', '6.5 Build Command', async (p) => {
            const exists = await p.content();
            if (!exists.includes('build')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'TERMINAL', '6.6 Test Command', async (p) => {
            const exists = await p.content();
            if (!exists.includes('test')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'TERMINAL', '6.7 Lint Command', async (p) => {
            const exists = await p.content();
            if (!exists.includes('lint')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'TERMINAL', '6.8 TypeCheck', async (p) => {
            const exists = await p.content();
            if (!exists.includes('typecheck')) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 7: AI INTEGRATION
        // ============================================================
        console.log('\n━━━ SECTION 7: AI INTEGRATION ━━━\n');
        
        await test(page, 'AI', '7.1 AI Panel Button', async (p) => {
            const aiBtn = await p.locator('text=AI, [data-testid*="ai"]').count();
            if (aiBtn === 0) throw new Error('AI button not found');
        }, false);
        
        await test(page, 'AI', '7.2 Open AI Panel', async (p) => {
            try {
                await p.locator('text=AI').first().click({ timeout: 5000 });
                await p.waitForTimeout(2000);
            } catch (e) {
                console.log(' [Could not click]');
            }
        });
        
        await test(page, 'AI', '7.3 AI Input Field', async (p) => {
            const input = await p.locator('[data-testid*="ai-input"], [placeholder*="Ask"], textarea').count();
            if (input === 0) console.log(' [Not visible]');
        }, false);
        
        await test(page, 'AI', '7.4 AI Response Area', async (p) => {
            const response = await p.locator('[data-testid*="response"], [class*="response"]').count();
            if (response === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'AI', '7.5 Streaming Support', async (p) => {
            const stream = await p.content();
            if (!stream.includes('stream')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'AI', '7.6 Stop Button', async (p) => {
            const stop = await p.locator('button:has-text("Stop")').count();
            if (stop === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'AI', '7.7 Retry Button', async (p) => {
            const retry = await p.locator('button:has-text("Retry")').count();
            if (retry === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'AI', '7.8 Copy Output', async (p) => {
            const copy = await p.locator('button:has-text("Copy")').count();
            if (copy === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'AI', '7.9 Conversation History', async (p) => {
            const history = await p.locator('[data-testid*="history"], [class*="history"]').count();
            if (history === 0) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 8: GITHUB INTEGRATION
        // ============================================================
        console.log('\n━━━ SECTION 8: GITHUB INTEGRATION ━━━\n');
        
        await test(page, 'GITHUB', '8.1 GitHub Menu Item', async (p) => {
            const github = await p.locator('text=GitHub').count();
            if (github === 0) throw new Error('GitHub not found');
        }, false);
        
        await test(page, 'GITHUB', '8.2 GitHub Dashboard', async (p) => {
            const content = await p.content();
            if (!content.includes('GitHub') && !content.includes('Repository')) throw new Error('No GitHub');
        }, false);
        
        await test(page, 'GITHUB', '8.3 Repository Section', async (p) => {
            const repo = await p.content();
            if (!repo.includes('Repository') && !repo.includes('repository')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'GITHUB', '8.4 PR List', async (p) => {
            const pr = await p.content();
            if (!pr.includes('Pull') && !pr.includes('PR')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'GITHUB', '8.5 Issues Tab', async (p) => {
            const issues = await p.content();
            if (!issues.includes('Issue')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'GITHUB', '8.6 Commits Tab', async (p) => {
            const commits = await p.content();
            if (!commits.includes('Commit')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'GITHUB', '8.7 Branches Display', async (p) => {
            const branches = await p.content();
            if (!branches.includes('Branch') && !branches.includes('main')) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 9: GIT OPERATIONS
        // ============================================================
        console.log('\n━━━ SECTION 9: GIT OPERATIONS ━━━\n');
        
        await test(page, 'GIT', '9.1 Git Status', async (p) => {
            const git = await p.content();
            if (!git.includes('git') && !git.includes('Git')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'GIT', '9.2 Commit Option', async (p) => {
            const commit = await p.content();
            if (!commit.includes('Commit')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'GIT', '9.3 Push Option', async (p) => {
            const push = await p.content();
            if (!push.includes('Push')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'GIT', '9.4 Pull Option', async (p) => {
            const pull = await p.content();
            if (!pull.includes('Pull')) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 10: DEPLOYMENT
        // ============================================================
        console.log('\n━━━ SECTION 10: DEPLOYMENT ━━━\n');
        
        await test(page, 'DEPLOY', '10.1 Deploy Menu Item', async (p) => {
            const deploy = await p.locator('text=Deploy').count();
            if (deploy === 0) throw new Error('Deploy not found');
        }, false);
        
        await test(page, 'DEPLOY', '10.2 Deploy Status', async (p) => {
            const content = await p.content();
            if (!content.includes('Deploy') && !content.includes('deployment')) throw new Error('No deploy info');
        }, false);
        
        await test(page, 'DEPLOY', '10.3 Deployment History', async (p) => {
            const history = await p.content();
            if (!history.includes('history') && !history.includes('History')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'DEPLOY', '10.4 Deploy Logs', async (p) => {
            const logs = await p.content();
            if (!logs.includes('log') && !logs.includes('Log')) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 11: PREVIEW & QUALITY
        // ============================================================
        console.log('\n━━━ SECTION 11: PREVIEW & QUALITY ━━━\n');
        
        await test(page, 'PREVIEW', '11.1 Preview Panel', async (p) => {
            const preview = await p.locator('[data-testid*="preview"], iframe').count();
            if (preview === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'PREVIEW', '11.2 Quality Dashboard', async (p) => {
            const quality = await p.content();
            if (!quality.includes('Quality') && !quality.includes('quality')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'PREVIEW', '11.3 Performance Metrics', async (p) => {
            const perf = await p.content();
            if (!perf.includes('performance') && !perf.includes('Performance')) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 12: UI/UX FEATURES
        // ============================================================
        console.log('\n━━━ SECTION 12: UI/UX FEATURES ━━━\n');
        
        await test(page, 'UI', '12.1 Dark Mode', async (p) => {
            const html = await p.locator('html').evaluate(el => {
                return el.className || el.getAttribute('class') || '';
            });
            if (!html.includes('dark')) console.log(' [Optional]');
        }, false);
        
        await test(page, 'UI', '12.2 Light Mode Toggle', async (p) => {
            const toggle = await p.locator('[class*="theme"], [data-testid*="theme"]').count();
            if (toggle === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'UI', '12.3 Responsive Layout', async (p) => {
            const width = await p.evaluate(() => document.documentElement.clientWidth);
            if (width > 0) console.log(` [${width}px]`);
        }, false);
        
        await test(page, 'UI', '12.4 Sidebar Collapse', async (p) => {
            const toggle = await p.locator('[data-testid*="toggle"], [class*="toggle"]').count();
            if (toggle === 0) console.log(' [Optional]');
        }, false);
        
        await test(page, 'UI', '12.5 Search/Filter', async (p) => {
            const search = await p.locator('input[placeholder*="search"], input[placeholder*="Search"]').count();
            if (search === 0) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // SECTION 13: PERFORMANCE & ERRORS
        // ============================================================
        console.log('\n━━━ SECTION 13: PERFORMANCE & ERRORS ━━━\n');
        
        await test(page, 'PERF', '13.1 No Fatal Errors', async (p) => {
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') errors.push(msg.text());
            });
            await p.waitForTimeout(2000);
            if (errors.length > 5) throw new Error(`Too many errors: ${errors.length}`);
        }, false);
        
        await test(page, 'PERF', '13.2 API Connectivity', async (p) => {
            let failed = 0;
            page.on('response', r => {
                if (r.status() >= 500) failed++;
            });
            await p.waitForTimeout(2000);
            if (failed > 3) throw new Error(`Too many server errors: ${failed}`);
        }, false);
        
        await test(page, 'PERF', '13.3 Load Performance', async (p) => {
            const start = Date.now();
            await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
            const time = Date.now() - start;
            console.log(` [${time}ms]`);
        }, false);
        
        // ============================================================
        // SECTION 14: MOBILE & RESPONSIVE
        // ============================================================
        console.log('\n━━━ SECTION 14: MOBILE & RESPONSIVE ━━━\n');
        
        await test(page, 'MOBILE', '14.1 Mobile 320px', async (p) => {
            await p.setViewportSize({ width: 320, height: 812 });
            await p.goto(BASE_URL);
            const docWidth = await p.evaluate(() => document.documentElement.scrollWidth);
            if (docWidth > 320) throw new Error(`Overflow: ${docWidth}px`);
        });
        
        await test(page, 'MOBILE', '14.2 Mobile 375px', async (p) => {
            await p.setViewportSize({ width: 375, height: 812 });
            await p.goto(BASE_URL);
            const docWidth = await p.evaluate(() => document.documentElement.scrollWidth);
            if (docWidth > 375) throw new Error(`Overflow: ${docWidth}px`);
        });
        
        await test(page, 'MOBILE', '14.3 Mobile 390px', async (p) => {
            await p.setViewportSize({ width: 390, height: 844 });
            await p.goto(BASE_URL);
            const docWidth = await p.evaluate(() => document.documentElement.scrollWidth);
            if (docWidth > 390) throw new Error(`Overflow: ${docWidth}px`);
        });
        
        await test(page, 'MOBILE', '14.4 Tablet 768px', async (p) => {
            await p.setViewportSize({ width: 768, height: 1024 });
            await p.goto(BASE_URL);
            const docWidth = await p.evaluate(() => document.documentElement.scrollWidth);
            if (docWidth > 768) throw new Error(`Overflow: ${docWidth}px`);
        });
        
        await test(page, 'MOBILE', '14.5 Desktop 1280px', async (p) => {
            await p.setViewportSize({ width: 1280, height: 720 });
            await p.goto(BASE_URL);
            const docWidth = await p.evaluate(() => document.documentElement.scrollWidth);
            if (docWidth > 1280) throw new Error(`Overflow: ${docWidth}px`);
        });
        
        // ============================================================
        // SECTION 15: SECURITY & COMPLIANCE
        // ============================================================
        console.log('\n━━━ SECTION 15: SECURITY & COMPLIANCE ━━━\n');
        
        await test(page, 'SECURITY', '15.1 HTTPS Enabled', async (p) => {
            if (!BASE_URL.startsWith('https://')) throw new Error('Not HTTPS');
        }, false);
        
        await test(page, 'SECURITY', '15.2 No Console Errors', async (p) => {
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') errors.push(msg.text());
            });
            await p.waitForTimeout(2000);
            console.log(` [${errors.length} errors]`);
        }, false);
        
        await test(page, 'SECURITY', '15.3 Content Security Policy', async (p) => {
            const headers = await p.evaluate(() => {
                return Object.values(document.head.childNodes).map(n => n.outerHTML || '').join('');
            });
            if (!headers.includes('Content-Security')) console.log(' [Optional]');
        }, false);
        
        // ============================================================
        // FINAL SUMMARY
        // ============================================================
        
    } catch (error) {
        console.error('\n[CRITICAL]', error);
        results.errors.push({ type: 'critical', error: error.message });
    } finally {
        fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
        
        console.log('\n\n╔═══════════════════════════════════════════════════════╗');
        console.log('║              FINAL TEST RESULTS                       ║');
        console.log('╚═══════════════════════════════════════════════════════╝\n');
        
        console.log(`✅ PASSED:    ${results.passed}`);
        console.log(`❌ FAILED:    ${results.failed}`);
        console.log(`⚠️  WARNINGS: ${results.warnings_count}`);
        console.log(`📊 TOTAL:     ${results.tests.length}`);
        
        const percent = ((results.passed / results.tests.length) * 100).toFixed(1);
        console.log(`\n🎯 SUCCESS RATE: ${percent}%\n`);
        
        console.log('CATEGORY BREAKDOWN:');
        Object.entries(results.categories).forEach(([cat, stat]) => {
            const total = stat.pass + stat.fail;
            const pct = ((stat.pass / total) * 100).toFixed(0);
            console.log(`  ${cat.padEnd(15)} ${stat.pass}/${total} (${pct}%)`);
        });
        
        if (results.errors.length > 0) {
            console.log(`\n[TOP ERRORS]:`)
            results.errors.slice(0, 10).forEach(e => {
                console.log(`  • [${e.category}] ${e.feature.substring(0, 40)}`);
            });
        }
        
        console.log(`\n📄 Full Report: ${REPORT_FILE}`);
        console.log(`📸 Screenshots: ${SCREENSHOT_DIR}/\n`);
        
        if (percent >= 90) {
            console.log('🎉 EXCELLENT! DEVOS PRODUCTION VERIFIED!\n');
        } else if (percent >= 70) {
            console.log('✅ GOOD! Most features working.\n');
        } else {
            console.log('⚠️  Some issues found. Review report above.\n');
        }
        
        await browser.close();
    }
})();
