import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { api, type EventBundle, type RecommendationResult } from "@/lib/api";

export function RecommendationPanel() {
  const [events, setEvents] = useState<EventBundle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  useEffect(() => {
    api
      .recentEvents(6)
      .then(setEvents)
      .catch(() => {});
  }, []);

  const getRecommendation = async (bundle: EventBundle) => {
    setSelectedId(bundle.event.id);
    setLoading(true);
    setError(null);
    try {
      const rec = await api.recommendation(bundle.event);
      setResult(rec);
    } catch {
      setError("Recommendation failed — backend may be unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">AI Recommendation</div>
      </div>

      {events.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">
          No live events yet — trigger one from the Event Feed tab.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-32 overflow-auto pr-1">
          {events.map((b) => (
            <button
              key={b.event.id}
              onClick={() => getRecommendation(b)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs border ${
                selectedId === b.event.id
                  ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent"
                  : "bg-secondary/40 border-border text-foreground/80"
              }`}
            >
              {b.event.event_cause.replace(/_/g, " ")} · {b.event.corridor}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating recommendation…
        </div>
      )}

      {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}

      {result && !loading && (
        <div className="mt-3 rounded-xl p-3 bg-[var(--gradient-aurora)] border border-white/5 text-xs leading-relaxed">
          {result.human_summary}
        </div>
      )}
    </motion.div>
  );
}
