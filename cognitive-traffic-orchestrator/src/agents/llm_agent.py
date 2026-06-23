"""
llm_agent.py — LLM Planner/Guide Agent using OpenRouter

Exposes:
  POST /api/ai/brief      — Generates an operational brief from live events/dispatches
  POST /api/ai/analyse    — Analyses a specific event and returns a narrative
  POST /api/ai/chat       — Single-turn contextual Q&A
  GET  /api/ai/stream     — SSE streaming endpoint for the brief

Uses deepseek/deepseek-r1-0528:free via OpenRouter.
Falls back gracefully if OPENROUTER_API_KEY is not set.
"""

import json
import os

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/ai", tags=["AI Agent"])

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

# Model selection strategy: try these in order until one works.
# openrouter/free is OpenRouter's built-in auto-router that always resolves
# to a currently-available free model — it will never 404 regardless of model churn.
MODEL_PRIMARY = "meta-llama/llama-3.3-70b-instruct:free"
MODEL_FALLBACKS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-7b-instruct:free",
]
MODEL = MODEL_PRIMARY  # shown in API responses

SYSTEM_PROMPT = """You are the AI Planner/Guide for the Cognitive Traffic Orchestrator — Bengaluru's AI-powered traffic management system.

You analyse real-time edge events, multilingual imputation results, risk scores, LightGBM duration predictions, and RAG-based dispatch briefs.

You speak concisely, using bullet points where helpful, and focus on actionable insight for traffic operators. Never make up specific numbers you haven't been given. When provided data, quote it directly. Use Markdown for formatting."""


def _headers() -> dict:
    key = os.environ.get("OPENROUTER_API_KEY", "")
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cognitive-traffic-orchestrator.local",
        "X-Title": "Cognitive Traffic Orchestrator",
    }


def _key_ok() -> bool:
    key = os.environ.get("OPENROUTER_API_KEY", "")
    return bool(key) and key != "your-openrouter-key-here"


async def _complete(messages: list[dict]) -> str:
    """Non-streaming completion. Tries MODEL_PRIMARY then each fallback."""
    if not _key_ok():
        return "⚠️ OPENROUTER_API_KEY is not configured. Add it to your .env file."

    candidates = [MODEL_PRIMARY] + MODEL_FALLBACKS
    last_error = None

    async with httpx.AsyncClient(timeout=60) as client:
        for candidate in candidates:
            try:
                res = await client.post(
                    f"{OPENROUTER_BASE}/chat/completions",
                    headers=_headers(),
                    json={"model": candidate, "messages": messages, "stream": False},
                )
                res.raise_for_status()
                data = res.json()
                # Surface any model-level error embedded in a 200 response
                if "error" in data:
                    last_error = data["error"]
                    continue
                return (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
            except httpx.HTTPStatusError as exc:
                last_error = exc
                if exc.response.status_code in (404, 422):  # model unavailable
                    continue
                raise  # re-raise non-model errors (auth, rate-limit, etc.)

    return f"⚠️ All AI models unavailable. Last error: {last_error}"


@router.post("/brief")
async def ai_brief(payload: dict):
    """
    Generates an operational brief.
    Body: { "events": [...], "dispatches": [...] }
    """
    events = payload.get("events", [])
    dispatches = payload.get("dispatches", [])

    event_summary = (
        json.dumps(events[:5], indent=2, default=str)
        if events
        else "No events yet."
    )
    dispatch_summary = (
        json.dumps(dispatches[:5], indent=2, default=str)
        if dispatches
        else "No dispatches yet."
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "Generate a concise operational brief for the Bengaluru Traffic Operations Centre.\n\n"
                f"**Live Events (most recent first):**\n```json\n{event_summary}\n```\n\n"
                f"**Recent Dispatches:**\n```json\n{dispatch_summary}\n```\n\n"
                "Provide:\n"
                "1. **Situation Summary** — what's happening right now\n"
                "2. **Top Risk** — the single highest-priority concern\n"
                "3. **Recommended Actions** — 2-3 concrete next steps\n"
                "4. **Pipeline Health** — brief comment on AI pipeline status\n\n"
                "Keep it under 300 words."
            ),
        },
    ]

    text = await _complete(messages)
    return {"brief": text, "model": MODEL}


@router.post("/analyse")
async def ai_analyse(payload: dict):
    """
    Analyses a single event bundle.
    Body: EventBundle object from /api/events/trigger or /api/events/recent
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "Analyse this processed traffic event and explain in plain English what happened, "
                "why the imputation resolved to this cause, and what operators should watch for:\n\n"
                f"```json\n{json.dumps(payload, indent=2, default=str)}\n```\n\n"
                "Keep it under 120 words. Use 2-3 bullet points."
            ),
        },
    ]
    text = await _complete(messages)
    return {"analysis": text, "model": MODEL}


@router.post("/route-brief")
async def ai_route_brief(payload: dict):
    """
    Generates a route briefing narrative.
    Body: { "route": RouteSummary, "events": list[EventBundle] }
    """
    route = payload.get("route", {})
    events = payload.get("events", [])

    route_summary = f"Distance: {route.get('distance_km')} km, ETA: {route.get('eta_minutes')} mins (Base: {route.get('duration_min')} mins), Risk Score: {route.get('risk_score')}, Congestion: {route.get('congestion_score')}, Corridor: {route.get('corridor')}"
    
    events_summary = ""
    if events:
        events_summary = "\n".join([
            f"- {b.get('event', {}).get('event_cause', 'incident')} at {b.get('event', {}).get('corridor', 'corridor')} (Risk: {b.get('riskScore')}, Est. Duration: {b.get('predictedDurationHours')} hrs)"
            for b in events[:5]
        ])
    else:
        events_summary = "No active incidents reported along the route."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "Analyse this planned route and nearby traffic obstacles/incidents to generate a concise operational narrative for Bengaluru traffic controllers:\n\n"
                f"**Planned Route details:**\n{route_summary}\n\n"
                f"**Active Nearby Incidents:**\n{events_summary}\n\n"
                "Provide:\n"
                "1. **Route Overview** — plain English evaluation of the route choice.\n"
                "2. **Congestion / Hazard Warning** — note any incidents/delays along or near this route.\n"
                "3. **AI Recommendation** — brief advice on dispatch or alternate routes.\n\n"
                "Keep it under 120 words. Be direct and actionable."
            ),
        },
    ]
    text = await _complete(messages)
    return {"brief": text, "model": MODEL}


@router.post("/chat")
async def ai_chat(payload: dict):
    """
    Single-turn contextual Q&A.
    Body: { "query": "...", "context": { "events": [...], "dispatches": [...] } }
    """
    query = payload.get("query", "")
    context = payload.get("context", {})

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f'The operator has asked: "{query}"\n\n'
                f"Available system context:\n```json\n{json.dumps(context, indent=2, default=str)}\n```\n\n"
                "Answer the operator's query based on the context. If the answer isn't in the context, say so clearly. Under 150 words."
            ),
        },
    ]
    text = await _complete(messages)
    return {"answer": text, "model": MODEL}


@router.post("/stream/brief")
async def ai_stream_brief(request: Request, payload: dict):
    """
    SSE streaming version of /api/ai/brief.
    Streams tokens as they arrive from OpenRouter.
    """
    if not _key_ok():
        async def _err():
            yield "data: " + json.dumps({"error": "OPENROUTER_API_KEY not set"}) + "\n\n"
        return StreamingResponse(_err(), media_type="text/event-stream")

    events = payload.get("events", [])
    dispatches = payload.get("dispatches", [])
    event_summary = json.dumps(events[:5], indent=2, default=str) if events else "No events yet."
    dispatch_summary = json.dumps(dispatches[:5], indent=2, default=str) if dispatches else "No dispatches yet."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "Generate a concise operational brief for the Bengaluru Traffic Operations Centre.\n\n"
                f"**Live Events:**\n```json\n{event_summary}\n```\n\n"
                f"**Recent Dispatches:**\n```json\n{dispatch_summary}\n```\n\n"
                "Provide Situation Summary, Top Risk, Recommended Actions, Pipeline Health. Under 300 words."
            ),
        },
    ]

    async def _stream_generator():
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{OPENROUTER_BASE}/chat/completions",
                headers=_headers(),
                json={"model": MODEL_PRIMARY, "messages": messages, "stream": True},
            ) as res:
                async for line in res.aiter_lines():
                    if await request.is_disconnected():
                        break
                    line = line.strip()
                    if not line or line == "data: [DONE]":
                        continue
                    if line.startswith("data: "):
                        yield f"{line}\n\n"

    return StreamingResponse(
        _stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
