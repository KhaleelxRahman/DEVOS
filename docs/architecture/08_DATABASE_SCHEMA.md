08_DATABASE_SCHEMA.md —

DEVOS v1.0.0 — DATABASE SCHEMA

Document: 08_DATABASE_SCHEMA.md
Product: DEVOS v1.0.0
Version: 1.0
Status: Active Development


1. PURPOSE

This document defines the database architecture for DEVOS v1.0.0.

The database must store the minimum information required for:

• Users
• Projects
• GitHub connections
• AI conversations
• Project activity
• Future developer workflows

The schema must remain simple for the MVP while allowing future expansion.


2. DATABASE TECHNOLOGY

Preferred database:

PostgreSQL

Development may use:

• PostgreSQL
• Local development database

Production:

• Managed PostgreSQL recommended


3. DATABASE PRINCIPLES

The database must be:

• Relational
• Consistent
• Secure
• Normalized where appropriate
• Extensible
• Migration-based
• Indexed for common queries


4. CORE ENTITIES

MVP entities:

1. User
2. Project
3. Conversation
4. ConversationMessage
5. Activity
6. GitHubConnection

Future entities may include:

• Repository
• ProjectFile
• ProjectContext
• AIUsage
• Team
• Organization
• AgentTask


5. USER TABLE

Table:

users


Fields:

id

Type:

UUID

Primary Key:

YES


name

Type:

VARCHAR


email

Type:

VARCHAR

Constraints:

UNIQUE
NOT NULL


password_hash

Type:

TEXT

Nullable:

YES

Used when password authentication is implemented.

Never store plaintext passwords.


created_at

Type:

TIMESTAMP WITH TIME ZONE


updated_at

Type:

TIMESTAMP WITH TIME ZONE


6. USER INDEXES

Recommended:

UNIQUE INDEX on email

Index:

created_at


7. PROJECT TABLE

Table:

projects


Fields:

id

Type:

UUID

Primary Key:

YES


user_id

Type:

UUID

Foreign Key:

users.id


name

Type:

VARCHAR

Required:

YES


description

Type:

TEXT

Nullable:

YES


technologies

Type:

JSONB

Example:

[
  "React",
  "FastAPI",
  "PostgreSQL"
]


repository_url

Type:

TEXT

Nullable:

YES


repository_provider

Type:

VARCHAR

Example:

github


repository_id

Type:

VARCHAR

Nullable:

YES


default_branch

Type:

VARCHAR

Nullable:

YES


created_at

Type:

TIMESTAMP WITH TIME ZONE


updated_at

Type:

TIMESTAMP WITH TIME ZONE


8. PROJECT RELATIONSHIP

User:

1
↓
Many
Projects


A user can own multiple projects.

A project belongs to exactly one user in the MVP.


9. PROJECT OWNERSHIP

Every project query must verify:

authenticated_user.id
==
project.user_id


Never rely only on the project ID.


10. CONVERSATION TABLE

Table:

conversations


Fields:

id

Type:

UUID

Primary Key:

YES


project_id

Type:

UUID

Foreign Key:

projects.id


user_id

Type:

UUID

Foreign Key:

users.id


title

Type:

VARCHAR


created_at

Type:

TIMESTAMP WITH TIME ZONE


updated_at

Type:

TIMESTAMP WITH TIME ZONE


11. CONVERSATION RELATIONSHIP

Project:

1
↓
Many
Conversations


User:

1
↓
Many
Conversations


12. CONVERSATION MESSAGE TABLE

Table:

conversation_messages


Fields:

id

Type:

UUID

Primary Key:

YES


conversation_id

Type:

UUID

Foreign Key:

conversations.id


role

Type:

VARCHAR

Allowed values:

user
assistant
system


content

Type:

TEXT


created_at

Type:

TIMESTAMP WITH TIME ZONE


13. MESSAGE ORDER

Messages should be retrieved using:

created_at ASC


For large conversations, pagination may be introduced later.


14. ACTIVITY TABLE

Table:

activities


Fields:

id

Type:

UUID

Primary Key:

YES


user_id

Type:

UUID

Foreign Key:

users.id


project_id

Type:

UUID

Foreign Key:

projects.id

Nullable:

YES


activity_type

Type:

VARCHAR


metadata

Type:

JSONB


created_at

Type:

TIMESTAMP WITH TIME ZONE


15. ACTIVITY TYPES

Possible values:

project.created
project.updated
project.deleted

repository.connected
repository.disconnected

file.opened

terminal.executed

ai.requested

git.commit
git.push
git.pull


16. ACTIVITY METADATA

Metadata must contain only safe information.

Example:

{
  "filename": "src/App.tsx"
}


Never store:

• API keys
• Passwords
• Access tokens
• Private secrets


17. GITHUB CONNECTION TABLE

Table:

github_connections


Fields:

id

Type:

UUID

Primary Key:

YES


user_id

Type:

UUID

Foreign Key:

users.id


github_user_id

Type:

VARCHAR


github_username

Type:

VARCHAR


access_token

Type:

TEXT

Security:

Encrypted at rest where possible.


refresh_token

Type:

TEXT

Nullable:

YES


token_expires_at

Type:

TIMESTAMP WITH TIME ZONE

Nullable:

YES


created_at

Type:

TIMESTAMP WITH TIME ZONE


updated_at

Type:

TIMESTAMP WITH TIME ZONE


18. GITHUB TOKEN SECURITY

Tokens must:

• Never be returned to frontend
• Never be logged
• Never be committed
• Be encrypted/protected where supported
• Be deleted when integration is disconnected


19. OPTIONAL REPOSITORY TABLE

Future architecture may introduce:

repositories


Fields:

id
project_id
provider
external_id
name
full_name
url
default_branch
created_at
updated_at


20. WHY REPOSITORY CAN BE SEPARATE

A project may eventually connect to:

• GitHub
• GitLab
• Bitbucket
• Other providers

Keeping repository information separate makes multi-provider support easier.


21. PROJECT CONTEXT TABLE

Future entity:

project_context


Possible fields:

id
project_id
context_type
content
metadata
created_at
updated_at


22. CONTEXT TYPES

Possible:

project_description
technology
file_tree
important_file
git_status
dependency
documentation


23. AI USAGE TABLE

Future entity:

ai_usage


Possible fields:

id
user_id
project_id
provider
model
input_tokens
output_tokens
latency_ms
created_at


This allows future:

• Usage analytics
• Cost tracking
• Rate limiting
• Billing


24. AGENT TASK TABLE

Future entity:

agent_tasks


Possible fields:

id
project_id
user_id
task
status
result
created_at
updated_at


Possible statuses:

pending
running
completed
failed
cancelled


25. FUTURE TEAM MODEL

Do not implement for MVP.

Future:

organizations
organization_members
teams
team_projects


26. RELATIONSHIP OVERVIEW

USER
│
├── PROJECTS
│   │
│   ├── CONVERSATIONS
│   │   └── MESSAGES
│   │
│   ├── ACTIVITIES
│   │
│   └── REPOSITORY
│
├── GITHUB CONNECTION
│
└── FUTURE AI USAGE


27. FOREIGN KEY RULES

Use foreign keys wherever appropriate.

Examples:

projects.user_id
→ users.id

conversations.project_id
→ projects.id

conversations.user_id
→ users.id

conversation_messages.conversation_id
→ conversations.id

activities.project_id
→ projects.id

activities.user_id
→ users.id


28. DELETE BEHAVIOR

User deletion behavior must be explicitly defined.

Recommended MVP policy:

Deleting a project should delete its dependent:

• Conversations
• Messages
• Activities

Use controlled cascading relationships where appropriate.


29. SOFT DELETE

Soft deletion may be introduced later.

Example:

deleted_at


For MVP, hard deletion is acceptable where data dependencies are properly handled.


30. TIMESTAMPS

Use:

TIMESTAMP WITH TIME ZONE

Recommended fields:

created_at
updated_at


31. UUID POLICY

Use UUIDs for externally exposed primary identifiers.

Benefits:

• Less predictable
• Distributed-system friendly
• Better future scalability


32. DATABASE INDEXING

Recommended indexes:

users.email

projects.user_id

projects.updated_at

conversations.project_id

conversations.user_id

conversation_messages.conversation_id

activities.project_id

activities.user_id

activities.created_at

github_connections.user_id


33. COMPOSITE INDEXES

Where useful:

(project_id, created_at)

(user_id, created_at)


This improves activity and conversation retrieval.


34. UNIQUE CONSTRAINTS

Recommended:

users.email UNIQUE

github_connections.user_id UNIQUE

Project repository identifiers may require provider-specific uniqueness.


35. EMAIL NORMALIZATION

Emails should be normalized before storage.

Example:

Developer@Example.com

→

developer@example.com


36. DATABASE VALIDATION

Backend validation must occur before database writes.

Database constraints should provide an additional safety layer.


37. MIGRATIONS

Use database migrations.

Recommended:

Alembic for FastAPI/PostgreSQL.


38. MIGRATION RULE

Never manually modify production schema without a migration.

Every schema change must be reproducible.


39. SEED DATA

Development may include safe seed data.

Production must never contain test credentials or fake user passwords.


40. DATABASE TRANSACTIONS

Use transactions for operations involving multiple related records.

Example:

Create project
+
Create activity

Both should succeed or fail consistently.


41. CONCURRENCY

Important updates should avoid accidental overwrites.

Future versions may use:

• Optimistic locking
• Updated-at checks
• Version fields


42. DATABASE SECURITY

Database credentials must remain server-side.

Never expose:

DATABASE_URL
database passwords
database hosts where unnecessary


43. BACKUP

Production PostgreSQL should have:

• Automated backups
• Encryption
• Access controls
• Restore testing


44. PERFORMANCE

Avoid:

• N+1 queries
• Unnecessary full-table scans
• Loading huge conversation histories
• Loading unnecessary project metadata


45. PAGINATION

Use pagination for potentially large datasets.

Examples:

Projects
Activities
Conversations
Messages
Commits


46. DATA RETENTION

Future retention policies may apply to:

• AI conversations
• Activity logs
• AI usage records
• Audit information


47. PRIVACY

Only store information necessary for DEVOS v1.0.0 functionality.

Project source code should not be permanently duplicated in the database unless explicitly required.


48. FILE STORAGE

MVP project files should preferably remain in the authorized project workspace/storage layer.

Do not store entire repositories inside PostgreSQL.


49. AI CONTEXT STORAGE

Store conversation metadata and messages as required.

Do not automatically store every temporary context payload permanently.


50. DATABASE ERROR HANDLING

Do not expose raw database exceptions to users.

Convert internal failures into safe application errors.


51. DATABASE TESTING

Test:

✓ User creation
✓ Duplicate email
✓ Project creation
✓ Project ownership
✓ Project deletion
✓ Conversation creation
✓ Message persistence
✓ Activity creation
✓ GitHub connection
✓ Foreign key behavior


52. DATA INTEGRITY

The database must prevent:

• Orphan records
• Duplicate identities
• Invalid relationships
• Unauthorized ownership changes


53. MVP DATABASE PRIORITY

P0:

users
projects
conversations
conversation_messages
activities

P1:

github_connections

P2:

repositories
project_context
ai_usage
agent_tasks


54. FUTURE SCALABILITY

The schema should allow future:

• Teams
• Organizations
• Agents
• AI usage
• Billing
• Cloud environments
• Integrations


55. DATABASE DEFINITION OF DONE

✓ PostgreSQL configured
✓ Migrations configured
✓ Core tables created
✓ Foreign keys configured
✓ Indexes added
✓ Authentication data secure
✓ Project ownership enforced
✓ Conversation persistence works
✓ Activity persistence works
✓ GitHub credentials protected
✓ Tests pass


56. FINAL DATABASE PRINCIPLE

Keep the MVP database:

SIMPLE
→ NORMALIZED
→ SECURE
→ EXTENSIBLE
→ TESTABLE

Do not create database tables merely because future features may exist.

Only create future tables when they become necessary.


END OF 08_DATABASE_SCHEMA.mdt
