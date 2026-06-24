import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Cpu,
  Bell,
  Workflow,
  Settings,
  Zap,
  Map,
} from "lucide-react";

export type SectionId =
  | "overview"
  | "events"
  | "models"
  | "alerts"
  | "pipeline"
  | "map"
  | "settings";

const items: { id: SectionId; label: string; icon: typeof LayoutDashboard; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "events", label: "Event Feed", icon: Activity },
  { id: "models", label: "Model Matrix", icon: Cpu },
  { id: "alerts", label: "Dispatch", icon: Bell },
  { id: "pipeline", label: "Pipeline", icon: Workflow },
  { id: "map", label: "Map", icon: Map },
  { id: "settings", label: "Settings", icon: Settings },
];

interface Props {
  active: SectionId;
  onChange: (id: SectionId) => void;
}

export function Sidebar({ active, onChange }: Props) {
  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col glass rounded-2xl m-3 mr-0 p-4 sticky top-3 h-[calc(100vh-1.5rem)]">
      <div className="flex items-center gap-2.5 px-2 py-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-[var(--gradient-cyber)] grid place-items-center glow">
            <Zap className="w-5 h-5 text-background" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success pulse-ring" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sm tracking-wide">COGNITIVE</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Traffic Orchestrator
          </div>
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-secondary/60"
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-[var(--gradient-primary)] opacity-90"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={`relative w-4 h-4 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              />
              <span
                className={`relative flex-1 ${
                  isActive ? "text-primary-foreground font-medium" : "text-foreground/80"
                }`}
              >
                {item.label}
              </span>
              {item.badge && (
                <span
                  className={`relative text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                    isActive
                      ? "bg-background/30 text-primary-foreground"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto glass rounded-xl p-3 text-xs">
        <div className="flex items-center gap-2 text-success">
          <span className="w-2 h-2 rounded-full bg-success pulse-ring" />
          OpenVINO Edge Online
        </div>
        <div className="mt-1 text-muted-foreground">22 corridors Â· 47 cameras</div>
      </div>
    </aside>
  );
}
