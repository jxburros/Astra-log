# Changelog

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
