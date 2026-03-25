# Changelog

## 2026-03-25 - GitHub Copilot
- **Phase 2.1 — Concise Mode Toggle**: Added a ⚡ toggle in the ChatPanel header that forces bullet-point-only, max-5-item AI responses with no preamble; active state highlighted in amber; preference persisted to sessionStorage
- **Phase 2.2 — Suggested Responses**: Quick-tap reply buttons now appear below action chips on the last AI message — `Yes` / `No` (indigo style) when the response ends with a question, and `Proceed` / `Explain further` (neutral style) as universal contextual follow-ups
- **Phase 2.2 — Draft-to-Chat Integration**: Added "Stage for AI" (↗) button to the ScratchPad toolbar; clicking it stages current notes to be prepended to the next chat message; an amber banner in ChatPanel confirms staging and lets the user discard before sending; staged notes cleared automatically once consumed or on session reset; all ScratchPad and ChatPanel instances across layouts wired up

## 2026-03-25 - GitHub Copilot
- **Phase 1.1 — Multi-Configuration Layout Engine**: Added three switchable layout presets (`standard`, `architect`, `zen-focus`) with a header Layout Switcher (LayoutDashboard / PanelBottom / Maximize2 icons)
- **Architect layout**: CSS-grid workspace — Preview + Chat side-by-side on top, full-width Terminal row on the bottom with vertical drag-to-resize handle
- **Zen Focus layout**: Scratch Pad (left) + Preview (right) only; no terminal or chat noise
- **Phase 1.2 — Responsive Adaptation**: Mobile layout (< 1024 px) with full-height Preview, a collapsible bottom drawer (Terminal / Chat / Scratch Pad), and a persistent tab bar
- Added `terminalHeight`, `isMobileLayout`, `activeDrawerTab`, and `layoutPreset` state — all persisted to sessionStorage
- Extended `dragRef` with `startY` and `terminal-height` panel type for vertical drag support
- Added `startTouchDrag` helper and `touchmove`/`touchend` global listeners for touch-screen panel resizing
- Added `resize-divider` CSS class with coarse-pointer override (20 px min-width) and `dragging-vertical` cursor rule to `index.css`

## 2026-03-25 - Codex
- Expanded Artifact Export to support three output styles: simple recap of user notes sent to AI, implementation plan, and structured fix list (no plan).
- Added optional Scratch Pad inclusion toggle in Export modal; Scratch Pad remains local-only and is appended at the bottom only when explicitly selected.
- Added additional export file types: `.txt`, `.html`, and `.json` alongside existing Markdown and PDF exports.
- Updated snapshot metadata to track style context and refreshed README export documentation.

## 2026-03-25 - GitHub Copilot
- **Phase 5 — Artifact System** (complete pass)
- **5.1 Structured Export**: Added `src/lib/exportUtils.ts` with `parseArtifactSections` (extracts UX / Logic / Architecture headings from AI messages), `generateMarkdownDocument`, `downloadMarkdown`, and `printAsPDF` (browser-native print dialog, no new dependencies)
- **5.1 Structured Export**: Added `src/components/ExportModal.tsx` — modal showing section previews, Markdown download, and PDF export (via browser print); exported artifacts come exclusively from AI/chat-derived planning output
- **5.2 Evolution Snapshots**: Snapshot state managed in `App.tsx` (session-only, cleared on New Project); "Snapshot Current Plan" button in the export modal captures the parsed artifact; Snapshots list tab shows timestamps and per-snapshot Markdown download; Compare tab shows two snapshots side-by-side
- Added `Export Artifact` button to `ChatPanel.tsx` (below "Generate Implementation Plan")
- Exported `Message` interface from `ChatPanel.tsx` for use in export utilities
- Scratch Pad export is not included by design — the spec requires it to be explicitly user-invoked and this is deferred per roadmap

## 2026-03-25 - GitHub Copilot
- **Phase 4 — Security & Trust Layer** (complete pass, building on existing base)
- **4.1 Containment Scan**: Added `sudo` (high-risk), `npx <pkg>`, `bash *.sh`, and `sh *.sh` patterns to `SCRIPT_PATTERNS` in `containmentScan.ts`
- **4.1 Containment Scan**: Added `github:`, `bitbucket:`, and `gitlab:` shorthand dependency source patterns to `DEP_PATTERNS`
- **4.3 Iframe Sandboxing**: Added `referrerPolicy="no-referrer"` to the preview iframe to prevent the main app URL from leaking to the sandboxed preview
- Fixed pre-existing TypeScript lint error: added `src/vite-env.d.ts` with SVG module type declaration so `npm run lint` passes cleanly

## 2026-03-25 - GitHub Copilot
- Updated `server.ts` to read the `PORT` environment variable (defaults to 3000) instead of hardcoding port 3000
- Added `findAvailablePort` helper: if the preferred port is busy the server automatically falls back to any free port assigned by the OS
- Updated `.env.example` to document the new `PORT` variable
- Updated `README.md` to document custom-port usage and the auto-fallback behavior

## 2026-03-25 - Codex
- Updated the app header to use the repository logo asset `Astra-log-logo.svg` as the in-app brand mark.
- Removed the previous sparkle icon + text lockup in favor of the new logo image in `src/App.tsx`.

## 2026-03-25 - GitHub Copilot
- Rebranded app from "NOVA/sandbox" to "Astra/log"
- Updated page title in `index.html`
- Updated in-app header in `src/App.tsx`
- Updated `src-tauri/tauri.conf.json` productName and bundle identifier
- Updated `src-tauri/capabilities/default.json` description
- Updated `src-tauri/Cargo.toml` package name and description
- Updated `metadata.json` name field
- Updated `README.md` all NOVA/sandbox references

## 2026-03-24 - ChatGPT
- Created initial AI development instruction set
- Added repo-wide guidance for reading coreIdentity files and productRoadmap first
- Added changelog and documentation update requirements

## 2026-03-25 - GitHub Copilot
- Implemented Phase 4 — Security & Trust Layer
- **4.1 Containment Scan**: Added `src/lib/containmentScan.ts` with pattern-based scanning of package.json scripts (including lifecycle hooks), and non-registry dependency sources; returns Safe / Warning / High Risk with per-finding explanations
- **4.1 Containment Scan**: Added `src/components/ContainmentScanModal.tsx` — a modal that surfaces scan results before `npm install` with collapsible findings list; user must explicitly confirm or cancel
- **4.2 Permission System**: Added `src/components/PermissionDialog.tsx` — a purpose-built confirmation modal for AI-suggested terminal commands, replacing the browser `window.confirm`
- **4.3 Iframe Sandboxing**: Added `sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"` to the preview iframe to block top-navigation and other privileged operations, isolating the preview from the main UI


- Upgraded Scratch Pad as a core offline workspace primitive with keyboard-first access, quick clear, local-only session lifecycle, timestamp/section inserts, and quick bullet mode.
- Added AI behavior-layer controls in chat for passive short-input handling, reduced verbosity, and structured explanation-first responses.
- Implemented Action Chips (`Expand`, `Clarify`, `What’s missing`) as one-click follow-up prompts with no automatic execution.
- Added diagnostic command execution flow: AI-suggested fenced shell commands now render clickable run buttons, require user confirmation, and execute through the existing terminal shell pipeline.

## 2026-03-25 - Codex
- Replaced the in-app header brand asset to use `astra-log-new-logo.svg`.
- Verified the app builds successfully with the updated logo import.

## 2026-03-25 - Codex
- Increased the in-app header logo display size to improve visibility of `astra-log-new-logo.svg`.
