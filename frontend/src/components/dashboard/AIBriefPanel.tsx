/**
 * AIBriefPanel.tsx
 *
 * A full-featured AI Planner/Guide drawer powered by OpenRouter.
 * Opens via the "AI Brief" button in the TopBar.
 * Features:
 *  - Live streaming operational brief
 *  - Tab-based navigation: Brief | Chat | Analyse Event
 *  - Real-time token display as they stream in
 *  - Markdown rendering (light, no external dep needed)
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Loader2,
  Bot,
  Send,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  stream,
  complete,
  buildBriefPrompt,
  buildSearchPrompt,
  buildEventAnalysisPrompt,
  type Message,
  SYSTEM_PROMPT,
} from "@/lib/llm";

// ─── Tiny inline markdown renderer ─────────────────────────────────────────
function renderMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="ai-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="ai-h1">$1</h1>')
    .replace(/^[-*] (.+)$/gm, '<li class="ai-li">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul class="ai-ul">${m}</ul>`)
    .replace(/\n\n/g, '</p><p class="ai-p">')
    .replace(/^(?!<[hul])(.+)$/gm, '<p class="ai-p">$1</p>')
    .replace(/<p class="ai-p"><\/p>/g, "");
}

type Tab = "brief" | "chat" | "analyse";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AIBriefPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("brief");

  // ─ Brief tab state ─
  const [briefText, setBriefText] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState("");
  const briefAbort = useRef<AbortController | null>(null);

  // ─ Chat tab state ─
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatHistory = useRef<Message[]>([]);

  // ─ Analyse tab state ─
  const [analyseText, setAnalyseText] = useState("");
  const [analyseLoading, setAnalyseLoading] = useState(false);
  const [analyseError, setAnalyseError] = useState("");

  // Fetch brief when panel opens or tab switches to brief
  useEffect(() => {
    if (open && tab === "brief" && !briefText) fetchBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  // Auto-analyse when switching to analyse tab
  useEffect(() => {
    if (open && tab === "analyse" && !analyseText) fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  async function fetchBrief() {
    briefAbort.current?.abort();
    briefAbort.current = new AbortController();
    setBriefText("");
    setBriefError("");
    setBriefLoading(true);

    try {
      const [events, dispatches] = await Promise.all([
        api.recentEvents(5).catch(() => []),
        api.recentDispatches(5).catch(() => []),
      ]);
      const msgs = buildBriefPrompt(events, dispatches);
      await stream(
        msgs,
        (_, acc) => setBriefText(acc),
        briefAbort.current.signal,
      );
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        setBriefError((e as Error).message ?? "LLM call failed");
      }
    } finally {
      setBriefLoading(false);
    }
  }

  async function fetchAnalysis() {
    setAnalyseText("");
    setAnalyseError("");
    setAnalyseLoading(true);
    try {
      const events = await api.recentEvents(1).catch(() => []);
      if (!events.length) {
        setAnalyseText(
          "No live events yet. Trigger a mock event from the Event Feed tab first.",
        );
        return;
      }
      const msgs = buildEventAnalysisPrompt(events[0]);
      const result = await complete(msgs);
      setAnalyseText(result);
    } catch (e: unknown) {
      setAnalyseError((e as Error).message ?? "LLM call failed");
    } finally {
      setAnalyseLoading(false);
    }
  }

  async function sendChat() {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput("");

    const userMsg: ChatMsg = { role: "user", content: q };
    const assistantMsg: ChatMsg = {
      role: "assistant",
      content: "",
      streaming: true,
    };

    setChatMsgs((prev) => [...prev, userMsg, assistantMsg]);
    setChatLoading(true);

    // Build history for context
    const [events, dispatches] = await Promise.all([
      api.recentEvents(3).catch(() => []),
      api.recentDispatches(3).catch(() => []),
    ]);
    const context = { events, dispatches };

    // Build message thread
    chatHistory.current = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory.current.slice(-8), // keep last 4 turns
      ...buildSearchPrompt(q, context).slice(1),
    ];

    try {
      let full = "";
      await stream(chatHistory.current, (_, acc) => {
        full = acc;
        setChatMsgs((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: acc,
            streaming: true,
          };
          return updated;
        });
      });
      // Mark done
      chatHistory.current.push({ role: "assistant", content: full });
      setChatMsgs((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: full,
          streaming: false,
        };
        return updated;
      });
    } catch (e: unknown) {
      setChatMsgs((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Error: ${(e as Error).message}`,
          streaming: false,
        };
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "brief", label: "Live Brief", icon: Sparkles },
    { id: "chat", label: "Ask AI", icon: MessageSquare },
    { id: "analyse", label: "Event Analysis", icon: BarChart3 },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[520px] flex flex-col"
            style={{
              background:
                "oklch(0.16 0.03 270 / 0.97)",
              backdropFilter: "blur(24px)",
              borderLeft: "1px solid oklch(1 0 0 / 0.08)",
              boxShadow: "-16px 0 60px oklch(0.66 0.24 295 / 0.2)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center glow"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">AI Planner / Guide</div>
                  <div className="text-[11px] text-muted-foreground">
                    Powered by OpenRouter Free · AI Guide
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="glass p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 px-4 py-2 border-b border-white/[0.06]">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tab === id
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={
                    tab === id
                      ? { background: "var(--gradient-primary)" }
                      : {}
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <AnimatePresence mode="wait">
                {tab === "brief" && (
                  <motion.div
                    key="brief"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 overflow-y-auto p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Operational brief · updated just now
                      </div>
                      <button
                        onClick={fetchBrief}
                        disabled={briefLoading}
                        className="flex items-center gap-1.5 text-xs text-accent hover:text-foreground transition-colors"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${briefLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </button>
                    </div>

                    {briefLoading && !briefText && (
                      <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Generating brief…</span>
                      </div>
                    )}

                    {briefError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-medium">LLM Error</div>
                          <div className="text-xs mt-0.5 opacity-80">
                            {briefError}
                          </div>
                          <div className="text-xs mt-1 opacity-60">
                            Make sure VITE_OPENROUTER_API_KEY is set in
                            frontend/.env
                          </div>
                        </div>
                      </div>
                    )}

                    {briefText && (
                      <div
                        className="ai-prose text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: renderMd(briefText),
                        }}
                      />
                    )}

                    {briefLoading && briefText && (
                      <span className="inline-block w-2 h-4 bg-accent animate-pulse rounded" />
                    )}
                  </motion.div>
                )}

                {tab === "chat" && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {!chatMsgs.length && (
                        <div className="text-center py-10 text-muted-foreground">
                          <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">
                            Ask anything about the pipeline, corridors, or
                            current events.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {[
                              "What's the highest-risk corridor right now?",
                              "Explain the LightGBM model output",
                              "What does Loop 3 do?",
                              "Summarise recent dispatches",
                            ].map((q) => (
                              <button
                                key={q}
                                onClick={() => {
                                  setChatInput(q);
                                }}
                                className="glass text-xs px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-white/10 transition-colors"
                              >
                                <ChevronRight className="w-3 h-3" />
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMsgs.map((m, i) => (
                        <div
                          key={i}
                          className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                          {m.role === "assistant" && (
                            <div
                              className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white"
                              style={{ background: "var(--gradient-primary)" }}
                            >
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                              m.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "glass rounded-tl-sm"
                            }`}
                          >
                            {m.role === "assistant" ? (
                              <>
                                <div
                                  className="ai-prose"
                                  dangerouslySetInnerHTML={{
                                    __html: renderMd(m.content),
                                  }}
                                />
                                {m.streaming && (
                                  <span className="inline-block w-1.5 h-3.5 bg-accent animate-pulse rounded ml-0.5" />
                                )}
                              </>
                            ) : (
                              m.content
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                        <input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendChat();
                            }
                          }}
                          placeholder="Ask about corridors, events, models…"
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={sendChat}
                          disabled={chatLoading || !chatInput.trim()}
                          className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                          style={{ background: "var(--gradient-primary)" }}
                        >
                          {chatLoading ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {tab === "analyse" && (
                  <motion.div
                    key="analyse"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 overflow-y-auto p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        AI interpretation of the latest event
                      </div>
                      <button
                        onClick={fetchAnalysis}
                        disabled={analyseLoading}
                        className="flex items-center gap-1.5 text-xs text-accent hover:text-foreground transition-colors"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${analyseLoading ? "animate-spin" : ""}`}
                        />
                        Re-analyse
                      </button>
                    </div>

                    {analyseLoading && (
                      <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Analysing event…</span>
                      </div>
                    )}

                    {analyseError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-medium">Analysis Error</div>
                          <div className="text-xs mt-0.5 opacity-80">
                            {analyseError}
                          </div>
                        </div>
                      </div>
                    )}

                    {analyseText && !analyseLoading && (
                      <>
                        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                          <div className="text-xs font-medium text-accent mb-2">
                            AI Event Interpretation
                          </div>
                          <div
                            className="ai-prose text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: renderMd(analyseText),
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Trigger a new event from the Event Feed tab to
                          re-analyse fresh data.
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06] text-[10px] text-muted-foreground/60 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              OpenRouter Free (auto-selected) · responses may take a few seconds
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
