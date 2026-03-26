import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, ChevronRight, PlayCircle, FileDown, Zap, PenLine, X, MessageSquare, ScanEye } from 'lucide-react';
import type { Settings } from './SettingsModal';
import { sendChat } from '../lib/aiClient';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: string[];
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
  /** Called when the user requests an artifact export; receives the current message history. */
  onExportArtifact?: (messages: Message[]) => void;
  /** Scratch Pad notes staged by the user to be prepended to the next message. */
  stagedNotes?: string;
  /** Called once staged notes have been consumed so the parent can clear them. */
  onClearStagedNotes?: () => void;
  /** Called when the user requests an AI review of the rendered preview.
   * Passing any non-null value enables the "Review App" button; the actual
   * review is initiated internally via handleReviewApp → handleSend. */
  onRequestAIReview?: () => void;
}

const SYSTEM_PROMPT = `You are an AI assistant helping a developer brainstorm and plan features for a web application they are previewing.
Prioritize explanation and clear structure over lengthy prose.
Avoid unsolicited solutions unless the user directly asks for implementation steps.
If the user input is short or fragmentary, default to passive mode: brief acknowledgment, one lightweight clarifying option, and no heavy solution dump.
Hold off on writing code for now; the goal is to help them think things through and capture their ideas.
When they're ready for a plan, put together a clear, comprehensive, step-by-step implementation guide based on everything discussed — covering architecture changes, required components, and logical sequencing.
When suggesting terminal diagnostics, format each command in its own fenced \`\`\`bash block.
When a short, common user response is likely (including yes/no confirmations, prioritization choices, or whether to run suggested terminal diagnostics), append machine-readable quick replies on a new line using this exact format: <quickReplies>["Yes","No"]</quickReplies>.
Only include 2-4 short reply options and keep each option under 5 words.`;

const INITIAL_MESSAGE: Message = { role: 'assistant', content: "What do you see in the app?" };

const SHORT_INPUT_THRESHOLD = 40;
const QUICK_REPLIES_TAG_REGEX = /<quickReplies>\s*(\[[\s\S]*?\])\s*<\/quickReplies>/i;

/** Returns true when the last non-empty line of an AI message ends with "?". */
const endsWithQuestion = (content: string): boolean => {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.length > 0 && lines[lines.length - 1].endsWith('?');
};

const containsDiagnosticCommands = (content: string): boolean => {
  const blockRegex = /```(?:bash|sh|zsh)?\n([\s\S]*?)```/gi;
  return blockRegex.test(content);
};

const parseAssistantReply = (rawReply: string): { visibleContent: string; quickReplies: string[] } => {
  const quickRepliesMatch = rawReply.match(QUICK_REPLIES_TAG_REGEX);
  const visibleContent = rawReply.replace(QUICK_REPLIES_TAG_REGEX, '').trim();

  if (!quickRepliesMatch) return { visibleContent, quickReplies: [] };

  try {
    const parsed = JSON.parse(quickRepliesMatch[1]);
    const quickReplies = Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string')
          .map(item => item.trim())
          .filter(Boolean)
          .slice(0, 4)
      : [];

    return {
      visibleContent,
      quickReplies: (endsWithQuestion(visibleContent) || containsDiagnosticCommands(visibleContent)) ? quickReplies : []
    };
  } catch {
    return { visibleContent, quickReplies: [] };
  }
};

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

export function ChatPanel({ settings, getProjectContext, troubleshootRequest, onTroubleshootHandled, resetKey, onCollapse, onRunDiagnosticCommand, onExportArtifact, stagedNotes, onClearStagedNotes, onRequestAIReview }: Props) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conciseMode, setConciseMode] = useState<boolean>(() =>
    sessionStorage.getItem('chat_conciseMode') === 'true'
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist concise mode preference
  useEffect(() => {
    sessionStorage.setItem('chat_conciseMode', String(conciseMode));
  }, [conciseMode]);

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
    
    const rawInput = text.trim();

    // Prepend staged Scratch Pad notes if present
    const userMsg = stagedNotes && rawInput
      ? `[Staged notes from Scratch Pad]:\n${stagedNotes}\n\n---\n\n${rawInput}`
      : stagedNotes && !rawInput
        ? `[Staged notes from Scratch Pad]:\n${stagedNotes}`
        : rawInput;

    // Clear staged notes now that they've been consumed
    if (stagedNotes) onClearStagedNotes?.();

    const newMessages = [...messages];
    
    if (userMsg) {
      newMessages.push({ role: 'user', content: userMsg });
      setMessages(newMessages);
      setInput('');
    }

    setIsTyping(true);

    try {
      const context = await getProjectContext();
      // Passive mode is intentionally based on rawInput (the user's typed text),
      // not the full combined message, so that staging long scratch pad notes
      // does not suppress the passive behavior for a short user input.
      const isPassiveMode = rawInput.length > 0 && rawInput.length <= SHORT_INPUT_THRESHOLD;
      const behaviorLayer = isPassiveMode
        ? 'Passive mode is active for this turn. Keep response to 2-4 concise sentences. Prefer acknowledgment + structure. Do not provide unsolicited implementation solutions.'
        : 'Standard mode: keep response focused, structured, and reasonably concise.';
      const conciseModeLayer = conciseMode
        ? '\nConcise mode is active. Respond only in bullet points. Maximum 5 items. Omit all preamble and closing remarks.'
        : '';
      const customInstructionsLayer = settings.customInstructions?.trim()
        ? `\n\n--- CUSTOM INSTRUCTIONS ---\n${settings.customInstructions.trim()}`
        : '';
      const dynamicSystemPrompt = `${SYSTEM_PROMPT}\n\n--- BEHAVIOR LAYER ---\n${behaviorLayer}${conciseModeLayer}${customInstructionsLayer}\n\n--- CURRENT PROJECT CONTEXT ---\n${context}`;

      let reply = '';
      
      if (settings.provider === 'local') {
        // Ollama local fetch
        const response = await fetch(settings.localUrl || 'http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: settings.model || 'llama3',
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
        // Cloud providers — direct in Tauri, proxied in browser
        if (!settings.apiKey) {
          throw new Error('API key is missing — head to Settings to add one.');
        }

        reply = await sendChat(
          settings.provider,
          settings.apiKey,
          settings.model,
          newMessages,
          dynamicSystemPrompt,
        );
      }

      const parsedReply = parseAssistantReply(reply);
      setMessages([...newMessages, { role: 'assistant', content: parsedReply.visibleContent, quickReplies: parsedReply.quickReplies }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReviewApp = () => {
    const reviewPrompt = `[AI App Review Request] Please perform a structured review of the currently rendered app based on the project context. Analyze and provide specific, actionable notes on:
1. **Accessibility (A11y)**: Missing ARIA labels, low contrast text, non-semantic HTML, missing alt attributes, keyboard navigation issues.
2. **UI/UX Critique**: Layout issues, inconsistent spacing, confusing user flows, missing loading/error states.
3. **Color Contrast**: Identify any text or UI elements that likely fail WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
Format your response with clear headings for each category and bullet points for each finding. If no issues are found in a category, state that explicitly.`;
    handleSend(reviewPrompt, true);
  };

  return (
    <div className="flex flex-col h-full bg-black/45 backdrop-blur-xl border-l border-white/8">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/4">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          AI Brainstorming
        </div>
        <div className="flex items-center gap-1">
          {/* Concise Mode Toggle */}
          <button
            onClick={() => setConciseMode(m => !m)}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 text-[10px] font-medium ${conciseMode ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}
            title={conciseMode ? 'Concise mode on — bullet-point responses' : 'Enable concise mode — force bulleted summaries'}
          >
            <Zap className="w-3 h-3" />
            {conciseMode && <span>Concise</span>}
          </button>
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
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 text-sm shadow-sm ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-2xl rounded-br-sm shadow-lg shadow-indigo-500/25 ring-1 ring-white/10'
                : 'bg-white/4 text-zinc-200 rounded-2xl rounded-bl-sm border border-white/8 backdrop-blur-lg shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.role === 'assistant' && i === messages.length - 1 && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  {/* Suggested responses */}
                  <div className="flex flex-wrap gap-1.5">
                    {(msg.quickReplies || []).map(resp => (
                      <button
                        key={resp}
                        onClick={() => handleSend(resp)}
                        disabled={isTyping}
                        className="px-2.5 py-1 text-[11px] rounded-full border border-indigo-500/25 bg-indigo-500/8 text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                        title={`Reply: ${resp}`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        {resp}
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

      <div className="p-3 border-t border-white/8 bg-white/3">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {onExportArtifact && (
            <button
              onClick={() => onExportArtifact(messages)}
              disabled={messages.length <= 1}
              className="py-1.5 px-2 bg-white/4 hover:bg-white/8 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-white/8 text-left"
              title="Create an artifact (plan, structured list, summary) in multiple file formats"
            >
              <FileDown className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-tight">
                <span className="block">Create Artifact</span>
                <span className="block text-[10px] text-zinc-500">Plan/List/Summary · MD/PDF/TXT</span>
              </span>
            </button>
          )}

          {onRequestAIReview && (
            <button
              onClick={handleReviewApp}
              disabled={isTyping || messages.length <= 1}
              className="py-1.5 px-2 bg-violet-500/8 hover:bg-violet-500/15 disabled:opacity-50 disabled:cursor-not-allowed text-violet-300 hover:text-violet-100 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-violet-500/20"
            >
              <ScanEye className="w-3.5 h-3.5" />
              Review App
            </button>
          )}
        </div>

        {/* Staged notes indicator */}
        {stagedNotes && (
          <div className="mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 min-w-0">
              <PenLine className="w-3 h-3 shrink-0" />
              <span className="truncate">Scratch Pad notes staged — prepended to next message</span>
            </div>
            <button
              onClick={onClearStagedNotes}
              className="p-0.5 text-amber-600 hover:text-amber-300 transition-colors shrink-0"
              title="Discard staged notes"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
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
            className="w-full bg-black/50 border border-white/8 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 resize-none transition-all shadow-inner backdrop-blur-sm"
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
