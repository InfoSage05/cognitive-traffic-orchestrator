/**
 * SettingsPanel.tsx
 *
 * Workspace configuration panel. Lets operators:
 *  - View / update the OpenRouter API key (stored in sessionStorage for the runtime)
 *  - See the backend API base URL
 *  - Check LLM model info
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, Server, Bot, Eye, EyeOff, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

const STORAGE_KEY = "cto_openrouter_key";

export function SettingsPanel() {
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from sessionStorage first, fall back to env hint
    const stored = sessionStorage.getItem(STORAGE_KEY) ?? "";
    setApiKey(stored);
  }, []);

  function saveKey() {
    sessionStorage.setItem(STORAGE_KEY, apiKey.trim());
    // Also inject into the module env so the llm.ts client picks it up at runtime
    // (This is a development convenience — in production, use the .env file)
    (window as Record<string, unknown>).__OPENROUTER_KEY__ = apiKey.trim();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
  const envKey = import.meta.env.VITE_OPENROUTER_API_KEY ?? "";
  const effectiveKey = apiKey || envKey;
  const keyOk = Boolean(effectiveKey && effectiveKey !== "your-openrouter-key-here");

  const cards = [
    {
      icon: Server,
      title: "FastAPI Backend",
      color: "oklch(0.7 0.2 195)",
      rows: [
        { label: "Base URL", value: apiBase },
        { label: "Health check", value: `${apiBase}/api/health` },
        { label: "Docs", value: `${apiBase}/docs`, link: `${apiBase}/docs` },
      ],
    },
    {
      icon: Bot,
      title: "LLM Planner / Guide",
      color: "oklch(0.66 0.24 295)",
      rows: [
        { label: "Provider", value: "OpenRouter" },
        { label: "Model", value: "meta-llama/llama-3.3-70b-instruct:free" },
        { label: "Pricing", value: "Free tier (no cost)", link: "https://openrouter.ai/models" },
        { label: "Status", value: keyOk ? "API key configured ✓" : "API key missing ✗" },
      ],
    },
  ];

  return (
    <div className="p-3 px-5 pb-6 space-y-4">
      {/* API Key configurator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl grid place-items-center text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">OpenRouter API Key</div>
            <div className="text-xs text-muted-foreground">
              Required for the AI Planner / Guide Agent
            </div>
          </div>
          <div className="ml-auto">
            {keyOk ? (
              <span className="flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Configured
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="w-3.5 h-3.5" />
                Not set
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center glass rounded-xl px-3 py-2 gap-2">
            <input
              type={show ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={envKey && envKey !== "your-openrouter-key-here" ? "Using key from .env file" : "sk-or-v1-…"}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-mono"
            />
            <button
              onClick={() => setShow((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={saveKey}
            disabled={!apiKey.trim()}
            className="px-4 py-2 rounded-xl text-sm font-medium text-primary-foreground glow transition-all disabled:opacity-40"
            style={{ background: "var(--gradient-primary)" }}
          >
            {saved ? "Saved ✓" : "Save"}
          </button>
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground">
          Get a free key at{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-foreground transition-colors"
          >
            openrouter.ai/keys
          </a>
          {" "}— or set <code className="text-[10px] bg-secondary/50 px-1 py-0.5 rounded">VITE_OPENROUTER_API_KEY</code> in{" "}
          <code className="text-[10px] bg-secondary/50 px-1 py-0.5 rounded">frontend/.env</code>.
          The key is only stored in your browser session.
        </div>
      </motion.div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-xl grid place-items-center text-white"
                  style={{ background: c.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-semibold">{c.title}</div>
              </div>
              <div className="space-y-2">
                {c.rows.map((r) => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{r.label}</span>
                    {r.link ? (
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent flex items-center gap-1 hover:underline"
                      >
                        {r.value}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span
                        className={`font-medium ${
                          r.value.includes("✓")
                            ? "text-success"
                            : r.value.includes("✗")
                            ? "text-warning"
                            : "text-foreground"
                        }`}
                      >
                        {r.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Loop summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-5"
      >
        <div className="text-sm font-semibold mb-3">Loop Engineering Architecture</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { loop: "Loop 1", desc: "Core Agents (Imputation + Spatial)", color: "oklch(0.66 0.24 295)" },
            { loop: "Loop 2", desc: "Verification Grader (validate_brief)", color: "oklch(0.7 0.2 195)" },
            { loop: "Loop 3", desc: "Event-Driven Edge Trigger (OpenVINO)", color: "oklch(0.75 0.2 155)" },
            { loop: "Loop 4", desc: "Hill-Climbing (Operator Feedback)", color: "oklch(0.82 0.18 85)" },
          ].map((l) => (
            <div key={l.loop} className="rounded-xl p-3 bg-secondary/30 border border-border">
              <div
                className="text-xs font-bold mb-1"
                style={{ color: l.color }}
              >
                {l.loop}
              </div>
              <div className="text-[11px] text-muted-foreground">{l.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
