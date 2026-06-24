import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api, type DashboardSummary } from "@/lib/api";

const PIE_COLORS = [
  "oklch(0.7 0.2 195)",
  "oklch(0.65 0.25 25)",
  "oklch(0.82 0.18 85)",
  "oklch(0.7 0.27 340)",
  "oklch(0.66 0.24 295)",
];

const AGENT_HEALTH = [
  { name: "Multilingual Imputation", load: 72, color: "var(--primary)" },
  { name: "Spatial Mapping", load: 54, color: "var(--accent)" },
  { name: "LightGBM Predictor", load: 81, color: "var(--magenta)" },
  { name: "RAG Analogue", load: 38, color: "var(--success)" },
  { name: "Verifier Grader", load: 26, color: "var(--info)" },
];

export function Overview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => api.dashboardSummary().then((s) => !cancelled && setSummary(s)).catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const kpis = [
    {
      label: "Active Events (this session)",
      value: summary ? String(summary.kpis.activeEvents) : "—",
      icon: Activity,
      accent: "from-[oklch(0.66_0.24_295)] to-[oklch(0.7_0.27_340)]",
    },
    {
      label: "Historical High-Priority Rate",
      value: summary ? `${summary.kpis.avgRiskIndex}%` : "—",
      icon: AlertTriangle,
      accent: "from-[oklch(0.82_0.18_85)] to-[oklch(0.65_0.25_25)]",
    },
    {
      label: "Avg Predicted Clearance",
      value: summary?.kpis.predictedClearanceHours != null ? `${summary.kpis.predictedClearanceHours}h` : "—",
      icon: Clock,
      accent: "from-[oklch(0.7_0.2_195)] to-[oklch(0.66_0.24_295)]",
    },
    {
      label: "Briefs Dispatched (this session)",
      value: summary ? String(summary.kpis.briefsDispatched) : "—",
      icon: TrendingUp,
      accent: "from-[oklch(0.75_0.2_155)] to-[oklch(0.7_0.2_195)]",
    },
  ];

  const causeData = summary?.causeData ?? [];
  const corridorData = summary?.corridorData ?? [];
  const flowData = summary?.flowData ?? [];

  return (
    <div className="grid gap-4 p-3 px-5 pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-4 relative overflow-hidden"
            >
              <div
                className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${k.accent} opacity-20 blur-2xl`}
              />
              <div className={`p-2 rounded-lg bg-gradient-to-br ${k.accent} text-background w-fit`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-4 xl:col-span-2"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium">Event Volume vs High-Priority Rate · By Hour</div>
              <div className="text-xs text-muted-foreground">
                Computed from the historical SQLite event log
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Events
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" /> High-priority %
              </span>
            </div>
          </div>
          <div className="h-64">
            {flowData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.66 0.24 295)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="oklch(0.66 0.24 295)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.2 195)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.7 0.2 195)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="h" stroke="oklch(0.72 0.03 260)" fontSize={10} />
                  <YAxis stroke="oklch(0.72 0.03 260)" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.2 0.04 270)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="congestion" stroke="oklch(0.66 0.24 295)" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="risk" stroke="oklch(0.7 0.2 195)" fill="url(#g2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-xs text-muted-foreground">
                Loading historical data…
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-4"
        >
          <div className="text-sm font-medium">Event Causes</div>
          <div className="text-xs text-muted-foreground">Share of historical dataset</div>
          <div className="h-44">
            {causeData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={causeData} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={3} stroke="none">
                    {causeData.map((c, i) => (
                      <Cell key={c.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.2 0.04 270)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-xs text-muted-foreground">Loading…</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs mt-2">
            {causeData.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-muted-foreground">{c.name}</span>
                <span className="ml-auto font-medium">{c.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-4 xl:col-span-2"
        >
          <div className="text-sm font-medium">Corridor Event Load</div>
          <div className="text-xs text-muted-foreground">Top contributing arterials in the historical dataset</div>
          <div className="h-56">
            {corridorData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={corridorData}>
                  <defs>
                    <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.27 340)" />
                      <stop offset="100%" stopColor="oklch(0.66 0.24 295)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.72 0.03 260)" fontSize={10} />
                  <YAxis stroke="oklch(0.72 0.03 260)" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.2 0.04 270)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="url(#bar1)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-xs text-muted-foreground">Loading…</div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-4"
        >
          <div className="text-sm font-medium">Agent Health</div>
          <div className="text-xs text-muted-foreground">Multi-Agent Control Plane (illustrative)</div>
          <div className="mt-3 space-y-3">
            {AGENT_HEALTH.map((a) => (
              <div key={a.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground/80">{a.name}</span>
                  <span className="text-muted-foreground">{a.load}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${a.load}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    style={{ background: a.color }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
