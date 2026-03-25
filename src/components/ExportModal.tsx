/** Phase 5 — Artifact System: Export modal with structured sections and evolution snapshots. */
import { useMemo, useState } from 'react';
import { X, Download, FileText, Camera, AlignLeft, CheckSquare, Square } from 'lucide-react';
import type { ParsedArtifact, ExportStyle } from '../lib/exportUtils';
import {
  generateMarkdownDocument,
  generatePlainTextDocument,
  generateJsonDocument,
  generateHtmlDocument,
  downloadTextFile,
  printAsPDF,
} from '../lib/exportUtils';

export interface PlanSnapshot {
  id: string;
  timestamp: Date;
  label: string;
  artifact: ParsedArtifact;
  style: ExportStyle;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Current artifact derived from AI planning messages. */
  artifact: ParsedArtifact;
  /** Current export style selected by the user. */
  exportStyle: ExportStyle;
  /** Called when the user changes export style. */
  onChangeExportStyle: (style: ExportStyle) => void;
  /** Scratch pad notes (private local notes) that can be optionally appended. */
  scratchPadContent: string;
  /** Session-only snapshots taken so far. */
  snapshots: PlanSnapshot[];
  /** Called when the user requests a snapshot of the current plan. */
  onTakeSnapshot: () => void;
}

type ModalView = 'export' | 'snapshots' | 'compare';
type FileFormat = 'md' | 'txt' | 'json' | 'html' | 'pdf';

const STYLE_LABELS: Record<ExportStyle, string> = {
  recap: 'Simple recap of notes sent to AI',
  'implementation-plan': 'Implementation plan',
  'fix-list': 'Structured list of fixes (no plan)',
};

const STYLE_FILENAME: Record<ExportStyle, string> = {
  recap: 'recap',
  'implementation-plan': 'implementation-plan',
  'fix-list': 'fix-list',
};

export function ExportModal({
  isOpen,
  onClose,
  artifact,
  exportStyle,
  onChangeExportStyle,
  scratchPadContent,
  snapshots,
  onTakeSnapshot,
}: Props) {
  const [view, setView] = useState<ModalView>('export');
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [includeScratchPad, setIncludeScratchPad] = useState(false);

  if (!isOpen) return null;

  const sessionDate = new Date();

  const exportOptions = useMemo(
    () => ({
      style: exportStyle,
      includeScratchPad,
      scratchPadContent,
    }),
    [exportStyle, includeScratchPad, scratchPadContent],
  );

  const handleDownload = (format: FileFormat) => {
    const base = `astra-log-${STYLE_FILENAME[exportStyle]}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'pdf') {
      printAsPDF(artifact, sessionDate, exportOptions);
      return;
    }

    if (format === 'md') {
      const md = generateMarkdownDocument(artifact, sessionDate, exportOptions);
      downloadTextFile(md, `${base}.md`, 'text/markdown');
      return;
    }

    if (format === 'txt') {
      const text = generatePlainTextDocument(artifact, sessionDate, exportOptions);
      downloadTextFile(text, `${base}.txt`, 'text/plain');
      return;
    }

    if (format === 'json') {
      const json = generateJsonDocument(artifact, sessionDate, exportOptions);
      downloadTextFile(json, `${base}.json`, 'application/json');
      return;
    }

    const html = generateHtmlDocument(artifact, sessionDate, exportOptions);
    downloadTextFile(html, `${base}.html`, 'text/html');
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

        <div className="flex-1 overflow-y-auto">
          {view === 'export' && (
            <div className="p-5 space-y-5">
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/3 p-3">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">Export style</p>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(STYLE_LABELS) as ExportStyle[]).map(style => (
                    <button
                      key={style}
                      onClick={() => onChangeExportStyle(style)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        exportStyle === style
                          ? 'bg-indigo-500/15 border-indigo-500/35 text-indigo-200'
                          : 'bg-black/25 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      {STYLE_LABELS[style]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIncludeScratchPad(prev => !prev)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/3 hover:bg-white/5 text-sm text-zinc-300"
              >
                {includeScratchPad ? <CheckSquare className="w-4 h-4 text-emerald-300" /> : <Square className="w-4 h-4 text-zinc-500" />}
                Include Scratch Pad notes at bottom (never sent to AI)
              </button>

              {artifact.sections.length === 0 ? (
                <div className="text-center py-10">
                  <AlignLeft className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No planning content yet.</p>
                  <p className="text-zinc-600 text-xs mt-1">Start a conversation to create exportable output.</p>
                </div>
              ) : (
                <>
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
                    {includeScratchPad && (
                      <div className="border rounded-xl p-4 border-amber-500/20 bg-amber-500/10 text-amber-200">
                        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-500/30">
                          Scratch Pad Addendum
                        </span>
                        <pre className="mt-2 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-24 overflow-y-auto text-amber-100/90">
                          {(scratchPadContent || '').trim() || 'No scratch pad notes yet.'}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleDownload('md')} className="py-2.5 px-4 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Markdown
                    </button>
                    <button onClick={() => handleDownload('pdf')} className="py-2.5 px-4 bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={() => handleDownload('txt')} className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/15 rounded-xl text-sm font-medium transition-colors">
                      Plain Text (.txt)
                    </button>
                    <button onClick={() => handleDownload('html')} className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/15 rounded-xl text-sm font-medium transition-colors">
                      HTML (.html)
                    </button>
                    <button onClick={() => handleDownload('json')} className="col-span-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/15 rounded-xl text-sm font-medium transition-colors">
                      JSON (.json)
                    </button>
                  </div>
                </>
              )}

              <div className="pt-1 border-t border-white/8">
                <button
                  onClick={onTakeSnapshot}
                  disabled={artifact.sections.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/4 hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 border border-white/10 rounded-xl text-sm transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Snapshot Current Plan
                </button>
                <p className="text-[11px] text-zinc-600 text-center mt-1.5">Snapshots record the current plan state for later comparison</p>
              </div>
            </div>
          )}

          {view === 'snapshots' && (
            <div className="p-5">
              {snapshots.length === 0 ? (
                <div className="text-center py-10">
                  <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No snapshots taken yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snap, i) => (
                    <div key={snap.id} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-white">{snap.label}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {snap.timestamp.toLocaleString()} · {snap.style} · {snap.artifact.sections.length} section{snap.artifact.sections.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const md = generateMarkdownDocument(snap.artifact, snap.timestamp, {
                            style: snap.style,
                            includeScratchPad: false,
                          });
                          downloadTextFile(md, `astra-log-snapshot-${i + 1}.md`, 'text/markdown');
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

          {view === 'compare' && snapshots.length >= 2 && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Snapshot A</label>
                  <select value={compareA} onChange={e => setCompareA(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40">
                    <option value="">Select…</option>
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Snapshot B</label>
                  <select value={compareB} onChange={e => setCompareB(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40">
                    <option value="">Select…</option>
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {snapshotA && snapshotB && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{snapshotA.label}</div>
                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 max-h-72 overflow-y-auto">
                      <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {snapshotA.artifact.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n') || '(empty)'}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{snapshotB.label}</div>
                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 max-h-72 overflow-y-auto">
                      <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {snapshotB.artifact.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n') || '(empty)'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {(!snapshotA || !snapshotB) && (
                <p className="text-zinc-600 text-xs text-center py-4">Select two snapshots above to compare them side by side.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
