import { Shield, ShieldAlert, ShieldX, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import type { ScanResult, ScanLevel } from '../lib/containmentScan';

interface Props {
  result: ScanResult;
  onProceed: () => void;
  onCancel: () => void;
}

const LEVEL_CONFIG: Record<ScanLevel, {
  label: string;
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  badgeClass: string;
  borderClass: string;
  proceedLabel: string;
  proceedClass: string;
}> = {
  safe: {
    label: 'Safe',
    icon: Shield,
    iconClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    borderClass: 'border-emerald-500/20',
    proceedLabel: 'Install Dependencies',
    proceedClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  warning: {
    label: 'Warning',
    icon: ShieldAlert,
    iconClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    borderClass: 'border-amber-500/30',
    proceedLabel: 'Proceed Anyway',
    proceedClass: 'bg-amber-600 hover:bg-amber-500 text-white',
  },
  'high-risk': {
    label: 'High Risk',
    icon: ShieldX,
    iconClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    borderClass: 'border-rose-500/30',
    proceedLabel: 'Run Anyway (Risky)',
    proceedClass: 'bg-rose-700 hover:bg-rose-600 text-white',
  },
};

const FINDING_ICON: Record<ScanLevel, ComponentType<{ className?: string }>> = {
  safe: CheckCircle,
  warning: AlertTriangle,
  'high-risk': XCircle,
};

const FINDING_CLASS: Record<ScanLevel, string> = {
  safe: 'text-emerald-400',
  warning: 'text-amber-400',
  'high-risk': 'text-rose-400',
};

export function ContainmentScanModal({ result, onProceed, onCancel }: Props) {
  const [showFindings, setShowFindings] = useState(result.level !== 'safe');
  const config = LEVEL_CONFIG[result.level];
  const LevelIcon = config.icon;

  const summary =
    result.level === 'safe'
      ? 'No suspicious patterns detected. Safe to install.'
      : result.level === 'warning'
      ? 'Some patterns warrant attention. Review findings before proceeding.'
      : 'High-risk patterns detected. Installing these dependencies could be dangerous.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 bg-zinc-900 border ${config.borderClass} rounded-2xl shadow-2xl`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <LevelIcon className={`w-5 h-5 shrink-0 ${config.iconClass}`} />
          <div>
            <h2 className="text-sm font-semibold text-white">Containment Scan</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Pre-install security analysis</p>
          </div>
          <span className={`ml-auto px-2.5 py-0.5 text-xs font-semibold rounded-full border ${config.badgeClass}`}>
            {config.label}
          </span>
        </div>

        {/* Summary */}
        <div className="px-5 py-4">
          <p className="text-sm text-zinc-300">{summary}</p>

          {/* Findings toggle */}
          {result.findings.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowFindings(v => !v)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showFindings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showFindings ? 'Hide' : 'Show'} {result.findings.length} finding{result.findings.length !== 1 ? 's' : ''}
              </button>

              {showFindings && (
                <ul className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {result.findings.map((f, i) => {
                    const FindingIcon = FINDING_ICON[f.level];
                    return (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                        <FindingIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${FINDING_CLASS[f.level]}`} />
                        <span className="break-words">{f.message}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
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
            onClick={onProceed}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${config.proceedClass}`}
          >
            {config.proceedLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
