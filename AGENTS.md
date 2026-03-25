# AI Development Instructions

## Purpose
These instructions apply to any AI agent, coding assistant, or automation working in this repository.

The AI must understand the product direction before making code changes, complete as much requested work as possible in each pass, and leave the repository documentation in a better and more current state than it found it.

---

## Required Reading Before Making Changes

Before planning, editing, or generating code, always read:

1. All `coreIdentity` files
2. The `productRoadmap` document
3. `README.md`
4. Any existing changelog file

If any of these files are missing, proceed with the available documentation, but note the missing file(s) in the changelog entry.

### Definitions
- `coreIdentity` files means any file in a `coreIdentity` directory and/or any file whose name begins with `coreIdentity`
- `productRoadmap` means the repository's main product roadmap document, wherever it is stored

### Intent
- `coreIdentity` files define the app's core purpose, values, behavior, and identity
- `productRoadmap` defines where the product is going and should guide implementation choices
- `README.md` defines setup, usage, and developer-facing context
- The changelog provides continuity across AI-assisted development sessions

Do not make blind changes without first understanding these files.

---

## Task Execution Rules

When given a list of requested tasks:

- Attempt to complete as many tasks as possible in the current pass
- Prefer completing all requested tasks when feasible
- Do not stop after only one task unless blocked
- If some tasks cannot be completed, complete the remaining tasks anyway
- Clearly document completed, partially completed, and blocked items in the changelog and documentation updates

### General behavior
- Prefer practical completion over unnecessary back-and-forth
- Make the smallest safe set of changes that satisfies the request
- Keep changes aligned with the long-term direction described in `productRoadmap`
- Preserve consistency with the app identity described in `coreIdentity`

---

## Changelog Requirements

Every development session must update or create a changelog.

### Rules
- If a changelog already exists, append a new entry
- If no changelog exists, create one
- Never delete previous changelog entries
- Keep changelog text brief and iterative
- Each entry must include:
  - date
  - AI/tool name
  - brief summary of changes
  - optional note for incomplete or blocked work

### Preferred filenames
Use the first existing file from this list:
- `CHANGELOG.md`
- `changelog.md`
- `docs/CHANGELOG.md`

If none exist, create `CHANGELOG.md` at the repository root.

### Entry format
Use this format:

```md
## YYYY-MM-DD - [AI or Tool Name]
- Brief summary of change 1
- Brief summary of change 2
- Blocked/incomplete: brief explanation if applicable
```

Example:

```md
## 2026-03-24 - ChatGPT
- Added user profile editing flow
- Fixed validation on settings form
- Updated README with new setup notes
- Blocked/incomplete: export flow not implemented because API contract is still missing
```

The AI/tool name should identify the system making the change, such as:
- ChatGPT
- Cursor
- GitHub Copilot
- Claude
- Gemini
- Codex
- Other named internal tool

---

## Documentation Update Requirements

After completing code changes, update documentation as needed.

At minimum, review and update:
- `README.md`
- any feature docs affected by the change
- setup docs
- API docs
- architecture docs
- workflow docs
- changelog

Documentation updates should reflect:
- new features
- changed behavior
- removed behavior
- setup or configuration changes
- new constraints or requirements
- known limitations introduced by the change

Do not leave `README.md` or related docs outdated when the code has changed.

---

## Prioritization Rules

When implementation choices are unclear, prioritize in this order:

1. `coreIdentity` files
2. `productRoadmap`
3. existing architecture and patterns in the codebase
4. `README.md` and supporting documentation
5. task prompt details

If the task prompt conflicts with `coreIdentity` or `productRoadmap`, prefer the prompt only when it is clearly an intentional override. In that case, document the deviation in the changelog.

---

## Quality Expectations

- Follow existing project conventions
- Avoid unrelated refactors unless needed to complete the requested work
- Keep diffs focused
- Do not remove useful existing documentation
- Do not erase previous changelog history
- Do not ignore requested tasks just because some are harder than others
- If blocked, still complete the parts that can be completed

---

## Completion Checklist

Before finishing, confirm that you have:

- read `coreIdentity` files
- read `productRoadmap`
- reviewed `README.md`
- updated or created the changelog
- completed as many requested tasks as possible
- updated `README.md`
- updated any other relevant documentation
- noted incomplete or blocked work if applicable
