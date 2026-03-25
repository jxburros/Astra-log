import express from "express";
import net from "net";
import path from "path";

const FALLBACK_MODELS: Record<string, { id: string; name: string }[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'o1', name: 'o1' },
    { id: 'o1-mini', name: 'o1 Mini' },
    { id: 'o3-mini', name: 'o3 Mini' },
  ],
  anthropic: [
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
};

function findAvailablePort(preferred: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(preferred, "0.0.0.0", () => {
      const addr = server.address() as net.AddressInfo;
      server.close(() => resolve(addr.port));
    });
    server.on("error", () => {
      // preferred port is busy — ask the OS for any available port
      const fallback = net.createServer();
      fallback.listen(0, "0.0.0.0", () => {
        const addr = fallback.address() as net.AddressInfo;
        fallback.close(() => resolve(addr.port));
      });
      fallback.on("error", (err) => {
        console.error("Failed to bind to any available port:", err);
        process.exit(1);
      });
    });
  });
}

async function startServer() {
  const app = express();
  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const PORT = await findAvailablePort(preferredPort);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Set headers for SharedArrayBuffer (required for WebContainers)
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/models", async (req, res) => {
    const { provider, apiKey } = req.query as { provider: string; apiKey?: string };

    if (!provider || !FALLBACK_MODELS[provider]) {
      return res.status(400).json({ error: "Invalid provider" });
    }

    if (!apiKey) {
      return res.json({ models: FALLBACK_MODELS[provider], fallback: true });
    }

    try {
      let models: { id: string; name: string }[] = [];

      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        models = (data.data as any[])
          .filter(m => /^(gpt-|o1|o3|o4)/.test(m.id) && !m.id.includes('audio') && !m.id.includes('realtime') && !m.id.includes('instruct'))
          .sort((a, b) => b.created - a.created)
          .map(m => ({ id: m.id, name: m.id }));
      } else if (provider === "anthropic") {
        const response = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          }
        });
        const data = await response.json();
        if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
        models = (data.data as any[]).map(m => ({ id: m.id, name: m.display_name || m.id }));
      } else if (provider === "gemini") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        models = (data.models as any[])
          .filter(m => m.supportedGenerationMethods?.includes('generateContent') && !m.name.includes('embedding') && !m.name.includes('aqa'))
          .map(m => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', '')
          }));
      }

      if (models.length === 0) {
        return res.json({ models: FALLBACK_MODELS[provider], fallback: true });
      }

      res.json({ models, fallback: false });
    } catch (error: any) {
      console.error("Models fetch error:", error.message);
      res.json({ models: FALLBACK_MODELS[provider], fallback: true });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { provider, apiKey, model, messages, systemPrompt } = req.body;
      
      if (!apiKey && provider !== 'local') {
        return res.status(400).json({ error: "API key is required" });
      }

      let reply = "";

      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages
            ]
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        reply = data.choices[0].message.content;
      } else if (provider === "anthropic") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: model || "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            system: systemPrompt,
            messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        reply = data.content[0].text;
      } else if (provider === "gemini") {
        const formattedMessages = messages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));
        
        const geminiModel = model || "gemini-2.5-flash";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: formattedMessages
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        reply = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Unknown provider");
      }

      res.json({ reply });
    } catch (error: any) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
