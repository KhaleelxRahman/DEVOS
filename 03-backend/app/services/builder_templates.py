def planned_files() -> list[str]:
    return [
        "client/App.jsx", "client/api.js", "client/index.html", "client/package.json",
        "server/index.js", "server/routes/tasks.js", "server/db.js", "server/package.json",
        ".env.example", "README.md",
    ]


def generate_file_map() -> dict[str, str]:
    return {
        "client/package.json": CLIENT_PACKAGE_JSON,
        "client/index.html": CLIENT_INDEX_HTML,
        "client/api.js": CLIENT_API_JS,
        "client/App.jsx": CLIENT_APP_JSX,
        "server/package.json": SERVER_PACKAGE_JSON,
        "server/db.js": SERVER_DB_JS,
        "server/routes/tasks.js": SERVER_TASKS_JS,
        "server/index.js": SERVER_INDEX_JS,
        ".env.example": ENV_EXAMPLE,
        "README.md": README_MD,
    }


CLIENT_PACKAGE_JSON = '{\n  "name": "todo-client",\n  "private": true,\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": { "dev": "vite", "build": "vite build" },\n  "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0" },\n  "devDependencies": { "vite": "^5.0.0" }\n}\n'

CLIENT_INDEX_HTML = '<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Todo App</title></head>\n  <body><div id="root"></div>\n  <script type="module" src="/App.jsx"></script></body>\n</html>\n'

CLIENT_API_JS = 'export const API_BASE = "/api";\n\nexport async function listTasks() {\n  const res = await fetch(`${API_BASE}/tasks`);\n  if (!res.ok) throw new Error("Failed to list tasks");\n  return res.json();\n}\n\nexport async function createTask(title) {\n  const res = await fetch(`${API_BASE}/tasks`, {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ title }),\n  });\n  if (!res.ok) throw new Error("Failed to create task");\n  return res.json();\n}\n\nexport async function toggleTask(id, completed) {\n  const res = await fetch(`${API_BASE}/tasks/${id}`, {\n    method: "PATCH",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ completed }),\n  });\n  if (!res.ok) throw new Error("Failed to update task");\n  return res.json();\n}\n\nexport async function deleteTask(id) {\n  const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });\n  if (!res.ok) throw new Error("Failed to delete task");\n  return res.json();\n}\n'

CLIENT_APP_JSX = 'import { useEffect, useState } from "react";\nimport { listTasks, createTask, toggleTask, deleteTask } from "./api.js";\n\nexport default function App() {\n  const [tasks, setTasks] = useState([]);\n  const [title, setTitle] = useState("");\n  useEffect(() => { listTasks().then(setTasks).catch(console.error); }, []);\n  async function onCreate(e) {\n    e.preventDefault();\n    if (!title.trim()) return;\n    const created = await createTask(title.trim());\n    setTasks((t) => [...t, created]);\n    setTitle("");\n  }\n  return (\n    <main>\n      <h1>Todo App</h1>\n      <form onSubmit={onCreate}>\n        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task" />\n        <button type="submit">Add</button>\n      </form>\n      <ul>\n        {tasks.map((t) => (\n          <li key={t.id}>\n            <input type="checkbox" checked={!!t.completed} onChange={() => toggleTask(t.id, !t.completed).then((u) => setTasks((s) => s.map((x) => (x.id === u.id ? u : x))))} />\n            <span>{t.title}</span>\n            <button onClick={() => deleteTask(t.id).then(() => setTasks((s) => s.filter((x) => x.id !== t.id)))}>Delete</button>\n          </li>\n        ))}\n      </ul>\n    </main>\n  );\n}\n'

SERVER_PACKAGE_JSON = '{\n  "name": "todo-server",\n  "private": true,\n  "version": "1.0.0",\n  "type": "commonjs",\n  "scripts": { "start": "node index.js" },\n  "dependencies": { "express": "^4.18.2", "pg": "^8.11.0", "cors": "^2.8.5" }\n}\n'

SERVER_DB_JS = 'const { Pool } = require("pg");\n\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });\n\nasync function init() {\n  await pool.query(`CREATE TABLE IF NOT EXISTS tasks (\n    id SERIAL PRIMARY KEY,\n    title TEXT NOT NULL,\n    completed BOOLEAN NOT NULL DEFAULT FALSE,\n    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n  )`);\n}\n\nmodule.exports = { pool, init };\n'

SERVER_INDEX_JS = 'require("dotenv").config();\nconst express = require("express");\nconst cors = require("cors");\nconst { init } = require("./db.js");\nconst tasksRouter = require("./routes/tasks.js");\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\napp.use("/api/tasks", tasksRouter);\napp.get("/api/health", (req, res) => res.json({ status: "ok" }));\n\nconst port = process.env.PORT || 4000;\ninit().then(() => app.listen(port, () => console.log(`todo server on ${port}`)));\n\nmodule.exports = app;\n'

ENV_EXAMPLE = 'DATABASE_URL=postgresql://user:password@localhost:5432/todoapp\nPORT=4000\nNODE_ENV=development\n'

README_MD = '# Todo App (React + Express + PostgreSQL)\n\nSimple task manager: create, list, complete, delete tasks over a REST API persisted in PostgreSQL.\n\n## Prerequisites\n\n- Node.js 18+\n- PostgreSQL 14+ and a `DATABASE_URL`\n\n## Setup\n\n```bash\n# backend\ncd server && npm install\ncp ../.env.example .env  # set DATABASE_URL\nnpm start                # http://localhost:4000\n\n# frontend (new terminal)\ncd client && npm install && npm run dev\n```\n\n## API\n\n| Method | Route | Body | Response |\n|---|---|---|---|\n| GET | /api/tasks | - | `[{ id, title, completed }]` |\n| POST | /api/tasks | `{ "title": "Buy milk" }` | `201 { id, title, completed }` |\n| PATCH | /api/tasks/:id | `{ "completed": true }` | `{ id, title, completed }` |\n| DELETE | /api/tasks/:id | - | `{ deleted: true }` |\n\n## Notes\n\n- `server/db.js` auto-creates the `tasks` table on boot.\n- Keep secrets in `.env` (never commit); `.env.example` lists required vars.\n'
