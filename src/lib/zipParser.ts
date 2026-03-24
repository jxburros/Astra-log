import JSZip from 'jszip';
import type { FileSystemTree } from '@webcontainer/api';

export interface ParsedZip {
  tree: FileSystemTree;
  packageJson: string | null;
  readme: string | null;
}

export async function parseZipToTree(file: File): Promise<ParsedZip> {
  const zip = await JSZip.loadAsync(file);
  const tree: FileSystemTree = {};
  let packageJson: string | null = null;
  let readme: string | null = null;

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

  for (const zipEntry of files) {
    const relativePath = zipEntry.name.startsWith(rootPrefix)
      ? zipEntry.name.substring(rootPrefix.length)
      : zipEntry.name;

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
        // Capture root-level package.json and README.md text for metadata extraction
        if (parts.length === 1) {
          if (part === 'package.json') {
            packageJson = new TextDecoder().decode(content);
          } else if (/^readme\.md$/i.test(part)) {
            readme = new TextDecoder().decode(content);
          }
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
  return { tree, packageJson, readme };
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
 * Builds the ordered list of boot commands following the 4-tier hierarchy:
 *   Tier 1 – npm run dev (standard default)
 *   Tier 2 – Commands extracted from README
 *   Tier 3 – npm run start → npm run serve → npm run <first script>
 *   Tier 4 – AI fallback (handled separately, not a command string)
 */
export function buildBootCommands(
  packageJsonScripts: string[],
  readmeCommands: string[]
): string[] {
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
