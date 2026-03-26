/**
 * aiClient.ts — Unified AI API client for both browser and Tauri desktop.
 *
 * In the browser, requests are proxied through the local Express server
 * (/api/models, /api/chat). In the Tauri desktop runtime, where no such
 * server exists, requests are made directly to the AI provider APIs so
 * that both versions behave identically.
 */

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'local';

export interface ModelOption {
  id: string;
  name: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 2026 Model Registry — matches the fallback list in server.ts
const FALLBACK_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o3', name: 'o3' },
    { id: 'o3-mini', name: 'o3 Mini' },
    { id: 'o4-mini', name: 'o4 Mini' },
  ],
  anthropic: [
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
  gemini: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-pro-exp', name: 'Gemini 2.0 Pro (Exp)' },
  ],
};

/** Returns true when the app is running inside the Tauri desktop runtime. */
export function isTauriRuntime(): boolean {
  const w = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return typeof w.__TAURI__ !== 'undefined' || typeof w.__TAURI_INTERNALS__ !== 'undefined';
}

// ─────────────────────────────────────────────────────────────────────────────
// Model fetching
// ─────────────────────────────────────────────────────────────────────────────

async function fetchModelsDirect(
  provider: Provider,
  apiKey: string,
  localUrl?: string
): Promise<{ models: ModelOption[]; fallback: boolean }> {
  if (provider === 'local') {
    const baseUrl = (localUrl || 'http://localhost:11434').replace(/\/+$/, '');
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Ollama responded with ${response.status}`);
      const data = await response.json() as { models?: { name: string; model: string }[] };
      const models = (data.models || [])
        .map((m) => ({ id: m.model || m.name, name: m.name }))
        .filter((m) => !/grok/i.test(`${m.id} ${m.name}`));
      return { models, fallback: false };
    } catch {
      return { models: [], fallback: true };
    }
  }

  const fallback = FALLBACK_MODELS[provider] ?? [];

  if (!apiKey) {
    return { models: fallback, fallback: true };
  }

  try {
    let models: ModelOption[] = [];

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      models = (data.data as any[])
        .filter(
          (m) =>
            /^(gpt-|o1|o3|o4)/.test(m.id) &&
            !m.id.includes('audio') &&
            !m.id.includes('realtime') &&
            !m.id.includes('instruct'),
        )
        .sort((a, b) => b.created - a.created)
        .map((m) => ({ id: m.id, name: m.id }));
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      const data = await response.json();
      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
      models = (data.data as any[]).map((m) => ({ id: m.id, name: m.display_name || m.id }));
    } else if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      models = (data.models as any[])
        .filter(
          (m) =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            !m.name.includes('embedding') &&
            !m.name.includes('aqa'),
        )
        .map((m) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
        }));
    }

    if (models.length === 0) {
      return { models: fallback, fallback: true };
    }

    return { models, fallback: false };
  } catch {
    return { models: fallback, fallback: true };
  }
}

async function fetchModelsViaProxy(
  provider: Provider,
  apiKey: string,
  localUrl?: string,
): Promise<{ models: ModelOption[]; fallback: boolean }> {
  const params = new URLSearchParams({ provider });
  if (apiKey) params.append('apiKey', apiKey);
  if (provider === 'local' && localUrl) params.append('localUrl', localUrl);
  const res = await fetch(`/api/models?${params}`);
  const data = await res.json();
  return { models: data.models || [], fallback: !!data.fallback };
}

export async function fetchModels(
  provider: Provider,
  apiKey: string,
  localUrl?: string,
): Promise<{ models: ModelOption[]; fallback: boolean }> {
  if (isTauriRuntime()) {
    return fetchModelsDirect(provider, apiKey, localUrl);
  }
  return fetchModelsViaProxy(provider, apiKey, localUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────────────────

async function sendChatDirect(
  provider: Provider,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content as string;
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text as string;
  }

  if (provider === 'gemini') {
    const formattedMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const geminiModel = model || 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: formattedMessages,
        }),
      },
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text as string;
  }

  throw new Error('Unknown provider');
}

async function sendChatViaProxy(
  provider: Provider,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, model, messages, systemPrompt }),
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorMessage;
    } catch {
      if (response.status === 413) {
        errorMessage = 'The project context is a bit too large — try reducing the number of files.';
      } else {
        errorMessage = `Server error ${response.status}: ${text.substring(0, 100)}...`;
      }
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.reply as string;
}

export async function sendChat(
  provider: Provider,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  if (isTauriRuntime()) {
    return sendChatDirect(provider, apiKey, model, messages, systemPrompt);
  }
  return sendChatViaProxy(provider, apiKey, model, messages, systemPrompt);
}
