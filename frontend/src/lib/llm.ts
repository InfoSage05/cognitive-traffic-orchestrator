/**
 * llm.ts — OpenRouter LLM client for the Cognitive Traffic Orchestrator
 *
 * Uses streaming SSE so the UI can display tokens as they arrive.
 * Uses streaming SSE so the UI can display tokens as they arrive.
 * Default model: openrouter/free  (auto-selects the best available free model)
 * Fallback (non-streaming): same model via a standard POST request.
 */

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
// openrouter/free is OpenRouter's built-in auto-router that always resolves to
// a currently-available free model — never 404s due to model deprecation.
const MODEL = "meta-llama/llama-3.3-70b-instruct:free";

function getKey(): string {
  // Priority: sessionStorage (set via SettingsPanel) → .env variable
  return (
    sessionStorage.getItem("cto_openrouter_key") ||
    import.meta.env.VITE_OPENROUTER_API_KEY ||
    ""
  );
}


export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Non-streaming completion — returns full text when done */
export async function complete(messages: Message[]): Promise<string> {
  const key = getKey();
  if (!key || key === "your-openrouter-key-here") {
    throw new Error("VITE_OPENROUTER_API_KEY is not set in .env");
  }

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://cognitive-traffic-orchestrator.local",
      "X-Title": "Cognitive Traffic Orchestrator",
    },
    body: JSON.stringify({ model: MODEL, messages, stream: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // Some models put reasoning in reasoning_content; prefer message content
  return (
    data.choices?.[0]?.message?.content ??
    data.choices?.[0]?.message?.reasoning_content ??
    ""
  );
}

/**
 * Streaming completion — calls `onChunk` for every token delta,
 * resolves with the full accumulated text when the stream closes.
 */
export async function stream(
  messages: Message[],
  onChunk: (delta: string, accumulated: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const key = getKey();
  if (!key || key === "your-openrouter-key-here") {
    throw new Error("VITE_OPENROUTER_API_KEY is not set in .env");
  }

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://cognitive-traffic-orchestrator.local",
      "X-Title": "Cognitive Traffic Orchestrator",
    },
    body: JSON.stringify({ model: MODEL, messages, stream: true }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;
      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta: string =
          json.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          accumulated += delta;
          onChunk(delta, accumulated);
        }
      } catch {
        // malformed chunk — skip
      }
    }
  }

  return accumulated;
}

// ─── Pre-built prompt helpers ─────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are the AI Planner/Guide for the Cognitive Traffic Orchestrator — Bengaluru's AI-powered traffic management system.

You analyse real-time edge events, multilingual imputation results, risk scores, LightGBM duration predictions, and RAG-based dispatch briefs.

You speak concisely, using bullet points where helpful, and focus on actionable insight for traffic operators. Never make up specific numbers you haven't been given. When provided data, quote it directly. Use Markdown for formatting.`;

export function buildBriefPrompt(events: unknown[], dispatches: unknown[]): Message[] {
  const eventSummary = events.length
    ? JSON.stringify(events.slice(0, 5), null, 2)
    : "No events have been triggered yet.";

  const dispatchSummary = dispatches.length
    ? JSON.stringify(dispatches.slice(0, 5), null, 2)
    : "No dispatches yet.";

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Generate a concise operational brief for the Bengaluru Traffic Operations Centre.

**Live Events (most recent first):**
\`\`\`json
${eventSummary}
\`\`\`

**Recent Dispatches:**
\`\`\`json
${dispatchSummary}
\`\`\`

Provide:
1. **Situation Summary** — what's happening right now across the corridors
2. **Top Risk** — the single highest-priority concern and why
3. **Recommended Actions** — 2-3 concrete next steps for operators
4. **Pipeline Health** — brief comment on whether the AI pipeline is functioning correctly

Keep it under 300 words.`,
    },
  ];
}

export function buildEventAnalysisPrompt(event: unknown): Message[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Analyse this processed traffic event and explain in plain English what happened, why the imputation resolved to this cause, and what operators should watch for:

\`\`\`json
${JSON.stringify(event, null, 2)}
\`\`\`

Keep it under 120 words. Use 2-3 bullet points.`,
    },
  ];
}

export function buildDispatchNarrativePrompt(
  recommendation: unknown,
  eventBundle: unknown,
): Message[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Write a professional field dispatch narrative for this traffic recommendation. It will be sent to field units via mobile push. Be direct and actionable.

**Recommendation:**
\`\`\`json
${JSON.stringify(recommendation, null, 2)}
\`\`\`

**Event context:**
\`\`\`json
${JSON.stringify(eventBundle, null, 2)}
\`\`\`

Keep it under 80 words. Start with the corridor name and immediate action.`,
    },
  ];
}

export function buildSearchPrompt(query: string, context: unknown): Message[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `The operator has searched for: "${query}"

Available system context:
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

Answer the operator's query based on the context. If the answer isn't in the context, say so clearly. Under 150 words.`,
    },
  ];
}
