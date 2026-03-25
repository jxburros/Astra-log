export type ScanLevel = 'safe' | 'warning' | 'high-risk';

export interface ScanFinding {
  level: ScanLevel;
  message: string;
}

export interface ScanResult {
  level: ScanLevel;
  findings: ScanFinding[];
}

/** Patterns to detect dangerous content in script values. */
const SCRIPT_PATTERNS: { pattern: RegExp; message: string; level: ScanLevel }[] = [
  { pattern: /\beval\s*\(/, message: 'Uses eval() — can execute arbitrary code', level: 'high-risk' },
  { pattern: /base64\s*(--decode|-d)\b/, message: 'Decodes base64-encoded payload', level: 'high-risk' },
  { pattern: /rm\s+-[rf]{1,2}\s+\//, message: 'May delete critical system files', level: 'high-risk' },
  { pattern: /https?:\/\/[^\s]+\.sh(\s|$|;|&&|\|\|)/, message: 'Downloads and runs a remote shell script', level: 'high-risk' },
  { pattern: /\bchmod\s+[0-9]*[7][0-9]*\s/, message: 'Grants broad execute permissions', level: 'high-risk' },
  { pattern: /\bsudo\b/, message: 'Escalates privileges with sudo', level: 'high-risk' },
  { pattern: /\bcurl\b/, message: 'Fetches remote content with curl', level: 'warning' },
  { pattern: /\bwget\b/, message: 'Fetches remote content with wget', level: 'warning' },
  { pattern: /\bpowershell\b/i, message: 'Invokes PowerShell', level: 'warning' },
  { pattern: /node\s+-e\s+['"]/, message: 'Runs inline Node.js code via -e flag', level: 'warning' },
  { pattern: /\bnpx\s+(?!--\s?)[\w@]/, message: 'Runs a package directly via npx without installing', level: 'warning' },
  { pattern: /\b(bash|sh)\s+\S+\.sh\b/, message: 'Executes a shell script file', level: 'warning' },
];

/** Dependency version specifiers that indicate non-registry sources. */
const DEP_PATTERNS: { pattern: RegExp; message: string; level: ScanLevel }[] = [
  { pattern: /^git\+http:\/\//, message: 'Loaded from an unencrypted git URL', level: 'high-risk' },
  { pattern: /^git:\/\//, message: 'Loaded from a plain git:// URL (no encryption)', level: 'high-risk' },
  { pattern: /^git\+https?:\/\//, message: 'Loaded from a remote git repository', level: 'warning' },
  { pattern: /^https?:\/\//, message: 'Loaded from a raw remote URL', level: 'warning' },
  { pattern: /^file:/, message: 'Loaded from a local file path', level: 'warning' },
  { pattern: /^github:/, message: 'Loaded directly from a GitHub repository', level: 'warning' },
  { pattern: /^bitbucket:/, message: 'Loaded directly from a Bitbucket repository', level: 'warning' },
  { pattern: /^gitlab:/, message: 'Loaded directly from a GitLab repository', level: 'warning' },
];

/** Lifecycle hooks that execute automatically during install. */
const LIFECYCLE_HOOKS = ['preinstall', 'postinstall', 'install', 'prepare', 'prepack', 'prepublish'];

function mergeLevel(current: ScanLevel, incoming: ScanLevel): ScanLevel {
  if (incoming === 'high-risk' || current === 'high-risk') return 'high-risk';
  if (incoming === 'warning' || current === 'warning') return 'warning';
  return 'safe';
}

/**
 * Scans a package.json string for suspicious lifecycle hooks, script patterns,
 * and non-registry dependency sources.
 *
 * Returns a ScanResult with an overall level (safe | warning | high-risk) and
 * a list of specific findings with individual severity labels.
 */
export function scanPackageJson(content: string): ScanResult {
  const findings: ScanFinding[] = [];
  let topLevel: ScanLevel = 'safe';

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(content);
  } catch {
    findings.push({ level: 'warning', message: 'package.json could not be parsed — scan incomplete' });
    return { level: 'warning', findings };
  }

  const scripts = (pkg.scripts ?? {}) as Record<string, string>;

  // ── Lifecycle hooks ──────────────────────────────────────────────────────
  for (const hook of LIFECYCLE_HOOKS) {
    const hookScript = scripts[hook];
    if (!hookScript) continue;

    const preview = hookScript.length > 80 ? hookScript.substring(0, 80) + '…' : hookScript;
    findings.push({
      level: 'warning',
      message: `Lifecycle hook "${hook}" will run automatically: ${preview}`,
    });
    topLevel = mergeLevel(topLevel, 'warning');

    for (const { pattern, message, level } of SCRIPT_PATTERNS) {
      if (pattern.test(hookScript)) {
        findings.push({ level, message: `  └ ${message}` });
        topLevel = mergeLevel(topLevel, level);
      }
    }
  }

  // ── Non-lifecycle scripts ────────────────────────────────────────────────
  for (const [name, script] of Object.entries(scripts)) {
    if (LIFECYCLE_HOOKS.includes(name)) continue;
    for (const { pattern, message, level } of SCRIPT_PATTERNS) {
      if (pattern.test(script)) {
        findings.push({ level, message: `Script "${name}": ${message}` });
        topLevel = mergeLevel(topLevel, level);
      }
    }
  }

  // ── Dependencies ─────────────────────────────────────────────────────────
  const allDeps: Record<string, string> = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
    ...(pkg.optionalDependencies as Record<string, string> | undefined),
  };

  for (const [name, version] of Object.entries(allDeps)) {
    const versionStr = String(version);
    for (const { pattern, message, level } of DEP_PATTERNS) {
      if (pattern.test(versionStr)) {
        findings.push({ level, message: `Dependency "${name}": ${message}` });
        topLevel = mergeLevel(topLevel, level);
      }
    }
  }

  return { level: topLevel, findings };
}
