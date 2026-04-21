import { useState, useEffect } from 'react';
import { Trash2, Clock3, List, Heading2, ArrowUpRight } from 'lucide-react';

// Auto-prepended prefix in bullet mode — must stay in sync with
// the `- ` Markdown list item format expected by the textarea.
const BULLET_PREFIX = '\n- ';

interface ScratchPadProps {
  /** Increment to clear the scratch pad content on session reset. */
  resetKey?: number;
  /** Optional controlled content from parent. */
  value?: string;
  /** Notifies parent when content changes. */
  onChange?: (value: string) => void;
  /** Called when the user stages current notes to be prepended to the next AI message. */
  onStageNotes?: () => void;
}

export function ScratchPad({ resetKey, value, onChange, onStageNotes }: ScratchPadProps) {
  const [content, setContent] = useState('');
  const [bulletMode, setBulletMode] = useState(false);
  const [stageConfirmed, setStageConfirmed] = useState(false);
  const currentContent = value ?? content;
  const setCurrentContent = (next: string) => {
    if (value === undefined) {
      setContent(next);
    }
    onChange?.(next);
  };

  // Clear notes whenever a new session starts
  useEffect(() => {
    setCurrentContent('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleStageNotes = () => {
    if (!currentContent || !onStageNotes) return;
    onStageNotes();
    setStageConfirmed(true);
    setTimeout(() => setStageConfirmed(false), 2000);
  };

  const handleClear = () => {
    if (!currentContent) return;
    setCurrentContent('');
  };

  const insertTimestamp = () => {
    const now = new Date();
    const stamp = `\n\n--- ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ---\n`;
    setCurrentContent(`${currentContent}${stamp}`);
  };

  const insertSection = () => {
    setCurrentContent(`${currentContent}\n\n## Notes\n`);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setBulletMode(v => !v)}
            className={`p-1 rounded transition-colors ${bulletMode ? 'text-amber-300 bg-amber-500/10' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}
            title="Toggle quick bullets mode"
          >
            <List className="w-3 h-3" />
          </button>
          <button
            onClick={insertTimestamp}
            className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            title="Insert timestamp separator"
          >
            <Clock3 className="w-3 h-3" />
          </button>
          <button
            onClick={insertSection}
            className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            title="Insert note section heading"
          >
            <Heading2 className="w-3 h-3" />
          </button>
          {onStageNotes && (
            <button
              onClick={handleStageNotes}
              disabled={!currentContent}
              className={`p-1 rounded transition-colors flex items-center gap-1 text-[10px] font-medium ${
                stageConfirmed
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : currentContent
                    ? 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-500/10'
                    : 'text-zinc-800 cursor-default'
              }`}
              title="Stage notes for AI — prepend to next chat message"
            >
              <ArrowUpRight className="w-3 h-3" />
              {stageConfirmed ? <span>Staged!</span> : <span>Stage for AI</span>}
            </button>
          )}
        </div>
        <span className="text-[10px] text-zinc-700 select-none">Local only</span>
      </div>
      <div className="flex-1 min-h-0 relative">
        <textarea
          id="scratch-pad-input"
          value={currentContent}
          onChange={e => setCurrentContent(e.target.value)}
          onKeyDown={e => {
            if (!bulletMode || e.key !== 'Enter') return;
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart, selectionEnd, value } = el;
            const newValue = value.slice(0, selectionStart) + BULLET_PREFIX + value.slice(selectionEnd);
            setCurrentContent(newValue);
            // Restore cursor after the inserted prefix
            requestAnimationFrame(() => {
              el.selectionStart = el.selectionEnd = selectionStart + BULLET_PREFIX.length;
            });
          }}
          placeholder="Private notes — never shared with AI…"
          className="absolute inset-0 w-full h-full bg-transparent text-sm text-zinc-300 placeholder-zinc-600 resize-none focus:outline-none font-mono leading-relaxed p-4"
          spellCheck={false}
        />
      </div>
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/5 shrink-0">
        <span className="text-[10px] text-zinc-700 select-none">Session only · cleared on reset</span>
        <button
          onClick={handleClear}
          className={`p-1 transition-colors ${currentContent ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-800 cursor-default'}`}
          title="Clear notes"
          disabled={!currentContent}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
