import { Search, Bell, ChevronDown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function TopBar({
  title,
  subtitle,
  onAIBrief,
}: {
  title: string;
  subtitle: string;
  onAIBrief?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 px-5">
      <div>
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          {title}
        </motion.h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 glass px-3 py-2 rounded-xl w-72">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search corridors, events, agents…"
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">⌘K</kbd>
        </div>
        <button className="glass p-2.5 rounded-xl relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-magenta" />
        </button>
        <button
          onClick={onAIBrief}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--gradient-primary)] text-primary-foreground font-medium text-sm glow hover:opacity-90 transition-opacity active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          AI Brief
        </button>
        <div className="glass flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl">
          <div className="w-7 h-7 rounded-lg bg-[var(--gradient-cyber)] grid place-items-center text-xs font-bold text-background">
            BT
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-xs font-medium">Bengaluru Traffic</div>
            <div className="text-[10px] text-muted-foreground">Operator</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
