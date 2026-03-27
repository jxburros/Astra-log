# Astra/log Product Roadmap — Transient Workspace

## Core Identity & Strategic Purpose
**Astra/log** is a specialized Instant Validation Engine and Transient Workspace designed for the rapid exploration, validation, and architectural planning of web applications. It operates on the principle that the value of a developer’s session lies in the high-fidelity insights and plans gained, not the files saved.

* **Solving the "ZIP Loop"**: The app exists to collapse the cycle of export-unzip-build-test into a single, frictionless drag-and-drop action.
* **The Universal Bridge**: It acts as a translation layer between complex repositories and a workable app, making it accessible for non-coders to test projects.
* **Calm Futurism**: The interface is a high-depth "nebula-glass" environment using translucent layers, glassmorphism, and subtle radial gradients to minimize cognitive load.
* **Zero-Persistence Architecture**: Every session is a clean slate; once reset or closed, the entire filesystem and chat history are permanently destroyed.
* **Privacy of Thought**: A strict boundary is maintained between public AI-assisted brainstorming and the private "Offline Scratch Pad".
* **Freedom of Choice (BYOK)**: The "Bring Your Own Key" approach allows users to choose their preferred AI provider (Gemini, OpenAI, Anthropic, or Local models) while keeping operational costs sustainable.
* **Ethical Data Practice**: The app does not host, store, or collect user data; privacy is a technical default.
* **The Consultant, Not the Coder**: The AI is intentionally designed as a brainstorming and planning partner rather than an automated "Coding Agent".

---

## Current Capabilities (Status: V1.0)
The following features are fully implemented and verified in the current build:

### Core Runtime & Boot System
- [x] **In-Browser Node.js Sandbox**: Utilizes WebContainer API to run full projects (Vite, Express, etc.) directly in the browser's memory.
- [x] **Multi-Tier Boot Hierarchy**: Automatically identifies start scripts in `package.json` or `README` files, with an AI fallback system for troubleshooting failures.
- [x] **Interactive Xterm.js Terminal**: A full shell backed by the WebContainer allowing for manual command execution and real-time interaction.
- [x] **Session-Based Runtime Reuse**: Core runtime remains active for the duration of the session.

### Workspace & UI
- [x] **Fluid Multi-Layout Workspace**: Four switchable presets accessible via the header Layout Switcher:
    - **Standard**: Terminal (left), Preview (center), Chat + Scratch Pad stacked vertically in the right panel.
    - **Architect**: Preview + Chat side-by-side on top, full-width Terminal on the bottom with vertical resize.
    - **Zen Focus**: Scratch Pad (left) and Preview (right) only for distraction-free review.
    - **Custom**: Free-arrangement mode for Terminal, Preview, Chat, and Scratch Pad across resizable columns; custom controls (column count, drag-and-drop, lock/edit toggle) live in the header while Custom is active.
- [x] **Responsive Adaptation**: Viewports below 1024px switch to a full-height Preview with a collapsible bottom drawer and persistent tab bar.
- [x] **Ambient Feedback System**: Visual signals replace verbose logs (e.g., "ready" status uses a `glow-success` pulse).
- [x] **Intentional Destruction**: High-quality "radial-wipe" animation when starting a new project to visually confirm data erasure.

### AI & Thought System
- [x] **Context-Aware AI Chat**: Integrated assistant reads the project structure and file contents to assist in generating implementation plans.
- [x] **AI Behavior Layer**: Passive handling for short inputs, reduced verbosity, and structured explanation-first responses.
- [x] **Suggested Responses**: Context-aware buttons like `Yes`/`No` or `Proceed`/`Explain further` appear after AI messages.
- [x] **Diagnostic Command Runner**: AI-suggested terminal commands are rendered as clickable run buttons requiring user confirmation.
- [x] **Concise Mode**: Toggle (⚡) to force bullet-point, maximum 5-item AI responses with no preamble.

### Private Workspace Tools
- [x] **Offline Scratch Pad**: Fully local, session-only thought buffer that is visually distinct from chat.
- [x] **Keyboard-First Access**: Shortcuts for the Scratch Pad: `Ctrl/Cmd + .` to toggle and `Ctrl/Cmd + Shift + K` to focus.
- [x] **Draft-to-Chat (Stage Notes)**: "Stage for AI" (↗) button to prepend private notes to the next chat message.

### Security & Artifacts
- [x] **Containment Scan**: Automatically scans `package.json` for suspicious lifecycle hooks and dangerous script patterns (e.g., `sudo`, `npx`, `bash`) before installation.
- [x] **Permission System**: Purpose-built confirmation dialog for AI-suggested terminal commands.
- [x] **Sandboxed Preview**: Iframe hardened with `sandbox` restrictions and `no-referrer` policy to isolate the running app.
- [x] **Structured Artifact Export**: Implementation plans exportable as Markdown, PDF, JSON, HTML, or Plain Text.
- [x] **Evolution Snapshots**: Ability to capture plan states at intervals to compare iterations side-by-side during a session.
- [x] **Strict Grok Policy Enforcement**: Backend filters Ollama model tags containing `grok`; AI Settings displays a permanent policy notice; Save Settings is hard-blocked with a policy alert if `grok` appears in manual model or local URL inputs.

### AI Reviewer & Extended Features
- [x] **AI App Reviewer**: The AI "looks" at the rendered preview to provide automated notes on accessibility (A11y), UI/UX critiques, and color contrast improvements.
- [x] **Custom Persona Settings**: A "Custom Instructions" field in Settings allows users to override or append to the default technical consultant AI behavior.
- [x] **Visual Plan Diffs**: The "Compare" view in the Export Modal provides clear visual highlighting of additions/deletions between captured snapshots.
- [x] **Session Freshness Indicator**: A subtle `HH:MM:SS` timer near the "New Project" button tracks the active duration of the current transient session.

### BYOK & Model Registry
- [x] **Local Model Discovery**: The `/api/models` endpoint fetches live tags from Ollama's `/api/tags` instead of using hardcoded defaults.
- [x] **2026 Model Registry**: `FALLBACK_MODELS` updated to current standards; removed deprecated Gemini 1.5, Claude 3 Opus, GPT-4 Turbo, and o1/o1-mini; added GPT-4.1, o3, o4-mini, Gemini 2.0 Pro (Exp), and Claude 4.5 (Opus/Sonnet/Haiku).

### Onboarding & Help
- [x] **Welcome Onboarding**: One-time splash screen on first launch explaining Zero Persistence and Consultant-Only principles.
- [x] **Workspace Tour**: 3-step guided tour (Terminal → Preview → Scratch Pad) with SVG spotlight highlighting.
- [x] **In-App Help Guide**: `?` icon in the header opens a usage guide with keyboard shortcuts and workflow tips.

---

## Post-1.0 Strategic Goals
Post-1.0 development focuses on expanding the "Universal Bridge" to every major software ecosystem and providing deep, automated architectural insights.

### Goal 1: Cross-Platform Ubiquity
- [ ] **Native Mobile Apps**: Use the Tauri v2 pipeline to package Astra/log for native iOS and Android versions.
- [ ] **GitHub Ingestion**: Direct ingestion of public repository URLs to convert them into in-memory projects without manual ZIP upload.

### Goal 2: Universal Runtime Support
- [ ] **Beyond Node.js**: Integrate WASM-based runtimes to support non-Node projects, specifically targeting Python (Pyodide) and Ruby.

### Goal 3: Deep Software Insight
- [ ] **Architecture Visualizer**: Automated generation of visual dependency maps and component skeletons from the mounted project tree.
- [ ] **Network & State Inspector**: A specialized panel to visualize live API calls, WebSocket traffic, and internal state changes (e.g., Redux or React Context) in the preview sandbox.
- [ ] **Security "Stress Test" Mode**: An AI-driven diagnostic mode that identifies architectural vulnerabilities and suggests terminal commands to test them.
- [ ] **Technical Knowledge Repository**: A curated library of internal documentation and style guides that the AI consultant references as its primary source of truth.
- [ ] **Side-by-Side Project Ingestion**: Update the layout engine to support two concurrent WebContainer instances for version or architecture comparison.

### Goal 4: Snapshots and Visual Processing
- [ ] **Add the ability to take screenshots of preview**
- [ ] **Give AI visual processing power**
- [ ] **Intelligently determine if attached AI has visual processing**
---

## The Idealized Future
In its idealized form, **Astra/log** becomes an **Instant Intelligence Layer** for the web. A user points the app at any repository—regardless of language or complexity—and within seconds, is interacting with a live preview while an expert AI consultant explains the underlying architecture, identifies security risks, and maps out a roadmap for future expansion.

---

## Strict Anti-Goals (The Boundaries)
To maintain the app's focus as a transient planning tool, the following will **never** be implemented:
* **NO Persistence**: No user accounts, "recent projects," or database storage. A refresh always leads to a clean slate.
* **NO IDE Creep**: No complex file editing, multi-file code authoring, or Git integration (commits/pushes).
* **NO Mandatory AI**: The core sandbox and terminal functions will always remain functional for offline use without an API key.
* **NO Complexity Creep**: Features will not be added that require understanding Git, Docker, or complex environment configurations.
* **Prohibition of Grok**: The platform has a strict policy never to incorporate Grok as an AI provider.
* **NO Data Sales**: Because no data is collected, user information will never be sold.
