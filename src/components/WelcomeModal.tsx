import { Brain, Trash2, Zap } from 'lucide-react';

interface Props {
  onStartTour: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ onStartTour, onSkip }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg mx-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Welcome to Astra/log</h1>
              <p className="text-xs text-zinc-500">Your transient workspace for rapid exploration</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Before you dive in, here are the two core principles that make this tool unique.
          </p>
        </div>

        {/* Core Principles */}
        <div className="px-6 space-y-3 pb-5">

          {/* Zero Persistence */}
          <div className="flex gap-3 p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-rose-300 mb-1">Zero Persistence</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Everything disappears when you close or reset. No accounts, no saved sessions,
                no history. The value is in the{' '}
                <span className="text-zinc-300 italic">insight gained</span>, not the files saved.
              </p>
            </div>
          </div>

          {/* Consultant AI */}
          <div className="flex gap-3 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-300 mb-1">AI as Consultant, Not Coder</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The AI is here to explain, plan, and guide — not write code for you. It reads
                your project and helps you{' '}
                <span className="text-zinc-300 italic">understand what's happening</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-white/8 bg-white/3 rounded-b-2xl">
          <p className="text-xs text-zinc-600">You can re-read this anytime via the <span className="text-zinc-500">?</span> icon.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={onStartTour}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              Take a quick tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
