import Link from "next/link";
import { PageHeader } from "@/components/AppShell";
import { ForecastChart } from "@/components/central/Charts";
import { SendButton } from "@/components/central/Actions";
import { NoModel, Panel, Stat, StatusPill, days } from "@/components/central/ui";
import {
  PLANNING, centralPlans, latestRun, medicines, nationalForecast, nationalMonthly, regionalPlans, regions, lastHistoryMonth,
} from "@/lib/central/service";
import { fmtDateTime, fmtInt, fmtMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

function cellTone(cover: number) {
  if (cover < PLANNING.criticalDays) return "bg-alert-soft text-alert";
  if (cover < 30) return "bg-wait-soft text-wait";
  if (cover < 60) return "bg-cross-soft/60 text-cross-dark";
  return "bg-cross-soft text-cross-dark";
}

export default function CentralOverview() {
  const run = latestRun();
  const regs = regions(), meds = medicines();
  const plans = regionalPlans();
  const central = centralPlans(plans);
  const rName = Object.fromEntries(regs.map((r) => [r.id, r.name]));
  const mName = Object.fromEntries(meds.map((m) => [m.id, m.name]));

  const usable = central.reduce((s, c) => s + c.usable, 0);
  const nationalDemand = central.reduce((s, c) => s + c.nationalDemand, 0);
  const regionalUnits = plans.reduce((s, p) => s + p.stock, 0);
  const critical = plans.filter((p) => p.status === "critical").length;
  const low = plans.filter((p) => p.status === "low").length;
  const expiring = central.reduce((s, c) => s + c.expiringSoon, 0);
  const urgent = plans.filter((p) => p.recommended > 0).sort((a, b) => a.coverDays - b.coverDays);
  const lastMonth = lastHistoryMonth();

  // national totals across medicines, last 24 months + forecast
  const byMonth = new Map<string, number>();
  for (const r of nationalMonthly()) byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + r.units);
  const hist = Array.from(byMonth.entries()).slice(-24).map(([month, units]) => ({ month, actual: units }));
  const fc = run ? nationalForecast(run.id) : [];
  const chart: Array<Record<string, unknown>> = [...hist, ...fc.map((f) => ({ month: f.month, forecast: Math.round(f.predicted), band: [Math.round(f.lower), Math.round(f.upper)] }))];
  if (hist.length && fc.length) { const i = hist.length - 1; chart[i] = { ...chart[i], forecast: hist[i].actual, band: [hist[i].actual, hist[i].actual] }; }

  const cell = (rid: number, mid: number) => plans.find((p) => p.regionId === rid && p.medicineId === mid);

  return (
    <div className="max-w-[1400px]">
      <PageHeader
        title="Central pharmacy"
        description={run
          ? `Stock in the central warehouse and ${regs.length} governorates, checked against next month's demand forecast (model trained ${fmtDateTime(run.finished_at ?? run.started_at)}).`
          : "Stock in the central warehouse and regional pharmacies."}
      />

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <Stat label="Central stock" value={fmtInt(usable)} note={nationalDemand ? `${(usable / nationalDemand).toFixed(1)} months of national demand` : "Usable units"} />
        <Stat label="Regional stock" value={fmtInt(regionalUnits)} note={`Units across ${regs.length} governorates`} />
        <Stat label="Shortage alerts" value={fmtInt(critical + low)} note={`${critical} critical, ${low} low, out of ${plans.length} lines`} tone={critical ? "alert" : "wait"} />
        <Stat label="Expiring within 90 days" value={fmtInt(expiring)} note="Central units to ship first" tone={expiring ? "wait" : "ink"} />
      </div>

      {!run ? <div className="mt-4"><NoModel /></div> : (
        <>
          <Panel
            className="mt-4"
            title="Days of stock, by governorate and medicine"
            description={`Current stock plus shipments on the way, divided by the forecast daily demand. Red is under ${PLANNING.criticalDays} days, amber under 30. Select a cell to see its forecast.`}
          >
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[820px] border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-ink-soft px-2 py-1 w-28"><span className="sr-only">Governorate</span></th>
                    {meds.map((m) => <th key={m.id} className="font-medium text-ink-soft px-1 py-1 text-center">{m.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id}>
                      <th scope="row" className="text-left font-medium px-2">{r.name}</th>
                      {meds.map((m) => {
                        const p = cell(r.id, m.id);
                        if (!p) return <td key={m.id} className="bg-paper rounded text-center text-ink-faint">–</td>;
                        return (
                          <td key={m.id} className="p-0">
                            <Link
                              href={`/admin/forecast?region=${r.id}&med=${m.id}`}
                              title={`${r.name}, ${m.name}: ${p.stock} in stock, ${p.inTransit} on the way, ${p.demand} forecast next month`}
                              className={`block rounded-md py-2 text-center num font-medium hover:ring-2 hover:ring-ink/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cross ${cellTone(p.coverDays)}`}
                            >
                              {days(p.coverDays)}
                            </Link>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-4 mt-4 xl:grid-cols-[1.35fr_1fr]">
            <Panel title="National demand" description={`All medicines, units per month. Actual to ${fmtMonth(lastMonth)}, then the model's forecast with its 95% range.`}>
              <ForecastChart data={chart} lastActual={lastMonth} height={300} />
            </Panel>

            <Panel
              title="Send next"
              description="Lines below next month's forecast plus safety stock, shortest cover first."
              action={<SendButton variant="primary" label={`Send all ${urgent.length}`} items={urgent.map((p) => ({ regionId: p.regionId, medicineId: p.medicineId, quantity: p.recommended }))} />}
            >
              {urgent.length === 0 ? (
                <p className="text-sm text-ink-soft">Every governorate is covered for next month.</p>
              ) : (
                <ul className="divide-y divide-line -mx-5 border-t border-line">
                  {urgent.slice(0, 7).map((p) => (
                    <li key={`${p.regionId}-${p.medicineId}`} className="px-5 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{mName[p.medicineId]} <span className="text-ink-soft font-normal">to {rName[p.regionId]}</span></p>
                        <p className="text-xs text-ink-soft num">{p.stock} in stock, {p.demand} needed next month</p>
                      </div>
                      <StatusPill status={p.status} />
                      <SendButton label={`Send ${p.recommended}`} items={[{ regionId: p.regionId, medicineId: p.medicineId, quantity: p.recommended }]} />
                    </li>
                  ))}
                </ul>
              )}
              {urgent.length > 7 && <Link href="/admin/forecast#plan" className="block text-sm text-cross font-medium mt-3 hover:underline underline-offset-4">See all {urgent.length} recommendations</Link>}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
