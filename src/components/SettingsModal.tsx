import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'local';

export interface Settings {
  provider: Provider;
  apiKey: string;
  localUrl: string;
  model: string;
  customInstructions?: string;
}

interface ModelOption {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (s: Settings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: Props) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsFallback, setModelsFallback] = useState(false);
  const [showGrokWarning, setShowGrokWarning] = useState(false);
  const [grokDetectedInInputs, setGrokDetectedInInputs] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
    setShowGrokWarning(false);
    setGrokDetectedInInputs(false);
  }, [settings]);

  const hasGrok = (value: string) => /grok/i.test(value);

  const updateGrokDetection = (nextSettings: Settings) => {
    setGrokDetectedInInputs(hasGrok(nextSettings.localUrl || '') || hasGrok(nextSettings.model || ''));
  };

  // Fetch models whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      doFetchModels(localSettings.provider, localSettings.apiKey, localSettings.model, localSettings.localUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function doFetchModels(provider: Provider, apiKey: string, currentModel: string, localUrl?: string) {
    setModelsLoading(true);
    setModelsFallback(false);
    try {
      const params = new URLSearchParams({ provider });
      if (apiKey) params.append('apiKey', apiKey);
      if (provider === 'local' && localUrl) params.append('localUrl', localUrl);
      const res = await fetch(`/api/models?${params}`);
      const data = await res.json();
      const fetched: ModelOption[] = data.models || [];
      setModels(fetched);
      setModelsFallback(!!data.fallback);
      if (fetched.length > 0 && !fetched.find(m => m.id === currentModel)) {
        setLocalSettings(prev => ({ ...prev, model: fetched[0].id }));
      }
    } catch {
      setModelsFallback(true);
    } finally {
      setModelsLoading(false);
    }
  }

  function handleProviderChange(provider: Provider) {
    const nextSettings = { ...localSettings, provider, model: '' };
    setLocalSettings(nextSettings);
    updateGrokDetection(nextSettings);
    setModels([]);
    doFetchModels(provider, localSettings.apiKey, '', localSettings.localUrl);
  }

  function handleApiKeyChange(apiKey: string) {
    const provider = localSettings.provider;
    const currentModel = localSettings.model;
    const nextSettings = { ...localSettings, apiKey };
    setLocalSettings(nextSettings);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (provider !== 'local') {
      debounceRef.current = setTimeout(() => {
        doFetchModels(provider, apiKey, currentModel, localSettings.localUrl);
      }, 700);
    }
  }

  function handleLocalUrlChange(localUrl: string) {
    const nextSettings = { ...localSettings, localUrl };
    setLocalSettings(nextSettings);
    updateGrokDetection(nextSettings);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doFetchModels('local', '', localSettings.model, localUrl);
    }, 700);
  }

  function handleSaveAttempt() {
    if (grokDetectedInInputs || hasGrok(localSettings.localUrl || '') || hasGrok(localSettings.model || '')) {
      setShowGrokWarning(true);
      return;
    }
    onSave(localSettings);
    onClose();
  }

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
              onChange={e => handleProviderChange(e.target.value as Provider)}
              className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="local">Local/Network (Ollama)</option>
            </select>
            <p className="mt-1.5 text-[10px] text-zinc-600">The use of Grok on this platform is prohibited.</p>
          </div>

          {localSettings.provider !== 'local' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">API Key</label>
              <input
                type="password"
                value={localSettings.apiKey}
                onChange={e => handleApiKeyChange(e.target.value)}
                placeholder={`Enter ${localSettings.provider === 'gemini' ? 'Gemini' : localSettings.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key`}
                className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Your key is stored locally in your browser and sent securely to the backend proxy.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-zinc-400">Model</label>
              <button
                onClick={() => doFetchModels(localSettings.provider, localSettings.apiKey, localSettings.model, localSettings.localUrl)}
                disabled={modelsLoading}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                title="Refresh model list"
              >
                <RefreshCw className={`w-3 h-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                {modelsLoading ? 'Fetching…' : 'Refresh'}
              </button>
            </div>
            <select
              value={localSettings.model}
              onChange={e => {
                const nextSettings = { ...localSettings, model: e.target.value };
                setLocalSettings(nextSettings);
                updateGrokDetection(nextSettings);
              }}
              disabled={modelsLoading || models.length === 0}
              className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all disabled:opacity-50"
            >
              {models.length === 0 ? (
                <option value="">{modelsLoading ? 'Loading models…' : localSettings.provider === 'local' ? 'Enter Ollama URL above to discover models' : 'Enter API key to load models'}</option>
              ) : (
                models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))
              )}
            </select>
            {modelsFallback && !modelsLoading && localSettings.provider !== 'local' && (
              <p className="text-xs text-zinc-600 mt-1.5">
                Showing default models. Add a valid API key to fetch the live list.
              </p>
            )}
            {modelsFallback && !modelsLoading && localSettings.provider === 'local' && (
              <p className="text-xs text-zinc-600 mt-1.5">
                Ollama not reachable. Make sure it's running and the URL is correct.
              </p>
            )}
            <div className="mt-2">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Custom Model ID</label>
              <input
                type="text"
                value={localSettings.model}
                onChange={e => {
                  const nextSettings = { ...localSettings, model: e.target.value };
                  setLocalSettings(nextSettings);
                  updateGrokDetection(nextSettings);
                }}
                placeholder="Enter custom model ID"
                className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
            </div>
          </div>

          {localSettings.provider === 'local' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Ollama Base URL</label>
              <input
                type="text"
                value={localSettings.localUrl}
                onChange={e => handleLocalUrlChange(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Models are fetched live from Ollama's <code className="text-zinc-400">/api/tags</code> endpoint. Make sure Ollama allows CORS from this origin.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Custom Instructions <span className="text-zinc-600 font-normal">(optional)</span></label>
            <textarea
              value={localSettings.customInstructions || ''}
              onChange={e => setLocalSettings(prev => ({ ...prev, customInstructions: e.target.value }))}
              placeholder="Override or extend the default consultant persona. E.g. &quot;Focus on accessibility and WCAG compliance in all responses.&quot;"
              rows={3}
              className="w-full bg-black/60 border border-white/8 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/25 transition-all resize-none text-sm"
            />
            <p className="text-xs text-zinc-500 mt-2">
              These instructions are appended to the AI's system prompt every session.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors font-medium">
            Cancel
          </button>
          <button
            onClick={handleSaveAttempt}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-500/20"
          >
            Save Settings
          </button>
        </div>
      </div>

      {showGrokWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
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
    </div>
  );
}
