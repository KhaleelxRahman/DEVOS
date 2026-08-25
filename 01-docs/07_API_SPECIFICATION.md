DEVOS — API SPECIFICATION

Document: 07_API_SPECIFICATION.md
Product: DEVOS
Version: 1.0
Status: Active Development


1. PURPOSE

This document defines the API architecture and contracts for DEVOS.

The API must provide a clean, secure and predictable interface between:

Frontend
↓
API Layer
↓
Backend Services
↓
Database / Git / GitHub / AI / Terminal


2. API PRINCIPLES

The API must be:

• REST-oriented
• Consistent
• Validated
• Secure
• Versionable
• Predictable
• Documented
• Easy to test

Frontend components must not directly depend on backend implementation details.


3. BASE URL

Development:

http://localhost:8000

Production:

Use the configured production API domain.

API versioning should be supported.

Recommended:

/api/v1


4. RESPONSE FORMAT

Successful response:

{
  "success": true,
  "data": {}
}


Error response:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}


5. HTTP STATUS CODES

200
Successful request

201
Resource created

204
Successful request with no response body

400
Invalid request

401
Authentication required

403
Permission denied

404
Resource not found

409
Resource conflict

422
Validation error

429
Rate limit exceeded

500
Internal server error

503
Service unavailable


6. AUTHENTICATION

Protected APIs require authentication.

Authentication must be verified on the backend.

Example:

Authorization:
Bearer <token>


If cookie-based authentication is used, the API must enforce appropriate session and CSRF protections.


7. AUTHORIZATION

Authentication alone is insufficient.

For project resources:

User
↓
Authenticated
↓
Project ownership verified
↓
Operation allowed


8. AUTH ENDPOINTS

POST /api/v1/auth/register

Purpose:

Create a DEVOS account.

Request:

{
  "name": "Developer",
  "email": "developer@example.com",
  "password": "secure-password"
}


Response:

{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "name": "Developer",
      "email": "developer@example.com"
    }
  }
}


9. LOGIN

POST /api/v1/auth/login

Request:

{
  "email": "developer@example.com",
  "password": "secure-password"
}


Response:

{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "name": "Developer",
      "email": "developer@example.com"
    }
  }
}


10. LOGOUT

POST /api/v1/auth/logout

Purpose:

Terminate the current authenticated session.

Response:

{
  "success": true,
  "message": "Logged out successfully"
}


11. CURRENT USER

GET /api/v1/auth/me

Purpose:

Return authenticated user information.


12. USER PROFILE

GET /api/v1/users/me

Return:

• ID
• Name
• Email
• Created date


13. UPDATE PROFILE

PATCH /api/v1/users/me

Request:

{
  "name": "Updated Name"
}


14. PROJECT ENDPOINTS

POST /api/v1/projects

Create a project.

Request:

{
  "name": "DEVOS",
  "description": "AI developer workspace",
  "technologies": [
    "React",
    "FastAPI",
    "PostgreSQL"
  ]
}


15. LIST PROJECTS

GET /api/v1/projects

Return projects belonging to the authenticated user.

Example:

{
  "success": true,
  "data": {
    "projects": []
  }
}


16. GET PROJECT

GET /api/v1/projects/{project_id}

Return:

• Project metadata
• Repository information
• Technologies
• Created date
• Updated date


17. UPDATE PROJECT

PATCH /api/v1/projects/{project_id}

Request:

{
  "name": "Updated DEVOS",
  "description": "Updated description"
}


18. DELETE PROJECT

DELETE /api/v1/projects/{project_id}

Requirements:

• Authenticate user
• Verify ownership
• Delete or archive project according to implementation policy


19. ACTIVE PROJECT

GET /api/v1/projects/{project_id}/context

Purpose:

Return the basic project context required by the workspace and AI systems.


20. PROJECT ACTIVITY

GET /api/v1/projects/{project_id}/activity

Return recent project activity.

Optional query parameters:

?page=1
&limit=20


21. FILE ENDPOINTS

GET /api/v1/projects/{project_id}/files

Purpose:

Return project file tree.


22. FILE TREE RESPONSE

Example:

{
  "success": true,
  "data": {
    "files": [
      {
        "name": "src",
        "type": "directory",
        "children": []
      },
      {
        "name": "README.md",
        "type": "file"
      }
    ]
  }
}


23. GET FILE

GET /api/v1/projects/{project_id}/files/{file_path}

Purpose:

Return the contents of an authorized project file.


24. FILE SECURITY

The backend must:

• Normalize paths
• Prevent traversal
• Restrict access to project directory
• Block sensitive files where appropriate


25. FILE SEARCH

GET /api/v1/projects/{project_id}/files/search?q=component

Purpose:

Search project files.

The implementation must avoid scanning unnecessary data repeatedly.


26. GIT ENDPOINTS

GET /api/v1/projects/{project_id}/git/status

Return:

• Current branch
• Modified files
• Added files
• Deleted files
• Untracked files


27. GIT DIFF

GET /api/v1/projects/{project_id}/git/diff

Return the current project changes.


28. GIT COMMITS

GET /api/v1/projects/{project_id}/git/commits

Optional:

?page=1
&limit=20


29. GIT COMMIT

POST /api/v1/projects/{project_id}/git/commit

Request:

{
  "message": "feat: improve workspace"
}


30. GIT PUSH

POST /api/v1/projects/{project_id}/git/push

Purpose:

Push authorized local changes.

Must require authentication and project authorization.


31. GIT PULL

POST /api/v1/projects/{project_id}/git/pull

Purpose:

Pull authorized repository changes.

Conflicts must be handled safely.


32. GITHUB ENDPOINTS

POST /api/v1/github/connect

Purpose:

Start GitHub connection flow.


33. GITHUB CALLBACK

GET /api/v1/github/callback

Purpose:

Handle OAuth callback when OAuth is used.

Never expose tokens to the frontend unnecessarily.


34. GITHUB CONNECTION

GET /api/v1/github/connection

Return:

• Connected status
• Account information where appropriate


35. GITHUB DISCONNECT

DELETE /api/v1/github/connection

Purpose:

Disconnect GitHub integration.


36. GITHUB REPOSITORIES

GET /api/v1/github/repositories

Return repositories accessible to the authenticated user according to granted permissions.


37. CONNECT REPOSITORY

POST /api/v1/projects/{project_id}/github/repository

Request:

{
  "repository_id": "repository-id"
}


38. AI ENDPOINTS

POST /api/v1/projects/{project_id}/ai/chat

Purpose:

Send a project-aware AI request.


39. AI REQUEST

Example:

{
  "message": "Explain how authentication works in this project",
  "conversation_id": "conversation-id"
}


40. AI RESPONSE

Example:

{
  "success": true,
  "data": {
    "conversation_id": "conversation-id",
    "message": {
      "role": "assistant",
      "content": "..."
    }
  }
}


41. AI CONTEXT

Backend should construct context from:

• Project metadata
• File tree
• Relevant files
• Current file
• Technologies
• Git status
• Recent activity
• Conversation history


42. AI CONTEXT OPTIONS

The frontend may provide contextual hints such as:

{
  "current_file": "src/App.tsx"
}


The backend remains responsible for validating and selecting actual context.


43. AI CONVERSATIONS

GET /api/v1/projects/{project_id}/ai/conversations

Return conversation summaries.


44. GET CONVERSATION

GET /api/v1/projects/{project_id}/ai/conversations/{conversation_id}

Return conversation messages.


45. DELETE CONVERSATION

DELETE /api/v1/projects/{project_id}/ai/conversations/{conversation_id}


46. AI SECURITY

AI requests must:

• Authenticate user
• Verify project ownership
• Filter secrets
• Limit context
• Validate input
• Handle provider errors safely


47. TERMINAL ENDPOINTS

POST /api/v1/projects/{project_id}/terminal/execute

Purpose:

Execute an approved development command inside the authorized project environment.


48. TERMINAL REQUEST

Example:

{
  "command": "npm",
  "args": [
    "run",
    "build"
  ]
}


49. TERMINAL RESPONSE

Example:

{
  "success": true,
  "data": {
    "exit_code": 0,
    "stdout": "...",
    "stderr": ""
  }
}


50. TERMINAL SECURITY

Terminal requests must enforce:

• Authentication
• Project ownership
• Command validation
• Working-directory restrictions
• Timeouts
• Resource limits
• Output limits


51. TERMINAL HISTORY

GET /api/v1/projects/{project_id}/terminal/history

Return recent safe command metadata.

Do not store sensitive command arguments unnecessarily.


52. ACTIVITY ENDPOINTS

GET /api/v1/activity

Return authenticated user's recent activity.


53. PROJECT ACTIVITY

GET /api/v1/projects/{project_id}/activity

Return project-specific activity.


54. ACTIVITY TYPES

Possible values:

project.created
project.updated
project.deleted
repository.connected
repository.disconnected
ai.requested
terminal.executed
git.commit
git.push
git.pull
file.opened


55. HEALTH ENDPOINT

GET /health

Purpose:

Check backend availability.

Example:

{
  "success": true,
  "status": "online",
  "service": "DEVOS API"
}


56. API VALIDATION

Every endpoint must validate:

• Authentication
• Authorization
• Input
• Resource ownership
• Required fields
• Data types


57. PAGINATION

List endpoints should support pagination where necessary.

Recommended:

?page=1
&limit=20


58. SEARCH

Search endpoints should support:

?q=search-term

Search input must be validated and safely handled.


59. API RATE LIMITING

Rate limits should apply to:

• Login
• Registration
• AI requests
• Terminal requests
• GitHub requests


60. API IDEMPOTENCY

Where repeated requests could cause duplicate operations, consider idempotency.

Especially:

• Payments in future
• Repository operations
• Resource creation


61. API TIMEOUTS

Long-running services must use controlled timeouts.

Examples:

• AI requests
• Git operations
• Terminal commands


62. ERROR CODES

Use predictable application error codes.

Examples:

AUTH_REQUIRED
INVALID_CREDENTIALS
PROJECT_NOT_FOUND
PROJECT_ACCESS_DENIED
FILE_NOT_FOUND
FILE_ACCESS_DENIED
GIT_ERROR
GITHUB_ERROR
AI_ERROR
TERMINAL_BLOCKED
TERMINAL_TIMEOUT
VALIDATION_ERROR


63. ERROR RESPONSE RULE

Do not expose internal stack traces in production API responses.


64. API DOCUMENTATION

FastAPI should expose appropriate API documentation during development.

Recommended:

OpenAPI
Swagger UI
ReDoc


65. API VERSIONING

Current:

/api/v1

Future versions:

/api/v2

Avoid breaking existing API contracts without versioning.


66. SERVICE ARCHITECTURE

Recommended backend structure:

app/

  main.py

  api/
    auth.py
    users.py
    projects.py
    files.py
    git.py
    github.py
    ai.py
    terminal.py
    activity.py

  services/
    auth_service.py
    project_service.py
    file_service.py
    git_service.py
    github_service.py
    ai_service.py
    terminal_service.py

  models/

  schemas/

  core/

  database/


67. FRONTEND API LAYER

Frontend should use a centralized API client.

Example concept:

api/
  client
  auth
  projects
  files
  git
  github
  ai
  terminal


68. FRONTEND RULE

React components should NOT contain repeated raw fetch logic.

Prefer:

Component
↓
API Service
↓
Backend


69. API STATE HANDLING

Frontend should represent:

Loading
Success
Error
Empty


70. API RETRY

Retry only appropriate temporary failures.

Do NOT blindly retry:

• Authentication failures
• Validation failures
• Permission failures


71. API LOGGING

Backend may log:

• Request ID
• Endpoint
• Status code
• Duration
• Safe error information

Never log:

• Passwords
• Tokens
• API keys
• Private secrets


72. API TESTING

Every critical API should have automated tests.

Priority:

Authentication
Projects
Authorization
Files
AI
Git
Terminal


73. API ACCEPTANCE CRITERIA

API is acceptable when:

✓ Authentication works
✓ Protected endpoints are protected
✓ Project ownership is enforced
✓ Validation works
✓ Errors are consistent
✓ File access is restricted
✓ Terminal is restricted
✓ AI requests use project context
✓ Git endpoints work
✓ API documentation is available


74. MVP API PRIORITY

P0:

/auth
/projects
/projects/{id}
/projects/{id}/files
/projects/{id}/ai/chat
/health

P1:

/git
/github
/terminal
/activity

P2:

Advanced integrations


75. API DESIGN PRINCIPLE

APIs should be:

SIMPLE
→ SECURE
→ CONSISTENT
→ TESTABLE
→ EXTENSIBLE


76. FINAL API PRINCIPLE

DEVOS frontend should never need to know how the backend performs an operation.

The frontend asks:

"What do I need?"

The API handles:

"How do we safely provide it?"

The backend owns:

• Validation
• Authorization
• Business logic
• Security
• External integrations


END OF 07_API_SPECIFICATION.md