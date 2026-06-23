import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, MapPin, Hospital, Shield, Flame, Landmark, BatteryCharging, Train, Bus, Pill } from "lucide-react";
import { api, type NearbyPoi } from "@/lib/api";

const CATEGORIES = [
  { id: "hospital", label: "Hospital", icon: Hospital, color: "text-red-400" },
  { id: "police", label: "Police", icon: Shield, color: "text-blue-400" },
  { id: "fuel", label: "Fuel", icon: Flame, color: "text-orange-400" },
  { id: "parking", label: "Parking", icon: Landmark, color: "text-emerald-400" },
  { id: "ev_charging", label: "EV Charging", icon: BatteryCharging, color: "text-cyan-400" },
  { id: "metro", label: "Metro", icon: Train, color: "text-indigo-400" },
  { id: "bus_stop", label: "Bus Stop", icon: Bus, color: "text-yellow-400" },
  { id: "pharmacy", label: "Pharmacy", icon: Pill, color: "text-pink-400" },
];

interface Props {
  centerLocation: [number, number] | null;
  pois: NearbyPoi[];
  onPois: (pois: NearbyPoi[]) => void;
  onSelectPoi: (coords: [number, number]) => void;
}

export function NearbyDiscovery({ centerLocation, pois, onPois, onSelectPoi }: Props) {
  const [selected, setSelected] = useState<string[]>(["hospital", "police"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (category: string) => {
    setSelected((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const search = async () => {
    if (!centerLocation) {
      setError("No location set yet — pick a point on the map or search a route first.");
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

  const getPoiIcon = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found ? found.icon : MapPin;
  };

  const getPoiColorClass = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found ? found.color : "text-muted-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">Nearby Discovery</div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isSelected = selected.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`px-2 py-1 rounded-md text-[11px] capitalize border flex items-center gap-1 transition-all ${
                isSelected
                  ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent font-medium shadow-sm"
                  : "text-muted-foreground border-border hover:bg-secondary/20"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={search}
        disabled={loading}
        className="mt-3.5 w-full px-3 py-1.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 glow disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        Search Nearby
      </button>

      {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}

      <div className="mt-3 space-y-1.5 max-h-48 overflow-auto pr-1 divide-y divide-border/20">
        {pois.length === 0 && !loading && (
          <div className="text-[11px] text-muted-foreground py-2 text-center">
            No results yet — run a search.
          </div>
        )}
        {pois.map((p, idx) => {
          const Icon = getPoiIcon(p.category);
          const colorClass = getPoiColorClass(p.category);
          return (
            <div
              key={idx}
              onClick={() => p.lat && p.lon && onSelectPoi([p.lat, p.lon])}
              className="flex items-center justify-between text-xs rounded-lg hover:bg-secondary/40 px-2.5 py-2 cursor-pointer transition-colors"
              title="Click to center map on POI"
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />
                <div className="truncate">
                  <div className="font-medium text-foreground/90 truncate">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {p.category.replace(/_/g, " ")} · {p.source}
                  </div>
                </div>
              </div>
              {p.distance_m != null && (
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                  {Math.round(p.distance_m)}m
                </span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
