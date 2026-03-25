# Changelog

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

## 2026-03-25 - Codex
- Upgraded Scratch Pad as a core offline workspace primitive with keyboard-first access, quick clear, local-only session lifecycle, timestamp/section inserts, and quick bullet mode.
- Added AI behavior-layer controls in chat for passive short-input handling, reduced verbosity, and structured explanation-first responses.
- Implemented Action Chips (`Expand`, `Clarify`, `What’s missing`) as one-click follow-up prompts with no automatic execution.
- Added diagnostic command execution flow: AI-suggested fenced shell commands now render clickable run buttons, require user confirmation, and execute through the existing terminal shell pipeline.
