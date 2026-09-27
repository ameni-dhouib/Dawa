import type { Status } from "@/lib/central/service";

export function StatusPill({ status }: { status: Status | "critical" | "reorder" | "healthy" }) {
  const map = {
    critical: ["bg-alert-soft text-alert", "Critical"],
    low: ["bg-wait-soft text-wait", "Low"],
    reorder: ["bg-wait-soft text-wait", "Reorder"],
    ok: ["bg-cross-soft text-cross-dark", "Covered"],
    healthy: ["bg-cross-soft text-cross-dark", "Healthy"],
  } as const;
  const [cls, label] = map[status];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function Stat({ label, value, note, tone = "ink" }: { label: string; value: string; note?: string; tone?: "ink" | "wait" | "alert" | "cross" }) {
  const color = { ink: "text-ink", wait: "text-wait", alert: "text-alert", cross: "text-cross" }[tone];
  return (
    <div className="panel px-5 py-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`text-[30px] font-bold tracking-tight num leading-tight mt-1 ${color}`}>{value}</p>
      {note && <p className="text-xs text-ink-soft mt-1">{note}</p>}
    </div>
  );
}

export function Panel({ title, description, action, children, className = "" }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      <div className="px-5 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-ink-soft mt-0.5 max-w-[70ch]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

export function NoModel() {
  return (
    <div className="panel p-8 text-center">
      <p className="font-semibold">No forecast yet</p>
      <p className="text-sm text-ink-soft mt-1">Train the model from the Demand forecast page, or run <code className="bg-paper px-1.5 py-0.5 rounded">npm run ml</code>.</p>
    </div>
  );
}

export const days = (d: number) => (d >= 999 ? "No demand" : d < 1 ? "Out" : `${Math.round(d)} d`);
