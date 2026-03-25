# Astra/log Product Roadmap — Transient Workspace

## The Core Identity
Astra/log is a "Little Previewer" and Transient Workspace designed for the rapid exploration, validation, and architectural planning of web applications. It operates on the principle that the value of a session lies in the high-fidelity insights gained, not the files saved.

* **The Universal Bridge**: Acts as a translation layer between complex repositories and a workable app.
* **Calm Futurism**: A high-depth "nebula-glass" environment using translucent layers and glassmorphism.
* **Zero-Persistence**: Every session is a clean slate; all data is destroyed upon reset or closing.

---

## Current Capabilities (Status: V1.0-RC)
The following features are fully implemented and functional in the current build:

- [x] **In-Browser Node.js Environment**: Runs projects (Vite, Express, etc.) via WebContainer technology.
- [x] **Automated Multi-Tier Boot**: Multi-tier system identifies start scripts in package.json or READMEs.
- [x] **Interactive Xterm.js Terminal**: Full shell backed by WebContainer for manual interaction.
- [x] **Context-Aware AI Brainstorming**: Assistant reads project structure and files to provide guides.
- [x] **Fluid Multi-Layout Workspace**: Supports Standard, Architect, and Zen Focus presets.
- [x] **Offline Scratch Pad**: Dedicated local-only "Thought Buffer" for private notes.
- [x] **Security & Containment**: Pre-install "Containment Scan" and permission dialogs for suggested commands.
- [x] **Artifact System**: Multi-style exports (MD, PDF, JSON, HTML) and Evolution Snapshots.
- [x] **Responsive Preview**: Built-in browser with mobile, tablet, and desktop viewport modes.
- [x] **Onboarding**: One-time Welcome Modal and 3-step Workspace Tour.

---

## The Intended 1.0 Product
The 1.0 release targets the perfection of the "Technical Consultant" persona and platform security.

### 1.0 Development Items (Final Push)
- [ ] **AI App Reviewer**: Automated analysis of accessibility (A11y), UI/UX critiques, and contrast.
- [ ] **BYOK Enhancements**: Local model discovery (fetching tags from local providers) and 2026 model registry updates.
- [ ] **Custom Persona Settings**: Field in Settings for custom system instructions to override default AI behavior.
- [ ] **Visual Plan Diffs**: Highlighting additions and deletions between snapshots in the Compare view.
- [ ] **Session Freshness Indicator**: Subtle timer to track the duration of the active transient session.

---

## Post-1.0 Strategic Goals
Expanding the "Universal Bridge" to every major software ecosystem and platform.

### Goal 1: Cross-Platform Ubiquity
- [ ] **Native Mobile Apps**: Tauri v2 packaging for native iOS and Android versions.
- [ ] **GitHub Ingestion**: Direct ingestion of public repository URLs without manual ZIP upload.

### Goal 2: Universal Runtime Support
- [ ] **Beyond Node.js**: WASM-based execution for Python (Pyodide) and Ruby.

### Goal 3: Deep Software Insight
- [ ] **Architecture Visualizer**: Visual dependency maps and component skeletons from the project tree.
- [ ] **Network & State Inspector**: Panel for live API calls, WebSocket traffic, and internal state changes.
- [ ] **Security "Stress Test" Mode**: AI-driven diagnostic mode to identify architectural vulnerabilities.
- [ ] **Technical Knowledge Repository**: Primary source documentation for grounded AI technical advice.

---

## The Idealized Future
Astra/log becomes an "Instant Intelligence Layer" for the web. Users point the app at any repository—regardless of language—and instantly interact with a live preview while an expert AI consultant explains the underlying architecture.

## Strict Anti-Goals (The Boundaries)
- **NO Persistence**: No user accounts or database storage.
- **NO IDE Creep**: No complex file editing or Git integration.
- **NO Mandatory AI**: Core sandbox and terminal functions remain functional offline.
- **NO Complexity Creep**: Features will not require understanding Docker or Git to see a preview.
