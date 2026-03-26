# Contributing to Astra/log

Thank you for your interest in Astra/log. We welcome contributions that align with our mission of being a "Universal Bridge" for web application validation.

## Getting Started
* **Tech Stack**: We use React 19, TypeScript, Vite, Tailwind CSS v4, and the WebContainer API.
* **Dual-Platform Development**: We support both browser-based and native desktop versions via Tauri v2. Ensure changes are tested on both platforms.

## Principles for Contributors
1. **No Persistence**: Never implement features that require user accounts or database storage; a session reset must always lead to a clean slate.
2. **Consultant AI**: Ensure the AI remains a planning partner. Avoid "IDE Creep" like complex multi-file authoring or Git integration.
3. **Calm HUD**: Maintain the "nebula-glass" aesthetic. UI changes should feel high-depth and low-noise.

## AI Usage Policy
* **General AI Assistance**: We welcome the use of AI for architectural planning and code review, provided there is human oversight.
* **Strict Grok Prohibition**: The use of Grok to generate, refactor, or assist in any code contributing to this repository is strictly prohibited.
* **License Termination**: Using Grok-based code or publishing Grok-based versions of this software terminates your license.
* **Technical Enforcement**: Our backend and settings UI actively filter and block Grok-related configurations to maintain this boundary.

## AI Agent Instructions
If you are using an AI agent (e.g., Gemini, ChatGPT, Claude) to assist with development, you **must** ensure the agent reads the `AGENTS.md` file before making any changes.

## Changelog Requirements
Every contribution must update the `CHANGELOG.md` following the repository's established format:
* Append a new entry with the date and the name of the tool or human who made the change.
* Keep summaries brief and iterative.
* Document any incomplete or blocked work.

## Licensing
By contributing, you agree that your code will be licensed under the **Astra/log Source-Available License (SAL)**.