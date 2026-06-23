import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Smartphone,
  CheckCircle2,
  ShieldAlert,
  Activity,
  AlertTriangle,
  Clock,
  MapPin,
  TrendingUp,
  BrainCircuit,
  Bot,
  Zap,
} from "lucide-react";
import { api, type DispatchRecord, type EventBundle } from "@/lib/api";
import { MapView } from "@/components/dashboard/map/MapView";

const MOCK_AGENTS = [
  { name: "Imputation Agent", status: "Processing", color: "text-blue-400" },
  { name: "Spatial Agent", status: "Complete", color: "text-emerald-400" },
  { name: "Mobility Agent", status: "Running", color: "text-purple-400" },
  { name: "Nearby Intelligence", status: "Queued", color: "text-amber-400" },
  { name: "Recommendation Agent", status: "Processing", color: "text-rose-400" },
];

const FEEDBACK_DATA = [
  { who: "Op. Kavya R.", txt: "Switched divert route to Ulsoor Lake side.", ago: "3m" },
  { who: "Op. Arjun S.", txt: "Marked waterlogging severity as critical.", ago: "11m" },
  { who: "Op. Meera V.", txt: "Confirmed dispatch recommendation was effective.", ago: "27m" },
];

export function AlertsPanel() {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [incidents, setIncidents] = useState<EventBundle[]>([]);

  useEffect(() => {
    const loadDispatches = () => api.recentDispatches(12).then(setDispatches).catch(() => {});
    const loadIncidents = () => api.recentEvents(15).then(setIncidents).catch(() => {});
    
    loadDispatches();
    loadIncidents();
    
    const intervalD = setInterval(loadDispatches, 8000);
    const intervalI = setInterval(loadIncidents, 15000);
    return () => {
      clearInterval(intervalD);
      clearInterval(intervalI);
    };
  }, []);

  const activeIncidents = incidents.length > 0 ? incidents.length : 12; // Fallback to realistic mock if empty

  return (
    <div className="flex flex-col h-full gap-4 p-3 px-5 pb-6">
      
      {/* Top Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Active Incidents", value: activeIncidents, icon: Activity, color: "text-rose-400" },
          { label: "Critical Alerts", value: "3", icon: AlertTriangle, color: "text-amber-400" },
          { label: "Average Delay", value: "14m", icon: Clock, color: "text-indigo-400" },
          { label: "Affected Corridors", value: "5", icon: MapPin, color: "text-emerald-400" },
          { label: "Risk Index", value: "78", icon: TrendingUp, color: "text-purple-400" },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-3 flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
              <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
            </div>
            <div className={`p-2 rounded-xl bg-secondary/50 ${m.color}`}>
              <m.icon className="w-5 h-5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-4 flex-1 min-h-0">
        
        {/* LEFT COLUMN (70%) - Live Mobility Operations Panel */}
        <div className="xl:col-span-7 flex flex-col gap-4 min-h-0">
          
          {/* Interactive Map */}
          <div className="shrink-0">
            <div className="flex items-center gap-2 mb-2 ml-1">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <div className="text-sm font-semibold">Live Traffic Map</div>
            </div>
            <MapView
              center={null}
              currentLocation={null}
              source={null}
              destination={null}
              bestRoute={null}
              nearbyPois={[]}
              incidents={incidents}
              pickMode={null}
              onMapClick={() => {}}
            />
          </div>

          {/* Incident Timeline */}
          <div className="glass rounded-2xl p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-rose-400" />
              <div className="text-sm font-semibold">Incident Timeline</div>
            </div>
            <div className="overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {incidents.length > 0 ? incidents.map((inc, i) => (
                <motion.div
                  key={inc.event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 rounded-xl border border-border/50 bg-secondary/20 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white capitalize">{inc.event.event_cause.replace(/_/g, " ")}</div>
                    <div className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                      {new Date(inc.event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{inc.event.corridor}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px]">
                    <span className="text-rose-400 font-medium">Risk: {inc.riskScore.toFixed(0)}</span>
                    <span className="text-indigo-400 font-medium">Impact: {inc.predictedDurationHours.toFixed(1)} hrs</span>
                  </div>
                </motion.div>
              )) : (
                <div className="text-xs text-muted-foreground p-4 text-center">
                  No live incidents detected. Waiting for telemetry...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (30%) - Operations Intelligence Panel */}
        <div className="xl:col-span-3 flex flex-col gap-4 min-h-0">
          
          {/* Section 1: AI Recommendations */}
          <div className="glass rounded-2xl p-4 flex-1 flex flex-col min-h-0 max-h-[35%]">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="w-4 h-4 text-[var(--color-primary)]" />
              <div className="text-sm font-semibold">AI Recommendations</div>
            </div>
            <div className="overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {dispatches.length > 0 ? dispatches.map((d, i) => (
                <motion.div
                  key={`${d.target}-${i}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-2.5 rounded-xl border border-border/50 bg-[var(--gradient-cyber)]/10 flex items-start gap-3"
                >
                  <div className="p-1.5 rounded-lg bg-[var(--gradient-cyber)] text-background mt-0.5">
                    <Smartphone className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{d.target}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{d.body}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[9px]">
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {d.status}
                      </span>
                      {d.barricadeNeeded && (
                        <span className="flex items-center gap-1 text-warning">
                          <ShieldAlert className="w-2.5 h-2.5" /> barricades
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-xs text-muted-foreground p-3 text-center">
                  No active recommendations.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Agent Activity */}
          <div className="glass rounded-2xl p-4 flex-1 flex flex-col min-h-0 max-h-[35%]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <div className="text-sm font-semibold">Agent Activity</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            </div>
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              {MOCK_AGENTS.map((agent, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-xs">
                  <div className="font-medium text-white/90">{agent.name}</div>
                  <div className={`flex items-center gap-1.5 ${agent.color}`}>
                    {agent.status === "Running" || agent.status === "Processing" ? (
                      <Zap className="w-3 h-3 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider">{agent.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Feedback Loop */}
          <div className="glass rounded-2xl p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <div className="text-sm font-semibold">Feedback Loop</div>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {FEEDBACK_DATA.map((f, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-2.5 text-xs p-2 rounded-lg bg-secondary/10 hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--gradient-primary)] grid place-items-center text-[10px] font-bold text-primary-foreground shrink-0">
                    {f.who.split(" ")[1]?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white/90">{f.who}</div>
                    <div className="text-muted-foreground mt-0.5 leading-snug">{f.txt}</div>
                    <div className="text-[9px] text-muted-foreground/60 mt-1 uppercase font-semibold">{f.ago} ago</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
