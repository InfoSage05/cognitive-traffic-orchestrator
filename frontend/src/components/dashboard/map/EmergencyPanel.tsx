import { useState } from "react";
import { motion } from "framer-motion";
import { Siren, Loader2 } from "lucide-react";
import { api, type NearbyPoi, type RouteBundle } from "@/lib/api";

interface Props {
  onLocate: (coords: [number, number]) => void;
  onDestination: (coords: [number, number]) => void;
  onRouteBundle: (bundle: RouteBundle) => void;
}

interface EmergencyResult {
  hospital: NearbyPoi | null;
  police: NearbyPoi | null;
  pharmacy: NearbyPoi | null;
  route: RouteBundle | null;
}

function nearest(pois: NearbyPoi[], category: string): NearbyPoi | null {
  const matches = pois.filter((p) => p.category === category && p.lat != null && p.lon != null);
  if (!matches.length) return null;
  return matches.reduce((best, p) => ((p.distance_m ?? Infinity) < (best.distance_m ?? Infinity) ? p : best));
}

export function EmergencyPanel({ onLocate, onDestination, onRouteBundle }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmergencyResult | null>(null);

  const activate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        onLocate(coords);
        try {
          const nearbyResult = await api.nearby(coords[0], coords[1], ["hospital", "police", "pharmacy"]);
          const hospital = nearest(nearbyResult.pois, "hospital");
          const police = nearest(nearbyResult.pois, "police");
          const pharmacy = nearest(nearbyResult.pois, "pharmacy");

          let route: RouteBundle | null = null;
          if (hospital?.lat != null && hospital.lon != null) {
            const destination: [number, number] = [hospital.lat, hospital.lon];
            onDestination(destination);
            route = await api.planRoute(coords, destination);
            onRouteBundle(route);
          }

          setResult({ hospital, police, pharmacy, route });
        } catch {
          setError("Emergency lookup failed — backend or provider may be unreachable.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location permission denied — cannot activate emergency mode.");
        setLoading(false);
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass rounded-2xl p-4 border border-destructive/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <Siren className="w-4 h-4 text-destructive" />
        <div className="text-sm font-medium">Emergency Mode</div>
      </div>

      <button
        onClick={activate}
        disabled={loading}
        className="w-full px-3 py-1.5 rounded-lg bg-destructive text-background text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Siren className="w-3.5 h-3.5" />}
        Activate Emergency Mode
      </button>

      {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}

      {result && (
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nearest hospital</span>
            <span className="font-medium">{result.hospital?.name ?? "Not found"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nearest police</span>
            <span className="font-medium">{result.police?.name ?? "Not found"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nearest pharmacy</span>
            <span className="font-medium">{result.pharmacy?.name ?? "Not found"}</span>
          </div>
          {result.route?.best_route && (
            <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2">
              <div className="text-[11px] text-muted-foreground">Route to hospital</div>
              <div className="text-sm font-semibold">
                {result.route.best_route.eta_minutes?.toFixed(0) ?? "—"} min ·{" "}
                {result.route.best_route.distance_km?.toFixed(1) ?? "—"} km
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
