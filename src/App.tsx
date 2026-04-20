import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WebContainer } from '@webcontainer/api';
import { Terminal } from 'xterm';
import { Upload, RefreshCw, AlertCircle, ExternalLink, Terminal as TerminalIcon, Globe, Settings as SettingsIcon, Smartphone, Tablet, Monitor, FolderOpen, PenLine, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical, GripHorizontal, Pin, PinOff, LayoutDashboard, PanelBottom, Maximize2, HelpCircle, LayoutGrid, Minus, Plus } from 'lucide-react';
import { parseZipToTree, parsePackageJsonScripts, extractCommandsFromReadme, buildBootCommands, extractSubtree } from './lib/zipParser';
import { scanPackageJson } from './lib/containmentScan';
import type { ScanResult } from './lib/containmentScan';
import { buildExportArtifact, generateAIExportArtifact } from './lib/exportUtils';
import type { ExportStyle, AIExportSettings } from './lib/exportUtils';
import { TerminalComponent } from './components/TerminalComponent';
import { ChatPanel } from './components/ChatPanel';
import type { TroubleshootRequest } from './components/ChatPanel';
import type { Message } from './components/ChatPanel';
import { SettingsModal, Settings } from './components/SettingsModal';
import { ScratchPad } from './components/ScratchPad';
import { ContainmentScanModal } from './components/ContainmentScanModal';
import { PermissionDialog } from './components/PermissionDialog';
import { ExportModal } from './components/ExportModal';
import type { PlanSnapshot } from './components/ExportModal';
import { WelcomeModal } from './components/WelcomeModal';
import { WorkspaceTour } from './components/WorkspaceTour';
import { HelpGuide } from './components/HelpGuide';
import AstraLogLogo from '../astra-log-new-logo.svg';

type Status = 'idle' | 'uploading' | 'booting' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error';
type PreviewMode = 'mobile' | 'tablet' | 'desktop';
type LayoutPreset = 'standard' | 'architect' | 'zen-focus' | 'custom';

// Custom layout types
type PanelId = 'terminal' | 'preview' | 'chat' | 'scratch';
type CustomPanelEntry = { panel: PanelId; heightFraction: number; hidden: boolean };
type CustomColumnConfig = { widthFraction: number; panels: CustomPanelEntry[] };
type CustomLayoutConfig = { columns: CustomColumnConfig[] };
type CustomDragData = { panel: PanelId; fromColIdx: number };

const DEFAULT_CUSTOM_LAYOUT: CustomLayoutConfig = {
  columns: [
    // 22% — Terminal only
    { widthFraction: 0.22, panels: [{ panel: 'terminal', heightFraction: 1, hidden: false }] },
    // 48% — Preview only
    { widthFraction: 0.48, panels: [{ panel: 'preview', heightFraction: 1, hidden: false }] },
    // 30% — Chat (55%) stacked above Scratch (45%)
    { widthFraction: 0.30, panels: [
      { panel: 'chat', heightFraction: 0.55, hidden: false },
      { panel: 'scratch', heightFraction: 0.45, hidden: false }
    ] },
  ]
};

/** Duration (ms) for the radial-wipe-in animation — must match CSS `animate-wipe-in`. */
const WIPE_IN_DURATION = 600;
/** Duration (ms) for the wipe fade-out — must match CSS `animate-wipe-out`. */
const WIPE_OUT_DURATION = 300;
/** Minimum Scratch Pad width (px) in Zen layout. */
const ZEN_LAYOUT_SCRATCH_MIN_WIDTH = 380;
/** Minimum width (px) for the Preview panel in the standard layout. */
const PREVIEW_MIN_WIDTH = 300;

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBaseUrl, setPreviewBaseUrl] = useState<string>('');
  const [browserPath, setBrowserPath] = useState<string>('/');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isIsolated, setIsIsolated] = useState(true);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [isDragging, setIsDragging] = useState(false);
  /** Message shown in the UI and terminal overlay during multi-tier boot recovery. */
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  /** Payload forwarded to ChatPanel to trigger automated AI troubleshooting. */
  const [troubleshootRequest, setTroubleshootRequest] = useState<TroubleshootRequest | null>(null);
  
  /** Incremented each time a new project session starts to force-reset the ChatPanel. */
  const [chatKey, setChatKey] = useState(0);
  /** Incremented to fully reset the hidden upload input when starting a new project. */
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showGrokWarning, setShowGrokWarning] = useState(false);
  /** Controls the "Start new project?" confirmation modal (replaces window.confirm). */
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('ai_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { model: '', ...parsed };
      } catch (e) {}
    }
    return { provider: 'gemini', apiKey: '', localUrl: 'http://localhost:11434', model: 'gemini-2.5-flash' };
  });

  // ── Layout / workspace state (Phase 1) ────────────────────────────────────
  /** Panel pixel widths — stored in sessionStorage so they survive hot-reloads. */
  const [terminalWidth, setTerminalWidth] = useState<number>(() => {
    const v = sessionStorage.getItem('layout_terminalWidth');
    return v ? Number(v) : 280;
  });
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const v = sessionStorage.getItem('layout_chatWidth');
    return v ? Number(v) : 360;
  });
  const [scratchWidth, setScratchWidth] = useState<number>(() => {
    const v = sessionStorage.getItem('layout_scratchWidth');
    return v ? Number(v) : 260;
  });
  /** Which panels are collapsed. */
  const [terminalCollapsed, setTerminalCollapsed] = useState<boolean>(() =>
    sessionStorage.getItem('layout_terminalCollapsed') === 'true'
  );
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(() =>
    sessionStorage.getItem('layout_chatCollapsed') === 'true'
  );
  const [scratchCollapsed, setScratchCollapsed] = useState<boolean>(() =>
    sessionStorage.getItem('layout_scratchCollapsed') === 'true'
  );
  /** Prevent accidental scratch pad collapse during active note-taking. */
  const [scratchPinned, setScratchPinned] = useState<boolean>(() =>
    sessionStorage.getItem('layout_scratchPinned') === 'true'
  );
  /** When true an intentional-destruction animation is playing. */
  const [isDestroying, setIsDestroying] = useState(false);
  /** Drives the "fade-out" phase of the destruction overlay. */
  const [destroyFadeOut, setDestroyFadeOut] = useState(false);
  /** Incremented to signal the ScratchPad to wipe its notes. */
  const [scratchKey, setScratchKey] = useState(0);
  /** Active layout preset — persisted to sessionStorage. */
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>(() =>
    (sessionStorage.getItem('layout_preset') as LayoutPreset | null) ?? 'standard'
  );
  /** Terminal height (px) used in the Architect layout. */
  const [terminalHeight, setTerminalHeight] = useState<number>(() => {
    const v = sessionStorage.getItem('layout_terminalHeight');
    return v ? Number(v) : 220;
  });
  /** True when the viewport is narrow (< 900 px) — triggers mobile bottom-drawer layout. */
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.innerWidth < 900);
  /** Active panel in the mobile bottom drawer. */
  const [activeDrawerTab, setActiveDrawerTab] = useState<'terminal' | 'chat' | 'scratch' | null>(null);
  /** Layout edit mode has been removed; non-custom layouts are now fixed presets. */
  const layoutEditMode = false;
  /** Terminal position in standard layout: left or right of preview. Persisted. */
  const [terminalSide, setTerminalSide] = useState<'left' | 'right'>(() =>
    (sessionStorage.getItem('layout_terminalSide') as 'left' | 'right') ?? 'left'
  );
  /** Chat-first or Scratch-first within the right panel. Persisted. */
  const [chatFirst, setChatFirst] = useState<boolean>(() =>
    sessionStorage.getItem('layout_chatFirst') !== 'false'
  );
  /** Total width of the combined Chat+Scratch right panel. Persisted. */
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    const v = sessionStorage.getItem('layout_rightPanelWidth');
    return v ? Number(v) : 620;
  });
  /** Height (px) of the Chat panel in the standard layout's vertical right column. */
  const [chatPanelHeight, setChatPanelHeight] = useState<number>(() => {
    const v = sessionStorage.getItem('layout_chatPanelHeight');
    return v ? Number(v) : 400;
  });
  /** Custom layout configuration — persisted to sessionStorage. */
  const [customLayout, setCustomLayout] = useState<CustomLayoutConfig>(() => {
    const v = sessionStorage.getItem('layout_customLayout');
    try { return v ? JSON.parse(v) : DEFAULT_CUSTOM_LAYOUT; } catch { return DEFAULT_CUSTOM_LAYOUT; }
  });
  const [customDraggingPanel, setCustomDraggingPanel] = useState<CustomDragData | null>(null);
  const [customDropColumn, setCustomDropColumn] = useState<number | null>(null);
  const [customLayoutLocked, setCustomLayoutLocked] = useState<boolean>(() =>
    sessionStorage.getItem('layout_customLocked') === 'true'
  );
  /** Local-only scratch pad content (never sent to AI). */
  const [scratchPadContent, setScratchPadContent] = useState('');
  /** Scratch Pad notes staged by the user to be prepended to the next AI message. */
  const [stagedNotes, setStagedNotes] = useState<string>('');
  // ── Phase 4: Security & Trust Layer ───────────────────────────────────────
  /** Active containment scan result waiting for user decision. */
  const [scanModalResult, setScanModalResult] = useState<ScanResult | null>(null);
  /** Resolve callback for the containment scan promise. */
  const scanResolveRef = useRef<((proceed: boolean) => void) | null>(null);
  /** Command waiting for user permission before running in terminal. */
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  /** Resolve callback for the permission dialog promise. */
  const permissionResolveRef = useRef<((proceed: boolean) => void) | null>(null);
  // ── Phase 5: Artifact System ───────────────────────────────────────────────
  /** Whether the export/snapshot modal is open. */
  const [isExportOpen, setIsExportOpen] = useState(false);
  /** Parsed artifact passed to the export modal (derived from current chat messages). */
  const [exportArtifact, setExportArtifact] = useState(() => buildExportArtifact([], 'implementation-plan'));
  /** Current export style selected in the export modal. */
  const [exportStyle, setExportStyle] = useState<ExportStyle>('implementation-plan');
  /** Last chat message history used as source for export style regeneration. */
  const [exportSourceMessages, setExportSourceMessages] = useState<Message[]>([]);
  /** Session-only plan snapshots; cleared when a new project session starts. */
  const [planSnapshots, setPlanSnapshots] = useState<PlanSnapshot[]>([]);
  /** Whether the AI is currently generating export artifact content. */
  const [isExportGenerating, setIsExportGenerating] = useState(false);
  // ── 1.0: Session Freshness Indicator ──────────────────────────────────────
  /** Unix timestamp (ms) when the current session started (i.e. first non-idle status). */
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  /** Elapsed seconds displayed next to the "New Project" button. Updated every second. */
  const [sessionElapsedSecs, setSessionElapsedSecs] = useState(0);
  // ── Phase 3: Onboarding & Help ─────────────────────────────────────────────
  /** Whether the one-time welcome modal is visible. */
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(
    () => localStorage.getItem('astra_welcome_seen') !== 'true'
  );
  /** Whether the 3-step workspace tour overlay is active. */
  const [isTourOpen, setIsTourOpen] = useState(false);
  /** Whether the in-app help / usage guide modal is open. */
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  // Keep a ref so async boot callbacks always read the latest settings
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  
  const terminalRef = useRef<Terminal | null>(null);
  const webcontainerRef = useRef<WebContainer | null>(null);
  /**
   * Holds the single in-flight (or already-resolved) WebContainer.boot() promise.
   * WebContainer.boot() must only be called once per page load; a second call returns
   * a Promise that never resolves, permanently hanging the "Booting…" phase.
   * Storing the promise here ensures all concurrent processZipFile calls await the
   * same boot rather than triggering a second, stuck boot.
   */
  const webcontainerBootPromiseRef = useRef<Promise<WebContainer> | null>(null);
  const shellWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const shellProcessRef = useRef<Awaited<ReturnType<WebContainer['spawn']>> | null>(null);
  const serverReadyUnsubscribeRef = useRef<(() => void) | null>(null);
  /** Tracks the currently-running boot process so it can be killed on reset. */
  const currentBootProcRef = useRef<Awaited<ReturnType<WebContainer['spawn']>> | null>(null);
  /** Tracks the in-progress npm install process so it can be killed on reset. */
  const installProcRef = useRef<Awaited<ReturnType<WebContainer['spawn']>> | null>(null);
  /** Set to true as soon as the server-ready event fires for the active session. */
  const bootSucceededRef = useRef<boolean>(false);
  /** Rolling buffer of the last 5 000 chars of terminal output for AI context. */
  const terminalOutputBufferRef = useRef<string>('');
  /** Incremented on each new project session; lets processZipFile detect stale calls. */
  const processSessionRef = useRef<number>(0);
  /** Always holds latest rightPanelWidth so the drag handler (closed over []) can read it. */
  const rightPanelWidthRef = useRef(620);

  // ── Panel drag-to-resize ───────────────────────────────────────────────────
  /** Tracks an in-progress panel-drag operation. */
  const dragRef = useRef<{
    panel: string | null;
    startX: number; startY: number; startWidth: number;
  }>({ panel: null, startX: 0, startY: 0, startWidth: 0 });
  /** Ref to the standard-layout right panel, used for chat/scratch height drag bounds. */
  const rightPanelRef = useRef<HTMLDivElement>(null);
  /** Ref to the custom-layout container, used for column/row drag calculations. */
  const customLayoutContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const { panel, startX, startY, startWidth } = dragRef.current;
      if (!panel) return;
      const delta = e.clientX - startX;
      if (panel === 'terminal') {
        setTerminalWidth(Math.max(180, Math.min(520, startWidth + delta)));
      } else if (panel === 'chat') {
        setChatWidth(Math.max(240, Math.min(600, startWidth - delta)));
      } else if (panel === 'scratch') {
        setScratchWidth(Math.max(180, Math.min(520, startWidth - delta)));
      } else if (panel === 'terminal-height') {
        const dy = e.clientY - startY;
        setTerminalHeight(Math.max(120, Math.min(500, startWidth - dy)));
      } else if (panel === 'right-panel') {
        setRightPanelWidth(Math.max(300, Math.min(900, startWidth - delta)));
      } else if (panel === 'chat-scratch') {
        const newChatWidth = Math.max(180, Math.min(rightPanelWidthRef.current - 180, startWidth + delta));
        setChatWidth(newChatWidth);
      } else if (panel === 'chat-scratch-height') {
        const dy = e.clientY - startY;
        const panelH = rightPanelRef.current?.clientHeight ?? 800;
        setChatPanelHeight(Math.max(120, Math.min(panelH - 120, startWidth + dy)));
      } else if (panel.startsWith('custom-col-')) {
        const colIdx = parseInt(panel.split('-')[2]);
        const containerW = customLayoutContainerRef.current?.clientWidth ?? 1000;
        const dFrac = delta / containerW;
        setCustomLayout(prev => {
          const cols = [...prev.columns];
          const total = cols[colIdx].widthFraction + cols[colIdx + 1].widthFraction;
          const clamped = Math.max(0.1, Math.min(total - 0.1, startWidth + dFrac));
          return {
            ...prev,
            columns: cols.map((col, i) =>
              i === colIdx ? { ...col, widthFraction: clamped }
              : i === colIdx + 1 ? { ...col, widthFraction: total - clamped }
              : col
            ),
          };
        });
      } else if (panel.startsWith('custom-row-')) {
        const parts = panel.split('-');
        const colIdx = parseInt(parts[2]);
        const rowIdx = parseInt(parts[3]);
        const containerH = customLayoutContainerRef.current?.clientHeight ?? window.innerHeight;
        const dy = e.clientY - startY;
        const dFrac = dy / containerH;
        setCustomLayout(prev => {
          const cols = [...prev.columns];
          const panels = [...cols[colIdx].panels];
          const total = panels[rowIdx].heightFraction + panels[rowIdx + 1].heightFraction;
          const clamped = Math.max(0.1, Math.min(total - 0.1, startWidth + dFrac));
          const newPanels = panels.map((p, i) =>
            i === rowIdx ? { ...p, heightFraction: clamped }
            : i === rowIdx + 1 ? { ...p, heightFraction: total - clamped }
            : p
          );
          return {
            ...prev,
            columns: cols.map((col, i) => i === colIdx ? { ...col, panels: newPanels } : col),
          };
        });
      }
    };
    const onMouseUp = () => {
      if (dragRef.current.panel) {
        dragRef.current.panel = null;
        document.body.classList.remove('dragging-panel');
        document.body.classList.remove('dragging-vertical');
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Persist layout to sessionStorage ──────────────────────────────────────
  useEffect(() => {
    sessionStorage.setItem('layout_terminalWidth', String(terminalWidth));
    sessionStorage.setItem('layout_chatWidth', String(chatWidth));
    sessionStorage.setItem('layout_scratchWidth', String(scratchWidth));
    sessionStorage.setItem('layout_terminalCollapsed', String(terminalCollapsed));
    sessionStorage.setItem('layout_chatCollapsed', String(chatCollapsed));
    sessionStorage.setItem('layout_scratchCollapsed', String(scratchCollapsed));
    sessionStorage.setItem('layout_scratchPinned', String(scratchPinned));
    sessionStorage.setItem('layout_preset', layoutPreset);
    sessionStorage.setItem('layout_terminalHeight', String(terminalHeight));
    sessionStorage.setItem('layout_terminalSide', terminalSide);
    sessionStorage.setItem('layout_chatFirst', String(chatFirst));
    sessionStorage.setItem('layout_rightPanelWidth', String(rightPanelWidth));
    rightPanelWidthRef.current = rightPanelWidth;
    sessionStorage.setItem('layout_chatPanelHeight', String(chatPanelHeight));
    sessionStorage.setItem('layout_customLayout', JSON.stringify(customLayout));
    sessionStorage.setItem('layout_customLocked', String(customLayoutLocked));
  }, [terminalWidth, chatWidth, scratchWidth, terminalCollapsed, chatCollapsed, scratchCollapsed, scratchPinned, layoutPreset, terminalHeight, terminalSide, chatFirst, rightPanelWidth, chatPanelHeight, customLayout, customLayoutLocked]);

  // Keyboard-first Scratch Pad access (Ctrl/Cmd + . to toggle, Ctrl/Cmd + Shift + K to focus)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const metaOrCtrl = e.metaKey || e.ctrlKey;
      if (metaOrCtrl && e.key === '.') {
        e.preventDefault();
        setScratchCollapsed(prev => !prev);
        return;
      }
      if (metaOrCtrl && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setScratchCollapsed(false);
        setTimeout(() => {
          const scratchTextarea = document.getElementById('scratch-pad-input') as HTMLTextAreaElement | null;
          scratchTextarea?.focus();
        }, 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Mobile-layout detection
  useEffect(() => {
    const onResize = () => setIsMobileLayout(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── 1.0: Session Freshness timer ─────────────────────────────────────────
  // Start the clock when the session first goes non-idle; tick every second.
  useEffect(() => {
    if (status !== 'idle' && sessionStartTime === null) {
      setSessionStartTime(Date.now());
      setSessionElapsedSecs(0);
    }
    if (status === 'idle') {
      setSessionStartTime(null);
      setSessionElapsedSecs(0);
    }
  }, [status, sessionStartTime]);

  useEffect(() => {
    if (sessionStartTime === null) return;
    const id = setInterval(() => {
      setSessionElapsedSecs(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStartTime]);

  useEffect(() => {
    const tauriWindow = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
    const isTauriRuntime = typeof tauriWindow.__TAURI__ !== 'undefined' || typeof tauriWindow.__TAURI_INTERNALS__ !== 'undefined';

    setIsIsolated(window.crossOriginIsolated || isTauriRuntime);
  }, []);

  const handleSaveSettings = (newSettings: Settings) => {
    const hasRestrictedGrok = /grok/i.test(
      `${newSettings.localUrl || ''} ${newSettings.model || ''} ${newSettings.customInstructions || ''}`
    );
    if (hasRestrictedGrok) {
      setShowGrokWarning(true);
      return;
    }
    setSettings(newSettings);
    localStorage.setItem('ai_settings', JSON.stringify(newSettings));
  };

  // ── Phase 3: Welcome / Tour / Help handlers ────────────────────────────────
  const handleWelcomeDismiss = () => {
    localStorage.setItem('astra_welcome_seen', 'true');
    setIsWelcomeOpen(false);
  };

  const handleWelcomeStartTour = () => {
    localStorage.setItem('astra_welcome_seen', 'true');
    setIsWelcomeOpen(false);
    // Switch to standard layout so all three tour panels are visible
    setLayoutPreset('standard');
    setTerminalCollapsed(false);
    setChatCollapsed(false);
    setScratchCollapsed(false);
    setIsTourOpen(true);
  };

  const handleTourComplete = () => {
    setIsTourOpen(false);
  };

  // ── Phase 4.1: Containment scan helpers ───────────────────────────────────
  /** Shows the containment scan modal and resolves when the user decides. */
  const showContainmentScan = (result: ScanResult): Promise<boolean> =>
    new Promise<boolean>(resolve => {
      scanResolveRef.current = resolve;
      setScanModalResult(result);
    });

  const handleScanDecision = (proceed: boolean) => {
    setScanModalResult(null);
    scanResolveRef.current?.(proceed);
    scanResolveRef.current = null;
  };

  // ── Phase 4.2: Permission dialog helpers ──────────────────────────────────
  /** Shows the permission dialog for a terminal command and resolves when the user decides. */
  const requestPermission = (command: string): Promise<boolean> =>
    new Promise<boolean>(resolve => {
      permissionResolveRef.current = resolve;
      setPendingCommand(command);
    });

  const handlePermissionDecision = (proceed: boolean) => {
    setPendingCommand(null);
    permissionResolveRef.current?.(proceed);
    permissionResolveRef.current = null;
  };

  // ── Phase 2.2: Draft-to-Chat (staged notes) ───────────────────────────────
  const handleStageNotes = () => setStagedNotes(scratchPadContent);
  const handleClearStagedNotes = () => setStagedNotes('');

  // ── Phase 5.1: Export artifact (AI-powered) ────────────────────────────────
  const triggerAIExportGeneration = async (messages: Message[], style: ExportStyle) => {
    const aiSettings: AIExportSettings = {
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      localUrl: settings.localUrl,
    };
    const hasAI = settings.provider === 'local' || !!settings.apiKey;
    if (!hasAI) {
      setExportArtifact(buildExportArtifact(messages, style));
      return;
    }
    setIsExportGenerating(true);
    try {
      let projectContext: string | undefined;
      try { projectContext = await getProjectContext(); } catch { /* ignore */ }
      const artifact = await generateAIExportArtifact(messages, style, aiSettings, projectContext);
      setExportArtifact(artifact);
    } catch {
      setExportArtifact(buildExportArtifact(messages, style));
    } finally {
      setIsExportGenerating(false);
    }
  };

  const handleExportArtifact = (messages: Message[]) => {
    setExportSourceMessages(messages);
    setExportArtifact(buildExportArtifact(messages, exportStyle));
    setIsExportOpen(true);
    triggerAIExportGeneration(messages, exportStyle);
  };

  const handleChangeExportStyle = (style: ExportStyle) => {
    setExportStyle(style);
    setExportArtifact(buildExportArtifact(exportSourceMessages, style));
    triggerAIExportGeneration(exportSourceMessages, style);
  };

  // ── Phase 5.2: Evolution snapshots ────────────────────────────────────────
  const handleTakeSnapshot = () => {
    setPlanSnapshots(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date(),
        label: `Snapshot ${prev.length + 1}`,
        artifact: exportArtifact,
        style: exportStyle,
      },
    ]);
  };

  const handleTerminalReady = useCallback((term: Terminal) => {
    terminalRef.current = term;
    term.writeln('\x1b[34m[System]\x1b[0m Terminal ready — drop in a zip to kick things off.');
  }, []);

  const handleTerminalData = useCallback((data: string) => {
    if (shellWriterRef.current) {
      shellWriterRef.current.write(data);
    }
  }, []);

  const writeToTerminal = (data: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
    // Keep a rolling buffer for AI troubleshooting context
    terminalOutputBufferRef.current = (terminalOutputBufferRef.current + data).slice(-5000);
  };

  /** Opens the confirmation modal before resetting. Called by the "New Project" button. */
  const handleStartOver = useCallback(() => {
    setShowNewProjectConfirm(true);
  }, []);

  /** Performs the actual session teardown after the user confirms. */
  const performStartOver = useCallback(async () => {
    setShowNewProjectConfirm(false);

    // ── Intentional-destruction animation ────────────────────────────────────
    setIsDestroying(true);
    setDestroyFadeOut(false);
    // Wait for the wipe-in animation to complete
    await new Promise(resolve => setTimeout(resolve, WIPE_IN_DURATION));

    // Invalidate any ongoing processZipFile async session
    processSessionRef.current++;

    // Unsubscribe from the previous server-ready listener
    if (serverReadyUnsubscribeRef.current) {
      serverReadyUnsubscribeRef.current();
      serverReadyUnsubscribeRef.current = null;
    }

    // Kill the active boot process (if any tier is mid-attempt)
    if (currentBootProcRef.current) {
      try { currentBootProcRef.current.kill(); } catch (e) { console.warn('Failed to kill boot process:', e); }
      currentBootProcRef.current = null;
    }

    // Kill any in-progress npm install so it does not interfere with the next session
    if (installProcRef.current) {
      try { installProcRef.current.kill(); } catch (e) { console.warn('Failed to kill install process:', e); }
      installProcRef.current = null;
    }

    // Kill the running shell process
    if (shellProcessRef.current) {
      try { shellProcessRef.current.kill(); } catch (e) { console.warn('Failed to kill shell process:', e); }
      shellProcessRef.current = null;
    }

    // Release the shell writer
    if (shellWriterRef.current) {
      try { await shellWriterRef.current.close(); } catch (e) { console.warn('Failed to close shell writer:', e); }
      shellWriterRef.current = null;
    }

    // Dismiss any open containment-scan modal so it does not block the next upload.
    // Cancel the pending promise so the stale processZipFile call can exit cleanly.
    if (scanResolveRef.current) {
      scanResolveRef.current(false);
      scanResolveRef.current = null;
    }
    setScanModalResult(null);

    // Dismiss any open permission dialog for the same reason.
    if (permissionResolveRef.current) {
      permissionResolveRef.current(false);
      permissionResolveRef.current = null;
    }
    setPendingCommand(null);

    // Clear the terminal and show the welcome message
    if (terminalRef.current) {
      terminalRef.current.clear();
      terminalRef.current.writeln('\x1b[34m[System]\x1b[0m Terminal ready — drop in a zip to kick things off.');
    }

    // Reset boot tracking refs
    bootSucceededRef.current = false;
    terminalOutputBufferRef.current = '';

    // Reset all state
    setIsDragging(false);
    setStatus('idle');
    setErrorMsg('');
    setPreviewUrl(null);
    setPreviewBaseUrl('');
    setBrowserPath('/');
    setIframeKey(k => k + 1);
    setRecoveryMessage(null);
    setTroubleshootRequest(null);
    // Force-remount ChatPanel to clear previous conversation
    setChatKey(k => k + 1);
    // Force-remount the hidden file input so no previous file is retained
    setUploadInputKey(k => k + 1);
    // Clear the scratch pad
    setScratchKey(k => k + 1);
    setScratchPadContent('');
    setStagedNotes('');
    // Phase 5: clear evolution snapshots and close export modal on session reset
    setPlanSnapshots([]);
    setIsExportOpen(false);
    setExportArtifact(buildExportArtifact([], 'implementation-plan'));
    setExportStyle('implementation-plan');
    setExportSourceMessages([]);
    // 1.0: reset session freshness indicator
    setSessionStartTime(null);
    setSessionElapsedSecs(0);

    // Fade out the overlay
    setDestroyFadeOut(true);
    await new Promise(resolve => setTimeout(resolve, WIPE_OUT_DURATION));
    setIsDestroying(false);
    setDestroyFadeOut(false);
  }, []);

  const getProjectContext = async () => {
    if (!webcontainerRef.current) return "No project loaded yet.";
    const wc = webcontainerRef.current;
    try {
      let fileTree = "Project Structure:\n";
      let fileContents = "\nFile Contents:\n";
      
      const readDirRecursive = async (dir: string, indent = "") => {
        try {
          const entries = await wc.fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = dir === '.' ? entry.name : `${dir}/${entry.name}`;
            
            if (['node_modules', '.git', 'dist', 'build', '.next', 'package-lock.json'].includes(entry.name)) continue;

            if (entry.isDirectory()) {
              fileTree += `${indent}📁 ${entry.name}/\n`;
              await readDirRecursive(fullPath, indent + "  ");
            } else {
              fileTree += `${indent}📄 ${entry.name}\n`;
              if (/\.(tsx?|jsx?|css|html|json|md|js|ts)$/i.test(entry.name)) {
                try {
                  const content = await wc.fs.readFile(fullPath, 'utf-8');
                  const truncated = content.length > 15000 ? content.substring(0, 15000) + '\n...[TRUNCATED]' : content;
                  fileContents += `\n--- ${fullPath} ---\n${truncated}\n`;
                } catch (e) {}
              }
            }
          }
        } catch (e) {}
      };

      await readDirRecursive('.');
      
      let fullContext = fileTree + fileContents;
      if (fullContext.length > 150000) {
        fullContext = fullContext.substring(0, 150000) + '\n...[MAX CONTEXT LIMIT REACHED]';
      }

      return fullContext;
    } catch (e) {
      return "Error reading project context.";
    }
  };

  /**
   * Returns true when the terminal output string contains a recognisable
   * "missing script" error from npm (any modern npm version format).
   */
  const isMissingScriptError = (output: string): boolean =>
    output.includes('missing script:') ||
    output.includes('Missing script:') ||
    output.includes('npm error Missing script') ||
    output.includes('npm ERR! missing script');

  /**
   * Trigger the Tier 4 AI fallback after all local boot attempts have failed.
   * If the user has no AI provider configured, show a helpful tip instead.
   */
  const triggerAIFallback = (packageJson: string | null) => {
    setStatus('error');
    setErrorMsg("Couldn't get the app started automatically.");
    setRecoveryMessage(null);
    writeToTerminal('\r\n\x1b[31m[System]\x1b[0m Couldn\'t get the app started automatically.\r\n');

    const current = settingsRef.current;
    const hasAIAccess = current.provider === 'local' || !!current.apiKey;

    if (hasAIAccess) {
      writeToTerminal('\x1b[34m[System]\x1b[0m Passing this over to the AI assistant for a closer look...\r\n');
    } else {
      writeToTerminal('\x1b[33m[System]\x1b[0m Pro tip: Hook up an AI provider in Settings and let it help diagnose the issue.\r\n');
    }

    setTroubleshootRequest({
      packageJson: packageJson || '',
      terminalErrors: terminalOutputBufferRef.current.split('\n').slice(-20).join('\n'),
    });
  };

  /**
   * Runs a single boot command as a dedicated WebContainer process.
   * Resolves to true when the command definitively failed (missing-script error,
   * non-zero exit, or stream closed without server-ready).
   * Resolves to false when boot has already succeeded (server-ready fired).
   */
  const runBootCommand = (
    wc: WebContainer,
    cmd: string,
    isCurrentSession: () => boolean,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const [program, ...args] = cmd.trim().split(/\s+/);
      let settled = false;
      const done = (failed: boolean) => {
        if (!settled) { settled = true; resolve(failed); }
      };

      wc.spawn(program, args).then((proc) => {
        // If the session was invalidated while the spawn was in flight, bail out.
        if (!isCurrentSession()) {
          proc.kill();
          done(false);
          return;
        }

        currentBootProcRef.current = proc;
        let outputBuf = '';

        // Read process output asynchronously
        (async () => {
          const reader = proc.output.getReader();
          try {
            while (true) {
              const { done: streamDone, value } = await reader.read();
              if (streamDone) { done(true); break; }
              writeToTerminal(value);
              outputBuf = (outputBuf + value).slice(-10000); // bounded buffer
              terminalOutputBufferRef.current = (terminalOutputBufferRef.current + value).slice(-5000);

              if (!settled && isMissingScriptError(outputBuf)) {
                proc.kill();
                done(true);
              }
              if (bootSucceededRef.current) {
                done(false);
              }
            }
          } catch {
            done(true);
          } finally {
            reader.releaseLock();
          }
        })();

        // Also resolve when the process exits
        proc.exit.then((code) => {
          if (bootSucceededRef.current) { done(false); return; }
          done(code !== 0);
        }).catch(() => done(true));

      }).catch(() => done(true));
    });
  };

  /**
   * Iterates through the ordered boot-command hierarchy (Tiers 1–3).
   * Falls back to Tier 4 (AI) when all local attempts are exhausted.
   */
  const runBootHierarchy = async (
    wc: WebContainer,
    commands: string[],
    packageJson: string | null,
    isCurrentSession: () => boolean,
  ) => {
    for (let i = 0; i < commands.length; i++) {
      if (bootSucceededRef.current) return;
      if (!isCurrentSession()) return;

      const cmd = commands[i];
      writeToTerminal(`\r\n\x1b[34m[System]\x1b[0m Trying: ${cmd}...\r\n`);
      if (i > 0) {
        setRecoveryMessage(`Trying '${cmd}'...`);
      }

      const failed = await runBootCommand(wc, cmd, isCurrentSession);

      if (!failed || bootSucceededRef.current) return;
      if (!isCurrentSession()) return;

      if (i < commands.length - 1) {
        const next = commands[i + 1];
        writeToTerminal(`\r\n\x1b[33m[System]\x1b[0m Command failed, trying '${next}'...\r\n`);
        setRecoveryMessage(`Command failed, trying '${next}'...`);
      }
    }

    // Tier 4: AI fallback
    if (!bootSucceededRef.current && isCurrentSession()) {
      triggerAIFallback(packageJson);
    }
  };

  const processZipFile = async (file: File) => {
    processSessionRef.current++;
    const sessionId = processSessionRef.current;
    const isCurrentSession = () => sessionId === processSessionRef.current;

    try {
      setStatus('uploading');
      writeToTerminal(`\r\n\x1b[34m[System]\x1b[0m Parsing zip file: ${file.name}...\r\n`);

      const { tree, packageJson, readme, appRoot, projectType } = await parseZipToTree(file);
      if (!isCurrentSession()) return;

      // Reset boot tracking for this new session
      bootSucceededRef.current = false;
      terminalOutputBufferRef.current = '';
      setRecoveryMessage(null);
      setTroubleshootRequest(null);

      writeToTerminal(`\x1b[32m[System]\x1b[0m Zip parsed successfully.\r\n`);
      writeToTerminal(`\x1b[34m[System]\x1b[0m Project type: ${projectType}${appRoot ? ` (app root: ${appRoot})` : ''}.\r\n`);

      // Reset chat for the new project session
      setChatKey(k => k + 1);

      // Build the multi-tier boot command hierarchy from metadata
      const scripts = parsePackageJsonScripts(packageJson || '');
      const readmeCmds = extractCommandsFromReadme(readme || '');
      const bootCmds = buildBootCommands(scripts, readmeCmds, projectType);

      setStatus('booting');
      writeToTerminal(`\x1b[34m[System]\x1b[0m Booting WebContainer environment...\r\n`);

      if (!webcontainerRef.current) {
        // Start boot only once; reuse the in-flight promise if boot is already underway.
        // A second call to WebContainer.boot() returns a promise that never resolves,
        // which is what causes the terminal to hang at "Booting…" when a new project
        // is loaded before the previous boot has completed.
        if (!webcontainerBootPromiseRef.current) {
          webcontainerBootPromiseRef.current = WebContainer.boot();
        }
        try {
          webcontainerRef.current = await webcontainerBootPromiseRef.current;
        } catch (bootErr) {
          // Reset so a future session can retry booting.
          webcontainerBootPromiseRef.current = null;
          throw bootErr;
        }
      }
      if (!isCurrentSession()) return;

      const wc = webcontainerRef.current;
      writeToTerminal(`\x1b[32m[System]\x1b[0m WebContainer booted.\r\n`);

      setStatus('mounting');
      writeToTerminal(`\x1b[34m[System]\x1b[0m Mounting files...\r\n`);

      // Clear any files from a previous project before mounting the new tree.
      // Delete entries sequentially so that one failure (e.g. a locked file) does
      // not prevent the remaining entries from being removed.
      try {
        const existingEntries = await wc.fs.readdir('.');
        for (const entry of existingEntries) {
          try {
            await wc.fs.rm(entry, { recursive: true });
          } catch (e) {
            console.warn(`Failed to remove ${entry}:`, e);
          }
        }
      } catch (e) {
        console.warn('Failed to read project directory for cleanup:', e);
      }
      if (!isCurrentSession()) return;

      // Mount the detected app root subtree (or full tree if at top level)
      const mountTree = appRoot ? extractSubtree(tree, appRoot) : tree;
      await wc.mount(mountTree);
      if (!isCurrentSession()) return;

      writeToTerminal(`\x1b[32m[System]\x1b[0m Files mounted.\r\n`);

      // Unsubscribe any previous server-ready listener to avoid stale callbacks
      if (serverReadyUnsubscribeRef.current) {
        serverReadyUnsubscribeRef.current();
        serverReadyUnsubscribeRef.current = null;
      }

      serverReadyUnsubscribeRef.current = wc.on('server-ready', (port, url) => {
        bootSucceededRef.current = true;
        writeToTerminal(`\r\n\x1b[32m[System]\x1b[0m Server ready at ${url}\r\n`);
        setPreviewBaseUrl(url);
        setPreviewUrl(url);
        setStatus('ready');
        setRecoveryMessage(null);
      });

      // Spawn interactive shell for user interaction throughout the session
      setStatus('starting');
      writeToTerminal(`\x1b[34m[System]\x1b[0m Starting interactive shell...\r\n`);

      const shellProcess = await wc.spawn('jsh', {
        terminal: {
          cols: terminalRef.current?.cols || 80,
          rows: terminalRef.current?.rows || 24,
        }
      });
      if (!isCurrentSession()) { shellProcess.kill(); return; }

      shellProcessRef.current = shellProcess;

      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            writeToTerminal(data);
          }
        })
      );

      const writer = shellProcess.input.getWriter();
      shellWriterRef.current = writer;

      // ── Unknown project type: no recognised entry point ──────────────────
      if (projectType === 'unknown') {
        setStatus('error');
        setErrorMsg('No valid project entry point detected — no package.json or index.html found.');
        writeToTerminal('\r\n\x1b[31m[System]\x1b[0m No valid project entry point detected. Upload a project with a package.json or index.html. You can still use the interactive terminal.\r\n');
        return;
      }

      // ── Phase 4.1: Containment scan (Node projects only) ─────────────────
      if (projectType === 'node' && packageJson) {
        const scanResult = scanPackageJson(packageJson);
        if (scanResult.level !== 'safe') {
          writeToTerminal(`\x1b[33m[Security]\x1b[0m Containment scan: ${scanResult.level} — awaiting your decision...\r\n`);
        }
        const proceed = await showContainmentScan(scanResult);
        if (!proceed || !isCurrentSession()) {
          setStatus('idle');
          writeToTerminal('\x1b[33m[Security]\x1b[0m Install cancelled by user.\r\n');
          return;
        }
        if (scanResult.level !== 'safe') {
          writeToTerminal(`\x1b[33m[Security]\x1b[0m Proceeding with install after user confirmation.\r\n`);
        }
      }

      if (projectType === 'node') {
        // Install dependencies via a dedicated process so we can await completion
        setStatus('installing');
        writeToTerminal(`\x1b[34m[System]\x1b[0m Installing dependencies...\r\n`);

        const installProc = await wc.spawn('npm', ['install']);
        installProcRef.current = installProc;
        installProc.output.pipeTo(new WritableStream({
          write(data) { writeToTerminal(data); }
        }));
        const installExit = await installProc.exit;
        installProcRef.current = null;
        // Session check after awaiting exit: the install has already completed, so
        // there is nothing to kill — we just skip the rest of the boot sequence.
        if (!isCurrentSession()) return;

        if (installExit !== 0) {
          setStatus('error');
          setErrorMsg('npm install ran into some issues — check the terminal for details.');
          writeToTerminal('\r\n\x1b[31m[System]\x1b[0m npm install failed — check above for details.\r\n');
          return;
        }
        writeToTerminal(`\x1b[32m[System]\x1b[0m Dependencies installed.\r\n`);
      } else {
        // Static project: skip npm install, serve files directly
        writeToTerminal(`\x1b[34m[System]\x1b[0m Static project detected — skipping npm install.\r\n`);
      }

      // Attempt boot commands following the multi-tier hierarchy (Tiers 0–4)
      setStatus('starting');
      await runBootHierarchy(wc, bootCmds, packageJson, isCurrentSession);

    } catch (err: any) {
      if (!isCurrentSession()) return;
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An unknown error occurred');
      writeToTerminal(`\r\n\x1b[31m[Error]\x1b[0m ${err.message}\r\n`);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (status !== 'idle') return;
    const file = event.target.files?.[0];
    if (!file) return;
    // Clear the input immediately so selecting the same file again still triggers onChange
    event.target.value = '';
    await processZipFile(file);
  };

  const handleRunDiagnosticCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    // Shell not ready — write a notice to the terminal if possible, otherwise silently skip
    if (!shellWriterRef.current) {
      writeToTerminal('\r\n\x1b[33m[System]\x1b[0m Terminal shell is not ready yet. Start a project first.\r\n');
      return;
    }
    const confirmed = await requestPermission(trimmed);
    if (!confirmed) return;
    shellWriterRef.current.write(`${trimmed}\n`);
  };

  if (!isIsolated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-6 text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-6" />
        <h1 className="text-3xl font-bold mb-4">Cross-Origin Isolation Required</h1>
        <p className="mb-8 max-w-lg text-neutral-400 text-lg">
          WebContainers require cross-origin isolation to run a full Node.js environment directly in your browser. 
          Because this preview is embedded in an iframe, these security features are restricted.
        </p>
        <a
          href={window.location.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors text-lg shadow-lg shadow-blue-900/20"
        >
          Open App in New Tab <ExternalLink className="w-5 h-5" />
        </a>
      </div>
    );
  }

  // Helper: start a panel drag
  const startDrag = (
    panel: string,
    currentSize: number
  ) => (e: { preventDefault: () => void; clientX: number; clientY: number }) => {
    e.preventDefault();
    dragRef.current = { panel, startX: e.clientX, startY: e.clientY, startWidth: currentSize };
    document.body.classList.add('dragging-panel');
    if (panel === 'terminal-height') document.body.classList.add('dragging-vertical');
  };

  const startTouchDrag = (
    panel: string,
    currentSize: number
  ) => (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    dragRef.current = { panel, startX: touch.clientX, startY: touch.clientY, startWidth: currentSize };
    document.body.classList.add('dragging-panel');
    if (panel === 'terminal-height') document.body.classList.add('dragging-vertical');

    // Attach touch listeners only for the duration of this drag so that
    // a passive listener never blocks browser scroll optimization when idle.
    const onMove = (ev: TouchEvent) => {
      const { panel: p, startX, startY, startWidth } = dragRef.current;
      if (!p) return;
      ev.preventDefault();
      const t = ev.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (p === 'terminal') {
        setTerminalWidth(Math.max(180, Math.min(520, startWidth + dx)));
      } else if (p === 'chat') {
        setChatWidth(Math.max(240, Math.min(600, startWidth - dx)));
      } else if (p === 'scratch') {
        setScratchWidth(Math.max(180, Math.min(520, startWidth - dx)));
      } else if (p === 'terminal-height') {
        setTerminalHeight(Math.max(120, Math.min(500, startWidth - dy)));
      } else if (p === 'right-panel') {
        setRightPanelWidth(Math.max(300, Math.min(900, startWidth - dx)));
      } else if (p === 'chat-scratch') {
        const newChatWidth = Math.max(180, Math.min(rightPanelWidthRef.current - 180, startWidth + dx));
        setChatWidth(newChatWidth);
      } else if (p === 'chat-scratch-height') {
        const panelH = rightPanelRef.current?.clientHeight ?? 800;
        setChatPanelHeight(Math.max(120, Math.min(panelH - 120, startWidth + dy)));
      } else if (p.startsWith('custom-col-')) {
        const colIdx = parseInt(p.split('-')[2]);
        const containerW = customLayoutContainerRef.current?.clientWidth ?? 1000;
        const dFrac = dx / containerW;
        setCustomLayout(prev => {
          const cols = [...prev.columns];
          const total = cols[colIdx].widthFraction + cols[colIdx + 1].widthFraction;
          const clamped = Math.max(0.1, Math.min(total - 0.1, startWidth + dFrac));
          return {
            ...prev,
            columns: cols.map((col, i) =>
              i === colIdx ? { ...col, widthFraction: clamped }
              : i === colIdx + 1 ? { ...col, widthFraction: total - clamped }
              : col
            ),
          };
        });
      } else if (p.startsWith('custom-row-')) {
        const parts = p.split('-');
        const colIdx = parseInt(parts[2]);
        const rowIdx = parseInt(parts[3]);
        const containerH = customLayoutContainerRef.current?.clientHeight ?? window.innerHeight;
        const dFrac = dy / containerH;
        setCustomLayout(prev => {
          const cols = [...prev.columns];
          const panels = [...cols[colIdx].panels];
          const total = panels[rowIdx].heightFraction + panels[rowIdx + 1].heightFraction;
          const clamped = Math.max(0.1, Math.min(total - 0.1, startWidth + dFrac));
          const newPanels = panels.map((p2, i) =>
            i === rowIdx ? { ...p2, heightFraction: clamped }
            : i === rowIdx + 1 ? { ...p2, heightFraction: total - clamped }
            : p2
          );
          return {
            ...prev,
            columns: cols.map((col, i) => i === colIdx ? { ...col, panels: newPanels } : col),
          };
        });
      }
    };
    const onEnd = () => {
      dragRef.current.panel = null;
      document.body.classList.remove('dragging-panel');
      document.body.classList.remove('dragging-vertical');
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  // Collapsed tab shared style
  const collapsedTab = 'flex flex-col items-center border-white/10 bg-black/40 backdrop-blur-sm shrink-0 overflow-hidden';
  const collapsedLabel = 'text-zinc-700 text-[10px] font-medium uppercase tracking-wider mt-1';
  // Horizontal collapsed bar (for vertical layout panels)
  const collapsedHBar = 'flex flex-row items-center justify-between border-white/10 bg-black/40 backdrop-blur-sm shrink-0 overflow-hidden h-8 px-3 gap-2';

  // ── Custom layout panel helpers ────────────────────────────────────────────
  const rebalanceColumnPanels = (panels: CustomPanelEntry[]): CustomPanelEntry[] => {
    const visibleCount = panels.filter(p => !p.hidden).length;
    if (visibleCount === 0) return panels;
    const evenFraction = 1 / visibleCount;
    return panels.map(panel => panel.hidden ? panel : { ...panel, heightFraction: evenFraction });
  };
  /** Move a panel to a different column (append to end when movingRight=false, unshift when movingRight=true). */
  const movePanelToColumn = (entry: CustomPanelEntry, fromColIdx: number, toColIdx: number, prepend = false) => {
    setCustomLayout(prev => {
      const cols = prev.columns.map(c => ({ ...c, panels: [...c.panels] }));
      cols[fromColIdx].panels = cols[fromColIdx].panels.filter(p => p.panel !== entry.panel);
      if (prepend) cols[toColIdx].panels.unshift({ ...entry });
      else cols[toColIdx].panels.push({ ...entry });
      cols[fromColIdx].panels = rebalanceColumnPanels(cols[fromColIdx].panels);
      cols[toColIdx].panels = rebalanceColumnPanels(cols[toColIdx].panels);
      return { ...prev, columns: cols };
    });
  };
  /** Swap a panel with its neighbour in the same column. */
  const swapPanelInColumn = (colIdx: number, panelIdx: number, dir: 'up' | 'down') => {
    setCustomLayout(prev => {
      const cols = prev.columns.map(c => ({ ...c, panels: [...c.panels] }));
      const ps = cols[colIdx].panels;
      const swapIdx = dir === 'up' ? panelIdx - 1 : panelIdx + 1;
      [ps[swapIdx], ps[panelIdx]] = [ps[panelIdx], ps[swapIdx]];
      return { ...prev, columns: cols };
    });
  };
  /** Set a panel's hidden flag in a specific column. */
  const setPanelHidden = (colIdx: number, panelId: PanelId, hidden: boolean) => {
    setCustomLayout(prev => {
      const cols = prev.columns.map((c, i) => i !== colIdx ? c : {
        ...c, panels: c.panels.map(p => p.panel === panelId ? { ...p, hidden } : p)
      });
      cols[colIdx] = { ...cols[colIdx], panels: rebalanceColumnPanels(cols[colIdx].panels) };
      return { ...prev, columns: cols };
    });
  };
  /** Move a panel into a target column with optional insertion index (default append). */
  const dropPanelToColumn = (panel: PanelId, fromColIdx: number, toColIdx: number, toIndex?: number) => {
    if (fromColIdx === toColIdx && toIndex === undefined) return;
    setCustomLayout(prev => {
      const cols = prev.columns.map(c => ({ ...c, panels: [...c.panels] }));
      const sourceIdx = cols[fromColIdx].panels.findIndex(p => p.panel === panel);
      if (sourceIdx === -1) return prev;
      const [moved] = cols[fromColIdx].panels.splice(sourceIdx, 1);
      const insertAt = toIndex ?? cols[toColIdx].panels.length;
      cols[toColIdx].panels.splice(insertAt, 0, { ...moved, hidden: false });
      cols[fromColIdx].panels = rebalanceColumnPanels(cols[fromColIdx].panels);
      cols[toColIdx].panels = rebalanceColumnPanels(cols[toColIdx].panels);
      return { ...prev, columns: cols };
    });
  };
  /** Set exact custom layout column count while preserving current panel placement as much as possible. */
  const setCustomColumnCount = (count: number) => {
    const nextCount = Math.max(1, Math.min(4, Math.floor(count)));
    setCustomLayout(prev => {
      if (nextCount === prev.columns.length) return prev;
      const cols = prev.columns.map(c => ({ ...c, panels: [...c.panels] }));
      if (nextCount > cols.length) {
        while (cols.length < nextCount) {
          const widestIdx = cols.reduce((best, c, i, arr) => c.widthFraction > arr[best].widthFraction ? i : best, 0);
          const splitWidth = Math.max(0.15, cols[widestIdx].widthFraction / 2);
          cols[widestIdx] = { ...cols[widestIdx], widthFraction: splitWidth };
          cols.splice(widestIdx + 1, 0, { widthFraction: splitWidth, panels: [] });
        }
      } else {
        while (cols.length > nextCount) {
          const removed = cols.pop();
          if (removed && cols.length > 0) cols[cols.length - 1].panels.push(...removed.panels);
        }
      }
      const evenWidth = 1 / cols.length;
      return {
        ...prev,
        columns: cols.map(c => ({ ...c, widthFraction: evenWidth, panels: rebalanceColumnPanels(c.panels) }))
      };
    });
  };
  const isFileDragEvent = (event: React.DragEvent<HTMLDivElement>) => {
    const dragTypes = Array.from(event.dataTransfer?.types ?? []);
    return dragTypes.includes('Files');
  };
  const renderCustomPanelMoveControls = (entry: CustomPanelEntry, colIdx: number, realIdx: number) => {
    const leftDisabled = colIdx === 0;
    const rightDisabled = colIdx === customLayout.columns.length - 1;
    const upDisabled = realIdx === 0;
    const downDisabled = realIdx === customLayout.columns[colIdx].panels.length - 1;
    const buttonClass = 'p-1 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed';
    return (
      <div className="flex items-center gap-0.5">
        <button disabled={leftDisabled} onClick={() => movePanelToColumn(entry, colIdx, colIdx - 1)} className={`${buttonClass} text-violet-400 hover:text-violet-300`} title="Move left"><ChevronLeft className="w-3.5 h-3.5" /></button>
        <button disabled={rightDisabled} onClick={() => movePanelToColumn(entry, colIdx, colIdx + 1, true)} className={`${buttonClass} text-violet-400 hover:text-violet-300`} title="Move right"><ChevronRight className="w-3.5 h-3.5" /></button>
        <button disabled={upDisabled} onClick={() => swapPanelInColumn(colIdx, realIdx, 'up')} className={`${buttonClass} text-violet-400 hover:text-violet-300`} title="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
        <button disabled={downDisabled} onClick={() => swapPanelInColumn(colIdx, realIdx, 'down')} className={`${buttonClass} text-violet-400 hover:text-violet-300`} title="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
        <button onClick={() => setPanelHidden(colIdx, entry.panel, true)} className={`${buttonClass} text-zinc-500 hover:text-zinc-300`} title={`Hide ${entry.panel}`}><EyeOff className="w-3.5 h-3.5" /></button>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-screen bg-[#09090b] text-zinc-200 font-sans relative"
      onDragOver={(e) => {
        if (!isFileDragEvent(e)) return;
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!isFileDragEvent(e)) return;
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        if (!isFileDragEvent(e)) return;
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.name.endsWith('.zip')) {
          if (status === 'idle') {
            processZipFile(file);
          } else {
            writeToTerminal('\r\n\x1b[33m[System]\x1b[0m A session is already in progress. Press "New Project" first to start fresh.\r\n');
          }
        }
      }}
    >
      {/* ── Intentional-destruction overlay ─────────────────────────────────── */}
      {isDestroying && (
        <div
          className={`absolute inset-0 z-[100] bg-[#09090b] pointer-events-none ${destroyFadeOut ? 'animate-wipe-out' : 'animate-wipe-in'}`}
        />
      )}

      <AnimatePresence>
        {isDragging && (
          <motion.div
            key="drag-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 z-50 pointer-events-none"
          >
            {/* Background dim + blur */}
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
            {/* Drop border */}
            <div className="absolute inset-3 rounded-3xl border-2 border-dashed border-indigo-400/60 bg-indigo-500/5" />
            {/* Card */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.86, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 6 }}
                transition={{ duration: 0.24, ease: [0.34, 1.56, 0.64, 1] }}
                className="bg-black/70 backdrop-blur-2xl border border-white/12 p-10 rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.18)] flex flex-col items-center gap-5"
              >
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/12 border border-indigo-400/25 flex items-center justify-center">
                  <Upload className="w-9 h-9 text-indigo-300 animate-bounce" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-white tracking-tight">Drop your zip to begin</h2>
                  <p className="mt-1 text-sm text-zinc-400">Release to load the project</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* ── Phase 4.1: Containment Scan modal ──────────────────────────────── */}
      {scanModalResult && (
        <ContainmentScanModal
          result={scanModalResult}
          onProceed={() => handleScanDecision(true)}
          onCancel={() => handleScanDecision(false)}
        />
      )}

      {showGrokWarning && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-rose-500/30 rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white">Policy Alert: Restricted Model Detected</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-zinc-300">
                Astra/log has detected a Grok-based model. Due to significant ethical and security concerns regarding its development and the actions of Elon Musk, the use of Grok is strictly prohibited on this platform. While you may technically implement an open-source version via a local provider, doing so is a violation of our Terms of Service.
              </p>
              <p className="text-sm text-zinc-300">
                Notice: We do not provide technical support for sessions involving Grok. Users use Grok at their own risk.
              </p>
            </div>
            <div className="flex justify-end px-5 py-3 border-t border-white/10 bg-white/5 rounded-b-2xl">
              <button
                onClick={() => setShowGrokWarning(false)}
                className="px-4 py-1.5 text-sm text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Project confirmation modal ──────────────────────────────────── */}
      {showNewProjectConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white">Start a New Project?</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-zinc-300">
                This will permanently clear the current session — the terminal, preview, and chat history will all be reset.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10 bg-white/5 rounded-b-2xl">
              <button
                onClick={() => setShowNewProjectConfirm(false)}
                className="px-4 py-1.5 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performStartOver}
                className="px-4 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Clear &amp; Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 4.2: Permission dialog ────────────────────────────────────── */}
      {pendingCommand && (
        <PermissionDialog
          command={pendingCommand}
          onConfirm={() => handlePermissionDecision(true)}
          onCancel={() => handlePermissionDecision(false)}
        />
      )}

      {/* ── Phase 5: Artifact Export modal ──────────────────────────────────── */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        artifact={exportArtifact}
        exportStyle={exportStyle}
        onChangeExportStyle={handleChangeExportStyle}
        scratchPadContent={scratchPadContent}
        snapshots={planSnapshots}
        onTakeSnapshot={handleTakeSnapshot}
        isGenerating={isExportGenerating}
      />

      {/* ── Phase 3.1: Welcome Modal (one-time) ─────────────────────────────── */}
      {isWelcomeOpen && (
        <WelcomeModal
          onStartTour={handleWelcomeStartTour}
          onSkip={handleWelcomeDismiss}
        />
      )}

      {/* ── Phase 3.1: Workspace Tour ────────────────────────────────────────── */}
      {isTourOpen && (
        <WorkspaceTour onComplete={handleTourComplete} />
      )}

      {/* ── Phase 3.2: Help / Usage Guide ────────────────────────────────────── */}
      {isHelpOpen && (
        <HelpGuide onClose={() => setIsHelpOpen(false)} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/8 bg-black/30 backdrop-blur-xl shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <img src={AstraLogLogo} alt="Astra/log logo" className="h-12 w-auto logo-animate" />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Upload (idle only) */}
          {status === 'idle' && (
            <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white rounded-md cursor-pointer transition-all text-sm font-medium shadow-lg shadow-indigo-500/20">
              <Upload className="w-4 h-4" />
              Upload Zip
              <input 
                key={uploadInputKey}
                type="file" 
                accept=".zip" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          )}

          {/* ── Ambient status indicator (Phase 1.4) ── */}
          {status !== 'idle' && (() => {
            if (status === 'error') return (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/8 border border-rose-500/20">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-flicker" />
                <span className="text-rose-400 text-xs font-medium tracking-wide">Error</span>
              </div>
            );
            if (status === 'ready') return (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 glow-success" />
                <span className="text-emerald-400 text-xs font-medium tracking-wide">Running</span>
              </div>
            );
            if (recoveryMessage) return (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/8 border border-amber-500/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-amber-400 glow-warning" />
                <span className="text-amber-400 text-xs font-medium truncate max-w-[200px]">{recoveryMessage}</span>
              </div>
            );
            // booting / installing / starting / mounting / uploading
            return (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/8 border border-indigo-500/20">
                <div className="w-2 h-2 rounded-full bg-indigo-400 glow-accent" />
                <span className="text-indigo-400 text-xs font-medium tracking-wide">{status.charAt(0).toUpperCase() + status.slice(1)}…</span>
              </div>
            );
          })()}

          {status !== 'idle' && (
            <div className="flex items-center gap-2">
              {sessionElapsedSecs > 0 && (
                <span
                  className="text-[10px] font-mono text-zinc-600 tabular-nums"
                  title="Active session duration"
                >
                  {String(Math.floor(sessionElapsedSecs / 3600)).padStart(2, '0')}:{String(Math.floor((sessionElapsedSecs % 3600) / 60)).padStart(2, '0')}:{String(sessionElapsedSecs % 60).padStart(2, '0')}
                </span>
              )}
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 rounded-md cursor-pointer transition-all text-sm font-medium"
                title="Start a new project"
              >
                <FolderOpen className="w-4 h-4" />
                New Project
              </button>
            </div>
          )}

          <div className="w-px h-5 bg-white/10" />

          {/* Layout Switcher */}
          <div className="flex items-center gap-0.5 bg-black/40 rounded-lg p-0.5 border border-white/8">
            <button
              onClick={() => setLayoutPreset('standard')}
              className={`p-1.5 rounded transition-colors ${layoutPreset === 'standard' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Standard Layout — Terminal · Preview · Chat + Scratch"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutPreset('architect')}
              className={`p-1.5 rounded transition-colors ${layoutPreset === 'architect' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Architect Layout — Preview &amp; Chat top · Terminal bottom"
            >
              <PanelBottom className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutPreset('zen-focus')}
              className={`p-1.5 rounded transition-colors ${layoutPreset === 'zen-focus' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Zen Focus — Scratch Pad · Preview only"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutPreset('custom')}
              className={`p-1.5 rounded transition-colors ${layoutPreset === 'custom' ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Custom Layout — Freely arrange &amp; resize all panels"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {layoutPreset === 'custom' && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-black/50 border border-white/10">
              {!customLayoutLocked && (
                <>
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">Columns</span>
                  <button
                    onClick={() => setCustomColumnCount(customLayout.columns.length - 1)}
                    disabled={customLayout.columns.length <= 1}
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Remove a column"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-zinc-300 tabular-nums min-w-4 text-center">{customLayout.columns.length}</span>
                  <button
                    onClick={() => setCustomColumnCount(customLayout.columns.length + 1)}
                    disabled={customLayout.columns.length >= 4}
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Add a column"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCustomLayout(DEFAULT_CUSTOM_LAYOUT)}
                    className="ml-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white hover:bg-white/10 rounded border border-white/10"
                    title="Reset custom layout"
                  >
                    Reset
                  </button>
                </>
              )}
              <button
                onClick={() => setCustomLayoutLocked((prev) => !prev)}
                className="px-2 py-1 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 rounded border border-white/10"
                title={customLayoutLocked ? 'Return to edit layout' : 'Lock layout and hide customization controls'}
              >
                {customLayoutLocked ? 'Edit layout' : 'Lock layout'}
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="AI Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

          {/* Phase 3.2 — Help guide */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Usage Guide &amp; Keyboard Shortcuts"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-6 py-1.5 border-b border-white/8 bg-black/20 text-center text-[10px] tracking-wide text-zinc-400 shrink-0">
        Created by Jeffrey Guntly · © JX Holdings, LLC
      </div>

      {/* ── Main workspace ───────────────────────────────────────────────────── */}

      {/* ── Mobile layout (< 1024px) ──────────────────────────────────────── */}
      {isMobileLayout ? (
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Full-height preview */}
          <div className="flex-1 flex flex-col bg-[#09090b] min-w-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/3 text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Preview
              </div>
              
              {previewBaseUrl && (
                <div className="flex items-center gap-2 flex-1 max-w-md mx-4 bg-black/50 rounded-lg px-3 py-1.5 border border-white/8 normal-case tracking-normal text-sm shadow-inner backdrop-blur-sm">
                  <button onClick={() => setIframeKey(k => k + 1)} className="text-zinc-400 hover:text-white transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <span className="text-zinc-500 text-xs truncate max-w-[150px]">{previewBaseUrl}</span>
                  <input 
                    type="text" 
                    value={browserPath}
                    onChange={e => setBrowserPath(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setIframeKey(k => k + 1)}
                    className="bg-transparent border-none outline-none text-xs text-white flex-1 min-w-[50px]"
                    placeholder="/"
                  />
                </div>
              )}

              <div className="flex items-center gap-1 bg-black/50 rounded-lg p-0.5 border border-white/8 backdrop-blur-sm">
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewMode('tablet')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'tablet' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative bg-[#09090b] overflow-hidden">
              {previewUrl ? (
                <div className={`w-full h-full ${previewMode !== 'desktop' ? 'overflow-auto flex justify-center py-8' : ''}`}>
                  <div 
                    className={`transition-all duration-300 ease-in-out bg-white ${
                      previewMode === 'mobile' ? 'w-[375px] h-[812px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' :
                      previewMode === 'tablet' ? 'w-[768px] h-[1024px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' :
                      'w-full h-full'
                    }`}
                  >
                    <iframe 
                      key={iframeKey}
                      src={`${previewBaseUrl}${browserPath.startsWith('/') ? browserPath : '/' + browserPath}`} 
                      className="w-full h-full border-none"
                      title="Preview"
                      allow="cross-origin-isolated"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                  {status === 'idle' ? (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                        <Upload className="w-8 h-8 text-zinc-500" />
                      </div>
                      <p className="text-lg tracking-wide">Drop in a zip file to get the preview going</p>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-2xl">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                      </div>
                      <p className="text-rose-400 max-w-md text-center">{errorMsg}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      </div>
                      <p className="text-lg tracking-wide text-indigo-200/70">Preparing environment…</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Bottom drawer */}
          {activeDrawerTab && (
            <div className="h-64 shrink-0 border-t border-white/8 bg-black/45 backdrop-blur-xl flex flex-col animate-panel-in-up overflow-hidden">
              {activeDrawerTab === 'terminal' && (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-white/4 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      <TerminalIcon className="w-3.5 h-3.5" />Terminal
                    </div>
                    <button onClick={() => setActiveDrawerTab(null)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex-1 p-2 overflow-hidden min-h-0">
                    <TerminalComponent onTerminalReady={handleTerminalReady} onTerminalData={handleTerminalData} statusMessage={recoveryMessage} />
                  </div>
                </>
              )}
              {activeDrawerTab === 'chat' && (
                <ChatPanel resetKey={chatKey} settings={settings} getProjectContext={getProjectContext} troubleshootRequest={troubleshootRequest} onTroubleshootHandled={() => setTroubleshootRequest(null)} onCollapse={() => setActiveDrawerTab(null)} onRunDiagnosticCommand={handleRunDiagnosticCommand} onExportArtifact={handleExportArtifact} stagedNotes={stagedNotes} onClearStagedNotes={handleClearStagedNotes} onRequestAIReview={() => {}} />
              )}
              {activeDrawerTab === 'scratch' && (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-white/4 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      <PenLine className="w-3.5 h-3.5 text-amber-400/80" />Scratch Pad
                    </div>
                    <button onClick={() => setActiveDrawerTab(null)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                  </div>
                  <ScratchPad resetKey={scratchKey} value={scratchPadContent} onChange={setScratchPadContent} onStageNotes={handleStageNotes} />
                </>
              )}
            </div>
          )}
          {/* Bottom tab bar */}
          <div className="shrink-0 flex items-stretch border-t border-white/8 bg-black/30 backdrop-blur-xl">
            {[
              { id: 'terminal' as const, icon: <TerminalIcon className="w-4 h-4" />, label: 'Terminal' },
              { id: 'chat' as const, icon: <Globe className="w-4 h-4" />, label: 'Chat' },
              { id: 'scratch' as const, icon: <PenLine className="w-4 h-4 text-amber-400/80" />, label: 'Notes' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDrawerTab(prev => prev === tab.id ? null : tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${activeDrawerTab === tab.id ? 'text-white bg-white/8' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </main>

      ) : layoutPreset === 'architect' ? (

        /* ── Architect layout ─────────────────────────────────────────────── */
        <main
          className="flex-1 grid overflow-hidden min-h-0"
          style={{
            gridTemplateColumns: `1fr auto`,
            gridTemplateRows: `1fr ${terminalCollapsed ? 32 : terminalHeight}px`,
          }}
        >
          {/* Top-left: Preview */}
          <div className="flex flex-col bg-[#09090b] overflow-hidden min-h-0 min-w-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/3 text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Preview
              </div>
              
              {previewBaseUrl && (
                <div className="flex items-center gap-2 flex-1 max-w-md mx-4 bg-black/50 rounded-lg px-3 py-1.5 border border-white/8 normal-case tracking-normal text-sm shadow-inner backdrop-blur-sm">
                  <button onClick={() => setIframeKey(k => k + 1)} className="text-zinc-400 hover:text-white transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <span className="text-zinc-500 text-xs truncate max-w-[150px]">{previewBaseUrl}</span>
                  <input 
                    type="text" 
                    value={browserPath}
                    onChange={e => setBrowserPath(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setIframeKey(k => k + 1)}
                    className="bg-transparent border-none outline-none text-xs text-white flex-1 min-w-[50px]"
                    placeholder="/"
                  />
                </div>
              )}

              <div className="flex items-center gap-1 bg-black/50 rounded-lg p-0.5 border border-white/8 backdrop-blur-sm">
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewMode('tablet')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'tablet' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative bg-[#09090b] overflow-hidden">
              {previewUrl ? (
                <div className={`w-full h-full ${previewMode !== 'desktop' ? 'overflow-auto flex justify-center py-8' : ''}`}>
                  <div 
                    className={`transition-all duration-300 ease-in-out bg-white ${
                      previewMode === 'mobile' ? 'w-[375px] h-[812px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' :
                      previewMode === 'tablet' ? 'w-[768px] h-[1024px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' :
                      'w-full h-full'
                    }`}
                  >
                    <iframe 
                      key={iframeKey}
                      src={`${previewBaseUrl}${browserPath.startsWith('/') ? browserPath : '/' + browserPath}`} 
                      className="w-full h-full border-none"
                      title="Preview"
                      allow="cross-origin-isolated"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                  {status === 'idle' ? (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                        <Upload className="w-8 h-8 text-zinc-500" />
                      </div>
                      <p className="text-lg tracking-wide">Drop in a zip file to get the preview going</p>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-2xl">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                      </div>
                      <p className="text-rose-400 max-w-md text-center">{errorMsg}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      </div>
                      <p className="text-lg tracking-wide text-indigo-200/70">Preparing environment…</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Top-right: Chat + Scratch stacked side-by-side */}
          <div className="flex flex-row border-l border-white/8 overflow-hidden min-h-0">
            {/* Chat panel */}
            {!chatCollapsed ? (
              <div style={{ width: chatWidth }} className="flex flex-col shrink-0 overflow-hidden">
                <ChatPanel resetKey={chatKey} settings={settings} getProjectContext={getProjectContext} troubleshootRequest={troubleshootRequest} onTroubleshootHandled={() => setTroubleshootRequest(null)} onCollapse={() => setChatCollapsed(true)} onRunDiagnosticCommand={handleRunDiagnosticCommand} onExportArtifact={handleExportArtifact} stagedNotes={stagedNotes} onClearStagedNotes={handleClearStagedNotes} onRequestAIReview={() => {}} />
              </div>
            ) : (
              <div className={`${collapsedTab} w-8 border-r py-3 gap-2`}>
                <button onClick={() => setChatCollapsed(false)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="Expand chat"><ChevronRight className="w-3.5 h-3.5" /></button>
                <span className={collapsedLabel} style={{ writingMode: 'vertical-rl' }}>Chat</span>
              </div>
            )}

            {/* Chat ↔ Scratch divider */}
            {!chatCollapsed && !scratchCollapsed && (
              <div
                className="resize-divider w-1 shrink-0 bg-white/4 hover:bg-amber-500/40 active:bg-amber-500/60 cursor-col-resize transition-all duration-150 flex items-center justify-center group hover:w-1.5"
                onMouseDown={startDrag('scratch', scratchWidth)}
                onTouchStart={startTouchDrag('scratch', scratchWidth)}
              >
                <GripVertical className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}

            {/* Scratch Pad */}
            {!scratchCollapsed ? (
              <div style={{ width: scratchWidth }} className="flex flex-col border-l border-white/8 bg-black/40 backdrop-blur-xl shrink-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/4 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    <PenLine className="w-3.5 h-3.5 text-amber-400/80" />Scratch Pad
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => { if (!scratchPinned) setScratchCollapsed(true); }} className={`p-1 transition-colors ${scratchPinned ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-600 hover:text-zinc-300'}`} title={scratchPinned ? 'Pinned open' : 'Collapse'}><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setScratchPinned(p => !p)} className={`p-1 transition-colors ${scratchPinned ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-zinc-300'}`} title={scratchPinned ? 'Unpin' : 'Pin'}>{scratchPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}</button>
                  </div>
                </div>
                <ScratchPad resetKey={scratchKey} value={scratchPadContent} onChange={setScratchPadContent} onStageNotes={handleStageNotes} />
              </div>
            ) : (
              <div className={`${collapsedTab} w-8 border-l border-white/8 py-3 gap-2`}>
                <button onClick={() => setScratchCollapsed(false)} className="p-1 text-zinc-600 hover:text-amber-400 transition-colors" title="Expand notes"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <span className={`${collapsedLabel} text-amber-900/60`} style={{ writingMode: 'vertical-rl' }}>Notes</span>
              </div>
            )}
          </div>

          {/* Bottom: Terminal (full width, both columns) */}
          <div className="col-span-2 flex flex-col border-t border-white/8 bg-black/45 backdrop-blur-xl overflow-hidden min-h-0">
            <div
              className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-white/4 shrink-0 cursor-row-resize select-none"
              onMouseDown={startDrag('terminal-height', terminalHeight)}
              onTouchStart={startTouchDrag('terminal-height', terminalHeight)}
              title="Drag to resize terminal height"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                <GripVertical className="w-3.5 h-3.5 text-zinc-600" />
                <TerminalIcon className="w-3.5 h-3.5" />Terminal
              </div>
              <button onClick={() => setTerminalCollapsed(c => !c)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title={terminalCollapsed ? 'Expand terminal' : 'Collapse terminal'}>
                {terminalCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            {!terminalCollapsed && (
              <div className="flex-1 p-2 overflow-hidden min-h-0">
                <TerminalComponent onTerminalReady={handleTerminalReady} onTerminalData={handleTerminalData} statusMessage={recoveryMessage} />
              </div>
            )}
          </div>
        </main>

      ) : layoutPreset === 'zen-focus' ? (

        /* ── Zen Focus layout ─────────────────────────────────────────────── */
        <main className="flex-1 flex overflow-hidden min-h-0">
          {/* Scratch Pad (left) */}
          <div
            style={{ width: Math.max(scratchWidth, ZEN_LAYOUT_SCRATCH_MIN_WIDTH) }}
            className="flex flex-col border-r border-white/8 bg-black/40 backdrop-blur-xl shrink-0 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/4 shrink-0">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                <PenLine className="w-3.5 h-3.5 text-amber-400/80" />
                <span className="text-amber-300/90">Scratch Pad</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setScratchPinned(p => !p)} className={`p-1 transition-colors ${scratchPinned ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-zinc-300'}`} title={scratchPinned ? 'Unpin' : 'Pin'}>{scratchPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}</button>
              </div>
            </div>
            <ScratchPad resetKey={scratchKey} value={scratchPadContent} onChange={setScratchPadContent} onStageNotes={handleStageNotes} />
          </div>

          {/* Drag divider */}
          <div
            className="resize-divider w-1 shrink-0 bg-white/4 hover:bg-amber-500/40 active:bg-amber-500/60 cursor-col-resize transition-all duration-150 flex items-center justify-center group hover:w-1.5"
            onMouseDown={startDrag('scratch', scratchWidth)}
            onTouchStart={startTouchDrag('scratch', scratchWidth)}
          >
            <GripVertical className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Preview (right, fills remaining space) */}
          <div className="flex-1 flex flex-col bg-[#09090b] min-w-[300px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/3 text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Preview
              </div>
              
              {previewBaseUrl && (
                <div className="flex items-center gap-2 flex-1 max-w-md mx-4 bg-black/50 rounded-lg px-3 py-1.5 border border-white/8 normal-case tracking-normal text-sm shadow-inner backdrop-blur-sm">
                  <button onClick={() => setIframeKey(k => k + 1)} className="text-zinc-400 hover:text-white transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <span className="text-zinc-500 text-xs truncate max-w-[150px]">{previewBaseUrl}</span>
                  <input 
                    type="text" 
                    value={browserPath}
                    onChange={e => setBrowserPath(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setIframeKey(k => k + 1)}
                    className="bg-transparent border-none outline-none text-xs text-white flex-1 min-w-[50px]"
                    placeholder="/"
                  />
                </div>
              )}

              <div className="flex items-center gap-1 bg-black/50 rounded-lg p-0.5 border border-white/8 backdrop-blur-sm">
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewMode('tablet')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'tablet' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative bg-[#09090b] overflow-hidden">
              {previewUrl ? (
                <div className={`w-full h-full ${previewMode !== 'desktop' ? 'overflow-auto flex justify-center py-8' : ''}`}>
                  <div 
                    className={`transition-all duration-300 ease-in-out bg-white ${
                      previewMode === 'mobile' ? 'w-[375px] h-[812px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' :
                      previewMode === 'tablet' ? 'w-[768px] h-[1024px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' :
                      'w-full h-full'
                    }`}
                  >
                    <iframe 
                      key={iframeKey}
                      src={`${previewBaseUrl}${browserPath.startsWith('/') ? browserPath : '/' + browserPath}`} 
                      className="w-full h-full border-none"
                      title="Preview"
                      allow="cross-origin-isolated"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                  {status === 'idle' ? (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                        <Upload className="w-8 h-8 text-zinc-500" />
                      </div>
                      <p className="text-lg tracking-wide">Drop in a zip file to get the preview going</p>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-2xl">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                      </div>
                      <p className="text-rose-400 max-w-md text-center">{errorMsg}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      </div>
                      <p className="text-lg tracking-wide text-indigo-200/70">Preparing environment…</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

      ) : layoutPreset === 'custom' ? (

        /* ── Custom layout ────────────────────────────────────────────────── */
        <main className="flex-1 flex overflow-hidden min-h-0 relative" ref={customLayoutContainerRef}>
          {customLayout.columns.map((col, colIdx) => {
            const visiblePanels = col.panels.filter(p => !p.hidden);
            return (
              <React.Fragment key={colIdx}>
                {/* Column */}
                <div
                  style={{ flex: col.widthFraction }}
                  className={`relative flex flex-col overflow-hidden min-w-0 min-h-0 border-r border-white/8 last:border-r-0 ${
                    customDropColumn === colIdx && !customLayoutLocked ? 'bg-violet-500/10' : ''
                  }`}
                  onDragOver={(e) => {
                    if (customLayoutLocked) return;
                    e.preventDefault();
                    setCustomDropColumn(colIdx);
                  }}
                  onDragLeave={() => {
                    if (customDropColumn === colIdx) setCustomDropColumn(null);
                  }}
                  onDrop={(e) => {
                    if (customLayoutLocked) return;
                    e.preventDefault();
                    const payload = e.dataTransfer.getData('application/json');
                    let data: CustomDragData | null = customDraggingPanel;
                    if (payload) {
                      try { data = JSON.parse(payload) as CustomDragData; } catch {}
                    }
                    if (!data) return;
                    dropPanelToColumn(data.panel, data.fromColIdx, colIdx);
                    setCustomDraggingPanel(null);
                    setCustomDropColumn(null);
                  }}
                >
                  {customDropColumn === colIdx && !customLayoutLocked && (
                    <div className="absolute inset-2 z-20 rounded-lg border-2 border-dashed border-violet-400/70 bg-violet-500/10 pointer-events-none flex items-center justify-center">
                      <div className="px-3 py-1.5 rounded-md bg-violet-500/20 text-violet-200 text-xs uppercase tracking-wider">
                        + Add to column
                      </div>
                    </div>
                  )}
                  {visiblePanels.length === 0 ? (
                    <div className="flex-1 m-2 rounded-lg border border-dashed border-violet-500/40 bg-violet-500/5 text-violet-300/70 text-xs flex items-center justify-center min-h-0">
                      {customLayoutLocked ? 'Empty column' : 'Drop a panel here'}
                    </div>
                  ) : visiblePanels.map((entry, vIdx) => {
                    const isLast = vIdx === visiblePanels.length - 1;
                    const realIdx = col.panels.indexOf(entry);
                    const panelEl = (() => {
                      switch (entry.panel) {
                        case 'terminal':
                          return (
                            <div key="terminal" style={{ flex: entry.heightFraction }} className="flex flex-col overflow-hidden min-h-0">
                              <div
                                className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/4 shrink-0 cursor-move"
                                draggable={!customLayoutLocked}
                                onDragStart={(e) => {
                                  if (customLayoutLocked) return;
                                  const data: CustomDragData = { panel: 'terminal', fromColIdx: colIdx };
                                  e.dataTransfer.setData('application/json', JSON.stringify(data));
                                  setCustomDraggingPanel(data);
                                }}
                                onDragEnd={() => { setCustomDraggingPanel(null); setCustomDropColumn(null); }}
                              >
                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                  <TerminalIcon className="w-3.5 h-3.5" />Terminal
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {!customLayoutLocked && renderCustomPanelMoveControls(entry, colIdx, realIdx)}
                                  <button onClick={() => setTerminalCollapsed(c => !c)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title={terminalCollapsed ? 'Expand terminal' : 'Collapse terminal'}>
                                    {terminalCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                              {!terminalCollapsed && (
                                <div className="flex-1 p-2 overflow-hidden min-h-0">
                                  <TerminalComponent onTerminalReady={handleTerminalReady} onTerminalData={handleTerminalData} statusMessage={recoveryMessage} />
                                </div>
                              )}
                            </div>
                          );
                        case 'preview':
                          return (
                            <div key="preview" style={{ flex: entry.heightFraction }} className="flex flex-col overflow-hidden min-h-0 bg-[#09090b]">
                              <div
                                className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/3 text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0 backdrop-blur-md cursor-move"
                                draggable={!customLayoutLocked}
                                onDragStart={(e) => {
                                  if (customLayoutLocked) return;
                                  const data: CustomDragData = { panel: 'preview', fromColIdx: colIdx };
                                  e.dataTransfer.setData('application/json', JSON.stringify(data));
                                  setCustomDraggingPanel(data);
                                }}
                                onDragEnd={() => { setCustomDraggingPanel(null); setCustomDropColumn(null); }}
                              >
                                <div className="flex items-center gap-2">
                                  {!customLayoutLocked && renderCustomPanelMoveControls(entry, colIdx, realIdx)}
                                  <Globe className="w-3.5 h-3.5" />Preview
                                </div>
                                {previewBaseUrl && (
                                  <div className="flex items-center gap-2 flex-1 max-w-md mx-4 bg-black/50 rounded-lg px-3 py-1.5 border border-white/8 normal-case tracking-normal text-sm shadow-inner backdrop-blur-sm">
                                    <button onClick={() => setIframeKey(k => k + 1)} className="text-zinc-400 hover:text-white transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                                    <div className="w-px h-4 bg-white/10 mx-1" />
                                    <span className="text-zinc-500 text-xs truncate max-w-[150px]">{previewBaseUrl}</span>
                                    <input type="text" value={browserPath} onChange={e => setBrowserPath(e.target.value)} onKeyDown={e => e.key === 'Enter' && setIframeKey(k => k + 1)} className="bg-transparent border-none outline-none text-xs text-white flex-1 min-w-[50px]" placeholder="/" />
                                  </div>
                                )}
                                <div className="flex items-center gap-1 bg-black/50 rounded-lg p-0.5 border border-white/8 backdrop-blur-sm">
                                  <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-sm transition-colors ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Mobile View"><Smartphone className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setPreviewMode('tablet')} className={`p-1.5 rounded-sm transition-colors ${previewMode === 'tablet' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Tablet View"><Tablet className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-sm transition-colors ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Desktop View"><Monitor className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                              <div className="flex-1 relative bg-[#09090b] overflow-hidden">
                                {previewUrl ? (
                                  <div className={`w-full h-full ${previewMode !== 'desktop' ? 'overflow-auto flex justify-center py-8' : ''}`}>
                                    <div className={`transition-all duration-300 ease-in-out bg-white ${previewMode === 'mobile' ? 'w-[375px] h-[812px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' : previewMode === 'tablet' ? 'w-[768px] h-[1024px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' : 'w-full h-full'}`}>
                                      <iframe key={iframeKey} src={`${previewBaseUrl}${browserPath.startsWith('/') ? browserPath : '/' + browserPath}`} className="w-full h-full border-none" title="Preview" allow="cross-origin-isolated" referrerPolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                                    {status === 'idle' ? (<><div className="w-20 h-20 mb-6 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-sm"><Upload className="w-8 h-8 text-zinc-500" /></div><p className="text-lg tracking-wide">Drop in a zip file to get the preview going</p></>) : status === 'error' ? (<><div className="w-20 h-20 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-2xl"><AlertCircle className="w-8 h-8 text-rose-400" /></div><p className="text-rose-400 max-w-md text-center">{errorMsg}</p></>) : (<><div className="w-20 h-20 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl"><RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" /></div><p className="text-lg tracking-wide text-indigo-200/70">Preparing environment…</p></>)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        case 'chat':
                          return (
                            <div key="chat" style={{ flex: entry.heightFraction }} className="flex flex-col overflow-hidden min-h-0">
                                <div
                                  className="flex items-center gap-0.5 px-2 py-1 border-b border-violet-500/20 bg-violet-500/5 shrink-0 cursor-move"
                                  draggable={!customLayoutLocked}
                                  onDragStart={(e) => {
                                    if (customLayoutLocked) return;
                                    const data: CustomDragData = { panel: 'chat', fromColIdx: colIdx };
                                    e.dataTransfer.setData('application/json', JSON.stringify(data));
                                    setCustomDraggingPanel(data);
                                  }}
                                  onDragEnd={() => { setCustomDraggingPanel(null); setCustomDropColumn(null); }}
                                >
                                  {!customLayoutLocked && renderCustomPanelMoveControls(entry, colIdx, realIdx)}
                                  <span className="ml-auto text-[10px] text-violet-400/60 uppercase tracking-wider">AI Chat</span>
                                </div>
                              <ChatPanel
                                resetKey={chatKey}
                                settings={settings}
                                getProjectContext={getProjectContext}
                                troubleshootRequest={troubleshootRequest}
                                onTroubleshootHandled={() => setTroubleshootRequest(null)}
                                onCollapse={() => setPanelHidden(colIdx, 'chat', true)}
                                onRunDiagnosticCommand={handleRunDiagnosticCommand}
                                onExportArtifact={handleExportArtifact}
                                stagedNotes={stagedNotes}
                                onClearStagedNotes={handleClearStagedNotes}
                                onRequestAIReview={() => {}}
                              />
                            </div>
                          );
                        case 'scratch':
                          return (
                            <div key="scratch" style={{ flex: entry.heightFraction }} className="flex flex-col bg-black/40 backdrop-blur-xl overflow-hidden min-h-0">
                              <div
                                className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/4 shrink-0 cursor-move"
                                draggable={!customLayoutLocked}
                                onDragStart={(e) => {
                                  if (customLayoutLocked) return;
                                  const data: CustomDragData = { panel: 'scratch', fromColIdx: colIdx };
                                  e.dataTransfer.setData('application/json', JSON.stringify(data));
                                  setCustomDraggingPanel(data);
                                }}
                                onDragEnd={() => { setCustomDraggingPanel(null); setCustomDropColumn(null); }}
                              >
                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                  <PenLine className="w-3.5 h-3.5 text-amber-400/80" />Scratch Pad
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {!customLayoutLocked && renderCustomPanelMoveControls(entry, colIdx, realIdx)}
                                </div>
                              </div>
                              <ScratchPad resetKey={scratchKey} value={scratchPadContent} onChange={setScratchPadContent} onStageNotes={handleStageNotes} />
                            </div>
                          );
                        default:
                          return null;
                      }
                    })();
                    return (
                      <React.Fragment key={entry.panel}>
                        {panelEl}
                        {/* Row drag divider within column */}
                        {!isLast && !customLayoutLocked && (
                          <div
                            className="resize-divider h-1 shrink-0 bg-white/4 hover:bg-violet-500/40 active:bg-violet-500/60 cursor-row-resize transition-all duration-150 flex items-center justify-center group hover:h-1.5"
                            onMouseDown={startDrag(`custom-row-${colIdx}-${realIdx}`, entry.heightFraction)}
                            onTouchStart={startTouchDrag(`custom-row-${colIdx}-${realIdx}`, entry.heightFraction)}
                          >
                            <GripHorizontal className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                {/* Column drag divider */}
                {colIdx < customLayout.columns.length - 1 && !customLayoutLocked && (
                  <div
                    className="resize-divider w-1 shrink-0 bg-white/4 hover:bg-violet-500/50 active:bg-violet-500/70 cursor-col-resize transition-all duration-150 flex items-center justify-center group hover:w-1.5"
                    onMouseDown={startDrag(`custom-col-${colIdx}`, col.widthFraction)}
                    onTouchStart={startTouchDrag(`custom-col-${colIdx}`, col.widthFraction)}
                  >
                    <GripVertical className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
          {!customLayoutLocked && customLayout.columns.some((col) => col.panels.some((p) => p.hidden)) && (
            <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-1.5 max-w-[75%]">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Minimized</span>
              {customLayout.columns.flatMap((col, colIdx) =>
                col.panels
                  .filter((p) => p.hidden)
                  .map((p) => (
                    <button
                      key={`${colIdx}-${p.panel}`}
                      onClick={() => setPanelHidden(colIdx, p.panel, false)}
                      className="px-2 py-1 text-[11px] rounded bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/25"
                    >
                      <Eye className="w-3 h-3 inline mr-1" />
                      {p.panel}
                    </button>
                  ))
              )}
            </div>
          )}
        </main>

      ) : (

        /* ── Standard layout (default) ───────────────────────────────────── */
        <main className="flex-1 flex overflow-hidden min-h-0">

          {/* ── Terminal Panel (left side when terminalSide='left') ──── */}
          {terminalSide === 'left' && (
            !terminalCollapsed ? (
              <div
                data-tour="terminal"
                style={{ width: terminalWidth }}
                className={`flex flex-col border-r border-white/8 bg-black/45 backdrop-blur-xl shrink-0 overflow-hidden animate-panel-in-left ${layoutEditMode ? 'ring-1 ring-violet-500/30' : ''}`}
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/4 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    <TerminalIcon className="w-3.5 h-3.5" />
                    Terminal
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setTerminalSide('right')}
                      className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                      title="Move terminal to right side"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTerminalCollapsed(true)}
                      className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                      title="Collapse terminal"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-2 overflow-hidden min-h-0">
                  <TerminalComponent
                    onTerminalReady={handleTerminalReady}
                    onTerminalData={handleTerminalData}
                    statusMessage={recoveryMessage}
                  />
                </div>
              </div>
            ) : (
              <div className={`${collapsedTab} w-8 border-r py-3 gap-2`}>
                <button
                  onClick={() => setTerminalCollapsed(false)}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                  title="Expand terminal"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className={collapsedLabel} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  Terminal
                </span>
              </div>
            )
          )}

          {/* Drag divider: Terminal ↔ Preview (left) */}
          {terminalSide === 'left' && !terminalCollapsed && (
            <div
              className="resize-divider w-1 shrink-0 bg-white/4 hover:bg-indigo-500/50 active:bg-indigo-500/70 cursor-col-resize transition-all duration-150 flex items-center justify-center group hover:w-1.5"
              onMouseDown={startDrag('terminal', terminalWidth)}
              onTouchStart={startTouchDrag('terminal', terminalWidth)}
            >
              <GripVertical className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* ── Preview Panel ────────────────────────────────────────────────── */}
          <div data-tour="preview" className="flex-1 flex flex-col bg-[#09090b] overflow-hidden" style={{ minWidth: PREVIEW_MIN_WIDTH }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/3 text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Preview
              </div>
              
              {previewBaseUrl && (
                <div className="flex items-center gap-2 flex-1 max-w-md mx-4 bg-black/50 rounded-lg px-3 py-1.5 border border-white/8 normal-case tracking-normal text-sm shadow-inner backdrop-blur-sm">
                  <button onClick={() => setIframeKey(k => k + 1)} className="text-zinc-400 hover:text-white transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <span className="text-zinc-500 text-xs truncate max-w-[150px]">{previewBaseUrl}</span>
                  <input 
                    type="text" 
                    value={browserPath}
                    onChange={e => setBrowserPath(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setIframeKey(k => k + 1)}
                    className="bg-transparent border-none outline-none text-xs text-white flex-1 min-w-[50px]"
                    placeholder="/"
                  />
                </div>
              )}

              <div className="flex items-center gap-1 bg-black/50 rounded-lg p-0.5 border border-white/8 backdrop-blur-sm">
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewMode('tablet')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'tablet' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-sm transition-colors ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative bg-[#09090b] overflow-hidden">
              {previewUrl ? (
                <div className={`w-full h-full ${previewMode !== 'desktop' ? 'overflow-auto flex justify-center py-8' : ''}`}>
                  <div 
                    className={`transition-all duration-300 ease-in-out bg-white ${
                      previewMode === 'mobile' ? 'w-[375px] h-[812px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' :
                      previewMode === 'tablet' ? 'w-[768px] h-[1024px] border-[12px] border-zinc-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0' :
                      'w-full h-full'
                    }`}
                  >
                    <iframe 
                      key={iframeKey}
                      src={`${previewBaseUrl}${browserPath.startsWith('/') ? browserPath : '/' + browserPath}`} 
                      className="w-full h-full border-none"
                      title="Preview"
                      allow="cross-origin-isolated"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                  {status === 'idle' ? (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                        <Upload className="w-8 h-8 text-zinc-500" />
                      </div>
                      <p className="text-lg tracking-wide">Drop in a zip file to get the preview going</p>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-2xl">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                      </div>
                      <p className="text-rose-400 max-w-md text-center">{errorMsg}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      </div>
                      <p className="text-lg tracking-wide text-indigo-200/70">Preparing environment…</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel: Chat + Scratch stacked vertically ───────────────── */}
          <>
              {/* Drag divider: Preview ↔ Right Panel */}
              {!(chatCollapsed && scratchCollapsed) && (
                <div
                  className="resize-divider w-1 shrink-0 bg-white/4 hover:bg-indigo-500/50 active:bg-indigo-500/70 cursor-col-resize transition-all duration-150 flex items-center justify-center group hover:w-1.5"
                  onMouseDown={startDrag('right-panel', rightPanelWidth)}
                  onTouchStart={startTouchDrag('right-panel', rightPanelWidth)}
                >
                  <GripVertical className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              {/* Right panel container — vertical column */}
              <div
                ref={rightPanelRef}
                style={{ width: (chatCollapsed && scratchCollapsed) ? 16 : rightPanelWidth }}
                className={`flex flex-col shrink-0 overflow-hidden ${layoutEditMode ? 'ring-1 ring-violet-500/30' : ''}`}
              >
                {chatFirst ? (
                  <>
                    {/* Chat Panel — top */}
                    {!chatCollapsed ? (
                      <div
                        style={{ height: scratchCollapsed ? undefined : chatPanelHeight, flex: scratchCollapsed ? '1 1 auto' : undefined }}
                        className="flex flex-col shrink-0 overflow-hidden border-b border-white/8 animate-panel-in-right"
                      >
                        <ChatPanel
                          resetKey={chatKey}
                          settings={settings}
                          getProjectContext={getProjectContext}
                          troubleshootRequest={troubleshootRequest}
                          onTroubleshootHandled={() => setTroubleshootRequest(null)}
                          onCollapse={() => setChatCollapsed(true)}
                          onRunDiagnosticCommand={handleRunDiagnosticCommand}
                          onExportArtifact={handleExportArtifact}
                          stagedNotes={stagedNotes}
                          onClearStagedNotes={handleClearStagedNotes}
                          onRequestAIReview={() => {}}
                        />
                      </div>
                    ) : (
                      <div className={`${collapsedHBar} border-b border-white/8`}>
                        <button onClick={() => setChatCollapsed(false)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="Expand chat">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-zinc-700 text-[10px] font-medium uppercase tracking-wider">Chat</span>
                        <button onClick={() => setChatFirst(false)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors ml-auto" title="Move Chat below Scratch Pad">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Horizontal drag divider: Chat ↔ Scratch */}
                    {!chatCollapsed && !scratchCollapsed && (
                      <div
                        className="resize-divider h-1 shrink-0 bg-white/4 hover:bg-amber-500/40 active:bg-amber-500/60 cursor-row-resize transition-all duration-150 flex items-center justify-center group hover:h-1.5"
                        onMouseDown={startDrag('chat-scratch-height', chatPanelHeight)}
                        onTouchStart={startTouchDrag('chat-scratch-height', chatPanelHeight)}
                      >
                        <GripHorizontal className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}

                    {/* Scratch Pad — bottom */}
                    <AnimatePresence mode="wait">
                      {!scratchCollapsed ? (
                        <motion.div
                          key="scratch-open"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 16 }}
                          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                          data-tour="scratch"
                          style={{ flex: '1 1 auto' }}
                          className="flex flex-col bg-black/40 backdrop-blur-xl overflow-hidden min-h-0"
                        >
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/4 shrink-0">
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                              <PenLine className="w-3.5 h-3.5 text-amber-400/80" />Scratch Pad
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => setChatFirst(false)}
                                className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                                title="Move Scratch Pad above Chat"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { if (!scratchPinned) setScratchCollapsed(true); }} className={`p-1 transition-colors ${scratchPinned ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-600 hover:text-zinc-300'}`} title={scratchPinned ? 'Pinned open' : 'Collapse'}>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setScratchPinned(p => !p)} className={`p-1 transition-colors ${scratchPinned ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-zinc-300'}`} title={scratchPinned ? 'Unpin' : 'Pin'}>
                                {scratchPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <ScratchPad resetKey={scratchKey} value={scratchPadContent} onChange={setScratchPadContent} onStageNotes={handleStageNotes} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="scratch-collapsed"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                          className={`${collapsedHBar} border-t border-white/8`}
                        >
                          <button onClick={() => setScratchCollapsed(false)} className="p-1 text-zinc-600 hover:text-amber-400 transition-colors" title="Expand scratch pad">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-amber-900/60 text-[10px] font-medium uppercase tracking-wider">Notes</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <>
                    {/* Scratch Pad — top (when chatFirst=false) */}
                    <AnimatePresence mode="wait">
                      {!scratchCollapsed ? (
                        <motion.div
                          key="scratch-open-top"
                          initial={{ opacity: 0, y: -16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                          data-tour="scratch"
                          style={{ height: chatCollapsed ? undefined : chatPanelHeight, flex: chatCollapsed ? '1 1 auto' : undefined }}
                          className="flex flex-col border-b border-white/8 bg-black/40 backdrop-blur-xl shrink-0 overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/4 shrink-0">
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                              <PenLine className="w-3.5 h-3.5 text-amber-400/80" />Scratch Pad
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => setChatFirst(true)}
                                className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                                title="Move Scratch Pad below Chat"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { if (!scratchPinned) setScratchCollapsed(true); }} className={`p-1 transition-colors ${scratchPinned ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-600 hover:text-zinc-300'}`} title={scratchPinned ? 'Pinned open' : 'Collapse'}>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setScratchPinned(p => !p)} className={`p-1 transition-colors ${scratchPinned ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-zinc-300'}`} title={scratchPinned ? 'Unpin' : 'Pin'}>
                                {scratchPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <ScratchPad resetKey={scratchKey} value={scratchPadContent} onChange={setScratchPadContent} onStageNotes={handleStageNotes} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="scratch-collapsed-top"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                          className={`${collapsedHBar} border-b border-white/8`}
                        >
                          <button onClick={() => setScratchCollapsed(false)} className="p-1 text-zinc-600 hover:text-amber-400 transition-colors" title="Expand scratch pad">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-amber-900/60 text-[10px] font-medium uppercase tracking-wider">Notes</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Horizontal drag divider: Scratch ↔ Chat */}
                    {!chatCollapsed && !scratchCollapsed && (
                      <div
                        className="resize-divider h-1 shrink-0 bg-white/4 hover:bg-amber-500/40 active:bg-amber-500/60 cursor-row-resize transition-all duration-150 flex items-center justify-center group hover:h-1.5"
                        onMouseDown={startDrag('chat-scratch-height', chatPanelHeight)}
                        onTouchStart={startTouchDrag('chat-scratch-height', chatPanelHeight)}
                      >
                        <GripHorizontal className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}

                    {/* Chat Panel — bottom (when chatFirst=false) */}
                    {!chatCollapsed ? (
                      <div
                        style={{ flex: '1 1 auto' }}
                        className="flex flex-col overflow-hidden border-t border-white/8 animate-panel-in-right"
                      >
                        <ChatPanel
                          resetKey={chatKey}
                          settings={settings}
                          getProjectContext={getProjectContext}
                          troubleshootRequest={troubleshootRequest}
                          onTroubleshootHandled={() => setTroubleshootRequest(null)}
                          onCollapse={() => setChatCollapsed(true)}
                          onRunDiagnosticCommand={handleRunDiagnosticCommand}
                          onExportArtifact={handleExportArtifact}
                          stagedNotes={stagedNotes}
                          onClearStagedNotes={handleClearStagedNotes}
                          onRequestAIReview={() => {}}
                        />
                      </div>
                    ) : (
                      <div className={`${collapsedHBar} border-t border-white/8`}>
                        <button onClick={() => setChatCollapsed(false)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="Expand chat">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-zinc-700 text-[10px] font-medium uppercase tracking-wider">Chat</span>
                        <button onClick={() => setChatFirst(true)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors ml-auto" title="Move Chat above Scratch Pad">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
          </>

          {/* ── Terminal Panel (right side when terminalSide='right') ─── */}
          {terminalSide === 'right' && (
            <>
              {/* Drag divider: RightPanel ↔ Terminal */}
              {!terminalCollapsed && (
                <div
                  className="resize-divider w-1 shrink-0 bg-white/4 hover:bg-indigo-500/50 active:bg-indigo-500/70 cursor-col-resize transition-all duration-150 flex items-center justify-center group hover:w-1.5"
                  onMouseDown={startDrag('terminal', terminalWidth)}
                  onTouchStart={startTouchDrag('terminal', terminalWidth)}
                >
                  <GripVertical className="w-2.5 h-2.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              {!terminalCollapsed ? (
                <div
                  data-tour="terminal"
                  style={{ width: terminalWidth }}
                  className={`flex flex-col border-l border-white/8 bg-black/45 backdrop-blur-xl shrink-0 overflow-hidden animate-panel-in-right ${layoutEditMode ? 'ring-1 ring-violet-500/30' : ''}`}
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/4 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      <TerminalIcon className="w-3.5 h-3.5" />
                      Terminal
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setTerminalSide('left')}
                        className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Move terminal to left side"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTerminalCollapsed(true)}
                        className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Collapse terminal"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-2 overflow-hidden min-h-0">
                    <TerminalComponent
                      onTerminalReady={handleTerminalReady}
                      onTerminalData={handleTerminalData}
                      statusMessage={recoveryMessage}
                    />
                  </div>
                </div>
              ) : (
                <div className={`${collapsedTab} w-8 border-l py-3 gap-2`}>
                  <button
                    onClick={() => setTerminalCollapsed(false)}
                    className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Expand terminal"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className={collapsedLabel} style={{ writingMode: 'vertical-rl' }}>Terminal</span>
                </div>
              )}
            </>
          )}

        </main>
      )}
    </div>
  );
}
