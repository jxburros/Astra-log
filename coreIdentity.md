Core Identity & Strategic Values
The application is a "Transient Workspace" designed for rapid exploration, testing, and brainstorming. It operates on the principle that the value of a session lies in the insights gained, not the files saved.

Calm Futurism: The interface is a high-depth, "nebula-glass" environment using translucent layers, glassmorphism, and subtle radial gradients to minimize cognitive load.

Zero-Persistence by Design: There are no accounts, save states, or code-changing abilities. Once a session is cleared, all data—including the filesystem and chat history—is permanently destroyed.

The Universal Bridge: The app removes the "technical tax" of development, allowing non-coders to test complex projects simply by dragging and dropping a zip file.

Privacy of Thought: A strict boundary exists between AI-assisted brainstorming and private "stream-of-consciousness" notes.

Current Capabilities
In-Browser Node.js Environment: Runs full Node.js projects (Vite, Express, etc.) directly in the browser using WebContainer technology.

Automated Boot Hierarchy: A multi-tier system that identifies start scripts in package.json or README files to boot projects automatically, with an AI fallback for troubleshooting.

Context-Aware AI Brainstorming: An integrated assistant that reads project structures and file contents to provide step-by-step implementation guides.

Responsive Preview: A built-in browser with mobile, tablet, and desktop viewport modes and a navigable URL bar.

Offline Core: The terminal and preview functions remain fully capable as a standalone developer tool even when an AI provider is not connected.

Future Roadmap
1. Aesthetic & Workspace Refinement
Fluid Layout: A "middle-out" design with resizable panels, allowing users to prioritize the Preview or the Chat based on their current task.

Focus Mode: A "Zen" toggle that hides all technical UI (terminal, settings) to leave only the Preview and the private Scratch Pad.

Ambient Feedback: Subtle glowing "pulses" or status lights replace verbose text logs to indicate the dev server is rebuilding or healthy.

Intentional Destruction: A high-quality "dissolve" or "pixel-wipe" animation when a user clicks "New Project" to visually confirm the session is gone forever.

2. High-Speed Interaction
Offline Scratch Pad: A dedicated "Thought Buffer" for private notes that are never visible to the AI, ensuring a safe space for raw ideas.

Action Chips & Hints: The AI provides one-click buttons (e.g., "[Expand]", "[Skip]", "[Fixed]") to handle clarifying questions without requiring the user to type.

Passive Observation: The AI is tuned to handle stream-of-consciousness entries (e.g., "too small," "stupid quote") with minimal intrusion—often just a single emoji or brief confirmation.

Direct-Execute Diagnostic Buttons: Clickable terminal commands in the chat that pipe directly to the sandbox to test specific behaviors or environment states.

3. Security & The "Containment Scan"
AI Security Audit: An optional "Security Gate" where the AI scans the project (including package.json and entry points) for malicious code, obfuscated scripts, or dependency red flags before execution.

Strict Iframe Sandboxing: Hardened restrictions on the preview frame to prevent malicious apps from accessing the main UI or local storage.

Pre-Install Analysis: Automated flagging of projects that use suspicious preinstall or postinstall hooks.

Permission Prompts: A confirmation dialog for any terminal interaction initiated outside of manual typing to prevent unauthorized command execution.

4. Far-Future Exploration
Universal Runtime Support: Expanding beyond Node.js to support non-Node projects (e.g., Python, Ruby) through WebAssembly-based runtimes.

Mobile Emulation: True Android/iOS emulation and hardware API mocking (GPS, camera) for deep mobile testing.

Ecosystem Integration: One-click GitHub repository ingestion and the ability to export "Implementation Plans" directly as GitHub Issues or Trello templates.

AI App Reviewer: The AI "looks" at the rendered preview to provide notes on accessibility, color contrast, and UI/UX improvements.

The Artifact: High-Fidelity Export
Structured Summaries: Implementation plans are exportable as formatted Markdown or PDF documents categorized by UX, Logic, and Architecture.

Evolution Snapshots: The ability to "Snapshot" a plan at different intervals to see how ideas evolved before the session is wiped.

What the App Will NOT Do (Anti-Goals)
NO Persistence: No user accounts, "recent projects," or database storage. If you refresh, you start fresh.

NO Full IDE Capabilities: No complex file editing, Git integration, or multi-file code authoring.

NO Mandatory AI: The core sandbox and preview features will always remain functional for offline use.

NO Complexity Creep: Features will not be added that require understanding Git, Docker, or complex environment configurations.
