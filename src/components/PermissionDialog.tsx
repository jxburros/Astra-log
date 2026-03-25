import { Terminal, ShieldCheck, X } from 'lucide-react';

interface Props {
  command: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PermissionDialog({ command, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-white">Permission Required</h2>
            <p className="text-xs text-zinc-400 mt-0.5">AI-suggested terminal command</p>
          </div>
          <button
            onClick={onCancel}
            className="ml-auto p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-xs text-zinc-400 mb-2">
            Run the following command in the terminal?
          </p>
          <div className="flex items-start gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
            <code className="text-xs text-emerald-300 font-mono break-all">{command}</code>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Only run commands you understand. This will execute directly in the sandbox terminal.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10 bg-white/5 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2"
          >
            <Terminal className="w-3.5 h-3.5" />
            Run Command
          </button>
        </div>
      </div>
    </div>
  );
}
