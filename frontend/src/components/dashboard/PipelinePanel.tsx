import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Activity,
  Car,
  AlertTriangle,
  Zap,
  TrendingUp,
  BrainCircuit,
  MapPin,
  Clock,
  ShieldCheck,
  Megaphone,
  Network,
  History,
  Languages,
  ArrowRight,
  Eye,
  Thermometer,
  Waves,
  HeartPulse,
  Building2,
} from "lucide-react";
import { api, type EventBundle } from "@/lib/api";

const BENGALURU_CCTV_MOCK = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop";

export function PipelinePanel() {
  const [incidents, setIncidents] = useState<EventBundle[]>([]);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const load = () => api.recentEvents(5).then(setIncidents).catch(() => {});
    load();
    const interval = setInterval(() => {
      load();
      setTicker((t) => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const latestIncident = incidents[0];
  const activeCount = incidents.length || 14;

  const kpis = [
    { label: "Active Cameras", value: "47", icon: Camera, color: "text-blue-400" },
    { label: "Vehicles Detected", value: "1,204", icon: Car, color: "text-emerald-400" },
    { label: "Congestion Index", value: "High", icon: Activity, color: "text-rose-400" },
    { label: "Average Speed", value: "18 km/h", icon: Zap, color: "text-amber-400" },
    { label: "Active Incidents", value: activeCount, icon: AlertTriangle, color: "text-rose-500" },
    { label: "System Risk Score", value: "82/100", icon: TrendingUp, color: "text-purple-400" },
  ];

  const pipelineNodes = [
    { id: "ingest", label: "Ingestion", status: "Running", icon: Camera },
    { id: "impute", label: "Imputation", status: "Running", icon: Languages },
    { id: "spatial", label: "Spatial Mapping", status: "Completed", icon: MapPin },
    { id: "risk", label: "Risk Engine", status: "Processing", icon: Activity },
    { id: "predict", label: "Predictor", status: "Running", icon: TrendingUp },
    { id: "rag", label: "Analogue RAG", status: "Queued", icon: BrainCircuit },
    { id: "dispatch", label: "Dispatch", status: "Queued", icon: Megaphone },
  ];

  const risks = [
    { label: "Traffic Risk", val: 85, icon: Car, color: "bg-rose-500" },
    { label: "Accident Risk", val: 60, icon: AlertTriangle, color: "bg-amber-500" },
    { label: "Emergency Risk", val: 30, icon: HeartPulse, color: "bg-emerald-500" },
    { label: "Flood Risk", val: 10, icon: Waves, color: "bg-blue-500" },
    { label: "Infrastructure Risk", val: 40, icon: Building2, color: "bg-purple-500" },
  ];

  return (
    <div className="flex flex-col h-full gap-4 p-3 px-5 pb-6 overflow-y-auto custom-scrollbar">
      
      {/* Top Section: KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 shrink-0">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-3 flex items-center justify-between border border-border/50"
          >
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{kpi.label}</div>
              <div className={`text-lg font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</div>
            </div>
            <div className={`p-1.5 rounded-lg bg-secondary/50 ${kpi.color}`}>
              <kpi.icon className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1">
        
        {/* SECTION 1: Live CCTV Analysis (Span 3) */}
        <div className="xl:col-span-3 flex flex-col gap-3">
          <div className="glass rounded-xl p-3 flex-1 flex flex-col border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <div className="text-sm font-semibold">Live CCTV Analysis</div>
            </div>
            <div className="relative rounded-lg overflow-hidden flex-1 min-h-[160px] bg-black border border-white/10 group">
              <img src={BENGALURU_CCTV_MOCK} alt="CCTV" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:opacity-100 transition-opacity" />
              
              {/* Mock Bounding Boxes */}
              <div className="absolute top-[30%] left-[20%] w-12 h-10 border-2 border-emerald-400 bg-emerald-400/20" />
              <div className="absolute top-[40%] left-[50%] w-16 h-14 border-2 border-rose-400 bg-rose-400/20" />
              
              <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[9px] font-mono text-white flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                CAM-SILKBRD-04
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[9px] font-mono text-cyan-400">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-2 text-center text-[10px]">
              <div className="bg-secondary/40 rounded py-1"><div className="text-muted-foreground">Cars</div><div className="font-bold text-white">42</div></div>
              <div className="bg-secondary/40 rounded py-1"><div className="text-muted-foreground">Bikes</div><div className="font-bold text-white">108</div></div>
              <div className="bg-secondary/40 rounded py-1"><div className="text-muted-foreground">Trucks</div><div className="font-bold text-white">5</div></div>
              <div className="bg-secondary/40 rounded py-1"><div className="text-muted-foreground">Buses</div><div className="font-bold text-white">12</div></div>
              <div className="bg-secondary/40 rounded py-1"><div className="text-muted-foreground">Peds</div><div className="font-bold text-white">34</div></div>
            </div>
          </div>
        </div>

        {/* SECTION 2 & 4: Inference & Interpretation (Span 3) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Section 2: Inference Panel */}
          <div className="glass rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Network className="w-4 h-4 text-emerald-400" />
              <div className="text-sm font-semibold">OpenVINO Inference</div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Vehicle Count / min", val: "142", pct: 75, color: "bg-emerald-400" },
                { label: "Traffic Density", val: "88%", pct: 88, color: "bg-rose-400" },
                { label: "Lane Occupancy", val: "92%", pct: 92, color: "bg-amber-400" },
                { label: "Inference Confidence", val: "99.2%", pct: 99, color: "bg-blue-400" },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-bold">{m.val}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${m.color}`} 
                      initial={{ width: 0 }} 
                      animate={{ width: `${m.pct}%` }} 
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: AI Interpretation */}
          <div className="glass rounded-xl p-4 border border-border/50 flex-1 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[var(--gradient-cyber)] opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity" />
            <div className="flex items-center gap-2 mb-2 relative">
              <BrainCircuit className="w-4 h-4 text-purple-400" />
              <div className="text-sm font-semibold">AI Traffic Interpretation</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed relative">
              {latestIncident ? (
                <>
                  <strong className="text-white">Detected {latestIncident.event.event_cause.replace(/_/g, " ")}</strong> near 
                  <span className="text-indigo-300 font-medium"> {latestIncident.event.corridor}</span>. 
                  Signal saturation is exacerbating the delay. Traffic is predicted to worsen over the next {Math.round(latestIncident.predictedDurationHours * 60)} minutes, pushing the risk score to a critical level of <strong className="text-rose-400">{Math.round(latestIncident.riskScore)}</strong>.
                </>
              ) : (
                "Heavy congestion detected near Silk Board due to signal saturation. Traffic expected to worsen over the next 20 minutes, expanding the impact radius to adjacent arterial roads."
              )}
            </p>
          </div>
        </div>

        {/* SECTION 5 & 7: Risk Matrix & Recommendations (Span 3) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Section 5: Risk Matrix */}
          <div className="glass rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Thermometer className="w-4 h-4 text-rose-400" />
              <div className="text-sm font-semibold">Dynamic Risk Matrix</div>
            </div>
            <div className="space-y-2">
              {risks.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <r.icon className={`w-3.5 h-3.5 ${r.color.replace('bg-', 'text-')}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-muted-foreground">{r.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full ${r.color}`} 
                        initial={{ width: 0 }} 
                        animate={{ width: `${r.val}%` }} 
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Recommendations */}
          <div className="glass rounded-xl p-4 border border-[var(--color-primary)]/30 flex-1 relative overflow-hidden shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-sm font-semibold">Recommended Actions</div>
            </div>
            <ul className="space-y-2">
              {[
                "Divert northbound traffic via Outer Ring Road.",
                "Dispatch rapid response unit to junction 8.",
                "Extend signal cycle at intersection C by 40s.",
                "Issue automated advisory to commuter apps.",
              ].map((rec, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-xs text-white/90 bg-secondary/20 p-2 rounded-lg border border-white/5"
                >
                  <ArrowRight className="w-3 h-3 mt-0.5 text-cyan-400 shrink-0" />
                  <span>{rec}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* SECTION 6 & 8: Route Impact & Analogue Match (Span 3) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Section 6: Route Impact Analysis */}
          <div className="glass rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-amber-400" />
              <div className="text-sm font-semibold">Route Impact Analysis</div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground">Affected Corridor</span>
                <span className="font-semibold">{latestIncident?.event.corridor || "Silk Board Jct"}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground">Estimated Delay</span>
                <span className="font-semibold text-rose-400">+{latestIncident ? Math.round(latestIncident.predictedDurationHours * 60) : 45} mins</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-secondary/30 rounded-lg border border-emerald-400/30">
                <span className="text-muted-foreground">Alt. Route Viability</span>
                <span className="font-semibold text-emerald-400">High (ORR bypass)</span>
              </div>
            </div>
          </div>

          {/* Section 8: Historical Analogue Match */}
          <div className="glass rounded-xl p-4 border border-border/50 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-indigo-400" />
              <div className="text-sm font-semibold">Historical Analogue Match</div>
            </div>
            <div className="p-3 bg-secondary/20 rounded-lg border border-white/5 space-y-2 text-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[9px] rounded-bl-lg font-bold">
                94% MATCH
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Matched Event (Nov 2023)</span>
                <strong className="text-white">Waterlogging + Breakdown Cascade</strong>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Historical Outcome</span>
                <span className="text-rose-300">Gridlock resolved in 3.5 hours.</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Retrospective Strategy</span>
                <span className="text-emerald-300">Early diversion to HSR layout proved most effective.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: Live Pipeline Execution (Full Width Row at bottom) */}
      <div className="glass rounded-xl p-4 border border-border/50 shrink-0 mt-2">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[var(--color-primary)]" />
          <div className="text-sm font-semibold">Live Pipeline Execution</div>
        </div>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {pipelineNodes.map((node, idx) => {
            const isProcessing = node.status === "Running" || node.status === "Processing";
            const isCompleted = node.status === "Completed";
            
            // Randomize active states slightly using the ticker for visual life
            const activeNow = isProcessing && (ticker % 3 === idx % 3);

            return (
              <div key={node.id} className="flex items-center flex-1 w-full lg:w-auto">
                <motion.div 
                  className={`relative p-3 rounded-xl border flex-1 text-center bg-secondary/20 transition-all duration-500 ${
                    activeNow ? 'border-[var(--color-primary)] shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)]' : 'border-border/50'
                  }`}
                  animate={activeNow ? { y: [0, -3, 0] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <node.icon className={`w-5 h-5 mx-auto mb-1.5 ${
                    isCompleted ? 'text-emerald-400' : isProcessing ? 'text-cyan-400' : 'text-muted-foreground'
                  }`} />
                  <div className="text-[11px] font-bold text-white/90 leading-tight">{node.label}</div>
                  <div className="text-[9px] uppercase tracking-wider mt-1 text-muted-foreground">
                    {activeNow ? <span className="text-cyan-400">Processing...</span> : node.status}
                  </div>
                </motion.div>
                
                {idx < pipelineNodes.length - 1 && (
                  <div className="hidden lg:block w-8 h-px bg-border mx-2 relative">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.2 }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
