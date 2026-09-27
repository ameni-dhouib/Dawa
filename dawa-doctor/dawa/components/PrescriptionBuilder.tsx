"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Check, Trash2, X } from "lucide-react";
import type { Locality, Region } from "@/lib/data";
import type { CatalogItem } from "@/lib/catalog";
import { fmtDateTime, fmtWait } from "@/lib/format";

type Line = { medicineId: string; dosage: string; quantity: number; durationDays: number };
type Patient = { name: string; idNumber: string; phone: string; street: string; localityId: string };
type Avail = "all" | "now" | "delivery";
type Sort = "name" | "available";

const EMPTY_PATIENT: Patient = { name: "", idNumber: "", phone: "", street: "", localityId: "" };
const DOSAGES = [
  "1 tablet once a day",
  "1 tablet twice a day",
  "1 tablet three times a day",
  "1 tablet in the morning",
  "1 tablet at bedtime",
  "1 capsule twice a day",
  "2 puffs when needed",
  "1 injection daily",
  "As needed, up to 3 times a day",
];

function Availability({ item, quantity = 1, compact = false }: { item: CatalogItem; quantity?: number; compact?: boolean }) {
  if (item.maxQty >= quantity) {
    return (
      <span className="flex items-center gap-2 text-sm text-cross">
        <span className="h-2 w-2 rounded-full bg-cross shrink-0" aria-hidden />
        {compact ? "In stock nearby" : `In stock at ${item.pharmacies} pharmac${item.pharmacies === 1 ? "y" : "ies"}`}
      </span>
    );
  }
  const partial = item.maxQty > 0;
  return (
    <span className="flex items-start gap-2 text-sm text-wait">
      <span className="h-2 w-2 rounded-full bg-wait shrink-0 mt-1.5" aria-hidden />
      <span>
        {partial ? `Only ${item.maxQty} at one pharmacy. ` : ""}
        Arrives in {fmtWait(item.eta.hours)}
        {!compact && <span className="block text-xs text-ink-soft">{fmtDateTime(item.eta.at)}{item.eta.source === "supplier" ? ", ordered from the supplier" : ""}</span>}
      </span>
    </span>
  );
}

export function PrescriptionBuilder({
  catalog, regionName, localities, regions,
}: { catalog: CatalogItem[]; regionName: string; localities: Locality[]; regions: Region[] }) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient>(EMPTY_PATIENT);
  const [errors, setErrors] = useState<Partial<Record<keyof Patient | "lines" | "form", string>>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [form, setForm] = useState("All");
  const [avail, setAvail] = useState<Avail>("all");
  const [sort, setSort] = useState<Sort>("name");

  const byId = useMemo(() => Object.fromEntries(catalog.map((c) => [c.id, c])), [catalog]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(catalog.map((c) => c.category)))], [catalog]);
  const forms = useMemo(() => ["All", ...Array.from(new Set(catalog.map((c) => c.form))).sort()], [catalog]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = catalog.filter((c) =>
      (!needle || `${c.name} ${c.strength} ${c.category} ${c.form}`.toLowerCase().includes(needle)) &&
      (category === "All" || c.category === category) &&
      (form === "All" || c.form === form) &&
      (avail === "all" || (avail === "now" ? c.maxQty > 0 : c.maxQty === 0))
    );
    return list.sort((a, b) =>
      sort === "available"
        ? b.pharmacies - a.pharmacies || a.eta.hours - b.eta.hours || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name)
    );
  }, [catalog, q, category, form, avail, sort]);

  const filtersActive = q || category !== "All" || form !== "All" || avail !== "all";
  const clearFilters = () => { setQ(""); setCategory("All"); setForm("All"); setAvail("all"); };

  const inCart = (id: string) => lines.some((l) => l.medicineId === id);
  const toggle = (id: string) => {
    setErrors((e) => ({ ...e, lines: undefined }));
    setLines((ls) => (ls.some((l) => l.medicineId === id) ? ls.filter((l) => l.medicineId !== id) : [...ls, { medicineId: id, dosage: "", quantity: 1, durationDays: 7 }]));
  };
  const setLine = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.medicineId === id ? { ...l, ...patch } : l)));
  const setField = (k: keyof Patient) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPatient((p) => ({ ...p, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function validate() {
    const e: typeof errors = {};
    if (!patient.name.trim()) e.name = "Enter the patient's full name.";
    if (!/^\d{8}$/.test(patient.idNumber.trim())) e.idNumber = "The CIN must be 8 digits.";
    if (patient.phone && !/^\+?[\d\s]{8,15}$/.test(patient.phone.trim())) e.phone = "Use digits only, for example +216 22 123 456.";
    if (!patient.street.trim()) e.street = "Enter the street address.";
    if (!patient.localityId) e.localityId = "Choose the town to sort pharmacies by distance.";
    if (!lines.length) e.lines = "Add at least one medicine from the list.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setBusy(true);
    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient, notes, lines }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setErrors({ form: data.error });
    }
    router.push(`/doctor/prescriptions/${data.id}?new=1`);
    router.refresh();
  }

  const field = (k: keyof Patient) => ({
    id: `p-${k}`,
    value: patient[k],
    onChange: setField(k),
    "aria-invalid": errors[k] ? ("true" as const) : undefined,
    "aria-describedby": errors[k] ? `p-${k}-err` : undefined,
    className: `input ${errors[k] ? "border-alert focus:border-alert focus:ring-alert/20" : ""}`,
  });
  const Err = ({ k }: { k: keyof Patient }) => (errors[k] ? <p id={`p-${k}-err`} className="text-xs text-alert mt-1">{errors[k]}</p> : null);

  const waiting = lines.filter((l) => byId[l.medicineId].maxQty < l.quantity);

  return (
    <div className="space-y-5">
      {/* Patient */}
      <section className="panel p-5 sm:p-6" aria-labelledby="patient-h">
        <h2 id="patient-h" className="text-lg font-semibold mb-4">Patient</h2>
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="label" htmlFor="p-name">Full name</label>
            <input {...field("name")} autoComplete="off" />
            <Err k="name" />
          </div>
          <div className="md:col-span-3">
            <label className="label" htmlFor="p-idNumber">CIN</label>
            <input {...field("idNumber")} className={`${field("idNumber").className} num`} inputMode="numeric" maxLength={8} placeholder="8 digits" />
            <Err k="idNumber" />
          </div>
          <div className="md:col-span-4">
            <label className="label" htmlFor="p-phone">Phone number</label>
            <input {...field("phone")} className={`${field("phone").className} num`} type="tel" placeholder="+216" />
            <Err k="phone" />
          </div>
          <div className="md:col-span-7">
            <label className="label" htmlFor="p-street">Street address</label>
            <input {...field("street")} placeholder="Building, street" />
            <Err k="street" />
          </div>
          <div className="md:col-span-5">
            <label className="label" htmlFor="p-localityId">Town</label>
            <select {...field("localityId")}>
              <option value="">Choose a town</option>
              {regions.map((r) => (
                <optgroup key={r.id} label={`${r.name} governorate`}>
                  {localities.filter((l) => l.regionId === r.id).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </optgroup>
              ))}
            </select>
            <Err k="localityId" />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] items-start">
        {/* Catalog */}
        <section className="panel overflow-hidden" aria-labelledby="catalog-h">
          <div className="p-5 sm:p-6 pb-4 border-b border-line space-y-4">
            <div>
              <h2 id="catalog-h" className="text-lg font-semibold">Medicines</h2>
              <p className="text-sm text-ink-soft">Stock shown for pharmacies in {regionName} governorate.</p>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" aria-hidden />
              <input
                type="search"
                className="input pl-10"
                placeholder="Search by name, strength or class"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search medicines"
              />
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Therapeutic class">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cross ${
                    category === c ? "bg-ink text-white border-ink" : "bg-white border-line text-ink hover:border-ink-faint"
                  }`}
                >
                  {c === "All" ? "All classes" : c}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label htmlFor="f-form" className="label">Form</label>
                <select id="f-form" className="input" value={form} onChange={(e) => setForm(e.target.value)}>
                  {forms.map((f) => <option key={f} value={f}>{f === "All" ? "All forms" : f}</option>)}
                </select>
              </div>
              <div>
                <span className="label" id="f-avail">Availability</span>
                <div className="inline-flex rounded-md border border-line p-0.5 bg-paper" role="radiogroup" aria-labelledby="f-avail">
                  {([["all", "All"], ["now", "In stock"], ["delivery", "Needs delivery"]] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={avail === v}
                      onClick={() => setAvail(v)}
                      className={`rounded px-3 py-2 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cross ${
                        avail === v ? "bg-white text-ink font-medium shadow-sm" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="f-sort" className="label">Sort by</label>
                <select id="f-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="name">Name, A to Z</option>
                  <option value="available">Most available first</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft num" aria-live="polite">{results.length} of {catalog.length} medicines</span>
              {filtersActive && (
                <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-cross font-medium hover:underline underline-offset-4">
                  <X size={15} /> Clear filters
                </button>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium">No medicine matches these filters</p>
              <p className="text-sm text-ink-soft mt-1">Try another spelling or widen the class and form.</p>
              <button type="button" onClick={clearFilters} className="btn-quiet mt-4">Clear filters</button>
            </div>
          ) : (
            <ul className="divide-y divide-line lg:max-h-[620px] lg:overflow-y-auto">
              {results.map((m) => {
                const added = inCart(m.id);
                return (
                  <li key={m.id} className={`px-5 sm:px-6 py-3.5 grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center ${added ? "bg-cross-soft/40" : ""}`}>
                    <div className="min-w-0">
                      <p className="font-semibold">{m.name} {m.strength}</p>
                      <p className="text-xs text-ink-soft">{m.form}, {m.pack.toLowerCase()}. {m.category}</p>
                    </div>
                    <Availability item={m} />
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-pressed={added}
                      aria-label={added ? `Remove ${m.name} from prescription` : `Add ${m.name} to prescription`}
                      className={`${added ? "btn bg-cross-soft text-cross-dark border border-cross/30 hover:bg-cross-soft/60" : "btn-quiet"} py-2 px-3.5 text-sm justify-self-start sm:justify-self-end`}
                    >
                      {added ? <><Check size={16} /> Added</> : <><Plus size={16} /> Add</>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Prescription */}
        <section className="panel lg:sticky lg:top-6" aria-labelledby="rx-h">
          <div className="p-5 sm:p-6 pb-4 border-b border-line flex items-baseline justify-between">
            <h2 id="rx-h" className="text-lg font-semibold">Prescription</h2>
            <span className="text-sm text-ink-soft num">{lines.length} medicine{lines.length === 1 ? "" : "s"}</span>
          </div>

          {lines.length === 0 ? (
            <div className={`m-5 rounded-lg border border-dashed p-6 text-center text-sm ${errors.lines ? "border-alert text-alert" : "border-line text-ink-soft"}`}>
              {errors.lines ?? "Add medicines from the list. You set the dosage and duration here."}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => {
                const m = byId[l.medicineId];
                return (
                  <li key={l.medicineId} className="px-5 sm:px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{m.name} {m.strength}</p>
                        <div className="mt-0.5"><Availability item={m} quantity={l.quantity} compact /></div>
                      </div>
                      <button type="button" onClick={() => toggle(m.id)} className="btn-ghost p-2 -mr-2" aria-label={`Remove ${m.name}`}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_76px_76px] gap-2 mt-3">
                      <div>
                        <label className="text-xs text-ink-soft" htmlFor={`d-${m.id}`}>How to take it</label>
                        <input id={`d-${m.id}`} list="dosages" className="input py-2" placeholder="1 tablet twice a day" value={l.dosage} onChange={(e) => setLine(m.id, { dosage: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-ink-soft" htmlFor={`q-${m.id}`}>Boxes</label>
                        <input id={`q-${m.id}`} type="number" min={1} max={20} className="input py-2 num" value={l.quantity} onChange={(e) => setLine(m.id, { quantity: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} />
                      </div>
                      <div>
                        <label className="text-xs text-ink-soft" htmlFor={`t-${m.id}`}>Days</label>
                        <input id={`t-${m.id}`} type="number" min={1} className="input py-2 num" value={l.durationDays} onChange={(e) => setLine(m.id, { durationDays: Math.max(1, Number(e.target.value) || 1) })} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <datalist id="dosages">{DOSAGES.map((d) => <option key={d} value={d} />)}</datalist>

          <div className="p-5 sm:p-6 border-t border-line space-y-4">
            <div>
              <label className="label" htmlFor="notes">Notes for the patient</label>
              <textarea id="notes" rows={2} className="input" placeholder="Follow-up, precautions" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {lines.length > 0 && (
              <p className="text-sm text-ink-soft">
                {waiting.length === 0
                  ? `All ${lines.length} can be collected today in ${regionName}.`
                  : `${lines.length - waiting.length} ready today, ${waiting.length} will be delivered from the central pharmacy.`}
              </p>
            )}
            {errors.form && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-md px-3 py-2">{errors.form}</p>}
            {Object.keys(errors).some((k) => k !== "form" && errors[k as keyof typeof errors]) && (
              <p role="alert" className="text-sm text-alert">Some details are missing. Check the highlighted fields.</p>
            )}
            <button type="button" onClick={submit} className="btn-primary w-full" disabled={busy}>
              {busy ? "Preparing transcript…" : "Issue prescription"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
