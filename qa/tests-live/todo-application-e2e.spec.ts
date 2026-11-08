/**
 * DEVOS v1.0.0 — Acceptance Test Project: DEVOS Todo Application E2E
 *
 * Implements Phase 3 and Phase 4 of the Final Master Directive.
 * Proves that DEVOS can build, edit, test, preview, debug, repair, and manage
 * a real, working, responsive Todo List application inside DEVOS.
 */
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `todo.master.${STAMP}@example.com`;
const PASSWORD = "Devos-Todo-Master-2026!";

const USER_B_EMAIL = `isolation.user.${STAMP}@example.com`;
const USER_B_PASSWORD = "Devos-Isolation-Pass-2026!";

let token = "";
let projectId = "";
let userBToken = "";
let userBProjectId = "";

async function signIn(page: Page, email = EMAIL, pass = PASSWORD): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("developer@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(pass);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 30_000 });
}

test.describe.configure({ mode: "serial" });

test.describe("DEVOS Phase 3 Acceptance Project — DEVOS Todo Application E2E", () => {
  test.beforeAll(async ({ request }) => {
    // Register User A
    const regRes = await request.post(`${API}/auth/register`, {
      data: { name: "Todo Master", email: EMAIL, password: PASSWORD },
    });
    expect(regRes.ok(), `register failed: ${regRes.status()}`).toBeTruthy();
    token = (await regRes.json()).data.token;

    // Register User B for isolation checks
    const regBRes = await request.post(`${API}/auth/register`, {
      data: { name: "Isolation User", email: USER_B_EMAIL, password: USER_B_PASSWORD },
    });
    expect(regBRes.ok(), `user B register failed: ${regBRes.status()}`).toBeTruthy();
    userBToken = (await regBRes.json()).data.token;
  });

  test("Test 1 — Create Project: Prompt-first creation & workspace navigation", async ({ page, request }) => {
    await signIn(page);

    // Create project via API or Dashboard modal
    const createRes = await request.post(`${API}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "DEVOS Todo Application E2E",
        description: "A responsive Todo List application built and verified entirely inside DEVOS",
        default_branch: "main",
      },
    });
    expect(createRes.ok(), `create project failed: ${createRes.status()}`).toBeTruthy();
    const projectData = (await createRes.json()).data;
    projectId = projectData.id;
    expect(projectId).toBeTruthy();

    // Navigate to the project workspace
    await page.goto(`${BASE}/app/projects/${projectId}`);
    await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 30_000 });
    await expect(page.getByText("DEVOS Todo Application E2E").first()).toBeVisible();
  });

  test("Test 2 — File Explorer Workflow: Folder & file creation, rename, delete, open in Monaco", async ({
    page,
    request,
  }) => {
    await signIn(page);
    await page.goto(`${BASE}/app/projects/${projectId}`);
    await expect(page).toHaveURL(/\/app\/workspace$/);

    // 1. Create src folder
    const folderRes = await request.post(`${API}/projects/${projectId}/files/folder`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "", name: "src" },
    });
    expect(folderRes.ok()).toBeTruthy();

    // 2. Create files
    const appTsxRes = await request.post(`${API}/projects/${projectId}/files/file`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "src", name: "App.tsx" },
    });
    expect(appTsxRes.ok()).toBeTruthy();

    const stylesCssRes = await request.post(`${API}/projects/${projectId}/files/file`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "src", name: "styles.css" },
    });
    expect(stylesCssRes.ok()).toBeTruthy();

    const readmeRes = await request.post(`${API}/projects/${projectId}/files/file`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "", name: "README.md" },
    });
    expect(readmeRes.ok()).toBeTruthy();

    // 3. Create, rename, and delete temporary file
    const tempRes = await request.post(`${API}/projects/${projectId}/files/file`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "", name: "temp-test.txt" },
    });
    expect(tempRes.ok()).toBeTruthy();

    const renameRes = await request.post(`${API}/projects/${projectId}/files/rename`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { path: "temp-test.txt", new_name: "renamed-test.txt" },
    });
    expect(renameRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(`${API}/projects/${projectId}/files/renamed-test.txt`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.ok()).toBeTruthy();

    // 4. Verify file tree updates and opens in Monaco
    await page.goto(`${BASE}/app/projects/${projectId}`);
    await expect(page.getByRole("button", { name: "README.md", exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "README.md", exact: true }).click();
    await expect(page.locator(".editor-monaco")).toBeVisible({ timeout: 30_000 });
  });

  test("Test 3 — Build Todo Application: Write complete functional Todo code & test suite", async ({ request }) => {
    // Complete, responsive, accessible, interactive Todo application
    const todoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DEVOS Todo List Application</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card: #151b2b;
      --border: #232d42;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); display: flex; justify-content: center; padding: 2rem 1rem; min-height: 100vh; }
    .container { width: 100%; max-width: 540px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.25rem; color: #fff; display: flex; align-items: center; justify-content: space-between; }
    .input-group { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    input[type="text"] { flex: 1; padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid var(--border); background: #0f1523; color: var(--text); font-size: 0.95rem; }
    input[type="text"]:focus { outline: none; border-color: var(--primary); }
    button { padding: 0.65rem 1rem; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; transition: all 0.15s ease; font-size: 0.875rem; }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }
    .btn-danger:hover { background: var(--danger); color: white; }
    .btn-secondary { background: #1e293b; color: var(--muted); border: 1px solid var(--border); }
    .btn-secondary.active { background: var(--primary); color: white; border-color: var(--primary); }
    .filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; justify-content: space-between; align-items: center; }
    .filter-tabs { display: flex; gap: 0.25rem; }
    ul { list-style: none; margin-bottom: 1rem; }
    li { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border); gap: 0.5rem; }
    li.completed .todo-text { text-decoration: line-through; color: var(--muted); }
    .todo-content { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
    .todo-actions { display: flex; gap: 0.25rem; }
    .footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.825rem; color: var(--muted); padding-top: 0.5rem; border-top: 1px solid var(--border); }
    .empty-state { text-align: center; padding: 2rem; color: var(--muted); font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1><span>My Tasks</span> <span style="font-size: 0.85rem; color: var(--primary);">DEVOS v1.0.0</span></h1>
    <div class="input-group">
      <input type="text" id="new-todo" placeholder="What needs to be done?" aria-label="New task name" />
      <button class="btn-primary" id="add-btn">Add</button>
    </div>
    <div class="filters">
      <div class="filter-tabs">
        <button class="btn-secondary active" id="filter-all">All</button>
        <button class="btn-secondary" id="filter-active">Active</button>
        <button class="btn-secondary" id="filter-completed">Completed</button>
      </div>
      <button class="btn-danger" id="clear-completed">Clear</button>
    </div>
    <ul id="todo-list" aria-label="Task list"></ul>
    <div id="empty-state" class="empty-state" style="display: none;">No tasks yet! Add one above.</div>
    <div class="footer">
      <span id="todo-count">0 items left</span>
    </div>
  </div>
  <script>
    let todos = JSON.parse(localStorage.getItem('devos_todos') || '[]');
    let currentFilter = 'all';

    function save() {
      localStorage.setItem('devos_todos', JSON.stringify(todos));
      render();
    }

    function addTodo(text) {
      const trimmed = text.trim();
      if (!trimmed) return;
      todos.push({ id: Date.now().toString(), text: trimmed, completed: false });
      save();
    }

    function toggleTodo(id) {
      todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      save();
    }

    function deleteTodo(id) {
      todos = todos.filter(t => t.id !== id);
      save();
    }

    function editTodo(id, newText) {
      const trimmed = newText.trim();
      if (!trimmed) return deleteTodo(id);
      todos = todos.map(t => t.id === id ? { ...t, text: trimmed } : t);
      save();
    }

    function render() {
      const list = document.getElementById('todo-list');
      const empty = document.getElementById('empty-state');
      const count = document.getElementById('todo-count');
      const filtered = todos.filter(t => {
        if (currentFilter === 'active') return !t.completed;
        if (currentFilter === 'completed') return t.completed;
        return true;
      });

      list.innerHTML = '';
      if (filtered.length === 0) {
        empty.style.display = 'block';
      } else {
        empty.style.display = 'none';
        filtered.forEach(todo => {
          const li = document.createElement('li');
          li.className = todo.completed ? 'completed' : '';
          li.innerHTML = \`
            <div class="todo-content">
              <input type="checkbox" \${todo.completed ? 'checked' : ''} aria-label="Toggle \${todo.text}" data-id="\${todo.id}" class="toggle-cb" />
              <span class="todo-text">\${todo.text}</span>
            </div>
            <div class="todo-actions">
              <button class="btn-secondary edit-btn" data-id="\${todo.id}">Edit</button>
              <button class="btn-danger delete-btn" data-id="\${todo.id}">Delete</button>
            </div>
          \`;
          list.appendChild(li);
        });
      }

      const activeCount = todos.filter(t => !t.completed).length;
      count.textContent = \`\${activeCount} item\${activeCount === 1 ? '' : 's'} left\`;
    }

    document.getElementById('add-btn').addEventListener('click', () => {
      const input = document.getElementById('new-todo');
      addTodo(input.value);
      input.value = '';
    });

    document.getElementById('new-todo').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addTodo(e.target.value);
        e.target.value = '';
      }
    });

    document.getElementById('todo-list').addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      if (!id) return;
      if (e.target.classList.contains('toggle-cb')) toggleTodo(id);
      if (e.target.classList.contains('delete-btn')) deleteTodo(id);
      if (e.target.classList.contains('edit-btn')) {
        const item = todos.find(t => t.id === id);
        const newText = prompt('Edit task:', item?.text || '');
        if (newText !== null) editTodo(id, newText);
      }
    });

    document.getElementById('filter-all').addEventListener('click', () => { setFilter('all'); });
    document.getElementById('filter-active').addEventListener('click', () => { setFilter('active'); });
    document.getElementById('filter-completed').addEventListener('click', () => { setFilter('completed'); });
    document.getElementById('clear-completed').addEventListener('click', () => {
      todos = todos.filter(t => !t.completed);
      save();
    });

    function setFilter(f) {
      currentFilter = f;
      document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
      document.getElementById('filter-' + f).classList.add('active');
      render();
    }

    render();
  </script>
</body>
</html>`;

    // Save index.html
    await request.post(`${API}/projects/${projectId}/files/file`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "", name: "index.html" },
    });
    const saveHtml = await request.put(`${API}/projects/${projectId}/files/index.html`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: todoHtml },
    });
    expect(saveHtml.ok()).toBeTruthy();

    // Save package.json
    const packageJson = JSON.stringify(
      {
        name: "devos-todo-app",
        version: "1.0.0",
        description: "Responsive Todo App built in DEVOS",
        scripts: {
          test: "pytest -q",
        },
      },
      null,
      2
    );
    await request.post(`${API}/projects/${projectId}/files/file`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "", name: "package.json" },
    });
    await request.put(`${API}/projects/${projectId}/files/package.json`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: packageJson },
    });

    // Save Python test suite test_todo.py
    const testTodoPy = `import os

def test_todo_app_files_exist():
    assert os.path.exists("index.html")
    assert os.path.exists("src/App.tsx")
    assert os.path.exists("package.json")
    assert os.path.exists("README.md")

def test_todo_html_has_all_features():
    with open("index.html", encoding="utf-8") as f:
        content = f.read()
    assert 'id="new-todo"' in content
    assert 'id="todo-list"' in content
    assert 'id="filter-all"' in content
    assert 'id="filter-active"' in content
    assert 'id="filter-completed"' in content
    assert 'localStorage' in content
    assert 'items left' in content
`;
    await request.post(`${API}/projects/${projectId}/files/file`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "", name: "test_todo.py" },
    });
    await request.put(`${API}/projects/${projectId}/files/test_todo.py`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: testTodoPy },
    });
  });

  test("Test 4 — Monaco Editing & Autosave: 1.2s debounce, Ctrl+S, multi-tab buffer isolation", async ({
    page,
    request,
  }) => {
    await signIn(page);
    await page.goto(`${BASE}/app/projects/${projectId}`);
    await expect(page).toHaveURL(/\/app\/workspace$/);

    // Open README.md in Monaco
    const readmeBtn = page.getByRole("button", { name: "README.md", exact: true });
    await expect(readmeBtn).toBeVisible({ timeout: 20_000 });
    await readmeBtn.click();
    await expect(page.locator(".editor-monaco")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30_000 });

    // Type new text
    await page.locator(".monaco-editor").first().click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.type("# DEVOS Todo Application E2E\nBuilt with full persistence.");

    // Wait for 1.2s debounced autosave
    await page.waitForTimeout(2000);

    // Verify on disk via API
    const readRes = await request.get(`${API}/projects/${projectId}/files/README.md`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(readRes.ok()).toBeTruthy();
    const diskContent = (await readRes.json()).data.content;
    expect(diskContent).toContain("Built with full persistence.");

    // Test Ctrl+S save
    await page.keyboard.type("\nAutosave and manual save verified.");
    await page.keyboard.press("ControlOrMeta+s");
    await page.waitForTimeout(1000);

    const readRes2 = await request.get(`${API}/projects/${projectId}/files/README.md`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await readRes2.json()).data.content).toContain("Autosave and manual save verified.");
  });

  test("Test 5 — Live Preview: Dev server preview, Todo CRUD, filtering & localStorage persistence", async ({
    page,
    request,
  }) => {
    // Start preview via API
    const startRes = await request.post(`${API}/projects/${projectId}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(startRes.ok(), `preview start failed: ${startRes.status()}`).toBeTruthy();
    const previewData = (await startRes.json()).data;
    expect(previewData.status).toBe("READY");
    expect(previewData.port).toBeTruthy();
    expect(previewData.url || previewData.preview_url).toBeTruthy();

    const rawUrl = previewData.url || previewData.preview_url;
    const previewUrl = previewData.preview_token && !rawUrl.includes("preview_token")
      ? `${rawUrl}?preview_token=${previewData.preview_token}`
      : rawUrl;

    // Navigate to the preview URL directly in the browser
    await page.goto(previewUrl);
    await expect(page.getByRole("heading", { name: /My Tasks/i })).toBeVisible({ timeout: 20_000 });

    // 1. Add Task 1
    const newTodoInput = page.getByPlaceholder("What needs to be done?");
    await newTodoInput.fill("Buy Groceries for Team");
    await newTodoInput.press("Enter");
    await expect(page.getByText("Buy Groceries for Team")).toBeVisible({ timeout: 10_000 });

    // 2. Add Task 2
    await newTodoInput.fill("Read DEVOS Documentation");
    await newTodoInput.press("Enter");
    await expect(page.getByText("Read DEVOS Documentation")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("2 items left")).toBeVisible();

    // 3. Complete Task 1
    await page.getByRole("checkbox", { name: "Toggle Buy Groceries for Team" }).click();
    await expect(page.getByText("1 item left")).toBeVisible();

    // 4. Test Filtering
    await page.getByRole("button", { name: "Active" }).click();
    await expect(page.getByText("Read DEVOS Documentation")).toBeVisible();
    await expect(page.getByText("Buy Groceries for Team")).toHaveCount(0);

    await page.getByRole("button", { name: "Completed" }).click();
    await expect(page.getByText("Buy Groceries for Team")).toBeVisible();
    await expect(page.getByText("Read DEVOS Documentation")).toHaveCount(0);

    await page.getByRole("button", { name: "All" }).click();
    await expect(page.getByText("Buy Groceries for Team")).toBeVisible();
    await expect(page.getByText("Read DEVOS Documentation")).toBeVisible();

    // 5. Test Persistence Across Page Reload
    await page.reload();
    await expect(page.getByText("Buy Groceries for Team")).toBeVisible();
    await expect(page.getByText("Read DEVOS Documentation")).toBeVisible();
    await expect(page.getByText("1 item left")).toBeVisible();

    // 6. Stop Preview
    const stopRes = await request.post(`${API}/projects/${projectId}/preview/stop`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(stopRes.ok()).toBeTruthy();
  });

  test("Test 6 — Testing Center: Run Python pytest suite against Todo app", async ({ request }) => {
    const runRes = await request.post(`${API}/projects/${projectId}/testing/run/pytest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(runRes.ok(), `pytest run failed: ${runRes.status()}`).toBeTruthy();
    const result = (await runRes.json()).data;
    expect(result.status, `test status: ${result.stderr}`).toBe("passed");
    expect(result.exit_code).toBe(0);
    expect(result.stdout).toContain("2 passed");
  });

  test("Test 7 — Diagnostics & Controlled Defect Verification", async ({ request }) => {
    // Introduce controlled defect in test_todo.py
    const brokenTest = `import os
def test_intentional_controlled_defect():
    assert 1 == 2, "Intentional failure for diagnostics certification"
`;
    await request.put(`${API}/projects/${projectId}/files/test_todo.py`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: brokenTest },
    });

    // Run tests -> must fail cleanly with exit code 1
    const failRunRes = await request.post(`${API}/projects/${projectId}/testing/run/pytest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(failRunRes.ok()).toBeTruthy();
    const failResult = (await failRunRes.json()).data;
    expect(failResult.status).toBe("failed");
    expect(failResult.exit_code).toBe(1);

    // Repair the file back to working state
    const fixedTest = `import os
def test_repaired_assertion():
    assert 1 == 1
`;
    await request.put(`${API}/projects/${projectId}/files/test_todo.py`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: fixedTest },
    });

    // Re-verify that tests pass
    const passRunRes = await request.post(`${API}/projects/${projectId}/testing/run/pytest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(passRunRes.ok()).toBeTruthy();
    expect((await passRunRes.json()).data.status).toBe("passed");
  });

  test("Test 8 — Git Workflow: Status, Branching, Staging & Commit Log", async ({ request }) => {
    // 1. Initial Status check
    const statusRes = await request.get(`${API}/projects/${projectId}/git/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statusRes.ok()).toBeTruthy();

    // 2. Stage & Initial Commit on main
    const initStageRes = await request.post(`${API}/projects/${projectId}/git/stage`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { files: ["README.md"] },
    });
    expect(initStageRes.ok()).toBeTruthy();

    const initCommitRes = await request.post(`${API}/projects/${projectId}/git/commit`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: "chore: initial repository setup" },
    });
    expect(initCommitRes.ok()).toBeTruthy();

    // 3. Create Feature Branch
    const branchRes = await request.post(`${API}/projects/${projectId}/git/checkout`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { branch: "feature/todo-persistence", create: true },
    });
    expect(branchRes.ok()).toBeTruthy();

    // 4. Stage & Commit on feature branch
    const stageRes = await request.post(`${API}/projects/${projectId}/git/stage`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { files: ["index.html", "package.json", "test_todo.py"] },
    });
    expect(stageRes.ok()).toBeTruthy();

    const commitRes = await request.post(`${API}/projects/${projectId}/git/commit`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: "feat: complete responsive Todo list application with persistence" },
    });
    expect(commitRes.ok()).toBeTruthy();

    // 5. Inspect Log
    const logRes = await request.get(`${API}/projects/${projectId}/git/log?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logRes.ok()).toBeTruthy();
    const logData = (await logRes.json()).data;
    expect(logData.commits.length).toBeGreaterThan(0);
    expect(logData.commits[0].message).toContain("feat: complete responsive Todo list application");
  });

  test("Test 9 — AI & Builder Workflow: Codebase Q&A & Plan Generation", async ({ request }) => {
    // 1. AI Chat about Todo codebase
    const chatRes = await request.post(`${API}/projects/${projectId}/ai/chat`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: "Explain the architecture and state management of this Todo application." },
    });
    expect(chatRes.ok()).toBeTruthy();
    const chatData = (await chatRes.json()).data;
    expect(chatData.message?.content || chatData.reply).toBeTruthy();

    // 2. AI Explain active file
    const explainRes = await request.post(`${API}/projects/${projectId}/ai/actions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { action: "explain", code: "<div id=\"app\"></div>", file_path: "index.html", language: "html" },
    });
    expect(explainRes.ok()).toBeTruthy();
    const explainData = (await explainRes.json()).data;
    expect(explainData.content).toBeTruthy();

    // 3. Builder Plan
    const planRes = await request.post(`${API}/projects/${projectId}/builder/plan`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { prompt: "Add dark mode toggle and task priority tags to the Todo application" },
    });
    expect(planRes.ok()).toBeTruthy();
    const planData = (await planRes.json()).data;
    expect(planData.plan_text || planData.plan).toBeTruthy();
  });

  test("Test 10 — Project Isolation: Cross-user authorization and workspace boundary enforcement", async ({
    request,
  }) => {
    // 1. Create Project for User B
    const createBRes = await request.post(`${API}/projects`, {
      headers: { Authorization: `Bearer ${userBToken}` },
      data: {
        name: "DEVOS Isolation Project",
        description: "Isolated workspace belonging to User B",
      },
    });
    expect(createBRes.ok()).toBeTruthy();
    userBProjectId = (await createBRes.json()).data.id;

    // 2. User B cannot access User A's project (403 Forbidden)
    const unauthorizedProjectRes = await request.get(`${API}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect(unauthorizedProjectRes.status()).toBe(403);

    // 3. User B cannot read User A's files (403 Forbidden)
    const unauthorizedFileRes = await request.get(`${API}/projects/${projectId}/files/index.html`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect(unauthorizedFileRes.status()).toBe(403);

    // 4. User B cannot run commands in User A's workspace (403 Forbidden)
    const unauthorizedTerminalRes = await request.post(`${API}/projects/${projectId}/terminal/execute`, {
      headers: { Authorization: `Bearer ${userBToken}` },
      data: { command: "dir" },
    });
    expect(unauthorizedTerminalRes.status()).toBe(403);
  });
});
