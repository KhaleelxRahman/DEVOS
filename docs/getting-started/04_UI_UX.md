DEVOS v1.0.0 — UI/UX SPECIFICATION

Document: 04_UI_UX.md
Product: DEVOS v1.0.0
Version: 1.0
Status: Active Development

1. UI/UX PURPOSE

This document defines the visual language, interaction model, layout system, component system, responsive behavior, accessibility requirements, and UX standards for DEVOS v1.0.0.

DEVOS v1.0.0 must feel like a professional developer SaaS platform.

It must NOT feel like:
• Generic admin dashboard
• Collection of unrelated screens
• Template
• Prototype with fake interactions
• Collection of oversized cards

DEVOS v1.0.0 should feel like one unified developer command center.

1. CORE UX PRINCIPLE

The PROJECT is the center of the DEVOS v1.0.0 experience.

The user should always understand:

• Which project is active
• What they are working on
• What files are open
• Git state
• What AI understands
• Terminal activity
• Recent changes

Core experience:

CREATE → CONNECT → CONTEXTUALIZE → BUILD → APPROVE → CONTINUE

1. DESIGN PERSONALITY

DEVOS v1.0.0 should communicate:

• Professional
• Technical
• Intelligent
• Focused
• Fast
• Reliable
• Modern
• Minimal
• Developer-oriented

Visual personality:

"Premium developer infrastructure SaaS"

Avoid making DEVOS v1.0.0 look like:
• Gaming interface
• Flashy AI landing page
• Cryptocurrency dashboard
• Generic startup template
• Social media application

1. DESIGN PRINCIPLES

• Clarity
• Information density
• Consistency
• Strong hierarchy
• Project context
• Immediate feedback
• Efficiency
• Trust

Every screen must have a clear purpose.

1. VISUAL DIRECTION

DEVOS v1.0.0 should use a dark-first developer workspace.

Use:

• Dark neutral surfaces
• Subtle borders
• Clear text hierarchy
• Controlled accent color
• Minimal shadows
• Small-radius components
• Compact controls
• Monospace typography where appropriate

Avoid:

• Excessive gradients
• Neon colors
• Excessive glow
• Excessive glassmorphism
• Huge cards
• Decorative clutter

1. COLOR SYSTEM

Use centralized design tokens.

Tokens:

--color-background
--color-surface
--color-surface-elevated
--color-surface-hover
--color-border
--color-border-strong

--color-text-primary
--color-text-secondary
--color-text-muted
--color-text-disabled

--color-accent
--color-accent-hover

--color-success
--color-warning
--color-error
--color-info

Do not hardcode random colors inside components.

1. COLOR USAGE

Background:
Main application surface.

Surface:
Panels, sidebar, cards.

Border:
Panel separation.

Accent:
Primary actions and active states.

Success:
Successful operations.

Warning:
Warnings and pending states.

Error:
Failures and validation errors.

Info:
Informational messages.

Never communicate important status using color alone.

1. TYPOGRAPHY

Use modern sans-serif typography for UI.

Use monospace for:

• Code
• Terminal
• Git hashes
• File paths
• Commands

Hierarchy:

Display
→ Page Title
→ Section Title
→ Component Title
→ Body
→ Secondary Text
→ Caption
→ Code
→ Terminal

Avoid huge headings inside the workspace.

1. SPACING

Use a consistent spacing scale.

Base unit: 4px

Recommended:

4px
8px
12px
16px
20px
24px
32px
40px
48px
64px

Avoid arbitrary spacing.

 1. BORDER RADIUS

Use restrained radius.

Small controls:
6px

Inputs:
6–8px

Panels:
8–10px

Cards:
10–12px

Large containers:
12–16px

Use pills mainly for status badges and tags.

 1. SHADOWS

Use shadows sparingly.

Prefer borders and surface contrast.

Avoid large floating shadows everywhere.

 1. ICONOGRAPHY

Use one consistent icon library.

Icons must:

• Have consistent stroke weight
• Have consistent size
• Communicate clear actions
• Have accessible labels when necessary

Do not use random emoji as primary UI icons.

 1. APPLICATION SHELL

Main structure:

TOP BAR
↓
SIDEBAR + MAIN CONTENT

The shell should remain consistent across the application.

 1. TOP BAR

Include:

• DEVOS v1.0.0 branding
• Active project
• Project selector
• Global status
• AI access
• Account/settings

Example:

DEVOS v1.0.0 | Project ▼ | Git Status | AI | Account

 1. SIDEBAR

MAIN:

• Dashboard
• Workspace
• Projects
• Files
• Git
• AI
• Terminal

SECONDARY:

• Settings
• Account

Do not add unnecessary navigation items.

 1. ACTIVE NAVIGATION

Clearly show the active item using:

• Background
• Accent indicator
• Font weight
• Icon state

Do not rely only on color.

 1. PROJECT SELECTOR

Show:

• Project name
• Technology indicator where useful
• Selection state

Actions:

• Switch project
• Create project
• View projects

Changing projects must update project context.

 1. DASHBOARD

Dashboard should show:

• Current project
• Recent projects
• Quick actions
• Recent activity
• Git status
• AI access
• Useful project statistics

Do not add meaningless analytics.

 1. QUICK ACTIONS

Useful actions:

• Create Project
• Open Workspace
• Connect Repository
• Open Terminal
• Ask AI

Every action must perform real functionality.

 1. PROJECTS PAGE

Provide:

• Project list
• Search
• Create project
• Open project
• Rename project
• Delete project

Display:

• Name
• Description
• Technology
• Repository status
• Last updated

 1. PROJECT CREATION

Fields:

• Project name
• Description
• Technology
• Optional repository

Flow:

Create Project
→ Project Created
→ Open Workspace

 1. PROJECT DELETION

Deletion is destructive.

Require confirmation.

Never silently delete a project.

 1. WORKSPACE

Workspace is the core DEVOS v1.0.0 interface.

Recommended:

FILE EXPLORER
+
CODE / FILE VIEWER
+
AI ASSISTANT
+
TERMINAL
+
GIT

 1. WORKSPACE PRINCIPLE

Users should be able to:

• Browse files
• Inspect code
• Ask AI
• Run commands
• Check Git
• Review activity

without unnecessary page switching.

 1. FILE EXPLORER

Support:

• Folder expansion
• Folder collapse
• File selection
• Active file state
• File type indicators
• Search
• Project root

Example:

PROJECT
├── src
│   ├── components
│   ├── pages
│   └── services
├── backend
├── tests
├── README.md
└── package.json

 1. FILE SEARCH

Support:

• Filename search
• Fast results
• Match highlighting
• Keyboard navigation
• File opening

Future:
Content search and semantic search.

 1. CODE VIEWER

MVP may use read-only code viewing.

Provide:

• Syntax highlighting
• Line numbers
• File name
• Language
• Scroll
• Copy
• Search

Architecture should allow future editing.

 1. CODE EDITOR FUTURE

Future:

• Code modification
• Multi-file editing
• Undo/redo
• AI patches
• Diff preview

Do not build full VS Code replacement in MVP.

 1. AI ASSISTANT

AI panel should provide:

• Conversation history
• Message input
• Send
• Loading state
• Error state
• Context indicator
• Clear conversation
• Project actions

 1. AI MESSAGE DESIGN

User messages:
Compact and visually distinct.

AI messages:
Readable and structured.

Support:

• Code blocks
• Lists
• Technical explanations

Avoid huge message bubbles.

 1. AI CONTEXT INDICATOR

Show what context is being used.

Example:

Context: 4 files • Git status • Current project

Do not expose sensitive information.

 1. AI ACTIONS

Possible actions:

• Explain
• Apply suggestion
• Generate test
• Create documentation
• Review changes

Only show actions that actually work.

 1. AI LOADING

Show:

• Processing indicator
• Clear loading state

Do not fake AI processing.

 1. AI ERROR

Example:

AI request failed.

Actions:

• Retry
• Check configuration
• Continue manually

Do not expose unnecessary raw provider errors.

 1. TERMINAL

Use:

• Monospace font
• Clear prompt
• Command output
• Scrollable history
• Status indicators

Example:

$ npm run build

Build completed successfully.

 1. TERMINAL STATES

Support:

• Idle
• Running
• Success
• Error
• Timeout
• Cancelled

 1. GIT PANEL

Display:

• Current branch
• Repository status
• Changed files
• Added files
• Modified files
• Deleted files
• Diff access

Example:

main

Changes
M  src/App.tsx
M  backend/main.py
A  tests/test_auth.py

 1. GIT STATUS

Working tree clean:
Success

Uncommitted changes:
Warning

Git operation failed:
Error

Never rely only on color.

 1. DIFF VIEW

Clearly distinguish:

• Added lines
• Removed lines
• Modified sections

Keep diff readable in dark mode.

 1. ACTIVITY

Show useful activity:

• Project created
• Repository connected
• File opened
• AI request
• Terminal command
• Git operation

Avoid excessive activity noise.

 1. STATUS INDICATORS

Possible:

• API connected
• Git connected
• AI available
• Terminal ready

Keep indicators subtle.

 1. BUTTON SYSTEM

Primary:
Main action

Secondary:
Supporting action

Tertiary:
Low-emphasis action

Danger:
Destructive action

Examples:

Create Project
Connect GitHub
Cancel
Delete Project

 1. BUTTON RULES

Buttons need:

• Clear labels
• Hover
• Active
• Focus
• Disabled
• Loading

Avoid:

"Click Here"

Prefer:

"Create Project"
"Connect Repository"
"Run Command"

 1. INPUT SYSTEM

Inputs should have:

• Label
• Field
• Placeholder where useful
• Validation
• Error state
• Focus state

Never rely only on placeholder text.

 1. FORM VALIDATION

Validation should be:

• Clear
• Human-readable
• Immediate where appropriate
• Non-destructive

Example:

"Project name is required."

Avoid:

"400 Bad Request"

 1. MODALS

Use for:

• Confirmation
• Destructive actions
• Focused configuration

Modal structure:

Title
Description
Primary Action
Secondary Action
Close

 1. TOASTS

Use for short feedback.

Examples:

"Project created."
"Repository connected."
"Changes committed."
"Unable to connect to GitHub."

Critical information should not exist only in a toast.

 1. LOADING STATES

Every async operation needs a loading state.

Examples:

Creating...
Processing...
Refreshing...
Running...

 1. SKELETON STATES

Use skeletons where the layout is known.

Avoid excessive animation.

 1. EMPTY STATES

Every empty state should explain:

1. What is empty
2. Why it matters
3. What to do next

Example:

"No projects yet."

"Create your first DEVOS v1.0.0 project to get started."

[Create Project]

 1. ERROR STATES

Explain:

• What failed
• Whether data was affected
• What the user can do

Example:

"Unable to load project."

"Check your connection and try again."

[Retry]

 1. RESPONSIVE DESIGN

Support:

• Desktop
• Laptop
• Tablet
• Mobile where practical

Desktop is the primary target.

Mobile should prioritize:

• Dashboard
• Projects
• AI
• Activity
• Project information

 1. RESPONSIVE BEHAVIOR

Large screens:

• Full sidebar
• File explorer
• Code
• AI
• Terminal

Medium screens:

• Collapsible sidebar
• Resizable panels
• Reduced secondary information

Small screens:

• Navigation drawer
• One primary workspace panel
• Simplified file navigation
• AI overlay/access

 1. PANEL RESIZING

Prioritize:

1. Code
2. File explorer
3. AI
4. Terminal

Do not allow panels to become unusably small.

 1. KEYBOARD UX

Important actions should support keyboard interaction.

Potential shortcuts:

Ctrl/Cmd + K
Global search/command

Ctrl/Cmd + P
File search

Ctrl/Cmd + Enter
Send AI message

Ctrl/Cmd + `
Toggle terminal

Escape
Close modal/panel

Shortcuts may be adjusted during implementation.

 1. COMMAND PALETTE

Potential commands:

• Open project
• Search files
• Open terminal
• Ask AI
• Git status
• Settings

It should complement navigation, not replace it.

 1. ACCESSIBILITY

Requirements:

• Keyboard navigation
• Visible focus states
• Accessible labels
• Semantic HTML
• Sufficient contrast
• Screen-reader support
• No color-only status
• Accessible modal behavior

 1. FOCUS STATES

Every interactive element must have a visible keyboard focus state.

 1. MOTION

Use subtle motion only when useful.

Appropriate:

• Panel transitions
• Modal transitions
• Toasts
• Loading
• Navigation

Avoid:

• Excessive bouncing
• Decorative animations
• Distracting backgrounds

 1. DATA RESPONSIVENESS

Tables/lists must remain usable on smaller screens.

Use:

• Horizontal scrolling
• Collapsed metadata
• Priority-based information

Do not force every desktop field onto mobile.

 1. DESIGN SYSTEM

Centralize:

• Colors
• Typography
• Spacing
• Borders
• Radius
• Shadows
• Breakpoints
• Component states

Suggested:

styles/
├── tokens
├── globals
├── components
└── layouts

 1. COMPONENT STATES

Every reusable component should define:

• Default
• Hover
• Focus
• Active
• Disabled
• Loading
• Error
• Success

 1. UI CONSISTENCY

Similar actions must look and behave similarly.

Example:

All primary actions use the same primary button system.

 1. INFORMATION HIERARCHY

Every screen:

1. Primary purpose
2. Primary action
3. Important information
4. Secondary information
5. Supporting actions

Do not give every element equal visual weight.

 1. DASHBOARD FLOW

Existing user:

Login
→ Dashboard
→ Recent Projects
→ Open Project
→ Workspace

New user:

Login
→ Dashboard
→ No Projects
→ Create Project
→ Workspace

 1. WORKSPACE FLOW

Project selected
→ Workspace opens
→ Project context loads
→ File tree available
→ User opens file
→ AI receives relevant context
→ Terminal available
→ Git status updates
→ User reviews changes

 1. AI FLOW

Open AI
→ Identify active project
→ Assemble context
→ User asks question
→ AI processes context
→ Response
→ Optional real action
→ Project state updates

 1. GIT FLOW

Open Git
→ Fetch status
→ Show branch
→ Show changed files
→ Open diff
→ Review
→ Commit
→ Success/Error

 1. TERMINAL FLOW

Open Terminal
→ Project working directory
→ Command validation
→ Execution
→ Output
→ Status
→ History

 1. PROJECT CONTEXT UX

Show compact context information.

Example:

Project:
DEVOS v1.0.0

Technology:
React + FastAPI

Files:
12 relevant

Git:
main • 3 changes

 1. TRUST & TRANSPARENCY

Clearly communicate whether an operation is:

• Local
• Remote
• AI-generated
• User-triggered
• Automated

AI-generated changes must not appear as manually written code.

 1. DESTRUCTIVE ACTIONS

Examples:

• Delete project
• Delete files
• Force Git operations
• Disconnect repository

Require confirmation where appropriate.

 1. SUCCESS FEEDBACK

After successful operations:

• Update UI
• Show confirmation
• Refresh affected data

Do not require manual page refresh.

 1. FAILURE RECOVERY

When something fails:

1. Preserve user input where possible.
2. Explain failure.
3. Provide retry.
4. Avoid losing project state.
5. Log diagnostic information appropriately.

6. PERFORMANCE UX

Prioritize:

• Fast navigation
• Fast project loading
• Efficient file loading
• Efficient API calls
• Lazy loading
• Minimal unnecessary re-renders

One slow panel must not freeze the entire application.

 1. NETWORK STATES

Handle:

• Online
• Slow network
• API unavailable
• AI unavailable
• GitHub unavailable

One unavailable service should not destroy the entire workspace.

 1. DEGRADED UX

If AI is unavailable, users should still be able to:

• Browse files
• View project information
• Inspect Git where available
• Use other working features

 1. DESIGN ANTI-PATTERNS

Never use:

• Random colors
• Excessive gradients
• Huge workspace hero sections
• Excessive glassmorphism
• Generic dashboard cards
• Browser-default buttons
• Unreadable text
• Tiny click targets
• Inconsistent icons
• Excessive rounded containers
• Fake loading
• Fake AI responses
• Fake Git data
• Fake terminal output

 1. NO FAKE FUNCTIONALITY

UI must reflect actual capabilities.

Unavailable features should show:

"Coming soon"

or

"Not configured"

or an appropriate empty state.

Never create buttons that do nothing.

 1. UI PERFORMANCE RULE

Avoid:

• Excessive DOM nesting
• Unnecessary animations
• Large unoptimized assets
• Expensive repeated rendering
• Unnecessary global state

 1. MOBILE PRIORITY

Mobile priorities:

1. Dashboard
2. Projects
3. AI
4. Activity
5. Project information

Full developer workspace remains desktop-first.

 1. DESKTOP PRIORITY

Desktop priorities:

1. Workspace
2. Code
3. File explorer
4. AI
5. Terminal
6. Git

7. UI SECURITY

Never display:

• API secrets
• Passwords
• Private tokens
• Private keys

Sensitive values must be masked or omitted.

 1. FORM SECURITY UX

Authentication forms should:

• Show clear validation
• Use secure password fields
• Prevent accidental duplicate submission
• Avoid unnecessarily revealing sensitive authentication details

 1. AI SECURITY UX

Do not encourage users to paste secrets.

Where appropriate:

"Do not include API keys or passwords in your message."

 1. GITHUB SECURITY UX

When connecting GitHub:

• Explain requested access
• Request minimum permissions
• Show connection status
• Provide disconnect capability

 1. TERMINAL SECURITY UX

For restricted commands:

"Command blocked for security reasons."

Do not expose internal security implementation details.

 1. UI TESTING

Test:

• Navigation
• Forms
• Authentication
• Project creation
• Project switching
• File navigation
• AI interaction
• Git state
• Terminal states
• Loading
• Errors
• Empty states
• Responsive behavior

 1. BROWSER COMPATIBILITY

Support modern browsers:

• Chrome
• Edge
• Firefox
• Safari

Do not optimize for obsolete browsers unless required.

 1. UI DEFINITION OF DONE

UI/UX is complete when:

✓ Consistent design system
✓ Predictable navigation
✓ Active project always clear
✓ Workspace panels work together
✓ Loading states exist
✓ Error states exist
✓ Empty states exist
✓ Buttons have real behavior
✓ Forms validate correctly
✓ Keyboard interaction works
✓ Desktop workspace is polished
✓ Responsive behavior is acceptable
✓ Accessibility fundamentals implemented
✓ No major visual inconsistencies

 1. FINAL UI/UX PRINCIPLE

DEVOS v1.0.0 should feel like:

A professional developer command center.

NOT:

A dashboard with developer-themed colors.

The interface should communicate:

FOCUS
+
CONTEXT
+
CONTROL
+
INTELLIGENCE

 1. FINAL PRODUCT EXPERIENCE

LOGIN
↓
DASHBOARD
↓
SELECT PROJECT
↓
WORKSPACE
↓
FILES + CODE + TERMINAL + GIT + AI
↓
CONTEXT-AWARE DEVELOPMENT
↓
REVIEW
↓
COMMIT
↓
CONTINUE

 1. DESIGN SYSTEM FINAL RULE

Every visual decision should answer:

"Does this help the developer understand or complete their task?"

If not, remove it.

 1. FINAL UI/UX STATEMENT

DEVOS v1.0.0 must prioritize:

SIMPLE
→ FAST
→ CONTEXT-AWARE
→ RELIABLE
→ PROFESSIONAL

The UI should reduce cognitive load rather than add visual complexity.

The workspace should keep the developer focused on the project.

The project should remain the center of the experience.

The AI should enhance the workflow rather than dominate the interface.

The result should feel like one cohesive SaaS product.

END OF 04_UI_UX.md
