export function SettingsPanel() {
  return (
    <div className="p-3 px-5 pb-6">
      <div className="glass rounded-2xl p-6">
        <div className="text-sm font-medium">Workspace Settings</div>
        <div className="text-xs text-muted-foreground">
          Configure agents, thresholds, and channels.
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
          {[
            { k: "Risk threshold for auto-dispatch", v: "≥ 65" },
            { k: "Default brief language", v: "English + Kannada" },
            { k: "Verifier strictness", v: "Strict" },
            { k: "Loop 4 feedback retention", v: "90 days" },
          ].map((s) => (
            <div key={s.k} className="flex justify-between p-3 rounded-xl bg-secondary/40 border border-border">
              <span className="text-muted-foreground">{s.k}</span>
              <span className="font-medium">{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
