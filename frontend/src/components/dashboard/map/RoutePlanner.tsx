import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Route, Loader2, MousePointerClick, Sparkles } from "lucide-react";
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

  const [sourceText, setSourceText] = useState("");
  const [destText, setDestText] = useState("");
  const [sourceSuggestions, setSourceSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (source) {
      // Set value if not editing or if currently set coordinates don't match input
      const parsed = parseCoords(sourceText);
      if (!parsed || parsed[0] !== source[0] || parsed[1] !== source[1]) {
        if (!sourceSuggestions.some(s => s.lat === source[0] && s.lon === source[1])) {
          setSourceText(`${source[0].toFixed(5)}, ${source[1].toFixed(5)}`);
        }
      }
    } else {
      setSourceText("");
    }
  }, [source]);

  useEffect(() => {
    if (destination) {
      const parsed = parseCoords(destText);
      if (!parsed || parsed[0] !== destination[0] || parsed[1] !== destination[1]) {
        if (!destSuggestions.some(s => s.lat === destination[0] && s.lon === destination[1])) {
          setDestText(`${destination[0].toFixed(5)}, ${destination[1].toFixed(5)}`);
        }
      }
    } else {
      setDestText("");
    }
  }, [destination]);

  const handleSourceChange = async (val: string) => {
    setSourceText(val);
    const parsed = parseCoords(val);
    if (parsed) {
      onSourceChange(parsed);
      setSourceSuggestions([]);
      return;
    }
    if (val.length < 3) {
      setSourceSuggestions([]);
      return;
    }
    try {
      const results = await api.searchPlaces(val);
      setSourceSuggestions(results);
    } catch {
      setSourceSuggestions([]);
    }
  };

  const handleDestChange = async (val: string) => {
    setDestText(val);
    const parsed = parseCoords(val);
    if (parsed) {
      onDestinationChange(parsed);
      setDestSuggestions([]);
      return;
    }
    if (val.length < 3) {
      setDestSuggestions([]);
      return;
    }
    try {
      const results = await api.searchPlaces(val);
      setDestSuggestions(results);
    } catch {
      setDestSuggestions([]);
    }
  };

  const planRoute = async () => {
    if (!source || !destination) {
      setError("Set both a source and destination first.");
      return;
    }
    setLoading(true);
    setError(null);
    setAiBrief(null);
    try {
      const bundle = await api.planRoute(source, destination);
      if ((bundle as any).error) {
        setError(`Route error: ${(bundle as any).error}`);
      }
      onRouteBundle(bundle);
      if (!bundle.best_route?.geometry) {
        setError("Route calculated (straight-line estimate) — no road geometry available from providers.");
      }

      // Trigger AI route narrative
      setAiLoading(true);
      try {
        const recent = await api.recentEvents(20);
        const res = await api.routeBrief(bundle.best_route, recent);
        setAiBrief(res.brief);
      } catch (err) {
        console.error("AI route briefing failed:", err);
      } finally {
        setAiLoading(false);
      }
    } catch (err) {
      console.error("Route planning failed:", err);
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

      <div className="space-y-3 text-xs">
        {/* Source Field */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              value={sourceText}
              onChange={(e) => handleSourceChange(e.target.value)}
              placeholder="Search or enter source lat, lon"
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border outline-none text-xs"
            />
            <button
              onClick={() => onPickMode(pickMode === "source" ? null : "source")}
              className={`p-1.5 rounded-lg border border-border shrink-0 ${pickMode === "source" ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent" : "text-muted-foreground"}`}
              title="Pick source on map"
            >
              <MousePointerClick className="w-3.5 h-3.5" />
            </button>
          </div>
          {sourceSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 z-[2000] rounded-xl bg-[#0e0e1a] border border-border/80 shadow-2xl max-h-40 overflow-auto divide-y divide-border/30">
              {sourceSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSourceChange([item.lat, item.lon]);
                    setSourceText(item.name);
                    setSourceSuggestions([]);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-secondary/40 transition-colors text-foreground/85 truncate block"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Field */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              value={destText}
              onChange={(e) => handleDestChange(e.target.value)}
              placeholder="Search or enter destination lat, lon"
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border outline-none text-xs"
            />
            <button
              onClick={() => onPickMode(pickMode === "destination" ? null : "destination")}
              className={`p-1.5 rounded-lg border border-border shrink-0 ${pickMode === "destination" ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent" : "text-muted-foreground"}`}
              title="Pick destination on map"
            >
              <MousePointerClick className="w-3.5 h-3.5" />
            </button>
          </div>
          {destSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 z-[2000] rounded-xl bg-[#0e0e1a] border border-border/80 shadow-2xl max-h-40 overflow-auto divide-y divide-border/30">
              {destSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onDestinationChange([item.lat, item.lon]);
                    setDestText(item.name);
                    setDestSuggestions([]);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-secondary/40 transition-colors text-foreground/85 truncate block"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={planRoute}
        disabled={loading}
        className="mt-3.5 w-full px-3 py-1.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 glow disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Route className="w-3.5 h-3.5" />}
        Plan Route
      </button>

      {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}

      {best && (
        <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground text-[10px]">Distance</div>
            <div className="font-semibold text-foreground/90">{best.distance_km?.toFixed(1) ?? "—"} km</div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground text-[10px]">ETA (Traffic)</div>
            <div className="font-semibold text-foreground/90">{best.eta_minutes?.toFixed(0) ?? "—"} min</div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground text-[10px]">Risk score</div>
            <div className="font-semibold text-gradient">{best.risk_score.toFixed(1)} / 100</div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground text-[10px]">Congestion Score</div>
            <div className="font-semibold text-foreground/90">{best.congestion_score.toFixed(0)}%</div>
          </div>
          <div className="col-span-2 rounded-lg bg-secondary/40 p-2">
            <div className="text-muted-foreground text-[10px]">Corridor Path</div>
            <div className="font-semibold text-foreground/90 truncate">{best.corridor}</div>
          </div>
        </div>
      )}

      {aiLoading && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/20 p-2.5 rounded-lg border border-border">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Analyzing route corridors for obstacles...</span>
        </div>
      )}

      {aiBrief && (
        <div className="mt-3 rounded-lg bg-[var(--gradient-aurora)] border border-white/5 p-3 text-xs leading-relaxed">
          <div className="font-semibold text-[11px] text-accent mb-1.5 flex items-center gap-1.2 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>AI Route Insight</span>
          </div>
          <div className="text-foreground/90 whitespace-pre-wrap">{aiBrief}</div>
        </div>
      )}
    </motion.div>
  );
}
