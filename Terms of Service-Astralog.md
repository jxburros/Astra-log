# Astra/log Terms of Service
**Effective Date: March 26, 2026**

Welcome to Astra/log. By using this application, you agree to the following terms. Please read them carefully.

### 1. The Nature of Service (Transient Workspace)
Astra/log is a "Transient Workspace" designed for the rapid exploration and architectural planning of web applications.
* **Zero-Persistence**: Astra/log does not host, store, or collect user data. Every session is a clean slate; once a session is reset or the browser is closed, all filesystem data and chat history are permanently destroyed.
* **Technical Consultant**: The integrated AI is designed as a brainstorming and planning partner, not an automated coding agent.

### 2. User Responsibilities & Security
* **ZIP Ingestion**: You are responsible for the contents of the ZIP files you upload. While Astra/log performs an automated "Containment Scan" to identify suspicious scripts or dangerous patterns (e.g., `sudo`, `npx`, `eval`), this scan is not exhaustive.
* **Execution Risk**: You assume all risk for executing terminal commands or running Node.js projects within the WebContainer sandbox.
* **AI Suggestions**: AI-suggested terminal commands require explicit user confirmation before execution. You are responsible for verifying the safety of any command you authorize.

### 3. Prohibited Use: Grok Policy
Astra/log maintains a strict policy regarding the use of Grok-based models due to significant security and ethical concerns regarding their development and the actions of Elon Musk.
* **Prohibition**: The use of Grok on this platform is strictly prohibited.
* **Automated Scanning**: The application actively scans for the word "grok" in manual and local model configurations.
* **Violation**: While users may technically attempt to implement an open-source version of Grok via a local provider, doing so is a direct violation of these Terms of Service.
* **Assumption of Risk**: Astra/log provides zero technical support for any session involving Grok. Users who bypass these restrictions do so at their own risk and acknowledge that such use may lead to session termination or restricted access to platform features.

### 4. Privacy & Data Handling
* **BYOK (Bring Your Own Key)**: AI interactions are powered by the API keys you provide (Gemini, OpenAI, Anthropic, or Local). These keys are stored locally in your browser and are never stored on our servers.
* **No Data Collection**: Because we do not collect, host, or store your data, we do not sell user information.

### 5. Artifacts & Intellectual Property
* **Ownership**: You retain full ownership of all implementation plans and artifacts exported from the system (Markdown, PDF, JSON, etc.).
* **Disclaimer**: Exported artifacts are derived from AI-generated planning output and are provided "as-is" without warranty of any kind.

### 6. Limitation of Liability
Astra/log is provided "as-is" and "as-available." We do not guarantee that the service will be uninterrupted or error-free. To the maximum extent permitted by law, Astra/log and its developers shall not be liable for any damages resulting from your use of the service, including but not limited to data loss (consistent with our zero-persistence model) or security vulnerabilities within your uploaded code.

### 7. Changes to Terms
As Astra/log is currently in its V1.0-RC (Release Candidate) phase, these terms may be updated to reflect new features or security protocols. Continued use of the app after such changes constitutes acceptance of the new terms.