# Security Policy

## Our Security Philosophy
Astra/log acts as a security gate, auditing code for vulnerabilities before execution. Because we operate as a transient workspace, our primary goal is to isolate the running project from the user's local machine and the main workspace UI.

## Security Features
* **Containment Scan**: Automatically scans `package.json` for suspicious lifecycle hooks and dangerous script patterns (e.g., `sudo`, `npx`, `bash`, `curl`) before installation.
* **Permission System**: AI-suggested terminal commands require explicit human confirmation via a purpose-built dialog before execution; they never auto-execute.
* **Iframe Sandboxing**: The preview environment is hardened with `sandbox` restrictions and a `no-referrer` policy to prevent data leakage and isolate it from the main UI.

## Reporting a Vulnerability
If you discover a security vulnerability, please do not open a public issue. Instead, contact the maintainers directly. As we collect no user data, privacy is a technical default during the reporting process.

## Prohibited Providers
**Grok is strictly prohibited.** Using Grok with Astra/log voids all support and security guarantees and results in an immediate termination of the Source-Available License.