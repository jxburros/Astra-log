/** Phase 5.1 — Artifact export utilities. */

export interface ArtifactSection {
  title: string;
  content: string;
}

export interface ParsedArtifact {
  /** Sections extracted from the AI planning output. */
  sections: ArtifactSection[];
  /** True when explicit UX/Logic/Architecture headings were detected. */
  hasStructuredSections: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Map canonical section keys to the display titles we want in exports. */
const SECTION_KEYS: Array<{ patterns: string[]; label: string }> = [
  { patterns: ['ux', 'user experience', 'user interface', 'ui/ux', 'ui & ux', 'ui'], label: 'UX' },
  { patterns: ['logic', 'business logic', 'application logic', 'app logic', 'functionality', 'features'], label: 'Logic' },
  {
    patterns: ['architecture', 'technical architecture', 'system architecture', 'tech stack', 'infrastructure', 'technical'],
    label: 'Architecture',
  },
];

/**
 * Splits a Markdown string at `#`, `##`, or `###` headings and returns
 * an ordered list of `{ title, body }` pairs.
 */
function splitByHeadings(content: string): Array<{ title: string; body: string }> {
  const lines = content.split('\n');
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      const bodyText = currentBody.join('\n').trim();
      if (currentTitle || bodyText) {
        sections.push({ title: currentTitle || 'Overview', body: bodyText });
      }
      currentTitle = headingMatch[1].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  const bodyText = currentBody.join('\n').trim();
  if (currentTitle || bodyText) {
    sections.push({ title: currentTitle || 'Planning Notes', body: bodyText });
  }

  return sections;
}

/**
 * Checks whether a heading title matches any of the canonical section key
 * patterns and returns the canonical label, or `null` if no match.
 */
function matchCanonicalLabel(title: string): string | null {
  const lower = title.toLowerCase().trim();
  for (const { patterns, label } of SECTION_KEYS) {
    if (patterns.some(p => lower === p || lower.startsWith(p) || lower.includes(p))) {
      return label;
    }
  }
  return null;
}

/**
 * Parses the assistant messages from a conversation and extracts planning
 * content organised into sections.  If the AI used explicit UX / Logic /
 * Architecture headings those are surfaced directly.  Otherwise, any markdown
 * heading structure is preserved.  As a last resort the full content is
 * returned as a single "Planning Notes" section.
 */
export function parseArtifactSections(messages: Message[]): ParsedArtifact {
  const assistantContent = messages
    .filter(m => m.role === 'assistant')
    .map(m => m.content)
    .join('\n\n');

  if (!assistantContent.trim()) {
    return { sections: [], hasStructuredSections: false };
  }

  const rawSections = splitByHeadings(assistantContent);

  if (rawSections.length <= 1) {
    // No heading structure — return flat content
    return {
      sections: [{ title: 'Planning Notes', content: assistantContent.trim() }],
      hasStructuredSections: false,
    };
  }

  // Attempt to map headings to canonical UX / Logic / Architecture labels
  const canonicalBuckets: Record<string, string> = {};
  for (const s of rawSections) {
    const label = matchCanonicalLabel(s.title);
    if (label) {
      canonicalBuckets[label] = (canonicalBuckets[label] ?? '') + (s.body ? s.body + '\n\n' : '');
    }
  }

  const hasCanonical = Object.keys(canonicalBuckets).length > 0;

  if (hasCanonical) {
    // Preserve the canonical order: UX → Logic → Architecture
    const sections: ArtifactSection[] = SECTION_KEYS
      .filter(k => canonicalBuckets[k.label])
      .map(k => ({ title: k.label, content: canonicalBuckets[k.label].trim() }));
    return { sections, hasStructuredSections: true };
  }

  // Use whatever section structure the AI generated
  const sections: ArtifactSection[] = rawSections
    .filter(s => s.body.trim())
    .map(s => ({ title: s.title, content: s.body.trim() }));

  return { sections, hasStructuredSections: false };
}

/** Renders a `ParsedArtifact` as a complete Markdown document string. */
export function generateMarkdownDocument(artifact: ParsedArtifact, sessionDate: Date): string {
  const dateStr = sessionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# Astra/log — Implementation Plan\n\n_Exported: ${dateStr}_\n\n---\n\n`;

  for (const section of artifact.sections) {
    md += `## ${section.title}\n\n${section.content}\n\n---\n\n`;
  }

  return md.trimEnd();
}

/** Triggers a browser download of a plain-text Markdown file. */
export function downloadMarkdown(content: string, filename = 'astra-log-artifact.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts basic Markdown syntax to minimal HTML for the print view.
 * Does not require any external library.
 */
function mdToHtml(text: string): string {
  if (!text.trim()) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^#{1,6}\s+(.+)$/gm, '<h3>$1</h3>')
    // Group consecutive list items into a proper <ul> block
    .replace(/((?:^[-*]\s+.+\n?)+)/gm, (block) => {
      const items = block
        .split('\n')
        .filter(l => /^[-*]\s+/.test(l))
        .map(l => `<li>${l.replace(/^[-*]\s+/, '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    })
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<)/, '<p>')
    .replace(/(?<!>)$/, '</p>');
}

/**
 * Opens a new browser window with formatted artifact content and triggers the
 * system print dialog — the user can choose "Save as PDF" from there.
 * Falls back gracefully when the browser blocks the popup.
 */
export function printAsPDF(artifact: ParsedArtifact, sessionDate: Date): void {
  const dateStr = sessionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sectionsHtml = artifact.sections
    .map(s => `<section><h2>${s.title}</h2>${mdToHtml(s.content)}</section>`)
    .join('\n');

  const printContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Astra/log — Implementation Plan</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #111; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1 { font-size: 1.6em; border-bottom: 2px solid #333; padding-bottom: 0.4em; margin-bottom: 0.2em; }
    h2 { font-size: 1.2em; margin-top: 2em; border-bottom: 1px solid #ccc; padding-bottom: 0.3em; }
    h3 { font-size: 1em; margin-top: 1.2em; }
    code { background: #f4f4f4; padding: 0.1em 0.35em; border-radius: 3px; font-size: 0.88em; font-family: monospace; }
    ul { padding-left: 1.5em; }
    li { margin-bottom: 0.3em; }
    .meta { color: #666; font-size: 0.88em; margin-bottom: 1.5em; }
    section { page-break-inside: avoid; }
    hr { margin: 2em 0; border: none; border-top: 1px solid #ddd; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Astra/log — Implementation Plan</h1>
  <p class="meta">Exported: ${dateStr}</p>
  <hr />
  ${sectionsHtml}
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Popup was blocked — fall back to Markdown download
    const md = generateMarkdownDocument(artifact, sessionDate);
    downloadMarkdown(md);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
