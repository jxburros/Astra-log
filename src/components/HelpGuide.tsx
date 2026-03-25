import { X, Keyboard, Lightbulb, Brain, Trash2, PenLine, Terminal as TerminalIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', '.'], label: 'Toggle Scratch Pad open/closed' },
  { keys: ['Ctrl', 'Shift', 'K'], label: 'Focus Scratch Pad (opens if collapsed)' },
  { keys: [mod, 'K'], label: 'Command Palette (when available)' },
];

interface Tip {
  icon: ReactNode;
  title: string;
  body: string;
}

const TIPS: Tip[] = [
  {
    icon: <PenLine className="w-4 h-4 text-amber-400" />,
    title: 'Think first, then talk to AI',
    body: 'Use the Scratch Pad to dump your raw thoughts before framing a question. The AI gives better answers when you arrive with a clear question rather than vague uncertainty.',
  },
  {
    icon: <TerminalIcon className="w-4 h-4 text-emerald-400" />,
    title: 'Drop the ZIP, watch the boot',
    body: 'Drag a project ZIP onto the workspace. Astra/log reads package.json, extracts start scripts, installs dependencies, and boots — all automatically. No CLI needed.',
  },
  {
    icon: <Brain className="w-4 h-4 text-indigo-400" />,
    title: 'Stage your notes for AI context',
    body: 'Click "Stage for AI" (↗) in the Scratch Pad toolbar to prepend your current notes to the next AI message. Great for giving the AI a summary of what you already know.',
  },
  {
    icon: <Trash2 className="w-4 h-4 text-rose-400" />,
    title: 'Sessions are truly disposable',
    body: 'Click "New Project" to completely wipe the filesystem, terminal output, chat history, and Scratch Pad. Everything is gone — this is by design. Iterate freely.',
  },
];

export function HelpGuide({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl mx-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <span className="text-xs font-bold text-indigo-400">?</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Usage Guide</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Shortcuts &amp; workflow tips for Astra/log</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

          {/* ── Keyboard Shortcuts ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="w-3.5 h-3.5 text-zinc-500" />
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Keyboard Shortcuts</h3>
            </div>
            <div className="space-y-1.5">
              {SHORTCUTS.map(({ keys, label }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 px-3 py-2.5 bg-black/30 border border-white/6 rounded-lg"
                >
                  <span className="text-xs text-zinc-400">{label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded shadow-sm font-mono">
                          {k}
                        </kbd>
                        {i < keys.length - 1 && (
                          <span className="text-[10px] text-zinc-600">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Workflow Tips ──────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-3.5 h-3.5 text-zinc-500" />
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Workflow Tips</h3>
            </div>
            <div className="space-y-2">
              {TIPS.map(({ icon, title, body }) => (
                <div
                  key={title}
                  className="flex gap-3 p-3 bg-black/30 border border-white/6 rounded-xl"
                >
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-200 mb-1">{title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-white/8 bg-white/3 rounded-b-2xl">
          <p className="text-xs text-zinc-600">
            Astra/log — Transient Workspace
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
