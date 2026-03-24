import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { WebContainer } from '@webcontainer/api';
import { Terminal } from 'xterm';
import { Upload, Play, RefreshCw, AlertCircle, ExternalLink, Terminal as TerminalIcon, Globe, Settings as SettingsIcon, Smartphone, Tablet, Monitor, Sparkles, FolderOpen } from 'lucide-react';
import { parseZipToTree } from './lib/zipParser';
import { TerminalComponent } from './components/TerminalComponent';
import { ChatPanel } from './components/ChatPanel';
import { SettingsModal, Settings } from './components/SettingsModal';

type Status = 'idle' | 'uploading' | 'booting' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error';
type PreviewMode = 'mobile' | 'tablet' | 'desktop';

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
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('ai_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { provider: 'gemini', apiKey: '', localUrl: 'http://localhost:11434/api/chat' };
  });
  
  const terminalRef = useRef<Terminal | null>(null);
  const webcontainerRef = useRef<WebContainer | null>(null);
  const shellWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const shellProcessRef = useRef<Awaited<ReturnType<WebContainer['spawn']>> | null>(null);
  const serverReadyUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const tauriWindow = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
    const isTauriRuntime = typeof tauriWindow.__TAURI__ !== 'undefined' || typeof tauriWindow.__TAURI_INTERNALS__ !== 'undefined';

    setIsIsolated(window.crossOriginIsolated || isTauriRuntime);
  }, []);

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('ai_settings', JSON.stringify(newSettings));
  };

  const handleTerminalReady = useCallback((term: Terminal) => {
    terminalRef.current = term;
    term.writeln('\x1b[34m[System]\x1b[0m Terminal initialized. Waiting for zip upload...');
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
  };

  const handleStartOver = useCallback(async () => {
    const confirmed = window.confirm('Start a new project? This will clear the current session.');
    if (!confirmed) return;

    // Unsubscribe from the previous server-ready listener
    if (serverReadyUnsubscribeRef.current) {
      serverReadyUnsubscribeRef.current();
      serverReadyUnsubscribeRef.current = null;
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

    // Clear the terminal and show the welcome message
    if (terminalRef.current) {
      terminalRef.current.clear();
      terminalRef.current.writeln('\x1b[34m[System]\x1b[0m Terminal initialized. Waiting for zip upload...');
    }

    // Reset all state
    setStatus('idle');
    setErrorMsg('');
    setPreviewUrl(null);
    setPreviewBaseUrl('');
    setBrowserPath('/');
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

  const processZipFile = async (file: File) => {
    try {
      setStatus('uploading');
      writeToTerminal(`\r\n\x1b[34m[System]\x1b[0m Parsing zip file: ${file.name}...\r\n`);
      
      const tree = await parseZipToTree(file);
      writeToTerminal(`\x1b[32m[System]\x1b[0m Zip parsed successfully.\r\n`);

      setStatus('booting');
      writeToTerminal(`\x1b[34m[System]\x1b[0m Booting WebContainer environment...\r\n`);
      
      if (!webcontainerRef.current) {
        webcontainerRef.current = await WebContainer.boot();
      }
      const wc = webcontainerRef.current;
      writeToTerminal(`\x1b[32m[System]\x1b[0m WebContainer booted.\r\n`);

      setStatus('mounting');
      writeToTerminal(`\x1b[34m[System]\x1b[0m Mounting files...\r\n`);
      await wc.mount(tree);
      writeToTerminal(`\x1b[32m[System]\x1b[0m Files mounted.\r\n`);

      // Unsubscribe any previous server-ready listener to avoid stale callbacks
      if (serverReadyUnsubscribeRef.current) {
        serverReadyUnsubscribeRef.current();
        serverReadyUnsubscribeRef.current = null;
      }

      serverReadyUnsubscribeRef.current = wc.on('server-ready', (port, url) => {
        writeToTerminal(`\r\n\x1b[32m[System]\x1b[0m Server ready at ${url}\r\n`);
        setPreviewBaseUrl(url);
        setPreviewUrl(url);
        setStatus('ready');
      });

      setStatus('starting');
      writeToTerminal(`\x1b[34m[System]\x1b[0m Starting interactive shell...\r\n`);
      
      const shellProcess = await wc.spawn('jsh', {
        terminal: {
          cols: terminalRef.current?.cols || 80,
          rows: terminalRef.current?.rows || 24,
        }
      });
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

      // Automate install and dev
      await writer.write('npm install && npm run dev\r');

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An unknown error occurred');
      writeToTerminal(`\r\n\x1b[31m[Error]\x1b[0m ${err.message}\r\n`);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processZipFile(file);
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

  return (
    <div 
      className="flex flex-col h-screen bg-[#09090b] text-zinc-200 font-sans relative"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.name.endsWith('.zip')) {
          processZipFile(file);
        }
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-500/10 backdrop-blur-sm border-2 border-indigo-500 border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-900/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-white/10">
            <Upload className="w-16 h-16 text-indigo-400 animate-bounce" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Drop zip file to preview</h2>
          </div>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleSaveSettings}
      />

      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-wide text-white">NOVA<span className="text-white/40 font-light">/sandbox</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          {status === 'idle' && (
            <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white rounded-md cursor-pointer transition-all text-sm font-medium shadow-lg shadow-indigo-500/20">
              <Upload className="w-4 h-4" />
              Upload Zip
              <input 
                type="file" 
                accept=".zip" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          )}
          
          {status !== 'idle' && status !== 'error' && status !== 'ready' && (
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {status.charAt(0).toUpperCase() + status.slice(1)}...
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex items-center gap-2 text-rose-400 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              Error
            </div>
          )}

          {status === 'ready' && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Running
            </div>
          )}

          {status !== 'idle' && (
            <button
              onClick={handleStartOver}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 rounded-md cursor-pointer transition-all text-sm font-medium"
              title="Start a new project"
            >
              <FolderOpen className="w-4 h-4" />
              New Project
            </button>
          )}

          <div className="w-px h-6 bg-white/10 mx-2"></div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="AI Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Terminal */}
        <div className="w-80 min-w-[250px] border-r border-white/10 flex flex-col bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <TerminalIcon className="w-3.5 h-3.5" />
            Terminal
          </div>
          <div className="flex-1 p-2 overflow-hidden">
            <TerminalComponent onTerminalReady={handleTerminalReady} onTerminalData={handleTerminalData} />
          </div>
        </div>

        {/* Middle Panel: Preview */}
        <div className="flex-1 flex flex-col bg-[#09090b] min-w-[300px]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Preview
            </div>
            
            {previewBaseUrl && (
              <div className="flex items-center gap-2 flex-1 max-w-md mx-4 bg-black/40 rounded-md px-3 py-1.5 border border-white/10 normal-case tracking-normal text-sm shadow-inner">
                <button onClick={() => setIframeKey(k => k + 1)} className="text-zinc-400 hover:text-white transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
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

            <div className="flex items-center gap-1 bg-black/40 rounded-md p-0.5 border border-white/10">
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
                  />
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                {status === 'idle' ? (
                  <>
                    <div className="w-20 h-20 mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                      <Upload className="w-8 h-8 text-zinc-400" />
                    </div>
                    <p className="text-lg tracking-wide">Upload a zip file to start the preview</p>
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
                    <p className="text-lg tracking-wide text-indigo-200/70">Preparing environment...</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: AI Chat */}
        <div className="w-96 min-w-[300px] flex flex-col">
          <ChatPanel settings={settings} getProjectContext={getProjectContext} />
        </div>
      </main>
    </div>
  );
}
