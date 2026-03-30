import JSZip from 'jszip';
import type { FileSystemTree } from '@webcontainer/api';

export interface ParsedZip {
  tree: FileSystemTree;
  packageJson: string | null;
  readme: string | null;
  /** Path within the tree where the actual application root lives, or null if at the top level. */
  appRoot: string | null;
  /** Detected project type based on file structure. */
  projectType: 'node' | 'static' | 'unknown';
}

export async function parseZipToTree(file: File): Promise<ParsedZip> {
  const zip = await JSZip.loadAsync(file);
  const tree: FileSystemTree = {};

  // Find the root folder name if everything is nested under one folder (typical for GitHub zips)
  const files = Object.values(zip.files).filter(f => !f.dir);
  let rootPrefix = '';
  if (files.length > 0) {
    const firstPathParts = files[0].name.split('/');
    if (firstPathParts.length > 1) {
      const potentialRoot = firstPathParts[0] + '/';
      const allShareRoot = files.every(f => f.name.startsWith(potentialRoot));
      if (allShareRoot) {
        rootPrefix = potentialRoot;
      }
    }
  }

  // Collect candidates across all depths for app root detection
  const packageJsonCandidates: { path: string; content: string }[] = [];
  const indexHtmlCandidates: { path: string }[] = [];
  const readmeCandidates: { path: string; content: string }[] = [];

  for (const zipEntry of files) {
    const relativePath = zipEntry.name.startsWith(rootPrefix)
      ? zipEntry.name.substring(rootPrefix.length)
      : zipEntry.name;

    if (!relativePath) continue;

    const parts = relativePath.split('/');
    let currentLevel: any = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // It's a file
        const content = await zipEntry.async('uint8array');
        currentLevel[part] = {
          file: {
            contents: content
          }
        };
        // Collect metadata candidates for app root detection at any depth
        if (part === 'package.json') {
          packageJsonCandidates.push({ path: relativePath, content: new TextDecoder().decode(content) });
        } else if (part === 'index.html') {
          indexHtmlCandidates.push({ path: relativePath });
        } else if (/^readme\.md$/i.test(part)) {
          readmeCandidates.push({ path: relativePath, content: new TextDecoder().decode(content) });
        }
      } else {
        // It's a directory
        if (!currentLevel[part]) {
          currentLevel[part] = { directory: {} };
        }
        currentLevel = currentLevel[part].directory;
      }
    }
  }

  // Determine appRoot and projectType from the shallowest detected candidate
  const depthOf = (p: string) => p.split('/').length;
  const dirOf = (p: string): string | null => {
    const segs = p.split('/');
    return segs.length > 1 ? segs.slice(0, -1).join('/') : null;
  };

  let appRoot: string | null = null;
  let projectType: 'node' | 'static' | 'unknown' = 'unknown';
  let packageJson: string | null = null;
  let readme: string | null = null;

  if (packageJsonCandidates.length > 0) {
    // Node project: pick the shallowest package.json as the app root
    packageJsonCandidates.sort((a, b) => depthOf(a.path) - depthOf(b.path));
    const best = packageJsonCandidates[0];
    appRoot = dirOf(best.path);
    projectType = 'node';
    packageJson = best.content;
    // Find README at the same directory level as the detected app root
    const appRootStr = appRoot ?? '';
    const readmeAtRoot = readmeCandidates.find(r => (dirOf(r.path) ?? '') === appRootStr);
    readme = readmeAtRoot?.content ?? null;
  } else if (indexHtmlCandidates.length > 0) {
    // Static project: pick the shallowest index.html as the app root
    indexHtmlCandidates.sort((a, b) => depthOf(a.path) - depthOf(b.path));
    const best = indexHtmlCandidates[0];
    appRoot = dirOf(best.path);
    projectType = 'static';
  }

  return { tree, packageJson, readme, appRoot, projectType };
}

/**
 * Extracts the sub-tree rooted at `appRoot` from a FileSystemTree.
 * Falls back to the full tree if the path cannot be resolved.
 */
export function extractSubtree(tree: FileSystemTree, appRoot: string): FileSystemTree {
  const parts = appRoot.split('/');
  let current: FileSystemTree = tree;
  for (const part of parts) {
    const node = current[part];
    if (node && 'directory' in node) {
      current = node.directory as FileSystemTree;
    } else {
      return tree; // fallback to full tree
    }
  }
  return current;
}

/** Returns the list of script names defined in a package.json string. */
export function parsePackageJsonScripts(content: string): string[] {
  try {
    const pkg = JSON.parse(content);
    if (pkg.scripts && typeof pkg.scripts === 'object') {
      return Object.keys(pkg.scripts);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

/**
 * Searches "Getting Started", "Usage", or "Quick Start" sections of a README
 * and returns commands matching `npm run <name>` or `node <file>` patterns.
 */
export function extractCommandsFromReadme(content: string): string[] {
  const commands: string[] = [];
  // Match section headings and capture everything until the next same-level heading or end of file.
  // No 'm' flag so '$' matches end of string, not end of line.
  const sectionRegex = /(?:^|\n)##\s+(getting started|usage|quick start)\b[^\n]*\n([\s\S]*?)(?=\n##\s|\s*$)/gi;
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionRegex.exec(content)) !== null) {
    const section = sectionMatch[2];

    // npm run [name] — inside backticks or bare
    const npmRunRegex = /`(npm run [\w:.-]+)`|(?<!\w)(npm run [\w:.-]+)(?!\w)/g;
    let m: RegExpExecArray | null;
    while ((m = npmRunRegex.exec(section)) !== null) {
      const cmd = (m[1] ?? m[2]).trim();
      if (!commands.includes(cmd)) commands.push(cmd);
    }

    // node [file] — inside backticks or bare
    const nodeRegex = /`(node [\w./\\-]+(?:\.js)?)`|(?<!\w)(node [\w./\\-]+(?:\.js)?)(?!\w)/g;
    while ((m = nodeRegex.exec(section)) !== null) {
      const cmd = (m[1] ?? m[2]).trim();
      if (!commands.includes(cmd)) commands.push(cmd);
    }
  }
  return commands;
}

/**
 * Builds the ordered list of boot commands following the tiered hierarchy:
 *   Tier 0 – Static project: serve files with `npx -y serve .`
 *             (`-y` auto-confirms the one-time npx package download prompt so
 *             the server starts without requiring user interaction in the terminal)
 *   Tier 1 – npm run dev (standard default)
 *   Tier 2 – Commands extracted from README
 *   Tier 3 – npm run start → npm run serve → npm run <first script>
 *   Tier 4 – AI fallback (handled separately, not a command string)
 */
export function buildBootCommands(
  packageJsonScripts: string[],
  readmeCommands: string[],
  projectType: 'node' | 'static' | 'unknown' = 'node'
): string[] {
  // Tier 0: Static project — serve files directly, no install needed
  if (projectType === 'static') {
    return ['npx -y serve .'];
  }

  const commands: string[] = [];

  // Tier 1
  commands.push('npm run dev');

  // Tier 2: README specifics (skip duplicates)
  for (const cmd of readmeCommands) {
    if (!commands.includes(cmd)) commands.push(cmd);
  }

  // Tier 3: manifest discovery
  for (const script of ['start', 'serve']) {
    if (packageJsonScripts.includes(script)) {
      const cmd = `npm run ${script}`;
      if (!commands.includes(cmd)) commands.push(cmd);
    }
  }
  if (packageJsonScripts.length > 0) {
    const firstCmd = `npm run ${packageJsonScripts[0]}`;
    if (!commands.includes(firstCmd)) commands.push(firstCmd);
  }

  return commands;
}
