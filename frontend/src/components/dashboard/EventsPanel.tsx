import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Activity,
  AlertTriangle,
  Zap,
  MapPin,
  TrendingUp,
  BrainCircuit,
  Filter,
  Languages,
  Clock,
  ShieldCheck,
  Megaphone,
  Play,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, type EventBundle } from "@/lib/api";

type LocalEvent = {
  id: string;
  timestamp: string;
  type: string;
  camera: string;
  location: string;
  severity: "high" | "medium" | "low";
  agent: string;
  status: string;
  rawText: string;
  translatedText: string;
  confidence: number;
};

const MOCK_LOCATIONS = ["Silk Board Junction", "Marathahalli Bridge", "Koramangala 80ft Road", "Indiranagar 100ft", "Whitefield Main Rd"];
const MOCK_CAMERAS = ["CAM-SILK-01", "CAM-MARA-44", "CAM-KORA-12", "CAM-INDI-09", "CAM-WHIT-88"];
const MOCK_TYPES = ["Congestion Cascade", "Vehicle Breakdown", "Waterlogging", "Signal Failure", "Minor Accident"];
const MOCK_AGENTS = ["OpenVINO Edge", "Spatial Agent", "Risk Engine", "Recommendation Agent", "Dispatch Coordinator"];

function generateMockEvent(): LocalEvent {
  const isHigh = Math.random() > 0.8;
  const isMed = Math.random() > 0.5;
  const severity = isHigh ? "high" : isMed ? "medium" : "low";
  const type = MOCK_TYPES[Math.floor(Math.random() * MOCK_TYPES.length)];
  const loc = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];

  return {
    id: `ev-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toLocaleTimeString(),
    type,
    camera: MOCK_CAMERAS[Math.floor(Math.random() * MOCK_CAMERAS.length)],
    location: loc,
    severity,
    agent: MOCK_AGENTS[Math.floor(Math.random() * MOCK_AGENTS.length)],
    status: Math.random() > 0.7 ? "Resolved" : "Active",
    rawText: `ರಸ್ತೆಯಲ್ಲಿ ವಾಹನ ದಟ್ಟಣೆ (${type}) near ${loc}`,
    translatedText: `${type} detected. Significant delays expected.`,
    confidence: Math.floor(Math.random() * 15) + 85,
  };
}

const COLORS = ["#34d399", "#fbbf24", "#f43f5e", "#60a5fa", "#a78bfa"];

export function EventsPanel() {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs for intervals and state to avoid stale closures
  const isDemoRef = useRef(false);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadLive = async () => {
      try {
        const bundles = await api.recentEvents(20);
        if (bundles && bundles.length > 0) {
          setIsDemo(false);
          isDemoRef.current = false;
          if (mockIntervalRef.current) {
            clearInterval(mockIntervalRef.current);
            mockIntervalRef.current = null;
          }
          const mapped = bundles.map((b) => ({
            id: b.event.id,
            timestamp: new Date(b.event.timestamp).toLocaleTimeString(),
            type: b.event.event_cause.replace(/_/g, " "),
            camera: "Live Feed",
            location: b.event.corridor,
            severity: b.riskScore >= 70 ? "high" : b.riskScore >= 40 ? "medium" : ("low" as const),
            agent: "Live Agent Pipeline",
            status: "Active",
            rawText: b.event.description,
            translatedText: b.event.event_cause.replace(/_/g, " "),
            confidence: 95,
          }));
          setEvents(mapped);
        } else {
          startDemo();
        }
      } catch (e) {
        startDemo();
      }
    };

    const startDemo = () => {
      if (isDemoRef.current) return;
      setIsDemo(true);
      isDemoRef.current = true;
      setEvents(Array.from({ length: 5 }).map(generateMockEvent));
      mockIntervalRef.current = setInterval(() => {
        setEvents((prev) => {
          const newEv = generateMockEvent();
          return [newEv, ...prev].slice(0, 30); // Keep last 30
        });
      }, 4000);
    };

    loadLive();
    const livePoll = setInterval(loadLive, 10000);

    return () => {
      clearInterval(livePoll);
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
    };
  }, []);

  const handleTriggerMock = async () => {
    try {
      setTriggering(true);
      const b = await api.triggerEvent();
      const newEv: LocalEvent = {
        id: b.event.id,
        timestamp: new Date(b.event.timestamp).toLocaleTimeString(),
        type: b.event.event_cause.replace(/_/g, " "),
        camera: "Edge Trigger",
        location: b.event.corridor,
        severity: b.riskScore >= 70 ? "high" : b.riskScore >= 40 ? "medium" : "low",
        agent: "Mock Trigger",
        status: "Active",
        rawText: b.event.description,
        translatedText: b.event.event_cause.replace(/_/g, " "),
        confidence: 99,
      };

      setIsDemo(false);
      isDemoRef.current = false;
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
        mockIntervalRef.current = null;
      }

      setEvents(prev => [newEv, ...prev]);
    } catch (e) {
      console.error("Failed to trigger mock event:", e);
    } finally {
      setTriggering(false);
    }
  };

  const latestEvent = events[0] || generateMockEvent();

  const kpis = [
    { label: "Active Cameras", value: "244", icon: Camera, color: "text-blue-400" },
    { label: "Processed Today", value: "8,291", icon: Activity, color: "text-emerald-400" },
    { label: "Active Alerts", value: events.filter(e => e.severity === 'high').length + 3, icon: AlertTriangle, color: "text-rose-500" },
    { label: "Avg Risk Score", value: "68", icon: TrendingUp, color: "text-amber-400" },
    { label: "Active Corridors", value: "14", icon: MapPin, color: "text-purple-400" },
  ];

  // Mock chart data
  const riskTrendData = events.slice(0, 15).reverse().map((e, i) => ({
    time: i,
    risk: e.severity === 'high' ? 85 + Math.random() * 10 : e.severity === 'medium' ? 50 + Math.random() * 20 : 20 + Math.random() * 15
  }));

  const typeDist = MOCK_TYPES.map(t => ({
    name: t,
    value: events.filter(e => e.type === t).length || Math.floor(Math.random() * 10) + 1
  }));

  return (
    <div className="flex flex-col h-full gap-4 p-3 px-5 pb-6 overflow-y-auto custom-scrollbar">

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
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
              <div className={`text-xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</div>
            </div>
            <div className={`p-2 rounded-lg bg-secondary/50 ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-[400px]">

        {/* Main Event Timeline (Span 8) */}
        <div className="xl:col-span-8 glass rounded-xl p-4 border border-border/50 flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <div className="text-sm font-semibold">Live Operational Event Stream</div>
              {isDemo && (
                <span className="ml-2 px-2 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest animate-pulse">
                  Demo Mode
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleTriggerMock}
                disabled={triggering}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--gradient-primary)] text-white shadow-[0_0_15px_rgba(123,44,191,0.4)] hover:shadow-[0_0_20px_rgba(123,44,191,0.6)] transition-all disabled:opacity-50 mr-2"
              >
                {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
                Trigger mock event
              </button>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" /> High
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Medium
              </div>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {events.map((ev, i) => {
                const color = ev.severity === "high" ? "border-rose-500/30 bg-rose-500/10"
                  : ev.severity === "medium" ? "border-amber-500/30 bg-amber-500/10"
                    : "border-emerald-500/30 bg-emerald-500/5";
                const dotColor = ev.severity === "high" ? "bg-rose-500" : ev.severity === "medium" ? "bg-amber-500" : "bg-emerald-500";

                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`p-3 rounded-xl border flex items-start gap-3 backdrop-blur-sm ${color}`}
                  >
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${dotColor} ${i === 0 ? 'animate-ping' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-semibold text-sm text-white truncate capitalize">{ev.type}</div>
                        <div className="text-[10px] text-muted-foreground font-mono bg-black/40 px-2 py-0.5 rounded whitespace-nowrap">
                          [{ev.timestamp}]
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase">Camera / Source</div>
                          <div className="text-xs font-mono text-cyan-300">{ev.camera}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase">Location</div>
                          <div className="text-xs text-white truncate">{ev.location}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase">Agent</div>
                          <div className="text-xs text-purple-300 truncate">{ev.agent}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase">Status</div>
                          <div className="text-xs text-emerald-300">{ev.status}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panels (Span 4) */}
        <div className="xl:col-span-4 flex flex-col gap-4">

          {/* Latest AI Insight */}
          <div className="glass rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="w-4 h-4 text-[var(--color-primary)]" />
              <div className="text-sm font-semibold">Latest AI Insight</div>
            </div>
            <div className="p-3 bg-[var(--gradient-cyber)]/10 border border-[var(--color-primary)]/20 rounded-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-primary)]/20 blur-2xl rounded-full" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Traffic Summary</div>
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                {latestEvent.severity === 'high' ? 'Severe ' : 'Moderate '}
                <span className="text-[var(--color-primary)]">{latestEvent.type.toLowerCase()}</span> detected near {latestEvent.location}.
                Immediate attention recommended. Expected delay: {latestEvent.severity === 'high' ? '25' : '10'} minutes.
              </p>
            </div>
          </div>

          {/* Latest Imputation */}
          <div className="glass rounded-xl p-4 border border-border/50 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="w-4 h-4 text-emerald-400" />
              <div className="text-sm font-semibold">Latest Imputation Pipeline</div>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Original Event (Kannada/Raw)</span>
                  <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded">Source</span>
                </div>
                <div className="text-xs font-mono text-amber-200/90 break-all">
                  {latestEvent.rawText}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="bg-emerald-500/20 text-emerald-400 rounded-full p-1 border border-emerald-500/30">
                  <Filter className="w-3 h-3" />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Imputed English Mapping</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {latestEvent.confidence}% Conf
                  </span>
                </div>
                <div className="text-sm font-medium text-white">
                  {latestEvent.translatedText}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Section: Event Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 h-[220px]">

        {/* Risk Trend */}
        <div className="glass rounded-xl p-4 border border-border/50 flex flex-col">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground uppercase">
            <TrendingUp className="w-3 h-3" /> System Risk Trend
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrendData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a14', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="risk" stroke="#f43f5e" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Types */}
        <div className="glass rounded-xl p-4 border border-border/50 flex flex-col">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground uppercase">
            <Activity className="w-3 h-3" /> Event Types Distribution
          </div>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {typeDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a14', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Activity */}
        <div className="glass rounded-xl p-4 border border-border/50 flex flex-col">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground uppercase">
            <ShieldCheck className="w-3 h-3" /> Agent Execution Volume
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Img/Text', val: 120 },
                { name: 'Spatial', val: 98 },
                { name: 'Risk', val: 86 },
                { name: 'RAG', val: 45 },
                { name: 'Dispatch', val: 32 },
              ]}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0a0a14', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="val" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
