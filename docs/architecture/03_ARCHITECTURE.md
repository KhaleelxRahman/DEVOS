03_ARCHITECTURE.md
DEVOS v1.0.0 — SYSTEM ARCHITECTURE
Document: 03_ARCHITECTURE.md
Version: 1.0
Status: Active Development

1. ARCHITECTURE PURPOSE

This document defines the technical architecture of DEVOS v1.0.0.

It covers:
• Frontend
• Backend
• Database
• Authentication
• AI
• Project Context Engine
• Files
• Terminal
• Git/GitHub
• APIs
• Security
• Deployment
• Scalability

1. ARCHITECTURE PRINCIPLES

• Project-Centric Architecture
• Separation of Concerns
• API-First Communication
• Service-Oriented Backend
• Security by Design
• Extensibility
• Simplicity First

Core model:

User
↓
Project
↓
Workspace
↓
Files + Git + Terminal + AI

1. HIGH-LEVEL ARCHITECTURE

DEVOS v1.0.0 UI
↓
API Layer
↓
FastAPI Backend
↓
Services
├── AuthService
├── ProjectService
├── FileService
├── GitService
├── GitHubService
├── TerminalService
├── AIService
├── ContextService
└── ActivityService
↓
Database / Filesystem / External APIs

1. TECHNOLOGY STACK

Frontend:
• React
• TypeScript
• React Router
• Modern CSS
• Component architecture
• API service layer

Backend:
• Python
• FastAPI
• Pydantic
• REST API

Database:
• PostgreSQL

External Services:
• GitHub
• AI Provider
• Project Filesystem

1. REPOSITORY STRUCTURE

DEVOS/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── state/
│   │   ├── utils/
│   │   ├── types/
│   │   └── styles/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   └── main.py
│   └── requirements.txt
│
├── docs/
│   ├── 01_PRD.md
│   ├── 02_REQUIREMENTS.md
│   ├── 03_ARCHITECTURE.md
│   ├── 04_UI_UX.md
│   ├── 05_API_SPEC.md
│   └── 06_DEVELOPMENT_PLAN.md
│
├── tests/
├── .env.example
├── .gitignore
└── README.md

1. FRONTEND ARCHITECTURE

Pages
↓
Components
↓
Hooks / State
↓
API Services
↓
Backend

Main pages:

• Login
• Register
• Dashboard
• Projects
• Workspace
• Settings
• Account

1. FRONTEND COMPONENTS

Reusable components:

• Buttons
• Inputs
• Modals
• Panels
• Navigation
• Project Cards
• File Tree
• Code Viewer
• Terminal
• AI Chat
• Git Status
• Loading States
• Error States
• Empty States

1. FRONTEND STATE

Authentication:
• Current User
• Session
• Authentication Status

Project:
• Projects
• Active Project
• Project Metadata

Workspace:
• Selected File
• Open Files
• Active Panel

AI:
• Conversation
• Messages
• Loading
• Error

Git:
• Branch
• Status
• Changed Files

1. API CLIENT

Frontend
↓
API Client
├── Auth Service
├── Project Service
├── File Service
├── Git Service
├── AI Service
└── Terminal Service
↓
FastAPI

 1. BACKEND ARCHITECTURE

API Routes
↓
Validation
↓
Authentication
↓
Authorization
↓
Services
↓
Database / Filesystem / External APIs

 1. BACKEND SERVICES

AuthService:
• Registration
• Login
• Authentication
• Sessions
• User identity

ProjectService:
• Create project
• Get project
• Update project
• Delete project
• Ownership

FileService:
• File tree
• File retrieval
• File metadata
• Safe file access

GitService:
• Git status
• Branch
• Changed files
• Diff
• Commit

GitHubService:
• Repository information
• Repository connection
• GitHub API

TerminalService:
• Command validation
• Working directory
• Execution
• Output
• Status

AIService:
• AI provider
• Prompt construction
• Context integration
• AI response
• Error handling

ContextService:
• Collect project context
• Select relevant context
• Filter secrets
• Build AI context

ActivityService:
• Record activity
• Retrieve activity

 1. DATABASE ARCHITECTURE

User
│
└── Project
      ├── Conversation
      └── Activity

User can own multiple projects.

Project can contain multiple conversations and activities.

 1. USER ENTITY

• id
• name
• email
• password_hash / auth_provider
• created_at
• updated_at

Passwords must NEVER be stored in plaintext.

 1. PROJECT ENTITY

• id
• user_id
• name
• description
• repository_url
• repository_provider
• technology_metadata
• created_at
• updated_at

 1. CONVERSATION ENTITY

• id
• project_id
• user_id
• title
• created_at
• updated_at

 1. ACTIVITY ENTITY

• id
• project_id
• user_id
• activity_type
• metadata
• created_at

 1. FILESYSTEM ARCHITECTURE

Workspace
↓
FileService
↓
Filesystem / Repository

The frontend must NOT directly access the server filesystem.

 1. FILE SECURITY

File access must be restricted to the authorized project.

Prevent:
• Path traversal
• Unauthorized file access
• Access outside project directories
• ../
• ../../
• Absolute system paths

 1. TERMINAL ARCHITECTURE

User Command
↓
Terminal API
↓
Authentication
↓
Authorization
↓
Command Validation
↓
Project Working Directory / Sandbox
↓
Command Execution
↓
Output
↓
Frontend Terminal

The terminal must NEVER become an unrestricted remote shell.

 1. TERMINAL SECURITY

Use:

• Command restrictions
• Restricted working directory
• Timeouts
• Process limits where practical
• Clear execution status

Sensitive system operations must not be exposed.

 1. GIT ARCHITECTURE

Frontend
↓
Git API
↓
Authentication
↓
Project Authorization
↓
GitService
↓
Project Repository

Frontend must never execute raw Git commands directly.

 1. GITHUB ARCHITECTURE

Frontend
↓
Backend
↓
GitHubService
↓
GitHub API

Credentials must be securely handled.

 1. AI ARCHITECTURE

User
↓
AI UI
↓
AI API
↓
AIService
↓
ContextService
↓
Context Selection
↓
Prompt Construction
↓
AI Provider
↓
Response
↓
AI UI

 1. AI PROVIDER ABSTRACTION

AIService
↓
AI Provider Interface
├── Provider A
├── Provider B
└── Future Providers

DEVOS v1.0.0 must not be tightly coupled to one AI provider.

 1. AI CONTEXT ARCHITECTURE

Project Metadata
+
File Tree
+
Relevant Files
+
Current File
+
Git State
+
Recent Activity
+
Conversation Context
↓
Context Builder
↓
AI Request

 1. CONTEXT PRIORITY

Priority order:

1. Current file
2. User-mentioned files
3. Relevant neighboring files
4. Project metadata
5. Relevant Git information
6. Recent relevant activity

Never send the entire repository blindly to the AI.

 1. SECRET FILTERING

Before AI context is created, filter:

• .env
• .env.*
• Credentials
• Secrets
• Private keys
• API tokens
• Passwords
• Access tokens

Never expose secrets unnecessarily.

 1. FUTURE CONTEXT ENGINE

Current Context Engine
↓
Code Indexer
↓
Embeddings
↓
Vector Store
↓
Semantic Retrieval
↓
Long-Term Project Memory
↓
AI Agents

These are NOT required for MVP.

 1. AUTHENTICATION FLOW

User
↓
Login
↓
Frontend
↓
Auth API
↓
Credential Verification
↓
Session / Token
↓
Authenticated Application

 1. AUTHORIZATION FLOW

Request
↓
Authenticate User
↓
Identify Project
↓
Verify Ownership / Permission
↓
Execute Operation

Authentication alone is NOT sufficient.

 1. GENERAL REQUEST FLOW

User Action
↓
React Component
↓
API Service
↓
HTTP Request
↓
FastAPI Route
↓
Validation
↓
Authentication
↓
Authorization
↓
Service
↓
Database / Filesystem / External API
↓
Response
↓
Frontend State
↓
UI Update

 1. ERROR ARCHITECTURE

Frontend:
• User-friendly errors

API:
• Consistent error responses

Backend:
• Diagnostic logging

External Services:
• Timeouts
• Provider failure handling
• Retry where appropriate

 1. LOGGING

Log important events:

• Authentication failures
• API errors
• Git failures
• Terminal failures
• AI failures
• External API failures

Never log:

• Passwords
• API keys
• Authentication tokens
• Private secrets

 1. CONFIGURATION

Use environment variables.

Examples:

DATABASE_URL
AUTH_SECRET
AI_PROVIDER_KEY
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET

Never commit real secrets.

 1. ENVIRONMENTS

Support:

• Development
• Testing
• Production

Environment-specific configuration must not be hardcoded.

 1. DEPLOYMENT ARCHITECTURE

Internet
↓
Frontend
↓
HTTPS
↓
FastAPI Backend
├── PostgreSQL
├── AI Provider
└── GitHub API

 1. DEVELOPMENT ENVIRONMENT

Local environment should support:

• Frontend
• Backend
• Database
• Project Workspace

Services should be independently runnable.

 1. TESTING ARCHITECTURE

Unit Tests:
• Services
• Utilities

API Tests:
• Backend endpoints

Integration Tests:
• Frontend/backend interactions

E2E Tests:

Register
→ Login
→ Create Project
→ Open Workspace
→ Browse Files
→ Ask AI
→ View Git

 1. SECURITY BOUNDARIES

Browser
│
│ Untrusted
↓
API
│
│ Authenticated + Authorized
↓
Services
├── Database
├── Filesystem
├── Git
├── GitHub
└── AI Provider

No untrusted frontend operation should directly access protected infrastructure.

 1. DATA OWNERSHIP

Every project must belong to an authorized user.

Example:

User A
├── Project A
└── Project B

User B
└── Project C

User A must NOT access Project C.

 1. SCALABILITY STRATEGY

Keep MVP simple.

Future scalability may introduce:

• Background workers
• Job queues
• Caching
• WebSockets
• Object storage
• Repository indexing
• Vector databases
• Distributed services

Do not introduce these prematurely.

 1. REAL-TIME ARCHITECTURE

Future real-time features may include:

• Terminal streaming
• AI streaming
• Collaboration
• Live activity

MVP may use standard HTTP APIs where real-time communication is unnecessary.

 1. WEBSOCKET FUTURE

Frontend
↕
WebSocket
↕
Realtime Service
↕
Terminal / AI / Collaboration

Introduce only when required.

 1. DEPENDENCY MANAGEMENT

Dependencies must be:

• Necessary
• Maintained
• Version controlled
• Documented when important

Do not install packages simply because they are popular.

Every major dependency must have a clear purpose.

 1. ARCHITECTURE DECISION RULES

Before adding a major technology:

1. Identify the problem.
2. Check whether the existing stack can solve it.
3. Evaluate complexity.
4. Evaluate security.
5. Evaluate maintenance cost.
6. Add it only when justified.

7. ANTI-PATTERNS

Avoid:

• Giant backend files
• Giant React components
• Direct API calls everywhere
• Business logic inside UI
• Hardcoded secrets
• Unrestricted terminal
• Fake backend functionality
• Premature microservices
• Unnecessary dependencies

 1. ARCHITECTURE EVOLUTION

MVP:

React
+
FastAPI
+
PostgreSQL
+
Filesystem
+
Git
+
AI Service

Phase 2:

• Code indexing
• Semantic search
• Improved context

Phase 3:

• AI agents
• Task execution
• Automated code review

Phase 4:

• Collaboration
• Cloud workspaces
• Platform services

 1. ARCHITECTURE DEFINITION OF DONE

Architecture is sufficiently implemented when:

✓ Frontend/backend boundaries are clear.
✓ Authentication is separated from business logic.
✓ Projects have persistent storage.
✓ Project ownership is enforced.
✓ File access is project-scoped.
✓ Terminal access is controlled.
✓ Git operations use GitService.
✓ AI communication uses AIService.
✓ Project context uses ContextService.
✓ Secrets are protected.
✓ API errors are handled consistently.
✓ The system can be extended without major restructuring.

 1. FINAL ARCHITECTURE PRINCIPLE

DEVOS v1.0.0 must NOT be architected as a collection of unrelated tools.

The architecture revolves around:

PROJECT
│
├── FILES
├── GIT
├── TERMINAL
│
└── CONTEXT ENGINE
        ↓
    AI ASSISTANT
        ↓
DEVELOPMENT WORKFLOW

The PROJECT is the central source of context.

The AI is the intelligence layer.

The WORKSPACE is the interaction layer.

The BACKEND is the control and security layer.

The DATABASE is the persistence layer.

 1. FINAL STATEMENT

DEVOS v1.0.0 architecture must remain:

PROJECT-CENTRIC
API-FIRST
SECURE
MODULAR
EXTENSIBLE
SIMPLE
RELIABLE

The goal is not to build every developer tool.

The goal is to build one intelligent developer command center that helps developers move from:

CREATE
→ CONNECT
→ CONTEXTUALIZE
→ BUILD
→ APPROVE
→ CONTINUE

END OF 03_ARCHITECTURE.md
