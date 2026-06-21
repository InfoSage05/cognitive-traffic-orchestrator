import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, CheckCircle2, ShieldAlert } from "lucide-react";
import { api, type DispatchRecord } from "@/lib/api";

export function AlertsPanel() {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);

  useEffect(() => {
    const load = () => api.recentDispatches(12).then(setDispatches).catch(() => {});
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-3 px-5 pb-6">
      <div className="xl:col-span-2 glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">Dispatch Channel</div>
            <div className="text-xs text-muted-foreground">
              Verified briefs sent via the Model Matrix "Deploy Field Alert" action
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {dispatches.map((d, i) => (
            <motion.div
              key={`${d.target}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="p-3 rounded-xl border border-border bg-secondary/30 flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-[var(--gradient-cyber)] text-background">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{d.target}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{d.body}</div>
                <div className="flex items-center gap-2 mt-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{d.channel}</span>
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="w-3 h-3" /> {d.status}
                  </span>
                  {d.barricadeNeeded && (
                    <span className="flex items-center gap-1 text-warning">
                      <ShieldAlert className="w-3 h-3" /> barricades · {d.manpower} officers
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {!dispatches.length && (
            <div className="text-xs text-muted-foreground p-3">
              No dispatches yet — deploy a field alert from the Model Matrix tab.
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="text-sm font-medium">Feedback Loop · Hill-Climbing</div>
        <div className="text-xs text-muted-foreground mb-3">
          Operator corrections feed into Loop 4 (qualitative log)
        </div>
        <div className="space-y-3">
          {[
            { who: "Op. Kavya R.", txt: "Switched divert route to Ulsoor Lake side.", ago: "3m" },
            { who: "Op. Arjun S.", txt: "Marked waterlogging severity as critical.", ago: "11m" },
            { who: "Op. Meera V.", txt: "Confirmed dispatch recommendation was effective.", ago: "27m" },
          ].map((f, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <div className="w-7 h-7 rounded-lg bg-[var(--gradient-primary)] grid place-items-center text-[10px] font-bold text-primary-foreground">
                {f.who.split(" ")[1]?.[0]}
              </div>
              <div className="flex-1">
                <div className="font-medium">{f.who}</div>
                <div className="text-muted-foreground">{f.txt}</div>
                <div className="text-[10px] text-muted-foreground/70">{f.ago} ago</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
