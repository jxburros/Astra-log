/** Phase 5.1 — Artifact export utilities with AI-powered document generation. */

import { sendChat, isTauriRuntime } from './aiClient';
import type { Provider } from './aiClient';

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

export type ExportStyle = 'recap' | 'implementation-plan' | 'fix-list';

/** AI settings needed for AI-powered export generation. */
export interface AIExportSettings {
  provider: Provider;
  apiKey: string;
  model: string;
  localUrl?: string;
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

/** Returns true when a message is a system-generated error (not real AI content). */
function isErrorMessage(m: Message): boolean {
  return m.role === 'assistant' && m.content.startsWith('Error:');
}

/** Formats chat messages into a readable transcript for AI consumption. */
function formatConversationForAI(messages: Message[]): string {
  return messages
    .filter(m => !isErrorMessage(m))
    .map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
    .join('\n\n---\n\n');
}

/** Parses AI-generated markdown into artifact sections. */
function parseAIResponseToArtifact(aiResponse: string): ParsedArtifact {
  const rawSections = splitByHeadings(aiResponse);

  if (rawSections.length <= 1) {
    return {
      sections: [{ title: 'Summary', content: aiResponse.trim() }],
      hasStructuredSections: false,
    };
  }

  const canonicalBuckets: Record<string, string> = {};
  const otherSections: ArtifactSection[] = [];

  for (const s of rawSections) {
    const label = matchCanonicalLabel(s.title);
    if (label) {
      canonicalBuckets[label] = (canonicalBuckets[label] ?? '') + (s.body ? s.body + '\n\n' : '');
    } else if (s.body.trim()) {
      otherSections.push({ title: s.title, content: s.body.trim() });
    }
  }

  const hasCanonical = Object.keys(canonicalBuckets).length > 0;

  if (hasCanonical) {
    const sections: ArtifactSection[] = SECTION_KEYS
      .filter(k => canonicalBuckets[k.label])
      .map(k => ({ title: k.label, content: canonicalBuckets[k.label].trim() }));
    // Include non-canonical sections too
    sections.push(...otherSections);
    return { sections, hasStructuredSections: true };
  }

  return {
    sections: rawSections.filter(s => s.body.trim()).map(s => ({ title: s.title, content: s.body.trim() })),
    hasStructuredSections: false,
  };
}

// ── AI-powered export prompts ─────────────────────────────────────────────

const IMPLEMENTATION_PLAN_PROMPT = `You are generating an implementation plan document based on a conversation between a user and an AI assistant about a web application.

Your task:
1. Review the entire conversation carefully
2. Identify every issue, bug, feature request, or improvement the user discussed
3. If project context is provided, review the actual code/structure to inform your plan
4. Create a comprehensive, actionable implementation plan

Organize your output with these exact markdown headings where applicable:
## UX
(User experience and interface issues — layout, design, usability, accessibility)

## Logic
(Business logic, features, functionality, behavior bugs)

## Architecture
(Technical architecture, infrastructure, code structure, performance)

For each item under a heading:
- State the issue clearly
- Provide specific, actionable steps to fix it
- Reference relevant files or components if project context is available
- Prioritize by impact (address critical bugs before nice-to-haves)

If an issue doesn't fit neatly into these categories, use an additional heading.
Be thorough — do not miss any issue the user raised. Be specific and actionable, not vague.`;

const RECAP_PROMPT = `You are generating a session recap document based on a conversation between a user and an AI assistant about a web application.

Your task:
1. Read the entire conversation carefully
2. Write a comprehensive summary that captures the full substance of what was discussed

Structure your output with clear markdown headings. Include:

## Overview
A 2-3 sentence high-level summary of the session.

## Key Topics Discussed
The main subjects and issues that came up during the conversation.

## Issues Identified
Specific problems, bugs, or pain points the user raised.

## Decisions & Direction
Any conclusions reached, approaches agreed upon, or direction set.

## Next Steps
Action items or open questions that remain.

IMPORTANT: This should be a true AI-synthesized summary of the ENTIRE conversation (both user and assistant messages). Do NOT just list what the user said — analyze and summarize the whole dialogue, capturing context, nuance, and conclusions.`;

const FIX_LIST_PROMPT = `You are generating a fix list document based on a conversation between a user and an AI assistant about a web application.

Your task:
1. Read the entire conversation carefully
2. Extract EVERY issue, bug, problem, or thing the user identified as needing to be fixed
3. Present them as a simple, clear numbered list

Rules:
- Include ONLY items the user specifically called out as issues or things to fix
- Be specific — describe each issue clearly enough that a developer could act on it
- Use the user's own words/intent where possible, but clean up for clarity
- Do not add issues the user didn't mention
- Do not include solutions or implementation details — just the issues
- Order by the sequence they appeared in conversation

Output format:
## Issues Identified by User

1. [First issue]
2. [Second issue]
...

If the user identified no clear issues, state that explicitly.`;

/**
 * Generates an AI-powered export artifact by sending the conversation
 * to the AI with an appropriate prompt for the chosen export style.
 */
export async function generateAIExportArtifact(
  messages: Message[],
  style: ExportStyle,
  settings: AIExportSettings,
  projectContext?: string,
): Promise<ParsedArtifact> {
  const hasAIAccess = settings.provider === 'local' || !!settings.apiKey;
  if (!hasAIAccess) {
    return buildExportArtifactFallback(messages, style);
  }

  const systemPrompts: Record<ExportStyle, string> = {
    'implementation-plan': IMPLEMENTATION_PLAN_PROMPT,
    'recap': RECAP_PROMPT,
    'fix-list': FIX_LIST_PROMPT,
  };

  const conversationText = formatConversationForAI(messages);
  const contextSection = projectContext
    ? `\n\n--- PROJECT CONTEXT ---\n${projectContext}`
    : '';

  const userMessage = `Here is the conversation to analyze:\n\n${conversationText}${contextSection}`;

  try {
    let reply: string;

    if (settings.provider === 'local') {
      const ollamaChatUrl = `${(settings.localUrl || 'http://localhost:11434').replace(/\/+$/, '')}/api/chat`;
      const response = await fetch(ollamaChatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model || 'llama3',
          messages: [
            { role: 'system', content: systemPrompts[style] },
            { role: 'user', content: userMessage },
          ],
          stream: false,
        }),
      });
      const data = await response.json();
      reply = data.message?.content || '';
    } else {
      reply = await sendChat(
        settings.provider,
        settings.apiKey,
        settings.model,
        [{ role: 'user', content: userMessage }],
        systemPrompts[style],
      );
    }

    if (!reply.trim()) {
      return buildExportArtifactFallback(messages, style);
    }

    return parseAIResponseToArtifact(reply);
  } catch {
    // Fall back to static parsing if AI fails
    return buildExportArtifactFallback(messages, style);
  }
}

// ── Static fallback (original parsing logic) ──────────────────────────────

/**
 * Parses the assistant messages from a conversation and extracts planning
 * content organised into sections. Used as fallback when AI is unavailable.
 */
export function parseArtifactSections(messages: Message[]): ParsedArtifact {
  const assistantContent = messages
    .filter(m => m.role === 'assistant' && !isErrorMessage(m))
    .map(m => m.content)
    .join('\n\n');

  if (!assistantContent.trim()) {
    return { sections: [], hasStructuredSections: false };
  }

  const rawSections = splitByHeadings(assistantContent);

  if (rawSections.length <= 1) {
    return {
      sections: [{ title: 'Planning Notes', content: assistantContent.trim() }],
      hasStructuredSections: false,
    };
  }

  const canonicalBuckets: Record<string, string> = {};
  for (const s of rawSections) {
    const label = matchCanonicalLabel(s.title);
    if (label) {
      canonicalBuckets[label] = (canonicalBuckets[label] ?? '') + (s.body ? s.body + '\n\n' : '');
    }
  }

  const hasCanonical = Object.keys(canonicalBuckets).length > 0;

  if (hasCanonical) {
    const sections: ArtifactSection[] = SECTION_KEYS
      .filter(k => canonicalBuckets[k.label])
      .map(k => ({ title: k.label, content: canonicalBuckets[k.label].trim() }));
    return { sections, hasStructuredSections: true };
  }

  const sections: ArtifactSection[] = rawSections
    .filter(s => s.body.trim())
    .map(s => ({ title: s.title, content: s.body.trim() }));

  return { sections, hasStructuredSections: false };
}

function extractFixItems(messages: Message[]): string[] {
  const assistantText = messages.filter(m => m.role === 'assistant' && !isErrorMessage(m)).map(m => m.content).join('\n');
  const lines = assistantText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const fixLines = lines.filter(line => {
    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) return true;
    return /(fix|update|change|replace|add|remove|refactor|adjust|correct|resolve)/i.test(line) && line.length <= 180;
  });

  const deduped: string[] = [];
  for (const line of fixLines) {
    const cleaned = line.replace(/^[-*]\s+|^\d+[.)]\s+/, '').trim();
    if (!cleaned) continue;
    if (deduped.some(existing => existing.toLowerCase() === cleaned.toLowerCase())) continue;
    deduped.push(cleaned);
    if (deduped.length >= 25) break;
  }

  return deduped;
}

/** Static fallback export builder — used when AI is unavailable. */
export function buildExportArtifactFallback(messages: Message[], style: ExportStyle): ParsedArtifact {
  if (style === 'implementation-plan') {
    return parseArtifactSections(messages);
  }

  if (style === 'recap') {
    const userNotes = messages
      .filter(m => m.role === 'user')
      .map((m, i) => `${i + 1}. ${m.content.trim()}`)
      .filter(line => line.length > 3);

    return {
      hasStructuredSections: false,
      sections: [
        {
          title: 'Recap of Notes Sent to AI',
          content: userNotes.length > 0 ? userNotes.join('\n') : 'No user notes were captured in this session.',
        },
      ],
    };
  }

  const fixItems = extractFixItems(messages);
  return {
    hasStructuredSections: false,
    sections: [
      {
        title: 'Structured Fix List',
        content:
          fixItems.length > 0
            ? fixItems.map((item, i) => `${i + 1}. ${item}`).join('\n')
            : 'No clear fix items were detected in the AI responses yet.',
      },
    ],
  };
}

/** Legacy synchronous builder — delegates to fallback. */
export function buildExportArtifact(messages: Message[], style: ExportStyle): ParsedArtifact {
  return buildExportArtifactFallback(messages, style);
}

interface ExportDocumentOptions {
  style: ExportStyle;
  includeScratchPad?: boolean;
  scratchPadContent?: string;
}

const STYLE_LABELS: Record<ExportStyle, string> = {
  recap: 'Session Recap',
  'implementation-plan': 'Implementation Plan',
  'fix-list': 'Structured Fix List',
};

/** Renders a `ParsedArtifact` as a complete Markdown document string. */
export function generateMarkdownDocument(
  artifact: ParsedArtifact,
  sessionDate: Date,
  options: ExportDocumentOptions,
): string {
  const dateStr = sessionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# Astra/log — ${STYLE_LABELS[options.style]}\n\n_Exported: ${dateStr}_\n\n---\n\n`;

  for (const section of artifact.sections) {
    md += `## ${section.title}\n\n${section.content}\n\n---\n\n`;
  }

  if (options.includeScratchPad) {
    md += `## Scratch Pad Notes (Local Only)\n\n${(options.scratchPadContent || '').trim() || '_No scratch pad notes included._'}\n\n---\n\n`;
  }

  return md.trimEnd();
}

export function generatePlainTextDocument(
  artifact: ParsedArtifact,
  sessionDate: Date,
  options: ExportDocumentOptions,
): string {
  const dateStr = sessionDate.toLocaleString();
  const divider = '\n' + '='.repeat(56) + '\n';

  let output = `ASTRA/LOG — ${STYLE_LABELS[options.style].toUpperCase()}\nExported: ${dateStr}${divider}`;
  for (const section of artifact.sections) {
    output += `${section.title.toUpperCase()}\n${'-'.repeat(section.title.length)}\n${section.content}\n${divider}`;
  }

  if (options.includeScratchPad) {
    output += `SCRATCH PAD NOTES (LOCAL ONLY)\n------------------------------\n${(options.scratchPadContent || '').trim() || 'No scratch pad notes included.'}\n${divider}`;
  }

  return output.trimEnd();
}

export function generateJsonDocument(
  artifact: ParsedArtifact,
  sessionDate: Date,
  options: ExportDocumentOptions,
): string {
  return JSON.stringify(
    {
      app: 'Astra/log',
      type: options.style,
      exportedAt: sessionDate.toISOString(),
      sections: artifact.sections,
      scratchPad: options.includeScratchPad ? (options.scratchPadContent || '') : undefined,
    },
    null,
    2,
  );
}

/**
 * Triggers a file download. Uses Tauri native save dialog on desktop,
 * falls back to blob URL + anchor click in the browser.
 */
export async function downloadTextFile(content: string, filename: string, mimeType: string): Promise<void> {
  if (isTauriRuntime()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({
        defaultPath: filename,
        filters: [{
          name: 'Document',
          extensions: [filename.split('.').pop() || 'txt'],
        }],
      });
      if (path) {
        await writeTextFile(path, content);
        return;
      }
      // User cancelled — no fallback needed
      return;
    } catch {
      // Plugin not available — fall through to browser approach
    }
  }

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
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
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^#{1,6}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/((?:^[-*]\s+.+\n?)+)/gm, block => {
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

export function generateHtmlDocument(
  artifact: ParsedArtifact,
  sessionDate: Date,
  options: ExportDocumentOptions,
): string {
  const dateStr = sessionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sectionsHtml = artifact.sections
    .map(s => `<section><h2>${escapeHtml(s.title)}</h2>${mdToHtml(s.content)}</section>`)
    .join('\n');

  const scratchSection = options.includeScratchPad
    ? `<section><h2>Scratch Pad Notes (Local Only)</h2>${mdToHtml((options.scratchPadContent || '').trim() || '_No scratch pad notes included._')}</section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Astra/log — ${STYLE_LABELS[options.style]}</title>
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
  <h1>Astra/log — ${STYLE_LABELS[options.style]}</h1>
  <p class="meta">Exported: ${dateStr}</p>
  <hr />
  ${sectionsHtml}
  ${scratchSection}
</body>
</html>`;
}

/**
 * Opens a new browser window with formatted artifact content and triggers the
 * system print dialog — the user can choose "Save as PDF" from there.
 * On Tauri desktop, saves as HTML file with native dialog instead.
 */
export async function printAsPDF(
  artifact: ParsedArtifact,
  sessionDate: Date,
  options: ExportDocumentOptions,
): Promise<void> {
  const printContent = generateHtmlDocument(artifact, sessionDate, options);

  // On Tauri, save as HTML since window.open for print doesn't work reliably
  if (isTauriRuntime()) {
    const base = `astra-log-${options.style}-${new Date().toISOString().slice(0, 10)}`;
    await downloadTextFile(printContent, `${base}.html`, 'text/html');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    const md = generateMarkdownDocument(artifact, sessionDate, options);
    await downloadTextFile(md, 'astra-log-artifact.md', 'text/markdown');
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
