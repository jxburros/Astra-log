# Changelog

## 2026-03-26 - GitHub Copilot
- Fixed drag-to-resize columns continuing after mouse release: added `.dragging-panel iframe { pointer-events: none }` CSS rule so iframe panels no longer swallow the `mouseup` event when the cursor crosses into them during a drag.
- Made the AI Brainstorming (ChatPanel) component responsive to narrow widths: uses a `ResizeObserver` to detect its own width and switches to compact icon-only mode below 280 px, hiding text labels from the header and footer action buttons while preserving hover tooltips (`title` attributes) as alt text.
- Removed duplicate "show panel" buttons in the custom layout: per-column hidden-panel restore buttons were appearing simultaneously with the global "Minimized" bar at the bottom of the layout. The per-column buttons have been removed; the consolidated global bar remains.
- Added `min-w-0` to the ChatPanel root element to prevent flex overflow in tight column layouts.

## 2026-03-26 - GitHub Copilot
- Created `src/lib/aiClient.ts`: unified AI client that detects Tauri desktop runtime (`window.__TAURI__` / `window.__TAURI_INTERNALS__`) and makes direct calls to OpenAI, Anthropic, Gemini, and Ollama APIs; falls back to the Express proxy server in the browser version.
- Updated `src/components/SettingsModal.tsx` to use `fetchModels` from `aiClient.ts`, fixing model discovery in the desktop app.
- Updated `src/components/ChatPanel.tsx` to use `sendChat` from `aiClient.ts`, fixing AI chat in the desktop app.
- Fixed Tauri window title: changed from `"NOVA Sandbox"` to `"Astra/log"` in `src-tauri/src/main.rs`.
- Replaced all icon files in `src-tauri/icons/` (32x32.png, 128x128.png, 256x256.png, icon.png, icon.ico, icon.icns) with versions rendered from the official `astralog-icon.svg` using a full browser rendering pipeline (Playwright/Chromium) to correctly reproduce the SVG's embedded images, masks, and filters.

## 2026-03-26 - GitHub Copilot
- Removed "Action Chips" (`Expand`, `Clarify`, `What's missing`) from `productRoadmap.md` Current Capabilities to match the removal already noted in the 2026-03-26 changelog entry.
- Added "Custom" layout preset to `productRoadmap.md` Current Capabilities (four presets: Standard, Architect, Zen Focus, Custom).
- Added Strict Grok Policy Enforcement to `productRoadmap.md` Current Capabilities (backend filtering, Settings notice, Save block).
- Moved all completed "1.0 Development Items (Final Push)" into `productRoadmap.md` Current Capabilities; removed the now-redundant "Intended 1.0 Product" section.
- Updated `productRoadmap.md` status from V1.0-RC to **V1.0**.
- Updated `README.md` OpenAI model list to add `o3` and `o3-mini`, matching the current `FALLBACK_MODELS` registry in `server.ts`.
- Reordered `README.md` Gemini model list to match `FALLBACK_MODELS` server order (pro first).
- Updated `README.md` 2026 Model Registry bullet to include `o3`/`o3-mini` in the additions list.
- Added creator/copyright branding line to `README.md` (Jeffrey Guntly · © JX Holdings, LLC).
- Updated `package.json` version from `0.0.0` to `1.0.0`.
- Updated `src-tauri/tauri.conf.json` version from `0.0.0` to `1.0.0`.

## 2026-03-26 - Codex
- Removed the outdated legacy app descriptor from `productRoadmap.md` to keep product identity terminology consistent.
- Added a compact, always-visible in-app attribution bar beneath the header crediting Jeffrey Guntly and JX Holdings, LLC.
- Updated `README.md` feature documentation to explicitly note the new creator attribution bar in the app UI.

## 2026-03-26 - Codex
- Updated `SettingsModal.tsx` to always show a persistent policy banner in AI Settings with the short message: “Grok is prohibited.”
- Removed startup follow-up chips (`Expand`, `Clarify`, `What's missing`) from `ChatPanel.tsx` so they no longer appear by default on assistant messages.
- Enhanced contextual quick replies in `ChatPanel.tsx` so AI-generated short-answer buttons can be shown for direct questions and terminal-command decision moments, not only strict question-ending messages.
- Updated README feature bullets to reflect the removal of action chips, the contextual quick-reply behavior, and the always-visible Grok policy notice.

## 2026-03-26 - Codex
- Enforced strict Grok prohibition in `server.ts` by filtering `/api/models?provider=local` results so any Ollama tag whose id/name contains `grok` is removed before reaching the UI.
- Added AI Settings policy UX in `SettingsModal.tsx`: permanent muted notice, manual custom model ID field, and a save interceptor that scans model/local URL inputs for `grok` and blocks saving.
- Added app-level hard block in `App.tsx` with a policy alert modal to prevent restricted settings from being persisted, even if a save attempt bypasses modal-local checks.
- Updated README to document Grok policy enforcement across backend sanitation, settings warnings, and save blocking.

## 2026-03-26 - Codex
- Removed the redundant Focus Mode control and mode path from the Standard layout flow; Zen Focus remains the single distraction-free preset.
- Moved Custom layout controls (column selector, reset, and lock/edit toggle) into the app header and only render them when the Custom preset is active.
- Updated README layout documentation to reflect the new header-based Custom controls and the Focus Mode removal.

## 2026-03-26 - Codex
- Removed the non-custom "Layout Edit Mode" toggle and kept Standard/Architect/Zen as fixed presets while custom layout remains the sole panel-arrangement workflow.
- Fixed drag-and-drop overlay behavior so dragging custom-layout panels no longer triggers the global ZIP-upload overlay; file-drop affordance now appears only for actual file drags.
- Added custom-layout column drop highlighting with an in-column "+ Add to column" target indicator during panel drag.
- Added custom-layout lock/edit toggle: "Lock layout" hides column/panel customization controls and drag handles; "Edit layout" restores them.
- Standardized custom-layout movement controls across all panel headers with a consistent button order (left, right, up, down, hide).
- Rebalanced custom-layout stacked panel heights automatically when panels are moved, hidden, restored, or columns are added/removed so panels fill their columns cleanly.
- Updated README layout documentation to reflect removal of Layout Edit Mode and new custom-layout lock/column-drop behavior.

## 2026-03-26 - Codex
- Unified custom workspace behavior into a single mode by removing the extra edit-mode dependency inside the custom preset and limiting the ✥ layout-edit toggle to non-custom layouts.
- Enhanced custom layout controls with configurable column count (1–4), add/remove column actions, and persistent resizing across all columns and stacked panel rows.
- Added drag-and-drop panel movement between columns (Terminal, Preview, Chat, Scratch Pad) with drop targets, while keeping existing move/swap controls for precise placement.
- Added minimize/reopen coverage for all custom-layout panels, including Preview; hidden panels can now always be restored from a persistent "Minimized" tray.
- Updated README layout documentation to reflect the new single custom-layout mode and capabilities.

## 2026-03-26 - Codex
- Added `scripts/ensureLightningcssBinary.mjs` to detect and repair missing `lightningcss` native bindings by installing the correct platform package when optional dependencies are skipped.
- Added `predev` and `prebuild` scripts so the lightningcss preflight check runs automatically before starting dev server or building.
- Updated README troubleshooting with the `lightningcss.win32-x64-msvc.node` startup error and the new automatic repair behavior.

## 2026-03-25 - Codex
- Simplified the Chat panel controls by removing the standalone "Generate Implementation Plan" action and consolidating artifact generation into a compact "Create Artifact" button that points to multi-style, multi-format export.
- Reduced Chat action button footprint by making both "Create Artifact" and "Review App" compact controls while keeping text readable.
- Updated AI quick-response behavior so buttons now appear only when the assistant asks a direct question and are dynamically generated per-question via machine-readable reply suggestions.
- Shortened the initial assistant greeting message to: "What do you see in the app?"
- Updated README feature descriptions to match the new chat control layout and dynamic quick-response behavior.

## 2026-03-26 - GitHub Copilot
- **Standard layout**: Replaced horizontal side-by-side Chat+Scratch right panel with a vertical stack (Chat top / Scratch bottom, swappable); added `chatPanelHeight` state and horizontal drag divider (`GripHorizontal`) to resize the split
- **Custom Layout mode**: Added new `custom` layout preset (4th button in header switcher, `LayoutGrid` icon) allowing free arrangement of Terminal, Preview, Chat, and Scratch panels across resizable columns and rows
- **Custom layout types**: Added `PanelId`, `CustomPanelEntry`, `CustomColumnConfig`, `CustomLayoutConfig` types and `DEFAULT_CUSTOM_LAYOUT` constant
- **Drag system**: Extended `onMouseMove` and `startTouchDrag` handlers to support `chat-scratch-height`, `custom-col-*`, and `custom-row-*` drag operations; `dragRef.panel` type widened to `string | null`
- **Persistence**: `chatPanelHeight` and `customLayout` now persisted to sessionStorage alongside existing layout state
- **Refs**: Added `rightPanelRef` (standard layout right panel bounds) and `customLayoutContainerRef` (custom layout container for drag calculations)
- **UI**: Added `collapsedHBar` helper style for horizontal collapsed bars in the vertical stack; layout edit mode shows panel move/hide controls in custom layout
- **Cleanup**: Removed spurious `- 0` arithmetic in `containerH` calculation

## 2026-03-25 - GitHub Copilot
- **Documentation audit**: Updated `README.md` AI chat panel feature section to reflect the current 2026 model registry; replaced outdated model examples (`gemini-2.5-flash`, `gpt-4o`, `claude-3-5-sonnet`) with the full current lists for Gemini, OpenAI, Anthropic, and Local/Ollama providers
- **Documentation audit**: Expanded the `2026 Model Registry` feature bullet in `README.md` to include Claude 4.5 (Opus/Sonnet/Haiku) model additions and the full list of removed deprecated models (GPT-4 Turbo, o1/o1-mini) alongside the previously noted Gemini 1.5 and Claude 3 Opus removals
- Confirmed `productRoadmap.md` accurately reflects V1.0-RC status with all five 1.0 Final Push items marked complete

## 2026-03-25 - GitHub Copilot
### 1.0 Final Push — All five roadmap items implemented

- **AI App Reviewer**: Added "Review App (A11y & UX)" button (🔍 `ScanEye` icon) to the Chat panel bottom bar. Clicking it sends a structured AI review prompt requesting findings on Accessibility (ARIA, alt text, semantic HTML, keyboard navigation), UI/UX critique, and Color Contrast (WCAG AA). Visible in all layout variants whenever a chat session has messages.
- **BYOK – Local Model Discovery**: Updated `/api/models` endpoint in `server.ts` to handle `provider=local`. When Ollama is selected, the server proxies a request to `${localUrl}/api/tags` to fetch live model tags. Model dropdown in Settings now works for Ollama just like cloud providers. SettingsModal gains a debounced `handleLocalUrlChange` that triggers discovery on URL change.
- **BYOK – 2026 Model Registry**: Replaced deprecated model lists in `FALLBACK_MODELS`. Removed: Gemini 1.5 Pro/Flash, Claude 3 Opus, GPT-4 Turbo, o1/o1-mini. Added: GPT-4.1, GPT-4.1 Mini, o4-Mini, Gemini 2.0 Pro (Exp). Reordered Gemini/OpenAI lists to surface most-capable models first.
- **Custom Persona Settings**: Added optional `customInstructions` field to the `Settings` interface. SettingsModal displays a textarea that appends custom text to the AI's system prompt under a `--- CUSTOM INSTRUCTIONS ---` section every session.
- **Visual Plan Diffs**: Implemented a pure LCS-based line diff (`computeDiff`) in `ExportModal.tsx`. The Compare view now renders a unified diff with green (`bg-emerald-500/12`) highlight for additions, red (`bg-rose-500/12`) with strikethrough for deletions, and a summary of `+N / −N` lines changed. The old side-by-side plain text view is replaced by the new highlighted diff view.
- **Session Freshness Indicator**: Added `sessionStartTime` and `sessionElapsedSecs` state in `App.tsx`. A 1-second interval ticks whenever a session is active (status ≠ idle). The elapsed time is displayed as a `HH:MM:SS` monospace label next to the "New Project" button. Timer resets on "New Project".

## 2026-03-25 - GitHub Copilot
- **Responsive Layout**: Lowered mobile/drawer layout breakpoint from 1024 px to 900 px so mid-size laptops get the full-height Preview + collapsible bottom-drawer experience
- **Chat + Scratch Pad side-by-side**: In the Standard layout, Chat and Scratch Pad now live inside a single combined right panel; both panels sit horizontally next to each other; when one is collapsed the other expands to fill the full right-panel width
- **Right-panel drag-to-resize**: A new drag divider on the left edge of the combined right panel lets users resize the entire panel; the Preview (flex-1) adjusts to fill the freed space; an internal drag divider between Chat and Scratch Pad resizes them relative to each other within the panel
- **Layout Edit Mode**: New ✥ (Move) toggle in the header activates edit mode; active panels receive a pulsing violet ring; Terminal header shows a "move to right / move to left" arrow; Scratch Pad header shows arrows to swap its position relative to Chat; Terminal side (`left`/`right`) and Chat/Scratch order are persisted to sessionStorage
- **Stale-closure fix**: Added `rightPanelWidthRef` so the drag-resize handler (closed over `[]`) always reads the latest right-panel width when computing Chat/Scratch split limits
- **CSS**: Added `edit-ring-pulse` keyframe animation for the layout-edit-mode panel highlight

## 2026-03-25 - GitHub Copilot
- **Phase 3.1 — Welcome Modal**: Implemented one-time splash screen (`WelcomeModal.tsx`) that explains Zero Persistence and Consultant-Only core principles; shown once on first load (tracked via `localStorage.astra_welcome_seen`); provides "Take a quick tour" or "Skip for now" actions
- **Phase 3.1 — Workspace Tour**: Implemented 3-step guided tour overlay (`WorkspaceTour.tsx`) using SVG spotlight cutout; highlights Terminal (Ingestion), Preview (Output), and Scratch Pad (Private Thoughts) with step indicators and contextual tooltip cards; accessible from the Welcome Modal
- **Phase 3.2 — In-App Help Guide**: Implemented `HelpGuide.tsx` modal accessible via a new `?` (`HelpCircle`) icon in the app header; contains a keyboard shortcuts cheat sheet (`Ctrl + .`, `Ctrl + Shift + K`, `Cmd/Ctrl + K`) and four workflow tips covering the Scratch Pad, ZIP ingestion, Stage for AI, and session reset
- Added `data-tour` attributes to Terminal, Preview, and Scratch Pad panels in the standard layout to enable SVG-spotlight positioning in the tour

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

## 2026-03-26 - Codex
- Fixed desktop Tauri configuration by changing `src-tauri/tauri.conf.json` `productName` from `Astra/log` to `Astra-log` so it passes Tauri schema validation.
- Updated desktop troubleshooting docs in `README.md` with guidance for the `productName` regex error during `npm run desktop:build`.

## 2026-03-26 - Codex
- Completed a general app health pass by running TypeScript and production build checks, then validating desktop build behavior.
- Updated `ExportModal.tsx` so PDF export is disabled only in Tauri desktop with a visible `PDF (Coming Soon)` button state; web keeps active PDF export.
- Updated `README.md` export and desktop notes to document that desktop PDF export is currently marked Coming Soon while other formats remain available.
