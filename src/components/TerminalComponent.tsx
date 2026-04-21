import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalComponentProps {
  onTerminalReady: (terminal: Terminal) => void;
  onTerminalData?: (data: string) => void;
  /** Optional message displayed as an overlay banner during boot recovery. */
  statusMessage?: string | null;
}

export function TerminalComponent({ onTerminalReady, onTerminalData, statusMessage }: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onTerminalReady, onTerminalData });

  useEffect(() => {
    callbacksRef.current = { onTerminalReady, onTerminalData };
  }, [onTerminalReady, onTerminalData]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      convertEol: true,
      theme: {
        background: '#0a0a0a',
        foreground: '#f5f5f5',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    // Defer initial fit until the container has non-zero dimensions
    requestAnimationFrame(() => {
      if (terminalRef.current && terminalRef.current.offsetWidth > 0) {
        fitAddon.fit();
      }
    });

    callbacksRef.current.onTerminalReady(term);

    const dataDisposable = term.onData((data) => {
      callbacksRef.current.onTerminalData?.(data);
    });

    const resizeObserver = new ResizeObserver(() => {
      // Only fit when the container has actual dimensions to avoid xterm Viewport errors
      if (terminalRef.current && terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
        requestAnimationFrame(() => {
          try {
            fitAddon.fit();
          } catch {
            // Ignore if terminal renderer is not yet ready
          }
        });
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      dataDisposable.dispose();
      term.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={terminalRef} className="w-full h-full overflow-hidden" />
      {statusMessage && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-medium backdrop-blur-sm pointer-events-none">
          <svg className="w-3 h-3 animate-spin shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {statusMessage}
        </div>
      )}
    </div>
  );
}

