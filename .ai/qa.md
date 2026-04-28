---
app: Astra-log
qa_doc_version: 1
default_node_version: "18+"
default_package_manager: npm
default_branch: main
app_type: "React/Vite/Express/Tauri AI app review and sandbox workspace"
primary_focus:
  - dependency and build health
  - TypeScript validation
  - Vite web build
  - Express server startup
  - WebContainer ZIP ingestion
  - static and Node project detection
  - containment scan and permission dialog safety
  - iframe sandboxing
  - AI settings and provider behavior
  - local/Ollama model discovery
  - Scratch Pad session behavior
  - layout and responsive workspace behavior
  - artifact export
  - Tauri desktop build behavior
supported_qa_levels:
  - quick
  - core
  - desktop
  - release
---

# Astra-log QA Instructions

## Overview

Astra-log is an AI-assisted app review and sandbox workspace. It allows users to upload ZIP projects, inspect them, run them inside a WebContainer-powered environment, review app output in a preview iframe, use an AI chat panel, keep local Scratch Pad notes, and export structured artifacts.

The app has both:

1. A web/browser version.
2. A Tauri desktop version.

The QA system should treat Astra-log as a developer tool, not just a normal website. The most important user promise is that the app can safely inspect, mount, run, review, and reset uploaded projects without corrupting sessions, leaking sensitive information, or blocking the user interface.

The requested QA level will come from the central automation config.

Valid QA levels are:

- `quick`
- `core`
- `desktop`
- `release`

Each level includes the levels before it:

- `quick` = dependency, lint, build, and basic runtime smoke testing
- `core` = `quick` + main app workflows and browser-based behavior
- `desktop` = `quick` + `core` + Tauri desktop behavior
- `release` = all previous levels + security, stress, responsive, and edge testing

---

# Universal Safety Rules

Do not use production credentials.

Do not send real API requests to paid AI providers unless explicitly configured for test usage.

Do not place real OpenAI, Anthropic, Gemini, Ollama, or other provider credentials into reports.

Do not upload private customer code or sensitive files as test ZIPs.

Use only synthetic test ZIP projects.

Do not allow uploaded test projects to execute destructive commands.

Do not approve high-risk containment scan prompts unless the test explicitly requires verifying the warning/blocking flow.

Do not browse to untrusted external URLs from within the preview iframe.

Do not disable iframe sandboxing during QA.

Do not silently persist Scratch Pad contents beyond the current test session.

Do not treat environment-blocked desktop tests as app failures.

---

# Test Environment Expectations

## Required

- Node.js 18 or newer
- npm
- Git
- Modern Chromium-based browser
- Ability to run local Node/Express server
- Ability to inspect browser console
- Ability to inspect LocalStorage and SessionStorage

## Preferred

- Playwright or browser automation
- Ability to upload synthetic ZIP projects
- Ability to observe iframe behavior
- Ability to inspect network requests
- Ability to simulate narrow viewport sizes
- Ability to run tests on Windows because the target user environment includes Windows

## Optional / Conditional

- Rust / Cargo
- Tauri CLI
- WebView2 runtime on Windows
- Android Studio only if mobile packaging is introduced later
- macOS/Xcode only if macOS packaging is being validated

If Tauri desktop prerequisites are missing, mark desktop-specific checks as blocked by environment instead of failed.

---

# Known Project Scripts

The QA runner should inspect `package.json` first, but expected scripts include:

~~~bash
npm run build
npm run dev
npm run lint
npm run preview
npm run start
npm run desktop:build
npm run desktop:dev
~~~

The project has preflight scripts for dev/build and desktop workflows, including lightningcss repair and Cargo detection. Treat clear preflight guidance as useful output, not necessarily an app failure.

---

# QA Level: quick

## Goal

Verify that Astra-log installs, type-checks, builds, and starts at a basic level.

Use this for fast daily checks.

---

## quick.1 Dependency Resolution

Run:

~~~bash
npm install
~~~

Validate:

- Installation completes successfully.
- Node.js version is 18 or newer.
- No dependency resolution failures occur.
- Native optional dependencies are handled correctly.
- `scripts/ensureLightningcssBinary.mjs` does not fail during later preflight hooks.

Record:

- Node version
- npm version
- install exit code
- vulnerability summary, if available

Recommended additional command:

~~~bash
npm audit --audit-level=critical
~~~

A nonzero audit result should be reported as a security finding, but it should not automatically block all other QA unless it affects app startup, bundling, server behavior, or credential exposure.

---

## quick.2 TypeScript / Lint Validation

Run:

~~~bash
npm run lint
~~~

Validate:

- TypeScript validation completes successfully.
- No `tsc --noEmit` errors occur.
- SVG module declarations and app types are valid.
- No broken imports exist.

Failure condition:

- Any TypeScript compile error is High severity.

---

## quick.3 Production Build

Run:

~~~bash
npm run build
~~~

Validate:

- Vite web build completes successfully.
- Express server bundle is generated.
- `dist/server.cjs` exists after build.
- Build does not leak secrets into client bundle.
- Prebuild hooks complete successfully.
- No fatal Vite, esbuild, or TypeScript errors occur.

Check for:

- `dist/`
- `dist/server.cjs`
- generated web assets
- warnings about environment variables or bundled API keys

Failure condition:

- Build failure is High severity.
- Any evidence of API keys bundled into client assets is Critical severity.

---

## quick.4 Server Startup

After a successful build, run:

~~~bash
npm run start
~~~

Validate:

- Server starts.
- Server binds to configured or fallback port.
- App is reachable in browser.
- Basic app shell loads.
- No fatal server startup errors occur.

If `npm run start` is unavailable or build did not generate `dist/server.cjs`, report as blocked or failed depending on cause.

---

## quick.5 Dev Server Startup

Run:

~~~bash
npm run dev
~~~

Validate:

- Express/tsx development server starts.
- Browser app shell loads.
- Cross-origin isolation headers are present where required.
- Browser console has no fatal startup errors.
- The upload/drop area appears.
- Terminal panel initializes.
- Preview panel area initializes.
- Chat/Scratch areas initialize.

For unattended automation, start server, perform a basic page load, capture logs, then stop server.

---

## quick.6 Preview Server Startup

Run:

~~~bash
npm run preview
~~~

Validate:

- Vite preview starts when build assets exist.
- App shell loads.
- No fatal preview errors occur.

If preview requires build first, ensure `npm run build` has completed.

---

## quick Pass Criteria

`quick` passes if:

- Dependencies install.
- `npm run lint` passes.
- `npm run build` passes.
- Server or dev startup succeeds.
- App shell loads.
- No fatal startup errors occur.
- No secret exposure is detected in obvious build output.

---

# QA Level: core

## Goal

Validate the primary Astra-log web app workflows.

This level includes everything in `quick`.

Use this after meaningful web-app changes, AI workflow changes, layout changes, ZIP ingestion changes, export changes, or security-dialog changes.

---

## core.1 Initial App Shell

Open the app in browser.

Validate:

- Header branding loads.
- Upload ZIP affordance is visible.
- Terminal panel initializes.
- Preview panel initializes.
- Chat panel initializes.
- Scratch Pad initializes.
- Settings gear is visible.
- Help or tour controls are visible where expected.
- No blocking modal appears unexpectedly after first-run flow is handled.

Check browser console for fatal errors.

---

## core.2 Welcome, Tour, and Help

Validate onboarding and help flows:

1. Fresh browser profile or cleared storage.
2. Open app.
3. Confirm welcome modal appears once.
4. Choose "Take a quick tour."
5. Validate tour steps highlight expected panels.
6. Confirm tooltip positioning remains visible on short viewports.
7. Complete tour.
8. Refresh app.
9. Confirm welcome does not reappear unexpectedly.
10. Open Help Guide manually.

Expected storage:

~~~text
localStorage.astra_welcome_seen
~~~

Failure conditions:

- Tour button off-screen is Medium or High depending on severity.
- Welcome modal blocking normal usage after dismissal is High.

---

## core.3 ZIP Upload and Project Detection

Test ZIP ingestion using synthetic fixtures.

Use at least these ZIP types:

1. Simple Node/Vite app with package.json at root.
2. Static app with index.html at root.
3. Nested Node app where package.json is inside a subfolder.
4. Nested static app where index.html is inside a subfolder.
5. Unknown/invalid ZIP structure.

Validate:

- ZIP can be uploaded by file picker.
- ZIP can be uploaded by drag-and-drop.
- App root is detected correctly.
- Project type is detected correctly: `node`, `static`, or `unknown`.
- Static projects skip `npm install`.
- Node projects run appropriate boot flow.
- Unknown projects show clear "No valid project entry point detected" feedback while keeping terminal available.
- Nested projects mount only the detected app subtree.

Relevant expected behavior:

- ZIP parser should locate the shallowest package.json or index.html.
- WebContainer should mount the selected subtree, not necessarily the archive root.

Failure conditions:

- Wrong app root detection is High.
- Static project forced through Node install is Medium or High.
- Unknown project white-screening is High.

---

## core.4 WebContainer Boot and Reset

Validate WebContainer session lifecycle:

1. Upload valid Node ZIP.
2. Wait for boot.
3. Confirm terminal reports boot/install/start progress.
4. Confirm preview loads when server is ready.
5. Press New Project.
6. Confirm confirmation modal appears.
7. Confirm reset completes.
8. Upload another ZIP.
9. Confirm second project does not hang at "Booting."

Validate:

- `WebContainer.boot()` is not called twice in a way that hangs.
- Running boot process is killed on reset.
- Running npm install is killed on reset.
- Shell process is killed on reset.
- File clearing continues even if one file deletion fails.
- Iframe context is refreshed between sessions.
- Drag overlay is not stuck after reset.

Failure conditions:

- Permanent "Booting…" state is High.
- New Project fails to clear session is High.
- Prior project contaminates next project is Critical if data leakage occurs.

---

## core.5 Containment Scan

Use synthetic package.json files to trigger containment scan warnings.

Test cases:

- Safe package.json.
- Lifecycle script that appears risky.
- `sudo` usage.
- `npx <package>` usage.
- shell script invocation such as `bash script.sh` or `sh script.sh`.
- non-registry dependency source such as GitHub, GitLab, Bitbucket, URL, or file dependency.
- peerDependencies containing non-registry sources.

Validate:

- Scan modal appears for warning/high-risk findings.
- Findings are understandable.
- User can cancel safely.
- User can proceed only with explicit confirmation.
- Canceling does not continue install.
- Starting over dismisses pending scan modal.
- Stale scan promises are resolved or canceled safely.

Failure conditions:

- High-risk script proceeds without user confirmation is Critical.
- Scan modal cannot be dismissed is High.
- Cancel still runs install is Critical.

---

## core.6 Permission Dialog for Commands

Validate AI-suggested or app-suggested terminal commands require permission.

Use a safe synthetic command, then a risky-looking command.

Validate:

- Permission dialog appears before command execution.
- User can approve.
- User can cancel.
- Canceled command does not execute.
- Pending command is cleared on reset.
- Permission dialog is dismissed on New Project.
- Native `window.confirm()` is not used for this flow.

Failure condition:

- Command executes without permission is Critical.

---

## core.7 Preview Iframe Sandboxing

Validate preview iframe security boundaries.

Check iframe attributes:

- `sandbox`
- `referrerPolicy="no-referrer"`

Validate sandbox behavior:

- Preview cannot navigate top-level app.
- Preview cannot escape into parent UI.
- Referrer does not leak main app URL.
- Popups/modals behave only as permitted.
- Uploaded app preview remains isolated from Astra-log controls.

Failure condition:

- Preview content can take over top-level Astra-log UI is Critical.

---

## core.8 Layout and Responsive Workspace

Test layouts:

- Standard
- Architect
- Zen Focus
- Custom

Validate:

- Layout switcher works.
- Terminal, Preview, Chat, and Scratch panels appear as expected.
- Panels can collapse and restore.
- Custom layout can move panels between columns.
- Custom layout column count can change.
- Custom layout lock/edit toggle works.
- Minimized tray restores hidden panels.
- Resizing panels does not overflow or clip controls.
- Layout settings persist in SessionStorage.
- Mobile/drawer layout activates below expected breakpoint.
- Terminal auto-collapses around narrow viewports where expected.

Failure conditions:

- Panel permanently disappears with no restore path is High.
- Layout overflow blocking core controls is Medium or High.
- Dragging panel triggers ZIP upload overlay is Medium or High.

---

## core.9 Scratch Pad

Validate Scratch Pad behavior:

- Notes can be typed.
- Notes are session-local.
- Notes are not sent to AI unless explicitly staged.
- "Stage for AI" creates clear staged indicator.
- Staged notes can be discarded.
- Staged notes are cleared after use.
- Clear Notes does not freeze page.
- Bullets mode does not rewrite existing content.
- Bullets mode does not split typed characters across lines.
- Keyboard shortcuts work:
  - Ctrl + .
  - Ctrl + Shift + K
  - Cmd/Ctrl + K where applicable

Failure conditions:

- Scratch notes sent to AI without explicit staging is Critical.
- Clear Notes freezes page is High.
- Existing notes corrupted by formatting mode is Medium or High.

---

## core.10 AI Settings and Provider Behavior

Validate Settings modal.

Providers to test when available:

- Gemini
- OpenAI
- Anthropic
- Local/Ollama

Validate:

- Provider selection persists.
- API key input is not leaked to logs or URL query strings.
- Missing API key shows clear error or settings affordance.
- Settings gear shows visual indication when cloud provider lacks key.
- Custom instructions save correctly.
- Grok policy warning blocks restricted model/local URL/custom instruction entries.
- Model discovery works for configured provider where test credentials are available.
- Local/Ollama model discovery hits configured local URL safely.
- Only `http://` and `https://` local/Ollama URLs are accepted.

Failure conditions:

- API key appears in URL query string is Critical.
- API key bundled into production client assets is Critical.
- Grok policy can be bypassed through custom instructions is High.
- `file://` or other invalid scheme accepted as Ollama URL is High.

---

## core.11 Chat Panel and AI Review

Validate chat panel without requiring paid provider calls unless credentials are configured.

Test:

- Initial assistant greeting.
- Concise mode toggle.
- Dynamic quick replies only when appropriate.
- "Review App" action availability when chat has messages.
- AI troubleshooting request from terminal context if supported.
- Missing API key error handling.
- Error messages are excluded from exported artifacts.

Failure conditions:

- Chat hard-crashes app when provider missing key is High.
- Error text included in exported implementation artifact is Medium or High.

---

## core.12 Artifact Export

Validate export artifact modal.

Test styles:

- Simple recap
- Implementation plan
- Structured fix list

Test formats:

- Markdown
- PDF where available
- HTML
- JSON
- TXT

Validate:

- Export modal opens.
- Sections parse correctly.
- Snapshot current plan works.
- Compare snapshots shows visual diff.
- Error messages are filtered from artifacts.
- Desktop PDF export is correctly disabled or marked coming soon if applicable.
- Scratch Pad is not included unless explicitly selected or invoked.

Failure conditions:

- Export includes API key or secrets is Critical.
- Export includes unrequested private Scratch Pad content is Critical.
- Export button generates unusable empty files is Medium.

---

## core Pass Criteria

`core` passes if:

- All required `quick` checks pass or are clearly documented.
- Main browser app loads and can complete onboarding.
- ZIP upload works for basic synthetic projects.
- WebContainer session can start and reset.
- Containment scan and permission dialogs block risky flows appropriately.
- Iframe sandboxing remains intact.
- Layouts and Scratch Pad remain usable.
- Settings do not leak credentials.
- Artifact export works for core formats.

---

# QA Level: desktop

## Goal

Validate Tauri desktop behavior.

This level includes everything in `quick` and `core`.

Use this after desktop, Tauri, installer, icon, local file, or native-shell changes.

---

## desktop.1 Cargo and Tauri Prerequisite Check

Run:

~~~bash
npm run desktop:build
~~~

or, for faster validation:

~~~bash
npm run desktop:dev
~~~

Validate:

- `scripts/ensureCargo.mjs` runs before Tauri invocation.
- If Cargo is missing, the script prints clear platform-specific install guidance.
- Missing Cargo is reported as environment-blocked unless the test environment claims to support desktop builds.
- If Cargo exists, Tauri command proceeds to normal build/dev behavior.

Failure condition:

- Cryptic `program not found` without guidance is Medium or High.

---

## desktop.2 Desktop Development Launch

Run:

~~~bash
npm run desktop:dev
~~~

Validate:

- Tauri dev shell launches if environment supports it.
- Window title is Astra-log.
- App shell loads.
- AI settings work in desktop mode.
- Desktop direct AI client path works where configured.
- Desktop fallback behavior is clear when keys or local provider are missing.

Blocked if desktop GUI cannot run in the environment.

---

## desktop.3 Desktop Production Build

Run:

~~~bash
npm run desktop:build
~~~

Validate:

- Tauri schema validation passes.
- Product name is valid.
- Bundle identifier is valid.
- NSIS / Windows installer config is valid where applicable.
- License/TOS is readable.
- Header/sidebar installer branding assets exist.
- Icons are present.
- Version metadata is correct.

Failure conditions:

- Tauri schema validation failure is High.
- Installer license unreadable is High.
- Missing or invalid icon assets are Medium.

---

## desktop.4 Desktop Reset and Dialog Behavior

In desktop runtime, validate:

- New Project uses React modal, not `window.confirm`.
- Clear Notes does not use blocking native confirm.
- Permission dialog behaves consistently.
- Containment scan modal behaves consistently.
- File picker / ZIP upload works.
- Reset kills active install/boot/shell processes.

Failure condition:

- Native dialog silently fails or blocks workflow is High.

---

## desktop.5 Desktop Export Behavior

Validate:

- Markdown export works.
- HTML export works.
- JSON export works.
- TXT export works.
- PDF export is either functional or clearly marked Coming Soon in desktop.
- Export paths and file dialogs behave safely.

Failure condition:

- Desktop export silently fails without feedback is Medium or High.

---

## desktop Pass Criteria

`desktop` passes if:

- Desktop prerequisites are either satisfied or clearly reported as blocked.
- Tauri dev/build behavior is valid in supported environments.
- Installer metadata and assets are valid.
- Desktop-specific dialogs and reset flows work.
- Desktop export behavior matches documented limitations.

---

# QA Level: release

## Goal

Perform deep release-level testing across security, resilience, responsive design, uploaded project safety, and edge cases.

This level includes everything in `quick`, `core`, and `desktop`.

Use before a release, demo, handoff, installer build, or major architectural change.

---

## release.1 Synthetic ZIP Fixture Matrix

Run a broad fixture set.

Required fixtures:

1. Minimal static HTML app.
2. Static app nested one folder deep.
3. Static app nested multiple folders deep.
4. Minimal Vite app.
5. Node app with `package.json` nested one folder deep.
6. Monorepo-style ZIP with multiple package.json files.
7. ZIP with package.json but no runnable scripts.
8. ZIP with invalid package.json.
9. ZIP with huge number of files.
10. ZIP with unsupported structure.
11. ZIP with path traversal-like entries if safely constructible.
12. ZIP with risky scripts and non-registry dependencies.

Validate detection, safety warnings, mounting, reset, and error messaging for each.

Failure condition:

- Unsafe ZIP escapes intended mount or file boundary is Critical.
- Wrong app root selected in common nested cases is High.

---

## release.2 Uploaded Project Security

Validate uploaded project cannot:

- Escape iframe sandbox.
- Navigate parent window.
- Read Astra-log LocalStorage.
- Read Scratch Pad contents.
- Access AI settings.
- Access API keys.
- Trigger terminal commands without permission.
- Trigger install after containment scan cancellation.

Failure condition:

- Uploaded app can access host app secrets or controls is Critical.

---

## release.3 Credential and Secret Handling

Test with fake API keys only.

Validate:

- Keys are not written to console logs.
- Keys are not included in exported artifacts.
- Gemini keys are sent via header, not query string.
- No `.env` key is bundled into production JS.
- Settings are stored only as intended.
- Missing keys produce helpful feedback.
- Error messages do not leak key values.

Failure condition:

- Any API key appears in URL, report, artifact, or client bundle is Critical.

---

## release.4 Offline and Local Provider Behavior

Test with internet disabled where practical.

Validate:

- App shell loads from local server or desktop build.
- Local/Ollama provider path can be configured without cloud.
- Cloud provider failures are explained clearly.
- Uploaded static projects remain previewable where possible.
- No silent cloud calls occur when Local/Ollama is selected.
- No unexpected sync behavior occurs.

Failure condition:

- Local/Ollama selection still sends cloud requests is Critical.

---

## release.5 Stress and Long-Session Stability

Stress scenarios:

- Repeatedly upload and reset 20 synthetic projects.
- Upload while previous session is busy.
- Drop ZIP while session is already running.
- Start install then press New Project.
- Trigger containment scan then press New Project.
- Trigger permission dialog then press New Project.
- Resize panels repeatedly during preview.
- Switch layouts repeatedly.
- Export multiple snapshots.
- Keep session active for at least 30 minutes if practical.

Validate:

- No white-screen.
- No permanent boot hang.
- No stuck overlays.
- No stale iframe content.
- No runaway node process.
- No memory behavior that obviously degrades normal use.

Failure condition:

- User becomes unable to start a new project without page reload is High.
- Prior session continues executing after reset is Critical if it can modify state.

---

## release.6 Responsive and Accessibility Review

Test viewports:

- 390 x 844 mobile
- 768 x 1024 tablet
- 1024 x 768 small laptop
- 1366 x 768 laptop
- 1920 x 1080 desktop

Validate:

- Controls remain visible.
- Panels do not overflow off-screen.
- Terminal auto-collapse works at narrow widths.
- Tour tooltip remains inside viewport.
- Keyboard navigation is usable.
- Buttons have accessible names or titles.
- Color contrast is acceptable.
- Focus states are visible.
- High-density layouts remain readable.

Failure condition:

- Primary controls inaccessible at common viewport is High.
- Tour or modal traps user without visible next/close button is High.

---

## release.7 Export Integrity and Snapshot Diffing

Generate representative chat/artifact content.

Validate:

- Markdown content is structured.
- HTML content is readable.
- JSON content is valid.
- TXT content is readable.
- PDF behavior matches environment.
- Snapshot labels and timestamps are correct.
- Compare view accurately marks additions and deletions.
- Error responses are filtered.
- Scratch Pad content inclusion is explicit only.

Failure condition:

- Exported implementation plan omits selected fix items is High.
- Export includes unrequested private notes is Critical.

---

## release.8 Installer and Desktop Package Review

If environment supports desktop packaging:

Validate:

- Windows NSIS installer builds.
- License/TOS page is readable.
- Header/sidebar branding visible.
- Installer icon correct.
- App icon correct.
- Window title correct.
- Version metadata correct.
- Install/uninstall behavior works in disposable VM if available.

Blocked if environment lacks required desktop packaging tools.

---

## release Pass Criteria

`release` passes if:

- All required lower-level checks pass or are clearly documented.
- ZIP fixture matrix behaves safely.
- Uploaded projects cannot escape sandbox or access host secrets.
- Credentials are not leaked.
- Reset and long-session behavior remain stable.
- Responsive layouts are usable.
- Artifact export is reliable.
- Desktop installer behavior is valid or clearly blocked by environment.

---

# QA Level Selection Guidance

## quick

Use this for fast daily checks.

Includes:

- Dependency install
- TypeScript/lint check
- Production build
- Server/dev startup
- Preview startup
- Basic app-shell smoke test

This is the default daily level.

---

## core

Use this after normal feature work.

Includes everything in `quick`, plus:

- Browser app shell
- Welcome/tour/help
- ZIP upload
- WebContainer boot/reset
- Containment scan
- Permission dialog
- Iframe sandbox
- Layouts
- Scratch Pad
- AI settings
- Chat panel
- Artifact export

This validates the main Astra-log product experience.

---

## desktop

Use this after desktop/Tauri changes.

Includes everything in `quick` and `core`, plus:

- Tauri dev
- Tauri build
- Cargo preflight
- Installer metadata
- Desktop dialogs
- Desktop export behavior

This validates the native app path.

---

## release

Use this before major releases, demos, installers, or handoff.

Includes everything in `quick`, `core`, and `desktop`, plus:

- Large ZIP fixture matrix
- Uploaded project security tests
- Credential leak checks
- Offline/local-provider checks
- Stress testing
- Responsive/accessibility testing
- Export integrity
- Installer/package review

This is the deepest QA level.

---

# Recommended Report Format

The QA agent should produce a report using this structure:

## Summary

- App:
- Repo:
- Branch:
- QA level requested:
- QA level completed:
- Environment:
- Overall result: Pass / Pass with warnings / Fail / Blocked
- Top risks:

## Commands Run

For each command:

- Command:
- Exit code:
- Result:
- Important output:
- Related finding ID, if any:

## Browser / UI Checks

For each browser-level check:

- Check:
- Status:
- Evidence:
- Console errors:
- Screenshots, if available:
- Related finding ID, if any:

## Findings

For each finding:

- ID:
- Title:
- Level:
- Severity:
- Confidence:
- Category:
- Steps to reproduce:
- Expected:
- Actual:
- Evidence:
- Suggested fix:
- Recommended owner:
- Recommended agent for implementation:

## Blocked Items

List any checks that could not be completed because of:

- Missing environment
- Missing credentials
- OS limitations
- Missing desktop tooling
- Missing browser automation
- Missing synthetic fixtures
- Safety restrictions

Do not mark environment-blocked checks as application failures.

## Suggested Follow-Up

List:

- Suggested next QA level
- Code review areas
- Implementation plan candidates
- Tests that should be automated
- Questions for the human reviewer

---

# Finding Severity Guide

## Critical

Use for:

- API key or secret exposure
- Uploaded project escaping sandbox
- Uploaded project accessing host app data
- Terminal command executing without permission
- High-risk install proceeding after cancellation
- Cross-session data leakage
- Prior session executing after reset in a dangerous way
- Production secret bundled into client assets

## High

Use for:

- Build failure
- TypeScript failure
- App cannot load
- Permanent WebContainer boot hang
- New Project/reset broken
- ZIP ingestion broken for common projects
- Desktop build schema failure
- Main controls inaccessible
- Blocking modal that cannot be dismissed

## Medium

Use for:

- Layout overflow
- Export formatting issue
- Missing affordance
- Nonfatal console errors
- Tour positioning bug
- Settings UX confusion
- Desktop export limitation without clear messaging

## Low

Use for:

- Cosmetic issues
- Minor copy issues
- Minor spacing/responsive polish
- Non-blocking warnings

## Informational

Use for:

- Suggestions
- Blocked checks
- Environment notes
- Future automation opportunities

---

# Agent Instructions

When performing QA:

1. Read this file first.
2. Determine requested QA level from the central automation config.
3. Run all checks for that level and all lower levels unless explicitly instructed otherwise.
4. Inspect `package.json` before assuming script availability.
5. Capture command output, browser console evidence, and screenshots where possible.
6. Do not treat environment-blocked checks as application failures.
7. Do not fabricate results for checks that were not run.
8. Separate confirmed bugs from suggestions.
9. Prefer reproducible findings over vague commentary.
10. Produce a final Markdown QA report.
11. Never claim a level passed unless its required checks were actually completed.
12. Mark partially completed levels as “Pass with warnings,” “Fail,” or “Blocked,” as appropriate.
13. Treat credential exposure and sandbox escape findings as Critical.
14. Use synthetic ZIP fixtures only.
15. Do not include real API keys, private code, or sensitive uploaded project contents in reports.

---

# Normal Usage Recommendation

Use this pattern:

- `quick` for daily checks.
- `core` after meaningful web app, AI, ZIP ingestion, export, layout, or safety changes.
- `desktop` after Tauri, installer, native shell, icon, desktop export, or Rust/Cargo-related changes.
- `release` before public demos, installer builds, major releases, or handoff.
