Core Identity: The Transient Workspace
The platform is a specialized, App Previewer and Transient Workspace designed for the rapid exploration, validation, and architectural planning of web applications. It operates on the core principle that the value of a developer’s session lies in the high-fidelity insights and plans gained, not the files saved. By combining an in-browser Node.js sandbox with context-aware AI, it allows users to move from a raw source file to a running preview in seconds, completely bypassing the "technical tax" of local environment configuration.

The "Little Previewer" Concept: At its heart, the app is a high-speed engine for viewing and testing projects without the commitment of a permanent setup.

Zero-Persistence Architecture: The app is designed for "now"; once a session is reset or a tab is closed, the entire filesystem and chat history are permanently destroyed.

The Universal Bridge: It acts as a translation layer between complex GitHub repositories and a workable app, making it accessible for non-coders to test projects simply by dragging a zip file.

Calm Futurism: The user interface is a high-depth "nebula-glass" environment that uses translucent layers and subtle gradients to create a focused, high-end HUD experience.

Privacy of Thought: A strict boundary is maintained between public AI-assisted brainstorming and the private "Offline Scratch Pad" for raw, unfiltered ideas.

Local-First Security: By running the environment entirely in the browser's memory via WebContainers, the app protects the user's local operating system from potentially malicious code.

Independence from AI: While AI enhances the experience, the core terminal and preview functions are built to be powerful, standalone tools that work perfectly offline.

Design Philosophy & Origin
The platform's design is heavily influenced by the creator's personal workflow frustrations and a commitment to user-centric security. It is built to solve the "ZIP Loop"—the repetitive, annoying process of building in GitHub, exporting, unzipping, and rebuilding just to test a single bug fix.

Solving the "ZIP Loop": The app exists to collapse the cycle of export-unzip-build-test into a single, frictionless drag-and-drop action.

Freedom of Choice (BYOK): The "Bring Your Own Key" approach provides users with the freedom to choose their preferred AI provider (Gemini, OpenAI, Anthropic, or Local models) while keeping the app's operational costs sustainable.

Prohibition of Grok: The platform has a strict policy never to incorporate Grok as an AI provider.

Zero Data Hosting: The app does not host, store, or collect user data because hosting is expensive, and the safest way to protect data is to never have it.

Ethical Data Practice: We do not sell data because we do not collect any; our architecture is built to ensure that user privacy is a technical default, not just a promise.

Intentional AI Integration: AI was added specifically to remove the "middle step" of moving manual notes to an LLM for cleanup; here, the AI already has the context of the project to make informed plans.

The Consultant, Not the Coder: The AI is intentionally designed as a brainstorming and planning partner rather than a "Coding Agent," as powerful coding-focused tools already exist elsewhere.

Accessibility for Non-Coders: One of the primary drivers for the app was to make sharing projects easier for people who are overwhelmed by the steps required to start a GitHub repo.

Current Capabilities
The current version of the app provides a robust, in-browser development environment that leverages cutting-edge web technologies to create a secure sandbox. It is already a capable tool for developers who need to quickly validate changes in a "throwaway" environment.

In-Browser Node.js Sandbox: Utilizing the WebContainer API, the app runs full Node.js projects (Vite, Express, etc.) directly in the browser's memory.

Multi-Tier Boot Hierarchy: The app automatically identifies start scripts in package.json or README files to boot projects, with an AI fallback system for troubleshooting failures.

Interactive Xterm.js Terminal: A full shell backed by the WebContainer allows for manual command execution and real-time interaction with the sandbox.

Context-Aware AI Chat: The integrated assistant reads the project structure and file contents to assist in generating implementation plans and architecture guides.

Responsive Multi-Viewport Preview: A navigable preview bar supports mobile, tablet, and desktop modes to test responsiveness instantly.

Tauri v2 Desktop Wrapper: The application can be built as a native desktop application for Windows, macOS, and Linux.

Manual Boot Overrides: Even without AI, users can use the terminal to manually run npm start or other commands to see their app in action.

Planned Features & Future Roadmap
The roadmap focuses on deepening the app's specificity as an architectural planning tool and expanding its reach to non-Node.js ecosystems and mobile platforms. The goal is to evolve the "Little Previewer" into a universal engine for application validation.

Fluid "Middle-Out" Layout: Transitioning to a design with resizable panels so users can prioritize the Preview or the Chat based on their immediate task.

The "Containment Scan": An optional AI security gate that audits package.json and entry points for malicious code or dependency red flags before installation.

Offline Thought Buffer: Implementing a dedicated "Scratch Pad" component for private notes that are never sent to AI providers.

Action Chips & Hints: AI-generated buttons (e.g., "[Expand]", "[Skip]") to handle clarifying questions with a single click, reducing typing friction.

Direct-Execute Diagnostic Buttons: Clickable terminal commands suggested by the AI that can be piped directly to the sandbox for immediate testing.

Zen/Focus Mode: A toggle to hide all technical UI, leaving only the Preview and the private Scratch Pad for pure observation.

Intentional Destruction Visuals: High-quality "pixel-wipe" or "dissolve" animations to confirm that a session and its data have been permanently wiped.

High-Fidelity Artifact Exports: Exporting implementation plans as structured Markdown or PDF documents categorized by UX, Logic, and Architecture.

Universal Runtime Support: Exploring WebAssembly-based runtimes to support non-Node projects such as Python or Ruby.

Mobile & Hardware Emulation: Far-future plans for true Android/iOS emulation and mocks for GPS or camera APIs.

Ecosystem Integration: One-click GitHub repository ingestion and the ability to export planning notes directly as GitHub Issues or Trello templates.

Technical Information Repository: An internal and online repository the AI can point to for more specific, high-quality coding and testing advice.

What the App Will NOT Do (Anti-Goals)
To maintain its identity as a focused, transient tool, the platform explicitly avoids features that lead to complexity creep or data management burdens.

NO Persistence: We will not implement accounts, "recent projects," or database storage; a refresh always leads to a clean slate.

NO Data Sales: Because we collect no data, we will never sell user information.

NO Full IDE Features: We are not a replacement for VS Code and will not add complex file editing or Git integration.

NO Automated Coding Agent: We prioritize previewing, planning, and architectural guidance over automated code-writing.

NO Mandatory AI: The core sandbox and terminal functions will always remain functional for offline use without an API key.

NO Complexity Creep: We will not add features that require users to understand Git, Docker, or complex environment configurations to see a preview.
