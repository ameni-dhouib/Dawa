"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, RefreshCw, PackageCheck } from "lucide-react";

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

/** Sends one or several shipments from the central pharmacy. */
export function SendButton({
  items, label, variant = "quiet", origin = "forecast",
}: { items: Array<{ regionId: number; medicineId: number; quantity: number }>; label: string; variant?: "quiet" | "primary"; origin?: "forecast" | "manual" }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  if (!items.length) return null;
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={state !== "idle"}
        className={`${variant === "primary" ? "btn-primary" : "btn-quiet"} py-1.5 px-3 text-sm whitespace-nowrap`}
        onClick={async () => {
          setState("busy"); setError("");
          try { await post("/api/central/shipments", { items, origin }); setState("done"); router.refresh(); }
          catch (e) { setError((e as Error).message); setState("idle"); }
        }}
      >
        <Truck size={15} />
        {state === "busy" ? "Sending…" : state === "done" ? "Sent" : label}
      </button>
      {error && <span role="alert" className="text-xs text-alert mt-1 max-w-[16rem] text-right">{error}</span>}
    </span>
  );
}

export function DeliverButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className="btn-quiet py-1.5 px-3 text-sm" disabled={busy}
      onClick={async () => { setBusy(true); await post(`/api/central/shipments/${id}`, {}, "PATCH").catch(() => {}); router.refresh(); }}>
      <PackageCheck size={15} /> {busy ? "Saving…" : "Mark delivered"}
    </button>
  );
}

export function RetrainButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-col items-start sm:items-end gap-2">
      <button type="button" className="btn-primary" disabled={busy}
        onClick={async () => {
          setBusy(true); setMsg(null);
          try {
            const s = await post("/api/central/model", {});
            setMsg({ ok: true, text: `Trained ${s.series} models in ${s.duration_s} s. Average error ${s.mean_wape}%.` });
            router.refresh();
          } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
          setBusy(false);
        }}>
        <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
        {busy ? "Training 80 models…" : "Retrain model"}
      </button>
      {busy && <p className="text-xs text-ink-soft" role="status">This takes about 20 seconds.</p>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm rounded-md px-3 py-2 max-w-md ${msg.ok ? "bg-cross-soft text-cross-dark" : "bg-alert-soft text-alert"}`}>{msg.text}</p>}
    </div>
  );
}

export function ReceiveLotForm({ medicines }: { medicines: Array<{ id: number; name: string }> }) {
  const router = useRouter();
  const [f, setF] = useState({ medicineId: String(medicines[0]?.id ?? ""), lotNumber: "", quantity: "", expiryDate: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMsg(null);
      try {
        await post("/api/central/lots", { ...f, quantity: Number(f.quantity) });
        const name = medicines.find((m) => String(m.id) === f.medicineId)?.name;
        setMsg({ ok: true, text: `Received ${f.quantity} units of ${name}, lot ${f.lotNumber.toUpperCase()}.` });
        setF({ ...f, lotNumber: "", quantity: "", expiryDate: "" });
        router.refresh();
      } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
      setBusy(false);
    }}>
      <div>
        <label className="label" htmlFor="r-med">Medicine</label>
        <select id="r-med" className="input" value={f.medicineId} onChange={set("medicineId")}>
          {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="r-lot">Lot number</label>
          <input id="r-lot" className="input uppercase" required value={f.lotNumber} onChange={set("lotNumber")} />
        </div>
        <div>
          <label className="label" htmlFor="r-qty">Units</label>
          <input id="r-qty" className="input num" type="number" min={1} required value={f.quantity} onChange={set("quantity")} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="r-exp">Expiry date</label>
        <input id="r-exp" className="input num" type="date" required value={f.expiryDate} onChange={set("expiryDate")} />
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm rounded-md px-3 py-2 ${msg.ok ? "bg-cross-soft text-cross-dark" : "bg-alert-soft text-alert"}`}>{msg.text}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Add to central stock"}</button>
    </form>
  );
}

export function ShipmentForm({ regions, medicines, available }: {
  regions: Array<{ id: number; name: string }>; medicines: Array<{ id: number; name: string }>; available: Record<number, number>;
}) {
  const router = useRouter();
  const [f, setF] = useState({ regionId: String(regions[0]?.id ?? ""), medicineId: String(medicines[0]?.id ?? ""), quantity: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const avail = available[Number(f.medicineId)] ?? 0;
  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMsg(null);
      try {
        await post("/api/central/shipments", { regionId: Number(f.regionId), medicineId: Number(f.medicineId), quantity: Number(f.quantity), origin: "manual" });
        setMsg({ ok: true, text: "Shipment created. It is now in transit." });
        setF({ ...f, quantity: "" });
        router.refresh();
      } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
      setBusy(false);
    }}>
      <div>
        <label className="label" htmlFor="s-reg">Governorate</label>
        <select id="s-reg" className="input" value={f.regionId} onChange={set("regionId")}>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="s-med">Medicine</label>
        <select id="s-med" className="input" value={f.medicineId} onChange={set("medicineId")}>
          {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="s-qty">Units</label>
        <input id="s-qty" className="input num" type="number" min={1} max={avail} required value={f.quantity} onChange={set("quantity")} />
      </div>
      <button className="btn-primary" disabled={busy}><Truck size={16} /> {busy ? "Sending…" : "Send"}</button>
      <p className="text-xs text-ink-soft sm:col-span-4 num">{avail.toLocaleString("en-US")} usable units in central stock.</p>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`sm:col-span-4 text-sm rounded-md px-3 py-2 ${msg.ok ? "bg-cross-soft text-cross-dark" : "bg-alert-soft text-alert"}`}>{msg.text}</p>}
    </form>
  );
}
