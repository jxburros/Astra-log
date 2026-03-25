<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Astra/log

An in-browser Node.js sandbox that lets you upload a zip file of any Node.js project, run it live inside a [WebContainer](https://webcontainers.io/), and chat with an AI assistant about your code — all without leaving the browser.

## Features

- **Zip upload** — drag-and-drop or click to upload a Node.js project zip; `npm install && npm run dev` runs automatically inside the WebContainer
- **Live preview** — responsive in-browser preview with mobile, tablet, and desktop viewport modes and a navigable URL bar
- **Interactive terminal** — full xterm.js shell backed by the WebContainer
- **AI chat panel** — context-aware chat that reads your project's file tree and source; supports multiple providers:
  - Google Gemini (`gemini-2.5-flash`)
  - OpenAI (`gpt-4o`)
  - Anthropic (`claude-3-5-sonnet`)
  - Local / Ollama (configurable endpoint)
- **Offline Scratch Pad** — fully local, session-only thought buffer that is visually distinct from chat, includes quick clear, keyboard-first access (`Ctrl/Cmd + .` to toggle, `Ctrl/Cmd + Shift + K` to focus), optional timestamps/sections, and quick-bullet mode
- **AI behavior layer + action chips** — passive handling for short inputs, concise structured responses, and one-click follow-up chips (`Expand`, `Clarify`, `What’s missing`)
- **Diagnostic command runner** — AI can suggest terminal commands in chat; users can click to run with explicit confirmation (never auto-executes)

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend:** Express.js (Node.js), serves Vite in dev and static build in production
- **Sandbox:** [@webcontainer/api](https://www.npmjs.com/package/@webcontainer/api)
- **Terminal:** [xterm.js](https://xtermjs.org/)

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Copy the example env file and fill in any values you need:
   ```
   cp .env.example .env
   ```
3. Run the app:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

> **AI provider setup:** Click the ⚙️ settings icon in the top-right corner of the app to choose your AI provider and enter your API key. Keys are stored locally in your browser and proxied securely through the backend.

## Build for Production

```
npm run build
npm start
```

## Desktop Installation (Tauri v2)

If you want to run Astra/log as a desktop application and produce a native installer (`.exe`, `.app`, etc.), you can build it with Tauri v2.

### Prerequisites

1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Install Rust + Cargo (required by Tauri):

   **Windows (PowerShell):**
   ```powershell
   winget install --id Rustlang.Rustup -e
   ```
   Then close/reopen your terminal and verify:
   ```powershell
   cargo --version
   ```

   **macOS / Linux:**
   ```bash
   curl https://sh.rustup.rs -sSf | sh
   ```
   Then close/reopen your terminal and verify:
   ```bash
   cargo --version
   ```

3. **Windows only:** install the "Desktop development with C++" workload from Visual Studio Build Tools (required by Tauri's native build pipeline).

4. **Windows only:** make sure Microsoft Edge WebView2 Runtime is installed (usually preinstalled on Windows 11).

### Troubleshooting

- If you see `'sh' is not a recognized command` on Windows, you are likely running the Unix/macOS Rust command (`curl ... | sh`). Use the Windows install command above instead.
- If you see `failed to run 'cargo metadata' ... program not found`, Cargo is not installed or not on your PATH. Reopen your terminal after installing Rust and run `cargo --version`.

### Build the desktop app

```bash
npm run desktop:build
```

The generated desktop bundles/installers will be created under `src-tauri/target/release/bundle/`.

### Run in desktop dev mode

```bash
npm run desktop:dev
```
