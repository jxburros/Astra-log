# One-Phase Implementation Plan: Support for Non-Standard Project Structures

## Objective
Enable the application to correctly handle:
- Static projects (no `package.json`)
- Projects with nested application roots (e.g., `/frontend`, `/app`, monorepos)

This will be achieved by enhancing ZIP parsing, improving metadata extraction, and introducing conditional boot logic in the application runtime.

---

## Scope of Changes
Primary files involved:
- `src/lib/zipParser.ts`
- `src/App.tsx`

Core areas of modification:
1. ZIP parsing and project structure detection
2. Application root resolution
3. Conditional boot logic
4. Boot hierarchy refinement

---

## Implementation Steps

### 1. Enhance ZIP Parsing and Metadata Extraction

**File:** `src/lib/zipParser.ts`

#### Goals:
- Detect the actual application root inside the ZIP
- Identify project type (Node vs static)
- Return structured metadata for downstream logic

#### Actions:
- Update `parseZipToTree` to:
  - Traverse all directories (not just top-level)
  - Detect:
    - First directory containing `package.json`
    - OR first directory containing `index.html`
- Introduce a return structure like:

```ts
{
  tree: FileTree,
  appRoot: string | null,
  projectType: 'node' | 'static' | 'unknown'
}
```

#### Detection Logic:
- **Node App**
  - `package.json` exists → mark as `"node"`
- **Static App**
  - No `package.json`, but `index.html` exists → mark as `"static"`
- **Fallback**
  - Neither found → `"unknown"`

---

### 2. Update Mounting Logic to Use Detected Root

**File:** `src/App.tsx`

#### Goals:
- Ensure only the relevant application subtree is mounted

#### Actions:
- When receiving parsed ZIP data:
  - Extract `appRoot`
  - Slice the file tree to that root before mounting

```ts
wc.mount(treeAtAppRoot);
```

#### Behavior:
- If `appRoot` exists → mount that subtree
- If not → fallback to full tree (current behavior)

---

### 3. Implement Conditional Boot Logic

**File:** `src/App.tsx` (`processZipFile`)

#### Goals:
- Avoid assuming all projects are Node-based
- Introduce branching execution paths

#### Actions:

##### Step 1: Read Metadata
```ts
const { projectType, appRoot } = parsedZip;
```

##### Step 2: Branch Execution

---

### Tier A: Standard Node Project
**Condition:** `package.json` found at root or subfolder

**Flow:**
```ts
npm install
npm run dev (or existing boot hierarchy)
```

**If in subfolder:**
```bash
cd <appRoot>
npm install
npm run dev
```

---

### Tier B: Static Project
**Condition:** No `package.json`, but `index.html` exists

**Flow Options:**

**Option 1 (Preferred):**
- Use WebContainer preview directly:
  - Point to `/index.html`

**Option 2 (Fallback):**
```bash
npx -y serve .
```

**Implementation:**
- Skip:
  - `npm install`
  - `runBootHierarchy`
- Immediately trigger "server ready" state

---

### Tier C: Unknown Structure
**Condition:** No clear entry point

**Fallback Behavior:**
- Attempt static preview
- OR show user-facing error:
  - "No valid project entry point detected"

---

### 4. Refine Boot Command Hierarchy

**File:** Boot logic (`buildBootCommands` or equivalent)

#### Goals:
- Integrate static handling cleanly into existing system

#### Actions:
- Introduce **Tier 0 (Static Detection)**

```ts
if (projectType === 'static') {
  return ['npx -y serve .'];
}
```

#### Updated Hierarchy:

| Tier | Condition | Action |
|------|----------|--------|
| Tier 0 | Static project | Serve static files |
| Tier 1 | `dev` script | `npm run dev` |
| Tier 2 | `start` script | `npm run start` |
| Tier 3 | fallback | custom/default command |

---

### 5. Ensure Subfolder Execution Context

#### Goals:
- Correct working directory for commands

#### Actions:
- When `appRoot` is not `/`:
  - Prepend all commands with:

```bash
cd <appRoot>
```

OR configure WebContainer working directory accordingly

---

### 6. Update Process Flow in `processZipFile`

#### Final Flow Summary:

```ts
parseZip → detect appRoot + projectType
↓
mount correct subtree
↓
if (node project)
  cd (if needed) → npm install → boot hierarchy
else if (static project)
  serve or preview directly
else
  fallback handling
```

---

## Expected Outcomes

After implementation:

- Static sites load without unnecessary installs
- Monorepos and nested apps run correctly
- ZIPs from GitHub (with wrapper folders) work reliably
- Boot process becomes adaptive instead of assumption-based

---

## Complexity Assessment

**Difficulty: Low to Moderate**

Reasons:
- Existing architecture is modular:
  - Dedicated parser (`zipParser.ts`)
  - Central controller (`processZipFile`)
- Changes are primarily:
  - Conditional logic additions
  - Improved traversal
  - Metadata propagation

No major refactors required.

---

## Optional Enhancements (Post-Phase)

- Support multiple detected app roots (user selection UI)
- Detect frameworks (Next.js, Vite, etc.) for smarter booting
- Cache install results for faster reloads
- Add debug panel showing detected structure
