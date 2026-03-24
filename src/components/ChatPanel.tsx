import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Bot } from 'lucide-react';
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
}

const SYSTEM_PROMPT = `You are an AI assistant helping a developer brainstorm and plan features for a web application they are previewing. 
The user will share ideas, long or short. 
Acknowledge their ideas briefly and encouragingly. 
Ask clarifying questions ONLY if absolutely necessary to understand their intent. 
Do NOT write code yet. Your goal is to help them gather thoughts without disrupting their flow.
When they ask for an implementation plan, provide a comprehensive, step-by-step guide based on all the ideas discussed. Organize it into logical steps, architecture changes, and required components.`;

const INITIAL_MESSAGE: Message = { role: 'assistant', content: 'Hello! I am here to help you brainstorm ideas for your app. Share your thoughts, and when you are ready, we can generate a full implementation plan.' };

export function ChatPanel({ settings, getProjectContext, troubleshootRequest, onTroubleshootHandled, resetKey }: Props) {
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
        content: "We could not start the app automatically. Please check your package.json or connect an AI provider in Settings for troubleshooting assistance."
      }]);
      onTroubleshootHandled?.();
      return;
    }

    const { packageJson, terminalErrors } = troubleshootRequest;
    const prompt = `[System Request] The application failed to start automatically. Please analyze the following and suggest a fix:\n\n**package.json:**\n\`\`\`json\n${packageJson || '(not available)'}\n\`\`\`\n\n**Terminal Error Output:**\n\`\`\`\n${terminalErrors || '(no output captured)'}\n\`\`\`\n\nPlease identify the issue and provide specific commands or configuration changes to resolve the startup problem.`;
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
      const dynamicSystemPrompt = `${SYSTEM_PROMPT}\n\n--- CURRENT PROJECT CONTEXT ---\n${context}`;

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
        reply = data.message?.content || 'Error: No response from local model.';
      } else {
        if (!settings.apiKey) {
          throw new Error('API Key is missing. Please add it in Settings.');
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
              errorMessage = "Project context is too large. Please reduce the number of files.";
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
    const planPrompt = "Based on all the ideas we've discussed above, please generate a comprehensive implementation plan. Organize it into logical steps, architecture changes, and required components.";
    handleSend(planPrompt, true);
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-sm border-l border-white/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          AI Brainstorming
        </div>
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
