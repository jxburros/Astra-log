import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'local';

export interface Settings {
  provider: Provider;
  apiKey: string;
  localUrl: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (s: Settings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: Props) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-black/70 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-[0_0_80px_rgba(0,0,0,0.6),0_0_40px_rgba(99,102,241,0.08)] animate-panel-in-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white tracking-wide">AI Settings</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">AI Provider</label>
            <select 
              value={localSettings.provider}
              onChange={e => setLocalSettings({...localSettings, provider: e.target.value as Provider})}
              className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="local">Local/Network (Ollama)</option>
            </select>
          </div>

          {localSettings.provider !== 'local' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">API Key</label>
              <input 
                type="password"
                value={localSettings.apiKey}
                onChange={e => setLocalSettings({...localSettings, apiKey: e.target.value})}
                placeholder={`Enter ${localSettings.provider === 'gemini' ? 'Gemini' : localSettings.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key`}
                className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Your key is stored locally in your browser and sent securely to the backend proxy.
              </p>
            </div>
          )}

          {localSettings.provider === 'local' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Local Model URL</label>
              <input 
                type="text"
                value={localSettings.localUrl}
                onChange={e => setLocalSettings({...localSettings, localUrl: e.target.value})}
                placeholder="http://localhost:11434/api/chat"
                className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Make sure your local model (like Ollama) allows CORS from this origin.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors font-medium">
            Cancel
          </button>
          <button 
            onClick={() => { onSave(localSettings); onClose(); }}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-500/20"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
