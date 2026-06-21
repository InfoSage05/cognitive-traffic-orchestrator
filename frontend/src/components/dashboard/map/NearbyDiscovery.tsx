import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, MapPin } from "lucide-react";
import { api, type NearbyPoi } from "@/lib/api";

const CATEGORIES = ["hospital", "police", "fuel", "parking", "ev_charging", "metro", "bus_stop", "pharmacy"];

interface Props {
  centerLocation: [number, number] | null;
  pois: NearbyPoi[];
  onPois: (pois: NearbyPoi[]) => void;
}

export function NearbyDiscovery({ centerLocation, pois, onPois }: Props) {
  const [selected, setSelected] = useState<string[]>(["hospital", "police"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (category: string) => {
    setSelected((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const search = async () => {
    if (!centerLocation) {
      setError("No location set yet — pick a point on the map or enable current location.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.nearby(centerLocation[0], centerLocation[1], selected);
      onPois(result.pois);
    } catch {
      setError("Nearby search failed — backend or provider may be unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">Nearby Discovery</div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`px-2 py-1 rounded-md text-[11px] capitalize border ${
              selected.includes(c)
                ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent"
                : "text-muted-foreground border-border"
            }`}
          >
            {c.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <button
        onClick={search}
        disabled={loading}
        className="mt-3 w-full px-3 py-1.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 glow disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        Search Nearby
      </button>

      {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}

      <div className="mt-3 space-y-1.5 max-h-48 overflow-auto pr-1">
        {pois.length === 0 && !loading && (
          <div className="text-[11px] text-muted-foreground">No results yet — run a search.</div>
        )}
        {pois.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs rounded-lg bg-secondary/40 px-2.5 py-1.5">
            <div className="truncate">
              <span className="font-medium">{p.name}</span>{" "}
              <span className="text-muted-foreground">· {p.category.replace(/_/g, " ")}</span>
            </div>
            {p.distance_m != null && (
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{Math.round(p.distance_m)}m</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
