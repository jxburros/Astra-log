import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalComponentProps {
  onTerminalReady: (terminal: Terminal) => void;
  onTerminalData?: (data: string) => void;
}

export function TerminalComponent({ onTerminalReady, onTerminalData }: TerminalComponentProps) {
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
    fitAddon.fit();

    callbacksRef.current.onTerminalReady(term);

    const dataDisposable = term.onData((data) => {
      callbacksRef.current.onTerminalData?.(data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      dataDisposable.dispose();
      term.dispose();
    };
  }, []);

  return <div ref={terminalRef} className="w-full h-full overflow-hidden" />;
}

