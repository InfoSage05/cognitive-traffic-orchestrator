import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles, Database, Gauge, Loader2 } from "lucide-react";
import { api, type EventBundle } from "@/lib/api";

export function ModelMatrix() {
  const [bundle, setBundle] = useState<EventBundle | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const load = () =>
    api
      .recentEvents(1)
      .then((events) => setBundle(events[0] ?? null))
      .catch(() => {});

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const recommendation = bundle?.recommendation;

  const deploy = async () => {
    if (!recommendation) return;
    setDispatching(true);
    try {
      await api.dispatchAlert(recommendation);
      setDispatched(true);
    } catch {
      // ignored — backend offline
    } finally {
      setDispatching(false);
    }
  };

  const models = [
    {
      name: "Spatio-Temporal Risk Engine",
      tag: "Direction 1",
      icon: Gauge,
      metric: "Risk Index",
      value: bundle ? bundle.riskScore.toFixed(1) : "0 – 100",
      detail: "Computes proximity- and history-weighted live risk per corridor.",
      accent: "from-[oklch(0.7_0.27_340)] to-[oklch(0.66_0.24_295)]",
      bars: [82, 67, 54, 73, 48, bundle ? Math.round(bundle.riskScore) : 91],
    },
    {
      name: "LightGBM Duration Predictor",
      tag: "Direction 2",
      icon: Brain,
      metric: "Predicted duration",
      value: bundle ? `${bundle.predictedDurationHours.toFixed(2)} hrs` : "—",
      detail: "Trained on Nov–Feb historical logs, verified on a Mar–Apr held-out set.",
      accent: "from-[oklch(0.66_0.24_295)] to-[oklch(0.7_0.2_195)]",
      bars: [45, 52, 60, 64, 70, bundle ? Math.min(100, Math.round(bundle.predictedDurationHours * 12)) : 78],
    },
    {
      name: "Nearest-Neighbour RAG",
      tag: "Direction 3",
      icon: Database,
      metric: "Similar cases found",
      value: recommendation ? String(recommendation.similar_cases.length) : "—",
      detail: "Retrieves analogous historical incidents for dispatch context.",
      accent: "from-[oklch(0.7_0.2_195)] to-[oklch(0.75_0.2_155)]",
      bars: [30, 40, 55, 70, 85, recommendation ? recommendation.similar_cases.length * 30 : 88],
    },
  ];

  return (
    <div className="p-3 px-5 pb-6 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {models.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-5 relative overflow-hidden"
            >
              <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${m.accent} opacity-25 blur-3xl`} />
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{m.tag}</span>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${m.accent} text-background`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-lg font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.detail}</div>
              <div className="mt-4 flex items-end gap-1 h-14">
                {m.bars.map((b, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.min(100, Math.max(4, b))}%` }}
                    transition={{ delay: 0.2 + idx * 0.05, duration: 0.6 }}
                    className={`flex-1 rounded-md bg-gradient-to-t ${m.accent}`}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{m.metric}</span>
                <span className="font-semibold text-gradient">{m.value}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <div className="text-sm font-medium">Prescriptive Brief · validate_brief Grader</div>
          </div>
          <button
            onClick={deploy}
            disabled={!recommendation || dispatching}
            className="px-3 py-1.5 rounded-lg bg-[var(--gradient-primary)] text-primary-foreground text-xs font-medium flex items-center gap-1.5 glow disabled:opacity-50"
          >
            {dispatching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {dispatched ? "Dispatched" : "Deploy Field Alert"}
          </button>
        </div>
        {recommendation && bundle ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl p-4 bg-[var(--gradient-aurora)] border border-white/5">
              <div className="text-xs text-muted-foreground">Dispatch draft</div>
              <div className="text-sm mt-2 leading-relaxed">
                {recommendation.barricade_needed ? (
                  <>
                    Deploy <strong>{recommendation.manpower} marshal units</strong> to{" "}
                    <strong>{recommendation.corridor}</strong>. <strong>Barricades required</strong> based on event
                    cause "{recommendation.event_cause}".
                  </>
                ) : (
                  <>
                    Deploy <strong>{recommendation.manpower} marshal units</strong> to{" "}
                    <strong>{recommendation.corridor}</strong>. No barricades required.
                  </>
                )}{" "}
                Expected clearance window <strong>{bundle.predictedDurationHours.toFixed(2)} hrs</strong> based on{" "}
                {recommendation.similar_cases.length} historical analogues.
              </div>
            </div>
            <div className="rounded-xl p-4 bg-secondary/40 border border-border">
              <div className="text-xs text-muted-foreground mb-2">Verifier score</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground/80">Validation status</span>
                  <span
                    className={
                      recommendation.validation_status === "passed" ? "text-success font-medium" : "text-warning font-medium"
                    }
                  >
                    {recommendation.validation_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/80">Road closure required</span>
                  <span className="font-medium">{String(recommendation.requires_road_closure)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/80">Barricades required</span>
                  <span className="font-medium">{String(recommendation.barricade_needed)}</span>
                </div>
                <div className="pt-2 text-muted-foreground italic">{recommendation.verification_message}</div>
                <div className="pt-1 text-muted-foreground">{recommendation.reasoning}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No live event yet — trigger one from the Event Feed tab to populate a dispatch brief.
          </div>
        )}
      </div>
    </div>
  );
}
