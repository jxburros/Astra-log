# Astra/log — QA Bug Report

**Tested:** 2026-04-20 **Build under test:** `http://localhost:3000` (dev build, Vite; shared repo with the desktop app) **Environment:** Chrome, viewport 1037×739 CSS px (DPR 2\) **Scope:** Medium pass, focused on core functionality and performance / console errors **Tester:** Claude (assisted QA)

---

## Summary

Eleven issues found across the onboarding tour, terminal panel, scratch pad, and artifact export. Severity breakdown: two P1 (page freeze on Clear Notes; onboarding tour unreachable on common viewport height), four P2 (terminal panel overflows viewport; xterm.js exceptions on panel toggle; bullets mode retroactively breaks headings/timestamps; typing while bullets mode is enabled splits characters across lines), and five P3 (minor UX/consistency).

Two findings (the freeze and onboarding blockage) are likely to block real users from completing the app's intended first-run flow.

---

## Severity key

- **P1** — Blocks a core flow or leaves the app unusable.  
- **P2** — Real functional defect; workaround exists but UX suffers.  
- **P3** — Minor UX, polish, or inconsistency.

---

## Bugs

### 1\. \[P1\] Clicking "Clear notes" freezes the page / renderer

**Where:** Scratch Pad → trash-can "Clear notes" button (bottom-right). **Severity:** P1 **Repro:**

1. Open the app; dismiss onboarding.  
2. Type anything into the Scratch Pad.  
3. Click the Clear Notes (trash) icon in the Scratch Pad footer.

**Observed:** The tab becomes unresponsive. Subsequent `document.readyState` evaluations, screenshots, and navigations time out against the tab. Recovery required closing the tab / hard-reload.

**Likely cause:** Suspected blocking `window.confirm()` call on the click handler. Automated CDP sessions can't dismiss a native confirm, but it would also block keyboard focus for real users on slow machines.

**Expected:** Either clear immediately (session is transient anyway — "Zero Persistence" is a stated principle) or use a non-blocking in-app confirmation modal consistent with the rest of the UI.

**Evidence:** Renderer timeouts (`CDP sendCommand "Runtime.evaluate" timed out after 45000ms on tab ... The renderer may be frozen or unresponsive`) immediately after the click; page also could not be re-screenshotted via the extension until the tab was reloaded.

---

### 2\. \[P1\] Onboarding tour "Next" button lands below the fold on step 2 (Preview)

**Where:** First-run modal → "Take a quick tour" → step 2 (Preview panel). **Severity:** P1 (blocks tour completion on common laptop heights) **Repro:**

1. Hard-reload so onboarding modal appears.  
2. Click **Take a quick tour**.  
3. Observe step 1 ("Terminal — Ingestion") — Next button visible.  
4. Click **Next**.

**Observed:** The Preview panel is highlighted, but the tour dialog containing text \+ Next button renders at y=931 in a 739-px viewport. The user has no visible in-viewport control to advance. The dialog also cannot be scrolled into view because the main app container is `h-screen` with `overflow-hidden`. (Keyboard shortcuts for advancing/dismissing the tour were not tested — please verify.)

**Measurement:**

{ text: "Next", rect: {x: 326.7, y: 931, w: 65.3, h: 28},

  vw: 1037, vh: 739, visible: false }

**Expected:** Tour popover should (a) clamp to the viewport, (b) reposition when no space below, or (c) at minimum be scroll-reachable. Currently nothing inside `<body>` can be scrolled to the popover because the main app has `h-screen` \+ `overflow-hidden`.

**Workaround for testing:** Calling `.click()` via JS on the hidden Next button advances the tour.

---

### 3\. \[P2\] Terminal panel overflows negatively off the left edge of the viewport at typical small-laptop widths

**Where:** Standard Layout, default state after dismissing onboarding. **Severity:** P2 **Repro:** Load the app at ≤ \~1040 CSS px viewport width and dismiss the tour.

**Observed:** The terminal panel is rendered at `x = -169px, width = 280px`, so \~170 px of it is off-screen to the left. Only the tail-end of the "\[System\] Terminal ready — drop in a zip to kick things off." message is visible, bleeding over the left gutter as fragments ("y — drop in a" / "f.").

DOM evidence:

div.animate-panel-in-left  x=-169  w=280   (left panel wrapper)

div.xterm-screen           x=-161  w=250

span "\[System\]"            x=-161

span "Terminal ready — drop in a"  x=-103

span "zip to kick things off."     x=-161

**Expected:** Below some minimum width, either collapse the terminal by default, stack panels, or at minimum add `overflow: hidden` on the main container so partial panels don't bleed. The current layout allocates terminal+preview+chat+scratch side-by-side without media-query breakpoints.

---

### 4\. \[P2\] Expanding the terminal at the same viewport clips the right side (AI Review button truncated to "Accessib")

**Where:** Standard Layout → click **Expand terminal**. **Severity:** P2 **Repro:**

1. At \~1037-px viewport width, start in Standard Layout.  
2. Collapse then re-expand the terminal.

**Observed:** The right-side chat column is pushed off-screen horizontally. The **AI Review** button's subtitle "Accessibility · UX · Contrast" truncates to "Accessib…" at the right edge. There are no horizontal scrollbars and no responsive reflow.

**Expected:** Either auto-collapse one panel when width drops below a threshold, or stack panels vertically below a breakpoint, or enable horizontal overflow with a scrollbar. Today the layout silently hides interactive controls.

---

### 5\. \[P2\] xterm.js throws `TypeError: Cannot read properties of undefined (reading 'dimensions')` on terminal mount/remount

**Where:** Terminal panel (xterm.js renderer), triggered by collapse/expand. **Severity:** P2 (exception leaks; no user-visible crash today, but indicates a lifecycle ordering bug) **Repro:**

1. Load the app (onboarding visible).  
2. Advance/dismiss the tour.  
3. Toggle the terminal collapse/expand a couple of times.

**Observed (console, every toggle):**

TypeError: Cannot read properties of undefined (reading 'dimensions')

    at get dimensions (xterm.js:1776:41)

    at t2.Viewport.syncScrollArea (xterm.js:830:70)

TypeError: Cannot read properties of undefined (reading 'dimensions')

    at get dimensions (xterm.js:1776:41)

    at t2.Viewport.\_innerRefresh (xterm.js:821:60)

Captured at 11:05:19 AM and again at 11:07:03 / 11:07:07 AM after panel toggle — reproducible.

**Likely cause:** The xterm `Viewport` is querying the renderer before the renderer has been initialized after remount (the panel's container has 0 height/width during the animation, or the `CharSizeService` is not yet ready). This is a known xterm addon class of bug usually fixed by calling `fit()` after RAF, or deferring `Viewport.syncScrollArea` until after the FitAddon resolves dimensions.

**Expected:** No uncaught exceptions during normal UI interactions.

---

### 6\. \[P2\] Toggling "Quick bullets mode" retroactively prepends `-`  to every existing line, including timestamps and headings

**Where:** Scratch Pad → bullets toggle (bullet-list icon in the Scratch Pad toolbar). **Severity:** P2 **Repro:**

1. Type a sentence in the Scratch Pad.  
2. Click the clock icon (Insert timestamp separator).  
3. Click the H₂ icon (Insert note section heading).  
4. Click the bullets toggle.

**Observed:** Every line — including blank lines, the `--- 11:09 AM ---` timestamp divider, and the `## Notes` heading — is rewritten with a leading `-` . This breaks the Markdown heading (it becomes a bulleted item starting with `##`) and turns the visual divider into a bulleted divider.

Before:

Testing scratch pad

\--- 11:09 AM \---

\#\# Notes

After toggle:

\- Testing scratch pad

\- f

\- \--- 11:09 AM \---

\- \#\# Notes

\- irst item

\- second item

(The stray `- f` / `- irst item` split is a separate bug — see \#7.)

**Expected:** Bullets mode should affect *new* lines only, or should detect structural lines (empty, starts with `#`, starts with `---`) and skip them.

---

### 7\. \[P2\] Typing while bullets mode is on splits words across lines

**Where:** Scratch Pad textarea with bullets toggle ON. **Severity:** P2 **Repro:**

1. Enable bullets mode.  
2. Click into the textarea and type `first item\nsecond item` (i.e. type "first item", press Enter, type "second item").

**Observed:** Output is corrupted — characters from a single typed word split across different bulleted lines, with other document content appearing between them. Concrete capture of the final textarea value after typing "first item\\nsecond item":

\- Testing scratch pad

\- f

\- \--- 11:09 AM \---

\- \#\# Notes

\- irst item

\- second item

Note that "f" (from "first") landed alone on line 2 while "irst item" appears six lines later. Mechanism is unclear; looks like a race between React state updates that re-apply the bullet prefix and keypress-driven insertions, or cursor-position loss after a textarea value rewrite.

**Expected:** Bullets-mode auto-prefix should be applied atomically on Enter so characters cannot interleave.

---

### 8\. \[P3\] Artifact Export dialog's button subtitle ("MD/PDF/TXT") understates the actual supported formats

**Where:** AI Brainstorming footer → **Create Artifact** button subtitle reads `Plan/List/Summary · MD/PDF/TXT`. **Severity:** P3 **Observed:** The modal actually exports to **Markdown, PDF, Plain Text, HTML, and JSON** — five formats, not three. HTML and JSON are not mentioned on the discoverable button.

**Expected:** Either update the subtitle to include HTML/JSON or remove the format list from the button copy to avoid mismatches.

---

### 9\. \[P3\] Artifact "Planning Notes" preview includes the error response as if it were real conversation content

**Where:** Artifact Export modal → Planning Notes preview box. **Severity:** P3 **Observed:** After a failed chat turn ("API key is missing — head to Settings to add one."), the Planning Notes preview shows:

What do you see in the app?

Error: API key is missing — head to Settings to add one.

This means an exported artifact would include internal error messages as if they were AI responses.

**Expected:** Filter error-state responses out of the export pipeline, or at minimum tag them as system errors so downstream exports can exclude them.

---

### 10\. \[P3\] Footer credit line ("Created by Jeffrey Guntly · © JX Holdings, LLC") renders inside the top header strip

**Where:** Top of the app, directly under the logo/Upload Zip row. **Severity:** P3 **Observed:** The credit line sits in what looks like a header / sub-header slot rather than at the bottom of the viewport. It appears on every view at all times, which competes with the title for visual weight and adds top-chrome height. Screenshots attached throughout this report show the placement.

**Expected:** Move credit to a true footer, Settings "About" dialog, or the help panel.

---

### 11\. \[P3\] Suggested UX — Help/Settings icons lack visible badges for unmet prerequisites

**Where:** Top-right gear (Settings) and ? (Help) buttons. **Severity:** P3 **Observed:** All three main AI actions (Brainstorming chat, Create Artifact, AI Review) fail with the same "API key is missing" error. The Settings icon gives no affordance that this is where the user needs to go. A first-time user who ignores the tour and starts typing will hit the error three times before discovering the fix.

**Expected:** When no API key is configured, badge the Settings gear (a dot or a subtle highlight) and/or include a "Go to Settings" button directly in the error bubble.

---

## Things tested and PASSED

- App loads at `http://localhost:3000`; title sets to "Astra/log".  
- Initial onboarding modal renders; "Skip for now" and "Take a quick tour" are both reachable at default window size.  
- Tour steps 1 and 3 render with Next/Back/Done controls visible.  
- Collapsing the terminal produces a clean vertical rail with a "TERMINAL" label and expand chevron.  
- Chat "Share an idea…" input accepts text and posts the message bubble (user message styled correctly).  
- Chat error state ("API key is missing — head to Settings to add one.") renders as a normal bot bubble — no crash.  
- Scratch Pad **Insert timestamp separator** inserts `--- 11:09 AM ---` at the current cursor position.  
- Scratch Pad **Insert note section heading** inserts `## Notes` at the current cursor position.  
- Scratch Pad **Stage for AI** button toggles active state visually.  
- Artifact Export modal opens, lists three export styles, surfaces the "Include Scratch Pad notes" toggle, and shows a "Planning Notes" preview.  
- Vite dev server connects cleanly; no 404s seen on asset requests.

---

## Things not tested (explicit scope gaps)

- **Anything that requires an API key.** AI Brainstorming, AI Review, Create Artifact (AI-style outputs), and the full Scratch Pad → AI flow were not exercised end-to-end. Please retest these with a real key once the P1/P2 items above are fixed.  
- **Zip upload / project ingestion.** No zip was dropped in; terminal boot, preview rendering, and file-tree views were not covered. These are probably the largest untested surface.  
- **Device preview toggles** (Mobile / Tablet / Desktop) — not exercised beyond defaulting to Desktop.  
- **Alternate layouts** (Architect, Zen, Custom) — not exercised; worth re-running the viewport/overflow checks in each.  
- **Settings and Help/Guide panels** — not opened. Worth a focused pass.  
- **Larger viewport widths** (1440, 1920). The overflow bugs \#3/\#4 may only affect ≤1040 px; please confirm whether the Standard Layout has an intended minimum width and enforce it.  
- **Keyboard shortcuts.** Not tested.  
- **Persistence / reset behavior.** Not tested (the app's "Zero Persistence" claim is unverified).

---

## Recommended next steps

1. Reproduce and fix \#1 (Clear Notes freeze) and \#2 (tour step 2 unreachable) first — both block core first-run flows.  
2. Add a responsive breakpoint that auto-collapses the terminal below \~1080 px to eliminate \#3 and \#4 together.  
3. Wrap xterm's `Viewport` lifecycle calls in a dimension-ready guard to eliminate \#5.  
4. Reconsider whether "bullets mode" needs to be a global textarea transform; scoping it to the insertion point would fix \#6 and \#7 cleanly.  
5. Do a focused pass over the Artifact Export flow once an API key is configured; \#8 and \#9 need that setup.

