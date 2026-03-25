/** Phase 5 — Artifact System: Export modal with structured sections and evolution snapshots. */
import { useState } from 'react';
import { X, Download, FileText, Camera, AlignLeft } from 'lucide-react';
import type { ParsedArtifact } from '../lib/exportUtils';
import { generateMarkdownDocument, downloadMarkdown, printAsPDF } from '../lib/exportUtils';

export interface PlanSnapshot {
  id: string;
  timestamp: Date;
  label: string;
  artifact: ParsedArtifact;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Current artifact derived from AI planning messages. */
  artifact: ParsedArtifact;
  /** Session-only snapshots taken so far. */
  snapshots: PlanSnapshot[];
  /** Called when the user requests a snapshot of the current plan. */
  onTakeSnapshot: () => void;
}

type ModalView = 'export' | 'snapshots' | 'compare';

export function ExportModal({ isOpen, onClose, artifact, snapshots, onTakeSnapshot }: Props) {
  const [view, setView] = useState<ModalView>('export');
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');

  if (!isOpen) return null;

  const sessionDate = new Date();

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownDocument(artifact, sessionDate);
    downloadMarkdown(md);
  };

  const handleDownloadPDF = () => {
    printAsPDF(artifact, sessionDate);
  };

  const snapshotA = snapshots.find(s => s.id === compareA);
  const snapshotB = snapshots.find(s => s.id === compareB);

  const sectionColors = (s: { title: string }) => {
    const colors: Record<string, string> = {
      UX: 'text-violet-300 bg-violet-500/12 border-violet-500/25',
      Logic: 'text-cyan-300 bg-cyan-500/12 border-cyan-500/25',
      Architecture: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/25',
    };
    return colors[s.title] ?? 'text-indigo-300 bg-indigo-500/12 border-indigo-500/25';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111113] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4 overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-white/3 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Artifact Export</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView('export')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${view === 'export' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
            >
              Export
            </button>
            <button
              onClick={() => setView('snapshots')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${view === 'snapshots' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
            >
              Snapshots{snapshots.length > 0 ? ` (${snapshots.length})` : ''}
            </button>
            {snapshots.length >= 2 && (
              <button
                onClick={() => setView('compare')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${view === 'compare' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                Compare
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 ml-2 text-zinc-500 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Export Tab ────────────────────────────────────────────────── */}
          {view === 'export' && (
            <div className="p-5 space-y-5">
              {artifact.sections.length === 0 ? (
                <div className="text-center py-10">
                  <AlignLeft className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No planning content yet.</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    Start a conversation and generate an implementation plan first.
                  </p>
                </div>
              ) : (
                <>
                  {/* Section previews */}
                  <div className="space-y-3">
                    {artifact.sections.map(section => (
                      <div key={section.title} className={`border rounded-xl p-4 ${sectionColors(section)}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${sectionColors(section)}`}>
                            {section.title}
                          </span>
                        </div>
                        <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-28 overflow-y-auto">
                          {section.content.length > 480
                            ? section.content.substring(0, 480) + '…'
                            : section.content}
                        </pre>
                      </div>
                    ))}
                  </div>

                  {/* Download buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleDownloadMarkdown}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Markdown
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/30 rounded-xl text-sm font-medium transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </>
              )}

              {/* Take snapshot */}
              <div className="pt-1 border-t border-white/8">
                <button
                  onClick={onTakeSnapshot}
                  disabled={artifact.sections.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/4 hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 border border-white/10 rounded-xl text-sm transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Snapshot Current Plan
                </button>
                <p className="text-[11px] text-zinc-600 text-center mt-1.5">
                  Snapshots record the current plan state for later comparison
                </p>
              </div>
            </div>
          )}

          {/* ── Snapshots Tab ─────────────────────────────────────────────── */}
          {view === 'snapshots' && (
            <div className="p-5">
              {snapshots.length === 0 ? (
                <div className="text-center py-10">
                  <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No snapshots taken yet.</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    Use "Snapshot Current Plan" on the Export tab to capture a moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snap, i) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{snap.label}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {snap.timestamp.toLocaleString()} ·{' '}
                          {snap.artifact.sections.length}{' '}
                          section{snap.artifact.sections.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const md = generateMarkdownDocument(snap.artifact, snap.timestamp);
                          downloadMarkdown(md, `astra-log-snapshot-${i + 1}.md`);
                        }}
                        className="p-2 text-zinc-500 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Download snapshot as Markdown"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Compare Tab ───────────────────────────────────────────────── */}
          {view === 'compare' && snapshots.length >= 2 && (
            <div className="p-5 space-y-4">
              {/* Snapshot selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Snapshot A
                  </label>
                  <select
                    value={compareA}
                    onChange={e => setCompareA(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40"
                  >
                    <option value="">Select…</option>
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Snapshot B
                  </label>
                  <select
                    value={compareB}
                    onChange={e => setCompareB(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40"
                  >
                    <option value="">Select…</option>
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side-by-side diff view */}
              {snapshotA && snapshotB && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                      {snapshotA.label}
                    </div>
                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 max-h-72 overflow-y-auto">
                      <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {snapshotA.artifact.sections
                          .map(s => `## ${s.title}\n\n${s.content}`)
                          .join('\n\n---\n\n') || '(empty)'}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                      {snapshotB.label}
                    </div>
                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 max-h-72 overflow-y-auto">
                      <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {snapshotB.artifact.sections
                          .map(s => `## ${s.title}\n\n${s.content}`)
                          .join('\n\n---\n\n') || '(empty)'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {(!snapshotA || !snapshotB) && (
                <p className="text-zinc-600 text-xs text-center py-4">
                  Select two snapshots above to compare them side by side.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
