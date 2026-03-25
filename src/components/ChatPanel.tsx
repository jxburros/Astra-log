import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Bot, ChevronRight, PlayCircle, Wand2 } from 'lucide-react';
import type { Settings } from './SettingsModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface TroubleshootRequest {
  packageJson: string;
  terminalErrors: string;
}

interface Props {
  settings: Settings;
  getProjectContext: () => Promise<string>;
  /** When set, the panel automatically sends an AI troubleshooting request (or shows a tip if no key). */
  troubleshootRequest?: TroubleshootRequest | null;
  /** Called once the troubleshoot request has been processed so the parent can clear it. */
  onTroubleshootHandled?: () => void;
  /** Increment this value to reset the chat history for a new project session. */
  resetKey?: number;
  /** Called when the user clicks the collapse button in the panel header. */
  onCollapse?: () => void;
  /** Executes a suggested terminal command after user confirmation in parent. */
  onRunDiagnosticCommand?: (command: string) => void;
}

const SYSTEM_PROMPT = `You are an AI assistant helping a developer brainstorm and plan features for a web application they are previewing.
Prioritize explanation and clear structure over lengthy prose.
Avoid unsolicited solutions unless the user directly asks for implementation steps.
If the user input is short or fragmentary, default to passive mode: brief acknowledgment, one lightweight clarifying option, and no heavy solution dump.
Hold off on writing code for now; the goal is to help them think things through and capture their ideas.
When they're ready for a plan, put together a clear, comprehensive, step-by-step implementation guide based on everything discussed — covering architecture changes, required components, and logical sequencing.
When suggesting terminal diagnostics, format each command in its own fenced \`\`\`bash block.`;

const INITIAL_MESSAGE: Message = { role: 'assistant', content: "Hey there! Ready to build something great? Share your ideas — big or small — and let's start mapping out what your app could become. Whenever you're ready, we can turn it all into a solid implementation plan." };

const ACTION_CHIPS = ['Expand', 'Clarify', "What's missing"] as const;
const SHORT_INPUT_THRESHOLD = 40;

const getDiagnosticCommands = (content: string): string[] => {
  const commands = new Set<string>();
  const blockRegex = /```(?:bash|sh|zsh)?\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(content))) {
    match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => !line.startsWith('#'))
      .forEach(line => commands.add(line));
  }
  return Array.from(commands).slice(0, 4);
};

export function ChatPanel({ settings, getProjectContext, troubleshootRequest, onTroubleshootHandled, resetKey, onCollapse, onRunDiagnosticCommand }: Props) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset chat history whenever a new project session starts
  useEffect(() => {
    if (resetKey === undefined) return;
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setIsTyping(false);
  }, [resetKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle automated troubleshoot requests from the boot recovery system
  useEffect(() => {
    if (!troubleshootRequest) return;

    const hasAIAccess = settings.provider === 'local' || !!settings.apiKey;

    if (!hasAIAccess) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Heads up — the app didn't start automatically. Worth checking your package.json to make sure the start scripts are set up correctly. You can also connect an AI provider in Settings and I'll dig into it with you."
      }]);
      onTroubleshootHandled?.();
      return;
    }

    const { packageJson, terminalErrors } = troubleshootRequest;
    const prompt = `[Auto-Request] The app didn't start on its own — let's figure out why. Here's what I've got:\n\n**package.json:**\n\`\`\`json\n${packageJson || '(not available)'}\n\`\`\`\n\n**Terminal Output:**\n\`\`\`\n${terminalErrors || '(no output captured)'}\n\`\`\`\n\nWhat looks off, and what should we try first to get it running?`;
    handleSend(prompt, true);
    onTroubleshootHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [troubleshootRequest]);

  const handleSend = async (text: string, isPlanRequest = false) => {
    if (!text.trim() && !isPlanRequest) return;
    
    const userMsg = text.trim();
    const newMessages = [...messages];
    
    if (userMsg) {
      newMessages.push({ role: 'user', content: userMsg });
      setMessages(newMessages);
      setInput('');
    }

    setIsTyping(true);

    try {
      const context = await getProjectContext();
      const isPassiveMode = userMsg.length > 0 && userMsg.length <= SHORT_INPUT_THRESHOLD;
      const behaviorLayer = isPassiveMode
        ? 'Passive mode is active for this turn. Keep response to 2-4 concise sentences. Prefer acknowledgment + structure. Do not provide unsolicited implementation solutions.'
        : 'Standard mode: keep response focused, structured, and reasonably concise.';
      const dynamicSystemPrompt = `${SYSTEM_PROMPT}\n\n--- BEHAVIOR LAYER ---\n${behaviorLayer}\n\n--- CURRENT PROJECT CONTEXT ---\n${context}`;

      let reply = '';
      
      if (settings.provider === 'local') {
        // Ollama local fetch
        const response = await fetch(settings.localUrl || 'http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3', // default model for Ollama
            messages: [
              { role: 'system', content: dynamicSystemPrompt },
              ...newMessages
            ],
            stream: false
          })
        });
        const data = await response.json();
        reply = data.message?.content || 'No response from the local model — is it running?';
      } else {
        if (!settings.apiKey) {
          throw new Error('API key is missing — head to Settings to add one.');
        }

        // Cloud proxy
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: settings.provider,
            apiKey: settings.apiKey,
            messages: newMessages,
            systemPrompt: dynamicSystemPrompt
          })
        });
        
        if (!response.ok) {
          const text = await response.text();
          let errorMessage = `Server error: ${response.status}`;
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Not JSON, probably an HTML error page
            if (response.status === 413) {
              errorMessage = "The project context is a bit too large — try reducing the number of files.";
            } else {
              errorMessage = `Server error ${response.status}: ${text.substring(0, 100)}...`;
            }
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        reply = data.reply;
      }

      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGeneratePlan = () => {
    const planPrompt = "Based on everything we've talked through, can you put together a comprehensive implementation plan? Break it down into clear steps, any architecture changes needed, and the key components to build.";
    handleSend(planPrompt, true);
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-sm border-l border-white/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          AI Brainstorming
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Collapse chat"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white rounded-2xl rounded-br-sm shadow-lg shadow-indigo-500/20' 
                : 'bg-white/5 text-zinc-200 rounded-2xl rounded-bl-sm border border-white/10 backdrop-blur-md'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.role === 'assistant' && i === messages.length - 1 && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {ACTION_CHIPS.map(chip => (
                      <button
                        key={chip}
                        onClick={() => handleSend(chip)}
                        disabled={isTyping}
                        className="px-2.5 py-1 text-[11px] rounded-full border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-1"
                        title={`Ask AI to ${chip.toLowerCase()}`}
                      >
                        <Wand2 className="w-3 h-3" />
                        {chip}
                      </button>
                    ))}
                  </div>
                  {onRunDiagnosticCommand && getDiagnosticCommands(msg.content).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Suggested diagnostics</p>
                      <div className="flex flex-col gap-1.5">
                        {getDiagnosticCommands(msg.content).map(command => (
                          <button
                            key={command}
                            onClick={() => onRunDiagnosticCommand(command)}
                            className="text-left px-2.5 py-1.5 rounded-md bg-black/35 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors text-[11px] text-zinc-300 hover:text-emerald-200 flex items-center gap-2"
                            title="Run this command in terminal (confirmation required)"
                          >
                            <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                            <code className="truncate">{command}</code>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 text-zinc-400 rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex items-center gap-2 backdrop-blur-md">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-white/10 bg-white/5">
        <button 
          onClick={handleGeneratePlan}
          disabled={isTyping || messages.length <= 1}
          className="w-full mb-3 py-2.5 px-4 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/10 shadow-inner"
        >
          <Sparkles className="w-4 h-4" />
          Generate Implementation Plan
        </button>
        
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Share an idea..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all shadow-inner"
            rows={1}
            style={{ minHeight: '46px', maxHeight: '150px' }}
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 bottom-2 p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
