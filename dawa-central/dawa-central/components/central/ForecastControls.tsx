"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { SendButton } from "./Actions";
import { StatusPill, days } from "./ui";
import type { SeriesPlan } from "@/lib/central/service";

export function SeriesPicker({ regions, medicines, region, med }: {
  regions: Array<{ id: number; name: string }>; medicines: Array<{ id: number; name: string }>; region: number; med: number;
}) {
  const router = useRouter();
  const go = (r: number, m: number) => router.push(`/admin/forecast?region=${r}&med=${m}#series`, { scroll: false });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="fc-region">Governorate</label>
        <select id="fc-region" className="input" value={region} onChange={(e) => go(Number(e.target.value), med)}>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="fc-med">Medicine</label>
        <select id="fc-med" className="input" value={med} onChange={(e) => go(region, Number(e.target.value))}>
          {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
    </div>
  );
}

export function PlanTable({ plans, regionNames, medNames }: { plans: SeriesPlan[]; regionNames: Record<number, string>; medNames: Record<number, string> }) {
  const [onlyNeeded, setOnlyNeeded] = useState(true);
  const [region, setRegion] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 15;
  const rows = useMemo(() => plans
    .filter((p) => (!onlyNeeded || p.recommended > 0) && (region === "all" || String(p.regionId) === region))
    .sort((a, b) => a.coverDays - b.coverDays), [plans, onlyNeeded, region]);
  const needed = rows.filter((p) => p.recommended > 0);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="label" htmlFor="pt-region">Governorate</label>
          <select id="pt-region" className="input w-48" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All governorates</option>
            {Object.entries(regionNames).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm pb-2.5 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-[#0B7A55]" checked={onlyNeeded} onChange={(e) => setOnlyNeeded(e.target.checked)} />
          Only lines that need stock
        </label>
        <div className="flex gap-2 ml-auto">
          <a href="/api/central/export" className="btn-quiet py-2 text-sm"><Download size={15} /> Export CSV</a>
          <SendButton variant="primary" label={`Send ${needed.length} shown`} items={needed.map((p) => ({ regionId: p.regionId, medicineId: p.medicineId, quantity: p.recommended }))} />
        </div>
      </div>
      <p className="text-sm text-ink-soft mb-2 num" aria-live="polite">{rows.length} of {plans.length} lines, shortest cover first</p>
      <div className="overflow-x-auto -mx-5 border-t border-line">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr>
              <th className="th">Governorate</th>
              <th className="th">Medicine</th>
              <th className="th text-right">Current stock</th>
              <th className="th text-right">On the way</th>
              <th className="th text-right">Predicted demand</th>
              <th className="th text-right">Days short</th>
              <th className="th text-right">Lasts</th>
              <th className="th">Status</th>
              <th className="th text-right">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {(showAll ? rows : rows.slice(0, LIMIT)).map((p) => (
              <tr key={`${p.regionId}-${p.medicineId}`} className="hover:bg-paper/60">
                <td className="td">{regionNames[p.regionId]}</td>
                <td className="td font-medium">
                  <a href={`/admin/forecast?region=${p.regionId}&med=${p.medicineId}#series`} className="hover:underline underline-offset-4">{medNames[p.medicineId]}</a>
                </td>
                <td className="td text-right num">{p.stock}</td>
                <td className="td text-right num text-ink-soft">{p.inTransit || "–"}</td>
                <td className="td text-right num">{p.demand}</td>
                <td className={`td text-right num ${p.shortageDays ? "text-alert font-semibold" : "text-ink-faint"}`}>{p.shortageDays || "0"}</td>
                <td className="td text-right num">{days(p.coverDays)}</td>
                <td className="td"><StatusPill status={p.status} /></td>
                <td className="td text-right">
                  {p.recommended > 0
                    ? <SendButton label={`Send ${p.recommended}`} items={[{ regionId: p.regionId, medicineId: p.medicineId, quantity: p.recommended }]} />
                    : <span className="text-sm text-ink-faint">No action</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="td text-center text-ink-soft py-8">Nothing to send. Every line is covered for next month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > LIMIT && (
        <button type="button" className="btn-quiet mt-4" onClick={() => setShowAll((v) => !v)}>
          {showAll ? `Show the ${LIMIT} most urgent` : `Show all ${rows.length} lines`}
        </button>
      )}
    </div>
  );
}
