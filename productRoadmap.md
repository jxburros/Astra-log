# Product Roadmap — Transient Workspace

## Guiding Constraints

All features and decisions must adhere to:

- Zero persistence (no accounts, no saved sessions)
- No IDE creep (no file editing, no Git workflows)
- AI is a consultant, not a coding agent
- Preview-first workflow
- Local-first execution and security
- Insight over output

---

## Current State (Implemented Features)

### Core Runtime
- WebContainer-based in-browser Node.js execution
- Session-based runtime reuse
- Full npm install + execution pipeline

### Boot System
- Multi-tier boot hierarchy:
  - package.json scripts
  - README command extraction
  - AI fallback
- Command retry system with recovery messaging

### Terminal
- Xterm.js integration
- Interactive shell (jsh)
- Command input/output streaming
- Rolling output buffer (AI context)

### File System
- ZIP ingestion (drag-and-drop + upload)
- In-memory filesystem mounting
- Full session reset (filesystem cleared)

### AI System
- Context-aware chat (full project ingestion)
- Troubleshooting pipeline
- BYOK provider support (OpenAI, Gemini, local)

### Preview System
- Iframe-based preview
- URL navigation
- Reload control
- Responsive modes (mobile, tablet, desktop)

### UI Layout (Current)
- Left: Terminal
- Center: Preview
- Right: Chat
- Header controls + drag-and-drop overlay

---

## Phase 1 — UX & Workspace Alignment

### Goal
Transform current system into a cohesive Transient Workspace

---

### 1.1 Layout System Upgrade
- Add draggable panel resizing
- Add collapse/expand:
  - Terminal
  - Chat
  - Scratch Pad
- Allow preview expansion priority
- Store layout in session memory only

---

### 1.2 Persistent Scratch Pad Integration
The Scratch Pad must be available at all times, not only in Focus Mode.

Requirements:
- Always accessible from the main workspace
- Never hidden behind a mode dependency
- May be:
  - a dedicated panel
  - a docked drawer
  - a collapsible side tray
  - a bottom utility layer
- Must remain one action away at all times
- Must not be routed through AI systems
- Must remain visually distinct from AI chat

Behavior:
- Users can take notes at any point in the workflow
- Notes are private and never sent to AI providers
- Notes persist only for the current live session
- Notes are destroyed when the session is reset or the tab closes

Recommended implementation direction:
- Add Scratch Pad as a first-class layout region
- Allow collapse/minimize, but never make it mode-exclusive
- In Focus Mode, increase its prominence rather than toggling its existence

---

### 1.3 Focus Mode (Zen Mode)
Focus Mode should simplify the interface without removing access to note-taking.

Hide or reduce:
- Terminal
- Header controls (partial)
- Chat (optional)

Show or prioritize:
- Preview
- Scratch Pad

Important:
- Focus Mode must not be the only way to access the Scratch Pad
- Focus Mode is a visibility/layout adjustment, not a feature gate

---

### 1.4 Ambient Feedback System
Replace textual status indicators with visual signals:

States:
- Idle → soft glow
- Installing → pulsing
- Running → stable light
- Error → subtle flicker

---

### 1.5 Intentional Destruction
Enhance session reset behavior:

- Add animation layer:
  - pixel dissolve OR radial wipe
- Delay reset until animation completes
- Clear:
  - filesystem
  - terminal
  - chat
  - scratch pad
  - memory

---

## Phase 2 — Branding & Visual System

### Goal
Create a distinct product identity and cohesive visual system

---

### 2.1 Rebrand (In-App)
- Replace current app name in header
- Add logo system:
  - icon
  - subtle animation

---

### 2.2 Design System (Calm Futurism)
- Glassmorphism panels
- Layered translucency
- Depth-based UI hierarchy

Color System:
- Base: near-black
- Accent: controlled gradient
- States:
  - success (green glow)
  - warning (amber)
  - error (soft red)

---

### 2.3 Motion System
- Panel transitions
- Hover smoothing
- Status animations
- Preview resizing transitions
- Scratch Pad open/close transitions

---

### 2.4 Drag & Drop Enhancements
- Smooth overlay transitions
- Background dimming
- Slight scale/blur effects

---

## Phase 3 — Thought System (Core Differentiator)

---

### 3.1 Offline Scratch Pad
The Scratch Pad is a core workspace primitive, not an optional utility.

Requirements:
- Fully local (no AI access)
- Separate data store from chat
- No indexing or processing
- Available at all times during a session

Features:
- Freeform text
- Keyboard-first access
- Fast open/close behavior
- Manual clear option
- Visually distinct from chat
- Session-only lifecycle

Possible enhancements:
- lightweight timestamp separators
- optional note sections
- quick bullets / raw thought mode
- pinning the panel open during work

Non-goals:
- No AI summarization of Scratch Pad content
- No sharing workflow
- No export by default unless explicitly user-controlled
- No persistence beyond the live session

---

### 3.2 AI Behavior Layer
- Passive mode detection (short inputs)
- Reduced verbosity
- Prioritize:
  - explanation
  - structure
- Avoid:
  - unsolicited solutions

---

### 3.3 Action Chips
- AI-generated buttons:
  - [Expand]
  - [Clarify]
  - [What’s missing]
- One-click follow-ups
- No automatic execution

---

### 3.4 Diagnostic Command Execution
- AI suggests terminal commands
- Clickable UI
- Confirmation required
- Execute via terminal pipeline

---

## Phase 4 — Security & Trust Layer

---

### 4.1 Containment Scan
Trigger before dependency install.

Scan:
- package.json scripts
- preinstall/postinstall hooks
- suspicious dependencies

Output:
- Safe / Warning / High Risk
- concise explanation

---

### 4.2 Permission System
- Required for:
  - AI-suggested commands
  - external script execution
- Clear user confirmation UI

---

### 4.3 Iframe Sandboxing
- Restrict:
  - localStorage access
  - parent DOM access
- Isolate preview from UI

---

## Phase 5 — Artifact System

---

### 5.1 Structured Export
Formats:
- Markdown
- PDF

Sections:
- UX
- Logic
- Architecture

Important:
- Exported artifacts should come from AI/chat-derived planning output
- Scratch Pad export, if ever supported, must be explicitly user-invoked and never automatic

---

### 5.2 Evolution Snapshots
- Capture plan states over time
- Compare iterations
- No project state stored

---

## Phase 6 — Expansion Layer

---

### 6.1 GitHub Ingestion
- Input: repo URL
- Convert to in-memory project
- Feed into existing pipeline

---

### 6.2 Universal Runtime Support
- Python (WASM / Pyodide)
- Ruby (WASM)

Constraints:
- fast boot
- local execution

---

### 6.3 Mobile & Hardware Emulation
- Device presets
- Viewport simulation
- Optional:
  - GPS
  - camera

---

### 6.4 AI App Reviewer
- Analyze rendered preview
- Provide:
  - accessibility feedback
  - UI/UX critique
  - contrast issues

---

## Phase 7 — Platform Layer

---

### 7.1 BYOK System
- Provider selection:
  - OpenAI
  - Anthropic
  - Gemini
  - Local
- API key management
- Fallback handling

---

### 7.2 Technical Knowledge Repository
- Curated internal docs
- Referenced by AI
- Prevent hallucinated sources

---

## Naming Roadmap

---

### Step 1 — Identity Direction

Choose emphasis:
- Preview-first
- Transience-first
- Hybrid (recommended)

---

### Step 2 — Candidate Evaluation

Criteria:
- usable as a verb
- not IDE-like
- not chatbot-like
- memorable and distinct

---

### Step 3 — Implementation
- Update app header
- Update metadata
- Update repository name
- Update Tauri bundle

---

## Explicit Anti-Goals

The following must NOT be implemented:

- File editing system
- Git integration
- Project saving or persistence
- Cloud sync
- Collaboration features
- Automated coding agents
- Complex environment tooling (Docker, etc.)

---

## Development Priority Order

1. UX & Layout (Phase 1)
2. Branding & Visual System (Phase 2)
3. Thought System (Phase 3)
4. Security Layer (Phase 4)
5. Artifact System (Phase 5)
6. Expansion Layer (Phase 6)

---

## Core Principle

This product exists to:

> Enable rapid understanding of software without commitment to building or maintaining it.
