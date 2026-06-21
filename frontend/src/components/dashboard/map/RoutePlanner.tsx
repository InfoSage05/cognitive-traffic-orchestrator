import { useState } from "react";
import { motion } from "framer-motion";
import { Route, Loader2, MousePointerClick } from "lucide-react";
import { api, type RouteBundle } from "@/lib/api";

interface Props {
  source: [number, number] | null;
  destination: [number, number] | null;
  pickMode: "source" | "destination" | null;
  onPickMode: (mode: "source" | "destination" | null) => void;
  onSourceChange: (coords: [number, number] | null) => void;
  onDestinationChange: (coords: [number, number] | null) => void;
  routeBundle: RouteBundle | null;
  onRouteBundle: (bundle: RouteBundle | null) => void;
}

function coordsToInput(coords: [number, number] | null) {
  return coords ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : "";
}

function parseCoords(text: string): [number, number] | null {
  const parts = text.split(",").map((p) => Number(p.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    return [parts[0], parts[1]];
  }
  return null;
}

export function RoutePlanner({
  source,
  destination,
  pickMode,
  onPickMode,
  onSourceChange,
  onDestinationChange,
  routeBundle,
  onRouteBundle,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planRoute = async () => {
    if (!source || !destination) {
      setError("Set both a source and destination first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bundle = await api.planRoute(source, destination);
      onRouteBundle(bundle);
    } catch {
      setError("Route planning failed — backend or provider may be unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const best = routeBundle?.best_route;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Route className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">Route Planner</div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <input
            value={coordsToInput(source)}
            onChange={(e) => onSourceChange(parseCoords(e.target.value))}
            placeholder="Source lat, lon"
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border outline-none"
          />
          <button
            onClick={() => onPickMode(pickMode === "source" ? null : "source")}
            className={`p-1.5 rounded-lg border border-border ${pickMode === "source" ? "bg-[var(--gradient-primary)] text-primary-foreground" : "text-muted-foreground"}`}
            title="Pick source on map"
          >
            <MousePointerClick className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={coordsToInput(destination)}
            onChange={(e) => onDestinationChange(parseCoords(e.target.value))}
            placeholder="Destination lat, lon"
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border outline-none"
          />
          <button
            onClick={() => onPickMode(pickMode === "destination" ? null : "destination")}
            className={`p-1.5 rounded-lg border border-border ${pickMode === "destination" ? "bg-[var(--gradient-primary)] text-primary-foreground" : "text-muted-foreground"}`}
            title="Pick destination on map"
          >
            <MousePointerClick className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <button
        onClick={planRoute}
        disabled={loading}
        className="mt-3 w-full px-3 py-1.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 glow disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Route className="w-3.5 h-3.5" />}
        Plan Route
      </button>

      {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}

      {best && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground">Distance</div>
            <div className="font-semibold">{best.distance_km?.toFixed(1) ?? "—"} km</div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground">ETA</div>
            <div className="font-semibold">{best.eta_minutes?.toFixed(0) ?? "—"} min</div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground">Risk score</div>
            <div className="font-semibold text-gradient">{best.risk_score.toFixed(1)}</div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground">Congestion</div>
            <div className="font-semibold">{best.congestion_score.toFixed(0)}</div>
          </div>
          <div className="col-span-2 rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground">Corridor</div>
            <div className="font-semibold">{best.corridor}</div>
          </div>
          {routeBundle && routeBundle.alternatives.length > 0 && (
            <div className="col-span-2 text-[11px] text-muted-foreground">
              {routeBundle.alternatives.length} alternative route(s) found.
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
