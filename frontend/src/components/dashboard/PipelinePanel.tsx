import { motion } from "framer-motion";
import { Camera, Languages, MapPin, BrainCircuit, ShieldCheck, Megaphone } from "lucide-react";

const nodes = [
  { id: "ingest", label: "Ingestion", desc: "OpenVINO + BMD-45 frames", icon: Camera, color: "oklch(0.7 0.2 195)" },
  { id: "translate", label: "Imputation", desc: "Kannada → English mapping", icon: Languages, color: "oklch(0.66 0.24 295)" },
  { id: "spatial", label: "Spatial Snap", desc: "22 corridor resolver", icon: MapPin, color: "oklch(0.7 0.27 340)" },
  { id: "models", label: "Model Matrix", desc: "Risk · LightGBM · RAG", icon: BrainCircuit, color: "oklch(0.82 0.18 85)" },
  { id: "verify", label: "Verifier", desc: "validate_brief grader", icon: ShieldCheck, color: "oklch(0.75 0.2 155)" },
  { id: "dispatch", label: "Dispatch", desc: "Webhook + Mobile push", icon: Megaphone, color: "oklch(0.65 0.25 25)" },
];

export function PipelinePanel() {
  return (
    <div className="p-3 px-5 pb-6 space-y-4">
      <div className="glass rounded-2xl p-5 bg-grid relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-aurora)] opacity-30 pointer-events-none" />
        <div className="relative">
          <div className="text-sm font-medium">Cognitive Pipeline · Loop Engineering</div>
          <div className="text-xs text-muted-foreground">
            Four cycles flowing edge → dispatch with continuous hill-climbing.
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {nodes.map((n, i) => {
              const Icon = n.icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="relative glass rounded-2xl p-4 text-center"
                >
                  <div
                    className="w-10 h-10 mx-auto rounded-xl grid place-items-center text-background"
                    style={{ background: n.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="mt-2 text-sm font-medium">{n.label}</div>
                  <div className="text-[11px] text-muted-foreground">{n.desc}</div>
                  {i < nodes.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-px bg-gradient-to-r from-primary to-accent" />
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 overflow-hidden relative h-6 rounded-full bg-secondary/30">
            <div className="ticker absolute inset-0 flex items-center whitespace-nowrap gap-8 px-3 text-[11px] text-muted-foreground">
              {Array.from({ length: 2 }).map((_, copy) => (
                <span key={copy} className="flex items-center gap-8">
                  <span>● Loop 1 · Core agent ingesting</span>
                  <span>● Loop 2 · Verifier grading briefs</span>
                  <span>● Loop 3 · Edge event stream live</span>
                  <span>● Loop 4 · Operator hill-climbing</span>
                  <span>● 22 corridors monitored</span>
                  <span>● LightGBM trained on Nov–Feb, verified on Mar–Apr</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
