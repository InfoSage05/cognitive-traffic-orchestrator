const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface OrchestratedEvent {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  timestamp: string;
  event_cause: string;
  reason_breakdown: string;
  corridor: string;
}

export interface Recommendation {
  event_cause: string;
  corridor: string;
  barricade_needed: boolean;
  requires_road_closure: boolean;
  manpower: number;
  similar_cases: Array<Record<string, unknown>>;
  reasoning: string;
  validation_status: "passed" | "corrected";
  verification_message: string;
}

export interface EventBundle {
  event: OrchestratedEvent;
  riskScore: number;
  predictedDurationHours: number;
  blockageImpact?: number;
  recommendation: Recommendation;
}

export interface DispatchRecord {
  target: string;
  channel: string;
  status: string;
  body: string;
  manpower?: number;
  barricadeNeeded?: boolean;
}

export interface DashboardSummary {
  kpis: {
    activeEvents: number;
    avgRiskIndex: number;
    predictedClearanceHours: number | null;
    briefsDispatched: number;
  };
  causeData: Array<{ name: string; value: number }>;
  corridorData: Array<{ name: string; v: number }>;
  flowData: Array<{ h: string; congestion: number; risk: number }>;
  historicalEventCount: number;
}

export interface RouteSummary {
  distance_km: number | null;
  duration_min: number | null;
  eta_minutes: number | null;
  risk_score: number;
  congestion_score: number;
  corridor: string;
  geometry: string | null;
}

export interface RouteAlternative {
  distance_km: number | null;
  duration_min: number | null;
  congestion_level: string | null;
}

export interface RouteBundle {
  best_route: RouteSummary;
  alternatives: RouteAlternative[];
  schema_version: string;
  route_id?: string;
}

export interface NearbyPoi {
  name: string;
  category: string;
  lat: number | null;
  lon: number | null;
  distance_m: number | null;
  source: string;
  schema_version: string;
}

export interface NearbyResult {
  pois: NearbyPoi[];
  queried_at: string;
  schema_version: string;
}

export interface RecommendationResult {
  risk_score: number;
  predicted_duration_hours: number;
  dispatch_recommendation: Recommendation;
  human_summary: string;
  schema_version: string;
  recommendation_id?: string;
  route_info?: RouteBundle;
}

export const api = {
  triggerEvent: () => request<EventBundle>("/api/events/trigger", { method: "POST" }),
  recentEvents: (limit = 12) => request<EventBundle[]>(`/api/events/recent?limit=${limit}`),
  dispatchAlert: (recommendation: Recommendation) =>
    request<DispatchRecord>("/api/alerts/dispatch", {
      method: "POST",
      body: JSON.stringify(recommendation),
    }),
  recentDispatches: (limit = 12) => request<DispatchRecord[]>(`/api/alerts/recent?limit=${limit}`),
  dashboardSummary: () => request<DashboardSummary>("/api/dashboard/summary"),
  planRoute: (source: [number, number], destination: [number, number]) =>
    request<RouteBundle>("/api/mobility/route", {
      method: "POST",
      body: JSON.stringify({ source, destination }),
    }),
  nearby: (lat: number, lon: number, categories?: string[]) =>
    request<NearbyResult>(
      `/api/nearby?lat=${lat}&lon=${lon}${categories?.length ? `&categories=${categories.join(",")}` : ""}`,
    ),
  searchPlaces: (q: string) =>
    request<Array<{ name: string; lat: number; lon: number }>>(`/api/mobility/search?q=${encodeURIComponent(q)}`),
  geocode: (q: string) =>
    request<{ lat: number | null; lon: number | null; formatted_address: string | null }>(
      `/api/mobility/geocode?q=${encodeURIComponent(q)}`,
    ),
  recommendation: (event: Record<string, unknown>) =>
    request<RecommendationResult>("/api/recommendation", {
      method: "POST",
      body: JSON.stringify(event),
    }),

  // ─── LLM Planner/Guide Agent endpoints ─────────────────────────────────
  routeBrief: (route: RouteSummary, events: EventBundle[]) =>
    request<{ brief: string; model: string }>("/api/ai/route-brief", {
      method: "POST",
      body: JSON.stringify({ route, events }),
    }),
  aiBrief: (events: EventBundle[], dispatches: DispatchRecord[]) =>
    request<{ brief: string; model: string }>("/api/ai/brief", {
      method: "POST",
      body: JSON.stringify({ events, dispatches }),
    }),
  aiAnalyse: (bundle: EventBundle) =>
    request<{ analysis: string; model: string }>("/api/ai/analyse", {
      method: "POST",
      body: JSON.stringify(bundle),
    }),
  aiChat: (query: string, context: { events: EventBundle[]; dispatches: DispatchRecord[] }) =>
    request<{ answer: string; model: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ query, context }),
    }),
};

