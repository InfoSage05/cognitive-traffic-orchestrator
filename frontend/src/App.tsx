import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar, type SectionId } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { Overview } from "@/components/dashboard/Overview";
import { EventsPanel } from "@/components/dashboard/EventsPanel";
import { ModelMatrix } from "@/components/dashboard/ModelMatrix";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { PipelinePanel } from "@/components/dashboard/PipelinePanel";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { MapDashboard } from "@/components/dashboard/map/MapDashboard";

const META: Record<SectionId, { title: string; subtitle: string }> = {
  overview: { title: "Operations Overview", subtitle: "Real-time pulse across Bengaluru corridors" },
  events: { title: "Event Feed", subtitle: "OpenVINO edge stream with multilingual imputation" },
  models: { title: "Model Matrix", subtitle: "Risk · LightGBM · Nearest-Neighbour RAG" },
  alerts: { title: "Dispatch Channel", subtitle: "Verified briefs streaming to field units" },
  pipeline: { title: "Pipeline", subtitle: "Loop engineering across ingestion to dispatch" },
  map: { title: "Mobility Map", subtitle: "Route planning, nearby discovery & emergency mode" },
  settings: { title: "Settings", subtitle: "Workspace configuration" },
};

export default function App() {
  const [section, setSection] = useState<SectionId>("overview");
  const meta = META[section];

  return (
    <div className="min-h-screen flex">
      <Sidebar active={section} onChange={setSection} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={meta.title} subtitle={meta.subtitle} />

        <div className="lg:hidden px-5 pb-1 flex gap-1.5 overflow-x-auto">
          {(Object.keys(META) as SectionId[]).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs ${
                section === s
                  ? "bg-[var(--gradient-primary)] text-primary-foreground"
                  : "glass text-muted-foreground"
              }`}
            >
              {META[s].title.split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {section === "overview" && <Overview />}
              {section === "events" && <EventsPanel />}
              {section === "models" && <ModelMatrix />}
              {section === "alerts" && <AlertsPanel />}
              {section === "pipeline" && <PipelinePanel />}
              {section === "map" && <MapDashboard />}
              {section === "settings" && <SettingsPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
