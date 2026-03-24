import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface ScratchPadProps {
  /** Increment to clear the scratch pad content on session reset. */
  resetKey?: number;
}

export function ScratchPad({ resetKey }: ScratchPadProps) {
  const [content, setContent] = useState('');

  // Clear notes whenever a new session starts
  useEffect(() => {
    setContent('');
  }, [resetKey]);

  const handleClear = () => {
    if (!content) return;
    if (window.confirm('Clear all scratch pad notes?')) {
      setContent('');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 relative">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Private notes — never shared with AI…"
          className="absolute inset-0 w-full h-full bg-transparent text-sm text-zinc-300 placeholder-zinc-600 resize-none focus:outline-none font-mono leading-relaxed p-4"
          spellCheck={false}
        />
      </div>
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/5 shrink-0">
        <span className="text-[10px] text-zinc-700 select-none">Session only · cleared on reset</span>
        <button
          onClick={handleClear}
          className={`p-1 transition-colors ${content ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-800 cursor-default'}`}
          title="Clear notes"
          disabled={!content}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
