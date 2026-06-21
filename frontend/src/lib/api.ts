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
};
