import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertTriangle, Cloud, Car, Wrench, Filter, Zap, Loader2 } from "lucide-react";
import { api, type EventBundle } from "@/lib/api";

type Severity = "high" | "medium" | "low";

function severityFromRisk(riskScore: number): Severity {
  if (riskScore >= 70) return "high";
  if (riskScore >= 40) return "medium";
  return "low";
}

function iconForCause(cause: string) {
  const c = cause.toLowerCase();
  if (c.includes("water")) return Cloud;
  if (c.includes("accident")) return Car;
  if (c.includes("breakdown") || c.includes("vehicle")) return Wrench;
  return AlertTriangle;
}

export function EventsPanel() {
  const [bundles, setBundles] = useState<EventBundle[]>([]);
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [triggering, setTriggering] = useState(false);

  const load = () => api.recentEvents(12).then(setBundles).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const triggerEvent = async () => {
    setTriggering(true);
    try {
      await api.triggerEvent();
      await load();
    } catch {
      // backend offline; surfaced implicitly by an empty/stale feed
    } finally {
      setTriggering(false);
    }
  };

  const filtered = bundles.filter(
    (b) => filter === "all" || severityFromRisk(b.riskScore) === filter,
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-3 px-5 pb-6">
      <div className="xl:col-span-2 glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium">Edge Event Stream</div>
            <div className="text-xs text-muted-foreground">
              OpenVINO + Multilingual Imputation Agent · live via FastAPI
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerEvent}
              disabled={triggering}
              className="px-3 py-1.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-xs font-medium flex items-center gap-1.5 glow disabled:opacity-60"
            >
              {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Trigger mock event
            </button>
            <div className="glass rounded-lg p-1 flex text-xs">
              {(["all", "high", "medium", "low"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md capitalize ${
                    filter === f
                      ? "bg-[var(--gradient-primary)] text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
          <AnimatePresence initial={false}>
            {filtered.map((b) => {
              const severity = severityFromRisk(b.riskScore);
              const Icon = iconForCause(b.event.event_cause);
              const color =
                severity === "high"
                  ? "text-destructive bg-destructive/10 border-destructive/20"
                  : severity === "medium"
                    ? "text-warning bg-warning/10 border-warning/20"
                    : "text-success bg-success/10 border-success/20";
              return (
                <motion.div
                  key={b.event.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-3 rounded-xl border flex items-start gap-3 ${color}`}
                >
                  <div className="p-2 rounded-lg bg-background/40">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm text-foreground">
                        {b.event.event_cause.replace(/_/g, " ")} · {b.event.corridor}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        Risk {b.riskScore} · {b.predictedDurationHours}h clearance
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Raw: <span className="font-mono">{b.event.description}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {!filtered.length && (
            <div className="text-xs text-muted-foreground p-3">
              No events yet — trigger a mock edge event to start the pipeline.
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-accent" />
          <div className="text-sm font-medium">Latest Imputation</div>
        </div>
        {bundles[0] ? (
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resolved cause</span>
              <span className="font-medium">{bundles[0].event.event_cause}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reason breakdown</span>
              <span className="font-medium">{bundles[0].event.reason_breakdown}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Snapped corridor</span>
              <span className="font-medium">{bundles[0].event.corridor}</span>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-[var(--gradient-aurora)] border border-white/5">
              <div className="text-xs font-medium mb-1">Raw description</div>
              <div className="text-sm font-semibold text-gradient">{bundles[0].event.description}</div>
              <div className="text-[11px] text-muted-foreground">
                mapped → "{bundles[0].event.event_cause.replace(/_/g, " ")}"
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Trigger an event to see imputation output.</div>
        )}
      </div>
    </div>
  );
}
